const { exec } = require('child_process');

exec('netstat -ano | findstr :3000', (err, stdout, stderr) => {
    if (err) {
        console.log('No process found on port 3000');
        return;
    }

    const lines = stdout.trim().split('\n');
    if (lines.length > 0) {
        const parts = lines[0].trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        console.log(`Found PID: ${pid}. Killing...`);

        exec(`taskkill /PID ${pid} /F`, (kErr, kOut, kStderr) => {
            if (kErr) console.error('Failed to kill:', kErr);
            else console.log('Process killed successfully.');
        });
    }
});
