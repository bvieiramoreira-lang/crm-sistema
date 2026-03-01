const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log('--- Verifying Separation Dropdown Fix ---');

// We simulate the API's query behavior
// The API now does data normalization on query? No, just LIKE.
// But the data should be normalized now.

const targetSector = "Separação";
const term = `%${targetSector}%`; // API does this

db.serialize(() => {
    // 1. Verify Data State
    db.all("SELECT * FROM colaboradores WHERE setor LIKE ?", [term], (err, rows) => {
        if (err) {
            console.error("Query Error:", err);
        } else {
            console.log(`Querying for '%${targetSector}%':`);
            if (rows.length > 0) {
                console.log("SUCCESS: Found collaborators!");
                rows.forEach(r => console.log(` - ${r.nome} (${r.setor}) [Active: ${r.ativo}]`));
            } else {
                console.error("FAILURE: No collaborators found.");

                // Debug dump if fail
                db.all("SELECT * FROM colaboradores", (e, allRows) => {
                    console.log("Dump of all:", allRows);
                });
            }
        }
    });
});

db.close();
