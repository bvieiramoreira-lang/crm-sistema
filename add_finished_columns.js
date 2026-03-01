const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- Migrating Pedidos Table ---");

    // Add finalizado_em
    db.run("ALTER TABLE pedidos ADD COLUMN finalizado_em DATETIME", (err) => {
        if (err && err.message.includes('duplicate column')) {
            console.log("Column finalizado_em already exists.");
        } else if (err) {
            console.error("Error adding finalizado_em:", err);
        } else {
            console.log("Column finalizado_em added.");
        }
    });

    // Add finalizado_por
    db.run("ALTER TABLE pedidos ADD COLUMN finalizado_por TEXT", (err) => {
        if (err && err.message.includes('duplicate column')) {
            console.log("Column finalizado_por already exists.");
        } else if (err) {
            console.error("Error adding finalizado_por:", err);
        } else {
            console.log("Column finalizado_por added.");
        }
    });
});

db.close();
