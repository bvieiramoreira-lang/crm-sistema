const db = require('./server/database');

db.serialize(() => {
    const columns = [
        "quantidade_volumes INTEGER",
        "peso REAL",
        "altura REAL",
        "largura REAL",
        "comprimento REAL"
    ];

    columns.forEach(col => {
        db.run(`ALTER TABLE pedidos ADD COLUMN ${col}`, (err) => {
            if (!err) console.log(`Column '${col.split(' ')[0]}' added.`);
            else console.log(`Column '${col.split(' ')[0]}' might exist or error: ${err.message}`);
        });
    });
});
