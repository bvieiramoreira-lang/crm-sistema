const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/css/style_v3.css',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`BODY LENGTH: ${data.length}`);
        console.log(`FIRST 100 CHARS: ${data.substring(0, 100)}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
