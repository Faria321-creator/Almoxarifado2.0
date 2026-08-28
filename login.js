// Credenciais do Supabase
const SUPABASE_URL = 'https://tocmqlsicxuxfkiptgaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvY21xbHNpY3h1eGZraXB0Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNTIyODEsImV4cCI6MjA5OTYyODI4MX0.B-UKh4qMQG02guuJhIlI-ZB0d4OjlByFyfOoGISiqMY';

const _supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Evento de Login
document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const erroMsg = document.getElementById('erroMsg');
    const btnSubmit = document.getElementById('btnSubmitLogin');

    if (erroMsg) {
        erroMsg.style.display = 'none';
    }

    if (!_supabase) {
        if (erroMsg) {
            erroMsg.textContent = "Erro: Biblioteca Supabase não inicializada.";
            erroMsg.style.display = 'block';
        }
        return;
    }

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<i data-lucide="loader" style="width:18px; height:18px; animation: spin 1s linear infinite;"></i> Autenticando...`;
        if (window.lucide) lucide.createIcons();
    }

    try {
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) {
            console.error("Erro no login:", error.message);
            if (erroMsg) {
                erroMsg.textContent = "Falha no acesso: " + error.message;
                erroMsg.style.display = 'block';
            }
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<i data-lucide="log-in" style="width:18px; height:18px;"></i> Entrar com Supabase`;
                if (window.lucide) lucide.createIcons();
            }
        } else {
            console.log("Login com sucesso!", data);
            window.location.href = 'index.html';
        }
    } catch (err) {
        if (erroMsg) {
            erroMsg.textContent = "Erro inesperado: " + err.message;
            erroMsg.style.display = 'block';
        }
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<i data-lucide="log-in" style="width:18px; height:18px;"></i> Entrar com Supabase`;
            if (window.lucide) lucide.createIcons();
        }
    }
});