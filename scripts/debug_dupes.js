const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');

const db = new sqlite3.Database(dbPath);

console.log("Checking for duplicates...");

const names = ['LUCAS', 'FELIPE'];

db.serialize(() => {
    names.forEach(name => {
        db.all("SELECT id, nome, setor, ativo FROM colaboradores WHERE UPPER(nome) = ?", [name], (err, rows) => {
            if (err) console.error(err);
            else console.log(`Records for ${name}:`, rows);
        });
    });
});

setTimeout(() => db.close(), 1000);
