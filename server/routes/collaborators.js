
const express = require('express');
const router = express.Router();
const db = require('../database');

// Listar todos (para o Admin)
router.get('/', (req, res) => {
    db.all("SELECT * FROM colaboradores ORDER BY nome ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Listar os destaques (Para exibição global)
router.get('/destaques', (req, res) => {
    db.all("SELECT id, nome, setor, destaque_comportamento FROM colaboradores WHERE destaque_comportamento IS NOT NULL AND ativo = 1 ORDER BY nome ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Promover ou remover destaque (comportamento)
router.put('/:id/destaque', (req, res) => {
    const { destaque_comportamento } = req.body; // se null ou vazio, limpa o destaque
    
    db.run("UPDATE colaboradores SET destaque_comportamento = ? WHERE id = ?",
        [destaque_comportamento || null, req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Destaque atualizado' });
        });
});

// Listar por Setor (Apenas ATIVOS)
router.get('/sector/:sector', (req, res) => {
    const sector = req.params.sector;
    const cleanSector = sector.trim().toUpperCase();

    // Fetch all active users, then filter in memory to avoid "Desembale" matching "Embale" via LIKE
    db.all("SELECT * FROM colaboradores WHERE ativo = 1 ORDER BY nome ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const filtered = rows.filter(user => {
            if (!user.setor) return false;
            // Split by comma and trim to get exact sector names
            const userSectors = user.setor.split(',').map(s => s.trim().toUpperCase());
            return userSectors.includes(cleanSector);
        });

        res.json(filtered);
    });
});

// Criar
router.post('/', (req, res) => {
    const { nome, setor, ativo } = req.body;

    if (!nome || !nome.trim()) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    if (!setor || !setor.trim()) {
        return res.status(400).json({ error: 'Setor é obrigatório' });
    }

    const ativoVal = (ativo === undefined || ativo === null) ? 1 : ativo;

    db.run("INSERT INTO colaboradores (nome, setor, ativo) VALUES (?, ?, ?)", [nome, setor, ativoVal], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'Criado com sucesso' });
    });
});

// Atualizar (Nome, Setor, Ativo)
router.put('/:id', (req, res) => {
    const { nome, setor, ativo } = req.body;

    if (!nome || !nome.trim()) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    db.run("UPDATE colaboradores SET nome = ?, setor = ?, ativo = ? WHERE id = ?",
        [nome, setor, ativo, req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Atualizado' });
        });
});

// Excluir (Opcional, mas util para limpeza)
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM colaboradores WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Excluído' });
    });
});

module.exports = router;
