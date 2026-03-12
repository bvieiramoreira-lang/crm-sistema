const lines = [
    'Toalha de Banho, Praia Personalizada 210gPP27520,0050,021.000,40',
    'Squeeze de plastico vermelho7910,0010,00100,00',
    'Produto XYZ sem sku2,0015,0030,00',
    'Chaveiro de metal1,0012,5012,50',
    'Toalha de banho com zero Qtd,0050,000,00'
];

// O Regex exato estrutural:
// 1. (.*?) -> Tudo antes (Nome + SKU + Integer da Qtd)
// 2. ,(\d{2}|\d{4}) -> Virgula da Qtd e seus decimais (2 ou 4)
// 3. (\d+) -> Integer do Preço (sem pontos pq preco unitario dificilmente passa de 999 sem espaco, mas pode ter ponto. Vamos assumir q n tem ponto, ou se tiver capturar [\d.])
// 4. ,(\d{2}) -> Virgula do Preço e 2 decimais
// 5. ([\d.]*) -> Integer do Total (pode ter ponto)
// 6. ,(\d{2})$ -> Virgula do Total e 2 decimais no fim da string

const structRegex = /^(.*?),(\d{2}|\d{4})([\d.]*?),(\d{2})([\d.]*?),(\d{2})$/;

for (const line of lines) {
    const match = line.match(structRegex);
    if (match) {
        const leftPart = match[1]; // '...PP27520'
        const qtdDec = match[2]; // '00'
        const precoInt = match[3]; // '50'
        const precoDec = match[4]; // '02'
        const totalInt = match[5]; // '1.000'
        const totalDec = match[6]; // '40'

        const totalStr = totalInt + ',' + totalDec;
        const precoStr = precoInt + ',' + precoDec;

        const total = parseFloat(totalStr.replace(/\./g, '').replace(',', '.'));
        const preco = parseFloat(precoStr.replace(/\./g, '').replace(',', '.'));

        let calcQtd = 1;
        if (preco > 0) calcQtd = Math.round(total / preco);

        // Agora leftPart é 'Toalha de Banho... 210gPP27520'
        // A quantidade calculada é 20.
        // leftPart deve terminar com '20'

        let finalQtd = calcQtd;
        let prodRef = leftPart;

        if (leftPart.endsWith(calcQtd.toString())) {
            prodRef = leftPart.substring(0, leftPart.length - calcQtd.toString().length).trim();
        } else {
            // fallback para Regex pra tentar pegar os ultimos numeros
            const qMatch = leftPart.match(/(\d+)$/);
            if (qMatch) {
                finalQtd = parseInt(qMatch[1], 10);
                prodRef = leftPart.substring(0, leftPart.length - qMatch[1].length).trim();
            }
        }

        let finalProduto = prodRef.trim();
        let finalRef = '';

        const refMatchGlued = finalProduto.match(/^(.*?[a-z])([A-Z0-9-]{2,20})$/);
        const refMatchSpaced = finalProduto.match(/^(.*?)\s+([A-Z0-9-]{2,20})$/);

        if (refMatchGlued && /\d/.test(refMatchGlued[2])) {
            finalProduto = refMatchGlued[1].trim();
            finalRef = refMatchGlued[2];
        } else if (refMatchSpaced && /\d/.test(refMatchSpaced[2])) {
            finalProduto = refMatchSpaced[1].trim();
            finalRef = refMatchSpaced[2];
        } else if (refMatchGlued && refMatchGlued[2].length <= 5) {
            finalProduto = refMatchGlued[1].trim();
            finalRef = refMatchGlued[2];
        } else if (refMatchSpaced && refMatchSpaced[2].length <= 3) {
            finalProduto = refMatchSpaced[1].trim();
            finalRef = refMatchSpaced[2];
        }

        console.log({
            Produto: finalProduto,
            Ref: finalRef,
            Qtd: finalQtd,
            Preco: precoStr,
            Total: totalStr
        });
    } else {
        console.log('NO MATCH:', line);
    }
}
