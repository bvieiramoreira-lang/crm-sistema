const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

const columnsToAdd = [
    { name: 'data_arte_aprovacao', type: 'DATETIME' },
    { name: 'data_separacao', type: 'DATETIME' },
    { name: 'data_desembale', type: 'DATETIME' },
    { name: 'data_embale', type: 'DATETIME' },
    { name: 'data_envio', type: 'DATETIME' },
    { name: 'finalizado_em', type: 'DATETIME' }
];

db.serialize(() => {
    console.log("Starting Migration: Adding Timestamps...");

    db.all("PRAGMA table_info(itens_pedido)", (err, rows) => {
        if (err) {
            console.error("Error reading schema:", err);
            return;
        }

        const existingColumns = rows.map(r => r.name);

        columnsToAdd.forEach(col => {
            if (!existingColumns.includes(col.name)) {
                console.log(`Adding column: ${col.name}`);
                db.run(`ALTER TABLE itens_pedido ADD COLUMN ${col.name} ${col.type}`, (err) => {
                    if (err) console.error(`Error adding ${col.name}:`, err.message);
                    else console.log(`Success: ${col.name} added.`);
                });
            } else {
                console.log(`Skipping: ${col.name} already exists.`);
            }
        });
    });
});
