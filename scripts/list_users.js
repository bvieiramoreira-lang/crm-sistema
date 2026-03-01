const db = require('../database');

db.all('SELECT id, nome, email, perfil, setor, setor_impressao FROM usuarios', [], (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(JSON.stringify(rows, null, 2));
});
