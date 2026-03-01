const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Adding 'referencia' column to 'itens_pedido'...");
    db.run(`ALTER TABLE itens_pedido ADD COLUMN referencia TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log("Column 'referencia' already exists.");
            } else {
                console.error("Error adding column:", err.message);
            }
        } else {
            console.log("Column 'referencia' added successfully.");
        }
    });
});

db.close();
