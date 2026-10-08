'use strict';
/* ================= Start screen: Recent / Favorites + templates =================
   Depends on: script.js ($, T, STR, wb, colW, saveLS, renderAll, renderTabs,
   setBookName, setStatusMode, COLS, Account). Shown at launch; picking a
   template replaces the workbook currently in the editor. */

/* ---------- i18n ---------- */
Object.assign(STR, {
  ssTitle:{np:'सुरु गर्नुहोस्',hi:'शुरू करें',en:'Welcome to Mini Excel'},
  ssSubtitle:{np:'हालका फाइलहरू खोल्नुहोस् वा टेम्प्लेटबाट सुरु गर्नुहोस्।',hi:'हाल की फ़ाइलें खोलें या टेम्पलेट से शुरू करें।',en:'Open a recent file or start from a template.'},
  ssTemplates:{np:'टेम्प्लेटहरू',hi:'टेम्पलेट',en:'Templates'},
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
  ssDashboard:{np:'सेल्स ड्यासबोर्ड',hi:'सेल्स डैशबोर्ड',en:'Sales Dashboard'},
  ssDashboardDesc:{np:'मासिक बिक्री विश्लेषण',hi:'मासिक बिक्री विश्लेषण',en:'Monthly sales analysis'},
  ssNewFromTemplate:{np:'टेम्प्लेटबाट सुरु',hi:'टेम्पलेट से शुरू',en:'Started from template'},
  ssFavoriteAdded:{np:'मनपसंदमा थपियो',hi:'पसंदीदा में जोड़ा',en:'Added to favorites'},
  ssFavoriteRemoved:{np:'मनपसंदबाट हटाइयो',hi:'पसंदीदा से हटाया',en:'Removed from favorites'},
  ssSearchPh:{np:'फाइलहरू खोज्नुहोस्…',hi:'फ़ाइलें खोजें…',en:'Search workbooks'},
  ssNoMatch:{np:'कुनै मिलेन।',hi:'कुछ नहीं मिला।',en:'Nothing matches your search.'},
  ssLastOpened:{np:'पछिलो खोलेको',hi:'अंतिम बार खोला',en:'Last opened'},
  ssLocal:{np:'यस ब्राउजरमा',hi:'इस ब्राउज़र में',en:'This device'},
  ssCloud:{np:'क्लाउडमा',hi:'क्लाउड में',en:'Cloud'},
  ssWorkbook:{np:'वर्कबुक',hi:'वर्कबुक',en:'Workbook'},
  ssMyAccount:{np:'मेरा खाता',hi:'मेरा खाता',en:'My account'}
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

/* ---------- Sales Dashboard template ----------
   Recreates the reference layout (Monthly Sales Data: title in A1, headers
   on row 2, twelve records in rows 3-14 across Item / Date / Sales /
   Region) and extends it into a professional dashboard panel in columns
   F:M: banner, four KPI cards, four summary tables (SUMIF / AVERAGEIF /
   COUNTIF over the data) and two embedded chart drawings.

   Geometry contract: installWorkbook() installs the colW returned here and
   renderDrawings runs on the first render, so drawing x/y are computed from
   exactly these widths. Rows are a uniform 22px, the row-header strip is
   34px and the column-header strip is 22px (see applyFreeze's HDR). */
function makeSalesDashboard(){
 const ACC='#217346',BAND=tintForTable('#217346'),TITLE_C='#1a5c38',
       HDR_BG='#e2efda',CARD_BG='#f4f9f6',GRID={t:'thin',b:'thin',l:'thin',r:'thin'};
 const colW=new Array(26).fill(88);
 colW[0]=112;colW[1]=100;colW[2]=100;colW[3]=90;colW[4]=24;   /* data + gutter */
 for(let c=5;c<=12;c++)colW[c]=96;                             /* F..M panel */
 const X=c=>{let p=34;for(let k=0;k<c;k++)p+=colW[k];return p;};
 const Y=r=>22+22*r;                                           /* 0-based row */
 const ci=ch=>ch.charCodeAt(0)-65;
 const cells={},merges=[],drawings=[];
 const put=(ref,raw,s)=>{const o=cells[ref]||{};if(raw!=null)o.raw=raw;
  if(s)o.s=Object.assign({},o.s,s);cells[ref]=o;};
 const style=(r1,c1,r2,c2,s)=>{for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)
  put(String.fromCharCode(65+c)+(r+1),null,s);};

 /* ---- source data, exactly as the reference layout ---- */
 put('A1','Monthly Sales Data',{b:true,fs:14,color:ACC,ff:'Calibri'});
 ['Item','Date','Sales','Region'].forEach((h,i)=>
  put(String.fromCharCode(65+i)+'2',h,{b:true,bg:HDR_BG,ff:'Calibri',fs:11,
   va:'middle',border:GRID,al:i===2?'right':'left'}));
 const DATA=[['Widgets','01-Jan-24',1250,'East'],['Widgets','01-Jan-24',1200,'East'],
  ['Widgets','01-Jan-24',1450,'East'],['Widgets','01-Jan-24',1750,'East'],
  ['Items','01-Jan-24',1750,'South'],['Widgets','01-Jan-24',1900,'East'],
  ['Items','01-Jan-24',1700,'South'],['Widgets','01-Jan-24',1250,'East'],
  ['Widgets','10-Jan-24',1500,'East'],['Items','03-Jan-24',2500,'South'],
  ['Widgets','01-Jan-24',1700,'East'],['Widgets','01-Jan-24',2750,'East']];
 DATA.forEach((row,i)=>{
  const n=i+3,base={ff:'Calibri',fs:11,va:'middle',border:GRID};
  const band=i%2===1?{bg:BAND}:null;                 /* zebra, 2nd record on */
  put('A'+n,row[0],Object.assign({},base,band));
  put('B'+n,row[1],Object.assign({},base,band));
  put('C'+n,row[2],Object.assign({},base,band,{numfmt:'usd',al:'right'}));
  put('D'+n,row[3],Object.assign({},base,band));});

 /* ---- banner (merged F1:M2) ---- */
 style(0,5,1,12,{bg:ACC,color:'#ffffff',b:true,fs:16,al:'center',va:'middle',
  ff:'Calibri',border:GRID});
 put('F1','Sales Dashboard');
 merges.push('F1:M2');

 /* ---- KPI cards: label strip + big value ---- */
 const KP=[['F','G','Total Sales','=SUM(C3:C14)','usd'],
           ['H','I','Average Sale','=AVERAGE(C3:C14)','usd'],
           ['J','K','Orders','=COUNT(C3:C14)',''],
           ['L','M','Highest Sale','=MAX(C3:C14)','usd']];
 KP.forEach(k=>{
  const a=ci(k[0]),b=ci(k[1]);
  style(3,a,3,b,{bg:ACC,color:'#ffffff',b:true,fs:11,al:'center',va:'middle',
   ff:'Calibri',border:GRID});
  style(4,a,4,b,{bg:CARD_BG,color:TITLE_C,b:true,fs:14,al:'center',va:'middle',
   ff:'Calibri',border:GRID});
  put(k[0]+'4',k[2]);
  put(k[0]+'5',k[3],k[4]?{numfmt:k[4]}:null);
  merges.push(k[0]+'4:'+k[1]+'4',k[0]+'5:'+k[1]+'5');});

 /* ---- summary tables: header strip, two data rows, bold total ---- */
 const SUMS=[
  {c:['F','G'],title:'By Region',fmt:'usd',
   rows:[['East','=SUMIF(D3:D14,F8,C3:C14)'],['South','=SUMIF(D3:D14,F9,C3:C14)']],
   total:['Total','=SUM(G8:G9)']},
  {c:['H','I'],title:'By Item',fmt:'usd',
   rows:[['Widgets','=SUMIF(A3:A14,H8,C3:C14)'],['Items','=SUMIF(A3:A14,H9,C3:C14)']],
   total:['Total','=SUM(I8:I9)']},
  {c:['J','K'],title:'Avg by Region',fmt:'usd',
   rows:[['East','=AVERAGEIF(D3:D14,J8,C3:C14)'],['South','=AVERAGEIF(D3:D14,J9,C3:C14)']],
   total:['All','=AVERAGE(C3:C14)']},
  {c:['L','M'],title:'Orders by Region',fmt:'',
   rows:[['East','=COUNTIF(D3:D14,L8)'],['South','=COUNTIF(D3:D14,L9)']],
   total:['Total','=SUM(M8:M9)']}];
 SUMS.forEach(s=>{
  const a=ci(s.c[0]),b=ci(s.c[1]);
  style(6,a,6,b,{bg:ACC,color:'#ffffff',b:true,fs:11,al:'center',va:'middle',
   ff:'Calibri',border:GRID});
  put(s.c[0]+'7',s.title);
  merges.push(s.c[0]+'7:'+s.c[1]+'7');
  s.rows.forEach((row,i)=>{
   const n=8+i;
   put(s.c[0]+n,row[0],{ff:'Calibri',fs:11,va:'middle',al:'left',border:GRID});
   put(s.c[1]+n,row[1],{ff:'Calibri',fs:11,va:'middle',al:'right',border:GRID,
    numfmt:s.fmt||undefined});});
  put(s.c[0]+'10',s.total[0],{b:true,bg:HDR_BG,ff:'Calibri',fs:11,va:'middle',
   al:'left',border:GRID});
  put(s.c[1]+'10',s.total[1],{b:true,bg:HDR_BG,ff:'Calibri',fs:11,va:'middle',
   al:'right',border:GRID,numfmt:s.fmt||undefined});});

 /* ---- embedded charts: painted on the sheet by drawEl -> paintChart ---- */
 drawings.push(
  {id:'dashChart1',kind:'chart',chartType:'bar',range:'F8:G9',
   title:'Sales by Region',x:X(5),y:Y(11),
   w:colW[5]+colW[6]+colW[7]+colW[8],h:210},
  {id:'dashChart2',kind:'chart',chartType:'line',range:'B3:C14',
   title:'Sales Trend',x:X(9),y:Y(11),
   w:colW[9]+colW[10]+colW[11]+colW[12],h:210});

 return {sheets:[{name:'Sales Dashboard',cells:cells,merges:merges,
   drawings:drawings,tabColor:ACC}],
  colW:colW};
}

const StartScreen=(function(){
  let activeTab='recent';
  /* Resolved lazily: the module body runs while the document is still being
     parsed, so ids are looked up on use rather than captured at definition. */
  function searchEl(){return document.getElementById('ssSearch');}

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
      return {sheets:[{name:'Calendar',cells:c}]};}},
    {id:'dashboard',icon:'📊',make:makeSalesDashboard}
  ];

  function templateById(id){
    for(let i=0;i<TEMPLATES.length;i++)if(TEMPLATES[i].id===id)return TEMPLATES[i];
    return null;
  }

  /* Shared reset for every path that swaps the whole workbook. Undo history is
     cleared too, otherwise Ctrl+Z could resurrect the previous workbook. */
  function installWorkbook(sheets,cloudId,cloudName,colWIn){
    wb={cur:0,sheets:sheets};
    if(cloudId)wb.cloudId=cloudId;
    if(cloudName)wb.cloudName=cloudName;
    if(typeof COLS!=='undefined'){
      colW=(Array.isArray(colWIn)&&colWIn.length===COLS)?colWIn.slice():new Array(COLS).fill(88);
      wb.colW=colW;
      /* The <colgroup> is built once at init: push the new widths into it so
         a template that ships its own layout (the Sales Dashboard) renders at
         those widths instead of inheriting the previous workbook's. */
      if(typeof applyColW==='function')applyColW();
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
      const made=tpl.make();
      installWorkbook(made.sheets,null,null,made.colW);
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
      const d=new Date(ts);if(isNaN(d.getTime()))return '';
      const mins=Math.floor((Date.now()-ts)/60000);
      /* Today shows just the clock time, like Excel's "Last opened" column. */
      if(mins<1)return T('ssLastOpened')+': '+d.toLocaleTimeString();
      if(mins<1440&&d.getDate()===new Date().getDate())
        return T('ssLastOpened')+': '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
      return T('ssLastOpened')+': '+d.toLocaleDateString();
    }catch(e){return '';}
  }
  /* Excel shows where a workbook lives next to its name. */
  function locationOf(item){
    return String(item.id||'').indexOf('cloud:')===0?T('ssCloud'):T('ssLocal');
  }
  /* Free-text filter over the active list. */
  function filtered(){
    const list=activeTab==='recent'?recent():favorites();
    const box=searchEl();
    const q=((box&&box.value)||'').trim().toLowerCase();
    if(!q)return list;
    return list.filter(function(it){
      return String(it.name||'').toLowerCase().indexOf(q)>=0;});
  }

  /* Fill the list of whichever pane is on screen. Both panes carry a .ssList,
     so this is what makes the Favorites tab render instead of staying blank. */
  function renderList(){
    const pane=document.getElementById(activeTab==='recent'?'ssPaneRecent':'ssPaneFavorites');
    const host=pane?pane.querySelector('.ssList'):null;
    if(!host)return;
    const items=filtered();
    const box=searchEl();
    const q=((box&&box.value)||'').trim();
    if(!items.length){
      host.innerHTML='<p class="ssEmpty">'+esc(q?T('ssNoMatch'):
        T(activeTab==='recent'?'ssNoRecent':'ssNoFavorites'))+'</p>';
      return;
    }
    host.innerHTML=items.map(function(item){
      const fav=isFavorite(item.id);
      return '<div class="ssItem" data-ss-id="'+esc(item.id)+'">'+
        '<span class="ssItemIco" aria-hidden="true">&#128196;</span>'+
        '<div class="ssItemMain">'+
          '<span class="ssItemName">'+esc(item.name)+'</span>'+
          '<span class="ssItemTime">'+esc(locationOf(item))+' &middot; '+esc(whenLabel(item.at))+'</span>'+
        '</div>'+
        '<button type="button" class="ssStar'+(fav?' on':'')+'" data-ss-fav="'+esc(item.id)+'"'+
          ' title="'+esc(T(fav?'ssRemoveFavorite':'ssAddFavorite'))+'"'+
          ' aria-label="'+esc(T(fav?'ssRemoveFavorite':'ssAddFavorite'))+'">'+(fav?'★':'☆')+'</button>'+
        (activeTab==='recent'
          ? '<button type="button" class="ssX" data-ss-del="'+esc(item.id)+'" title="✕" aria-label="✕">✕</button>'
          : '')+
      '</div>';
    }).join('');
  }

  function renderTemplates(){
    const host=document.getElementById('ssTemplates');
    if(!host)return;
    host.innerHTML=TEMPLATES.map(function(t){
      return '<button type="button" class="ssTpl" data-ss-tpl="'+t.id+'">'+
        '<span class="ssTplPrev"><span class="ssTplIcon">'+t.icon+'</span></span>'+
        '<span class="ssTplBody">'+
          '<span class="ssTplName">'+esc(T(ssKey(t.id)))+'</span>'+
          '<span class="ssTplDesc">'+esc(T(ssKey(t.id)+'Desc'))+'</span>'+
        '</span>'+
      '</button>';
    }).join('');
  }

  /* Mirror the active tab onto the left rail. Excel's start screen is navigated
     from that rail alone, so it is the only place the active section is shown. */
  function render(){
    Array.prototype.forEach.call(document.querySelectorAll('.ssNavItem[data-ss-tab]'),function(b){
      b.classList.toggle('on',b.dataset.ssTab===activeTab);
    });
    const rec=document.getElementById('ssPaneRecent');
    const fav=document.getElementById('ssPaneFavorites');
    const tpl=document.getElementById('ssPaneTemplates');
    if(rec)rec.hidden=activeTab!=='recent';
    if(fav)fav.hidden=activeTab!=='favorites';
    if(tpl)tpl.hidden=activeTab!=='templates';
    /* Only the workbook lists are filtered; the Templates tab shows everything. */
    if(activeTab!=='templates')renderList();
    syncAccount();
  }

  /* The rail's account block mirrors the titlebar chip: name, email, avatar. */
  function syncAccount(){
    try{
      const u=(typeof Account!=='undefined'&&Account.currentUser)?Account.currentUser():null;
      const av=document.getElementById('ssUserAvatar');
      const nm=document.getElementById('ssUserName');
      const ml=document.getElementById('ssUserMail');
      const btn=document.getElementById('ssAccount');
      if(av){
        if(u&&u.picture){av.style.backgroundImage='url("'+u.picture+'")';av.style.backgroundSize='cover';
          av.style.backgroundPosition='center';av.textContent='';}
        else{av.style.backgroundImage='';av.textContent=u?((u.name||'?').trim().charAt(0).toUpperCase()):'\u{1F464}';}
      }
      if(nm)nm.textContent=u?u.name:T('signIn');
      if(ml)ml.textContent=u?(u.email||''):'';
      if(btn){btn.classList.toggle('signed-in',!!u);
        btn.title=u?((u.name||'')+(u.email?' \u00b7 '+u.email:'')):T('ssMyAccount');}
    }catch(e){}
  }

  function open(){
    rememberCurrent();
    const el=document.getElementById('startScreen');
    if(!el)return;
    el.classList.add('open');
   /* Flags the stacking order so the auth dialog / lock card can sit on top
      of the start screen. */
   try{document.body.classList.add('start-open');}catch(e){}
    render();
    const box=searchEl();
    if(box)try{box.value='';}catch(e){}
    if(box)try{box.focus();}catch(e){}
  }
  function close(){
    const el=document.getElementById('startScreen');
    if(el)el.classList.remove('open');
   try{document.body.classList.remove('start-open');}catch(e){}
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

      /* Both the tab strip and the left rail carry data-ss-tab. */
      const tab=t.closest('[data-ss-tab]');
      if(tab){activeTab=tab.dataset.ssTab;render();return;}

      /* Kept for any "scroll a section into view" affordance. */
      const jump=t.closest('[data-ss-jump]');
      if(jump){
        const dest=document.getElementById('ssPaneTemplates');
        if(dest&&dest.scrollIntoView)dest.scrollIntoView({block:'start'});
        return;
      }

      /* The rail's account block hands over to the normal account UI. */
      if(t.closest('#ssAccount')){
        close();
        try{const chip=document.getElementById('userChip');if(chip)chip.click();}catch(e){}
        return;
      }

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

    /* Live filter as the user types, Excel-style. */
    el.addEventListener('input',function(ev){
      if(ev.target&&ev.target.id==='ssSearch')renderList();
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
        Array.prototype.forEach.call(el.querySelectorAll('[data-i18n-ph]'),function(n){
          n.placeholder=T(n.dataset.i18nPh);
        });
      }
      const gl=document.querySelector('.gsignLabel');
      if(gl&&typeof T==='function')gl.textContent=T('gsignLabel');
    }catch(e){}
  }

  let accountHooked=false;
  function init(){
    renderTemplates();
    wire();
    applyScreenI18n();
    /* Keep the rail's account block live when the user signs in or out. */
    try{
      if(!accountHooked&&typeof Account!=='undefined'&&Account.onChange){
        accountHooked=true;
        Account.onChange(function(){syncAccount();});
      }
    }catch(e){}
    syncAccount();
    /* Re-render template labels once the base i18n table is definitely loaded. */
    setTimeout(function(){applyScreenI18n();renderTemplates();syncAccount();},0);
  }

  return {open:open,close:close,isOpen:isOpen,init:init,render:render,
          rememberCurrent:rememberCurrent,applyTemplate:applyTemplate,
          toggleFavorite:toggleFavorite,recent:recent,favorites:favorites,
          /* Exposed so the File menu's Recent page can re-open a cloud workbook
             through the same path the start screen uses. */
          openCloudBook:openCloudBook,
          syncAccount:syncAccount,
          templates:TEMPLATES};
})();
