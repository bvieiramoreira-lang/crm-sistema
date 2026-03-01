
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log("Forcing migration on:", dbPath);

db.serialize(() => {
    db.all("PRAGMA table_info(itens_pedido)", (err, rows) => {
        if (err) {
            console.error("Schema check error:", err);
            return;
        }
        console.log("Columns before:", rows.map(r => r.name).join(', '));

        if (!rows.some(r => r.name === 'dados_volumes')) {
            console.log("Adding column...");
            db.run("ALTER TABLE itens_pedido ADD COLUMN dados_volumes TEXT", (err) => {
                if (err) console.error("Add error:", err);
                else console.log("Added successfully.");
            });
        } else {
            console.log("Column exists.");
        }
    });
});

db.close();
