const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');

const db = new sqlite3.Database(dbPath);

console.log("Debugging Arte Final Match...");

const inputs = [
    { term: '%Arte%Final%', label: 'Term matches ARTE_FINAL?' },
    { term: '%ARTE%FINAL%', label: 'UPPER Term matches ARTE_FINAL?' }
];

db.serialize(() => {
    // 1. Dump distinct sectors
    db.all("SELECT DISTINCT setor FROM colaboradores", (err, rows) => {
        console.log("Distinct Sectors in DB:", rows);
    });

    // 2. Test Matches
    inputs.forEach(i => {
        db.all("SELECT nome, setor FROM colaboradores WHERE setor LIKE ?", [i.term], (err, rows) => {
            console.log(`Query '${i.term}': Found ${rows.length}`, rows);
        });
    });

    // 3. Test exact value hex to ensure no weird chars
    db.all("SELECT id, nome, setor, hex(setor) as hex FROM colaboradores WHERE nome = 'FELIPE'", (err, rows) => {
        console.log("FELIPE Row Dump:", rows);
    });
});

setTimeout(() => db.close(), 1000);
