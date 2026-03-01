function validateResponsible(itemId) {
    const el = document.getElementById(`resp_select_${itemId}`);
    if (!el) {
        // Fallback: If element is not in DOM (e.g. hidden view), we might block safety or warn.
        // User wants STRICT BLOCK.
        // If we can't find the dropdown, we assume we can't validate, so we BLOCK.
        alert('⚠️ VALIDATION ERROR: Campo de responsável não encontrado na tela. Recarregue a página (F5).');
        return false;
    }
    if (!el.value || el.value === '') {
        alert('INDIQUE O NOME DO RESPONSÁVEL PARA PASSAR AO PRÓXIMO SETOR.');
        // Highlight logic could be added here
        el.style.border = '2px solid red';
        setTimeout(() => el.style.border = '', 3000);
        return false;
    }
    return true;
}
