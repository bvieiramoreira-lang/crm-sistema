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
            i.id, i.produto, i.quantidade, i.setor_destino, i.status_atual, i.arte_status,
            p.numero_pedido, p.cliente, p.prazo_entrega, p.tipo_envio, p.status_geral
        FROM itens_pedido i
        JOIN pedidos p ON i.pedido_id = p.id
    `;

    // Se as datas vierem vazias, limitamos por alguma condicional?
    // Vamos permitir sem data (traz os ativos/não finalizados)
    let conditions = [];

    if (start && end) {
        // Se vieram datas, usar o prazo_entrega ou data_criacao.
        // Optamos pelo prazo_entrega para a "semana de produção".
        conditions.push(`p.prazo_entrega >= ? AND p.prazo_entrega <= ?`);
        queryParams.push(start, end);
    } else {
        // Por padrão, mostra pedidos que estão em andamento ou que têm prazos próximos
        conditions.push(`p.status_geral != 'FINALIZADO'`);
    }

    if (conditions.length > 0) {
        baseQuery += ` WHERE ` + conditions.join(' AND ');
    }

    baseQuery += ` ORDER BY p.prazo_entrega ASC, p.numero_pedido ASC`;

    db.all(baseQuery, queryParams, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Calcular métricas
        let totalPedidosSet = new Set();
        let totalUnidadesItens = 0;

        rows.forEach(item => {
            totalPedidosSet.add(item.numero_pedido);
            totalUnidadesItens += parseInt(item.quantidade) || 0;
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

module.exports = router;
