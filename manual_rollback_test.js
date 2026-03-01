const fetch = require('node-fetch');

async function run() {
    console.log("Testing Rollback for Item 24...");
    try {
        const res = await fetch('http://localhost:3000/api/production/item/24/return', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_status: 'NOVO',
                observation: 'TEST_MANUAL_ROLLBACK',
                operador_id: 1
            })
        });
        const json = await res.json();
        console.log("Response:", json);
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
