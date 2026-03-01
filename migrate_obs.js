const db = require('./server/database');

db.serialize(() => {
    db.run("ALTER TABLE pedidos ADD COLUMN observacao TEXT", (err) => {
        if (err) {
            if (err.message.includes('duplicate column')) {
                console.log("Column 'observacao' already exists.");
            } else {
                console.error("Error adding column:", err.message);
            }
        } else {
            console.log("Column 'observacao' added successfully.");
        }
    });
});
