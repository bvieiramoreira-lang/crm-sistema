const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');

const db = new sqlite3.Database(dbPath);

console.log("Cleaning up Arte Final Collaborators...");

db.serialize(() => {
    // 1. Delete unwanted test users
    db.run("DELETE FROM colaboradores WHERE setor LIKE '%Arte%Final%' AND nome IN ('Ana Arte', 'Beatriz Designer')", function (err) {
        if (err) console.error("Error deleting:", err);
        else console.log(`Deleted ${this.changes} test users.`);
    });

    // 2. Normalize Lucas and Felipe (Ensure they exist and Sector is standard 'Arte Final')
    const targets = ['Lucas', 'Felipe'];

    // Check deletions/updates logic:
    // User wants ONLY Lucas and Felipe.
    // Safest strategy: Delete ALL Arte Final, then insert Lucas and Felipe.
    // BUT we might have ID references in other tables?
    // 'itens_pedido' uses 'responsavel_arte' stored as TEXT Name. So deleting IDs is fine if we re-insert same Names.

    // Let's go with: Delete ALL where sector matches Arte Final, except Lucas/Felipe.
    // OR just Delete ALL and Re-insert.

    // Better: Update any existing Lucas/Felipe to have nice sector name, delete others.

    db.run("DELETE FROM colaboradores WHERE UPPER(setor) LIKE '%ARTE%FINAL%' AND UPPER(nome) NOT IN ('LUCAS', 'FELIPE')", function (err) {
        if (err) console.error("Error cleaning others:", err);
        else console.log(`Removed ${this.changes} other records from Arte Final.`);
    });

    targets.forEach(name => {
        db.get("SELECT id FROM colaboradores WHERE UPPER(nome) = ?", [name.toUpperCase()], (err, row) => {
            if (!row) {
                db.run("INSERT INTO colaboradores (nome, setor, ativo) VALUES (?, 'Arte Final', 1)", [name], (err) => {
                    if (err) console.log(`Error insert ${name}:`, err);
                    else console.log(`Inserted ${name}`);
                });
            } else {
                db.run("UPDATE colaboradores SET setor = 'Arte Final', ativo = 1 WHERE id = ?", [row.id], (err) => {
                    if (err) console.log(`Error updating ${name}:`, err);
                    else console.log(`Updated ${name} to standard sector.`);
                });
            }
        });
    });

    // Dump final list
    db.all("SELECT * FROM colaboradores WHERE UPPER(setor) LIKE '%ARTE%FINAL%'", (err, rows) => {
        console.log("Final List:", rows);
    });
});

setTimeout(() => db.close(), 1000);
