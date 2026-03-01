
// --- NEW ORDER MODAL MODULE ---

function injectNewOrderModal() {
    if (document.getElementById('newOrderModal')) return;

    const modalHtml = `
    <div id="newOrderModal" class="modal">
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>Novo Pedido</h2>
                <span class="close" onclick="closeNewOrderModal()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="newOrderForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Cliente</label>
                            <input type="text" id="orderClient" required>
                        </div>
                        <div class="form-group">
                            <label>Nº Pedido</label>
                            <input type="text" id="orderNumber" required>
                        </div>
                    </div>
                    <div class="form-row">
                         <div class="form-group">
                            <label>Prazo Entrega</label>
                            <input type="date" id="orderDate" required>
                        </div>
                   </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Tipo de Envio</label>
                            <select id="orderShippingType">
                                <option value="Retirada">Retirada</option>
                                <option value="Transportadora">Transportadora</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Transportadora (Opcional)</label>
                            <input type="text" id="orderCarrier">
                        </div>
                    </div>

                    <hr>
                    <h3>Itens do Pedido</h3>
                    
                    <div class="form-row" style="align-items: flex-end; background: #f8fafc; padding: 1rem; border-radius: 6px;">
                        <div class="form-group" style="flex: 2;">
                            <label>Produto</label>
                            <input type="text" id="itemProduct" placeholder="Ex: Copo Long Drink">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Referência</label>
                            <input type="text" id="itemRef" placeholder="Ex: REF-001">
                        </div>
                         <div class="form-group" style="width: 100px;">
                            <label>Qtd</label>
                            <input type="number" id="itemQty" placeholder="0">
                        </div>
                        <div class="form-group">
                            <button type="button" class="btn btn-secondary" onclick="addItemToOrder()">Adicionar</button>
                        </div>
                    </div>

                    <div style="max-height: 200px; overflow-y: auto; margin-top: 1rem;">
                        <table class="table" style="width:100%">
                            <thead>
                                <tr>
                                    <th>Produto</th>
                                    <th>Ref</th>
                                    <th>Qtd</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody id="orderItemsTable">
                            </tbody>
                        </table>
                    </div>

                    <div class="form-group" style="margin-top: 1rem;">
                        <label>Observações Gerais</label>
                        <textarea id="orderObs" rows="3"></textarea>
                    </div>

                    <div style="margin-top: 1.5rem; text-align: right;">
                        <button type="button" class="btn btn-secondary" onclick="closeNewOrderModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar Pedido</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Attach Submit Handler
    document.getElementById('newOrderForm').addEventListener('submit', handleOrderSubmit);
}

function openNewOrderModal() {
    injectNewOrderModal();
    // Reset Form
    document.getElementById('newOrderForm').reset();
    document.getElementById('orderItemsTable').innerHTML = '';
    window.currentOrderItems = [];

    const modal = document.getElementById('newOrderModal');
    modal.style.display = 'block';
}

function closeNewOrderModal() {
    const modal = document.getElementById('newOrderModal');
    if (modal) modal.style.display = 'none';
}

function addItemToOrder() {
    const prod = document.getElementById('itemProduct').value;
    const ref = document.getElementById('itemRef').value;
    const qty = document.getElementById('itemQty').value;

    if (!prod || !qty) {
        alert('Preencha Produto e Quantidade');
        return;
    }

    if (!window.currentOrderItems) window.currentOrderItems = [];

    window.currentOrderItems.push({
        produto: prod,
        referencia: ref,
        quantidade: parseInt(qty)
    });

    renderOrderItemsMock();

    // Clear inputs
    document.getElementById('itemProduct').value = '';
    document.getElementById('itemRef').value = '';
    document.getElementById('itemQty').value = '';
    document.getElementById('itemProduct').focus();
}

function renderOrderItemsMock() {
    const tbody = document.getElementById('orderItemsTable');
    tbody.innerHTML = '';
    window.currentOrderItems.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${item.produto}</td>
                <td>${item.referencia || '-'}</td>
                <td>${item.quantidade}</td>
                <td><button type="button" class="btn btn-danger btn-sm" onclick="removeMockItem(${index})"><i class="ph-trash"></i></button></td>
            </tr>
        `;
    });
}

function removeMockItem(index) {
    window.currentOrderItems.splice(index, 1);
    renderOrderItemsMock();
}

async function handleOrderSubmit(e) {
    e.preventDefault();
    if (!window.currentOrderItems || window.currentOrderItems.length === 0) {
        alert("Adicione pelo menos um item.");
        return;
    }

    const payload = {
        cliente: document.getElementById('orderClient').value,
        numero_pedido: document.getElementById('orderNumber').value,
        prazo_entrega: document.getElementById('orderDate').value,
        tipo_envio: document.getElementById('orderShippingType').value,
        transportadora: document.getElementById('orderCarrier').value,
        observacao: document.getElementById('orderObs').value,
        itens: window.currentOrderItems
    };

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.id) {
            alert('Pedido criado com sucesso!');
            closeNewOrderModal();
            if (window.loadOrders) window.loadOrders();
        } else {
            alert('Erro: ' + (data.error || data.message));
        }
    } catch (err) {
        console.error(err);
        alert('Erro de conexão ao salvar pedido.');
    }
}
