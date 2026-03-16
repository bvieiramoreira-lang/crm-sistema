const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('database.sqlite');
db.all('SELECT * FROM usuarios', [], (err, rows) => {
    if (err) throw err;
    fs.writeFileSync('users_dump.json', JSON.stringify(rows, null, 2));
    db.close();
});
