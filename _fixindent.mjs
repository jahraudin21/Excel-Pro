import fs from 'fs';
let h = fs.readFileSync('c:/New folder/index.html', 'utf8');

// Fix the indentation of lines that should have 5 spaces but have 9
// Pattern: 9 spaces before <div class="rgrp"> should be 5 spaces
h = h.replace(/         <div class="rgrp"><div class="rrow">\n      <button class="rbtn big" id="bISymbol">/, '     <div class="rgrp"><div class="rrow">\n      <button class="rbtn big" id="bISymbol">');
h = h.replace(/         <div class="rgrp"><div class="rrow">\n      <button class="rbtn" id="bIComment">/, '     <div class="rgrp"><div class="rrow">\n      <button class="rbtn" id="bIComment">');

fs.writeFileSync('c:/New folder/index.html', h, 'utf8');
console.log('Fixed indentation');

// Show result
const lines = h.split('\n');
for(let i=304;i<316;i++){
  console.log('line '+(i+1)+': ['+lines[i].substring(0,5)+'] '+lines[i].trim().substring(0,50));
}
