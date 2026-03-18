const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('/app/data/sp_system.db');
const hash = bcrypt.hashSync('desembale123', 10);

db.run("INSERT OR IGNORE INTO usuarios (nome, username, senha, perfil, setor_impressao) VALUES (?, ?, ?, ?, ?)",
    ['Desembale', 'DESEMBALE', hash, 'desembale', null],
    (err) => {
        if (err) console.error(err);
        else console.log('User created');

        db.close();
    }
);
