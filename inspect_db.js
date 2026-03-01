const db = require('./server/database');

db.all('SELECT id, produto, status_atual, setor_destino FROM itens_pedido', [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    const formatted = rows.map(r => ({
        id: r.id,
        produto: r.produto,
        status: r.status_atual,
        setor: `'${r.setor_destino}'`
    }));
    console.log(JSON.stringify(formatted, null, 2));
});
