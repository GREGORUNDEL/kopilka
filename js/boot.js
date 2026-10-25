/* Копилка — GitHub sync, exchange rates, tap/gesture handling and app start.
   Plain scripts loaded in order by index.html (core → home → screens → sheets → boot); they share one global scope. */
"use strict";

/* ================= sync ================= */
let syncState=getAuth()?"ok":"local";
function syncText(){return{ok:"сохранено"+(D.lastSync?" · "+hhmm(D.lastSync):""),syncing:"синхронизация…",offline:D.dirty?"офлайн · ждёт сети":"офлайн",local:"только на этом устройстве",auth:"токен не работает",norepo:"нет доступа к данным",error:"не удалось, повторю"}[syncState]||""}
function setStatus(s){syncState=s;const el=$("sync");if(el){el.dataset.s=s;$("syncT").textContent=syncText()}}
const b64e=s=>{const b=new TextEncoder().encode(s);let x="";for(let i=0;i<b.length;i+=0x8000)x+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(x)};
const b64d=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)));
const ghHeaders=(a,raw)=>({Authorization:"Bearer "+a.token,Accept:raw?"application/vnd.github.raw+json":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"});
async function ghGet(a){
  const url=`https://api.github.com/repos/${a.repo}/contents/${DATA_PATH}`;
  const r=await fetch(url,{cache:"no-store",headers:ghHeaders(a)});
  if(!r.ok)return{status:r.status};
  const j=await r.json();let text=j.content?b64d(j.content):"";
  if(!text&&j.size>0){const r2_=await fetch(url,{cache:"no-store",headers:ghHeaders(a,true)});if(!r2_.ok)return{status:r2_.status};text=await r2_.text()}
  return{status:200,sha:j.sha,doc:text?JSON.parse(text):null};
}
const sortObj=o=>Object.keys(o||{}).sort().reduce((r,k)=>(r[k]=o[k],r),{});
const docOf=s=>({schema:2,accounts:sortObj(s.accounts),categories:sortObj(s.categories),tags:sortObj(s.tags),ops:sortObj(s.ops),settings:s.settings||null,
  kopilka:{config:(s.kopilka&&s.kopilka.config)||null,weeks:sortObj(s.kopilka&&s.kopilka.weeks)},rates:sortObj(s.rates),fx:s.fx||null});
function mergeMap(a,b){const out={...(b||{})};for(const[k,v] of Object.entries(a||{})){const o=out[k];if(!o||(v&&(v.updatedAt||""))>(o.updatedAt||""))out[k]=v}return out}
const newer=(a,b)=>!a?b:!b?a:((a.updatedAt||"")>(b.updatedAt||"")?a:b);
function merge(a,b){
  if(!b)return docOf(a);
  const bk=b.kopilka||{};
  return{schema:2,accounts:mergeMap(a.accounts,b.accounts),categories:mergeMap(a.categories,b.categories),tags:mergeMap(a.tags,b.tags),ops:mergeMap(a.ops,b.ops),
    settings:newer(a.settings,b.settings&&{...b.settings,ledgerStart:b.settings.ledgerStart||bk.ledgerStart}),
    kopilka:{config:newer(a.kopilka&&a.kopilka.config,bk.config),weeks:mergeMap(a.kopilka&&a.kopilka.weeks,bk.weeks)},
    rates:{...(b.rates||{}),...(a.rates||{})},fx:(!a.fx?b.fx:!b.fx?a.fx:((a.fx.fetchedAt||0)>=(b.fx.fetchedAt||0)?a.fx:b.fx))};
}
let syncing=false,again=false,timer=null,retry=null;
function scheduleSync(ms){clearTimeout(timer);timer=setTimeout(sync,ms==null?1500:ms)}
async function sync(){
  const a=getAuth();if(!a){setStatus("local");return}
  if(!navigator.onLine){setStatus("offline");return}
  if(syncing){again=true;return}
  syncing=true;setStatus("syncing");clearTimeout(retry);
  try{
    for(let attempt=0;attempt<3;attempt++){
      const g=await ghGet(a);
      if(g.status===401){setStatus("auth");return}
      if(g.status===403){setStatus("norepo");return}
      if(g.status!==200&&g.status!==404)throw new Error("GET "+g.status);
      const remote=g.status===200?g.doc:null;
      const merged=merge(D,remote);
      const before=JSON.stringify(docOf(D));
      Object.assign(D,{accounts:merged.accounts,categories:merged.categories,tags:merged.tags,ops:merged.ops,settings:merged.settings,kopilka:merged.kopilka,rates:merged.rates,fx:merged.fx,loaded:true});persist();
      const out=docOf(D);const outS=JSON.stringify(out);
      if(before!==outS)render();
      if(remote&&JSON.stringify(docOf(remote))===outS){D.dirty=false;break}
      const p=await fetch(`https://api.github.com/repos/${a.repo}/contents/${DATA_PATH}`,{method:"PUT",cache:"no-store",headers:{...ghHeaders(a),"Content-Type":"application/json"},
        body:JSON.stringify({message:"Копилка · "+new Date().toLocaleString("ru-RU"),content:b64e(JSON.stringify({...out,updatedAt:nowIso()})),...(g.sha?{sha:g.sha}:{})})});
      if(p.status===409||(p.status===422&&g.sha))continue;
      if(p.status===401){setStatus("auth");return}
      if(p.status===403||p.status===404){setStatus("norepo");return}
      if(!p.ok)throw new Error("PUT "+p.status);
      D.dirty=false;break;
    }
    D.lastSync=Date.now();persist();setStatus("ok");
  }catch(e){console.error(e);setStatus("error");retry=setTimeout(sync,30000)}
  finally{syncing=false;if(again){again=false;scheduleSync(300)}}
}

/* ================= rates ================= */
async function fetchRates(force){
  if(!navigator.onLine)return;let changedAny=false;
  if(force||Date.now()-(D.ratesFetchedAt||0)>3*3600e3){
    const keys=Object.keys(D.rates||{}).sort();const from=keys.length?iso(parseD(keys[keys.length-1])-7*DAY):iso(todayMs()-120*DAY);
    try{const r=await fetch(`https://api.frankfurter.dev/v1/${from}..?from=EUR&to=JPY`,{cache:"no-store"});
      if(r.ok){const j=await r.json();for(const[d,v] of Object.entries(j.rates||{})){const x=v&&v.JPY;if(typeof x==="number"&&D.rates[d]!==x){D.rates[d]=x;changedAny=true}}D.ratesFetchedAt=Date.now()}}catch(e){}
  }
  const need=accounts().some(a=>a.currency!=="EUR"&&a.currency!=="JPY");
  if(need&&(force||Date.now()-(D.fxFetchedAt||0)>6*3600e3)){
    try{const r=await fetch("https://open.er-api.com/v6/latest/EUR",{cache:"no-store"});
      if(r.ok){const j=await r.json();if(j&&j.rates){const keep={};for(const c of CURRENCIES)if(j.rates[c])keep[c]=j.rates[c];
        const date=j.time_last_update_utc?iso(Date.parse(j.time_last_update_utc)):todayIso();
        if(!D.fx||D.fx.date!==date){D.fx={rates:keep,date,fetchedAt:Date.now()};changedAny=true}D.fxFetchedAt=Date.now()}}}catch(e){}
  }
  persist();if(changedAny){render();if(getAuth())scheduleSync()}
}

/* ================= actions ================= */
document.addEventListener("click",e=>{
  const el=e.target.closest("[data-act]");if(!el||el.closest(".sheet"))return;
  const a=el.dataset.act,v=el.dataset.v,sc=el.dataset.scope;
  const P=sc==="ov"?UI.ov:UI.ops;
  switch(a){
    case "tab":UI.tab=v;UI.budgetOpen=false;window.scrollTo(0,0);render();$("fab").classList.remove("away");break;
    case "sync":if(syncState==="auth"||syncState==="norepo"||syncState==="local")openSettings();else sync();break;
    case "syncsheet":case "settings":openSettings();break;
    case "accpick":openAccPick(sc);break;
    case "hidebal":UI.hideBal=!UI.hideBal;render();break;
    case "ovtype":UI.ov.type=v;UI.ov.open=null;render();break;
    case "pkind":P.period={...P.period,kind:v,anchor:todayIso()};if(v==="custom"&&!P.period.from){P.period.from=iso(todayMs()-30*DAY);P.period.to=todayIso()}render();break;
    case "pshift":P.period=shiftPeriod(P.period,+v);UI.swipeDir=+v;render();break;
    case "budgettoggle":{const box=el.closest(".budget"),more=box&&box.querySelector(".b-more");if(!more)break;
      UI.budgetOpen=!UI.budgetOpen;box.classList.toggle("open",UI.budgetOpen);el.setAttribute("aria-expanded",String(UI.budgetOpen));saveUI();
      UI.budgetOpen?expand(more):collapse(more);break}
    case "ptoday":P.period={...P.period,anchor:todayIso()};render();break;
    case "ringseg":{const row=document.querySelector(`.cat-row[data-v="${CSS.escape(v)}"]`);if(!row)break;
      const sub=row.nextElementSibling;
      if(UI.ov.open!==v){const prev=UI.ov.open&&document.querySelector(`.cat-row[data-v="${CSS.escape(UI.ov.open)}"]`);
        if(prev&&prev.nextElementSibling&&prev.nextElementSibling.classList.contains("cat-sub"))collapse(prev.nextElementSibling);
        UI.ov.open=v;if(sub&&sub.classList.contains("cat-sub"))expand(sub)}
      // scroll once the tags have unfolded, so the page is already long enough to bring the row up
      setTimeout(()=>{const r=row.getBoundingClientRect(),top=scrollY+r.top-window.innerHeight*.28;
        window.scrollTo({top:Math.max(0,top),behavior:reduceMotion()?"auto":"smooth"})},reduceMotion()?0:320);
      if(!reduceMotion())row.animate([{background:"color-mix(in srgb,var(--ai) 22%,transparent)"},{background:"transparent"}],{duration:1100,delay:250,easing:"ease-out"});
      break}
    case "ovopen":{const sub=el.nextElementSibling;if(!sub||!sub.classList.contains("cat-sub"))break;
      const prev=UI.ov.open&&UI.ov.open!==v?document.querySelector(`.cat-row[data-v="${CSS.escape(UI.ov.open)}"]`):null;
      if(prev&&prev.nextElementSibling&&prev.nextElementSibling.classList.contains("cat-sub"))collapse(prev.nextElementSibling);
      if(UI.ov.open===v){UI.ov.open=null;collapse(sub)}else{UI.ov.open=v;expand(sub)}break}
    case "showcatops":UI.ops={...UI.ops,filter:UI.ov.type,period:{...UI.ov.period},accs:UI.ov.accs,cat:v,tag:el.dataset.tag||null,q:""};UI.tab="ops";window.scrollTo(0,0);render();break;
    case "clearcat":UI.ops.cat=null;UI.ops.tag=null;render();break;
    case "opsf":UI.ops.filter=v;render();break;
    case "editop":openOp(v);break;
    case "edittransfer":openTransfer(v);break;
    case "budget":UI.budget=v;render();break;
    case "kweek":openKWeek(v||null);break;
    case "weekops":UI.ops={...UI.ops,filter:"all",period:{kind:"week",anchor:v},accs:null,cat:null,q:""};UI.tab="ops";window.scrollTo(0,0);render();break;
    case "allweeks":UI.showAllWeeks=!UI.showAllWeeks;render();break;
    case "ksettings":if(PRIVATE){toast("Настройки цели сейчас недоступны");break}openKSettings();break;
    case "chmode":UI.ch.mode=v;UI.ch.sel=null;render();break;
    case "chgroup":UI.ch.group=v;UI.ch.sel=null;render();break;
    case "newacc":openAccount(null);break;
    case "editacc":openAccount(v);break;
    case "transfer":openTransfer(null);break;
    case "transfers":UI.ops={...UI.ops,filter:"transfer",cat:null,q:""};UI.tab="ops";window.scrollTo(0,0);render();break;
    case "catlist":openCatList(v);break;
    case "taglist":openTagList();break;
  }
});
document.addEventListener("change",e=>{const s=e.target.closest("[data-pk]");if(!s||s.closest(".sheet"))return;const P=s.dataset.pk==="ov"?UI.ov:UI.ops;
  P.period={...P.period,kind:s.value,anchor:todayIso()};if(s.value==="custom"&&!P.period.from){P.period.from=iso(todayMs()-30*DAY);P.period.to=todayIso()}render()});
$("fab").onclick=()=>UI.tab==="accounts"?openAccount(null):openOp(null);
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&stack.length){closeSheet();return}
  if(!stack.length&&(e.key==="n"||e.key==="т")&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();openOp(null)}
});

/* ================= iOS viewport heal =================
   Home-screen web apps on iOS can keep a shrunken viewport after the keyboard closes,
   leaving a black band under the tab bar. Force WebKit to re-measure when that happens. */
let maxVH=window.innerHeight;
window.addEventListener("resize",()=>{if(window.innerHeight>maxVH)maxVH=window.innerHeight});
function healViewport(){if(window.innerHeight>=maxVH-4)return;const y=window.scrollY,el=$("vh");if(!el)return;
  el.style.display="none";void el.offsetHeight;el.style.display="";const b=document.body;b.style.display="none";void b.offsetHeight;b.style.display="";window.scrollTo(0,y)}
document.addEventListener("focusout",e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))setTimeout(healViewport,160)});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(healViewport,300);
  else if(UI.budgetOpen){UI.budgetOpen=false;if(UI.tab==="overview")render()}});

/* ================= start ================= */
// iOS Safari ignores user-scalable=no, so block its pinch gestures directly
["gesturestart","gesturechange","gestureend"].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
document.addEventListener("touchmove",e=>{if(e.touches&&e.touches.length>1)e.preventDefault()},{passive:false});
render();
if(getAuth())setStatus(navigator.onLine?"ok":"offline");
fetchRates(false);sync();
window.addEventListener("online",()=>{fetchRates(false);sync()});
window.addEventListener("offline",()=>setStatus(getAuth()?"offline":"local"));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){fetchRates(false);sync();if(UI.ov.period.kind!=="custom"&&!stack.length)render()}});
if("serviceWorker" in navigator)window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").then(r=>{if(navigator.onLine)r.update()}).catch(()=>{})});
window.__K={D:()=>D,kopWeeks,kNow,weekLedger,weekBudget,accBalance,totalEUR,opEUR,ledgerStart,merge,docOf,render:()=>render()};
