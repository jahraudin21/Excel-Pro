const fs=require('fs');
const p='c:/New folder/js/account-ui.js';
let c=fs.readFileSync(p,'utf8');
const idx=c.indexOf("on('#accSignOut',()=>{");
if(idx<0){console.log('ERROR: not found');process.exit(1);}
const before=c.substring(0,idx);
const after=c.substring(idx);
const handlers='\n  /* API key handlers */\n  const apiKeyInput=$("#accApiKeyInput");\n  let _akShown=false;\n  function _showAk(s){if(!apiKeyInput)return;const k=Account.getApiKey();if(k){apiKeyInput.value=s?k:"●".repeat(16);apiKeyInput.title=s?k:"";}else{apiKeyInput.value="";apiKeyInput.title="";}}\n  on("#accShowApiKey",()=>{_showAk(!_akShown);_akShown=!_akShown;});\n  on("#accRegenerateApiKey",()=>{if(!Account.currentUser()){setStatusMode(T("accRequired"));return;}Account.regenerateApiKey().then(k=>{if(k){_akShown=true;_showAk(true);setStatusMode(T("accCopySuccess"));}else setStatusMode(T("accError"));}).catch(()=>setStatusMode(T("accError")));});\n  Account.onChange(()=>{if(apiKeyInput){const k=Account.currentUser()?Account.getApiKey():null;apiKeyInput.value=k?"●".repeat(16):"●".repeat(16);apiKeyInput.title=k||"";}});\n  ';
const newc=before+handlers+after;
fs.writeFileSync(p,newc,'utf8');
console.log('SUCCESS');
console.log('Size:',fs.statSync(p).size);