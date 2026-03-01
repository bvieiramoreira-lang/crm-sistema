
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/css/style.css?v=test', // Including query param to test static middleware behavior
    method: 'GET'
};

const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        console.log('BODY START: ' + data.substring(0, 100));
        console.log('IS HTML?', data.trim().toLowerCase().startsWith('<!doctype html>'));
    });
});

req.on('error', error => {
    console.error('ERROR:', error);
});

req.end();
