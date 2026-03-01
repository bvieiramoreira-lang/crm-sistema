const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- Checking Pedidos Columns ---");
    db.all("PRAGMA table_info(pedidos)", (err, rows) => {
        if (err) console.error(err);
        else {
            console.log(rows.map(r => r.name).join(', '));
        }
    });

    console.log("--- Dumping Last Order ---");
    db.all("SELECT * FROM pedidos ORDER BY id DESC LIMIT 1", (err, rows) => {
        if (err) console.error(err);
        else console.log(rows);
    });
});

db.close();
