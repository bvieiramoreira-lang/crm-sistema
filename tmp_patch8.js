const fs = require('fs');
let code = fs.readFileSync('server/routes/production.js', 'utf8');

const endpoints = `
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
            const query = \`
                UPDATE itens_pedido SET 
                    is_pausado_producao = 1,
                    pausa_solicitada = 0,
                    segundos_acumulados_producao = segundos_acumulados_producao + CAST(strftime('%s', 'now') - strftime('%s', (SELECT timestamp FROM eventos_producao WHERE item_id = itens_pedido.id AND acao IN ('INICIO', 'RETOMADA') ORDER BY id DESC LIMIT 1)) AS INTEGER)
                WHERE id = ?
            \`;
            
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
`;

code = code.replace(/module\.exports\s*=\s*router;/, endpoints + '\nmodule.exports = router;');
fs.writeFileSync('server/routes/production.js', code);
console.log('Endpoints added');
