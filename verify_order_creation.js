const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

(async () => {
    try {
        const obsText = "Urgent handling required. Call client upon arrival.";
        console.log("Creating Order with Observation...");

        const createRes = await request({
            hostname: 'localhost', port: 3000, path: '/api/orders', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            cliente: "Obs Client",
            numero_pedido: "OBS-" + Date.now(),
            prazo_entrega: "2025-10-10",
            tipo_envio: "CORREIOS",
            observacao: obsText,
            itens: [{ produto: "Book", quantidade: 1, setor_destino: "SILK_PLANO" }]
        });

        if (createRes.status !== 200) {
            console.error("Failed to create order:", createRes.body);
            return;
        }

        const orderId = createRes.body.id;
        console.log(`Order Created: ID ${orderId}`);

        console.log("Fetching Order Details...");
        const getRes = await request({
            hostname: 'localhost', port: 3000, path: `/api/orders/${orderId}`, method: 'GET'
        });

        const order = getRes.body;
        console.log("Fetched Observation:", order.observacao);

        if (order.observacao === obsText) {
            console.log("SUCCESS: Observation saved and retrieved correctly.");
        } else {
            console.error("FAILURE: Observation mismatch.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
})();
