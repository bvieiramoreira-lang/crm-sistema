
const http = require('http');

// Configuração
const HOST = 'localhost';
const PORT = 3000;
const OPERADOR_TESTE = 'TESTE_AUTOMATIZADO_' + Date.now();

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

async function runTest() {
    console.log(`[TESTE] Iniciando teste com operador: ${OPERADOR_TESTE}`);

    try {
        // 1. Criar Pedido COM Item
        console.log('[TESTE] 1. Criando Pedido com Item...');
        const orderRes = await doRequest('/api/orders', 'POST', {
            cliente: 'CLIENTE TESTE AUTO',
            numero_pedido: 'PED-' + Date.now(),
            data_entrega: new Date().toISOString().split('T')[0],
            tipo_envio: 'RETIRADA',
            prioridade: 'BAIXA',
            itens: [{
                produto: 'CAMISETA TESTE',
                quantidade: 100,
                tipo_estampa: 'SILK',
                setor_destino: 'SILK_PLANO'
            }]
        });

        if (orderRes.status !== 200 && orderRes.status !== 201) {
            throw new Error('Falha ao criar pedido: ' + JSON.stringify(orderRes.body));
        }
        const orderId = orderRes.body.id;
        console.log(`[TESTE] Pedido criado ID: ${orderId}`);

        // 2. Buscar ID do Item (GET Pedido)
        console.log('[TESTE] 2. Buscando ID do Item...');
        const getOrderRes = await doRequest(`/api/orders/${orderId}`, 'GET');
        if (getOrderRes.status !== 200) throw new Error('Falha ao buscar pedido');

        const item = getOrderRes.body.itens[0];
        if (!item) throw new Error('Item não encontrado no pedido criado');
        const itemId = item.id;
        console.log(`[TESTE] Item encontrado ID: ${itemId}`);

        // 3. Simular Produção (INICIO)
        console.log('[TESTE] 3. Iniciando Produção...');
        await doRequest('/api/production/evento', 'POST', {
            item_id: itemId,
            operador_id: 1,
            operador_nome: OPERADOR_TESTE,
            setor: 'SILK_PLANO',
            acao: 'INICIO',
            quantidade_produzida: 0
        });

        // 4. Simular Produção (FIM)
        console.log('[TESTE] 4. Finalizando Produção...');
        await doRequest('/api/production/evento', 'POST', {
            item_id: itemId,
            operador_id: 1,
            operador_nome: OPERADOR_TESTE,
            setor: 'SILK_PLANO',
            acao: 'FIM',
            quantidade_produzida: 50
        });

        console.log('[TESTE] Produção registrada.');

        // 5. Verificar Relatório
        console.log('[TESTE] 5. Consultando Relatório...');
        const today = new Date().toISOString().split('T')[0];
        const reportRes = await doRequest(`/api/reports/productivity?start=${today}&end=${today}`, 'GET');

        if (reportRes.status !== 200) throw new Error('Falha ao obter relatório');

        const reportData = reportRes.body;
        const found = reportData.find(r => r.operador === OPERADOR_TESTE);

        if (found) {
            console.log('\n✅ [SUCESSO TOTAL] Operador encontrado no relatório!');
            console.log(`Operador: ${found.operador}`);
            console.log(`Total Produzido: ${found.total_produzido}`);
            console.log(`Setor: ${found.setor}`);
        } else {
            console.error('\n❌ [FALHA] Operador NÃO encontrado no relatório.');
            console.log('Operadores retornados:', JSON.stringify(reportData, null, 2));
        }

    } catch (err) {
        console.error('[ERRO NO TESTE]', err);
    }
}

runTest();
