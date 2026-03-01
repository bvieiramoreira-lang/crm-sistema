
const db = require('../server/database');

// Check last updated items
// Note: data_alteracao is not in itens_pedido, so we use ID DESC as rough proxy or check history
const query = `
    SELECT id, status_atual, setor_destino, data_desembale
    FROM itens_pedido 
    ORDER BY id DESC 
    LIMIT 5
`;

db.all(query, [], (err, rows) => {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log("Last Items:", JSON.stringify(rows, null, 2));
    }
});
