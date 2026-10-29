/* Копилка — Bottom sheets: add/edit operation, transfers, categories, tags, settings.
   Plain scripts loaded in order by index.html (core → home → screens → sheets → boot); they share one global scope. */
"use strict";

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
  const mon=iso(mondayOf(parseD(o.date)));const base=(o.type==="expense"?"−":"+")+money(o.amount,accCur(o.accountId))+" записано";
  if(mon===iso(mondayOf(todayMs()))&&o.type==="expense"&&!o.oneoff){const B=weekBudget();if(B)return base+(B.left>=0?` · осталось ${eur(B.left)} € на неделю`:` · перерасход ${eur(-B.left)} €`)}
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

/* ---- kopilka settings ---- */
function openKSettings(){
  const c=kcfg();
  const sh=openSheet({title:"Настройки Копилки",tall:true,right:{label:"Сохранить",fn:save}});
  const auto=rateAt(todayIso());
  sh.body.innerHTML=`<p class="section-label" style="margin-bottom:-10px">Курс иены</p><div class="form"><div class="field"><label for="sRate">Ручной курс<small>${auto?"пусто — авто, сейчас "+nf2.format(auto.rate)+" ("+dm(parseD(auto.date))+")":"пусто — брать автоматический"}</small></label><input id="sRate" inputmode="decimal" placeholder="авто" value="${typeof c.manualRate==="number"?esc(String(c.manualRate).replace(".",",")):""}"></div></div>
    <p class="section-label" style="margin-bottom:-10px">Цель</p><div class="form">
    ${[["sMine","Мой бюджет","¥ в месяц",c.mine],["sComfort","Минимум","¥ в месяц",c.comfort],["sMonths","Месяцев жизни","",c.months],...(SHOW_SNG?[["sSNG","Школа SNG","¥ за весь курс",c.SNG]]:[]),["sKAI","Школа KAI","¥ за весь курс",c.KAI],["sExtra","Доп. расходы","€, билет, телефон, рисоварка",c.extraEur],["sTutor","Преподаватель","€, для всех целей",c.tutorEur]].map(([id,l,s,v])=>`<div class="field"><label for="${id}">${l}${s?`<small>${s}</small>`:""}</label><input id="${id}" inputmode="numeric" value="${esc(v)}"></div>`).join("")}</div>
    <p class="section-label" style="margin-bottom:-10px">Срок и выплаты</p><div class="form">
    <div class="field"><label for="sDeadline">Последний день</label><input type="date" id="sDeadline" value="${esc(c.deadline)}"></div>
    <div class="field"><label for="sHoliday">Отпускные<small>€, лето 2027 + выплата при увольнении</small></label><input id="sHoliday" inputmode="numeric" value="${esc(c.holidayEur)}"></div>
    <div class="field"><label for="sWindow">Окно темпа<small>недель для среднего</small></label><input id="sWindow" inputmode="numeric" value="${esc(c.window)}"></div>
    <div class="field"><label for="sLedger">Недели из операций с<small>раньше — ручные недели</small></label><input type="date" id="sLedger" value="${esc(ledgerStart())}"></div></div>`;
  function save(){const r=$("sRate").value.trim();const n={manualRate:r?num(r):null,mine:num($("sMine").value),comfort:num($("sComfort").value),months:num($("sMonths").value),SNG:$("sSNG")?num($("sSNG").value):c.SNG,KAI:num($("sKAI").value),
      extraEur:num($("sExtra").value),tutorEur:num($("sTutor").value),deadline:$("sDeadline").value,holidayEur:num($("sHoliday").value),window:Math.max(1,Math.round(num($("sWindow").value))),extraPayouts:c.extraPayouts};
    for(const k of ["mine","comfort","months","SNG","KAI","extraEur","tutorEur","holidayEur","window"])if(!isFinite(n[k])||n[k]<0)return err(sh.body,"Проверь поля: все суммы должны быть числами.");
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
