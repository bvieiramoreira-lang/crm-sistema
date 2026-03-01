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
    console.log("--- Verifying Volume Persistence (Flex Case) ---");
    const timestamp = Date.now();
    const orderRes = await request('POST', '/api/orders', {
        cliente: `Test Persistence ${timestamp}`,
        numero_pedido: `PERSIST-${timestamp}`,
        prazo_entrega: new Date().toISOString(),
        tipo_envio: 'TRANSPORTADORA',
        itens: [{ produto: 'Test Item', quantidade: 10 }]
    });

    const orderId = orderRes.body.id;
    const itemId = (await request('GET', `/api/orders/${orderId}`)).body.itens[0].id;
    console.log("Item ID:", itemId);

    const volumesPayload = [
        { numero_volume: 1, peso_kg: 5.5, altura_cm: 10, largura_cm: 20, comprimento_cm: 30 },
        { numero_volume: 2, peso_kg: 2.0, altura_cm: 5, largura_cm: 5, comprimento_cm: 5 }
    ];

    const embalePayload = {
        quantidade_volumes: 2,
        peso: 7.5,
        altura: 10, largura: 20, comprimento: 30,
        dados_volumes: JSON.stringify(volumesPayload)
    };

    await request('PUT', `/api/production/item/${itemId}/embale`, embalePayload);

    const verifyRes = await request('GET', `/api/orders/${orderId}`);
    const item = verifyRes.body.itens[0];

    console.log("Dados Volumes (Raw):", item.dados_volumes);

    let parsed = [];
    try { parsed = JSON.parse(item.dados_volumes); } catch (e) { }

    if (parsed.length !== 2) {
        console.error("FAILURE: Count mismatch.");
        return;
    }

    // Check Values (Case Insensitive Key Check)
    const vol1 = parsed[0];
    const weight = vol1.peso_kg || vol1.PESO_KG || 0;

    if (weight === 5.5) {
        console.log("SUCCESS: Data matched (Weight 5.5 found).");
    } else {
        console.error("FAILURE: Weight mismatch.", vol1);
    }
}

runTest();
