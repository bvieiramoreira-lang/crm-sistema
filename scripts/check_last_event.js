
const db = require('../server/database');

console.log("Checando ultimos 5 eventos de producao:");
const query = `
    SELECT id, item_id, operador_id, operador_nome, setor, acao, timestamp 
    FROM eventos_producao 
    ORDER BY id DESC 
    LIMIT 5
`;

db.all(query, [], (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);
});
