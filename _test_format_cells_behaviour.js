/* Behaviour checks for the Format Cells dialog.
 *
 * Loads js/formatCells.js into a DOM sandbox with the engine functions stubbed,
 * then drives real open -> edit -> OK / Cancel cycles and asserts what reached
 * applyStyle / applyBorderPatch. Staging is the point of the dialog, so
 * "Cancel changes nothing" is asserted explicitly.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
let passed = 0, failed = 0;
function ok(c, m) { if (c) { passed++; console.log('  PASS ' + m); } else { failed++; console.log('  FAIL ' + m); } }

function mkEl(id, tag) {
  const el = {
    id, tagName: (tag || 'div').toUpperCase(), value: '', checked: false,
    textContent: '', hidden: false, options: [], dataset: {}, style: {},
    attrs: {}, cls: new Set(),
    get className() { return [...this.cls].join(' '); },
    set className(v) { this.cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
    classList: {
      add(c) { el.cls.add(c); },
      remove(c) { el.cls.delete(c); },
      contains(c) { return el.cls.has(c); },
      toggle(c, on) { if (on === undefined) { el.cls.has(c) ? el.cls.delete(c) : el.cls.add(c); } else if (on) { el.cls.add(c); } else { el.cls.delete(c); } }
    },
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    removeAttribute(k) { delete this.attrs[k]; },
    appendChild() { }, addEventListener() { }, focus() { },
    onclick: null, onchange: null, oninput: null
  };
  return el;
}

const SELECTS = ['fmtFont', 'fmtSize', 'fmtStyle', 'fmtUnderline', 'fmtBorderStyle',
  'fmtHAlign', 'fmtVAlign', 'fmtRotate'];
const INPUTS = ['fmtFontColor', 'fmtBgColor', 'fmtIndent', 'fmtStrike',
  'fmtNoFill', 'fmtWrap', 'fmtBorderAll'];
const OTHER = ['fmtDlg', 'fmtSample', 'fmtFillSample', 'fmtBGrid',
  'fmtOk', 'fmtCancel', 'fmtClose', 'fmtReset', 'bFmtCells'];

const els = {};
OTHER.forEach(i => { els[i] = mkEl(i, i.indexOf('fmt') === 0 && /Ok|Cancel|Close|Reset/.test(i) ? 'button' : 'div'); });
SELECTS.forEach(i => { els[i] = mkEl(i, 'select'); });
INPUTS.forEach(i => { els[i] = mkEl(i, 'input'); });

const edgeButtons = ['t', 'b', 'l', 'r'].map(e => {
  const b = mkEl('edge' + e, 'button');
  b.dataset.edge = e;
  return b;
});
const tabButtons = ['font', 'fill', 'border', 'align'].map(t => {
  const b = mkEl('tab' + t, 'button');
  b.dataset.fmtTab = t;
  return b;
});
const paneEls = ['font', 'fill', 'border', 'align'].map(p => {
  const e = mkEl('pane' + p);
  e.dataset.fmtPane = p;
  return e;
});

let applied = [];
let borderPatches = [];
let currentStyle = { ff: 'Calibri', fs: 11 };

function build() {
  applied = [];
  borderPatches = [];
  const doc = {
    readyState: 'complete',
    getElementById: id => els[id] || null,
    querySelectorAll: sel => {
      if (sel === '.fmtBEdge') return edgeButtons;
      if (sel === '[data-fmt-tab]') return tabButtons;
      if (sel === '[data-fmt-pane]') return paneEls;
      return [];
    },
    createElement: () => mkEl('opt', 'option'),
    addEventListener() { }
  };
  const sandbox = {
    document: doc, console, window: {},
    FNTS: ['Calibri', 'Arial'], FSZ: [8, 11, 12, 18], FS_DEFAULT: 11, PT: 96 / 72,
    active: 'A1',
    styleOf: () => currentStyle,
    applyStyle: p => { applied.push(p); },
    applyBorderPatch: ps => { borderPatches.push(ps); },
    snapshot: () => { }, saveLS: () => { }, renderAll: () => { },
    setTimeout, clearTimeout, JSON, Math, Object, Array, parseInt, parseFloat
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'formatCells.js'), 'utf8'), sandbox);
  return sandbox;
}

console.log('=== Format Cells dialog behaviour ===');

console.log('\n--- opens and closes ---');
let S = build();
S.fmtOpen('font');
ok(els.fmtDlg.classList.contains('open'), 'dialog gains the open class');
S.fmtClose();
ok(!els.fmtDlg.classList.contains('open'), 'fmtClose removes it');

console.log('\n--- populates from the current selection ---');
currentStyle = { ff: 'Georgia', fs: 18, b: true, i: true, color: '#ff0000', bg: '#00ff00' };
S = build();
S.fmtOpen('font');
ok(els.fmtFont.value === 'Georgia', 'font family read from the selection');
ok(els.fmtSize.value === '18', 'font size read from the selection');
ok(els.fmtStyle.value === 'bold italic', 'bold + italic combine into Bold Italic');
ok(els.fmtNoFill.checked === false, 'a background is detected as fill, not No fill');

console.log('\n--- OK applies font, size, style and colour ---');
S = build();
S.fmtOpen('font');
els.fmtStyle.value = 'bold';
els.fmtFont.value = 'Arial';
els.fmtSize.value = '12';
els.fmtFontColor.value = '#123456';
S.fmtApply();
ok(applied.length === 1, 'applyStyle called exactly once');
const p = applied[0] || {};
ok(p.ff === 'Arial', 'font family applied');
ok(p.fs === 12, 'font size applied');
ok(p.b === true, 'bold applied');
ok(p.i === false, 'italic cleared when style is Bold only');
ok(p.color === '#123456', 'font colour applied');
ok(!els.fmtDlg.classList.contains('open'), 'dialog closes after OK');
console.log('\n--- Cancel changes nothing ---');
S = build();
S.fmtOpen('font');
els.fmtStyle.value = 'bold italic';
els.fmtSize.value = '18';
els.fmtBgColor.value = '#abcdef';
S.fmtClose();
ok(applied.length === 0, 'no styles applied on Cancel');
ok(borderPatches.length === 0, 'no borders applied on Cancel');

console.log('\n--- background colour ---');
S = build();
S.fmtOpen('fill');
els.fmtNoFill.checked = false;
els.fmtBgColor.value = '#ffcc00';
S.fmtApply();
ok(applied[0] && applied[0].bg === '#ffcc00', 'background colour applied');

console.log('\n--- "No fill" clears the background ---');
S = build();
S.fmtOpen('fill');
els.fmtNoFill.checked = true;
S.fmtApply();
ok(applied[0] && !applied[0].bg, 'No fill clears the background');

console.log('\n--- border edges ---');
S = build();
S.fmtOpen('border');
edgeButtons[0].onclick();
ok(edgeButtons[0].classList.contains('on'), 'clicking an edge lights it');
els.fmtBorderStyle.value = 'thick';
S.fmtApply();
ok(borderPatches.length === 1, 'applyBorderPatch called once');
const patch = borderPatches[0] || [];
ok(patch.length === 1 && patch[0].e === 't', 'only the selected edge is patched');
ok(patch[0] && patch[0].v === 'thick', 'chosen line width is used');

console.log('\n--- clicking a lit edge turns it off ---');
S = build();
S.fmtOpen('border');
edgeButtons[1].onclick();
ok(edgeButtons[1].classList.contains('on'), 'bottom edge lit');
edgeButtons[1].onclick();
ok(!edgeButtons[1].classList.contains('on'), 'clicking again clears it');

console.log('\n--- no edges selected clears existing borders ---');
S = build();
S.fmtOpen('border');
S.fmtApply();
ok(borderPatches.length === 1 && borderPatches[0][0].v === null,
  'empty edge selection clears borders');

console.log('\n--- "apply to all four sides" ---');
S = build();
S.fmtOpen('border');
edgeButtons.forEach(b => b.classList.remove('on'));
els.fmtBorderAll.checked = true;
els.fmtBorderAll.onchange();
ok(edgeButtons.every(b => b.classList.contains('on')), 'all four edges lit');

console.log('\n--- alignment tab ---');
S = build();
S.fmtOpen('align');
els.fmtHAlign.value = 'center';
els.fmtVAlign.value = 'mid';
els.fmtRotate.value = '45';
els.fmtIndent.value = '2';
els.fmtWrap.checked = true;
S.fmtApply();
const a = applied[0] || {};
ok(a.al === 'center', 'horizontal alignment applied');
ok(a.va === 'mid', 'vertical alignment applied');
ok(a.rot === 45, 'rotation applied');
ok(a.indent === 2, 'indent applied');
ok(a.wrap === true, 'wrap text applied');

console.log('\n--- tabs switch panes ---');
S = build();
S.fmtOpen('font');
ok(paneEls[0].classList.contains('on'), 'font pane visible initially');
tabButtons[2].onclick();
ok(paneEls[2].classList.contains('on'), 'border pane becomes visible');
ok(!paneEls[0].classList.contains('on'), 'font pane hidden after switching');

console.log('\n--- preview reflects pending edits ---');
S = build();
S.fmtOpen('font');
els.fmtSize.value = '12';
els.fmtStyle.value = 'bold italic';
els.fmtStyle.onchange();
ok(els.fmtSample.style.fontWeight === '700', 'preview shows bold');
ok(els.fmtSample.style.fontStyle === 'italic', 'preview shows italic');
ok(els.fmtSample.style.fontSize === (12 * 96 / 72).toFixed(2) + 'px',
  'preview size uses the engine point-to-pixel conversion');

console.log('\n--- launcher opens the dialog ---');
S = build();
els.bFmtCells.onclick();
ok(els.fmtDlg.classList.contains('open'), 'corner launcher opens Format Cells');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);