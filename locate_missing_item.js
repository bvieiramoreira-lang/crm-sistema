const db = require('./server/database.js');

console.log("Searching for items...");
db.all("SELECT id, produto, status_atual, setor_destino FROM itens_pedido", [], (err, rows) => {
    if (err) console.error(err);
    else {
        console.table(rows);
    }
});
