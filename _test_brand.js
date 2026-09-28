/* Loads the real UI and reports what the brand mark actually renders. */
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
  const bail = setTimeout(() => { console.log('TIMEOUT'); app.exit(2); }, 90000);
  process.on('unhandledRejection', e => { console.log('REJECTION: ' + (e && e.message || e)); app.exit(1); });
  win.loadURL(APP_ORIGIN + '/index.html?cb=' + Date.now());
  win.webContents.once('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 2500));
    const d = await win.webContents.executeJavaScript('(' + fs.readFileSync(path.join(APP_ROOT, '_brand_body.js'), 'utf8') + ')()');
    console.log('=== brand mark render check ===');
    console.log('  mark instances : ' + d.count);
    d.marks.forEach(m => console.log('    ' + JSON.stringify(m)));
    console.log('  all render     : ' + d.allRender + '   (renderedWidth > 0)');
    console.log('  "MX" gone      : ' + d.noMxText);
    console.log('  title text     : ' + JSON.stringify(d.titleText));
    console.log('  emoji left     : ' + (d.emojiLeft.length ? JSON.stringify(d.emojiLeft) : 'none'));
    clearTimeout(bail);
    app.exit(d.allRender && d.noMxText && d.count === 2 ? 0 : 1);
  });
});
