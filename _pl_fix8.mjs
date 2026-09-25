import fs from 'fs';

const F = 'js/script.js';
let s = fs.readFileSync(F, 'utf8');
let fail = 0;
const sub = (re, to, label) => {
  const before = s;
  s = s.replace(re, () => to);
  if (s === before) { console.log('MISS: ' + label); fail = 1; } else console.log('OK: ' + label);
};

/* 1. drop the truncated titlesMenu fragment left over from the previous patch */
sub(/function titlesMenu\(anchor\)\{const r=rect\(\);[\s\S]*?ptClear'\);\}\}\},\r?\n(?=function titlesMenu\()/,
  '', 'titlesMenu fragment');

/* 2. orient menu goes through orientMenu() like the other Page Setup buttons */
sub(/tg\('#bOrient',\(\)=>popMenu\([\s\S]*?\}\]\)\);\r?\n/,
  " on('#bOrient',()=>orientMenu($('#bOrient')));\n", 'bOrient wiring');

/* 3. rebuild the end of initRibbon() and the head of init() that the failed regex removed */
const seam = ` tg('#bCut',()=>{clip.focus();});
 tg('#bCopy',()=>{clip.focus();});
 tg('#bPaste',()=>{clip.focus();});
 tg('#bFPainter',()=>armFormatPainter());
 document.querySelectorAll('[data-al]').forEach(b=>{b.onclick=()=>applyStyle({al:b.dataset.al});});
 $('#numfmt').onchange=e=>{applyStyle({numfmt:e.target.value});e.target.selectedIndex=0;};
 applyColW();applyZoom();applyView();applySheetOpts();setFx(wb.fx||'subtle');applySheetBg();applyPageSetup();syncRibbon();setBookName();}
function init(){
 let savedLang=null;try{savedLang=localStorage.getItem(LSKLANG);}catch(e){}
 LANG=['hi','np','en'].includes(savedLang)?savedLang:'en';
 buildGrid();
 try{const s=localStorage.getItem(LSKEY);wb=s?JSON.parse(s):defaultWB();}catch(e){wb=defaultWB();}
 if(!wb||!wb.sheets||!wb.sheets.length)wb=defaultWB();
 if(Array.isArray(wb.colW)&&wb.colW.length===COLS)colW=wb.colW;
 const langSel=$('#lang');langSel.value=LANG;langSel.onchange=()=>applyLang(langSel.value);
 applyLang(LANG);
 applyColW();
 initAI();
 initVoice();
 try{const th=wb.theme;if(th&&th!=='default')document.body.setAttribute('data-theme',th);}catch(e){}
 if(wb.accent){try{applyAccent(wb.accent);}catch(e){}}
 if(wb.sheetFont){try{applyThemeFont(wb.sheetFont);}catch(e){}}
 if(wb.fx&&wb.fx!=='subtle'){try{setFx(wb.fx);}catch(e){}}
`;
sub(/ wirePageLayout\(\);\r?\n initExtras\(\);\r?\n/, seam + ' initExtras();\n', 'initRibbon tail + init head');

/* 4. restore the helper functions whose definitions were removed with the broken region */
s += `
/* ================= Status bar, decimals, links, format painter, formula helpers ================= */
let fmtPaint=null;
function setStatusMode(t){const m=$('#sbMode');if(m)m.textContent=t;}
function applyNumDec(d){const q=rect();snapshot();const cs=sheet().cells;
 for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++){
  const ref=refOf(r,c);const cel=cs[ref]||{};const s2=Object.assign({},cel.s||{});
  const cur=s2.numdec==null?2:s2.numdec;const nxt=Math.min(8,Math.max(0,cur+d));
  s2.numdec=nxt;if(s2.numfmt!=='pct'&&s2.numfmt!=='comma')s2.numfmt='dec2';
  cel.s=s2;cs[ref]=cel;}
 saveLS();renderAll();}
function applyLink(u){const q=rect();snapshot();const cs=sheet().cells;
 for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++){
  const ref=refOf(r,c);const cel=cs[ref]||{};const s2=Object.assign({},cel.s||{});
  s2.link=u;s2.color='#0563c1';s2.u=true;cel.s=s2;cs[ref]=cel;}
 saveLS();renderAll();}
function applyFormatTo(ref,patch){if(!ref||!patch)return;snapshot();const cel=sheet().cells[ref]||{};
 cel.s=Object.assign({},cel.s||{},patch);sheet().cells[ref]=cel;saveLS();renderAll();}
function armFormatPainter(){fmtPaint=Object.assign({},styleOf(active));setStatusMode(T('sbPaint'));
 document.addEventListener('mousedown',fmtPaintPick,true);}
function fmtPaintPick(e){document.removeEventListener('mousedown',fmtPaintPick,true);
 const td=e.target&&e.target.closest?e.target.closest('#grid td'):null;
 if(td&&td.dataset&&td.dataset.ref&&fmtPaint)applyFormatTo(td.dataset.ref,fmtPaint);
 fmtPaint=null;syncRibbon();}
function fmtPaintApply(){if(!fmtPaint)return;applyFormatTo(active,fmtPaint);fmtPaint=null;setStatusMode(T('sbPaint'));}
function fnItemList(cat){const list=(cat&&cat!=='all'&&FN_CATS[cat])?FN_CATS[cat].slice():Object.keys(FN);
 return [{head:T('gFnLib')}].concat(list.map(n=>({label:n+(FN_HELP[n]?'  —  '+FN_HELP[n]:''),action:()=>insertFn(n)})));}
function insertFn(name){if(!name)return;const v='='+name+'(';
 if(gateEdit())return;setRaw(active,v);renderAll();startEdit(v);
 const inp=$('#cellEdit');if(inp){try{inp.setSelectionRange(v.length,v.length);}catch(e){}}
 wb.recentFns=[name].concat((wb.recentFns||[]).filter(x=>x!==name)).slice(0,8);saveLS();}
function fnInsertMenu(anchor){const c=$('#fnCat');popMenu(anchor,fnItemList(c?c.value:'all'));}
function explainActive(){const raw=rawOf(active);if(typeof raw!=='string'||raw[0]!=='=')return null;
 let toks=[];try{toks=tokenize(raw.slice(1));}catch(e){}
 const fns=[...new Set(toks.filter(t=>t.t==='fn').map(t=>t.v))].join(', ');
 const refs=toks.filter(t=>t.t==='ref').map(t=>refOf(t.r,t.c))
  .concat(toks.filter(t=>t.t==='rng').map(t=>refOf(t.r1,t.c1)+':'+refOf(t.r2,t.c2))).join(', ');
 return{formula:raw.slice(1),fns,refs};}
function nameMgrMenu(anchor){const names=wb.names||{},keys=Object.keys(names);
 const item=rg=>{const p=String(rg).split(':');
  active=selA=p[0].toUpperCase();selB=(p[1]||p[0]).toUpperCase();renderAll();syncRibbon();};
 const items=[{head:T('namesHead')}];
 if(keys.length)keys.forEach(k=>items.push({label:k+'  →  '+names[k],action:()=>{item(names[k]);setStatusMode(T('namesHead')+': '+k);}}));
 else items.push({head:'—'});
 items.push(null,{label:T('namesAdd'),action:()=>{const key=prompt(T('namesAsk'),'');
  if(!key)return;wb.names=wb.names||{};wb.names[key]=rangeA1(rect());saveLS();
  setStatusMode(T('namesHead')+': '+key);}});
 popMenu(anchor,items);}
`;

fs.writeFileSync(F, s, 'utf8');
if (fail) { console.log('PL FIX 8 FAILED'); process.exit(1); }
console.log('PL FIX 8 OK');

