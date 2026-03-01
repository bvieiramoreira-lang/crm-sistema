const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM colaboradores", (err, rows) => {
    if (err) {
        fs.writeFileSync('collab_dump.txt', 'Error: ' + err.message);
    } else {
        fs.writeFileSync('collab_dump.txt', JSON.stringify(rows, null, 2));
    }
    db.close();
});
