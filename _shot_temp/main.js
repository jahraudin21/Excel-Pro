'use strict';
/* Minimal Electron app for screenshot capture - debug stage 0: does the main
 * process even start? */
const { app, BrowserWindow } = require('electron');

console.log('MAIN_PROCESS_STARTED');

app.whenReady().then(() => {
  console.log('APP_WHEN_READY_DONE');
  const win = new BrowserWindow({ width: 1400, height: 900, show: true });
  win.loadURL('file://' + require('path').join(__dirname, 'index.html'));
});

  /* Take launch overlays off (same technique as _shot_home.mjs). */
  await win.webContents.executeJavaScript(`(() => {
    const s = document.createElement('style');
    s.textContent = '#startScreen,#authLock,#authDialog{display:none !important}';
    document.head.appendChild(s);
    const start = document.querySelector('#startScreen');
    if (start) start.remove();
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));

  const diag = await win.webContents.executeJavaScript(`(() => {
    try {
      StartScreen.applyTemplate('dashboard');
      const w = document.getElementById('gridwrap');
      if (w) { w.scrollLeft = 0; w.scrollTop = 0; }
      const canvases = document.querySelectorAll('#drawLayer canvas').length;
      const a1 = document.querySelector('td[data-ref="A1"]');
      const kpi = document.querySelector('td[data-ref="A5"]');
      const grid = document.getElementById('grid');
      return {
        applied: true, canvases: canvases,
        mergedA1: a1 ? a1.colSpan + 'x' + a1.rowSpan : null,
        kpi: kpi ? kpi.textContent : null,
        nogrid: grid ? grid.classList.contains('nogrid') : null,
        charts: [...document.querySelectorAll('#drawLayer .draw')].map(d => d.dataset.did),
      };
    } catch (e) { return { applied: false, error: String(e) }; }
  })()`);
  console.log('template: ' + JSON.stringify(diag));

  await win.webContents.capturePage().then(img =>
    fs.writeFileSync(path.join(__dirname, '_full.png'), img.toPNG()));
  console.log('wrote _full.png');

  const r1 = await gridRect(win);
  if (r1) {
    await win.webContents.capturePage(r1).then(img =>
      fs.writeFileSync(path.join(__dirname, '_top.png'), img.toPNG()));
    console.log('wrote _top.png (' + r1.width + 'x' + r1.height + ')');
  }

  await win.webContents.executeJavaScript(`(() => {
    const w = document.getElementById('gridwrap');
    w.scrollTop = 22 * 23; w.scrollLeft = 0;
    return w.scrollTop;
  })()`);
  await new Promise(r => setTimeout(r, 400));
  const r2 = await gridRect(win);
  if (r2) {
    await win.webContents.capturePage(r2).then(img =>
      fs.writeFileSync(path.join(__dirname, '_lower.png'), img.toPNG()));
    console.log('wrote _lower.png');
  }

  if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
  else console.log('no page errors');

  app.on('window-all-closed', () => app.quit());
});
