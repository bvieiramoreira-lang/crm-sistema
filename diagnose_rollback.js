const fetch = require('node-fetch');
const db = require('./server/database');

async function logic() {
    console.log("=== DIAGNOSTIC START ===");

    // 1. Create Test Item
    const testId = 9999;
    await new Promise(r => db.run("DELETE FROM itens_pedido WHERE id = ?", [testId], r));

    // Insert item in SEPARATION state (Art Approved)
    await new Promise((resolve, reject) => {
        db.run(`INSERT INTO itens_pedido (id, pedido_id, produto, quantidade, status_atual, arte_status, setor_destino) 
                VALUES (?, 1, 'TEST_ROLLBACK', 1, 'AGUARDANDO_SEPARACAO', 'APROVADO', 'SILK_PLANO')`,
            [testId], (err) => {
                if (err) reject(err); else resolve();
            });
    });
    console.log("[1] Test Item Created (Separation, Art Approved)");

    // 2. Call Server API to Rollback to NOVO
    console.log("[2] Calling PUT /item/9999/return with target NOVO...");
    try {
        const res = await fetch('http://localhost:3000/api/production/item/9999/return', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_status: 'NOVO',
                observation: 'DIAGNOSTIC_TEST',
                operador_id: 1
            })
        });
        const json = await res.json();
        console.log("API Response:", json);
    } catch (e) {
        console.error("API Error (Server likely down):", e);
        return;
    }

    // 3. Check DB State
    db.get("SELECT status_atual, arte_status, setor_destino FROM itens_pedido WHERE id = ?", [testId], (err, row) => {
        console.log("[3] DB State After Rollback:", row);

        if (row.arte_status === 'AGUARDANDO_APROVACAO') {
            console.log("SUCCESS: Server Logic is CORRECT. Arte Status reset.");
        } else {
            console.error("FAIL: Server Logic is STALE. Arte Status did NOT reset.");
            console.error("Please RESTART the server manually.");
        }
        console.log("=== DIAGNOSTIC END ===");
    });
}

logic();
