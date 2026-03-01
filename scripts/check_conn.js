const http = require('http');

console.log("Testing connection to localhost:3000...");

const req = http.request({
    host: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
    timeout: 2000
}, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk.toString().substring(0, 100)}...`);
    });
});

req.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
});

req.on('timeout', () => {
    console.error('TIMEOUT');
    req.destroy();
});

req.end();
