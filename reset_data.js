const db = require('./server/database');

console.log('Iniciando limpeza do banco de dados...');

db.serialize(() => {
    // 1. Limpar Eventos de Produção (Filho)
    db.run("DELETE FROM eventos_producao", (err) => {
        if (err) console.error("Erro ao limpar eventos_producao:", err);
        else console.log("Tabela 'eventos_producao' limpa.");
    });

    // 2. Limpar Itens do Pedido (Filho)
    db.run("DELETE FROM itens_pedido", (err) => {
        if (err) console.error("Erro ao limpar itens_pedido:", err);
        else console.log("Tabela 'itens_pedido' limpa.");
    });

    // 3. Limpar Histórico (Filho)
    db.run("DELETE FROM historico_pedidos", (err) => {
        if (err) console.error("Erro ao limpar historico_pedidos:", err);
        else console.log("Tabela 'historico_pedidos' limpa.");
    });

    // 4. Limpar Pedidos (Pai)
    db.run("DELETE FROM pedidos", (err) => {
        if (err) console.error("Erro ao limpar pedidos:", err);
        else console.log("Tabela 'pedidos' limpa.");
    });

    // 5. Limpar Colaboradores
    db.run("DELETE FROM colaboradores", (err) => {
        if (err) console.error("Erro ao limpar colaboradores:", err);
        else console.log("Tabela 'colaboradores' limpa.");
    });

    // 6. Zerar sequencias (Opcional, mas bom para testes "limpos")
    db.run("DELETE FROM sqlite_sequence WHERE name IN ('pedidos', 'itens_pedido', 'eventos_producao', 'historico_pedidos', 'colaboradores')", (err) => {
        if (err) console.error("Erro ao zerar sequencias:", err);
        else console.log("Sequências (IDs) reiniciadas.");
    });
});

// Wait a bit just to ensure async ops trigger (serialize enforces order but app might exit fast)
// Actually serialize blocks.
setTimeout(() => {
    console.log('Reset concluído.');
    process.exit(0);
}, 2000);
