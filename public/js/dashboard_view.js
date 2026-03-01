// --- DASHBOARD VIEW LOGIC ---

// State
let dashboardInterval = null;

function openDashboard() {
    // 1. Limpar e Preparar Área
    const content = document.getElementById('contentArea');
    content.innerHTML = `
        <div class="dashboard-tabs" style="margin-bottom: 1rem; display:flex; gap: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
            <button class="btn-tab active" id="tabLive" onclick="switchDashTab('live')">AO VIVO (TV)</button>
            <button class="btn-tab" id="tabHistory" onclick="switchDashTab('history')">HISTÓRICO / RELATÓRIOS</button>
        </div>
        <div id="dashContent"></div>
    `;

    document.getElementById('pageTitle').innerText = 'Dashboard Geral';

    // Inject Styles if needed
    if (!document.getElementById('dashStyles')) {
        const style = document.createElement('style');
        style.id = 'dashStyles';
        style.innerHTML = `
            .btn-tab { background: transparent; border: none; font-weight: 600; color: var(--text-secondary); cursor: pointer; padding: 0.5rem 1rem; border-radius: 4px; }
            .btn-tab.active { background: var(--primary-light); color: var(--primary); }
            .btn-tab.active { background: var(--primary-light); color: var(--primary); }
            .counter-card { background: #4c1d95; color: #fff; padding: 1.5rem; border-radius: 8px; text-align: center; flex: 1; min-width: 200px; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2); }
            .counter-val { font-size: 3rem; font-weight: 800; line-height: 1; }
            .counter-label { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-top: 0.5rem; }
            .tv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
            .urgent-row { font-size: 1.1rem; padding: 0.5rem; border-bottom: 1px solid #6d28d9; }
        `;
        document.head.appendChild(style);
    }

    switchDashTab('live');
}

function switchDashTab(tab) {
    // Clear Interval
    if (dashboardInterval) clearInterval(dashboardInterval);

    // Update Tabs
    document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(tab === 'live' ? 'tabLive' : 'tabHistory').classList.add('active');

    if (tab === 'live') {
        loadLiveDashboard();
    } else {
        loadHistoryDashboard();
    }
}

// --- LIVE MODE ---
async function loadLiveDashboard() {
    const container = document.getElementById('dashContent');
    container.innerHTML = `
        <div style="background: #000000; color: #f8fafc; padding: 2rem; border-radius: 12px; min-height: 80vh;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
                <h2 style="margin:0; color: #ffffff;"><i class="ph-monitor-play"></i> PRODUÇÃO EM TEMPO REAL</h2>
                <div style="font-family: monospace; font-size: 1.2rem; color: #e2e8f0;" id="clockNow">--:--:--</div>
            </div>

            <div class="tv-grid" id="countersArea">
                <!-- Counters injected here -->
                <div class="counter-card" style="background: #334155;"><i class="ph-spinner ph-spin" style="font-size:2rem"></i></div>
            </div>

            <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
                <!-- Lista de Urgência -->
                <div style="background: #4c1d95; padding: 1.5rem; border-radius: 8px; border: 1px solid #6d28d9;">
                    <h3 style="color: #cbd5e1; border-bottom: 1px solid #6d28d9; padding-bottom: 0.5rem; margin-top:0;">
                        <i class="ph-warning"></i> URGENTES HOJE / PRÓXIMOS
                    </h3>
                    <div id="urgentList"></div>
                </div>

                <!-- Status Geral -->
                <div style="background: #6d5097ff; padding: 1.5rem; border-radius: 8px; border: 1px solid #6d28d9;">
                     <h3 style="color: #cbd5e1; border-bottom: 1px solid #6d28d9; padding-bottom: 0.5rem; margin-top:0;">
                        <i class="ph-chart-pie"></i> RESUMO
                    </h3>
                    <div id="summaryList" style="margin-top: 1rem; color: #94a3b8;">
                        Carregando...
                    </div>
                </div>
            </div>

            <!-- Chart Section -->
            <div style="background: #4c1d95; padding: 1.5rem; border-radius: 8px; border: 1px solid #6d28d9; margin-top: 2rem;">
                 <h3 style="color: #cbd5e1; border-bottom: 1px solid #6d28d9; padding-bottom: 0.5rem; margin-top:0;">
                    <i class="ph-chart-line-up"></i> DESEMPENHO DIÁRIO (PEDIDOS FINALIZADOS - Últimos 7 dias)
                </h3>
                <div style="height: 300px;">
                    <canvas id="productionChart"></canvas>
                </div>
            </div>
        </div>
    `;

    // Clock
    setInterval(() => {
        const el = document.getElementById('clockNow');
        if (el) el.innerText = new Date().toLocaleTimeString();
    }, 1000);

    // Initial Fetch
    await fetchLiveStats();

    // Auto Refresh (30s)
    dashboardInterval = setInterval(fetchLiveStats, 30000);
}

async function fetchLiveStats() {
    try {
        const res = await fetch('/api/dashboard/live');
        const data = await res.json();

        // Render Counters
        // Helper to format: "500 (10 pedidos)" - SWAPPED as requested
        const fmt = (obj) => {
            if (!obj) return '0';
            if (typeof obj === 'object') {
                return `
                    <div style="line-height:1;">${obj.total_items}</div>
                    <div style="font-size: 1rem; opacity: 0.7; font-weight:400; margin-top:0.2rem;">${obj.count} pedidos</div>
                `;
            }
            return obj;
        };

        const counters = document.getElementById('countersArea');
        if (counters) {
            counters.innerHTML = `
                <div class="counter-card" style="background: #0ea5e9;">
                    <span class="counter-val">${fmt(data.em_producao)}</span>
                    <span class="counter-label">EM PRODUÇÃO AGORA</span>
                </div>
                <div class="counter-card" style="background: #eab308; color: #422006;">
                    <span class="counter-val">${fmt(data.aguardando_producao)}</span>
                    <span class="counter-label">AGUARDANDO PROD.</span>
                </div>
                <div class="counter-card">
                    <span class="counter-val">${fmt(data.arte_final)}</span>
                    <span class="counter-label">ARTE FINAL</span>
                </div>
                <div class="counter-card">
                    <span class="counter-val">${fmt(data.separacao)}</span>
                    <span class="counter-label">SEPARAÇÃO</span>
                </div>
                <div class="counter-card" style="background: #3b82f6;"> <!-- Using Blue for Total -->
                    <span class="counter-val">${fmt(data.total_ativos || 0)}</span>
                    <span class="counter-label">TOTAL PEDIDOS ATIVOS</span>
                </div>
            `;
        }

        // Render Urgents
        const urgentDiv = document.getElementById('urgentList');
        if (urgentDiv && data.urgentes) {
            urgentDiv.innerHTML = data.urgentes.map(u => `
                <div class="urgent-row" style="display:flex; justify-content:space-between;">
                    <div>
                        <strong style="color: #fff;">#${u.numero_pedido}</strong> 
                        <span style="color: #94a3b8;">${u.cliente}</span>
                    </div>
                    <div>
                        <span style="color: #fca5a5; font-weight:bold;">${new Date(u.prazo_entrega).toLocaleDateString()}</span>
                        <span class="badge" style="margin-left:0.5rem; background:#334155; font-size:0.7rem;">${u.status}</span>
                    </div>
                </div>
            `).join('');
        }

        // Render Summary Sidebar
        const summaryDiv = document.getElementById('summaryList');
        if (summaryDiv) {
            // Helper to format summary values: "10 (5 pedidos)" - SWAPPED
            const formatSummaryVal = (obj) => {
                if (typeof obj === 'object' && obj !== null) {
                    return `<span style="font-weight:bold; color:#fff;">${obj.total_items}</span> <span style="font-size:0.85em; opacity:0.75; color:#cbd5e1;">(${obj.count} pedidos)</span>`;
                }
                return `<span style="font-weight:bold; color:#fff;">${obj || 0}</span>`;
            };

            let sectorsHtml = '';
            if (data.setores_producao && Array.isArray(data.setores_producao)) {
                sectorsHtml = '<div style="margin-top:1rem; border-top:1px solid #6d28d9; padding-top:0.5rem;"><div style="font-size:0.8rem; text-transform:uppercase; color:#a78bfa; margin-bottom:0.5rem;">Aguardando Impressão:</div>';
                data.setores_producao.forEach(s => {
                    const sectorName = s.setor_destino || 'Outros';
                    // s has .count and .total_items directly from query
                    const valHtml = `<span style="font-weight:bold; color:#fff;">${s.total_items}</span> <span style="font-size:0.85em; opacity:0.75; color:#cbd5e1;">(${s.count} pedidos)</span>`;

                    sectorsHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:0.2rem; font-size:0.95rem;">
                        <span style="color:#cbd5e1;">${sectorName}</span> 
                        <div>${valHtml}</div>
                    </div>`;
                });
                sectorsHtml += '</div>';
            }

            summaryDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:0.2rem;"><span>Desembale:</span> <div>${formatSummaryVal(data.desembale)}</div></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:0.2rem;"><span>Embale:</span> <div>${formatSummaryVal(data.embale)}</div></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:0.2rem;"><span>Logística:</span> <div>${formatSummaryVal(data.logistica)}</div></div>
                ${sectorsHtml}
            `;
        }

        // Render Chart
        if (data.production_history) {
            renderProductionChart(data.production_history);
        }

    } catch (e) {
        console.error("Live Fetch Error", e);
    }
}

// --- HISTORY MODE ---
function loadHistoryDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const container = document.getElementById('dashContent');
    container.innerHTML = `
        <div style="background: #fff; padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border);">
            <h3><i class="ph-file-text"></i> Relatórios de Produção</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">
                Métricas calculadas apenas sobre pedidos <strong>FINALIZADOS</strong>.
            </p>

            <div class="filter-bar" style="margin: 1.5rem 0; display:flex; gap: 1rem; align-items:flex-end; flex-wrap:wrap;">
                <div class="form-group">
                    <label>Início</label>
                    <input type="date" id="histStart" class="form-control" value="${today}">
                </div>
                <div class="form-group">
                    <label>Fim</label>
                    <input type="date" id="histEnd" class="form-control" value="${today}">
                </div>
                <div class="form-group" style="min-width: 150px;">
                    <label>Setor</label>
                    <select id="histSector" class="form-control">
                        <option value="all">Todos</option>
                        <option value="ARTE_FINAL">Arte Final</option>
                        <option value="SEPARACAO">Separação</option>
                        <option value="DESEMBALE">Desembale</option>
                        <option value="IMPRESSAO_DIGITAL">Impressão Digital</option>
                        <option value="IMPRESSAO_LASER">Impressão Laser</option>
                        <option value="SILK_PLANO">Silk Plano</option>
                        <option value="SILK_CILINDRICA">Silk Cilíndrica</option>
                        <option value="TAMPOGRAFIA">Tampografia</option>
                        <option value="ESTAMPARIA">Estamparia</option>
                        <option value="EMBALE">Embale</option>
                        <option value="LOGISTICA">Logística</option>
                    </select>
                </div>
                <div class="form-group" style="min-width: 150px;">
                    <label>Colaborador</label>
                    <select id="histUser" class="form-control">
                        <option value="all">Todos</option>
                        <!-- Povoar dinamicamente se der -->
                    </select>
                </div>
                <button class="btn" onclick="runHistoryReport()">
                    <i class="ph-magnifying-glass"></i> Gerar Relatório
                </button>
            </div>

            <div id="reportResults" style="margin-top: 2rem;">
                <div style="text-align:center; color: var(--text-secondary); padding: 2rem;">
                    Selecione os filtros e clique em "Gerar Relatório".
                </div>
            </div>
        </div>
    `;

    // Populate Users
    loadCollaboratorsForFilter();
}

async function loadCollaboratorsForFilter() {
    try {
        const res = await fetch('/api/collaborators');
        const users = await res.json();
        const select = document.getElementById('histUser');
        if (!select) return;

        // Keep "Todos" and append others
        select.innerHTML = '<option value="all">Todos</option>';

        users.forEach(u => {
            if (u.ativo) { // Optional: Filter only active? Or all for history? Better all for history.
                const option = document.createElement('option');
                option.value = u.id; // Or name? Backend expects 'user' param. 
                // Wait, backend dashboard.js query uses 'u.nome' or 'u.id'?
                // Let's check backend dashboard.js. 
                // Query: "const { start, end, sector, user } = req.query;"
                // It doesn't use 'user' in the SQL yet! 
                // Verify backend logic in next step. For now assume ID or Name. 
                // The query in dashboard.js step 860 schema was:
                // ... GROUP BY u.nome, ep.setor
                // It returns "operador".
                // We likely need to filter by ID in the WHERE clause if user is selected.

                // Let's rely on name for now as the report Groups by Name. 
                // Actually, passing ID is safer.
                option.value = u.nome;
                option.innerText = u.nome;
                select.appendChild(option);
            }
        });
    } catch (e) {
        console.error("Error loading collaborators for filter", e);
    }
}

async function runHistoryReport() {
    const start = document.getElementById('histStart').value;
    const end = document.getElementById('histEnd').value;
    const sector = document.getElementById('histSector').value;
    const user = document.getElementById('histUser').value;

    const div = document.getElementById('reportResults');
    div.innerHTML = '<div style="text-align:center;"><i class="ph-spinner ph-spin"></i> Processando...</div>';

    try {
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/dashboard/history?start=${start}&end=${end}&sector=${sector}&user=${user}&_t=${timestamp}`);
        const data = await res.json();

        if (data.length === 0) {
            div.innerHTML = '<div class="alert alert-warning">Nenhum dado encontrado para os filtros selecionados (Lembre-se: Apenas pedidos FINALIZADOS).</div>';
            return;
        }

        // Render Cards (Colaborador / Setor)
        let html = `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">`;

        // Helper to format sector name
        const formatSectorName = (s) => {
            if (!s) return 'Setor Desconhecido';
            return s.toLowerCase()
                .split('_')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
        };

        data.forEach(r => {
            html += `
                <div class="card" style="text-align: center;">
                    <h4 style="margin-bottom:0.5rem; color: var(--primary);">${r.operador}</h4>
                    <span class="badge" style="margin-bottom:1rem;">${formatSectorName(r.setor)}</span>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; text-align:left; font-size:0.9rem;">
                        <div>Pedidos: <strong>${r.pedidos_concluidos}</strong></div>
                        <div>Itens: <strong>${r.itens_concluidos}</strong></div>
                        <div>Peças: <strong>${r.total_pecas}</strong></div>
                        <div>Tempo Total: <strong>${r.tempo_total_h}h</strong></div>
                        <div style="grid-column: span 2; border-top: 1px solid #e2e8f0; margin-top:0.2rem; padding-top:0.2rem;">
                            Média/Item: <strong>${r.tempo_medio_item_min} min</strong>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;

        // Load Finished Orders List for details
        html += `<hr style="margin: 2rem 0;"><h3>Pedidos Finalizados no Período</h3><div id="finishedOrdersList">Carregando lista...</div>`;
        div.innerHTML = html;

        // Fetch Orders List
        await loadFinishedOrdersList(start, end);

    } catch (e) {
        div.innerHTML = `<div class="alert alert-danger">Erro: ${e.message}</div>`;
    }
}

async function loadFinishedOrdersList(start, end) {
    const div = document.getElementById('finishedOrdersList');
    try {
        const res = await fetch(`/api/dashboard/history/orders?start=${start}&end=${end}`);
        if (!res.ok) throw new Error("Erro na API");
        const orders = await res.json();

        if (orders.length === 0) {
            div.innerHTML = '<p class="text-muted">Nenhum pedido finalizado neste período.</p>';
            return;
        }

        let html = `
            <table class="table table-hover" style="width:100%; font-size:0.9rem;">
                <thead>
                    <tr>
                        <th>Pedido</th>
                        <th>Cliente</th>
                        <th>Entrega</th>
                        <th>Tipo Envio</th>
                        <th>Ação</th>
                    </tr>
                </thead>
                <tbody>
        `;
        orders.forEach(o => {
            html += `
                <tr>
                    <td><strong>#${o.numero_pedido}</strong></td>
                    <td>${o.cliente}</td>
                    <td>${new Date(o.prazo_entrega).toLocaleDateString()}</td>
                    <td>${o.tipo_envio}</td>
                    <td><button class="btn btn-sm" onclick="openOrderTimeline(${o.id})">Ver Detalhes</button></td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        div.innerHTML = html;

    } catch (e) {
        console.error(e);
        div.innerHTML = `<div class="alert alert-danger">Erro ao carregar lista de pedidos: ${e.message}</div>`;
    }
}

async function openOrderTimeline(orderId) {
    // Modal with Step-by-Step details
    // We already have generic modals, let's make a specific one or lightbox
    injectLightbox();
    const box = document.getElementById('lightbox');
    const content = document.getElementById('lightboxContent');
    content.innerHTML = '<i class="ph-spinner ph-spin"></i> Carregando Timeline...';
    box.classList.add('show');

    try {
        const res = await fetch(`/api/dashboard/history/${orderId}`);
        const data = await res.json(); // { order, items, events, logs }

        let html = `
            <h2 style="margin-top:0;">Timeline Pedido #${data.order.numero_pedido}</h2>
            <p><strong>Cliente:</strong> ${data.order.cliente}</p>
            <div class="timeline-container" style="margin-top: 2rem; max-height: 70vh; overflow-y: auto;">
        `;

        // Combine events and logs? Or just list phases?
        // Let's list by Event Timestamp

        // Merge Events (timers) and Logs (status change)
        const timeline = [];
        data.events.forEach(e => timeline.push({ type: 'event', ts: e.timestamp, data: e }));
        data.logs.forEach(l => timeline.push({ type: 'log', ts: l.data_alteracao, data: l }));

        // Sort
        timeline.sort((a, b) => new Date(a.ts) - new Date(b.ts));

        timeline.forEach(t => {
            const date = new Date(t.ts).toLocaleString();
            if (t.type === 'event') {
                html += `
                    <div class="timeline-item" style="border-left: 2px solid var(--primary); padding-left: 1rem; margin-bottom: 1rem;">
                        <small style="color:var(--text-secondary)">${date}</small>
                        <div style="font-weight:bold;">${t.data.setor} - ${t.data.acao}</div>
                        <div>Operador: ${t.data.operador_nome || '?'} (Qtd: ${t.data.quantidade_produzida || '-'})</div>
                    </div>
                 `;
            } else {
                html += `
                    <div class="timeline-item" style="border-left: 2px solid var(--accent); padding-left: 1rem; margin-bottom: 1rem;">
                        <small style="color:var(--text-secondary)">${date}</small>
                        <div style="font-weight:bold;">STATUS: ${t.data.novo_status}</div>
                        <div>Alterado por: ${t.data.usuario_nome || 'Sistema'}</div>
                    </div>
                 `;
            }
        });

        html += `</div>`;
        html += `<button class="btn" style="margin-top:1rem;" onclick="document.getElementById('lightbox').classList.remove('show')">Fechar</button>`;
        content.innerHTML = html;

    } catch (e) {
        content.innerHTML = 'Erro ao carregar detalhes.';
    }
}
// --- CHART RENDERER ---
let productionChartInstance = null;

function renderProductionChart(historyData) {
    const ctx = document.getElementById('productionChart');
    if (!ctx) return;

    // Process Data: Ensure last 7 days are represented
    const labels = [];
    const dataPoints = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        // Format YYYY-MM-DD to match DB
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Label DD/MM
        const dayLabel = `${day}/${month}`;
        labels.push(dayLabel);

        const record = historyData.find(h => h.data === dateStr);
        dataPoints.push(record ? record.total : 0);
    }

    if (productionChartInstance) {
        productionChartInstance.data.labels = labels;
        productionChartInstance.data.datasets[0].data = dataPoints;
        productionChartInstance.update();
    } else {
        productionChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pedidos Finalizados',
                    data: dataPoints,
                    fill: false, // No area fill
                    borderColor: '#a78bfa', // Lighter Violet for better contrast on black
                    backgroundColor: '#a78bfa',
                    tension: 0.3, // Slightly less curve
                    pointBackgroundColor: '#000000', // Black center
                    pointBorderColor: '#a78bfa', // Violet border
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    borderWidth: 3
                }]
            },
            plugins: [{
                id: 'customLabels',
                afterDatasetsDraw: (chart) => {
                    const ctx = chart.ctx;
                    ctx.save();
                    ctx.font = "bold 12px 'Inter', sans-serif";
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';

                    chart.data.datasets.forEach((dataset, i) => {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((element, index) => {
                            const data = dataset.data[index];
                            // Draw label above point
                            ctx.fillStyle = '#ffffff';
                            ctx.fillText(data, element.x, element.y - 10);
                        });
                    });
                    ctx.restore();
                }
            }],
            options: {
                layout: {
                    padding: {
                        top: 25, // Space for labels
                        right: 10,
                        left: 10,
                        bottom: 0
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Hide legend (cleaner)
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#1e293b',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#4c1d95',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: '#334155',
                            drawBorder: false,
                            tickLength: 10
                        },
                        ticks: {
                            color: '#cbd5e1',
                            font: { size: 11 }
                        },
                        border: { display: false }
                    },
                    y: {
                        display: false, // Hide Y Axis labels/grid like the reference? 
                        // Reference has Y numbers but user said "algo nesse formato" and usually simple charts hide Y if labels are on points.
                        // I'll keep strict grid but maybe hide numbers if labels are present?
                        // Let's keep it clean: Hide Y axis since we have point labels.
                        min: 0,
                        grid: { display: false }
                    }
                }
            }
        });
    }
}
