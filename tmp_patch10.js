const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

const jsFunctions = `
async function solicitarPausa(itemId) {
    const motivo = prompt('Por qual motivo você precisa PAUSAR a produção deste item?');
    if (!motivo) return; // cancelled

    try {
        const res = await fetch(\`/api/production/item/\${itemId}/pause-request\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo: motivo })
        });
        if (res.ok) {
            alert('Pausa solicitada! Aguardando o Administrador.');
            // Reload context
            const activeLink = document.querySelector('.sidebar-menu a.active');
            if (activeLink) activeLink.click();
        } else {
            const err = await res.json();
            alert('Erro: ' + err.error);
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao comunicar com o servidor.');
    }
}

async function resumeProducao(itemId) {
    if(!confirm('Deseja retirar a PAUSA e retomar a produção do item agora? O cronômetro voltará a correr.')) return;

    try {
        const res = await fetch(\`/api/production/item/\${itemId}/resume\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operador_id: currentUser ? currentUser.id : null, operador_nome: currentUser ? currentUser.nome : 'Desconhecido' })
        });
        if (res.ok) {
            // Reload context
            const activeLink = document.querySelector('.sidebar-menu a.active');
            if (activeLink) activeLink.click();
        } else {
            const err = await res.json();
            alert('Erro: ' + err.error);
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao comunicar com o servidor.');
    }
}

// ---------------- ADMIN PANEL PENDING PAUSES ---------------- //
function renderDashboardPausasAdmin() {
    // Only Admin can see this usually
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    document.getElementById('contentArea').innerHTML = '<p>Carregando solicitações de pausa...</p>';

    fetch('/api/production/itens/pausas')
        .then(res => res.json())
        .then(itens => {
            let html = \`<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
                <div>
                    <h2 style="font-size: 1.5rem; color: var(--text-primary);">Aprovação de Pausas ⏸️</h2>
                    <p style="color: var(--text-secondary); margin-top: 0.25rem;">Gerencie as pausas solicitadas nas máquinas de produção.</p>
                </div>
            </div>\`;

            if (itens.length === 0) {
                html += \`<div class="card" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                    <div style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"><i class="ph-check-circle"></i></div>
                    <h3>Tudo limpo!</h3>
                    <p>Não há pedidos aguardando autorização de pausa.</p>
                </div>\`;
            } else {
                html += \`<div class="card"><table><thead><tr><th>Pedido</th><th>Item</th><th>Setor de Pausa</th><th>Motivo</th><th>Ação</th></tr></thead><tbody>\`;
                
                itens.forEach(item => {
                    const statusName = item.status_atual === 'EM_PRODUCAO' ? item.setor_destino : item.status_atual;
                    html += \`<tr>
                        <td data-label="Pedido"><strong>\${item.numero_pedido}</strong><br><small>\${item.cliente}</small></td>
                        <td data-label="Item">\${item.quantidade}x \${item.produto}</td>
                        <td data-label="Setor"><span class="badge badge-warning">\${statusName}</span></td>
                        <td data-label="Motivo"><span style="color: #b45309; background: #fef3c7; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;"><i class="ph-warning"></i> \${item.motivo_pausa_producao || 'N/A'}</span></td>
                        <td data-label="Ação">
                            <button class="btn" style="background: var(--success); width:auto; padding: 0.3rem 0.5rem;" onclick="aprovarPausa(\${item.id})">Aprovar Pausa</button>
                            <button class="btn" style="background: transparent; color: #ef4444; border: 1px solid #ef4444; width:auto; padding: 0.3rem 0.5rem; margin-top: 0.3rem;" onclick="negarPausa(\${item.id})">Negar</button>
                        </td>
                    </tr>\`;
                });
                
                html += \`</tbody></table></div>\`;
            }

            document.getElementById('contentArea').innerHTML = html;
        })
        .catch(err => {
            console.error(err);
            document.getElementById('contentArea').innerHTML = '<p style="color:red">Erro ao buscar pausas solicitadas.</p>';
        });
}

async function aprovarPausa(itemId) {
    if(!confirm('Aprovar congelamento do tempo de produção desta peça?')) return;
    try {
        const res = await fetch(\`/api/production/item/\${itemId}/pause-approve\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operador_id: currentUser ? currentUser.id : null, operador_nome: currentUser ? currentUser.nome : 'ADM' })
        });
        if (res.ok) {
            renderDashboardPausasAdmin();
        } else {
            const err = await res.json();
            alert('Erro: ' + err.error);
        }
    } catch (e) {
        alert('Erro de conexão');
    }
}

async function negarPausa(itemId) {
    if(!confirm('Negar esta pausa e obrigar o relógio a continuar rodando?')) return;
    try {
        // Just clear the flag
        const res = await fetch(\`/api/production/item/\${itemId}/pause-deny\`, { method: 'PUT' });
        if (res.ok) {
            renderDashboardPausasAdmin();
        } else {
            const err = await res.json();
            alert('Erro: ' + err.error);
        }
    } catch(e) { alert('Erro de conexao'); }
}

`;

if (!code.includes('function solicitarPausa')) {
    code += '\n' + jsFunctions;
    fs.writeFileSync('public/js/app.js', code);
    console.log('App logic added');
} else {
    console.log('Already added');
}
