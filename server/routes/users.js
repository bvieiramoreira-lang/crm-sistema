
const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcrypt');

// GET /api/users - List all users (optionally filter by active)
router.get('/', (req, res) => {
    const activeOnly = req.query.active === 'true';
    let sql = "SELECT id, nome, username, perfil, setor_impressao, ativo, setores_secundarios FROM usuarios";

    if (activeOnly) {
        sql += " WHERE ativo = 1";
    }

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET /api/users/sector/:sector - Get users for a specific sector
router.get('/sector/:sector', (req, res) => {
    const { sector } = req.params;
    // Basic mapping or just filtering.
    // If sector is 'ARTE', profile 'arte' matches. 
    // Also check secondary sectors. Note: exact match on profile might be case sensitive? Profile is usually lowercase.

    const searchSector = sector.toLowerCase();

    const sql = `
        SELECT id, nome, username, perfil 
        FROM usuarios 
        WHERE ativo = 1 
        AND (
            perfil = ? 
            OR perfil = 'admin'
            OR setores_secundarios LIKE ?
        )
    `;

    db.all(sql, [searchSector, `%${searchSector}%`], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /api/users - Create User
router.post('/', (req, res) => {
    const { nome, username, senha, perfil, setor_impressao, setores_secundarios } = req.body;

    // Check if user exists
    db.get("SELECT id FROM usuarios WHERE username = ?", [username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(400).json({ error: 'Usuário já existe' });

        const hash = bcrypt.hashSync(senha, 10);

        db.run(`INSERT INTO usuarios (nome, username, senha, perfil, setor_impressao, ativo, setores_secundarios) 
                VALUES (?, ?, ?, ?, ?, 1, ?)`,
            [nome, username, hash, perfil, setor_impressao, setores_secundarios],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID, message: 'Usuário criado' });
            }
        );
    });
});

// PUT /api/users/:id - Update User
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { nome, perfil, setor_impressao, ativo, setores_secundarios, senha } = req.body;

    let sql = `UPDATE usuarios SET nome = ?, perfil = ?, setor_impressao = ?, ativo = ?, setores_secundarios = ?`;
    let params = [nome, perfil, setor_impressao, ativo, setores_secundarios];

    if (senha) {
        const hash = bcrypt.hashSync(senha, 10);
        sql += `, senha = ?`;
        params.push(hash);
    }

    sql += ` WHERE id = ?`;
    params.push(id);

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Usuário atualizado' });
    });
});

module.exports = router;
