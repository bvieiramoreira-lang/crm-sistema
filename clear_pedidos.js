const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, './data/sp_system.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
        process.exit(1);
    }
});

console.log('Iniciando limpeza de pedidos de teste...');

db.serialize(() => {
    // 1. Apagar eventos de produção associados aos itens
    db.run('DELETE FROM eventos_producao');
    console.log('- Tabela limpa: eventos_producao');

    // 2. Apagar histórico de alterações de pedidos
    db.run('DELETE FROM historico_pedidos');
    console.log('- Tabela limpa: historico_pedidos');

    // 3. Apagar os itens de pedido
    db.run('DELETE FROM itens_pedido');
    console.log('- Tabela limpa: itens_pedido');

    // 4. Apagar os pedidos em si
    db.run('DELETE FROM pedidos');
    console.log('- Tabela limpa: pedidos');

    // 5. Opcional: Resetar o contador de IDs (auto-incremento) para que o próximo seja 1
    db.run("DELETE FROM sqlite_sequence WHERE name='eventos_producao'");
    db.run("DELETE FROM sqlite_sequence WHERE name='historico_pedidos'");
    db.run("DELETE FROM sqlite_sequence WHERE name='itens_pedido'");
    db.run("DELETE FROM sqlite_sequence WHERE name='pedidos'");
    console.log('- IDs resetados');
});

db.close((err) => {
    if (err) {
        console.error('Erro ao fechar o banco de dados:', err.message);
    } else {
        console.log('\n=============================================');
        console.log('LIMPEZA CONCLUÍDA COM SUCESSO! 🎉');
        console.log('Todos os pedidos testes foram apagados do sistema.');
        console.log('O sistema está pronto para produção amanhã!');
        console.log('=============================================\n');
    }
});
