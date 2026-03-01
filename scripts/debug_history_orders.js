const http = require('http');

const start = '2025-01-01';
const end = '2026-12-31';
const url = `http://localhost:3000/api/dashboard/history/orders?start=${start}&end=${end}`;

console.log(`Fetching ${url}...`);

http.get(url, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Body:', data);
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
