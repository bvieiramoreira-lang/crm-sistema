const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'sp_system.db');
const db = new sqlite3.Database(dbPath);

const usuarios = [
    { nome: 'Financeiro User', user: 'financeiro', pass: '123', perfil: 'financeiro' },
    { nome: 'Arte User', user: 'arte', pass: '123', perfil: 'arte' },
    { nome: 'Separador User', user: 'separacao', pass: '123', perfil: 'separacao' },
    { nome: 'Desembale User', user: 'desembale', pass: '123', perfil: 'desembale' },
    { nome: 'Silk Plano User', user: 'silk_plano', pass: '123', perfil: 'impressao', setor: 'SILK_PLANO' },
    { nome: 'Silk Cilindrico User', user: 'silk_cilindrica', pass: '123', perfil: 'impressao', setor: 'SILK_CILINDRICA' },
    { nome: 'Embalador User', user: 'embale', pass: '123', perfil: 'embale' },
    { nome: 'Logistica User', user: 'logistica', pass: '123', perfil: 'logistica' }
];

db.serialize(() => {
    usuarios.forEach(u => {
        const hash = bcrypt.hashSync(u.pass, 10);
        db.run(`INSERT OR IGNORE INTO usuarios (nome, username, senha, perfil, setor_impressao) VALUES (?, ?, ?, ?, ?)`,
            [u.nome, u.user, hash, u.perfil, u.setor || null],
            (err) => {
                if (err) console.error(err);
                else console.log(`Usuário criado: ${u.user} / ${u.pass}`);
            }
        );
    });
});
