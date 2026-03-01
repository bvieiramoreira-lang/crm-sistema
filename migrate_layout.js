const db = require('./server/database');

db.serialize(() => {
    db.run("ALTER TABLE itens_pedido ADD COLUMN layout_path TEXT", (err) => {
        if (!err) console.log("Column 'layout_path' added.");
        else console.log("Column 'layout_path' probably exists.");
    });
    db.run("ALTER TABLE itens_pedido ADD COLUMN layout_type TEXT", (err) => {
        if (!err) console.log("Column 'layout_type' added.");
        else console.log("Column 'layout_type' probably exists.");
    });
});
