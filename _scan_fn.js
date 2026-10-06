/* Scratch: load script.js's formula engine region and report which FN_CATS
 * names are genuinely implemented on FN (ground truth, no regex guessing). */
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('js/script.js', 'utf8');

/* Take everything from the formula-engine banner up to (but excluding) the
 * first DOM-dependent section, so FN/FN_CATS are defined without a document. */
const start = src.indexOf('/* ================= formula engine');
const end = src.indexOf('function dataRange');
if (start < 0 || end < 0) { console.log('anchors not found', start, end); process.exit(1); }

const ctx = { console, Math, JSON, Object, Array, String, Number, isNaN, parseInt, parseFloat, Date, grid: {}, document: { createElement: () => ({ style: {} }) } };
vm.createContext(ctx);
try {
  vm.runInContext(src.slice(start, end) + '\n;globalThis.__out={FN,FN_CATS};', ctx);
} catch (e) {
  console.log('eval error:', e.message);
}

const out = ctx.__out;

const FN = out && out.FN, FN_CATS = out && out.FN_CATS;
if (!FN || !FN_CATS) { console.log('FN/FN_CATS not defined'); process.exit(1); }
const keys = Object.keys(FN);
console.log('FN has', keys.length, 'functions');
const missing = [];
for (const cat of Object.keys(FN_CATS)) {
  const m = FN_CATS[cat].filter(n => typeof FN[n] !== 'function');
  if (m.length) missing.push(cat + ': ' + m.join(','));
}
console.log('FN_CATS entries WITHOUT an FN implementation:');
console.log(missing.join('\n') || '  none');