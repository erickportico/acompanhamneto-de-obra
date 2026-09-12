
                /* PATCH 72: ARRASTAR COLUNAS COM O BOTAO ESQUERDO E LEMBRAR ONDE PAROU */
                (function () {
                  if (window.P72 && window.P72.__v72) return;
                  var P72 = window.P72 = window.P72 || {};
                  P72.__v72 = true;
                
                  /* PATCH159: a tabela de Recebimento tinha colunas duplicadas no corpo,
                     o que travava o reordenamento e deixava o cabecalho (Observacoes/Acoes
                     arrastadas para o inicio, em alguma sessao antiga) fora de sincronia
                     com os dados. Corrigido o corpo; aqui zeramos so essa ordem salva,
                     uma unica vez por navegador, para a tabela voltar ao layout padrao. */
                  try {
                    if (!localStorage.getItem('p159ResetColunasRecebimento')) {
                      localStorage.removeItem('painelColunas_tbodyRecebimento');
                      localStorage.setItem('p159ResetColunasRecebimento', '1');
                    }
                  } catch (e) { /* ignora */ }
                
                  /* ------------------------------------------------------------------ */
                  /* AJUDANTES                                                          */
                  /* ------------------------------------------------------------------ */
                  function porId(id) { return document.getElementById(id); }
                
                  function paraNumero(v) {
                    if (typeof v === 'number') return isFinite(v) ? v : 0;
                    var s = String(v == null ? '' : v).replace(/\s/g, '').replace(/R\$/gi, '');
                    if (s.indexOf(',') > -1) {
                      if (s.indexOf('.') > -1) s = s.replace(/\./g, '');
                      s = s.replace(',', '.');
                    }
                    s = s.replace(/[^0-9.\-]/g, '');
                    var n = parseFloat(s);
                    return isFinite(n) ? n : 0;
                  }
                
                  function dinheiro(n) {
                    var v = paraNumero(n);
                    try {
                      return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    } catch (e) {
                      return 'R$ ' + v.toFixed(2);
                    }
                  }
                
                  function ehLista(x) { return Object.prototype.toString.call(x) === '[object Array]'; }
                
                  function banco() {
                    try { if (window.db) return window.db; } catch (e) { /* ignora */ }
                    try {
                      /* eslint-disable no-undef */
                      if (typeof db !== 'undefined') return db;
                    } catch (e2) { /* ignora */ }
                    return null;
                  }
                
                  function listaObras() {
                    var b = banco();
                    return (b && ehLista(b.obras)) ? b.obras : [];
                  }
                
                  function copiarMarcas(de, para) {
                    if (!de || !para) return;
                    for (var k in de) {
                      if (Object.prototype.hasOwnProperty.call(de, k) && !(k in para)) {
                        try { para[k] = de[k]; } catch (e) { /* ignora */ }
                      }
                    }
                  }
                
                  /* ================================================================== */
                  /* PARTE 1 - ARRASTAR E REORDENAR COLUNAS COM O BOTAO ESQUERDO        */
                  /* ================================================================== */
                
                  /* as mesmas chaves de gravacao ja usadas pelo painel, para a ordem
                     escolhida continuar valendo depois do F5 */
                  var PREFIXO = 'painelColunas_';
                
                  /* tabelas atendidas: as tres que ja tinham arraste e as que ficaram de
                     fora antes. Tabelas de cabecalho agrupado (com colspan/rowspan) ou
                     com linha de totais de celulas unidas sao descartadas na
                     conferencia, para nenhum layout sair do lugar. */
                  var TABELAS = [
                    'tbodyLiberacao',
                    'tbodyFabricacao',
                    'tbodyInstalacao',
                    'tbodyMedicaoBoletim',
                    'tbodyRecebimento',
                    'tbodyMateriaisConsolidados',
                    'specTableBodyCTM',
                    'historyTableBodyCTM',
                    'reportTableBodyCrono'
                  ];
                
                  P72.tabelasLigadas = [];
                  var estados = {};
                  var arraste = null;
                
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
                    try { localStorage.setItem(PREFIXO + chave, JSON.stringify(cfg)); }
                    catch (e) { /* navegador sem espaco: segue sem guardar */ }
                  }
                
                  /* devolve a linha de cabecalho SE a tabela for simples (uma linha de
                     titulos, sem celulas agrupadas). Caso contrario devolve nulo. */
                  function linhaCabecalho(chave) {
                    var tbody = porId(chave);
                    if (!tbody) return null;
                    var tabela = tbody.closest ? tbody.closest('table') : null;
                    if (!tabela) return null;
                    var thead = tabela.querySelector('thead');
                    if (!thead) return null;
                    var linhas = thead.querySelectorAll('tr');
                    if (linhas.length !== 1) return null;
                    /* rodape com celulas unidas (linha de totais) nao acompanha troca de
                       coluna: tabela assim fica de fora para nada desalinhar */
                    if (tabela.querySelector('tfoot [colspan], tfoot [rowspan]')) return null;
                    var tr = linhas[0];
                    var ths = tr.children;
                    if (!ths || ths.length < 2) return null;
                    for (var i = 0; i < ths.length; i++) {
                      var th = ths[i];
                      if (String(th.tagName).toLowerCase() !== 'th') return null;
                      var cs = parseInt(th.getAttribute('colspan') || '1', 10);
                      var rs = parseInt(th.getAttribute('rowspan') || '1', 10);
                      if (cs > 1 || rs > 1) return null;
                    }
                    return tr;
                  }
                
                  function ordemAtual(tr) {
                    return Array.prototype.map.call(tr.children, function (th) {
                      return parseInt(th.getAttribute('data-col-orig'), 10) || 0;
                    });
                  }
                
                  /* reordena as celulas do corpo seguindo a ordem do cabecalho.
                     Nao mexe no conteudo das celulas: apenas troca de lugar. */
                  function aplicarCorpo(chave) {
                    var tbody = porId(chave);
                    var tr = linhaCabecalho(chave);
                    if (!tbody || !tr) return;
                    var ordem = ordemAtual(tr);
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
                      for (var i = 0; i < ordem.length; i++) {
                        var td = mapa[String(ordem[i])];
                        if (td) linha.appendChild(td);
                      }
                    });
                  }
                
                  function aplicarCabecalho(chave) {
                    var tr = linhaCabecalho(chave);
                    if (!tr) return;
                    var cfg = lerCfg(chave);
                    if (!cfg.ordem) return;
                    var ths = Array.prototype.slice.call(tr.children);
                    for (var i = 0; i < cfg.ordem.length; i++) {
                      for (var j = 0; j < ths.length; j++) {
                        if (parseInt(ths[j].getAttribute('data-col-orig'), 10) === cfg.ordem[i]) {
                          tr.appendChild(ths[j]);
                          break;
                        }
                      }
                    }
                  }
                
                  function aplicarTudo(chave) {
                    var est = estados[chave] = estados[chave] || {};
                    est.aplicando = true;
                    try {
                      aplicarCabecalho(chave);
                      aplicarCorpo(chave);
                    } catch (e) { /* ignora */ }
                    setTimeout(function () { est.aplicando = false; }, 0);
                  }
                
                  function limparAlvos(tr) {
                    if (!tr) return;
                    Array.prototype.forEach.call(tr.children, function (th) {
                      th.classList.remove('p72-alvo-esq');
                      th.classList.remove('p72-alvo-dir');
                    });
                  }
                
                  function tirarFantasma() {
                    var f = porId('p72Fantasma');
                    if (f && f.parentNode) f.parentNode.removeChild(f);
                  }
                
                  function porFantasma(texto, x, y) {
                    var f = porId('p72Fantasma');
                    if (!f) {
                      f = document.createElement('div');
                      f.id = 'p72Fantasma';
                      f.className = 'p72-fantasma';
                      document.body.appendChild(f);
                    }
                    f.textContent = texto;
                    f.style.left = (x + 14) + 'px';
                    f.style.top = (y + 12) + 'px';
                  }
                
                  function tituloDoTh(th) {
                    var c = th.querySelector('.th-content');
                    var t = (c ? c.textContent : th.textContent) || '';
                    t = t.replace(/\s+/g, ' ').trim();
                    return t || 'coluna';
                  }
                
                  function ladoDoAlvo(th, x) {
                    var r = th.getBoundingClientRect ? th.getBoundingClientRect() : null;
                    if (!r || !r.width) return 'dir';
                    return (x < r.left + r.width / 2) ? 'esq' : 'dir';
                  }
                
                  function terminarArraste(cancelar) {
                    if (!arraste) return;
                    var a = arraste;
                    arraste = null;
                    document.removeEventListener('mousemove', aoMover, true);
                    document.removeEventListener('mouseup', aoSoltar, true);
                    tirarFantasma();
                    if (document.body) document.body.classList.remove('p72-sem-selecao');
                    a.th.classList.remove('p72-arrastando');
                    limparAlvos(a.tr);
                    /* devolve o arraste antigo do navegador como estava */
                    try { a.th.setAttribute('draggable', a.draggableAntigo == null ? 'true' : a.draggableAntigo); }
                    catch (e) { /* ignora */ }
                
                    if (cancelar || !a.moveu || !a.alvo || a.alvo === a.th) return;
                    if (a.alvo.parentNode !== a.tr || a.th.parentNode !== a.tr) return;
                
                    var ths = Array.prototype.slice.call(a.tr.children);
                    var de = ths.indexOf(a.th);
                    var para = ths.indexOf(a.alvo);
                    if (de < 0 || para < 0) return;
                
                    if (a.lado === 'esq') a.tr.insertBefore(a.th, a.alvo);
                    else a.tr.insertBefore(a.th, a.alvo.nextSibling);
                
                    var cfg = lerCfg(a.chave);
                    cfg.ordem = ordemAtual(a.tr);
                    gravarCfg(a.chave, cfg);
                    aplicarCorpo(a.chave);
                    P72.ultimoMovimento = { tabela: a.chave, coluna: tituloDoTh(a.th) };
                  }
                
                  function aoMover(e) {
                    if (!arraste) return;
                    var dx = Math.abs(e.clientX - arraste.xIni);
                    var dy = Math.abs(e.clientY - arraste.yIni);
                    if (!arraste.moveu && dx < 4 && dy < 4) return;
                
                    if (!arraste.moveu) {
                      arraste.moveu = true;
                      arraste.th.classList.add('p72-arrastando');
                      if (document.body) document.body.classList.add('p72-sem-selecao');
                    }
                    if (e.preventDefault) e.preventDefault();
                    porFantasma(arraste.titulo, e.clientX, e.clientY);
                
                    var alvo = e.target && e.target.closest ? e.target.closest('th') : null;
                    if (!alvo || alvo.parentNode !== arraste.tr || alvo === arraste.th) return;
                    var lado = ladoDoAlvo(alvo, e.clientX);
                    limparAlvos(arraste.tr);
                    alvo.classList.add(lado === 'esq' ? 'p72-alvo-esq' : 'p72-alvo-dir');
                    arraste.alvo = alvo;
                    arraste.lado = lado;
                  }
                
                  function aoSoltar() { terminarArraste(false); }
                
                  function comecarArraste(e, th, chave) {
                    if (e.button !== 0) return;                    /* somente botao esquerdo */
                    if (arraste) return;
                    var alvoClique = e.target;
                    if (alvoClique && alvoClique.closest) {
                      /* a alca de largura e os controles dentro do titulo continuam iguais */
                      if (alvoClique.closest('.col-resizer')) return;
                      if (alvoClique.closest('input, select, textarea, button, a, label')) return;
                    }
                    var tr = th.parentNode;
                    if (!tr) return;
                
                    arraste = {
                      chave: chave,
                      th: th,
                      tr: tr,
                      xIni: e.clientX,
                      yIni: e.clientY,
                      moveu: false,
                      alvo: null,
                      lado: 'dir',
                      titulo: tituloDoTh(th),
                      draggableAntigo: th.getAttribute('draggable')
                    };
                    /* desliga o arraste antigo do navegador enquanto o nosso acontece */
                    try { th.setAttribute('draggable', 'false'); } catch (err) { /* ignora */ }
                    if (e.preventDefault) e.preventDefault();
                
                    document.addEventListener('mousemove', aoMover, true);
                    document.addEventListener('mouseup', aoSoltar, true);
                  }
                
                  function prepararTh(th, chave, indice) {
                    if (th.getAttribute('data-col-orig') === null) {
                      th.setAttribute('data-col-orig', String(indice));
                      th.setAttribute('data-estilo-orig', th.getAttribute('style') || '');
                      var conteudo = th.querySelector('.th-content');
                      if (conteudo) conteudo.setAttribute('data-estilo-orig', conteudo.getAttribute('style') || '');
                    }
                    if (th.getAttribute('data-p72-pronta') === '1') return;
                    th.setAttribute('data-p72-pronta', '1');
                    th.classList.add('p72-movivel');
                    if (!th.getAttribute('title')) {
                      th.setAttribute('title', 'Segure o botao esquerdo do mouse no titulo e arraste '
                        + 'para mudar a coluna de lugar. A ordem fica guardada.');
                    }
                    th.addEventListener('mousedown', function (e) { comecarArraste(e, th, chave); });
                    /* nada de arrastar texto solto no meio do caminho */
                    th.addEventListener('dragstart', function (e) {
                      if (arraste) { if (e.preventDefault) e.preventDefault(); }
                    });
                  }
                
                  function iniciarTabela(chave) {
                    var tbody = porId(chave);
                    var tr = linhaCabecalho(chave);
                    if (!tbody || !tr) return false;
                
                    Array.prototype.forEach.call(tr.children, function (th, i) {
                      prepararTh(th, chave, i);
                    });
                
                    var est = estados[chave] = estados[chave] || { aplicando: false };
                    if (!est.observador && window.MutationObserver) {
                      est.observador = new MutationObserver(function () {
                        if (est.aplicando) return;
                        est.aplicando = true;
                        try { aplicarCorpo(chave); } catch (e) { /* ignora */ }
                        setTimeout(function () { est.aplicando = false; }, 0);
                      });
                      try { est.observador.observe(tbody, { childList: true }); } catch (e) { /* ignora */ }
                    }
                
                    aplicarTudo(chave);
                    if (P72.tabelasLigadas.indexOf(chave) < 0) P72.tabelasLigadas.push(chave);
                    return true;
                  }
                
                  function ligarColunas() {
                    for (var i = 0; i < TABELAS.length; i++) {
                      try { iniciarTabela(TABELAS[i]); } catch (e) { /* ignora */ }
                    }
                  }
                
                  /* volta uma tabela para a ordem original de fabrica */
                  function resetarTabela(chave) {
                    try { localStorage.removeItem(PREFIXO + chave); } catch (e) { /* ignora */ }
                    var tr = linhaCabecalho(chave);
                    if (!tr) return false;
                    var ths = Array.prototype.slice.call(tr.children);
                    ths.sort(function (a, b) {
                      return (parseInt(a.getAttribute('data-col-orig'), 10) || 0) -
                             (parseInt(b.getAttribute('data-col-orig'), 10) || 0);
                    });
                    for (var i = 0; i < ths.length; i++) {
                      ths[i].setAttribute('style', ths[i].getAttribute('data-estilo-orig') || '');
                      tr.appendChild(ths[i]);
                    }
                    aplicarCorpo(chave);
                    return true;
                  }
                
                  /* o botao "Colunas" que ja existia continua funcionando; agora ele
                     tambem atende as tabelas novas */
                  function ligarResetGeral() {
                    var antigo = window.resetarColunasTabela;
                    if (typeof antigo === 'function' && antigo.__v72) return;
                    var novo = function (chave) {
                      var feito = false;
                      if (typeof antigo === 'function') {
                        try { antigo.apply(this, arguments); feito = true; } catch (e) { /* ignora */ }
                      }
                      try { resetarTabela(chave); feito = true; } catch (e2) { /* ignora */ }
                      return feito;
                    };
                    novo.__v72 = true;
                    copiarMarcas(antigo, novo);
                    window.resetarColunasTabela = novo;
                  }
                
                  /* ================================================================== */
                  /* PARTE 2 - LEMBRAR ABA, SUB-ABA E OBRA DEPOIS DO F5                 */
                  /* ================================================================== */
                
                  var CHAVE_LUGAR = 'painelLugar_v72';
                
                  function lerLugar() {
                    try {
                      var raw = localStorage.getItem(CHAVE_LUGAR);
                      if (!raw) return {};
                      return JSON.parse(raw) || {};
                    } catch (e) { return {}; }
                  }
                
                  function gravarLugar(mudanca) {
                    var atual = lerLugar();
                    for (var k in mudanca) {
                      if (Object.prototype.hasOwnProperty.call(mudanca, k)) atual[k] = mudanca[k];
                    }
                    atual.quando = new Date().getTime();
                    try { localStorage.setItem(CHAVE_LUGAR, JSON.stringify(atual)); }
                    catch (e) { /* ignora */ }
                    P72.lugar = atual;
                    return atual;
                  }
                
                  /* le uma vez, logo no comeco: a pagina chama trocarAba('itens') ao
                     abrir e isso nao pode apagar o lugar que estava guardado */
                  P72.alvo = lerLugar();
                  P72.lugar = P72.alvo;
                  P72.__anotando = false;    /* so anota depois de restaurar */
                  P72.__restaurado = false;
                  P72.__abaFeita = false;
                  P72.__obraFeita = false;
                  var restaurando = false;   /* enquanto voltamos, nao anotamos nada */
                
                  /* a tela de login (patch 69) fica na frente de tudo; enquanto ela esta
                     aberta nao vale anotar nada nem tentar voltar */
                  function loginNaFrente() {
                    try {
                      var t = porId('p69Tela');
                      if (t && t.classList && t.classList.contains('p69-visivel')) return true;
                      var h = document.documentElement;
                      if (h && h.classList && h.classList.contains('p69-parado')) return true;
                    } catch (e) { /* ignora */ }
                    return false;
                  }
                
                  function anotar(mudanca) {
                    if (!P72.__anotando || restaurando) return;
                    if (!P72.__restaurado && loginNaFrente()) return;
                    gravarLugar(mudanca);
                  }
                
                  function obraAtualId() {
                    var b = banco();
                    return b ? (b.obraAtualId || '') : '';
                  }
                
                  function existeObra(id) {
                    var obras = listaObras();
                    for (var i = 0; i < obras.length; i++) {
                      if (String(obras[i].id) === String(id)) return true;
                    }
                    return false;
                  }
                
                  function abaVisivel() {
                    var abas = ['itens', 'liberacao', 'medicoes', 'graficos', 'recebimento',
                                'cronograma', 'pagamento', 'ctm', 'custo'];
                    for (var i = 0; i < abas.length; i++) {
                      var bt = porId('btn-tab-' + abas[i]);
                      if (bt && bt.classList.contains('active')) return abas[i];
                    }
                    for (var j = 0; j < abas.length; j++) {
                      var el = porId('tab-' + abas[j]);
                      if (el && el.style.display !== 'none') return abas[j];
                    }
                    return '';
                  }
                
                  function ligarMemoria() {
                    /* aba principal */
                    var abaAntiga = window.trocarAba;
                    if (typeof abaAntiga === 'function' && !abaAntiga.__v72) {
                      var novaAba = function (aba) {
                        var r = abaAntiga.apply(this, arguments);
                        try {
                          /* a aba especial que abre janela em cima nao e guardada */
                          if (abaValida(aba)) anotar({ aba: String(aba), obraId: obraAtualId() });
                        } catch (e) { /* ignora */ }
                        return r;
                      };
                      novaAba.__v72 = true;
                      copiarMarcas(abaAntiga, novaAba);
                      window.trocarAba = novaAba;
                      try { trocarAba = novaAba; } catch (e) { /* ignora */ }
                    }
                
                    /* sub-abas de Liberacao (FEM / Fabricacao / Instalacao) */
                    var femAntiga = window.trocarSubAbaFEM;
                    if (typeof femAntiga === 'function' && !femAntiga.__v72) {
                      var novaFem = function (sub) {
                        var r = femAntiga.apply(this, arguments);
                        try { anotar({ subFEM: String(sub || '') }); } catch (e) { /* ignora */ }
                        return r;
                      };
                      novaFem.__v72 = true;
                      copiarMarcas(femAntiga, novaFem);
                      window.trocarSubAbaFEM = novaFem;
                      try { trocarSubAbaFEM = novaFem; } catch (e) { /* ignora */ }
                    }
                
                    /* sub-abas de Pagamento */
                    var pgtoAntiga = window.trocarSubTabPgtoNovo;
                    if (typeof pgtoAntiga === 'function' && !pgtoAntiga.__v72) {
                      var novaPgto = function (sub) {
                        var r = pgtoAntiga.apply(this, arguments);
                        try { anotar({ subPgto: String(sub || '') }); } catch (e) { /* ignora */ }
                        return r;
                      };
                      novaPgto.__v72 = true;
                      /* mantem as marcas dos patches anteriores (__p63/__p70/__p71) */
                      copiarMarcas(pgtoAntiga, novaPgto);
                      window.trocarSubTabPgtoNovo = novaPgto;
                      try { trocarSubTabPgtoNovo = novaPgto; } catch (e) { /* ignora */ }
                    }
                
                    /* obra escolhida */
                    var obraAntiga = window.trocarObra;
                    if (typeof obraAntiga === 'function' && !obraAntiga.__v72) {
                      var novaObra = function (id) {
                        var r = obraAntiga.apply(this, arguments);
                        try { anotar({ obraId: String(id == null ? '' : id) }); } catch (e) { /* ignora */ }
                        return r;
                      };
                      novaObra.__v72 = true;
                      copiarMarcas(obraAntiga, novaObra);
                      window.trocarObra = novaObra;
                      try { trocarObra = novaObra; } catch (e) { /* ignora */ }
                    }
                  }
                
                  /* volta a tela para onde o usuario estava antes de recarregar */
                  /* a aba 'obraflow' abre uma janela em cima da tela: nunca voltamos nela */
                  function abaValida(aba) {
                    return !!aba && aba !== 'obraflow';
                  }
                
                  function voltarObra(l) {
                    if (!l.obraId) return false;
                    if (!existeObra(l.obraId)) return false;
                    var mexeu = false;
                    if (String(obraAtualId()) !== String(l.obraId) && typeof window.trocarObra === 'function') {
                      try { window.trocarObra(l.obraId); mexeu = true; } catch (e) { /* ignora */ }
                    }
                    var sel = porId('selectObra');
                    if (sel && String(sel.value) !== String(l.obraId)) {
                      try { sel.value = String(l.obraId); mexeu = true; } catch (e2) { /* ignora */ }
                    }
                    return mexeu || String(obraAtualId()) === String(l.obraId);
                  }
                
                  function voltarAba(l, forcado) {
                    if (!abaValida(l.aba) || typeof window.trocarAba !== 'function') return false;
                    if (abaVisivel() !== l.aba || forcado) {
                      try { window.trocarAba(l.aba); } catch (e) { return false; }
                    }
                    /* sub-aba de dentro da aba que voltou */
                    if (l.aba === 'liberacao' && l.subFEM && typeof window.trocarSubAbaFEM === 'function') {
                      try { window.trocarSubAbaFEM(l.subFEM); } catch (e2) { /* ignora */ }
                    }
                    if (l.aba === 'pagamento' && l.subPgto && typeof window.trocarSubTabPgtoNovo === 'function') {
                      try { window.trocarSubTabPgtoNovo(l.subPgto); } catch (e3) { /* ignora */ }
                    }
                    return true;
                  }
                
                  function voltarAoLugar(forcado) {
                    var l = forcado ? lerLugar() : (P72.alvo || {});
                    if (forcado) P72.alvo = l;
                    restaurando = true;
                    var fezAlgo = false;
                    try {
                      /* 1) obra: o banco ja guarda a obra; aqui so garantimos a tela nela */
                      if (voltarObra(l)) { fezAlgo = true; P72.__obraFeita = true; }
                      /* 2) aba e sub-aba */
                      if (voltarAba(l, forcado)) { fezAlgo = true; P72.__abaFeita = true; }
                    } catch (e) { /* ignora */ }
                    restaurando = false;
                    return fezAlgo;
                  }
                  P72.voltarAoLugar = function () { return voltarAoLugar(true); };
                
                  /* quando o usuario mexe na tela de verdade, paramos de insistir */
                  var usuarioMexeu = false;
                  function marcarMexida() { usuarioMexeu = true; }
                  try {
                    document.addEventListener('mousedown', marcarMexida, true);
                    document.addEventListener('keydown', marcarMexida, true);
                    document.addEventListener('touchstart', marcarMexida, true);
                  } catch (e) { /* ignora */ }
                
                  function noLugar(l) {
                    var abaOk = !abaValida(l.aba) || abaVisivel() === l.aba;
                    var obraOk = !l.obraId || !existeObra(l.obraId) || String(obraAtualId()) === String(l.obraId);
                    return abaOk && obraOk;
                  }
                
                  function paginaPronta() {
                    try { return document.readyState === 'complete'; } catch (e) { return true; }
                  }
                
                  /* ainda pode aparecer um "voltar para a primeira aba" depois; por isso
                     nunca damos a restauracao por encerrada antes da pagina assentar */
                  function tentarRestaurar() {
                    if (P72.__restaurado) return;
                    var l = P72.alvo || {};
                    var querAba = abaValida(l.aba);
                    var querObra = !!l.obraId;
                    if (!querAba && !querObra) {
                      P72.__restaurado = true;
                      P72.__anotando = true;
                      return;
                    }
                    if (!loginNaFrente()) { voltarAoLugar(false); }
                    vigiar();
                  }
                
                  /* a pagina volta para a primeira aba sozinha (ao abrir e depois do login);
                     por isso conferimos varias vezes se a tela ficou no lugar guardado */
                  var vigiaLigada = false;
                  function vigiar() {
                    if (vigiaLigada || P72.__restaurado) return;
                    vigiaLigada = true;
                    var vezes = 0;
                    var certas = 0;
                    var relogio = setInterval(function () {
                      vezes++;
                      var l = P72.alvo || {};
                      /* desiste depois de uns 25 segundos, ou se o usuario tomou a frente */
                      if (vezes > 85 || (usuarioMexeu && certas > 0)) { encerrar(); return; }
                      if (loginNaFrente()) { certas = 0; return; }
                      try { ligarColunas(); ligarMemoria(); } catch (e) { /* ignora */ }
                      if (noLugar(l) && paginaPronta()) {
                        certas++;
                        /* tres conferidas seguidas no lugar certo: a tela assentou */
                        if (certas >= 3) { encerrar(); }
                        return;
                      }
                      certas = 0;
                      if (usuarioMexeu) return;
                      try { voltarAoLugar(true); } catch (e2) { /* ignora */ }
                    }, 300);
                
                    function encerrar() {
                      clearInterval(relogio);
                      vigiaLigada = false;
                      P72.__restaurado = true;
                      P72.__anotando = true;
                    }
                  }
                
                  /* ================================================================== */
                  /* LIGAR TUDO                                                         */
                  /* ================================================================== */
                
                  function comecar() {
                    ligarColunas();
                    ligarResetGeral();
                    ligarMemoria();
                    tentarRestaurar();
                  }
                  P72.arrumar = comecar;
                
                  P72.esquecerLugar = function () {
                    try { localStorage.removeItem(CHAVE_LUGAR); } catch (e) { /* ignora */ }
                    P72.alvo = {};
                    P72.lugar = {};
                    return true;
                  };
                
                  P72.resetarColunas = function (chave) {
                    if (chave) return resetarTabela(chave);
                    var n = 0;
                    for (var i = 0; i < TABELAS.length; i++) {
                      try { if (resetarTabela(TABELAS[i])) n++; } catch (e) { /* ignora */ }
                    }
                    return n;
                  };
                
                  P72.situacao = function () {
                    var l = lerLugar();
                    console.log('Patch 72 ativo. Tabelas com coluna arrastavel pelo botao esquerdo: '
                      + (P72.tabelasLigadas.join(', ') || '(nenhuma na tela)'));
                    console.log('Ultimo lugar guardado -> aba: ' + (l.aba || '(nenhuma)')
                      + ' | sub-aba Liberacao: ' + (l.subFEM || '-')
                      + ' | sub-aba Pagamento: ' + (l.subPgto || '-')
                      + ' | obra: ' + (l.obraId || '-'));
                    console.log('Restauracao feita: ' + (P72.__restaurado ? 'sim' : 'ainda nao')
                      + ' | anotando trocas: ' + (P72.__anotando ? 'sim' : 'nao'));
                    return true;
                  };
                
                  function esperar(vezes) {
                    if (typeof window.trocarAba === 'function') {
                      comecar();
                      if (P72.__restaurado || vezes <= 0) return;
                    }
                    if (vezes <= 0) {
                      if (loginNaFrente()) { vigiar(); return; }
                      P72.__anotando = true;
                      return;
                    }
                    setTimeout(function () { esperar(vezes - 1); }, 300);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function () { esperar(60); });
                  } else {
                    esperar(60);
                  }
                  /* os patches antigos re-embrulham funcoes e redesenham tabelas depois de
                     alguns segundos; a nossa camada volta por cima nessas horas */
                  var HORAS = [1200, 2500, 3000, 4500];
                  for (var h = 0; h < HORAS.length; h++) {
                    (function (t) {
                      setTimeout(function () { try { comecar(); } catch (e) { /* ignora */ } }, t);
                    }(HORAS[h]));
                  }
                  /* passados uns segundos, mesmo sem nada guardado, comeca a anotar
                     (menos se a tela de login ainda estiver na frente) */
                  setTimeout(function () {
                    if (loginNaFrente()) { vigiar(); return; }
                    P72.__anotando = true;
                  }, 5000);
                })();
            
