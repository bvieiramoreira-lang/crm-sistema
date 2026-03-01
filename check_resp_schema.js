const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log("--- Checking Responsability Columns ---");
db.all("PRAGMA table_info(itens_pedido)", (err, rows) => {
    if (err) console.error(err);
    else {
        const cols = rows.map(r => r.name);
        console.log("Columns:", cols.join(', '));
        if (cols.includes('responsavel_arte')) console.log("SUCCESS: responsavel_arte exists.");
        else console.error("FAILURE: responsavel_arte MISSING.");
    }
    db.close();
});
