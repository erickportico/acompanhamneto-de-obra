
                let modoNovaObra = false;
                let tipoImportacaoAtual = 'producao';
                let medicaoselecionadaIndex = 1;
                let renderTimer = null;
            
                let chartInstanceLiberacao = null;
                let chartInstanceFabricacao = null;
                let chartInstanceInstalacao = null;
                let chartInstanceResumo = null;
                let chartInstanceInstalacaoPeriodo = null; // PATCH 30
                let periodoInstalacaoAtual = 'mensal';    // PATCH 30
            
                function alternarTema() {
                    document.body.classList.toggle('dark-mode');
                    const isDark = document.body.classList.contains('dark-mode');
                    localStorage.setItem('theme_preference', isDark ? 'dark' : 'light');
                    document.getElementById('btnThemeToggle').innerText = isDark ? '☀️ Modo Claro' : '🌙 Modo Escuro';
                    render();
                }
            
                function carregarTemaPreferido() {
                    const pref = localStorage.getItem('theme_preference') || 'dark';
                    if (pref === 'dark') {
                        document.body.classList.add('dark-mode');
                        document.getElementById('btnThemeToggle').innerText = '☀️ Modo Claro';
                    } else {
                        document.body.classList.remove('dark-mode');
                        document.getElementById('btnThemeToggle').innerText = '🌙 Modo Escuro';
                    }
                }
            
                function toggleSettingsMenu() {
                    const menu = document.getElementById('settingsMenu');
                    if (menu) menu.classList.toggle('open');
                }
            
                function carregarBancoComMigracao() {
                    const chavesHistoricas = ['obrasDB_v8', 'obrasDB_v7', 'obrasDB_v6', 'obrasDB_v5', 'obrasDB_v4', 'obrasDB_v3', 'obrasDB_v2', 'obrasDB'];
                    let mapaObras = new Map();
                    let configRecuperada = { dimensoes: true, fem: true, fab: true, inst: true };
                    let ultimaObraAtiva = null;
            
                    for (let i = chavesHistoricas.length - 1; i >= 0; i--) {
                        let chave = chavesHistoricas[i];
                        let rawData = localStorage.getItem(chave);
                        if (rawData) {
                            try {
                                let parsed = JSON.parse(rawData);
                                if (parsed.config) configRecuperada = parsed.config;
                                if (parsed.obraAtualId) ultimaObraAtiva = parsed.obraAtualId;
            
                                let lista = parsed.obras || (Array.isArray(parsed) ? parsed : []);
                                lista.forEach(o => {
                                    if (o && o.nome) {
                                        o.pctServico = o.pctServico !== undefined ? o.pctServico : 20;
                                        o.valorContrato = o.valorContrato || 0;
                                        o.numMedicaoMax = o.numMedicaoMax || 1;
                                        o.consideracoesPorMedicao = o.consideracoesPorMedicao || {};
                                        o.itens = o.itens || [];
                                        o.recebimentos = o.recebimentos || [];
                                        o.ctmLogs = o.ctmLogs || [];
                                        o.ctmExtraSpecs = o.ctmExtraSpecs || [];
            
                                        o.itens.forEach(it => {
                                            if (!it.historicoMedicoes) {
                                                it.historicoMedicoes = {};
                                                if (it.m2MedicaoAnterior) it.historicoMedicoes[1] = it.m2MedicaoAnterior;
                                                if (it.m2MedicaoAtual) it.historicoMedicoes[o.numMedicaoMax] = it.m2MedicaoAtual;
                                            }
                                            // Migração CTM: garantir campos de tolerância nos itens existentes
                                            if (it.hasBottom === undefined) it.hasBottom = true;
                                            if (!it.ctmProfile) it.ctmProfile = 'largo';
                                        });
            
                                        // FIX: usar o.id como chave para NÃO deduplicar obras com nomes parecidos
                                        const obraKey = o.id || ('obra_' + Date.now() + '_' + Math.random().toString(36).slice(2));
                                        if (!o.id) o.id = obraKey; // garantir id se veio sem
                                        mapaObras.set(obraKey, o);
                                    }
                                });
                            } catch (e) { console.error("Erro ao ler chave " + chave, e); }
                        }
                    }
            
                    let obrasFinais = Array.from(mapaObras.values());
                    if (obrasFinais.length === 0) {
                        obrasFinais = [{ id: 'burj_lavie', nome: 'BURJ LAVIE', numContrato: '', valorContrato: 1750000, pctServico: 20, numMedicaoMax: 1, consideracoesPorMedicao: {}, itens: [], recebimentos: [],
                            ctmLogs: [],
                            ctmExtraSpecs: [] }];
                    }
            
                    let obraAtualIdFinal = obrasFinais[0].id;
                    if (ultimaObraAtiva && obrasFinais.some(o => o.id === ultimaObraAtiva)) {
                        obraAtualIdFinal = ultimaObraAtiva;
                    }
            
                    return { obras: obrasFinais, obraAtualId: obraAtualIdFinal, config: configRecuperada };
                }
            
                let db = carregarBancoComMigracao();
                window.dbObras = db.obras;  // sincronizar referência global na inicialização
            
                // --- Diagnóstico de dados: verificar se obra atual tem itens ---
                (function diagnosticarDados() {
                    const obra = db.obras.find(o => o.id === db.obraAtualId) || db.obras[0];
                    if (obra && obra.itens && obra.itens.length > 0) {
                    } else {
                        console.warn(`⚠️ [Diagnóstico] Obra "${obra?.nome || 'N/A'}" sem itens. Verificando chaves de backup no localStorage...`);
                        const chavesBackup = [];
                        for (let i = 0; i < localStorage.length; i++) {
                            const k = localStorage.key(i);
                            if (k.startsWith('obrasDB_') || k.startsWith('obrasDB')) {
                                chavesBackup.push(k);
                            }
                        }
                        if (chavesBackup.length > 0) {
                            chavesBackup.forEach(k => {
                                try {
                                    const raw = localStorage.getItem(k);
                                    const parsed = JSON.parse(raw);
                                    const obras = parsed.obras || (Array.isArray(parsed) ? parsed : []);
                                    const totalItens = obras.reduce((s, o) => s + (o.itens?.length || 0), 0);
                                    if (totalItens > 0) console.log(`    → DADOS ENCONTRADOS nesta chave! Considere importar manualmente.`);
                                } catch(e) { console.log(`  ↳ ${k}: erro ao ler`); }
                            });
                        } else {
                            console.warn(`📋 [Diagnóstico] Nenhuma chave obrasDB* encontrada no localStorage.`);
                        }
                    }
                })();
            
                let bancoNuvemRev = 0;
                let bancoNuvemDisponivel = false;
                let bancoNuvemCarregado = false;
                let sincronizacaoPutEmAndamento = false;
                let filaSincronizacaoNuvem = Promise.resolve();
                let sincronizacaoNuvemAtiva = true;
            
                function atualizarStatusNuvem(texto, tipo = 'normal') {
                    const el = document.getElementById('statusNuvem');
                    if (!el) return;
                    el.textContent = texto;
                    el.style.background = tipo === 'ok' ? '#168a55' : tipo === 'erro' ? '#c0392b' : '#5f6b7a';
                }
            
                function mostrarToastPainel(msg, tipo = 'ok') {
                    let container = document.getElementById('toastContainerPainel');
                    if (!container) {
                        container = document.createElement('div');
                        container.id = 'toastContainerPainel';
                        container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
                        document.body.appendChild(container);
                    }
                    const toast = document.createElement('div');
                    toast.style.cssText = `
                        padding:12px 20px;border-radius:8px;color:#fff;font-size:14px;font-weight:600;
                        background:${tipo === 'ok' ? '#168a55' : tipo === 'erro' ? '#c0392b' : '#5f6b7a'};
                        box-shadow:0 4px 16px rgba(0,0,0,.25);pointer-events:auto;opacity:0;transform:translateX(40px);
                        transition:all .35s ease;
                    `;
                    toast.textContent = msg;
                    container.appendChild(toast);
                    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; });
                    setTimeout(() => {
                        toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)';
                        setTimeout(() => toast.remove(), 400);
                    }, 4000);
                }
            
                function salvarLocalComoBackup() {
                    try { localStorage.setItem('obrasDB_v8', JSON.stringify(db)); } catch (e) { console.warn(e); }
                }
            
                /* ---------- MERGE nuvem↔local (preserva dados locais que nuvem não tem) ---------- */
                function mesclarObrasNuvemComLocal(dbNuvem) {
                    if (!dbNuvem || !Array.isArray(dbNuvem.obras)) return;
                    // PROTEÃ‡ÃƒO: se nuvem retorna obras vazias, NÃƒO substituir dados locais
                    if (dbNuvem.obras.length === 0) {
                        console.warn('[MERGE] Nuvem retornou 0 obras â€” mantendo dados locais.');
                        return;
                    }
                    // PROTEÃ‡ÃƒO: se nuvem tem obra com valorContrato 0 mas local tem > 0, preferir local
                    if (!db || !Array.isArray(db.obras) || db.obras.length === 0) {
                        // Antes de aceitar nuvem cegamente, verificar se nuvem tem dados vÃ¡lidos
                        var nuvemTemDadosValidos = dbNuvem.obras.some(function(o) {
                            return o.valorContrato > 0 || (o.itens && o.itens.length > 0);
                        });
                        if (nuvemTemDadosValidos) {
                            db = JSON.parse(JSON.stringify(dbNuvem));
                            return;
                        } else {
                            console.warn('[MERGE] Nuvem nÃ£o tem dados vÃ¡lidos (sem contrato, sem itens) â€” mantendo dados locais.');
                            return;
                        }
                    }
                    const mapLocal = {};
                    db.obras.forEach(o => { mapLocal[o.id] = o; });
                    const mapNuvem = {};
                    dbNuvem.obras.forEach(o => { mapNuvem[o.id] = o; });
                    const idsLocais = new Set(Object.keys(mapLocal));
                    const idsNuvem = new Set(Object.keys(mapNuvem));
                    const resultado = [];
                    for (const id of idsNuvem) {
                        if (idsLocais.has(id)) {
                            // Manter versão com mais dados (mais itens) — preserva trabalho local
                            const obraLocal = mapLocal[id];
                            const obraNuvem = mapNuvem[id];
                            const itensLocal = (obraLocal.itens || []).length;
                            const itensNuvem = (obraNuvem.itens || []).length;
                            // Proteção extra: obras criadas recentemente localmente (últimos 60s)
                            // sempre prevalecem — evita perder obra recém-criada
                            const obraCriadaRecentemente = id.startsWith('obra_') &&
                                (Date.now() - Number(id.replace('obra_', ''))) < 60000;
                            // ProteÃ§Ã£o: se local tem valorContrato > 0 e nuvem tem 0, manter local
                            var localTemValor = (obraLocal.valorContrato || 0) > 0;
                            var nuvemTemValor = (obraNuvem.valorContrato || 0) > 0;
                            if (itensLocal >= itensNuvem || obraCriadaRecentemente || (localTemValor && !nuvemTemValor)) {
                                resultado.push(JSON.parse(JSON.stringify(obraLocal)));
                            } else if (!localTemValor && nuvemTemValor) {
                                resultado.push(JSON.parse(JSON.stringify(obraNuvem)));
                            } else if (itensLocal >= itensNuvem) {
                                resultado.push(JSON.parse(JSON.stringify(obraLocal)));
                            } else {
                                resultado.push(JSON.parse(JSON.stringify(obraNuvem)));
                            }
                        } else {
                            resultado.push(JSON.parse(JSON.stringify(mapNuvem[id])));
                        }
                    }
                    for (const id of idsLocais) {
                        if (!idsNuvem.has(id)) {
                            resultado.push(JSON.parse(JSON.stringify(mapLocal[id])));
                        }
                    }
                    db.obras = resultado;
                    if (dbNuvem.versaoBanco && !db.versaoBanco) db.versaoBanco = dbNuvem.versaoBanco;
                }
            
              async function carregarBancoDaNuvem() {
                atualizarStatusNuvem('🔄 Conectando aos servidores...', 'normal');
            
                let bancoEncontrado = null;
                let fonte = '';
            
                // 1. Tenta carregar do Supabase
                try {
                    if (typeof _supabase !== 'undefined' && _supabase) {
                        const { data, error } = await _supabase
                            .from('painel_dados')
                            .select('dados')
                            .eq('id', 1)
                            .single();
            
                        if (!error && data && data.dados) {
                            bancoEncontrado = data.dados.db ? data.dados.db : data.dados;
                            if (bancoEncontrado && bancoEncontrado.obras && bancoEncontrado.obras.length > 0) {
                                /* [v8] contar itens totais na nuvem */
                                var _totalItensNuvem = 0;
                                try { bancoEncontrado.obras.forEach(function(o){ _totalItensNuvem += (o.itens||[]).length; }); } catch(e){}
                                var _dbLocal = (typeof db !== 'undefined' && db) ? db : null;
                                var _totalItensLocal = 0;
                                if (_dbLocal && _dbLocal.obras) { try { _dbLocal.obras.forEach(function(o){ _totalItensLocal += (o.itens||[]).length; }); } catch(e){} }
                                if (_totalItensNuvem === 0 && _totalItensLocal > 0) {
                                    console.warn('[v8] Nuvem tem obras mas itens=0 — preservando dados locais ('+_totalItensLocal+' itens)');
                                    bancoEncontrado = null;
                                } else {
                                    fonte = '⚡ Supabase Online';
                                }
                            } else {
                                bancoEncontrado = null;
                            }
                        }
                    }
                } catch (errSupabase) {
                    console.warn('⚠️ Supabase indisponível no momento:', errSupabase);
                }
            
                // 2. Se não encontrou na nuvem, busca do LocalStorage local como fallback
                if (!bancoEncontrado) {
                    try {
                        const localData = localStorage.getItem('obrasDB_v8');
                        if (localData) {
                            const parsed = JSON.parse(localData);
                            bancoEncontrado = parsed.db ? parsed.db : parsed;
                            if (bancoEncontrado && bancoEncontrado.obras && bancoEncontrado.obras.length > 0) {
                                var _ttl2 = 0;
                                try { bancoEncontrado.obras.forEach(function(o){ _ttl2 += (o.itens||[]).length; }); } catch(e){}
                                var _dbL2 = (typeof db !== 'undefined' && db) ? db : null;
                                var _localIt2 = 0;
                                if (_dbL2 && _dbL2.obras) { try { _dbL2.obras.forEach(function(o){ _localIt2 += (o.itens||[]).length; }); } catch(e){} }
                                if (_ttl2 === 0 && _localIt2 > 0) {
                                    console.warn('[v8] LocalStorage tem obras mas itens=0 — preservando memoria ('+_localIt2+' itens)');
                                    bancoEncontrado = null;
                                } else {
                                    fonte = '💾 Armazenamento Local';
                                }
                            } else {
                                bancoEncontrado = null;
                            }
                        }
                    } catch (errLocal) {
                        console.warn('⚠️ Erro ao carregar do LocalStorage:', errLocal);
                    }
                }
            
                // 3. Aplica os dados com segurança e inicializa a interface
                if (bancoEncontrado && bancoEncontrado.obras) {
                    db = bancoEncontrado;
                    if (!db.config) {
                        db.config = { dimensoes: true, fem: true, fab: true, inst: true };
                    }
                    
                    window.db = db;
                    window.dbObras = db.obras;
            
                    if (typeof popularSelectObras === 'function') popularSelectObras();
                    if (typeof render === 'function') render();
            
                    atualizarStatusNuvem(`${fonte} (${db.obras.length} obras)`, 'ok');
                } else {
                    atualizarStatusNuvem('⚠️ Nenhum dado encontrado. Importe um arquivo JSON.', 'normal');
                    if (typeof render === 'function') render();
                }
            }
            
            async function salvarNoServidorLocal() {
                try {
                    // Busca as obras diretamente do objeto `db.obras` ou das variáveis globais
                    const obrasParaSalvar = (typeof db !== 'undefined' && db.obras) 
                        ? db.obras 
                        : (window.obrasDB || (typeof obrasDB !== 'undefined' ? obrasDB : []));
            
                    if (!obrasParaSalvar || obrasParaSalvar.length === 0) {
                        alert("⚠️ Nenhuma obra encontrada na memória para salvar.");
                        return;
                    }
            
                    // Monta o pacote no formato esperado pelo Supabase e servidor Python
                    const pacote = {
                        db: {
                            obras: obrasParaSalvar
                        },
                        revision: Date.now()
                    };
            
                  // 1. Tenta salvar no Supabase (Banco de Dados Online para todos os usuários)
                try {
                    const { error } = await _supabase
                        .from('painel_dados')
                        .upsert({ id: 1, dados: pacote, updated_at: new Date() });
            
                    if (error) throw error;
                } catch (errSupabase) {
                    console.error("⚠️ Erro ao salvar no Supabase:", errSupabase);
                }
            
                // 2. Salva no Servidor Local (se estiver rodando o Python)
                try {
                    const resposta = await fetch('/api/salvar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(pacote)
                    });
            
                    if (resposta.ok) {
                        mostrarToastPainel('⚡ Salvo na nuvem e no HD!', 'ok');
                        atualizarStatusNuvem(`⚡ Supabase Conectado (${obrasParaSalvar.length} obras)`, 'ok');
                    } else {
                        // Se o servidor local não responder mas o Supabase salvou, avisa o usuário
                        mostrarToastPainel('⚡ Salvo na Nuvem Supabase!', 'ok');
                    }
                } catch (erro) {
                    console.warn("Servidor local Python offline. Dados mantidos na nuvem Supabase.");
                    mostrarToastPainel('⚡ Salvo na Nuvem Supabase!', 'ok');
                    atualizarStatusNuvem(`⚡ Supabase Online (${obrasParaSalvar.length} obras)`, 'ok');
                }
            } catch (erroGeral) {
                console.error("Erro ao salvar:", erroGeral);
            }
            }
            function sincronizarBancoNuvem() {
                // Força a ativação da nuvem caso estivesse desligada (Servidor Local)
                sincronizacaoNuvemAtiva = true;
            
                filaSincronizacaoNuvem = filaSincronizacaoNuvem.then(async () => {
                    sincronizacaoPutEmAndamento = true;
                    const bancoParaEnviar = JSON.parse(JSON.stringify(db));
                    atualizarStatusNuvem('☁️ Salvando...', 'normal');
            
                    try {
                        const { error } = await _supabase
                            .from('painel_dados')
                            .upsert({ 
                                id: 1, 
                                dados: bancoParaEnviar, 
                                updated_at: new Date() 
                            });
            
                        if (!error) {
                            atualizarStatusNuvem('⚡ Supabase Realtime Ativo', 'ok');
                        } else {
                            console.error("Erro no Supabase:", error);
                            try { localStorage.setItem('obrasDB_v8', JSON.stringify(db)); console.log('[PATCH157] Fallback: dados salvos no localStorage (nuvem indisponivel).'); } catch (eLS) { console.warn('[PATCH157] Fallback localStorage falhou:', eLS); }  /* PATCH157_CLOUD_FALLBACK */
                            atualizarStatusNuvem('⚠️ Erro de Salvamento', 'erro');
                        }
                    } catch (erro) {
                        console.error("Falha ao conectar no Supabase:", erro);
                        try { localStorage.setItem('obrasDB_v8', JSON.stringify(db)); console.log('[PATCH157] Fallback (catch): dados salvos no localStorage.'); } catch (eLS2) {}  /* PATCH157_CATCH_FALLBACK */
                        atualizarStatusNuvem('⚠️ Supabase Indisponível', 'erro');
                    } finally {
                        sincronizacaoPutEmAndamento = false;
                    }
                }).catch(erro => console.error('Fila de sincronização:', erro));
            }
                async function inicializarBancoNuvem() {
                    
                    try { render(); } catch (e) { console.warn(e); }
                    var dbPreNuvem = JSON.parse(JSON.stringify(db));
                  await carregarBancoDaNuvem();
            
                    // PROTEÇÃO: Se após o carregamento da nuvem db.obras está vazio, restaura o backup local
                    if (!db.obras || db.obras.length === 0) {
                        console.warn('[INIT] Após tentativa de carregar da nuvem, db.obras ficou vazio — restaurando backup local.');
                        if (typeof dbPreNuvem !== 'undefined' && dbPreNuvem && dbPreNuvem.obras && dbPreNuvem.obras.length > 0) {
                            db = dbPreNuvem;
                        } else {
                            // Fallback direto do localStorage se dbPreNuvem também estiver vazio
                            const backupBruto = localStorage.getItem('obrasDB_v8') || localStorage.getItem('obrasDB_v8_pre_nuvem_backup');
                            if (backupBruto) {
                                db = JSON.parse(backupBruto);
                            }
                        }
                        if (typeof salvarLocalComoBackup === 'function') salvarLocalComoBackup();
                        if (typeof render === 'function') render();
                        if (typeof mostrarToastPainel === 'function') mostrarToastPainel('⚠️ Dados da nuvem indisponíveis. Backup local mantido.', 'erro');
                    } else {
                        // Verificar se alguma obra local importante foi ignorada no merge
                        var idsPreNuvem = new Set(((dbPreNuvem && dbPreNuvem.obras) || []).map(function(o) { return o.id; }));
                        var idsPosMerge = new Set(db.obras.map(function(o) { return o.id; }));
                        var obrasPerdidas = ((dbPreNuvem && dbPreNuvem.obras) || []).filter(function(o) {
                            return !idsPosMerge.has(o.id) && (o.valorContrato || 0) > 0;
                        });
                        if (obrasPerdidas.length > 0) {
                            console.warn('[INIT] Obras com valorContrato foram perdidas no merge â€” restaurando:', obrasPerdidas.map(function(o){return o.id;}));
                            db.obras = db.obras.concat(JSON.parse(JSON.stringify(obrasPerdidas)));
                            salvarLocalComoBackup();
                            render();
                        }
                    }
                    iniciarAtualizacaoEmTempoReal();
                }
            function iniciarAtualizacaoEmTempoReal() {
                    if (window.__painelRealtimeAtivo) return;
                    window.__painelRealtimeAtivo = true;
            
                    // DESATIVADO: A sincronização em tempo real agora é mantida nativamente pelo Supabase
                }
            
                function criarPacoteBancoMultiBrowser() {
                    return {
                        formato: 'PAINEL_CONTROLE_OBRAS',
                        versaoBanco: 'multi-browser-1',
                        dataExportacao: new Date().toISOString(),
                        origem: 'Painel de Controle de Obras',
                        banco: JSON.parse(JSON.stringify(db))
                    };
                }
            
                function resumoBancoAtualMultiBrowser() {
                    const obras = Array.isArray(db.obras) ? db.obras : [];
                function abrirBancoCompartilhado() {
                    document.getElementById('modalBancoCompartilhado').style.display = 'flex';
                    const r = resumoBancoAtualMultiBrowser();
                    document.getElementById('statusBancoMultiBrowser').innerHTML =
                        `Obras: <b>${r.obras}</b> &nbsp;|&nbsp; Itens de produção: <b>${r.itens}</b> &nbsp;|&nbsp; Recebimentos: <b>${r.recebimentos}</b>`;
                }
                }
            
                function fecharBancoCompartilhado() {
                    document.getElementById('modalBancoCompartilhado').style.display = 'none';
                }
            
                function exportarBancoMultiBrowser() {
                    const pacote = criarPacoteBancoMultiBrowser();
                    const nome = `Banco_Obras_${new Date().toISOString().slice(0, 10)}.json`;
                    const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = nome;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    alert('Banco exportado com sucesso. Você pode levar este arquivo para outro navegador ou computador.');
                }
            
                async function importarBancoMultiBrowser(event) {
                const file = event.target.files[0];
                if (!file) return;
            
                const reader = new FileReader();
                reader.onload = async function(e) {
                    try {
                        const conteudo = JSON.parse(e.target.result);
                        
                        // 1. Busca flexível da lista de obras
                        let listaObras = null;
            
                        if (Array.isArray(conteudo)) {
                            listaObras = conteudo;
                        } else if (conteudo.obras && Array.isArray(conteudo.obras)) {
                            listaObras = conteudo.obras;
                        } else if (conteudo.db && conteudo.db.obras && Array.isArray(conteudo.db.obras)) {
                            listaObras = conteudo.db.obras;
                        } else {
                            for (const chave in conteudo) {
                                if (Array.isArray(conteudo[chave])) {
                                    listaObras = conteudo[chave];
                                    break;
                                } else if (conteudo[chave] && Array.isArray(conteudo[chave].obras)) {
                                    listaObras = conteudo[chave].obras;
                                    break;
                                }
                            }
                        }
            
                        if (!listaObras || !Array.isArray(listaObras)) {
                            alert("⚠️ Não foi possível identificar a lista de obras dentro deste arquivo JSON.");
                            return;
                        }
            
                        // 2. SANITIZAÇÃO: Garante que toda obra e todo item tenham 'dimensoes' e estruturas obrigatórias
                        listaObras.forEach(obra => {
                            if (!obra.itens || !Array.isArray(obra.itens)) {
                                obra.itens = [];
                            }
                            obra.itens.forEach(item => {
                                if (!item.dimensoes) {
                                    item.dimensoes = {
                                        largura: item.largura || 0,
                                        altura: item.altura || 0,
                                        quantidade: item.quantidade || item.qtd || 1,
                                        areaTotal: item.areaTotal || 0
                                    };
                                }
                            });
                        });
            
                        // 3. Monta e sincroniza variáveis globais
                        db = { obras: listaObras, rev: Date.now() };
                        window.db = db;
                        window.dbObras = db.obras;
                        window.obrasDB = db.obras;
            
                        const payloadFinal = { db: db };
            
                        // 4. Salva localmente
                        localStorage.setItem('obrasDB_v8', JSON.stringify(payloadFinal));
                        localStorage.setItem('painel_obras_dados', JSON.stringify(payloadFinal));
            
                        // 5. Salva na nuvem (Supabase)
                        if (typeof _supabase !== 'undefined' && _supabase) {
                            if (typeof atualizarStatusNuvem === 'function') {
                                atualizarStatusNuvem('🔄 Enviando novo banco para a nuvem...', 'normal');
                            }
                            const { error } = await _supabase
                                .from('painel_dados')
                                .upsert({ id: 1, dados: payloadFinal, updated_at: new Date().toISOString() });
            
                            if (error) {
                                console.error("❌ Erro ao enviar para o Supabase:", error);
                                alert("Erro ao salvar na nuvem: " + error.message);
                                return;
                            }
                        }
            
                        // 6. Atualiza a interface
                        if (typeof popularSelectObras === 'function') popularSelectObras();
                        if (typeof preencherSelectObras === 'function') preencherSelectObras();
                        
                        try {
                            if (typeof render === 'function') render();
                        } catch (errRender) {
                            console.warn("⚠️ Renderização inicial com aviso:", errRender);
                        }
            
                        if (typeof atualizarStatusNuvem === 'function') {
                            atualizarStatusNuvem(`⚡ Supabase Online (${db.obras.length} obras)`, 'ok');
                        }
                        alert(`🎉 Sucesso! Backup com ${db.obras.length} obras importado e salvo na nuvem!`);
            
                    } catch (err) {
                        console.error("Erro na leitura do arquivo:", err);
                        alert("⚠️ Erro ao processar o arquivo de backup.");
                    }
                };
            
                reader.readAsText(file);
            }
            
                function lerBancoLocalStorageSeguro(chave) {
                    const raw = localStorage.getItem(chave);
                    if (!raw) return null;
                    try {
                        const parsed = JSON.parse(raw);
                        const obras = parsed.obras || (Array.isArray(parsed) ? parsed : []);
                        if (!Array.isArray(obras)) return null;
                        return { parsed, obras };
                    } catch (e) {
                        return null;
                    }
                }
            
                function resumoBancoRecuperacao(chave) {
                    const banco = lerBancoLocalStorageSeguro(chave);
                    if (!banco) return null;
                    return {
                        chave,
                        obras: banco.obras.length,
                        itens: banco.obras.reduce((s, o) => s + ((o && Array.isArray(o.itens)) ? o.itens.length : 0), 0),
                        recebimentos: banco.obras.reduce((s, o) => s + ((o && Array.isArray(o.recebimentos)) ? o.recebimentos.length : 0), 0),
                        parsed: banco.parsed
                    };
                }
            
                function abrirRecuperacaoDados() {
                    const modal = document.getElementById('modalRecuperacaoDados');
                    modal.style.display = 'flex';
            
                    const chaves = ['obrasDB', 'obrasDB_v2', 'obrasDB_v3', 'obrasDB_v4', 'obrasDB_v5', 'obrasDB_v6', 'obrasDB_v7', 'obrasDB_v8'];
                    const resumos = chaves.map(resumoBancoRecuperacao).filter(Boolean);
                    const tbody = document.getElementById('tbodyRecuperacaoDados');
            
                    if (!resumos.length) {
                        document.getElementById('recuperacaoStatus').innerHTML =
                            '⚠️ Nenhuma versão antiga do banco foi encontrada neste navegador.';
                        tbody.innerHTML = '';
                        return;
                    }
            
                    document.getElementById('recuperacaoStatus').innerHTML =
                        `Encontradas <b>${resumos.length}</b> versão(ões) do banco. <span style="font-weight:400">Escolha a versão com a maior quantidade de itens se ela representar seus dados antigos.</span>`;
            
                    tbody.innerHTML = resumos.map(r => `
                            <tr>
                                <td><b>${r.chave}</b></td>
                                <td>${r.obras}</td>
                                <td>${r.itens}</td>
                                <td>${r.recebimentos}</td>
                                <td><button class="warning" onclick="recuperarBancoHistorico('${r.chave}')">Recuperar esta versão</button></td>
                            </tr>
                        `).join('');
                }
            
                function fecharRecuperacaoDados() {
                    document.getElementById('modalRecuperacaoDados').style.display = 'none';
                }
            
                function recuperarBancoHistorico(chave) {
                    const origem = lerBancoLocalStorageSeguro(chave);
                    if (!origem) {
                        alert('Não foi possível ler ' + chave + '.');
                        return;
                    }
            
                    const totalItens = origem.obras.reduce((s, o) => s + ((o && Array.isArray(o.itens)) ? o.itens.length : 0), 0);
                    const totalReceb = origem.obras.reduce((s, o) => s + ((o && Array.isArray(o.recebimentos)) ? o.recebimentos.length : 0), 0);
            
                    if (!confirm(
                        `Recuperar ${chave}?\n\n` +
                        `Obras: ${origem.obras.length}\n` +
                        `Itens de produção: ${totalItens}\n` +
                        `Recebimentos: ${totalReceb}\n\n` +
                        `Antes da recuperação será criada uma cópia do banco atual.`
                    )) return;
            
                    localStorage.setItem(
                        'obrasDB_pre_recuperacao_' + new Date().toISOString().replace(/[:.]/g, '-'),
                        localStorage.getItem('obrasDB_v8') || JSON.stringify(db)
                    );
            
                    const recuperado = JSON.parse(JSON.stringify(origem.parsed));
                    recuperado.obras = (recuperado.obras || origem.obras).map(o => {
                        o.itens = Array.isArray(o.itens) ? o.itens : [];
                        o.recebimentos = Array.isArray(o.recebimentos) ? o.recebimentos : [];
                        return o;
                    });
            
                    if (!recuperado.obraAtualId && recuperado.obras.length) {
                        recuperado.obraAtualId = recuperado.obras[0].id;
                    }
                    localStorage.setItem('obrasDB_v8', JSON.stringify(recuperado));
            
                    alert(
                        `Recuperação concluída.\n\n` +
                        `${totalItens} item(ns) de produção foram recuperados de ${chave}.\n` +
                        `O banco anterior também foi preservado como cópia de segurança.`
                    );
                    location.reload();
                }
            
                function salvarDB(reRender = true) {
                salvarLocalComoBackup();
                window.dbObras = db.obras; // Sincroniza referência global
            
                // 1. Atualiza o menu do Select de Obras
                if (typeof popularSelectObras === 'function') popularSelectObras();
                if (typeof preencherSelectObras === 'function') preencherSelectObras();
            
                // 2. Renderiza a interface
                if (reRender && typeof render === 'function') render();
            
                // 3. Envia para o Supabase
                sincronizarBancoNuvem();
            }
            
                function debounceRender() {
                    clearTimeout(renderTimer);
                    renderTimer = setTimeout(() => render(), 250);
                }
                window.debounceRender = debounceRender;
                window.debounceRender = debounceRender;
            
                function getObraAtual() {
                    let o = db.obras.find(o => o.id === db.obraAtualId);
                    if (!o) { o = db.obras[0]; db.obraAtualId = o.id; }
                    return o;
                }
            
                function trocarObra(id) {
                    db.obraAtualId = id;
                    cronogramaInitialized = false;
                    salvarDB();
                    render();
                }
            
                function trocarAba(aba) {
                    const abas = ['itens', 'liberacao', 'medicoes', 'graficos', 'recebimento', 'cronograma', 'pagamento', 'ctm', 'custo'];
                    // Adicione esta linha no início ou fim da sua função trocarAba existente:
document.getElementById('meu-menu-abas')?.removeAttribute('open');
                    abas.forEach(a => {
                        const el = document.getElementById('tab-' + a);
                        const btn = document.getElementById('btn-tab-' + a);
                        if (el) el.style.display = (a === aba) ? 'block' : 'none';
                        if (btn) {
                            if (a === aba) btn.classList.add('active');
                            else btn.classList.remove('active');
                        }
                    });
                    if (aba === 'cronograma') {
                        initCronograma();
                    }
                    if (aba === 'custo') {
                        initCustoTab();
                    }
                    render();
                }
            
                
                /* ========== CRONOGRAMA GANTT JAVASCRIPT ========== */
            const lowerWords = new Set([
                  'a', 'o', 'e', 'de', 'do', 'da', 'dos', 'das', 
                  'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 
                  'por', 'para', 'com', 'sem', 'sob', 'ante', 'até'
                ]);
            
                function toCronoTitleCase(str) {
                  if (!str) return '';
                  return str.trim().split(/\s+/).map((word, index) => {
                    let cleanWord = word.toLowerCase();
                    if (index === 0) return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
                    if (lowerWords.has(cleanWord) || (cleanWord.length <= 2 && !/[0-9]/.test(cleanWord))) return cleanWord;
                    return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
                  }).join(' ');
                }
            
                function formatCronoDateBR(dateStr) {
                  if(!dateStr) return '-';
                  const [year, month, day] = dateStr.split('-');
                  return `${day}/${month}/${year}`;
                }
            
                function getCronoTaskStatus(startStr, endStr, actualEndStr) {
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  
                  const start = new Date(startStr + "T00:00:00");
                  const end = new Date(endStr + "T00:00:00");
            
                  if (actualEndStr) {
                    const actualEnd = new Date(actualEndStr + "T00:00:00");
                    if (actualEnd < end) {
                      return { label: '⚡ Concluído Antecipado', code: 'early', badge: 'badge-early' };
                    } else if (actualEnd > end) {
                      return { label: '🚨 Concluído c/ Atraso', code: 'late-done', badge: 'badge-late-done' };
                    } else {
                      return { label: '✅ Concluído no Prazo', code: 'done', badge: 'badge-done' };
                    }
                  }
            
                  if (today > end) {
                    return { label: '⚠️ Em Atraso', code: 'delayed', badge: 'badge-delayed' };
                  }
            
                  if (today >= start && today <= end) {
                    return { label: '⏳ Em Andamento', code: 'doing', badge: 'badge-doing' };
                  }
            
                  return { label: '📅 A Fazer', code: 'todo', badge: 'badge-todo' };
                }
            
                const colorOptions = [
                  { value: 'verde', label: '🟢' },
                  { value: 'azul', label: '🔵' },
                  { value: 'laranja', label: '🟠' },
                  { value: 'vermelho', label: '🔴' },
                  { value: 'roxo', label: '🟣' },
                  { value: 'amarelo', label: '🟡' },
                  { value: 'rosa', label: '🩷' },
                  { value: 'cinza', label: '⚪' }
                ];
            
                const defaultTasks = [
                  { id: 1, group: "GET A WAY - EDILSON E LENNON", name: "Instalação de Muxarabís Térreo", start: "2026-08-03", end: "2026-09-02", actualEnd: "", color: "verde" },
                  { id: 2, group: "GET A WAY - EDILSON E LENNON", name: "Instalação de Corrimão", start: "2026-07-01", end: "2026-07-15", actualEnd: "2026-07-10", color: "azul" },
                  { id: 3, group: "GET FOR YOU - VALDEMIR E CLEYTON", name: "Instalação de Ajustes Guarda Corpo", start: "2026-07-01", end: "2026-07-20", actualEnd: "2026-07-25", color: "vermelho" },
                  { id: 4, group: "PRIME VIEW", name: "Verificar Infiltrações dos Apartamentos", start: "2026-07-01", end: "2026-07-28", actualEnd: "", color: "laranja" }
                ];
            
                let tasks = [];
                let selectedPrintGroups = {};
                const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
                let chartStart = new Date();
                let totalDays = 0;
            
                function loadCronoStorage() {
                  const obra = getObraAtual();
                  if (!obra.cronogramaTasks) obra.cronogramaTasks = null;
                  if (!obra.cronogramaTitle) obra.cronogramaTitle = '';
            
                  tasks = obra.cronogramaTasks ? obra.cronogramaTasks : JSON.parse(JSON.stringify(defaultTasks));
                  if (obra.cronogramaTitle) {
                    const titleEl = document.getElementById('mainTitleCrono');
                    if (titleEl) titleEl.innerText = obra.cronogramaTitle;
                  }
            
                  const groups = [...new Set(tasks.map(t => t.group))];
                  groups.forEach(g => { selectedPrintGroups[g] = true; });
            
                  const startInput = document.getElementById('startDateCrono');
                  const endInput = document.getElementById('endDateCrono');
                  if (startInput) startInput.value = "2026-08-03";
                  if (endInput) endInput.value = "2026-08-14";
                }
            
                function saveCronoStorage() {
                  const obra = getObraAtual();
                  obra.cronogramaTasks = tasks;
                  obra.cronogramaTitle = document.getElementById('mainTitleCrono') ? document.getElementById('mainTitleCrono').innerText : '';
                  salvarLocalComoBackup();
                  sincronizarBancoNuvem();
                  updateCronoGroupDropdown();
                  updateCronoMetrics();
                  renderCronoReport();
                }
            
                function updateCronoGroupDropdown() {
                  const selectGroup = document.getElementById('filterGroupCrono');
                  const currentSelected = selectGroup.value;
                  const groups = [...new Set(tasks.map(t => t.group))];
            
                  selectGroup.innerHTML = '<option value="all">📁 Todos os Projetos</option>';
                  groups.forEach(g => {
                    const option = document.createElement('option');
                    option.value = g;
                    option.textContent = `📁 ${g}`;
                    selectGroup.appendChild(option);
                  });
            
                  if (groups.includes(currentSelected)) {
                    selectGroup.value = currentSelected;
                  }
                }
            
                function updateCronoMetrics() {
                  const groups = new Set(tasks.map(t => t.group));
                  document.getElementById('metricGroupsCrono').innerText = groups.size;
                  document.getElementById('metricTasksCrono').innerText = tasks.length;
                  document.getElementById('metricDaysCrono').innerText = `${totalDays} dias`;
            
                  let totalTaskDays = 0;
                  tasks.forEach(t => {
                    let dStart = new Date(t.start + "T00:00:00");
                    let dEnd = new Date((t.actualEnd || t.end) + "T00:00:00");
                    totalTaskDays += Math.max(1, Math.ceil((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1);
                  });
            
                  let avg = tasks.length > 0 ? (totalTaskDays / tasks.length).toFixed(1) : 0;
                  document.getElementById('metricAvgDurationCrono').innerText = `${avg} dias`;
                }
            
                function calculateCronoCalendarRange() {
                  if (tasks.length === 0) {
                    chartStart = new Date();
                    totalDays = 30;
                    return;
                  }
            
                  let minDate = new Date(tasks[0].start + "T00:00:00");
                  let maxDate = new Date((tasks[0].actualEnd || tasks[0].end) + "T00:00:00");
            
                  tasks.forEach(t => {
                    let dStart = new Date(t.start + "T00:00:00");
                    let dEnd = new Date((t.actualEnd || t.end) + "T00:00:00");
            
                    if (dStart < minDate) minDate = dStart;
                    if (dEnd > maxDate) maxDate = dEnd;
                  });
            
                  chartStart = new Date(minDate);
                  let diffTime = Math.abs(maxDate - minDate);
                  totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                }
            
                function renderCronoCalendarHeader() {
                  const headerDates = document.getElementById('headerDatesCrono');
                  const headerDays = document.getElementById('headerDaysCrono');
                  const todayStr = new Date().toISOString().split('T')[0];
            
                  headerDates.innerHTML = `<th colspan="7" style="background:var(--primary); color:white;">INFORMAÇÕES DA TAREFA</th>`;
                  headerDays.innerHTML = `
                    <th class="col-task">TAREFA</th>
                    <th class="col-date">INÍCIO</th>
                    <th class="col-date">PREVISTO</th>
                    <th class="col-date">CONCLUSÃO</th>
                    <th class="col-dur">DIAS</th>
                    <th class="col-status">STATUS</th>
                    <th style="width: 45px;">COR</th>
                  `;
            
                  for (let i = 0; i < totalDays; i++) {
                    let currDate = new Date(chartStart);
                    currDate.setDate(chartStart.getDate() + i);
            
                    let currDateStr = currDate.toISOString().split('T')[0];
                    let dateStr = `${String(currDate.getDate()).padStart(2, '0')}/${String(currDate.getMonth() + 1).padStart(2, '0')}`;
                    let dayName = daysOfWeek[currDate.getDay()];
                    
                    let isWeekend = (currDate.getDay() === 0 || currDate.getDay() === 6) ? 'weekend' : '';
                    let isToday = (currDateStr === todayStr) ? 'today-highlight' : '';
            
                    let thDate = document.createElement('th');
                    thDate.className = `col-day ${isWeekend} ${isToday}`;
                    thDate.innerText = dateStr;
                    headerDates.appendChild(thDate);
            
                    let thDay = document.createElement('th');
                    thDay.className = `col-day ${isWeekend} ${isToday}`;
                    thDay.innerText = `${dayName}\n${currDate.getDate()}`;
                    headerDays.appendChild(thDay);
                  }
                }
            
                function getCronoGroupMetrics(groupName) {
                  const groupTasks = tasks.filter(t => t.group === groupName);
                  if (groupTasks.length === 0) return { start: '-', end: '-', days: '-', count: 0 };
            
                  let minDate = new Date(groupTasks[0].start + "T00:00:00");
                  let maxDate = new Date((groupTasks[0].actualEnd || groupTasks[0].end) + "T00:00:00");
            
                  groupTasks.forEach(t => {
                    let dStart = new Date(t.start + "T00:00:00");
                    let dEnd = new Date((t.actualEnd || t.end) + "T00:00:00");
                    if (dStart < minDate) minDate = dStart;
                    if (dEnd > maxDate) maxDate = dEnd;
                  });
            
                  let duration = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
            
                  return {
                    start: minDate.toLocaleDateString('pt-BR'),
                    end: maxDate.toLocaleDateString('pt-BR'),
                    days: `${duration}d`,
                    count: groupTasks.length
                  };
                }
            
                function toggleCronoPrintGroup(groupName, isChecked) {
                  selectedPrintGroups[groupName] = isChecked;
                }
            
                function toggleAllCronoPrintCheckboxes(status) {
                  const checkboxes = document.querySelectorAll('.print-checkbox');
                  checkboxes.forEach(cb => {
                    cb.checked = status;
                    const groupName = cb.getAttribute('data-group');
                    selectedPrintGroups[groupName] = status;
                  });
                }
            
                function renderCronoTasks() {
                  calculateCronoCalendarRange();
                  renderCronoCalendarHeader();
            
                  const tbody = document.getElementById('ganttBodyCrono');
                  const filter = document.getElementById('filterInputCrono').value.toLowerCase();
                  const statusFilter = document.getElementById('filterStatusCrono').value;
                  const groupFilter = document.getElementById('filterGroupCrono').value;
            
                  tbody.innerHTML = '';
                  let currentGroup = "";
            
                  tasks.forEach((task, index) => {
                    const taskStatus = getCronoTaskStatus(task.start, task.end, task.actualEnd);
            
                    if (filter && !task.name.toLowerCase().includes(filter)) return;
                    if (statusFilter !== 'all' && taskStatus.code !== statusFilter) return;
                    if (groupFilter !== 'all' && task.group !== groupFilter) return;
            
                    if (task.group !== currentGroup) {
                      currentGroup = task.group;
                      const groupMetrics = getCronoGroupMetrics(currentGroup);
                      const isChecked = selectedPrintGroups[currentGroup] !== false;
            
                      let groupRow = document.createElement('tr');
                      groupRow.className = `group-row-header`;
                      groupRow.setAttribute('data-group-name', currentGroup);
            
                      groupRow.innerHTML = `
                        <td class="group-header">
                          <input type="checkbox" class="print-checkbox" data-group="${currentGroup}" ${isChecked ? 'checked' : ''} onchange="toggleCronoPrintGroup('${currentGroup}', this.checked)" title="Marcar/Desmarcar para impressão">
                          <span contenteditable="true" spellcheck="true" onblur="updateCronoGroup('${currentGroup}', this.innerText)">${currentGroup}</span>
                        </td>
                        <td class="group-cell">${groupMetrics.start}</td>
                        <td class="group-cell">${groupMetrics.end}</td>
                        <td class="group-cell">-</td>
                        <td class="group-cell">${groupMetrics.days}</td>
                        <td class="group-cell"></td>
                        <td class="group-cell"></td>
                        <td colspan="${totalDays}" class="group-cell"></td>
                      `;
                      tbody.appendChild(groupRow);
                    }
            
                    let dStart = new Date(task.start + "T00:00:00");
                    let effectiveEnd = task.actualEnd || task.end;
                    let dEnd = new Date(effectiveEnd + "T00:00:00");
                    let duration = Math.ceil((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1;
                    if(isNaN(duration) || duration < 1) duration = 1;
            
                    let row = document.createElement('tr');
                    row.setAttribute('data-task-group', task.group);
                    row.setAttribute('data-task-index', index);
                    // draggable is toggled by the drag handle — see setupCronoDragDrop
            
                    let colorOptionsHTML = colorOptions.map(opt => 
                      `<option value="${opt.value}" ${task.color === opt.value ? 'selected' : ''}>${opt.label}</option>`
                    ).join('');
            
                    let html = `
                      <td class="col-task">
                        <span class="drag-handle" title="Arrastar para reordenar">⠿</span>
                        <button class="btn-del" onclick="deleteCronoTask(${index})" title="Excluir">✕</button> 
                        <button class="btn-clone" onclick="duplicateCronoTask(${index})" title="Duplicar">📋</button>
                        <span class="editable-text" contenteditable="true" spellcheck="true" onblur="updateCronoTaskName(${index}, this.innerText)">${task.name}</span>
                      </td>
                      <td class="col-date">
                        <input type="date" class="input-inline-date" value="${task.start}" onchange="updateCronoTaskStart(${index}, this.value)">
                      </td>
                      <td class="col-date">
                        <input type="date" class="input-inline-date" value="${task.end}" onchange="updateCronoTaskEnd(${index}, this.value)">
                      </td>
                      <td class="col-date">
                        <input type="date" class="input-inline-date" value="${task.actualEnd || ''}" onchange="updateCronoTaskActualEnd(${index}, this.value)" title="Informe se foi concluída">
                      </td>
                      <td class="col-dur">${duration}d</td>
                      <td class="col-status">
                        <span class="badge-status ${taskStatus.badge}">${taskStatus.label}</span>
                      </td>
                      <td>
                        <select class="select-inline-color" onchange="updateCronoTaskColor(${index}, this.value)">
                          ${colorOptionsHTML}
                        </select>
                      </td>
                    `;
            
                    for (let i = 0; i < totalDays; i++) {
                      let currDate = new Date(chartStart);
                      currDate.setDate(chartStart.getDate() + i);
            
                      let isWeekend = (currDate.getDay() === 0 || currDate.getDay() === 6) ? 'weekend' : '';
                      
                      if (currDate >= dStart && currDate <= dEnd) {
                        html += `<td class="${isWeekend}"><div class="bar bar-${task.color}"></div></td>`;
                      } else {
                        html += `<td class="${isWeekend}"></td>`;
                      }
                    }
            
                    row.innerHTML = html;
                    tbody.appendChild(row);
                  });
            
                  saveCronoStorage();
                  setupCronoDragDrop();
                }
            
                /* ========== DRAG-AND-DROP REORDER ========== */
                let cronoDragSourceIndex = null;
            
                function setupCronoDragDrop() {
                  const tbody = document.getElementById('ganttBodyCrono');
            
                  // Drag handles: mousedown activates draggable on the parent row
                  tbody.querySelectorAll('.drag-handle').forEach(handle => {
                    handle.addEventListener('mousedown', function(e) {
                      const row = this.closest('tr[data-task-index]');
                      if (row) row.setAttribute('draggable', 'true');
                    });
                    handle.addEventListener('mouseup', function(e) {
                      const row = this.closest('tr[data-task-index]');
                      if (row) row.setAttribute('draggable', 'false');
                    });
                  });
            
                  // Task rows: drag events
                  const taskRows = tbody.querySelectorAll('tr[data-task-index]');
                  taskRows.forEach(row => {
                    row.addEventListener('dragstart', cronoDragStart);
                    row.addEventListener('dragend', cronoDragEnd);
                    row.addEventListener('dragover', cronoDragOver);
                    row.addEventListener('dragleave', cronoDragLeave);
                    row.addEventListener('drop', cronoDrop);
                  });
            
                  // Group header rows: allow drop targets
                  const groupRows = tbody.querySelectorAll('.group-row-header');
                  groupRows.forEach(row => {
                    row.addEventListener('dragover', cronoDragOver);
                    row.addEventListener('dragleave', cronoDragLeave);
                    row.addEventListener('drop', cronoDrop);
                  });
                }
            
                function cronoDragStart(e) {
                  const taskIndex = this.getAttribute('data-task-index');
                  if (taskIndex === null) return;
                  cronoDragSourceIndex = parseInt(taskIndex);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', taskIndex);
                  this.classList.add('dragging');
                }
            
                function cronoDragEnd(e) {
                  this.classList.remove('dragging');
                  this.setAttribute('draggable', 'false');
                  // clear all highlights
                  const tbody = document.getElementById('ganttBodyCrono');
                  tbody.querySelectorAll('.drag-over-top,.drag-over-bottom,.drag-over-group,.drag-over-group-top').forEach(r => {
                    r.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-group', 'drag-over-group-top');
                  });
                  cronoDragSourceIndex = null;
                }
            
                function cronoDragOver(e) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (cronoDragSourceIndex === null) return;
            
                  // Clear old highlights
                  const tbody = document.getElementById('ganttBodyCrono');
                  tbody.querySelectorAll('.drag-over-top,.drag-over-bottom,.drag-over-group,.drag-over-group-top').forEach(r => {
                    r.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-group', 'drag-over-group-top');
                  });
            
                  const rect = this.getBoundingClientRect();
                  const midY = rect.top + rect.height / 2;
                  const mouseY = e.clientY;
            
                  if (this.classList.contains('group-row-header')) {
                    // Dropping near a group header — assign to this group
                    if (mouseY < midY) {
                      this.classList.add('drag-over-group-top');
                    } else {
                      this.classList.add('drag-over-group');
                    }
                  } else {
                    const targetIndex = this.getAttribute('data-task-index');
                    if (targetIndex === null || parseInt(targetIndex) === cronoDragSourceIndex) return;
                    if (mouseY < midY) {
                      this.classList.add('drag-over-top');
                    } else {
                      this.classList.add('drag-over-bottom');
                    }
                  }
                }
            
                function cronoDragLeave(e) {
                  // Only remove if truly leaving this element
                  if (!this.contains(e.relatedTarget)) {
                    this.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-group', 'drag-over-group-top');
                  }
                }
            
                function cronoDrop(e) {
                  e.preventDefault();
                  if (cronoDragSourceIndex === null) return;
            
                  const sourceIndex = cronoDragSourceIndex;
                  const sourceTask = tasks[sourceIndex];
                  if (!sourceTask) return;
            
                  const rect = this.getBoundingClientRect();
                  const midY = rect.top + rect.height / 2;
                  const mouseY = e.clientY;
                  const above = mouseY < midY;
            
                  // Determine target position and group
                  let targetIndex, targetGroup;
            
                  if (this.classList.contains('group-row-header')) {
                    // Dropped on a group header row
                    targetGroup = this.getAttribute('data-group-name');
                    if (!targetGroup) return;
            
                    // Find where this group header is in the visible task list
                    // We need to find the first task in this group
                    const firstTaskInGroup = tasks.findIndex(t => t.group === targetGroup);
                    if (firstTaskInGroup === -1) return;
            
                    // Remove source task from array
                    tasks.splice(sourceIndex, 1);
            
                    // Update the task's group
                    sourceTask.group = targetGroup;
            
                    // Re-find first task index after splice
                    const newFirstTaskInGroup = tasks.findIndex(t => t.group === targetGroup);
                    if (above) {
                      targetIndex = newFirstTaskInGroup; // insert before first task of group
                    } else {
                      // insert after last task of group
                      let lastIdx = newFirstTaskInGroup;
                      for (let i = newFirstTaskInGroup; i < tasks.length; i++) {
                        if (tasks[i].group === targetGroup) lastIdx = i;
                        else break;
                      }
                      targetIndex = lastIdx + 1;
                    }
                    tasks.splice(targetIndex, 0, sourceTask);
                  } else {
                    // Dropped on a task row
                    const rawTarget = this.getAttribute('data-task-index');
                    if (rawTarget === null) return;
                    targetIndex = parseInt(rawTarget);
                    if (targetIndex === sourceIndex) return;
            
                    // Determine the new group: if dropping above a task, take that task's group;
                    // if dropping below, also take that task's group
                    targetGroup = tasks[targetIndex].group;
            
                    // Remove source task
                    tasks.splice(sourceIndex, 1);
            
                    // Update group
                    sourceTask.group = targetGroup;
            
                    // Recalculate target index after splice
                    if (targetIndex > sourceIndex) targetIndex--;
            
                    if (!above) targetIndex++; // insert below the target
            
                    tasks.splice(targetIndex, 0, sourceTask);
                  }
            
                  // Clean up
                  this.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-group', 'drag-over-group-top');
                  cronoDragSourceIndex = null;
            
                  // Re-render with updated order
                  renderCronoTasks();
                }
                /* ========== FIM DRAG-AND-DROP ========== */
            
                function triggerCronoSelectedPrint() {
                  const allRows = document.querySelectorAll('#ganttBodyCrono tr');
                  let countSelected = 0;
            
                  allRows.forEach(row => {
                    let groupName = row.getAttribute('data-group-name') || row.getAttribute('data-task-group');
                    if (groupName && selectedPrintGroups[groupName] === false) {
                      row.classList.add('print-hidden');
                    } else {
                      row.classList.remove('print-hidden');
                      if (groupName) countSelected++;
                    }
                  });
            
                  if (countSelected === 0) {
                    alert("Nenhum projeto está marcado para impressão! Marque a caixinha de ao menos um grupo.");
                    return;
                  }
            
                  imprimirPagina();
                }
            
                function renderCronoReport() {
                  const tbody = document.getElementById('reportTableBodyCrono');
                  const summaryText = document.getElementById('reportSummaryTextCrono');
                  const textBox = document.getElementById('textReportBoxCrono');
            
                  tbody.innerHTML = '';
            
                  if (tasks.length === 0) {
                    summaryText.innerHTML = 'Nenhuma tarefa cadastrada no sistema.';
                    textBox.innerText = 'Sem atividades cadastradas.';
                    return;
                  }
            
                  const title = document.getElementById('mainTitleCrono').innerText;
                  const groups = [...new Set(tasks.map(t => t.group))];
                  let minGlobalDate = new Date(tasks[0].start + "T00:00:00");
                  let maxGlobalDate = new Date((tasks[0].actualEnd || tasks[0].end) + "T00:00:00");
            
                  let textReport = `==================================================\n`;
                  textReport += `📋 RELATÓRIO DE ACOMPANHAMENTO DE ATIVIDADES\n`;
                  textReport += `📌 PROJETO: ${title}\n`;
                  textReport += `📅 DATA EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}\n`;
                  textReport += `==================================================\n\n`;
            
                  groups.forEach(groupName => {
                    const metrics = getCronoGroupMetrics(groupName);
                    const percentage = ((metrics.count / tasks.length) * 100).toFixed(1);
            
                    let groupTasks = tasks.filter(t => t.group === groupName);
                    
                    let tr = document.createElement('tr');
                    tr.innerHTML = `
                      <td><strong>${groupName}</strong></td>
                      <td style="text-align: center;">${metrics.count}</td>
                      <td style="text-align: center;">${metrics.start}</td>
                      <td style="text-align: center;">${metrics.end}</td>
                      <td style="text-align: center;">${metrics.days}</td>
                      <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                          <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
                          </div>
                          <span style="font-size: 11px; font-weight: 600;">${percentage}%</span>
                        </div>
                      </td>
                    `;
                    tbody.appendChild(tr);
            
                    textReport += `🏗️ PROJETO/EQUIPE: ${groupName}\n`;
                    textReport += `--------------------------------------------------\n`;
            
                    groupTasks.forEach(t => {
                      let dStart = new Date(t.start + "T00:00:00");
                      let dEnd = new Date((t.actualEnd || t.end) + "T00:00:00");
                      let duration = Math.ceil((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1;
                      let status = getCronoTaskStatus(t.start, t.end, t.actualEnd);
            
                      if (dStart < minGlobalDate) minGlobalDate = dStart;
                      if (dEnd > maxGlobalDate) maxGlobalDate = dEnd;
            
                      textReport += `  • Tarefa: ${t.name}\n`;
                      textReport += `    Status: [${status.label.toUpperCase()}]\n`;
                      textReport += `    Prazo Previsto: ${formatCronoDateBR(t.start)} até ${formatCronoDateBR(t.end)}\n`;
                      if (t.actualEnd) {
                        textReport += `    Concluído em: ${formatCronoDateBR(t.actualEnd)}\n`;
                      }
                      textReport += `    Duração Total: ${duration} dia(s)\n\n`;
                    });
                  });
            
                  summaryText.innerHTML = `
                    Este cronograma abrange <strong>${groups.length} projetos/grupos</strong> com <strong>${tasks.length} tarefas</strong> no total. 
                    A execução global está planejada para iniciar em <strong>${minGlobalDate.toLocaleDateString('pt-BR')}</strong> e finalizar em <strong>${maxGlobalDate.toLocaleDateString('pt-BR')}</strong> (${totalDays} dias de operação).
                  `;
            
                  textReport += `==================================================\n`;
                  textReport += `📊 RESUMO OPERACIONAL:\n`;
                  textReport += `  - Total de Projetos: ${groups.length}\n`;
                  textReport += `  - Total de Atividades: ${tasks.length}\n`;
                  textReport += `  - Janela Geral: ${minGlobalDate.toLocaleDateString('pt-BR')} a ${maxGlobalDate.toLocaleDateString('pt-BR')} (${totalDays} dias)\n`;
                  textReport += `==================================================`;
            
                  textBox.innerText = textReport;
                }
            
                function copyCronoTextReport() {
                  const text = document.getElementById('textReportBoxCrono').innerText;
                  navigator.clipboard.writeText(text).then(() => {
                    alert("✅ Relatório em texto copiado para a área de transferência!");
                  }).catch(err => {
                    alert("Erro ao copiar o texto. Tente selecionar e copiar manualmente.");
                  });
                }
            
                function toggleCronoReport() {
                  const container = document.getElementById('reportContainerCrono');
                  container.style.display = container.style.display === 'none' ? 'block' : 'none';
                }
            
                function duplicateCronoTask(index) {
                  const original = tasks[index];
                  const clonedTask = {
                    id: Date.now(),
                    group: original.group,
                    name: toCronoTitleCase(`${original.name} (Cópia)`),
                    start: original.start,
                    end: original.end,
                    actualEnd: original.actualEnd || "",
                    color: original.color
                  };
            
                  tasks.splice(index + 1, 0, clonedTask);
                  renderCronoTasks();
                }
            
                function updateCronoGroup(oldGroup, newGroup) {
                  newGroup = toCronoTitleCase(newGroup.trim());
                  if (!newGroup) return;
                  tasks.forEach(t => {
                    if (t.group === oldGroup) t.group = newGroup;
                  });
                  if (selectedPrintGroups[oldGroup] !== undefined) {
                    selectedPrintGroups[newGroup] = selectedPrintGroups[oldGroup];
                    delete selectedPrintGroups[oldGroup];
                  }
                  renderCronoTasks();
                }
            
                function updateCronoTaskName(index, newName) {
                  tasks[index].name = toCronoTitleCase(newName.trim());
                  saveCronoStorage();
                  renderCronoTasks();
                }
            
                function updateCronoTaskStart(index, val) {
                  if (!val) return;
                  tasks[index].start = val;
                  saveCronoStorage();
                  renderCronoTasks();
                }
            
                function updateCronoTaskEnd(index, val) {
                  if (!val) return;
                  tasks[index].end = val;
                  saveCronoStorage();
                  renderCronoTasks();
                }
            
                function updateCronoTaskActualEnd(index, val) {
                  tasks[index].actualEnd = val;
                  saveCronoStorage();
                  renderCronoTasks();
                }
            
                function updateCronoTaskColor(index, val) {
                  tasks[index].color = val;
                  saveCronoStorage();
                  renderCronoTasks();
                }
            
                function deleteCronoTask(index) {
                  if (confirm(`Tem certeza que deseja excluir a tarefa "${tasks[index].name}"?`)) {
                    tasks.splice(index, 1);
                    renderCronoTasks();
                  }
                }
            
                function addCronoTask() {
                  const groupInput = document.getElementById('groupNameCrono');
                  const taskInput = document.getElementById('taskNameCrono');
                  const startInput = document.getElementById('startDateCrono');
                  const endInput = document.getElementById('endDateCrono');
                  const actualEndInput = document.getElementById('actualEndDateCrono');
                  const colorInput = document.getElementById('barColorCrono');
            
                  const group = toCronoTitleCase(groupInput.value);
                  const name = toCronoTitleCase(taskInput.value);
                  const start = startInput.value;
                  const end = endInput.value;
                  const actualEnd = actualEndInput.value;
                  const color = colorInput.value;
            
                  if (!group || !name || !start || !end) {
                    alert("Por favor, preencha os campos obrigatórios (Grupo, Nome, Início e Término Previsto).");
                    return;
                  }
            
                  tasks.push({
                    id: Date.now(),
                    group: group,
                    name: name,
                    start: start,
                    end: end,
                    actualEnd: actualEnd || "",
                    color: color
                  });
            
                  if (selectedPrintGroups[group] === undefined) {
                    selectedPrintGroups[group] = true;
                  }
            
                  taskInput.value = '';
                  actualEndInput.value = '';
                  renderCronoTasks();
                }
            
                function exportCronoData() {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                    title: document.getElementById('mainTitleCrono').innerText,
                    tasks: tasks
                  }, null, 2));
                  
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `cronograma_backup_${new Date().toISOString().split('T')[0]}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }
            
                function importCronoData() {
                  document.getElementById('importFile').click();
                }
            
                function handleFileSelectCrono(event) {
                  const file = event.target.files[0];
                  if (!file) return;
            
                  const reader = new FileReader();
                  reader.onload = function(e) {
                    try {
                      const imported = JSON.parse(e.target.result);
                      if (imported.tasks && Array.isArray(imported.tasks)) {
                        tasks = imported.tasks;
                        if (imported.title) {
                          document.getElementById('mainTitleCrono').innerText = imported.title;
                        }
                        renderCronoTasks();
                        alert("✅ Backup restaurado com sucesso!");
                      } else {
                        alert("❌ Arquivo de backup inválido.");
                      }
                    } catch (err) {
                      alert("❌ Erro ao ler o arquivo JSON.");
                    }
                  };
                  reader.readAsText(file);
                }
            
                // Cronograma initialization - called when tab is first shown
                let cronogramaInitialized = false;
                function initCronograma() {
                  if (cronogramaInitialized) return;
                  cronogramaInitialized = true;
                  loadCronoStorage();
                  updateCronoGroupDropdown();
                  renderCronoTasks();
                }
                /* ========== FIM CRONOGRAMA ========== */
            
                function itemBateFiltro(item, termo) {
                    if (!termo) return true;
                    termo = termo.toLowerCase().trim();
                    return (item.ref || '').toLowerCase().includes(termo) ||
                        (item.tipo || '').toLowerCase().includes(termo) ||
                        (item.loc || '').toLowerCase().includes(termo);
                }
            
                function render() {
                    try {
                    const obra = getObraAtual();
                    document.getElementById('obraTitle').innerText = titleCase(obra.nome);
            
                    const valorContratoGlobal = Number(obra.valorContrato || 0);
                    document.getElementById('headerValorContrato').innerText = "R$ " + valorContratoGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            
                    const numContratoVal = obra.numContrato || '';
                    const numContratoBadge = document.getElementById('headerNumContratoBadge');
                    if (numContratoVal) {
                        document.getElementById('headerNumContrato').innerText = numContratoVal;
                        numContratoBadge.style.display = 'flex';
                    } else {
                        numContratoBadge.style.display = 'none';
                    }
            
                    const select = document.getElementById('selectObra');
                    select.innerHTML = '';
                    const fragmentOpts = document.createDocumentFragment();
                    db.obras.forEach(o => {
                        const opt = document.createElement('option');
                        opt.value = o.id; opt.innerText = "Obra: " + titleCase(o.nome);
                        if (o.id === db.obraAtualId) opt.selected = true;
                        fragmentOpts.appendChild(opt);
                    });
                    select.appendChild(fragmentOpts);
            
                    let qtdTotalPecas = 0, areaTotalPrevista = 0, totalFemPecas = 0, totalFabricadoPecas = 0, totalInstaladoPecas = 0, areaTotalInstalada = 0;
                    (obra.itens || []).forEach(i => {
                        const areaItem = i.qtd * (i.larg * i.alt);
                        qtdTotalPecas += Number(i.qtd || 0); areaTotalPrevista += areaItem;
                        totalFemPecas += Number(i.fem || 0); totalFabricadoPecas += Number(i.fabricado || 0); totalInstaladoPecas += Number(i.instalado || 0);
                        areaTotalInstalada += (Number(i.instalado || 0) * (i.larg * i.alt));
                    });
            
                    const pctFemGeral = qtdTotalPecas > 0 ? (totalFemPecas / qtdTotalPecas) * 100 : 0;
                    const pctFabGeral = qtdTotalPecas > 0 ? (totalFabricadoPecas / qtdTotalPecas) * 100 : 0;
                    const pctInstGeral = areaTotalPrevista > 0 ? (areaTotalInstalada / areaTotalPrevista) * 100 : 0;
                    const valorServicoTotal = (valorContratoGlobal * (Number(obra.pctServico || 20) / 100));
            
                    document.getElementById('kpiQtdTotal').innerText = qtdTotalPecas.toLocaleString('pt-BR');
                    document.getElementById('kpiAreaTotal').innerText = areaTotalPrevista.toFixed(2) + " m²";
                    document.getElementById('kpiProgressoFem').innerText = pctFemGeral.toFixed(1) + "%";
                    document.getElementById('kpiProgressoFab').innerText = pctFabGeral.toFixed(1) + "%";
                    document.getElementById('kpiProgressoInst').innerText = pctInstGeral.toFixed(1) + "%";
            
                    try { renderTabelaPrincipal(obra); } catch(e) { console.error('renderTabelaPrincipal:', e); }
                    try { renderTabelaLiberacao(obra); } catch(e) { console.error('renderTabelaLiberacao:', e); }
                    try { renderTabelaFabricacao(obra); } catch(e) { console.error('renderTabelaFabricacao:', e); }
                    try { renderTabelaInstalacao(obra); } catch(e) { console.error('renderTabelaInstalacao:', e); }
                    try { renderBoletimMedicao(obra, areaTotalPrevista, valorServicoTotal); } catch(e) { console.error('renderBoletimMedicao:', e); }
                    try { renderRecebimentos(obra); } catch(e) { console.error('renderRecebimentos:', e); }
                    try { renderGraficosEstiloExcel(obra, pctFemGeral, pctFabGeral, pctInstGeral); } catch(e) { console.error('renderGraficosEstiloExcel:', e); }
                    try { renderCTMDashboard(); } catch(e) { console.error('renderCTMDashboard:', e); }
                    try { renderPagamento(); } catch(e) { console.error('renderPagamento:', e); }
                    try { if(document.getElementById('custoFilterObra')) popularCustoObraSelect(); } catch(e) { console.error('popularCustoObraSelect:', e); }
            
                    } catch(e) {
                        console.error('ERRO CRÍTICO em render():', e);
                        document.getElementById('obraTitle') && (document.getElementById('obraTitle').innerText = 'Erro ao renderizar — veja o console');
                    }
                }
            
                function normalizarStatusRecebimento(status) {
                    const s = (status || '').toString().trim().toLowerCase();
                    if (s === 'recebido') return 'Recebido';
                    if (s === 'parcial' || s === 'parcialmente recebido') return 'Parcial';
                    if (s === 'rejeitado') return 'Rejeitado';
                    return 'Pendente';
                }
            
                function escaparHTML(valor) {
                    return String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
                }
            
            
                function titleCase(str) {
                    if (!str || typeof str !== 'string') return str || '';
                    var exceptions = ['e','de','do','da','aos','as','dos','das'];
                    return str.toLowerCase().replace(/\b\w+/g, function(word, offset) {
                        if (offset > 0 && exceptions.indexOf(word) !== -1) return word;
                        return word.charAt(0).toUpperCase() + word.slice(1);
                    });
                }
            
                function tc(str) {
                    return titleCase(escaparHTML(str));
                }
            
                function imprimirPagina() {
                    // PATCH 37: garante que o Menu de Abas nao va para o papel
                    try {
                        if (typeof window.p37FecharMenuAbas === 'function') window.p37FecharMenuAbas();
                        else {
                            var p37m = document.getElementById('meu-menu-abas');
                            if (p37m) p37m.removeAttribute('open');
                        }
                    } catch (e) { /* ignora */ }
                    document.body.classList.add('print-active');
                    document.querySelectorAll('.tab-pane, [id^="tab-"]').forEach(function(el) {
                        el.classList.add('print-active');
                    });
                    try { window.print(); } finally {
                        document.body.classList.remove('print-active');
                        document.querySelectorAll('.tab-pane, [id^="tab-"]').forEach(function(el) {
                            el.classList.remove('print-active');
                        });
                    }
                }
                function normalizarRecebimentosAntigos(obra) {
                    if (!obra.recebimentos) obra.recebimentos = [];
                    obra.recebimentos.forEach(r => {
                        if (r.listaCorte === undefined) r.listaCorte = '';
                        if (r.classe === undefined) r.classe = '';
                        if (r.marca === undefined) r.marca = '';
                        if (r.codigoCor === undefined) r.codigoCor = r.ref || '';
                        if (r.descricao === undefined) r.descricao = r.material || '';
                        if (r.material === undefined) r.material = r.descricao || '';
                        if (r.ref === undefined) r.ref = r.codigoCor || '';
                        if (r.qtdSaida === undefined) r.qtdSaida = 0;
                        if (r.saldo === undefined) r.saldo = Number(r.qtdRecebida||0) - Number(r.qtdSaida||0);
                        if (r.qtdSaida === undefined) r.qtdSaida = 0;
                    });
                }
            
                function normalizarChaveMaterial(valor) {
                    return String(valor || '')
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toUpperCase()
                        .replace(/\s+/g, ' ')
                        .trim();
                }
            
                function chaveMaterialConsolidado(r) {
                    const classe = normalizarChaveMaterial(r.classe);
                    const marca = normalizarChaveMaterial(r.marca);
                    const codigo = normalizarChaveMaterial(r.codigoCor || r.ref);
                    const descricao = normalizarChaveMaterial(r.descricao || r.material);
            
                    return codigo
                        ? [classe, marca, codigo].join('||')
                        : [classe, marca, descricao].join('||');
                }
            
                function obterMateriaisConsolidados(obra) {
                    normalizarRecebimentosAntigos(obra);
                    const mapa = new Map();
            
                    (obra.recebimentos || []).forEach(r => {
                        const chave = chaveMaterialConsolidado(r);
                        if (!mapa.has(chave)) {
                            mapa.set(chave, {
                                classe: r.classe || '',
                                marca: r.marca || '',
                                codigoCor: r.codigoCor || r.ref || '',
                                descricao: r.descricao || r.material || '',
                                unidade: r.unidade || 'UN',
                                qtdRecebida: 0,
                                qtdSaida: 0,
                                saldo: 0,
                                qtdPrevista: 0,
                                qtdSaida: 0,
                                ocorrencias: 0,
                                listasCorte: new Set(),
                                ultimoRecebimento: r.data || ''
                            });
                        }
            
                        const item = mapa.get(chave);
                        item.qtdRecebida += Number(r.qtdRecebida || 0);
                        item.qtdSaida += Number(r.qtdSaida || 0);
                        item.qtdPrevista += Number(r.qtdPrevista || 0);
                        item.qtdSaida += Number(r.qtdSaida || 0);
                        item.qtdSaida += Number(r.qtdSaida || 0);
                        item.qtdSaida += Number(r.qtdSaida || 0);
                        item.saldo = Number(item.qtdRecebida||0) - Number(item.qtdSaida||0);
                        item.ocorrencias += 1;
                        if (r.listaCorte) item.listasCorte.add(String(r.listaCorte));
            
                        const descAtual = String(item.descricao || '');
                        const descNova = String(r.descricao || r.material || '');
                        if (descNova.length > descAtual.length) item.descricao = descNova;
            
                        if ((r.data || '') > (item.ultimoRecebimento || '')) {
                            item.ultimoRecebimento = r.data || '';
                        }
                    });
            
                    const resultado = Array.from(mapa.values());
                    resultado.forEach(item => {
                        item.listasCorte = Array.from(item.listasCorte).sort();
                        item.saldo = Number(item.qtdRecebida || 0) - Number(item.qtdSaida || 0);
                    });
                    return resultado.sort((a, b) =>
                        `${a.classe} ${a.marca} ${a.codigoCor}`.localeCompare(
                            `${b.classe} ${b.marca} ${b.codigoCor}`, 'pt-BR'
                        )
                    );
                }
            
                function renderMateriaisConsolidados(obra) {
                    const tbody = document.getElementById('tbodyMateriaisConsolidados');
                    if (!tbody) return;
            
                    const materiais = obterMateriaisConsolidados(obra);
            
                    tbody.innerHTML = materiais.map(m => {
                        const saldo = Number(m.saldo || 0);
                        return `<tr>
                            <td>${escaparHTML((m.listasCorte || []).join(', ') || '-')}</td>
                            <td><span class="material-badge">${escaparHTML(m.classe || '-')}</span></td>
                            <td class="text-left">${escaparHTML(m.marca || '-')}</td>
                            <td class="text-left">${escaparHTML(m.codigoCor || '-')}</td>
                            <td class="text-left">${escaparHTML(m.descricao || '-')}</td>
                            <td>${Number(m.qtdPrevista || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                            <td>${Number(m.qtdRecebida || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                            <td>${Number(m.qtdSaida || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                            <td style="font-weight:700;color:${Number(m.saldo||0)<0?'var(--danger,#e74c3c)':'var(--success,#16a34a)'}"
${Number(m.saldo||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}</td>
                            <td>${Number(m.qtdSaida || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                            <td style="font-weight:700;color:${saldo < 0 ? 'var(--danger,#e74c3c)' : 'var(--success,#16a34a)'}">${saldo.toLocaleString('pt-BR',{maximumFractionDigits:2})}</td>
                            <td>${escaparHTML(m.unidade || 'UN')}</td>
                            <td>${m.ocorrencias}</td>
                            <td>${escaparHTML(m.ultimoRecebimento || '-')}</td>
                        </tr>`;
                    }).join('');
                }
            
                function exportarMateriaisConsolidados() {
                    const obra = getObraAtual();
                    const materiais = obterMateriaisConsolidados(obra);
                    if (!materiais.length) {
                        alert('Não há materiais para consolidar.');
                        return;
                    }
            
                    const linhas = [
                        ['Lista(s) de Corte', 'Classe', 'Marca', 'Código - Cor', 'Descrição', 'Quantidade Prevista', 'Quantidade Recebida', 'Quantidade Saída', 'Saldo', 'Unidade', 'Ocorrências', 'Último Recebimento'],
                        ...materiais.map(m => [
                            (m.listasCorte || []).join(', '), m.classe, m.marca, m.codigoCor, m.descricao,
                            m.qtdPrevista, m.qtdRecebida, m.qtdSaida, m.saldo, m.unidade, m.ocorrencias, m.ultimoRecebimento
                        ])
                    ];
            
                    const csv = linhas.map(l => l.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
                    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `materiais_consolidados_${obra.nome.replace(/[^\w\-]+/g, '_')}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                }

            
                function renderRecebimentos(obra) {
                    const tbody = document.getElementById('tbodyRecebimento');
                    if (!tbody) return;
                    normalizarRecebimentosAntigos(obra);
                    const termo = (document.getElementById('searchRecebimento')?.value || '').toLowerCase().trim();
                    const registros = obra.recebimentos.filter(r => !termo || [r.data, r.listaCorte, r.nf, r.classe, r.marca, r.codigoCor, r.descricao, r.fornecedor, r.material, r.ref, r.responsavel, r.local, r.obs].some(v => String(v || '').toLowerCase().includes(termo)));
            
                    document.getElementById('recKpiRegistros').innerText = obra.recebimentos.length.toLocaleString('pt-BR');
                    document.getElementById('recKpiRecebidos').innerText = obra.recebimentos.filter(r => normalizarStatusRecebimento(r.status) === 'Recebido').length.toLocaleString('pt-BR');
                    document.getElementById('recKpiPendentes').innerText = obra.recebimentos.filter(r => ['Pendente', 'Parcial'].includes(normalizarStatusRecebimento(r.status))).length.toLocaleString('pt-BR');
                    document.getElementById('recKpiQtd').innerText = obra.recebimentos.reduce((s, r) => s + Number(r.qtdPrevista || 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
            
                    tbody.innerHTML = registros.map(r => {
                        const status = normalizarStatusRecebimento(r.status);
                        return `<tr>
                                <td><input type="date" value="${escaparHTML(r.data)}" onchange="editarRecebimento(${r.id},'data',this.value)"></td>
                                <td><input type="text" value="${escaparHTML(r.listaCorte || '')}" onchange="editarRecebimento(${r.id},'listaCorte',this.value)"></td>
                                <td><input type="text" value="${escaparHTML(r.nf)}" onchange="editarRecebimento(${r.id},'nf',this.value)"></td>
                                <td><input class="text-left" type="text" value="${escaparHTML(r.classe)}" onchange="editarRecebimento(${r.id},'classe',this.value)"></td>
                                <td><input class="text-left" type="text" value="${escaparHTML(r.marca)}" onchange="editarRecebimento(${r.id},'marca',this.value)"></td>
                                <td><input type="text" value="${escaparHTML(r.codigoCor || r.ref)}" onchange="editarRecebimento(${r.id},'codigoCor',this.value)"></td>
                                <td><input class="text-left" type="text" value="${escaparHTML(r.descricao || r.material)}" onchange="editarRecebimento(${r.id},'descricao',this.value)"></td>
                                <td><input type="number" step="0.01" min="0" value="${Number(r.qtdPrevista || 0)}" onchange="editarRecebimento(${r.id},'qtdPrevista',this.value)"></td>
                                <td><input type="number" step="0.01" min="0" value="${Number(r.qtdRecebida || 0)}" onchange="editarRecebimento(${r.id},'qtdRecebida',this.value)"></td>
                                <td><input type="number" step="0.01" min="0" value="${Number(r.qtdSaida || 0)}" onchange="editarRecebimento(${r.id},'qtdSaida',this.value)"></td>
                                <td style="font-weight:700;color:${(Number(r.qtdRecebida||0) - Number(r.qtdSaida||0)) < 0 ? 'var(--danger,#e74c3c)' : 'var(--success,#16a34a)'}">${(Number(r.qtdRecebida||0) - Number(r.qtdSaida||0)).toLocaleString('pt-BR',{maximumFractionDigits:2})}</td>
                                <td><select onchange="editarRecebimento(${r.id},'unidade',this.value)">${['UN', 'M', 'M²', 'KG', 'L', 'CX', 'OUTRO'].map(u => `<option value="${u}" ${r.unidade === u ? 'selected' : ''}>${u}</option>`).join('')}</select></td>
                                <td><select onchange="editarRecebimento(${r.id},'status',this.value)">${['Recebido', 'Parcial', 'Pendente', 'Rejeitado'].map(s => `<option value="${s}" ${status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
                                <td><input class="text-left" type="text" value="${escaparHTML(r.responsavel)}" onchange="editarRecebimento(${r.id},'responsavel',this.value)"></td>
                                <td><input class="text-left" type="text" value="${escaparHTML(r.local)}" onchange="editarRecebimento(${r.id},'local',this.value)"></td>
                                <td><input class="text-left" type="text" value="${escaparHTML(r.obs)}" onchange="editarRecebimento(${r.id},'obs',this.value)"></td>
                                <td><button class="danger" onclick="excluirRecebimento(${r.id})">❌</button></td>
                            </tr>`;
                    }).join('');
            
                    renderMateriaisConsolidados(obra);
                }
            
                function abrirModalRecebimento() {
                    document.getElementById('recData').value = new Date().toISOString().slice(0, 10);
                    ['recListaCorte', 'recNF', 'recFornecedor', 'recClasse', 'recMarca', 'recCodigoCor', 'recDescricao', 'recMaterial', 'recRef', 'recResponsavel', 'recLocal', 'recObs'].forEach(id => document.getElementById(id).value = '');
                    document.getElementById('recQtdPrevista').value = 0;
                    document.getElementById('recQtdRecebida').value = 0;
                    document.getElementById('recQtdSaida').value = 0;
                    document.getElementById('recQtdSaida').value = 0;
                    document.getElementById('recQtdSaida').value = 0;
                    document.getElementById('recUnidade').value = 'UN';
                    document.getElementById('recStatus').value = 'Recebido';
                    document.getElementById('modalRecebimento').style.display = 'flex';
                }
            
                function salvarNovoRecebimento() {
                    const obra = getObraAtual();
                    if (!obra.recebimentos) obra.recebimentos = [];
                    const qtdPrevista = Number(document.getElementById('recQtdPrevista').value) || 0;
                    const qtdRecebida = Number(document.getElementById('recQtdRecebida').value) || 0;
                    const qtdSaida = Number(document.getElementById('recQtdSaida').value) || 0;
                    let status = document.getElementById('recStatus').value;
                    if (status === 'Recebido' && qtdPrevista > 0 && qtdRecebida < qtdPrevista) status = 'Parcial';
                    obra.recebimentos.push({
                        id: Date.now() + Math.random(),
                        data: document.getElementById('recData').value || '',
                        listaCorte: document.getElementById('recListaCorte').value.trim(),
                        nf: document.getElementById('recNF').value.trim(),
                        fornecedor: document.getElementById('recFornecedor').value.trim(),
                        classe: document.getElementById('recClasse').value.trim(),
                        marca: document.getElementById('recMarca').value.trim(),
                        codigoCor: document.getElementById('recCodigoCor').value.trim(),
                        descricao: document.getElementById('recDescricao').value.trim(),
                        material: document.getElementById('recMaterial').value.trim(),
                        ref: document.getElementById('recRef').value.trim(),
                        qtdPrevista, qtdRecebida, qtdSaida, qtdSaida,
                        unidade: document.getElementById('recUnidade').value,
                        status,
                        responsavel: document.getElementById('recResponsavel').value.trim(),
                        local: document.getElementById('recLocal').value.trim(),
                        obs: document.getElementById('recObs').value.trim()
                    });
                    fecharModais(); salvarDB();
                }
            
                function editarRecebimento(id, campo, valor) {
                    const obra = getObraAtual();
                    const item = (obra.recebimentos || []).find(r => r.id === id);
                    if (!item) return;
                    item[campo] = ['qtdPrevista', 'qtdRecebida', 'qtdSaida'].includes(campo) ? (Number(valor) || 0) : valor;
                    if (['qtdPrevista', 'qtdRecebida', 'qtdSaida'].includes(campo) && item.status !== 'Rejeitado') {
                        if (item.qtdRecebida <= 0) item.status = 'Pendente';
                        else if (item.qtdPrevista > 0 && item.qtdRecebida < item.qtdPrevista) item.status = 'Parcial';
                        else item.status = 'Recebido';
                    }
                    salvarDB(false); renderRecebimentos(obra);
                }
            
                function excluirRecebimento(id) {
                    const obra = getObraAtual();
                    if (confirm('Excluir este registro de recebimento?')) {
                        obra.recebimentos = (obra.recebimentos || []).filter(r => r.id !== id);
                        salvarDB();
                    }
                }
            
                function abrirModalImportarRecebimento() {
                    document.getElementById('recebimentoPasteArea').value = '';
                    document.getElementById('impRecData').value = new Date().toISOString().slice(0, 10);
                    document.getElementById('impRecListaCorte').value = '';
                    document.getElementById('impRecNF').value = '';
                    document.getElementById('impRecFornecedor').value = '';
                    document.getElementById('impRecClasse').value = '';
                    document.getElementById('modalImportarRecebimento').style.display = 'flex';
                }
            
                async function lerPDFListaAcessorios(event) {
                    const file = event.target.files[0];
                    const statusEl = document.getElementById('pdfImportStatus');
                    if (!file) {
                        statusEl.textContent = 'Nenhum PDF selecionado';
                        return;
                    }
            
                    statusEl.textContent = 'Lendo PDF...';
            
                    try {
                        const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
                        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
            
                        const buffer = await file.arrayBuffer();
                        const pdf = await pdfjs.getDocument({ data: buffer }).promise;
                        let linhasTodasPaginas = [];
            
                        for (let pagina = 1; pagina <= pdf.numPages; pagina++) {
                            const page = await pdf.getPage(pagina);
                            const content = await page.getTextContent();
            
                            const grupos = [];
                            content.items.forEach(item => {
                                const txt = String(item.str || '').trim();
                                if (!txt) return;
                                const y = Math.round((item.transform?.[5] || 0) * 10) / 10;
                                let grupo = grupos.find(g => Math.abs(g.y - y) <= 1.5);
                                if (!grupo) {
                                    grupo = { y, itens: [] };
                                    grupos.push(grupo);
                                }
                                grupo.itens.push({ x: item.transform?.[4] || 0, txt });
                            });
            
                            grupos.sort((a, b) => b.y - a.y);
                            grupos.forEach(g => {
                                g.itens.sort((a, b) => a.x - b.x);
                                const linha = g.itens.map(i => i.txt).join(' ').replace(/\s+/g, ' ').trim();
                                if (linha) linhasTodasPaginas.push(linha);
                            });
                        }
            
                        const texto = linhasTodasPaginas.join('\n');
                        const resultado = extrairSomenteClasseObra(texto);
            
                        document.getElementById('recebimentoPasteArea').value = resultado.linhas.map(r =>
                            [r.marca, r.codigoCor, r.quantidade, r.descricao].join('\t')
                        ).join('\n');
            
                        if (resultado.pedidoLote) document.getElementById('impRecListaCorte').value = resultado.pedidoLote;
                        document.getElementById('impRecClasse').value = 'OBRA';
            
                        statusEl.textContent = `${resultado.linhas.length} material(is) da CLASSE:OBRA encontrado(s).`;
                        if (!resultado.linhas.length) {
                            alert('O PDF foi lido, mas nenhuma linha da CLASSE:OBRA foi encontrada.');
                        }
                    } catch (err) {
                        console.error(err);
                        statusEl.textContent = 'Não foi possível ler o PDF.';
                        alert('Não foi possível ler o PDF automaticamente. Verifique sua conexão com a internet e tente novamente, ou use a opção de colar a lista.');
                    }
                }
            
                function extrairSomenteClasseObra(texto) {
                    const linhas = texto.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                    let emObra = false;
                    let pedidoLote = '';
                    let dataImpressao = '';
                    const resultado = [];
            
                    for (let i = 0; i < linhas.length; i++) {
                        const linha = linhas[i];
            
                        const pedido = linha.match(/Pedido\/Lote:\s*([^\s]+)/i);
                        if (pedido && !pedidoLote) pedidoLote = pedido[1];
            
                        const data = linha.match(/Data de Impressão:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
                        if (data && !dataImpressao) dataImpressao = data[1];
            
                        const classe = linha.match(/Classe:\s*(.*?)\s+CLASSE\s*:\s*OBRA\b/i);
                        if (classe) {
                            emObra = true;
                            continue;
                        }
            
                        if (/^Classe:\s*.*\bCLASSE\s*:/i.test(linha) && !classe) {
                            emObra = false;
                            continue;
                        }
            
                        if (!emObra) continue;
                        if (/^Marca\s+Código/i.test(linha)) continue;
            
                        const match = linha.match(/^(\S+)\s+(.+?)\s+(\d[\d.]*(?:,\d+)?)\s*(m²|m|kg|un)?\s+(.+)$/i);
            
                        if (match) {
                            const marca = match[1];
                            const codigoCor = match[2].trim();
                            const quantidade = Number(match[3].replace(/\./g, '').replace(',', '.')) || 0;
                            const unidade = (match[4] || 'UN').toUpperCase();
                            let descricao = match[5].trim();
            
                            let j = i + 1;
                            while (j < linhas.length) {
                                const prox = linhas[j];
                                if (/^Classe:\s*.*\bCLASSE\s*:/i.test(prox)) break;
                                if (/^Marca\s+Código/i.test(prox)) break;
                                if (/^(\S+)\s+.+\s+\d[\d.]*(?:,\d+)?\s*(?:m²|m|kg|un)?\s+.+$/i.test(prox)) break;
                                if (/^Pedido\/Lote:/i.test(prox)) break;
                                descricao += ' ' + prox;
                                j++;
                                i = j - 1;
                            }
            
                            resultado.push({ marca, codigoCor, quantidade, unidade, descricao: descricao.replace(/\s+/g, ' ').trim() });
                        }
                    }
            
                    return { linhas: resultado, pedidoLote, dataImpressao };
                }
            
                function processarImportacaoRecebimento() {
                    const texto = document.getElementById('recebimentoPasteArea').value.trim();
                    if (!texto) return;
            
                    const obra = getObraAtual();
                    if (!obra.recebimentos) obra.recebimentos = [];
            
                    const dataImportacao = document.getElementById('impRecData').value || new Date().toISOString().slice(0, 10);
                    const listaCorteImportacao = document.getElementById('impRecListaCorte').value.trim();
                    const nfImportacao = document.getElementById('impRecNF').value.trim();
                    const fornecedorImportacao = document.getElementById('impRecFornecedor').value.trim();
                    const classeImportacao = document.getElementById('impRecClasse').value.trim();
            
                    const linhas = texto.split(/\r?\n/);
                    const parseNum = v => Number(String(v ?? '').replace(/\./g, '').replace(',', '.').trim()) || 0;
            
                    linhas.forEach((linha, index) => {
                        const col = linha.split('\t').map(v => (v || '').trim());
                        if (col.length < 4) return;
            
                        if (index === 0 && /marca/i.test(col[0]) && /c[oó]digo/i.test(col[1])) return;
            
                        const marca = col[0];
                        const codigoCor = col[1];
                        const quantidade = parseNum(col[2]);
                        const descricao = col.slice(3).join(' ');
            
                        if (!marca && !codigoCor && !descricao) return;
            
                        obra.recebimentos.push({
                            id: Date.now() + Math.random(),
                            data: dataImportacao,
                            listaCorte: listaCorteImportacao,
                            nf: nfImportacao,
                            fornecedor: fornecedorImportacao,
                            classe: classeImportacao,
                            marca,
                            codigoCor,
                            descricao,
                            material: descricao,
                            ref: codigoCor,
                            qtdPrevista: quantidade,
                            qtdRecebida: 0,
                            qtdSaida: 0,
                            saldo: 0,
                            qtdSaida: 0,
                            unidade: 'UN',
                            status: 'Pendente',
                            responsavel: '',
                            local: '',
                            obs: 'Importado da lista de materiais'
                        });
                    });
            
                    document.getElementById('recebimentoPasteArea').value = '';
                    const totalLinhas = linhas.filter(l => l.trim()).length;
                    const totalConsolidado = obterMateriaisConsolidados(obra).length;
                    fecharModais();
                    salvarDB();
                    alert(`${totalLinhas} linha(s) importada(s). Materiais consolidados: ${totalConsolidado}. Materiais repetidos foram agrupados automaticamente na visão consolidada.`);
                }
            
               function renderTabelaPrincipal(obra) {
                const thead = document.getElementById('theadItens');
                const tbody = document.getElementById('tbodyItens');
                if (!thead || !tbody) return;
            
                // Proteção 1: Garante que 'obra' exista
                if (!obra) {
                    tbody.innerHTML = '<tr><td colspan="15" style="text-align:center; padding:20px;">Nenhuma obra selecionada ou carregada.</td></tr>';
                    return;
                }
            
                // Proteção 2: Garante que 'cfg' exista com valores padrão
                const cfg = (db && db.config) ? db.config : { dimensoes: true, fem: true, fab: true, inst: true };
                const termoSearch = document.getElementById('searchItens')?.value || '';
                let colDados = cfg.dimensoes ? 9 : 7;
            
                let htmlThead1 = `<tr><th colspan="${colDados}" class="head-base"><div class="th-content">DADOS BÁSICOS</div></th>`;
                if (cfg.fem) htmlThead1 += `<th colspan="3" class="head-fem"><div class="th-content">LIBERAÇÃO (FEM)</div></th>`;
                if (cfg.fab) htmlThead1 += `<th colspan="3" class="head-fab"><div class="th-content">FABRICAÇÃO</div></th>`;
                if (cfg.inst) htmlThead1 += `<th colspan="5" class="head-inst"><div class="th-content">INSTALAÇÃO</div></th>`;
                htmlThead1 += `<th rowspan="2" class="head-base"><div class="th-content">Ações</div></th></tr>`;
            
                let htmlThead2 = `<tr><th class="head-base"><div class="th-content" style="min-width:44px;">Vista</div></th><th class="head-base"><div class="th-content">Referência</div></th><th class="head-base"><div class="th-content" style="min-width: 220px;">Descrição da Tipologia</div></th><th class="head-base"><div class="th-content" style="min-width: 140px;">Localização</div></th><th class="head-base"><div class="th-content" style="min-width: 120px;">Vidros</div></th><th class="head-base"><div class="th-content">Qtd</div></th>`;
                if (cfg.dimensoes) htmlThead2 += `<th class="head-base"><div class="th-content">Largura (m)</div></th><th class="head-base"><div class="th-content">Altura (m)</div></th>`;
                htmlThead2 += `<th class="head-base"><div class="th-content">Área Total</div></th>`;
                if (cfg.fem) htmlThead2 += `<th class="head-fem"><div class="th-content">FEM</div></th><th class="head-fem"><div class="th-content">Saldo</div></th><th class="head-fem"><div class="th-content">% FEM</div></th>`;
                if (cfg.fab) htmlThead2 += `<th class="head-fab"><div class="th-content">Fabricado</div></th><th class="head-fab"><div class="th-content">Saldo</div></th><th class="head-fab"><div class="th-content">% Fab</div></th>`;
                if (cfg.inst) htmlThead2 += `<th class="head-inst"><div class="th-content">Instalado</div></th><th class="head-inst"><div class="th-content">Data Inst.</div></th><th class="head-inst"><div class="th-content">M² Inst</div></th><th class="head-inst"><div class="th-content">M² Saldo</div></th><th class="head-inst"><div class="th-content">% Inst</div></th>`;
                htmlThead2 += `</tr>`;
            
                thead.innerHTML = htmlThead1 + htmlThead2;
            
                const rows = [];
                window._itemPreviewMap = {};
            
                // Proteção 3: Sanitiza e renderiza cada item sem quebrar por campos ausentes
                (obra.itens || []).filter(i => i && typeof itemBateFiltro === 'function' ? itemBateFiltro(i, termoSearch) : true).forEach(item => {
                    window._itemPreviewMap[item.id] = item;
                    
                    const larg = Number(item.larg || item.largura || 0);
                    const alt = Number(item.alt || item.altura || 0);
                    const qtd = Number(item.qtd || item.quantidade || 1);
                    
                    const areaUnit = larg * alt;
                    const areaTotal = qtd * areaUnit;
                    const isCompleted = item.instalado && item.instalado >= qtd;
            
                    const miniatura = typeof gerarMiniaturaEsquadria === 'function' ? gerarMiniaturaEsquadria(item, 40) : '';
                    
                    let htmlRow = `<tr class="${isCompleted ? 'row-completed' : ''}">
                            <td><div style="cursor:pointer;display:flex;align-items:center;justify-content:center;" onclick="_itemPreviewMap[${item.id}] && abrirPreviewEsquadria(_itemPreviewMap[${item.id}])"><img src="${miniatura}" style="height:36px;width:auto;border:1px solid #ccc;border-radius:3px;" title="Clique para ampliar"></div></td>
                            <td><input type="text" class="text-left" value="${item.ref || ''}" onchange="editarItem(${item.id}, 'ref', this.value)"></td>
                            <td><input type="text" class="text-left" value="${typeof titleCase === 'function' ? titleCase(item.tipo || '') : (item.tipo || '')}" onchange="editarItem(${item.id}, 'tipo', this.value)"></td>
                            <td><input type="text" class="text-left" value="${typeof titleCase === 'function' ? titleCase(item.loc || '') : (item.loc || '')}" onchange="editarItem(${item.id}, 'loc', this.value)"></td>
                            <td><input type="text" class="text-left" value="${typeof titleCase === 'function' ? titleCase(item.vidro || '') : (item.vidro || '')}" onchange="editarItem(${item.id}, 'vidro', this.value)"></td>
                            <td><input type="number" value="${qtd}" onchange="editarItem(${item.id}, 'qtd', this.value)"></td>`;
            
                    if (cfg.dimensoes) htmlRow += `
                            <td><input type="number" step="0.001" value="${larg}" onchange="editarItem(${item.id}, 'larg', this.value)"></td>
                            <td><input type="number" step="0.001" value="${alt}" onchange="editarItem(${item.id}, 'alt', this.value)"></td>`;
            
                    htmlRow += `<td><div class="td-content"><b>${areaTotal.toFixed(2)}</b></div></td>`;
            
                    if (cfg.fem) htmlRow += `<td><input type="number" value="${item.fem || 0}" onchange="editarItem(${item.id}, 'fem', this.value)"></td><td><div class="td-content">${qtd - (item.fem || 0)}</div></td><td><div class="td-content"><b>${(qtd > 0 ? ((item.fem || 0) / qtd) * 100 : 0).toFixed(0)}%</b></div></td>`;
                    if (cfg.fab) htmlRow += `<td><input type="number" value="${item.fabricado || 0}" onchange="editarItem(${item.id}, 'fabricado', this.value)"></td><td><div class="td-content">${qtd - (item.fabricado || 0)}</div></td><td><div class="td-content"><b>${(qtd > 0 ? ((item.fabricado || 0) / qtd) * 100 : 0).toFixed(0)}%</b></div></td>`;
                    if (cfg.inst) htmlRow += `<td><input type="number" value="${item.instalado || 0}" onchange="editarItem(${item.id}, 'instalado', this.value)"></td><td><input type="date" value="${item.dataInstalacao || ''}" onchange="editarItem(${item.id}, 'dataInstalacao', this.value)"></td><td><div class="td-content">${((item.instalado || 0) * areaUnit).toFixed(2)}</div></td><td><div class="td-content">${(areaTotal - ((item.instalado || 0) * areaUnit)).toFixed(2)}</div></td><td><div class="td-content"><b>${(areaTotal > 0 ? (((item.instalado || 0) * areaUnit) / areaTotal) * 100 : 0).toFixed(0)}%</b></div></td>`;
            
                    // PATCH 34: botao de exportar removido da linha do item (mantido apenas excluir)
                    htmlRow += `<td><div class="actions-cell"><button class="danger" onclick="excluirItem(${item.id})">❌</button></div></td></tr>`;
                    rows.push(htmlRow);
                });
                
                tbody.innerHTML = rows.length > 0 ? rows.join('') : '<tr><td colspan="15" style="text-align:center; padding:15px;">Nenhum item encontrado nesta obra.</td></tr>';
            }
            
            
                function renderTabelaLiberacao(obra) {
                    const tbody = document.getElementById('tbodyLiberacao');
                    const termoSearch = document.getElementById('searchLiberacao')?.value || '';
                    const rows = [];
            
                    (obra.itens || []).filter(i => itemBateFiltro(i, termoSearch) && !i.hiddenFromLiberacao).forEach(item => {
                        const area = item.qtd * (item.larg * item.alt);
                        const fem = item.fem || 0;
                        const pct = item.qtd > 0 ? (fem / item.qtd) * 100 : 0;
                        const isCompleted = pct >= 100;
                        const miniatura = gerarMiniaturaEsquadria(item, 40);
            
                        rows.push(`<tr class="${isCompleted ? 'row-completed' : ''}">
                                <td><div style="cursor:pointer;display:flex;align-items:center;justify-content:center;" onclick="_itemPreviewMap[${item.id}] && abrirPreviewEsquadria(_itemPreviewMap[${item.id}])"><img src="${miniatura}" style="height:36px;width:auto;border:1px solid #ccc;border-radius:3px;" title="Clique para ampliar"></div></td>
                                <td><div class="td-content"><b>${titleCase(item.ref || 'S/N')}</b></div></td>
                                <td style="text-align:left;"><div class="td-content">${titleCase(item.tipo || '')}</div></td>
                                <td style="text-align:left;"><div class="td-content">${titleCase(item.loc || '')}</div></td>
                                <td style="text-align:left;"><div class="td-content">${titleCase(item.vidro || '')}</div></td>
                                <td><div class="td-content">${item.qtd}</div></td>
                                <td><div class="td-content">${area.toFixed(2)} m²</div></td>
                                <td><div class="td-content"><b style="color: var(--warning);">${fem}</b></div></td>
                                <td><div class="td-content">${item.qtd - fem}</div></td>
                                <td><div class="td-content"><b>${(fem * (item.larg * item.alt)).toFixed(2)} m²</b></div></td>
                                <td><div class="td-content"><div class="progress-bar-bg"><div class="progress-bar-fill ${pct >= 100 ? 'complete' : ''}" style="width: ${Math.min(pct, 100)}%;"></div></div><b>${pct.toFixed(0)}%</b></div></td>
                                <td><div class="td-content">${pct >= 100 ? '<span style="color:#10b981;font-weight:bold;">100% Liberado</span>' : (pct > 0 ? '<span style="color:#f59e0b;font-weight:bold;">Em Liberação</span>' : '<span style="opacity:0.6;">Pendente</span>')}</div></td>
                                <td><div class="td-content"><button onclick="softDeleteFromTab(${item.id},'liberacao')" title="Ocultar desta aba" style="background:none;border:none;cursor:pointer;font-size:16px;">🚪</button></div></td>
                            </tr>`);
                    });
                    tbody.innerHTML = rows.join('');
                }
            
                function renderTabelaFabricacao(obra) {
                    const tbody = document.getElementById('tbodyFabricacao');
                    const termoSearch = document.getElementById('searchFabricacao')?.value || '';
                    const rows = [];
            
                    (obra.itens || []).filter(i => itemBateFiltro(i, termoSearch) && !i.hiddenFromFabricacao).forEach(item => {
                        const area = item.qtd * (item.larg * item.alt);
                        const fabricado = item.fabricado || 0;
                        const pct = item.qtd > 0 ? (fabricado / item.qtd) * 100 : 0;
                        const isCompleted = pct >= 100;
                        const miniatura = gerarMiniaturaEsquadria(item, 40);
            
                        rows.push(`<tr class="${isCompleted ? 'row-completed' : ''}">
                                <td><div style="cursor:pointer;display:flex;align-items:center;justify-content:center;" onclick="_itemPreviewMap[${item.id}] && abrirPreviewEsquadria(_itemPreviewMap[${item.id}])"><img src="${miniatura}" style="height:36px;width:auto;border:1px solid #ccc;border-radius:3px;" title="Clique para ampliar"></div></td>
                                <td><div class="td-content"><b>${titleCase(item.ref || 'S/N')}</b></div></td>
                                <td style="text-align:left;"><div class="td-content">${titleCase(item.tipo || '')}</div></td>
                                <td style="text-align:left;"><div class="td-content">${titleCase(item.loc || '')}</div></td>
                                <td style="text-align:left;"><div class="td-content">${titleCase(item.vidro || '')}</div></td>
                                <td><div class="td-content">${item.qtd}</div></td>
                                <td><div class="td-content">${area.toFixed(2)} m²</div></td>
                                <td><div class="td-content"><b style="color: #2563eb;">${fabricado}</b></div></td>
                                <td><div class="td-content">${item.qtd - fabricado}</div></td>
                                <td><div class="td-content"><b>${(fabricado * (item.larg * item.alt)).toFixed(2)} m²</b></div></td>
                                <td><div class="td-content"><div class="progress-bar-bg"><div class="progress-bar-fill ${pct >= 100 ? 'complete' : ''}" style="width: ${Math.min(pct, 100)}%; background: ${pct >= 100 ? '#2563eb' : '#60a5fa'};"></div></div><b>${pct.toFixed(0)}%</b></div></td>
                                <td><div class="td-content">${pct >= 100 ? '<span style="color:#2563eb;font-weight:bold;">100% Fabricado</span>' : (pct > 0 ? '<span style="color:#f59e0b;font-weight:bold;">Em Fabricação</span>' : '<span style="opacity:0.6;">Pendente</span>')}</div></td>
                                <td><div class="td-content"><button onclick="softDeleteFromTab(${item.id},'fabricacao')" title="Ocultar desta aba" style="background:none;border:none;cursor:pointer;font-size:16px;">🚪</button></div></td>
                            </tr>`);
                    });
                    tbody.innerHTML = rows.join('');
                }
            
                function renderTabelaInstalacao(obra) {
                    const tbody = document.getElementById('tbodyInstalacao');
                    const termoSearch = document.getElementById('searchInstalacao')?.value || '';
                    const rows = [];
            
                    (obra.itens || []).filter(i => itemBateFiltro(i, termoSearch) && !i.hiddenFromInstalacao).forEach(item => {
                        const area = item.qtd * (item.larg * item.alt);
                        const instalado = item.instalado || 0;
                        const m2Instalado = instalado * (item.larg * item.alt);
                        const m2Saldo = area - m2Instalado;
                        const pct = item.qtd > 0 ? (instalado / item.qtd) * 100 : 0;
                        const isCompleted = pct >= 100;
                        const miniatura = gerarMiniaturaEsquadria(item, 40);
            
                        rows.push(`<tr class="${isCompleted ? 'row-completed' : ''}">
                                <td><div style="cursor:pointer;display:flex;align-items:center;justify-content:center;" onclick="_itemPreviewMap[${item.id}] && abrirPreviewEsquadria(_itemPreviewMap[${item.id}])"><img src="${miniatura}" style="height:36px;width:auto;border:1px solid #ccc;border-radius:3px;" title="Clique para ampliar"></div></td>
                                <td><div class="td-content"><b>${titleCase(item.ref || 'S/N')}</b></div></td>
                                <td style="text-align:left;"><div class="td-content">${titleCase(item.tipo || '')}</div></td>
                                <td style="text-align:left;"><div class="td-content">${titleCase(item.loc || '')}</div></td>
                                <td style="text-align:left;"><div class="td-content">${titleCase(item.vidro || '')}</div></td>
                                <td><div class="td-content">${item.qtd}</div></td>
                                <td><div class="td-content">${area.toFixed(2)} m²</div></td>
                                <td><div class="td-content"><b style="color: #10b981;">${instalado}</b></div></td>
                                <td><div class="td-content">${m2Instalado.toFixed(2)} m²</div></td>
                                <td><div class="td-content">${m2Saldo.toFixed(2)} m²</div></td>
                                <td><div class="td-content"><div class="progress-bar-bg"><div class="progress-bar-fill ${pct >= 100 ? 'complete' : ''}" style="width: ${Math.min(pct, 100)}%;"></div></div><b>${pct.toFixed(0)}%</b></div></td>
                                <td><div class="td-content">${pct >= 100 ? '<span style="color:#10b981;font-weight:bold;">100% Instalado</span>' : (pct > 0 ? '<span style="color:#f59e0b;font-weight:bold;">Em Instalação</span>' : '<span style="opacity:0.6;">Pendente</span>')}</div></td>
                                <td><div class="td-content"><button class="btn-lanc-inst" onclick="abrirLancamentosInstalacao(${item.id})" title="Lançamentos de instalação (varias datas)">${window.p36Resumo ? window.p36Resumo(item) : 'Lancar'}</button></div></td>
                                <td><div class="td-content"><button onclick="softDeleteFromTab(${item.id},'instalacao')" title="Ocultar desta aba" style="background:none;border:none;cursor:pointer;font-size:16px;">🚪</button></div></td>
                            </tr>`);
                    });
                    tbody.innerHTML = rows.join('');
                }
            
                function renderBoletimMedicao(obra, areaTotalGeral, valorServicoTotal) {
                    const tbody = document.getElementById('tbodyMedicaoBoletim');
                    const termoSearch = document.getElementById('searchMedicao')?.value || '';
            
                    const maxMed = obra.numMedicaoMax || 1;
                    if (medicaoselecionadaIndex > maxMed) medicaoselecionadaIndex = maxMed;
                    if (medicaoselecionadaIndex < 1) medicaoselecionadaIndex = 1;
            
                    const isHistorico = medicaoselecionadaIndex < maxMed;
                    const banner = document.getElementById('bannerEdicaoHistorico');
                    if (isHistorico) {
                        banner.style.display = 'block';
                        document.getElementById('lblMedicaoHistoricoNum').innerText = medicaoselecionadaIndex;
                    } else {
                        banner.style.display = 'none';
                    }
            
                    document.getElementById('lblNavMedicaoNum').innerText = `Nº ${medicaoselecionadaIndex}`;
                    document.getElementById('medConsideracoes').value = (obra.consideracoesPorMedicao && obra.consideracoesPorMedicao[medicaoselecionadaIndex]) || "";
            
                    const valorPorM2 = areaTotalGeral > 0 ? (valorServicoTotal / areaTotalGeral) : 0;
                    let totalM2RealizadoAtual = 0;
                    let totalValorRealizadoAtual = 0;
                    let totalM2AcumuladoGeral = 0;
                    let totalValorAcumuladoGeral = 0;
                    let totalRetencao = 0;              // 5% da medicao selecionada
                    let totalRetencaoAcumuladaGeral = 0; // PATCH 33: total retido acumulado
                    let totalRetencaoDeduzida = 0;       // PATCH 33: devolucao na medicao final
                    let totalLiquido = 0;
                    const rows = [];
            
                    (obra.itens || []).filter(i => itemBateFiltro(i, termoSearch)).forEach(item => {
                        const areaUnit = item.larg * item.alt;
                        const areaTotalItem = item.qtd * areaUnit;
            
                        if (!item.historicoMedicoes) item.historicoMedicoes = {};
            
                        let m2Anterior = 0;
                        for (let m = 1; m < medicaoselecionadaIndex; m++) {
                            m2Anterior += Number(item.historicoMedicoes[m] || 0);
                        }
            
                        const m2Atual = Number(item.historicoMedicoes[medicaoselecionadaIndex] || 0);
                        let m2TotalAcumulado = m2Anterior + m2Atual;
                        const saldoM2 = areaTotalItem - m2TotalAcumulado;
            
                        const valorMedicaoAtualItem = m2Atual * valorPorM2;
                        // === PATCH 33: 5% retidos em CADA medicao; total retido e devolvido na medicao final ===
                        const retencaoItem = valorMedicaoAtualItem * 0.05;
                        const retencaoAcumuladaItem = m2TotalAcumulado * valorPorM2 * 0.05;
                        const _medFinal = (typeof _isMedicaoFinalAtual === 'function') ? _isMedicaoFinalAtual(obra) : false;
                        const devolucaoRetencaoItem = _medFinal ? retencaoAcumuladaItem : 0;
                        const retencaoDeduzidaItem = devolucaoRetencaoItem; // compatibilidade
                        const liquidoPagarItem = valorMedicaoAtualItem - retencaoItem + devolucaoRetencaoItem;
            
                        const valorContratoItem = areaTotalItem * valorPorM2;
                        const valorAcumuladoTotalItem = m2TotalAcumulado * valorPorM2;
                        const saldoContratoItem = valorContratoItem - valorAcumuladoTotalItem;
            
                        totalM2RealizadoAtual += m2Atual;
                        totalValorRealizadoAtual += valorMedicaoAtualItem;
                        totalM2AcumuladoGeral += m2TotalAcumulado;
                        totalValorAcumuladoGeral += valorAcumuladoTotalItem;
                        totalRetencao += retencaoItem;
                        totalRetencaoAcumuladaGeral += retencaoAcumuladaItem; // PATCH 33
                        totalRetencaoDeduzida += devolucaoRetencaoItem;       // PATCH 33
                        totalLiquido += liquidoPagarItem;
            
                        const isCompleted = saldoM2 <= 0.001 && areaTotalItem > 0;
            
                        rows.push(`<tr class="${isCompleted ? 'row-completed' : ''}">
                                <td><div class="td-content"><b>${item.ref || ''}</b></div></td>
                                <td style="text-align:left;"><div class="td-content">${titleCase(item.tipo || '')}</div></td>
                                <td><div class="td-content">${item.qtd}</div></td>
                                <td><div class="td-content"><b>${areaTotalItem.toFixed(2)}</b></div></td>
                                <td><div class="td-content" style="background:rgba(255,255,255,0.05);">${m2Anterior.toFixed(2)}</div></td>
                                <td><input type="number" step="0.01" style="background:#fef9c3; color:#000; font-weight:bold;" value="${m2Atual.toFixed(2)}" onchange="editarM2Medicao(${item.id}, this.value)"></td>
                                <td><div class="td-content"><b>${m2TotalAcumulado.toFixed(2)}</b></div></td>
                                <td><div class="td-content">${saldoM2.toFixed(2)}</div></td>
                                <td><div class="td-content">R$ ${valorMedicaoAtualItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div></td>
                                <td><div class="td-content" style="color:#ef4444; font-weight:bold;">R$ ${retencaoItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div></td>
                                <td><div class="td-content" style="color:#b91c1c; font-weight:bold;">R$ ${retencaoAcumuladaItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div></td>
                                <td><div class="td-content" style="color:#0ea5e9; font-weight:bold;">${devolucaoRetencaoItem > 0 ? '+ R$ ' + devolucaoRetencaoItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'R$ 0,00'}</div></td>
                                <td><div class="td-content" style="color:#10b981; font-weight:bold;">R$ ${liquidoPagarItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div></td>
                                <td><div class="td-content" style="background:#fef08a; color:#000;"><b>R$ ${saldoContratoItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></div></td>
                            </tr>`);
                    });
                    tbody.innerHTML = rows.join('');
            
                    document.getElementById('medHeaderM2Contrato').innerText = areaTotalGeral.toFixed(2) + " m²";
                    document.getElementById('medHeaderValorServicoTotal').innerText = "R$ " + valorServicoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    document.getElementById('medHeaderM2Acumulado').innerText = totalM2AcumuladoGeral.toFixed(2) + " m²";
                    document.getElementById('medHeaderValorAcumulado').innerText = "R$ " + totalValorAcumuladoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            
                    document.getElementById('medHeaderM2Atual').innerText = totalM2RealizadoAtual.toFixed(2) + " m²";
                    document.getElementById('medHeaderValAtual').innerText = "R$ " + totalValorRealizadoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    document.getElementById('medHeaderRetencao').innerText = "R$ " + totalRetencao.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    // === PATCH 33: total retido acumulado ===
                    var _elRetAcum = document.getElementById('medHeaderRetencaoAcumulada');
                    if (_elRetAcum) _elRetAcum.innerText = "R$ " + totalRetencaoAcumuladaGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    document.getElementById('medHeaderLiquido').innerText = "R$ " + totalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    // === PATCH 29: total deduzido + estado do seletor de medicao final ===
                    var _elRetDed = document.getElementById('medHeaderRetencaoDeduzida');
                    if (_elRetDed) _elRetDed.innerText = "R$ " + totalRetencaoDeduzida.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    var _chkMedFinal = document.getElementById('chkMedicaoFinal');
                    if (_chkMedFinal) {
                        _chkMedFinal.checked = (typeof _isMedicaoFinalAtual === 'function') ? _isMedicaoFinalAtual(obra) : false;
                        var _lblMedFinal = document.getElementById('lblMedicaoFinal');
                        if (_lblMedFinal) {
                            _lblMedFinal.style.background = _chkMedFinal.checked ? '#fee2e2' : 'transparent';
                            _lblMedFinal.style.color = _chkMedFinal.checked ? '#991b1b' : '';
                        }
                    }
                }
            
                function navegarMedicao(delta) {
                    const obra = getObraAtual();
                    const novaMed = medicaoselecionadaIndex + delta;
                    if (novaMed >= 1 && novaMed <= (obra.numMedicaoMax || 1)) {
                        medicaoselecionadaIndex = novaMed;
                        render();
                    }
                }
            
                function irParaUltimaMedicao() {
                    const obra = getObraAtual();
                    medicaoselecionadaIndex = obra.numMedicaoMax || 1;
                    render();
                }

                // === PATCH 29: controle da medicao final (deducao da retencao) ===
                function _isMedicaoFinalAtual(obra) {
                    var o = obra || (typeof getObraAtual === 'function' ? getObraAtual() : null);
                    if (!o) return false;
                    if (!o.medicoesFinais) return false;
                    return !!o.medicoesFinais[medicaoselecionadaIndex];
                }

                function toggleMedicaoFinal(marcado) {
                    var obra = getObraAtual();
                    if (!obra) return;
                    if (!obra.medicoesFinais) obra.medicoesFinais = {};
                    if (marcado) {
                        // Somente uma medicao pode ser a final
                        obra.medicoesFinais = {};
                        obra.medicoesFinais[medicaoselecionadaIndex] = true;
                    } else {
                        delete obra.medicoesFinais[medicaoselecionadaIndex];
                    }
                    salvarDB();
                    if (typeof render === 'function') render();
                }
                // === FIM PATCH 29 ===

            
                function encerrarECriarNovaMedicao() {
                    const obra = getObraAtual();
                    const maxMed = obra.numMedicaoMax || 1;
            
                    if (medicaoselecionadaIndex !== maxMed) {
                        alert(`Por favor, volte para a Medição Atual (Nº ${maxMed}) antes de criar a próxima!`);
                        irParaUltimaMedicao();
                        return;
                    }
            
                    if (confirm(`Deseja fechar a Medição Nº ${maxMed} e abrir a Medição Nº ${maxMed + 1}?`)) {
                        obra.numMedicaoMax = maxMed + 1;
                        medicaoselecionadaIndex = obra.numMedicaoMax;
                        salvarDB();
                        alert(`Medição Nº ${maxMed} encerrada! Agora você está editando a Medição Nº ${obra.numMedicaoMax}.`);
                    }
                }
            
                function renderGraficosEstiloExcel(obra, pctFemGeral, pctFabGeral, pctInstGeral) {
                    const isDark = document.body.classList.contains('dark-mode');
                    const textColor = isDark ? '#f8fafc' : '#1e293b';
                    const gridColor = isDark ? '#334155' : '#cbd5e1';
            
                    const labels = (obra.itens || []).map(i => i.ref || 'S/N');
                    const dataFem = (obra.itens || []).map(i => i.qtd > 0 ? Math.round(((i.fem || 0) / i.qtd) * 100) : 0);
                    const dataFab = (obra.itens || []).map(i => i.qtd > 0 ? Math.round(((i.fabricado || 0) / i.qtd) * 100) : 0);
                    const dataInst = (obra.itens || []).map(i => {
                        const areaTotal = i.qtd * (i.larg * i.alt);
                        const areaInst = (i.instalado || 0) * (i.larg * i.alt);
                        return areaTotal > 0 ? Math.round((areaInst / areaTotal) * 100) : 0;
                    });
            
                    const barChartOptions = {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { min: 0, max: 100, ticks: { color: textColor, callback: v => v + '%' }, grid: { color: gridColor } },
                            x: { ticks: { color: textColor, maxRotation: 90, minRotation: 90, font: { size: 9 } }, grid: { display: false } }
                        }
                    };
            
                    if (chartInstanceLiberacao) chartInstanceLiberacao.destroy();
                    chartInstanceLiberacao = new Chart(document.getElementById('chartLiberacao'), {
                        type: 'bar',
                        data: { labels: labels, datasets: [{ data: dataFem, backgroundColor: '#f59e0b', barPercentage: 0.6 }] },
                        options: barChartOptions
                    });
            
                    if (chartInstanceFabricacao) chartInstanceFabricacao.destroy();
                    chartInstanceFabricacao = new Chart(document.getElementById('chartFabricacao'), {
                        type: 'bar',
                        data: { labels: labels, datasets: [{ data: dataFab, backgroundColor: '#3b82f6', barPercentage: 0.6 }] },
                        options: barChartOptions
                    });
            
                    if (chartInstanceInstalacao) chartInstanceInstalacao.destroy();
                    chartInstanceInstalacao = new Chart(document.getElementById('chartInstalacao'), {
                        type: 'bar',
                        data: { labels: labels, datasets: [{ data: dataInst, backgroundColor: '#10b981', barPercentage: 0.6 }] },
                        options: barChartOptions
                    });
            
                    // PATCH 30: chamada no render de graficos
                    if (typeof renderGraficoInstalacaoPeriodo === 'function') renderGraficoInstalacaoPeriodo(obra);

                    if (chartInstanceResumo) chartInstanceResumo.destroy();
                    chartInstanceResumo = new Chart(document.getElementById('chartResumo'), {
                        type: 'bar',
                        data: {
                            labels: ['AVANÇO GLOBAL'],
                            datasets: [
                                { label: 'LIBERAÇÃO (FEM)', data: [Math.round(pctFemGeral)], backgroundColor: '#f59e0b' },
                                { label: 'FABRICAÇÃO', data: [Math.round(pctFabGeral)], backgroundColor: '#3b82f6' },
                                { label: 'INSTALAÇÃO', data: [Math.round(pctInstGeral)], backgroundColor: '#10b981' }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'bottom', labels: { color: textColor } } },
                            scales: {
                                y: { min: 0, max: 100, ticks: { color: textColor, stepSize: 10, callback: v => v + '%' }, grid: { color: gridColor } },
                                x: { ticks: { color: textColor } }
                            }
                        }
                    });
                }

                // === PATCH 30: Grafico de Instalacao por periodo ===
                function mudarPeriodoInstalacao(valor) {
                    periodoInstalacaoAtual = valor || 'mensal';
                    try { localStorage.setItem('periodo_instalacao', periodoInstalacaoAtual); } catch (e) {}
                    var obra = (typeof getObraAtual === 'function') ? getObraAtual() : null;
                    if (obra) renderGraficoInstalacaoPeriodo(obra);
                }

                function _chavePeriodoInstalacao(dataStr, periodo) {
                    // dataStr no formato YYYY-MM-DD
                    var partes = String(dataStr).slice(0, 10).split('-');
                    if (partes.length < 3) return null;
                    var ano = parseInt(partes[0], 10);
                    var mes = parseInt(partes[1], 10);
                    var dia = parseInt(partes[2], 10);
                    if (!ano || !mes || !dia) return null;
                    var d = new Date(ano, mes - 1, dia);
                    if (isNaN(d.getTime())) return null;
                    var mm = ('0' + mes).slice(-2);

                    if (periodo === 'anual') {
                        return { ordem: ano * 10000, rotulo: String(ano) };
                    }
                    if (periodo === 'mensal') {
                        var nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
                        return { ordem: ano * 10000 + mes * 100, rotulo: nomes[mes - 1] + '/' + String(ano).slice(-2) };
                    }
                    if (periodo === 'quinzenal') {
                        var q = dia <= 15 ? 1 : 2;
                        return { ordem: ano * 10000 + mes * 100 + q, rotulo: mm + '/' + String(ano).slice(-2) + ' - ' + q + 'a quinz.' };
                    }
                    // semanal (segunda-feira como inicio da semana)
                    var dow = d.getDay();                       // 0=domingo
                    var offset = (dow === 0) ? -6 : (1 - dow);
                    var seg = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
                    var chave = seg.getFullYear() * 10000 + (seg.getMonth() + 1) * 100 + seg.getDate();
                    var rot = ('0' + seg.getDate()).slice(-2) + '/' + ('0' + (seg.getMonth() + 1)).slice(-2) +
                              '/' + String(seg.getFullYear()).slice(-2);
                    return { ordem: chave, rotulo: 'sem. ' + rot };
                }

                function renderGraficoInstalacaoPeriodo(obra) {
                    var canvas = document.getElementById('chartInstalacaoPeriodo');
                    if (!canvas || typeof Chart === 'undefined') return;
                    if (!obra) return;

                    var sel = document.getElementById('selPeriodoInstalacao');
                    try {
                        var salvo = localStorage.getItem('periodo_instalacao');
                        if (salvo) periodoInstalacaoAtual = salvo;
                    } catch (e) {}
                    if (sel && sel.value !== periodoInstalacaoAtual) sel.value = periodoInstalacaoAtual;

                    var isDark = document.body.classList.contains('dark-mode');
                    var textColor = isDark ? '#f8fafc' : '#1e293b';
                    var gridColor = isDark ? '#334155' : '#cbd5e1';

                    // PATCH 36: soma por LANCAMENTO do historico de instalacao
                    // (itens antigos, sem historico, usam a dataInstalacao como fallback)
                    var mapa = {};
                    (obra.itens || []).forEach(function (item) {
                        if (!item) return;
                        var areaUnit = Number(item.larg || 0) * Number(item.alt || 0);
                        var lancs = (typeof window.p36Lancamentos === 'function')
                            ? window.p36Lancamentos(item)
                            : (item.dataInstalacao && Number(item.instalado || 0) > 0
                                ? [{ data: item.dataInstalacao, qtd: Number(item.instalado) }]
                                : []);
                        lancs.forEach(function (l) {
                            var inst = Number(l && l.qtd || 0);
                            if (!(inst > 0) || !l.data) return;
                            var m2 = inst * areaUnit;
                            if (!(m2 > 0)) return;
                            var k = _chavePeriodoInstalacao(l.data, periodoInstalacaoAtual);
                            if (!k) return;
                            if (!mapa[k.ordem]) mapa[k.ordem] = { rotulo: k.rotulo, m2: 0, qtd: 0 };
                            mapa[k.ordem].m2 += m2;
                            mapa[k.ordem].qtd += inst;
                        });
                    });

                    var ordens = Object.keys(mapa).sort(function (a, b) { return Number(a) - Number(b); });
                    var labels = ordens.map(function (o) { return mapa[o].rotulo; });
                    var valores = ordens.map(function (o) { return Number(mapa[o].m2.toFixed(2)); });
                    var acumulado = [];
                    var soma = 0;
                    valores.forEach(function (v) { soma += v; acumulado.push(Number(soma.toFixed(2))); });

                    if (chartInstanceInstalacaoPeriodo) chartInstanceInstalacaoPeriodo.destroy();

                    if (!labels.length) {
                        var ctxVazio = canvas.getContext('2d');
                        ctxVazio.clearRect(0, 0, canvas.width, canvas.height);
                        chartInstanceInstalacaoPeriodo = new Chart(canvas, {
                            type: 'bar',
                            data: { labels: ['Sem lançamentos de instalação'], datasets: [{ data: [0], backgroundColor: '#94a3b8' }] },
                            options: {
                                responsive: true, maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: { y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                                          x: { ticks: { color: textColor }, grid: { display: false } } }
                            }
                        });
                        return;
                    }

                    chartInstanceInstalacaoPeriodo = new Chart(canvas, {
                        data: {
                            labels: labels,
                            datasets: [
                                {
                                    type: 'bar',
                                    label: 'm² instalado no período',
                                    data: valores,
                                    backgroundColor: '#10b981',
                                    barPercentage: 0.7,
                                    yAxisID: 'y'
                                },
                                {
                                    type: 'line',
                                    label: 'm² acumulado',
                                    data: acumulado,
                                    borderColor: '#f59e0b',
                                    backgroundColor: '#f59e0b',
                                    borderWidth: 2,
                                    tension: 0.25,
                                    pointRadius: 3,
                                    yAxisID: 'y1'
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'bottom', labels: { color: textColor } },
                                tooltip: {
                                    callbacks: {
                                        label: function (ctx) {
                                            return ctx.dataset.label + ': ' +
                                                Number(ctx.parsed.y).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' m²';
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true, position: 'left',
                                    title: { display: true, text: 'm² no período', color: textColor },
                                    ticks: { color: textColor }, grid: { color: gridColor }
                                },
                                y1: {
                                    beginAtZero: true, position: 'right',
                                    title: { display: true, text: 'm² acumulado', color: textColor },
                                    ticks: { color: textColor }, grid: { display: false }
                                },
                                x: { ticks: { color: textColor, maxRotation: 60, minRotation: 0, font: { size: 9 } }, grid: { display: false } }
                            }
                        }
                    });
                }
                // === FIM PATCH 30 ===

            
                function editarM2Medicao(id, valor) {
                    const obra = getObraAtual();
                    const item = obra.itens.find(i => i.id === id);
                    if (item) {
                        if (!item.historicoMedicoes) item.historicoMedicoes = {};
                        item.historicoMedicoes[medicaoselecionadaIndex] = Number(valor) || 0;
                        salvarDB(false);
                    }
                }
            
                function sincronizarComInstalacao() {
                    const obra = getObraAtual();
                    (obra.itens || []).forEach(item => {
                        if (!item.historicoMedicoes) item.historicoMedicoes = {};
            
                        let m2Anterior = 0;
                        for (let m = 1; m < medicaoselecionadaIndex; m++) {
                            m2Anterior += Number(item.historicoMedicoes[m] || 0);
                        }
                        const m2InstaladoTotal = (Number(item.instalado || 0) * (item.larg * item.alt));
                        const m2Saldo = Math.max(0, m2InstaladoTotal - m2Anterior);
                        item.historicoMedicoes[medicaoselecionadaIndex] = m2Saldo;
                    });
                    salvarDB();
                }
            
                function abrirModalObra() {
                    modoNovaObra = false;
                    const obra = getObraAtual();
                    document.getElementById('modalObraTitle').innerText = 'Configurar Obra Atual';
                    document.getElementById('inputNomeObra').value = obra.nome || '';
                    document.getElementById('inputNumContrato').value = obra.numContrato || '';
                    document.getElementById('inputValorContrato').value = obra.valorContrato || '';
                    document.getElementById('inputPctServico').value = obra.pctServico !== undefined ? obra.pctServico : 20;
                    document.getElementById('modalObra').style.display = 'flex';
                }
            
                function abrirModalNovaObra() {
                    modoNovaObra = true;
                    document.getElementById('modalObraTitle').innerText = 'Nova Obra';
                    document.getElementById('inputNomeObra').value = '';
                    document.getElementById('inputNumContrato').value = '';
                    document.getElementById('inputValorContrato').value = '';
                    document.getElementById('inputPctServico').value = 20;
                    document.getElementById('modalObra').style.display = 'flex';
                }
            
                function salvarConfigObra() {
                    const nome = document.getElementById('inputNomeObra').value.trim();
                    if (!nome) { alert('Informe o nome da obra.'); return; }
                    const numContrato = document.getElementById('inputNumContrato').value.trim();
                    const valorContrato = Number(document.getElementById('inputValorContrato').value) || 0;
                    const pctServico = Number(document.getElementById('inputPctServico').value) || 20;
            
                    if (modoNovaObra) {
                        const novaObra = {
                            id: 'obra_' + Date.now(),
                            nome: nome,
                            numContrato: numContrato,
                            valorContrato: valorContrato,
                            pctServico: pctServico,
                            numMedicaoMax: 1,
                            consideracoesPorMedicao: {},
                            itens: [],
                            recebimentos: []
                        };
                        db.obras.push(novaObra);
                        db.obraAtualId = novaObra.id;
                    } else {
                        const obra = getObraAtual();
                        obra.nome = nome;
                        obra.numContrato = numContrato;
                        obra.valorContrato = valorContrato;
                        obra.pctServico = pctServico;
                    }
                    fecharModais();
                    salvarDB();
                }
            
                function excluirObraAtual() {
                    if (db.obras.length <= 1) {
                        alert('Você não pode excluir a única obra existente.');
                        return;
                    }
                    const obra = getObraAtual();
                    if (confirm(`Tem certeza que deseja excluir a obra "${obra.nome}"?`)) {
                        db.obras = db.obras.filter(o => o.id !== obra.id);
                        db.obraAtualId = db.obras[0].id;
                        salvarDB();
                    }
                }
            
                function exportarDados() {
                    exportarBancoMultiBrowser();
                }
            
                function restaurarBackupJSON(event) {
                    importarBancoMultiBrowser(event);
                }
            
                function abrirModalConfig() {
                    const cfg = db.config || { dimensoes: true, fem: true, fab: true, inst: true };
                    document.getElementById('cfg-dimensoes').checked = !!cfg.dimensoes;
                    document.getElementById('cfg-fem').checked = !!cfg.fem;
                    document.getElementById('cfg-fab').checked = !!cfg.fab;
                    document.getElementById('cfg-inst').checked = !!cfg.inst;
                    document.getElementById('modalConfig').style.display = 'flex';
                }
            
                function salvarConfig() {
                    db.config = {
                        dimensoes: document.getElementById('cfg-dimensoes').checked,
                        fem: document.getElementById('cfg-fem').checked,
                        fab: document.getElementById('cfg-fab').checked,
                        inst: document.getElementById('cfg-inst').checked
                    };
                    salvarDB();
                }
            
                function abrirModalImportarExcel(tipo) {
                    tipoImportacaoAtual = tipo;
                    document.getElementById('excelPasteArea').value = '';
                    document.getElementById('modalImportarExcel').style.display = 'flex';
                }
            
                function processarImportacaoExcel() {
                    const texto = document.getElementById('excelPasteArea').value.trim();
                    if (!texto) return;
                    const obra = getObraAtual();
                    if (!obra.itens) obra.itens = [];
            
                    const linhas = texto.split(/\r?\n/);
                    linhas.forEach(linha => {
                        const col = linha.split('\t').map(c => c.trim());
                        if (col.length < 2) return;
                        const ref = col[0] || '';
                        const tipo = col[1] || '';
                        const loc = col[2] || '';
                        const vidro = col[3] || '';
                        const qtd = Number(col[4]) || 1;
                        const larg = Number(col[5].replace(',', '.')) || 1.0;
                        const alt = Number(col[6].replace(',', '.')) || 1.0;
            
                        obra.itens.push({
                            id: Date.now() + Math.random(),
                            ref, tipo, loc, vidro, qtd, larg, alt,
                            fem: 0, fabricado: 0, instalado: 0,
                            dataInstalacao: null,
                            historicoMedicoes: {}
                        ,
                            hasBottom: true, ctmProfile: "largo"});
                    });
            
                    fecharModais();
                    salvarDB();
                }
            
                function abrirModalItem() {
                    document.getElementById('itemRef').value = '';
                    document.getElementById('itemTipo').value = '';
                    document.getElementById('itemLoc').value = '';
                    document.getElementById('itemVidro').value = '';
                    document.getElementById('itemQtd').value = 1;
                    document.getElementById('itemLarg').value = 1.0;
                    document.getElementById('itemAlt').value = 1.0;
                    document.getElementById('modalItem').style.display = 'flex';
                }
            
                function salvarNovoItem() {
                    const obra = getObraAtual();
                    if (!obra.itens) obra.itens = [];
                    obra.itens.push({
                        id: Date.now() + Math.random(),
                        ref: document.getElementById('itemRef').value.trim(),
                        tipo: document.getElementById('itemTipo').value.trim(),
                        loc: document.getElementById('itemLoc').value.trim(),
                        vidro: document.getElementById('itemVidro').value.trim(),
                        qtd: Number(document.getElementById('itemQtd').value) || 1,
                        larg: Number(document.getElementById('itemLarg').value) || 1.0,
                        alt: Number(document.getElementById('itemAlt').value) || 1.0,
                        fem: 0, fabricado: 0, instalado: 0,
                        dataInstalacao: null,
                        historicoMedicoes: {}
                    ,
                        hasBottom: true, ctmProfile: "largo"});
                    fecharModais();
                    salvarDB();
                }
            
                // ============================================================
                // SISTEMA DE PREVISÃO VISUAL DE ESQUADRIA
                // Gera miniatura Canvas com desenho geometrico por tipo
                // ============================================================
            
                function desenharEsquadriaCanvas(canvas, item, opcoes = {}) {
                    const {
                        larguraCanvas = 60, alturaCanvas = 60, corBorda = '#000', corVidro = '#d1e8ff',
                        corMoldura = '#555', corFundo = '#f8fafc', escalaTexto = false
                    } = opcoes;
            
                    canvas.width = larguraCanvas;
                    canvas.height = alturaCanvas;
                    const ctx = canvas.getContext('2d');
            
                    // Fundo
                    ctx.fillStyle = corFundo;
                    ctx.fillRect(0, 0, larguraCanvas, alturaCanvas);
            
                    // Borda preta externa (circulando a esquadria)
                    ctx.strokeStyle = corBorda;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(1.5, 1.5, larguraCanvas - 3, alturaCanvas - 3);
            
                    // Margem interna para moldura
                    const margem = Math.max(6, larguraCanvas * 0.08);
                    const mx = margem, my = margem;
                    const mw = larguraCanvas - 2 * mx;
                    const mh = alturaCanvas - 2 * my;
            
                    const tipo = (item.tipo || '').toUpperCase();
                    const proporcao = (item.alt > 0 && item.larg > 0) ? item.alt / item.larg : 1;
            
                    if (/JANELA/i.test(tipo) && !/MAXIM/i.test(tipo)) {
                        desenharJanelaGiro(ctx, mx, my, mw, mh, corMoldura, corVidro, proporcao, escalaTexto, item);
                    } else if (/MAXIM/i.test(tipo)) {
                        desenharMaximAr(ctx, mx, my, mw, mh, corMoldura, corVidro, proporcao, escalaTexto, item);
                    } else if (/PORTA/i.test(tipo)) {
                        desenharPorta(ctx, mx, my, mw, mh, corMoldura, corVidro, proporcao, escalaTexto, item);
                    } else if (/PAINEL|FIXO/i.test(tipo)) {
                        desenharPainelFixo(ctx, mx, my, mw, mh, corMoldura, corVidro, proporcao, escalaTexto, item);
                    } else {
                        desenharEsquadriaGenerica(ctx, mx, my, mw, mh, corMoldura, corVidro, proporcao, escalaTexto, item);
                    }
            
                    // Ref text se escalaTexto
                    if (escalaTexto && item.ref) {
                        ctx.fillStyle = '#000';
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(item.ref, larguraCanvas / 2, alturaCanvas - 6);
                    }
                }
            
                function desenharJanelaGiro(ctx, mx, my, mw, mh, corMoldura, corVidro, prop, escalaTexto, item) {
                    // Proporcao: se alto > largo, desenhar vertical; senao horizontal
                    const ehVertical = prop > 1.3;
                    const molduraLarg = Math.max(3, mw * 0.06);
            
                    if (ehVertical) {
                        // Janela de giro vertical (2 folhas sobrepostas)
                        const folhaH = mh / 2;
                        // Vidro superior
                        ctx.fillStyle = corVidro;
                        ctx.fillRect(mx + molduraLarg, my + molduraLarg, mw - 2 * molduraLarg, folhaH - 1.5 * molduraLarg);
                        // Moldura superior
                        ctx.strokeStyle = corMoldura;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(mx + molduraLarg, my + molduraLarg, mw - 2 * molduraLarg, folhaH - 1.5 * molduraLarg);
                        // Linha divisória
                        ctx.beginPath();
                        ctx.moveTo(mx, my + folhaH);
                        ctx.lineTo(mx + mw, my + folhaH);
                        ctx.stroke();
                        // Vidro inferior
                        ctx.fillStyle = corVidro;
                        ctx.fillRect(mx + molduraLarg, my + folhaH + molduraLarg * 0.5, mw - 2 * molduraLarg, folhaH - 1.5 * molduraLarg);
                        // Moldura inferior
                        ctx.strokeStyle = corMoldura;
                        ctx.strokeRect(mx + molduraLarg, my + folhaH + molduraLarg * 0.5, mw - 2 * molduraLarg, folhaH - 1.5 * molduraLarg);
                        // Moldura externa
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 2.5;
                        ctx.strokeRect(mx, my, mw, mh);
                        // Seta de abertura
                        if (escalaTexto) {
                            ctx.strokeStyle = '#e74c3c';
                            ctx.lineWidth = 1.5;
                            const cx = mx + mw / 2;
                            ctx.beginPath();
                            ctx.arc(cx, my + folhaH / 2, 6, 0.3, 2.8);
                            ctx.stroke();
                        }
                    } else {
                        // Janela de giro horizontal (2 folhas lado a lado)
                        const folhaW = mw / 2;
                        // Vidro esquerdo
                        ctx.fillStyle = corVidro;
                        ctx.fillRect(mx + molduraLarg, my + molduraLarg, folhaW - 1.5 * molduraLarg, mh - 2 * molduraLarg);
                        // Moldura esquerda
                        ctx.strokeStyle = corMoldura;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(mx + molduraLarg, my + molduraLarg, folhaW - 1.5 * molduraLarg, mh - 2 * molduraLarg);
                        // Travessa central
                        ctx.beginPath();
                        ctx.moveTo(mx + folhaW, my);
                        ctx.lineTo(mx + folhaW, my + mh);
                        ctx.stroke();
                        // Vidro direito
                        ctx.fillStyle = corVidro;
                        ctx.fillRect(mx + folhaW + molduraLarg * 0.5, my + molduraLarg, folhaW - 1.5 * molduraLarg, mh - 2 * molduraLarg);
                        // Moldura direita
                        ctx.strokeStyle = corMoldura;
                        ctx.strokeRect(mx + folhaW + molduraLarg * 0.5, my + molduraLarg, folhaW - 1.5 * molduraLarg, mh - 2 * molduraLarg);
                        // Moldura externa
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 2.5;
                        ctx.strokeRect(mx, my, mw, mh);
                    }
                }
            
                function desenharMaximAr(ctx, mx, my, mw, mh, corMoldura, corVidro, prop, escalaTexto, item) {
                    // Maxim-ar: janela com abertura superior para fora
                    const molduraLarg = Math.max(3, mw * 0.06);
                    const folhaAlt = mh * 0.55;
            
                    // Vidro principal (parte fixa inferior)
                    ctx.fillStyle = corVidro;
                    ctx.fillRect(mx + molduraLarg, my + folhaAlt + molduraLarg, mw - 2 * molduraLarg, mh - folhaAlt - 2 * molduraLarg);
                    ctx.strokeStyle = corMoldura;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(mx + molduraLarg, my + folhaAlt + molduraLarg, mw - 2 * molduraLarg, mh - folhaAlt - 2 * molduraLarg);
            
                    // Folha maxim-ar (parte superior) - com efeito de abertura
                    ctx.fillStyle = 'rgba(180, 210, 240, 0.9)'; // tom mais claro
                    ctx.fillRect(mx + molduraLarg, my + molduraLarg, mw - 2 * molduraLarg, folhaAlt - 1.5 * molduraLarg);
                    ctx.strokeStyle = corMoldura;
                    ctx.strokeRect(mx + molduraLarg, my + molduraLarg, mw - 2 * molduraLarg, folhaAlt - 1.5 * molduraLarg);
            
                    // Linha divisória (travessa)
                    ctx.strokeStyle = corMoldura;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(mx, my + folhaAlt);
                    ctx.lineTo(mx + mw, my + folhaAlt);
                    ctx.stroke();
            
                    // Seta de abertura (projeta para fora do plano)
                    if (escalaTexto) {
                        ctx.strokeStyle = '#e74c3c';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(mx + mw * 0.3, my + molduraLarg + folhaAlt * 0.3);
                        ctx.lineTo(mx + mw * 0.3, my + 2);
                        ctx.stroke();
                        // Setinha
                        ctx.beginPath();
                        ctx.moveTo(mx + mw * 0.3 - 4, my + 6);
                        ctx.lineTo(mx + mw * 0.3, my + 1);
                        ctx.lineTo(mx + mw * 0.3 + 4, my + 6);
                        ctx.stroke();
                    }
            
                    // Moldura externa
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 2.5;
                    ctx.strokeRect(mx, my, mw, mh);
                }
            
                function desenharPorta(ctx, mx, my, mw, mh, corMoldura, corVidro, prop, escalaTexto, item) {
                    const molduraLarg = Math.max(3, mw * 0.06);
            
                    // Porta: retangulo alto e estreito
                    // Preenchimento
                    const desc = (item.descricao || '').toUpperCase();
                    if (/VENEZIANA/i.test(desc)) {
                        // Porta veneziana - com linhas horizontais
                        ctx.fillStyle = '#e8e0d4';
                        ctx.fillRect(mx + molduraLarg, my + molduraLarg, mw - 2 * molduraLarg, mh - 2 * molduraLarg);
                        ctx.strokeStyle = corMoldura;
                        ctx.lineWidth = 1;
                        const numListras = Math.floor((mh - 2 * molduraLarg) / 5);
                        for (let i = 0; i < numListras; i++) {
                            const y = my + molduraLarg + i * 5;
                            ctx.beginPath();
                            ctx.moveTo(mx + molduraLarg + 1, y);
                            ctx.lineTo(mx + mw - molduraLarg - 1, y);
                            ctx.stroke();
                        }
                    } else {
                        // Porta lisa ou de giro
                        ctx.fillStyle = corVidro;
                        ctx.fillRect(mx + molduraLarg, my + molduraLarg, mw - 2 * molduraLarg, mh - 2 * molduraLarg);
                    }
            
                    // Moldura interna
                    ctx.strokeStyle = corMoldura;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(mx + molduraLarg, my + molduraLarg, mw - 2 * molduraLarg, mh - 2 * molduraLarg);
            
                    // Moldura externa
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 2.5;
                    ctx.strokeRect(mx, my, mw, mh);
            
                    // Dobradiças (bolinhas no lado)
                    if (escalaTexto) {
                        ctx.fillStyle = corMoldura;
                        ctx.beginPath();
                        ctx.arc(mx + molduraLarg + 2, my + mh * 0.2, 2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(mx + molduraLarg + 2, my + mh * 0.8, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            
                function desenharPainelFixo(ctx, mx, my, mw, mh, corMoldura, corVidro, prop, escalaTexto, item) {
                    const molduraLarg = Math.max(3, mw * 0.06);
            
                    // Painel fixo: vidro simples, sem abertura
                    ctx.fillStyle = corVidro;
                    ctx.fillRect(mx + molduraLarg, my + molduraLarg, mw - 2 * molduraLarg, mh - 2 * molduraLarg);
            
                    // Moldura interna
                    ctx.strokeStyle = corMoldura;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(mx + molduraLarg, my + molduraLarg, mw - 2 * molduraLarg, mh - 2 * molduraLarg);
            
                    // Linha central X (indicando fixo)
                    ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(mx + molduraLarg, my + molduraLarg);
                    ctx.lineTo(mx + mw - molduraLarg, my + mh - molduraLarg);
                    ctx.moveTo(mx + mw - molduraLarg, my + molduraLarg);
                    ctx.lineTo(mx + molduraLarg, my + mh - molduraLarg);
                    ctx.stroke();
            
                    // Moldura externa
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 2.5;
                    ctx.strokeRect(mx, my, mw, mh);
                }
            
                function desenharEsquadriaGenerica(ctx, mx, my, mw, mh, corMoldura, corVidro, prop, escalaTexto, item) {
                    const molduraLarg = Math.max(3, mw * 0.06);
            
                    // Generico: retangulo com vidro
                    ctx.fillStyle = corVidro;
                    ctx.fillRect(mx + molduraLarg, my + molduraLarg, mw - 2 * molduraLarg, mh - 2 * molduraLarg);
            
                    // Moldura interna
                    ctx.strokeStyle = corMoldura;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(mx + molduraLarg, my + molduraLarg, mw - 2 * molduraLarg, mh - 2 * molduraLarg);
            
                    // Moldura externa
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 2.5;
                    ctx.strokeRect(mx, my, mw, mh);
                }
            
                // Gerar miniatura como data URL
                function gerarMiniaturaEsquadria(item, tamanho = 48) {
                    const canvas = document.createElement('canvas');
                    // Ajustar proporcao do canvas conforme dimensoes do item
                    const prop = (item.alt > 0 && item.larg > 0) ? item.alt / item.larg : 1;
                    let w = tamanho, h = tamanho;
                    if (prop > 1.5) { h = tamanho; w = Math.max(20, Math.round(tamanho / prop)); }
                    else if (prop < 0.6) { w = tamanho; h = Math.max(20, Math.round(tamanho / prop)); }
                    desenharEsquadriaCanvas(canvas, item, { larguraCanvas: w, alturaCanvas: h });
                    return canvas.toDataURL('image/png');
                }
            
                // Modal de preview grande
                function abrirPreviewEsquadria(item) {
                    // Criar modal se nao existe
                    let modal = document.getElementById('modalPreviewEsquadria');
                    if (!modal) {
                        modal = document.createElement('div');
                        modal.id = 'modalPreviewEsquadria';
                        modal.className = 'modal-bg';
                        modal.innerHTML = `
                            <div class="modal" style="max-width:520px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                                    <h3 style="margin:0;">Pré-visualização da Esquadria</h3>
                                    <button class="secondary" onclick="fecharModais()" style="padding:4px 12px;">✕</button>
                                </div>
                                <div id="previewEsquadriaContent" style="display:flex;flex-direction:column;align-items:center;gap:12px;"></div>
                            </div>
                        `;
                        modal.addEventListener('click', e => { if (e.target === modal) fecharModais(); });
                        document.body.appendChild(modal);
                    }
            
                    const content = document.getElementById('previewEsquadriaContent');
            
                    // Ajustar proporcao real
                    const prop = (item.alt > 0 && item.larg > 0) ? item.alt / item.larg : 1;
                    let cw = 300, ch = 300;
                    if (prop > 1.5) { ch = 300; cw = Math.max(120, Math.round(200 / prop)); }
                    else if (prop < 0.6) { cw = 300; ch = Math.max(120, Math.round(200 * prop)); }
                    const canvasGrande = document.createElement('canvas');
                    desenharEsquadriaCanvas(canvasGrande, item, {
                        larguraCanvas: cw, alturaCanvas: ch,
                        corVidro: '#d1e8ff', corFundo: '#fff', escalaTexto: true
                    });
            
                    content.innerHTML = '';
            
                    // Info do item
                    const info = document.createElement('div');
                    info.style.cssText = 'text-align:left;width:100%;font-size:13px;line-height:1.6;';
                    info.innerHTML = `
                        <div style="display:grid;grid-template-columns:100px 1fr;gap:2px 8px;">
                            <b style="color:#64748b;">Ref:</b> <span>${item.ref || 'S/N'}</span>
                            <b style="color:#64748b;">Tipo:</b> <span>${titleCase(item.tipo || 'Esquadria')}</span>
                            <b style="color:#64748b;">Dimensões:</b> <span>${(item.larg || 0).toFixed(3)} × ${(item.alt || 0).toFixed(3)} m</span>
                            <b style="color:#64748b;">Qtd:</b> <span>${item.qtd || 0}</span>
                            <b style="color:#64748b;">Área:</b> <span>${((item.larg || 0) * (item.alt || 0)).toFixed(3)} m²</span>
                            ${item.cor ? '<b style="color:#64748b;">Cor:</b> <span>' + item.cor + '</span>' : ''}
                            ${item.loc ? '<b style="color:#64748b;">Local:</b> <span>' + titleCase(item.loc) + '</span>' : ''}
                            ${item.vidro && item.vidro !== 'Geral' ? '<b style="color:#64748b;">Vidro:</b> <span>' + item.vidro + '</span>' : ''}
                        </div>
                    `;
                    content.appendChild(info);
                    content.appendChild(canvasGrande);
            
                    // Dimensoes em mm abaixo do desenho
                    if (item.larg > 0 && item.alt > 0) {
                        const dimLabel = document.createElement('div');
                        dimLabel.style.cssText = 'font-size:11px;color:#64748b;text-align:center;';
                        dimLabel.textContent = `${Math.round(item.larg * 1000)} × ${Math.round(item.alt * 1000)} mm`;
                        content.appendChild(dimLabel);
                    }
            
                    modal.style.display = 'flex';
                }
            
                function editarItem(id, campo, valor) {
                    const obra = getObraAtual();
                    const item = (obra.itens || []).find(i => i.id === id);
                    if (!item) return;
                    if (['qtd', 'larg', 'alt', 'fem', 'fabricado', 'instalado'].includes(campo)) {
                        // PATCH 36: a diferenca da Qtd Instalada entra como lancamento no historico
                        if (campo === 'instalado' && typeof window.p36RegistrarAjuste === 'function') {
                            window.p36RegistrarAjuste(item, Number(valor) || 0);
                        }
                        item[campo] = Number(valor) || 0;
                        // Auto-set dataInstalacao when instalado changes from 0 to >0
                        if (campo === 'instalado' && Number(valor) > 0 && !item.dataInstalacao) {
                            item.dataInstalacao = new Date().toISOString().slice(0, 10);
                            // Update date input in same row if visible
                            const row = document.querySelector(`input[onchange*="editarItem(${id}, 'instalado'"]`)?.closest('tr');
                            const dateInput = row?.querySelector(`input[type="date"][onchange*="editarItem(${id}, 'dataInstalacao'"]`);
                            if (dateInput) dateInput.value = item.dataInstalacao;
                        }
                        // Clear dataInstalacao if instalado goes back to 0
                        if (campo === 'instalado' && Number(valor) <= 0) {
                            delete item.dataInstalacao;
                            const row = document.querySelector(`input[onchange*="editarItem(${id}, 'instalado'"]`)?.closest('tr');
                            const dateInput = row?.querySelector(`input[type="date"][onchange*="editarItem(${id}, 'dataInstalacao'"]`);
                            if (dateInput) dateInput.value = '';
                        }
                    } else if (campo === 'dataInstalacao') {
                        // Handle date field: empty string clears it
                        if (valor) {
                            item.dataInstalacao = valor;
                        } else {
                            delete item.dataInstalacao;
                        }
                        // PATCH 36: mantem o historico coerente com a data digitada
                        if (typeof window.p36SincronizarData === 'function') {
                            window.p36SincronizarData(item, valor);
                        }
                    } else {
                        item[campo] = valor;
                    }
                    salvarDB(false);
                }
            
                function softDeleteFromTab(id, tabName) {
                    const obra = getObraAtual();
                    const item = (obra.itens || []).find(i => i.id === id);
                    if (!item) return;
                    var flag = 'hiddenFrom' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
                    item[flag] = true;
                    salvarDB();
                    renderTabelaLiberacao(obra);
                    renderTabelaFabricacao(obra);
                    renderTabelaInstalacao(obra);
                }
            
                function excluirItem(id) {
                    const obra = getObraAtual();
                    if (confirm('Deseja excluir este item permanentemente de TODAS as abas?')) {
                        obra.itens = (obra.itens || []).filter(i => i.id !== id);
                        salvarDB();
                    }
                }

                // === PATCH 28: Exportacao de itens para Excel (XLSX) ===
                function _itemLinhaExport(item) {
                    var larg = Number(item.larg || item.largura || 0);
                    var alt  = Number(item.alt  || item.altura  || 0);
                    var qtd  = Number(item.qtd  || item.quantidade || 1);
                    var areaUnit  = larg * alt;
                    var areaTotal = qtd * areaUnit;
                    var fem  = Number(item.fem || 0);
                    var fab  = Number(item.fabricado || 0);
                    var inst = Number(item.instalado || 0);
                    return {
                        'Referencia': item.ref || '',
                        'Descricao da Tipologia': item.tipo || '',
                        'Localizacao': item.loc || '',
                        'Vidros': item.vidro || '',
                        'Qtd': qtd,
                        'Largura (m)': larg,
                        'Altura (m)': alt,
                        'Area Unitaria (m2)': Number(areaUnit.toFixed(3)),
                        'Area Total (m2)': Number(areaTotal.toFixed(3)),
                        'FEM': fem,
                        'Saldo FEM': qtd - fem,
                        '% FEM': qtd > 0 ? Number(((fem / qtd) * 100).toFixed(1)) : 0,
                        'Fabricado': fab,
                        'Saldo Fabricacao': qtd - fab,
                        '% Fabricado': qtd > 0 ? Number(((fab / qtd) * 100).toFixed(1)) : 0,
                        'Instalado': inst,
                        'Data Instalacao': item.dataInstalacao || '',
                        'M2 Instalado': Number((inst * areaUnit).toFixed(3)),
                        'M2 Saldo': Number((areaTotal - inst * areaUnit).toFixed(3)),
                        '% Instalado': areaTotal > 0 ? Number((((inst * areaUnit) / areaTotal) * 100).toFixed(1)) : 0
                    };
                }

                function _nomeArquivoExport(prefixo, sufixo) {
                    var base = (prefixo || 'Itens').toString();
                    base = base.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_').substring(0, 60);
                    var d = new Date();
                    var stamp = d.getFullYear() +
                        ('0' + (d.getMonth() + 1)).slice(-2) +
                        ('0' + d.getDate()).slice(-2);
                    return base + (sufixo ? '_' + sufixo : '') + '_' + stamp + '.xlsx';
                }

                function exportarItemXLSX(id) {
                    if (typeof XLSX === 'undefined') {
                        alert('Biblioteca de Excel (XLSX) nao carregada. Verifique a conexao com a internet.');
                        return;
                    }
                    var obra = getObraAtual();
                    if (!obra) { alert('Nenhuma obra selecionada.'); return; }
                    var item = (obra.itens || []).find(function (i) { return i.id === id; });
                    if (!item) { alert('Item nao encontrado.'); return; }

                    var linha = _itemLinhaExport(item);
                    var aoa = [['ITEM - ' + (obra.nome || 'Obra'), '']];
                    aoa.push(['', '']);
                    Object.keys(linha).forEach(function (k) { aoa.push([k, linha[k]]); });

                    var ws = XLSX.utils.aoa_to_sheet(aoa);
                    ws['!cols'] = [{ wch: 26 }, { wch: 34 }];
                    var wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Item');
                    var ref = (item.ref || 'item').toString();
                    XLSX.writeFile(wb, _nomeArquivoExport(ref, 'item'));
                }

                function exportarItensXLSX() {
                    if (typeof XLSX === 'undefined') {
                        alert('Biblioteca de Excel (XLSX) nao carregada. Verifique a conexao com a internet.');
                        return;
                    }
                    var obra = getObraAtual();
                    if (!obra) { alert('Nenhuma obra selecionada.'); return; }

                    var termo = (document.getElementById('searchItens') || {}).value || '';
                    var itens = (obra.itens || []).filter(function (i) {
                        if (!i) return false;
                        if (typeof itemBateFiltro === 'function') return itemBateFiltro(i, termo);
                        return true;
                    });
                    if (!itens.length) { alert('Nenhum item para exportar.'); return; }

                    var dados = itens.map(_itemLinhaExport);
                    var ws = XLSX.utils.json_to_sheet(dados);
                    ws['!cols'] = Object.keys(dados[0]).map(function (k) {
                        return { wch: Math.max(12, Math.min(34, k.length + 4)) };
                    });
                    var wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Itens');
                    XLSX.writeFile(wb, _nomeArquivoExport(obra.nome || 'Obra', 'itens'));
                }
                // === FIM PATCH 28 ===

            
                function salvarHeaderMedicao() {
                    const obra = getObraAtual();
                    if (!obra.consideracoesPorMedicao) obra.consideracoesPorMedicao = {};
                    obra.consideracoesPorMedicao[medicaoselecionadaIndex] = document.getElementById('medConsideracoes').value;
                    salvarDB(false);
                }
            
                function fecharModais() {
                    const modais = document.querySelectorAll('.modal-bg');
                    modais.forEach(m => m.style.display = 'none');
                }

            /* ===================================================================
               PATCH 35: colunas ajustaveis (arrastar para reordenar / redimensionar)
               Tabelas: Liberacao, Fabricacao e Instalacao.
               A ordem e as larguras sao salvas no navegador por tabela.
               =================================================================== */
            (function () {
                if (window.__patch35Colunas) return;
                window.__patch35Colunas = true;

                var TABELAS = ['tbodyLiberacao', 'tbodyFabricacao', 'tbodyInstalacao'];
                var PREFIXO = 'painelColunas_';
                var estados = {};
                var thArrastando = null;

                function lerCfg(chave) {
                    try {
                        var raw = localStorage.getItem(PREFIXO + chave);
                        if (!raw) return { ordem: null, larguras: {} };
                        var o = JSON.parse(raw) || {};
                        return {
                            ordem: (o.ordem && o.ordem.length) ? o.ordem : null,
                            larguras: o.larguras || {}
                        };
                    } catch (e) {
                        return { ordem: null, larguras: {} };
                    }
                }

                function gravarCfg(chave, cfg) {
                    try {
                        localStorage.setItem(PREFIXO + chave, JSON.stringify(cfg));
                    } catch (e) { /* armazenamento indisponivel - segue sem persistir */ }
                }

                function linhaCabecalho(chave) {
                    var tbody = document.getElementById(chave);
                    if (!tbody) return null;
                    var tabela = tbody.closest('table');
                    if (!tabela) return null;
                    return tabela.querySelector('thead tr');
                }

                function ordemAtual(tr) {
                    return Array.prototype.map.call(tr.children, function (th) {
                        return parseInt(th.getAttribute('data-col-orig'), 10) || 0;
                    });
                }

                function definirLargura(th, largura) {
                    th.style.width = largura + 'px';
                    th.style.minWidth = largura + 'px';
                    th.style.maxWidth = largura + 'px';
                    var conteudo = th.querySelector('.th-content');
                    if (conteudo) {
                        conteudo.style.minWidth = '0';
                        conteudo.style.width = '100%';
                        conteudo.style.overflow = 'hidden';
                        conteudo.style.textOverflow = 'ellipsis';
                    }
                }

                function limparLargura(th) {
                    th.setAttribute('style', th.getAttribute('data-estilo-orig') || '');
                    var conteudo = th.querySelector('.th-content');
                    if (conteudo) {
                        var orig = conteudo.getAttribute('data-estilo-orig');
                        if (orig) conteudo.setAttribute('style', orig);
                        else conteudo.removeAttribute('style');
                    }
                }

                function aplicarCabecalho(chave) {
                    var tr = linhaCabecalho(chave);
                    if (!tr) return;
                    var cfg = lerCfg(chave);
                    var ths = Array.prototype.slice.call(tr.children);

                    if (cfg.ordem) {
                        cfg.ordem.forEach(function (orig) {
                            for (var i = 0; i < ths.length; i++) {
                                if (parseInt(ths[i].getAttribute('data-col-orig'), 10) === orig) {
                                    tr.appendChild(ths[i]);
                                    break;
                                }
                            }
                        });
                    }

                    Array.prototype.forEach.call(tr.children, function (th) {
                        var orig = th.getAttribute('data-col-orig');
                        var largura = cfg.larguras[orig];
                        if (largura) definirLargura(th, largura);
                        else limparLargura(th);
                    });
                }

                function aplicarCorpo(chave) {
                    var tbody = document.getElementById(chave);
                    var tr = linhaCabecalho(chave);
                    if (!tbody || !tr) return;
                    var cfg = lerCfg(chave);
                    var ordem = ordemAtual(tr);
                    var larguras = [];
                    Array.prototype.forEach.call(tr.children, function (th) {
                        larguras.push(cfg.larguras[th.getAttribute('data-col-orig')] || 0);
                    });

                    Array.prototype.forEach.call(tbody.rows, function (linha) {
                        if (linha.cells.length !== ordem.length) return;
                        if (linha.getAttribute('data-col-mapeada') !== '1') {
                            Array.prototype.forEach.call(linha.cells, function (td, i) {
                                td.setAttribute('data-col-orig', String(i));
                            });
                            linha.setAttribute('data-col-mapeada', '1');
                        }
                        var mapa = {};
                        Array.prototype.forEach.call(linha.cells, function (td) {
                            mapa[td.getAttribute('data-col-orig')] = td;
                        });
                        ordem.forEach(function (orig) {
                            var td = mapa[String(orig)];
                            if (td) linha.appendChild(td);
                        });
                        Array.prototype.forEach.call(linha.cells, function (td, i) {
                            var largura = larguras[i];
                            if (largura) {
                                td.style.width = largura + 'px';
                                td.style.maxWidth = largura + 'px';
                                td.classList.add('col-ajustada');
                            } else {
                                td.style.width = '';
                                td.style.maxWidth = '';
                                td.classList.remove('col-ajustada');
                            }
                        });
                    });
                }

                function aplicarTudo(chave) {
                    var est = estados[chave] || {};
                    est.aplicando = true;
                    try {
                        aplicarCabecalho(chave);
                        aplicarCorpo(chave);
                    } catch (e) {
                        console.warn('PATCH 35: falha ao aplicar layout de colunas', chave, e);
                    }
                    setTimeout(function () { est.aplicando = false; }, 0);
                }

                function resetarColunas(chave) {
                    try { localStorage.removeItem(PREFIXO + chave); } catch (e) { /* ignora */ }
                    var tr = linhaCabecalho(chave);
                    if (!tr) return;
                    var ths = Array.prototype.slice.call(tr.children);
                    ths.sort(function (a, b) {
                        return (parseInt(a.getAttribute('data-col-orig'), 10) || 0) -
                               (parseInt(b.getAttribute('data-col-orig'), 10) || 0);
                    });
                    ths.forEach(function (th) {
                        limparLargura(th);
                        tr.appendChild(th);
                    });
                    aplicarCorpo(chave);
                }
                window.resetarColunasTabela = resetarColunas;

                function prepararTh(th, chave) {
                    if (th.getAttribute('data-col-pronta') === '1') return;
                    th.setAttribute('data-col-pronta', '1');
                    th.classList.add('col-ajustavel');
                    th.setAttribute('draggable', 'true');
                    th.title = 'Arraste o titulo para mudar a coluna de lugar. '
                             + 'Arraste a borda direita para mudar a largura '
                             + '(duplo clique na borda volta ao normal).';

                    th.addEventListener('dragstart', function (e) {
                        if (th.getAttribute('data-redim') === '1') { e.preventDefault(); return; }
                        thArrastando = th;
                        th.classList.add('col-arrastando');
                        try {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', th.getAttribute('data-col-orig'));
                        } catch (err) { /* navegadores antigos */ }
                    });

                    th.addEventListener('dragover', function (e) {
                        if (!thArrastando || thArrastando === th) return;
                        if (thArrastando.parentNode !== th.parentNode) return;
                        e.preventDefault();
                        try { e.dataTransfer.dropEffect = 'move'; } catch (err) { /* ignora */ }
                        th.classList.add('col-alvo');
                    });

                    th.addEventListener('dragleave', function () {
                        th.classList.remove('col-alvo');
                    });

                    th.addEventListener('drop', function (e) {
                        e.preventDefault();
                        th.classList.remove('col-alvo');
                        if (!thArrastando || thArrastando === th) return;
                        var tr = th.parentNode;
                        if (thArrastando.parentNode !== tr) return;
                        var ths = Array.prototype.slice.call(tr.children);
                        var de = ths.indexOf(thArrastando);
                        var para = ths.indexOf(th);
                        if (de < 0 || para < 0) return;
                        if (de < para) tr.insertBefore(thArrastando, th.nextSibling);
                        else tr.insertBefore(thArrastando, th);
                        var cfg = lerCfg(chave);
                        cfg.ordem = ordemAtual(tr);
                        gravarCfg(chave, cfg);
                        aplicarCorpo(chave);
                    });

                    th.addEventListener('dragend', function () {
                        th.classList.remove('col-arrastando');
                        var tr = th.parentNode;
                        if (tr) {
                            Array.prototype.forEach.call(tr.children, function (outro) {
                                outro.classList.remove('col-alvo');
                            });
                        }
                        thArrastando = null;
                    });

                    var alca = document.createElement('div');
                    alca.className = 'col-resizer';
                    alca.title = 'Arraste para mudar a largura (duplo clique restaura)';
                    th.appendChild(alca);

                    alca.addEventListener('mousedown', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        th.setAttribute('data-redim', '1');
                        th.setAttribute('draggable', 'false');
                        alca.classList.add('ativo');
                        var xIni = e.clientX;
                        var wIni = th.getBoundingClientRect().width;

                        function mover(ev) {
                            var w = Math.max(40, Math.round(wIni + (ev.clientX - xIni)));
                            definirLargura(th, w);
                        }
                        function soltar() {
                            document.removeEventListener('mousemove', mover);
                            document.removeEventListener('mouseup', soltar);
                            alca.classList.remove('ativo');
                            th.setAttribute('draggable', 'true');
                            setTimeout(function () { th.setAttribute('data-redim', '0'); }, 0);
                            var cfg = lerCfg(chave);
                            cfg.larguras[th.getAttribute('data-col-orig')] =
                                Math.round(th.getBoundingClientRect().width);
                            cfg.ordem = ordemAtual(th.parentNode);
                            gravarCfg(chave, cfg);
                            aplicarCorpo(chave);
                        }
                        document.addEventListener('mousemove', mover);
                        document.addEventListener('mouseup', soltar);
                    });

                    alca.addEventListener('dblclick', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        var cfg = lerCfg(chave);
                        delete cfg.larguras[th.getAttribute('data-col-orig')];
                        cfg.ordem = ordemAtual(th.parentNode);
                        gravarCfg(chave, cfg);
                        limparLargura(th);
                        aplicarCorpo(chave);
                    });
                }

                function injetarBotaoReset(chave) {
                    var tbody = document.getElementById(chave);
                    if (!tbody) return;
                    var caixa = tbody.closest('.table-responsive');
                    if (!caixa) return;
                    var cabecalho = caixa.previousElementSibling;
                    while (cabecalho && !cabecalho.classList.contains('card-header')) {
                        cabecalho = cabecalho.previousElementSibling;
                    }
                    if (!cabecalho) return;
                    if (cabecalho.querySelector('.btn-reset-colunas')) return;
                    var destino = cabecalho.querySelector('div[style*="flex"]') || cabecalho;
                    var botao = document.createElement('button');
                    botao.type = 'button';
                    botao.className = 'secondary btn-reset-colunas';
                    botao.textContent = '↻ Colunas';
                    botao.title = 'Restaurar a ordem e a largura originais das colunas';
                    botao.addEventListener('click', function () { resetarColunas(chave); });
                    destino.appendChild(botao);
                }

                function iniciarTabela(chave) {
                    var tbody = document.getElementById(chave);
                    var tr = linhaCabecalho(chave);
                    if (!tbody || !tr) return;

                    Array.prototype.forEach.call(tr.children, function (th, i) {
                        if (th.getAttribute('data-col-orig') === null) {
                            th.setAttribute('data-col-orig', String(i));
                            th.setAttribute('data-estilo-orig', th.getAttribute('style') || '');
                            var conteudo = th.querySelector('.th-content');
                            if (conteudo) {
                                conteudo.setAttribute('data-estilo-orig', conteudo.getAttribute('style') || '');
                            }
                        }
                        prepararTh(th, chave);
                    });

                    var est = estados[chave] = estados[chave] || { aplicando: false };
                    if (!est.observador && window.MutationObserver) {
                        est.observador = new MutationObserver(function () {
                            if (est.aplicando) return;
                            est.aplicando = true;
                            try { aplicarCorpo(chave); }
                            catch (e) { console.warn('PATCH 35: erro ao reaplicar colunas', e); }
                            setTimeout(function () { est.aplicando = false; }, 0);
                        });
                        est.observador.observe(tbody, { childList: true });
                    }

                    injetarBotaoReset(chave);
                    aplicarTudo(chave);
                }

                function iniciar() {
                    TABELAS.forEach(function (chave) {
                        try { iniciarTabela(chave); }
                        catch (e) { console.warn('PATCH 35: falha ao preparar colunas de', chave, e); }
                    });
                }

                if (document.readyState === 'loading') {
                    window.addEventListener('DOMContentLoaded', iniciar);
                } else {
                    iniciar();
                }
            })();

            /* ===================================================================
               PATCH 36: historico de instalacao (varios lancamentos por item)
               item.historicoInstalacao = [{ data: 'AAAA-MM-DD', qtd: N }, ...]
               - item.instalado      = soma das quantidades dos lancamentos
               - item.dataInstalacao = data do ULTIMO lancamento (compatibilidade)
               =================================================================== */
            (function () {
                if (window.__patch36Instalacao) return;
                window.__patch36Instalacao = true;

                // A aba Instalacao ganhou uma coluna nova. Se existir um layout de
                // colunas salvo com a quantidade antiga, ele e descartado uma unica
                // vez para a tabela nao ficar desalinhada.
                (function limparLayoutAntigo() {
                    try {
                        if (localStorage.getItem('painelPatch36LayoutLimpo') === '1') return;
                        localStorage.removeItem('painelColunas_tbodyInstalacao');
                        localStorage.setItem('painelPatch36LayoutLimpo', '1');
                    } catch (e) { /* ignora */ }
                })();

                function hoje() {
                    return new Date().toISOString().slice(0, 10);
                }

                function so10(v) {
                    return String(v || '').slice(0, 10);
                }

                function ordenar(lista) {
                    lista.sort(function (a, b) {
                        return a.data < b.data ? -1 : (a.data > b.data ? 1 : 0);
                    });
                    return lista;
                }

                // Lista limpa do historico gravado (sem fallback).
                function normalizar(item) {
                    var bruta = (item && Array.isArray(item.historicoInstalacao)) ? item.historicoInstalacao : [];
                    var lista = [];
                    bruta.forEach(function (l) {
                        if (!l) return;
                        var q = Number(l.qtd || 0);
                        var d = so10(l.data);
                        if (!d || !(q > 0)) return;
                        lista.push({ data: d, qtd: q });
                    });
                    return ordenar(lista);
                }

                // Lancamentos para leitura (grafico/relatorios): usa o historico
                // e, se o item ainda nao tiver historico, cai no dado antigo.
                function lancamentos(item) {
                    if (!item) return [];
                    var lista = normalizar(item);
                    if (lista.length) return lista;
                    var inst = Number(item.instalado || 0);
                    var d = so10(item.dataInstalacao);
                    if (inst > 0 && d) return [{ data: d, qtd: inst }];
                    return [];
                }

                function total(lista) {
                    var t = 0;
                    (lista || []).forEach(function (l) { t += Number(l.qtd || 0); });
                    return t;
                }

                // Migra o item antigo (instalado + dataInstalacao) para o historico.
                function garantirHistorico(item) {
                    var lista = normalizar(item);
                    if (lista.length) return lista;
                    var inst = Number(item.instalado || 0);
                    if (inst > 0) {
                        return [{ data: so10(item.dataInstalacao) || hoje(), qtd: inst }];
                    }
                    return [];
                }

                function gravar(item, lista) {
                    lista = ordenar((lista || []).filter(function (l) {
                        return l && l.data && Number(l.qtd || 0) > 0;
                    }).map(function (l) {
                        return { data: so10(l.data), qtd: Number(l.qtd) };
                    }));
                    item.historicoInstalacao = lista;
                    item.instalado = total(lista);
                    if (lista.length) {
                        item.dataInstalacao = lista[lista.length - 1].data;
                    } else {
                        delete item.dataInstalacao;
                    }
                    return lista;
                }

                // Chamado quando o usuario digita a Qtd Instalada direto na tabela:
                // a diferenca entra como lancamento de hoje (ou abate do mais recente).
                function registrarAjuste(item, novoTotal) {
                    if (!item) return;
                    var lista = garantirHistorico(item);
                    var delta = (Number(novoTotal) || 0) - total(lista);
                    if (delta > 0) {
                        var d = hoje();
                        var ultimo = lista.length ? lista[lista.length - 1] : null;
                        if (ultimo && ultimo.data === d) ultimo.qtd += delta;
                        else lista.push({ data: d, qtd: delta });
                    } else if (delta < 0) {
                        var resto = -delta;
                        for (var i = lista.length - 1; i >= 0 && resto > 0; i--) {
                            var abate = Math.min(Number(lista[i].qtd || 0), resto);
                            lista[i].qtd = Number(lista[i].qtd || 0) - abate;
                            resto -= abate;
                        }
                    }
                    gravar(item, lista);
                }

                // Chamado quando o usuario altera a Data de Instalacao na tabela.
                // Com 2+ lancamentos o historico manda (a data volta para a do ultimo).
                function sincronizarData(item, valor) {
                    if (!item) return;
                    var lista = normalizar(item);
                    if (lista.length > 1) {
                        item.dataInstalacao = lista[lista.length - 1].data;
                        return;
                    }
                    var d = so10(valor);
                    if (!d) {
                        item.historicoInstalacao = [];
                        return;
                    }
                    var inst = Number(item.instalado || 0);
                    item.historicoInstalacao = inst > 0 ? [{ data: d, qtd: inst }] : [];
                    item.dataInstalacao = d;
                }

                function resumo(item) {
                    var lista = lancamentos(item);
                    if (!lista.length) return 'Lancar';
                    return lista.length + (lista.length === 1 ? ' lanc.' : ' lancs.');
                }

                function obraAtual() {
                    if (typeof getObraAtual === 'function') return getObraAtual();
                    if (typeof window.getObraAtual === 'function') return window.getObraAtual();
                    return null;
                }

                function acharItem(id) {
                    var obra = obraAtual();
                    if (!obra) return null;
                    var lista = obra.itens || [];
                    for (var i = 0; i < lista.length; i++) {
                        if (String(lista[i].id) === String(id)) return lista[i];
                    }
                    return null;
                }

                function persistir() {
                    if (typeof salvarDB === 'function') salvarDB(true);
                    else if (typeof window.salvarDB === 'function') window.salvarDB(true);
                }

                /* ---------------- Modal de lancamentos ---------------- */

                var itemAtualId = null;
                var rascunho = [];

                function montarModal() {
                    var m = document.getElementById('modalLancInstalacao');
                    if (m) return m;

                    m = document.createElement('div');
                    m.id = 'modalLancInstalacao';
                    m.className = 'modal-bg';
                    m.innerHTML =
                        '<div class="modal" style="max-width:560px;">' +
                        '  <h3>\uD83D\uDCC5 Lançamentos de Instalação</h3>' +
                        '  <p id="lancSubtitulo" style="font-size:0.82rem;color:var(--text-light);margin-bottom:10px;"></p>' +
                        '  <div class="lanc-corpo">' +
                        '    <table class="tab-lanc">' +
                        '      <thead><tr><th style="width:46%;">Data</th><th style="width:34%;">Qtd instalada</th><th style="width:20%;"></th></tr></thead>' +
                        '      <tbody id="lancTbody"></tbody>' +
                        '    </table>' +
                        '  </div>' +
                        '  <button id="lancAdicionar" class="secondary" style="margin-top:10px;">+ Adicionar lançamento</button>' +
                        '  <div class="lanc-resumo">' +
                        '    <span>Total lançado: <b id="lancTotal">0</b></span>' +
                        '    <span>Qtd total do item: <b id="lancQtdTotal">0</b></span>' +
                        '    <span>Saldo: <b id="lancSaldo">0</b></span>' +
                        '  </div>' +
                        '  <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">' +
                        '    <button class="secondary" id="lancCancelar">Cancelar</button>' +
                        '    <button class="success" id="lancSalvar">Salvar</button>' +
                        '  </div>' +
                        '</div>';
                    document.body.appendChild(m);

                    m.querySelector('#lancAdicionar').addEventListener('click', function () {
                        rascunho.push({ data: hoje(), qtd: 0 });
                        renderLista();
                    });
                    m.querySelector('#lancCancelar').addEventListener('click', fechar);
                    m.querySelector('#lancSalvar').addEventListener('click', salvar);
                    m.addEventListener('click', function (ev) {
                        if (ev.target === m) fechar();
                    });
                    return m;
                }

                function renderLista() {
                    var tbody = document.getElementById('lancTbody');
                    if (!tbody) return;
                    tbody.textContent = '';

                    if (!rascunho.length) {
                        var trVazio = document.createElement('tr');
                        var tdVazio = document.createElement('td');
                        tdVazio.colSpan = 3;
                        tdVazio.style.cssText = 'color:var(--text-light);font-size:0.82rem;';
                        tdVazio.textContent = 'Nenhum lançamento. Use "+ Adicionar lançamento".';
                        trVazio.appendChild(tdVazio);
                        tbody.appendChild(trVazio);
                    }

                    rascunho.forEach(function (l, idx) {
                        var tr = document.createElement('tr');

                        var tdData = document.createElement('td');
                        var inpData = document.createElement('input');
                        inpData.type = 'date';
                        inpData.value = so10(l.data);
                        inpData.addEventListener('change', function () {
                            rascunho[idx].data = so10(inpData.value);
                            atualizarResumo();
                        });
                        tdData.appendChild(inpData);

                        var tdQtd = document.createElement('td');
                        var inpQtd = document.createElement('input');
                        inpQtd.type = 'number';
                        inpQtd.min = '0';
                        inpQtd.step = '1';
                        inpQtd.value = String(Number(l.qtd || 0));
                        inpQtd.addEventListener('input', function () {
                            rascunho[idx].qtd = Number(inpQtd.value) || 0;
                            atualizarResumo();
                        });
                        tdQtd.appendChild(inpQtd);

                        var tdAcao = document.createElement('td');
                        var btn = document.createElement('button');
                        btn.className = 'lanc-remover';
                        btn.type = 'button';
                        btn.title = 'Remover lançamento';
                        btn.textContent = 'Remover';
                        btn.addEventListener('click', function () {
                            rascunho.splice(idx, 1);
                            renderLista();
                        });
                        tdAcao.appendChild(btn);

                        tr.appendChild(tdData);
                        tr.appendChild(tdQtd);
                        tr.appendChild(tdAcao);
                        tbody.appendChild(tr);
                    });

                    atualizarResumo();
                }

                function atualizarResumo() {
                    var item = acharItem(itemAtualId);
                    var t = total(rascunho);
                    var qtdTotal = item ? Number(item.qtd || 0) : 0;
                    var elT = document.getElementById('lancTotal');
                    var elQ = document.getElementById('lancQtdTotal');
                    var elS = document.getElementById('lancSaldo');
                    if (elT) elT.textContent = String(t);
                    if (elQ) elQ.textContent = String(qtdTotal);
                    if (elS) {
                        elS.textContent = String(qtdTotal - t);
                        elS.style.color = (t > qtdTotal) ? '#dc2626' : '';
                    }
                }

                function abrir(id) {
                    var item = acharItem(id);
                    if (!item) { alert('Item não encontrado.'); return; }
                    itemAtualId = item.id;
                    rascunho = lancamentos(item).map(function (l) {
                        return { data: l.data, qtd: l.qtd };
                    });

                    var m = montarModal();
                    var sub = document.getElementById('lancSubtitulo');
                    if (sub) {
                        sub.textContent = (item.ref || 'S/N') + ' - ' + (item.tipo || '') +
                            ' | Qtd total: ' + Number(item.qtd || 0) +
                            ' | Área unit.: ' + (Number(item.larg || 0) * Number(item.alt || 0)).toFixed(3) + ' m²';
                    }
                    renderLista();
                    m.style.display = 'flex';
                }

                function fechar() {
                    var m = document.getElementById('modalLancInstalacao');
                    if (m) m.style.display = 'none';
                    itemAtualId = null;
                    rascunho = [];
                }

                function salvar() {
                    var item = acharItem(itemAtualId);
                    if (!item) { fechar(); return; }

                    var invalido = rascunho.some(function (l) {
                        return Number(l.qtd || 0) > 0 && !so10(l.data);
                    });
                    if (invalido) {
                        alert('Informe a data de todos os lançamentos com quantidade.');
                        return;
                    }

                    var t = total(rascunho);
                    var qtdTotal = Number(item.qtd || 0);
                    if (t > qtdTotal && !confirm('O total lançado (' + t + ') é maior que a Qtd total do item (' +
                        qtdTotal + '). Deseja salvar assim mesmo?')) {
                        return;
                    }

                    gravar(item, rascunho);
                    fechar();
                    persistir();
                }

                /* ---------------- Exposicao global ---------------- */

                window.p36Lancamentos = lancamentos;
                window.p36Resumo = resumo;
                window.p36RegistrarAjuste = registrarAjuste;
                window.p36SincronizarData = sincronizarData;
                window.abrirLancamentosInstalacao = abrir;
                window.fecharLancamentosInstalacao = fechar;
            })();

            /* ===================================================================
               PATCH 37: fecha o "Menu de Abas" antes de qualquer impressao
               =================================================================== */
            (function () {
                if (window.__patch37MenuPrint) return;
                window.__patch37MenuPrint = true;

                function fecharMenuAbas() {
                    var menu = document.getElementById('meu-menu-abas');
                    if (menu && menu.hasAttribute('open')) {
                        menu.removeAttribute('open');
                    }
                }

                window.p37FecharMenuAbas = fecharMenuAbas;

                if (window.matchMedia) {
                    try {
                        var mm = window.matchMedia('print');
                        if (mm && mm.addListener) {
                            mm.addListener(function (m) { if (m.matches) fecharMenuAbas(); });
                        } else if (mm && mm.addEventListener) {
                            mm.addEventListener('change', function (e) { if (e.matches) fecharMenuAbas(); });
                        }
                    } catch (e) { /* ignora */ }
                }

                window.addEventListener('beforeprint', fecharMenuAbas);
            })();

            window.addEventListener('DOMContentLoaded', async () => {
                carregarTemaPreferido();
                trocarAba('itens');
                
                // Puxa os dados atualizados do Supabase e depois inicializa a escuta
                if (typeof carregarBancoDaNuvem === 'function') {
                    await carregarBancoDaNuvem();
                }
                inicializarBancoNuvem();
            });
                function trocarSubAbaFEM(aba) {
                    document.querySelectorAll('.sub-tab-content').forEach(el => el.style.display = 'none');
                    document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
            
                    if (aba === 'fem') {
                        document.getElementById('sub-tab-fem').style.display = 'block';
                        document.getElementById('btn-sub-fem').classList.add('active');
                    } else if (aba === 'fab') {
                        document.getElementById('sub-tab-fab').style.display = 'block';
                        document.getElementById('btn-sub-fab').classList.add('active');
                    } else if (aba === 'inst') {
                        document.getElementById('sub-tab-inst').style.display = 'block';
                        document.getElementById('btn-sub-inst').classList.add('active');
                    }
                }
                // --- 2. LEITURA DO PDF ---
                async function processarPDFEsquadriasModal(event) {
                    const file = event.target.files[0];
                    const statusEl = document.getElementById('pdfStatusLabelEsq');
                    const txtArea = document.getElementById('txtEsquadriasManual');
            
                    if (!file) return;
            
                    // PDF.js: usa global do <head> ou importacao dinamica (v4.10.38)
                    const pdfjs = window.pdfjsLib || (await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs'));
            
                    if (!pdfjs) {
                        alert('A biblioteca PDF.js nao foi carregada. Verifique a conexao com a internet.');
                        return;
                    }
            
                    // Worker do PDF.js (v4.10.38)
                    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
            
                    statusEl.innerText = "\u23f3 Lendo PDF...";
                    statusEl.style.color = "#d97706";
            
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
                        const pdf = await loadingTask.promise;
            
                        let linhasTodasPaginas = [];
            
                        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                            const page = await pdf.getPage(pageNum);
            
                            const content = await page.getTextContent();
            
                            // Agrupar por coordenada Y para reconstruir linhas da tabela
                            // O metodo antigo .join(" ") destruia a estrutura tabular!
                            const grupos = [];
                            content.items.forEach(item => {
                                const txt = String(item.str || '').trim();
                                if (!txt) return;
                                const y = Math.round((item.transform?.[5] || 0) * 10) / 10;
                                let grupo = grupos.find(g => Math.abs(g.y - y) <= 1.5);
                                if (!grupo) {
                                    grupo = { y, itens: [] };
                                    grupos.push(grupo);
                                }
                                grupo.itens.push({ x: item.transform?.[4] || 0, txt });
                            });
            
                            // Ordenar: Y decrescente (topo da pagina primeiro), X crescente dentro de cada linha
                            grupos.sort((a, b) => b.y - a.y);
                            grupos.forEach(g => {
                                g.itens.sort((a, b) => a.x - b.x);
                                const linha = g.itens.map(i => i.txt).join(' ').replace(/\s+/g, ' ').trim();
                                if (linha) linhasTodasPaginas.push(linha);
                            });
                        }
            
                        // Texto reconstituido com estrutura de linhas preservada
                        const textoCompleto = linhasTodasPaginas.join('\n');
            
            
                        // Tenta identificar e preencher campos do cabecalho
                        const matchPedido = textoCompleto.match(/(?:PEDIDO|LOTE|LISTA|N[\u00ba])\s*:?\s*([\w.-]+)/i);
                        if (matchPedido && document.getElementById('impListaCorteEsq')) {
                            document.getElementById('impListaCorteEsq').value = matchPedido[1];
                        }
            
                        const matchFornecedor = textoCompleto.match(/(?:FORNECEDOR|EMPRESA|FABRICANTE)\s*:?\s*([A-Za-z0-9\s.\-]+)\n?/i);
                        if (matchFornecedor && document.getElementById('impFornecedorEsq')) {
                            document.getElementById('impFornecedorEsq').value = matchFornecedor[1].trim();
                        }
            
                        txtArea.value = textoCompleto;
            
                        const itensEncontrados = processarTextoEsquadrias(textoCompleto);
            
                        if (itensEncontrados.length > 0) {
                            statusEl.innerText = `\u2705 ${itensEncontrados.length} item(ns) identificados!`;
                            statusEl.style.color = "#059669";
                        } else {
                            statusEl.innerText = "\u26a0\ufe0f Texto extraido. Revise o conteudo abaixo.";
                            statusEl.style.color = "#d97706";
                        }
            
                    } catch (erro) {
                        console.error('[ERRO Esquadrias] Falha na leitura do PDF:', erro);
                        statusEl.innerText = "\u274c Erro ao ler PDF.";
                        statusEl.style.color = "#dc2626";
                    }
                }
            
                // --- 3. PARSING MULTI-ESTRATEGIA DO TEXTO ---
                function processarTextoEsquadrias(texto) {
                    if (!texto || !texto.trim()) return [];
            
                    const itens = [];
                    let estrategiaUsada = '';
                    let refAuto = 1;
            
                    const linhas = texto.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
            
                    // Regex flexivel para dimensoes
                    const regexDimensao = /(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:m\b)?\s*[xX\u00d7*]\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:(?:m\b)|(?:cm\b)|(?:mm\b))?/;
            
                    // Regex para referencia de esquadria
                    const regexRef = /(?:^|\s)((?:[A-Z]{1,3}[-\s]?\d{1,4}[-]?[A-Za-z]?))?(?:\s|$|[,;:])/i;
            
                    // ============================================================
                    // FUNCOES AUXILIARES
                    // ============================================================
            
                    function converterParaMetros(val, matchStr, contextAfter) {
                        if (/\bcm\b/i.test(matchStr) || (/\bcm/i.test(contextAfter) && !/\bmm/i.test(contextAfter))) {
                            return val / 100;
                        }
                        if (val > 50 && !/\bm\b/i.test(matchStr)) {
                            return val / 1000;
                        }
                        return val;
                    }
            
                    // NOVO: Detectar tipo pela tipologia completa (nome da esquadria)
                    function detectarTipo(textoUpper) {
                        // Prioridade: nomes completos de tipologia
                        if (/MAXIM[\s-]?AR/i.test(textoUpper)) return 'Maxim-ar';
                        if (/JANELA\s+DE\s+CORRER/i.test(textoUpper)) return 'Janela de Correr';
                        if (/JANELA\s+DE\s+GIRO/i.test(textoUpper)) return 'Janela de Giro';
                        if (/JANELA\s+BASCUL/i.test(textoUpper)) return 'Janela Basculante';
                        if (/JANELA\s+PIVOT/i.test(textoUpper)) return 'Janela Pivô';
                        if (/JANELA\s+PROJET/i.test(textoUpper)) return 'Janela Projetante';
                        if (/JANELA\s+DES[Ll]IZ/i.test(textoUpper)) return 'Janela Deslizante';
                        if (/JANELA\s+BALC/i.test(textoUpper)) return 'Janela Balcão';
                        if (/JANELA\s+FIXA/i.test(textoUpper)) return 'Janela Fixa';
                        if (/JANELA/i.test(textoUpper)) return 'Janela';
                        if (/PORTA\s+DE\s+CORRER/i.test(textoUpper)) return 'Porta de Correr';
                        if (/PORTA\s+DE\s+GIRO/i.test(textoUpper)) return 'Porta de Giro';
                        if (/PORTA\s+DES[Ll]IZ/i.test(textoUpper)) return 'Porta Deslizante';
                        if (/PORTA\s+PIVOT/i.test(textoUpper)) return 'Porta Pivô';
                        if (/PORTA\s+BALC/i.test(textoUpper)) return 'Porta Balcão';
                        if (/PORTA\s+VENEZ/i.test(textoUpper)) return 'Porta Veneziana';
                        if (/PORTA/i.test(textoUpper)) return 'Porta';
                        if (/PAINEL\s+FIXO|QUADRO\s+FIXO/i.test(textoUpper)) return 'Painel Fixo';
                        if (/PAINEL/i.test(textoUpper)) return 'Painel Fixo';
                        if (/FIXO/i.test(textoUpper) && !/PAINEL/i.test(textoUpper)) return 'Painel Fixo';
                        if (/BASCUL/i.test(textoUpper)) return 'Janela Basculante';
                        if (/GUILHOT/i.test(textoUpper)) return 'Janela Guilhotina';
                        // Fallback pelo prefixo da ref
                        const ref = textoUpper.match(/^([A-Z]{1,3})[-\s]?\d/);
                        if (ref) {
                            const prefix = ref[1];
                            if (/^(J|MX|MM|MA|B)$/i.test(prefix)) return 'Janela';
                            if (/^P(?!F)/i.test(prefix)) return 'Porta';
                            if (/^(PF|FX)$/i.test(prefix)) return 'Painel Fixo';
                        }
                        return 'Esquadria';
                    }
            
                    // NOVO: Extrair tipologia completa (nome da esquadria) do texto
                    // Procura por padroes como "Janela maxim-ar c/01 módulo", "Porta de Correr com 02 folhas", etc.
                    function extrairTipologia(texto) {
                        const textoUpper = texto.toUpperCase();
                        // Padrão: tipo + descrição completa (até encontrar um label de campo ou fim de linha)
                        const matchTipologia = texto.match(
                            /((?:JANELA|PORTA|PAINEL|QUADRO)\s+(?:(?:MAXIM[\s-]?AR|DE\s+CORRER|DE\s+GIRO|BASCULANTE?|PIV[OÔ]|PROJETANTE?|DES[Ll]IZANTE?|BALC[ÃA]O|FIX[OA]|VENEZIANA|GUILHOTINA)\s*)?(?:[Cc][/\\]\d{2}\s*(?:M[OÓ]DULO|FOLHAS?)\s*)?(?:\([^)]+\)\s*)?(?:[-–]\s*\S+)*)/i
                        );
                        if (matchTipologia) {
                            let tip = matchTipologia[1].trim();
                            // Limpar: remover trailing " - " ou separadores no final
                            tip = tip.replace(/\s*[-–]\s*$/, '').trim();
                            if (tip.length > 5) return tip;
                        }
                        // Fallback: detectar tipo e retornar o nome curto
                        return detectarTipo(textoUpper);
                    }
            
                    // FIX: Extrair vidro excluindo o contexto da dimensao
                    function extrairVidro(texto, dimMatchResult) {
                        let textoLimpo = texto;
                        if (dimMatchResult) {
                            const dimStart = texto.indexOf(dimMatchResult[0]);
                            const dimEnd = dimStart + dimMatchResult[0].length;
                            const before = Math.max(0, dimStart - 2);
                            const after = Math.min(texto.length, dimEnd + 4);
                            textoLimpo = texto.substring(0, before) + ' '.repeat(after - before) + texto.substring(after);
                        }
                        // Priorizar vidro com descricao (ex: "6MM(LAMINADO INCOLOR 6MM)", "4MM(FLOAT INCOLOR 4MM)")
                        const m = textoLimpo.match(/(\d{1,2}MM\s*\([^)]+\)|\d{1,2}mm\s+(?:INCOLOR|LAMINADO|TEMPERADO|INSULADO|FLOAT|FUM[E\u00ca]|VERDE|BRONZE|REFLETIVO|SERIGRAFADO)[^,\n]*|INCOLOR|LAMINADO|TEMPERADO|INSULADO|FLOAT|FUM[E\u00ca]|VERDE|BRONZE|REFLETIVO|SERIGRAFADO|3\+3|4\+4|6\+6|8\+8)[^,\n]*/i);
                        if (m) return m[0].trim();
                        // Fallback: procurar padrao "Nmm" sozinho
                        const m2 = textoLimpo.match(/(?:\s|^)(\d{1,2})mm(?:\s|$)/i);
                        if (m2) return m2[1] + 'mm';
                        return 'Geral';
                    }
            
                    // NOVO: Extrair localização ampliada — inclui pavimentos, andares, setores
                    function extrairLoc(texto) {
                        // Padrões comuns de localização em esquadrias
                        const m = texto.match(/(?:T[ÉE]RREO|PAV\.?|ANDAR|PISO|SUB\s?SOLO|COBERTURA|LOTE|BLOCO|TORRE|FACHADA|SETOR|AL[AÂ]\s+\d+|UNIDADE|APTO|SALA|QUARTO|BANHEIRO|COZINHA|GARAGEM|SACADA|SU[IÍ]TE|SERV[IÍ]CO|[ÁA]REA\s+(?:SERV|LAV|LAZER)|ENTRADA|CORREDOR|VARANDA|LAVANDERIA|ESCRIT[OÓ]RIO|HALL|LIVING|JANTAR|DORMIT[OÓ]RIO|W[CÇ]|LOU[ÇC]A|COPA|BWC|CIRCULA[ÇC][AÃ]O)[^,\n]*/i);
                        return m ? m[0].trim() : 'Geral';
                    }
            
                    function refEhLegitima(ref) {
                        if (!ref) return false;
                        if (ref.length < 2) return false;
                        if (/^X-\d+$/i.test(ref)) return false;
                        if (/^\d+$/i.test(ref)) return false;
                        if (/^\d+-\d+$/i.test(ref)) return false;
                        // Allow 2-letter refs like VZ, and standard ref patterns
                        if (/^[A-Z]{2,3}$/.test(ref)) return true;
                        if (/^[A-Z]{1,3}[-]?\d{0,4}[-]?[A-Za-z]?$/.test(ref)) return true;
                        return false;
                    }
            
                    function itensTemQualidadeMinima(itensArr) {
                        if (itensArr.length === 0) return false;
                        const comQualidade = itensArr.filter(it =>
                            refEhLegitima(it.ref) && it.larg > 0 && it.alt > 0
                        ).length;
                        return comQualidade >= Math.ceil(itensArr.length * 0.5);
                    }
            
                    function extrairQtdDeLinha(linha) {
                        const qtdLabel = linha.match(/(?:(?:QTD|QTD[Ee]|QUANTIDADE|QTE)\s*:?\s*(\d+))/i);
                        if (qtdLabel) return parseInt(qtdLabel[1]);
                        const qtdUn = linha.match(/(\d{1,3})\s*(?:un|unid(?:ade)?s?)\b/i);
                        if (qtdUn) return parseInt(qtdUn[1]);
                        return null;
                    }
            
                    // ============================================================
                    // ESTRATEGIA H: Formato Side-by-Side (Cards lado a lado no PDF)
                    // PDFs de corte reais usam layout de até 4 cards por linha.
                    // v2: Usa linha de marcas (brand-only) como fonte primária de marca para tipologia.
                    // ============================================================
            
                    (function estrategiaH() {
                        const itemMarkerRegex = /Item\s*:\s*\d+/gi;
                        let hasAnyItemMarkers = false;
                        let sideBySideDetected = false;
                        let maxItemsPerRow = 0;
            
                        for (const linha of linhas) {
                            const matches = linha.match(itemMarkerRegex);
                            if (matches) {
                                hasAnyItemMarkers = true;
                                if (matches.length >= 2) {
                                    sideBySideDetected = true;
                                    if (matches.length > maxItemsPerRow) maxItemsPerRow = matches.length;
                                }
                            }
                        }
            
                        if (!sideBySideDetected && hasAnyItemMarkers) {
                            const refCount = (texto.match(/Refer[êà]ncia\s*:/gi) || []).length;
                            if (refCount >= 2) sideBySideDetected = true;
                        }
            
                        if (sideBySideDetected || hasAnyItemMarkers) {
            
                            const rows = [];
                            let currentRow = null;
                            const footerRegex = /Total\s+[Áá]rea|TOTAL/i;
            
                            for (let i = 0; i < linhas.length; i++) {
                                const ln = linhas[i];
                                const itemMarkers = ln.match(itemMarkerRegex);
            
                                if (itemMarkers && itemMarkers.length >= 1) {
                                    currentRow = { startLine: i, numCards: itemMarkers.length, lines: [ln] };
                                    rows.push(currentRow);
                                } else if (currentRow && !footerRegex.test(ln)) {
                                    currentRow.lines.push(ln);
                                }
                            }
            
            
                            for (const row of rows) {
                                const N = row.numCards;
                                const rowLines = row.lines;
            
                                const itemNums = [];
                                const itemNumRegex = /Item\s*:\s*(\d+)/gi;
                                let mNum;
                                while ((mNum = itemNumRegex.exec(rowLines[0])) !== null) {
                                    itemNums.push(parseInt(mNum[1]));
                                }
            
                                const rawParts = rowLines[0].split(/Item\s*:\s*\d+/i);
                                const nameStarts = rawParts.slice(1).map(p => p.trim()).filter(p => p.length > 0);
                                while (nameStarts.length < N) nameStarts.push('');
            
            
                                const knownLabels = /^(?:Refer[êà]ncia|Qtd|[Áá]rea\s+Total|Cor|Vidros?|Pain[éê]is?|Local(?:iza[çc][aã]o)?|Item\s*:)/i;
                                let scanStart = 1;
            
                                let tipContinuation1 = '';
                                let tipContinuation2 = '';
            
                                if (rowLines.length > 1 && !knownLabels.test(rowLines[1])) {
                                    tipContinuation1 = rowLines[1];
                                    scanStart = 2;
                                }
            
                                if (rowLines.length > scanStart && !knownLabels.test(rowLines[scanStart])) {
                                    const brandRegexCheck = /Linha\s+(?:Magna|Modlar|25|30|40|45)|Termotec/gi;
                                    const brandMatches = rowLines[scanStart].match(brandRegexCheck);
                                    if (brandMatches && brandMatches.length >= 1) {
                                        tipContinuation2 = rowLines[scanStart];
                                        scanStart++;
                                    }
                                }
            
                                const brandRegex = /Linha\s+(?:Magna|Modlar|25|30|40|45)|Termotec/gi;
                                const brandNames = [];
            
                                const brandSource = tipContinuation2 || tipContinuation1;
                                if (brandSource) {
                                    let bm;
                                    brandRegex.lastIndex = 0;
                                    while ((bm = brandRegex.exec(brandSource)) !== null) {
                                        brandNames.push(bm[0]);
                                    }
                                }
            
                                const tipologias = [];
                                for (let k = 0; k < N; k++) {
                                    let tip = nameStarts[k] || '';
                                    if (k < brandNames.length) {
                                        tip += ' - ' + brandNames[k];
                                    }
                                    tip = tip.replace(/\s+/g, ' ').trim();
                                    tip = tip.replace(/\s*[-–]\s*[-–]\s*/g, ' - ').trim();
                                    tip = tip.replace(/\s*[-–]\s*$/, '').trim();
                                    tipologias.push(tip);
                                }
            
            
                                function splitByLabel(line, label, expectedCount) {
                                    const regex = new RegExp(label, 'i');
                                    const parts = line.split(regex);
                                    const fragments = parts.slice(1).map(p => p.trim());
                                    while (fragments.length < expectedCount) fragments.push('');
                                    return fragments.slice(0, expectedCount);
                                }
            
                                let refFragments = Array(N).fill('');
                                for (let li = scanStart; li < rowLines.length; li++) {
                                    if (/^Refer/i.test(rowLines[li])) {
                                        const rawParts = splitByLabel(rowLines[li], 'Refer[êà]ncia\s*:', N);
                                        refFragments = rawParts.map(f => {
                                            const rm = f.match(/([A-Za-z]{1,3}[-]?\d{0,4}[-]?[A-Za-z]?|[A-Z]{2,3})/);
                                            return rm ? rm[1].trim().toUpperCase() : '';
                                        });
                                        break;
                                    }
                                }
            
                                let qtdFragments = Array(N).fill(0);
                                let largFragments = Array(N).fill(0);
                                let altFragments = Array(N).fill(0);
            
                                for (let li = scanStart; li < rowLines.length; li++) {
                                    if (/^Qtd/i.test(rowLines[li])) {
                                        const qtdParts = splitByLabel(rowLines[li], 'Qtd\s*:', N);
                                        for (let k = 0; k < N; k++) {
                                            const qm = qtdParts[k].match(/(\d+),\s*Medidas\s*\(LxH\)\s*:\s*(\d+)x(\d+)/i);
                                            if (qm) {
                                                qtdFragments[k] = parseInt(qm[1]);
                                                largFragments[k] = parseFloat(qm[2]);
                                                altFragments[k] = parseFloat(qm[3]);
                                                if (largFragments[k] > 50) largFragments[k] /= 1000;
                                                if (altFragments[k] > 50) altFragments[k] /= 1000;
                                            }
                                        }
                                        break;
                                    }
                                }
            
                                let areaFragments = Array(N).fill(0);
                                for (let li = scanStart; li < rowLines.length; li++) {
                                    if (/^[Áá]rea\s+Total/i.test(rowLines[li])) {
                                        const areaParts = splitByLabel(rowLines[li], '[Áá]rea\s+Total\s*:', N);
                                        for (let k = 0; k < N; k++) {
                                            const am = areaParts[k].match(/(\d+[,.]?\d*)\s*m[²2]/i);
                                            if (am) areaFragments[k] = parseFloat(am[1].replace(',', '.'));
                                        }
                                        break;
                                    }
                                }
            
                                let corFragments = Array(N).fill('');
                                let corLineIdx = -1;
                                for (let li = scanStart; li < rowLines.length; li++) {
                                    if (/^Cor/i.test(rowLines[li])) { corLineIdx = li; break; }
                                }
                                if (corLineIdx !== -1) {
                                    const corParts = rowLines[corLineIdx].split(/Cor/i);
                                    const corFrags = corParts.slice(1).map(p => {
                                        return p.replace(/^\s*:?\s*/, '').replace(/[\s,]+$/, '').trim();
                                    });
                                    while (corFrags.length < N) corFrags.push('');
                                    corFragments = corFrags.slice(0, N);
                                }
            
                                let vidroFragments = Array(N).fill('');
                                let vidroLineIdx = -1;
                                for (let li = scanStart; li < rowLines.length; li++) {
                                    if (/^Vidros?\s*:/i.test(rowLines[li])) { vidroLineIdx = li; break; }
                                }
                                if (vidroLineIdx !== -1) {
                                    const vidroParts = splitByLabel(rowLines[vidroLineIdx], 'Vidros?\s*:', N);
            
                                    if (vidroLineIdx + 1 < rowLines.length) {
                                        const nextLn = rowLines[vidroLineIdx + 1];
                                        const isVidroCont = !knownLabels.test(nextLn) &&
                                            !/^Item\s*:/i.test(nextLn) &&
                                            /(?:INCOLOR|LAMINADO|\d+MM)/i.test(nextLn);
            
                                        if (isVidroCont) {
                                            const closingRegex = /\d+MM\)/gi;
                                            const closings = [];
                                            let cm;
                                            while ((cm = closingRegex.exec(nextLn)) !== null) {
                                                closings.push({ start: cm.index, end: cm.index + cm[0].length });
                                            }
            
                                            if (closings.length === N) {
                                                const contFragments = [];
                                                let prevEnd = 0;
                                                for (const c of closings) {
                                                    contFragments.push(nextLn.substring(prevEnd, c.end).trim());
                                                    prevEnd = c.end;
                                                }
                                                for (let k = 0; k < N; k++) {
                                                    vidroFragments[k] = (vidroParts[k] || '').trim() + ' ' + (contFragments[k] || '').trim();
                                                    vidroFragments[k] = vidroFragments[k].replace(/\s+/g, ' ').trim();
                                                }
                                            } else if (closings.length > 0 && closings.length < N) {
                                                const contFragments = [];
                                                let prevEnd = 0;
                                                for (const c of closings) {
                                                    contFragments.push(nextLn.substring(prevEnd, c.end).trim());
                                                    prevEnd = c.end;
                                                }
                                                for (let k = 0; k < closings.length && k < N; k++) {
                                                    vidroFragments[k] = (vidroParts[k] || '').trim() + ' ' + (contFragments[k] || '').trim();
                                                    vidroFragments[k] = vidroFragments[k].replace(/\s+/g, ' ').trim();
                                                }
                                                for (let k = closings.length; k < N; k++) {
                                                    vidroFragments[k] = (vidroParts[k] || '').trim();
                                                }
                                            } else {
                                                const last = N - 1;
                                                vidroFragments[last] = (vidroParts[last] || '').trim() + ' ' + nextLn.trim();
                                                vidroFragments[last] = vidroFragments[last].replace(/\s+/g, ' ').trim();
                                            }
                                        } else {
                                            vidroFragments = vidroParts.map(p => p.trim());
                                        }
                                    } else {
                                        vidroFragments = vidroParts.map(p => p.trim());
                                    }
            
                                    for (let k = 0; k < N; k++) {
                                        vidroFragments[k] = vidroFragments[k]
                                            .replace(/^[\s,]+/, '')
                                            .replace(/[\s,]+$/, '')
                                            .replace(/\s+/g, ' ')
                                            .trim();
                                    }
                                }
            
                                let painelFragments = Array(N).fill('');
                                for (let li = scanStart; li < rowLines.length; li++) {
                                    if (/^Pain/i.test(rowLines[li])) {
                                        painelFragments = splitByLabel(rowLines[li], 'Pain[éê]is\s*:', N);
                                        break;
                                    }
                                }
            
                                let locFragments = Array(N).fill('');
                                let locLineIdx = -1;
                                for (let li = scanStart; li < rowLines.length; li++) {
                                    if (/^Local(?:iza[çc][aã]o)?/i.test(rowLines[li])) { locLineIdx = li; break; }
                                }
                                if (locLineIdx !== -1) {
                                    const locLine = rowLines[locLineIdx];
                                    const locParts = locLine.split(/Local(?:iza[çc][aã]o)?/i);
                                    const locFrags = locParts.slice(1).map(p => {
                                        return p.replace(/^\s*:?\s*/, '').replace(/[\s,]+$/, '').trim();
                                    });
                                    while (locFrags.length < N) locFrags.push('');
                                    locFragments = locFrags.slice(0, N);
            
                                    if (locLineIdx + 1 < rowLines.length) {
                                        const nextLn = rowLines[locLineIdx + 1];
                                        const isLocCont = !knownLabels.test(nextLn) &&
                                            !/^Item\s*:/i.test(nextLn) &&
                                            !footerRegex.test(nextLn) &&
                                            nextLn.trim().length > 0;
            
                                        if (isLocCont) {
                                            if (nextLn.trim() === ':') {
                                                // Just a stray colon - clean trailing colons
                                            } else {
                                                const last = locFragments.length - 1;
                                                locFragments[last] = (locFragments[last] || '') + ' ' + nextLn.trim();
                                                locFragments[last] = locFragments[last].replace(/\s+/g, ' ').trim();
                                            }
                                        }
                                    }
            
                                    for (let k = 0; k < locFragments.length; k++) {
                                        locFragments[k] = locFragments[k]
                                            .replace(/^Local(?:iza[çc][aã]o)?\s*:\s*/i, '')
                                            .replace(/^[\s:]+/, '')
                                            .replace(/[\s:]+$/, '')
                                            .trim();
                                    }
                                }
            
                                for (let k = 0; k < N; k++) {
                                    let ref = refFragments[k] || '';
                                    if (!ref || !refEhLegitima(ref)) {
                                        ref = 'E' + String(refAuto++).padStart(2, '0');
                                    }
            
                                    const tipologia = tipologias[k] || '';
                                    const tipo = tipologia ? detectarTipo(tipologia.toUpperCase()) : 'Esquadria';
                                    const qtd = qtdFragments[k] || 1;
                                    const larg = largFragments[k] || 0;
                                    const alt = altFragments[k] || 0;
                                    const area = areaFragments[k] || (larg > 0 && alt > 0 ? parseFloat((larg * alt).toFixed(3)) : 0);
                                    const cor = corFragments[k] || '';
                                    let vidro = vidroFragments[k] || '';
                                    if (!vidro && N === 1 && rowLines.some(l => /^Vidros?\s*:\s*$/i.test(l.trim()))) {
                                        vidro = '';
                                    }
                                    if (!vidro) vidro = 'Geral';
                                    let loc = locFragments[k] || '';
                                    if (!loc) loc = 'Geral';
                                    let descricao = tipologia || tipo;
                                    if (cor) descricao += ' - ' + cor;
            
                                    itens.push({
                                        id: Date.now() + k,
                                        ref, tipo: tipologia || tipo, vidro, loc, qtd, larg, alt, area,
                                        descricao, cor,
                                        fem: '', fabricado: false, instalado: false,
                                        dataInstalacao: null,
                                        vistaUrl: ''
                                    });
                                }
                            }
                        }
            
                    })();
            
                    if (itens.length > 0) {
                        // Estratégia H teve sucesso — não tentar estratégias fallback
                    }
            
                    // ============================================================
                    // ESTRATEGIA G: Formato de Cards/Blocos (Item: N Tipologia...)
                    // Este é o formato mais comum em PDFs de corte reais.
                    // Cada esquadria é um bloco com: tipologia, Referência, Qtde,
                    // Medidas (LxH), Área Total, Cor, Vidros, Painéis, Local
                    // ============================================================
            
                    if (itens.length === 0) {
                    const temFormatoCards = /(?:Item\s*:?\s*\d|Refer[êe]ncia\s*:|Tipologia\s*:)/i.test(texto);
                    // Também detectar se tem campos rotulados típicos de cards
                    const temCamposRotulados = /(?:Refer[êe]ncia|Medidas|Vidros|Cor\s+Externa|[ÁA]rea\s+Total|Pain[ée]is|Qtde|Local(?:iza[çc][aã]o)?)\s*:/i.test(texto);
            
                    if (temFormatoCards || temCamposRotulados) {
            
                        // Dividir o texto em blocos por "Item: N" ou por "Referência:"
                        let blocosG = [];
            
                        // Primeiro: tentar divisão por "Item: N"
                        const regexItemBlock = /Item\s*:?\s*(\d+)\s+(?:[\s\S]*?)(?=Item\s*:?\s*\d+|$)/gi;
                        let matchG;
                        while ((matchG = regexItemBlock.exec(texto)) !== null) {
                            blocosG.push({ itemNum: parseInt(matchG[1]), texto: matchG[0].trim(), startOffset: matchG.index });
                        }
            
                        // Se não achou por Item, tentar por Referência
                        if (blocosG.length === 0) {
                            const regexRefBlock = /(?:[^\n]*?\n)?Refer[êe]ncia\s*:\s*[\s\S]*?(?=Refer[êe]ncia\s*:|$)/gi;
                            let mRef;
                            while ((mRef = regexRefBlock.exec(texto)) !== null) {
                                if (mRef[0].trim().length > 5) {
                                    blocosG.push({ itemNum: null, texto: mRef[0].trim(), startOffset: mRef.index });
                                }
                            }
                        }
            
                        // Se ainda não achou, tentar por Tipologia
                        if (blocosG.length === 0) {
                            const regexTipBlock = /(?:[^\n]*?\n)?Tipologia\s*:\s*[\s\S]*?(?=Tipologia\s*:|$)/gi;
                            let mTip;
                            while ((mTip = regexTipBlock.exec(texto)) !== null) {
                                if (mTip[0].trim().length > 10) {
                                    blocosG.push({ itemNum: null, texto: mTip[0].trim(), startOffset: mTip.index });
                                }
                            }
                        }
            
                        // Última tentativa: dividir por sequências de campos rotulados
                        if (blocosG.length === 0 && temCamposRotulados) {
                            // Normalizar linhas label:valor que podem estar separados
                            const linhasNorm = [];
                            const linhasNormIdx = []; // track original linhas index
                            for (let i = 0; i < linhas.length; i++) {
                                const ln = linhas[i];
                                if (/^(?:Refer[êe]ncia|Qtde|Qtd|Quantidade|Medidas?|[ÁA]rea\s*Total|Cor\s*(?:Externa)?|Vidros?|Pain[ée]is?|Local(?:iza[çc][aã]o)?|Tipologia|Tipo|Dimens[OÕ]es?)\s*:?\s*$/i.test(ln) && i + 1 < linhas.length) {
                                    const proxLinha = linhas[i + 1];
                                    if (!/^(?:Refer[êe]ncia|Qtde|Qtd|Quantidade|Medidas?|[ÁA]rea\s*Total|Cor\s*(?:Externa)?|Vidros?|Pain[ée]is?|Local(?:iza[çc][aã]o)?|Tipologia|Tipo|Dimens[OÕ]es?)\s*:/i.test(proxLinha)) {
                                        linhasNorm.push(ln + ' ' + proxLinha);
                                        linhasNormIdx.push(i);
                                        i++;
                                        continue;
                                    }
                                }
                                linhasNorm.push(ln);
                                linhasNormIdx.push(i);
                            }
                            const textoNorm = linhasNorm.join('\n');
            
                            // Dividir por blocos que começam com Referência:
                            const regexRefNorm = /Refer[êe]ncia\s*:\s*[\s\S]*?(?=Refer[êe]ncia\s*:|$)/gi;
                            let mNorm;
                            while ((mNorm = regexRefNorm.exec(textoNorm)) !== null) {
                                if (mNorm[0].trim().length > 5) {
                                    // Estimate original linhas index from mNorm.index in textoNorm
                                    const normLineIdx = textoNorm.substring(0, mNorm.index).split('\n').length - 1;
                                    const origLineIdx = linhasNormIdx[normLineIdx] || 0;
                                    blocosG.push({ itemNum: null, texto: mNorm[0].trim(), startOffset: 0, origLineIdx: origLineIdx });
                                }
                            }
                        }
            
            
                        for (const bloco of blocosG) {
                            let ref = '', tipo = '', tipologia = '', qtd = 1, larg = 0, alt = 0;
                            let area = 0, cor = '', loc = 'Geral', vidro = 'Geral', descricao = '';
            
                            // Extrair referência
                            const refMatch = bloco.texto.match(/Refer[êe]ncia\s*:?\s*([A-Za-z]{0,3}[-]?\d{1,4}[-]?[A-Za-z]?)/i);
                            if (refMatch) {
                                ref = refMatch[1].trim().toUpperCase().replace(/\s+/g, '-');
                            }
                            if (!ref || !refEhLegitima(ref)) {
                                // Tentar ref no início do bloco
                                const refAlt = bloco.texto.match(/(?:^|\n)\s*([A-Z]{1,3}[-]?\d{1,4}[-]?[A-Za-z]?)\s/i);
                                if (refAlt && refEhLegitima(refAlt[1].trim().toUpperCase())) {
                                    ref = refAlt[1].trim().toUpperCase();
                                }
                            }
                            if (!ref || !refEhLegitima(ref)) {
                                ref = `E${String(refAuto).padStart(2, '0')}`;
                                refAuto++;
                            }
            
                            // Extrair tipologia (nome completo da esquadria)
                            // Procurar após "Item: N" ou como primeira linha do bloco
                            const tipologiaMatch = bloco.texto.match(
                                /Item\s*:?\s*\d+\s+((?:JANELA|PORTA|PAINEL|QUADRO)\s+[\s\S]*?)(?=\s*Refer[êe]ncia|\s*Qtde|\s*Quantidade|\s*Medidas|\s*Dimens|$)/i
                            );
                            if (tipologiaMatch) {
                                tipologia = tipologiaMatch[1].trim();
                                // Limpar: remover quebras de linha e espaços extras
                                tipologia = tipologia.replace(/\s+/g, ' ').trim();
                                // Remover trailing "-" ou separadores
                                tipologia = tipologia.replace(/\s*[-–]\s*$/, '').trim();
                            }
            
                            // Se não achou tipologia no formato Item, tentar campo Tipologia:
                            if (!tipologia) {
                                const tipCampoMatch = bloco.texto.match(/Tipologia\s*:?\s*([^\n,]+)/i);
                                if (tipCampoMatch) tipologia = tipCampoMatch[1].trim();
                            }
            
                            // Se ainda não achou, tentar detectar no texto do bloco
                            if (!tipologia) {
                                tipologia = extrairTipologia(bloco.texto);
                            }
            
                            // Definir tipo (curto) a partir da tipologia
                            tipo = tipologia ? detectarTipo(tipologia.toUpperCase()) : detectarTipo(bloco.texto.toUpperCase());
            
                            // Extrair quantidade
                            const qtdMatch = bloco.texto.match(/(?:Qtde|Qtd|Quantidade|QTD)\s*:?\s*(\d+)/i);
                            if (qtdMatch) {
                                qtd = parseInt(qtdMatch[1]);
                            }
                            // Área Total também pode conter a qtd: "44x0,2 m2"
                            if (!qtdMatch) {
                                const areaQtdMatch = bloco.texto.match(/[ÁA]rea\s+Total\s*:?\s*(\d+)\s*[xX\u00d7*]\s*/i);
                                if (areaQtdMatch) qtd = parseInt(areaQtdMatch[1]);
                            }
            
                            // Extrair dimensões (Medidas (LxH))
                            const dimMatch = bloco.texto.match(
                                /(?:Medidas?\s*(?:\(LxH\)\s*)?|Dimens[OÕ]es?\s*:?\s*)(\d{1,5}(?:[.,]\d{1,3})?)\s*[xX\u00d7*]\s*(\d{1,5}(?:[.,]\d{1,3})?)(?:\s*(?:mm|cm|m)\b)?/i
                            );
                            if (dimMatch) {
                                larg = parseFloat(dimMatch[1].replace(',', '.'));
                                alt = parseFloat(dimMatch[2].replace(',', '.'));
                                if (/\bcm\b/i.test(dimMatch[0])) { larg /= 100; alt /= 100; }
                                else if (larg > 50) { larg /= 1000; alt /= 1000; }
                            }
            
                            // Fallback: dimensões genéricas
                            if (larg === 0 && alt === 0) {
                                const dimGeneric = bloco.texto.match(/(\d{3,5}(?:[.,]\d{1,3})?)\s*[xX\u00d7*]\s*(\d{3,5}(?:[.,]\d{1,3})?)/);
                                if (dimGeneric) {
                                    larg = parseFloat(dimGeneric[1].replace(',', '.'));
                                    alt = parseFloat(dimGeneric[2].replace(',', '.'));
                                    if (larg > 50) larg /= 1000;
                                    if (alt > 50) alt /= 1000;
                                }
                            }
            
                            // Extrair área
                            const areaMatch = bloco.texto.match(/[ÁA]rea\s+Total\s*:?\s*(?:(\d+)\s*[xX\u00d7*]\s*(\d+[,.]\d+)\s*m[\u00b22]\s*=\s*)?(\d+[,.]\d+)\s*m[\u00b22]/i);
                            if (areaMatch) {
                                area = parseFloat(areaMatch[3].replace(',', '.'));
                            } else if (larg > 0 && alt > 0) {
                                area = parseFloat((larg * alt).toFixed(3));
                            }
            
                            // Extrair cor — evitar falso match com "Correr"/"Cor" de tipologia
                            const corMatch = bloco.texto.match(/Cor\s+(?:Externa\s*)?:\s*([^\n]+)/i);
                            if (!corMatch) {
                                // Fallback: "Cor Externa:" sem espaçamento
                                const corMatch2 = bloco.texto.match(/Cor\s*Externa\s*:\s*([^\n]+)/i);
                                if (corMatch2) {
                                    let corVal = corMatch2[1].trim();
                                    corVal = corVal.replace(/\s*(?:Vidros?|Pain[ée]is?|Local|Tipologia|Qtd|Medidas?|[ÁA]rea)\s*:.*/, '').trim();
                                    if (corVal && corVal.length > 1) cor = corVal;
                                }
                            } else {
                                let corVal = corMatch[1].trim();
                                corVal = corVal.replace(/\s*(?:Vidros?|Pain[ée]is?|Local|Tipologia|Qtd|Medidas?|[ÁA]rea)\s*:.*/, '').trim();
                                if (corVal && corVal.length > 1) cor = corVal;
                            }
            
                            // Extrair localização — campo "Local:" ou "Localização:"
                            const locMatch = bloco.texto.match(/Local(?:iza[çc][aã]o)?\s*:?\s*([^\n]+)/i);
                            if (locMatch) {
                                let locVal = locMatch[1].trim();
                                locVal = locVal.replace(/\s*(?:Vidros?|Pain[ée]is?|Cor|Tipologia|Qtd|Medidas?|[ÁA]rea)\s*:.*/, '').trim();
                                if (locVal && locVal.length > 1) loc = locVal;
                            }
                            // Se não achou pelo campo, tentar extrair do texto
                            if (loc === 'Geral') {
                                const locExtraido = extrairLoc(bloco.texto);
                                if (locExtraido !== 'Geral') loc = locExtraido;
                            }
            
                            // Extrair vidro
                            const vidroMatch = bloco.texto.match(/Vidros?\s*:?\s*([^\n]+)/i);
                            if (vidroMatch) {
                                let v = vidroMatch[1].trim();
                                v = v.replace(/\s*(?:Pain[ée]is?|Local|Cor|Tipologia|Qtd|Medidas?|[ÁA]rea)\s*:.*/, '').trim();
                                if (v && v !== '-' && v !== '' && v.length > 1) vidro = v;
                            }
                            // Se não achou pelo campo, tentar regex
                            if (vidro === 'Geral') {
                                vidro = extrairVidro(bloco.texto, dimMatch);
                            }
            
                            // Descrição = tipologia completa
                            descricao = tipologia || tipo;
                            if (cor) descricao += (descricao ? ' - ' : '') + cor;
            
                            if (area === 0 && larg > 0 && alt > 0) area = parseFloat((larg * alt).toFixed(3));
            
            
                            itens.push({
                                id: Date.now() + Math.random(),
                                ref: ref,
                                tipo: tipologia || tipo,  // NOVO: tipo = tipologia completa (nome da esquadria)
                                vidro: vidro,
                                loc: loc,
                                qtd: qtd,
                                larg: larg,
                                alt: alt,
                                area: area,
                                descricao: descricao,
                                cor: cor,
                                fem: 0,
                                fabricado: 0,
                                instalado: 0,
                                dataInstalacao: null,
                                vistaUrl: ''
                            });
                            estrategiaUsada = 'G';
                        }
                    }
                    } // fim if (itens.length === 0) para Estratégia G
            
                    // ============================================================
                    // ESTRATEGIA C: Formato descritivo com QUANTIDADE/MEDIDAS
                    // ============================================================
            
                    if (itens.length === 0) {
                        const temLabelsDescritivos = /(?:QUANTIDADE|QTD[Ee]?|QTD)\s*:/i.test(texto) || /(?:MEDIDAS?|DIMENS[OÕ]ES?)\s*:/i.test(texto);
            
                        if (temLabelsDescritivos) {
            
                            const regexBlocoC = /Refer[êe]ncia\s*:\s*([A-Za-z]{0,3}[-]?\d{1,4}[-]?[A-Za-z]?)[\s\S]*?(?=Refer[êe]ncia\s*:|$)/gi;
                            let matchC;
                            while ((matchC = regexBlocoC.exec(texto)) !== null) {
                                const bloco = matchC[0];
                                const ref = matchC[1].trim().toUpperCase().replace(/\s+/g, '-');
                                if (!refEhLegitima(ref)) continue;
            
                                const dimMatchC = bloco.match(/(?:MEDIDAS?|DIMENS[OÕ]ES?)\s*:?\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:m\b)?\s*[xX\u00d7*]\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:(?:m\b)|(?:cm\b)|(?:mm\b))?/i);
                                let larg = 0, alt = 0;
                                if (dimMatchC) {
                                    larg = parseFloat(dimMatchC[1].replace(',', '.'));
                                    alt = parseFloat(dimMatchC[2].replace(',', '.'));
                                    const ctx = dimMatchC[0];
                                    if (/\bcm\b/i.test(ctx)) { larg /= 100; alt /= 100; }
                                    else if (larg > 50) { larg /= 1000; alt /= 1000; }
                                }
            
                                const qtdMatchC = bloco.match(/(?:QUANTIDADE|QTD[Ee]?|QTD)\s*:?\s*(\d+)/i);
                                const qtd = qtdMatchC ? parseInt(qtdMatchC[1]) : 1;
            
                                // Extrair tipologia completa
                                const tipoMatchC = bloco.match(/(?:TIPO|TIPOLOGIA)\s*:?\s*([^\n,]+)/i);
                                const tipologia = tipoMatchC ? tipoMatchC[1].trim() : extrairTipologia(bloco);
                                const tipo = tipologia ? detectarTipo(tipologia.toUpperCase()) : detectarTipo(bloco.toUpperCase());
            
                                const vidroMatchC = bloco.match(/(?:VIDROS?|VIDRO)\s*:?\s*([^\n,]+)/i);
                                const vidro = vidroMatchC ? vidroMatchC[1].trim() : extrairVidro(bloco, dimMatchC);
            
                                const locMatchC = bloco.match(/(?:LOCAL(?:IZA[ÇC][AÃ]O)?|AMBIENTE)\s*:?\s*([^\n,]+)/i);
                                const loc = locMatchC ? locMatchC[1].trim() : extrairLoc(bloco);
            
                                const areaM2 = larg > 0 && alt > 0 ? parseFloat((larg * alt).toFixed(3)) : 0;
            
                                itens.push({
                                    id: Date.now() + Math.random(),
                                    ref: ref,
                                    tipo: tipologia || tipo,
                                    vidro: vidro,
                                    loc: loc,
                                    qtd: qtd,
                                    larg: larg,
                                    alt: alt,
                                    area: areaM2,
                                    descricao: tipologia || tipo,
                                    cor: '',
                                    fem: 0,
                                    fabricado: 0,
                                    instalado: 0,
                                    dataInstalacao: null,
                                    vistaUrl: ''
                                });
                                estrategiaUsada = 'C';
                            }
            
                            if (itens.length === 0) {
                                const regexInlineC = /((?:[A-Z]{1,3}[-\s]?\d{1,4}[-]?[A-Za-z]?))\s+(?:QUANTIDADE|QTD[Ee]?|QTD)\s*:?\s*(\d+)\s+(?:DIMENS[OÕ]ES?|MEDIDAS?)\s*:?\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:m\b)?\s*[xX\u00d7*]\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:(?:m\b)|(?:cm\b)|(?:mm\b))?/gi;
                                let m2;
                                while ((m2 = regexInlineC.exec(texto)) !== null) {
                                    const ref = m2[1].trim().toUpperCase().replace(/\s+/g, '-');
                                    const qtd = parseInt(m2[2]);
                                    let larg = parseFloat(m2[3].replace(',', '.'));
                                    let alt = parseFloat(m2[4].replace(',', '.'));
                                    const ctx = m2[0];
                                    if (/\bcm\b/i.test(ctx)) { larg /= 100; alt /= 100; }
                                    else if (larg > 50) { larg /= 1000; alt /= 1000; }
            
                                    const tipologia = extrairTipologia(m2[0]);
                                    const tipo = detectarTipo(m2[0].toUpperCase());
                                    const vidro = extrairVidro(m2[0], m2);
                                    const loc = extrairLoc(m2[0]);
                                    const areaM2 = parseFloat((larg * alt).toFixed(3));
            
                                    itens.push({
                                        id: Date.now() + Math.random(),
                                        ref: ref, tipo: tipologia || tipo, vidro: vidro, loc: loc,
                                        qtd: qtd, larg: larg, alt: alt, area: areaM2,
                                        descricao: tipologia || tipo, cor: '', fem: 0, fabricado: 0, instalado: 0,
                                        dataInstalacao: null,
                                        vistaUrl: ''
                                    });
                                    estrategiaUsada = 'C';
                                }
                            }
                        }
                    }
            
                    // ============================================================
                    // ESTRATEGIA E: Multi-linha por esquadria
                    // ============================================================
                    if (itens.length === 0) {
            
                        const TAMANHO_JANELA = 6;
                        const refsEncontradas = new Set();
            
                        for (let i = 0; i < linhas.length; i++) {
                            const linhaAtual = linhas[i];
            
                            const refMatch = linhaAtual.match(/^(?:Ref(?:er[êe]ncia)?\s*:?\s*)?([A-Z]{1,3}[-]?\d{1,4}[-]?[A-Za-z]?)/i);
                            if (!refMatch) continue;
                            const ref = refMatch[1].trim().toUpperCase().replace(/\s+/g, '-');
                            if (!refEhLegitima(ref)) continue;
                            if (refsEncontradas.has(ref)) continue;
            
                            if (regexDimensao.test(linhaAtual)) continue;
            
                            const grupo = [linhaAtual];
                            for (let j = 1; j < TAMANHO_JANELA && i + j < linhas.length; j++) {
                                const proxLinha = linhas[i + j];
                                if (/^[A-Z]{1,3}[-]?\d{1,4}/i.test(proxLinha) || /Ref(?:er[êe]ncia)?\s*:/i.test(proxLinha)) break;
                                grupo.push(proxLinha);
                            }
            
                            const grupoTexto = grupo.join(' ');
            
                            const dimMatch = grupoTexto.match(regexDimensao);
                            if (!dimMatch) continue;
            
                            let larg = parseFloat(dimMatch[1].replace(',', '.'));
                            let alt = parseFloat(dimMatch[2].replace(',', '.'));
                            const posDim = grupoTexto.indexOf(dimMatch[0]) + dimMatch[0].length;
                            const aposDim = grupoTexto.substring(posDim, posDim + 8).trim();
                            larg = converterParaMetros(larg, dimMatch[0], aposDim);
                            alt = converterParaMetros(alt, dimMatch[0], aposDim);
            
                            if (larg <= 0 || alt <= 0) continue;
            
                            const areaM2 = parseFloat((larg * alt).toFixed(3));
                            const tipologia = extrairTipologia(grupoTexto);
                            const tipo = detectarTipo(grupoTexto.toUpperCase());
                            const vidro = extrairVidro(grupoTexto, dimMatch);
                            const loc = extrairLoc(grupoTexto);
            
                            let qtd = 1;
                            const qtdExplicito = extrairQtdDeLinha(grupoTexto);
                            if (qtdExplicito !== null) {
                                qtd = qtdExplicito;
                            } else {
                                for (const gl of grupo) {
                                    const numMatch = gl.match(/^\s*(\d{1,3})\s*$/);
                                    if (numMatch && parseInt(numMatch[1]) > 0 && parseInt(numMatch[1]) < 500) {
                                        qtd = parseInt(numMatch[1]); break;
                                    }
                                }
                            }
            
                            // Cor — evitar falso match com "Correr"\n            const corMatchE = grupoTexto.match(/Cor\s+(?:Externa\s*)?:\s*([^\n,]+)/i);
                            const corMatchE2 = !corMatchE ? grupoTexto.match(/Cor\s*Externa\s*:\s*([^\n,]+)/i) : null;
                            const cor = (corMatchE ? corMatchE[1].trim() : '') || (corMatchE2 ? corMatchE2[1].trim() : '');
            
                            const descricao = tipologia || tipo;
            
                            refsEncontradas.add(ref);
            
                            itens.push({
                                id: Date.now() + Math.random(),
                                ref: ref, tipo: tipologia || tipo, vidro: vidro, loc: loc,
                                qtd: qtd, larg: larg, alt: alt, area: areaM2,
                                descricao: descricao, cor: cor,
                                fem: 0, fabricado: 0, instalado: 0,
                                dataInstalacao: null,
                                vistaUrl: ''
                            });
                            estrategiaUsada = 'E';
                        }
                    }
            
                    // ============================================================
                    // ESTRATEGIA A: Linha tabular com ref + dimensoes
                    // ============================================================
                    if (itens.length === 0 || !itensTemQualidadeMinima(itens)) {
                        if (itens.length > 0 && !itensTemQualidadeMinima(itens)) {
                            itens.length = 0;
                        }
            
                        for (let i = 0; i < linhas.length; i++) {
                            const linha = linhas[i];
            
                            if (/^(LISTA|PEDIDO|FORNECEDOR|OBRA|TOTAL|ITEM|----|Observ|Notas?|[ÍI]tem|N[\u00ba\u00b0]|P[aá]g|Corte|Rel|Descr|Tipologia|Ref|Qtd|Medidas|[ÁA]rea|Local|Cor|Vidro|P[aá]gina|FICHA|ESPECIF|DADOS|CONF|NOME|END|TEL|CNPJ|CPF|[ÉE]\s+ITEM|Refer[êe]ncia|Quantidade|Dimens|Medidas?|Vidros?|Tipologia|Local(?:iza)?)\s*:/i.test(linha)) continue;
                            if (/^[-=\u2550\u2551]+$/i.test(linha)) continue;
                            if (/^\d+$/i.test(linha)) continue;
            
                            const refMatch = linha.match(regexRef);
                            const dimMatch = linha.match(regexDimensao);
            
                            if (refMatch && dimMatch && refEhLegitima(refMatch[1].trim().toUpperCase().replace(/\s+/g, '-'))) {
                                const ref = refMatch[1].trim().toUpperCase().replace(/\s+/g, '-');
                                let larg = parseFloat(dimMatch[1].replace(',', '.'));
                                let alt = parseFloat(dimMatch[2].replace(',', '.'));
            
                                const posDim = linha.indexOf(dimMatch[0]) + dimMatch[0].length;
                                const aposDim = linha.substring(posDim, posDim + 8).trim();
                                larg = converterParaMetros(larg, dimMatch[0], aposDim);
                                alt = converterParaMetros(alt, dimMatch[0], aposDim);
            
                                const areaM2 = parseFloat((larg * alt).toFixed(3));
                                const tipologia = extrairTipologia(linha);
                                const tipo = detectarTipo(linha.toUpperCase());
                                const vidro = extrairVidro(linha, dimMatch);
                                const loc = extrairLoc(linha);
            
                                let qtd = 1;
                                const qtdExplicito = extrairQtdDeLinha(linha);
                                if (qtdExplicito !== null) {
                                    qtd = qtdExplicito;
                                } else {
                                    const antesDim = linha.substring(0, linha.indexOf(dimMatch[0]));
                                    const numerosAntes = antesDim.match(/\b(\d{1,3})\b/g);
                                    if (numerosAntes && numerosAntes.length > 0) {
                                        const ultimo = parseInt(numerosAntes[numerosAntes.length - 1]);
                                        if (ultimo > 0 && ultimo < 500) qtd = ultimo;
                                    }
                                    if (qtd === 1) {
                                        const depoisDim = linha.substring(linha.indexOf(dimMatch[0]) + dimMatch[0].length).trim();
                                        const qtdDep = depoisDim.match(/^\s*(\d{1,3})\s*$/);
                                        if (qtdDep && parseInt(qtdDep[1]) > 0 && parseInt(qtdDep[1]) < 500) {
                                            qtd = parseInt(qtdDep[1]);
                                        }
                                    }
                                }
            
                                itens.push({
                                    id: Date.now() + Math.random(),
                                    ref: ref, tipo: tipologia || tipo, vidro: vidro, loc: loc,
                                    qtd: qtd, larg: larg, alt: alt, area: areaM2,
                                    descricao: tipologia || tipo, cor: '',
                                    fem: 0, fabricado: 0, instalado: 0,
                                    dataInstalacao: null,
                                    vistaUrl: ''
                                });
                                estrategiaUsada = 'A';
                            }
                        }
                    }
            
                    // ============================================================
                    // ESTRATEGIA B: Linhas com dimensoes mas sem referencia
                    // ============================================================
                    if (itens.length === 0 || !itensTemQualidadeMinima(itens)) {
                        if (itens.length > 0 && !itensTemQualidadeMinima(itens)) {
                            itens.length = 0;
                        }
            
                        for (let i = 0; i < linhas.length; i++) {
                            const linha = linhas[i];
            
                            if (/^(LISTA|PEDIDO|FORNECEDOR|OBRA|TOTAL|ITEM|----|Observ)/i.test(linha)) continue;
            
                            const dimsEncontradas = [];
                            const regexDimGlobal = /(\d{1,4}(?:[.,]\d{1,3})?)(?:m\b)?\s*[xX\u00d7*]\s*(\d{1,4}(?:[.,]\d{1,3})?)(?:(?:m\b)|(?:cm\b)|(?:mm\b))?/g;
                            let dm;
                            while ((dm = regexDimGlobal.exec(linha)) !== null) {
                                dimsEncontradas.push(dm);
                            }
            
                            if (dimsEncontradas.length === 0) {
                                const regexComM = /(\d{1,4}(?:[.,]\d{1,3})?)m\s+(\d{1,4}(?:[.,]\d{1,3})?)m/g;
                                let dm2;
                                while ((dm2 = regexComM.exec(linha)) !== null) {
                                    dimsEncontradas.push(dm2);
                                }
                            }
            
                            if (dimsEncontradas.length > 0 && /^(?:Dimens[OÕ]es|Medidas?|DIM)\s*:/i.test(linha)) continue;
            
                            if (dimsEncontradas.length > 0) {
                                const dm = dimsEncontradas[0];
                                let larg = parseFloat(dm[1].replace(',', '.'));
                                let alt = parseFloat(dm[2].replace(',', '.'));
            
                                const ctx = linha.substring(linha.indexOf(dm[0]) + dm[0].length, linha.indexOf(dm[0]) + dm[0].length + 8);
                                larg = converterParaMetros(larg, dm[0], ctx);
                                alt = converterParaMetros(alt, dm[0], ctx);
            
                                const refMatch = linha.match(/^\s*([A-Z]{1,3}[-\s]?\d{1,4}[-]?[A-Za-z]?)/i);
                                const ref = refMatch && refEhLegitima(refMatch[1].toUpperCase().replace(/\s+/g, '-'))
                                    ? refMatch[1].toUpperCase().replace(/\s+/g, '-')
                                    : `E${String(refAuto).padStart(2, '0')}`;
                                refAuto++;
            
                                const areaM2 = parseFloat((larg * alt).toFixed(3));
                                const tipologia = extrairTipologia(linha);
                                const tipo = detectarTipo(linha.toUpperCase());
                                const vidro = extrairVidro(linha, dm);
                                const loc = extrairLoc(linha);
            
                                const qtdExplicito = extrairQtdDeLinha(linha);
                                const qtd = qtdExplicito !== null ? qtdExplicito : 1;
            
                                itens.push({
                                    id: Date.now() + Math.random(),
                                    ref: ref, tipo: tipologia || tipo, vidro: vidro, loc: loc,
                                    qtd: qtd, larg: larg, alt: alt, area: areaM2,
                                    descricao: tipologia || tipo, cor: '',
                                    fem: 0, fabricado: 0, instalado: 0,
                                    dataInstalacao: null,
                                    vistaUrl: ''
                                });
                                estrategiaUsada = 'B';
                            }
                        }
                    }
            
                    // ============================================================
                    // ESTRATEGIA D: Ficha tecnica - campos rotulados
                    // ============================================================
                    if (itens.length === 0 || !itensTemQualidadeMinima(itens)) {
                        if (itens.length > 0 && !itensTemQualidadeMinima(itens)) {
                            itens.length = 0;
                        }
            
                        const linhasNorm = [];
                        const linhasNormIdx = [];
                        for (let i = 0; i < linhas.length; i++) {
                            const ln = linhas[i];
                            if (/^(Refer[êe]ncia|Ref|Qtde|Qtd|Quantidade|Medidas?|[ÁA]rea\s*Total|Cor|Local|Vidros?|Pain[ée]is?|Externa|Tipologia|Tipo|Item|Classe|Descri[cç]\w{3}\w*|Dimens[OÕ]es?)\s*:?\s*$/i.test(ln) && i + 1 < linhas.length) {
                                const proxLinha = linhas[i + 1];
                                if (!/^(Refer[êe]ncia|Ref|Qtde|Qtd|Quantidade|Medidas?|[ÁA]rea\s*Total|Cor|Local|Vidros?|Pain[ée]is?|Externa|Tipologia|Tipo|Item)\s*:/i.test(proxLinha)) {
                                    linhasNorm.push(ln + ' ' + proxLinha);
                                    linhasNormIdx.push(i);
                                    i++;
                                    continue;
                                }
                            }
                            linhasNorm.push(ln);
                            linhasNormIdx.push(i);
                        }
                        const textoNorm = linhasNorm.join('\n');
            
                        let blocosFicha = [];
                        const splitItems = textoNorm.split(/(?=Item\s+\d+)/i).filter(b => b.trim().length > 0);
                        let off = 0;
                        for (const s of splitItems) {
                            const idx = textoNorm.indexOf(s, off);
                            blocosFicha.push({ texto: s, startOffset: idx >= 0 ? idx : off, origLineIdx: null });
                            off = (idx >= 0 ? idx : off) + s.length;
                        }
            
                        if (blocosFicha.length <= 1) {
                            blocosFicha = [];
                            const regexBlocoRef = new RegExp('([^\\n]*\\n)?Refer[êe]ncia\\s*:[\\s\\S]*?(?=(?:[^\\n]*\\n)?Refer[êe]ncia\\s*:|$)', 'gi');
                            let m;
                            while ((m = regexBlocoRef.exec(textoNorm)) !== null) {
                                if (m[0].trim()) blocosFicha.push({ texto: m[0].trim(), startOffset: m.index, origLineIdx: null });
                            }
                        }
            
                        if (blocosFicha.length <= 1) {
                            blocosFicha = [];
                            const regexBlocoTipo = new RegExp('([^\\n]*\\n)?Tipologia\\s*:[\\s\\S]*?(?=Tipologia\\s*:|$)', 'gi');
                            let m;
                            while ((m = regexBlocoTipo.exec(textoNorm)) !== null) {
                                if (m[0].trim()) blocosFicha.push({ texto: m[0].trim(), startOffset: m.index, origLineIdx: null });
                            }
                        }
            
                        // Compute origLineIdx from startOffset
                        for (const bloco of blocosFicha) {
                            if (bloco.startOffset != null) {
                                let cumLen = 0;
                                for (let ni = 0; ni < linhasNorm.length; ni++) {
                                    if (cumLen + linhasNorm[ni].length >= bloco.startOffset) {
                                        bloco.origLineIdx = linhasNormIdx[ni] || 0;
                                        break;
                                    }
                                    cumLen += linhasNorm[ni].length + 1; // +1 for \n
                                }
                            }
                        }
            
            
                        for (const bloco of blocosFicha) {
                            const blocoTexto = bloco.texto;
                            let ref = '', tipo = 'Esquadria', tipologia = '', descricao = '', qtd = 1, larg = 0, alt = 0, area = 0, cor = '', loc = 'Geral', vidro = 'Geral';
            
                            const refMatch = blocoTexto.match(/Refer[êe]ncia\s*:?\s*([A-Za-z]{0,3}[-]?\d{1,4}[-]?[A-Za-z]?)/i);
                            if (refMatch) ref = refMatch[1].trim().toUpperCase();
            
                            if (!ref) {
                                const refAlt = blocoTexto.match(/^([A-Z]{1,3}[-]?\d{1,4}[-]?[A-Za-z]?)/i);
                                if (refAlt && refEhLegitima(refAlt[1].trim().toUpperCase())) ref = refAlt[1].trim().toUpperCase();
                            }
            
                            if (!ref) continue;
            
                            const tipoMatch = blocoTexto.match(/Tipologia\s*:?\s*([^\n]+)/i);
                            if (tipoMatch) tipologia = tipoMatch[1].trim();
                            if (tipologia) tipo = detectarTipo(tipologia.toUpperCase());
                            if (!tipologia) tipologia = extrairTipologia(blocoTexto);
            
                            const qtdMatch = blocoTexto.match(/(?:Qtde|Qtd|Quantidade|QTD)\s*:?\s*(\d+)/i);
                            if (qtdMatch) qtd = parseInt(qtdMatch[1]);
            
                            const dimMatchD = blocoTexto.match(/Dimens[OÕ]es?\s*:?\s*(\d{1,5}(?:[.,]\d{1,3})?)\s*[xX\u00d7*]\s*(\d{1,5}(?:[.,]\d{1,3})?)(?:\s*(?:mm|cm|m)\b)?/i);
                            if (dimMatchD) {
                                larg = parseFloat(dimMatchD[1].replace(',', '.'));
                                alt = parseFloat(dimMatchD[2].replace(',', '.'));
                                if (/\bcm\b/i.test(dimMatchD[0])) { larg /= 100; alt /= 100; }
                                else if (larg > 50) { larg /= 1000; alt /= 1000; }
                            }
            
                            if (larg === 0 && alt === 0) {
                                const medMatchD = blocoTexto.match(/Medidas?\s*(?:\(LxH\)\s*)?:?\s*(\d{1,5}(?:[.,]\d{1,3})?)\s*[xX\u00d7*]\s*(\d{1,5}(?:[.,]\d{1,3})?)/i);
                                if (medMatchD) {
                                    larg = parseFloat(medMatchD[1].replace(',', '.'));
                                    alt = parseFloat(medMatchD[2].replace(',', '.'));
                                    if (/\bcm\b/i.test(medMatchD[0])) { larg /= 100; alt /= 100; }
                                    else if (larg > 50) { larg /= 1000; alt /= 1000; }
                                }
                            }
            
                            if (larg === 0 && alt === 0) {
                                const dimGeneric = blocoTexto.match(/(\d{3,5}(?:[.,]\d{1,3})?)\s*[xX\u00d7*]\s*(\d{3,5}(?:[.,]\d{1,3})?)/);
                                if (dimGeneric) {
                                    larg = parseFloat(dimGeneric[1].replace(',', '.'));
                                    alt = parseFloat(dimGeneric[2].replace(',', '.'));
                                    if (larg > 50) larg /= 1000;
                                    if (alt > 50) alt /= 1000;
                                }
                            }
            
                            const areaMatch = blocoTexto.match(/[ÁA]rea\s+Total\s*:\s*(?:(\d+)\s*[xX\u00d7*]\s*(\d+[,.]\d+)\s*m[\u00b22]\s*=\s*)?(\d+[,.]\d+)\s*m[\u00b22]/i);
                            if (areaMatch) {
                                area = parseFloat(areaMatch[3].replace(',', '.'));
                            } else if (larg > 0 && alt > 0) {
                                area = parseFloat((larg * alt).toFixed(3));
                            }
            
                            const corMatch = blocoTexto.match(/Cor\s+(?:Externa\s*)?:\s*([^\n]+)/i);
                            if (!corMatch) {
                                const corMatch2 = blocoTexto.match(/Cor\s*Externa\s*:\s*([^\n]+)/i);
                                if (corMatch2) {
                                    let corVal = corMatch2[1].trim();
                                    corVal = corVal.replace(/\s*(?:Vidros?|Pain[ée]is?|Local|Externa|Tipologia|Qtd|Medidas?|[ÁA]rea)\s*:.*/, '').trim();
                                    if (corVal) cor = corVal;
                                }
                            } else {
                                let corVal = corMatch[1].trim();
                                corVal = corVal.replace(/\s*(?:Vidros?|Pain[ée]is?|Local|Externa|Tipologia|Qtd|Medidas?|[ÁA]rea)\s*:.*/, '').trim();
                                if (corVal) cor = corVal;
                            }
            
                            const locMatchD = blocoTexto.match(/Local(?:iza[çc][aã]o)?\s*:\s*([^\n]+)/i);
                            if (locMatchD) {
                                let locVal = locMatchD[1].trim();
                                locVal = locVal.replace(/\s*(?:Vidros?|Pain[ée]is?|Cor|Externa|Tipologia|Qtd|Medidas?|[ÁA]rea)\s*:.*/, '').trim();
                                if (locVal) loc = locVal;
                            }
                            if (loc === 'Geral') {
                                const locExtraido = extrairLoc(blocoTexto);
                                if (locExtraido !== 'Geral') loc = locExtraido;
                            }
            
                            const vidroMatchBloco = blocoTexto.match(/Vidros?\s*:\s*([^\n]+)/i);
                            if (vidroMatchBloco) {
                                let v = vidroMatchBloco[1].trim();
                                v = v.replace(/\s*(?:Pain[ée]is?|Local|Cor|Externa|Tipologia|Qtd|Medidas?|[ÁA]rea)\s*:.*/, '').trim();
                                if (v && v !== '-' && v !== '' && v.length > 1) vidro = v;
                            }
                            if (vidro === 'Geral') {
                                vidro = extrairVidro(blocoTexto, dimMatchD);
                            }
            
                            descricao = tipologia || tipo;
                            if (cor) descricao += ' - ' + cor;
            
                            if (area === 0 && larg > 0 && alt > 0) area = parseFloat((larg * alt).toFixed(3));
            
            
                            itens.push({
                                id: Date.now() + Math.random(),
                                ref: ref, tipo: tipologia || tipo, vidro: vidro, loc: loc,
                                qtd: qtd, larg: larg, alt: alt, area: area,
                                descricao: descricao, cor: cor,
                                fem: 0, fabricado: 0, instalado: 0,
                                dataInstalacao: null,
                                vistaUrl: ''
                            });
                            estrategiaUsada = 'D';
                        }
                    }
            
                    // ============================================================
                    // ESTRATEGIA F: Tabela com colunas detectadas por posicao
                    // ============================================================
                    if (itens.length === 0 || !itensTemQualidadeMinima(itens)) {
                        if (itens.length > 0 && !itensTemQualidadeMinima(itens)) {
                            itens.length = 0;
                        }
            
                        let headerIdx = -1;
                        let colMap = {};
            
                        for (let i = 0; i < linhas.length; i++) {
                            const lh = linhas[i].toUpperCase();
                            if (/(?:^|\s)(REF|REFER[êe]NCIA)(?:\s|$)/i.test(lh) && /(?:QTD|QUANTIDADE|TIPO|TIPOLOGIA|MEDIDAS?|LARG|ALT|[ÁA]REA)/i.test(lh)) {
                                headerIdx = i;
                                if (/REF/i.test(lh)) colMap.ref = true;
                                if (/TIPO/i.test(lh)) colMap.tipo = true;
                                if (/QTD|QUANTIDADE/i.test(lh)) colMap.qtd = true;
                                if (/LARG/i.test(lh)) colMap.larg = true;
                                if (/ALT/i.test(lh)) colMap.alt = true;
                                if (/MED/i.test(lh)) colMap.medidas = true;
                                break;
                            }
                        }
            
                        if (headerIdx >= 0) {
                            for (let i = headerIdx + 1; i < linhas.length; i++) {
                                const linha = linhas[i];
                                if (!linha.trim()) continue;
                                if (/^(TOTAL|SUBTOTAL|---)/i.test(linha)) continue;
            
                                const refMatch = linha.match(regexRef);
                                const dimMatch = linha.match(regexDimensao);
            
                                if (refMatch || dimMatch) {
                                    const refRaw = refMatch ? refMatch[1].trim().toUpperCase().replace(/\s+/g, '-') : `E${String(refAuto).padStart(2, '0')}`;
                                    refAuto++;
                                    const ref = refEhLegitima(refRaw) ? refRaw : `E${String(refAuto - 1).padStart(2, '0')}`;
            
                                    let larg = 0, alt = 0;
                                    if (dimMatch) {
                                        larg = parseFloat(dimMatch[1].replace(',', '.'));
                                        alt = parseFloat(dimMatch[2].replace(',', '.'));
                                        const posDim = linha.indexOf(dimMatch[0]) + dimMatch[0].length;
                                        const aposDim = linha.substring(posDim, posDim + 8).trim();
                                        larg = converterParaMetros(larg, dimMatch[0], aposDim);
                                        alt = converterParaMetros(alt, dimMatch[0], aposDim);
                                    }
            
                                    if (larg === 0 && alt === 0 && (colMap.larg || colMap.alt)) {
                                        const parts = linha.split(/\s{2,}/);
                                        if (parts.length >= 5) {
                                            for (let p = 0; p < parts.length; p++) {
                                                const val = parseInt(parts[p].trim());
                                                if (!isNaN(val) && val > 50) {
                                                    if (larg === 0) larg = val;
                                                    else if (alt === 0) alt = val;
                                                }
                                            }
                                            if (larg > 50) larg /= 1000;
                                            if (alt > 50) alt /= 1000;
                                        }
                                    }
            
                                    const areaM2 = larg > 0 && alt > 0 ? parseFloat((larg * alt).toFixed(3)) : 0;
                                    const tipologia = extrairTipologia(linha);
                                    const tipo = detectarTipo(linha.toUpperCase());
                                    const vidro = extrairVidro(linha, dimMatch);
                                    const loc = extrairLoc(linha);
            
                                    let qtd = 1;
                                    const qtdExplicito = extrairQtdDeLinha(linha);
                                    if (qtdExplicito !== null) {
                                        qtd = qtdExplicito;
                                    } else {
                                        const parts = linha.split(/\s{2,}/);
                                        for (const p of parts) {
                                            const n = p.trim().match(/^\s*(\d{1,3})\s*$/);
                                            if (n && parseInt(n[1]) > 0 && parseInt(n[1]) < 500) {
                                                qtd = parseInt(n[1]); break;
                                            }
                                        }
                                    }
            
                                    itens.push({
                                        id: Date.now() + Math.random(),
                                        ref: ref, tipo: tipologia || tipo, vidro: vidro, loc: loc,
                                        qtd: qtd, larg: larg, alt: alt, area: areaM2,
                                        descricao: tipologia || tipo, cor: '',
                                        fem: 0, fabricado: 0, instalado: 0,
                                        dataInstalacao: null,
                                        vistaUrl: ''
                                    });
                                    estrategiaUsada = 'F';
                                }
                            }
                        }
                    }
            
                    return itens;
                }
            
                // --- 3. CONTROLE DO MODAL ---
                function abrirModalListaCorte() {
                    document.getElementById('modalInserirListaCorte').style.display = 'flex';
                    if (document.getElementById('impDataEsq')) document.getElementById('impDataEsq').value = new Date().toISOString().split('T')[0];
                    if (document.getElementById('impListaCorteEsq')) document.getElementById('impListaCorteEsq').value = '';
                    if (document.getElementById('impNotaFiscalEsq')) document.getElementById('impNotaFiscalEsq').value = '';
                    if (document.getElementById('impFornecedorEsq')) document.getElementById('impFornecedorEsq').value = '';
                    if (document.getElementById('impClasseEsq')) document.getElementById('impClasseEsq').value = 'ESQUADRIAS';
                    if (document.getElementById('inputPDFEsquadrias')) document.getElementById('inputPDFEsquadrias').value = '';
                    if (document.getElementById('pdfStatusLabelEsq')) {
                        document.getElementById('pdfStatusLabelEsq').innerText = 'Nenhum PDF selecionado';
                        document.getElementById('pdfStatusLabelEsq').style.color = '#64748b';
                    }
                    if (document.getElementById('txtEsquadriasManual')) document.getElementById('txtEsquadriasManual').value = '';
                }
            
                function fecharModalListaCorte() {
                    document.getElementById('modalInserirListaCorte').style.display = 'none';
                }
            
            
                function confirmarImportacaoParaPainelGeral() {
                    const texto = document.getElementById('txtEsquadriasManual').value;
            
                    if (!texto.trim()) {
                        alert("Não há dados para importar.");
                        return;
                    }
            
                    const novosItens = processarTextoEsquadrias(texto);
            
                    if (novosItens.length === 0) {
                        alert("Não foi possível identificar esquadrias no texto fornecido. Verifique a formatação do conteúdo.");
                        return;
                    }
            
                    const obra = getObraAtual();
                    if (!obra.itens) obra.itens = [];
            
                    const listaNum = document.getElementById('impListaCorteEsq') ? document.getElementById('impListaCorteEsq').value : '';
                    novosItens.forEach(item => {
                        if (listaNum) item.listaCorte = listaNum;
                    });
            
                    obra.itens.push(...novosItens);
            
                    if (typeof salvarDB === 'function') salvarDB();
                    if (typeof renderTabelaGeral === 'function') renderTabelaGeral();
            
                    fecharModalListaCorte();
                    alert(`✅ ${novosItens.length} item(ns) cadastrados no Painel Geral!`);
                }
            
            
            // ======================== PAGAMENTO DE PRODUÇÃO ========================
            
            // --- State ---
            let pgtoMes = new Date().getMonth();
            let pgtoAno = new Date().getFullYear();
            let pgtoSubTab = 'lancamentos'; // 'lancamentos' | 'resumo' | 'colaboradores' | 'colaboradores'
            
            // --- Helpers ---
            function gerarIdPgto() {
              return 'lc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            }
            
            function getMesAnoKey(mes, ano) {
              return ano + '-' + String(mes + 1).padStart(2, '0');
            }
            
            function getChaveMesPgto() {
              return getMesAnoKey(pgtoMes, pgtoAno);
            }
            
            const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
            
            function formatarMesAnoPgto(mes, ano) {
              return MESES_PT[mes] + '/' + ano;
            }
            
            function mudarMesPgto(dir) {
              pgtoMes += dir;
              if (pgtoMes > 11) { pgtoMes = 0; pgtoAno++; }
              if (pgtoMes < 0) { pgtoMes = 11; pgtoAno--; }
              renderPagamento();
              var mesInput = document.getElementById("custoFilterMes"); if(mesInput) { mesInput.value = getChaveMesPgto(); renderCustoDashboard(); }
            }
            
            
/* === Funções auxiliares para checkbox lists (substitui <select multiple>) === */
function renderChecklist(containerId, items, selectedIds) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!items || items.length === 0) {
        el.innerHTML = '<div class="lanc-checkbox-empty">Nenhum colaborador nesta obra</div>';
        return;
    }
    var html = '';
    items.forEach(function(item) {
        var checked = (selectedIds && selectedIds.indexOf(item.id) !== -1) ? 'checked' : '';
        html += '<label class="lanc-checkbox-item">'
            + '<input type="checkbox" value="' + item.id + '" ' + checked + '> '
            + item.nome
            + '</label>';
    });
    el.innerHTML = html;
}

function getCheckedIds(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return [];
    var checks = el.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checks).map(function(c) { return c.value; });
}


/* Sincroniza checkbox lists quando os selects são populados */
(function() {
    var origOnchange = document.getElementById('inputLancObra');
    if (origOnchange) {
        var oldHandler = origOnchange.onchange;
        origOnchange.onchange = function(e) {
            if (oldHandler) oldHandler.call(this, e);
            setTimeout(function() {
                syncChecklistsFromSelects();
            }, 50);
        };
    }
})();

function syncChecklistsFromSelects() {
    var selProf = document.getElementById('inputLancProfissionais');
    var selAjud = document.getElementById('inputLancAjudantes');
    var clProf = document.getElementById('checklistLancProfissionais');
    var clAjud = document.getElementById('checklistLancAjudantes');

    if (selProf && clProf) {
        var items = [];
        Array.from(selProf.options).forEach(function(opt) {
            if (opt.value) items.push({ id: opt.value, nome: opt.textContent });
        });
        var selected = Array.from(selProf.selectedOptions).map(function(o) { return o.value; });
        renderChecklist('checklistLancProfissionais', items, selected);
    }

    if (selAjud && clAjud) {
        var items2 = [];
        Array.from(selAjud.options).forEach(function(opt) {
            if (opt.value) items2.push({ id: opt.value, nome: opt.textContent });
        });
        var selected2 = Array.from(selAjud.selectedOptions).map(function(o) { return o.value; });
        renderChecklist('checklistLancAjudantes', items2, selected2);
    }
}

/* Sincroniza checkboxes → selects antes de salvar */
(function() {
    var origSalvar = window.salvarLancamentoPgto;
    if (origSalvar) {
        window.salvarLancamentoPgto = function() {
            syncSelectsFromChecklists();
            origSalvar.call(this);
        };
    }
})();

function syncSelectsFromChecklists() {
    var selProf = document.getElementById('inputLancProfissionais');
    var clProf = document.getElementById('checklistLancProfissionais');
    if (selProf && clProf) {
        var checkedIds = getCheckedIds('checklistLancProfissionais');
        Array.from(selProf.options).forEach(function(opt) {
            opt.selected = (checkedIds.indexOf(opt.value) !== -1);
        });
    }
    var selAjud = document.getElementById('inputLancAjudantes');
    var clAjud = document.getElementById('checklistLancAjudantes');
    if (selAjud && clAjud) {
        var checkedIds2 = getCheckedIds('checklistLancAjudantes');
        Array.from(selAjud.options).forEach(function(opt) {
            opt.selected = (checkedIds2.indexOf(opt.value) !== -1);
        });
    }
}

function trocarSubTabPgtoNovo(tab) {
              pgtoSubTab = tab;
              document.getElementById('subTabPgtoLancamentos').classList.toggle('active', tab === 'lancamentos');
              document.getElementById('subTabPgtoResumo').classList.toggle('active', tab === 'resumo');
              document.getElementById('subTabPgtoColaboradores').classList.toggle('active', tab === 'colaboradores');
              document.getElementById('panelPgtoLancamentos').style.display = tab === 'lancamentos' ? '' : 'none';
              document.getElementById('panelPgtoResumo').style.display = tab === 'resumo' ? '' : 'none';
              document.getElementById('panelPgtoColaboradores').style.display = tab === 'colaboradores' ? '' : 'none';
              if(tab === 'colaboradores') renderListaColaboradores();
              renderPagamento();
            }
            
            function getColaboradoresAll() {
              let colabs = [];
              db.obras.forEach(o => {
                (o.colaboradores || []).forEach(c => {
                  if (!colabs.find(x => x.id === c.id)) colabs.push(c);
                });
              });
              return colabs;
            }
            
            function getProfissionaisAll() {
              return getColaboradoresAll().filter(c => c.funcao === 'Profissional' || c.funcao === 'profissional');
            }
            
            function getAjudantesAll() {
              return getColaboradoresAll().filter(c => c.funcao === 'Ajudante' || c.funcao === 'ajudante');
            }
            
            // ========== PATCH 78: funcao do colaborador (Profissional / Ajudante) ==========
            // Havia uma opcao "Ajudante" no modal gravada com o valor "Profissional",
            // o que impedia o cadastro de ajudantes. Aqui padronizamos o valor e
            // corrigimos os cadastros antigos que ficaram com a funcao errada.
            function _normalizarFuncaoColab(valor) {
              var v = String(valor == null ? '' : valor).trim().toLowerCase();
              if (v.indexOf('ajud') === 0) return 'Ajudante';
              return 'Profissional';
            }
            window._normalizarFuncaoColab = _normalizarFuncaoColab;

            // Reparo dos cadastros antigos: se um colaborador aparece como ajudante
            // em qualquer lancamento, a funcao dele passa a ser "Ajudante".
            function _repararFuncoesAjudante(silencioso) {
              if (!window.db || !Array.isArray(db.obras)) return 0;
              var idsAjudante = {};
              db.obras.forEach(function (obra) {
                (obra.lancamentosProducao || []).forEach(function (l) {
                  (l.ajudantes || []).forEach(function (aid) { idsAjudante[aid] = true; });
                });
              });
              var corrigidos = 0;
              db.obras.forEach(function (obra) {
                (obra.colaboradores || []).forEach(function (c) {
                  var alvo = idsAjudante[c.id] ? 'Ajudante' : _normalizarFuncaoColab(c.funcao);
                  if (c.funcao !== alvo) { c.funcao = alvo; corrigidos++; }
                });
                (obra.colaboradoresPgto || []).forEach(function (c) {
                  var alvo = idsAjudante[c.id] ? 'Ajudante' : _normalizarFuncaoColab(c.funcao);
                  if (c.funcao !== alvo) { c.funcao = alvo; corrigidos++; }
                });
              });
              if (corrigidos > 0 && typeof salvarDB === 'function') salvarDB();
              if (!silencioso) {
                alert(corrigidos > 0
                  ? 'Funcoes corrigidas: ' + corrigidos + ' registro(s).'
                  : 'Nenhuma funcao precisava de correcao.');
                if (typeof renderPagamento === 'function') renderPagamento();
              }
              return corrigidos;
            }
            window.repararFuncoesAjudante = function () { _repararFuncoesAjudante(false); };

            // Roda uma unica vez, sem incomodar, depois que o banco carregar.
            (function () {
              var JA = 'patch78_funcoes_reparadas';
              function tentar(voltas) {
                try {
                  if (window.db && Array.isArray(db.obras) && db.obras.length > 0) {
                    if (!localStorage.getItem(JA)) {
                      _repararFuncoesAjudante(true);
                      localStorage.setItem(JA, '1');
                    }
                    if (typeof popularSelectsPgto === 'function') popularSelectsPgto();
                    return;
                  }
                } catch (e) { /* ignora */ }
                if (voltas > 0) setTimeout(function () { tentar(voltas - 1); }, 1500);
              }
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () { tentar(20); });
              } else {
                tentar(20);
              }
            })();
            // PATCH78_AJUDANTE_OK

            // ========== COLABORADOR CRUD ==========
            
            window.abrirModalColaborador = function(){
              document.getElementById('modalColaborador').style.display = 'flex';
              document.getElementById('colabEditId').value = '';
              document.getElementById('colabEditObraId').value = '';
              document.getElementById('colabInputNome').value = '';
              document.getElementById('colabInputFuncao').value = 'Profissional';
              document.getElementById('colabInputEmpresa').value = 'PORTICO';
              document.getElementById('colabModalTitle').textContent = 'Novo Colaborador';
              var selObra = document.getElementById('colabInputObra');
              selObra.innerHTML = '';
              db.obras.forEach(function(o){
                var opt = document.createElement('option');
                opt.value = o.id; opt.textContent = o.nome || 'Obra sem nome';
                selObra.appendChild(opt);
              });
              selObra.value = db.obraAtualId || (db.obras.length > 0 ? db.obras[0].id : '');
            };
            
            window.fecharModalColaborador = function(){
              document.getElementById('modalColaborador').style.display = 'none';
            };
            
            window.salvarColaborador = function(){
              var obraId = document.getElementById('colabInputObra').value;
              var obra = db.obras.find(function(o){ return o.id === obraId; });
              if(!obra){ alert('Selecione uma obra.'); return; }
              var editId = document.getElementById('colabEditId').value;
              var editObraId = document.getElementById('colabEditObraId').value;
              var nome = document.getElementById('colabInputNome').value.trim();
              var funcao = _normalizarFuncaoColab(document.getElementById('colabInputFuncao').value); // PATCH 78
              var empresa = document.getElementById('colabInputEmpresa').value;
              if(!nome){ alert('Informe o nome do colaborador.'); return; }
              if(!obra.colaboradores) obra.colaboradores = [];
              if(editId){
                if(editObraId && editObraId !== obraId){
                  var oldObra = db.obras.find(function(o){ return o.id === editObraId; });
                  if(oldObra && oldObra.colaboradores){
                    oldObra.colaboradores = oldObra.colaboradores.filter(function(c){ return c.id !== editId; });
                  }
                }
                var found = obra.colaboradores.find(function(c){ return c.id === editId; });
                if(found){
                  found.nome = nome;
                  found.funcao = funcao;
                  found.empresa = empresa;
                } else {
                  obra.colaboradores.push({
                    id: editId,
                    nome: nome,
                    funcao: funcao,
                    empresa: empresa
                  });
                }
              } else {
                obra.colaboradores.push({
                  id: 'colab_' + Date.now() + '_' + Math.random().toString(36).substr(2,5),
                  nome: nome,
                  funcao: funcao,
                  empresa: empresa
                });
              }
              salvarDB();
              fecharModalColaborador();
              renderListaColaboradores();
              popularSelectsPgto();
            };
            
            window.editarColaborador = function(id, obraId){
              var obra = db.obras.find(function(o){ return o.id === obraId; });
              if(!obra || !obra.colaboradores) return;
              var c = obra.colaboradores.find(function(x){ return x.id === id; });
              if(!c) return;
              document.getElementById('colabEditId').value = c.id;
              document.getElementById('colabEditObraId').value = obraId;
              document.getElementById('colabInputNome').value = c.nome || '';
              document.getElementById('colabInputFuncao').value = _normalizarFuncaoColab(c.funcao); // PATCH 78
              document.getElementById('colabInputEmpresa').value = c.empresa || 'PORTICO';
              document.getElementById('colabModalTitle').textContent = 'Editar Colaborador';
              var selObra = document.getElementById('colabInputObra');
              selObra.innerHTML = '';
              db.obras.forEach(function(o){
                var opt = document.createElement('option');
                opt.value = o.id; opt.textContent = o.nome || 'Obra sem nome';
                selObra.appendChild(opt);
              });
              selObra.value = obraId;
              document.getElementById('modalColaborador').style.display = 'flex';
            };
            
            window.excluirColaborador = function(id, obraId){
              if(!confirm('Excluir este colaborador?')) return;
              var obra = db.obras.find(function(o){ return o.id === obraId; });
              if(!obra || !obra.colaboradores) return;
              obra.colaboradores = obra.colaboradores.filter(function(c){ return c.id !== id; });
              salvarDB();
              renderListaColaboradores();
              popularSelectsPgto();
            };
            
            window.renderListaColaboradores = function(){
              var container = document.getElementById('containerColaboradores');
              if(!container) return;
              var allColabs = getColaboradoresAll();
              if(!allColabs || allColabs.length === 0){
                container.innerHTML = '<div style="color:var(--text-light,#94a3b8);font-size:13px;padding:8px;">Nenhum colaborador registrado em nenhuma obra.</div>';
                return;
              }
              var html = '<table class="lanc-table"><thead><tr>';
              html += '<th>Nome</th><th>Função</th><th>EMPRESA</th><th>Obra</th><th style="width:120px;">Ações</th>';
              html += '</tr></thead><tbody>';
              db.obras.forEach(function(obra){
                (obra.colaboradores || []).forEach(function(c){
                  html += '<tr>';
                  html += '<td>' + escaparHTML(c.nome || '-') + '</td>';
                  html += '<td>' + escaparHTML(c.funcao || '-') + '</td>';
                  html += '<td>' + escaparHTML(c.empresa || '-') + '</td>';
                  html += '<td>' + escaparHTML(obra.nome || '-') + '</td>';
                  html += '<td class="lanc-actions">';
                  var eArg = 'editarColaborador(' + "'" + c.id + "','" + obra.id + "'" + ')';
                  html += '<button class="btn-icon-sm" onclick="' + eArg + '" title="Editar">📝</button>';
                  var xArg = 'excluirColaborador(' + "'" + c.id + "','" + obra.id + "'" + ')';
                  html += '<button class="btn-icon-sm" onclick="' + xArg + '" title="Excluir">🗑️</button>';
                  html += '</td></tr>';
                });
              });
              html += '</tbody></table>';
              container.innerHTML = html;
            };
            
            
            function popularSelectsPgto() {
              // Obra select
              const selObra = document.getElementById('inputLancObra');
              selObra.innerHTML = '<option value="">Selecione...</option>';
              db.obras.forEach(o => {
                selObra.innerHTML += `<option value="${escaparHTML(o.id)}">${escaparHTML(o.nome)}</option>`;
              });
              // Profissionais multi-select
              const selProf = document.getElementById('inputLancProfissionais');
              selProf.innerHTML = '';
              getProfissionaisAll().forEach(c => {
                selProf.innerHTML += `<option value="${escaparHTML(c.id)}">${escaparHTML(c.nome)}</option>`;
              });
              // Ajudantes multi-select
              const selAjud = document.getElementById('inputLancAjudantes');
              selAjud.innerHTML = '';
              getAjudantesAll().forEach(c => {
                selAjud.innerHTML += `<option value="${escaparHTML(c.id)}">${escaparHTML(c.nome)}</option>`;
              });
            }

            function popularSelectsEditLanc() {
              const selProf = document.getElementById('editLancProfissionais');
              selProf.innerHTML = '';
              getProfissionaisAll().forEach(c => {
                selProf.innerHTML += `<option value="${escaparHTML(c.id)}">${escaparHTML(c.nome)}</option>`;
              });
              const selAjud = document.getElementById('editLancAjudantes');
              selAjud.innerHTML = '';
              getAjudantesAll().forEach(c => {
                selAjud.innerHTML += `<option value="${escaparHTML(c.id)}">${escaparHTML(c.nome)}</option>`;
              });
            }
            
            // --- Data model ---
            // obra.lancamentosProducao = [{id, obraId, obraNome, data, mesAnoKey, instalacaoM2, material,
            //   taxaProf, taxaAjud, profissionais:[id], ajudantes:[id], valorProf, valorAjud, importado, itemId}]
            // obra.colaboradoresPgto = [{id, nome, funcao, valorPagoManual:{mesAnoKey: number}}]
            
            function initLancamentosProducao(obra) {
              if (!obra.lancamentosProducao) obra.lancamentosProducao = [];
              if (!obra.colaboradoresPgto) obra.colaboradoresPgto = [];
              // PATCH 31: itens importados que o usuario excluiu (nao reimportar)
              if (!Array.isArray(obra.lancExcluidos)) obra.lancExcluidos = [];
            }

            // PATCH 31: chave unica do item importado por mes
            function _chaveLancImportado(itemId, mesKey) {
              return String(itemId) + '|' + String(mesKey);
            }
            
            function getLancamentosMes(obra, mesKey) {
              initLancamentosProducao(obra);
              return (obra.lancamentosProducao || []).filter(l => l.mesAnoKey === mesKey);
            }
            
            // --- Auto-import from Painel Geral de Produção ---
            // Items with instalado > 0 are candidates. dataInstalacao is auto-set
            // when instalado changes in the Painel Geral; fallback to today if missing.
            function autoImportarItensPgto() {
              const mesKey = getChaveMesPgto();
              db.obras.forEach(obra => {
                initLancamentosProducao(obra);
                const itens = (obra.itens || []).filter(it => {
                  // Item must have instalado > 0 (at least partially installed)
                  if (!it.instalado || Number(it.instalado) <= 0) return false;
                  // Determine installation date
                  const dataRef = it.dataInstalacao || new Date().toISOString().slice(0, 10);
                  const d = new Date(dataRef + 'T12:00:00');
                  const iKey = getMesAnoKey(d.getMonth(), d.getFullYear());
                  if (iKey !== mesKey) return false;
                  // PATCH 31: respeita exclusoes feitas pelo usuario
                  const chaveExcl = _chaveLancImportado(it.id, mesKey);
                  if ((obra.lancExcluidos || []).indexOf(chaveExcl) !== -1) return false;
                  // Already imported? Check if lancamento exists for this itemId
                  const jaExiste = obra.lancamentosProducao.find(l => l.itemId === it.id && l.importado);
                  return !jaExiste;
                });
                itens.forEach(it => {
                  const qtdInst = Number(it.instalado) || 0;
                  const m2 = qtdInst * (Number(it.larg) || 0) * (Number(it.alt) || 0);
                  const dataRef = it.dataInstalacao || new Date().toISOString().slice(0, 10);
                  const lanc = {
                    id: gerarIdPgto(),
                    obraId: obra.id,
                    obraNome: obra.nome,
                    data: dataRef,
                    mesAnoKey: mesKey,
                    instalacaoM2: parseFloat(m2.toFixed(3)),
                    material: titleCase(it.descricao || it.tipo || it.nome || 'Item'),
                    taxaProf: 6,
                    taxaAjud: 4,
                    profissionais: [],
                    ajudantes: [],
                    valorProf: parseFloat((m2 * 6).toFixed(2)),
                    valorAjud: parseFloat((m2 * 4).toFixed(2)),
                    importado: true,
                    itemId: it.id
                  };
                  obra.lancamentosProducao.push(lanc);
                });
              });
              // salvarDB() removido — autoImportarItensPgto é chamado dentro de renderPagamento(),
              // e a própria função já está dentro do ciclo render(). Salvar aqui causava escrita redundante.
            }
            
            // --- Add lançamento manually ---
            function salvarLancamentoPgto() {
              const obraId = document.getElementById('inputLancObra').value;
              const m2 = parseFloat(document.getElementById('inputLancInstalacaoM2').value) || 0;
              const material = document.getElementById('inputLancMaterial').value.trim();
              const taxaProf = parseFloat(document.getElementById('inputLancTaxaProf').value) || 6;
              const taxaAjud = parseFloat(document.getElementById('inputLancTaxaAjud').value) || 4;
              const profIds = getCheckedIds('checklistLancProfissionais');
              const ajudIds = getCheckedIds('checklistLancAjudantes');            
            
              if (!obraId) { alert('Selecione uma obra.'); return; }
              if (m2 <= 0) { alert('Informe a metragem (M²).'); return; }
            
              const obra = db.obras.find(o => o.id === obraId);
              if (!obra) return;
            
              initLancamentosProducao(obra);
            
              const numProf = profIds.length || 1;
              const numAjud = ajudIds.length || 1;
            
              const lanc = {
                id: gerarIdPgto(),
                obraId: obra.id,
                obraNome: obra.nome,
                data: new Date().toISOString().slice(0, 10),
                mesAnoKey: getChaveMesPgto(),
                instalacaoM2: m2,
                material: material,
                taxaProf: taxaProf,
                taxaAjud: taxaAjud,
                profissionais: profIds,
                ajudantes: ajudIds,
                valorProf: m2 * taxaProf / numProf,
                valorAjud: m2 * taxaAjud / numAjud,
                importado: false,
                itemId: null
              };
            
              obra.lancamentosProducao.push(lanc);
              salvarDB();
              renderPagamento();
            
              // Clear form
              document.getElementById('inputLancInstalacaoM2').value = '';
              document.getElementById('inputLancMaterial').value = '';
              document.getElementById('inputLancObra').selectedIndex = 0;
              Array.from(document.getElementById('inputLancProfissionais').options).forEach(o => o.selected = false);
              Array.from(document.getElementById('inputLancAjudantes').options).forEach(o => o.selected = false);
            }
            
            // --- Edit lançamento ---
            function editarLancamentoPgto(lancId, obraId) {
              const obra = db.obras.find(o => o.id === obraId);
              if (!obra) return;
              const lanc = (obra.lancamentosProducao || []).find(l => l.id === lancId);
              if (!lanc) return;
              document.getElementById('editLancId').value = lanc.id;
              document.getElementById('editLancObraId').value = obra.id;
              document.getElementById('editLancInstalacaoM2').value = lanc.instalacaoM2;
              document.getElementById('editLancMaterial').value = lanc.material;
              document.getElementById('editLancTaxaProf').value = lanc.taxaProf;
              document.getElementById('editLancTaxaAjud').value = lanc.taxaAjud;
              popularSelectsEditLanc();
              const selProf = document.getElementById('editLancProfissionais');
              Array.from(selProf.options).forEach(opt => {
                opt.selected = (lanc.profissionais || []).includes(opt.value);
              });
              const selAjud = document.getElementById('editLancAjudantes');
              Array.from(selAjud.options).forEach(opt => {
                opt.selected = (lanc.ajudantes || []).includes(opt.value);
              });
              document.getElementById('modalLancamentoPgto').style.display = 'flex';
            }
            
            function salvarEdicaoLancamento() {
              const lancId = document.getElementById('editLancId').value;
              const obraId = document.getElementById('editLancObraId').value;
              const obra = db.obras.find(o => o.id === obraId);
              if (!obra) return;
              const lanc = (obra.lancamentosProducao || []).find(l => l.id === lancId);
              if (!lanc) return;
              lanc.instalacaoM2 = parseFloat(document.getElementById('editLancInstalacaoM2').value) || 0;
              lanc.material = document.getElementById('editLancMaterial').value.trim();
              lanc.taxaProf = parseFloat(document.getElementById('editLancTaxaProf').value) || 6;
              lanc.taxaAjud = parseFloat(document.getElementById('editLancTaxaAjud').value) || 4;
              lanc.profissionais = Array.from(document.getElementById('editLancProfissionais').selectedOptions).map(o => o.value);
              lanc.ajudantes = Array.from(document.getElementById('editLancAjudantes').selectedOptions).map(o => o.value);
              const numProf = lanc.profissionais.length || 1;
              const numAjud = lanc.ajudantes.length || 1;
              lanc.valorProf = lanc.instalacaoM2 * lanc.taxaProf / numProf;
              lanc.valorAjud = lanc.instalacaoM2 * lanc.taxaAjud / numAjud;
              salvarDB();
              fecharModalLancamento();
              renderPagamento();
            }
            
            function fecharModalLancamento() {
              document.getElementById('modalLancamentoPgto').style.display = 'none';
            }

            function imprimirPaginaPgtoResumo() {
              document.body.classList.add('print-pgto-resumo-mode');
              window.print();
              document.body.classList.remove('print-pgto-resumo-mode');
            }
            
            // --- Delete lançamento ---
            function excluirLancamentoPgto(lancId, obraId) {
              const obra = db.obras.find(o => o.id === obraId);
              if (!obra) return;
              initLancamentosProducao(obra);
              // PATCH 31: registra exclusao para o item nao ser reimportado
              const lancAlvo = (obra.lancamentosProducao || []).find(l => l.id === lancId);
              if (lancAlvo && lancAlvo.importado && lancAlvo.itemId !== undefined && lancAlvo.itemId !== null) {
                const chaveExcl = _chaveLancImportado(lancAlvo.itemId, lancAlvo.mesAnoKey || getChaveMesPgto());
                if (obra.lancExcluidos.indexOf(chaveExcl) === -1) obra.lancExcluidos.push(chaveExcl);
              }
              obra.lancamentosProducao = (obra.lancamentosProducao || []).filter(l => l.id !== lancId);
              salvarDB();
              renderPagamento();
            }

            // === PATCH 31: desfaz as exclusoes de itens importados do mes atual ===
            function restaurarImportacoesPgto() {
              const mesKey = getChaveMesPgto();
              let total = 0;
              (db.obras || []).forEach(obra => {
                initLancamentosProducao(obra);
                const antes = obra.lancExcluidos.length;
                obra.lancExcluidos = obra.lancExcluidos.filter(function (c) {
                  return String(c).split('|')[1] !== mesKey;
                });
                total += (antes - obra.lancExcluidos.length);
              });
              if (!total) {
                alert('Nao ha lancamentos importados excluidos neste mes.');
                return;
              }
              salvarDB();
              renderPagamento();
              alert(total + ' lancamento(s) importado(s) restaurado(s) neste mes.');
            }
            // === FIM PATCH 31 ===

            
            // --- Confirm modal ---
            let _confirmPgtoCb = null;
            function abrirConfirmPgto(msg, cb) {
              document.getElementById('msgConfirmPgto').textContent = msg;
              _confirmPgtoCb = cb;
              document.getElementById('modalConfirmPgto').style.display = 'flex';
            }
            function executarConfirmPgto() {
              document.getElementById('modalConfirmPgto').style.display = 'none';
              if (_confirmPgtoCb) _confirmPgtoCb();
              _confirmPgtoCb = null;
            }
            function fecharModalConfirmPgto() {
              document.getElementById('modalConfirmPgto').style.display = 'none';
              _confirmPgtoCb = null;
            }
            
            // --- Limpar mês ---
            function limparMesPgto() {
              const mesKey = getChaveMesPgto();
              abrirConfirmPgto('Tem certeza que deseja limpar todos os lançamentos e pagamentos deste mês?', () => {
                db.obras.forEach(obra => {
                  obra.lancamentosProducao = (obra.lancamentosProducao || []).filter(l => l.mesAnoKey !== mesKey);
                  (obra.colaboradoresPgto || []).forEach(c => {
                    if (c.valorPagoManual) delete c.valorPagoManual[mesKey];
                  });
                });
                salvarDB();
                renderPagamento();
              });
            }
            
            // --- Export/Import backup ---
            function exportarBackupPgto() {
              const backup = { version: 1, data: [] };
              db.obras.forEach(obra => {
                backup.data.push({
                  obraId: obra.id,
                  obraNome: obra.nome,
                  lancamentosProducao: obra.lancamentosProducao || [],
                  colaboradoresPgto: obra.colaboradoresPgto || []
                });
              });
              const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'backup_pagamento_producao.json';
              a.click();
              URL.revokeObjectURL(url);
            }
            
            function importarBackupPgto(event) {
              const file = event.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = function(e) {
                try {
                  const backup = JSON.parse(e.target.result);
                  if (!backup.data) throw new Error('Formato inválido');
                  backup.data.forEach(b => {
                    const obra = db.obras.find(o => o.id === b.obraId);
                    if (obra) {
                      obra.lancamentosProducao = b.lancamentosProducao || [];
                      obra.colaboradoresPgto = b.colaboradoresPgto || [];
                    }
                  });
                  salvarDB();
                  renderPagamento();
                  alert('Backup importado com sucesso!');
                } catch (err) {
                  alert('Erro ao importar backup: ' + err.message);
                }
              };
              reader.readAsText(file);
              event.target.value = '';
            }
            
            // --- Valor Pago manual input handler ---
            function atualizarValorPagoPgto(colabId, obraId, valor) {
              const obra = db.obras.find(o => o.id === obraId);
              if (!obra) return;
              initLancamentosProducao(obra);
              let colab = (obra.colaboradoresPgto || []).find(c => c.id === colabId);
              if (!colab) return;
              const mesKey = getChaveMesPgto();
              if (!colab.valorPagoManual) colab.valorPagoManual = {};
              colab.valorPagoManual[mesKey] = parseFloat(valor) || 0;
              salvarDB();
              renderResumoPgto(); // Re-render only the resumo part to avoid losing focus
            }
            
            // --- MAIN RENDER ---
            function renderPagamento() {
              autoImportarItensPgto();
              popularSelectsPgto();
            
              const label = formatarMesAnoPgto(pgtoMes, pgtoAno);
              const el1 = document.getElementById('pgtoMesAnoLabel');
              const el2 = document.getElementById('pgtoMesAnoLabelResumo');
              if (el1) el1.textContent = label;
              if (el2) el2.textContent = label;
            
              if (pgtoSubTab === 'lancamentos') {
                renderLancamentosPgto();
              } else if (pgtoSubTab === 'resumo') {
                renderResumoPgto();
              } else if (pgtoSubTab === 'colaboradores') {
                renderListaColaboradores();
              }
            }
            
            function renderLancamentosPgto() {
              const mesKey = getChaveMesPgto();
              const container = document.getElementById('containerLancamentosPgto');
              if (!container) return;
            
              // Group lançamentos by obra
              let allLanc = [];
              db.obras.forEach(obra => {
                const lancs = getLancamentosMes(obra, mesKey);
                lancs.forEach(l => allLanc.push({ ...l, _obraId: obra.id, _obraNome: obra.nome }));
              });
            
              if (allLanc.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:30px;color:#64748b;font-size:0.9rem;">Nenhum lançamento neste mês.</div>';
                return;
              }
            
              // Group by obra
              const grouped = {};
              allLanc.forEach(l => {
                const key = l._obraId;
                if (!grouped[key]) grouped[key] = { obraNome: l._obraNome, items: [] };
                grouped[key].items.push(l);
              });
            
              let html = '';
              const obraKeys = Object.keys(grouped);
            
              obraKeys.forEach(obKey => {
                const g = grouped[obKey];
                let totalM2 = 0, totalValProf = 0, totalValAjud = 0;
                g.items.forEach(l => {
                  totalM2 += l.instalacaoM2;
                  totalValProf += (l.profissionais || []).length * l.valorProf;
                  totalValAjud += (l.ajudantes || []).length * l.valorAjud;
                });
            
                html += '<div class="lanc-obra-group">';
                html += '<div class="lanc-obra-header">' + tc(g.obraNome) + '</div>';
                html += '<table class="lanc-table"><thead><tr>';
                html += '<th>Data</th><th>Material</th><th>M²</th><th>Taxa Prof.</th><th>Taxa Ajud.</th><th>Profissional(is)</th><th>Ajudante(s)</th><th>Val. Prof.</th><th>Val. Ajud.</th><th>Ações</th>';
                html += '</tr></thead><tbody>';
            
                g.items.forEach(l => {
                  const profNomes = (l.profissionais || []).map(pid => {
                    const c = getColaboradoresAll().find(x => x.id === pid);
                    return c ? c.nome : pid;
                  });
                  const ajudNomes = (l.ajudantes || []).map(aid => {
                    const c = getColaboradoresAll().find(x => x.id === aid);
                    return c ? c.nome : aid;
                  });
            
                  html += '<tr>';
                  html += '<td>' + (l.data || '-') + '</td>';
                  html += '<td>' + escaparHTML(l.material || '-') + '</td>';
                  html += '<td>' + l.instalacaoM2.toLocaleString('pt-BR') + '</td>';
                  html += '<td>R$ ' + l.taxaProf.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '/m²</td>';
                  html += '<td>R$ ' + l.taxaAjud.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '/m²</td>';
                  html += '<td>' + (profNomes.length ? profNomes.map(n => escaparHTML(n)).join(', ') : '-') + '</td>';
                  html += '<td>' + (ajudNomes.length ? ajudNomes.map(n => escaparHTML(n)).join(', ') : '-') + '</td>';
                  html += '<td>R$ ' + l.valorProf.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</td>';
                  html += '<td>R$ ' + l.valorAjud.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</td>';
                  html += '<td class="lanc-actions">';
                  html += '<button class="btn-icon-sm" onclick="editarLancamentoPgto(\'' + l.id + '\',\'' + l._obraId + '\')" title="Editar">✏️</button>';
                  html += '<button class="btn-icon-sm" onclick="excluirLancamentoPgto(\'' + l.id + '\',\'' + l._obraId + '\')" title="Excluir">🗑️</button>';
                  html += '</td>';
                  html += '</tr>';
                });
            
                html += '</tbody>';
                // Totals row
                html += '<tfoot><tr class="lanc-totals-row">';
                html += '<td colspan="2"><strong>Total</strong></td>';
                html += '<td><strong>' + totalM2.toLocaleString('pt-BR') + '</strong></td>';
                html += '<td colspan="2"></td>';
                html += '<td colspan="2"></td>';
                html += '<td><strong>R$ ' + totalValProf.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</strong></td>';
                html += '<td><strong>R$ ' + totalValAjud.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</strong></td>';
                html += '<td></td>';
                html += '</tr></tfoot>';
                html += '</table></div>';
              });
            
              container.innerHTML = html;
            }
            
            function renderResumoPgto() {
              const mesKey = getChaveMesPgto();
              const container = document.getElementById('containerResumoPgto');
              const totaisContainer = document.getElementById('containerTotaisPgto');
              if (!container || !totaisContainer) return;
            
              // Collect all lançamentos for the month across all obras
              let allLanc = [];
              let totalM2 = 0, totalProf = 0, totalAjud = 0, custoTotal = 0, valorPagoTotal = 0;
            
              db.obras.forEach(obra => {
                initLancamentosProducao(obra);
                const lancs = getLancamentosMes(obra, mesKey);
                lancs.forEach(l => {
                  allLanc.push({ ...l, _obraId: obra.id });
                  totalM2 += l.instalacaoM2;
                  totalProf += (l.profissionais || []).length * l.valorProf;
                  totalAjud += (l.ajudantes || []).length * l.valorAjud;
                });
              });
            
              custoTotal = totalProf + totalAjud;
            
              // Build colaboradores resumo
              const colabsMap = {};
              allLanc.forEach(l => {
                (l.profissionais || []).forEach(pid => {
                  if (!colabsMap[pid]) {
                    const c = getColaboradoresAll().find(x => x.id === pid);
                    colabsMap[pid] = { nome: c ? c.nome : pid, funcao: 'Profissional', totalProf: 0, totalAjud: 0 };
                  }
                  colabsMap[pid].totalProf += l.valorProf;
                });
                (l.ajudantes || []).forEach(aid => {
                  if (!colabsMap[aid]) {
                    const c = getColaboradoresAll().find(x => x.id === aid);
                    colabsMap[aid] = { nome: c ? c.nome : aid, funcao: 'Ajudante', totalProf: 0, totalAjud: 0 };
                  }
                  colabsMap[aid].totalAjud += l.valorAjud;
                });
              });
            
              const colabList = Object.values(colabsMap);
            
              // Ensure colaboradoresPgto entries exist for each colab per obra
              db.obras.forEach(obra => {
                initLancamentosProducao(obra);
                colabList.forEach(cl => {
                  const cInfo = getColaboradoresAll().find(x => x.nome === cl.nome);
                  if (!cInfo) return;
                  let existing = (obra.colaboradoresPgto || []).find(c => c.id === cInfo.id);
                  if (!existing) {
                    existing = { id: cInfo.id, nome: cInfo.nome, funcao: cInfo.funcao, valorPagoManual: {} };
                    obra.colaboradoresPgto.push(existing);
                  }
                });
              });
            
              // Calculate valor pago per colab
              colabList.forEach(cl => {
                const cInfo = getColaboradoresAll().find(x => x.nome === cl.nome);
                if (!cInfo) { cl.valorPago = 0; return; }
                let vp = 0;
                db.obras.forEach(obra => {
                  const entry = (obra.colaboradoresPgto || []).find(c => c.id === cInfo.id);
                  if (entry && entry.valorPagoManual && entry.valorPagoManual[mesKey]) {
                    vp += entry.valorPagoManual[mesKey];
                  }
                });
                cl.valorPago = vp;
                cl._cInfoId = cInfo.id;
                valorPagoTotal += vp;
              });
            
              // Build table
              let html = '<table class="resumo-table"><thead><tr>';
              html += '<th>Colaborador</th><th>Total Profissional</th><th>Total Ajudante</th><th>Total a Receber</th><th>Valor Pago</th>';
              html += '</tr></thead><tbody>';
            
              colabList.forEach(cl => {
                const totalReceber = cl.totalProf + cl.totalAjud;
                // Find first obra that has this colab's pgto entry for the input
                let obraIdForInput = '';
                db.obras.forEach(obra => {
                  const entry = (obra.colaboradoresPgto || []).find(c => c.id === cl._cInfoId);
                  if (entry) obraIdForInput = obra.id;
                });
            
                html += '<tr>';
                html += '<td>' + tc(cl.nome) + '</td>';
                html += '<td>R$ ' + cl.totalProf.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</td>';
                html += '<td>R$ ' + cl.totalAjud.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</td>';
                html += '<td><strong>R$ ' + totalReceber.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</strong></td>';
                html += '<td class="valor-pago-cell"><input type="number" step="0.01" min="0" value="' + (cl.valorPago || 0) + '" onchange="atualizarValorPagoPgto(\'' + cl._cInfoId + '\',\'' + obraIdForInput + '\',this.value)" style="width:90px;padding:4px 6px;border:2px solid #22c55e;border-radius:4px;text-align:right;font-size:0.85rem;box-sizing:border-box;"></td>';
                html += '</tr>';
              });
            
              html += '</tbody></table>';
              container.innerHTML = html;
            
              // Totais Gerais
              let thtml = '';
              thtml += '<div class="totais-item"><span>Metragem Total</span><span class="totais-value">' + totalM2.toLocaleString('pt-BR') + ' m²</span></div>';
              thtml += '<div class="totais-item"><span>Total Profissionais</span><span class="totais-value">R$ ' + totalProf.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</span></div>';
              thtml += '<div class="totais-item totais-red"><span>Total Ajudantes</span><span class="totais-value">R$ ' + totalAjud.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</span></div>';
              thtml += '<div class="totais-item totais-yellow"><span>Custo Total Produção</span><span class="totais-value">R$ ' + custoTotal.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</span></div>';
              thtml += '<div class="totais-item totais-green"><span>Valor Pago</span><span class="totais-value">R$ ' + valorPagoTotal.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</span></div>';
              thtml += '<div class="totais-item"><span>Saldo</span><span class="totais-value' + (custoTotal - valorPagoTotal > 0 ? ' totais-red' : '') + '">R$ ' + (custoTotal - valorPagoTotal).toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</span></div>';
            
              totaisContainer.innerHTML = thtml;
            }
            
