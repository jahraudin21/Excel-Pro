'use strict';
/* ================= Start screen: Recent / Favorites + templates =================
   Depends on: script.js ($, T, STR, wb, colW, saveLS, renderAll, renderTabs,
   setBookName, setStatusMode, COLS, Account). Shown at launch; picking a
   template replaces the workbook currently in the editor. */

/* ---------- i18n ---------- */
Object.assign(STR, {
  ssTitle:{np:'सुरु गर्नुहोस्',hi:'शुरू करें',en:'Welcome to Mini Excel'},
  ssSubtitle:{np:'हालका फाइलहरू खोल्नुहोस् वा टेम्प्लेटबाट सुरु गर्नुहोस्।',hi:'हाल की फ़ाइलें खोलें या टेम्पलेट से शुरू करें।',en:'Open a recent file or start from a template.'},
  ssRecent:{np:'हालका',hi:'हाल की',en:'Recent'},
  ssFavorites:{np:'मनपसंद',hi:'पसंदीदा',en:'Favorites'},
  ssNoRecent:{np:'अहिलेसम्म कुनै फाइल खोलिएको छैन।',hi:'अभी तक कोई फ़ाइल नहीं खोली गई।',en:'No files opened yet.'},
  ssNoFavorites:{np:'अहिलेसम्म कुनै मनपसंद फाइल छैन।',hi:'अभी तक कोई पसंदीदा फ़ाइल नहीं है।',en:'No favorites yet.'},
  ssAddFavorite:{np:'मनपसंदमा थप्नुहोस्',hi:'पसंदीदा में जोड़ें',en:'Add to favorites'},
  ssRemoveFavorite:{np:'मनपसंदबाट हटाउनुहोस्',hi:'पसंदीदा से हटाएँ',en:'Remove from favorites'},
  ssBlank:{np:'खाली',hi:'खाली',en:'Blank'},
  ssBlankDesc:{np:'सुरु गर्नुहोस्',hi:'शुरू करें',en:'Start from scratch'},
  ssBudget:{np:'बजेट',hi:'बजट',en:'Budget'},
  ssBudgetDesc:{np:'आय–खर्च',hi:'आय-खर्च',en:'Income and expenses'},
  ssInvoice:{np:'इनभोइस',hi:'इनवॉइस',en:'Invoice'},
  ssInvoiceDesc:{np:'बिल जारी गर्नुहोस्',hi:'बिल जारी करें',en:'Bill a customer'},
  ssTimesheet:{np:'समय-पत्रक',hi:'समय-पत्रक',en:'Timesheet'},
  ssTimesheetDesc:{np:'कामको घण्टा',hi:'काम के घंटे',en:'Track hours'},
  ssInventory:{np:'स्टक',hi:'स्टॉक',en:'Inventory'},
  ssInventoryDesc:{np:'माल सूची',hi:'माल सूची',en:'Stock list'},
  ssCalendar:{np:'पञ्जिका',hi:'कैलेंडर',en:'Calendar'},
  ssCalendarDesc:{np:'महिना योजना',hi:'महीना योजना',en:'Plan a month'},
  ssNewFromTemplate:{np:'टेम्प्लेटबाट सुरु',hi:'टेम्पलेट से शुरू',en:'Started from template'},
  ssFavoriteAdded:{np:'मनपसंदमा थपियो',hi:'पसंदीदा में जोड़ा',en:'Added to favorites'},
  ssFavoriteRemoved:{np:'मनपसंदबाट हटाइयो',hi:'पसंदीदा से हटाया',en:'Removed from favorites'}
});

/* ---------- storage ---------- */
const SS_RECENT_KEY='mx-recent-v1';
const SS_FAVS_KEY='mx-favorites-v1';
const SS_MAX_RECENT=8;

function ssRead(key,fallback){
  try{const v=JSON.parse(localStorage.getItem(key));return Array.isArray(v)?v:fallback;}catch(e){return fallback;}
}
function ssWrite(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch(e){}}

/* Map a template id onto its i18n key: "timesheet" -> "ssTimesheet". */
function ssKey(id){return 'ss'+id.charAt(0).toUpperCase()+id.slice(1);}

const StartScreen=(function(){
  let activeTab='recent';

  function recent(){return ssRead(SS_RECENT_KEY,[]);}
  function favorites(){return ssRead(SS_FAVS_KEY,[]);}

  function currentBookName(){
    try{
      if(typeof wb!=='undefined'&&wb&&wb.cloudName)return wb.cloudName;
      const el=document.getElementById('bookName');
      return (el&&el.textContent.trim())||'Book1';
    }catch(e){return 'Book1';}
  }

  /* Record the open workbook so the list survives a restart. Keyed by cloud id
     when the book is in the cloud, otherwise by its display name. */
  function rememberCurrent(){
    try{
      if(typeof wb==='undefined'||!wb||!wb.sheets||!wb.sheets.length)return;
      const name=currentBookName();
      const id=(wb.cloudId?('cloud:'+wb.cloudId):('name:'+name));
      const list=recent().filter(function(r){return r.id!==id;});
      list.unshift({id:id,name:name,at:Date.now()});
      ssWrite(SS_RECENT_KEY,list.slice(0,SS_MAX_RECENT));
    }catch(e){}
  }

  function isFavorite(id){return favorites().some(function(f){return f.id===id;});}
  function toggleFavorite(id,name){
    const list=favorites();
    const at=indexOfId(list,id);
    let added;
    if(at>=0){list.splice(at,1);added=false;}else{list.unshift({id:id,name:name,at:Date.now()});added=true;}
    ssWrite(SS_FAVS_KEY,list);
    render();
    if(typeof setStatusMode==='function')setStatusMode(T(added?'ssFavoriteAdded':'ssFavoriteRemoved'));
  }
  function indexOfId(list,id){
    for(let i=0;i<list.length;i++)if(list[i].id===id)return i;
    return -1;
  }
  function removeRecent(id){
    ssWrite(SS_RECENT_KEY,recent().filter(function(r){return r.id!==id;}));
    render();
  }

  /* ---------- templates ---------- */
  const TEMPLATES=[
    {id:'blank',icon:'📄',make:function(){return {sheets:[{name:'Sheet1',cells:{}}]};}},
    {id:'budget',icon:'💰',make:function(){
      const c={A1:{raw:'Item',s:{b:true}},B1:{raw:'Amount',s:{b:true}},C1:{raw:'Type',s:{b:true}}};
      const rows=[['Salary',50000,'Income'],['Rent',-15000,'Expense'],['Groceries',-6200,'Expense'],
                  ['Utilities',-2400,'Expense'],['Transport',-1800,'Expense']];
      rows.forEach(function(r,i){const n=i+2;c['A'+n]={raw:r[0]};c['B'+n]={raw:r[1]};c['C'+n]={raw:r[2]};});
      c['A7']={raw:'Balance',s:{b:true}};c['B7']={raw:'=SUM(B2:B6)',s:{b:true}};
      return {sheets:[{name:'Budget',cells:c}]};}},
    {id:'invoice',icon:'🧾',make:function(){
      const c={A1:{raw:'Invoice #1001',s:{b:true,fs:16}},
               A3:{raw:'Description'},B3:{raw:'Qty',s:{b:true}},
               C3:{raw:'Rate',s:{b:true}},D3:{raw:'Amount',s:{b:true}}};
      const rows=[['Design work',2,2500],['Consulting hours',5,1800],['Hosting',1,900]];
      rows.forEach(function(r,i){const n=i+4;c['A'+n]={raw:r[0]};c['B'+n]={raw:r[1]};
        c['C'+n]={raw:r[2]};c['D'+n]={raw:'=B'+n+'*C'+n};});
      c['A7']={raw:'Total',s:{b:true}};c['D7']={raw:'=SUM(D4:D6)',s:{b:true}};
      return {sheets:[{name:'Invoice',cells:c}]};}},
    {id:'timesheet',icon:'⏱',make:function(){
      const c={A1:{raw:'Date',s:{b:true}},B1:{raw:'Task',s:{b:true}},C1:{raw:'Hours',s:{b:true}}};
      const rows=[['2026-01-05','Design review',3],['2026-01-06','Build',6],['2026-01-07','Testing',2.5]];
      rows.forEach(function(r,i){const n=i+2;c['A'+n]={raw:r[0]};c['B'+n]={raw:r[1]};c['C'+n]={raw:r[2]};});
      c['A5']={raw:'Total',s:{b:true}};c['C5']={raw:'=SUM(C2:C4)',s:{b:true}};
      return {sheets:[{name:'Timesheet',cells:c}]};}},
    {id:'inventory',icon:'📦',make:function(){
      const c={A1:{raw:'Item',s:{b:true}},B1:{raw:'In stock',s:{b:true}},
               C1:{raw:'Reorder at',s:{b:true}},D1:{raw:'Status',s:{b:true}}};
      const rows=[['Notebooks',120,50],['Pens',340,100],['Staplers',45,60],['Paper boxes',18,25]];
      rows.forEach(function(r,i){const n=i+2;c['A'+n]={raw:r[0]};c['B'+n]={raw:r[1]};
        c['C'+n]={raw:r[2]};c['D'+n]={raw:'=IF(B'+n+'<C'+n+',"Reorder","OK")'};});
      return {sheets:[{name:'Inventory',cells:c}]};}},
    {id:'calendar',icon:'📅',make:function(){
      const c={A1:{raw:'Date',s:{b:true}},B1:{raw:'Event',s:{b:true}},C1:{raw:'Owner',s:{b:true}}};
      const rows=[['2026-01-01','Team planning','Everyone'],['2026-01-08','Release v1','Release manager'],
                  ['2026-01-15','Retro','Team']];
      rows.forEach(function(r,i){const n=i+2;c['A'+n]={raw:r[0]};c['B'+n]={raw:r[1]};c['C'+n]={raw:r[2]};});
      return {sheets:[{name:'Calendar',cells:c}]};}}
  ];

  function templateById(id){
    for(let i=0;i<TEMPLATES.length;i++)if(TEMPLATES[i].id===id)return TEMPLATES[i];
    return null;
  }

  /* Shared reset for every path that swaps the whole workbook. Undo history is
     cleared too, otherwise Ctrl+Z could resurrect the previous workbook. */
  function installWorkbook(sheets,cloudId,cloudName){
    wb={cur:0,sheets:sheets};
    if(cloudId)wb.cloudId=cloudId;
    if(cloudName)wb.cloudName=cloudName;
    if(typeof COLS!=='undefined'){
      colW=new Array(COLS).fill(88);
      wb.colW=colW;
    }
    if(typeof hist!=='undefined')hist.length=0;
    if(typeof fut!=='undefined')fut.length=0;
    if(typeof vals!=='undefined')vals={};
    if(typeof cache!=='undefined')cache={};
    active=selA=selB='A1';
    if(typeof saveLS==='function')saveLS();
    if(typeof renderAll==='function')renderAll();
    if(typeof renderTabs==='function')renderTabs();
    if(typeof setBookName==='function')setBookName();
  }

  function applyTemplate(id){
    const tpl=templateById(id);
    if(!tpl)return false;
    try{
      installWorkbook(tpl.make().sheets);
      if(typeof setStatusMode==='function')setStatusMode(T('ssNewFromTemplate')+' — '+T(ssKey(id)));
      rememberCurrent();
      close();
      return true;
    }catch(e){return false;}
  }

  function openCloudBook(id){
    try{
      if(typeof StorageBooks==='undefined'||!StorageBooks.get)return;
      StorageBooks.get(id).then(function(b){
        if(b&&b.data&&b.data.sheets){
          installWorkbook(b.data.sheets,b.id,b.name);
          rememberCurrent();
          close();
        }
      });
    }catch(e){}
  }

  /* ---------- rendering ---------- */
  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
  }
  function whenLabel(ts){
    try{
      const m=Math.floor((Date.now()-ts)/60000);
      if(m<1)return '•';
      if(m<60)return m+'m';
      const h=Math.floor(m/60);
      if(h<24)return h+'h';
      return Math.floor(h/24)+'d';
    }catch(e){return '';}
  }

  function renderList(){
    const host=document.getElementById('ssList');
    if(!host)return;
    const items=activeTab==='recent'?recent():favorites();
    if(!items.length){
      host.innerHTML='<p class="ssEmpty">'+esc(T(activeTab==='recent'?'ssNoRecent':'ssNoFavorites'))+'</p>';
      return;
    }
    host.innerHTML=items.map(function(item){
      const fav=isFavorite(item.id);
      return '<div class="ssItem" data-ss-id="'+esc(item.id)+'">'+
        '<div class="ssItemMain">'+
          '<span class="ssItemName">'+esc(item.name)+'</span>'+
          '<span class="ssItemTime">'+esc(whenLabel(item.at))+'</span>'+
        '</div>'+
        '<button type="button" class="ssStar'+(fav?' on':'')+'" data-ss-fav="'+esc(item.id)+'"'+
          ' title="'+esc(T(fav?'ssRemoveFavorite':'ssAddFavorite'))+'">'+(fav?'★':'☆')+'</button>'+
        (activeTab==='recent'
          ? '<button type="button" class="ssX" data-ss-del="'+esc(item.id)+'" title="✕">✕</button>'
          : '')+
      '</div>';
    }).join('');
  }

  function renderTemplates(){
    const host=document.getElementById('ssTemplates');
    if(!host)return;
    host.innerHTML=TEMPLATES.map(function(t){
      return '<button type="button" class="ssTpl" data-ss-tpl="'+t.id+'">'+
        '<span class="ssTplIcon">'+t.icon+'</span>'+
        '<span class="ssTplName">'+esc(T(ssKey(t.id)))+'</span>'+
        '<span class="ssTplDesc">'+esc(T(ssKey(t.id)+'Desc'))+'</span>'+
      '</button>';
    }).join('');
  }

  function render(){
    Array.prototype.forEach.call(document.querySelectorAll('.ssTab'),function(b){
      b.classList.toggle('on',b.dataset.ssTab===activeTab);
    });
    const rec=document.getElementById('ssPaneRecent');
    const fav=document.getElementById('ssPaneFavorites');
    if(rec)rec.hidden=activeTab!=='recent';
    if(fav)fav.hidden=activeTab!=='favorites';
    renderList();
  }

  function open(){
    rememberCurrent();
    const el=document.getElementById('startScreen');
    if(!el)return;
    el.classList.add('open');
    render();
  }
  function close(){
    const el=document.getElementById('startScreen');
    if(el)el.classList.remove('open');
  }
  function isOpen(){
    const el=document.getElementById('startScreen');
    return !!(el&&el.classList.contains('open'));
  }

  function wire(){
    const el=document.getElementById('startScreen');
    if(!el)return;

    el.addEventListener('click',function(ev){
      const t=ev.target;
      if(!t.closest)return;

      if(t.closest('[data-ss-close]')){close();return;}

      const tab=t.closest('.ssTab');
      if(tab){activeTab=tab.dataset.ssTab;render();return;}

      const tpl=t.closest('[data-ss-tpl]');
      if(tpl){applyTemplate(tpl.dataset.ssTpl);return;}

      const favBtn=t.closest('[data-ss-fav]');
      if(favBtn){
        const id=favBtn.dataset.ssFav;
        const known=recent().concat(favorites()).filter(function(r){return r.id===id;})[0];
        toggleFavorite(id,known?known.name:id);
        return;
      }

      const delBtn=t.closest('[data-ss-del]');
      if(delBtn){removeRecent(delBtn.dataset.ssDel);return;}
    });

    /* Double-click a row to reopen it. Cloud-backed entries are fetched; local
       ones just close the screen because the workbook is already in memory. */
    el.addEventListener('dblclick',function(ev){
      const row=ev.target.closest('.ssItem');
      if(!row)return;
      const id=row.dataset.ssId||'';
      if(id.indexOf('cloud:')===0)openCloudBook(id.slice(6));
      else close();
    });

    document.addEventListener('keydown',function(ev){
      if(ev.key==='Escape'&&isOpen())close();
    });
  }

  /* script.js runs init() -> applyLang() while it is still parsing, i.e. before
     these keys exist, so T() would fall back to the raw key names. Re-apply the
     screen's own data-i18n nodes (and the Google button) once, without the
     global applyLang() which would needlessly re-render the whole grid. */
  function applyScreenI18n(){
    try{
      const el=document.getElementById('startScreen');
      if(el&&typeof T==='function'){
        Array.prototype.forEach.call(el.querySelectorAll('[data-i18n]'),function(n){
          n.textContent=T(n.dataset.i18n);
        });
      }
      const gl=document.querySelector('.gsignLabel');
      if(gl&&typeof T==='function')gl.textContent=T('gsignLabel');
    }catch(e){}
  }

  function init(){
    renderTemplates();
    wire();
    applyScreenI18n();
    /* Re-render template labels once the base i18n table is definitely loaded. */
    setTimeout(function(){applyScreenI18n();renderTemplates();},0);
  }

  return {open:open,close:close,isOpen:isOpen,init:init,render:render,
          rememberCurrent:rememberCurrent,applyTemplate:applyTemplate,
          toggleFavorite:toggleFavorite,recent:recent,favorites:favorites,
          templates:TEMPLATES};
})();
