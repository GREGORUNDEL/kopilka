/* Копилка — Data, money, periods, savings model and weekly budget — no screen code here.
   Plain scripts loaded in order by index.html (core → home → screens → sheets → boot); they share one global scope. */
"use strict";

/* ================= constants ================= */
const DAY=864e5, KEY="finance.v1", AKEY="kopilka.auth", DEFAULT_REPO="GREGORUNDEL/kopilka-data", DATA_PATH="finance.json";
const KDEF={deadline:"2028-03-12",months:24,mine:210000,comfort:180000,SNG:1840000,KAI:2270000,extraEur:3000,tutorEur:1000,holidayEur:2600,window:13,extraPayouts:1,manualRate:null};
/* SNG stays in the model (goal, norm, forecast are still computed); it is only hidden from the screens.
   Set SHOW_SNG=true to show it again everywhere. */
const SHOW_SNG=false;
const SCHOOLS=()=>SHOW_SNG?["SNG","KAI"]:["KAI"];
const CUR_SYM={EUR:"€",UAH:"₴",USD:"$",JPY:"¥",GBP:"£",PLN:"zł",CZK:"Kč",CHF:"Fr"};
const CURRENCIES=["EUR","UAH","USD","JPY","GBP","PLN","CZK","CHF"];
const PALETTE=["#E04B4B","#C8442E","#DE7330","#E8873A","#D9A62E","#C9B21F","#8DB33A","#6FA84E",
  "#4CAF50","#2E8B57","#3FA58F","#2A9DA0","#3BA4C9","#4F86D6","#3F6FC6","#2E4374",
  "#5A6BD8","#5A3F9E","#7E57C2","#9A78D0","#B05FC0","#D0609A","#D63C8F","#E26A8D",
  "#A0522D","#8D6E63","#B08D57","#6D7B5A","#55555A","#3A3A3C","#8E8E93","#607D8B"];
const ICONS=window.ICONS||{}, ICON_SECTIONS=window.ICON_SECTIONS||{};
const UI_ICONS={
  plus:'<path d="M12 5v14M5 12h14"/>',
  eye:'<path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0-4 0"/><path d="M21 12c-2.4 4-5.4 6-9 6c-3.6 0-6.6-2-9-6c2.4-4 5.4-6 9-6c3.6 0 6.6 2 9 6"/>',
  eyeOff:'<path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M16.7 16.7A8.7 8.7 0 0 1 12 18c-3.6 0-6.6-2-9-6c1.3-2.1 2.7-3.7 4.3-4.7m2.9-1.1A9 9 0 0 1 12 6c3.6 0 6.6 2 9 6c-.7 1.1-1.4 2.1-2.1 2.9"/><path d="M3 3l18 18"/>',
  gear:'<path d="M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.3 2.4a1.7 1.7 0 0 0 1.1 2.5c1.8.4 1.8 3 0 3.4a1.7 1.7 0 0 0-1.1 2.6c.9 1.5-.8 3.3-2.4 2.3a1.7 1.7 0 0 0-2.5 1.1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 0 0-2.6-1.1c-1.5.9-3.3-.8-2.3-2.4a1.7 1.7 0 0 0-1.1-2.5c-1.8-.4-1.8-3 0-3.4a1.7 1.7 0 0 0 1.1-2.6c-.9-1.5.8-3.3 2.4-2.3a1.7 1.7 0 0 0 2.5-1.1z"/><circle cx="12" cy="12" r="3"/>',
  chevL:'<path d="M15 6l-6 6 6 6"/>', chevR:'<path d="M9 6l6 6-6 6"/>', chevD:'<path d="M6 9l6 6 6-6"/>',
  home:'<path d="M5 12H3l9-9 9 9h-2"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M9 21v-6h6v6"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01"/>',
  donut:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 3.5v4.5M20.2 9.5l-4.4 1.4"/>',
  chart:'<path d="M3 3v18h18"/><path d="M7 15v2M11 11v6M15 7v10M19 13v4"/>',
  wallet:'<path d="M17 8V5a1 1 0 0 0-1-1H6a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V6"/><path d="M20 12v4h-4a2 2 0 0 1 0-4h4"/>',
  swap:'<path d="M7 10h14l-4-4M17 14H3l4 4"/>', calendar:'<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M16 3v4M8 3v4M4 11h16"/>', history:'<path d="M12 8v4l2 2"/><path d="M3.05 11a9 9 0 1 1 .5 4M3 20v-5h5"/>',
  search:'<circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/>', check:'<path d="M5 12l5 5L20 7"/>',
  kbd:'<path d="M6 9l6 6 6-6"/>', back:'<path d="M20 6H9l-6 6 6 6h11a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z"/><path d="M12 10l4 4M16 10l-4 4"/>',
  adjust:'<path d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4"/><path d="M13.5 6.5l4 4"/>', tag:'<path d="M7.5 7.5h.01"/><path d="M3 6v5.2a2 2 0 0 0 .6 1.4l8.8 8.8a2 2 0 0 0 2.8 0l5.2-5.2a2 2 0 0 0 0-2.8L11.6 4.6A2 2 0 0 0 10.2 4H5a2 2 0 0 0-2 2z"/>',
  cats:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'
};
const svgI=(name,cls)=>`<svg class="i ${cls||""}" viewBox="0 0 24 24" aria-hidden="true">${UI_ICONS[name]||ICONS[name]||ICONS["help-circle"]||""}</svg>`;
const icon=(name)=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||ICONS["help-circle"]||""}</svg>`;

/* ================= utils ================= */
const $=id=>document.getElementById(id);
const nf0=new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0});
const nf1=new Intl.NumberFormat("ru-RU",{minimumFractionDigits:1,maximumFractionDigits:1});
const nf2=new Intl.NumberFormat("ru-RU",{minimumFractionDigits:2,maximumFractionDigits:2});
const nf2v=new Intl.NumberFormat("ru-RU",{minimumFractionDigits:0,maximumFractionDigits:2});
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eur=v=>nf0.format(Math.round(v));
const signed=v=>(v>=0?"+":"−")+nf0.format(Math.abs(Math.round(v)));
const sym=c=>CUR_SYM[c]||c;
const money=(v,c)=>nf2.format(v)+" "+sym(c||"EUR");
const moneyS=(v,c)=>(v<0?"−":"")+nf2.format(Math.abs(v))+" "+sym(c||"EUR");
const parseD=s=>{const[y,m,d]=s.split("-").map(Number);return Date.UTC(y,m-1,d)};
const iso=t=>new Date(t).toISOString().slice(0,10);
const todayIso=()=>{const n=new Date();return iso(Date.UTC(n.getFullYear(),n.getMonth(),n.getDate()))};
const todayMs=()=>parseD(todayIso());
const dm=t=>{const d=new Date(t);return String(d.getUTCDate()).padStart(2,"0")+"."+String(d.getUTCMonth()+1).padStart(2,"0")};
const dmy=t=>dm(t)+"."+String(new Date(t).getUTCFullYear()).slice(2);
const mondayOf=t=>{const wd=(new Date(t).getUTCDay()+6)%7;return t-wd*DAY};
const MONTHS=["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
const MONTHS_G=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const MONTHS_S=["янв.","февр.","март","апр.","май","июнь","июль","авг.","сент.","окт.","нояб.","дек."];
const WD=["вс","пн","вт","ср","чт","пт","сб"];
const longDay=t=>{const d=new Date(t);return d.getUTCDate()+" "+MONTHS_G[d.getUTCMonth()]+" "+d.getUTCFullYear()+" ("+WD[d.getUTCDay()]+")"};
const WDL=["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
const dayLabel=t=>{const td=todayMs(),d=new Date(t),base=d.getUTCDate()+" "+MONTHS_G[d.getUTCMonth()]+(d.getUTCFullYear()!==new Date(td).getUTCFullYear()?" "+d.getUTCFullYear():"");
  return t===td?"Сегодня, "+base:t===td-DAY?"Вчера, "+base:WDL[d.getUTCDay()][0].toUpperCase()+WDL[d.getUTCDay()].slice(1)+", "+base};
const num=s=>{if(s==null)return NaN;s=String(s).replace(/\s| /g,"").replace(",",".").replace("−","-");return s===""?NaN:Number(s)};
const r2=x=>Math.round(x*100)/100;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const nowIso=()=>new Date().toISOString();
const hhmm=t=>{const d=new Date(t);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}

/* ================= store ================= */
function blank(){return{accounts:{},categories:{},tags:{},ops:{},settings:null,kopilka:{config:null,weeks:{}},rates:{},fx:null,
  ratesFetchedAt:0,fxFetchedAt:0,lastSync:0,dirty:false,loaded:false}}
function load(){try{const s=JSON.parse(lsGet(KEY));if(s&&typeof s.ops==="object")return Object.assign(blank(),s)}catch(e){}return blank()}
let D=load();
function persist(){try{localStorage.setItem(KEY,JSON.stringify(D))}catch(e){toast("Не удалось сохранить на устройстве: память браузера недоступна.")}}
function getAuth(){try{const a=JSON.parse(lsGet(AKEY));if(a&&a.token)return a}catch(e){}return null}
function setAuth(a){lsSet(AKEY,a?JSON.stringify(a):null)}
const live=o=>Object.values(o||{}).filter(x=>x&&!x.deleted);
const byOrder=(a,b)=>(a.order??999)-(b.order??999)||String(a.name).localeCompare(String(b.name),"ru");
const accounts=()=>live(D.accounts).sort(byOrder);
const account=id=>D.accounts[id];
const categories=type=>live(D.categories).filter(c=>!type||c.type===type).sort(byOrder);
const category=id=>D.categories[id];
const tagsList=()=>live(D.tags).sort(byOrder);
const opsList=()=>live(D.ops).filter(o=>typeof o.date==="string"&&typeof o.amount==="number");
const settings=()=>({defaultAccount:null,fxManual:{},ledgerStart:null,...(D.settings||{})});
const kcfg=()=>({...KDEF,...(D.kopilka&&D.kopilka.config||{})});
const ledgerStart=()=>settings().ledgerStart||(D.kopilka&&D.kopilka.ledgerStart)||"2026-10-26";
function put(coll,obj){obj.updatedAt=nowIso();D[coll][obj.id]=obj}
function changed(){D.dirty=true;persist();render();if(getAuth())navigator.onLine?scheduleSync():setStatus("offline")}

/* ================= money / fx ================= */
function latestJPY(){const keys=Object.keys(D.rates||{}).sort();return keys.length?{date:keys[keys.length-1],rate:D.rates[keys[keys.length-1]]}:null}
function fxRate(cur){ // units of cur per 1 EUR
  if(!cur||cur==="EUR")return 1;
  const man=settings().fxManual||{};if(man[cur]>0)return man[cur];
  if(cur==="JPY"){const j=latestJPY();if(j)return j.rate}
  const f=D.fx&&D.fx.rates&&D.fx.rates[cur];return f>0?f:null;
}
const accCur=id=>(account(id)&&account(id).currency)||"EUR";
function toEUR(v,cur){const r=fxRate(cur);return r?v/r:0}
function opDelta(op,accId){ // signed change of account balance by op
  switch(op.type){
    case "expense":return op.accountId===accId?-op.amount:0;
    case "income":return op.accountId===accId?op.amount:0;
    case "transfer":return (op.accountId===accId?-op.amount:0)+(op.toAccountId===accId?(op.toAmount!=null?op.toAmount:op.amount):0);
    case "correction":return op.accountId===accId?op.amount:0;
  }return 0;
}
function accBalance(id,uptoMs){const a=account(id);if(!a)return 0;let b=a.opening||0;
  for(const o of opsList()){if(uptoMs!=null&&parseD(o.date)>uptoMs)continue;b+=opDelta(o,id)}return b}
function totalEUR(accIds,uptoMs){let s=0;for(const a of accounts()){if(accIds?!accIds.includes(a.id):a.exclude)continue;s+=toEUR(accBalance(a.id,uptoMs),a.currency)}return s}
const opEUR=o=>typeof o.eur==="number"?o.eur:toEUR(o.amount,accCur(o.accountId));

/* ================= periods ================= */
function periodRange(p){
  const a=parseD(p.anchor||todayIso());const d=new Date(a);
  if(p.kind==="day")return{start:a,end:a+DAY,label:longDay(a).replace(/ \d{4} /," ")};
  if(p.kind==="week"){const s=mondayOf(a);return{start:s,end:s+7*DAY,label:dm(s)+" – "+dmy(s+6*DAY)}}
  if(p.kind==="month"){const s=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1),e=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1);return{start:s,end:e,label:MONTHS[d.getUTCMonth()][0].toUpperCase()+MONTHS[d.getUTCMonth()].slice(1)+" "+d.getUTCFullYear()}}
  if(p.kind==="year"){const s=Date.UTC(d.getUTCFullYear(),0,1);return{start:s,end:Date.UTC(d.getUTCFullYear()+1,0,1),label:String(d.getUTCFullYear())}}
  const f=parseD(p.from||todayIso()),t=parseD(p.to||todayIso());return{start:Math.min(f,t),end:Math.max(f,t)+DAY,label:dmy(Math.min(f,t))+" – "+dmy(Math.max(f,t))};
}
function shiftPeriod(p,dir){const a=parseD(p.anchor||todayIso()),d=new Date(a);let n=a;
  if(p.kind==="day")n=a+dir*DAY;else if(p.kind==="week")n=a+dir*7*DAY;
  else if(p.kind==="month")n=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+dir,1);
  else if(p.kind==="year")n=Date.UTC(d.getUTCFullYear()+dir,0,1);
  return{...p,anchor:iso(n)};
}
const inRange=(o,r)=>{const t=parseD(o.date);return t>=r.start&&t<r.end};
function accFilterMatch(o,sel){if(!sel||!sel.length)return true;return sel.includes(o.accountId)||(o.type==="transfer"&&sel.includes(o.toAccountId))}

/* ================= UI state ================= */
function loadUI(){try{const u=JSON.parse(lsGet("finance.ui"));if(u)return u}catch(e){}return{}}
const UI=Object.assign({tab:"overview",budget:"mine",
  ov:{type:"expense",period:{kind:"week",anchor:todayIso()},accs:null,open:null},
  ops:{filter:"all",period:{kind:"week",anchor:todayIso()},accs:null,q:"",cat:null},
  ch:{mode:"total",group:"week",accs:null,sel:null},showAllWeeks:false},loadUI());
UI.ov.period.anchor=todayIso();UI.ops.period.anchor=todayIso();UI.ops.cat=null;UI.ops.tag=null;UI.ops.q="";UI.ov.open=null;UI.ch.sel=null;
/* Every launch starts from the same view: Home tab, current week, all accounts, all categories (expenses on Home), income and expenses together on the chart. Budget, the bars/ring view and the hidden-balance switch stay remembered. */
UI.ov.period={kind:"week",anchor:todayIso()};UI.ov.accs=null;UI.ov.type="expense";
UI.ops.period={kind:"week",anchor:todayIso()};UI.ops.accs=null;UI.ops.filter="all";
UI.ch.mode="total";UI.ch.group="week";UI.ch.accs=null;
UI.tab="overview"; /* the app always opens on Home */
UI.budgetOpen=false; /* the week card always starts folded */
/* Everything opened "for a moment" closes when you switch tabs or leave the app: the week card, an unfolded
   category on Home, and the category/tag filter Operations got from Home (it goes back to all operations,
   with the filters it had before). Returns true if something was open. */
function resetTransient(){let ch=false;
  if(UI.budgetOpen){UI.budgetOpen=false;ch=true}
  if(UI.ov.open){UI.ov.open=null;ch=true}
  if(UI.avgScale&&UI.avgScale!=="month"){UI.avgScale="month";ch=true}
  if(UI.planScale&&UI.planScale!=="week"){UI.planScale="week";ch=true}
  if(UI.opsPrev){UI.ops={...UI.opsPrev,q:""};UI.opsPrev=null;ch=true}
  else if(UI.ops.cat||UI.ops.tag){UI.ops.cat=null;UI.ops.tag=null;ch=true}
  return ch}
function saveUI(){lsSet("finance.ui",JSON.stringify({tab:UI.tab,hideBal:!!UI.hideBal,budget:UI.budget,ov:{type:UI.ov.type,period:{kind:UI.ov.period.kind,from:UI.ov.period.from,to:UI.ov.period.to},accs:UI.ov.accs},
  ops:{filter:UI.ops.filter,period:{kind:UI.ops.period.kind,from:UI.ops.period.from,to:UI.ops.period.to},accs:UI.ops.accs},ch:{mode:UI.ch.mode,group:UI.ch.group,accs:UI.ch.accs}}))}

/* ================= kopilka model ================= */
const reg=w=>w.saved+(w.oneoff||0)-(w.income||0);
const hasX=w=>(w.oneoff||0)>0||(w.income||0)>0;
function weekLedger(mondayMs,accIds){
  const end=mondayMs+7*DAY;let inc=0,exp=0,ox=0,oi=0,n=0;const notes=[];
  for(const o of opsList()){const t=parseD(o.date);if(t<mondayMs||t>=end)continue;
    if(accIds&&accIds.length&&!accIds.includes(o.accountId))continue;
    if(o.type!=="expense"&&o.type!=="income")continue;
    const acc=account(o.accountId);if(!acc||acc.exclude)continue;
    const v=opEUR(o);n++;
    if(o.type==="income"){inc+=v;if(o.oneoff)oi+=v}else{exp+=v;if(o.oneoff)ox+=v}
    if(o.oneoff){const nm=o.comment||(category(o.categoryId)||{}).name;if(nm&&!notes.includes(nm))notes.push(nm)}}
  return{inc,exp,saved:inc-exp,oneoff:ox,income:oi,n,note:notes.join(", ")};
}
/* every week from settings.ledgerStart up to the current one, computed from operations */
function kopWeeks(){
  const ls=ledgerStart();const out=[];
  const curMon=mondayOf(todayMs());
  for(let m=mondayOf(parseD(ls));m<=curMon;m+=7*DAY){const L=weekLedger(m);
    out.push({monday:iso(m),saved:r2(L.saved),oneoff:r2(L.oneoff),income:r2(L.income),balance:r2(totalEUR(null,m+6*DAY)),computed:true,inc:L.inc,exp:L.exp,n:L.n,...(L.note?{note:L.note}:{})})}
  return out;
}
function rateAt(dateIso){const keys=Object.keys(D.rates||{}).sort();let best=null;for(const k of keys){if(k<=dateIso)best=k;else break}if(!best&&keys.length)best=keys[0];return best?{date:best,rate:D.rates[best]}:null}
function jpyRate(){const c=kcfg();if(typeof c.manualRate==="number"&&c.manualRate>0)return{rate:c.manualRate,date:null,manual:true};const r=rateAt(todayIso());return r?{...r,manual:false}:null}
const goal=(budgetYen,schoolYen,rate,c)=>(budgetYen*c.months+schoolYen)/rate+c.extraEur+(c.tutorEur||0); // tutorEur: private teacher, same for every goal
/* Savings model. Only finished weeks drive the plan, so nothing jumps around during the week:
   - pace  = average saved per finished week, one-offs set apart (last c.window weeks);
   - base  = savings at the end of the last finished week; the current week starts from it;
   - left  = weeks from the start of the current week to the deadline, plus the extra payouts;
   - need  = (goal − base) / left — the weekly norm, fixed for the whole current week;
   - fc    = base + pace × left − goal (what you'd have on the deadline at this pace, without new one-offs).
   bal (shown as «накоплено» and the progress bar) is the live balance, current week included. */
function kMetrics(ws,rate,c){
  if(!ws.length||!rate)return null;
  const curMon=iso(mondayOf(todayMs()));
  let done=ws.filter(w=>w.monday<curMon);if(!done.length)done=ws.slice(0,1);
  const lastDone=done[done.length-1],cur=ws.find(w=>w.monday===curMon);
  const base=typeof lastDone.balance==="number"?lastDone.balance:0;
  const bal=cur&&typeof cur.balance==="number"?cur.balance:base;
  const refMon=parseD(lastDone.monday)+7*DAY;
  const left=Math.max(0,Math.round((parseD(c.deadline)+DAY-refMon)/(7*DAY)))+c.extraPayouts;
  const win=Math.min(c.window,done.length),recent=done.slice(-win);
  const pace=recent.reduce((a,w)=>a+reg(w),0)/win,all=done.reduce((a,w)=>a+reg(w),0)/done.length;
  const netPace=recent.reduce((a,w)=>a+w.saved,0)/win,oneoffs=ws.reduce((a,w)=>a+(w.oneoff||0),0);
  const out={bal,base,left,pace,all,netPace,oneoffs,win,n:done.length,lastMonday:lastDone.monday,budgets:{}};
  for(const b of ["mine","comfort"]){out.budgets[b]={};for(const s of ["SNG","KAI"]){const g=goal(c[b],c[s],rate,c);
    out.budgets[b][s]={goal:g,progress:bal/g,need:left?(g-base)/left:0,fc:base+pace*left-g,fcH:base+pace*left+c.holidayEur-g}}}
  return out;
}
/* the yen rate for the plan is the one of last Sunday, so goals and the weekly norm change once a week, like everything else */
function planRate(){const c=kcfg();if(typeof c.manualRate==="number"&&c.manualRate>0)return{rate:c.manualRate,date:null,manual:true};const r=rateAt(iso(mondayOf(todayMs())-DAY));return r?{...r,manual:false}:null}
function kNow(){const ws=kopWeeks(),r=planRate();return{ws,r,m:r?kMetrics(ws,r.rate,kcfg()):null}}
function weekStatus(mondayIso){
  const K=kNow();if(!K.m)return null;
  const need=K.m.budgets[UI.budget].KAI.need;const w=K.ws.find(x=>x.monday===mondayIso);
  return{need,w,K};
}

/* ================= weekly budget ================= */
// Kind of an expense for the weekly budget: "monthly" bill (rent, NS, subscriptions), "daily" essential (food), "free", or "oneoff".
function opKind(o){
  if(o.type!=="expense")return null;if(o.oneoff)return "oneoff";
  let k=null;const c=category(o.categoryId);
  for(const t of o.tagIds||[]){const f=(D.tags[t]||{}).fixed;if(f==="monthly")return "monthly";if(f==="daily")k="daily"}
  if(c&&c.fixed==="monthly")return "monthly";if(c&&c.fixed==="daily")k=k||"daily";
  return k||"free";
}
/* Monthly bills (rent, NS, subscriptions — anything opKind calls "monthly") are paid once a month on their own
   day, so spreading them over a window of days or weeks miscounts them (a window of 2.3 months may hold two rents
   or three NS payments). Instead each bill is a series (see billKey) and a
   series costs its average payment per month. Series with no payment in the last 45 days of the window are
   considered stopped. Returns € per month, in total and by category. */
const MONTH_DAYS=30.4375,BILL_ACTIVE_DAYS=45;
// series key: the monthly-marked tag (Аренда, NS), else any tag (Claude, Связь…), else category + comment.
// A bill that isn't paid every calendar month carries billDays on its tag or category (Kyivstar: every 28 days).
function billSeries(o){const tgs=(o.tagIds||[]).map(t=>D.tags[t]).filter(Boolean);const m=tgs.find(t=>t.fixed==="monthly")||tgs[0];const c=category(o.categoryId);
  return{key:m?"t:"+m.name:"c:"+(o.categoryId||"_")+":"+(o.comment||""),days:(m&&m.billDays>0?m.billDays:0)||(!m&&c&&c.billDays>0?c.billDays:0)||MONTH_DAYS}}
function monthlyBills(start,end){
  const S={};
  for(const o of opsList()){if(o.type!=="expense"||opKind(o)!=="monthly"||(account(o.accountId)||{}).exclude)continue;const t=parseD(o.date);if(t<start||t>=end)continue;
    const b=billSeries(o),s=S[b.key]=S[b.key]||{sum:0,n:0,last:0,days:b.days,cat:o.categoryId||"_"};s.sum+=opEUR(o);s.n++;if(t>s.last)s.last=t}
  let total=0;const byCat={};
  for(const s of Object.values(S)){if(s.last<end-Math.max(BILL_ACTIVE_DAYS,s.days*1.5)*DAY)continue;const m=s.sum/s.n*MONTH_DAYS/s.days;total+=m;byCat[s.cat]=(byCat[s.cat]||0)+m}
  return{total,byCat};
}
function weekBudget(){
  const today=todayMs(),mon=mondayOf(today),end=mon+7*DAY;
  const ops=opsList().filter(o=>(o.type==="income"||o.type==="expense")&&!(account(o.accountId)||{}).exclude);
  const first=ops.reduce((m,o)=>o.date<m?o.date:m,"9999");if(first==="9999")return null;
  const f=parseD(first);let hs=mondayOf(f);if(f>hs)hs+=7*DAY;hs=Math.max(hs,mon-13*7*DAY);
  const weeks=Math.max(0,Math.round((mon-hs)/(7*DAY)));
  let hInc=0;const cur={inc:0,incOne:0,daily:0,free:0,monthly:0,oneoff:0,bills:[],ones:[]};
  for(const o of ops){const t=parseD(o.date),v=opEUR(o);
    if(t>=hs&&t<mon){if(o.type==="income"&&!o.oneoff)hInc+=v}
    else if(t>=mon&&t<end){
      if(o.type==="income"){if(o.oneoff)cur.incOne+=v;else cur.inc+=v;continue}
      const k=opKind(o);cur[k]+=v;
      const nm=o.comment||(o.tagIds||[]).map(x=>(D.tags[x]||{}).name).filter(Boolean)[0]||(category(o.categoryId)||{}).name||"";
      if(k==="monthly"&&nm&&!cur.bills.includes(nm))cur.bills.push(nm);if(k==="oneoff"&&nm&&!cur.ones.includes(nm))cur.ones.push(nm)}}
  const avgInc=weeks?hInc/weeks:cur.inc,billShare=weeks?monthlyBills(hs,mon).total*12/52:cur.monthly;
  const arrived=cur.inc>=avgInc*.5&&cur.inc>0,expInc=arrived?cur.inc:avgInc;
  const K=kNow(),need=K.m?K.m.budgets[UI.budget].KAI.need:0;
  const life=expInc-need-billShare,spent=cur.daily+cur.free;
  return{mon,end,daysLeft:Math.max(1,Math.round((end-today)/DAY)),weeks,avgInc,billShare,arrived,expInc,need,life,spent,left:life-spent,cur,K};
}
