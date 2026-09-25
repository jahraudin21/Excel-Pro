import fs from 'fs';
const p = 'c:/New folder/index.html';
let h = fs.readFileSync(p, 'utf8');
const NL = '\r\n';
const good = "  fillNoFmt:{np:'ढाँचा बिना भर्नुहोस्',hi:'फ़ॉर्मैटिंग के बिना भरें',en:'Fill Without Formatting'}," + NL +
"  fillCancel:{np:'रद्द',hi:'रद्द करें',en:'Cancel'}," + NL +
"  bTable:{np:'तालिका',hi:'तालिका',en:'Table'}," + NL;
const start = h.indexOf("fillNoFmt");
const anchor = h.indexOf("bRecTbl");
console.log('start:', start, 'anchor:', anchor);
const ls = h.lastIndexOf(NL, start);
if (start < 0 || anchor < 0) { console.log('MARKERS NOT FOUND'); process.exit(1); }
h = h.slice(0, ls + NL.length) + good + h.slice(anchor - 2);
fs.writeFileSync(p, h);
console.log('fixed, length:', h.length);