
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log('Migrating: Adding dados_volumes column to itens_pedido...');

db.serialize(() => {
    db.run("ALTER TABLE itens_pedido ADD COLUMN dados_volumes TEXT", (err) => {
        if (err) {
            // Ignore error if column exists (duplicate column name)
            if (err.message.includes('duplicate column name')) {
                console.log("Column 'dados_volumes' already exists.");
            } else {
                console.error("Error adding column:", err.message);
            }
        } else {
            console.log("Column 'dados_volumes' added successfully.");
        }
    });
});

db.close();
