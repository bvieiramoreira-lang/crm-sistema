const db = require('../server/database');

console.log("=== DEBUG: Latest 5 Production Events ===");

db.all(`SELECT id, item_id, setor, acao, operador_id, operador_nome, timestamp 
        FROM eventos_producao 
        ORDER BY id DESC 
        LIMIT 5`, [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(JSON.stringify(rows, null, 2));
    }
});
