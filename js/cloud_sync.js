// ==========================================
// SINCRONIZAÇÃO EM NUVEM EM TEMPO REAL (SUPABASE)
// Almoxarifado 2.0 - PC e Celular Conectados
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

  async init() {
    // 1. Baixa do Supabase para atualizar a máquina/celular local
    await this.download();

    // 2. Intercepta atualizações do localStorage para enviar automaticamente pra Nuvem Supabase
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const self = this;
    localStorage.setItem = function(key, value) {
      originalSetItem(key, value);
      if (CLOUD_KEYS.includes(key) && !self.isUploading) {
        self.upload();
      }
    };
  },

  async download() {
    try {
      const url = `${CLOUD_SUPABASE_URL}/storage/v1/object/public/fotos/cloud_db_v2.json?t=${Date.now()}`;
      const res = await fetch(url);
      if (res.ok) {
        const cloudObj = await res.json();
        if (cloudObj && typeof cloudObj === 'object') {
          let atualizou = false;
          CLOUD_KEYS.forEach(key => {
            if (cloudObj[key] !== undefined) {
              const cloudValStr = JSON.stringify(cloudObj[key]);
              const currentVal = localStorage.getItem(key);
              if (currentVal !== cloudValStr) {
                localStorage.setItem(key, cloudValStr);
                atualizou = true;
              }
            }
          });
          if (atualizou) {
            console.log("☁️ CloudSync: Dados sincronizados da Nuvem Supabase com sucesso!");
          }
        }
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
      console.log("☁️ CloudSync: Alterações salvas na Nuvem Supabase!");
    } catch (e) {
      console.warn("CloudSync upload erro:", e);
    } finally {
      this.isUploading = false;
    }
  }
};

// Inicializa assim que o arquivo carregar
window.CloudSync.init();

