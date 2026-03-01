const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body || '{}')));
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    try {
        console.log("Creating Order for Time Test...");
        const order = await request({
            hostname: 'localhost', port: 3000, path: '/api/orders', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            cliente: "Time Test Client",
            numero_pedido: "TIME-" + Date.now(),
            prazo_entrega: "2025-12-31",
            tipo_envio: "RETIRADA",
            itens: [{ produto: "Caneca Mágica", quantidade: 100, setor_destino: "SILK_CILINDRICA" }]
        });

        // We know the item ID is likely sequential, but let's assume it's valid.
        // In a real test we would fetch the order to get the Item ID.
        // For this existing DB state, let's fetch the order we just made.
        const orderId = order.id;
        const freshOrder = await request({ hostname: 'localhost', port: 3000, path: `/api/orders/${orderId}`, method: 'GET' });
        const itemId = freshOrder.itens[0].id;

        console.log(`Starting Production for Item ${itemId}...`);
        await request({
            hostname: 'localhost', port: 3000, path: '/api/production/evento', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            item_id: itemId, operador_id: 1, setor: "SILK_CILINDRICA", acao: "INICIO", quantidade_produzida: 0
        });

        console.log("Working (Waiting 2 seconds)...");
        await sleep(2000);

        console.log("Ending Production...");
        await request({
            hostname: 'localhost', port: 3000, path: '/api/production/evento', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            item_id: itemId, operador_id: 1, setor: "SILK_CILINDRICA", acao: "FIM", quantidade_produzida: 100
        });

        console.log("Fetching Report...");
        const today = new Date().toISOString().split('T')[0];
        const report = await request({
            hostname: 'localhost', port: 3000, path: `/api/reports/productivity?start=${today}&end=${today}`, method: 'GET'
        });

        console.log("Report Data:", JSON.stringify(report, null, 2));

        const entry = report.find(r => r.setor === 'SILK_CILINDRICA' && r.total_produzido >= 100);
        if (entry && entry.media_pecas_hora > 0) {
            console.log("SUCCESS: Time tracking works! Items/Hour calculated.");
        } else {
            console.error("FAILURE: Time tracking metrics missing or incorrect.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
})();
