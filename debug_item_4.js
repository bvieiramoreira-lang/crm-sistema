const db = require('./server/database');

db.get('SELECT * FROM itens_pedido WHERE id = 4', [], (err, row) => {
    if (err) {
        console.error(err);
        return;
    }
    if (!row) {
        console.log("Item 4 not found");
        return;
    }

    // Print each key explicitly to detect undefined/null clearly
    console.log("=== ITEM 4 DEBUG ===");
    console.log(`ID: ${row.id}`);
    console.log(`Pedido ID: ${row.pedido_id}`);
    console.log(`Status Atual: >${row.status_atual}<`);
    console.log(`Setor Destino: >${row.setor_destino}<`); // Arrows to catch whitespace
    console.log(`Arte Status: ${row.arte_status}`);
    console.log("====================");
});
