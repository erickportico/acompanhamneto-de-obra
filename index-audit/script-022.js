
                /* === PATCH 48: menu em barra de icones + gantt e kanban (funcionamento) === */
                (function () {
                  "use strict";
                
                  var KEY = 'painelAgendaObras_v1';
                  var KEY48 = 'painelAgendaVisao48';
                  var DIAS_GANTT = 42;
                
                  var MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                  var DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
                
                  var TIPOS = [
                    { id: 'visita',     nome: 'Visita a obra',       cor: '#2563eb' },
                    { id: 'entrega',    nome: 'Entrega de material', cor: '#0891b2' },
                    { id: 'medicao',    nome: 'Medicao',             cor: '#7c3aed' },
                    { id: 'instalacao', nome: 'Instalacao',          cor: '#059669' },
                    { id: 'reuniao',    nome: 'Reuniao',             cor: '#d97706' },
                    { id: 'prazo',      nome: 'Prazo / Entrega',     cor: '#dc2626' },
                    { id: 'outro',      nome: 'Outro',               cor: '#475569' }
                  ];
                
                  var modo = null;          /* null | 'gantt' | 'kanban' */
                  var refG = null;          /* mes exibido no gantt */
                  var pintando = false;
                  var obsCorpo = null;
                  var obsAba = null;
                
                  /* ---------------- utilidades ---------------- */
                
                  function esc(v) {
                    return String(v == null ? '' : v)
                      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                  }
                  function pad(n) { return (n < 10 ? '0' : '') + n; }
                  function dStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
                  function sData(s) {
                    var p = String(s || '').split('-');
                    if (p.length !== 3) { return null; }
                    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
                    if (isNaN(d.getTime())) { return null; }
                    return d;
                  }
                  function hojeStr() { return dStr(new Date()); }
                  function brData(s) {
                    var d = sData(s);
                    if (!d) { return '-'; }
                    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
                  }
                  function somaDias(d, n) {
                    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                    x.setDate(x.getDate() + n);
                    return x;
                  }
                  function tipoInfo(id) {
                    var i;
                    for (i = 0; i < TIPOS.length; i++) { if (TIPOS[i].id === id) { return TIPOS[i]; } }
                    return TIPOS[TIPOS.length - 1];
                  }
                  function primeiroDoMes(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
                
                  function listaObras() {
                    var d = window.db;
                    if (d && Object.prototype.toString.call(d.obras) === '[object Array]') { return d.obras; }
                    if (Object.prototype.toString.call(window.dbObras) === '[object Array]') { return window.dbObras; }
                    return [];
                  }
                  function nomeObra(id) {
                    var l = listaObras(), i;
                    for (i = 0; i < l.length; i++) {
                      if (l[i] && l[i].id === id) { return l[i].nome || 'Obra sem nome'; }
                    }
                    return id ? 'Obra removida' : '(sem obra)';
                  }
                
                  /* ---------------- dados guardados ---------------- */
                
                  function ler() {
                    var saida = { eventos: [], filtro: { obra: '', tipo: '', situacao: '', texto: '' } };
                    try {
                      var bruto = localStorage.getItem(KEY);
                      if (!bruto) { return saida; }
                      var o = JSON.parse(bruto);
                      if (o && Object.prototype.toString.call(o.eventos) === '[object Array]') {
                        saida.eventos = o.eventos;
                      }
                      if (o && o.filtro) {
                        saida.filtro.obra = o.filtro.obra || '';
                        saida.filtro.tipo = o.filtro.tipo || '';
                        saida.filtro.situacao = o.filtro.situacao || '';
                      }
                    } catch (e) { /* dados corrompidos: comeca vazio */ }
                    return saida;
                  }
                
                  function valorDe(id, atual) {
                    var el = document.getElementById(id);
                    return el ? el.value : atual;
                  }
                
                  function filtrosAtuais(dados) {
                    return {
                      obra: valorDe('agFiltroObra', dados.filtro.obra) || '',
                      tipo: valorDe('agFiltroTipo', dados.filtro.tipo) || '',
                      situacao: valorDe('agFiltroSituacao', dados.filtro.situacao) || '',
                      texto: valorDe('agFiltroTexto', '') || ''
                    };
                  }
                
                  function lerModo() {
                    try {
                      var v = localStorage.getItem(KEY48);
                      if (v === 'gantt' || v === 'kanban') { return v; }
                    } catch (e) { /* sem gravacao: segue sem visao salva */ }
                    return null;
                  }
                  function gravarModo(v) {
                    try {
                      if (v) { localStorage.setItem(KEY48, v); }
                      else { localStorage.removeItem(KEY48); }
                    } catch (e) { /* sem gravacao: nao e problema */ }
                  }
                
                  /* ---------------- repeticao e filtros ---------------- */
                
                  function ocorrencias(ev, iniStr, fimStr) {
                    var base = sData(ev.data);
                    if (!base) { return []; }
                    var ini = sData(iniStr), fim = sData(fimStr);
                    var rep = ev.repetir || 'nao';
                    var limite = ev.repetirAte ? sData(ev.repetirAte) : null;
                    var saida = [], atual = base, passos = 0;
                
                    if (rep === 'nao' || !rep) {
                      if ((!ini || base >= ini) && (!fim || base <= fim)) { saida.push(ev.data); }
                      return saida;
                    }
                    if (!limite) { limite = somaDias(base, 730); }
                
                    while (passos < 400 && atual <= limite) {
                      if ((!ini || atual >= ini) && (!fim || atual <= fim)) { saida.push(dStr(atual)); }
                      if (fim && atual > fim) { break; }
                      if (rep === 'semanal') { atual = somaDias(atual, 7); }
                      else if (rep === 'quinzenal') { atual = somaDias(atual, 14); }
                      else if (rep === 'mensal') {
                        var alvoMes = atual.getMonth() + 1, alvoAno = atual.getFullYear();
                        if (alvoMes > 11) { alvoMes = 0; alvoAno += 1; }
                        var ultimo = new Date(alvoAno, alvoMes + 1, 0).getDate();
                        atual = new Date(alvoAno, alvoMes, Math.min(base.getDate(), ultimo));
                      } else { break; }
                      passos++;
                    }
                    return saida;
                  }
                
                  function estadoNa(ev, dia) {
                    if (ev.situacao === 'cancelado') { return 'cancelado'; }
                    var f = ev.feitos;
                    if (Object.prototype.toString.call(f) === '[object Array]' && f.indexOf(dia) >= 0) {
                      return 'concluido';
                    }
                    if ((!ev.repetir || ev.repetir === 'nao') && ev.situacao === 'concluido') { return 'concluido'; }
                    return 'pendente';
                  }
                
                  function passaFiltro(ev, f) {
                    if (f.obra && ev.obraId !== f.obra) { return false; }
                    if (f.tipo && ev.tipo !== f.tipo) { return false; }
                    if (f.texto) {
                      var alvo = (String(ev.titulo || '') + ' ' + String(ev.responsavel || '') + ' ' +
                        String(ev.local || '') + ' ' + String(ev.obs || '') + ' ' +
                        nomeObra(ev.obraId)).toLowerCase();
                      if (alvo.indexOf(f.texto.toLowerCase()) < 0) { return false; }
                    }
                    return true;
                  }
                
                  function itens(dados, iniStr, fimStr) {
                    var f = filtrosAtuais(dados);
                    var saida = [], i, j, dias, estado, ev;
                    for (i = 0; i < dados.eventos.length; i++) {
                      ev = dados.eventos[i];
                      if (!ev || !ev.data) { continue; }
                      if (!passaFiltro(ev, f)) { continue; }
                      dias = ocorrencias(ev, iniStr, fimStr);
                      for (j = 0; j < dias.length; j++) {
                        estado = estadoNa(ev, dias[j]);
                        if (f.situacao && f.situacao !== estado) { continue; }
                        saida.push({ ev: ev, dia: dias[j], estado: estado });
                      }
                    }
                    saida.sort(function (a, b) {
                      if (a.dia !== b.dia) { return a.dia < b.dia ? -1 : 1; }
                      var ha = a.ev.hora || '99:99', hb = b.ev.hora || '99:99';
                      if (ha !== hb) { return ha < hb ? -1 : 1; }
                      return String(a.ev.titulo || '').localeCompare(String(b.ev.titulo || ''));
                    });
                    return saida;
                  }
                
                  /* ---------------- visao Gantt ---------------- */
                
                  function htmlLegenda() {
                    var h = '<div class="v48-legenda">', i;
                    for (i = 0; i < TIPOS.length; i++) {
                      h += '<span><i style="background:' + TIPOS[i].cor + ';"></i>' + esc(TIPOS[i].nome) + '</span>';
                    }
                    return h + '</div>';
                  }
                
                  function htmlGantt() {
                    var dados = ler();
                    if (!refG) { refG = primeiroDoMes(new Date()); }
                
                    var dias = [], i;
                    for (i = 0; i < DIAS_GANTT; i++) { dias.push(somaDias(refG, i)); }
                    var iniStr = dStr(dias[0]), fimStr = dStr(dias[dias.length - 1]);
                    var lista = itens(dados, iniStr, fimStr);
                    var hoje = hojeStr();
                
                    var rotulo = MESES[refG.getMonth()] + ' de ' + refG.getFullYear();
                    var h = '<div data-v48="gantt">';
                    h += '<div class="v48-topo">' +
                      '<button class="v48-nav" data-ag48="g-mes-1" title="Mes anterior">\u2039</button>' +
                      '<span class="v48-titulo">' + esc(rotulo) + '</span>' +
                      '<button class="v48-nav" data-ag48="g-mes+1" title="Mes seguinte">\u203A</button>' +
                      '<button class="v48-nav" data-ag48="g-hoje">Hoje</button>' +
                      htmlLegenda() + '</div>';
                
                    if (!lista.length) {
                      h += '<div class="v48-vazio">Nenhum compromisso nestas 6 semanas. ' +
                        'Use as setas para ver outro periodo.</div></div>';
                      return h;
                    }
                
                    /* junta as ocorrencias por compromisso */
                    var mapa = {}, ordem = [], k, it;
                    for (i = 0; i < lista.length; i++) {
                      it = lista[i];
                      k = String(it.ev.id || it.ev.titulo || i);
                      if (!mapa[k]) {
                        mapa[k] = { ev: it.ev, dias: {}, obra: nomeObra(it.ev.obraId), inicio: it.dia };
                        ordem.push(k);
                      }
                      mapa[k].dias[it.dia] = it.estado;
                    }
                
                    /* agrupa por obra */
                    var grupos = {}, nomesObra = [];
                    for (i = 0; i < ordem.length; i++) {
                      var lin = mapa[ordem[i]];
                      if (!grupos[lin.obra]) { grupos[lin.obra] = []; nomesObra.push(lin.obra); }
                      grupos[lin.obra].push(lin);
                    }
                    nomesObra.sort(function (a, b) { return a.localeCompare(b); });
                
                    /* cabecalho: meses e dias */
                    var cols = '<colgroup><col style="width:232px;">';
                    for (i = 0; i < dias.length; i++) { cols += '<col class="v48-c-dia">'; }
                    cols += '</colgroup>';
                
                    var linhaMes = '<tr><th class="v48-nome" rowspan="2">Compromisso</th>';
                    var atualMes = -1, conta = 0, inicioMes = 0;
                    var blocos = [];
                    for (i = 0; i < dias.length; i++) {
                      if (dias[i].getMonth() !== atualMes) {
                        if (conta > 0) { blocos.push({ m: atualMes, a: dias[inicioMes].getFullYear(), n: conta }); }
                        atualMes = dias[i].getMonth(); conta = 1; inicioMes = i;
                      } else { conta++; }
                    }
                    if (conta > 0) { blocos.push({ m: atualMes, a: dias[inicioMes].getFullYear(), n: conta }); }
                    for (i = 0; i < blocos.length; i++) {
                      linhaMes += '<th class="v48-mes" colspan="' + blocos[i].n + '">' +
                        esc(MESES[blocos[i].m] + ' ' + blocos[i].a) + '</th>';
                    }
                    linhaMes += '</tr>';
                
                    var linhaDia = '<tr>';
                    for (i = 0; i < dias.length; i++) {
                      var ds = dStr(dias[i]);
                      var cl = (dias[i].getDay() === 0 || dias[i].getDay() === 6) ? 'v48-fds' : '';
                      if (ds === hoje) { cl += (cl ? ' ' : '') + 'v48-hoje'; }
                      linhaDia += '<th' + (cl ? ' class="' + cl + '"' : '') + ' title="' + brData(ds) + '">' +
                        dias[i].getDate() + '<br><small>' + DOW[dias[i].getDay()] + '</small></th>';
                    }
                    linhaDia += '</tr>';
                
                    var corpo = '', j, g, lin2, info, dsj, cls, estado;
                    for (i = 0; i < nomesObra.length; i++) {
                      g = grupos[nomesObra[i]];
                      corpo += '<tr class="v48-obra"><td colspan="' + (dias.length + 1) + '">' +
                        esc(nomesObra[i]) + ' \u2014 ' + g.length +
                        (g.length === 1 ? ' compromisso' : ' compromissos') + '</td></tr>';
                      g.sort(function (a, b) { return a.inicio < b.inicio ? -1 : (a.inicio > b.inicio ? 1 : 0); });
                      for (j = 0; j < g.length; j++) {
                        lin2 = g[j];
                        info = tipoInfo(lin2.ev.tipo);
                        corpo += '<tr><td class="v48-nome" title="' + esc(lin2.ev.titulo || '') + '">' +
                          '<b>' + esc(lin2.ev.titulo || '(sem titulo)') + '</b>' +
                          '<small>' + esc(info.nome) +
                          (lin2.ev.hora ? ' \u00b7 ' + esc(lin2.ev.hora) : '') +
                          (lin2.ev.responsavel ? ' \u00b7 ' + esc(lin2.ev.responsavel) : '') +
                          '</small></td>';
                        for (k = 0; k < dias.length; k++) {
                          dsj = dStr(dias[k]);
                          cls = (dias[k].getDay() === 0 || dias[k].getDay() === 6) ? 'v48-fds' : '';
                          if (dsj === hoje) { cls += (cls ? ' ' : '') + 'v48-hoje'; }
                          corpo += '<td' + (cls ? ' class="' + cls + '"' : '') + '>';
                          estado = lin2.dias[dsj];
                          if (estado) {
                            var clb = 'v48-barra';
                            if (estado === 'concluido' || estado === 'cancelado') { clb += ' v48-ok'; }
                            else if (dsj < hoje) { clb += ' v48-atraso'; }
                            corpo += '<span class="' + clb + '" style="background:' + info.cor + ';"' +
                              ' data-ag="abrir" data-id="' + esc(lin2.ev.id) + '" data-dia="' + dsj + '"' +
                              ' title="' + esc((lin2.ev.hora ? lin2.ev.hora + ' - ' : '') +
                                (lin2.ev.titulo || '') + ' (' + brData(dsj) + ')') + '">' +
                              (estado === 'concluido' ? '\u2714' : '') + '</span>';
                          }
                          corpo += '</td>';
                        }
                        corpo += '</tr>';
                      }
                    }
                
                    h += '<div class="v48-rolo"><table class="v48-gantt">' + cols +
                      '<thead>' + linhaMes + linhaDia + '</thead><tbody>' + corpo + '</tbody></table></div>';
                    h += '</div>';
                    return h;
                  }
                
                  /* ---------------- visao Kanban ---------------- */
                
                  function htmlCartao(it, hoje) {
                    var info = tipoInfo(it.ev.tipo);
                    var feito = (it.estado === 'concluido' || it.estado === 'cancelado');
                    var h = '<div class="v48-cartao' + (feito ? ' v48-feito' : '') +
                      '" style="border-left-color:' + info.cor + ';">';
                    h += '<span class="v48-obra">' + esc(nomeObra(it.ev.obraId)) + '</span>';
                    h += '<b data-ag="abrir" data-id="' + esc(it.ev.id) + '" data-dia="' + it.dia +
                      '" title="Editar">' + esc(it.ev.titulo || '(sem titulo)') + '</b>';
                    h += '<div class="v48-meta">' +
                      '<span class="v48-tag" style="background:' + info.cor + ';">' + esc(info.nome) + '</span>' +
                      '<span>' + brData(it.dia) + (it.ev.hora ? ' \u00b7 ' + esc(it.ev.hora) : '') + '</span>' +
                      (it.ev.repetir && it.ev.repetir !== 'nao' ? '<span>\ud83d\udd01</span>' : '') +
                      '</div>';
                    if (it.ev.responsavel || it.ev.local) {
                      h += '<div class="v48-meta">' +
                        (it.ev.responsavel ? '<span>\ud83d\udc64 ' + esc(it.ev.responsavel) + '</span>' : '') +
                        (it.ev.local ? '<span>\ud83d\udccd ' + esc(it.ev.local) + '</span>' : '') +
                        '</div>';
                    }
                    h += '<div class="v48-acoes">' +
                      '<button class="v48-mini" data-ag="concluir" data-id="' + esc(it.ev.id) +
                        '" data-dia="' + it.dia + '" title="Concluir / desfazer">\u2714</button>' +
                      '<button class="v48-mini" data-ag="abrir" data-id="' + esc(it.ev.id) +
                        '" data-dia="' + it.dia + '" title="Editar">\u270f\ufe0f</button>' +
                      '<button class="v48-mini" data-ag="excluir-lista" data-id="' + esc(it.ev.id) +
                        '" title="Excluir">\ud83d\uddd1\ufe0f</button>' +
                      '</div></div>';
                    return h;
                  }
                
                  function htmlKanban() {
                    var dados = ler();
                    var hoje = hojeStr();
                    var lista = itens(dados, dStr(somaDias(new Date(), -365)), dStr(somaDias(new Date(), 730)));
                    var limite7 = dStr(somaDias(new Date(), 7));
                
                    var colunas = [
                      { id: 'atraso', nome: 'Atrasados', cls: 'v48-c-atraso', itens: [] },
                      { id: 'hoje',   nome: 'Hoje',      cls: 'v48-c-hoje',   itens: [] },
                      { id: 'semana', nome: 'Proximos 7 dias', cls: '',       itens: [] },
                      { id: 'depois', nome: 'Mais adiante',    cls: '',       itens: [] },
                      { id: 'feitos', nome: 'Concluidos', cls: 'v48-c-feitos', itens: [] }
                    ];
                
                    var i, it;
                    for (i = 0; i < lista.length; i++) {
                      it = lista[i];
                      if (it.estado === 'concluido' || it.estado === 'cancelado') { colunas[4].itens.push(it); }
                      else if (it.dia < hoje) { colunas[0].itens.push(it); }
                      else if (it.dia === hoje) { colunas[1].itens.push(it); }
                      else if (it.dia <= limite7) { colunas[2].itens.push(it); }
                      else { colunas[3].itens.push(it); }
                    }
                
                    var h = '<div data-v48="kanban">';
                    h += '<div class="v48-topo"><span class="v48-titulo" style="min-width:0;">' +
                      'Quadro de compromissos</span>' + htmlLegenda() + '</div>';
                
                    if (!lista.length) {
                      h += '<div class="v48-vazio">Nenhum compromisso encontrado. ' +
                        'Use "+ Novo compromisso" para comecar.</div></div>';
                      return h;
                    }
                
                    h += '<div class="v48-kanban">';
                    for (i = 0; i < colunas.length; i++) {
                      var c = colunas[i];
                      h += '<div class="v48-col ' + c.cls + '">' +
                        '<div class="v48-col-topo"><span>' + esc(c.nome) + '</span>' +
                        '<span class="v48-col-num">' + c.itens.length + '</span></div><div class="v48-lista">';
                      if (!c.itens.length) {
                        h += '<div class="v48-mais">\u2014</div>';
                      } else {
                        var lim = Math.min(c.itens.length, 60), j;
                        var seq = (c.id === 'feitos' || c.id === 'atraso') ? c.itens.slice().reverse() : c.itens;
                        for (j = 0; j < lim; j++) { h += htmlCartao(seq[j], hoje); }
                        if (c.itens.length > lim) {
                          h += '<div class="v48-mais">+ ' + (c.itens.length - lim) + ' na visao Lista</div>';
                        }
                      }
                      h += '</div></div>';
                    }
                    h += '</div></div>';
                    return h;
                  }
                
                  /* ---------------- pintar e alternar ---------------- */
                
                  function marcarBotoes() {
                    var pares = [
                      ['agVisaoCal', null], ['agVisaoLista', null],
                      ['v48BtnGantt', 'gantt'], ['v48BtnKanban', 'kanban']
                    ];
                    var i, bt;
                    for (i = 0; i < pares.length; i++) {
                      bt = document.getElementById(pares[i][0]);
                      if (!bt) { continue; }
                      if (modo) {
                        bt.className = 'ag-btn' + (pares[i][1] === modo ? ' ag-ativo' : '');
                      } else if (pares[i][1]) {
                        bt.className = 'ag-btn';
                      }
                    }
                  }
                
                  function pintar() {
                    var corpo = document.getElementById('agCorpo');
                    if (!corpo || !modo) { return; }
                    pintando = true;
                    try {
                      corpo.innerHTML = (modo === 'gantt') ? htmlGantt() : htmlKanban();
                    } catch (e) {
                      corpo.innerHTML = '<div class="v48-vazio" data-v48="erro">' +
                        'Nao foi possivel montar esta visao. Use Calendario ou Lista.</div>';
                    }
                    marcarBotoes();
                    setTimeout(function () { pintando = false; }, 0);
                  }
                
                  function definirModo(v) {
                    modo = v;
                    gravarModo(v);
                    if (v) { pintar(); }
                    else { marcarBotoes(); }
                  }
                
                  /* ---------------- botoes novos ---------------- */
                
                  function botao(id, texto, acao, classe) {
                    var b = document.createElement('button');
                    b.className = 'ag-btn' + (classe ? ' ' + classe : '');
                    b.id = id;
                    b.textContent = texto;
                    b.setAttribute('data-ag48', acao);
                    b.type = 'button';
                    return b;
                  }
                
                  function garantirBotoes() {
                    var acoes = document.querySelector('#tab-agenda .ag-acoes');
                    if (!acoes) { return; }
                
                    if (!document.getElementById('v48BtnGantt')) {
                      var bg = botao('v48BtnGantt', 'Gantt', 'visao-gantt');
                      var ref = document.getElementById('agVisaoLista');
                      if (ref && ref.nextSibling) { acoes.insertBefore(bg, ref.nextSibling); }
                      else if (ref) { acoes.appendChild(bg); }
                      else { acoes.appendChild(bg); }
                    }
                    if (!document.getElementById('v48BtnKanban')) {
                      var bk = botao('v48BtnKanban', 'Kanban', 'visao-kanban');
                      var g = document.getElementById('v48BtnGantt');
                      if (g && g.nextSibling) { acoes.insertBefore(bk, g.nextSibling); }
                      else { acoes.appendChild(bk); }
                    }
                    if (!document.getElementById('v48BtnFechar')) {
                      acoes.appendChild(botao('v48BtnFechar', '\u2715 Fechar', 'fechar', 'v48-fechar'));
                    }
                  }
                
                  function garantirBotaoAgenda() {
                    var lst = document.querySelector('#meu-menu-abas .tabs');
                    if (!lst) { return; }
                    var bt = document.getElementById('btn-tab-agenda');
                    if (bt) {
                      if (bt.parentNode !== lst) { lst.appendChild(bt); }
                      return;
                    }
                    bt = document.createElement('button');
                    bt.className = 'tab-btn';
                    bt.id = 'btn-tab-agenda';
                    bt.type = 'button';
                    var ico = document.createTextNode('\ud83d\uddd3\ufe0f Agenda de Obras');
                    bt.appendChild(ico);
                    var bd = document.createElement('span');
                    bd.className = 'ag-badge';
                    bd.id = 'agBadge';
                    bd.style.display = 'none';
                    bd.textContent = '0';
                    bt.appendChild(bd);
                    bt.addEventListener('click', function () {
                      if (typeof window.abrirAgendaObras === 'function') { window.abrirAgendaObras(); }
                      else if (typeof window.trocarAba === 'function') { window.trocarAba('agenda'); }
                    });
                    lst.appendChild(bt);
                  }
                
                  function fecharAgenda() {
                    var el = document.getElementById('tab-agenda');
                    if (el) { el.style.display = 'none'; }
                    var bt = document.getElementById('btn-tab-agenda');
                    if (bt) { bt.classList.remove('active'); }
                    if (typeof window.trocarAba === 'function') {
                      window.trocarAba('itens');
                    } else {
                      var alvo = document.getElementById('tab-itens');
                      if (alvo) { alvo.style.display = 'block'; }
                      var b2 = document.getElementById('btn-tab-itens');
                      if (b2) { b2.classList.add('active'); }
                    }
                    var menu = document.getElementById('meu-menu-abas');
                    if (menu) { menu.removeAttribute('open'); }
                  }
                
                  /* ---------------- ligacoes ---------------- */
                
                  function ligarAgenda() {
                    var painel = document.getElementById('tab-agenda');
                    if (!painel || painel.getAttribute('data-v48-ligado') === '1') { return; }
                    painel.setAttribute('data-v48-ligado', '1');
                
                    painel.addEventListener('click', function (ev) {
                      var alvo = ev.target && ev.target.closest ? ev.target.closest('[data-ag48]') : null;
                      if (alvo) {
                        var acao = alvo.getAttribute('data-ag48');
                        if (acao === 'visao-gantt') { definirModo('gantt'); return; }
                        if (acao === 'visao-kanban') { definirModo('kanban'); return; }
                        if (acao === 'fechar') { fecharAgenda(); return; }
                        if (acao === 'g-mes-1') {
                          refG = new Date(refG.getFullYear(), refG.getMonth() - 1, 1); pintar(); return;
                        }
                        if (acao === 'g-mes+1') {
                          refG = new Date(refG.getFullYear(), refG.getMonth() + 1, 1); pintar(); return;
                        }
                        if (acao === 'g-hoje') { refG = primeiroDoMes(new Date()); pintar(); return; }
                        return;
                      }
                      /* voltou para Calendario ou Lista: sai das visoes novas */
                      var v = ev.target && ev.target.closest ? ev.target.closest('[data-ag]') : null;
                      if (!v) { return; }
                      var a2 = v.getAttribute('data-ag');
                      if (a2 === 'visao-calendario' || a2 === 'visao-lista' || a2 === 'ver-dia') {
                        definirModo(null);
                      }
                    }, true);
                
                    /* filtros: redesenha a visao nova */
                    ['agFiltroObra', 'agFiltroTipo', 'agFiltroSituacao'].forEach(function (id) {
                      var el = document.getElementById(id);
                      if (el && el.getAttribute('data-v48') !== '1') {
                        el.setAttribute('data-v48', '1');
                        el.addEventListener('change', function () {
                          if (modo) { setTimeout(pintar, 30); }
                        });
                      }
                    });
                    var fx = document.getElementById('agFiltroTexto');
                    if (fx && fx.getAttribute('data-v48') !== '1') {
                      fx.setAttribute('data-v48', '1');
                      fx.addEventListener('input', function () {
                        if (modo) { setTimeout(pintar, 250); }
                      });
                    }
                
                    /* se a agenda redesenhar por cima, devolve a visao escolhida */
                    var corpo = document.getElementById('agCorpo');
                    if (corpo && !obsCorpo && window.MutationObserver) {
                      obsCorpo = new MutationObserver(function () {
                        if (!modo || pintando) { return; }
                        if (!corpo.querySelector('[data-v48]')) { pintar(); }
                      });
                      obsCorpo.observe(corpo, { childList: true });
                    }
                
                    /* ao abrir a agenda, ja mostra a visao guardada */
                    if (!obsAba && window.MutationObserver) {
                      obsAba = new MutationObserver(function () {
                        if (painel.style.display !== 'none' && modo) { setTimeout(pintar, 40); }
                      });
                      obsAba.observe(painel, { attributes: true, attributeFilter: ['style'] });
                    }
                
                    garantirBotoes();
                    if (modo && painel.style.display !== 'none') { pintar(); }
                    else { marcarBotoes(); }
                  }
                
                  function aplicar() {
                    var menu = document.getElementById('meu-menu-abas');
                    if (menu) {
                      menu.classList.add('pmenu-rail');
                      var sum = menu.querySelector('summary');
                      if (sum) {
                        sum.setAttribute('title', 'Abas do painel');
                        sum.setAttribute('aria-label', 'Abas do painel');
                      }
                      garantirBotaoAgenda();
                    }
                    garantirBotoes();
                    ligarAgenda();
                    return !!(menu && document.getElementById('tab-agenda'));
                  }
                
                  function iniciar() {
                    modo = lerModo();
                    if (aplicar()) { return; }
                    var n = 0;
                    var t = setInterval(function () {
                      n++;
                      if (aplicar() || n > 60) { clearInterval(t); }
                    }, 250);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', iniciar);
                  } else {
                    iniciar();
                  }
                
                  /* reforcos depois que o painel termina de montar tudo */
                  setTimeout(aplicar, 1500);
                  setTimeout(aplicar, 3500);
                })();
            
