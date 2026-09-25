const fs = require('fs');
const h = fs.readFileSync('C:/New folder/index.html', 'utf8');

// Find accDlg section
let start = h.indexOf('<div id="accDlg');
let end = h.indexOf('<div id="accPanel');
console.log('=== ACC DLG SECTION ===');
console.log(JSON.stringify(h.substring(start, end)));

// Find password change section
let passStart = h.indexOf('<div class="frow"><input type="password" id="accOldPass"');
let passEnd = h.indexOf('<div class="bsGrid"', passStart);
console.log('\n=== PASSWORD CHANGE SECTION ===');
console.log(JSON.stringify(h.substring(passStart, passEnd)));