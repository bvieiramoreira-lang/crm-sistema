const db = require('../server/database');

console.log("=== DEBUG: Check Users & Responsibles ===");

db.all("SELECT id, nome, perfil, ativo FROM usuarios", [], (err, users) => {
    if (err) console.error(err);
    else {
        console.log("--- USERS ---");
        console.log(JSON.stringify(users, null, 2));
    }

    console.log("\n--- ITEMS with Administrator Event in SILK_PLANO ---");
    db.all(`
        SELECT i.id, i.produto, i.responsavel_impressao, e.operador_nome
        FROM eventos_producao e
        JOIN itens_pedido i ON e.item_id = i.id
        WHERE e.setor = 'SILK_PLANO' AND (e.operador_nome LIKE 'Admin%' OR e.operador_nome LIKE 'Logistica%')
    `, [], (err, rows) => {
        if (err) console.error(err);
        else console.log(JSON.stringify(rows, null, 2));
    });
});
