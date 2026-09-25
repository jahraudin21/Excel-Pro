const fs = require('fs');
const p = 'C:/New folder/index.html';
let h = fs.readFileSync(p, 'utf8');

// We need to handle \r\n line endings. Let's work with exact patterns.

// Fix 1: Wrap accDlg in form - we need to add <form> after the div and </form> before the closing div
// Pattern: After "aria-labelledby=\"accDlgTitle\">\n  <div class=\"frow\">" insert "<form id=\"accAuthForm\" autocomplete=\"off\">\n"
// Pattern: Before "</div>\n <div id=\"accPanel\"" insert "</form>\n"

const oldDlgStart = 'aria-labelledby="accDlgTitle">\r\n  <div class="frow"><span id="accDlgTitle"';
const newDlgStart = 'aria-labelledby="accDlgTitle">\r\n  <form id="accAuthForm" autocomplete="off">\r\n   <div class="frow"><span id="accDlgTitle"';

if (h.includes(oldDlgStart)) {
  h = h.replace(oldDlgStart, newDlgStart);
  console.log('✓ Added form opening to accDlg');
} else {
  // Try with \n
  const oldDlgStartN = 'aria-labelledby="accDlgTitle">\n  <div class="frow"><span id="accDlgTitle"';
  const newDlgStartN = 'aria-labelledby="accDlgTitle">\n  <form id="accAuthForm" autocomplete="off">\n   <div class="frow"><span id="accDlgTitle"';
  if (h.includes(oldDlgStartN)) {
    h = h.replace(oldDlgStartN, newDlgStartN);
    console.log('✓ Added form opening to accDlg (\\n)');
  } else {
    console.log('✗ Could not find accDlg start pattern');
  }
}

// Fix the submit button - change type="button" to type="submit"
const oldSubmit = '<button type="button" id="accSubmit"';
const newSubmit = '<button type="submit" id="accSubmit"';
if (h.includes(oldSubmit)) {
  h = h.replace(oldSubmit, newSubmit);
  console.log('✓ Changed accSubmit to type="submit"');
} else {
  console.log('✗ Could not find accSubmit button');
}

// Fix 2: Close the form before the closing of accDlg div
const oldDlgEnd = '<button type="button" id="accSwitchMode" class="accLink" data-i18n="accNoAccount">No account? Sign up</button>\r\n </div>\r\n <div id="accPanel"';
const newDlgEnd = '<button type="button" id="accSwitchMode" class="accLink" data-i18n="accNoAccount">No account? Sign up</button>\r\n  </form>\r\n </div>\r\n <div id="accPanel"';

if (h.includes(oldDlgEnd)) {
  h = h.replace(oldDlgEnd, newDlgEnd);
  console.log('✓ Added form closing to accDlg');
} else {
  // Try with \n
  const oldDlgEndN = '<button type="button" id="accSwitchMode" class="accLink" data-i18n="accNoAccount">No account? Sign up</button>\n </div>\n <div id="accPanel"';
  const newDlgEndN = '<button type="button" id="accSwitchMode" class="accLink" data-i18n="accNoAccount">No account? Sign up</button>\n  </form>\n </div>\n <div id="accPanel"';
  if (h.includes(oldDlgEndN)) {
    h = h.replace(oldDlgEndN, newDlgEndN);
    console.log('✓ Added form closing to accDlg (\\n)');
  } else {
    console.log('✗ Could not find accDlg end pattern');
  }
}

// Fix 3: Wrap password change fields in form
const oldPass = '<div class="frow"><input type="password" id="accOldPass" data-i18n-ph="accCurrentPass" placeholder="Current password" autocomplete="current-password">\r\n     <input type="password" id="accNewPass" data-i18n-ph="accNewPass" placeholder="New password" autocomplete="new-password">\r\n     <button type="button" id="accPassSave" class="accPrimary" data-i18n="accChangePass">Change password</button></div>';

const newPass = '<form id="accPassForm" autocomplete="off">\r\n     <div class="frow"><input type="password" id="accOldPass" data-i18n-ph="accCurrentPass" placeholder="Current password" autocomplete="current-password">\r\n      <input type="password" id="accNewPass" data-i18n-ph="accNewPass" placeholder="New password" autocomplete="new-password">\r\n      <button type="submit" id="accPassSave" class="accPrimary" data-i18n="accChangePass">Change password</button></div>\r\n    </form>';

if (h.includes(oldPass)) {
  h = h.replace(oldPass, newPass);
  console.log('✓ Wrapped password change fields in form');
} else {
  console.log('✗ Could not find password change pattern');
  // Debug: show context
  const idx = h.indexOf('accOldPass');
  if (idx !== -1) {
    console.log('Context:', JSON.stringify(h.substring(idx - 20, idx + 200)));
  }
}

fs.writeFileSync(p, h);
console.log('\n✓ index.html updated');