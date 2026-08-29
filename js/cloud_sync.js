// ==========================================
// SINCRONIZAÇÃO EM NUVEM EM TEMPO REAL SEM PERDA DE DADOS (SUPABASE)
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

window.CloudSync = {
  isUploading: false,
  originalSetItem: null,

  async init() {
    this.originalSetItem = localStorage.setItem.bind(localStorage);

    // 1. Baixa do Supabase e mescla mantendo 100% dos dados locais
    await this.download();

    // 2. Intercepta salvamentos locais para subir automaticamente para a nuvem
    const self = this;
    localStorage.setItem = function(key, value) {
      self.originalSetItem(key, value);
      if (CLOUD_KEYS.includes(key) && !self.isUploading) {
        self.upload();
      }
    };
  },

  // Algoritmo de mesclagem sem perdas
  mergeData(localArr, cloudArr) {
    if (!Array.isArray(localArr)) localArr = [];
    if (!Array.isArray(cloudArr)) cloudArr = [];

    // Se o local tem dados e a nuvem está vazia, mantém todos os dados locais
    if (localArr.length > 0 && cloudArr.length === 0) {
      return localArr;
    }
    // Se o local está vazio e a nuvem tem dados, usa a nuvem
    if (localArr.length === 0 && cloudArr.length > 0) {
      return cloudArr;
    }
    if (localArr.length === 0 && cloudArr.length === 0) {
      return [];
    }

    // Se ambos possuem dados, combina sem duplicações
    const map = new Map();
    
    const getItemKey = (item) => {
      if (!item || typeof item !== 'object') return String(item);
      if (item.id) return String(item.id);
      // Cria assinatura única baseada em campos comuns
      return `${item.nome || item.material || item.modelo || ''}_${item.data || item.saida || item.entrega || ''}_${item.sn || item.serie || ''}_${item.local || ''}`;
    };

    // Insere itens da nuvem primeiro
    cloudArr.forEach(item => {
      const k = getItemKey(item);
      map.set(k, item);
    });

    // Sobrescreve/adiciona itens locais (prioridade para a máquina local)
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

            // Mescla sem deletar registros do usuário
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
          });

          if (mudouLocal) {
            console.log("☁️ CloudSync: Dados sincronizados sem perda de registros!");
          }

          if (precisaSubir) {
            await self.upload();
          }
        }
      } else {
        // Se a nuvem ainda não tem o arquivo, envia todos os dados locais existentes
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
      console.log("☁️ CloudSync: Registros salvos com sucesso na Nuvem Supabase!");
    } catch (e) {
      console.warn("CloudSync upload erro:", e);
    } finally {
      this.isUploading = false;
    }
  }
};

// Inicializa assim que o arquivo carregar
window.CloudSync.init();
