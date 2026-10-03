'use strict';
/* End-to-end smoke test: boots the real renderer in Electron (same app://
   protocol as main.js) and asserts the launch behaviour and the start screen
   tabs actually work at runtime, not just in the source. Exits non-zero on
   failure. Run with:  npx electron _smoke.js                                */
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, protocol } = require('electron');

const APP_ORIGIN = 'app://mini-excel';
const APP_ROOT = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon'
};
app.commandLine.appendSwitch('disk-cache-size', '0');
app.commandLine.appendSwitch('disable-gpu-program-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

app.whenReady().then(() => {
  protocol.handle('app', async (request) => {
    const { pathname } = new URL(request.url);
    const rel = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(APP_ROOT, rel);
    if (file !== APP_ROOT && !file.startsWith(APP_ROOT + path.sep)) return new Response('Forbidden', { status: 403 });
    try {
      /* fs.promises.readFile throws "The cb argument must be of type function"
         in this Electron/Node combination, so the harness served "Not found"
         for every asset. The sync API is fine here - the reads are tiny. */
      const body = fs.readFileSync(file);
      return new Response(body, { status: 200, headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
    } catch (e) { return new Response('Not found', { status: 404 }); }
  });

  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
  const errors = [];
  /* Newer Electron passes an event object, older passes positional args. */
  win.webContents.on('console-message', (...a) => {
    const p = (a[0] && typeof a[0] === 'object' && 'level' in a[0]) ? a[0] : null;
    const level = p ? p.level : a[1];
    const msg = String(p ? p.message : a[2]);
    /* Two messages are expected in this packaging and are documented in main.js:
       the service worker cannot register on the app:// scheme, and Electron's
       dev-only CSP notice. Neither is an application error. */
    if (/ServiceWorker|serviceWorker|Content Security Policy|Security Warning/i.test(msg)) return;
    if (level >= 2) errors.push(msg);
  });
  win.webContents.on('render-process-gone', (_e, d) => errors.push('render-process-gone: ' + d.reason));

  win.loadURL(APP_ORIGIN + '/index.html');
  win.webContents.once('did-finish-load', async () => {
    // Let the deferred boot handlers (start screen + auth dialog) run.
    await new Promise(r => setTimeout(r, 2500));

    const probe = await win.webContents.executeJavaScript(`(() => {
      const q = s => document.querySelector(s);
      const out = {};
      const ss = q('#startScreen');
      out.startOpen = !!(ss && ss.classList.contains('open'));
      out.bodyStartOpen = document.body.classList.contains('start-open');
      out.tabs = [...document.querySelectorAll('.ssNavItem')].map(b => b.dataset.ssTab);
      out.tplRendered = document.querySelectorAll('#ssTemplates .ssTpl').length;
      out.pillHasMail = !!q('#userChip #userMail');
      /* The pill is pushed right with the flex "order" property, so the contract
         to verify is that its resolved order is the highest of the visible
         title-bar children: that is what paints it last, i.e. flush right. */
      out.pillRightMost = (() => {
        const bar = q('.titlebar'), chip = q('#userChip');
        if (!bar || !chip) return false;
        const visible = [...bar.children].filter(e => getComputedStyle(e).display !== 'none');
        if (!visible.length) return false;
        const orderOf = e => parseInt(getComputedStyle(e).order, 10) || 0;
        const max = Math.max.apply(null, visible.map(orderOf));
        return orderOf(chip) === max;
      })();
      out.ribbonTabCount = document.querySelectorAll('.rtab').length;
      out.gridRows = document.querySelectorAll('#grid tr').length;
      return out;
    })()`);

    const click = async (tab) => {
      await win.webContents.executeJavaScript(
        `document.querySelector('.ssNavItem[data-ss-tab="${tab}"]').click()`);
      await new Promise(r => setTimeout(r, 150));
      return win.webContents.executeJavaScript(`(() => ({
        recent: !document.getElementById('ssPaneRecent').hidden,
        favorites: !document.getElementById('ssPaneFavorites').hidden,
        templates: !document.getElementById('ssPaneTemplates').hidden,
        active: [...document.querySelectorAll('.ssNavItem')].filter(b => b.classList.contains('on')).map(b => b.dataset.ssTab),
        railOn: [...document.querySelectorAll('.ssNavItem.on')].map(b => b.dataset.ssTab)
      }))()`);
    };

    console.log('=== electron smoke test (real renderer) ===');
    ok(errors.length === 0, 'renderer produced no console errors' + (errors.length ? ' -> ' + errors.slice(0, 3).join(' | ') : ''));
    ok(probe.startOpen, 'app launches with the start screen open');
    ok(probe.bodyStartOpen, 'body carries the start-open flag (stacking)');
    ok(JSON.stringify(probe.tabs) === JSON.stringify(['templates', 'recent', 'favorites']),
      'start screen rail is Templates / Recent / Favorites -> ' + JSON.stringify(probe.tabs));
    ok(probe.tplRendered >= 5, 'template tiles rendered -> ' + probe.tplRendered);
    ok(probe.pillHasMail, 'account pill has the email line');
    ok(probe.pillRightMost, 'account pill is the right-most control in the title bar');
    ok(probe.ribbonTabCount === 9, 'ribbon tab count is 9 -> ' + probe.ribbonTabCount);
    ok(probe.gridRows > 0, 'spreadsheet grid rendered -> ' + probe.gridRows + ' rows');

    const recent = await click('recent');
    ok(recent.recent && !recent.favorites && !recent.templates, 'Recent tab shows only the recent list');
    const fav = await click('favorites');
    ok(!fav.recent && fav.favorites && !fav.templates, 'Favorites tab shows only the favorites list');
    const tpl = await click('templates');
    ok(!tpl.recent && !tpl.favorites && tpl.templates, 'Templates tab shows only the templates');
    ok(JSON.stringify(tpl.active) === JSON.stringify(['templates']), 'templates tab is marked active');
    ok(JSON.stringify(tpl.railOn) === JSON.stringify(['templates']), 'left rail mirrors the active tab');

    /* ---- File backstage: rail contents and page switching ----
       The app boots auth-locked, and the guard deliberately swallows clicks on
       the app surface (including #backstage) until somebody registers. So the
       backstage is exercised the way a signed-in user reaches it: drop the lock
       first, then drive the rail with real clicks. */
    await win.webContents.executeJavaScript(
      `document.body.classList.remove('auth-locked');AuthGuard.locked=false;`);
    await win.webContents.executeJavaScript(`openBackstage()`);
    await new Promise(r => setTimeout(r, 200));
    const bs = await win.webContents.executeJavaScript(`(() => ({
      open: document.getElementById('backstage').classList.contains('open'),
      rail: [...document.querySelectorAll('.bsItem')].map(b => b.dataset.bsPage),
      pane: [...document.querySelectorAll('.bsPage.on')].map(p => p.dataset.bspane),
      recentHost: document.getElementById('bsRecentList').innerHTML.length > 0
    }))()`);
    ok(bs.open, 'File opens the backstage');
    ok(JSON.stringify(bs.rail) ===
      JSON.stringify(['home', 'new', 'open', 'info', 'save', 'print', 'export', 'recent', 'onedrive', 'account']),
      'File rail follows Excel order -> ' + JSON.stringify(bs.rail));
    ok(JSON.stringify(bs.pane) === JSON.stringify(['home']), 'File opens on the Home page -> ' + JSON.stringify(bs.pane));
    ok(bs.recentHost, 'Home page renders the recent list');

    for (const page of ['recent', 'onedrive', 'info', 'new', 'open', 'save', 'export', 'print']) {
      await win.webContents.executeJavaScript(
        `document.querySelector('.bsItem[data-bs-page="${page}"]').click()`);
      await new Promise(r => setTimeout(r, 90));
      const shown = await win.webContents.executeJavaScript(
        `[...document.querySelectorAll('.bsPage.on')].map(p => p.dataset.bspane)`);
      ok(JSON.stringify(shown) === JSON.stringify([page]),
        'rail item "' + page + '" shows its own page -> ' + JSON.stringify(shown));
    }

    await win.webContents.executeJavaScript(`closeBackstage()`);
    await new Promise(r => setTimeout(r, 120));
    ok(!(await win.webContents.executeJavaScript(
      `document.getElementById('backstage').classList.contains('open')`)), 'back arrow closes the backstage');

    /* ---- Google sign-in button on the login page ---- */
    const gs = await win.webContents.executeJavaScript(`(() => {
      const b = document.getElementById('gsignBtn');
      if (!b) return null;
      return {
        label: b.querySelector('.gsignLabel').textContent.trim(),
        colours: [...b.querySelectorAll('.gsignLogo path')].map(p => p.getAttribute('fill'))
      };
    })()`);
    ok(!!gs, 'Sign in with Google button is present on the login page');
    if (gs) {
      ok(gs.label === 'Sign in with Google', 'button reads "Sign in with Google" -> ' + gs.label);
      ok(JSON.stringify(gs.colours) === JSON.stringify(['#EA4335', '#4285F4', '#FBBC05', '#34A853']),
        'button carries the 4-colour Google logo -> ' + gs.colours.join(','));
    }

    /* ---- login card renders correctly (regression guard) ----
       The card once shipped three defects that only show up as *computed*
       styles, so a source-level check cannot catch them:
         1. #authSubmit sits in a .frow, and the generic `.frow button` rule
            outranked .btnPrimary -> white text on a white button, invisible.
         2. A stale duplicate #authDialog block below the "clean card" rules
            flattened the inputs back to 3px radius / 6px 8px padding.
         3. #authDialog stayed display:block, so the dialog's flex `gap` never
            reached the labels and inputs, and they rendered cramped.
       Assert on the values the browser actually resolves, not on the CSS text. */
    const card = await win.webContents.executeJavaScript(`(() => {
      const dlg = document.getElementById('authDialog');
      if (!dlg) return null;
      dlg.classList.add('open');
      const form = document.getElementById('authForm');
      const email = document.getElementById('emailField');
      const submit = document.getElementById('authSubmit');
      const label = dlg.querySelector('label[for=emailField]');
      const sc = submit ? getComputedStyle(submit) : null;
      const ic = email ? getComputedStyle(email) : null;
      return {
        formDisplay: form ? getComputedStyle(form).display : null,
        inputRadius: ic ? ic.borderTopLeftRadius : null,
        inputPadding: ic ? ic.padding : null,
        labelDisplay: label ? getComputedStyle(label).display : null,
        submitInvisible: sc ? sc.color === sc.backgroundColor : null,
        submitWidth: submit ? Math.round(submit.getBoundingClientRect().width) : null,
        inputWidth: email ? Math.round(email.getBoundingClientRect().width) : null,
        /* Labels must read as words, not raw i18n keys ("emailLabel"). */
        rawKeys: [...dlg.querySelectorAll('[data-i18n]')]
          .filter(n => n.textContent.trim() === n.dataset.i18n).map(n => n.dataset.i18n)
      };
    })()`);
    ok(!!card, 'the login card is present');
    if (card) {
      ok(card.formDisplay === 'flex', 'the form is a flex column, so the card gap reaches the fields -> ' + card.formDisplay);
      ok(card.inputRadius === '10px', 'fields keep the card\'s 10px radius (no stale override) -> ' + card.inputRadius);
      ok(card.inputPadding === '10px 12px', 'fields keep the card\'s padding (no stale override) -> ' + card.inputPadding);
      ok(card.labelDisplay === 'block', 'a label stacks above its input -> ' + card.labelDisplay);
      ok(card.submitInvisible === false, 'the Sign in button is not white-on-white');
      ok(card.submitWidth === card.inputWidth,
        'the Sign in button lines up with the fields above it -> ' + card.submitWidth + ' vs ' + card.inputWidth);
      ok(card.rawKeys.length === 0, 'no raw i18n keys are rendered in the card -> ' + card.rawKeys.join(','));
    }

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    app.exit(fail ? 1 : 0);
  });
});
