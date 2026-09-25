import fs from 'fs';
import vm from 'vm';
const src = fs.readFileSync('c:/New folder/index.html', 'utf-8');

// --- extract the REAL formula engine (isErr .. recalc) by brace matching ---
const start = src.indexOf('function isErr(v)');
if (start < 0) throw new Error('engine start not found');
const rStart = src.indexOf('function recalc(){');
if (rStart < 0) throw new Error('recalc not found');
let d = 0, end = -1;
for (let j = rStart; j < src.length; j++) {
  if (src[j] === '{') d++;
  else if (src[j] === '}') { d--; if (d === 0) { end = j + 1; break; } }
}
const engine = src.slice(start, end);
console.log('extracted engine: ' + engine.length + ' chars (isErr..recalc)');

function extract(name) {
  const i = src.indexOf('function ' + name + '(');
  let dd = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') dd++;
    else if (src[j] === '}') { dd--; if (dd === 0) return src.slice(i, j + 1); }
  }
}
const render = extract('fmtNum') + '\n' + extract('dispVal');

const g = {};
Object.assign(g, {
  ROWS: 200, COLS: 26,
  colName: i => String.fromCharCode(65 + i),
  colIndex: ch => ch.charCodeAt(0) - 65,   // app defines this outside the engine slice
  refOf: (r, c) => String.fromCharCode(65 + c) + (r + 1),
  refToRC: t => ({ r: parseInt(t.slice(1), 10) - 1, c: t.charCodeAt(0) - 65 }),
  wb: { cur: 0, sheets: [{ name: 'Sheet1', cells: {} }] },
  vals: {}, cache: {}, visiting: new Set(),
  sheet: () => g.wb.sheets[g.wb.cur],
  T: k => k, serial: dd => Math.floor(dd.getTime() / 86400000) + 25569
});
g.cell = ref => g.sheet().cells[ref];
g.rawOf = ref => { const c = g.cell(ref); return c && c.raw != null ? c.raw : ''; };
g.styleOf = ref => { const c = g.cell(ref); return c && c.s ? c.s : {}; };

vm.createContext(g);
vm.runInContext(engine + '\n' + render, g);

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label.padEnd(42) + '=> ' + JSON.stringify(got) + (ok ? '' : '   (wanted ' + JSON.stringify(want) + ')'));
};
// "data entry": write raws then recalculate, exactly like setRaw + renderAll do
const type = cells => {
  g.wb.sheets[0].cells = {};
  for (const k in cells) g.wb.sheets[0].cells[k] = { raw: cells[k] };
  g.recalc();
};
const E = ref => g.evalRef(ref);

console.log('\n--- data entry: literals ---');
type({ A1: '5', A2: 'hello', A3: '3.5', A4: '', A5: 'TRUE', A6: '=1>0', A7: '=IF(A5,1,0)' });
eq('number literal A1', E('A1'), 5);
eq('text literal A2', E('A2'), 'hello');
eq('decimal A3', E('A3'), 3.5);
eq('empty A4', E('A4'), '');
eq('typed TRUE becomes boolean (Excel)', E('A5'), true);
eq('=1>0 yields a real boolean', E('A6'), true);
eq('IF coerces boolean TRUE to true', E('A7'), 1);

console.log('\n--- data entry: formulas from the formula bar ---');
type({ B1: '=1+2*3', B2: '=(1+2)*3', B3: '=10/4', B4: '=2^3', B5: '=10-3-2' });
eq('=1+2*3 precedence', E('B1'), 7);
eq('=(1+2)*3 parens', E('B2'), 9);
eq('=10/4', E('B3'), 2.5);
eq('=2^3', E('B4'), 8);
eq('=10-3-2 left assoc', E('B5'), 5);

console.log('\n--- cell references ---');
type({ A1: '10', A2: '20', A3: '=A1+A2', A4: '=A3*2' });
eq('=A1+A2', E('A3'), 30);
eq('=A3*2 chained', E('A4'), 60);

console.log('\n--- ranges + aggregate functions ---');
type({ A1: '1', A2: '2', A3: '3', A4: '4', A5: '=SUM(A1:A4)', A6: '=AVERAGE(A1:A4)', A7: '=MIN(A1:A4)', A8: '=MAX(A1:A4)', A9: '=COUNT(A1:A4)' });
eq('=SUM(A1:A4)', E('A5'), 10);
eq('=AVERAGE(A1:A4)', E('A6'), 2.5);
eq('=MIN(A1:A4)', E('A7'), 1);
eq('=MAX(A1:A4)', E('A8'), 4);
eq('=COUNT(A1:A4)', E('A9'), 4);

console.log('\n--- logic + text + math functions ---');
type({ A1: '7', B1: '=IF(A1>5,"big","small")', B2: '=ROUND(2.345,2)', B3: '=UPPER("abc")', B4: '=LEN("hello")', B5: '=IF(A1>50,"big","small")' });
eq('=IF(true branch)', E('B1'), 'big');
eq('=IF(false branch)', E('B5'), 'small');
eq('=ROUND(2.345,2)', E('B2'), 2.35);
eq('=UPPER("abc")', E('B3'), 'ABC');
eq('=LEN("hello")', E('B4'), 5);

console.log('\n--- errors (Excel-style values) ---');
type({ C1: '=1/0', C2: '=NOPE(1)', C3: '=SQRT("x")' });
eq('=1/0 -> #DIV/0!', E('C1'), '#DIV/0!');
eq('unknown fn -> #NAME?', E('C2'), '#NAME?');

console.log('\n--- formula bar round-trip (raw shown vs value computed) ---');
type({ A1: '2', A2: '3', A3: '=A1+A2', B1: '=SUM(A1:A2)' });
eq('formula bar shows the RAW formula (A3)', g.rawOf('A3'), '=A1+A2');
eq('cell displays the VALUE (A3)', g.dispVal('A3'), '5');
eq('formula bar shows RAW for B1', g.rawOf('B1'), '=SUM(A1:A2)');
eq('B1 displays 5', g.dispVal('B1'), '5');
eq('literal A1 raw unchanged', g.rawOf('A1'), '2');

console.log('\n--- the default sheet: सामान / राशि with a live SUM ---');
type({ A1: 'सामान', B1: 'राशि', A2: 'चावल', B2: '950', A3: 'दाल', B3: '1400', A4: 'तेल', B4: '180', A5: 'चीनी', B5: '450', A6: 'नमक', B6: '40', A7: 'कुल', B7: '=SUM(B2:B6)' });
for (const r of [2, 3, 4, 5, 6]) g.wb.sheets[0].cells['B' + r].s = { numfmt: 'inr' };
g.wb.sheets[0].cells.B7.s = { b: true, numfmt: 'inr' };
g.recalc();
eq('live total B7 = SUM(B2:B6)', E('B7'), 3020);
eq('INR formatting of the total', g.dispVal('B7'), '₹3,020.00');
g.wb.sheets[0].cells.B2 = { raw: '1000', s: { numfmt: 'inr' } };
g.recalc();
eq('edit B2 -> total recalculates', E('B7'), 3070);
eq('INR formatting after edit', g.dispVal('B7'), '₹3,070.00');

console.log('\n--- number formats via the toolbar ---');
type({ D1: '0.25', D2: '1234.5' });
g.wb.sheets[0].cells.D1.s = { numfmt: 'pct' };
g.wb.sheets[0].cells.D2.s = { numfmt: 'comma' };
eq('percent format', g.dispVal('D1'), '25%');
eq('comma format', g.dispVal('D2'), '1,234.5');

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' ENGINE TESTS PASSED' : fail + ' FAILED, ' + pass + ' passed'));
process.exit(fail === 0 ? 0 : 1); 