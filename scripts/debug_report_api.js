const http = require('http');

const today = new Date().toISOString().split('T')[0];

const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/dashboard/history?start=${today}&end=${today}`,
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Status Code:", res.statusCode);
            console.log("Report Data:", JSON.stringify(json, null, 2));
        } catch (e) {
            console.error(e.message);
            console.log("Raw Data:", data);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
