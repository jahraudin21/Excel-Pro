import fs from 'fs';
const cur = fs.readFileSync('js/script.js', 'utf8');
for (const n of ['wirePageLayout', 'applyPageSetup', 'applySheetOpts', 'applyBreaks', 'marginsMenu', 'orientMenu', 'sizeMenu', 'printAreaMenu', 'breaksMenu', 'bgMenu', 'titlesMenu', 'pickBgFile', 'openPageSetup', 'setPageSetup', 'pageSetup', 'syncScaleSelect', 'themeFontMenu', 'fxMenu', 'setFx', 'applyThemeFont', 'themeMenu', 'accentMenu', 'setStatusMode', 'applyNumDec', 'fnItemList', 'insertFn', 'explainActive', 'nameMgrMenu', 'initRibbon'])
  console.log((cur.includes('function ' + n + '(') ? 'OK   ' : 'MISS ') + n);
console.log('--- last 900 chars ---');
console.log(cur.slice(-900));
