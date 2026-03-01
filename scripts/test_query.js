const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');
const db = new sqlite3.Database(dbPath);

const query = `
    SELECT date(data_alteracao) as data, COUNT(DISTINCT pedido_id) as total
    FROM historico_pedidos
    WHERE valor_novo = 'FINALIZADO'
    AND data_alteracao >= date('now', 'localtime', '-6 days')
    GROUP BY date(data_alteracao)
    ORDER BY date(data_alteracao) ASC
`;

console.log("Running Query...");
db.all(query, (err, rows) => {
    if (err) console.error(err);
    else console.log("Result:", rows);
});

console.log("Checking All Rows...");
db.all("SELECT * FROM historico_pedidos WHERE valor_novo='FINALIZADO'", (err, rows) => {
    console.log("All Rows:", rows);
});

// Check Date Function
db.get("SELECT date('now', 'localtime', '-6 days') as limit_date", (err, row) => {
    console.log("Limit Date:", row);
});
