const db = require('./server/database');

console.log('Iniciando limpeza APENAS DOS PEDIDOS...');

db.serialize(() => {
    // 1. Limpar Eventos de Produção
    db.run("DELETE FROM eventos_producao", (err) => {
        if (err) console.error("Erro eventos:", err);
    });

    // 2. Limpar Itens
    db.run("DELETE FROM itens_pedido", (err) => {
        if (err) console.error("Erro itens:", err);
    });

    // 3. Limpar Histórico
    db.run("DELETE FROM historico_pedidos", (err) => {
        if (err) console.error("Erro historico:", err);
    });

    // 4. Limpar Pedidos
    db.run("DELETE FROM pedidos", (err) => {
        if (err) console.error("Erro pedidos:", err);
    });

    // 5. Resetar IDs (exceto colaboradores/usuarios)
    db.run("DELETE FROM sqlite_sequence WHERE name IN ('pedidos', 'itens_pedido', 'eventos_producao', 'historico_pedidos')", (err) => {
        if (err) console.error("Erro sequencias:", err);
    });

    console.log("Pedidos removidos. Colaboradores mantidos.");
});

setTimeout(() => {
    process.exit(0);
}, 2000);
