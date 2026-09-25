import fs from 'fs';

const F = 'js/script.js';
let s = fs.readFileSync(F, 'utf8');
let fail = 0;

/* remove the truncated titlesMenu fragment (its tail was consumed by the earlier bad patch) */
const before = s;
s = s.replace(/function titlesMenu\(anchor\)\{const r=rect\(\);[\s\S]*?\},\r?\n(?=function titlesMenu\()/, '');
if (s === before) { console.log('MISS: titlesMenu fragment'); fail = 1; } else console.log('OK: titlesMenu fragment removed');

const check = ['function init(', 'function setStatusMode', 'function applyNumDec', 'function applyLink',
  'function fnItemList', 'function insertFn', 'function explainActive', 'function nameMgrMenu', 'function armFormatPainter'];
for (const c of check) console.log((s.includes(c) ? 'OK   ' : 'MISS ') + c);
console.log('wirePageLayout defs: ' + (s.match(/function wirePageLayout/g) || []).length
  + '  titlesMenu defs: ' + (s.match(/function titlesMenu/g) || []).length
  + '  init defs: ' + (s.match(/function init\(/g) || []).length);

fs.writeFileSync(F, s, 'utf8');
if (fail) { console.log('PL FIX 9 FAILED'); process.exit(1); }
console.log('PL FIX 9 OK');
