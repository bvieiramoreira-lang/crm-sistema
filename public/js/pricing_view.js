// MÓDULO DE PRECIFICAÇÃO DE PRODUTOS - PERSYS 2.0

let pricingState = {
    activeTab: 'calc', // 'calc', 'catalog', 'settings'
    config: null,
    faixas: [],
    faixas_geral: [],
    faixas_caneta: [],
    products: [],
    catalogSearch: '',
    currentProduct: {
        id: null,
        codigo: '',
        nome: '',
        tipo_precificacao: 'GERAL', // 'GERAL' ou 'CANETA'
        custo_base: '',
        custom_margins: null,
        lastResult: null
    },
    calcDebounceTimer: null
};

// Controle de acesso por senha ao módulo de precificação
function isPricingUnlocked() {
    return sessionStorage.getItem('persys_pricing_unlocked') === 'true';
}

function lockPricing() {
    sessionStorage.removeItem('persys_pricing_unlocked');
    loadPricingView();
}

function renderPricingLockScreen(contentArea) {
    contentArea.innerHTML = `
        <div style="max-width: 440px; margin: 3rem auto; padding: 2.25rem 2rem; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06); text-align: center;">
            <div style="width: 68px; height: 68px; border-radius: 50%; background: #fef3c7; color: #d97706; display: inline-flex; align-items: center; justify-content: center; font-size: 2.2rem; margin-bottom: 1.25rem; border: 4px solid #fef9c3;">
                <i class="ph ph-lock-key"></i>
            </div>
            <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem;">
                Módulo Protegido
            </h2>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.45;">
                A Precificação de Produtos contém regras de margem e custos estratégicos. Digite a senha para desbloquear o acesso.
            </p>

            <form onsubmit="submitPricingPassword(event)" style="display: flex; flex-direction: column; gap: 1rem; text-align: left;">
                <div>
                    <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 0.4rem;">
                        Senha de Acesso
                    </label>
                    <div style="position: relative; display: flex; align-items: center;">
                        <i class="ph ph-key" style="position: absolute; left: 0.85rem; color: var(--text-secondary); font-size: 1.1rem; pointer-events: none;"></i>
                        <input type="password" id="pricing_unlock_pass" class="form-control" placeholder="Digite a senha..." required autofocus
                            style="padding-left: 2.5rem; padding-right: 2.5rem; height: 44px; font-size: 1rem; width: 100%;">
                        <button type="button" onclick="togglePricingPasswordVisibility('pricing_unlock_pass', 'pricing_unlock_eye')"
                            style="position: absolute; right: 0.75rem; background: transparent; border: none; cursor: pointer; color: var(--text-secondary); font-size: 1.2rem; display: flex; align-items: center; justify-content: center; padding: 0;">
                            <i id="pricing_unlock_eye" class="ph ph-eye"></i>
                        </button>
                    </div>
                </div>

                <div id="pricing_unlock_error" style="display: none; padding: 0.75rem; background: #fee2e2; border: 1px solid #fecaca; border-radius: var(--radius-md); color: #b91c1c; font-size: 0.85rem; align-items: center; gap: 0.5rem;">
                    <i class="ph ph-warning-circle" style="font-size: 1.2rem; flex-shrink: 0;"></i>
                    <span id="pricing_unlock_error_msg"></span>
                </div>

                <button type="submit" id="btn_submit_unlock" class="btn btn-primary" style="height: 44px; font-weight: 700; font-size: 0.95rem; justify-content: center; margin-top: 0.5rem;">
                    <i class="ph ph-lock-key-open"></i> Desbloquear Módulo
                </button>
            </form>
        </div>
    `;

    setTimeout(() => {
        const inp = document.getElementById('pricing_unlock_pass');
        if (inp) inp.focus();
    }, 100);
}

async function submitPricingPassword(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('pricing_unlock_pass');
    const btn = document.getElementById('btn_submit_unlock');
    const errBox = document.getElementById('pricing_unlock_error');
    const errMsg = document.getElementById('pricing_unlock_error_msg');

    if (!input) return;
    const password = input.value;
    if (!password) {
        input.focus();
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Verificando...';
    if (errBox) errBox.style.display = 'none';

    try {
        const res = await fetch('/api/pricing/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            sessionStorage.setItem('persys_pricing_unlocked', 'true');
            loadPricingView();
        } else {
            if (errBox && errMsg) {
                errMsg.textContent = data.error || 'Senha incorreta. Tente novamente.';
                errBox.style.display = 'flex';
            } else {
                alert(data.error || 'Senha incorreta.');
            }
            btn.disabled = false;
            btn.innerHTML = '<i class="ph ph-lock-key-open"></i> Desbloquear Módulo';
            input.select();
            input.focus();
        }
    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-lock-key-open"></i> Desbloquear Módulo';
        if (errBox && errMsg) {
            errMsg.textContent = 'Erro ao validar senha: ' + err.message;
            errBox.style.display = 'flex';
        } else {
            alert('Erro ao validar senha: ' + err.message);
        }
    }
}

function togglePricingPasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) {
            icon.classList.remove('ph-eye');
            icon.classList.add('ph-eye-slash');
        }
    } else {
        input.type = 'password';
        if (icon) {
            icon.classList.remove('ph-eye-slash');
            icon.classList.add('ph-eye');
        }
    }
}

// Ponto de entrada chamado pelo menu lateral
async function loadPricingView() {
    if (typeof setActiveNavLink === 'function') {
        setActiveNavLink('precificacao');
    }
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = 'Precificação de Produtos';

    const actionsEl = document.getElementById('headerActions');
    if (actionsEl) actionsEl.innerHTML = '';

    const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;

    // Se não estiver desbloqueado nesta sessão, solicita senha
    if (!isPricingUnlocked()) {
        renderPricingLockScreen(contentArea);
        return;
    }

    if (actionsEl) {
        actionsEl.innerHTML = `
            <button class="btn" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; font-size: 0.85rem;" onclick="lockPricing()" title="Bloquear acesso à precificação">
                <i class="ph ph-lock-key"></i> Bloquear Tela
            </button>
        `;
    }

    contentArea.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
            <i class="ph ph-spinner ph-spin" style="font-size: 2rem; color: var(--accent);"></i>
            <p style="margin-top: 0.5rem;">Carregando dados de precificação...</p>
        </div>
    `;

    try {
        await fetchPricingConfig();
        renderPricingLayout();
    } catch (err) {
        console.error('Erro ao carregar precificação:', err);
        contentArea.innerHTML = `
            <div class="card" style="padding: 2rem; text-align: center; color: var(--danger);">
                <i class="ph ph-warning-circle" style="font-size: 2.5rem; margin-bottom: 0.5rem;"></i>
                <h3>Erro ao carregar módulo de precificação</h3>
                <p style="color: var(--text-secondary); margin-top: 0.5rem;">${err.message || 'Verifique a conexão ou permissões de usuário.'}</p>
                <button class="btn" style="margin-top: 1rem;" onclick="loadPricingView()">Tentar Novamente</button>
            </div>
        `;
    }
}

// Busca configurações e faixas do backend
async function fetchPricingConfig() {
    const res = await fetch('/api/pricing/config?t=' + Date.now());
    if (!res.ok) throw new Error('Não foi possível obter as configurações de precificação.');
    const data = await res.json();
    pricingState.config = data.config || {};
    pricingState.faixas = data.faixas || [];
    pricingState.faixas_geral = data.faixas_geral || (data.faixas || []).filter(f => f.categoria === 'GERAL');
    pricingState.faixas_caneta = data.faixas_caneta || (data.faixas || []).filter(f => f.categoria === 'CANETA');
}

// Renderiza a casca principal com abas
function renderPricingLayout() {
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;

    const tabs = [
        { id: 'calc', label: 'Calculadora Rápida', icon: 'ph-calculator' },
        { id: 'catalog', label: 'Catálogo de Preços Salvos', icon: 'ph-books' },
        { id: 'settings', label: 'Configurações & Faixas de Lucro', icon: 'ph-sliders-horizontal' }
    ];

    let tabsHtml = tabs.map(t => {
        const isActive = pricingState.activeTab === t.id;
        const activeStyle = isActive 
            ? 'border-bottom: 3px solid var(--accent); color: var(--accent); font-weight: 700;' 
            : 'border-bottom: 3px solid transparent; color: var(--text-secondary); font-weight: 500;';
        return `
            <button onclick="switchPricingTab('${t.id}')" 
                style="background: transparent; border: none; padding: 0.75rem 1.25rem; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; transition: var(--transition); ${activeStyle}">
                <i class="ph ${t.icon}" style="font-size: 1.15rem;"></i>
                <span>${t.label}</span>
            </button>
        `;
    }).join('');

    contentArea.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <!-- Barra de Abas Superior -->
            <div style="background: var(--bg-surface); border-bottom: 1px solid var(--border); display: flex; gap: 0.5rem; border-radius: var(--radius-lg) var(--radius-lg) 0 0; padding: 0 0.5rem;">
                ${tabsHtml}
            </div>

            <!-- Conteúdo da Aba Ativa -->
            <div id="pricingTabContent"></div>
        </div>
    `;

    renderActiveTabContent();
}

function switchPricingTab(tabId) {
    pricingState.activeTab = tabId;
    renderPricingLayout();
}

function renderActiveTabContent() {
    const container = document.getElementById('pricingTabContent');
    if (!container) return;

    if (pricingState.activeTab === 'calc') {
        renderCalculatorTab(container);
    } else if (pricingState.activeTab === 'catalog') {
        renderCatalogTab(container);
    } else if (pricingState.activeTab === 'settings') {
        renderSettingsTab(container);
    }
}

// Alternar entre Produtos em Geral e Canetas
function selectPricingType(tipo) {
    pricingState.currentProduct.tipo_precificacao = tipo;
    pricingState.currentProduct.custom_margins = null; // reseta margens manuais para adotar a nova tabela
    executeCalculation();
}

// =========================================================================
// ABA 1: CALCULADORA RÁPIDA DE PRECIFICAÇÃO
// =========================================================================
function renderCalculatorTab(container) {
    const p = pricingState.currentProduct;
    const res = p.lastResult;
    const isCaneta = p.tipo_precificacao === 'CANETA';

    const cf = pricingState.config ? parseFloat(pricingState.config.cf_percentual || 25.26).toFixed(2) : '25.26';
    const cv = pricingState.config ? parseFloat(pricingState.config.cv_percentual || 21.00).toFixed(2) : '21.00';
    const somaEncargos = (parseFloat(cf) + parseFloat(cv)).toFixed(2);

    let resultHtml = '';

    if (res && res.tiers) {
        const faixa = res.faixa;
        const tipoLabel = isCaneta ? '🖊️ Caneta' : '📦 Geral';
        const faixaBadge = faixa ? `
            <span style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem; border-radius: 9999px; background: ${faixa.cor_hex}15; color: ${faixa.cor_hex}; font-weight: 700; font-size: 0.85rem; border: 1px solid ${faixa.cor_hex}40;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${faixa.cor_hex};"></span>
                ${tipoLabel} - Faixa ${faixa.ordem}: R$ ${faixa.custo_min.toFixed(2)} a R$ ${faixa.custo_max >= 500 ? 'Acima' : faixa.custo_max.toFixed(2)} (${faixa.cor_nome})
            </span>
        ` : '';

        // Detalhamento de custos
        const baseVal = parseFloat(res.custo_base || 0);
        const cfReais = (baseVal * (parseFloat(cf) / 100)).toFixed(2);
        const cvReais = (baseVal * (parseFloat(cv) / 100)).toFixed(2);
        const realVal = parseFloat(res.custo_real || 0).toFixed(2);

        // Grade de Cards: Canetas tem pedido mínimo de 50 peças
        const quantities = isCaneta ? [50, 100, 200, 500, 1000] : [20, 50, 100, 200, 500, 1000];
        const cardsHtml = quantities.map(qtd => {
            const tier = res.tiers[qtd] || {};
            const isCustom = tier.margem_aplicada !== tier.margem_padrao;
            const customBadge = isCustom ? `<span style="font-size: 0.7rem; background: #ffedd5; color: #c2410c; padding: 1px 5px; border-radius: 4px; font-weight: 600;">Customizada</span>` : '';

            return `
                <div class="card" style="padding: 1.25rem; border-radius: var(--radius-lg); border: 2px solid ${isCustom ? '#f97316' : 'var(--border)'}; background: var(--bg-surface); display: flex; flex-direction: column; gap: 0.75rem; position: relative; box-shadow: var(--shadow-sm);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">${qtd} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">peças</span></span>
                        ${customBadge}
                    </div>

                    <!-- Input Editável de Margem -->
                    <div style="background: #f8fafc; padding: 0.5rem 0.75rem; border-radius: var(--radius); border: 1px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                            <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Margem Lucro</label>
                            <span style="font-size: 0.75rem; color: var(--text-tertiary);" title="Padrão da Faixa">Padrão: ${tier.margem_padrao}%</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <input type="number" step="1" min="0" max="2000" 
                                class="form-control" 
                                id="margin_input_${qtd}" 
                                value="${tier.margem_aplicada}" 
                                oninput="onCustomMarginChange(${qtd}, this.value)"
                                style="font-weight: 700; font-size: 1.05rem; padding: 0.35rem 0.5rem; text-align: right; background: #ffffff;">
                            <span style="font-weight: 700; color: var(--text-secondary);">%</span>
                        </div>
                    </div>

                    <!-- Preço de Venda Unitário -->
                    <div style="text-align: center; padding: 0.5rem 0; border-bottom: 1px dashed var(--border);">
                        <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary);">Preço Unitário</div>
                        <div style="font-size: 1.75rem; font-weight: 900; color: var(--accent); margin-top: 0.15rem;">
                            R$ ${tier.preco_unitario.toFixed(2)}
                        </div>
                        <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-top: 0.2rem;">
                            Total: <strong>R$ ${tier.total_lote.toFixed(2)}</strong>
                        </div>
                    </div>

                    <!-- Métricas de Lucro -->
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
                        <span>Lucro Unitário:</span>
                        <strong style="color: var(--success);">+R$ ${tier.lucro_unitario.toFixed(2)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
                        <span>Lucro Total Lote:</span>
                        <strong style="color: var(--success);">+R$ ${tier.lucro_total.toFixed(2)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
                        <span>Margem Venda:</span>
                        <strong style="color: #0284c7;">${tier.margem_venda_pct}%</strong>
                    </div>
                </div>
            `;
        }).join('');

        resultHtml = `
            <!-- Barra de Resumo e Custo Real -->
            <div class="card" style="padding: 1.25rem; border-radius: var(--radius-lg); background: #ffffff; border: 1px solid var(--border);">
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem; margin-bottom: 1rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
                            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">
                                ${p.nome ? escapeHtml(p.nome) : (isCaneta ? 'Caneta Personalizada' : 'Produto Sem Nome')}
                            </h3>
                            ${p.codigo ? `<span class="badge" style="background: #f1f5f9; color: #475569; font-weight: 700;">SKU: ${escapeHtml(p.codigo)}</span>` : ''}
                            <span class="badge" style="background: ${isCaneta ? '#f3e8ff' : '#f1f5f9'}; color: ${isCaneta ? 'var(--accent)' : '#475569'}; font-weight: 700;">
                                ${isCaneta ? '🖊️ Caneta' : '📦 Geral'}
                            </span>
                            ${isCaneta ? '<span class="badge" style="background: #fef3c7; color: #92400e; font-weight: 700; border: 1px solid #fde68a;"><i class="ph ph-warning-circle"></i> Pedido Mínimo: 50 peças</span>' : ''}
                        </div>
                        <div style="margin-top: 0.35rem;">${faixaBadge}</div>
                    </div>

                    <!-- Botões de Ação Rápida -->
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn" style="background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; font-size: 0.85rem;" onclick="resetToDefaultMargins()" title="Restaura as margens padrão da faixa">
                            <i class="ph ph-arrow-counter-clockwise"></i> Restaurar Margens
                        </button>
                        <button class="btn" style="background: #0284c7; color: white; font-size: 0.85rem;" onclick="copyWhatsAppTable()">
                            <i class="ph ph-whatsapp-logo"></i> Copiar Tabela (WhatsApp)
                        </button>
                        <button class="btn" style="background: #475569; color: white; font-size: 0.85rem;" onclick="copySlotString()">
                            <i class="ph ph-brackets-curly"></i> Copiar Slot Preços
                        </button>
                        <button class="btn btn-primary" style="font-size: 0.85rem;" onclick="saveProductToCatalog()">
                            <i class="ph ph-floppy-disk"></i> ${p.id ? 'Atualizar no Catálogo' : 'Salvar no Catálogo'}
                        </button>
                    </div>
                </div>

                <!-- Detalhamento de Custos (Fórmula Empresa) -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; background: #f8fafc; padding: 1rem; border-radius: var(--radius); border: 1px solid #e2e8f0;">
                    <div>
                        <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Custo Base (Fornecedor)</span>
                        <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-top: 0.2rem;">R$ ${baseVal.toFixed(2)}</div>
                    </div>
                    <div>
                        <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Custo Fixo (+${cf}%)</span>
                        <div style="font-size: 1.15rem; font-weight: 700; color: #64748b; margin-top: 0.2rem;">+ R$ ${cfReais}</div>
                    </div>
                    <div>
                        <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Custo Variável (+${cv}%)</span>
                        <div style="font-size: 1.15rem; font-weight: 700; color: #64748b; margin-top: 0.2rem;">+ R$ ${cvReais}</div>
                    </div>
                    <div style="background: #ffffff; padding: 0.5rem 0.75rem; border-radius: var(--radius); border: 2px solid var(--accent); box-shadow: var(--shadow-sm);">
                        <span style="font-size: 0.75rem; color: var(--accent); text-transform: uppercase; font-weight: 800;">Custo Real Empresa (Z)</span>
                        <div style="font-size: 1.25rem; font-weight: 900; color: var(--accent); margin-top: 0.2rem;">R$ ${realVal}</div>
                    </div>
                </div>
            </div>

            <!-- Grade de 6 Tiers -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
                ${cardsHtml}
            </div>

            <!-- Card Especial > 1000 Peças -->
            <div class="card" style="padding: 1rem 1.5rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="background: #3b82f6; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <i class="ph ph-crown"></i>
                    </div>
                    <div>
                        <div style="font-weight: 800; color: #1e3a8a; font-size: 1rem;">Pedidos Acima de 1.000 Peças</div>
                        <div style="font-size: 0.85rem; color: #3b82f6;">Produção em grande escala e margens diferenciadas sob consulta direta com o setor comercial.</div>
                    </div>
                </div>
                <span class="badge" style="background: #2563eb; color: white; padding: 0.5rem 1rem; font-weight: 700; font-size: 0.85rem; border-radius: 9999px;">
                    Sob Orçamento Exclusivo
                </span>
            </div>
        `;
    }

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            <!-- Painel Superior de Entrada -->
            <div class="card" style="padding: 1.5rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border);">
                <!-- Seletor de Tipo (Geral vs Canetas) -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-secondary); text-transform: uppercase;">Modalidade:</span>
                        <div style="display: inline-flex; background: #f1f5f9; padding: 3px; border-radius: var(--radius); border: 1px solid #cbd5e1;">
                            <button type="button" 
                                onclick="selectPricingType('GERAL')"
                                style="border: none; padding: 0.45rem 1rem; border-radius: var(--radius); font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: var(--transition); ${!isCaneta ? 'background: var(--accent); color: white; box-shadow: var(--shadow-sm);' : 'background: transparent; color: #64748b;'}">
                                📦 Produtos em Geral
                            </button>
                            <button type="button" 
                                onclick="selectPricingType('CANETA')"
                                style="border: none; padding: 0.45rem 1rem; border-radius: var(--radius); font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: var(--transition); ${isCaneta ? 'background: var(--accent); color: white; box-shadow: var(--shadow-sm);' : 'background: transparent; color: #64748b;'}">
                                🖊️ Canetas (Tabela Especial)
                            </button>
                        </div>
                    </div>

                    <button class="btn" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background: #f1f5f9; color: var(--text-secondary);" onclick="clearCalculatorForm()">
                        <i class="ph ph-trash"></i> Limpar Campos
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: 1.2fr 1fr 2fr; gap: 1rem; align-items: flex-end;">
                    <!-- Custo Base -->
                    <div>
                        <label style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); display: block; margin-bottom: 0.35rem;">
                            Custo ${isCaneta ? 'da Caneta' : 'do Produto'} (Fornecedor) *
                        </label>
                        <div style="position: relative; display: flex; align-items: center;">
                            <span style="position: absolute; left: 0.75rem; font-weight: 700; color: var(--text-secondary); font-size: 0.95rem;">R$</span>
                            <input type="number" step="0.01" min="0" 
                                id="calcCustoBase" 
                                class="form-control" 
                                placeholder="0,00" 
                                value="${p.custo_base || ''}"
                                oninput="onCustoBaseInputChange(this.value)"
                                style="padding-left: 2.25rem; font-size: 1.15rem; font-weight: 800; color: var(--accent); height: 44px;">
                        </div>
                    </div>

                    <!-- Código / SKU -->
                    <div>
                        <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 0.35rem;">
                            Código / Referência (SKU)
                        </label>
                        <input type="text" 
                            id="calcCodigo" 
                            class="form-control" 
                            placeholder="Ex: PP767" 
                            value="${p.codigo || ''}"
                            oninput="pricingState.currentProduct.codigo = this.value"
                            style="height: 44px; font-weight: 600;">
                    </div>

                    <!-- Nome do Produto -->
                    <div>
                        <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 0.35rem;">
                            Nome do Produto
                        </label>
                        <input type="text" 
                            id="calcNome" 
                            class="form-control" 
                            placeholder="${isCaneta ? 'Ex: Caneta Plástica Esferográfica' : 'Ex: Copo Long Drink Personalizado'}" 
                            value="${p.nome || ''}"
                            oninput="pricingState.currentProduct.nome = this.value"
                            style="height: 44px;">
                    </div>
                </div>

                <div style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-secondary); display: flex; gap: 1rem; align-items: center;">
                    <span><i class="ph ph-info" style="color: var(--accent);"></i> Tabela ativa: <strong>${isCaneta ? 'Canetas (4 Faixas Especiais)' : 'Produtos em Geral (12 Faixas)'}</strong>. Encargos: <strong>CF ${cf}% + CV ${cv}% = ${somaEncargos}%</strong>.</span>
                </div>
            </div>

            <!-- Área de Resultados Dinâmicos -->
            <div id="calculatorResultArea">
                ${resultHtml || `
                    <div class="card" style="padding: 3rem 2rem; text-align: center; color: var(--text-secondary); border: 2px dashed var(--border); border-radius: var(--radius-lg); background: transparent;">
                        <i class="ph ${isCaneta ? 'ph-pen' : 'ph-arrow-circle-up'}" style="font-size: 3rem; color: var(--text-tertiary); margin-bottom: 0.75rem;"></i>
                        <h4 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">Digite o Custo ${isCaneta ? 'da Caneta' : 'do Produto'} acima</h4>
                        <p style="margin-top: 0.5rem; font-size: 0.9rem;">Ao digitar o custo base do fornecedor, o PERSYS calculará automaticamente o custo real da empresa e as 6 faixas de preço de 20 a 1.000 peças com as regras de ${isCaneta ? 'Canetas' : 'Produtos em Geral'}.</p>
                    </div>
                `}
            </div>
        </div>
    `;
}

// Manipulador de input do custo base com debounce
function onCustoBaseInputChange(val) {
    pricingState.currentProduct.custo_base = val;
    pricingState.currentProduct.custom_margins = null;

    clearTimeout(pricingState.calcDebounceTimer);
    pricingState.calcDebounceTimer = setTimeout(() => {
        executeCalculation();
    }, 250);
}

// Manipulador de alteração manual de margem em uma quantidade específica
function onCustomMarginChange(qtd, newMarginVal) {
    const marginNum = parseFloat(newMarginVal);
    if (isNaN(marginNum)) return;

    if (!pricingState.currentProduct.custom_margins) {
        const res = pricingState.currentProduct.lastResult;
        if (res && res.tiers) {
            pricingState.currentProduct.custom_margins = {
                m20: res.tiers[20].margem_aplicada,
                m50: res.tiers[50].margem_aplicada,
                m100: res.tiers[100].margem_aplicada,
                m200: res.tiers[200].margem_aplicada,
                m500: res.tiers[500].margem_aplicada,
                m1000: res.tiers[1000].margem_aplicada
            };
        } else {
            pricingState.currentProduct.custom_margins = {};
        }
    }

    pricingState.currentProduct.custom_margins[`m${qtd}`] = marginNum;

    clearTimeout(pricingState.calcDebounceTimer);
    pricingState.calcDebounceTimer = setTimeout(() => {
        executeCalculation();
    }, 250);
}

// Restaura margens padrão da faixa
function resetToDefaultMargins() {
    pricingState.currentProduct.custom_margins = null;
    executeCalculation();
}

// Limpar calculadora
function clearCalculatorForm() {
    const tipoAtual = pricingState.currentProduct.tipo_precificacao;
    pricingState.currentProduct = {
        id: null,
        codigo: '',
        nome: '',
        tipo_precificacao: tipoAtual,
        custo_base: '',
        custom_margins: null,
        lastResult: null
    };
    renderActiveTabContent();
}

// Executa requisição para o backend calcular
async function executeCalculation() {
    const custo = parseFloat(pricingState.currentProduct.custo_base);
    if (isNaN(custo) || custo <= 0) {
        pricingState.currentProduct.lastResult = null;
        renderActiveTabContent();
        return;
    }

    try {
        const payload = {
            custo_base: custo,
            tipo: pricingState.currentProduct.tipo_precificacao || 'GERAL',
            custom_margins: pricingState.currentProduct.custom_margins
        };

        const res = await fetch('/api/pricing/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Erro no cálculo');
        }

        const data = await res.json();
        pricingState.currentProduct.lastResult = data;
        renderActiveTabContent();

        // Recoloca o foco no input caso estivesse editando margem
        if (document.activeElement && document.activeElement.id.startsWith('margin_input_')) {
            const activeId = document.activeElement.id;
            const activeEl = document.getElementById(activeId);
            if (activeEl) {
                activeEl.focus();
                activeEl.select();
            }
        }
    } catch (err) {
        console.error('Erro ao calcular precificação:', err);
    }
}

// Salva o produto precificado no catálogo
async function saveProductToCatalog() {
    const p = pricingState.currentProduct;
    const res = p.lastResult;

    if (!res || !res.tiers) {
        alert('Calcule um preço antes de salvar no catálogo.');
        return;
    }

    const nome = (p.nome || '').trim();
    if (!nome) {
        alert('Por favor, informe o Nome do Produto para salvar no catálogo.');
        const nomeInput = document.getElementById('calcNome');
        if (nomeInput) nomeInput.focus();
        return;
    }

    const payload = {
        id: p.id,
        codigo: (p.codigo || '').trim(),
        nome: nome,
        tipo_precificacao: p.tipo_precificacao || 'GERAL',
        custo_base: res.custo_base,
        custo_real: res.custo_real,
        preco_20: res.tiers[20].preco_unitario,
        preco_50: res.tiers[50].preco_unitario,
        preco_100: res.tiers[100].preco_unitario,
        preco_200: res.tiers[200].preco_unitario,
        preco_500: res.tiers[500].preco_unitario,
        preco_1000: res.tiers[1000].preco_unitario,
        margem_20: res.tiers[20].margem_aplicada,
        margem_50: res.tiers[50].margem_aplicada,
        margem_100: res.tiers[100].margem_aplicada,
        margem_200: res.tiers[200].margem_aplicada,
        margem_500: res.tiers[500].margem_aplicada,
        margem_1000: res.tiers[1000].margem_aplicada,
        faixa_nome: res.faixa ? res.faixa.cor_nome : null,
        slot_precos: res.slot_precos
    };

    try {
        const resp = await fetch('/api/pricing/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const errData = await resp.json();
            throw new Error(errData.error || 'Erro ao salvar produto');
        }

        const data = await resp.json();
        p.id = data.id || p.id;
        alert('Produto salvo com sucesso no catálogo de preços!');
    } catch (err) {
        alert('Erro ao salvar produto: ' + err.message);
    }
}

// Copiar mensagem formatada para WhatsApp
function copyWhatsAppTable() {
    const p = pricingState.currentProduct;
    const res = p.lastResult;
    if (!res || !res.tiers) return;

    const nome = p.nome ? p.nome.trim() : (p.tipo_precificacao === 'CANETA' ? 'Caneta Personalizada' : 'Produto Personalizado');
    const codigo = p.codigo ? ` (${p.codigo.trim()})` : '';

    let text = `*${nome}${codigo}*\n`;
    text += `*Tabela de Preços Personalizados:*\n`;
    if (p.tipo_precificacao === 'CANETA') {
        text += `_(Pedido mínimo: 50 peças)_\n`;
        text += `• 50 peças: R$ ${res.tiers[50].preco_unitario.toFixed(2)} /un (Total: R$ ${res.tiers[50].total_lote.toFixed(2)})\n`;
    } else {
        text += `• 20 peças: R$ ${res.tiers[20].preco_unitario.toFixed(2)} /un (Total: R$ ${res.tiers[20].total_lote.toFixed(2)})\n`;
        text += `• 50 peças: R$ ${res.tiers[50].preco_unitario.toFixed(2)} /un (Total: R$ ${res.tiers[50].total_lote.toFixed(2)})\n`;
    }
    text += `• 100 peças: R$ ${res.tiers[100].preco_unitario.toFixed(2)} /un (Total: R$ ${res.tiers[100].total_lote.toFixed(2)})\n`;
    text += `• 200 peças: R$ ${res.tiers[200].preco_unitario.toFixed(2)} /un (Total: R$ ${res.tiers[200].total_lote.toFixed(2)})\n`;
    text += `• 500 peças: R$ ${res.tiers[500].preco_unitario.toFixed(2)} /un (Total: R$ ${res.tiers[500].total_lote.toFixed(2)})\n`;
    text += `• 1.000 peças: R$ ${res.tiers[1000].preco_unitario.toFixed(2)} /un (Total: R$ ${res.tiers[1000].total_lote.toFixed(2)})\n`;
    text += `\n_Acima de 1.000 peças: Sob Orçamento Exclusivo_`;

    navigator.clipboard.writeText(text).then(() => {
        alert('Tabela copiada com sucesso para a Área de Transferência! Pronto para colar no WhatsApp.');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
    });
}

// Copiar string de slot de preços
function copySlotString() {
    const res = pricingState.currentProduct.lastResult;
    if (!res || !res.slot_precos) return;

    navigator.clipboard.writeText(res.slot_precos).then(() => {
        alert('Slot de preços copiado: ' + res.slot_precos);
    }).catch(err => {
        console.error('Erro ao copiar slot:', err);
    });
}

// =========================================================================
// ABA 2: CATÁLOGO DE PRODUTOS SALVOS
// =========================================================================
async function renderCatalogTab(container) {
    container.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
            <i class="ph ph-spinner ph-spin" style="font-size: 2rem; color: var(--accent);"></i>
            <p style="margin-top: 0.5rem;">Carregando produtos salvos...</p>
        </div>
    `;

    try {
        const query = pricingState.catalogSearch ? `?search=${encodeURIComponent(pricingState.catalogSearch)}` : '';
        const res = await fetch('/api/pricing/products' + query);
        if (!res.ok) throw new Error('Falha ao buscar produtos do catálogo.');
        pricingState.products = await res.json();
    } catch (err) {
        container.innerHTML = `<div class="card" style="padding: 2rem; color: var(--danger); text-align: center;">${err.message}</div>`;
        return;
    }

    const prods = pricingState.products;

    let rowsHtml = '';
    if (prods.length === 0) {
        rowsHtml = `
            <tr>
                <td colspan="12" style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                    <i class="ph ph-books" style="font-size: 2.5rem; color: var(--text-tertiary); margin-bottom: 0.5rem; display: block;"></i>
                    Nenhum produto precificado encontrado no catálogo.
                </td>
            </tr>
        `;
    } else {
        rowsHtml = prods.map(p => {
            const isCaneta = (p.tipo_precificacao || 'GERAL').toUpperCase() === 'CANETA';
            const tipoBadge = isCaneta 
                ? `<span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; background: #f3e8ff; color: var(--accent); font-weight: 700;">🖊️ Caneta</span>` 
                : `<span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #475569; font-weight: 600;">📦 Geral</span>`;

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 0.75rem; font-weight: 700; color: #334155;">${escapeHtml(p.codigo || '--')}</td>
                    <td style="padding: 0.75rem; font-weight: 600; color: var(--text-primary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${escapeHtml(p.nome)}
                    </td>
                    <td style="padding: 0.75rem;">${tipoBadge}</td>
                    <td style="padding: 0.75rem; color: var(--text-secondary); font-size: 0.9rem;">R$ ${parseFloat(p.custo_base).toFixed(2)}</td>
                    <td style="padding: 0.75rem; color: var(--accent); font-weight: 700; font-size: 0.9rem;">R$ ${parseFloat(p.custo_real).toFixed(2)}</td>
                    <td style="padding: 0.75rem; text-align: right; font-weight: 600;">${isCaneta ? '<span style="color: #94a3b8; font-size: 0.78rem; font-weight: 600;">Mín. 50</span>' : `R$ ${parseFloat(p.preco_20 || 0).toFixed(2)}`}</td>
                    <td style="padding: 0.75rem; text-align: right; font-weight: 600;">R$ ${parseFloat(p.preco_50).toFixed(2)}</td>
                    <td style="padding: 0.75rem; text-align: right; font-weight: 600;">R$ ${parseFloat(p.preco_100).toFixed(2)}</td>
                    <td style="padding: 0.75rem; text-align: right; font-weight: 600;">R$ ${parseFloat(p.preco_200).toFixed(2)}</td>
                    <td style="padding: 0.75rem; text-align: right; font-weight: 600;">R$ ${parseFloat(p.preco_500).toFixed(2)}</td>
                    <td style="padding: 0.75rem; text-align: right; font-weight: 700; color: var(--accent);">R$ ${parseFloat(p.preco_1000).toFixed(2)}</td>
                    <td style="padding: 0.75rem; text-align: center;">
                        <div style="display: flex; gap: 0.25rem; justify-content: center;">
                            <button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;" onclick="editProductInCalculator(${p.id})" title="Abrir na Calculadora">
                                <i class="ph ph-pencil"></i>
                            </button>
                            <button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;" onclick="copySavedProductWhatsApp(${p.id})" title="Copiar WhatsApp">
                                <i class="ph ph-whatsapp-logo"></i>
                            </button>
                            <button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;" onclick="deleteProductFromCatalog(${p.id})" title="Excluir">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    container.innerHTML = `
        <div class="card" style="padding: 1.5rem; border-radius: var(--radius-lg); background: var(--bg-surface); border: 1px solid var(--border);">
            <!-- Barra de Ferramentas -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap;">
                <div style="display: flex; gap: 0.5rem; align-items: center; flex: 1; max-width: 400px;">
                    <div style="position: relative; width: 100%;">
                        <i class="ph ph-magnifying-glass" style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-tertiary);"></i>
                        <input type="text" 
                            class="form-control" 
                            id="catalogSearchInput" 
                            placeholder="Buscar por código ou nome..." 
                            value="${escapeHtml(pricingState.catalogSearch)}"
                            onkeydown="if(event.key==='Enter') searchCatalogProducts()"
                            style="padding-left: 2.25rem;">
                    </div>
                    <button class="btn" onclick="searchCatalogProducts()">Buscar</button>
                </div>

                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn" style="background: #f8fafc; border: 1px solid #cbd5e1;" onclick="exportCatalogToCSV()">
                        <i class="ph ph-file-csv"></i> Exportar CSV
                    </button>
                    <button class="btn btn-primary" onclick="switchPricingTab('calc'); clearCalculatorForm();">
                        <i class="ph ph-plus"></i> Novo Cálculo
                    </button>
                </div>
            </div>

            <!-- Tabela de Produtos -->
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                            <th style="padding: 0.75rem; color: var(--text-secondary); font-weight: 700;">SKU</th>
                            <th style="padding: 0.75rem; color: var(--text-secondary); font-weight: 700;">Produto</th>
                            <th style="padding: 0.75rem; color: var(--text-secondary); font-weight: 700;">Tipo</th>
                            <th style="padding: 0.75rem; color: var(--text-secondary); font-weight: 700;">Custo Base</th>
                            <th style="padding: 0.75rem; color: var(--accent); font-weight: 700;">Custo Real</th>
                            <th style="padding: 0.75rem; color: var(--text-secondary); font-weight: 700; text-align: right;">20 pç</th>
                            <th style="padding: 0.75rem; color: var(--text-secondary); font-weight: 700; text-align: right;">50 pç</th>
                            <th style="padding: 0.75rem; color: var(--text-secondary); font-weight: 700; text-align: right;">100 pç</th>
                            <th style="padding: 0.75rem; color: var(--text-secondary); font-weight: 700; text-align: right;">200 pç</th>
                            <th style="padding: 0.75rem; color: var(--text-secondary); font-weight: 700; text-align: right;">500 pç</th>
                            <th style="padding: 0.75rem; color: var(--accent); font-weight: 700; text-align: right;">1000 pç</th>
                            <th style="padding: 0.75rem; color: var(--text-secondary); font-weight: 700; text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function searchCatalogProducts() {
    const input = document.getElementById('catalogSearchInput');
    if (input) {
        pricingState.catalogSearch = input.value.trim();
        const container = document.getElementById('pricingTabContent');
        if (container) renderCatalogTab(container);
    }
}

// Abrir produto salvo na calculadora
function editProductInCalculator(id) {
    const p = pricingState.products.find(x => x.id === id);
    if (!p) return;

    pricingState.currentProduct = {
        id: p.id,
        codigo: p.codigo || '',
        nome: p.nome || '',
        tipo_precificacao: p.tipo_precificacao || 'GERAL',
        custo_base: p.custo_base.toString(),
        custom_margins: {
            m20: p.margem_20,
            m50: p.margem_50,
            m100: p.margem_100,
            m200: p.margem_200,
            m500: p.margem_500,
            m1000: p.margem_1000
        },
        lastResult: null
    };

    switchPricingTab('calc');
    executeCalculation();
}

// Copiar WhatsApp de produto salvo no catálogo
function copySavedProductWhatsApp(id) {
    const p = pricingState.products.find(x => x.id === id);
    if (!p) return;

    const nome = p.nome ? p.nome.trim() : (p.tipo_precificacao === 'CANETA' ? 'Caneta Personalizada' : 'Produto Personalizado');
    const codigo = p.codigo ? ` (${p.codigo.trim()})` : '';

    let text = `*${nome}${codigo}*\n`;
    text += `*Tabela de Preços Personalizados:*\n`;
    if (p.tipo_precificacao === 'CANETA') {
        text += `_(Pedido mínimo: 50 peças)_\n`;
        text += `• 50 peças: R$ ${parseFloat(p.preco_50).toFixed(2)} /un (Total: R$ ${(p.preco_50 * 50).toFixed(2)})\n`;
    } else {
        text += `• 20 peças: R$ ${parseFloat(p.preco_20 || 0).toFixed(2)} /un (Total: R$ ${((p.preco_20 || 0) * 20).toFixed(2)})\n`;
        text += `• 50 peças: R$ ${parseFloat(p.preco_50).toFixed(2)} /un (Total: R$ ${(p.preco_50 * 50).toFixed(2)})\n`;
    }
    text += `• 100 peças: R$ ${parseFloat(p.preco_100).toFixed(2)} /un (Total: R$ ${(p.preco_100 * 100).toFixed(2)})\n`;
    text += `• 200 peças: R$ ${parseFloat(p.preco_200).toFixed(2)} /un (Total: R$ ${(p.preco_200 * 200).toFixed(2)})\n`;
    text += `• 500 peças: R$ ${parseFloat(p.preco_500).toFixed(2)} /un (Total: R$ ${(p.preco_500 * 500).toFixed(2)})\n`;
    text += `• 1.000 peças: R$ ${parseFloat(p.preco_1000).toFixed(2)} /un (Total: R$ ${(p.preco_1000 * 1000).toFixed(2)})\n`;
    text += `\n_Acima de 1.000 peças: Sob Orçamento Exclusivo_`;

    navigator.clipboard.writeText(text).then(() => {
        alert('Tabela copiada para a Área de Transferência!');
    });
}

// Excluir produto do catálogo
async function deleteProductFromCatalog(id) {
    if (!confirm('Deseja realmente remover este produto do catálogo de preços?')) return;

    try {
        const res = await fetch(`/api/pricing/products/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir produto.');
        const container = document.getElementById('pricingTabContent');
        if (container) renderCatalogTab(container);
    } catch (err) {
        alert(err.message);
    }
}

// Exportar CSV
function exportCatalogToCSV() {
    const prods = pricingState.products;
    if (prods.length === 0) {
        alert('Nenhum produto para exportar.');
        return;
    }

    let csv = 'SKU;Produto;Tipo;Custo Base;Custo Real;Preco 20;Preco 50;Preco 100;Preco 200;Preco 500;Preco 1000;Slot Precos\n';
    prods.forEach(p => {
        csv += `"${p.codigo || ''}";"${p.nome.replace(/"/g, '""')}";"${p.tipo_precificacao || 'GERAL'}";"${p.custo_base}";"${p.custo_real}";"${p.preco_20}";"${p.preco_50}";"${p.preco_100}";"${p.preco_200}";"${p.preco_500}";"${p.preco_1000}";"${p.slot_precos || ''}"\n`;
    });

    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tabela_precos_persys_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// =========================================================================
// ABA 3: CONFIGURAÇÕES DA EMPRESA & FAIXAS (GERAL E CANETAS)
// =========================================================================
function renderSettingsTab(container) {
    const cfg = pricingState.config || {};
    const faixasGeral = pricingState.faixas_geral || [];
    const faixasCaneta = pricingState.faixas_caneta || [];

    const cfVal = parseFloat(cfg.cf_percentual || 25.2601).toFixed(4);
    const cvVal = parseFloat(cfg.cv_percentual || 21.0000).toFixed(4);
    const cvFixo = parseFloat(cfg.cv_fixo_reais || 0.00).toFixed(2);
    const fatVal = parseFloat(cfg.faturamento_mensal || 600000.00).toFixed(2);
    const cfTot = parseFloat(cfg.custos_fixos_total || 151560.86).toFixed(2);

    const renderFaixasTableRows = (lista, isCaneta = false) => lista.map((f, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 0.6rem 0.75rem; font-weight: 700;">
                <span style="display: inline-flex; align-items: center; gap: 0.4rem;">
                    <span style="width: 12px; height: 12px; border-radius: 50%; background: ${f.cor_hex}; display: inline-block;"></span>
                    <span>${f.ordem}. ${escapeHtml(f.cor_nome)}</span>
                </span>
            </td>
            <td style="padding: 0.6rem 0.75rem; white-space: nowrap;">
                R$ <input type="number" step="0.01" min="0" class="form-control" id="f_min_${f.id}" value="${f.custo_min.toFixed(2)}" style="width: 75px; display: inline-block; padding: 0.2rem 0.4rem; font-size: 0.85rem;">
                até
                R$ <input type="number" step="0.01" min="0" class="form-control" id="f_max_${f.id}" value="${f.custo_max.toFixed(2)}" style="width: 75px; display: inline-block; padding: 0.2rem 0.4rem; font-size: 0.85rem;">
            </td>
            <td style="padding: 0.6rem 0.75rem; text-align: center;">
                ${isCaneta ? '<span style="color: #94a3b8; font-size: 0.8rem; font-weight: 700;">Mín. 50</span>' : `<input type="number" step="1" min="0" max="2000" class="form-control" id="f_m20_${f.id}" value="${f.m20}" style="width: 65px; display: inline-block; text-align: right; padding: 0.2rem 0.4rem; font-weight: 700; font-size: 0.85rem;">%`}
            </td>
            <td style="padding: 0.6rem 0.75rem; text-align: center;">
                <input type="number" step="1" min="0" max="2000" class="form-control" id="f_m50_${f.id}" value="${f.m50}" style="width: 65px; display: inline-block; text-align: right; padding: 0.2rem 0.4rem; font-weight: 700; font-size: 0.85rem;">%
            </td>
            <td style="padding: 0.6rem 0.75rem; text-align: center;">
                <input type="number" step="1" min="0" max="2000" class="form-control" id="f_m100_${f.id}" value="${f.m100}" style="width: 65px; display: inline-block; text-align: right; padding: 0.2rem 0.4rem; font-weight: 700; font-size: 0.85rem;">%
            </td>
            <td style="padding: 0.6rem 0.75rem; text-align: center;">
                <input type="number" step="1" min="0" max="2000" class="form-control" id="f_m200_${f.id}" value="${f.m200}" style="width: 65px; display: inline-block; text-align: right; padding: 0.2rem 0.4rem; font-weight: 700; font-size: 0.85rem;">%
            </td>
            <td style="padding: 0.6rem 0.75rem; text-align: center;">
                <input type="number" step="1" min="0" max="2000" class="form-control" id="f_m500_${f.id}" value="${f.m500}" style="width: 65px; display: inline-block; text-align: right; padding: 0.2rem 0.4rem; font-weight: 700; font-size: 0.85rem;">%
            </td>
            <td style="padding: 0.6rem 0.75rem; text-align: center;">
                <input type="number" step="1" min="0" max="2000" class="form-control" id="f_m1000_${f.id}" value="${f.m1000}" style="width: 65px; display: inline-block; text-align: right; padding: 0.2rem 0.4rem; font-weight: 700; font-size: 0.85rem;">%
            </td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            <!-- Painel 1: Custos Corporativos da Empresa -->
            <div class="card" style="padding: 1.5rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">
                            <i class="ph ph-buildings" style="color: var(--accent);"></i> Custos Operacionais da Empresa
                        </h3>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                            Valores base utilizados na fórmula de Custo Real: Custo Base + Custo Base × (CF% + CV%) + CV Fixo R$
                        </p>
                    </div>
                    <button class="btn btn-primary" onclick="saveCompanyCosts()">
                        <i class="ph ph-floppy-disk"></i> Salvar Custos
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div>
                        <label style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); display: block; margin-bottom: 0.35rem;">
                            Custo Fixo - CF (%) *
                        </label>
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <input type="number" step="0.0001" min="0" max="100" id="cfg_cf" class="form-control" value="${cfVal}" style="font-weight: 700;">
                            <span style="font-weight: 700; color: var(--text-secondary);">%</span>
                        </div>
                        <span style="font-size: 0.75rem; color: var(--text-tertiary);">Aluguel, folha, luz, etc. (Padrão: 25.26%)</span>
                    </div>

                    <div>
                        <label style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); display: block; margin-bottom: 0.35rem;">
                            Custo Variável - CV (%) *
                        </label>
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <input type="number" step="0.0001" min="0" max="100" id="cfg_cv" class="form-control" value="${cvVal}" style="font-weight: 700;">
                            <span style="font-weight: 700; color: var(--text-secondary);">%</span>
                        </div>
                        <span style="font-size: 0.75rem; color: var(--text-tertiary);">Impostos (15%) + Taxas Cartão (6%) = 21%</span>
                    </div>

                    <div>
                        <label style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); display: block; margin-bottom: 0.35rem;">
                            Custo Variável Fixo (R$)
                        </label>
                        <div style="display: flex; align-items: center; gap: 0.35rem;">
                            <span style="font-weight: 700; color: var(--text-secondary);">R$</span>
                            <input type="number" step="0.01" min="0" id="cfg_cv_fixo" class="form-control" value="${cvFixo}">
                        </div>
                        <span style="font-size: 0.75rem; color: var(--text-tertiary);">Taxa fixa por peça se aplicável (Padrão: 0,00)</span>
                    </div>

                    <div>
                        <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 0.35rem;">
                            Faturamento Médio Mensal (R$)
                        </label>
                        <input type="number" step="1000" id="cfg_fat" class="form-control" value="${fatVal}">
                        <span style="font-size: 0.75rem; color: var(--text-tertiary);">Informativo (Ex: R$ 600.000,00)</span>
                    </div>

                    <div>
                        <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); display: block; margin-bottom: 0.35rem;">
                            Despesas Fixas Totais (R$)
                        </label>
                        <input type="number" step="100" id="cfg_cf_tot" class="form-control" value="${cfTot}">
                        <span style="font-size: 0.75rem; color: var(--text-tertiary);">Informativo (Ex: R$ 151.560,86)</span>
                    </div>
                </div>
            </div>

            <!-- Painel: Segurança & Senha de Acesso ao Módulo -->
            <div class="card" style="padding: 1.5rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">
                            <i class="ph ph-shield-check" style="color: var(--accent);"></i> Segurança & Senha de Acesso ao Módulo
                        </h3>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                            Defina a senha necessária para desbloquear e visualizar a aba de precificação. (Senha padrão inicial: <strong>102030</strong>)
                        </p>
                    </div>
                    <button class="btn btn-primary" onclick="changePricingPassword()">
                        <i class="ph ph-key"></i> Salvar Nova Senha
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                    <div>
                        <label style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); display: block; margin-bottom: 0.35rem;">
                            Senha Atual *
                        </label>
                        <input type="password" id="cfg_pwd_current" class="form-control" placeholder="Digite a senha atual...">
                    </div>
                    <div>
                        <label style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); display: block; margin-bottom: 0.35rem;">
                            Nova Senha *
                        </label>
                        <input type="password" id="cfg_pwd_new" class="form-control" placeholder="Mínimo 4 caracteres...">
                    </div>
                    <div>
                        <label style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); display: block; margin-bottom: 0.35rem;">
                            Confirmar Nova Senha *
                        </label>
                        <input type="password" id="cfg_pwd_confirm" class="form-control" placeholder="Repita a nova senha...">
                    </div>
                </div>
            </div>

            <!-- Painel 2: Tabela de Faixas Exclusivas para CANETAS -->
            <div class="card" style="padding: 1.5rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 2px solid #e9d5ff;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--accent);">
                            <i class="ph ph-pen"></i> Tabela Especial para Canetas (4 Faixas)
                        </h3>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                            Regras aplicadas quando a modalidade <strong>Canetas</strong> estiver ativa na calculadora.
                        </p>
                    </div>

                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn" style="background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; font-size: 0.85rem;" onclick="restoreFactoryFaixas('CANETA')">
                            <i class="ph ph-clock-counter-clockwise"></i> Restaurar Canetas
                        </button>
                        <button class="btn btn-primary" style="font-size: 0.85rem;" onclick="saveFaixasMargins('CANETA')">
                            <i class="ph ph-check-circle"></i> Salvar Margens Canetas
                        </button>
                    </div>
                </div>

                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
                        <thead>
                            <tr style="background: #f3e8ff; border-bottom: 2px solid #d8b4fe; text-align: left;">
                                <th style="padding: 0.75rem; font-weight: 700; color: var(--accent);">Faixa & Cor</th>
                                <th style="padding: 0.75rem; font-weight: 700; color: var(--accent);">Custo Base (R$)</th>
                                <th style="padding: 0.75rem; font-weight: 700; text-align: center; color: var(--accent);">20 pç (Mín. 50)</th>
                                <th style="padding: 0.75rem; font-weight: 700; text-align: center; color: var(--accent);">50 pç</th>
                                <th style="padding: 0.75rem; font-weight: 700; text-align: center; color: var(--accent);">100 pç</th>
                                <th style="padding: 0.75rem; font-weight: 700; text-align: center; color: var(--accent);">200 pç</th>
                                <th style="padding: 0.75rem; font-weight: 700; text-align: center; color: var(--accent);">500 pç</th>
                                <th style="padding: 0.75rem; font-weight: 700; text-align: center; color: var(--accent);">1000 pç</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderFaixasTableRows(faixasCaneta, true)}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Painel 3: Matriz das 12 Faixas Padrão para PRODUTOS EM GERAL -->
            <div class="card" style="padding: 1.5rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">
                            <i class="ph ph-table" style="color: var(--accent);"></i> Tabela Padrão: Produtos em Geral (12 Faixas)
                        </h3>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                            Altere qualquer percentual diretamente nas caixas abaixo para atualizar a regra padrão da empresa.
                        </p>
                    </div>

                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn" style="background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; font-size: 0.85rem;" onclick="restoreFactoryFaixas('GERAL')">
                            <i class="ph ph-clock-counter-clockwise"></i> Restaurar Geral
                        </button>
                        <button class="btn btn-primary" style="font-size: 0.85rem;" onclick="saveFaixasMargins('GERAL')">
                            <i class="ph ph-check-circle"></i> Salvar Margens Geral
                        </button>
                    </div>
                </div>

                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
                        <thead>
                            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
                                <th style="padding: 0.75rem; font-weight: 700;">Faixa & Cor</th>
                                <th style="padding: 0.75rem; font-weight: 700;">Custo Base (R$)</th>
                                <th style="padding: 0.75rem; font-weight: 700; text-align: center;">20 pç</th>
                                <th style="padding: 0.75rem; font-weight: 700; text-align: center;">50 pç</th>
                                <th style="padding: 0.75rem; font-weight: 700; text-align: center;">100 pç</th>
                                <th style="padding: 0.75rem; font-weight: 700; text-align: center;">200 pç</th>
                                <th style="padding: 0.75rem; font-weight: 700; text-align: center;">500 pç</th>
                                <th style="padding: 0.75rem; font-weight: 700; text-align: center;">1000 pç</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderFaixasTableRows(faixasGeral)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Salvar Custos da Empresa
async function saveCompanyCosts() {
    const cf = parseFloat(document.getElementById('cfg_cf').value);
    const cv = parseFloat(document.getElementById('cfg_cv').value);
    const cvFixo = parseFloat(document.getElementById('cfg_cv_fixo').value);
    const fat = parseFloat(document.getElementById('cfg_fat').value);
    const cfTot = parseFloat(document.getElementById('cfg_cf_tot').value);

    if (isNaN(cf) || isNaN(cv)) {
        alert('Preencha os percentuais de Custo Fixo e Custo Variável corretamente.');
        return;
    }

    try {
        const res = await fetch('/api/pricing/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cf_percentual: cf,
                cv_percentual: cv,
                cv_fixo_reais: cvFixo,
                faturamento_mensal: fat,
                custos_fixos_total: cfTot
            })
        });

        if (!res.ok) throw new Error('Falha ao salvar configurações.');
        await fetchPricingConfig();
        alert('Custos operacionais da empresa atualizados com sucesso!');
    } catch (err) {
        alert('Erro ao salvar custos: ' + err.message);
    }
}

// Salvar Margens das Faixas por Categoria ('GERAL' ou 'CANETA')
async function saveFaixasMargins(categoria) {
    const lista = categoria === 'CANETA' ? pricingState.faixas_caneta : pricingState.faixas_geral;
    const faixasAtualizadas = [];

    for (let f of lista) {
        const minEl = document.getElementById(`f_min_${f.id}`);
        const maxEl = document.getElementById(`f_max_${f.id}`);
        const m20El = document.getElementById(`f_m20_${f.id}`);
        const m50El = document.getElementById(`f_m50_${f.id}`);
        const m100El = document.getElementById(`f_m100_${f.id}`);
        const m200El = document.getElementById(`f_m200_${f.id}`);
        const m500El = document.getElementById(`f_m500_${f.id}`);
        const m1000El = document.getElementById(`f_m1000_${f.id}`);

        if (!minEl || !maxEl || !m50El || !m100El || !m200El || !m500El || !m1000El) continue;

        const m20Val = m20El ? (parseFloat(m20El.value) || 0) : (f.m20 || 0);

        faixasAtualizadas.push({
            id: f.id,
            custo_min: parseFloat(minEl.value) || f.custo_min,
            custo_max: parseFloat(maxEl.value) || f.custo_max,
            m20: m20Val,
            m50: parseFloat(m50El.value) || 0,
            m100: parseFloat(m100El.value) || 0,
            m200: parseFloat(m200El.value) || 0,
            m500: parseFloat(m500El.value) || 0,
            m1000: parseFloat(m1000El.value) || 0
        });
    }

    try {
        const res = await fetch('/api/pricing/faixas', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ faixas: faixasAtualizadas })
        });

        if (!res.ok) throw new Error('Falha ao salvar margens das faixas.');
        await fetchPricingConfig();
        alert(`Margens das faixas de ${categoria === 'CANETA' ? 'Canetas' : 'Produtos em Geral'} atualizadas com sucesso!`);
        renderActiveTabContent();
    } catch (err) {
        alert('Erro ao salvar faixas: ' + err.message);
    }
}

// Restaurar padrões de fábrica das faixas
async function restoreFactoryFaixas(categoria) {
    const nomeCateg = categoria === 'CANETA' ? 'Canetas' : 'Produtos em Geral';
    if (!confirm(`Deseja realmente restaurar as faixas de ${nomeCateg} para as porcentagens de fábrica?`)) {
        return;
    }

    try {
        const res = await fetch('/api/pricing/faixas/restaurar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoria })
        });
        if (!res.ok) throw new Error('Falha ao restaurar faixas.');
        await fetchPricingConfig();
        alert(`Faixas de ${nomeCateg} restauradas com sucesso!`);
        renderActiveTabContent();
    } catch (err) {
        alert('Erro ao restaurar faixas: ' + err.message);
    }
}

// Alterar senha de acesso ao módulo
async function changePricingPassword() {
    const currentPass = document.getElementById('cfg_pwd_current')?.value || '';
    const newPass = document.getElementById('cfg_pwd_new')?.value || '';
    const confirmPass = document.getElementById('cfg_pwd_confirm')?.value || '';

    if (!currentPass) {
        alert('Por favor, informe a senha atual.');
        document.getElementById('cfg_pwd_current')?.focus();
        return;
    }

    if (!newPass || newPass.trim().length < 4) {
        alert('A nova senha deve ter pelo menos 4 caracteres.');
        document.getElementById('cfg_pwd_new')?.focus();
        return;
    }

    if (newPass !== confirmPass) {
        alert('A nova senha e a confirmação não coincidem.');
        document.getElementById('cfg_pwd_confirm')?.focus();
        return;
    }

    try {
        const res = await fetch('/api/pricing/change-password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                current_password: currentPass,
                new_password: newPass
            })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            alert('Senha de acesso alterada com sucesso! Guarde a nova senha com segurança.');
            if (document.getElementById('cfg_pwd_current')) document.getElementById('cfg_pwd_current').value = '';
            if (document.getElementById('cfg_pwd_new')) document.getElementById('cfg_pwd_new').value = '';
            if (document.getElementById('cfg_pwd_confirm')) document.getElementById('cfg_pwd_confirm').value = '';
        } else {
            alert('Erro: ' + (data.error || 'Não foi possível alterar a senha.'));
        }
    } catch (err) {
        alert('Erro de conexão ao alterar a senha: ' + err.message);
    }
}

