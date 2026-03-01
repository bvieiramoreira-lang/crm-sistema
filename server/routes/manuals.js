const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the manuals upload directory exists
const uploadDir = path.join(__dirname, '../../public/uploads/manuais');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config for manuals
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Save using original filename but sanitized and with unique suffix for safety
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, 'manual-' + uniqueSuffix + '-' + safeName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for manuals
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
            return cb(null, true);
        }
        cb(new Error('Apenas arquivos PDF são permitidos para manuais!'));
    }
});

// GET /api/manuals - Listar manuais, opcionalmente por categoria
router.get('/', (req, res) => {
    const { categoria } = req.query;
    let query = `SELECT * FROM manuais ORDER BY data_upload DESC`;
    let params = [];

    if (categoria) {
        query = `SELECT * FROM manuais WHERE categoria = ? ORDER BY data_upload DESC`;
        params.push(categoria);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('[MANUALS] Erro ao buscar manuais:', err.message);
            return res.status(500).json({ error: 'Erro ao buscar manuais' });
        }
        res.json({ manuais: rows });
    });
});

// POST /api/manuals/upload - Adicionar novo manual (Restringir caso tenhamos auth, por enquanto apenas salva)
router.post('/upload', upload.single('arquivo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado ou arquivo inválido (apenas PDF).' });
    }

    const { titulo, categoria } = req.body;
    if (!titulo || !categoria) {
        return res.status(400).json({ error: 'Título e Categoria são obrigatórios.' });
    }

    const arquivo_url = '/uploads/manuais/' + req.file.filename;

    const query = `INSERT INTO manuais (titulo, categoria, arquivo_url) VALUES (?, ?, ?)`;
    db.run(query, [titulo, categoria, arquivo_url], function (err) {
        if (err) {
            console.error('[MANUALS] Erro ao salvar manual no BD:', err.message);
            return res.status(500).json({ error: 'Erro ao registrar no banco de dados' });
        }
        res.json({ success: true, message: 'Manual enviado com sucesso!', id: this.lastID });
    });
});

// DELETE /api/manuals/:id - Excluir manual
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    // Buscar arquivo para apagar do disco primeiro
    db.get(`SELECT arquivo_url FROM manuais WHERE id = ?`, [id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Manual não encontrado.' });
        }

        const filePath = path.join(__dirname, '../../public', row.arquivo_url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Apaga o arquivo
        }

        // Apagar do banco de dados
        db.run(`DELETE FROM manuais WHERE id = ?`, [id], function (err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao excluir do banco de dados' });
            }
            res.json({ success: true, message: 'Manual excluído com sucesso!' });
        });
    });
});

module.exports = router;
