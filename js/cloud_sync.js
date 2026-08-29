// ==========================================
// SINCRONIZAÇÃO EM NUVEM E RECUPERAÇÃO AUTOMÁTICA DE DADOS
// Almoxarifado 2.0 - Santuário Nacional
// ==========================================

const CLOUD_SUPABASE_URL = 'https://tocmqlsicxuxfkiptgaj.supabase.co';
const CLOUD_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvY21xbHNpY3h1eGZraXB0Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNTIyODEsImV4cCI6MjA5OTYyODI4MX0.B-UKh4qMQG02guuJhIlI-ZB0d4OjlByFyfOoGISiqMY';

const CLOUD_KEYS = [
  'db_agenda',
  'db_historico_operacao',
  'db_historico_notebooks',
  'db_tvs_circulacao',
  'manutencao_db',
  'db_material_estudo'
];

const FILE_MAP = {
  'db_historico_operacao': 'historico_operacao.xlsx',
  'db_historico_notebooks': 'historico_notebooks.xlsx',
  'db_tvs_circulacao': 'tvs_em_circulação.xlsx'
};

const DEFAULT_AGENDA = [
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

window.CloudSync = {
  isUploading: false,
  originalSetItem: null,

  async init() {
    this.originalSetItem = localStorage.setItem.bind(localStorage);

    // 1. Sincroniza e recupera dados
    await this.download();

    // 2. Garante que se algum módulo estiver vazio, restaura das planilhas originais
    await this.garantirDadosOriginais();

    // 3. Intercepta novos salvamentos locais para enviar automaticamente pra Nuvem Supabase
    const self = this;
    localStorage.setItem = function(key, value) {
      self.originalSetItem(key, value);
      if (CLOUD_KEYS.includes(key) && !self.isUploading) {
        self.upload();
      }
    };
  },

  // Garante a restauração automática dos arquivos XLSX caso esteja vazio
  async garantirDadosOriginais() {
    let alterado = false;

    // Agenda
    const localAgenda = localStorage.getItem('db_agenda');
    if (!localAgenda || localAgenda === '[]' || JSON.parse(localAgenda).length === 0) {
      this.originalSetItem('db_agenda', JSON.stringify(DEFAULT_AGENDA));
      alterado = true;
    }

    // Planilhas Excel
    for (const [key, filename] of Object.entries(FILE_MAP)) {
      const localVal = localStorage.getItem(key);
      let arrayDados = [];
      try { if (localVal) arrayDados = JSON.parse(localVal); } catch (e) {}

      if (!arrayDados || arrayDados.length === 0) {
        try {
          const res = await fetch(filename);
          if (res.ok && window.XLSX) {
            const buf = await res.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const jsonRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            if (jsonRows && jsonRows.length > 0) {
              this.originalSetItem(key, JSON.stringify(jsonRows));
              alterado = true;
              console.log(`📦 CloudSync: Dados restaurados com sucesso da planilha original (${filename})!`);
            }
          }
        } catch (e) {
          console.warn(`Tentativa de carregar ${filename}:`, e);
        }
      }
    }

    if (alterado) {
      await this.upload();
      // Recarrega a página se necessário para exibir os dados restaurados na tabela
      if (typeof window.carregarExcel === 'function') window.carregarExcel();
      if (typeof window.carregarTodosDados === 'function') window.carregarTodosDados();
      if (typeof window.carregarDados === 'function') window.carregarDados();
    }
  },

  // Algoritmo de mesclagem segura de dados sem deletar registros do usuário
  mergeData(localArr, cloudArr) {
    if (!Array.isArray(localArr)) localArr = [];
    if (!Array.isArray(cloudArr)) cloudArr = [];

    if (localArr.length > 0 && cloudArr.length === 0) return localArr;
    if (localArr.length === 0 && cloudArr.length > 0) return cloudArr;
    if (localArr.length === 0 && cloudArr.length === 0) return [];

    const map = new Map();
    const getItemKey = (item) => {
      if (!item || typeof item !== 'object') return String(item);
      if (Array.isArray(item)) return item.join('_');
      if (item.id) return String(item.id);
      return `${item.nome || item.material || item.modelo || ''}_${item.data || item.saida || item.entrega || ''}_${item.sn || item.serie || ''}_${item.local || ''}`;
    };

    cloudArr.forEach(item => {
      const k = getItemKey(item);
      map.set(k, item);
    });

    localArr.forEach(item => {
      const k = getItemKey(item);
      map.set(k, item);
    });

    return Array.from(map.values());
  },

  async download() {
    try {
      const url = `${CLOUD_SUPABASE_URL}/storage/v1/object/public/fotos/cloud_db_v2.json?t=${Date.now()}`;
      const res = await fetch(url);
      const self = this;

      if (res.ok) {
        const cloudObj = await res.json();
        if (cloudObj && typeof cloudObj === 'object') {
          let precisaSubir = false;
          let mudouLocal = false;

          CLOUD_KEYS.forEach(key => {
            let localArr = [];
            try {
              const rawLocal = localStorage.getItem(key);
              if (rawLocal) localArr = JSON.parse(rawLocal);
            } catch (e) {}

            const cloudArr = Array.isArray(cloudObj[key]) ? cloudObj[key] : [];

            // Só atualiza se a nuvem tiver registros válidos
            if (cloudArr.length > 0) {
              const mergedArr = self.mergeData(localArr, cloudArr);
              const mergedStr = JSON.stringify(mergedArr);
              const rawLocal = localStorage.getItem(key);

              if (mergedStr !== rawLocal) {
                if (self.originalSetItem) {
                  self.originalSetItem(key, mergedStr);
                } else {
                  localStorage.setItem(key, mergedStr);
                }
                mudouLocal = true;
              }

              if (mergedArr.length > cloudArr.length) {
                precisaSubir = true;
              }
            }
          });

          if (mudouLocal) {
            console.log("☁️ CloudSync: Dados sincronizados com a nuvem!");
          }

          if (precisaSubir) {
            await self.upload();
          }
        }
      } else {
        await self.upload();
      }
    } catch (e) {
      console.warn("CloudSync download aviso:", e);
    }
  },

  async upload() {
    if (this.isUploading) return;
    this.isUploading = true;

    try {
      const payload = {};
      CLOUD_KEYS.forEach(key => {
        const item = localStorage.getItem(key);
        payload[key] = item ? JSON.parse(item) : [];
      });

      await fetch(`${CLOUD_SUPABASE_URL}/storage/v1/object/fotos/cloud_db_v2.json`, {
        method: 'POST',
        headers: {
          'apikey': CLOUD_SUPABASE_KEY,
          'Authorization': `Bearer ${CLOUD_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'x-upsert': 'true'
        },
        body: JSON.stringify(payload)
      });
      console.log("☁️ CloudSync: Registros preservados e salvos na Nuvem!");
    } catch (e) {
      console.warn("CloudSync upload erro:", e);
    } finally {
      this.isUploading = false;
    }
  }
};

// Inicializa assim que o arquivo carregar
window.CloudSync.init();
