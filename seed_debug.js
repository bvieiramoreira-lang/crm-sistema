const db = require('./server/database');

console.log('Seeding data...');

db.serialize(() => {
    // 1. Create Order
    db.run("INSERT INTO pedidos (cliente, numero_pedido, prazo_entrega) VALUES (?, ?, ?)",
        ['Test Client', 'DEBUG-001', '2026-01-30']);

    // 2. Create Item
    db.run(`INSERT INTO itens_pedido (pedido_id, produto, quantidade, status_atual, arte_status, setor_destino) 
            VALUES (1, 'Camisa Teste', 10, 'AGUARDANDO_SEPARACAO', 'APROVADO', 'SILK_PLANO')`, (err) => {
        if (err) console.error(err);
        else console.log("Item inserted in AGUARDANDO_SEPARACAO");
    });
});

setTimeout(() => {
    console.log('Seed Done');
    process.exit(0);
}, 1000);
