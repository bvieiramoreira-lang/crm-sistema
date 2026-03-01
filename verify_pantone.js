const http = require('http');
const db = require('./server/database');

function testUpdateArte(itemId, status, setor, cor, expectedStatus) {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            arte_status: status,
            setor_destino: setor,
            cor_impressao: cor
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api/production/item/${itemId}/arte`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === expectedStatus) {
                    console.log(`PASS: Update Arte (Cor: '${cor}') - Got ${res.statusCode}`);
                    resolve(true);
                } else {
                    console.error(`FAIL: Update Arte (Cor: '${cor}') - Expected ${expectedStatus}, got ${res.statusCode}. Body: ${body}`);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`FAIL: Request error: ${e.message}`);
            resolve(false);
        });

        req.write(data);
        req.end();
    });
}

function createOrder() {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            cliente: 'Teste Pantone',
            numero_pedido: '999',
            prazo_entrega: '2025-12-31',
            itens: [{ produto: 'Caneta', quantidade: 100 }]
        });

        const req = http.request({
            hostname: 'localhost', port: 3000, path: '/api/orders', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                const json = JSON.parse(body);
                // Get the item ID. Since we don't have item id in return, we fetch the order details
                resolve(json.id);
            });
        });
        req.write(data);
        req.end();
    });
}

function getItemId(orderId) {
    return new Promise((resolve) => {
        http.get(`http://localhost:3000/api/orders/${orderId}`, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                const json = JSON.parse(body);
                resolve(json.itens[0].id);
            });
        });
    });
}

async function verify() {
    console.log('Starting Pantone Verification...');

    // 1. Create Data
    const orderId = await createOrder();
    const itemId = await getItemId(orderId);
    console.log(`Created Test Order ${orderId}, Item ${itemId}`);

    // Test 1: Fail if missing color on APROVADO
    await testUpdateArte(itemId, 'APROVADO', 'SILK_PLANO', '', 400);

    // Test 2: Success with color
    await testUpdateArte(itemId, 'APROVADO', 'SILK_PLANO', 'Pantone 123 C', 200);

    // Test 3: Check DB
    db.get('SELECT cor_impressao FROM itens_pedido WHERE id = ?', [itemId], (err, row) => {
        if (err) console.error('DB Error:', err);
        else if (row && row.cor_impressao === 'Pantone 123 C') {
            console.log('PASS: DB check correct');
        } else {
            console.error('FAIL: DB check incorrect', row);
        }
    });
}

verify();
