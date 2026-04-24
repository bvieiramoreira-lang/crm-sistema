const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8').split('\n');
code.forEach((line, i) => { if(line.includes("const isRunning = item.status_atual === 'EM_PRODUCAO';")) console.log(i + ': ' + line); });
