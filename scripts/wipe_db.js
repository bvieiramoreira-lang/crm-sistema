const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../sp_system.db');

const db = new sqlite3.Database(dbPath);

console.log("[WIPE] Conectando ao banco...");

db.serialize(() => {
    db.run("DELETE FROM pedidos");
    db.run("DELETE FROM itens_pedido");
    db.run("DELETE FROM eventos_producao");
    db.run("DELETE FROM historico_pedidos");
    // db.run("DELETE FROM sqlite_sequence WHERE name IN ('pedidos', 'itens_pedido', 'eventos_producao', 'historico_pedidos')");

    console.log("[WIPE] Tabelas limpas!");
    db.close();
});
