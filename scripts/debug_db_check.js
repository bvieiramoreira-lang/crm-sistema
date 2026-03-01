const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.each("SELECT count(*) as count, 'pedidos' as table_name FROM pedidos", (err, row) => {
        console.log(`${row.table_name}: ${row.count}`);
    });
    db.each("SELECT count(*) as count, 'itens_pedido' as table_name FROM itens_pedido", (err, row) => {
        console.log(`${row.table_name}: ${row.count}`);
    });

    // Dump all pedidos
    db.all("SELECT id, numero_pedido, status_geral FROM pedidos", (err, rows) => {
        console.log("PEDIDOS DUMP:", rows);
    });
});

db.close();
