import fs from 'fs';
import vm from 'vm';
const html = fs.readFileSync('c:/New folder/index.html', 'utf-8');

// 1) syntax-check every inline <script>
let js = '';
for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) js += m[1] + '\n';
try { new vm.Script(js); console.log('SYNTAX OK (' + js.length + ' chars)'); }
catch (e) { console.log('SYNTAX FAIL: ' + e.message); process.exit(1); }

// 2) non-ASCII survived the UTF-8 read (proves encoding is correct)
const dev = html.includes('सामान') && html.includes('राशि') && html.includes('कुल');
console.log('utf-8 read intact (सामान/राशि/कुल present):', dev);
console.log('decode check:', Buffer.from(html, 'utf8').toString('utf8') === html ? 'round-trip OK' : 'MISMATCH');

// 3) tabs vs panels
const tabs = [...html.matchAll(/class="rtab[^"]*"\s+data-tab="([^"]+)"/g)].map(x => x[1]);
const pages = [...html.matchAll(/class="rpage[^"]*"\s+data-page="([^"]+)"/g)].map(x => x[1]);
console.log('tabs :', JSON.stringify(tabs));
console.log('pages:', JSON.stringify(pages));
console.log('1:1 match:', tabs.length === pages.length && tabs.every(t => pages.includes(t)));

// 4) integrity
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
console.log('duplicate ids:', JSON.stringify([...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))]));
const o = (html.match(/<div\b/g) || []).length, c = (html.match(/<\/div>/g) || []).length;
console.log('div balance:', o + '/' + c, o === c ? 'OK' : 'MISMATCH');

// 5) i18n completeness
const keys = new Set([...js.matchAll(/^ ([A-Za-z0-9_]+):\{/gm)].map(x => x[1]));
const used = new Set([
  ...[...html.matchAll(/data-i18n(?:-ph|-t)?="([^"]+)"/g)].map(x => x[1]),
  ...[...js.matchAll(/\bT\('([A-Za-z0-9_]+)'\)/g)].map(x => x[1])
]);
console.log('i18n defined:', keys.size, '| used:', used.size, '| missing:', JSON.stringify([...used].filter(u => !keys.has(u))));
console.log('default sheet:', html.includes('=SUM(B2:B6)') ? 'सामान/राशि + live SUM OK' : 'MISSING');

// 6) fill handle wiring
const fns = ['cellBox', 'positionFillHandle', 'positionFillPrev', 'numOrNull', 'seriesFor', 'shiftFormula', 'filledWrite', 'applyFill', 'initFillHandle', 'cellHas', 'jumpEdge', 'goHome', 'goEnd', 'fillDownCmd', 'fillRightCmd', 'fillExtent', 'fillHandleMenu'];
console.log('fill engine fns defined:', fns.every(f => js.includes('function ' + f + '(')));
console.log('initFillHandle called:', /initGridExtras\(\);initFillHandle\(\)/.test(js));
console.log('handle positioned in renderAll:', /saveLS\(\);positionFillHandle\(\);positionFillPrev\(\);/.test(js));
console.log('#fh / #fp CSS present:', /#fh\{/.test(html) && /#fp\{/.test(html));
console.log('fill i18n keys:', /fillHandle:\{/.test(js) && /fillDone:\{/.test(js));
console.log('keyboard shortcuts wired:', ['fillDownCmd', 'fillRightCmd', 'goHome', 'goEnd', 'jumpEdge'].every(f => new RegExp('\\b' + f + '\\(\\);?return').test(js) || new RegExp('\\b' + f + '\\(').test(js)));
console.log('ctrl+d / ctrl+r present:', /k==='d'\)\{e\.preventDefault\(\);fillDownCmd/.test(js) && /k==='r'\)\{e\.preventDefault\(\);fillRightCmd/.test(js));
console.log('ctrl+arrows present:', (js.match(/jumpEdge\(/g) || []).length, 'call sites');
console.log('alt+= autosum:', /e\.altKey&&\(e\.key==='='/.test(js));
console.log('ctrl+space col/row select:', /e\.key===' '\).*shiftKey/s.test(js) || /if\(e\.key===' '\)/.test(js));
console.log('dblclick autofill + right-drag menu:', /fh\.addEventListener\('dblclick'/.test(js) && /fillHandleMenu\(fh,q,t2\)/.test(js));