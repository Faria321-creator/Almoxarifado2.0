// ==========================================
// CONTROLE GLOBAL DE AUTENTICAÇÃO, PERMISSÕES E RESPONSIVIDADE
// Almoxarifado 2.0 - Santuário Nacional
// ==========================================

(function() {
  const path = window.location.pathname.split('/').pop().toLowerCase();
  const isLoginPage = path === 'login183.html' || path === 'login.html';

  const perfil = sessionStorage.getItem('usuario_perfil');
  const podeEditar = sessionStorage.getItem('usuario_pode_editar');

  // 1. Redirecionamento se não estiver autenticado
  if (!perfil && !isLoginPage) {
    window.location.href = 'login183.html';
    return;
  }

  // Se já estiver logado e tentar abrir a página de login, redireciona para o index
  if (perfil && isLoginPage) {
    window.location.href = 'index.html';
    return;
  }

  // 2. Aplicação de permissões e controle responsivo no DOM
  document.addEventListener('DOMContentLoaded', () => {
    // Injeta CSS responsivo se não existir
    if (!document.getElementById('responsiveCssLink')) {
      const cssLink = document.createElement('link');
      cssLink.id = 'responsiveCssLink';
      cssLink.rel = 'stylesheet';
      cssLink.href = 'css/responsive.css';
      document.head.appendChild(cssLink);
    }

    // Configura Topbar e Menu Lateral no Celular
    if (!isLoginPage) {
      configurarMenuMobile();
    }

    // Atualiza nome do usuário logado na barra lateral
    const elNome = document.getElementById('responsavelNome');
    if (elNome) {
      const nomeSalvo = sessionStorage.getItem('usuario_nome') || (podeEditar === 'true' ? 'Administrador' : 'Visitante (Leitura)');
      elNome.textContent = nomeSalvo;
    }

    // Se o perfil for de visualização (Visitante), aplica restrições de Somente Leitura
    if (podeEditar === 'false') {
      aplicarModoLeitura();
    }
  });
})();

function configurarMenuMobile() {
  const sidebar = document.querySelector('aside.sidebar');
  if (!sidebar) return;

  // Cria Barra de Topo do Celular
  if (!document.getElementById('mobileTopbar')) {
    const topbar = document.createElement('div');
    topbar.id = 'mobileTopbar';
    topbar.className = 'mobile-topbar';
    topbar.innerHTML = `
      <div class="mobile-brand">
        <i data-lucide="box" style="width: 20px; height: 20px;"></i>
        <span>Almoxarifado 2.0</span>
      </div>
      <button class="mobile-menu-btn" id="btnToggleMobileMenu">
        <i data-lucide="menu" style="width: 18px; height: 18px;"></i> Menu
      </button>
    `;
    document.body.insertBefore(topbar, document.body.firstChild);

    // Cria Overlay de Fundo
    const overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // Eventos do Menu Celular
    const btnToggle = document.getElementById('btnToggleMobileMenu');
    btnToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });

    // Fecha o menu ao clicar em qualquer item da barra lateral no celular
    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    });

    if (window.lucide) lucide.createIcons();
  }
}

function aplicarModoLeitura() {
  document.body.classList.add('modo-leitura');

  // Adiciona Banner Superior Informativo de Modo Leitura
  const mainContent = document.querySelector('.main-content');
  if (mainContent && !document.getElementById('bannerModoLeitura')) {
    const banner = document.createElement('div');
    banner.id = 'bannerModoLeitura';
    banner.style.cssText = `
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    `;
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i data-lucide="eye" style="width: 18px; height: 18px; color: #2563eb;"></i>
        <span><b>Modo Somente Leitura (Visitante):</b> Você tem acesso para visualizar todos os dados, relatórios e estatísticas. Criação, edição e exclusão estão bloqueadas.</span>
      </div>
      <span style="background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Apenas Leitura</span>
    `;
    mainContent.insertBefore(banner, mainContent.firstChild);
    if (window.lucide) lucide.createIcons();
  }

  // Estilo CSS Global para Ocultar/Desabilitar Elementos de Edição
  const style = document.createElement('style');
  style.id = 'styleModoLeitura';
  style.innerHTML = `
    /* Oculta botões de cadastro, criação, edição e exclusão no Modo Leitura */
    body.modo-leitura .btn-submit,
    body.modo-leitura #btnNovoCadastro,
    body.modo-leitura .btn-primary:not(.btn-table-action):not(#btnFiltroAtrasados):not(#btnFiltroPendentes):not(#btnFiltroVencendo):not(#btnFiltroTodos),
    body.modo-leitura button[type="submit"]:not(#btnSubmitAdmin):not(#btnSubmitManutencao),
    body.modo-leitura .btn-excluir,
    body.modo-leitura .btn-danger,
    body.modo-leitura .action-btn-delete,
    body.modo-leitura .action-btn-edit,
    body.modo-leitura .btn-edit,
    body.modo-leitura .btn-delete,
    body.modo-leitura [onclick*="abrirModal"],
    body.modo-leitura [onclick*="excluir"],
    body.modo-leitura [onclick*="deletar"],
    body.modo-leitura [onclick*="editar"] {
      display: none !important;
    }

    /* Trava formulários caso apareçam */
    body.modo-leitura form input:not(#inpBuscaTabela):not(#buscaRapida),
    body.modo-leitura form select,
    body.modo-leitura form textarea {
      pointer-events: none !important;
      opacity: 0.7 !important;
      background-color: #f1f5f9 !important;
    }
  `;
  document.head.appendChild(style);

  // Previne envios acidentais de formulários
  document.addEventListener('submit', (e) => {
    if (sessionStorage.getItem('usuario_pode_editar') === 'false' && e.target.id !== 'formLoginAdmin') {
      e.preventDefault();
      alert('⚠️ Modo Somente Leitura: Você está conectado como Visitante. Apenas o Administrador (joaofura1@gmail.com) pode salvar alterações.');
      return false;
    }
  }, true);
}

// Logout Geral
function fazerLogout() {
  sessionStorage.clear();
  window.location.href = 'login183.html';
}
