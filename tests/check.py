#!/usr/bin/env python3
"""Проверка расчётов Копилки.

    python3 tests/check.py                              # тестовые данные с заранее известными ответами
    python3 tests/check.py path/to/finance.json         # настоящие данные: сверка с независимым пересчётом
    python3 tests/check.py finance.json --kop tools/kop.py   # плюс сверка недель со скриптом для чата

Приложение запускается в headless-браузере (Playwright) без сети: синхронизация
и курсы валют отключены, данные подкладываются в localStorage. Каждое число
приложения сравнивается с отдельным пересчётом на Python, написанным с нуля
по правилам из CLAUDE.md, а не скопированным из app.js.
Выход: 0 — всё сошлось, 1 — есть расхождения (они перечислены).
"""
import argparse, datetime as dt, functools, http.server, importlib.util, json, os, sys, threading
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TZ = ZoneInfo("Europe/Amsterdam")
EPS = 0.005  # полцента
DAY = dt.timedelta(days=1)

# ---------------------------------------------------------------- независимая модель
def live(coll):
    return [v for v in (coll or {}).values() if v and not v.get("deleted")]

def monday(d):
    return d - dt.timedelta(days=d.weekday())

def ops_of(d):
    return [o for o in live(d.get("ops")) if isinstance(o.get("date"), str) and isinstance(o.get("amount"), (int, float))]

def fx(d, cur):
    """Единиц валюты за 1 €; None, если курса нет."""
    if not cur or cur == "EUR":
        return 1
    man = ((d.get("settings") or {}).get("fxManual") or {}).get(cur)
    if man and man > 0:
        return man
    if cur == "JPY" and d.get("rates"):
        return d["rates"][max(d["rates"])]
    r = ((d.get("fx") or {}).get("rates") or {}).get(cur)
    return r if r and r > 0 else None

def cur_of(d, acc_id):
    a = (d.get("accounts") or {}).get(acc_id) or {}
    return a.get("currency") or "EUR"

def to_eur(d, v, cur):
    r = fx(d, cur)
    return v / r if r else 0

def op_eur(d, o):
    return o["eur"] if isinstance(o.get("eur"), (int, float)) else to_eur(d, o["amount"], cur_of(d, o["accountId"]))

def delta(o, acc):
    t = o.get("type")
    if t in ("expense",):
        return -o["amount"] if o.get("accountId") == acc else 0
    if t in ("income", "correction"):
        return o["amount"] if o.get("accountId") == acc else 0
    if t == "transfer":
        out = -o["amount"] if o.get("accountId") == acc else 0
        inn = (o["toAmount"] if o.get("toAmount") is not None else o["amount"]) if o.get("toAccountId") == acc else 0
        return out + inn
    return 0

def balance(d, acc_id, upto=None):
    a = d["accounts"][acc_id]
    b = a.get("opening") or 0
    for o in ops_of(d):
        if upto and dt.date.fromisoformat(o["date"]) > upto:
            continue
        b += delta(o, acc_id)
    return b

def total(d, upto=None):
    return sum(to_eur(d, balance(d, a["id"], upto), a.get("currency") or "EUR")
               for a in live(d.get("accounts")) if not a.get("exclude"))

def excluded(d, acc_id):
    a = (d.get("accounts") or {}).get(acc_id)
    return not a or a.get("exclude")  # как в приложении: удалённый счёт не исключает свои операции

def ledger_start(d):
    return (dt.date.fromisoformat((d.get("settings") or {}).get("ledgerStart")
            or (d.get("kopilka") or {}).get("ledgerStart") or "2026-10-26"))

def py_weeks(d, today):
    out = []
    m, last = monday(ledger_start(d)), monday(today)
    while m <= last:
        w = {"monday": m.isoformat(), "inc": 0.0, "exp": 0.0, "oneoff": 0.0, "income": 0.0}
        for o in ops_of(d):
            day = dt.date.fromisoformat(o["date"])
            if not (m <= day < m + 7 * DAY) or o["type"] not in ("income", "expense") or excluded(d, o["accountId"]):
                continue
            v = op_eur(d, o)
            if o["type"] == "income":
                w["inc"] += v
                w["income"] += v if o.get("oneoff") else 0
            else:
                w["exp"] += v
                w["oneoff"] += v if o.get("oneoff") else 0
        w["saved"] = w["inc"] - w["exp"]
        w["balance"] = total(d, m + 6 * DAY)
        out.append(w)
        m += 7 * DAY
    return out

def kind(d, o):
    """Вид траты для бюджета недели: monthly / daily / free / oneoff."""
    if o.get("oneoff"):
        return "oneoff"
    flags = [((d.get("tags") or {}).get(t) or {}).get("fixed") for t in o.get("tagIds") or []]
    c = (d.get("categories") or {}).get(o.get("categoryId")) or {}
    if "monthly" in flags or c.get("fixed") == "monthly":
        return "monthly"
    if "daily" in flags or c.get("fixed") == "daily":
        return "daily"
    return "free"

def py_budget(d, today):
    mon = monday(today)
    ops = [o for o in ops_of(d) if o["type"] in ("income", "expense") and not (d["accounts"].get(o["accountId"]) or {}).get("exclude")]
    if not ops:
        return None
    first = dt.date.fromisoformat(min(o["date"] for o in ops))
    hs = monday(first) + (7 * DAY if first != monday(first) else dt.timedelta(0))  # первая неполная неделя не в счёт
    hs = max(hs, mon - 13 * 7 * DAY)
    weeks = max(0, (mon - hs).days // 7)
    h_inc = h_bills = 0.0
    cur = {"inc": 0.0, "incOne": 0.0, "daily": 0.0, "free": 0.0, "monthly": 0.0, "oneoff": 0.0}
    for o in ops:
        day, v = dt.date.fromisoformat(o["date"]), op_eur(d, o)
        if hs <= day < mon:
            if o["type"] == "income" and not o.get("oneoff"):
                h_inc += v
            elif o["type"] == "expense" and kind(d, o) == "monthly":
                h_bills += v
        elif mon <= day < mon + 7 * DAY:
            if o["type"] == "income":
                cur["incOne" if o.get("oneoff") else "inc"] += v
            else:
                cur[kind(d, o)] += v
    avg = h_inc / weeks if weeks else cur["inc"]
    bills = h_bills / weeks if weeks else cur["monthly"]
    arrived = cur["inc"] > 0 and cur["inc"] >= avg * 0.5
    return {"weeks": weeks, "avgInc": avg, "billShare": bills, "arrived": arrived,
            "expInc": cur["inc"] if arrived else avg, "cur": cur}

# ---------------------------------------------------------------- приложение в браузере
def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def run_app(data, now=None):
    from playwright.sync_api import sync_playwright
    srv = serve()
    base = f"http://127.0.0.1:{srv.server_address[1]}/"
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, timezone_id="Europe/Amsterdam", service_workers="block")
        ctx.route("**/*", lambda r: r.continue_() if r.request.url.startswith(base) else r.abort())  # без сети
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(f"ошибка JS: {e}"))
        if now:
            pg.clock.install(time=now)
        pg.add_init_script(f"""(()=>{{if(sessionStorage.getItem('seeded'))return;localStorage.clear();
            localStorage.setItem('finance.v1',{json.dumps(json.dumps(data))});sessionStorage.setItem('seeded','1')}})()""")
        pg.goto(base)
        pg.wait_for_function("window.__K")
        res = pg.evaluate("""()=>{const K=window.__K,D=K.D(),B=K.weekBudget();
            const acc=Object.values(D.accounts).filter(a=>a&&!a.deleted).map(a=>({id:a.id,bal:K.accBalance(a.id)}));
            return {weeks:K.kopWeeks().filter(w=>w.computed),acc,total:K.totalEUR(null),
              budget:B&&{weeks:B.weeks,avgInc:B.avgInc,billShare:B.billShare,arrived:B.arrived,expInc:B.expInc,need:B.need,
                life:B.life,spent:B.spent,left:B.left,daysLeft:B.daysLeft,cur:B.cur}}}""")
        for tab in ("ops", "kopilka", "accounts", "overview"):  # каждый экран открывается без ошибок
            pg.click(f"[data-act=tab][data-v={tab}]")
            pg.wait_for_timeout(150)
            if not pg.locator("main").count():
                errors.append(f"экран {tab} не отрисовался")
        b.close()
    srv.shutdown()
    res["errors"] = errors
    return res

# ---------------------------------------------------------------- сверка
class Report:
    def __init__(self): self.bad, self.n = [], 0
    def eq(self, what, a, b, eps=EPS):
        self.n += 1
        ok = (a == b) if isinstance(a, (bool, str, type(None))) or isinstance(b, (bool, str, type(None))) else abs(a - b) <= eps
        if not ok:
            self.bad.append(f"{what}: приложение {a!r}, ожидалось {b!r}")
    def fail(self, msg): self.n += 1; self.bad.append(msg)

def compare(R, data, app, today):
    for e in app["errors"]:
        R.fail(e)
    for a in app["acc"]:
        R.eq(f"баланс {a['id']}", a["bal"], balance(data, a["id"]))
    R.eq("всего на счетах", app["total"], total(data))
    pw = {w["monday"]: w for w in py_weeks(data, today)}
    aw = {w["monday"]: w for w in app["weeks"]}
    if set(pw) != set(aw):
        R.fail(f"набор недель разный: приложение {sorted(aw)}, пересчёт {sorted(pw)}")
    for m in sorted(set(pw) & set(aw)):
        p, a = pw[m], aw[m]
        for k in ("inc", "exp", "oneoff", "income", "saved", "balance"):
            R.eq(f"неделя {m} {k}", a[k], round(p[k], 2) if k in ("oneoff", "income", "saved", "balance") else p[k])
    pb, ab = py_budget(data, today), app["budget"]
    if (pb is None) != (ab is None):
        R.fail(f"бюджет недели: приложение {ab!r}, пересчёт {pb!r}")
    elif pb:
        for k in ("weeks", "avgInc", "billShare", "arrived", "expInc"):
            R.eq(f"бюджет {k}", ab[k], pb[k])
        for k, v in pb["cur"].items():
            R.eq(f"бюджет, текущая неделя {k}", ab["cur"][k], v)
        R.eq("бюджет: на жизнь = доход − норма − счета", ab["life"], ab["expInc"] - ab["need"] - ab["billShare"])
        R.eq("бюджет: потрачено = еда + остальное", ab["spent"], ab["cur"]["daily"] + ab["cur"]["free"])
        R.eq("бюджет: осталось = на жизнь − потрачено", ab["left"], ab["life"] - ab["spent"])
        if not 1 <= ab["daysLeft"] <= 7:
            R.fail(f"бюджет: дней до конца недели {ab['daysLeft']}")

def compare_kop(R, data, app, kop_path):
    """Те же недели через week_summary() из tools/kop.py."""
    spec = importlib.util.spec_from_file_location("kop", kop_path)
    kop = importlib.util.module_from_spec(spec)
    sys.argv, argv = [kop_path], sys.argv
    try:
        spec.loader.exec_module(kop)
    finally:
        sys.argv = argv
    for w in app["weeks"]:
        day = dt.date.fromisoformat(w["monday"])
        try:
            r = kop.week_summary(data, day)
        except TypeError:
            r = kop.week_summary(data, day.isoformat())
        _, _, inc, exp, ox, oi = r
        for k, v in (("inc", inc), ("exp", exp), ("oneoff", ox), ("income", oi)):
            R.eq(f"kop.py, неделя {w['monday']} {k}", w[k], v, eps=0.01)

# ---------------------------------------------------------------- тестовые данные
def fixture():
    T = "2026-10-01T00:00:00.000Z"
    A = lambda i, cur, opening, **k: (i, {"id": i, "name": i, "currency": cur, "opening": opening, "order": 0, "updatedAt": T, **k})
    C = lambda i, typ, **k: (i, {"id": i, "name": i, "type": typ, "color": "#888888", "icon": "cash", "order": 0, "updatedAt": T, **k})
    n = iter(range(1, 100))
    def O(date, typ, amount, acc, **k):
        i = f"o{next(n)}"
        return i, {"id": i, "date": date, "type": typ, "amount": amount, "accountId": acc, "updatedAt": T, **k}
    ops = dict([
        # неделя 05.10 — неполная первая: в учёте есть, в историю бюджета не входит
        O("2026-10-06", "expense", 244, "rev", categoryId="home", tagIds=["rent"]),
        O("2026-10-07", "expense", 40, "rev", categoryId="food"),
        O("2026-10-08", "expense", 22, "ing", categoryId="subs"),
        O("2026-10-09", "income", 600, "ing", categoryId="salary"),
        # неделя 12.10 — история бюджета
        O("2026-10-12", "transfer", 200, "ing", toAccountId="rev"),
        O("2026-10-12", "transfer", 20, "rev", toAccountId="stirka"),
        O("2026-10-13", "transfer", 50, "ing", toAccountId="loan"),          # на исключённый счёт: уменьшает «всего», но не трата
        O("2026-10-13", "expense", 50, "rev", categoryId="food"),
        O("2026-10-14", "expense", 30, "rev", categoryId="transport", tagIds=["ns"]),
        O("2026-10-15", "expense", 140, "rev", categoryId="travel", oneoff=True),
        O("2026-10-16", "income", 620, "ing", categoryId="salary"),
        O("2026-10-17", "income", 600, "mono", categoryId="refunds", oneoff=True),  # 600 ₴ = 12 €
        O("2026-10-17", "expense", 7, "loan", categoryId="free"),             # с исключённого счёта: не считается
        # текущая неделя 19.10, зарплаты ещё нет
        O("2026-10-20", "expense", 20, "rev", categoryId="food"),
        O("2026-10-20", "expense", 15, "rev", categoryId="clothes"),
        O("2026-10-21", "expense", 5, "stirka", categoryId="home"),
        O("2026-10-20", "expense", 999, "rev", categoryId="food", deleted=True),
    ])
    data = {
        "schema": 2,
        "accounts": dict([A("ing", "EUR", 1000), A("rev", "EUR", 100), A("mono", "UAH", 0), A("stirka", "EUR", 0),
                          A("loan", "EUR", 50, exclude=True)]),
        "categories": dict([C("food", "expense", fixed="daily"), C("subs", "expense", fixed="monthly"), C("home", "expense"),
                            C("transport", "expense"), C("travel", "expense"), C("clothes", "expense"), C("free", "expense"),
                            C("salary", "income"), C("refunds", "income")]),
        "tags": {"rent": {"id": "rent", "name": "Аренда", "fixed": "monthly", "updatedAt": T},
                 "ns": {"id": "ns", "name": "NS", "fixed": "monthly", "updatedAt": T}},
        "ops": ops,
        "settings": {"ledgerStart": "2026-10-05"},
        "kopilka": {"config": None, "weeks": {}},
        "fx": {"rates": {"UAH": 50}},
        "rates": {"2026-10-01": 160},
    }
    # ответы, посчитанные вручную
    expect = {
        "2026-10-05": dict(inc=600, exp=306, saved=294, oneoff=0, income=0, balance=1394),
        "2026-10-12": dict(inc=632, exp=220, saved=412, oneoff=140, income=12, balance=1756),
        "2026-10-19": dict(inc=0, exp=40, saved=-40, oneoff=0, income=0, balance=1716),
    }
    budget = dict(weeks=1, avgInc=620, billShare=30, arrived=False, expInc=620,
                  cur=dict(inc=0, incOne=0, daily=20, free=20, monthly=0, oneoff=0))
    return data, expect, budget

def main():
    ap = argparse.ArgumentParser(description="Проверка расчётов Копилки")
    ap.add_argument("data", nargs="?", help="finance.json; без него — тестовые данные")
    ap.add_argument("--kop", help="путь к tools/kop.py для сверки недель со скриптом для чата")
    a = ap.parse_args()
    R = Report()
    if a.data:
        data = json.load(open(a.data, encoding="utf-8"))
        today = dt.datetime.now(TZ).date()
        app = run_app(data)
    else:
        data, expect, budget = fixture()
        today = dt.date(2026, 10, 21)
        app = run_app(data, dt.datetime(2026, 10, 21, 12, 0, tzinfo=TZ))
        aw = {w["monday"]: w for w in app["weeks"]}
        for m, e in expect.items():
            for k, v in e.items():
                R.eq(f"[ответ] неделя {m} {k}", (aw.get(m) or {}).get(k, float("nan")), v)
        for k in ("weeks", "avgInc", "billShare", "arrived", "expInc"):
            R.eq(f"[ответ] бюджет {k}", app["budget"][k], budget[k])
        for k, v in budget["cur"].items():
            R.eq(f"[ответ] бюджет, текущая неделя {k}", app["budget"]["cur"][k], v)
        R.eq("[ответ] осталось на неделю", app["budget"]["left"], 620 - app["budget"]["need"] - 30 - 40)
    compare(R, data, app, today)
    if a.kop:
        compare_kop(R, data, app, a.kop)
    if R.bad:
        print(f"РАСХОЖДЕНИЯ: {len(R.bad)} из {R.n} проверок")
        for x in R.bad:
            print(" ✗", x)
        sys.exit(1)
    print(f"OK: {R.n} проверок, недель {len(app['weeks'])}, ошибок JS нет")

if __name__ == "__main__":
    main()
