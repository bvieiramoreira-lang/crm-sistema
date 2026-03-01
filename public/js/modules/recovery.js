
// --- RECOVERY MODULE (Restoring functionality lost in previous updates) ---

// 1. EDIT ORDER MODAL
function injectEditOrderModal() {
    if (document.getElementById('editOrderModal')) return;
    const html = `
    <div id="editOrderModal" class="modal">
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h2>Detalhes do Pedido <span id="editOrderTitleId"></span></h2>
                <span class="close" onclick="closeEditOrderModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div id="editOrderLoading">Carregando...</div>
                <div id="editOrderContent" style="display:none;">
                    <!-- Status Warning -->
                    <div id="editOrderStatusBanner" style="padding: 1rem; margin-bottom: 1rem; border-radius: 6px; font-weight: bold; text-align: center;"></div>
                    
                    <form id="editOrderForm">
                        <input type="hidden" id="editOrderId">
                    <div class="form-grid-2">
                            <div class="form-group"><label>Cliente</label><input type="text" id="editClient" class="form-control"></div>
                            <div class="form-group"><label>Nº Pedido</label><input type="text" id="editNumber" class="form-control"></div>
                        </div>
                        <div class="form-grid-2">
                            <div class="form-group"><label>Prazo</label><input type="date" id="editDate" class="form-control"></div>
                            <div class="form-group"><label>Tipo Envio</label>
                                <select id="editShipping" class="form-control"><option value="Retirada">Retirada</option><option value="Transportadora">Transportadora</option></select>
                            </div>
                        </div>
                        <div class="form-group"><label>Observação</label><textarea id="editObs" rows="2" class="form-control"></textarea></div>
                        
                        <hr>
                        <h3>Itens</h3>
                        <div id="editItemsList"></div>

                        <div style="margin-top: 1rem; text-align: right;">
                             <button type="button" class="btn btn-danger" onclick="deleteOrderAction()" style="float:left;">Excluir Pedido</button>
                             <button type="button" class="btn btn-secondary" onclick="closeEditOrderModal()">Fechar</button>
                             <button type="submit" class="btn btn-primary" id="btnSaveEdit">Salvar Alterações</button>
                        </div>
                    </form>
                    
                     <hr style="margin: 2rem 0;">
                    <h3>Histórico</h3>
                    <div id="editHistoryLog" style="max-height: 200px; overflow-y: auto; background: #f8fafc; padding: 1rem; border: 1px solid #ddd; font-size: 0.9rem;"></div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('editOrderForm').addEventListener('submit', handleEditSubmit);
}

async function openEditOrderModal(id) {
    injectEditOrderModal();
    const modal = document.getElementById('editOrderModal');
    const content = document.getElementById('editOrderContent');
    const loading = document.getElementById('editOrderLoading');

    modal.style.display = 'block';
    content.style.display = 'none';
    loading.style.display = 'block';

    try {
        const res = await fetch(`/api/orders/${id}`);
        const order = await res.json();

        document.getElementById('editOrderId').value = order.id;
        document.getElementById('editOrderTitleId').textContent = `#${order.numero_pedido}`;

        // Fill Fields
        document.getElementById('editClient').value = order.cliente;
        document.getElementById('editNumber').value = order.numero_pedido;
        if (order.prazo_entrega) document.getElementById('editDate').value = order.prazo_entrega.split('T')[0];
        document.getElementById('editShipping').value = order.tipo_envio;
        document.getElementById('editObs').value = order.observacao || '';

        // Items
        const itemsDiv = document.getElementById('editItemsList');
        itemsDiv.innerHTML = '<table class="table"><thead><tr><th>Produto</th><th>Qtd</th><th>Status</th><th>Setor</th></tr></thead><tbody>';

        let isRestricted = false;
        order.itens.forEach(item => {
            const row = `<tr>
                <td>${item.produto}</td>
                <td>${item.quantidade}</td>
                <td><span class="badge badge-blue">${item.status_atual}</span></td>
                <td>${item.setor_destino || '-'}</td>
            </tr>`;
            itemsDiv.innerHTML += row;

            if (['AGUARDANDO_PRODUCAO', 'EM_PRODUCAO', 'CONCLUIDO'].includes(item.status_atual)) isRestricted = true;
        });
        itemsDiv.innerHTML += '</tbody></table>';

        // History
        loadOrderHistory(id);

        // Permissions/Restriction
        const banner = document.getElementById('editOrderStatusBanner');
        const btnSave = document.getElementById('btnSaveEdit');
        const inputs = ['editClient', 'editNumber']; // Restricted fields

        if (isRestricted) {
            banner.textContent = "Pedido em Produção - Edição Limitada (Apenas Observação/Logística)";
            banner.style.background = '#fff3cd'; banner.style.color = '#856404';
            inputs.forEach(id => document.getElementById(id).disabled = true);
        } else {
            banner.textContent = "Edição Permitida";
            banner.style.background = '#d4edda'; banner.style.color = '#155724';
            inputs.forEach(id => document.getElementById(id).disabled = false);
        }

        loading.style.display = 'none';
        content.style.display = 'block';

    } catch (e) {
        alert("Erro ao carregar pedido: " + e.message);
        closeEditOrderModal();
    }
}

async function loadOrderHistory(id) {
    try {
        const res = await fetch(`/api/orders/${id}/history`);
        const logs = await res.json();
        const div = document.getElementById('editHistoryLog');
        div.innerHTML = '';
        if (logs.length === 0) div.innerHTML = '<p>Sem histórico.</p>';
        logs.forEach(log => {
            div.innerHTML += `<div style="margin-bottom:0.5rem; border-bottom:1px solid #eee; padding-bottom:0.5rem">
                <strong>${new Date(log.data_alteracao).toLocaleString()}</strong> - ${log.usuario_nome || 'Sistema'}<br>
                Alterou <em>${log.campo_alterado}</em>: ${log.valor_antigo} &rarr; ${log.valor_novo}
             </div>`;
        });
    } catch (e) { console.error(e); }
}

async function handleEditSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editOrderId').value;
    const payload = {
        cliente: document.getElementById('editClient').value,
        numero_pedido: document.getElementById('editNumber').value,
        prazo_entrega: document.getElementById('editDate').value,
        tipo_envio: document.getElementById('editShipping').value,
        observacao: document.getElementById('editObs').value,
        usuario_id: currentUser.id
    };

    try {
        const res = await fetch(`/api/orders/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.message) { alert('Salvo com sucesso!'); closeEditOrderModal(); loadOrders(); }
        else alert('Erro: ' + data.error);
    } catch (err) { alert('Erro ao salvar'); }
}

function closeEditOrderModal() { document.getElementById('editOrderModal').style.display = 'none'; }
async function deleteOrderAction() {
    if (!confirm("TEM CERTEZA? Isso apagará todo o histórico e itens.")) return;
    const id = document.getElementById('editOrderId').value;
    try {
        await fetch(`/api/orders/${id}`, { method: 'DELETE' });
        alert('Pedido excluído.'); closeEditOrderModal(); loadOrders();
    } catch (e) { alert('Erro ao excluir'); }
}


// 2. EMBALE MODAL
function injectEmbaleModal() {
    if (document.getElementById('embaleModal')) return;
    const html = `
    <div id="embaleModal" class="modal">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Confirmar Embale</h2>
                <span class="close" onclick="closeEmbaleModal()">&times;</span>
            </div>
            <div class="modal-body">
                <input type="hidden" id="embaleItemId">
                <div class="form-group">
                    <label>Quantidade de Volumes</label>
                    <input type="number" id="embaleQtd" value="1" min="1">
                </div>
                <div id="embaleDimsContainer">
                    <!-- Future: Dimensions inputs -->
                </div>
                <div style="margin-top: 1.5rem; text-align: right;">
                    <button class="btn btn-secondary" onclick="closeEmbaleModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="submitEmbale()">Confirmar Envio</button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function openEmbaleAction(itemId) {
    injectEmbaleModal();
    document.getElementById('embaleItemId').value = itemId;
    document.getElementById('embaleQtd').value = 1;
    document.getElementById('embaleModal').style.display = 'block';
}

function closeEmbaleModal() { document.getElementById('embaleModal').style.display = 'none'; }

async function submitEmbale() {
    const id = document.getElementById('embaleItemId').value;
    const qtd = document.getElementById('embaleQtd').value;

    try {
        // First update volumes if needed (Pending backend support, skipping for safety)
        // Now advance status
        await fetch(`/api/production/item/${id}/status`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novo_status_item: 'AGUARDANDO_ENVIO', operador_id: currentUser.id })
        });
        closeEmbaleModal();
        loadGenericQueue('AGUARDANDO_EMBALE', 'Embale'); // Refresh
        updateMenuCounts();
        alert('Item enviado para Logística!');
    } catch (e) { alert('Erro: ' + e.message); }
}
