
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

console.log("Starting Migration: User Assignments & Collaborators...");

db.serialize(() => {
    // Helper function to add column safely
    const addColumn = (table, col, type) => {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, (err) => {
            if (err) {
                if (err.message.includes("duplicate column name")) {
                    console.log(`[INFO] Column ${col} already exists in ${table}.`);
                } else {
                    console.error(`[ERROR] adding ${col} to ${table}:`, err.message);
                }
            } else {
                console.log(`[SUCCESS] Added column ${col} to ${table}.`);
            }
        });
    };

    // 1. Update 'usuarios' table
    addColumn('usuarios', 'ativo', 'INTEGER DEFAULT 1');
    addColumn('usuarios', 'setores_secundarios', 'TEXT');

    // 2. Update 'itens_pedido' table for Assignments
    const sectors = ['arte', 'separacao', 'desembale', 'impressao', 'embale', 'logistica'];
    sectors.forEach(sector => {
        addColumn('itens_pedido', `responsavel_${sector}`, 'TEXT');
    });

});

db.close((err) => {
    if (err) console.error(err.message);
    else console.log("Migration finished.");
});
