const sqlite3 = require('sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking Item 1...");
db.get("SELECT status_atual, responsavel_separacao, data_separacao FROM itens_pedido WHERE id = 1", [], (err, row) => {
    if (err) console.error(err);
    else console.log("DB Content:", row);
});
