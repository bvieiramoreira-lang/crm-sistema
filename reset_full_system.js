const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Iniciando limpeza completa do banco de dados...");

    // 1. Limpar Pedidos e Itens
    db.run("DELETE FROM pedidos", (err) => {
        if (err) console.error("Erro ao limpar pedidos:", err.message);
        else console.log("Tabela 'pedidos' limpa.");
    });

    db.run("DELETE FROM itens_pedido", (err) => {
        if (err) console.error("Erro ao limpar itens_pedido:", err.message);
        else console.log("Tabela 'itens_pedido' limpa.");
    });

    // 2. Limpar Históricos e Eventos Relacionados
    db.run("DELETE FROM historico_pedidos", (err) => {
        if (err) console.error("Erro ao limpar historico_pedidos:", err.message);
        else console.log("Tabela 'historico_pedidos' limpa.");
    });

    db.run("DELETE FROM eventos_producao", (err) => {
        if (err) console.error("Erro ao limpar eventos_producao:", err.message);
        else console.log("Tabela 'eventos_producao' limpa.");
    });

    // 3. Limpar Colaboradores (conforme solicitado)
    // NOTA: O usuário pediu para apagar colaboradores. 
    // No database.js linha 134, a tabela é 'colaboradores'.
    db.run("DELETE FROM colaboradores", (err) => {
        if (err) console.error("Erro ao limpar colaboradores:", err.message);
        else console.log("Tabela 'colaboradores' limpa.");
    });

    // 4. (Opcional) Resetar sequenciais do SQLite (AUTOINCREMENT)
    db.run("DELETE FROM sqlite_sequence WHERE name IN ('pedidos', 'itens_pedido', 'historico_pedidos', 'eventos_producao', 'colaboradores')", (err) => {
        if (err) console.error("Erro ao resetar sequenciais:", err.message);
        else console.log("Sequenciais resetados.");
    });

    console.log("Limpeza concluída. O sistema está zerado para testes.");
});

db.close();
