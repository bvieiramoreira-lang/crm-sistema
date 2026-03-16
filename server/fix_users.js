const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../data/sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log('Connecting to: ', dbPath);

db.serialize(() => {
    db.run("UPDATE usuarios SET setor_impressao = 'IMPRESSAO_DIGITAL' WHERE setor_impressao = 'DIGITAL'", function (err) {
        if (err) console.error("Error updating IMPRESSAO_DIGITAL:", err.message);
        else console.log(`Updated ${this.changes} rows for IMPRESSAO_DIGITAL.`);
    });
    db.run("UPDATE usuarios SET setor_impressao = 'IMPRESSAO_LASER' WHERE setor_impressao = 'LASER'", function (err) {
        if (err) console.error("Error updating IMPRESSAO_LASER:", err.message);
        else console.log(`Updated ${this.changes} rows for IMPRESSAO_LASER.`);
    });
});
db.close();
