// ==========================================
// CONTROLE DE AUTENTICAÇÃO E PERFIS
// Almoxarifado 2.0 - Santuário Nacional
// ==========================================

const SUPABASE_URL = 'https://tocmqlsicxuxfkiptgaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvY21xbHNpY3h1eGZraXB0Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNTIyODEsImV4cCI6MjA5OTYyODI4MX0.B-UKh4qMQG02guuJhIlI-ZB0d4OjlByFyfOoGISiqMY';

const _supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Alterna abas na tela de login
function trocarModoLogin(modo) {
    const tabAdmin = document.getElementById('tabAdmin');
    const tabVis = document.getElementById('tabVisualizacao');
    const areaAdmin = document.getElementById('areaLoginAdmin');
    const areaVis = document.getElementById('areaLoginVisualizacao');
    const erroMsg = document.getElementById('erroMsg');

    if (erroMsg) erroMsg.style.display = 'none';

    if (modo === 'admin') {
        if (tabAdmin) tabAdmin.classList.add('active');
        if (tabVis) tabVis.classList.remove('active');
        if (areaAdmin) areaAdmin.style.display = 'block';
        if (areaVis) areaVis.style.display = 'none';
        const elSenha = document.getElementById('senhaAdmin');
        if (elSenha) elSenha.focus();
    } else {
        if (tabVis) tabVis.classList.add('active');
        if (tabAdmin) tabAdmin.classList.remove('active');
        if (areaAdmin) areaAdmin.style.display = 'none';
        if (areaVis) areaVis.style.display = 'block';
        const elSenhaVis = document.getElementById('senhaVisitante');
        if (elSenhaVis) elSenhaVis.focus();
    }
    if (window.lucide) lucide.createIcons();
}

// 1. Login de Administrador (Edição Total - E-mail: joaofura1@gmail.com | Senha: Jo980520@)
async function fazerLoginAdmin() {
    const usuario = (document.getElementById('usuarioAdmin')?.value || '').trim();
    const senha = document.getElementById('senhaAdmin')?.value || '';
    const erroMsg = document.getElementById('erroMsg');
    const btnSubmit = document.getElementById('btnSubmitAdmin');

    if (erroMsg) erroMsg.style.display = 'none';

    const usuarioLower = usuario.toLowerCase();

    // Validação estrita do Administrador principal e legados
    const isAdmValido = 
        (usuarioLower === 'joaofura1@gmail.com' && senha === 'Jo980520@') ||
        (usuarioLower === 'admin' && (senha === 'Jo980520@' || senha === '123')) ||
        (usuarioLower === 'manutencao' && (senha === '123' || senha === 'Jo980520@'));

    if (isAdmValido) {
        const nome = usuarioLower === 'joaofura1@gmail.com' ? 'João Vitor (ADM)' : 'Administrador';
        sessionStorage.setItem('usuario_perfil', 'admin');
        sessionStorage.setItem('usuario_nome', nome);
        sessionStorage.setItem('usuario_pode_editar', 'true');
        localStorage.setItem('usuario_perfil', 'admin');
        localStorage.setItem('usuario_nome', nome);
        localStorage.setItem('usuario_pode_editar', 'true');
        
        window.location.href = 'index.html';
        return;
    }

    // Tenta autenticar no Supabase Auth caso seja um e-mail cadastrado
    if (_supabase && usuario.includes('@')) {
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `<i data-lucide="loader" style="width:16px; height:16px;"></i> Autenticando...`;
            if (window.lucide) lucide.createIcons();
        }

        try {
            const { data, error } = await _supabase.auth.signInWithPassword({
                email: usuario,
                password: senha
            });

            if (!error && data?.user) {
                sessionStorage.setItem('usuario_perfil', 'admin');
                sessionStorage.setItem('usuario_nome', data.user.email);
                sessionStorage.setItem('usuario_pode_editar', 'true');
                localStorage.setItem('usuario_perfil', 'admin');
                localStorage.setItem('usuario_nome', data.user.email);
                localStorage.setItem('usuario_pode_editar', 'true');
                window.location.href = 'index.html';
                return;
            }
        } catch (e) {}
    }

    if (erroMsg) {
        erroMsg.textContent = "E-mail ou senha incorretos para o perfil de Administrador!";
        erroMsg.style.display = 'block';
    }

    if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i data-lucide="shield-check" style="width: 18px; height: 18px;"></i> Entrar como Administrador`;
        if (window.lucide) lucide.createIcons();
    }
}

// 2. Login de Visitante / Visualização (Modo Somente Leitura - Usuário: Visitante | Senha: 123)
function fazerLoginVisualizador() {
    const usuario = (document.getElementById('usuarioVisitante')?.value || 'Visitante').trim();
    const senha = document.getElementById('senhaVisitante')?.value || '123';
    const erroMsg = document.getElementById('erroMsg');

    if (erroMsg) erroMsg.style.display = 'none';

    // Se preencheu o formulário com a senha, valida se é '123'
    if (senha !== '123') {
        if (erroMsg) {
            erroMsg.textContent = "Senha incorreta para o login de Visitante! (Senha correta: 123)";
            erroMsg.style.display = 'block';
        }
        return;
    }

    const nomeVis = usuario.toLowerCase() === 'visitante' ? 'Visitante (Leitura)' : `${usuario} (Leitura)`;
    sessionStorage.setItem('usuario_perfil', 'visualizacao');
    sessionStorage.setItem('usuario_nome', nomeVis);
    sessionStorage.setItem('usuario_pode_editar', 'false');
    localStorage.setItem('usuario_perfil', 'visualizacao');
    localStorage.setItem('usuario_nome', nomeVis);
    localStorage.setItem('usuario_pode_editar', 'false');
    
    window.location.href = 'index.html';
}

// Logout geral
function fazerLogout() {
    sessionStorage.clear();
    localStorage.removeItem('usuario_perfil');
    localStorage.removeItem('usuario_nome');
    localStorage.removeItem('usuario_pode_editar');
    window.location.href = 'login183.html';
}