const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

const mappings = {
    'SEPARAÇÃO': 'Separação',
    'ARTE FINAL': 'Arte Final',
    'DESEMBALE': 'Desembale',
    'SILK CILÍNDRICA': 'Silk Cilíndrica',
    'SILK PLANO': 'Silk Plano',
    'TAMPOGRAFIA': 'Tampografia',
    'IMPRESSÃO LASER': 'Impressão Laser',
    'IMPRESSÃO DIGITAL': 'Impressão Digital / Estamparia',
    'IMPRESSÃO DIGITAL / ESTAMPARIA': 'Impressão Digital / Estamparia',
    'EMBALE': 'Embale',
    'LOGÍSTICA': 'Logística'
};

db.serialize(() => {
    console.log("--- Normalizing Sector Names ---");

    db.run("BEGIN TRANSACTION");

    Object.keys(mappings).forEach(oldName => {
        const newName = mappings[oldName];
        db.run("UPDATE colaboradores SET setor = ? WHERE setor = ?", [newName, oldName], function (err) {
            if (err) console.error(`Error updating ${oldName}:`, err);
            else if (this.changes > 0) {
                console.log(`Updated ${this.changes} rows from '${oldName}' to '${newName}'`);
            }
        });
    });

    db.run("COMMIT", (err) => {
        if (err) console.error("Commit error:", err);
        else console.log("Changes committed.");
    });
});

db.close();
