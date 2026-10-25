/* Копилка — Operations, Japan (kopilka) with its charts, and Accounts screens.
   Plain scripts loaded in order by index.html (core → home → screens → sheets → boot); they share one global scope. */
"use strict";

/* ================= OPERATIONS ================= */
function renderOps(){
  const S=UI.ops,p=S.period,r=periodRange(p);const sel=S.accs&&S.accs.length?S.accs:null;
  const q=(S.q||"").trim().toLowerCase();
  let ops=opsList().filter(o=>inRange(o,r)&&accFilterMatch(o,sel));
  if(S.filter==="expense")ops=ops.filter(o=>o.type==="expense");
  else if(S.filter==="income")ops=ops.filter(o=>o.type==="income");
  else if(S.filter==="transfer")ops=ops.filter(o=>o.type==="transfer"||o.type==="correction");
  if(S.cat)ops=ops.filter(o=>o.categoryId===S.cat);
  if(S.cat&&S.tag)ops=ops.filter(o=>S.tag==="_none"?!(o.tagIds&&o.tagIds.length):(o.tagIds||[]).includes(S.tag));
  if(q)ops=ops.filter(o=>{const c=category(o.categoryId);const hay=[c&&c.name,o.comment,(account(o.accountId)||{}).name,...(o.tagIds||[]).map(t=>(D.tags[t]||{}).name)].join(" ").toLowerCase();return hay.includes(q)||String(o.amount).includes(q)});
  ops.sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(b.createdAt||"").localeCompare(a.createdAt||""));
  const sumE=ops.filter(o=>o.type==="expense").reduce((a,o)=>a+opEUR(o),0),sumI=ops.filter(o=>o.type==="income").reduce((a,o)=>a+opEUR(o),0);
  let h=`<main class="wrap"><div class="sticky"><div class="sticky-in">`;
  h+=`<div class="head"><div><h1 class="title sm">Операции</h1><div class="sub">${esc(sel?accLabel(sel):"Все счета")}${S.cat?" · "+esc((category(S.cat)||{}).name||"")+(S.tag?" · "+esc(S.tag==="_none"?"без тега":(D.tags[S.tag]||{}).name||""):""):""}</div></div><button class="icon-btn" data-act="accpick" data-scope="ops" aria-label="Выбор счетов">${svgI("wallet")}</button></div>`;
  h+=`<div class="searchbox">${svgI("search")}<input id="opsq" type="search" placeholder="Поиск: категория, тег, комментарий, сумма" value="${esc(S.q||"")}" autocomplete="off"></div>`;
  h+=`<div class="seg" role="group" aria-label="Тип">${[["all","Все"],["expense","Расходы"],["income","Доходы"],["transfer","Переводы"]].map(([k,l])=>`<button data-act="opsf" data-v="${k}" aria-pressed="${S.filter===k}">${l}</button>`).join("")}</div>`;
  h+=`<div>${periodControls("ops",p)}
    <div class="sub" style="margin-top:6px;display:flex;gap:14px;flex-wrap:wrap;justify-content:center">${S.filter!=="income"&&S.filter!=="transfer"?`<span>Расходы: <b class="num" style="color:var(--ink)"><span data-roll="opsE" data-v="${sumE.toFixed(2)}" data-fmt="nf2">${nf2.format(sumE)}</span> €</b></span>`:""}${S.filter!=="expense"&&S.filter!=="transfer"?`<span>Доходы: <b class="num pos-t"><span data-roll="opsI" data-v="${sumI.toFixed(2)}" data-fmt="nf2">${nf2.format(sumI)}</span> €</b></span>`:""}${S.filter==="transfer"?`<span>${ops.length} записей</span>`:""}</div>
    ${S.cat?`<button class="btn plain" style="margin-top:8px;padding:8px" data-act="clearcat">Показать все категории</button>`:""}</div></div></div>`;
  if(!ops.length)h+=`<div class="card empty"><b>Ничего не найдено</b>Измени период или фильтр.</div>`;
  else{let day=null,buf="",net=0;const flush=()=>{if(day){h+=`<section class="group"><p class="section-label"><span>${esc(dayLabel(parseD(day)))}</span>${net?`<span class="num">${net>0?"+":"−"}${nf2.format(Math.abs(net))} €</span>`:""}</p><div class="list">${buf}</div></section>`}};
    for(const o of ops){if(o.date!==day){flush();day=o.date;buf="";net=0}buf+=opRow(o);if(o.type==="income")net+=opEUR(o);else if(o.type==="expense")net-=opEUR(o)}flush()}
  h+=`</main>`;
  after(()=>{bindCustomRange("ops");bindSwipe(document.querySelector("#app .sticky"),"ops");slideIn("#app .group");const qi=$("opsq");if(qi){qi.oninput=()=>{S.q=qi.value;clearTimeout(qi._t);qi._t=setTimeout(()=>{const pos=qi.selectionStart;render();const n=$("opsq");n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}},250)}}});
  return h;
}
function opRow(o){
  const acc=account(o.accountId)||{name:"?",currency:"EUR"};
  if(o.type==="transfer"||o.type==="correction"){
    const to=account(o.toAccountId);
    const title=o.type==="transfer"?"Перевод":"Корректировка";
    const sub=o.type==="transfer"?`${esc(acc.name)} → ${esc(to?to.name:"?")}`:esc(acc.name);
    const amt=o.type==="transfer"?money(o.amount,acc.currency)+(to&&to.currency!==acc.currency?`<small>→ ${money(o.toAmount!=null?o.toAmount:o.amount,to.currency)}</small>`:""):(o.amount>=0?"+":"")+moneyS(o.amount,acc.currency);
    return `<button class="row" data-act="${o.type==="transfer"?"edittransfer":"editop"}" data-v="${esc(o.id)}"><span class="ic" style="background:var(--ink-muted)">${svgI(o.type==="transfer"?"swap":"adjust")}</span>
      <div class="mid"><div class="t">${title}</div><div class="s">${sub}${o.comment?" · "+esc(o.comment):""}</div></div><span class="amt num muted">${amt}</span></button>`;
  }
  const c=category(o.categoryId)||{name:"Без категории",color:"#8E8E93",icon:"help-circle"};
  const tags=(o.tagIds||[]).map(t=>D.tags[t]).filter(Boolean);
  const sub=[o.comment,...tags.map(t=>t.name),acc.name].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).map(esc).join(" · ");
  return `<button class="row" data-act="editop" data-v="${esc(o.id)}">${catIc(c)}<div class="mid"><div class="t">${esc(c.name)}${o.oneoff?' <span class="chip kin">разовая</span>':""}</div>
    <div class="s">${sub}</div></div>
    <span class="amt num ${o.type==="income"?"pos-t":""}">${o.type==="income"?"+":"−"}${money(o.amount,acc.currency)}${acc.currency!=="EUR"?`<small>≈ ${nf2.format(opEUR(o))} €</small>`:""}</span></button>`;
}
// Horizontal swipe over a period view moves to the previous/next period, like the arrows.
function bindSwipe(el,scope){
  if(!el)return;let x0=null,y0=0,t0=0;
  el.addEventListener("touchstart",e=>{if(e.touches.length!==1||e.target.closest(".ch-scroll,input,select,.hscroll")){x0=null;return}x0=e.touches[0].clientX;y0=e.touches[0].clientY;t0=Date.now()},{passive:true});
  el.addEventListener("touchend",e=>{if(x0==null)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;
    if(Math.abs(dx)<50||Math.abs(dx)<Math.abs(dy)*1.6||Date.now()-t0>800)return;
    const P=scope==="ov"?UI.ov:UI.ops;if(P.period.kind==="custom")return;
    const dir=dx<0?1:-1,np=shiftPeriod(P.period,dir);if(dir>0&&periodRange(np).start>todayMs())return;
    P.period=np;UI.swipeDir=dir;render()},{passive:true});
}
/* the + button slides away while scrolling down the list and comes back on the way up */
(()=>{let last=0,raf=0;const upd=()=>{raf=0;const y=Math.max(0,scrollY),f=$("fab");if(!f)return;
    if(y<80||y<last-8){f.classList.remove("away");last=y}else if(y>last+8){f.classList.add("away");last=y}};
  window.addEventListener("scroll",()=>{if(!raf)raf=requestAnimationFrame(upd)},{passive:true})})();
/* pull the page down at the very top and let go to sync now */
(()=>{let y0=null,pulled=0;const PULL=90;const el=()=>$("ptr");
  const show=(t,o)=>{const p=el();if(!p)return;p.textContent=t;p.style.opacity=o;p.style.transform=`translate(-50%,${(o*8-8).toFixed(1)}px)`};
  document.addEventListener("touchstart",e=>{y0=(scrollY<=0&&e.touches.length===1&&!stack.length&&getAuth())?e.touches[0].clientY:null;pulled=0},{passive:true});
  document.addEventListener("touchmove",e=>{if(y0==null)return;pulled=e.touches[0].clientY-y0;
    if(scrollY>0||pulled<=0){show("",0);return}show(pulled>=PULL?"Отпусти — обновить":"Потяни, чтобы обновить",Math.min(1,pulled/PULL))},{passive:true});
  document.addEventListener("touchend",async()=>{if(y0==null)return;y0=null;
    if(pulled<PULL||scrollY>0){show("",0);return}show("Обновляю…",1);
    try{await Promise.all([sync(),fetchRates(true)])}catch(e){}
    show("",0);toast(syncState==="ok"?"Данные обновлены":syncState==="offline"?"Нет сети — обновлю, когда появится":"Не удалось обновить")},{passive:true})})();
/* swipe left/right anywhere on a screen switches between the four tabs; places with their own sideways gesture
   (the week card on Home, the period header on Operations, charts, horizontal lists, inputs, open sheets) keep it */
(()=>{let x0=null,y0=0,t0=0;
  const own="#ovStats,#app .page[data-tab=ops] .sticky,.ch-scroll,.chart,.hscroll,input,select,textarea,.sheet,.scrim,#tabs";
  document.addEventListener("touchstart",e=>{if(e.touches.length!==1||stack.length||e.target.closest(own)){x0=null;return}
    x0=e.touches[0].clientX;y0=e.touches[0].clientY;t0=Date.now()},{passive:true});
  document.addEventListener("touchmove",e=>{if(x0!=null&&e.touches.length>1)x0=null},{passive:true});
  document.addEventListener("touchend",e=>{if(x0==null)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;
    if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.7||Date.now()-t0>700)return;
    const ids=TABS.map(x=>x[0]),i=ids.indexOf(UI.tab),j=i+(dx<0?1:-1);
    if(i<0||j<0||j>=ids.length){const pg=document.querySelector("#app .page");pg&&!reduceMotion()&&pg.animate([{transform:"none"},{transform:`translateX(${dx<0?-14:14}px)`},{transform:"none"}],{duration:260,easing:EASE});return}
    UI.tab=ids[j];UI.budgetOpen=false;M.tabDir=dx<0?1:-1;window.scrollTo(0,0);render();$("fab").classList.remove("away")},{passive:true})})();
function slideIn(sel){const d=UI.swipeDir;if(!d)return;UI.swipeDir=0;document.querySelectorAll(sel).forEach(n=>{n.animate([{transform:`translateX(${d*36}px)`,opacity:.3},{transform:"none",opacity:1}],{duration:220,easing:"cubic-bezier(.2,.8,.2,1)"})})}
function bindCustomRange(scope){
  const f=$(scope+"-from"),t=$(scope+"-to");if(!f||!t)return;
  const S=scope==="ov"?UI.ov:UI.ops;
  const upd=()=>{S.period={...S.period,from:f.value,to:t.value};render()};f.onchange=upd;t.onchange=upd;
}

/* ================= KOPILKA ================= */
function renderKopilka(){
  const K=kNow(),c=kcfg(),ws=K.ws,cr=K.r,m=K.m;
  let h=`<main class="wrap"><header class="head"><div><h1 class="title">${PRIVATE?"Цель":"Япония"}</h1><div class="sub">${ws.length?(()=>{const lm=parseD(ws[ws.length-1].monday);return "Неделя "+dm(lm)+"–"+dmy(lm+6*DAY)})():"Нет недель"}</div></div>
    <div style="display:flex;align-items:center;gap:12px">${eyeBtn()}<button class="icon-btn" data-act="ksettings" aria-label="Настройки Копилки">${svgI("gear")}</button><div class="hanko" aria-hidden="true">貯</div></div></header>`;
  if(ws.length&&!cr)h+=`<div class="banner">Нет курса иены. Подключись к интернету или укажи курс вручную в настройках Копилки.</div>`;
  if(!m){h+=`<div class="card empty"><b>Пока нечего считать</b>Добавь неделю или операции.</div></main>`;return h}
  const b=m.budgets[UI.budget];
  h+=`<div class="kcols"><div class="kcol">`;
  h+=`<section class="card hero" id="kHero"><div class="sub">Накоплено</div><div class="big num"><span data-roll="kBal" data-v="${m.bal.toFixed(2)}" data-fmt="eur">${eur(m.bal)}</span><small>€</small></div>
    <div class="hero-row"><div class="stat"><div class="v num"><span data-roll="kPace" data-v="${m.pace.toFixed(2)}" data-fmt="eur">${eur(m.pace)}</span></div><div class="k">€ в неделю</div><div class="d">за ${m.win} нед${Math.abs(m.netPace-m.pace)>=1?"<br>с разовыми "+eur(m.netPace):""}</div></div>
    <div class="stat"><div class="v num">${m.left}</div><div class="k">недель <span class="jp">あと</span></div><div class="d">до ${dmy(parseD(c.deadline))}</div></div>
    <div class="stat"><div class="v num">${nf1.format(cr.rate)}</div><div class="k">¥ за 1 €</div><div class="d">${cr.manual?"вручную":"курс на "+dm(parseD(cr.date))}</div></div></div></section>`;
  h+=`<div class="seg" id="kSeg" role="group" aria-label="Бюджет жизни"><button data-act="budget" data-v="mine" aria-pressed="${UI.budget==="mine"}">Мой бюджет<span>¥${nf0.format(c.mine)}/мес</span></button><button data-act="budget" data-v="comfort" aria-pressed="${UI.budget==="comfort"}">Комфорт<span>¥${nf0.format(c.comfort)}/мес</span></button></div>`;
  h+=`<section class="schools" id="kSchools">`+["SNG","KAI"].map((s,i)=>{const x=b[s],col=i?"var(--series-2)":"var(--series-1)",C=2*Math.PI*22,p=Math.max(0,Math.min(1,x.progress));
    return `<article class="card school"><div class="school-top"><svg class="ring" viewBox="0 0 52 52" role="img" aria-label="${s}: ${nf1.format(x.progress*100)}%"><circle class="track" cx="26" cy="26" r="22"/>
      <circle class="fill" data-ring="${s}" cx="26" cy="26" r="22" stroke="${col}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-p)).toFixed(1)}"/><text class="vn" x="26" y="27" data-roll="kP${s}" data-v="${(x.progress*100).toFixed(2)}" data-fmt="pct">${nf0.format(x.progress*100)}%</text></svg>
      <div style="min-width:0"><h3><span class="dot" style="background:${col}"></span>${s}</h3><div class="goal">цель <span class="vn num"><span data-roll="kG${s}" data-v="${x.goal.toFixed(2)}" data-fmt="eur">${eur(x.goal)}</span> €</span></div></div></div>
      <div class="rows"><div class="r"><span class="k">Нужно в нед.</span><span class="v num"><span data-roll="kN${s}" data-v="${x.need.toFixed(2)}" data-fmt="eur">${eur(x.need)}</span></span></div>
      <div class="r"><span class="k">Прогноз</span><span class="pill num ${x.fc>=0?"pos":"neg"}">${signed(x.fc)}</span></div>
      <div class="r"><span class="k">+ отпускные</span><span class="v num ${x.fcH>=0?"pos-t":"neg-t"}">${signed(x.fcH)}</span></div></div></article>`}).join("")+`</section>`;
  h+=`<section id="kChanges"><p class="section-label">Что изменилось за неделю</p><div class="card changes">${kChanges(ws,m,cr)}</div></section>`;
  h+=`<section id="kWeeks"><p class="section-label">Недели</p><div class="list flat">${kWeekList(ws)}</div></section>`;
  h+=`</div><div class="kcol">`;
  h+=`<section class="card chart-card" id="kPathC"><h2>Путь к цели</h2><div class="cap" id="pathCap"></div><div class="chart" id="pathChart"></div><div class="legend" id="pathLegend"></div></section>`;
  const G=UI.ch.group||"week";
  h+=`<section class="card chart-card" id="kBarsC"><h2>Доходы и расходы</h2><div class="cap" id="barsCap">${G==="week"?(()=>{const sh=ws.slice(-13),nd=b.KAI.need;return "Выше нормы KAI без разовых: "+sh.filter(w=>reg(w)>=nd).length+" из "+sh.length+" последних недель"})():"Отложено = доходы − расходы"}</div>
    <div class="seg" role="group" aria-label="Группировка" style="margin-top:12px">${[["week","Недели"],["month","Месяцы"],["year","Годы"]].map(([k,l])=>`<button data-act="chgroup" data-v="${k}" aria-pressed="${G===k}">${l}</button>`).join("")}</div>
    <div class="chart hs" id="barsChart"></div><div class="legend" id="barsLegend"></div><p class="note" style="text-align:center">Листай график вбок. Нажми на столбец, чтобы увидеть суммы.</p></section>`;
  h+=`<section class="card chart-card" id="kRateC"><h2>Курс иены</h2><div class="cap" id="rateCap">¥ за 1 €, последние 90 дней</div><div class="chart" id="rateChart"></div>
    <div class="note">Выше курс — дешевле цель. Каждые 5 ¥ меняют цель KAI примерно на ${eur(Math.abs(goal(c[UI.budget],c.KAI,cr.rate-5,c)-goal(c[UI.budget],c.KAI,cr.rate,c)))} €.</div></section>`;
  h+=`</div></div><p class="note" style="text-align:center;margin:0 16px">Прогноз = накоплено + темп × ${m.left} нед (${m.left-c.extraPayouts} + ${c.extraPayouts} выплата) · отпускные ${eur(c.holidayEur)} € · недели с ${dmy(parseD(ledgerStart()))} считаются из операций</p></main>`;
  after(()=>{kPath(ws,m);kRate();drawJapanBars(true)});
  return h;
}
function drawJapanBars(first){
  const S={mode:"total",group:UI.ch.group||"week",sel:UI.ch.sel};const bs=chartData(S.group,"expense",null);
  if(S.sel!=null&&S.sel>=bs.length)S.sel=UI.ch.sel=null;
  drawChart(bs,S,{box:$("barsChart"),legend:$("barsLegend"),pop:true,first,onPick:i=>{UI.ch.sel=UI.ch.sel===i?null:i;drawJapanBars(false)}});
}
function kChanges(ws,m,cr){
  if(ws.length<2)return'<div class="empty">Появится после второй недели.</div>';
  const c=kcfg(),prevW=ws.slice(0,-1),pr=cr.manual?cr:rateAt(iso(parseD(prevW[prevW.length-1].monday)+6*DAY));
  const pm=kMetrics(prevW,pr?pr.rate:cr.rate,c),cur=m.budgets[UI.budget],old=pm.budgets[UI.budget],last=ws[ws.length-1];
  const row=(k,v,cls)=>`<div class="r"><span class="k">${k}</span><span class="v num ${cls||""}">${bl(v)}</span></div>`;
  const d=(x,y)=>({t:signed(x-y),c:x-y>=0?"pos-t":"neg-t"});
  const dp=d(m.pace,pm.pace),dS=d(cur.SNG.fc,old.SNG.fc),dK=d(cur.KAI.fc,old.KAI.fc),gd=cur.KAI.goal-old.KAI.goal,lr=reg(last);
  let h=row("Неделя",signed(last.saved)+" € · норма KAI "+eur(cur.KAI.need),hasX(last)?"":(last.saved>=cur.KAI.need?"pos-t":"neg-t"));
  if(hasX(last))h+=row("Без разовых"+(last.note?"<small>"+esc(last.note)+"</small>":""),signed(lr)+" €",lr>=cur.KAI.need?"pos-t":"neg-t");
  h+=row("Темп",eur(pm.pace)+" → "+eur(m.pace)+" ("+dp.t+")",dp.c);
  h+=row("Прогноз SNG",signed(old.SNG.fc)+" → "+signed(cur.SNG.fc),dS.c);
  h+=row("Прогноз KAI",signed(old.KAI.fc)+" → "+signed(cur.KAI.fc),dK.c);
  h+=row("Цель KAI от курса",(gd>0?"дороже на ":"дешевле на ")+eur(Math.abs(gd))+" €",gd>0?"neg-t":"pos-t");
  return h;
}
function kWeekList(ws){
  if(!ws.length)return'<div class="empty">Пока нет недель.</div>';
  const all=ws.slice().reverse(),lim=UI.showAllWeeks?all:all.slice(0,6);
  return lim.map(w=>{const t=parseD(w.monday);
    const sub=(typeof w.balance==="number"?"остаток "+eur(w.balance)+" €":"")+((w.oneoff||0)>0?" · разовые −"+eur(w.oneoff):"")+((w.income||0)>0?" · доход +"+eur(w.income):"")+(w.computed?"":" · вручную");
    return `<button class="row" ${w.computed?`data-act="weekops" data-v="${esc(w.monday)}"`:'tabindex="-1" style="cursor:default"'}>
      <div class="mid"><div class="t">${dm(t)}–${dmy(t+6*DAY)}</div><div class="s">${bl(sub)}</div></div><span class="amt num ${w.saved<0?"neg-t":""}">${signed(w.saved)}</span></button>`}).join("")
    +(all.length>6?`<button class="row" data-act="allweeks" style="color:var(--ai)"><div class="mid">${UI.showAllWeeks?"Свернуть":"Все недели ("+all.length+")"}</div></button>`:"");
}

/* ---- charts helpers ---- */
const svgEl=(w,h,inner)=>`<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="height:auto">${inner}</svg>`;
function niceTicks(min,max,count){const span=max-min||1,step0=span/count,mag=Math.pow(10,Math.floor(Math.log10(step0)));const step=[1,2,2.5,5,10].map(f=>f*mag).find(s=>s>=step0)||10*mag;const t=[];for(let v=Math.ceil(min/step)*step;v<=max+1e-9;v+=step)t.push(Math.abs(v)<1e-9?0:v);return t}
const kfmt=v=>Math.abs(v)>=1000?nf0.format(v/1000)+"к":nf0.format(v);
function attachTip(box,points,fmt,onPick){
  if(!box)return;let tip=box.querySelector(".tip");if(!tip){tip=document.createElement("div");tip.className="tip";tip.hidden=true;box.appendChild(tip)}
  const svg=box.querySelector("svg");if(!svg)return;const cross=svg.querySelector(".cross"),mark=svg.querySelector(".mark");
  function at(ev){const r=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal,sx=r.width/vb.width,x=(ev.clientX-r.left)/sx;let best=null,bd=1e9;
    for(const p of points){const d=Math.abs(p.x-x);if(d<bd){bd=d;best=p}}
    if(!best||bd>40){hide();return}
    if(fmt){tip.hidden=false;tip.innerHTML=fmt(best);let left=best.x*sx;const half=tip.offsetWidth/2;left=Math.max(half,Math.min(r.width-half,left));tip.style.left=left+"px";tip.style.top=(best.y*sx-10)+"px"}
    if(cross){cross.setAttribute("x1",best.x);cross.setAttribute("x2",best.x);cross.style.display=""}
    if(mark){mark.setAttribute("cx",best.x);mark.setAttribute("cy",best.y);mark.style.display=""}
    return best}
  function hide(){tip.hidden=true;if(cross)cross.style.display="none";if(mark)mark.style.display="none"}
  if(fmt){svg.addEventListener("pointermove",at);svg.addEventListener("pointerdown",at);svg.addEventListener("pointerleave",hide)}
  if(onPick)svg.addEventListener("click",ev=>{const b=at(ev);if(b)onPick(b)});
}
function kPath(ws,m){
  const c=kcfg(),W=340,H=210,L0=34,R=58,T=10,B=22,g=m.budgets[UI.budget];
  const pts=ws.filter(w=>typeof w.balance==="number").map(w=>({t:parseD(w.monday)+6*DAY,v:w.balance,w}));
  if(!pts.length){$("pathChart").innerHTML='<div class="empty">Укажи остаток хотя бы в одной неделе.</div>';return}
  const t0=pts[0].t,t1=parseD(c.deadline),endV=m.bal+m.pace*m.left,yMax=Math.max(g.KAI.goal,g.SNG.goal,endV)*1.06;
  const X=t=>L0+(t-t0)/(t1-t0||1)*(W-L0-R),Y=v=>T+(1-v/yMax)*(H-T-B);
  let s="";
  for(const v of niceTicks(0,yMax,4))s+=`<line class="grid" x1="${L0}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis vn" x="${L0-6}" y="${Y(v)+4}" text-anchor="end">${kfmt(v)}</text>`;
  for(let y=new Date(t0).getUTCFullYear()+1;Date.UTC(y,0,1)<=t1;y++){const t=Date.UTC(y,0,1),x=X(t);s+=`<line class="grid" x1="${x}" x2="${x}" y1="${T}" y2="${H-B}" stroke-dasharray="2 3"/>`;if(x-L0>34&&W-R-x>34)s+=`<text class="axis" x="${x}" y="${H-6}" text-anchor="middle">${y}</text>`}
  s+=`<text class="axis" x="${L0}" y="${H-6}">${dm(t0)}</text><text class="axis" x="${W-R}" y="${H-6}" text-anchor="end">${dm(t1)}</text>`;
  const goals=[["SNG",g.SNG.goal,"var(--series-1)"],["KAI",g.KAI.goal,"var(--series-2)"]],gy=goals.map(x=>Y(x[1]));let ly=gy.slice();if(Math.abs(ly[0]-ly[1])<13){const mid=(ly[0]+ly[1])/2;ly=ly[0]>ly[1]?[mid+7,mid-7]:[mid-7,mid+7]}
  goals.forEach((x,i)=>{s+=`<line x1="${L0}" x2="${W-R}" y1="${gy[i]}" y2="${gy[i]}" stroke="${x[2]}" stroke-width="2"/><text class="lbl vn" x="${W-R+5}" y="${ly[i]+4}" fill="${x[2]}">${x[0]} ${kfmt(x[1])}</text>`});
  const line=pts.map((p,i)=>(i?"L":"M")+X(p.t).toFixed(1)+" "+Y(p.v).toFixed(1)).join(" ");
  s+=`<path d="${line} L${X(pts[pts.length-1].t).toFixed(1)} ${Y(0)} L${X(t0).toFixed(1)} ${Y(0)} Z" fill="var(--ai)" opacity=".12"/>`;
  const lp=pts[pts.length-1];
  s+=`<path d="M${X(lp.t)} ${Y(lp.v)} L${X(t1)} ${Y(endV)}" stroke="var(--ink)" stroke-width="2" stroke-dasharray="5 4" fill="none" opacity=".55"/><path d="${line}" stroke="var(--ai)" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
  s+=`<circle cx="${X(lp.t)}" cy="${Y(lp.v)}" r="4.5" fill="var(--ai)" stroke="var(--surface-raised)" stroke-width="2"/><circle cx="${X(t1)}" cy="${Y(endV)}" r="4" fill="var(--surface-raised)" stroke="var(--ink)" stroke-width="2"/>`;
  s+=`<line class="cross" y1="${T}" y2="${H-B}" stroke="var(--ink-muted)" stroke-width="1" style="display:none"/><circle class="mark" r="5" fill="var(--ai)" stroke="var(--surface-raised)" stroke-width="2" style="display:none"/>`;
  $("pathChart").innerHTML=svgEl(W,H,s);
  $("pathCap").innerHTML="Прогноз к "+dmy(t1)+": "+bl(eur(endV))+" € при темпе "+bl(eur(m.pace))+" €/нед, без новых разовых трат"+(m.oneoffs>0?" · разовые за всё время "+bl(eur(m.oneoffs))+" €":"");
  $("pathLegend").innerHTML=`<span><i class="line" style="background:var(--ai)"></i>накоплено</span><span><i class="dash"></i>прогноз</span><span><i class="line" style="background:var(--series-1)"></i>цель SNG</span><span><i class="line" style="background:var(--series-2)"></i>цель KAI</span>`;
  const tp=pts.map(p=>({x:X(p.t),y:Y(p.v),p}));tp.push({x:X(t1),y:Y(endV),fc:true});
  attachTip($("pathChart"),tp,q=>q.fc?`прогноз ${dmy(t1)}<br><b>${eur(endV)} €</b>`:`${dm(q.p.t-6*DAY)}–${dm(q.p.t)}<br><b>${eur(q.p.v)} €</b>`);
}
function barPath(cx,bw,Y,v){const y0=Y(0),y1=Y(v),top=Math.min(y0,y1),h=Math.max(1,Math.abs(y1-y0)),r=Math.min(4,h/2,bw/2);
  return v>=0?`M${cx-bw/2} ${y0} V${top+r} Q${cx-bw/2} ${top} ${cx-bw/2+r} ${top} H${cx+bw/2-r} Q${cx+bw/2} ${top} ${cx+bw/2} ${top+r} V${y0} Z`
    :`M${cx-bw/2} ${y0} V${top+h-r} Q${cx-bw/2} ${top+h} ${cx-bw/2+r} ${top+h} H${cx+bw/2-r} Q${cx+bw/2} ${top+h} ${cx+bw/2} ${top+h-r} V${y0} Z`}
function kRate(){
  const keys=Object.keys(D.rates||{}).sort(),box=$("rateChart");if(!box)return;
  if(keys.length<2){box.innerHTML=`<div class="empty">${navigator.onLine?"Загружаю курс…":"Курс загрузится, когда появится интернет."}</div>`;return}
  const cut=iso(todayMs()-90*DAY),ks=keys.filter(k=>k>=cut),use=ks.length>=2?ks:keys.slice(-60),vals=use.map(k=>D.rates[k]);
  const W=340,H=130,L0=34,R=40,T=10,B=22,lo=Math.floor(Math.min(...vals)-1),hi=Math.ceil(Math.max(...vals)+1),t0=parseD(use[0]),t1=parseD(use[use.length-1]);
  const X=t=>L0+(t-t0)/(t1-t0||1)*(W-L0-R),Y=v=>T+(hi-v)/(hi-lo)*(H-T-B);
  let s="";for(const v of niceTicks(lo,hi,3))s+=`<line class="grid" x1="${L0}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${L0-6}" y="${Y(v)+4}" text-anchor="end">${v}</text>`;
  const line=use.map((k,i)=>(i?"L":"M")+X(parseD(k)).toFixed(1)+" "+Y(D.rates[k]).toFixed(1)).join(" ");
  s+=`<path d="${line} L${X(t1)} ${H-B} L${X(t0)} ${H-B} Z" fill="var(--series-2)" opacity=".14"/><path d="${line}" stroke="var(--series-2)" stroke-width="2" fill="none" stroke-linejoin="round"/>`;
  const lv=vals[vals.length-1];
  s+=`<circle cx="${X(t1)}" cy="${Y(lv)}" r="4" fill="var(--series-2)" stroke="var(--surface-raised)" stroke-width="2"/><text class="lbl" x="${X(t1)+7}" y="${Y(lv)+4}" fill="var(--ink)">${nf1.format(lv)}</text>`;
  s+=`<text class="axis" x="${L0}" y="${H-6}">${dm(t0)}</text><text class="axis" x="${W-R}" y="${H-6}" text-anchor="end">${dm(t1)}</text>`;
  s+=`<line class="cross" y1="${T}" y2="${H-B}" stroke="var(--ink-muted)" stroke-width="1" style="display:none"/><circle class="mark" r="4" fill="var(--series-2)" stroke="var(--surface-raised)" stroke-width="2" style="display:none"/>`;
  box.innerHTML=svgEl(W,H,s);
  const wk=rateAt(iso(t1-7*DAY)),d7=wk?lv-wk.rate:0,d90=lv-vals[0];const trend=v=>v>0.05?"иена слабеет ↑":v<-0.05?"иена крепнет ↓":"без изменений";
  $("rateCap").innerHTML=`За неделю <span class="${d7>=0?"pos-t":"neg-t"}">${d7>=0?"+":"−"}${nf2.format(Math.abs(d7))}</span> (${trend(d7)}) · за 90 дней ${d90>=0?"+":"−"}${nf1.format(Math.abs(d90))}`;
  attachTip(box,use.map(k=>({x:X(parseD(k)),y:Y(D.rates[k]),k})),q=>`${dmy(parseD(q.k))}<br><b>${nf2.format(D.rates[q.k])} ¥</b>`);
}

/* ================= CHARTS tab ================= */
const CH_N={day:7,week:4,month:4,year:4};
function buckets(group){
  const t=todayMs(),d=new Date(t),out=[];
  const first=opsList().reduce((m,o)=>(o.type==="income"||o.type==="expense")&&o.date<m?o.date:m,"9999");
  const f=first==="9999"?t:parseD(first);
  if(group==="day"){const n=Math.min(120,Math.max(7,Math.round((t-f)/DAY)+1));for(let i=n-1;i>=0;i--){const s=t-i*DAY;out.push({start:s,end:s+DAY,label:dm(s)})}}
  else if(group==="week"){const m=mondayOf(t),n=Math.min(156,Math.max(4,Math.round((m-mondayOf(f))/(7*DAY))+1));for(let i=n-1;i>=0;i--){const s=m-i*7*DAY;out.push({start:s,end:s+7*DAY,label:dm(s)})}}
  else if(group==="month"){const fd=new Date(f),n=Math.min(60,Math.max(4,(d.getUTCFullYear()-fd.getUTCFullYear())*12+d.getUTCMonth()-fd.getUTCMonth()+1));
    for(let i=n-1;i>=0;i--){const s=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-i,1),e=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-i+1,1);out.push({start:s,end:e,label:MONTHS_S[new Date(s).getUTCMonth()],year:new Date(s).getUTCFullYear()})}}
  else{const y0=new Date(f).getUTCFullYear();for(let y=y0;y<=d.getUTCFullYear();y++)out.push({start:Date.UTC(y,0,1),end:Date.UTC(y+1,0,1),label:String(y)})}
  return out;
}
// Buckets filled with income, expenses (by category for one type) and one-off amounts.
function chartData(group,catType,accs){
  const bs=buckets(group);const sel=accs&&accs.length?accs:null;
  for(const b of bs){b.inc=0;b.exp=0;b.one=0;b.oneInc=0;b.cats={}}
  for(const o of opsList()){if(o.type!=="income"&&o.type!=="expense")continue;if(!accFilterMatch(o,sel)||(account(o.accountId)||{}).exclude)continue;
    const t=parseD(o.date);const b=bs.find(x=>t>=x.start&&t<x.end);if(!b)continue;const v=opEUR(o);
    if(o.type==="income"){b.inc+=v;if(o.oneoff)b.oneInc+=v}else{b.exp+=v;if(o.oneoff)b.one+=v}
    if(o.type===catType)b.cats[o.categoryId]=(b.cats[o.categoryId]||0)+v}
  return bs;
}
/* Swipeable bar chart. S: {mode:"total"|"expense"|"income", group, sel}. o: {box, legend, detail, onPick, first, focusSel} */
function drawChart(bs,S,o){
  const box=o.box;if(!box)return;
  const prev=box.querySelector(".ch-scroll");const prevX=prev?prev.scrollLeft:null;
  const cw=box.clientWidth||340,AX=38,vis=CH_N[S.group]||4,n=bs.length;
  const slot=Math.max(48,(cw-AX)/vis),W=Math.round(n*slot),H=200,T=16,B=28;
  let s="",ax="",pts=[],legend="";
  let hi=10,need=null;const reg=b=>b.inc-b.exp+b.one-b.oneInc;
  if(S.mode==="total"){hi=Math.max(10,...bs.flatMap(b=>[b.inc,b.exp,Math.abs(b.inc-b.exp),Math.abs(reg(b))]));if(S.group==="week"){const K=kNow();if(K.m)need=K.m.budgets[UI.budget].KAI.need}hi=Math.max(hi,need||0)}
  else{const key=S.mode==="expense"?"exp":"inc";hi=Math.max(10,...bs.map(b=>b[key]))}
  hi*=1.1;const Y=v=>T+(hi-v)/hi*(H-T-B);
  for(const v of niceTicks(0,hi,4)){s+=`<line class="grid" x1="0" x2="${W}" y1="${Y(v)}" y2="${Y(v)}"/>`;ax+=`<text class="axis" x="${AX-6}" y="${Y(v)+4}" text-anchor="end">${kfmt(v)}</text>`}
  if(S.mode==="total"){
    const bw=Math.max(6,Math.min(20,(slot-18)/3));let anyX=false;
    bs.forEach((b,i)=>{const cx=slot*(i+.5),p=b.inc-b.exp,r=reg(b),on=S.sel==null||S.sel===i,op=on?1:.4;
      s+=`<path d="${barPath(cx-bw-2,bw,Y,b.inc)}" fill="var(--inc)" opacity="${op}"/><path d="${barPath(cx,bw,Y,b.exp)}" fill="var(--exp)" opacity="${op}"/>`;
      if(r-p>=1&&r>0){anyX=true;s+=`<path d="${barPath(cx+bw+2,bw,Y,r)}" fill="none" stroke="var(--profit)" stroke-width="1.5" stroke-dasharray="3 2" opacity="${op}"/>`}
      s+=`<path d="${barPath(cx+bw+2,bw,Y,Math.abs(p))}" fill="${p>=0?"var(--profit)":"var(--loss)"}" opacity="${op}"/>`;
      s+=`<text class="axis" x="${cx}" y="${H-10}" text-anchor="middle">${b.label}</text>`;
      pts.push({x:cx,y:Y(Math.max(b.inc,b.exp,Math.abs(p))),i,b})});
    if(need){s+=`<line x1="0" x2="${W}" y1="${Y(need)}" y2="${Y(need)}" stroke="var(--series-2)" stroke-width="1.5" stroke-dasharray="6 4"/>`;ax+=`<text class="lbl" x="${AX-6}" y="${Y(need)+4}" text-anchor="end" fill="var(--series-2)">${eur(need)}</text>`}
    legend=`<span><i style="background:var(--inc)"></i>доходы</span><span><i style="background:var(--exp)"></i>расходы</span><span><i style="background:var(--profit)"></i>отложено</span><span><i style="background:var(--loss)"></i>минус</span>`+(anyX?`<span><i class="ghost" style="border-color:var(--profit)"></i>без разовых</span>`:"")+(need?`<span><i class="dash" style="background:repeating-linear-gradient(90deg,var(--series-2) 0 4px,transparent 4px 7px)"></i>норма KAI ${eur(need)} €/нед</span>`:"");
  }else{
    const bw=Math.max(10,Math.min(34,slot-22));const used={};
    bs.forEach((b,i)=>{const cx=slot*(i+.5);let acc=0;const ents=Object.entries(b.cats).sort((a,c)=>c[1]-a[1]);const op=S.sel==null||S.sel===i?1:.4;
      ents.forEach(([cid,v],j)=>{const c=category(cid)||{color:"#8E8E93"};used[cid]=(used[cid]||0)+v;const y1=Y(acc+v),y0=Y(acc);
        s+=`<rect x="${cx-bw/2}" y="${y1}" width="${bw}" height="${Math.max(0,y0-y1-(j<ents.length-1?1:0))}" fill="${esc(c.color)}" rx="${j===ents.length-1?4:0}" opacity="${op}"/>`;acc+=v});
      s+=`<text class="axis" x="${cx}" y="${H-10}" text-anchor="middle" ${S.sel===i?'style="font-weight:700;fill:var(--ink)"':""}>${b.label}</text>`;pts.push({x:cx,y:Y(acc),i,b})});
    legend=Object.entries(used).sort((a,c)=>c[1]-a[1]).slice(0,8).map(([cid])=>{const c=category(cid)||{color:"#8E8E93",name:"Без категории"};return `<span><i style="background:${esc(c.color)}"></i>${esc(c.name)}</span>`}).join("");
  }
  s+=`<line x1="0" x2="${W}" y1="${H-B}" y2="${H-B}" stroke="var(--ink-muted)" stroke-width="1"/>`;
  box.innerHTML=`<div class="ch-axis"><svg viewBox="0 0 ${AX} ${H}" width="${AX}" height="${H}">${ax}</svg></div><div class="ch-scroll"><div class="ch-inner" style="width:${W}px"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${s}</svg></div></div>`;
  if(o.legend)o.legend.innerHTML=legend;
  const sc=box.querySelector(".ch-scroll");
  if(o.focusSel&&S.sel!=null){const want=slot*(S.sel+.5)-sc.clientWidth/2;sc.scrollLeft=(!o.first&&prevX!=null&&Math.abs(prevX-want)<sc.clientWidth/2-slot)?prevX:Math.max(0,want)}
  else sc.scrollLeft=(!o.first&&prevX!=null)?prevX:sc.scrollWidth;
  const inner=box.querySelector(".ch-inner");
  attachTip(inner,pts,null,q=>o.onPick&&o.onPick(q.i));
  /* Floating card over the chart instead of a list below it: the page keeps its height */
  if(o.pop&&S.mode==="total"&&S.sel!=null&&bs[S.sel]){
    const b=bs[S.sel],p=b.inc-b.exp,r=reg(b),row=(k,v,c)=>`<div><span>${k}</span><span class="num ${c||""}">${v}</span></div>`;
    const pop=document.createElement("div");pop.className="ch-pop";
    pop.innerHTML=`<div class="hd"><b>${esc(b.label)}${b.year?" "+b.year:""}</b>${S.group==="week"?`<span>${dm(b.start)}–${dmy(b.end-DAY)}</span>`:""}</div>`
      +row("Доходы",nf2.format(b.inc)+" €","pos-t")+row("Расходы",nf2.format(b.exp)+" €")+row(p>=0?"Отложено":"Минус",nf2.format(p)+" €",p>=0?"pos-t":"neg-t")+(Math.abs(r-p)>=1?row("Без разовых",signed(r)+" €"):"");
    inner.appendChild(pop);
    /* beside the selected week, never over its bars: to the right if it fits (or if there is more room there), otherwise to the left */
    const w=pop.offsetWidth,vl=sc.scrollLeft,vr=Math.min(W,vl+sc.clientWidth),s0=slot*S.sel,s1=slot*(S.sel+1);
    let L=(vr-s1>=w+6||vr-s1>=s0-vl)?s1+2:s0-w-2;L=Math.max(vl+4,Math.min(L,vr-w-4));pop.style.left=L+"px";
  }
}

/* ================= ACCOUNTS tab ================= */
function renderAccounts(){
  let h=`<main class="wrap"><div class="head"><div><h1 class="title">Счета</h1></div>${eyeBtn()}</div>`;
  h+=`<div class="acc-pick"><span class="sub">Всего на счетах</span><div class="big num">${UI.hideBal?"8 888,88":`<span data-roll="accTotal" data-v="${totalEUR(null).toFixed(2)}" data-fmt="nf2">${nf2.format(totalEUR(null))}</span>`}<small>€</small></div></div>`;
  h+=`<div class="btn-row"><button class="qbtn" data-act="transfer">${svgI("swap")}Создать перевод</button><button class="qbtn" data-act="transfers">${svgI("history")}История переводов</button></div>`;
  const accs=accounts();
  h+=`<div class="list">`+(accs.length?accs.map(a=>{const b=accBalance(a.id);return `<button class="row" data-act="editacc" data-v="${esc(a.id)}">${catIc(a)}<div class="mid"><div class="t">${esc(a.name)}</div><div class="s">${esc(a.desc||"")}${a.exclude?(a.desc?" · ":"")+"не в итоге":""}</div></div>
    <span class="amt num"><span data-roll="acc-${esc(a.id)}" data-v="${b.toFixed(2)}" data-fmt="nf2">${nf2.format(b)}</span> ${esc(sym(a.currency))}${a.currency!=="EUR"?`<small>≈ ${nf2.format(toEUR(b,a.currency))} €</small>`:""}</span></button>`}).join(""):'<div class="empty">Пока нет счетов. Нажми «+».</div>')+`</div>`;
  h+=`<section><p class="section-label">Справочники</p><div class="list">
    <button class="row" data-act="catlist" data-v="expense"><span class="ic" style="background:var(--exp)">${svgI("cats")}</span><div class="mid"><div class="t">Категории расходов</div></div><span class="val num">${categories("expense").length}</span>${svgI("chevR")}</button>
    <button class="row" data-act="catlist" data-v="income"><span class="ic" style="background:var(--inc)">${svgI("cats")}</span><div class="mid"><div class="t">Категории доходов</div></div><span class="val num">${categories("income").length}</span>${svgI("chevR")}</button>
    <button class="row" data-act="taglist"><span class="ic" style="background:var(--ink-muted)">${svgI("tag")}</span><div class="mid"><div class="t">Теги</div></div><span class="val num">${tagsList().length}</span>${svgI("chevR")}</button>
    <button class="row" data-act="settings"><span class="ic" style="background:var(--ai)">${svgI("gear")}</span><div class="mid"><div class="t">Настройки и синхронизация</div><div class="s">${esc(syncText())}</div></div>${svgI("chevR")}</button></div></section>`;
  h+=`</main>`;return h;
}
