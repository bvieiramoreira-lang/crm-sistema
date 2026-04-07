
// Gerenciamento de Colaboradores (MVP)

async function loadCollaborators() {
    document.getElementById('pageTitle').textContent = 'Gerenciar Colaboradores';
    document.getElementById('contentArea').innerHTML = `
        <div style="margin-bottom: 1rem; text-align: right;">
            <button class="btn" onclick="openCollaboratorModal()">+ Novo Colaborador</button>
        </div>
        <div class="card">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8fafc; text-align: left;">
                        <th style="padding: 0.75rem;">Nome</th>
                        <th style="padding: 0.75rem;">Setor</th>
                        <th style="padding: 0.75rem;">Status</th>
                        <th style="padding: 0.75rem;">Ações</th>
                    </tr>
                </thead>
                <tbody id="collabListBody"><tr><td colspan="4">Carregando...</td></tr></tbody>
            </table>
        </div>
    `;

    try {
        const res = await fetch('/api/collaborators?t=' + Date.now());
        const collabs = await res.json();
        renderCollaborators(collabs);
    } catch (e) {
        console.error(e);
        document.getElementById('collabListBody').innerHTML = '<tr><td colspan="4" style="color:red">Erro ao carregar</td></tr>';
    }
}

function renderCollaborators(list) {
    const tbody = document.getElementById('collabListBody');
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1rem">Nenhum colaborador cadastrado.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(c => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 0.75rem;">${c.nome}</td>
            <td style="padding: 0.75rem;">${c.setor}</td>
            <td style="padding: 0.75rem;">
                <span class="badge ${c.ativo ? 'badge-success' : 'badge-danger'}">
                    ${c.ativo ? 'Ativo' : 'Inativo'}
                </span>
                ${c.destaque_comportamento ? `<br><span class="badge" style="background:#ca8a04; color:#fff; font-size:0.7rem; margin-top:4px;"><i class="ph-star"></i> Destaque</span>` : ''}
            </td>
            <td style="padding: 0.75rem;">
                <button class="btn" style="padding: 0.25rem 0.5rem; width: auto; font-size: 0.8rem; background: #fbbf24; color: #78350f;" 
                    onclick='openHighlightModal(${c.id})' title="Destacar Semana">⭐</button>
                <button class="btn" style="padding: 0.25rem 0.5rem; width: auto; font-size: 0.8rem; margin-left: 0.5rem;" 
                    onclick='openCollaboratorModal(${JSON.stringify(c)})'>Editar</button>
                <button class="btn" style="padding: 0.25rem 0.5rem; width: auto; font-size: 0.8rem; background: #dc2626; margin-left: 0.5rem;" 
                    onclick='deleteCollaborator(${c.id})'>Excluir</button>
            </td>
        </tr>
    `).join('');
}

async function deleteCollaborator(id) {
    if (!confirm('Tem certeza que deseja excluir este colaborador?')) return;
    try {
        const res = await fetch(`/api/collaborators/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadCollaborators();
        } else {
            alert('Erro ao excluir');
        }
    } catch (e) {
        console.error(e);
        alert('Erro de conexão');
    }
}


function openCollaboratorModal(collab = null) {
    const isEdit = !!collab;

    // Define all available sectors
    const sectors = [
        { value: "ARTE_FINAL", label: "Arte Final" },
        { value: "SEPARACAO", label: "Separação" },
        { value: "DESEMBALE", label: "Desembale" },
        { value: "SILK_CILINDRICA", label: "Silk Cilíndrica" },
        { value: "SILK_PLANO", label: "Silk Plano" },
        { value: "TAMPOGRAFIA", label: "Tampografia" },
        { value: "IMPRESSAO_LASER", label: "Impressão Laser" },
        { value: "IMPRESSAO_DIGITAL", label: "Impressão Digital" },
        { value: "ESTAMPARIA", label: "Estamparia" },
        { value: "EMBALE", label: "Embale" },
        { value: "LOGISTICA", label: "Logística" },
        { value: "ESCRITORIO", label: "Escritório" }
    ];

    // Determine currently selected sectors
    let selectedSectors = [];
    if (collab && collab.setor) {
        // Spilt by comma, or just check simple string match if simpler, but split is safer
        // DB stores "SEPARACAO, ARTE_FINAL" etc.
        selectedSectors = collab.setor.split(',').map(s => s.trim());
    }

    // Build Checkboxes HTML
    const sectorsHtml = sectors.map(s => {
        const isChecked = selectedSectors.includes(s.value);
        return `
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                <input type="checkbox" name="sector_checkbox" value="${s.value}" id="sec_${s.value}" ${isChecked ? 'checked' : ''}>
                <label for="sec_${s.value}" style="font-weight:normal; margin:0; cursor:pointer;">${s.label}</label>
            </div>
        `;
    }).join('');

    const modalHtml = `
        <div id="collabModal" class="modal show">
            <div class="modal-content" style="max-width: 400px;">
                <h3>${isEdit ? 'Editar' : 'Novo'} Colaborador</h3>
                
                <label style="display:block; margin-top:1rem">Nome:</label>
                <input type="text" id="collabName" class="form-control" value="${collab ? collab.nome : ''}">

                <label style="display:block; margin-top:1rem; margin-bottom:0.5rem">Setores:</label>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 0.5rem; border-radius: 4px; background: #fffcf9;">
                    ${sectorsHtml}
                </div>

                <div style="margin-top:1rem; display:flex; align-items:center; gap: 0.5rem;">
                    <input type="checkbox" id="collabActive" ${!collab || collab.ativo ? 'checked' : ''}>
                    <label for="collabActive" style="margin:0; cursor:pointer">Ativo</label>
                </div>

                <div style="margin-top: 1.5rem; text-align: right;">
                    <button class="btn" style="background:var(--text-secondary); width:auto; margin-right:0.5rem" onclick="document.getElementById('collabModal').remove()">Cancelar</button>
                    <!-- Pass explicit value or empty for new -->
                    <button class="btn" style="width:auto" onclick="saveCollaborator('${collab ? collab.id : ''}')">Salvar</button>
                </div>
            </div>
        </div>
    `;
    // Clean up old modal if exists (though usually it shouldn't)
    const old = document.getElementById('collabModal');
    if (old) old.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveCollaborator(idParam) {
    // Robust ID handling: Handle 'null', null, '', undefined
    let id = idParam;
    if (id === 'null' || id === 'undefined' || id === '') id = null;

    const nome = document.getElementById('collabName').value;

    // Collect all checked sectors
    const checkboxes = document.querySelectorAll('input[name="sector_checkbox"]:checked');
    const selectedValues = Array.from(checkboxes).map(cb => cb.value);

    const setor = selectedValues.join(', '); // Save as "A, B, C"

    const ativo = document.getElementById('collabActive').checked ? 1 : 0;

    if (!nome) return alert('Preencha o nome');
    if (selectedValues.length === 0) return alert('Selecione pelo menos um setor');

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/collaborators/${id}` : '/api/collaborators';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, setor, ativo })
        });
        if (res.ok) {
            document.getElementById('collabModal').remove();
            loadCollaborators();
        } else {
            alert('Erro ao salvar');
        }
    } catch (e) {
        console.error(e);
        alert('Erro de conexão');
    }
}

// Lógica de Destaques da Semana
function openHighlightModal(collabId) {
    const comportamentos = [
        { id: 1, nome: "Excelência no que faz", cor: "#ca8a04", icone: "ph-star" },
        { id: 2, nome: "Ser resolutivo", cor: "#2563eb", icone: "ph-lightning" },
        { id: 3, nome: "Ser responsável", cor: "#059669", icone: "ph-shield-check" },
        { id: 4, nome: "Ser organizado", cor: "#7c3aed", icone: "ph-list-checks" },
        { id: 5, nome: "Ser detalhista", cor: "#0891b2", icone: "ph-magnifying-glass" },
        { id: 6, nome: "Ser comprometido", cor: "#ea580c", icone: "ph-handshake" },
        { id: 7, nome: "Ser positivo", cor: "#db2777", icone: "ph-smiley" }
    ];

    const cardsHtml = comportamentos.map(c => `
        <button onclick="setDestaque(${collabId}, '${c.nome}')" style="display: flex; align-items: center; gap: 0.5rem; text-align: left; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; background: #fff; width: 100%; margin-bottom: 0.5rem; transition: background 0.2s;">
            <div style="background: ${c.cor}; color: #fff; width: 32px; height: 32px; border-radius: 20%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                <i class="${c.icone}"></i>
            </div>
            <span style="font-weight: 500; color: #1e293b; flex: 1;">${c.nome}</span>
        </button>
    `).join('');

    const modalHtml = `
        <div id="highlightModal" class="modal show">
            <div class="modal-content" style="max-width: 450px;">
                <h3 style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0;"><i class="ph-star" style="color:#ca8a04"></i> Promover (Destaque da Semana)</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.9rem;">Escolha qual dos 7 comportamentos padrão este colaborador se destacou.</p>
                
                <div style="max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
                    ${cardsHtml}
                </div>

                <div style="margin-top: 1.5rem; display: flex; justify-content: space-between;">
                    <button class="btn" style="background: #dc2626; width: auto;" onclick="setDestaque(${collabId}, null)">Remover Destaque</button>
                    <button class="btn" style="background: var(--text-secondary); width: auto;" onclick="document.getElementById('highlightModal').remove()">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    const old = document.getElementById('highlightModal');
    if (old) old.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function setDestaque(collabId, comportamento) {
    try {
        const res = await fetch(`/api/collaborators/${collabId}/destaque`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destaque_comportamento: comportamento })
        });
        
        if (res.ok) {
            document.getElementById('highlightModal')?.remove();
            loadCollaborators();
        } else {
            alert('Erro ao definir destaque');
        }
    } catch (e) {
        console.error(e);
        alert('Erro de conexão');
    }
}
