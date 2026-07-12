const express = require('express');
const router = express.Router();
const db = require('../database');

// Listar todas as tags
router.get('/', (req, res) => {
    db.all("SELECT * FROM tags ORDER BY nome ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Criar nova tag
router.post('/', (req, res) => {
    const { nome, cor } = req.body;

    if (!nome || !nome.trim()) {
        return res.status(400).json({ error: 'Nome da tag é obrigatório' });
    }
    if (!cor || !cor.trim()) {
        return res.status(400).json({ error: 'Cor da tag é obrigatória' });
    }

    db.run("INSERT INTO tags (nome, cor) VALUES (?, ?)", [nome.trim(), cor.trim()], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Já existe uma tag com este nome' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, nome, cor, message: 'Tag criada com sucesso' });
    });
});

// Atualizar tag existente
router.put('/:id', (req, res) => {
    const { nome, cor } = req.body;
    const { id } = req.params;

    if (!nome || !nome.trim()) {
        return res.status(400).json({ error: 'Nome da tag é obrigatório' });
    }
    if (!cor || !cor.trim()) {
        return res.status(400).json({ error: 'Cor da tag é obrigatória' });
    }

    db.run("UPDATE tags SET nome = ?, cor = ? WHERE id = ?", [nome.trim(), cor.trim(), id], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Já existe uma tag com este nome' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Tag atualizada com sucesso' });
    });
});

// Excluir tag
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    // Primeiro limpar associações na tabela de relacionamento pedido_tags
    db.run("DELETE FROM pedido_tags WHERE tag_id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Em seguida excluir a tag em si
        db.run("DELETE FROM tags WHERE id = ?", [id], function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ message: 'Tag excluída com sucesso' });
        });
    });
});

module.exports = router;
