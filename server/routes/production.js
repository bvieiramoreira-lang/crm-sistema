const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');

// Listar Itens por Contexto (Setor ou Status)
// GET /api/production/itens/:contexto
// Query param: ?future=true (para buscar itens que virão para este setor)
router.get('/itens/:contexto', (req, res) => {
    const contexto = req.params.contexto;
    const isFuture = req.query.future === 'true';

    // Sequencia de Status (Fluxo Linear)
    const statusSequence = {
        'ARTE_NAO_FEITA': 0,
        'AGUARDANDO_APROVACAO': 0,
        'ARTE_APROVADA': 0, // Tecnicamente 0, mas gatilho para 1
        'AGUARDANDO_SEPARACAO': 1,
        'AGUARDANDO_DESEMBALE': 2,
        'AGUARDANDO_PRODUCAO': 3,
        'EM_PRODUCAO': 3,
        'AGUARDANDO_EMBALE': 4,
        'AGUARDANDO_ENVIO': 5,
        'CONCLUIDO': 6
    };

    // Mapeamento Contexto -> Sequencia
    let contextSequence = 0;
    if (contexto === 'AGUARDANDO_SEPARACAO') contextSequence = 1;
    else if (contexto === 'AGUARDANDO_DESEMBALE') contextSequence = 2;
    else if (contexto === 'AGUARDANDO_EMBALE') contextSequence = 4;
    else if (contexto === 'AGUARDANDO_ENVIO') contextSequence = 5;
    else if (['SILK_PLANO', 'SILK_CILINDRICA', 'TAMPOGRAFIA', 'IMPRESSAO_LASER', 'IMPRESSAO_DIGITAL', 'ESTAMPARIA'].includes(contexto)) {
        contextSequence = 3; // Produção
    }

    let query = '';
    let params = [];

    // SELECT BASE (Com joins comuns)
    const baseSelect = `
        SELECT i.*, 
        CAST(
            COALESCE(i.segundos_acumulados_producao, 0) + 
            CASE 
                WHEN i.is_pausado_producao = 1 THEN 0
                WHEN i.status_atual = 'EM_PRODUCAO' THEN 
                    CAST(strftime('%s', 'now') - strftime('%s', ev_ini.timestamp) AS INTEGER)
                WHEN ev_fim.timestamp IS NOT NULL THEN
                    CAST(strftime('%s', ev_fim.timestamp) - strftime('%s', ev_ini.timestamp) AS INTEGER)
                ELSE 0
            END 
        AS INTEGER) as decorrido_segundos,
        ev_ini.timestamp as inicio_producao_timestamp,
        ev_fim.timestamp as fim_producao_timestamp,
        p.numero_pedido, p.cliente, p.prazo_entrega, p.tipo_envio, p.transportadora, p.observacao 
        FROM itens_pedido i
        JOIN pedidos p ON i.pedido_id = p.id
        LEFT JOIN eventos_producao ev_ini ON ev_ini.id = (
            SELECT id FROM eventos_producao 
            WHERE item_id = i.id AND acao IN ('INICIO', 'RETOMADA') 
            ORDER BY id DESC LIMIT 1
        )
        LEFT JOIN eventos_producao ev_fim ON ev_fim.id = (
            SELECT id FROM eventos_producao 
            WHERE item_id = i.id AND acao = 'FIM' 
            ORDER BY id DESC LIMIT 1
        )
    `;

    if (contexto === 'ARTE') {
        // Arte não tem "Full Flow" visivel de outros setores ainda, 
        // e nada vem "antes" da Arte a não ser Financeiro (que não é setor de produção listado aqui)
        // Mantemos lógica original
        query = `${baseSelect} WHERE i.arte_status != 'APROVADO' AND i.status_atual != 'CANCELADO' ORDER BY CASE WHEN p.prazo_entrega IS NULL OR p.prazo_entrega = '' THEN 1 ELSE 0 END, p.prazo_entrega ASC`;
    }
    else if (isFuture) {
        // LOGICA DE VISUALIZAÇÃO FUTURA
        // Buscamos itens onde o status atual tem sequência MENOR que o contexto atual
        // MAS que já passaram da Arte (sequence >= 1)
        // E, se for produção, tem que ser do setor correto

        let extraCondition = '';

        // Se for setor de produção específico, filtrar pelo setor_destino
        // Se for setor de produção específico, filtrar pelo setor_destino
        if (['SILK_PLANO', 'SILK_CILINDRICA', 'TAMPOGRAFIA', 'IMPRESSAO_LASER'].includes(contexto)) {
            extraCondition = `AND i.setor_destino = '${contexto}'`;
        } else if (contexto === 'IMPRESSAO_DIGITAL') {
            extraCondition = `AND i.setor_destino = 'IMPRESSAO_DIGITAL'`;
        } else if (contexto === 'ESTAMPARIA') {
            // Complex Logic: 
            // 1. Own Future items (Low Sequence) -> Setor Estamparia
            // 2. Digital Items (Current Sequence) -> Setor Digital
            // 3. Exclude Own Active Items (Setor Estamparia + Seq 3) to avoid duplication
            extraCondition = `AND ( 
                (i.setor_destino = 'ESTAMPARIA' AND i.status_atual NOT IN ('AGUARDANDO_PRODUCAO', 'EM_PRODUCAO')) 
                OR 
                (i.setor_destino = 'IMPRESSAO_DIGITAL') 
            )`;
        }

        // Montar CLAUSULA WHERE baseada no array de status permitidos (lower sequence)
        // Simplificação SQL: Pegar todos e filtrar no JS ou fazer CASE WHEN?
        // Vamos fazer query com Status IN (...)

        // Quais status tem sequence < contextSequence E sequence >= 1 ?
        const allowedStatuses = Object.keys(statusSequence).filter(s => {
            const seq = statusSequence[s];
            return seq >= 1 && seq < contextSequence;
        });

        // FIX: ESTAMPARIA: Force inclusion of Production Statuses (Seq 3) to see Digital Items
        if (contexto === 'ESTAMPARIA') {
            allowedStatuses.push('AGUARDANDO_PRODUCAO', 'EM_PRODUCAO');
        }

        if (allowedStatuses.length === 0) {
            return res.json([]);
        }

        const placeholders = allowedStatuses.map(() => '?').join(',');
        query = `${baseSelect} WHERE i.status_atual IN (${placeholders}) ${extraCondition} ORDER BY CASE WHEN p.prazo_entrega IS NULL OR p.prazo_entrega = '' THEN 1 ELSE 0 END, p.prazo_entrega ASC`;
        params = allowedStatuses;

    } else {
        // LOGICA PADRÃO (EXECUÇÃO)
        if (['AGUARDANDO_SEPARACAO', 'AGUARDANDO_DESEMBALE', 'AGUARDANDO_EMBALE', 'AGUARDANDO_ENVIO'].includes(contexto)) {
            query = `${baseSelect} WHERE i.status_atual = ? ORDER BY CASE WHEN p.prazo_entrega IS NULL OR p.prazo_entrega = '' THEN 1 ELSE 0 END, p.prazo_entrega ASC`;
            params = [contexto];
        } else {
            // Filas de Setor de Produção
            query = `${baseSelect} WHERE i.setor_destino = ? AND (i.status_atual = 'AGUARDANDO_PRODUCAO' OR i.status_atual = 'EM_PRODUCAO') ORDER BY CASE WHEN p.prazo_entrega IS NULL OR p.prazo_entrega = '' THEN 1 ELSE 0 END, p.prazo_entrega ASC`;
            params = [contexto];
        }
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (rows.length === 0) {
            return res.json([]);
        }

        const orderIds = [...new Set(rows.map(r => r.pedido_id))];
        const placeholders = orderIds.map(() => '?').join(',');
        
        db.all(`SELECT pt.pedido_id, t.id, t.nome, t.cor 
                FROM pedido_tags pt 
                JOIN tags t ON pt.tag_id = t.id 
                WHERE pt.pedido_id IN (${placeholders})`, orderIds, (errTags, tagRows) => {
            if (errTags) {
                console.error("Erro ao carregar tags de itens de produção:", errTags);
                return res.json(rows);
            }

            const tagsByOrder = new Map();
            tagRows.forEach(tag => {
                if (!tagsByOrder.has(tag.pedido_id)) tagsByOrder.set(tag.pedido_id, []);
                tagsByOrder.get(tag.pedido_id).push({ id: tag.id, nome: tag.nome, cor: tag.cor });
            });

            const rowsWithTags = rows.map(row => ({
                ...row,
                tags: tagsByOrder.get(row.pedido_id) || []
            }));

            res.json(rowsWithTags);
        });
    });
});

// GET todos os itens ativos de um pedido na Arte
router.get('/pedido/:pedidoId/itens', (req, res) => {
    const pedidoId = req.params.pedidoId;
    const query = `
        SELECT i.*, p.numero_pedido, p.cliente, p.prazo_entrega, p.tipo_envio, p.transportadora, p.observacao as obs_pedido
        FROM itens_pedido i
        JOIN pedidos p ON i.pedido_id = p.id
        WHERE i.pedido_id = ? AND i.arte_status != 'APROVADO' AND i.status_atual != 'CANCELADO'
    `;
    db.all(query, [pedidoId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.json([]);

        db.all(`SELECT t.id, t.nome, t.cor 
                FROM pedido_tags pt 
                JOIN tags t ON pt.tag_id = t.id 
                WHERE pt.pedido_id = ?`, [pedidoId], (errTags, tagRows) => {
            if (errTags) {
                console.error("Erro ao carregar tags do pedido:", errTags);
                return res.json(rows);
            }
            const rowsWithTags = rows.map(row => ({
                ...row,
                tags: tagRows || []
            }));
            res.json(rowsWithTags);
        });
    });
});

// GET Single Item (Detalhes completos)
router.get('/item/:id', (req, res) => {
    const id = req.params.id;
    const query = `
        SELECT i.*, p.numero_pedido, p.cliente, p.prazo_entrega, p.tipo_envio, p.transportadora, p.observacao as obs_pedido
        FROM itens_pedido i
        JOIN pedidos p ON i.pedido_id = p.id
        WHERE i.id = ?
    `;
    db.get(query, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Item não encontrado' });
        
        db.all(`SELECT t.id, t.nome, t.cor 
                FROM pedido_tags pt 
                JOIN tags t ON pt.tag_id = t.id 
                WHERE pt.pedido_id = ?`, [row.pedido_id], (errTags, tagRows) => {
            if (errTags) {
                console.error("Erro ao carregar tags do item:", errTags);
                return res.json(row);
            }
            row.tags = tagRows || [];
            res.json(row);
        });
    });
});

// Atualizar Arte e Setor (Da Fila de Arte -> Aguardando Separação)
router.put('/item/:id/arte', (req, res) => {
    const { arte_status, setor_destino, cor_impressao, observacao_arte, responsavel, operador_id, is_alteracao, motivo_reprovacao } = req.body;
    const itemId = req.params.id;

    if (arte_status === 'AGUARDANDO_INFO') {
        db.run(
            `UPDATE itens_pedido SET arte_status = 'AGUARDANDO_INFO' WHERE id = ?`,
            [itemId],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Item movido para Aguardando Informações', changes: this.changes });
            }
        );
    } else if (arte_status === 'PRONTO_PARA_CRIAR') {
        if (is_alteracao || is_alteracao === 1) {
            const note = motivo_reprovacao ? `[Alteração em ${new Date().toLocaleDateString('pt-BR')}]: ${motivo_reprovacao}` : '';
            db.run(
                `UPDATE itens_pedido SET 
                    arte_status = 'PRONTO_PARA_CRIAR', 
                    is_alteracao = 1, 
                    responsavel_arte = NULL, 
                    data_inicio_arte = NULL, 
                    data_entrada_arte = DATETIME('now', 'localtime'),
                    observacao_arte = CASE 
                        WHEN observacao_arte IS NULL OR observacao_arte = '' THEN ? 
                        ELSE observacao_arte || '\n' || ? 
                    END
                 WHERE id = ?`,
                [note, note, itemId],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    db.run(
                        `INSERT INTO eventos_producao (item_id, operador_id, operador_nome, setor, acao) VALUES (?, ?, ?, 'ARTE_FINAL', 'REPROVACAO')`,
                        [itemId, operador_id || null, responsavel || null]
                    );
                    res.json({ message: 'Layout reprovado. Item enviado para Fila de Alterações.', changes: this.changes });
                }
            );
        } else {
            db.run(
                `UPDATE itens_pedido SET arte_status = 'PRONTO_PARA_CRIAR' WHERE id = ?`,
                [itemId],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Item pronto para criação de arte', changes: this.changes });
                }
            );
        }
    } else if (arte_status === 'EM_DESENVOLVIMENTO') {
        db.get("SELECT COUNT(*) as count FROM itens_pedido WHERE arte_status = 'EM_DESENVOLVIMENTO' AND status_atual != 'CANCELADO'", [], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row && row.count >= 10) {
                return res.status(400).json({ error: 'Limite Kanban WIP atingido. Máximo de 10 artes podem estar em desenvolvimento simultaneamente.' });
            }

            db.run(
                `UPDATE itens_pedido SET arte_status = 'EM_DESENVOLVIMENTO', responsavel_arte = ?, data_inicio_arte = DATETIME('now', 'localtime') WHERE id = ?`,
                [responsavel, itemId],
                function (err2) {
                    if (err2) return res.status(500).json({ error: err2.message });
                    db.run(
                        `INSERT INTO eventos_producao (item_id, operador_id, operador_nome, setor, acao) VALUES (?, ?, ?, 'ARTE_FINAL', 'INICIO')`,
                        [itemId, operador_id || null, responsavel || null]
                    );
                    res.json({ message: 'Arte iniciada com sucesso', changes: this.changes });
                }
            );
        });
    } else if (arte_status === 'AGUARDANDO_APROVACAO') {
        db.run(
            `UPDATE itens_pedido SET arte_status = 'AGUARDANDO_APROVACAO' WHERE id = ?`,
            [itemId],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                db.run(
                    `INSERT INTO eventos_producao (item_id, operador_id, operador_nome, setor, acao) VALUES (?, ?, ?, 'ARTE_FINAL', 'FIM')`,
                    [itemId, operador_id || null, responsavel || null]
                );
                res.json({ message: 'Item enviado para aprovação do cliente', changes: this.changes });
            }
        );
    } else if (arte_status === 'APROVADO') {
        if (!cor_impressao || cor_impressao.trim() === '') {
            return res.status(400).json({ error: 'Preencha a Cor de Impressão / Pantone antes de aprovar.' });
        }

        const respSQL = responsavel ? ', responsavel_arte = ?' : '';
        const query = `UPDATE itens_pedido SET 
            arte_status = 'APROVADO', 
            setor_destino = ?, 
            cor_impressao = ?, 
            observacao_arte = ?, 
            status_atual = 'AGUARDANDO_SEPARACAO', 
            data_arte_aprovacao = DATETIME('now', 'localtime') 
            ${respSQL} 
            WHERE id = ?`;

        const params = [setor_destino, cor_impressao, observacao_arte || null];
        if (responsavel) params.push(responsavel);
        params.push(itemId);

        db.run(query, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Arte aprovada e enviada para Separação/Produção', changes: this.changes });
        });
    } else {
        db.run(`UPDATE itens_pedido SET arte_status = ? WHERE id = ?`, [arte_status, itemId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Arte atualizada (fallback)', changes: this.changes });
        });
    }
});

// Atualizar Status do Pedido na Arte em Lote
router.put('/pedido/:pedidoId/status', (req, res) => {
    const { arte_status, responsavel, operador_id } = req.body;
    const pedidoId = req.params.pedidoId;

    if (arte_status === 'AGUARDANDO_INFO') {
        db.run(
            `UPDATE itens_pedido SET arte_status = 'AGUARDANDO_INFO' WHERE pedido_id = ? AND arte_status != 'APROVADO' AND status_atual != 'CANCELADO'`,
            [pedidoId],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Pedido movido para Aguardando Informações', changes: this.changes });
            }
        );
    } else if (arte_status === 'PRONTO_PARA_CRIAR') {
        db.run(
            `UPDATE itens_pedido SET arte_status = 'PRONTO_PARA_CRIAR' WHERE pedido_id = ? AND arte_status != 'APROVADO' AND status_atual != 'CANCELADO'`,
            [pedidoId],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Pedido pronto para criação de arte', changes: this.changes });
            }
        );
    } else if (arte_status === 'EM_DESENVOLVIMENTO') {
        db.get("SELECT COUNT(DISTINCT pedido_id) as count FROM itens_pedido WHERE arte_status = 'EM_DESENVOLVIMENTO' AND status_atual != 'CANCELADO' AND pedido_id != ?", [pedidoId], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row && row.count >= 10) {
                return res.status(400).json({ error: 'Limite Kanban WIP atingido. Máximo de 10 pedidos podem estar em desenvolvimento simultaneamente.' });
            }

            db.run(
                `UPDATE itens_pedido SET arte_status = 'EM_DESENVOLVIMENTO', responsavel_arte = ?, data_inicio_arte = COALESCE(data_inicio_arte, DATETIME('now', 'localtime')) WHERE pedido_id = ? AND arte_status != 'APROVADO' AND status_atual != 'CANCELADO'`,
                [responsavel, pedidoId],
                function (err2) {
                    if (err2) return res.status(500).json({ error: err2.message });
                    
                    db.all(`SELECT id FROM itens_pedido WHERE pedido_id = ? AND arte_status = 'EM_DESENVOLVIMENTO'`, [pedidoId], (err3, items) => {
                        if (!err3 && items) {
                            db.serialize(() => {
                                items.forEach(item => {
                                    db.run(
                                        `INSERT INTO eventos_producao (item_id, operador_id, operador_nome, setor, acao) VALUES (?, ?, ?, 'ARTE_FINAL', 'INICIO')`,
                                        [item.id, operador_id || null, responsavel || null]
                                    );
                                });
                            });
                        }
                    });

                    res.json({ message: 'Desenvolvimento de arte iniciado para o pedido', changes: this.changes });
                }
            );
        });
    } else if (arte_status === 'AGUARDANDO_APROVACAO') {
        db.run(
            `UPDATE itens_pedido SET arte_status = 'AGUARDANDO_APROVACAO' WHERE pedido_id = ? AND arte_status != 'APROVADO' AND status_atual != 'CANCELADO'`,
            [pedidoId],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                
                db.all(`SELECT id, responsavel_arte FROM itens_pedido WHERE pedido_id = ? AND status_atual != 'CANCELADO'`, [pedidoId], (err3, items) => {
                    if (!err3 && items) {
                        db.serialize(() => {
                            items.forEach(item => {
                                db.run(
                                    `INSERT INTO eventos_producao (item_id, operador_id, operador_nome, setor, acao) VALUES (?, ?, ?, 'ARTE_FINAL', 'FIM')`,
                                    [item.id, operador_id || null, item.responsavel_arte || null]
                                );
                            });
                        });
                    }
                });

                res.json({ message: 'Pedido enviado para aprovação', changes: this.changes });
            }
        );
    } else {
        db.run(
            `UPDATE itens_pedido SET arte_status = ? WHERE pedido_id = ? AND arte_status != 'APROVADO' AND status_atual != 'CANCELADO'`,
            [arte_status, pedidoId],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Status do pedido atualizado (fallback)', changes: this.changes });
            }
        );
    }
});

// Atribuir Responsável da Arte em Lote
router.put('/pedido/:pedidoId/assign', (req, res) => {
    const { responsavel } = req.body;
    const pedidoId = req.params.pedidoId;

    db.run(
        `UPDATE itens_pedido SET responsavel_arte = ? WHERE pedido_id = ? AND arte_status != 'APROVADO' AND status_atual != 'CANCELADO'`,
        [responsavel, pedidoId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Responsável atribuído com sucesso ao pedido', changes: this.changes });
        }
    );
});

// Reprovar Arte do Pedido em Lote
router.put('/pedido/:pedidoId/reprovar', (req, res) => {
    const { motivo_reprovacao, operador_id } = req.body;
    const pedidoId = req.params.pedidoId;
    const note = motivo_reprovacao ? `[Reprovação em ${new Date().toLocaleDateString('pt-BR')}]: ${motivo_reprovacao}` : '';

    db.serialize(() => {
        db.run(
            `UPDATE itens_pedido SET 
                arte_status = 'PRONTO_PARA_CRIAR', 
                is_alteracao = 1, 
                responsavel_arte = NULL, 
                data_inicio_arte = NULL, 
                data_entrada_arte = DATETIME('now', 'localtime'),
                observacao_arte = CASE 
                    WHEN observacao_arte IS NULL OR observacao_arte = '' THEN ? 
                    ELSE observacao_arte || '\n' || ? 
                END
             WHERE pedido_id = ? AND arte_status != 'APROVADO' AND status_atual != 'CANCELADO'`,
            [note, note, pedidoId],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                const changes = this.changes;

                db.all(`SELECT id FROM itens_pedido WHERE pedido_id = ? AND status_atual != 'CANCELADO'`, [pedidoId], (err3, items) => {
                    if (!err3 && items) {
                        items.forEach(item => {
                            db.run(
                                `INSERT INTO eventos_producao (item_id, operador_id, operador_nome, setor, acao) VALUES (?, ?, ?, 'ARTE_FINAL', 'REPROVACAO')`,
                                [item.id, operador_id || null, null]
                            );
                        });
                    }
                });

                res.json({ message: 'Pedido reprovado e enviado para Fila de Alterações', changes });
            }
        );
    });
});

// Aprovar Arte do Pedido em Lote (Roteamento Individual por Item)
router.put('/pedido/:pedidoId/aprovar', (req, res) => {
    const { itens } = req.body; // Array de { id, setor_destino, cor_impressao, observacao_arte, responsavel }
    const pedidoId = req.params.pedidoId;

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ error: 'Nenhum item enviado para aprovação.' });
    }

    db.serialize(() => {
        let errors = [];
        let completed = 0;

        itens.forEach(item => {
            if (!item.cor_impressao || item.cor_impressao.trim() === '') {
                errors.push({ id: item.id, error: 'Preencha a Cor de Impressão antes de aprovar.' });
                completed++;
                if (completed === itens.length) {
                    return res.status(400).json({ error: 'Existem campos obrigatórios em branco.', details: errors });
                }
                return;
            }

            const respSQL = item.responsavel ? ', responsavel_arte = ?' : '';
            const query = `UPDATE itens_pedido SET 
                arte_status = 'APROVADO', 
                setor_destino = ?, 
                cor_impressao = ?, 
                observacao_arte = ?, 
                status_atual = 'AGUARDANDO_SEPARACAO', 
                data_arte_aprovacao = DATETIME('now', 'localtime') 
                ${respSQL} 
                WHERE id = ? AND pedido_id = ?`;

            const params = [item.setor_destino, item.cor_impressao, item.observacao_arte || null];
            if (item.responsavel) params.push(item.responsavel);
            params.push(item.id, pedidoId);

            db.run(query, params, function (err) {
                if (err) {
                    errors.push({ id: item.id, error: err.message });
                }
                completed++;
                if (completed === itens.length) {
                    if (errors.length > 0) {
                        res.status(500).json({ error: 'Alguns itens não puderam ser aprovados.', details: errors });
                    } else {
                        res.json({ message: 'Todos os itens do pedido foram aprovados com sucesso!' });
                    }
                }
            });
        });
    });
});

// Reverter Pedido Completo de volta para Fila de Arte (Aguardando Aprovação)
router.put('/pedido/:pedidoId/reverter-arte', (req, res) => {
    const pedidoId = req.params.pedidoId;
    const { operador_id } = req.body;

    console.log(`[REVERT-ART-ORDER] Reverting entire order ${pedidoId} to Fila de Arte (Aguardando Aprovação) by Operator: ${operador_id}`);

    db.serialize(() => {
        // Reset status_atual to 'AGUARDANDO_ARTE'
        // Reset arte_status to 'AGUARDANDO_APROVACAO' (Aguardando Aprovação)
        // Keep responsavel_arte and uploaded files as per user's specifications
        const sqlUpdate = `
            UPDATE itens_pedido SET 
                status_atual = 'AGUARDANDO_ARTE',
                arte_status = 'AGUARDANDO_APROVACAO',
                is_alteracao = 1,
                data_arte_aprovacao = NULL
            WHERE pedido_id = ? AND status_atual != 'CANCELADO'
        `;

        db.run(sqlUpdate, [pedidoId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const changes = this.changes;

            // Log event in events history for each item in the order
            db.all(`SELECT id FROM itens_pedido WHERE pedido_id = ? AND status_atual != 'CANCELADO'`, [pedidoId], (err3, items) => {
                if (!err3 && items) {
                    items.forEach(item => {
                        db.run(
                            `INSERT INTO eventos_producao (item_id, operador_id, operador_nome, setor, acao) VALUES (?, ?, ?, 'ARTE_FINAL', 'RETORNO')`,
                            [item.id, operador_id || null, null]
                        );
                    });
                }
            });

            res.json({ message: 'Pedido revertido com sucesso para a Fila de Arte (Aguardando Aprovação)', changes });
        });
    });
});


// Atualizar Status Genérico do Item (Movimentação entre filas)
router.put('/item/:id/status', (req, res) => {
    const { novo_status_item, operador_id } = req.body;
    const itemId = req.params.id;

    // Map status to timestamp column
    let timestampCol = null;
    let extraCols = "";

    if (novo_status_item === 'AGUARDANDO_DESEMBALE') timestampCol = 'data_separacao';
    else if (novo_status_item === 'AGUARDANDO_PRODUCAO') timestampCol = 'data_desembale';
    else if (novo_status_item === 'CONCLUIDO') {
        timestampCol = 'data_envio';
    }

    // Logic for generic moves
    let query = `UPDATE itens_pedido SET status_atual = ? WHERE id = ?`;
    if (timestampCol) {
        query = `UPDATE itens_pedido SET status_atual = ?, ${timestampCol} = DATETIME('now', 'localtime') ${extraCols} WHERE id = ?`;
    }

    db.serialize(() => {
        // 1. Update Item Status
        db.run(query, [novo_status_item, itemId], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const changes = this.changes;

            // 2. ONLY if marking as CONCLUIDO, check if whole order is finished
            if (novo_status_item === 'CONCLUIDO') {
                db.get("SELECT pedido_id FROM itens_pedido WHERE id = ?", [itemId], (err, itemRow) => {
                    if (err || !itemRow) return res.json({ message: 'Status atualizado', changes: changes });

                    const pedidoId = itemRow.pedido_id;

                    // Check if ANY item in this order is NOT CONCLUIDO
                    db.get("SELECT count(*) as count FROM itens_pedido WHERE pedido_id = ? AND status_atual != 'CONCLUIDO'", [pedidoId], (err, row) => {
                        console.log(`[ORDER-FINISH-DEBUG] Order ${pedidoId} pending count: ${row ? row.count : 'err'}`);
                        if (!err && row.count === 0) {
                            // ALL ITEMS CONCLUDED! Mark Order as FINALIZADO
                            const finalizadoPor = operador_id ? `User ID ${operador_id}` : 'Sistema';
                            console.log(`[ORDER-FINISH] Order ${pedidoId} is fully concluded. Updating status_geral.`);

                            db.run(`UPDATE pedidos SET status_geral = 'FINALIZADO', finalizado_em = DATETIME('now', 'localtime'), finalizado_por = ? WHERE id = ?`,
                                [finalizadoPor, pedidoId],
                                (err) => {
                                    if (err) console.error("Error finalizing order:", err);
                                    else {
                                        console.log("[ORDER-FINISH] SUCCESS: Updated DB to FINALIZADO");
                                        // Insert into History
                                        const userIdForHistory = operador_id || 1; // Default to 1 (Admin) if null
                                        db.run(`INSERT INTO historico_pedidos (pedido_id, campo_alterado, valor_antigo, valor_novo, data_alteracao, usuario_id) VALUES (?, 'status', 'EM_PRODUCAO', 'FINALIZADO', DATETIME('now', 'localtime'), ?)`, [pedidoId, userIdForHistory]);
                                    }
                                    res.json({ message: 'Status atualizado e Pedido Finalizado!', changes: changes, orderFinalized: true });
                                }
                            );
                        } else {
                            // Still items pending
                            console.log(`[ORDER-FINISH] Order ${pedidoId} NOT finalized. Pending: ${row.count}`);
                            res.json({ message: 'Status atualizado', changes: changes });
                        }
                    });
                });
            } else {
                res.json({ message: 'Status atualizado', changes: changes });
            }
        });
    });
});

// Registrar Evento de Produção (Inicio/Fim)
router.post('/evento', (req, res) => {
    const { item_id, operador_id, operador_nome, setor, acao, quantidade_produzida, multiplos_operadores } = req.body;
    console.log(`[EVENTO-DEBUG] Setor: '${setor}', Acao: '${acao}', ID: ${item_id}, Nome: ${operador_nome}, Multiplos: ${multiplos_operadores ? 'Sim' : 'Nao'}`);

    // Helpers function to insert events
    const insertEvent = (op_id, op_nome, op_qtd) => {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO eventos_producao(item_id, operador_id, operador_nome, setor, acao, quantidade_produzida) VALUES(?, ?, ?, ?, ?, ?)`,
                [item_id, op_id, op_nome || null, setor, acao, op_qtd],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    };

    // Função principal
    const processarRegistroGeral = async (operadoresInfo) => {
        // operadoresInfo é um array: [{operador_id, operador_nome, quantidade_produzida}]
        
        let responsavelCol = null;
        if (['SILK_PLANO', 'SILK_CILINDRICA', 'TAMPOGRAFIA', 'IMPRESSAO_LASER', 'IMPRESSAO_DIGITAL', 'ESTAMPARIA'].includes(setor)) {
            responsavelCol = 'responsavel_impressao';
        } else if (setor === 'AGUARDANDO_SEPARACAO' || setor === 'SEPARACAO') {
            responsavelCol = 'responsavel_separacao';
        } else if (setor === 'AGUARDANDO_DESEMBALE' || setor === 'DESEMBALE') {
            responsavelCol = 'responsavel_desembale';
        } else if (setor === 'AGUARDANDO_EMBALE' || setor === 'EMBALE') {
            responsavelCol = 'responsavel_embale';
        } else if (setor === 'AGUARDANDO_ENVIO' || setor === 'LOGISTICA') {
            responsavelCol = 'responsavel_logistica';
        }

        try {
            // 1. Inserir todos os eventos
            for (const op of operadoresInfo) {
                await insertEvent(op.operador_id, op.operador_nome, op.quantidade_produzida);
            }

            // 2. Montar Atualizacao do Item
            let queryUpdate = '';
            let paramsUpdate = [];

            // Valor do responsável (Se multiplos, converte pra JSON array)
            let responsavelValue = null;
            if (operadoresInfo.length === 1) {
                responsavelValue = operadoresInfo[0].operador_nome;
            } else if (operadoresInfo.length > 1) {
                responsavelValue = JSON.stringify(operadoresInfo.map(op => ({
                    nome: op.operador_nome,
                    quantidade: op.quantidade_produzida
                })));
            }

            let newStatus = null;
            const isProductionSector = ['SILK_PLANO', 'SILK_CILINDRICA', 'TAMPOGRAFIA', 'IMPRESSAO_LASER', 'IMPRESSAO_DIGITAL', 'ESTAMPARIA'].includes(setor);

            if (isProductionSector) {
                if (acao === 'INICIO') {
                    newStatus = 'EM_PRODUCAO';
                } else if (acao === 'FIM') {
                    if (setor === 'IMPRESSAO_DIGITAL') {
                        // Special Flow logic handled below for extraCols
                    } else {
                        newStatus = 'AGUARDANDO_EMBALE';
                    }
                } else if (acao === 'PULAR') {
                    newStatus = 'AGUARDANDO_EMBALE';
                }
            }

            let updates = [];
            let updateParams = [];

            if (newStatus) {
                updates.push("status_atual = ?");
                updateParams.push(newStatus);
            }

            if (isProductionSector && acao === 'FIM' && setor === 'IMPRESSAO_DIGITAL') {
                // Ensure it overrides if not already in updates, or just replaces it (handled purely here)
                updates = updates.filter(u => u !== "status_atual = ?"); // Safety cleanup
                updates.push("status_atual = ?");
                updateParams.push('AGUARDANDO_PRODUCAO');
                updates.push("setor_destino = ?");
                updateParams.push('ESTAMPARIA');
            }

            if (responsavelCol && responsavelValue) {
                updates.push(`${responsavelCol} = ?`);
                updateParams.push(responsavelValue);
            }

            if (updates.length > 0) {
                queryUpdate = `UPDATE itens_pedido SET ${updates.join(', ')} WHERE id = ?`;
                paramsUpdate = [...updateParams, item_id];

                db.run(queryUpdate, paramsUpdate, (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    res.json({ message: 'Evento registrado e status atualizado' });
                });
            } else {
                res.json({ message: 'Evento registrado' });
            }

        } catch (error) {
            console.error("Erro ao processar registros:", error);
            res.status(500).json({ error: error.message });
        }
    };

    // Prepara a lista de operadores
    if (multiplos_operadores && Array.isArray(multiplos_operadores) && multiplos_operadores.length > 0) {
        processarRegistroGeral(multiplos_operadores);
    } else {
        // Fallback: Se não vier nome, buscar no banco (modo antigo unitario)
        if (!operador_nome && operador_id) {
            db.get("SELECT nome FROM usuarios WHERE id = ?", [operador_id], (err, row) => {
                const recoveredName = row ? row.nome : null;
                processarRegistroGeral([{ operador_id, operador_nome: recoveredName, quantidade_produzida }]);
            });
        } else {
            processarRegistroGeral([{ operador_id, operador_nome, quantidade_produzida }]);
        }
    }
});

const upload = require('../middleware/upload');

// Upload de Layout (Arte/Admin)
router.post('/item/:id/layout', (req, res) => {
    upload.single('layout')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Arquivo muito grande. Limite é 10MB.' });
            }
            return res.status(400).json({ error: `Erro no upload: ${err.message} ` });
        } else if (err) {
            // An unknown error occurred when uploading.
            return res.status(400).json({ error: err.message });
        }

        // Everything went fine, proceed with logic
        const itemId = req.params.id;
        const file = req.file;
        const operadorId = req.body.operador_id; // Enviado pelo frontend

        if (!file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        if (!operadorId) {
            return res.status(403).json({ error: 'ID do operador não fornecido.' });
        }

        // Verificar permissão
        db.get('SELECT perfil, setores_secundarios FROM usuarios WHERE id = ?', [operadorId], (err, user) => {
            if (err) return res.status(500).json({ error: 'Erro ao verificar permissão.' });
            if (!user) return res.status(403).json({ error: 'Usuário não encontrado.' });

            const setoresSecundarios = user.setores_secundarios
                ? user.setores_secundarios.toLowerCase().split(',').map(s => s.trim())
                : [];
            const isArte = user.perfil === 'arte' || setoresSecundarios.includes('arte');
            const isAdmin = user.perfil === 'admin' || setoresSecundarios.includes('admin');

            if (!isArte && !isAdmin) {
                return res.status(403).json({ error: 'Sem permissão. Apenas Arte e Admin podem enviar layouts.' });
            }

            const { optimizeImage } = require('../utils/imageOptimizer');

            db.get('SELECT layout_path FROM itens_pedido WHERE id = ?', [itemId], (errQuery, rowOld) => {
                const oldLayoutPath = rowOld ? rowOld.layout_path : null;

                optimizeImage(file).catch(err => {
                    console.error("Erro na otimização da imagem:", err);
                }).finally(() => {
                    const layoutPath = '/uploads/' + file.filename;
                    const layoutType = file.mimetype.startsWith('image/') ? 'image' : 'pdf';
                    const timestamp = new Date().toISOString();

                    db.run(
                        `UPDATE itens_pedido SET layout_path = ?, layout_type = ?, layout_uploaded_by = ?, layout_uploaded_at = ? WHERE id = ? `,
                        [layoutPath, layoutType, operadorId, timestamp, itemId],
                        function (err) {
                            if (err) return res.status(500).json({ error: err.message });

                            if (oldLayoutPath && oldLayoutPath !== layoutPath) {
                                const { deleteUploadedFile } = require('../utils/fileCleanup');
                                deleteUploadedFile(oldLayoutPath).catch(errCleanup => {
                                    console.error("Erro ao deletar arquivo de layout antigo:", errCleanup);
                                });
                            }

                            res.json({ message: 'Layout enviado com sucesso', path: layoutPath, type: layoutType });
                        }
                    );
                });
            });
        });
    });
});

// Upload de Arquivo de Impressão DIGITAL (Arte/Admin)
router.post('/item/:id/digital', (req, res) => {
    // Reutilizar middleware 'upload' mas procurando campo 'digital_file'
    // Mas o middleware exportado é upload.single('layout'). Precisamos de um novo ou usar o genérico.
    // O middleware atual (upload.js) exporta `upload = multer({...})` configurado.
    // Podemos chamar upload.single('digital_file') aqui.

    upload.single('digital_file')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            console.error("Multer Error Digital:", err);
            return res.status(400).json({ error: `Erro no upload: ${err.message}` });
        } else if (err) {
            console.error("Unknown Error Digital:", err);
            return res.status(400).json({ error: err.message });
        }

        const itemId = req.params.id;
        const file = req.file;
        const operadorId = req.body.operador_id;

        if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        if (!operadorId) return res.status(403).json({ error: 'ID do operador ausente.' });

        const { optimizeImage } = require('../utils/imageOptimizer');

        db.get('SELECT arquivo_impressao_digital_url FROM itens_pedido WHERE id = ?', [itemId], (errQuery, rowOld) => {
            const oldFilePath = rowOld ? rowOld.arquivo_impressao_digital_url : null;

            optimizeImage(file).catch(err => {
                console.error("Erro na otimização do arquivo digital:", err);
            }).finally(() => {
                const filePath = '/uploads/' + file.filename;
                const fileType = file.mimetype;
                const timestamp = new Date().toISOString();

                db.get('SELECT nome, perfil, setores_secundarios FROM usuarios WHERE id = ?', [operadorId], (err, user) => {
                    if (err || !user) return res.status(403).json({ error: 'Usuário inválido.' });

                    const setoresSecundarios = user.setores_secundarios
                        ? user.setores_secundarios.toLowerCase().split(',').map(s => s.trim())
                        : [];
                    const isArte = user.perfil === 'arte' || setoresSecundarios.includes('arte');
                    const isAdmin = user.perfil === 'admin' || setoresSecundarios.includes('admin');

                    if (!isArte && !isAdmin) {
                        return res.status(403).json({ error: 'Sem permissão.' });
                    }

                    const sql = `UPDATE itens_pedido SET 
                        arquivo_impressao_digital_url = ?, 
                        arquivo_impressao_digital_nome = ?, 
                        arquivo_impressao_digital_tipo = ?, 
                        arquivo_impressao_digital_enviado_por = ?, 
                        arquivo_impressao_digital_enviado_em = ? 
                        WHERE id = ?`;

                    db.run(sql, [filePath, file.originalname, fileType, user.nome, timestamp, itemId], function (err2) {
                        if (err2) return res.status(500).json({ error: err2.message });

                        if (oldFilePath && oldFilePath !== filePath) {
                            const { deleteUploadedFile } = require('../utils/fileCleanup');
                            deleteUploadedFile(oldFilePath).catch(errCleanup => {
                                console.error("Erro ao deletar arquivo digital antigo:", errCleanup);
                            });
                        }

                        res.json({ message: 'Arquivo Digital salvo com sucesso', path: filePath });
                    });
                });
            });
        });
    });
});

// Upload de Arquivo de Impressão LASER (Novo)
router.post('/item/:id/laser', (req, res) => {
    upload.single('laser_file')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Erro no upload: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        const itemId = req.params.id;
        const file = req.file;
        const operadorId = req.body.operador_id;

        if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        if (!operadorId) return res.status(403).json({ error: 'ID do operador ausente.' });

        const { optimizeImage } = require('../utils/imageOptimizer');

        db.get('SELECT arquivo_impressao_laser_url FROM itens_pedido WHERE id = ?', [itemId], (errQuery, rowOld) => {
            const oldFilePath = rowOld ? rowOld.arquivo_impressao_laser_url : null;

            optimizeImage(file).catch(err => {
                console.error("Erro na otimização do arquivo laser:", err);
            }).finally(() => {
                const filePath = '/uploads/' + file.filename;
                const fileType = file.mimetype;
                const timestamp = new Date().toISOString();

                db.get('SELECT nome, perfil, setores_secundarios FROM usuarios WHERE id = ?', [operadorId], (err, user) => {
                    if (err || !user) return res.status(403).json({ error: 'Usuário inválido.' });

                    const setoresSecundarios = user.setores_secundarios
                        ? user.setores_secundarios.toLowerCase().split(',').map(s => s.trim())
                        : [];
                    const isArte = user.perfil === 'arte' || setoresSecundarios.includes('arte');
                    const isAdmin = user.perfil === 'admin' || setoresSecundarios.includes('admin');

                    if (!isArte && !isAdmin) {
                        return res.status(403).json({ error: 'Sem permissão.' });
                    }

                    const sql = `UPDATE itens_pedido SET 
                        arquivo_impressao_laser_url = ?, 
                        arquivo_impressao_laser_nome = ?, 
                        arquivo_impressao_laser_tipo = ?, 
                        arquivo_impressao_laser_enviado_por = ?, 
                        arquivo_impressao_laser_enviado_em = ? 
                        WHERE id = ?`;

                    db.run(sql, [filePath, file.originalname, fileType, user.nome, timestamp, itemId], function (err2) {
                        if (err2) return res.status(500).json({ error: err2.message });

                        if (oldFilePath && oldFilePath !== filePath) {
                            const { deleteUploadedFile } = require('../utils/fileCleanup');
                            deleteUploadedFile(oldFilePath).catch(errCleanup => {
                                console.error("Erro ao deletar arquivo laser antigo:", errCleanup);
                            });
                        }

                        res.json({ message: 'Arquivo Laser salvo com sucesso', path: filePath });
                    });
                });
            });
        });
    });
});

// Atualizar Dados de Embale (Logística)
// Atualizar Dados de Embale (Logística)
// Atualizar Dados de Embale (Logística)
router.put('/item/:id/embale', (req, res) => {
    console.log("[DEBUG] PUT /item/:id/embale called");
    const {
        quantidade_volumes,
        peso,
        altura,
        largura,
        comprimento,
        dados_volumes,
        flag_embale_sem_volumes // NEW PARAMS
    } = req.body;
    const itemId = req.params.id;

    // Validate dados_volumes is valid JSON
    let dadosVolumesStr = '[]';
    try {
        if (dados_volumes) {
            // Ensure it is a string
            const str = typeof dados_volumes === 'string' ? dados_volumes : JSON.stringify(dados_volumes);
            JSON.parse(str); // Verify valid JSON
            dadosVolumesStr = str;
        }
    } catch (e) {
        console.error("Invalid JSON for dados_volumes:", dados_volumes);
        return res.status(400).json({ error: "Dados de volumes inválidos (JSON incorreto)" });
    }

    const isBypass = flag_embale_sem_volumes === true || flag_embale_sem_volumes === 'true' || flag_embale_sem_volumes === 1;

    const params = [
        quantidade_volumes || (isBypass ? 0 : 1),
        peso || 0,
        altura || 0,
        largura || 0,
        comprimento || 0,
        dadosVolumesStr,
        isBypass ? 1 : 0, // Save flag
        itemId
    ];

    const sql = `UPDATE itens_pedido SET quantidade_volumes=?, peso=?, altura=?, largura=?, comprimento=?, dados_volumes=?, flag_embale_sem_volumes=?, status_atual='AGUARDANDO_ENVIO', data_embale=DATETIME('now', 'localtime') WHERE id=?`;

    console.log(`[EMBALE] Updating Item ${itemId}. Bypass: ${isBypass}, Vols: ${quantidade_volumes}`);

    db.run(sql, params, function (err) {
        if (err) {
            console.error("Error updating embale:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Dados de embale salvos confirmados', changes: this.changes });
    });
});

// Rota para atribuir responsável a um item em um setor específico
router.put('/item/:id/assign', (req, res) => {
    const { id } = req.params;
    let { sector, responsavel } = req.body; // sector: 'arte', 'separacao', etc.

    // Middleware pode ter colocado em MAIUSCULO. Normalizar.
    if (sector) sector = sector.toLowerCase();

    console.log(`[DEBUG-ASSIGN] ID: ${id} Sector: ${sector} Resp: ${responsavel}`);

    const validSectors = ['arte', 'separacao', 'desembale', 'impressao', 'embale', 'logistica'];
    if (!validSectors.includes(sector)) {
        return res.status(400).json({ error: 'Setor inválido' });
    }

    // Validar se usuário existe? Opcional, mas bom. Por simplicidade vamos confiar no frontend/admin
    // Update column: responsavel_{sector}
    const column = `responsavel_${sector}`;

    db.run(`UPDATE itens_pedido SET ${column} = ? WHERE id = ?`, [responsavel, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Log event?
        // db.run("INSERT INTO eventos_producao ...") // Maybe later

        res.json({ message: 'Responsável atribuído com sucesso' });
    });
});

// Retornar Item para Etapa Anterior (Rollback)
router.put('/item/:id/return', (req, res) => {
    const itemId = req.params.id;
    const { target_status, observation, operador_id } = req.body;

    console.log(`[ROLLBACK] Item ${itemId} -> ${target_status}. Obs: ${observation}`);

    // 1. Get current status for history
    db.get('SELECT status_atual FROM itens_pedido WHERE id = ?', [itemId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Item não encontrado' });

        const previousStatus = row.status_atual;

        // 2. Update Status
        let sqlUpdate = `UPDATE itens_pedido SET status_atual = ? WHERE id = ?`;

        // CORRECTION: If returning to Art/Start, reset art approval and clear sector
        if (target_status === 'NOVO' || target_status === 'AGUARDANDO_ARTE' || target_status.includes('ARTE')) {
            console.log(`[ROLLBACK-RESET] Reseting Art Status for Item ${itemId}. Target: ${target_status}`);
            sqlUpdate = `UPDATE itens_pedido SET status_atual = ?, arte_status = 'AGUARDANDO_APROVACAO', is_alteracao = 1, responsavel_arte = NULL, data_inicio_arte = NULL, data_entrada_arte = DATETIME('now', 'localtime'), setor_destino = NULL WHERE id = ?`;
        } else {
            console.log(`[ROLLBACK-NORMAL] Item ${itemId} Target: ${target_status} (No Art Reset)`);
        }

        db.run(sqlUpdate, [target_status, itemId], function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });

            // 3. Log Event
            const sqlEvent = `
                INSERT INTO eventos_producao (item_id, operador_id, operador_nome, setor, acao)
                VALUES (?, ?, ?, 'SISTEMA', 'RETORNO')
            `;

            db.run(sqlEvent, [itemId, operador_id || null, null], (err3) => {
                if (err3) console.error("Erro ao logar evento de retorno:", err3);
            });

            res.json({ message: 'Item retornado com sucesso', new_status: target_status });
        });
    });
});


// Solicitar Pausa
router.put('/item/:id/pause-request', (req, res) => {
    const itemId = req.params.id;
    const { motivo } = req.body;
    db.run("UPDATE itens_pedido SET pausa_solicitada = 1, motivo_pausa_producao = ? WHERE id = ?", [motivo, itemId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Pausa solicitada com sucesso.' });
    });
});

// Aprovar Pausa (Somente ADMIN no frontend deveria chamar)
router.put('/item/:id/pause-approve', (req, res) => {
    const itemId = req.params.id;
    const { operador_id, operador_nome } = req.body;
    
    // Calcula tempo do ultimo fluxo ativo ate agora e soma
    db.get("SELECT status_atual FROM itens_pedido WHERE id = ?", [itemId], (err, itemRow) => {
        if (err || !itemRow) return res.status(404).json({ error: 'Item nao encontrado' });
        
        db.get("SELECT timestamp FROM eventos_producao WHERE item_id = ? AND acao IN ('INICIO', 'RETOMADA') ORDER BY id DESC LIMIT 1", [itemId], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // It's safer to do this fully inside SQLite:
            const query = `
                UPDATE itens_pedido SET 
                    is_pausado_producao = 1,
                    pausa_solicitada = 0,
                    segundos_acumulados_producao = COALESCE(segundos_acumulados_producao, 0) + CAST(strftime('%s', 'now') - strftime('%s', (SELECT timestamp FROM eventos_producao WHERE item_id = itens_pedido.id AND acao IN ('INICIO', 'RETOMADA') ORDER BY id DESC LIMIT 1)) AS INTEGER)
                WHERE id = ?
            `;
            
            db.run(query, [itemId], function(err2) {
                if(err2) return res.status(500).json({ error: err2.message });
                // Registrar evento de pausa
                db.run("INSERT INTO eventos_producao (item_id, operador_id, operador_nome, setor, acao, timestamp) VALUES (?, ?, ?, (SELECT setor_destino FROM itens_pedido WHERE id = ?), 'PAUSA', DATETIME('now', 'localtime'))", [itemId, operador_id, operador_nome, itemId], (err3) => {
                    res.json({ message: 'Pausa aprovada e cronometro congelado.' });
                });
            });
        });
    });
});

// Retomar Producao
router.put('/item/:id/resume', (req, res) => {
    const itemId = req.params.id;
    const { operador_id, operador_nome } = req.body;
    
    db.run("UPDATE itens_pedido SET is_pausado_producao = 0 WHERE id = ?", [itemId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Insere evento de retomada
        db.run("INSERT INTO eventos_producao (item_id, operador_id, operador_nome, setor, acao, timestamp) VALUES (?, ?, ?, (SELECT setor_destino FROM itens_pedido WHERE id = ?), 'RETOMADA', DATETIME('now', 'localtime'))", [itemId, operador_id, operador_nome, itemId], (err2) => {
            res.json({ message: 'Producao retomada.' });
        });
    });
});


// Get all pausas solicitadas
router.get('/pausas/pendentes', (req, res) => {
    const query = "SELECT i.*, p.numero_pedido, p.cliente FROM itens_pedido i JOIN pedidos p ON i.pedido_id = p.id WHERE i.pausa_solicitada = 1";
    db.all(query, [], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        
        db.all(`
            SELECT pt.pedido_id, t.id, t.nome, t.cor
            FROM pedido_tags pt
            JOIN tags t ON pt.tag_id = t.id
        `, [], (tagsErr, tagRows) => {
            if (tagsErr) return res.status(500).json({ error: tagsErr.message });
            
            const tagsByPedido = {};
            tagRows.forEach(tr => {
                if (!tagsByPedido[tr.pedido_id]) {
                    tagsByPedido[tr.pedido_id] = [];
                }
                tagsByPedido[tr.pedido_id].push({
                    id: tr.id,
                    nome: tr.nome,
                    cor: tr.cor
                });
            });

            rows.forEach(item => {
                item.tags = tagsByPedido[item.pedido_id] || [];
            });

            res.json(rows);
        });
    });
});

// Negar pausa
router.put('/item/:id/pause-deny', (req, res) => {
    const itemId = req.params.id;
    db.run("UPDATE itens_pedido SET pausa_solicitada = 0 WHERE id = ?", [itemId], (err) => {
         if (err) return res.status(500).json({ error: err.message });
         res.json({ message: 'Pausa negada.' });
    });
});

module.exports = router;
