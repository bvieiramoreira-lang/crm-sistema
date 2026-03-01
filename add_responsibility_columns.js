const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/sp_system.db'); // Adjust if needed
const db = new sqlite3.Database(dbPath);

const columnsToAdd = [
    { name: 'responsavel_arte', type: 'TEXT' },
    { name: 'responsavel_separacao', type: 'TEXT' },
    { name: 'responsavel_desembale', type: 'TEXT' },
    { name: 'responsavel_impressao', type: 'TEXT' },
    { name: 'responsavel_embale', type: 'TEXT' },
    { name: 'responsavel_logistica', type: 'TEXT' }
];

console.log(`Connecting to ${dbPath}...`);

db.serialize(() => {
    columnsToAdd.forEach(col => {
        const sql = `ALTER TABLE itens_pedido ADD COLUMN ${col.name} ${col.type}`;
        db.run(sql, (err) => {
            if (err) {
                if (err.message.includes('duplicate column')) {
                    console.log(`[EXISTING] Column ${col.name} already exists.`);
                } else {
                    console.error(`[ERROR] adding ${col.name}:`, err.message);
                }
            } else {
                console.log(`[SUCCESS] Added column ${col.name}`);
            }
        });
    });
});

db.close(() => {
    console.log("Migration attempts finished.");
});
