
                /* === PATCH 62: GAVETA MAIS RAPIDA (carregamento otimizado) === */
                (function () {
                  "use strict";
                
                  var M = window.ORMENU = window.ORMENU || {};
                  if (M.__v62) { return; }
                  M.__v62 = true;
                  /* impede o Patch 61 de montar tudo de novo por conta propria */
                  M.__v61 = true;
                  if (M.__vigia && M.__vigia.disconnect) { try { M.__vigia.disconnect(); } catch (e) { } }
                  M.__vigia = true;
                
                  var ACENTO_C = '\u00c7';
                  var ACENTO_A = '\u00c3';
                  var ACENTO_O = '\u00d3';
                  var A_AGUDO = '\u00e1';
                  var A_TIL = '\u00e3';
                  var SETA = '\u2192';
                
                  var GRUPOS = [
                    { titulo: 'PRODU' + ACENTO_C + ACENTO_A + 'O',
                      abas: ['itens', 'liberacao', 'ctm', 'recebimento'] },
                    { titulo: 'PLANEJAMENTO',
                      abas: ['cronograma', 'obraflow'] },
                    { titulo: 'FINANCEIRO',
                      abas: ['medicoes', 'pagamento', 'custo'] },
                    { titulo: 'RELAT' + ACENTO_O + 'RIOS',
                      abas: ['graficos'] }
                  ];
                
                  var D = document;
                  var agora = (window.performance && window.performance.now)
                    ? function () { return window.performance.now(); }
                    : function () { return Date.now(); };
                  var t0 = agora();
                
                  var perf = M.__perf = { botaoEm: 0, gavetaEm: 0, montagens: 0, filtros: 0, escopo: 'nenhum' };
                
                  var idle = window.requestIdleCallback
                    ? function (f) { return window.requestIdleCallback(f, { timeout: 1200 }); }
                    : function (f) { return setTimeout(f, 40); };
                
                  /* ------------------------------------------------------------------ *
                   * cache: nada de varrer a pagina toda a cada abertura
                   * ------------------------------------------------------------------ */
                  var cxTabs = null;      /* caixa dos botoes antigos */
                  var sigAtual = '';      /* retrato da fileira de botoes */
                  var dadosAbas = [];     /* leitura ja pronta */
                  var nos = {};           /* aba -> botao da gaveta, reaproveitado */
                  var titulos = {};       /* titulo -> cabecalho de grupo, reaproveitado */
                  var noVazio = null;
                  var montada = false;
                  var sujo = true;
                  var gaveta = null;
                  var launcher = null;
                
                  function el(id) { return D.getElementById(id); }
                
                  function vivo(n) { return !!(n && (n.isConnected === undefined ? n.parentNode : n.isConnected)); }
                
                  function menuAntigo() { return el('meu-menu-abas'); }
                
                  function caixaBotoes() {
                    if (vivo(cxTabs)) { return cxTabs; }
                    var m = menuAntigo();
                    cxTabs = (m ? m.querySelector('.tabs') : null) || D.querySelector('.tabs');
                    return cxTabs;
                  }
                
                  function ehItemDaGaveta(b) { return b.classList.contains('or-item'); }
                
                  function botaoAtivo() {
                    var c = caixaBotoes();
                    if (!c) { return null; }
                    var lista = c.querySelectorAll('button.active');
                    for (var i = 0; i < lista.length; i++) {
                      if (!ehItemDaGaveta(lista[i])) { return lista[i]; }
                    }
                    return null;
                  }
                
                  function abaDoBotao(b) { return b ? (b.id || '').replace(/^btn-tab-/, '') : ''; }
                
                  function abaAtiva() { return abaDoBotao(botaoAtivo()); }
                
                  /* retrato barato da fileira de botoes: quantos sao e quais sao.
                     a aba acesa NAO entra aqui, senao trocar de aba mandaria remontar tudo */
                  function assinatura() {
                    var c = caixaBotoes();
                    if (!c) { return ''; }
                    var f = c.querySelectorAll('button');
                    var ids = [];
                    for (var i = 0; i < f.length; i++) {
                      if (f[i].id === 'orMenuBtn' || ehItemDaGaveta(f[i])) { continue; }
                      ids.push(f[i].id || ('?' + i));
                    }
                    return ids.join(',');
                  }
                
                  function limparTexto(b) {
                    var bruto = (b.textContent || '').replace(/\s+/g, ' ').trim();
                    var ico = '';
                    var texto = bruto;
                    var m = bruto.match(/^([^0-9A-Za-z\u00c0-\u024f]+)\s*(.*)$/);
                    if (m && m[2]) { ico = m[1].trim(); texto = m[2].trim(); }
                    return { ico: ico || '\u25cf', texto: texto };
                  }
                
                  /* le o menu antigo so quando ele realmente mudou */
                  function lerAbas(forcar) {
                    var s = assinatura();
                    if (!forcar && s === sigAtual && dadosAbas.length) { return dadosAbas; }
                    var c = caixaBotoes();
                    var saida = [];
                    if (c) {
                      var brutos = c.querySelectorAll('button');
                      for (var i = 0; i < brutos.length; i++) {
                        var b = brutos[i];
                        if (b.id === 'orMenuBtn' || ehItemDaGaveta(b)) { continue; }
                        var p = limparTexto(b);
                        if (!p.texto) { continue; }
                        var aba = abaDoBotao(b);
                        saida.push({
                          btn: b,
                          id: b.id || '',
                          aba: aba,
                          ico: p.ico,
                          texto: p.texto,
                          chave: (aba + ' ' + p.texto).toLowerCase()
                        });
                      }
                    }
                    sigAtual = s;
                    dadosAbas = saida;
                    return saida;
                  }
                
                  function tituloAtual() {
                    var b = botaoAtivo();
                    if (b) { return limparTexto(b).texto; }
                    var l = lerAbas(false);
                    return l.length ? l[0].texto : '';
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 1) botao "Menu": entra na hora, sem esperar o resto da pagina
                   * ------------------------------------------------------------------ */
                  function garantirLauncher() {
                    var antigo = menuAntigo();
                    if (!antigo || !antigo.parentNode) { return null; }
                    var b = el('orMenuBtn');
                    if (!b) {
                      b = D.createElement('button');
                      b.id = 'orMenuBtn';
                      b.type = 'button';
                      b.className = 'or-launcher';
                      b.setAttribute('aria-haspopup', 'true');
                      b.setAttribute('aria-expanded', 'false');
                      b.setAttribute('aria-controls', 'orMenu');
                      b.innerHTML = '<span class="or-burg" aria-hidden="true"><i></i><i></i><i></i></span>' +
                                    '<span class="or-rot">Menu</span>' +
                                    '<span class="or-atual" id="orAtual"></span>';
                      b.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        M.abrir();
                      });
                      /* a gaveta pesada so e montada quando ela chega perto de ser usada */
                      b.addEventListener('mouseenter', prepararGaveta);
                      b.addEventListener('focus', prepararGaveta);
                      if (!perf.botaoEm) { perf.botaoEm = agora() - t0; }
                    }
                    if (b.previousElementSibling !== antigo && b.nextElementSibling !== antigo) {
                      antigo.parentNode.insertBefore(b, antigo);
                    }
                    launcher = b;
                    return b;
                  }
                
                  /* esconde o menu antigo numa unica escrita de estilo (antes eram 15) */
                  function esconderAntigo() {
                    var a = menuAntigo();
                    if (!a) { return; }
                    if (!a.classList.contains('or-oculto')) { a.classList.add('or-oculto'); }
                    if (a.hasAttribute('open')) { a.removeAttribute('open'); }
                    if (a.getAttribute('aria-hidden') !== 'true') { a.setAttribute('aria-hidden', 'true'); }
                    if (a.getAttribute('data-or-oculto') === '1') { return; }
                    var forca = 'position:absolute !important;left:-9999px !important;top:auto !important;' +
                                'width:1px !important;height:1px !important;min-height:0 !important;' +
                                'margin:0 !important;padding:0 !important;overflow:hidden !important;' +
                                'opacity:0 !important;pointer-events:none !important;visibility:hidden !important;' +
                                'z-index:-1 !important;box-shadow:none !important;border:0 !important;';
                    try {
                      var antes = a.style.cssText || '';
                      if (antes && antes.charAt(antes.length - 1) !== ';') { antes += ';'; }
                      a.style.cssText = antes + forca;
                      a.setAttribute('data-or-oculto', '1');
                    } catch (e) { }
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 2) gaveta montada uma unica vez e reaproveitada
                   * ------------------------------------------------------------------ */
                  function criarGaveta() {
                    var g = el('orMenu');
                    if (g) {
                      gaveta = g;
                      return g;
                    }
                    g = D.createElement('div');
                    g.id = 'orMenu';
                    g.setAttribute('role', 'dialog');
                    g.setAttribute('aria-modal', 'true');
                    g.setAttribute('aria-label', 'Menu de navegação');
                    g.setAttribute('aria-hidden', 'true');
                    g.innerHTML =
                      '<div class="or-fundo" id="orFundo"></div>' +
                      '<div class="or-painel">' +
                        '<div class="or-topo">' +
                          '<span class="or-logo" aria-hidden="true">PS</span>' +
                          '<span class="or-nomes"><b>Painel Servidor</b><span>Navegação Rápida</span></span>' +
                          '<button type="button" class="or-x" id="orFechar" title="Fechar" aria-label="Fechar menu">\u00d7</button>' +
                        '</div>' +
                        '<div class="or-buscabox">' +
                          '<input type="text" class="or-busca" id="orBusca" placeholder="Buscar aba..." autocomplete="off">' +
                        '</div>' +
                        '<div class="or-lista" id="orLista"></div>' +
                      '</div>';
                    D.body.appendChild(g);
                
                    g.addEventListener('click', function (ev) {
                      if (ev.target === g || ev.target.id === 'orFundo') { M.fechar(); }
                    });
                    var x = g.querySelector('#orFechar');
                    if (x) { x.addEventListener('click', function () { M.fechar(); }); }
                    var busca = g.querySelector('#orBusca');
                    if (busca) {
                      busca.addEventListener('input', function () { filtrar(busca.value); });
                      busca.addEventListener('keydown', function (ev) {
                        if (ev.key !== 'Enter') { return; }
                        var alvo = g.querySelector('.or-item:not(.or-esconde)');
                        if (alvo) { alvo.click(); }
                      });
                    }
                    gaveta = g;
                    return g;
                  }
                
                  function caixaLista() { return el('orLista'); }
                
                  function noTitulo(txt) {
                    var n = titulos[txt];
                    if (!n) {
                      n = D.createElement('div');
                      n.className = 'or-grupo';
                      n.textContent = txt;
                      titulos[txt] = n;
                    }
                    return n;
                  }
                
                  function noAviso() {
                    if (!noVazio) {
                      noVazio = D.createElement('div');
                      noVazio.className = 'or-vazio or-esconde';
                      noVazio.textContent = 'Nenhuma aba com esse nome.';
                    }
                    return noVazio;
                  }
                
                  function noItem(dados) {
                    var b = nos[dados.aba];
                    if (b) {
                      var t = b.querySelector('.or-txt');
                      if (t && t.textContent !== dados.texto) { t.textContent = dados.texto; }
                      var i = b.querySelector('.or-ico');
                      if (i && i.textContent !== dados.ico) { i.textContent = dados.ico; }
                      b.setAttribute('data-chave', dados.chave);
                      return b;
                    }
                    b = D.createElement('button');
                    b.type = 'button';
                    b.className = 'or-item';
                    b.setAttribute('data-aba', dados.aba);
                    b.setAttribute('data-chave', dados.chave);
                    var ico = D.createElement('span');
                    ico.className = 'or-ico';
                    ico.setAttribute('aria-hidden', 'true');
                    ico.textContent = dados.ico;
                    var txt = D.createElement('span');
                    txt.className = 'or-txt';
                    txt.textContent = dados.texto;
                    b.appendChild(ico);
                    b.appendChild(txt);
                    var aba = dados.aba;
                    b.addEventListener('click', function () {
                      M.fechar();
                      var alvo = (aba ? el('btn-tab-' + aba) : null);
                      if (!alvo) {
                        var l = lerAbas(false);
                        for (var k = 0; k < l.length; k++) { if (l[k].aba === aba) { alvo = l[k].btn; break; } }
                      }
                      if (alvo) { try { alvo.click(); } catch (e) { } }
                      atualizarRotulo();
                    });
                    nos[dados.aba] = b;
                    return b;
                  }
                
                  /* monta a lista de uma vez so, reaproveitando os botoes ja criados */
                  function montarLista() {
                    var caixa = caixaLista();
                    if (!caixa) { return; }
                    var dados = lerAbas(true);
                    var porAba = {};
                    var i, j;
                    for (i = 0; i < dados.length; i++) { if (dados[i].aba) { porAba[dados[i].aba] = dados[i]; } }
                    var usados = {};
                    var blocos = [];
                    for (i = 0; i < GRUPOS.length; i++) {
                      var itens = [];
                      for (j = 0; j < GRUPOS[i].abas.length; j++) {
                        var it = porAba[GRUPOS[i].abas[j]];
                        if (!it) { continue; }
                        usados[it.aba] = 1;
                        itens.push(it);
                      }
                      if (itens.length) { blocos.push({ titulo: GRUPOS[i].titulo, itens: itens }); }
                    }
                    var sobra = [];
                    for (i = 0; i < dados.length; i++) { if (!usados[dados[i].aba]) { sobra.push(dados[i]); } }
                    if (sobra.length) { blocos.push({ titulo: 'OUTROS', itens: sobra }); }
                
                    var frag = D.createDocumentFragment();
                    for (i = 0; i < blocos.length; i++) {
                      frag.appendChild(noTitulo(blocos[i].titulo));
                      for (j = 0; j < blocos[i].itens.length; j++) { frag.appendChild(noItem(blocos[i].itens[j])); }
                    }
                    frag.appendChild(noAviso());
                    caixa.textContent = '';
                    caixa.appendChild(frag);
                    montada = true;
                    sujo = false;
                    perf.montagens++;
                    if (!perf.gavetaEm) { perf.gavetaEm = agora() - t0; }
                  }
                
                  function mostrar(n, ok) {
                    if (!n) { return; }
                    var escondido = n.classList.contains('or-esconde');
                    if (ok === escondido) {
                      if (ok) { n.classList.remove('or-esconde'); } else { n.classList.add('or-esconde'); }
                    }
                  }
                
                  /* busca so liga e desliga o que ja esta na tela, sem refazer a lista */
                  function filtrar(txt) {
                    var caixa = caixaLista();
                    if (!caixa) { return; }
                    var busca = (txt || '').toLowerCase().trim();
                    var f = caixa.children;
                    var grupo = null;
                    var vistos = 0;
                    var achou = 0;
                    for (var i = 0; i < f.length; i++) {
                      var n = f[i];
                      var cls = n.className || '';
                      if (cls.indexOf('or-grupo') >= 0) {
                        if (grupo) { mostrar(grupo, vistos > 0); }
                        grupo = n;
                        vistos = 0;
                        continue;
                      }
                      if (cls.indexOf('or-vazio') >= 0) { continue; }
                      var ok = !busca || (n.getAttribute('data-chave') || '').indexOf(busca) >= 0;
                      mostrar(n, ok);
                      if (ok) { achou++; vistos++; }
                    }
                    if (grupo) { mostrar(grupo, vistos > 0); }
                    mostrar(noAviso(), achou === 0);
                    perf.filtros++;
                  }
                
                  function marcarAtivo() {
                    var caixa = caixaLista();
                    if (!caixa) { return; }
                    var aba = abaAtiva();
                    var itens = caixa.querySelectorAll('.or-item');
                    for (var i = 0; i < itens.length; i++) {
                      var on = itens[i].getAttribute('data-aba') === aba;
                      if (on === itens[i].classList.contains('or-ativo')) { continue; }
                      if (on) {
                        itens[i].classList.add('or-ativo');
                        itens[i].setAttribute('aria-current', 'true');
                      } else {
                        itens[i].classList.remove('or-ativo');
                        itens[i].removeAttribute('aria-current');
                      }
                    }
                  }
                
                  function atualizarRotulo() {
                    var r = el('orAtual');
                    if (!r) { return; }
                    var t = tituloAtual();
                    if (r.textContent !== t) { r.textContent = t; }
                  }
                
                  function valorBusca() {
                    var b = el('orBusca');
                    return b ? b.value : '';
                  }
                
                  /* deixa a gaveta pronta em segundo plano, sem travar o carregamento */
                  function prepararGaveta() {
                    if (!D.body) { return null; }
                    var g = criarGaveta();
                    /* conferencia barata: se alguma aba mudou desde a ultima leitura, remonta */
                    if (montada && !sujo && assinatura() !== sigAtual) { sujo = true; }
                    if (!montada || sujo) { montarLista(); marcarAtivo(); filtrar(valorBusca()); }
                    return g;
                  }
                  M.preparar = prepararGaveta;
                
                  /* ------------------------------------------------------------------ *
                   * 3) abrir / fechar
                   * ------------------------------------------------------------------ */
                  M.abrir = function () {
                    var g = prepararGaveta();
                    if (!g) { return; }
                    if (D.body.lastElementChild !== g) { D.body.appendChild(g); }
                    var b = el('orBusca');
                    if (b && b.value !== '') { b.value = ''; }
                    marcarAtivo();
                    filtrar('');
                    g.classList.add('or-on');
                    g.setAttribute('aria-hidden', 'false');
                    D.body.classList.add('or-aberto');
                    if (launcher || el('orMenuBtn')) { (launcher || el('orMenuBtn')).setAttribute('aria-expanded', 'true'); }
                    var menu = menuAntigo();
                    if (menu && menu.hasAttribute('open')) { menu.removeAttribute('open'); }
                    if (b && b.focus) { try { b.focus(); } catch (e) { } }
                  };
                
                  M.fechar = function () {
                    var g = el('orMenu');
                    if (g) {
                      g.classList.remove('or-on');
                      g.setAttribute('aria-hidden', 'true');
                    }
                    D.body.classList.remove('or-aberto');
                    var lb = el('orMenuBtn');
                    if (lb) { lb.setAttribute('aria-expanded', 'false'); }
                  };
                
                  M.aberto = function () {
                    var g = el('orMenu');
                    return !!(g && g.classList.contains('or-on'));
                  };
                
                  M.alternar = function () {
                    if (M.aberto()) { M.fechar(); } else { M.abrir(); }
                  };
                
                  /* ------------------------------------------------------------------ *
                   * 4) conferencia leve (antes: varredura da pagina inteira)
                   * ------------------------------------------------------------------ */
                  function conferir(comGaveta) {
                    if (M.__mexendo) { return; }
                    M.__mexendo = true;
                    try {
                      garantirLauncher();
                      esconderAntigo();
                      if (assinatura() !== sigAtual) { sujo = true; }
                      if (comGaveta) { prepararGaveta(); }
                      else if (montada && sujo && M.aberto()) { montarLista(); marcarAtivo(); filtrar(valorBusca()); }
                      atualizarRotulo();
                      var g = el('orMenu');
                      if (g && !g.classList.contains('or-on')) {
                        if (g.getAttribute('aria-hidden') !== 'true') { g.setAttribute('aria-hidden', 'true'); }
                        D.body.classList.remove('or-aberto');
                      }
                    } finally {
                      M.__mexendo = false;
                    }
                  }
                
                  M.arrumar = function () { conferir(true); };
                
                  function ligarTeclado() {
                    if (M.__teclado) { return; }
                    M.__teclado = true;
                    D.addEventListener('keydown', function (ev) {
                      if (ev.key === 'Escape' && M.aberto()) {
                        M.fechar();
                        return;
                      }
                      var comAtalho = (ev.ctrlKey || ev.metaKey) && !ev.altKey;
                      if (comAtalho && (ev.key === 'k' || ev.key === 'K')) {
                        ev.preventDefault();
                        M.alternar();
                      }
                    });
                  }
                
                  function ligarVigias() {
                    if (M.__v62vigia || typeof MutationObserver !== 'function') { return; }
                    var agendado = false;
                    function agenda() {
                      if (agendado || M.__mexendo) { return; }
                      agendado = true;
                      idle(function () {
                        agendado = false;
                        conferir(false);
                      });
                    }
                    var antigo = menuAntigo();
                    if (antigo) {
                      var o1 = new MutationObserver(agenda);
                      o1.observe(antigo, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
                      M.__v62vigia = o1;
                      M.__vigia = o1;
                      perf.escopo = 'menu-antigo';
                    }
                    if (D.body) {
                      var o2 = new MutationObserver(function (recs) {
                        for (var i = 0; i < recs.length; i++) {
                          if (recs[i].removedNodes && recs[i].removedNodes.length) { agenda(); return; }
                        }
                      });
                      o2.observe(D.body, { childList: true });
                      M.__v62corpo = o2;
                    }
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 5) partida: botao primeiro, gaveta depois
                   * ------------------------------------------------------------------ */
                  function partirAgora() {
                    if (!D.body) { return; }
                    conferir(false);
                    ligarTeclado();
                    ligarVigias();
                    M.__pronto = true;
                  }
                
                  function prepararDepois() {
                    idle(function () {
                      conferir(true);
                      if (window.console && console.log) {
                        console.log('PATCH 62 ativo: bot' + A_TIL + 'o do menu em ' +
                                    Math.round(perf.botaoEm) + ' ms, gaveta pr' + A_AGUDO + '-montada em ' +
                                    Math.round(perf.gavetaEm) + ' ms.');
                      }
                    });
                  }
                
                  if (D.body) { partirAgora(); }
                  else { D.addEventListener('DOMContentLoaded', partirAgora); }
                
                  D.addEventListener('DOMContentLoaded', function () { conferir(false); });
                
                  if (D.readyState === 'complete') { prepararDepois(); }
                  else { window.addEventListener('load', prepararDepois); }
                
                }());
            
