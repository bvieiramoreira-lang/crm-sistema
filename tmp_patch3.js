const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

// 1. Signature of submitEmbale
code = code.replace(/async function submitEmbale\(itemId, isBypass, tipoEnvio, pedidoId\)/g, 
"async function submitEmbale(itemId, isBypass, tipoEnvio, pedidoId, itemQuantidade)");

// Append the POST /evento logic to submitEmbale when res.ok
const postEventoEmbale = `
            // ==== MULTIPLOS OPERADORES INJECT ====
            const mData = window.getMultiplosData(false, itemQuantidade);
            if(mData !== null) {
                // If mData is not null, it means checkbox is checked and it passed validation
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
code = code.replace(/if \(res\.ok\) \{/g, "if (res.ok) {" + postEventoEmbale);

// 2. Wrap openDesembaleConfirmation
const regexDesembaleAction = /function openDesembaleConfirmation\(itemId, nextStatus(, itemQuantidade)?\)\s*\{([\s\S]*?)openConfirmationModal\(/g;
code = code.replace(regexDesembaleAction, (match, p1, oldBody) => {
    return `function openDesembaleConfirmation(itemId, nextStatus, itemQuantidade) {
    const multiHtml = \`
        <div style="margin-bottom: 1rem; padding: 0.5rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; text-align: left;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600; color: #334155;">
                <input type="checkbox" id="checkMultiplosDesembale" onchange="toggleMultiplosUI(true)">
                Múltiplos Colaboradores (Mutirão)
            </label>
            <div id="multiplosUIDesembale" style="display: none; margin-top: 1rem;">
                <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem;">Adicione os colaboradores e a quantidade que cada um desembalou (Soma deve ser igual a <span style="font-weight:bold;">\${itemQuantidade}</span>).</p>
                <div id="multiplosListDesembale" style="display:flex; flex-direction:column; gap:0.5rem;"></div>
                <button class="btn" style="width:auto; padding: 0.25rem 0.5rem; margin-top: 0.5rem; border: 1px dashed #64748b; background: transparent; color: #64748b;" onclick="addMultiplosRow(true)">+ Add Colaborador</button>
            </div>
        </div>
    \`;

    // Cannot use standard Confirmation Modal if we want to inject inputs, we must build a custom modal!
    document.body.insertAdjacentHTML('beforeend', \`
        <div id="desembaleModal" class="modal show">
            <div class="modal-content" style="min-width: 500px; text-align: center;">
                <div style="margin-bottom: 1rem;">
                    <div style="background:var(--bg-app); border:1px solid var(--border); width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; color: var(--text-primary);">
                        <i class="ph-warning" style="font-size: 1.5rem;"></i>
                    </div>
                </div>
                <h3 style="margin-bottom: 1rem;">Confirmação de Desembale</h3>
                
                <ul style="text-align: left; background: #f8fafc; padding: 1rem 1rem 1rem 2rem; border-radius: 0.5rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
                    <li style="margin-bottom: 0.5rem">Conferi os itens 1 a 1</li>
                    <li style="margin-bottom: 0.5rem">Realizei a contagem corretamente</li>
                    <li style="margin-bottom: 0.5rem">Fiz o desembale e separação</li>
                    <li>Encaminhei etapa correta</li>
                </ul>

                \${multiHtml}

                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn" style="background: var(--text-secondary); width: auto;" onclick="document.getElementById('desembaleModal').remove()">Voltar</button>
                    <button class="btn" style="width: auto;" onclick="submitDesembale(\${itemId}, '\${nextStatus}', \${itemQuantidade})">Confirmar e avançar</button>
                </div>
            </div>
        </div>
    \`);
}

// Custom submitDesembale Function to handle API and Multiplos
window.submitDesembale = async function(itemId, nextStatus, itemQuantidade) {
    const mData = window.getMultiplosData(true, itemQuantidade);
    if(document.getElementById('checkMultiplosDesembale').checked && mData === false) return; // failed validation

    try {
        // Change Status First (existing logic)
        await fetch(\`/api/production/item/\${itemId}/status\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novo_status_item: nextStatus, operador_id: currentUser.id })
        });

        // Insert Multiplos if needed
        if(mData !== null) {
            await fetch('/api/production/evento', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_id: itemId,
                    setor: 'DESEMBALE',
                    acao: 'FIM',
                    multiplos_operadores: mData
                })
            });
        }
        
        document.getElementById('desembaleModal').remove();
        loadGenericQueue('AGUARDANDO_DESEMBALE', 'Desembale');
        
    } catch(e) { console.error('Erro desembale', e); }
}

function REPLACED_OLD_CONFIRMATION() `;
});

// Since the regex replacement added "function REPLACED_OLD_CONFIRMATION() " right before the old standard call, I'll clean it up.
// Actually, earlier code replaced openDesembaleConfirmation entirely and appended the remnant. Let's fix it by regex removing the leftover openConfirmationModal call.
// It's safer to just let the old openConfirmationModal be a dead code that doesn't execute inside openDesembaleConfirmation because the regex matched before it.
// To be clean, we can replace the entire openDesembaleConfirmation function.
const cleanDesembaleCode = code.replace(/function REPLACED_OLD_CONFIRMATION\(\) openConfirmationModal\([\s\S]*?\n\}/g, '');
fs.writeFileSync('public/js/app.js', cleanDesembaleCode);
console.log('Patch 3 done');
