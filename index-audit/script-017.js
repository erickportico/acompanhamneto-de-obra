
                /* === PATCH 43: agenda de obras (calendario de compromissos) === */
                (function(){
                  "use strict";
                
                  var KEY = "painelAgendaObras_v1";
                  var DOW = ["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];
                  var MESES = ["Janeiro","Fevereiro","Marco","Abril","Maio","Junho",
                               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
                
                  var TIPOS = [
                    { id:"visita",     nome:"Visita a obra",       cor:"#2563eb" },
                    { id:"entrega",    nome:"Entrega de material", cor:"#0891b2" },
                    { id:"medicao",    nome:"Medicao",             cor:"#7c3aed" },
                    { id:"instalacao", nome:"Instalacao",          cor:"#059669" },
                    { id:"reuniao",    nome:"Reuniao",             cor:"#d97706" },
                    { id:"prazo",      nome:"Prazo / Entrega",     cor:"#dc2626" },
                    { id:"outro",      nome:"Outro",               cor:"#475569" }
                  ];
                
                  var st = {
                    eventos: [],
                    visao: "calendario",
                    ref: null,               /* mes exibido: Date no dia 1 */
                    filtro: { obra:"", tipo:"", situacao:"", texto:"" },
                    editando: null
                  };
                
                  /* ---------- utilidades ---------- */
                
                  function esc(v){
                    return String(v == null ? "" : v)
                      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
                      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
                  }
                
                  function pad(n){ return (n < 10 ? "0" : "") + n; }
                
                  function dStr(d){
                    return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
                  }
                
                  function sData(s){
                    var p = String(s || "").split("-");
                    if (p.length !== 3) { return null; }
                    var d = new Date(Number(p[0]), Number(p[1])-1, Number(p[2]));
                    if (isNaN(d.getTime())) { return null; }
                    return d;
                  }
                
                  function hojeStr(){ return dStr(new Date()); }
                
                  function brData(s){
                    var d = sData(s);
                    if (!d) { return "-"; }
                    return pad(d.getDate()) + "/" + pad(d.getMonth()+1) + "/" + d.getFullYear();
                  }
                
                  function somaDias(d, n){
                    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                    x.setDate(x.getDate() + n);
                    return x;
                  }
                
                  function difDias(a, b){
                    var da = sData(a), dbb = sData(b);
                    if (!da || !dbb) { return 0; }
                    return Math.round((dbb.getTime() - da.getTime()) / 86400000);
                  }
                
                  function tipoInfo(id){
                    var i;
                    for (i = 0; i < TIPOS.length; i++) {
                      if (TIPOS[i].id === id) { return TIPOS[i]; }
                    }
                    return TIPOS[TIPOS.length-1];
                  }
                
                  function novoId(){
                    return "ag" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
                  }
                
                  /* ---------- obras do painel ---------- */
                
                  function listaObras(){
                    var d = window.db;
                    if (d && Object.prototype.toString.call(d.obras) === "[object Array]") { return d.obras; }
                    if (Object.prototype.toString.call(window.dbObras) === "[object Array]") { return window.dbObras; }
                    return [];
                  }
                
                  function nomeObra(id){
                    var l = listaObras(), i;
                    for (i = 0; i < l.length; i++) {
                      if (l[i] && l[i].id === id) { return l[i].nome || "Obra sem nome"; }
                    }
                    return id ? "Obra removida" : "(sem obra)";
                  }
                
                  function obraAtualId(){
                    var d = window.db;
                    if (d && d.obraAtualId) { return d.obraAtualId; }
                    var l = listaObras();
                    return l.length ? l[0].id : "";
                  }
                
                  /* ---------- gravacao ---------- */
                
                  function carregar(){
                    try {
                      var bruto = localStorage.getItem(KEY);
                      if (!bruto) { return; }
                      var o = JSON.parse(bruto);
                      if (o && Object.prototype.toString.call(o.eventos) === "[object Array]") {
                        st.eventos = o.eventos;
                      }
                      if (o && o.visao === "lista") { st.visao = "lista"; }
                      if (o && o.filtro) {
                        st.filtro.obra = o.filtro.obra || "";
                        st.filtro.tipo = o.filtro.tipo || "";
                        st.filtro.situacao = o.filtro.situacao || "";
                      }
                    } catch (e) { /* dados corrompidos: comeca vazio */ }
                  }
                
                  function salvar(){
                    try {
                      localStorage.setItem(KEY, JSON.stringify({
                        eventos: st.eventos,
                        visao: st.visao,
                        filtro: { obra: st.filtro.obra, tipo: st.filtro.tipo, situacao: st.filtro.situacao },
                        atualizadoEm: new Date().toISOString()
                      }));
                    } catch (e) {
                      alert("Nao foi possivel salvar a agenda neste navegador.");
                    }
                  }
                
                  /* ---------- repeticao ---------- */
                
                  function ocorrencias(ev, iniStr, fimStr){
                    var base = sData(ev.data);
                    if (!base) { return []; }
                    var ini = sData(iniStr), fim = sData(fimStr);
                    var rep = ev.repetir || "nao";
                    var limite = ev.repetirAte ? sData(ev.repetirAte) : null;
                    var saida = [], atual = base, passos = 0;
                
                    if (rep === "nao" || !rep) {
                      if ((!ini || base >= ini) && (!fim || base <= fim)) { saida.push(ev.data); }
                      return saida;
                    }
                    if (!limite) { limite = somaDias(base, 730); }
                
                    while (passos < 400 && atual <= limite) {
                      if ((!ini || atual >= ini) && (!fim || atual <= fim)) { saida.push(dStr(atual)); }
                      if (fim && atual > fim) { break; }
                      if (rep === "semanal")        { atual = somaDias(atual, 7); }
                      else if (rep === "quinzenal") { atual = somaDias(atual, 14); }
                      else if (rep === "mensal") {
                        var alvoMes = atual.getMonth() + 1, alvoAno = atual.getFullYear();
                        if (alvoMes > 11) { alvoMes = 0; alvoAno += 1; }
                        var ultimo = new Date(alvoAno, alvoMes + 1, 0).getDate();
                        atual = new Date(alvoAno, alvoMes, Math.min(base.getDate(), ultimo));
                      } else { break; }
                      passos++;
                    }
                    return saida;
                  }
                
                  function estadoNa(ev, dia){
                    if (ev.situacao === "cancelado") { return "cancelado"; }
                    var f = ev.feitos;
                    if (Object.prototype.toString.call(f) === "[object Array]" && f.indexOf(dia) >= 0) {
                      return "concluido";
                    }
                    if ((!ev.repetir || ev.repetir === "nao") && ev.situacao === "concluido") { return "concluido"; }
                    return "pendente";
                  }
                
                  function passaFiltro(ev){
                    var f = st.filtro;
                    if (f.obra && ev.obraId !== f.obra) { return false; }
                    if (f.tipo && ev.tipo !== f.tipo) { return false; }
                    if (f.texto) {
                      var alvo = (String(ev.titulo||"") + " " + String(ev.responsavel||"") + " " +
                                  String(ev.local||"") + " " + String(ev.obs||"") + " " +
                                  nomeObra(ev.obraId)).toLowerCase();
                      if (alvo.indexOf(f.texto.toLowerCase()) < 0) { return false; }
                    }
                    return true;
                  }
                
                  /* devolve itens {ev, dia, estado} dentro do periodo, filtrados e ordenados */
                  function itens(iniStr, fimStr){
                    var saida = [], i, j, dias, estado, ev;
                    for (i = 0; i < st.eventos.length; i++) {
                      ev = st.eventos[i];
                      if (!ev || !ev.data) { continue; }
                      if (!passaFiltro(ev)) { continue; }
                      dias = ocorrencias(ev, iniStr, fimStr);
                      for (j = 0; j < dias.length; j++) {
                        estado = estadoNa(ev, dias[j]);
                        if (st.filtro.situacao && st.filtro.situacao !== estado) { continue; }
                        saida.push({ ev: ev, dia: dias[j], estado: estado });
                      }
                    }
                    saida.sort(function(a,b){
                      if (a.dia !== b.dia) { return a.dia < b.dia ? -1 : 1; }
                      var ha = a.ev.hora || "99:99", hb = b.ev.hora || "99:99";
                      if (ha !== hb) { return ha < hb ? -1 : 1; }
                      return String(a.ev.titulo||"").localeCompare(String(b.ev.titulo||""));
                    });
                    return saida;
                  }
                
                  /* ---------- montagem da interface ---------- */
                
                  function opcoesObras(sel){
                    var l = listaObras(), h = "", i;
                    for (i = 0; i < l.length; i++) {
                      if (!l[i] || !l[i].id) { continue; }
                      h += '<option value="' + esc(l[i].id) + '"' +
                           (l[i].id === sel ? ' selected' : '') + '>' +
                           esc(l[i].nome || "Obra sem nome") + '</option>';
                    }
                    return h;
                  }
                
                  function opcoesTipos(sel){
                    var h = "", i;
                    for (i = 0; i < TIPOS.length; i++) {
                      h += '<option value="' + TIPOS[i].id + '"' +
                           (TIPOS[i].id === sel ? ' selected' : '') + '>' +
                           esc(TIPOS[i].nome) + '</option>';
                    }
                    return h;
                  }
                
                  function criarAba(){
                    if (document.getElementById("tab-agenda")) { return; }
                
                    /* botao no menu de abas */
                    var menu = document.querySelector("#meu-menu-abas .tabs") || document.querySelector(".tabs");
                    if (menu && !document.getElementById("btn-tab-agenda")) {
                      var bt = document.createElement("button");
                      bt.className = "tab-btn";
                      bt.id = "btn-tab-agenda";
                      bt.innerHTML = '\ud83d\uddd3\ufe0f Agenda de Obras<span class="ag-badge" id="agBadge" style="display:none;">0</span>';
                      bt.addEventListener("click", function(){ abrirAgenda(); });
                      menu.appendChild(bt);
                    }
                
                    /* painel da aba */
                    var div = document.createElement("div");
                    div.id = "tab-agenda";
                    div.className = "card";
                    div.style.display = "none";
                    div.innerHTML =
                      '<div class="ag-topo">' +
                        '<h3 style="margin:0;color:var(--text,#fff);">\ud83d\uddd3\ufe0f Agenda de Obras</h3>' +
                        '<div class="ag-acoes">' +
                          '<button class="ag-btn ag-primario" data-ag="novo">+ Novo compromisso</button>' +
                          '<button class="ag-btn" data-ag="visao-calendario" id="agVisaoCal">Calendario</button>' +
                          '<button class="ag-btn" data-ag="visao-lista" id="agVisaoLista">Lista</button>' +
                          '<button class="ag-btn" data-ag="csv">Exportar CSV</button>' +
                        '</div>' +
                      '</div>' +
                      '<div class="ag-cards" id="agResumo"></div>' +
                      '<div class="ag-filtros">' +
                        '<div><label>Obra</label><select id="agFiltroObra"></select></div>' +
                        '<div><label>Tipo</label><select id="agFiltroTipo"></select></div>' +
                        '<div><label>Situacao</label><select id="agFiltroSituacao">' +
                          '<option value="">Todas</option>' +
                          '<option value="pendente">Pendentes</option>' +
                          '<option value="concluido">Concluidos</option>' +
                          '<option value="cancelado">Cancelados</option>' +
                        '</select></div>' +
                        '<div><label>Buscar</label><input type="text" id="agFiltroTexto" placeholder="titulo, responsavel, local..."></div>' +
                      '</div>' +
                      '<div id="agCorpo"></div>';
                
                    var ref = document.getElementById("tab-custo");
                    if (ref && ref.parentNode) {
                      ref.parentNode.insertBefore(div, ref.nextSibling);
                    } else {
                      document.body.appendChild(div);
                    }
                
                    /* modal */
                    if (!document.getElementById("agModal")) {
                      var md = document.createElement("div");
                      md.id = "agModal";
                      md.innerHTML =
                        '<div class="ag-caixa">' +
                          '<div class="ag-caixa-topo"><span id="agModalTitulo">Novo compromisso</span>' +
                            '<button type="button" data-ag="fechar" title="Fechar">\u2715</button></div>' +
                          '<div class="ag-form">' +
                            '<div class="ag-full"><label>Titulo *</label>' +
                              '<input type="text" id="agfTitulo" maxlength="120" placeholder="Ex.: Visita tecnica com o cliente"></div>' +
                            '<div><label>Obra</label><select id="agfObra"></select></div>' +
                            '<div><label>Tipo</label><select id="agfTipo"></select></div>' +
                            '<div><label>Data *</label><input type="date" id="agfData"></div>' +
                            '<div><label>Situacao</label><select id="agfSituacao">' +
                              '<option value="pendente">Pendente</option>' +
                              '<option value="concluido">Concluido</option>' +
                              '<option value="cancelado">Cancelado</option>' +
                            '</select></div>' +
                            '<div><label>Hora inicio</label><input type="time" id="agfHora"></div>' +
                            '<div><label>Hora fim</label><input type="time" id="agfHoraFim"></div>' +
                            '<div><label>Responsavel</label><input type="text" id="agfResp" maxlength="80"></div>' +
                            '<div><label>Local</label><input type="text" id="agfLocal" maxlength="120"></div>' +
                            '<div><label>Avisar antes</label><select id="agfLembrete">' +
                              '<option value="0">No dia</option>' +
                              '<option value="1">1 dia antes</option>' +
                              '<option value="2">2 dias antes</option>' +
                              '<option value="3">3 dias antes</option>' +
                              '<option value="7">1 semana antes</option>' +
                            '</select></div>' +
                            '<div><label>Repetir</label><select id="agfRepetir">' +
                              '<option value="nao">Nao repetir</option>' +
                              '<option value="semanal">Toda semana</option>' +
                              '<option value="quinzenal">A cada 15 dias</option>' +
                              '<option value="mensal">Todo mes</option>' +
                            '</select></div>' +
                            '<div class="ag-full"><label>Repetir ate (opcional)</label><input type="date" id="agfRepetirAte"></div>' +
                            '<div class="ag-full"><label>Observacoes</label>' +
                              '<textarea id="agfObs" rows="3" maxlength="600"></textarea></div>' +
                          '</div>' +
                          '<div class="ag-rodape">' +
                            '<button type="button" class="ag-btn" data-ag="excluir" id="agBtnExcluir" ' +
                              'style="color:#dc2626;border-color:#dc2626;display:none;">Excluir</button>' +
                            '<div class="ag-dir">' +
                              '<button type="button" class="ag-btn" data-ag="fechar">Cancelar</button>' +
                              '<button type="button" class="ag-btn ag-primario" data-ag="salvar">Salvar</button>' +
                            '</div>' +
                          '</div>' +
                        '</div>';
                      document.body.appendChild(md);
                    }
                
                    if (!document.getElementById("agAviso")) {
                      var av = document.createElement("div");
                      av.id = "agAviso";
                      document.body.appendChild(av);
                    }
                
                    ligarEventos();
                  }
                
                  /* ---------- resumo ---------- */
                
                  function contarPeriodo(iniStr, fimStr, sit){
                    var l = itens(iniStr, fimStr), n = 0, i;
                    for (i = 0; i < l.length; i++) {
                      if (!sit || l[i].estado === sit) { n++; }
                    }
                    return n;
                  }
                
                  function renderResumo(){
                    var box = document.getElementById("agResumo");
                    if (!box) { return; }
                    var hoje = hojeStr();
                    var d7 = dStr(somaDias(new Date(), 7));
                    var d1 = dStr(somaDias(new Date(), 1));
                    var passado = dStr(somaDias(new Date(), -365));
                    var ontem = dStr(somaDias(new Date(), -1));
                
                    var nHoje = contarPeriodo(hoje, hoje, "");
                    var nAmanha = contarPeriodo(d1, d1, "");
                    var nSemana = contarPeriodo(hoje, d7, "pendente");
                    var nAtraso = contarPeriodo(passado, ontem, "pendente");
                    var nTotal = contarPeriodo(passado, dStr(somaDias(new Date(), 730)), "");
                
                    box.innerHTML =
                      '<div class="ag-card ag-hoje"><b>' + nHoje + '</b><span>Hoje</span></div>' +
                      '<div class="ag-card"><b>' + nAmanha + '</b><span>Amanha</span></div>' +
                      '<div class="ag-card"><b>' + nSemana + '</b><span>Proximos 7 dias (pendentes)</span></div>' +
                      '<div class="ag-card' + (nAtraso ? ' ag-alerta' : '') + '"><b>' + nAtraso +
                        '</b><span>Atrasados</span></div>' +
                      '<div class="ag-card"><b>' + nTotal + '</b><span>Total na agenda</span></div>';
                
                    var badge = document.getElementById("agBadge");
                    if (badge) {
                      var q = nAtraso + contarPeriodo(hoje, hoje, "pendente");
                      badge.textContent = String(q);
                      badge.style.display = q > 0 ? "inline-block" : "none";
                    }
                  }
                
                  /* ---------- calendario ---------- */
                
                  function renderCalendario(){
                    var corpo = document.getElementById("agCorpo");
                    if (!corpo) { return; }
                    var ref = st.ref || new Date();
                    var ano = ref.getFullYear(), mes = ref.getMonth();
                    var primeiro = new Date(ano, mes, 1);
                    var inicioGrade = somaDias(primeiro, -primeiro.getDay());
                    var totalCel = 42;
                    var fimGrade = somaDias(inicioGrade, totalCel - 1);
                
                    var lista = itens(dStr(inicioGrade), dStr(fimGrade));
                    var porDia = {}, i;
                    for (i = 0; i < lista.length; i++) {
                      if (!porDia[lista[i].dia]) { porDia[lista[i].dia] = []; }
                      porDia[lista[i].dia].push(lista[i]);
                    }
                
                    var h = '<div class="ag-nav">' +
                      '<button class="ag-btn" data-ag="mes-1">\u25c0 Mes anterior</button>' +
                      '<span class="ag-mes">' + MESES[mes] + ' de ' + ano + '</span>' +
                      '<button class="ag-btn" data-ag="mes+1">Proximo mes \u25b6</button>' +
                      '<button class="ag-btn" data-ag="mes-hoje">Hoje</button>' +
                      '</div><div class="ag-grade">';
                
                    for (i = 0; i < 7; i++) { h += '<div class="ag-dow">' + DOW[i] + '</div>'; }
                
                    var hoje = hojeStr(), c, dia, ds, evs, k, it, info, cls, hora;
                    for (c = 0; c < totalCel; c++) {
                      dia = somaDias(inicioGrade, c);
                      ds = dStr(dia);
                      evs = porDia[ds] || [];
                      cls = "ag-dia";
                      if (dia.getMonth() !== mes) { cls += " ag-fora"; }
                      if (dia.getDay() === 0 || dia.getDay() === 6) { cls += " ag-fimsem"; }
                      if (ds === hoje) { cls += " ag-diahoje"; }
                
                      h += '<div class="' + cls + '" data-ag="dia" data-data="' + ds + '">';
                      h += '<div class="ag-num"><span>' + dia.getDate() + '</span>' +
                           (evs.length > 3 ? '<small>' + evs.length + '</small>' : '') + '</div>';
                      for (k = 0; k < evs.length && k < 3; k++) {
                        it = evs[k];
                        info = tipoInfo(it.ev.tipo);
                        hora = it.ev.hora ? it.ev.hora + " " : "";
                        h += '<div class="ag-chip' +
                             (it.estado === "concluido" ? ' ag-feito' : '') +
                             (it.estado === "cancelado" ? ' ag-cancel' : '') +
                             '" style="background:' + info.cor + ';" data-ag="abrir" data-id="' +
                             esc(it.ev.id) + '" data-dia="' + it.dia + '" title="' +
                             esc(hora + (it.ev.titulo||"") + " - " + nomeObra(it.ev.obraId)) + '">' +
                             esc(hora + (it.ev.titulo || "(sem titulo)")) + '</div>';
                      }
                      if (evs.length > 3) {
                        h += '<div class="ag-mais" data-ag="ver-dia" data-data="' + ds + '">+' +
                             (evs.length - 3) + ' mais</div>';
                      }
                      h += '</div>';
                    }
                    h += '</div>';
                    corpo.innerHTML = h;
                  }
                
                  /* ---------- lista ---------- */
                
                  function renderLista(){
                    var corpo = document.getElementById("agCorpo");
                    if (!corpo) { return; }
                    var ini = dStr(somaDias(new Date(), -365));
                    var fim = dStr(somaDias(new Date(), 730));
                    var lista = itens(ini, fim), hoje = hojeStr();
                
                    if (!lista.length) {
                      corpo.innerHTML = '<div class="ag-vazio">Nenhum compromisso encontrado. ' +
                        'Use "+ Novo compromisso" para come\u00e7ar.</div>';
                      return;
                    }
                
                    var h = '<table class="ag-tabela"><thead><tr>' +
                      '<th>Data</th><th>Hora</th><th>Obra</th><th>Tipo</th><th>Compromisso</th>' +
                      '<th>Responsavel</th><th>Local</th><th>Situacao</th><th style="text-align:right;">Acoes</th>' +
                      '</tr></thead><tbody>';
                
                    var mesAtual = "", i, it, info, mesRotulo, d, cls, sitTxt;
                    for (i = 0; i < lista.length; i++) {
                      it = lista[i];
                      d = sData(it.dia);
                      mesRotulo = MESES[d.getMonth()] + " de " + d.getFullYear();
                      if (mesRotulo !== mesAtual) {
                        mesAtual = mesRotulo;
                        h += '<tr class="ag-sep"><td colspan="9">' + esc(mesRotulo) + '</td></tr>';
                      }
                      info = tipoInfo(it.ev.tipo);
                      cls = "";
                      if (it.estado === "concluido" || it.estado === "cancelado") { cls = "ag-linha-feita"; }
                      else if (it.dia < hoje) { cls = "ag-linha-atraso"; }
                      sitTxt = it.estado === "concluido" ? "Concluido"
                             : (it.estado === "cancelado" ? "Cancelado"
                             : (it.dia < hoje ? "Atrasado" : "Pendente"));
                
                      h += '<tr class="' + cls + '">' +
                        '<td>' + brData(it.dia) + '<br><small>' + DOW[d.getDay()] + '</small></td>' +
                        '<td>' + esc(it.ev.hora || "-") + (it.ev.horaFim ? "<br><small>ate " + esc(it.ev.horaFim) + "</small>" : "") + '</td>' +
                        '<td>' + esc(nomeObra(it.ev.obraId)) + '</td>' +
                        '<td><span class="ag-etiqueta" style="background:' + info.cor + ';">' + esc(info.nome) + '</span></td>' +
                        '<td>' + esc(it.ev.titulo || "(sem titulo)") +
                          (it.ev.obs ? '<br><small>' + esc(it.ev.obs) + '</small>' : '') +
                          (it.ev.repetir && it.ev.repetir !== "nao" ? '<br><small>\ud83d\udd01 repete</small>' : '') + '</td>' +
                        '<td>' + esc(it.ev.responsavel || "-") + '</td>' +
                        '<td>' + esc(it.ev.local || "-") + '</td>' +
                        '<td>' + sitTxt + '</td>' +
                        '<td style="text-align:right;white-space:nowrap;">' +
                          '<button class="ag-mini" data-ag="concluir" data-id="' + esc(it.ev.id) + '" data-dia="' + it.dia +
                            '" title="Marcar como concluido / desfazer">\u2714</button>' +
                          '<button class="ag-mini" data-ag="abrir" data-id="' + esc(it.ev.id) + '" data-dia="' + it.dia +
                            '" title="Editar">\u270f\ufe0f</button>' +
                          '<button class="ag-mini" data-ag="excluir-lista" data-id="' + esc(it.ev.id) +
                            '" title="Excluir">\ud83d\uddd1\ufe0f</button>' +
                        '</td></tr>';
                    }
                    h += '</tbody></table>';
                    corpo.innerHTML = h;
                  }
                
                  function desenhar(){
                    if (!document.getElementById("tab-agenda")) { return; }
                    sincronizarFiltros();
                    renderResumo();
                    if (st.visao === "lista") { renderLista(); } else { renderCalendario(); }
                    var bc = document.getElementById("agVisaoCal"), bl = document.getElementById("agVisaoLista");
                    if (bc) { bc.className = "ag-btn" + (st.visao === "calendario" ? " ag-ativo" : ""); }
                    if (bl) { bl.className = "ag-btn" + (st.visao === "lista" ? " ag-ativo" : ""); }
                  }
                
                  function sincronizarFiltros(){
                    var fo = document.getElementById("agFiltroObra");
                    if (fo) {
                      var atual = st.filtro.obra;
                      fo.innerHTML = '<option value="">Todas as obras</option>' + opcoesObras(atual);
                      fo.value = atual;
                    }
                    var ft = document.getElementById("agFiltroTipo");
                    if (ft && ft.options.length <= 1) {
                      ft.innerHTML = '<option value="">Todos os tipos</option>' + opcoesTipos(st.filtro.tipo);
                      ft.value = st.filtro.tipo;
                    }
                    var fs = document.getElementById("agFiltroSituacao");
                    if (fs) { fs.value = st.filtro.situacao; }
                    var fx = document.getElementById("agFiltroTexto");
                    if (fx && fx.value !== st.filtro.texto) { fx.value = st.filtro.texto; }
                  }
                
                  /* ---------- modal ---------- */
                
                  function acharEvento(id){
                    var i;
                    for (i = 0; i < st.eventos.length; i++) {
                      if (st.eventos[i] && st.eventos[i].id === id) { return st.eventos[i]; }
                    }
                    return null;
                  }
                
                  function abrirModal(ev, diaSugerido){
                    criarAba();
                    var md = document.getElementById("agModal");
                    if (!md) { return; }
                    st.editando = ev ? ev.id : null;
                
                    var g = function(id){ return document.getElementById(id); };
                    g("agModalTitulo").textContent = ev ? "Editar compromisso" : "Novo compromisso";
                    g("agfObra").innerHTML = '<option value="">(sem obra)</option>' +
                      opcoesObras(ev ? ev.obraId : (st.filtro.obra || obraAtualId()));
                    g("agfTipo").innerHTML = opcoesTipos(ev ? ev.tipo : "visita");
                
                    g("agfTitulo").value = ev ? (ev.titulo || "") : "";
                    g("agfObra").value = ev ? (ev.obraId || "") : (st.filtro.obra || obraAtualId() || "");
                    g("agfTipo").value = ev ? (ev.tipo || "visita") : "visita";
                    g("agfData").value = ev ? (ev.data || "") : (diaSugerido || hojeStr());
                    g("agfSituacao").value = ev ? (ev.situacao || "pendente") : "pendente";
                    g("agfHora").value = ev ? (ev.hora || "") : "";
                    g("agfHoraFim").value = ev ? (ev.horaFim || "") : "";
                    g("agfResp").value = ev ? (ev.responsavel || "") : "";
                    g("agfLocal").value = ev ? (ev.local || "") : "";
                    g("agfLembrete").value = ev ? String(ev.lembrete == null ? 1 : ev.lembrete) : "1";
                    g("agfRepetir").value = ev ? (ev.repetir || "nao") : "nao";
                    g("agfRepetirAte").value = ev ? (ev.repetirAte || "") : "";
                    g("agfObs").value = ev ? (ev.obs || "") : "";
                    g("agBtnExcluir").style.display = ev ? "inline-block" : "none";
                
                    md.classList.add("ag-aberto");
                    setTimeout(function(){ g("agfTitulo").focus(); }, 40);
                  }
                
                  function fecharModal(){
                    var md = document.getElementById("agModal");
                    if (md) { md.classList.remove("ag-aberto"); }
                    st.editando = null;
                  }
                
                  function salvarModal(){
                    var g = function(id){ return document.getElementById(id); };
                    var titulo = g("agfTitulo").value.trim();
                    var data = g("agfData").value;
                
                    if (!titulo) { alert("Escreva o titulo do compromisso."); g("agfTitulo").focus(); return; }
                    if (!sData(data)) { alert("Escolha a data do compromisso."); g("agfData").focus(); return; }
                
                    var hi = g("agfHora").value, hf = g("agfHoraFim").value;
                    if (hi && hf && hf < hi) { alert("A hora final nao pode ser antes da hora inicial."); return; }
                
                    var repetir = g("agfRepetir").value;
                    var repetirAte = g("agfRepetirAte").value;
                    if (repetir !== "nao" && repetirAte && repetirAte < data) {
                      alert("O limite da repeticao nao pode ser antes da data do compromisso.");
                      return;
                    }
                
                    var alvo = st.editando ? acharEvento(st.editando) : null;
                    var novo = !alvo;
                    if (novo) {
                      alvo = { id: novoId(), feitos: [], criadoEm: new Date().toISOString() };
                      st.eventos.push(alvo);
                    }
                
                    alvo.titulo = titulo;
                    alvo.obraId = g("agfObra").value || "";
                    alvo.tipo = g("agfTipo").value || "outro";
                    alvo.data = data;
                    alvo.situacao = g("agfSituacao").value || "pendente";
                    alvo.hora = hi;
                    alvo.horaFim = hf;
                    alvo.responsavel = g("agfResp").value.trim();
                    alvo.local = g("agfLocal").value.trim();
                    alvo.lembrete = parseInt(g("agfLembrete").value, 10) || 0;
                    alvo.repetir = repetir;
                    alvo.repetirAte = repetir === "nao" ? "" : repetirAte;
                    alvo.obs = g("agfObs").value.trim();
                    if (Object.prototype.toString.call(alvo.feitos) !== "[object Array]") { alvo.feitos = []; }
                    alvo.alteradoEm = new Date().toISOString();
                
                    salvar();
                    fecharModal();
                    st.ref = sData(data) ? new Date(sData(data).getFullYear(), sData(data).getMonth(), 1) : st.ref;
                    desenhar();
                    avisar(novo ? "Compromisso adicionado a agenda." : "Compromisso atualizado.");
                  }
                
                  function excluirEvento(id){
                    var ev = acharEvento(id);
                    if (!ev) { return; }
                    var extra = (ev.repetir && ev.repetir !== "nao") ? "\n\nAtencao: isso apaga todas as repeticoes." : "";
                    if (!confirm('Excluir o compromisso "' + (ev.titulo || "") + '"?' + extra)) { return; }
                    var i;
                    for (i = 0; i < st.eventos.length; i++) {
                      if (st.eventos[i] && st.eventos[i].id === id) { st.eventos.splice(i,1); break; }
                    }
                    salvar();
                    fecharModal();
                    desenhar();
                    avisar("Compromisso excluido.");
                  }
                
                  function alternarConclusao(id, dia){
                    var ev = acharEvento(id);
                    if (!ev) { return; }
                    if (Object.prototype.toString.call(ev.feitos) !== "[object Array]") { ev.feitos = []; }
                    var pos = ev.feitos.indexOf(dia);
                    if (pos >= 0) {
                      ev.feitos.splice(pos, 1);
                      if (!ev.repetir || ev.repetir === "nao") { ev.situacao = "pendente"; }
                    } else {
                      ev.feitos.push(dia);
                      if (!ev.repetir || ev.repetir === "nao") { ev.situacao = "concluido"; }
                    }
                    salvar();
                    desenhar();
                  }
                
                  /* ---------- avisos ---------- */
                
                  function avisar(msg, acaoTexto){
                    var cx = document.getElementById("agAviso");
                    if (!cx) { return; }
                    cx.innerHTML = esc(msg) +
                      (acaoTexto ? '<br><button type="button" data-ag="ir-agenda">' + esc(acaoTexto) + '</button>' : '');
                    cx.style.display = "block";
                    if (cx._t) { clearTimeout(cx._t); }
                    cx._t = setTimeout(function(){ cx.style.display = "none"; }, acaoTexto ? 12000 : 4000);
                  }
                
                  function avisoInicial(){
                    var hoje = hojeStr();
                    var guarda = { obra:st.filtro.obra, tipo:st.filtro.tipo, situacao:st.filtro.situacao, texto:st.filtro.texto };
                    st.filtro = { obra:"", tipo:"", situacao:"", texto:"" };
                
                    var doDia = itens(hoje, hoje);
                    var atrasados = itens(dStr(somaDias(new Date(), -365)), dStr(somaDias(new Date(), -1)));
                    var proximos = itens(dStr(somaDias(new Date(), 1)), dStr(somaDias(new Date(), 7)));
                
                    var nHoje = 0, nAtraso = 0, lembretes = 0, i, d;
                    for (i = 0; i < doDia.length; i++) { if (doDia[i].estado === "pendente") { nHoje++; } }
                    for (i = 0; i < atrasados.length; i++) { if (atrasados[i].estado === "pendente") { nAtraso++; } }
                    for (i = 0; i < proximos.length; i++) {
                      if (proximos[i].estado !== "pendente") { continue; }
                      d = proximos[i].ev.lembrete == null ? 1 : proximos[i].ev.lembrete;
                      if (d > 0 && difDias(hoje, proximos[i].dia) <= d) { lembretes++; }
                    }
                
                    st.filtro = guarda;
                
                    var partes = [];
                    if (nHoje) { partes.push(nHoje + (nHoje > 1 ? " compromissos hoje" : " compromisso hoje")); }
                    if (nAtraso) { partes.push(nAtraso + (nAtraso > 1 ? " atrasados" : " atrasado")); }
                    if (lembretes) { partes.push(lembretes + " chegando nos proximos dias"); }
                    if (partes.length) {
                      avisar("\ud83d\uddd3\ufe0f Agenda de Obras: " + partes.join(", ") + ".", "Abrir a agenda");
                    }
                  }
                
                  /* ---------- CSV ---------- */
                
                  function exportarCSV(){
                    var lista = itens(dStr(somaDias(new Date(), -365)), dStr(somaDias(new Date(), 730)));
                    if (!lista.length) { alert("Nao ha compromissos para exportar."); return; }
                    var linhas = [["Data","Dia","Hora inicio","Hora fim","Obra","Tipo","Compromisso",
                                   "Responsavel","Local","Situacao","Observacoes"]];
                    var i, it, d;
                    for (i = 0; i < lista.length; i++) {
                      it = lista[i];
                      d = sData(it.dia);
                      linhas.push([
                        brData(it.dia), DOW[d.getDay()], it.ev.hora || "", it.ev.horaFim || "",
                        nomeObra(it.ev.obraId), tipoInfo(it.ev.tipo).nome, it.ev.titulo || "",
                        it.ev.responsavel || "", it.ev.local || "",
                        it.estado === "concluido" ? "Concluido" : (it.estado === "cancelado" ? "Cancelado" : "Pendente"),
                        String(it.ev.obs || "").replace(/[\r\n]+/g, " ")
                      ]);
                    }
                    var csv = linhas.map(function(l){
                      return l.map(function(c){ return '"' + String(c).replace(/"/g, '""') + '"'; }).join(";");
                    }).join("\r\n");
                
                    try {
                      var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
                      var url = URL.createObjectURL(blob);
                      var a = document.createElement("a");
                      a.href = url;
                      a.download = "agenda_obras_" + hojeStr() + ".csv";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
                      avisar("Arquivo CSV gerado.");
                    } catch (e) {
                      alert("Nao foi possivel gerar o arquivo neste navegador.");
                    }
                  }
                
                  /* ---------- troca de abas ---------- */
                
                  function esconderAgenda(){
                    var el = document.getElementById("tab-agenda");
                    if (el) { el.style.display = "none"; }
                    var bt = document.getElementById("btn-tab-agenda");
                    if (bt) { bt.classList.remove("active"); }
                  }
                
                  function abrirAgenda(){
                    criarAba();
                    var i, ids = ["itens","liberacao","medicoes","graficos","recebimento",
                                  "cronograma","pagamento","ctm","custo"];
                    for (i = 0; i < ids.length; i++) {
                      var el = document.getElementById("tab-" + ids[i]);
                      if (el) { el.style.display = "none"; }
                      var bt = document.getElementById("btn-tab-" + ids[i]);
                      if (bt) { bt.classList.remove("active"); }
                    }
                    var alvo = document.getElementById("tab-agenda");
                    if (alvo) { alvo.style.display = "block"; }
                    var btA = document.getElementById("btn-tab-agenda");
                    if (btA) { btA.classList.add("active"); }
                    var menu = document.getElementById("meu-menu-abas");
                    if (menu) { menu.removeAttribute("open"); }
                    if (!st.ref) { st.ref = new Date(new Date().getFullYear(), new Date().getMonth(), 1); }
                    desenhar();
                  }
                
                  window.abrirAgendaObras = abrirAgenda;
                
                  function envolverTrocarAba(){
                    if (typeof window.trocarAba !== "function" || window.trocarAba.__agenda) { return; }
                    var original = window.trocarAba;
                    var nova = function(aba){
                      if (aba === "agenda") { abrirAgenda(); return; }
                      esconderAgenda();
                      return original.apply(this, arguments);
                    };
                    nova.__agenda = true;
                    window.trocarAba = nova;
                  }
                
                  /* ---------- ligacoes de evento ---------- */
                
                  function ligarEventos(){
                    var painel = document.getElementById("tab-agenda");
                    if (painel && !painel.__ligado) {
                      painel.__ligado = true;
                
                      painel.addEventListener("click", function(ev){
                        var alvo = ev.target.closest ? ev.target.closest("[data-ag]") : null;
                        if (!alvo) { return; }
                        var acao = alvo.getAttribute("data-ag");
                
                        if (acao === "novo") { abrirModal(null, null); return; }
                        if (acao === "visao-calendario") { st.visao = "calendario"; salvar(); desenhar(); return; }
                        if (acao === "visao-lista") { st.visao = "lista"; salvar(); desenhar(); return; }
                        if (acao === "csv") { exportarCSV(); return; }
                        if (acao === "mes-1") {
                          st.ref = new Date(st.ref.getFullYear(), st.ref.getMonth()-1, 1); desenhar(); return;
                        }
                        if (acao === "mes+1") {
                          st.ref = new Date(st.ref.getFullYear(), st.ref.getMonth()+1, 1); desenhar(); return;
                        }
                        if (acao === "mes-hoje") {
                          st.ref = new Date(new Date().getFullYear(), new Date().getMonth(), 1); desenhar(); return;
                        }
                        if (acao === "abrir") {
                          ev.stopPropagation();
                          abrirModal(acharEvento(alvo.getAttribute("data-id")), alvo.getAttribute("data-dia"));
                          return;
                        }
                        if (acao === "concluir") {
                          alternarConclusao(alvo.getAttribute("data-id"), alvo.getAttribute("data-dia"));
                          return;
                        }
                        if (acao === "excluir-lista") { excluirEvento(alvo.getAttribute("data-id")); return; }
                        if (acao === "ver-dia") {
                          ev.stopPropagation();
                          st.visao = "lista";
                          st.filtro.texto = "";
                          salvar();
                          desenhar();
                          return;
                        }
                        if (acao === "dia") { abrirModal(null, alvo.getAttribute("data-data")); return; }
                      });
                
                      var fo = document.getElementById("agFiltroObra");
                      if (fo) { fo.addEventListener("change", function(){ st.filtro.obra = fo.value; salvar(); desenhar(); }); }
                      var ft = document.getElementById("agFiltroTipo");
                      if (ft) { ft.addEventListener("change", function(){ st.filtro.tipo = ft.value; salvar(); desenhar(); }); }
                      var fs = document.getElementById("agFiltroSituacao");
                      if (fs) { fs.addEventListener("change", function(){ st.filtro.situacao = fs.value; salvar(); desenhar(); }); }
                      var fx = document.getElementById("agFiltroTexto");
                      if (fx) {
                        fx.addEventListener("input", function(){
                          st.filtro.texto = fx.value;
                          if (fx._t) { clearTimeout(fx._t); }
                          fx._t = setTimeout(desenhar, 250);
                        });
                      }
                    }
                
                    var md = document.getElementById("agModal");
                    if (md && !md.__ligado) {
                      md.__ligado = true;
                      md.addEventListener("click", function(ev){
                        if (ev.target === md) { fecharModal(); return; }
                        var alvo = ev.target.closest ? ev.target.closest("[data-ag]") : null;
                        if (!alvo) { return; }
                        var acao = alvo.getAttribute("data-ag");
                        if (acao === "fechar") { fecharModal(); return; }
                        if (acao === "salvar") { salvarModal(); return; }
                        if (acao === "excluir" && st.editando) { excluirEvento(st.editando); return; }
                      });
                      md.addEventListener("keydown", function(ev){
                        if (ev.key === "Escape") { fecharModal(); }
                        if (ev.key === "Enter" && ev.target && ev.target.tagName !== "TEXTAREA") {
                          salvarModal(); ev.preventDefault();
                        }
                      });
                    }
                
                    var av = document.getElementById("agAviso");
                    if (av && !av.__ligado) {
                      av.__ligado = true;
                      av.addEventListener("click", function(ev){
                        var alvo = ev.target.closest ? ev.target.closest("[data-ag]") : null;
                        if (alvo && alvo.getAttribute("data-ag") === "ir-agenda") {
                          av.style.display = "none";
                          abrirAgenda();
                        }
                      });
                    }
                  }
                
                  /* ---------- inicio ---------- */
                
                  function iniciar(){
                    carregar();
                    st.ref = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                    criarAba();
                    envolverTrocarAba();
                    renderResumo();
                    setTimeout(avisoInicial, 1500);
                    /* obras podem chegar depois (nuvem): atualiza os nomes */
                    setTimeout(function(){ sincronizarFiltros(); renderResumo(); }, 2500);
                    setTimeout(function(){ sincronizarFiltros(); renderResumo(); }, 6000);
                  }
                
                  if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", function(){ setTimeout(iniciar, 80); });
                  } else {
                    setTimeout(iniciar, 80);
                  }
                })();
            
