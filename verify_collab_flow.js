
const fetch = require('node-fetch'); // Assuming node-fetch is available or using built-in in Node 18+
// If node-fetch not available, use http/https modules or assume we run this in an environment that has it.
// Since we are in Node environment, let's use a simple http helper or just rely on the fact that we can use 'curl' via run_command if needed.
// actually, let's use a node script using http.

const http = require('http');

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function verify() {
    console.log("--- Starting Collaborator Verification ---");

    // 1. Create User
    console.log("1. Creating User 'Lucas_Test'...");
    const userRes = await request('POST', '/api/users', {
        nome: 'Lucas Test',
        username: 'lucastest',
        senha: '123',
        perfil: 'arte',
        setores_secundarios: ''
    });
    console.log("Create User:", userRes.body);
    const userId = userRes.body.id || (userRes.body.message === 'Usuário já existe' ? 'EXISTING' : null);

    // 2. Assign Item
    console.log("2. Assigning Item to Lucas Test...");
    // Need an item ID. Let's assume item 1 exists or fetch one.
    const itemsRes = await request('GET', '/api/production/itens/ARTE');
    let itemId = 1;
    if (itemsRes.body && itemsRes.body.length > 0) itemId = itemsRes.body[0].id;

    const assignRes = await request('PUT', `/api/production/item/${itemId}/assign`, {
        sector: 'arte',
        responsavel: 'Lucas Test'
    });
    console.log("Assign Result:", assignRes.body);

    // 3. Mark as Approved (Complete Stage)
    console.log("3. Completing Arte Stage...");
    const updateRes = await request('PUT', `/api/production/item/${itemId}/arte`, {
        arte_status: 'APROVADO',
        setor_destino: 'SILK_PLANO',
        cor_impressao: 'VERDE',
        observacao_arte: 'TESTE AUTOMATICO'
    });
    console.log("Update Result:", updateRes.body);

    // 4. Check Report
    console.log("4. Checking Report...");
    const today = new Date().toISOString().split('T')[0];
    const reportRes = await request('GET', `/api/reports/users/productivity?start=${today}&end=${today}`);

    const stats = reportRes.body;
    console.log("Report Data:", JSON.stringify(stats, null, 2));

    const fs = require('fs');
    const logData = `
    Assign Result: ${JSON.stringify(assignRes.body)}
    Update Result: ${JSON.stringify(updateRes.body)}
    Report Data: ${JSON.stringify(stats, null, 2)}
    `;
    fs.writeFileSync('debug_output.txt', logData);

    const lucasStats = stats.find(s => s.name === 'Lucas Test');
    if (lucasStats && lucasStats.itemsAssigned > 0) {
        console.log("SUCCESS: Lucas Test found in report with assigned items.");
    } else {
        console.error("FAIL: Lucas Test NOT found or no items assigned.");
    }
}

verify();
