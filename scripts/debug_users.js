const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');

const db = new sqlite3.Database(dbPath);

console.log("Dumping Users and Collaborators...");

db.serialize(() => {
    db.all("SELECT id, nome, perfil, setor_impressao FROM usuarios", (err, rows) => {
        if (err) console.error("Users Error:", err);
        else console.log("USUARIOS:", rows);
    });

    // Check if collaboradores table exists and has data
    db.all("SELECT * FROM collaborators", (err, rows) => { // Try english name first
        if (err) {
            // Try portuguese name
            db.all("SELECT * FROM colaboradores", (err2, rows2) => {
                if (err2) console.log("COLABORADORES TABLE Error:", err2.message);
                else console.log("COLABORADORES:", rows2);
            });
        }
        else console.log("COLLABORATORS:", rows);
    });
});

// Close later to allow async
setTimeout(() => db.close(), 1000);
