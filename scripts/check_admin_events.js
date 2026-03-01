const db = require('../server/database');

console.log("=== CHECK: Remaining Administrator Events ===");

db.all(`SELECT id, item_id, setor, operador_nome 
        FROM eventos_producao 
        WHERE acao='FIM' AND (operador_nome LIKE '%Admin%' OR operador_nome LIKE '%Logistica%')`, [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`Found ${rows.length} events still with Admin/Logistica names.`);
        console.log(`Found ${rows.length} events still with Admin/Logistica names.`);
        if (rows.length > 0) {
            console.log(JSON.stringify(rows, null, 2));
        }
    }
});
