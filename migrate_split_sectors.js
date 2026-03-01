const db = require('./server/database.js');

// Migration:
// 1. Rename existing 'IMPRESSAO_DIGITAL' sector to 'IMPRESSAO_DIGITAL' (Keep it? Or split?)
// 2. We assume the old system used 'IMPRESSAO_DIGITAL' or similar to mean the Combo.
// 3. User wants 'IMPRESSAO_DIGITAL' AND 'ESTAMPARIA'.
// 4. We will migrate any item that is 'IMPRESSAO_DIGITAL' to 'IMPRESSAO_DIGITAL' (it remains).
// 5. But for users, we need to ensure we have users for both.
// Let's just log current status. This script is mostly to ensure the DB can handle the values.
// SQLite doesn't enforce ENUMs, so we are good on Data side.

// We will update 'usuarios' to ensure we have sectors set correctly if needed.
// Actually, we just need to ensure the CODE recognizes 'ESTAMPARIA'.

console.log("Migration: Splitting Sectors - Database is Schema-less for text, so verifying existing items.");

db.all("SELECT id, setor_destino, status_atual FROM itens_pedido WHERE setor_destino LIKE '%DIGITAL%' OR setor_destino LIKE '%ESTAMPARIA%'", (err, rows) => {
    if (err) console.error(err);
    else {
        console.log(`Found ${rows.length} items in Digital/Estamparia sectors.`);
        console.table(rows);
    }
});
