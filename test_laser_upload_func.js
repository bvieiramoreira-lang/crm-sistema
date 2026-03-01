const fs = require('fs');
const http = require('http');
const FormData = require('form-data');
const path = require('path');

// Configuração
const PORT = 3000;
const TEST_FILE_PATH = './test_laser.txt';
const OPERADOR_ID = 1; // ID Admin ou Arte (ajuste se necessário, verifique seed)

// Criar arquivo de teste se não existir
if (!fs.existsSync(TEST_FILE_PATH)) {
    fs.writeFileSync(TEST_FILE_PATH, 'Conteúdo de teste para upload laser.');
}

// 1. Criar um Pedido e Item de teste (ou usar existente)
// Para simplificar, vamos tentar pegar um item existente ou inserir um dummy via SQL direto para garantir
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./sp_system.db');

function runTest() {
    db.serialize(() => {
        // Criar Pedido Dummy
        db.run("INSERT OR IGNORE INTO pedidos (numero_pedido, cliente, prazo_entrega, status_geral) VALUES ('TEST-LASER', 'Cliente Teste', '2026-12-31', 'PENDENTE')");

        // Obter ID do Pedido
        db.get("SELECT id FROM pedidos WHERE numero_pedido = 'TEST-LASER'", (err, pedido) => {
            if (err) return console.error("Erro ao pegar pedido:", err);

            // Inserir Item Dummy
            const stmt = db.prepare("INSERT INTO itens_pedido (pedido_id, produto, quantidade, status_atual, setor_destino, responsavel_arte) VALUES (?, 'Item Teste Laser', 1, 'ARTE_FINAL', 'IMPRESSAO_LASER', 'Admin')");
            stmt.run(pedido.id, function (err) {
                if (err) return console.error("Erro ao criar item:", err);
                const itemId = this.lastID;
                console.log(`Item de teste criado com ID: ${itemId}`);

                // Executar Upload
                performUpload(itemId);
            });
            stmt.finalize();
        });
    });
}

function performUpload(itemId) {
    const form = new FormData();
    form.append('laser_file', fs.createReadStream(TEST_FILE_PATH), {
        filename: 'test_laser.pdf',
        contentType: 'application/pdf'
    });
    form.append('operador_id', OPERADOR_ID);

    const options = {
        hostname: 'localhost',
        port: PORT,
        path: `/api/production/item/${itemId}/laser`,
        method: 'POST',
        headers: form.getHeaders()
    };

    console.log(`Iniciando upload para o Item ${itemId}...`);

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log(`Status Code: ${res.statusCode}`);
            console.log(`Resposta: ${data}`);

            if (res.statusCode === 200) {
                console.log("✅ SUCESSO: Upload realizado corretamente.");
                // Check DB
                checkDatabase(itemId);
            } else {
                console.error("❌ FALHA: Erro no upload.");
            }
        });
    });

    req.on('error', (e) => {
        console.error(`❌ Erro na requisição: ${e.message}`);
    });

    form.pipe(req);
}

function checkDatabase(itemId) {
    db.get("SELECT arquivo_impressao_laser_nome, arquivo_impressao_laser_enviado_por FROM itens_pedido WHERE id = ?", [itemId], (err, row) => {
        if (err) console.error("Erro ao verificar DB:", err);
        else {
            console.log("Verificação no Banco de Dados:");
            console.log(row);
            if (row && row.arquivo_impressao_laser_nome === 'test_laser.pdf') {
                console.log("✅ DADOS PERSISTIDOS CORRETAMENTE!");
            } else {
                console.log("❌ DADOS INCORRETOS NO BANCO.");
            }
        }
        // Limpar
        // db.run("DELETE FROM itens_pedido WHERE id = ?", [itemId]); // Opcional, mantendo para inspeção
    });
}

runTest();
