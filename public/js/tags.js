// Gerenciamento de Tags (Configuração)

// Cores pré-definidas para as tags (Paleta moderna de alta legibilidade)
const PREDEFINED_COLORS = [
    { name: 'Ouro / Amarelo', value: '#f59e0b' },
    { name: 'Verde Esmeralda', value: '#10b981' },
    { name: 'Azul Royal', value: '#3b82f6' },
    { name: 'Vermelho Coral', value: '#ef4444' },
    { name: 'Roxo / Índigo', value: '#8b5cf6' },
    { name: 'Rosa Choque', value: '#ec4899' },
    { name: 'Laranja', value: '#f97316' },
    { name: 'Ciano', value: '#06b6d4' },
    { name: 'Cinza Escuro', value: '#475569' }
];

async function loadTagsView() {
    document.getElementById('pageTitle').textContent = 'Gerenciar Tags';
    document.getElementById('contentArea').innerHTML = `
        <div style="margin-bottom: 1rem; text-align: right;">
            <button class="btn" onclick="openTagModal()">+ Nova Tag</button>
        </div>
        <div class="card">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8fafc; text-align: left;">
                        <th style="padding: 0.75rem;">Nome</th>
                        <th style="padding: 0.75rem;">Visualização</th>
                        <th style="padding: 0.75rem;">Código da Cor</th>
                        <th style="padding: 0.75rem; text-align: right;">Ações</th>
                    </tr>
                </thead>
                <tbody id="tagListBody"><tr><td colspan="4">Carregando...</td></tr></tbody>
            </table>
        </div>
    `;

    try {
        const res = await fetch('/api/tags?t=' + Date.now());
        const tags = await res.json();
        renderTags(tags);
    } catch (e) {
        console.error(e);
        document.getElementById('tagListBody').innerHTML = '<tr><td colspan="4" style="color:red; text-align:center">Erro ao carregar tags</td></tr>';
    }
}

function renderTags(list) {
    const tbody = document.getElementById('tagListBody');
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:#64748b">Nenhuma tag cadastrada.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(t => {
        // Obter cor contrastante para o texto (preto ou branco) dependendo do brilho do fundo
        const textColor = getContrastColor(t.cor);
        
        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 0.75rem; font-weight: 600; color: #1e293b;">${t.nome}</td>
                <td style="padding: 0.75rem;">
                    <span style="display: inline-block; padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold; background: ${t.cor}; color: ${textColor}; text-transform: uppercase;">
                        ${t.nome}
                    </span>
                </td>
                <td style="padding: 0.75rem; font-family: monospace; color: #64748b;">${t.cor}</td>
                <td style="padding: 0.75rem; text-align: right;">
                    <button class="btn" style="padding: 0.25rem 0.5rem; width: auto; font-size: 0.8rem; margin-right: 0.5rem;" 
                        onclick='openTagModal(${JSON.stringify(t)})'>Editar</button>
                    <button class="btn" style="padding: 0.25rem 0.5rem; width: auto; font-size: 0.8rem; background: #dc2626;" 
                        onclick='deleteTag(${t.id})'>Excluir</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteTag(id) {
    if (!confirm('Tem certeza que deseja excluir esta tag? Ela será removida de todos os pedidos associados.')) return;
    try {
        const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadTagsView();
        } else {
            const err = await res.json();
            alert(err.error || 'Erro ao excluir tag');
        }
    } catch (e) {
        console.error(e);
        alert('Erro de conexão com o servidor');
    }
}

function openTagModal(tagObj = null) {
    const isEdit = !!tagObj;
    
    // Remover modal anterior se existir
    const oldModal = document.getElementById('tagModal');
    if (oldModal) oldModal.remove();

    // Criar container do Modal
    const modal = document.createElement('div');
    modal.id = 'tagModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';

    // Cor selecionada inicial
    let selectedColor = isEdit ? tagObj.cor : PREDEFINED_COLORS[0].value;

    modal.innerHTML = `
        <div class="card" style="width: 420px; max-width: 90%; background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; margin-bottom: 1.25rem; font-size: 1.2rem; font-weight: 700; color: #0f172a;">
                ${isEdit ? 'Editar Tag' : 'Nova Tag'}
            </h3>
            
            <div style="margin-bottom: 1rem;">
                <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; color: #475569;">Nome da Tag</label>
                <input type="text" id="tagNameInput" class="input" style="width: 100%; border-radius: 6px;" 
                    placeholder="Ex: MERCADO LIVRE" value="${isEdit ? tagObj.nome : ''}" />
            </div>

            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; color: #475569;">Escolha uma Cor</label>
                
                <!-- Grid de cores pré-definidas -->
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 1rem;" id="colorsGrid">
                    ${PREDEFINED_COLORS.map(c => `
                        <div class="color-swatch" data-value="${c.value}" 
                             style="height: 38px; border-radius: 8px; cursor: pointer; background: ${c.value}; border: ${selectedColor.toLowerCase() === c.value.toLowerCase() ? '3px solid #000' : '2px solid transparent'}; transition: all 0.2s;"
                             title="${c.name}">
                        </div>
                    `).join('')}
                </div>
                
                <!-- Preview Visual da Tag -->
                <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 0.75rem; text-align: center;">
                    <span style="font-size: 0.8rem; color: #64748b; display: block; margin-bottom: 0.4rem;">Visualização no Kanban/Lista:</span>
                    <span id="tagPreviewBadge" style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase;">
                        NOME DA TAG
                    </span>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                <button class="btn" style="background: #e2e8f0; color: #475569;" onclick="document.getElementById('tagModal').remove()">Cancelar</button>
                <button class="btn" id="saveTagBtn">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Seletores DOM
    const nameInput = document.getElementById('tagNameInput');
    const previewBadge = document.getElementById('tagPreviewBadge');
    const swatches = modal.querySelectorAll('.color-swatch');

    // Atualiza preview inicial
    const updatePreview = () => {
        const text = nameInput.value.trim().toUpperCase() || 'PREVIEW';
        previewBadge.textContent = text;
        previewBadge.style.background = selectedColor;
        previewBadge.style.color = getContrastColor(selectedColor);
    };
    updatePreview();

    // Eventos
    nameInput.addEventListener('input', updatePreview);
    
    swatches.forEach(s => {
        s.addEventListener('click', () => {
            selectedColor = s.getAttribute('data-value');
            
            // Atualizar bordas nos swatches
            swatches.forEach(sw => {
                const isSelected = sw.getAttribute('data-value') === selectedColor;
                sw.style.border = isSelected ? '3px solid #000' : '2px solid transparent';
            });
            
            updatePreview();
        });
    });

    // Submissão do Formulário
    document.getElementById('saveTagBtn').onclick = async () => {
        const nome = nameInput.value.trim().toUpperCase();
        if (!nome) {
            alert('Por favor, informe o nome da tag');
            return;
        }

        const payload = { nome, cor: selectedColor };
        const url = isEdit ? `/api/tags/${tagObj.id}` : '/api/tags';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                modal.remove();
                loadTagsView();
            } else {
                const data = await response.json();
                alert(data.error || 'Erro ao salvar a tag');
            }
        } catch (e) {
            console.error(e);
            alert('Erro na conexão com o servidor');
        }
    };
}

// Helper para calcular cor de texto com bom contraste (Preto ou Branco) dependendo do brilho da cor de fundo hex
function getContrastColor(hexColor) {
    // Se cor não começar com # ou for inválida, assume branco
    if (!hexColor || hexColor.charAt(0) !== '#') return '#ffffff';
    
    const hex = hexColor.substring(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Luminosidade YIQ
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
}

async function populateTagSelectors(containerId, selectedIds = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    try {
        const res = await fetch('/api/tags');
        const tags = await res.json();
        if (tags.length === 0) {
            container.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">Nenhuma tag cadastrada. Vá em Configuração > Tags.</span>';
            return;
        }

        // Converter todos os IDs selecionados para Number para comparação confiável
        const selectedIdsNums = selectedIds.map(id => Number(id));

        container.innerHTML = tags.map(tag => {
            const isChecked = selectedIdsNums.includes(Number(tag.id));
            const textColor = getContrastColor(tag.cor);
            return `
                <label class="tag-selector-pill" data-id="${tag.id}" style="
                    display: inline-flex; align-items: center; gap: 0.35rem; 
                    padding: 0.35rem 0.75rem; border-radius: 9999px; 
                    font-size: 0.75rem; font-weight: bold; cursor: pointer; 
                    user-select: none; border: 2px solid ${tag.cor};
                    background: ${isChecked ? tag.cor : 'transparent'}; 
                    color: ${isChecked ? textColor : (tag.cor === '#ffffff' ? '#000000' : tag.cor)};
                    transition: all 0.2s;
                ">
                    <input type="checkbox" value="${tag.id}" ${isChecked ? 'checked' : ''} style="display: none;">
                    ${tag.nome}
                </label>
            `;
        }).join('');

        // Adicionar eventos para os pills
        const labels = container.querySelectorAll('.tag-selector-pill');
        labels.forEach(label => {
            const checkbox = label.querySelector('input[type="checkbox"]');
            label.addEventListener('click', (e) => {
                e.preventDefault(); // Evitar duplo disparo com o clique padrão da label
                
                const isCurrentlyChecked = checkbox.checked;
                const checked = container.querySelectorAll('input[type="checkbox"]:checked');

                if (!isCurrentlyChecked && checked.length >= 3) {
                    alert('Você pode selecionar no máximo 3 tags por pedido.');
                    return;
                }

                checkbox.checked = !isCurrentlyChecked;
                const newChecked = checkbox.checked;
                
                const tagColor = label.getAttribute('style').match(/border:\s*2px\s*solid\s*(#[0-9a-fA-F]+)/)[1] || '#000';
                const textColor = getContrastColor(tagColor);

                if (newChecked) {
                    label.style.background = tagColor;
                    label.style.color = textColor;
                } else {
                    label.style.background = 'transparent';
                    label.style.color = tagColor === '#ffffff' ? '#000000' : tagColor;
                }
            });
        });

    } catch (e) {
        console.error("Erro ao carregar tags:", e);
        container.innerHTML = '<span style="color: red; font-size: 0.85rem;">Erro ao carregar tags.</span>';
    }
}

function renderTagBadges(tags) {
    if (!tags || tags.length === 0) return '';
    return `
        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem; margin-bottom: 0.35rem;">
            ${tags.map(t => {
                const textColor = getContrastColor(t.cor);
                return `
                    <span class="tag-badge" style="
                        display: inline-block; padding: 0.2rem 0.5rem; 
                        border-radius: 9999px; font-size: 0.65rem; 
                        font-weight: bold; background: ${t.cor}; 
                        color: ${textColor}; text-transform: uppercase;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                        letter-spacing: 0.025em;
                    ">${t.nome}</span>
                `;
            }).join('')}
        </div>
    `;
}
