/* Копилка — Frame (tabs, render), the Home screen and the shared motion helpers.
   Plain scripts loaded in order by index.html (core → home → screens → sheets → boot); they share one global scope. */
"use strict";

/* ================= render: frame ================= */
/* PRIVATE SHOW MODE. While true, nothing in the app says what the savings are for: the Japan tab becomes «Цель»,
   the splash and the yen rate are gone, and every mention of Japan, the schools, yen or Japanese study is blurred
   wherever it appears (screens, sheets, toasts, charts). There is deliberately no switch in the app; set to false to undo. */
const PRIVATE=false;
const TABS=[["overview","Главная","home"],["ops","Операции","list"],["kopilka",PRIVATE?"Цель":"Япония",PRIVATE?"pig":"kanji"],["accounts","Счета","wallet"]];
function renderTabs(){
  $("tabs").innerHTML=TABS.map(([id,label,ic])=>`<button class="tab" data-act="tab" data-v="${id}" ${UI.tab===id?'aria-current="page"':""}>${ic==="kanji"?'<span class="kanji">貯</span>':ic==="pig"?icon("pig-money"):svgI(ic)}<span>${label}</span></button>`).join("");
  $("fab").innerHTML=svgI("plus");$("fab").hidden=!(UI.tab==="overview"||UI.tab==="ops"||UI.tab==="accounts");$("fab").setAttribute("aria-label",UI.tab==="accounts"?"Добавить счёт":"Добавить операцию");
}
function topBar(left,right){
  return `<div class="top"><div class="top-in">${left||'<span style="width:36px"></span>'}
    <button class="sync" id="sync" data-act="sync" data-s="${syncState}"><i></i><span id="syncT">${esc(syncText())}</span></button>
    ${right||'<span style="width:36px"></span>'}</div></div>`;
}
function render(){
  document.body.classList.toggle("hide-bal",!!UI.hideBal);
  if(UI.tab==="charts")UI.tab="kopilka";
  renderTabs();
  const fn={overview:renderOverview,ops:renderOps,kopilka:renderKopilka,accounts:renderAccounts}[UI.tab]||renderOverview;
  $("app").innerHTML=`<div class="page" data-tab="${UI.tab}">${fn()}</div>`;
  bindAfter();
  if(UI.tab!=="overview")motionPage(M.lastTab!==UI.tab);
  if(M.lastTab&&M.lastTab!==UI.tab&&!reduceMotion()){const pg=document.querySelector("#app .page"),d=M.tabDir||0;M.tabDir=0;
    pg&&pg.animate(d?[{opacity:.2,transform:`translateX(${d*56}px)`},{opacity:1,transform:"none"}]:[{opacity:0,transform:"translateY(8px)"},{opacity:1,transform:"none"}],{duration:d?260:240,easing:EASE})}
  M.lastTab=UI.tab;M.expand=null;
  saveUI();
}
let afterFns=[];
function after(fn){afterFns.push(fn)}
function bindAfter(){const f=afterFns;afterFns=[];f.forEach(x=>{try{x()}catch(e){console.error(e)}})}

function accLabel(sel){
  if(!sel||!sel.length)return"Итого";
  if(sel.length===1)return (account(sel[0])||{}).name||"Счёт";
  return sel.length+" счёта";
}
function periodControls(scope,p){
  const kinds=[["day","День"],["week","Неделя"],["month","Месяц"],["year","Год"],["custom","Период"]];
  const r=periodRange(p);const next=shiftPeriod(p,1);const nextStart=periodRange(next).start;
  const kind=`<label class="pkind"><select data-pk="${scope}" aria-label="Период">${kinds.map(([k,l])=>`<option value="${k}" ${p.kind===k?"selected":""}>${l}</option>`).join("")}</select><span>${(kinds.find(x=>x[0]===p.kind)||kinds[1])[1]}${svgI("chevD")}</span></label>`;
  if(p.kind==="custom")return `<div class="range custom"><div class="rmid">${kind}<div class="custom-range"><input type="date" id="${scope}-from" value="${esc(p.from||iso(todayMs()-30*DAY))}" aria-label="С"> — <input type="date" id="${scope}-to" value="${esc(p.to||todayIso())}" aria-label="По"></div></div></div>`;
  return `<div class="range"><button class="nav" data-act="pshift" data-scope="${scope}" data-v="-1" aria-label="Назад">${svgI("chevL")}</button>
    <div class="rmid">${kind}<button class="lbl" data-act="ptoday" data-scope="${scope}">${esc(r.label)}</button></div>
    <button class="nav" data-act="pshift" data-scope="${scope}" data-v="1" aria-label="Вперёд" ${nextStart>todayMs()?"disabled":""}>${svgI("chevR")}</button></div>`;
}

/* ================= OVERVIEW ================= */
function renderOverview(){
  const S=UI.ov,p=S.period,r=periodRange(p),type=S.type;
  const sel=S.accs&&S.accs.length?S.accs:null;
  const total=sel?totalEUR(sel):totalEUR(null);
  const ops=opsList().filter(o=>o.type===type&&inRange(o,r)&&accFilterMatch(o,sel));
  const by={};let sum=0;
  for(const o of ops){const v=opEUR(o);sum+=v;const k=o.categoryId||"_";(by[k]=by[k]||{v:0,n:0,tags:{}});by[k].v+=v;by[k].n++;
    const tg=(o.tagIds&&o.tagIds.length)?o.tagIds:["_none"];for(const t of tg){by[k].tags[t]=(by[k].tags[t]||0)+v}}
  const rows=Object.entries(by).map(([id,x])=>({id,...x,c:category(id)||{name:"Без категории",color:"#8E8E93",icon:"help-circle"}})).sort((a,b)=>b.v-a.v);
  const max=rows.length?rows[0].v:1;
  const rk=[type,p.kind,r.start,(sel||[]).join(",")].join("|"),enter=M.lastTab!=="overview"||M.ringKey!==rk;M.ringKey=rk;
  let h=`<main class="wrap"><div class="sticky"><div class="sticky-in"><div class="ov-head"><button class="icon-btn" data-act="settings" aria-label="Настройки">${svgI("gear")}</button>
    <button class="acc-pick tap" data-act="accpick" data-scope="ov" aria-label="${esc(accLabel(sel))}: выбрать счета"><span class="big num${UI.hideBal?" veil":""}">${UI.hideBal?"8 888,88":`<span data-roll="total" data-v="${total.toFixed(2)}" data-fmt="nf2">${nf2.format(total)}</span>`}<small>€</small></span>${sel?`<span class="acc-sel">${esc(accLabel(sel))} ${svgI("chevD")}</span>`:""}</button>${eyeBtn()}</div>${sel?"":goalLine()}</div></div>`;
  h+=syncBanner();
  if(!getAuth()&&!accounts().length)h+=onboardCard();
  h+=`<div class="ov-grid"><div class="ov-col">`;
  h+=`<section class="card ov-stats" id="ovStats"><div class="ov-top"><div class="seg" role="group" aria-label="Тип"><button data-act="ovtype" data-v="expense" aria-pressed="${type==="expense"}">Расходы</button><button data-act="ovtype" data-v="income" aria-pressed="${type==="income"}">Доходы</button></div></div>${periodControls("ov",p)}`;
  const segs=rows.map(x=>({v:x.v,color:x.c.color,id:x.id,name:x.c.name}));
  h+=`<div class="donut-wrap">${donut(segs,enter)}<div class="donut-c"><b class="num"><span data-roll="ring:${esc(rk)}" data-v="${sum.toFixed(2)}" data-fmt="nf2">${nf2.format(sum)}</span> €</b><span>${type==="expense"?"расходы":"доходы"} · ${ops.length} опер.</span></div></div></section>`;
  h+=budgetCard();
  h+=`</div><div class="ov-col">`;
  if(rows.length){
    h+=`<div class="list" id="ovCats">`+rows.map(x=>{
      const pct=sum?x.v/sum*100:0,open=S.open===x.id;
      const plan=x.c.plan>0&&p.kind==="month"?` · из ${eur(x.c.plan)} €`:"";
      let sub="";
      {const tg=Object.entries(x.tags).sort((a,b)=>b[1]-a[1]);
        sub=`<div class="cat-sub" ${open?"":"hidden"}>${tg.map(([t,v])=>`<button class="ctag" data-act="showcatops" data-v="${esc(x.id)}" data-tag="${esc(t)}"><span>${t==="_none"?"без тега":esc((D.tags[t]||{}).name||"тег")}</span><span class="num">${nf2.format(v)} €</span>${svgI("chevR")}</button>`).join("")}</div>`}
      return `<button class="row cat-row" data-act="ovopen" data-v="${esc(x.id)}">${catIc(x.c)}<div class="mid"><div class="t">${esc(x.c.name)}</div><div class="s">${x.n} опер.${plan}</div>
        <div class="bar"><i data-bar="cat:${esc(x.id)}" style="width:${(x.v/max*100).toFixed(1)}%;background:${esc(x.c.color)}"></i></div></div>
        <span class="pct num">${nf0.format(pct)}%</span><span class="amt num">${nf2.format(x.v)} €</span></button>${sub}`}).join("")+`</div>`;
  }else h+=`<div class="card empty"><b>Нет ${type==="expense"?"расходов":"доходов"} за период</b>Нажми «+», чтобы добавить.</div>`;
  h+=`</div></div></main>`;
  after(()=>{bindCustomRange("ov");bindSwipe($("ovStats"),"ov");slideIn("#ovStats .donut-wrap,#ovCats");motionPage(enter)});
  return h;
}
const bl=s=>String(s).replace(/[+−-]?\d(?:[\d\u00a0\u202f]*\d)?(?:[.,]\d+)?/g,m=>`<span class="vn">${m}</span>`);
const eyeBtn=()=>`<button class="icon-btn" data-act="hidebal" aria-label="${UI.hideBal?"Показать баланс":"Скрыть баланс"}" aria-pressed="${!!UI.hideBal}">${svgI(UI.hideBal?"eyeOff":"eye")}</button>`;
function goalLine(){
  const K=kNow();if(!K.m)return"";const g=K.m.budgets[UI.budget].KAI,p=Math.max(0,Math.min(1,g.progress));
  return `<button class="goal-line" data-act="tab" data-v="kopilka" aria-label="Открыть Копилку"><span class="gbar${UI.hideBal?" veil":""}"><i data-bar="goal" style="width:${UI.hideBal?50:(p*100).toFixed(1)}%"></i></span>
    <span class="gtxt${UI.hideBal?" veil":""}">${UI.hideBal?"<b class=\"num\">88%</b> цели KAI · ещё 88 888 € · прогноз +8 888":`<b class="num">${nf0.format(g.progress*100)}%</b> цели KAI · ещё ${eur(Math.max(0,g.goal-K.m.bal))} € · прогноз <span class="${g.fc>=0?"pos-t":"neg-t"}">${signed(g.fc)}</span>`}</span></button>`;
}
function budgetCard(){
  const B=weekBudget();if(!B)return"";const c=B.cur,neg=B.left<0;
  const lifeW=Math.max(B.life,B.spent,1),dW=Math.max(0,c.daily)/lifeW*100,fW=Math.max(0,c.free)/lifeW*100;
  const head=B.daysLeft===1?"последний день недели":"ещё "+B.daysLeft+" "+(B.daysLeft<5?"дня":"дней");
  const row=(k,v,cls,small)=>`<div class="r"><span class="k">${k}${small?`<small>${small}</small>`:""}</span><span class="v num ${cls||""}">${v}</span></div>`;
  const open=!!UI.budgetOpen;
  let h=`<section class="card budget ${open?"open":""}"><button class="b-head" data-act="budgettoggle" aria-expanded="${open}">
    <span class="b-main"><span class="b-big num ${neg?"neg-t":""}"><span data-roll="left" data-v="${Math.abs(B.left).toFixed(2)}" data-fmt="eur">${eur(Math.abs(B.left))}</span> €</span><span class="b-cap">${neg?"перерасход недели":"можно потратить"}<br>${head}${!neg&&B.daysLeft>1?` · ≈ ${eur(B.left/B.daysLeft)} €/день`:""}</span></span>
    <span class="b-chev">${svgI("chevD")}</span></button>
    <div class="b-bar" role="img" aria-label="Потрачено ${eur(B.spent)} из ${eur(B.life)} €"><i class="d" data-bar="bd" style="width:${dW.toFixed(1)}%"></i><i class="f" data-bar="bf" style="width:${fW.toFixed(1)}%"></i></div>
    <div class="b-more" ${open?"":"hidden"}><div class="rows">`;
  h+=row(B.arrived?"Доход за неделю":"Доход, ожидается",(B.arrived?"+":"≈ +")+eur(B.expInc),"pos-t",B.arrived?"":`зарплаты ещё нет · обычно ${eur(B.avgInc)} €`);
  if(B.need)h+=row("Отложить по норме KAI","−"+eur(B.need));
  h+=row("Счета месяца, в среднем","−"+eur(B.billShare),"",c.monthly>0?`на этой неделе оплачено ${eur(c.monthly)} €`+(c.bills.length?`: ${esc(c.bills.slice(0,3).join(", "))}`:""):"аренда, NS, подписки");
  h+=row("<b>На жизнь</b>",eur(B.life)+" €");
  h+=row(`<i class="dot d"></i>Еда и обязательное`,"−"+eur(c.daily));
  h+=row(`<i class="dot f"></i>Остальное`,"−"+eur(c.free));
  h+=`</div>`;
  const savedNow=c.inc+c.incOne-c.daily-c.free-c.monthly-c.oneoff;
  h+=`<button class="b-foot" data-act="tab" data-v="kopilka"><span>Отложено за неделю <b class="num ${savedNow>=0?"":"neg-t"}">${signed(savedNow)} €</b>${c.oneoff>0?`<small>с учётом разовых −${eur(c.oneoff)} €${c.ones.length?": "+esc(c.ones.slice(0,2).join(", ")):""}</small>`:""}</span>${svgI("chevR")}</button></div>`;
  return h+`</section>`;
}
function syncBanner(){
  if(syncState==="auth")return `<button class="banner" data-act="settings" style="text-align:left">GitHub не принимает токен (истёк или отозван). Открой настройки и вставь новый. Записи пока сохраняются на телефоне.</button>`;
  if(syncState==="norepo")return `<button class="banner" data-act="settings" style="text-align:left">Нет доступа к репозиторию с данными. Проверь токен в настройках.</button>`;
  return "";
}
function onboardCard(){return `<section class="card" style="display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font-size:20px">Подключи хранилище</h2>
  <p class="sub" style="margin:0">Данные хранятся на устройстве и в приватном репозитории <b>kopilka-data</b>. Без сети всё работает, синхронизация пройдёт сама.</p>
  <button class="btn" data-act="syncsheet">Вставить токен</button></section>`}
function catIc(c,cls){return `<span class="ic ${cls||""}" style="background:${esc(c.color||"#8E8E93")}">${icon(c.icon)}</span>`}
/* Ring of category segments. Each segment is a filled ring sector whose outline is stroked in the same colour with
   round joins: that rounds its four corners by RND/2 (the sector is shrunk by the same amount, so sizes stay true).
   The gap between segments has parallel edges. sweep: a track-coloured cover is drawn over the segments and
   uncovers them clockwise from the top. */
function donut(segs,sweep){
  const R=50,W=18,C=2*Math.PI*R,total=segs.reduce((a,s)=>a+s.v,0),ro=R+W/2,ri=R-W/2,GAP=2,RND=0;
  const pt=(r,a)=>`${(60+r*Math.sin(a)).toFixed(3)} ${(60-r*Math.cos(a)).toFixed(3)}`;
  const live=segs.filter(g=>g.v>0);
  const seg=g=>g.id?`class="seg-hit" data-act="ringseg" data-v="${esc(g.id)}" role="button" aria-label="${esc(g.name||"")}"`:"";
  // the grey track only for an empty period; with data the gaps between segments show the card itself
  let s=`<svg viewBox="0 0 120 120">${total>0?"":`<circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--surface-sunken)" stroke-width="${W}"/>`}`;
  if(total>0&&live.length===1)s+=`<circle ${seg(live[0])} cx="60" cy="60" r="${R}" fill="none" stroke="${esc(live[0].color)}" stroke-width="${W}"/>`;
  else if(total>0){let a0=0;
    for(const g of live){const da=g.v/total*2*Math.PI,a1=a0+da,avail=da*R-GAP;
      const w=Math.max(0,Math.min(RND,avail-.6)),h=w/2,d=GAP/2+h,o=ro-h,i=ri+h;
      // angles of the four corners, offset so the gap edges stay parallel
      const so=a0+Math.asin(Math.min(1,d/o)),eo=a1-Math.asin(Math.min(1,d/o)),si=a0+Math.asin(Math.min(1,d/i)),ei=a1-Math.asin(Math.min(1,d/i));
      if(eo>so&&ei>si){const lo=eo-so>Math.PI?1:0,li=ei-si>Math.PI?1:0;
        s+=`<path ${seg(g)} d="M${pt(o,so)}A${o} ${o} 0 ${lo} 1 ${pt(o,eo)}L${pt(i,ei)}A${i} ${i} 0 ${li} 0 ${pt(i,si)}Z" fill="${esc(g.color)}"${w>0?` stroke="${esc(g.color)}" stroke-width="${w.toFixed(2)}" stroke-linejoin="round"`:""}/>`}
      else{const m=(a0+a1)/2,hw=Math.max(.3,(avail)/2)/R; // a sliver too small to round
        s+=`<path ${seg(g)} d="M${pt(ro,m-hw)}A${ro} ${ro} 0 0 1 ${pt(ro,m+hw)}L${pt(ri,m+hw)}A${ri} ${ri} 0 0 0 ${pt(ri,m-hw)}Z" fill="${esc(g.color)}"/>`}
      a0=a1}}
  if(sweep&&total>0&&!reduceMotion())s+=`<circle class="ring-cover" cx="60" cy="60" r="${R}" fill="none" stroke="var(--surface-raised)" stroke-width="${W+1.5}" stroke-dasharray="${C.toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 60 60)" style="animation-delay:${splashLeft()}ms"/>`;
  return s+`</svg>`;
}
/* ================= motion ================= */
/* One vocabulary for the whole app: short durations, the iOS-like ease-out, transform/opacity/size only,
   triggered by taps and data changes, never by scrolling. Everything is skipped with Reduce Motion on. */
const EASE="cubic-bezier(.2,.8,.2,1)";
const reduceMotion=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
// time until the launch splash starts fading (its CSS fade begins 1.05 s after load); 0 once it is gone
const splashLeft=()=>{const sp=document.getElementById("splash");if(!sp||!sp.getAnimations)return 0;
  const an=sp.getAnimations().find(x=>x.animationName==="splash-out");if(!an||an.playState==="finished")return 0;
  return Math.max(0,Math.round(1050-(an.currentTime||0)+120))};
const M={vals:{},bars:{},rings:{},ringKey:null,lastTab:null,expand:null};
const FMT={nf2:v=>nf2.format(v),eur:v=>eur(v),pct:v=>nf0.format(v)+"%"};
document.addEventListener("touchstart",()=>{},{passive:true});
/* private show mode: blur every Japan-related word as soon as it lands in the page */
const REDACT=/(KAI|SNG|JLPT|N5|Bunpro|Genki|[Пп]ереезд\S*|[Яя]пон\S*|[Ии]ен[аыуеой]\S*|あと|貯|[\d\u00a0\u202f ,.]*¥[\d\u00a0\u202f ,.]*(?:\/мес)?)/g;
function redactNode(n){
  if(n.nodeType===3){const t=n.nodeValue;REDACT.lastIndex=0;if(!t||!REDACT.test(t))return;const p=n.parentNode;if(!p||p.closest&&p.closest(".redact"))return;
    if(p.namespaceURI==="http://www.w3.org/2000/svg"){p.classList.add("redact-svg");return}
    REDACT.lastIndex=0;const f=document.createDocumentFragment();let last=0,m;
    while((m=REDACT.exec(t))){if(!m[0].trim())continue;f.append(t.slice(last,m.index));const s=document.createElement("span");s.className="redact";s.textContent=m[0];f.append(s);last=m.index+m[0].length}
    f.append(t.slice(last));p.replaceChild(f,n);return}
  if(n.nodeType===1&&!n.classList.contains("redact")){if(n.matches&&n.matches("input,textarea"))return;[...n.childNodes].forEach(redactNode)}}
if(PRIVATE){document.documentElement.classList.add("private");
  const run=()=>{redactNode(document.body);new MutationObserver(ms=>{for(const m of ms){if(m.type==="characterData")redactNode(m.target);else m.addedNodes.forEach(redactNode)}}).observe(document.body,{childList:true,subtree:true,characterData:true})};
  document.body?run():document.addEventListener("DOMContentLoaded",run)} // lets iOS Safari show :active press states
function rollNum(el,from,to,fmt,dur){const t0=performance.now();
  const step=t=>{if(!el.isConnected)return;const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(step)};
  requestAnimationFrame(step)}
function motionPage(enter){
  const rm=reduceMotion(),delay=enter?splashLeft():0;
  // numbers count from their previous value to the new one
  document.querySelectorAll("[data-roll]").forEach(el=>{const k=el.dataset.roll.split(":")[0],v=+el.dataset.v,prev=M.vals[k],fmt=FMT[el.dataset.fmt]||FMT.nf2;
    M.vals[k]=v;if(rm||prev==null||Math.abs(prev-v)<.005)return;el.textContent=fmt(prev);rollNum(el,prev,v,fmt,520)});
  // progress rings fill from empty when the screen opens, otherwise from where they were
  document.querySelectorAll(".ring .fill[data-ring]").forEach(el=>{const k=el.dataset.ring,to=+el.getAttribute("stroke-dashoffset"),full=parseFloat(el.getAttribute("stroke-dasharray")),from=enter?full:M.rings[k];M.rings[k]=to;
    if(rm||from==null||Math.abs(from-to)<.05)return;el.animate([{strokeDashoffset:from},{strokeDashoffset:to}],{duration:enter?800:450,delay,easing:EASE,fill:"backwards"})});
  // line and bar charts are drawn in from left to right when the screen opens
  if(enter&&!rm)document.querySelectorAll("#app .chart svg, #app .chart .ch-inner").forEach(el=>{if(el.closest(".ch-axis")||(el.tagName.toLowerCase()==="svg"&&el.closest(".ch-inner")))return;
    el.animate([{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0 0 0)"}],{duration:800,delay:delay+150,easing:EASE,fill:"backwards"})});
  // bars grow from their previous width; on entering the screen, from zero, one after another
  let n=0;document.querySelectorAll("[data-bar]").forEach(el=>{const k=el.dataset.bar,to=el.style.width,from=enter?"0%":M.bars[k];M.bars[k]=to;
    if(rm||from==null||from===to)return;el.animate([{width:from},{width:to}],{duration:enter?650:420,delay:delay+(enter&&k.startsWith("cat:")?120+Math.min(n++,8)*40:0),easing:EASE,fill:"backwards"})});
  // opening a card or a category: its content unfolds
}
/* Show/hide a block of extra details in place. Only this block's height animates (the page is not rebuilt),
   its content fades and settles a few points, and an interrupted animation continues from where it is. */
function expand(el){
  const run=el._an;const from=run?el.getBoundingClientRect().height:0;if(run)run.cancel();
  el.hidden=false;if(reduceMotion())return;const to=el.scrollHeight;
  el.style.overflow="hidden";
  const a=el._an=el.animate([{height:from+"px"},{height:to+"px"}],{duration:300,easing:EASE});
  [...el.children].forEach(c=>c.animate([{opacity:0,transform:"translateY(-6px)"},{opacity:1,transform:"none"}],{duration:260,delay:40,easing:EASE,fill:"backwards"}));
  a.onfinish=a.oncancel=()=>{if(el._an===a){el._an=null;el.style.overflow=""}}}
function collapse(el){
  if(el.hidden&&!el._an)return;const run=el._an;const from=el.getBoundingClientRect().height;if(run)run.cancel();
  if(reduceMotion()){el.hidden=true;return}
  el.style.overflow="hidden";
  const a=el._an=el.animate([{height:from+"px",opacity:1},{height:"0px",opacity:0}],{duration:240,easing:EASE,fill:"forwards"});
  a.onfinish=()=>{if(el._an!==a)return;el._an=null;el.hidden=true;el.style.overflow="";a.cancel()}}
