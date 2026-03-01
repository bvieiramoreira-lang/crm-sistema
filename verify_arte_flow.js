
const BASE_URL = 'http://localhost:3000/api';

async function runTest() {
    console.log("Starting Arte Final Flow Verification...");

    // 1. Create Order & Item
    const timestamp = Date.now();
    const orderPayload = {
        cliente: "Arte Test Client",
        numero_pedido: `ARTE-${timestamp}`,
        prazo_entrega: "2025-05-01",
        tipo_envio: "RETIRADA",
        itens: [
            { produto: "Arte Item", quantidade: 10, setor_destino: "SILK" }
        ]
    };

    try {
        const orderRes = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });
        const orderData = await orderRes.json();
        console.log("Order Created:", orderData.id);
        const pedidoId = orderData.id;

        // Wait for item
        await new Promise(r => setTimeout(r, 1000));

        // Get Item ID (Assuming queue fetch)
        const queueRes = await fetch(`${BASE_URL}/production/itens/ARTE`);
        const queue = await queueRes.json();
        const item = queue.find(i => i.numero_pedido === orderPayload.numero_pedido);

        if (!item) throw new Error("Item not found in Arte queue");
        console.log("Item Found:", item.id);
        const itemId = item.id;

        // TEST STEP 1: Send for Approval
        console.log("Testing Step 1: Send for Approval...");
        const res1 = await fetch(`${BASE_URL}/production/item/${itemId}/arte`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ arte_status: 'AGUARDANDO_APROVACAO' })
        });
        const json1 = await res1.json();
        console.log("Step 1 Response:", json1);

        // Verify Status
        const resVerify1 = await fetch(`${BASE_URL}/production/itens/ARTE`); // Note: Logic filters != APROVADO, so it should be there
        const queueVerify1 = await resVerify1.json();
        const itemVerify1 = queueVerify1.find(i => i.id === itemId);
        if (itemVerify1.arte_status === 'AGUARDANDO_APROVACAO') {
            console.log("SUCCESS Step 1: Status updated to AGUARDANDO_APROVACAO");
        } else {
            console.error("FAILURE Step 1:", itemVerify1);
        }

        // TEST STEP 2: Upload (Mocking logic by skipping file upload, as it just sets layout_path)
        // We assume frontend handles the file upload. Backend update logic doesn't depend on it strictly for status change 
        // unless we enforced it (User plan asked: Validation requires layout. We rely on frontend validation for now).

        // TEST STEP 3: Approval with Observation
        console.log("Testing Step 3: Approve & Send...");
        const payload3 = {
            arte_status: 'APROVADO',
            cor_impressao: 'Pantone Blue',
            setor_destino: 'SILK_PLANO',
            observacao_arte: 'Test Observation Content'
        };

        const res3 = await fetch(`${BASE_URL}/production/item/${itemId}/arte`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload3)
        });
        const json3 = await res3.json();
        console.log("Step 3 Response:", json3);

        // Verify Item Moved (Should be in SILK_PLANO queue or search by ID if we had endpoint)
        // Since we don't have Get Item By ID, let's search in SILK_PLANO queue
        await new Promise(r => setTimeout(r, 1000));
        // Verify Item Moved to AGUARDANDO_SEPARACAO
        await new Promise(r => setTimeout(r, 1000));
        const resVerify3 = await fetch(`${BASE_URL}/production/itens/AGUARDANDO_SEPARACAO`);
        const queueVerify3 = await resVerify3.json();
        const itemVerify3 = queueVerify3.find(i => i.id === itemId);

        if (itemVerify3) {
            console.log("SUCCESS Step 3: Item found in AGUARDANDO_SEPARACAO.");
            // Check Obs (Note: verify if GET /itens/STATUS returns extra cols? It does use SELECT i.*)
            if (itemVerify3.observacao_arte === 'Test Observation Content') {
                console.log("SUCCESS Data: Observation saved correctly.");
            } else {
                console.error("FAILURE Data: Obs mismatch.", itemVerify3.observacao_arte);
            }
        } else {
            console.error("FAILURE Step 3. Item NOT in AGUARDANDO_SEPARACAO.");
            if (itemVerify3) console.log("Item Details:", itemVerify3);
            else {
                // Check if it's still in ARTE?
                const checkArte = (await (await fetch(`${BASE_URL}/production/itens/ARTE`)).json()).find(i => i.id === itemId);
                console.log("Item still in ARTE?", checkArte);
            }
        }

    } catch (e) {
        console.error("Test Failed:", e);
    }
}

runTest();
