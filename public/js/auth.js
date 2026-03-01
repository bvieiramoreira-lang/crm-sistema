const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Salvar dados do usuário
                localStorage.setItem('user', JSON.stringify(data));
                window.location.href = 'dashboard.html';
            } else {
                errorMsg.textContent = data.error || 'Erro ao fazer login';
                errorMsg.style.display = 'block';
            }
        } catch (error) {
            errorMsg.textContent = 'Erro de conexão com o servidor';
            errorMsg.style.display = 'block';
        }
    });
}
