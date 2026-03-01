
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking distinct arte_status values...");

db.all("SELECT DISTINCT arte_status FROM itens_pedido", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        rows.forEach(row => {
            const val = row.arte_status;
            console.log(`Value: '${val}' | Length: ${val ? val.length : 'null'} | Chars: ${val ? val.split('').map(c => c.charCodeAt(0)).join(',') : 'null'}`);
        });
    }
    db.close();
});
