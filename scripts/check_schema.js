const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(pedidos)", (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
});
