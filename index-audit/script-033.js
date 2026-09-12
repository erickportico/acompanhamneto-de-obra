
                /* === PATCH 59: OBRAFLOW EXPORTACAO DO PLANO (Etapa 5) === */
                (function () {
                  "use strict";
                
                  if (window.OFEXP && window.OFEXP.__v59) { return; }
                
                  var X = window.OFEXP = window.OFEXP || {};
                  X.__v59 = true;
                
                  var TIPOS = ['FS', 'II', 'FF', 'IF'];
                
                  /* ------------------------------------------------------------------ *
                   * 1) ajudinhas de data, numero e texto
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
                
                  function fmtBR(s) {
                    var d = toDate(s);
                    if (!d) return '-';
                    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
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
                
                  function num(v, def) {
                    var n = parseFloat(v);
                    return isNaN(n) ? (def || 0) : n;
                  }
                
                  function alerta(t) { try { alert(t); } catch (e) { console.log(t); } }
                
                  /* data do Excel: 1 = 01/01/1900, contando de 30/12/1899 */
                  function serieExcel(s) {
                    var d = toDate(s);
                    if (!d) return null;
                    var base = Date.UTC(1899, 11, 30);
                    var hoje = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
                    return Math.round((hoje - base) / 86400000);
                  }
                
                  function limpar1linha(v) {
                    return String(v === null || v === undefined ? '' : v).replace(/[\r\n\t]+/g, ' ');
                  }
                
                  function escXml(v) {
                    return String(v === null || v === undefined ? '' : v)
                      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;');
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 2) acesso aos dados das etapas 1 a 4
                   * ------------------------------------------------------------------ */
                  function OF() { return window.OF; }
                  function el(id) { return document.getElementById(id); }
                
                  function pronto() {
                    return !!(window.OF && window.OF.state && window.OF.__v55 &&
                              window.OFDEP && window.OFDEP.__v56 &&
                              window.OFBASE && window.OFBASE.__base57 &&
                              window.OFCUSTO && window.OFCUSTO.__v58);
                  }
                
                  function tarefas() { return (window.OF && window.OF.state && window.OF.state.tarefas) || []; }
                
                  function obraAtual() {
                    try {
                      if (typeof window.getObraAtual === 'function') return window.getObraAtual();
                    } catch (e) {}
                    return null;
                  }
                
                  function nomeObra() {
                    var o = obraAtual();
                    var n = o && (o.nome || o.name);
                    return n ? String(n) : '';
                  }
                
                  function tituloPlano() {
                    var t = el('ofTitulo');
                    var s = t ? String(t.innerText || t.textContent || '').trim() : '';
                    return s || 'PLANO MESTRE DA OBRA';
                  }
                
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
                    return { inicio: toISO(toDate(i)), fim: toISO(toDate(f) || toDate(i)), custo: num(b.custo, 0) };
                  }
                
                  function desvioDias(t) {
                    var b = baseDe(t);
                    if (!b) return null;
                    var fimAgora = (t.tipo === 'marco' ? t.inicio : (t.fim || t.inicio));
                    if (!fimAgora) return null;
                    return difDias(b.fim, fimAgora);
                  }
                
                  function dadosBase() {
                    if (window.OFBASE && typeof window.OFBASE.dados === 'function') {
                      try { return window.OFBASE.dados(); } catch (e) {}
                    }
                    return { folga: {}, crit: {} };
                  }
                
                  function somar() {
                    if (window.OFCUSTO && typeof window.OFCUSTO.somar === 'function') {
                      try { return window.OFCUSTO.somar(); } catch (e) {}
                    }
                    return { prev: 0, real: 0 };
                  }
                
                  function totais() {
                    if (window.OFCUSTO && typeof window.OFCUSTO.totais === 'function') {
                      try { return window.OFCUSTO.totais(); } catch (e) {}
                    }
                    return { prev: 0, real: 0, saldo: 0 };
                  }
                
                  function fmtDinheiro(n) {
                    if (window.OFCUSTO && typeof window.OFCUSTO.fmtDinheiro === 'function') {
                      try { return window.OFCUSTO.fmtDinheiro(n); } catch (e) {}
                    }
                    var v = num(n, 0), neg = v < 0;
                    v = Math.abs(Math.round(v * 100) / 100);
                    var t = v.toFixed(2).split('.');
                    return (neg ? '-' : '') + t[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + t[1];
                  }
                
                  function centavos(v) { return Math.round(num(v, 0) * 100) / 100; }
                
                  /* ------------------------------------------------------------------ *
                   * 3) as 19 colunas do plano, num so lugar, servindo CSV e Excel
                   * ------------------------------------------------------------------ */
                  function colunas() {
                    return [
                      { rot: 'EAP', larg: 10, tipo: 'txt', v: function (r) { return r.wbs; } },
                      { rot: 'Nivel', larg: 7, tipo: 'int', v: function (r) { return r.nivel + 1; } },
                      { rot: 'Nome', larg: 46, tipo: 'nome', v: function (r) { return limpar1linha(r.t.nome || ''); } },
                      { rot: 'Tipo', larg: 10, tipo: 'txt', v: function (r) { return r.rotuloTipo; } },
                      { rot: 'Inicio', larg: 12, tipo: 'data', v: function (r) { return r.t.inicio || ''; } },
                      { rot: 'Termino', larg: 12, tipo: 'data',
                        v: function (r) { return (r.t.tipo === 'marco' ? r.t.inicio : r.t.fim) || ''; } },
                      { rot: 'Duracao', larg: 9, tipo: 'int',
                        v: function (r) { return r.t.tipo === 'marco' ? 0 : duracao(r.t); } },
                      { rot: 'Percentual', larg: 11, tipo: 'pct',
                        v: function (r) { return Math.round(num(r.t.percentual, 0)); } },
                      { rot: 'Predecessoras', larg: 18, tipo: 'txt', v: function (r) { return r.pred; } },
                      { rot: 'Base Inicio', larg: 12, tipo: 'data', v: function (r) { return r.base ? r.base.inicio : ''; } },
                      { rot: 'Base Termino', larg: 13, tipo: 'data', v: function (r) { return r.base ? r.base.fim : ''; } },
                      { rot: 'Desvio (dias)', larg: 13, tipo: 'int', v: function (r) { return r.desvio; } },
                      { rot: 'Folga (dias)', larg: 12, tipo: 'int', v: function (r) { return r.folga; } },
                      { rot: 'Critico', larg: 9, tipo: 'txt', v: function (r) { return r.critico ? 'Sim' : 'Nao'; } },
                      { rot: 'Custo Previsto', larg: 16, tipo: 'dinheiro', v: function (r) { return centavos(r.t.custoPrevisto); } },
                      { rot: 'Custo Real', larg: 16, tipo: 'dinheiro', v: function (r) { return centavos(r.t.custoReal); } },
                      { rot: 'Saldo', larg: 16, tipo: 'dinheiro', v: function (r) { return r.saldo; } },
                      { rot: 'Responsavel', larg: 24, tipo: 'txt', v: function (r) { return r.resp; } },
                      { rot: 'Observacao', larg: 40, tipo: 'txt', v: function (r) { return limpar1linha(r.t.obs || ''); } }
                    ];
                  }
                
                  X.colunas = colunas;
                
                  /* ids que estao aparecendo na tela agora (respeita filtro e recolhido) */
                  function idsNaTela() {
                    var out = [];
                    try {
                      var ls = document.querySelectorAll('#ofLinhas .of-linha');
                      for (var i = 0; i < ls.length; i++) {
                        var id = ls[i].getAttribute('data-id');
                        if (id) out.push(id);
                      }
                    } catch (e) {}
                    return out;
                  }
                
                  function soFiltradoMarcado() {
                    var c = el('ofExpFiltrado');
                    return !!(c && c.checked);
                  }
                
                  /* o pacote de dados que alimenta todas as exportacoes */
                  function dados(soFiltrado) {
                    somar();
                    var c = dadosBase();
                    var w = mapaWbs();
                    var todas = listaCheia();
                
                    var permitido = null;
                    if (soFiltrado) {
                      var ids = idsNaTela();
                      if (ids.length) {
                        permitido = {};
                        ids.forEach(function (id) { permitido[id] = true; });
                      }
                    }
                
                    var linhas = [];
                    todas.forEach(function (x) {
                      if (permitido && !permitido[x.t.id]) return;
                      var t = x.t;
                      var resumo = ehResumo(t);
                      var fg = c.folga[t.id];
                      linhas.push({
                        t: t,
                        wbs: x.wbs,
                        nivel: x.nivel,
                        resumo: resumo,
                        rotuloTipo: resumo ? 'Fase' : (t.tipo === 'marco' ? 'Marco' : 'Tarefa'),
                        pred: rotuloPred(t, w),
                        base: baseDe(t),
                        desvio: desvioDias(t),
                        folga: (fg === undefined || fg === null) ? null : fg,
                        critico: !!c.crit[t.id],
                        saldo: centavos(num(t.custoPrevisto, 0) - num(t.custoReal, 0)),
                        resp: [].concat(t.responsaveis || []).join(' / ')
                      });
                    });
                
                    return {
                      titulo: tituloPlano(),
                      obra: nomeObra(),
                      linhas: linhas,
                      total: totais(),
                      resumo: resumoGeral(linhas),
                      parcial: !!permitido
                    };
                  }
                
                  X.dados = dados;
                
                  function resumoGeral(linhas) {
                    var r = {
                      fases: 0, tarefas: 0, marcos: 0, criticas: 0, atrasadas: 0,
                      concluidas: 0, semCusto: 0, acima: 0,
                      inicio: null, fim: null, pct: 0, dias: 0,
                      prev: 0, real: 0, saldo: 0, gastoPct: 0, comBase: 0
                    };
                    var somaPct = 0, contaPct = 0;
                    linhas.forEach(function (x) {
                      var t = x.t;
                      if (x.resumo) r.fases++;
                      else if (t.tipo === 'marco') r.marcos++;
                      else r.tarefas++;
                      if (x.critico) r.criticas++;
                      if (x.base) r.comBase++;
                      if (x.desvio !== null && x.desvio !== undefined && x.desvio > 0) r.atrasadas++;
                      if (!x.resumo) {
                        if (Math.round(num(t.percentual, 0)) >= 100) r.concluidas++;
                        if (centavos(t.custoPrevisto) === 0) r.semCusto++;
                        if (x.saldo < -0.004) r.acima++;
                        somaPct += num(t.percentual, 0);
                        contaPct++;
                        r.prev += centavos(t.custoPrevisto);
                        r.real += centavos(t.custoReal);
                      }
                      var di = toDate(t.inicio);
                      var df = toDate(t.tipo === 'marco' ? t.inicio : (t.fim || t.inicio));
                      if (di && (!r.inicio || di < r.inicio)) r.inicio = di;
                      if (df && (!r.fim || df > r.fim)) r.fim = df;
                    });
                    r.prev = centavos(r.prev);
                    r.real = centavos(r.real);
                    r.saldo = centavos(r.prev - r.real);
                    r.gastoPct = r.prev > 0 ? Math.round((r.real / r.prev) * 1000) / 10 : 0;
                    r.pct = contaPct ? Math.round(somaPct / contaPct) : 0;
                    r.dias = (r.inicio && r.fim) ? diasEntre(toISO(r.inicio), toISO(r.fim)) : 0;
                    return r;
                  }
                
                  /* uma linha por responsavel, para a terceira aba do Excel */
                  function porResponsavel(linhas) {
                    var mapa = {}, ordem = [];
                    linhas.forEach(function (x) {
                      if (x.resumo) return;
                      var lista = [].concat(x.t.responsaveis || []).filter(function (n) { return String(n || '').trim(); });
                      if (!lista.length) lista = ['(sem responsavel)'];
                      lista.forEach(function (nome) {
                        var k = String(nome).trim();
                        if (!mapa[k]) { mapa[k] = { nome: k, qtd: 0, pct: 0, prev: 0, real: 0, atraso: 0 }; ordem.push(k); }
                        var m = mapa[k];
                        m.qtd++;
                        m.pct += num(x.t.percentual, 0);
                        m.prev += centavos(x.t.custoPrevisto);
                        m.real += centavos(x.t.custoReal);
                        if (x.desvio !== null && x.desvio !== undefined && x.desvio > 0) m.atraso++;
                      });
                    });
                    var out = ordem.map(function (k) {
                      var m = mapa[k];
                      return {
                        nome: m.nome, qtd: m.qtd,
                        pct: m.qtd ? Math.round(m.pct / m.qtd) : 0,
                        prev: centavos(m.prev), real: centavos(m.real),
                        saldo: centavos(m.prev - m.real), atraso: m.atraso
                      };
                    });
                    out.sort(function (a, b) { return b.prev - a.prev || a.nome.localeCompare(b.nome); });
                    return out;
                  }
                
                  X.porResponsavel = function (soFiltrado) { return porResponsavel(dados(soFiltrado).linhas); };
                
                  /* ------------------------------------------------------------------ *
                   * 4) salvar arquivo no computador (texto ou bytes)
                   * ------------------------------------------------------------------ */
                  function baixar(nome, conteudo, tipo) {
                    var blob = new Blob([conteudo], { type: tipo || 'text/plain;charset=utf-8' });
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
                
                  /* ------------------------------------------------------------------ *
                   * 5) CSV: Brasil (ponto e virgula) e internacional (virgula)
                   * ------------------------------------------------------------------ */
                  function textoBR(col, r) {
                    var v = col.v(r);
                    if (col.tipo === 'data') return v ? fmtBR(v) : '-';
                    if (col.tipo === 'pct') return v + '%';
                    if (col.tipo === 'dinheiro') return fmtDinheiro(v);
                    if (col.tipo === 'int') return (v === null || v === undefined) ? '-' : String(v);
                    return String(v === null || v === undefined ? '' : v);
                  }
                
                  function csvBR(soFiltrado) {
                    var d = dados(soFiltrado);
                    var cols = colunas();
                    var lin = [cols.map(function (c) { return c.rot; }).join(';')];
                    d.linhas.forEach(function (r) {
                      lin.push(cols.map(function (c) {
                        return textoBR(c, r).replace(/;/g, ',');
                      }).join(';'));
                    });
                    var fim = [];
                    for (var i = 0; i < cols.length; i++) fim.push('');
                    fim[2] = 'TOTAL DA OBRA';
                    fim[14] = fmtDinheiro(d.total.prev);
                    fim[15] = fmtDinheiro(d.total.real);
                    fim[16] = fmtDinheiro(d.total.saldo);
                    lin.push(fim.join(';'));
                    return '\uFEFF' + lin.join('\r\n');
                  }
                
                  X.textoCSV = csvBR;
                
                  function aspas(v) {
                    return '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
                  }
                
                  function csvIntl(soFiltrado) {
                    var d = dados(soFiltrado);
                    var cols = colunas();
                    var lin = [cols.map(function (c) { return aspas(c.rot); }).join(',')];
                    d.linhas.forEach(function (r) {
                      lin.push(cols.map(function (c) {
                        var v = c.v(r);
                        if (c.tipo === 'data') return v ? toISO(toDate(v)) : '';
                        if (c.tipo === 'dinheiro') return num(v, 0).toFixed(2);
                        if (c.tipo === 'pct' || c.tipo === 'int') return (v === null || v === undefined) ? '' : String(v);
                        return aspas(v);
                      }).join(','));
                    });
                    var fim = [];
                    for (var i = 0; i < cols.length; i++) fim.push('');
                    fim[2] = aspas('TOTAL DA OBRA');
                    fim[14] = num(d.total.prev, 0).toFixed(2);
                    fim[15] = num(d.total.real, 0).toFixed(2);
                    fim[16] = num(d.total.saldo, 0).toFixed(2);
                    lin.push(fim.join(','));
                    return lin.join('\r\n');
                  }
                
                  X.textoCSVIntl = csvIntl;
                
                  /* ------------------------------------------------------------------ *
                   * 6) escrever um .xlsx de verdade, sem biblioteca nenhuma
                   *    (arquivo zip com as pecas guardadas sem compressao)
                   * ------------------------------------------------------------------ */
                  var TABCRC = null;
                
                  function tabelaCrc() {
                    if (TABCRC) return TABCRC;
                    TABCRC = [];
                    for (var n = 0; n < 256; n++) {
                      var c = n;
                      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                      TABCRC[n] = c >>> 0;
                    }
                    return TABCRC;
                  }
                
                  function crc32(bytes) {
                    var t = tabelaCrc(), c = 0xFFFFFFFF;
                    for (var i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
                    return (c ^ 0xFFFFFFFF) >>> 0;
                  }
                
                  function utf8(txt) {
                    var s = String(txt);
                    if (typeof TextEncoder === 'function') {
                      try { return new TextEncoder().encode(s); } catch (e) {}
                    }
                    var b = unescape(encodeURIComponent(s));
                    var a = new Uint8Array(b.length);
                    for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i) & 0xFF;
                    return a;
                  }
                
                  function juntar(partes) {
                    var total = 0, i;
                    for (i = 0; i < partes.length; i++) total += partes[i].length;
                    var out = new Uint8Array(total), pos = 0;
                    for (i = 0; i < partes.length; i++) { out.set(partes[i], pos); pos += partes[i].length; }
                    return out;
                  }
                
                  function zipar(arquivos) {
                    var locais = [], centrais = [], desloc = 0;
                
                    arquivos.forEach(function (f) {
                      var nome = utf8(f.nome);
                      var dado = f.dados;
                      var c = crc32(dado);
                
                      var lh = new Uint8Array(30 + nome.length);
                      var dl = new DataView(lh.buffer);
                      dl.setUint32(0, 0x04034b50, true);
                      dl.setUint16(4, 20, true);
                      dl.setUint16(6, 0x0800, true);
                      dl.setUint16(8, 0, true);
                      dl.setUint16(10, 0, true);
                      dl.setUint16(12, 0x0021, true);
                      dl.setUint32(14, c, true);
                      dl.setUint32(18, dado.length, true);
                      dl.setUint32(22, dado.length, true);
                      dl.setUint16(26, nome.length, true);
                      dl.setUint16(28, 0, true);
                      lh.set(nome, 30);
                
                      var ch = new Uint8Array(46 + nome.length);
                      var dc = new DataView(ch.buffer);
                      dc.setUint32(0, 0x02014b50, true);
                      dc.setUint16(4, 20, true);
                      dc.setUint16(6, 20, true);
                      dc.setUint16(8, 0x0800, true);
                      dc.setUint16(10, 0, true);
                      dc.setUint16(12, 0, true);
                      dc.setUint16(14, 0x0021, true);
                      dc.setUint32(16, c, true);
                      dc.setUint32(20, dado.length, true);
                      dc.setUint32(24, dado.length, true);
                      dc.setUint16(28, nome.length, true);
                      dc.setUint16(30, 0, true);
                      dc.setUint16(32, 0, true);
                      dc.setUint16(34, 0, true);
                      dc.setUint16(36, 0, true);
                      dc.setUint32(38, 0, true);
                      dc.setUint32(42, desloc, true);
                      ch.set(nome, 46);
                
                      locais.push(lh, dado);
                      centrais.push(ch);
                      desloc += lh.length + dado.length;
                    });
                
                    var corpoCentral = juntar(centrais);
                    var fim = new Uint8Array(22);
                    var df = new DataView(fim.buffer);
                    df.setUint32(0, 0x06054b50, true);
                    df.setUint16(4, 0, true);
                    df.setUint16(6, 0, true);
                    df.setUint16(8, arquivos.length, true);
                    df.setUint16(10, arquivos.length, true);
                    df.setUint32(12, corpoCentral.length, true);
                    df.setUint32(16, desloc, true);
                    df.setUint16(20, 0, true);
                
                    return juntar([juntar(locais), corpoCentral, fim]);
                  }
                
                  /* estilos: cada numero abaixo e a posicao dentro do styles.xml */
                  var E = {
                    normal: 0,
                    cab: 1,
                    txt: 2,
                    txtFase: 3,
                    data: 4,
                    dataFase: 5,
                    int: 6,
                    intFase: 7,
                    pct: 8,
                    pctFase: 9,
                    din: 10,
                    dinFase: 11,
                    totTxt: 12,
                    totDin: 13,
                    critico: 14,
                    dinVerm: 15,
                    titulo: 16,
                    rotulo: 17,
                    subtitulo: 18
                  };
                
                  function estilosXml() {
                    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
                      '<numFmts count="3">' +
                        '<numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>' +
                        '<numFmt numFmtId="165" formatCode="#,##0.00"/>' +
                        '<numFmt numFmtId="166" formatCode="0%"/>' +
                      '</numFmts>' +
                      '<fonts count="6">' +
                        '<font><sz val="11"/><name val="Calibri"/></font>' +
                        '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
                        '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
                        '<font><sz val="11"/><color rgb="FFC00000"/><name val="Calibri"/></font>' +
                        '<font><b/><sz val="11"/><color rgb="FFC00000"/><name val="Calibri"/></font>' +
                        '<font><b/><sz val="16"/><color rgb="FF1F3A5F"/><name val="Calibri"/></font>' +
                      '</fonts>' +
                      '<fills count="5">' +
                        '<fill><patternFill patternType="none"/></fill>' +
                        '<fill><patternFill patternType="gray125"/></fill>' +
                        '<fill><patternFill patternType="solid"><fgColor rgb="FF1F3A5F"/><bgColor indexed="64"/></patternFill></fill>' +
                        '<fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF7"/><bgColor indexed="64"/></patternFill></fill>' +
                        '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF3CD"/><bgColor indexed="64"/></patternFill></fill>' +
                      '</fills>' +
                      '<borders count="2">' +
                        '<border><left/><right/><top/><bottom/><diagonal/></border>' +
                        '<border><left style="thin"><color rgb="FFBFC7D2"/></left>' +
                        '<right style="thin"><color rgb="FFBFC7D2"/></right>' +
                        '<top style="thin"><color rgb="FFBFC7D2"/></top>' +
                        '<bottom style="thin"><color rgb="FFBFC7D2"/></bottom><diagonal/></border>' +
                      '</borders>' +
                      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
                      '<cellXfs count="19">' +
                        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
                        '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
                        '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
                        '<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
                        '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' +
                        '<xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' +
                        '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' +
                        '<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' +
                        '<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' +
                        '<xf numFmtId="166" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' +
                        '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
                        '<xf numFmtId="165" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
                        '<xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
                        '<xf numFmtId="165" fontId="2" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
                        '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' +
                        '<xf numFmtId="165" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
                        '<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
                        '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
                        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
                      '</cellXfs>' +
                      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
                      '</styleSheet>';
                  }
                
                  function letraCol(i) {
                    var s = '';
                    i = i + 1;
                    while (i > 0) {
                      var r = (i - 1) % 26;
                      s = String.fromCharCode(65 + r) + s;
                      i = Math.floor((i - r) / 26);
                    }
                    return s;
                  }
                
                  X.letraCol = letraCol;
                
                  function celS(v, est) { return { k: 's', v: v, s: est }; }
                  function celN(v, est) { return { k: 'n', v: v, s: est }; }
                  function celV(est) { return { k: 'v', v: '', s: est }; }
                
                  function celulaXml(ref, c) {
                    if (!c) return '';
                    var est = ' s="' + (c.s || 0) + '"';
                    if (c.k === 'n') {
                      if (c.v === null || c.v === undefined || c.v === '' || isNaN(num(c.v, NaN))) {
                        return '<c r="' + ref + '"' + est + '/>';
                      }
                      return '<c r="' + ref + '"' + est + '><v>' + num(c.v, 0) + '</v></c>';
                    }
                    if (c.k === 's') {
                      var t = String(c.v === null || c.v === undefined ? '' : c.v);
                      if (!t) return '<c r="' + ref + '"' + est + '/>';
                      return '<c r="' + ref + '"' + est + ' t="inlineStr"><is><t xml:space="preserve">' +
                             escXml(t) + '</t></is></c>';
                    }
                    return '<c r="' + ref + '"' + est + '/>';
                  }
                
                  function folhaXml(op) {
                    var linhas = op.linhas || [];
                    var largs = op.largs || [];
                    var maior = 1;
                    linhas.forEach(function (l) { if (l.length > maior) maior = l.length; });
                
                    var xml = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'];
                    xml.push('<dimension ref="A1:' + letraCol(maior - 1) + Math.max(1, linhas.length) + '"/>');
                    xml.push('<sheetViews><sheetView workbookViewId="0"' + (op.primeira ? ' tabSelected="1"' : '') + '>');
                    if (op.congelar) {
                      xml.push('<pane ySplit="' + op.congelar + '" topLeftCell="A' + (op.congelar + 1) +
                               '" activePane="bottomLeft" state="frozen"/>');
                    }
                    xml.push('</sheetView></sheetViews>');
                    xml.push('<sheetFormatPr defaultRowHeight="15"/>');
                    if (largs.length) {
                      var cols = ['<cols>'];
                      largs.forEach(function (l, i) {
                        cols.push('<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + l + '" customWidth="1"/>');
                      });
                      cols.push('</cols>');
                      xml.push(cols.join(''));
                    }
                    xml.push('<sheetData>');
                    linhas.forEach(function (l, li) {
                      var n = li + 1;
                      var parte = ['<row r="' + n + '"' + (op.altura1 && n === 1 ? ' ht="26" customHeight="1"' : '') + '>'];
                      l.forEach(function (c, ci) { parte.push(celulaXml(letraCol(ci) + n, c)); });
                      parte.push('</row>');
                      xml.push(parte.join(''));
                    });
                    xml.push('</sheetData>');
                    if (op.filtro) {
                      xml.push('<autoFilter ref="A' + op.filtro + ':' + letraCol(maior - 1) + Math.max(op.filtro, linhas.length) + '"/>');
                    }
                    xml.push('</worksheet>');
                    return xml.join('');
                  }
                
                  /* --- aba 1: o plano inteiro --- */
                  function folhaPlano(d) {
                    var cols = colunas();
                    var linhas = [];
                    linhas.push(cols.map(function (c) { return celS(c.rot, E.cab); }));
                
                    d.linhas.forEach(function (r) {
                      var fase = r.resumo;
                      linhas.push(cols.map(function (c) {
                        var v = c.v(r);
                        if (c.tipo === 'nome') {
                          var espaco = '';
                          for (var i = 0; i < r.nivel; i++) espaco += '    ';
                          return celS(espaco + v, fase ? E.txtFase : E.txt);
                        }
                        if (c.tipo === 'data') {
                          return celN(v ? serieExcel(v) : null, fase ? E.dataFase : E.data);
                        }
                        if (c.tipo === 'int') {
                          return celN((v === null || v === undefined) ? null : v, fase ? E.intFase : E.int);
                        }
                        if (c.tipo === 'pct') {
                          return celN(num(v, 0) / 100, fase ? E.pctFase : E.pct);
                        }
                        if (c.tipo === 'dinheiro') {
                          var neg = num(v, 0) < -0.004;
                          return celN(v, fase ? E.dinFase : (neg ? E.dinVerm : E.din));
                        }
                        if (c.rot === 'Critico' && r.critico) return celS(v, E.critico);
                        return celS(v, fase ? E.txtFase : E.txt);
                      }));
                    });
                
                    var fim = cols.map(function (c, i) {
                      if (i === 2) return celS('TOTAL DA OBRA', E.totTxt);
                      if (i === 14) return celN(d.total.prev, E.totDin);
                      if (i === 15) return celN(d.total.real, E.totDin);
                      if (i === 16) return celN(d.total.saldo, E.totDin);
                      return celV(E.totTxt);
                    });
                    linhas.push(fim);
                
                    return folhaXml({
                      linhas: linhas,
                      largs: cols.map(function (c) { return c.larg; }),
                      congelar: 1, filtro: 1, primeira: true, altura1: true
                    });
                  }
                
                  /* --- aba 2: resumo da obra --- */
                  function folhaResumo(d) {
                    var r = d.resumo;
                    var g = d.total;
                    var agora = new Date();
                    var quando = pad(agora.getDate()) + '/' + pad(agora.getMonth() + 1) + '/' + agora.getFullYear() +
                                 ' as ' + pad(agora.getHours()) + ':' + pad(agora.getMinutes());
                
                    var L = [];
                    L.push([celS(d.titulo, E.titulo)]);
                    L.push([celS(d.obra ? ('Obra: ' + d.obra) : 'ObraFlow - Plano Mestre', E.rotulo)]);
                    L.push([celS('Gerado em ' + quando + (d.parcial ? '  (somente as linhas visiveis na tela)' : ''), E.subtitulo)]);
                    L.push([]);
                
                    function par(rotulo, cel) { L.push([celS(rotulo, E.rotulo), cel]); }
                
                    L.push([celS('PRAZOS', E.cab), celS('', E.cab)]);
                    par('Inicio da obra', celN(r.inicio ? serieExcel(toISO(r.inicio)) : null, E.data));
                    par('Termino previsto', celN(r.fim ? serieExcel(toISO(r.fim)) : null, E.data));
                    par('Duracao total (dias)', celN(r.dias, E.int));
                    par('Conclusao geral', celN(num(r.pct, 0) / 100, E.pct));
                    L.push([]);
                
                    L.push([celS('ESTRUTURA', E.cab), celS('', E.cab)]);
                    par('Fases', celN(r.fases, E.int));
                    par('Tarefas', celN(r.tarefas, E.int));
                    par('Marcos', celN(r.marcos, E.int));
                    par('Tarefas concluidas (100%)', celN(r.concluidas, E.int));
                    par('Tarefas no caminho critico', celN(r.criticas, E.int));
                    par('Tarefas com linha de base', celN(r.comBase, E.int));
                    par('Tarefas atrasadas em relacao a base', celN(r.atrasadas, E.int));
                    L.push([]);
                
                    L.push([celS('DINHEIRO', E.cab), celS('', E.cab)]);
                    par('Custo previsto (R$)', celN(g.prev, E.din));
                    par('Custo real (R$)', celN(g.real, E.din));
                    par('Saldo (R$)', celN(g.saldo, num(g.saldo, 0) < -0.004 ? E.dinVerm : E.din));
                    par('Percentual do previsto ja gasto', celN(g.prev > 0 ? (g.real / g.prev) : 0, E.pct));
                    par('Tarefas acima do previsto', celN(r.acima, E.int));
                    par('Tarefas sem custo lancado', celN(r.semCusto, E.int));
                    L.push([]);
                    L.push([celS('Numeros calculados a partir da aba Plano. Fases nao somam duas vezes: o valor delas e a soma das subtarefas.', E.subtitulo)]);
                
                    return folhaXml({ linhas: L, largs: [40, 20] });
                  }
                
                  /* --- aba 3: por responsavel --- */
                  function folhaResp(d) {
                    var lista = porResponsavel(d.linhas);
                    var rot = ['Responsavel', 'Tarefas', 'Conclusao media', 'Custo Previsto', 'Custo Real', 'Saldo', 'Atrasadas'];
                    var L = [rot.map(function (t) { return celS(t, E.cab); })];
                    var tp = 0, tr = 0, tq = 0, ta = 0;
                    lista.forEach(function (m) {
                      L.push([
                        celS(m.nome, E.txt),
                        celN(m.qtd, E.int),
                        celN(num(m.pct, 0) / 100, E.pct),
                        celN(m.prev, E.din),
                        celN(m.real, E.din),
                        celN(m.saldo, m.saldo < -0.004 ? E.dinVerm : E.din),
                        celN(m.atraso, E.int)
                      ]);
                      tp += m.prev; tr += m.real; tq += m.qtd; ta += m.atraso;
                    });
                    L.push([
                      celS('TOTAL', E.totTxt),
                      celN(tq, E.totTxt),
                      celV(E.totTxt),
                      celN(centavos(tp), E.totDin),
                      celN(centavos(tr), E.totDin),
                      celN(centavos(tp - tr), E.totDin),
                      celN(ta, E.totTxt)
                    ]);
                    return folhaXml({ linhas: L, largs: [32, 10, 16, 16, 16, 16, 11], congelar: 1, filtro: 1 });
                  }
                
                  function bytesXlsx(soFiltrado) {
                    var d = dados(soFiltrado);
                    var abas = [
                      { nome: 'Plano', xml: folhaPlano(d) },
                      { nome: 'Resumo', xml: folhaResumo(d) },
                      { nome: 'Responsaveis', xml: folhaResp(d) }
                    ];
                
                    var tipos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
                      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
                      '<Default Extension="xml" ContentType="application/xml"/>' +
                      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
                      abas.map(function (a, i) {
                        return '<Override PartName="/xl/worksheets/sheet' + (i + 1) +
                               '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
                      }).join('') +
                      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
                      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
                      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
                      '</Types>';
                
                    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
                      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
                      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
                      '</Relationships>';
                
                    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
                      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
                      '<sheets>' +
                      abas.map(function (a, i) {
                        return '<sheet name="' + escXml(a.nome) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
                      }).join('') +
                      '</sheets></workbook>';
                
                    var wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                      abas.map(function (a, i) {
                        return '<Relationship Id="rId' + (i + 1) +
                               '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' +
                               (i + 1) + '.xml"/>';
                      }).join('') +
                      '<Relationship Id="rId' + (abas.length + 1) +
                      '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
                      '</Relationships>';
                
                    var quando = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
                    var core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
                      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
                      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                      '<dc:title>' + escXml(d.titulo) + '</dc:title>' +
                      '<dc:subject>' + escXml(d.obra) + '</dc:subject>' +
                      '<dc:creator>ObraFlow</dc:creator>' +
                      '<cp:lastModifiedBy>ObraFlow</cp:lastModifiedBy>' +
                      '<dcterms:created xsi:type="dcterms:W3CDTF">' + quando + '</dcterms:created>' +
                      '<dcterms:modified xsi:type="dcterms:W3CDTF">' + quando + '</dcterms:modified>' +
                      '</cp:coreProperties>';
                
                    var app = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
                      'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
                      '<Application>ObraFlow</Application></Properties>';
                
                    var arquivos = [
                      { nome: '[Content_Types].xml', dados: utf8(tipos) },
                      { nome: '_rels/.rels', dados: utf8(rels) },
                      { nome: 'docProps/core.xml', dados: utf8(core) },
                      { nome: 'docProps/app.xml', dados: utf8(app) },
                      { nome: 'xl/workbook.xml', dados: utf8(wb) },
                      { nome: 'xl/_rels/workbook.xml.rels', dados: utf8(wbRels) },
                      { nome: 'xl/styles.xml', dados: utf8(estilosXml()) }
                    ];
                    abas.forEach(function (a, i) {
                      arquivos.push({ nome: 'xl/worksheets/sheet' + (i + 1) + '.xml', dados: utf8(a.xml) });
                    });
                
                    return { bytes: zipar(arquivos), dados: d };
                  }
                
                  X.bytesXlsx = function (soFiltrado) { return bytesXlsx(soFiltrado).bytes; };
                
                  /* ------------------------------------------------------------------ *
                   * 7) as acoes do menu
                   * ------------------------------------------------------------------ */
                  function nomeArquivo(ext) {
                    var base = 'obraflow_plano';
                    var o = nomeObra().replace(/[^0-9A-Za-zÀ-ÿ ]+/g, '').trim().replace(/\s+/g, '_');
                    if (o) base += '_' + o.slice(0, 28);
                    return base + '_' + selo() + '.' + ext;
                  }
                
                  function semTarefas() {
                    if (tarefas().length) return false;
                    alerta('O plano mestre esta vazio. Cadastre as fases e tarefas antes de exportar.');
                    return true;
                  }
                
                  X.excel = function (soFiltrado) {
                    if (semTarefas()) return;
                    var f = (soFiltrado === undefined) ? soFiltradoMarcado() : !!soFiltrado;
                    try {
                      var r = bytesXlsx(f);
                      baixar(nomeArquivo('xlsx'), r.bytes,
                             'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                      fecharMenu();
                      avisar('Planilha gerada com ' + r.dados.linhas.length + ' linhas em 3 abas: Plano, Resumo e Responsaveis.');
                    } catch (e) {
                      console.warn('ObraFlow exportar: excel', e);
                      alerta('Nao consegui montar a planilha do Excel. O CSV continua funcionando.');
                    }
                  };
                
                  X.csv = function (soFiltrado) {
                    if (semTarefas()) return;
                    var f = (soFiltrado === undefined) ? soFiltradoMarcado() : !!soFiltrado;
                    baixar(nomeArquivo('csv'), csvBR(f), 'text/csv;charset=utf-8');
                    fecharMenu();
                    avisar('CSV para Excel Brasil gerado (separador ponto e virgula).');
                  };
                
                  X.csvIntl = function (soFiltrado) {
                    if (semTarefas()) return;
                    var f = (soFiltrado === undefined) ? soFiltradoMarcado() : !!soFiltrado;
                    baixar(nomeArquivo('csv'), csvIntl(f), 'text/csv;charset=utf-8');
                    fecharMenu();
                    avisar('CSV padrao internacional gerado (separador virgula, datas 2026-01-05).');
                  };
                
                  X.backup = function () {
                    try { OF().exportarJSON(); } catch (e) { console.warn(e); }
                    fecharMenu();
                    avisar('Backup do plano salvo em .json.');
                  };
                
                  X.pdf = function () {
                    fecharMenu();
                    avisar('Abrindo a janela de impressao. Escolha "Salvar como PDF" e, em Paginas, use Paisagem.');
                    try { OF().imprimir(); } catch (e) { console.warn(e); }
                  };
                
                  /* ------------------------------------------------------------------ *
                   * 8) o menu Exportar na barra de acoes
                   * ------------------------------------------------------------------ */
                  function avisar(txt) {
                    var n = el('ofExpAviso');
                    if (!n) return;
                    n.textContent = txt;
                    n.className = 'of-exp-aviso of-on';
                    if (n.__t) clearTimeout(n.__t);
                    n.__t = setTimeout(function () { n.className = 'of-exp-aviso'; }, 6000);
                  }
                
                  function fecharMenu() {
                    var m = el('ofExpMenu');
                    if (m) m.className = 'of-exp-menu';
                    var b = el('ofExpBt');
                    if (b) b.setAttribute('aria-expanded', 'false');
                  }
                
                  function abrirMenu() {
                    var m = el('ofExpMenu');
                    if (!m) return;
                    var aberto = m.className.indexOf('of-on') >= 0;
                    if (aberto) { fecharMenu(); return; }
                    m.className = 'of-exp-menu of-on';
                    var b = el('ofExpBt');
                    if (b) b.setAttribute('aria-expanded', 'true');
                    contarLinhas();
                  }
                
                  X.abrirMenu = abrirMenu;
                  X.fecharMenu = fecharMenu;
                
                  function contarLinhas() {
                    var n = el('ofExpNota');
                    if (!n) return;
                    var tudo = listaCheia().length;
                    var tela = idsNaTela().length;
                    if (soFiltradoMarcado() && tela) {
                      n.textContent = 'Vai exportar ' + tela + ' de ' + tudo + ' linhas (o que esta na tela).';
                    } else {
                      n.textContent = 'Vai exportar o plano completo: ' + tudo + ' linhas.';
                    }
                  }
                
                  var ACOES = {
                    xlsx: function () { X.excel(); },
                    csvbr: function () { X.csv(); },
                    csvintl: function () { X.csvIntl(); },
                    json: function () { X.backup(); },
                    pdf: function () { X.pdf(); }
                  };
                
                  function montarMenu() {
                    var acoes = document.querySelector('#tab-obraflow .of-acoes');
                    if (!acoes) return;
                
                    /* o botao CSV da Etapa 1 vira este menu, mais completo */
                    var antigo = null;
                    var bts = acoes.querySelectorAll('button');
                    for (var i = 0; i < bts.length; i++) {
                      var oc = bts[i].getAttribute('onclick') || '';
                      if (oc.indexOf('exportarCSV') >= 0) { antigo = bts[i]; break; }
                    }
                    if (antigo && antigo.className.indexOf('of-exp-oculto') < 0) {
                      antigo.className += ' of-exp-oculto';
                    }
                
                    if (el('ofExpBox')) { contarLinhas(); return; }
                
                    var box = document.createElement('span');
                    box.id = 'ofExpBox';
                    box.className = 'of-exp-box';
                    box.innerHTML =
                      '<button class="of-btn of-exp-bt" id="ofExpBt" aria-expanded="false" ' +
                        'title="Levar o plano para o Excel, CSV, PDF ou backup">\u2B07\uFE0F Exportar \u25BE</button>' +
                      '<div class="of-exp-menu" id="ofExpMenu">' +
                        '<div class="of-exp-tit">Levar o plano para fora</div>' +
                        '<button class="of-exp-it" data-ac="xlsx">' +
                          '<b>\uD83D\uDCD7 Excel (.xlsx)</b>' +
                          '<small>Planilha pronta: abas Plano, Resumo e Responsaveis</small></button>' +
                        '<button class="of-exp-it" data-ac="csvbr">' +
                          '<b>\uD83D\uDCC4 CSV para Excel Brasil</b>' +
                          '<small>Separador ponto e virgula, datas 05/01/2026</small></button>' +
                        '<button class="of-exp-it" data-ac="csvintl">' +
                          '<b>\uD83C\uDF10 CSV padrao internacional</b>' +
                          '<small>Separador virgula, datas 2026-01-05, numeros com ponto</small></button>' +
                        '<button class="of-exp-it" data-ac="pdf">' +
                          '<b>\uD83D\uDDA8\uFE0F Imprimir ou salvar em PDF</b>' +
                          '<small>Na janela de impressao escolha Salvar como PDF</small></button>' +
                        '<button class="of-exp-it" data-ac="json">' +
                          '<b>\uD83D\uDCBE Backup do plano (.json)</b>' +
                          '<small>Para restaurar tudo depois no proprio ObraFlow</small></button>' +
                        '<label class="of-exp-chk" title="Marque para exportar apenas as linhas que estao aparecendo">' +
                          '<input type="checkbox" id="ofExpFiltrado"> Somente o que estou vendo na tela</label>' +
                        '<div class="of-exp-nota" id="ofExpNota"></div>' +
                      '</div>' +
                      '<span class="of-exp-aviso" id="ofExpAviso"></span>';
                    acoes.appendChild(box);
                
                    var bt = el('ofExpBt');
                    if (bt) bt.addEventListener('click', function (ev) {
                      ev.preventDefault();
                      ev.stopPropagation();
                      abrirMenu();
                    });
                
                    var menu = el('ofExpMenu');
                    if (menu) {
                      menu.addEventListener('click', function (ev) { ev.stopPropagation(); });
                      var itens = menu.querySelectorAll('.of-exp-it');
                      for (var k = 0; k < itens.length; k++) {
                        itens[k].addEventListener('click', function (ev) {
                          ev.preventDefault();
                          var ac = this.getAttribute('data-ac');
                          if (ACOES[ac]) {
                            try { ACOES[ac](); } catch (e) {
                              console.warn('ObraFlow exportar', e);
                              alerta('Nao consegui gerar o arquivo agora. Tente de novo.');
                            }
                          }
                        });
                      }
                    }
                
                    var chk = el('ofExpFiltrado');
                    if (chk) chk.addEventListener('change', contarLinhas);
                
                    if (!document.__ofExpFora) {
                      document.__ofExpFora = true;
                      document.addEventListener('click', function () { fecharMenu(); });
                      document.addEventListener('keydown', function (ev) {
                        if (ev.key === 'Escape' || ev.keyCode === 27) fecharMenu();
                      });
                    }
                
                    contarLinhas();
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 9) acoplamento por cima das etapas 1 a 4
                   * ------------------------------------------------------------------ */
                  function depoisDoRender() {
                    montarMenu();
                    contarLinhas();
                  }
                
                  X.repintar = function () { try { depoisDoRender(); } catch (e) { console.warn(e); } };
                
                  function envolverRender() {
                    var orig = OF().render;
                    if (typeof orig !== 'function' || orig.__v59) return;
                    var novo = function () {
                      var out = orig.apply(this, arguments);
                      try { depoisDoRender(); } catch (e) { console.warn('ObraFlow exportar: tela', e); }
                      return out;
                    };
                    novo.__v59 = true;
                    novo.__v58 = !!orig.__v58;
                    novo.__base57 = !!orig.__base57;
                    novo.__dep56 = !!orig.__dep56;
                    OF().render = novo;
                  }
                
                  /* o botao CSV antigo e qualquer atalho passam a usar o motor novo */
                  function trocarCSV() {
                    var orig = OF().exportarCSV;
                    if (typeof orig === 'function' && orig.__v59) return;
                    var novo = function () { X.csv(false); };
                    novo.__v59 = true;
                    novo.__v58 = !!(orig && orig.__v58);
                    novo.__base57 = !!(orig && orig.__base57);
                    novo.__dep56 = !!(orig && orig.__dep56);
                    OF().exportarCSV = novo;
                  }
                
                  X.exportarExcel = function () { X.excel(false); };
                
                  function iniciar() {
                    if (!pronto()) {
                      console.warn('ObraFlow exportar: as Etapas 1 a 4 (Patches 55 a 58) nao foram encontradas.');
                      return;
                    }
                    try { envolverRender(); } catch (e) { console.warn(e); }
                    try { trocarCSV(); } catch (e) { console.warn(e); }
                    try { montarMenu(); } catch (e) { console.warn(e); }
                    var aba = el('tab-obraflow');
                    if (aba && aba.style.display !== 'none') { try { OF().render(); } catch (e) {} }
                  }
                
                  function esperar(tentativa) {
                    if (pronto() && typeof OF().render === 'function' && OF().render.__v58) { iniciar(); return; }
                    if (tentativa > 40) {
                      if (pronto()) { iniciar(); return; }
                      console.warn('ObraFlow exportar: as Etapas 1 a 4 nao responderam.');
                      return;
                    }
                    setTimeout(function () { esperar(tentativa + 1); }, 200);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { esperar(0); }, 2000); });
                  } else {
                    setTimeout(function () { esperar(0); }, 2000);
                  }
                
                })();
            
