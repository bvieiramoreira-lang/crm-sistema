
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'trigger'", (err, rows) => {
        if (err) console.error(err);
        else console.log("Triggers:", JSON.stringify(rows, null, 2));
    });
});
db.close();
