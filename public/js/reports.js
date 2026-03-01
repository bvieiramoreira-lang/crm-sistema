
// Relatórios

async function loadReports() {
    document.getElementById('pageTitle').textContent = 'Relatórios de Produtividade';

    // Header com Tabs
    const actionArea = document.getElementById('headerActions');
    actionArea.innerHTML = `
        <div style="display: flex; gap: 10px;">
           <button class="btn" onclick="renderUserReportView()">Por Colaborador</button>
           <button class="btn" style="background:transparent; border:1px solid #ccc; color:#333;" onclick="alert('Em breve')">Geral</button>
        </div>
    `;

    renderUserReportView();
}

async function renderUserReportView() {
    // 1. Fetch Users for Dropdown
    let users = [];
    try {
        const res = await fetch('/api/users');
        users = await res.json();
    } catch (e) { console.error(e); }

    const userOptions = users.map(u => `<option value="${u.id}">${u.nome}</option>`).join('');

    const html = `
        <div class="card" style="padding: 1rem;">
            <div style="display:flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
                <div class="form-group" style="margin-bottom:0; min-width: 200px;">
                    <label>Colaborador</label>
                    <select id="reportUser" class="form-control">
                        <option value="">Todos</option>
                        ${userOptions}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label>Início</label>
                    <input type="date" id="reportStart" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label>Fim</label>
                    <input type="date" id="reportEnd" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <button class="btn" style="height: 42px;" onclick="generateUserReport()">Gerar Relatório</button>
            </div>
        </div>
        
        <div id="reportResult" style="margin-top: 1rem;"></div>
    `;

    document.getElementById('contentArea').innerHTML = html;
}

async function generateUserReport() {
    const userId = document.getElementById('reportUser').value;
    const start = document.getElementById('reportStart').value; // Unused in this specific route logic but standard for reports
    const end = document.getElementById('reportEnd').value;

    document.getElementById('reportResult').innerHTML = '<p>Carregando dados...</p>';

    try {
        // userId param is optional
        const query = new URLSearchParams({ start, end });
        if (userId) query.append('userId', userId);

        const res = await fetch(`/api/reports/users/productivity?${query.toString()}`);
        const data = await res.json();

        if (data.length === 0) {
            document.getElementById('reportResult').innerHTML = '<div class="card"><p>Nenhum dado encontrado para o filtro selecionado.</p></div>';
            return;
        }

        let reportHtml = '';

        data.forEach(stat => {
            let detailsHtml = '';
            stat.details.forEach(d => {
                detailsHtml += `
                    <div style="font-size: 0.85rem; padding: 4px 0; border-bottom: 1px dashed #eee; display: flex; justify-content: space-between;">
                         <span><strong>${d.pedido}</strong> - ${d.item}</span>
                         <span>${d.setor.toUpperCase()} (${d.status})</span>
                    </div>
                `;
            });

            reportHtml += `
                <div class="card" style="margin-bottom: 1rem;">
                    <h3 style="margin-top:0; color: var(--accent); border-bottom: 2px solid #eee; padding-bottom: 0.5rem;">
                        ${stat.name}
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 1rem 0;">
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #0ea5e9;">${stat.itemsAssigned}</div>
                            <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase;">Itens Atribuídos</div>
                        </div>
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${stat.itemsCompletedStage}</div>
                            <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase;">Itens Concluídos/Avançados</div>
                        </div>
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${Math.round((stat.itemsCompletedStage / (stat.itemsAssigned || 1)) * 100)}%</div>
                            <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase;">Taxa de Conclusão</div>
                        </div>
                    </div>
                    
                    <details>
                        <summary style="cursor: pointer; padding: 0.5rem; background: #eee; border-radius: 4px; font-weight: bold;">
                             Ver Detalhes dos Itens (${stat.details.length})
                        </summary>
                        <div style="margin-top: 1rem; max-height: 300px; overflow-y: auto;">
                            ${detailsHtml}
                        </div>
                    </details>
                </div>
            `;
        });

        document.getElementById('reportResult').innerHTML = reportHtml;

    } catch (e) {
        console.error(e);
        document.getElementById('reportResult').innerHTML = '<p style="color:red">Erro ao gerar relatório.</p>';
    }
}
