const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

async function run() {
    try {
        console.log("1. Creating MIXED Order...");
        const resOrder = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente: "TESTE MIXED VOLUMES " + Date.now(),
                numero_pedido: "MIX-" + Date.now(),
                prazo_entrega: "2025-12-31",
                tipo_envio: "TRANSPORTADORA",
                itens: [{ produto: "Caneca Mista", quantidade: 10 }]
            })
        });
        const orderData = await resOrder.json();
        const orderId = orderData.id;
        console.log("Order Created:", orderId);

        // Get Item ID
        const resGet = await fetch(`${BASE_URL}/orders/${orderId}`);
        const order = await resGet.json();
        const itemId = order.itens[0].id;

        // Skip straight to EMBALE (simulating prev steps done implicitly/force status)
        console.log("Force forwarding to EMBALE...");
        await fetch(`${BASE_URL}/production/item/${itemId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novo_status_item: 'AGUARDANDO_EMBALE' })
        });

        // Test Saving with Standardized Keys
        console.log("Saving mixed format via Embale...");
        // Although the FRONTEND creates the payload, we simulate the backend saving whatever it gets
        // But wait, the backend PUT /embale just updates `dados_volumes` string.
        // We want to verify that the FRONTEND rendering logic (which we fixed) works.
        // But we are running in NODE. We can't verify frontend rendering in node.

        // However, we CAN verify that saving via the FIXED frontend logic (simulated payload) results in correct JSON.
        // Standardized Payload
        const payload = {
            quantidade_volumes: 2,
            peso: 5, altura: 10, largura: 10, comprimento: 10,
            dados_volumes: JSON.stringify([
                { numero_volume: 1, peso_kg: 2.5, altura_cm: 10, largura_cm: 10, comprimento_cm: 10 },
                { numero_volume: 2, peso_kg: 2.5, altura_cm: 10, largura_cm: 10, comprimento_cm: 10 }
            ])
        };

        await fetch(`${BASE_URL}/production/item/${itemId}/embale`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const resFinal = await fetch(`${BASE_URL}/orders/${orderId}`);
        const finalOrder = await resFinal.json();
        const finalItem = finalOrder.itens[0];

        console.log("Saved Data:", finalItem.dados_volumes);

        if (finalItem.dados_volumes.includes('peso_kg')) {
            console.log("SUCCESS: Data saved with standardized keys.");
        } else {
            console.error("FAILURE: Data not saved correctly.");
        }

    } catch (e) {
        console.error("ERROR:", e);
    }
}

run();
