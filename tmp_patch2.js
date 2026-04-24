const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

const multiOpsGlobal = `
// ==== START MULTIPLOS OPERADORES INJECT ====
let sectorUsersCache = [];
async function fetchSectorUsersCache(sectorCode) {
    if(sectorUsersCache.length === 0) {
        try {
            const r = await fetch('/api/collaborators/sector/' + sectorCode);
            sectorUsersCache = await r.json();
        } catch(e) {}
    }
    return sectorUsersCache;
}

window.toggleMultiplosUI = function(isDesembale) {
    const isChecked = document.getElementById(isDesembale ? 'checkMultiplosDesembale' : 'checkMultiplos').checked;
    document.getElementById(isDesembale ? 'multiplosUIDesembale' : 'multiplosUI').style.display = isChecked ? 'block' : 'none';
    if(isChecked && document.getElementById(isDesembale ? 'multiplosListDesembale' : 'multiplosList').children.length === 0) {
        window.addMultiplosRow(isDesembale);
    }
}

window.addMultiplosRow = async function(isDesembale) {
    const listId = isDesembale ? 'multiplosListDesembale' : 'multiplosList';
    const container = document.getElementById(listId);
    if(!container) return;
    
    // Ensure cache is loaded
    await fetchSectorUsersCache(isDesembale ? 'DESEMBALE' : 'EMBALE');
    
    let options = '<option value="">-Selecione-</option>';
    sectorUsersCache.forEach(u => options += \`<option value="\${u.id}|\${u.nome}">\${u.nome}</option>\`);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:0.5rem; align-items:center;';
    row.innerHTML = \`
        <select class="form-control" style="flex:1; padding:0.25rem;">\${options}</select>
        <input type="number" class="form-control" style="width:80px; padding:0.25rem;" min="1" placeholder="Qtd">
        <button class="btn" style="width:30px; padding:0.25rem; background:transparent; border:1px solid red; color:red;" onclick="this.parentElement.remove()"><i class="ph-trash"></i></button>
    \`;
    container.appendChild(row);
}

window.getMultiplosData = function(isDesembale, totalEsperado) {
    const isChecked = document.getElementById(isDesembale ? 'checkMultiplosDesembale' : 'checkMultiplos')?.checked;
    if(!isChecked) return null; // Retorna null significa que NAO usou modo múltiplo
    
    const rows = document.getElementById(isDesembale ? 'multiplosListDesembale' : 'multiplosList').children;
    let data = [];
    let soma = 0;
    
    for(let r of rows) {
        const val = r.querySelector('select').value;
        const qtdStr = r.querySelector('input').value;
        if(!val || val === '') { alert('Selecione todos os colaboradores nas linhas adcionadas.'); return false; }
        if(!qtdStr || parseInt(qtdStr) <= 0) { alert('A quantidade deve ser maior que zero.'); return false; }
        
        let qtd = parseInt(qtdStr);
        let id_nome = val.split('|');
        data.push({ operador_id: id_nome[0], operador_nome: id_nome[1], quantidade_produzida: qtd });
        soma += qtd;
    }
    
    if(data.length === 0) {
        alert('Adicione ao menos um colaborador ou desmarque a opção Múltiplos.');
        return false;
    }
    
    if(soma !== totalEsperado) {
        alert(\`A soma das quantidades (\${soma}) não bate com a quantidade do item (\${totalEsperado})!\`);
        return false; // Bloqueia!
    }
    
    return data;
}
// ==== END MULTIPLOS OPERADORES INJECT ====
`;

// Inject global helpers BEFORE checkAuth()
code = code.replace(/document\.addEventListener\('DOMContentLoaded'/g, multiOpsGlobal + "\ndocument.addEventListener('DOMContentLoaded'");

// 2. Wrap openEmbaleAction
const regexEmbaleAction = /function openEmbaleAction\(itemId, pedidoId, tipoEnvio(, itemQuantidade)?\)\s*\{([\s\S]*?)const html = `/g;
code = code.replace(regexEmbaleAction, (match, p1, oldBody) => {
    // If not already patched with itemQuantidade
    const signature = `function openEmbaleAction(itemId, pedidoId, tipoEnvio, itemQuantidade) {`;
    
    const multiHtml = `
    const multiHtml = \`
        <div style="margin-bottom: 1rem; padding: 0.5rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600; color: #334155;">
                <input type="checkbox" id="checkMultiplos" onchange="toggleMultiplosUI(false)">
                Múltiplos Colaboradores (Mutirão)
            </label>
            <div id="multiplosUI" style="display: none; margin-top: 1rem;">
                <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem;">Adicione os colaboradores e a quantidade que cada um embalou (Soma deve ser igual a <span style="font-weight:bold;">\${itemQuantidade}</span>).</p>
                <div id="multiplosList" style="display:flex; flex-direction:column; gap:0.5rem;"></div>
                <button class="btn" style="width:auto; padding: 0.25rem 0.5rem; margin-top: 0.5rem; border: 1px dashed #64748b; background: transparent; color: #64748b;" onclick="addMultiplosRow(false)">+ Add Colaborador</button>
            </div>
        </div>
    \`;
    `;
    return signature + oldBody + "\n" + multiHtml + "\n    const html = `";
});

// Inject ${multiHtml} into the embale body
code = code.replace(/\$\{baseHtml\}/, "${multiHtml}\n                ${baseHtml}");

// Pass itemQuantidade downwards in openEmbaleConfirmationWrapper calls in openEmbaleAction HTML
code = code.replace(/openEmbaleConfirmationWrapper\(\$\{itemId\}, \$\{pedidoId\}, '\$\{tipoEnvio\}', true\)/g, 
"openEmbaleConfirmationWrapper(${itemId}, ${pedidoId}, '${tipoEnvio}', true, ${itemQuantidade})");
code = code.replace(/openEmbaleConfirmationWrapper\(\$\{itemId\}, \$\{pedidoId\}, '\$\{tipoEnvio\}', false\)/g, 
"openEmbaleConfirmationWrapper(${itemId}, ${pedidoId}, '${tipoEnvio}', false, ${itemQuantidade})");

// Signature of openEmbaleConfirmationWrapper
code = code.replace(/function openEmbaleConfirmationWrapper\(itemId, pedidoId, tipoEnvio, isBypass\)/g, 
"function openEmbaleConfirmationWrapper(itemId, pedidoId, tipoEnvio, isBypass, itemQuantidade)");

// validate multiplos in Wrapper
const wrapperValidations = `
    // Validate Multiplos early
    if(document.getElementById('checkMultiplos').checked) {
        if(window.getMultiplosData(false, itemQuantidade) === false) return; // failed validation
    }
`;
code = code.replace(/if \(!isBypass\)/g, wrapperValidations + "    if (!isBypass)");

// Call submitEmbale with itemQuantidade
code = code.replace(/\(\) => submitEmbale\(itemId, true, tipoEnvio, pedidoId\)/g, "() => submitEmbale(itemId, true, tipoEnvio, pedidoId, itemQuantidade)");
code = code.replace(/\(\) => submitEmbale\(itemId, false, tipoEnvio, pedidoId\)/g, "() => submitEmbale(itemId, false, tipoEnvio, pedidoId, itemQuantidade)");

fs.writeFileSync('public/js/app.js', code);
console.log('Patch 2 done');
