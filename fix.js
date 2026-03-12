const fs = require('fs');
let code = fs.readFileSync('server/routes/orders_parser.js', 'utf8');

const startMarker = '// O padrão final sempre tem 3 ou 4 blocos de números com vírgula: Qtd, (Unidade string livre), Preço Unitário, Total';
const endMarker = 'res.json(extractedData);';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex > -1 && endIndex > -1) {
    const newBlock = `// O padrão final sempre tem 3 ou 4 blocos de números com vírgula: Qtd, (Unidade string livre), Preço Unitário, Total
                let lineStr = lines[i];

                // Regex estrutural das ultimas 3 virgulas numéricas
                // 1. (.*?) -> Tudo antes (Nome + SKU + Integer da Qtd)
                // 2. ,(\\d{2}|\\d{4}) -> Virgula da Qtd e seus decimais (2 ou 4)
                // 3. ([\\d.]*?) -> Integer do Preço
                // 4. ,(\\d{2}) -> Virgula do Preço e 2 decimais
                // 5. ([\\d.]*?) -> Integer do Total
                // 6. ,(\\d{2})$ -> Virgula do Total e 2 decimais no fim da string
                const structRegex = /^(.*?),(\\d{2}|\\d{4})([\\d.]*?),(\\d{2})([\\d.]*?),(\\d{2})$/;
                const match = lineStr.match(structRegex);

                let rawProduto = lineStr;
                let rawReferencia = '';
                let rawQuantidade = 1;

                if (match) {
                    const leftPart = match[1];
                    const precoInt = match[3];
                    const precoDec = match[4];
                    const totalInt = match[5];
                    const totalDec = match[6];

                    const totalStr = totalInt + ',' + totalDec;
                    const precoStr = precoInt + ',' + precoDec;

                    const total = parseFloat(totalStr.replace(/\\./g, '').replace(',', '.'));
                    const preco = parseFloat(precoStr.replace(/\\./g, '').replace(',', '.'));

                    let calcQtd = 1;
                    if (preco > 0) calcQtd = Math.round(total / preco);

                    let finalQtd = calcQtd;
                    let pNameRef = leftPart;

                    pNameRef = pNameRef.replace(/\\s+(UN|PC|CX|KG|MT|PR|DZ|M2)$/i, '').trim();

                    if (pNameRef.endsWith(calcQtd.toString())) {
                        pNameRef = pNameRef.substring(0, pNameRef.length - calcQtd.toString().length).trim();
                    } else {
                        const qMatch = pNameRef.match(/(\\d+)$/);
                        if (qMatch) {
                            finalQtd = parseInt(qMatch[1], 10);
                            pNameRef = pNameRef.substring(0, pNameRef.length - qMatch[1].length).trim();
                        }
                    }
                    rawQuantidade = finalQtd;

                    const refMatchGlued = pNameRef.match(/^(.*?[a-z])([A-Z0-9-]{2,20})$/);
                    const refMatchSpaced = pNameRef.match(/^(.*?)\\s+([A-Z0-9-]{2,20})$/);

                    if (refMatchGlued && /\\d/.test(refMatchGlued[2])) {
                        rawProduto = refMatchGlued[1].trim();
                        rawReferencia = refMatchGlued[2];
                    } else if (refMatchSpaced && /\\d/.test(refMatchSpaced[2])) {
                        rawProduto = refMatchSpaced[1].trim();
                        rawReferencia = refMatchSpaced[2];
                    } else if (refMatchGlued && refMatchGlued[2].length <= 5) {
                        rawProduto = refMatchGlued[1].trim();
                        rawReferencia = refMatchGlued[2];
                    } else if (refMatchSpaced && refMatchSpaced[2].length <= 3) {
                        rawProduto = refMatchSpaced[1].trim();
                        rawReferencia = refMatchSpaced[2];
                    } else {
                        rawProduto = pNameRef;
                    }
                    
                    extractedData.itens.push({
                        produto: rawProduto,
                        referencia: rawReferencia,
                        quantidade: isNaN(rawQuantidade) ? 1 : rawQuantidade
                    });
                } else {
                    if (lineStr.length > 3 && !lineStr.startsWith('Total')) {
                        extractedData.itens.push({
                            produto: lineStr.substring(0, 50),
                            referencia: '',
                            quantidade: 1
                        });
                    }
                }
            }
        }

        `;
    const finalCode = code.substring(0, startIndex) + newBlock + code.substring(endIndex);
    fs.writeFileSync('server/routes/orders_parser.js', finalCode, 'utf8');
    console.log('REPLACED COM SUCESSO!');
} else {
    console.log('NAO ACHOU OS MARKERS', startIndex, endIndex);
}
