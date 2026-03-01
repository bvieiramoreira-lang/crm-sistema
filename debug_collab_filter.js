const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log("Analyzing Collaborators for 'Embale' logic...");

db.all("SELECT * FROM colaboradores WHERE ativo = 1", (err, rows) => {
    if (err) {
        console.error("Error:", err);
        return;
    }

    console.log(`Total Active Collaborators: ${rows.length}`);

    // Simulate Backend Filter Logic
    const searchTerm = "EMBALE";
    const filtered = rows.filter(u => {
        if (!u.setor) return false;
        // Split by comma and trim
        const sectors = u.setor.split(',').map(s => s.trim().toUpperCase());
        const match = sectors.includes(searchTerm);

        if (match) {
            console.log(`MATCH [${u.nome}]: Setores='${u.setor}'`);
        } else if (u.setor.toUpperCase().includes(searchTerm)) {
            console.log(`PARTIAL MATCH (Should be excluded) [${u.nome}]: Setores='${u.setor}'`);
        }

        return match;
    });

    console.log(`\nItems that match EXACT filtering: ${filtered.length}`);
});

setTimeout(() => db.close(), 1000);
