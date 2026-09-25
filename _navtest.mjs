import fs from 'fs';
import vm from 'vm';
const src = fs.readFileSync('c:/New folder/index.html', 'utf-8');
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
const code = ['cellHas', 'jumpEdge', 'fillExtent', 'filledWrite', 'numOrNull', 'seriesFor', 'shiftFormula', 'applyFill']
  .map(extract).join('\n');

const gt = {};
Object.assign(gt, {
  ROWS: 200, COLS: 26,
  colName: i => String.fromCharCode(65 + i),
  refOf: (r, c) => String.fromCharCode(65 + c) + (r + 1),
  refToRC: t => ({ r: parseInt(t.slice(1), 10) - 1, c: t.charCodeAt(0) - 65 }),
  sheet: () => ({ cells: gt.cells }),
  rawOf: ref => { const c = gt.cells[ref]; return c && c.raw != null ? c.raw : ''; },
  styleOf: ref => { const c = gt.cells[ref]; return c && c.s ? c.s : {}; },
  cell: ref => gt.cells[ref],
  vals: {}, active: 'A1', selA: 'A1', selB: 'A1',
  renderAll: () => {}, tdOf: () => null, setStatusMode: () => {}, saveLS: () => {},
  snapshot: () => {}, gateEdit: () => false, T: k => k
});
vm.createContext(gt);
vm.runInContext(code, gt);

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + '  => ' + JSON.stringify(got) + (ok ? '' : '  (wanted ' + JSON.stringify(want) + ')'));
};
// build a sheet + recalculated vals stub (numeric raws only)
const set = (o, vals) => {
  gt.cells = {}; gt.vals = {};
  for (const k in o) { gt.cells[k] = { raw: o[k] }; }
  for (const k in gt.valsRaw || {}) {}
  Object.assign(gt.vals, vals || {});
  for (const k in o) { const n = Number(o[k]); gt.vals[k] = isNaN(n) || o[k] === '' ? (o[k] === '' ? '' : o[k]) : n; }
};
const R = (r1, r2, c1, c2) => ({ r1, r2, c1, c2 });

console.log('--- Ctrl+Arrow edge jumps (jumpEdge) ---');
set({ A1: '1', A2: '2', A3: '3', A5: '9' });
gt.active = 'A1'; gt.selA = gt.selB = 'A1';
gt.jumpEdge(1, 0, false);
eq('A1 ctrl+down -> end of block A3', gt.active, 'A3');

set({ A1: '1', A2: '2', A3: '3', A5: '9' });
gt.active = 'A3'; gt.selA = gt.selB = 'A3';
gt.jumpEdge(1, 0, false);
eq('A3 ctrl+down -> next is empty -> sheet edge A200', gt.active, 'A200');

set({ A1: '1', A2: '2', A3: '3', A5: '9' });
gt.active = 'A4'; gt.selA = gt.selB = 'A4';
gt.jumpEdge(1, 0, false);
eq('A4 (empty) ctrl+down -> first non-empty A5', gt.active, 'A5');

set({ A1: '1', B1: 'b1', C1: 'c1' });
gt.active = 'A1'; gt.selA = gt.selB = 'A1';
gt.jumpEdge(0, 1, false);
eq('A1 ctrl+right -> C1', gt.active, 'C1');

set({ A1: '1', A2: '2', A3: '3' });
gt.active = 'A1'; gt.selA = gt.selB = 'A1';
gt.jumpEdge(1, 0, true);
eq('ctrl+shift+down sets selB to A3', gt.selB, 'A3');
eq('ctrl+shift+down keeps anchor selA', gt.selA, 'A1');
eq('ctrl+shift+down active at A3', gt.active, 'A3');

set({ A1: '1', A2: '2', A3: '3' });
gt.active = 'A3'; gt.selA = gt.selB = 'A3';
gt.jumpEdge(-1, 0, false);
eq('A3 ctrl+up -> A1', gt.active, 'A1');

console.log('\n--- double-click fill extent (fillExtent) ---');
set({ A1: 'x', B2: 'a', B3: 'b', B4: 'c' });
eq('extent from adjacent column B -> rows 1..4', gt.fillExtent(R(0, 0, 0, 0)), { r1: 0, r2: 3, c1: 0, c2: 0 });

set({ A1: 'x' });
eq('no adjacent data -> null (nothing to fill)', gt.fillExtent(R(0, 0, 0, 0)), null);

set({ B1: 'h', B2: 'a', B3: 'b' });
eq('left column preferred when it has data', gt.fillExtent(R(0, 0, 2, 2)), { r1: 0, r2: 2, c1: 2, c2: 2 });

set({ B1: 'h', C2: 'a', C3: 'b' });
eq('falls back to right column when left is empty', gt.fillExtent(R(0, 0, 1, 1)), { r1: 0, r2: 2, c1: 1, c2: 1 });

console.log('\n--- fill modes (right-drag menu) ---');
set({ A1: '1', A2: '2', A3: '3' });
gt.applyFill(R(0, 2, 0, 0), R(0, 5, 0, 0), 'copy');
eq('Copy Cells repeats pattern', [gt.cells.A4.raw, gt.cells.A5.raw, gt.cells.A6.raw], ['1', '2', '3']);

set({ A1: '1', A2: '2', A3: '3' });
gt.applyFill(R(0, 2, 0, 0), R(0, 5, 0, 0), 'series');
eq('Fill Series extrapolates', [gt.cells.A4.raw, gt.cells.A5.raw, gt.cells.A6.raw], ['4', '5', '6']);

set({ A1: '10' });
gt.cells.A1.s = { b: true, numfmt: 'inr' };
gt.cells.A2 = { raw: '99' };
gt.applyFill(R(0, 0, 0, 0), R(0, 2, 0, 0), 'fmt');
eq('Fill Formatting Only leaves existing value', gt.cells.A2.raw, '99');
eq('Fill Formatting Only applies style', gt.cells.A2.s && gt.cells.A2.s.b, true);

set({ A1: '10' });
gt.cells.A1.s = { b: true };
gt.cells.A2 = { raw: '77', s: { i: true } };
gt.applyFill(R(0, 0, 0, 0), R(0, 2, 0, 0), 'nofmt');
eq('Fill Without Formatting writes value', gt.cells.A2.raw, '10');
eq('Fill Without Formatting keeps existing style', gt.cells.A2.s && gt.cells.A2.s.i, true);

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' NAV/FILL TESTS PASSED' : fail + ' FAILED, ' + pass + ' passed'));
process.exit(fail === 0 ? 0 : 1);