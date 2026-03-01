
const BASE_URL = 'http://localhost:3000/api';

async function run() {
    console.log("Testing Arte Observation Persistence...");

    // 1. Create Order
    const orderNum = `OBS-${Date.now()}`;
    const orderRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cliente: "Obs Test",
            numero_pedido: orderNum,
            prazo_entrega: "2025-06-01",
            tipo_envio: "RETIRADA",
            itens: [{ produto: "ItemObs", quantidade: 5, setor_destino: "SILK" }]
        })
    });
    const order = await orderRes.json();
    console.log("Order Created:", order.id, "Num:", orderNum);

    // 2. Find Item
    await new Promise(r => setTimeout(r, 1000));
    const itemsRes = await fetch(`${BASE_URL}/production/itens/ARTE`);
    const items = await itemsRes.json();
    const item = items.find(i => i.numero_pedido === orderNum);

    if (!item) {
        console.error("Item not found in ARTE queue by number:", orderNum);
        console.log("Available:", items.map(i => i.numero_pedido));
        return;
    }
    console.log("Item Found:", item.id);

    // 3. Update Arte with Obs
    const obsText = "My Critical Observation";
    console.log("Updating item...");
    const updateRes = await fetch(`${BASE_URL}/production/item/${item.id}/arte`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            arte_status: 'APROVADO',
            setor_destino: 'SILK_PLANO',
            cor_impressao: 'Red',
            observacao_arte: obsText,
            responsavel: 'TestUser'
        })
    });
    console.log("Update Status:", updateRes.status);
    const updateJson = await updateRes.json();
    console.log("Update Response:", updateJson);

    // 4. Verify
    await new Promise(r => setTimeout(r, 1000));
    // Check in Separação
    const sepRes = await fetch(`${BASE_URL}/production/itens/AGUARDANDO_SEPARACAO`);
    const sepItems = await sepRes.json();
    const verifiedItem = sepItems.find(i => i.id === item.id);

    if (verifiedItem) {
        console.log("Verified Item Obs:", verifiedItem.observacao_arte);
        console.log("Verified Responsavel:", verifiedItem.responsavel_arte);

        if (verifiedItem.observacao_arte === obsText && verifiedItem.responsavel_arte === 'TestUser') {
            console.log("SUCCESS: Observation and Responsible persisted.");
        } else {
            console.error("FAILURE: Mismatch.", verifiedItem);
        }
    } else {
        console.error("Item not found in Separação queue");
    }
}

run();
