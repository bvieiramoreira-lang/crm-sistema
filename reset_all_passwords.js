const db = require('./server/database');
const bcrypt = require('bcrypt');

const NEW_PASSWORD = '123';

console.log(`[RESET] Iniciando reset de TODAS as senhas para: '${NEW_PASSWORD}' ...`);

const hash = bcrypt.hashSync(NEW_PASSWORD, 10);

db.serialize(() => {
    // 1. Update all passwords
    db.run("UPDATE usuarios SET senha = ?", [hash], function (err) {
        if (err) {
            console.error("Erro ao atualizar senhas:", err);
            return;
        }
        console.log(`[SUCESSO] ${this.changes} usuários atualizados.`);

        // 2. List all users
        console.log('\n--- LISTA DE ACESSO ATUALIZADA ---');
        console.log('SENHA PADRÃO PARA TODOS: 123');
        console.log('------------------------------------------------');

        db.all("SELECT nome, username, perfil FROM usuarios", [], (err, rows) => {
            if (err) console.error(err);
            else {
                rows.forEach(row => {
                    console.log(`LOGIN: ${row.username.padEnd(15)} | PERFIL: ${row.perfil.padEnd(10)} | NOME: ${row.nome}`);
                });
            }
            console.log('------------------------------------------------');
        });
    });
});

setTimeout(() => {
    process.exit(0);
}, 3000);
