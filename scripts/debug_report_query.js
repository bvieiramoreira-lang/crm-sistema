const db = require('../server/database');

console.log("=== DEBUG: Report Query Simulation ===");

const start = '2026-02-09';
const end = '2026-02-11';

// Query from reports.js
const sql = `
    SELECT 
        COALESCE(fim.operador_nome, u.nome) as operador,
        fim.setor,
        COUNT(DISTINCT fim.item_id) as itens_concluidos,
        COUNT(DISTINCT p.id) as pedidos_concluidos,
        SUM(fim.quantidade_produzida) as total_pecas,
        COUNT(fim.id) as total_eventos,
        SUM((JULIANDAY(fim.timestamp) - JULIANDAY(inicio.timestamp)) * 24) as tempo_total_h
    FROM events_fim fim
    LEFT JOIN events_inicio inicio ON fim.item_id = inicio.item_id AND fim.setor = inicio.setor
    LEFT JOIN usuarios u ON fim.operador_id = u.id
    LEFT JOIN itens_pedido i ON fim.item_id = i.id
    LEFT JOIN pedidos p ON i.pedido_id = p.id
    WHERE date(fim.timestamp) BETWEEN ? AND ?
    GROUP BY operador, fim.setor
`;

// However, SQLite doesn't support CTEs in 'db.all' unless it's a full query string.
// The query in reports.js uses CTEs 'WITH events_fim AS ..., events_inicio AS ...'
// I need to copy the FULL query from reports.js to test it exactly.

const fullQuery = `
    WITH events_fim AS (
        SELECT * FROM eventos_producao WHERE acao = 'FIM'
    ),
    events_inicio AS (
        SELECT * FROM eventos_producao WHERE acao = 'INICIO'
    )
    SELECT 
        COALESCE(fim.operador_nome, u.nome) as operador,
        fim.setor,
        COUNT(DISTINCT fim.item_id) as itens_concluidos,
        COUNT(DISTINCT p.id) as pedidos_concluidos,
        SUM(fim.quantidade_produzida) as total_pecas,
        COUNT(fim.id) as total_eventos,
        SUM((JULIANDAY(fim.timestamp) - JULIANDAY(inicio.timestamp)) * 24) as tempo_total_h
    FROM events_fim fim
    LEFT JOIN events_inicio inicio ON fim.item_id = inicio.item_id AND fim.setor = inicio.setor
    LEFT JOIN usuarios u ON fim.operador_id = u.id
    LEFT JOIN itens_pedido i ON fim.item_id = i.id
    LEFT JOIN pedidos p ON i.pedido_id = p.id
    WHERE date(fim.timestamp) BETWEEN ? AND ?
    GROUP BY operador, fim.setor
`;

db.all(fullQuery, [start, end], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
});
