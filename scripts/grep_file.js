
const fs = require('fs');
const filename = process.argv[2];
const searchTerm = process.argv[3];

try {
    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
            console.log(`${i + 1}: ${line.trim()}`);
        }
    });
} catch (e) {
    console.error(e);
}
