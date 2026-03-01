
const db = require('./server/database');

console.log("Checking DB Schema via server module...");

setTimeout(() => {
    db.all("PRAGMA table_info(itens_pedido)", (err, rows) => {
        if (err) {
            console.error("Error:", err);
        } else {
            console.log("Columns:", rows.map(r => r.name).join(', '));
            const has = rows.some(r => r.name === 'dados_volumes');
            console.log("Has dados_volumes:", has);
        }
        // Force exit
        process.exit(0);
    });
}, 2000);
