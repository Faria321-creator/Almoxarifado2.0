// ==========================================================================
// SINCRONIZAÇÃO EM TEMPO REAL VIA SUPABASE STORAGE (PC E CELULAR)
// Almoxarifado 2.0 - Santuário Nacional de Aparecida
// ==========================================================================

const SYNC_SUPABASE_URL = 'https://tocmqlsicxuxfkiptgaj.supabase.co';
const SYNC_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvY21xbHNpY3h1eGZraXB0Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNTIyODEsImV4cCI6MjA5OTYyODI4MX0.B-UKh4qMQG02guuJhIlI-ZB0d4OjlByFyfOoGISiqMY';
const SYNC_STORAGE_PATH = 'fotos/supabase_app_db_v3.json';

// Módulos integrados ao sistema
const SYNC_MODULE_KEYS = [
  'db_agenda',
  'db_historico_operacao',
  'db_historico_notebooks',
  'db_tvs_circulacao',
  'db_tvs_estoque',
  'db_tvs_novas',
  'manutencao_db',
  'db_material_estudo'
];

const EXCEL_FILE_MAP = {
  'db_historico_operacao': 'historico_operacao.xlsx',
  'db_historico_notebooks': 'historico_notebooks.xlsx',
  'db_tvs_circulacao': 'tvs_em_circulação.xlsx',
  'db_tvs_estoque': 'tvs_em_estoque.xlsx',
  'db_tvs_novas': 'tvs_novas.xlsx'
};

const DEFAULT_AGENDA_DATA = [
  { data: '2026-08-31', nome: 'Patrimoniar Caixas de Som Novas (Porto Itaguaçu - Terceira)', cat: 'Patrimônio', status: 'EM ANDAMENTO' },
  { data: '2026-08-26', nome: 'Separar Material para Montagem de Iluminação', cat: 'Evento', status: 'CONCLUÍDO' },
  { data: '2026-08-27', nome: 'Separar Material para Jantar no Convento', cat: 'Evento', status: 'CONCLUÍDO' },
  { data: '2026-08-29', nome: 'Separar Material para Morro do Cruzeiro', cat: 'Evento', status: 'EM ANDAMENTO' },
  { data: '2026-08-29', nome: 'Separar Material para Tribuna Sul - Rosário', cat: 'Evento', status: 'EM ANDAMENTO' },
  { data: '2026-09-04', nome: 'Fim dos Testes e Verificação - Inauguração Fachada Oeste', cat: 'Gargalo', status: 'EM ANDAMENTO' },
  { data: '2026-09-10', nome: 'Entrega de Materiais p/ Fachada Oeste (Ensaio Geral dia 12)', cat: 'Evento', status: 'EM ANDAMENTO' },
  { data: '2026-10-01', nome: 'Início Programação Novena de Nossa Sra. (Carréata, Orquestra)', cat: 'Evento', status: 'EM ANDAMENTO' },
  { data: '2026-09-30', nome: 'Inventário Geral do Almoxarifado + Patrimônio Acumulado', cat: 'Inventário', status: 'EM ANDAMENTO' },
  { data: '2026-08-28', nome: 'Pegar JBL no 8º andar para usar final de semana', cat: 'Montagem', status: 'EM ANDAMENTO' }
];

const DEFAULT_MANUTENCAO_DATA = [
  { id: 1, equip: "M7 CL 48-ES / (01) Audio e Video", desc: "Console", serie: "X", qtd: 1, cidade: "Campinas", assist: "Analisea", contato: "(19) 99203-9966", cnpj: "23.960.659/0001-95", valor: 42000.00, entregue: false },
  { id: 2, equip: "M7 CL 48-ES / (02) TV Aparecida", desc: "Console", serie: "X", qtd: 1, cidade: "Campinas", assist: "Analisea", contato: "(19) 99203-9966", cnpj: "23.960.659/0001-95", valor: 42000.00, entregue: false },
  { id: 3, equip: "Stege Yamaha", desc: "Interface", serie: "SB168-ES / Nº01009", qtd: 1, cidade: "Campinas", assist: "Analisea", contato: "(19) 99203-9966", cnpj: "23.960.659/0001-95", valor: 4000.00, entregue: false },
  { id: 4, equip: "Stege Yamaha", desc: "Interface", serie: "SB168-ES / Nº01012", qtd: 1, cidade: "Campinas", assist: "Analisea", contato: "(19) 99203-9966", cnpj: "23.960.659/0001-95", valor: 4000.00, entregue: false },
  { id: 5, equip: "Stege Yamaha", desc: "Interface", serie: "SB168-ES / Nº01005", qtd: 1, cidade: "Campinas", assist: "Analisea", contato: "(19) 99203-9966", cnpj: "23.960.659/0001-95", valor: 4000.00, entregue: false },
  { id: 6, equip: "Stege Yamaha", desc: "Interface", serie: "SB168-ES / Nº01001", qtd: 1, cidade: "Campinas", assist: "Analisea", contato: "(19) 99203-9966", cnpj: "23.960.659/0001-95", valor: 4000.00, entregue: false },
  { id: 7, equip: "Stege Yamaha", desc: "Interface", serie: "SB168-ES / Nº01002", qtd: 1, cidade: "Campinas", assist: "Analisea", contato: "(19) 99203-9966", cnpj: "23.960.659/0001-95", valor: 4000.00, entregue: false },
  { id: 8, equip: "Stege Yamaha", desc: "Interface", serie: "SB168-ES / Nº01011", qtd: 1, cidade: "Campinas", assist: "Analisea", contato: "(19) 99203-9966", cnpj: "23.960.659/0001-95", valor: 4000.00, entregue: false },
  { id: 9, equip: "Soundcraft si impact", desc: "Console", serie: "X", qtd: 1, cidade: "Campinas", assist: "Analisea", contato: "(19) 99203-9966", cnpj: "23.960.659/0001-95", valor: 18849.16, entregue: false },
  { id: 10, equip: "Yamanha 01V", desc: "Console", serie: "01V96i / NºBRAASM01086", qtd: 1, cidade: "Campinas", assist: "Analisea", contato: "(19) 99203-9966", cnpj: "23.960.659/0001-95", valor: 10000.00, entregue: false },
  { id: 11, equip: "Yamanha 01V", desc: "Console", serie: "01V96i / NºBRAAUL01078", qtd: 1, cidade: "Campinas", assist: "Analisea", contato: "(19) 99203-9966", cnpj: "23.960.659/0001-95", valor: 10000.00, entregue: false },
  { id: 12, equip: "Yamanha MG206", desc: "Console", serie: "MG206C / NºBRACQY01044", qtd: 1, cidade: "Campinas", assist: "Analisea", contato: "(19) 99203-9966", cnpj: "23.960.659/0001-95", valor: 2680.00, entregue: false },
  { id: 13, equip: "Shure ULX2 - M1", desc: "Microfone Bastão", serie: "X", qtd: 2, cidade: "São Paulo", assist: "Shyurixpro", contato: "(11) 3392-5689", cnpj: "34.021.555/0001-31", valor: 2852.00, entregue: false },
  { id: 14, equip: "Shure AD2 - G55", desc: "Microfone Bastão", serie: "X", qtd: 1, cidade: "São Paulo", assist: "Shyurixpro", contato: "(11) 3392-5690", cnpj: "34.021.555/0001-31", valor: 6229.00, entregue: false },
  { id: 15, equip: "Shure ULXD2 - L50", desc: "Microfone Bastão", serie: "X", qtd: 6, cidade: "São Paulo", assist: "Shyurixpro", contato: "(11) 3392-5691", cnpj: "34.021.555/0001-31", valor: 2699.00, entregue: false },
  { id: 16, equip: "Shure ULXD8 - J50", desc: "Microfone Bastão", serie: "Nº3QJ2021324", qtd: 1, cidade: "São Paulo", assist: "Shyurixpro", contato: "(11) 3392-5692", cnpj: "34.021.555/0001-31", valor: 4899.16, entregue: false },
  { id: 17, equip: "Shure ULXP4", desc: "Base s/ Fio", serie: "X", qtd: 2, cidade: "São Paulo", assist: "Shyurixpro", contato: "(11) 3392-5693", cnpj: "34.021.555/0001-31", valor: 400.00, entregue: false },
  { id: 18, equip: "Shure SM 58", desc: "Capsula Mic SM58", serie: "X", qtd: 6, cidade: "São Paulo", assist: "Shyurixpro", contato: "(11) 3392-5694", cnpj: "34.021.555/0001-31", valor: 1808.00, entregue: false },
  { id: 19, equip: "Shure BETA 58", desc: "Capsula BETA SM59", serie: "X", qtd: 3, cidade: "São Paulo", assist: "Shyurixpro", contato: "(11) 3392-5695", cnpj: "34.021.555/0001-31", valor: 2000.00, entregue: false },
  { id: 20, equip: "FZ 108A", desc: "Caixa Acustica", serie: "X", qtd: 2, cidade: "São Bernardo do Campo", assist: "Fly Audio Solution", contato: "(11) 3907-0900", cnpj: "13.996.315/0001-82", valor: 8990.00, entregue: false },
  { id: 21, equip: "FZ 102HPA", desc: "Caixa Acustica", serie: "X", qtd: 3, cidade: "São Bernardo do Campo", assist: "Fly Audio Solution", contato: "(11) 3907-0900", cnpj: "13.996.315/0001-82", valor: 10850.00, entregue: false }
];

const DEFAULT_MATERIAL_ESTUDO_DATA = {
  pemsa: {
    titulo: "Lista material PEMSA",
    operador: "Mauro",
    data: "08/07",
    local: "Coral / Pemsa",
    itens: [
      { item: 1, tipo: "Microfone", qtd: "4Un", desc: "DPA", retirado: "Almoxarifado Multimidia", local: "Coral / Pemsa" },
      { item: 2, tipo: "Microfone", qtd: "10Un", desc: "98HC", retirado: "Almoxarifado Multimidia", local: "Coral / Pemsa" },
      { item: 3, tipo: "Microfone", qtd: "4Un", desc: "sm81", retirado: "Almoxarifado Multimidia", local: "Coral / Pemsa" }
    ]
  },
  devotinhos: {
    titulo: "Lista material Devotinhos",
    operador: "Equipe",
    data: "10/07",
    local: "Devotinhos",
    itens: [
      { item: 1, tipo: "Microfone", qtd: "2Un", desc: "Shure SM58", retirado: "Almoxarifado Multimidia", local: "Devotinhos" },
      { item: 2, tipo: "Pedestal", qtd: "2Un", desc: "Pedestal Girafa", retirado: "Almoxarifado Multimidia", local: "Devotinhos" }
    ]
  }
};

window.SupabaseSync = {
  isSaving: false,
  isPulling: false,
  isInitialized: false,
  originalSetItem: null,
  originalRemoveItem: null,
  debounceTimer: null,
  lastSyncTime: null,
  hasLocalChanges: false,

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Guarda referências nativas do localStorage
    this.originalSetItem = localStorage.setItem.bind(localStorage);
    this.originalRemoveItem = localStorage.removeItem.bind(localStorage);

    // Intercepta alterações no localStorage
    const self = this;
    localStorage.setItem = function(key, value) {
      self.originalSetItem(key, value);
      if (SYNC_MODULE_KEYS.includes(key) && !self.isPulling) {
        self.hasLocalChanges = true;
        self.schedulePush();
      }
    };

    localStorage.removeItem = function(key) {
      self.originalRemoveItem(key);
      if (SYNC_MODULE_KEYS.includes(key) && !self.isPulling) {
        self.hasLocalChanges = true;
        self.schedulePush();
      }
    };

    // Monta badge de status visual
    this.injectSyncBadge();

    // 1. Puxa dados da Nuvem com prioridade
    await this.pullFromCloud();

    // 2. Garante dados iniciais se tudo estiver vazio
    await this.ensureInitialData();

    // 3. Listener para quando a janela fechar ou mudar de página (salva imediatamente)
    window.addEventListener('beforeunload', () => {
      if (this.hasLocalChanges) {
        this.pushToCloud(true);
      }
    });

    // 4. Sincronização periódica em background a cada 45 segundos
    setInterval(() => {
      if (!document.hidden && !this.isSaving) {
        this.pullFromCloud();
      }
    }, 45000);
  },

  schedulePush() {
    this.updateBadgeStatus('saving');
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.pushToCloud();
    }, 600);
  },

  async pullFromCloud() {
    if (this.isSaving) return;
    this.isPulling = true;
    this.updateBadgeStatus('syncing');

    try {
      const url = `${SYNC_SUPABASE_URL}/storage/v1/object/public/${SYNC_STORAGE_PATH}?t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });

      if (res.ok) {
        const cloudData = await res.json();
        if (cloudData && typeof cloudData === 'object') {
          let mudouAlgum = false;

          for (const key of SYNC_MODULE_KEYS) {
            const cloudVal = cloudData[key];
            const localValRaw = localStorage.getItem(key);

            // Verifica se a nuvem tem conteúdo válido para este módulo
            const hasCloudContent = cloudVal !== undefined && cloudVal !== null && 
              (Array.isArray(cloudVal) ? cloudVal.length > 0 : Object.keys(cloudVal || {}).length > 0);

            if (hasCloudContent) {
              const cloudValStr = JSON.stringify(cloudVal);
              if (localValRaw !== cloudValStr) {
                this.originalSetItem(key, cloudValStr);
                mudouAlgum = true;
              }
            }
          }

          this.lastSyncTime = new Date();
          this.updateBadgeStatus('synced');

          if (mudouAlgum) {
            console.log("☁️ SupabaseSync: Dados atualizados da nuvem com sucesso!");
            this.refreshPageTables();
          }
        }
      } else {
        // Arquivo ainda não existe na nuvem ou erro de leitura
        this.updateBadgeStatus('synced');
      }
    } catch (e) {
      console.warn("SupabaseSync pull warning:", e);
      this.updateBadgeStatus('offline');
    } finally {
      this.isPulling = false;
    }
  },

  async pushToCloud(immediate = false) {
    if (this.isSaving) return;
    this.isSaving = true;
    this.updateBadgeStatus('saving');

    try {
      const payload = {
        _updated_at: new Date().toISOString(),
        _source: navigator.userAgent
      };

      let totalRegistros = 0;
      SYNC_MODULE_KEYS.forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            payload[key] = parsed;
            if (Array.isArray(parsed)) totalRegistros += parsed.length;
            else if (typeof parsed === 'object') totalRegistros += Object.keys(parsed).length;
          } catch (e) {
            payload[key] = raw;
          }
        }
      });

      const res = await fetch(`${SYNC_SUPABASE_URL}/storage/v1/object/${SYNC_STORAGE_PATH}`, {
        method: 'POST',
        headers: {
          'apikey': SYNC_SUPABASE_KEY,
          'Authorization': `Bearer ${SYNC_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'x-upsert': 'true'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.hasLocalChanges = false;
        this.lastSyncTime = new Date();
        this.updateBadgeStatus('synced');
        console.log(`☁️ SupabaseSync: Salvo na nuvem com sucesso! (${totalRegistros} registros)`);
      } else {
        throw new Error(`Status ${res.status}: ${res.statusText}`);
      }
    } catch (e) {
      console.warn("SupabaseSync push error:", e);
      this.updateBadgeStatus('error');
    } finally {
      this.isSaving = false;
    }
  },

  async ensureInitialData() {
    let precisaSubir = false;

    // 1. Agenda
    const agendaLocal = localStorage.getItem('db_agenda');
    if (!agendaLocal || agendaLocal === '[]') {
      this.originalSetItem('db_agenda', JSON.stringify(DEFAULT_AGENDA_DATA));
      precisaSubir = true;
    }

    // 2. Manutenção Externa
    const manutLocal = localStorage.getItem('manutencao_db');
    if (!manutLocal || manutLocal === '[]') {
      this.originalSetItem('manutencao_db', JSON.stringify(DEFAULT_MANUTENCAO_DATA));
      precisaSubir = true;
    }

    // 3. Material de Estudo
    const matLocal = localStorage.getItem('db_material_estudo');
    if (!matLocal || matLocal === '{}') {
      this.originalSetItem('db_material_estudo', JSON.stringify(DEFAULT_MATERIAL_ESTUDO_DATA));
      precisaSubir = true;
    }

    // 4. Tabelas Excel
    for (const [key, filename] of Object.entries(EXCEL_FILE_MAP)) {
      const localVal = localStorage.getItem(key);
      let arr = [];
      try { if (localVal) arr = JSON.parse(localVal); } catch (e) {}

      if (!Array.isArray(arr) || arr.length < 2) {
        try {
          const res = await fetch(filename);
          if (res.ok && window.XLSX) {
            const buf = await res.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const jsonRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
            if (jsonRows && jsonRows.length > 1) {
              this.originalSetItem(key, JSON.stringify(jsonRows));
              precisaSubir = true;
            }
          }
        } catch (err) {
          console.warn(`Aviso ao ler ${filename}:`, err);
        }
      }
    }

    if (precisaSubir) {
      await this.pushToCloud();
      this.refreshPageTables();
    }
  },

  refreshPageTables() {
    try {
      if (typeof window.carregarExcel === 'function') window.carregarExcel();
      if (typeof window.carregarTodosDados === 'function') window.carregarTodosDados();
      if (typeof window.carregarDados === 'function') window.carregarDados();
      if (typeof window.renderPastas === 'function') window.renderPastas();
      if (typeof window.renderFolders === 'function') window.renderFolders();
      if (typeof window.renderizarTabela === 'function' && window.dadosPlanilha) window.renderizarTabela(window.dadosPlanilha);
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      console.warn("Erro ao atualizar interface após sincronização:", e);
    }
  },

  injectSyncBadge() {
    if (document.getElementById('supabaseSyncWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'supabaseSyncWidget';
    widget.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 9999;
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.76rem;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    `;
    widget.title = "Clique para sincronizar com a Nuvem agora";
    widget.innerHTML = `
      <span id="syncDot" style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
      <span id="syncText">Nuvem Conectada</span>
      <span id="syncBtnAction" style="color: #94a3b8; font-size: 0.7rem; border-left: 1px solid #475569; padding-left: 6px;">🔄 Sincronizar</span>
    `;

    widget.addEventListener('click', async () => {
      widget.style.transform = 'scale(0.95)';
      setTimeout(() => widget.style.transform = 'scale(1)', 150);
      await this.pullFromCloud();
      await this.pushToCloud(true);
    });

    if (document.body) {
      document.body.appendChild(widget);
    } else {
      document.addEventListener('DOMContentLoaded', () => document.body.appendChild(widget));
    }
  },

  updateBadgeStatus(status) {
    const dot = document.getElementById('syncDot');
    const text = document.getElementById('syncText');
    if (!dot || !text) return;

    if (status === 'saving') {
      dot.style.background = '#f59e0b';
      text.textContent = 'Salvando na Nuvem...';
    } else if (status === 'syncing') {
      dot.style.background = '#3b82f6';
      text.textContent = 'Sincronizando...';
    } else if (status === 'synced') {
      dot.style.background = '#10b981';
      const timeStr = this.lastSyncTime ? this.lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'OK';
      text.textContent = `Nuvem Salva (${timeStr})`;
    } else if (status === 'offline') {
      dot.style.background = '#94a3b8';
      text.textContent = 'Modo Local (Offline)';
    } else if (status === 'error') {
      dot.style.background = '#ef4444';
      text.textContent = 'Erro de Conexão';
    }
  }
};

// Inicialização imediata
window.SupabaseSync.init();