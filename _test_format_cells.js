/* Structural check for index.html after the Format Cells dialog was added.
 * Verifies tag balance and that the new dialog did not disturb Page Setup,
 * which sits next to it in the same region of markup.
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
let passed = 0, failed = 0;
function ok(c, m) { if (c) { passed++; console.log('  PASS ' + m); } else { failed++; console.log('  FAIL ' + m); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const count = re => (html.match(re) || []).length;

console.log('=== index.html structure ===');
for (const [open, close, name] of [
  ['<div', '</div>', 'div'],
  ['<section', '</section>', 'section'],
  ['<select', '</select>', 'select'],
  ['<main', '</main>', 'main'],
  ['<svg', '</svg>', 'svg'],
  ['<button', '</button>', 'button']
]) {
  const a = count(new RegExp(open + '[\\s>]', 'g'));
  const b = count(new RegExp(close, 'g'));
  ok(a === b, name + ' tags balanced (' + a + '/' + b + ')');
}

console.log('\n--- Format Cells dialog ---');
ok(count(/id="fmtDlg"/g) === 1, 'fmtDlg appears exactly once');
ok(count(/data-fmt-pane="/g) === 4, 'four panes (font, fill, border, align)');
ok(count(/data-fmt-tab="/g) === 4, 'four tabs');
ok(count(/id="bFmtCells"/g) === 1, 'Font group has a dialog launcher');
ok(/class="rgrp hasLauncher"/.test(html), 'Font group is a positioning context');
ok(count(/class="fmtBEdge"/g) === 4, 'border grid has four edge buttons');
ok(/id="fmtFont"/.test(html) && /id="fmtSize"/.test(html), 'font + size controls');
ok(/id="fmtStyle"/.test(html), 'bold/italic style control');
ok(/id="fmtUnderline"/.test(html), 'underline control');
ok(/id="fmtFontColor"/.test(html), 'text colour control');
ok(/id="fmtBgColor"/.test(html), 'background colour control');
ok(/id="fmtOk"/.test(html) && /id="fmtCancel"/.test(html), 'OK / Cancel buttons');

console.log('\n--- Page Setup untouched ---');
ok(count(/id="psDlg"/g) === 1, 'psDlg still present exactly once');
ok(/id="psOk"/.test(html) && /id="psCancel"/.test(html), 'Page Setup buttons intact');
ok(/id="psOrient"/.test(html) && /id="psScale"/.test(html), 'Page Setup fields intact');

console.log('\n--- sprite + stylesheet wiring ---');
ok(/id="i-launcher"/.test(html), 'launcher icon defined in the sprite');
/* Excel puts a dialog launcher on the corner of every group that has a full
   dialog behind it, and the reference shows one on Font, Alignment, Number,
   Styles, Cells and Editing alike. So the count is no longer 1: what still has
   to hold is that every launcher draws the same sprite icon and that no two
   share an id. */
const launcherIds = [...html.matchAll(/class="rlauncher"[^>]*\bid="([^"]+)"/g)].map(m => m[1]);
const launcherUses = count(/href="#i-launcher"/g);
ok(launcherIds.length >= 6, 'every dialog-backed Home group has a launcher (' + launcherIds.length + ')');
ok(launcherUses === launcherIds.length,
  'every launcher draws the shared #i-launcher icon (' + launcherUses + '/' + launcherIds.length + ')');
ok(new Set(launcherIds).size === launcherIds.length, 'launcher ids are unique: ' + launcherIds.join(', '));
ok(launcherIds.includes('bFmtCells'), 'the Font group still owns the original launcher');

const css = fs.readFileSync(path.join(ROOT, 'css', 'styles.css'), 'utf8');
ok(/#fmtDlg/.test(css), 'fmtDlg styled');
ok(/#psDlg,#authDialog,#fmtDlg\.open/.test(css) || /#fmtDlg\.open/.test(css),
  'fmtDlg shares the open/close rule');
ok(/\.rlauncher\{/.test(css), 'launcher button styled');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);