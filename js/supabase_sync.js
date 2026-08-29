// ==========================================
// SINCRONIZAÇÃO EM TEMPO REAL VIA SUPABASE (PC E CELULAR)
// Almoxarifado 2.0 - Santuário Nacional
// ==========================================

const SYNC_SUPABASE_URL = 'https://tocmqlsicxuxfkiptgaj.supabase.co';
const SYNC_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvY21xbHNpY3h1eGZraXB0Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNTIyODEsImV4cCI6MjA5OTYyODI4MX0.B-UKh4qMQG02guuJhIlI-ZB0d4OjlByFyfOoGISiqMY';

const SYNC_MODULE_KEYS = [
  'db_agenda',
  'db_historico_operacao',
  'db_historico_notebooks',
  'db_tvs_circulacao',
  'manutencao_db',
  'db_material_estudo'
];

const EXCEL_FILE_MAP = {
  'db_historico_operacao': 'historico_operacao.xlsx',
  'db_historico_notebooks': 'historico_notebooks.xlsx',
  'db_tvs_circulacao': 'tvs_em_circulação.xlsx'
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

window.SupabaseSync = {
  isSaving: false,
  originalSetItem: null,

  async init() {
    this.originalSetItem = localStorage.setItem.bind(localStorage);

    // 1. Tenta sincronizar com a Nuvem Supabase
    await this.pullFromCloud();

    // 2. Garante dados originais dos arquivos Excel e padrão
    await this.ensureInitialData();

    // 3. Intercepta alterações no localStorage para salvar no Supabase automaticamente
    const self = this;
    localStorage.setItem = function(key, value) {
      self.originalSetItem(key, value);
      if (SYNC_MODULE_KEYS.includes(key) && !self.isSaving) {
        self.pushToCloud();
      }
    };
  },

  async ensureInitialData() {
    let mudou = false;

    // Agenda Padrão
    const agendaLocal = localStorage.getItem('db_agenda');
    if (!agendaLocal || agendaLocal === '[]') {
      this.originalSetItem('db_agenda', JSON.stringify(DEFAULT_AGENDA_DATA));
      mudou = true;
    }

    // Leitura e Carga das Planilhas Excel se o storage local estiver vazio
    for (const [key, filename] of Object.entries(EXCEL_FILE_MAP)) {
      const localVal = localStorage.getItem(key);
      let arr = [];
      try { if (localVal) arr = JSON.parse(localVal); } catch (e) {}

      // Se não tiver registros locais válidos com cabeçalho
      if (!Array.isArray(arr) || arr.length < 2) {
        try {
          const res = await fetch(filename);
          if (res.ok && window.XLSX) {
            const buf = await res.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const jsonRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
            if (jsonRows && jsonRows.length > 1) {
              this.originalSetItem(key, JSON.stringify(jsonRows));
              mudou = true;
              console.log(`📦 SupabaseSync: ${filename} carregado e preparado para a nuvem!`);
            }
          }
        } catch (err) {
          console.warn(`Aviso ao carregar ${filename}:`, err);
        }
      }
    }

    if (mudou) {
      await this.pushToCloud();
      this.refreshPageTables();
    }
  },

  // Mesclagem Inteligente (Sem perdas, prioriza registros do usuário)
  mergeData(localArr, cloudArr) {
    if (!Array.isArray(localArr)) localArr = [];
    if (!Array.isArray(cloudArr)) cloudArr = [];

    if (localArr.length > 0 && cloudArr.length === 0) return localArr;
    if (localArr.length === 0 && cloudArr.length > 0) return cloudArr;
    if (localArr.length === 0 && cloudArr.length === 0) return [];

    const map = new Map();
    const getKey = (item) => {
      if (!item || typeof item !== 'object') return String(item);
      if (Array.isArray(item)) return item.join('_');
      if (item.id) return String(item.id);
      return `${item.nome || item.material || item.modelo || ''}_${item.data || item.saida || item.entrega || ''}_${item.sn || item.serie || ''}_${item.local || ''}`;
    };

    // Insere os da nuvem
    cloudArr.forEach(i => map.set(getKey(i), i));
    // Insere/atualiza com os locais (preserva edições locais)
    localArr.forEach(i => map.set(getKey(i), i));

    return Array.from(map.values());
  },

  async pullFromCloud() {
    try {
      const url = `${SYNC_SUPABASE_URL}/storage/v1/object/public/fotos/supabase_app_db_v3.json?t=${Date.now()}`;
      const res = await fetch(url);
      if (res.ok) {
        const cloudData = await res.json();
        if (cloudData && typeof cloudData === 'object') {
          let atualizou = false;
          let precisaSubir = false;

          SYNC_MODULE_KEYS.forEach(key => {
            const cloudArr = Array.isArray(cloudData[key]) ? cloudData[key] : [];
            let localArr = [];
            try {
              const raw = localStorage.getItem(key);
              if (raw) localArr = JSON.parse(raw);
            } catch (e) {}

            // Só mescla se a nuvem tiver dados válidos
            if (cloudArr.length > 0) {
              const merged = this.mergeData(localArr, cloudArr);
              const mergedStr = JSON.stringify(merged);
              const rawLocal = localStorage.getItem(key);

              if (mergedStr !== rawLocal) {
                if (this.originalSetItem) {
                  this.originalSetItem(key, mergedStr);
                } else {
                  localStorage.setItem(key, mergedStr);
                }
                atualizou = true;
              }

              if (merged.length > cloudArr.length) {
                precisaSubir = true;
              }
            }
          });

          if (atualizou) {
            console.log("☁️ SupabaseSync: Dados sincronizados em tempo real do Supabase!");
            this.refreshPageTables();
          }

          if (precisaSubir) {
            await this.pushToCloud();
          }
        }
      }
    } catch (e) {
      console.warn("SupabaseSync pull:", e);
    }
  },

  async pushToCloud() {
    if (this.isSaving) return;
    this.isSaving = true;

    try {
      const payload = {};
      SYNC_MODULE_KEYS.forEach(key => {
        const item = localStorage.getItem(key);
        payload[key] = item ? JSON.parse(item) : [];
      });

      await fetch(`${SYNC_SUPABASE_URL}/storage/v1/object/fotos/supabase_app_db_v3.json`, {
        method: 'POST',
        headers: {
          'apikey': SYNC_SUPABASE_KEY,
          'Authorization': `Bearer ${SYNC_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'x-upsert': 'true'
        },
        body: JSON.stringify(payload)
      });
      console.log("☁️ SupabaseSync: Alterações enviadas com sucesso para a nuvem!");
    } catch (e) {
      console.warn("SupabaseSync push:", e);
    } finally {
      this.isSaving = false;
    }
  },

  refreshPageTables() {
    if (typeof window.carregarExcel === 'function') window.carregarExcel();
    if (typeof window.carregarTodosDados === 'function') window.carregarTodosDados();
    if (typeof window.carregarDados === 'function') window.carregarDados();
  }
};

// Executa a inicialização do SupabaseSync
window.SupabaseSync.init();
