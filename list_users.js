const db = require('./server/database');

console.log('Listando Usúarios cadastrados...');
console.log('------------------------------------------------');

db.all("SELECT id, nome, username, perfil, setor_impressao FROM usuarios", [], (err, rows) => {
    if (err) {
        console.error("Erro:", err);
        return;
    }
    rows.forEach(row => {
        let extra = row.perfil === 'impressao' ? `(Setor: ${row.setor_impressao})` : '';
        console.log(`[${row.id}] Nome: ${row.nome} | Login: ${row.username} | Perfil: ${row.perfil} ${extra}`);
    });
    console.log('------------------------------------------------');
    console.log('NOTA: Senhas são criptografadas e não podem ser visualizadas.');
    console.log('Senha padrão (se não alterada): admin123');
});

setTimeout(() => {
    process.exit(0);
}, 2000);
