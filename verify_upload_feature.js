const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const dbPath = './sp_system.db';
const appJsPath = './public/js/app.js';
const styleCssPath = './public/css/style.css';

// 1. Check DB Columns
const db = new sqlite3.Database(dbPath);
db.all("PRAGMA table_info(itens_pedido)", (err, rows) => {
    if (err) {
        console.error("DB Check Failed:", err);
    } else {
        console.log("Columns found in itens_pedido:", rows.map(r => r.name));
        const hasLayoutPath = rows.some(r => r.name === 'layout_path');
        const hasLayoutType = rows.some(r => r.name === 'layout_type');
        if (hasLayoutPath && hasLayoutType) {
            console.log("SUCCESS: DB columns 'layout_path' and 'layout_type' found.");
        } else {
            console.error("FAILURE: DB columns missing.");
        }
    }
});

// 2. Check Frontend Logic
try {
    const appJs = fs.readFileSync(appJsPath, 'utf8');
    if (appJs.includes('function uploadLayout') && appJs.includes('function viewLayout')) {
        console.log("SUCCESS: Frontend functions found.");
    } else {
        console.error("FAILURE: Frontend functions missing.");
    }
} catch (e) { console.error("Frontend check failed:", e); }

// 3. Check CSS
try {
    const css = fs.readFileSync(styleCssPath, 'utf8');
    if (css.includes('.lightbox') && css.includes('.layout-btn')) {
        console.log("SUCCESS: CSS styles found.");
    } else {
        console.error("FAILURE: CSS styles missing.");
    }
} catch (e) { console.error("CSS check failed:", e); }
