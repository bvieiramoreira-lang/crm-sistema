const db = require('./server/database');
const bcrypt = require('bcrypt');

const SECTORS = [
    'SILK_CILINDRICA',
    'SILK_PLANO',
    'TAMPOGRAFIA',
    'IMPRESSAO_LASER',
    'IMPRESSAO_DIGITAL',
    'ESTAMPARIA'
];

const DEFAULT_PASS = '123';
const HASH = bcrypt.hashSync(DEFAULT_PASS, 10);

console.log('[SETUP] Criando usuários de impressão...');

db.serialize(() => {
    const stmt = db.prepare("INSERT OR REPLACE INTO usuarios (nome, username, senha, perfil, setor_impressao) VALUES (?, ?, ?, ?, ?)");

    SECTORS.forEach(sector => {
        // Username = Sector Name (UPPERCASE)
        // Name = Readable Format
        const name = sector.replace(/_/g, ' ');
        const username = sector;

        stmt.run(name, username, HASH, 'impressao', sector, (err) => {
            if (err) console.error(`Erro ao criar ${username}:`, err.message);
            else console.log(`[OK] Usuário ${username} criado/atualizado.`);
        });
    });

    stmt.finalize();

    // List check
    console.log('\n--- VERIFICANDO USUÁRIOS DE IMPRESSÃO ---');
    db.all("SELECT username, setor_impressao FROM usuarios WHERE perfil='impressao'", [], (err, rows) => {
        if (err) console.error(err);
        else {
            rows.forEach(r => console.log(`USER: ${r.username} -> SETOR: ${r.setor_impressao}`));
        }
    });
});

setTimeout(() => {
    process.exit(0);
}, 2000);
