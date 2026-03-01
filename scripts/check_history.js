const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking historico_pedidos...");
db.each("SELECT * FROM historico_pedidos WHERE novo_status = 'FINALIZADO'", (err, row) => {
    console.log(row);
    db.get("SELECT date(?) as d", [row.data_alteracao], (e, r) => {
        console.log(`Date parse test for '${row.data_alteracao}':`, r);
    });
}, () => {
    console.log("Done.");
});
