const http = require('http');

const HOST = 'localhost';
const PORT = 3000;
const OPERADOR_TESTE = 'OPERADOR_FULL_FLOW';

function doRequest(path, method, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const bodyData = data ? JSON.stringify(data) : null;
        if (bodyData) options.headers['Content-Length'] = Buffer.byteLength(bodyData);

        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(responseBody);
                    resolve({ status: res.statusCode, body: json });
                } catch (e) {
                    resolve({ status: res.statusCode, body: responseBody });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (bodyData) req.write(bodyData);
        req.end();
    });
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log(`[TESTE] Iniciando Fluxo Completo...`);

    try {
        // 1. Criar Pedido
        console.log('[1/8] Criando Pedido...');
        const orderRes = await doRequest('/api/orders', 'POST', {
            cliente: 'CLIENTE TESTE FLUXO COMPLETO',
            numero_pedido: 'PED-' + Date.now().toString().slice(-6),
            data_entrega: new Date().toISOString().split('T')[0],
            tipo_envio: 'RETIRADA',
            prioridade: 'ALTA',
            itens: [{
                produto: 'COPO TESTE',
                quantidade: 50,
                tipo_estampa: 'SILK_CILINDRICA',
                setor_destino: 'SILK_CILINDRICA'
            }]
        });

        if (orderRes.status !== 200 && orderRes.status !== 201) throw new Error('Falha ao criar pedido');
        const orderId = orderRes.body.id;

        const getOrderRes = await doRequest(`/api/orders/${orderId}`, 'GET');
        const itemId = getOrderRes.body.itens[0].id;
        console.log(` -> Pedido ID: ${orderId} | Item ID: ${itemId}`);

        // 2. Arte Aprovação -> Separação
        console.log('[2/8] Aprovando Arte (Vai para Separação)...');
        await doRequest(`/api/production/item/${itemId}/arte`, 'PUT', {
            arte_status: 'APROVADO',
            setor_destino: 'SILK_CILINDRICA',
            cor_impressao: 'AZUL',
            responsavel: 'ARTE_USER'
        });
        await delay(500);

        // 3. Separação -> Desembale
        console.log('[3/8] Finalizando Separação (Vai para Desembale)...');
        await doRequest(`/api/production/item/${itemId}/status`, 'PUT', {
            novo_status_item: 'AGUARDANDO_DESEMBALE',
            operador_id: 1
        });
        await delay(500);

        // 4. Desembale -> Produção
        console.log('[4/8] Finalizando Desembale (Vai para Produção)...');
        await doRequest(`/api/production/item/${itemId}/status`, 'PUT', {
            novo_status_item: 'AGUARDANDO_PRODUCAO',
            operador_id: 1
        });
        await delay(500);

        // 5. Produção: Início
        console.log('[5/8] Iniciando Produção...');
        await doRequest(`/api/production/evento`, 'POST', {
            item_id: itemId,
            operador_id: 1,
            operador_nome: OPERADOR_TESTE,
            setor: 'SILK_CILINDRICA',
            acao: 'INICIO',
            quantidade_produzida: 0
        });
        await delay(500);

        // 6. Produção: Fim -> Embale
        console.log('[6/8] Finalizando Produção (Vai para Embale)...');
        await doRequest(`/api/production/evento`, 'POST', {
            item_id: itemId,
            operador_id: 1,
            operador_nome: OPERADOR_TESTE,
            setor: 'SILK_CILINDRICA',
            acao: 'FIM',
            quantidade_produzida: 50
        });
        await delay(500);

        // 7. Embale -> Logística
        console.log('[7/8] Realizando Embale (Vai para Logística)...');
        await doRequest(`/api/production/item/${itemId}/embale`, 'PUT', {
            quantidade_volumes: 1,
            peso: 2.5,
            altura: 10,
            largura: 10,
            comprimento: 10,
            dados_volumes: '[{"peso":2.5,"altura":10,"largura":10,"comprimento":10}]'
        });
        await delay(500);

        // 8. Logística -> Concluído
        console.log('[8/8] Finalizando na Logística (Pedido Concluído!)...');
        await doRequest(`/api/production/item/${itemId}/status`, 'PUT', {
            novo_status_item: 'CONCLUIDO',
            operador_id: 1
        });
        await delay(500);

        // Verificar o status atual do pedido para validar
        const finalCheck = await doRequest(`/api/orders/${orderId}`, 'GET');
        const finalStatus = finalCheck.body.status_geral;
        const finalItemStatus = finalCheck.body.itens[0].status_atual;

        console.log('\n--- RESULTADO FINAL ---');
        console.log(`Status do Pedido: ${finalStatus}`);
        console.log(`Status do Item: ${finalItemStatus}`);

        if (finalStatus === 'FINALIZADO' && finalItemStatus === 'CONCLUIDO') {
            console.log('✅ SUCESSO! O pedido passou por todas as etapas corretamente.');
        } else {
            console.log('❌ FALHA! O flow não terminou como esperado.');
        }

    } catch (err) {
        console.error('[ERRO] Ocorreu um erro durante o fluxo:', err);
    }
}

runTest();
