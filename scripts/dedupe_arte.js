const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');

const db = new sqlite3.Database(dbPath);

console.log("Deduplicating Arte Final Collaborators...");

const targets = ['LUCAS', 'FELIPE'];

db.serialize(() => {
    targets.forEach(name => {
        db.all("SELECT id FROM colaboradores WHERE UPPER(nome) = ? ORDER BY id ASC", [name], (err, rows) => {
            if (err) {
                console.error(err);
                return;
            }
            if (rows.length > 1) {
                // Keep first, delete others
                const keepId = rows[0].id;
                const deleteIds = rows.slice(1).map(r => r.id);
                console.log(`Processing ${name}: Keep ID ${keepId}, Delete IDs ${deleteIds.join(',')}`);

                deleteIds.forEach(id => {
                    db.run("DELETE FROM colaboradores WHERE id = ?", [id], (err) => {
                        if (err) console.error(`Error deleting ID ${id}:`, err);
                        else console.log(`Deleted duplicate ${name} (ID ${id})`);
                    });
                });
            } else {
                console.log(`${name}: No duplicates found.`);
            }
        });
    });

    // Final Audit
    setTimeout(() => {
        db.all("SELECT * FROM colaboradores WHERE UPPER(setor) LIKE '%ARTE%FINAL%'", (err, rows) => {
            console.log("Final State:", rows);
        });
    }, 1000);
});

setTimeout(() => db.close(), 2000);
