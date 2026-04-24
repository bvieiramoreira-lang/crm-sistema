const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

// 1. Add Solicitações de Pausa to Sidebar (only for admin)
const adminMenuStr = `<ul class="sidebar-menu">`;
const adminMenuReplacement = `<ul class="sidebar-menu">
        <li style="margin-top: 1rem; margin-bottom: 0.5rem; padding: 0 1.5rem; font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: bold;">ADMINISTRAÇÃO</li>
        <li id="menu-pausa"><a href="#" onclick="showPausas(event)"><i class="ph-pause-circle"></i> Aprovação de Pausas</a></li>`;
if (code.includes('cargo === "ADMIN"')) {
    // Actually the sidebar is static HTML in index.html mostly, wait! Let's check where sidebar gets generated.
    // Dashboard sidebar is rendered server-side or in dashboard.html?
    // It's in dashboard.html
}

// Replace the UI block for EM_PRODUCAO
const targetStart = "const isRunning = item.status_atual === 'EM_PRODUCAO';";
const targetEnd = `actionBtn = \`\${timerHtml}<button class="btn" style="background: var(--warning); color: #78350f" onclick="registrarEvento(\${item.id}, '\${setor}', 'FIM', \${item.quantidade})">Finalizar Produção</button>\`;
                } else {`;

const startIndex = code.indexOf(targetStart);
const endIndex = code.indexOf(targetEnd) + targetEnd.length;

if (startIndex > -1 && endIndex > -1) {
    const originalBlock = code.substring(startIndex, endIndex);

    const newBlock = `const isRunning = item.status_atual === 'EM_PRODUCAO';
            const isPaused = item.is_pausado_producao === 1 || item.is_pausado_producao === true;
            const pauseRequested = item.pausa_solicitada === 1 || item.pausa_solicitada === true;

            let actionBtn = '';
            if (!isReadOnly) {
                // Complex Logic for Start/Check for Digital
                if (isRunning || isPaused) {
                    // TIMER BLOCK
                    let timerHtml = '';
                    if (item.decorrido_segundos !== null && item.decorrido_segundos !== undefined) {
                        const isTimerRunning = !isPaused;
                        const bgColor = isPaused ? '#e0f2fe' : '#e2e8f0';
                        const borderColor = isPaused ? '#7dd3fc' : '#cbd5e1';
                        const textColor = isPaused ? '#0284c7' : '#1e293b';
                        const startAttr = isTimerRunning ? \`data-client-start="\${Date.now()}"\` : '';

                        timerHtml = \`
                            <div class="production-timer" data-elapsed-initial="\${item.decorrido_segundos}" \${startAttr}
                                 style="font-family: monospace; font-size: 1.1rem; font-weight: bold; color: \${textColor}; 
                                        background: \${bgColor}; padding: 0.25rem 0.5rem; border-radius: 4px; 
                                        margin-bottom: 0.5rem; display: inline-block; border: 1px solid \${borderColor};">
                                <i class="ph-clock"></i> <span class="timer-display">00:00:00</span>
                            </div><br>
                        \`;
                    }

                    if (isPaused) {
                        actionBtn = \`\${timerHtml}<button class="btn" style="background: var(--primary); padding: 0.35rem 0.5rem;" onclick="resumeProducao(\${item.id})"><i class="ph-play"></i> Retomar Produção</button>\`;
                    } else if (pauseRequested) {
                        actionBtn = \`\${timerHtml}
                        <button class="btn" style="background: var(--danger); opacity: 0.5; filter: grayscale(1); margin-bottom: 0.25rem; pointer-events: none;"><i class="ph-check"></i> Finalizar Produção</button><br>
                        <span style="font-size: 0.8rem; color: #b45309; font-weight: bold; display: flex; align-items: center; gap: 0.3rem;"><i class="ph-clock-countdown"></i> Pausa Solicitada... aguardando ADM</span>\`;
                    } else {
                        actionBtn = \`\${timerHtml}
                        <button class="btn" style="background: var(--warning); color: #78350f; margin-bottom: 0.3rem;" onclick="registrarEvento(\${item.id}, '\${setor}', 'FIM', \${item.quantidade})">Finalizar Produção</button><br>
                        <button class="btn" style="background: #fcd34d; color: #854d0e; padding: 0.2rem 0.5rem; font-size: 0.8rem; width: auto;" onclick="solicitarPausa(\${item.id})"><i class="ph-pause"></i> Solicitar Pausa</button>\`;
                    }
                } else {`;

    code = code.substring(0, startIndex) + newBlock + code.substring(endIndex);
    fs.writeFileSync('public/js/app.js', code);
    console.log('UI Patched!');
} else {
    console.log('Could not find target block string.');
}
