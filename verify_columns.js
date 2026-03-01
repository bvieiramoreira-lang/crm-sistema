const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'server', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(itens_pedido)", (err, rows) => {
    if (err) console.error(err);
    else {
        console.log("Columns in itens_pedido:");
        rows.forEach(r => console.log(r.name, r.type));
    }
    db.close();
});
