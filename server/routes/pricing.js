const express = require('express');
const router = express.Router();
const db = require('../database');

// Faixas padrão para inicialização ou restauração
const FAIXAS_PADRAO_GERAL = [
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

const FAIXAS_PADRAO_CANETA = [
    { ordem: 1, categoria: 'CANETA', custo_min: 0.00, custo_max: 0.60, m20: 45,  m50: 40,  m100: 35,  m200: 30,  m500: 25,  m1000: 20, cor_nome: 'Rosa Pink',      cor_hex: '#ec4899' },
    { ordem: 2, categoria: 'CANETA', custo_min: 0.61, custo_max: 1.00, m20: 250, m50: 200, m100: 150, m200: 120, m500: 100, m1000: 90, cor_nome: 'Laranja',        cor_hex: '#ea580c' },
    { ordem: 3, categoria: 'CANETA', custo_min: 1.01, custo_max: 3.00, m20: 370, m50: 350, m100: 300, m200: 250, m500: 200, m1000: 150, cor_nome: 'Verde Bandeira', cor_hex: '#16a34a' },
    { ordem: 4, categoria: 'CANETA', custo_min: 3.01, custo_max: 500.0, m20: 200, m50: 150, m100: 120, m200: 100, m500: 90,  m1000: 80, cor_nome: 'Amarelo',        cor_hex: '#eab308' }
];

// Helper para obter parâmetros de configuração
function getConfigAsync() {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM configuracao_precificacao WHERE id = 1", [], (err, row) => {
            if (err) return reject(err);
            if (!row) {
                return resolve({
                    id: 1,
                    cf_percentual: 25.2601,
                    cv_percentual: 21.0000,
                    cv_fixo_reais: 0.00,
                    faturamento_mensal: 600000.00,
                    custos_fixos_total: 151560.86
                });
            }
            resolve(row);
        });
    });
}

// Helper para obter faixas
function getFaixasAsync(categoria = null) {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM faixas_margem_precificacao";
        let params = [];
        if (categoria) {
            sql += " WHERE categoria = ?";
            params.push(categoria);
        }
        sql += " ORDER BY ordem ASC";
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
        });
    });
}

// 1. Obter Configurações e Faixas Atuais (Geral e Canetas)
router.get('/config', async (req, res) => {
    try {
        const config = await getConfigAsync();
        const faixasGeral = await getFaixasAsync('GERAL');
        const faixasCaneta = await getFaixasAsync('CANETA');
        const todasFaixas = await getFaixasAsync();
        
        // Não expõe a senha diretamente no GET /config
        const safeConfig = { ...config };
        delete safeConfig.senha_acesso;

        res.json({
            config: safeConfig,
            faixas: todasFaixas,
            faixas_geral: faixasGeral,
            faixas_caneta: faixasCaneta
        });
    } catch (err) {
        console.error('Erro ao buscar configuração de precificação:', err);
        res.status(500).json({ error: err.message });
    }
});

// 1.1 Verificar Senha de Acesso à Precificação
router.post('/verify-password', async (req, res) => {
    try {
        const { password } = req.body || {};
        const config = await getConfigAsync();
        const storedPass = String(config.senha_acesso || '102030').trim();
        const inputPass = String(password || '').trim();

        if (inputPass && inputPass === storedPass) {
            return res.json({ success: true, message: 'Acesso autorizado' });
        } else {
            return res.status(401).json({ error: 'Senha incorreta. Tente novamente.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1.2 Alterar Senha de Acesso à Precificação
router.put('/change-password', async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const newPass = String(new_password || '').trim();
        const curPass = String(current_password || '').trim();

        if (!newPass) {
            return res.status(400).json({ error: 'A nova senha não pode estar em branco.' });
        }

        const config = await getConfigAsync();
        const storedPass = String(config.senha_acesso || '102030').trim();

        if (curPass && curPass === storedPass) {
            db.run("UPDATE configuracao_precificacao SET senha_acesso = ? WHERE id = 1", [newPass], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: 'Senha de precificação atualizada com sucesso!' });
            });
        } else {
            return res.status(401).json({ error: 'A senha atual informada está incorreta.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Atualizar Parâmetros Globais de Custos (CF, CV)
router.put('/config', (req, res) => {
    const { cf_percentual, cv_percentual, cv_fixo_reais, faturamento_mensal, custos_fixos_total } = req.body;

    const cf = parseFloat(cf_percentual) || 0;
    const cv = parseFloat(cv_percentual) || 0;
    const cv_fixo = parseFloat(cv_fixo_reais) || 0;
    const fat = parseFloat(faturamento_mensal) || 0;
    const cf_tot = parseFloat(custos_fixos_total) || 0;

    const sql = `
        UPDATE configuracao_precificacao 
        SET cf_percentual = ?, cv_percentual = ?, cv_fixo_reais = ?, faturamento_mensal = ?, custos_fixos_total = ?, atualizado_em = CURRENT_TIMESTAMP
        WHERE id = 1
    `;

    db.run(sql, [cf, cv, cv_fixo, fat, cf_tot], function (err) {
        if (err) {
            console.error('Erro ao atualizar custos da empresa:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Configurações de custos atualizadas com sucesso' });
    });
});

// 3. Atualizar Margens das Faixas (Geral ou Canetas em lote)
router.put('/faixas', (req, res) => {
    const { faixas } = req.body;

    if (!Array.isArray(faixas) || faixas.length === 0) {
        return res.status(400).json({ error: 'Array de faixas inválido ou vazio.' });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare(`
            UPDATE faixas_margem_precificacao 
            SET m20 = ?, m50 = ?, m100 = ?, m200 = ?, m500 = ?, m1000 = ?, custo_min = ?, custo_max = ?, atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        let hasError = false;
        faixas.forEach(f => {
            if (hasError) return;
            stmt.run([
                parseFloat(f.m20) || 0,
                parseFloat(f.m50) || 0,
                parseFloat(f.m100) || 0,
                parseFloat(f.m200) || 0,
                parseFloat(f.m500) || 0,
                parseFloat(f.m1000) || 0,
                parseFloat(f.custo_min) || 0,
                parseFloat(f.custo_max) || 0,
                f.id
            ], (err) => {
                if (err) {
                    hasError = true;
                    console.error('Erro ao atualizar faixa:', err);
                }
            });
        });

        stmt.finalize((err) => {
            if (err || hasError) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: 'Erro ao salvar faixas de margem.' });
            }
            db.run("COMMIT", (commitErr) => {
                if (commitErr) return res.status(500).json({ error: commitErr.message });
                res.json({ message: 'Faixas de margem atualizadas com sucesso.' });
            });
        });
    });
});

// 4. Restaurar Faixas Padrão (Por categoria ou todas)
router.post('/faixas/restaurar', (req, res) => {
    const { categoria } = req.body; // 'GERAL', 'CANETA' ou null/empty

    db.serialize(() => {
        let deleteSql = "DELETE FROM faixas_margem_precificacao";
        let params = [];
        if (categoria) {
            deleteSql += " WHERE categoria = ?";
            params.push(categoria);
        }

        db.run(deleteSql, params, (delErr) => {
            if (delErr) return res.status(500).json({ error: delErr.message });

            const stmt = db.prepare(`INSERT INTO faixas_margem_precificacao 
                (ordem, categoria, custo_min, custo_max, m20, m50, m100, m200, m500, m1000, cor_nome, cor_hex) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            const toInsert = [];
            if (!categoria || categoria === 'GERAL') toInsert.push(...FAIXAS_PADRAO_GERAL);
            if (!categoria || categoria === 'CANETA') toInsert.push(...FAIXAS_PADRAO_CANETA);

            toInsert.forEach(f => {
                stmt.run([f.ordem, f.categoria, f.custo_min, f.custo_max, f.m20, f.m50, f.m100, f.m200, f.m500, f.m1000, f.cor_nome, f.cor_hex]);
            });

            stmt.finalize((finErr) => {
                if (finErr) return res.status(500).json({ error: finErr.message });
                res.json({ message: 'Faixas padrão restauradas com sucesso.' });
            });
        });
    });
});

// 5. Motor de Cálculo de Preço (Dinâmico com suporte a 'GERAL' e 'CANETA')
router.post('/calculate', async (req, res) => {
    try {
        const { custo_base, custom_margins, tipo } = req.body;
        const tipoCalculo = (tipo || 'GERAL').toUpperCase() === 'CANETA' ? 'CANETA' : 'GERAL';
        const custoBaseNum = parseFloat(custo_base);

        if (isNaN(custoBaseNum) || custoBaseNum <= 0) {
            return res.status(400).json({ error: 'Informe um custo base válido maior que zero.' });
        }

        const config = await getConfigAsync();
        const faixas = await getFaixasAsync(tipoCalculo);

        // Fórmula do Custo Real: Z = Base + Base*(CF% + CV%) + CV_R$
        const cfRatio = (parseFloat(config.cf_percentual) || 0) / 100;
        const cvRatio = (parseFloat(config.cv_percentual) || 0) / 100;
        const cvFixo = parseFloat(config.cv_fixo_reais) || 0;

        const custoReal = custoBaseNum + (custoBaseNum * (cfRatio + cvRatio)) + cvFixo;

        // Localizar a faixa padrão correspondente ao custo base
        let faixaEncontrada = faixas.find(f => custoBaseNum >= f.custo_min && custoBaseNum <= f.custo_max);
        if (!faixaEncontrada && faixas.length > 0) {
            if (custoBaseNum < faixas[0].custo_min) faixaEncontrada = faixas[0];
            else faixaEncontrada = faixas[faixas.length - 1];
        }

        // Definir margens a serem aplicadas (se vier custom_margins, prioriza as customizadas)
        const margens = {
            m20: custom_margins && custom_margins.m20 !== undefined ? parseFloat(custom_margins.m20) : (faixaEncontrada ? faixaEncontrada.m20 : 250),
            m50: custom_margins && custom_margins.m50 !== undefined ? parseFloat(custom_margins.m50) : (faixaEncontrada ? faixaEncontrada.m50 : 200),
            m100: custom_margins && custom_margins.m100 !== undefined ? parseFloat(custom_margins.m100) : (faixaEncontrada ? faixaEncontrada.m100 : 150),
            m200: custom_margins && custom_margins.m200 !== undefined ? parseFloat(custom_margins.m200) : (faixaEncontrada ? faixaEncontrada.m200 : 120),
            m500: custom_margins && custom_margins.m500 !== undefined ? parseFloat(custom_margins.m500) : (faixaEncontrada ? faixaEncontrada.m500 : 100),
            m1000: custom_margins && custom_margins.m1000 !== undefined ? parseFloat(custom_margins.m1000) : (faixaEncontrada ? faixaEncontrada.m1000 : 90)
        };

        const quantidades = [20, 50, 100, 200, 500, 1000];
        const resultadoTiers = {};
        const slotPartes = [];

        quantidades.forEach(qtd => {
            const mKey = `m${qtd}`;
            const margemPct = parseFloat(margens[mKey]) || 0;
            const precoUnit = Math.round((custoReal * (1 + (margemPct / 100))) * 100) / 100;
            const totalLote = Math.round((precoUnit * qtd) * 100) / 100;
            const lucroUnit = Math.round((precoUnit - custoReal) * 100) / 100;
            const lucroTotal = Math.round((lucroUnit * qtd) * 100) / 100;
            const margemVendaPct = precoUnit > 0 ? Math.round(((precoUnit - custoReal) / precoUnit * 100) * 10) / 10 : 0;

            const isDisponivel = !(tipoCalculo === 'CANETA' && qtd < 50);

            resultadoTiers[qtd] = {
                quantidade: qtd,
                disponivel: isDisponivel,
                margem_aplicada: margemPct,
                margem_padrao: faixaEncontrada ? faixaEncontrada[mKey] : margemPct,
                preco_unitario: precoUnit,
                total_lote: totalLote,
                lucro_unitario: lucroUnit,
                lucro_total: lucroTotal,
                margem_venda_pct: margemVendaPct
            };

            // Para canetas, só inclui no slot de preços a partir de 50 peças (pedido mínimo)
            if (isDisponivel) {
                slotPartes.push(`${qtd}:${precoUnit.toFixed(2)}`);
            }
        });

        const slotPrecos = slotPartes.join(',');

        res.json({
            tipo: tipoCalculo,
            pedido_minimo: tipoCalculo === 'CANETA' ? 50 : 20,
            custo_base: custoBaseNum,
            custo_real: Math.round(custoReal * 10000) / 10000,
            custo_real_formatado: (Math.round(custoReal * 100) / 100).toFixed(2),
            faixa: faixaEncontrada || null,
            cf_percentual: config.cf_percentual,
            cv_percentual: config.cv_percentual,
            cv_fixo_reais: config.cv_fixo_reais,
            tiers: resultadoTiers,
            slot_precos: slotPrecos
        });

    } catch (err) {
        console.error('Erro no cálculo de precificação:', err);
        res.status(500).json({ error: err.message });
    }
});

// 6. Listar Produtos Precificados Salvos
router.get('/products', (req, res) => {
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;

    let sql = `SELECT * FROM produtos_precificados`;
    let params = [];

    if (search) {
        sql += ` WHERE codigo LIKE ? OR nome LIKE ?`;
        params.push(search, search);
    }

    sql += ` ORDER BY atualizado_em DESC LIMIT 200`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar produtos precificados:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// 7. Salvar ou Atualizar Produto no Catálogo
router.post('/products', (req, res) => {
    const {
        id, codigo, nome, tipo_precificacao, custo_base, custo_real,
        preco_20, preco_50, preco_100, preco_200, preco_500, preco_1000,
        margem_20, margem_50, margem_100, margem_200, margem_500, margem_1000,
        faixa_nome, slot_precos
    } = req.body;

    if (!nome || !nome.trim()) {
        return res.status(400).json({ error: 'O nome do produto é obrigatório.' });
    }

    const cBase = parseFloat(custo_base) || 0;
    const cReal = parseFloat(custo_real) || 0;
    const tipo = (tipo_precificacao || 'GERAL').toUpperCase() === 'CANETA' ? 'CANETA' : 'GERAL';

    if (id) {
        // Atualização
        const sql = `
            UPDATE produtos_precificados SET
                codigo = ?, nome = ?, tipo_precificacao = ?, custo_base = ?, custo_real = ?,
                preco_20 = ?, preco_50 = ?, preco_100 = ?, preco_200 = ?, preco_500 = ?, preco_1000 = ?,
                margem_20 = ?, margem_50 = ?, margem_100 = ?, margem_200 = ?, margem_500 = ?, margem_1000 = ?,
                faixa_nome = ?, slot_precos = ?, atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        db.run(sql, [
            codigo || null, nome.trim(), tipo, cBase, cReal,
            preco_20, preco_50, preco_100, preco_200, preco_500, preco_1000,
            margem_20, margem_50, margem_100, margem_200, margem_500, margem_1000,
            faixa_nome || null, slot_precos || null, id
        ], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Produto atualizado com sucesso no catálogo!', id });
        });
    } else {
        // Inserção
        const sql = `
            INSERT INTO produtos_precificados (
                codigo, nome, tipo_precificacao, custo_base, custo_real,
                preco_20, preco_50, preco_100, preco_200, preco_500, preco_1000,
                margem_20, margem_50, margem_100, margem_200, margem_500, margem_1000,
                faixa_nome, slot_precos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(sql, [
            codigo || null, nome.trim(), tipo, cBase, cReal,
            preco_20, preco_50, preco_100, preco_200, preco_500, preco_1000,
            margem_20, margem_50, margem_100, margem_200, margem_500, margem_1000,
            faixa_nome || null, slot_precos || null
        ], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Produto precificado salvo com sucesso!', id: this.lastID });
        });
    }
});

// 8. Excluir Produto do Catálogo
router.delete('/products/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM produtos_precificados WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produto removido com sucesso.' });
    });
});

module.exports = router;
