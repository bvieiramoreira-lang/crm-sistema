const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log('[DEBUG] Checking Collaborators Table');

db.serialize(() => {
    // 1. Dump current collaborators
    db.all("SELECT * FROM colaboradores", (err, rows) => {
        if (err) console.error(err);
        else {
            console.log("--- Current Collaborators ---");
            console.log(rows);
            console.log("-----------------------------");
        }
    });

    // 2. Test Query used by API
    const term = '%Separação%';
    console.log(`Testing Query: SELECT * FROM colaboradores WHERE ativo = 1 AND setor LIKE '${term}'`);

    db.all("SELECT * FROM colaboradores WHERE ativo = 1 AND setor LIKE ?", [term], (err, rows) => {
        if (err) console.error(err);
        else {
            console.log("--- Query Result (Separação) ---");
            console.log(rows);
            console.log("--------------------------------");
        }
    });

    // 3. Test Query without Accent
    const term2 = '%Separacao%';
    console.log(`Testing Query: SELECT * FROM colaboradores WHERE ativo = 1 AND setor LIKE '${term2}'`);

    db.all("SELECT * FROM colaboradores WHERE ativo = 1 AND setor LIKE ?", [term2], (err, rows) => {
        if (err) console.error(err);
        else {
            console.log("--- Query Result (Separacao) ---");
            console.log(rows);
            console.log("--------------------------------");
        }
    });
});

db.close();
