const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Multer setup for temporary storage
const tempUpload = multer({ dest: path.join(__dirname, '../uploads/temp/') });

router.post('/parse-pdf', tempUpload.single('pdf_file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);

        // Delete temp file immediately to avoid disk space bloat
        fs.unlinkSync(req.file.path);

        const text = data.text;

        console.log("=== PDF DUMP START ===");
        console.log(text);
        console.log("=== PDF DUMP END ===");

        const extractedData = {
            cliente: '',
            numero_pedido: '',
            prazo_entrega: '',
            tipo_envio: '',
            transportadora: '',
            observacao: '',
            itens: []
        };

        const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');

        let inItemsTable = false;

        // Parse basic fields
        for (let i = 0; i < lines.length; i++) {
            // Cliente
            if (lines[i] === 'Cliente' && lines[i + 1]) {
                extractedData.cliente = lines[i + 1];
            }

            // Número do pedido (Bling format "Pedido de Venda Nº 724")
            if (lines[i].startsWith('Pedido de Venda Nº')) {
                const num = lines[i].replace(/[^\d]/g, '');
                if (num) extractedData.numero_pedido = num;
            }
            // Fallback for "Número do pedido724" (no space)
            if (lines[i].startsWith('Número do pedido')) {
                const num = lines[i].replace('Número do pedido', '').trim();
                if (num && !extractedData.numero_pedido) extractedData.numero_pedido = num;
            }

            // Data prevista (Bling format "Data prevista27/03/2026 ")
            if (lines[i].startsWith('Data prevista')) {
                let val = lines[i].replace('Data prevista', '').trim();
                if (val) {
                    const dateParts = val.split('/');
                    if (dateParts.length === 3) {
                        extractedData.prazo_entrega = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                    } else {
                        extractedData.prazo_entrega = val;
                    }
                }
            }

            // Transportadora (Bling format "TransportadoraMelhor Envio ( jadlog )")
            if (lines[i].startsWith('Transportadora')) {
                let val = lines[i].replace('Transportadora', '').trim();
                // Sometimes it's exactly "Transportadora" and the value is on the next line
                if (!val && lines[i + 1]) {
                    val = lines[i + 1];
                }

                if (val) {
                    const transLower = val.toLowerCase();
                    if (transLower.includes('retirada')) {
                        extractedData.tipo_envio = 'RETIRADA';
                        extractedData.transportadora = val;
                    } else if (transLower.includes('correio')) {
                        extractedData.tipo_envio = 'CORREIOS';
                        extractedData.transportadora = val;
                    } else {
                        extractedData.tipo_envio = 'TRANSPORTADORA';
                        extractedData.transportadora = val;
                    }
                }
            }

            // Observações (Bling format "Observações" then content on next lines)
            if (lines[i] === 'Observações' || lines[i] === 'Observação') {
                // Read lines until a known end marker or next section
                let obsText = [];
                let j = i + 1;
                while (j < lines.length) {
                    if (lines[j].includes('Data de Recebimento') || lines[j].includes('Assinatura') || lines[j].match(/^\/\s*\//)) {
                        break;
                    }
                    obsText.push(lines[j]);
                    j++;
                }
                extractedData.observacao = obsText.join('\n').trim();
            }

            // --- ITENS ---
            // Bling table header:
            // "Item"
            // "Código (SKU) /"
            // "GTIN"
            // "QtdUnPreço unTotal"
            // Followed by actual item data like:
            // "Toalha de Banho, Praia Personalizada 210gPP27520,0050,021.000,40"
            // Or "Produto X" \n "SKU" \n "10,00"... etc.

            if (lines[i].includes('QtdUnPreço unTotal') || lines[i].includes('QtdUnPreço')) {
                inItemsTable = true;
                continue;
            }

            if (inItemsTable) {
                if (lines[i].startsWith('Número de itens:') || lines[i].startsWith('Soma das')) {
                    inItemsTable = false;
                    continue;
                }

                // In Bling, it often merges strings: "Toalha de Banho, Praia Personalizada 210gPP27520,0050,021.000,40"
                // This is a nightmare to parse automatically without fixed columns.
                // Let's try to extract info and push.
                // We'll look for quantities like "20,00" inside the string.

                let lineStr = lines[i];

                // Regex para capturar Produto + Ref + Qtd
                // Ex: "Toalha de Banho 210gPP27520,0050,021.000,40"
                // Produto: [Texto]
                // Ref/SKU: PP275
                // Qtd: 20,00
                // Matcher: (Texto livre) (Referencia em MAIUSCULO/Numeros) (Quantidade \d+,\d{2})
                const itemMatch = lineStr.match(/^(.*?)([A-Z0-9-]{3,15})?(\d+,\d{2})(.*)$/);

                if (itemMatch) {
                    const rawProduto = itemMatch[1].trim();
                    const rawReferencia = itemMatch[2] ? itemMatch[2].trim() : '';
                    const rawQuantidade = parseInt(itemMatch[3].split(',')[0], 10);

                    extractedData.itens.push({
                        produto: rawProduto,
                        referencia: rawReferencia,
                        quantidade: isNaN(rawQuantidade) ? 1 : rawQuantidade
                    });
                } else {
                    // Fallback to simple line-by-line if it's not merged
                    // Se não conseguir parsear, insere a linha inteira como produto para o usario arrumar
                    if (lineStr.length > 3) {
                        extractedData.itens.push({
                            produto: lineStr.substring(0, 50),
                            referencia: '',
                            quantidade: 1
                        });
                    }
                }
            }
        }

        res.json(extractedData);
    } catch (err) {
        console.error("PDF Parsing error:", err);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Falha ao processar o PDF. Verifique se o formato está correto.' });
    }
});

module.exports = router;
