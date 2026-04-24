const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

// 1. Update renderGenericRows
code = code.replace(
    /openEmbaleAction\(\$\{item\.id\}, \$\{item\.pedido_id\}, '\$\{item\.tipo_envio\}'\)/g,
    "openEmbaleAction(${item.id}, ${item.pedido_id}, '${item.tipo_envio}', ${item.quantidade})"
);
code = code.replace(
    /openDesembaleConfirmation\(\$\{item\.id\}, '\$\{nextStatus\}'\)/g,
    "openDesembaleConfirmation(${item.id}, '${nextStatus}', ${item.quantidade})"
);

fs.writeFileSync('public/js/app.js', code);
console.log('Patch 1 done');
