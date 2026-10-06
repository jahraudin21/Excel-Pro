const fs = require('fs');
const s = fs.readFileSync('js/script.js', 'utf8');
const at = s.indexOf('const FN_CATS=');
const open = s.indexOf('{', at + 'FN_CATS'.length);
const close = s.indexOf('};', open);
const BS = String.fromCharCode(92);
let inStr = null;
for (let i = open; i < close + 2; i++) {
  const ch = s[i];
  if (inStr) { if (ch === BS) { i++; continue; } if (ch === inStr) { inStr = null; } continue; }
  if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; console.log('OPEN', ch, 'at', i, JSON.stringify(s.slice(i - 30, i + 30))); continue; }
}
console.log('final inStr:', inStr);
