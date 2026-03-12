// Estado Global
let currentUser = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    loadDashboard();

    document.getElementById('logoutBtn').addEventListener('click', logout);
});

// Helper: Badge de Envio Universal
// Helper: Badge de Envio Universal
function renderShippingBadge(tipo) {
    if (!tipo) return '<span class="badge" style="background:var(--bg-app); color:var(--text-tertiary); border:1px solid var(--border)">ENVIO: NÃO DEFINIDO</span>';

    // Swiss mapping: All clean, defined by class usually, but dynamic here.
    // Let's use vars.
    let colorVar = 'var(--text-secondary)';
    let icon = 'ph-question';
    let borderColor = 'var(--border)';

    if (tipo === 'RETIRADA') {
        colorVar = 'var(--info)'; // Blue
        icon = 'ph-user';
        borderColor = 'var(--info)';
    } else if (tipo === 'TRANSPORTADORA') {
        colorVar = 'var(--warning)'; // Amber/Orange
        icon = 'ph-truck';
        borderColor = 'var(--warning)';
    } else if (tipo === 'CORREIOS') {
        colorVar = '#eab308'; // Yellow/Gold - custom var or keep hex if not in main vars
        icon = 'ph-envelope-simple'; // Keep hex or add var? Let's use hex for specific logic or var(--warning)
        borderColor = '#eab308';
    }

    // Modern Swiss Pill: Transparent bg, colored text/border
    return `<span class="badge" style="background:transparent; color:${colorVar}; border:1px solid ${borderColor}; gap:0.25rem;">
        <i class="${icon}"></i> ${tipo}
    </span>`;
}

// Helper: Deadline Badge with Logic
function renderDeadline(dateStr) {
    if (!dateStr) return '<span class="badge" style="background:#ccc">Sem Prazo</span>';

    const deadline = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let badgeClass = 'badge-blue'; // Default
    let icon = 'ph-calendar';
    let label = deadline.toLocaleDateString();
    let style = '';

    if (diffDays < 0) {
        // Atrasado
        style = 'background: #dc2626; color: white;'; // Red
        icon = 'ph-warning';
        label += ' (Atrasado)';
    } else if (diffDays === 0 || diffDays === 1) {
        // Hoje/Amanhã (Urgente)
        style = 'background: #ea580c; color: white;'; // Orange
        icon = 'ph-fire';
        label += ' (Urgente)';
    } else if (diffDays <= 3) {
        // Atenção
        style = 'background: #ca8a04; color: white;'; // Yellow/Gold darken
        icon = 'ph-bell';
        label += ' (Atenção)';
    } else {
        // Normal
        style = 'background: var(--bg-surface); color: var(--info); border: 1px solid var(--info-bg);'; // Blue
    }

    return `<span class="badge" style="${style} display:inline-flex; align-items:center; gap:0.25rem;">
        <i class="${icon}"></i> ${label}
    </span>`;
}

// Helper: Modal de Etiqueta (Logística)

function checkAuth() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = JSON.parse(userStr);
    document.getElementById('userInfo').textContent = `${currentUser.nome} (${currentUser.perfil})`;
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Configuração de Navegação (Menu Lateral Revitalizado)
function setupNavigation() {
    const nav = document.getElementById('navMenu');
    nav.innerHTML = '';

    // MENU CONFIGURATION
    const menuStructure = {
        'PRODUÇÃO': [
            // Dashboard accessible to all
            {
                id: 'dashboard',
                label: 'Dashboard',
                icon: 'ph-house',
                profiles: ['admin', 'financeiro', 'arte', 'separacao', 'desembale', 'impressao', 'embale', 'logistica'],
                action: openDashboard
            },
            { id: 'orders', label: 'Todos os Pedidos', icon: 'ph-stack', profiles: ['financeiro', 'admin'], action: loadOrders },
            { id: 'new_order', label: 'Novo Pedido', icon: 'ph-plus-circle', profiles: ['financeiro', 'admin'], action: openNewOrderModal },
            { id: 'arte', label: 'Arte Final', icon: 'ph-paint-brush', profiles: ['arte', 'admin'], action: loadArteQueue },
            { id: 'separacao', label: 'Separação', icon: 'ph-basket', profiles: ['separacao', 'admin'], action: () => loadGenericQueue('AGUARDANDO_SEPARACAO', 'Separação') },
            { id: 'desembale', label: 'Desembale', icon: 'ph-package', profiles: ['desembale', 'admin'], action: () => loadGenericQueue('AGUARDANDO_DESEMBALE', 'Desembale') },

            // Submenu Impressão
            {
                id: 'impressao', label: 'Impressão', icon: 'ph-printer', profiles: ['admin', 'impressao'],
                children: [
                    { label: 'Silk Cilíndrica', icon: 'ph-cylinder', action: () => loadProductionQueue('SILK_CILINDRICA') },
                    { label: 'Silk Plano', icon: 'ph-square', action: () => loadProductionQueue('SILK_PLANO') },
                    { label: 'Tampografia', icon: 'ph-pen-nib', action: () => loadProductionQueue('TAMPOGRAFIA') },
                    { label: 'Impressão Laser', icon: 'ph-lightning', action: () => loadProductionQueue('IMPRESSAO_LASER') },
                    { label: 'Impressão Digital', icon: 'ph-printer', action: () => loadProductionQueue('IMPRESSAO_DIGITAL') },
                    { label: 'Estamparia', icon: 'ph-t-shirt', action: () => loadProductionQueue('ESTAMPARIA') }
                ],
                // For 'impressao' profile (non-admin), logic handles single item below
            },

            { id: 'embale', label: 'Embale', icon: 'ph-check-square-offset', profiles: ['embale', 'admin'], action: () => loadGenericQueue('AGUARDANDO_EMBALE', 'Embale') },
            { id: 'logistica', label: 'Logística', icon: 'ph-truck', profiles: ['logistica', 'admin'], action: () => loadGenericQueue('AGUARDANDO_ENVIO', 'Logística') },
            { id: 'finalizados', label: 'Finalizados', icon: 'ph-check-circle', profiles: ['admin', 'financeiro'], action: loadFinishedOrders },
            { id: 'manual', label: 'Manual do Sistema', icon: 'ph-book-open', profiles: ['admin', 'financeiro', 'arte', 'separacao', 'desembale', 'impressao', 'embale', 'logistica'], action: loadManuals },
        ],
        'ADMIN': [
            { id: 'colab', label: 'Colaboradores', icon: 'ph-users', profiles: ['admin'], action: loadCollaborators }
        ]
    };

    const userProfile = currentUser.perfil;

    Object.keys(menuStructure).forEach(sectionName => {
        const sectionItems = menuStructure[sectionName];

        // Filter visible items
        const visibleItems = sectionItems.filter(item => {
            // Admin sees all defined for admin
            if (item.profiles.includes('admin') && userProfile === 'admin') return true;
            // Specific profiles
            return item.profiles.includes(userProfile);
        });

        // Special Case: 'impressao' profile sees 'Produção (Setor)' instead of full submenu
        if (userProfile === 'impressao' && sectionName === 'PRODUÇÃO') {
            const setor = currentUser.setor_impressao || 'SILK_PLANO';
            // Remove the admin 'Impressão' submenu item from list if present (it fits profile 'impressao', but we want specific behaviour)
            // Actually, simplest is to inject the specific item if profile is impressao
            const impIndex = visibleItems.findIndex(i => i.id === 'impressao');
            if (impIndex >= 0) {
                visibleItems[impIndex] = {
                    id: 'impressao_user',
                    label: `Produção (${setor})`,
                    icon: 'ph-printer',
                    profiles: ['impressao'],
                    action: () => loadProductionQueue(setor)
                };
            }
        }

        if (visibleItems.length > 0) {
            // Render Section Header
            const header = document.createElement('div');
            header.className = 'nav-section-label';
            header.innerText = sectionName;
            nav.appendChild(header);

            visibleItems.forEach(item => {
                if (item.children && userProfile === 'admin') {
                    // RENDER SUBMENU (Admin only usually)
                    const container = document.createElement('div');

                    const toggle = document.createElement('div');
                    toggle.className = 'nav-link';
                    toggle.style.cursor = 'pointer';
                    toggle.innerHTML = `
                        <div style="display:flex; align-items:center; flex:1;">
                            <i class="ph ${item.icon}"></i> <span>${item.label}</span>
                        </div> 
                        <i class="ph ph-caret-down" style="transition: transform 0.2s;"></i>
                    `;

                    const subNav = document.createElement('div');
                    subNav.style.display = 'none';

                    toggle.onclick = (e) => {
                        e.preventDefault();
                        const isOpen = subNav.style.display === 'block';
                        subNav.style.display = isOpen ? 'none' : 'block';
                        toggle.querySelector('.ph-caret-down').style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                    };

                    item.children.forEach(child => {
                        const subLink = document.createElement('a');
                        subLink.href = '#';
                        subLink.className = 'nav-link nav-sub-item'; // Use new class
                        // Icon optional for subitems, user asked for submenus but listed icons. Let's add small ones or none?
                        // User suggestion: "Impressão Digital: 🖨️". Okay let's add icon if exists.
                        const iconHtml = child.icon ? `<i class="ph ${child.icon}" style="font-size:1rem; margin-right:0.5rem;"></i>` : '';

                        subLink.innerHTML = `${child.label}`;
                        // Actually styles say "indent taking icon into account". 
                        // If we want icons in submenu, we need to adjust HTML.
                        // Let's stick to text for submenus based on CSS ".nav-sub-item" padding? 
                        // Wait, user listed icons for submenus. Let's try to include them.
                        if (child.icon) {
                            subLink.innerHTML = `<i class="ph ${child.icon}" style="font-size:1rem; margin-right:0.5rem; width:1.2rem; text-align:center;"></i> ${child.label}`;
                            subLink.style.paddingLeft = '1rem'; // Override strict padding if adding icons inside
                        }

                        subLink.onclick = (e) => {
                            e.preventDefault();
                            // Clear all active
                            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                            document.querySelectorAll('.nav-sub-item').forEach(l => l.classList.remove('active'));

                            // Set Active
                            subLink.classList.add('active');
                            toggle.classList.add('active-parent'); // Highlight parent

                            child.action();
                        };
                        subNav.appendChild(subLink);
                    });

                    container.appendChild(toggle);
                    container.appendChild(subNav);
                    nav.appendChild(container);

                } else {
                    // RENDER STANDARD ITEM
                    const a = document.createElement('a');
                    a.href = '#';
                    a.className = 'nav-link';
                    a.innerHTML = `<div style="display:flex; align-items:center; flex:1;"><i class="ph ${item.icon}"></i> <span>${item.label}</span></div>`;

                    // Badges logic (simplified)
                    // ... (can add badge span here if needed, keeping simple for now as requested "manter contadores")
                    // To keep counters we need IDs or dynamic update logic. 
                    // Current app has updateQueueCounts() but it relies on IDs? 
                    // Verify if previous code had IDs... It didn't seem to set distinct IDs for links.

                    a.onclick = (e) => {
                        e.preventDefault();
                        document.querySelectorAll('.nav-link').forEach(l => {
                            l.classList.remove('active');
                            l.classList.remove('active-parent');
                        });
                        document.querySelectorAll('.nav-sub-item').forEach(l => l.classList.remove('active'));

                        a.classList.add('active');
                        item.action();
                    };
                    nav.appendChild(a);
                }
            });
        }
    });

    // Logout is handled in HTML footer but we can style it or move it if needed but user said "Rodapé: Sair (fixo)". Structure handles it.
}

function loadDashboard() {
    // Carrega a vista padrão baseada no perfil
    const links = document.querySelectorAll('.nav-link');
    if (links.length > 0) links[0].click();
}

// --- VISTAS ---

// Helper: Validar Autenticação
// Helper: Validar Autenticação
function renderOrderStatusBadge(status, detail) {
    let badgeClass = 'badge';
    let style = 'background:var(--bg-app); color:var(--text-secondary); border:1px solid var(--border);';

    if (status === 'ARTE FINAL') style = `background:var(--warning-bg); color:var(--warning); border-color:transparent;`;
    if (status === 'SEPARAÇÃO') style = `background:#ffedd5; color:#c2410c; border-color:transparent;`; // Orange-100/700
    if (status === 'DESEMBALE') style = `background:#f3e8ff; color:#7e22ce; border-color:transparent;`; // Purple-100/700
    if (status === 'IMPRESSÃO') style = `background:#fce7f3; color:#be185d; border-color:transparent;`; // Pink-100/700
    if (status === 'EMBALE') style = `background:#cffafe; color:#0e7490; border-color:transparent;`; // Cyan-100/700
    if (status === 'LOGÍSTICA') style = `background:#dbeafe; color:#1d4ed8; border-color:transparent;`; // Blue-100/700
    if (status === 'FINALIZADO') style = `background:var(--success-bg); color:var(--success); border-color:transparent;`;

    return `<span class="badge" style="${style} padding: 0.25rem 0.6em;">
        ${status} ${detail ? `<small style="opacity:0.8; font-weight:400;">(${detail})</small>` : ''}
    </span>`;
}

// Helper: Visualização de Fluxo (Barra de Status)
function renderFlowStatusBar(item) {
    // Define sequence
    const currentSeq = getStatusSequence(item.status_atual);

    // Steps Definition
    const steps = [
        { label: 'ARTE FINAL', seq: 0 },
        { label: 'SEPARAÇÃO', seq: 1 },
        { label: 'DESEMBALE', seq: 2 },
        { label: 'IMPRESSÃO', seq: 3 },
        { label: 'EMBALE', seq: 4 },
        { label: 'LOGÍSTICA', seq: 5 }
    ];

    let html = '<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem; overflow-x:auto; padding-bottom:0.2rem; flex-wrap:wrap;">';

    steps.forEach((step, index) => {
        let style = 'color: #94a3b8; border: 1px solid #e2e8f0; background: #f8fafc;'; // Future
        let icon = '';

        if (currentSeq > step.seq) {
            // Past / Completed
            style = 'color: var(--success); border: 1px solid var(--success-bg); background: var(--success-bg); font-weight:600;';
            icon = '<i class="ph-check" style="margin-right:2px"></i>';
        } else if (currentSeq === step.seq) {
            // Current - High Contrast Blue for Visibility
            style = 'color: #1d4ed8; border: 1px solid #2563eb; background: #eff6ff; font-weight:700; box-shadow: 0 0 0 1px #2563eb;';
        }

        html += `
            <div style="padding: 0.2rem 0.5rem; border-radius: 2px; font-size: 0.65rem; text-transform:uppercase; white-space:nowrap; ${style}">
                ${icon}${step.label}
            </div>
        `;

        if (index < steps.length - 1) {
            html += `<i class="ph-caret-right" style="color:#cbd5e1; font-size:0.7rem;"></i>`;
        }
    });

    html += '</div>';
    return html;
}

function getStatusSequence(status) {
    if (status === 'AGUARDANDO_SEPARACAO') return 1;
    if (status === 'AGUARDANDO_DESEMBALE') return 2;
    if (status === 'AGUARDANDO_PRODUCAO' || status === 'EM_PRODUCAO') return 3;
    if (status === 'AGUARDANDO_EMBALE') return 4;
    if (status === 'AGUARDANDO_ENVIO') return 5;
    if (status === 'CONCLUIDO') return 6;
    return 0; // Arte sequence
}

// 1. Pedidos (Financeiro)
let cachedOrders = []; // Cache para evitar re-fetch no filtro

// Relatórios (Movido para reports.js)
function loadReports() {
}

async function loadOrders() {
    document.getElementById('pageTitle').textContent = 'Gerenciamento de Pedidos';
    document.getElementById('contentArea').innerHTML = '<p>Carregando...</p>';

    try {
        const res = await fetch('/api/orders');
        cachedOrders = await res.json();

        renderOrdersView(false); // false = Modo Ativos

    } catch (e) {
        document.getElementById('contentArea').innerHTML = '<p style="color:red">Erro ao carregar pedidos</p>';
        console.error(e);
    }
}

let currentViewMode = 'active'; // 'active' or 'finished'

async function loadFinishedOrders() {
    document.getElementById('pageTitle').textContent = 'Arquivo de Pedidos Finalizados';
    document.getElementById('contentArea').innerHTML = '<p>Carregando...</p>';
    currentViewMode = 'finished';

    try {
        const res = await fetch('/api/orders'); // Fetch all, filtered client side for now
        cachedOrders = await res.json();
        renderOrdersView(true);
    } catch (e) {
        document.getElementById('contentArea').innerHTML = '<p style="color:red">Erro ao carregar pedidos</p>';
        console.error(e);
    }
}

function renderOrdersView(isFinishedMode = false) {
    currentViewMode = isFinishedMode ? 'finished' : 'active';

    // Toolbar diferent para cada modo
    let toolbarHtml = '';

    if (isFinishedMode) {
        // MODO FINALIZADOS: Apenas Pesquisa
        toolbarHtml = `
             <div class="card" style="padding: 1rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; background: #f0fdf4; border: 1px solid #bbf7d0;">
                <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 250px;">
                    <label style="font-size: 0.8rem; color: #15803d;"><strong>Arquivo de Finalizados</strong> - Pesquisa</label>
                    <input type="text" id="searchInput" class="form-control" placeholder="Pesquisar pedido finalizado por nº ou cliente..." oninput="debouncedApplyOrderFilters()">
                </div>
                
                <div class="form-group" style="margin-bottom:0; min-width: 140px;">
                     <label style="font-size: 0.8rem; color: #15803d;">De (Prazo)</label>
                     <input type="date" id="filterDateStart" class="form-control" onchange="applyOrderFilters()">
                </div>

                <div class="form-group" style="margin-bottom:0; min-width: 140px;">
                     <label style="font-size: 0.8rem; color: #15803d;">Até (Prazo)</label>
                     <input type="date" id="filterDateEnd" class="form-control" onchange="applyOrderFilters()">
                </div>
                
                 <button class="btn" style="width: auto; height: 42px; align-self: flex-end;" onclick="resetOrderFilters()">Limpar</button>
                 <div style="flex:1; text-align:right; font-size:0.9rem; color:var(--text-secondary); align-self: flex-end; padding-bottom: 0.5rem;" id="orderCount">
                    ...
                 </div>
            </div>
        `;
    } else {
        // MODO ATIVOS: Completo
        toolbarHtml = `
             <div class="card" style="padding: 1rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 250px;">
                    <label style="font-size: 0.8rem;">Pesquisa Rápida</label>
                    <input type="text" id="searchInput" class="form-control" placeholder="Pesquisar por nº do pedido ou cliente..." oninput="debouncedApplyOrderFilters()">
                </div>

                <div class="form-group" style="margin-bottom:0; min-width: 200px;">
                    <label style="font-size: 0.8rem;">Status do Pedido</label>
                    <select id="filterStatus" class="form-control" onchange="applyOrderFilters()">
                        <option value="">Todos</option>
                        <option value="FINANCEIRO / CONFERÊNCIA">Financeiro / Conferência</option>
                        <option value="ARTE FINAL">Arte Final</option>
                        <option value="SEPARAÇÃO">Separação</option>
                        <option value="DESEMBALE">Desembale</option>
                        <option value="IMPRESSÃO">Impressão</option>
                        <option value="EMBALE">Embale</option>
                        <option value="LOGÍSTICA">Logística</option>
                    </select>
                </div>

                <div class="form-group" style="margin-bottom:0; min-width: 200px;">
                    <label style="font-size: 0.8rem;">Status do Item (Avançado)</label>
                    <select id="filterItemStatus" class="form-control" onchange="applyOrderFilters()">
                        <option value="">Qualquer</option>
                        <option value="ARTE_NAO_FEITA">Arte não feita</option>
                        <option value="AGUARDANDO_APROVACAO">Aguardando aprovação</option>
                        <option value="ARTE_APROVADA">Arte aprovada</option>
                        <option value="AGUARDANDO_SEPARACAO">Em separação</option>
                        <!-- Separado e Em desembale geralmente são o mesmo status de transição, unificando para o mais ativo -->
                        <option value="AGUARDANDO_DESEMBALE">Em desembale</option> 
                        <!-- Desembalado e Aguardando Produção -->
                        <option value="AGUARDANDO_PRODUCAO">Desembalado / Aguardando Impressão</option>
                        <option value="EM_PRODUCAO">Em impressão</option>
                        <option value="AGUARDANDO_EMBALE">Em embale</option>
                        <option value="AGUARDANDO_ENVIO">Em logística</option>
                        <option value="CONCLUIDO">Finalizado / Enviado</option>
                    </select>
                </div>
                
                 <button class="btn" style="width: auto; height: 42px; align-self: flex-end;" onclick="resetOrderFilters()">Limpar</button>

                 <div style="flex:1; text-align:right; font-size:0.9rem; color:var(--text-secondary); align-self: flex-end; padding-bottom: 0.5rem;" id="orderCount">
                    ...
                 </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <p>Lista de pedidos ordenada por prazo de entrega.</p>
                <button class="btn" style="width: auto;" onclick="openNewOrderModal()"> <i class="ph-plus-circle"></i> Novo Pedido</button>
            </div>
        `;
    }

    const html = `
        <div style="margin-bottom: 1rem; display: flex; flex-direction: column; gap: 1rem;">
             ${toolbarHtml}
        </div>

        <div class="card">
            <table>
                <thead>
                    <tr>
                        <th>Nº Pedido</th>
                        ${isFinishedMode ? '<th>Layout</th>' : ''}
                        <th>Cliente</th>
                        <th>Prazo</th>
                        <th>Status Oficial</th>
                        <th style="min-width: 140px;">Ações</th>
                    </tr>
                </thead>
                <tbody id="ordersTableBody">
                    <!-- Será preenchido por applyOrderFilters -->
                </tbody>
            </table>
        </div>
    `;
    document.getElementById('contentArea').innerHTML = html;

    // Trigger initial filter application
    applyOrderFilters();
}

function renderOrderRows(orders, isFinishedMode = false) {
    if (orders.length === 0) return '<tr><td colspan="5" style="text-align:center; padding: 2rem;">Nenhum pedido encontrado.</td></tr>';

    const canEdit = currentUser && (currentUser.perfil === 'admin' || currentUser.perfil === 'financeiro');

    return orders.map(o => `
        <tr>
            <td><strong>${o.numero_pedido}</strong></td>
            ${isFinishedMode ? `<td>${renderLayoutThumbnail(o)}</td>` : ''}
            <td>${o.cliente}</td>
            <td>${renderDeadline(o.prazo_entrega)}</td>
            <td>
                ${renderOrderStatusBadge(o.status_oficial, o.setor_detalhe)}
                <div style="margin-top:0.25rem">${renderShippingBadge(o.tipo_envio)}</div>
            </td>
            <td>
                <div style="display:flex; gap:0.5rem; white-space: nowrap;">
                    <button class="btn" style="padding: 0.25rem 0.5rem; width: auto;" onclick="viewOrderDetails(${o.id})">Ver</button>
                    ${canEdit && !isFinishedMode ? `<button class="btn" style="padding: 0.25rem 0.5rem; width: auto; background: var(--warning); color: #78350f" onclick="openEditOrderModal(${o.id})" title="Editar"><i class="ph-pencil-simple"></i> Editar</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

let filterTimeout;
function debouncedApplyOrderFilters() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(applyOrderFilters, 300);
}

function applyOrderFilters() {
    // Get values safely (elements might not exist in Finished View)
    const statusEl = document.getElementById('filterStatus');
    const itemEl = document.getElementById('filterItemStatus');

    const statusFilter = statusEl ? statusEl.value : '';
    const itemFilter = itemEl ? itemEl.value : '';
    const searchText = document.getElementById('searchInput').value.trim().toLowerCase();

    // Date Filters
    const dateStartEl = document.getElementById('filterDateStart');
    const dateEndEl = document.getElementById('filterDateEnd');
    const dateStart = dateStartEl ? dateStartEl.value : '';
    const dateEnd = dateEndEl ? dateEndEl.value : '';

    const filtered = cachedOrders.filter(o => {
        // 0. STRICT MODE SEPARATION
        if (currentViewMode === 'finished') {
            // Must be strictly FINALIZED
            if (o.status_oficial !== 'FINALIZADO') return false;
        } else {
            // Must be strictly NOT FINALIZED
            if (o.status_oficial === 'FINALIZADO') return false;
        }

        // 1. Filter by Order Status (Active View Only)
        let matchStatus = true;
        if (currentViewMode === 'active') {
            if (statusFilter === 'PENDENTE') {
                matchStatus = o.status_oficial !== 'FINALIZADO';
            } else if (statusFilter) {
                matchStatus = o.status_oficial === statusFilter;
            }
        }

        // 2. Filter by Item Status (Active View Only)
        let matchItem = true;
        if (currentViewMode === 'active' && itemFilter) {
            matchItem = o.itens && o.itens.some(i => {
                if (itemFilter === 'ARTE_NAO_FEITA') return !i.arte_status || i.arte_status === 'ARTE_NAO_FEITA' || i.arte_status === 'REPROVADO';
                if (itemFilter === 'AGUARDANDO_APROVACAO') return i.arte_status === 'AGUARDANDO_APROVACAO';
                if (itemFilter === 'ARTE_APROVADA') return i.arte_status === 'ARTE_APROVADA';
                return i.status_atual === itemFilter;
            });
        }

        // 3. Search Filter (Both Views)
        let matchSearch = true;
        if (searchText) {
            const num = String(o.numero_pedido).toLowerCase();
            const cli = String(o.cliente).toLowerCase();
            matchSearch = num.includes(searchText) || cli.includes(searchText);
        }

        // 4. Date Filter (Prazo de Entrega) - Applicable to both views but mostly useful for finished
        let matchDate = true;
        if (dateStart || dateEnd) {
            // o.prazo_entrega is YYYY-MM-DD usually
            const prazo = o.prazo_entrega ? o.prazo_entrega.split('T')[0] : ''; // Safety
            if (prazo) {
                if (dateStart && prazo < dateStart) matchDate = false;
                if (dateEnd && prazo > dateEnd) matchDate = false;
            } else {
                // If no deadline, filter out if dates are set? Or include? 
                // Usually exclude if range is set.
                if (dateStart || dateEnd) matchDate = false;
            }
        }

        return matchStatus && matchItem && matchSearch && matchDate;
    });

    // Sort Logic
    if (searchText && !isNaN(searchText)) {
        // Search Priority
        filtered.sort((a, b) => {
            const aNum = String(a.numero_pedido).toLowerCase();
            const bNum = String(b.numero_pedido).toLowerCase();
            // Exact match comes first
            if (aNum === searchText && bNum !== searchText) return -1;
            if (bNum === searchText && aNum !== searchText) return 1;
            // Starts with comes second
            if (aNum.startsWith(searchText) && !bNum.startsWith(searchText)) return -1;
            if (bNum.startsWith(searchText) && !aNum.startsWith(searchText)) return 1;
            return 0;
        });
    } else {
        // Default Sorts
        if (currentViewMode === 'finished') {
            // Finalized: Newest First (by ID as proxy for now)
            filtered.sort((a, b) => b.id - a.id);
        }
        // Active: Preserve server order (deadline)
    }

    document.getElementById('ordersTableBody').innerHTML = renderOrderRows(filtered, currentViewMode === 'finished');
    document.getElementById('orderCount').textContent = `${filtered.length} pedidos encontrados`;
}

function resetOrderFilters() {
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterItemStatus').value = '';
    document.getElementById('searchInput').value = '';
    if (document.getElementById('filterDateStart')) document.getElementById('filterDateStart').value = '';
    if (document.getElementById('filterDateEnd')) document.getElementById('filterDateEnd').value = '';
    applyOrderFilters();
}

// 2. Fila de Arte
// 2. Fila de Arte
// Helper: Filtro Local de Tabela (Genérico)
function filterLocalTable(query) {
    const rows = document.querySelectorAll('#contentArea table tbody tr');
    const q = query.toLowerCase();
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
    });
}

async function loadArteQueue() {
    document.getElementById('pageTitle').textContent = 'Fila de Arte';
    try {
        const res = await fetch('/api/production/itens/ARTE');
        const itens = await res.json();

        // --- BUSCAR COLABORADORES DA ARTE ---
        let sectorUsers = [];
        try {
            const resUsers = await fetch('/api/collaborators/sector/ARTE_FINAL');
            sectorUsers = await resUsers.json();
        } catch (e) {
            console.error("Erro carregando colaboradores de arte:", e);
        }

        let html = `
            <div class="form-group" style="max-width: 400px; margin-bottom: 1rem;">
                <input type="text" class="form-control" placeholder="🔍 Pesquisar na arte..." oninput="filterLocalTable(this.value)">
            </div>
            <div class="card"><table><thead><tr><th>Pedido</th><th>Item</th><th>Prazo</th><th>Status Arte</th><th>Responsável</th><th>Ação</th></tr></thead><tbody>
        `;

        itens.forEach(item => {
            // --- DROPDOWN RESPONSÁVEL ---
            const currentResp = item.responsavel_arte || '';
            let options = `<option value="">-- Selecione --</option>`;
            sectorUsers.forEach(u => {
                const sel = u.nome === currentResp ? 'selected' : '';
                options += `<option value="${u.nome}" ${sel}>${u.nome}</option>`;
            });

            const respBlock = currentResp
                ? `<span style="font-weight:600; color:var(--text-secondary);">${currentResp}</span>`
                : '<span style="color:#cbd5e1;">-</span>';

            const layoutIndicator = renderLayoutIndicator(item.layout_path, item.layout_type);

            const colorInfo = item.cor_impressao
                ? `<div style="margin-top: 0.25rem; font-size: 0.8rem; color: var(--text-secondary);"><i class="ph-drop"></i> Cor de Impressão: <strong>${item.cor_impressao}</strong></div>`
                : '';

            html += `
                <tr>
                    <td>${item.numero_pedido}<br><small>${item.cliente}</small></td>
                    <td>
                        <strong>${item.produto}</strong> (x${item.quantidade})
                        ${item.referencia ? `<div style="font-size:0.85rem; color:#475569; margin-top:0.2rem;">Referência: <strong>${item.referencia}</strong></div>` : ''}
                        <div style="margin-top:0.25rem">${renderShippingBadge(item.tipo_envio)}</div>
                        ${colorInfo}
                    </td>
                     <td>${new Date(item.prazo_entrega).toLocaleDateString()}</td>
                     <td>
                        <span class="badge ${item.arte_status === 'ARTE_NAO_FEITA' ? 'badge-danger' : (item.arte_status === 'AGUARDANDO_APROVACAO' ? 'badge-warning' : 'badge-success')}">
                            ${item.arte_status}
                        </span>
                        <div style="margin-top:0.25rem">${layoutIndicator}</div>
                     </td>
                     <td>${respBlock}</td>
                     <td>
                        <button class="btn" style="width: auto; font-size: 0.8rem;" onclick="openArteAction(${item.id})">Definir / Upload</button>
                     </td>
                </tr>
             `;
        });

        html += '</tbody></table></div>';
        document.getElementById('contentArea').innerHTML = html;
        console.log("Fila de Arte carregada. Usuários:", sectorUsers.length);
    } catch (e) {
        console.error(e);
        document.getElementById('contentArea').innerHTML = '<p style="color:red">Erro ao carregar fila de arte.</p>';
    }
}

// --- FUNÇÃO GLOBAL DE ATRIBUIÇÃO ---
async function assignItem(itemId, sectorCode, paramsOrName) {
    // sectorCode: 'arte', 'separacao', 'impressao', etc.
    // paramsOrName: O valor do dropdown (nome do responsavel).

    const responsavel = paramsOrName;
    // Mapear coluna: 'responsavel_arte', 'responsavel_separacao'
    const column = `responsavel_${sectorCode}`;

    if (!responsavel) {
        // Se vazio, talvez queira limpar? Por enquanto ignorar ou limpar.
        // Vamos permitir limpar se vier string vazia
    }

    try {
        const res = await fetch(`/api/production/item/${itemId}/assign`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sector: sectorCode, responsavel })
        });

        if (res.ok) {
            // Sucesso silencioso (MVP) ou Toast?
            // Toast simples
            const toast = document.createElement('div');
            toast.textContent = `Atribuído a ${responsavel}`;
            toast.style.cssText = `position:fixed; bottom:20px; right:20px; background:#22c55e; color:white; padding:10px 20px; border-radius:4px; z-index:1000`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        } else {
            alert('Erro ao atribuir responsável.');
        }
    } catch (e) {
        console.error('Erro assignItem', e);
    }
}

// 3. Filas Genéricas (Separação, Desembale, Embale, Logística)
// 3. Filas Genéricas (Separação, Desembale, Embale, Logística)
async function loadGenericQueue(statusFiltro, titulo) {
    document.getElementById('pageTitle').textContent = `Fila de ${titulo}`;

    try {
        // Fetch Parallel: Execution + Future
        const [resExec, resFuture] = await Promise.all([
            fetch(`/api/production/itens/${statusFiltro}`),
            fetch(`/api/production/itens/${statusFiltro}?future=true`)
        ]);

        const itensExec = await resExec.json();
        const itensFuture = await resFuture.json();

        const totalItems = itensExec.length + itensFuture.length;
        document.getElementById('headerActions').innerHTML = `<span class="badge badge-blue">Total: <span id="queueCount">${totalItems}</span> (Ativos: ${itensExec.length} / Futuros: ${itensFuture.length})</span>`;

        // Loading Users (Shared)
        let targetSectorCode = getSectorFromStatus(statusFiltro);
        let sectorUsers = [];
        if (targetSectorCode) {
            let searchID = '';
            if (targetSectorCode === 'separacao') searchID = 'SEPARACAO';
            else if (targetSectorCode === 'desembale') searchID = 'DESEMBALE';
            else if (targetSectorCode === 'embale') searchID = 'EMBALE';
            else if (targetSectorCode === 'logistica') searchID = 'LOGISTICA';

            if (searchID) {
                const resUsers = await fetch(`/api/collaborators/sector/${searchID}`);
                sectorUsers = await resUsers.json();
            }
        }

        let html = `
            <div class="form-group" style="max-width: 400px; margin-bottom: 1rem;">
                <input type="text" class="form-control" placeholder="🔍 Pesquisar em ${titulo}..." oninput="filterLocalTable(this.value)">
            </div>
        `;

        // --- BLOCK 1: EXECUTION (ACTIVE) ---
        html += `<h3 style="font-size: 1rem; color: #1e293b; margin-bottom: 0.5rem; border-left: 4px solid #3b82f6; padding-left: 0.5rem;">🚀 PEDIDOS PARA EXECUÇÃO (${itensExec.length})</h3>`;

        if (itensExec.length === 0) {
            html += `<div class="card" style="padding:1rem; text-align:center; color:#94a3b8; margin-bottom: 2rem;">Nenhum pedido aguardando ação neste setor.</div>`;
        } else {
            html += `<div class="card" style="margin-bottom: 2rem;"><table><thead><tr><th>Pedido</th><th>Item</th><th>Prazo</th><th>Qtd</th><th>Responsável</th><th>Ação</th></tr></thead><tbody>`;
            html += renderGenericRows(itensExec, statusFiltro, false, sectorUsers, targetSectorCode); // false = Not ReadOnly
            html += `</tbody></table></div>`;
        }

        // --- BLOCK 2: FUTURE (READ ONLY) ---
        html += `<h3 style="font-size: 1rem; color: #64748b; margin-bottom: 0.5rem; display:flex; align-items:center; gap:0.5rem; border-left: 4px solid #94a3b8; padding-left: 0.5rem;">🔒 PEDIDOS FUTUROS (VISUALIZAÇÃO) (${itensFuture.length})</h3>`;

        if (itensFuture.length === 0) {
            html += `<div class="card" style="padding:1rem; text-align:center; color:#94a3b8;">Nenhum pedido futuro previsto.</div>`;
        } else {
            html += `<div class="card" style="background: #f8fafc;"><table><thead><tr><th>Pedido</th><th>Item</th><th>Prazo</th><th>Qtd</th><th>Responsável</th><th>Status Atual</th></tr></thead><tbody>`;
            html += renderGenericRows(itensFuture, statusFiltro, true, sectorUsers, targetSectorCode); // true = ReadOnly
            html += `</tbody></table></div>`;
        }

        document.getElementById('contentArea').innerHTML = html;

    } catch (e) {
        console.error(e);
        document.getElementById('contentArea').innerHTML = '<p style="color:red">Erro ao carregar fila.</p>';
    }
}

// Helper para Renderizar Linhas (Shared Logic)
function renderGenericRows(itens, statusFiltro, isReadOnly, sectorUsers, targetSectorCode) {
    return itens.map(item => {
        let actionBtn = '';
        let nextStatus = '';
        let btnLabel = '';

        // Status Logic (Only for Execution)
        if (!isReadOnly) {
            if (statusFiltro === 'AGUARDANDO_SEPARACAO') {
                nextStatus = 'AGUARDANDO_DESEMBALE';
                btnLabel = 'Separado OK';
            } else if (statusFiltro === 'AGUARDANDO_DESEMBALE') {
                nextStatus = 'AGUARDANDO_PRODUCAO';
                btnLabel = 'Liberar Produção';
            } else if (statusFiltro === 'AGUARDANDO_EMBALE') {
                nextStatus = 'AGUARDANDO_ENVIO';
                btnLabel = 'Embalado OK';
            } else if (statusFiltro === 'AGUARDANDO_ENVIO') {
                nextStatus = 'CONCLUIDO';
                btnLabel = 'Despachar';
            }

            if (nextStatus) {
                if (statusFiltro === 'AGUARDANDO_EMBALE') {
                    actionBtn = `<button class="btn" style="width: auto; padding: 0.25rem 0.5rem;" onclick="if(validateResponsible(${item.id})) openEmbaleAction(${item.id}, ${item.pedido_id}, '${item.tipo_envio}')">Conferir Embale</button>`;
                } else if (statusFiltro === 'AGUARDANDO_ENVIO') {
                    const itemJson = JSON.stringify(item).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                    // Validate before opening label modal
                    actionBtn = `<button class="btn" style="width: auto; padding: 0.25rem 0.5rem;" onclick='if(validateResponsible(${item.id})) openLabelModal(${itemJson})'> <i class="ph-tag"></i> Etiqueta / Despachar</button>`;
                } else if (statusFiltro === 'AGUARDANDO_DESEMBALE') {
                    if (!item.setor_destino) {
                        actionBtn = `<button class="btn" style="width: auto; padding: 0.25rem 0.5rem; background: var(--text-secondary); cursor: not-allowed;" onclick="alert('Defina a forma de impressão na Arte Final antes de concluir o Desembale.')">Liberar Produção</button>`;
                    } else {
                        actionBtn = `<button class="btn" style="width: auto; padding: 0.25rem 0.5rem;" onclick="if(validateResponsible(${item.id})) openDesembaleConfirmation(${item.id}, '${nextStatus}')">${btnLabel}</button>`;
                    }
                } else {
                    actionBtn = `<button class="btn" style="width: auto; padding: 0.25rem 0.5rem;" onclick="mudarStatusItem(${item.id}, '${nextStatus}')">${btnLabel}</button>`;
                }

                // Rollback
                actionBtn += `<button class="btn" style="background:transparent; color:#666; border:1px solid #ccc; width:auto; padding:0.25rem 0.5rem; margin-top:0.25rem;" onclick="openRollbackModal(${item.id}, '${item.status_atual}', '${item.setor_destino || ''}')" title="Voltar Etapa"><i class="ph-arrow-u-up-left"></i> Voltar</button>`;
            }
        } else {
            // Read Only Placeholder
            actionBtn = `<span style="font-size:0.8rem; color:#94a3b8;"><i class="ph-lock"></i> Aguardando etapa anterior</span>`;
        }

        // Responsible Dropdown
        let respBlock = '';
        if (targetSectorCode && !isReadOnly) { // Only allow assign in Execution? Or allow assign in Future too? User said "Não pode iniciar ...". Assigning might be useful for planning. Let's allow Assign in future too? 
            // "Somente o setor correto (na etapa atual) consiga EDITAR / EXECUTAR ações."
            // Assigning is kind of planning. Let's allowing VIEWING, but maybe keep assignment locked to avoid confusion?
            // "Campos editáveis ficam ativos... Quando CHEGAR na etapa" -> So Future = Locked fields.
            const currentResp = item[`responsavel_${targetSectorCode}`] || '';
            let options = `<option value="">-- Selecione --</option>`;
            sectorUsers.forEach(u => {
                const sel = u.nome === currentResp ? 'selected' : '';
                options += `<option value="${u.nome}" ${sel}>${u.nome}</option>`;
            });
            respBlock = `
                 <select class="form-control" id="resp_select_${item.id}" style="padding: 0.25rem; font-size: 0.8rem; width: 100%; border-color: #cbd5e1;" 
                        onchange="assignItem(${item.id}, '${targetSectorCode}', this.value)">
                    ${options}
                </select>`;
        } else if (targetSectorCode && isReadOnly) {
            // Read Only Assign
            const currentResp = item[`responsavel_${targetSectorCode}`] || '--';
            respBlock = `<span style="color:#64748b; font-size:0.85rem;">${currentResp}</span>`;
        }

        // Layout & Prints
        const layoutIndicator = renderLayoutIndicator(item.layout_path, item.layout_type);
        const colorInfo = item.cor_impressao ? `<div style="margin-top: 0.25rem; font-size: 0.8rem; color: var(--text-secondary);"><i class="ph-drop"></i> Cor: <strong>${item.cor_impressao}</strong></div>` : '';

        let printSectorInfo = '';
        if (item.setor_destino) {
            printSectorInfo = `<div style="margin-bottom: 0.5rem;"><span class="badge badge-blue" style="font-size: 0.75rem;"><i class="ph-printer"></i> ${item.setor_destino.replace(/_/g, ' ')}</span></div>`;
        } else if (statusFiltro === 'AGUARDANDO_DESEMBALE') { // Warn only in Desembale context
            printSectorInfo = `<div style="margin-bottom: 0.5rem;"><span class="badge badge-danger" style="font-size: 0.75rem;">IMPRESSÃO NÃO DEFINIDA</span></div>`;
        }

        // Obs Arte
        const obsArteContent = item.observacao_arte
            ? `<div style="margin-top:0.5rem; font-size:0.8rem; color:#c2410c; background:#fff7ed; border:1px solid #fdba74; padding:0.25rem; border-radius:4px;"><i class="ph-warning"></i> ${item.observacao_arte}</div>`
            : '';

        // Obs: Bypass Embale
        const volumeWarning = (item.flag_embale_sem_volumes === 1 || item.flag_embale_sem_volumes === true)
            ? `<div style="margin-top:0.5rem; font-size:0.7rem; color:#b45309; background:#fffbeb; border:1px solid #fcd34d; padding:0.25rem; border-radius:4px;"><i class="ph-warning-octagon"></i> VEIO DO EMBALE S/ VOLUMES</div>`
            : '';

        // Production Duration (If available)
        let productionDurationInfo = '';
        if (item.inicio_producao_timestamp && item.fim_producao_timestamp) {
            const startStr = item.inicio_producao_timestamp;
            const endStr = item.fim_producao_timestamp;

            // Parse UTC
            const startTime = startStr.indexOf('Z') === -1 ? new Date(startStr.replace(' ', 'T') + 'Z') : new Date(startStr);
            const endTime = endStr.indexOf('Z') === -1 ? new Date(endStr.replace(' ', 'T') + 'Z') : new Date(endStr);

            let diff = endTime - startTime;
            if (diff < 0) diff = 0;

            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            const pad = (n) => n.toString().padStart(2, '0');

            productionDurationInfo = `
                <div style="margin-bottom: 0.25rem; font-family: monospace; font-size: 0.8rem; color: #475569; background: #f1f5f9; padding: 0.1rem 0.4rem; border-radius: 4px; display: inline-block;">
                    <i class="ph-timer"></i> Tempo Produção: <strong>${pad(hours)}:${pad(minutes)}:${pad(seconds)}</strong>
                </div>
             `;
        }

        // Status Bar
        const statusBar = renderFlowStatusBar(item);


        // Enhanced Status Display for Future Items
        let statusDisplay = item.status_atual;
        if (isReadOnly) {
            if ((item.status_atual === 'AGUARDANDO_PRODUCAO' || item.status_atual === 'EM_PRODUCAO') && item.setor_destino) {
                // Formatting sector name nicely
                const prettySector = item.setor_destino
                    .replace('IMPRESSAO_', '')
                    .replace('_', ' ');
                statusDisplay += ` <br><span style="font-size:0.7em; text-transform:uppercase; color:#0f172a; font-weight:bold;">(${prettySector})</span>`;
            }
        }

        return `
            <tr style="${isReadOnly ? 'opacity: 0.8;' : ''}">
                <td>
                    ${statusBar}
                    ${item.numero_pedido}<br><small>${item.cliente}</small>
                </td>
                <td>
                    <strong>${item.produto}</strong>
                    ${item.referencia ? `<div style="font-size:0.85rem; color:#475569;">Ref: ${item.referencia}</div>` : ''}
                    <div style="margin-top:0.25rem">${renderShippingBadge(item.tipo_envio)}</div>
                </td>
                <td>${renderDeadline(item.prazo_entrega)}</td>
                <td>${item.quantidade}</td>
                <td>${respBlock}</td>
                <td>
                    <div style="display:flex; gap: 0.75rem; align-items: flex-start;">
                         <!-- Coluna Esquerda: Thumbnail -->
                         <div style="flex-shrink:0;">
                             ${layoutIndicator}
                         </div>
                         
                         <!-- Coluna Direita: Infos -->
                         <div style="display:flex; flex-direction:column; gap:0.25rem; align-items: flex-start;">
                            <!-- Linha 1: Badges -->
                            ${printSectorInfo}
                            ${productionDurationInfo}
                            
                            <!-- Linha 2: Status (se readonly) ou Botao -->
                            ${!isReadOnly ? `<div>${actionBtn}</div>` : `<div style="margin-top:0.2rem"><span class="badge" style="background:#e2e8f0; color:#64748b;">${statusDisplay}</span></div>`}
                            
                            <!-- Linha 3: Cor -->
                            ${colorInfo}
                            
                            <!-- Linha 4: Alerts/Obs -->
                            ${obsArteContent}
                            ${volumeWarning}
                         </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 4. Produção (Impressão)
async function loadProductionQueue(setor) {
    document.getElementById('pageTitle').textContent = `Produção: ${setor.replace('_', ' ')}`;

    // --- BUSCAR COLABORADORES DO SUB-SETOR ---
    let sectorUsers = [];
    try {
        const resUsers = await fetch(`/api/collaborators/sector/${setor}`);
        if (resUsers.ok) {
            sectorUsers = await resUsers.json();
        }
    } catch (e) {
        console.error("Erro users impressao", e);
    }

    if (!Array.isArray(sectorUsers)) sectorUsers = [];

    // Fetch Parallel: Execution + Future
    let itensExec = [];
    let itensFuture = [];

    try {
        const [resExec, resFuture] = await Promise.all([
            fetch(`/api/production/itens/${setor}?t=${new Date().getTime()}`),
            fetch(`/api/production/itens/${setor}?future=true&t=${new Date().getTime()}`)
        ]);

        if (resExec.ok) {
            const json = await resExec.json();
            itensExec = Array.isArray(json) ? json : [];
            if (!Array.isArray(json)) console.error("API Exec returned non-array:", json);
        } else {
            console.error("API Exec Error:", resExec.status);
        }

        if (resFuture.ok) {
            const json = await resFuture.json();
            itensFuture = Array.isArray(json) ? json : [];
            if (!Array.isArray(json)) console.error("API Future returned non-array:", json);
        } else {
            console.error("API Future Error:", resFuture.status);
        }
    } catch (e) {
        console.error("Error fetching production items:", e);
        // Silent fail for user or mild alert only if strictly necessary. 
        // alert("Erro ao carregar itens."); // Removing aggressive alert to avoid spam if intermittent.
    }

    const totalItems = itensExec.length + itensFuture.length;
    document.getElementById('headerActions').innerHTML = `<span class="badge badge-blue">Total: <span id="queueCount">${totalItems}</span> (Ativos: ${itensExec.length} / Futuros: ${itensFuture.length})</span>`;

    let html = `
        <div class="form-group" style="max-width: 400px; margin-bottom: 1rem;">
            <input type="text" class="form-control" placeholder="🔍 Pesquisar na produção..." oninput="filterLocalTable(this.value)">
        </div>
    `;

    // --- BLOCK 1: EXECUTION (ACTIVE) ---
    html += `<h3 style="font-size: 1rem; color: #1e293b; margin-bottom: 0.5rem; border-left: 4px solid #3b82f6; padding-left: 0.5rem;">🚀 PEDIDOS PARA EXECUÇÃO (${itensExec.length})</h3>`;

    if (itensExec.length === 0) {
        html += `<div class="card" style="padding:1rem; text-align:center; color:#94a3b8; margin-bottom: 2rem;">Nenhum pedido aguardando ação neste setor.</div>`;
    } else {
        html += `<div class="card" style="margin-bottom: 2rem;"><table><thead><tr><th>Pedido</th><th>Item</th><th>Prazo</th><th>Qtd</th><th>Status</th><th>Responsável</th><th>Ação</th></tr></thead><tbody>`;
        html += renderProductionRows(itensExec, setor, false, sectorUsers);
        html += `</tbody></table></div>`;
    }

    // --- BLOCK 2: FUTURE (READ ONLY) ---
    html += `<h3 style="font-size: 1rem; color: #64748b; margin-bottom: 0.5rem; display:flex; align-items:center; gap:0.5rem; border-left: 4px solid #94a3b8; padding-left: 0.5rem;">🔒 PEDIDOS FUTUROS (VISUALIZAÇÃO) (${itensFuture.length})</h3>`;

    if (itensFuture.length === 0) {
        html += `<div class="card" style="padding:1rem; text-align:center; color:#94a3b8;">Nenhum pedido futuro previsto.</div>`;
    } else {
        html += `<div class="card" style="background: #f8fafc;"><table><thead><tr><th>Pedido</th><th>Item</th><th>Prazo</th><th>Qtd</th><th>Responsável</th><th>Status Atual</th></tr></thead><tbody>`;
        html += renderProductionRows(itensFuture, setor, true, sectorUsers);
        html += `</tbody></table></div>`;
    }

    document.getElementById('contentArea').innerHTML = html;

    // START TIMERS
    if (window.productionTimerInterval) clearInterval(window.productionTimerInterval);
    updateLiveTimers(); // Immediate run
    window.productionTimerInterval = setInterval(updateLiveTimers, 1000);
}

function renderProductionRows(itens, setor, isReadOnly, sectorUsers) {
    if (!Array.isArray(itens)) {
        console.error("renderProductionRows received non-array:", itens);
        return '<tr><td colspan="6">Erro interno: Dados inválidos (não é array).</td></tr>';
    }

    return itens.map(item => {
        try {
            // --- DROPDOWN RESPONSÁVEL ---
            let respBlock = '';
            // ... (keep existing logic) ...
            if (!isReadOnly) {
                const currentResp = item.responsavel_impressao || '';
                let options = `<option value="">-- Selecione --</option>`;
                if (Array.isArray(sectorUsers)) {
                    sectorUsers.forEach(u => {
                        const sel = u.nome === currentResp ? 'selected' : '';
                        // ADDED data-userid to capture ID for reports
                        options += `<option value="${u.nome}" data-userid="${u.id}" ${sel}>${u.nome}</option>`;
                    });
                }
                respBlock = `
                    <select class="form-control" id="resp_select_${item.id}" style="padding: 0.25rem; font-size: 0.8rem; width: 100%; border-color: #cbd5e1;" 
                            onchange="assignItem(${item.id}, 'impressao', this.value)">
                        ${options}
                    </select>
                `;
            } else {
                const currentResp = item.responsavel_impressao || '--';
                respBlock = `<span style="color:#64748b; font-size:0.85rem;">${currentResp}</span>`;
            }

            const isRunning = item.status_atual === 'EM_PRODUCAO';

            let actionBtn = '';
            if (!isReadOnly) {
                const basicAction = isRunning
                    ? `<button class="btn" style="background: var(--danger)" onclick="registrarEvento(${item.id}, '${setor}', 'FIM', ${item.quantidade})">Finalizar</button>`
                    : `<button class="btn" style="background: var(--success)" onclick="registrarEvento(${item.id}, '${setor}', 'INICIO', 0)">Iniciar</button>`;

                // Complex Logic for Start/Check for Digital
                if (item.status_atual === 'EM_PRODUCAO') {
                    // TIMER BLOCK
                    let timerHtml = '';
                    if (item.inicio_producao_timestamp && item.decorrido_segundos !== null) {
                        timerHtml = `
                            <div class="production-timer" data-elapsed-initial="${item.decorrido_segundos}" data-client-start="${Date.now()}"
                                 style="font-family: monospace; font-size: 1.1rem; font-weight: bold; color: #1e293b; 
                                        background: #e2e8f0; padding: 0.25rem 0.5rem; border-radius: 4px; 
                                        margin-bottom: 0.5rem; display: inline-block; border: 1px solid #cbd5e1;">
                                <i class="ph-clock"></i> <span class="timer-display">00:00:00</span>
                            </div><br>
                        `;
                    }
                    actionBtn = `${timerHtml}<button class="btn" style="background: var(--warning); color: #78350f" onclick="registrarEvento(${item.id}, '${setor}', 'FIM', ${item.quantidade})">Finalizar Produção</button>`;
                } else {

                    // Logic Simplified: Start is always allowed now (File is optional)
                    actionBtn = `<button class="btn" style="background: var(--success); margin-bottom: 0.25rem;" onclick="openPrintingConfirmation(${item.id}, '${setor}')">Iniciar</button>`;

                    if (setor === 'ESTAMPARIA') {
                        actionBtn += `<br><button class="btn" style="background: #eab308; color: #713f12; padding: 0.25rem 0.5rem;" onclick="skipProduction(${item.id}, '${setor}')" title="Enviar para o próximo setor sem registrar tempo de produção">Pular Produção (Direto Embalagem)</button>`;
                    }
                }

                // Rollback
                actionBtn += `<button class="btn" style="background:transparent; color:#666; border:1px solid #ccc; width:auto; padding:0.25rem 0.5rem; margin-top:0.25rem;" onclick="openRollbackModal(${item.id}, '${item.status_atual}', '${item.setor_destino || ''}')" title="Voltar Etapa"><i class="ph-arrow-u-up-left"></i> Voltar</button>`;

            } else {
                actionBtn = `<span style="font-size:0.8rem; color:#94a3b8;"><i class="ph-lock"></i> Aguardando etapa anterior</span>`;
            }

            const layoutIndicator = typeof renderLayoutIndicator === 'function' ? renderLayoutIndicator(item.layout_path, item.layout_type) : '<!-- Err Layout -->';

            const colorInfo = item.cor_impressao
                ? `<div style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #e0f2fe; border-radius: 4px; color: #0369a1; font-weight: bold; border: 1px solid #bae6fd;">
                     <i class="ph-drop"></i> Cor de Impressão: ${item.cor_impressao}
                   </div>`
                : `<div style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #fee2e2; border-radius: 4px; color: #b91c1c; font-weight: bold; border: 1px solid #fecaca;">
                     <i class="ph-warning"></i> COR NÃO INFORMADA
                   </div>`;

            // Obs Arte
            const obsStyle = item.observacao_arte
                ? `background: #fff7ed; border: 2px solid #fdba74; color: #c2410c; box-shadow: 0 2px 4px rgba(0,0,0,0.05);`
                : `background: #f8fafc; border: 2px solid #e2e8f0; color: #94a3b8;`;

            const obsIcon = item.observacao_arte ? 'ph-warning' : 'ph-info';

            const obsArteContent = `
                 <div style="${obsStyle} padding: 0.75rem; border-radius: 8px; margin-bottom: 0.75rem; font-weight: bold; font-size: 0.85rem; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid ${item.observacao_arte ? '#fed7aa' : '#cbd5e1'}; padding-bottom: 0.4rem; margin-bottom: 0.4rem;">
                        <i class="${obsIcon}" style="font-size: 1.1rem;"></i>
                        <span style="font-size: 0.75rem;">OBSERVAÇÃO DA ARTE FINAL</span>
                    </div>
                    <div style="text-transform: uppercase; line-height: 1.4; word-break: break-word;">
                        ${item.observacao_arte || "SEM OBSERVAÇÕES DA ARTE FINAL"}
                    </div>
                </div>`;

            // Digital File
            let digitalFileBlock = '';
            if (setor === 'IMPRESSAO_DIGITAL') {
                if (item.arquivo_impressao_digital_url) {
                    digitalFileBlock = `
                        <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; width: 100%;">
                            <div style="font-size: 0.75rem; color: #166534; font-weight: bold; margin-bottom: 0.25rem;">ARQUIVO DE IMPRESSÃO (DIGITAL)</div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size: 0.8rem; color: #15803d; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 150px;">
                                    ${item.arquivo_impressao_digital_nome}
                                </span>
                                <a href="${item.arquivo_impressao_digital_url}" download target="_blank" class="btn" style="width:auto; padding:0.25rem 0.5rem; font-size:0.75rem; background: #22c55e;">
                                    <i class="ph-download"></i> Baixar
                                </a>
                            </div>
                        </div>`;
                } else {
                    digitalFileBlock = `
                        <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; width: 100%;">
                            <div style="color: #b91c1c; font-size: 0.75rem; font-weight: bold;">
                                <i class="ph-warning"></i> ARQUIVO DE IMPRESSÃO PENDENTE
                            </div>
                            <div style="font-size: 0.7rem; color: #7f1d1d;">Arte Final não anexou o arquivo.</div>
                        </div>`;
                }
            } else if (setor === 'IMPRESSAO_LASER') {
                if (item.arquivo_impressao_laser_url) {
                    digitalFileBlock = `
                        <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: #fffbe6; border: 1px solid #fde68a; border-radius: 6px; width: 100%;">
                            <div style="font-size: 0.75rem; color: #b45309; font-weight: bold; margin-bottom: 0.25rem;">ARQUIVO DE CORTE (LASER)</div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size: 0.8rem; color: #92400e; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 150px;">
                                    ${item.arquivo_impressao_laser_nome}
                                </span>
                                <a href="${item.arquivo_impressao_laser_url}" download target="_blank" class="btn" style="width:auto; padding:0.25rem 0.5rem; font-size:0.75rem; background: #d97706;">
                                    <i class="ph-download"></i> Baixar
                                </a>
                            </div>
                        </div>`;
                } else {
                    // Fallback: If no Laser file but Layout exists, offer Layout download
                    let fallbackBtn = '';
                    if (item.layout_path) {
                        fallbackBtn = `
                            <div style="margin-top:0.4rem; border-top:1px solid #fca5a5; padding-top:0.4rem;">
                                <div style="font-size:0.7rem; color:#7f1d1d; margin-bottom:0.2rem;">Arquivo específico não encontrado.</div>
                                <a href="${item.layout_path}" download target="_blank" class="btn" style="width:100%; padding:0.25rem; font-size:0.75rem; background:#fff; border:1px solid #b91c1c; color:#b91c1c; font-weight:bold;">
                                    <i class="ph-download"></i> Baixar Layout (Aprovação)
                                </a>
                            </div>
                        `;
                    }

                    digitalFileBlock = `
                        <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; width: 100%;">
                            <div style="color: #b91c1c; font-size: 0.75rem; font-weight: bold;">
                                <i class="ph-warning"></i> ARQUIVO LASER PENDENTE
                            </div>
                            ${fallbackBtn ? fallbackBtn : '<div style="font-size: 0.7rem; color: #7f1d1d;">Arte Final não anexou o arquivo.</div>'}
                        </div>`;
                }
            }

            const statusBar = typeof renderFlowStatusBar === 'function' ? renderFlowStatusBar(item) : '<!-- Status Bar Err -->';

            return `
                <tr style="${isReadOnly ? 'opacity: 0.8;' : ''}">
                     <td>
                         ${statusBar}
                         ${item.numero_pedido}
                     </td>
                     <td>
                        <strong>${item.produto}</strong>
                        ${item.referencia ? `<div style="font-size:0.85rem; color:#475569; margin-top:0.2rem;">Referência: <strong>${item.referencia}</strong></div>` : ''}
                        <div style="margin-top:0.25rem">${typeof renderShippingBadge === 'function' ? renderShippingBadge(item.tipo_envio) : ''}</div>
                     </td>
                     <td>${typeof renderDeadline === 'function' ? renderDeadline(item.prazo_entrega) : item.prazo_entrega}</td>
                     <td>${item.quantidade}</td>
                     <td>${respBlock}</td>
                     <td>
                        <div style="display:flex; gap: 0.75rem; align-items: flex-start;">
                             <!-- Coluna Esquerda: Thumbnail -->
                             <div style="flex-shrink:0;">
                                 ${layoutIndicator}
                             </div>
                             
                             <!-- Coluna Direita: Infos -->
                             <div style="display:flex; flex-direction:column; gap:0.25rem; align-items: flex-start;">
                                <!-- Linha 1: Badges -->
                                ${!isReadOnly ? `<div>${actionBtn}</div>` : `<div style="margin-top:0.2rem"><span class="badge" style="background:#e2e8f0; color:#64748b;">${item.status_atual}</span></div>`}
                                
                                <!-- Linha 2: Cor / Arquivo Digital -->
                                ${colorInfo}
                                ${digitalFileBlock}
                                
                                <!-- Linha 3: Alerts/Obs -->
                                ${obsArteContent}
                             </div>
                        </div>
                     </td>
                </tr>
            `;
        } catch (err) {
            console.error("Render Error for Item:", item, err);
            return `<tr><td colspan="6" style="background:#fee2e2; color:#b91c1c;">Erro ao renderizar item #${item.id || '?'}: ${err.message}</td></tr>`;
        }
    }).join('');
}

// 5. Relatórios
function loadReports() {
    document.getElementById('pageTitle').textContent = 'Relatórios de Produtividade';

    const today = new Date().toISOString().split('T')[0];

    const html = `
        <div class="card">
            <div class="flex-row" style="gap: 1rem; align-items: flex-end; margin-bottom: 1rem;">
                <div class="form-group">
                    <label>Data Início</label>
                    <input type="date" id="reportStart" class="form-control" value="${today}">
                </div>
                <div class="form-group">
                    <label>Data Fim</label>
                    <input type="date" id="reportEnd" class="form-control" value="${today}">
                </div>
                <button class="btn" onclick="fetchReports()" style="height: 42px; margin-bottom: 0;">Gerar Relatório</button>
            </div>
            <div id="reportResults">
                <p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Selecione o período e clique em Gerar.</p>
            </div>
        </div>
    `;
    document.getElementById('contentArea').innerHTML = html;
}

async function fetchReports() {
    const start = document.getElementById('reportStart').value;
    const end = document.getElementById('reportEnd').value;

    document.getElementById('reportResults').innerHTML = '<p>Carregando...</p>';

    try {
        const res = await fetch(`/api/reports/productivity?start=${start}&end=${end}`);
        const data = await res.json();

        if (data.length === 0) {
            document.getElementById('reportResults').innerHTML = '<p>Nenhum dado encontrado para o período.</p>';
            return;
        }

        let table = `
            <table>
                <thead>
                    <tr>
                        <th>Operador</th>
                        <th>Setor</th>
                        <th>Total Produzido</th>
                        <th>Eventos (Lotes)</th>
                        <th>Tempo Total</th>
                        <th>Peças/Hora</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach(row => {
            table += `
                <tr>
                    <td>${row.operador}</td>
                    <td>${row.setor}</td>
                    <td><span class="badge badge-blue">${row.total_produzido}</span></td>
                    <td>${row.total_eventos}</td>
                    <td>${row.tempo_formatado}</td>
                    <td><strong>${row.media_pecas_hora}</strong></td>
                </tr>
            `;
        });

        table += '</tbody></table>';
        document.getElementById('reportResults').innerHTML = table;

    } catch (e) {
        document.getElementById('reportResults').innerHTML = '<p style="color:red">Erro ao gerar relatório.</p>';
        console.error(e);
    }
}

// --- AÇÕES ---

function injectNewOrderModal() {
    if (document.getElementById('newOrderModal')) return; // Já injetado

    const modalHtml = `
    <div id="newOrderModal" class="modal">
        <div class="modal-content">
            <h2 style="margin-bottom: 1rem;">Novo Pedido</h2>
            
            <!-- ÁREA DE IMPORTAÇÃO DE PDF -->
            <div id="pdfImportZone" style="border: 2px dashed var(--accent); border-radius: 8px; padding: 1.5rem; text-align: center; margin-bottom: 1.5rem; background: var(--bg-surface); cursor: pointer; transition: all 0.2s;">
                <i class="ph-file-pdf" style="font-size: 2rem; color: var(--accent); margin-bottom: 0.5rem; display: block;"></i>
                <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">Importação Automática (Opcional)</h4>
                <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">Arraste ou clique para enviar um PDF do Pedido (Ex: Bling/Nuvemshop)</p>
                <input type="file" id="pdfFileInput" accept="application/pdf" style="display: none;">
                <div id="pdfLoadingIndicator" style="display: none; margin-top: 1rem; color: var(--info); font-size: 0.9rem;">
                    <i class="ph-spinner" style="animation: spin 1s linear infinite;"></i> Extraindo dados do PDF...
                </div>
            </div>

            <form id="newOrderForm">
                <div class="flex-row">
                    <div class="form-group" style="flex: 2">
                        <label>Cliente</label>
                        <input type="text" name="cliente" id="no_cliente" class="form-control" required>
                    </div>
                </div>
                <div class="flex-row">
                    <div class="form-group" style="flex: 1">
                        <label>Nº Pedido</label>
                        <input type="text" name="numero_pedido" class="form-control" required>
                    </div>
                    <div class="form-group" style="flex: 1">
                        <label>Prazo de Entrega</label>
                        <input type="date" name="prazo_entrega" class="form-control" required>
                    </div>
                </div>
                <div class="flex-row">
                    <div class="form-group" style="flex: 1">
                        <label>Envio</label>
                        <select name="tipo_envio" class="form-control">
                            <option value="TRANSPORTADORA">Transportadora</option>
                            <option value="CORREIOS">Correios</option>
                            <option value="RETIRADA">Retirada</option>
                        </select>
                    </div>
                    <div class="form-group" style="flex: 1">
                         <label>Transportadora</label>
                        <input type="text" name="transportadora" class="form-control" placeholder="Opcional">
                    </div>
                </div>

                 <div class="form-group">
                    <label>Observação</label>
                    <textarea name="observacao" class="form-control" rows="3" placeholder="Detalhes adicionais, instruções..."></textarea>
                </div>

                <h3 style="margin-bottom: 0.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">Itens do Pedido</h3>
                <div id="itemsContainer"></div>
                
                <button type="button" id="addItemBtn" class="btn" style="background: var(--bg-primary); border: 1px solid var(--accent); color: var(--accent); margin-bottom: 1rem;">
                    <i class="ph-plus"></i> Adicionar Item
                </button>

                <div class="flex-row" style="justify-content: flex-end;">
                    <button type="button" class="btn" style="background: var(--text-secondary); width: auto;" onclick="document.getElementById('newOrderModal').classList.remove('show')">Cancelar</button>
                    <button type="submit" class="btn" style="width: auto; margin-left: 0.5rem;">Salvar Pedido</button>
                </div>
            </form>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Setup Event Listeners
    const container = document.getElementById('itemsContainer');

    document.getElementById('addItemBtn').onclick = () => {
        const div = document.createElement('div');
        div.className = 'flex-row';
        div.style.marginBottom = '0.5rem';
        div.innerHTML = `
            <input type="text" placeholder="Nome do Produto" class="form-control" style="flex: 3" required>
            <input type="text" placeholder="Ref (Opcional)" class="form-control" style="flex: 1.5; text-transform: uppercase;">
            <input type="number" placeholder="Qtd" class="form-control" style="flex: 1" required>
            <button type="button" class="btn" style="background: var(--danger); width: auto; padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem;" onclick="this.parentElement.remove()">
                <i class="ph-x"></i> Apagar
            </button>
        `;
        container.appendChild(div);
    };

    document.getElementById('newOrderForm').onsubmit = handleNewOrderSubmit;

    // --- PDF IMPORT LOGIC ---
    const pdfZone = document.getElementById('pdfImportZone');
    const pdfInput = document.getElementById('pdfFileInput');
    const pdfIndicator = document.getElementById('pdfLoadingIndicator');
    const form = document.getElementById('newOrderForm');

    if (pdfZone && pdfInput) {
        pdfZone.addEventListener('click', () => pdfInput.click());

        pdfZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            pdfZone.style.borderColor = 'var(--info)';
            pdfZone.style.background = 'var(--info-bg)';
        });

        pdfZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            pdfZone.style.borderColor = 'var(--accent)';
            pdfZone.style.background = 'var(--bg-surface)';
        });

        pdfZone.addEventListener('drop', (e) => {
            e.preventDefault();
            pdfZone.style.borderColor = 'var(--accent)';
            pdfZone.style.background = 'var(--bg-surface)';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handlePdfUpload(e.dataTransfer.files[0]);
            }
        });

        pdfInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handlePdfUpload(e.target.files[0]);
            }
        });
    }

    async function handlePdfUpload(file) {
        if (file.type !== 'application/pdf') {
            alert('Por favor, envie um arquivo PDF.');
            return;
        }

        const formData = new FormData();
        formData.append('pdf_file', file);

        pdfIndicator.style.display = 'block';

        try {
            const res = await fetch('/api/orders/parse-pdf', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao processar PDF');
            }

            const data = await res.json();

            // Populate Basic Fields
            if (data.cliente && form.elements['cliente']) form.elements['cliente'].value = data.cliente;
            if (data.numero_pedido && form.elements['numero_pedido']) form.elements['numero_pedido'].value = data.numero_pedido;
            if (data.prazo_entrega && form.elements['prazo_entrega']) form.elements['prazo_entrega'].value = data.prazo_entrega;

            if (data.tipo_envio && form.elements['tipo_envio']) {
                // Seleciona a option correta (TRANSPORTADORA, CORREIOS, RETIRADA)
                form.elements['tipo_envio'].value = data.tipo_envio;
            }
            if (data.transportadora && form.elements['transportadora']) {
                form.elements['transportadora'].value = data.transportadora;
            }
            if (data.observacao && form.elements['observacao']) {
                form.elements['observacao'].value = data.observacao;
            }

            // Populate Items Container
            container.innerHTML = ''; // Limpa itens existentes

            if (data.itens && data.itens.length > 0) {
                data.itens.forEach(it => {
                    const div = document.createElement('div');
                    div.className = 'flex-row';
                    div.style.marginBottom = '0.5rem';
                    div.innerHTML = `
                        <input type="text" placeholder="Nome do Produto" class="form-control" style="flex: 3" value="${it.produto || ''}" required>
                        <input type="text" placeholder="Ref (Opcional)" class="form-control" style="flex: 1.5; text-transform: uppercase;" value="${it.referencia || ''}">
                        <input type="number" placeholder="Qtd" class="form-control" style="flex: 1" value="${it.quantidade || 1}" required>
                        <button type="button" class="btn" style="background: var(--danger); width: auto; padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem;" onclick="this.parentElement.remove()">
                            <i class="ph-x"></i> Apagar
                        </button>
                    `;
                    container.appendChild(div);
                });
            } else {
                // Add empty item if none found
                document.getElementById('addItemBtn').click();
            }

            alert('PDF Processado! Verifique os dados no formulário antes de salvar.');

        } catch (e) {
            console.error(e);
            alert(e.message);
        } finally {
            pdfIndicator.style.display = 'none';
            pdfInput.value = ''; // Reset file input
        }
    }
}

async function handleNewOrderSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const itens = [];
    const rows = document.getElementById('itemsContainer').children;

    for (let row of rows) {
        itens.push({
            produto: row.children[0].value,
            referencia: row.children[1].value,
            quantidade: row.children[2].value
        });
    }

    if (itens.length === 0) {
        alert('Adicione pelo menos um item ao pedido.');
        return;
    }

    const payload = {
        cliente: formData.get('cliente'),
        numero_pedido: formData.get('numero_pedido'),
        prazo_entrega: formData.get('prazo_entrega'),
        tipo_envio: formData.get('tipo_envio'),
        transportadora: formData.get('transportadora'),
        observacao: formData.get('observacao'),
        itens: itens
    };

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const resData = await res.json();

        if (res.ok) {
            alert('Pedido criado com sucesso!');
            document.getElementById('newOrderModal').classList.remove('show');
            e.target.reset();
            document.getElementById('itemsContainer').innerHTML = '';
            viewOrderDetails(resData.id);
        } else {
            alert('Erro: ' + resData.error);
        }
    } catch (err) {
        alert('Erro ao salvar pedido.');
    }
}

function openNewOrderModal() {
    // Garantir que existe
    injectNewOrderModal();
    document.getElementById('newOrderModal').classList.add('show');
}

async function viewOrderDetails(id) {
    const res = await fetch(`/ api / orders / ${id} `);
    const order = await res.json();

    const canEdit = currentUser.perfil === 'admin' || currentUser.perfil === 'financeiro';
    const isAdmin = currentUser.perfil === 'admin';

    const isFinalized = order.status_oficial === 'FINALIZADO';

    if (isFinalized) {
        renderFinishedOrderDossier(order);
        return;
    }

    let html = `
                        < div class="card" >
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h3>Pedido ${order.numero_pedido} - ${order.cliente}</h3>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem">
                    ${renderOrderStatusBadge(order.status_oficial, order.setor_detalhe)}
                    <div style="display:flex; gap:0.5rem">
                        ${canEdit && !isFinalized ? `<button class="btn" style="width:auto; padding:0.25rem 0.5rem; font-size:0.8rem; background: var(--warning); color: #78350f" onclick="openEditOrderModal(${order.id})"><i class="ph-pencil"></i> Editar</button>` : ''}
                        ${isAdmin ? `<button class="btn" style="width:auto; padding:0.25rem 0.5rem; font-size:0.8rem; background: var(--text-secondary);" onclick="viewOrderHistory(${order.id})"><i class="ph-clock-counter-clockwise"></i> Histórico</button>` : ''}
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom:1rem; margin-top:0.5rem;">${renderShippingBadge(order.tipo_envio)}</div>
            <p><strong>Envio Detalhes:</strong> ${order.transportadora ? order.transportadora : 'Padrão'}</p>
            <p><strong>Observação:</strong> ${order.observacao || '<em>Nenhuma</em>'}</p>
            <hr style="border:0; border-top:1px solid var(--border); margin: 1rem 0;">
            <h4>Itens e Progresso</h4>
            <table>
                <thead><tr><th>Produto</th><th>Ref</th><th>Qtd</th><th>Setor Destino</th><th>Status Item</th><th>Ações</th></tr></thead>
                <tbody>
    `;

    order.itens.forEach(item => {
        let action = '';

        // Ações contextuais baseadas no perfil e estado do item
        // Se finalizado, não mostra ações de transição
        if (!isFinalized) {
            if (currentUser.perfil === 'separacao' && item.status_atual === 'AGUARDANDO_SEPARACAO') {
                action = `<button class="btn" onclick="mudarStatusItem(${item.id}, 'AGUARDANDO_DESEMBALE')">Separado OK</button>`;
            }
            else if (currentUser.perfil === 'desembale' && item.status_atual === 'AGUARDANDO_DESEMBALE') {
                action = `<button class="btn" onclick="mudarStatusItem(${item.id}, 'AGUARDANDO_PRODUCAO')">Liberar p/ Produção</button>`;
            }
            else if (currentUser.perfil === 'embale' && item.status_atual === 'AGUARDANDO_EMBALE') {
                action = `<button class="btn" onclick="mudarStatusItem(${item.id}, 'AGUARDANDO_ENVIO')">Embalado OK</button>`;
            }
        }

        html += `
            <tr>
                <td>${item.produto}</td>
                <td>${item.referencia || '-'}</td>
                <td>${item.quantidade}</td>
                <td>${item.setor_destino || '-'}</td>
                <td>${item.status_atual}</td>
                <td>
                     <div style="display:flex; gap: 1rem; align-items: center;">
                          ${renderLayoutIndicator(item.layout_path, item.layout_type)}
                          ${item.cor_impressao ? `<span title="Cor de Impressão: ${item.cor_impressao}"><i class="ph-drop"></i> Cor de Impressão: ${item.cor_impressao}</span>` : ''}
                          ${item.observacao_arte ? `<span title="Obs Arte: ${item.observacao_arte}" style="margin-left:0.5rem; cursor:help; color:var(--accent);"><i class="ph-info"></i> Obs Art</span>` : ''}
                          ${action}
                     </div>
                </td>
            </tr>
        `;
    });

    let deleteBtn = '';
    if (currentUser.perfil === 'admin' && !isFinalized) {
        // Botão de deletar (perigoso) - Bloqueado se finalizado
        deleteBtn = `<button class="btn" style="width: auto; background: var(--danger); margin-left: 1rem;" onclick="deleteOrder(${order.id})"> <i class="ph-trash"></i> Excluir Pedido</button>`;
    }

    html += '</tbody></table>' + `<div style="margin-top:1rem; display:flex;">
        <button class="btn" style="width: auto; background: var(--text-secondary)" onclick="loadDashboard()">Voltar</button>
        ${deleteBtn}
    </div></div>`;

    document.getElementById('contentArea').innerHTML = html;
}



async function updateArteStatus(itemId, status) {
    if (!confirm(`Confirmar alteração para status: ${status}?`)) return;

    // Capture current responsible to preserve state and persist
    const responsavel = document.getElementById(`resp_select_${itemId}`) ? document.getElementById(`resp_select_${itemId}`).value : null;

    try {
        const res = await fetch(`/api/production/item/${itemId}/arte`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                arte_status: status,
                responsavel: responsavel // Persist to DB
            })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Erro ao atualizar status');
        }

        // RELOAD IN PLACE preserving resp
        openArteAction(itemId, null, responsavel);
    } catch (e) {
        console.error(e);
        alert('Erro ao atualizar status: ' + e.message);
    }
}

async function openArteAction(itemId, preservedSector = null, preservedResp = null) {
    const setores = ['SILK_CILINDRICA', 'SILK_PLANO', 'TAMPOGRAFIA', 'IMPRESSAO_LASER', 'IMPRESSAO_DIGITAL', 'ESTAMPARIA'];
    const setorOpcoes = setores.map(s => `<option value="${s}">${s}</option>`).join('');

    // FETCH FRESH ITEM DATA (Fixes Persistence Issue)
    let item = {};
    let activeResponsible = '';
    try {
        // Cache buster added
        const res = await fetch(`/api/production/item/${itemId}?t=${new Date().getTime()}`);
        if (!res.ok) throw new Error("Erro ao buscar item");
        item = await res.json();
        // Use preserved if passed (UI state), otherwise DB
        activeResponsible = preservedResp || item.responsavel_arte || '';
    } catch (e) {
        console.error(e);
        return alert('Erro ao carregar dados do item.');
    }

    // Fetch users for 'arte' sector to populate dropdown
    let arteUsers = [];
    try {
        const resUsers = await fetch(`/api/collaborators/sector/ARTE_FINAL`); // Use standard code
        arteUsers = await resUsers.json();
    } catch (e) { console.error("Error fetching arte users", e); }

    const status = item.arte_status || 'ARTE_NAO_FEITA';

    // Step States
    const step1Done = status === 'AGUARDANDO_APROVACAO' || status === 'APROVADO';
    const step2Done = !!item.layout_path; // Simple check

    // ... (Visual helpers same as before)
    const s1Class = step1Done ? 'step-done' : 'step-active';
    const s2Class = step2Done ? 'step-done' : (step1Done ? 'step-active' : 'step-locked');
    const s3Class = status === 'APROVADO' ? 'step-done' : (step2Done && step1Done ? 'step-active' : 'step-locked');

    // Build Responsible Dropdown
    let respOptions = `<option value="">-- Selecione --</option>`;
    arteUsers.forEach(u => {
        const sel = u.nome === activeResponsible ? 'selected' : '';
        respOptions += `<option value="${u.nome}" ${sel}>${u.nome}</option>`;
    });

    // DETERMINE SECTOR: Preserved (UI state) > DB > Empty
    const activeSector = preservedSector || item.setor_destino || '';

    const html = `
        <style>
            .step-card { border: 1px solid #eee; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; position: relative; opacity: 1; transition: all 0.3s; }
            .step-locked { opacity: 0.5; pointer-events: none; background: #f9f9f9; }
            .step-done { border-color: var(--success); background: #f0fdf4; }
            .step-active { border-color: var(--primary); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
            .step-badge { position: absolute; top: -10px; left: 20px; background: #fff; padding: 0 10px; font-weight: bold; font-size: 0.9rem; color: #555; }
            .step-active .step-badge { color: var(--primary); }
            .step-done .step-badge { color: var(--success); }
        </style>

        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div>
                   <h3 style="margin:0; font-size: 1.25rem;">Gestão de Arte (Item #${itemId})</h3>
                   <div style="font-size: 0.85rem; color: #64748b; margin-top: 0.25rem;">Defina o responsável e o fluxo do item</div>
                </div>
                <div style="width: 250px;">
                    <label style="font-size:0.75rem; font-weight:bold; text-transform:uppercase; color:#475569; display:block; margin-bottom:0.25rem;">Responsável Arte Final</label>
                    <div style="display:flex; gap:0.5rem;">
                        <select class="form-control" id="resp_select_${itemId}" style="margin-bottom:0;" onchange="assignItem(${itemId}, 'arte', this.value)">
                            ${respOptions}
                        </select>
                    </div>
                </div>
            </div>

            <p style="color:red; font-size:0.9rem; margin-bottom: 1.5rem;">Status Atual: <strong>${status}</strong></p>
            
            <!-- PASSO 1 -->
            <div class="step-card ${s1Class}">
                <span class="step-badge">PASSO 1: Solicitar Aprovação</span>
                <p style="font-size:0.9rem; color: #666; margin-bottom: 1rem;">Envie a arte para aprovação do cliente ou interno.</p>
                ${step1Done
            ? `<div style="color:var(--success); font-weight:bold;"><i class="ph-check"></i> Enviado para Aprovação</div>`
            : `<button class="btn" style="background: var(--warning); color: #92400e;" onclick="updateArteStatus(${itemId}, 'AGUARDANDO_APROVACAO')"> <i class="ph-paper-plane-right"></i> Enviar para Aprovação</button>`
        }
            </div>

            <!-- PASSO 2 -->
            <div class="step-card ${s2Class}">
                 <span class="step-badge">PASSO 2: Upload do Layout Aprovado</span>
                 <p style="font-size:0.9rem; color: #666; margin-bottom: 1rem;">Faça o upload do arquivo final que foi aprovado (Obrigatório para prosseguir).</p>
                 
                 <div style="display:flex; gap: 1rem; align-items: center;">
                    ${item.layout_path
            ? `<div style="color:var(--success);"><i class="ph-file-pdf"></i> Arquivo Presente <br> <small>Enviado por: ${item.layout_uploaded_by || '?'}</small></div>`
            : ``
        }
                    <div class="upload-zone" style="margin:0; flex-grow:1;">
                        <input type="file" id="layoutFile" accept="image/*,application/pdf" style="display: block; margin-bottom: 0.5rem; width: 100%;">
                        <button class="btn" style="width: auto; font-size: 0.9rem;" onclick="uploadLayout(${itemId})"> <i class="ph-upload-simple"></i> ${item.layout_path ? 'Reenviar Arquivo' : 'Enviar Arquivo'}</button>
                    </div>
                </div>
            </div>

            <!-- PASSO 3 -->
            <div class="step-card ${s3Class}">
                <span class="step-badge">PASSO 3: Aprovação Final & Produção</span>
                <p style="font-size:0.9rem; color: #666; margin-bottom: 1rem;">Defina as especificações finais e envie para o próximo setor.</p>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Cor de Impressão <span style="color:var(--danger)">*</span></label>
                        <input type="text" id="corImpressao" class="form-control" placeholder="Ex: Pantone 186 C" value="${item.cor_impressao || ''}">
                    </div>
                    <div class="form-group">
                        <label>Setor Destino</label>
                        <select id="setorDestino" class="form-control">
                            <option value="">Selecione...</option>
                            <option value="SILK_PLANO">Silk Plano</option>
                            <option value="SILK_CILINDRICA">Silk Cilíndrica</option>
                            <option value="TAMPOGRAFIA">Tampografia</option>
                            <option value="IMPRESSAO_LASER">Impressão Laser</option>
                            <option value="IMPRESSAO_DIGITAL">Impressão Digital</option>
                            <option value="ESTAMPARIA">Estamparia</option>
                        </select>
                    </div>
                </div>

                <!-- Digital Print File Upload (Conditional) -->
                <div id="digitalFileSection" style="margin-top: 1rem; display: ${activeSector === 'IMPRESSAO_DIGITAL' || activeSector === 'ESTAMPARIA' ? 'block' : 'none'}; border: 1px dashed #cbd5e1; padding: 1rem; border-radius: 8px; background: #f8fafc;">
                    <div style="font-weight: bold; font-size: 0.9rem; color: #475569; margin-bottom: 0.5rem; display:flex; align-items:center; gap:0.5rem;">
                         <i class="ph-printer"></i> ARQUIVO DE IMPRESSÃO (DIGITAL)
                    </div>
                    <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 0.5rem;">
                        Anexe o arquivo final (PDF ou CDR) para a Impressão Digital. *Obrigatório para este setor.*
                    </p>

                    <div style="display:flex; gap: 1rem; align-items: center;">
                        ${item.arquivo_impressao_digital_url
            ? `<div style="color:var(--success); font-size:0.85rem;">
                                 <i class="ph-check-circle"></i> <strong>${item.arquivo_impressao_digital_nome}</strong> <br>
                                 <small>Enviado por: ${item.arquivo_impressao_digital_enviado_por || '?'} em ${new Date(item.arquivo_impressao_digital_enviado_em).toLocaleDateString()}</small>
                               </div>`
            : `<div style="color:var(--danger); font-size:0.85rem;"><i class="ph-warning-circle"></i> Nenhum arquivo anexado</div>`
        }
                        
                        <div class="upload-zone" style="margin:0; flex-grow:1; display:flex; gap:0.5rem; align-items:center;">
                            <input type="file" id="digitalFile" accept=".pdf,.cdr,.zip" style="display: block; width: 100%; font-size:0.8rem;">
                            <button class="btn" style="width: auto; font-size: 0.8rem; padding: 0.4rem 0.8rem;" onclick="uploadDigitalFile(${itemId})">
                                <i class="ph-upload-simple"></i> Enviar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Laser Print File Upload (Conditional) -->
                <div id="laserFileSection" style="margin-top: 1rem; display: ${activeSector === 'IMPRESSAO_LASER' ? 'block' : 'none'}; border: 1px dashed #cbd5e1; padding: 1rem; border-radius: 8px; background: #fffbe6;">
                    <div style="font-weight: bold; font-size: 0.9rem; color: #b45309; margin-bottom: 0.5rem; display:flex; align-items:center; gap:0.5rem;">
                         <i class="ph-lightning"></i> ARQUIVO DE CORTE/GRAVAÇÃO (LASER)
                    </div>
                    <p style="font-size: 0.8rem; color: #92400e; margin-bottom: 0.5rem;">
                        Anexe o arquivo (CDR/DXF/PDF) para o Laser.
                    </p>

                    <div style="display:flex; gap: 1rem; align-items: center;">
                        ${item.arquivo_impressao_laser_url
            ? `<div style="color:var(--success); font-size:0.85rem;">
                                 <i class="ph-check-circle"></i> <strong>${item.arquivo_impressao_laser_nome}</strong> <br>
                                 <small>Enviado por: ${item.arquivo_impressao_laser_enviado_por || '?'} em ${new Date(item.arquivo_impressao_laser_enviado_em).toLocaleDateString()}</small>
                               </div>`
            : `<div style="color:var(--danger); font-size:0.85rem;"><i class="ph-warning-circle"></i> Nenhum arquivo anexado</div>`
        }
                        
                        <div class="upload-zone" style="margin:0; flex-grow:1; display:flex; gap:0.5rem; align-items:center; background:#fff;">
                            <input type="file" id="laserFile" accept=".cdr,.dxf,.pdf,.zip,.ai" style="display: block; width: 100%; font-size:0.8rem;">
                            <button class="btn" style="width: auto; font-size: 0.8rem; padding: 0.4rem 0.8rem; background: #d97706;" onclick="uploadLaserFile(${itemId})">
                                <i class="ph-upload-simple"></i> Enviar Laser
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="form-group" style="grid-column: span 2; margin-top: 1rem;">
                    <label>Observação (Opcional)</label>
                    <textarea id="obsArte" class="form-control" rows="2" placeholder="Detalhes técnicos, cuidados na impressão, etc.">${item.observacao_arte || ''}</textarea>
                </div>

                <div style="margin-top: 1.5rem; text-align: right;">
                    <button class="btn" style="width: auto; background: var(--success);" onclick="aprovarArte(${itemId})">
                         <i class="ph-check-circle"></i> Finalizar (Aprovar)
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('contentArea').innerHTML = html;

    // Add logic to toggle visibility
    const setorSelect = document.getElementById('setorDestino');
    setorSelect.value = activeSector; // Use determined sector

    setorSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const section = document.getElementById('digitalFileSection');
        const laserSection = document.getElementById('laserFileSection');

        if (val === 'IMPRESSAO_DIGITAL' || val === 'ESTAMPARIA') {
            section.style.display = 'block';
            if (laserSection) laserSection.style.display = 'none';
        } else if (val === 'IMPRESSAO_LASER') {
            if (laserSection) laserSection.style.display = 'block';
            section.style.display = 'none';
        } else {
            section.style.display = 'none';
            if (laserSection) laserSection.style.display = 'none';
        }
    });

    // Manually trigger change if needed? 
    // No, logic is handled by template literals using activeSector too.
}

// (Function aprovarArte moved to end of file with enhanced validation)



async function uploadLayout(itemId) {
    const fileInput = document.getElementById('layoutFile');
    const btn = event.target; // Captura o botão clicado

    // CAPTURE CURRENT SECTOR SELECTION
    const currentSector = document.getElementById('setorDestino') ? document.getElementById('setorDestino').value : null;

    if (fileInput.files.length === 0) {
        return alert('Selecione um arquivo!');
    }

    const file = fileInput.files[0];

    // 1. Validação Client-Side
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        return alert('Arquivo muito grande! Limite é 10MB.');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        return alert('Formato inválido! Use JPG, PNG ou PDF.');
    }

    // 2. Preparar Upload
    const formData = new FormData();
    formData.append('layout', file);
    formData.append('operador_id', currentUser.id); // Fundamental para permissão

    // UI State: Loading
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph-spinner ph-spin"></i> Enviando...';
    btn.disabled = true;

    try {
        const res = await fetch(`/api/production/item/${itemId}/layout`, {
            method: 'POST',
            body: formData
        });

        // Check if response is JSON
        const contentType = res.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            // Probably HTML error (404, 500)
            const text = await res.text();
            throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }

        if (res.ok) {
            alert('Layout enviado com sucesso!');
            // Capture current responsible to preserve it
            const currentResp = document.getElementById(`resp_select_${itemId}`) ? document.getElementById(`resp_select_${itemId}`).value : null;
            openArteAction(itemId, currentSector, currentResp); // Refresh in place with preserved sector and resp
        } else {
            // Mostrar erro detalhado do backend
            alert('Erro: ' + (data.error || 'Falha desconhecida no upload.'));
        }
    } catch (e) {
        alert('Falha no envio: ' + e.message);
        console.error(e);
    } finally {
        // Reset UI State
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function uploadDigitalFile(itemId) {
    const fileInput = document.getElementById('digitalFile');
    const btn = event.target; // Captura botão

    // CAPTURE CURRENT SECTOR SELECTION
    const currentSector = document.getElementById('setorDestino') ? document.getElementById('setorDestino').value : null;

    if (fileInput.files.length === 0) return alert('Selecione um arquivo!');
    const file = fileInput.files[0];

    // Validação Basica
    const formData = new FormData();
    formData.append('digital_file', file); // Field name must match backend
    formData.append('operador_id', currentUser.id);

    // UI
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph-spinner ph-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(`/api/production/item/${itemId}/digital`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            alert('Arquivo de Impressão anexado com sucesso!');
            const currentResp = document.getElementById(`resp_select_${itemId}`) ? document.getElementById(`resp_select_${itemId}`).value : null;
            openArteAction(itemId, currentSector, currentResp);
        } else {
            alert('Erro: ' + (data.error || 'Falha no envio'));
        }
    } catch (e) {
        console.error(e);
        alert('Erro de conexão: ' + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function uploadLaserFile(itemId) {
    const fileInput = document.getElementById('laserFile');
    const btn = event.target;

    // CAPTURE CURRENT SECTOR SELECTION
    const currentSector = document.getElementById('setorDestino') ? document.getElementById('setorDestino').value : null;

    if (fileInput.files.length === 0) return alert('Selecione um arquivo!');
    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append('laser_file', file);
    formData.append('operador_id', currentUser.id);

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph-spinner ph-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(`/api/production/item/${itemId}/laser`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            alert('Arquivo Laser anexado com sucesso!');
            const currentResp = document.getElementById(`resp_select_${itemId}`) ? document.getElementById(`resp_select_${itemId}`).value : null;
            openArteAction(itemId, currentSector, currentResp);
        } else {
            alert('Erro: ' + (data.error || 'Falha no envio'));
        }
    } catch (e) {
        console.error(e);
        alert('Erro de conexão: ' + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function injectLightbox() {
    if (document.getElementById('lightbox')) return;
    const html = `
        <div id="lightbox" class="lightbox" onclick="if(event.target === this) this.classList.remove('show')">
            <span class="lightbox-close" onclick="this.parentElement.classList.remove('show')">&times;</span>
            <div id="lightboxContent"></div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function renderLayoutIndicator(path, type) {
    if (!path) return '<span style="color: #cbd5e1; font-size: 0.8rem;">-</span>';

    let thumb = '';
    // Check if type is 'image' or 'image/png' etc (backend saves 'image' or 'pdf' short string in some places, 
    // but code says 'image' or 'pdf'. Let's handle safe check.
    // Migration said 'image' or 'pdf'. File upload route saves: file.mimetype.startsWith('image/') ? 'image' : 'pdf';

    if (type === 'image') {
        thumb = `<img src="${path}" class="layout-thumb" onclick="viewLayout('${path}', '${type}')" title="Ver layout">`;
    } else {
        thumb = `<div class="layout-thumb pdf-thumb" onclick="viewLayout('${path}', '${type}')" title="Ver PDF"><i class="ph-file-pdf"></i></div>`;
    }

    return `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${thumb}
            <button class="layout-btn" onclick="viewLayout('${path}', '${type}')">Ver</button>
        </div>
    `;
}

function viewLayout(path, type) {
    injectLightbox();
    const box = document.getElementById('lightbox');
    const content = document.getElementById('lightboxContent');

    // Path comes from DB, usually relative or absolute URL. 
    // Since we serve /uploads, we might need to fix path if it's stored as local path
    // DB stores '/uploads/filename.ext' based on my backend code, so it is correct for src.

    if (type && type.startsWith('image')) {
        content.innerHTML = `<img src="${path}" class="lightbox-content" onclick="this.classList.toggle('zoomed')" title="Clique para Zoom">`;
    } else if (type && type === 'application/pdf') {
        content.innerHTML = `<iframe src="${path}" style="width: 80vw; height: 80vh; border: none; background: white;"></iframe>`;
    } else {
        content.innerHTML = `<p>Tipo de arquivo não suportado para visualização direta.</p><a href="${path}" target="_blank" class="btn">Abrir em nova aba</a>`;
    }

    box.classList.add('show');
}

// --- VALIDATION HELPER ---
function validateResponsible(itemId) {
    const el = document.getElementById(`resp_select_${itemId}`);
    if (!el) {
        // Se não achar o ID, tenta achar genericamente dentro do container do item se possível,
        // mas o ID é o método seguro. Se não achar, bloqueia por segurança.
        console.warn(`[VALIDATION] Dropdown resp_select_${itemId} not found.`);
        alert('⚠️ ERRO TÉCNICO: Campo de responsável não detectado. Recarregue a página.');
        return false;
    }
    if (!el.value || el.value.trim() === '') {
        alert('INDIQUE O NOME DO RESPONSÁVEL PARA PASSAR AO PRÓXIMO SETOR.');
        el.focus();
        el.style.borderColor = 'red';
        return false;
    }
    el.style.borderColor = '#cbd5e1'; // Reset
    return true;
}

async function aprovarArte(itemId) {
    // 1. Validate Responsible GLOBAL
    if (!validateResponsible(itemId)) return;

    const cor = document.getElementById('corImpressao').value;
    const setor = document.getElementById('setorDestino').value;
    const obs = document.getElementById('obsArte').value;
    // const responsavel = ... (Already validated by helper, but we need value for payload)
    const responsavel = document.getElementById(`resp_select_${itemId}`).value;

    if (!cor) return alert('Cor de impressão é obrigatória!');
    if (!setor) return alert('Setor de destino é obrigatório!');

    const payload = {
        arte_status: 'APROVADO',
        cor_impressao: cor,
        setor_destino: setor,
        observacao_arte: obs,
        responsavel: responsavel
    };

    try {
        // CORRECTION: Use the dedicated Art Approval route which handles Logic & Status Transition
        const res = await fetch(`/api/production/item/${itemId}/arte`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('Item aprovado! Enviado para SEPARAÇÃO.'); // User feedback

            // REDIRECT TO SEPARATION QUEUE
            // Next step in flow is Separation.
            loadGenericQueue('AGUARDANDO_SEPARACAO', 'Separação');

        } else {
            const err = await res.json();
            alert('Erro: ' + (err.error || 'Falha ao aprovar.'));
        }
    } catch (e) {
        console.error(e);
        alert('Erro de conexão.');
    }
}

async function mudarStatusItem(itemId, novoStatus) {
    // Global Validation
    if (!validateResponsible(itemId)) return;

    await fetch(`/api/production/item/${itemId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novo_status_item: novoStatus, operador_id: currentUser.id })
    });
    alert('Status atualizado!');
    loadDashboard();
}

// --- EMBALE (PACKING) ---

function openEmbaleAction(itemId, pedidoId, tipoEnvio) {
    const isRetirada = tipoEnvio === 'RETIRADA';

    // Base HTML structure
    let baseHtml = '';

    if (isRetirada) {
        baseHtml = `
            <div class="alert alert-info" style="background: #e0f2fe; color: #0369a1; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                <i class="ph-info"></i> <strong>Retirada pelo Cliente:</strong> Informe apenas a quantidade de volumes.
            </div>
            <div class="form-group">
                <label>Quantidade de Volumes <span style="color:var(--danger)">*</span></label>
                <input type="number" id="qtdVolumes" class="form-control" min="1" placeholder="Ex: 2" value="1">
            </div>
            <div id="volumesContainer"></div> <!-- Empty for Retirada -->
        `;
    } else {
        baseHtml = `
            <div class="alert alert-warning" style="background: #fffbeb; color: #b45309; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                <i class="ph-truck"></i> <strong>Envio por Transportadora/Correios</strong><br>
                Informe peso e medidas de <strong>todos</strong> os volumes.
            </div>
            
            <div class="form-group" style="margin-bottom: 1rem;">
                <label>Quantidade de Volumes <span style="color:var(--danger)">*</span></label>
                <input type="number" id="qtdVolumes" class="form-control" min="1" value="1" oninput="renderVolumeInputs()">
            </div>
            
            <div id="volumesContainer" style="max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
                <!-- Preenchido dinamicamente -->
            </div>
        `;
    }

    const html = `
        <div id="embaleModal" class="modal show">
            <div class="modal-content" style="min-width: 600px;">
                <h3>Conferência de Embalagem</h3>
                <p>Pedido #${pedidoId} - Envio: <strong>${tipoEnvio}</strong></p>
                <hr style="margin: 1rem 0; border: 0; border-top: 1px solid var(--border)">
                
                ${baseHtml}

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                    <!-- Botão de Bypass (Esquerda) -->
                    <button class="btn" style="background: transparent; border: 1px solid var(--warning); color: #b45309; font-size: 0.8rem;" 
                            onclick="openEmbaleConfirmationWrapper(${itemId}, ${pedidoId}, '${tipoEnvio}', true)">
                        <i class="ph-warning"></i> Enviar p/ Logística sem info. volumes
                    </button>

                    <!-- Botões Padrão (Direita) -->
                    <div style="text-align: right;">
                        <button class="btn" style="background: var(--text-secondary); width: auto; margin-right: 0.5rem;" onclick="document.getElementById('embaleModal').remove()">Cancelar</button>
                        <button class="btn" style="width: auto;" onclick="openEmbaleConfirmationWrapper(${itemId}, ${pedidoId}, '${tipoEnvio}', false)">Confirmar e Liberar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    // Initial Render for Non-Retirada
    if (!isRetirada) {
        renderVolumeInputs();
    }
}

// Wrapper para diferenciar confirmação normal vs bypass
function openEmbaleConfirmationWrapper(itemId, pedidoId, tipoEnvio, isBypass) {
    // Validação Inicial (apenas se NÃO for bypass)
    if (!isBypass) {
        const qtd = document.getElementById('qtdVolumes').value;
        if (!qtd || qtd < 1) return alert("Informe a quantidade de volumes.");

        if (tipoEnvio !== 'RETIRADA') {
            // Validar se todos os inputs de medidas estão preenchidos
            const inputs = document.querySelectorAll('#volumesContainer input');
            for (let inp of inputs) {
                if (!inp.value || inp.value <= 0) {
                    return alert("Preencha peso e dimensões de todos os volumes.");
                }
            }
        }
    }

    if (isBypass) {
        openConfirmationModal(
            "Confirmação de Envio (Sem Volumes)",
            [
                "Estou ciente que estou enviando sem medidas/peso",
                "A Logística será responsável por preencher se necessário",
                "Confirmo que o pedido está embalado"
            ],
            "Confirmar Envio SEM VOLUMES",
            () => submitEmbale(itemId, true, tipoEnvio, pedidoId) // Pass pedidoId
        );
    } else {
        openConfirmationModal(
            "Finalizar Embale",
            [
                "Conferi a quantidade de volumes",
                "Pesei e medi todas as caixas",
                "O pedido está pronto para coleta/envio"
            ],
            "Finalizar e Enviar p/ Logística",
            () => submitEmbale(itemId, false, tipoEnvio, pedidoId) // Pass pedidoId
        );
    }
}

async function submitEmbale(itemId, isBypass, tipoEnvio, pedidoId) { // Accept tipoEnvio
    let payload = {};

    if (isBypass) {
        payload = { flag_embale_sem_volumes: true };
    } else {
        const qtd = document.getElementById('qtdVolumes').value;
        let volumesData = [];

        // Coletar dados dos inputs se existirem
        const container = document.getElementById('volumesContainer');
        if (container) {
            const rows = container.children;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const inputs = row.querySelectorAll('input');
                volumesData.push({
                    volume: i + 1,
                    peso: inputs[0].value,
                    altura: inputs[1].value,
                    largura: inputs[2].value,
                    comprimento: inputs[3].value
                });
            }
        }

        // Calcular totais (opcional, ou pegar do primeiro volume se for simplificado)
        // O backend espera campos flat de peso/altura/largura, vamos somar ou pegar o maior?
        // Geralmente para transportadora soma-se pesos e pega o maior volume ou cubagem total.
        // Simplificação: Pegar dados do Volume 1 para campos principais e salvar JSON completo.

        let pesoTotal = 0;
        let altMax = 0, largMax = 0, compMax = 0;

        if (volumesData.length > 0) {
            volumesData.forEach(v => {
                pesoTotal += parseFloat(v.peso || 0);
                altMax = Math.max(altMax, parseFloat(v.altura || 0));
                largMax = Math.max(largMax, parseFloat(v.largura || 0));
                compMax = Math.max(compMax, parseFloat(v.comprimento || 0));
            });
        }

        payload = {
            quantidade_volumes: qtd,
            peso: pesoTotal,
            altura: altMax,
            largura: largMax,
            comprimento: compMax,
            dados_volumes: JSON.stringify(volumesData),
            flag_embale_sem_volumes: false
        };
    }

    try {
        const res = await fetch(`/api/production/item/${itemId}/embale`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            // Custom Logic for RETIRADA
            if (tipoEnvio === 'RETIRADA') {
                // POPUP BLOCKER FIX: Show a modal with a button so user click triggers the open.
                showPrintSuccessModal(pedidoId);
            } else {
                alert("Embale finalizado com sucesso!");
            }

            // Clean up UI
            const modal = document.getElementById('embaleModal');
            if (modal) modal.remove();
            loadGenericQueue('AGUARDANDO_EMBALE', 'Embale');
        } else {
            const err = await res.json();
            alert("Erro: " + err.error);
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão ao finalizar embale.");
    }
}

function showPrintSuccessModal(pedidoId) {
    const html = `
        <div id="printSuccessModal" class="modal show" style="z-index: 9999;">
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <div style="font-size: 3rem; color: var(--success); margin-bottom: 1rem;">
                    <i class="ph-check-circle"></i>
                </div>
                <h3>Embale Finalizado!</h3>
                <p>O pedido foi marcado como Embalado.</p>
                <div style="margin: 1.5rem 0; padding: 1rem; background: #f8fafc; border-radius: 8px;">
                    <p style="margin-bottom:0.5rem; font-weight:bold;">Para Retirada:</p>
                    <button class="btn" style="width: 100%; background: var(--text-primary); color: #ffffff; font-size: 1.1rem; padding: 0.8rem;" 
                            onclick="window.open('/api/orders/${pedidoId}/print-label', '_blank'); document.getElementById('printSuccessModal').remove();">
                        <i class="ph-printer"></i> IMPRIMIR ETIQUETA
                    </button>
                    <small style="display:block; margin-top:0.5rem; color:#64748b;">(Clique para abrir a impressão)</small>
                </div>
                <button class="btn" style="background: transparent; color: #64748b; border: 1px solid #cbd5e1;" 
                        onclick="document.getElementById('printSuccessModal').remove()">
                    Fechar
                </button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}


function renderVolumeInputs() {
    const qtyInput = document.getElementById('qtdVolumes');
    const container = document.getElementById('volumesContainer');
    if (!qtyInput || !container) return;

    const qty = parseInt(qtyInput.value) || 0;

    // Clear current inputs? 
    // Optimization: Try to preserve values if increasing count, but for simplicity reset or rebuild.
    // Better UX: Save values if we can, but simpler approaches first.

    // Let's just rebuild for now to be robust. 
    // To preserve values, we would need to read current DOM, store in array, render, restore.

    // Capture existing values if any
    const existingValues = [];
    const blocks = container.querySelectorAll('.volume-block');
    blocks.forEach((block, index) => {
        existingValues[index] = {
            peso: block.querySelector('.vol-peso').value,
            altura: block.querySelector('.vol-altura').value,
            largura: block.querySelector('.vol-largura').value,
            comprimento: block.querySelector('.vol-comprimento').value
        };
    });

    let html = '';

    for (let i = 0; i < qty; i++) {
        const vals = existingValues[i] || { peso: '', altura: '', largura: '', comprimento: '' };

        html += `
            <div class="volume-block" style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 0.5rem; margin-bottom: 0.5rem;">
                <h5 style="margin-bottom: 0.5rem; color: var(--primary);">Volume ${i + 1}</h5>
                <div class="flex-row">
                    <div class="form-group" style="flex:1">
                        <label>Peso (kg) *</label>
                        <input type="number" class="form-control vol-peso" step="0.1" value="${vals.peso}">
                    </div>
                </div>
                <div class="flex-row">
                     <div class="form-group" style="flex:1">
                        <label>Altura (cm) *</label>
                        <input type="number" class="form-control vol-altura" value="${vals.altura}">
                    </div>
                    <div class="form-group" style="flex:1">
                        <label>Largura (cm) *</label>
                        <input type="number" class="form-control vol-largura" value="${vals.largura}">
                    </div>
                    <div class="form-group" style="flex:1">
                        <label>Comp. (cm) *</label>
                        <input type="number" class="form-control vol-comprimento" value="${vals.comprimento}">
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

async function confirmarEmbale(itemId, pedidoId, tipoEnvio) {
    // Debug
    console.log("confirmarEmbale called for item", itemId, "Envio:", tipoEnvio);

    const volumesQtd = document.getElementById('qtdVolumes').value;
    const isRetirada = tipoEnvio === 'RETIRADA';

    if (!volumesQtd || parseInt(volumesQtd) <= 0) {
        return alert('Informe a quantidade de volumes.');
    }

    let payload = {
        quantidade_volumes: parseInt(volumesQtd) || 1,
        peso: 0,
        altura: 0,
        largura: 0,
        comprimento: 0,
        dados_volumes: []
    };

    if (!isRetirada) {
        // Collect Volume Data
        const container = document.getElementById('volumesContainer');
        const blocks = container.querySelectorAll('.volume-block');
        const volumesData = [];
        let missingData = false;

        blocks.forEach((block, index) => {
            const pesoVal = block.querySelector('.vol-peso').value;
            const altVal = block.querySelector('.vol-altura').value;
            const largVal = block.querySelector('.vol-largura').value;
            const compVal = block.querySelector('.vol-comprimento').value;

            if (!pesoVal || !altVal || !largVal || !compVal) {
                missingData = true;
            }

            volumesData.push({
                numero_volume: index + 1,
                peso_kg: parseFloat(pesoVal) || 0,
                altura_cm: parseFloat(altVal) || 0,
                largura_cm: parseFloat(largVal) || 0,
                comprimento_cm: parseFloat(compVal) || 0
            });
        });

        if (missingData) {
            return alert('Informe peso e dimensões para TODOS os volumes antes de confirmar.');
        }

        payload.dados_volumes = JSON.stringify(volumesData);

        if (volumesData.length > 0) {
            payload.peso = volumesData.reduce((acc, v) => acc + v.peso_kg, 0);
            payload.altura = volumesData[0].altura_cm;
            payload.largura = volumesData[0].largura_cm;
            payload.comprimento = volumesData[0].comprimento_cm;
        }
    }

    console.log("Sending Payload:", payload);

    try {
        const res = await fetch(`/api/production/item/${itemId}/embale`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log("Server Response:", data);

        if (res.ok) {
            document.getElementById('embaleModal').remove();
            alert('Embalagem confirmada! Item movido para Logística.');
            loadDashboard(); // Force full dashboard reload to ensure proper state
        } else {
            alert('Erro ao confirmar: ' + (data.error || 'Erro desconhecido'));
        }

    } catch (e) {
        console.error(e);
        alert('Erro de conexão: ' + e.message);
    }
}

async function registrarEvento(itemId, setor, acao, qtd) {
    // Validação: Obrigatório ter responsável ao FINALIZAR
    if (acao === 'FIM') {
        const respSelect = document.getElementById(`resp_select_${itemId}`);
        if (!respSelect) {
            // Fallback HARD BLOCk
            alert('⚠️ ERRO DE VALIDAÇÃO: Campo de responsável não detectado. Por favor, recarregue a página (F5) e tente novamente.');
            return;
        }

        if (!respSelect.value) {
            return alert('⚠️ OBJETIVO BLOQUEADO: Selecione o RESPONSÁVEL antes de finalizar a produção.');
        }
    }

    // Capturar NOME do Responsável Selecionado (se houver)
    let selectedOperadorNome = null;
    // Tenta pegar pelo ID se existir
    const respSelect = document.getElementById(`resp_select_${itemId}`);

    if (respSelect && respSelect.selectedIndex >= 0) {
        const option = respSelect.options[respSelect.selectedIndex];
        // Se tem value (nome), usa.
        if (option.value) {
            selectedOperadorNome = option.value;
            console.log(`[EVENTO] Usando NOME do Responsável Selecionado: ${selectedOperadorNome}`);
        }
    }

    await fetch(`/api/production/evento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            item_id: itemId,
            operador_id: currentUser.id, // Mantem ID de quem clicou para audit
            operador_nome: selectedOperadorNome, // Envia NOME processado
            setor,
            acao,
            quantidade_produzida: qtd
        })
    });
    loadProductionQueue(setor);
}

// --- EDITAR PEDIDO ---

async function openEditOrderModal(id) {
    if (currentUser.perfil !== 'admin' && currentUser.perfil !== 'financeiro') {
        return alert('Sem permissão para editar.');
    }

    try {
        const res = await fetch(`/api/orders/${id}`);
        const order = await res.json();

        // Checar restrição (Frontend check for UX)
        // Se algum item >= DESEMBALE, restrito.
        const isRestricted = order.itens.some(i =>
            ['AGUARDANDO_DESEMBALE', 'AGUARDANDO_PRODUCAO', 'EM_PRODUCAO', 'AGUARDANDO_EMBALE', 'AGUARDANDO_ENVIO', 'CONCLUIDO'].includes(i.status_atual)
        );

        const disabledAttr = isRestricted ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : '';
        const lockIcon = isRestricted ? '<i class="ph-lock-key"></i>' : '';

        // Renderizar Itens Inputs
        let itemsHtml = '';
        order.itens.forEach((item, idx) => {
            itemsHtml += `
                <div class="flex-row item-row" data-id="${item.id}">
                    <input type="text" value="${item.produto}" class="form-control item-prod" ${disabledAttr}>
                    <input type="number" value="${item.quantidade}" class="form-control item-qtd" ${disabledAttr} style="flex: 0.3">
                    ${!isRestricted ? `<button type="button" class="btn" style="background:var(--danger); width:auto; padding:0.5rem" onclick="this.parentElement.remove()"><i class="ph-trash"></i></button>` : ''}
                </div>
            `;
        });

        const html = `
        <div id="editOrderModal" class="modal show">
            <div class="modal-content" style="max-width: 600px;">
                <h2 style="margin-bottom: 1rem;">Editar Pedido #${order.numero_pedido}</h2>
                ${isRestricted ? `<div class="alert alert-warning"><i class="ph-warning"></i> Pedido em Produção. Edição restrita.</div>` : ''}

                <form id="editOrderForm">
                    <div class="flex-row">
                        <div class="form-group" style="flex: 2">
                            <label>Cliente ${lockIcon}</label>
                            <input type="text" name="cliente" class="form-control" value="${order.cliente}" ${disabledAttr} required>
                        </div>
                         <div class="form-group" style="flex: 1">
                            <label>Nº Pedido ${lockIcon}</label>
                            <input type="text" name="numero_pedido" class="form-control" value="${order.numero_pedido}" ${disabledAttr} required>
                        </div>
                    </div>
                    
                    <div class="flex-row">
                        <div class="form-group" style="flex: 1">
                            <label>Prazo de Entrega</label>
                            <input type="date" name="prazo_entrega" class="form-control" value="${order.prazo_entrega ? order.prazo_entrega.split('T')[0] : ''}" required>
                        </div>
                         <div class="form-group" style="flex: 1">
                            <label>Envio</label>
                            <select name="tipo_envio" class="form-control">
                                <option value="TRANSPORTADORA" ${order.tipo_envio === 'TRANSPORTADORA' ? 'selected' : ''}>Transportadora</option>
                                <option value="CORREIOS" ${order.tipo_envio === 'CORREIOS' ? 'selected' : ''}>Correios</option>
                                <option value="RETIRADA" ${order.tipo_envio === 'RETIRADA' ? 'selected' : ''}>Retirada</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Transportadora</label>
                        <input type="text" name="transportadora" class="form-control" value="${order.transportadora || ''}">
                    </div>

                    <div class="form-group">
                        <label>Observação</label>
                        <textarea name="observacao" class="form-control" rows="2">${order.observacao || ''}</textarea>
                    </div>

                    <h4 style="margin-top:1rem">Itens ${lockIcon}</h4>
                    <div id="editItemsContainer">${itemsHtml}</div>
                    
                    ${!isRestricted ? `
                    <button type="button" class="btn" style="background: var(--bg-primary); border: 1px solid var(--accent); color: var(--accent); margin-bottom: 1rem;" onclick="addEditItemRow()">
                        <i class="ph-plus"></i> Adicionar Item
                    </button>` : ''}

                    <div class="flex-row" style="justify-content: flex-end; margin-top: 1rem;">
                        <button type="button" class="btn" style="background: var(--text-secondary); width: auto;" onclick="document.getElementById('editOrderModal').remove()">Cancelar</button>
                        <button type="submit" class="btn" style="width: auto; margin-left: 0.5rem;">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('editOrderForm').onsubmit = (e) => handleEditSubmit(e, id, isRestricted);

    } catch (e) {
        alert('Erro ao carregar dados do pedido.');
        console.error(e);
    }
}

function addEditItemRow() {
    const div = document.createElement('div');
    div.className = 'flex-row item-row';
    div.innerHTML = `
        <input type="text" placeholder="Novo Produto" class="form-control item-prod">
        <input type="number" placeholder="1" class="form-control item-qtd" style="flex: 0.3">
        <button type="button" class="btn" style="background:var(--danger); width:auto; padding:0.5rem" onclick="this.parentElement.remove()"><i class="ph-trash"></i></button>
    `;
    document.getElementById('editItemsContainer').appendChild(div);
}

async function handleEditSubmit(e, id, isRestricted) {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Coletar Itens
    const itens = [];
    if (!isRestricted) {
        document.querySelectorAll('#editItemsContainer .item-row').forEach(row => {
            const prod = row.querySelector('.item-prod').value;
            const qtd = row.querySelector('.item-qtd').value;
            const itemId = row.getAttribute('data-id'); // ID se existir
            if (prod && qtd) {
                itens.push({ id: itemId, produto: prod, quantidade: qtd });
            }
        });
    }

    const payload = {
        usuario_id: currentUser.id,
        // motivo removido
        prazo_entrega: formData.get('prazo_entrega'),
        tipo_envio: formData.get('tipo_envio'),
        transportadora: formData.get('transportadora'),
        observacao: formData.get('observacao'),
        // Campos restritos só enviam se !isRestricted (mas backend valida igual)
        cliente: formData.get('cliente'),
        numero_pedido: formData.get('numero_pedido'),
        itens: isRestricted ? null : itens
    };

    try {
        const res = await fetch(`/api/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
            alert('Pedido atualizado com sucesso!');
            document.getElementById('editOrderModal').remove();
            loadOrders(); // Refresh
        } else {
            console.error('Erro Backend:', data);
            alert('Erro: ' + (data.error || 'Erro desconhecido no servidor'));
        }
    } catch (e) {
        console.error('Erro Frontend/Fetch:', e);
        alert('Erro ao salvar: ' + e.message);
    }
}

async function viewOrderHistory(id) {
    // Busca historico
    try {
        const res = await fetch(`/api/orders/${id}/history`);
        const rows = await res.json();

        if (rows.length === 0) return alert('Nenhum histórico encontrado.');

        let list = rows.map(r => `
            <li style="margin-bottom: 0.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">
                <strong>${new Date(r.data_alteracao).toLocaleString()}</strong> - ${r.usuario_nome || 'Sistema'}<br>
                Alterou <em>${r.campo_alterado}</em> de "<b>${r.valor_antigo}</b>" para "<b>${r.valor_novo}</b>"<br>
                <small>Motivo: ${r.motivo}</small>
            </li>
        `).join('');

        const html = `
        <div id="histModal" class="modal show">
            <div class="modal-content">
                <h3>Histórico de Alterações</h3>
                <ul style="list-style: none; padding: 0; max-height: 400px; overflow-y: auto;">${list}</ul>
                <button class="btn" onclick="document.getElementById('histModal').remove()">Fechar</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    } catch (e) {
        alert('Erro ao buscar histórico.');
    }
}

// --- LOGÍSTICA (LABEL / DISPATCH) ---

function openLabelModal(item) {
    const isRetirada = item.tipo_envio === 'RETIRADA';
    let volumesInfo = '';
    let hasAlert = false;

    // 1. Processar Volumes
    if (isRetirada) {
        // Retirada: Apenas Quantidade
        volumesInfo = `
            <div style="background: #e0f2fe; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #bae6fd; color: #0369a1;">
                <strong>Retirada pelo Cliente</strong><br>
                Quantidade de Volumes: <strong>${item.quantidade_volumes || 1}</strong><br>
                <small>(Peso e Dimensões não aplicáveis)</small>
            </div>
            <div style="margin-top: 1rem; padding: 0.5rem; border: 2px dashed #ccc; text-align: center; font-weight: bold; background: #fff;">
                ETIQUETA INTERNA<br>
                ${item.cliente}<br>
                Pedido: ${item.numero_pedido}<br>
                ${item.quantidade_volumes || 1} Volume(s)
            </div>
        `;
    } else {
        // Transportadora / Correios
        if (item.dados_volumes) {
            try {
                const vols = JSON.parse(item.dados_volumes);
                console.log(`[LOGISTICA-DEBUG] Item ${item.id} QtdVols: ${item.quantidade_volumes}, JSON Vols: ${vols.length}`, vols);

                // VALIDATION: Must show exactly N volumes as defined in header
                if (Array.isArray(vols) && vols.length > 0) {

                    // Validate Count
                    if (vols.length !== item.quantidade_volumes) {
                        console.warn(`[LOGISTICA-WARN] Mismatch count. Header: ${item.quantidade_volumes}, Array: ${vols.length}`);
                        hasAlert = true;
                    }

                    volumesInfo = '<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.5rem;">';
                    vols.forEach((v, i) => {
                        // Normalize keys (Handle snake_case and UPPERCASE)
                        const volNum = v.numero_volume || v.volume || v.NUMERO_VOLUME || (i + 1);
                        const peso = v.peso_kg || v.peso || v.p || v.PESO_KG || v.PESO || 0;
                        const alt = v.altura_cm || v.altura || v.a || v.ALTURA_CM || v.ALTURA || 0;
                        const larg = v.largura_cm || v.largura || v.l || v.LARGURA_CM || v.LARGURA || 0;
                        const comp = v.comprimento_cm || v.comprimento || v.c || v.COMPRIMENTO_CM || v.COMPRIMENTO || 0;

                        if (peso <= 0 || alt <= 0 || larg <= 0 || comp <= 0) {
                            hasAlert = true; // Mark as incomplete if any dimension is zero
                            console.warn(`[LOGISTICA-WARN] Vol ${volNum} incomplete:`, v);
                        }

                        volumesInfo += `
                            <div style="padding: 0.25rem 0; border-bottom: 1px dashed #cbd5e1; font-size: 0.9rem;">
                                <strong>Volume ${volNum}:</strong> ${peso} kg <br>
                                <span style="color: #64748b;">L: ${larg} cm x A: ${alt} cm x C: ${comp} cm</span>
                            </div>
                        `;
                    });
                    volumesInfo += '</div>';
                } else {
                    hasAlert = true;
                    console.warn("[LOGISTICA-WARN] JSON empty or not array");
                }
            } catch (e) {
                console.error("Erro parsing dados_volumes", e);
                hasAlert = true;
            }
        } else {
            console.warn("[LOGISTICA-WARN] No dados_volumes found");
            hasAlert = true;
        }

        if (hasAlert) {
            volumesInfo = `
                <div class="alert alert-danger">
                    <i class="ph-warning"></i> <strong>Dados incompletos!</strong><br>
                    Não foram encontrados pesos/dimensões para todos os ${item.quantidade_volumes} volumes.<br>
                    <small>Verifique se todos os campos foram preenchidos no Embale.</small>
                    <button class="btn" style="margin-top:0.5rem; width:100%" onclick="document.getElementById('labelModal').remove(); openEmbaleAction(${item.id}, ${item.pedido_id}, '${item.tipo_envio}')">Voltar para Embale</button>
                </div>
            `;
        }
    }

    const html = `
        <div id="labelModal" class="modal show">
            <div class="modal-content" style="max-width: 500px;">
                <h3 style="margin-bottom: 1rem;">Dados para Etiqueta / Expedição</h3>
                
                <div style="margin-bottom: 1rem; font-size: 0.95rem;">
                    <p><strong>Cliente:</strong> ${item.cliente}</p>
                    <p><strong>Pedido:</strong> ${item.numero_pedido}</p>
                    <p><strong>Prazo:</strong> ${new Date(item.prazo_entrega).toLocaleDateString()}</p>
                    <p><strong>Envio:</strong> ${renderShippingBadge(item.tipo_envio)}</p>
                    ${item.transportadora ? `<p><strong>Transportadora:</strong> ${item.transportadora}</p>` : ''}
                    ${item.observacao ? `<div style="margin-top:0.5rem; background:#fff7ed; padding:0.5rem; border-radius:4px; font-size:0.9rem"><strong>Obs:</strong> ${item.observacao}</div>` : ''}
                </div>
                
                <h4 style="margin-top: 1rem; font-size: 1rem; border-bottom: 1px solid #eee; padding-bottom: 0.25rem;">Volumes</h4>
                ${volumesInfo}
                
                <div style="text-align: right; margin-top: 1.5rem; border-top: 1px solid #eee; padding-top: 1rem;">
                    <button class="btn" style="background: var(--text-secondary); width: auto; margin-right: 0.5rem;" onclick="document.getElementById('labelModal').remove()">Fechar</button>
                    ${!hasAlert ? `<button class="btn" style="width: auto;" onclick="dispatchItem(${item.id})"> <i class="ph-paper-plane-right"></i> Gerar Etiqueta & Despachar</button>` : ''}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

async function dispatchItem(itemId) {
    if (!confirm('Confirmar despacho deste item? Ele será marcado como CONCLUÍDO.')) return;

    document.getElementById('labelModal').remove();
    await mudarStatusItem(itemId, 'CONCLUIDO');
}

// --- Helper Functions for Sectors ---

function getSectorFromStatus(status) {
    switch (status) {
        case 'ARTE': // Fila de Arte específica
        case 'AGUARDANDO_ARTE': return 'arte';
        case 'AGUARDANDO_SEPARACAO': return 'separacao';
        case 'AGUARDANDO_DESEMBALE': return 'desembale';
        case 'AGUARDANDO_IMPRESSAO': return 'impressao';
        case 'AGUARDANDO_EMBALE': return 'embale';
        case 'AGUARDANDO_ENVIO': return 'logistica'; // Logística cuida do envio
        default: return null;
    }
}

// Mapeia códigos internos (arte, separacao) para os Nomes Reais do banco (Arte Final, Separação)
function getSectorDbName(internalCode) {
    const map = {
        'arte': 'Arte Final',
        'separacao': 'Separação',
        'desembale': 'Desembale',
        'impressao': 'Impressão', // Genérico, ou precisa tratar sub-setores?
        'embale': 'Embale',
        'logistica': 'Logística'
    };
    return map[internalCode] || internalCode;
}

function getResponsavelColumn(status) {
    const sector = getSectorFromStatus(status);
    return sector ? `responsavel_${sector}` : null;
}

// --- DOSSIÊ DE PEDIDO FINALIZADO ---
function renderFinishedOrderDossier(order) {
    document.getElementById('pageTitle').textContent = `Dossiê do Pedido ${order.numero_pedido}`;

    // 1. Header Info
    const headerInfo = `
        <div class="card" style="border-left: 5px solid #22c55e;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h2 style="margin:0; font-size:1.5rem;">${order.cliente}</h2>
                    <div style="color:var(--text-secondary); margin-top:0.25rem;">Pedido: <strong>${order.numero_pedido}</strong></div>
                </div>
                 <div style="text-align:right">
                    <span class="badge badge-success" style="font-size:1rem; padding:0.5rem 1rem;">FINALIZADO</span>
                    <div style="margin-top:0.5rem; font-size:0.9rem; color:var(--text-secondary);">
                        <i class="ph-check-circle"></i> Concluído em: ${formatDateTime(order.itens?.[0]?.finalizado_em || order.itens?.[0]?.data_envio)}
                    </div>
                </div>
            </div>
             <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-top:1.5rem; padding-top:1rem; border-top:1px solid #eee;">
                <div><strong>Tipo Envio:</strong> ${order.tipo_envio}</div>
                <div><strong>Transp:</strong> ${order.transportadora || '-'}</div>
                <div><strong>Prazo Original:</strong> ${new Date(order.prazo_entrega).toLocaleDateString()}</div>
                <div><strong>Expedição:</strong> ${formatDateTime(order.itens?.[0]?.data_envio)}</div>
            </div>
             ${order.observacao ? `<div style="margin-top:1rem; background:#f8fafc; padding:0.5rem; border-radius:4px;"><strong>Obs:</strong> ${order.observacao}</div>` : ''}
        </div>
    `;

    // 2. Visual Layouts & Items
    let itemsHtml = '';
    order.itens.forEach(item => {
        // Timeline Logic per Item
        itemsHtml += renderItemTimeline(item);
    });

    document.getElementById('contentArea').innerHTML = `
        <button class="btn" style="width:auto; margin-bottom:1rem; background:var(--text-secondary)" onclick="loadFinishedOrders()">
            <i class="ph-arrow-left"></i> Voltar para Arquivo
        </button>
        ${headerInfo}
        <h3 style="margin-top:2rem;">Histórico de Produção do Item</h3>
        ${itemsHtml}
    `;

    injectLightbox();
}

function renderItemTimeline(item) {
    // Determine Layout Thumbnail
    let layoutThumb = '<div style="background:#eee; width:80px; height:80px; display:flex; align-items:center; justify-content:center; border-radius:4px; color:#999; font-size:0.8rem;">S/ Layout</div>';
    if (item.layout_path) {
        if (item.layout_type === 'image') {
            layoutThumb = `<img src="${item.layout_path}" style="width:100px; height:100px; object-fit:cover; border-radius:4px; border:1px solid #ddd; cursor:pointer;" onclick="viewLayout('${item.layout_path}', 'image')">`;
        } else {
            layoutThumb = `<div style="width:100px; height:100px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f1f5f9; border-radius:4px; cursor:pointer;" onclick="viewLayout('${item.layout_path}', 'pdf')"><i class="ph-file-pdf" style="font-size:2rem; color:#ef4444"></i><span style="font-size:0.7rem;">PDF</span></div>`;
        }
    }

    // Timeline Events
    // Arte
    const arteSection = renderTimelineStep('Arte Final', item.responsavel_arte, item.data_arte_aprovacao || item.layout_uploaded_at, 'ph-paint-brush', '#eab308',
        item.cor_impressao ? `Cor: <strong>${item.cor_impressao}</strong>` : null);

    // Separação
    const sepSection = renderTimelineStep('Separação', item.responsavel_separacao, item.data_separacao, 'ph-package', '#f97316');

    // Desembale
    const desSection = renderTimelineStep('Desembale', item.responsavel_desembale, item.data_desembale, 'ph-box-open', '#8b5cf6',
        item.setor_destino ? `Destino: ${item.setor_destino}` : null);

    // Produção
    // Calculate Prod Time from events
    let prodStart = null, prodEnd = null, prodDuration = '';
    if (item.eventos && item.eventos.length > 0) {
        const startEvt = item.eventos.find(e => e.acao === 'INICIO');
        const endEvt = item.eventos.find(e => e.acao === 'FIM');
        if (startEvt) prodStart = startEvt.timestamp;
        if (endEvt) prodEnd = endEvt.timestamp;

        if (prodStart && prodEnd) {
            const diff = new Date(prodEnd) - new Date(prodStart);
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            const pad = (n) => n.toString().padStart(2, '0');
            prodDuration = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }
    }
    const prodDetails = `
        ${prodStart ? `<div>Início: ${formatDateTime(prodStart)}</div>` : ''}
        ${prodEnd ? `<div>Fim: ${formatDateTime(prodEnd)}</div>` : ''}
        ${prodDuration ? `<div style="font-weight:bold; color:#059669">Duração: ${prodDuration}</div>` : ''}
    `;
    const prodSection = renderTimelineStep('Impressão', item.responsavel_impressao, prodEnd, 'ph-printer', '#ec4899', prodDetails);

    // Embale
    let embaleDetails = null;
    if (item.quantidade_volumes > 0) {
        embaleDetails = `<div><strong>${item.quantidade_volumes} Vols</strong>, ${item.peso}kg Total</div>`;

        // Show details if available (Dossier Mode)
        if (item.dados_volumes) {
            try {
                const vols = JSON.parse(item.dados_volumes);
                if (Array.isArray(vols) && vols.length > 0) {
                    embaleDetails += `<div style="margin-top:0.5rem; font-size:0.8rem; background:#fff; padding:0.5rem; border-radius:4px; border:1px solid #eee;">`;
                    vols.forEach((v, i) => {
                        const vn = v.numero_volume || (i + 1);
                        // Normalize keys
                        const p = v.peso_kg || v.peso || v.p || v.PESO_KG || 0;
                        const a = v.altura_cm || v.altura || v.a || v.ALTURA_CM || 0;
                        const l = v.largura_cm || v.largura || v.l || v.LARGURA_CM || 0;
                        const c = v.comprimento_cm || v.comprimento || v.c || v.COMPRIMENTO_CM || 0;

                        embaleDetails += `<div style="border-bottom:1px dashed #eee; padding-bottom:2px; margin-bottom:2px;">
                            <strong>Vol ${vn}:</strong> ${p}kg - L: ${l}cm x A: ${a}cm x C: ${c}cm
                        </div>`;
                    });
                    embaleDetails += `</div>`;
                }
            } catch (e) { }
        }
    }
    const embSection = renderTimelineStep('Embale', item.responsavel_embale, item.data_embale, 'ph-gift', '#06b6d4', embaleDetails);

    // Logística
    const logSection = renderTimelineStep('Logística', item.responsavel_logistica, item.data_envio, 'ph-truck', '#3b82f6',
        item.status_atual === 'CONCLUIDO' ? 'Despachado / Entregue' : item.status_atual);


    return `
        <div class="card" style="margin-top:1rem; padding:0; overflow:hidden;">
            <div style="background:#f8fafc; padding:1rem; border-bottom:1px solid #eee; display:flex; align-items:center; gap:1rem;">
                <div style="font-weight:bold; font-size:1.1rem; flex:1;">${item.produto} <span style="font-weight:normal; color:var(--text-secondary)">(x${item.quantidade})</span></div>
                 ${layoutThumb}
            </div>
            
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:0; padding:1rem; position:relative;">
                  ${arteSection}
                  ${sepSection}
                  ${desSection}
                  ${prodSection}
                  ${embSection}
                  ${logSection}
            </div>
        </div>
    `;
}

function renderDeadline(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = d - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    let color = 'green';
    if (days < 0) color = 'red';
    else if (days <= 2) color = 'orange';

    return `<span style="color:${color}; font-weight:bold">${d.toLocaleDateString()} (${days > 0 ? days + ' dias' : 'Atrasado'})</span>`;
}

function renderTimelineStep(title, user, date, icon, color, extraHtml) {
    const isDone = !!date || !!user;
    const opacity = isDone ? '1' : '0.4';
    const dateStr = formatDateTime(date);

    return `
        <div style="position:relative; padding:0.5rem; text-align:center; opacity:${opacity}">
            <div style="width:40px; height:40px; background:${isDone ? color : '#e2e8f0'}; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 0.5rem auto;">
                <i class="${icon}" style="font-size:1.2rem"></i>
            </div>
            <div style="font-weight:bold; font-size:0.9rem; color:${color}">${title}</div>
            <div style="font-size:0.8rem; margin-top:0.25rem;">${user || '-'}</div>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.25rem;">${dateStr || '-'}</div>
            ${extraHtml ? `<div style="font-size:0.75rem; color:#475569; margin-top:0.25rem; background:#f1f5f9; padding:2px 4px; border-radius:4px; display:inline-block;">${extraHtml}</div>` : ''}
        </div>
    `;
}

function renderLayoutThumbnail(order) {
    const itemWithLayout = order.itens?.find(i => i.layout_path);
    if (!itemWithLayout) return '<span style="color:#ccc; font-size:0.8rem">S/ Layout</span>';

    if (itemWithLayout.layout_type === 'image') {
        return `<img src="${itemWithLayout.layout_path}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">`;
    } else {
        return `<i class="ph-file-pdf" style="font-size:1.5rem; color:#ef4444"></i>`;
    }
}

function formatDateTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// --- ROLLBACK / VOLTAR ETAPA ---

function openRollbackModal(itemId, currentStatus, setorDestino) {
    // DEBUG
    // alert(`DEBUG: Open Rollback. Status: ${currentStatus}, Setor: ${setorDestino}`);

    // 1. Define Valid Rollback Targets based on Current Status
    // Flow: NOVO -> AGUARDANDO_ARTE -> AGUARDANDO_SEPARACAO -> AGUARDANDO_DESEMBALE -> AGUARDANDO_PRODUCAO -> AGUARDANDO_EMBALE -> AGUARDANDO_ENVIO -> FINALIZADO

    let options = [];

    /* 
       Simplificando a lógica: Permitir voltar para qualquer etapa ANTERIOR lógica.
       Mas para evitar complexidade, vamos definir hardcoded targets comuns.
    */

    const flow = [
        { status: 'NOVO', label: 'Novo / Aguardando Arte' }, // ou AGUARDANDO_ARTE se arte for obrigatória
        { status: 'AGUARDANDO_SEPARACAO', label: 'Separação' },
        { status: 'AGUARDANDO_DESEMBALE', label: 'Desembale' }, // Apenas se tiver produto que precisa desembalar
        { status: 'AGUARDANDO_PRODUCAO', label: 'Produção (Impressão)' },
        { status: 'AGUARDANDO_EMBALE', label: 'Embale' },
        { status: 'AGUARDANDO_ENVIO', label: 'Logística' }
    ];

    // Find current index
    // Note: 'currentStatus' might be 'EM_PRODUCAO' or 'PAUSADO', treat as 'AGUARDANDO_PRODUCAO' level

    // Helper to map current status to flow level
    let currentLevel = -1;
    if (currentStatus === 'FINALIZADO') currentLevel = 99;
    else if (currentStatus === 'AGUARDANDO_ENVIO' || currentStatus === 'CONCLUIDO') currentLevel = 5;
    else if (currentStatus === 'AGUARDANDO_EMBALE' || currentStatus === 'EM_EMBALE') currentLevel = 4;
    else if (currentStatus === 'AGUARDANDO_PRODUCAO' || currentStatus === 'EM_PRODUCAO') currentLevel = 3;
    else if (currentStatus === 'AGUARDANDO_DESEMBALE' || currentStatus === 'EM_DESEMBALE') currentLevel = 2;
    else if (currentStatus === 'AGUARDANDO_SEPARACAO' || currentStatus === 'EM_SEPARACAO') currentLevel = 1;
    else if (currentStatus.includes('ARTE') || currentStatus === 'NOVO') currentLevel = 0;

    // Filter options where index < currentLevel
    // Also, restrict 'NOVO' usually implies 'AGUARDANDO_ARTE' logic if we want to reset flow

    const validTargets = flow.filter((step, index) => index < currentLevel);

    if (validTargets.length === 0) {
        return alert("Não há etapas anteriores para retornar (ou status desconhecido).");
    }

    const optionsHtml = validTargets.map(t => `<option value="${t.status}">${t.label}</option>`).join('');

    const modalHtml = `
    <div id="rollbackModal" class="modal show">
        <div class="modal-content" style="max-width: 400px;">
            <span class="close" onclick="closeRollbackModal()">&times;</span>
            <h3 style="color: var(--warning); display:flex; align-items:center; gap:0.5rem;"><i class="ph-arrow-u-up-left"></i> Voltar Etapa</h3>
            <p style="color:#666; font-size:0.9rem; margin-bottom:1rem;">O item será movido para a fila selecionada e sairá da fila atual.</p>
            
            <!-- Hidden context for redirection -->
            <input type="hidden" id="rollbackSetorDestino" value="${setorDestino || ''}">
            <input type="hidden" id="rollbackOriginStatus" value="${currentStatus}">

            <div class="form-group">
                <label>Destino (Etapa Anterior)</label>
                <select id="rollbackTarget" class="form-control">
                    ${optionsHtml}
                </select>
            </div>

            <div class="form-group">
                <label>Motivo do Retorno (Observação)</label>
                <textarea id="rollbackObs" class="form-control" rows="3" placeholder="Ex: Erro na separação, cor incorreta..."></textarea>
            </div>

            <div style="text-align: right; margin-top: 1rem;">
                 <button class="btn" style="background: var(--text-secondary); width: auto;" onclick="closeRollbackModal()">Cancelar</button>
                 <button class="btn" style="background: var(--warning); width: auto; color: #78350f;" onclick="submitRollback(${itemId})">Confirmar Retorno</button>
            </div>
        </div>
    </div>`;

    // Remove existing if any
    const existing = document.getElementById('rollbackModal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeRollbackModal() {
    const m = document.getElementById('rollbackModal');
    if (m) m.remove();
}

async function submitRollback(itemId) {
    const targetStatus = document.getElementById('rollbackTarget').value;
    const obs = document.getElementById('rollbackObs').value;
    const setorDestino = document.getElementById('rollbackSetorDestino').value;
    const originStatus = document.getElementById('rollbackOriginStatus').value;

    if (!targetStatus) return alert("Selecione o destino.");

    try {
        const res = await fetch(`/api/production/item/${itemId}/return`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_status: targetStatus,
                observation: obs,
                operador_id: currentUser.id
            })
        });

        if (res.ok) {
            alert("Item retornado com sucesso!");
            closeRollbackModal();

            // --- REDIRECTION LOGIC (Based on Target) ---

            // Prioritize the DESTINATION status, not the item properties.
            // alert(`DEBUG: Target Status is: ${targetStatus}`);

            if (targetStatus === 'NOVO' || targetStatus === 'AGUARDANDO_ARTE' || targetStatus === 'ARTE_FINAL' || targetStatus.includes('ARTE')) {
                loadArteQueue();
            } else if (targetStatus === 'AGUARDANDO_SEPARACAO') {
                loadGenericQueue('AGUARDANDO_SEPARACAO', 'Separação');
            } else if (targetStatus === 'AGUARDANDO_DESEMBALE') {
                loadGenericQueue('AGUARDANDO_DESEMBALE', 'Desembale');
            } else if (targetStatus === 'AGUARDANDO_PRODUCAO') {
                // Here we need Sector
                if (setorDestino && setorDestino.trim() !== '') {
                    loadProductionQueue(setorDestino);
                } else {
                    alert("Aviso: Setor de impressão não definido. Redirecionando para Dashboard.");
                    loadDashboard();
                }
            } else if (targetStatus === 'AGUARDANDO_EMBALE') {
                loadGenericQueue('AGUARDANDO_EMBALE', 'Embale');
            } else if (targetStatus === 'AGUARDANDO_ENVIO') {
                loadGenericQueue('AGUARDANDO_ENVIO', 'Logística');
            } else {
                loadDashboard();
            }

        } else {
            const data = await res.json();
            alert("Erro: " + (data.error || "Falha desconhecida"));
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão.");
    }
}

// --- GENERIC CONFIRMATION MODAL ---
// --- GENERIC CONFIRMATION MODAL ---
function openConfirmationModal(title, checklistItems, confirmText, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal show'; // Fixed visibility class
    modal.style.zIndex = '10000'; // Ensure on top

    // Render Checkboxes
    const checklistHtml = checklistItems.map((item, index) =>
        `<li style="margin-bottom: 0.5rem; display: flex; align-items: flex-start; gap: 0.5rem;">
            <input type="checkbox" id="check-${index}" class="confirmation-checkbox" style="transform: scale(1.2); margin-top: 2px;">
            <label for="check-${index}" style="cursor: pointer; text-transform: uppercase; font-size: 0.85rem; color: #334155; line-height: 1.4;">${item}</label>
         </li>`
    ).join('');

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px">
            <h3 style="color: var(--accent); margin-bottom: 1rem; font-size: 1.1rem;"><i class="ph-warning-circle"></i> ${title.toUpperCase()}</h3>
            
            <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #e2e8f0;">
                <p style="font-weight: bold; margin-bottom: 0.75rem; color: #475569; text-transform: uppercase; font-size: 0.8rem;">Checklist Obrigatório</p>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    ${checklistHtml}
                </ul>
            </div>

            <p style="margin-bottom: 1.5rem; font-size: 0.8rem; color: #64748b; font-style: italic;">
                * Marque todos os itens para habilitar a confirmação.
            </p>

            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button class="btn" style="background: #ccc; color: #333;" onclick="this.closest('.modal').remove()">CANCELAR</button>
                <button class="btn" id="confirmBtn" disabled style="background: var(--success); width: auto; opacity: 0.5; cursor: not-allowed;">
                    <i class="ph-check"></i> ${confirmText.toUpperCase()}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const btn = modal.querySelector('#confirmBtn');
    const checkboxes = modal.querySelectorAll('.confirmation-checkbox');

    // Enable/Disable Logic
    function updateBtnState() {
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        btn.disabled = !allChecked;
        btn.style.opacity = allChecked ? '1' : '0.5';
        btn.style.cursor = allChecked ? 'pointer' : 'not-allowed';
    }

    checkboxes.forEach(cb => cb.addEventListener('change', updateBtnState));

    btn.onclick = () => {
        if (!btn.disabled) {
            onConfirm();
            modal.remove();
        }
    };
}

function openDesembaleConfirmation(itemId, nextStatus) {
    openConfirmationModal(
        "Confirmação de Desembale",
        [
            "Conferi os itens 1 a 1",
            "Realizei a contagem corretamente",
            "Fiz o desembale e separação dos produtos",
            "Encaminhei o pedido para a etapa correta"
        ],
        "Confirmar e avançar",
        () => mudarStatusItem(itemId, nextStatus)
    );
}

function openPrintingConfirmation(itemId, sector) {
    const isEstamparia = sector === 'ESTAMPARIA';
    const title = isEstamparia ? "Confirmação antes de iniciar Estamparia" : "Confirmação antes de iniciar a impressão";

    openConfirmationModal(
        title,
        [
            "Produto correto e quantidade conferida",
            "Layout aprovado conferido visualmente",
            "Cor de impressão / Pantone conferida",
            "Tamanho e posicionamento da arte conferidos",
            "Escritas, ortografia e detalhes revisados"
        ],
        "Confirmar e iniciar",
        () => registrarEvento(itemId, sector, 'INICIO', 0)
    );
}

// Duplicate function removed

// --- LIVE TIMER LOGIC ---
function updateLiveTimers() {
    const timers = document.querySelectorAll('.production-timer');
    const now = new Date();

    timers.forEach(timer => {
        const elapsedInitial = timer.getAttribute('data-elapsed-initial');
        const clientStart = timer.getAttribute('data-client-start');

        // Se ainda renderizado no sistema antigo, cai no fallback ou ignora
        if (!elapsedInitial || !clientStart) {
            const startStr = timer.getAttribute('data-start');
            if (!startStr) return; // ignora se não tiver nenhum dos dois dados

            // Lógica antiga mantida caso haja telas em cache no computador do usuário
            let startTime = startStr.indexOf('Z') === -1 ? new Date(startStr.replace(' ', 'T') + 'Z') : new Date(startStr);
            let diff = now - startTime;
            if (diff < 0) diff = 0;
            renderTime(diff, timer);
            return;
        }

        // Nova Lógica Imune a Fuso Horário
        const initialSeconds = parseInt(elapsedInitial, 10) || 0;
        const startMillis = parseInt(clientStart, 10);

        // Quantos ms se passaram desde que essa linha foi desenhada no HTML?
        const currentElapsedMs = now.getTime() - startMillis;

        // Diferença total = tempo que já tinha rodado no banco + tempo que passou na tela
        const diff = (initialSeconds * 1000) + currentElapsedMs;

        renderTime(diff, timer);
    });
}

function renderTime(diff, timer) {
    if (diff < 0) diff = 0;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const pad = (n) => n.toString().padStart(2, '0');
    const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    const display = timer.querySelector('.timer-display');
    if (display) display.textContent = timeString;
}

// FIX: Add renderLayoutIndicator to helper functions
function renderLayoutIndicator(path, type) {
    // If no path, return empty (or default icon if desired)
    if (!path) return '';

    const isImg = type === 'image';
    const icon = isImg ? '' : '<i class="ph-file-pdf" style="font-size:1.5rem; color:#ef4444"></i>';
    // If image, show thumb. If PDF, show icon.
    const content = isImg ? `<img src="${path}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">` : `<div style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; background:#f1f5f9;">${icon}</div>`;

    return `
        <a href="${path}" target="_blank" style="display:block; width:60px; height:60px; border:1px solid #e2e8f0; padding:2px; border-radius:6px; overflow:hidden; position:relative; background:white; box-shadow:0 1px 2px rgba(0,0,0,0.1);" title="Ver Layout de Aprovação">
            ${content}
            <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.6); color:white; font-size:0.6rem; text-align:center; padding:1px 0;">Ver</div>
        </a>
    `;
}

// FIX: Pular Produção Estamparia (Digital já impressa)
async function skipProduction(itemId, setor) {
    if (!confirm('Tem certeza que deseja PULAR a produção na Estamparia e enviar este item direto para a fila de Embale? (Nenhum tempo será registrado)')) return;

    try {
        const payload = {
            item_id: itemId,
            operador_id: currentUser.id,
            operador_nome: currentUser.nome,
            setor: setor,
            acao: 'PULAR',
            quantidade_produzida: 0
        };

        const res = await fetch('/api/production/evento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            loadProductionQueue(setor); // Atualiza a tela local imediatamente
        } else {
            const errData = await res.json();
            alert('Erro ao pular: ' + (errData.error || 'Erro desconhecido.'));
        }
    } catch (err) {
        console.error('Erro no skipProduction:', err);
        alert('Erro de conexão ao tentar despachar o pedido.');
    }
}
