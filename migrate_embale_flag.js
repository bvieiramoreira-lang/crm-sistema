const db = require('./server/database');

console.log("Adding flag_embale_sem_volumes column to itens_pedido...");

db.serialize(() => {
    db.run("ALTER TABLE itens_pedido ADD COLUMN flag_embale_sem_volumes INTEGER DEFAULT 0", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log("Column already exists.");
            } else {
                console.error("Error adding column:", err);
            }
        } else {
            console.log("Column added successfully.");
        }
    });
});

setTimeout(() => {
    process.exit(0);
}, 1000);
