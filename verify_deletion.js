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
        console.log("Creating Order to Delete...");
        const createRes = await request({
            hostname: 'localhost', port: 3000, path: '/api/orders', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            cliente: "To Be Deleted",
            numero_pedido: "DEL-" + Date.now(),
            prazo_entrega: "2099-12-31",
            tipo_envio: "RETIRADA",
            itens: [{ produto: "Lixo", quantidade: 1, setor_destino: "SILK_PLANO" }]
        });

        const orderId = createRes.body.id;
        console.log(`Order Created: ID ${orderId}`);

        console.log("Deleting Order...");
        const delRes = await request({
            hostname: 'localhost', port: 3000, path: `/api/orders/${orderId}`, method: 'DELETE'
        });

        if (delRes.status === 200) {
            console.log("Deletion Response OK:", delRes.body);

            // Verify 404
            const checkRes = await request({
                hostname: 'localhost', port: 3000, path: `/api/orders/${orderId}`, method: 'GET'
            });

            if (checkRes.status === 404) {
                console.log("SUCCESS: Order not found after deletion.");
            } else {
                console.error("FAILURE: Order still exists or query error.", checkRes.status);
            }

        } else {
            console.error("FAILURE: Deletion API returned error", delRes.status, delRes.body);
        }

    } catch (e) {
        console.error("Error:", e);
    }
})();
