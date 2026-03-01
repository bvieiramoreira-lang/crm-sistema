const db = require('./server/database');

const query = `
    SELECT id, setor_destino, status_atual, pedido_id
    FROM itens_pedido 
    WHERE setor_destino = 'SILK_CILINDRICA'
`;

db.all(query, [], (err, rows) => {
    if (err) console.error(err);
    console.log("--- ALL SILK CILINDRICA ITEMS ---");
    console.log(JSON.stringify(rows, null, 2));

    // Check Statuses specifically
    const counts = {};
    rows.forEach(r => {
        counts[r.status_atual] = (counts[r.status_atual] || 0) + 1;
    });
    console.log("\n--- COUNTS BY STATUS ---");
    console.log(JSON.stringify(counts, null, 2));
});
