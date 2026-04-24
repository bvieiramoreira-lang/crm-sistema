const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

// 1. Remove validateResponsible from Embale and Desembale buttons
code = code.replace(/onclick="if\(validateResponsible\(\$\{item\.id\}\)\) openEmbaleAction/g, 'onclick="openEmbaleAction');

code = code.replace(/onclick="if\(validateResponsible\(\$\{item\.id\}\)\) openDesembaleConfirmation/g, 'onclick="openDesembaleConfirmation');

// 2. Add validation inside openEmbaleConfirmationWrapper and submitDesembale
const embaleValidation = `
    if (!document.getElementById('checkMultiplos').checked) {
        if (!validateResponsible(itemId)) { document.getElementById('embaleModal').remove(); return; }
    }
`;
code = code.replace(/if\(\s*document\.getElementById\('checkMultiplos'\)\.checked\)\s*\{/, embaleValidation + `    if(document.getElementById('checkMultiplos').checked) {`);

const desembaleValidation = `
    if (!document.getElementById('checkMultiplosDesembale').checked) {
        if (!validateResponsible(itemId)) { document.getElementById('desembaleModal').remove(); return; }
    }
`;
code = code.replace(/if\(\s*document\.getElementById\('checkMultiplosDesembale'\)\.checked && mData === false\)\s*return;/, desembaleValidation + `    if(document.getElementById('checkMultiplosDesembale').checked && mData === false) return;`);

fs.writeFileSync('public/js/app.js', code);
console.log('Validation Fixed');
