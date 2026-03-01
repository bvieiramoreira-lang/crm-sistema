const baseUrl = 'http://127.0.0.1:3000/api';
const ADMIN_ID = 1;
const ADMIN_NAME = 'Administrador';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (msg) => console.log(`[SEED] ${msg}`);

async function main() {
    log("Iniciando Seed via API (v3)...");

    const scenarios = [
        { type: 'SILK_PLANO', product: 'Caneta Curvada', qtd: 500 },
        { type: 'SILK_CILINDRICA', product: 'Garrafa Metal', qtd: 100 },
        { type: 'TAMPOGRAFIA', product: 'Chaveiro Plástico', qtd: 1000 },
        { type: 'IMPRESSAO_LASER', product: 'Placa Metal', qtd: 50 },
        { type: 'IMPRESSAO_DIGITAL', product: 'Adesivo Vinil', qtd: 200 },
        { type: 'ESTAMPARIA', product: 'Camiseta Algodão', qtd: 30 }
    ];

    for (let i = 0; i < scenarios.length; i++) {
        const sc = scenarios[i];
        const orderNum = (202600 + i).toString();

        log(`\n--- Processando Pedido ${orderNum} (${sc.type}) ---`);

        try {
            // A. CREATE ORDER
            const newOrder = {
                cliente: `Cliente Teste ${sc.type}`,
                numero_pedido: orderNum,
                prazo_entrega: new Date(Date.now() + 86400000 * (i + 1)).toISOString().split('T')[0],
                tipo_envio: i % 2 === 0 ? 'CORREIOS' : 'RETIRADA',
                transportadora: i % 2 === 0 ? 'SEDEX' : '',
                observacao: 'Teste automatizado E2E',
                itens: [
                    {
                        produto: sc.product,
                        quantidade: sc.qtd.toString(),
                        referencia: `REF-${sc.type.substring(0, 3)}`
                    }
                ]
            };

            log(`Criando pedido...`);
            let orderRes = await fetch(`${baseUrl}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOrder)
            });

            if (!orderRes.ok) {
                const txt = await orderRes.text();
                if (txt.includes('UNIQUE constraint failed')) {
                    log(`Pedido ${orderNum} já existe.`);
                } else {
                    console.error("Falha ao criar pedido", txt);
                }
                continue;
            }

            const createData = await orderRes.json();
            const createdOrderId = createData.id;

            // Fetch Items now (because POST response doesn't include them with IDs)
            log(`Pedido Criado. Buscando detalhes...`);
            const detailRes = await fetch(`${baseUrl}/orders/${createdOrderId}`);
            const orderData = await detailRes.json();

            if (!orderData.itens || orderData.itens.length === 0) {
                log("Erro: Pedido sem itens retornados (GET Details).");
                continue;
            }
            const itemId = orderData.itens[0].id;
            log(`Detalhes obtidos. Item ID ${itemId}`);

            // B. ARTE FINAL
            log(`Aprovando Arte...`);
            await fetch(`${baseUrl}/production/item/${itemId}/arte`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    arte_status: 'APROVADO',
                    cor_impressao: 'Preto Net',
                    setor_destino: sc.type,
                    observacao_arte: 'Aprovado via Script',
                    responsavel: ADMIN_NAME
                })
            });

            await updateStatus(itemId, 'AGUARDANDO_SEPARACAO');

            // C. SEPARAÇÃO
            log(`Avançando Separação...`);
            await updateStatus(itemId, 'AGUARDANDO_DESEMBALE');

            // D. DESEMBALE
            log(`Avançando Desembale...`);
            await updateStatus(itemId, 'AGUARDANDO_PRODUCAO');

            // E. PRODUÇÃO
            log(`Simulando Produção...`);

            // CORRECTED ENDPOINT /evento
            const eventRes1 = await fetch(`${baseUrl}/production/evento`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId, operador_id: ADMIN_ID, setor: sc.type, acao: 'INICIO' })
            });
            if (!eventRes1.ok) log(`Erro evento INICIO: ${await eventRes1.text()}`);

            await sleep(500);

            const eventRes2 = await fetch(`${baseUrl}/production/evento`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId, operador_id: ADMIN_ID, setor: sc.type, acao: 'FIM', quantidade_produzida: sc.qtd })
            });
            if (!eventRes2.ok) log(`Erro evento FIM: ${await eventRes2.text()}`);

            await updateStatus(itemId, 'AGUARDANDO_EMBALE');

            // F. EMBALE
            log(`Confirmando Embale...`);
            const embalePayload = {
                quantidade_volumes: 1,
                peso: 5.5,
                altura: 30, largura: 30, comprimento: 30,
                dados_volumes: JSON.stringify([{ peso: 5.5, altura: 30, largura: 30, comprimento: 30 }]),
                flag_embale_sem_volumes: false
            };
            await fetch(`${baseUrl}/production/item/${itemId}/embale`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(embalePayload)
            });

            // G. LOGISTICA (Item Concluido)
            log(`Finalizando Logística...`);
            await updateStatus(itemId, 'AGUARDANDO_ENVIO');
            await updateStatus(itemId, 'CONCLUIDO');

            // H. FINALIZAR PEDIDO
            log(`Finalizando Pedido...`);
            const finalRes = await fetch(`${baseUrl}/orders/${createdOrderId}`, { // Use createdOrderId directly
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status_geral: 'FINALIZADO', user_id: ADMIN_ID })
            });

            if (finalRes.ok) log(`Pedido ${orderNum} Concluído!`);
            else log(`Falha ao finalizar pedido: ${await finalRes.text()}`);

        } catch (err) {
            console.error(`Erro no pedido ${orderNum}:`, err.message);
        }
    }

    log("\n--- E2E Concluído ---");
}

async function updateStatus(itemId, status) {
    const res = await fetch(`${baseUrl}/production/item/${itemId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novo_status_item: status, operador_id: ADMIN_ID })
    });
    if (!res.ok) throw new Error(`Status Update Failed: ${await res.text()}`);
}

main().catch(console.error);
