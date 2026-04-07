const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'data/sp_system.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error(err);
    else {
        db.run(`ALTER TABLE colaboradores ADD COLUMN destaque_comportamento TEXT`, (err) => {
            if (err) {
                console.log("Coluna provavelmente já existe:", err.message);
            } else {
                console.log("Coluna destaque_comportamento adicionada com sucesso!");
            }
            process.exit(0);
        });
    }
});
