const db = require('./server/database');

const query = `
    SELECT setor_destino, status_atual, COUNT(*) as count 
    FROM itens_pedido 
    GROUP BY setor_destino, status_atual
    ORDER BY setor_destino
`;

db.all(query, [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("--- FULL DB BREAKDOWN ---");
    console.log(JSON.stringify(rows, null, 2));
});
