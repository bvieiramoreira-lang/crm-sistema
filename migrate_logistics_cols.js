
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log("Migrating: Adding logistics columns to itens_pedido...");

const columns = [
    { name: 'quantidade_volumes', type: 'INTEGER DEFAULT 0' },
    { name: 'peso', type: 'REAL DEFAULT 0' },
    { name: 'altura', type: 'REAL DEFAULT 0' },
    { name: 'largura', type: 'REAL DEFAULT 0' },
    { name: 'comprimento', type: 'REAL DEFAULT 0' }
];

db.serialize(() => {
    columns.forEach(col => {
        const sql = `ALTER TABLE itens_pedido ADD COLUMN ${col.name} ${col.type}`;
        db.run(sql, (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log(`Column ${col.name} already exists.`);
                } else {
                    console.error(`Error adding ${col.name}:`, err.message);
                }
            } else {
                console.log(`Column ${col.name} added successfully.`);
            }
        });
    });
});

db.close();
