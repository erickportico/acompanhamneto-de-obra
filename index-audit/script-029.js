
                /* === PATCH 55: OBRAFLOW - PLANO MESTRE (Etapa 1: EAP / hierarquia) === */
                (function () {
                  "use strict";
                
                  if (window.OF && window.OF.__v55) { return; }
                
                  var OF = window.OF = window.OF || {};
                  OF.__v55 = true;
                
                  var ABA = 'obraflow';
                  var CORES = {
                    verde:   '#22c55e',
                    azul:    '#3b82f6',
                    laranja: '#f97316',
                    vermelho:'#ef4444',
                    roxo:    '#a855f7',
                    amarelo: '#eab308',
                    rosa:    '#ec4899',
                    cinza:   '#94a3b8',
                    ciano:   '#06b6d4'
                  };
                
                  var st = OF.state = {
                    tarefas: [],
                    recolhidos: {},
                    larguraDia: 26,
                    filtro: '',
                    editandoId: null,
                    paiNovo: null,
                    carregado: false
                  };
                
                  /* ------------------------------------------------------------------ *
                   * 1) ajudinhas de data
                   * ------------------------------------------------------------------ */
                  function pad(n) { return (n < 10 ? '0' : '') + n; }
                
                  function toDate(s) {
                    if (!s) return null;
                    if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
                    var m = String(s).match(/(\d{4})-(\d{2})-(\d{2})/);
                    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
                    m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/);
                    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
                    var d = new Date(s);
                    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
                  }
                
                  function toISO(d) {
                    if (!d) return '';
                    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
                  }
                
                  function fmtBR(s) {
                    var d = toDate(s);
                    if (!d) return '-';
                    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
                  }
                
                  function addDias(s, n) {
                    var d = toDate(s);
                    if (!d) return '';
                    d.setDate(d.getDate() + n);
                    return toISO(d);
                  }
                
                  /* dias corridos entre duas datas, contando as duas pontas */
                  function diasEntre(a, b) {
                    var d1 = toDate(a), d2 = toDate(b);
                    if (!d1 || !d2) return 0;
                    return Math.round((d2 - d1) / 86400000) + 1;
                  }
                
                  function hojeISO() { return toISO(new Date()); }
                
                  function esc(v) {
                    return String(v == null ? '' : v)
                      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                  }
                
                  function num(v, def) {
                    var n = parseFloat(v);
                    return isNaN(n) ? (def || 0) : n;
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 2) dados: leitura e gravacao na obra atual
                   * ------------------------------------------------------------------ */
                  function obraAtual() {
                    try {
                      if (typeof window.getObraAtual === 'function') return window.getObraAtual();
                      if (typeof getObraAtual === 'function') return getObraAtual();
                    } catch (e) {}
                    return null;
                  }
                
                  function tarefaNova(p) {
                    p = p || {};
                    return {
                      id: p.id || ('of' + Date.now() + Math.floor(Math.random() * 1000)),
                      paiId: p.paiId || null,
                      ordem: p.ordem == null ? 0 : p.ordem,
                      nome: p.nome || 'Nova tarefa',
                      tipo: p.tipo || 'tarefa',            /* fase | tarefa | marco */
                      inicio: p.inicio || '',
                      fim: p.fim || '',
                      percentual: num(p.percentual, 0),
                      cor: p.cor || 'azul',
                      responsaveis: p.responsaveis || [],
                      obs: p.obs || '',
                      /* reservado para as proximas etapas */
                      predecessoras: p.predecessoras || [],
                      custoPrevisto: num(p.custoPrevisto, 0),
                      custoReal: num(p.custoReal, 0),
                      baseline: p.baseline || null,
                      fimReal: p.fimReal || ''
                    };
                  }
                
                  OF.load = function () {
                    var obra = obraAtual();
                    if (!obra) { st.tarefas = []; return; }
                    if (!obra.obraflow || typeof obra.obraflow !== 'object') {
                      obra.obraflow = { versao: 1, titulo: '', tarefas: [] };
                    }
                    if (!Array.isArray(obra.obraflow.tarefas)) obra.obraflow.tarefas = [];
                    st.tarefas = obra.obraflow.tarefas.map(function (t) { return tarefaNova(t); });
                    st.carregado = true;
                  };
                
                  OF.save = function () {
                    var obra = obraAtual();
                    if (!obra) return;
                    if (!obra.obraflow) obra.obraflow = { versao: 1, titulo: '', tarefas: [] };
                    obra.obraflow.versao = 1;
                    obra.obraflow.tarefas = st.tarefas;
                    var tt = document.getElementById('ofTitulo');
                    if (tt) obra.obraflow.titulo = tt.innerText || '';
                    try { localStorage.setItem('obrasDB_v8', JSON.stringify(db)); } catch (e) { console.warn('[PATCH157] Erro ao salvar EAP no localStorage:', e); }  /* PATCH157_EAP_DIRECT_SAVE */
                    try { if (typeof salvarLocalComoBackup === 'function') salvarLocalComoBackup(); } catch (e) {}
                    try { if (typeof sincronizarBancoNuvem === 'function') sincronizarBancoNuvem(); } catch (e) {}
                  };
                
                  /* ------------------------------------------------------------------ *
                   * 3) hierarquia: filhos, EAP, recalculo das fases
                   * ------------------------------------------------------------------ */
                  function porId(id) {
                    for (var i = 0; i < st.tarefas.length; i++) if (st.tarefas[i].id === id) return st.tarefas[i];
                    return null;
                  }
                
                  function filhos(id) {
                    var out = st.tarefas.filter(function (t) {
                      if (id === null) return !t.paiId || !porId(t.paiId);
                      return t.paiId === id;
                    });
                    out.sort(function (a, b) { return num(a.ordem, 0) - num(b.ordem, 0); });
                    return out;
                  }
                
                  function ehResumo(t) {
                    return t.tipo === 'fase' || filhos(t.id).length > 0;
                  }
                
                  function duracao(t) {
                    if (t.tipo === 'marco') return 0;
                    if (!t.inicio || !t.fim) return 0;
                    return Math.max(1, diasEntre(t.inicio, t.fim));
                  }
                
                  /* sobe de baixo para cima somando filhos nas fases */
                  function recalcular(id) {
                    var lista = filhos(id === undefined ? null : id);
                    var min = null, max = null, pesoTot = 0, pesoFeito = 0;
                
                    lista.forEach(function (t) {
                      if (filhos(t.id).length > 0) {
                        var r = recalcular(t.id);
                        if (r.inicio) t.inicio = r.inicio;
                        if (r.fim) t.fim = r.fim;
                        t.percentual = r.percentual;
                      }
                      if (t.tipo === 'marco') { t.fim = t.inicio; }
                
                      var di = toDate(t.inicio), df = toDate(t.fim || t.inicio);
                      if (di && (!min || di < min)) min = di;
                      if (df && (!max || df > max)) max = df;
                
                      var peso = Math.max(1, duracao(t));
                      pesoTot += peso;
                      pesoFeito += peso * (num(t.percentual, 0) / 100);
                    });
                
                    return {
                      inicio: min ? toISO(min) : '',
                      fim: max ? toISO(max) : '',
                      percentual: pesoTot ? Math.round((pesoFeito / pesoTot) * 100) : 0
                    };
                  }
                
                  /* lista achatada, na ordem de exibicao, com nivel e EAP */
                  function achatar() {
                    var out = [];
                    function anda(paiId, prefixo, nivel) {
                      var lista = filhos(paiId);
                      lista.forEach(function (t, i) {
                        var wbs = prefixo ? (prefixo + '.' + (i + 1)) : String(i + 1);
                        t.__wbs = wbs;
                        t.__nivel = nivel;
                        t.__resumo = ehResumo(t);
                        t.__temFilhos = filhos(t.id).length > 0;
                        out.push(t);
                        if (t.__temFilhos && !st.recolhidos[t.id]) anda(t.id, wbs, nivel + 1);
                      });
                    }
                    anda(null, '', 0);
                    return out;
                  }
                
                  function renumerar(paiId) {
                    filhos(paiId).forEach(function (t, i) { t.ordem = (i + 1) * 10; });
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 4) monta a aba nova (nao toca no HTML existente)
                   * ------------------------------------------------------------------ */
                  function html() {
                    return '' +
                    '<div class="card-header">' +
                      '<div class="card-title">\uD83E\uDDED ObraFlow \u2014 Plano Mestre (EAP)</div>' +
                    '</div>' +
                    '<div class="of-topo">' +
                      '<h1 id="ofTitulo" contenteditable="true" spellcheck="true" class="of-titulo" title="Clique para editar o titulo">PLANO MESTRE DA OBRA</h1>' +
                      '<div class="of-acoes">' +
                        '<button class="of-btn of-btn-add" onclick="OF.novaFase()">+ Nova Fase</button>' +
                        '<button class="of-btn" onclick="OF.importarCronograma()" title="Copia o cronograma da aba Gestao de Obra e Equipe">\u2935\uFE0F Importar Cronograma Atual</button>' +
                        '<button class="of-btn" onclick="OF.exportarJSON()">\uD83D\uDCBE Backup</button>' +
                        '<button class="of-btn" onclick="OF.importarJSON()">\uD83D\uDCC2 Restaurar</button>' +
                        '<button class="of-btn" onclick="OF.exportarCSV()">\uD83D\uDCC4 CSV</button>' +
                        '<button class="of-btn" onclick="OF.imprimir()">\uD83D\uDDA8\uFE0F Imprimir</button>' +
                      '</div>' +
                    '</div>' +
                
                    '<div class="of-metricas">' +
                      '<div class="of-mcard"><span>Fases</span><strong id="ofMFases">0</strong></div>' +
                      '<div class="of-mcard"><span>Tarefas</span><strong id="ofMTarefas">0</strong></div>' +
                      '<div class="of-mcard"><span>Marcos</span><strong id="ofMMarcos">0</strong></div>' +
                      '<div class="of-mcard"><span>Periodo</span><strong id="ofMPeriodo">-</strong></div>' +
                      '<div class="of-mcard"><span>Duracao</span><strong id="ofMDuracao">0 dias</strong></div>' +
                      '<div class="of-mcard of-mcard-pct"><span>Conclusao Geral</span><strong id="ofMPct">0%</strong></div>' +
                    '</div>' +
                
                    '<div class="of-barra">' +
                      '<input type="text" id="ofFiltro" placeholder="\uD83D\uDD0D Buscar tarefa..." oninput="OF.aoFiltrar(this.value)">' +
                      '<button class="of-btn of-mini" onclick="OF.expandirTudo()">\u2795 Expandir tudo</button>' +
                      '<button class="of-btn of-mini" onclick="OF.recolherTudo()">\u2796 Recolher tudo</button>' +
                      '<span class="of-zoom">Zoom:' +
                        '<button class="of-btn of-mini" onclick="OF.zoom(-1)">\u2212</button>' +
                        '<button class="of-btn of-mini" onclick="OF.zoom(1)">+</button>' +
                      '</span>' +
                    '</div>' +
                
                    '<div class="of-wrap" id="ofWrap">' +
                      '<div class="of-esq">' +
                        '<div class="of-cab of-cab-esq">' +
                          '<div class="of-c-wbs">EAP</div>' +
                          '<div class="of-c-nome">Nome da Tarefa</div>' +
                          '<div class="of-c-data">Inicio</div>' +
                          '<div class="of-c-data">Termino</div>' +
                          '<div class="of-c-dur">Dur.</div>' +
                          '<div class="of-c-pct">%</div>' +
                          '<div class="of-c-acoes">Acoes</div>' +
                        '</div>' +
                        '<div id="ofLinhas"></div>' +
                      '</div>' +
                      '<div class="of-dir" id="ofDir">' +
                        '<div id="ofGantt" class="of-gantt"></div>' +
                      '</div>' +
                    '</div>' +
                
                    '<div class="of-legenda">' +
                      '<span><i class="of-lg of-lg-fase"></i> Fase (resumo)</span>' +
                      '<span><i class="of-lg of-lg-tar"></i> Tarefa</span>' +
                      '<span><i class="of-lg of-lg-marco"></i> Marco</span>' +
                      '<span><i class="of-lg of-lg-prog"></i> Progresso</span>' +
                      '<span><i class="of-lg of-lg-hoje"></i> Hoje</span>' +
                    '</div>' +
                
                    '<div class="of-dica">Dica: use <b>\u21E5</b> para transformar a tarefa em subtarefa da linha de cima e <b>\u21E4</b> para promove-la um nivel. As datas e o percentual das Fases sao calculados automaticamente pelas subtarefas.</div>' +
                
                    /* ---------------- modal ---------------- */
                    '<div id="ofModal" class="of-modal">' +
                      '<div class="of-modal-box">' +
                        '<div class="of-modal-tit" id="ofModalTit">Nova Tarefa</div>' +
                        '<div class="of-form">' +
                          '<label>Nome<input type="text" id="ofFNome" spellcheck="true"></label>' +
                          '<label>Tipo<select id="ofFTipo" onchange="OF.aoTrocarTipo()">' +
                            '<option value="tarefa">Tarefa</option>' +
                            '<option value="fase">Fase (agrupadora)</option>' +
                            '<option value="marco">Marco</option>' +
                          '</select></label>' +
                          '<label>Inicio<input type="date" id="ofFInicio" onchange="OF.aoTrocarInicio()"></label>' +
                          '<label>Duracao (dias)<input type="number" min="0" step="1" id="ofFDur" oninput="OF.aoTrocarDur()"></label>' +
                          '<label>Termino<input type="date" id="ofFFim" onchange="OF.aoTrocarFim()"></label>' +
                          '<label>% Concluido<input type="number" min="0" max="100" step="1" id="ofFPct"></label>' +
                          '<label>Cor<select id="ofFCor">' +
                            '<option value="azul">Azul</option><option value="verde">Verde</option>' +
                            '<option value="laranja">Laranja</option><option value="vermelho">Vermelho</option>' +
                            '<option value="roxo">Roxo</option><option value="amarelo">Amarelo</option>' +
                            '<option value="rosa">Rosa</option><option value="ciano">Ciano</option>' +
                            '<option value="cinza">Cinza</option>' +
                          '</select></label>' +
                          '<label>Responsavel / Equipe<input type="text" id="ofFResp" spellcheck="true" placeholder="Ex: Edilson e Lennon"></label>' +
                          '<label class="of-full">Observacao<textarea id="ofFObs" rows="2" spellcheck="true"></textarea></label>' +
                        '</div>' +
                        '<div class="of-aviso" id="ofAviso"></div>' +
                        '<div class="of-modal-acoes">' +
                          '<button class="of-btn" onclick="OF.fecharModal()">Cancelar</button>' +
                          '<button class="of-btn of-btn-add" onclick="OF.salvarModal()">Salvar</button>' +
                        '</div>' +
                      '</div>' +
                    '</div>' +
                    '<input type="file" id="ofArquivo" accept=".json" style="display:none">';
                  }
                
                  function criarAba() {
                    if (document.getElementById('tab-' + ABA)) return;
                
                    /* 1) o painel */
                    var ref = document.getElementById('tab-custo') || document.getElementById('tab-itens');
                    var div = document.createElement('div');
                    div.id = 'tab-' + ABA;
                    div.className = 'card of-card';
                    div.style.display = 'none';
                    div.innerHTML = html();
                    if (ref && ref.parentNode) ref.parentNode.insertBefore(div, ref.nextSibling);
                    else document.body.appendChild(div);
                
                    /* 2) o botao no menu de abas */
                    var alvo = document.getElementById('btn-tab-custo');
                    var cont = alvo ? alvo.parentNode : document.querySelector('#meu-menu-abas .tabs') || document.querySelector('.tabs');
                    if (cont) {
                      var b = document.createElement('button');
                      b.className = 'tab-btn';
                      b.id = 'btn-tab-' + ABA;
                      b.innerHTML = '\uD83E\uDDED ObraFlow \u2014 Plano Mestre';
                      b.onclick = function () { OF.abrir(); };
                      cont.appendChild(b);
                    }
                
                    var tt = document.getElementById('ofTitulo');
                    if (tt) tt.addEventListener('blur', function () { OF.save(); });
                
                    var fa = document.getElementById('ofArquivo');
                    if (fa) fa.addEventListener('change', lerArquivo);
                
                    var dir = document.getElementById('ofDir');
                    if (dir) dir.addEventListener('scroll', function () {
                      var c = document.getElementById('ofGanttCab');
                      if (c) c.style.transform = 'translateX(' + (-dir.scrollLeft) + 'px)';
                    });
                  }
                
                  /* troca de aba: esconde as outras e mostra a nossa, e vice-versa */
                  var OUTRAS = ['itens', 'liberacao', 'medicoes', 'graficos', 'recebimento',
                                'cronograma', 'pagamento', 'ctm', 'custo'];
                
                  OF.abrir = function () {
                    criarAba();
                    OUTRAS.forEach(function (a) {
                      var el = document.getElementById('tab-' + a);
                      if (el) el.style.display = 'none';
                      var bt = document.getElementById('btn-tab-' + a);
                      if (bt) bt.classList.remove('active');
                    });
                    var meu = document.getElementById('tab-' + ABA);
                    if (meu) meu.style.display = 'block';
                    var mbt = document.getElementById('btn-tab-' + ABA);
                    if (mbt) mbt.classList.add('active');
                    var menu = document.getElementById('meu-menu-abas');
                    if (menu) menu.removeAttribute('open');
                    OF.load();
                    var obra = obraAtual();
                    var tt = document.getElementById('ofTitulo');
                    if (tt && obra && obra.obraflow && obra.obraflow.titulo) tt.innerText = obra.obraflow.titulo;
                    OF.render();
                  };
                
                  function fecharSeAberta() {
                    var meu = document.getElementById('tab-' + ABA);
                    if (meu) meu.style.display = 'none';
                    var mbt = document.getElementById('btn-tab-' + ABA);
                    if (mbt) mbt.classList.remove('active');
                  }
                
                  function ligarTrocaAba() {
                    var anterior = window.trocarAba;
                    if (typeof anterior !== 'function' || anterior.__of55) return;
                    var nova = function (aba) {
                      if (aba === ABA) { OF.abrir(); return; }
                      fecharSeAberta();
                      return anterior.apply(this, arguments);
                    };
                    nova.__of55 = true;
                    window.trocarAba = nova;
                    try { trocarAba = nova; } catch (e) {}
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 5) desenho da tabela e do Gantt
                   * ------------------------------------------------------------------ */
                  function corDe(t) { return CORES[t.cor] || CORES.azul; }
                
                  OF.render = function () {
                    if (!document.getElementById('tab-' + ABA)) return;
                    recalcular(null);
                    var lista = achatar();
                    var busca = (st.filtro || '').trim().toLowerCase();
                    if (busca) {
                      lista = lista.filter(function (t) {
                        return (t.nome || '').toLowerCase().indexOf(busca) >= 0 ||
                               (t.__wbs || '').indexOf(busca) >= 0;
                      });
                    }
                    desenharLinhas(lista);
                    desenharGantt(lista);
                    desenharMetricas();
                  };
                
                  function desenharLinhas(lista) {
                    var alvo = document.getElementById('ofLinhas');
                    if (!alvo) return;
                    if (!lista.length) {
                      alvo.innerHTML = '<div class="of-vazio">Nenhuma tarefa ainda. Clique em <b>+ Nova Fase</b> ' +
                        'ou em <b>Importar Cronograma Atual</b> para trazer o que ja existe.</div>';
                      return;
                    }
                    var h = '';
                    lista.forEach(function (t) {
                      var recuo = 8 + (t.__nivel * 18);
                      var seta = t.__temFilhos
                        ? '<span class="of-seta" onclick="OF.alternar(\'' + t.id + '\')">' + (st.recolhidos[t.id] ? '\u25B6' : '\u25BC') + '</span>'
                        : '<span class="of-seta of-seta-off"></span>';
                      var icone = t.tipo === 'marco' ? '\u25C6' : (t.__resumo ? '\uD83D\uDCC1' : '\u25AA');
                      var dur = t.tipo === 'marco' ? '0' : String(duracao(t));
                      h += '<div class="of-linha' + (t.__resumo ? ' of-linha-resumo' : '') + '" data-id="' + t.id + '">' +
                        '<div class="of-c-wbs">' + esc(t.__wbs) + '</div>' +
                        '<div class="of-c-nome" style="padding-left:' + recuo + 'px" title="' + esc(t.obs || t.nome) + '">' +
                          seta + '<span class="of-ico">' + icone + '</span>' +
                          '<span class="of-nome-txt" ondblclick="OF.editar(\'' + t.id + '\')">' + esc(t.nome) + '</span>' +
                          (t.responsaveis && t.responsaveis.length
                            ? '<span class="of-resp">' + esc([].concat(t.responsaveis).join(', ')) + '</span>' : '') +
                        '</div>' +
                        '<div class="of-c-data">' + fmtBR(t.inicio) + '</div>' +
                        '<div class="of-c-data">' + (t.tipo === 'marco' ? fmtBR(t.inicio) : fmtBR(t.fim)) + '</div>' +
                        '<div class="of-c-dur">' + dur + '</div>' +
                        '<div class="of-c-pct">' + Math.round(num(t.percentual, 0)) + '%</div>' +
                        '<div class="of-c-acoes">' +
                          '<button title="Nova subtarefa" onclick="OF.novaFilha(\'' + t.id + '\')">\u2795</button>' +
                          '<button title="Editar" onclick="OF.editar(\'' + t.id + '\')">\u270F\uFE0F</button>' +
                          '<button title="Subir" onclick="OF.mover(\'' + t.id + '\',-1)">\u2191</button>' +
                          '<button title="Descer" onclick="OF.mover(\'' + t.id + '\',1)">\u2193</button>' +
                          '<button title="Transformar em subtarefa da linha de cima" onclick="OF.recuar(\'' + t.id + '\')">\u21E5</button>' +
                          '<button title="Promover um nivel" onclick="OF.promover(\'' + t.id + '\')">\u21E4</button>' +
                          '<button title="Excluir" class="of-del" onclick="OF.excluir(\'' + t.id + '\')">\uD83D\uDDD1\uFE0F</button>' +
                        '</div>' +
                      '</div>';
                    });
                    alvo.innerHTML = h;
                  }
                
                  function limites(lista) {
                    var min = null, max = null;
                    lista.forEach(function (t) {
                      var a = toDate(t.inicio), b = toDate(t.fim || t.inicio);
                      if (a && (!min || a < min)) min = a;
                      if (b && (!max || b > max)) max = b;
                    });
                    if (!min || !max) return null;
                    min = new Date(min.getFullYear(), min.getMonth(), min.getDate() - 2);
                    max = new Date(max.getFullYear(), max.getMonth(), max.getDate() + 2);
                    return { min: min, max: max, dias: diasEntre(min, max) };
                  }
                
                  var MES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
                
                  function desenharGantt(lista) {
                    var alvo = document.getElementById('ofGantt');
                    if (!alvo) return;
                    var lim = limites(lista);
                    if (!lista.length || !lim) { alvo.innerHTML = ''; return; }
                
                    var W = st.larguraDia;
                    var total = lim.dias * W;
                
                    /* cabecalho: meses e dias */
                    var meses = '', dias = '';
                    var i, d, blocoIni = 0, blocoMes = null;
                    for (i = 0; i < lim.dias; i++) {
                      d = new Date(lim.min.getFullYear(), lim.min.getMonth(), lim.min.getDate() + i);
                      var chave = d.getFullYear() + '-' + d.getMonth();
                      if (blocoMes === null) { blocoMes = chave; blocoIni = i; }
                      if (chave !== blocoMes) {
                        var dp = new Date(lim.min.getFullYear(), lim.min.getMonth(), lim.min.getDate() + blocoIni);
                        meses += '<div class="of-g-mes" style="left:' + (blocoIni * W) + 'px;width:' + ((i - blocoIni) * W) + 'px">' +
                                 MES[dp.getMonth()] + '/' + String(dp.getFullYear()).slice(2) + '</div>';
                        blocoMes = chave; blocoIni = i;
                      }
                      var fds = (d.getDay() === 0 || d.getDay() === 6);
                      dias += '<div class="of-g-dia' + (fds ? ' of-fds' : '') + '" style="left:' + (i * W) + 'px;width:' + W + 'px">' +
                              (W >= 18 ? pad(d.getDate()) : '') + '</div>';
                    }
                    var dp2 = new Date(lim.min.getFullYear(), lim.min.getMonth(), lim.min.getDate() + blocoIni);
                    meses += '<div class="of-g-mes" style="left:' + (blocoIni * W) + 'px;width:' + ((lim.dias - blocoIni) * W) + 'px">' +
                             MES[dp2.getMonth()] + '/' + String(dp2.getFullYear()).slice(2) + '</div>';
                
                    /* faixa de hoje */
                    var hj = toDate(hojeISO());
                    var hojeDiv = '';
                    if (hj >= lim.min && hj <= lim.max) {
                      hojeDiv = '<div class="of-hoje" style="left:' + (diasEntre(toISO(lim.min), toISO(hj)) - 1) * W + 'px"></div>';
                    }
                
                    /* fundo listrado de fim de semana */
                    var fundo = '';
                    for (i = 0; i < lim.dias; i++) {
                      d = new Date(lim.min.getFullYear(), lim.min.getMonth(), lim.min.getDate() + i);
                      if (d.getDay() === 0 || d.getDay() === 6) {
                        fundo += '<div class="of-col-fds" style="left:' + (i * W) + 'px;width:' + W + 'px"></div>';
                      }
                    }
                
                    /* barras */
                    var barras = '';
                    lista.forEach(function (t) {
                      var ini = toDate(t.inicio);
                      var cel = '<div class="of-g-linha">';
                      if (ini) {
                        var off = (diasEntre(toISO(lim.min), t.inicio) - 1) * W;
                        if (t.tipo === 'marco') {
                          cel += '<div class="of-marco" style="left:' + (off + W / 2 - 7) + 'px" title="' +
                                 esc(t.nome) + ' \u2014 ' + fmtBR(t.inicio) + '"></div>' +
                                 '<div class="of-rot" style="left:' + (off + W / 2 + 10) + 'px">' + esc(t.nome) + '</div>';
                        } else {
                          var dur = Math.max(1, duracao(t));
                          var larg = Math.max(W * 0.6, dur * W - 2);
                          var pct = Math.min(100, Math.max(0, num(t.percentual, 0)));
                          if (t.__resumo) {
                            cel += '<div class="of-bar-resumo" style="left:' + off + 'px;width:' + larg + 'px" title="' +
                                   esc(t.nome) + ' \u2014 ' + fmtBR(t.inicio) + ' a ' + fmtBR(t.fim) + ' (' + dur + ' dias)">' +
                                   '<i style="width:' + pct + '%"></i></div>';
                          } else {
                            cel += '<div class="of-bar" style="left:' + off + 'px;width:' + larg + 'px;background:' + corDe(t) + '" ' +
                                   'onclick="OF.editar(\'' + t.id + '\')" title="' + esc(t.nome) + ' \u2014 ' +
                                   fmtBR(t.inicio) + ' a ' + fmtBR(t.fim) + ' (' + dur + ' dias, ' + Math.round(pct) + '%)">' +
                                   '<i style="width:' + pct + '%"></i></div>';
                          }
                          cel += '<div class="of-rot" style="left:' + (off + larg + 8) + 'px">' + Math.round(pct) + '%</div>';
                        }
                      }
                      cel += '</div>';
                      barras += cel;
                    });
                
                    alvo.innerHTML =
                      '<div id="ofGanttCab" class="of-g-cab" style="width:' + total + 'px">' +
                        '<div class="of-g-meses">' + meses + '</div>' +
                        '<div class="of-g-dias">' + dias + '</div>' +
                      '</div>' +
                      '<div class="of-g-corpo" style="width:' + total + 'px">' + fundo + hojeDiv + barras + '</div>';
                  }
                
                  function desenharMetricas() {
                    var fases = 0, tar = 0, marcos = 0;
                    st.tarefas.forEach(function (t) {
                      if (t.tipo === 'marco') marcos++;
                      else if (ehResumo(t)) fases++;
                      else tar++;
                    });
                    var geral = recalcular(null);
                    var per = (geral.inicio && geral.fim) ? (fmtBR(geral.inicio) + ' a ' + fmtBR(geral.fim)) : '-';
                    var dur = (geral.inicio && geral.fim) ? diasEntre(geral.inicio, geral.fim) : 0;
                    function set(id, v) { var e = document.getElementById(id); if (e) e.innerHTML = v; }
                    set('ofMFases', fases);
                    set('ofMTarefas', tar);
                    set('ofMMarcos', marcos);
                    set('ofMPeriodo', per);
                    set('ofMDuracao', dur + ' dias');
                    set('ofMPct', Math.round(geral.percentual) + '%');
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 6) acoes da tela
                   * ------------------------------------------------------------------ */
                  OF.aoFiltrar = function (v) { st.filtro = v; OF.render(); };
                  OF.alternar = function (id) { st.recolhidos[id] = !st.recolhidos[id]; OF.render(); };
                  OF.expandirTudo = function () { st.recolhidos = {}; OF.render(); };
                  OF.recolherTudo = function () {
                    st.tarefas.forEach(function (t) { if (filhos(t.id).length) st.recolhidos[t.id] = true; });
                    OF.render();
                  };
                  OF.zoom = function (dir) {
                    st.larguraDia = Math.min(60, Math.max(8, st.larguraDia + dir * 6));
                    OF.render();
                  };
                
                  OF.mover = function (id, dir) {
                    var t = porId(id); if (!t) return;
                    var irmaos = filhos(t.paiId || null);
                    var i = irmaos.indexOf(t);
                    var j = i + dir;
                    if (j < 0 || j >= irmaos.length) return;
                    var o = irmaos[i].ordem;
                    irmaos[i].ordem = irmaos[j].ordem;
                    irmaos[j].ordem = o;
                    OF.save(); OF.render();
                  };
                
                  OF.recuar = function (id) {
                    var t = porId(id); if (!t) return;
                    var irmaos = filhos(t.paiId || null);
                    var i = irmaos.indexOf(t);
                    if (i <= 0) { alerta('Nao ha uma linha acima no mesmo nivel para virar a fase desta tarefa.'); return; }
                    var novoPai = irmaos[i - 1];
                    t.paiId = novoPai.id;
                    t.ordem = (filhos(novoPai.id).length + 1) * 10;
                    if (novoPai.tipo === 'marco') novoPai.tipo = 'fase';
                    st.recolhidos[novoPai.id] = false;
                    renumerar(novoPai.id);
                    OF.save(); OF.render();
                  };
                
                  OF.promover = function (id) {
                    var t = porId(id); if (!t) return;
                    var pai = porId(t.paiId);
                    if (!pai) { alerta('Esta tarefa ja esta no nivel mais alto.'); return; }
                    var avo = pai.paiId || null;
                    t.paiId = avo;
                    t.ordem = num(pai.ordem, 0) + 5;
                    renumerar(avo);
                    OF.save(); OF.render();
                  };
                
                  OF.excluir = function (id) {
                    var t = porId(id); if (!t) return;
                    var n = 0;
                    (function conta(x) { filhos(x).forEach(function (f) { n++; conta(f.id); }); })(id);
                    var msg = 'Excluir "' + t.nome + '"' + (n ? ' e as ' + n + ' subtarefas dela' : '') + '?';
                    if (!confirm(msg)) return;
                    var apagar = {};
                    apagar[id] = true;
                    (function marca(x) { filhos(x).forEach(function (f) { apagar[f.id] = true; marca(f.id); }); })(id);
                    st.tarefas = st.tarefas.filter(function (x) { return !apagar[x.id]; });
                    OF.save(); OF.render();
                  };
                
                  /* ------------------------------------------------------------------ *
                   * 7) modal de cadastro
                   * ------------------------------------------------------------------ */
                  function alerta(txt) {
                    try { alert(txt); } catch (e) { console.log(txt); }
                  }
                
                  function abrirModal(tit) {
                    var m = document.getElementById('ofModal');
                    if (m) m.classList.add('of-on');
                    var t = document.getElementById('ofModalTit');
                    if (t) t.innerText = tit;
                    var av = document.getElementById('ofAviso');
                    if (av) av.innerHTML = '';
                    OF.aoTrocarTipo();
                    setTimeout(function () {
                      var n = document.getElementById('ofFNome');
                      if (n) { n.focus(); n.select(); }
                    }, 60);
                  }
                
                  OF.fecharModal = function () {
                    var m = document.getElementById('ofModal');
                    if (m) m.classList.remove('of-on');
                    st.editandoId = null;
                    st.paiNovo = null;
                  };
                
                  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
                  function setVal(id, v) { var e = document.getElementById(id); if (e) e.value = v; }
                
                  OF.aoTrocarTipo = function () {
                    var tipo = val('ofFTipo');
                    var eh = (tipo === 'marco');
                    ['ofFDur', 'ofFFim'].forEach(function (id) {
                      var e = document.getElementById(id);
                      if (e) { e.disabled = eh; e.parentNode.style.opacity = eh ? 0.45 : 1; }
                    });
                    var av = document.getElementById('ofAviso');
                    if (av) {
                      if (tipo === 'fase') av.innerHTML = 'Fase: as datas e o % serao calculados automaticamente pelas subtarefas.';
                      else if (eh) av.innerHTML = 'Marco: evento de um dia, aparece como losango no grafico.';
                      else av.innerHTML = '';
                    }
                  };
                
                  OF.aoTrocarInicio = function () {
                    var d = num(val('ofFDur'), 0);
                    if (d > 0 && val('ofFInicio')) setVal('ofFFim', addDias(val('ofFInicio'), d - 1));
                  };
                  OF.aoTrocarDur = function () {
                    var d = num(val('ofFDur'), 0);
                    if (d > 0 && val('ofFInicio')) setVal('ofFFim', addDias(val('ofFInicio'), d - 1));
                  };
                  OF.aoTrocarFim = function () {
                    if (val('ofFInicio') && val('ofFFim')) setVal('ofFDur', diasEntre(val('ofFInicio'), val('ofFFim')));
                  };
                
                  OF.novaFase = function () {
                    criarAba();
                    st.editandoId = null;
                    st.paiNovo = null;
                    setVal('ofFNome', '');
                    setVal('ofFTipo', 'fase');
                    setVal('ofFInicio', hojeISO());
                    setVal('ofFDur', 5);
                    setVal('ofFFim', addDias(hojeISO(), 4));
                    setVal('ofFPct', 0);
                    setVal('ofFCor', 'azul');
                    setVal('ofFResp', '');
                    setVal('ofFObs', '');
                    abrirModal('Nova Fase');
                  };
                
                  OF.novaFilha = function (paiId) {
                    var pai = porId(paiId);
                    st.editandoId = null;
                    st.paiNovo = paiId;
                    setVal('ofFNome', '');
                    setVal('ofFTipo', 'tarefa');
                    setVal('ofFInicio', (pai && pai.inicio) ? pai.inicio : hojeISO());
                    setVal('ofFDur', 3);
                    setVal('ofFFim', addDias((pai && pai.inicio) ? pai.inicio : hojeISO(), 2));
                    setVal('ofFPct', 0);
                    setVal('ofFCor', (pai && pai.cor) ? pai.cor : 'azul');
                    setVal('ofFResp', (pai && pai.responsaveis) ? [].concat(pai.responsaveis).join(', ') : '');
                    setVal('ofFObs', '');
                    abrirModal('Nova Subtarefa de: ' + (pai ? pai.nome : ''));
                  };
                
                  OF.editar = function (id) {
                    var t = porId(id); if (!t) return;
                    st.editandoId = id;
                    st.paiNovo = null;
                    setVal('ofFNome', t.nome);
                    setVal('ofFTipo', t.tipo);
                    setVal('ofFInicio', t.inicio || '');
                    setVal('ofFDur', t.tipo === 'marco' ? 0 : duracao(t));
                    setVal('ofFFim', t.fim || '');
                    setVal('ofFPct', Math.round(num(t.percentual, 0)));
                    setVal('ofFCor', t.cor || 'azul');
                    setVal('ofFResp', [].concat(t.responsaveis || []).join(', '));
                    setVal('ofFObs', t.obs || '');
                    abrirModal('Editar: ' + t.nome);
                  };
                
                  OF.salvarModal = function () {
                    var nome = (val('ofFNome') || '').trim();
                    if (!nome) { alerta('Informe o nome da tarefa.'); return; }
                    var tipo = val('ofFTipo') || 'tarefa';
                    var ini = val('ofFInicio');
                    var fim = val('ofFFim');
                    if (tipo === 'marco') fim = ini;
                    if (tipo !== 'fase') {
                      if (!ini) { alerta('Informe a data de inicio.'); return; }
                      if (!fim) fim = ini;
                      if (toDate(fim) < toDate(ini)) { alerta('O termino nao pode ser antes do inicio.'); return; }
                    }
                    var resp = (val('ofFResp') || '').split(',').map(function (s) { return s.trim(); })
                                 .filter(function (s) { return !!s; });
                    var dados = {
                      nome: nome,
                      tipo: tipo,
                      inicio: ini,
                      fim: fim,
                      percentual: Math.min(100, Math.max(0, num(val('ofFPct'), 0))),
                      cor: val('ofFCor') || 'azul',
                      responsaveis: resp,
                      obs: val('ofFObs') || ''
                    };
                
                    if (st.editandoId) {
                      var t = porId(st.editandoId);
                      if (t) for (var k in dados) t[k] = dados[k];
                    } else {
                      var pai = st.paiNovo || null;
                      dados.paiId = pai;
                      dados.ordem = (filhos(pai).length + 1) * 10;
                      st.tarefas.push(tarefaNova(dados));
                      if (pai) {
                        var p = porId(pai);
                        if (p && p.tipo === 'marco') p.tipo = 'fase';
                        st.recolhidos[pai] = false;
                      }
                    }
                    OF.fecharModal();
                    OF.save();
                    OF.render();
                  };
                
                  /* ------------------------------------------------------------------ *
                   * 8) importar o cronograma que ja existe
                   * ------------------------------------------------------------------ */
                  OF.importarCronograma = function () {
                    var obra = obraAtual();
                    var orig = (obra && obra.cronogramaTasks) ? obra.cronogramaTasks : null;
                    if (!orig && typeof window.tasks !== 'undefined' && Array.isArray(window.tasks)) orig = window.tasks;
                    if (!orig || !orig.length) {
                      alerta('Nao encontrei tarefas na aba Gestao de Obra e Equipe desta obra.');
                      return;
                    }
                    if (st.tarefas.length && !confirm('Isto vai ACRESCENTAR ' + orig.length +
                        ' tarefas ao plano mestre (o cronograma original nao e alterado). Continuar?')) return;
                
                    var mapaFases = {};
                    var baseOrdem = filhos(null).length;
                    orig.forEach(function (o) {
                      var g = (o.group || 'SEM GRUPO').toString();
                      if (!mapaFases[g]) {
                        baseOrdem++;
                        var fase = tarefaNova({
                          nome: g, tipo: 'fase', paiId: null, ordem: baseOrdem * 10,
                          cor: o.color || 'azul'
                        });
                        st.tarefas.push(fase);
                        mapaFases[g] = { id: fase.id, n: 0 };
                      }
                      mapaFases[g].n++;
                      var fimReal = o.actualEnd || '';
                      var pct = fimReal ? 100 : 0;
                      st.tarefas.push(tarefaNova({
                        nome: o.name || 'Tarefa',
                        tipo: 'tarefa',
                        paiId: mapaFases[g].id,
                        ordem: mapaFases[g].n * 10,
                        inicio: o.start || '',
                        fim: o.end || o.start || '',
                        fimReal: fimReal,
                        percentual: pct,
                        cor: o.color || 'azul'
                      }));
                    });
                    OF.save();
                    OF.render();
                    alerta('Pronto! ' + orig.length + ' tarefas importadas em ' +
                           Object.keys(mapaFases).length + ' fases. A aba antiga continua intacta.');
                  };
                
                  /* ------------------------------------------------------------------ *
                   * 9) backup, CSV e impressao
                   * ------------------------------------------------------------------ */
                  function baixar(nome, texto, tipo) {
                    var blob = new Blob([texto], { type: tipo || 'text/plain;charset=utf-8' });
                    var a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = nome;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
                  }
                
                  function selo() {
                    var d = new Date();
                    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' +
                           pad(d.getHours()) + pad(d.getMinutes());
                  }
                
                  OF.exportarJSON = function () {
                    var tt = document.getElementById('ofTitulo');
                    baixar('obraflow_' + selo() + '.json', JSON.stringify({
                      app: 'ObraFlow', versao: 1,
                      titulo: tt ? tt.innerText : '',
                      tarefas: st.tarefas
                    }, null, 2), 'application/json');
                  };
                
                  OF.importarJSON = function () {
                    var f = document.getElementById('ofArquivo');
                    if (f) { f.value = ''; f.click(); }
                  };
                
                  function lerArquivo(ev) {
                    var file = ev.target.files && ev.target.files[0];
                    if (!file) return;
                    var r = new FileReader();
                    r.onload = function () {
                      try {
                        var d = JSON.parse(r.result);
                        var lista = Array.isArray(d) ? d : d.tarefas;
                        if (!Array.isArray(lista)) throw new Error('formato');
                        if (!confirm('Substituir o plano mestre atual por ' + lista.length + ' tarefas do arquivo?')) return;
                        st.tarefas = lista.map(function (t) { return tarefaNova(t); });
                        if (d.titulo) {
                          var tt = document.getElementById('ofTitulo');
                          if (tt) tt.innerText = d.titulo;
                        }
                        OF.save(); OF.render();
                        alerta('Plano mestre restaurado.');
                      } catch (e) {
                        alerta('Arquivo invalido. Escolha um backup gerado pelo proprio ObraFlow.');
                      }
                    };
                    r.readAsText(file, 'utf-8');
                  }
                
                  OF.exportarCSV = function () {
                    recalcular(null);
                    var lista = achatar();
                    var lin = ['EAP;Nivel;Nome;Tipo;Inicio;Termino;Duracao;Percentual;Responsavel;Observacao'];
                    lista.forEach(function (t) {
                      lin.push([
                        t.__wbs, t.__nivel + 1,
                        (t.nome || '').replace(/;/g, ','),
                        (t.tipo === 'fase' || t.__resumo) ? 'Fase' : (t.tipo === 'marco' ? 'Marco' : 'Tarefa'),
                        fmtBR(t.inicio), fmtBR(t.fim),
                        (t.tipo === 'marco' ? 0 : duracao(t)),
                        Math.round(num(t.percentual, 0)) + '%',
                        [].concat(t.responsaveis || []).join(' / ').replace(/;/g, ','),
                        (t.obs || '').replace(/;/g, ',').replace(/[\r\n]+/g, ' ')
                      ].join(';'));
                    });
                    baixar('obraflow_' + selo() + '.csv', '\uFEFF' + lin.join('\r\n'), 'text/csv;charset=utf-8');
                  };
                
                  OF.imprimir = function () {
                    document.body.classList.add('of-print-mode');
                    setTimeout(function () {
                      try { window.print(); } finally {
                        setTimeout(function () { document.body.classList.remove('of-print-mode'); }, 400);
                      }
                    }, 120);
                  };
                
                  /* ------------------------------------------------------------------ *
                   * 10) partida
                   * ------------------------------------------------------------------ */
                  function iniciar() {
                    try { criarAba(); } catch (e) { console.warn('ObraFlow: aba', e); }
                    try { ligarTrocaAba(); } catch (e) { console.warn('ObraFlow: menu', e); }
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function () { setTimeout(iniciar, 900); });
                  } else {
                    setTimeout(iniciar, 900);
                  }
                
                })();
            
