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
        perfil TEXT NOT NULL, -- financeiro, arte, separacao, desembale, impressao, embale, logistica, admin, vendedor
        setor_impressao TEXT, -- Apenas para usuários de impressão (SILK_CILINDRICA, etc.)
        ativo INTEGER DEFAULT 1,
        setores_secundarios TEXT
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
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        finalizado_em DATETIME,
        finalizado_por TEXT
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
        layout_uploaded_by TEXT,
        layout_uploaded_at DATETIME,
        
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
        flag_embale_sem_volumes INTEGER DEFAULT 0,
        
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
    addColumn('usuarios', 'ativo', 'INTEGER DEFAULT 1');
    addColumn('usuarios', 'setores_secundarios', 'TEXT');
    addColumn('pedidos', 'quantidade_volumes', 'INTEGER');
    addColumn('pedidos', 'peso', 'REAL');
    addColumn('pedidos', 'altura', 'REAL');
    addColumn('pedidos', 'largura', 'REAL');
    addColumn('pedidos', 'comprimento', 'REAL');
    addColumn('pedidos', 'finalizado_em', 'DATETIME');
    addColumn('pedidos', 'finalizado_por', 'TEXT');
    addColumn('pedidos', 'retirado', 'INTEGER DEFAULT 0');
    addColumn('pedidos', 'data_retirada', 'DATETIME');

    addColumn('itens_pedido', 'layout_path', 'TEXT');
    addColumn('itens_pedido', 'layout_type', 'TEXT');
    addColumn('itens_pedido', 'layout_uploaded_by', 'TEXT');
    addColumn('itens_pedido', 'layout_uploaded_at', 'DATETIME');
    addColumn('itens_pedido', 'cor_impressao', 'TEXT');
    addColumn('itens_pedido', 'dados_volumes', 'TEXT');
    addColumn('itens_pedido', 'flag_embale_sem_volumes', 'INTEGER');
    addColumn('itens_pedido', 'referencia', 'TEXT');
    addColumn('itens_pedido', 'is_terceirizado', 'INTEGER DEFAULT 0');

    // MIGRATION: Colunas para o Fluxo de Arte Reestruturado
    addColumn('itens_pedido', 'is_alteracao', 'INTEGER DEFAULT 0');
    addColumn('itens_pedido', 'data_entrada_arte', 'DATETIME');
    addColumn('itens_pedido', 'data_inicio_arte', 'DATETIME');

    // Inicialização de itens antigos pendentes na arte
    db.serialize(() => {
        db.run("UPDATE itens_pedido SET arte_status = 'ENTRADA' WHERE status_atual = 'AGUARDANDO_ARTE' AND (arte_status = 'ARTE_NAO_FEITA' OR arte_status IS NULL)");
        db.run("UPDATE itens_pedido SET data_entrada_arte = DATETIME('now', 'localtime') WHERE data_entrada_arte IS NULL");
        // MIGRATION: Corrigir itens terceirizados presos em filas de desembale/produção
        db.run("UPDATE itens_pedido SET status_atual = 'AGUARDANDO_SEPARACAO' WHERE is_terceirizado = 1 AND status_atual IN ('AGUARDANDO_DESEMBALE', 'AGUARDANDO_PRODUCAO', 'EM_PRODUCAO')");
    });

    // MIGRATION: Colunas para o Sistema de Pausa
    addColumn('itens_pedido', 'is_pausado_producao', 'INTEGER DEFAULT 0');
    addColumn('itens_pedido', 'motivo_pausa_producao', 'TEXT');
    addColumn('itens_pedido', 'segundos_acumulados_producao', 'INTEGER DEFAULT 0');
    addColumn('itens_pedido', 'pausa_solicitada', 'INTEGER DEFAULT 0');
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

    // New Columns for Tampografia Print File
    addColumn('itens_pedido', 'arquivo_impressao_tampografia_url', 'TEXT');
    addColumn('itens_pedido', 'arquivo_impressao_tampografia_nome', 'TEXT');
    addColumn('itens_pedido', 'arquivo_impressao_tampografia_tipo', 'TEXT');
    addColumn('itens_pedido', 'arquivo_impressao_tampografia_enviado_em', 'DATETIME');
    addColumn('itens_pedido', 'arquivo_impressao_tampografia_enviado_por', 'TEXT');

    // Colunas para Gerenciamento de Kits e Sub-itens
    addColumn('itens_pedido', 'is_kit', 'INTEGER DEFAULT 0');
    addColumn('itens_pedido', 'parent_item_id', 'INTEGER');
    addColumn('itens_pedido', 'is_kit_component', 'INTEGER DEFAULT 0');

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

    // MIGRATIONS - INDICES DE PERFORMANCE (Fase 1 Otimização)
    db.run(`CREATE INDEX IF NOT EXISTS idx_itens_pedido_id ON itens_pedido(pedido_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_itens_status_atual ON itens_pedido(status_atual)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_pedidos_status_geral ON pedidos(status_geral)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_eventos_item_id ON eventos_producao(item_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_eventos_item_id_acao_id ON eventos_producao(item_id, acao, id DESC)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_itens_setor_status ON itens_pedido(setor_destino, status_atual)`);

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

    criarUsuarioSeNaoExistir('Administrador', 'admin', '102030@adm', 'admin');
    
    // Atualização forçada da senha do admin solicitada pelo usuário
    const forcedAdminHash = bcrypt.hashSync('102030@adm', 10);
    db.run("UPDATE usuarios SET senha = ? WHERE username = 'ADMIN'", [forcedAdminHash]);

    criarUsuarioSeNaoExistir('Arte Final', 'arte', 'arte123', 'arte');
    criarUsuarioSeNaoExistir('Separação', 'separacao', 'separacao123', 'separacao');
    criarUsuarioSeNaoExistir('Silk Cilíndrica', 'silkcilindrica', 'silkcilindrica123', 'impressao', 'SILK_CILINDRICA');
    criarUsuarioSeNaoExistir('Silk Plano', 'silkplano', 'silkplano123', 'impressao', 'SILK_PLANO');
    criarUsuarioSeNaoExistir('Tampografia', 'tampografia', 'tampografia123', 'impressao', 'TAMPOGRAFIA');
    criarUsuarioSeNaoExistir('Impressão Laser', 'laser', 'laser123', 'impressao', 'IMPRESSAO_LASER');
    criarUsuarioSeNaoExistir('Impressão Digital', 'digital', 'digital123', 'impressao', 'IMPRESSAO_DIGITAL');
    criarUsuarioSeNaoExistir('Estamparia', 'estamparia', 'estamparia123', 'impressao', 'ESTAMPARIA');
    criarUsuarioSeNaoExistir('Embale', 'embale', 'embale123', 'embale');
    criarUsuarioSeNaoExistir('Desembale', 'desembale', 'desembale123', 'desembale');
    criarUsuarioSeNaoExistir('Logística', 'logistica', 'logistica123', 'logistica');

    // FIX MIGRATION (2026-03-13): Corrigir perfis de impressão antigos no banco em produção
    db.run("UPDATE usuarios SET setor_impressao = 'IMPRESSAO_DIGITAL' WHERE setor_impressao = 'DIGITAL'");
    db.run("UPDATE usuarios SET setor_impressao = 'IMPRESSAO_LASER' WHERE setor_impressao = 'LASER'");

    // Tabela SIMPLES de Colaboradores (MVP)
    db.run(`CREATE TABLE IF NOT EXISTS colaboradores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        setor TEXT NOT NULL, -- "Arte Final", "Separação", etc.
        ativo INTEGER DEFAULT 1, -- 1 = Ativo, 0 = Inativo
        destaque_comportamento TEXT
    )`);

    // FIX MIGRATION: Garante que a coluna destaque será adicionada se a tabela já existia (Deploy remoto)
    db.run("ALTER TABLE colaboradores ADD COLUMN destaque_comportamento TEXT", (err) => {
        // Pode falhar silenciosamente se a coluna já existir :)
    });

    // Tabela de Manuais do Sistema
    db.run(`CREATE TABLE IF NOT EXISTS manuais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        categoria TEXT NOT NULL,
        arquivo_url TEXT NOT NULL,
        data_upload DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de Tags (Novo Recurso)
    db.run(`CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE NOT NULL,
        cor TEXT NOT NULL
    )`);

    // Tabela de Associação Pedidos <-> Tags
    db.run(`CREATE TABLE IF NOT EXISTS pedido_tags (
        pedido_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY(pedido_id, tag_id),
        FOREIGN KEY(pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
        FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )`);

    // Índices de performance para tags
    db.run(`CREATE INDEX IF NOT EXISTS idx_pedido_tags_pedido_id ON pedido_tags(pedido_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_pedido_tags_tag_id ON pedido_tags(tag_id)`);

    // Garantir tag padrão MERCADO LIVRE
    db.get("SELECT * FROM tags WHERE nome = 'MERCADO LIVRE'", [], (err, row) => {
        if (!row) {
            db.run("INSERT INTO tags (nome, cor) VALUES ('MERCADO LIVRE', '#f59e0b')");
        }
    });

    // ==========================================
    // MÓDULO DE PRECIFICAÇÃO DE PRODUTOS
    // ==========================================
    db.run(`CREATE TABLE IF NOT EXISTS configuracao_precificacao (
        id INTEGER PRIMARY KEY,
        senha_acesso TEXT DEFAULT '102030',
        cf_percentual REAL DEFAULT 25.2601,
        cv_percentual REAL DEFAULT 21.0000,
        cv_fixo_reais REAL DEFAULT 0.00,
        faturamento_mensal REAL DEFAULT 600000.00,
        custos_fixos_total REAL DEFAULT 151560.86,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run("ALTER TABLE configuracao_precificacao ADD COLUMN senha_acesso TEXT DEFAULT '102030'", (err) => {});

    db.get("SELECT * FROM configuracao_precificacao WHERE id = 1", [], (err, row) => {
        if (!row) {
            db.run(`INSERT INTO configuracao_precificacao (id, senha_acesso, cf_percentual, cv_percentual, cv_fixo_reais, faturamento_mensal, custos_fixos_total) 
                    VALUES (1, '102030', 25.2601, 21.0000, 0.00, 600000.00, 151560.86)`);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS faixas_margem_precificacao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ordem INTEGER NOT NULL,
        categoria TEXT DEFAULT 'GERAL',
        custo_min REAL NOT NULL,
        custo_max REAL NOT NULL,
        m20 REAL NOT NULL,
        m50 REAL NOT NULL,
        m100 REAL NOT NULL,
        m200 REAL NOT NULL,
        m500 REAL NOT NULL,
        m1000 REAL NOT NULL,
        cor_nome TEXT NOT NULL,
        cor_hex TEXT NOT NULL,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Migração de coluna se tabela já existia
    db.run("ALTER TABLE faixas_margem_precificacao ADD COLUMN categoria TEXT DEFAULT 'GERAL'", (err) => {});
    db.run("UPDATE faixas_margem_precificacao SET categoria = 'GERAL' WHERE categoria IS NULL");

    // Semente com as 12 faixas padrão para PRODUTOS EM GERAL
    db.get("SELECT COUNT(*) as total FROM faixas_margem_precificacao WHERE categoria = 'GERAL'", [], (err, row) => {
        if (!err && (!row || row.total === 0)) {
            const faixasPadrao = [
                { ordem: 1,  categoria: 'GERAL', custo_min: 0.00,   custo_max: 0.90,   m20: 370, m50: 350, m100: 300, m200: 250, m500: 200, m1000: 150, cor_nome: 'Verde Bandeira', cor_hex: '#16a34a' },
                { ordem: 2,  categoria: 'GERAL', custo_min: 0.91,   custo_max: 2.00,   m20: 250, m50: 200, m100: 150, m200: 120, m500: 100, m1000: 90,  cor_nome: 'Laranja',        cor_hex: '#ea580c' },
                { ordem: 3,  categoria: 'GERAL', custo_min: 2.01,   custo_max: 3.00,   m20: 200, m50: 150, m100: 120, m200: 100, m500: 90,  m1000: 80,  cor_nome: 'Amarelo',        cor_hex: '#eab308' },
                { ordem: 4,  categoria: 'GERAL', custo_min: 3.01,   custo_max: 6.00,   m20: 120, m50: 100, m100: 80,  m200: 70,  m500: 60,  m1000: 50,  cor_nome: 'Verde Musgo',    cor_hex: '#4d7c0f' },
                { ordem: 5,  categoria: 'GERAL', custo_min: 6.01,   custo_max: 10.00,  m20: 70,  m50: 65,  m100: 60,  m200: 50,  m500: 45,  m1000: 40,  cor_nome: 'Marrom',         cor_hex: '#854d0e' },
                { ordem: 6,  categoria: 'GERAL', custo_min: 10.01,  custo_max: 15.00,  m20: 65,  m50: 60,  m100: 50,  m200: 45,  m500: 40,  m1000: 30,  cor_nome: 'Rosa Claro',     cor_hex: '#f472b6' },
                { ordem: 7,  categoria: 'GERAL', custo_min: 15.01,  custo_max: 20.00,  m20: 60,  m50: 55,  m100: 45,  m200: 40,  m500: 35,  m1000: 30,  cor_nome: 'Lilás',          cor_hex: '#a855f7' },
                { ordem: 8,  categoria: 'GERAL', custo_min: 20.01,  custo_max: 40.00,  m20: 50,  m50: 45,  m100: 40,  m200: 35,  m500: 30,  m1000: 25,  cor_nome: 'Azul Claro',     cor_hex: '#0284c7' },
                { ordem: 9,  categoria: 'GERAL', custo_min: 40.01,  custo_max: 50.00,  m20: 45,  m50: 40,  m100: 35,  m200: 30,  m500: 25,  m1000: 20,  cor_nome: 'Rosa Pink',      cor_hex: '#ec4899' },
                { ordem: 10, categoria: 'GERAL', custo_min: 50.01,  custo_max: 70.00,  m20: 35,  m50: 30,  m100: 25,  m200: 20,  m500: 15,  m1000: 10,  cor_nome: 'Roxo',           cor_hex: '#7e22ce' },
                { ordem: 11, categoria: 'GERAL', custo_min: 70.01,  custo_max: 100.00, m20: 30,  m50: 25,  m100: 20,  m200: 15,  m500: 10,  m1000: 8,   cor_nome: 'Vermelho',       cor_hex: '#dc2626' },
                { ordem: 12, categoria: 'GERAL', custo_min: 100.01, custo_max: 500.00, m20: 20,  m50: 18,  m100: 15,  m200: 12,  m500: 10,  m100: 5,   cor_nome: 'Azul Tifany',    cor_hex: '#06b6d4' }
            ];

            const stmt = db.prepare(`INSERT INTO faixas_margem_precificacao 
                (ordem, categoria, custo_min, custo_max, m20, m50, m100, m200, m500, m1000, cor_nome, cor_hex) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            faixasPadrao.forEach(f => {
                stmt.run([f.ordem, f.categoria, f.custo_min, f.custo_max, f.m20, f.m50, f.m100, f.m200, f.m500, f.m1000, f.cor_nome, f.cor_hex]);
            });
            stmt.finalize();
        }
    });

    // Semente com as 4 faixas exclusivas para CANETAS
    db.get("SELECT COUNT(*) as total FROM faixas_margem_precificacao WHERE categoria = 'CANETA'", [], (err, row) => {
        if (!err && (!row || row.total === 0)) {
            const faixasCaneta = [
                { ordem: 1, categoria: 'CANETA', custo_min: 0.00, custo_max: 0.60, m20: 45,  m50: 40,  m100: 35,  m200: 30,  m500: 25,  m1000: 20, cor_nome: 'Rosa Pink',      cor_hex: '#ec4899' },
                { ordem: 2, categoria: 'CANETA', custo_min: 0.61, custo_max: 1.00, m20: 250, m50: 200, m100: 150, m200: 120, m500: 100, m1000: 90, cor_nome: 'Laranja',        cor_hex: '#ea580c' },
                { ordem: 3, categoria: 'CANETA', custo_min: 1.01, custo_max: 3.00, m20: 370, m50: 350, m100: 300, m200: 250, m500: 200, m1000: 150, cor_nome: 'Verde Bandeira', cor_hex: '#16a34a' },
                { ordem: 4, categoria: 'CANETA', custo_min: 3.01, custo_max: 500.0, m20: 200, m50: 150, m100: 120, m200: 100, m500: 90,  m1000: 80, cor_nome: 'Amarelo',        cor_hex: '#eab308' }
            ];

            const stmt = db.prepare(`INSERT INTO faixas_margem_precificacao 
                (ordem, categoria, custo_min, custo_max, m20, m50, m100, m200, m500, m1000, cor_nome, cor_hex) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            faixasCaneta.forEach(f => {
                stmt.run([f.ordem, f.categoria, f.custo_min, f.custo_max, f.m20, f.m50, f.m100, f.m200, f.m500, f.m1000, f.cor_nome, f.cor_hex]);
            });
            stmt.finalize();
            console.log("Faixas de margem padrão para CANETAS inicializadas.");
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS produtos_precificados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT,
        nome TEXT NOT NULL,
        tipo_precificacao TEXT DEFAULT 'GERAL', -- 'GERAL' ou 'CANETA'
        custo_base REAL NOT NULL,
        custo_real REAL NOT NULL,
        preco_20 REAL NOT NULL,
        preco_50 REAL NOT NULL,
        preco_100 REAL NOT NULL,
        preco_200 REAL NOT NULL,
        preco_500 REAL NOT NULL,
        preco_1000 REAL NOT NULL,
        margem_20 REAL,
        margem_50 REAL,
        margem_100 REAL,
        margem_200 REAL,
        margem_500 REAL,
        margem_1000 REAL,
        faixa_nome TEXT,
        slot_precos TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run("ALTER TABLE produtos_precificados ADD COLUMN tipo_precificacao TEXT DEFAULT 'GERAL'", (err) => {});
    db.run("UPDATE produtos_precificados SET tipo_precificacao = 'GERAL' WHERE tipo_precificacao IS NULL");

    db.run(`CREATE INDEX IF NOT EXISTS idx_produtos_precificados_codigo ON produtos_precificados(codigo)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_produtos_precificados_nome ON produtos_precificados(nome)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_produtos_precificados_tipo ON produtos_precificados(tipo_precificacao)`);
});

module.exports = db;
