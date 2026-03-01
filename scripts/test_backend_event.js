
const http = require('http');

const data = JSON.stringify({
    item_id: 11, // Um ID arbitrario existente (visto no check anterior)
    operador_id: 1,
    operador_nome: 'TESTE_BACKEND_OK',
    setor: 'SILK_PLANO',
    acao: 'INICIO',
    quantidade_produzida: 0
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/production/evento',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
