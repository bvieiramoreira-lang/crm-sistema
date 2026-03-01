const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/production/item/9999/embale',
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        console.log('BODY HEAD:', data.substring(0, 100));
    });
});

req.on('error', e => {
    console.error(`problem with request: ${e.message}`);
});

req.write(JSON.stringify({}));
req.end();
