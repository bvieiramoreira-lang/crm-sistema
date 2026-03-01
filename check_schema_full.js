const db = require('./server/database');

function checkTable(tableName) {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
        if (err) {
            console.error(`Error reading ${tableName}:`, err);
            return;
        }
        console.log(`\n--- SCHEMA: ${tableName} ---`);
        rows.forEach(r => console.log(`${r.cid}: ${r.name} (${r.type})`));
    });
}

checkTable('pedidos');
checkTable('itens_pedido');
