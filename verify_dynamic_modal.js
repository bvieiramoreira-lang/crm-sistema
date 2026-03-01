const fs = require('fs');
const jsPath = 'c:/Users/Bruno/Desktop/CRM/public/js/app.js';
const htmlPath = 'c:/Users/Bruno/Desktop/CRM/public/dashboard.html';

try {
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // 1. Verify HTML Cleanup
    if (htmlContent.includes('id="newOrderModal"')) {
        console.error("FAILURE: Static Modal still present in dashboard.html");
    } else {
        console.log("SUCCESS: Static Modal removed from dashboard.html");
    }

    // 2. Verify JS Injection Logic
    if (jsContent.includes('function injectNewOrderModal()') && jsContent.includes('document.body.insertAdjacentHTML')) {
        console.log("SUCCESS: injectNewOrderModal function found in app.js");
    } else {
        console.error("FAILURE: JS Injection logic missing.");
    }

    // 3. Verify Date Input Type
    if (jsContent.includes('<input type="date" name="prazo_entrega"')) {
        console.log("SUCCESS: Date Picker input found in JS template.");
    } else {
        console.error("FAILURE: Date Picker missing or incorrect type.");
    }

} catch (e) {
    console.error("Error reading files:", e);
}
