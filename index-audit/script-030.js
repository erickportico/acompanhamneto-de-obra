
                /* === PATCH 56: OBRAFLOW DEPENDENCIAS (Etapa 2: predecessoras e agendamento) === */
                (function () {
                  "use strict";
                
                  if (window.OFDEP && window.OFDEP.__v56) { return; }
                
                  var D = window.OFDEP = window.OFDEP || {};
                  D.__v56 = true;
                
                  var ROW = 30;                 /* altura da linha, igual ao Patch 55 */
                  var TIPOS = ['FS', 'II', 'FF', 'IF'];
                  var TIPO_NOME = {
                    FS: 'Fim para Inicio (a proxima so comeca depois que esta terminar)',
                    II: 'Inicio para Inicio (comecam no mesmo dia)',
                    FF: 'Fim para Fim (terminam no mesmo dia)',
                    IF: 'Inicio para Fim (a proxima termina quando esta comecar)'
                  };
                  var TIPO_CURTO = {
                    FS: 'FS - Fim para Inicio',
                    II: 'II - Inicio para Inicio',
                    FF: 'FF - Fim para Fim',
                    IF: 'IF - Inicio para Fim'
                  };
                
                  var PADRAO = { autoAgendar: true, pularFds: false, setas: true };
                
                  var ed = { id: null, rascunho: [] };   /* estado da janela de ligacoes */
                
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
                
                  function addDias(s, n) {
                    var d = toDate(s);
                    if (!d) return '';
                    d.setDate(d.getDate() + n);
                    return toISO(d);
                  }
                
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
                
                  function proxDiaUtil(iso) {
                    var d = toDate(iso);
                    if (!d) return iso;
                    var g = 0;
                    while ((d.getDay() === 0 || d.getDay() === 6) && g < 7) { d.setDate(d.getDate() + 1); g++; }
                    return toISO(d);
                  }
                
                  function alerta(t) { try { alert(t); } catch (e) { console.log(t); } }
                
                  /* ------------------------------------------------------------------ *
                   * 2) acesso aos dados do Patch 55
                   * ------------------------------------------------------------------ */
                  function OF() { return window.OF; }
                  function pronto() { return !!(window.OF && window.OF.state && window.OF.__v55); }
                  function tarefas() { return (window.OF && window.OF.state && window.OF.state.tarefas) || []; }
                
                  function obraAtual() {
                    try {
                      if (typeof window.getObraAtual === 'function') return window.getObraAtual();
                    } catch (e) {}
                    return null;
                  }
                
                  function opc() {
                    var o = obraAtual();
                    if (!o) return PADRAO;
                    if (!o.obraflow || typeof o.obraflow !== 'object') return PADRAO;
                    if (!o.obraflow.opcoes || typeof o.obraflow.opcoes !== 'object') {
                      o.obraflow.opcoes = { autoAgendar: true, pularFds: false, setas: true };
                    }
                    var x = o.obraflow.opcoes;
                    if (x.autoAgendar === undefined) x.autoAgendar = true;
                    if (x.pularFds === undefined) x.pularFds = false;
                    if (x.setas === undefined) x.setas = true;
                    return x;
                  }
                
                  D.setOpc = function (chave, valor) {
                    var o = opc();
                    o[chave] = !!valor;
                    if (o === PADRAO) { /* sem obra: so na tela */ }
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
                
                  function duracao(t) {
                    if (!t || t.tipo === 'marco') return 0;
                    if (!t.inicio || !t.fim) return 0;
                    return Math.max(1, diasEntre(t.inicio, t.fim));
                  }
                
                  /* lista completa em ordem, com EAP, sem ligar para recolhidos/filtro */
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
                
                  function ehAncestral(possivelPai, t) {
                    var p = t ? porId(t.paiId) : null;
                    var g = 0;
                    while (p && g < 60) {
                      if (p.id === possivelPai.id) return true;
                      p = porId(p.paiId);
                      g++;
                    }
                    return false;
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 3) predecessoras: leitura, limpeza e ciclos
                   * ------------------------------------------------------------------ */
                  function preds(t) {
                    if (!t || !Array.isArray(t.predecessoras)) return [];
                    var out = [], visto = {};
                    t.predecessoras.forEach(function (p) {
                      if (!p) return;
                      var id = p.id || p.tarefaId || p.de;
                      if (!id || id === t.id || visto[id]) return;
                      if (!porId(id)) return;
                      visto[id] = true;
                      var tipo = String(p.tipo || 'FS').toUpperCase();
                      if (TIPOS.indexOf(tipo) < 0) tipo = 'FS';
                      out.push({ id: id, tipo: tipo, folga: num(p.folga, 0) });
                    });
                    return out;
                  }
                
                  /* arruma o que estiver torto e devolve quantas ligacoes foram descartadas */
                  function limparPreds() {
                    var removidas = 0;
                    tarefas().forEach(function (t) {
                      if (!Array.isArray(t.predecessoras)) {
                        if (t.predecessoras) { t.predecessoras = []; removidas++; }
                        else t.predecessoras = [];
                        return;
                      }
                      var antes = t.predecessoras.length;
                      var lim = preds(t);
                      if (lim.length !== antes) removidas += (antes - lim.length);
                      t.predecessoras = lim;
                    });
                    return removidas;
                  }
                
                  /* ordem em que as tarefas podem ser calculadas; null se houver ciclo */
                  function ordemTopologica() {
                    var estado = {}, out = [], ciclo = null;
                    function visita(t, caminho) {
                      if (!t || estado[t.id] === 2) return;
                      if (estado[t.id] === 1) { if (!ciclo) ciclo = caminho.concat([t.id]); return; }
                      estado[t.id] = 1;
                      preds(t).forEach(function (p) { visita(porId(p.id), caminho.concat([t.id])); });
                      estado[t.id] = 2;
                      out.push(t);
                    }
                    tarefas().forEach(function (t) { visita(t, []); });
                    return ciclo ? null : out;
                  }
                
                  function acharCiclo() {
                    var estado = {}, achado = null;
                    function visita(t, caminho) {
                      if (!t || estado[t.id] === 2 || achado) return;
                      if (estado[t.id] === 1) {
                        var i = caminho.indexOf(t.id);
                        achado = caminho.slice(i < 0 ? 0 : i).concat([t.id]);
                        return;
                      }
                      estado[t.id] = 1;
                      preds(t).forEach(function (p) { visita(porId(p.id), caminho.concat([t.id])); });
                      estado[t.id] = 2;
                    }
                    tarefas().forEach(function (t) { visita(t, []); });
                    return achado;
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 4) datas das fases e agendamento automatico
                   * ------------------------------------------------------------------ */
                  function calcularFases() {
                    function anda(paiId) {
                      var min = null, max = null;
                      filhos(paiId).forEach(function (t) {
                        if (filhos(t.id).length) {
                          var r = anda(t.id);
                          if (r.ini) t.inicio = r.ini;
                          if (r.fim) t.fim = r.fim;
                        }
                        if (t.tipo === 'marco') t.fim = t.inicio;
                        var a = toDate(t.inicio), b = toDate(t.fim || t.inicio);
                        if (a && (!min || a < min)) min = a;
                        if (b && (!max || b > max)) max = b;
                      });
                      return { ini: min ? toISO(min) : '', fim: max ? toISO(max) : '' };
                    }
                    anda(null);
                  }
                
                  /* data de inicio exigida por UMA ligacao */
                  function exigidoPor(p, t) {
                    var pt = porId(p.id);
                    if (!pt) return null;
                    var pi = pt.inicio || pt.fim;
                    var pf = pt.fim || pt.inicio;
                    if (!pi && !pf) return null;
                    var dur = (t.tipo === 'marco') ? 0 : Math.max(1, duracao(t));
                    var recuo = dur ? (dur - 1) : 0;
                    if (p.tipo === 'II') return addDias(pi, p.folga);
                    if (p.tipo === 'FF') return addDias(addDias(pf, p.folga), -recuo);
                    if (p.tipo === 'IF') return addDias(addDias(pi, p.folga - 1), -recuo);
                    return addDias(pf, 1 + p.folga);          /* FS */
                  }
                
                  D.reagendar = function () {
                    if (!pronto()) return { mudou: 0, ciclo: null };
                    var o = opc();
                    var ciclo = acharCiclo();
                    if (ciclo) return { mudou: 0, ciclo: ciclo };
                    if (!o.autoAgendar) { calcularFases(); return { mudou: 0, ciclo: null }; }
                
                    var mudou = 0;
                    for (var passo = 0; passo < 8; passo++) {
                      calcularFases();
                      var ordem = ordemTopologica();
                      if (!ordem) return { mudou: mudou, ciclo: acharCiclo() };
                      var alterou = false;
                      ordem.forEach(function (t) {
                        if (t.tipo === 'fase' || filhos(t.id).length) return;   /* fase segue os filhos */
                        var ps = preds(t);
                        if (!ps.length) return;
                        var dur = (t.tipo === 'marco') ? 0 : Math.max(1, duracao(t));
                        var melhor = null;
                        ps.forEach(function (p) {
                          var cand = exigidoPor(p, t);
                          if (!cand) return;
                          if (!melhor || toDate(cand) > toDate(melhor)) melhor = cand;
                        });
                        if (!melhor) return;
                        if (o.pularFds) melhor = proxDiaUtil(melhor);
                        var novoFim = dur ? addDias(melhor, dur - 1) : melhor;
                        if (t.inicio !== melhor || t.fim !== novoFim) {
                          t.inicio = melhor;
                          t.fim = novoFim;
                          alterou = true;
                          mudou++;
                        }
                      });
                      if (!alterou) break;
                    }
                    calcularFases();
                    return { mudou: mudou, ciclo: null };
                  };
                
                  D.reagendarAgora = function () {
                    var r = D.reagendar();
                    if (r.ciclo) { avisar(r.ciclo); return; }
                    try { OF().save(); } catch (e) {}
                    try { OF().render(); } catch (e) {}
                    alerta(r.mudou ? ('Pronto. ' + r.mudou + ' ajuste(s) de data aplicados pelas ligacoes.')
                                   : 'Tudo certo: nenhuma data precisou mudar.');
                  };
                
                  /* uma ligacao esta sendo desrespeitada? */
                  function violada(p, t) {
                    var exig = exigidoPor(p, t);
                    if (!exig || !t.inicio) return false;
                    return toDate(t.inicio) < toDate(exig);
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 5) barra de opcoes e aviso de ciclo
                   * ------------------------------------------------------------------ */
                  function montarBarra() {
                    var barra = document.querySelector('#tab-obraflow .of-barra');
                    if (!barra || document.getElementById('ofDepBarra')) { sincBarra(); return; }
                
                    var cx = document.createElement('span');
                    cx.id = 'ofDepBarra';
                    cx.className = 'of-dep-barra';
                    cx.innerHTML =
                      '<label class="of-dep-chk" title="Quando ligado, mexer numa tarefa empurra as seguintes">' +
                        '<input type="checkbox" id="ofDepAuto"> Agendamento automatico</label>' +
                      '<label class="of-dep-chk" title="Nenhuma tarefa comeca em sabado ou domingo">' +
                        '<input type="checkbox" id="ofDepFds"> Sem inicio no fim de semana</label>' +
                      '<label class="of-dep-chk" title="Mostrar ou esconder as setas de ligacao no grafico">' +
                        '<input type="checkbox" id="ofDepSetas"> Setas</label>' +
                      '<button class="of-btn of-mini" id="ofDepReag" title="Recalcular as datas seguindo as ligacoes">\u267B Reagendar</button>';
                    barra.appendChild(cx);
                
                    var aviso = document.createElement('div');
                    aviso.id = 'ofDepAviso';
                    aviso.className = 'of-dep-aviso';
                    aviso.style.display = 'none';
                    if (barra.parentNode) barra.parentNode.insertBefore(aviso, barra.nextSibling);
                
                    document.getElementById('ofDepAuto').addEventListener('change', function () {
                      D.setOpc('autoAgendar', this.checked);
                    });
                    document.getElementById('ofDepFds').addEventListener('change', function () {
                      D.setOpc('pularFds', this.checked);
                    });
                    document.getElementById('ofDepSetas').addEventListener('change', function () {
                      D.setOpc('setas', this.checked);
                    });
                    document.getElementById('ofDepReag').addEventListener('click', function () {
                      D.reagendarAgora();
                    });
                    sincBarra();
                  }
                
                  function sincBarra() {
                    var o = opc();
                    var a = document.getElementById('ofDepAuto');
                    var f = document.getElementById('ofDepFds');
                    var s = document.getElementById('ofDepSetas');
                    if (a) a.checked = !!o.autoAgendar;
                    if (f) f.checked = !!o.pularFds;
                    if (s) s.checked = !!o.setas;
                  }
                
                  function avisar(ciclo) {
                    var el = document.getElementById('ofDepAviso');
                    if (!el) return;
                    if (!ciclo || !ciclo.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
                    var w = mapaWbs();
                    var nomes = ciclo.map(function (id) {
                      var t = porId(id);
                      return t ? ((w[id] ? w[id] + ' ' : '') + t.nome) : '?';
                    }).join('  \u2192  ');
                    el.innerHTML = '\u26A0\uFE0F <b>Dependencia circular:</b> ' + esc(nomes) +
                      '. Uma tarefa esta esperando a outra em roda-viva, entao o agendamento automatico foi pausado. ' +
                      'Abra as ligacoes de uma dessas tarefas e apague o vinculo que fecha o circulo.';
                    el.style.display = 'block';
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 6) coluna de predecessoras na tabela
                   * ------------------------------------------------------------------ */
                  function rotulo(t, w) {
                    var ps = preds(t);
                    if (!ps.length) return '';
                    return ps.map(function (p) {
                      var f = num(p.folga, 0);
                      return (w[p.id] || '?') + p.tipo + (f > 0 ? '+' + f : (f < 0 ? String(f) : ''));
                    }).join('; ');
                  }
                
                  function injetarColuna() {
                    var w = mapaWbs();
                
                    var cab = document.querySelector('#tab-obraflow .of-cab-esq');
                    if (cab && !cab.querySelector('.of-c-pred')) {
                      var h = document.createElement('div');
                      h.className = 'of-c-pred';
                      h.textContent = 'Predecess.';
                      h.title = 'Tarefas que precisam acontecer antes desta';
                      var ac = cab.querySelector('.of-c-acoes');
                      if (ac) cab.insertBefore(h, ac); else cab.appendChild(h);
                    }
                
                    var linhas = document.querySelectorAll('#ofLinhas .of-linha');
                    for (var i = 0; i < linhas.length; i++) {
                      var linha = linhas[i];
                      var id = linha.getAttribute('data-id');
                      var t = porId(id);
                      if (!t) continue;
                
                      if (!linha.querySelector('.of-c-pred')) {
                        var cel = document.createElement('div');
                        cel.className = 'of-c-pred';
                        var txt = rotulo(t, w);
                        var span = document.createElement('span');
                        span.className = 'of-pred-txt' + (txt ? '' : ' of-pred-vazio');
                        span.textContent = txt || 'ligar...';
                        span.title = txt ? ('Ligacoes: ' + txt + ' (clique para editar)')
                                         : 'Clique para ligar esta tarefa a outra';
                        (function (tid) {
                          span.addEventListener('click', function () { D.abrirLigacoes(tid); });
                        })(t.id);
                        cel.appendChild(span);
                        var ac2 = linha.querySelector('.of-c-acoes');
                        if (ac2) linha.insertBefore(cel, ac2); else linha.appendChild(cel);
                      }
                
                      var acoes = linha.querySelector('.of-c-acoes');
                      if (acoes && !acoes.querySelector('.of-dep-link')) {
                        var b = document.createElement('button');
                        b.className = 'of-dep-link';
                        b.title = 'Ligacoes (predecessoras)';
                        b.textContent = '\uD83D\uDD17';
                        (function (tid) {
                          b.addEventListener('click', function (e) { e.stopPropagation(); D.abrirLigacoes(tid); });
                        })(t.id);
                        acoes.insertBefore(b, acoes.firstChild);
                      }
                    }
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 7) setas no Gantt
                   * ------------------------------------------------------------------ */
                  function geometria() {
                    var corpo = document.querySelector('#tab-obraflow .of-g-corpo');
                    if (!corpo) return null;
                    var linhasEsq = document.querySelectorAll('#ofLinhas .of-linha');
                    var linhasDir = corpo.querySelectorAll('.of-g-linha');
                    if (!linhasEsq.length || linhasEsq.length !== linhasDir.length) return null;
                
                    var geo = {};
                    for (var i = 0; i < linhasDir.length; i++) {
                      var id = linhasEsq[i].getAttribute('data-id');
                      var el = linhasDir[i].querySelector('.of-bar, .of-bar-resumo, .of-marco');
                      if (!id || !el) continue;
                      var left = parseFloat(el.style.left);
                      if (isNaN(left)) continue;
                      var larg = parseFloat(el.style.width);
                      if (isNaN(larg)) larg = el.className.indexOf('of-marco') >= 0 ? 13 : 0;
                      geo[id] = { x1: left, x2: left + larg, y: i * ROW + ROW / 2 };
                    }
                    return { corpo: corpo, geo: geo, linhas: linhasDir.length };
                  }
                
                  function caminho(a, b, tipo) {
                    var saiFim = (tipo === 'FS' || tipo === 'FF');
                    var chegaFim = (tipo === 'FF' || tipo === 'IF');
                    var ax = saiFim ? a.x2 : a.x1;
                    var bx = chegaFim ? b.x2 : b.x1;
                    var ay = a.y, by = b.y;
                    var stub = saiFim ? (ax + 8) : (ax - 8);
                    var apr = chegaFim ? (bx + 11) : (bx - 11);
                    var reto = chegaFim ? (stub >= apr - 0.5) : (stub <= apr + 0.5);
                    var d;
                    if (Math.abs(by - ay) < 0.5) {
                      d = 'M' + ax + ',' + ay + ' H' + bx;
                    } else if (reto) {
                      d = 'M' + ax + ',' + ay + ' H' + stub + ' V' + by + ' H' + bx;
                    } else {
                      var ym = (by > ay) ? (ay + ROW / 2) : (ay - ROW / 2);
                      d = 'M' + ax + ',' + ay + ' H' + stub + ' V' + ym + ' H' + apr + ' V' + by + ' H' + bx;
                    }
                    var p = chegaFim
                      ? (bx + ',' + by + ' ' + (bx + 7) + ',' + (by - 4) + ' ' + (bx + 7) + ',' + (by + 4))
                      : (bx + ',' + by + ' ' + (bx - 7) + ',' + (by - 4) + ' ' + (bx - 7) + ',' + (by + 4));
                    return { d: d, ponta: p };
                  }
                
                  function desenharSetas() {
                    var g = geometria();
                    if (!g) return;
                    var velha = g.corpo.querySelector('.of-setas');
                    if (velha && velha.parentNode) velha.parentNode.removeChild(velha);
                    if (!opc().setas) return;
                
                    var w = mapaWbs();
                    var partes = '';
                    var n = 0;
                    tarefas().forEach(function (t) {
                      var destino = g.geo[t.id];
                      if (!destino) return;
                      preds(t).forEach(function (p) {
                        var origem = g.geo[p.id];
                        if (!origem) return;
                        var c = caminho(origem, destino, p.tipo);
                        var ruim = violada(p, t);
                        var pt = porId(p.id);
                        var dica = (w[p.id] || '') + ' ' + (pt ? pt.nome : '') + '  \u2192  ' +
                                   (w[t.id] || '') + ' ' + t.nome + '   (' + p.tipo +
                                   (p.folga ? (p.folga > 0 ? ' +' + p.folga + 'd' : ' ' + p.folga + 'd') : '') + ')' +
                                   (ruim ? '  \u2014 ATENCAO: data atual desrespeita esta ligacao' : '');
                        partes += '<g class="of-seta-g' + (ruim ? ' of-erro' : '') + '"><title>' + esc(dica) + '</title>' +
                                  '<path d="' + c.d + '"></path>' +
                                  '<polygon class="of-pt" points="' + c.ponta + '"></polygon></g>';
                        n++;
                      });
                    });
                    if (!n) return;
                
                    var largura = parseFloat(g.corpo.style.width) || 1200;
                    var altura = g.linhas * ROW;
                    g.corpo.insertAdjacentHTML('beforeend',
                      '<svg class="of-setas" width="' + largura + '" height="' + altura + '" ' +
                      'viewBox="0 0 ' + largura + ' ' + altura + '">' + partes + '</svg>');
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 8) janela de ligacoes
                   * ------------------------------------------------------------------ */
                  function criarModal() {
                    if (document.getElementById('ofDepModal')) return;
                    var m = document.createElement('div');
                    m.id = 'ofDepModal';
                    m.className = 'of-dep-modal';
                    m.innerHTML =
                      '<div class="of-dep-box">' +
                        '<div class="of-dep-cab">' +
                          '<b id="ofDepTit">Ligacoes da tarefa</b>' +
                          '<button class="of-dep-x" id="ofDepFechar" title="Fechar">\u2715</button>' +
                        '</div>' +
                        '<div class="of-dep-info">Escolha quais tarefas precisam acontecer <b>antes</b> desta. ' +
                          'A folga em dias serve para esperar mais tempo (positiva) ou para adiantar e sobrepor (negativa).</div>' +
                        '<div class="of-dep-lista" id="ofDepLista"></div>' +
                        '<div class="of-dep-extra">' +
                          '<button class="of-btn of-mini" id="ofDepAdd">\u2795 Adicionar predecessora</button>' +
                          '<button class="of-btn of-mini" id="ofDepLimpar">\uD83E\uDDF9 Remover todas</button>' +
                          '<button class="of-btn of-mini" id="ofDepEncadear" title="Liga as subtarefas desta fase uma depois da outra">\u26D3 Encadear subtarefas</button>' +
                        '</div>' +
                        '<div class="of-dep-msg" id="ofDepMsg"></div>' +
                        '<div class="of-dep-acoes">' +
                          '<button class="of-btn" id="ofDepCancelar">Cancelar</button>' +
                          '<button class="of-btn of-btn-add" id="ofDepSalvar">Salvar ligacoes</button>' +
                        '</div>' +
                      '</div>';
                    document.body.appendChild(m);
                
                    document.getElementById('ofDepFechar').addEventListener('click', fecharModal);
                    document.getElementById('ofDepCancelar').addEventListener('click', fecharModal);
                    document.getElementById('ofDepSalvar').addEventListener('click', salvarLigacoes);
                    document.getElementById('ofDepAdd').addEventListener('click', adicionarLinha);
                    document.getElementById('ofDepLimpar').addEventListener('click', function () {
                      ed.rascunho = [];
                      desenharLista();
                    });
                    document.getElementById('ofDepEncadear').addEventListener('click', encadear);
                    m.addEventListener('click', function (e) { if (e.target === m) fecharModal(); });
                  }
                
                  function fecharModal() {
                    var m = document.getElementById('ofDepModal');
                    if (m) m.classList.remove('of-on');
                    ed.id = null;
                    ed.rascunho = [];
                  }
                
                  function msg(t, erro) {
                    var e = document.getElementById('ofDepMsg');
                    if (!e) return;
                    e.innerHTML = t ? esc(t) : '';
                    e.className = 'of-dep-msg' + (erro ? ' of-dep-erro' : '');
                  }
                
                  /* tarefas que podem virar predecessora desta */
                  function candidatas(t) {
                    return listaCheia().filter(function (x) {
                      if (x.t.id === t.id) return false;
                      if (ehAncestral(x.t, t)) return false;      /* a fase que contem a tarefa */
                      if (ehAncestral(t, x.t)) return false;      /* uma subtarefa da propria tarefa */
                      return true;
                    });
                  }
                
                  function desenharLista() {
                    var alvo = document.getElementById('ofDepLista');
                    if (!alvo) return;
                    var t = porId(ed.id);
                    if (!t) return;
                    alvo.innerHTML = '';
                
                    if (!ed.rascunho.length) {
                      var v = document.createElement('div');
                      v.className = 'of-dep-vazio';
                      v.textContent = 'Sem ligacoes. Esta tarefa comeca pela data que voce colocou nela.';
                      alvo.appendChild(v);
                      return;
                    }
                
                    var cands = candidatas(t);
                
                    ed.rascunho.forEach(function (p, idx) {
                      var linha = document.createElement('div');
                      linha.className = 'of-dep-linha';
                
                      var sel = document.createElement('select');
                      sel.className = 'of-dep-sel';
                      var vazio = document.createElement('option');
                      vazio.value = '';
                      vazio.textContent = '-- escolha a tarefa --';
                      sel.appendChild(vazio);
                      cands.forEach(function (c) {
                        var op = document.createElement('option');
                        op.value = c.t.id;
                        op.textContent = c.wbs + '  ' + c.t.nome;
                        if (c.t.id === p.id) op.selected = true;
                        sel.appendChild(op);
                      });
                      sel.addEventListener('change', function () { ed.rascunho[idx].id = this.value; msg(''); });
                
                      var tp = document.createElement('select');
                      tp.className = 'of-dep-tipo';
                      TIPOS.forEach(function (k) {
                        var op = document.createElement('option');
                        op.value = k;
                        op.textContent = TIPO_CURTO[k];
                        op.title = TIPO_NOME[k];
                        if (k === p.tipo) op.selected = true;
                        tp.appendChild(op);
                      });
                      tp.addEventListener('change', function () { ed.rascunho[idx].tipo = this.value; msg(''); });
                
                      var fg = document.createElement('input');
                      fg.type = 'number';
                      fg.step = '1';
                      fg.className = 'of-dep-folga';
                      fg.value = num(p.folga, 0);
                      fg.title = 'Folga em dias: positiva espera mais, negativa adianta';
                      fg.addEventListener('input', function () { ed.rascunho[idx].folga = num(this.value, 0); });
                
                      var lb = document.createElement('span');
                      lb.className = 'of-dep-lb';
                      lb.textContent = 'dias';
                
                      var del = document.createElement('button');
                      del.className = 'of-dep-del';
                      del.title = 'Remover esta ligacao';
                      del.textContent = '\uD83D\uDDD1';
                      del.addEventListener('click', function () {
                        ed.rascunho.splice(idx, 1);
                        desenharLista();
                      });
                
                      linha.appendChild(sel);
                      linha.appendChild(tp);
                      linha.appendChild(fg);
                      linha.appendChild(lb);
                      linha.appendChild(del);
                      alvo.appendChild(linha);
                    });
                  }
                
                  function adicionarLinha() {
                    var t = porId(ed.id);
                    if (!t) return;
                    var usados = {};
                    ed.rascunho.forEach(function (p) { usados[p.id] = true; });
                    var livre = candidatas(t).filter(function (c) { return !usados[c.t.id]; })[0];
                    ed.rascunho.push({ id: livre ? livre.t.id : '', tipo: 'FS', folga: 0 });
                    desenharLista();
                    msg('');
                  }
                
                  D.abrirLigacoes = function (id) {
                    if (!pronto()) return;
                    criarModal();
                    var t = porId(id);
                    if (!t) return;
                    ed.id = id;
                    ed.rascunho = preds(t).map(function (p) { return { id: p.id, tipo: p.tipo, folga: p.folga }; });
                    var w = mapaWbs();
                    var tit = document.getElementById('ofDepTit');
                    if (tit) tit.textContent = '\uD83D\uDD17 Ligacoes de: ' + (w[id] ? w[id] + ' ' : '') + t.nome;
                    var enc = document.getElementById('ofDepEncadear');
                    if (enc) enc.style.display = filhos(id).length > 1 ? '' : 'none';
                    msg('');
                    desenharLista();
                    var m = document.getElementById('ofDepModal');
                    if (m) m.classList.add('of-on');
                  };
                
                  function salvarLigacoes() {
                    var t = porId(ed.id);
                    if (!t) { fecharModal(); return; }
                
                    var vistos = {};
                    for (var i = 0; i < ed.rascunho.length; i++) {
                      var p = ed.rascunho[i];
                      if (!p.id) { msg('Escolha a tarefa da linha ' + (i + 1) + ' ou remova essa linha.', true); return; }
                      if (p.id === t.id) { msg('Uma tarefa nao pode esperar por ela mesma.', true); return; }
                      if (vistos[p.id]) { msg('A mesma tarefa aparece duas vezes. Deixe so uma ligacao para cada.', true); return; }
                      vistos[p.id] = true;
                    }
                
                    var antes = t.predecessoras;
                    t.predecessoras = ed.rascunho.map(function (p) {
                      return { id: p.id, tipo: p.tipo, folga: num(p.folga, 0) };
                    });
                
                    var ciclo = acharCiclo();
                    if (ciclo) {
                      t.predecessoras = antes;
                      var w = mapaWbs();
                      msg('Nao deu: isso criaria uma dependencia circular (' +
                          ciclo.map(function (id) { var x = porId(id); return (w[id] || '') + ' ' + (x ? x.nome : '?'); }).join(' -> ') +
                          '). Uma tarefa ficaria esperando a outra para sempre.', true);
                      return;
                    }
                
                    fecharModal();
                    try { OF().save(); } catch (e) {}
                    try { OF().render(); } catch (e) {}
                  }
                
                  function encadear() {
                    var t = porId(ed.id);
                    if (!t) return;
                    var fs = filhos(t.id);
                    if (fs.length < 2) { msg('Esta fase precisa de pelo menos duas subtarefas.', true); return; }
                    if (!confirm('Ligar as ' + fs.length + ' subtarefas de "' + t.nome +
                                 '" uma depois da outra (Fim para Inicio)? As ligacoes que existirem entre elas serao refeitas.')) return;
                    fs.forEach(function (f, i) {
                      if (i === 0) f.predecessoras = [];
                      else f.predecessoras = [{ id: fs[i - 1].id, tipo: 'FS', folga: 0 }];
                    });
                    var ciclo = acharCiclo();
                    if (ciclo) { msg('Nao foi possivel encadear sem criar dependencia circular.', true); return; }
                    fecharModal();
                    try { OF().save(); } catch (e) {}
                    try { OF().render(); } catch (e) {}
                    alerta('Subtarefas encadeadas. As datas foram ajustadas em sequencia.');
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 9) CSV com a coluna de predecessoras
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
                    if (!window.OF || OF().exportarCSV && OF().exportarCSV.__dep56) return;
                    var novo = function () {
                      var w = mapaWbs();
                      var lin = ['EAP;Nivel;Nome;Tipo;Inicio;Termino;Duracao;Percentual;Predecessoras;Responsavel;Observacao'];
                      listaCheia().forEach(function (x) {
                        var t = x.t;
                        lin.push([
                          x.wbs, x.nivel + 1,
                          (t.nome || '').replace(/;/g, ','),
                          (t.tipo === 'fase' || filhos(t.id).length) ? 'Fase' : (t.tipo === 'marco' ? 'Marco' : 'Tarefa'),
                          fmtBR(t.inicio), fmtBR(t.fim),
                          (t.tipo === 'marco' ? 0 : duracao(t)),
                          Math.round(num(t.percentual, 0)) + '%',
                          rotulo(t, w).replace(/;/g, ' '),
                          [].concat(t.responsaveis || []).join(' / ').replace(/;/g, ','),
                          (t.obs || '').replace(/;/g, ',').replace(/[\r\n]+/g, ' ')
                        ].join(';'));
                      });
                      baixar('obraflow_' + selo() + '.csv', '\uFEFF' + lin.join('\r\n'), 'text/csv;charset=utf-8');
                    };
                    novo.__dep56 = true;
                    OF().exportarCSV = novo;
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 10) acoplamento no Patch 55
                   * ------------------------------------------------------------------ */
                  function envolverRender() {
                    var orig = OF().render;
                    if (typeof orig !== 'function' || orig.__dep56) return;
                    var novo = function () {
                      var r = { mudou: 0, ciclo: null };
                      try { limparPreds(); r = D.reagendar(); } catch (e) { console.warn('ObraFlow dep: agenda', e); }
                      var out = orig.apply(this, arguments);
                      try {
                        montarBarra();
                        injetarColuna();
                        desenharSetas();
                        avisar(r.ciclo);
                      } catch (e) { console.warn('ObraFlow dep: tela', e); }
                      if (r.mudou) { try { OF().save(); } catch (e) {} }
                      return out;
                    };
                    novo.__dep56 = true;
                    OF().render = novo;
                  }
                
                  function envolverExcluir() {
                    var orig = OF().excluir;
                    if (typeof orig !== 'function' || orig.__dep56) return;
                    var novo = function () {
                      var out = orig.apply(this, arguments);
                      try {
                        if (limparPreds() > 0) { OF().save(); OF().render(); }
                      } catch (e) {}
                      return out;
                    };
                    novo.__dep56 = true;
                    OF().excluir = novo;
                  }
                
                  function completarLegenda() {
                    var lg = document.querySelector('#tab-obraflow .of-legenda');
                    if (!lg || lg.querySelector('.of-lg-seta')) return;
                    var s = document.createElement('span');
                    s.innerHTML = '<i class="of-lg of-lg-seta"></i> seta = ligacao entre tarefas';
                    lg.appendChild(s);
                    var e = document.createElement('span');
                    e.innerHTML = '<i class="of-lg of-lg-seta-erro"></i> seta vermelha = ligacao desrespeitada';
                    lg.appendChild(e);
                  }
                
                  function iniciar() {
                    if (!pronto()) {
                      console.warn('ObraFlow dependencias: a Etapa 1 (Patch 55) nao foi encontrada.');
                      return;
                    }
                    try { envolverRender(); } catch (e) { console.warn(e); }
                    try { envolverExcluir(); } catch (e) { console.warn(e); }
                    try { trocarCSV(); } catch (e) { console.warn(e); }
                    try { criarModal(); } catch (e) { console.warn(e); }
                    try { montarBarra(); completarLegenda(); } catch (e) {}
                    /* se a aba ja estiver aberta, redesenha ja com as novidades */
                    var aba = document.getElementById('tab-obraflow');
                    if (aba && aba.style.display !== 'none') { try { OF().render(); } catch (e) {} }
                  }
                
                  function esperar(tentativa) {
                    if (pronto()) { iniciar(); return; }
                    if (tentativa > 25) {
                      console.warn('ObraFlow dependencias: Etapa 1 nao respondeu.');
                      return;
                    }
                    setTimeout(function () { esperar(tentativa + 1); }, 200);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { esperar(0); }, 1200); });
                  } else {
                    setTimeout(function () { esperar(0); }, 1200);
                  }
                
                })();
            
