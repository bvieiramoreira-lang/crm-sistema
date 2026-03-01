
const db = require('./server/database');

db.serialize(() => {
    // 1. Check existing admin
    db.get("SELECT * FROM usuarios WHERE username = 'admin'", [], (err, row) => {
        if (err) {
            console.error("Erro ao buscar admin:", err);
            return;
        }
        if (row) {
            console.log("Usuário 'admin' (lowercase) encontrado. Atualizando para 'ADMIN'...");
            db.run("UPDATE usuarios SET username = 'ADMIN' WHERE username = 'admin'", [], (err) => {
                if (err) console.error("Erro ao atualizar:", err);
                else console.log("Sucesso! Username atualizado para 'ADMIN'.");
            });
        } else {
            console.log("Usuário 'admin' (lowercase) não encontrado. Verificando 'ADMIN'...");
            db.get("SELECT * FROM usuarios WHERE username = 'ADMIN'", [], (err, row) => {
                if (row) console.log("Usuário 'ADMIN' já existe.");
                else console.log("Nenhum usuário admin encontrado.");
            });
        }
    });
});
