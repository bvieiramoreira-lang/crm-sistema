
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log("Migrating: Adding observacao_arte to itens_pedido...");

db.serialize(() => {
    db.run("ALTER TABLE itens_pedido ADD COLUMN observacao_arte TEXT", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log("Column 'observacao_arte' already exists.");
            } else {
                console.error("Error adding column:", err.message);
            }
        } else {
            console.log("Column 'observacao_arte' added successfully.");
        }
    });
});

db.close();
