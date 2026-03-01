
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking DB at:", dbPath);

db.all("PRAGMA table_info(itens_pedido)", (err, rows) => {
    if (err) {
        console.error("Error getting schema:", err);
    } else {
        const hasDadosVolumes = rows.some(r => r.name === 'dados_volumes');
        if (!hasDadosVolumes) {
            console.log("MISSING: dados_volumes");
        } else {
            console.log("EXISTS: dados_volumes");
        }
    }
    db.close();
});
