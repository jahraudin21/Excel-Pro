const fs = require('fs');
const b = fs.readFileSync('C:/New folder/js/account-ui.js', 'utf8');
const lines = b.split('\n');
for (let i = 222; i < 232; i++) {
  console.log((i+1) + '|' + lines[i]);
}