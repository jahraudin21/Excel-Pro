import fs from 'fs';
const lines = fs.readFileSync('js/script.js', 'utf8').split('\n');
console.log('total lines: ' + lines.length);
for (let i = 2560; i < Math.min(lines.length, 2615); i++) console.log((i + 1) + ': ' + lines[i]);
