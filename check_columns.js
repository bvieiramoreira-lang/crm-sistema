const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(itens_pedido)", (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    const columns = rows.map(r => r.name);
    console.log("Columns in itens_pedido:", columns);

    const required = ['responsavel_arte', 'responsavel_separacao', 'responsavel_impressao', 'responsavel_embale', 'responsavel_logistica'];
    const missing = required.filter(c => !columns.includes(c));

    if (missing.length > 0) {
        console.log("MISSING COLUMNS:", missing);
    } else {
        console.log("All responsible columns exist.");
    }
});

setTimeout(() => db.close(), 1000);
