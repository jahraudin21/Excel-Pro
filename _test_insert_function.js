/* Tests for the Insert Function dialog (js/insertFunction.js).
 *
 * Three layers, in increasing depth of commitment:
 *   1. Static  - the markup, the script tag and the shared CSS rules exist, so
 *                the dialog can actually open and look like every other dialog.
 *   2. i18n    - every key the dialog block uses resolves in all three
 *                languages (T() falls through to the raw key otherwise).
 *   3. Engine  - the FN_SYNTAX table and the list filter are asserted against
 *                the REAL FN registry extracted from script.js/drawDesign.js,
 *                and the dialog is driven end-to-end in a vm sandbox with the
 *                same registries, so "what the library offers" and "what the
 *                engine can evaluate" cannot drift apart.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
let passed = 0, failed = 0;
function ok(c, m) { if (c) { passed++; console.log('  PASS ' + m); } else { failed++; console.log('  FAIL ' + m); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css', 'styles.css'), 'utf8');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const scriptSrc = fs.readFileSync(path.join(ROOT, 'js', 'script.js'), 'utf8');
const drawSrc = fs.readFileSync(path.join(ROOT, 'js', 'drawDesign.js'), 'utf8');
const modSrc = fs.readFileSync(path.join(ROOT, 'js', 'insertFunction.js'), 'utf8');

/* ---------- shared extraction helpers ---------- */

/* Slice a {...} literal starting at `open`, counting braces but skipping over
 * string literals so a brace inside a translation cannot end the match early.
 * Comments are skipped too: FN_CATS carries "Excel's defaults" in a /* … * / and
 * that stray apostrophe would otherwise open a phantom string that swallows the
 * rest of the literal. */
function sliceLiteral(src, open) {
  let depth = 0, i = open, inStr = null;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      if (e < 0) return null;
      i = e + 1;
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      const e = src.indexOf('\n', i + 2);
      if (e < 0) break;
      i = e;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(open, i + 1); }
  }
  return null;
}

/* The effective STR table: script.js's base literal plus every
 * Object.assign(STR, {...}) merge, across the given sources. */
function extractStr(sources) {
  const out = {};
  for (const src of sources) {
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
  }
  return out;
}

/* The REAL FN registry: brace-count the `const FN={...}` and
 * `Object.assign(FN,{...})` blocks out of script.js + drawDesign.js and evaluate
 * just those. Regexes cannot do this - a non-greedy match stops at the first
 * nested `})` inside an arrow body (MODE's forEach does exactly that). */
function realFN() {
  const src = scriptSrc + '\n' + drawSrc;
  const blocks = [];
  for (const m of src.matchAll(/(?:const FN\s*=\s*|Object\.assign\(\s*FN\s*,\s*)/g)) {
    const brace = src.indexOf('{', m.index + m[0].length);
    if (brace < 0) continue;
    const lit = sliceLiteral(src, brace);
    if (lit) blocks.push(lit);
  }
  const ctx = vm.createContext({});
  vm.runInContext('let FN={};\n' +
    blocks.map(b => 'Object.assign(FN,' + b + ')').join(';\n') +
    ';\nglobalThis.__FN=FN;', ctx);
  return ctx.__FN;
}

/* FN_CATS and FN_HELP are both `const NAME={...};` literals in script.js.
 * Slice them by brace count (string-aware) rather than by regex: FN_HELP is a
 * single line, so a `[\s\S]*?\n\};` pattern would overrun into later code. */
function realLiteral(name) {
  const at = scriptSrc.indexOf('const ' + name + '=');
  if (at < 0) throw new Error(name + ' literal not found in script.js');
  const open = scriptSrc.indexOf('{', at + name.length);
  const lit = sliceLiteral(scriptSrc, open);
  if (!lit) throw new Error(name + ' literal could not be sliced');
  return vm.runInNewContext('(' + lit + ')');
}

const FN = realFN();
const FN_CATS = realLiteral('FN_CATS');
const FN_HELP = realLiteral('FN_HELP');

/* ---------- 1. static: markup, script tag, CSS ---------- */

console.log('=== Insert Function: markup & wiring (static) ===');
const start = html.indexOf('<div id="fnDlg"');
const end = html.indexOf('<div id="fmtDlg"');
ok(start >= 0 && end > start, 'fnDlg block located between watchDlg and fmtDlg');
const block = html.slice(start, end);
['fnDlg', 'fnDlgTitle', 'fnDlgClose', 'fnSearch', 'fnDlgCat', 'fnList',
  'fnSyn', 'fnDesc', 'fnDlgOk', 'fnDlgCancel'].forEach(id =>
  ok(block.indexOf('id="' + id + '"') >= 0, 'markup has #' + id));

const closer = (html.match(/<button[^>]*\bid="fnDlgClose"[^>]*>/) || [''])[0];
ok(/data-close="close"/.test(closer) && /aria-label="Close"/.test(closer),
  'the close button carries the shared glyph hook and an accessible name');

const tagPos = html.indexOf('<script src="js/insertFunction.js" defer></script>');
ok(tagPos > 0, 'module is loaded by a script tag');
ok(html.indexOf('<script src="js/script.js"') < tagPos,
  'script tag comes after script.js, so the dialog handlers replace initRibbon()s');
ok(swSrc.indexOf('./js/insertFunction.js') >= 0, 'service worker precaches the module');

ok(/#watchDlg,#fnDlg\{position:fixed/.test(css),
  'dialog joins the shared centred/capped rule');
ok(/#watchDlg\.open,#fnDlg\.open\{display:flex\}/.test(css),
  'dialog joins the shared .open rule');
ok(/#psDlg,#fnDlg,#ctxMenu/.test(css), 'dialog is hidden when printing');
ok(/#fnDlg\{min-width:min\(460px/.test(css), 'dialog has its own min-width');
ok(/\.fnList li\.on/.test(css) && /\.fnHelpTxt\{/.test(css),
  'row highlight and description styles exist');
const o = (html.match(/<div\b/g) || []).length, c = (html.match(/<\/div>/g) || []).length;
ok(o === c, 'div tags still balanced after the dialog was added (' + o + '/' + c + ')');

/* ---------- 2. i18n ---------- */

console.log('\n=== Insert Function: i18n ===');
const keys = [...new Set([...block.matchAll(/data-i18n(?:-t|-ph)?="([^"]+)"/g)].map(m => m[1]))];
ok(keys.length >= 5, 'dialog uses ' + keys.length + ' i18n keys');
const merged = extractStr([scriptSrc, drawSrc, modSrc]);
ok(Object.keys(merged).length > 200, 'STR loaded from the real sources (' + Object.keys(merged).length + ' keys)');
const missing = [], incomplete = [];
for (const k of keys) {
  const v = merged[k];
  if (!v) { missing.push(k); continue; }
  if (!v.np || !v.hi || !v.en) incomplete.push(k);
}
ok(missing.length === 0, missing.length ? 'MISSING: ' + missing.join(', ') : 'all dialog keys defined');
ok(incomplete.length === 0, incomplete.length ? 'INCOMPLETE: ' + incomplete.join(', ') : 'np + hi + en present for all keys');
/* Same trap as the formulaAuditing check: a key equal to the id it fills would
 * have applyLang() overwrite the element's own text with a translation. */
const collide = [...block.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*\bdata-i18n(?:-t|-ph)?="([^"]+)"/g)]
  .filter(m => m[2] === m[3]).map(m => m[2]);
ok(collide.length === 0, collide.length ? 'key collides with id: ' + collide.join(', ') : 'no i18n key collides with the id it fills');
ok(merged.fbFx && merged.fbFx.en === 'Insert Function', 'title reuses the existing fbFx key (en: "Insert Function")');

/* ---------- 3a. FN_SYNTAX covers exactly the real FN registry ---------- */

console.log('\n=== Insert Function: syntax table vs the engine ===');
const synAt = modSrc.indexOf('const FN_SYNTAX=');
ok(synAt >= 0, 'FN_SYNTAX table present');
const FN_SYNTAX = vm.runInNewContext('(' + sliceLiteral(modSrc, modSrc.indexOf('{', synAt)) + ')');
const fnNames = Object.keys(FN).sort();
const synNames = Object.keys(FN_SYNTAX).sort();
const noSyntax = fnNames.filter(n => !FN_SYNTAX[n]);
const stale = synNames.filter(n => !FN[n]);
ok(Object.keys(FN).length >= 90, 'extracted the real FN registry (' + Object.keys(FN).length + ' functions)');
ok(noSyntax.length === 0, noSyntax.length ? 'FN without syntax: ' + noSyntax.join(', ') : 'every FN function has a syntax signature');
ok(stale.length === 0, stale.length ? 'syntax for non-functions: ' + stale.join(', ') : 'no stale syntax entries');
ok(FN_SYNTAX.SUM === 'SUM(number1,[number2],…)', 'SUM signature reads Excel-style');
ok(Object.keys(FN_CATS).length === 7, 'FN_CATS still has 7 categories');

/* ---------- 3b. vm sandbox: drive the dialog with the real registries ---------- */

console.log('\n=== Insert Function: behaviour (vm sandbox) ===');

/* Minimal DOM: enough for this module (createElement / appendChild /
 * insertBefore / innerHTML-clears / classList / dataset), nothing more. */
function mkEl(id, tag) {
  const el = {
    id, tagName: (tag || 'div').toUpperCase(), value: '', textContent: '',
    tabIndex: 0, dataset: {}, children: [], attrs: {}, cls: new Set(),
    onclick: null, ondblclick: null, oninput: null, onchange: null, onkeydown: null,
    classList: { add: c => el.cls.add(c), remove: c => el.cls.delete(c), contains: c => el.cls.has(c) },
    appendChild(c) { el.children.push(c); return c; },
    insertBefore(c, ref) { const i = el.children.indexOf(ref); if (i < 0) el.children.push(c); else el.children.splice(i, 0, c); return c; },
    focus() { el.focused = true; },
    setAttribute(k, v) { el.attrs[k] = v; }, getAttribute(k) { return el.attrs[k]; },
    addEventListener() {}, removeEventListener() {}
  };
  Object.defineProperty(el, 'firstChild', { get() { return el.children[0] || null; } });
  /* The module clears lists/selects with innerHTML=''; honor that contract. */
  Object.defineProperty(el, 'innerHTML', { get() { return ''; }, set() { el.children.length = 0; } });
  Object.defineProperty(el, 'className', {
    get() { return [...el.cls].join(' '); },
    set(v) { el.cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  });
  return el;
}

const els = {};
['fnDlg', 'fnDlgCat', 'fnSearch', 'fnList', 'fnSyn', 'fnDesc', 'fnDlgOk',
  'fnDlgCancel', 'fnDlgClose', 'fbFx', 'bFnInsert', 'bFnAll', 'fnCat'].forEach(id => {
  els[id] = mkEl(id, id === 'fnList' ? 'ul' : (id === 'fnDlgCat' || id === 'fnCat' ? 'select' : 'div'));
});
els.fnCat.value = 'math';   /* the ribbon category, as fillFxCat leaves it */

const docListeners = {};
const documentStub = {
  readyState: 'complete',
  createElement: t => mkEl('', t),
  addEventListener(type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
  removeEventListener() {}
};

const inserted = [];
const sandbox = {
  console, document: documentStub,
  STR: {}, LANG: 'en',
  T: k => (sandbox.STR[k] ? sandbox.STR[k].en : k),
  FN, FN_CATS, FN_HELP,
  wb: { recentFns: ['VLOOKUP', 'LEFT'] },
  insertFn: n => inserted.push(n),
  /* Mirrors the real fillFxCat contract: clears the select, appends the seven
   * categories - so a wrong call order in openInsertFunction() is caught. */
  fillFxCat: sel => {
    sel.innerHTML = '';
    ['math', 'stat', 'text', 'logic', 'lookup', 'date', 'financial'].forEach(v => {
      const o = mkEl('', 'option'); o.value = v; sel.appendChild(o);
    });
  },
  $: s => els[String(s).replace(/^#/, '')] || null
};
vm.createContext(sandbox);
/* readyState 'complete' => the module boots during evaluation, after
 * script.js's init() would have run - same order as the real page. */
vm.runInContext(modSrc + '\n;globalThis.__api={' +
  'FN_SYNTAX, openInsertFunction, closeInsertFunction, fnLibRender, fnLibSelect,' +
  ' fnLibMove, fnLibInsert, fnLibUniverse, onDlgKey, initInsertFunction,' +
  ' get sel(){ return fnLibSel; }};', sandbox);
const api = sandbox.__api;

ok(typeof api.initInsertFunction === 'function', 'every entry point is reachable from module scope');
ok(els.fbFx.onclick !== null && els.bFnInsert.onclick !== null && els.bFnAll.onclick !== null,
  'fx / Insert / All entry points are wired (overriding initRibbon()s popMenu)');
ok(els.fnDlgOk.onclick && els.fnDlgCancel.onclick && els.fnDlgClose.onclick, 'OK / Cancel / close are wired');
ok(els.fnSearch.oninput && els.fnDlgCat.onchange && els.fnDlg.onkeydown, 'search, category and keyboard handlers are wired');
ok((docListeners.keydown || []).length === 1, 'document-level Escape listener registered once');

/* Fake keydown event with spies for the two DOM methods the module touches. */
function ev(key, target) {
  return { key, target: target || { tagName: 'LI' }, stopped: false, prevented: false,
    stopPropagation() { this.stopped = true; }, preventDefault() { this.prevented = true; } };
}
const rows = () => els.fnList.children;
const rowNames = () => rows().map(li => li.dataset.fn).filter(Boolean);
const isOpen = () => els.fnDlg.classList.contains('open');

/* --- open: everything the dialog needs is built on open --- */
api.openInsertFunction('all');
ok(isOpen(), 'fx opens the dialog');
ok(rows().length === Object.keys(FN).length,
  'All lists every implemented function (' + rows().length + ' of ' + Object.keys(FN).length + ')');
ok(api.sel === api.fnLibUniverse('all')[0], 'first row is auto-selected');
ok(els.fnDlgCat.children.length === 9, 'category select: All + Most recently used + 7 categories');
ok(els.fnDlgCat.children[0].value === 'all' && els.fnDlgCat.children[1].value === 'recent',
  'dialog-only options are prepended ahead of the ribbon categories');
ok(els.fnSyn.textContent === FN_SYNTAX[api.sel], 'syntax line shows the selected signature');
ok(els.fnDesc.textContent === FN_HELP[api.sel], 'description line shows the FN_HELP text');
ok(els.fnSearch.value === '' && els.fnSearch.focused, 'search is cleared and focused on open');

/* --- the filter: catalog names the engine cannot call are never offered --- */
els.fnDlgCat.value = 'text'; els.fnDlgCat.onchange();
const implText = FN_CATS.text.filter(n => typeof FN[n] === 'function');
const textShown = rowNames();
ok(textShown.length === implText.length && implText.every(n => textShown.indexOf(n) >= 0),
  'text category offers exactly the implemented subset (' + textShown.length + '/' + FN_CATS.text.length + ')');
ok(textShown.indexOf('LEFT') < 0 && textShown.indexOf('TEXT') < 0,
  'unimplemented catalog names (LEFT, TEXT) are never offered');
ok(textShown.indexOf('UPPER') >= 0, 'implemented text functions still offered');

/* --- search: by name, then by description --- */
els.fnDlgCat.value = 'all'; els.fnDlgCat.onchange();
els.fnSearch.value = 'vlo'; els.fnSearch.oninput();
ok(rowNames().length === 1 && rowNames()[0] === 'VLOOKUP', 'search matches the function name');
els.fnSearch.value = FN_HELP.MEDIAN; els.fnSearch.oninput();
ok(rowNames().length === 1 && rowNames()[0] === 'MEDIAN',
  'search matches the description text, not just the name');
els.fnSearch.value = 'zzzznotafn'; els.fnSearch.oninput();
ok(rows().length === 1 && rows()[0].className === 'muted', 'no match renders the muted empty row');
ok(rows()[0].textContent === 'No matching function.', 'empty row shows the translated message');
ok(api.sel === null && els.fnSyn.textContent === '', 'nothing selected, syntax line cleared');

/* --- selection --- */
els.fnSearch.value = ''; els.fnSearch.oninput();
api.fnLibSelect('VLOOKUP');
ok(rows().find(li => li.dataset.fn === 'VLOOKUP').className.indexOf('on') >= 0, 'selecting a row highlights it');
ok(rows().find(li => li.dataset.fn === 'SUM').className === '', 'the previous highlight is cleared');
ok(els.fnSyn.textContent === FN_SYNTAX.VLOOKUP, 'syntax pane follows the selection');
ok(els.fnDesc.textContent === FN_HELP.VLOOKUP, 'description pane follows the selection');

/* --- keyboard: the dialog is a key island --- */
api.openInsertFunction('all');
const names = api.fnLibUniverse('all');
const eDown = ev('ArrowDown');
els.fnDlg.onkeydown(eDown);
ok(api.sel === names[1], 'ArrowDown moves the selection to the next row');
ok(eDown.stopped && eDown.prevented, 'arrows are stopped AND prevented (the grid behind must not move)');
const eUp = ev('ArrowUp');
els.fnDlg.onkeydown(eUp);
ok(api.sel === names[0], 'ArrowUp moves back');
const eEsc = ev('Escape');
els.fnDlg.onkeydown(eEsc);
ok(!isOpen() && eEsc.prevented && eEsc.stopped, 'Escape inside the dialog closes it');
api.openInsertFunction('all');
docListeners.keydown[0]({ key: 'ArrowDown' });
ok(isOpen(), 'a non-Escape key at document level leaves the dialog alone');
docListeners.keydown[0]({ key: 'Escape' });
ok(!isOpen(), 'Escape at document level closes a dialog whose focus drifted out');

/* --- insertion: one path, the same helper the popMenu used --- */
api.openInsertFunction('all');
api.fnLibSelect('ROUND');
els.fnDlgOk.onclick();
ok(inserted[inserted.length - 1] === 'ROUND' && !isOpen(), 'OK inserts the selection and closes');
api.openInsertFunction('all');
let before = inserted.length;
els.fnDlgCancel.onclick();
ok(!isOpen() && inserted.length === before, 'Cancel closes without inserting');
api.openInsertFunction('all');
before = inserted.length;
els.fnDlgClose.onclick();
ok(!isOpen() && inserted.length === before, 'the close button closes without inserting');
api.openInsertFunction('all');
api.fnLibSelect('ABS');
const eEnter = ev('Enter', { tagName: 'LI' });
els.fnDlg.onkeydown(eEnter);
ok(inserted[inserted.length - 1] === 'ABS' && !isOpen(), 'Enter in the list inserts the selection and closes');
api.openInsertFunction('all');
before = inserted.length;
const eBtn = ev('Enter', { tagName: 'BUTTON' });
els.fnDlg.onkeydown(eBtn);
ok(inserted.length === before, 'Enter on a button is left to the button (no double insert)');
ok(!eBtn.prevented && eBtn.stopped, '...default action preserved, but still stopped from the grid');
api.openInsertFunction('all');
rows().find(li => li.dataset.fn === 'VLOOKUP').ondblclick();
ok(inserted[inserted.length - 1] === 'VLOOKUP' && !isOpen(), 'double-click inserts immediately');
api.openInsertFunction('all');
els.fnSearch.value = 'zzzznotafn'; els.fnSearch.oninput();
before = inserted.length;
els.fnDlgOk.onclick();
ok(inserted.length === before && isOpen(), 'OK with no selection does nothing and keeps the dialog open');

/* --- entry points carry their context --- */
els.fnCat.value = 'math';
els.bFnInsert.onclick();
ok(isOpen() && els.fnDlgCat.value === 'math', 'fx Insert opens on the ribbon category');
els.fbFx.onclick();
ok(els.fnDlgCat.value === 'all', 'formula-bar fx opens All');
els.fnDlgCat.value = 'recent'; els.fnDlgCat.onchange();
ok(rowNames().length === 1 && rowNames()[0] === 'VLOOKUP',
  'Most recently used drops unimplemented entries (LEFT) from wb.recentFns');

/* ---------- summary ---------- */
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);