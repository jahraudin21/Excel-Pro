'use strict';
/* One-off patch: add the Home / Recent / OneDrive pages to the File backstage
   and reorder the rail. Unicode escapes are used for the emoji so the patch is
   immune to console/file encoding mismatches. */
const fs = require('fs');
const file = 'index.html';
let s = fs.readFileSync(file, 'utf8');
const before = s;

// 1. Rebuild the whole rail (Excel order, and Home/Recent/OneDrive included).
const rail = [
  '    <button type="button" class="bsItem on" data-bs-page="home" data-i18n="bsHome">\u{1F3E0} Home</button>',
  '    <button type="button" class="bsItem" data-bs-page="new" data-i18n="bsNew">\u{1F195} New</button>',
  '    <button type="button" class="bsItem" data-bs-page="open" data-i18n="bsOpen">\u{1F4C2} Open</button>',
  '    <button type="button" class="bsItem" data-bs-page="recent" data-i18n="bsRecent">\u{1F552} Recent</button>',
  '    <button type="button" class="bsItem" data-bs-page="save" data-i18n="bsSave">\u{1F4BE} Save</button>',
  '    <button type="button" class="bsItem" data-bs-page="export" data-i18n="bsExport">\u2B07 Export</button>',
  '    <button type="button" class="bsItem" data-bs-page="print" data-i18n="bsPrintPage">\u{1F5A8} Print</button>',
  '    <button type="button" class="bsItem" data-bs-page="onedrive" data-i18n="bsOneDrive">\u2601\uFE0F OneDrive</button>',
  '    <button type="button" class="bsItem" data-bs-page="info" data-i18n="bsInfo">\u2139\uFE0F Info</button>',
  '    <button type="button" class="bsItem" data-bs-page="account" data-i18n="signIn">Sign in</button>',
  '   </aside>'
].join('\n');

const railRe = /  <aside class="bsRail">[\s\S]*?<\/aside>/;
if (!railRe.test(s)) { console.error('FAIL: rail not found'); process.exit(1); }
s = s.replace(railRe, '  <aside class="bsRail">\n   <div class="bsHead">\n' +
  '    <button type="button" class="bsBack" id="bsBack" title="Back">\u2190</button>\n' +
  '    <span class="bsBrand" data-i18n="rFile">File</span>\n' +
  '   </div>\n' + rail);

// 2. Insert the three new pages and demote the Info page from the default view.
const panes = [
  '    <div class="bsPage on" data-bspane="home">',
  '     <h1 data-i18n="bsStartNew">Start a new workbook</h1>',
  '     <div class="bsGrid">',
  '      <div class="bsCard" id="bsHomeBlank"><div class="bsIco">\u{1F4C4}</div><div class="bsT" data-i18n="bsBlank">Blank workbook</div><div class="bsD" data-i18n="bsBlankHint">Start fresh (Ctrl+N)</div></div>',
  '      <div class="bsCard" id="bsHomeOpen"><div class="bsIco">\u{1F4C2}</div><div class="bsT" data-i18n="bsOpen">Open</div><div class="bsD" data-i18n="bsOpenHint">Browse for a .csv file (Ctrl+O)</div></div>',
  '      <div class="bsCard" id="bsHomeOneDrive"><div class="bsIco">\u2601\uFE0F</div><div class="bsT" data-i18n="bsOneDrive">OneDrive</div><div class="bsD" data-i18n="bsOneDriveHint">Open from the cloud</div></div>',
  '     </div>',
  '     <h1 data-i18n="bsRecentTitle">Recent workbooks</h1>',
  '     <div class="bsList" id="bsHomeRecent"></div>',
  '    </div>',
  '    <div class="bsPage" data-bspane="recent">',
  '     <h1 data-i18n="bsRecentTitle">Recent workbooks</h1>',
  '     <div class="bsList" id="bsRecentList"></div>',
  '    </div>',
  '    <div class="bsPage" data-bspane="onedrive">',
  '     <h1 data-i18n="bsOneDrive">OneDrive</h1>',
  '     <div class="bsGrid">',
  '      <div class="bsCard" id="bsCloudSignIn"><div class="bsIco">\u{1F510}</div><div class="bsT" data-i18n="signIn">Sign in</div><div class="bsD" data-i18n="backstageHint">Sync spreadsheets to the cloud</div></div>',
  '      <div class="bsCard" id="bsCloudBooks"><div class="bsIco">\u{1F4DA}</div><div class="bsT" data-i18n="cloudSaves">Cloud saves</div><div class="bsD" data-i18n="bsCloudHint">Workbooks saved to your account</div></div>',
  '      <div class="bsCard" id="bsCloudDrive"><div class="bsIco">\u{1F4C1}</div><div class="bsT" data-i18n="bsDrive">Google Drive</div><div class="bsD" data-i18n="bsDriveHint">Connect a Google account</div></div>',
  '     </div>',
  '     <div class="bsInfoBox">',
  '      <div class="bsRow"><span data-i18n="myAccount">Account</span><b id="bsCloudUser">\u2014</b></div>',
  '      <div class="bsRow"><span data-i18n="bsStoragePref">Storage</span><b id="bsCloudPref">\u2014</b></div>',
  '      <div class="bsRow"><span data-i18n="cloudSaves">Cloud saves</span><b id="bsCloudCount">0</b></div>',
  '     </div>',
  '    </div>',
  '    <div class="bsPage" data-bspane="info">'
].join('\n');

const infoRe = /    <div class="bsPage on" data-bspane="info">/;
if (!infoRe.test(s)) { console.error('FAIL: info pane anchor not found'); process.exit(1); }
s = s.replace(infoRe, panes);

if (s === before) { console.error('FAIL: no change'); process.exit(1); }
fs.writeFileSync(file, s, 'utf8');
console.log('OK: index.html patched — rail rebuilt, home/recent/onedrive panes added');
