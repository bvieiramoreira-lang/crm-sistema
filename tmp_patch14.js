const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

const targetStart = "const isRunning = item.status_atual === 'EM_PRODUCAO';";

let index = code.indexOf(targetStart);
index = code.indexOf(targetStart, index + 1); // Get second one

if (index > -1) {
    let endIndex = code.indexOf(`} else {`, index) + 8;
    
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
                        actionBtn = \`\${timerHtml}<button class="btn" style="background: var(--primary); padding: 0.35rem 0.5rem; margin-bottom:0.25rem;" onclick="resumeProducao(\${item.id})"><i class="ph-play"></i> Retomar Produção</button>\`;
                    } else if (pauseRequested) {
                        actionBtn = \`\${timerHtml}
                        <button class="btn" style="background: var(--danger); opacity: 0.5; filter: grayscale(1); margin-bottom: 0.25rem; pointer-events: none;"><i class="ph-check"></i> Finalizar Produção</button><br>
                        <span style="font-size: 0.8rem; color: #b45309; font-weight: bold; display: inline-flex; align-items: center; gap: 0.3rem; margin-bottom:0.25rem;"><i class="ph-clock-countdown"></i> Solicitação enviada</span>\`;
                    } else {
                        actionBtn = \`\${timerHtml}
                        <button class="btn" style="background: var(--warning); color: #78350f; margin-bottom: 0.3rem;" onclick="registrarEvento(\${item.id}, '\${setor}', 'FIM', \${item.quantidade})">Finalizar Produção</button><br>
                        <button class="btn" style="background: #fcd34d; color: #854d0e; padding: 0.2rem 0.5rem; font-size: 0.8rem; width: auto; margin-bottom:0.25rem;" onclick="solicitarPausa(\${item.id})"><i class="ph-pause"></i> Solicitar Pausa</button>\`;
                    }
                } else {`;
                
    code = code.substring(0, index) + newBlock + code.substring(endIndex);
    fs.writeFileSync('public/js/app.js', code);
    console.log('PATCH APPLIED EXACTLY!');
} else {
    console.log('Could not find second block!');
}
