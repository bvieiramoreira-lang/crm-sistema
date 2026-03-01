const http = require('http');

const payload = JSON.stringify({
    cliente: "TESTE REF AUTOMATICO",
    numero_pedido: "REF-" + Date.now(),
    prazo_entrega: "2024-12-31",
    tipo_envio: "RETIRADA",
    itens: [
        { produto: "Produto Com Ref", quantidade: 10, referencia: "REF-XYZ-123" },
        { produto: "Produto Sem Ref", quantidade: 5 }
    ]
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/orders',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log("Create Order Response:", data);
        const json = JSON.parse(data);
        if (json.id) {
            checkOrder(json.id);
        }
    });
});

req.write(payload);
req.end();

function checkOrder(id) {
    http.get(`http://localhost:3000/api/orders/${id}`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            const order = JSON.parse(data);
            console.log("\n--- Verification Results ---");
            console.log("Order ID:", order.id);
            order.itens.forEach(item => {
                console.log(`Product: ${item.produto}, Ref: '${item.referencia || 'NULL'}', Qtd: ${item.quantidade}`);
            });

            const hasRef = order.itens.find(i => i.produto === "Produto Com Ref").referencia === "REF-XYZ-123";
            const noRef = !order.itens.find(i => i.produto === "Produto Sem Ref").referencia;

            if (hasRef && noRef) {
                console.log("\n[SUCCESS] Reference field persisted correctly.");
            } else {
                console.error("\n[FAIL] Reference persistence failed.");
            }
        });
    });
}
