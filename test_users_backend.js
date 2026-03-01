
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
    console.log("Testing User Sector Routes...");
    const sectors = ['ARTE', 'arte', 'SEPARACAO', 'separacao', 'DESEMBALE', 'desembale', 'IMPRESSAO', 'impressao', 'EMBALE', 'embale', 'LOGISTICA', 'logistica'];

    for (const sector of sectors) {
        try {
            const res = await request(`/api/users/sector/${sector}`);
            console.log(`[${sector}] Status: ${res.status}, Length: ${res.body.length} chars`);
            if (res.status !== 200) console.error(`ERROR body: ${res.body}`);
        } catch (e) {
            console.error(`[${sector}] Failed:`, e.message);
        }
    }
}

test();
