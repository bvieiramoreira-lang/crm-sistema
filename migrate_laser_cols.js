const db = require('./server/database');

const columns = [
    "ALTER TABLE itens_pedido ADD COLUMN arquivo_impressao_laser_url TEXT;",
    "ALTER TABLE itens_pedido ADD COLUMN arquivo_impressao_laser_nome TEXT;",
    "ALTER TABLE itens_pedido ADD COLUMN arquivo_impressao_laser_tipo TEXT;",
    "ALTER TABLE itens_pedido ADD COLUMN arquivo_impressao_laser_enviado_por TEXT;",
    "ALTER TABLE itens_pedido ADD COLUMN arquivo_impressao_laser_enviado_em DATETIME;"
];

db.serialize(() => {
    columns.forEach(cmd => {
        db.run(cmd, (err) => {
            if (err) {
                if (err.message.includes("duplicate column")) {
                    console.log("Coluna já existe (ignorado):", cmd);
                } else {
                    console.error("Erro ao adicionar coluna:", err.message);
                }
            } else {
                console.log("Coluna adicionada com sucesso:", cmd);
            }
        });
    });
});
