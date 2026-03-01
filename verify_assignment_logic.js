
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
        console.log("Creating Order for Assignment Test...");
        const timestamp = Date.now();
        const order = await request({
            hostname: 'localhost', port: 3000, path: '/api/orders', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            cliente: "Assign Test Client",
            numero_pedido: "ASSIGN-" + timestamp,
            prazo_entrega: "2025-12-31",
            tipo_envio: "RETIRADA",
            itens: [{ produto: "Caneca Teste", quantidade: 10, setor_destino: "SILK_CILINDRICA" }]
        });

        const orderId = order.id;
        const freshOrder = await request({ hostname: 'localhost', port: 3000, path: `/api/orders/${orderId}`, method: 'GET' });
        const itemId = freshOrder.itens[0].id;

        console.log(`Item created with ID: ${itemId}`);

        // Test Assign Arte
        console.log("Assigning Responsibility (Arte)...");
        const respArte = "Designer 1";
        await request({
            hostname: 'localhost', port: 3000, path: `/api/production/item/${itemId}/assign`, method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        }, {
            sector: 'arte',
            responsavel: respArte
        });

        // Test Assign Separacao
        console.log("Assigning Responsibility (Separacao)...");
        const respSep = "Separator 1";
        await request({
            hostname: 'localhost', port: 3000, path: `/api/production/item/${itemId}/assign`, method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        }, {
            sector: 'separacao',
            responsavel: respSep
        });

        // Verify
        console.log("Verifying assignment in DB...");
        const item = await request({ hostname: 'localhost', port: 3000, path: `/api/production/item/${itemId}`, method: 'GET' });

        console.log(`Responsavel Arte: ${item.responsavel_arte}`);
        console.log(`Responsavel Separacao: ${item.responsavel_separacao}`);

        if (item.responsavel_arte && item.responsavel_arte.toUpperCase() === respArte.toUpperCase() &&
            item.responsavel_separacao && item.responsavel_separacao.toUpperCase() === respSep.toUpperCase()) {
            console.log("SUCCESS: Assignment logic works (Case Insensitive Match).");
        } else {
            console.error(`FAILURE: Assignment mismatch. Expected ${respArte}/${respSep}, Got ${item.responsavel_arte}/${item.responsavel_separacao}`);
        }

    } catch (e) {
        console.error("Error:", e);
    }
})();
