import fs from 'fs';
let ok = true;
function patch(file, from, to, label) {
  let s = fs.readFileSync(file, 'utf8');
  if (!s.includes(from)) { console.log('MISS: ' + label); ok = false; return; }
  s = s.replace(from, () => to);
  fs.writeFileSync(file, s, 'utf8');
  console.log('OK: ' + label);
}
/* 1. script.js — i18n keys */
patch('js/script.js',
  " addinClean:{np:'छिटो सफा (TRIM)',hi:'क्विक क्लीन (TRIM)',en:'Quick Clean (TRIM)'},",
  ` addinClean:{np:'छिटो सफा (TRIM)',hi:'क्विक क्लीन (TRIM)',en:'Quick Clean (TRIM)'},
 bThemeFonts:{np:'Aa फन्ट',hi:'Aa फ़ॉन्ट',en:'Fonts'},
 bThemeFx:{np:'प्रभाव',hi:'प्रभाव',en:'Effects'},
 fxSubtle:{np:'सामान्य',hi:'सूक्ष्म',en:'Subtle'},
 fxSoft:{np:'नरम',hi:'मुलायम',en:'Soft'},
 fxRound:{np:'गोल',hi:'गोलाकार',en:'Round'},
 fxSharp:{np:'तीखो',hi:'तेज़',en:'Sharp'},
 bPrintArea:{np:'प्रिन्ट क्षेत्र',hi:'प्रिंट क्षेत्र',en:'Print Area'},
 paSet:{np:'छानिएकोबाट सेट',hi:'चयन से सेट करें',en:'Set from selection'},
 paClear:{np:'प्रिन्ट क्षेत्र हटाउनु',hi:'प्रिंट क्षेत्र हटाएँ',en:'Clear Print Area'},
 bBreaks:{np:'ब्रेक',hi:'ब्रेक',en:'Breaks'},
 brkInsert:{np:'पेज ब्रेक घुसाउनु',hi:'पेज ब्रेक डालें',en:'Insert Page Break'},
 brkRemove:{np:'यो ब्रेक हटाउनु',hi:'यह ब्रेक हटाएँ',en:'Remove Page Break here'},
 brkReset:{np:'सबै ब्रेक रिसेट',hi:'सभी ब्रेक रीसेट',en:'Reset All Page Breaks'},
 bBgPic:{np:'पृष्ठभूमि',hi:'पृष्ठभूमि',en:'Background'},
 bgSet:{np:'URL बाट पृष्ठभूमि…',hi:'URL से पृष्ठभूमि…',en:'Background from URL…'},
 bgRemove:{np:'पृष्ठभूमि हटाउनु',hi:'पृष्ठभूमि हटाएँ',en:'Remove Background'},
 bPrintTitles:{np:'प्रिन्ट शीर्षक',hi:'प्रिंट शीर्षक',en:'Print Titles'},
 ptSet:{np:'माथिल्लो पङ्क्ति दोहोर्याउनु',hi:'ऊपरी पंक्ति दोहराएँ',en:'Repeat top row from selection'},
 ptClear:{np:'शीर्षक हटाउनु',hi:'शीर्षक हटाएँ',en:'Clear Print Titles'},`,
  'i18n keys');
/* 2. script.js — renderAll applies page-break rows */
patch('js/script.js',
  'positionFillPrev();renderDrawings();}',
  'positionFillPrev();renderDrawings();applyBreaks();}',
  'renderAll applyBreaks');
/* 3. script.js — wire the new buttons and selects */
patch('js/script.js',
  "   renderAll();setStatusMode(T('addinClean')+(n?' ('+n+')':''));}}]));",
  `   renderAll();setStatusMode(T('addinClean')+(n?' ('+n+')':''));}}]));
 /* --- Page Layout: fonts, effects, print area, breaks, background, titles, scale --- */
 tg('#bThemeFonts',()=>themeFontMenu($('#bThemeFonts')));
 tg('#bThemeFx',()=>fxMenu($('#bThemeFx')));
 tg('#bPrintArea',()=>printAreaMenu($('#bPrintArea')));
 tg('#bBreaks',()=>breaksMenu($('#bBreaks')));
 tg('#bBgPic',()=>bgMenu($('#bBgPic')));
 tg('#bPrintTitles',()=>titlesMenu($('#bPrintTitles')));
 const fw=$('#fitW');if(fw){fw.value=String(wb.fitW||'auto');
  fw.onchange=()=>{wb.fitW=fw.value==='auto'?undefined:+fw.value;saveLS();setStatusMode('fitW '+fw.value);};}
 const fh=$('#fitH');if(fh){fh.value=String(wb.fitH||'auto');
  fh.onchange=()=>{wb.fitH=fh.value==='auto'?undefined:+fh.value;saveLS();setStatusMode('fitH '+fh.value);};}
 const scl=$('#scScale');if(scl){scl.value=String(wb.zoom||1);
  scl.onchange=()=>{setZoom(+scl.value);scl.value=String(wb.zoom||1);};}`,
  'page-layout wiring');
if (!ok) process.exit(1);
console.log('PART 2 COMPLETE');