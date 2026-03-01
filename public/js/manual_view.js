// manual_view.js - Lógica para o Manual do Sistema

async function loadManuals() {
    document.getElementById('pageTitle').textContent = 'Manual do Sistema';
    document.getElementById('headerActions').innerHTML = '';
    document.getElementById('contentArea').innerHTML = '<p>Carregando manuais...</p>';

    try {
        const res = await fetch('/api/manuals');
        const data = await res.json();

        if (data.error) {
            document.getElementById('contentArea').innerHTML = `<p style="color:var(--danger)">Erro: ${data.error}</p>`;
            return;
        }

        renderManualsView(data.manuais || []);

    } catch (e) {
        console.error(e);
        document.getElementById('contentArea').innerHTML = '<p style="color:var(--danger)">Erro de conexão ao carregar os manuais.</p>';
    }
}

function renderManualsView(manuais) {
    const isAdmin = currentUser && currentUser.perfil === 'admin';

    // Group manuals by category
    const grouped = manuais.reduce((acc, manual) => {
        if (!acc[manual.categoria]) acc[manual.categoria] = [];
        acc[manual.categoria].push(manual);
        return acc;
    }, {});

    let uploadFormHtml = '';
    if (isAdmin) {
        uploadFormHtml = `
            <div class="card" style="margin-bottom: 2rem; border-left: 4px solid var(--accent); background: #f8fafc;">
                <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.1rem;"><i class="ph-upload-simple"></i> Enviar Novo Manual</h3>
                <form id="uploadManualForm" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end;">
                    <div class="form-group" style="flex: 1; min-width: 200px; margin-bottom: 0;">
                        <label>Título do Manual</label>
                        <input type="text" id="manualTitulo" class="form-control" required placeholder="Ex: Processo de Silk Plano">
                    </div>
                    <div class="form-group" style="flex: 1; min-width: 200px; margin-bottom: 0;">
                        <label>Categoria / Setor</label>
                        <select id="manualCategoria" class="form-control" required>
                            <option value="">-- Selecione a Categoria --</option>
                            <option value="Geral">Manual Geral (Sistema)</option>
                            <option value="Arte Final">Arte Final</option>
                            <option value="Separação">Separação</option>
                            <option value="Desembale">Desembale</option>
                            <option value="Silk Cilíndrica">Impressão: Silk Cilíndrica</option>
                            <option value="Silk Plano">Impressão: Silk Plano</option>
                            <option value="Tampografia">Impressão: Tampografia</option>
                            <option value="Impressão Laser">Impressão: Laser</option>
                            <option value="Impressão Digital">Impressão: Digital</option>
                            <option value="Estamparia">Impressão: Estamparia</option>
                            <option value="Embale">Embale</option>
                            <option value="Logística">Logística</option>
                        </select>
                    </div>
                    <div class="form-group" style="flex: 1; min-width: 250px; margin-bottom: 0;">
                        <label>Arquivo PDF</label>
                        <input type="file" id="manualArquivo" class="form-control" accept="application/pdf" required style="padding: 0.4rem;">
                    </div>
                    <div style="margin-bottom: 0;">
                        <button type="submit" class="btn" style="height: 42px;">Fazer Upload</button>
                    </div>
                </form>
                <div id="uploadStatusMsg" style="margin-top: 1rem; font-size: 0.9rem; font-weight: bold;"></div>
            </div>
        `;
    }

    let listHtml = '';
    if (Object.keys(grouped).length === 0) {
        listHtml = '<div class="card"><p style="text-align:center; color: var(--text-secondary); padding: 2rem;">Nenhum manual disponível no momento.</p></div>';
    } else {
        for (const [categoria, items] of Object.entries(grouped)) {
            listHtml += `
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 0.75rem; color: var(--text-secondary); border-bottom: 1px solid var(--border); padding-bottom: 0.25rem;">
                        <i class="ph-folder"></i> ${categoria}
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                        ${items.map(m => `
                            <div class="card" style="padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
                                <div>
                                    <div style="display:flex; align-items:flex-start; gap: 0.5rem;">
                                        <i class="ph-file-pdf" style="font-size: 2rem; color: #dc2626;"></i>
                                        <div style="flex: 1;">
                                            <strong style="display:block; color: var(--text-primary); line-height:1.2;">${m.titulo}</strong>
                                            <small style="color: var(--text-tertiary);">${new Date(m.data_upload).toLocaleDateString()}</small>
                                        </div>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.5rem; border-top: 1px solid var(--border); padding-top: 0.75rem;">
                                    <a href="${m.arquivo_url}" target="_blank" class="btn" style="flex:1; text-align:center; padding: 0.4rem; background: var(--bg-surface); color: var(--accent); border: 1px solid var(--accent); font-size: 0.9rem;">
                                        <i class="ph-eye"></i> Visualizar
                                    </a>
                                    ${isAdmin ? `<button class="btn" style="width: 40px; padding: 0.4rem; background: transparent; border: 1px solid var(--danger); color: var(--danger); display: flex; justify-content: center; align-items: center;" onclick="deleteManual(${m.id}, '${m.titulo}')" title="Excluir"><i class="ph-trash" style="font-size: 1.1rem;"></i></button>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    document.getElementById('contentArea').innerHTML = `
        ${uploadFormHtml}
        <div>
            ${listHtml}
        </div>
    `;

    if (isAdmin) {
        document.getElementById('uploadManualForm').addEventListener('submit', handleUploadManual);
    }
}

async function handleUploadManual(e) {
    e.preventDefault();
    const titulo = document.getElementById('manualTitulo').value;
    const categoria = document.getElementById('manualCategoria').value;
    const arquivoInput = document.getElementById('manualArquivo');
    const msgEl = document.getElementById('uploadStatusMsg');

    if (arquivoInput.files.length === 0) {
        msgEl.textContent = 'Por favor, selecione um arquivo PDF.';
        msgEl.style.color = 'var(--danger)';
        return;
    }

    const file = arquivoInput.files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        msgEl.textContent = 'Apenas arquivos PDF são permitidos.';
        msgEl.style.color = 'var(--danger)';
        return;
    }

    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('categoria', categoria);
    formData.append('arquivo', file);

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Enviando...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/manuals/upload', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (data.success) {
            msgEl.textContent = 'Manual enviado e salvo com sucesso!';
            msgEl.style.color = 'var(--success)';
            e.target.reset();
            // Recarrega a página de manuais para exibir o novo
            setTimeout(loadManuals, 1500);
        } else {
            msgEl.textContent = data.error || 'Erro desconhecido ao enviar.';
            msgEl.style.color = 'var(--danger)';
            btn.disabled = false;
            btn.textContent = originalText;
        }
    } catch (err) {
        console.error(err);
        msgEl.textContent = 'Erro de conexão ao tentar enviar o manual.';
        msgEl.style.color = 'var(--danger)';
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function deleteManual(id, titulo) {
    if (!confirm(`Tem certeza que deseja apagar o manual: "${titulo}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/manuals/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();

        if (data.success) {
            // Recarrega para atualizar a interface
            loadManuals();
        } else {
            alert('Erro ao excluir: ' + (data.error || 'Desconhecido'));
        }
    } catch (e) {
        console.error(e);
        alert('Erro de conexão ao tentar excluir.');
    }
}
