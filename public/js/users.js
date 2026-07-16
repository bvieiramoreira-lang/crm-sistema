
// Gerenciamento de Usuários (Admin)

async function loadUsersPage() {
    document.getElementById('pageTitle').textContent = 'Gerenciar Usuários';

    // Header com Botão Novo
    const actionArea = document.getElementById('headerActions');
    if (actionArea) {
        actionArea.innerHTML = `<button class="btn" onclick="openUserModal()">+ Novo Usuário</button>`;
    }

    try {
        const res = await fetch('/api/users?t=' + Date.now()); // Busca todos (ativos e inativos)
        const users = await res.json();

        let html = `
            <div class="card" style="padding: 1rem; overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc; text-align: left; border-bottom: 2px solid #e2e8f0;">
                            <th style="padding: 0.75rem;">Nome</th>
                            <th style="padding: 0.75rem;">Login</th>
                            <th style="padding: 0.75rem;">Setor Principal</th>
                            <th style="padding: 0.75rem;">Setores Secundários</th>
                            <th style="padding: 0.75rem;">Setor Impressão</th>
                            <th style="padding: 0.75rem;">Status</th>
                            <th style="padding: 0.75rem; text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (users.length === 0) {
            html += `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Nenhum usuário encontrado.</td></tr>`;
        } else {
            users.forEach(u => {
                const statusBadge = u.ativo 
                    ? '<span class="badge badge-success">Ativo</span>' 
                    : '<span class="badge badge-danger">Inativo</span>';
                const setoresSec = u.setores_secundarios || '-';
                const setorImp = u.setor_impressao || '-';

                html += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 0.75rem; font-weight: 600;">${u.nome}</td>
                        <td style="padding: 0.75rem; color: var(--text-secondary);">${u.username}</td>
                        <td style="padding: 0.75rem;"><span class="badge" style="background:#e2e8f0; color:#334155;">${u.perfil.toUpperCase()}</span></td>
                        <td style="padding: 0.75rem; font-size: 0.85rem;">${setoresSec.toUpperCase()}</td>
                        <td style="padding: 0.75rem; font-size: 0.85rem;">${setorImp}</td>
                        <td style="padding: 0.75rem;">${statusBadge}</td>
                        <td style="padding: 0.75rem; text-align: center;">
                            <button class="btn" style="padding: 0.25rem 0.75rem; width: auto; font-size: 0.85rem;" onclick='openUserModal(${JSON.stringify(u)})'>
                                <i class="ph-pencil"></i> Editar
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        html += `</tbody></table></div>`;
        document.getElementById('contentArea').innerHTML = html;

    } catch (e) {
        console.error(e);
        document.getElementById('contentArea').innerHTML = `<div class="card" style="padding: 2rem; text-align: center; color: red;">Erro ao carregar usuários</div>`;
    }
}

function openUserModal(user = null) {
    const isEdit = !!user;
    const title = isEdit ? 'Editar Usuário' : 'Novo Usuário';

    const setores = ['admin', 'financeiro', 'arte', 'separacao', 'desembale', 'impressao', 'embale', 'logistica', 'vendedor'];

    // Setor Options
    const setorOptions = setores.map(s =>
        `<option value="${s}" ${user && user.perfil.toLowerCase() === s ? 'selected' : ''}>${s.toUpperCase()}</option>`
    ).join('');

    // Checkboxes para setores secundários
    const userSec = user && user.setores_secundarios ? user.setores_secundarios.toLowerCase().split(',') : [];

    // Setores / Perfis
    const perfisList = [
        { value: 'financeiro', label: 'Financeiro' },
        { value: 'arte', label: 'Arte Final' },
        { value: 'separacao', label: 'Separação' },
        { value: 'desembale', label: 'Desembale' },
        { value: 'impressao', label: 'Impressão' },
        { value: 'embale', label: 'Embale' },
        { value: 'logistica', label: 'Logística' },
        { value: 'vendedor', label: 'Vendedor' }
    ];

    // Filas de Impressão Específicas
    const printSectorsList = [
        { value: 'SILK_CILINDRICA', label: 'Silk Cilíndrica' },
        { value: 'SILK_PLANO', label: 'Silk Plano' },
        { value: 'TAMPOGRAFIA', label: 'Tampografia' },
        { value: 'IMPRESSAO_LASER', label: 'Impressão Laser' },
        { value: 'IMPRESSAO_DIGITAL', label: 'Impressão Digital' },
        { value: 'ESTAMPARIA', label: 'Estamparia' }
    ];

    // Telas / Permissões Especiais
    const specialPermsList = [
        { value: 'controle', label: 'Controle' },
        { value: 'orders', label: 'Todos os Pedidos' },
        { value: 'finalizados', label: 'Finalizados' }
    ];

    const buildCheckboxes = (list) => list.map(item => `
        <div style="display:flex; align-items:center; gap:0.35rem; margin-bottom:0.35rem;">
            <input type="checkbox" name="sec_sector" value="${item.value}" id="sec_u_${item.value.toLowerCase()}" ${userSec.includes(item.value.toLowerCase()) ? 'checked' : ''} style="width: auto; margin: 0; cursor: pointer;"> 
            <label for="sec_u_${item.value.toLowerCase()}" style="font-weight:normal; margin:0; cursor:pointer; font-size:0.85rem;">${item.label}</label>
        </div>
    `).join('');

    const perfisCheckboxes = buildCheckboxes(perfisList);
    const printCheckboxes = buildCheckboxes(printSectorsList);
    const specialCheckboxes = buildCheckboxes(specialPermsList);

    const modalHtml = `
        <div id="userModal" class="modal show">
            <div class="modal-content" style="max-width: 580px; padding: 1.5rem;">
                <h3 style="margin-top:0; margin-bottom:1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">${title}</h3>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="font-weight:600;">Nome Completo</label>
                    <input type="text" id="userName" class="form-control" value="${user ? user.nome : ''}" required placeholder="Nome do Usuário">
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="font-weight:600;">Login (Username)</label>
                    <input type="text" id="userLogin" class="form-control" value="${user ? user.username : ''}" ${isEdit ? 'disabled' : ''} required placeholder="Nome de Acesso">
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                     <label style="font-weight:600;">Senha ${isEdit ? '(deixe em branco para manter)' : ''}</label>
                     <input type="password" id="userPass" class="form-control" placeholder="${isEdit ? 'Nova Senha' : 'Senha de Acesso'}">
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="font-weight:600;">Setor Principal / Perfil</label>
                    <select id="userProfile" class="form-control" onchange="toggleSetorImpressaoDisplay()">${setorOptions}</select>
                </div>

                <div class="form-group" id="setorImpressaoGroup" style="margin-bottom: 1rem; display: ${user && user.perfil.toLowerCase() === 'impressao' ? 'block' : 'none'};">
                    <label style="font-weight:600;">Setor de Impressão Principal</label>
                    <select id="userSetorImpressao" class="form-control">
                        <option value="">Nenhum</option>
                        <option value="SILK_CILINDRICA" ${user && user.setor_impressao === 'SILK_CILINDRICA' ? 'selected' : ''}>Silk Cilíndrica</option>
                        <option value="SILK_PLANO" ${user && user.setor_impressao === 'SILK_PLANO' ? 'selected' : ''}>Silk Plano</option>
                        <option value="TAMPOGRAFIA" ${user && user.setor_impressao === 'TAMPOGRAFIA' ? 'selected' : ''}>Tampografia</option>
                        <option value="IMPRESSAO_LASER" ${user && user.setor_impressao === 'IMPRESSAO_LASER' ? 'selected' : ''}>Impressão Laser</option>
                        <option value="IMPRESSAO_DIGITAL" ${user && user.setor_impressao === 'IMPRESSAO_DIGITAL' ? 'selected' : ''}>Impressão Digital</option>
                        <option value="ESTAMPARIA" ${user && user.setor_impressao === 'ESTAMPARIA' ? 'selected' : ''}>Estamparia</option>
                    </select>
                </div>

                <div class="form-group" style="margin-bottom: 1.25rem;">
                    <label style="font-weight:600; display:block; margin-bottom:0.5rem;">Permissões / Acessos Adicionais (Setores Secundários)</label>
                    <div style="display:grid; grid-template-columns: 1fr 1.1fr; gap: 16px; padding: 0.75rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 0.5rem; max-height: 250px; overflow-y: auto;">
                        <div>
                            <span style="font-size:0.72rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; display:block; margin-bottom:0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">Perfis Gerais</span>
                            ${perfisCheckboxes}
                        </div>
                        <div>
                            <span style="font-size:0.72rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; display:block; margin-bottom:0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">Filas / Telas Extras</span>
                            ${printCheckboxes}
                            <span style="font-size:0.72rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; display:block; margin-top:0.75rem; margin-bottom:0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">Telas do Sistema</span>
                            ${specialCheckboxes}
                        </div>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" id="userActive" ${!user || user.ativo ? 'checked' : ''} style="width:auto; cursor:pointer;">
                    <label for="userActive" style="margin:0; cursor:pointer; font-weight:600;">Usuário Ativo</label>
                </div>
                
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn" style="background: var(--text-secondary); width: auto;" onclick="document.getElementById('userModal').remove()">Cancelar</button>
                    <button class="btn" style="width: auto; background: var(--accent); color: #fff;" onclick="saveUser(${user ? user.id : 'null'})">Salvar</button>
                </div>
            </div>
        </div>
    `;

    const old = document.getElementById('userModal');
    if (old) old.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function toggleSetorImpressaoDisplay() {
    const profile = document.getElementById('userProfile').value;
    const group = document.getElementById('setorImpressaoGroup');
    if (profile === 'impressao') {
        group.style.display = 'block';
    } else {
        group.style.display = 'none';
        const select = document.getElementById('userSetorImpressao');
        if (select) select.value = '';
    }
}

async function saveUser(id) {
    const nome = document.getElementById('userName').value.trim();
    const username = document.getElementById('userLogin').value.trim();
    const senha = document.getElementById('userPass').value;
    const perfil = document.getElementById('userProfile').value;
    const ativo = document.getElementById('userActive').checked ? 1 : 0;
    
    let setor_impressao = null;
    if (perfil === 'impressao') {
        setor_impressao = document.getElementById('userSetorImpressao').value;
    }

    if (!nome) return alert('Por favor, preencha o nome completo.');
    if (!username) return alert('Por favor, preencha o nome de usuário (Login).');
    if (!id && !senha) return alert('Por favor, digite uma senha para o novo usuário.');

    // Collect checkboxes
    const secSectors = Array.from(document.querySelectorAll('input[name="sec_sector"]:checked')).map(el => el.value).join(',');

    const payload = { 
        nome, 
        username, 
        perfil, 
        ativo, 
        setores_secundarios: secSectors,
        setor_impressao
    };
    
    if (senha) payload.senha = senha;

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/users/${id}` : '/api/users';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const modal = document.getElementById('userModal');
            if (modal) modal.remove();
            loadUsersPage();
        } else {
            const err = await res.json();
            alert('Erro: ' + err.error);
        }
    } catch (e) {
        console.error(e);
        alert('Erro de conexão com o servidor.');
    }
}
