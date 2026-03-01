const db = require('../server/database');

console.log("=== DEBUG: Checking Item Data for SILK_PLANO ===");

// Check an item that has events in SILK_PLANO
db.all(`SELECT e.id as event_id, e.item_id, e.setor, e.operador_nome, i.responsavel_impressao, i.produto 
        FROM eventos_producao e
        JOIN itens_pedido i ON e.item_id = i.id
        WHERE e.setor = 'SILK_PLANO' AND e.acao = 'FIM'
        LIMIT 5`, [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.table(rows);
    }

    console.log("\n=== DEBUG: Checking TEST_SECTOR ===");
    db.all(`SELECT e.id as event_id, e.item_id, e.setor, e.operador_nome, i.* 
            FROM eventos_producao e
            JOIN itens_pedido i ON e.item_id = i.id
            WHERE e.setor = 'TEST_SECTOR'
            LIMIT 1`, [], (err, rows) => {
        if (err) console.error(err);
        else console.log(rows);
    });
});
