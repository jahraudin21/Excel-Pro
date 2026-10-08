'use strict';
/* ================= constants & helpers ================= */
const ROWS=200,COLS=26,LSKEY='mini-excel-wb-v2';
const $=s=>document.querySelector(s);
const grid=$('#grid'),fbar=$('#fbar'),refbox=$('#refbox'),clip=$('#clip');
const colName=i=>String.fromCharCode(65+i);
const colIndex=ch=>ch.charCodeAt(0)-65;
const refOf=(r,c)=>colName(c)+(r+1);
const refToRC=t=>({r:parseInt(t.slice(1),10)-1,c:colIndex(t[0])});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let colW=new Array(COLS).fill(88);
const PAL=['#217346','#e67e22','#2980b9','#8e44ad','#c0392b','#16a085','#f39c12','#7f8c8d','#2c3e50','#d35400'];
let chartType='bar';
let wb,vals={},cache={},visiting=new Set(),active='A1',selA='A1',selB='A1',dragging=false,editing=false,hist=[],fut=[];
const sheet=()=>wb.sheets[wb.cur];
const cell=ref=>sheet().cells[ref];
const rawOf=ref=>{const c=cell(ref);return c&&c.raw!=null?c.raw:'';};
const styleOf=ref=>{const c=cell(ref);return c&&c.s?c.s:{};};
function saveLS(){try{wb.colW=colW;localStorage.setItem(LSKEY,JSON.stringify(wb));}catch(e){}
 try{if(typeof scheduleDriveAutosave==='function')scheduleDriveAutosave();}catch(e){}}
function snapshot(){hist.push(JSON.stringify(sheet().cells));if(hist.length>100)hist.shift();fut=[];}

/* ================= i18n: हिन्दी / नेपाली / English ================= */
let LANG='en';
const LSKLANG='mini-excel-lang';
const STR={
 title:{np:'मिनी Excel — Spreadsheet',hi:'मिनी Excel — Spreadsheet',en:'Mini Excel — Spreadsheet'},
 new:{np:'नयाँ फाइल',hi:'नई फ़ाइल',en:'New File'},
 imp:{np:'CSV इम्पोर्ट',hi:'CSV इम्पोर्ट',en:'CSV Import'},
 exp:{np:'CSV एक्सपोर्ट',hi:'CSV एक्सपोर्ट',en:'CSV Export'},
 autosave:{np:'स्वतः browser मा save हुन्छ',hi:'अपने आप browser में save होता है',en:'Auto-saves in your browser'},
 fxph:{np:'यहाँ value वा =formula लेख्नुहोस् (जस्तै =SUM(B2:B6))',hi:'यहाँ value या =formula लिखें (जैसे =SUM(B2:B6))',en:'Type a value or =formula (e.g. =SUM(B2:B6))'},
 nf_gen:{np:'साधारण',hi:'सामान्य',en:'General'},
 nf_npr:{np:'रु (NPR)',hi:'रु (NPR)',en:'रु (NPR)'},
 nf_inr:{np:'₹ (INR)',hi:'₹ (INR)',en:'₹ (INR)'},
 nf_usd:{np:'$ (USD)',hi:'$ (USD)',en:'$ (USD)'},
 nf_pct:{np:'% प्रतिशत',hi:'% प्रतिशत',en:'% Percent'},
 nf_comma:{np:'1,234 (comma)',hi:'1,234 (comma)',en:'1,234 (comma)'},
 nf_dec2:{np:'123.45 (2 decimal)',hi:'123.45 (2 decimal)',en:'123.45 (2 decimal)'},
 sum:{np:'जोड़',hi:'जोड़',en:'Sum'},
 avg:{np:'औसत',hi:'औसत',en:'Avg'},
 cnt:{np:'संख्या',hi:'गिनती',en:'Count'},
 newConfirm:{np:'नयाँ फाइल सुरु गर्ने? पुरानो डेटा हराउँछ।',hi:'नई फ़ाइल शुरू करें? मौजूदा डेटा हट जाएगा।',en:'Start a new file? Current data will be cleared.'},
 sheetName:{np:'Sheet को नाम:',hi:'Sheet का नाम:',en:'Sheet name:'},
 delSheet:{np:'यो sheet मेट्ने?',hi:'यह sheet हटाएँ?',en:'Delete this sheet?'},
 addSheet:{np:'नयाँ Sheet',hi:'नई Sheet',en:'New Sheet'},
 aiTitle:{np:'AI सहायक',hi:'AI सहायक',en:'AI Assistant'},
 aiPh:{np:'कमाण्ड लेख्नुहोस्… (जस्तै: B8 मा =SUM(B2:B6) राख्नुहोस्)',hi:'कमांड लिखें… (जैसे: B8 में =SUM(B2:B6) डालो)',en:'Type a command… (e.g. put =SUM(B2:B6) in B8)'},
 aiWelcome:{np:'नमस्ते! म AI सहायक हुँ। लेख्नुहोस् जस्तै: "B8 मा =SUM(B2:B6) राख्नुहोस्", "B2:B6 लाई गुणा 2 गर्नुहोस्", "A2:B6 लाई bold गर्नुहोस्", "A वर्पी sort गर्नुहोस्", "clear B2:B6"',hi:'नमस्ते! मैं AI सहायक हूँ। लिखें जैसे: "B8 में =SUM(B2:B6) डालो", "B2:B6 को 2 से multiply करो", "A2:B6 को bold करो", "A column से sort करो", "clear B2:B6"',en:'Hi! I am your AI assistant. Try: "put =SUM(B2:B6) in B8", "multiply B2:B6 by 2", "bold A2:B6", "sort by column A", "clear B2:B6"'},
 aiDone:{np:'हो गयो!',hi:'हो गया!',en:'Done!'},
 aiNoCmd:{np:'मैले यो कमाण्ड बुझिनँ। कृपया अर्को तरिकाले लेख्नुहोस्।',hi:'मैं यह कमांड समझ नहीं पाया। कृपया किसी और तरह लिखें।',en:'I did not understand that command. Please try rephrasing it.'},
 aiMic:{np:'\u092c\u094b\u0932\u0915\u0930 \u0915\u092e\u093e\u0902\u0921 \u0926\u0947\u0902',hi:'\u092c\u094b\u0932\u0915\u0930 \u0915\u092e\u093e\u0902\u0921 \u0926\u0947\u0902',en:'Speak a command'},
 voiceUnavailable:{np:'\u092f\u0938 \u092c\u094d\u0930\u093e\u0909\u091c\u093c\u0930\u092e\u093e \u0935\u094b\u0907\u0938 \u0915\u092e\u093e\u0928\u094d\u0921 \u0938\u092e\u0930\u094d\u0925\u0928 \u091b\u0948\u0928।',hi:'\u092c\u094d\u0930\u093e\u0909\u091c\u093c\u0930 \u092e\u0947\u0902 वॉइस कमांड समर्थित नहीं है।',en:'Voice commands are not supported in this browser.'},
 voiceError:{np:'\u094b\u0907\u0938 \u092a\u0939\u093f\u091a\u093e\u0928 \u0935\u093f\u092b\u0932 भयो',hi:'वॉइस पहचान विफल रही',en:'Voice recognition failed'},
 agentTask:{np:'\u090f\u091c\u0947\u0928\u094d\u091f \u0915\u093e\u092e \u091a\u0932\u093e \u0930\u0939\u093e \u0939\u0942\u0901',hi:'\u090f\u091c\u0947\u0902\u091f \u0915\u093e\u092e \u091a\u0932\u093e \u0930\u0939\u093e \u0939\u0942\u0901',en:'Agent executing task'},
 fileNew:{np:'\u0928\u0908 \u092b\u093c\u093e\u0907\u0932',hi:'\u0928\u0908 \u092b\u093c\u093e\u0907\u0932',en:'New File'},
 fileOpen:{np:'\u0916\u094b\u0932\u0947\u0902 (CSV)',hi:'\u0916\u094b\u0932\u0947\u0902 (CSV)',en:'Open (CSV)'},
 fileSaveAs:{np:'\u0915\u0930\u0947\u0902',hi:'\u0915\u0930\u0947\u0902',en:'Save As'},
 fileSaveBrowser:{np:'\u092c\u094d\u0930\u093e\u0909\u091c\u093c\u0930 \u092e\u0947\u0902 \u0938\u0947\u0935',hi:'\u092c\u094d\u0930\u093e\u0909\u091c\u093c\u0930 \u092e\u0947\u0902 \u0938\u0947\u0935',en:'Save (browser)'},
 fileSaved:{np:'\u0938\u0947\u0935 \u0939\u094b \u0917\u092f\u093e',hi:'\u0938\u0947\u0935 \u0939\u094b \u0917\u092f\u093e',en:'Saved'},
 aiErr:{np:'त्रुटि:',hi:'त्रुटि:',en:'Error:'},
 bChart:{np:'चार्ट',hi:'चार्ट',en:'Chart'},
 bFind:{np:'खोजें',hi:'खोजें',en:'Find'},
 bPrint:{np:'प्रिंट',hi:'प्रिंट',en:'Print'},
 bXlsx:{np:'Excel (.xlsx)',hi:'Excel (.xlsx)',en:'Excel (.xlsx)'},
 bAllCsv:{np:'सबै CSV',hi:'सभी CSV',en:'All CSV (zip)'},
 findPh:{np:'के खोज्नुहोस्…',hi:'क्या खोजें…',en:'Find what…'},
 replPh:{np:'कसरी बदल्ने…',hi:'किसमें बदलें…',en:'Replace with…'},
 fNext:{np:'अर्को',hi:'अगला',en:'Next'},
 fRepl:{np:'बदल्नु',hi:'बदलें',en:'Replace'},
 fAll:{np:'सबै बदल्नु',hi:'सब बदलें',en:'Replace All'},
 foundAt:{np:'भेटियो:',hi:'मिला:',en:'Found at'},
 notFound:{np:'भेटिएन',hi:'नहीं मिला',en:'Not found'},
 replCount:{np:'{n} बदलियो',hi:'{n} बदले गए',en:'{n} replaced'},
 fType:{np:'पहिले केही लेख्नुहोस्',hi:'पहले कुछ लिखें',en:'Type something first'},
 ctxRowAbove:{np:'माथि पंक्ति थप्नु',hi:'ऊपर पंक्ति जोड़ें',en:'Insert row above'},
 ctxRowBelow:{np:'तल पंक्ति थप्नु',hi:'नीचे पंक्ति जोड़ें',en:'Insert row below'},
 ctxDelRow:{np:'पंक्ति मेट्नु',hi:'पंक्ति हटाएँ',en:'Delete row'},
 ctxColLeft:{np:'बायाँ स्तम्भ थप्नु',hi:'बाईं कॉलम जोड़ें',en:'Insert column left'},
 ctxColRight:{np:'दायाँ स्तम्भ थप्नु',hi:'दाईं कॉलम जोड़ें',en:'Insert column right'},
 ctxDelCol:{np:'स्तम्भ मेट्नु',hi:'कॉलम हटाएँ',en:'Delete column'},
 chartTitle:{np:'छनोट गरिएको डेटा',hi:'चयनित डेटा',en:'Selected data'},
 noData:{np:'कुनै संख्या भेटिएन',hi:'कोई संख्या नहीं मिली',en:'No numbers found'},
 rHome:{np:'होम',hi:'होम',en:'Home'},
 rInsert:{np:'इन्सर्ट',hi:'इन्सर्ट',en:'Insert'},
 rFormulas:{np:'सूत्र',hi:'फ़ॉर्मूला',en:'Formulas'},
 rData:{np:'डेटा',hi:'डेटा',en:'Data'},
 rView:{np:'भ्यू',hi:'व्यू',en:'View'},
 gClip:{np:'क्लिपबोर्ड',hi:'क्लिपबोर्ड',en:'Clipboard'},
 gFont:{np:'फन्ट',hi:'फ़ॉन्ट',en:'Font'},
 gSymbols:{np:'प्रतीक',hi:'प्रतीक',en:'Symbols'},
 gAlign:{np:'पङ्क्तिबद्धता',hi:'अलाइनमेंट',en:'Alignment'},
 gNumber:{np:'नम्बर',hi:'नंबर',en:'Number'},
 gStyles:{np:'स्टाइल',hi:'स्टाइल',en:'Styles'},
 gCells:{np:'सेलहरू',hi:'सेल्स',en:'Cells'},
 gEditing:{np:'सम्पादन',hi:'एडिटिंग',en:'Editing'},
 gCharts:{np:'चार्ट',hi:'चार्ट',en:'Charts'},
 gSheets:{np:'पाना / सेल',hi:'शीट / सेल',en:'Cells'},
 gInsert:{np:'इन्सर्ट',hi:'इन्सर्ट',en:'Insert'},
 gFnLib:{np:'फङ्सन लाइब्रेरी',hi:'फ़ंक्शन लाइब्रेरी',en:'Function Library'},
 gFnCat:{np:'श्रेणी',hi:'श्रेणी',en:'Category'},
 gFnHelp:{np:'फङ्सन मद्दत',hi:'फ़ंक्शन मदद',en:'Formula Auditing'},
 gFnTools:{np:'जार',hi:'ज़ार',en:'Calculation'},
 gSortF:{np:'क्रमबद्ध',hi:'सॉर्ट',en:'Sort & Filter'},
 gFilter:{np:'फिल्टर',hi:'फ़िल्टर',en:'Filter'},
 gDataTools:{np:'डेटा औजार',hi:'डेटा औज़ार',en:'Data Tools'},
 gSubtotal:{np:'आउटलाइन',hi:'आउटलाइन',en:'Outline'},
 gFreeze:{np:'प्यान फ्रिज',hi:'पैन्स फ्रीज़',en:'Freeze Panes'},
 gShow:{np:'देखाऔं',hi:'दिखाँ',en:'Show'},
 gZoom:{np:'जुम',hi:'ज़ूम',en:'Zoom'},
 gPrint:{np:'प्रिन्ट',hi:'प्रिंट',en:'Print'},
 sbReady:{np:'तयार',hi:'तैयार',en:'Ready'},
 rFile:{np:'फाइल',hi:'फ़ाइल',en:'File'},
 rTellMe:{np:'तपाईंले के गर्न चाहनुहुन्छ?',hi:'आप क्या करना चाहते हैं, वह बताएँ',en:'Tell me what you want to do'},
 sbA11y:{np:'पहुँच: सबै ठीक',hi:'पहुँच: सब ठीक है',en:'Accessibility: Good to go'},
 freezeTop:{np:'माथिल्लो पङ्क्ति फ्रिज',hi:'टॉप पंक्ति फ्रीज़ करें',en:'Freeze Top Row'},
 freezeFirst:{np:'पहिलो स्तम्भ फ्रिज',hi:'पहला कॉलम फ्रीज़ करें',en:'Freeze First Column'},
 freezeCell:{np:'प्यान फ्रिज',hi:'पैन्स फ्रीज़',en:'Freeze Panes at'},
 freezeOff:{np:'अनफ्रिज',hi:'अनफ्रीज़',en:'Unfreeze'},
 styGood:{np:'राम्रो',hi:'अच्छा',en:'Good'},
 styBad:{np:'नराम्रो',hi:'बुरा',en:'Bad'},
 styNeutral:{np:'बेअसर',hi:'सामान्य',en:'Neutral'},
 styHeading:{np:'शीर्षक',hi:'शीर्षक',en:'Heading'},
 styClear:{np:'स्टाइल हटाउनुहोस्',hi:'स्टाइल हटाएँ',en:'Clear Styles'},
 cndGt:{np:'... भन्दा ठूलो',hi:'इससे बड़ा…',en:'Greater than…'},
 cndLt:{np:'... भन्दा सानो',hi:'इससे छोटा…',en:'Less than…'},
 cndEq:{np:'बराबर',hi:'इसके बराबर…',en:'Equal to…'},
 cndBw:{np:'को बीचमा',hi:'इनके बीच…',en:'Between…'},
 cndDup:{np:'डुप्लिकेट मान',hi:'डुप्लिकेट मान',en:'Duplicate values'},
 cndTop:{np:'शीर्ष 3',hi:'शीर्ष 3',en:'Top 3'},
 cndClear:{np:'नियम मेटाउनुहोस्',hi:'नियम साफ़ करें',en:'Clear Rules'},
 cndValue:{np:'मान:',hi:'मान:',en:'Value:'},
 cndFrom:{np:'देखि:',hi:'से:',en:'From:'},
 cndTo:{np:'सम्म:',hi:'तक:',en:'To:'},
 brdNone:{np:'कुनै बोर्डर छैन',hi:'कोई बॉर्डर नहीं',en:'No Border'},
 brdAll:{np:'सबै बोर्डर',hi:'सभी बॉर्डर',en:'All Borders'},
 brdOuter:{np:'बाहिरी बोर्डर',hi:'बाहरी बॉर्डर',en:'Outside Borders'},
 brdThick:{np:'मोटो बाहिरी बोर्डर',hi:'मोटा बाहरी बॉर्डर',en:'Thick Outside Borders'},
 brdTop:{np:'माथिल्लो बोर्डर',hi:'ऊपरी बॉर्डर',en:'Top Border'},
 brdBottom:{np:'तल्लो बोर्डर',hi:'निचली बॉर्डर',en:'Bottom Border'},
 brdLeft:{np:'बायाँ बोर्डर',hi:'बायाँ बॉर्डर',en:'Left Border'},
 brdRight:{np:'दायाँ बोर्डर',hi:'दायाँ बॉर्डर',en:'Right Border'},
 rPageLayout:{np:'पेज लेआउट',hi:'पेज लेआउट',en:'Page Layout'},
 rReview:{np:'समीक्षा',hi:'समीक्षा',en:'Review'},
 gPageSetup:{np:'पेज सेटअप',hi:'पेज सेटअप',en:'Page Setup'},
 gScaleFit:{np:'स्केल',hi:'स्केल',en:'Scale to Fit'},
 gSheetOpt:{np:'शीट विकल्प',hi:'शीट विकल्प',en:'Sheet Options'},
 gProofing:{np:'प्रूफिङ',hi:'प्रूफ़िंग',en:'Proofing'},
 gInsights:{np:'इनसाइट',hi:'इनसाइट',en:'Insights'},
 gComments:{np:'टिप्पणी',hi:'टिप्पणी',en:'Comments'},
 gProtect:{np:'सुरक्षा',hi:'सुरक्षा',en:'Protect'},
 orientP:{np:'ठाडो',hi:'पोर्ट्रेट',en:'Portrait'},
 orientL:{np:'तेर्सो',hi:'लैंडस्केप',en:'Landscape'},
 pgSize:{np:'कागज साइज',hi:'पेपर साइज़',en:'Paper Size'},
 sizeA4:{np:'A4',hi:'A4',en:'A4'},
 sizeLetter:{np:'Letter',hi:'Letter',en:'Letter'},
 sizeLegal:{np:'Legal',hi:'Legal',en:'Legal'},
 margNormal:{np:'सामान्य',hi:'सामान्य',en:'Normal'},
 margNarrow:{np:'साँघुरो',hi:'नैरो',en:'Narrow'},
 margWide:{np:'फराकिलो',hi:'वाइड',en:'Wide'},
 protOn:{np:'सुरक्षित गर्नुहोस्',hi:'शीट सुरक्षित करें',en:'Protect Sheet'},
 protOff:{np:'सुरक्षा हटाउनुहोस्',hi:'शीट असुरक्षित करें',en:'Unprotect Sheet'},
 protMsg:{np:'शीट सुरक्षित छ — सम्पादन बन्द',hi:'शीट सुरक्षित है — संपादन बंद',en:'Sheet is protected — editing disabled'},
 spellNone:{np:'हिज्जे ठीक छ',hi:'वर्तनी ठीक है',en:'No spelling issues found'},
 spellQ:{np:'{ref} मा हिज्जे गलती: "{word}"\nयसले बदल्नुहोस्:',hi:'{ref} में वर्तनी त्रुटि: "{word}"\nइससे बदलें:',en:'Misspelled in {ref}: "{word}"\nReplace with:'},
 spellDone:{np:'{n} सुधार गरियो',hi:'{n} सुधार किए',en:'{n} correction(s) applied'},
 a11yClean:{np:'पहुँच जाँच: सबै ठीक',hi:'पहुँच जाँच: कोई समस्या नहीं',en:'Accessibility check passed — no issues found.'},
 a11yErrs:{np:'पहुँच जाँच: {n} सेलमा त्रुटि: {refs}',hi:'पहुँच जाँच: {n} सेल में त्रुटि: {refs}',en:'Accessibility check: {n} cell(s) with formula errors: {refs}'},
 a11yHead:{np:'पङ्क्ति 1 मा {n} खाली हेडर: {cols}',hi:'पंक्ति 1 में {n} खाली हेडर: {cols}',en:'{n} empty header(s) in row 1: {cols}'},
 smartAbout:{np:'यसको बारेमा बताऊ:',hi:'इसके बारे में बताओ:',en:'Tell me about:'},
 gLinks:{np:'लिङ्क',hi:'लिंक',en:'Links'},
 gText:{np:'पाठ',hi:'टेक्स्ट',en:'Text'},
 gWbViews:{np:'वर्कबुक भ्यू',hi:'वर्कबुक व्यू',en:'Workbook Views'},
 totalRowAdded:{np:'कुल पङ्क्ति थपियो — स्वतः गणना हुन्छ',hi:'टोटल पंक्ति जोड़ी गई — स्वतः गणना होती है',en:'Total row added — recalculates automatically'},
 tabRename:{np:'नाम परिवर्तन',hi:'नाम बदलें',en:'Rename'},
 tabDuplicate:{np:'प्रतिलिपि',hi:'प्रतिलिपि',en:'Duplicate'},
 tabColor:{np:'ट्याब रङ',hi:'टैब रंग',en:'Tab color'},
 sortAz:{np:'A देखि Z क्रम',hi:'A से Z क्रम',en:'Sort A to Z'},
 sortZa:{np:'Z देखि A क्रम',hi:'Z से A क्रम',en:'Sort Z to A'},
 clearColFilter:{np:'फिल्टर हटाउनुहोस्',hi:'फ़िल्टर हटाएँ',en:'Clear filter'},
 filterBy:{np:'फिल्टर',hi:'फ़िल्टर',en:'Filter'},
 blanks:{np:'(खाली)',hi:'(खाली)',en:'(Blanks)'},
 needRows:{np:'कम्तीमा दुई पङ्क्ति छान्नुहोस्',hi:'कम से कम दो rows चुनें',en:'Select at least two rows'},
 dupsRemoved:{np:'{n} दोहोरिएका हटाइयो',hi:'{n} दोहराए हटाए',en:'{n} duplicates removed'},
 fCnt:{np:'गणना',hi:'गिनती',en:'Count'},
 total:{np:'जम्मा',hi:'कुल',en:'Total'},
 catMath:{np:'गणित',hi:'गणित',en:'Math & Trig'},
 catStat:{np:'तथ्याङ्क',hi:'सांख्यिकी',en:'Statistical'},
 catText:{np:'पाठ',hi:'पाठ',en:'Text'},
 catLogic:{np:'तार्किक',hi:'तार्किक',en:'Logical'},
 catLookup:{np:'खोज',hi:'खोज',en:'Lookup'},
 catDate:{np:'मिति',hi:'तिथि',en:'Date'},
 catFin:{np:'वित्त',hi:'वित्तीय',en:'Financial'},
 fNoData:{np:'चयनमा कुनै नम्बर छैन',hi:'चयन में कोई नंबर नहीं',en:'No numbers in selection'},
 nameBox:{np:'नाम बाकस',hi:'नाम बॉक्स',en:'Name Box'},
 fbCancel:{np:'रद्द गर्नुहोस् (Esc)',hi:'रद्द करें (Esc)',en:'Cancel (Esc)'},
 fbEnter:{np:'प्रविष्ट गर्नुहोस्',hi:'एंटर करें',en:'Enter'},
 fbFx:{np:'प्रकार्य घुसाउनुहोस्',hi:'फ़ंक्शन डालें',en:'Insert Function'},
 ribbonMin:{np:'रिबन खुम्च्याउनुहोस् (Ctrl+F1)',hi:'रिबन संकुचित करें (Ctrl+F1)',en:'Collapse the Ribbon (Ctrl+F1)'},
 ribbonMax:{np:'रिबन विस्तार गर्नुहोस् (Ctrl+F1)',hi:'रिबन फैलाएँ (Ctrl+F1)',en:'Expand the Ribbon (Ctrl+F1)'},
 prevSheet:{np:'अघिल्लो पाना',hi:'पिछली शीट',en:'Previous Sheet'},
 nextSheet:{np:'अर्को पाना',hi:'अर्को शीट',en:'Next Sheet'},
 tabInsert:{np:'पाना घुसाउनुहोस्',hi:'शीट इन्सर्ट करें',en:'Insert Sheet'},
 tabDelete:{np:'पाना मेटाउनुहोस्',hi:'शीट हटाएँ',en:'Delete Sheet'},
 tabMoveL:{np:'बायाँ सार्नुहोस्',hi:'बाएँ ले जाएँ',en:'Move Sheet Left'},
 tabMoveR:{np:'दायाँ सार्नुहोस्',hi:'दाएँ ले जाएँ',en:'Move Sheet Right'},
 sbSaved:{np:'सुरक्षित भयो',hi:'सहेजा गया',en:'Saved'},
 sbPaint:{np:'ढाँचा कपी — लागू गर्न सेल छान्नुहोस्',hi:'फ़ॉर्मेट पेंटर — लागू करने के लिए सेल चुनें',en:'Format Painter — select cells to apply'},
 sortCol:{np:'स्तम्भ अनुसार क्रम',hi:'कॉलम के अनुसार क्रम',en:'Sort by column'},
 sortDesc:{np:'घट्दो क्रम (Z→A)',hi:'घटता क्रम (Z→A)',en:'Sort descending (Z→A)'},
 linkPrompt:{np:'लिङ्कको URL लेख्नुहोस्:',hi:'हाइपरलिंक URL दर्ज करें:',en:'Enter the hyperlink URL:'},
 notePrompt:{np:'टिप्पणी लेख्नुहोस्:',hi:'टिप्पणी लिखें:',en:'Enter a note / comment:'},
 explFor:{np:'यसमा सूत्र',hi:'इसमें फ़ॉर्मूला',en:'Formula in'},
 explFns:{np:'प्रकार्यहरू',hi:'फ़ंक्शन',en:'Functions'},
 explRefs:{np:'सन्दर्भहरू',hi:'संदर्भ',en:'References'},
 explNone:{np:'सक्रिय सेलमा कुनै सूत्र छैन।',hi:'सक्रिय सेल में कोई फ़ॉर्मूला नहीं है।',en:'No formula in the active cell.'},
 namesHead:{np:'नामित दायराहरू',hi:'नामित श्रेणियाँ',en:'Named ranges'},
 namesAdd:{np:'नयाँ नाम…',hi:'नया नाम…',en:'New name…'},
 namesAsk:{np:'सक्रिय सेलको नाम:',hi:'सक्रिय सेल का नाम:',en:'Name for the active cell:'},
 fillHandle:{np:'तानेर स्वतः भर्नुहोस् (फिल ह्यान्डल)',hi:'खींचकर ऑटो-भरें (फ़िल हैंडल)',en:'Drag to auto-fill (Fill Handle)'},
 fillDone:{np:'स्वतः भरियो',hi:'ऑटो-भरा गया',en:'Auto-filled'},
 navHome:{np:'A1 मा जानुहोस् (Ctrl+Home)',hi:'A1 पर जाएँ (Ctrl+Home)',en:'Go to A1 (Ctrl+Home)'},
 navEnd:{np:'अन्तिम सेलमा जानुहोस् (Ctrl+End)',hi:'अंतिम सेल पर जाएँ (Ctrl+End)',en:'Go to last cell (Ctrl+End)'},
 fillMenu:{np:'भर्नुहोस्',hi:'भरें',en:'Fill'},
 fillCopy:{np:'सेल प्रतिलिपि',hi:'सेल कॉपी करें',en:'Copy Cells'},
 fillSeries:{np:'श्रेणी भर्नुहोस्',hi:'श्रेणी भरें',en:'Fill Series'},
 fillFmt:{np:'केवल ढाँचा भर्नुहोस्',hi:'केवल फ़ॉर्मैटिंग भरें',en:'Fill Formatting Only'},
 fillNoFmt:{np:'ढाँचा बिना भर्नुहोस्',hi:'फ़ॉर्मैटिंग के बिना भरें',en:'Fill Without Formatting'},
 fillCancel:{np:'रद्द',hi:'रद्द करें',en:'Cancel'},
 bTable:{np:'तालिका',hi:'तालिका',en:'Table'},
 bRecTbl:{np:'सिफारिस तालिका',hi:'अनुशंसित तालिका',en:'Recommended Tables'},
 bPivot:{np:'पिभट तालिका',hi:'पिवट टेबल',en:'PivotTable'},
 gTables:{np:'तालिकाहरू',hi:'टेबल्स',en:'Tables'},
 bShape:{np:'आकृतिहरू',hi:'आकृतियाँ',en:'Shapes'},
 bSmartArt:{np:'स्मार्टआर्ट',hi:'स्मार्टआर्ट',en:'SmartArt'},
 bSShot:{np:'स्क्रिनसट',hi:'स्क्रीनशॉट',en:'Screenshot'},
 gIllus:{np:'चित्रहरू',hi:'चित्र',en:'Illustrations'},
 gTours:{np:'टुर',hi:'टूर',en:'Tours'},
 bRecPivot:{np:'सिफारिस गरिएका पिभट',hi:'अनुशंसित पिवट',en:'Recommended PivotTables'},
 bRecChart:{np:'सिफारिस गरिएका चार्ट',hi:'अनुशंसित चार्ट',en:'Recommended Charts'},
 bIIcons:{np:'आइकन',hi:'आइकॉन',en:'Icons'},
 bI3D:{np:'३डी मोडेल',hi:'3D मॉडल',en:'3D Models'},
 bMaps:{np:'३डी नक्सा',hi:'3D मैप',en:'3D Maps'},
 bSparkLine:{np:'रेखा',hi:'लाइन',en:'Line'},
 bSparkCol:{np:'स्तम्भ',hi:'कॉलम',en:'Column'},
 bSparkWin:{np:'जीत/हार',hi:'जीत/हार',en:'Win/Loss'},
 bSlicer:{np:'स्लाइसर',hi:'स्लाइसर',en:'Slicer'},
 bTimeline:{np:'टाइमलाइन',hi:'टाइमलाइन',en:'Timeline'},
 bEquation:{np:'समीकरण',hi:'समीकरण',en:'Equation'},
 bSymbol:{np:'चिह्न',hi:'प्रतीक',en:'Symbol'},
 bChartCol:{np:'स्तम्भ चार्ट',hi:'कॉलम चार्ट',en:'Column chart'},
 bChartLine:{np:'रेखा चार्ट',hi:'लाइन चार्ट',en:'Line chart'},
 bChartPie:{np:'पाई चार्ट',hi:'पाई चार्ट',en:'Pie chart'},
 bChartBar:{np:'बार चार्ट',hi:'बार चार्ट',en:'Bar chart'},
 bChartArea:{np:'क्षेत्र चार्ट',hi:'एरिया चार्ट',en:'Area chart'},
 bChartScatter:{np:'स्कैटर चार्ट',hi:'स्कैटर चार्ट',en:'Scatter chart'},
 bChartType:{np:'चार्ट प्रकार',hi:'चार्ट प्रकार',en:'Chart type'},
 bHyperlink:{np:'हाइपरलिङ्क',hi:'हाइपरलिंक',en:'Hyperlink'},
 insSoon:{np:'अहिले उपलब्ध छैन।',hi:'अभी उपलब्ध नहीं है।',en:'Not available in this build yet.'},
 gSpark:{np:'स्पार्कलाइन',hi:'स्पार्कलाइन',en:'Sparklines'},
 gFilters:{np:'फिल्टर',hi:'फ़िल्टर',en:'Filters'},
 bRecPiv:{np:'सिफारिस पिभट तालिका',hi:'अनुशंसित पिवट टेबल',en:'Recommended PivotTables'},
 pivotTitle:{np:'पिभट तालिका',hi:'पिवट टेबल',en:'PivotTable'},
 pivotNeed:{np:'कम्तीमा एक रो र एक value फिल्ड छान्नुहोस्',hi:'कम से कम एक पंक्ति और एक मान फ़ील्ड चुनें',en:'Select at least one row field and one value field'},
 pivotGo:{np:'बनाउनुहोस्',hi:'बनाएँ',en:'Create'},
 pivotEmpty:{np:'डेटा फेला परेन — पहले सेल चयन गर्नुहोस्',hi:'डेटा नहीं मिला — पहले सेल चुनें',en:'No data found — select cells first'},
 pivotPick:{np:'फिल्ड थप्नुहोस् / हटाउनुहोस्',hi:'फ़ील्ड जोड़ें / हटाएँ',en:'Add / remove fields'},
 pivotDesc:{np:'तालिकाबाट पिभट संक्षेप बनाउँछ',hi:'तालिका से पिवट सारांश बनाता है',en:'Summarise a table into a pivot report'},
 recTitle:{np:'सिफारिस तालिकाहरू',hi:'अनुशंसित तालिकाएँ',en:'Recommended Tables'},
 recEmpty:{np:'सिफारिस गर्न पर्याप्त डेटा छैन',hi:'अनुशंसा के लिए पर्याप्त डेटा नहीं है',en:'Not enough data to recommend'},
 recUse:{np:'प्रयोग गर्नुहोस्',hi:'उपयोग करें',en:'Use'},
 picTitle:{np:'स्क्रिनसट / तस्वीर',hi:'स्क्रीनशॉट / चित्र',en:'Screenshot / Picture'},
 picLbl:{np:'ब्राउज वा ग्रिडको स्क्रिनसट हाल्नुहोस्',hi:'ब्राउज़ करें या ग्रिड का स्क्रीनशॉट डालें',en:'Browse for an image or insert a grid screenshot'},
 picBrowse:{np:'ब्राउज…',hi:'ब्राउज़…',en:'Browse…'},
 picShot:{np:'स्क्रिनसट हाल्नुहोस्',hi:'स्क्रीनशॉट डालें',en:'Insert Screenshot'},
 shapeList:{np:'आकृतिहरू',hi:'आकृतियाँ',en:'Shapes'},
 smartList:{np:'स्मार्टआर्ट प्रक्रिया',hi:'स्मार्टआर्ट प्रक्रिया',en:'SmartArt Process'},
 picDone:{np:'चित्र थपियो',hi:'चित्र जोड़ा गया',en:'Picture added'},
 pivotDone:{np:'पिभट तालिका नयाँ शीटमा बनाइयो',hi:'पिवट टेबल नई शीट में बनाई गई',en:'PivotTable created on a new sheet'},
 tblDone:{np:'तालिका बनाइयो',hi:'तालिका बनाई गई',en:'Table created'},
 tblNoData:{np:'पहिले डेटा भएको रेन्ज छान्नुहोस्',hi:'पहले डेटा वाली रेंज चुनें',en:'Select a data range first'},
 rDraw:{np:'ड्र',hi:'ड्रॉ',en:'Draw'},
 rHelp:{np:'सहायता',hi:'सहायता',en:'Help'},
 gDrawTools:{np:'औज़ार',hi:'औज़ार',en:'Tools'},
 gPens:{np:'पेन',hi:'पेन',en:'Pens'},
 gShapes:{np:'आकृतिहरू',hi:'आकृतियाँ',en:'Shapes'},
 gHelpHelp:{np:'सहयोग',hi:'सहायता',en:'Support'},
 gHelpTools:{np:'समुदाय',hi:'समुदाय',en:'Community'},
 helpTitle:{np:'सहायता र सर्टकट',hi:'सहायता और शॉर्टकट',en:'Help & Keyboard Shortcuts'},
 helpStart:{np:'सुरु गर्ने तरिका',hi:'शुरू करें',en:'Getting started'},
 helpStartTxt:{np:'सेल वा फर्मूला बारमा value वा =formula लेख्नुहोस् (जस्तै =SUM(B2:B6))। सबै ब्राउज़रमा सेभ हुन्छ।',hi:'सेल या फॉर्मूला बार में value या =formula लिखें (जैसे =SUM(B2:B6))। सब ब्राउज़र में सेव होता है।',en:'Type a value or an =formula (e.g. =SUM(B2:B6)) into a cell or the formula bar. Everything auto-saves in your browser.'},
 helpKeys:{np:'किबोर्ड सर्टकट',hi:'कीबोर्ड शॉर्टकट',en:'Keyboard shortcuts'},
 helpKC:{np:'कपी / कट / पेस्ट',hi:'कॉपी / कट / पेस्ट',en:'Copy / Cut / Paste'},
 helpKF:{np:'बोल्ड / इटालिक / अन्डरलाइन',hi:'बोल्ड / इटैलिक / अंडरलाइन',en:'Bold / Italic / Underline'},
 helpKU:{np:'अन्डू / रीडू',hi:'अनडू / रीडू',en:'Undo / Redo'},
 helpKR:{np:'खोजें र बदल्नु',hi:'खोजें और बदलें',en:'Find & Replace'},
 helpKP:{np:'प्रिन्ट',hi:'प्रिंट',en:'Print'},
 helpKR2:{np:'रिबन ढाल्नु',hi:'रिबन छोटा करें',en:'Collapse the Ribbon'},
 helpKE:{np:'सेल सम्पादन · पक्का · रद्द',hi:'सेल संपादन · पक्का · रद्द',en:'Edit cell · Confirm · Cancel'},
 helpKJ:{np:'डेटा ब्लकको किनारमा जानु',hi:'डेटा ब्लक के किनारे पर जाएँ',en:'Jump to the edge of the data block'},
 helpKD:{np:'छानिएका सेल खाली गर्नु',hi:'चयनित सेल खाली करें',en:'Clear selected cells'},
 helpFn:{np:'सूत्रहरू',hi:'फ़ॉर्मूला',en:'Formulas'},
 helpFnTxt:{np:'SUM, AVERAGE, MIN, MAX, COUNT, IF, ROUND, UPPER, LEN, RANDBETWEEN, SUBTOTAL… पूरा सूची Formulas ▸ Category मा हेर्नुहोस्।',hi:'SUM, AVERAGE, MIN, MAX, COUNT, IF, ROUND, UPPER, LEN, RANDBETWEEN, SUBTOTAL… पूरी सूची Formulas ▸ Category में देखें।',en:'Try SUM, AVERAGE, MIN, MAX, COUNT, IF, ROUND, UPPER, LEN, RANDBETWEEN, SUBTOTAL… see the full list under Formulas ▸ Category.'},
 bInkDraw:{np:'ड्र',hi:'ड्रॉ',en:'Draw'},
 bInkSelect:{np:'चयन',hi:'चयन करें',en:'Select'},
 bInkErase:{np:'मेटाउनु',hi:'मिटाएँ',en:'Erase'},
 bInkClear:{np:'खाली',hi:'साफ़',en:'Clear'},
 penColorT:{np:'पेन रङ',hi:'पेन रंग',en:'Pen color'},
 penWidthT:{np:'पेन बाक्लो',hi:'पेन मोटाई',en:'Pen width'},
 pwThin:{np:'पातलो',hi:'पतला',en:'Thin'},
 pwMed:{np:'मध्यम',hi:'मध्यम',en:'Medium'},
 pwThick:{np:'बाक्लो',hi:'मोटा',en:'Thick'},
 bShRect:{np:'बाकस',hi:'बॉक्स',en:'Box'},
 bShEllipse:{np:'अंडाकार',hi:'अंडाकार',en:'Oval'},
 bShLine:{np:'रेखा',hi:'रेखा',en:'Line'},
 bShArrow:{np:'तीर',hi:'तीर',en:'Arrow'},
 bShTri:{np:'त्रिकोण',hi:'त्रिभुज',en:'Tri'},
 bShText:{np:'पाठ',hi:'टेक्स्ट',en:'Text'},
 bHelpOpen:{np:'सहायता',hi:'सहायता',en:'Help'},
 bShortcuts:{np:'सर्टकट',hi:'शॉर्टकट',en:'Shortcuts'},
 bFnRef:{np:'फन्क्सन',hi:'फ़ंक्शन',en:'Functions'},
 bFeedback:{np:'प्रतिक्रिया',hi:'प्रतिक्रिया',en:'Feedback'},
 bAbout:{np:'बारे',hi:'परिचय',en:'About'},
 inkOn:{np:'ड्र मोड ON — ग्रिडमा कोर्नुहोस्',hi:'ड्रा मोड ON — ग्रिड पर बनाएँ',en:'Draw mode ON — sketch on the grid'},
 inkOff:{np:'ड्र मोड OFF',hi:'ड्रा मोड OFF',en:'Draw mode OFF'},
 drawCleared:{np:'आकृति र ड्र खाली गरियो',hi:'आकृतियाँ और ड्रॉ साफ़ किए',en:'Shapes & ink cleared'},
 sparkDone:{np:'स्पार्कलाइन थपियो',hi:'स्पार्कलाइन जोड़ा गया',en:'Sparkline added'},
 aboutLine:{np:'मिनी एक्सेल',hi:'मिनी एक्सेल',en:'Mini Excel'},
 gThemes:{np:'थिम',hi:'थीम',en:'Themes'},
 bFormat:{np:'फरम्याट',hi:'फ़ॉर्मैट',en:'Format'},
  bAcct:{np:'लेखा',hi:'लेखा',en:'Accounting'},
 colWidth:{np:'स्तम्भ चौडाइ…',hi:'कॉलम चौड़ाई…',en:'Column width…'},
 autoFit:{np:'स्वतः फिट',hi:'ऑटोफ़िट करें',en:'AutoFit column'},
 defWidth:{np:'पूर्वनिर्धारित चौडाइ',hi:'डिफ़ॉल्ट चौड़ाई',en:'Default width'},
 gGetData:{np:'डेटा प्राप्त',hi:'डेटा प्राप्त करें',en:'Get & Transform'},
 impCsvMenu:{np:'CSV फाइल आयात…',hi:'CSV फ़ाइल आयात करें…',en:'Import CSV file…'},
 getDataHint:{np:'CSV आयात ग्रिडमा लोड हुन्छ',hi:'CSV आयात ग्रिड में लोड होता है',en:'Imports the CSV into the grid'},
 gAddins:{np:'एड-इन',hi:'ऐड-इन',en:'Add-ins'},
 bFmtTable:{np:'तालिका रूपमा फरम्याट',hi:'टेबल के रूप में फ़ॉर्मैट',en:'Format as Table'},
 tblGreen:{np:'हरियो — Table Style Medium',hi:'हरी — Table Style Medium',en:'Green, Table Style Medium'},
 tblBlue:{np:'निलो — Table Style Medium',hi:'नीली — Table Style Medium',en:'Blue, Table Style Medium'},
 tblOrange:{np:'सुन्तला — Table Style Medium',hi:'नारंगी — Table Style Medium',en:'Orange, Table Style Medium'},
 tblPurple:{np:'बैजनी — Table Style Medium',hi:'बैंगनी — Table Style Medium',en:'Purple, Table Style Medium'},
 tblGray:{np:'खैरो — Table Style Medium',hi:'स्लेटी — Table Style Medium',en:'Gray, Table Style Medium'},
 addinRandom:{np:'अनियमित डेटा जेनेरेटर',hi:'रैंडम डेटा जेनरेटर',en:'Random Data Generator'},
 addinDate:{np:'मिति स्टाम्प',hi:'दिनांक स्टाम्प',en:'Date Stamper'},
 addinClean:{np:'छिटो सफा (TRIM)',hi:'क्विक क्लीन (TRIM)',en:'Quick Clean (TRIM)'},
 bThemeFonts:{np:'Aa फन्ट',hi:'Aa फ़ॉन्ट',en:'Fonts'},
 bThemeFx:{np:'प्रभाव',hi:'प्रभाव',en:'Effects'},
 fxSubtle:{np:'सामान्य',hi:'सूक्ष्म',en:'Subtle'},
 fxSoft:{np:'नरम',hi:'मुलायम',en:'Soft'},
 fxRound:{np:'गोल',hi:'गोलाकार',en:'Round'},
 fxSharp:{np:'तीखो',hi:'तेज़',en:'Sharp'},
 bPrintArea:{np:'प्रिन्ट क्षेत्र',hi:'प्रिंट क्षेत्र',en:'Print Area'},
 paSet:{np:'छानिएकोबाट सेट',hi:'चयन से सेट करें',en:'Set from selection'},
 paClear:{np:'प्रिन्ट क्षेत्र हटाउनु',hi:'प्रिंट क्षेत्र हटाएँ',en:'Clear Print Area'},
 bBreaks:{np:'ब्रेक',hi:'ब्रेक',en:'Breaks'},
 /* ---- Excel parity: the groups this build added or re-homed ---- */
 gInsert:{np:'इन्सर्ट',hi:'इन्सर्ट',en:'Insert'},
 bDTText:{np:'टेक्स्ट बक्स',hi:'टेक्स्ट बॉक्स',en:'Text Box'},
 bDTPic:{np:'तस्बिर',hi:'तस्वीरें',en:'Pictures'},
 bDTShapes:{np:'आकार',hi:'आकार',en:'Shapes'},
 gPageBreaks:{np:'पेज ब्रेक',hi:'पेज ब्रेक',en:'Page Breaks'},
 gCalcOpt:{np:'गणना विकल्प',hi:'गणना विकल्प',en:'Calculation Options'},
 bCalcMode:{np:'गणना विकल्प',hi:'गणना विकल्प',en:'Calc Options'},
  bTracePre:{np:'पूर्ववर्ती',hi:'पूर्ववर्ती',en:'Precedents'},
  bShowFormulas:{np:'सूत्र',hi:'सूत्र',en:'Formulas'},
  orientAngle:{np:'कोण',hi:'कोण',en:'Angle'},
  orientUp:{np:'क्षैतिज',hi:'क्षैतिज',en:'Horizontal'},
  orientClear:{np:'कोण हटाएँ',hi:'कोण हटाएँ',en:'Clear angle'},
 calcAuto:{np:'स्वचालित',hi:'स्वचालित',en:'Automatic'},
 calcManual:{np:'मैन्युअल',hi:'मैन्युअल',en:'Manual'},
 calcNow:{np:'अहिले पुनः गणना गर्नुहोस्',hi:'अभी पुनर्गणना करें',en:'Calculate Now'},
 gNames:{np:'परिभाषित नाम',hi:'परिभाषित नाम',en:'Defined Names'},
 bNameMgr:{np:'नाम व्यवस्थापक',hi:'नाम प्रबंधक',en:'Name Manager'},
 bNameDef:{np:'नाम परिभाषित गर्नुहोस्',hi:'नाम परिभाषित करें',en:'Define Name'},
 bNameGo:{np:'जाउनुहोस्',hi:'जाएँ',en:'Go To'},
 gDataTypes:{np:'डेटा प्रकार',hi:'डेटा प्रकार',en:'Data Types'},
 bDtNum:{np:'नम्बर निकाल्नुहोस्',hi:'नंबर निकालें',en:'Extract Number'},
 bDtText:{np:'पाठ निकाल्नुहोस्',hi:'पाठ निकालें',en:'Extract Text'},
 bDtNeedRange:{np:'कृपया बढी भन्दा एउटा सेल छान्नुहोस्।',hi:'कृपया एक से अधिक सेल चुनें।',en:'Select more than one cell first.'},
 gA11y:{np:'पहुँचयोग्यता',hi:'सुगम्यता',en:'Accessibility'},
 bA11y:{np:'पहुँचयोग्यता',hi:'सुगम्यता',en:'Accessibility'},
 gLang:{np:'भाषाहरू',hi:'भाषाएँ',en:'Languages'},
 bLang:{np:'भाषा',hi:'भाषा',en:'Language'},
 gShare:{np:'साझा',hi:'साझा करें',en:'Share'},
 bShareCopy:{np:'लिंक प्रतिलिपि',hi:'लिंक कॉपी करें',en:'Copy Link'},
 bShareMail:{np:'इमेल',hi:'ईमेल',en:'Email'},
 brkInsert:{np:'पेज ब्रेक घुसाउनु',hi:'पेज ब्रेक डालें',en:'Insert Page Break'},
 brkRemove:{np:'यो ब्रेक हटाउनु',hi:'यह ब्रेक हटाएँ',en:'Remove Page Break here'},
 brkReset:{np:'सबै ब्रेक रिसेट',hi:'सभी ब्रेक रीसेट',en:'Reset All Page Breaks'},
 bBgPic:{np:'पृष्ठभूमि',hi:'पृष्ठभूमि',en:'Background'},
 bgSet:{np:'URL बाट पृष्ठभूमि…',hi:'URL से पृष्ठभूमि…',en:'Background from URL…'},
 bgRemove:{np:'पृष्ठभूमि हटाउनु',hi:'पृष्ठभूमि हटाएँ',en:'Remove Background'},
 bPrintTitles:{np:'प्रिन्ट शीर्षक',hi:'प्रिंट शीर्षक',en:'Print Titles'},
 ptSet:{np:'माथिल्लो पङ्क्ति दोहोर्याउनु',hi:'ऊपरी पंक्ति दोहराएँ',en:'Repeat top row from selection'},
 ptClear:{np:'शीर्षक हटाउनु',hi:'शीर्षक हटाएँ',en:'Clear Print Titles'},
 bTheme:{np:'थिम',hi:'थीम',en:'Themes'},
 bAccent:{np:'रङ',hi:'रंग',en:'Colors'},
 bMargins:{np:'मार्जिन',hi:'मार्जिन',en:'Margins'},
 bOrient:{np:'उन्मुखता',hi:'ओरिएंटेशन',en:'Orientation'},
 bSize:{np:'साइज',hi:'साइज़',en:'Size'},
 bPlPage:{np:'पेज दृश्य',hi:'पेज व्यू',en:'Page View'},
 bPlGrid:{np:'ग्रिडरेखा',hi:'ग्रिडलाइन',en:'Gridlines'},
 bPlHead:{np:'शीर्षकहरू',hi:'हेडिंग',en:'Headings'},
 bPlGridPrint:{np:'ग्रिडरेखा छाप्नु',hi:'ग्रिडलाइन प्रिंट करें',en:'Print gridlines'},
 bPlHeadPrint:{np:'शीर्षक छाप्नु',hi:'हेडिंग प्रिंट करें',en:'Print headings'},
 lblWidth:{np:'चौडाइ:',hi:'चौड़ाई:',en:'Width:'},
 lblHeight:{np:'उचाइ:',hi:'ऊँचाई:',en:'Height:'},
 lblScale:{np:'स्केल:',hi:'स्केल:',en:'Scale:'},
 lblView:{np:'हेर्न',hi:'व्यू',en:'View'},
 lblPrint:{np:'छाप्न',hi:'प्रिंट',en:'Print'},
 fitAuto:{np:'स्वतः',hi:'स्वचालित',en:'Automatic'},
 fitPage:{np:'पाना',hi:'पेज',en:'page(s)'},
 tipFitW:{np:'छापिएको कागज कति पाना चौडा बनाउने',hi:'प्रिंट कितने पेज चौड़ा हो',en:'Fit the printout to this many pages wide'},
 tipFitH:{np:'छापिएको कागज कति पाना अग्लो बनाउने',hi:'प्रिंट कितने पेज ऊँचा हो',en:'Fit the printout to this many pages tall'},
 tipScale:{np:'छाप्ने स्केल प्रतिशत',hi:'प्रिंट स्केल प्रतिशत',en:'Print scale percent'},
 tipScaleFit:{np:'स्केल Width/Height बाट गणना हुन्छ',hi:'स्केल Width/Height से तय होता है',en:'Scale is computed from Fit to — set Width/Height to Automatic to type a value'},
 psTitle:{np:'पेज सेटअप',hi:'पेज सेटअप',en:'Page Setup'},
 bPgSetupDlg:{np:'पेज सेटअप…',hi:'पेज सेटअप…',en:'Page Setup…'},
 psMoreSizes:{np:'थप कागज साइज…',hi:'और पेज साइज़…',en:'More Paper Sizes…'},
 pgOrient:{np:'उन्मुखता',hi:'ओरिएंटेशन',en:'Orientation'},
 margTop:{np:'माथि (cm)',hi:'ऊपर (cm)',en:'Top (cm)'},
 margBottom:{np:'तल (cm)',hi:'नीचे (cm)',en:'Bottom (cm)'},
 margLeft:{np:'बायाँ (cm)',hi:'बायाँ (cm)',en:'Left (cm)'},
 margRight:{np:'दायाँ (cm)',hi:'दायाँ (cm)',en:'Right (cm)'},
 margCenter:{np:'पानाको बीचमा',hi:'पेज के बीच में',en:'Center on page'},
 chkHoriz:{np:'तेर्सो',hi:'क्षैतिज',en:'Horizontally'},
 chkVert:{np:'ठाडो',hi:'लंबवत',en:'Vertically'},
 lblFitTo:{np:'फिट गर्ने',hi:'फिट करें',en:'Fit to'},
 lblPagesWide:{np:'पाना चौडा',hi:'पेज चौड़ा',en:'page(s) wide'},
 lblPagesTall:{np:'पाना अग्लो',hi:'पेज ऊँचा',en:'page(s) tall'},
 ptRows:{np:'माथि दोहोर्याउने पङ्क्ति',hi:'ऊपर दोहराने वाली पंक्तियाँ',en:'Rows to repeat at top'},
 ptCols:{np:'बायाँ दोहोर्याउने स्तम्भ',hi:'बाएँ दोहराने वाले कॉलम',en:'Columns to repeat at left'},
 psOk:{np:'ठीक',hi:'ठीक है',en:'OK'},
 psCancel:{np:'रद्द',hi:'रद्द करें',en:'Cancel'},
 psReset:{np:'रिसेट',hi:'रीसेट',en:'Reset'},
 psSaved:{np:'पेज सेटअप लागू भयो',hi:'पेज सेटअप लागू हुआ',en:'Page setup applied'},
 margCustom:{np:'अनुकूल मार्जिन…',hi:'कस्टम मार्जिन…',en:'Custom Margins…'},
 paAdd:{np:'प्रिन्ट क्षेत्रमा थप्नु',hi:'प्रिंट क्षेत्र में जोड़ें',en:'Add to Print Area'},
 brkRow:{np:'पङ्क्ति',hi:'पंक्ति',en:'row'},
 brkPreview:{np:'पेज ब्रेक पूर्वावलोकन',hi:'पेज ब्रेक प्रीव्यू',en:'Page Break Preview'},
 bgFile:{np:'फाइलबाट पृष्ठभूमि…',hi:'फ़ाइल से पृष्ठभूमि…',en:'Background from file…'},
 bgTooBig:{np:'छवि धेरै ठूलो (400KB सीमा)',hi:'छवि बहुत बड़ी (400KB सीमा)',en:'Image too large (400 KB limit)'},
 ptTopRow:{np:'माथिल्लो पङ्क्ति दोहोर्याउनु',hi:'ऊपरी पंक्ति दोहराएँ',en:'Repeat top row(s) from selection'},
 ptLeftCol:{np:'बायाँ स्तम्भ दोहोर्याउनु',hi:'बायाँ कॉलम दोहराएँ',en:'Repeat left column(s) from selection'},
 ptDialog:{np:'प्रिन्ट शीर्षक…',hi:'प्रिंट शीर्षक…',en:'Print Titles…'},
 thmReset:{np:'पूर्वनिर्धारितमा फर्काउनु',hi:'डिफ़ॉल्ट पर लौटाएँ',en:'Reset to default'},
 customColor:{np:'आफ्नै रङ…',hi:'कस्टम रंग…',en:'Custom color…'},
 /* --- File backstage view --- */
 bsHome:{np:'गृह',hi:'होम',en:'Home'},
 bsRecent:{np:'हालका',hi:'हाल की',en:'Recent'},
 bsRecentTitle:{np:'हालका कार्यपुस्तिकाहरू',hi:'हाल की वर्कबुक',en:'Recent workbooks'},
 bsStartNew:{np:'नयाँ',hi:'नया',en:'New'},
 bsOneDrive:{np:'OneDrive',hi:'OneDrive',en:'OneDrive'},
 bsOneDriveHint:{np:'क्लाउडबाट खोल्नुहोस्',hi:'क्लाउड से खोलें',en:'Open from the cloud'},
 bsCloudHint:{np:'खातामा सुरक्षित वर्कबुक',hi:'खाते में सहेजी गई वर्कबुक',en:'Workbooks saved to your account'},
 bsDrive:{np:'Google Drive',hi:'Google Drive',en:'Google Drive'},
 bsDriveHint:{np:'Google खाता जोड्नुहोस्',hi:'Google खाता जोड़ें',en:'Connect a Google account'},
 bsStoragePref:{np:'स्टोरेज',hi:'स्टोरेज',en:'Storage'},
 bsNoRecentBs:{np:'अहिलेसम्म कुनै फाइल खोलिएको छैन।',hi:'अभी तक कोई फ़ाइल नहीं खोली गई।',en:'No recent workbooks yet.'},
 bsInfo:{np:'जानकारी',hi:'जानकारी',en:'Info'},
 bsNew:{np:'नयाँ',hi:'नई',en:'New'},
 bsOpen:{np:'खोल्नुहोस्',hi:'खोलें',en:'Open'},
 bsSave:{np:'सेभ',hi:'सेव',en:'Save'},
 bsExport:{np:'निर्यात',hi:'निर्यात',en:'Export'},
 bsPrintPage:{np:'प्रिन्ट',hi:'प्रिंट',en:'Print'},
 bsWorkbook:{np:'कार्यपुस्तिका',hi:'वर्कबुक',en:'Workbook'},
 bsSaveBrowser:{np:'ब्राउज़रमा सेभ',hi:'ब्राउज़र में सेव',en:'Save in browser'},
 bsSavedHint:{np:'स्वतः browser मा save हुन्छ',hi:'अपने आप browser में save होता है',en:'Auto-saves in your browser'},
 bsCsvHint:{np:'हालको sheet .csv को रूपमा',hi:'वर्तमान शीट .csv के रूप में',en:'Current sheet as .csv'},
 bsXlsxHint:{np:'पूरै कार्यपुस्तिका',hi:'पूरी वर्कबुक',en:'Whole workbook'},
 bsZipHint:{np:'सबै sheets, zip गरिएको',hi:'सभी शीट, ज़िप में',en:'Every sheet, zipped'},
 bsPrintHint:{np:'प्रिन्ट वा PDF को रूपमा सेभ',hi:'प्रिंट या PDF के रूप में सेव',en:'Print or save as PDF'},
 bsSetupHint:{np:'मार्जिन, कागज आकार, स्केल',hi:'मार्जिन, पेपर आकार, स्केल',en:'Margins, paper size, scale'},
 bsSheets:{np:'Sheets',hi:'Sheets',en:'Sheets'},
 bsActive:{np:'सक्रिय sheet',hi:'सक्रिय शीट',en:'Active sheet'},
 bsCells:{np:'प्रयोग भएका सेलहरू',hi:'उपयोग किए गए सेल',en:'Used cells'},
 bsLang:{np:'भाषा',hi:'भाषा',en:'Language'},
 bsNewTitle:{np:'नयाँ कार्यपुस्तिका',hi:'नई वर्कबुक',en:'New workbook'},
 bsBlank:{np:'खाली कार्यपुस्तिका',hi:'खाली वर्कबुक',en:'Blank workbook'},
 bsBlankHint:{np:'नयाँ सुरु (Ctrl+N)',hi:'नई शुरुआत (Ctrl+N)',en:'Start fresh (Ctrl+N)'},
 bsOpenTitle:{np:'खोल्नुहोस्',hi:'खोलें',en:'Open'},
 bsOpenHint:{np:'.csv फाइल ब्राउज़ (Ctrl+O)',hi:'.csv फ़ाइल ब्राउज़ (Ctrl+O)',en:'Browse for a .csv file (Ctrl+O)'},
 bsSaveTitle:{np:'सेभ',hi:'सेव',en:'Save'},
 bsSaveHint2:{np:'यो browser मा स्थानीय रूपमा भण्डारण',hi:'इस browser में स्थानीय रूप से संग्रहीत',en:'Stored locally in this browser'},
 bsExportTitle:{np:'निर्यात',hi:'निर्यात',en:'Export'},
 bPgSetup:{np:'पृष्ठ सेटअप',hi:'पेज सेटअप',en:'Page Setup'},
};
function T(k){const v=STR[k];return v?(v[LANG]||v.en):k;}
function applyLang(l){
 LANG=l;try{localStorage.setItem(LSKLANG,l);}catch(e){}
 document.title=T('title');
 document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=T(el.dataset.i18n);});
 document.querySelectorAll('[data-i18n-ph]').forEach(el=>{el.placeholder=T(el.dataset.i18nPh);});
 document.querySelectorAll('[data-i18n-t]').forEach(el=>{el.title=T(el.dataset.i18nT);});
 fbar.placeholder=T('fxph');
 const ls=$('#lang');if(ls&&ls.value!==l)ls.value=l;
 if(recog)recog.lang=voiceLocale();
 /* The Drive connect/disconnect label is state, not a static string: the button
    also carries data-i18n="connectDrive", so without this a language switch
    would relabel a *connected* Drive as "Connect Drive". */
 try{if(typeof paintDriveBtn==='function')paintDriveBtn();}catch(e){}
 renderTabs();renderAll();}
function demoData(){if(LANG==='en')return{h:['Item','Amount'],items:[['Rice',950],['Lentils',1400],['Oil',180],['Sugar',450],['Salt',40]],tot:'Total'};
 if(LANG==='np')return{h:['सामान','रकम'],items:[['चामल',950],['दाल',1400],['तेल',180],['चिनी',450],['नुन',40]],tot:'जम्मा'};
 return{h:['सामान','राशि'],items:[['चावल',950],['दाल',1400],['तेल',180],['चीनी',450],['नमक',40]],tot:'कुल'};}
function defaultWB(){const c={
   A1:{raw:'सामान',s:{b:true,bg:'#e2efda'}},B1:{raw:'राशि',s:{b:true,bg:'#e2efda'}}};
  const demo=[['चावल',950],['दाल',1400],['तेल',180],['चीनी',450],['नमक',40]];
  demo.forEach((d,i)=>{c['A'+(i+2)]={raw:d[0]};c['B'+(i+2)]={raw:d[1],s:{numfmt:'inr'}};});
  c['A7']={raw:'कुल',s:{b:true,bg:'#e2efda'}};
  c['B7']={raw:'=SUM(B2:B6)',s:{b:true,numfmt:'inr'}};
  return{cur:0,sheets:[{name:'Sheet1',cells:c}]};}
/* ================= formula engine ================= */
function isErr(v){return typeof v==='string'&&v[0]==='#';}
function firstErr(v){if(isErr(v))return v;if(Array.isArray(v)){for(const x of v){const e=firstErr(x);if(e)return e;}}return null;}
const CATCHERS={IFERROR:1,ISERROR:1,ISERR:1,IFNA:1};
const FN_CATS={
 math:['SUM','PRODUCT','SUBTOTAL','ROUND','ROUNDUP','ROUNDDOWN','ABS','SQRT','POWER','INT','MOD','CEILING','FLOOR','EXP','LN','LOG','SIGN','TRUNC','RAND','RANDBETWEEN','MROUND','QUOTIENT'],
 stat:['AVERAGE','MIN','MAX','COUNT','COUNTA','COUNTIF','COUNTIFS','COUNTBLANK','MEDIAN','MODE','STDEV','VAR','LARGE','SMALL','RANK','PERCENTILE','SUMIF','AVERAGEIF','SUMIFS'],
 text:['LEN','UPPER','LOWER','PROPER','TRIM','LEFT','MID','RIGHT','CONCAT','CONCATENATE','TEXT','VALUE','REPT','SUBSTITUTE','REPLACE','FIND','SEARCH','EXACT','CLEAN','CHAR','CODE'],
 logic:['IF','IFS','IFERROR','IFNA','AND','OR','NOT','XOR','TRUE','FALSE','ISBLANK','ISNUMBER','ISTEXT','ISERROR','ISEVEN','ISODD','N'],
 lookup:['VLOOKUP','HLOOKUP','INDEX','MATCH','CHOOSE','ROWS','COLUMNS','XLOOKUP'],
 date:['TODAY','NOW','DATE','YEAR','MONTH','DAY','DAYS','WEEKDAY','EOMONTH','EDATE'],
 /* Financial. Excel groups these separately from Math & Trig, and so does the
    Formulas tab Category list. Rates are annual and payments periodic, matching
    Excel's defaults: PMT(rate, nper, pv, [fv], [type]). */
 financial:['PMT','PV','FV','NPER','RATE','IPMT','PPMT','NPV','IRR','XIRR','XNPV','SLN','SYD','DB','DDB','EFFECT','NOMINAL','PDURATION','RRI','CUMIPMT']
};
const FN_HELP={
SUM:'सबका जोड़',AVERAGE:'औसत',COUNT:'गिनती',COUNTA:'भरे सेल गिनो',SUMIF:'शर्त वाला जोड़',COUNTIF:'शर्त वाली गिनती',IF:'शर्त पर चुनाव',VLOOKUP:'पहली column में ढूँढकर value',INDEX:'position से value',MATCH:'value की position',ROUND:'गोल करो',MEDIAN:'बीच का मान',TEXT:'value को text format में',TODAY:'आज की तारीख',PRODUCT:'गुणा',SQRT:'वर्गमूल',POWER:'घात',MOD:'शेषफल',ABS:'निरपेक्ष मान',INT:'पूर्णांक भाग',MAX:'अधिकतम',MIN:'न्यूनतम',LARGE:'k-वीं बड़ी',SMALL:'k-वीं छोटी',RANK:'रैंक',LEFT:'बाएँ से अक्षर',RIGHT:'दाएँ से अक्षर',MID:'बीच से अक्षर',LEN:'लंबाई',UPPER:'बड़े अक्षर',LOWER:'छोटे अक्षर',TRIM:'खाली जगह हटाओ',AND:'सब सत्य?',OR:'कोई सत्य?',NOT:'उल्टा',YEAR:'साल',MONTH:'महीना',DAY:'दिन',DATE:'तारीख बनाओ',NOW:'आज+समय',CONCAT:'जोड़ो text',IFERROR:'error पर वैकल्पिक',SUMIFS:'कई शर्तों वाला जोड़',COUNTIFS:'कई शर्तों वाली गिनती',AVERAGEIF:'शर्त वाला औसत',XLOOKUP:'खोजो (नया)',CHOOSE:'क्रम से चुनो',ROWS:'पंक्तियाँ',COLUMNS:'स्तंभ',RAND:'यादृच्छिक',RANDBETWEEN:'सीमा में यादृच्छिक',ROUNDUP:'ऊपर गोल',ROUNDDOWN:'नीचे गोल',CEILING:'गुणज तक ऊपर',FLOOR:'गुणज तक नीचे',TRUNC:'काटो',SIGN:'चिह्न',EXP:'e की घात',LN:'प्राकृतिक log',LOG:'log',EXACT:'सटीक मिलान',SUBSTITUTE:'बदलो text',REPLACE:'जगह बदलो',FIND:'स्थान ढूँढो',SEARCH:'खोजो',REPT:'दोहराओ',VALUE:'संख्या बनाओ',PROPER:'पहला अक्षर बड़ा',CLEAN:'गंदे अक्षर हटाओ',CHAR:'कोड से अक्षर',CODE:'अक्षर का कोड',N:'संख्या में बदलो',IFS:'कई शर्तें',XOR:'एक ही सत्य',ISBLANK:'खाली?',ISNUMBER:'संख्या?',ISTEXT:'पाठ?',ISERROR:'त्रुटि?',ISEVEN:'सम?',ISODD:'विषम?',IFNA:'N/A पर वैकल्पिक',WEEKDAY:'सप्ताह का दिन',EOMONTH:'महीने का अंत',EDATE:'महीने जोड़ो/घटाओ',DAYS:'दिनों का अंतर',SUBTOTAL:'छिपी rows के साथ जोड़',MODE:'सबसे ज्यादा बार',STDEV:'मानक विचलन',VAR:'प्रसरण',PERCENTILE:'प्रतिशतक',COUNTBLANK:'खाली गिनो',MROUND:'निकटतम गुणज',QUOTIENT:'भागफल'};
function num(v){if(typeof v==='number')return v;if(v===''||v==null)return 0;if(typeof v==='string'){const n=Number(v.replace(/,/g,''));return isNaN(n)?NaN:n;}return NaN;}
function toStr(v){if(v===true)return'TRUE';if(v===false)return'FALSE';return v==null?'':String(v);}
function truthy(v){if(v===true)return true;if(v===false)return false;const n=num(v);if(!isNaN(n))return n!==0;return /^true$/i.test(toStr(v));}
function flat(a){const o=[];for(const x of a){if(Array.isArray(x))o.push(...x);else o.push(x);}return o;}
const nums=a=>flat(a).filter(v=>typeof v==='number'&&isFinite(v));
const FN={
 SUM:(...a)=>nums(a).reduce((s,v)=>s+v,0),
 AVERAGE:(...a)=>{const f=nums(a);return f.length?f.reduce((x,y)=>x+y,0)/f.length:'#DIV/0!';},
 MIN:(...a)=>{const f=nums(a);return f.length?Math.min(...f):0;},
 MAX:(...a)=>{const f=nums(a);return f.length?Math.max(...f):0;},
 COUNT:(...a)=>nums(a).length,
 COUNTA:(...a)=>flat(a).filter(v=>v!==''&&v!=null).length,
 IF:(c,a,b)=>truthy(c)?a:(b===undefined?false:b),
 ROUND:(v,d)=>{const p=Math.pow(10,d||0);return Math.round(num(v)*p)/p;},
 ABS:v=>Math.abs(num(v)),
 SQRT:v=>{const n=num(v);return n<0?'#NUM!':Math.sqrt(n);},
 POWER:(a,b)=>Math.pow(num(a),num(b)),
 LEN:v=>toStr(v).length,
 UPPER:v=>toStr(v).toUpperCase(),
 LOWER:v=>toStr(v).toLowerCase(),
 TRIM:v=>toStr(v).trim(),
 CONCAT:(...a)=>flat(a).map(toStr).join(''),
 CONCATENATE:(...a)=>flat(a).map(toStr).join(''),
 AND:(...a)=>flat(a).every(truthy),
 OR:(...a)=>flat(a).some(truthy),
 NOT:v=>!truthy(v),
 XOR:(...a)=>flat(a).filter(truthy).length%2===1,
 N:v=>typeof v==='number'?v:(v===true?1:(v===false?0:0)),
 EXACT:(a,b)=>toStr(a)===toStr(b),
 CLEAN:v=>toStr(v).replace(/[\x00-\x1F\x7F]/g,''),
 CHAR:v=>String.fromCharCode(num(v)),
 CODE:v=>toStr(v).charCodeAt(0)||0,
 MROUND:(v,m)=>{const g=num(m);if(g===0)return 0;return Math.round(num(v)/g)*g;},
 QUOTIENT:(a,b)=>{const d=num(b);if(d===0)return'#DIV/0!';return Math.trunc(num(a)/d);},
 IFS:(...a)=>{for(let i=0;i+1<a.length;i+=2)if(truthy(a[i]))return a[i+1];return'#N/A';},
 AVERAGEIF:(rng,crit)=>{const f=flat([rng]).filter(v=>matchCrit(v,typeof crit==='string'?crit:toStr(crit)));const n=f.map(num).filter(x=>!isNaN(x));return n.length?n.reduce((x,y)=>x+y,0)/n.length:'#DIV/0!';},
 SUMIFS:(sr,...rest)=>{const s=flat([sr]);const groups=[];
  for(let i=0;i+1<rest.length;i+=2)groups.push([flat([rest[i]]),rest[i+1]]);
  if(!groups.length)return 0;let tot=0;
  for(let i=0;i<s.length;i++){let all=true;
   for(const g of groups){if(!matchCrit(g[0][i],typeof g[1]==='string'?g[1]:toStr(g[1]))){all=false;break;}}
   if(all){const n=num(s[i]);if(!isNaN(n))tot+=n;}}
  return tot;},
 EOMONTH:(v,m)=>{const d=fromSerial(num(v));return serial(new Date(d.getFullYear(),d.getMonth()+1+num(m),0));},
 EDATE:(v,m)=>{const d=fromSerial(num(v));return serial(new Date(d.getFullYear(),d.getMonth()+num(m),d.getDate()));},
 XLOOKUP:(v,tbl,ret,miss)=>{const t=flat([tbl]),r=flat([ret]);
  for(let i=0;i<t.length;i++)if(toStr(t[i]).toLowerCase()===toStr(v).toLowerCase())return r[i];
  return miss===undefined?'#N/A':miss;},
 VLOOKUP:(v,tbl,idx)=>{const arr=flat([tbl]);const cols=tbl&&tbl.cols?tbl.cols:1;const i=num(idx)-1;
  for(let r=0;r*cols<arr.length;r++)if(toStr(arr[r*cols]).toLowerCase()===toStr(v).toLowerCase())return arr[r*cols+i];
  return'#N/A';},
 HLOOKUP:(v,tbl,idx)=>{const arr=flat([tbl]);const rows=tbl&&tbl.rows?tbl.rows:1;const i=num(idx)-1;
  for(let c=0;c<rows;c++)if(toStr(arr[c]).toLowerCase()===toStr(v).toLowerCase())return arr[i*rows+c];
  return'#N/A';},
 INDEX:(tbl,i,j)=>{const arr=flat([tbl]);const cols=tbl&&tbl.cols?tbl.cols:1;
  const k=(num(i)-1)*cols+((j===undefined?1:num(j))-1);return arr[k]===undefined?'#REF!':arr[k];},
 MATCH:(v,tbl,type)=>{const arr=flat([tbl]);const t2=type===undefined?0:num(type);
  for(let i=0;i<arr.length;i++)if(toStr(arr[i]).toLowerCase()===toStr(v).toLowerCase())return i+1;
  return'#N/A';},
 CHOOSE:(i,...vals)=>{const k=num(i)-1;return vals[k]===undefined?'#VALUE!':vals[k];},
 ROWS:tbl=>(tbl&&tbl.rows)?tbl.rows:flat([tbl]).length,
 COLUMNS:tbl=>(tbl&&tbl.cols)?tbl.cols:1,
 TODAY:()=>serial(new Date()),
 NOW:()=>serial(new Date()),
 DATE:(y,m2,d)=>serial(new Date(num(y),num(m2)-1,num(d))),
 YEAR:v=>fromSerial(num(v)).getFullYear(),
 MONTH:v=>fromSerial(num(v)).getMonth()+1,
 DAY:v=>fromSerial(num(v)).getDate(),
 DAYS:(a,b)=>num(a)-num(b),
 WEEKDAY:v=>fromSerial(num(v)).getDay()+1
};
function callFn(name,args){const f=FN[name];if(!f)throw'#NAME?';
 for(const a of args){const e=firstErr(a);if(e&&!CATCHERS[name])throw e;}
 return f(...args);}
function matchCrit(v,c){let op='=',cv=String(c);
 if(cv.startsWith('<>')){op='ne';cv=cv.slice(2);}
 else if(cv.startsWith('>=')){op='ge';cv=cv.slice(2);}
 else if(cv.startsWith('<=')){op='le';cv=cv.slice(2);}
 else if(cv.startsWith('>')){op='gt';cv=cv.slice(1);}
 else if(cv.startsWith('<')){op='lt';cv=cv.slice(1);}
 else if(cv.startsWith('=')){op='eq';cv=cv.slice(1);}
 const n=num(cv);const vn=typeof v==='number'?v:num(v);
 const bothNum=typeof vn==='number'&&isFinite(vn)&&!isNaN(n);
 let res=false;
 if(bothNum){switch(op){case'=':res=vn===n;break;case'ne':res=vn!==n;break;case'gt':res=vn>n;break;case'ge':res=vn>=n;break;case'lt':res=vn<n;break;case'le':res=vn<=n;break;}}
 else{const a=toStr(v).toLowerCase(),b=cv.toLowerCase();
  switch(op){case'=':res=a===b;break;case'ne':res=a!==b;break;case'gt':res=a>b;break;case'ge':res=a>=b;break;case'lt':res=a<b;break;case'le':res=a<=b;break;}}
 return res;}
Object.assign(FN,{
 MEDIAN:(...a)=>{const f=nums(a).sort((x,y)=>x-y);if(!f.length)return 0;const m2=f.length>>1;return f.length%2?f[m2]:(f[m2-1]+f[m2])/2;},
 PRODUCT:(...a)=>nums(a).reduce((p,v)=>p*v,1),
 IFERROR:(a,b)=>(typeof a==='string'&&a[0]==='#')?b:a,
 ISERROR:v=>isErr(v)?true:false,
 ISERR:v=>isErr(v)?true:false,
 COUNTIF:(rng,crit)=>flat([rng]).filter(v=>v!==''&&v!=null&&matchCrit(v,typeof crit==='string'?crit:toStr(crit))).length,
 SUMIF:(...a)=>{const rng=flat([a[0]]);const sr=a[2]!==undefined?flat([a[2]]):rng;let s=0;
  rng.forEach((v,i)=>{if(matchCrit(v,typeof a[1]==='string'?a[1]:toStr(a[1]))){const n2=num(sr[i]);if(!isNaN(n2))s+=n2;}});return s;}
});
function tokenize(src){
 const toks=[];let i=0;const isD=x=>x>='0'&&x<='9';
 while(i<src.length){
  const ch=src[i];
  if(ch===' '){i++;continue;}
  if(isD(ch)||ch==='.'){let j=i;while(j<src.length&&(isD(src[j])||src[j]==='.'))j++;const n=parseFloat(src.slice(i,j));if(isNaN(n))throw'#ERROR!';toks.push({t:'num',v:n});i=j;continue;}
  if(ch==='"'){let j=i+1,v='';while(j<src.length&&src[j]!=='"'){v+=src[j];j++;}if(j>=src.length)throw'#ERROR!';toks.push({t:'str',v});i=j+1;continue;}
  if(/[A-Za-z]/.test(ch)){
   let j=i;while(j<src.length&&/[A-Za-z0-9]/.test(src[j]))j++;
   const w=src.slice(i,j).toUpperCase();
   const m=/^([A-Z])([0-9]+)$/.exec(w);
   if(m&&src[j]===':'){
    let j2=j+1;while(j2<src.length&&/[A-Za-z0-9]/.test(src[j2]))j2++;
    const m2=/^([A-Z])([0-9]+)$/.exec(src.slice(j+1,j2).toUpperCase());
    if(m2){toks.push({t:'rng',r1:+m[2]-1,c1:colIndex(m[1]),r2:+m2[2]-1,c2:colIndex(m2[1])});i=j2;continue;}
  }
   if(m){toks.push({t:'ref',r:+m[2]-1,c:colIndex(m[1])});i=j;continue;}
   toks.push({t:'fn',v:w});i=j;continue;
  }
  const two=src.substr(i,2);
  if(two==='<='||two==='>='||two==='<>'){toks.push({t:'op',v:two});i+=2;continue;}
  if('+-*/^&(),<>='.includes(ch)){toks.push({t:'op',v:ch});i++;continue;}
  throw'#ERROR!';
 }
 return toks;
}
function evalRef(ref){
 if(cache[ref]!==undefined)return cache[ref];
 const c=cell(ref);let v;
 if(!c||c.raw==null||c.raw==='')v='';
 else if(typeof c.raw==='string'&&c.raw[0]==='='){
  if(visiting.has(ref)){cache[ref]='#CIRC!';return'#CIRC!';}
  visiting.add(ref);
  try{v=evalFormula(c.raw.slice(1));}catch(e){v=(typeof e==='string'&&e[0]==='#')?e:'#ERROR!';}
  visiting.delete(ref);
 }else{const t=String(c.raw).trim();const n=Number(t);
  if(/^(TRUE|FALSE)$/i.test(t))v=/^TRUE$/i.test(t);else v=(t!==''&&!isNaN(n))?n:c.raw;}
 cache[ref]=v;return v;
}
function rangeVals(r1,c1,r2,c2){const a=[];const rA=Math.min(r1,r2),rB=Math.max(r1,r2),cA=Math.min(c1,c2),cB=Math.max(c1,c2);for(let r=rA;r<=rB;r++)for(let c=cA;c<=cB;c++)a.push(evalRef(refOf(r,c)));return a;}
function evalFormula(src){
 const toks=tokenize(src);let p=0;
 const peek=()=>toks[p],nx=()=>toks[p++];
 function expect(op){const t=nx();if(!t||t.t!=='op'||t.v!==op)throw'#ERROR!';}
 function scalar(v){if(isErr(v))throw v;const n=num(v);if(isNaN(n))throw'#VALUE!';return n;}
 function safeEval(){try{return expr();}catch(e){if(isErr(e))return e;throw e;}}
  function prim(){
   const t=nx();if(!t)throw'#ERROR!';
   if(t.t==='num')return t.v;
   if(t.t==='str')return t.v;
   if(t.t==='ref')return evalRef(refOf(t.r,t.c));
   if(t.t==='rng')return rangeVals(t.r1,t.c1,t.r2,t.c2);
   if(t.t==='fn'){
    expect('(');const args=[];
    if(peek()&&peek().t==='op'&&peek().v===')'){nx();}
    else{
     let guard=0;
     args.push(safeEval());
     while(peek()&&peek().t==='op'&&peek().v===','&&guard<1000){nx();args.push(safeEval());guard++;}
     if(guard>=1000)throw'#ERROR!';
     expect(')');}
    return callFn(t.v,args);}
   if(t.t==='op'&&t.v==='('){const v=expr();expect(')');return v;}
   throw'#ERROR!';
  }
 function un(){const t=peek();if(t&&t.t==='op'&&(t.v==='-'||t.v==='+')){nx();const v=pw();return t.v==='-'?-scalar(v):scalar(v);}return pw();}
 function pw(){let v=prim();while(peek()&&peek().t==='op'&&peek().v==='^'){nx();const r=un();v=Math.pow(scalar(v),scalar(r));}return v;}
 function mul(){let v=un();while(peek()&&peek().t==='op'&&(peek().v==='*'||peek().v==='/')){const o=nx().v;const r=un();const a=scalar(v),b=scalar(r);if(o==='/'){if(b===0)throw'#DIV/0!';v=a/b;}else v=a*b;}return v;}
 function add(){let v=mul();while(peek()&&peek().t==='op'&&(peek().v==='+'||peek().v==='-')){const o=nx().v;const r=mul();v=o==='+'?scalar(v)+scalar(r):scalar(v)-scalar(r);}return v;}
 function cat(){let v=add();while(peek()&&peek().t==='op'&&peek().v==='&'){nx();v=toStr(v)+toStr(add());}return v;}
  function cmp(){
   let v=cat();const t=peek();
   if(t&&t.t==='op'&&['=','<','>','<=','>=','<>'].includes(t.v)){
    const o=nx().v;const r=cat();const an=num(v),bn=num(r);
    let res;if(!isNaN(an)&&!isNaN(bn))res=an-bn;
    else{const x=toStr(v).toLowerCase(),y=toStr(r).toLowerCase();res=x<y?-1:x>y?1:0;}
    if(o==='=')return res===0;if(o==='<>')return res!==0;
    if(o==='<')return res<0;if(o==='>')return res>0;
    if(o==='<=')return res<=0;return res>=0;}
   return v;}
 const expr=cmp;
 const v=expr();
 if(p<toks.length)throw'#ERROR!';
 return Array.isArray(v)?(v.length?v[0]:''):v;
}
function recalc(){cache={};visiting=new Set();vals={};const cs=sheet().cells;for(const ref in cs)vals[ref]=evalRef(ref);}

/* ================= rendering ================= */
function fmtNum(v,f){switch(f){
 case'npr':return'रु'+v.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
 case'inr':return'₹'+v.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
 case'usd':return'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 case'pct':return (v*100).toLocaleString('en-IN',{maximumFractionDigits:2})+'%';
 case'comma':return v.toLocaleString('en-IN',{maximumFractionDigits:2});
 case'dec2':return v.toFixed(2);
 default:return String(+v.toFixed(10));}}
function dispVal(ref){const v=vals[ref];if(v===''||v==null)return'';
 if(typeof v==='number'){const s=styleOf(ref);return fmtNum(v,s.numfmt||'gen');}
 if(typeof v==='boolean')return v?'TRUE':'FALSE';
 return String(v);}
function rect(){const a=refToRC(selA),b=refToRC(selB);return{r1:Math.min(a.r,b.r),r2:Math.max(a.r,b.r),c1:Math.min(a.c,b.c),c2:Math.max(a.c,b.c)};}
function inSel(ref){const p=refToRC(ref);const q=rect();return p.r>=q.r1&&p.r<=q.r2&&p.c>=q.c1&&p.c<=q.c2;}
const AL={left:'',center:'al-c',right:'al-r'};
function borderCss(b){if(!b)return'';
 const side=k=>b[k]?'1px '+(b[k]==='thick'?'2px ':'')+'solid':'';
 return{borderTop:side('t'),borderRight:side('r'),borderBottom:side('b'),borderLeft:side('l')};}
function paint(td){const ref=td.dataset.ref;const v=vals[ref];const s=styleOf(ref);
 const cond=condStyleFor(ref,v);
 let cls=AL[s.al||(typeof v==='number'?'right':'left')]||'';
 if(s.wrap)cls+=' wrap';
 if(s.va)cls+=' va-'+s.va;
 if(inSel(ref))cls+=' sel';
 if(ref===active)cls+=' act';
 if(s.note&&wb.showNotes!==false){cls+=' noted';td.title=s.note.length>60?s.note.slice(0,60)+'…':s.note;}
 else if(td.hasAttribute&&td.hasAttribute('title'))td.removeAttribute('title');
 if(wb.trace&&wb.trace.refs.indexOf(ref)>=0)cls+=' traced';
 td.className=cls.trim();
 /* Show Formulas displays the formula text in place of the result. */
 const raw=sheet().cells[ref]&&sheet().cells[ref].raw;
 td.textContent=wb.showFormulas&&typeof raw==='string'&&raw[0]==='='?raw:dispVal(ref);
 td.style.color=(cond.color||s.color)||'';td.style.background=(cond.bg||s.bg)||'';
 td.style.fontWeight=(cond.b||s.b)?'700':'';td.style.fontStyle=s.i?'italic':'';
 td.style.textDecoration=(s.u&&s.st)?'underline line-through':(s.u?'underline':(s.st?'line-through':''));
 /* Font sizes are stored in points, the way Excel stores them, and converted to
    pixels for the DOM. A cell with no size of its own inherits the grid's default
    rather than being pinned here, so "clear formatting" restores Calibri 11pt. */
 td.style.fontFamily=s.ff||'';td.style.fontSize=s.fs?(s.fs*PT).toFixed(2)+'px':'';
 /* Indent is 3 characters per step, as in Excel; rotation spins the text in the cell. */
 td.style.paddingLeft=s.indent?(Number(s.indent)*3+1)+'ch':'';
 td.style.transform=s.rot?'rotate('+Number(s.rot)+'deg)':'';
 const bc=borderCss(s.border);
 td.style.borderTop=bc.borderTop||'';td.style.borderRight=bc.borderRight||'';
 td.style.borderBottom=bc.borderBottom||'';td.style.borderLeft=bc.borderLeft||'';}
function renderAll(){
 recalc();
 const tds=grid.tBodies[0].getElementsByTagName('td');
 for(const td of tds)paint(td);
 refbox.textContent=active;
 if(!editing)fbar.value=rawOf(active);
 updateStats();applyFreeze();saveLS();positionFillHandle();positionFillPrev();renderDrawings();applySheetOpts();applyBreaks();}
function buildGrid(){let h='<colgroup><col style="width:34px">';
 for(let c=0;c<COLS;c++)h+='<col data-c="'+c+'" style="width:'+colW[c]+'px">';
 h+='</colgroup><thead><tr><th class="corner"></th>';
 for(let c=0;c<COLS;c++)h+='<th data-col="'+c+'">'+colName(c)+'<span class="rsh" data-c="'+c+'"></span></th>';
 h+='</tr></thead><tbody>';
 for(let r=0;r<ROWS;r++){h+='<tr><th data-row="'+r+'">'+(r+1)+'</th>';
  for(let c=0;c<COLS;c++)h+='<td data-ref="'+refOf(r,c)+'"></td>';
  h+='</tr>';}
 h+='</tbody>';grid.innerHTML=h;}
function tdOf(ref){return grid.querySelector('td[data-ref="'+ref+'"]');}
function updateStats(){const q=rect();const ns=[];
 for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++){const v=vals[refOf(r,c)];if(typeof v==='number'&&isFinite(v))ns.push(v);}
 const st=$('#stSum'),sa=$('#stAvg'),sc=$('#stCnt');
 if(!ns.length){st.textContent='';sa.textContent='';sc.textContent='';return;}
 const s=ns.reduce((a,b)=>a+b,0);
 st.textContent=T('sum')+': '+(+s.toFixed(6)).toLocaleString('en-IN');
 sa.textContent=T('avg')+': '+(+(s/ns.length).toFixed(6)).toLocaleString('en-IN');
 sc.textContent=T('cnt')+': '+ns.length;}

/* ================= cell ops, editing, selection ================= */
function setRaw(ref,val){if(gateEdit())return;snapshot();const cs=sheet().cells;
 if(val===''||val==null){const c=cs[ref];if(c){delete c.raw;if(!c.s||!Object.keys(c.s).length)delete cs[ref];}}
 else{const c=cs[ref]||{};c.raw=val;cs[ref]=c;}saveLS();}
function clearSel(){if(gateEdit())return;snapshot();const q=rect();
 for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++)delete sheet().cells[refOf(r,c)];
 saveLS();renderAll();}
function moveSel(dr,dc,extend){const p=refToRC(active);
 const nr=clamp(p.r+dr,0,ROWS-1),nc=clamp(p.c+dc,0,COLS-1);
 active=refOf(nr,nc);if(!extend){selA=active;selB=active;}
 renderAll();const td=tdOf(active);if(td)td.scrollIntoView({block:'nearest',inline:'nearest'});}
function commitEdit(dr,dc){const inp=$('#cellEdit');if(!inp)return;
 inp.onblur=null;editing=false;setRaw(active,inp.value);
 if(dr||dc)moveSel(dr||0,dc||0,false);else renderAll();}
function startEdit(init){if(editing)return;if(gateEdit())return;const td=tdOf(active);if(!td)return;
 editing=true;td.classList.add('editing');td.textContent='';
 const inp=document.createElement('input');inp.id='cellEdit';
 inp.value=init!==undefined?init:rawOf(active);
 td.appendChild(inp);inp.focus();if(init===undefined)inp.select();
 fbar.value=inp.value;
 inp.addEventListener('input',()=>{fbar.value=inp.value;});
 inp.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();commitEdit(1,0);}
  else if(e.key==='Tab'){e.preventDefault();commitEdit(0,e.shiftKey?-1:1);}
  else if(e.key==='Escape'){e.preventDefault();inp.onblur=null;editing=false;renderAll();}});
 inp.addEventListener('blur',()=>{if(editing)commitEdit(0,0);});}
function selTSV(){const q=rect();const rows=[];
 for(let r=q.r1;r<=q.r2;r++){const row=[];for(let c=q.c1;c<=q.c2;c++)row.push(rawOf(refOf(r,c)));rows.push(row.join('\t'));}
 return rows.join('\n');}

/* grid events */
grid.addEventListener('mousedown',e=>{
 if(e.button!==0)return;
 if(e.target.closest('.rsh'))return;
 const th=e.target.closest('th'),td=e.target.closest('td');
 if(editing)commitEdit(0,0);
 if(td){const ref=td.dataset.ref;
  if(e.shiftKey)selB=ref;else{selA=selB=active=ref;}
  dragging=true;renderAll();e.preventDefault();}
 else if(th){
  if(th.dataset.row!==undefined){const r=+th.dataset.row;selA=refOf(r,0);selB=refOf(r,COLS-1);active=selA;}
  else if(th.dataset.col!==undefined){const c=+th.dataset.col;selA=refOf(0,c);selB=refOf(ROWS-1,c);active=selA;}
  else{selA='A1';selB=refOf(ROWS-1,COLS-1);active='A1';}
  renderAll();e.preventDefault();}});
grid.addEventListener('mousemove',e=>{if(!dragging)return;const td=e.target.closest('td');if(td&&td.dataset.ref){selB=td.dataset.ref;renderAll();}});
document.addEventListener('mouseup',()=>dragging=false);
grid.addEventListener('dblclick',e=>{const td=e.target.closest('td');if(td){active=td.dataset.ref;selA=selB=active;renderAll();startEdit();}});

/* keyboard */
document.addEventListener('keydown',e=>{
 if(editing)return;
 const tg=e.target.tagName;
 if(tg==='INPUT'||tg==='SELECT')return;
 if(e.ctrlKey||e.metaKey){
  const k=e.key.toLowerCase();
  if(k==='c'||k==='x'||k==='v'){clip.focus();return;}
  if(k==='f'){e.preventDefault();$('#findDlg').classList.toggle('open');$('#findTxt').focus();return;}
  if(k==='z'){e.preventDefault();undo();return;}
  if(k==='y'){e.preventDefault();redo();return;}
  if(k==='b'){e.preventDefault();applyStyle({b:!styleOf(active).b});return;}
  if(k==='i'){e.preventDefault();applyStyle({i:!styleOf(active).i});return;}
  if(k==='u'){e.preventDefault();applyStyle({u:!styleOf(active).u});return;}
  if(k==='s'){e.preventDefault();saveLS();setStatusMode(T('sbSaved'));return;}
  if(k==='p'){e.preventDefault();window.print();return;}
  if(k==='h'){e.preventDefault();$('#findDlg').classList.add('open');$('#replTxt').focus();return;}
  if(k==='f1'){e.preventDefault();toggleRibbon();return;}
  if(k==='d'){e.preventDefault();fillDownCmd();return;}
  if(k==='r'){e.preventDefault();fillRightCmd();return;}
  if(k==='home'){e.preventDefault();goHome();return;}
  if(k==='end'){e.preventDefault();goEnd();return;}
  if(e.key==='ArrowDown'){e.preventDefault();jumpEdge(1,0,e.shiftKey);return;}
  if(e.key==='ArrowUp'){e.preventDefault();jumpEdge(-1,0,e.shiftKey);return;}
  if(e.key==='ArrowLeft'){e.preventDefault();jumpEdge(0,-1,e.shiftKey);return;}
  if(e.key==='ArrowRight'){e.preventDefault();jumpEdge(0,1,e.shiftKey);return;}
  if(e.key===' '){e.preventDefault();
   const q=rect();
   if(e.shiftKey){selA=refOf(q.r1,0);selB=refOf(q.r1,COLS-1);}
   else{selA=refOf(0,q.c1);selB=refOf(ROWS-1,q.c1);}
   active=selA;renderAll();return;}
  return;}
 if(e.altKey&&(e.key==='='||e.key==='+')){e.preventDefault();doAutoSum();return;}
 switch(e.key){
  case'ArrowUp':e.preventDefault();moveSel(-1,0,e.shiftKey);break;
  case'ArrowDown':e.preventDefault();moveSel(1,0,e.shiftKey);break;
  case'ArrowLeft':e.preventDefault();moveSel(0,-1,e.shiftKey);break;
  case'ArrowRight':e.preventDefault();moveSel(0,1,e.shiftKey);break;
  case'Enter':e.preventDefault();moveSel(1,0,false);break;
  case'Tab':e.preventDefault();moveSel(0,e.shiftKey?-1:1,false);break;
  case'F2':e.preventDefault();startEdit();break;
  case'F9':e.preventDefault();recalc();renderAll();break;
  case'Delete':case'Backspace':e.preventDefault();clearSel();break;
  default:if(e.key.length===1){e.preventDefault();startEdit(e.key);}}});

/* clipboard */
document.addEventListener('copy',e=>{if(editing)return;e.preventDefault();e.clipboardData.setData('text/plain',selTSV());});
document.addEventListener('cut',e=>{if(editing)return;e.preventDefault();e.clipboardData.setData('text/plain',selTSV());clearSel();});
document.addEventListener('paste',e=>{if(editing)return;e.preventDefault();
 const txt=(e.clipboardData||window.clipboardData).getData('text');if(!txt)return;
 snapshot();const lines=txt.replace(/\r/g,'').split('\n');if(lines.length&&lines[lines.length-1]==='')lines.pop();
 const p=refToRC(active);
 lines.forEach((ln,r)=>{if(p.r+r>=ROWS)return;ln.split('\t').forEach((v,c)=>{if(p.c+c>=COLS)return;
  const ref=refOf(p.r+r,p.c+c);
  if(v==='')delete sheet().cells[ref];
  else{const cel=sheet().cells[ref]||{};cel.raw=v;sheet().cells[ref]=cel;}});});
 saveLS();renderAll();});

/* ================= XLSX export (all sheets, Office Open XML) ================= */
const XMLH='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
function xmlEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function styleIdx(s){s=s||{};const f=(s.b?1:0)+(s.i?2:0)+(s.u?4:0);
 const a=s.al==='center'?1:(s.al==='right'?2:0);
 const n=s.numfmt==='pct'?1:(s.numfmt==='comma'?2:(s.numfmt==='dec2'?3:0));
 return f*12+a*4+n;}
function stylesXml(){const fonts=['<font><sz val="11"/><name val="Calibri"/></font>'];
 for(let f=1;f<8;f++)fonts.push('<font>'+(f&1?'<b/>':'')+(f&2?'<i/>':'')+(f&4?'<u/>':'')+'<sz val="11"/><name val="Calibri"/></font>');
 const nf=['0','10','3','2'],al=['general','center','right'];
 const xfs=['<xf numFmtId="0" fontId="0" applyFont="1"/>'];
 for(let f=0;f<8;f++)for(let a=0;a<3;a++)for(let n=0;n<4;n++){
  if(f===0&&a===0&&n===0)continue;
  xfs.push('<xf numFmtId="'+nf[n]+'" fontId="'+f+'" applyFont="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="'+al[a]+'"/></xf>');}
 return XMLH+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  +'<fonts count="8">'+fonts.join('')+'</fonts>'
  +'<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
  +'<borders count="1"><border/></borders>'
  +'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0"/></cellStyleXfs>'
  +'<cellXfs count="'+xfs.length+'">'+xfs.join('')+'</cellXfs></styleSheet>';}
function sheetValsOf(i){const old=wb.cur;wb.cur=i;recalc();const v=Object.assign({},vals);wb.cur=old;recalc();return v;}
function sheetXmlOf(i){
 const v=sheetValsOf(i),cs=wb.sheets[i].cells;let mR=-1,mC=-1;
 for(const ref in cs){const p=refToRC(ref);if(p.r>mR)mR=p.r;if(p.c>mC)mC=p.c;}
 let x=XMLH+'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
 for(let r=0;r<=mR;r++){let row='';
  for(let c=0;c<=mC;c++){const ref=refOf(r,c),cel=cs[ref];
   if(!cel||cel.raw==null||cel.raw==='')continue;
   const si=styleIdx(cel.s),sa=si?' s="'+si+'"':'';
   const raw=String(cel.raw);
   if(raw[0]==='='){const cv=v[ref];
    row+='<c r="'+ref+'"'+sa+'><f>'+xmlEsc(raw.slice(1))+'</f>'
     +((typeof cv==='number'&&isFinite(cv))?'<v>'+cv+'</v>':'')+'</c>';}
   else{const n=Number(raw.replace(/,/g,''));
    if(!isNaN(n)&&raw.trim()!=='')row+='<c r="'+ref+'"'+sa+'><v>'+n+'</v></c>';
    else row+='<c r="'+ref+'"'+sa+' t="inlineStr"><is><t xml:space="preserve">'+xmlEsc(raw)+'</t></is></c>';}}
  if(row)x+='<row r="'+(r+1)+'">'+row+'</row>';}
 return x+'</sheetData></worksheet>';}
function safeSheetName(n,i,used){let s=String(n||('Sheet'+(i+1))).replace(/[\[\]\*\/\\\?:]/g,'_').slice(0,31)||('Sheet'+(i+1));
 let base=s,k=2;while(used.has(s)){s=(base.slice(0,28)+'_'+(k++)).slice(0,31);}used.add(s);return s;}
function xlsxBytes(){
 const enc=new TextEncoder(),files=[],used=new Set(),names=[];
 wb.sheets.forEach((s,i)=>names.push(safeSheetName(s.name,i,used)));
 let ct=XMLH+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  +'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  +'<Default Extension="xml" ContentType="application/xml"/>'
  +'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
  +'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
 names.forEach((n2,i)=>{ct+='<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';});
 ct+='</Types>';
 let wbx=XMLH+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
 names.forEach((n2,i)=>{wbx+='<sheet name="'+xmlEsc(n2)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>';});
 wbx+='</sheets><calcPr fullCalcOnLoad="1"/></workbook>';
 let wbr=XMLH+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
 names.forEach((n2,i)=>{wbr+='<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>';});
 wbr+='<Relationship Id="rId'+(names.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
 const rels=XMLH+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
 files.push({name:'[Content_Types].xml',data:enc.encode(ct)});
 files.push({name:'_rels/.rels',data:enc.encode(rels)});
 files.push({name:'xl/workbook.xml',data:enc.encode(wbx)});
 files.push({name:'xl/_rels/workbook.xml.rels',data:enc.encode(wbr)});
 files.push({name:'xl/styles.xml',data:enc.encode(stylesXml())});
 wb.sheets.forEach((s,i)=>files.push({name:'xl/worksheets/sheet'+(i+1)+'.xml',data:enc.encode(sheetXmlOf(i))}));
 return zipBytes(files);}
function exportXLSX(){const nm=(wb.sheets[0]&&wb.sheets[0].name?String(wb.sheets[0].name):'workbook').replace(/[\\\/:*?"<>|]/g,'_');
 download(xlsxBytes(),nm+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');}
function allCsvZipBytes(){const enc=new TextEncoder();const files=[];
 wb.sheets.forEach((s,i)=>{const v=sheetValsOf(i),cs=s.cells;let mR=0,mC=0;
  for(const ref in cs){const p=refToRC(ref);if(p.r>mR)mR=p.r;if(p.c>mC)mC=p.c;}
  const lines=[];
  for(let r=0;r<=mR;r++){const row=[];for(let c=0;c<=mC;c++){const val=v[refOf(r,c)];
   row.push(csvField(val===undefined?'':val));}lines.push(row.join(','));}
  files.push({name:csvField(s.name).replace(/"/g,'')+'.csv',data:enc.encode('\uFEFF'+lines.join('\r\n'))});});
 const used=new Set();files.forEach((f,i)=>{let n=f.name,k=2;while(used.has(n))n=k+++'_'+f.name;used.add(n);f.name=n;});
 return zipBytes(files);}
function exportAllCsvZip(){const nm=(wb.sheets[0]&&wb.sheets[0].name?String(wb.sheets[0].name):'sheets').replace(/[\\\/:*?"<>|]/g,'_');
 download(allCsvZipBytes(),nm+'-all-csv.zip','application/zip');}

/* ================= AI agent ================= */
function normalizeAI(s){return' '+s.toLowerCase().replace(/[।!?,;"']/g,' ').replace(/\s+/g,' ').trim()+' ';}
function rangeFromStr(s){const parts=s.toUpperCase().split(':');const p1=refToRC(parts[0]);const p2=parts[1]?refToRC(parts[1]):p1;return{r1:Math.min(p1.r,p2.r),r2:Math.max(p1.r,p2.r),c1:Math.min(p1.c,p2.c),c2:Math.max(p1.c,p2.c)};}
function cellsOfRg(rg){const a=[];for(let r=rg.r1;r<=rg.r2;r++)for(let c=rg.c1;c<=rg.c2;c++)a.push(refOf(r,c));return a;}
function rangeA1(rg){return rg.r1===rg.r2&&rg.c1===rg.c2?refOf(rg.r1,rg.c1):refOf(rg.r1,rg.c1)+':'+refOf(rg.r2,rg.c2);}
function aiFindRange(m){const g=m.match(/\b([a-z])(\d{1,3})(\s*:\s*([a-z])(\d{1,3}))?\b/i);
 if(g){const rg=rangeFromStr((g[4]?g[1]+g[2]+':'+g[4]+g[5]:g[1]+g[2]).toUpperCase());return{rg,txt:g[0]};}
 const col=m.match(/\b(?:col(?:umn)?|कॉलम|स्तंभ)\s*([a-z])\b/i)||m.match(/\b([a-z])\s*(?:col(?:umn)?|कॉलम|स्तंभ)\b/i);
 if(col){const c=colIndex(col[1].toUpperCase());return{rg:{r1:0,r2:ROWS-1,c1:c,c2:c},txt:col[0]};}
 return null;}
const AI_RULES=[
 {re:/^\s*(go to|goto|जाओ|जानुहोस्)\s+([a-z]\d{1,3})\s*$/i,fn:m=>{const g=m.match(/([a-z]\d{1,3})\s*$/i);if(!g)return null;active=g[1].toUpperCase();selA=selB=active;renderAll();return T('aiDone')+' '+active;}},
 {re:/\b(new sheet)\b|नयाँ\s*sheet|नया\s*sheet/i,fn:()=>{addSheet();return T('aiDone')+' '+T('addSheet');}},
 {re:/\b(dark mode)\b|डार्क/i,fn:()=>{applyTheme('dark');return T('aiDone')+' Dark';}},
 {re:/\b(light mode)\b|लाइट/i,fn:()=>{applyTheme('light');return T('aiDone')+' Light';}},
 {re:/\b(solar mode|solar)\b/i,fn:()=>{applyTheme('solar');return T('aiDone')+' Solar';}},
 {re:/(put|set|राख|डाल|लिख|write|enter|insert|ब्रिस|हाल)/,fn:aiPut},
 {re:/(multiply|गुणा|times|गुणन)/,fn:aiMultiply},
 {re:/(divide|भाग|divide by|विभाजन)/,fn:aiDivide},
 {re:/(add|plus|जोड़|जोड्न|जोड्नु)/,fn:aiAdd},
 {re:/(bold)/,fn:aiBold},
 {re:/(italic)/,fn:aiItalic},
 {re:/(underline)/,fn:aiUnderline},
 {re:/(clear|delete|erase|हटा|मेट|मिटा|खाली)/,fn:aiClear},
 {re:/(sort|क्रम|sort गर्नुहोस्|क्रमबद्ध)/,fn:aiSort},
 {re:/(sum|जोड़|योग|जोड)/,fn:aiSumTo},
 {re:/(average|mean|औसत|औसत)/,fn:aiAvgTo},
 {re:/(percent|प्रतिशत|प्रतिशत)/,fn:aiPctFmt},
 {re:/(currency|rupee|रुपय|मुद्रा|नगद)/,fn:aiCurFmt}
];
/* ---- AI command handlers (m = normalized text, original case) ---- */
function refsOf(t){return (t.match(/(?<![a-z0-9:])[a-z]\d{1,3}(?![a-z0-9])/gi)||[]).map(x=>x.toUpperCase());}
function stripRefs(t){return t.replace(/(?<![a-z0-9:])[a-z]\d{1,3}(?:\s*:\s*[a-z]\d{1,3})?(?![a-z0-9])/gi,' ');}
function lastRefOf(t){const a=refsOf(t);return a.length?a[a.length-1]:null;}
function extractFormula(m){const i=m.indexOf('=');if(i<0)return null;
 let s=m.slice(i).split(/\s+(?:डालो|डाल्नु|डाल|राख्नु|राख|लेख्नु|लिख|में|मा|म|in|into|at|please|फिर)(?=\s|$)/i)[0];
 let f=(s.match(/=[A-Za-z0-9+\-*/^&(),.:%<>=!"'\s]*/)||[''])[0];
 f=f.replace(/\s+$/,'').replace(/\s+/g,'');
 return f.length>1?f:null;}
function caseFixFormula(f){
 f=f.replace(/(?<![a-z0-9])([a-z])(\d{1,3})(?![a-z0-9])/gi,(x,c,d)=>c.toUpperCase()+d);
 f=f.replace(/(?<![a-z0-9])([a-z]+)(?=\()/g,x=>x.toUpperCase());
 return f;}
let aiEditBlocked=false;
function aiCanEdit(){aiEditBlocked=!!sheet().protect;if(aiEditBlocked)setStatusMode(T('protMsg'));return !aiEditBlocked;}
function aiPut(m){if(!aiCanEdit())return null;const fi=m.indexOf('=');
 if(fi>=0){const raw=extractFormula(m);if(!raw)return null;
  const afterIdx=m.indexOf(raw)+raw.length;
  const after=m.slice(afterIdx);
  const rA=refsOf(after),rB=refsOf(m.slice(0,fi));
  const target=rA[0]||rB[rB.length-1];
  if(!target)return null;
  const f=caseFixFormula(raw);
  setRaw(target,f);return T('aiDone')+' '+target+' = '+f;}
 const refs=refsOf(m);if(!refs.length)return null;
 const q=m.match(/"([^"]+)"/)||m.match(/'([^']+)'/);
 if(q){setRaw(refs[refs.length-1],q[1]);return T('aiDone')+' '+refs[refs.length-1]+' = '+q[1];}
 const clean=stripRefs(m);const nums=clean.match(/-?\d+(?:\.\d+)?/);
 if(nums){setRaw(refs[refs.length-1],nums[0]);return T('aiDone')+' '+refs[refs.length-1]+' = '+nums[0];}
 return null;}
function aiArith(m,op){if(!aiCanEdit())return null;const ai=aiFindRange(m);if(!ai)return null;
 const n=stripRefs(m).match(/-?\d+(?:\.\d+)?/);if(!n)return null;
 snapshot();const refs=cellsOfRg(ai.rg);let done=0;
 refs.forEach(ref=>{const v=vals[ref];
  if(typeof v==='number'&&isFinite(v)){const c=sheet().cells[ref]||{};
   c.raw=String(op==='*'?v*+n[0]:op==='/'?v/+n[0]:v+ +n[0]);sheet().cells[ref]=c;done++;}});
 saveLS();renderAll();
 return done?T('aiDone')+' '+rangeA1(ai.rg)+' ('+done+')':null;}
function aiMultiply(m){return aiArith(m,'*');}
function aiDivide(m){return aiArith(m,'/');}
function aiAdd(m){return aiArith(m,'+');}
function aiStyleCmd(m,patch,label){if(!aiCanEdit())return null;const ai=aiFindRange(m);if(!ai)return null;
 applyStyle(patch,rangeA1(ai.rg));return T('aiDone')+' '+label+' '+rangeA1(ai.rg);}
function aiBold(m){return aiStyleCmd(m,{b:true},'Bold');}
function aiItalic(m){return aiStyleCmd(m,{i:true},'Italic');}
function aiUnderline(m){return aiStyleCmd(m,{u:true},'Underline');}
function aiClear(m){if(!aiCanEdit())return null;const ai=aiFindRange(m);if(!ai)return null;snapshot();
 cellsOfRg(ai.rg).forEach(ref=>delete sheet().cells[ref]);
 saveLS();renderAll();return T('aiDone')+' Clear '+rangeA1(ai.rg);}
function aiSort(m){if(!aiCanEdit())return null;const ai=aiFindRange(m);if(!ai)return null;
 const desc=/desc|उल्टा|गिर्द|ज़्यादा|ulta/i.test(m);
 let keyC=ai.rg.c1;
 for(let c=ai.rg.c1;c<=ai.rg.c2;c++){let num=false;
  for(let r=ai.rg.r1;r<=ai.rg.r2;r++){const cel=sheet().cells[refOf(r,c)];
   if(cel&&cel.raw!=null&&cel.raw!==''&&!isNaN(parseFloat(cel.raw))&&String(parseFloat(cel.raw))===String(cel.raw).trim()){num=true;break;}}
  if(num){keyC=c;break;}}
 const rows=[];for(let r=ai.rg.r1;r<=ai.rg.r2;r++){const row=[];for(let c=ai.rg.c1;c<=ai.rg.c2;c++)row.push(sheet().cells[refOf(r,c)]||null);rows.push({row,val:row[keyC-ai.rg.c1]?String(row[keyC-ai.rg.c1].raw):''});}
 rows.sort((a,b)=>{const x=a.val,y=b.val;const nx=parseFloat(x),ny=parseFloat(y);
  let cmp;if(x===''&&y==='')cmp=0;else if(x==='')cmp=1;else if(y==='')cmp=-1;
  else if(!isNaN(nx)&&!isNaN(ny)&&String(nx)===x.trim()&&String(ny)===y.trim())cmp=nx-ny;
  else cmp=x.localeCompare(y,'hi');
  return desc?-cmp:cmp;});
 snapshot();rows.forEach((it,i)=>{it.row.forEach((cel,j)=>{const ref=refOf(ai.rg.r1+i,ai.rg.c1+j);
  if(cel)sheet().cells[ref]=cel;else delete sheet().cells[ref];});});
 saveLS();renderAll();return T('aiDone')+' Sort '+rangeA1(ai.rg)+(desc?' ↓':'');}
function aiStatTo(m,kind){if(!aiCanEdit())return null;const ai=aiFindRange(m);if(!ai)return null;
 const others=refsOf(m.split(ai.txt).join(' '));
 const target=others[others.length-1];
 if(!target)return null;
 snapshot();
 const f=kind==='avg'?'AVERAGE':'SUM';
 const c=sheet().cells[target]||{};c.raw='='+f+'('+rangeA1(ai.rg)+')';sheet().cells[target]=c;
 saveLS();renderAll();return T('aiDone')+' '+target+' = ='+f+'('+rangeA1(ai.rg)+')';}
function aiSumTo(m){return aiStatTo(m,'sum');}
function aiAvgTo(m){return aiStatTo(m,'avg');}
function aiPctFmt(m){if(!aiCanEdit())return null;const ai=aiFindRange(m);if(!ai)return null;applyStyle({numfmt:'pct'},rangeA1(ai.rg));return T('aiDone')+' % '+rangeA1(ai.rg);}
function aiCurFmt(m){if(!aiCanEdit())return null;const ai=aiFindRange(m);if(!ai)return null;
 const f=/\$|dollar|डॉलर/i.test(m)?'usd':(/₹|inr|भारत/i.test(m)?'inr':'npr');
 applyStyle({numfmt:f},rangeA1(ai.rg));return T('aiDone')+' '+f.toUpperCase()+' '+rangeA1(ai.rg);}

/* ---- AI chat UI ---- */
function aiMsg(text,who){const log=$('#aiLog');const d=document.createElement('div');
 d.className='msg '+who;d.textContent=text;log.appendChild(d);log.scrollTop=log.scrollHeight;}
function aiRun(text){
 try{
  aiEditBlocked=false;
  const m=normalizeAI(text);
  for(const rule of AI_RULES){
   if(rule.re.test(m)){const res=rule.fn(m);if(res){renderAll();return res;}if(aiEditBlocked)return T('protMsg');}
  }
  return T('aiNoCmd');
 }catch(e){return T('aiErr')+' '+(e&&e.message?e.message:e);}
}
function runAssistantCommand(text,source){
 const txt=String(text||'').trim();if(!txt)return;
 const panel=$('#aiPanel');if(panel&&!panel.classList.contains('open'))panel.classList.add('open');
 aiMsg((source==='voice'?'🎙 ':'')+txt,'user');
 const result=aiAgentRun(txt);aiMsg(result,'bot');setStatusMode(result.split('\n')[0]);
}
function aiHandle(){const inp=$('#aiInput');const txt=inp.value.trim();if(!txt)return;inp.value='';runAssistantCommand(txt,'text');}
function aiAgentRun(text){
 const parts=String(text||'').split(/\s*(?:;|\bthen\b|फिर|अनि)\s*/i).map(s=>s.trim()).filter(Boolean);
 if(parts.length<2)return aiRun(text);
 const out=[T('agentTask')+' ('+parts.length+')'];
 parts.forEach((part,index)=>{const result=aiRun(part);out.push((index+1)+'. '+part+' → '+result);});
 return out.join('\n');
}
function initAI(){
 $('#bAI').onclick=()=>{const p=$('#aiPanel');p.classList.toggle('open');
  if(p.classList.contains('open')&&!p.dataset.welcomed){p.dataset.welcomed='1';aiMsg(T('aiWelcome'),'bot');}};
 $('#aiClose').onclick=()=>$('#aiPanel').classList.remove('open');
 $('#aiSend').onclick=aiHandle;
 $('#aiInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();aiHandle();}});}

/* ================= Voice commands (Web Speech API) ================= */
let recog=null,recogOn=false;
function voiceLocale(){return LANG==='hi'?'hi-IN':(LANG==='np'?'ne-NP':'en-US');}
function setVoiceState(btn,on){recogOn=!!on;btn.classList.toggle('on',recogOn);btn.setAttribute('aria-pressed',String(recogOn));}
function initVoice(){
 const btn=$('#aiMic');if(!btn)return;
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){btn.disabled=true;btn.title=T('voiceUnavailable');btn.setAttribute('aria-label',T('voiceUnavailable'));return;}
 recog=new SR();recog.lang=voiceLocale();recog.interimResults=false;recog.maxAlternatives=1;
 recog.onresult=e=>{const t=e.results[0][0].transcript.trim();
  const inp=$('#aiInput');if(inp)inp.value=t;runAssistantCommand(t,'voice');};
 recog.onend=()=>setVoiceState(btn,false);
 recog.onerror=e=>{setVoiceState(btn,false);const detail=e&&e.error?': '+e.error:'';aiMsg(T('voiceError')+detail,'bot');setStatusMode(T('voiceError'));};
 btn.onclick=()=>{if(recogOn){recog.stop();return;}
  try{recog.lang=voiceLocale();recog.start();setVoiceState(btn,true);}catch(e){setVoiceState(btn,false);aiMsg(T('voiceError'),'bot');}};}

/* ================= Themes & accent colors (Page Layout) ================= */
const THEMES=[['default','Default'],['light','Light'],['dark','Dark'],['solar','Solarized']];
function applyTheme(t){
 if(t&&t!=='default')document.body.setAttribute('data-theme',t);
 else document.body.removeAttribute('data-theme');
 wb.theme=t||'default';saveLS();}
function shadeHex(hex,factor){const n=parseInt(hex.slice(1),16),r=Math.max(0,Math.round(((n>>16)&255)*factor)),g=Math.max(0,Math.round(((n>>8)&255)*factor)),b=Math.max(0,Math.round((n&255)*factor));return'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');}
function applyAccent(c){document.documentElement.style.setProperty('--accent',c);document.documentElement.style.setProperty('--accent-dark',shadeHex(c,.78));wb.accent=c;saveLS();
 document.body.style.setProperty('--accent',c);document.body.style.setProperty('--accent-dark',shadeHex(c,.78));
 const app=$('#app');if(app)app.style.borderTop='3px solid '+c;}
function themeMenu(anchor){const cur=wb.theme||'default';
 const DOT={default:'🟩',light:'⬜',dark:'⬛',solar:'🟨'};
 popMenu(anchor,[{head:T('bTheme')}].concat(
  THEMES.map(t=>({label:(cur===t[0]?'✔ ':'')+(DOT[t[0]]||'⬜')+' '+t[1],action:()=>{applyTheme(t[0]);setStatusMode(T('bTheme')+': '+t[1]);}})),
  [null,{label:T('thmReset')+' — '+T('bTheme'),action:()=>{applyTheme('default');setStatusMode(T('thmReset'));}}]));}
function accentMenu(anchor){
 const items=[{head:T('bAccent')}];
 ['#217346','#c0392b','#2980b9','#8e44ad','#d35400','#16a085','#f1c40f','#2c3e50'].forEach(c=>
  items.push({label:c,on:wb.accent===c,action:()=>applyAccent(c)}));
 items.push(null);
 const d=document.createElement('div');/* custom handled below */
 items.push({label:T('customColor'),action:()=>{
  const inp=document.createElement('input');inp.type='color';inp.style.position='fixed';inp.style.left='-9999px';
  document.body.appendChild(inp);inp.value=wb.accent||'#217346';
  inp.addEventListener('input',()=>applyAccent(inp.value));
  inp.addEventListener('change',()=>{applyAccent(inp.value);inp.remove();});
  inp.click();}});
 items.push(null,{label:T('thmReset')+' — '+T('bAccent'),action:()=>{applyAccent('#217346');setStatusMode(T('thmReset'));}});
 popMenu(anchor,items);}

/* ---------- ribbon overflow: Excel's responsive affordance ---------- */
/* The command area scrolls, but its scrollbar is hidden to match Excel, so the
   chevron pair is the only way to reach commands that fall off a narrow window.
   It appears only when there is genuinely something hidden, and each button
   greys out once it reaches its end of the range. */
function syncRibbonOverflow(){
 const body=$('.rbody');if(!body)return;
 const over=body.scrollWidth>body.clientWidth+1;
 document.body.toggleAttribute('data-rboverflow',over);
 const prev=$('#rbPrev'),next=$('#rbNext');
 if(!prev||!next)return;
 prev.disabled=!over||body.scrollLeft<=1;
 next.disabled=!over||body.scrollLeft>=body.scrollWidth-body.clientWidth-1;}
function stepRibbon(dir){const body=$('.rbody');if(!body)return;
 /* A discrete step, like Excel's chevron: no animation, and clamped to the
    scroll range so a click at either end cannot leave the area half moved. */
 const max=Math.max(0,body.scrollWidth-body.clientWidth);
 const step=Math.max(160,Math.round(body.clientWidth*0.4));
 body.scrollLeft=Math.max(0,Math.min(max,body.scrollLeft+dir*step));
 syncRibbonOverflow();}
function initRibbonOverflow(){
 const prev=$('#rbPrev'),next=$('#rbNext');
 if(prev)prev.onclick=()=>stepRibbon(-1);
 if(next)next.onclick=()=>stepRibbon(1);
 addEventListener('resize',syncRibbonOverflow);
 const body=$('.rbody');
 if(body)body.addEventListener('scroll',syncRibbonOverflow,{passive:true});
 /* Re-measure whenever the tab changes, since each page is a different width. */
 document.addEventListener('click',e=>{if(e.target.closest('.rtab'))setTimeout(syncRibbonOverflow,30);},true);
 syncRibbonOverflow();}

function applyStyle(patch,rangeStr){snapshot();const q=rangeStr?rangeFromStr(rangeStr):rect();
 for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++){
  const ref=refOf(r,c);const cel=sheet().cells[ref]||{};
  cel.s=Object.assign({},cel.s||{},patch);sheet().cells[ref]=cel;}
 saveLS();renderAll();syncRibbon();}

/* ---------- Formula Auditing: trace precedents / dependents ---------- */
/* Reads the A1-style references out of a formula, expanding ranges. Text inside
   quoted string literals is skipped, so =CONCAT("A1") traces nothing. */
function refsInFormula(text){
  const src=String(text).replace(/"[^"]*"/g,'""');const out=[];const re=/\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?/g;
  let m;while((m=re.exec(src))){
   const a=m[0].replace(/\$/g,'');const parts=a.split(':');
   if(parts.length<2){out.push(a);continue;}
   const p=refToRC(parts[0]),q=refToRC(parts[1]);
   const r1=Math.min(p.r,q.r),r2=Math.max(p.r,q.r),c1=Math.min(p.c,q.c),c2=Math.max(p.c,q.c);
   if((r2-r1+1)*(c2-c1+1)>2000)continue;          /* refuse to outline a whole sheet */
   for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)out.push(refOf(r,c));}
  return out;}
function setTrace(refs){wb.trace=refs.length?{refs:refs}:undefined;renderAll();syncRibbon();}
function tracePrecedents(){const c=cell(active);
 if(!c||typeof c.raw!=='string'||c.raw[0]!=='='){setTrace([]);return;}
 setTrace(refsInFormula(c.raw));}
function traceDependents(){const out=[];const cs=sheet().cells;
 for(const ref in cs){const c=cs[ref];
  if(c&&typeof c.raw==='string'&&c.raw[0]==='='&&refsInFormula(c.raw).indexOf(active)>=0)out.push(ref);}
 setTrace(out);}
function removeTraces(){wb.trace=undefined;renderAll();syncRibbon();}
function toggleShowFormulas(){wb.showFormulas=!wb.showFormulas;saveLS();renderAll();syncRibbon();}
/* ---------- Alignment: indent and text orientation ---------- */
function bumpIndent(dir){const q=rect();const cur=Number(styleOf(refOf(q.r1,q.c1)).indent)||0;
 applyStyle({indent:Math.max(0,cur+dir)});}
function angleMenu(anchor){const cur=Number(styleOf(active).rot)||0;
 const mark=v=>v===cur?'\u2714 ':'';
 popMenu(anchor,[
  {head:T('orientAngle')},
  ...[0,45,-45,90,-90].map(v=>({label:mark(v)+(v===0?T('orientUp'):v+'\u00b0'),action:()=>applyStyle({rot:v})})),
  null,
  {label:mark(0)+T('orientClear'),action:()=>applyStyle({rot:0})}]);}
function undo(){if(!hist.length)return;fut.push(JSON.stringify(sheet().cells));sheet().cells=JSON.parse(hist.pop());renderAll();renderTabs();}
function redo(){if(!fut.length)return;hist.push(JSON.stringify(sheet().cells));sheet().cells=JSON.parse(fut.pop());renderAll();renderTabs();}
function moveSheet(i,dir){const j=i+dir;if(j<0||j>=wb.sheets.length)return;
 const s=wb.sheets.splice(i,1)[0];wb.sheets.splice(j,0,s);wb.cur=j;saveLS();renderAll();renderTabs();}
function renderTabs(){const t=$('#tabs');t.innerHTML='';
 const nav=(txt,title,fn)=>{const b=document.createElement('button');b.className='snav';b.textContent=txt;b.title=title;b.onclick=fn;t.appendChild(b);};
 const n=wb.sheets.length;
 nav('◀',T('prevSheet'),()=>switchSheet((wb.cur-1+n)%n));
 nav('▶',T('nextSheet'),()=>switchSheet((wb.cur+1)%n));
 wb.sheets.forEach((s,i)=>{const d=document.createElement('div');
  d.className='tab'+(i===wb.cur?' on':'');d.textContent=s.name;
  if(s.tabColor)d.style.boxShadow='inset 0 -3px 0 '+s.tabColor;
  d.onclick=()=>switchSheet(i);
  d.ondblclick=()=>{const n2=prompt(T('sheetName'),s.name);if(n2){s.name=n2;saveLS();renderTabs();}};
  d.oncontextmenu=ev=>{ev.preventDefault();popMenu(d,[
   {label:T('tabInsert'),action:addSheet},
   {label:T('tabDuplicate'),action:()=>{const cp=JSON.parse(JSON.stringify(s));cp.name=s.name+' (2)';wb.sheets.splice(i+1,0,cp);switchSheet(i+1);}},
   null,
   {label:T('tabRename'),action:()=>{const n2=prompt(T('sheetName'),s.name);if(n2){s.name=n2;saveLS();renderTabs();}}},
   {label:T('tabMoveL'),action:()=>moveSheet(i,-1)},
   {label:T('tabMoveR'),action:()=>moveSheet(i,1)},
   null,
   {label:T('tabColor'),action:()=>{const c=prompt(T('tabColor')+' (#217346)','#217346');if(c){s.tabColor=c;saveLS();renderTabs();}}},
   {label:T('tabDelete'),action:()=>{if(wb.sheets.length<2){alert(T('delSheet'));return;}
    if(confirm(T('delSheet'))){wb.sheets.splice(i,1);wb.cur=Math.max(0,i-1);hist=[];fut=[];active=selA=selB='A1';renderAll();renderTabs();}}}]);
  };
  if(i===wb.cur&&wb.sheets.length>1){const x=document.createElement('span');x.textContent=' ✕';x.style.color='#b00';x.title=T('delSheet');
   x.onclick=ev=>{ev.stopPropagation();if(confirm(T('delSheet'))){wb.sheets.splice(i,1);wb.cur=0;hist=[];fut=[];active=selA=selB='A1';renderAll();renderTabs();}};d.appendChild(x);}
  t.appendChild(d);});
 const add=document.createElement('button');add.className='addsheet';add.textContent='+';add.title=T('addSheet');add.onclick=addSheet;t.appendChild(add);}
function switchSheet(i){wb.cur=i;hist=[];fut=[];active=selA=selB='A1';renderAll();renderTabs();}
function addSheet(){wb.sheets.push({name:'Sheet'+(wb.sheets.length+1),cells:{}});switchSheet(wb.sheets.length-1);}

/* ================= CSV ================= */
function csvField(v){v=String(v);return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function exportCSV(){const cs=sheet().cells;let mR=0,mC=0;
 for(const ref in cs){const p=refToRC(ref);mR=Math.max(mR,p.r);mC=Math.max(mC,p.c);}
 const lines=[];for(let r=0;r<=mR;r++){const row=[];for(let c=0;c<=mC;c++)row.push(csvField(dispVal(refOf(r,c))));lines.push(row.join(','));}
 const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(sheet().name||'sheet')+'.csv';a.click();URL.revokeObjectURL(a.href);}
function parseCSV(text){const rows=[[]];let f='',q=false;
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(q){if(ch==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=ch;}
  else{if(ch==='"')q=true;else if(ch===','){rows[rows.length-1].push(f);f='';}
   else if(ch==='\n'){rows[rows.length-1].push(f);f='';rows.push([]);}
   else if(ch==='\r'){}else f+=ch;}}
 rows[rows.length-1].push(f);
 while(rows.length&&rows[rows.length-1].join('')==='')rows.pop();
 return rows;}
function importCSV(text){snapshot();const rows=parseCSV(text);sheet().cells={};
 rows.forEach((row,r)=>{if(r>=ROWS)return;row.forEach((v,c)=>{if(c>=COLS)return;
  if(v!=='')sheet().cells[refOf(r,c)]={raw:v};});});
 active=selA=selB='A1';renderAll();renderTabs();}

/* ================= ZIP writer (store only, no library) ================= */
const CRC_T=(()=>{const t=new Uint32Array(256);
 for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
function crc32(u8){let c=0xFFFFFFFF;for(let i=0;i<u8.length;i++)c=CRC_T[(c^u8[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function concatBytes(list){let tot=0;for(const u of list)tot+=u.length;
 const out=new Uint8Array(tot);let o=0;for(const u of list){out.set(u,o);o+=u.length;}return out;}
function zipBytes(files){
 const enc=new TextEncoder();const dt=new Date();
 const tm=((dt.getHours()<<11)|(dt.getMinutes()<<5)|(dt.getSeconds()>>1))&0xFFFF;
 const dte=(((dt.getFullYear()-1980)<<9)|((dt.getMonth()+1)<<5)|dt.getDate())&0xFFFF;
 const parts=[],central=[];let offset=0;
 files.forEach(f=>{
  const nb=enc.encode(f.name),data=f.data,crc=crc32(data);
  const lh=new Uint8Array(30+nb.length),dv=new DataView(lh.buffer);
  dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0,true);dv.setUint16(8,0,true);
  dv.setUint16(10,tm,true);dv.setUint16(12,dte,true);dv.setUint32(14,crc,true);
  dv.setUint32(18,data.length,true);dv.setUint32(22,data.length,true);
  dv.setUint16(26,nb.length,true);dv.setUint16(28,0,true);
  lh.set(nb,30);parts.push(lh,data);
  central.push({nb,crc,len:data.length,off:offset});
  offset+=lh.length+data.length;});
 const cd=[];let cdLen=0;
 central.forEach(c=>{
  const ch=new Uint8Array(46+c.nb.length),dv=new DataView(ch.buffer);
  dv.setUint32(0,0x02014b50,true);dv.setUint16(4,20,true);dv.setUint16(6,20,true);
  dv.setUint16(8,0,true);dv.setUint16(10,0,true);dv.setUint16(12,tm,true);dv.setUint16(14,dte,true);
  dv.setUint32(16,c.crc,true);dv.setUint32(20,c.len,true);dv.setUint32(24,c.len,true);
  dv.setUint16(28,c.nb.length,true);dv.setUint16(30,0,true);dv.setUint16(32,0,true);
  dv.setUint16(34,0,true);dv.setUint16(36,0,true);dv.setUint32(38,0,true);dv.setUint32(42,c.off,true);
  ch.set(c.nb,46);cd.push(ch);cdLen+=ch.length;});
 const eo=new Uint8Array(22),dv=new DataView(eo.buffer);
 dv.setUint32(0,0x06054b50,true);dv.setUint16(4,0,true);dv.setUint16(6,0,true);
 dv.setUint16(8,files.length,true);dv.setUint16(10,files.length,true);
 dv.setUint32(12,cdLen,true);dv.setUint32(16,offset,true);dv.setUint16(20,0,true);
 return concatBytes(parts.concat(cd,[eo]));}
function download(bytes,name,mime){const blob=new Blob([bytes],{type:mime||'application/octet-stream'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
 document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);}

function shiftRefs(raw,kind,at){
 if(typeof raw!=='string'||raw[0]!=='=')return raw;
 const isRow=kind==='ri'||kind==='rd',ins=kind==='ri'||kind==='ci',M='\u0001';
 const A=at+1; /* formula rows are 1-based */
 const okC=i=>i>=0&&i<COLS, okR=r=>r>=1&&r<=ROWS;
 let out=raw.replace(/([A-Z]{1,2})(\d{1,4})\s*:\s*([A-Z]{1,2})(\d{1,4})/g,(m,c1,r1,c2,r2)=>{
  let a=M+c1+r1,b=M+c2+r2;
  if(isRow){let s1=+r1,s2=+r2;
   if(ins){if(s1>=A&&okR(s1+1))a=M+c1+(s1+1);if(s2>=A&&okR(s2+1))b=M+c2+(s2+1);}
   else{if(s1>A)a=M+c1+(s1-1);if(s2>=A)b=M+c2+(s2-1);}}
  else{let i1=colIndex(c1),i2=colIndex(c2);
   if(ins){if(i1>=at&&okC(i1+1))a=M+colName(i1+1)+r1;if(i2>=at&&okC(i2+1))b=M+colName(i2+1)+r2;}
   else{if(i1>at)a=M+colName(i1-1)+r1;if(i2>=at)b=M+colName(i2-1)+r2;}}
  return a+':'+b;});
 out=out.replace(/(?<![\u0001A-Z0-9])([A-Z]{1,2})(\d{1,4})(?![A-Z0-9:])/g,(m,c1,r1)=>{
  if(isRow){const s1=+r1;
   if(ins)return M+c1+(s1>=A&&okR(s1+1)?s1+1:s1);
   if(s1===A)return'#REF!';
   return M+c1+(s1>A?s1-1:s1);}
  const i1=colIndex(c1);
  if(ins)return M+colName(i1>=at&&okC(i1+1)?i1+1:i1)+r1;
  if(i1===at)return'#REF!';
  return M+colName(i1>at?i1-1:i1)+r1;});
 return out.split(M).join('');}
function shiftAllFormulas(kind,at){const cs=sheet().cells;
 for(const ref in cs){const c=cs[ref];if(c.raw!=null)c.raw=shiftRefs(c.raw,kind,at);}}

/* ================= features: resize, insert/delete, find, chart ================= */
function applyColW(){grid.querySelectorAll('colgroup col[data-c]').forEach((col,i)=>{col.style.width=colW[i]+'px';});}
function initGridExtras(){
 grid.addEventListener('mousedown',e=>{
  const h=e.target.closest('.rsh');if(!h)return;e.preventDefault();e.stopPropagation();
  const c=+h.dataset.c,sx=e.clientX,sw=colW[c];
  const mv=ev=>{colW[c]=clamp(sw+ev.clientX-sx,40,420);applyColW();};
  const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);saveLS();};
  document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);});
 grid.addEventListener('dblclick',e=>{
  const h=e.target.closest('.rsh');if(!h)return;
  const c=+h.dataset.c;let mx=0;
  for(let r=0;r<ROWS;r++){const cel=cell(refOf(r,c));
   if(cel&&cel.raw!=null&&cel.raw!==''){const len=String(dispVal(refOf(r,c))).length;if(len>mx)mx=len;}}
  colW[c]=clamp(16+mx*8,40,420);applyColW();saveLS();});}
function insertRow(at){snapshot();const cs=sheet().cells,nc={};
 for(const ref in cs){const p=refToRC(ref);const nr=p.r>=at?p.r+1:p.r;if(nr>=ROWS)continue;nc[refOf(nr,p.c)]=cs[ref];}
 sheet().cells=nc;shiftAllFormulas('ri',at);saveLS();renderAll();}
function deleteRow(at){snapshot();const cs=sheet().cells,nc={};
 for(const ref in cs){const p=refToRC(ref);if(p.r===at)continue;nc[refOf(p.r>at?p.r-1:p.r,p.c)]=cs[ref];}
 sheet().cells=nc;shiftAllFormulas('rd',at);saveLS();renderAll();}
function insertCol(at){snapshot();const cs=sheet().cells,nc={};
 for(const ref in cs){const p=refToRC(ref);const nc2=p.c>=at?p.c+1:p.c;if(nc2>=COLS)continue;nc[refOf(p.r,nc2)]=cs[ref];}
 sheet().cells=nc;shiftAllFormulas('ci',at);saveLS();renderAll();}
function deleteCol(at){snapshot();const cs=sheet().cells,nc={};
 for(const ref in cs){const p=refToRC(ref);if(p.c===at)continue;nc[refOf(p.r,p.c>at?p.c-1:p.c)]=cs[ref];}
 sheet().cells=nc;shiftAllFormulas('cd',at);saveLS();renderAll();}
function openCtx(e,ref){const menu=$('#ctxMenu');const p=refToRC(ref);menu.innerHTML='';
 [[T('ctxRowAbove'),()=>insertRow(p.r)],[T('ctxRowBelow'),()=>insertRow(p.r+1)],[T('ctxDelRow'),()=>deleteRow(p.r)],null,
  [T('ctxColLeft'),()=>insertCol(p.c)],[T('ctxColRight'),()=>insertCol(p.c+1)],[T('ctxDelCol'),()=>deleteCol(p.c)]
 ].forEach(it=>{if(!it){menu.appendChild(document.createElement('hr'));return;}
  const d=document.createElement('div');d.textContent=it[0];
  d.onclick=()=>{menu.classList.remove('open');it[1]();};menu.appendChild(d);});
  menu.classList.add('open');
  placeFloating(menu,null,{point:{x:e.clientX,y:e.clientY}});
 active=ref;selA=selB=ref;renderAll();}

function findNext(needle){if(!needle){$('#fStat').textContent=T('fType');return;}
 const low=needle.toLowerCase();const start=refToRC(active);
 for(let i=1;i<=ROWS*COLS;i++){
  const r=(start.r+Math.floor((start.c+i)/COLS))%ROWS;
  const c2=(start.c+i)%COLS;
  const ref=refOf(r,c2);const cel=cell(ref);
  if(cel&&cel.raw!=null&&String(cel.raw).toLowerCase().includes(low)){
   active=ref;selA=selB=ref;renderAll();
   const td=tdOf(ref);if(td)td.scrollIntoView({block:'center',inline:'center'});
   $('#fStat').textContent=T('foundAt')+' '+ref;return;}}
 $('#fStat').textContent=T('notFound');}
function replaceOne(needle,rep){const cel=cell(active);
 if(cel&&cel.raw!=null&&needle&&String(cel.raw).toLowerCase().includes(needle.toLowerCase())){
  const s=String(cel.raw);const idx=s.toLowerCase().indexOf(needle.toLowerCase());
  setRaw(active,s.slice(0,idx)+rep+s.slice(idx+needle.length));}
 findNext(needle);}
function replaceAllIn(needle,rep){if(!needle)return 0;
 snapshot();let n=0;const cs=sheet().cells;const low=needle.toLowerCase();
 for(const ref in cs){const c=cs[ref];if(c.raw==null)continue;
  const s=String(c.raw);const sl=s.toLowerCase();
  if(sl.includes(low)){let out='',i=0;
   while(true){const j=sl.indexOf(low,i);if(j<0){out+=s.slice(i);break;}out+=s.slice(i,j)+rep;i=j+needle.length;n++;}
  c.raw=out;}}
 saveLS();renderAll();return n;}
function chartData(){const q=rect();const labels=[],arr=[];
 if(q.c2>q.c1){
  for(let r=q.r1;r<=q.r2;r++){const v=vals[refOf(r,q.c2)];
   if(typeof v==='number'&&isFinite(v)){const lb=dispVal(refOf(r,q.c1));labels.push(lb||refOf(r,q.c1));arr.push(v);}}}
 else{for(let r=q.r1;r<=q.r2;r++){const v=vals[refOf(r,q.c1)];
  if(typeof v==='number'&&isFinite(v)){labels.push(refOf(r,q.c1));arr.push(v);}}}
 return arr.length?{labels:labels.slice(0,50),vals:arr.slice(0,50)}:null;}

function drawChart(){const d=chartData();const cv=$('#chartCv');
 if(!d){$('#chartTitle').textContent=T('noData');return;}
 $('#chartTitle').textContent='📊 '+T('chartTitle');
 const ctx=cv.getContext('2d');if(!ctx)return;
 const W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
 const pad=44,max=Math.max(...d.vals,0.000001);
 if(chartType==='pie'){
  let ang=-Math.PI/2;const cx=W/2-60,cy=H/2,r=Math.min(W,H)/2-30;
  const tot=d.vals.reduce((a,b)=>a+b,0)||1;
  d.vals.forEach((v,i)=>{const a2=ang+(v/tot)*Math.PI*2;
   ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,ang,a2);ctx.closePath();
   ctx.fillStyle=PAL[i%PAL.length];ctx.fill();ang=a2;});
  d.labels.forEach((lb,i)=>{ctx.fillStyle=PAL[i%PAL.length];ctx.fillRect(W-150,20+i*16,10,10);
   ctx.fillStyle='#333';ctx.font='11px sans-serif';ctx.textAlign='left';
   ctx.fillText(String(lb).slice(0,14),W-134,29+i*16);});
 }else{
  const iw=(W-pad*2)/d.vals.length;
  ctx.strokeStyle='#bbb';ctx.beginPath();ctx.moveTo(pad,H-pad);ctx.lineTo(W-pad,H-pad);ctx.stroke();
  if(chartType==='line'){ctx.beginPath();ctx.strokeStyle='#217346';ctx.lineWidth=2;}
  if(chartType==='area'){ctx.beginPath();ctx.moveTo(pad+iw/2,H-pad);}
  d.vals.forEach((v,i)=>{const h2=(v/max)*(H-pad*2);const x=pad+i*iw;
   if(chartType==='bar'){ctx.fillStyle=PAL[i%PAL.length];ctx.fillRect(x+2,H-pad-h2,Math.max(iw-4,2),h2);}
   else if(chartType==='scatter'){ctx.beginPath();ctx.fillStyle='#217346';
    ctx.arc(x+iw/2,H-pad-h2,3,0,Math.PI*2);ctx.fill();}
   else{const px=x+iw/2,py=H-pad-h2;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}
   const step=Math.max(1,Math.ceil(d.vals.length/10));
   if(i%step===0){ctx.fillStyle='#666';ctx.font='10px sans-serif';ctx.textAlign='center';
    ctx.fillText(String(d.labels[i]).slice(0,8),x+iw/2,H-10);}});
  if(chartType==='area'){ctx.lineTo(W-pad-iw/2,H-pad);ctx.closePath();
   ctx.fillStyle='rgba(33,115,70,.18)';ctx.fill();
   ctx.beginPath();ctx.strokeStyle='#217346';ctx.lineWidth=2;
   d.vals.forEach((v,i)=>{const px=pad+i*iw+iw/2,py=H-pad-(v/max)*(H-pad*2);
    if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);});ctx.stroke();}
  if(chartType==='line')ctx.stroke();
  ctx.fillStyle='#666';ctx.font='10px sans-serif';ctx.textAlign='right';
  ctx.fillText(String(+max.toFixed(2)),pad-4,pad+4);}}
function initExtras(){
 $('#bChart').onclick=()=>{$('#chartDlg').classList.toggle('open');drawChart();};
 $('#chartClose').onclick=()=>$('#chartDlg').classList.remove('open');
 document.querySelectorAll('#chartTypes button').forEach(b=>b.onclick=()=>{
  chartType=b.dataset.ct;document.querySelectorAll('#chartTypes button').forEach(x=>x.classList.toggle('on',x===b));drawChart();});
 $('#bFind').onclick=()=>{$('#findDlg').classList.toggle('open');$('#findTxt').focus();};
 $('#fClose').onclick=()=>$('#findDlg').classList.remove('open');
 $('#fNext').onclick=()=>findNext($('#findTxt').value);
 $('#fRepl').onclick=()=>replaceOne($('#findTxt').value,$('#replTxt').value);
 $('#fAll').onclick=()=>{const n=replaceAllIn($('#findTxt').value,$('#replTxt').value);
  $('#fStat').textContent=T('replCount').replace('{n}',n);};
 [$('#findTxt'),$('#replTxt')].forEach(inp=>{
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();findNext($('#findTxt').value);}
   if(e.key==='Escape')$('#findDlg').classList.remove('open');});});
 grid.addEventListener('contextmenu',e=>{const td=e.target.closest('td');
  if(!td)return;e.preventDefault();openCtx(e,td.dataset.ref);});
 document.addEventListener('click',e=>{if(!e.target.closest('#ctxMenu'))$('#ctxMenu').classList.remove('open');});
 initGridExtras();initFillHandle();}

/* ================= Excel fill handle (auto-fill / series) ================= */
let fillDrag=null,fillPrev=null;
function cellBox(ref){const td=tdOf(ref);const w=$('#gridwrap');if(!td||!w)return null;
 const a=td.getBoundingClientRect(),b=w.getBoundingClientRect();
 return{x:a.left-b.left+w.scrollLeft,y:a.top-b.top+w.scrollTop,w:a.width,h:a.height};}
function positionFillHandle(){const fh=$('#fh');if(!fh)return;
 if(editing||fillDrag){fh.classList.remove('on');return;}
 const q=rect();const b=cellBox(refOf(q.r2,q.c2));if(!b){fh.classList.remove('on');return;}
 fh.style.left=(b.x+b.w-4)+'px';fh.style.top=(b.y+b.h-4)+'px';fh.classList.add('on');}
function positionFillPrev(){const fp=$('#fp');if(!fp)return;
 if(!fillPrev){fp.style.display='none';return;}
 const a=cellBox(refOf(fillPrev.r1,fillPrev.c1)),b=cellBox(refOf(fillPrev.r2,fillPrev.c2));
 if(!a||!b){fp.style.display='none';return;}
 fp.style.display='block';
 fp.style.left=a.x+'px';fp.style.top=a.y+'px';
 fp.style.width=(b.x+b.w-a.x)+'px';fp.style.height=(b.y+b.h-a.y)+'px';}
/* --- value series detection (Excel-like) --- */
function numOrNull(v){if(typeof v==='number'&&isFinite(v))return v;
 if(typeof v==='string'){const s=v.trim();if(s!==''&&/^-?\d+(\.\d+)?$/.test(s))return parseFloat(s);}
 return null;}
function seriesFor(raws){const n=raws.length;const nums=raws.map(numOrNull);
 if(nums.every(v=>v!==null)){
  if(n===1)return{next:()=>nums[0]};
  let constStep=true;const d=nums[1]-nums[0];
  for(let i=2;i<n;i++)if(Math.abs((nums[i]-nums[i-1])-d)>1e-9){constStep=false;break;}
  const step=constStep?d:(nums[n-1]-nums[0])/(n-1);
  return{next:i=>+(nums[i>0?n-1:0]+step*i).toFixed(10)};
 }
 const tx=raws.map(v=>{const m=String(v).match(/^(.*?)(\d+)$/);return m?{p:m[1],n:+m[2],len:m[2].length}:null;});
 if(tx.every(x=>x!==null)&&tx.every(x=>x.p===tx[0].p)){
  const step=n>1?(tx[n-1].n-tx[0].n)/(n-1):1;
  return{next:i=>tx[0].p+String(Math.round(tx[i>0?n-1:0].n+step*i)).padStart(tx[0].len,'0')};
 }
 return{next:i=>{const v=raws[i>0?((i-1)%n):(((i%n)+n)%n)];return v==null?'':String(v);},repeat:true};}
/* --- relative-reference shifting for dragged formulas --- */
function shiftFormula(f,dRow,dCol){const s=String(f);let out='',last=0;const re=/\$?[A-Za-z]{1,3}\$?\d{1,7}/g;let m;
 while((m=re.exec(s))!==null){const tok=m[0],i=m.index;
  const before=i>0?s[i-1]:'',after=s[i+tok.length]||'';
  if(/[A-Za-z0-9_$.!]/.test(before)||/[(A-Za-z0-9_]/.test(after))continue;
  const mm=tok.match(/^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/);if(!mm)continue;
  const cA=mm[1],col=mm[2],cB=mm[3];let ci=0,ri=+mm[4]-1;
  for(const ch of col.toUpperCase())ci=ci*26+(ch.charCodeAt(0)-64);
  ci--;
  if(!cA)ci+=dCol;if(!cB)ri+=dRow;
  if(ci<0||ri<0)continue;
  out+=s.slice(last,i)+cA+colName(ci)+cB+(ri+1);last=i+tok.length;}
 return out+s.slice(last);}
function filledWrite(cs,ref,raw,sStyle,mode){const c=cs[ref]||{};
 if(mode!=='fmt'){if(raw===''||raw==null)delete c.raw;else c.raw=String(raw);}
 if(mode!=='nofmt'){if(sStyle&&Object.keys(sStyle).length){const cp=Object.assign({},sStyle);delete cp.note;c.s=cp;}else delete c.s;}
 if(c.raw===undefined&&!c.s)delete cs[ref];else cs[ref]=c;}
function applyFill(q,t,mode){if(gateEdit())return;snapshot();
 const cs=sheet().cells;
 const vertH=((t.r2>q.r2)||(t.r1<q.r1))?((t.r2-t.r1)+(q.r2-q.r1)):0;
 const horzH=((t.c2>q.c2)||(t.c1<q.c1))?((t.c2-t.c1)+(q.c2-q.c1)):0;
 if(!vertH&&!horzH)return;
 if(vertH>=horzH){
  const dn=t.r2>q.r2;
  const a0=dn?q.r2+1:t.r1,a1=dn?t.r2:q.r1-1;
  for(let c=q.c1;c<=q.c2;c++){
   const raws=[],sts=[];
   for(let r=q.r1;r<=q.r2;r++){raws.push(rawOf(refOf(r,c)));sts.push(styleOf(refOf(r,c)));}
   const ser=seriesFor(raws);const n2=raws.length;
   for(let r=a0;r<=a1;r++){
    const off=dn?(r-q.r2):(r-q.r1);
    const si=off>0?((off-1)%n2):((((off%n2)+n2)%n2));
    const sr=raws[si];
    const val=(mode==='copy')?((sr==null)?'':String(sr)):((typeof sr==='string'&&sr[0]==='=')?shiftFormula(sr,r-(q.r1+si),0):ser.next(off));
    filledWrite(cs,refOf(r,c),val,sts[si],mode);}
  }
 }else{
  const rt=t.c2>q.c2;
  const a0=rt?q.c2+1:t.c1,a1=rt?t.c2:q.c1-1;
  for(let r=q.r1;r<=q.r2;r++){
   const raws=[],sts=[];
   for(let c=q.c1;c<=q.c2;c++){raws.push(rawOf(refOf(r,c)));sts.push(styleOf(refOf(r,c)));}
   const ser=seriesFor(raws);const n2=raws.length;
   for(let c=a0;c<=a1;c++){
    const off=rt?(c-q.c2):(c-q.c1);
    const si=off>0?((off-1)%n2):((((off%n2)+n2)%n2));
    const sr=raws[si];
    const val=(mode==='copy')?((sr==null)?'':String(sr)):((typeof sr==='string'&&sr[0]==='=')?shiftFormula(sr,0,c-(q.c1+si)):ser.next(off));
    filledWrite(cs,refOf(r,c),val,sts[si],mode);}
  }
 }
 saveLS();}
function initFillHandle(){const wrap=$('#gridwrap');if(!wrap)return;
 let fh=$('#fh');
 if(!fh){fh=document.createElement('div');fh.id='fh';fh.title=T('fillHandle');wrap.appendChild(fh);}
 let fp=$('#fp');
 if(!fp){fp=document.createElement('div');fp.id='fp';wrap.appendChild(fp);}
 fh.addEventListener('mousedown',e=>{
  if(editing)return;
  if(e.button!==0&&e.button!==2)return;
  if(gateEdit())return;
  e.preventDefault();e.stopPropagation();
  fillDrag={q:rect(),right:e.button===2};fillPrev=null;positionFillPrev();positionFillHandle();
  fh.style.pointerEvents='none';if(e.button===0)document.body.style.cursor='crosshair';});
 fh.addEventListener('contextmenu',e=>e.preventDefault());
 fh.addEventListener('dblclick',e=>{
  if(editing||gateEdit())return;
  e.preventDefault();e.stopPropagation();
  const q=rect(),t2=fillExtent(q);
  if(t2){applyFill(q,t2);selA=refOf(t2.r1,t2.c1);selB=refOf(t2.r2,t2.c2);
   active=refOf(t2.r2,t2.c2);renderAll();setStatusMode(T('fillDone'));}});
 document.addEventListener('mousemove',e=>{if(!fillDrag)return;
  const el=document.elementFromPoint(e.clientX,e.clientY);
  const td=el&&el.closest?el.closest('td'):null;
  if(!td||!td.dataset||!td.dataset.ref)return;
  const p=refToRC(td.dataset.ref),q=fillDrag.q;
  const dR=p.r>q.r2?p.r-q.r2:(p.r<q.r1?q.r1-p.r:0);
  const dC=p.c>q.c2?p.c-q.c2:(p.c<q.c1?q.c1-p.c:0);
  if(!dR&&!dC){fillPrev=null;positionFillPrev();return;}
  const t2={r1:q.r1,r2:q.r2,c1:q.c1,c2:q.c2};
  if(dR>=dC){if(p.r>q.r2)t2.r2=p.r;else t2.r1=p.r;}
  else{if(p.c>q.c2)t2.c2=p.c;else t2.c1=p.c;}
  fillPrev=t2;positionFillPrev();});
 document.addEventListener('mouseup',()=>{if(!fillDrag)return;
  const q=fillDrag.q,t2=fillPrev,wasRight=fillDrag.right;
  fillDrag=null;fillPrev=null;document.body.style.cursor='';
  fh.style.pointerEvents='';
  if(t2&&wasRight){fillHandleMenu(fh,q,t2);positionFillPrev();}
  else if(t2){applyFill(q,t2);selA=refOf(t2.r1,t2.c1);selB=refOf(t2.r2,t2.c2);
   active=refOf(t2.r2,t2.c2);renderAll();setStatusMode(T('fillDone'));}
  else{positionFillPrev();positionFillHandle();}});}
/* ================= extended Excel function library ================= */
function serial(d){return Math.floor(d.getTime()/86400000)+25569;}
function fromSerial(n){return new Date(Math.round((n-25569)*86400000));}
function dstr(n){const d=fromSerial(n);if(isNaN(d.getTime()))return'';const p=x=>String(x).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}
Object.assign(FN,{
 INT:v=>Math.floor(num(v)),
 MOD:(a,b)=>{const x=num(b);return x===0?'#DIV/0!':num(a)-x*Math.floor(num(a)/x);},
 CEILING:(a,s)=>{const g=Math.abs(num(s)||1);return Math.ceil(num(a)/g)*g;},
 FLOOR:(a,s)=>{const g=Math.abs(num(s)||1);return Math.floor(num(a)/g)*g;},
 ROUNDUP:(v,d)=>{const m=Math.pow(10,d||0);return Math.ceil(num(v)*m)/m;},
 ROUNDDOWN:(v,d)=>{const m=Math.pow(10,d||0);return Math.floor(num(v)*m)/m;},
 EXP:v=>Math.exp(num(v)),
 LN:v=>{const n=num(v);return n<=0?'#NUM!':Math.log(n);},
 LOG:(v,b)=>{const n=num(v);return n<=0?'#NUM!':Math.log(n)/Math.log(b===undefined?10:num(b));},
 SIGN:v=>Math.sign(num(v)),
 TRUNC:(v,d)=>{const m=Math.pow(10,d||0);return Math.trunc(num(v)*m)/m;},
 RAND:()=>Math.random(),
 RANDBETWEEN:(a,b)=>Math.floor(Math.random()*(num(b)-num(a)+1))+num(a),
 SUBTOTAL:(code,...a)=>{const f=nums(a),c=num(code);
  switch(c){case 1:return f.length?f.reduce((x,y)=>x+y,0)/f.length:0;
   case 2:case 3:return f.length;case 4:return f.length?Math.max(...f):0;
   case 5:return f.length?Math.min(...f):0;case 6:return f.reduce((p,v)=>p*v,1);
   default:return f.reduce((x,y)=>x+y,0);}},
 COUNTIFS:(...a)=>{let n=0;const groups=[];
  for(let i=0;i+1<a.length;i+=2)groups.push([flat([a[i]]),a[i+1]]);
  if(!groups.length)return 0;const len=groups[0][0].length;
  for(let i=0;i<len;i++){let all=true;
   for(const g of groups){if(!matchCrit(g[0][i],typeof g[1]==='string'?g[1]:toStr(g[1]))){all=false;break;}}
   if(all)n++;}
  return n;},
 COUNTBLANK:rng=>flat([rng]).filter(v=>v===''||v==null).length,
 MODE:(...a)=>{const f=nums(a),cnt={};let best=null,bn=0;
  f.forEach(v=>{cnt[v]=(cnt[v]||0)+1;if(cnt[v]>bn){bn=cnt[v];best=v;}});
  return best===null?'#N/A':best;},
 STDEV:(...a)=>{const f=nums(a);if(f.length<2)return'#DIV/0!';const m2=f.reduce((x,y)=>x+y,0)/f.length;
  return Math.sqrt(f.reduce((s,v)=>s+(v-m2)*(v-m2),0)/(f.length-1));},
 VAR:(...a)=>{const f=nums(a);if(f.length<2)return'#DIV/0!';const m2=f.reduce((x,y)=>x+y,0)/f.length;
  return f.reduce((s,v)=>s+(v-m2)*(v-m2),0)/(f.length-1);},
 LARGE:(rng,k)=>{const f=nums([rng]).sort((x,y)=>y-x);const i=num(k)-1;return f[i]===undefined?'#NUM!':f[i];},
 SMALL:(rng,k)=>{const f=nums([rng]).sort((x,y)=>x-y);const i=num(k)-1;return f[i]===undefined?'#NUM!':f[i];},
 RANK:(v,rng,ord)=>{const f=nums([rng]);const x=num(v);f.sort((a,b)=>ord? a-b : b-a);
  const i=f.indexOf(x);return i<0?'#N/A':i+1;},
 PERCENTILE:(rng,p)=>{const f=nums([rng]).sort((x,y)=>x-y);if(!f.length)return'#NUM!';
  const k=(f.length-1)*num(p),lo=Math.floor(k),hi=Math.ceil(k);
  return f[lo]+(f[hi]-f[lo])*(k-lo);}
});
function dataRange(){const cs=sheet().cells;let mR=-1,mC=-1;
 for(const ref in cs){const p=refToRC(ref);if(p.r>mR)mR=p.r;if(p.c>mC)mC=p.c;}
 return{r1:0,r2:Math.max(0,mR),c1:0,c2:Math.max(0,mC)};}
function sortRange(q,keyCol,desc){snapshot();const k=keyCol-q.c1;const rows=[];
 for(let r=q.r1;r<=q.r2;r++){const row=[];for(let c=q.c1;c<=q.c2;c++)row.push(sheet().cells[refOf(r,c)]||null);rows.push(row);}
 rows.sort((a,b)=>{const x=a[k]&&a[k].raw!=null?String(a[k].raw):'',y=b[k]&&b[k].raw!=null?String(b[k].raw):'';
  const nx=parseFloat(x),ny=parseFloat(y);let cmp;
  if(x===''&&y==='')cmp=0;else if(x==='')cmp=1;else if(y==='')cmp=-1;
  else if(!isNaN(nx)&&!isNaN(ny)&&String(nx)===x.trim()&&String(ny)===y.trim())cmp=nx-ny;
  else cmp=x.localeCompare(y,'hi');
  return desc?-cmp:cmp;});
 rows.forEach((row,i)=>row.forEach((cel,j)=>{const ref=refOf(q.r1+i,q.c1+j);
  if(cel)sheet().cells[ref]=cel;else delete sheet().cells[ref];}));
 saveLS();renderAll();}
function sortAz(desc){const q=rect();const rg=(q.r1===q.r2&&q.c1===q.c2)?dataRange():q;
 if(rg.r2-rg.r1<1){alert(T('needRows'));return;}
 sortRange(rg,rg.c1,desc);}
function toggleFilter(){const s=sheet();
 if(s.filterRange){delete s.filterRange;delete s.filters;delete s.hiddenRows;saveLS();renderAll();return;}
 let rg=rect();if(rg.r1===rg.r2&&rg.c1===rg.c2)rg=dataRange();
 if(rg.r2-rg.r1<1){alert(T('needRows'));return;}
 s.filterRange={r:rg.r1,c1:rg.c1,c2:rg.c2};s.filters={};s.hiddenRows=[];saveLS();renderAll();}
function filterValues(colKey){const s=sheet();const fr=s.filterRange;const set=[];
 for(let r=fr.r+1;r<=fr.r2;r++){const cel=s.cells[refOf(r,colKey)];const v=cel&&cel.raw!=null?String(cel.raw):'';if(set.indexOf(v)<0)set.push(v);}
 return set.slice(0,40);}
function applyFilters(){const s=sheet(),fr=s.filterRange;
 if(!fr){s.hiddenRows=[];return;}
 const hid=[],rows=grid.tBodies&&grid.tBodies[0]?grid.tBodies[0].rows:[];
 for(let r=fr.r+1;r<=fr.r2;r++){let hide=false;
  for(const k in(s.filters||{})){const f=s.filters[k];if(!f||!f.values)continue;
   const cel=s.cells[refOf(r,+k)];const v=cel&&cel.raw!=null?String(cel.raw):'';
   if(f.values.indexOf(v)<0){hide=true;break;}}
  if(hide)hid.push(r);
  const tr=rows[r];if(tr)tr.style.display=hide?'none':'';}
 s.hiddenRows=hid;}
function colFilterMenu(anchor,colKey,recur){const s=sheet();const fr=s.filterRange;if(!fr)return;
 const vals=filterValues(colKey);const f=s.filters[colKey];const sel=f&&f.values?f.values:vals;
 const items=[{label:T('sortAz'),action:()=>sortRange(fr,colKey,false)},
  {label:T('sortZa'),action:()=>sortRange(fr,colKey,true)},
  {label:T('clearColFilter'),action:()=>{if(s.filters[colKey])delete s.filters[colKey];applyFilters();saveLS();renderAll();}},
  null,{head:T('filterBy')}];
 vals.forEach(v=>{const on=sel.indexOf(v)>=0;
  items.push({label:(on?'☑ ':'☐ ')+(v===''?T('blanks'):String(v).slice(0,26)),on,
   action:()=>{const cur=sel.slice();const i=cur.indexOf(v);if(i>=0)cur.splice(i,1);else cur.push(v);
    s.filters[colKey]={values:cur};applyFilters();saveLS();renderAll();colFilterMenu(anchor,colKey,true);}});});
 popMenu(anchor,items);}
function removeDups(){const q=rect();const rg=(q.r1===q.r2&&q.c1===q.c2)?dataRange():q;
 const before=countCells(rg);snapshot();const seen={};let removed=0;
 for(let r=rg.r1;r<=rg.r2;r++){const key=[];for(let c=rg.c1;c<=rg.c2;c++){const cel=sheet().cells[refOf(r,c)];key.push(cel&&cel.raw!=null?String(cel.raw):'');}
  const k=key.join('\u0001');
  if(seen[k]){removed++;for(let c=rg.c1;c<=rg.c2;c++)delete sheet().cells[refOf(r,c)];}else seen[k]=1;}
 saveLS();renderAll();alert(T('dupsRemoved').replace('{n}',removed));}
function countCells(rg){let n=0;for(let r=rg.r1;r<=rg.r2;r++)for(let c=rg.c1;c<=rg.c2;c++){const cel=sheet().cells[refOf(r,c)];if(cel&&cel.raw!=null&&cel.raw!=='')n++;}return n;}
function textToCols(){const q=rect();snapshot();
 for(let r=q.r1;r<=q.r2;r++){const cel=sheet().cells[refOf(r,q.c1)];if(!cel||cel.raw==null)continue;
  const parts=String(cel.raw).split(',');if(parts.length<2)continue;
  cel.raw=parts[0].trim();
  for(let i=1;i<parts.length;i++){const nc=q.c1+i;if(nc>=COLS)break;
   const t=sheet().cells[refOf(r,nc)]||{};t.raw=parts[i].trim();sheet().cells[refOf(r,nc)]=t;}}
 saveLS();renderAll();}
function subtotalSel(){const q=rect();const rg=(q.r1===q.r2&&q.c1===q.c2)?dataRange():q;
 const row=Math.min(rg.r2+1,ROWS-1);const s=sheet();snapshot();
 for(let c=rg.c1;c<=rg.c2;c++){let hasNum=false;
  for(let r=rg.r1;r<=rg.r2;r++){const v=s.cells[refOf(r,c)];if(!v||v.raw==null)continue;
   const n=Number(String(v.raw).replace(/,/g,''));if(String(v.raw).trim()!==''&&!isNaN(n)){hasNum=true;break;}}
  const cel=s.cells[refOf(row,c)]||{};
  cel.raw=hasNum?('=SUBTOTAL(9,'+refOf(rg.r1,c)+':'+refOf(rg.r2,c)+')'):T('total');
  cel.s=Object.assign({},cel.s||{},{b:true});
  s.cells[refOf(row,c)]=cel;}
 saveLS();renderAll();}
function countNonEmptySel(){const q=rect();alert(T('fCnt')+' '+countCells(q));}


/* ================= Excel-like ribbon init (controls + shortcuts) ================= */
function freezeMenu(anchor){const p=refToRC(active);popMenu(anchor,[
 {head:T('gFreeze')},
 {label:T('freezeTop'),action:()=>{sheet().freeze={r:p.r+1,c:0};saveLS();renderAll();syncRibbon();}},
 {label:T('freezeFirst'),action:()=>{sheet().freeze={r:0,c:p.c+1};saveLS();renderAll();syncRibbon();}},
 {label:T('freezeCell')+' ('+active+')',action:()=>{sheet().freeze={r:p.r+1,c:p.c+1};saveLS();renderAll();syncRibbon();}},
 null,
 {label:T('freezeOff'),action:()=>{delete sheet().freeze;saveLS();renderAll();syncRibbon();}}]);}
function sortMenu(anchor){const q=rect();const cols=[];
 for(let c=q.c1;c<=q.c2;c++){const lb=dispVal(refOf(q.r1,c))||refOf(q.r1,c);cols.push({c,lb});}
 popMenu(anchor,[
  {head:T('sortCol')},
  ...cols.map(k2=>({label:'⇅ '+k2.lb+' ('+colName(k2.c)+')',action:()=>sortRange(q,k2.c,false)})),
  null,
  {label:'⇅ '+T('sortDesc'),action:()=>sortRange(q,cols[0]?cols[0].c:q.c1,true)}]);}
function autoSumMenu(anchor){popMenu(anchor,['SUM','AVERAGE','COUNT','MIN','MAX'].map(fn=>({label:'Σ '+fn,
 action:()=>{const r=autoSumText();if(!r)return;snapshot();active=r.target;selA=selB=r.target;
  setRawNoSnap(r.target,'='+fn+'('+r.rng+')');renderAll();}})));}
const FNTS=['Calibri','Arial','Times New Roman','Segoe UI','Tahoma','Verdana','Courier New','Georgia','Trebuchet MS','Impact','Comic Sans MS'];
const FSZ=[8,9,10,11,12,14,16,18,20,24,28,32,36,48];
/* Points -> CSS pixels at 96 DPI, and Excel's own default workbook size (11pt). */
const PT=96/72,FS_DEFAULT=11;
/* ---------- floating menu placement ----------
   One rule for every menu in the app. Measure the real box, keep it inside the
   window with a single gutter, and flip it to the other side of the anchor when
   there is no room. Re-placed on resize so an open menu cannot be left stranded
   off-screen. This replaces two hand-rolled positioners: popMenu clamped with
   mismatched 4px/6px margins, and openCtx guessed the menu's size from
   innerWidth-200 / innerHeight-230, which pushed it off a short window. */
const POP_EDGE=8;
function placeFloating(el,anchor,opts){
 opts=opts||{};
 if(!el)return;
 /* Measure with the menu visible, otherwise offsetWidth is 0. */
 el.classList.add('open');
 const w=el.offsetWidth,h=el.offsetHeight,vw=document.documentElement.clientWidth,
  vh=document.documentElement.clientHeight;
 let x,y;
 if(opts.point){x=opts.point.x;y=opts.point.y;}
 else if(anchor&&anchor.getBoundingClientRect){
  const r=anchor.getBoundingClientRect();
  x=opts.align==='right'?r.right-w:r.left;
  y=r.bottom+2;}
 else {x=opts.x||POP_EDGE;y=opts.y||POP_EDGE;}
 /* Flip to the other side rather than squeezing against the edge. */
 if(!opts.point&&anchor&&anchor.getBoundingClientRect){
  const r=anchor.getBoundingClientRect();
  if(x+w>vw-POP_EDGE&&r.left-w>=POP_EDGE)x=r.left-w;
  if(y+h>vh-POP_EDGE&&r.top-h>=POP_EDGE)y=r.top-h;}
 x=Math.max(POP_EDGE,Math.min(x,vw-w-POP_EDGE));
 y=Math.max(POP_EDGE,Math.min(y,vh-h-POP_EDGE));
 el.style.left=Math.round(x)+'px';
 el.style.top=Math.round(y)+'px';
 if(!el.__repositionBound){
  el.__repositionBound=true;
  addEventListener('resize',()=>{if(el.classList.contains('open'))
   placeFloating(el,anchor,Object.assign({},opts,{_keep:true}));});}}

function popMenu(anchor,items){const m=$('#popMenu');if(!m)return;m.innerHTML='';
 items.forEach(it=>{
  if(!it){m.appendChild(document.createElement('hr'));return;}
  if(it.head){const d=document.createElement('div');d.className='phead';d.textContent=it.head;m.appendChild(d);return;}
  const d=document.createElement('div');d.textContent=it.label;
  if(it.on)d.style.fontWeight='700';
  d.onclick=()=>{m.classList.remove('open');try{if(it.action)it.action();}catch(e){}};
  m.appendChild(d);});
  m.classList.add('open');
  placeFloating(m,anchor);}
function closeMenus(){$('#popMenu').classList.remove('open');$('#ctxMenu').classList.remove('open');}

/* ================= File backstage view (Excel-style full-page File menu) ================= */
let backstageOpen=false;
function openBackstage(){const bs=$('#backstage');if(!bs)return;closeMenus();
 backstageOpen=true;bs.classList.add('open');bs.setAttribute('aria-hidden','false');
 showBsPage('home');bsInfoRefresh();bsRenderRecent();}
function closeBackstage(){const bs=$('#backstage');if(!bs)return;
 backstageOpen=false;bs.classList.remove('open');bs.setAttribute('aria-hidden','true');}
function showBsPage(page){const bs=$('#backstage');if(!bs)return;
 bs.querySelectorAll('.bsItem').forEach(b=>b.classList.toggle('on',b.dataset.bsPage===page));
 bs.querySelectorAll('.bsPage').forEach(p=>p.classList.toggle('on',p.dataset.bspane===page));}
function bsOpenAccount(){const bs=$('#backstage');if(!bs)return;
 if(Account.currentUser()){showBsPage('account');showAccountPage();}
 else openAuthDialog('signin');}
/* Recent workbooks on the Home and Recent pages. start-screen.js owns the
   list, so this only renders what it already knows about; the two list hosts
   are filled together because the Home page shows the same list. */
function bsRenderRecent(){
 const hosts=['#bsRecentList','#bsRecentOnly'];
 if(typeof StartScreen==='undefined'||!StartScreen.recent)return;
 let items=[];
 try{items=StartScreen.recent()||[];}catch(e){items=[];}
 const rows=items.length?items.map(function(it){
   const id=String(it.id||''),name=String(it.name||'');
   return '<div class="bsRecentItem" data-bs-recent="'+escHtml(id)+'">'
     +'<span class="bsRecentIco" aria-hidden="true">&#128196;</span>'
     +'<span class="bsRecentName">'+escHtml(name)+'</span></div>';}).join(''):
   '<p class="bsEmpty">'+escHtml(T('bsNoRecentBs'))+'</p>';
 hosts.forEach(function(sel){
  const host=$(sel);if(host)host.innerHTML=rows;});
}
function escHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function bsInfoRefresh(){
 const set=(id,v)=>{const el=$(id);if(el)el.textContent=v;};
 const s=sheet();
 set('#bsNSheets',wb&&wb.sheets?String(wb.sheets.length):'1');
 set('#bsSheetName',s?s.name:'');
 set('#bsNCells',s?String(Object.keys(s.cells).length):'0');
 const lang=$('#lang');
 set('#bsLang',lang&&lang.selectedOptions&&lang.selectedOptions[0]?lang.selectedOptions[0].textContent:LANG.toUpperCase());
 /* The OneDrive page's Account / Storage / Cloud-saves rows are live account
    state, so refresh them from the session instead of leaving placeholders. */
 try{if(typeof syncStorageUi==='function')syncStorageUi();}catch(e){}}
function saveNow(){saveLS();setStatusMode(T('fileSaved'));}
function startNewWorkbook(){if(confirm(T('newConfirm'))){const appearance={theme:wb.theme||'default',accent:wb.accent||''};wb={cur:0,sheets:[{name:'Sheet1',cells:{}}],...appearance};hist=[];fut=[];active=selA=selB='A1';saveLS();renderAll();renderTabs();}}
function triggerImport(){const fi=$('#fileIn');if(fi)fi.click();}
function triggerPrint(){window.print();}
function initBackstage(){
 const bs=$('#backstage');if(!bs)return;
 bs.querySelectorAll('.bsItem').forEach(b=>{b.onclick=()=>{
  if(b.dataset.bsPage==='account'){bsOpenAccount();return;}
  showBsPage(b.dataset.bsPage);bsInfoRefresh();bsRenderRecent();};});
 const act=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
 act('#bsBack',closeBackstage);
 act('#bsNewBlank',startNewWorkbook);
 act('#bsOpenCsv',triggerImport);
 act('#bsCardSave',saveNow);act('#bsSaveBrowser',saveNow);
 act('#bsCardCsv',exportCSV);act('#bsExpCsv',exportCSV);
 act('#bsCardXlsx',()=>$('#bXlsx').click());act('#bsExpXlsx',()=>$('#bXlsx').click());
 act('#bsCardZip',()=>$('#bAllCsv').click());act('#bsExpZip',()=>$('#bAllCsv').click());
 act('#bsCardPrint',triggerPrint);act('#bsPrintNow',triggerPrint);
 act('#bsHomeBlank',startNewWorkbook);
 act('#bsHomeOpen',triggerImport);
 act('#bsHomeOneDrive',()=>showBsPage('onedrive'));
 act('#bsCloudSignIn',bsOpenAccount);
 act('#bsCloudBooks',bsOpenAccount);
 act('#bsCloudDrive',bsOpenAccount);
 act('#bsPrintSetup',openPageSetup);
 /* Clicking a recent row re-opens it. A cloud book is fetched through the same
    helper the start screen uses; a local one is already in memory, so closing
    the backstage is all that is needed either way. */
 bs.addEventListener('click',e=>{
  const row=e.target.closest?e.target.closest('[data-bs-recent]'):null;
  if(!row)return;
  const id=row.getAttribute('data-bs-recent')||'';
  closeBackstage();
  if(id.indexOf('cloud:')===0&&typeof StartScreen!=='undefined'&&StartScreen.openCloudBook)
   StartScreen.openCloudBook(id.slice(6));
 });
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&backstageOpen){e.preventDefault();closeBackstage();}});}

function mergesOf(){const s=sheet();if(!s.merges)s.merges=[];return s.merges;}
function applyMerges(){
 const list=mergesOf();
 grid.querySelectorAll('td').forEach(td=>{td.colSpan=1;td.rowSpan=1;td.style.display='';});
 list.forEach(mg=>{const p=String(mg).split(':');if(p.length<2)return;
  const a=refToRC(p[0]),b=refToRC(p[1]);const td=tdOf(p[0]);if(!td)return;
  td.colSpan=b.c-a.c+1;td.rowSpan=b.r-a.r+1;td.style.display='';
  for(let r=a.r;r<=b.r;r++)for(let c=a.c;c<=b.c;c++){
   if(r===a.r&&c===a.c)continue;const x=tdOf(refOf(r,c));if(x)x.style.display='none';}});}
function toggleMerge(){const q=rect();
 if(q.r1===q.r2&&q.c1===q.c2){return;}
 const a1=refOf(q.r1,q.c1),b1=refOf(q.r2,q.c2),key=a1+':'+b1;
 const list=mergesOf();const idx=list.indexOf(key);
 snapshot();
 if(idx>=0)list.splice(idx,1);
 else{for(let i=list.length-1;i>=0;i--){const p=list[i].split(':');const r1=refToRC(p[0]),r2=refToRC(p[1]);
  if(!(r2.r<q.r1||r1.r>q.r2||r2.c<q.c1||r1.c>q.c2))list.splice(i,1);}
  list.push(key);
  for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++){
   if(r===q.r1&&c===q.c1)continue;const cel=sheet().cells[refOf(r,c)];if(cel){delete cel.raw;if(!cel.s||!Object.keys(cel.s).length)delete sheet().cells[refOf(r,c)];}}}
 saveLS();renderAll();}
function applyFreeze(){
 const f=sheet().freeze||{r:0,c:0};
 grid.querySelectorAll('th,td').forEach(el=>{el.style.position='';el.style.top='';el.style.left='';el.style.zIndex='';});
 const HDR=22;
 for(let c=0;c<ROWS;c++)for(let cc=0;cc<f.c;cc++){const el=tdOf(refOf(c,cc));
  if(el){el.style.position='sticky';let off=34;for(let k=0;k<cc;k++)off+=colW[k];el.style.left=off+'px';el.style.zIndex=2;}}
 for(let r=0;r<f.r;r++){const top=HDR+HDR*r;
  for(let c=0;c<COLS;c++){const el=tdOf(refOf(r,c));
   if(el){el.style.position='sticky';el.style.top=top+'px';el.style.zIndex=2;}}
  const rh=grid.querySelector('tbody th[data-row="'+r+'"]');
  if(rh){rh.style.position='sticky';rh.style.top=top+'px';rh.style.zIndex=2;}}
 const ch=grid.querySelector('thead th.corner');
 if(ch&&f.c>0){ch.style.zIndex=4;}}
function applyZoom(){const z=wb.zoom||1;grid.style.zoom=z;
 const zi=$('#sbZoom');if(zi)zi.value=Math.round(z*100);
 const t=$('#sbZoomTxt');if(t)t.textContent=Math.round(z*100)+'%';}
function setZoom(z){wb.zoom=clamp(Math.round(z*10)/10,0.5,2);applyZoom();saveLS();}


/* ================= Excel-like ribbon wiring ================= */
function syncRibbon(){
 const s=styleOf(active);
 const t=(id,on)=>{const el=$(id);if(el)el.classList.toggle('on',!!on);};
 t('#bB',s.b);t('#bI',s.i);t('#bU',s.u);t('#bWrap',s.wrap);
 const q=rect();t('#bMerge',!!mergesOf().filter(mg=>{const p=String(mg).split(':');if(p.length<2)return false;
  const a=refToRC(p[0]),b=refToRC(p[1]);return a.r===q.r1&&a.c===q.c1&&b.r===q.r2&&b.c===q.c2;}).length);
 t('#bTglGrid',wb.showGrid!==false);t('#bTglHead',wb.showHead!==false);
 t('#sbGrid',wb.showGrid!==false);t('#sbHead',wb.showHead!==false);
 t('#bFilter',!!sheet().filterRange);
 const mode=$('#sbMode');if(mode)mode.textContent=T('sbReady');
 const bn=$('#bookName');if(bn)bn.textContent='Book1 · '+sheet().name;
 const ff=$('#fontFam');if(ff&&!ff.options.length)FNTS.forEach(f=>{const o=document.createElement('option');o.value=f;o.textContent=f;ff.appendChild(o);});
 if(ff)ff.value=s.ff||'Calibri';
 const fs2=$('#fontSize');if(fs2&&!fs2.options.length)FSZ.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;fs2.appendChild(o);});
 if(fs2)fs2.value=String(s.fs||FS_DEFAULT);
 {
  const chk=(id,v)=>{const el=$(id);if(el)el.checked=!!v;};
  chk('#bPlGrid',wb.showGrid!==false);chk('#bPlGridP',wb.printGrid!==false);
  chk('#bPlHead',wb.showHead!==false);chk('#bPlHeadP',wb.printHead!==false);
  syncScaleSelect();}
 t('#bPlPage',(wb.view||'normal')!=='normal');t('#bShowNotes',wb.showNotes!==false);
 const po=$('#bOrientTxt');if(po)po.textContent=T((wb.pageSetup||{}).orientation==='landscape'?'orientL':'orientP');
 const pp=$('#bProtTxt');if(pp)pp.textContent=T(sheet().protect?'protOff':'protOn');
 document.querySelectorAll('[data-va]').forEach(b2=>b2.classList.toggle('on',s.va===b2.dataset.va));
 document.querySelectorAll('[data-al]').forEach(b2=>b2.classList.toggle('on',s.al===b2.dataset.al));
 t('#bShowFormulas',!!wb.showFormulas);
 t('#bVwN',(wb.view||'normal')==='normal');t('#bVwP',wb.view==='page');t('#bVwB',wb.view==='break');}
function insertTotalRow(){const q=rect();snapshot();const cs=sheet().cells;
 let lastUsed=-1;
 for(let r=q.r2;r>=q.r1;r--){let any=false;
  for(let c=q.c1;c<=q.c2;c++){const v=vals[refOf(r,c)];if(v!==''&&v!=null){any=true;break;}}
  if(any){lastUsed=r;break;}}
 if(lastUsed<0){setStatusMode(T('fNoData'));return;}
 const tr=lastUsed+1;
 for(let c=q.c1;c<=q.c2;c++){
  const col=colName(c);let fmt;
  for(let r=q.r1;r<=lastUsed;r++){const st=styleOf(col+r);if(st.numfmt){fmt=st.numfmt;break;}}
  const sumCell=col+tr;
  if(c===q.c1&&q.c2>q.c1){cs[sumCell]={raw:T('total'),s:{b:true,bg:'#e2efda'}};continue;}
  const nums=[];
  for(let r=q.r1;r<=lastUsed;r++){const v=vals[refOf(r,c)];if(typeof v==='number'&&isFinite(v))nums.push(r);}
  if(nums.length){cs[sumCell]={raw:'=SUM('+col+nums[0]+':'+col+nums[nums.length-1]+')',s:{b:true,bg:'#e2efda',numfmt:fmt}};}
  else if(c===q.c1){cs[sumCell]={raw:T('total'),s:{b:true,bg:'#e2efda'}};}}
 active=colName(q.c1)+tr;selA=selB=active;
 saveLS();renderAll();setStatusMode(T('totalRowAdded'));}
function doAutoSum(){const r=autoSumText();if(!r)return;
 snapshot();active=r.target;selA=selB=r.target;setRawNoSnap(r.target,'=SUM('+r.rng+')');renderAll();}
function setRawNoSnap(ref,val){const cs=sheet().cells;
 if(val===''||val==null){const c=cs[ref];if(c){delete c.raw;if(!c.s||!Object.keys(c.s).length)delete cs[ref];}}
 else{const c=cs[ref]||{};c.raw=val;cs[ref]=c;}}
function fillDown(){const q=rect();if(q.r2-q.r1<1)return;snapshot();
 const cs=sheet().cells;
 for(let c=q.c1;c<=q.c2;c++){const src=cs[refOf(q.r1,c)];
  for(let r=q.r1+1;r<=q.r2;r++){const ref=refOf(r,c);
   if(src){cs[ref]={raw:src.raw};if(src.s)cs[ref].s=Object.assign({},src.s);}
   else delete cs[ref];}}
 saveLS();renderAll();}

/* ================= Excel navigation & fill commands ================= */
function cellHas(ref){const v=vals[ref];return !(v===''||v==null);}
function jumpEdge(dr,dc,extend){
 const p=refToRC(active);let r=p.r,c=p.c;
 if(cellHas(active)){
  let moved=false;
  for(let g=0;g<ROWS*COLS;g++){const nr=r+dr,nc=c+dc;
   if(nr<0||nr>=ROWS||nc<0||nc>=COLS)break;
   if(!cellHas(refOf(nr,nc)))break;
   r=nr;c=nc;moved=true;}
  if(!moved){r=dr>0?ROWS-1:(dr<0?0:r);c=dc>0?COLS-1:(dc<0?0:c);}
 }else{
  for(let g=0;g<ROWS*COLS;g++){const nr=r+dr,nc=c+dc;
   if(nr<0||nr>=ROWS||nc<0||nc>=COLS)break;
   r=nr;c=nc;if(cellHas(refOf(r,c)))break;}
 }
 const tgt=refOf(r,c);
 if(extend)selB=tgt;else{selA=selB=tgt;}
 active=tgt;renderAll();
 const td=tdOf(tgt);if(td)td.scrollIntoView({block:'nearest',inline:'nearest'});}
function goHome(){active=selA=selB='A1';renderAll();
 const td=tdOf('A1');if(td)td.scrollIntoView({block:'nearest',inline:'nearest'});setStatusMode(T('navHome'));}
function goEnd(){let mr=0,mc=0;
 for(const ref in sheet().cells){const p=refToRC(ref);if(p.r>mr)mr=p.r;if(p.c>mc)mc=p.c;}
 active=selA=selB=refOf(mr,mc);renderAll();
 const td=tdOf(active);if(td)td.scrollIntoView({block:'nearest',inline:'nearest'});setStatusMode(T('navEnd'));}
function fillDownCmd(){const q=rect();
 if(q.r2>q.r1){applyFill({r1:q.r1,r2:q.r1,c1:q.c1,c2:q.c2},q);renderAll();setStatusMode(T('fillDone'));return;}
 const c=q.c1;let top=q.r1;
 while(top-1>=0&&cellHas(refOf(top-1,c)))top--;
 if(top===q.r1)return;
 applyFill({r1:top,r2:q.r1-1,c1:q.c1,c2:q.c2},{r1:top,r2:q.r1,c1:q.c1,c2:q.c2});
 renderAll();setStatusMode(T('fillDone'));}
function fillRightCmd(){const q=rect();
 if(q.c2>q.c1){applyFill({r1:q.r1,r2:q.r2,c1:q.c1,c2:q.c1},q);renderAll();setStatusMode(T('fillDone'));return;}
 const r=q.r1;let left=q.c1;
 while(left-1>=0&&cellHas(refOf(r,left-1)))left--;
 if(left===q.c1)return;
 applyFill({r1:q.r1,r2:q.r2,c1:left,c2:q.c1-1},{r1:q.r1,r2:q.r2,c1:left,c2:q.c1});
 renderAll();setStatusMode(T('fillDone'));}
function fillExtent(q){
 const probe=c=>{if(c<0||c>=COLS)return -1;
  let last=-1;
  for(let r=q.r2+1;r<ROWS;r++){if(cellHas(refOf(r,c)))last=r;else break;}
  return last;};
 let last=probe(q.c1-1);
 if(last<0)last=probe(q.c2+1);
 if(last<0)return null;
 return{r1:q.r1,r2:last,c1:q.c1,c2:q.c2};}
function fillHandleMenu(anchor,q,t){
 const run=m=>{applyFill(q,t,m);
  selA=refOf(t.r1,t.c1);selB=refOf(t.r2,t.c2);active=refOf(t.r2,t.c2);
  renderAll();setStatusMode(T('fillDone'));};
 popMenu(anchor,[
  {head:T('fillMenu')},
  {label:T('fillCopy'),action:()=>run('copy')},
  {label:T('fillSeries'),action:()=>run('series')},
  {label:T('fillFmt'),action:()=>run('fmt')},
  {label:T('fillNoFmt'),action:()=>run('nofmt')},
  null,
  {label:T('fillCancel'),action:()=>{}}]);}

/* ================= Excel-like ribbon helpers (pure, testable) ================= */

function condsOf(){const s=sheet();if(!s.conds)s.conds=[];return s.conds;}
function condApplies(rule,ref,v){const p=refToRC(ref);
 if(p.r<rule.r1||p.r>rule.r2||p.c<rule.c1||p.c>rule.c2)return false;
 if(rule.type==='dup'){const cs=sheet().cells;let n=0;
  for(const k in cs){const q=refToRC(k);
   if(q.r>=rule.r1&&q.r<=rule.r2&&q.c>=rule.c1&&q.c<=rule.c2&&cs[k].raw!=null&&String(cs[k].raw)===String(cell(ref).raw))n++;}
  return n>1;}
 const n=num(v);if(typeof v!=='number'&&isNaN(n))return typeof v==='string'&&rule.type==='eq'&&v===rule.v1;
 const x=typeof v==='number'?v:n;
 if(rule.type==='gt')return x>rule.v1;
 if(rule.type==='lt')return x<rule.v1;
 if(rule.type==='eq')return x===rule.v1;
 if(rule.type==='bw')return x>=rule.v1&&x<=rule.v2;
 if(rule.type==='top')return topSet(rule).indexOf(ref)>=0;
 return false;}
function topSet(rule){const arr=[];const cs=sheet().cells;
 for(const k in cs){const p=refToRC(k);
  if(p.r>=rule.r1&&p.r<=rule.r2&&p.c>=rule.c1&&p.c<=rule.c2){
   const n=num(vals[k]);if(typeof vals[k]==='number'&&isFinite(vals[k]))arr.push([n,k]);}}
 arr.sort((a,b)=>rule.type==='top'?b[0]-a[0]:a[0]-b[0]);
 return arr.slice(0,rule.v1||3).map(x=>x[1]);}
function condStyleFor(ref,v){const out={};condsOf().forEach(rule=>{
 if(condApplies(rule,ref,v))Object.assign(out,rule.fmt||{});});return out;}
function styleMenu(anchor){popMenu(anchor,[
 {head:T('gStyles')},
 {label:'✔ '+T('styGood'),action:()=>applyStyle({bg:'#e2efda',color:''})},
 {label:'✖ '+T('styBad'),action:()=>applyStyle({bg:'#ffc7ce',color:'#9c0006'})},
 {label:'⚠ '+T('styNeutral'),action:()=>applyStyle({bg:'#ffeb9c',color:'#9c6500'})},
 {label:'H '+T('styHeading'),action:()=>applyStyle({b:true,fs:16,bg:'#217346',color:'#ffffff'})},
 null,
 {label:T('styClear'),action:()=>applyStyle({bg:null,color:null,b:null})}]);}
function condMenu(anchor){popMenu(anchor,[
 {head:T('gStyles')},
 {label:T('cndGt'),action:()=>condAdd('gt')},
 {label:T('cndLt'),action:()=>condAdd('lt')},
 {label:T('cndEq'),action:()=>condAdd('eq')},
 {label:T('cndBw'),action:()=>condAdd('bw')},
 {label:T('cndDup'),action:()=>condAdd('dup')},
 {label:T('cndTop'),action:()=>condAdd('top')},
 null,
 {label:T('cndClear'),action:()=>{sheet().conds=[];saveLS();renderAll();syncRibbon();}}]);}
function condAdd(type){const q=rect();
 if(type==='dup'||type==='top'){pushCond({type,v1:type==='top'?3:0});return;}
 const v1=prompt(type==='bw'?T('cndFrom'):T('cndValue'),'');if(v1===null)return;
 let v2=null;if(type==='bw'){v2=prompt(T('cndTo'),'');if(v2===null)return;}
 pushCond({type,v1:parseFloat(v1),v2:parseFloat(v2)});}
function pushCond(rule){const q=rect();
 rule.r1=q.r1;rule.c1=q.c1;rule.r2=q.r2;rule.c2=q.c2;
 rule.fmt={bg:'#ffdead',color:'#8b0000',b:true};
 condsOf().push(rule);saveLS();renderAll();syncRibbon();}
function borderMenu(anchor){const E={no:'a',all:'a',outer:null,top:'t',bottom:'b',left:'l',right:'r'};
 const patch=(kind,v)=>{const p=[];
  if(kind==='no')p.push({e:'a',v:null});
  else if(kind==='all')p.push({e:'a',v});
  else if(kind==='outer')['t','b','l','r'].forEach(e=>p.push({e,v}));
  else p.push({e:E[kind],v});
  applyBorderPatch(p);};
 popMenu(anchor,[
  {label:T('brdNone'),action:()=>patch('no',null)},
  {label:T('brdAll'),action:()=>patch('all','thin')},
  {label:T('brdOuter'),action:()=>patch('outer','thin')},
  {label:T('brdThick'),action:()=>patch('outer','thick')},
  null,
  {label:T('brdTop'),action:()=>patch('top','thin')},
  {label:T('brdBottom'),action:()=>patch('bottom','thin')},
  {label:T('brdLeft'),action:()=>patch('left','thin')},
  {label:T('brdRight'),action:()=>patch('right','thin')}]);}
function applyBorderCell(ref,base,patch,q){const cs=sheet().cells;
 const cel=cs[ref]||{};let next=Object.assign({},base||{});
 patch.forEach(p2=>{
  const pos=refToRC(ref);
  const onEdge=(p2.e==='t'&&pos.r===q.r1)||(p2.e==='b'&&pos.r===q.r2)||(p2.e==='l'&&pos.c===q.c1)||(p2.e==='r'&&pos.c===q.c2);
  const onAll=p2.e==='a';
  if((onEdge||onAll)&&p2.v){next.t=p2.v;next.b=p2.v;next.l=p2.v;next.r=p2.v;
   if(!onAll)next[p2.e]=p2.v;return;}
  if(onEdge&&p2.v===null)delete next[p2.e];
  if(onAll&&p2.v===null){delete next.t;delete next.b;delete next.l;delete next.r;}});
 return Object.keys(next).length?next:undefined;}
function applyBorderPatch(patch){const q=rect();snapshot();const cs=sheet().cells;
 for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++){
  const ref=refOf(r,c);const cel=cs[ref]||{};
  const nb=applyBorderCell(ref,cel.s&&cel.s.border,patch,q);
  if(nb){cel.s=Object.assign({},cel.s||{},{border:nb});cs[ref]=cel;}
  else if(cel.s){delete cel.s.border;if(!Object.keys(cel.s).length)delete cel.s;
   if(cel.raw==null)delete cs[ref];}}
 saveLS();renderAll();}
function fontSizeOf(ref){const s=styleOf(ref);return s.fs||FS_DEFAULT;}
function sizeStep(ref,dir){const cur=fontSizeOf(ref);
 const sizes=dir>0?FSZ.filter(x=>x>cur):FSZ.filter(x=>x<cur).reverse();
 return sizes.length?sizes[0]:cur;}
function autoSumText(){
 const q=rect();const p=refToRC(active);let col=p.c;
 if(selA!==selB){
  col=q.c1;let found=false;
  for(let c=q.c1;c<=q.c2&&!found;c++){for(let rr=q.r1;rr<=q.r2;rr++){
   const v=vals[refOf(rr,c)];if(typeof v==='number'&&isFinite(v)){col=c;found=true;break;}}}
  if(!found)return null;
  let a=null,b=null;
  for(let r=q.r1;r<=q.r2;r++){const v=vals[refOf(r,col)];
   if(typeof v==='number'&&isFinite(v)){if(a===null)a=r;b=r;}}
  if(a===null)return null;
  return{target:refOf(Math.min(b+1,ROWS-1),col),rng:refOf(a,col)+':'+refOf(b,col)};
 }
 let start=null;
 for(let r=p.r-1;r>=0;r--){const v=vals[refOf(r,col)];
  if(typeof v!=='number'||!isFinite(v))break;start=r;}
 if(start===null)return null;
 return{target:refOf(Math.min(p.r,ROWS-1),col),rng:refOf(start,col)+':'+refOf(p.r-1,col)};}

/* ================= Excel-like ribbon init (controls + shortcuts) ================= */
function fillFxCat(sel){sel.innerHTML='';
 [['math','catMath'],['stat','catStat'],['text','catText'],['logic','catLogic'],['lookup','catLookup'],['date','catDate'],['financial','catFin']].forEach(c2=>{
  const o=document.createElement('option');o.value=c2[0];o.textContent=T(c2[1]);sel.appendChild(o);});}
function setBookName(){const bn=$('#bookName');if(bn)bn.textContent='Book1 · '+sheet().name;}
function applyView(){const g=$('#grid');if(!g)return;const m=wb.view||'normal';
 applySheetOpts();
 g.classList.toggle('pageview',m!=='normal');
 g.classList.toggle('breakview',m==='break');
 const t=(id,on)=>{const b=$(id);if(b)b.classList.toggle('on',!!on);};
 t('#sbViewN',m==='normal');t('#sbViewP',m==='page');t('#sbViewB',m==='break');}
function setViewMode(m){wb.view=m;saveLS();applyView();}
function pagePreview(){setViewMode((wb.view||'normal')==='normal'?'page':'normal');}

/* ================= Page Layout & Review ================= */
function gateEdit(){if(sheet().protect){setStatusMode(T('protMsg'));return true;}return false;}
function toggleProtect(){const s=sheet();
 if(s.protect){delete s.protect;setStatusMode(T('sbReady'));}
 else{s.protect=true;setStatusMode(T('protMsg'));}
 saveLS();renderAll();syncRibbon();}
function smartLookup(){const lp=$('#aiPanel');if(lp)lp.classList.add('open');
 const inp=$('#aiInput');if(inp){inp.value=T('smartAbout')+' '+(dispVal(active)||active);inp.focus();}}
function checkA11y(){const errs=[];
 for(const ref in vals)if(isErr(vals[ref]))errs.push(ref+' '+vals[ref]);
 let msg=errs.length?T('a11yErrs').replace('{n}',errs.length).replace('{refs}',errs.slice(0,8).join(', ')+(errs.length>8?' …':'')):T('a11yClean');
 const emptyHeads=[];for(let c=0;c<COLS;c++)if(rawOf(refOf(0,c))==='')emptyHeads.push(colName(c));
 if(emptyHeads.length)msg+='\n'+T('a11yHead').replace('{n}',emptyHeads.length).replace('{cols}',emptyHeads.join(', '));
 alert(msg);}
function suggest(w){let best='',bs=99;
 SPELL_DICT.forEach(d=>{const sc=Math.abs(d.length-w.length)+(d[0]===w[0]?0:2)+((d[1]||'')===w[1]?0:1);
  if(sc<bs){bs=sc;best=d;}});
 return bs<=3?best:w;}
function spellCheck(){const found=[];
 for(const ref in sheet().cells){const c=sheet().cells[ref];
  if(!c||typeof c.raw!=='string'||c.raw[0]==='=')continue;
  (c.raw.match(/[A-Za-z][A-Za-z']*/g)||[]).forEach(w=>{if(!SPELL_DICT.has(w.toLowerCase()))found.push({ref,word:w});});}
 if(!found.length){setStatusMode(T('spellNone'));return;}
 snapshot();let fixed=0;
 for(const f of found){
  const rep=prompt(T('spellQ').replace('{ref}',f.ref).replace('{word}',f.word),suggest(f.word.toLowerCase()));
  if(rep===null)break;
  if(rep&&rep!==f.word){const c=sheet().cells[f.ref];if(!c)continue;
   c.raw=c.raw.replace(new RegExp('\\b'+f.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b'),rep);
   fixed++;}}
 saveLS();renderAll();
 setStatusMode(T('spellDone').replace('{n}',fixed));}
const SPELL_DICT=new Set(('a about above across act add after again against age all also always am an and animal any '+
 'apple are area around as ask at ate aunt back ball bank be bean because become bed been before begin behind below '+
 'beside best better between big bird bit black block blue boat body book born both box boy bread break bring brother '+
 'brown build burn bus busy but buy by call came camp can car card care carry case cat catch cent chair chance change '+
 'cheap check child city class clean clear climb clock close cold collect color come common cook cool corn cost could '+
 'count country course cover cross cry cup cut dad dance dark date daughter day dead dear deep did die different '+
 'dinner do does dog door down draw dream dress drink drive drop dry during each ear early easy eat egg eight else '+
 'end enough enter even ever every example eye face fact fair fall family far farm fast father fear feel few field '+
 'fight fill find fine finger finish fire first fish five floor flower fly follow food foot for forest forget free '+
 'fresh friend from front fruit full fun game garden gave get girl give go goes gold gone good got grand grass gray '+
 'great green grew group grow had hair half hand happen happy hard has hat have he head hear heart heavy held help '+
 'her here high hill him his hold home hope horse hot hour house how hundred hungry hunt i ice if important in into '+
 'is island it its jump just keep key kill kind king kitchen knew know lady lake land large last late laugh lay learn '+
 'leave left leg less let letter life light like line lion list listen little live long look lost lot loud love low '+
 'made main make man many map march mark may maybe me mean meat meet men might mile milk mind mine minute miss '+
 'money month moon more morning most mother mountain mouse mouth move much music must my name near need never new '+
 'news next nice night nine no noise north not note nothing now number ocean of off often oh old on once one only '+
 'open or order other our out over own page paint pair paper part pass past pay peace pen people perhaps person pick '+
 'picture piece place plan plant play please point police poor possible pot potato pretty price problem put question '+
 'quick quiet quite rain reach read ready real red remember rest return rich ride right ring rise river road rock '+
 'room round run sad said sail salt same sat save saw say school sea season seat second see seem sell send sense '+
 'sentence serve set seven several shall shape share she ship shoe shop short should shout show side sign silver '+
 'simple since sing single sister sit six size sky sleep slow small smell snow so soft some son song soon sorry '+
 'sound south speak special speed spell spend sport spring stand star start stay step still stone stop store storm '+
 'story street strong study such summer sun sure sweet swim table take talk tall teach tell ten test than that the '+
 'their them then there these they thing think third this those though thought three through time to today together '+
 'told tomorrow too took top touch toward town trade train travel tree trip trouble true try turn two under '+
 'understand until up upon us use usual very visit voice wait walk wall want war warm was wash watch water way we '+
 'wear week well went were west what wheel when where which while white who whole why wide wife will win wind window '+
 'winter wish with without woman women wonder wood word work world would write year yellow yes yesterday yet young '+
 'your amount cell cells chart column data date excel file formula grid header insert item number percent row rule '+
 'sheet sum text total view rice lentils oil sugar salt').split(/\s+/));
function toggleRibbon(){const rb=document.querySelector('.ribbon');if(!rb)return;
 rb.classList.toggle('min');const m=rb.classList.contains('min');
 const rm=$('#ribbonMin');if(rm){rm.textContent=m?'▾':'▴';rm.title=m?T('ribbonMax'):T('ribbonMin');}}
/* ---------- tab navigation (click + keyboard + a11y) ---------- */
function activateTab(tab){
  // commit any in-progress cell edit before switching
  if(editing) commitEdit(0,0);
  // update tab buttons: only the clicked tab gets .on
  document.querySelectorAll('.rtab').forEach(t => {
    const isActive = t === tab;
    t.classList.toggle('on', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  // show the matching ribbon page
  document.querySelectorAll('.rpage').forEach(p => {
    p.classList.toggle('on', p.dataset.page === tab.dataset.tab);
  });
  // focus the tab for keyboard accessibility
  tab.focus();
}

function initTabNav(){
  const tabs = Array.from(document.querySelectorAll('.rtab'));
  if(!tabs.length) return;

  // set up ARIA attributes and roving tabindex
  tabs.forEach(t => {
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-selected', t.classList.contains('on') ? 'true' : 'false');
    t.setAttribute('aria-controls', 'rpage-' + t.dataset.tab);
    t.setAttribute('tabindex', t.classList.contains('on') ? '0' : '-1');
    // click: switch to this tab
    t.addEventListener('click', () => activateTab(t));
  });

  // ensure ribbon pages have ids matching aria-controls
  document.querySelectorAll('.rpage').forEach(p => {
    if(!p.id) p.id = 'rpage-' + p.dataset.page;
  });

  // keyboard navigation between tabs (arrow keys, Home, End)
  tabs.forEach((t, i) => {
    t.addEventListener('keydown', e => {
      let next = null;
      switch(e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          next = tabs[(i + 1) % tabs.length];
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          next = tabs[(i - 1 + tabs.length) % tabs.length];
          break;
        case 'Home':
          next = tabs[0];
          break;
        case 'End':
          next = tabs[tabs.length - 1];
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          activateTab(t);
          return;
        default:
          return;
     }
      if(next){
        e.preventDefault();
        activateTab(next);
        // roving tabindex: moved-to tab gets tabindex=0, others get -1
        tabs.forEach(x => x.setAttribute('tabindex', x === next ? '0' : '-1'));
     }
   });
  });
}

function initRibbon(){
  initTabNav();
  initRibbonOverflow();
  /* This function binds the Themes, Page Setup, Sheet Options, Scale to Fit and
     the whole Page Setup dialog - including #psOk / #psCancel / #psClose - and it
     was never called, so 17 controls on the Page Layout tab were dead. A few ids
     are also bound above in initRibbon; re-assigning the same handler is a no-op. */
  wirePageLayout();
  const hide=el=>{if(el)el.style.display='none';};
 hide($('#bXlsx'));hide($('#bAllCsv'));hide($('#bExport'));

 $('#bSave').onclick=()=>{saveLS();setStatusMode(T('sbSaved'));};
 const on=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
 on('#bB',()=>applyStyle({b:!styleOf(active).b}));
 on('#bI',()=>applyStyle({i:!styleOf(active).i}));
 on('#bU',()=>applyStyle({u:!styleOf(active).u}));
 on('#bWrap',()=>applyStyle({wrap:!styleOf(active).wrap}));
 on('#bMerge',toggleMerge);
 on('#bBorder',e=>borderMenu($('#bBorder')));
 on('#bStyles',e=>styleMenu($('#bStyles')));
 on('#bCond',e=>condMenu($('#bCond')));
 on('#bDecInc',()=>applyNumDec(1));
 on('#bDecDec',()=>applyNumDec(-1));
 on('#bPct',()=>applyStyle({numfmt:'pct'}));
 on('#bComma',()=>applyStyle({numfmt:'comma'}));
 /* Accounting Number Format: currency, two decimals, the $ / ₹ / रु symbols the
    workbook already formats with, offered as a menu because Excel's button is a
    split command too. */
 on('#bAcct',e=>popMenu($('#bAcct'),[
  {head:T('bAcct')},
  {label:T('nf_usd'),action:()=>applyStyle({numfmt:'usd'})},
  {label:T('nf_inr'),action:()=>applyStyle({numfmt:'inr'})},
  {label:T('nf_npr'),action:()=>applyStyle({numfmt:'npr'})}]));
 const ff=$('#fontFam');if(ff){ff.onchange=e=>{if(e.target.value)applyStyle({ff:e.target.value});};}
 const fs2=$('#fontSize');if(fs2){fs2.onchange=e=>{if(e.target.value)applyStyle({fs:+e.target.value});};}
 on('#bGrowFont',()=>applyStyle({fs:sizeStep(active,1)}));
 on('#bShrinkFont',()=>applyStyle({fs:sizeStep(active,-1)}));
 /* AutoSum is a split command: the tile inserts a plain SUM, and the caret opens
    the function gallery Excel shows beside it. */
 on('#bAutoSum',e=>{if(e.target.closest('.rcaret'))autoSumMenu($('#bAutoSum'));else doAutoSum();});
 on('#bAutoSum2',()=>doAutoSum());
 on('#bFill',fillDown);on('#bClear',clearSel);
 on('#bSort',e=>sortMenu($('#bSort')));
 on('#bSortAz',()=>sortAz(false));on('#bSortZa',()=>sortAz(true));
 on('#bSortMore',e=>sortMenu($('#bSortMore')));
 on('#bFilter',()=>{toggleFilter();syncRibbon();});
 on('#bFilterClear',()=>{const s=sheet();s.filters={};s.hiddenRows=[];applyFilters();saveLS();renderAll();});
 on('#bDup',removeDups);on('#bTxtCol',textToCols);
 on('#bSubtotal',subtotalSel);on('#bCountA',countNonEmptySel);
 /* Cells mirrors the reference: three commands, each a split button. Insert and
    Delete both open a menu; Format launches the dialog. The insert choices live
    in the menu rather than on a second, label-less button, which is how Excel
    draws the group and keeps the row to the three captions the photo shows. */
 on('#bInsRow',e=>popMenu($('#bInsRow'),[
  {label:T('ctxRowAbove'),action:()=>insertRow(refToRC(active).r)},
  {label:T('ctxColLeft'),action:()=>insertCol(refToRC(active).c)}]));
 on('#bIInsRow',()=>{insertRow(refToRC(active).r);});
 on('#bIInsCol',()=>{insertCol(refToRC(active).c);});
 on('#bDel',e=>popMenu($('#bDel'),[
  {label:T('ctxDelRow'),action:()=>deleteRow(refToRC(active).r)},
  {label:T('ctxDelCol'),action:()=>deleteCol(refToRC(active).c)}]));
 on('#bChart',()=>{$('#chartDlg').classList.toggle('open');drawChart();});
 on('#bChartType',e=>popMenu($('#bChartType'),['bar','line','pie'].map(t2=>({label:t2,
  on:chartType===t2,action:()=>{chartType=t2;
   document.querySelectorAll('#chartTypes button').forEach(x=>x.classList.toggle('on',x.dataset.ct===t2));
   drawChart();}}))));
 on('#bNewSheet',addSheet);
 on('#bILink',()=>{const u=prompt(T('linkPrompt'),'https://');if(u)applyLink(u);});
 on('#bISymbol',e=>popMenu($('#bISymbol'),['Ω','π','∑','√','∞','€','₹','©','★','→','×','÷','±','≤','≥','≠','✓','✔'].map(s2=>({label:s2,action:()=>setRaw(active,(rawOf(active)||'')+s2)}))));
 on('#bIComment',()=>{const n=prompt(T('notePrompt'),'');if(n!==null)applyStyle({note:n});});
 on('#bFreeze',e=>freezeMenu($('#bFreeze')));
 on('#bUnfreeze',()=>{delete sheet().freeze;saveLS();renderAll();syncRibbon();});
 const tg=(id2,fn)=>{const el2=$(id2);if(el2)el2.onclick=fn;};
 tg('#bTglGrid',()=>{wb.showGrid=wb.showGrid===false?undefined:false;saveLS();renderAll();syncRibbon();});
 tg('#bTglHead',()=>{wb.showHead=wb.showHead===false?undefined:false;saveLS();renderAll();syncRibbon();});
 tg('#sbGrid',()=>{wb.showGrid=wb.showGrid===false?undefined:false;saveLS();renderAll();syncRibbon();});
 tg('#sbHead',()=>{wb.showHead=wb.showHead===false?undefined:false;saveLS();renderAll();syncRibbon();});
 tg('#bZoomIn',()=>setZoom((wb.zoom||1)+0.1));
 tg('#bZoomOut',()=>setZoom((wb.zoom||1)-0.1));
 tg('#bZoom100',()=>setZoom(1));
 tg('#sbZoomIn',()=>setZoom((wb.zoom||1)+0.1));
 tg('#sbZoomOut',()=>setZoom((wb.zoom||1)-0.1));
 const sz=$('#sbZoom');if(sz)sz.oninput=e=>setZoom(e.target.value/100);
 tg('#bPrint2',()=>window.print());
 tg('#bPageView',pagePreview);
 tg('#sbViewN',()=>setViewMode('normal'));
 tg('#sbViewP',()=>setViewMode('page'));
 tg('#sbViewB',()=>setViewMode('break'));
 const rt=$('#rtTellMe');if(rt)rt.addEventListener('keydown',e=>{if(e.key==='Enter'){$('#findDlg').classList.add('open');$('#findTxt').focus();}});
 /* Excel formula-bar buttons:  Cancel · ✓ Enter · fx Insert Function */
 const fbc=$('#fbCancel'),fbe=$('#fbEnter'),fbf=$('#fbFx');
 if(fbc)fbc.onclick=()=>{fbar.value=rawOf(active);fbar.blur();};
 if(fbe)fbe.onclick=()=>{setRaw(active,fbar.value);moveSel(1,0,false);};
 if(fbf)fbf.onclick=()=>popMenu(fbf,fnItemList('all'));
 /* Excel ribbon collapse chevron (Ctrl+F1) */
 const rmin=$('#ribbonMin');
 if(rmin)rmin.onclick=toggleRibbon;
 const rf=$('#rFile');if(rf){rf.onclick=openBackstage;}
 initBackstage();
 if(typeof initAllAccountUI==='function')initAllAccountUI();
  on('#bOrient',()=>orientMenu($('#bOrient')));
  on('#bSize',()=>sizeMenu($('#bSize')));
  on('#bMargins',()=>marginsMenu($('#bMargins')));
 tg('#bPlPage',pagePreview);
 tg('#bPlPrint',()=>window.print());
 tg('#bScIn',()=>setZoom((wb.zoom||1)+0.1));
 tg('#bScOut',()=>setZoom((wb.zoom||1)-0.1));
 tg('#bSc100',()=>setZoom(1));
  /* Sheet Options (gridlines / headings, view + print) are wired in wirePageLayout() */
 tg('#bSpell',spellCheck);
 tg('#bA11yCheck',checkA11y);
 tg('#bSmart',smartLookup);
 tg('#bRComment',()=>{const n=prompt(T('notePrompt'),'');if(n!==null)applyStyle({note:n});});
 tg('#bRDelCmt',()=>applyStyle({note:null}));
 tg('#bShowNotes',()=>{wb.showNotes=wb.showNotes===false?undefined:false;saveLS();renderAll();syncRibbon();});
 tg('#bProtect',toggleProtect);
 document.querySelectorAll('[data-va]').forEach(b=>{b.onclick=()=>applyStyle({va:b.dataset.va});});
 tg('#bIndentInc',()=>bumpIndent(1));
 tg('#bIndentDec',()=>bumpIndent(-1));
 tg('#bOrientCell',e=>angleMenu(e.currentTarget));
 tg('#bTracePre',tracePrecedents);
 tg('#bTraceDep',traceDependents);
 tg('#bTraceClear',removeTraces);
 tg('#bShowFormulas',toggleShowFormulas);
 tg('#bAutoTotal',insertTotalRow);
 /* Home group launchers. Each opens Format Cells on the pane that owns the group,
    the way Excel's corner arrow does - Alignment lands on the Alignment tab, and
    Number, Styles and Cells on the Font tab, which is where their settings live
    in this dialog. Editing's arrow opens Find & Select. */
 tg('#bFmtAlign',()=>fmtOpen('align'));
 tg('#bFmtNum',()=>fmtOpen('font'));
 tg('#bFmtStyles',()=>fmtOpen('font'));
 tg('#bFmtCellsGroup',()=>fmtOpen('font'));
 tg('#bFindSelectDlg',()=>{$('#findDlg').classList.add('open');$('#findTxt').focus();});
 tg('#bVwN',()=>setViewMode('normal'));
 tg('#bVwP',()=>setViewMode('page'));
 tg('#bVwB',()=>setViewMode('break'));
 const fc=$('#fnCat');if(fc){fillFxCat(fc);fc.selectedIndex=0;}
 tg('#bFnInsert',()=>{const c=$('#fnCat');popMenu($('#bFnInsert'),fnItemList(c?c.value:'all'));});
 tg('#bFnAll',()=>popMenu($('#bFnAll'),fnItemList('all')));
 tg('#bFnRecent',()=>{const r=wb.recentFns||[];const items=r.length?r.filter(n=>FN[n]).map(n=>({label:n+(FN_HELP[n]?'  —  '+FN_HELP[n]:''),action:()=>insertFn(n)})):[{label:'SUM',action:()=>insertFn('SUM')}];popMenu($('#bFnRecent'),items);});
 tg('#bExplain',()=>{
  const info=explainActive();const inp=$('#aiInput');const lp=$('#aiPanel');
  if(lp)lp.classList.add('open');
  if(inp)inp.focus();
  if(info)aiMsg(T('explFor')+' '+active+': ='+info.formula+'\n'+T('explFns')+': '+(info.fns||'—')+'\n'+T('explRefs')+': '+(info.refs||'—'),'bot');
  else aiMsg(T('explNone'),'bot');});
 tg('#bNameMgr',()=>nameMgrMenu($('#bNameMgr')));
 tg('#bNameDef',()=>defineNameDialog($('#bNameDef')));
 tg('#bCalcNow',()=>{renderAll();setStatusMode(T('sbSaved'));});
 /* --- Formulas: calculation options + defined names --- */
 tg('#bCalcMode',()=>popMenu($('#bCalcMode'),[
  {label:T('calcAuto'),action:()=>{wb.calcMode='auto';saveLS();recalc();syncRibbon();setStatusMode(T('calcAuto'));}},
  {label:T('calcManual'),action:()=>{wb.calcMode='manual';saveLS();syncRibbon();setStatusMode(T('calcManual'));}},
  null,
  {label:T('calcNow'),action:()=>{recalc();renderAll();setStatusMode(T('sbSaved'));}}]));
 tg('#bNameGo',()=>{const names=wb.names||{},keys=Object.keys(names);
  const items=[{head:T('gNames')}];
  if(keys.length)keys.forEach(k=>items.push({label:k+'  →  '+names[k],action:()=>{nameMgrMenu($('#bNameMgr'));}}));
  else items.push({head:T('namesHead')},{label:T('namesAdd')+'…',action:()=>nameMgrMenu($('#bNameMgr'))});
  popMenu($('#bNameGo'),items);});
 /* --- Data: data types (extract number / text from a selection) --- */
 function extractType(anchor,mode){const q=rect();
  if(!q||q.r1===q.r2&&q.c1===q.c2){popMenu(anchor,[{head:T('gDataTypes')},{label:T('bDtNeedRange'),action:()=>{}}]);return;}
  let n=0;
  for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++){
   const ref=refOf(r,c),raw=String(dispVal(ref)||'');
   if(!raw)continue;
   const v=mode==='num'?raw.replace(/[^0-9.,\-]/g,''):raw.replace(/[0-9]/g,'');
   if(v!==raw){setRaw(ref,v);n++;}}
  saveLS();renderAll();syncRibbon();
  setStatusMode(T(mode==='num'?'bDtNum':'bDtText')+': '+n);}
 tg('#bDtNum',()=>extractType($('#bDtNum'),'num'));
 tg('#bDtText',()=>extractType($('#bDtText'),'text'));
 /* --- Review: languages --- */
 tg('#bLang',()=>{const sel=document.getElementById('lang');
  const items=[{head:T('gLang')}];
  Array.prototype.forEach.call(sel?sel.options:[],function(o){
   items.push({label:o.textContent,action:()=>{sel.value=o.value;applyLang(o.value);setStatusMode(T('gLang')+': '+o.textContent);}});});
  popMenu($('#bLang'),items);});
 /* --- Draw tab --- */
 tg('#bInkDraw',()=>setDrawMode('draw'));
 tg('#bInkSelect',()=>setDrawMode(null));
 tg('#bInkErase',()=>setDrawMode('erase'));
 tg('#bInkClear',clearDrawings);
 tg('#bShRect',()=>insertDrawing('rect'));
 tg('#bShEllipse',()=>insertDrawing('ellipse'));
 tg('#bShLine',()=>insertDrawing('line'));
 tg('#bShArrow',()=>insertDrawing('arrow'));
 tg('#bShTri',()=>insertDrawing('triangle'));
 tg('#bShText',()=>insertDrawing('text'));
 /* --- Draw ▸ Insert --- */
 tg('#bDTText',()=>insertDrawing('text'));
 tg('#bDTPic',openPic);
 tg('#bDTShapes',()=>popMenu($('#bDTShapes'),[
  {label:T('bShRect'),action:()=>insertDrawing('rect')},
  {label:T('bShEllipse'),action:()=>insertDrawing('ellipse')},
  {label:T('bShLine'),action:()=>insertDrawing('line')},
  {label:T('bShArrow'),action:()=>insertDrawing('arrow')},
  {label:T('bShTri'),action:()=>insertDrawing('triangle')}]));
 /* --- Help tab --- */
 tg('#bHelpOpen',()=>openHelp());
 tg('#bShortcuts',()=>openHelp());
 tg('#bFnRef',()=>popMenu($('#bFnRef'),fnItemList('all')));
 /* --- Help ▸ Share --- */
 tg('#bShareCopy',()=>{const clip=document.getElementById('clip');
  const link=location.href.split('#')[0];
  if(clip){clip.value=link;clip.select();try{document.execCommand('copy');}catch(e){}}
  setStatusMode(T('bShareCopy')+': '+link);});
 tg('#bShareMail',()=>{location.href='mailto:?subject='+encodeURIComponent(T('sbTitle')||'Mini Excel')+'&body='+encodeURIComponent(location.href);});
 tg('#bFeedback',()=>{const p=$('#aiPanel');if(p)p.classList.add('open');
  const i=$('#aiInput');if(i)i.focus();});
 tg('#bAbout',()=>popMenu($('#bAbout'),[
  {head:T('aboutLine')},
  {label:'Excel-like spreadsheet · offline-first'},
  {label:'Vanilla HTML + CSS + JS · Flask dev server'},
  {label:'Data auto-saves in your browser'}]));
 /* --- Insert-tab buttons that had no handler --- */
 tg('#bShape',()=>popMenu($('#bShape'),[
  {head:T('shapeList')},
  {label:'▭ '+T('bShRect'),action:()=>insertDrawing('rect')},
  {label:'◯ '+T('bShEllipse'),action:()=>insertDrawing('ellipse')},
  {label:'╱ '+T('bShLine'),action:()=>insertDrawing('line')},
  {label:'→ '+T('bShArrow'),action:()=>insertDrawing('arrow')},
  {label:'△ '+T('bShTri'),action:()=>insertDrawing('triangle')},
  {label:'🅣 '+T('bShText'),action:()=>insertDrawing('text')}]));
 /* --- Insert page: chart families, tours, filters, symbols --- */
 const chartDlg=()=>{$('#chartDlg').classList.add('open');drawChart();};
 const chartAs=t2=>{chartType=t2;
  document.querySelectorAll('#chartTypes button').forEach(x=>x.classList.toggle('on',x.dataset.ct===t2));
  chartDlg();};
 tg('#bChart',chartDlg);
 tg('#bChartCol',()=>chartAs('bar'));
 tg('#bChartLine',()=>chartAs('line'));
 tg('#bChartPie',()=>chartAs('pie'));
 tg('#bChartBar',()=>chartAs('bar'));
 tg('#bChartArea',()=>chartAs('area'));
 tg('#bChartScatter',()=>chartAs('scatter'));
 /* The three sparkline buttons share one renderer; the family is reported
    rather than silently ignored. */
 tg('#bSparkLine',()=>{insertSparkline();setStatusMode(T('bSparkLine'));});
 tg('#bSparkCol',()=>{insertSparkline();setStatusMode(T('bSparkCol'));});
 tg('#bSparkWin',()=>{insertSparkline();setStatusMode(T('bSparkWin'));});
 /* Icons and 3D Models reuse the shape galleries that already exist. */
 tg('#bIIcons',()=>popMenu($('#bIIcons'),[
  {head:T('bIIcons')},
  {label:T('bShRect'),action:()=>insertDrawing('rect')},
  {label:T('bShEllipse'),action:()=>insertDrawing('ellipse')},
  {label:T('bShArrow'),action:()=>insertDrawing('arrow')}]));
 tg('#bI3D',()=>popMenu($('#bI3D'),[
  {head:T('bI3D')},
  {label:T('bShRect'),action:()=>insertDrawing('rect')},
  {label:T('bShTri'),action:()=>insertDrawing('triangle')}]));
 /* A slicer and a timeline are filter affordances, so they drive the filter. */
 tg('#bSlicer',()=>{toggleFilter();syncRibbon();setStatusMode(T('bSlicer'));});
 tg('#bTimeline',()=>{toggleFilter();syncRibbon();setStatusMode(T('bTimeline'));});
 /* No equation engine and no map service: they report that, not a fake success. */
 tg('#bEquation',()=>setStatusMode(T('insSoon')));
 tg('#bMaps',()=>setStatusMode(T('insSoon')));

 tg('#bSmartArt',insertSmartArt);
 tg('#bTable',()=>makeTable('#217346'));
 tg('#bRecTbl',openRec);
 tg('#bRecPiv',openRec);
 tg('#bPivot',openPivot);
 tg('#bSShot',openPic);
 tg('#bSparklines',insertSparkline);
 tg('#bIFilter',()=>{toggleFilter();syncRibbon();});
 tg('#bISymMore',()=>popMenu($('#bISymMore'),
  ['±','≈','≠','≤','≥','√','∑','∏','∫','∞','α','β','γ','π','Ω','Δ','θ','λ','μ','°','′','″','€','£','¥','₹','©','®','™','★','☆','♥','✓','✔','✗','→','←','↑','↓','⇒','⇔','•','§','¶','†','‡','‰'].map(s2=>({label:s2,action:()=>setRaw(active,(rawOf(active)||'')+s2)}))));
 const pvc=$('#pivotClose');if(pvc)pvc.onclick=()=>$('#pivotDlg').classList.remove('open');
 const rcc=$('#recClose');if(rcc)rcc.onclick=()=>$('#recDlg').classList.remove('open');
 const hpc=$('#helpClose');if(hpc)hpc.onclick=()=>{const d=$('#helpDlg');if(d)d.classList.remove('open');};
 const picc=$('#picClose');if(picc)picc.onclick=()=>$('#picDlg').classList.remove('open');
 /* --- Excel-mirroring additions: Home▸Cells Format, Data▸Get & Transform --- */
 tg('#bFormat',()=>popMenu($('#bFormat'),[
  {head:T('bFormat')},
  {label:T('colWidth'),action:()=>{const c=refToRC(active).c;const w=prompt(T('colWidth'),colW[c]);
   if(w!==null&&+w>=40&&+w<=420){colW[c]=clamp(+w,40,420);applyColW();saveLS();}}},
  {label:T('autoFit'),action:()=>{const c=refToRC(active).c;let mx=0;
   for(let r=0;r<ROWS;r++){const cel=cell(refOf(r,c));
    if(cel&&cel.raw!=null&&cel.raw!==''){const len=String(dispVal(refOf(r,c))).length;if(len>mx)mx=len;}}
   colW[c]=clamp(16+mx*8,40,420);applyColW();saveLS();renderAll();}},
  {label:T('defWidth'),action:()=>{const c=refToRC(active).c;colW[c]=90;applyColW();saveLS();renderAll();}}]));
 tg('#bGetData',()=>popMenu($('#bGetData'),[
  {head:T('gGetData')},
    {label:T('impCsvMenu'),action:()=>{const fi=$('#fileIn');if(fi)fi.click();}},
  {label:T('getDataHint'),action:()=>{}}]));
 /* --- Home ▸ Styles: Format as Table gallery --- */
 tg('#bFmtTable',()=>popMenu($('#bFmtTable'),[
  {head:T('bFmtTable')},
  {label:'▦ '+T('tblGreen'),action:()=>makeTable('#217346')},
  {label:'▦ '+T('tblBlue'),action:()=>makeTable('#2e75b6')},
  {label:'▦ '+T('tblOrange'),action:()=>makeTable('#c55a11')},
  {label:'▦ '+T('tblPurple'),action:()=>makeTable('#7030a0')},
  {label:'▦ '+T('tblGray'),action:()=>makeTable('#595959')}]));
 /* --- Home ▸ Add-ins --- */
 tg('#bAddinAI',()=>{const p=$('#aiPanel');if(p){p.classList.add('open');
  if(!p.dataset.welcomed){p.dataset.welcomed='1';aiMsg(T('aiWelcome'),'bot');}}
  const i=$('#aiInput');if(i)i.focus();});
 tg('#bAddins',()=>popMenu($('#bAddins'),[
  {head:T('gAddins')},
  {label:'🎲 '+T('addinRandom'),action:()=>{const q=rect();
   for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++)
    setRaw(refOf(r,c),String(1+Math.floor(Math.random()*100)));
   renderAll();setStatusMode(T('addinRandom'));}},
  {label:'📅 '+T('addinDate'),action:()=>{setRaw(active,new Date().toLocaleDateString());
   renderAll();setStatusMode(T('addinDate'));}},
  {label:'🧹 '+T('addinClean'),action:()=>{const q=rect();let n=0;
   for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++){const ref=refOf(r,c);
    const v=rawOf(ref);if(typeof v==='string'&&v!==v.trim()){setRaw(ref,v.trim());n++;}}
   renderAll();setStatusMode(T('addinClean')+(n?' ('+n+')':''));}}]));
  /* --- Page Layout tab (Themes, Page Setup, Scale to Fit, Sheet Options) --- */
 tg('#bCut',()=>{clip.focus();});
 tg('#bCopy',()=>{clip.focus();});
 tg('#bPaste',()=>{clip.focus();});
 tg('#bFPainter',()=>armFormatPainter());
 document.querySelectorAll('[data-al]').forEach(b=>{b.onclick=()=>applyStyle({al:b.dataset.al});});
 $('#numfmt').onchange=e=>{applyStyle({numfmt:e.target.value});e.target.selectedIndex=0;};
 applyColW();applyZoom();applyView();applySheetOpts();setFx(wb.fx||'subtle');applySheetBg();applyPageSetup();syncRibbon();setBookName();}
function init(){
 let savedLang=null;try{savedLang=localStorage.getItem(LSKLANG);}catch(e){}
 LANG=['hi','np','en'].includes(savedLang)?savedLang:'en';
 buildGrid();
 try{const s=localStorage.getItem(LSKEY);wb=s?JSON.parse(s):defaultWB();}catch(e){wb=defaultWB();}
 if(!wb||!wb.sheets||!wb.sheets.length)wb=defaultWB();
 if(Array.isArray(wb.colW)&&wb.colW.length===COLS)colW=wb.colW;
 const langSel=$('#lang');langSel.value=LANG;langSel.onchange=()=>applyLang(langSel.value);
 applyLang(LANG);
 applyColW();
 initAI();
 initVoice();
 try{const th=wb.theme;if(th&&th!=='default')document.body.setAttribute('data-theme',th);}catch(e){}
 if(wb.accent){try{applyAccent(wb.accent);}catch(e){}}
 if(wb.sheetFont){try{applyThemeFont(wb.sheetFont);}catch(e){}}
 if(wb.fx&&wb.fx!=='subtle'){try{setFx(wb.fx);}catch(e){}}
 initExtras();
 initRibbon();
 $('#bExport').onclick=exportCSV;
 $('#bXlsx').onclick=exportXLSX;
 $('#bAllCsv').onclick=exportAllCsvZip;
 $('#fileIn').onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();
  rd.onload=()=>importCSV(String(rd.result));rd.readAsText(f);e.target.value='';};
 $('#bUndo').onclick=undo;$('#bRedo').onclick=redo;
 $('#bB').onclick=()=>applyStyle({b:!styleOf(active).b});
 $('#bI').onclick=()=>applyStyle({i:!styleOf(active).i});
 $('#bU').onclick=()=>applyStyle({u:!styleOf(active).u});
 document.querySelectorAll('[data-al]').forEach(b=>b.onclick=()=>applyStyle({al:b.dataset.al}));
 $('#colFont').oninput=e=>applyStyle({color:e.target.value});
 $('#colBg').oninput=e=>applyStyle({bg:e.target.value});
 $('#numfmt').onchange=e=>{applyStyle({numfmt:e.target.value});e.target.selectedIndex=0;};
 fbar.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();setRaw(active,fbar.value);moveSel(1,0,false);}
  else if(e.key==='Escape'){fbar.value=rawOf(active);fbar.blur();}});
 fbar.addEventListener('focus',()=>{if(!editing)fbar.value=rawOf(active);});
 window.addEventListener('beforeunload',saveLS);
}
/* ================= Draw tab: drawings layer (shapes, ink, pictures) ================= */
/* NOTE: state must be declared BEFORE init() runs below. The init() lifecycle
   reaches renderDrawings() -> ensureDrawLayer() -> initDrawEvents(), which reads
   drawEventsInitialized. A let declaration placed after the init() call sits in
   the temporal dead zone (TDZ) at that point and throws
   "Cannot access 'drawEventsInitialized' before initialization". */
let drawMode=null,drawDrag=null,inkStroke=null,drawEventsInitialized=false;

/* Page Setup constants — ALSO read during init() (initRibbon -> applyPageSetup ->
   pageSetup()/fitScaleFactor()), so they must be declared before init() runs
   to avoid the same temporal-dead-zone ReferenceError. */
const PAPER_MM={A4:[210,297],A3:[297,420],A5:[148,210],Letter:[215.9,279.4],Legal:[215.9,355.6],Tabloid:[279.4,431.8]};
const MARGIN_PRESETS={normal:{top:1.9,bottom:1.9,left:1.8,right:1.8},narrow:{top:1.27,bottom:1.27,left:1.27,right:1.27},wide:{top:2.54,bottom:2.54,left:2.54,right:2.54}};
const PS_DEFAULTS={orientation:'portrait',size:'A4',margin:'normal',centerH:false,centerV:false};

init();

function drawingsOf(){const s=sheet();if(!Array.isArray(s.drawings))s.drawings=[];return s.drawings;}
function penColor(){const p=$('#penColor');return p&&p.value?p.value:'#217346';}
function penWidth(){const p=$('#penWidth');return p?+p.value||4:4;}
function ensureDrawLayer(){const wrap=$('#gridwrap');if(!wrap||!grid)return null;
 let dl=$('#drawLayer');
 if(!dl){dl=document.createElement('div');dl.id='drawLayer';wrap.appendChild(dl);initDrawEvents(dl);}
 dl.style.width=(grid.offsetWidth+120)+'px';dl.style.height=(grid.offsetHeight+120)+'px';
 return dl;}
function drawEl(d){const el=document.createElement('div');el.className='draw';el.dataset.did=d.id;
 el.style.left=d.x+'px';el.style.top=d.y+'px';el.style.width=d.w+'px';
 el.style.height=Math.max(d.h,2)+'px';
 if(d.kind==='rect'){el.style.border='2px solid '+(d.color||'#217346');}
 else if(d.kind==='ellipse'){el.style.border='2px solid '+(d.color||'#217346');el.style.borderRadius='50%';}
 else if(d.kind==='text'){el.style.border='1px dashed transparent';el.style.padding='2px 4px';
  el.style.fontSize=(d.fs||13)+'px';el.style.color=d.color||'#222';
  el.style.whiteSpace='pre-wrap';el.style.overflow='hidden';el.textContent=d.text||' ';}
 else if(d.kind==='image'){const im=document.createElement('img');im.src=d.src;
  im.style.width='100%';im.style.height='100%';im.style.objectFit='contain';im.draggable=false;el.appendChild(im);}
 else{const NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('width','100%');svg.setAttribute('height','100%');
  svg.setAttribute('viewBox','0 0 '+Math.max(d.w,2)+' '+Math.max(d.h,2));
  svg.style.overflow='visible';
  const col=d.color||'#217346';
  if(d.kind==='ink'||d.kind==='spark'){
   const pl=document.createElementNS(NS,'polyline');
   pl.setAttribute('points',d.points.map(p=>p[0]+','+p[1]).join(' '));
   pl.setAttribute('fill','none');pl.setAttribute('stroke',col);
   pl.setAttribute('stroke-width',d.kind==='spark'?2:(d.width||4));
   pl.setAttribute('stroke-linecap','round');pl.setAttribute('stroke-linejoin','round');
   svg.appendChild(pl);}
  else if(d.kind==='line'){const ln=document.createElementNS(NS,'line');
   ln.setAttribute('x1',1);ln.setAttribute('y1',Math.max(d.h,2)-1);
   ln.setAttribute('x2',Math.max(d.w,2)-1);ln.setAttribute('y2',1);
   ln.setAttribute('stroke',col);ln.setAttribute('stroke-width',2);svg.appendChild(ln);}
  else if(d.kind==='arrow'){const ln=document.createElementNS(NS,'line');
   ln.setAttribute('x1',1);ln.setAttribute('y1',Math.max(d.h,2)-2);
   ln.setAttribute('x2',Math.max(d.w,2)-6);ln.setAttribute('y2',3);
   ln.setAttribute('stroke',col);ln.setAttribute('stroke-width',2);svg.appendChild(ln);
   const hd=document.createElementNS(NS,'polygon');
   hd.setAttribute('points',(d.w-10)+',1 '+(d.w-1)+','+(d.h/2)+' '+(d.w-10)+','+(d.h-1));
   hd.setAttribute('fill',col);svg.appendChild(hd);}
  else if(d.kind==='triangle'){const pg=document.createElementNS(NS,'polygon');
   pg.setAttribute('points',(d.w/2)+',1 1,'+(d.h-1)+' '+(d.w-1)+','+(d.h-1));
   pg.setAttribute('fill','none');pg.setAttribute('stroke',col);pg.setAttribute('stroke-width',2);svg.appendChild(pg);}
  el.appendChild(svg);}
 const dx=document.createElement('div');dx.className='dx';dx.textContent='✕';dx.title='Delete';
 const hd2=document.createElement('div');hd2.className='dhandle';
 el.appendChild(dx);el.appendChild(hd2);
 return el;}
function renderDrawings(){const dl=ensureDrawLayer();if(!dl)return;
 dl.innerHTML='';
 drawingsOf().forEach(d=>dl.appendChild(drawEl(d)));}
function addDrawing(d){d.id='d'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);
 drawingsOf().push(d);saveLS();renderDrawings();
 selectDrawing(document.querySelector('#drawLayer .draw[data-did="'+d.id+'"]'));
 return d;}
function removeDrawing(id){const arr=drawingsOf();const i=arr.findIndex(x=>x.id===id);
 if(i>=0){arr.splice(i,1);saveLS();renderDrawings();}}
function findDrawing(id){return drawingsOf().find(x=>x.id===id)||null;}
function selectDrawing(el){document.querySelectorAll('#drawLayer .draw.sel').forEach(x=>x.classList.remove('sel'));
 if(el)el.classList.add('sel');}
function setDrawMode(mode){const dl=ensureDrawLayer();if(!dl)return;
 drawMode=(drawMode===mode)?null:mode;
 dl.classList.toggle('drawing',drawMode==='draw');
 dl.classList.toggle('erasing',drawMode==='erase');
 const bd=$('#bInkDraw'),be=$('#bInkErase');
 if(bd)bd.classList.toggle('on',drawMode==='draw');
 if(be)be.classList.toggle('on',drawMode==='erase');
 setStatusMode(drawMode==='draw'?T('inkOn'):drawMode==='erase'?T('inkOff'):T('sbReady'));}
function clearDrawings(){if(!drawingsOf().length)return;
 sheet().drawings=[];saveLS();renderDrawings();setStatusMode(T('drawCleared'));}
function insertDrawing(kind){const b=cellBox(active)||{x:60,y:60};
 const color=penColor();const base={kind:kind,color:color,x:b.x+10,y:b.y+10};
 if(kind==='line'||kind==='arrow')Object.assign(base,{w:150,h:26});
 else if(kind==='text')Object.assign(base,{w:180,h:40,text:''});
 else Object.assign(base,{w:150,h:84});
 addDrawing(base);setStatusMode(T('shapeList'));}
function initDrawEvents(dl){
 dl.addEventListener('mousedown',e=>{
  const target=e.target.closest('.draw');
  if(drawMode==='erase'){if(target)removeDrawing(target.dataset.did);
   e.preventDefault();e.stopPropagation();return;}
  if(drawMode==='draw')return;
  if(!target)return;
  if(target.isContentEditable){e.stopPropagation();return;}
  e.preventDefault();e.stopPropagation();
  selectDrawing(target);
  if(e.target.classList.contains('dx')){removeDrawing(target.dataset.did);return;}
  const d=findDrawing(target.dataset.did);if(!d)return;
  drawDrag={d:d,resizing:e.target.classList.contains('dhandle'),
   sx:e.clientX,sy:e.clientY,ox:d.x,oy:d.y,ow:d.w,oh:d.h,el:target};});
 dl.addEventListener('dblclick',e=>{const el=e.target.closest('.draw');if(!el)return;
  const d=findDrawing(el.dataset.did);
  if(!d||d.kind!=='text')return;
  el.contentEditable='true';el.focus();
  el.onblur=()=>{el.contentEditable='false';d.text=el.textContent;saveLS();};});
 dl.addEventListener('pointerdown',e=>{
  if(drawMode!=='draw')return;
  if(e.target.closest('.draw'))return;
  const r=dl.getBoundingClientRect();
  inkStroke={pts:[[e.clientX-r.left,e.clientY-r.top]]};
  try{dl.setPointerCapture(e.pointerId);}catch(err){}
  e.preventDefault();});
 dl.addEventListener('pointermove',e=>{if(!inkStroke)return;
  const r=dl.getBoundingClientRect();
  inkStroke.pts.push([e.clientX-r.left,e.clientY-r.top]);});
 dl.addEventListener('pointerup',()=>{if(!inkStroke)return;
  const pts=inkStroke.pts;inkStroke=null;
  if(pts.length<2)return;
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  const minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs);
  const minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);
  const x0=minX-4,y0=minY-4,w=Math.max(10,maxX-minX+8),h=Math.max(10,maxY-minY+8);
  addDrawing({kind:'ink',x:x0,y:y0,w:w,h:h,color:penColor(),width:penWidth(),
   points:pts.map(p=>[p[0]-x0,p[1]-y0])});});
  if(!drawEventsInitialized){
 document.addEventListener('mousemove',e=>{if(!drawDrag)return;
  const dx2=e.clientX-drawDrag.sx,dy2=e.clientY-drawDrag.sy,d=drawDrag.d;
  if(drawDrag.resizing){d.w=Math.max(16,drawDrag.ow+dx2);d.h=Math.max(6,drawDrag.oh+dy2);}
  else{d.x=drawDrag.ox+dx2;d.y=drawDrag.oy+dy2;}
  drawDrag.el.style.left=d.x+'px';drawDrag.el.style.top=d.y+'px';
  drawDrag.el.style.width=d.w+'px';drawDrag.el.style.height=Math.max(d.h,2)+'px';});
 document.addEventListener('mouseup',()=>{if(!drawDrag)return;
  drawDrag=null;saveLS();renderDrawings();});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&drawMode&&!editing)setDrawMode(drawMode);});}
  drawEventsInitialized = true;
  }

/* ================= Format as Table =================
   Professional table style: clear header row, zebra-banded body rows,
   per-column alignment (text left, numbers right), subtle grid borders and
   consistent Calibri 11 typography. Column type is detected from the
   evaluated values (numbers, including numeric strings, count as numeric;
   empty cells abstain), so alignment follows the data, not the position.
   All writes go straight to sheet().cells behind ONE snapshot so the whole
   format is a single Ctrl+Z -- applyStyle/applyBorderPatch would each push
   their own history entry (and per-call renderAll), splitting one action
   into many. Border shape matches applyBorderCell's 'all edges' result. */
function makeTable(color){
 let q=rect();
 if(q.r1===q.r2&&q.c1===q.c2)q=dataRange();
 if(q.r2-q.r1<1){alert(T('tblNoData'));return;}
 const sA=selA,sB=selB;
 const band=tintForTable(color);
 snapshot();
 const cs=sheet().cells;
 const hdrRow=q.r1, bodyTop=q.r1+1;
 /* Per-column type detection over the BODY rows (header never votes): a
    column is numeric when every non-empty evaluated value is a number. */
 const colIsNum={};
 for(let c=q.c1;c<=q.c2;c++){
  let num=0,txt=0;
  for(let r=bodyTop;r<=q.r2;r++){
   const v=vals[refOf(r,c)];
   if(v===''||v==null)continue;
   if(typeof v==='number'&&isFinite(v))num++;
   else if(numOrNull(v)!==null)num++;
   else txt++;
  }
  colIsNum[c]=(num>0&&txt===0);
 }
 /* Subtle hairline grid on every cell of the table (thin, Office-style). */
 const gridBorder={t:'thin',b:'thin',l:'thin',r:'thin'};
 const put=(r,c,patch)=>{
  const ref=refOf(r,c),cel=cs[ref]||{};
  cel.s=Object.assign({},cel.s||{},patch);cs[ref]=cel;
 };
 for(let c=q.c1;c<=q.c2;c++){
  /* Header: bold white on the accent, centred, Calibri 11. */
  put(hdrRow,c,{b:1,color:'#ffffff',bg:color,ff:'Calibri',fs:11,
   al:'center',va:'middle',border:gridBorder});
  for(let r=bodyTop;r<=q.r2;r++){
   const zebra=(r-bodyTop)%2===1;
   /* Zebra banding tints every second body row; alignment follows the
      detected column type (storing al makes the choice explicit,
      exportable and undoable rather than relying on paint()'s default). */
   put(r,c,Object.assign({ff:'Calibri',fs:11,va:'middle',
    border:gridBorder,al:colIsNum[c]?'right':'left'},zebra?{bg:band}:{}));
  }
 }
 selA=sA;selB=sB;renderAll();saveLS();setStatusMode(T('tblDone'));}
/* Zebra tint for a table accent: the accent at ~12% over white, so bands
   read as belonging to the header colour without fighting the grid. */
function tintForTable(color){
 const m=/^#?([0-9a-f]{6})$/i.exec(String(color||'').trim());
 if(!m)return '#eaf3ee';
 const n=parseInt(m[1],16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;
 const mix=(ch)=>Math.round(ch+(255-ch)*0.88);
 return '#'+((1<<24)+(mix(r)<<16)+(mix(g)<<8)+mix(b)).toString(16).slice(1);}

/* ================= PivotTable ================= */
let pivotSel={row:null,vals:[]};
function pivotData(){let q=rect();
 if(q.r1===q.r2&&q.c1===q.c2)q=dataRange();
 if(q.r2-q.r1<1||q.c2-q.c1<1)return null;
 const heads=[];for(let c=q.c1;c<=q.c2;c++)
  heads.push({c:c,name:String(rawOf(refOf(q.r1,c))||colName(c))});
 const rows=[];
 for(let r=q.r1+1;r<=q.r2;r++){const o={};
  heads.forEach(h=>{o[h.c]=rawOf(refOf(r,h.c));});rows.push(o);}
 return{heads:heads,rows:rows};}
function openPivot(){const dlg=$('#pivotDlg');if(!dlg)return;
 const pd=pivotData();
 if(!pd){alert(T('pivotEmpty'));return;}
 pivotSel={row:null,vals:[]};
 $('#pivotTitle').textContent=T('pivotTitle');
 $('#pivotDesc').textContent=T('pivotDesc');
 $('#pivotRowLbl').textContent=T('pivotPick');
 $('#pivotValLbl').textContent=T('pivotPick');
 const go=$('#pivotGo');go.textContent=T('pivotGo');go.onclick=buildPivot;
 const pf=$('#pivotFields'),pv=$('#pivotDrop');pf.innerHTML='';pv.innerHTML='';
 pd.heads.forEach(h=>{
  const isNum=pd.rows.some(r=>numOrNull(r[h.c])!==null);
  const lab=document.createElement('label');
  const cb=document.createElement('input');
  cb.type=isNum?'checkbox':'radio';cb.name='prowField';cb.value=h.c;
  cb.onchange=()=>{if(cb.checked)pivotSel.row=h.c;};
  lab.appendChild(cb);lab.appendChild(document.createTextNode(' '+h.name));
  pf.appendChild(lab);
  if(isNum){const lab2=document.createElement('label');
   const cb2=document.createElement('input');
   cb2.type='checkbox';cb2.value=h.c;
   cb2.onchange=()=>{if(cb2.checked)pivotSel.vals.push(h.c);
    else pivotSel.vals=pivotSel.vals.filter(x=>x!==h.c);};
   lab2.appendChild(cb2);lab2.appendChild(document.createTextNode(' '+h.name));
   pv.appendChild(lab2);}});
 dlg.classList.add('open');}
function buildPivot(){const pd=pivotData();if(!pd)return;
 if(pivotSel.row==null||!pivotSel.vals.length){alert(T('pivotNeed'));return;}
 const groups={};const order=[];
 pd.rows.forEach(r=>{const k=String(r[pivotSel.row]);
  if(!groups[k]){groups[k]={};order.push(k);}
  pivotSel.vals.forEach(c=>{const n=numOrNull(r[c]);
   groups[k][c]=(groups[k][c]||0)+(n===null?0:n);});});
 const rowName=pd.heads.find(h=>h.c===pivotSel.row).name;
 const cs={};cs['A1']={raw:rowName,s:{b:true}};
 pivotSel.vals.forEach((c,i)=>{const hn=pd.heads.find(h=>h.c===c).name;
  cs[refOf(0,1+i)]={raw:hn,s:{b:true}};});
 let rI=1;
 order.forEach(k=>{rI++;
  cs['A'+rI]={raw:k};
  pivotSel.vals.forEach((c,i)=>{cs[refOf(rI-1,1+i)]={raw:Math.round(groups[k][c]*100)/100};});});
 rI++;
 cs['A'+rI]={raw:'Total',s:{b:true}};
 pivotSel.vals.forEach((c,i)=>{const cn=colName(1+i);
  cs[cn+rI]={raw:'=SUM('+cn+'2:'+cn+(rI-1)+')',s:{b:true}};});
 wb.sheets.push({name:'Pivot'+(wb.sheets.length+1),cells:cs});
 wb.cur=wb.sheets.length-1;
 const dlg=$('#pivotDlg');if(dlg)dlg.classList.remove('open');
 saveLS();renderAll();renderTabs();setStatusMode(T('pivotDone'));}
function openRec(){const dlg=$('#recDlg');if(!dlg)return;
 $('#recTitle').textContent=T('recTitle');
 const list=$('#pivotList');list.innerHTML='';
 const pd=pivotData();
 if(!pd){list.textContent=T('pivotEmpty');dlg.classList.add('open');return;}
 const combos=[];
 pd.heads.forEach(rh=>{if(pd.rows.some(r=>numOrNull(r[rh.c])!==null))return;
  pd.heads.forEach(vh=>{if(vh.c===rh.c)return;
   if(pd.rows.some(r=>numOrNull(r[vh.c])!==null))combos.push([rh,vh]);});});
 if(!combos.length){list.textContent=T('recEmpty');dlg.classList.add('open');return;}
 combos.slice(0,10).forEach(pair=>{const rh=pair[0],vh=pair[1];
  const sums={};pd.rows.forEach(r=>{const n=numOrNull(r[vh.c]);
   if(n!==null){const k=String(r[rh.c]);sums[k]=(sums[k]||0)+n;}});
  const row=document.createElement('div');row.className='prow';
  const lbl=document.createElement('span');lbl.textContent=rh.name+' → SUM('+vh.name+')';
  const cols=document.createElement('span');cols.className='cols';
  cols.textContent=Object.keys(sums).slice(0,4)
   .map(k=>k+': '+Math.round(sums[k]*100)/100).join(' · ');
  row.appendChild(lbl);row.appendChild(cols);
  row.onclick=()=>{pivotSel={row:rh.c,vals:[vh.c]};buildPivot();
   dlg.classList.remove('open');};
  list.appendChild(row);});
 dlg.classList.add('open');}

/* ================= SmartArt process & sparklines ================= */
function insertSmartArt(){const q=rect();const labels=[];
 for(let i=0;i<3;i++){const c=Math.min(q.c1+i,q.c2);
  const v=String(rawOf(refOf(q.r1,c))||'');
  labels.push(v!==''?v:'Step '+(i+1));}
 const b=cellBox(active)||{x:60,y:60};const color=penColor();
 const x0=b.x+10,y0=b.y+10;
 addDrawing({kind:'rect',x:x0,y:y0,w:130,h:54,color:color});
 addDrawing({kind:'text',x:x0+6,y:y0+14,w:118,h:26,text:labels[0],color:'#222',fs:12});
 addDrawing({kind:'arrow',x:x0+136,y:y0+24,w:44,h:18,color:color});
 addDrawing({kind:'rect',x:x0+186,y:y0,w:130,h:54,color:color});
 addDrawing({kind:'text',x:x0+192,y:y0+14,w:118,h:26,text:labels[1],color:'#222',fs:12});
 addDrawing({kind:'arrow',x:x0+322,y:y0+24,w:44,h:18,color:color});
 addDrawing({kind:'rect',x:x0+372,y:y0,w:130,h:54,color:color});
 addDrawing({kind:'text',x:x0+378,y:y0+14,w:118,h:26,text:labels[2],color:'#222',fs:12});
 setStatusMode(T('smartList'));}
function insertSparkline(){const q=rect();const nums=[];const horiz=(q.c2-q.c1)>=(q.r2-q.r1);
 if(horiz){for(let c=q.c1;c<=q.c2;c++){const n=numOrNull(vals[refOf(q.r1,c)]);if(n!==null)nums.push(n);}}
 else{for(let r=q.r1;r<=q.r2;r++){const n=numOrNull(vals[refOf(r,q.c1)]);if(n!==null)nums.push(n);}}
 if(nums.length<2){alert(T('noData'));return;}
 const tr=horiz?Math.min(q.r1,ROWS-1):Math.min(q.r2+1,ROWS-1);
 const tc=horiz?Math.min(q.c2+1,COLS-1):Math.min(q.c1,COLS-1);
 const b=cellBox(refOf(tr,tc));if(!b){alert(T('noData'));return;}
 const w=Math.max(90,b.w*2),h=Math.max(30,b.h);
 const min=Math.min.apply(null,nums),max=Math.max.apply(null,nums);
 const span=(max-min)||1;
 const pts=nums.map((n,i)=>[4+i*(w-8)/(nums.length-1),h-4-(h-8)*(n-min)/span]);
 addDrawing({kind:'spark',x:b.x,y:b.y,w:w,h:h,color:penColor(),points:pts});
 setStatusMode(T('sparkDone'));}

/* ================= Picture / screenshot (Insert) ================= */
function insertImageDrawing(src){const im=new Image();
 im.onload=()=>{const b=cellBox(active)||{x:60,y:60};
  const w=Math.min(320,im.width||320);
  const h=Math.round(w*((im.height&&im.width)?im.height/im.width:0.66));
  addDrawing({kind:'image',x:b.x+10,y:b.y+10,w:w,h:h,src:src});
  setStatusMode(T('picDone'));};
 im.onerror=()=>alert('Image could not be loaded');
 im.src=src;}
function gridSnapshot(){const q=rect();const dlg=$('#picDlg');
 if(dlg)dlg.classList.remove('open');
 const cw=[];
 for(let c=q.c1;c<=q.c2;c++){const col=document.querySelector('#grid col[data-c="'+c+'"]');
  cw.push(col?(parseFloat(col.style.width)||90):90);}
 const W=cw.reduce((a,b)=>a+b,0)+1,H=(q.r2-q.r1+1)*22+1;
 const cv=document.createElement('canvas');cv.width=Math.max(W,10);cv.height=Math.max(H,10);
 const ctx=cv.getContext('2d');
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cv.width,cv.height);
 ctx.strokeStyle='#d0d0d0';ctx.lineWidth=1;
 let cx=0;
 for(let i=0;i<=cw.length;i++){ctx.beginPath();ctx.moveTo(cx+.5,0);ctx.lineTo(cx+.5,cv.height);ctx.stroke();
  if(i<cw.length)cx+=cw[i];}
 for(let j=0;j<=q.r2-q.r1+1;j++){ctx.beginPath();ctx.moveTo(0,j*22+.5);ctx.lineTo(cv.width,j*22+.5);ctx.stroke();}
 ctx.fillStyle='#111';ctx.font='12px Segoe UI,Calibri,Arial';ctx.textBaseline='middle';
 for(let r=q.r1;r<=q.r2;r++){let x=0;
  for(let c=q.c1;c<=q.c2;c++){const ref=refOf(r,c);
   const txt=vals[ref]==null?'':String(dispVal(ref));
   if(txt)ctx.fillText(txt,x+4,(r-q.r1)*22+11,cw[c-q.c1]-8);
   x+=cw[c-q.c1];}}
 insertImageDrawing(cv.toDataURL('image/png'));}
function openPic(){const dlg=$('#picDlg');if(!dlg)return;
 $('#picTitle').textContent=T('picTitle');
 $('#picLbl').textContent=T('picLbl');
 $('#picBrowse').textContent=T('picBrowse');
 $('#picShot').textContent=T('picShot');
 const pin=$('#picIn');
 if(pin&&!pin.dataset.bound){pin.dataset.bound='1';
  pin.onchange=e=>{const f=e.target.files[0];if(!f)return;
   const rd=new FileReader();rd.onload=()=>{insertImageDrawing(String(rd.result));
    $('#picDlg').classList.remove('open');};rd.readAsDataURL(f);e.target.value='';};}
 const pb=$('#picBrowse');if(pb)pb.onclick=()=>{const pin2=$('#picIn');if(pin2)pin2.click();};
 const ps=$('#picShot');if(ps)ps.onclick=gridSnapshot;
 dlg.classList.add('open');}

/* ================= Help tab ================= */
function openHelp(){const dlg=$('#helpDlg');if(!dlg)return;
 dlg.classList.add('open');
 const b=$('#helpBody');if(b)b.scrollTop=0;}



/* ================= Page Layout: Themes, Page Setup, Scale to Fit, Sheet Options ================= */
/* --- Themes: theme fonts + effects (theme & accent live in the Themes & accent colors section) --- */
function applyThemeFont(f){const m=String(f||'').replace(/[^\w \-]/g,'').trim();
 if(!m){document.documentElement.style.removeProperty('--sheet-font');grid.style.fontFamily='';wb.sheetFont='';return;}
 grid.style.fontFamily=m;document.documentElement.style.setProperty('--sheet-font',m);}
function themeFontMenu(anchor){const cur=wb.sheetFont||'Calibri';
 popMenu(anchor,[{head:T('bThemeFonts')}].concat(
  ['Segoe UI','Calibri','Arial','Tahoma','Verdana','Georgia','Times New Roman','Trebuchet MS','Consolas','Courier New'].map(f=>
   ({label:(f===cur?'✔ ':'')+f,action:()=>{wb.sheetFont=f;saveLS();applyThemeFont(f);setStatusMode(T('bThemeFonts')+': '+f);}})),
  [null,{label:T('thmReset')+' — '+T('bThemeFonts'),action:()=>{wb.sheetFont='';saveLS();applyThemeFont('');setStatusMode(T('thmReset'));}}]));}
function setFx(name){if(!name||name==='subtle')document.body.removeAttribute('data-fx');
 else document.body.setAttribute('data-fx',name);
 wb.fx=name||'subtle';}
function fxMenu(anchor){const cur=wb.fx||'subtle';
 popMenu(anchor,[{head:T('bThemeFx')}].concat(
  [['subtle','fxSubtle'],['soft','fxSoft'],['round','fxRound'],['sharp','fxSharp']].map(x=>
   ({label:(cur===x[0]?'✔ ':'')+T(x[1]),action:()=>{setFx(x[0]);saveLS();setStatusMode(T('bThemeFx')+': '+T(x[1]));}}))));}

/* --- Page Setup: paper size, margins, orientation ---
   NOTE: PAPER_MM / MARGIN_PRESETS / PS_DEFAULTS are declared near the top of the
   file (just before init()) because applyPageSetup() runs during the init
   lifecycle and reads them. */
function pageSetup(){const ps=Object.assign({},PS_DEFAULTS,wb.pageSetup||{});
 ps.margins=Object.assign({},MARGIN_PRESETS[ps.margin]||MARGIN_PRESETS.normal,ps.margins||{});
 wb.pageSetup=ps;return ps;}
function curMargins(){return pageSetup().margins;}
function setPageSetup(patch){const ps=pageSetup();Object.assign(ps,patch||{});
 if(patch&&patch.margin&&MARGIN_PRESETS[patch.margin])ps.margins=Object.assign({},MARGIN_PRESETS[patch.margin]);
 saveLS();applyPageSetup();syncRibbon();}
/* --- Page Setup: print area, page breaks, sheet options --- */
function plainA1(t){return String(t||'').replace(/\$/g,'');}
function printScalePct(){return clamp(Math.round(+wb.printScale||100),10,400);}
function printAreaRG(){if(!wb.printArea)return null;try{return rangeFromStr(plainA1(wb.printArea));}catch(e){return null;}}
function unionA1(a,b){if(!a)return b;if(!b)return a;
 try{const A=rangeFromStr(plainA1(a)),B=rangeFromStr(plainA1(b));
  return rangeA1({r1:Math.min(A.r1,B.r1),r2:Math.max(A.r2,B.r2),c1:Math.min(A.c1,B.c1),c2:Math.max(A.c2,B.c2)});}catch(e){return b;}}
function usedRG(){const rg=printAreaRG();if(rg)return rg;
 let r2=-1,c2=-1;const cs=sheet().cells;
 for(const ref in cs){const cel=cs[ref];if(!cel||cel.raw==null||cel.raw==='')continue;
  const p=refToRC(ref);if(p.r>r2)r2=p.r;if(p.c>c2)c2=p.c;}
 return r2<0?null:{r1:0,c1:0,r2,c2};}
function titleRows(){const m=/^\$?(\d+)(?:\s*:\s*\$?(\d+))?$/.exec(String(wb.printTitles||'').replace(/\s/g,''));
 if(!m)return null;const a=clamp(+m[1]-1,0,ROWS-1),b=clamp(+(m[2]||m[1])-1,0,ROWS-1);return[a,b];}
function applyBreaks(){const arr=wb.breaks||[],rg=printAreaRG(),tr=titleRows();
 const body=grid.tBodies&&grid.tBodies[0];if(!body)return;
 const rows=body.rows;
 for(let i=0;i<rows.length;i++){const row=rows[i];
  row.classList.toggle('brk',arr.includes(i));
  row.classList.toggle('paout',!!rg&&(i<rg.r1||i>rg.r2));
  row.classList.toggle('ptitle',!!tr&&i>=tr[0]&&i<=tr[1]);}}
/* --- Page Setup: fit-to-pages and the generated print stylesheet --- */
function fitScaleFactor(){if(!(wb.fitW||wb.fitH))return null;
 const rg=usedRG();if(!rg)return 1;
 const ps=pageSetup(),m=curMargins(),pmm=PAPER_MM[ps.size]||PAPER_MM.A4;
 const land=ps.orientation==='landscape';
 const pw=(land?pmm[1]:pmm[0])*3.7795,ph=(land?pmm[0]:pmm[1])*3.7795;
 const usableW=Math.max(60,pw-((+m.left||0)+(+m.right||0))*37.795);
 const usableH=Math.max(60,ph-((+m.top||0)+(+m.bottom||0))*37.795);
 let w=34;for(let c=rg.c1;c<=rg.c2;c++)w+=(colW[c]||88);
 const ht=(rg.r2-rg.r1+1)*22+22;
 const sx=wb.fitW?usableW/w:1,sy=wb.fitH?usableH/ht:1;
 return clamp(Math.min(sx,sy),0.1,1);}
function printPlan(){const fit=fitScaleFactor();
 return{pct:fit!=null?clamp(Math.round(fit*100),10,400):printScalePct(),fit:fit!=null};}
function applyPageSetup(){
 let st=$('#pgSetup');if(!st){st=document.createElement('style');st.id='pgSetup';document.head.appendChild(st);}
 const ps=pageSetup(),m=curMargins(),plan=printPlan();
 const rules=['@page{size:'+(ps.size||'A4')+(ps.orientation==='landscape'?' landscape':' portrait')+';margin:'+(+m.top||0)+'cm '+(+m.right||0)+'cm '+(+m.bottom||0)+'cm '+(+m.left||0)+'cm}'];
 if(plan.pct!==100)rules.push('#grid{zoom:'+(plan.pct/100).toFixed(3)+'}');
 rules.push(wb.printGrid===false?'#grid td,#grid th{border-color:transparent!important}'
  :'table#grid.nogrid td,table#grid.nogrid th{border-color:#d4d4d4!important}');
 rules.push(wb.printHead===false?'#grid thead,#grid tbody th{display:none!important}'
  :'table#grid.nohead thead{display:table-header-group!important}table#grid.nohead tbody th{display:table-cell!important}');
 if(ps.centerH||ps.centerV)rules.push('#grid{'+(ps.centerH?'margin-left:auto;margin-right:auto;':'')+(ps.centerV?'margin-top:auto;margin-bottom:auto;':'')+'}');
 const rg=printAreaRG();
 if(rg){
  if(rg.r1>0)rules.push('#grid tbody tr:nth-child(-n+'+rg.r1+'){display:none!important}');
  rules.push('#grid tbody tr:nth-child(n+'+(rg.r2+2)+'){display:none!important}');
  if(rg.c1>0)rules.push('#grid tbody tr td:nth-child(-n+'+(rg.c1+1)+'){display:none!important}');
  rules.push('#grid tbody tr td:nth-child(n+'+(rg.c2+3)+'){display:none!important}');}
 st.textContent='@media print{'+rules.join('')+'}';}
function applySheetOpts(){if(!grid)return;
 grid.classList.toggle('nogrid',wb.showGrid===false);
 grid.classList.toggle('nohead',wb.showHead===false);
 applyPageSetup();}
/* --- Page Setup menus --- */
function orientMenu(anchor){const cur=pageSetup().orientation;
 popMenu(anchor,[{head:T('bOrient')},
  {label:(cur!=='landscape'?'✔ ':'')+T('orientP'),action:()=>{setPageSetup({orientation:'portrait'});setStatusMode(T('bOrient')+': '+T('orientP'));}},
  {label:(cur==='landscape'?'✔ ':'')+T('orientL'),action:()=>{setPageSetup({orientation:'landscape'});setStatusMode(T('bOrient')+': '+T('orientL'));}}]);}
function sizeMenu(anchor){const cur=pageSetup().size;const items=[{head:T('pgSize')}];
 Object.keys(PAPER_MM).forEach(k=>items.push({label:(cur===k?'✔ ':'')+k,action:()=>{setPageSetup({size:k});setStatusMode(T('pgSize')+': '+k);}}));
 items.push(null,{label:T('psMoreSizes'),action:openPageSetup});
 popMenu(anchor,items);}
function marginsMenu(anchor){const ps=pageSetup(),m=curMargins(),f=v=>Math.round(v*100)/100;
 const items=[{head:T('bMargins')},{head:'↑ '+f(m.top)+'   ↓ '+f(m.bottom)+'   ← '+f(m.left)+'   → '+f(m.right)+' cm'}];
 [['normal','margNormal'],['narrow','margNarrow'],['wide','margWide']].forEach(x=>items.push(
  {label:(ps.margin===x[0]?'✔ ':'')+T(x[1]),action:()=>{setPageSetup({margin:x[0],margins:Object.assign({},MARGIN_PRESETS[x[0]])});setStatusMode(T('bMargins')+': '+T(x[1]));}}));
 items.push(null,{label:T('margCustom'),action:openPageSetup});
 popMenu(anchor,items);}
function printAreaMenu(anchor){const sel=plainA1(rangeA1(rect())),cur=wb.printArea;
 const done=msg=>{saveLS();renderAll();syncRibbon();setStatusMode(msg);};
 popMenu(anchor,[{head:cur?T('bPrintArea')+' — '+cur:T('bPrintArea')},
  {label:(cur?'':'✔ ')+T('paSet')+'   ['+sel+']',action:()=>{wb.printArea=sel;done(T('bPrintArea')+': '+sel);}},
  {label:T('paAdd')+'   ['+sel+']',action:()=>{wb.printArea=unionA1(wb.printArea,sel);done(T('bPrintArea')+': '+wb.printArea);}},
  null,
  {label:T('paClear'),action:()=>{delete wb.printArea;done(T('paClear'));}}]);}
function breaksMenu(anchor){wb.breaks=wb.breaks||[];const row=rect().r1,has=wb.breaks.includes(row),brk=(wb.view||'normal')==='break';
 popMenu(anchor,[{head:T('bBreaks')+' — '+T('brkRow')+' '+(row+1)},
  {label:(has?'✔ ':'')+T('brkInsert'),action:()=>{if(!has){wb.breaks.push(row);wb.breaks.sort((a,b)=>a-b);}saveLS();renderAll();syncRibbon();setStatusMode(T('brkInsert')+' @'+(row+1));}},
  {label:T('brkRemove'),action:()=>{const i=wb.breaks.indexOf(row);if(i>=0){wb.breaks.splice(i,1);saveLS();renderAll();}setStatusMode(T('brkRemove')+' @'+(row+1));}},
  null,
  {label:(brk?'✔ ':'')+T('brkPreview'),action:()=>setViewMode(brk?'normal':'break')},
  {label:T('brkReset'),action:()=>{wb.breaks=[];saveLS();renderAll();setStatusMode(T('brkReset'));}}]);}
function applySheetBg(){const wrap=$('#gridwrap');if(!wrap)return;
 if(wb.bgUrl){wrap.style.backgroundImage='url("'+String(wb.bgUrl).replace(/["\\\n]/g,'')+'")';wrap.classList.add('pgbg');}
 else{wrap.style.backgroundImage='';wrap.classList.remove('pgbg');}}
function pickBgFile(){const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.style.display='none';
 document.body.appendChild(inp);
 inp.onchange=()=>{const f=inp.files&&inp.files[0];
  if(!f){inp.remove();return;}
  if(f.size>400000){setStatusMode(T('bgTooBig'));inp.remove();return;}
  const fr=new FileReader();
  fr.onload=()=>{wb.bgUrl=String(fr.result);saveLS();applySheetBg();setStatusMode(T('bBgPic')+': '+f.name);inp.remove();};
  fr.readAsDataURL(f);};
 inp.click();}
function bgMenu(anchor){popMenu(anchor,[{head:T('bBgPic')},
  {label:T('bgFile'),action:pickBgFile},
  {label:T('bgSet'),action:()=>{const u=prompt(T('bgSet'),wb.bgUrl&&wb.bgUrl.slice(0,5)!=='data:'?wb.bgUrl:'https://');
   if(u){wb.bgUrl=u;saveLS();applySheetBg();setStatusMode(T('bBgPic'));}}},
  null,
  {label:T('bgRemove'),action:()=>{delete wb.bgUrl;saveLS();applySheetBg();setStatusMode(T('bgRemove'));}}]);}
function titlesMenu(anchor){const r=rect();
 const rows='$'+(r.r1+1)+':$'+(Math.min(ROWS,r.r2+1)),cols='$'+colName(r.c1)+':$'+colName(r.c2);
 popMenu(anchor,[{head:T('bPrintTitles')},
  {label:T('ptTopRow')+'   ['+rows+']',action:()=>{wb.printTitles=rows;saveLS();renderAll();syncRibbon();setStatusMode(T('bPrintTitles')+': '+rows);}},
  {label:T('ptLeftCol')+'   ['+cols+']',action:()=>{wb.printTitlesCol=cols;saveLS();renderAll();syncRibbon();setStatusMode(T('bPrintTitles')+': '+cols);}},
  null,
  {label:T('ptClear'),action:()=>{delete wb.printTitles;delete wb.printTitlesCol;saveLS();renderAll();syncRibbon();setStatusMode(T('ptClear'));}},
  {label:T('ptDialog'),action:openPageSetup}]);}
/* --- Scale to Fit --- */
function fitOn(){return !!(wb.fitW||wb.fitH);}
function setFit(which,val){const n=val==='auto'?0:clamp(parseInt(val,10)||0,0,9);
 if(which==='w')wb.fitW=n||undefined;else wb.fitH=n||undefined;
 saveLS();renderAll();syncRibbon();}
function setPrintScale(p){wb.printScale=clamp(Math.round(+p||100),10,400);saveLS();renderAll();syncRibbon();}
function syncScaleSelect(){const ss=$('#scScale');if(!ss)return;
 if(fitOn()){ss.value='100';ss.disabled=true;ss.title=T('tipScaleFit');return;}
 ss.disabled=false;ss.title=T('tipScale');
 const val=String(printScalePct());
 if(!Array.prototype.some.call(ss.options,o=>o.value===val)){const o=document.createElement('option');o.value=val;o.textContent=val+'%';ss.appendChild(o);}
 ss.value=val;}
/* --- Page Setup dialog (dialog launcher + Custom Margins / Print Titles entry points) --- */
function fillPaperSizes(){const sel=$('#psSize');if(!sel||sel.options.length)return;
 Object.keys(PAPER_MM).forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=k;sel.appendChild(o);});}
function openPageSetup(){const d=$('#psDlg');if(!d)return;
 fillPaperSizes();
 const ps=pageSetup(),m=curMargins();
 const set=(id,v)=>{const el=$(id);if(el)el.value=v;},chk=(id,v)=>{const el=$(id);if(el)el.checked=!!v;};
 set('#psOrient',ps.orientation||'portrait');set('#psSize',ps.size||'A4');
 set('#psTop',+m.top);set('#psBottom',+m.bottom);set('#psLeft',+m.left);set('#psRight',+m.right);
 chk('#psCenterH',ps.centerH);chk('#psCenterV',ps.centerV);
 set('#psScale',printScalePct());set('#psFitW',wb.fitW||'');set('#psFitH',wb.fitH||'');
 set('#psTitleRows',wb.printTitles||'');set('#psTitleCols',wb.printTitlesCol||'');
 d.classList.add('open');
 const ok=$('#psOk');if(ok&&ok.focus){try{ok.focus();}catch(e){}}}
function closePageSetup(){const d=$('#psDlg');if(d)d.classList.remove('open');}
function numField(id,def){const el=$(id);if(!el)return def;const v=parseFloat(el.value);return isFinite(v)?v:def;}
function fieldVal(id){const el=$(id);return el&&el.value!=null?String(el.value).trim():'';}
function savePageSetupDialog(){
 const margins={top:clamp(numField('#psTop',1.9),0,10),bottom:clamp(numField('#psBottom',1.9),0,10),
  left:clamp(numField('#psLeft',1.8),0,10),right:clamp(numField('#psRight',1.8),0,10)};
 const oEl=$('#psOrient'),sEl=$('#psSize');
 setPageSetup({orientation:(oEl&&oEl.value)==='landscape'?'landscape':'portrait',size:(sEl&&sEl.value)||'A4',
  margin:'custom',margins,
  centerH:!!($('#psCenterH')&&$('#psCenterH').checked),centerV:!!($('#psCenterV')&&$('#psCenterV').checked)});
 wb.printScale=clamp(Math.round(numField('#psScale',100)),10,400);
 const fw=Math.round(numField('#psFitW',0)),fh=Math.round(numField('#psFitH',0));
 wb.fitW=fw>0?clamp(fw,1,9):undefined;
 wb.fitH=fh>0?clamp(fh,1,9):undefined;
 wb.printTitles=fieldVal('#psTitleRows')||undefined;
 wb.printTitlesCol=fieldVal('#psTitleCols')||undefined;
 saveLS();renderAll();syncRibbon();closePageSetup();setStatusMode(T('psSaved'));}
function resetPageSetupDialog(){
 wb.pageSetup=Object.assign({},PS_DEFAULTS,{margins:Object.assign({},MARGIN_PRESETS.normal)});
 delete wb.printArea;wb.printScale=100;delete wb.fitW;delete wb.fitH;
 delete wb.printTitles;delete wb.printTitlesCol;wb.breaks=[];wb.printGrid=true;wb.printHead=true;
 saveLS();renderAll();syncRibbon();openPageSetup();setStatusMode(T('psReset'));}
/* --- Page Layout tab wiring (buttons, check boxes, selects, dialog) --- */
function wirePageLayout(){const on=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
 on('#bTheme',()=>themeMenu($('#bTheme')));on('#bAccent',()=>accentMenu($('#bAccent')));
 on('#bThemeFonts',()=>themeFontMenu($('#bThemeFonts')));on('#bThemeFx',()=>fxMenu($('#bThemeFx')));
 on('#bMargins',()=>marginsMenu($('#bMargins')));on('#bOrient',()=>orientMenu($('#bOrient')));
 on('#bSize',()=>sizeMenu($('#bSize')));on('#bPrintArea',()=>printAreaMenu($('#bPrintArea')));
 on('#bBreaks',()=>breaksMenu($('#bBreaks')));on('#bBgPic',()=>bgMenu($('#bBgPic')));
 on('#bPrintTitles',()=>titlesMenu($('#bPrintTitles')));on('#bPgSetup',openPageSetup);
 on('#bPlPage',pagePreview);on('#bPlPrint',()=>window.print());
 const chk=(id,key,lbl)=>{const el=$(id);if(!el)return;
  el.onchange=()=>{wb[key]=el.checked;saveLS();renderAll();syncRibbon();
   setStatusMode(T(lbl)+': '+(el.checked?'✓':'✗'));};};
 chk('#bPlGrid','showGrid','bPlGrid');chk('#bPlGridP','printGrid','bPlGridPrint');
 chk('#bPlHead','showHead','bPlHead');chk('#bPlHeadP','printHead','bPlHeadPrint');
 const fw=$('#fitW');if(fw)fw.onchange=()=>{setFit('w',fw.value);
  setStatusMode(T('lblWidth')+' '+(fw.value==='auto'?T('fitAuto'):fw.value+' '+T('fitPage')));};
 const fh=$('#fitH');if(fh)fh.onchange=()=>{setFit('h',fh.value);
  setStatusMode(T('lblHeight')+' '+(fh.value==='auto'?T('fitAuto'):fh.value+' '+T('fitPage')));};
 const ss=$('#scScale');if(ss)ss.onchange=()=>{setPrintScale(ss.value);setStatusMode(T('lblScale')+' '+printScalePct()+'%');};
 const ok=$('#psOk');if(ok)ok.onclick=savePageSetupDialog;
 const ca=$('#psCancel');if(ca)ca.onclick=closePageSetup;
 const cl=$('#psClose');if(cl)cl.onclick=closePageSetup;
 const rs=$('#psReset');if(rs)rs.onclick=resetPageSetupDialog;
 syncScaleSelect();}

/* ================= Status bar, decimals, links, format painter, formula helpers ================= */
let fmtPaint=null;
function setStatusMode(t){const m=$('#sbMode');if(m)m.textContent=t;}
function applyNumDec(d){const q=rect();snapshot();const cs=sheet().cells;
 for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++){
  const ref=refOf(r,c);const cel=cs[ref]||{};const s2=Object.assign({},cel.s||{});
  const cur=s2.numdec==null?2:s2.numdec;const nxt=Math.min(8,Math.max(0,cur+d));
  s2.numdec=nxt;if(s2.numfmt!=='pct'&&s2.numfmt!=='comma')s2.numfmt='dec2';
  cel.s=s2;cs[ref]=cel;}
 saveLS();renderAll();}
function applyLink(u){const q=rect();snapshot();const cs=sheet().cells;
 for(let r=q.r1;r<=q.r2;r++)for(let c=q.c1;c<=q.c2;c++){
  const ref=refOf(r,c);const cel=cs[ref]||{};const s2=Object.assign({},cel.s||{});
  s2.link=u;s2.color='#0563c1';s2.u=true;cel.s=s2;cs[ref]=cel;}
 saveLS();renderAll();}
function applyFormatTo(ref,patch){if(!ref||!patch)return;snapshot();const cel=sheet().cells[ref]||{};
 cel.s=Object.assign({},cel.s||{},patch);sheet().cells[ref]=cel;saveLS();renderAll();}
function armFormatPainter(){fmtPaint=Object.assign({},styleOf(active));setStatusMode(T('sbPaint'));
 document.addEventListener('mousedown',fmtPaintPick,true);}
function fmtPaintPick(e){document.removeEventListener('mousedown',fmtPaintPick,true);
 const td=e.target&&e.target.closest?e.target.closest('#grid td'):null;
 if(td&&td.dataset&&td.dataset.ref&&fmtPaint)applyFormatTo(td.dataset.ref,fmtPaint);
 fmtPaint=null;syncRibbon();}
function fmtPaintApply(){if(!fmtPaint)return;applyFormatTo(active,fmtPaint);fmtPaint=null;setStatusMode(T('sbPaint'));}
function fnItemList(cat){const list=(cat&&cat!=='all'&&FN_CATS[cat])?FN_CATS[cat].slice():Object.keys(FN);
 return [{head:T('gFnLib')}].concat(list.map(n=>({label:n+(FN_HELP[n]?'  —  '+FN_HELP[n]:''),action:()=>insertFn(n)})));}
function insertFn(name){if(!name)return;const v='='+name+'(';
 if(gateEdit())return;setRaw(active,v);renderAll();startEdit(v);
 const inp=$('#cellEdit');if(inp){try{inp.setSelectionRange(v.length,v.length);}catch(e){}}
 wb.recentFns=[name].concat((wb.recentFns||[]).filter(x=>x!==name)).slice(0,8);saveLS();}
function fnInsertMenu(anchor){const c=$('#fnCat');popMenu(anchor,fnItemList(c?c.value:'all'));}
function explainActive(){const raw=rawOf(active);if(typeof raw!=='string'||raw[0]!=='=')return null;
 let toks=[];try{toks=tokenize(raw.slice(1));}catch(e){}
 const fns=[...new Set(toks.filter(t=>t.t==='fn').map(t=>t.v))].join(', ');
 const refs=toks.filter(t=>t.t==='ref').map(t=>refOf(t.r,t.c))
  .concat(toks.filter(t=>t.t==='rng').map(t=>refOf(t.r1,t.c1)+':'+refOf(t.r2,t.c2))).join(', ');
 return{formula:raw.slice(1),fns,refs};}
/* Define Name (Formulas ▸ Defined Names). Separate from Name Manager so the two
   intents match Excel: this creates a name for the current selection, while the
   manager lists and removes existing ones. */
function defineNameDialog(anchor){
 const suggest=(wb.names&&Object.keys(wb.names).length?'1':'')+(wb.names?'2':'');
 const key=prompt(T('nameDefAsk'),'');
 if(!key)return;
 /* Excel rejects anything that is not a legal name, because a name has to be
    parseable as an identifier in a formula. Keep it to letters, digits and
    underscore, not starting with a digit. */
 if(!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)){setStatusMode(T('nameDefBad'));return;}
 wb.names=wb.names||{};
 wb.names[key]=rangeA1(rect());
 saveLS();syncRibbon();
 setStatusMode(T('nameDefOk')+': '+key+' → '+wb.names[key]);}
function nameMgrMenu(anchor){const names=wb.names||{},keys=Object.keys(names);
 const item=rg=>{const p=String(rg).split(':');
  active=selA=p[0].toUpperCase();selB=(p[1]||p[0]).toUpperCase();renderAll();syncRibbon();};
 const items=[{head:T('namesHead')}];
 if(keys.length)keys.forEach(k=>items.push({label:k+'  →  '+names[k],action:()=>{item(names[k]);setStatusMode(T('namesHead')+': '+k);}}));
 else items.push({head:'—'});
 items.push(null,{label:T('namesAdd'),action:()=>{const key=prompt(T('namesAsk'),'');
  if(!key)return;wb.names=wb.names||{};wb.names[key]=rangeA1(rect());saveLS();
  setStatusMode(T('namesHead')+': '+key);}});
 popMenu(anchor,items);}
