const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');
const cors = require('cors');

process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR (Uncaught Exception):', err);
    // Keep running - prevent crash for diagnosis
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL ERROR (Unhandled Rejection):', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// Force Reload of Server
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware Global para Uppercase
// Converte campos de texto para maiúsculo antes de salvar/processar
// Ignora campos sensíveis ou específicos
const uppercaseMiddleware = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            const val = req.body[key];

            // Lista de campos para ignorar
            const ignoreKeys = ['password', 'senha', 'email', 'layout_path', 'layout_type', 'arquivo', 'layout'];

            if (typeof val === 'string' && !ignoreKeys.includes(key)) {
                // Verificar se é URL ou Email (básico)
                if (!val.includes('@') && !val.startsWith('http')) {
                    req.body[key] = val.toUpperCase();
                }
            }
        });
    }
    next();
};

app.use(uppercaseMiddleware);

// Rotas
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const productionRoutes = require('./routes/production');

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/orders', require('./routes/orders_parser'));
app.use('/api/production', productionRoutes);
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users')); // Mantido para login, mas não para tarefas
app.use('/api/collaborators', require('./routes/collaborators'));
app.use('/api/dashboard', require('./routes/dashboard')); // NEW DASHBOARD ROUTE
app.use('/api/controle', require('./routes/controle')); // Rota de controle gerencial
app.use('/api/manuals', require('./routes/manuals')); // Rota de Manuais

// Servir frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Para acessar, abra o navegador neste endereço.`);
});
