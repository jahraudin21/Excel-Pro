/* ================= Insert Function dialog (function library) =================
 *
 * The Formulas tab already shipped a flat popMenu list of functions; Excel's
 * real fx button opens a dialog instead: a searchable library with a category
 * filter, the selected function's syntax and a one-line description, and OK to
 * insert. This module is that dialog.
 *
 * Insertion deliberately reuses insertFn() - the same helper the popMenu used -
 * so what lands in the cell is identical to the old path: "=NAME(" with the
 * caret inside the parentheses, and the name recorded in wb.recentFns.
 *
 * The list is derived from the engine registries (FN, FN_CATS, FN_HELP) and
 * filtered to functions the engine actually implements, so the dialog can never
 * offer a name that evaluates to #NAME?. (FN_CATS currently advertises 19 names
 * with no FN implementation - LEFT, TEXT, IFNA and friends - which the old
 * category menu would happily insert; _test_insert_function.js pins both the
 * filter and the syntax table against the real FN registry.)
 */
'use strict';

/* ---------- i18n ----------
 * Same contract as the other feature modules: T() falls through to the key
 * when a string is missing, which would render "fnSearchPh" as the placeholder
 * text, so every key the dialog touches is defined here in all three languages. */
if (typeof STR !== 'undefined') Object.assign(STR, {
  fnDlgHint:{np:'फङ्सन खोज्नुहोस् वा श्रेणी छान्नुहोस्, अनि फङ्सन छानेर ठीक थिच्नुहोस्।',
             hi:'फ़ंक्शन खोजें या श्रेणी चुनें, फिर फ़ंक्शन चुनकर ठीक दबाएँ।',
             en:'Search or pick a category, choose a function, then OK to insert it.'},
  fnSearchPh:{np:'फङ्सन खोज्नुहोस्',hi:'फ़ंक्शन खोजें',en:'Search functions'},
  fnCatAll:{np:'सबै',hi:'सभी',en:'All'},
  fnCatRecent:{np:'हाल प्रयोग',hi:'हाल ही में प्रयोग',en:'Most recently used'},
  fnOk:{np:'ठीक',hi:'ठीक है',en:'OK'},
  fnCancel:{np:'रद्द',hi:'रद्द करें',en:'Cancel'},
  fnEmpty:{np:'मिल्दो फङ्सन भेटिएन',hi:'कोई मिलता फ़ंक्शन नहीं मिला',en:'No matching function.'}
});

/* ---------- state ---------- */
let fnLibSel = null;   /* name of the highlighted row, or null when the list is empty */

/* ---------- data ---------- */

/* Every function the list may offer, for a category, filtered to what the
 * engine can actually call. 'all' already comes from Object.keys(FN) (the same
 * source fnItemList uses); the category arrays come from FN_CATS and drop the
 * unimplemented names rather than inserting a formula that evaluates to #NAME?. */
function fnLibUniverse(cat) {
  const impl = n => typeof FN[n] === 'function';
  if (cat === 'recent') return (wb.recentFns || []).filter(impl);
  const base = (cat && cat !== 'all' && FN_CATS[cat]) ? FN_CATS[cat].slice() : Object.keys(FN);
  return base.filter(impl);
}

function fnLibSyntax(name) {
  return FN_SYNTAX[name] || name + '(…)';
}

/* ---------- syntax signatures ----------
 * Excel's dialog shows the call signature above the description. This table
 * covers every name in the FN registry; _test_insert_function.js asserts that
 * coverage, so a function added to FN without syntax here fails the suite
 * instead of silently rendering "NAME(…)". */
const FN_SYNTAX={
 ABS:'ABS(number)',
 AND:'AND(logical1,[logical2],…)',
 AVERAGE:'AVERAGE(number1,[number2],…)',
 AVERAGEIF:'AVERAGEIF(range,criteria,[average_range])',
 CEILING:'CEILING(number,significance)',
 CHAR:'CHAR(number)',
 CHOOSE:'CHOOSE(index_num,value1,[value2],…)',
 CLEAN:'CLEAN(text)',
 CODE:'CODE(text)',
 COLUMNS:'COLUMNS(array)',
 CONCAT:'CONCAT(text1,[text2],…)',
 CONCATENATE:'CONCATENATE(text1,[text2],…)',
 COUNT:'COUNT(value1,[value2],…)',
 COUNTA:'COUNTA(value1,[value2],…)',
 COUNTBLANK:'COUNTBLANK(range)',
 COUNTIF:'COUNTIF(range,criteria)',
 COUNTIFS:'COUNTIFS(criteria_range1,criteria1,[criteria_range2,criteria2],…)',
 CUMIPMT:'CUMIPMT(rate,nper,pv,start_period,end_period,type)',
 DATE:'DATE(year,month,day)',
 DAY:'DAY(serial_number)',
 DAYS:'DAYS(end_date,start_date)',
 DB:'DB(cost,salvage,life,period,[month])',
 DDB:'DDB(cost,salvage,life,period,[factor])',
 EDATE:'EDATE(start_date,months)',
 EFFECT:'EFFECT(nominal_rate,npery)',
 EOMONTH:'EOMONTH(start_date,months)',
 EXACT:'EXACT(text1,text2)',
 EXP:'EXP(number)',
 FLOOR:'FLOOR(number,significance)',
 FV:'FV(rate,nper,pmt,[pv],[type])',
 HLOOKUP:'HLOOKUP(lookup_value,table_array,row_index_num,[range_lookup])',
 IF:'IF(logical_test,value_if_true,[value_if_false])',
 IFERROR:'IFERROR(value,value_if_error)',
 IFS:'IFS(logical_test1,value_if_true1,[logical_test2,value_if_true2],…)',
 INDEX:'INDEX(array,row_num,[column_num])',
 INT:'INT(number)',
 IPMT:'IPMT(rate,per,nper,pv,[fv],[type])',
 IRR:'IRR(values,[guess])',
 ISERR:'ISERR(value)',
 ISERROR:'ISERROR(value)',
 LARGE:'LARGE(array,k)',
 LEN:'LEN(text)',
 LN:'LN(number)',
 LOG:'LOG(number,[base])',
 LOWER:'LOWER(text)',
 MATCH:'MATCH(lookup_value,lookup_array,[match_type])',
 MAX:'MAX(number1,[number2],…)',
 MEDIAN:'MEDIAN(number1,[number2],…)',
 MIN:'MIN(number1,[number2],…)',
 MOD:'MOD(number,divisor)',
 MODE:'MODE(number1,[number2],…)',
 MONTH:'MONTH(serial_number)',
 MROUND:'MROUND(number,multiple)',
 N:'N(value)',
 NOMINAL:'NOMINAL(effect_rate,npery)',
 NOT:'NOT(logical)',
 NOW:'NOW()',
 NPER:'NPER(rate,pmt,pv,[fv],[type])',
 NPV:'NPV(rate,value1,[value2],…)',
 OR:'OR(logical1,[logical2],…)',
 PDURATION:'PDURATION(rate,pv,fv)',
 PERCENTILE:'PERCENTILE(array,k)',
 PMT:'PMT(rate,nper,pv,[fv],[type])',
 POWER:'POWER(number,power)',
 PPMT:'PPMT(rate,per,nper,pv,[fv],[type])',
 PRODUCT:'PRODUCT(number1,[number2],…)',
 PV:'PV(rate,nper,pmt,[fv],[type])',
 QUOTIENT:'QUOTIENT(numerator,denominator)',
 RAND:'RAND()',
 RANDBETWEEN:'RANDBETWEEN(bottom,top)',
 RANK:'RANK(number,ref,[order])',
 RATE:'RATE(nper,pmt,pv,[fv],[type],[guess])',
 ROUND:'ROUND(number,num_digits)',
 ROUNDDOWN:'ROUNDDOWN(number,num_digits)',
 ROUNDUP:'ROUNDUP(number,num_digits)',
 ROWS:'ROWS(array)',
 RRI:'RRI(nper,pv,fv)',
 SIGN:'SIGN(number)',
 SLN:'SLN(cost,salvage,life)',
 SMALL:'SMALL(array,k)',
 SQRT:'SQRT(number)',
 STDEV:'STDEV(number1,[number2],…)',
 SUBTOTAL:'SUBTOTAL(function_num,ref1,[ref2],…)',
 SUM:'SUM(number1,[number2],…)',
 SUMIF:'SUMIF(range,criteria,[sum_range])',
 SUMIFS:'SUMIFS(sum_range,criteria_range1,criteria1,…)',
 SYD:'SYD(cost,salvage,life,per)',
 TODAY:'TODAY()',
 TRIM:'TRIM(text)',
 TRUNC:'TRUNC(number,[num_digits])',
 UPPER:'UPPER(text)',
 VAR:'VAR(number1,[number2],…)',
 VLOOKUP:'VLOOKUP(lookup_value,table_array,col_index_num,[range_lookup])',
 WEEKDAY:'WEEKDAY(serial_number,[return_type])',
 XIRR:'XIRR(values,dates,[guess])',
 XLOOKUP:'XLOOKUP(lookup_value,lookup_array,return_array,[if_not_found],…)',
 XNPV:'XNPV(rate,values,dates)',
 XOR:'XOR(logical1,[logical2],…)',
 YEAR:'YEAR(serial_number)'
};

/* ---------- rendering ---------- */

function fnLibShow(name) {
  const s = $('#fnSyn'), h = $('#fnDesc');
  if (s) s.textContent = name ? fnLibSyntax(name) : '';
  if (h) h.textContent = name ? (FN_HELP[name] || '') : '';
}

function fnLibSelect(name) {
  fnLibSel = name;
  const ul = $('#fnList');
  if (ul) {
    Array.prototype.forEach.call(ul.children, function (li) {
      if (li.dataset && li.dataset.fn) li.className = (li.dataset.fn === name) ? 'on' : '';
    });
  }
  fnLibShow(name);
}

function fnLibRender() {
  const ul = $('#fnList');
  if (!ul) return;
  const qEl = $('#fnSearch'), catEl = $('#fnDlgCat');
  const q = ((qEl && qEl.value) || '').trim().toLowerCase();
  const cat = (catEl && catEl.value) || 'all';
  let names = fnLibUniverse(cat);
  if (q) {
    names = names.filter(n =>
      n.toLowerCase().indexOf(q) >= 0 ||
      String(FN_HELP[n] || '').toLowerCase().indexOf(q) >= 0);
  }
  ul.innerHTML = '';
  if (!names.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = T('fnEmpty');
    ul.appendChild(li);
    fnLibSel = null;
    fnLibShow(null);
    return;
  }
  if (names.indexOf(fnLibSel) < 0) fnLibSel = names[0];
  names.forEach(function (n) {
    const li = document.createElement('li');
    li.dataset.fn = n;
    /* Focusable so a clicked row keeps the keyboard inside the dialog instead
     * of dropping to <body>, where arrows/Enter would drive the grid behind it. */
    li.tabIndex = 0;
    if (n === fnLibSel) li.className = 'on';
    const a = document.createElement('span');
    a.className = 'fnName';
    a.textContent = n;
    const b = document.createElement('span');
    b.className = 'fnHelpTxt';
    b.textContent = FN_HELP[n] || '';
    li.appendChild(a);
    li.appendChild(b);
    li.onclick = function () { fnLibSelect(n); };
    li.ondblclick = function () { fnLibInsert(n); };
    ul.appendChild(li);
  });
  fnLibShow(fnLibSel);
}

/* Arrow-key walk over the rendered rows (the event stays inside the dialog,
 * so the grid behind it never moves). */
function fnLibMove(step) {
  const ul = $('#fnList');
  if (!ul || !ul.children.length) return;
  const items = Array.prototype.filter.call(ul.children, li => li.dataset && li.dataset.fn);
  if (!items.length) return;
  let i = -1;
  for (let k = 0; k < items.length; k++) if (items[k].dataset.fn === fnLibSel) { i = k; break; }
  i = Math.max(0, Math.min(items.length - 1, (i < 0 ? 0 : i + step)));
  fnLibSelect(items[i].dataset.fn);
  if (items[i].scrollIntoView) items[i].scrollIntoView({ block: 'nearest' });
}

/* ---------- open / close / insert ---------- */

function openInsertFunction(cat) {
  const d = $('#fnDlg');
  if (!d) return;
  const sel = $('#fnDlgCat');
  if (sel) {
    /* Rebuilt on every open so a language switch is picked up. fillFxCat()
     * clears the select itself, so it must run before the two dialog-only
     * options are prepended: All, Most recently used, then the same seven
     * categories the ribbon select uses. */
    sel.innerHTML = '';
    if (typeof fillFxCat === 'function') fillFxCat(sel);
    else [['math', 'catMath'], ['stat', 'catStat'], ['text', 'catText'],
          ['logic', 'catLogic'], ['lookup', 'catLookup'], ['date', 'catDate'],
          ['financial', 'catFin']].forEach(function (pair) {
      const o = document.createElement('option');
      o.value = pair[0];
      o.textContent = T(pair[1]);
      sel.appendChild(o);
    });
    [['recent', 'fnCatRecent'], ['all', 'fnCatAll']].forEach(function (pair) {
      const o = document.createElement('option');
      o.value = pair[0];
      o.textContent = T(pair[1]);
      sel.insertBefore(o, sel.firstChild);
    });
    sel.value = (cat && (cat === 'all' || cat === 'recent' || FN_CATS[cat])) ? cat : 'all';
    if (!sel.value) sel.value = 'all';
  }
  const q = $('#fnSearch');
  if (q) q.value = '';
  fnLibSel = null;
  fnLibRender();
  d.classList.add('open');
  if (q && q.focus) q.focus();
}

function closeInsertFunction() {
  const d = $('#fnDlg');
  if (d) d.classList.remove('open');
}

function fnLibInsert(name) {
  if (!name) return;
  closeInsertFunction();
  insertFn(name);
}

/* ---------- keyboard ---------- */

/* The dialog is a key island: script.js keeps a document-level handler that
 * moves the grid selection or starts a cell edit for arrows, Enter and plain
 * characters. Every keydown that reaches this dialog is stopped before it can
 * bubble to that handler; preventDefault only where the browser would also act
 * (caret moves in the search box, Enter outside a button). */
function onDlgKey(e) {
  e.stopPropagation();
  if (e.key === 'Escape') { e.preventDefault(); closeInsertFunction(); return; }
  if (e.key === 'Enter') {
    /* Enter on a real button falls through to that button's click handler. */
    if (e.target && e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    fnLibInsert(fnLibSel);
    return;
  }
  if (e.key === 'ArrowDown') { e.preventDefault(); fnLibMove(1); return; }
  if (e.key === 'ArrowUp') { e.preventDefault(); fnLibMove(-1); return; }
  /* Everything else (Tab, printable characters in a row) still stops at the
   * dialog: script.js's document handler would start a cell edit or move the
   * grid otherwise. Not prevented, so native focus movement keeps working. */
}

/* Belt and braces for Escape when focus has drifted outside the dialog (it is
 * not modal - the user can click the grid while it is open). */
function onDocKey(e) {
  if (e.key !== 'Escape') return;
  const d = $('#fnDlg');
  if (d && d.classList.contains('open')) closeInsertFunction();
}

/* ---------- wiring ---------- */

/* Bound through the shared $('#id') helper, so a control that is absent (a
 * trimmed build, or a partial page) is skipped instead of throwing. The script
 * tag loads after script.js, so these assignments replace the popMenu handlers
 * initRibbon() put on the fx / Insert / All entry points. */
function initInsertFunction() {
  const on = function (id, fn) {
    const el = $(id);
    if (el) el.onclick = fn;
  };

  on('#fbFx', function () { openInsertFunction('all'); });
  on('#bFnInsert', function () {
    const c = $('#fnCat');
    openInsertFunction(c && c.value ? c.value : 'all');
  });
  on('#bFnAll', function () { openInsertFunction('all'); });

  on('#fnDlgClose', closeInsertFunction);
  on('#fnDlgCancel', closeInsertFunction);
  on('#fnDlgOk', function () { fnLibInsert(fnLibSel); });

  const q = $('#fnSearch');
  if (q) q.oninput = fnLibRender;
  const cat = $('#fnDlgCat');
  if (cat) cat.onchange = fnLibRender;

  const d = $('#fnDlg');
  if (d) d.onkeydown = onDlgKey;
  document.addEventListener('keydown', onDocKey);
}

/* Self-boot: script.js never calls initInsertFunction, so wire once the DOM is
 * ready. Deferred scripts see readyState "interactive", which boots immediately
 * - after script.js's init() has already run. */
if (typeof document !== 'undefined') {
  const bootInsertFn = function () { try { initInsertFunction(); } catch (e) { /* never block boot */ } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootInsertFn);
  else bootInsertFn();
}