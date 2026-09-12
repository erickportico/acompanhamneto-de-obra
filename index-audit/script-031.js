
                /* === PATCH 57: OBRAFLOW LINHA DE BASE E CAMINHO CRITICO (Etapa 3) === */
                (function () {
                  "use strict";
                
                  if (window.OFBASE && window.OFBASE.__base57) { return; }
                
                  var B = window.OFBASE = window.OFBASE || {};
                  B.__base57 = true;
                
                  var ROW = 30;                                  /* altura da linha, igual ao Patch 55 */
                  var PADRAO = { verBase: true, verCritico: true };
                  var TIPOS = ['FS', 'II', 'FF', 'IF'];
                
                  /* ------------------------------------------------------------------ *
                   * 1) ajudinhas
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
                
                  function maisDias(d, n) {
                    if (!d) return null;
                    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
                  }
                
                  /* diferenca simples em dias: negativo = antes, positivo = depois */
                  function difDias(a, b) {
                    var d1 = toDate(a), d2 = toDate(b);
                    if (!d1 || !d2) return null;
                    return Math.round((d2 - d1) / 86400000);
                  }
                
                  /* dias corridos contando as duas pontas, igual ao Patch 55 */
                  function diasEntre(a, b) {
                    var d1 = toDate(a), d2 = toDate(b);
                    if (!d1 || !d2) return 0;
                    return Math.round((d2 - d1) / 86400000) + 1;
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
                
                  function esc(v) {
                    return String(v == null ? '' : v)
                      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                  }
                
                  function alerta(t) { try { alert(t); } catch (e) { console.log(t); } }
                  function perguntar(t) { try { return !!confirm(t); } catch (e) { return true; } }
                
                  /* ------------------------------------------------------------------ *
                   * 2) acesso aos dados das Etapas 1 e 2
                   * ------------------------------------------------------------------ */
                  function OF() { return window.OF; }
                  function pronto() {
                    return !!(window.OF && window.OF.state && window.OF.__v55 &&
                              window.OFDEP && window.OFDEP.__v56);
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
                    if (!o || !o.obraflow || typeof o.obraflow !== 'object') return PADRAO;
                    if (!o.obraflow.opcoes || typeof o.obraflow.opcoes !== 'object') o.obraflow.opcoes = {};
                    var x = o.obraflow.opcoes;
                    if (x.verBase === undefined) x.verBase = true;
                    if (x.verCritico === undefined) x.verCritico = true;
                    return x;
                  }
                
                  B.setOpc = function (chave, valor) {
                    var o = opc();
                    o[chave] = !!valor;
                    try { OF().save(); } catch (e) {}
                    try { OF().render(); } catch (e) {}
                  };
                
                  function porId(id) {
                    var l = tarefas();
                    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
                    return null;
                  }
                
                  function filhos(paiId) {
                    var l = tarefas();
                    var out = l.filter(function (t) {
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
                
                  /* ordem de calculo: predecessoras primeiro. null se houver roda-viva */
                  function ordemTopologica() {
                    var estado = {}, out = [], ciclo = false;
                    function visita(t) {
                      if (!t || estado[t.id] === 2) return;
                      if (estado[t.id] === 1) { ciclo = true; return; }
                      estado[t.id] = 1;
                      preds(t).forEach(function (p) { visita(porId(p.id)); });
                      estado[t.id] = 2;
                      out.push(t);
                    }
                    tarefas().forEach(function (t) { visita(t); });
                    return ciclo ? null : out;
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 3) linha de base (a foto do plano combinado)
                   * ------------------------------------------------------------------ */
                  function base(t) {
                    if (!t || !t.baseline || typeof t.baseline !== 'object') return null;
                    var b = t.baseline;
                    var i = b.inicio || b.start || '';
                    var f = b.fim || b.end || i;
                    if (!toDate(i)) return null;
                    return {
                      inicio: toISO(toDate(i)),
                      fim: toISO(toDate(f) || toDate(i)),
                      pct: num(b.pct, 0),
                      custo: num(b.custo, 0)
                    };
                  }
                
                  /* joga fora linha de base torta (ex: veio de backup antigo) */
                  function arrumarBase() {
                    var ruins = 0;
                    tarefas().forEach(function (t) {
                      if (t.baseline == null) { t.baseline = null; return; }
                      var b = base(t);
                      if (!b) { t.baseline = null; ruins++; return; }
                      t.baseline = { inicio: b.inicio, fim: b.fim, pct: b.pct, custo: b.custo };
                    });
                    return ruins;
                  }
                
                  function temBase() {
                    var l = tarefas();
                    for (var i = 0; i < l.length; i++) if (base(l[i])) return true;
                    return false;
                  }
                
                  function dataBase() {
                    var o = obraAtual();
                    if (!o || !o.obraflow) return '';
                    return o.obraflow.baseSalvaEm || '';
                  }
                
                  function baseDurTexto(b) {
                    var d = diasEntre(b.inicio, b.fim);
                    return d + (d === 1 ? ' dia' : ' dias');
                  }
                
                  B.salvarBase = function () {
                    if (!pronto()) return;
                    var l = tarefas();
                    if (!l.length) { alerta('Nao ha tarefas para guardar na linha de base.'); return; }
                    if (temBase() && !perguntar('Ja existe uma linha de base guardada' +
                        (dataBase() ? ' (' + fmtBR(dataBase()) + ')' : '') + '.\n\n' +
                        'Quer substituir pela situacao de hoje? O que estava guardado antes sera perdido.')) return;
                
                    var n = 0;
                    l.forEach(function (t) {
                      if (!t.inicio && !t.fim) { t.baseline = null; return; }
                      t.baseline = {
                        inicio: toISO(toDate(t.inicio || t.fim)),
                        fim: toISO(toDate((t.tipo === 'marco' ? t.inicio : t.fim) || t.inicio)),
                        pct: Math.round(num(t.percentual, 0)),
                        custo: num(t.custoPrevisto, 0)
                      };
                      n++;
                    });
                    var o = obraAtual();
                    if (o && o.obraflow) o.obraflow.baseSalvaEm = toISO(new Date());
                
                    try { OF().save(); } catch (e) {}
                    try { OF().render(); } catch (e) {}
                    alerta('Linha de base guardada com ' + n + ' tarefa(s).\n\n' +
                           'A partir de agora o painel mostra, em cinza, o plano que voce combinou, ' +
                           'e a coluna Desvio avisa quanto cada tarefa saiu do combinado.');
                  };
                
                  B.limparBase = function () {
                    if (!pronto()) return;
                    if (!temBase()) { alerta('Nao existe linha de base guardada.'); return; }
                    if (!perguntar('Apagar a linha de base guardada?\n\n' +
                                   'As datas atuais das tarefas NAO mudam. Voce so perde a comparacao com o plano antigo.')) return;
                    tarefas().forEach(function (t) { t.baseline = null; });
                    var o = obraAtual();
                    if (o && o.obraflow) o.obraflow.baseSalvaEm = '';
                    try { OF().save(); } catch (e) {}
                    try { OF().render(); } catch (e) {}
                    alerta('Linha de base apagada.');
                  };
                
                  /* desvio em dias entre o combinado e o de agora (+ = atrasou) */
                  function desvio(t) {
                    var b = base(t);
                    if (!b) return null;
                    var fimAgora = (t.tipo === 'marco' ? t.inicio : (t.fim || t.inicio));
                    if (!fimAgora) return null;
                    return {
                      fim: difDias(b.fim, fimAgora),
                      inicio: difDias(b.inicio, t.inicio || fimAgora)
                    };
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 4) caminho critico e folga total
                   * ------------------------------------------------------------------ */
                  function calcular() {
                    var vazio = { folga: {}, crit: {}, fim: null, nCrit: 0, ciclo: false };
                    if (!pronto()) return vazio;
                
                    var folhas = tarefas().filter(function (t) { return !ehResumo(t); });
                    if (!folhas.length) return vazio;
                
                    var eFolha = {};
                    folhas.forEach(function (t) { eFolha[t.id] = true; });
                
                    /* quem vem depois de quem */
                    var suc = {};
                    folhas.forEach(function (t) { suc[t.id] = []; });
                    folhas.forEach(function (t) {
                      preds(t).forEach(function (p) {
                        if (!eFolha[p.id]) return;                 /* fase como predecessora: ignora aqui */
                        suc[p.id].push({ id: t.id, tipo: p.tipo, folga: p.folga });
                      });
                    });
                
                    var fimProj = null;
                    folhas.forEach(function (t) {
                      var f = toDate(t.fim || t.inicio);
                      if (f && (!fimProj || f > fimProj)) fimProj = f;
                    });
                    if (!fimProj) return vazio;
                
                    var ordem = ordemTopologica();
                    if (!ordem) { vazio.ciclo = true; vazio.fim = fimProj; return vazio; }
                
                    var fila = ordem.filter(function (t) { return eFolha[t.id]; });
                    var LF = {}, LS = {}, folga = {}, crit = {}, nCrit = 0;
                
                    for (var i = fila.length - 1; i >= 0; i--) {
                      var t = fila[i];
                      var ef = toDate((t.tipo === 'marco' ? t.inicio : (t.fim || t.inicio)));
                      if (!ef) continue;
                      var dur = (t.tipo === 'marco') ? 0 : Math.max(1, duracao(t));
                      var recuo = dur ? (dur - 1) : 0;
                      var lf = null;
                
                      suc[t.id].forEach(function (s) {
                        if (!LF[s.id]) return;
                        var lim;
                        if (s.tipo === 'II') lim = maisDias(LS[s.id], -s.folga + recuo);
                        else if (s.tipo === 'FF') lim = maisDias(LF[s.id], -s.folga);
                        else if (s.tipo === 'IF') lim = maisDias(LF[s.id], 1 - s.folga + recuo);
                        else lim = maisDias(LS[s.id], -1 - s.folga);      /* FS */
                        if (lim && (!lf || lim < lf)) lf = lim;
                      });
                
                      if (!lf) lf = fimProj;
                      LF[t.id] = lf;
                      LS[t.id] = maisDias(lf, -recuo);
                      folga[t.id] = Math.round((lf - ef) / 86400000);
                      if (folga[t.id] <= 0) { crit[t.id] = true; nCrit++; }
                    }
                
                    /* fase herda o pior caso das subtarefas */
                    (function subir(paiId) {
                      filhos(paiId).forEach(function (t) {
                        if (!ehResumo(t)) return;
                        subir(t.id);
                        var menor = null, algum = false;
                        (function conta(x) {
                          filhos(x).forEach(function (f) {
                            if (ehResumo(f)) { conta(f.id); return; }
                            if (folga[f.id] === undefined) return;
                            if (menor === null || folga[f.id] < menor) menor = folga[f.id];
                            if (crit[f.id]) algum = true;
                          });
                        })(t.id);
                        if (menor !== null) folga[t.id] = menor;
                        if (algum) crit[t.id] = true;
                      });
                    })(null);
                
                    return { folga: folga, crit: crit, fim: fimProj, nCrit: nCrit, ciclo: false };
                  }
                
                  B.dados = calcular;
                  B.folgaDe = function (id) { var c = calcular(); return c.folga[id]; };
                  B.criticoDe = function (id) { return !!calcular().crit[id]; };
                
                  /* ------------------------------------------------------------------ *
                   * 5) barra de botoes
                   * ------------------------------------------------------------------ */
                  function montarBarra() {
                    var barra = document.querySelector('#tab-obraflow .of-barra');
                    if (!barra) return;
                    if (document.getElementById('ofBaseBarra')) { sincBarra(); return; }
                
                    var cx = document.createElement('span');
                    cx.id = 'ofBaseBarra';
                    cx.className = 'of-base-barra';
                    cx.innerHTML =
                      '<button class="of-btn of-mini" id="ofBaseSalvar" ' +
                        'title="Guarda uma foto do plano de hoje para comparar depois">\uD83D\uDCCC Salvar linha de base</button>' +
                      '<button class="of-btn of-mini" id="ofBaseLimpar" ' +
                        'title="Apaga a foto guardada (as datas atuais nao mudam)">\uD83E\uDDF9 Limpar base</button>' +
                      '<label class="of-base-chk" title="Mostra em cinza, embaixo de cada barra, o plano combinado">' +
                        '<input type="checkbox" id="ofBaseVer"> Ver linha de base</label>' +
                      '<label class="of-base-chk" title="Destaca em vermelho as tarefas que empurram a data final da obra">' +
                        '<input type="checkbox" id="ofBaseCrit"> Caminho critico</label>' +
                      '<span class="of-base-selo" id="ofBaseSelo"></span>';
                    barra.appendChild(cx);
                
                    document.getElementById('ofBaseSalvar').addEventListener('click', function () { B.salvarBase(); });
                    document.getElementById('ofBaseLimpar').addEventListener('click', function () { B.limparBase(); });
                    document.getElementById('ofBaseVer').addEventListener('change', function () {
                      B.setOpc('verBase', this.checked);
                    });
                    document.getElementById('ofBaseCrit').addEventListener('change', function () {
                      B.setOpc('verCritico', this.checked);
                    });
                    sincBarra();
                  }
                
                  function sincBarra() {
                    var o = opc();
                    var v = document.getElementById('ofBaseVer');
                    var c = document.getElementById('ofBaseCrit');
                    if (v) v.checked = !!o.verBase;
                    if (c) c.checked = !!o.verCritico;
                    var s = document.getElementById('ofBaseSelo');
                    if (s) {
                      if (temBase()) {
                        s.textContent = 'Base de ' + (dataBase() ? fmtBR(dataBase()) : 'plano guardado');
                        s.title = 'Linha de base guardada. O cinza no grafico e o combinado.';
                        s.className = 'of-base-selo of-base-selo-on';
                      } else {
                        s.textContent = 'Sem linha de base';
                        s.title = 'Clique em Salvar linha de base para congelar o plano de hoje.';
                        s.className = 'of-base-selo';
                      }
                    }
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 6) colunas Desvio e Folga
                   * ------------------------------------------------------------------ */
                  function ondeEncaixar(pai) {
                    return pai.querySelector('.of-c-pred') || pai.querySelector('.of-c-acoes') || null;
                  }
                
                  function cabecalho() {
                    var cab = document.querySelector('#tab-obraflow .of-cab-esq');
                    if (!cab || cab.querySelector('.of-c-desv')) return;
                    var ref = ondeEncaixar(cab);
                
                    var d = document.createElement('div');
                    d.className = 'of-c-desv';
                    d.textContent = 'Desvio';
                    d.title = 'Quantos dias o termino saiu do plano combinado (linha de base)';
                
                    var f = document.createElement('div');
                    f.className = 'of-c-folga';
                    f.textContent = 'Folga';
                    f.title = 'Folga total: quantos dias a tarefa pode atrasar sem empurrar o fim da obra';
                
                    if (ref) { cab.insertBefore(d, ref); cab.insertBefore(f, ref); }
                    else { cab.appendChild(d); cab.appendChild(f); }
                  }
                
                  function textoDesvio(dv) {
                    if (!dv || dv.fim === null) return { txt: '-', cls: 'of-desv-nada', dica: 'Sem linha de base para comparar' };
                    var n = dv.fim;
                    if (n === 0) return { txt: '0', cls: 'of-desv-zero', dica: 'Termino exatamente como o combinado' };
                    if (n > 0) return {
                      txt: '+' + n, cls: 'of-desv-mais',
                      dica: 'Terminando ' + n + ' dia(s) DEPOIS do combinado'
                    };
                    return {
                      txt: String(n), cls: 'of-desv-menos',
                      dica: 'Terminando ' + Math.abs(n) + ' dia(s) ANTES do combinado'
                    };
                  }
                
                  function textoFolga(v, ehCrit) {
                    if (v === undefined || v === null) return { txt: '-', cls: 'of-folga-nada', dica: 'Sem datas para calcular' };
                    if (v < 0) return {
                      txt: String(v), cls: 'of-folga-neg',
                      dica: 'Atenciozinho: esta tarefa esta ' + Math.abs(v) + ' dia(s) em cima do limite. Ja empurrou o fim da obra.'
                    };
                    if (v === 0) return {
                      txt: '0', cls: 'of-folga-zero',
                      dica: 'Caminho critico: qualquer atraso aqui atrasa o fim da obra'
                    };
                    return {
                      txt: String(v), cls: 'of-folga-ok',
                      dica: 'Pode atrasar ate ' + v + ' dia(s) sem mexer no fim da obra' + (ehCrit ? '' : '')
                    };
                  }
                
                  function injetarCelulas(c) {
                    var linhas = document.querySelectorAll('#ofLinhas .of-linha');
                    var verCrit = !!opc().verCritico;
                
                    for (var i = 0; i < linhas.length; i++) {
                      var linha = linhas[i];
                      var t = porId(linha.getAttribute('data-id'));
                      if (!t) continue;
                
                      if (!linha.querySelector('.of-c-desv')) {
                        var dv = textoDesvio(desvio(t));
                        var cd = document.createElement('div');
                        cd.className = 'of-c-desv ' + dv.cls;
                        cd.textContent = dv.txt;
                        var b = base(t);
                        cd.title = dv.dica + (b ? ('\nCombinado: ' + fmtBR(b.inicio) + ' a ' + fmtBR(b.fim) +
                                                   ' (' + baseDurTexto(b) + ')') : '');
                
                        var fg = textoFolga(c.folga[t.id], !!c.crit[t.id]);
                        var cf = document.createElement('div');
                        cf.className = 'of-c-folga ' + fg.cls;
                        cf.textContent = fg.txt;
                        cf.title = fg.dica;
                
                        var ref = ondeEncaixar(linha);
                        if (ref) { linha.insertBefore(cd, ref); linha.insertBefore(cf, ref); }
                        else { linha.appendChild(cd); linha.appendChild(cf); }
                      }
                
                      if (verCrit && c.crit[t.id]) linha.classList.add('of-critico');
                      else linha.classList.remove('of-critico');
                    }
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 7) barra fantasma no Gantt e pintura do caminho critico
                   * ------------------------------------------------------------------ */
                  function geometria() {
                    var corpo = document.querySelector('#tab-obraflow .of-g-corpo');
                    if (!corpo) return null;
                    var esq = document.querySelectorAll('#ofLinhas .of-linha');
                    var dir = corpo.querySelectorAll('.of-g-linha');
                    if (!esq.length || esq.length !== dir.length) return null;
                    return { corpo: corpo, esq: esq, dir: dir };
                  }
                
                  /* mesma conta de limites do Patch 55, para casar com o desenho */
                  function diaZero(g) {
                    var min = null, max = null;
                    for (var i = 0; i < g.esq.length; i++) {
                      var t = porId(g.esq[i].getAttribute('data-id'));
                      if (!t) continue;
                      var a = toDate(t.inicio), b2 = toDate(t.fim || t.inicio);
                      if (a && (!min || a < min)) min = a;
                      if (b2 && (!max || b2 > max)) max = b2;
                    }
                    if (!min || !max) return null;
                    return maisDias(min, -2);
                  }
                
                  function desenharFantasmas(c) {
                    var g = geometria();
                    if (!g) return;
                
                    /* limpa o que possa ter sobrado de um desenho anterior */
                    var velhas = g.corpo.querySelectorAll('.of-base-bar');
                    for (var v = 0; v < velhas.length; v++) {
                      if (velhas[v].parentNode) velhas[v].parentNode.removeChild(velhas[v]);
                    }
                
                    var verCrit = !!opc().verCritico;
                    var verBase = !!opc().verBase;
                    var zero = diaZero(g);
                    var W = num(OF().state.larguraDia, 26);
                
                    for (var i = 0; i < g.esq.length; i++) {
                      var t = porId(g.esq[i].getAttribute('data-id'));
                      if (!t) continue;
                      var cel = g.dir[i];
                
                      /* pinta a barra de hoje quando ela esta no caminho critico */
                      var barra = cel.querySelector('.of-bar, .of-bar-resumo, .of-marco');
                      if (barra) {
                        if (verCrit && c.crit[t.id]) barra.classList.add('of-critico');
                        else barra.classList.remove('of-critico');
                      }
                
                      if (!verBase || !zero) continue;
                      var b = base(t);
                      if (!b) continue;
                
                      var off = (diasEntre(toISO(zero), b.inicio) - 1) * W;
                      var larg;
                      if (t.tipo === 'marco') {
                        larg = Math.max(7, W * 0.6);
                        off = off + (W / 2) - (larg / 2);
                      } else {
                        var dur = Math.max(1, diasEntre(b.inicio, b.fim));
                        larg = Math.max(W * 0.6, dur * W - 2);
                      }
                
                      var corte = false;
                      if (off < 0) { larg = larg + off; off = 0; corte = true; }
                      if (larg < 3) larg = 3;
                
                      var f = document.createElement('div');
                      f.className = 'of-base-bar' + (corte ? ' of-base-corte' : '') +
                                    (ehResumo(t) ? ' of-base-fase' : '');
                      f.style.left = off + 'px';
                      f.style.width = larg + 'px';
                      var dv = desvio(t);
                      f.title = 'Linha de base de "' + t.nome + '": ' + fmtBR(b.inicio) + ' a ' + fmtBR(b.fim) +
                                ' (' + baseDurTexto(b) + ')' +
                                (dv && dv.fim !== null
                                  ? (dv.fim === 0 ? '  \u2014 em dia com o combinado'
                                                  : (dv.fim > 0 ? '  \u2014 hoje esta ' + dv.fim + ' dia(s) atrasada'
                                                                : '  \u2014 hoje esta ' + Math.abs(dv.fim) + ' dia(s) adiantada'))
                                  : '');
                      cel.appendChild(f);
                    }
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 8) metricas e legenda
                   * ------------------------------------------------------------------ */
                  function montarMetricas() {
                    var m = document.querySelector('#tab-obraflow .of-metricas');
                    if (!m || document.getElementById('ofBMDesvio')) return;
                    var a = document.createElement('div');
                    a.className = 'of-mcard of-base-mc';
                    a.innerHTML = '<span>Desvio do prazo</span><strong id="ofBMDesvio">-</strong>';
                    m.appendChild(a);
                    var b = document.createElement('div');
                    b.className = 'of-mcard of-base-mc';
                    b.innerHTML = '<span>Caminho critico</span><strong id="ofBMCrit">0</strong>';
                    m.appendChild(b);
                  }
                
                  function atualizarMetricas(c) {
                    var dv = null, temAlgo = false;
                    var baseFim = null, agoraFim = null;
                    tarefas().forEach(function (t) {
                      if (ehResumo(t)) return;
                      var b = base(t);
                      if (b) {
                        temAlgo = true;
                        var bf = toDate(b.fim);
                        if (bf && (!baseFim || bf > baseFim)) baseFim = bf;
                      }
                      var af = toDate(t.tipo === 'marco' ? t.inicio : (t.fim || t.inicio));
                      if (af && (!agoraFim || af > agoraFim)) agoraFim = af;
                    });
                    if (temAlgo && baseFim && agoraFim) dv = Math.round((agoraFim - baseFim) / 86400000);
                
                    var el = document.getElementById('ofBMDesvio');
                    if (el) {
                      if (dv === null) {
                        el.textContent = '-';
                        el.className = 'of-desv-nada';
                        el.title = 'Guarde uma linha de base para comparar o prazo';
                      } else if (dv === 0) {
                        el.textContent = 'em dia';
                        el.className = 'of-desv-zero';
                        el.title = 'A obra termina no dia que foi combinado (' + fmtBR(toISO(baseFim)) + ')';
                      } else if (dv > 0) {
                        el.textContent = '+' + dv + ' d';
                        el.className = 'of-desv-mais';
                        el.title = 'A obra esta terminando ' + dv + ' dia(s) depois do combinado. Combinado: ' +
                                   fmtBR(toISO(baseFim)) + ' / agora: ' + fmtBR(toISO(agoraFim));
                      } else {
                        el.textContent = dv + ' d';
                        el.className = 'of-desv-menos';
                        el.title = 'A obra esta terminando ' + Math.abs(dv) + ' dia(s) antes do combinado. Combinado: ' +
                                   fmtBR(toISO(baseFim)) + ' / agora: ' + fmtBR(toISO(agoraFim));
                      }
                    }
                
                    var el2 = document.getElementById('ofBMCrit');
                    if (el2) {
                      el2.textContent = String(c.nCrit);
                      el2.className = c.nCrit ? 'of-crit-num' : '';
                      el2.title = c.ciclo
                        ? 'Nao foi possivel calcular: existe dependencia circular'
                        : (c.nCrit + ' tarefa(s) sem folga nenhuma. Atrasar qualquer uma delas atrasa a entrega' +
                           (c.fim ? ' de ' + fmtBR(toISO(c.fim)) : '') + '.');
                    }
                  }
                
                  function completarLegenda() {
                    var lg = document.querySelector('#tab-obraflow .of-legenda');
                    if (!lg || lg.querySelector('.of-lg-base')) return;
                    var a = document.createElement('span');
                    a.innerHTML = '<i class="of-lg of-lg-base"></i> cinza fino = linha de base (combinado)';
                    lg.appendChild(a);
                    var b = document.createElement('span');
                    b.innerHTML = '<i class="of-lg of-lg-crit"></i> contorno vermelho = caminho critico';
                    lg.appendChild(b);
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 9) CSV com linha de base, desvio e folga
                   * ------------------------------------------------------------------ */
                  function baixar(nome, texto, tipo) {
                    var blob = new Blob([texto], { type: tipo || 'text/plain;charset=utf-8' });
                    var a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = nome;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(function () { URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
                  }
                
                  function selo() {
                    var d = new Date();
                    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' +
                           pad(d.getHours()) + pad(d.getMinutes());
                  }
                
                  function trocarCSV() {
                    if (!window.OF || typeof OF().exportarCSV !== 'function' || OF().exportarCSV.__base57) return;
                    var novo = function () {
                      var w = mapaWbs();
                      var c = calcular();
                      var lin = ['EAP;Nivel;Nome;Tipo;Inicio;Termino;Duracao;Percentual;Predecessoras;' +
                                 'Base Inicio;Base Termino;Desvio (dias);Folga (dias);Critico;Responsavel;Observacao'];
                      listaCheia().forEach(function (x) {
                        var t = x.t;
                        var b = base(t);
                        var dv = desvio(t);
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
                          (dv && dv.fim !== null) ? dv.fim : '-',
                          (fg === undefined || fg === null) ? '-' : fg,
                          c.crit[t.id] ? 'Sim' : 'Nao',
                          [].concat(t.responsaveis || []).join(' / ').replace(/;/g, ','),
                          (t.obs || '').replace(/;/g, ',').replace(/[\r\n]+/g, ' ')
                        ].join(';'));
                      });
                      baixar('obraflow_' + selo() + '.csv', '\uFEFF' + lin.join('\r\n'), 'text/csv;charset=utf-8');
                    };
                    novo.__base57 = true;
                    novo.__dep56 = true;
                    OF().exportarCSV = novo;
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 10) acoplamento por cima das Etapas 1 e 2
                   * ------------------------------------------------------------------ */
                  function depoisDoRender() {
                    var c = calcular();
                    montarBarra();
                    montarMetricas();
                    cabecalho();
                    injetarCelulas(c);
                    desenharFantasmas(c);
                    atualizarMetricas(c);
                    completarLegenda();
                    sincBarra();
                    return c;
                  }
                
                  B.repintar = function () { try { depoisDoRender(); } catch (e) { console.warn(e); } };
                
                  function envolverRender() {
                    var orig = OF().render;
                    if (typeof orig !== 'function' || orig.__base57) return;
                    var novo = function () {
                      try { arrumarBase(); } catch (e) { console.warn('ObraFlow base: dados', e); }
                      var out = orig.apply(this, arguments);
                      try { depoisDoRender(); } catch (e) { console.warn('ObraFlow base: tela', e); }
                      return out;
                    };
                    novo.__base57 = true;
                    novo.__dep56 = true;
                    OF().render = novo;
                  }
                
                  function iniciar() {
                    if (!pronto()) {
                      console.warn('ObraFlow linha de base: as Etapas 1 e 2 (Patches 55 e 56) nao foram encontradas.');
                      return;
                    }
                    try { envolverRender(); } catch (e) { console.warn(e); }
                    try { trocarCSV(); } catch (e) { console.warn(e); }
                    try { montarBarra(); montarMetricas(); completarLegenda(); } catch (e) {}
                    var aba = document.getElementById('tab-obraflow');
                    if (aba && aba.style.display !== 'none') { try { OF().render(); } catch (e) {} }
                  }
                
                  function esperar(tentativa) {
                    if (pronto() && typeof OF().render === 'function' && OF().render.__dep56) { iniciar(); return; }
                    if (tentativa > 40) {
                      if (pronto()) { iniciar(); return; }
                      console.warn('ObraFlow linha de base: Etapas 1 e 2 nao responderam.');
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
            
