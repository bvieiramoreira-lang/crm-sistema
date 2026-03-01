
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
            </td>
            <td style="padding: 0.75rem;">
                <button class="btn" style="padding: 0.25rem 0.5rem; width: auto; font-size: 0.8rem;" 
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
        { value: "LOGISTICA", label: "Logística" }
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
