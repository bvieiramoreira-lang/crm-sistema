
const db = require('../server/database');

console.log("Listando COLABORADORES (Tabela Separada):");
db.all('SELECT * FROM colaboradores', [], (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);
});
