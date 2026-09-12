
                /* PATCH 74: VALOR PAGO VALE NAS DUAS SUB-ABAS E TITULO COM O MES ESCRITO */
                (function () {
                  if (window.P74 && window.P74.__v74) return;
                  var P74 = window.P74 = window.P74 || {};
                  P74.__v74 = true;
                
                  /* nomes de mes escritos por inteiro (o painel usa a forma curta) */
                  var MES_CHEIO = ['Janeiro', 'Fevereiro', 'Mar\u00e7o', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                  var MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                    'jul', 'ago', 'set', 'out', 'nov', 'dez'];
                
                  var TITULO_BASE = 'Resumo de Pagamento do M\u00eas ';
                
                  /* os dois lados: tabela do resumo + quadro de totais de cada lado */
                  var LADOS = [
                    ['containerResumoPgto', 'containerTotaisPgto'],
                    ['p63ResumoTabela', 'p63ResumoTotais']
                  ];
                
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
                
                  /* ------------------------------------------------------------------ */
                  /* 1) MES ESCRITO POR INTEIRO E TITULO DOS DOIS BLOCOS                */
                  /* ------------------------------------------------------------------ */
                  function chaveMes() {
                    try {
                      if (typeof window.getChaveMesPgto === 'function') return String(window.getChaveMesPgto() || '');
                    } catch (e) { /* ignora */ }
                    return '';
                  }
                
                  function mesDaChave() {
                    var m = /^(\d{4})-(\d{1,2})$/.exec(chaveMes());
                    if (!m) return -1;
                    var i = parseInt(m[2], 10) - 1;
                    return (i >= 0 && i < 12) ? i : -1;
                  }
                
                  /* se a chave do mes nao vier, le o rotulo da tela (ex.: Ago/2026) */
                  function mesDoRotulo() {
                    var ids = ['pgtoMesAnoLabelResumo', 'pgtoMesAnoLabel', 'pgtoMesAnoLabelColab'];
                    for (var k = 0; k < ids.length; k++) {
                      var el = porId(ids[k]);
                      if (!el) continue;
                      var txt = String(el.textContent || '').toLowerCase();
                      for (var i = 0; i < 12; i++) {
                        if (txt.indexOf(MES_CURTO[i]) > -1) return i;
                      }
                    }
                    return -1;
                  }
                
                  function mesEscrito() {
                    var i = mesDaChave();
                    if (i < 0) i = mesDoRotulo();
                    if (i < 0) return '';
                    return MES_CHEIO[i];
                  }
                  P74.mes = mesEscrito;
                
                  function textoDoTitulo() {
                    var nome = mesEscrito();
                    return nome ? (TITULO_BASE + nome) : TITULO_BASE.replace(/\s+$/, '');
                  }
                  P74.textoTitulo = textoDoTitulo;
                
                  /* o bloco de resumo que fica no fim dos Lancamentos */
                  function blocoDosLancamentos() {
                    return porId('p63BlocoResumo') || porId('p71BlocoResumo') || null;
                  }
                
                  function tituloDoBloco(bloco) {
                    if (!bloco) return null;
                    var t = bloco.querySelector('.p63-resumo-titulo, .p74-titulo-mes');
                    if (t) return t;
                    var h = bloco.getElementsByTagName('h3');
                    for (var i = 0; i < h.length; i++) {
                      var txt = String(h[i].textContent || '').toLowerCase();
                      if (txt.indexOf('resumo de pagamento') > -1) return h[i];
                    }
                    return null;
                  }
                
                  function titulos() {
                    var texto = textoDoTitulo();
                    var mudou = false;
                
                    /* bloco de baixo, dentro dos Lancamentos */
                    var alvo1 = tituloDoBloco(blocoDosLancamentos());
                    if (alvo1) {
                      if ((alvo1.className || '').indexOf('p74-titulo-mes') < 0) {
                        alvo1.className = String(alvo1.className || '') + ' p74-titulo-mes';
                      }
                      if (alvo1.textContent !== texto) { alvo1.textContent = texto; mudou = true; }
                    }
                
                    /* bloco da sub-aba Resumo */
                    var alvo2 = porId('p71TituloResumo') || porId('p74TituloResumo');
                    if (!alvo2) {
                      var painel = porId('panelPgtoResumo');
                      if (painel) {
                        alvo2 = document.createElement('div');
                        alvo2.id = 'p74TituloResumo';
                        alvo2.className = 'p71-titulo';
                        painel.insertBefore(alvo2, painel.firstChild);
                      }
                    }
                    if (alvo2) {
                      if ((alvo2.className || '').indexOf('p74-titulo-mes') < 0) {
                        alvo2.className = String(alvo2.className || '') + ' p74-titulo-mes';
                      }
                      if (alvo2.textContent !== texto) { alvo2.textContent = texto; mudou = true; }
                    }
                    return mudou;
                  }
                  P74.titulos = titulos;
                
                  /* ------------------------------------------------------------------ */
                  /* 2) OS CAMPOS DE VALOR PAGO DOS DOIS LADOS                          */
                  /* ------------------------------------------------------------------ */
                  function camposDe(raiz) {
                    if (!raiz) return [];
                    return raiz.querySelectorAll(
                      '.valor-pago-cell input, input[data-p71], input[data-p70-alvo], input[data-p74], td:last-child input');
                  }
                
                  function dadosDoCampo(campo) {
                    if (!campo) return null;
                    var colab = campo.getAttribute('data-p74-colab') || campo.getAttribute('data-p71-colab');
                    var obra = campo.getAttribute('data-p74-obra') || campo.getAttribute('data-p71-obra');
                    if (colab) return { colabId: colab, obraId: obra || '' };
                    var attr = campo.getAttribute('onchange') || campo.getAttribute('data-p70-alvo') || '';
                    var m = /atualizarValorPagoPgto\(\s*'([^']*)'\s*,\s*'([^']*)'/.exec(attr);
                    if (!m) return null;
                    return { colabId: m[1], obraId: m[2] };
                  }
                
                  function eNossoCampo(campo) {
                    if (!campo || campo.tagName !== 'INPUT') return false;
                    for (var i = 0; i < LADOS.length; i++) {
                      var raiz = porId(LADOS[i][0]);
                      if (raiz && raiz.contains(campo)) return true;
                    }
                    return false;
                  }
                
                  /* deixa o campo pronto para digitar nos dois lados */
                  function liberarCampo(campo) {
                    var d = dadosDoCampo(campo);
                    if (!d) return null;
                
                    campo.setAttribute('data-p74', '1');
                    campo.setAttribute('data-p74-colab', d.colabId);
                    if (d.obraId) campo.setAttribute('data-p74-obra', d.obraId);
                
                    if (campo.disabled) campo.disabled = false;
                    if (campo.readOnly) campo.readOnly = false;
                    campo.removeAttribute('disabled');
                    campo.removeAttribute('readonly');
                
                    /* eco do numero: nao aparece na tela, aparece no papel */
                    var cel = campo.parentNode;
                    if (cel && cel.tagName === 'TD') {
                      var eco = cel.querySelector('.p70-eco-papel, .p63-eco-papel');
                      if (!eco) {
                        eco = document.createElement('span');
                        eco.className = 'p63-eco-papel p70-eco-papel';
                        cel.appendChild(eco);
                      }
                      var certo = dinheiro(campo.value);
                      if (eco.textContent !== certo) eco.textContent = certo;
                    }
                    return d;
                  }
                
                  function liberarTodos() {
                    var quantos = 0;
                    for (var i = 0; i < LADOS.length; i++) {
                      var campos = camposDe(porId(LADOS[i][0]));
                      for (var k = 0; k < campos.length; k++) {
                        if (liberarCampo(campos[k])) quantos++;
                      }
                    }
                    return quantos;
                  }
                  P74.liberar = liberarTodos;
                
                  /* o mesmo colaborador aparece nos dois lados: os dois campos andam juntos */
                  function espelhar(colabId, texto) {
                    var alvo = String(colabId);
                    for (var i = 0; i < LADOS.length; i++) {
                      var campos = camposDe(porId(LADOS[i][0]));
                      for (var k = 0; k < campos.length; k++) {
                        var campo = campos[k];
                        var d = dadosDoCampo(campo);
                        if (!d || String(d.colabId) !== alvo) continue;
                        if (campo !== document.activeElement && String(campo.value) !== String(texto)) {
                          campo.value = texto;
                        }
                        var cel = campo.parentNode;
                        if (cel && cel.tagName === 'TD') {
                          var eco = cel.querySelector('.p70-eco-papel, .p63-eco-papel');
                          if (eco) eco.textContent = dinheiro(texto);
                        }
                      }
                    }
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 3) OS DOIS QUADROS DE TOTAIS GERAIS DO MES, NA HORA                */
                  /* ------------------------------------------------------------------ */
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
                
                  function escreverTotais(caixaId, totalPago) {
                    var caixa = porId(caixaId);
                    if (!caixa) return false;
                
                    var itemPago = acharItem(caixa, 'valor pago');
                    if (itemPago) {
                      var alvo = itemPago.querySelector('.totais-value');
                      if (alvo) alvo.textContent = dinheiro(totalPago);
                    }
                
                    /* saldo = custo total que ja esta na tela menos o que foi pago
                       (a conta do painel nao muda: so refazemos a subtracao) */
                    var itemCusto = acharItem(caixa, 'custo total');
                    var itemSaldo = acharItem(caixa, 'saldo');
                    if (itemCusto && itemSaldo) {
                      var saldo = valorDoItem(itemCusto) - paraNumero(totalPago);
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
                    return true;
                  }
                
                  /* soma um valor por colaborador (o mesmo nome nao conta duas vezes) */
                  function somaDoLado(raizId) {
                    var raiz = porId(raizId);
                    if (!raiz) return null;
                    var campos = camposDe(raiz);
                    if (!campos || !campos.length) return null;
                    var total = 0, vistos = {}, achou = false;
                    for (var i = 0; i < campos.length; i++) {
                      var d = dadosDoCampo(campos[i]);
                      if (!d) continue;
                      var chave = String(d.colabId);
                      if (vistos[chave]) continue;
                      vistos[chave] = true;
                      total += paraNumero(campos[i].value);
                      achou = true;
                    }
                    return achou ? total : null;
                  }
                
                  function recalcular() {
                    var total = null;
                    for (var i = 0; i < LADOS.length && total === null; i++) {
                      total = somaDoLado(LADOS[i][0]);
                    }
                    if (total === null) return false;
                    for (var k = 0; k < LADOS.length; k++) {
                      escreverTotais(LADOS[k][1], total);
                    }
                    P74.ultimoTotal = total;
                    return true;
                  }
                  P74.recalcular = recalcular;
                
                  /* ------------------------------------------------------------------ */
                  /* 4) GRAVACAO SEM PERDER O QUE ESTA SENDO DIGITADO                   */
                  /* ------------------------------------------------------------------ */
                  /* usa a mesma funcao de sempre do painel (nada de conta nova), mas
                     segura o redesenho para o campo nao piscar no meio da digitacao */
                  function gravar(colabId, obraId, valor) {
                    var f = window.atualizarValorPagoPgto;
                    if (typeof f !== 'function') return false;
                    var guardaR = window.renderResumoPgto;
                    var guardaL = window.renderLancamentosPgto;
                    var nada = function () { };
                    try {
                      if (typeof guardaR === 'function') window.renderResumoPgto = nada;
                      if (typeof guardaL === 'function') window.renderLancamentosPgto = nada;
                      f(colabId, obraId, paraNumero(valor));
                    } catch (e) {
                      return false;
                    } finally {
                      if (typeof guardaR === 'function') window.renderResumoPgto = guardaR;
                      if (typeof guardaL === 'function') window.renderLancamentosPgto = guardaL;
                    }
                    return true;
                  }
                
                  var pendente = null, relogio = null;
                
                  function despejar() {
                    if (relogio) { clearTimeout(relogio); relogio = null; }
                    if (!pendente) return false;
                    var p = pendente;
                    pendente = null;
                    return gravar(p.colabId, p.obraId, p.valor);
                  }
                  P74.despejar = despejar;
                
                  function agendar(colabId, obraId, valor) {
                    pendente = { colabId: colabId, obraId: obraId, valor: valor };
                    if (relogio) clearTimeout(relogio);
                    relogio = setTimeout(function () { relogio = null; despejar(); }, 150);
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 5) ESCUTA DA DIGITACAO NOS DOIS LADOS                             */
                  /* ------------------------------------------------------------------ */
                  function sincronizar() {
                    try { if (window.P71 && typeof window.P71.arrumar === 'function') window.P71.arrumar(); } catch (e) { /* ignora */ }
                    try { liberarTodos(); } catch (e2) { /* ignora */ }
                    try { recalcular(); } catch (e3) { /* ignora */ }
                    try { titulos(); } catch (e4) { /* ignora */ }
                    return true;
                  }
                  P74.sincronizar = sincronizar;
                
                  function tratar(ev) {
                    var campo = ev && ev.target;
                    if (!eNossoCampo(campo)) return;
                    var d = liberarCampo(campo);
                    if (!d) return;
                
                    var texto = String(campo.value);
                
                    /* na hora: o outro lado recebe o mesmo numero e os dois quadros
                       de Totais Gerais do Mes sao refeitos */
                    espelhar(d.colabId, texto);
                    recalcular();
                
                    if (ev.type === 'change') {
                      despejar();
                      gravar(d.colabId, d.obraId, texto);
                      /* depois de gravar, o painel redesenha: alinhamos tudo de novo */
                      setTimeout(function () { try { sincronizar(); } catch (e) { /* ignora */ } }, 0);
                    } else {
                      agendar(d.colabId, d.obraId, texto);
                    }
                  }
                
                  function ligarDigitacao() {
                    if (P74.__digitacao) return false;
                    P74.__digitacao = true;
                    document.addEventListener('input', tratar, true);
                    document.addEventListener('change', tratar, true);
                    document.addEventListener('blur', function (ev) {
                      if (eNossoCampo(ev && ev.target)) despejar();
                    }, true);
                    return true;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 6) LIGACOES NAS FUNCOES DO PAINEL                                  */
                  /* ------------------------------------------------------------------ */
                  function marcar(f) {
                    f.__p74 = true;
                    f.__p71 = true;
                    f.__p70 = true;
                    f.__p63 = true;
                    return f;
                  }
                
                  function embrulhar(nome, depois) {
                    var original = window[nome];
                    if (typeof original !== 'function' || original.__p74) return false;
                    var novo = function () {
                      try { despejar(); } catch (e) { /* ignora */ }
                      var r = original.apply(this, arguments);
                      try { depois(); } catch (e2) { /* ignora */ }
                      return r;
                    };
                    window[nome] = marcar(novo);
                    return true;
                  }
                
                  function ligarTudo() {
                    embrulhar('renderResumoPgto', function () { liberarTodos(); recalcular(); titulos(); });
                    embrulhar('renderLancamentosPgto', function () { liberarTodos(); recalcular(); titulos(); });
                    embrulhar('renderPagamento', function () { titulos(); recalcular(); });
                    embrulhar('trocarSubTabPgtoNovo', function () { sincronizar(); });
                    embrulhar('mudarMesPgto', function () { sincronizar(); });
                    embrulhar('atualizarValorPagoPgto', function () { liberarTodos(); recalcular(); titulos(); });
                    return true;
                  }
                
                  function comecar() {
                    ligarTudo();
                    ligarDigitacao();
                    try { sincronizar(); } catch (e) { /* ignora */ }
                    return true;
                  }
                  P74.comecar = comecar;
                
                  P74.situacao = function () {
                    console.log('Quadros de totais encontrados: ' +
                      (porId('containerTotaisPgto') ? 'Resumo sim' : 'Resumo nao') + ', ' +
                      (porId('p63ResumoTotais') ? 'Lancamentos sim' : 'Lancamentos nao'));
                    return true;
                  };
                
                  function esperar(vezes) {
                    if (typeof window.renderResumoPgto === 'function' &&
                        typeof window.atualizarValorPagoPgto === 'function') {
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
                  var HORAS = [900, 1500, 2600, 3200, 4800, 6500];
                  for (var h = 0; h < HORAS.length; h++) {
                    (function (t) {
                      setTimeout(function () { try { comecar(); } catch (e) { /* ignora */ } }, t);
                    }(HORAS[h]));
                  }
                })();
            
