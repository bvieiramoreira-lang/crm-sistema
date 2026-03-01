const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');

const db = new sqlite3.Database(dbPath);

console.log("Fixing Collaborators (v2)...");

const collabs = [
    { nome: 'Ana Arte', setor: 'Arte Final' },
    { nome: 'Beatriz Designer', setor: 'Arte Final' },
    { nome: 'Carlos Separa', setor: 'Separação' },
    { nome: 'Daniel Desembale', setor: 'Desembale' },
    { nome: 'Eduardo Embale', setor: 'Embale' },
    { nome: 'Fabio Logistica', setor: 'Logística' },
    { nome: 'Gabriel Silk', setor: 'Silk Plano' },
    { nome: 'Hugo Laser', setor: 'Impressão Laser' }
];

db.serialize(() => {
    collabs.forEach(c => {
        db.run("INSERT INTO colaboradores (nome, setor, ativo) SELECT ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM colaboradores WHERE nome = ? AND setor = ?)",
            [c.nome, c.setor, c.nome, c.setor],
            function (err) {
                if (err) console.error("Error:", err.message);
                else {
                    if (this.changes > 0) console.log(`Added: ${c.nome}`);
                    else console.log(`Skipped (Exists): ${c.nome}`);
                }
            });
    });
});

setTimeout(() => db.close(), 2000);
