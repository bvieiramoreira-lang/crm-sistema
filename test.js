const lines = [
    'Toalha de Banho, Praia Personalizada 210gPP27520,0050,021.000,40',
    'Squeeze de plastico vermelho7910,0010,00100,00',
    'Produto XYZ sem sku2,0015,0030,00',
    'Chaveiro de metal1,0012,5012,50'
];

for (const lineStr of lines) {
    const floatMatches = [...lineStr.matchAll(/(\d+(?:\.\d{3})*,\d{2})(?!\d)/g)];
    if (floatMatches.length >= 2) {
        const totalStr = floatMatches[floatMatches.length - 1][0];
        const precoStr = floatMatches[floatMatches.length - 2][0];

        const total = parseFloat(totalStr.replace(/\./g, '').replace(',', '.'));
        const preco = parseFloat(precoStr.replace(/\./g, '').replace(',', '.'));

        // Calcular a quantidade teórica
        let calcQtd = 1;
        if (preco > 0) {
            calcQtd = Math.round(total / preco);
        }

        // A string antes do preco
        const cutIndex = lineStr.lastIndexOf(precoStr);
        let leftPart = lineStr.substring(0, cutIndex).trim();
        // Remove 'UN', 'PC', etc se tiver
        leftPart = leftPart.replace(/\s+(UN|PC|CX|KG|MT|PR|DZ|M2)$/i, '').trim();

        // Tenta achar a quantidade encostada no final da string leftPart
        let extractedQtd = calcQtd;
        let pNameRef = leftPart;

        // Quantidade no bling é geralmente 'XX,00'
        const suffix1 = calcQtd + ',00';
        const suffix2 = calcQtd + ',0000';

        if (leftPart.endsWith(suffix1)) {
            pNameRef = leftPart.substring(0, leftPart.length - suffix1.length).trim();
            extractedQtd = calcQtd;
        } else if (leftPart.endsWith(suffix2)) {
            pNameRef = leftPart.substring(0, leftPart.length - suffix2.length).trim();
            extractedQtd = calcQtd;
        } else if (floatMatches.length >= 3) {
            // Se nao foi possivel extrair exato, cai pro regex antigo
            const qtdStr = floatMatches[floatMatches.length - 3][0];
            extractedQtd = parseInt(qtdStr.split(',')[0], 10);
            const stopI = lineStr.lastIndexOf(qtdStr);
            pNameRef = lineStr.substring(0, stopI).trim();
            pNameRef = pNameRef.replace(/\s+(UN|PC|CX|KG|MT|PR|DZ|M2)$/i, '').trim();
        }

        let ref = '';
        let prod = pNameRef;

        const refMatchGlued = pNameRef.match(/^(.*?[a-z])([A-Z0-9-]{2,20})$/);
        const refMatchSpaced = pNameRef.match(/^(.*?)\s+([A-Z0-9-]{2,20})$/);

        if (refMatchGlued && /\d/.test(refMatchGlued[2])) {
            prod = refMatchGlued[1].trim();
            ref = refMatchGlued[2];
        } else if (refMatchSpaced && /\d/.test(refMatchSpaced[2])) {
            prod = refMatchSpaced[1].trim();
            ref = refMatchSpaced[2];
        } else if (refMatchGlued && refMatchGlued[2].length <= 5) {
            prod = refMatchGlued[1].trim();
            ref = refMatchGlued[2];
        } else if (refMatchSpaced && refMatchSpaced[2].length <= 3) {
            prod = refMatchSpaced[1].trim();
            ref = refMatchSpaced[2];
        }

        console.log({ prod, ref, qtdNum: extractedQtd, preco: precoStr, total: totalStr });
    }
}
