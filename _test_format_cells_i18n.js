/* i18n coverage for the Format Cells dialog.
 *
 * Every data-i18n key inside #fmtDlg must resolve in all three languages, or a
 * tab silently renders its raw key. T() falls back to the key itself when a
 * string is missing, so an undefined key is visible rather than fatal - which is
 * exactly why it needs a test.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
let passed = 0, failed = 0;
function ok(c, m) { if (c) { passed++; console.log('  PASS ' + m); } else { failed++; console.log('  FAIL ' + m); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* Pull the dialog out of the page so only its own keys are checked. */
const start = html.indexOf('<div id="fmtDlg"');
const end = html.indexOf('<div id="psDlg"');
ok(start >= 0 && end > start, 'fmtDlg block located in index.html');
const block = html.slice(start, end);

const keys = [...block.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]);
const tipKeys = [...block.matchAll(/data-i18n-t="([^"]+)"/g)].map(m => m[1]);
const allKeys = [...new Set([...keys, ...tipKeys])];

console.log('=== Format Cells i18n ===');
console.log('  ' + allKeys.length + ' keys used in the dialog');
ok(allKeys.length > 40, 'a substantial set of keys is translated');

/* Extract only the STR object literal from a source file.
 *
 * script.js cannot simply be evaluated here: its top-level code touches
 * document.querySelector before STR is even defined. So the literal is sliced
 * out by brace matching and evaluated alone, which reads the real table from
 * disk without running the engine.
 */
/* Slice a {...} literal starting at `open` by counting braces, skipping over
   string literals so a brace inside a translation cannot end the match early. */
function sliceLiteral(src, open) {
  let depth = 0, i = open, inStr = null;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return null;
}

/* Collect the base STR literal plus every Object.assign(STR, {...}) table that
   other files merge in, so the test sees the same effective set the app does.
   A regex cannot do this: the merged tables contain many nested "});" and a
   non-greedy match stops at the first one. */
function extractStr(src) {
  const out = {};
  /* The base literal is optional: drawDesign.js never declares `const STR`,
     it only merges tables into the one script.js created. Returning early on a
     missing declaration would silently skip every one of those tables. */
  const at = src.indexOf('const STR={');
  if (at >= 0) {
    const base = sliceLiteral(src, src.indexOf('{', at));
    if (base) Object.assign(out, new Function('return ' + base + ';')());
  }

  const re = /Object\.assign\(STR,\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const lit = sliceLiteral(src, m.index + m[0].length - 1);
    if (lit) Object.assign(out, new Function('return ' + lit + ';')());
  }
  return out;
}

const js = fs.readFileSync(path.join(ROOT, 'js', 'script.js'), 'utf8');
const dd = fs.readFileSync(path.join(ROOT, 'js', 'drawDesign.js'), 'utf8');

const merged = Object.assign({}, extractStr(js), extractStr(dd));

console.log('--- every dialog key is defined ---');
ok(merged && Object.keys(merged).length > 200,
  'STR loaded from the real sources (' + Object.keys(merged || {}).length + ' keys)');

const missing = [];
const notThreeLang = [];
for (const k of allKeys) {
  const v = merged[k];
  if (!v) { missing.push(k); continue; }
  if (!v.np || !v.hi || !v.en) notThreeLang.push(k);
}

ok(missing.length === 0,
  missing.length ? 'MISSING: ' + missing.join(', ') : 'all ' + allKeys.length + ' keys defined');

console.log('\n--- every dialog key has all three languages ---');
ok(notThreeLang.length === 0,
  notThreeLang.length ? 'INCOMPLETE: ' + notThreeLang.join(', ') : 'np + hi + en present for all keys');

console.log('\n--- existing design strings survived ---');
ok(!!merged.designReset, 'designReset still defined');
ok(!!merged.paletteApplied, 'paletteApplied still defined');
ok(!!merged.styleApplied, 'styleApplied still defined');

console.log('\n--- spot-check a translation, not just its presence ---');
ok(merged.fmtTitle && merged.fmtTitle.en === 'Format Cells',
  'fmtTitle.en reads "Format Cells"');
ok(merged.fmtTabBorder && merged.fmtTabBorder.en === 'Border',
  'fmtTabBorder.en reads "Border"');
ok(merged.fmtStrike && merged.fmtStrike.en === 'Strikethrough',
  'fmtStrike.en reads "Strikethrough"');
ok(merged.fmtNoFill && merged.fmtNoFill.en === 'No fill',
  'fmtNoFill.en reads "No fill"');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);