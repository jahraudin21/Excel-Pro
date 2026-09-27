'use strict';
/* Behavioural test for clearHeadersForNewAccount (js/account-ui.js).
   The workbook is stored under one global localStorage key, so a second account
   would otherwise inherit the first account's cells and column headers. This
   loads just that function into a VM sandbox with stubbed spreadsheet globals
   and exercises the real reset, the returning-user short circuit, and the
   account-switch case. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('  PASS ' + msg); }
  else { failed++; console.log('  FAIL ' + msg); }
}

/* Pull the single function out of the module so the test does not have to boot
   the whole account UI (which self-boots against a live DOM). */
function extractFn(source, name) {
  const start = source.indexOf('function ' + name);
  if (start < 0) throw new Error(name + ' not found');
  const open = source.indexOf('{', start);
  let depth = 0, end = -1;
  for (let k = open; k < source.length; k++) {
    if (source[k] === '{') depth++;
    else if (source[k] === '}') { depth--; if (!depth) { end = k + 1; break; } }
  }
  if (end < 0) throw new Error(name + ' is unbalanced');
  return source.slice(start, end);
}

function extractConst(source, name) {
  const m = source.match(new RegExp('const\\s+' + name + "\\s*=\\s*'([^']+)'"));
  if (!m) throw new Error(name + ' not found');
  return m[1];
}

function makeSandbox() {
  const store = Object.create(null);
  const calls = { save: 0, render: 0, tabs: 0, colW: 0, book: 0, status: 0, remember: 0 };
  const src = fs.readFileSync(path.join(__dirname, 'js', 'account-ui.js'), 'utf8');
  /* The function reads a module-scope constant, so it has to come along or the
     returning-user short circuit silently stops working in the sandbox. */
  const lastAccountKey = extractConst(src, 'LAST_ACCOUNT_KEY');
  const sandbox = {
    console,
    COLS: 26,
    LAST_ACCOUNT_KEY: lastAccountKey,
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    /* A workbook that looks like the demo sheet: header cells + custom widths. */
    wb: { cur: 0, colW: [200, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
      sheets: [{ name: 'Sheet1', cells: { A1: { raw: 'सामान' }, B1: { raw: 'राशि' } } }] },
    colW: [200, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    hist: [{ a: 1 }, { b: 2 }],
    fut: [{ c: 3 }],
    vals: { A1: 1 },
    cache: { A1: 2 },
    active: 'D9', selA: 'D9', selB: 'E9',
    saveLS: () => { calls.save++; },
    renderAll: () => { calls.render++; },
    renderTabs: () => { calls.tabs++; },
    applyColW: () => { calls.colW++; },
    setBookName: () => { calls.book++; },
    setStatusMode: () => { calls.status++; },
    StartScreen: { rememberCurrent: () => { calls.remember++; } },
    T: k => k,
    __calls: calls,
    __store: store
  };
  const ctx = vm.createContext(sandbox);
  const fn = extractFn(src, 'clearHeadersForNewAccount');
  vm.runInContext(fn + '\nglobalThis.__clear = clearHeadersForNewAccount;', ctx);
  ctx.__lastAccountKey = lastAccountKey;
  return ctx;
}

function main() {
  console.log('=== clearHeadersForNewAccount ===');
  const ctx = makeSandbox();
  const clear = ctx.__clear;
  const calls = ctx.__calls;
  ok(typeof clear === 'function', 'clearHeadersForNewAccount extracted and evaluated');

  console.log('\n[a new account starts from a clean sheet]');
  const ran = clear({ id: 'user-a' });
  const wb = ctx.wb;
  ok(ran === true, 'reports that it reset the sheet');
  ok(Object.keys(wb.sheets[0].cells).length === 0, 'header/body cells are cleared');
  ok(wb.sheets[0].name === 'Sheet1' && wb.sheets.length === 1, 'a single fresh Sheet1 remains');
  ok(Array.isArray(ctx.colW) && ctx.colW.length === 26 && ctx.colW.every(w => w === 88),
    'column header widths reset to the 88px default');
  ok(Array.isArray(wb.colW) && wb.colW[0] === 88, 'widths also stored on the workbook for persistence');
  ok(ctx.hist.length === 0 && ctx.fut.length === 0, 'undo and redo history cleared');
  ok(ctx.active === 'A1' && ctx.selA === 'A1' && ctx.selB === 'A1', 'selection returned to A1');
  ok(ctx.__store[ctx.__lastAccountKey] === 'user-a', 'remembers which account the sheet belongs to');
  ok(calls.save > 0 && calls.render > 0 && calls.colW > 0 && calls.book > 0,
    'the grid is saved and re-rendered');

  console.log('\n[a returning account keeps its own sheet]');
  // Put some content back in, as if the user had worked on it.
  ctx.wb.sheets[0].cells = { A1: { raw: 'mine' } };
  ctx.colW[0] = 175;
  const again = clear({ id: 'user-a' });
  ok(again === false, 'same account is a no-op');
  ok(ctx.wb.sheets[0].cells.A1 && ctx.wb.sheets[0].cells.A1.raw === 'mine',
    "the returning user's own cells survive");
  ok(ctx.colW[0] === 175, "the returning user's own column widths survive");

  console.log('\n[switching accounts does not leak the previous sheet]');
  const switched = clear({ id: 'user-b' });
  ok(switched === true, 'a different account triggers a reset');
  ok(Object.keys(ctx.wb.sheets[0].cells).length === 0, 'previous account cells are not inherited');
  ok(ctx.colW.every(w => w === 88), 'previous account column widths are not inherited');

  console.log('\n[no session is left alone]');
  const before = JSON.stringify(ctx.wb);
  const signedOut = clear(null);
  ok(signedOut === false, 'no user means no reset');
  ok(JSON.stringify(ctx.wb) === before, 'the sheet is untouched while signed out');

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
}
main();
