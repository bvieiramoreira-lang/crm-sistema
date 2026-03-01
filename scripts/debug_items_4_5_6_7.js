const db = require('../server/database');

console.log("=== DEBUG: Items 4, 5, 6, 7 ===");

db.all(`SELECT * FROM itens_pedido WHERE id IN (4, 5, 6, 7)`, [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(JSON.stringify(rows, null, 2));
    }
});
