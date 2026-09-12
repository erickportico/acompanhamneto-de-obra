
                /* PATCH 71: PAGAMENTO EDITAVEL NOS DOIS LADOS E IMPRESSAO POR SECAO */
                (function () {
                  if (window.P71 && window.P71.__v71) return;
                  var P71 = window.P71 = window.P71 || {};
                  P71.__v71 = true;
                  P71.ultimaSecao = '';
                
                  var MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                
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
                
                  function listaObras() {
                    try { if (window.db && ehLista(window.db.obras)) return window.db.obras; } catch (e) { /* ignora */ }
                    try {
                      /* eslint-disable no-undef */
                      if (typeof db !== 'undefined' && db && ehLista(db.obras)) return db.obras;
                    } catch (e2) { /* ignora */ }
                    return [];
                  }
                
                  function chaveMes() {
                    try {
                      if (typeof window.getChaveMesPgto === 'function') return window.getChaveMesPgto();
                    } catch (e) { /* ignora */ }
                    return '';
                  }
                
                  function mesEscrito() {
                    var m = /^(\d{4})-(\d{1,2})$/.exec(String(chaveMes() || ''));
                    if (m) {
                      var i = parseInt(m[2], 10) - 1;
                      if (i >= 0 && i < 12) return MESES[i] + '/' + m[1];
                    }
                    var rot = porId('pgtoMesAnoLabel');
                    return rot ? (rot.textContent || '') : '';
                  }
                
                  function numeroDoMes(ch) {
                    var m = /^(\d{4})-(\d{1,2})$/.exec(String(ch || ''));
                    if (!m) return null;
                    return parseInt(m[1], 10) * 12 + (parseInt(m[2], 10) - 1);
                  }
                
                  /* valor guardado do colaborador no mes: o maior entre as obras
                     (o Patch 70 mantem o numero em um lugar so, entao o maior e
                     exatamente o que foi digitado - nunca a soma) */
                  function fichaColab(obra, colabId) {
                    var lista = (obra && obra.colaboradoresPgto) || [];
                    for (var i = 0; i < lista.length; i++) {
                      if (lista[i] && String(lista[i].id) === String(colabId)) return lista[i];
                    }
                    return null;
                  }
                
                  function valorGuardado(colabId) {
                    var mes = chaveMes();
                    var obras = listaObras();
                    var achou = false, maior = 0;
                    for (var i = 0; i < obras.length; i++) {
                      var f = fichaColab(obras[i], colabId);
                      if (!f || !f.valorPagoManual) continue;
                      if (!(mes in f.valorPagoManual)) continue;
                      var n = paraNumero(f.valorPagoManual[mes]);
                      if (!achou || n > maior) { maior = n; achou = true; }
                    }
                    return achou ? maior : 0;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 1) TITULO E MES DO MOMENTO NAS DUAS SUB-ABAS                       */
                  /* ------------------------------------------------------------------ */
                  function garantirTitulo(painelId, tituloId, texto) {
                    var painel = porId(painelId);
                    if (!painel) return null;
                    var t = porId(tituloId);
                    if (!t) {
                      t = document.createElement('div');
                      t.id = tituloId;
                      t.className = 'p71-titulo';
                    }
                    if (t.parentNode !== painel || painel.firstElementChild !== t) {
                      painel.insertBefore(t, painel.firstChild);
                    }
                    if (t.textContent !== texto) t.textContent = texto;
                    return t;
                  }
                
                  function atualizarTitulos() {
                    var mes = mesEscrito();
                    garantirTitulo('panelPgtoLancamentos', 'p71TituloLancamentos',
                      'Lan\u00e7amentos de Pagamento \u2014 ' + mes);
                    garantirTitulo('panelPgtoResumo', 'p71TituloResumo',
                      'Resumo de Pagamento do M\u00eas \u2014 ' + mes);
                  }
                  P71.titulos = atualizarTitulos;
                
                  function irParaMesVigente() {
                    if (typeof window.mudarMesPgto !== 'function') return false;
                    var hoje = new Date();
                    var alvo = hoje.getFullYear() * 12 + hoje.getMonth();
                    for (var passos = 0; passos < 400; passos++) {
                      var atual = numeroDoMes(chaveMes());
                      if (atual === null) return false;
                      if (atual === alvo) return true;
                      window.mudarMesPgto(atual < alvo ? 1 : -1);
                    }
                    return false;
                  }
                  P71.mesDeHoje = irParaMesVigente;
                
                  /* ------------------------------------------------------------------ */
                  /* 2) RESUMO EDITAVEL NOS DOIS LADOS                                  */
                  /* ------------------------------------------------------------------ */
                  function dadosDoCampo(campo) {
                    var colab = campo.getAttribute('data-p71-colab');
                    var obra = campo.getAttribute('data-p71-obra');
                    if (colab) return { colabId: colab, obraId: obra || '' };
                    var attr = campo.getAttribute('onchange') || campo.getAttribute('data-p70-alvo') || '';
                    var m = /atualizarValorPagoPgto\(\s*'([^']*)'\s*,\s*'([^']*)'/.exec(attr);
                    if (!m) return null;
                    return { colabId: m[1], obraId: m[2] };
                  }
                
                  function camposDe(raiz) {
                    if (!raiz) return [];
                    return raiz.querySelectorAll(
                      '.valor-pago-cell input, input[data-p71], input[data-p70-alvo], td:last-child input[type="number"]');
                  }
                
                  function prepararCampo(campo) {
                    var d = dadosDoCampo(campo);
                    if (!d) return null;
                
                    campo.setAttribute('data-p71', '1');
                    campo.setAttribute('data-p71-colab', d.colabId);
                    if (d.obraId) campo.setAttribute('data-p71-obra', d.obraId);
                
                    /* o campo do resumo de baixo era so para olhar: agora aceita digitacao */
                    if (campo.disabled) campo.disabled = false;
                    if (campo.readOnly) campo.readOnly = false;
                    campo.removeAttribute('disabled');
                    campo.removeAttribute('readonly');
                
                    /* aceita virgula: campo de texto com teclado numerico no celular */
                    if (String(campo.getAttribute('type') || '').toLowerCase() !== 'text') {
                      campo.setAttribute('type', 'text');
                      try { campo.type = 'text'; } catch (e) { /* ignora */ }
                    }
                    if (!campo.getAttribute('inputmode')) campo.setAttribute('inputmode', 'decimal');
                
                    var valor = valorGuardado(d.colabId);
                    var texto = String(valor || 0);
                    if (String(campo.value) !== texto && document.activeElement !== campo) campo.value = texto;
                
                    /* eco que some na tela e aparece no papel */
                    var cel = campo.parentNode;
                    if (cel && cel.tagName === 'TD') {
                      if ((cel.className || '').indexOf('valor-pago-cell') < 0) cel.className += ' valor-pago-cell';
                      cel.setAttribute('data-p70', '1');
                      var eco = cel.querySelector('.p70-eco-papel, .p63-eco-papel');
                      if (!eco) {
                        eco = document.createElement('span');
                        eco.className = 'p63-eco-papel p70-eco-papel';
                        cel.appendChild(eco);
                      }
                      eco.textContent = dinheiro(valor);
                    }
                    return { colabId: d.colabId, valor: valor };
                  }
                
                  function acharItem(caixa, rotulo) {
                    var itens = caixa ? caixa.querySelectorAll('.totais-item') : [];
                    for (var i = 0; i < itens.length; i++) {
                      if ((itens[i].textContent || '').toLowerCase().indexOf(rotulo) > -1) return itens[i];
                    }
                    return null;
                  }
                
                  function valorDoItem(item) {
                    if (!item) return 0;
                    var v = item.querySelector('.totais-value');
                    return v ? paraNumero(v.textContent) : 0;
                  }
                
                  function ajustarTotais(caixaId, totalPago) {
                    var caixa = porId(caixaId);
                    if (!caixa) return;
                
                    var itemPago = acharItem(caixa, 'valor pago');
                    if (itemPago) {
                      var alvo = itemPago.querySelector('.totais-value');
                      if (alvo) alvo.textContent = dinheiro(totalPago);
                    }
                
                    var itemCusto = acharItem(caixa, 'custo total');
                    var itemSaldo = acharItem(caixa, 'saldo');
                    if (itemCusto && itemSaldo) {
                      var saldo = valorDoItem(itemCusto) - totalPago;
                      var alvoS = itemSaldo.querySelector('.totais-value');
                      if (alvoS) {
                        alvoS.textContent = dinheiro(saldo);
                        if (saldo > 0) {
                          if ((alvoS.className || '').indexOf('totais-red') < 0) alvoS.className += ' totais-red';
                        } else {
                          alvoS.className = String(alvoS.className || '').replace(/\s*totais-red/g, '');
                        }
                      }
                    }
                  }
                
                  function arrumarLado(raizId, totaisId) {
                    var raiz = porId(raizId);
                    if (!raiz) return 0;
                    var campos = camposDe(raiz);
                    var total = 0, vistos = {};
                    for (var i = 0; i < campos.length; i++) {
                      var r = prepararCampo(campos[i]);
                      if (!r) continue;
                      if (!vistos[r.colabId]) { vistos[r.colabId] = true; total += r.valor; }
                    }
                    if (totaisId) ajustarTotais(totaisId, total);
                    return total;
                  }
                
                  /* o bloco de resumo que fica no fim dos Lancamentos */
                  function garantirBloco() {
                    var painel = porId('panelPgtoLancamentos');
                    if (!painel) return null;
                    var bloco = porId('p63BlocoResumo');
                    if (bloco) return bloco;
                    bloco = porId('p71BlocoResumo');
                    if (!bloco) {
                      bloco = document.createElement('div');
                      bloco.id = 'p71BlocoResumo';
                      bloco.className = 'p63-resumo-bloco p71-resumo-bloco';
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
                    }
                    return bloco;
                  }
                
                  function copiarParaLancamentos() {
                    garantirBloco();
                    var origem = porId('containerResumoPgto');
                    var origemTot = porId('containerTotaisPgto');
                    var destino = porId('p63ResumoTabela');
                    var destinoTot = porId('p63ResumoTotais');
                    if (destino && origem) destino.innerHTML = origem.innerHTML;
                    if (destinoTot && origemTot) destinoTot.innerHTML = origemTot.innerHTML;
                  }
                
                  var trabalhando = false;
                
                  function arrumar() {
                    if (trabalhando) return false;
                    trabalhando = true;
                    try {
                      /* refaz a conta do mes que esta na tela */
                      try {
                        if (typeof window.renderResumoPgto === 'function') window.renderResumoPgto();
                      } catch (e) { /* ignora */ }
                
                      arrumarLado('containerResumoPgto', 'containerTotaisPgto');
                      copiarParaLancamentos();
                      arrumarLado('p63ResumoTabela', 'p63ResumoTotais');
                      atualizarTitulos();
                    } finally {
                      trabalhando = false;
                    }
                    return true;
                  }
                  P71.arrumar = arrumar;
                
                  /* digitar no resumo de baixo grava do mesmo jeito que no Resumo:
                     o campo copiado nao tem ligacao propria, entao a pagina toda escuta */
                  function ligarDigitacao() {
                    if (P71.__digitacao) return;
                    P71.__digitacao = true;
                
                    function tratar(ev) {
                      var campo = ev.target;
                      if (!campo || campo.tagName !== 'INPUT') return;
                      if (!campo.getAttribute('data-p71')) return;
                      var bloco = porId('p63ResumoTabela');
                      if (!bloco || !bloco.contains(campo)) return; /* o lado do Resumo ja tem a sua ligacao */
                      var d = dadosDoCampo(campo);
                      if (!d) return;
                      if (typeof window.atualizarValorPagoPgto !== 'function') return;
                      try {
                        window.atualizarValorPagoPgto(d.colabId, d.obraId, paraNumero(campo.value));
                      } catch (e) { /* ignora */ }
                      try { arrumar(); } catch (e2) { /* ignora */ }
                    }
                
                    document.addEventListener('change', tratar, false);
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 3) CADA BOTAO IMPRIME SOMENTE A SUA SECAO                          */
                  /* ------------------------------------------------------------------ */
                  var SECOES = ['panelPgtoLancamentos', 'panelPgtoResumo', 'panelPgtoColaboradores'];
                
                  function ehSecao(el) {
                    if (!el || el.nodeType !== 1 || !el.id) return false;
                    for (var i = 0; i < SECOES.length; i++) if (el.id === SECOES[i]) return true;
                    if (el.id.indexOf('tab-') === 0) return true;
                    return false;
                  }
                
                  function secaoDoBotao(btn) {
                    var el = btn;
                    while (el && el.nodeType === 1) {
                      if (ehSecao(el)) return el;
                      el = el.parentNode;
                    }
                    return null;
                  }
                
                  var desfazer = [];
                
                  function guardarEstilo(el) {
                    desfazer.push([el, el.getAttribute('style'), el.className]);
                  }
                
                  function corVale(c) {
                    if (!c) return false;
                    if (c === 'transparent') return false;
                    if (String(c).indexOf('rgba(0, 0, 0, 0)') >= 0) return false;
                    return true;
                  }
                
                  function fixarCores(raiz) {
                    var lista = raiz.querySelectorAll('*');
                    var total = Math.min(lista.length, 4000);
                    for (var i = 0; i < total; i++) {
                      var el = lista[i];
                      if (!el || !el.style) continue;
                      var nome = el.tagName;
                      if (nome === 'SCRIPT' || nome === 'STYLE' || nome === 'CANVAS') continue;
                      var cs;
                      try { cs = window.getComputedStyle(el); } catch (e) { continue; }
                      if (!cs || cs.display === 'none') continue;
                      var fundo = cs.backgroundColor, texto = cs.color, borda = cs.borderTopColor;
                      var temBorda = (corVale(borda) && cs.borderTopWidth !== '0px');
                      if (!corVale(fundo) && !corVale(texto) && !temBorda) continue;
                      guardarEstilo(el);
                      if (corVale(fundo)) el.style.setProperty('background-color', fundo, 'important');
                      if (corVale(texto)) el.style.setProperty('color', texto, 'important');
                      if (temBorda) el.style.setProperty('border-color', borda, 'important');
                    }
                  }
                
                  function marcarCaminho(alvo) {
                    guardarEstilo(alvo);
                    alvo.setAttribute('data-p71-alvo', '1');
                    if ((alvo.className || '').indexOf('p71-secao-alvo') < 0) alvo.className += ' p71-secao-alvo';
                    alvo.style.setProperty('display', 'block', 'important');
                
                    var filho = alvo;
                    var pai = alvo.parentNode;
                    while (pai && pai.nodeType === 1) {
                      guardarEstilo(pai);
                      if ((pai.className || '').indexOf('p71-caminho') < 0) pai.className += ' p71-caminho';
                      if (pai !== document.body && pai !== document.documentElement) {
                        pai.style.setProperty('display', 'block', 'important');
                      }
                      var irmaos = pai.children || [];
                      for (var i = 0; i < irmaos.length; i++) {
                        var irmao = irmaos[i];
                        if (irmao === filho) continue;
                        if (irmao.tagName === 'SCRIPT' || irmao.tagName === 'STYLE') continue;
                        guardarEstilo(irmao);
                        if ((irmao.className || '').indexOf('p71-fora') < 0) irmao.className += ' p71-fora';
                      }
                      if (pai === document.body) break;
                      filho = pai;
                      pai = pai.parentNode;
                    }
                  }
                
                  function limparMarcas() {
                    for (var i = desfazer.length - 1; i >= 0; i--) {
                      var el = desfazer[i][0], estilo = desfazer[i][1], classe = desfazer[i][2];
                      if (!el) continue;
                      if (estilo === null) el.removeAttribute('style');
                      else el.setAttribute('style', estilo);
                      el.className = classe;
                    }
                    desfazer = [];
                    var marcados = document.querySelectorAll('[data-p71-alvo]');
                    for (var k = 0; k < marcados.length; k++) marcados[k].removeAttribute('data-p71-alvo');
                  }
                
                  function imprimirSecao(secao) {
                    var alvo = (typeof secao === 'string') ? porId(secao) : secao;
                    if (!alvo) return false;
                    P71.ultimaSecao = alvo.id || '';
                
                    /* fecha menus e caixas abertas para nao sujarem o papel */
                    try {
                      if (window.ORMENU && typeof window.ORMENU.fechar === 'function') window.ORMENU.fechar();
                      if (typeof window.p37FecharMenuAbas === 'function') window.p37FecharMenuAbas();
                      var menu = porId('meu-menu-abas');
                      if (menu) menu.removeAttribute('open');
                    } catch (e) { /* ignora */ }
                
                    if (alvo.id === 'panelPgtoLancamentos' || alvo.id === 'panelPgtoResumo') {
                      try { arrumar(); } catch (e) { /* ignora */ }
                    }
                
                    document.body.classList.add('p71-imprimindo');
                    marcarCaminho(alvo);
                    try { fixarCores(alvo); } catch (e) { /* ignora */ }
                
                    try {
                      window.print();
                    } finally {
                      limparMarcas();
                      document.body.classList.remove('p71-imprimindo');
                    }
                    return true;
                  }
                  P71.imprimirSecao = imprimirSecao;
                
                  function marcarBotoes() {
                    var botoes = document.querySelectorAll('button[onclick*="imprimirPagina"], a[onclick*="imprimirPagina"]');
                    for (var i = 0; i < botoes.length; i++) {
                      if (secaoDoBotao(botoes[i])) botoes[i].setAttribute('data-p71-botao', '1');
                    }
                  }
                  P71.marcarBotoes = marcarBotoes;
                
                  function ligarBotoes() {
                    if (P71.__cliques) return;
                    P71.__cliques = true;
                
                    document.addEventListener('click', function (ev) {
                      var el = ev.target;
                      var btn = null;
                      while (el && el.nodeType === 1) {
                        if (el.tagName === 'BUTTON' || el.tagName === 'A') { btn = el; break; }
                        el = el.parentNode;
                      }
                      if (!btn) return;
                      var oc = btn.getAttribute('onclick') || '';
                      if (oc.indexOf('imprimirPagina') < 0 && !btn.getAttribute('data-p71-botao')) return;
                      var secao = secaoDoBotao(btn);
                      if (!secao) return; /* botao geral do painel: continua imprimindo tudo */
                      if (ev.preventDefault) ev.preventDefault();
                      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
                      if (ev.stopPropagation) ev.stopPropagation();
                      try { imprimirSecao(secao); } catch (e) { /* ignora */ }
                    }, true);
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* LIGACOES NAS FUNCOES DO PAINEL                                     */
                  /* ------------------------------------------------------------------ */
                  function ligarLancamentos() {
                    var original = window.renderLancamentosPgto;
                    if (typeof original !== 'function' || original.__p71) return false;
                    var novo = function () {
                      var r = original.apply(this, arguments);
                      try { arrumar(); } catch (e) { /* ignora */ }
                      try { marcarBotoes(); } catch (e2) { /* ignora */ }
                      return r;
                    };
                    novo.__p71 = true;
                    novo.__p70 = true;
                    novo.__p63 = true;
                    window.renderLancamentosPgto = novo;
                    return true;
                  }
                
                  function ligarResumo() {
                    var original = window.renderResumoPgto;
                    if (typeof original !== 'function' || original.__p71) return false;
                    var novo = function () {
                      var r = original.apply(this, arguments);
                      try { arrumar(); } catch (e) { /* ignora */ }
                      return r;
                    };
                    novo.__p71 = true;
                    novo.__p70 = true;
                    novo.__p63 = true;
                    window.renderResumoPgto = novo;
                    return true;
                  }
                
                  function ligarPagamento() {
                    var original = window.renderPagamento;
                    if (typeof original !== 'function' || original.__p71) return false;
                    var novo = function () {
                      var r = original.apply(this, arguments);
                      try { atualizarTitulos(); } catch (e) { /* ignora */ }
                      return r;
                    };
                    novo.__p71 = true;
                    novo.__p70 = true;
                    novo.__p63 = true;
                    window.renderPagamento = novo;
                    return true;
                  }
                
                  function ligarSubAbas() {
                    var original = window.trocarSubTabPgtoNovo;
                    if (typeof original !== 'function' || original.__p71) return false;
                    var novo = function (tab) {
                      var r = original.apply(this, arguments);
                      try { irParaMesVigente(); } catch (e) { /* ignora */ }
                      try {
                        if (typeof window.renderPagamento === 'function') window.renderPagamento();
                      } catch (e2) { /* ignora */ }
                      try { arrumar(); } catch (e3) { /* ignora */ }
                      try { atualizarTitulos(); } catch (e4) { /* ignora */ }
                      try { marcarBotoes(); } catch (e5) { /* ignora */ }
                      return r;
                    };
                    novo.__p71 = true;
                    novo.__p70 = true;
                    novo.__p63 = true;
                    window.trocarSubTabPgtoNovo = novo;
                    return true;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTIDA                                                            */
                  /* ------------------------------------------------------------------ */
                  function comecar() {
                    ligarLancamentos();
                    ligarResumo();
                    ligarPagamento();
                    ligarSubAbas();
                    ligarDigitacao();
                    ligarBotoes();
                    try { marcarBotoes(); } catch (e) { /* ignora */ }
                    try { atualizarTitulos(); } catch (e2) { /* ignora */ }
                    try { arrumar(); } catch (e3) { /* ignora */ }
                  }
                
                  P71.situacao = function () {
                    console.log('Resumo editavel nos Lancamentos: ' +
                      (document.querySelector('#p63ResumoTabela input[data-p71]') ? 'sim' : 'ainda sem linhas'));
                    console.log('Titulos nas sub-abas: ' +
                      (porId('p71TituloLancamentos') && porId('p71TituloResumo') ? 'sim' : 'nao'));
                    console.log('Impressao por secao: ' +
                      (P71.__cliques ? 'sim' : 'nao') + '. Ultima secao impressa: ' + (P71.ultimaSecao || '(nenhuma)'));
                    return true;
                  };
                
                  function esperar(vezes) {
                    if (typeof window.renderResumoPgto === 'function' &&
                        typeof window.renderLancamentosPgto === 'function' &&
                        typeof window.trocarSubTabPgtoNovo === 'function') {
                      comecar();
                      return;
                    }
                    if (vezes <= 0) return;
                    setTimeout(function () { esperar(vezes - 1); }, 300);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function () { esperar(60); });
                  } else {
                    esperar(60);
                  }
                  /* os patches antigos re-embrulham as funcoes do painel depois de uns
                     segundos; a nossa camada volta por cima nessas horas */
                  var HORAS = [1200, 2500, 3000, 4500];
                  for (var h = 0; h < HORAS.length; h++) {
                    (function (t) {
                      setTimeout(function () { try { comecar(); } catch (e) { /* ignora */ } }, t);
                    }(HORAS[h]));
                  }
                })();
            
