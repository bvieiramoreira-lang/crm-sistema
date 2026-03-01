const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');

const db = new sqlite3.Database(dbPath);

console.log("Dumping Events...");
db.all("SELECT id, item_id, acao, timestamp FROM eventos_producao LIMIT 20", (err, rows) => {
    if (err) console.error(err);
    else console.log("EVENTS DUMP:", rows);
    db.close();
});
