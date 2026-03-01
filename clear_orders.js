const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log('--- Cleaning System Orders ---');

db.serialize(() => {
    // Delete data from order-related tables
    // Excluding 'usuarios' to keep logins valid.

    db.run("DELETE FROM eventos_producao", (err) => {
        if (err) console.error("Error clearing eventos_producao:", err);
        else console.log("Cleared eventos_producao.");
    });

    db.run("DELETE FROM historico_pedidos", (err) => {
        if (err) console.error("Error clearing historico_pedidos:", err);
        else console.log("Cleared historico_pedidos.");
    });

    db.run("DELETE FROM itens_pedido", (err) => {
        if (err) console.error("Error clearing itens_pedido:", err);
        else console.log("Cleared itens_pedido.");
    });

    db.run("DELETE FROM pedidos", (err) => {
        if (err) console.error("Error clearing pedidos:", err);
        else console.log("Cleared pedidos.");
    });

    // Reset Sequence (Optional but cleaner)
    db.run("DELETE FROM sqlite_sequence WHERE name IN ('pedidos', 'itens_pedido', 'eventos_producao', 'historico_pedidos')", (err) => {
        if (err) console.error("Error resetting sequences:", err);
        else console.log("Reset autoincrement sequences.");
    });

});

db.close(() => {
    console.log('--- Cleanup Finished ---');
});
