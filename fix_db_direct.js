const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Hardcoded path to ensure we hit the right file
const dbPath = path.resolve('sp_system.db'); // Root directory
console.log("Opening Database at:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening DB:", err.message);
        process.exit(1);
    }
});

const columnsToCheck = [
    'responsavel_arte',
    'responsavel_separacao',
    'responsavel_desembale',
    'responsavel_impressao',
    'responsavel_embale',
    'responsavel_logistica'
];

db.serialize(() => {
    // 1. Check existing columns
    db.all("PRAGMA table_info(itens_pedido)", (err, rows) => {
        if (err) {
            console.error("Error reading schema:", err.message);
            return;
        }

        const existingCols = rows.map(r => r.name);
        console.log("Existing columns:", existingCols.join(', '));

        let missing = columnsToCheck.filter(c => !existingCols.includes(c));

        if (missing.length === 0) {
            console.log("ALL COLUMNS EXIST. No changes needed.");
        } else {
            console.log("Missing columns:", missing.join(', '));

            // 2. Add missing columns
            missing.forEach(col => {
                const sql = `ALTER TABLE itens_pedido ADD COLUMN ${col} TEXT`;
                console.log(`Executing: ${sql}`);
                db.run(sql, (err) => {
                    if (err) console.error(`Failed to add ${col}:`, err.message);
                    else console.log(`SUCCESS: Added ${col}`);
                });
            });
        }
    });
});

// Close eventually
setTimeout(() => {
    db.close();
    console.log("Done.");
}, 2000);
