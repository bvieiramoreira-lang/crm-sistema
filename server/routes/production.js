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
        CAST(strftime('%s', 'now') - strftime('%s', (SELECT timestamp FROM eventos_producao WHERE item_id = i.id AND acao = 'INICIO' ORDER BY id DESC LIMIT 1)) AS INTEGER) as decorrido_segundos,
        (SELECT timestamp FROM eventos_producao WHERE item_id = i.id AND acao = 'INICIO' ORDER BY id DESC LIMIT 1) as inicio_producao_timestamp,
        (SELECT timestamp FROM eventos_producao WHERE item_id = i.id AND acao = 'FIM' ORDER BY id DESC LIMIT 1) as fim_producao_timestamp,
        p.numero_pedido, p.cliente, p.prazo_entrega, p.tipo_envio, p.transportadora, p.observacao 
        FROM itens_pedido i
        JOIN pedidos p ON i.pedido_id = p.id
    `;

    if (contexto === 'ARTE') {
        // Arte não tem "Full Flow" visivel de outros setores ainda, 
        // e nada vem "antes" da Arte a não ser Financeiro (que não é setor de produção listado aqui)
        // Mantemos lógica original
        query = `${baseSelect} WHERE i.arte_status != 'APROVADO' ORDER BY p.prazo_entrega ASC`;
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
        query = `${baseSelect} WHERE i.status_atual IN (${placeholders}) ${extraCondition} ORDER BY p.prazo_entrega ASC`;
        params = allowedStatuses;

    } else {
        // LOGICA PADRÃO (EXECUÇÃO)
        if (['AGUARDANDO_SEPARACAO', 'AGUARDANDO_DESEMBALE', 'AGUARDANDO_EMBALE', 'AGUARDANDO_ENVIO'].includes(contexto)) {
            query = `${baseSelect} WHERE i.status_atual = ? ORDER BY p.prazo_entrega ASC`;
            params = [contexto];
        } else {
            // Filas de Setor de Produção
            query = `${baseSelect} WHERE i.setor_destino = ? AND (i.status_atual = 'AGUARDANDO_PRODUCAO' OR i.status_atual = 'EM_PRODUCAO') ORDER BY p.prazo_entrega ASC`;
            params = [contexto];
        }
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
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
        res.json(row);
    });
});

// Atualizar Arte e Setor (Da Fila de Arte -> Aguardando Separação)
router.put('/item/:id/arte', (req, res) => {
    const { arte_status, setor_destino, cor_impressao, observacao_arte, responsavel } = req.body;
    const itemId = req.params.id;

    // Validação de Arte Aprovada
    if (arte_status === 'APROVADO') {
        if (!cor_impressao || cor_impressao.trim() === '') {
            return res.status(400).json({ error: 'Preencha a Cor de Impressão / Pantone antes de aprovar.' });
        }
    }

    // Lógica de Status
    let query = '';
    let params = [];

    // Se responsavel vier, atualiza. Se não, mantem.
    // Melhor approach: Se vier responsavel, incluimos no UPDATE.
    // Como temos IFs, vamos incluir responsavel_arte se não for nul

    if (arte_status === 'AGUARDANDO_APROVACAO') {
        // Passo 1: Enviar para aprovação
        if (responsavel) {
            query = `UPDATE itens_pedido SET arte_status = ?, responsavel_arte = ? WHERE id = ?`;
            params = [arte_status, responsavel, itemId];
        } else {
            query = `UPDATE itens_pedido SET arte_status = ? WHERE id = ?`;
            params = [arte_status, itemId];
        }
    } else if (arte_status === 'APROVADO') {
        // Passo 3: Aprovação Final (Define Setor e vai para Separação/Produção)
        // Se vier responsável, atualiza.
        const respSQL = responsavel ? ', responsavel_arte = ?' : '';

        query = `UPDATE itens_pedido SET arte_status = ?, setor_destino = ?, cor_impressao = ?, observacao_arte = ?, status_atual = 'AGUARDANDO_SEPARACAO', data_arte_aprovacao = DATETIME('now', 'localtime') ${respSQL} WHERE id = ?`;

        params = [arte_status, setor_destino, cor_impressao || null, observacao_arte || null];
        if (responsavel) params.push(responsavel);
        params.push(itemId);

    } else {
        // Outros status (Fallback) - Apenas atualiza o status da arte
        query = `UPDATE itens_pedido SET arte_status = ? WHERE id = ?`;
        params = [arte_status, itemId];
    }

    db.run(query, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Arte atualizada', changes: this.changes });
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
        db.get('SELECT perfil FROM usuarios WHERE id = ?', [operadorId], (err, user) => {
            if (err) return res.status(500).json({ error: 'Erro ao verificar permissão.' });
            if (!user) return res.status(403).json({ error: 'Usuário não encontrado.' });

            if (user.perfil !== 'arte' && user.perfil !== 'admin') {
                return res.status(403).json({ error: 'Sem permissão. Apenas Arte e Admin podem enviar layouts.' });
            }

            const layoutPath = '/uploads/' + file.filename;
            const layoutType = file.mimetype.startsWith('image/') ? 'image' : 'pdf';
            const timestamp = new Date().toISOString();

            db.run(
                `UPDATE itens_pedido SET layout_path = ?, layout_type = ?, layout_uploaded_by = ?, layout_uploaded_at = ? WHERE id = ? `,
                [layoutPath, layoutType, operadorId, timestamp, itemId],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Layout enviado com sucesso', path: layoutPath, type: layoutType });
                }
            );
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

        const filePath = '/uploads/' + file.filename;
        const fileType = file.mimetype; // ou pegar extensao
        const timestamp = new Date().toISOString();

        // Buscar nome do operador para salvar no registro (opcional, ou salvar ID e join depois)
        // O schema pede 'arquivo_impressao_digital_enviado_por' (TEXT). Vamos salvar ID ou Nome? 
        // Vamos salvar Nome para facilitar leitura rápida, ou ID se quisermos consistencia. Schema parece TEXT.
        // Vamos pegar o usuário.

        db.get('SELECT nome, perfil FROM usuarios WHERE id = ?', [operadorId], (err, user) => {
            if (err || !user) return res.status(403).json({ error: 'Usuário inválido.' });

            // Permitir Arte e Admin
            if (user.perfil !== 'arte' && user.perfil !== 'admin') {
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
                res.json({ message: 'Arquivo Digital salvo com sucesso', path: filePath });
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

        const filePath = '/uploads/' + file.filename;
        const fileType = file.mimetype;
        const timestamp = new Date().toISOString();

        db.get('SELECT nome, perfil FROM usuarios WHERE id = ?', [operadorId], (err, user) => {
            if (err || !user) return res.status(403).json({ error: 'Usuário inválido.' });
            if (user.perfil !== 'arte' && user.perfil !== 'admin') {
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
                res.json({ message: 'Arquivo Laser salvo com sucesso', path: filePath });
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
            sqlUpdate = `UPDATE itens_pedido SET status_atual = ?, arte_status = 'AGUARDANDO_APROVACAO', setor_destino = NULL WHERE id = ?`;
        } else {
            console.log(`[ROLLBACK-NORMAL] Item ${itemId} Target: ${target_status} (No Art Reset)`);
        }

        db.run(sqlUpdate, [target_status, itemId], function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });

            // 3. Log Event
            const sqlEvent = `
                INSERT INTO eventos_producao (pedido_id, item_id, tipo_evento, setor, operador_id, detalhes, data_evento)
                VALUES (
                    (SELECT pedido_id FROM itens_pedido WHERE id = ?), 
                    ?, 'RETORNO', 'SISTEMA', ?, ?, DATETIME('now', 'localtime')
                )
            `;
            const detalhes = `De: ${previousStatus} Para: ${target_status}. Motivo: ${observation || 'N/A'}`;

            db.run(sqlEvent, [itemId, itemId, operador_id, detalhes], (err3) => {
                if (err3) console.error("Erro ao logar evento de retorno:", err3);
            });

            res.json({ message: 'Item retornado com sucesso', new_status: target_status });
        });
    });
});

module.exports = router;
