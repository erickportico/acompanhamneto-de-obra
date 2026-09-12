
                /* === PATCH 63: PREVIEW EDITAVEL, RESUMO NOS LANCAMENTOS E IMPRESSAO === */
                (function () {
                  if (window.P63 && window.P63.__v63) return;
                  var P63 = (window.P63 = { __v63: true });
                
                  /* ------------------------------------------------------------------ */
                  /* ajudantes                                                          */
                  /* ------------------------------------------------------------------ */
                  function porId(id) { return document.getElementById(id); }
                
                  function deEntidades(txt) {
                    var d = document.createElement('div');
                    d.innerHTML = String(txt == null ? '' : txt);
                    return d.textContent || '';
                  }
                
                  function seguro(txt) {
                    return String(txt == null ? '' : txt)
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;');
                  }
                
                  function dinheiro(v) {
                    var n = Number(v) || 0;
                    try {
                      return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    } catch (e) {
                      return 'R$ ' + n.toFixed(2);
                    }
                  }
                
                  function numeroLimpo(v) {
                    return String(v == null ? '' : v).replace(',', '.').trim();
                  }
                
                  function depois(fn, ms) {
                    try { window.setTimeout(fn, ms || 0); } catch (e) { /* ignora */ }
                  }
                
                  /* =================================================================== */
                  /* PARTE 1 - PREVIEW DA ESQUADRIA: CENTRALIZADO E EDITAVEL             */
                  /* =================================================================== */
                  var CAMPOS = [
                    ['ref', 'Refer&ecirc;ncia', 'texto'],
                    ['tipo', 'Tipo / Tipologia', 'texto'],
                    ['larg', 'Largura (m)', 'dec'],
                    ['alt', 'Altura (m)', 'dec'],
                    ['qtd', 'Quantidade', 'int'],
                    ['cor', 'Cor', 'texto'],
                    ['loc', 'Local', 'texto'],
                    ['vidro', 'Vidro', 'texto']
                  ];
                
                  var itemAberto = null;
                
                  function modalPreview() { return porId('modalPreviewEsquadria'); }
                
                  function previewAberto() {
                    var m = modalPreview();
                    return !!(m && m.className.indexOf('p63-on') >= 0);
                  }
                
                  function fecharPreview() {
                    var m = modalPreview();
                    if (m) {
                      m.classList.remove('p63-on');
                      m.style.display = 'none';
                    }
                    itemAberto = null;
                  }
                  P63.fecharPreview = fecharPreview;
                
                  function formularioPreview(item) {
                    var larg = Number(item.larg) || 0;
                    var alt = Number(item.alt) || 0;
                    var qtd = Number(item.qtd) || 0;
                    var area = larg * alt;
                
                    var html = '<div class="p63-form-grade">';
                    for (var i = 0; i < CAMPOS.length; i++) {
                      var campo = CAMPOS[i][0];
                      var rotulo = CAMPOS[i][1];
                      var tipo = CAMPOS[i][2];
                      var valor = item[campo];
                      var attr = 'type="text"';
                      if (tipo === 'dec') {
                        attr = 'type="number" step="0.001" min="0"';
                        valor = (Number(valor) || 0).toFixed(3);
                      } else if (tipo === 'int') {
                        attr = 'type="number" step="1" min="0"';
                        valor = String(Number(valor) || 0);
                      } else {
                        valor = valor == null ? '' : valor;
                      }
                      html += '<label class="p63-form-rot">' + rotulo + '</label>';
                      html += '<input class="p63-form-campo" data-p63campo="' + campo + '" ' + attr +
                              ' value="' + seguro(valor) + '">';
                    }
                    html += '</div>';
                
                    html += '<div class="p63-form-calc">' +
                            '<span>&Aacute;rea unit&aacute;ria: <b>' + area.toFixed(3) + ' m&sup2;</b></span>' +
                            '<span>&Aacute;rea total: <b>' + (area * qtd).toFixed(3) + ' m&sup2;</b></span>' +
                            '<span>Medidas: <b>' + Math.round(larg * 1000) + ' x ' + Math.round(alt * 1000) +
                            ' mm</b></span>' +
                            '</div>';
                    html += '<div class="p63-form-dica">Altere qualquer campo acima: o desenho e as tabelas ' +
                            'sao atualizados na hora.</div>';
                
                    var caixa = document.createElement('div');
                    caixa.className = 'p63-form';
                    caixa.innerHTML = html;
                
                    var entradas = caixa.querySelectorAll('.p63-form-campo');
                    for (var k = 0; k < entradas.length; k++) {
                      entradas[k].addEventListener('change', function () {
                        aplicarEdicao(item, this.getAttribute('data-p63campo'), this.value);
                      });
                      entradas[k].addEventListener('keydown', function (ev) {
                        if (ev.key === 'Enter') { ev.preventDefault(); this.blur(); }
                      });
                    }
                    return caixa;
                  }
                
                  function aplicarEdicao(item, campo, valor) {
                    if (!campo) return;
                    var numerico = (campo === 'larg' || campo === 'alt' || campo === 'qtd');
                    var v = numerico ? numeroLimpo(valor) : valor;
                    try {
                      if (typeof window.editarItem === 'function') {
                        window.editarItem(item.id, campo, v);
                      } else {
                        item[campo] = numerico ? (Number(v) || 0) : v;
                        if (typeof window.salvarDB === 'function') window.salvarDB(false);
                      }
                    } catch (e) { /* ignora */ }
                
                    depois(function () {
                      try { if (typeof window.render === 'function') window.render(); } catch (e) { /* ignora */ }
                      try {
                        if (previewAberto() && typeof window.abrirPreviewEsquadria === 'function') {
                          window.abrirPreviewEsquadria(item);
                        }
                      } catch (e) { /* ignora */ }
                    }, 30);
                  }
                
                  function decorarPreview(item) {
                    var m = modalPreview();
                    if (!m) return;
                    itemAberto = item;
                
                    m.classList.add('p63-on');
                    m.style.display = 'flex';
                
                    if (!m.getAttribute('data-p63lig')) {
                      m.setAttribute('data-p63lig', '1');
                      m.addEventListener('click', function (ev) {
                        if (ev.target === m) fecharTudo();
                      });
                    }
                
                    var caixa = m.querySelector('.modal');
                    if (caixa) caixa.classList.add('p63-modal-caixa');
                
                    var titulo = m.querySelector('h3');
                    if (titulo) titulo.innerHTML = 'Esquadria - visualizar e editar';
                
                    var conteudo = porId('previewEsquadriaContent');
                    if (!conteudo) return;
                
                    var antigo = conteudo.querySelector('div');
                    var form = formularioPreview(item);
                    if (antigo) conteudo.replaceChild(form, antigo);
                    else conteudo.insertBefore(form, conteudo.firstChild);
                
                    var etiquetas = conteudo.querySelectorAll('div');
                    for (var i = 0; i < etiquetas.length; i++) {
                      var alvo = etiquetas[i];
                      if (alvo === form || form.contains(alvo)) continue;
                      if (/mm\s*$/.test((alvo.textContent || '').trim())) alvo.style.display = 'none';
                    }
                  }
                
                  function fecharTudo() {
                    try {
                      if (typeof P63.__fecharModaisOriginal === 'function') P63.__fecharModaisOriginal();
                      else if (typeof window.fecharModais === 'function') window.fecharModais();
                    } catch (e) { /* ignora */ }
                    fecharPreview();
                  }
                
                  function ligarPreview() {
                    var abrirOriginal = window.abrirPreviewEsquadria;
                    if (typeof abrirOriginal === 'function' && !abrirOriginal.__p63) {
                      var novoAbrir = function (item) {
                        var r;
                        try {
                          r = abrirOriginal.apply(this, arguments);
                        } catch (e) { /* segue mesmo se o desenho falhar */ }
                        try { decorarPreview(item); } catch (e2) { /* ignora */ }
                        return r;
                      };
                      novoAbrir.__p63 = true;
                      window.abrirPreviewEsquadria = novoAbrir;
                    }
                
                    var fecharOriginal = window.fecharModais;
                    if (typeof fecharOriginal === 'function' && !fecharOriginal.__p63) {
                      P63.__fecharModaisOriginal = fecharOriginal;
                      var novoFechar = function () {
                        var r = fecharOriginal.apply(this, arguments);
                        try { fecharPreview(); } catch (e) { /* ignora */ }
                        return r;
                      };
                      novoFechar.__p63 = true;
                      window.fecharModais = novoFechar;
                    }
                
                    if (!P63.__esc) {
                      P63.__esc = true;
                      document.addEventListener('keydown', function (ev) {
                        if (ev.key === 'Escape' && previewAberto()) fecharTudo();
                      });
                    }
                  }
                
                  /* =================================================================== */
                  /* PARTE 2 - RESUMO DE PAGAMENTO NO FIM DOS LANCAMENTOS                */
                  /* =================================================================== */
                  var ocupado = false;
                
                  function garantirBloco() {
                    var painel = porId('panelPgtoLancamentos');
                    if (!painel) return null;
                    /* PATCH119: usa o quadro que o patch 71 ja criou */
                    var bloco = porId('p63BlocoResumo') || porId('p71BlocoResumo');
                    if (!bloco) {
                      bloco = document.createElement('div');
                      bloco.id = 'p63BlocoResumo';
                      bloco.className = 'p63-resumo-bloco';
                      bloco.innerHTML =
                        '<h3 class="p63-resumo-titulo">Resumo de Pagamento do M&ecirc;s</h3>' +
                        '<div class="p63-resumo-flex">' +
                        '<div class="p63-resumo-tabela" id="p63ResumoTabela"></div>' +
                        '<div class="totais-panel p63-totais">' +
                        '<h3>Totais Gerais do M&ecirc;s</h3>' +
                        '<div id="p63ResumoTotais"></div>' +
                        '</div></div>';
                      painel.appendChild(bloco);
                    } else if (bloco.parentNode !== painel) {
                      painel.appendChild(bloco);
                    } else if (bloco.nextSibling) {
                      painel.appendChild(bloco);
                    }
                    return bloco;
                  }
                
                  function marcarValores(bloco) {
                    var entradas = bloco.querySelectorAll('input');
                    for (var i = 0; i < entradas.length; i++) {
                      var ent = entradas[i];
                      if (ent.getAttribute('data-p63eco')) continue;
                      ent.setAttribute('data-p63eco', '1');
                      var eco = document.createElement('span');
                      eco.className = 'p63-eco-papel';
                      eco.textContent = dinheiro(ent.value);
                      if (ent.parentNode) ent.parentNode.appendChild(eco);
                    }
                  }
                
                  function preencherBloco() {
                    if (ocupado) return;
                    var bloco = garantirBloco();
                    if (!bloco) return;
                    ocupado = true;
                    try {
                      try {
                        if (typeof window.renderResumoPgto === 'function') window.renderResumoPgto();
                      } catch (e) { /* ignora */ }
                      var origem = porId('containerResumoPgto');
                      var origemTot = porId('containerTotaisPgto');
                      var destino = porId('p63ResumoTabela');
                      var destinoTot = porId('p63ResumoTotais');
                      if (destino) destino.innerHTML = origem ? origem.innerHTML : '';
                      if (destinoTot) destinoTot.innerHTML = origemTot ? origemTot.innerHTML : '';
                      marcarValores(bloco);
                    } finally {
                      ocupado = false;
                    }
                  }
                  P63.atualizarResumo = preencherBloco;
                
                  function ligarResumo() {
                    var original = window.renderLancamentosPgto;
                    if (typeof original !== 'function' || original.__p63) return;
                    var novo = function () {
                      var r = original.apply(this, arguments);
                      try { preencherBloco(); } catch (e) { /* ignora */ }
                      return r;
                    };
                    novo.__p63 = true;
                    window.renderLancamentosPgto = novo;
                  }
                
                  /* =================================================================== */
                  /* PARTE 3 - IMPRIMIR TODAS AS ABAS, SEM BOTOES E COM AS CORES         */
                  /* =================================================================== */
                  var ABAS = [
                    ['itens', 'Itens'],
                    ['liberacao', 'Libera&ccedil;&atilde;o'],
                    ['medicoes', 'Medi&ccedil;&otilde;es'],
                    ['graficos', 'Gr&aacute;ficos'],
                    ['recebimento', 'Recebimento'],
                    ['cronograma', 'Cronograma'],
                    ['pagamento', 'Pagamento'],
                    ['ctm', 'CTM'],
                    ['custo', 'Custo']
                  ];
                
                  var LIMITE_CORES = 9000;
                  var pintados = [];
                  var restaurar = [];
                  var titulos = [];
                
                  function corVale(c) {
                    if (!c) return false;
                    if (c === 'transparent') return false;
                    if (c.indexOf('rgba(0, 0, 0, 0)') >= 0) return false;
                    return true;
                  }
                
                  function fixarCores() {
                    var lista = document.querySelectorAll('[id^="tab-"], [id^="tab-"] *');
                    var total = Math.min(lista.length, LIMITE_CORES);
                    for (var i = 0; i < total; i++) {
                      var el = lista[i];
                      if (!el || !el.style) continue;
                      var nome = el.tagName;
                      if (nome === 'SCRIPT' || nome === 'STYLE' || nome === 'CANVAS') continue;
                      var cs;
                      try { cs = window.getComputedStyle(el); } catch (e) { continue; }
                      if (!cs || cs.display === 'none') continue;
                      var fundo = cs.backgroundColor;
                      var texto = cs.color;
                      var borda = cs.borderTopColor;
                      var temBorda = (corVale(borda) && cs.borderTopWidth !== '0px');
                      if (!corVale(fundo) && !corVale(texto) && !temBorda) continue;
                
                      /* guarda o estilo inline exatamente como estava, para devolver depois */
                      pintados.push([el, el.getAttribute('style')]);
                      if (corVale(fundo)) el.style.setProperty('background-color', fundo, 'important');
                      if (corVale(texto)) el.style.setProperty('color', texto, 'important');
                      if (temBorda) el.style.setProperty('border-color', borda, 'important');
                    }
                  }
                
                  function soltarCores() {
                    for (var i = 0; i < pintados.length; i++) {
                      var el = pintados[i][0];
                      var antes = pintados[i][1];
                      if (!el || !el.style) continue;
                      if (antes === null) el.removeAttribute('style');
                      else el.setAttribute('style', antes);
                    }
                    pintados = [];
                  }
                
                  function abrirTodasAsAbas() {
                    var primeira = true;
                    for (var i = 0; i < ABAS.length; i++) {
                      var el = porId('tab-' + ABAS[i][0]);
                      if (!el) continue;
                      restaurar.push([el, el.getAttribute('style') || '']);
                      el.style.setProperty('display', 'block', 'important');
                      el.classList.add('p63-pane-print');
                      if (!primeira) el.classList.add('p63-quebra');
                      primeira = false;
                
                      var t = document.createElement('div');
                      t.className = 'p63-titulo-aba';
                      t.innerHTML = deEntidades(ABAS[i][1]);
                      el.insertBefore(t, el.firstChild);
                      titulos.push(t);
                    }
                  }
                
                  function fecharTodasAsAbas() {
                    for (var i = 0; i < restaurar.length; i++) {
                      var el = restaurar[i][0];
                      var antes = restaurar[i][1];
                      el.classList.remove('p63-pane-print');
                      el.classList.remove('p63-quebra');
                      if (antes) el.setAttribute('style', antes);
                      else el.removeAttribute('style');
                    }
                    restaurar = [];
                    for (var k = 0; k < titulos.length; k++) {
                      if (titulos[k] && titulos[k].parentNode) titulos[k].parentNode.removeChild(titulos[k]);
                    }
                    titulos = [];
                  }
                
                  function imprimirTudo() {
                    try { fecharPreview(); } catch (e) { /* ignora */ }
                    try {
                      if (window.ORMENU && typeof window.ORMENU.fechar === 'function') window.ORMENU.fechar();
                      if (typeof window.p37FecharMenuAbas === 'function') window.p37FecharMenuAbas();
                      var antigo = porId('meu-menu-abas');
                      if (antigo) antigo.removeAttribute('open');
                    } catch (e) { /* ignora */ }
                
                    document.body.classList.add('print-active');
                    document.body.classList.add('p63-print-all');
                    var paineis = document.querySelectorAll('.tab-pane, [id^="tab-"]');
                    for (var i = 0; i < paineis.length; i++) paineis[i].classList.add('print-active');
                
                    abrirTodasAsAbas();
                    try { preencherBloco(); } catch (e) { /* ignora */ }
                    fixarCores();
                
                    try {
                      window.print();
                    } finally {
                      soltarCores();
                      fecharTodasAsAbas();
                      document.body.classList.remove('p63-print-all');
                      document.body.classList.remove('print-active');
                      for (var k = 0; k < paineis.length; k++) paineis[k].classList.remove('print-active');
                    }
                  }
                  P63.imprimirTudo = imprimirTudo;
                
                  function ligarImpressao() {
                    var original = window.imprimirPagina;
                    if (typeof original === 'function' && !original.__p63) {
                      P63.__imprimirOriginal = original;
                    }
                    if (window.imprimirPagina && window.imprimirPagina.__p63) return;
                    var novo = function () { return imprimirTudo(); };
                    novo.__p63 = true;
                    window.imprimirPagina = novo;
                  }
                
                  /* =================================================================== */
                  /* PARTIDA                                                             */
                  /* =================================================================== */
                  function iniciar() {
                    ligarPreview();
                    ligarResumo();
                    ligarImpressao();
                    try {
                      if (porId('panelPgtoLancamentos') && typeof window.getChaveMesPgto === 'function') {
                        garantirBloco();
                      }
                    } catch (e) { /* ignora */ }
                    P63.__pronto = true;
                  }
                
                  function partir() {
                    try { iniciar(); } catch (e) { /* ignora */ }
                    depois(function () { try { iniciar(); } catch (e) { /* ignora */ } }, 800);
                    depois(function () {
                      try {
                        iniciar();
                        if (porId('panelPgtoLancamentos')) preencherBloco();
                      } catch (e) { /* ignora */ }
                    }, 2500);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', partir);
                  } else {
                    partir();
                  }
                })();
            
