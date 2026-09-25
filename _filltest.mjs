import fs from 'fs';
import vm from 'vm';
const src = fs.readFileSync('c:/New folder/index.html', 'utf-8');

// pull the REAL implementations out of the app (brace-matched)
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
const code = ['numOrNull', 'seriesFor', 'shiftFormula', 'filledWrite', 'applyFill']
  .map(extract).join('\n');

let cells = {};
const ctx = {
  cells,
  colName: i => String.fromCharCode(65 + i),
  colIndex: ch => ch.charCodeAt(0) - 65,
  refOf: (r, c) => String.fromCharCode(65 + c) + (r + 1),
  refToRC: t => ({ r: parseInt(t.slice(1), 10) - 1, c: t.charCodeAt(0) - 65 }),
  sheet: () => ({ cells: ctx.cells }),
  rawOf: ref => { const c = ctx.cells[ref]; return c && c.raw != null ? c.raw : ''; },
  styleOf: ref => { const c = ctx.cells[ref]; return c && c.s ? c.s : {}; },
  gateEdit: () => false, snapshot: () => {}, saveLS: () => {}
};
vm.createContext(ctx);
vm.runInContext(code, ctx);

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + '  => ' + JSON.stringify(got) + (ok ? '' : '  (wanted ' + JSON.stringify(want) + ')'));
};
const set = o => { ctx.cells = {}; for (const k in o) ctx.cells[k] = { raw: o[k] }; };
const R = (r1, r2, c1, c2) => ({ r1, r2, c1, c2 });

console.log('--- series detection ---');
eq('1,2,3 -> next 4', ctx.seriesFor(['1', '2', '3']).next(1), 4);
eq('1,2,3 -> 2nd next 5', ctx.seriesFor(['1', '2', '3']).next(2), 5);
eq('single 7 -> copy 7', ctx.seriesFor(['7']).next(1), 7);
eq('10,20 -> 30', ctx.seriesFor(['10', '20']).next(1), 30);
eq('5,10,15 -> 20', ctx.seriesFor(['5', '10', '15']).next(1), 20);
eq('1,3,5 -> 7 (step 2)', ctx.seriesFor(['1', '3', '5']).next(1), 7);
eq('Item1 -> Item2', ctx.seriesFor(['Item1']).next(1), 'Item2');
eq('Item1,Item2 -> Item3', ctx.seriesFor(['Item1', 'Item2']).next(1), 'Item3');
eq('Q01 -> Q02 (padded)', ctx.seriesFor(['Q01']).next(1), 'Q02');
eq('A,B -> repeats A', ctx.seriesFor(['A', 'B']).next(1), 'A');
eq('A,B -> repeats B', ctx.seriesFor(['A', 'B']).next(2), 'B');
eq('चावल,दाल -> repeats', ctx.seriesFor(['चावल', 'दाल']).next(1), 'चावल');

console.log('\n--- formula reference shifting ---');
eq('=SUM(B2:B6) down 1', ctx.shiftFormula('=SUM(B2:B6)', 1, 0), '=SUM(B3:B7)');
eq('=$A$1+B1 down 1', ctx.shiftFormula('=$A$1+B1', 1, 0), '=$A$1+B2');
eq('=A1*2 right 1', ctx.shiftFormula('=A1*2', 0, 1), '=B1*2');
eq('=LOG10(A1) down 1 (fn name safe)', ctx.shiftFormula('=LOG10(A1)', 1, 0), '=LOG10(A2)');
eq('=A1 up 1 at row1 (clamped)', ctx.shiftFormula('=A1', -1, 0), '=A1');

console.log('\n--- applyFill: drag down ---');
set({ A1: '1', A2: '2', A3: '3' });
ctx.applyFill(R(0, 2, 0, 0), R(0, 5, 0, 0));
eq('A4', ctx.cells.A4.raw, '4'); eq('A5', ctx.cells.A5.raw, '5'); eq('A6', ctx.cells.A6.raw, '6');

set({ B1: '7' });
ctx.applyFill(R(0, 0, 1, 1), R(0, 3, 1, 1));
eq('single 7 copied to B2', ctx.cells.B2.raw, '7'); eq('...B4', ctx.cells.B4.raw, '7');

set({ C1: 'Item1' });
ctx.applyFill(R(0, 0, 2, 2), R(0, 2, 2, 2));
eq('C2', ctx.cells.C2.raw, 'Item2'); eq('C3', ctx.cells.C3.raw, 'Item3');

set({ E1: '=SUM(B2:B6)' });
ctx.applyFill(R(0, 0, 4, 4), R(0, 1, 4, 4));
eq('formula shifted E2', ctx.cells.E2.raw, '=SUM(B3:B7)');

console.log('\n--- applyFill: drag down with styles ---');
set({ A1: '1', A2: '2' });
ctx.cells.A1.s = { numfmt: 'inr', b: true };
ctx.applyFill(R(0, 1, 0, 0), R(0, 3, 0, 0));
eq('A3 value', ctx.cells.A3.raw, '3');
eq('A3 inherited numfmt inr', ctx.cells.A3.s && ctx.cells.A3.s.numfmt, 'inr');
eq('A3 inherited bold', ctx.cells.A3.s && ctx.cells.A3.s.b, true);

console.log('\n--- applyFill: drag up + right ---');
set({ A5: '10', A6: '20' });
ctx.applyFill(R(4, 5, 0, 0), R(1, 5, 0, 0));
eq('fill up A2..A4 series', [ctx.cells.A2.raw, ctx.cells.A3.raw, ctx.cells.A4.raw], ['-20', '-10', '0']);

set({ A1: '1', B1: '2' });
ctx.applyFill(R(0, 0, 0, 1), R(0, 0, 0, 3));
eq('fill right A1..D1', [ctx.cells.A1.raw, ctx.cells.B1.raw, ctx.cells.C1.raw, ctx.cells.D1.raw], ['1', '2', '3', '4']);

console.log('\n--- applyFill: multi-column down (each column own series) ---');
set({ A1: '1', A2: '2', B1: '100', B2: '200' });
ctx.applyFill(R(0, 1, 0, 1), R(0, 2, 0, 1));
eq('A3 continues 3', ctx.cells.A3.raw, '3');
eq('B3 continues 300', ctx.cells.B3.raw, '300');

console.log('\n--- regression: bugs found by this test suite ---');
set({ E2: '=SUM(B2:B6)' });
ctx.applyFill(R(1, 1, 4, 4), R(1, 2, 4, 4));
eq('single-cell formula DOES shift on fill-down', ctx.cells.E3.raw, '=SUM(B3:B7)');

set({ A5: '10', A6: '20' });
ctx.applyFill(R(4, 5, 0, 0), R(1, 5, 0, 0));
eq('fill-UP runs series backward (A4)', ctx.cells.A4.raw, '0');
eq('fill-UP backward (A3)', ctx.cells.A3.raw, '-10');
eq('fill-UP backward (A2)', ctx.cells.A2.raw, '-20');

set({ B5: 'A', B6: 'B' });
ctx.applyFill(R(4, 5, 1, 1), R(4, 5, 1, 1));
eq('fill-UP pattern not broken by single-cell target', ctx.cells.B5.raw, 'A');
set({ C5: 'A', C6: 'B' });
ctx.applyFill(R(4, 5, 2, 2), R(3, 5, 2, 2));
eq('fill-UP pattern repeats backward (C4)', ctx.cells.C4.raw, 'B');

set({ D1: '=A1*2', D2: '=A2*2' });
ctx.applyFill(R(0, 1, 3, 3), R(0, 3, 3, 3));
eq('multi formula fill down', [ctx.cells.D3.raw, ctx.cells.D4.raw], ['=A3*2', '=A4*2']);

set({ A6: '5' });
ctx.applyFill(R(5, 5, 0, 0), R(5, 5, 0, 4));
eq('fill-RIGHT single number copies', [ctx.cells.B6.raw, ctx.cells.E6.raw], ['5', '5']);

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' FILL TESTS PASSED' : fail + ' FAILED, ' + pass + ' passed'));
process.exit(fail === 0 ? 0 : 1);