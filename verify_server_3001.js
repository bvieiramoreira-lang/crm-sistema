
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/',
    method: 'GET'
};

const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        console.log('BODY LENGTH: ' + data.length);
    });
});

req.on('error', error => {
    console.error('ERROR:', error);
});

req.end();
