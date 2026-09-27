import fs from 'fs';
const html = fs.readFileSync('index.html', 'utf8');
/* The i18n table (STR) and the event wiring are spread across every module under
   js/ - each one contributes via Object.assign(STR, {...}) - so both checks must
   consider the whole bundle, not just script.js. */
const js = fs.readdirSync('js').filter(f => f.endsWith('.js'))
  .map(f => fs.readFileSync('js/' + f, 'utf8')).join('\n');
let fail = 0;
const tabs = [...html.matchAll(/data-tab="([^"]+)"/g)].map(m => m[1]);
const pages = [...html.matchAll(/data-page="([^"]+)"/g)].map(m => m[1]);
console.log('tabs :', tabs.join(', '));
console.log('pages:', pages.join(', '));
const onlyTabs = tabs.filter(t => !pages.includes(t));
const onlyPages = pages.filter(p => !tabs.includes(p));
if (onlyTabs.length || onlyPages.length) { console.log('TAB/PAGE MISMATCH:', onlyTabs, onlyPages); fail = 1; }
// Only real <button> elements: the "b" id prefix also catches non-buttons such
// as the <h1 id="bsUserTitle"> heading.
const ids = [...html.matchAll(/<button[^>]*\bid="(b[A-Za-z0-9]+)"/g)].map(m => m[1]);
const unwired = [...new Set(ids)].filter(id => !js.includes("'#" + id + "'"));
console.log('unwired buttons:', unwired.join(', ') || 'none');
if (unwired.length) fail = 1;
const keys = [...html.matchAll(/data-i18n(?:-t|-ph)?="([^"]+)"/g)].map(m => m[1]);
const missKeys = [...new Set(keys)].filter(k => !js.includes(k + ':{'));
console.log('missing i18n keys:', missKeys.join(', ') || 'none');
if (missKeys.length) fail = 1;
for (const fn of ['renderDrawings', 'setDrawMode', 'insertDrawing', 'makeTable', 'openPivot', 'buildPivot', 'openRec', 'insertSmartArt', 'insertSparkline', 'openPic', 'openHelp', 'gridSnapshot']) {
  if (!js.includes('function ' + fn)) { console.log('MISSING FUNCTION:', fn); fail = 1; }
}
if (fail) { console.log('RIBBON CHECK FAILED'); process.exit(1); }
console.log('RIBBON CHECK OK');