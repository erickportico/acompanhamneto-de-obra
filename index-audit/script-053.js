
                /* ====== PATCH81_UNIFICAR_DUPLICADOS_OK ====== */
                (function () {
                  'use strict';
                  if (window.__PS81) { return; }
                  window.__PS81 = true;
                
                  var K_AG = 'painelAgendaObras_v1';
                  var K_BKP_LISTA = 'p81_backups_lista';
                  var MAX_BKP = 3;
                
                  /* ---------------------------------------------------------------- *
                   * ferramentas basicas
                   * ---------------------------------------------------------------- */
                  function aviso(msg, tipo) {
                    try {
                      if (typeof window.mostrarToastPainel === 'function') {
                        window.mostrarToastPainel(msg, tipo || 'ok');
                        return;
                      }
                    } catch (e) {}
                    var d = document.getElementById('ps81Aviso');
                    if (!d) {
                      d = document.createElement('div');
                      d.id = 'ps81Aviso';
                      d.setAttribute('data-ps81', '1');
                      document.body.appendChild(d);
                    }
                    d.textContent = String(msg || '');
                    d.className = 'ps81-aviso ' + (tipo === 'erro' ? 'ps81-erro' : 'ps81-ok');
                    d.style.display = 'block';
                    clearTimeout(d.__t);
                    d.__t = setTimeout(function () { d.style.display = 'none'; }, 4200);
                  }
                
                  function esc(s) {
                    try {
                      if (typeof window.escaparHTML === 'function') { return window.escaparHTML(String(s == null ? '' : s)); }
                    } catch (e) {}
                    return String(s == null ? '' : s)
                      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                  }
                
                  function norm(s) {
                    var t = String(s == null ? '' : s);
                    try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
                    return t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
                  }
                
                  function digitos(s) { return String(s == null ? '' : s).replace(/[^0-9]/g, ''); }
                
                  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
                
                  function moeda(v) {
                    try { return 'R$ ' + num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
                    catch (e) { return 'R$ ' + num(v).toFixed(2); }
                  }
                
                  function banco() {
                    try { if (window.db && typeof window.db === 'object' && Array.isArray(window.db.obras)) { return window.db; } } catch (e) {}
                    return null;
                  }
                
                  function igual(a, b) {
                    try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
                  }
                
                  function novoId(pref) {
                    return String(pref || 'p81') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
                  }
                
                  function selo() {
                    var d = new Date();
                    function p(n) { return (n < 10 ? '0' : '') + n; }
                    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
                  }
                
                  /* ---------------------------------------------------------------- *
                   * uniao de grupos (junta registros ligados por qualquer criterio)
                   * ---------------------------------------------------------------- */
                  function criarUniao(n) {
                    var pai = [];
                    var i;
                    for (i = 0; i < n; i++) { pai.push(i); }
                    function raiz(x) { while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; } return x; }
                    return {
                      juntar: function (a, b) { var ra = raiz(a), rb = raiz(b); if (ra !== rb) { pai[rb] = ra; } },
                      raiz: raiz
                    };
                  }
                
                  function agruparPorChaves(lista, pegarChaves) {
                    var u = criarUniao(lista.length);
                    var vistos = {};
                    lista.forEach(function (item, i) {
                      (pegarChaves(item) || []).forEach(function (ch) {
                        if (!ch) { return; }
                        if (vistos[ch] === undefined) { vistos[ch] = i; }
                        else { u.juntar(vistos[ch], i); }
                      });
                    });
                    var caixas = {};
                    lista.forEach(function (item, i) {
                      var r = u.raiz(i);
                      if (!caixas[r]) { caixas[r] = []; }
                      caixas[r].push(item);
                    });
                    var saida = [];
                    Object.keys(caixas).forEach(function (k) {
                      if (caixas[k].length > 1) { saida.push(caixas[k]); }
                    });
                    return saida;
                  }
                
                  /* ---------------------------------------------------------------- *
                   * leitura da agenda de obras
                   * ---------------------------------------------------------------- */
                  function lerAgenda() {
                    try {
                      var txt = window.localStorage.getItem(K_AG);
                      if (!txt) { return null; }
                      var o = JSON.parse(txt);
                      if (!o || typeof o !== 'object') { return null; }
                      return o;
                    } catch (e) { return null; }
                  }
                
                  function gravarAgenda(obj) {
                    try {
                      var txt = JSON.stringify(obj);
                      window.localStorage.setItem(K_AG, txt);
                      var d = banco();
                      if (d && typeof d.agendaObras === 'string') { d.agendaObras = txt; }
                      return true;
                    } catch (e) { return false; }
                  }
                
                  function listaEventosAgenda(ag) {
                    if (!ag) { return []; }
                    if (Array.isArray(ag.eventos)) { return ag.eventos; }
                    if (Array.isArray(ag)) { return ag; }
                    return [];
                  }
                
                  /* ---------------------------------------------------------------- *
                   * copia de seguranca antes de unir
                   * ---------------------------------------------------------------- */
                  function guardarCopia() {
                    var d = banco();
                    if (!d) { return ''; }
                    var chave = 'p81_backup_' + selo();
                    var pacote = {
                      quando: new Date().toISOString(),
                      banco: d,
                      agenda: null
                    };
                    try { pacote.agenda = window.localStorage.getItem(K_AG); } catch (e) {}
                    try {
                      window.localStorage.setItem(chave, JSON.stringify(pacote));
                    } catch (e) {
                      return '';
                    }
                    try {
                      var lista = [];
                      try { lista = JSON.parse(window.localStorage.getItem(K_BKP_LISTA) || '[]') || []; } catch (e2) { lista = []; }
                      lista.push(chave);
                      while (lista.length > MAX_BKP) {
                        var velho = lista.shift();
                        try { window.localStorage.removeItem(velho); } catch (e3) {}
                      }
                      window.localStorage.setItem(K_BKP_LISTA, JSON.stringify(lista));
                    } catch (e) {}
                    return chave;
                  }
                
                  /* ---------------------------------------------------------------- *
                   * OBRAS: achar duplicadas
                   * ---------------------------------------------------------------- */
                  function resumoObra(o) {
                    return {
                      itens: (o.itens || []).length,
                      recebimentos: (o.recebimentos || []).length,
                      lanc: (o.lancamentosProducao || []).length,
                      colabs: (o.colaboradores || []).length,
                      centros: (o.centrosCusto || []).length,
                      valor: num(o.valorContrato),
                      medicoes: num(o.numMedicaoMax) || 1
                    };
                  }
                
                  function pesoObra(o) {
                    var r = resumoObra(o);
                    return r.itens * 100 + r.lanc * 50 + r.recebimentos * 20 + r.colabs * 10 + r.centros * 5 + (r.valor > 0 ? 1 : 0);
                  }
                
                  function acharObrasDuplicadas() {
                    var d = banco();
                    if (!d) { return []; }
                    var grupos = agruparPorChaves(d.obras.slice(), function (o) {
                      var ch = [];
                      var n = norm(o.nome);
                      if (n) { ch.push('nome:' + n); }
                      var c = norm(o.numContrato);
                      if (c) { ch.push('contrato:' + c); }
                      return ch;
                    });
                    grupos.forEach(function (g) {
                      g.sort(function (a, b) { return pesoObra(b) - pesoObra(a); });
                    });
                    return grupos;
                  }
                
                  /* ---------------------------------------------------------------- *
                   * COLABORADORES: achar duplicados
                   * ---------------------------------------------------------------- */
                  function todosColaboradores() {
                    var d = banco();
                    if (!d) { return []; }
                    var porId = {};
                    d.obras.forEach(function (o) {
                      (o.colaboradores || []).forEach(function (c) {
                        if (!c || !c.id) { return; }
                        if (!porId[c.id]) {
                          porId[c.id] = {
                            id: c.id, nome: c.nome || '', funcao: c.funcao || '',
                            cpf: c.cpf || '', telefone: c.telefone || '', obras: []
                          };
                        }
                        var reg = porId[c.id];
                        if (!reg.nome && c.nome) { reg.nome = c.nome; }
                        if (!reg.funcao && c.funcao) { reg.funcao = c.funcao; }
                        if (!reg.cpf && c.cpf) { reg.cpf = c.cpf; }
                        if (!reg.telefone && c.telefone) { reg.telefone = c.telefone; }
                        reg.obras.push(o.nome || o.id);
                      });
                    });
                    var lista = Object.keys(porId).map(function (k) { return porId[k]; });
                    lista.forEach(function (c) {
                      c.lanc = 0;
                      c.pago = 0;
                      d.obras.forEach(function (o) {
                        (o.lancamentosProducao || []).forEach(function (l) {
                          if ((l.profissionais || []).indexOf(c.id) !== -1) { c.lanc++; }
                          if ((l.ajudantes || []).indexOf(c.id) !== -1) { c.lanc++; }
                        });
                        (o.colaboradoresPgto || []).forEach(function (p) {
                          if (p && p.id === c.id && p.valorPagoManual) {
                            Object.keys(p.valorPagoManual).forEach(function (m) { c.pago += num(p.valorPagoManual[m]); });
                          }
                        });
                      });
                    });
                    return lista;
                  }
                
                  function acharColabsDuplicados() {
                    var lista = todosColaboradores();
                    var grupos = agruparPorChaves(lista, function (c) {
                      var ch = [];
                      var cp = digitos(c.cpf);
                      if (cp.length >= 11) { ch.push('cpf:' + cp); }
                      var n = norm(c.nome);
                      if (n) { ch.push('nome:' + n); }
                      return ch;
                    });
                    grupos.forEach(function (g) {
                      g.sort(function (a, b) { return (b.lanc - a.lanc) || (b.pago - a.pago) || (digitos(b.cpf).length - digitos(a.cpf).length); });
                    });
                    return grupos;
                  }
                
                  /* ---------------------------------------------------------------- *
                   * uniao de listas sem perder nada
                   * ---------------------------------------------------------------- */
                  function juntarLista(destino, origem, ajustar) {
                    if (!Array.isArray(destino) || !Array.isArray(origem)) { return 0; }
                    var idsDestino = {};
                    destino.forEach(function (x) { if (x && x.id != null) { idsDestino[String(x.id)] = x; } });
                    var somados = 0;
                    origem.forEach(function (item) {
                      if (!item || typeof item !== 'object') { destino.push(item); somados++; return; }
                      var copia = JSON.parse(JSON.stringify(item));
                      if (typeof ajustar === 'function') { ajustar(copia); }
                      var id = copia.id != null ? String(copia.id) : '';
                      if (id && idsDestino[id]) {
                        if (igual(idsDestino[id], copia)) { return; }
                        copia.id = novoId('dup');
                      }
                      destino.push(copia);
                      if (copia.id != null) { idsDestino[String(copia.id)] = copia; }
                      somados++;
                    });
                    return somados;
                  }
                
                  function juntarPgto(destino, origem) {
                    if (!Array.isArray(destino) || !Array.isArray(origem)) { return; }
                    origem.forEach(function (p) {
                      if (!p || !p.id) { return; }
                      var alvo = null;
                      destino.forEach(function (q) { if (q && q.id === p.id) { alvo = q; } });
                      if (!alvo) {
                        alvo = { id: p.id, nome: p.nome || '', funcao: p.funcao || '', valorPagoManual: {} };
                        destino.push(alvo);
                      }
                      if (!alvo.valorPagoManual) { alvo.valorPagoManual = {}; }
                      var mapa = p.valorPagoManual || {};
                      Object.keys(mapa).forEach(function (mes) {
                        alvo.valorPagoManual[mes] = num(alvo.valorPagoManual[mes]) + num(mapa[mes]);
                      });
                      if (!alvo.nome && p.nome) { alvo.nome = p.nome; }
                      if (!alvo.funcao && p.funcao) { alvo.funcao = p.funcao; }
                    });
                  }
                
                  var CAMPOS_TRATADOS = {
                    id: 1, nome: 1, numContrato: 1, valorContrato: 1, pctServico: 1, numMedicaoMax: 1,
                    consideracoesPorMedicao: 1, itens: 1, recebimentos: 1, colaboradores: 1,
                    colaboradoresPgto: 1, lancamentosProducao: 1, centrosCusto: 1, cronogramaTasks: 1,
                    obraflow: 1, medicoesFinais: 1, lancExcluidos: 1
                  };
                
                  function vazio(v) {
                    if (v === undefined || v === null || v === '') { return true; }
                    if (Array.isArray(v)) { return v.length === 0; }
                    if (typeof v === 'object') { return Object.keys(v).length === 0; }
                    return false;
                  }
                
                  /* ---------------------------------------------------------------- *
                   * unir duas obras (dup entra na principal)
                   * ---------------------------------------------------------------- */
                  function unirObra(principal, dup) {
                    var conta = { itens: 0, receb: 0, lanc: 0, colabs: 0, centros: 0 };
                
                    if (!Array.isArray(principal.itens)) { principal.itens = []; }
                    if (!Array.isArray(principal.recebimentos)) { principal.recebimentos = []; }
                    if (!Array.isArray(principal.colaboradores)) { principal.colaboradores = []; }
                    if (!Array.isArray(principal.colaboradoresPgto)) { principal.colaboradoresPgto = []; }
                    if (!Array.isArray(principal.lancamentosProducao)) { principal.lancamentosProducao = []; }
                    if (!Array.isArray(principal.centrosCusto)) { principal.centrosCusto = []; }
                    if (!Array.isArray(principal.lancExcluidos)) { principal.lancExcluidos = []; }
                
                    conta.itens = juntarLista(principal.itens, dup.itens || []);
                    conta.receb = juntarLista(principal.recebimentos, dup.recebimentos || []);
                    conta.colabs = juntarLista(principal.colaboradores, dup.colaboradores || []);
                    conta.lanc = juntarLista(principal.lancamentosProducao, dup.lancamentosProducao || [], function (l) {
                      l.obraId = principal.id;
                      l.obraNome = principal.nome;
                    });
                    conta.centros = juntarLista(principal.centrosCusto, dup.centrosCusto || [], function (c) {
                      c.obraId = principal.id;
                    });
                
                    juntarPgto(principal.colaboradoresPgto, dup.colaboradoresPgto || []);
                
                    (dup.lancExcluidos || []).forEach(function (x) {
                      if (principal.lancExcluidos.indexOf(x) === -1) { principal.lancExcluidos.push(x); }
                    });
                
                    if (!principal.numContrato && dup.numContrato) { principal.numContrato = dup.numContrato; }
                    if (!num(principal.valorContrato) && num(dup.valorContrato)) { principal.valorContrato = dup.valorContrato; }
                    if (principal.pctServico === undefined || principal.pctServico === null || principal.pctServico === '') {
                      if (dup.pctServico !== undefined) { principal.pctServico = dup.pctServico; }
                    }
                    principal.numMedicaoMax = Math.max(num(principal.numMedicaoMax) || 1, num(dup.numMedicaoMax) || 1);
                
                    if (!principal.consideracoesPorMedicao || typeof principal.consideracoesPorMedicao !== 'object') {
                      principal.consideracoesPorMedicao = {};
                    }
                    var cons = dup.consideracoesPorMedicao || {};
                    Object.keys(cons).forEach(function (k) {
                      var atual = principal.consideracoesPorMedicao[k];
                      if (!atual) { principal.consideracoesPorMedicao[k] = cons[k]; }
                      else if (cons[k] && String(atual).indexOf(String(cons[k])) === -1) {
                        principal.consideracoesPorMedicao[k] = String(atual) + '\n' + String(cons[k]);
                      }
                    });
                
                    if (!principal.medicoesFinais || typeof principal.medicoesFinais !== 'object') { principal.medicoesFinais = {}; }
                    var mf = dup.medicoesFinais || {};
                    Object.keys(mf).forEach(function (k) { if (mf[k]) { principal.medicoesFinais[k] = mf[k]; } });
                
                    if (vazio(principal.cronogramaTasks) && !vazio(dup.cronogramaTasks)) {
                      principal.cronogramaTasks = JSON.parse(JSON.stringify(dup.cronogramaTasks));
                    }
                
                    var tarefasDup = (dup.obraflow && Array.isArray(dup.obraflow.tarefas)) ? dup.obraflow.tarefas : [];
                    if (tarefasDup.length) {
                      if (!principal.obraflow || typeof principal.obraflow !== 'object') {
                        principal.obraflow = { versao: 1, titulo: '', tarefas: [] };
                      }
                      if (!Array.isArray(principal.obraflow.tarefas)) { principal.obraflow.tarefas = []; }
                      juntarLista(principal.obraflow.tarefas, tarefasDup);
                      if (!principal.obraflow.titulo && dup.obraflow.titulo) { principal.obraflow.titulo = dup.obraflow.titulo; }
                    }
                
                    Object.keys(dup).forEach(function (k) {
                      if (CAMPOS_TRATADOS[k]) { return; }
                      if (vazio(principal[k]) && !vazio(dup[k])) {
                        try { principal[k] = JSON.parse(JSON.stringify(dup[k])); } catch (e) { principal[k] = dup[k]; }
                      }
                    });
                
                    return conta;
                  }
                
                  function trocarObraNaAgenda(deId, paraId, paraNome) {
                    var ag = lerAgenda();
                    if (!ag) { return 0; }
                    var evs = listaEventosAgenda(ag);
                    var mexeu = 0;
                    evs.forEach(function (ev) {
                      if (!ev || typeof ev !== 'object') { return; }
                      if (String(ev.obraId || '') === String(deId)) {
                        ev.obraId = paraId;
                        if (ev.obraNome !== undefined) { ev.obraNome = paraNome; }
                        mexeu++;
                      }
                    });
                    if (mexeu) { gravarAgenda(ag); }
                    return mexeu;
                  }
                
                  /* ---------------------------------------------------------------- *
                   * trocar o codigo de um colaborador em todo o painel
                   * ---------------------------------------------------------------- */
                  function unirColaborador(grupo, idPrincipal) {
                    var d = banco();
                    if (!d) { return null; }
                    var alvos = {};
                    var modelo = null;
                    grupo.forEach(function (c) {
                      if (c.id === idPrincipal) { return; }
                      alvos[c.id] = true;
                    });
                
                    d.obras.forEach(function (o) {
                      (o.colaboradores || []).forEach(function (c) {
                        if (c && c.id === idPrincipal && !modelo) { modelo = JSON.parse(JSON.stringify(c)); }
                      });
                    });
                    if (!modelo) {
                      grupo.forEach(function (c) {
                        if (c.id === idPrincipal && !modelo) {
                          modelo = { id: c.id, nome: c.nome, funcao: c.funcao, telefone: c.telefone, cpf: c.cpf };
                        }
                      });
                    }
                    if (!modelo) { return null; }
                
                    var conta = { lanc: 0, fichas: 0, valores: 0 };
                
                    d.obras.forEach(function (o) {
                      var tinhaDup = false;
                      if (Array.isArray(o.colaboradores)) {
                        o.colaboradores.forEach(function (c) { if (c && alvos[c.id]) { tinhaDup = true; } });
                        o.colaboradores.forEach(function (c) {
                          if (!c || !alvos[c.id]) { return; }
                          if (!modelo.cpf && c.cpf) { modelo.cpf = c.cpf; }
                          if (!modelo.telefone && c.telefone) { modelo.telefone = c.telefone; }
                          if (!modelo.funcao && c.funcao) { modelo.funcao = c.funcao; }
                        });
                        o.colaboradores = o.colaboradores.filter(function (c) { return !(c && alvos[c.id]); });
                        var temPrincipal = false;
                        o.colaboradores.forEach(function (c) { if (c && c.id === idPrincipal) { temPrincipal = true; } });
                        if (tinhaDup && !temPrincipal) {
                          o.colaboradores.push(JSON.parse(JSON.stringify(modelo)));
                          conta.fichas++;
                        }
                      }
                
                      (o.lancamentosProducao || []).forEach(function (l) {
                        ['profissionais', 'ajudantes'].forEach(function (campo) {
                          if (!Array.isArray(l[campo])) { return; }
                          var trocou = false;
                          var saida = [];
                          l[campo].forEach(function (id) {
                            var novo = alvos[id] ? idPrincipal : id;
                            if (novo !== id) { trocou = true; }
                            if (saida.indexOf(novo) === -1) { saida.push(novo); }
                          });
                          if (trocou) { l[campo] = saida; conta.lanc++; }
                        });
                      });
                
                      if (Array.isArray(o.colaboradoresPgto)) {
                        var principalPgto = null;
                        o.colaboradoresPgto.forEach(function (p) { if (p && p.id === idPrincipal) { principalPgto = p; } });
                        var duplicados = o.colaboradoresPgto.filter(function (p) { return p && alvos[p.id]; });
                        if (duplicados.length) {
                          if (!principalPgto) {
                            principalPgto = { id: idPrincipal, nome: modelo.nome, funcao: modelo.funcao, valorPagoManual: {} };
                            o.colaboradoresPgto.push(principalPgto);
                          }
                          if (!principalPgto.valorPagoManual) { principalPgto.valorPagoManual = {}; }
                          duplicados.forEach(function (p) {
                            var mapa = p.valorPagoManual || {};
                            Object.keys(mapa).forEach(function (mes) {
                              principalPgto.valorPagoManual[mes] = num(principalPgto.valorPagoManual[mes]) + num(mapa[mes]);
                              conta.valores++;
                            });
                          });
                          o.colaboradoresPgto = o.colaboradoresPgto.filter(function (p) { return !(p && alvos[p.id]); });
                        }
                      }
                    });
                
                    return conta;
                  }
                
                  /* ---------------------------------------------------------------- *
                   * gravar e redesenhar
                   * ---------------------------------------------------------------- */
                  function gravarTudo() {
                    var okNuvem = false;
                    try { if (typeof window.salvarLocalComoBackup === 'function') { window.salvarLocalComoBackup(); } } catch (e) {}
                    try { if (typeof window.sincronizarBancoNuvem === 'function') { window.sincronizarBancoNuvem(); okNuvem = true; } } catch (e) {}
                    try { if (typeof window.salvarDB === 'function') { window.salvarDB(true); } } catch (e) {}
                    ['popularSelectObras', 'preencherSelectObras', 'popularSelectsPgto', 'renderListaColaboradores', 'renderPagamento', 'render'].forEach(function (fn) {
                      try { if (typeof window[fn] === 'function') { window[fn](); } } catch (e) {}
                    });
                    return okNuvem;
                  }
                
                  /* ---------------------------------------------------------------- *
                   * painel de revisao
                   * ---------------------------------------------------------------- */
                  var estado = { obras: [], colabs: [] };
                
                  function estilo() {
                    if (document.getElementById('ps81Estilo')) { return; }
                    var s = document.createElement('style');
                    s.id = 'ps81Estilo';
                    s.setAttribute('data-ps81', '1');
                    s.textContent = [
                      '.ps81-aviso{position:fixed;right:16px;bottom:16px;z-index:2147483000;padding:10px 14px;border-radius:8px;font:600 13px system-ui,Arial;color:#fff;background:#16a34a;box-shadow:0 6px 20px rgba(0,0,0,.3);display:none}',
                      '.ps81-erro{background:#dc2626}',
                      '#ps81Botao{background:#7c3aed;color:#fff;border:1px solid #7c3aed;border-radius:8px;padding:8px 12px;font:600 13px system-ui,Arial;cursor:pointer}',
                      '#ps81Botao:hover{background:#6d28d9}',
                      '#ps81Fundo{position:fixed;inset:0;background:rgba(2,6,23,.72);z-index:2147483100;display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px}',
                      '#ps81Caixa{background:#0f172a;color:#e2e8f0;width:min(980px,96vw);border:1px solid #334155;border-radius:12px;font:400 14px system-ui,Arial;box-shadow:0 20px 60px rgba(0,0,0,.5)}',
                      '#ps81Caixa header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid #334155}',
                      '#ps81Caixa header h3{margin:0;font-size:16px;color:#fff}',
                      '#ps81Fechar{background:#334155;color:#fff;border:0;border-radius:8px;padding:6px 11px;cursor:pointer;font-weight:700}',
                      '#ps81Corpo{padding:14px 16px;max-height:66vh;overflow:auto}',
                      '#ps81Pe{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;padding:12px 16px;border-top:1px solid #334155}',
                      '.ps81-btn{background:#334155;color:#fff;border:0;border-radius:8px;padding:9px 14px;cursor:pointer;font-weight:700;font-size:13px}',
                      '.ps81-btn-ok{background:#16a34a}',
                      '.ps81-btn-ok:hover{background:#15803d}',
                      '.ps81-secao{margin:0 0 16px}',
                      '.ps81-secao h4{margin:0 0 8px;font-size:14px;color:#a5b4fc;text-transform:uppercase;letter-spacing:.04em}',
                      '.ps81-grupo{border:1px solid #334155;border-radius:10px;padding:10px 12px;margin:0 0 10px;background:#111c31}',
                      '.ps81-grupo.ps81-off{opacity:.45}',
                      '.ps81-topo{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:700;color:#fff}',
                      '.ps81-linha{display:flex;align-items:flex-start;gap:8px;padding:6px 8px;border-radius:8px;border:1px solid transparent}',
                      '.ps81-linha:hover{background:#16233b}',
                      '.ps81-linha.ps81-fica{border-color:#16a34a;background:rgba(22,163,74,.12)}',
                      '.ps81-linha label{cursor:pointer;flex:1}',
                      '.ps81-tag{display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:999px;padding:1px 8px;margin:2px 4px 0 0;font-size:11px;color:#cbd5e1}',
                      '.ps81-fica-tag{background:#16a34a;border-color:#16a34a;color:#fff}',
                      '.ps81-nota{font-size:12px;color:#94a3b8;margin:6px 0 0}',
                      '.ps81-vazio{padding:10px;border:1px dashed #334155;border-radius:10px;color:#94a3b8}',
                      '.ps81-resumo{white-space:pre-wrap;background:#0b1324;border:1px solid #334155;border-radius:10px;padding:10px;font:12px/1.5 ui-monospace,Consolas,monospace;color:#cbd5e1;margin-top:10px}',
                      '@media print{#ps81Fundo,#ps81Botao,.ps81-aviso{display:none !important}}'
                    ].join('\n');
                    document.head.appendChild(s);
                  }
                
                  function caixaMenu() {
                    return document.querySelector('#meu-menu-abas .tabs') ||
                           document.querySelector('details#meu-menu-abas .tabs') ||
                           null;
                  }
                
                  function colocarBotao() {
                    /* patch109: o item "Unificar Duplicados" saiu do menu */
                    try {
                      var p109ant = document.getElementById('ps81Botao');
                      if (p109ant && p109ant.parentNode) {
                        p109ant.parentNode.removeChild(p109ant);
                      }
                    } catch (p109e2) {}
                    return;
                  }
                
                  function p109ColocarBotaoAntigo() {
                    var cx = caixaMenu();
                    if (!cx) { return; }
                    var b = document.getElementById('ps81Botao');
                    if (!b) {
                      b = document.createElement('button');
                      b.id = 'ps81Botao';
                      b.type = 'button';
                      b.setAttribute('data-ps81', '1');
                      b.textContent = 'Unificar Duplicados';
                      b.onclick = function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        abrir();
                      };
                    }
                    if (b.parentNode !== cx) { cx.appendChild(b); }
                  }
                
                  function montarCaixa() {
                    var f = document.getElementById('ps81Fundo');
                    if (f) { return f; }
                    f = document.createElement('div');
                    f.id = 'ps81Fundo';
                    f.setAttribute('data-ps81', '1');
                    f.innerHTML =
                      '<div id="ps81Caixa" role="dialog" aria-modal="true" aria-labelledby="ps81Titulo">' +
                        '<header><h3 id="ps81Titulo">Unificar obras e colaboradores duplicados</h3>' +
                        '<button id="ps81Fechar" type="button" aria-label="Fechar">Fechar</button></header>' +
                        '<div id="ps81Corpo"></div>' +
                        '<div id="ps81Pe">' +
                          '<button class="ps81-btn" id="ps81Recarregar" type="button">Verificar de novo</button>' +
                          '<button class="ps81-btn" id="ps81Previa" type="button">Ver previa</button>' +
                          '<button class="ps81-btn ps81-btn-ok" id="ps81Aplicar" type="button">Unificar selecionados</button>' +
                        '</div>' +
                      '</div>';
                    document.body.appendChild(f);
                    f.querySelector('#ps81Fechar').onclick = fechar;
                    f.querySelector('#ps81Recarregar').onclick = function () { desenhar(); };
                    f.querySelector('#ps81Previa').onclick = mostrarPrevia;
                    f.querySelector('#ps81Aplicar').onclick = aplicar;
                    f.addEventListener('click', function (ev) { if (ev.target === f) { fechar(); } });
                    return f;
                  }
                
                  function abrir() {
                    estilo();
                    montarCaixa();
                    desenhar();
                    document.getElementById('ps81Fundo').style.display = 'flex';
                  }
                
                  function fechar() {
                    var f = document.getElementById('ps81Fundo');
                    if (f) { f.style.display = 'none'; }
                  }
                
                  function tag(txt) { return '<span class="ps81-tag">' + esc(txt) + '</span>'; }
                
                  function desenhar() {
                    var corpo = document.getElementById('ps81Corpo');
                    if (!corpo) { return; }
                    var d = banco();
                    if (!d) {
                      corpo.innerHTML = '<div class="ps81-vazio">Nao consegui ler o banco de obras deste navegador. Abra o painel normalmente e tente de novo.</div>';
                      return;
                    }
                
                    estado.obras = acharObrasDuplicadas();
                    estado.colabs = acharColabsDuplicados();
                
                    var h = '';
                
                    h += '<div class="ps81-secao"><h4>Obras duplicadas (' + estado.obras.length + ')</h4>';
                    if (!estado.obras.length) {
                      h += '<div class="ps81-vazio">Nenhuma obra repetida encontrada.</div>';
                    } else {
                      estado.obras.forEach(function (g, gi) {
                        h += '<div class="ps81-grupo" id="ps81GO' + gi + '">';
                        h += '<div class="ps81-topo"><input type="checkbox" id="ps81CO' + gi + '" checked data-tipo="obra" data-gi="' + gi + '">' +
                             '<label for="ps81CO' + gi + '">' + esc(g[0].nome || 'Obra sem nome') + ' - ' + g.length + ' cadastros</label></div>';
                        g.forEach(function (o, oi) {
                          var r = resumoObra(o);
                          h += '<div class="ps81-linha' + (oi === 0 ? ' ps81-fica' : '') + '" data-lin="o' + gi + '">';
                          h += '<input type="radio" name="ps81RO' + gi + '" id="ps81RO' + gi + '_' + oi + '" value="' + esc(o.id) + '"' + (oi === 0 ? ' checked' : '') + '>';
                          h += '<label for="ps81RO' + gi + '_' + oi + '"><strong>' + esc(o.nome || 'sem nome') + '</strong>' +
                               (oi === 0 ? '<span class="ps81-tag ps81-fica-tag">sugerido para ficar</span>' : '') + '<br>' +
                               tag('contrato: ' + (o.numContrato || 'sem numero')) +
                               tag('valor: ' + moeda(r.valor)) +
                               tag(r.itens + ' itens') +
                               tag(r.lanc + ' lancamentos') +
                               tag(r.recebimentos + ' recebimentos') +
                               tag(r.colabs + ' colaboradores') +
                               tag(r.centros + ' centros de custo') +
                               tag('medicao ate ' + r.medicoes) +
                               '</label></div>';
                        });
                        h += '<p class="ps81-nota">O cadastro marcado fica. Os outros somem da lista, mas tudo que tem dentro deles (itens, medicoes, recebimentos, lancamentos, centros de custo e compromissos da agenda) passa para o que ficou.</p>';
                        h += '</div>';
                      });
                    }
                    h += '</div>';
                
                    h += '<div class="ps81-secao"><h4>Colaboradores duplicados (' + estado.colabs.length + ')</h4>';
                    if (!estado.colabs.length) {
                      h += '<div class="ps81-vazio">Nenhum colaborador repetido encontrado.</div>';
                    } else {
                      estado.colabs.forEach(function (g, gi) {
                        h += '<div class="ps81-grupo" id="ps81GC' + gi + '">';
                        h += '<div class="ps81-topo"><input type="checkbox" id="ps81CC' + gi + '" checked data-tipo="colab" data-gi="' + gi + '">' +
                             '<label for="ps81CC' + gi + '">' + esc(g[0].nome || 'Sem nome') + ' - ' + g.length + ' cadastros</label></div>';
                        g.forEach(function (c, ci) {
                          h += '<div class="ps81-linha' + (ci === 0 ? ' ps81-fica' : '') + '" data-lin="c' + gi + '">';
                          h += '<input type="radio" name="ps81RC' + gi + '" id="ps81RC' + gi + '_' + ci + '" value="' + esc(c.id) + '"' + (ci === 0 ? ' checked' : '') + '>';
                          h += '<label for="ps81RC' + gi + '_' + ci + '"><strong>' + esc(c.nome || 'sem nome') + '</strong>' +
                               (ci === 0 ? '<span class="ps81-tag ps81-fica-tag">sugerido para ficar</span>' : '') + '<br>' +
                               tag('funcao: ' + (c.funcao || 'nao informada')) +
                               tag('cpf: ' + (c.cpf || 'sem cpf')) +
                               tag('telefone: ' + (c.telefone || 'sem telefone')) +
                               tag(c.lanc + ' lancamentos de producao') +
                               tag('pago: ' + moeda(c.pago)) +
                               tag('obras: ' + (c.obras.join(', ') || '-')) +
                               '</label></div>';
                        });
                        h += '<p class="ps81-nota">Os lancamentos de producao e os valores pagos dos cadastros repetidos passam para o cadastro escolhido, somando mes a mes.</p>';
                        h += '</div>';
                      });
                    }
                    h += '</div>';
                
                    h += '<p class="ps81-nota">Antes de unir, uma copia de seguranca do banco atual e guardada neste navegador. Nada e apagado sem essa copia.</p>';
                
                    corpo.innerHTML = h;
                
                    corpo.querySelectorAll('input[type=radio]').forEach(function (r) {
                      r.onchange = function () {
                        var lin = r.parentNode.getAttribute('data-lin');
                        corpo.querySelectorAll('.ps81-linha[data-lin="' + lin + '"]').forEach(function (el) {
                          el.classList.remove('ps81-fica');
                        });
                        r.parentNode.classList.add('ps81-fica');
                      };
                    });
                    corpo.querySelectorAll('input[type=checkbox]').forEach(function (c) {
                      c.onchange = function () {
                        var tipo = c.getAttribute('data-tipo');
                        var gi = c.getAttribute('data-gi');
                        var cx = document.getElementById(tipo === 'obra' ? ('ps81GO' + gi) : ('ps81GC' + gi));
                        if (cx) { cx.classList.toggle('ps81-off', !c.checked); }
                      };
                    });
                  }
                
                  function escolhas() {
                    var res = { obras: [], colabs: [] };
                    estado.obras.forEach(function (g, gi) {
                      var c = document.getElementById('ps81CO' + gi);
                      if (!c || !c.checked) { return; }
                      var m = document.querySelector('input[name="ps81RO' + gi + '"]:checked');
                      if (!m) { return; }
                      res.obras.push({ grupo: g, fica: m.value });
                    });
                    estado.colabs.forEach(function (g, gi) {
                      var c = document.getElementById('ps81CC' + gi);
                      if (!c || !c.checked) { return; }
                      var m = document.querySelector('input[name="ps81RC' + gi + '"]:checked');
                      if (!m) { return; }
                      res.colabs.push({ grupo: g, fica: m.value });
                    });
                    return res;
                  }
                
                  function textoPrevia(esc2) {
                    var lin = [];
                    if (!esc2.obras.length && !esc2.colabs.length) {
                      return 'Nada selecionado para unificar.';
                    }
                    esc2.obras.forEach(function (it) {
                      var fica = null;
                      var somaItens = 0, somaLanc = 0, somaReceb = 0, somaCentros = 0, somaColabs = 0;
                      var nomes = [];
                      it.grupo.forEach(function (o) {
                        if (o.id === it.fica) { fica = o; return; }
                        var r = resumoObra(o);
                        somaItens += r.itens; somaLanc += r.lanc; somaReceb += r.recebimentos;
                        somaCentros += r.centros; somaColabs += r.colabs;
                        nomes.push(o.nome || o.id);
                      });
                      lin.push('OBRA que fica: ' + ((fica && fica.nome) || it.fica));
                      lin.push('  junta ' + (it.grupo.length - 1) + ' cadastro(s): ' + (nomes.join(' | ') || '-'));
                      lin.push('  vem para ela: ' + somaItens + ' itens, ' + somaLanc + ' lancamentos, ' +
                               somaReceb + ' recebimentos, ' + somaColabs + ' colaboradores, ' + somaCentros + ' centros de custo');
                      lin.push('');
                    });
                    esc2.colabs.forEach(function (it) {
                      var fica = null, lanc = 0, pago = 0, nomes = [];
                      it.grupo.forEach(function (c) {
                        if (c.id === it.fica) { fica = c; return; }
                        lanc += c.lanc; pago += c.pago;
                        nomes.push(c.nome + ' (' + (c.funcao || 'sem funcao') + ')');
                      });
                      lin.push('COLABORADOR que fica: ' + ((fica && fica.nome) || it.fica));
                      lin.push('  junta ' + (it.grupo.length - 1) + ' cadastro(s): ' + (nomes.join(' | ') || '-'));
                      lin.push('  vem para ele: ' + lanc + ' lancamento(s) e ' + moeda(pago) + ' em valores pagos');
                      lin.push('');
                    });
                    return lin.join('\n');
                  }
                
                  function mostrarPrevia() {
                    var corpo = document.getElementById('ps81Corpo');
                    if (!corpo) { return; }
                    var box = document.getElementById('ps81Resumo');
                    if (!box) {
                      box = document.createElement('div');
                      box.id = 'ps81Resumo';
                      box.className = 'ps81-resumo';
                      corpo.appendChild(box);
                    }
                    box.textContent = textoPrevia(escolhas());
                    box.scrollIntoView({ block: 'nearest' });
                  }
                
                  function aplicar() {
                    var d = banco();
                    if (!d) { aviso('Nao consegui ler o banco de obras.', 'erro'); return; }
                    var esc2 = escolhas();
                    if (!esc2.obras.length && !esc2.colabs.length) {
                      aviso('Escolha pelo menos um grupo para unificar.', 'erro');
                      return;
                    }
                    var pergunta = 'Confirmar a unificacao?\n\n' + textoPrevia(esc2) +
                                   '\nUma copia de seguranca sera guardada antes de mexer.';
                    if (!window.confirm(pergunta)) { return; }
                
                    var chaveBkp = guardarCopia();
                
                    var obrasUnidas = 0, colabsUnidos = 0, eventos = 0;
                
                    esc2.obras.forEach(function (it) {
                      var principal = null;
                      d.obras.forEach(function (o) { if (o.id === it.fica) { principal = o; } });
                      if (!principal) { return; }
                      it.grupo.forEach(function (o) {
                        if (!o || o.id === principal.id) { return; }
                        var dup = null;
                        d.obras.forEach(function (x) { if (x.id === o.id) { dup = x; } });
                        if (!dup) { return; }
                        unirObra(principal, dup);
                        eventos += trocarObraNaAgenda(dup.id, principal.id, principal.nome);
                        d.obras = d.obras.filter(function (x) { return x.id !== dup.id; });
                        if (d.obraAtualId === dup.id) { d.obraAtualId = principal.id; }
                        obrasUnidas++;
                      });
                    });
                
                    esc2.colabs.forEach(function (it) {
                      var r = unirColaborador(it.grupo, it.fica);
                      if (r) { colabsUnidos += (it.grupo.length - 1); }
                    });
                
                    try { window.dbObras = d.obras; } catch (e) {}
                    gravarTudo();
                
                    var msg = 'Pronto: ' + obrasUnidas + ' obra(s) e ' + colabsUnidos + ' colaborador(es) unificados' +
                              (eventos ? (', ' + eventos + ' compromisso(s) da agenda ajustados') : '') + '.';
                    aviso(msg, 'ok');
                
                    desenhar();
                    var box = document.getElementById('ps81Resumo');
                    if (box) {
                      box.textContent = msg + (chaveBkp ? ('\nCopia de seguranca guardada em: ' + chaveBkp) : '\nAtencao: nao foi possivel guardar a copia de seguranca neste navegador.');
                    }
                  }
                
                  /* ---------------------------------------------------------------- *
                   * partida
                   * ---------------------------------------------------------------- */
                  function iniciar() {
                    estilo();
                    colocarBotao();
                    window.__varreduraUnica(colocarBotao);
                  }
                
                  window.abrirUnificarDuplicados = abrir;
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', iniciar);
                  } else {
                    iniciar();
                  }
                })();
            
