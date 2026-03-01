const baseUrl = 'http://127.0.0.1:3000/api';

async function main() {
    console.log("Probing API...");

    // Check Orders List
    const res = await fetch(`${baseUrl}/orders`);
    const list = await res.json();
    console.log(`List Length: ${list.length}`);
    if (list.length > 0) console.log("First:", list[0].id, list[0].numero_pedido);

    // Check Specific IDs (from debug dump)
    const ids = [27, 28, 29, 30, 31, 32];
    for (let id of ids) {
        const r = await fetch(`${baseUrl}/orders/${id}`);
        if (r.ok) {
            const o = await r.json();
            console.log(`Found ID ${id}: ${o.numero_pedido} Status: ${o.status_geral}`);
        } else {
            console.log(`ID ${id} NOT FOUND (${r.status})`);
        }
    }

    // Check History again
    const h = await fetch(`${baseUrl}/dashboard/history?start=2026-01-29&end=2026-01-31`);
    console.log("History Status:", h.status);
    const hData = await h.json();
    console.log("History Data:", JSON.stringify(hData));
}

main().catch(console.error);
