const fs = require('fs');
const p = 'C:/New folder/js/account-ui.js';
let b = fs.readFileSync(p, 'utf8');

// Fix the broken password change function (using \r\n for CRLF)
const broken = `    if(res===true){$('#accOldPass').value='';$('#accNewPass').value='';\r\n      setStatusMode(T('accPassChanged'));}\r\n      setStatusMode(T('accPassChanged'));}\r\n    else{setStatusMode(T(ACC_ERR[res]||'accError'));}};\r\n    }\r\n    on('#accPassSave',()=>doChangePassword());`;

const fixed = `    if(res===true){$('#accOldPass').value='';$('#accNewPass').value='';\r\n      setStatusMode(T('accPassChanged'));}\r\n    else{setStatusMode(T(ACC_ERR[res]||'accError'));}};\r\n   }\r\n   on('#accPassSave',()=>doChangePassword());`;

if (b.includes(broken)) {
  b = b.replace(broken, fixed);
  console.log('✓ Fixed broken password change function');
} else {
  console.log('✗ Pattern not found, trying to find manually');
  const idx = b.indexOf('doChangePassword');
  if (idx !== -1) {
    console.log(JSON.stringify(b.substring(idx, idx + 500)));
  }
}

fs.writeFileSync(p, b);
console.log('✓ File saved');