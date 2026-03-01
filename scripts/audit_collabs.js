const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');

const db = new sqlite3.Database(dbPath);

console.log("Auditing Collaborators Sectors...");

db.serialize(() => {
    db.all("SELECT id, nome, setor, ativo FROM colaboradores", (err, rows) => {
        if (err) console.error(err);
        else console.log("ALL COLLABORATORS:", rows);
    });

    // Test the specific query used by the route
    const term = '%Arte Final%';
    db.all("SELECT * FROM colaboradores WHERE ativo = 1 AND setor LIKE ?", [term], (err, rows) => {
        console.log("QUERY MATCH TEST ('%Arte Final%'):", rows);
    });
});

setTimeout(() => db.close(), 1000);
