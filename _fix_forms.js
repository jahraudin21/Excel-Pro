const fs = require('fs');
const p = 'C:/New folder/index.html';
let h = fs.readFileSync(p, 'utf8');

// Fix 1: Wrap accDlg content in a form
const oldDlg = `<div id="accDlg" role="dialog" aria-modal="false" aria-labelledby="accDlgTitle">
   <div class="frow"><span id="accDlgTitle" style="font-weight:600">Sign in</span><span style="flex:1"></span><button type="button" id="accClose" class="qbtn" title="Close">✕</button></div>
   <label class="accLbl" for="accEmailIn" data-i18n="accEmail">Email</label>
   <input type="email" id="accEmailIn" autocomplete="email" placeholder="you@example.com">
   <label class="accLbl" for="accNameIn" data-i18n="accName">Name</label>
   <input type="text" id="accNameIn" autocomplete="name">
   <label class="accLbl" for="accPassIn" data-i18n="accPassword">Password</label>
   <input type="password" id="accPassIn" autocomplete="current-password">
   <label class="accLbl accSignupOnly" for="accPass2In" data-i18n="accNewPass">New password</label>
   <input type="password" id="accPass2In" class="accSignupOnly" autocomplete="new-password">
   <div id="accErr" class="accErr" style="display:none"></div>
   <div class="frow"><span style="flex:1"></span>
    <button type="button" id="accSubmit" class="accPrimary" data-i18n="accSignIn">Sign in</button></div>
   <button type="button" id="accSwitchMode" class="accLink" data-i18n="accNoAccount">No account? Sign up</button>
  </div>`;

const count = h.split(oldDlg).length - 1;
console.log('accDlg match count:', count);

const newDlg = `<div id="accDlg" role="dialog" aria-modal="false" aria-labelledby="accDlgTitle">
   <form id="accAuthForm" autocomplete="off">
    <div class="frow"><span id="accDlgTitle" style="font-weight:600">Sign in</span><span style="flex:1"></span><button type="button" id="accClose" class="qbtn" title="Close">✕</button></div>
    <label class="accLbl" for="accEmailIn" data-i18n="accEmail">Email</label>
    <input type="email" id="accEmailIn" autocomplete="email" placeholder="you@example.com">
    <label class="accLbl" for="accNameIn" data-i18n="accName">Name</label>
    <input type="text" id="accNameIn" autocomplete="name">
    <label class="accLbl" for="accPassIn" data-i18n="accPassword">Password</label>
    <input type="password" id="accPassIn" autocomplete="current-password">
    <label class="accLbl accSignupOnly" for="accPass2In" data-i18n="accNewPass">New password</label>
    <input type="password" id="accPass2In" class="accSignupOnly" autocomplete="new-password">
    <div id="accErr" class="accErr" style="display:none"></div>
    <div class="frow"><span style="flex:1"></span>
     <button type="submit" id="accSubmit" class="accPrimary" data-i18n="accSignIn">Sign in</button></div>
    <button type="button" id="accSwitchMode" class="accLink" data-i18n="accNoAccount">No account? Sign up</button>
   </form>
  </div>`;

if (count > 0) {
  h = h.replace(oldDlg, newDlg);
  console.log('✓ accDlg wrapped in form');
} else {
  console.log('⚠ accDlg pattern not found - checking alternatives');
  // Show what's actually there
  const idx = h.indexOf('accDlg');
  if (idx !== -1) {
    console.log('Context around accDlg:', h.substring(idx, idx + 200));
  }
}

// Fix 2: Wrap password change fields in form
const oldPanel = `<div class="frow"><input type="password" id="accOldPass" data-i18n-ph="accCurrentPass" placeholder="Current password" autocomplete="current-password">
     <input type="password" id="accNewPass" data-i18n-ph="accNewPass" placeholder="New password" autocomplete="new-password">
     <button type="button" id="accPassSave" class="accPrimary" data-i18n="accChangePass">Change password</button></div>`;

const panelCount = h.split(oldPanel).length - 1;
console.log('\naccPanel pass fields match count:', panelCount);

const newPanel = `<form id="accPassForm" autocomplete="off" style="display:flex">
     <input type="password" id="accOldPass" data-i18n-ph="accCurrentPass" placeholder="Current password" autocomplete="current-password">
     <input type="password" id="accNewPass" data-i18n-ph="accNewPass" placeholder="New password" autocomplete="new-password">
     <button type="submit" id="accPassSave" class="accPrimary" data-i18n="accChangePass">Change password</button>
    </form>`;

if (panelCount > 0) {
  h = h.replace(oldPanel, newPanel);
  console.log('✓ Password change fields wrapped in form');
} else {
  console.log('⚠ Password panel pattern not found');
}

fs.writeFileSync(p, h);
console.log('\n✓ index.html updated');