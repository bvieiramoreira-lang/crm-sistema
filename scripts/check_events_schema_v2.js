
const db = require('../server/database');

db.all('PRAGMA table_info(eventos_producao)', [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.table(rows);
});
