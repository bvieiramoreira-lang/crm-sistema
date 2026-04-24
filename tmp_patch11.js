const fs = require('fs');
let code = fs.readFileSync('server/routes/production.js', 'utf8');

const newRoutes = `
// Get all pausas solicitadas
router.get('/itens/pausas', (req, res) => {
    const query = "SELECT i.*, p.numero_pedido, p.cliente FROM itens_pedido i JOIN pedidos p ON i.pedido_id = p.id WHERE i.pausa_solicitada = 1";
    db.all(query, [], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows);
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
`;

if (!code.includes('/itens/pausas')) {
    code = code.replace(/module\.exports\s*=\s*router;/, newRoutes + '\nmodule.exports = router;');
    fs.writeFileSync('server/routes/production.js', code);
    console.log('Backend routes added');
} else {
    console.log('Already added');
}
