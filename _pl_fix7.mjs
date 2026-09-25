import fs from 'fs';

const F = 'js/script.js';
let s = fs.readFileSync(F, 'utf8');
let fail = 0;
const sub = (re, to, label) => {
  const before = s;
  s = s.replace(re, () => to);
  if (s === before) { console.log('MISS: ' + label); fail = 1; }
  else console.log('OK: ' + label);
};

/* 1. i18n keys for the Page Layout tab (np / hi / en) */
const KEYS = ` bTheme:{np:'थिम',hi:'थीम',en:'Themes'},
 bAccent:{np:'रङ',hi:'रंग',en:'Colors'},
 bMargins:{np:'मार्जिन',hi:'मार्जिन',en:'Margins'},
 bOrient:{np:'उन्मुखता',hi:'ओरिएंटेशन',en:'Orientation'},
 bSize:{np:'साइज',hi:'साइज़',en:'Size'},
 bPlPage:{np:'पेज दृश्य',hi:'पेज व्यू',en:'Page View'},
 bPlGrid:{np:'ग्रिडरेखा',hi:'ग्रिडलाइन',en:'Gridlines'},
 bPlHead:{np:'शीर्षकहरू',hi:'हेडिंग',en:'Headings'},
 bPlGridPrint:{np:'ग्रिडरेखा छाप्नु',hi:'ग्रिडलाइन प्रिंट करें',en:'Print gridlines'},
 bPlHeadPrint:{np:'शीर्षक छाप्नु',hi:'हेडिंग प्रिंट करें',en:'Print headings'},
 lblWidth:{np:'चौडाइ:',hi:'चौड़ाई:',en:'Width:'},
 lblHeight:{np:'उचाइ:',hi:'ऊँचाई:',en:'Height:'},
 lblScale:{np:'स्केल:',hi:'स्केल:',en:'Scale:'},
 lblView:{np:'हेर्न',hi:'व्यू',en:'View'},
 lblPrint:{np:'छाप्न',hi:'प्रिंट',en:'Print'},
 fitAuto:{np:'स्वतः',hi:'स्वचालित',en:'Automatic'},
 fitPage:{np:'पाना',hi:'पेज',en:'page(s)'},
 tipFitW:{np:'छापिएको कागज कति पाना चौडा बनाउने',hi:'प्रिंट कितने पेज चौड़ा हो',en:'Fit the printout to this many pages wide'},
 tipFitH:{np:'छापिएको कागज कति पाना अग्लो बनाउने',hi:'प्रिंट कितने पेज ऊँचा हो',en:'Fit the printout to this many pages tall'},
 tipScale:{np:'छाप्ने स्केल प्रतिशत',hi:'प्रिंट स्केल प्रतिशत',en:'Print scale percent'},
 tipScaleFit:{np:'स्केल Width/Height बाट गणना हुन्छ',hi:'स्केल Width/Height से तय होता है',en:'Scale is computed from Fit to — set Width/Height to Automatic to type a value'},
 psTitle:{np:'पेज सेटअप',hi:'पेज सेटअप',en:'Page Setup'},
 bPgSetupDlg:{np:'पेज सेटअप…',hi:'पेज सेटअप…',en:'Page Setup…'},
 psMoreSizes:{np:'थप कागज साइज…',hi:'और पेज साइज़…',en:'More Paper Sizes…'},
 pgOrient:{np:'उन्मुखता',hi:'ओरिएंटेशन',en:'Orientation'},
 margTop:{np:'माथि (cm)',hi:'ऊपर (cm)',en:'Top (cm)'},
 margBottom:{np:'तल (cm)',hi:'नीचे (cm)',en:'Bottom (cm)'},
 margLeft:{np:'बायाँ (cm)',hi:'बायाँ (cm)',en:'Left (cm)'},
 margRight:{np:'दायाँ (cm)',hi:'दायाँ (cm)',en:'Right (cm)'},
 margCenter:{np:'पानाको बीचमा',hi:'पेज के बीच में',en:'Center on page'},
 chkHoriz:{np:'तेर्सो',hi:'क्षैतिज',en:'Horizontally'},
 chkVert:{np:'ठाडो',hi:'लंबवत',en:'Vertically'},
 lblFitTo:{np:'फिट गर्ने',hi:'फिट करें',en:'Fit to'},
 lblPagesWide:{np:'पाना चौडा',hi:'पेज चौड़ा',en:'page(s) wide'},
 lblPagesTall:{np:'पाना अग्लो',hi:'पेज ऊँचा',en:'page(s) tall'},
 ptRows:{np:'माथि दोहोर्याउने पङ्क्ति',hi:'ऊपर दोहराने वाली पंक्तियाँ',en:'Rows to repeat at top'},
 ptCols:{np:'बायाँ दोहोर्याउने स्तम्भ',hi:'बाएँ दोहराने वाले कॉलम',en:'Columns to repeat at left'},
 psOk:{np:'ठीक',hi:'ठीक है',en:'OK'},
 psCancel:{np:'रद्द',hi:'रद्द करें',en:'Cancel'},
 psReset:{np:'रिसेट',hi:'रीसेट',en:'Reset'},
 psSaved:{np:'पेज सेटअप लागू भयो',hi:'पेज सेटअप लागू हुआ',en:'Page setup applied'},
 margCustom:{np:'अनुकूल मार्जिन…',hi:'कस्टम मार्जिन…',en:'Custom Margins…'},
 paAdd:{np:'प्रिन्ट क्षेत्रमा थप्नु',hi:'प्रिंट क्षेत्र में जोड़ें',en:'Add to Print Area'},
 brkRow:{np:'पङ्क्ति',hi:'पंक्ति',en:'row'},
 brkPreview:{np:'पेज ब्रेक पूर्वावलोकन',hi:'पेज ब्रेक प्रीव्यू',en:'Page Break Preview'},
 bgFile:{np:'फाइलबाट पृष्ठभूमि…',hi:'फ़ाइल से पृष्ठभूमि…',en:'Background from file…'},
 bgTooBig:{np:'छवि धेरै ठूलो (400KB सीमा)',hi:'छवि बहुत बड़ी (400KB सीमा)',en:'Image too large (400 KB limit)'},
 ptTopRow:{np:'माथिल्लो पङ्क्ति दोहोर्याउनु',hi:'ऊपरी पंक्ति दोहराएँ',en:'Repeat top row(s) from selection'},
 ptLeftCol:{np:'बायाँ स्तम्भ दोहोर्याउनु',hi:'बायाँ कॉलम दोहराएँ',en:'Repeat left column(s) from selection'},
 ptDialog:{np:'प्रिन्ट शीर्षक…',hi:'प्रिंट शीर्षक…',en:'Print Titles…'},
 thmReset:{np:'पूर्वनिर्धारितमा फर्काउनु',hi:'डिफ़ॉल्ट पर लौटाएँ',en:'Reset to default'},
 accCustom:{np:'आफ्नै रङ…',hi:'कस्टम रंग…',en:'Custom color…'},
`;
{
  const re = /(\n\s*ptClear:\{[^\n]*\n)/;
  if (!re.test(s)) { console.log('MISS: i18n keys'); fail = 1; }
  else { s = s.replace(re, m => m + KEYS); console.log('OK: i18n keys'); }
}

/* 2. syncRibbon: checkboxes + Scale select follow the workbook state */
sub(/t\('#bPlGrid',wb\.showGrid!==false\);t\('#bPlHead',wb\.showHead!==false\);/,
`{
  const chk=(id,v)=>{const el=$(id);if(el)el.checked=!!v;};
  chk('#bPlGrid',wb.showGrid!==false);chk('#bPlGridP',wb.printGrid!==false);
  chk('#bPlHead',wb.showHead!==false);chk('#bPlHeadP',wb.printHead!==false);
  syncScaleSelect();}`, 'syncRibbon sheet options');

/* 3. initRibbon: the whole Page Layout tab is wired by wirePageLayout() */
sub(/tg\('#bOrient',\(\)=>popMenu\([\s\S]*?\}\)\)\);\r?\n/, " on('#bOrient',()=>orientMenu($('#bOrient')));\n", 'bOrient wiring');
sub(/tg\('#bSize',\(\)=>popMenu\([\s\S]*?\}\)\)\)\);\r?\n/, " on('#bSize',()=>sizeMenu($('#bSize')));\n", 'bSize wiring');
sub(/tg\('#bMargins',\(\)=>popMenu\([\s\S]*?\}\)\)\)\);\r?\n/, " on('#bMargins',()=>marginsMenu($('#bMargins')));\n", 'bMargins wiring');
sub(/tg\('#bPlGrid',\(\)=>\{[\s\S]*?syncRibbon\(\);\}\);\r?\n\s*tg\('#bPlHead',\(\)=>\{[\s\S]*?syncRibbon\(\);\}\);\r?\n/,
  ' /* Sheet Options (gridlines / headings, view + print) are wired in wirePageLayout() */\n', 'sheet option stubs');
sub(/\s*tg\('#bTheme',\(\)=>themeMenu\(\$\('#bTheme'\)\)\);\r?\n\s*tg\('#bAccent',\(\)=>accentMenu\(\$\('#bAccent'\)\)\);\r?\n/,
  '\n', 'theme wiring stubs');
sub(/\/\* --- Page Layout: fonts[\s\S]*?const scl=\$\('#scScale'\);if\(scl\)\{[\s\S]*?\}\}\r?\n/,
  ' /* --- Page Layout tab (Themes, Page Setup, Scale to Fit, Sheet Options) --- */\n wirePageLayout();\n', 'page layout wiring block');

/* 4. the old Page Setup primitives move to the Page Layout section */
sub(/function applyPageSetup\(\)\{[\s\S]*?saveLS\(\);applyPageSetup\(\);\}\r?\n/, '', 'old page setup primitives');

/* 5. restore persisted theme font on boot */
{
  const re = /(if\(wb\.accent\)\{try\{applyAccent\(wb\.accent\);\}catch\(e\)\{\}\r?\n)/;
  if (!re.test(s)) { console.log('MISS: theme font restore'); fail = 1; }
  else { s = s.replace(re, m => m + '  if(wb.sheetFont){try{applyThemeFont(wb.sheetFont);}catch(e){}}\n'); console.log('OK: theme font restore'); }
}

/* 6. apply sheet options + wire the tab when the ribbon boots */
sub(/applyColW\(\);applyZoom\(\);applyView\(\);applyPageSetup\(\);syncRibbon\(\);setBookName\(\);\}/,
  'applyColW();applyZoom();applyView();applySheetOpts();setFx(wb.fx||"subtle");applySheetBg();wirePageLayout();applyPageSetup();syncRibbon();setBookName();}',
  'ribbon boot');

/* 7. Themes / Colors menus: Excel-style gallery with swatches + reset */
sub(/function themeMenu\(anchor\)\{popMenu\(anchor,THEMES\.map\([\s\S]*?\}\)\)\);\}/,
`function themeMenu(anchor){const cur=wb.theme||'default';
 const DOT={default:'🟩',light:'⬜',dark:'⬛',solar:'🟨'};
 popMenu(anchor,[{head:T('bTheme')}].concat(
  THEMES.map(t=>({label:(cur===t[0]?'✔ ':'')+(DOT[t[0]]||'⬜')+' '+t[1],action:()=>{applyTheme(t[0]);setStatusMode(T('bTheme')+': '+t[1]);}})),
  [null,{label:T('thmReset')+' — '+T('bTheme'),action:()=>{applyTheme('default');setStatusMode(T('thmReset'));}}]));}`, 'themeMenu');
sub(/\{head:'Colors'\}/, "{head:T('bAccent')}", 'accent menu head');
sub(/\{label:'Custom…'/, "{label:T('accCustom')", 'accent custom label');
sub(/inp\.click\(\);\}\}\);\r?\n/,
`inp.click();}});
 items.push(null,{label:T('thmReset')+' — '+T('bAccent'),action:()=>{applyAccent('#217346');setStatusMode(T('thmReset'));}});
`, 'accent reset item');

/* 8. replace the old Page Layout tail with the new implementation (part A: themes + page setup core) */
const A1 = `
/* ================= Page Layout: Themes, Page Setup, Scale to Fit, Sheet Options ================= */
/* --- Themes: theme fonts + effects (theme & accent live in the Themes & accent colors section) --- */
function applyThemeFont(f){const m=String(f||'').replace(/[^\\w \\-]/g,'').trim();
 if(!m){document.documentElement.style.removeProperty('--sheet-font');grid.style.fontFamily='';wb.sheetFont='';return;}
 grid.style.fontFamily=m;document.documentElement.style.setProperty('--sheet-font',m);}
function themeFontMenu(anchor){const cur=wb.sheetFont||'Segoe UI';
 popMenu(anchor,[{head:T('bThemeFonts')}].concat(
  ['Segoe UI','Calibri','Arial','Tahoma','Verdana','Georgia','Times New Roman','Trebuchet MS','Consolas','Courier New'].map(f=>
   ({label:(f===cur?'✔ ':'')+f,action:()=>{wb.sheetFont=f;saveLS();applyThemeFont(f);setStatusMode(T('bThemeFonts')+': '+f);}})),
  [null,{label:T('thmReset')+' — '+T('bThemeFonts'),action:()=>{wb.sheetFont='';saveLS();applyThemeFont('');setStatusMode(T('thmReset'));}}]));}
function setFx(name){if(!name||name==='subtle')document.body.removeAttribute('data-fx');
 else document.body.setAttribute('data-fx',name);
 wb.fx=name||'subtle';}
function fxMenu(anchor){const cur=wb.fx||'subtle';
 popMenu(anchor,[{head:T('bThemeFx')}].concat(
  [['subtle','fxSubtle'],['soft','fxSoft'],['round','fxRound'],['sharp','fxSharp']].map(x=>
   ({label:(cur===x[0]?'✔ ':'')+T(x[1]),action:()=>{setFx(x[0]);saveLS();setStatusMode(T('bThemeFx')+': '+T(x[1]));}}))));}

/* --- Page Setup: paper size, margins, orientation --- */
const PAPER_MM={A4:[210,297],A3:[297,420],A5:[148,210],Letter:[215.9,279.4],Legal:[215.9,355.6],Tabloid:[279.4,431.8]};
const MARGIN_PRESETS={normal:{top:1.9,bottom:1.9,left:1.8,right:1.8},narrow:{top:1.27,bottom:1.27,left:1.27,right:1.27},wide:{top:2.54,bottom:2.54,left:2.54,right:2.54}};
const PS_DEFAULTS={orientation:'portrait',size:'A4',margin:'normal',centerH:false,centerV:false};
function pageSetup(){const ps=Object.assign({},PS_DEFAULTS,wb.pageSetup||{});
 ps.margins=Object.assign({},MARGIN_PRESETS[ps.margin]||MARGIN_PRESETS.normal,ps.margins||{});
 wb.pageSetup=ps;return ps;}
function curMargins(){return pageSetup().margins;}
function setPageSetup(patch){const ps=pageSetup();Object.assign(ps,patch||{});
 if(patch&&patch.margin&&MARGIN_PRESETS[patch.margin])ps.margins=Object.assign({},MARGIN_PRESETS[patch.margin]);
 saveLS();applyPageSetup();syncRibbon();}
/* --- Page Setup: print area, page breaks, sheet options --- */
function plainA1(t){return String(t||'').replace(/\\$/g,'');}
function printScalePct(){return clamp(Math.round(+wb.printScale||100),10,400);}
function printAreaRG(){if(!wb.printArea)return null;try{return rangeFromStr(plainA1(wb.printArea));}catch(e){return null;}}
function unionA1(a,b){if(!a)return b;if(!b)return a;
 try{const A=rangeFromStr(plainA1(a)),B=rangeFromStr(plainA1(b));
  return rangeA1({r1:Math.min(A.r1,B.r1),r2:Math.max(A.r2,B.r2),c1:Math.min(A.c1,B.c1),c2:Math.max(A.c2,B.c2)});}catch(e){return b;}}
function usedRG(){const rg=printAreaRG();if(rg)return rg;
 let r2=-1,c2=-1;const cs=sheet().cells;
 for(const ref in cs){const cel=cs[ref];if(!cel||cel.raw==null||cel.raw==='')continue;
  const p=refToRC(ref);if(p.r>r2)r2=p.r;if(p.c>c2)c2=p.c;}
 return r2<0?null:{r1:0,c1:0,r2,c2};}
function titleRows(){const m=/^\\$?(\\d+)(?:\\s*:\\s*\\$?(\\d+))?$/.exec(String(wb.printTitles||'').replace(/\\s/g,''));
 if(!m)return null;const a=clamp(+m[1]-1,0,ROWS-1),b=clamp(+(m[2]||m[1])-1,0,ROWS-1);return[a,b];}
function applyBreaks(){const arr=wb.breaks||[],rg=printAreaRG(),tr=titleRows();
 const body=grid.tBodies&&grid.tBodies[0];if(!body)return;
 const rows=body.rows;
 for(let i=0;i<rows.length;i++){const row=rows[i];
  row.classList.toggle('brk',arr.includes(i));
  row.classList.toggle('paout',!!rg&&(i<rg.r1||i>rg.r2));
  row.classList.toggle('ptitle',!!tr&&i>=tr[0]&&i<=tr[1]);}}
`;
/* 9. part A2: fit-to-pages + generated print stylesheet */
const A2 = `/* --- Page Setup: fit-to-pages and the generated print stylesheet --- */
function fitScaleFactor(){if(!(wb.fitW||wb.fitH))return null;
 const rg=usedRG();if(!rg)return 1;
 const ps=pageSetup(),m=curMargins(),pmm=PAPER_MM[ps.size]||PAPER_MM.A4;
 const land=ps.orientation==='landscape';
 const pw=(land?pmm[1]:pmm[0])*3.7795,ph=(land?pmm[0]:pmm[1])*3.7795;
 const usableW=Math.max(60,pw-((+m.left||0)+(+m.right||0))*37.795);
 const usableH=Math.max(60,ph-((+m.top||0)+(+m.bottom||0))*37.795);
 let w=34;for(let c=rg.c1;c<=rg.c2;c++)w+=(colW[c]||88);
 const ht=(rg.r2-rg.r1+1)*22+22;
 const sx=wb.fitW?usableW/w:1,sy=wb.fitH?usableH/ht:1;
 return clamp(Math.min(sx,sy),0.1,1);}
function printPlan(){const fit=fitScaleFactor();
 return{pct:fit!=null?clamp(Math.round(fit*100),10,400):printScalePct(),fit:fit!=null};}
function applyPageSetup(){
 let st=$('#pgSetup');if(!st){st=document.createElement('style');st.id='pgSetup';document.head.appendChild(st);}
 const ps=pageSetup(),m=curMargins(),plan=printPlan();
 const rules=['@page{size:'+(ps.size||'A4')+(ps.orientation==='landscape'?' landscape':' portrait')+';margin:'+(+m.top||0)+'cm '+(+m.right||0)+'cm '+(+m.bottom||0)+'cm '+(+m.left||0)+'cm}'];
 if(plan.pct!==100)rules.push('#grid{zoom:'+(plan.pct/100).toFixed(3)+'}');
 rules.push(wb.printGrid===false?'#grid td,#grid th{border-color:transparent!important}'
  :'table#grid.nogrid td,table#grid.nogrid th{border-color:#d4d4d4!important}');
 rules.push(wb.printHead===false?'#grid thead,#grid tbody th{display:none!important}'
  :'table#grid.nohead thead{display:table-header-group!important}table#grid.nohead tbody th{display:table-cell!important}');
 if(ps.centerH||ps.centerV)rules.push('#grid{'+(ps.centerH?'margin-left:auto;margin-right:auto;':'')+(ps.centerV?'margin-top:auto;margin-bottom:auto;':'')+'}');
 const rg=printAreaRG();
 if(rg){
  if(rg.r1>0)rules.push('#grid tbody tr:nth-child(-n+'+rg.r1+'){display:none!important}');
  rules.push('#grid tbody tr:nth-child(n+'+(rg.r2+2)+'){display:none!important}');
  if(rg.c1>0)rules.push('#grid tbody tr td:nth-child(-n+'+(rg.c1+1)+'){display:none!important}');
  rules.push('#grid tbody tr td:nth-child(n+'+(rg.c2+3)+'){display:none!important}');}
 st.textContent='@media print{'+rules.join('')+'}';}
function applySheetOpts(){if(!grid)return;
 grid.classList.toggle('nogrid',wb.showGrid===false);
 grid.classList.toggle('nohead',wb.showHead===false);
 applyPageSetup();}
`;
/* 10. part B1: Page Setup menus (orientation, size, margins, print area, breaks, background, titles) */
const B1 = `/* --- Page Setup menus --- */
function orientMenu(anchor){const cur=pageSetup().orientation;
 popMenu(anchor,[{head:T('bOrient')},
  {label:(cur!=='landscape'?'✔ ':'')+T('orientP'),action:()=>{setPageSetup({orientation:'portrait'});setStatusMode(T('bOrient')+': '+T('orientP'));}},
  {label:(cur==='landscape'?'✔ ':'')+T('orientL'),action:()=>{setPageSetup({orientation:'landscape'});setStatusMode(T('bOrient')+': '+T('orientL'));}}]);}
function sizeMenu(anchor){const cur=pageSetup().size;const items=[{head:T('pgSize')}];
 Object.keys(PAPER_MM).forEach(k=>items.push({label:(cur===k?'✔ ':'')+k,action:()=>{setPageSetup({size:k});setStatusMode(T('pgSize')+': '+k);}}));
 items.push(null,{label:T('psMoreSizes'),action:openPageSetup});
 popMenu(anchor,items);}
function marginsMenu(anchor){const ps=pageSetup(),m=curMargins(),f=v=>Math.round(v*100)/100;
 const items=[{head:T('bMargins')},{head:'↑ '+f(m.top)+'   ↓ '+f(m.bottom)+'   ← '+f(m.left)+'   → '+f(m.right)+' cm'}];
 [['normal','margNormal'],['narrow','margNarrow'],['wide','margWide']].forEach(x=>items.push(
  {label:(ps.margin===x[0]?'✔ ':'')+T(x[1]),action:()=>{setPageSetup({margin:x[0],margins:Object.assign({},MARGIN_PRESETS[x[0]])});setStatusMode(T('bMargins')+': '+T(x[1]));}}));
 items.push(null,{label:T('margCustom'),action:openPageSetup});
 popMenu(anchor,items);}
function printAreaMenu(anchor){const sel=plainA1(rangeA1(rect())),cur=wb.printArea;
 const done=msg=>{saveLS();renderAll();syncRibbon();setStatusMode(msg);};
 popMenu(anchor,[{head:cur?T('bPrintArea')+' — '+cur:T('bPrintArea')},
  {label:(cur?'':'✔ ')+T('paSet')+'   ['+sel+']',action:()=>{wb.printArea=sel;done(T('bPrintArea')+': '+sel);}},
  {label:T('paAdd')+'   ['+sel+']',action:()=>{wb.printArea=unionA1(wb.printArea,sel);done(T('bPrintArea')+': '+wb.printArea);}},
  null,
  {label:T('paClear'),action:()=>{delete wb.printArea;done(T('paClear'));}}]);}
function breaksMenu(anchor){wb.breaks=wb.breaks||[];const row=rect().r1,has=wb.breaks.includes(row),brk=(wb.view||'normal')==='break';
 popMenu(anchor,[{head:T('bBreaks')+' — '+T('brkRow')+' '+(row+1)},
  {label:(has?'✔ ':'')+T('brkInsert'),action:()=>{if(!has){wb.breaks.push(row);wb.breaks.sort((a,b)=>a-b);}saveLS();renderAll();syncRibbon();setStatusMode(T('brkInsert')+' @'+(row+1));}},
  {label:T('brkRemove'),action:()=>{const i=wb.breaks.indexOf(row);if(i>=0){wb.breaks.splice(i,1);saveLS();renderAll();}setStatusMode(T('brkRemove')+' @'+(row+1));}},
  null,
  {label:(brk?'✔ ':'')+T('brkPreview'),action:()=>setViewMode(brk?'normal':'break')},
  {label:T('brkReset'),action:()=>{wb.breaks=[];saveLS();renderAll();setStatusMode(T('brkReset'));}}]);}
function applySheetBg(){const wrap=$('#gridwrap');if(!wrap)return;
 if(wb.bgUrl){wrap.style.backgroundImage='url("'+String(wb.bgUrl).replace(/["\\\\\\n]/g,'')+'")';wrap.classList.add('pgbg');}
 else{wrap.style.backgroundImage='';wrap.classList.remove('pgbg');}}
function pickBgFile(){const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.style.display='none';
 document.body.appendChild(inp);
 inp.onchange=()=>{const f=inp.files&&inp.files[0];
  if(!f){inp.remove();return;}
  if(f.size>400000){setStatusMode(T('bgTooBig'));inp.remove();return;}
  const fr=new FileReader();
  fr.onload=()=>{wb.bgUrl=String(fr.result);saveLS();applySheetBg();setStatusMode(T('bBgPic')+': '+f.name);inp.remove();};
  fr.readAsDataURL(f);};
 inp.click();}
function bgMenu(anchor){popMenu(anchor,[{head:T('bBgPic')},
  {label:T('bgFile'),action:pickBgFile},
  {label:T('bgSet'),action:()=>{const u=prompt(T('bgSet'),wb.bgUrl&&wb.bgUrl.slice(0,5)!=='data:'?wb.bgUrl:'https://');
   if(u){wb.bgUrl=u;saveLS();applySheetBg();setStatusMode(T('bBgPic'));}}},
  null,
  {label:T('bgRemove'),action:()=>{delete wb.bgUrl;saveLS();applySheetBg();setStatusMode(T('bgRemove'));}}]);}
function titlesMenu(anchor){const r=rect();
 const rows='$'+(r.r1+1)+':$'+(Math.min(ROWS,r.r2+1)),cols='$'+colName(r.c1)+':$'+colName(r.c2);
 popMenu(anchor,[{head:T('bPrintTitles')},
  {label:T('ptTopRow')+'   ['+rows+']',action:()=>{wb.printTitles=rows;saveLS();renderAll();syncRibbon();setStatusMode(T('bPrintTitles')+': '+rows);}},
  {label:T('ptLeftCol')+'   ['+cols+']',action:()=>{wb.printTitlesCol=cols;saveLS();renderAll();syncRibbon();setStatusMode(T('bPrintTitles')+': '+cols);}},
  null,
  {label:T('ptClear'),action:()=>{delete wb.printTitles;delete wb.printTitlesCol;saveLS();renderAll();syncRibbon();setStatusMode(T('ptClear'));}},
function titlesMenu(anchor){const r=rect();
 const rows='$'+(r.r1+1)+':$'+(Math.min(ROWS,r.r2+1)),cols='$'+colName(r.c1)+':$'+colName(r.c2);
 popMenu(anchor,[{head:T('bPrintTitles')},
  {label:T('ptTopRow')+'   ['+rows+']',action:()=>{wb.printTitles=rows;saveLS();renderAll();syncRibbon();setStatusMode(T('bPrintTitles')+': '+rows);}},
  {label:T('ptLeftCol')+'   ['+cols+']',action:()=>{wb.printTitlesCol=cols;saveLS();renderAll();syncRibbon();setStatusMode(T('bPrintTitles')+': '+cols);}},
  null,
  {label:T('ptClear'),action:()=>{delete wb.printTitles;delete wb.printTitlesCol;saveLS();renderAll();syncRibbon();setStatusMode(T('ptClear'));}},
  {label:T('ptDialog'),action:openPageSetup}]);}
`;
/* 11. part B2: Scale to Fit + Page Setup dialog + tab wiring */
const B2 = `/* --- Scale to Fit --- */
function fitOn(){return !!(wb.fitW||wb.fitH);}
function setFit(which,val){const n=val==='auto'?0:clamp(parseInt(val,10)||0,0,9);
 if(which==='w')wb.fitW=n||undefined;else wb.fitH=n||undefined;
 saveLS();renderAll();syncRibbon();}
function setPrintScale(p){wb.printScale=clamp(Math.round(+p||100),10,400);saveLS();renderAll();syncRibbon();}
function syncScaleSelect(){const ss=$('#scScale');if(!ss)return;
 if(fitOn()){ss.value='100';ss.disabled=true;ss.title=T('tipScaleFit');return;}
 ss.disabled=false;ss.title=T('tipScale');
 const val=String(printScalePct());
 if(!Array.prototype.some.call(ss.options,o=>o.value===val)){const o=document.createElement('option');o.value=val;o.textContent=val+'%';ss.appendChild(o);}
 ss.value=val;}
/* --- Page Setup dialog (dialog launcher + Custom Margins / Print Titles entry points) --- */
function fillPaperSizes(){const sel=$('#psSize');if(!sel||sel.options.length)return;
 Object.keys(PAPER_MM).forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=k;sel.appendChild(o);});}
function openPageSetup(){const d=$('#psDlg');if(!d)return;
 fillPaperSizes();
 const ps=pageSetup(),m=curMargins();
 const set=(id,v)=>{const el=$(id);if(el)el.value=v;},chk=(id,v)=>{const el=$(id);if(el)el.checked=!!v;};
 set('#psOrient',ps.orientation||'portrait');set('#psSize',ps.size||'A4');
 set('#psTop',+m.top);set('#psBottom',+m.bottom);set('#psLeft',+m.left);set('#psRight',+m.right);
 chk('#psCenterH',ps.centerH);chk('#psCenterV',ps.centerV);
 set('#psScale',printScalePct());set('#psFitW',wb.fitW||'');set('#psFitH',wb.fitH||'');
 set('#psTitleRows',wb.printTitles||'');set('#psTitleCols',wb.printTitlesCol||'');
 d.classList.add('open');
 const ok=$('#psOk');if(ok&&ok.focus){try{ok.focus();}catch(e){}}}
function closePageSetup(){const d=$('#psDlg');if(d)d.classList.remove('open');}
function numField(id,def){const el=$(id);if(!el)return def;const v=parseFloat(el.value);return isFinite(v)?v:def;}
function fieldVal(id){const el=$(id);return el&&el.value!=null?String(el.value).trim():'';}
function savePageSetupDialog(){
 const margins={top:clamp(numField('#psTop',1.9),0,10),bottom:clamp(numField('#psBottom',1.9),0,10),
  left:clamp(numField('#psLeft',1.8),0,10),right:clamp(numField('#psRight',1.8),0,10)};
 const oEl=$('#psOrient'),sEl=$('#psSize');
 setPageSetup({orientation:(oEl&&oEl.value)==='landscape'?'landscape':'portrait',size:(sEl&&sEl.value)||'A4',
  margin:'custom',margins,
  centerH:!!($('#psCenterH')&&$('#psCenterH').checked),centerV:!!($('#psCenterV')&&$('#psCenterV').checked)});
 wb.printScale=clamp(Math.round(numField('#psScale',100)),10,400);
 const fw=Math.round(numField('#psFitW',0)),fh=Math.round(numField('#psFitH',0));
 wb.fitW=fw>0?clamp(fw,1,9):undefined;
 wb.fitH=fh>0?clamp(fh,1,9):undefined;
 wb.printTitles=fieldVal('#psTitleRows')||undefined;
 wb.printTitlesCol=fieldVal('#psTitleCols')||undefined;
 saveLS();renderAll();syncRibbon();closePageSetup();setStatusMode(T('psSaved'));}
function resetPageSetupDialog(){
 wb.pageSetup=Object.assign({},PS_DEFAULTS,{margins:Object.assign({},MARGIN_PRESETS.normal)});
 delete wb.printArea;wb.printScale=100;delete wb.fitW;delete wb.fitH;
 delete wb.printTitles;delete wb.printTitlesCol;wb.breaks=[];wb.printGrid=true;wb.printHead=true;
 saveLS();renderAll();syncRibbon();openPageSetup();setStatusMode(T('psReset'));}
`;
/* 12. part B3: the tab wiring (called from initRibbon) */
const B3 = `/* --- Page Layout tab wiring (buttons, check boxes, selects, dialog) --- */
function wirePageLayout(){const on=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
 on('#bTheme',()=>themeMenu($('#bTheme')));on('#bAccent',()=>accentMenu($('#bAccent')));
 on('#bThemeFonts',()=>themeFontMenu($('#bThemeFonts')));on('#bThemeFx',()=>fxMenu($('#bThemeFx')));
 on('#bMargins',()=>marginsMenu($('#bMargins')));on('#bOrient',()=>orientMenu($('#bOrient')));
 on('#bSize',()=>sizeMenu($('#bSize')));on('#bPrintArea',()=>printAreaMenu($('#bPrintArea')));
 on('#bBreaks',()=>breaksMenu($('#bBreaks')));on('#bBgPic',()=>bgMenu($('#bBgPic')));
 on('#bPrintTitles',()=>titlesMenu($('#bPrintTitles')));on('#bPgSetup',openPageSetup);
 on('#bPlPage',pagePreview);on('#bPlPrint',()=>window.print());
 const chk=(id,key,lbl)=>{const el=$(id);if(!el)return;
  el.onchange=()=>{wb[key]=el.checked;saveLS();renderAll();syncRibbon();
   setStatusMode(T(lbl)+': '+(el.checked?'✓':'✗'));};};
 chk('#bPlGrid','showGrid','bPlGrid');chk('#bPlGridP','printGrid','bPlGridPrint');
 chk('#bPlHead','showHead','bPlHead');chk('#bPlHeadP','printHead','bPlHeadPrint');
 const fw=$('#fitW');if(fw)fw.onchange=()=>{setFit('w',fw.value);
  setStatusMode(T('lblWidth')+' '+(fw.value==='auto'?T('fitAuto'):fw.value+' '+T('fitPage')));};
 const fh=$('#fitH');if(fh)fh.onchange=()=>{setFit('h',fh.value);
  setStatusMode(T('lblHeight')+' '+(fh.value==='auto'?T('fitAuto'):fh.value+' '+T('fitPage')));};
 const ss=$('#scScale');if(ss)ss.onchange=()=>{setPrintScale(ss.value);setStatusMode(T('lblScale')+' '+printScalePct()+'%');};
 const ok=$('#psOk');if(ok)ok.onclick=savePageSetupDialog;
 const ca=$('#psCancel');if(ca)ca.onclick=closePageSetup;
 const cl=$('#psClose');if(cl)cl.onclick=closePageSetup;
 const rs=$('#psReset');if(rs)rs.onclick=resetPageSetupDialog;
 syncScaleSelect();}
`;

/* 13. swap the old Page Layout tail for the new implementation */
const MARK = '/* ================= Page Layout: theme fonts, effects, print area, breaks, background, titles ================= */';
const i = s.indexOf(MARK);
if (i < 0) { console.log('MISS: page layout tail marker'); fail = 1; }
else { s = s.slice(0, i) + A1 + A2 + B1 + B2 + B3; console.log('OK: page layout tail replaced'); }

fs.writeFileSync(F, s, 'utf8');
if (fail) { console.log('PL FIX 7 FAILED'); process.exit(1); }
console.log('PL FIX 7 OK');







