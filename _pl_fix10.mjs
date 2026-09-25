import fs from 'fs';

const F = 'js/script.js';
let s = fs.readFileSync(F, 'utf8');
let fail = 0;
const sub = (re, to, label) => {
  const before = s;
  s = s.replace(re, () => to);
  if (s === before) { console.log('MISS: ' + label); fail = 1; } else console.log('OK: ' + label);
};

/* renderAll(): apply Sheet Options (gridlines / headings) on every render, like the print CSS */
sub(/positionFillPrev\(\);renderDrawings\(\);applyBreaks\(\);\}/,
  'positionFillPrev();renderDrawings();applySheetOpts();applyBreaks();}', 'renderAll sheet options');

/* applyView(): page layout / page break preview also refreshes the sheet options */
sub(/function applyView\(\)\{const g=\$\('#grid'\);if\(!g\)return;const m=wb\.view\|\|'normal';/,
  "function applyView(){const g=$('#grid');if(!g)return;const m=wb.view||'normal';\n applySheetOpts();", 'applyView sheet options');

fs.writeFileSync(F, s, 'utf8');
if (fail) { console.log('PL FIX 10 FAILED'); process.exit(1); }
console.log('PL FIX 10 OK');
