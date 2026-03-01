
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Criar pedido dummy
    db.run("INSERT INTO pedidos (cliente, numero_pedido, prazo_entrega) VALUES (?, ?, ?)", ['Debug Client', 'DBG-001', '2025-01-01'], function (err) {
        if (err) {
            console.error("Erro ao inserir pedido:", err);
            return;
        }
        const pedidoId = this.lastID;
        console.log("Pedido criado com ID:", pedidoId);

        // 2. Inserir Item
        const produto = "Teste Item";
        const qtd = 5;
        const setor = "SILK_PLANO";

        db.run("INSERT INTO itens_pedido (pedido_id, produto, quantidade, setor_destino) VALUES (?, ?, ?, ?)", [pedidoId, produto, qtd, setor], function (err) {
            if (err) {
                console.error("Erro ao inserir item:", err);
            } else {
                console.log("Item inserido com sucesso. ID:", this.lastID);
            }
        });

        // 3. Ler de volta
        db.all("SELECT * FROM itens_pedido WHERE pedido_id = ?", [pedidoId], (err, rows) => {
            console.log("Itens no DB:", rows);
        });
    });
});
// db.close(); // Deixar aberto um pouco
