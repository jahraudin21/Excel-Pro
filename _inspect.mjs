import fs from 'fs';
import path from 'path';

const appdata = process.env.APPDATA || '';
const hist = path.join(appdata, 'Code', 'User', 'History');
const cands = [];
function walk(dir, depth) {
  if (depth > 3) return;
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) walk(p, depth + 1);
    else {
      let txt = '';
      try { txt = fs.readFileSync(p, 'utf8'); } catch (e) { continue; }
      if (txt.includes('mini-excel-wb-v2') && txt.includes('function applyNumDec')) {
        cands.push({ p, size: txt.length, mtime: fs.statSync(p).mtimeMs, init: txt.includes('function init('), wire: txt.includes('wirePageLayout') });
      }
    }
  }
}
walk(hist, 0);
cands.sort((a, b) => b.mtime - a.mtime);
console.log('history candidates: ' + cands.length);
cands.slice(0, 8).forEach(c => console.log(new Date(c.mtime).toISOString(), c.size, 'init=' + c.init, 'wire=' + c.wire, c.p));

const cur = fs.readFileSync('js/script.js', 'utf8');
const i = cur.indexOf('wirePageLayout();');
console.log('--- seam in current script.js (chars ' + i + ' of ' + cur.length + ') ---');
console.log(cur.slice(Math.max(0, i - 700), i + 700));
