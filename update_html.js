const fs = require('fs');

// Read the HTML file
let html = fs.readFileSync('c:/New folder/index.html', 'utf8');

// Find the last accSection div (before accSignOut button) and insert API key section after it
const accSignOutIdx = html.indexOf('id="accSignOut"');
if (accSignOutIdx === -1) {
  console.log('ERROR: Could not find accSignOut button');
  process.exit(1);
}

// Find the closing </div> before accSignOut (end of cloudSection)
const cloudSectionStart = html.lastIndexOf('<div class="accSection">', accSignOutIdx);
if (cloudSectionStart === -1) {
  console.log('ERROR: Could not find cloud section start');
  process.exit(1);
}

// Find the end of cloud section (the </div> that closes it, before accSignOut section)
// The structure is: </div> (end cloud section) </div> (end accPanelBody) </div> (end accPanel)
// Looking back from accSignOut, we need to insert after the cloud section closes

// Find the </div> that closes the cloud section - it should be right before <div class="accSection"> for the sign out section
const beforeSignOut = html.slice(0, accSignOutIdx);
const divBeforeSignOut = beforeSignOut.lastIndexOf('</div>');
const insertPos = divBeforeSignOut;

// Insert the API key section before the sign out button's section
const apiKeySection = `
    <div class="accSection">
     <div class="accSectionTitle" data-i18n="accApiKey">API key</div>
     <div class="frow">
      <input type="text" id="accApiKeyInput" readonly style="flex:1;font-family:monospace;font-size:11px" placeholder="—">
      <button type="button" id="accShowApiKey" class="accPrimary" data-i18n="accShowApiKey">Show</button>
     </div>
     <div class="frow" style="margin-top:6px">
      <button type="button" id="accRegenerateApiKey" class="accPrimary" data-i18n="accRegenerateApiKey">Regenerate this month's key</button>
     </div>
     <div class="accApiNote" style="font-size:11px;color:#777;margin-top:4px" data-i18n="accApiKeyNote">
      Automatically changes every month. Use it to access cloud APIs.
     </div>
    </div>
`;

html = html.slice(0, insertPos) + apiKeySection + html.slice(insertPos);

// Also add the i18n keys for API key
const strIdx = html.indexOf('accError:');
if (strIdx === -1) {
  console.log('ERROR: Could not find accError i18n key');
  process.exit(1);
}
// Find the end of accError line
const accErrorEnd = html.indexOf('}', strIdx + 20);
if (accErrorEnd === -1) {
  console.log('ERROR: Could not find end of accError');
  process.exit(1);
}

const apiKeyI18n = `
 accApiKey:{np:'API कुञ्जी',hi:'API कुंजी',en:'API key'},
 accShowApiKey:{np:'देखाउनुहोस्',hi:'दिखाएँ',en:'Show'},
 accRegenerateApiKey:{np:'यस महिनाको कुञ्जी पुनर्जन्म गर्नुहोस्',hi:'इस महीने की रीसेट करें',en:'Regenerate this month'},
 accApiKeyNote:{np:'हरेक महिनामा स्वचालित रूपमा बदलिन्छ। क्लाउड API प्रयोग गर्न प्रयोग गरिन्छ।',hi:'हर महीने अपने आप बदल जाती है। क्लाउड API एक्सेस के लिए इस्तेमाल करें।',en:'Automatically changes every month. Use it to access cloud APIs.'}
`;

html = html.slice(0, accErrorEnd) + apiKeyI18n + html.slice(accErrorEnd);

// Add API key section before the closing </div> of accPanelBody
// Find the </div> before </div> that closes accPanelBody
const accPanelBodyClose = html.indexOf('</div>\r\n   </div>\r\n  </div>', accSignOutIdx);
if (accPanelBodyClose === -1) {
  console.log('ERROR: Could not find accPanelBody closing');
  process.exit(1);
}

// Insert API key list before the accPanelBody closing </div>
const apiKeyListHtml = `
     <div class="accSection">
     <div class="accSectionTitle" data-i18n="accApiKeyHistory">Key history (this account)</div>
     <div id="accApiKeyList"></div>
    </div>
`;

html = html.slice(0, accPanelBodyClose) + apiKeyListHtml + html.slice(accPanelBodyClose);

fs.writeFileSync('c:/New folder/index.html', html, 'utf8');
console.log('API key UI added to index.html');
console.log('HTML size:', html.length, 'bytes');
