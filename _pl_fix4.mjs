import fs from 'fs';
const f = 'js/script.js';
let s = fs.readFileSync(f, 'utf8');
const anchor = 'if(wb.accent){try{applyAccent(wb.accent);}catch(e){}}';
const add = `\n  if(wb.sheetFont){try{applyThemeFont(wb.sheetFont);}catch(e){}}\n  if(wb.fx&&wb.fx!=='subtle'){try{setFx(wb.fx);}catch(e){}}\n  try{applySheetBg();}catch(e){}`;
if (s.includes('applyThemeFont(wb.sheetFont);')) { console.log('ALREADY PATCHED'); process.exit(0); }
const i = s.indexOf(anchor);
if (i < 0) { console.log('MISS: accent anchor'); process.exit(1); }
s = s.slice(0, i + anchor.length) + add + s.slice(i + anchor.length);
fs.writeFileSync(f, s, 'utf8');
console.log('OK: init restore');
