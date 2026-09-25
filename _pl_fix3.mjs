import fs from 'fs';
let ok = true;
function patch(file, from, to, label) {
  let s = fs.readFileSync(file, 'utf8');
  if (!s.includes(from)) { console.log('MISS: ' + label); ok = false; return; }
  s = s.replace(from, () => to);
  fs.writeFileSync(file, s, 'utf8');
  console.log('OK: ' + label);
}
/* 1. script.js — restore persisted theme settings on init */
patch('js/script.js',
  "  if(wb.accent){try{applyAccent(wb.accent);}catch(e){}}\n",
  `  if(wb.accent){try{applyAccent(wb.accent);}catch(e){}}
  if(wb.sheetFont){try{applyThemeFont(wb.sheetFont);}catch(e){}}
  if(wb.fx&&wb.fx!=='subtle'){try{setFx(wb.fx);}catch(e){}}
  try{applySheetBg();}catch(e){}\n`,
  'init restore');
/* 2. script.js — new Page Layout functions */
fs.appendFileSync('js/script.js', `

/* ================= Page Layout: theme fonts, effects, print area, breaks, background, titles ================= */
function applyThemeFont(f){if(!f){document.documentElement.style.removeProperty('--sheet-font');grid.style.fontFamily='';return;}
 grid.style.fontFamily=f;document.documentElement.style.setProperty('--sheet-font',f);}
function themeFontMenu(anchor){const cur=wb.sheetFont||'';
 popMenu(anchor,['Segoe UI','Calibri','Arial','Georgia','Times New Roman','Verdana','Courier New'].map(f=>(
  {label:(f===cur?'✔ ':'')+f,action:()=>{wb.sheetFont=f;saveLS();applyThemeFont(f);setStatusMode('font: '+f);}})));}
function setFx(name){if(!name||name==='subtle')document.body.removeAttribute('data-fx');
 else document.body.setAttribute('data-fx',name);
 wb.fx=name||'subtle';saveLS();}
function fxMenu(anchor){const cur=wb.fx||'subtle';
 popMenu(anchor,[['subtle','fxSubtle'],['soft','fxSoft'],['round','fxRound'],['sharp','fxSharp']].map(x=>(
  {label:(cur===x[0]?'✔ ':'')+T(x[1]),action:()=>{setFx(x[0]);setStatusMode(T(x[1]));}})));}
function applyBreaks(){const arr=wb.breaks||[];
 grid.querySelectorAll('tbody tr').forEach((tr,i)=>tr.classList.toggle('brk',arr.includes(i)));}
function breaksMenu(anchor){wb.breaks=wb.breaks||[];const row=rect().r1;const has=wb.breaks.includes(row);
 popMenu(anchor,[
  {label:(has?'✔ ':'')+T('brkInsert'),action:()=>{if(!has){wb.breaks.push(row);wb.breaks.sort((a,b)=>a-b);}saveLS();renderAll();setStatusMode(T('brkInsert')+' @'+(row+1));}},
  {label:T('brkRemove'),action:()=>{const i=wb.breaks.indexOf(row);
   if(i>=0){wb.breaks.splice(i,1);saveLS();renderAll();}setStatusMode(T('brkRemove')+' @'+(row+1));}},
  {label:T('brkReset'),action:()=>{wb.breaks=[];saveLS();renderAll();setStatusMode(T('brkReset'));}}]);}
function printAreaMenu(anchor){popMenu(anchor,[
  {label:T('paSet')+(wb.printArea?' — '+wb.printArea:''),action:()=>{wb.printArea=rangeA1(rect());saveLS();setStatusMode(T('bPrintArea')+': '+wb.printArea);}},
  {label:T('paClear'),action:()=>{delete wb.printArea;saveLS();setStatusMode(T('paClear'));}}]);}
function applySheetBg(){const wrap=$('#gridwrap');if(!wrap)return;
 if(wb.bgUrl){wrap.style.backgroundImage='url("'+wb.bgUrl+'")';wrap.classList.add('pgbg');}
 else{wrap.style.backgroundImage='';wrap.classList.remove('pgbg');}}
function bgMenu(anchor){popMenu(anchor,[
  {label:T('bgSet'),action:()=>{const u=prompt(T('bgSet'),wb.bgUrl||'https://');
   if(u){wb.bgUrl=u;saveLS();applySheetBg();}}},
  {label:T('bgRemove'),action:()=>{delete wb.bgUrl;saveLS();applySheetBg();}}]);}
function titlesMenu(anchor){popMenu(anchor,[
  {label:T('ptSet')+(wb.printTitles?' — '+wb.printTitles:''),action:()=>{wb.printTitles='$'+(rect().r1+1)+':$'+(rect().r1+1);saveLS();setStatusMode(T('bPrintTitles')+': '+wb.printTitles);}},
  {label:T('ptClear'),action:()=>{delete wb.printTitles;saveLS();setStatusMode(T('ptClear'));}}]);}
`, 'utf8');
console.log('OK: page-layout functions');
if (!ok) process.exit(1);
console.log('PART 3 COMPLETE');