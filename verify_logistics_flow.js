
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

const BASE_URL = 'http://localhost:3000/api';

async function runTest() {
    try {
        console.log("Starting Logistics Flow Verification...");

        // 1. Create a clean test order
        const orderRes = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente: "Teste Logística",
                numero_pedido: `LOG-${Date.now()}`,
                prazo_entrega: "2024-12-31",
                tipo_envio: "TRANSPORTADORA",
                transportadora: "TestLog",
                observacao: "Teste auto",
                itens: [
                    { produto: "Camisa", quantidade: 10, setor_destino: "SILK_PLANO" }
                ]
            })
        });
        const orderData = await orderRes.json();

        const pedidoId = orderData.id;
        console.log(`Order Created: ${pedidoId}`);

        // Wait for items insertion (Server race condition workaround for test)
        await new Promise(r => setTimeout(r, 1000));

        // 2. Get Item ID
        const orderDetailsRes = await fetch(`${BASE_URL}/orders/${pedidoId}`);
        const orderDetails = await orderDetailsRes.json();
        console.log("Order Details:", JSON.stringify(orderDetails, null, 2));

        if (!orderDetails.itens || orderDetails.itens.length === 0) {
            throw new Error("No items found in order");
        }
        const itemId = orderDetails.itens[0].id;
        console.log(`Item ID: ${itemId}`);

        // 3. Force move to AGUARDANDO_EMBALE
        await new Promise((resolve, reject) => {
            db.run("UPDATE itens_pedido SET status_atual = 'AGUARDANDO_EMBALE' WHERE id = ?", [itemId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log(`Item moved to AGUARDANDO_EMBALE`);

        // 4. Test Embale Action
        const payload = {
            quantidade_volumes: 2,
            peso: 5.5,
            altura: 10,
            largura: 20,
            comprimento: 30,
            dados_volumes: JSON.stringify([
                { volume: 1, peso: 2.5, altura: 10, largura: 20, comprimento: 30 },
                { volume: 2, peso: 3.0, altura: 10, largura: 20, comprimento: 30 }
            ])
        };

        const embaleRes = await fetch(`${BASE_URL}/production/item/${itemId}/embale`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const embaleData = await embaleRes.json();
        console.log("Embale Response:", embaleData);

        // 5. Verify Status in DB
        const itemAfter = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM itens_pedido WHERE id = ?", [itemId], (err, row) => resolve(row));
        });

        console.log(`Item Status After Embale: ${itemAfter.status_atual}`);

        if (itemAfter.status_atual === 'AGUARDANDO_ENVIO') {
            console.log("SUCCESS: Transitioned to AGUARDANDO_ENVIO");
        } else {
            console.error("FAILURE: Did not transition correctly.");
        }

        // 6. Test Retirada Case
        console.log("Testing Retirada Case...");
        await new Promise((resolve, reject) => {
            db.run("UPDATE itens_pedido SET status_atual = 'AGUARDANDO_EMBALE' WHERE id = ?", [itemId], (err) => resolve());
        });

        const payloadRetirada = {
            quantidade_volumes: 1,
            peso: 0,
            altura: 0,
            largura: 0,
            comprimento: 0,
            dados_volumes: '[]'
        };

        const embaleRes2 = await fetch(`${BASE_URL}/production/item/${itemId}/embale`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadRetirada)
        });

        const itemAfter2 = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM itens_pedido WHERE id = ?", [itemId], (err, row) => resolve(row));
        });
        console.log(`Item Status After Retirada Embale: ${itemAfter2.status_atual}`);
        console.log(`Item Volumes: ${itemAfter2.quantidade_volumes}, Peso: ${itemAfter2.peso}`);

    } catch (e) {
        console.error("Test Failed:", e.message);
    }
}

runTest();
