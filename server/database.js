const sqlite3 = require('sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../data/sp_system.db');

console.log("[DEBUG] Database Path Resolved:", dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Inicialização das tabelas
db.serialize(() => {
    // Tabela de Usuários
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        perfil TEXT NOT NULL, -- financeiro, arte, separacao, desembale, impressao, embale, logistica, admin
        setor_impressao TEXT -- Apenas para usuários de impressão (SILK_CILINDRICA, etc.)
    )`);

    // Tabela de Pedidos
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente TEXT NOT NULL,
        numero_pedido TEXT UNIQUE NOT NULL,
        prazo_entrega TEXT,
        tipo_envio TEXT,
        transportadora TEXT,
        status_geral TEXT DEFAULT 'NOVO', -- NOVO, EM_PRODUCAO, CONCLUIDO
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de Itens do Pedido
    db.run(`CREATE TABLE IF NOT EXISTS itens_pedido (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER,
        produto TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        setor_destino TEXT, -- O setor de produção (ex: SILK_PLANO)
        status_atual TEXT DEFAULT 'AGUARDANDO_ARTE',
        arte_status TEXT DEFAULT 'ARTE_NAO_FEITA', -- ARTE_NAO_FEITA, AGUARDANDO_APROVACAO, APROVADO
        -- Layout
        layout_path TEXT,
        layout_type TEXT, -- image, pdf
        
        -- Detalhes Produção
        cor_impressao TEXT,
        referencia TEXT,
        
        -- Logística
        quantidade_volumes INTEGER DEFAULT 0,
        peso REAL DEFAULT 0,
        altura REAL DEFAULT 0,
        largura REAL DEFAULT 0,
        comprimento REAL DEFAULT 0,
        dados_volumes TEXT, -- JSON Array com detalhes de cada volume
        
        FOREIGN KEY(pedido_id) REFERENCES pedidos(id)
    )`);

    // Tabela de Eventos de Produção (Histórico Operacional)
    db.run(`CREATE TABLE IF NOT EXISTS eventos_producao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER,
        operador_id INTEGER,
        operador_nome TEXT, -- Nome do operador (snapshot)
        setor TEXT,
        acao TEXT, -- INICIO, FIM, PARADA
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        quantidade_produzida INTEGER,
        FOREIGN KEY(item_id) REFERENCES itens_pedido(id),
        FOREIGN KEY(operador_id) REFERENCES usuarios(id)
    )`);

    // Tabela de Histórico de Alterações (Auditoria)
    db.run(`CREATE TABLE IF NOT EXISTS historico_pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER,
        usuario_id INTEGER,
        campo_alterado TEXT,
        valor_antigo TEXT,
        valor_novo TEXT,
        motivo TEXT,
        data_alteracao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(pedido_id) REFERENCES pedidos(id),
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
    )`);

    // Migrations manuais para garantir colunas novas (caso DB já exista)
    const addColumn = (table, col, type) => {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, (err) => {
            // Ignorar erro se coluna já existir
        });
    };

    addColumn('pedidos', 'observacao', 'TEXT');
    addColumn('pedidos', 'quantidade_volumes', 'INTEGER');
    addColumn('pedidos', 'peso', 'REAL');
    addColumn('pedidos', 'altura', 'REAL');
    addColumn('pedidos', 'largura', 'REAL');
    addColumn('pedidos', 'comprimento', 'REAL');
    addColumn('itens_pedido', 'layout_path', 'TEXT');
    addColumn('itens_pedido', 'layout_type', 'TEXT');
    addColumn('itens_pedido', 'cor_impressao', 'TEXT');
    addColumn('itens_pedido', 'layout_type', 'TEXT');
    addColumn('itens_pedido', 'cor_impressao', 'TEXT');
    addColumn('itens_pedido', 'dados_volumes', 'TEXT');
    addColumn('itens_pedido', 'referencia', 'TEXT');

    // New Columns for Digital Print File
    addColumn('itens_pedido', 'arquivo_impressao_digital_url', 'TEXT');
    addColumn('itens_pedido', 'arquivo_impressao_digital_nome', 'TEXT');
    addColumn('itens_pedido', 'arquivo_impressao_digital_tipo', 'TEXT'); // pdf, cdr, zip
    addColumn('itens_pedido', 'arquivo_impressao_digital_enviado_em', 'DATETIME');
    addColumn('itens_pedido', 'arquivo_impressao_digital_enviado_por', 'TEXT');

    // New Columns for Laser Print File
    addColumn('itens_pedido', 'arquivo_impressao_laser_url', 'TEXT');
    addColumn('itens_pedido', 'arquivo_impressao_laser_nome', 'TEXT');
    addColumn('itens_pedido', 'arquivo_impressao_laser_tipo', 'TEXT');
    addColumn('itens_pedido', 'arquivo_impressao_laser_enviado_em', 'DATETIME');
    addColumn('itens_pedido', 'arquivo_impressao_laser_enviado_por', 'TEXT');

    // Colunas de Tracking de Produção (Responsáveis e Datas)
    addColumn('itens_pedido', 'observacao_arte', 'TEXT');
    addColumn('itens_pedido', 'responsavel_arte', 'TEXT');
    addColumn('itens_pedido', 'data_arte_aprovacao', 'DATETIME');

    addColumn('itens_pedido', 'responsavel_separacao', 'TEXT');
    addColumn('itens_pedido', 'data_separacao', 'DATETIME');

    addColumn('itens_pedido', 'responsavel_desembale', 'TEXT');
    addColumn('itens_pedido', 'data_desembale', 'DATETIME');

    addColumn('itens_pedido', 'responsavel_impressao', 'TEXT');
    // data_impressao já pode ser calculada ou não, mas para garantir:
    addColumn('itens_pedido', 'data_impressao', 'DATETIME');

    addColumn('itens_pedido', 'responsavel_embale', 'TEXT');
    addColumn('itens_pedido', 'data_embale', 'DATETIME');

    addColumn('itens_pedido', 'responsavel_logistica', 'TEXT');
    addColumn('itens_pedido', 'data_envio', 'DATETIME');

    // Add operador_nome to eventos_producao
    addColumn('eventos_producao', 'operador_nome', 'TEXT');

    // Criar usuários padrão
    const criarUsuarioSeNaoExistir = (nome, username, password, perfil, setor_impressao = null) => {
        db.get("SELECT * FROM usuarios WHERE username = ?", [username.toUpperCase()], (err, row) => {
            if (!row) {
                const hash = bcrypt.hashSync(password, 10);
                db.run("INSERT OR IGNORE INTO usuarios (nome, username, senha, perfil, setor_impressao) VALUES (?, ?, ?, ?, ?)",
                    [nome, username.toUpperCase(), hash, perfil, setor_impressao], (err) => {
                        if (err) console.error(`Erro ao criar ${username}:`, err.message);
                        else console.log(`Usuário criado: ${username} / ${password} (${perfil})`);
                    });
            }
        });
    };

    criarUsuarioSeNaoExistir('Administrador', 'admin', 'admin123', 'admin');
    criarUsuarioSeNaoExistir('Arte Final', 'arte', 'arte123', 'arte');
    criarUsuarioSeNaoExistir('Separação', 'separacao', 'separacao123', 'separacao');
    criarUsuarioSeNaoExistir('Silk Cilíndrica', 'silkcilindrica', 'silkcilindrica123', 'impressao', 'SILK_CILINDRICA');
    criarUsuarioSeNaoExistir('Silk Plano', 'silkplano', 'silkplano123', 'impressao', 'SILK_PLANO');
    criarUsuarioSeNaoExistir('Tampografia', 'tampografia', 'tampografia123', 'impressao', 'TAMPOGRAFIA');
    criarUsuarioSeNaoExistir('Impressão Laser', 'laser', 'laser123', 'impressao', 'LASER');
    criarUsuarioSeNaoExistir('Impressão Digital', 'digital', 'digital123', 'impressao', 'DIGITAL');
    criarUsuarioSeNaoExistir('Estamparia', 'estamparia', 'estamparia123', 'impressao', 'ESTAMPARIA');
    criarUsuarioSeNaoExistir('Embale', 'embale', 'embale123', 'embale');
    criarUsuarioSeNaoExistir('Logística', 'logistica', 'logistica123', 'logistica');

    // Tabela SIMPLES de Colaboradores (MVP)
    db.run(`CREATE TABLE IF NOT EXISTS colaboradores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        setor TEXT NOT NULL, -- "Arte Final", "Separação", etc.
        ativo INTEGER DEFAULT 1 -- 1 = Ativo, 0 = Inativo
    )`);
    // Tabela de Manuais do Sistema
    db.run(`CREATE TABLE IF NOT EXISTS manuais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        categoria TEXT NOT NULL,
        arquivo_url TEXT NOT NULL,
        data_upload DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

module.exports = db;
