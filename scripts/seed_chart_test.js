const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../sp_system.db');
const db = new sqlite3.Database(dbPath);

const today = new Date().toISOString().replace('T', ' ').split('.')[0];
// Yesterday
const d = new Date();
d.setDate(d.getDate() - 1);
const yesterday = d.toISOString().replace('T', ' ').split('.')[0];

db.serialize(() => {
    // 1. Create Dummy Orders (WITHOUT descricao)
    db.run(`INSERT OR IGNORE INTO pedidos (numero_pedido, cliente, status_geral, prazo_entrega) VALUES (99901, 'TESTE CHART 1', 'FINALIZADO', ?)`, [today]);
    db.run(`INSERT OR IGNORE INTO pedidos (numero_pedido, cliente, status_geral, prazo_entrega) VALUES (99902, 'TESTE CHART 2', 'FINALIZADO', ?)`, [yesterday]);

    // 2. Insert History. We use IGNORE here too or just INSERT if we want duplicates? 
    // Let's delete existing history for these test orders first to be clean.
    db.run(`DELETE FROM historico_pedidos WHERE pedido_id IN (SELECT id FROM pedidos WHERE numero_pedido IN (99901, 99902))`);

    // Order 99901 (Today)
    db.run(`INSERT INTO historico_pedidos (pedido_id, campo_alterado, valor_antigo, valor_novo, data_alteracao, usuario_id) 
            VALUES ((SELECT id FROM pedidos WHERE numero_pedido=99901), 'status_geral', 'EM_PRODUCAO', 'FINALIZADO', ?, 1)`, [today]);

    db.run(`INSERT INTO historico_pedidos (pedido_id, campo_alterado, valor_antigo, valor_novo, data_alteracao, usuario_id) 
            VALUES ((SELECT id FROM pedidos WHERE numero_pedido=99902), 'status_geral', 'EM_PRODUCAO', 'FINALIZADO', ?, 1)`, [yesterday]);

    // 3. Insert Pending Print Items
    db.run(`INSERT OR IGNORE INTO pedidos (numero_pedido, cliente, status_geral, prazo_entrega) VALUES (99903, 'TESTE PRINT 1', 'EM_PRODUCAO', ?)`, [today]);
    db.run(`INSERT OR IGNORE INTO pedidos (numero_pedido, cliente, status_geral, prazo_entrega) VALUES (99904, 'TESTE PRINT 2', 'EM_PRODUCAO', ?)`, [today]);

    // Item 1: Digital
    db.run(`INSERT INTO itens_pedido (pedido_id, produto, quantidade, setor_destino, status_atual) VALUES ((SELECT id FROM pedidos WHERE numero_pedido=99903), 'Banner', 2, 'IMPRESSAO_DIGITAL', 'AGUARDANDO_PRODUCAO')`);
    // Item 2: Laser
    db.run(`INSERT INTO itens_pedido (pedido_id, produto, quantidade, setor_destino, status_atual) VALUES ((SELECT id FROM pedidos WHERE numero_pedido=99904), 'Corte', 50, 'IMPRESSAO_LASER', 'AGUARDANDO_PRODUCAO')`);
    // Item 3: Laser (another one)
    db.run(`INSERT INTO itens_pedido (pedido_id, produto, quantidade, setor_destino, status_atual) VALUES ((SELECT id FROM pedidos WHERE numero_pedido=99903), 'Gravacao', 10, 'IMPRESSAO_LASER', 'AGUARDANDO_PRODUCAO')`);

    // 4. Insert Production Events for Reports
    const opId = 1; // Admin user
    // Get the item ID we just inserted for 99903
    db.get("SELECT id FROM itens_pedido WHERE pedido_id = (SELECT id FROM pedidos WHERE numero_pedido=99903)", [], (err, row) => {
        if (row) {
            const iId = row.id;
            // Start 1 hour ago
            db.run(`INSERT INTO eventos_producao (item_id, operador_id, setor, acao, timestamp, quantidade_produzida) 
                     VALUES (?, ?, 'IMPRESSAO_DIGITAL', 'INICIO', datetime('now', '-60 minutes'), 0)`, [iId, opId]);
            // End now (took 60 mins)
            db.run(`INSERT INTO eventos_producao (item_id, operador_id, setor, acao, timestamp, quantidade_produzida) 
                     VALUES (?, ?, 'IMPRESSAO_DIGITAL', 'FIM', datetime('now'), 2)`, [iId, opId], (err) => {
                if (err) console.error(err);
                console.log("Dados de teste inseridos: Eventos de Produção (Relatório).");
                db.close();
            });
        } else {
            console.warn("Item not found, skipping events.");
            db.close();
        }
    });

});
