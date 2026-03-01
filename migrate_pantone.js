const db = require('./server/database');

db.serialize(() => {
    db.run("ALTER TABLE itens_pedido ADD COLUMN cor_impressao TEXT", (err) => {
        if (!err) console.log("Column 'cor_impressao' added.");
        else console.log("Column might already exist or error:", err.message);
    });
});
