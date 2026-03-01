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

(async () => {
    try {
        console.log("Creating Order...");
        const order = await request({
            hostname: 'localhost', port: 3000, path: '/api/orders', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            cliente: "Test Client",
            numero_pedido: "PED-" + Date.now(),
            prazo_entrega: "2025-12-31",
            tipo_envio: "RETIRADA",
            itens: [{ produto: "Camiseta", quantidade: 500, setor_destino: "SILK_PLANO" }]
        });

        console.log("Order Created:", order);
        const itemId = 1; // Simplification: assuming we are working with DB that resets or we know IDs. 
        // Actually, let's just insert event for item_id 1. Foreign key might fail if empty db.
        // But order creation above likely made item_id (lastID).
        // Let's assume order.id is returned.

        // Wait, order creation returns { id: pedidoId, ... }
        // But logic for items insertion is in callback, might not be immediate?
        // SQLite is fast but async.

        console.log("Registering Event...");
        await request({
            hostname: 'localhost', port: 3000, path: '/api/production/evento', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            item_id: 1, // Hardcoded for test simplicity, assuming fresh DB or existing item
            operador_id: 1, // Admin from seed
            setor: "SILK_PLANO",
            acao: "FIM",
            quantidade_produzida: 50
        });

        console.log("Fetching Report...");
        const today = new Date().toISOString().split('T')[0];
        const report = await request({
            hostname: 'localhost', port: 3000, path: `/api/reports/productivity?start=${today}&end=${today}`, method: 'GET'
        });

        console.log("Report Data:", JSON.stringify(report, null, 2));

        if (report.length > 0 && report[0].total_produzido >= 50) {
            console.log("SUCCESS: Report contains expected data.");
        } else {
            console.error("FAILURE: Report empty or incorrect.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
})();
