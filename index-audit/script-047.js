
                /* PATCH 75: APARENCIA DAS SUB-ABAS LANCAMENTOS E RESUMO DE PAGAMENTO */
                (function () {
                  if (window.P75 && window.P75.__v75) return;
                  var P75 = window.P75 = window.P75 || {};
                  P75.__v75 = true;
                
                  var trabalhando = false;
                  var agendado = null;
                
                  /* ------------------------------------------------------------------ */
                  /* AJUDANTES                                                          */
                  /* ------------------------------------------------------------------ */
                  function porId(id) { return document.getElementById(id); }
                
                  function texto(el) { return el ? String(el.textContent || '') : ''; }
                
                  function paraNumero(v) {
                    if (typeof v === 'number') return isFinite(v) ? v : 0;
                    var s = String(v == null ? '' : v);
                    s = s.replace(/R\$/gi, '').replace(/m\u00b2/gi, '').replace(/\s|\u00a0/g, '');
                    if (s.indexOf(',') > -1) {
                      if (s.indexOf('.') > -1) s = s.replace(/\./g, '');
                      s = s.replace(',', '.');
                    }
                    s = s.replace(/[^0-9.\-]/g, '');
                    var n = parseFloat(s);
                    return isFinite(n) ? n : 0;
                  }
                
                  function numeroBonito(n, casas) {
                    var v = paraNumero(n);
                    try {
                      return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
                    } catch (e) {
                      return v.toFixed(casas);
                    }
                  }
                
                  function metragemBonita(n) {
                    var v = paraNumero(n);
                    var inteiro = Math.abs(v - Math.round(v)) < 0.0001;
                    return numeroBonito(v, inteiro ? 0 : 2);
                  }
                
                  function dinheiro(n) { return 'R$ ' + numeroBonito(n, 2); }
                
                  function limpar(t) {
                    return String(t || '').replace(/\s|\u00a0/g, '').toLowerCase();
                  }
                
                  /* le a linha de Total que a propria tabela ja escreveu no pe dela:
                     nada e recalculado, so aproveitado */
                  function lerPeDaTabela(tabela) {
                    var linha = tabela.querySelector('tfoot tr.lanc-totals-row') || tabela.querySelector('tfoot tr');
                    if (!linha) return null;
                    var celulas = linha.children;
                    if (!celulas || celulas.length < 3) return null;
                
                    var m2 = null;
                    var custo = 0;
                    var achouDinheiro = false;
                
                    for (var i = 0; i < celulas.length; i++) {
                      var bruto = texto(celulas[i]).trim();
                      if (!bruto) continue;
                      if (bruto.indexOf('R$') > -1) {
                        custo += paraNumero(bruto);
                        achouDinheiro = true;
                        continue;
                      }
                      if (m2 === null && /[0-9]/.test(bruto)) m2 = paraNumero(bruto);
                    }
                
                    if (m2 === null && !achouDinheiro) return null;
                    return { m2: m2 === null ? 0 : m2, custo: custo };
                  }
                
                  /* acha em qual coluna da tabela esta cada titulo procurado */
                  function colunaPorTitulo(tabela, pedacos) {
                    var ths = tabela.querySelectorAll('thead th');
                    for (var i = 0; i < ths.length; i++) {
                      var t = limpar(texto(ths[i]));
                      for (var p = 0; p < pedacos.length; p++) {
                        if (t.indexOf(pedacos[p]) === 0 || t === pedacos[p]) return i;
                      }
                    }
                    return -1;
                  }
                
                  /* soma uma coluna do corpo da tabela, sem tocar em conta nenhuma:
                     apenas le o que ja esta escrito na tela */
                  function somaColuna(tabela, indice) {
                    if (indice < 0) return 0;
                    var total = 0;
                    var linhas = tabela.querySelectorAll('tbody tr');
                    for (var i = 0; i < linhas.length; i++) {
                      if (linhas[i].getAttribute('data-p75tg')) continue;
                      var tds = linhas[i].children;
                      if (!tds || tds.length <= indice) continue;
                      var cel = tds[indice];
                      var campo = cel.querySelector ? cel.querySelector('input') : null;
                      total += paraNumero(campo ? campo.value : texto(cel));
                    }
                    return total;
                  }
                
                  function contarLinhas(tabela) {
                    var linhas = tabela.querySelectorAll('tbody tr');
                    var n = 0;
                    for (var i = 0; i < linhas.length; i++) {
                      if (!linhas[i].getAttribute('data-p75tg')) n++;
                    }
                    return n;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 1) FAIXA DA OBRA: NOME NA ESQUERDA, MEDIDAS NA MESMA LINHA         */
                  /* ------------------------------------------------------------------ */
                  function arrumarFaixasDeObra() {
                    var painel = porId('panelPgtoLancamentos');
                    if (!painel) return 0;
                    var grupos = painel.querySelectorAll('.lanc-obra-group');
                    var feitos = 0;
                
                    for (var i = 0; i < grupos.length; i++) {
                      var grupo = grupos[i];
                      var faixa = grupo.querySelector('.lanc-obra-header');
                      var tabela = grupo.querySelector('table');
                      if (!faixa || !tabela) continue;
                
                      /* o nome da obra e guardado na primeira passada e reusado depois */
                      var nome = faixa.getAttribute('data-p75-nome');
                      if (nome == null) {
                        var solto = faixa.querySelector('.p75-obra-nome');
                        nome = solto ? texto(solto).trim() : texto(faixa).trim();
                        faixa.setAttribute('data-p75-nome', nome);
                      }
                
                      var pe = lerPeDaTabela(tabela);
                      if (!pe) continue;
                      var m2 = pe.m2;
                      var custo = pe.custo;
                
                      var novo = '<span class="p75-obra-nome"></span>' +
                        '<span class="p75-selo">' +
                        '<span class="p75-m2">Metragem: ' + metragemBonita(m2) + ' m\u00b2</span>' +
                        '<span class="p75-risco">|</span>' +
                        '<span class="p75-custo">Custo: ' + dinheiro(custo) + '</span>' +
                        '</span>';
                
                      var assinatura = nome + '||' + metragemBonita(m2) + '||' + numeroBonito(custo, 2);
                      if (faixa.getAttribute('data-p75') === '1' && faixa.getAttribute('data-p75-selo') === assinatura) continue;
                
                      faixa.innerHTML = novo;
                      /* o nome entra como texto puro, nunca como pedaco de pagina */
                      faixa.firstChild.textContent = nome;
                      faixa.setAttribute('data-p75', '1');
                      faixa.setAttribute('data-p75-selo', assinatura);
                      feitos++;
                    }
                    return feitos;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 2) LINHA TOTAL GERAL AMARELA NO QUADRO DE COLABORADORES            */
                  /* ------------------------------------------------------------------ */
                  var QUADROS = ['containerResumoPgto', 'p63ResumoTabela'];
                
                  function arrumarTotalGeral() {
                    var feitos = 0;
                    for (var q = 0; q < QUADROS.length; q++) {
                      var caixa = porId(QUADROS[q]);
                      if (!caixa) continue;
                      var tabela = caixa.querySelector('table');
                      if (!tabela) continue;
                      var corpo = tabela.querySelector('tbody');
                      if (!corpo) continue;
                
                      var antiga = corpo.querySelector('tr[data-p75tg]');
                
                      if (contarLinhas(tabela) === 0) {
                        if (antiga && antiga.parentNode) antiga.parentNode.removeChild(antiga);
                        continue;
                      }
                
                      var colunas = tabela.querySelectorAll('thead th').length;
                      if (colunas < 2) continue;
                
                      var iProf = colunaPorTitulo(tabela, ['totalprofissional']);
                      var iAjud = colunaPorTitulo(tabela, ['totalajudante']);
                      var iRec = colunaPorTitulo(tabela, ['totalareceber']);
                      var iPago = colunaPorTitulo(tabela, ['valorpago']);
                
                      var valores = [];
                      valores.push({ i: iProf, v: somaColuna(tabela, iProf) });
                      valores.push({ i: iAjud, v: somaColuna(tabela, iAjud) });
                      valores.push({ i: iRec, v: somaColuna(tabela, iRec) });
                      valores.push({ i: iPago, v: somaColuna(tabela, iPago) });
                
                      var partes = [];
                      var assinatura = '';
                      for (var c = 0; c < colunas; c++) {
                        if (c === 0) {
                          partes.push('<td class="p75-rotulo-total">TOTAL GERAL</td>');
                          continue;
                        }
                        var achou = null;
                        for (var k = 0; k < valores.length; k++) {
                          if (valores[k].i === c) { achou = valores[k]; break; }
                        }
                        if (achou) {
                          partes.push('<td>' + dinheiro(achou.v) + '</td>');
                          assinatura += c + ':' + numeroBonito(achou.v, 2) + ';';
                        } else {
                          partes.push('<td></td>');
                        }
                      }
                
                      if (antiga && antiga.getAttribute('data-p75tg') === assinatura) continue;
                
                      var linha = document.createElement('tr');
                      linha.className = 'p75-total-geral';
                      linha.setAttribute('data-p75tg', assinatura);
                      linha.innerHTML = partes.join('');
                
                      if (antiga && antiga.parentNode) {
                        antiga.parentNode.replaceChild(linha, antiga);
                      } else {
                        corpo.appendChild(linha);
                      }
                      feitos++;
                    }
                    return feitos;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PASSADA COMPLETA                                                   */
                  /* ------------------------------------------------------------------ */
                  function passar() {
                    if (trabalhando) return;
                    trabalhando = true;
                    try {
                      arrumarFaixasDeObra();
                      arrumarTotalGeral();
                    } catch (e) { /* nunca atrapalha o painel */ }
                    trabalhando = false;
                  }
                
                  function agendar() {
                    if (trabalhando) return;
                    if (agendado) return;
                    agendado = setTimeout(function () { agendado = null; passar(); }, 60);
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* LIGACOES: DESENHO, TROCA DE ABA, TROCA DE MES, DIGITACAO           */
                  /* ------------------------------------------------------------------ */
                  function embrulhar(nome) {
                    var antiga = window[nome];
                    if (typeof antiga !== 'function') return false;
                    if (antiga.__p75) return true;
                    var nova = function () {
                      var r;
                      try { r = antiga.apply(this, arguments); } finally { agendar(); }
                      return r;
                    };
                    nova.__p75 = true;
                    nova.__p75antiga = antiga;
                    try { window[nome] = nova; } catch (e) { return false; }
                    return true;
                  }
                
                  var ALVOS = ['renderLancamentosPgto', 'renderResumoPgto', 'trocarSubTabPgtoNovo',
                    'mudarMesPgto', 'atualizarValorPagoPgto', 'renderPagamentoProducao'];
                
                  function ligar() {
                    for (var i = 0; i < ALVOS.length; i++) embrulhar(ALVOS[i]);
                
                    var caixas = ['containerLancamentosPgto', 'containerResumoPgto',
                      'p63ResumoTabela', 'panelPgtoLancamentos', 'panelPgtoResumo'];
                    for (var c = 0; c < caixas.length; c++) {
                      var el = porId(caixas[c]);
                      if (!el || el.getAttribute('data-p75-olho') === '1') continue;
                      try {
                        var olho = new MutationObserver(function () { agendar(); });
                        olho.observe(el, { childList: true, subtree: true });
                        el.setAttribute('data-p75-olho', '1');
                      } catch (e) { /* ignora */ }
                    }
                
                    if (!document.__p75digita) {
                      document.addEventListener('input', function (ev) {
                        var alvo = ev && ev.target;
                        if (!alvo || !alvo.closest) return;
                        if (alvo.closest('.valor-pago-cell')) agendar();
                      }, true);
                      document.addEventListener('change', function (ev) {
                        var alvo = ev && ev.target;
                        if (!alvo || !alvo.closest) return;
                        if (alvo.closest('.valor-pago-cell')) agendar();
                      }, true);
                      document.__p75digita = true;
                    }
                
                    passar();
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* COMANDOS DE CONSOLE                                                */
                  /* ------------------------------------------------------------------ */
                  P75.aplicar = function () { passar(); return true; };
                
                  P75.situacao = function () {
                    var painel = porId('panelPgtoLancamentos');
                    var faixas = painel ? painel.querySelectorAll('.lanc-obra-header[data-p75="1"]').length : 0;
                    var totais = 0;
                    for (var q = 0; q < QUADROS.length; q++) {
                      var caixa = porId(QUADROS[q]);
                      if (caixa && caixa.querySelector('tr[data-p75tg]')) totais++;
                    }
                    return true;
                  };
                
                  P75.ajuda = function () {
                    return true;
                  };
                
                  function esperar(vezes) {
                    if (porId('panelPgtoLancamentos') || typeof window.renderLancamentosPgto === 'function') {
                      ligar();
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
                  var HORAS = [900, 1500, 2600, 3200, 4800, 6500, 9000];
                  for (var h = 0; h < HORAS.length; h++) {
                    (function (t) {
                      setTimeout(function () { try { ligar(); } catch (e) { /* ignora */ } }, t);
                    }(HORAS[h]));
                  }
                
                })();
            
