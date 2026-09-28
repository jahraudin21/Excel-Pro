/* Stands alone: run with `npm run test:popups`.
   Opens every popup in the real UI with a console / uncaught-error trap
   installed, closes it, and reports anything logged. Exits non-zero on any
   failure so it can be used as a gate. */
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, protocol } = require('electron');
const APP_ORIGIN = 'app://mini-excel';
const APP_ROOT = __dirname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
app.commandLine.appendSwitch('disk-cache-size', '0');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

app.whenReady().then(async () => {
  protocol.handle('app', async (request) => {
    const { pathname } = new URL(request.url);
    const rel = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(APP_ROOT, rel);
    if (file !== APP_ROOT && !file.startsWith(APP_ROOT + path.sep)) return new Response('Forbidden', { status: 403 });
    try {
      return new Response(fs.readFileSync(file), { status: 200,
        headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
    } catch (e) { return new Response('Not found', { status: 404 }); }
  });
  const win = new BrowserWindow({ show: false, width: 1440, height: 900, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
  await win.webContents.session.clearCache();

  /* Renderer-level noise, minus the two expected environment messages. */
  const renderer = [];
  win.webContents.on('console-message', (e, level, message, line, source) => {
    if (level >= 2 && !/Electron Security Warning|Service Worker registration failed/.test(message)) {
      renderer.push({ level, message: message.slice(0, 160), at: (source || '') + ':' + line });
    }
  });
  win.webContents.on('render-process-gone', (e, d) => renderer.push({ level: 9, message: 'render-process-gone ' + JSON.stringify(d) }));

  const bail = setTimeout(() => { console.log('TIMEOUT'); app.exit(2); }, 120000);
  process.on('unhandledRejection', e => { console.log('MAIN REJECTION: ' + (e && e.message || e)); app.exit(1); });
  win.loadURL(APP_ORIGIN + '/index.html?cb=' + Date.now());
  win.webContents.once('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 2500));
    let d;
    try {
      d = await win.webContents.executeJavaScript('(' + fs.readFileSync(path.join(APP_ROOT, '_popup_probe_body.js'), 'utf8') + ')()');
    } catch (e) {
      console.log('SCRIPT FAILED: ' + (e && e.message || e));
      renderer.forEach(r => console.log('  renderer: ' + JSON.stringify(r)));
      clearTimeout(bail); app.exit(1); return;
    }
    console.log('=== closing every popup: console + uncaught error trap ===\n');
    let problems = 0;
    for (const s of d.steps) {
      if (s.thrown) { problems++; console.log('  THREW  ' + s.label + '\n           -> ' + s.thrown); }
      else if (s.console.length) {
        problems += s.console.length;
        console.log('  NOISE  ' + s.label);
        s.console.forEach(c => console.log('           ' + c.kind + ': ' + c.msg));
      } else console.log('  clean  ' + s.label);
    }
    console.log('\nsteps: ' + d.steps.length + '   problems: ' + problems);
    console.log('leftover uncaught: ' + d.leftover.length);
    d.leftover.forEach(c => console.log('  ' + c.kind + ': ' + c.msg));
    console.log('renderer-level faults: ' + renderer.length);
    renderer.forEach(r => console.log('  ' + JSON.stringify(r)));
    clearTimeout(bail);
    app.exit(problems + d.leftover.length + renderer.length ? 1 : 0);
  });
});