// ==========================================
// CONFIGURAÇÃO DO SUPABASE (ALMOXARIFADO 2.0)
// ==========================================
const SUPABASE_URL = 'https://tocmqlsicxuxfkiptgaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvY21xbHNpY3h1eGZraXB0Z2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNTIyODEsImV4cCI6MjA5OTYyODI4MX0.B-UKh4qMQG02guuJhIlI-ZB0d4OjlByFyfOoGISiqMY';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ==========================================
// CÓDIGOS DO ALMOXARIFADO (SALA 183)
// ==========================================
const CODIGOS_ALMOXARIFADO = ['183', '01.03.21.007', '0103.21.007', '01.03.21.7'];

function isLocalAlmoxarifado(codigoLocal) {
    if (!codigoLocal) return false;
    const cod = String(codigoLocal).trim();
    // Compara diretamente e também sem pontos/espaços para cobrir variações
    return CODIGOS_ALMOXARIFADO.some(c =>
        cod === c || cod.replace(/[.\s]/g, '') === c.replace(/[.\s]/g, '')
    );
}

// ==========================================
// VERIFICAÇÃO DE SESSÃO / USUÁRIO
// ==========================================
async function verificarSessao() {
    if (!supabaseClient) return;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const elementoResponsavel = document.getElementById('responsavelNome');
        if (session && session.user) {
            console.log("Usuário logado:", session.user.email);
            if (elementoResponsavel) elementoResponsavel.textContent = session.user.email;
        } else {
            if (elementoResponsavel) elementoResponsavel.textContent = "Operador / A&V";
        }
    } catch (e) {
        console.warn("Verificação de sessão:", e);
    }
}

verificarSessao();

let inventario = [];
let filtroCategoriaAtivo = 'Todos';

let fotoFileCadastro = null;
let fotoFileEdicao = null;

// ==========================================
// UPLOAD DE FOTO COM COMPRESSÃO
// ==========================================
async function uploadFotoParaSupabase(file) {
    if (!file || !supabaseClient) return null;

    const converterParaJpeg = (arquivo) => {
        return new Promise((resolve) => {
            if (typeof Compressor === 'undefined') {
                resolve(arquivo);
                return;
            }

            new Compressor(arquivo, {
                quality: 0.8,
                mimeType: 'image/jpeg',
                maxWidth: 1200,
                maxHeight: 1200,
                success(resultado) { resolve(resultado); },
                error(err) {
                    console.warn("Compressão de foto, enviando original:", err);
                    resolve(arquivo);
                },
            });
        });
    };

    try {
        const fotoPronta = await converterParaJpeg(file);
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

        const { data, error } = await supabaseClient
            .storage
            .from('fotos')
            .upload(fileName, fotoPronta, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: publicUrlData } = supabaseClient
            .storage
            .from('fotos')
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;

    } catch (err) {
        console.error("Falha ao subir imagem para o Storage:", err);
        alert("Aviso: Não foi possível enviar a foto. O item será cadastrado sem foto.");
        return null;
    }
}

// ==========================================
// INICIALIZAÇÃO E CARREGAMENTO DE DADOS
// ==========================================
async function carregarDadosDoBanco() {
    const statusBox = document.getElementById('statusInfo');
    if (statusBox) {
        statusBox.className = 'info-badge';
        statusBox.innerHTML = `<i data-lucide="loader" style="width:14px; height:14px; animation: spin 1s linear infinite;"></i> Conectando...`;
        if (window.lucide) lucide.createIcons();
    }

    try {
        if (!supabaseClient) throw new Error("Supabase não carregado");

        const { data, error } = await supabaseClient
            .from('inventario')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        inventario = data || [];
        
        if (statusBox) {
            statusBox.className = 'info-badge success';
            statusBox.innerHTML = `<i data-lucide="cloud" style="width:14px; height:14px;"></i> Nuvem: ${inventario.length} itens`;
            if (window.lucide) lucide.createIcons();
        }

        renderizarTabela();
    } catch (error) {
        console.error("Erro ao carregar dados do Supabase:", error.message);
        if (statusBox) {
            statusBox.className = 'info-badge error';
            statusBox.innerHTML = `<i data-lucide="alert-circle" style="width:14px; height:14px;"></i> Offline / Erro Supabase`;
            if (window.lucide) lucide.createIcons();
        }
        renderizarTabela();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const fotoInput = document.getElementById('fotoInput');
    const editFotoInput = document.getElementById('edit-fotoInput');

    if (fotoInput) {
        fotoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                fotoFileCadastro = file;
                const objectUrl = URL.createObjectURL(file);
                document.getElementById('previewCadastro').innerHTML = `<img src="${objectUrl}" alt="Preview">`;
            }
        });
    }

    if (editFotoInput) {
        editFotoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                fotoFileEdicao = file;
                const objectUrl = URL.createObjectURL(file);
                document.getElementById('edit-preview').innerHTML = `<img src="${objectUrl}" alt="Preview">`;
            }
        });
    }

    carregarDadosDoBanco();
    if (window.lucide) lucide.createIcons();
});

// ==========================================
// FILTROS E PESQUISA
// ==========================================
function filtrarPorCategoria(categoria) {
    filtroCategoriaAtivo = categoria;
    const pills = document.querySelectorAll('#listaCategorias .category-pill');
    pills.forEach(p => {
        p.classList.remove('active');
        if (p.textContent.includes(categoria) || (categoria === 'Todos' && p.textContent.includes('Todos'))) {
            p.classList.add('active');
        }
    });
    renderizarTabela();
}

function executarBusca() {
    renderizarTabela();
}

// ==========================================
// MAPA DE PREFIXOS DE PATRIMÔNIO POR CATEGORIA
// ==========================================
const MAPA_PATRIMONIO_PREFIXO = {
    'Microfone': 'MIC',
    'Consoles': 'CON',
    'Processadores': 'PRC',
    'Amplificadores': 'AMP',
    'Line Array': 'LIN',
    'Caixa Acustica': 'CXA',
    'Subwoofer': 'SUB',
    'Notebooks/Tablet': 'NTB',
    'Acessorios Multimidia': 'ACM',
    'Pedestais': 'PED',
    'Telas de Projeção': 'TLP',
    'Televisores': 'TLV',
    'Receptor de Áudio RF': 'RAR',
    'Transmissores de Áudio RF': 'TAR',
    'Antenas': 'ANT',
    'Distribuidor de Sinal antena RF': 'DSA',
    'Conversor de Sinal de RF/Luz': 'CSR',
    'Projetores': 'PRJ',
    'Iluminação Cênica': 'ILC',
    'Rede de Dados': 'RDD',
    'Distribuidores de Energia': 'DSE',
    'Intrumentos Musicais': 'IMS',
    'Equipamentos de Video CFTV': 'EDV',
    'Conversores de Energia': 'CNE',
    'Conversor AD/DA Áudio': 'CNA',
    'Distribuidores de Áudio': 'DAU',
    'Distribuidores de Midia': 'RPM',
    'Racks de Transporte': 'RKT',
    'Fones de Ouvido': 'FON',
    'Outros': 'OUT',

    // Apelidos defensivos para preservar compatibilidade com registros anteriores
    'Aplicadores': 'AMP',
    'Processadores de áudio': 'PRC',
    'Caixas de Som': 'CXA',
    'SubGrave': 'SUB',
    'Notebooks': 'NTB',
    'TVs': 'TLV',
    'Antenas RF': 'ANT',
    'Fones EAR / Monitor': 'FON',
    'HeardSet': 'HDS',
    'HeadSet': 'HDS'
};

function autoPreencherPatrimonio() {
    const categoriaSelect = document.getElementById('categoria');
    const campoPatrimonio = document.getElementById('patrimonio');
    if (!categoriaSelect || !campoPatrimonio) return;
    
    const cat = categoriaSelect.value;
    if (MAPA_PATRIMONIO_PREFIXO[cat]) {
        campoPatrimonio.value = MAPA_PATRIMONIO_PREFIXO[cat];
    }
}

function autoPreencherPatrimonioEdicao() {
    const categoriaSelect = document.getElementById('edit-categoria');
    const campoPatrimonio = document.getElementById('edit-patrimonio');
    if (!categoriaSelect || !campoPatrimonio) return;
    
    const cat = categoriaSelect.value;
    if (MAPA_PATRIMONIO_PREFIXO[cat]) {
        campoPatrimonio.value = MAPA_PATRIMONIO_PREFIXO[cat];
    }
}

// Extrai a sigla/classe do Patrimônio e o Nº do Patrimônio a partir de item.codigo
function extrairPatrimonioENumero(item) {
    const rawCodigo = (item.codigo || '').trim();
    const prefixoPadrao = MAPA_PATRIMONIO_PREFIXO[item.categoria] || '';

    if (!rawCodigo) {
        return {
            patrimonio: prefixoPadrao || '-',
            numPatrimonio: '-'
        };
    }

    // Se tiver separador " - " (ex: "RDD - 11833" ou "MIC - 000123")
    if (rawCodigo.includes(' - ')) {
        const partes = rawCodigo.split(' - ');
        return {
            patrimonio: partes[0].trim() || prefixoPadrao || '-',
            numPatrimonio: partes.slice(1).join(' - ').trim() || '-'
        };
    }

    // Se tiver hífen sem espaços (ex: "RDD-11833")
    const matchHifen = rawCodigo.match(/^([A-Za-z]+)\s*-\s*([A-Za-z0-9\.\_\/]+)$/);
    if (matchHifen) {
        return {
            patrimonio: matchHifen[1].toUpperCase(),
            numPatrimonio: matchHifen[2]
        };
    }

    // Se tiver espaço simples (ex: "RDD 11833")
    const matchEspaco = rawCodigo.match(/^([A-Za-z]{2,5})\s+([0-9\.\_\/\-]+)$/);
    if (matchEspaco) {
        return {
            patrimonio: matchEspaco[1].toUpperCase(),
            numPatrimonio: matchEspaco[2]
        };
    }

    // Se for apenas a sigla (ex: "RDD", "MIC", "TLV")
    if (/^[A-Za-z]{2,5}$/.test(rawCodigo)) {
        return {
            patrimonio: rawCodigo.toUpperCase(),
            numPatrimonio: '-'
        };
    }

    // Se começar por número (ex: "11833")
    if (/^[0-9]/.test(rawCodigo)) {
        return {
            patrimonio: prefixoPadrao || '-',
            numPatrimonio: rawCodigo
        };
    }

    return {
        patrimonio: rawCodigo,
        numPatrimonio: '-'
    };
}

// ==========================================
// RENDERIZAÇÃO DA TABELA
// ==========================================
function renderizarTabela() {
    const corpoTabela = document.getElementById('corpoTabela');
    const avisoVazio = document.getElementById('avisoVazio');
    const contador = document.getElementById('contadorItens');
    const buscaTexto = (document.getElementById('buscaRapida')?.value || '').toLowerCase().trim();

    if (!corpoTabela) return;
    corpoTabela.innerHTML = '';

    const itensFiltrados = inventario.filter(item => {
        // Só exibe itens que estão no almoxarifado (Local 183 / 01.03.21.007)
        const estaNoAlmoxarifado = isLocalAlmoxarifado(item.local);
        if (!estaNoAlmoxarifado) return false;

        const atendeCategoria = (filtroCategoriaAtivo === 'Todos' || item.categoria === filtroCategoriaAtivo);
        const patInfo = extrairPatrimonioENumero(item);
        const atendeBusca = !buscaTexto ||
            (item.codigo || '').toLowerCase().includes(buscaTexto) ||
            (patInfo.patrimonio || '').toLowerCase().includes(buscaTexto) ||
            (patInfo.numPatrimonio || '').toLowerCase().includes(buscaTexto) ||
            (item.marca || '').toLowerCase().includes(buscaTexto) ||
            (item.modelo || '').toLowerCase().includes(buscaTexto) ||
            (item.sn || '').toLowerCase().includes(buscaTexto) ||
            (item.local || '').toLowerCase().includes(buscaTexto) ||
            (item.observacoes || '').toLowerCase().includes(buscaTexto) ||
            (item.categoria || '').toLowerCase().includes(buscaTexto);

        return atendeCategoria && atendeBusca;
    });

    // Conta total de itens no almoxarifado (sem filtros de busca/categoria)
    const totalNoAlmoxarifado = inventario.filter(item => isLocalAlmoxarifado(item.local)).length;

    if (contador) {
        contador.textContent = `${itensFiltrados.length} listados de ${totalNoAlmoxarifado} em estoque no almoxarifado`;
    }

    if (itensFiltrados.length === 0) {
        if (avisoVazio) avisoVazio.style.display = 'block';
        if (window.lucide) lucide.createIcons();
        return;
    }

    if (avisoVazio) avisoVazio.style.display = 'none';

    itensFiltrados.forEach(item => {
        const tr = document.createElement('tr');
        
        const botoesAcao = `
            <div class="action-buttons">
                <button class="btn-action edit" onclick="abrirModalEdicao('${item.id}')" title="Editar"><i data-lucide="edit-3" style="width:14px; height:14px;"></i></button>
                <button class="btn-action duplicate" onclick="duplicarItem('${item.id}')" title="Duplicar"><i data-lucide="copy" style="width:14px; height:14px;"></i></button>
                <button class="btn-action delete" onclick="removerItemDoInventario('${item.id}')" title="Excluir"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>
            </div>
        `;

        const tdFoto = item.foto 
            ? `<td style="text-align:center;"><img src="${item.foto}" class="miniatura-tabela" onclick="abrirFotoGrande('${item.foto}')" alt="Foto"></td>`
            : `<td style="text-align:center;"><span class="sem-foto-icon"><i data-lucide="camera-off" style="width:16px; height:16px;"></i></span></td>`;

        const patInfo = extrairPatrimonioENumero(item);

        tr.innerHTML = `
            ${tdFoto}
            <td><span class="badge-cat">${item.categoria || 'Outros'}</span></td>
            <td><strong style="color: var(--secondary);">${patInfo.patrimonio}</strong></td>
            <td><strong style="color: #0284c7;">${patInfo.numPatrimonio}</strong></td>
            <td>${item.marca || '-'}</td>
            <td>${item.modelo || '-'}</td>
            <td><code style="font-size: 0.78rem; background: #f1f5f9; padding: 2px 5px; border-radius: 4px;">${item.sn || 'S/N'}</code></td>
            <td><b>${item.quantidade ?? 1}</b></td>
            <td><span class="badge-loc">📍 ${item.local || '183'}</span></td>
            <td style="color: var(--text-muted); font-size: 0.8rem;">${item.observacoes || '-'}</td>
            <td>${botoesAcao}</td>
        `;
        corpoTabela.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();
}

// ==========================================
// MODAL DE CADASTRO
// ==========================================
function abrirModalCadastro() {
    const modal = document.getElementById('modalCadastro');
    if (modal) {
        modal.classList.add('active');
        if (window.lucide) lucide.createIcons();
        autoPreencherPatrimonio();
    }
}

function fecharModalCadastro() {
    const modal = document.getElementById('modalCadastro');
    if (modal) modal.classList.remove('active');
}

// ==========================================
// OPERAÇÕES DO BANCO DE DADOS (CRUD)
// ==========================================
async function cadastrarNovoItem() {
    const categoria = document.getElementById('categoria').value;
    const campoPatrimonio = document.getElementById('patrimonio');
    const campoNumPatrimonio = document.getElementById('num_patrimonio') || document.getElementById('codigo');

    const prefixoPat = campoPatrimonio ? campoPatrimonio.value.trim() : '';
    const numeroPat = campoNumPatrimonio ? campoNumPatrimonio.value.trim() : '';

    let codigo = '';
    if (prefixoPat && numeroPat) {
        if (numeroPat.toUpperCase().startsWith(prefixoPat.toUpperCase())) {
            codigo = numeroPat;
        } else {
            codigo = `${prefixoPat} - ${numeroPat}`;
        }
    } else {
        codigo = numeroPat || prefixoPat || 'S/N';
    }

    const marca = document.getElementById('marca').value.trim();
    const modelo = document.getElementById('modelo').value.trim();
    const sn = document.getElementById('sn').value.trim() || 'S/N';
    const quantidade = parseInt(document.getElementById('quantidade').value) || 1;
    const local = document.getElementById('local').value.trim();
    const observacoes = document.getElementById('observacoes').value.trim();

    let urlFoto = null;

    if (fotoFileCadastro) {
        urlFoto = await uploadFotoParaSupabase(fotoFileCadastro);
    }

    const novoItem = {
        categoria,
        codigo,
        marca,
        modelo,
        sn,
        quantidade,
        local,
        observacoes,
        foto: urlFoto
    };

    try {
        if (!supabaseClient) throw new Error("Supabase não disponível");

        // 1. Grava na tabela principal 'inventario'
        const { error } = await supabaseClient
            .from('inventario')
            .insert([novoItem]);

        if (error) throw error;

        // 2. Envia cópia mapeada para o Analytics ('equipamentos')
        try {
            const statusEquip = isLocalAlmoxarifado(novoItem.local) ? 'Em Almoxarifado' : 'Em Operação';
            if (novoItem.sn && novoItem.sn !== 'S/N' && novoItem.sn !== 'SN') {
                const { data: existente } = await supabaseClient
                    .from('equipamentos')
                    .select('num_serie')
                    .eq('num_serie', novoItem.sn)
                    .maybeSingle();

                if (existente) {
                    await supabaseClient.from('equipamentos').update({
                        patrimonio: novoItem.codigo,
                        classe: novoItem.categoria,
                        fabricante: novoItem.marca,
                        modelo: novoItem.modelo,
                        codigo_local: novoItem.local,
                        status: statusEquip
                    }).eq('num_serie', novoItem.sn);
                } else {
                    await supabaseClient.from('equipamentos').insert([{
                        patrimonio: novoItem.codigo,
                        classe: novoItem.categoria,
                        fabricante: novoItem.marca,
                        modelo: novoItem.modelo,
                        num_serie: novoItem.sn,
                        codigo_local: novoItem.local,
                        status: statusEquip
                    }]);
                }
            } else {
                await supabaseClient.from('equipamentos').insert([{
                    patrimonio: novoItem.codigo,
                    classe: novoItem.categoria,
                    fabricante: novoItem.marca,
                    modelo: novoItem.modelo,
                    num_serie: novoItem.sn || 'S/N',
                    codigo_local: novoItem.local,
                    status: statusEquip
                }]);
            }
        } catch (e) {
            console.warn("Sincronização em equipamentos:", e);
        }

        // Limpa o formulário
        if (document.getElementById('num_patrimonio')) document.getElementById('num_patrimonio').value = '';
        if (document.getElementById('codigo')) document.getElementById('codigo').value = '';
        if (document.getElementById('patrimonio')) document.getElementById('patrimonio').value = '';
        document.getElementById('marca').value = '';
        document.getElementById('modelo').value = '';
        document.getElementById('sn').value = '';
        document.getElementById('quantidade').value = '1';
        document.getElementById('local').value = '01.03.21.007';
        document.getElementById('observacoes').value = '';
        
        const fotoInput = document.getElementById('fotoInput');
        if (fotoInput) fotoInput.value = '';
        
        const preview = document.getElementById('previewCadastro');
        if (preview) preview.innerHTML = '';
        
        fotoFileCadastro = null;
        fecharModalCadastro();

        alert('✅ Item cadastrado com sucesso no Supabase!');
        await carregarDadosDoBanco();

    } catch (error) {
        console.error("Erro ao cadastrar item no Supabase:", error);
        alert("Erro ao salvar no banco de dados: " + (error.message || error));
    }
}

// ==========================================
// MODAL DE EDIÇÃO E SALVAMENTO
// ==========================================
function abrirModalEdicao(idItem) {
    const item = inventario.find(i => String(i.id) === String(idItem));

    if (!item) {
        alert("Erro: Item não encontrado no sistema.");
        return;
    }

    const patInfo = extrairPatrimonioENumero(item);

    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-categoria').value = item.categoria || 'Outros';

    const campoEditPat = document.getElementById('edit-patrimonio');
    const campoEditNum = document.getElementById('edit-num-patrimonio');
    
    if (campoEditPat) {
        campoEditPat.value = (patInfo.patrimonio && patInfo.patrimonio !== '-') ? patInfo.patrimonio : (MAPA_PATRIMONIO_PREFIXO[item.categoria] || '');
    }
    if (campoEditNum) {
        campoEditNum.value = (patInfo.numPatrimonio && patInfo.numPatrimonio !== '-') ? patInfo.numPatrimonio : '';
    }

    document.getElementById('edit-marca').value = item.marca || '';
    document.getElementById('edit-modelo').value = item.modelo || '';
    document.getElementById('edit-sn').value = item.sn || '';
    document.getElementById('edit-quantidade').value = item.quantidade ?? 1;
    document.getElementById('edit-local').value = item.local || '';
    document.getElementById('edit-observacoes').value = item.observacoes || '';
    
    if (document.getElementById('edit-fotoInput')) {
        document.getElementById('edit-fotoInput').value = '';
    }
    fotoFileEdicao = null;

    const previewContainer = document.getElementById('edit-preview');
    if (previewContainer) {
        if (item.foto) {
            previewContainer.innerHTML = `<img src="${item.foto}" alt="Preview">`;
        } else {
            previewContainer.innerHTML = `<span class="sem-foto-icon"><i data-lucide="camera-off"></i> Sem foto</span>`;
        }
    }

    const modal = document.getElementById('modalEditar');
    if (modal) {
        modal.classList.add('active');
        if (window.lucide) lucide.createIcons();
    }
}

function fecharModal() {
    const modal = document.getElementById('modalEditar');
    if (modal) modal.classList.remove('active');
}

async function salvarEdicaoItem() {
    const idItem = document.getElementById('edit-id').value;
    const itemAtual = inventario.find(i => String(i.id) === String(idItem));

    const novoLocal = document.getElementById('edit-local').value.trim();
    const localAnterior = itemAtual ? itemAtual.local : '';

    // Verifica se está saindo do almoxarifado (transferência)
    const eraAlmoxarifado = isLocalAlmoxarifado(localAnterior);
    const ficaNoAlmoxarifado = isLocalAlmoxarifado(novoLocal);

    if (eraAlmoxarifado && !ficaNoAlmoxarifado) {
        const confirmou = confirm(
            `⚠️ TRANSFERÊNCIA DE EQUIPAMENTO\n\n` +
            `Ao alterar o local para "${novoLocal}", este item será removido do Inventário do Almoxarifado (183) e ficará visível apenas no Sysman Analytics.\n\n` +
            `Deseja continuar com a transferência?`
        );
        if (!confirmou) return;
    }

    let urlFoto = itemAtual ? itemAtual.foto : null;

    if (fotoFileEdicao) {
        urlFoto = await uploadFotoParaSupabase(fotoFileEdicao);
    }

    const prefixoPat = document.getElementById('edit-patrimonio')?.value.trim() || '';
    const numeroPat = document.getElementById('edit-num-patrimonio')?.value.trim() || '';

    let codigo = '';
    if (prefixoPat && numeroPat) {
        if (numeroPat.toUpperCase().startsWith(prefixoPat.toUpperCase())) {
            codigo = numeroPat;
        } else {
            codigo = `${prefixoPat} - ${numeroPat}`;
        }
    } else {
        codigo = numeroPat || prefixoPat || 'S/N';
    }

    const dadosAtualizados = {
        categoria: document.getElementById('edit-categoria').value,
        codigo: codigo,
        marca: document.getElementById('edit-marca').value.trim(),
        modelo: document.getElementById('edit-modelo').value.trim(),
        sn: document.getElementById('edit-sn').value.trim() || 'S/N',
        quantidade: parseInt(document.getElementById('edit-quantidade').value) || 0,
        local: novoLocal,
        observacoes: document.getElementById('edit-observacoes').value.trim(),
        foto: urlFoto
    };

    try {
        if (!supabaseClient) throw new Error("Supabase não disponível");

        const { error } = await supabaseClient
            .from('inventario')
            .update(dadosAtualizados)
            .eq('id', idItem);

        if (error) throw error;

        // Atualiza cópia no Analytics com status dinâmico
        try {
            const statusEquip = isLocalAlmoxarifado(dadosAtualizados.local) ? 'Em Almoxarifado' : 'Em Operação';
            let queryEq = supabaseClient.from('equipamentos').update({
                patrimonio: dadosAtualizados.codigo,
                classe: dadosAtualizados.categoria,
                fabricante: dadosAtualizados.marca,
                modelo: dadosAtualizados.modelo,
                num_serie: dadosAtualizados.sn,
                codigo_local: dadosAtualizados.local,
                status: statusEquip
            });

            if (itemAtual && itemAtual.sn && itemAtual.sn !== 'S/N' && itemAtual.sn !== 'SN') {
                queryEq = queryEq.eq('num_serie', itemAtual.sn);
            } else {
                queryEq = queryEq.eq('patrimonio', itemAtual ? itemAtual.codigo : dadosAtualizados.codigo);
            }

            await queryEq;
        } catch (e) {}

        fecharModal();

        if (eraAlmoxarifado && !ficaNoAlmoxarifado) {
            alert(`✅ Equipamento transferido com sucesso para o local ${novoLocal}!\nEle não aparecerá mais no inventário do Almoxarifado, mas estará visível no Sysman Analytics.`);
        } else {
            alert('✅ Item atualizado com sucesso!');
        }

        await carregarDadosDoBanco();

    } catch (error) {
        console.error("Erro ao atualizar item:", error.message);
        alert("Erro ao atualizar informações: " + error.message);
    }
}

async function removerItemDoInventario(idItem) {
    if (confirm("Tem certeza que deseja excluir este item do inventário?")) {
        try {
            if (!supabaseClient) throw new Error("Supabase não disponível");

            const { error } = await supabaseClient
                .from('inventario')
                .delete()
                .eq('id', idItem);

            if (error) throw error;

            alert("Item removido com sucesso!");
            await carregarDadosDoBanco();

        } catch (error) {
            console.error("Erro ao deletar item:", error.message);
            alert("Erro ao excluir: " + error.message);
        }
    }
}

// ==========================================
// ZOOM DE FOTOS
// ==========================================
function abrirFotoGrande(src) {
    const img = document.getElementById('imgGrande');
    const modal = document.getElementById('modalFotoGrande');
    if (img && modal) {
        img.src = src;
        modal.classList.add('active');
    }
}

function fecharFotoGrande() {
    const modal = document.getElementById('modalFotoGrande');
    if (modal) modal.classList.remove('active');
}

// ==========================================
// GERAR RELATÓRIO EM PDF
// ==========================================
function gerarRelatorioPDF() {
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const tabelaOriginal = document.querySelector("table");
    if (!tabelaOriginal) {
        alert("Nenhuma tabela encontrada para gerar o relatório.");
        return;
    }

    const elementoRelatorio = document.createElement("div");
    elementoRelatorio.style.padding = "20px";
    elementoRelatorio.style.fontFamily = "'Inter', Arial, sans-serif";

    elementoRelatorio.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="margin: 0; color: #1e293b; font-size: 20px;">Almoxarifado 2.0 - Relatório de Inventário A&V (183)</h1>
            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">Gerado em: ${dataAtual} às ${horaAtual} | Total de Itens: ${inventario.length}</p>
        </div>
        ${tabelaOriginal.outerHTML}
    `;

    const botoesAcao = elementoRelatorio.querySelectorAll(".action-buttons, th:last-child, td:last-child");
    botoesAcao.forEach(el => el.remove());

    const opcoes = {
        margin: [10, 10, 10, 10],
        filename: `Inventario_AV_183_${dataAtual.replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opcoes).from(elementoRelatorio).save();
}

// ==========================================
// DUPLICAR ITEM
// ==========================================
async function duplicarItem(id) {
    const itemOriginal = inventario.find(item => String(item.id) === String(id));

    if (!itemOriginal) {
        alert("Erro ao encontrar o item para duplicar.");
        return;
    }

    document.getElementById("categoria").value = itemOriginal.categoria || "Outros";
    autoPreencherPatrimonio();

    const patInfo = extrairPatrimonioENumero(itemOriginal);
    const campoPat = document.getElementById("patrimonio");
    const campoNumPat = document.getElementById("num_patrimonio") || document.getElementById("codigo");
    if (campoPat && patInfo.patrimonio && patInfo.patrimonio !== '-') {
        campoPat.value = patInfo.patrimonio;
    }
    if (campoNumPat) {
        campoNumPat.value = (patInfo.numPatrimonio && patInfo.numPatrimonio !== '-') ? `${patInfo.numPatrimonio}` : "";
    }
    document.getElementById("marca").value = itemOriginal.marca || "";
    document.getElementById("modelo").value = itemOriginal.modelo || "";
    document.getElementById("sn").value = itemOriginal.sn ? `${itemOriginal.sn} (CÓPIA)` : "S/N";
    document.getElementById("quantidade").value = itemOriginal.quantidade ?? 1;
    document.getElementById("local").value = itemOriginal.local || "01.03.21.007";
    document.getElementById("observacoes").value = itemOriginal.observacoes || "";

    const previewContainer = document.getElementById("previewCadastro");
    if (previewContainer) {
        if (itemOriginal.foto) {
            previewContainer.innerHTML = `<img src="${itemOriginal.foto}" style="max-width: 80px; max-height: 80px; border-radius: 6px;">`;
        } else {
            previewContainer.innerHTML = "";
        }
    }

    abrirModalCadastro();
}

// ==========================================
// LOGOUT
// ==========================================
async function fazerLogout() {
    if (confirm("Deseja realmente sair da sessão?")) {
        if (supabaseClient) await supabaseClient.auth.signOut();
        window.location.href = 'login183.html';
    }
}