/* _test_maketable.mjs — Format as Table: headers, zebra, alignment, borders.
 * Extracts the REAL makeTable + tintForTable out of js/script.js (brace-matched)
 * and drives them in a vm sandbox with the engine stubbed, then asserts every
 * part of the requested spec: clear header, banded rows, text left / numbers
 * right, subtle borders, consistent font. */
import fs from 'fs';
import vm from 'vm';

const src = fs.readFileSync('js/script.js', 'utf-8');
function extract(name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('missing function: ' + name);
  let d = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1); }
  }
  throw new Error('unbalanced: ' + name);
}
const code = ['makeTable', 'tintForTable'].map(extract).join('\n');

let cells = {}, snapCount = 0, borderPatches = [], restored = null, mode = null;
const R = { r1: 0, r2: 4, c1: 0, c2: 2 };      // A1:C5 selection
const ctx = {
  console,
  rect: () => R,
  dataRange: () => R,
  selA: 'A1', selB: 'C5',
  refOf: (r, c) => String.fromCharCode(65 + c) + (r + 1),
  colName: i => String.fromCharCode(65 + i),
  sheet: () => ({ cells: ctx.cells }),
  cells,
  vals: {},                                    // filled per scenario
  numOrNull: v => (typeof v === 'number' && isFinite(v)) ? v
    : (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()) ? parseFloat(v) : null),
  T: k => k,
  snapshot: () => { snapCount++; },
  saveLS: () => {},
  renderAll: () => {},
  setStatusMode: m => { mode = m; },
  applyBorderPatch: p => { borderPatches.push({ a: ctx._sA, b: ctx._sB, p }); },
};
Object.defineProperty(ctx, 'selA', { get: () => ctx._sA, set: v => { ctx._sA = v; } });
Object.defineProperty(ctx, 'selB', { get: () => ctx._sB, set: v => { ctx._sB = v; } });
ctx._sA = 'A1'; ctx._sB = 'C5';
ctx.cells = cells;
vm.createContext(ctx);
vm.runInContext(code, ctx);

let pass = 0, fail = 0;
const ok = (label, cond, extra) => {
  cond ? pass++ : fail++;
  console.log((cond ? 'PASS  ' : 'FAIL  ') + label + (cond ? '' : '  => ' + extra));
};
const S = ref => (ctx.cells[ref] && ctx.cells[ref].s) || {};

function reset(vals) {
  ctx.cells = {}; snapCount = 0; borderPatches = []; mode = null;
  ctx.vals = vals; ctx._sA = 'A1'; ctx._sB = 'C5';
}

/* ---- scenario: text col A, numeric col B, text col C, 4 body rows ---- */
reset({
  A2: 'North', B2: 1250, C2: 'Jan',
  A3: 'South', B3: 980,  C3: 'Feb',
  A4: 'East',  B4: 1425, C4: 'Mar',
  A5: 'West',  B5: 760,  C5: 'Apr',
});
vm.runInContext("makeTable('#217346')", ctx);

const hdr = ['A1', 'B1', 'C1'];
ok('header: bold white on accent, centred, Calibri 11',
  hdr.every(r => { const s = S(r);
    return s.b === 1 && s.color === '#ffffff' && s.bg === '#217346'
      && s.al === 'center' && s.ff === 'Calibri' && s.fs === 11; }),
  hdr.map(r => JSON.stringify(S(r))).join(' | '));

const body = ['A2', 'A3', 'A4', 'A5', 'B2', 'B3', 'B4', 'B5', 'C2', 'C3', 'C4', 'C5'];
ok('body: consistent Calibri 11 font everywhere',
  body.every(r => S(r).ff === 'Calibri' && S(r).fs === 11));

ok('alignment: text column left, numeric column right',
  ['A2', 'A3', 'A4', 'A5'].every(r => S(r).al === 'left')
  && ['B2', 'B3', 'B4', 'B5'].every(r => S(r).al === 'right')
  && ['C2', 'C3', 'C4', 'C5'].every(r => S(r).al === 'left'),
  JSON.stringify({ A2: S('A2').al, B2: S('B2').al, C2: S('C2').al }));

const band = ctx.tintForTable ? vm.runInContext("tintForTable('#217346')", ctx) : null;
ok('zebra: first body row plain, second body row banded (every other row)',
  !S('A2').bg && S('A3').bg === band && !S('A4').bg && S('A5').bg === band,
  JSON.stringify({ A2: S('A2').bg, A3: S('A3').bg, A4: S('A4').bg, A5: S('A5').bg, band }));

ok('zebra bands the whole row, all columns',
  S('B3').bg === band && S('C3').bg === band && S('B5').bg === band && S('C5').bg === band);

ok('borders: subtle thin grid on every header and body cell',
  hdr.concat(body).every(r => { const b = S(r).border;
    return b && b.t === 'thin' && b.b === 'thin' && b.l === 'thin' && b.r === 'thin'; }),
  JSON.stringify(S('B3').border));

ok('one undo step: exactly one snapshot',
  snapCount === 1, snapCount);

ok('selection restored to what it was',
  ctx._sA === 'A1' && ctx._sB === 'C5', ctx._sA + ':' + ctx._sB);

ok('status message reported',
  mode === 'tblDone', mode);

/* ---- scenario: numeric-looking STRINGS count as numeric, blanks abstain ---- */
reset({
  A2: 'Name', B2: '100',   // B body value numeric string
  A3: 'Qty',  B3: '200',
  A4: 'Total', B4: '',
});
vm.runInContext("makeTable('#2e75b6')", ctx);
ok('numeric strings align right; empty cells do not vote a column to text',
  S('B2').al === 'right' && S('B3').al === 'right' && S('B4').al === 'right',
  JSON.stringify({ B2: S('B2').al, B3: S('B3').al, B4: S('B4').al }));

/* ---- scenario: mixed column falls back to text (left) ---- */
reset({
  A2: 'x', B2: 10,
  A3: 'y', B3: 'n/a',
});
vm.runInContext("makeTable('#595959')", ctx);
ok('a column with any text in the body aligns left (text wins ties)',
  S('B2').al === 'left' && S('B3').al === 'left',
  JSON.stringify({ B2: S('B2').al, B3: S('B3').al }));

/* ---- tint helper ---- */
ok('tintForTable lightens the accent toward white',
  vm.runInContext("tintForTable('#217346')", ctx) === '#63ab84'
  || /^#[0-9a-f]{6}$/i.test(vm.runInContext("tintForTable('#217346')", ctx)),
  vm.runInContext("tintForTable('#217346')", ctx));
ok('tintForTable falls back for junk input',
  vm.runInContext("tintForTable('nope')", ctx) === '#eaf3ee',
  vm.runInContext("tintForTable('nope')", ctx));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
