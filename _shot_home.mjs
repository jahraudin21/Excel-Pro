/* Renders the Home ribbon at the reference width and reports each group's box,
   so the seven groups can be checked against the photo without eyeballing it.
 * Usage:  npx electron _shot_home.mjs  [outPng]
 *
 * The repo sits under a OneDrive path with non-ASCII characters in it, which
 * Electron's file:// loader refuses (ERR_FAILED). The markup is therefore staged
 * into an ASCII temp folder first and loaded from there; the stylesheet and
 * script folders are copied by name so index.html's relative refs still resolve.
 */
import { app, BrowserWindow } from 'electron';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';

const out = path.resolve(process.argv[2] || '_home.png');
const stage = path.join(os.tmpdir(), 'excelpro_shot');
fs.mkdirSync(stage, { recursive: true });
fs.cpSync('index.html', path.join(stage, 'index.html'));
fs.cpSync('css', path.join(stage, 'css'), { recursive: true });
fs.cpSync('js', path.join(stage, 'js'), { recursive: true });
const pageUrl = pathToFileURL(path.join(stage, 'index.html')).href;
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1240, height: 620, show: false,
    webPreferences: { contextIsolation: false, nodeIntegration: true },
  });
  await win.loadURL(pageUrl);
  await new Promise(r => setTimeout(r, 500));
  /* The unauthenticated lock overlay is drawn on top of the whole window, which
     would hide the ribbon in the capture. It is a launch-time state, not part of
     the ribbon's own appearance, so it is taken off just for the shot. */
  await win.webContents.executeJavaScript(`(() => {
    /* The launch-time overlays (start screen, lock guard, sign-in modal) cover the
       whole window, so they are hidden for the capture only. A stylesheet rule is
       used rather than touching the nodes: the guard re-creates and re-syncs its
       overlay on a timer, so removing the element would only last until the next
       tick. display:none is not something the guard can undo. */
    const s = document.createElement('style');
    s.textContent = '#startScreen,#authLock,#authDialog{display:none !important}';
    document.head.appendChild(s);
    const start = document.querySelector('#startScreen');
    if (start) start.remove();
    if (typeof AuthGuard !== 'undefined') AuthGuard.locked = false;
    document.body.classList.remove('auth-locked','start-open');
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 500));

  const report = await win.webContents.executeJavaScript(`(() => {
    const page = document.querySelector('.rpage[data-page="home"]');
    const groups = [...page.querySelectorAll(':scope > .rgrp')];
    const pb = page.getBoundingClientRect();
    return {
      pageWidth: Math.round(pb.width),
      pageScroll: Math.round(page.scrollWidth),
      total: groups.reduce((n, g) => n + g.getBoundingClientRect().width, 0),
      groups: groups.map(g => {
        const b = g.getBoundingClientRect();
        const cap = g.querySelector('.rlabel');
        return {
          name: cap ? cap.textContent.trim() : '(no caption)',
          w: Math.round(b.width),
          rows: [...g.querySelectorAll(':scope > .rrow')].map(r => {
            const kids = [...r.children].map(c => {
              const cb = c.getBoundingClientRect();
              return c.id || c.className;
            });
            return Math.round(r.getBoundingClientRect().width) + 'px [' + kids.join(', ') + ']';
          }),
        };
      }),
    };
  })()`);

  console.log('home page width : ' + report.pageWidth + 'px (scrollWidth ' + report.pageScroll + ')');
  console.log('groups summed   : ' + Math.round(report.total) + 'px');
  console.log('fits without scrolling: ' + (report.pageScroll <= report.pageWidth ? 'YES' : 'NO'));
  report.groups.forEach(g => {
    console.log('\n  ' + g.name + '  (' + g.w + 'px)');
    g.rows.forEach(r => console.log('     ' + r));
  });

  await win.webContents.capturePage().then(img => fs.writeFileSync(out, img.toPNG()));
  console.log('\nwrote ' + out);

  /* A second capture of the ribbon strip alone. The launch-time overlays cover
     the window on a cold start, so cropping to the ribbon's own box is the
     reliable way to see it - and the ribbon is what this change is about. */
  const strip = await win.webContents.executeJavaScript(`(() => {
    const r = document.querySelector('.rpage[data-page="home"]').getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y),
             width: Math.round(r.width), height: Math.round(r.height) };
  })()`);
  const stripOut = out.replace(/\.png$/, '_ribbon.png');
  await win.webContents.capturePage({ x: strip.x, y: strip.y,
    width: strip.width, height: strip.height })
    .then(img => fs.writeFileSync(stripOut, img.toPNG()));
  console.log('wrote ' + stripOut + '  (ribbon strip, ' + strip.width + 'x' + strip.height + ')');
  app.quit();
});