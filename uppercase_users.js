const db = require('./server/database');

console.log('[UPDATE] Convertendo logins para MAIÚSCULAS...');

db.serialize(() => {
    db.run("UPDATE usuarios SET username = UPPER(username)", function (err) {
        if (err) {
            console.error("Erro ao atualizar:", err);
            return;
        }
        console.log(`[SUCESSO] ${this.changes} logins convertidos.`);

        console.log('\n--- LISTA DE NOVOS LOGINS ---');
        db.all("SELECT username, perfil FROM usuarios", [], (err, rows) => {
            if (err) console.error(err);
            else {
                rows.forEach(r => console.log(`${r.username} (${r.perfil})`));
            }
        });
    });
});

setTimeout(() => {
    process.exit(0);
}, 2000);
