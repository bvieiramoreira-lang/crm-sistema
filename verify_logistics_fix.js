
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

const BASE_URL = 'http://localhost:3001/api';

async function runVerification() {
    console.log("Setup test data directly in DB...");

    // 1. Setup Data
    let itemId = null;
    let pedidoId = null;

    try {
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run("INSERT INTO pedidos (cliente, numero_pedido, prazo_entrega) VALUES (?, ?, ?)", ['Logistics Test', 'LOG-FIX-' + Date.now(), '2025-01-01'], function (err) {
                    if (err) return reject(err);
                    pedidoId = this.lastID;

                    db.run("INSERT INTO itens_pedido (pedido_id, produto, quantidade, setor_destino, status_atual) VALUES (?, ?, ?, ?, ?)",
                        [pedidoId, 'Item Test', 10, 'SILK_PLANO', 'AGUARDANDO_EMBALE'],
                        function (err) {
                            if (err) return reject(err);
                            itemId = this.lastID;
                            resolve();
                        }
                    );
                });
            });
        });

        console.log(`Created Order ${pedidoId} and Item ${itemId} (Status: AGUARDANDO_EMBALE)`);

        // 2. Call API to move to Logistics (Transportadora)
        // This was failing because 'dados_volumes' column missing
        console.log("Testing Embale with Data (Transportadora)...");
        const payloadTransport = {
            quantidade_volumes: 2,
            peso: 10,
            altura: 20,
            largura: 30,
            comprimento: 40,
            dados_volumes: JSON.stringify([{ v: 1 }, { v: 2 }])
        };

        const res1 = await fetch(`${BASE_URL}/production/item/${itemId}/embale`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadTransport)
        });
        const json1 = await res1.json();
        console.log("Response 1:", json1);

        if (!res1.ok) throw new Error("API call failed: " + JSON.stringify(json1));

        // 3. Verify Status
        const row1 = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM itens_pedido WHERE id = ?", [itemId], (err, row) => err ? reject(err) : resolve(row));
        });

        if (row1.status_atual === 'AGUARDANDO_ENVIO' && row1.dados_volumes) {
            console.log("SUCCESS 1: Item moved to AGUARDANDO_ENVIO and has volumes data.");
        } else {
            console.error("FAILURE 1: Status or Data incorrect.", row1);
        }

        // 4. Test Retirada (Optional but good check)
        // Reset
        await new Promise(r => db.run("UPDATE itens_pedido SET status_atual='AGUARDANDO_EMBALE' WHERE id=?", [itemId], r));

        console.log("Testing Embale Retirada...");
        const payloadRetirada = {
            quantidade_volumes: 5,
            peso: 0, altura: 0, largura: 0, comprimento: 0,
            dados_volumes: '[]'
        };
        const res2 = await fetch(`${BASE_URL}/production/item/${itemId}/embale`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadRetirada)
        });
        console.log("Response 2:", await res2.json());

        const row2 = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM itens_pedido WHERE id = ?", [itemId], (err, row) => err ? reject(err) : resolve(row));
        });

        if (row2.status_atual === 'AGUARDANDO_ENVIO' && row2.quantidade_volumes === 5) {
            console.log("SUCCESS 2: Item moved to AGUARDANDO_ENVIO (Retirada).");
        } else {
            console.error("FAILURE 2:", row2);
        }

    } catch (e) {
        console.error("Verification Execption:", e);
    } finally {
        // Cleanup
        if (pedidoId) {
            // db.run("DELETE FROM pedidos WHERE id=?", [pedidoId]);
            // db.run("DELETE FROM itens_pedido WHERE pedido_id=?", [pedidoId]);
        }
        db.close();
    }
}

runVerification();
