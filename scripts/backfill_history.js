const db = require('../server/database');

// Find orders that are FINALIZADO but don't have an entry in historico_pedidos with valor_novo='FINALIZADO'
const query = `
    SELECT p.id, p.finalizado_em, p.finalizado_por 
    FROM pedidos p
    WHERE p.status_geral = 'FINALIZADO'
    AND NOT EXISTS (
        SELECT 1 FROM historico_pedidos h 
        WHERE h.pedido_id = p.id 
        AND h.valor_novo = 'FINALIZADO'
    )
`;

db.all(query, [], (err, rows) => {
    if (err) {
        console.error("Error finding orders:", err);
        return;
    }

    console.log(`Found ${rows.length} finished orders missing history.`);

    if (rows.length === 0) return;

    db.serialize(() => {
        // Corrected column name: usuario_id (INTEGER) instead of usuario (TEXT)
        const stmt = db.prepare("INSERT INTO historico_pedidos (pedido_id, campo_alterado, valor_antigo, valor_novo, data_alteracao, usuario_id) VALUES (?, 'status', 'EM_PRODUCAO', 'FINALIZADO', ?, ?)");

        rows.forEach(row => {
            const date = row.finalizado_em || new Date().toISOString();

            // Extract ID from string "User ID 1" or default to 1 (Admin)
            let userId = 1;
            if (row.finalizado_por && row.finalizado_por.startsWith('User ID ')) {
                const parts = row.finalizado_por.split(' ');
                // "User ID 1" -> parts[2] is "1"
                userId = parseInt(parts[2], 10) || 1;
            }

            stmt.run(row.id, date, userId, (err) => {
                if (err) console.error(`Failed to insert for order ${row.id}`, err);
                else console.log(`Backfilled order ${row.id} with user ${userId}`);
            });
        });

        stmt.finalize(() => {
            console.log("Backfill complete.");
        });
    });
});
