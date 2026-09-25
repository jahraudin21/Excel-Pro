const fs = require('fs');
const p = 'C:/New folder/js/account-ui.js';
let b = fs.readFileSync(p, 'utf8');

// Fix the duplicated/broken password change function
const brokenSection = `   if(res===true){$('#accOldPass').value='';$('#accNewPass').value='';
      setStatusMode(T('accPassChanged'));}
      setStatusMode(T('accPassChanged'));}
    else{setStatusMode(T(ACC_ERR[res]||'accError'));}});
    }
    on('#accPassSave',()=>doChangePassword());`;

const fixedSection = `   if(res===true){$('#accOldPass').value='';$('#accNewPass').value='';
      setStatusMode(T('accPassChanged'));}
    else{setStatusMode(T(ACC_ERR[res]||'accError'));}};
   }
   on('#accPassSave',()=>doChangePassword());`;

if (b.includes(brokenSection)) {
  b = b.replace(brokenSection, fixedSection);
  console.log('✓ Fixed duplicated password change section');
} else {
  console.log('✗ Broken section not found, showing current state:');
  const idx = b.indexOf('doChangePassword');
  if (idx !== -1) {
    console.log(JSON.stringify(b.substring(idx, idx + 400)));
  }
}

fs.writeFileSync(p, b);
console.log('✓ File saved');