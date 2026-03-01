
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET'
};

const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        console.log('BODY START: ' + data.substring(0, 200));
    });
});

req.on('error', error => {
    console.error('ERROR:', error);
});

req.end();
