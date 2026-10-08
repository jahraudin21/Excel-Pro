/* ================= Format Cells dialog (Ctrl+1) =================
 *
 * Reached from the Font group's corner launcher, or Ctrl+1.
 *
 * Edits are staged in a plain object and applied once on OK, which is what makes
 * Cancel trustworthy: nothing touches the sheet until the user commits. Reads and
 * writes go through the engine's own applyStyle / applyBorderPatch, so the dialog
 * cannot drift from what the ribbon buttons do.
 */
'use strict';

/* The pending edit set. Rebuilt from the current selection each time the dialog
   opens, so reopening always reflects reality rather than the last attempt. */
let fmtPending = null;

/* Sticky border choices. Excel remembers the last line style and colour you
   picked for the session, so the next border is one click rather than three. */
const fmtLastBorder = { style: 'thin', color: '#323130' };

function fmtEl(id) { return document.getElementById(id); }

/* ---------- open / close ---------- */

function fmtOpen(tab) {
  const d = fmtEl('fmtDlg');
  if (!d) return;
  fmtPopulate();
  fmtShowTab(tab || 'font');
  d.classList.add('open');
  const ok = fmtEl('fmtOk');
  if (ok && ok.focus) { try { ok.focus(); } catch (e) { /* focus is best-effort */ } }
}

function fmtClose() {
  const d = fmtEl('fmtDlg');
  if (d) d.classList.remove('open');
  /* Discard the staged edit: Cancel must leave the sheet untouched. */
  fmtPending = null;
}

function fmtShowTab(name) {
  document.querySelectorAll('[data-fmt-tab]').forEach(b => {
    const on = b.dataset.fmtTab === name;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('[data-fmt-pane]').forEach(p => {
    p.classList.toggle('on', p.dataset.fmtPane === name);
  });
}

/* ---------- populate from the selection ---------- */

function fmtSet(id, value) {
  const el = fmtEl(id);
  if (el) el.value = value;
}

function fmtSetChecked(id, value) {
  const el = fmtEl(id);
  if (el) el.checked = !!value;
}

/* Fill the two <select>s from the engine's own font lists so the dialog can
   never offer a family or size the grid does not have. */
function fmtFillFontLists() {
  const fam = fmtEl('fmtFont');
  const size = fmtEl('fmtSize');
  if (fam && !fam.options.length && typeof FNTS !== 'undefined') {
    FNTS.forEach(f => {
      const o = document.createElement('option');
      o.value = f; o.textContent = f; fam.appendChild(o);
    });
  }
  if (size && !size.options.length && typeof FSZ !== 'undefined') {
    FSZ.forEach(x => {
      const o = document.createElement('option');
      o.value = x; o.textContent = x; size.appendChild(o);
    });
  }
}

function fmtPopulate() {
  fmtFillFontLists();
  const s = (typeof styleOf === 'function') ? styleOf(active) : {};
  const border = s.border || {};

  fmtPending = {
    ff: s.ff || 'Calibri',
    fs: s.fs || (typeof FS_DEFAULT !== 'undefined' ? FS_DEFAULT : 11),
    b: !!s.b,
    i: !!s.i,
    u: !!s.u,
    st: !!s.st,
    color: s.color || '',
    bg: s.bg || '',
    al: s.al || '',
    va: s.va || '',
    rot: s.rot || 0,
    indent: s.indent || 0,
    wrap: !!s.wrap,
    /* Which edges the dialog shows as on, and the style to apply to them. */
    edges: {
      t: !!border.t,
      b: !!border.b,
      l: !!border.l,
      r: !!border.r
    },
    borderStyle: border.t || border.b || border.l || border.r || fmtLastBorder.style,
    borderColor: border.color || fmtLastBorder.color
  };

  fmtSet('fmtFont', fmtPending.ff);
  fmtSet('fmtSize', String(fmtPending.fs));
  fmtSet('fmtStyle', fmtPending.b && fmtPending.i ? 'bold italic'
    : fmtPending.b ? 'bold' : fmtPending.i ? 'italic' : 'normal');
  fmtSet('fmtUnderline', fmtPending.u ? 'single' : 'none');
  fmtSet('fmtFontColor', fmtPending.color || '#000000');
  fmtSetChecked('fmtStrike', fmtPending.st);

  fmtSet('fmtBgColor', fmtPending.bg || '#ffffff');
  fmtSetChecked('fmtNoFill', !fmtPending.bg);

  fmtSet('fmtBorderStyle', fmtPending.borderStyle);
  fmtSet('fmtBorderColor', fmtPending.borderColor);
  fmtSetChecked('fmtBorderAll', false);

  fmtSet('fmtHAlign', fmtPending.al);
  fmtSet('fmtVAlign', fmtPending.va);
  fmtSet('fmtRotate', String(fmtPending.rot));
  fmtSet('fmtIndent', String(fmtPending.indent));
  fmtSetChecked('fmtWrap', fmtPending.wrap);

  fmtPaintEdges();
  fmtPaintSample();
}

/* ---------- live preview ---------- */

function fmtPaintEdges() {
  document.querySelectorAll('.fmtBEdge').forEach(b => {
    b.classList.toggle('on', !!(fmtPending && fmtPending.edges[b.dataset.edge]));
  });
}

function fmtPaintSample() {
  const el = fmtEl('fmtSample');
  if (!el || !fmtPending) return;
  /* Points to pixels with the engine's own PT, so the preview cannot disagree
     with how the grid actually renders the size. */
  const px = fmtPending.fs * (typeof PT !== 'undefined' ? PT : 96 / 72);
  el.style.fontFamily = fmtPending.ff || '';
  el.style.fontSize = px.toFixed(2) + 'px';
  el.style.fontWeight = fmtPending.b ? '700' : '';
  el.style.fontStyle = fmtPending.i ? 'italic' : '';
  el.style.textDecoration = fmtPending.u
    ? (fmtPending.st ? 'underline line-through' : 'underline')
    : (fmtPending.st ? 'line-through' : '');
  el.style.color = fmtPending.color || '';

  const fill = fmtEl('fmtFillSample');
  if (fill) fill.style.background = fmtPending.bg || 'transparent';
}
/* ---------- collect + apply ---------- */

/* Read every control into the staged object. One pass, so OK always applies
   what is on screen regardless of which tab the user touched last. */
function fmtCollect() {
  if (!fmtPending) return null;
  const val = id => { const el = fmtEl(id); return el ? el.value : ''; };
  const chk = id => { const el = fmtEl(id); return el ? el.checked : false; };

  fmtPending.ff = val('fmtFont');
  fmtPending.fs = parseFloat(val('fmtSize')) || fmtPending.fs;
  const style = val('fmtStyle');
  fmtPending.b = style === 'bold' || style === 'bold italic';
  fmtPending.i = style === 'italic' || style === 'bold italic';
  fmtPending.u = val('fmtUnderline') !== 'none';
  fmtPending.st = chk('fmtStrike');
  fmtPending.color = val('fmtFontColor');

  fmtPending.bg = chk('fmtNoFill') ? '' : val('fmtBgColor');

  fmtPending.borderStyle = val('fmtBorderStyle');
  fmtPending.borderColor = val('fmtBorderColor');
  if (fmtPending.borderStyle) {
    fmtLastBorder.style = fmtPending.borderStyle;
    fmtLastBorder.color = fmtPending.borderColor;
  }

  fmtPending.al = val('fmtHAlign');
  fmtPending.va = val('fmtVAlign');
  fmtPending.rot = parseFloat(val('fmtRotate')) || 0;
  fmtPending.indent = Math.max(0, parseInt(val('fmtIndent'), 10) || 0);
  fmtPending.wrap = chk('fmtWrap');
  return fmtPending;
}

function fmtApply() {
  const p = fmtCollect();
  if (!p) return;

  /* Font, colour, alignment and layout all go through applyStyle, which already
     snapshots for undo, repaints and re-syncs the ribbon. */
  applyStyle({
    ff: p.ff,
    fs: p.fs,
    b: p.b,
    i: p.i,
    u: p.u,
    st: p.st,
    color: p.color || null,
    bg: p.bg || null,
    al: p.al,
    va: p.va,
    rot: p.rot,
    indent: p.indent,
    wrap: p.wrap
  });

  /* Borders are applied separately: applyStyle does not know about the nested
     border object, and applyBorderPatch already understands the t/b/l/r keys. */
  const anyEdge = p.edges.t || p.edges.b || p.edges.l || p.edges.r;
  if (anyEdge && p.borderStyle) {
    /* Reuse the engine's patcher so outer-edge semantics on a multi-cell
       selection stay identical to the ribbon's Borders menu. */
    applyBorderPatch(['t', 'b', 'l', 'r']
      .filter(e => p.edges[e])
      .map(e => ({ e: e, v: p.borderStyle })));
  } else if (!anyEdge) {
    /* No edge selected: clear whatever is there, same as the Borders ▸ None. */
    applyBorderPatch([{ e: 'a', v: null }]);
  }

  fmtClose();
}
/* ---------- wiring ---------- */

function initFormatCells() {
  /* Wired as $('#bFmtCells') rather than through fmtEl so it matches the
     convention every other ribbon button in this codebase uses - which is also
     what _test_no_regression.mjs and _ribboncheck.mjs scan for when they report
     unwired buttons. */
  const launcher = (typeof $ === 'function') ? $('#bFmtCells') : document.getElementById('bFmtCells');
  if (launcher) launcher.onclick = () => fmtOpen('font');

  const ok = fmtEl('fmtOk');
  if (ok) ok.onclick = fmtApply;
  const cancel = fmtEl('fmtCancel');
  if (cancel) cancel.onclick = fmtClose;
  const close = fmtEl('fmtClose');
  if (close) close.onclick = fmtClose;
  const reset = fmtEl('fmtReset');
  if (reset) reset.onclick = fmtReset;

  document.querySelectorAll('[data-fmt-tab]').forEach(b => {
    b.onclick = () => fmtShowTab(b.dataset.fmtTab);
  });

  /* Toggling an edge: clicking a lit edge switches it off, as in Excel. */
  document.querySelectorAll('.fmtBEdge').forEach(b => {
    b.onclick = () => {
      if (!fmtPending) return;
      const e = b.dataset.edge;
      fmtPending.edges[e] = !fmtPending.edges[e];
      fmtPaintEdges();
    };
  });

  const all = fmtEl('fmtBorderAll');
  if (all) {
    all.onchange = () => {
      if (!fmtPending) return;
      const on = all.checked;
      ['t', 'b', 'l', 'r'].forEach(e => { fmtPending.edges[e] = on; });
      fmtPaintEdges();
    };
  }

  /* Any control that changes the preview re-reads into the staged object and
     repaints. Reading straight from the DOM keeps preview and apply identical. */
  const onPreview = () => {
    if (!fmtPending) return;
    const v = id => { const el = fmtEl(id); return el ? el.value : ''; };
    fmtPending.ff = v('fmtFont');
    fmtPending.fs = parseFloat(v('fmtSize')) || fmtPending.fs;
    const st = v('fmtStyle');
    fmtPending.b = st === 'bold' || st === 'bold italic';
    fmtPending.i = st === 'italic' || st === 'bold italic';
    fmtPending.u = v('fmtUnderline') !== 'none';
    fmtPending.st = fmtEl('fmtStrike') ? fmtEl('fmtStrike').checked : false;
    fmtPending.color = v('fmtFontColor');
    fmtPending.bg = fmtEl('fmtNoFill') && fmtEl('fmtNoFill').checked ? '' : v('fmtBgColor');
    fmtPaintSample();
  };
  ['fmtFont', 'fmtSize', 'fmtStyle', 'fmtUnderline', 'fmtStrike',
   'fmtFontColor', 'fmtBgColor', 'fmtNoFill'].forEach(id => {
    const el = fmtEl(id);
    if (!el) return;
    el.onchange = onPreview;
    el.oninput = onPreview;
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const d = fmtEl('fmtDlg');
      if (d && d.classList.contains('open')) { fmtClose(); return; }
    }
    /* Ctrl+1 opens Format Cells, matching Excel. Guarded so it does not fire
       while a field in another dialog owns the keyboard. */
    if ((e.ctrlKey || e.metaKey) && e.key === '1') {
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      e.preventDefault();
      fmtOpen('font');
    }
  });
}

if (typeof document !== 'undefined') {
  const bootFmt = () => { try { initFormatCells(); } catch (e) { /* never block boot */ } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootFmt);
  else bootFmt();
}

function fmtReset() {
  fmtSet('fmtStyle', 'normal');
  fmtSet('fmtUnderline', 'none');
  fmtSetChecked('fmtStrike', false);
  fmtSet('fmtFontColor', '#000000');
  fmtSetChecked('fmtNoFill', true);
  fmtSet('fmtHAlign', '');
  fmtSet('fmtVAlign', '');
  fmtSet('fmtRotate', '0');
  fmtSet('fmtIndent', '0');
  fmtSetChecked('fmtWrap', false);
  if (fmtPending) {
    fmtPending.edges = { t: false, b: false, l: false, r: false };
  }
  fmtPaintEdges();
  fmtPaintSample();
}