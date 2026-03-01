
const BASE_URL = 'http://localhost:3000/api';

async function run() {
    console.log("Testing Manual Assignment for Arte...");

    // 1. Create Order
    const orderNum = `MANUAL-${Date.now()}`;
    const orderRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cliente: "Manual Assign Test",
            numero_pedido: orderNum,
            prazo_entrega: "2025-07-01",
            tipo_envio: "RETIRADA",
            itens: [{ produto: "ItemManual", quantidade: 1, setor_destino: "SILK" }]
        })
    });

    // 2. Find Item
    await new Promise(r => setTimeout(r, 1000));
    const itemsRes = await fetch(`${BASE_URL}/production/itens/ARTE`);
    const items = await itemsRes.json();
    const item = items.find(i => i.numero_pedido === orderNum);

    if (!item) { console.error("Item not found"); return; }
    console.log("Item Found:", item.id);

    // 3. Assign Responsible manually (Dropdown simulation)
    const respName = "ManualUser";
    const assignRes = await fetch(`${BASE_URL}/production/item/${item.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sector: 'arte',
            responsavel: respName
        })
    });
    console.log("Assign Response:", assignRes.status);

    // 4. Verify Persistence
    await new Promise(r => setTimeout(r, 500));
    const verifyRes = await fetch(`${BASE_URL}/production/itens/ARTE`);
    const verifyItems = await verifyRes.json();
    const verified = verifyItems.find(i => i.id === item.id);

    console.log("Verified Responsavel:", verified.responsavel_arte);

    if (verified && verified.responsavel_arte === respName) {
        console.log("SUCCESS_VERIFIED");
    } else {
        console.log("FAILURE_VERIFIED");
    }
}

run();
