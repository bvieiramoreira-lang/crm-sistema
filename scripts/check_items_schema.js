const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log("Columns in itens_pedido:");
db.all("PRAGMA table_info(itens_pedido)", (err, rows) => {
    if (err) console.error(err);
    else require('fs').writeFileSync('schema_itens.json', JSON.stringify(rows, null, 2));
});
