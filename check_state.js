const fs = require('fs');
const path = 'c:/New folder';

// Check current state
const html = fs.readFileSync(path + '/index.html', 'utf8');
const js = fs.readFileSync(path + '/js/script.js', 'utf8');
const accountJs = fs.readFileSync(path + '/js/account.js', 'utf8');
const accountUiJs = fs.readFileSync(path + '/js/account-ui.js', 'utf8');

console.log('=== CURRENT STATE ===');
console.log('HTML size:', html.length, 'bytes');
console.log('Has bNew in HTML:', html.indexOf('id="bNew"') !== -1);
console.log('Has bImport in HTML:', html.indexOf('id="bImport"') !== -1);
console.log('Has bPrint (not bPrint2) in HTML:', html.indexOf('id="bPrint"') !== -1 && html.indexOf('id="bPrint2"') === -1);

// Find toolbar button lines
const hlines = html.split(require('os').EOL);
hlines.forEach((l, i) => {
  const clean = l.trim();
  if (clean.indexOf('id="bNew"') !== -1 || clean.indexOf('id="bImport"') !== -1 || (clean.indexOf('id="bPrint"') !== -1 && clean.indexOf('id="bPrint2"') === -1)) {
    console.log('HTML line ' + (i+1) + ': ' + clean.slice(0, 80));
  }
});

console.log('\nscript.js size:', js.length, 'bytes');
const jlines = js.split(require('os').EOL);
jlines.forEach((l, i) => {
  if (l.indexOf("$('#bNew')") !== -1 && l.indexOf('onclick') !== -1) {
    console.log('script.js line ' + (i+1) + ': ' + l.trim().slice(0, 100));
  }
  if (l.indexOf("$('#bImport')") !== -1 && l.indexOf('onclick') !== -1) {
    console.log('script.js line ' + (i+1) + ': ' + l.trim().slice(0, 100));
  }
  if (l.indexOf("$('#bPrint')") !== -1 && l.indexOf('onclick') !== -1 && l.indexOf('$("#bPrint2')') === -1) {
    console.log('script.js line ' + (i+1) + ': ' + l.trim().slice(0, 100));
  }
});

console.log('\naccount.js API key:', accountJs.indexOf('getApiKey') !== -1 ? 'YES' : 'NO');
console.log('account-ui.js API key UI:', accountUiJs.indexOf('accApiKey') !== -1 ? 'YES' : 'NO');