
                /* PATCH 70: VALOR PAGO CERTO E NA IMPRESSAO (Pagamento > Resumo do Mes) */
                (function () {
                  if (window.P70 && window.P70.__v70) return;
                  var P70 = window.P70 = window.P70 || {};
                  P70.__v70 = true;
                
                  /* ------------------------------------------------------------------ */
                  /* AJUDANTES                                                          */
                  /* ------------------------------------------------------------------ */
                  function ehLista(x) { return Object.prototype.toString.call(x) === '[object Array]'; }
                
                  function listaObras() {
                    try {
                      if (window.db && ehLista(window.db.obras)) return window.db.obras;
                    } catch (e) { /* ignora */ }
                    try {
                      /* eslint-disable no-undef */
                      if (typeof db !== 'undefined' && db && ehLista(db.obras)) return db.obras;
                    } catch (e2) { /* ignora */ }
                    try {
                      if (ehLista(window.dbObras)) return window.dbObras;
                    } catch (e3) { /* ignora */ }
                    return [];
                  }
                
                  function mesAtual() {
                    try {
                      if (typeof window.getChaveMesPgto === 'function') return window.getChaveMesPgto();
                    } catch (e) { /* ignora */ }
                    return '';
                  }
                
                  function fichaColab(obra, colabId) {
                    var lista = (obra && obra.colaboradoresPgto) || [];
                    for (var i = 0; i < lista.length; i++) {
                      if (lista[i] && String(lista[i].id) === String(colabId)) return lista[i];
                    }
                    return null;
                  }
                
                  /* a obra que fica responsavel por guardar o valor pago do colaborador:
                     sempre a primeira da lista que tem ficha dele (escolha estavel) */
                  function obraDona(colabId) {
                    var obras = listaObras();
                    for (var i = 0; i < obras.length; i++) {
                      if (fichaColab(obras[i], colabId)) return obras[i].id;
                    }
                    return '';
                  }
                
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
                
                  /* valor unico do colaborador no mes: o maior valor guardado entre as
                     obras (as copias repetidas nascem sempre iguais ao digitado, por isso
                     o maior e exatamente o que a pessoa escreveu; nunca a soma) */
                  function valorUnico(colabId, mesKey) {
                    var obras = listaObras();
                    var achou = false;
                    var maior = 0;
                    for (var i = 0; i < obras.length; i++) {
                      var f = fichaColab(obras[i], colabId);
                      if (!f || !f.valorPagoManual) continue;
                      if (!(mesKey in f.valorPagoManual)) continue;
                      var n = paraNumero(f.valorPagoManual[mesKey]);
                      if (!achou || n > maior) { maior = n; achou = true; }
                    }
                    return achou ? maior : 0;
                  }
                
                  /* deixa o valor gravado em UMA obra so e zera as repeticoes */
                  function guardarEmUmLugar(colabId, mesKey, donaId, valor) {
                    var obras = listaObras();
                    var mudou = false;
                    for (var i = 0; i < obras.length; i++) {
                      var obra = obras[i];
                      var f = fichaColab(obra, colabId);
                      if (!f) continue;
                      if (!f.valorPagoManual) f.valorPagoManual = {};
                      var alvo = (String(obra.id) === String(donaId)) ? paraNumero(valor) : 0;
                      if (paraNumero(f.valorPagoManual[mesKey]) !== alvo) {
                        f.valorPagoManual[mesKey] = alvo;
                        mudou = true;
                      }
                    }
                    return mudou;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 1) GRAVACAO: guarda o que foi digitado, sem repetir em outras obras */
                  /* ------------------------------------------------------------------ */
                  function ligarGravacao() {
                    var original = window.atualizarValorPagoPgto;
                    if (typeof original !== 'function' || original.__p70) return false;
                
                    var novo = function (colabId, obraId, valor) {
                      var mesKey = mesAtual();
                      var dona = obraDona(colabId) || obraId;
                      var num = paraNumero(valor);
                      try { guardarEmUmLugar(colabId, mesKey, dona, num); } catch (e) { /* ignora */ }
                      return original.call(this, colabId, dona, num);
                    };
                    novo.__p70 = true;
                    window.atualizarValorPagoPgto = novo;
                    return true;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 2) TELA E PAPEL: valor certo no campo, eco para a impressao        */
                  /* ------------------------------------------------------------------ */
                  function dadosDoCampo(campo) {
                    var attr = campo.getAttribute('onchange') || campo.getAttribute('data-p70-alvo') || '';
                    var m = /atualizarValorPagoPgto\(\s*'([^']*)'\s*,\s*'([^']*)'/.exec(attr);
                    if (!m) return null;
                    return { colabId: m[1], obraId: m[2] };
                  }
                
                  function arrumarCampo(campo, mesKey) {
                    var d = dadosDoCampo(campo);
                    if (!d) return 0;
                
                    var valor = valorUnico(d.colabId, mesKey);
                    var dona = obraDona(d.colabId) || d.obraId;
                
                    /* o campo passa a apontar para a obra dona, sem HTML montado na mao */
                    campo.setAttribute('data-p70-alvo', "atualizarValorPagoPgto('" + d.colabId + "','" + dona + "')");
                    campo.removeAttribute('onchange');
                    if (!campo.__p70ligado) {
                      campo.__p70ligado = true;
                      campo.addEventListener('change', function () {
                        if (typeof window.atualizarValorPagoPgto === 'function') {
                          window.atualizarValorPagoPgto(d.colabId, dona, this.value);
                        }
                      });
                    }
                
                    /* mostra no campo exatamente o valor guardado */
                    var texto = valor ? String(valor) : '0';
                    if (String(campo.value) !== texto) campo.value = texto;
                
                    /* eco que some na tela e aparece no papel (mesmo estilo do resumo
                       impresso ja existente, para nao duplicar o numero) */
                    campo.setAttribute('data-p63eco', '1');
                    var pai = campo.parentNode;
                    if (pai) {
                      var eco = pai.querySelector('.p70-eco-papel');
                      if (!eco) {
                        eco = document.createElement('span');
                        eco.className = 'p63-eco-papel p70-eco-papel';
                        pai.appendChild(eco);
                      }
                      eco.textContent = dinheiro(valor);
                    }
                    return valor;
                  }
                
                  function acharItemTotais(caixa, rotulo) {
                    var itens = caixa ? caixa.querySelectorAll('.totais-item') : [];
                    for (var i = 0; i < itens.length; i++) {
                      var t = (itens[i].textContent || '').toLowerCase();
                      if (t.indexOf(rotulo) > -1) return itens[i];
                    }
                    return null;
                  }
                
                  function valorDoItem(item) {
                    if (!item) return 0;
                    var v = item.querySelector('.totais-value');
                    return v ? paraNumero(v.textContent) : 0;
                  }
                
                  function arrumarTotais(totalPago) {
                    var caixa = document.getElementById('containerTotaisPgto');
                    if (!caixa) return;
                
                    var itemPago = acharItemTotais(caixa, 'valor pago');
                    if (itemPago) {
                      var alvo = itemPago.querySelector('.totais-value');
                      if (alvo) alvo.textContent = dinheiro(totalPago);
                    }
                
                    var itemCusto = acharItemTotais(caixa, 'custo total');
                    var itemSaldo = acharItemTotais(caixa, 'saldo');
                    if (itemCusto && itemSaldo) {
                      var saldo = valorDoItem(itemCusto) - totalPago;
                      var alvoS = itemSaldo.querySelector('.totais-value');
                      if (alvoS) {
                        alvoS.textContent = dinheiro(saldo);
                        if (saldo > 0) {
                          if (alvoS.className.indexOf('totais-red') < 0) alvoS.className += ' totais-red';
                        } else {
                          alvoS.className = alvoS.className.replace(/\s*totais-red/g, '');
                        }
                      }
                    }
                  }
                
                  function arrumarResumo() {
                    var caixa = document.getElementById('containerResumoPgto');
                    if (!caixa) return;
                    var mesKey = mesAtual();
                    var campos = caixa.querySelectorAll('.valor-pago-cell input, td:last-child input[type="number"]');
                    var total = 0;
                    var vistos = {};
                    for (var i = 0; i < campos.length; i++) {
                      var campo = campos[i];
                      var d = dadosDoCampo(campo);
                      var v = arrumarCampo(campo, mesKey);
                      var chave = d ? String(d.colabId) : ('_' + i);
                      if (!vistos[chave]) { vistos[chave] = true; total += v; }
                      /* marca a celula para a impressao encontrar */
                      var cel = campo.parentNode;
                      if (cel && cel.tagName === 'TD' && cel.className.indexOf('valor-pago-cell') < 0) {
                        cel.className += ' valor-pago-cell';
                      }
                      if (cel && cel.tagName === 'TD') cel.setAttribute('data-p70', '1');
                    }
                    arrumarTotais(total);
                  }
                  P70.arrumar = arrumarResumo;
                
                  /* ------------------------------------------------------------------ */
                  /* 3) O RESUMO ABRE SEMPRE NO MES DE HOJE                             */
                  /* ------------------------------------------------------------------ */
                  function numeroDoMes(chave) {
                    var m = /^(\d{4})-(\d{1,2})$/.exec(String(chave || ''));
                    if (!m) return null;
                    return parseInt(m[1], 10) * 12 + (parseInt(m[2], 10) - 1);
                  }
                
                  function irParaMesVigente() {
                    if (typeof window.mudarMesPgto !== 'function') return false;
                    var hoje = new Date();
                    var alvo = hoje.getFullYear() * 12 + hoje.getMonth();
                    for (var passos = 0; passos < 240; passos++) {
                      var atual = numeroDoMes(mesAtual());
                      if (atual === null) return false;
                      if (atual === alvo) return true;
                      window.mudarMesPgto(atual < alvo ? 1 : -1);
                    }
                    return false;
                  }
                  P70.mesDeHoje = irParaMesVigente;
                
                  function ligarSubAba() {
                    var original = window.trocarSubTabPgtoNovo;
                    if (typeof original !== 'function' || original.__p70) return false;
                    var novo = function (tab) {
                      var r = original.apply(this, arguments);
                      if (tab === 'resumo') {
                        try { irParaMesVigente(); } catch (e) { /* ignora */ }
                        /* redesenha o mes de hoje com os lancamentos dele */
                        try {
                          if (typeof window.renderPagamento === 'function') window.renderPagamento();
                        } catch (e) { /* ignora */ }
                        try { arrumarResumo(); } catch (e) { /* ignora */ }
                      }
                      return r;
                    };
                    novo.__p70 = true;
                    window.trocarSubTabPgtoNovo = novo;
                    return true;
                  }
                
                  function ligarDesenho() {
                    var original = window.renderResumoPgto;
                    if (typeof original !== 'function' || original.__p70) return false;
                    var novo = function () {
                      var r = original.apply(this, arguments);
                      try { arrumarResumo(); } catch (e) { /* ignora */ }
                      return r;
                    };
                    novo.__p70 = true;
                    window.renderResumoPgto = novo;
                    return true;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTIDA                                                            */
                  /* ------------------------------------------------------------------ */
                  function comecar() {
                    ligarGravacao();
                    ligarDesenho();
                    ligarSubAba();
                    try { arrumarResumo(); } catch (e) { /* ignora */ }
                  }
                
                  P70.situacao = function () {
                    var mesKey = mesAtual();
                    console.log('Gravacao protegida: ' +
                      (window.atualizarValorPagoPgto && window.atualizarValorPagoPgto.__p70 ? 'sim' : 'nao'));
                    console.log('Resumo ajustado: ' +
                      (window.renderResumoPgto && window.renderResumoPgto.__p70 ? 'sim' : 'nao'));
                    console.log('Abre no mes de hoje: ' +
                      (window.trocarSubTabPgtoNovo && window.trocarSubTabPgtoNovo.__p70 ? 'sim' : 'nao'));
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
                    document.addEventListener('DOMContentLoaded', function () { esperar(40); });
                  } else {
                    esperar(40);
                  }
                })();
            
