
                /* === PATCH 58: OBRAFLOW CUSTOS E RECURSOS POR TAREFA (Etapa 4) === */
                (function () {
                  "use strict";
                
                  if (window.OFCUSTO && window.OFCUSTO.__v58) { return; }
                
                  var C = window.OFCUSTO = window.OFCUSTO || {};
                  C.__v58 = true;
                
                  var TIPOS = ['FS', 'II', 'FF', 'IF'];
                
                  /* ------------------------------------------------------------------ *
                   * 1) ajudinhas de data e texto (mesmas contas das etapas anteriores)
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
                
                  function diasEntre(a, b) {
                    var d1 = toDate(a), d2 = toDate(b);
                    if (!d1 || !d2) return 0;
                    return Math.round((d2 - d1) / 86400000) + 1;
                  }
                
                  function difDias(a, b) {
                    var d1 = toDate(a), d2 = toDate(b);
                    if (!d1 || !d2) return null;
                    return Math.round((d2 - d1) / 86400000);
                  }
                
                  function fmtBR(s) {
                    var d = toDate(s);
                    if (!d) return '-';
                    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
                  }
                
                  function num(v, def) {
                    var n = parseFloat(v);
                    return isNaN(n) ? (def || 0) : n;
                  }
                
                  function alerta(t) { try { alert(t); } catch (e) { console.log(t); } }
                
                  /* ------------------------------------------------------------------ *
                   * 2) dinheiro: ler o que o usuario digitou e mostrar bonitinho
                   * ------------------------------------------------------------------ */
                
                  /* aceita 1.250,80  /  1250,8  /  1250.8  /  R$ 1.250,80  /  1.500 */
                  function lerDinheiro(v) {
                    if (v === null || v === undefined) return 0;
                    if (typeof v === 'number') return isFinite(v) ? v : 0;
                    var s = String(v).trim();
                    if (!s) return 0;
                    var neg = /^-/.test(s) || /^\(.*\)$/.test(s);
                    s = s.replace(/[Rr]\$/g, '').replace(/[^0-9.,-]/g, '').replace(/-/g, '');
                    if (!s) return 0;
                
                    var temV = s.indexOf(',') >= 0;
                    var temP = s.indexOf('.') >= 0;
                
                    if (temV && temP) {
                      /* 1.250,80 -> ponto e milhar, virgula e centavo */
                      s = s.replace(/\./g, '').replace(',', '.');
                    } else if (temV) {
                      s = s.replace(/\./g, '').replace(',', '.');
                    } else if (temP) {
                      var partes = s.split('.');
                      var ultima = partes[partes.length - 1];
                      /* 1.250 ou 1.250.000 -> ponto de milhar. 1250.8 -> centavo */
                      if (partes.length > 2 || (ultima.length === 3 && partes[0].length > 0)) s = partes.join('');
                    }
                    var n = parseFloat(s);
                    if (isNaN(n) || !isFinite(n)) return 0;
                    n = Math.round(n * 100) / 100;
                    return neg ? -n : n;
                  }
                
                  /* 1250.8 -> 1.250,80 */
                  function fmtDinheiro(n) {
                    var v = num(n, 0);
                    var neg = v < 0;
                    v = Math.abs(Math.round(v * 100) / 100);
                    var t = v.toFixed(2).split('.');
                    var inteiro = t[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    return (neg ? '-' : '') + inteiro + ',' + t[1];
                  }
                
                  function reais(n) { return 'R$ ' + fmtDinheiro(n); }
                
                  /* uma casa decimal, sem o ",0" quando for redondo: 127,8 / 120 */
                  function umaCasa(x) {
                    var p = (Math.round(x * 10) / 10).toFixed(1).split('.');
                    var inteiro = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    return p[1] === '0' ? inteiro : (inteiro + ',' + p[1]);
                  }
                
                  /* numero curto para os cartoes: 1,3 mi / 127,8 mil / 850,00 */
                  function fmtCurto(n) {
                    var v = num(n, 0);
                    var a = Math.abs(v);
                    var s = v < 0 ? '-' : '';
                    if (a >= 1000000) return s + umaCasa(a / 1000000) + ' mi';
                    if (a >= 10000) return s + umaCasa(a / 1000) + ' mil';
                    return fmtDinheiro(v);
                  }
                
                  C.lerDinheiro = lerDinheiro;
                  C.fmtDinheiro = fmtDinheiro;
                
                  /* ------------------------------------------------------------------ *
                   * 3) acesso aos dados das etapas anteriores
                   * ------------------------------------------------------------------ */
                  function OF() { return window.OF; }
                
                  function pronto() {
                    return !!(window.OF && window.OF.state && window.OF.__v55 &&
                              window.OFDEP && window.OFDEP.__v56 &&
                              window.OFBASE && window.OFBASE.__base57);
                  }
                
                  function tarefas() { return (window.OF && window.OF.state && window.OF.state.tarefas) || []; }
                
                  function obraAtual() {
                    try {
                      if (typeof window.getObraAtual === 'function') return window.getObraAtual();
                    } catch (e) {}
                    return null;
                  }
                
                  function opc() {
                    var o = obraAtual();
                    if (!o || !o.obraflow || typeof o.obraflow !== 'object') return { verCusto: true };
                    if (!o.obraflow.opcoes || typeof o.obraflow.opcoes !== 'object') o.obraflow.opcoes = {};
                    var x = o.obraflow.opcoes;
                    if (x.verCusto === undefined) x.verCusto = true;
                    return x;
                  }
                
                  function verCusto() { return !!opc().verCusto; }
                
                  function porId(id) {
                    var l = tarefas();
                    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
                    return null;
                  }
                
                  function filhos(paiId) {
                    var out = tarefas().filter(function (t) {
                      if (paiId === null) return !t.paiId || !porId(t.paiId);
                      return t.paiId === paiId;
                    });
                    out.sort(function (a, b) { return num(a.ordem, 0) - num(b.ordem, 0); });
                    return out;
                  }
                
                  function temFilhos(t) { return t ? filhos(t.id).length > 0 : false; }
                  function ehResumo(t) { return !!t && (t.tipo === 'fase' || temFilhos(t)); }
                
                  function duracao(t) {
                    if (!t || t.tipo === 'marco') return 0;
                    if (!t.inicio || !t.fim) return 0;
                    return Math.max(1, diasEntre(t.inicio, t.fim));
                  }
                
                  function listaCheia() {
                    var out = [];
                    function anda(paiId, prefixo, nivel) {
                      filhos(paiId).forEach(function (t, i) {
                        var wbs = prefixo ? (prefixo + '.' + (i + 1)) : String(i + 1);
                        out.push({ t: t, wbs: wbs, nivel: nivel });
                        anda(t.id, wbs, nivel + 1);
                      });
                    }
                    anda(null, '', 0);
                    return out;
                  }
                
                  function mapaWbs() {
                    var m = {};
                    listaCheia().forEach(function (x) { m[x.t.id] = x.wbs; });
                    return m;
                  }
                
                  function preds(t) {
                    if (!t || !Array.isArray(t.predecessoras)) return [];
                    var out = [], visto = {};
                    t.predecessoras.forEach(function (p) {
                      if (!p) return;
                      var id = p.id || p.tarefaId || p.de;
                      if (!id || id === t.id || visto[id] || !porId(id)) return;
                      visto[id] = true;
                      var tipo = String(p.tipo || 'FS').toUpperCase();
                      if (TIPOS.indexOf(tipo) < 0) tipo = 'FS';
                      out.push({ id: id, tipo: tipo, folga: num(p.folga, 0) });
                    });
                    return out;
                  }
                
                  function rotuloPred(t, w) {
                    var ps = preds(t);
                    if (!ps.length) return '';
                    return ps.map(function (p) {
                      var f = num(p.folga, 0);
                      return (w[p.id] || '?') + p.tipo + (f > 0 ? '+' + f : (f < 0 ? String(f) : ''));
                    }).join('; ');
                  }
                
                  function baseDe(t) {
                    if (!t || !t.baseline || typeof t.baseline !== 'object') return null;
                    var b = t.baseline;
                    var i = b.inicio || b.start || '';
                    var f = b.fim || b.end || i;
                    if (!toDate(i)) return null;
                    return { inicio: toISO(toDate(i)), fim: toISO(toDate(f) || toDate(i)),
                             pct: num(b.pct, 0), custo: num(b.custo, 0) };
                  }
                
                  function desvioDias(t) {
                    var b = baseDe(t);
                    if (!b) return null;
                    var fimAgora = (t.tipo === 'marco' ? t.inicio : (t.fim || t.inicio));
                    if (!fimAgora) return null;
                    return difDias(b.fim, fimAgora);
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 4) o coracao da etapa: somar custo das subtarefas nas fases
                   * ------------------------------------------------------------------ */
                  function limparCusto(t) {
                    t.custoPrevisto = Math.round(num(t.custoPrevisto, 0) * 100) / 100;
                    t.custoReal = Math.round(num(t.custoReal, 0) * 100) / 100;
                  }
                
                  /* soma de baixo para cima. Fase nunca guarda valor proprio: e a soma dos filhos */
                  function somar(paiId) {
                    var prev = 0, real = 0;
                    filhos(paiId === undefined ? null : paiId).forEach(function (t) {
                      limparCusto(t);
                      if (temFilhos(t)) {
                        var r = somar(t.id);
                        t.custoPrevisto = r.prev;
                        t.custoReal = r.real;
                      }
                      prev += num(t.custoPrevisto, 0);
                      real += num(t.custoReal, 0);
                    });
                    return { prev: Math.round(prev * 100) / 100, real: Math.round(real * 100) / 100 };
                  }
                
                  C.somar = function () { return somar(null); };
                
                  function totais() {
                    var g = somar(null);
                    return { prev: g.prev, real: g.real, saldo: Math.round((g.prev - g.real) * 100) / 100 };
                  }
                
                  C.totais = totais;
                
                  function saldoDe(t) {
                    return Math.round((num(t.custoPrevisto, 0) - num(t.custoReal, 0)) * 100) / 100;
                  }
                
                  /* quanto "deveria" ter gasto ate agora, pelo % concluido */
                  function previstoNoAndamento(t) {
                    return Math.round(num(t.custoPrevisto, 0) * (num(t.percentual, 0) / 100) * 100) / 100;
                  }
                
                  function classeSaldo(prev, real, saldo) {
                    if (!prev && !real) return 'of-cus-nada';
                    if (saldo > 0.004) return 'of-cus-sob';
                    if (saldo < -0.004) return 'of-cus-pas';
                    return 'of-cus-zero';
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 5) campos de custo dentro do modal de cadastro
                   * ------------------------------------------------------------------ */
                  function el(id) { return document.getElementById(id); }
                  function val(id) { var e = el(id); return e ? e.value : ''; }
                  function setVal(id, v) { var e = el(id); if (e) e.value = v; }
                
                  function camposModal() {
                    var form = document.querySelector('#tab-obraflow .of-form');
                    if (!form || el('ofFCustoPrev')) return;
                
                    var l1 = document.createElement('label');
                    l1.className = 'of-cus-lb';
                    l1.innerHTML = 'Custo previsto (R$)' +
                      '<input type="text" id="ofFCustoPrev" inputmode="decimal" autocomplete="off" ' +
                      'placeholder="Ex: 12.500,00" title="Quanto voce planeja gastar nesta tarefa">';
                
                    var l2 = document.createElement('label');
                    l2.className = 'of-cus-lb';
                    l2.innerHTML = 'Custo real (R$)' +
                      '<input type="text" id="ofFCustoReal" inputmode="decimal" autocomplete="off" ' +
                      'placeholder="Ex: 11.980,50" title="Quanto realmente foi gasto ate agora">';
                
                    var l3 = document.createElement('label');
                    l3.className = 'of-cus-lb';
                    l3.innerHTML = 'Saldo (previsto - real)' +
                      '<input type="text" id="ofFCustoSaldo" readonly tabindex="-1" ' +
                      'title="Calculado sozinho. Verde sobrou, vermelho passou do previsto">';
                
                    var ref = form.querySelector('.of-full');
                    if (ref) {
                      form.insertBefore(l1, ref);
                      form.insertBefore(l2, ref);
                      form.insertBefore(l3, ref);
                    } else {
                      form.appendChild(l1); form.appendChild(l2); form.appendChild(l3);
                    }
                
                    ['ofFCustoPrev', 'ofFCustoReal'].forEach(function (id) {
                      var e = el(id);
                      if (!e) return;
                      e.addEventListener('input', sincSaldo);
                      e.addEventListener('blur', function () {
                        var n = lerDinheiro(this.value);
                        this.value = (this.value || '').trim() ? fmtDinheiro(n) : '';
                        sincSaldo();
                      });
                    });
                    sincSaldo();
                  }
                
                  function sincSaldo() {
                    var s = el('ofFCustoSaldo');
                    if (!s) return;
                    var p = lerDinheiro(val('ofFCustoPrev'));
                    var r = lerDinheiro(val('ofFCustoReal'));
                    var vazio = !(val('ofFCustoPrev') || '').trim() && !(val('ofFCustoReal') || '').trim();
                    var saldo = Math.round((p - r) * 100) / 100;
                    s.value = vazio ? '' : fmtDinheiro(saldo);
                    s.className = vazio ? 'of-cus-nada' : classeSaldo(p, r, saldo);
                    s.title = vazio
                      ? 'Preencha o previsto e o real para ver o saldo'
                      : (saldo > 0 ? 'Sobrando ' + reais(saldo) + ' do previsto'
                                   : (saldo < 0 ? 'Passou ' + reais(-saldo) + ' do previsto'
                                                : 'Gastou exatamente o previsto'));
                  }
                
                  function encherCampos(t) {
                    camposModal();
                    if (!t) {
                      setVal('ofFCustoPrev', '');
                      setVal('ofFCustoReal', '');
                    } else {
                      setVal('ofFCustoPrev', num(t.custoPrevisto, 0) ? fmtDinheiro(t.custoPrevisto) : '');
                      setVal('ofFCustoReal', num(t.custoReal, 0) ? fmtDinheiro(t.custoReal) : '');
                    }
                    sincSaldo();
                    travarSeFase();
                  }
                
                  /* fase nao aceita valor digitado: o valor dela e a soma das subtarefas */
                  function travarSeFase() {
                    var tipo = val('ofFTipo');
                    var fase = (tipo === 'fase');
                    ['ofFCustoPrev', 'ofFCustoReal'].forEach(function (id) {
                      var e = el(id);
                      if (!e) return;
                      e.disabled = fase;
                      if (e.parentNode) e.parentNode.style.opacity = fase ? 0.45 : 1;
                    });
                    var s = el('ofFCustoSaldo');
                    if (s && s.parentNode) s.parentNode.style.opacity = fase ? 0.45 : 1;
                    if (fase) {
                      var av = el('ofAviso');
                      if (av) {
                        var extra = 'O custo da Fase e a soma das subtarefas, por isso os campos de dinheiro ficam desligados aqui.';
                        if ((av.innerHTML || '').indexOf('soma das subtarefas, por isso') < 0) {
                          av.innerHTML = (av.innerHTML ? av.innerHTML + '<br>' : '') + extra;
                        }
                      }
                    }
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 6) colunas de custo na tabela
                   * ------------------------------------------------------------------ */
                  function ondeEncaixar(pai) {
                    return pai.querySelector('.of-c-desv') ||
                           pai.querySelector('.of-c-pred') ||
                           pai.querySelector('.of-c-acoes') || null;
                  }
                
                  function cabecalho() {
                    var cab = document.querySelector('#tab-obraflow .of-cab-esq');
                    if (!cab) return;
                    if (!cab.querySelector('.of-c-cprev')) {
                      var ref = ondeEncaixar(cab);
                      var a = document.createElement('div');
                      a.className = 'of-c-custo of-c-cprev';
                      a.textContent = 'Custo prev.';
                      a.title = 'Quanto foi planejado gastar (R$). Nas Fases, e a soma das subtarefas';
                      var b = document.createElement('div');
                      b.className = 'of-c-custo of-c-creal';
                      b.textContent = 'Custo real';
                      b.title = 'Quanto ja foi gasto de verdade (R$)';
                      if (ref) { cab.insertBefore(a, ref); cab.insertBefore(b, ref); }
                      else { cab.appendChild(a); cab.appendChild(b); }
                    }
                    var mostrar = verCusto();
                    var cs = cab.querySelectorAll('.of-c-custo');
                    for (var i = 0; i < cs.length; i++) cs[i].style.display = mostrar ? '' : 'none';
                  }
                
                  function dicaLinha(t) {
                    var p = num(t.custoPrevisto, 0), r = num(t.custoReal, 0), s = saldoDe(t);
                    var l = [(ehResumo(t) ? 'Fase "' : '"') + (t.nome || '') + '"'];
                    l.push('Previsto: ' + reais(p));
                    l.push('Real: ' + reais(r));
                    if (!p && !r) l.push('Sem valor lancado ainda');
                    else if (s > 0) l.push('Sobrando: ' + reais(s));
                    else if (s < 0) l.push('Passou do previsto: ' + reais(-s));
                    else l.push('Bateu exatamente o previsto');
                    if (p && !ehResumo(t) && t.tipo !== 'marco') {
                      var d = duracao(t);
                      if (d > 0) l.push('Media por dia: ' + reais(p / d));
                    }
                    if (p) {
                      var esperado = previstoNoAndamento(t);
                      l.push('Pelo andamento (' + Math.round(num(t.percentual, 0)) + '%), o gasto esperado seria ' + reais(esperado));
                      if (r > esperado + 0.004) l.push('Atencao: gastou ' + reais(r - esperado) + ' acima do ritmo da obra');
                    }
                    var b = baseDe(t);
                    if (b && b.custo) {
                      var dif = Math.round((p - b.custo) * 100) / 100;
                      l.push('Linha de base: ' + reais(b.custo) +
                             (dif === 0 ? ' (igual ao combinado)'
                                        : (dif > 0 ? ' (hoje esta ' + reais(dif) + ' mais caro)'
                                                   : ' (hoje esta ' + reais(-dif) + ' mais barato)')));
                    }
                    if (ehResumo(t)) l.push('Para mudar, edite o custo das subtarefas.');
                    return l.join('\n');
                  }
                
                  function injetarCelulas() {
                    if (!verCusto()) return;
                    var linhas = document.querySelectorAll('#ofLinhas .of-linha');
                    for (var i = 0; i < linhas.length; i++) {
                      var linha = linhas[i];
                      if (linha.querySelector('.of-c-cprev')) continue;
                      var t = porId(linha.getAttribute('data-id'));
                      if (!t) continue;
                
                      var p = num(t.custoPrevisto, 0), r = num(t.custoReal, 0);
                      var s = saldoDe(t);
                      var dica = dicaLinha(t);
                
                      var cp = document.createElement('div');
                      cp.className = 'of-c-custo of-c-cprev' + (p ? '' : ' of-cus-nada') + (ehResumo(t) ? ' of-cus-soma' : '');
                      cp.textContent = p ? fmtDinheiro(p) : '-';
                      cp.title = dica;
                
                      var cr = document.createElement('div');
                      cr.className = 'of-c-custo of-c-creal ' + classeSaldo(p, r, s) + (ehResumo(t) ? ' of-cus-soma' : '');
                      cr.textContent = r ? fmtDinheiro(r) : '-';
                      cr.title = dica;
                
                      var ref = ondeEncaixar(linha);
                      if (ref) { linha.insertBefore(cp, ref); linha.insertBefore(cr, ref); }
                      else { linha.appendChild(cp); linha.appendChild(cr); }
                    }
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 7) cartoes de resumo do dinheiro
                   * ------------------------------------------------------------------ */
                  function montarMetricas() {
                    var m = document.querySelector('#tab-obraflow .of-metricas');
                    if (!m || el('ofCMPrev')) return;
                    [['ofCMPrev', 'Custo previsto'], ['ofCMReal', 'Custo realizado'], ['ofCMSaldo', 'Saldo']]
                      .forEach(function (x) {
                        var d = document.createElement('div');
                        d.className = 'of-mcard of-cus-mc';
                        d.innerHTML = '<span>' + x[1] + '</span><strong id="' + x[0] + '">0,00</strong>';
                        m.appendChild(d);
                      });
                  }
                
                  function atualizarMetricas() {
                    var g = totais();
                    var pct = g.prev ? Math.round((g.real / g.prev) * 100) : 0;
                
                    var a = el('ofCMPrev');
                    if (a) {
                      a.textContent = fmtCurto(g.prev);
                      a.className = 'of-cus-prev';
                      a.title = 'Total planejado para a obra: ' + reais(g.prev);
                    }
                    var b = el('ofCMReal');
                    if (b) {
                      b.textContent = fmtCurto(g.real);
                      b.className = g.prev && g.real > g.prev ? 'of-cus-pas' : 'of-cus-real';
                      b.title = 'Total ja gasto: ' + reais(g.real) +
                                (g.prev ? ('\nIsso e ' + pct + '% do previsto') : '');
                    }
                    var c = el('ofCMSaldo');
                    if (c) {
                      c.textContent = fmtCurto(g.saldo);
                      c.className = classeSaldo(g.prev, g.real, g.saldo);
                      if (!g.prev && !g.real) c.title = 'Lance o custo das tarefas para acompanhar o dinheiro da obra';
                      else if (g.saldo > 0) c.title = 'Ainda sobra ' + reais(g.saldo) + ' do que foi previsto';
                      else if (g.saldo < 0) c.title = 'A obra passou ' + reais(-g.saldo) + ' do previsto';
                      else c.title = 'O gasto esta exatamente igual ao previsto';
                    }
                
                    var selo = el('ofCusSelo');
                    if (selo) {
                      if (!g.prev && !g.real) {
                        selo.textContent = 'Sem custos lancados';
                        selo.className = 'of-cus-selo';
                        selo.title = 'Abra uma tarefa no lapis e preencha o custo previsto';
                      } else {
                        selo.textContent = pct + '% do previsto gasto';
                        selo.className = 'of-cus-selo' + (g.prev && g.real > g.prev ? ' of-cus-selo-ruim' : ' of-cus-selo-on');
                        selo.title = 'Gasto ' + reais(g.real) + ' de ' + reais(g.prev);
                      }
                    }
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 8) barra de botoes e legenda
                   * ------------------------------------------------------------------ */
                  function montarBarra() {
                    var barra = document.querySelector('#tab-obraflow .of-barra');
                    if (!barra) return;
                    if (el('ofCusBarra')) { sincBarra(); return; }
                
                    var cx = document.createElement('span');
                    cx.id = 'ofCusBarra';
                    cx.className = 'of-cus-barra';
                    cx.innerHTML =
                      '<label class="of-cus-chk" title="Mostra ou esconde as colunas de dinheiro na tabela">' +
                        '<input type="checkbox" id="ofCusVer"> Ver custos</label>' +
                      '<span class="of-cus-selo" id="ofCusSelo"></span>';
                    barra.appendChild(cx);
                
                    var chk = el('ofCusVer');
                    if (chk) chk.addEventListener('change', function () {
                      if (window.OFBASE && typeof window.OFBASE.setOpc === 'function') {
                        window.OFBASE.setOpc('verCusto', this.checked);
                      } else {
                        opc().verCusto = this.checked;
                        try { OF().save(); } catch (e) {}
                        try { OF().render(); } catch (e) {}
                      }
                    });
                    sincBarra();
                  }
                
                  function sincBarra() {
                    var v = el('ofCusVer');
                    if (v) v.checked = verCusto();
                  }
                
                  function completarLegenda() {
                    var lg = document.querySelector('#tab-obraflow .of-legenda');
                    if (!lg || lg.querySelector('.of-lg-cussob')) return;
                    var a = document.createElement('span');
                    a.innerHTML = '<i class="of-lg of-lg-cussob"></i> custo real verde = dentro do previsto';
                    lg.appendChild(a);
                    var b = document.createElement('span');
                    b.innerHTML = '<i class="of-lg of-lg-cuspas"></i> custo real vermelho = passou do previsto';
                    lg.appendChild(b);
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 9) CSV com as colunas de dinheiro (19 colunas)
                   * ------------------------------------------------------------------ */
                  function baixar(nome, texto, tipo) {
                    var blob = new Blob([texto], { type: tipo || 'text/plain;charset=utf-8' });
                    var a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = nome;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(function () {
                      URL.revokeObjectURL(a.href);
                      if (a.parentNode) a.parentNode.removeChild(a);
                    }, 1500);
                  }
                
                  function selo() {
                    var d = new Date();
                    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' +
                           pad(d.getHours()) + pad(d.getMinutes());
                  }
                
                  function dadosBase() {
                    if (window.OFBASE && typeof window.OFBASE.dados === 'function') {
                      try { return window.OFBASE.dados(); } catch (e) {}
                    }
                    return { folga: {}, crit: {} };
                  }
                
                  function trocarCSV() {
                    if (!window.OF || typeof OF().exportarCSV !== 'function' || OF().exportarCSV.__v58) return;
                    var novo = function () {
                      somar(null);
                      var w = mapaWbs();
                      var c = dadosBase();
                      var lin = ['EAP;Nivel;Nome;Tipo;Inicio;Termino;Duracao;Percentual;Predecessoras;' +
                                 'Base Inicio;Base Termino;Desvio (dias);Folga (dias);Critico;' +
                                 'Custo Previsto;Custo Real;Saldo;Responsavel;Observacao'];
                      listaCheia().forEach(function (x) {
                        var t = x.t;
                        var b = baseDe(t);
                        var dv = desvioDias(t);
                        var fg = c.folga[t.id];
                        lin.push([
                          x.wbs, x.nivel + 1,
                          (t.nome || '').replace(/;/g, ','),
                          ehResumo(t) ? 'Fase' : (t.tipo === 'marco' ? 'Marco' : 'Tarefa'),
                          fmtBR(t.inicio), fmtBR(t.tipo === 'marco' ? t.inicio : t.fim),
                          (t.tipo === 'marco' ? 0 : duracao(t)),
                          Math.round(num(t.percentual, 0)) + '%',
                          rotuloPred(t, w).replace(/;/g, ' '),
                          b ? fmtBR(b.inicio) : '-',
                          b ? fmtBR(b.fim) : '-',
                          (dv === null || dv === undefined) ? '-' : dv,
                          (fg === undefined || fg === null) ? '-' : fg,
                          c.crit[t.id] ? 'Sim' : 'Nao',
                          fmtDinheiro(t.custoPrevisto),
                          fmtDinheiro(t.custoReal),
                          fmtDinheiro(saldoDe(t)),
                          [].concat(t.responsaveis || []).join(' / ').replace(/;/g, ','),
                          (t.obs || '').replace(/;/g, ',').replace(/[\r\n]+/g, ' ')
                        ].join(';'));
                      });
                      var g = totais();
                      lin.push(['', '', 'TOTAL DA OBRA', '', '', '', '', '', '', '', '', '', '', '',
                                fmtDinheiro(g.prev), fmtDinheiro(g.real), fmtDinheiro(g.saldo), '', ''].join(';'));
                      baixar('obraflow_' + selo() + '.csv', '\uFEFF' + lin.join('\r\n'), 'text/csv;charset=utf-8');
                    };
                    novo.__v58 = true;
                    novo.__base57 = true;
                    novo.__dep56 = true;
                    OF().exportarCSV = novo;
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 10) acoplamento por cima das etapas 1, 2 e 3
                   * ------------------------------------------------------------------ */
                  function depoisDoRender() {
                    montarBarra();
                    montarMetricas();
                    camposModal();
                    cabecalho();
                    injetarCelulas();
                    atualizarMetricas();
                    completarLegenda();
                    sincBarra();
                  }
                
                  C.repintar = function () { try { somar(null); depoisDoRender(); } catch (e) { console.warn(e); } };
                
                  function envolverRender() {
                    var orig = OF().render;
                    if (typeof orig !== 'function' || orig.__v58) return;
                    var novo = function () {
                      try { somar(null); } catch (e) { console.warn('ObraFlow custos: contas', e); }
                      var out = orig.apply(this, arguments);
                      try { depoisDoRender(); } catch (e) { console.warn('ObraFlow custos: tela', e); }
                      return out;
                    };
                    novo.__v58 = true;
                    novo.__base57 = true;
                    novo.__dep56 = true;
                    OF().render = novo;
                  }
                
                  function envolverAbrirCampos(nome, pegarTarefa) {
                    var orig = OF()[nome];
                    if (typeof orig !== 'function' || orig.__v58) return;
                    var novo = function () {
                      var out = orig.apply(this, arguments);
                      try { encherCampos(pegarTarefa.apply(this, arguments)); } catch (e) { console.warn(e); }
                      return out;
                    };
                    novo.__v58 = true;
                    OF()[nome] = novo;
                  }
                
                  function envolverTrocarTipo() {
                    var orig = OF().aoTrocarTipo;
                    if (typeof orig !== 'function' || orig.__v58) return;
                    var novo = function () {
                      var out = orig.apply(this, arguments);
                      try { travarSeFase(); } catch (e) {}
                      return out;
                    };
                    novo.__v58 = true;
                    OF().aoTrocarTipo = novo;
                  }
                
                  /* o Salvar do Patch 55 fecha o modal e monta os dados por dentro,
                     entao lemos os campos ANTES e aplicamos na tarefa DEPOIS */
                  function envolverSalvar() {
                    var orig = OF().salvarModal;
                    if (typeof orig !== 'function' || orig.__v58) return;
                    var novo = function () {
                      var editando = OF().state ? OF().state.editandoId : null;
                      var tipo = val('ofFTipo');
                      var textoP = (val('ofFCustoPrev') || '').trim();
                      var textoR = (val('ofFCustoReal') || '').trim();
                      var cp = lerDinheiro(textoP);
                      var cr = lerDinheiro(textoR);
                      var antes = tarefas().length;
                
                      var out = orig.apply(this, arguments);
                
                      try {
                        var modal = el('ofModal');
                        var aberto = !!(modal && modal.className.indexOf('of-on') >= 0);
                        if (aberto) return out;                       /* nao salvou: faltou algo */
                
                        var alvo = null;
                        if (editando) alvo = porId(editando);
                        else if (tarefas().length > antes) alvo = tarefas()[tarefas().length - 1];
                
                        if (alvo && tipo !== 'fase' && !temFilhos(alvo)) {
                          alvo.custoPrevisto = textoP ? cp : 0;
                          alvo.custoReal = textoR ? cr : 0;
                        }
                        somar(null);
                        OF().save();
                        OF().render();
                      } catch (e) { console.warn('ObraFlow custos: salvar', e); }
                      return out;
                    };
                    novo.__v58 = true;
                    OF().salvarModal = novo;
                  }
                
                  function iniciar() {
                    if (!pronto()) {
                      console.warn('ObraFlow custos: as Etapas 1, 2 e 3 (Patches 55, 56 e 57) nao foram encontradas.');
                      return;
                    }
                    try { envolverRender(); } catch (e) { console.warn(e); }
                    try { envolverSalvar(); } catch (e) { console.warn(e); }
                    try { envolverTrocarTipo(); } catch (e) { console.warn(e); }
                    try {
                      envolverAbrirCampos('editar', function (id) { return porId(id); });
                      envolverAbrirCampos('novaFase', function () { return null; });
                      envolverAbrirCampos('novaFilha', function () { return null; });
                    } catch (e) { console.warn(e); }
                    try { trocarCSV(); } catch (e) { console.warn(e); }
                    try { montarBarra(); montarMetricas(); camposModal(); completarLegenda(); } catch (e) {}
                    var aba = el('tab-obraflow');
                    if (aba && aba.style.display !== 'none') { try { OF().render(); } catch (e) {} }
                  }
                
                  function esperar(tentativa) {
                    if (pronto() && typeof OF().render === 'function' && OF().render.__base57) { iniciar(); return; }
                    if (tentativa > 40) {
                      if (pronto()) { iniciar(); return; }
                      console.warn('ObraFlow custos: as Etapas 1, 2 e 3 nao responderam.');
                      return;
                    }
                    setTimeout(function () { esperar(tentativa + 1); }, 200);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { esperar(0); }, 1600); });
                  } else {
                    setTimeout(function () { esperar(0); }, 1600);
                  }
                
                })();
            
