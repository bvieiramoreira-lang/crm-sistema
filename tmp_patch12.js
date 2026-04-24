const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

const targetStr = "{ id: 'orders', label: 'Todos os Pedidos', icon: 'ph-stack', profiles: ['financeiro', 'admin'], action: loadOrders },";
const replacement = "{ id: 'pausas', label: 'Monitor de Pausas', icon: 'ph-pause-circle', profiles: ['admin'], action: renderDashboardPausasAdmin },\n            " + targetStr;

if (code.includes(targetStr) && !code.includes('Monitor de Pausas')) {
    code = code.replace(targetStr, replacement);
    fs.writeFileSync('public/js/app.js', code);
    console.log('Menu Item inserted');
} else {
    console.log('Already there or could not find target.');
}
