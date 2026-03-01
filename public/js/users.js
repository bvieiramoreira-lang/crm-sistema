
// Gerenciamento de Colaboradores (Admin)

async function loadUsersPage() {
    document.getElementById('pageTitle').textContent = 'Gerenciar Colaboradores';

    // Header com Botão Novo
    const actionArea = document.getElementById('headerActions');
    actionArea.innerHTML = `<button class="btn" onclick="openUserModal()">+ Novo Colaborador</button>`;

    try {
        const res = await fetch('/api/users'); // Busca todos (ativos e inativos)
        const users = await res.json();

        let html = `
            <div class="card">
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Login</th>
                            <th>Setor Principal</th>
                            <th>Setores Secundários</th>
                            <th>Status</th>
                            <th>Ação</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        users.forEach(u => {
            const statusBadge = u.ativo ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-danger">Inativo</span>';
            const setoresSec = u.setores_secundarios || '-';

            html += `
                <tr>
                    <td>${u.nome}</td>
                    <td>${u.username}</td>
                    <td>${u.perfil.toUpperCase()}</td>
                    <td>${setoresSec}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn" style="padding: 0.25rem 0.5rem; width: auto;" onclick='openUserModal(${JSON.stringify(u)})'>Editar</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        document.getElementById('contentArea').innerHTML = html;

    } catch (e) {
        console.error(e);
        alert('Erro ao carregar usuários');
    }
}

function openUserModal(user = null) {
    // Template do Modal
    const isEdit = !!user;
    const title = isEdit ? 'Editar Colaborador' : 'Novo Colaborador';

    const setores = ['arte', 'separacao', 'desembale', 'impressao', 'embale', 'logistica', 'admin', 'financeiro'];

    // Setor Options
    const setorOptions = setores.map(s =>
        `<option value="${s}" ${user && user.perfil === s ? 'selected' : ''}>${s.toUpperCase()}</option>`
    ).join('');

    // Checkboxes para setores secundários
    const userSec = user && user.setores_secundarios ? user.setores_secundarios.split(',') : [];
    const secOptions = setores.map(s => `
        <label style="display:inline-block; margin-right: 10px;">
            <input type="checkbox" name="sec_sector" value="${s}" ${userSec.includes(s) ? 'checked' : ''}> 
            ${s.toUpperCase()}
        </label>
    `).join('');

    const modalHtml = `
        <div class="form-group">
            <label>Nome</label>
            <input type="text" id="userName" class="form-control" value="${user ? user.nome : ''}" required>
        </div>
        <div class="form-group">
            <label>Login (Username)</label>
            <input type="text" id="userLogin" class="form-control" value="${user ? user.username : ''}" ${isEdit ? 'disabled' : ''} required>
        </div>
        <div class="form-group">
             <label>Senha ${isEdit ? '(deixe em branco para manter)' : ''}</label>
             <input type="password" id="userPass" class="form-control">
        </div>
        <div class="form-group">
            <label>Setor Principal / Perfil</label>
            <select id="userProfile" class="form-control">${setorOptions}</select>
        </div>
        <div class="form-group">
            <label>Setores Secundários (Atua também em:)</label>
            <div style="padding: 0.5rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 0.5rem;">
                ${secOptions}
            </div>
        </div>
        ${isEdit ? `
        <div class="form-group">
            <label>Status</label>
            <select id="userStatus" class="form-control">
                <option value="1" ${user.ativo ? 'selected' : ''}>Ativo</option>
                <option value="0" ${!user.ativo ? 'selected' : ''}>Inativo</option>
            </select>
        </div>` : ''}
        
        <button class="btn" onclick="saveUser(${isEdit ? user.id : 'null'})">Salvar</button>
    `;

    showModal(title, modalHtml);
}

async function saveUser(id) {
    const nome = document.getElementById('userName').value;
    const username = document.getElementById('userLogin').value;
    const senha = document.getElementById('userPass').value;
    const perfil = document.getElementById('userProfile').value;
    const ativo = document.getElementById('userStatus') ? document.getElementById('userStatus').value : 1;

    // Collect checkboxes
    const secSectors = Array.from(document.querySelectorAll('input[name="sec_sector"]:checked')).map(el => el.value).join(',');

    const payload = { nome, username, perfil, ativo, setores_secundarios: secSectors };
    if (senha) payload.senha = senha; // Middleware ignore keys might catch this if lowercase 'senha' is used. Wait middleware uses 'senha' in ignore? Yes. 'password' and 'senha'.

    // NOTE: Middleware enforces Uppercase on 'nome', 'username', 'perfil'.
    // Username usually matches login input. If I type 'lucas', middleware makes it 'LUCAS'.
    // Login logic compares with DB. DB will have 'LUCAS'. 
    // Login input in auth.js likely needs uppercase too? Or auth route is POST /login. Middleware applies there too?
    // Check app.js: app.use(bodyParser) -> app.use(uppercaseMiddleware) -> app.use('/api/auth').
    // YES. So login will be uppercased too. 'lucas' -> 'LUCAS'. User in DB is 'LUCAS'. Hash matches. Good.

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/users/${id}` : '/api/users';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeModal();
            loadUsersPage();
        } else {
            const err = await res.json();
            alert('Erro: ' + err.error);
        }
    } catch (e) {
        console.error(e);
        alert('Erro de conexão');
    }
}
