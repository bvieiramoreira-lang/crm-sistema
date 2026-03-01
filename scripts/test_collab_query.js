const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');

const db = new sqlite3.Database(dbPath);

console.log("Testing Collaborator Search Logic...");

const inputs = ['Arte Final', 'Impressao Laser', 'Silk Plano'];

db.serialize(() => {
    inputs.forEach(input => {
        const cleanSector = input.trim();
        const term = `%${cleanSector.replace(/ /g, '%')}%`; // Mimic backend logic

        console.log(`Input: "${input}" -> Query: "${term}"`);

        db.all("SELECT nome, setor FROM colaboradores WHERE ativo = 1 AND setor LIKE ? ORDER BY nome ASC", [term], (err, rows) => {
            if (err) console.error(err);
            else {
                console.log(`Results for "${input}":`);
                rows.forEach(r => console.log(` - ${r.nome} (${r.setor})`));
            }
        });
    });
});

setTimeout(() => db.close(), 1000);
