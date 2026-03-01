const db = require('./server/database');

db.serialize(() => {
    db.run("ALTER TABLE itens_pedido ADD COLUMN layout_uploaded_by INTEGER", (err) => {
        if (!err) console.log("Column 'layout_uploaded_by' added.");
    });
    db.run("ALTER TABLE itens_pedido ADD COLUMN layout_uploaded_at DATETIME", (err) => {
        if (!err) console.log("Column 'layout_uploaded_at' added.");
    });
});
