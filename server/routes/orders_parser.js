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

        // Parse basic fields
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === 'Cliente' && lines[i + 1]) {
                extractedData.cliente = lines[i + 1];
            }
            if ((lines[i] === 'Número do pedido' || lines[i] === 'Pedido de Venda Nº') && lines[i + 1]) {
                // Try to grab the number from the same line or next line
                const inlineMatch = lines[i].match(/Pedido de Venda Nº\s+(\d+)/i);
                if (inlineMatch) {
                    extractedData.numero_pedido = inlineMatch[1];
                } else {
                    extractedData.numero_pedido = lines[i + 1].replace(/[^\d]/g, ''); // just numbers
                }
            }
            if (lines[i] === 'Data prevista' && lines[i + 1]) {
                const dateParts = lines[i + 1].split('/');
                if (dateParts.length === 3) {
                    // Convert dd/mm/yyyy to yyyy-mm-dd
                    extractedData.prazo_entrega = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                } else {
                    extractedData.prazo_entrega = lines[i + 1];
                }
            }
            if (lines[i] === 'Observações' && lines[i + 1]) {
                extractedData.observacao = lines[i + 1];
            }
            if (lines[i] === 'Transportadora' && lines[i + 1]) {
                const transText = lines[i + 1];
                const transLower = transText.toLowerCase();
                if (transLower.includes('retirada')) {
                    extractedData.tipo_envio = 'RETIRADA';
                    extractedData.transportadora = transText; // e.g Retirada em Loja
                } else if (transLower.includes('correio')) {
                    extractedData.tipo_envio = 'CORREIOS';
                    extractedData.transportadora = transText;
                } else {
                    extractedData.tipo_envio = 'TRANSPORTADORA';
                    extractedData.transportadora = transText;
                }
            }
        }

        // Parse Items
        // The table layout flattens to lines. Typically headers are: 
        // Item, SKU | GTIN, Qtd, Un, Preço un, Total
        // Followed by values in some order, often: Produto, SKU, Quantidade, Unidade, Preco, Total
        // Because PDF parsing order can vary, let's use a heuristic: Products are usually long strings.
        let inItemsTable = false;
        let currentItem = {};

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('SKU | GTIN')) {
                inItemsTable = true;
                continue;
            }
            if (inItemsTable && (lines[i].includes('Número de itens') || lines[i].includes('Soma das quantidades') || lines[i] === 'Forma de Pagamento' || lines[i] === 'Número de itens:' || lines[i] === 'Transportadora')) {
                break; // exiting items table
            }

            if (inItemsTable) {
                // Heuristic: If it looks like a quantity (number, comma, 00 e.g 1,00)
                const isQtd = /^\d+,\d{2}$/.test(lines[i]);
                const isCodeStr = /^[A-Z0-9-]{3,15}$/.test(lines[i]) && !lines[i].includes(' R$');

                // If it doesn't match standard numbers, assume it's the product name
                if (!isQtd && lines[i].length > 5 && !lines[i].includes('R$') && isNaN(parseInt(lines[i], 10))) {
                    if (currentItem.produto) {
                        // Already had a product, so push it before starting a new one
                        // Default quantity to 1 if we missed it
                        if (!currentItem.quantidade) currentItem.quantidade = 1;
                        extractedData.itens.push(currentItem);
                        currentItem = {};
                    }
                    currentItem.produto = lines[i];
                }
                else if (isQtd && currentItem.produto && !currentItem.quantidade) {
                    // It's the first number after product name (Quantity)
                    currentItem.quantidade = parseInt(lines[i].split(',')[0], 10) || 1;
                }
                else if (isCodeStr && currentItem.produto && !currentItem.referencia) {
                    currentItem.referencia = lines[i];
                }
            }
        }
        // Push the last item if exists
        if (currentItem.produto) {
            if (!currentItem.quantidade) currentItem.quantidade = 1;
            extractedData.itens.push(currentItem);
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
