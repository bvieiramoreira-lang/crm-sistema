const db = require('../server/database');

console.log("=== FIX: Backfilling Operator Names in Events ===");

// 1. Get all events where operator_nome is likely missing or generic 'Administrator'
// Actually, let's just update ALL events based on the item's current responsible if available.
// Issue: Item responsible is the CURRENT one. Event might be old.
// Strategy: 
// - Iterate events.
// - If event has `operador_id`, get User Name from `usuarios`.
// - Correction: User said "Administrator" appears, which means `operador_id` matches Admin.
// - But the `itens_pedido` has columns like `responsavel_impressao` which stores the TEXT NAME of the collaborator.
// - We should trust `responsavel_X` columns in `itens_pedido` ONLY IF the event sector matches.
// - Limitation: If an item passed through a sector multiple times or had multiple events, `items_pedido` only stores the LATEST responsible.
// - We will do our best effort: Update events of Type 'FIM' (Conclusão) with the name stored in `items_pedido` for that sector.

const SETOR_MAP = {
    'SILK_PLANO': 'responsavel_impressao',
    'SILK_CILINDRICA': 'responsavel_impressao',
    'TAMPOGRAFIA': 'responsavel_impressao',
    'IMPRESSAO_DIGITAL': 'responsavel_impressao',
    'IMPRESSAO_LASER': 'responsavel_impressao',
    'ESTAMPARIA': 'responsavel_impressao',
    'SEPARAÇÃO': 'responsavel_separacao',
    'AGUARDANDO_SEPARACAO': 'responsavel_separacao', // Event sector might be strictly 'SEPARACAO' or status name
    'DESEMBALE': 'responsavel_desembale',
    'AGUARDANDO_DESEMBALE': 'responsavel_desembale',
    'EMBALE': 'responsavel_embale',
    'AGUARDANDO_EMBALE': 'responsavel_embale',
    'LOGISTICA': 'responsavel_logistica',
    'AGUARDANDO_ENVIO': 'responsavel_logistica',
    'TEST_SECTOR': 'responsavel_impressao' // Map test sector to impression for fix
};

db.all(`SELECT e.id, e.item_id, e.setor, e.acao, e.operador_nome, u.nome as user_nome 
        FROM eventos_producao e
        LEFT JOIN usuarios u ON e.operador_id = u.id
        WHERE e.acao = 'FIM'`, [], (err, events) => {

    if (err) {
        console.error("Error fetching events:", err);
        return;
    }

    console.log(`Found ${events.length} 'FIM' events to check.`);

    let updates = 0;

    const processEvent = (index) => {
        if (index >= events.length) {
            console.log(`Done. Updated ${updates} events.`);
            return;
        }

        const evt = events[index];
        const respCol = SETOR_MAP[evt.setor];

        if (respCol) {
            // Fetch Item Details
            db.get(`SELECT ${respCol} as resp_nome FROM itens_pedido WHERE id = ?`, [evt.item_id], (err2, item) => {
                if (item && item.resp_nome && item.resp_nome.trim() !== '') {
                    // Update Event
                    const newName = item.resp_nome;

                    // Only update if different? 
                    // User says currently it shows "Administrator" (user_nome).
                    // We want to overwrite it with `resp_nome` (Collaborator Name).

                    if (evt.operador_nome !== newName) {
                        db.run(`UPDATE eventos_producao SET operador_nome = ? WHERE id = ?`, [newName, evt.id], (err3) => {
                            if (!err3) {
                                console.log(`[UPD] Event ${evt.id}: '${evt.operador_nome || evt.user_nome}' -> '${newName}'`);
                                updates++;
                            }
                            processEvent(index + 1);
                        });
                    } else {
                        processEvent(index + 1);
                    }
                } else {
                    processEvent(index + 1);
                }
            });
        } else {
            processEvent(index + 1);
        }
    };

    processEvent(0);
});
