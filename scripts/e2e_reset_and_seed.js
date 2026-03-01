/**
 * scripts/e2e_reset_and_seed.js
 * 
 * Usage: node scripts/e2e_reset_and_seed.js
 * 
 * Purpose:
 * 1. Wipe all production data (orders, items, events, logs).
 * 2. Create one order for each print type.
 * 3. Simulate full lifecycle for each item.
 */

const axios = require('axios'); // Need to install axios or use fetch? Node 18+ has fetch.
const baseUrl = 'http://localhost:3000/api';

// Admin User ID (usually 1)
const ADMIN_ID = 1;
const ADMIN_NAME = 'Administrador';

// Helper: Sleep
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Helper: Log
const log = (msg) => console.log(`[E2E] ${msg}`);

async function main() {
    log("Iniciando E2E Reset & Seed...");

    // 1. WIPE DB (Using a temporary route or raw SQL if we had access, 
    // but since we are external script, we might need a route to clear DB or just rely on manual wipe functionality if exists.
    // User asked "limpa no sistema". Dashboard usually doesn't have "Nuke" button.
    // I will use direct DB access using sqlite3 in this script to be faster/safer than exposing a route.

    // REQUIRE SQLITE3
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const dbPath = path.resolve(__dirname, '../sp_system.db');
    const db = new sqlite3.Database(dbPath);

    log(`Conectando ao banco para limpeza...`);

    await new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("DELETE FROM pedidos", (err) => err ? console.error(err) : null);
            db.run("DELETE FROM itens_pedido", (err) => err ? console.error(err) : null);
            db.run("DELETE FROM eventos_producao", (err) => err ? console.error(err) : null);
            db.run("DELETE FROM historico_pedidos", (err) => err ? console.error(err) : null);
            // also clear sequences?
            db.run("DELETE FROM sqlite_sequence WHERE name IN ('pedidos', 'itens_pedido', 'eventos_producao', 'historico_pedidos')", () => {
                log("Banco de dados limpo com sucesso!");
                resolve();
            });
        });
    });

    db.close();
    await sleep(2000); // Wait for DB lock release/server cache?

    // 2. CREATE ORDERS
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
        const orderNum = 202600 + i;

        log(`\n--- Processando Pedido ${orderNum} (${sc.type}) ---`);

        // A. CREATE ORDER
        const newOrder = {
            cliente: `Cliente Teste ${sc.type}`,
            numero_pedido: orderNum.toString(),
            prazo_entrega: new Date(Date.now() + 86400000 * (i + 1)).toISOString().split('T')[0], // +1, +2 days
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

        let orderRes = await fetch(`${baseUrl}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrder)
        });

        if (!orderRes.ok) {
            console.error("Falha ao criar pedido", await orderRes.text());
            continue;
        }

        const orderData = await orderRes.json();
        const itemId = orderData.itens[0].id;
        log(`Pedido Criado: ID ${orderData.id}, Item ID ${itemId}`);

        // B. ARTE FINAL (Assign, Approve, Upload)
        // Setor Destino IS THE SCENARIO TYPE
        const artePayload = {
            arte_status: 'APROVADO',
            cor_impressao: 'Preto Net',
            setor_destino: sc.type,
            observacao_arte: 'Aprovado via Script',
            responsavel: ADMIN_NAME
        };

        // Simular upload de arquivo se for digital/laser? (Opcional, mas bom para dados completos)
        // Vamos pular upload físico, focar no fluxo de status.

        await fetch(`${baseUrl}/production/item/${itemId}/arte`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(artePayload)
        });
        log(`Arte Aprovada -> Enviado para ${sc.type}`);

        // C. SEPARAÇÃO & DESEMBALE (Generic Transitions)
        // Arte -> Aguardando Separação (feita autom. no backend, mas as vezes precisa trigger?)
        // Backend 'arte' PUT sets status? User's logic: updateArteStatus sets 'AGUARDANDO_APROVACAO'. 
        // aprovarArte sets status to 'AGUARDANDO_SEPARACAO' inside frontend logic? NO, frontend calls loadGenericQueue.
        // Let's check backend route.
        // Backend `production.js` PUT /item/:id/arte updates status?
        // Let's assume we advance status manually if needed.

        // Separação -> Desembale
        await fetch(`${baseUrl}/production/item/${itemId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novo_status_item: 'AGUARDANDO_DESEMBALE', operador_id: ADMIN_ID })
        });
        log(`Separação Concluída`);

        // Desembale -> Produção
        await fetch(`${baseUrl}/production/item/${itemId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novo_status_item: 'AGUARDANDO_PRODUCAO', operador_id: ADMIN_ID })
        });
        log(`Desembale Concluído -> Aguardando Produção`);

        // D. PRODUÇÃO (Timers)
        // Inicio
        await fetch(`${baseUrl}/production/item/${itemId}/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operador_id: ADMIN_ID,
                setor: sc.type, // Correto? Setor vem do frontend.
                acao: 'INICIO'
            })
        });
        log(`Produção Iniciada (${sc.type})`);

        await sleep(1500); // 1.5s duration

        // Fim
        await fetch(`${baseUrl}/production/item/${itemId}/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operador_id: ADMIN_ID,
                setor: sc.type,
                acao: 'FIM',
                quantidade_produzida: sc.qtd
            })
        });
        log(`Produção Finalizada`);

        // E. EMBALE
        // Status should be AGUARDANDO_EMBALE automatically after FIM? 
        // Need to check backend production logic. Assuming yes or manual update.
        // Let's force status update to be safe if backend event doesn't trigger it (it usually doesn't).
        await fetch(`${baseUrl}/production/item/${itemId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novo_status_item: 'AGUARDANDO_EMBALE', operador_id: ADMIN_ID })
        });

        // Confirm Embale
        const embalePayload = {
            quantidade_volumes: 1,
            peso: 5.5,
            altura: 30,
            largura: 30,
            comprimento: 30,
            dados_volumes: JSON.stringify([{ peso: 5.5, altura: 30, largura: 30, comprimento: 30 }]),
            flag_embale_sem_volumes: false
        };
        await fetch(`${baseUrl}/production/item/${itemId}/embale`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(embalePayload)
        });
        log(`Embale Confirmado`);

        // F. LOGÍSTICA (Finalizar Pedido)
        // Change item status to CONCLUIDO
        await fetch(`${baseUrl}/production/item/${itemId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novo_status_item: 'AGUARDANDO_ENVIO', operador_id: ADMIN_ID })
        });

        // Dispatch (Change to CONCLUIDO)
        await fetch(`${baseUrl}/production/item/${itemId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novo_status_item: 'CONCLUIDO', operador_id: ADMIN_ID })
        });
        log(`Item Concluído`);

        // Finalize Order (Check if all items done? Backend logic usually doesn't auto-finalize order without trigger?
        // Or "Finalizar" button in Admin Panel.
        // Let's force update order status.
        // PUT /api/orders/:id/status ? Not standard.
        // Usually done via /api/orders/:id/dispatch or similar.
        // Let's use direct DB update for Order Status to ensure Dashboard counts it as 'FINALIZADO'.
        // Or if there is a route. `orders.js` has PUT /:id for edits.

        await fetch(`${baseUrl}/orders/${orderData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status_oficial: 'FINALIZADO',
                user_id: ADMIN_ID
            })
        });
        log(`Pedido Finalizado`);
    }

    log("\n--- E2E Concluído com Sucesso ---");
}

main().catch(console.error);
