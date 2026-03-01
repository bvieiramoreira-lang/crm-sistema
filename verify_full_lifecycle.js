const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

async function run() {
    try {
        console.log("1. Creating Order...");
        const resOrder = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente: "TESTE TIMESTAMP " + Date.now(),
                numero_pedido: "TEST-" + Date.now(),
                prazo_entrega: "2025-12-31",
                tipo_envio: "RETIRADA",
                itens: [{ produto: "Caneca Teste", quantidade: 10 }]
            })
        });
        const orderData = await resOrder.json();
        const orderId = orderData.id;
        console.log("Order Created:", orderId);

        // Get Item ID
        const resGet = await fetch(`${BASE_URL}/orders/${orderId}`);
        const order = await resGet.json();
        const itemId = order.itens[0].id;
        console.log("Item ID:", itemId);

        // 2. Arte Queue -> Send to Approval -> Approve
        console.log("2. Arte Flow...");
        await fetch(`${BASE_URL}/production/item/${itemId}/arte`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ arte_status: 'AGUARDANDO_APROVACAO', responsavel: 'Designer Teste' })
        });
        await fetch(`${BASE_URL}/production/item/${itemId}/arte`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                arte_status: 'APROVADO',
                setor_destino: 'SILK_PLANO',
                cor_impressao: 'Azul',
                responsavel: 'Designer Teste'
            })
        });

        // 3. Separação -> Desembale
        console.log("3. Separação...");
        await fetch(`${BASE_URL}/production/item/${itemId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novo_status_item: 'AGUARDANDO_DESEMBALE' })
        });

        // 4. Desembale -> Produção
        console.log("4. Desembale...");
        await fetch(`${BASE_URL}/production/item/${itemId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novo_status_item: 'AGUARDANDO_PRODUCAO' })
        });

        // 5. Produção (Start/End)
        console.log("5. Produção...");
        await fetch(`${BASE_URL}/production/evento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: itemId, operador_id: 1, setor: 'SILK_PLANO', acao: 'INICIO', quantidade_produzida: 0 })
        });
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s
        await fetch(`${BASE_URL}/production/evento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: itemId, operador_id: 1, setor: 'SILK_PLANO', acao: 'FIM', quantidade_produzida: 10 })
        });

        // 6. Embale -> Envio
        console.log("6. Embale...");
        await fetch(`${BASE_URL}/production/item/${itemId}/embale`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quantidade_volumes: 1, peso: 10, altura: 10, largura: 10, comprimento: 10,
                dados_volumes: JSON.stringify([{ p: 10, a: 10, l: 10, c: 10 }])
            })
        });

        // 7. Logística -> Concluir
        console.log("7. Logística...");
        await fetch(`${BASE_URL}/production/item/${itemId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novo_status_item: 'CONCLUIDO' })
        });

        // VERIFICATION
        console.log("8. Verifying Data...");
        const resFinal = await fetch(`${BASE_URL}/orders/${orderId}`);
        const finalOrder = await resFinal.json();
        const finalItem = finalOrder.itens[0];

        console.log("Status Oficial:", finalOrder.status_oficial);
        console.log("Data Arte:", finalItem.data_arte_aprovacao);
        console.log("Data Separação:", finalItem.data_separacao);
        console.log("Data Desembale:", finalItem.data_desembale);
        console.log("Data Embale:", finalItem.data_embale);
        // data_envio is set when moving to CONCLUIDO in logic? Needs check.
        // My code set 'data_envio' when moving to CONCLUIDO? NO, I missed that specific logical branch in production.js? 
        // Let's check production.js update again.

        // Log results
        if (finalItem.data_arte_aprovacao && finalItem.data_separacao && finalOrder.status_oficial === 'FINALIZADO') {
            console.log("SUCCESS: Timestamps recorded and Order Finalized.");
        } else {
            console.error("FAILURE: Missing data.");
            console.log(finalItem);
        }

    } catch (e) {
        console.error("ERROR:", e);
    }
}

run();
