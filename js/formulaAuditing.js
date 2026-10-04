/* ================= Formula Auditing: Evaluate, Error Check, Watch Window =================
 *
 * The Formulas tab already had Trace Precedents/Dependents and Show Formulas.
 * These are the remaining three Excel commands in that group.
 *
 * Every read goes through the engine (cell, vals, dispVal, evalFormula, isErr)
 * rather than a parallel copy of the state, so auditing cannot disagree with
 * the grid.
 */
'use strict';

/* ---------- i18n ----------
 * T() falls through to the key name when a key is undefined, which would put
 * "watchEmpty" in the dialog instead of a sentence, so every key the auditing
 * UI touches is defined here. Registered through Object.assign(STR, ...) like
 * every other feature module, since STR itself lives in script.js. */
if (typeof STR !== 'undefined') Object.assign(STR, {
  tipEval:{np:'सूत्र मूल्याङ्कन',hi:'सूत्र मूल्यांकन',en:'Evaluate Formula'},
  bEval:{np:'मूल्याङ्कन',hi:'मूल्यांकन',en:'Evaluate'},
  evalTitle:{np:'सूत्र मूल्याङ्कन',hi:'सूत्र मूल्यांकन',en:'Evaluate Formula'},
  evalHint:{np:'सक्रिय सूत्रले प्रयोग गरेका मानहरू, अनि नतिजा।',hi:'सक्रिय सूत्र द्वारा उपयोग किए गए मान, फिर परिणाम।',en:'Values used by the active formula, then its result.'},
  evalNoFormula:{np:'सक्रिय सेलमा कुनै सूत्र छैन।',hi:'सक्रिय सेल में कोई सूत्र नहीं है।',en:'The active cell has no formula.'},
  evalNoRefs:{np:'यो सूत्रले कुनै सेललाई संदर्भ गर्दैन।',hi:'यह सूत्र किसी सेल को संदर्भित नहीं करता।',en:'This formula refers to no cells.'},
  evalResultLbl:{np:'नतिजा',hi:'परिणाम',en:'Result'},
  tipErrChk:{np:'त्रुटि जाँच',hi:'त्रुटि जाँच',en:'Error Checking'},
  bErrChk:{np:'त्रुटि',hi:'त्रुटि',en:'Errors'},
  errChkHead:{np:'त्रुटि जाँच',hi:'त्रुटि जाँच',en:'Error Checking'},
  errNone:{np:'कुनै त्रुटि भेटिएन।',hi:'कोई त्रुटि नहीं मिली।',en:'No formula errors found.'},
  errMore:{np:'र थप {n}…',hi:'और {n}…',en:'…and {n} more'},
  tipWatch:{np:'हेर्ने डिब्बा',hi:'वॉच विंडो',en:'Watch Window'},
  bWatch:{np:'हेर्नुहोस्',hi:'वॉच',en:'Watch'},
  watchTitle:{np:'हेर्ने डिब्बा',hi:'वॉच विंडो',en:'Watch Window'},
  watchHint:{np:'तपाईंले हेरिरहेका सेलहरू। एउटामा क्लिक गरे त्यसैमा जानुहोस्।',hi:'आप जिन सेल पर नज़र रख रहे हैं। किसी पर क्लिक करें उसी पर जाने के लिए।',en:'Cells you are tracking. Click one to jump to it.'},
  watchHead:{np:'हेर्ने डिब्बा',hi:'वॉच विंडो',en:'Watch Window'},
  watchEmpty:{np:'अहिलेसम्म कुनै सेल हेरिएको छैन।',hi:'अभी तक कोई सेल नहीं देखा जा रहा।',en:'Nothing is being watched yet.'},
  watchRemove:{np:'हेर्न बन्द गर्नुहोस्',hi:'वॉच करना बंद करें',en:'Stop watching'},
  watchClear:{np:'सबै हटाउनुहोस्',hi:'सभी हटाएँ',en:'Clear all'},
  watchAdd:{np:'सक्रिय सेल थप्नुहोस्',hi:'सक्रिय सेल जोड़ें',en:'Add current cell'},
  watchAdded:{np:'हेर्ने डिब्बामा थपियो',hi:'वॉच विंडो में जोड़ा गया',en:'Added to the Watch Window'}
});

/* ---------- Evaluate Formula ---------- */

/* Step-by-step evaluation of the active cell's formula.
 *
 * Excel shows each reference as it resolves, then the final result. This walks
 * the formula left to right and lists the current value of every cell it
 * reads, then re-runs the formula through the engine for the result. Reusing
 * evalFormula rather than inventing an intermediate-tree model the engine does
 * not have keeps the two in step. */
function evaluateFormula() {
  const c = cell(active);
  if (!c || typeof c.raw !== 'string' || c.raw[0] !== '=') {
    return { steps: [], result: null, empty: true };
  }
  const steps = refsInFormula(c.raw).map(function (ref) {
    return { ref: ref, value: dispVal(ref) };
  });
  let result;
  try {
    result = evalFormula(c.raw.slice(1));
  } catch (e) {
    result = isErr(e) ? e : String(e && e.message ? e.message : e);
  }
  return { steps: steps, result: result, empty: false };
}

/* Render a value the way the grid would show it, so the dialog and the cell
 * never disagree (a formula returning 0.1+0.2 shows 0.3 in both places). */
function evalValueText(v) {
  if (v === '' || v == null) return '—';
  if (typeof v === 'number') return dispVal(active);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}

function openEvaluateDialog() {
  const d = $('#evalDlg');
  if (!d) return;
  const r = evaluateFormula();
  const list = $('#evalSteps');
  const out = $('#evalResult');
  if (list) {
    list.innerHTML = '';
    if (r.empty) {
      const li = document.createElement('li');
      li.className = 'muted';
      li.textContent = T('evalNoFormula');
      list.appendChild(li);
    } else {
      r.steps.forEach(function (s) {
        const li = document.createElement('li');
        li.textContent = s.ref + ' = ' + evalValueText(s.value);
        list.appendChild(li);
      });
      if (!r.steps.length) {
        const li = document.createElement('li');
        li.className = 'muted';
        li.textContent = T('evalNoRefs');
        list.appendChild(li);
      }
    }
  }
  if (out) out.textContent = r.empty ? '—' : evalValueText(r.result);
  d.classList.add('open');
}

/* ---------- Error Checking ---------- */

/* Error Checking: walk the used range for #DIV/0!, #VALUE!, #NAME?, #N/A and
 * friends. The engine stores errors as strings beginning with '#', which is
 * precisely how isErr detects them, so the engine's own test is reused rather
 * than a second copy of it living here. */
function findCellErrors() {
  const out = [];
  for (const ref in sheet().cells) {
    if (isErr(vals[ref])) out.push(ref);
  }
  return out;
}

function errorCheckMenu(anchor) {
  const errs = findCellErrors();
  const items = [{ head: T('errChkHead') }];
  if (!errs.length) {
    items.push({ label: T('errNone') });
  } else {
    /* Cap the list: a sheet-wide breakage can produce hundreds, and a popup of
     * 500 entries is unusable. The trailing count still reports the truth. */
    errs.slice(0, 25).forEach(function (ref) {
      items.push({
        label: ref + '  —  ' + String(vals[ref]),
        action: function () { active = selA = selB = ref; renderAll(); syncRibbon(); }
      });
    });
    if (errs.length > 25) {
      items.push(null, { label: T('errMore').replace('{n}', String(errs.length - 25)) });
    }
  }
  popMenu(anchor, items);
}

/* ---------- Watch Window ---------- */

/* Watch Window: pin cells so you can follow them while auditing elsewhere.
 * State lives in wb.watch so it survives a repaint, as a real watch window does. */
function watchList() {
  return wb.watch || [];
}

/* Add a cell to the watch list. Reports whether it was actually added so the
 * caller can acknowledge it: re-adding an already-watched cell is a no-op, and
 * saying "added" then would be a lie. */
function watchAdd(ref) {
  const list = watchList();
  if (!ref || list.indexOf(ref) >= 0) return false;
  wb.watch = list.concat([ref]);
  saveLS();
  return true;
}

function watchRemove(ref) {
  wb.watch = watchList().filter(function (r) { return r !== ref; });
  saveLS();
}

function renderWatchList() {
  const ul = $('#watchList');
  if (!ul) return;
  ul.innerHTML = '';
  const list = watchList();
  if (!list.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = T('watchEmpty');
    ul.appendChild(li);
    return;
  }
  list.forEach(function (ref) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'watchRef';
    label.textContent = ref + '  =  ' + (vals[ref] === undefined ? '' : dispVal(ref));
    /* Clicking the row jumps to the cell, which is the point of a watch window. */
    label.onclick = function () {
      active = selA = selB = ref;
      renderAll();
      syncRibbon();
    };
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'watchX';
    btn.setAttribute('aria-label', T('watchRemove'));
    btn.textContent = '×';
    btn.onclick = function () { watchRemove(ref); renderWatchList(); };
    li.appendChild(label);
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function openWatchDialog() {
  const d = $('#watchDlg');
  if (!d) return;
  renderWatchList();
  d.classList.add('open');
}

/* ---------- Wiring ---------- */

/* Bound through the shared $('#id') helper, so a control that is absent (a
 * trimmed build, or a partial page) is skipped instead of throwing and leaving
 * the rest of the group unwired. */
function initFormulaAuditing() {
  const on = function (id, fn) {
    const el = $(id);
    if (el) el.onclick = fn;
  };
  const closeDlg = function (id) {
    const d = $(id);
    if (d) d.classList.remove('open');
  };

  on('#bEvalFormula', openEvaluateDialog);
  on('#bErrorCheck', function () { errorCheckMenu(this); });
  on('#bWatchWindow', openWatchDialog);

  on('#evalClose', function () { closeDlg('#evalDlg'); });
  on('#watchClose', function () { closeDlg('#watchDlg'); });

  on('#watchAdd', function () {
    if (watchAdd(active)) setStatusMode(T('watchAdded'));
    renderWatchList();
  });
  on('#watchClear', function () {
    wb.watch = [];
    saveLS();
    renderWatchList();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeDlg('#evalDlg');
    closeDlg('#watchDlg');
  });
}

if (typeof document !== 'undefined') {
  const bootAuditing = function () { try { initFormulaAuditing(); } catch (e) { /* never block boot */ } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootAuditing);
  else bootAuditing();
}
