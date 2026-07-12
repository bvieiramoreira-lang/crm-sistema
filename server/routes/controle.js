const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/controle?start=YYYY-MM-DD&end=YYYY-MM-DD
// Traz todos os itens associados aos pedidos nesse intervalo de prazo de entrega
router.get('/', (req, res) => {
    let { start, end } = req.query;

    let queryParams = [];
    
    // Query base: Busca detalhada de itens com dados do pedido
    // A query também retorna informações de métrica para uso no front
    let baseQuery = `
        SELECT 
            i.id, i.produto, i.quantidade, i.setor_destino, i.status_atual, i.arte_status, i.pedido_id,
            p.numero_pedido, p.cliente, p.prazo_entrega, p.tipo_envio, p.status_geral
        FROM itens_pedido i
        JOIN pedidos p ON i.pedido_id = p.id
    `;

    // Se as datas vierem vazias, limitamos por alguma condicional?
    // Vamos permitir sem data (traz os ativos/não finalizados)
    // Ocultar produtos já finalizados (CONCLUIDO) e pedidos totalmente FINALIZADOS por padrão
    let conditions = [
        `i.status_atual != 'CONCLUIDO'`,
        `p.status_geral != 'FINALIZADO'`
    ];

    if (start && end) {
        // Se vieram datas, usar o prazo_entrega ou data_criacao.
        // Optamos pelo prazo_entrega para a "semana de produção".
        conditions.push(`p.prazo_entrega >= ? AND p.prazo_entrega <= ?`);
        queryParams.push(start, end);
    }

    if (conditions.length > 0) {
        baseQuery += ` WHERE ` + conditions.join(' AND ');
    }

    baseQuery += ` ORDER BY CASE WHEN p.prazo_entrega IS NULL OR p.prazo_entrega = '' THEN 1 ELSE 0 END, p.prazo_entrega ASC, p.numero_pedido ASC`;

    db.all(baseQuery, queryParams, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Fetch all order tags
        db.all(`
            SELECT pt.pedido_id, t.id, t.nome, t.cor
            FROM pedido_tags pt
            JOIN tags t ON pt.tag_id = t.id
        `, [], (tagsErr, tagRows) => {
            if (tagsErr) return res.status(500).json({ error: tagsErr.message });
            
            // Map tags by pedido_id
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

            // Calcular métricas
            let totalPedidosSet = new Set();
            let totalUnidadesItens = 0;

            rows.forEach(item => {
                totalPedidosSet.add(item.numero_pedido);
                totalUnidadesItens += parseInt(item.quantidade) || 0;
                item.tags = tagsByPedido[item.pedido_id] || [];
            });

            res.json({
                meta: {
                    totalPedidos: totalPedidosSet.size,
                    totalProdutos: rows.length,
                    totalUnidadesVolume: totalUnidadesItens
                },
                data: rows
            });
        });
    });
});

module.exports = router;
