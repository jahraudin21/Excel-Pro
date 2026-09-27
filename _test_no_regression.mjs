// Compares the working tree's index.html against the committed HEAD version using
// the same two checks as _ribboncheck.mjs, so any NEW finding caused by an edit
// is obvious. js/script.js is the reference in both cases (this change set does not
// touch it), so any set difference is attributable to index.html alone.
import fs from 'fs';
import { execSync } from 'child_process';

/* Match _ribboncheck.mjs: wiring + i18n definitions live in every js/ module. */
const jsFiles = fs.readdirSync('js').filter(f => f.endsWith('.js'));
const js = jsFiles.map(f => fs.readFileSync('js/' + f, 'utf8')).join('\n');
const cur = fs.readFileSync('index.html', 'utf8');
const head = execSync('git show HEAD:index.html', { encoding: 'utf8', maxBuffer: 1 << 26 });

const probe = html => {
  const tabs = [...html.matchAll(/data-tab="([^"]+)"/g)].map(m => m[1]);
  const pages = [...html.matchAll(/data-page="([^"]+)"/g)].map(m => m[1]);
  // Only real <button> elements: the "b" id prefix also catches non-buttons
  // such as the <h1 id="bsUserTitle"> heading.
  const ids = [...html.matchAll(/<button[^>]*\bid="(b[A-Za-z0-9]+)"/g)].map(m => m[1]);
  const keys = [...html.matchAll(/data-i18n(?:-t|-ph)?="([^"]+)"/g)].map(m => m[1]);
  return {
    mismatch: tabs.filter(t => !pages.includes(t)).concat(pages.filter(p => !tabs.includes(p))),
    unwired: [...new Set(ids)].filter(id => !js.includes("'#" + id + "'")).sort(),
    missing: [...new Set(keys)].filter(k => !js.includes(k + ':{')).sort()
  };
};

const a = probe(head), b = probe(cur);
const added = (x, y) => y.filter(v => !x.includes(v));
const dropped = (x, y) => x.filter(v => !y.includes(v));

let fail = 0;
const report = (label, list) => {
  if (list.length) { fail = 1; console.log('  NEW  ' + label + ': ' + list.join(', ')); }
  else console.log('  ok   no new ' + label);
};
console.log('unwired buttons   HEAD=' + a.unwired.length + '  now=' + b.unwired.length);
console.log('missing i18n keys HEAD=' + a.missing.length + '  now=' + b.missing.length);
report('unwired buttons', added(a.unwired, b.unwired));
report('missing i18n keys', added(a.missing, b.missing));
report('tab/page mismatches', added(a.mismatch, b.mismatch));
const gone = dropped(a.unwired, b.unwired);
if (gone.length) console.log('  note  no longer reported unwired: ' + gone.join(', '));

console.log(fail ? '\nREGRESSION' : '\nNO REGRESSION vs HEAD');
process.exit(fail);
