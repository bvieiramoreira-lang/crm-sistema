const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcrypt');

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM usuarios WHERE username = ?", [username], (err, user) => {
        if (err) return res.status(500).json({ error: 'Erro no servidor' });
        if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

        const passwordIsValid = bcrypt.compareSync(password, user.senha);
        if (!passwordIsValid) return res.status(401).json({ error: 'Senha incorreta' });

        // Simples retorno de dados do usuário (em produção usaria JWT)
        res.json({
            id: user.id,
            nome: user.nome,
            perfil: user.perfil,
            setor_impressao: user.setor_impressao
        });
    });
});

// Registro (Apenas Admin deve ter acesso na UI, mas rota está aberta para setup inicial fácil)
router.post('/register', (req, res) => {
    const { nome, username, senha, perfil, setor_impressao } = req.body;
    const hash = bcrypt.hashSync(senha, 10);

    db.run(`INSERT INTO usuarios (nome, username, senha, perfil, setor_impressao) VALUES (?, ?, ?, ?, ?)`,
        [nome, username, hash, perfil, setor_impressao],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Usuário criado com sucesso' });
        }
    );
});

module.exports = router;
