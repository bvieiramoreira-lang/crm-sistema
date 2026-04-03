const express = require('express');
const router = express.Router();
const db = require('../database');

// Criar Pedido (Financeiro)
router.post('/', (req, res) => {
    console.log("[DEBUG] Nova requisição POST /api/orders. Body:", JSON.stringify(req.body, null, 2));
    const { cliente, numero_pedido, prazo_entrega, tipo_envio, transportadora, itens, observacao } = req.body;

    // Usar transação seria ideal, mas SQLite nodejs simples não tem beginTransaction explícito fácil sem async/await wrapper
    // Vamos fazer sequencial simples
    db.run(`INSERT INTO pedidos (cliente, numero_pedido, prazo_entrega, tipo_envio, transportadora, observacao) VALUES (?, ?, ?, ?, ?, ?)`,
        [cliente, numero_pedido, prazo_entrega, tipo_envio, transportadora, observacao],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const pedidoId = this.lastID;

            // Inserir Itens
            if (itens && itens.length > 0) {
                const placeholders = itens.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
                const values = [];
                itens.forEach(item => {
                    values.push(pedidoId, item.produto, item.quantidade, item.setor_destino || null, item.referencia ? item.referencia.toUpperCase() : null, item.is_terceirizado ? 1 : 0);
                });

                db.run(`INSERT INTO itens_pedido (pedido_id, produto, quantidade, setor_destino, referencia, is_terceirizado) VALUES ` + placeholders, values, (err) => {
                    if (err) {
                        console.error("**** SQL ERROR INSERTING ITEMS ****", err);
                        console.error("Values:", values);
                        console.error("Placeholders:", placeholders);
                        return res.status(207).json({ id: pedidoId, message: 'Pedido criado, mas erro ao inserir itens: ' + err.message });
                    }
                    console.log("[DEBUG] Itens inseridos com sucesso para pedido", pedidoId);
                    res.json({ id: pedidoId, message: 'Pedido criado com sucesso' });
                });
            } else {
                res.json({ id: pedidoId, message: 'Pedido criado com sucesso' });
            }
        }
    );
});

// Listar Pedidos (Com filtros básicos, busca, paginação e cálculo de status oficial)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search ? req.query.search.toLowerCase() : '';
        const status = req.query.status || '';
        const itemStatus = req.query.itemStatus || '';
        const viewMode = req.query.viewMode || 'active'; // 'active' or 'finished'
        const startDate = req.query.startDate || '';
        const endDate = req.query.endDate || '';

        // Sorting
        // For active: prazo_entrega ASC, id DESC
        // For finished: finalizado_em DESC, id DESC
        let orderBy = viewMode === 'finished' ? 'ORDER BY p.finalizado_em DESC, p.id DESC' : 'ORDER BY p.prazo_entrega ASC, p.id DESC';
        if (req.query.sort === 'recent') orderBy = 'ORDER BY p.id DESC';

        // Filters applied to the SQL directly
        let whereClauses = [];
        let params = [];

        // 1. Strict Mode Separation
        if (viewMode === 'finished') {
            whereClauses.push("p.status_geral = 'FINALIZADO'");
        } else {
            whereClauses.push("p.status_geral != 'FINALIZADO'");
        }

        // 2. Date Filters (Prazo or Finalizado)
        if (startDate && endDate) {
            const field = viewMode === 'finished' ? 'p.finalizado_em' : 'p.prazo_entrega';
            whereClauses.push(`(${field} BETWEEN ? AND ?)`);
            params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
        } else if (startDate) {
            const field = viewMode === 'finished' ? 'p.finalizado_em' : 'p.prazo_entrega';
            whereClauses.push(`(${field} >= ?)`);
            params.push(`${startDate} 00:00:00`);
        } else if (endDate) {
            const field = viewMode === 'finished' ? 'p.finalizado_em' : 'p.prazo_entrega';
            whereClauses.push(`(${field} <= ?)`);
            params.push(`${endDate} 23:59:59`);
        }

        // 3. Status Filters (Simplification for SQL context)
        // Note: Full official status depends on items, but we can pre-filter known states
        if (status === 'PENDENTE') {
            whereClauses.push("p.status_geral != 'FINALIZADO'");
        }

        // 4. Search text (Pedido or Cliente)
        // Item search requires JOIN, so we adjust the base query if search exists or itemStatus exists
        let fromClause = "FROM pedidos p";
        if (search || itemStatus || status && status !== 'PENDENTE') {
            // Se precisamos filtrar por algo dos itens, precisamos do JOIN, ou o filtro oficial precisa rodar pós-SQL.
            // A abordagem mais limpa é buscar amplo no SQL com paginação *maior* se for complexo,
            // ou fazer o cálculo real antes de paginar.
            // Para manter performance real: fetch everything ID -> calc logic -> slice (Se o dataset crescer MUITO, isso explode).
            // A long term fix: armazenar `status_oficial` no DB e atualizar em cada modificação.
            // No short-term MVP, como estamos com N+1 resolvido, a busca all in memory é rápida, MAS quebra o objetivo da Fase 2 de limitar tráfego.

            // Abordagem equilibrada: Vamos fazer uma subquery no WHERE se tiver `search`.
            if (search) {
                whereClauses.push(`(p.numero_pedido LIKE ? OR p.cliente LIKE ? OR p.id IN (SELECT pedido_id FROM itens_pedido WHERE produto LIKE ? OR referencia LIKE ?))`);
                params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
            }
        }

        let whereStr = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

        // Get TOTAIS (For Pagination)
        const totalRows = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count ${fromClause} ${whereStr}`, params, (err, row) => {
                if (err) reject(err); else resolve(row.count);
            });
        });

        // 5. Paginate Base Orders
        const paginatedQuery = `SELECT p.* ${fromClause} ${whereStr} ${orderBy} LIMIT ? OFFSET ?`;
        const paginatedParams = [...params, limit, offset];

        let orders = await new Promise((resolve, reject) => {
            db.all(paginatedQuery, paginatedParams, (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });

        // 6. Fetch Items for the paginated orders
        const orderIds = orders.map(o => o.id);
        let allItems = [];
        if (orderIds.length > 0) {
            const placeholders = orderIds.map(() => '?').join(',');
            allItems = await new Promise((resolve, reject) => {
                db.all(`SELECT id, pedido_id, produto, quantidade, referencia, status_atual, arte_status, setor_destino, layout_path, layout_type, is_terceirizado FROM itens_pedido WHERE pedido_id IN (${placeholders})`, orderIds, (err, rows) => {
                    if (err) reject(err); else resolve(rows);
                });
            });
        }

        // Group items by order
        const itemsByOrder = new Map();
        allItems.forEach(item => {
            if (!itemsByOrder.has(item.pedido_id)) itemsByOrder.set(item.pedido_id, []);
            itemsByOrder.get(item.pedido_id).push(item);
        });

        // 7. Calculate Official Status and Final Filter
        let ordersWithStatus = orders.map((order) => {
            const items = itemsByOrder.get(order.id) || [];
            let statusOficial = order.status_geral === 'FINALIZADO' ? 'FINALIZADO' : 'NOVO';
            let sectorDetail = '';

            if (order.status_geral !== 'FINALIZADO') {
                if (items.length === 0) {
                    statusOficial = 'FINANCEIRO / CONFERÊNCIA';
                } else {
                    const hasArtePendente = items.some(i => i.arte_status !== 'APROVADO');
                    const hasSeparacao = items.some(i => i.status_atual === 'AGUARDANDO_SEPARACAO');
                    const hasDesembale = items.some(i => i.status_atual === 'AGUARDANDO_DESEMBALE');
                    const productionItem = items.find(i => i.status_atual === 'AGUARDANDO_PRODUCAO' || i.status_atual === 'EM_PRODUCAO');
                    const hasEmbale = items.some(i => i.status_atual === 'AGUARDANDO_EMBALE');
                    const hasLogistica = items.some(i => i.status_atual === 'AGUARDANDO_ENVIO');

                    if (hasArtePendente) {
                        statusOficial = 'ARTE FINAL';
                    } else if (hasSeparacao) {
                        statusOficial = 'SEPARAÇÃO';
                    } else if (hasDesembale) {
                        statusOficial = 'DESEMBALE';
                    } else if (productionItem) {
                        statusOficial = 'IMPRESSÃO';
                        if (productionItem.setor_destino) {
                            sectorDetail = productionItem.setor_destino.replace('_', ' ');
                        }
                    } else if (hasEmbale) {
                        statusOficial = 'EMBALE';
                    } else if (hasLogistica) {
                        statusOficial = 'LOGÍSTICA';
                    } else {
                        const allConcluido = items.every(i => i.status_atual === 'CONCLUIDO');
                        if (allConcluido && items.length > 0) statusOficial = 'FINALIZADO';
                    }
                }
            }

            return { ...order, status_oficial: statusOficial, setor_detalhe: sectorDetail, itens: items };
        });

        // Apply advanced post-SQL filters if present (itemStatus and strict official status)
        // If these post-SQL filters remove too many results, the page will look half-empty. 
        // A true robust architecture needs official status materialized in DB. For now, this suffices.
        if (status && status !== 'PENDENTE') {
            ordersWithStatus = ordersWithStatus.filter(o => o.status_oficial === status);
        }
        if (itemStatus) {
            ordersWithStatus = ordersWithStatus.filter(o => o.itens.some(i => {
                if (itemStatus === 'ARTE_NAO_FEITA') return !i.arte_status || i.arte_status === 'ARTE_NAO_FEITA' || i.arte_status === 'REPROVADO';
                if (itemStatus === 'AGUARDANDO_APROVACAO') return i.arte_status === 'AGUARDANDO_APROVACAO';
                if (itemStatus === 'ARTE_APROVADA') return i.arte_status === 'ARTE_APROVADA';
                return i.status_atual === itemStatus;
            }));
        }

        res.json({
            data: ordersWithStatus,
            meta: {
                total: totalRows,
                page: page,
                limit: limit,
                pages: Math.ceil(totalRows / limit)
            }
        });

    } catch (err) {
        console.error("ERRO /api/orders:", err);
        res.status(500).json({ error: err.message });
    }
});

// Detalhes do Pedido com Itens e Status Oficial
router.get('/:id', async (req, res) => {
    try {
        const pedidoId = req.params.id;

        const pedido = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM pedidos WHERE id = ?", [pedidoId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });

        const items = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM itens_pedido WHERE pedido_id = ?", [pedidoId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Fetch Production Events for Timeline
        const itemIds = items.map(i => i.id);
        let events = [];
        if (itemIds.length > 0) {
            events = await new Promise((resolve, reject) => {
                db.all(`SELECT e.*, COALESCE(e.operador_nome, u.nome) as operador_nome 
                        FROM eventos_producao e 
                        LEFT JOIN usuarios u ON e.operador_id = u.id
                        WHERE e.item_id IN (${itemIds.join(',')})
                        ORDER BY e.timestamp ASC`, [], (err, rows) => {
                    if (err) resolve([]); // Don't fail if events table issues
                    else resolve(rows);
                });
            });
        }

        // Attach events to items
        items.forEach(item => {
            item.eventos = events.filter(e => e.item_id === item.id);
        });

        pedido.itens = items;

        // Lógica do Status Oficial (Mesma lógica da listagem)
        let statusOficial = 'FINALIZADO';
        let sectorDetail = '';

        if (items.length === 0) {
            statusOficial = 'FINANCEIRO / CONFERÊNCIA';
        } else {
            const hasArtePendente = items.some(i => i.arte_status !== 'APROVADO');
            const hasSeparacao = items.some(i => i.status_atual === 'AGUARDANDO_SEPARACAO');
            const hasDesembale = items.some(i => i.status_atual === 'AGUARDANDO_DESEMBALE');
            const productionItem = items.find(i => i.status_atual === 'AGUARDANDO_PRODUCAO' || i.status_atual === 'EM_PRODUCAO');
            const hasEmbale = items.some(i => i.status_atual === 'AGUARDANDO_EMBALE');
            const hasLogistica = items.some(i => i.status_atual === 'AGUARDANDO_ENVIO' || i.status_atual === 'CONCLUIDO');

            // Check for CONCLUIDO explicitly for 'FINALIZO/LOGISTICA'
            const allConcluded = items.length > 0 && items.every(i => i.status_atual === 'CONCLUIDO');


            if (hasArtePendente) {
                statusOficial = 'ARTE FINAL';
            } else if (hasSeparacao) {
                statusOficial = 'SEPARAÇÃO';
            } else if (hasDesembale) {
                statusOficial = 'DESEMBALE';
            } else if (productionItem) {
                statusOficial = 'IMPRESSÃO';
                if (productionItem.setor_destino) {
                    sectorDetail = productionItem.setor_destino.replace('_', ' ');
                }
            } else if (hasEmbale) {
                statusOficial = 'EMBALE';
            } else if (hasLogistica) {
                statusOficial = 'LOGÍSTICA';
            }

            if (allConcluded) {
                statusOficial = 'FINALIZADO';
            }
        }

        pedido.status_oficial = statusOficial;
        pedido.setor_detalhe = sectorDetail;

        res.json(pedido);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Atualizar Frete (Volumes, Peso, etc) - Rota específica
router.put('/:id/shipping', (req, res) => {
    // ... mantido para compatibilidade, mas o PUT /:id geral vai cobrir
    const { quantidade_volumes, peso, altura, largura, comprimento } = req.body;
    const pedidoId = req.params.id;

    db.run(
        `UPDATE pedidos SET quantidade_volumes = ?, peso = ?, altura = ?, largura = ?, comprimento = ? WHERE id = ?`,
        [quantidade_volumes, peso, altura, largura, comprimento, pedidoId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Dados de frete atualizados', changes: this.changes });
        }
    );
});

// HISTÓRICO Helper
function logHistory(dbInstance, pedidoId, usuarioId, campo, antigo, novo, motivo) {
    console.log(`[DEBUG] Logging History: ${campo} -> ${novo}`);
    if (!dbInstance) {
        console.error("DB Instance missing in logHistory");
        return;
    }
    try {
        dbInstance.run(`INSERT INTO historico_pedidos (pedido_id, usuario_id, campo_alterado, valor_antigo, valor_novo, motivo) VALUES (?, ?, ?, ?, ?, ?)`,
            [pedidoId, usuarioId, campo, antigo, novo, motivo], (err) => {
                if (err) console.error("Erro ao gravar histórico:", err);
                else console.log("[DEBUG] History saved.");
            });
    } catch (e) {
        console.error("[CRITICAL] Exception in logHistory:", e);
    }
}

// EDITAR PEDIDO (Completo com validação de status)
router.put('/:id', async (req, res) => {
    const pedidoId = req.params.id;
    const {
        cliente, numero_pedido, prazo_entrega, tipo_envio, transportadora, observacao,
        usuario_id,
        // motivo removido do body
        itens // Array de itens (se permitido)
    } = req.body;

    const motivo = 'Edição Manual';

    // Verificar existência
    db.get("SELECT * FROM pedidos WHERE id = ?", [pedidoId], (err, currentOrder) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!currentOrder) return res.status(404).json({ error: 'Pedido não encontrado' });

        // Verificar Status Oficial (via itens) para saber se é Restrito
        db.all("SELECT * FROM itens_pedido WHERE pedido_id = ?", [pedidoId], (err, currentItems) => {
            if (err) return res.status(500).json({ error: err.message });

            const isRestricted = currentItems.some(i =>
                ['AGUARDANDO_DESEMBALE', 'AGUARDANDO_PRODUCAO', 'EM_PRODUCAO', 'AGUARDANDO_EMBALE', 'AGUARDANDO_ENVIO', 'CONCLUIDO'].includes(i.status_atual)
            );

            const changes = [];
            const fieldsToCheck = [
                { key: 'prazo_entrega', label: 'Prazo' },
                { key: 'observacao', label: 'Observação' },
                { key: 'transportadora', label: 'Transportadora' },
                { key: 'tipo_envio', label: 'Tipo Envio' },
                { key: 'status_geral', label: 'Status Geral' }
            ];

            if (!isRestricted) {
                fieldsToCheck.push(
                    { key: 'cliente', label: 'Cliente' },
                    { key: 'numero_pedido', label: 'Nº Pedido' }
                );
            }

            const sqlUpdates = [];
            const sqlParams = [];

            fieldsToCheck.forEach(field => {
                if (req.body[field.key] !== undefined && req.body[field.key] != currentOrder[field.key]) {
                    // Passando db explicitamente
                    logHistory(db, pedidoId, usuario_id, field.label, currentOrder[field.key], req.body[field.key], motivo);
                    sqlUpdates.push(`${field.key} = ?`);
                    sqlParams.push(req.body[field.key]);
                    changes.push(field.label);
                }
            });

            // Se mudou algo no pedido
            if (sqlUpdates.length > 0) {
                sqlParams.push(pedidoId);
                db.run(`UPDATE pedidos SET ${sqlUpdates.join(', ')} WHERE id = ?`, sqlParams, (err) => {
                    if (err) console.error("Erro ao atualizar pedido:", err);
                });
            }

            if (!isRestricted && itens && Array.isArray(itens)) {
                const payloadIds = itens.filter(i => i.id).map(i => Number(i.id));
                const dbIds = currentItems.map(i => i.id);

                // 1. Delete removed
                const toDelete = dbIds.filter(id => !payloadIds.includes(id));
                if (toDelete.length > 0) {
                    db.run(`DELETE FROM itens_pedido WHERE id IN (${toDelete.join(',')})`, (err) => {
                        if (err) console.error("Erro ao deletar itens removidos:", err);
                    });
                    // Passando db explicitamente
                    logHistory(db, pedidoId, usuario_id, 'Itens', 'Vários', `Removido ${toDelete.length} itens`, motivo);
                }

                // 2. Upsert
                itens.forEach(item => {
                    if (item.id) {
                        const dbItem = currentItems.find(i => i.id == item.id);
                        if (dbItem && (dbItem.produto != item.produto || dbItem.quantidade != item.quantidade || dbItem.referencia != item.referencia)) {
                            db.run(`UPDATE itens_pedido SET produto = ?, quantidade = ?, referencia = ? WHERE id = ?`,
                                [item.produto, item.quantidade, item.referencia ? item.referencia.toUpperCase() : null, item.id], (err) => {
                                    if (err) console.error("Erro ao atualizar item:", err);
                                });
                            logHistory(db, pedidoId, usuario_id, 'Item Alterado', `${dbItem.produto} (x${dbItem.quantidade})`, `${item.produto} (x${item.quantidade})`, motivo);
                        }
                    } else {
                        db.run(`INSERT INTO itens_pedido (pedido_id, produto, quantidade, referencia, status_atual) VALUES (?, ?, ?, ?, 'AGUARDANDO_SEPARACAO')`,
                            [pedidoId, item.produto, item.quantidade, item.referencia ? item.referencia.toUpperCase() : null], (err) => {
                                if (err) console.error("Erro ao inserir item:", err);
                            });
                        logHistory(db, pedidoId, usuario_id, 'Item Adicionado', '-', `${item.produto} (x${item.quantidade})`, motivo);
                    }
                });
            }

            res.json({ message: 'Pedido atualizado', changes });
        });
    });
});

// GET Histórico
router.get('/:id/history', (req, res) => {
    db.all(`
        SELECT h.*, u.nome as usuario_nome 
        FROM historico_pedidos h 
        LEFT JOIN usuarios u ON h.usuario_id = u.id 
        WHERE h.pedido_id = ? 
        ORDER BY h.data_alteracao DESC
    `, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Deletar Pedido (Admin)
router.delete('/:id', (req, res) => {
    const pedidoId = req.params.id;

    // Sequência de deleção manual para SQLite
    // 1. Pegar IDs dos itens
    db.all(`SELECT id FROM itens_pedido WHERE pedido_id = ?`, [pedidoId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const itemIds = rows.map(r => r.id);
        const deleteEvents = itemIds.length > 0
            ? `DELETE FROM eventos_producao WHERE item_id IN (${itemIds.join(',')})`
            : `SELECT 1`;

        db.run(deleteEvents, [], (err) => {
            if (err) return res.status(500).json({ error: "Erro ao deletar eventos: " + err.message });

            // 2. Deletar Itens
            db.run(`DELETE FROM itens_pedido WHERE pedido_id = ?`, [pedidoId], (err) => {
                if (err) return res.status(500).json({ error: "Erro ao deletar itens: " + err.message });

                // 3. Deletar O Pedido
                // USAR FUNCTION PARA ACESSAR THIS.CHANGES
                db.run(`DELETE FROM pedidos WHERE id = ?`, [pedidoId], function (err) {
                    if (err) return res.status(500).json({ error: "Erro ao deletar pedido: " + err.message });

                    if (this.changes === 0) return res.status(404).json({ error: 'Pedido não encontrado' });
                    res.json({ message: 'Pedido excluído com sucesso' });
                });
            });
        });
    });
});

// PRINT LABEL (Retirada)
router.get('/:id/print-label', (req, res) => {
    const pedidoId = req.params.id;

    db.get("SELECT * FROM pedidos WHERE id = ?", [pedidoId], (err, pedido) => {
        if (err || !pedido) return res.status(404).send('Pedido não encontrado');

        db.all("SELECT * FROM itens_pedido WHERE pedido_id = ?", [pedidoId], (err, itens) => {
            if (err) return res.status(500).send('Erro ao buscar itens');

            const dateStr = new Date().toLocaleDateString('pt-BR');

            // Build Items List
            let itemsHtml = '';
            itens.forEach(i => {
                itemsHtml += `
                    <tr>
                        <td style="padding: 4px 0; border-bottom: 1px solid #eee;">${i.produto}</td>
                        <td style="padding: 4px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${i.quantidade}</td>
                    </tr>
                `;
            });

            // HTML Template for Thermal Printing (A6 approx)
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Etiqueta Pedido #${pedido.numero_pedido}</title>
                    <style>
                        @page { size: A6; margin: 0; }
                        body { 
                            font-family: 'Helvetica Neue', Arial, sans-serif; 
                            margin: 0; 
                            padding: 10mm;
                            width: 105mm; /* A6 Width */
                            height: 148mm; /* A6 Height */
                            box-sizing: border-box;
                        }
                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
                        .title { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
                        .big-number { font-size: 24px; font-weight: 900; margin: 5px 0; }
                        .client-box { 
                            background: #f0f0f0; 
                            padding: 10px; 
                            border-radius: 4px; 
                            margin-bottom: 15px; 
                            text-align: center;
                        }
                        .client-name { font-size: 16px; font-weight: bold; }
                        .info-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 15px; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; }
                        th { text-align: left; border-bottom: 1px solid #000; padding-bottom: 2px; }
                        .footer { 
                            margin-top: 20px; 
                            text-align: center; 
                            font-size: 10px; 
                            border-top: 1px solid #ccc;
                            padding-top: 5px;
                        }
                        
                        @media print {
                            body { width: 100%; height: 100%; padding: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body onload="window.print()">
                    <div class="header">
                        <div class="title">Retirada pelo Cliente</div>
                        <div class="big-number">#${pedido.numero_pedido}</div>
                    </div>

                    <div class="client-box">
                        <div style="font-size: 10px; color: #666; margin-bottom: 2px;">CLIENTE</div>
                        <div class="client-name">${pedido.cliente}</div>
                    </div>

                    <div class="info-row">
                        <div><strong>Data:</strong> ${dateStr}</div>
                        <div><strong>Volumes:</strong> ${pedido.quantidade_volumes || 'N/A'}</div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th style="text-align: right;">Qtd</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="footer">
                         CONFERIDO POR: _______________________
                    </div>
                </body>
                </html>
            `;

            res.send(html);
        });
    });
});

module.exports = router;
