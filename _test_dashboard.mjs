/* _test_dashboard.mjs — Sales Dashboard template (full-page redesign).
 * Extracts the REAL makeSalesDashboard (js/start-screen.js), tintForTable,
 * the formula engine (isErr..recalc), fmtNum/dispVal, rangeFromStr and
 * chartSeriesFor (js/script.js) into vm sandboxes, then asserts the whole
 * dashboard (banner, KPIs, tables + REPT bars, charts, insights, source
 * table, conds, merges, colW, gridlines), every formula in the real engine,
 * and the structural wiring (paintChart, applyMerges, opts, REPT, i18n). */
import fs from 'fs';
import vm from 'vm';

const js = fs.readFileSync('js/script.js', 'utf-8');
const ss = fs.readFileSync('js/start-screen.js', 'utf-8');

function extract(name, src) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('missing function: ' + name);
  let d = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1); }
  }
  throw new Error('unbalanced: ' + name);
}

let pass = 0, fail = 0;
const ok = (label, cond, extra) => {
  cond ? pass++ : fail++;
  console.log((cond ? 'PASS  ' : 'FAIL  ') + label + (cond ? '' : '  => ' + extra));
};
const near = (a, b) => Math.abs(a - b) < 1e-6;

/* ---------- 1. build the template ---------- */
const b = {};
vm.createContext(b);
vm.runInContext(extract('tintForTable', js) + '\n' + extract('makeSalesDashboard', ss), b);
const made = JSON.parse(JSON.stringify(vm.runInContext('makeSalesDashboard()', b)));
const sh = made.sheets[0];
const S = ref => (sh.cells[ref] && sh.cells[ref].s) || {};
const R = ref => (sh.cells[ref] || {}).raw;
const band = vm.runInContext("tintForTable('#217346')", b);

ok('single sheet, accent tab, gridlines off, uniform 96px colW',
  made.sheets.length === 1 && sh.name === 'Sales Dashboard' && sh.tabColor === '#217346'
  && made.showGrid === false
  && made.colW.length === 26 && made.colW.every(w => w === 96),
  JSON.stringify({ name: sh.name, showGrid: made.showGrid, colW0: made.colW[0] }));

/* ---------- 2. hero banner (rows 1-2) ---------- */
ok('split hero banner: title left, period right, both merged',
  R('A1') === 'Monthly Sales Dashboard'
  && R('I1') === 'January 2024  ·  12 orders  ·  2 regions'
  && S('A1').bg === '#217346' && S('A1').fs === 18 && S('A1').al === 'center'
  && S('I1').fs === 12 && S('I1').al === 'right'
  && sh.merges.indexOf('A1:H2') >= 0 && sh.merges.indexOf('I1:L2') >= 0,
  JSON.stringify({ a1: R('A1'), i1: R('I1') }));

/* ---------- 3. KPI cards (rows 4-6) ---------- */
ok('KPI labels: Total Sales / Average Sale / Orders / Highest Sale',
  R('A4') === 'Total Sales' && R('D4') === 'Average Sale'
  && R('G4') === 'Orders' && R('J4') === 'Highest Sale'
  && ['A4','D4','G4','J4'].every(ref => S(ref).bg === '#217346' && S(ref).b === true));
ok('KPI formulas SUM/AVERAGE/COUNT/MAX over rows 32-43',
  R('A5') === '=SUM(C32:C43)' && R('D5') === '=AVERAGE(C32:C43)'
  && R('G5') === '=COUNT(C32:C43)' && R('J5') === '=MAX(C32:C43)',
  JSON.stringify([R('A5'), R('D5'), R('G5'), R('J5')]));
ok('KPI values: 2-row merges, fs20 card style, money fmt except Orders',
  ['A5:C6','D5:F6','G5:I6','J5:L6'].every(m => sh.merges.indexOf(m) >= 0)
  && S('A5').fs === 20 && S('A5').numfmt === 'usd' && S('G5').numfmt === undefined
  && S('A5').bg === '#f4f9f6'
  && ['A4:C4','D4:F4','G4:I4','J4:L4'].every(m => sh.merges.indexOf(m) >= 0));

/* ---------- 4. four summary tables (rows 8-11) ---------- */
ok('table headers: Region / Item / Avg / Orders',
  R('A8') === 'Sales by Region' && R('D8') === 'Sales by Item'
  && R('G8') === 'Avg Sale by Region' && R('J8') === 'Orders by Region'
  && ['A8:C8','D8:F8','G8:I8','J8:L8'].every(m => sh.merges.indexOf(m) >= 0));
ok('summary formulas: SUMIF / SUMIF / AVERAGEIF / COUNTIF + totals',
  R('B9') === '=SUMIF(D32:D43,A9,C32:C43)' && R('E9') === '=SUMIF(A32:A43,D9,C32:C43)'
  && R('H9') === '=AVERAGEIF(D32:D43,G9,C32:C43)' && R('K9') === '=COUNTIF(D32:D43,J9)'
  && R('B11') === '=SUM(B9:B10)' && R('E11') === '=SUM(E9:E10)'
  && R('H11') === '=AVERAGE(C32:C43)' && R('K11') === '=SUM(K9:K10)',
  JSON.stringify({ B9: R('B9'), H9: R('H9'), K9: R('K9') }));
ok('share bars are REPT formulas normalised against the column max',
  R('C9') === '=REPT("█",ROUND(B9/MAX(B9:B10)*8,0))'
  && R('F10') === '=REPT("█",ROUND(E10/MAX(E9:E10)*8,0))'
  && R('I9') === '=REPT("█",ROUND(H9/MAX(H9:H10)*8,0))'
  && R('L9') === '=REPT("█",ROUND(K9/MAX(K9:K10)*8,0))'
  && R('C11') == null,
  JSON.stringify({ C9: R('C9'), L9: R('L9'), C11: R('C11') }));

/* ---------- 5. charts, insights, source table, conds ---------- */
ok('three chart drawings: bar / pie / line with ranges and titles',
  sh.drawings.length === 3
  && sh.drawings[0].chartType === 'bar' && sh.drawings[0].range === 'A9:B10'
  && sh.drawings[0].title === 'Sales by Region'
  && sh.drawings[1].chartType === 'pie' && sh.drawings[1].range === 'D9:E10'
  && sh.drawings[1].title === 'Sales by Item'
  && sh.drawings[2].chartType === 'line' && sh.drawings[2].range === 'B32:C43'
  && sh.drawings[2].title === 'Sales Trend',
  JSON.stringify(sh.drawings));
ok('chart geometry: x 38/422/806, y 286, 376x254 on the 96px grid',
  JSON.stringify(sh.drawings.map(d => [d.x, d.y, d.w, d.h]))
  === JSON.stringify([[38,286,376,254],[422,286,376,254],[806,286,376,254]]),
  JSON.stringify(sh.drawings.map(d => [d.x, d.y, d.w, d.h])));
ok('three wrapped insights cards merged over rows 26-28',
  String(R('A26')).indexOf('East leads revenue at $14,750') === 0
  && String(R('E26')).indexOf('Top order $2,750') === 0
  && String(R('I26')).indexOf('12 orders averaging $1,725') === 0
  && S('A26').wrap === true
  && ['A26:D28','E26:H28','I26:L28'].every(m => sh.merges.indexOf(m) >= 0),
  JSON.stringify({ a26: R('A26') }));
ok('source table recreated: title row 30, headers row 31, 12 records rows 32-43',
  R('A30') === 'Monthly Sales Data' && R('A31') === 'Item' && R('C31') === 'Sales'
  && R('A32') === 'Widgets' && R('B32') === '01-Jan-24' && R('C32') === 1250
  && R('A43') === 'Widgets' && R('D43') === 'East' && R('C43') === 2750);
ok('source table styling: zebra band + currency + borders',
  S('C32').bg === undefined && S('C33').bg === band && S('C43').bg === band
  && S('C32').numfmt === 'usd' && S('C32').al === 'right'
  && ['A32','B32','C32','D32'].every(ref => S(ref).border && S(ref).border.t === 'thin'));
ok('conditional formatting: gt 2000 bold green, lt 1300 red, over C32:C43',
  sh.conds.length === 2
  && sh.conds[0].type === 'gt' && sh.conds[0].v1 === 2000
  && sh.conds[0].r1 === 31 && sh.conds[0].r2 === 42 && sh.conds[0].c1 === 2
  && sh.conds[0].fmt.b === true && sh.conds[0].fmt.color === '#0b6a2f'
  && sh.conds[1].type === 'lt' && sh.conds[1].v1 === 1300
  && sh.conds[1].fmt.color === '#9c0006',
  JSON.stringify(sh.conds));
ok('exactly 17 merges: 2 banner + 8 KPI + 4 headers + 3 insights',
  sh.merges.length === 17, JSON.stringify(sh.merges));

/* ---------- 6. real engine: every formula must evaluate ---------- */
function extractEngine(src) {
  const start = src.indexOf('function isErr(v)');
  const rStart = src.indexOf('function recalc(){');
  if (start < 0 || rStart < 0) throw new Error('engine markers missing');
  let d = 0, end = -1;
  for (let j = rStart; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) { end = j + 1; break; } }
  }
  return src.slice(start, end);
}
const g = {};
Object.assign(g, {
  ROWS: 200, COLS: 26,
  colName: i => String.fromCharCode(65 + i),
  colIndex: ch => ch.charCodeAt(0) - 65,
  refOf: (r, c) => String.fromCharCode(65 + c) + (r + 1),
  refToRC: t => ({ r: parseInt(t.slice(1), 10) - 1, c: t.charCodeAt(0) - 65 }),
  wb: { cur: 0, sheets: [{ name: 'Dash', cells: {} }] },
  vals: {}, cache: {}, visiting: new Set(),
  sheet: () => g.wb.sheets[g.wb.cur],
  T: k => k, serial: dd => Math.floor(dd.getTime() / 86400000) + 25569
});
g.cell = ref => g.sheet().cells[ref];
g.rawOf = ref => { const c = g.cell(ref); return c && c.raw != null ? c.raw : ''; };
g.styleOf = ref => { const c = g.cell(ref); return c && c.s ? c.s : {}; };
vm.createContext(g);
vm.runInContext(
  extractEngine(js) + '\n'
  + extract('fmtNum', js) + '\n' + extract('dispVal', js) + '\n'
  + extract('rangeFromStr', js) + '\n' + extract('chartSeriesFor', js), g);

g.wb.sheets[0].cells = JSON.parse(JSON.stringify(sh.cells));
g.recalc();
const E = ref => g.evalRef(ref);

const isErrish = v => typeof v === 'string' && v[0] === '#';
ok('no formula errors anywhere in the dashboard',
  Object.keys(sh.cells).filter(r => String(R(r)).startsWith('='))
    .every(r => !isErrish(E(r))),
  Object.keys(sh.cells).filter(r => String(R(r)).startsWith('=') && isErrish(E(r)))
    .map(r => r + '=' + E(r)).join(', '));

ok('KPI values: Total 20700, Avg 1725, Orders 12, Max 2750',
  E('A5') === 20700 && E('D5') === 1725 && E('G5') === 12 && E('J5') === 2750,
  JSON.stringify({ A5: E('A5'), D5: E('D5'), G5: E('G5'), J5: E('J5') }));
ok('SUMIF By Region: East 14750, South 5950, Total 20700',
  E('B9') === 14750 && E('B10') === 5950 && E('B11') === 20700,
  JSON.stringify({ B9: E('B9'), B10: E('B10'), B11: E('B11') }));
ok('SUMIF By Item: Widgets 14750, Items 5950, Total 20700',
  E('E9') === 14750 && E('E10') === 5950 && E('E11') === 20700,
  JSON.stringify({ E9: E('E9'), E11: E('E11') }));
ok('AVERAGEIF: East 1638.89, South 1983.33, All 1725',
  near(E('H9'), 14750 / 9) && near(E('H10'), 5950 / 3) && near(E('H11'), 1725),
  JSON.stringify({ H9: E('H9'), H10: E('H10'), H11: E('H11') }));
ok('COUNTIF Orders: East 9, South 3, Total 12',
  E('K9') === 9 && E('K10') === 3 && E('K11') === 12,
  JSON.stringify({ K9: E('K9'), K10: E('K10'), K11: E('K11') }));
ok('REPT share bars: 8/3 blocks, avg 7/8, orders 8/3',
  E('C9') === '█'.repeat(8) && E('C10') === '█'.repeat(3)
  && E('F9') === '█'.repeat(8) && E('F10') === '█'.repeat(3)
  && E('I9') === '█'.repeat(7) && E('I10') === '█'.repeat(8)
  && E('L9') === '█'.repeat(8) && E('L10') === '█'.repeat(3),
  JSON.stringify({ C9: E('C9'), C10: E('C10'), I9: E('I9'), L10: E('L10') }));
ok('KPI renders as currency: $20,700.00',
  g.dispVal('A5') === '$20,700.00', g.dispVal('A5'));

/* Regression guards: the two-argument AVERAGEIF form and bare REPT. */
g.sheet().cells['X1'] = { raw: '=AVERAGEIF(C32:C43,">1500")' };
g.sheet().cells['X2'] = { raw: '=REPT("ab",3)' };
g.sheet().cells['X3'] = { raw: '=REPT("x",0)' };
ok('2-arg AVERAGEIF still works after the average_range fix',
  near(g.evalRef('X1'), 14050 / 7), g.evalRef('X1'));
ok('FN.REPT repeats, handles zero, returns text',
  g.evalRef('X2') === 'ababab' && g.evalRef('X3') === '',
  JSON.stringify({ X2: g.evalRef('X2'), X3: g.evalRef('X3') }));

/* ---------- 7. chart series ---------- */
const s1 = g.chartSeriesFor('A9:B10');
ok('bar chart series: [East 14750, South 5950]',
  s1 && JSON.stringify(s1.labels) === JSON.stringify(['East', 'South'])
  && JSON.stringify(s1.vals) === JSON.stringify([14750, 5950]), JSON.stringify(s1));
const s3 = g.chartSeriesFor('B32:C43');
ok('trend chart series: 12 dated sales values',
  s3 && s3.labels.length === 12 && s3.vals.length === 12 && s3.vals[0] === 1250
  && s3.vals[11] === 2750 && s3.labels[8] === '10-Jan-24',
  JSON.stringify(s3 && { n: s3.vals.length, ninth: s3.labels[8] }));

/* ---------- 8. structural wiring in the shipped sources ---------- */
ok('script.js: paintChart defined exactly once and drives the dialog',
  (js.match(/function paintChart\(/g) || []).length === 1
  && /paintChart\(ctx,W,H,chartType,d,null\)/.test(js));
ok('script.js: drawEl renders kind===chart through paintChart',
  /d\.kind==='chart'/.test(js) && /paintChart\(cc,cv\.width,cv\.height/.test(js));
ok('script.js: renderAll applies merges (they were never rendered before)',
  /for\(const td of tds\)paint\(td\);\s*\/\*[\s\S]*?\*\/\s*applyMerges\(\);/.test(js));
ok('script.js: FN.REPT implemented (it was catalogued but missing)',
  /REPT:\(s,n\)=>\{const k=Math\.floor/.test(js)
  && /'REPT'/.test(js));
ok('start-screen.js: installWorkbook takes opts (colW + showGrid) with safe defaults',
  /opts&&Array\.isArray\(opts\.colW\)/.test(ss) && /opts\.showGrid!=null/.test(ss)
  && /new Array\(COLS\)\.fill\(88\)/.test(ss));
ok('start-screen.js: applyTemplate passes the whole template opts through',
  /installWorkbook\(made\.sheets,null,null,made\)/.test(ss));
ok('start-screen.js: dashboard template registered with i18n in np/hi/en',
  /\{id:'dashboard',icon:'📊',make:makeSalesDashboard\}/.test(ss)
  && /ssDashboard:\{np:'[^']+',hi:'[^']+',en:'Sales Dashboard'\}/.test(ss)
  && /ssDashboardDesc:\{np:'[^']+',hi:'[^']+',en:'[^']+'\}/.test(ss));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
