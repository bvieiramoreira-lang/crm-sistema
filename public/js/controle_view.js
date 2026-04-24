async function loadControleQueue() {
    document.getElementById('pageTitle').textContent = 'Controle de Produção';
    
    // Configurar datas defaults: Início e Fim da semana atual (ou apenas deixar vazio para mostrar os recentes)
    // Vamos fazer um layout padrão para o controle
    
    const htmlHeader = `
        <div id="pendingPausesContainer" style="display: none; margin-bottom: 1.5rem;"></div>
        
        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap;">
            <div class="card" style="padding: 1rem; flex: 1; display:flex; gap: 1rem; align-items: flex-end; background: #f8fafc; border: 1px solid #e2e8f0;">
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.8rem; font-weight: bold; color: var(--text-secondary);">Filtrar por Prazo (Início)</label>
                    <input type="date" id="controleStart" class="form-control" onchange="fetchControleData()">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size: 0.8rem; font-weight: bold; color: var(--text-secondary);">Filtrar por Prazo (Fim)</label>
                    <input type="date" id="controleEnd" class="form-control" onchange="fetchControleData()">
                </div>
                <button class="btn btn-secondary" style="height: 42px;" onclick="document.getElementById('controleStart').value=''; document.getElementById('controleEnd').value=''; fetchControleData();"><i class="ph-eraser"></i> Limpar Omissos</button>
            </div>
            
            <div id="controleMetrics" style="display:flex; gap: 1rem;">
                <!-- Preenchido via fetchControleData() -->
            </div>
        </div>
        
        <div class="form-group" style="max-width: 400px; margin-bottom: 1rem;">
            <input type="text" id="controleSearch" class="form-control" placeholder="🔍 Pesquisar na fila de controle..." oninput="filterLocalTable(this.value)">
        </div>
        
        <div class="card">
            <table>
                <thead>
                    <tr>
                        <th>Pedido / Cliente</th>
                        <th>Produto (Item)</th>
                        <th>Qtd.</th>
                        <th>Setor Atual</th>
                        <th>Status</th>
                        <th>Prazo Entrega</th>
                        <th>Status Geral (Pedido)</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="controleTableBody">
                    <tr><td colspan="8" style="text-align:center;">Carregando...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('contentArea').innerHTML = htmlHeader;

    // Set Default Filter logic (optional)
    fetchPendingPauses();
    fetchControleData();
}

async function fetchControleData() {
    const start = document.getElementById('controleStart').value;
    const end = document.getElementById('controleEnd').value;
    
    // Indicador carregando
    document.getElementById('controleTableBody').innerHTML = '<tr><td colspan="8" style="text-align:center;">Buscando dados...</td></tr>';
    
    let url = '/api/controle';
    if (start && end) {
        url += `?start=${start}&end=${end}`;
    }

    try {
        const res = await fetch(url);
        const responseData = await res.json();
        
        if (responseData.error) {
            throw new Error(responseData.error);
        }

        const data = responseData.data;
        const meta = responseData.meta;

        // 1. Atualizar Header Metrics Cards
        const metricsHtml = `
            <div class="dashboard-card" style="margin-bottom:0; min-width: 150px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3>Total de Pedidos</h3>
                <div class="value" style="color: var(--primary);">${meta.totalPedidos}</div>
            </div>
            <div class="dashboard-card" style="margin-bottom:0; min-width: 150px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3>Total de Produtos</h3>
                <div class="value" style="color: #6366f1;">${meta.totalProdutos}</div> <!-- total rows -->
            </div>
            <div class="dashboard-card" style="margin-bottom:0; min-width: 150px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3>Total em Itens (Qtd)</h3>
                <div class="value" style="color: var(--warning);">${meta.totalUnidadesVolume}</div> <!-- soma ds quantidades -->
            </div>
        `;
        document.getElementById('controleMetrics').innerHTML = metricsHtml;

        // 2. Atualizar Tabela (Agrupado por itens individuais, como Arte)
        if (data.length === 0) {
            document.getElementById('controleTableBody').innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem;">Nenhum produto em produção no período.</td></tr>';
            return;
        }

        let rowsHtml = '';
        data.forEach(item => {
            
            const prazoLabel = item.prazo_entrega ? new Date(item.prazo_entrega).toLocaleDateString() : '-';
            
            rowsHtml += `
                <tr>
                    <td><strong>${item.numero_pedido}</strong><br><small style="color:var(--text-secondary)">${item.cliente}</small></td>
                    <td><strong>${item.produto}</strong></td>
                    <td>x${item.quantidade}</td>
                    <td>${item.setor_destino || '-'}</td>
                    <td>${renderOrderStatusBadge(item.status_atual)}</td>
                    <td>${renderDeadline(item.prazo_entrega)}</td>
                    <td><span class="badge ${item.status_geral === 'FINALIZADO' ? 'badge-success' : 'badge-warning'}" style="font-size:0.7rem;">${item.status_geral}</span></td>
                    <td>
                        <button class="btn" style="padding: 0.25rem 0.5rem; width: auto;" onclick="viewOrderDetails(${item.id}, ${item.pedido_id || 'null'})">Ver Pedido</button>
                    </td>
                </tr>
            `;
        });

        document.getElementById('controleTableBody').innerHTML = rowsHtml;
        
        // Re-aplicar filtro textual base caso o campo n\u00e3o esteja vazio
        const searchInput = document.getElementById('controleSearch');
        if(searchInput && searchInput.value) {
            filterLocalTable(searchInput.value);
        }

    } catch (e) {
        document.getElementById('controleTableBody').innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Erro ao processar dados de Controle: ${e.message}</td></tr>`;
    }
}

async function fetchPendingPauses() {
    try {
        const res = await fetch('/api/production/itens/pausas');
        const data = await res.json();
        
        const container = document.getElementById('pendingPausesContainer');
        if (!container) return;
        
        if (data.length > 0) {
            let html = `
                <div class="card" style="border: 1px solid var(--danger); background: #fef2f2;">
                    <h3 style="color: var(--danger); margin-top: 0; margin-bottom: 1rem;"><i class="ph-warning"></i> Solicitações de Pausa Pendentes (${data.length})</h3>
                    <table style="background: white;">
                        <thead>
                            <tr>
                                <th>Pedido / Cliente</th>
                                <th>Produto</th>
                                <th>Setor</th>
                                <th>Motivo da Pausa</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            data.forEach(item => {
                html += `
                    <tr>
                        <td><strong>${item.numero_pedido}</strong><br><small>${item.cliente}</small></td>
                        <td>${item.produto} (x${item.quantidade})</td>
                        <td>${item.setor_destino || '-'}</td>
                        <td style="color: var(--danger); font-weight: bold;">${item.motivo_pausa_producao || 'Não informado'}</td>
                        <td>
                            <button class="btn" style="background: var(--success); padding: 0.25rem 0.5rem; width: auto;" onclick="approvePausa(${item.id})"><i class="ph-check"></i> Aprovar Pausa</button>
                            <button class="btn" style="background: var(--danger); padding: 0.25rem 0.5rem; width: auto; margin-left: 0.5rem;" onclick="denyPausa(${item.id})"><i class="ph-x"></i> Negar</button>
                        </td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>`;
            container.innerHTML = html;
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    } catch (e) {
        console.error("Erro ao buscar requisições de pausas: ", e);
    }
}

async function approvePausa(itemId) {
    if(!confirm("Aprovar e congelar cronômetro deste item?")) return;
    try {
        const res = await fetch(`/api/production/item/${itemId}/pause-approve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operador_id: currentUser.id, operador_nome: currentUser.nome || currentUser.username || 'Admin' })
        });
        const data = await res.json();
        alert(data.message || 'Pausa aprovada com sucesso.');
        fetchPendingPauses();
        fetchControleData();
    } catch (e) {
        console.error(e);
        alert('Erro ao aprovar pausa.');
    }
}

async function denyPausa(itemId) {
    if(!confirm("Negar esta pausa? O cronômetro não será afetado e continuará rodando.")) return;
    try {
        const res = await fetch(`/api/production/item/${itemId}/pause-deny`, {
            method: 'PUT'
        });
        const data = await res.json();
        alert(data.message || 'Pausa negada.');
        fetchPendingPauses();
        fetchControleData();
    } catch (e) {
        console.error(e);
        alert('Erro ao negar pausa.');
    }
}

