
const db = require('../server/database');

console.log("Listando usuarios:");
db.all('SELECT id, nome, perfil FROM usuarios', [], (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);
});
