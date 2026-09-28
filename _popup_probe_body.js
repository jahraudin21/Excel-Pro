/* Closes every popup with a console / uncaught-error trap installed, and reports
   what was logged at each step. Help, Keyboard Shortcuts and Account are the ones
   asked about; the rest are included so a regression elsewhere cannot hide.

   This is a bare arrow function, NOT an IIFE: _test_popups.js evaluates it as
   `(<this file>)()`, and an already-invoked body would leave a plain object that
   cannot be called again. */
(() => {
  const $ = s => document.querySelector(s);
  const out = { steps: [] };

  window.__errs = [];
  const note = k => m => window.__errs.push({ kind: k, msg: String(m) });
  window.addEventListener('error', e => note('uncaught')(e.message || e));
  window.addEventListener('unhandledrejection', e => note('unhandledrejection')(e.reason));
  ['error', 'warn', 'assert'].forEach(name => {
    const orig = console[name];
    console[name] = function (...a) {
      window.__errs.push({ kind: 'console.' + name, msg: a.map(String).join(' ') });
      return orig.apply(console, a);
    };
  });
  const mark = () => { const e = window.__errs.slice(); window.__errs.length = 0; return e; };

  const step = (label, fn) => {
    mark();
    let thrown = null;
    try { fn(); } catch (e) { thrown = String(e && e.message || e); }
    out.steps.push({ label, thrown, console: mark() });
  };

  const fire = btn => {
    if (typeof btn.onclick === 'function') btn.onclick({ currentTarget: btn, preventDefault() {} });
    else btn.click();
  };
  /* The guard installs a capture-phase click listener that stops every click
     outside the auth surfaces while locked, so a synthetic click cannot reach
     those buttons. Unlock the way unlock() does, minus the queue replay. */
  const unlock = fn => {
    const had = typeof AuthGuard !== 'undefined' && AuthGuard.locked;
    if (had) { AuthGuard.locked = false; document.body.classList.remove('auth-locked'); }
    try { return fn(); } finally { if (had) { AuthGuard.locked = true; document.body.classList.add('auth-locked'); } }
  };

  /* [container, close control, needs the guard unlocked, how to open] */
  const CASES = [
    ['#helpDlg', '#helpClose', false, () => openHelp()],
    ['#authDialog', '#authClose', true, null],
    ['#startScreen', '#ssClose', true, null],
    ['#profilePanel', '#profileClose', false, null],
    ['#aiPanel', '#aiClose', false, null],
    ['#findDlg', '#fClose', false, null],
    ['#chartDlg', '#chartClose', false, null],
    ['#pivotDlg', '#pivotClose', false, null],
    ['#recDlg', '#recClose', false, null],
    ['#picDlg', '#picClose', false, null],
    ['#psDlg', '#psClose', false, () => openPageSetup()],
    ['#backstage', '#bsBack', false, () => openBackstage()]
  ];

  for (const [boxSel, btnSel, needUnlock, open] of CASES) {
    step((needUnlock ? 'unlocked: ' : '') + boxSel + ' via ' + btnSel, () => {
      const box = $(boxSel), btn = $(btnSel);
      if (!box) throw new Error(boxSel + ' missing');
      if (!btn) throw new Error(btnSel + ' missing');
      if (open) open();
      box.classList.add('open');
      const run = () => fire(btn);
      if (needUnlock) unlock(run); else run();
      if (box.classList.contains('open')) throw new Error('did not close');
    });
  }

  /* Escape is the other way a user leaves a dialog; it must not throw. */
  step('Escape while each dialog is open', () => {
    for (const [boxSel, , , open] of CASES) {
      const box = $(boxSel); if (!box) continue;
      if (open) { try { open(); } catch (e) { } }
      box.classList.add('open');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }
  });

  /* A close control used on an already-closed dialog must be harmless. */
  step('close controls used on an already-closed dialog', () => {
    for (const [, btnSel] of CASES) {
      const btn = $(btnSel); if (!btn) continue;
      const host = btn.closest('[id]');
      if (host) $('#' + host.id).classList.remove('open');
      fire(btn);
    }
  });

  out.leftover = window.__errs;
  return out;
})
