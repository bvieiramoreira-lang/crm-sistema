
const http = require('http');

function request(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function test() {
    console.log("Testing Backend Routes...");

    const statuses = ['ARTE', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_SEPARACAO', 'EM_SEPARACAO', 'AGUARDANDO_IMPRESSAO', 'AGUARDANDO_DESEMBALE', 'EM_DESEMBALE', 'AGUARDANDO_EMBALE', 'AGUARDANDO_ENVIO'];

    for (const status of statuses) {
        try {
            const res = await request(`/api/production/itens/${status}`);
            console.log(`[${status}] Status: ${res.status}, Length: ${res.body.length} chars`);
            if (res.status !== 200) console.error(`ERROR body: ${res.body}`);
        } catch (e) {
            console.error(`[${status}] Failed:`, e.message);
        }
    }
}

test();
