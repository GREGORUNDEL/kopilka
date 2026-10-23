/* Копилка — учёт расходов и доходов с накоплениями на Японию.
   Данные: локально (localStorage) + синхронизация с приватным репозиторием GitHub (finance.json). */
(function(){
"use strict";

/* ================= constants ================= */
const DAY=864e5, KEY="finance.v1", AKEY="kopilka.auth", DEFAULT_REPO="GREGORUNDEL/kopilka-data", DATA_PATH="finance.json";
const KDEF={deadline:"2028-03-12",months:24,mine:210000,comfort:180000,SNG:1840000,KAI:2270000,extraEur:3000,holidayEur:2600,window:13,extraPayouts:1,manualRate:null};
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
function saveUI(){lsSet("finance.ui",JSON.stringify({tab:UI.tab,hideBal:!!UI.hideBal,budget:UI.budget,ov:{type:UI.ov.type,view:UI.ov.view,period:{kind:UI.ov.period.kind,from:UI.ov.period.from,to:UI.ov.period.to},accs:UI.ov.accs},
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
function kopWeeks(){
  const ls=ledgerStart();const out=[];
  for(const w of live(D.kopilka&&D.kopilka.weeks||{})){if(typeof w.monday!=="string"||typeof w.saved!=="number")continue;if(w.monday>=ls)continue;out.push({...w,legacy:true})}
  out.sort((a,b)=>a.monday<b.monday?-1:1);
  // fill legacy balances
  for(let i=out.length-1;i>=0;i--){if(typeof out[i].balance==="number")continue;if(i<out.length-1&&typeof out[i+1].balance==="number")out[i].balance=out[i+1].balance-out[i+1].saved}
  for(let i=0;i<out.length;i++){if(typeof out[i].balance!=="number"&&i>0&&typeof out[i-1].balance==="number")out[i].balance=out[i-1].balance+out[i].saved}
  const curMon=mondayOf(todayMs());
  for(let m=mondayOf(parseD(ls));m<=curMon;m+=7*DAY){const L=weekLedger(m);
    out.push({monday:iso(m),saved:r2(L.saved),oneoff:r2(L.oneoff),income:r2(L.income),balance:r2(totalEUR(null,m+6*DAY)),computed:true,inc:L.inc,exp:L.exp,n:L.n,...(L.note?{note:L.note}:{})})}
  return out;
}
function rateAt(dateIso){const keys=Object.keys(D.rates||{}).sort();let best=null;for(const k of keys){if(k<=dateIso)best=k;else break}if(!best&&keys.length)best=keys[0];return best?{date:best,rate:D.rates[best]}:null}
function jpyRate(){const c=kcfg();if(typeof c.manualRate==="number"&&c.manualRate>0)return{rate:c.manualRate,date:null,manual:true};const r=rateAt(todayIso());return r?{...r,manual:false}:null}
const goal=(budgetYen,schoolYen,rate,c)=>(budgetYen*c.months+schoolYen)/rate+c.extraEur;
function kMetrics(ws,rate,c){
  if(!ws.length||!rate)return null;
  const last=ws[ws.length-1],lastSun=parseD(last.monday)+6*DAY;
  const left=Math.max(0,Math.round((parseD(c.deadline)-lastSun)/(7*DAY)))+c.extraPayouts;
  const win=Math.min(c.window,ws.length),recent=ws.slice(-win);
  const pace=recent.reduce((a,w)=>a+reg(w),0)/win,all=ws.reduce((a,w)=>a+reg(w),0)/ws.length;
  const netPace=recent.reduce((a,w)=>a+w.saved,0)/win,oneoffs=ws.reduce((a,w)=>a+(w.oneoff||0),0);
  const bal=typeof last.balance==="number"?last.balance:0;
  const out={bal,left,pace,all,netPace,oneoffs,win,n:ws.length,lastMonday:last.monday,budgets:{}};
  for(const b of ["mine","comfort"]){out.budgets[b]={};for(const s of ["SNG","KAI"]){const g=goal(c[b],c[s],rate,c);
    out.budgets[b][s]={goal:g,progress:bal/g,need:left?(g-bal)/left:0,fc:bal+pace*left-g,fcH:bal+pace*left+c.holidayEur-g}}}
  return out;
}
function kNow(){const ws=kopWeeks(),r=jpyRate();return{ws,r,m:r?kMetrics(ws,r.rate,kcfg()):null}}
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
function weekBudget(){
  const today=todayMs(),mon=mondayOf(today),end=mon+7*DAY;
  const ops=opsList().filter(o=>(o.type==="income"||o.type==="expense")&&!(account(o.accountId)||{}).exclude);
  const first=ops.reduce((m,o)=>o.date<m?o.date:m,"9999");if(first==="9999")return null;
  const f=parseD(first);let hs=mondayOf(f);if(f>hs)hs+=7*DAY;hs=Math.max(hs,mon-13*7*DAY);
  const weeks=Math.max(0,Math.round((mon-hs)/(7*DAY)));
  let hInc=0,hBills=0;const cur={inc:0,incOne:0,daily:0,free:0,monthly:0,oneoff:0,bills:[],ones:[]};
  for(const o of ops){const t=parseD(o.date),v=opEUR(o);
    if(t>=hs&&t<mon){if(o.type==="income"&&!o.oneoff)hInc+=v;else if(opKind(o)==="monthly")hBills+=v}
    else if(t>=mon&&t<end){
      if(o.type==="income"){if(o.oneoff)cur.incOne+=v;else cur.inc+=v;continue}
      const k=opKind(o);cur[k]+=v;
      const nm=o.comment||(o.tagIds||[]).map(x=>(D.tags[x]||{}).name).filter(Boolean)[0]||(category(o.categoryId)||{}).name||"";
      if(k==="monthly"&&nm&&!cur.bills.includes(nm))cur.bills.push(nm);if(k==="oneoff"&&nm&&!cur.ones.includes(nm))cur.ones.push(nm)}}
  const avgInc=weeks?hInc/weeks:cur.inc,billShare=weeks?hBills/weeks:cur.monthly;
  const arrived=cur.inc>=avgInc*.5&&cur.inc>0,expInc=arrived?cur.inc:avgInc;
  const K=kNow(),need=K.m?K.m.budgets[UI.budget].KAI.need:0;
  const life=expInc-need-billShare,spent=cur.daily+cur.free;
  return{mon,end,daysLeft:Math.max(1,Math.round((end-today)/DAY)),weeks,avgInc,billShare,arrived,expInc,need,life,spent,left:life-spent,cur,K};
}

/* ================= render: frame ================= */
const TABS=[["overview","Главная","home"],["ops","Операции","list"],["kopilka","Япония","kanji"],["accounts","Счета","wallet"]];
function renderTabs(){
  $("tabs").innerHTML=TABS.map(([id,label,ic])=>`<button class="tab" data-act="tab" data-v="${id}" ${UI.tab===id?'aria-current="page"':""}>${ic==="kanji"?'<span class="kanji">貯</span>':svgI(ic)}<span>${label}</span></button>`).join("");
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
  bindAfter();M.lastTab=UI.tab;M.expand=null;
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
  const bars=S.view==="bars";
  h+=`<section class="card ov-stats" id="ovStats"><div class="ov-top"><div class="seg" role="group" aria-label="Тип"><button data-act="ovtype" data-v="expense" aria-pressed="${type==="expense"}">Расходы</button><button data-act="ovtype" data-v="income" aria-pressed="${type==="income"}">Доходы</button></div>
    <button class="icon-btn view-btn" data-act="ovview" aria-label="${bars?"Показать кольцо":"Показать динамику по периодам"}" title="${bars?"Кольцо":"Динамика"}">${svgI(bars?"donut":"chart")}</button></div>${periodControls("ov",p)}`;
  // donut
  const segs=rows.map(x=>({v:x.v,color:x.c.color}));
  if(bars)h+=`<div class="ov-sum"><b class="num">${nf2.format(sum)} €</b> ${type==="expense"?"расходы":"доходы"} · ${ops.length} опер.</div><div class="chart hs" id="ovChart"></div><div class="legend" id="ovLegend"></div></section>`;
  else h+=`<div class="donut-wrap">${donut(segs,enter)}<div class="donut-c"><b class="num"><span data-roll="ring:${esc(rk)}" data-v="${sum.toFixed(2)}" data-fmt="nf2">${nf2.format(sum)}</span> €</b><span>${type==="expense"?"расходы":"доходы"} · ${ops.length} опер.</span></div></div></section>`;
  h+=budgetCard();
  h+=`</div><div class="ov-col">`;
  if(rows.length){
    h+=`<div class="list" id="ovCats">`+rows.map(x=>{
      const pct=sum?x.v/sum*100:0,open=S.open===x.id;
      const plan=x.c.plan>0&&p.kind==="month"?` · план ${eur(x.c.plan)} €`:"";
      let sub="";
      if(open){const tg=Object.entries(x.tags).sort((a,b)=>b[1]-a[1]);
        sub=`<div class="cat-sub">${tg.map(([t,v])=>`<button class="ctag" data-act="showcatops" data-v="${esc(x.id)}" data-tag="${esc(t)}"><span>${t==="_none"?"без тега":esc((D.tags[t]||{}).name||"тег")}</span><span class="num">${nf2.format(v)} €</span>${svgI("chevR")}</button>`).join("")}</div>`}
      return `<button class="row cat-row" data-act="ovopen" data-v="${esc(x.id)}">${catIc(x.c)}<div class="mid"><div class="t">${esc(x.c.name)}</div><div class="s">${x.n} опер.${plan}</div>
        <div class="bar"><i data-bar="cat:${esc(x.id)}" style="width:${(x.v/max*100).toFixed(1)}%;background:${esc(x.c.color)}"></i></div></div>
        <span class="pct num">${nf0.format(pct)}%</span><span class="amt num">${nf2.format(x.v)} €</span></button>${sub}`}).join("")+`</div>`;
  }else h+=`<div class="card empty"><b>Нет ${type==="expense"?"расходов":"доходов"} за период</b>Нажми «+», чтобы добавить.</div>`;
  h+=`</div></div></main>`;
  after(()=>{bindCustomRange("ov");bindSwipe($("ovStats"),"ov");slideIn("#ovStats .donut-wrap,#ovCats");motionHome(enter);
    if(bars){const g=p.kind==="custom"?"week":p.kind,bs=chartData(g,type,sel),a=periodRange(p).start,idx=bs.findIndex(b=>a>=b.start&&a<b.end);
      drawChart(bs,{mode:type,group:g,sel:idx<0?null:idx},{box:$("ovChart"),legend:$("ovLegend"),first:true,focusSel:true,onPick:i=>{UI.ov.period={...UI.ov.period,kind:g,anchor:iso(bs[i].start)};render()}})}});
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
    <div class="rows" ${open?"":"hidden"}>`;
  h+=row(B.arrived?"Доход за неделю":"Доход, ожидается",(B.arrived?"+":"≈ +")+eur(B.expInc),"pos-t",B.arrived?"":`зарплаты ещё нет · обычно ${eur(B.avgInc)} €`);
  if(B.need)h+=row("Отложить по норме KAI","−"+eur(B.need));
  h+=row("Счета месяца, в среднем","−"+eur(B.billShare),"",c.monthly>0?`на этой неделе оплачено ${eur(c.monthly)} €`+(c.bills.length?`: ${esc(c.bills.slice(0,3).join(", "))}`:""):"аренда, NS, подписки");
  h+=row("<b>На жизнь</b>",eur(B.life)+" €");
  h+=row(`<i class="dot d"></i>Еда и обязательное`,"−"+eur(c.daily));
  h+=row(`<i class="dot f"></i>Остальное`,"−"+eur(c.free));
  h+=`</div>`;
  const savedNow=c.inc+c.incOne-c.daily-c.free-c.monthly-c.oneoff;
  if(open)h+=`<button class="b-foot" data-act="tab" data-v="kopilka"><span>Отложено за неделю <b class="num ${savedNow>=0?"":"neg-t"}">${signed(savedNow)} €</b>${c.oneoff>0?`<small>с учётом разовых −${eur(c.oneoff)} €${c.ones.length?": "+esc(c.ones.slice(0,2).join(", ")):""}</small>`:""}</span>${svgI("chevR")}</button>`;
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
  const R=50,W=18,C=2*Math.PI*R,total=segs.reduce((a,s)=>a+s.v,0),ro=R+W/2,ri=R-W/2,GAP=2.2,RND=5;
  const pt=(r,a)=>`${(60+r*Math.sin(a)).toFixed(3)} ${(60-r*Math.cos(a)).toFixed(3)}`;
  let s=`<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--surface-sunken)" stroke-width="${W}"/>`;
  const live=segs.filter(g=>g.v>0);
  if(total>0&&live.length===1)s+=`<circle cx="60" cy="60" r="${R}" fill="none" stroke="${esc(live[0].color)}" stroke-width="${W}"/>`;
  else if(total>0){let a0=0;
    for(const g of live){const da=g.v/total*2*Math.PI,a1=a0+da,avail=da*R-GAP;
      const w=Math.max(0,Math.min(RND,avail-.6)),h=w/2,d=GAP/2+h,o=ro-h,i=ri+h;
      // angles of the four corners, offset so the gap edges stay parallel
      const so=a0+Math.asin(Math.min(1,d/o)),eo=a1-Math.asin(Math.min(1,d/o)),si=a0+Math.asin(Math.min(1,d/i)),ei=a1-Math.asin(Math.min(1,d/i));
      if(eo>so&&ei>si){const lo=eo-so>Math.PI?1:0,li=ei-si>Math.PI?1:0;
        s+=`<path d="M${pt(o,so)}A${o} ${o} 0 ${lo} 1 ${pt(o,eo)}L${pt(i,ei)}A${i} ${i} 0 ${li} 0 ${pt(i,si)}Z" fill="${esc(g.color)}" stroke="${esc(g.color)}" stroke-width="${w.toFixed(2)}" stroke-linejoin="round"/>`}
      else{const m=(a0+a1)/2,hw=Math.max(.3,(avail)/2)/R; // a sliver too small to round
        s+=`<path d="M${pt(ro,m-hw)}A${ro} ${ro} 0 0 1 ${pt(ro,m+hw)}L${pt(ri,m+hw)}A${ri} ${ri} 0 0 0 ${pt(ri,m-hw)}Z" fill="${esc(g.color)}"/>`}
      a0=a1}}
  if(sweep&&total>0&&!reduceMotion())s+=`<circle class="ring-cover" cx="60" cy="60" r="${R}" fill="none" stroke="var(--surface-sunken)" stroke-width="${W+1.5}" stroke-dasharray="${C.toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 60 60)" style="animation-delay:${splashLeft()}ms"/>`;
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
const M={vals:{},bars:{},ringKey:null,lastTab:null,expand:null};
const FMT={nf2:v=>nf2.format(v),eur:v=>eur(v)};
document.addEventListener("touchstart",()=>{},{passive:true}); // lets iOS Safari show :active press states
function rollNum(el,from,to,fmt,dur){const t0=performance.now();
  const step=t=>{if(!el.isConnected)return;const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(step)};
  requestAnimationFrame(step)}
function motionHome(enter){
  const rm=reduceMotion(),delay=enter?splashLeft():0;
  // numbers count from their previous value to the new one
  document.querySelectorAll("[data-roll]").forEach(el=>{const k=el.dataset.roll.split(":")[0],v=+el.dataset.v,prev=M.vals[k],fmt=FMT[el.dataset.fmt]||FMT.nf2;
    M.vals[k]=v;if(rm||prev==null||Math.abs(prev-v)<.005)return;el.textContent=fmt(prev);rollNum(el,prev,v,fmt,520)});
  // bars grow from their previous width; on entering the screen, from zero, one after another
  let n=0;document.querySelectorAll("[data-bar]").forEach(el=>{const k=el.dataset.bar,to=el.style.width,from=enter?"0%":M.bars[k];M.bars[k]=to;
    if(rm||from==null||from===to)return;el.animate([{width:from},{width:to}],{duration:enter?650:420,delay:delay+(enter&&k.startsWith("cat:")?120+Math.min(n++,8)*40:0),easing:EASE,fill:"backwards"})});
  // opening a card or a category: its content unfolds
  if(M.expand&&!rm){const box=M.expand==="budget"?document.querySelector(".budget"):null;
    if(box){unfold(box.querySelectorAll(".rows,.b-foot"));const ch=box.querySelector(".b-chev");ch&&ch.animate([{transform:"rotate(0deg)"},{transform:"rotate(180deg)"}],{duration:280,easing:EASE})}
    else{const row=document.querySelector(`.cat-row[data-v="${CSS.escape(M.expand.slice(4))}"]`),sub=row&&row.nextElementSibling;if(sub&&sub.classList.contains("cat-sub"))unfold([sub])}}
}
function unfold(els){els.forEach(el=>{const cs=getComputedStyle(el),h=el.offsetHeight,mt=cs.marginTop;
  el.animate([{height:"0px",marginTop:"0px",opacity:0,overflow:"hidden"},{height:h+"px",marginTop:mt,opacity:1,overflow:"hidden"}],{duration:300,easing:EASE})})}
function fold(els,done){const a=[...els].filter(Boolean);if(!a.length||reduceMotion()){done();return}
  let left=a.length;a.forEach(el=>{const h=el.offsetHeight,mt=getComputedStyle(el).marginTop;
    const an=el.animate([{height:h+"px",marginTop:mt,opacity:1,overflow:"hidden"},{height:"0px",marginTop:"0px",opacity:0,overflow:"hidden"}],{duration:240,easing:EASE,fill:"forwards"});
    an.onfinish=()=>{if(--left===0)done()}})}
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
    <div class="sub" style="margin-top:6px;display:flex;gap:14px;flex-wrap:wrap;justify-content:center">${S.filter!=="income"&&S.filter!=="transfer"?`<span>Расходы: <b class="num" style="color:var(--ink)">${nf2.format(sumE)} €</b></span>`:""}${S.filter!=="expense"&&S.filter!=="transfer"?`<span>Доходы: <b class="num pos-t">${nf2.format(sumI)} €</b></span>`:""}${S.filter==="transfer"?`<span>${ops.length} записей</span>`:""}</div>
    ${S.cat?`<button class="btn plain" style="margin-top:8px;padding:8px" data-act="clearcat">Показать все категории</button>`:""}</div></div></div>`;
  if(!ops.length)h+=`<div class="card empty"><b>Ничего не найдено</b>Измени период или фильтр.</div>`;
  else{let day=null,buf="",net=0;const flush=()=>{if(day){h+=`<section class="group"><p class="section-label"><span>${esc(dayLabel(parseD(day)))}</span>${net?`<span class="num">${net>0?"+":"−"}${nf2.format(Math.abs(net))} €</span>`:""}</p><div class="list">${buf}</div></section>`}};
    for(const o of ops){if(o.date!==day){flush();day=o.date;buf="";net=0}buf+=opRow(o);if(o.type==="income")net+=opEUR(o);else if(o.type==="expense")net-=opEUR(o)}flush()}
  h+=`</main>`;
  after(()=>{bindCustomRange("ops");bindSwipe(document.querySelector("#app main"),"ops");slideIn("#app .group");const qi=$("opsq");if(qi){qi.oninput=()=>{S.q=qi.value;clearTimeout(qi._t);qi._t=setTimeout(()=>{const pos=qi.selectionStart;render();const n=$("opsq");n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}},250)}}});
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
function slideIn(sel){const d=UI.swipeDir;if(!d)return;UI.swipeDir=0;document.querySelectorAll(sel).forEach(n=>{n.animate([{transform:`translateX(${d*36}px)`,opacity:.3},{transform:"none",opacity:1}],{duration:220,easing:"cubic-bezier(.2,.8,.2,1)"})})}
function bindCustomRange(scope){
  const f=$(scope+"-from"),t=$(scope+"-to");if(!f||!t)return;
  const S=scope==="ov"?UI.ov:UI.ops;
  const upd=()=>{S.period={...S.period,from:f.value,to:t.value};render()};f.onchange=upd;t.onchange=upd;
}

/* ================= KOPILKA ================= */
function renderKopilka(){
  const K=kNow(),c=kcfg(),ws=K.ws,cr=K.r,m=K.m;
  let h=`<main class="wrap"><header class="head"><div><h1 class="title">Япония</h1><div class="sub">${ws.length?(()=>{const lm=parseD(ws[ws.length-1].monday);return "Неделя "+dm(lm)+"–"+dmy(lm+6*DAY)})():"Нет недель"}</div></div>
    <div style="display:flex;align-items:center;gap:12px">${eyeBtn()}<button class="icon-btn" data-act="ksettings" aria-label="Настройки Копилки">${svgI("gear")}</button><div class="hanko" aria-hidden="true">貯</div></div></header>`;
  if(ws.length&&!cr)h+=`<div class="banner">Нет курса иены. Подключись к интернету или укажи курс вручную в настройках Копилки.</div>`;
  if(!m){h+=`<div class="card empty"><b>Пока нечего считать</b>Добавь неделю или операции.</div></main>`;return h}
  const b=m.budgets[UI.budget];
  h+=`<div class="kcols"><div class="kcol">`;
  h+=`<section class="card hero" id="kHero"><div class="sub">Накоплено</div><div class="big num">${eur(m.bal)}<small>€</small></div>
    <div class="hero-row"><div class="stat"><div class="v num">${eur(m.pace)}</div><div class="k">€ в неделю</div><div class="d">за ${m.win} нед${Math.abs(m.netPace-m.pace)>=1?"<br>с разовыми "+eur(m.netPace):""}</div></div>
    <div class="stat"><div class="v num">${m.left}</div><div class="k">недель <span class="jp">あと</span></div><div class="d">до ${dmy(parseD(c.deadline))}</div></div>
    <div class="stat"><div class="v num">${nf1.format(cr.rate)}</div><div class="k">¥ за 1 €</div><div class="d">${cr.manual?"вручную":"курс на "+dm(parseD(cr.date))}</div></div></div></section>`;
  h+=`<div class="seg" id="kSeg" role="group" aria-label="Бюджет жизни"><button data-act="budget" data-v="mine" aria-pressed="${UI.budget==="mine"}">Мой бюджет<span>¥${nf0.format(c.mine)}/мес</span></button><button data-act="budget" data-v="comfort" aria-pressed="${UI.budget==="comfort"}">Комфорт<span>¥${nf0.format(c.comfort)}/мес</span></button></div>`;
  h+=`<section class="schools" id="kSchools">`+["SNG","KAI"].map((s,i)=>{const x=b[s],col=i?"var(--series-2)":"var(--series-1)",C=2*Math.PI*22,p=Math.max(0,Math.min(1,x.progress));
    return `<article class="card school"><div class="school-top"><svg class="ring" viewBox="0 0 52 52" role="img" aria-label="${s}: ${nf1.format(x.progress*100)}%"><circle class="track" cx="26" cy="26" r="22"/>
      <circle class="fill" cx="26" cy="26" r="22" stroke="${col}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-p)).toFixed(1)}"/><text class="vn" x="26" y="27">${nf0.format(x.progress*100)}%</text></svg>
      <div style="min-width:0"><h3><span class="dot" style="background:${col}"></span>${s}</h3><div class="goal">цель <span class="vn num">${eur(x.goal)} €</span></div></div></div>
      <div class="rows"><div class="r"><span class="k">Нужно в нед.</span><span class="v num">${eur(x.need)}</span></div>
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
  h+=`<div class="acc-pick"><span class="sub">Всего на счетах</span><div class="big num">${UI.hideBal?"8 888,88":nf2.format(totalEUR(null))}<small>€</small></div></div>`;
  h+=`<div class="btn-row"><button class="qbtn" data-act="transfer">${svgI("swap")}Создать перевод</button><button class="qbtn" data-act="transfers">${svgI("history")}История переводов</button></div>`;
  const accs=accounts();
  h+=`<div class="list">`+(accs.length?accs.map(a=>{const b=accBalance(a.id);return `<button class="row" data-act="editacc" data-v="${esc(a.id)}">${catIc(a)}<div class="mid"><div class="t">${esc(a.name)}</div><div class="s">${esc(a.desc||"")}${a.exclude?(a.desc?" · ":"")+"не в итоге":""}</div></div>
    <span class="amt num">${money(b,a.currency)}${a.currency!=="EUR"?`<small>≈ ${nf2.format(toEUR(b,a.currency))} €</small>`:""}</span></button>`}).join(""):'<div class="empty">Пока нет счетов. Нажми «+».</div>')+`</div>`;
  h+=`<section><p class="section-label">Справочники</p><div class="list">
    <button class="row" data-act="catlist" data-v="expense"><span class="ic" style="background:var(--exp)">${svgI("cats")}</span><div class="mid"><div class="t">Категории расходов</div></div><span class="val num">${categories("expense").length}</span>${svgI("chevR")}</button>
    <button class="row" data-act="catlist" data-v="income"><span class="ic" style="background:var(--inc)">${svgI("cats")}</span><div class="mid"><div class="t">Категории доходов</div></div><span class="val num">${categories("income").length}</span>${svgI("chevR")}</button>
    <button class="row" data-act="taglist"><span class="ic" style="background:var(--ink-muted)">${svgI("tag")}</span><div class="mid"><div class="t">Теги</div></div><span class="val num">${tagsList().length}</span>${svgI("chevR")}</button>
    <button class="row" data-act="settings"><span class="ic" style="background:var(--ai)">${svgI("gear")}</span><div class="mid"><div class="t">Настройки и синхронизация</div><div class="s">${esc(syncText())}</div></div>${svgI("chevR")}</button></div></section>`;
  h+=`</main>`;return h;
}

/* ================= sheets ================= */
const stack=[];
function openSheet({title,left,right,body,tall,keypad,cls,onClose}){
  const el=document.createElement("div");el.className="sheet"+(tall?" tall":"")+(cls?" "+cls:"");el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");
  el.innerHTML=`<div class="sheet-head"><button data-sh="left">${esc(left?left.label:"Отмена")}</button><h2>${title}</h2><button class="done" data-sh="right" ${right?"":"hidden"}>${esc(right?right.label:"")}</button></div>
    <div class="sheet-body ${keypad?"with-pad":""}"></div>${keypad?'<div class="keypad" hidden></div>':""}`;
  const bodyEl=el.querySelector(".sheet-body");
  if(typeof body==="string")bodyEl.innerHTML=body;else if(body)bodyEl.appendChild(body);
  el.style.zIndex=31+stack.length*2;
  $("sheets").appendChild(el);$("scrim").hidden=false;$("scrim").style.zIndex=30+stack.length*2;
  const entry={el,onClose};stack.push(entry);
  el.querySelector('[data-sh="left"]').onclick=()=>{if(left&&left.fn)left.fn();else closeSheet()};
  if(right)el.querySelector('[data-sh="right"]').onclick=()=>right.fn();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{$("scrim").classList.add("open");el.classList.add("open")}));
  return{el,body:bodyEl,keypad:el.querySelector(".keypad"),head:el.querySelector(".sheet-head"),setTitle:t=>{el.querySelector(".sheet-head h2").innerHTML=t}};
}
function closeSheet(){const e=stack.pop();if(!e)return;const el=e.el;el.classList.remove("open");
  if(!stack.length){$("scrim").classList.remove("open")}else{$("scrim").style.zIndex=30+(stack.length-1)*2}
  setTimeout(()=>{el.remove();if(!stack.length)$("scrim").hidden=true},280);if(e.onClose)e.onClose()}
$("scrim").onclick=()=>closeSheet();
function err(box,t){let e=box.querySelector(".err");if(!e){e=document.createElement("p");e.className="err";box.appendChild(e)}e.textContent=t;e.hidden=false;e.scrollIntoView({block:"nearest",behavior:"smooth"})}
let toastT=null;function toast(t){const el=$("toast");el.textContent=t;el.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove("show"),3200)}

/* ---- account picker ---- */
function openAccPick(scope){
  const S=scope==="ov"?UI.ov:scope==="ops"?UI.ops:UI.ch;let sel=new Set(S.accs||[]);
  const sh=openSheet({title:"Выберите счёт",right:{label:"Готово",fn:()=>{S.accs=sel.size?[...sel]:null;if(scope==="ch")UI.ch.sel=null;closeSheet();render()}}});
  const draw=()=>{sh.body.innerHTML=`<div class="list"><button class="row" data-a="all"><span class="check ${sel.size?"":"on"}">${sel.size?"":svgI("check")}</span><div class="mid"><div class="t">Итого</div><div class="s">все счета в общем балансе</div></div><span class="amt num">${nf2.format(totalEUR(null))} €</span></button>`+
    accounts().map(a=>`<button class="row" data-a="${esc(a.id)}"><span class="check ${sel.has(a.id)?"on":""}">${sel.has(a.id)?svgI("check"):""}</span>${catIc(a)}<div class="mid"><div class="t">${esc(a.name)}</div><div class="s">${esc(a.desc||"")}</div></div><span class="amt num">${money(accBalance(a.id),a.currency)}</span></button>`).join("")+`</div>
    <p class="hint" style="margin-top:0">Можно выбрать несколько счетов.</p>`;
    sh.body.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{const v=b.dataset.a;if(v==="all")sel=new Set();else sel.has(v)?sel.delete(v):sel.add(v);draw()})};
  draw();
}

/* ---- add / edit operation ---- */
function catUsage(type){const cnt={},cut=iso(todayMs()-120*DAY);for(const o of opsList()){if(o.type!==type||!o.categoryId)continue;cnt[o.categoryId]=(cnt[o.categoryId]||0)+(o.date>=cut?3:1)}return cnt}
/* tags used with this category in history float to the front (recent uses weigh more); nothing gets selected */
function tagUsage(catId,type){const cnt={};if(!catId)return cnt;const cut=iso(todayMs()-120*DAY);
  for(const o of opsList()){if(o.type!==type||o.categoryId!==catId)continue;for(const t of o.tagIds||[])cnt[t]=(cnt[t]||0)+(o.date>=cut?3:1)}return cnt}
function openOp(id,preset){
  const ex=id?D.ops[id]:null;
  const st={type:ex?ex.type:(preset&&preset.type)||(UI.tab==="overview"?UI.ov.type:"expense"),expr:ex?String(ex.amount).replace(".",","):"",accountId:ex?ex.accountId:(settings().defaultAccount&&account(settings().defaultAccount)&&!account(settings().defaultAccount).deleted?settings().defaultAccount:(accounts()[0]||{}).id),
    categoryId:ex?ex.categoryId:null,date:ex?ex.date:todayIso(),tagIds:new Set(ex?ex.tagIds||[]:[]),comment:ex?ex.comment||"":"",oneoff:ex?!!ex.oneoff:false,oneoffTouched:!!ex,showAll:false,kb:!ex,addingTag:false,delArmed:false};
  if(ex&&ex.type==="correction"){return openCorrection(ex)}
  const sh=openSheet({title:"",tall:true,keypad:true,right:{label:"Сохранить",fn:save}});
  const setTitle=()=>sh.setTitle(`<div class="seg" style="max-width:220px;margin:0 auto"><button data-t="expense" aria-pressed="${st.type==="expense"}">Расход</button><button data-t="income" aria-pressed="${st.type==="income"}">Доход</button></div>`);
  function evalExpr(e){const s=e.replace(/,/g,".").replace(/\s/g,"");if(!s)return NaN;if(!/^[0-9.+\-−×]*$/.test(s))return NaN;
    const toks=s.replace(/−/g,"-").match(/[+\-]?[0-9.]+/g);if(!toks)return NaN;let v=0;for(const t of toks){const n=Number(t);if(!isFinite(n))return NaN;v+=n}return r2(v)}
  function amountHtml(){const v=evalExpr(st.expr);const cur=accCur(st.accountId);const hasOp=/[+\-−]/.test(st.expr.replace(/^-/,""));
    return `<div class="expr num">${hasOp?esc(st.expr.replace(/\./g,","))+" =":"&nbsp;"}</div><div class="val num ${st.expr?"":"ph"}">${st.expr?(isFinite(v)?nf2v.format(v):esc(st.expr)):"0"}<span class="cur">${esc(cur)}</span></div>`}
  function draw(){
    setTitle();sh.el.querySelectorAll(".sheet-head [data-t]").forEach(b=>b.onclick=()=>{if(st.type!==b.dataset.t){st.type=b.dataset.t;st.categoryId=null;if(!st.oneoffTouched)st.oneoff=false;draw()}});
    const cats=categories(st.type);const use=catUsage(st.type);const sorted=cats.slice().sort((a,b)=>(use[b.id]||0)-(use[a.id]||0)||byOrder(a,b));
    let shown=st.showAll?sorted:sorted.slice(0,7);if(st.categoryId&&!shown.find(c=>c.id===st.categoryId)){const c=category(st.categoryId);if(c)shown=[c,...shown.slice(0,6)]}
    const t0=todayMs();const dq=[[iso(t0),"сегодня"],[iso(t0-DAY),"вчера"],[iso(t0-2*DAY),"позавчера"]];const custom=!dq.find(x=>x[0]===st.date);
    const tu=tagUsage(st.categoryId,st.type);const tags=tagsList().sort((a,b)=>(tu[b.id]||0)-(tu[a.id]||0));
    let h=`<div class="amount-box ${st.kb?"focus":""}" data-x="amount" role="button" tabindex="0" aria-label="Сумма">${amountHtml()}</div>`;
    h+=`<div class="hscroll" role="group" aria-label="Счёт">${accounts().map(a=>`<button class="opt" data-acc="${esc(a.id)}" aria-pressed="${st.accountId===a.id}">${catIc(a)}<span>${esc(a.name)}<small class="num">${money(accBalance(a.id),a.currency)}</small></span></button>`).join("")}</div>`;
    h+=`<p class="flabel ${st._needCat?"req":""}" id="catLabel">${st._needCat?"Выбери категорию":"Категория"}</p><div class="cat-grid">`+shown.map(c=>`<button class="cat-btn" data-cat="${esc(c.id)}" aria-pressed="${st.categoryId===c.id}">${catIc(c)}<span class="n">${esc(c.name)}</span></button>`).join("")+
      (sorted.length>7?`<button class="cat-btn ghost" data-x="allcats"><span class="ic">${svgI(st.showAll?"chevD":"plus")}</span><span class="n">${st.showAll?"Свернуть":"Ещё"}</span></button>`:"")+
      (st.showAll||sorted.length<=7?`<button class="cat-btn ghost" data-x="newcat"><span class="ic">${svgI("plus")}</span><span class="n">Создать</span></button>`:"")+`</div>`;
    h+=`<p class="flabel">Дата</p><div class="dchips">${dq.map(([d,l])=>`<button class="dchip" data-d="${d}" aria-pressed="${st.date===d}"><b>${dm(parseD(d))}</b>${l}</button>`).join("")}
      <label class="dchip pick" aria-pressed="${custom}">${custom?`<b>${dm(parseD(st.date))}</b>${st.date.slice(0,4)}`:`<b>${svgI("calendar")}</b>другая`}<input type="date" id="opdate" value="${esc(st.date)}" aria-label="Другая дата"></label></div>`;
    h+=`<p class="flabel">Теги</p><div class="tags">${tags.map(t=>`<button class="tag" data-tag="${esc(t.id)}" aria-pressed="${st.tagIds.has(t.id)}">${esc(t.name)}</button>`).join("")}
      ${st.addingTag?"":`<button class="tag add" data-x="addtag">+ тег</button>`}</div>
      ${st.addingTag?`<div class="tag-input"><input id="newtag" maxlength="20" placeholder="Имя тега" autocomplete="off"><button class="tag" data-x="savetag" aria-pressed="true">Добавить</button></div>`:""}`;
    h+=`<input class="comment" id="opcomment" placeholder="Комментарий" value="${esc(st.comment)}" maxlength="120" autocomplete="off">`;
    h+=`<div class="form"><div class="field"><label for="oneoff">${st.type==="expense"?"Разовая трата":"Разовый доход"}<small>${st.type==="expense"?"поездка, подарок, техника — не портит темп Копилки":"отпускные, возврат налога — не завышает темп"}</small></label><span class="switch"><input type="checkbox" id="oneoff" ${st.oneoff?"checked":""}><span></span></span></div></div>`;
    if(ex)h+=`<button class="btn danger ${st.delArmed?"confirm":""}" data-x="del">${st.delArmed?"Нажми ещё раз, чтобы удалить":"Удалить операцию"}</button>`;
    sh.body.innerHTML=h;
    // bindings
    const B=sh.body;
    B.querySelector('[data-x="amount"]').onclick=()=>{st.kb=true;document.activeElement&&document.activeElement.blur();drawPad();B.querySelector(".amount-box").classList.add("focus")};
    B.querySelectorAll("[data-acc]").forEach(b=>b.onclick=()=>{st.accountId=b.dataset.acc;draw()});
    B.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{st.categoryId=b.dataset.cat;st._needCat=false;const c=category(st.categoryId);if(!st.oneoffTouched&&c)st.oneoff=!!c.oneoff;draw()});
    const ac=B.querySelector('[data-x="allcats"]');if(ac)ac.onclick=()=>{st.showAll=!st.showAll;draw()};
    const nc=B.querySelector('[data-x="newcat"]');if(nc)nc.onclick=()=>openCategory(null,st.type,c=>{st.categoryId=c.id;draw()});
    B.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{st.date=b.dataset.d;draw()});
    const od=$("opdate");od.onchange=()=>{if(od.value){st.date=od.value;draw()}};
    B.querySelectorAll("[data-tag]").forEach(b=>b.onclick=()=>{const t=b.dataset.tag;st.tagIds.has(t)?st.tagIds.delete(t):st.tagIds.add(t);b.setAttribute("aria-pressed",st.tagIds.has(t))});
    const at=B.querySelector('[data-x="addtag"]');if(at)at.onclick=()=>{st.addingTag=true;st.kb=false;draw();const i=$("newtag");i.focus()};
    const stg=B.querySelector('[data-x="savetag"]');if(stg){const go=()=>{const v=$("newtag").value.trim().slice(0,20);if(v){let t=tagsList().find(x=>x.name.toLowerCase()===v.toLowerCase());
      if(!t){t={id:"t"+uid(),name:v,order:tagsList().length};put("tags",t);D.dirty=true;persist();scheduleSync()}st.tagIds.add(t.id)}st.addingTag=false;draw()};
      stg.onclick=go;$("newtag").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();go()}}}
    const cm=$("opcomment");cm.oninput=()=>{st.comment=cm.value};cm.onfocus=()=>{st.kb=false;drawPad();B.querySelector(".amount-box").classList.remove("focus")};
    const oo=$("oneoff");oo.onchange=()=>{st.oneoff=oo.checked;st.oneoffTouched=true};
    const dl=B.querySelector('[data-x="del"]');if(dl)dl.onclick=()=>{if(!st.delArmed){st.delArmed=true;draw();return}D.ops[ex.id]={id:ex.id,deleted:true,updatedAt:nowIso()};closeSheet();changed();toast("Операция удалена")};
    drawPad();
  }
  function drawPad(){
    const kp=sh.keypad;kp.hidden=!st.kb;if(!st.kb)return;
    const L={"2":"АБВГ","3":"ДЕЖЗ","4":"ИЙКЛ","5":"МНОП","6":"РСТУ","7":"ФХЦЧ","8":"ШЩЪЫ","9":"ЬЭЮЯ"};
    const keys=["1","2","3","4","5","6","7","8","9",",","0","bs"];
    kp.innerHTML=keys.map(k=>k==="bs"?`<button class="flat" data-k="bs" aria-label="Стереть">${svgI("back")}</button>`:k===","?`<button class="flat" data-k=","><b>,</b></button>`:`<button data-k="${k}"><b>${k}</b><small>${L[k]||""}</small></button>`).join("");
    kp.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>press(b.dataset.k));
  }
  function press(k){
    if(k==="hide"){st.kb=false;drawPad();sh.body.querySelector(".amount-box").classList.remove("focus");return}
    if(k==="ok"){const v=evalExpr(st.expr);if(isFinite(v)&&/[+\-−]/.test(st.expr.replace(/^-/,"")))st.expr=String(v).replace(".",",");
      if(!st.categoryId){st.kb=false;st._needCat=true;draw();const l=$("catLabel");l&&l.scrollIntoView({block:"start",behavior:"smooth"});return}save();return}
    if(k==="bs")st.expr=st.expr.slice(0,-1);
    else if(k===","){const last=st.expr.split(/[+−]/).pop();if(!last.includes(","))st.expr+=(last===""?"0,":",")}
    else if(k==="+"||k==="−"){if(st.expr&&!/[+−,]$/.test(st.expr))st.expr+=k}
    else{const last=st.expr.split(/[+−]/).pop();const dec=last.split(",")[1];if(dec&&dec.length>=2)return;if(last==="0")st.expr=st.expr.slice(0,-1);st.expr+=k}
    sh.body.querySelector(".amount-box").innerHTML=amountHtml();
  }
  sh.el.addEventListener("keydown",e=>{if(!st.kb||/INPUT|TEXTAREA/.test(document.activeElement.tagName))return;
    const m={"Backspace":"bs","Enter":"ok","+":"+","-":"−",",":",",".":","};if(/^[0-9]$/.test(e.key)){press(e.key);e.preventDefault()}else if(m[e.key]){press(m[e.key]);e.preventDefault()}});
  sh.el.tabIndex=-1;setTimeout(()=>sh.el.focus(),300);
  function save(){
    const v=evalExpr(st.expr);
    if(!isFinite(v)||v<=0){st.kb=true;draw();toast("Введи сумму больше нуля");return}
    if(!st.accountId||!account(st.accountId)){toast("Сначала добавь счёт во вкладке «Счета»");return}
    if(!st.categoryId){st.kb=false;st._needCat=true;draw();const l=$("catLabel");l&&l.scrollIntoView({block:"start",behavior:"smooth"});return}
    const t=nowIso();const o={id:ex?ex.id:uid(),type:st.type,amount:v,accountId:st.accountId,categoryId:st.categoryId,date:st.date,tagIds:[...st.tagIds].filter(x=>D.tags[x]&&!D.tags[x].deleted),
      comment:st.comment.trim(),oneoff:!!st.oneoff,createdAt:ex?ex.createdAt||t:t,updatedAt:t};
    if(!o.comment)delete o.comment;if(!o.oneoff)delete o.oneoff;if(!o.tagIds.length)delete o.tagIds;
    if(accCur(o.accountId)!=="EUR"){const r=fxRate(accCur(o.accountId));if(r)o.eur=r2(v/r)}
    D.ops[o.id]=o;closeSheet();changed();
    toast(weekToast(o));
  }
  draw();
}
function weekToast(o){
  const mon=iso(mondayOf(parseD(o.date)));const base=(o.type==="expense"?"Расход":"Доход")+" "+money(o.amount,accCur(o.accountId))+" записан";
  if(mon<ledgerStart())return base+". Неделя "+dm(parseD(mon))+" ведётся в Копилке вручную.";
  if(mon===iso(mondayOf(todayMs()))&&o.type==="expense"&&!o.oneoff){const B=weekBudget();if(B)return base+(B.left>=0?` · на неделю осталось ${eur(B.left)} €`:` · перерасход недели ${eur(-B.left)} €`)}
  const st=weekStatus(mon);if(!st||!st.w)return base;const w=st.w,rv=reg(w),diff=rv-st.need;
  return base+` · неделя ${signed(w.saved)} €, `+(diff>=0?`выше нормы на ${eur(diff)}`:`до нормы ${eur(-diff)}`);
}

/* ---- transfer ---- */
function openTransfer(id){
  const ex=id?D.ops[id]:null;const accs=accounts();
  const st={from:ex?ex.accountId:(accs[0]||{}).id,to:ex?ex.toAccountId:(accs[1]||{}).id,amount:ex?String(ex.amount).replace(".",","):"",toAmount:ex&&ex.toAmount!=null?String(ex.toAmount).replace(".",","):"",date:ex?ex.date:todayIso(),comment:ex?ex.comment||"":"",del:false};
  const sh=openSheet({title:ex?"Перевод":"Создание перевода",tall:true,right:{label:"Сохранить",fn:save}});
  function draw(){
    const fc=accCur(st.from),tc=accCur(st.to),diff=fc!==tc;
    const opts=(key)=>accs.map(a=>`<button class="opt" data-${key}="${esc(a.id)}" aria-pressed="${st[key]===a.id}">${catIc(a)}<span>${esc(a.name)}<small class="num">${money(accBalance(a.id),a.currency)}</small></span></button>`).join("");
    sh.body.innerHTML=`<p class="flabel">Перевод со счёта</p><div class="hscroll">${opts("from")}</div>
      <p class="flabel">Перевод на счёт</p><div class="hscroll">${opts("to")}</div>
      <div class="form"><div class="field"><label for="tamt">${diff?"Списано":"Сумма перевода"}<small>${esc(fc)}</small></label><input id="tamt" inputmode="decimal" placeholder="0" value="${esc(st.amount)}" autocomplete="off"></div>
      ${diff?`<div class="field"><label for="ttoamt">Зачислено<small>${esc(tc)} · сколько реально пришло</small></label><input id="ttoamt" inputmode="decimal" placeholder="0" value="${esc(st.toAmount)}" autocomplete="off"></div>`:""}
      <div class="field"><label for="tdate">Дата</label><input type="date" id="tdate" value="${esc(st.date)}"></div></div>
      ${diff?'<p class="hint">Курс у каждого банка свой, поэтому вводятся обе суммы: сколько списано и сколько зачислено.</p>':""}
      <input class="comment" id="tcom" placeholder="Комментарий" value="${esc(st.comment)}" maxlength="120" autocomplete="off">
      ${ex?`<button class="btn danger ${st.del?"confirm":""}" data-x="del">${st.del?"Нажми ещё раз, чтобы удалить":"Удалить перевод"}</button>`:""}`;
    const B=sh.body;
    B.querySelectorAll("[data-from]").forEach(b=>b.onclick=()=>{sync1();st.from=b.dataset.from;draw()});
    B.querySelectorAll("[data-to]").forEach(b=>b.onclick=()=>{sync1();st.to=b.dataset.to;draw()});
    const d=B.querySelector('[data-x="del"]');if(d)d.onclick=()=>{if(!st.del){sync1();st.del=true;draw();return}D.ops[ex.id]={id:ex.id,deleted:true,updatedAt:nowIso()};closeSheet();changed();toast("Перевод удалён")};
  }
  function sync1(){const a=$("tamt"),b=$("ttoamt"),c=$("tdate"),m=$("tcom");if(a)st.amount=a.value;if(b)st.toAmount=b.value;if(c&&c.value)st.date=c.value;if(m)st.comment=m.value}
  function save(){sync1();const v=num(st.amount),diff=accCur(st.from)!==accCur(st.to),tv=diff?num(st.toAmount):v;
    if(!st.from||!st.to)return err(sh.body,"Выбери оба счёта.");if(st.from===st.to)return err(sh.body,"Счета должны быть разными.");
    if(!(v>0))return err(sh.body,"Введи сумму перевода.");if(diff&&!(tv>0))return err(sh.body,"Введи, сколько зачислено на второй счёт.");
    const t=nowIso();const o={id:ex?ex.id:uid(),type:"transfer",accountId:st.from,toAccountId:st.to,amount:r2(v),date:st.date,createdAt:ex?ex.createdAt||t:t,updatedAt:t};
    if(diff)o.toAmount=r2(tv);if(st.comment.trim())o.comment=st.comment.trim();
    D.ops[o.id]=o;closeSheet();changed();toast("Перевод сохранён");}
  draw();
}
function openCorrection(ex){
  const acc=account(ex.accountId)||{currency:"EUR",name:"?"};
  const sh=openSheet({title:"Корректировка",right:{label:"Сохранить",fn:()=>{const v=num($("cramt").value);if(!isFinite(v)||v===0)return err(sh.body,"Введи сумму со знаком, например −5,36.");
    D.ops[ex.id]={...ex,amount:r2(v),date:$("crdate").value||ex.date,comment:$("crcom").value.trim()||undefined,updatedAt:nowIso()};closeSheet();changed()}}});
  sh.body.innerHTML=`<div class="form"><div class="field"><label>Счёт</label><span>${esc(acc.name)}</span></div>
    <div class="field"><label for="cramt">Изменение баланса<small>${esc(acc.currency)}, со знаком</small></label><input id="cramt" inputmode="decimal" value="${esc(String(ex.amount).replace(".",","))}"></div>
    <div class="field"><label for="crdate">Дата</label><input type="date" id="crdate" value="${esc(ex.date)}"></div></div>
    <input class="comment" id="crcom" placeholder="Комментарий" value="${esc(ex.comment||"")}">
    <p class="hint">Корректировка меняет баланс счёта, но не считается ни доходом, ни расходом.</p>
    <button class="btn danger" id="crdel">Удалить корректировку</button>`;
  let armed=false;$("crdel").onclick=()=>{if(!armed){armed=true;$("crdel").classList.add("confirm");$("crdel").textContent="Нажми ещё раз, чтобы удалить";return}D.ops[ex.id]={id:ex.id,deleted:true,updatedAt:nowIso()};closeSheet();changed()};
}

/* ---- pickers: icons / colors ---- */
function iconGridHtml(sel,sections){
  return Object.entries(sections).map(([sec,names])=>`<p class="flabel">${esc(sec)}</p><div class="icon-grid">${names.filter(n=>ICONS[n]).map(n=>`<button data-icon="${esc(n)}" aria-pressed="${sel===n}" aria-label="${esc(n)}">${icon(n)}</button>`).join("")}</div>`).join("");
}
const swatchHtml=sel=>`<div class="sw-grid">${PALETTE.map(c=>`<button data-color="${c}" style="background:${c}" aria-pressed="${sel&&sel.toLowerCase()===c.toLowerCase()}" aria-label="${c}"></button>`).join("")}</div>`;

/* ---- category editor ---- */
function openCategory(id,type,onSaved){
  const ex=id?D.categories[id]:null;
  const st={name:ex?ex.name:"",type:ex?ex.type:type||"expense",plan:ex&&ex.plan?String(ex.plan):"",oneoff:ex?!!ex.oneoff:false,fixed:ex&&ex.fixed||"",icon:ex?ex.icon:"help-circle",color:ex?ex.color:PALETTE[13],del:false};
  const sh=openSheet({title:ex?"Категория":"Новая категория",tall:true,right:{label:ex?"Сохранить":"Добавить",fn:save}});
  function draw(){
    sh.body.innerHTML=`<div class="preview">${catIc({icon:st.icon,color:st.color},"lg")}<div style="flex:1;min-width:0"><input class="comment" id="cname" placeholder="Название категории" value="${esc(st.name)}" maxlength="30" autocomplete="off"></div></div>
      <div class="seg"><button data-ty="expense" aria-pressed="${st.type==="expense"}">Расходы</button><button data-ty="income" aria-pressed="${st.type==="income"}">Доходы</button></div>
      <div class="form"><div class="field"><label for="cplan">${st.type==="expense"?"Планирую тратить":"Планирую получать"}<small>€ в месяц, необязательно</small></label><input id="cplan" inputmode="decimal" placeholder="не задано" value="${esc(st.plan)}"></div>
      <div class="field"><label for="coneoff">${st.type==="expense"?"Разовая по умолчанию":"Разовый доход по умолчанию"}<small>новые операции будут отмечены разовыми</small></label><span class="switch"><input type="checkbox" id="coneoff" ${st.oneoff?"checked":""}><span></span></span></div>
      ${st.type==="expense"?`<div class="field"><label for="cfixed">Обязательная трата<small>счета учитываются в бюджете недели в среднем</small></label><select id="cfixed">${[["","нет"],["daily","ежедневная (еда)"],["monthly","ежемесячный счёт"]].map(([v,l])=>`<option value="${v}" ${(st.fixed||"")===v?"selected":""}>${l}</option>`).join("")}</select></div>`:""}</div>
      <p class="flabel">Цвет</p>${swatchHtml(st.color)}
      <p class="flabel">Иконка</p>${iconGridHtml(st.icon,ICON_SECTIONS)}
      ${ex?`<button class="btn danger ${st.del?"confirm":""}" data-x="del">${st.del?"Нажми ещё раз, чтобы удалить":"Удалить категорию"}</button>`:""}`;
    const B=sh.body;
    B.querySelectorAll("[data-ty]").forEach(b=>b.onclick=()=>{read();st.type=b.dataset.ty;draw()});
    B.querySelectorAll("[data-color]").forEach(b=>b.onclick=()=>{read();st.color=b.dataset.color;draw()});
    B.querySelectorAll("[data-icon]").forEach(b=>b.onclick=()=>{read();st.icon=b.dataset.icon;const y=B.scrollTop;draw();B.scrollTop=y});
    const d=B.querySelector('[data-x="del"]');if(d)d.onclick=()=>{read();if(!st.del){st.del=true;draw();return}D.categories[ex.id]={...ex,deleted:true,updatedAt:nowIso()};closeSheet();changed();toast("Категория удалена. Операции с ней остались.")};
  }
  function read(){const n=$("cname"),p=$("cplan"),o=$("coneoff"),fx=$("cfixed");if(n)st.name=n.value;if(p)st.plan=p.value;if(o)st.oneoff=o.checked;if(fx)st.fixed=fx.value}
  function save(){read();const name=st.name.trim();if(!name)return err(sh.body,"Введи название категории.");const plan=st.plan.trim()?num(st.plan):null;
    if(plan!=null&&!(plan>=0))return err(sh.body,"План должен быть числом.");
    const c={...(ex||{}),id:ex?ex.id:"c"+uid(),name,type:st.type,icon:st.icon,color:st.color,plan,oneoff:st.oneoff,fixed:st.type==="expense"&&st.fixed?st.fixed:null,order:ex?ex.order:categories(st.type).length+(st.type==="income"?100:0)};
    put("categories",c);closeSheet();changed();if(onSaved)onSaved(c)}
  draw();
}
function openCatList(type){
  const sh=openSheet({title:type==="expense"?"Категории расходов":"Категории доходов",left:{label:"Закрыть"},right:{label:"Создать",fn:()=>openCategory(null,type,()=>draw())}});
  function draw(){sh.body.innerHTML=`<div class="list">${categories(type).map(c=>`<button class="row" data-c="${esc(c.id)}">${catIc(c)}<div class="mid"><div class="t">${esc(c.name)}</div><div class="s">${c.plan?"план "+eur(c.plan)+" €/мес":""}${c.oneoff?(c.plan?" · ":"")+"разовая":""}</div></div>${svgI("chevR")}</button>`).join("")||'<div class="empty">Нет категорий</div>'}</div>`;
    sh.body.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>openCategory(b.dataset.c,type,()=>draw()))}
  draw();stack[stack.length-1].onClose=()=>render();
}
function openTagList(){
  const sh=openSheet({title:"Теги",left:{label:"Закрыть"},right:{label:"Добавить",fn:()=>editTag(null)}});
  function draw(){sh.body.innerHTML=`<div class="list">${tagsList().map(t=>`<button class="row" data-t="${esc(t.id)}"><span class="ic" style="background:var(--ink-muted)">${svgI("tag")}</span><div class="mid"><div class="t">${esc(t.name)}</div><div class="s">${opsList().filter(o=>(o.tagIds||[]).includes(t.id)).length} опер.</div></div>${svgI("chevR")}</button>`).join("")||'<div class="empty">Нет тегов</div>'}</div>`;
    sh.body.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>editTag(b.dataset.t))}
  function editTag(id){const ex=id?D.tags[id]:null;let armed=false;const st={fixed:ex&&ex.fixed||""};
    const s2=openSheet({title:ex?"Тег":"Новый тег",right:{label:"Сохранить",fn:()=>{const v=$("tname").value.trim().slice(0,20);if(!v)return err(s2.body,"Введи имя тега.");put("tags",{...(ex||{}),id:ex?ex.id:"t"+uid(),name:v,fixed:$("tfixed").value||null,order:ex?ex.order:tagsList().length});closeSheet();changed();draw()}}});
    s2.body.innerHTML=`<input class="comment" id="tname" maxlength="20" placeholder="Имя тега" value="${esc(ex?ex.name:"")}" autocomplete="off"><p class="hint">До 20 символов.</p>
      <div class="form"><div class="field"><label for="tfixed">Обязательная трата<small>важнее категории: NS в «Транспорте» — счёт</small></label><select id="tfixed">${[["","нет"],["daily","ежедневная (еда)"],["monthly","ежемесячный счёт"]].map(([v,l])=>`<option value="${v}" ${(st.fixed||"")===v?"selected":""}>${l}</option>`).join("")}</select></div></div>${ex?'<button class="btn danger" id="tdel">Удалить тег</button>':""}`;
    if(ex)$("tdel").onclick=()=>{if(!armed){armed=true;$("tdel").classList.add("confirm");$("tdel").textContent="Нажми ещё раз, чтобы удалить";return}D.tags[ex.id]={...ex,deleted:true,updatedAt:nowIso()};closeSheet();changed();draw()};
    setTimeout(()=>$("tname").focus(),300)}
  draw();stack[stack.length-1].onClose=()=>render();
}

/* ---- account editor ---- */
const ACC_ICONS={"Счета":["building-bank","credit-card","cash","cash-banknote","wallet","pig-money","coins","coin","currency-euro","currency-dollar","currency-yen","currency-pound","currency-hryvnia","device-mobile","moneybag","brand-paypal","currency-bitcoin","wash-machine","home","gift-card","businessplan","receipt"].filter(n=>ICONS[n])};
function openAccount(id){
  const ex=id?D.accounts[id]:null;const curBal=ex?accBalance(ex.id):0;
  const st={name:ex?ex.name:"",desc:ex?ex.desc||"":"",currency:ex?ex.currency:"EUR",bal:ex?String(r2(curBal)).replace(".",","):"",icon:ex?ex.icon:"building-bank",color:ex?ex.color:PALETTE[13],exclude:ex?!!ex.exclude:false,del:false};
  const sh=openSheet({title:ex?"Счёт":"Новый счёт",tall:true,right:{label:ex?"Сохранить":"Добавить",fn:save}});
  function draw(){
    sh.body.innerHTML=`<div class="preview">${catIc({icon:st.icon,color:st.color},"lg")}<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px"><input class="comment" id="aname" placeholder="Имя счёта" value="${esc(st.name)}" maxlength="30" autocomplete="off"><input class="comment" id="adesc" placeholder="Описание, например «Ежедневные траты»" value="${esc(st.desc)}" maxlength="40" autocomplete="off"></div></div>
      <div class="form"><div class="field"><label for="abal">${ex?"Баланс сейчас":"Начальный баланс"}<small>${ex?"если изменить, создастся корректировка":"сколько денег на счёте сейчас"}</small></label><input id="abal" inputmode="decimal" placeholder="0" value="${esc(st.bal)}"></div>
      <div class="field"><label for="acur">Валюта</label><select id="acur">${CURRENCIES.map(c=>`<option ${c===st.currency?"selected":""}>${c}</option>`).join("")}</select></div>
      <div class="field"><label for="aexcl">Не учитывать в общем балансе<small>и в Копилке</small></label><span class="switch"><input type="checkbox" id="aexcl" ${st.exclude?"checked":""}><span></span></span></div>
      ${ex?`<div class="field"><label for="adef">Счёт по умолчанию<small>подставляется при добавлении операции</small></label><span class="switch"><input type="checkbox" id="adef" ${settings().defaultAccount===ex.id?"checked":""}><span></span></span></div>`:""}</div>
      <p class="flabel">Цвет</p>${swatchHtml(st.color)}
      <p class="flabel">Иконка</p>${iconGridHtml(st.icon,ACC_ICONS)}
      ${ex?`<button class="btn danger ${st.del?"confirm":""}" data-x="del">${st.del?"Нажми ещё раз, чтобы удалить":"Удалить счёт"}</button>`:""}`;
    const B=sh.body;
    B.querySelectorAll("[data-color]").forEach(b=>b.onclick=()=>{read();st.color=b.dataset.color;draw()});
    B.querySelectorAll("[data-icon]").forEach(b=>b.onclick=()=>{read();st.icon=b.dataset.icon;draw()});
    const d=B.querySelector('[data-x="del"]');if(d)d.onclick=()=>{read();if(!st.del){st.del=true;draw();return}D.accounts[ex.id]={...ex,deleted:true,updatedAt:nowIso()};closeSheet();changed();toast("Счёт удалён")};
  }
  function read(){const g=i=>$(i);if(g("aname"))st.name=g("aname").value;if(g("adesc"))st.desc=g("adesc").value;if(g("abal"))st.bal=g("abal").value;if(g("acur"))st.currency=g("acur").value;if(g("aexcl"))st.exclude=g("aexcl").checked;if(g("adef"))st._def=g("adef").checked}
  function save(){read();const name=st.name.trim();if(!name)return err(sh.body,"Введи имя счёта.");const b=st.bal.trim()?num(st.bal):0;if(!isFinite(b))return err(sh.body,"Баланс должен быть числом.");
    const t=nowIso();
    if(ex){put("accounts",{...ex,name,desc:st.desc.trim(),currency:st.currency,icon:st.icon,color:st.color,exclude:st.exclude});
      const delta=r2(b-curBal);if(Math.abs(delta)>=0.005){const o={id:uid(),type:"correction",accountId:ex.id,amount:delta,date:todayIso(),comment:"Корректировка счёта",createdAt:t,updatedAt:t};D.ops[o.id]=o}
      if(st._def!==undefined){const s=settings();if(st._def&&s.defaultAccount!==ex.id)D.settings={...s,defaultAccount:ex.id,updatedAt:t};else if(!st._def&&s.defaultAccount===ex.id)D.settings={...s,defaultAccount:null,updatedAt:t}}}
    else put("accounts",{id:"a"+uid(),name,desc:st.desc.trim(),currency:st.currency,opening:r2(b),icon:st.icon,color:st.color,exclude:st.exclude,order:accounts().length});
    closeSheet();changed()}
  draw();
}

/* ---- kopilka: manual week + settings ---- */
function openKWeek(monday){
  const ls=ledgerStart();const ex=monday?(D.kopilka.weeks||{})[monday]:null;
  const st={del:false};const ws=kopWeeks().filter(w=>w.legacy);const last=ws[ws.length-1];
  const sh=openSheet({title:ex?"Неделя вручную":"Новая неделя",right:{label:"Сохранить",fn:save}});
  const defMon=ex?ex.monday:iso(Math.min(last?parseD(last.monday)+7*DAY:mondayOf(todayMs()),parseD(ls)-7*DAY));
  sh.body.innerHTML=`<p class="hint" style="margin-top:0">Ручные недели — до ${dmy(parseD(ls))}. С этой даты недели считаются из операций.</p>
    <div class="form"><div class="field"><label for="kmon">Понедельник</label><input type="date" id="kmon" value="${esc(defMon)}" max="${esc(iso(parseD(ls)-DAY))}"></div>
    <div class="field"><label for="ksaved">Отложено за неделю<small>в евро, может быть минус</small></label><input id="ksaved" inputmode="decimal" value="${ex?esc(String(ex.saved).replace(".",",")):""}" placeholder="0"></div>
    <div class="field"><label for="kbal">Итоговый остаток<small>необязательно</small></label><input id="kbal" inputmode="decimal" value="${ex&&typeof ex.balance==="number"?esc(String(ex.balance).replace(".",",")):""}" placeholder="—"></div></div>
    <div class="form"><div class="field"><label for="kone">Разовые траты</label><input id="kone" inputmode="decimal" value="${ex&&ex.oneoff?esc(String(ex.oneoff).replace(".",",")):""}" placeholder="0"></div>
    <div class="field"><label for="kinc">Разовый доход</label><input id="kinc" inputmode="decimal" value="${ex&&ex.income?esc(String(ex.income).replace(".",",")):""}" placeholder="0"></div>
    <div class="field"><label for="knote">За что</label><input id="knote" maxlength="40" value="${esc(ex&&ex.note||"")}" placeholder="—"></div></div>
    ${ex?'<button class="btn danger" id="kdel">Удалить неделю</button>':""}`;
  if(ex)$("kdel").onclick=()=>{if(!st.del){st.del=true;$("kdel").classList.add("confirm");$("kdel").textContent="Нажми ещё раз, чтобы удалить";return}D.kopilka.weeks[ex.monday]={monday:ex.monday,deleted:true,updatedAt:nowIso()};closeSheet();changed()};
  function save(){const v=$("kmon").value;if(!v)return err(sh.body,"Выбери дату.");const m=iso(mondayOf(parseD(v)));if(m>=ls)return err(sh.body,"Эта неделя уже считается из операций.");
    const saved=num($("ksaved").value);if(!isFinite(saved))return err(sh.body,"Введи сумму, отложенную за неделю.");
    const bal=$("kbal").value.trim()?num($("kbal").value):null,one=$("kone").value.trim()?num($("kone").value):0,inc=$("kinc").value.trim()?num($("kinc").value):0;
    if((bal!=null&&!isFinite(bal))||!(one>=0)||!(inc>=0))return err(sh.body,"Проверь суммы: разовые без минуса.");
    const t=nowIso();if(ex&&ex.monday!==m)D.kopilka.weeks[ex.monday]={monday:ex.monday,deleted:true,updatedAt:t};
    const w={monday:m,saved:r2(saved),updatedAt:t};if(bal!=null)w.balance=r2(bal);if(one>0)w.oneoff=r2(one);if(inc>0)w.income=r2(inc);const note=$("knote").value.trim();if(note)w.note=note;
    D.kopilka.weeks[m]=w;closeSheet();changed()}
}
function openKSettings(){
  const c=kcfg();
  const sh=openSheet({title:"Настройки Копилки",tall:true,right:{label:"Сохранить",fn:save}});
  const auto=rateAt(todayIso());
  sh.body.innerHTML=`<p class="section-label" style="margin-bottom:-10px">Курс иены</p><div class="form"><div class="field"><label for="sRate">Ручной курс<small>${auto?"пусто — авто, сейчас "+nf2.format(auto.rate)+" ("+dm(parseD(auto.date))+")":"пусто — брать автоматический"}</small></label><input id="sRate" inputmode="decimal" placeholder="авто" value="${typeof c.manualRate==="number"?esc(String(c.manualRate).replace(".",",")):""}"></div></div>
    <p class="section-label" style="margin-bottom:-10px">Цель</p><div class="form">
    ${[["sMine","Мой бюджет","¥ в месяц",c.mine],["sComfort","Комфорт","¥ в месяц",c.comfort],["sMonths","Месяцев жизни","",c.months],["sSNG","Школа SNG","¥ за весь курс",c.SNG],["sKAI","Школа KAI","¥ за весь курс",c.KAI],["sExtra","Доп. расходы","€, билет, телефон, рисоварка",c.extraEur]].map(([id,l,s,v])=>`<div class="field"><label for="${id}">${l}${s?`<small>${s}</small>`:""}</label><input id="${id}" inputmode="numeric" value="${esc(v)}"></div>`).join("")}</div>
    <p class="section-label" style="margin-bottom:-10px">Срок и выплаты</p><div class="form">
    <div class="field"><label for="sDeadline">Последний день</label><input type="date" id="sDeadline" value="${esc(c.deadline)}"></div>
    <div class="field"><label for="sHoliday">Отпускные<small>€, лето 2027 + выплата при увольнении</small></label><input id="sHoliday" inputmode="numeric" value="${esc(c.holidayEur)}"></div>
    <div class="field"><label for="sWindow">Окно темпа<small>недель для среднего</small></label><input id="sWindow" inputmode="numeric" value="${esc(c.window)}"></div>
    <div class="field"><label for="sLedger">Недели из операций с<small>раньше — ручные недели</small></label><input type="date" id="sLedger" value="${esc(ledgerStart())}"></div></div>`;
  function save(){const r=$("sRate").value.trim();const n={manualRate:r?num(r):null,mine:num($("sMine").value),comfort:num($("sComfort").value),months:num($("sMonths").value),SNG:num($("sSNG").value),KAI:num($("sKAI").value),
      extraEur:num($("sExtra").value),deadline:$("sDeadline").value,holidayEur:num($("sHoliday").value),window:Math.max(1,Math.round(num($("sWindow").value))),extraPayouts:c.extraPayouts};
    for(const k of ["mine","comfort","months","SNG","KAI","extraEur","holidayEur","window"])if(!isFinite(n[k])||n[k]<0)return err(sh.body,"Проверь поля: все суммы должны быть числами.");
    if(n.manualRate!==null&&!(n.manualRate>50))return err(sh.body,"Курс выглядит неверно.");if(!n.deadline)return err(sh.body,"Укажи последний день.");
    const t=nowIso();D.kopilka.config={...n,updatedAt:t};const lv=$("sLedger").value;if(lv&&lv!==ledgerStart())D.settings={...settings(),ledgerStart:iso(mondayOf(parseD(lv))),updatedAt:t};
    closeSheet();changed()}
}

/* ---- settings ---- */
function openSettings(){
  const sh=openSheet({title:"Настройки",tall:true,left:{label:"Закрыть"}});
  function draw(){
    const a=getAuth(),s=settings(),usedCur=[...new Set(accounts().map(x=>x.currency).filter(c=>c!=="EUR"))];
    sh.body.innerHTML=`<p class="section-label" style="margin-bottom:-10px">Синхронизация</p>
      <div class="form"><div class="field stack"><label for="yToken">Токен GitHub<small>${a?"сохранён · вставь новый, чтобы заменить":"Fine-grained, доступ Contents к kopilka-data"}</small></label><input id="yToken" class="mono" type="password" placeholder="github_pat_…" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
      <div class="field stack"><label for="yRepo">Репозиторий с данными</label><input id="yRepo" class="mono" value="${esc(a?a.repo:DEFAULT_REPO)}" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div>
      <p class="hint">${a?"Подключено к "+esc(a.repo)+(D.lastSync?". Последняя синхронизация "+esc(new Date(D.lastSync).toLocaleString("ru-RU")):"")+".":"Не подключено. Данные только на этом устройстве."}</p>
      <div class="btn-row"><button class="btn" id="yConnect">${a?"Заменить токен":"Подключить"}</button><button class="btn plain" id="ySync" ${a?"":"disabled"}>Синхронизировать</button></div>
      <p class="section-label" style="margin-bottom:-10px">Основное</p>
      <div class="form"><div class="field"><label for="sDef">Счёт по умолчанию</label><select id="sDef"><option value="">первый в списке</option>${accounts().map(x=>`<option value="${esc(x.id)}" ${s.defaultAccount===x.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select></div></div>
      ${usedCur.length?`<p class="section-label" style="margin-bottom:-10px">Курсы валют к евро</p><div class="form">${usedCur.map(cu=>{const auto=cu==="JPY"?(latestJPY()||{}).rate:D.fx&&D.fx.rates&&D.fx.rates[cu];return `<div class="field"><label for="fx_${cu}">1 € = ? ${esc(cu)}<small>${auto?"авто "+nf2.format(auto)+(D.fx&&D.fx.date&&cu!=="JPY"?" ("+esc(D.fx.date)+")":""):"нет автокурса, нужен интернет"} · пусто — авто</small></label><input id="fx_${cu}" data-fx="${cu}" inputmode="decimal" placeholder="авто" value="${s.fxManual&&s.fxManual[cu]?esc(String(s.fxManual[cu]).replace(".",",")):""}"></div>`}).join("")}</div>
      <p class="hint">Курс нужен только для пересчёта в «Итого» и Копилку. Переводы между валютами всегда идут по фактическим суммам.</p>`:""}
      <p class="section-label" style="margin-bottom:-10px">Данные</p>
      <div class="list flat"><button class="row" id="yCopy"><div class="mid"><div class="t" style="color:var(--ai)">Скопировать все данные (JSON)</div><div class="s">резервная копия в буфер обмена</div></div></button>
      ${a?'<button class="row" id="yForget"><div class="mid"><div class="t" style="color:var(--shu)">Удалить токен с этого устройства</div></div></button>':""}</div>
      <p class="hint" style="text-align:center">Копилка · данные: ${opsList().length} операций, ${accounts().length} счетов</p>`;
    $("yConnect").onclick=connect;const ys=$("ySync");if(ys)ys.onclick=()=>{closeSheet();sync()};
    $("sDef").onchange=()=>{D.settings={...settings(),defaultAccount:$("sDef").value||null,updatedAt:nowIso()};changed()};
    sh.body.querySelectorAll("[data-fx]").forEach(i=>i.onchange=()=>{const cu=i.dataset.fx,v=i.value.trim()?num(i.value):null;const fm={...(settings().fxManual||{})};if(v>0)fm[cu]=v;else delete fm[cu];D.settings={...settings(),fxManual:fm,updatedAt:nowIso()};changed()});
    $("yCopy").onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(docOf(D)));toast("Данные скопированы")}catch(e){toast("Не получилось скопировать. Данные также лежат на GitHub.")}};
    const yf=$("yForget");if(yf)yf.onclick=()=>{setAuth(null);setStatus("local");draw()};
  }
  async function connect(){
    const tok=$("yToken").value.trim(),repo=$("yRepo").value.trim().replace(/^https?:\/\/github\.com\//,"").replace(/\/$/,"");const a0=getAuth(),token=tok||(a0&&a0.token);
    if(!token)return err(sh.body,"Вставь токен.");if(!/^[\w.-]+\/[\w.-]+$/.test(repo))return err(sh.body,"Репозиторий в виде владелец/название, например "+DEFAULT_REPO+".");
    if(!navigator.onLine)return err(sh.body,"Нужен интернет, чтобы проверить токен.");
    try{const r=await fetch(`https://api.github.com/repos/${repo}`,{cache:"no-store",headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json"}});
      if(r.status===401)return err(sh.body,"GitHub не принял токен. Проверь, что он скопирован целиком и не истёк.");
      if(r.status===404||r.status===403)return err(sh.body,"Токен работает, но не видит "+repo+".");if(!r.ok)return err(sh.body,"GitHub ответил ошибкой "+r.status+".")}
    catch(e){return err(sh.body,"Не удалось связаться с GitHub. Проверь интернет.")}
    setAuth({token,repo});await sync();draw();toast(syncState==="ok"?"Подключено, данные синхронизированы":"Подключено, но синхронизация не прошла")}
  draw();stack[stack.length-1].onClose=()=>render();
}

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
    case "tab":UI.tab=v;UI.budgetOpen=false;window.scrollTo(0,0);render();break;
    case "sync":if(syncState==="auth"||syncState==="norepo"||syncState==="local")openSettings();else sync();break;
    case "syncsheet":case "settings":openSettings();break;
    case "accpick":openAccPick(sc);break;
    case "hidebal":UI.hideBal=!UI.hideBal;render();break;
    case "ovtype":UI.ov.type=v;UI.ov.open=null;render();break;
    case "pkind":P.period={...P.period,kind:v,anchor:todayIso()};if(v==="custom"&&!P.period.from){P.period.from=iso(todayMs()-30*DAY);P.period.to=todayIso()}render();break;
    case "pshift":P.period=shiftPeriod(P.period,+v);UI.swipeDir=+v;render();break;
    case "budgettoggle":{const box=el.closest(".budget");
      if(UI.budgetOpen&&box){const ch=box.querySelector(".b-chev");ch&&!reduceMotion()&&ch.animate([{transform:"rotate(180deg)"},{transform:"rotate(0deg)"}],{duration:240,easing:EASE,fill:"forwards"});
        fold(box.querySelectorAll(".rows,.b-foot"),()=>{UI.budgetOpen=false;render()})}
      else{UI.budgetOpen=true;render();M.expand="budget";motionHome(false)}break}
    case "ptoday":P.period={...P.period,anchor:todayIso()};render();break;
    case "ovopen":{const sub=el.nextElementSibling;
      if(UI.ov.open===v&&sub&&sub.classList.contains("cat-sub"))fold([sub],()=>{UI.ov.open=null;render()});
      else{UI.ov.open=v;render();M.expand="cat:"+v;motionHome(false)}break}
    case "showcatops":UI.ops={...UI.ops,filter:UI.ov.type,period:{...UI.ov.period},accs:UI.ov.accs,cat:v,tag:el.dataset.tag||null,q:""};UI.tab="ops";window.scrollTo(0,0);render();break;
    case "clearcat":UI.ops.cat=null;UI.ops.tag=null;render();break;
    case "opsf":UI.ops.filter=v;render();break;
    case "editop":openOp(v);break;
    case "edittransfer":openTransfer(v);break;
    case "budget":UI.budget=v;render();break;
    case "kweek":openKWeek(v||null);break;
    case "weekops":UI.ops={...UI.ops,filter:"all",period:{kind:"week",anchor:v},accs:null,cat:null,q:""};UI.tab="ops";window.scrollTo(0,0);render();break;
    case "allweeks":UI.showAllWeeks=!UI.showAllWeeks;render();break;
    case "ksettings":openKSettings();break;
    case "chmode":UI.ch.mode=v;UI.ch.sel=null;render();break;
    case "chgroup":UI.ch.group=v;UI.ch.sel=null;render();break;
    case "ovview":UI.ov.view=UI.ov.view==="bars"?"donut":"bars";render();break;
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
})();
