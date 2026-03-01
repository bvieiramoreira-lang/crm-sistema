const db = require('./server/database.js');

console.log("Fixing stuck items in Limbo (Digital -> Estamparia)...");

// Update any item that is AGUARDANDO_ESTAMPARIA but has wrong sector
db.run("UPDATE itens_pedido SET setor_destino = 'ESTAMPARIA' WHERE status_atual = 'AGUARDANDO_ESTAMPARIA' AND setor_destino != 'ESTAMPARIA'", function (err) {
    if (err) console.error(err);
    else console.log(`Fixed ${this.changes} items.`);
});
