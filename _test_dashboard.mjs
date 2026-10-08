/* _test_dashboard.mjs — Sales Dashboard template.
 * Extracts the REAL makeSalesDashboard (js/start-screen.js), tintForTable,
 * the formula engine (isErr..recalc), fmtNum/dispVal, rangeFromStr and
 * chartSeriesFor (js/script.js) into vm sandboxes, then asserts:
 *   - the template recreates the reference layout (title, headers, 12 records)
 *   - banner/KPI/summary styling, zebra banding, merges, chart drawings
 *   - every dashboard formula evaluates correctly in the real engine
 *   - chart series for both embedded ranges resolve to the right numbers
 *   - the structural wiring (paintChart, applyMerges, colW, i18n) exists. */
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

ok('single sheet named Sales Dashboard with accent tab color',
  made.sheets.length === 1 && sh.name === 'Sales Dashboard' && sh.tabColor === '#217346',
  JSON.stringify({ n: made.sheets.length, name: sh.name, tab: sh.tabColor }));

/* ---------- 2. reference layout: title, headers, 12 records ---------- */
ok('A1 carries the reference title, bold accent 14pt',
  R('A1') === 'Monthly Sales Data' && S('A1').b === true && S('A1').fs === 14 && S('A1').color === '#217346',
  JSON.stringify({ raw: R('A1'), s: S('A1') }));
ok('row 2 headers Item / Date / Sales / Region',
  R('A2') === 'Item' && R('B2') === 'Date' && R('C2') === 'Sales' && R('D2') === 'Region'
  && S('A2').b === true && S('C2').al === 'right',
  JSON.stringify([R('A2'), R('B2'), R('C2'), R('D2')]));

const DATA = [['Widgets','01-Jan-24',1250,'East'],['Widgets','01-Jan-24',1200,'East'],
  ['Widgets','01-Jan-24',1450,'East'],['Widgets','01-Jan-24',1750,'East'],
  ['Items','01-Jan-24',1750,'South'],['Widgets','01-Jan-24',1900,'East'],
  ['Items','01-Jan-24',1700,'South'],['Widgets','01-Jan-24',1250,'East'],
  ['Widgets','10-Jan-24',1500,'East'],['Items','03-Jan-24',2500,'South'],
  ['Widgets','01-Jan-24',1700,'East'],['Widgets','01-Jan-24',2750,'East']];
const cols = ['A', 'B', 'C', 'D'];
const dataOk = DATA.every((row, i) => row.every((v, c) => R(cols[c] + (i + 3)) === v));
ok('all 12 records match the reference screenshots', dataOk);
ok('Sales column is currency-formatted and right-aligned',
  DATA.every((_, i) => S('C' + (i + 3)).numfmt === 'usd' && S('C' + (i + 3)).al === 'right'));
ok('zebra: 2nd record onward banded, 1st record plain',
  S('C3').bg === undefined && S('C4').bg === band && S('C5').bg === undefined
  && S('C14').bg === band,
  JSON.stringify({ C3: S('C3').bg, C4: S('C4').bg, band }));
ok('every data cell carries the thin grid border + Calibri 11',
  DATA.every((_, i) => cols.every(c => { const s = S(c + (i + 3));
    return s.border && s.border.t === 'thin' && s.ff === 'Calibri' && s.fs === 11; })));

/* ---------- 3. dashboard panel: banner, KPIs, summaries ---------- */
ok('merged accent banner F1:M2 with the dashboard title',
  R('F1') === 'Sales Dashboard' && S('F1').bg === '#217346' && S('F1').color === '#ffffff'
  && S('F1').fs === 16 && sh.merges.indexOf('F1:M2') >= 0,
  JSON.stringify({ raw: R('F1'), merges: sh.merges }));
ok('banner styles paint the whole merged block (so it survives unmerge)',
  ['G1','M1','F2','M2'].every(ref => S(ref).bg === '#217346'));

ok('KPI labels: Total Sales / Average Sale / Orders / Highest Sale',
  R('F4') === 'Total Sales' && R('H4') === 'Average Sale' && R('J4') === 'Orders'
  && R('L4') === 'Highest Sale'
  && ['F4','H4','J4','L4'].every(ref => S(ref).bg === '#217346' && S(ref).b === true));
ok('KPI formulas SUM / AVERAGE / COUNT / MAX over the data',
  R('F5') === '=SUM(C3:C14)' && R('H5') === '=AVERAGE(C3:C14)'
  && R('J5') === '=COUNT(C3:C14)' && R('L5') === '=MAX(C3:C14)',
  JSON.stringify([R('F5'), R('H5'), R('J5'), R('L5')]));
ok('KPI money values are currency; Orders is a plain count',
  S('F5').numfmt === 'usd' && S('H5').numfmt === 'usd' && S('L5').numfmt === 'usd'
  && S('J5').numfmt === undefined);

ok('four summary tables with SUMIF / AVERAGEIF / COUNTIF formulas',
  R('F7') === 'By Region' && R('H7') === 'By Item' && R('J7') === 'Avg by Region'
  && R('L7') === 'Orders by Region'
  && R('G8') === '=SUMIF(D3:D14,F8,C3:C14)'
  && R('I8') === '=SUMIF(A3:A14,H8,C3:C14)'
  && R('K8') === '=AVERAGEIF(D3:D14,J8,C3:C14)'
  && R('M8') === '=COUNTIF(D3:D14,L8)',
  JSON.stringify({ F7:R('F7'), G8:R('G8'), I8:R('I8'), K8:R('K8'), M8:R('M8') }));

ok('13 merges: banner + 8 KPI cells + 4 summary headers',
  sh.merges.length === 13 && ['F1:M2','F4:G4','F5:G5','H4:I4','H5:I5','J4:K4',
    'J5:K5','L4:M4','L5:M5','F7:G7','H7:I7','J7:K7','L7:M7']
    .every(m => sh.merges.indexOf(m) >= 0),
  JSON.stringify(sh.merges));

/* ---------- 4. embedded chart drawings ---------- */
ok('two on-sheet chart drawings (bar + line) with titles and ranges',
  sh.drawings.length === 2
  && sh.drawings[0].kind === 'chart' && sh.drawings[0].chartType === 'bar'
  && sh.drawings[0].range === 'F8:G9' && sh.drawings[0].title === 'Sales by Region'
  && sh.drawings[1].kind === 'chart' && sh.drawings[1].chartType === 'line'
  && sh.drawings[1].range === 'B3:C14' && sh.drawings[1].title === 'Sales Trend',
  JSON.stringify(sh.drawings));
ok('chart pixel geometry matches the colW contract (X(5)=460, w=384, y=264)',
  sh.drawings[0].x === 460 && sh.drawings[0].w === 384
  && sh.drawings[0].x + 384 === sh.drawings[1].x
  && sh.drawings[1].w === 384 && sh.drawings[0].y === 264 && sh.drawings[0].h === 210,
  JSON.stringify(sh.drawings.map(d => ({ x: d.x, y: d.y, w: d.w, h: d.h }))));

/* ---------- 5. column widths ---------- */
ok('colW: sized data columns, slim gutter, 96px panel, default tail',
  made.colW.length === 26 && made.colW[0] === 112 && made.colW[1] === 100
  && made.colW[3] === 90 && made.colW[4] === 24 && made.colW[5] === 96
  && made.colW[12] === 96 && made.colW[13] === 88,
  JSON.stringify(made.colW.slice(0, 15)));

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

ok('no formula errors anywhere in the dashboard',
  Object.keys(sh.cells).filter(r => String(R(r)).startsWith('='))
    .every(r => typeof E(r) === 'number' && isFinite(E(r))),
  Object.keys(sh.cells).filter(r => String(R(r)).startsWith('=') && typeof E(r) !== 'number')
    .map(r => r + '=' + E(r)).join(', '));

ok('KPI values: Total 20700, Avg 1725, Orders 12, Max 2750',
  E('F5') === 20700 && E('H5') === 1725 && E('J5') === 12 && E('L5') === 2750,
  JSON.stringify({ F5: E('F5'), H5: E('H5'), J5: E('J5'), L5: E('L5') }));
ok('SUMIF By Region: East 14750, South 5950, Total 20700',
  E('G8') === 14750 && E('G9') === 5950 && E('G10') === 20700,
  JSON.stringify({ G8: E('G8'), G9: E('G9'), G10: E('G10') }));
ok('SUMIF By Item: Widgets 14750, Items 5950, Total 20700',
  E('I8') === 14750 && E('I9') === 5950 && E('I10') === 20700,
  JSON.stringify({ I8: E('I8'), I9: E('I9'), I10: E('I10') }));
ok('AVERAGEIF: East 1638.89, South 1983.33, All 1725',
  near(E('K8'), 14750 / 9) && near(E('K9'), 5950 / 3) && near(E('K10'), 1725),
  JSON.stringify({ K8: E('K8'), K9: E('K9'), K10: E('K10') }));
ok('COUNTIF Orders: East 9, South 3, Total 12',
  E('M8') === 9 && E('M9') === 3 && E('M10') === 12,
  JSON.stringify({ M8: E('M8'), M9: E('M9'), M10: E('M10') }));
ok('KPI renders as currency: $20,700.00',
  g.dispVal('F5') === '$20,700.00', g.dispVal('F5'));
/* Regression guard for the AVERAGEIF fix: the two-argument form (no
   average_range) must keep averaging the criteria range itself. */
g.sheet().cells['X1'] = { raw: '=AVERAGEIF(C3:C14,">1500")' };
ok('2-arg AVERAGEIF still works after the average_range fix',
  near(g.evalRef('X1'), 14050 / 7), g.evalRef('X1'));

/* ---------- 7. chart series ---------- */
const s1 = g.chartSeriesFor('F8:G9');
ok('bar chart series: [East 14750, South 5950]',
  s1 && JSON.stringify(s1.labels) === JSON.stringify(['East', 'South'])
  && JSON.stringify(s1.vals) === JSON.stringify([14750, 5950]),
  JSON.stringify(s1));
const s2 = g.chartSeriesFor('B3:C14');
ok('trend chart series: 12 dated sales values',
  s2 && s2.labels.length === 12 && s2.vals.length === 12 && s2.vals[0] === 1250
  && s2.vals[11] === 2750 && s2.labels[8] === '10-Jan-24',
  JSON.stringify(s2 && { n: s2.vals.length, first: s2.vals[0], ninth: s2.labels[8] }));

/* ---------- 8. structural wiring in the shipped sources ---------- */
ok('script.js: paintChart defined exactly once and drives the dialog',
  (js.match(/function paintChart\(/g) || []).length === 1
  && /paintChart\(ctx,W,H,chartType,d,null\)/.test(js));
ok('script.js: drawEl renders kind===chart through paintChart',
  /d\.kind==='chart'/.test(js) && /paintChart\(cc,cv\.width,cv\.height/.test(js));
ok('script.js: renderAll applies merges (they were never rendered before)',
  /for\(const td of tds\)paint\(td\);\s*\/\*[\s\S]*?\*\/\s*applyMerges\(\);/.test(js));
ok('start-screen.js: installWorkbook honours template colW and refreshes <colgroup>',
  /colWIn/.test(ss) && /applyColW\(\)/.test(ss)
  && /new Array\(COLS\)\.fill\(88\)/.test(ss));
ok('start-screen.js: applyTemplate passes the template colW through',
  /installWorkbook\(made\.sheets,null,null,made\.colW\)/.test(ss));
ok('start-screen.js: dashboard template registered with i18n in np/hi/en',
  /\{id:'dashboard',icon:'📊',make:makeSalesDashboard\}/.test(ss)
  && /ssDashboard:\{np:'[^']+',hi:'[^']+',en:'Sales Dashboard'\}/.test(ss)
  && /ssDashboardDesc:\{np:'[^']+',hi:'[^']+',en:'[^']+'\}/.test(ss));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
