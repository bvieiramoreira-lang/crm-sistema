
const http = require('http');

function get(path) {
    return new Promise((resolve, reject) => {
        http.get('http://localhost:3000' + path, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function test() {
    try {
        console.log("--- LASER QUEUE (Exec) ---");
        const laser = await get('/api/production/itens/IMPRESSAO_LASER');
        console.log(laser.map(i => ({ id: i.id, product: i.produto, status: i.status_atual })));

        console.log("\n--- EMBALE QUEUE (Future) ---");
        const embaleFuture = await get('/api/production/itens/AGUARDANDO_EMBALE?future=true');
        console.log(embaleFuture.map(i => ({ id: i.id, product: i.produto, status: i.status_atual, sector: i.setor_destino })));

    } catch (e) {
        console.error(e);
    }
}

test();
