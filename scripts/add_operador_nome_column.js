
const db = require('../server/database');

console.log("Iniciando migracao: Adicionar operador_nome em eventos_producao...");

db.serialize(() => {
    // Tenta adicionar a coluna. Se falhar (já existe), ignora erro.
    db.run("ALTER TABLE eventos_producao ADD COLUMN operador_nome TEXT", (err) => {
        if (err && err.message.includes("duplicate column")) {
            console.log("Coluna operador_nome ja existe.");
        } else if (err) {
            console.error("Erro ao adicionar coluna:", err);
        } else {
            console.log("Coluna operador_nome adicionada com sucesso!");
        }
    });
});
