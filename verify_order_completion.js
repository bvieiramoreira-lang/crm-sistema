const fetch = require('node-fetch');
const http = require('http');

function request(method, path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: body });
                }
            });
        });
        req.on('error', (e) => reject(e));
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTest() {
    console.log("--- Verifying Order Completion Flow ---");
    const timestamp = Date.now();

    // 1. Create Order
    const orderRes = await request('POST', '/api/orders', {
        cliente: `Test Finish ${timestamp}`,
        numero_pedido: `FINISH-${timestamp}`,
        prazo_entrega: new Date().toISOString(),
        tipo_envio: 'RETIRADA',
        itens: [{ produto: 'Test Finish Item', quantidade: 5 }]
    });
    const orderId = orderRes.body.id;
    console.log(`Order Created: ${orderId}`);

    // Get Item ID
    const detailsRes = await request('GET', `/api/orders/${orderId}`);
    const itemId = detailsRes.body.itens[0].id;

    // 2. Fast-forward to Logistica (Skip intermediary steps for test speed, using direct status update)
    // Actually, force Logic: Embale -> Logistica -> Concluido

    // Set to AGUARDANDO_ENVIO directly (simulating Embale done)
    await request('PUT', `/api/production/item/${itemId}/status`, { novo_status_item: 'AGUARDANDO_ENVIO' });
    console.log("Item status set to AGUARDANDO_ENVIO");

    // 3. Dispatch (Move to CONCLUIDO) - This triggers the TRAP in production.js
    console.log("Dispatching Item (Setting CONCLUIDO)...");
    const dispatchRes = await request('PUT', `/api/production/item/${itemId}/status`, {
        novo_status_item: 'CONCLUIDO',
        operador_id: 999
    });
    console.log("Dispatch Response:", dispatchRes.body);

    // Wait for async DB update (if any)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Verify Order Status in DB
    const finalOrderRes = await request('GET', `/api/orders/${orderId}`);
    const finalOrder = finalOrderRes.body;

    console.log(`Final Order Status (calculated/returned): ${finalOrder.status_oficial}`);
    console.log(`Final Order DB Status: ${finalOrder.status_geral}`); // If the GET returns it. It does (SELECT *).
    console.log(`Finalizado Em: ${finalOrder.finalizado_em}`);

    if (finalOrder.status_oficial === 'FINALIZADO') {
        if (finalOrder.finalizado_em) {
            console.log("SUCCESS: Order is marked FINALIZADO and has timestamp.");
        } else {
            console.log("PARTIAL SUCCESS: Order FINALIZED but no timestamp? (Check logic)");
        }
    } else {
        console.error("FAILURE: Order status is NOT FINALIZADO.");
    }
}

runTest();
