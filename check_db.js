
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(itens_pedido)", (err, rows) => {
    if (err) {
        console.error("Error getting schema:", err);
    } else {
        console.log("COLUMNS_START");
        rows.forEach(r => console.log(r.name));
        console.log("COLUMNS_END");

        const hasDadosVolumes = rows.some(r => r.name === 'dados_volumes');
        if (!hasDadosVolumes) {
            console.log("MISSING: dados_volumes");
            db.run("ALTER TABLE itens_pedido ADD COLUMN dados_volumes TEXT", (err) => {
                if (err) console.error("ADD_ERROR:", err.message);
                else console.log("ADD_SUCCESS");
            });
        } else {
            console.log("EXISTS: dados_volumes");
        }
    }
    // Don't close immediately to allow async run to finish
    // db.close(); 
    // Actually sqlite3 queues so it's fine, but let's wait a bit or use serialize
});
