const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, dados_volumes FROM itens_pedido ORDER BY id DESC LIMIT 1", (err, rows) => {
    if (err) console.error(err);
    else {
        console.log("Latest Item Raw Data:");
        console.log("ID:", rows[0].id);
        console.log("Raw dados_volumes:", rows[0].dados_volumes);
    }
    db.close();
});
