async function loadControleQueue() {
    document.getElementById('pageTitle').textContent = 'Controle de Produção';
    
    // Configurar datas defaults: Início e Fim da semana atual (ou apenas deixar vazio para mostrar os recentes)
    // Vamos fazer um layout padrão para o controle
    
    const htmlHeader = `
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
        console.error(e);
        document.getElementById('controleTableBody').innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Erro ao processar dados de Controle: ${e.message}</td></tr>`;
    }
}
