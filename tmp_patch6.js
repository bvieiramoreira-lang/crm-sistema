const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

// 1. Regex to remove ALL the injected blocks
const blockPattern = /[ \t]*\/\/\s*====\s*MULTIPLOS\s*OPERADORES\s*INJECT\s*====[\s\S]*?catch\(err\)\s*\{\s*console\.error\('Erro ao salvar multiples:\s*', err\);\s*\}\s*\}/g;

code = code.replace(blockPattern, '');

// 2. Re-inject strictly inside submitEmbale, precisely where we want it.
// In submitEmbale, it should be right after `if (res.ok) { ...` around line 2789 (which now might shift).
// Let's find: `if (res.ok) {\n            // Custom Logic for RETIRADA` 
// or `if (res.ok) {` inside `async function submitEmbale`
// Since `replace` only replaces the first occurrence, we must be careful.
// Let's use string manipulation based on `async function submitEmbale`.

const submitEmbaleIndex = code.indexOf('async function submitEmbale');
if(submitEmbaleIndex > -1) {
    const afterSubmit = code.slice(submitEmbaleIndex);
    const ifResOkIndex = afterSubmit.indexOf('if (res.ok) {');
    if (ifResOkIndex > -1) {
        const fullIndex = submitEmbaleIndex + ifResOkIndex + 'if (res.ok) {'.length;
        
        const injection = `
            // ==== MULTIPLOS OPERADORES INJECT ====
            const mData = window.getMultiplosData(false, itemQuantidade);
            if(mData !== null) {
                try {
                    await fetch('/api/production/evento', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            item_id: itemId,
                            setor: 'EMBALE',
                            acao: 'FIM',
                            multiplos_operadores: mData
                        })
                    });
                } catch(err) { console.error('Erro ao salvar multiples: ', err); }
            }
`;
        code = code.slice(0, fullIndex) + injection + code.slice(fullIndex);
        console.log('Successfully re-injected strictly in submitEmbale.');
    }
}

fs.writeFileSync('public/js/app.js', code);
console.log('Cleanup Done');
