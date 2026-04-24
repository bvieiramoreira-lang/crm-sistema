const fs = require('fs');
let code = fs.readFileSync('server/routes/orders.js', 'utf8');

code = code.replace(/module\.exports = router;/, `
// DELETE /api/orders/cleanup/testes
router.delete('/cleanup/testes', (req, res) => {
    db.serialize(() => {
        db.run("DELETE FROM itens_pedido WHERE pedido_id IN (SELECT id FROM pedidos WHERE status_geral = 'FINALIZADO' AND (cliente LIKE '%teste%' OR cliente LIKE '%test%'))", (err) => { if(err) console.error(err); });
        db.run("DELETE FROM eventos_producao WHERE item_id NOT IN (SELECT id FROM itens_pedido)", (err) => { if(err) console.error(err); });
        db.run("DELETE FROM historico_pedidos WHERE pedido_id IN (SELECT id FROM pedidos WHERE status_geral = 'FINALIZADO' AND (cliente LIKE '%teste%' OR cliente LIKE '%test%'))", (err) => { if(err) console.error(err); });
        db.run("DELETE FROM anexos_pedido WHERE pedido_id IN (SELECT id FROM pedidos WHERE status_geral = 'FINALIZADO' AND (cliente LIKE '%teste%' OR cliente LIKE '%test%'))", (err) => { if(err) console.error(err); });
        db.run("DELETE FROM pedidos WHERE status_geral = 'FINALIZADO' AND (cliente LIKE '%teste%' OR cliente LIKE '%test%') COLLATE NOCASE", function(err) {
            if (err) return res.status(500).json({error: err.message});
            res.json({ message: 'Deleted ' + this.changes + ' test orders' });
        });
    });
});

module.exports = router;
`);

fs.writeFileSync('server/routes/orders.js', code);
console.log('Endpoint patched');
