
// Mock Layout
const globalMock = {
    document: {
        body: {
            insertAdjacentHTML: (pos, html) => {
                console.log("[MOCK insertAdjacentHTML] HTML Generated:");
                console.log(html);
                if (html.includes('Vol 1: 10kg') && html.includes('20x30x40 cm')) {
                    console.log("[SUCCESS] Volume 1 details found.");
                } else {
                    console.error("[FAILURE] Volume 1 details NOT found.");
                }

                if (html.includes('Vol 2: 5kg')) {
                    console.log("[SUCCESS] Volume 2 details found.");
                } else {
                    console.error("[FAILURE] Volume 2 details NOT found.");
                }

                if (html.includes('Vir Volumes:') && html.includes('Peso: <em>Não aplicável</em>')) {
                    console.log("[SUCCESS] 'Retirada' logic appears correct (if testing Retirada).");
                }
            }
        },
        getElementById: (id) => ({ remove: () => { } })
    },
    renderShippingBadge: (type) => `[Badge: ${type}]`
};

// Bind to global for function to use
Object.assign(global, globalMock);

// Mock Item Data
const itemTransport = {
    id: 123,
    cliente: "Test Client",
    numero_pedido: "REQ-001",
    tipo_envio: "CORREIOS",
    transportadora: "Sedex",
    prazo_entrega: "2025-12-31",
    observacao: "Handle with care",
    quantidade_volumes: 2,
    peso: 15,
    altura: 40,
    largura: 30,
    comprimento: 40,
    dados_volumes: JSON.stringify([
        { peso: 10, altura: 20, largura: 30, comprimento: 40 },
        { peso: 5, altura: 10, largura: 15, comprimento: 20 }
    ])
};

const itemRetirada = {
    id: 124,
    cliente: "Test Client Retira",
    numero_pedido: "REQ-002",
    tipo_envio: "RETIRADA",
    quantidade_volumes: 5
};

// Paste function code here (simplified manual extraction or require if modular)
// Since app.js is not a module, I will manually paste the key logic I just updated
// to ensure it works in isolation.

function openLabelModal(item) {
    const isRetirada = item.tipo_envio === 'RETIRADA';
    // ... logic ...
    let dadosEmbale = '';
    if (isRetirada) {
        dadosEmbale = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <div><strong>Vir Volumes:</strong> ${item.quantidade_volumes || '?'}</div>
                <div style="color: var(--text-secondary)">Peso: <em>Não aplicável</em></div>
                <div style="color: var(--text-secondary)">Dimensões: <em>Não aplicável</em></div>
            </div>
         `;
    } else {
        // Parse individual volumes
        let volumesList = '';
        let vols = [];
        try {
            vols = item.dados_volumes ? JSON.parse(item.dados_volumes) : [];
        } catch (e) {
            console.error("Erro parsing dados_volumes", e);
        }

        if (vols.length > 0) {
            volumesList = '<div style="margin-top:0.5rem; background: #fff; border: 1px solid #eee; border-radius: 4px; padding: 0.5rem;">';
            vols.forEach((v, i) => {
                const peso = v.peso || v.p || 0;
                const alt = v.altura || v.a || 0;
                const larg = v.largura || v.l || 0;
                const comp = v.comprimento || v.c || 0;

                volumesList += `
                    <div style="font-size: 0.85rem; border-bottom: 1px dashed #eee; padding-bottom: 4px; margin-bottom: 4px; display:flex; justify-content:space-between;">
                        <span><strong>Vol ${i + 1}:</strong> ${peso}kg</span>
                        <span>${alt}x${larg}x${comp} cm</span>
                    </div>
                `;
            });
            volumesList += '</div>';
        }

        dadosEmbale = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                 <div><strong>Volumes:</strong> ${item.quantidade_volumes || '-'}</div>
                 <div><strong>Peso Total:</strong> ${item.peso ? item.peso + ' kg' : '<span style="color:red">Pend.</span>'}</div>
                 <div style="grid-column: span 2"><strong>Dimensões Totais:</strong> ${item.altura ? `${item.altura}x${item.largura}x${item.comprimento} cm` : '<span style="color:red">Pendentes</span>'}</div>
            </div>
            ${volumesList}
         `;
    }

    // Simplified HTML construction for test
    const html = `
        <div id="labelModal">
           <h3>DADOS PARA ETIQUETA</h3>
           ${dadosEmbale}
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

console.log("--- TEST TRANSPORTADORA ---");
openLabelModal(itemTransport);

console.log("\n--- TEST RETIRADA ---");
openLabelModal(itemRetirada);
