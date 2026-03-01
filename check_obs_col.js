
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(itens_pedido)", (err, rows) => {
    if (err) console.error(err);
    else {
        const hasObs = rows.some(r => r.name === 'observacao_arte');
        console.log("Has observacao_arte:", hasObs);
    }
    db.close();
});
