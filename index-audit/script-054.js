
                /* ====== PATCH82_CTM_PRODUCAO_OK - CTM inteligente + Painel Geral + telas centralizadas ====== */
                (function () {
                  'use strict';
                  if (window.__P82) { return; }
                  window.__P82 = true;
                
                  var travado = false;
                  var assinaturaAnterior = '';
                  var MOSTRAR_ZERADOS = 'p82_mostrar_zerados_v1';
                
                  /* ---------------------------------------------------------------- *
                   * 1) leitura dos dados (mesma regra usada pela aba CTM)
                   * ---------------------------------------------------------------- */
                  function obra() {
                    try {
                      if (typeof window.getObraAtual === 'function') { return window.getObraAtual(); }
                      if (typeof getObraAtual === 'function') { return getObraAtual(); }
                    } catch (e) {}
                    return null;
                  }
                
                  function num(v) {
                    var n = Number(v);
                    return isFinite(n) ? n : 0;
                  }
                
                  function especificacoes() {
                    var o = obra();
                    if (!o || !o.itens) { return []; }
                    var lista = [], vistos = {};
                    o.itens.forEach(function (item) {
                      if (!item || !item.ref) { return; }
                      var r = String(item.ref);
                      if (!vistos[r]) {
                        vistos[r] = true;
                        lista.push({
                          ref: r,
                          L: Math.round(num(item.larg) * 1000),
                          H: Math.round(num(item.alt) * 1000),
                          qty: num(item.qtd),
                          type: item.tipo || '',
                          hasBottom: item.hasBottom !== undefined ? item.hasBottom : true,
                          ctmProfile: item.ctmProfile || 'largo'
                        });
                      } else {
                        for (var i = 0; i < lista.length; i++) {
                          if (lista[i].ref === r) { lista[i].qty += num(item.qtd); break; }
                        }
                      }
                    });
                    if (o.ctmExtraSpecs && o.ctmExtraSpecs.length) {
                      o.ctmExtraSpecs.forEach(function (es) {
                        if (!es || !es.ref) { return; }
                        var r = String(es.ref);
                        if (!vistos[r]) {
                          vistos[r] = true;
                          lista.push({
                            ref: r,
                            L: num(es.L),
                            H: num(es.H),
                            qty: num(es.qty),
                            type: es.type || '',
                            hasBottom: es.hasBottom !== undefined ? es.hasBottom : true,
                            ctmProfile: es.ctmProfile || 'largo'
                          });
                        }
                      });
                    }
                    return lista;
                  }
                
                  function liberadoPorRef() {
                    var o = obra(), mapa = {};
                    if (!o || !o.ctmLogs) { return mapa; }
                    o.ctmLogs.forEach(function (l) {
                      if (!l || l.status !== 'APROVADO') { return; }
                      var r = String(l.ref || '');
                      mapa[r] = (mapa[r] || 0) + num(l.qty);
                    });
                    return mapa;
                  }
                
                  function ajusteMedida() {
                    var el = document.getElementById('measureType');
                    var t = el ? el.value : 'base';
                    if (t === 'fora') { return 28; }
                    if (t === 'dentro') { return -4; }
                    return 0;
                  }
                
                  function acharSpec(ref) {
                    var lista = especificacoes();
                    for (var i = 0; i < lista.length; i++) {
                      if (lista[i].ref === String(ref)) { return lista[i]; }
                    }
                    return null;
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 2) lista de itens com saldo (esconde o que ja foi liberado)
                   * ---------------------------------------------------------------- */
                  function mostrarZerados() {
                    try { return localStorage.getItem(MOSTRAR_ZERADOS) === '1'; } catch (e) { return false; }
                  }
                
                  function guardarMostrarZerados(v) {
                    try { localStorage.setItem(MOSTRAR_ZERADOS, v ? '1' : '0'); } catch (e) {}
                  }
                
                  function rotulo(s, saldo) {
                    var med = (s.L || 0) + 'x' + (s.H || 0) + 'mm';
                    var lados = s.hasBottom ? '4 lados' : '3 lados';
                    var perfil = (s.ctmProfile === 'estreito') ? 'ESTREITO' : 'LARGO';
                    return s.ref + ' - ' + med + ' [' + lados + '] [' + perfil + ']' +
                           ' (Saldo: ' + saldo + ' / Total: ' + (s.qty || 0) + ')';
                  }
                
                  function montarLista() {
                    var sel = document.getElementById('refSelectCTM');
                    if (!sel) { return; }
                    var lista = especificacoes();
                    if (!lista.length) { return; }
                    var lib = liberadoPorRef();
                    var ver = mostrarZerados();
                    var atual = sel.value;
                
                    var linhas = [];
                    lista.forEach(function (s) {
                      var saldo = num(s.qty) - num(lib[s.ref]);
                      if (saldo < 0) { saldo = 0; }
                      if (saldo <= 0 && !ver && s.ref !== atual) { return; }
                      linhas.push({ ref: s.ref, txt: rotulo(s, saldo), saldo: saldo });
                    });
                
                    var assinatura = (ver ? '1|' : '0|') + atual + '|' + linhas.map(function (l) {
                      return l.ref + '=' + l.saldo;
                    }).join(';');
                    if (assinatura === assinaturaAnterior) { return; }
                
                    travado = true;
                    try {
                      sel.innerHTML = '';
                      var vazio = document.createElement('option');
                      vazio.value = '';
                      vazio.textContent = '-- Selecione o item --';
                      sel.appendChild(vazio);
                      linhas.forEach(function (l) {
                        var o = document.createElement('option');
                        o.value = l.ref;
                        o.textContent = l.txt;
                        if (l.saldo <= 0) { o.style.color = '#8a94a0'; }
                        o.setAttribute('data-p82', '1');
                        sel.appendChild(o);
                      });
                      if (atual) { sel.value = atual; }
                      assinaturaAnterior = assinatura;
                    } catch (e) {}
                    travado = false;
                
                    caixaZerados(sel);
                  }
                
                  function caixaZerados(sel) {
                    if (document.getElementById('p82VerZerados')) { return; }
                    try {
                      var lb = document.createElement('label');
                      lb.id = 'p82VerZerados';
                      lb.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;color:#9aa3af;margin:0 0 6px;cursor:pointer;';
                      var ck = document.createElement('input');
                      ck.type = 'checkbox';
                      ck.checked = mostrarZerados();
                      ck.style.cssText = 'width:13px;height:13px;margin:0;';
                      var sp = document.createElement('span');
                      sp.textContent = 'Mostrar itens sem saldo';
                      lb.appendChild(ck);
                      lb.appendChild(sp);
                      if (sel.parentNode) { sel.parentNode.insertBefore(lb, sel); }
                      ck.addEventListener('change', function () {
                        guardarMostrarZerados(ck.checked);
                        assinaturaAnterior = '';
                        montarLista();
                      });
                    } catch (e) {}
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 3) ao escolher o item: preenche medidas e quantidade
                   * ---------------------------------------------------------------- */
                  function preencher(forcar) {
                    var sel = document.getElementById('refSelectCTM');
                    if (!sel || !sel.value) { return; }
                    var s = acharSpec(sel.value);
                    if (!s) { return; }
                    var aj = ajusteMedida();
                    var pL = num(s.L) + aj;
                    var pH = num(s.H) + aj;
                
                    var eL = document.getElementById('realL');
                    var eH = document.getElementById('realH');
                    var eQ = document.getElementById('releaseQty');
                
                    if (eL) {
                      eL.placeholder = pL;
                      if (forcar || !String(eL.value || '').trim()) { eL.value = pL; }
                    }
                    if (eH) {
                      eH.placeholder = pH;
                      if (forcar || !String(eH.value || '').trim()) { eH.value = pH; }
                    }
                    if (eQ) {
                      var lib = liberadoPorRef();
                      var saldo = num(s.qty) - num(lib[s.ref]);
                      if (saldo < 1) { saldo = 1; }
                      eQ.value = saldo;
                      eQ.max = saldo;
                    }
                    try { if (typeof window.checkCTMRelease === 'function') { window.checkCTMRelease(); } } catch (e) {}
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 4) integracao com o Painel Geral de Producao
                   * ---------------------------------------------------------------- */
                  function levarParaProducao() {
                    var o = obra();
                    if (!o || !o.itens) { return 0; }
                    var falta = liberadoPorRef();
                    var sobra = {}, k;
                    for (k in falta) { if (falta.hasOwnProperty(k)) { sobra[k] = falta[k]; } }
                    var mudou = 0;
                    o.itens.forEach(function (it) {
                      if (!it || !it.ref) { return; }
                      var r = String(it.ref);
                      if (!sobra.hasOwnProperty(r)) { return; }
                      var teto = num(it.qtd);
                      var valor = Math.min(teto, sobra[r]);
                      if (valor < 0) { valor = 0; }
                      sobra[r] = sobra[r] - valor;
                      if (num(it.fem) !== valor) { it.fem = valor; mudou++; }
                    });
                    return mudou;
                  }
                
                  function atualizarPainel() {
                    var mudou = levarParaProducao();
                    try {
                      if (typeof window.salvarDB === 'function') { window.salvarDB(false); }
                    } catch (e) {}
                    try {
                      if (typeof window.render === 'function') { window.render(); }
                    } catch (e) {}
                    try {
                      if (typeof window.renderCTMDashboard === 'function') { window.renderCTMDashboard(); }
                    } catch (e) {}
                    assinaturaAnterior = '';
                    montarLista();
                    return mudou;
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 5) telas de entrada e de administracao no centro (defensivo)
                   * ---------------------------------------------------------------- */
                  function estilo() {
                    if (document.getElementById('p82Estilo')) { return; }
                    var st = document.createElement('style');
                    st.id = 'p82Estilo';
                    st.textContent = [
                      '.p69-tela, #ps79Login, #p82Centro {',
                      '  position: fixed !important; inset: 0 !important;',
                      '  align-items: center !important; justify-content: center !important;',
                      '  padding: 18px !important; overflow: auto !important;',
                      '}',
                      '.p69-tela.p69-visivel, #ps79Login { display: flex !important; }',
                      '.p69-cartao, #ps79Login .cx {',
                      '  margin: auto !important; max-height: 92vh !important; overflow: auto !important;',
                      '}',
                      '#ps79Modal {',
                      '  position: fixed !important; inset: 0 !important; display: flex !important;',
                      '  align-items: center !important; justify-content: center !important; padding: 16px !important;',
                      '}',
                      '#ps79Modal .cx { margin: auto !important; max-height: 88vh !important; overflow: auto !important; }',
                      '.p82-centralizar {',
                      '  position: fixed !important; inset: 0 !important; display: flex !important;',
                      '  align-items: center !important; justify-content: center !important;',
                      '  padding: 16px !important; overflow: auto !important;',
                      '}',
                      '.p82-centralizar > * { margin: auto !important; max-height: 92vh !important; overflow: auto !important; }'
                    ].join('\n');
                    (document.head || document.documentElement).appendChild(st);
                  }
                
                  function centralizarTelas() {
                    try {
                      var alvos = document.querySelectorAll('#p69Tela, .p69-tela, #ps79Login, #ps79Modal');
                      for (var i = 0; i < alvos.length; i++) {
                        if (alvos[i].className.indexOf('p82-centralizar') < 0) {
                          alvos[i].className += ' p82-centralizar';
                        }
                      }
                    } catch (e) {}
                  }
                
                  /* ---------------------------------------------------------------- *
                   * 6) ligacoes com as funcoes que ja existem
                   * ---------------------------------------------------------------- */
                  function envolver(nome, antes, depois) {
                    var orig = window[nome];
                    if (typeof orig !== 'function' || orig.__p82) { return; }
                    var novo = function () {
                      if (antes) { try { antes.apply(null, arguments); } catch (e) {} }
                      var r = orig.apply(this, arguments);
                      if (depois) { try { depois.apply(null, arguments); } catch (e) {} }
                      return r;
                    };
                    novo.__p82 = true;
                    window[nome] = novo;
                  }
                
                  function ligar() {
                    envolver('renderCTMDashboard', null, function () {
                      setTimeout(montarLista, 0);
                    });
                    envolver('onCTMRefChange', null, function () {
                      setTimeout(function () { preencher(false); }, 0);
                    });
                    envolver('saveVerificationCTM', null, function () {
                      setTimeout(atualizarPainel, 0);
                    });
                    envolver('resetCTMForm', null, function () {
                      assinaturaAnterior = '';
                      setTimeout(montarLista, 0);
                    });
                    envolver('trocarObra', null, function () {
                      assinaturaAnterior = '';
                      setTimeout(montarLista, 60);
                    });
                    envolver('trocarAba', null, function () {
                      assinaturaAnterior = '';
                      setTimeout(montarLista, 60);
                      setTimeout(centralizarTelas, 60);
                    });
                
                    var mt = document.getElementById('measureType');
                    if (mt && !mt.__p82) {
                      mt.__p82 = true;
                      mt.addEventListener('change', function () { preencher(true); });
                    }
                  }
                
                  function vigiar() {
                    try {
                      var mo = new MutationObserver(function () {
                        if (travado) { return; }
                        ligar();
                        montarLista();
                        centralizarTelas();
                      });
                      mo.observe(document.documentElement, { childList: true, subtree: true });
                    } catch (e) {}
                  }
                
                  function iniciar() {
                    estilo();
                    ligar();
                    centralizarTelas();
                    montarLista();
                    vigiar();
                    setInterval(function () {
                      ligar();
                      montarLista();
                      centralizarTelas();
                    }, 1500);
                  }
                
                  window.p82AtualizarPainelGeral = atualizarPainel;
                  window.p82RecarregarItensCTM = function () { assinaturaAnterior = ''; montarLista(); };
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', iniciar);
                  } else {
                    iniciar();
                  }
                })();
            
