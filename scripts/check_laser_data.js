const db = require('../server/database');

const query = `
    SELECT id, setor_destino, arquivo_impressao_laser_url, arquivo_impressao_digital_url, layout_path 
    FROM itens_pedido 
    WHERE setor_destino = 'IMPRESSAO_LASER'
    ORDER BY id DESC 
    LIMIT 3
`;

db.all(query, [], (err, rows) => {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log("Laser Items found:", JSON.stringify(rows, null, 2));
    }
});
