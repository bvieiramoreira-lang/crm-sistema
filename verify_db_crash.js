const db = require('./server/database');

const runTest = () => {
    console.log("Testing DB Connection...");

    // Test 1: Check if table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='historico_pedidos'", [], (err, row) => {
        if (err) {
            console.error("Error checking table:", err);
            return;
        }
        if (!row) {
            console.error("Table historico_pedidos DOES NOT EXIST!");
            return;
        }
        console.log("Table exists.");

        // Test 2: Insert
        console.log("Testing Insert...");
        db.run(`INSERT INTO historico_pedidos (pedido_id, usuario_id, campo_alterado, valor_antigo, valor_novo, motivo) VALUES (?, ?, ?, ?, ?, ?)`,
            [1, 1, 'TESTE', 'A', 'B', 'Manual'],
            function (err) {
                if (err) console.error("Insert failed:", err);
                else console.log("Insert success. ID:", this.lastID);
            }
        );
    });
};

setTimeout(runTest, 1000); // Wait for db init
