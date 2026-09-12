
                /* === PATCH 44: links do bitrix (acesso rapido) === */
                (function(){
                  "use strict";
                
                  var KEY = "painelLinksBitrix_v1";
                
                  /* links oficiais da empresa (nao podem ser excluidos) */
                  var BASE = [
                    {
                      id: "bx-tarefas",
                      nome: "Tarefas do Grupo",
                      desc: "Lista de tarefas do grupo 28, com o filtro pronto",
                      url: "https://porticoesquadrias.bitrix24.com.br/stream/",
                      ico: "\ud83d\udccb",
                      cor: "#2563eb"
                    },
                    {
                      id: "bx-talocacaao",
                      nome: "Alocação de Obras",
                      desc: "Lista de tarefas do grupo 28, com o filtro pronto",
                      url: "https://docs.google.com/spreadsheets/d/1d6wVTrzmIH-ck1ly6W2dwlDNRmlXskL5vKmzQ55pgac/edit?gid=1549849778#gid=1549849778m/",
                      ico: "\ud83d\udccb",
                      cor: "#2563eb"
                    },
                    {
                      id: "bx-justicativas",
                      nome: "Justificativas de Ponto",
                      desc: "Lista de tarefas do grupo 28, com o filtro pronto",
                      url: "https://docs.google.com/spreadsheets/d/1FXqLLxCpJPs-DWUikUMBRTfried6ewBJ/edit?gid=678811758#gid=678811758",
                      ico: "\ud83d\udccb",
                      cor: "#2563eb"
                    },
                    {
                      id: "bx-controle",
                      nome: "Controle de Obras",
                      desc: "Lista de tarefas do grupo 28, com o filtro pronto",
                      url: "https://docs.google.com/spreadsheets/d/1KmBvpGrsQmM3EROnp4ZrhbxKxMCtraOKJ9ac8f2Wws8/edit?gid=1161341563#gid=1161341563",
                      ico: "\ud83d\udccb",
                      cor: "#2563eb"
                    },
                    {
                      id: "bx-crm",
                      nome: "Formulario CRM",
                      desc: "Abre o formulario de CRM para novo registro",
                      url: "https://porticoesquadrias.bitrix24.site/crm_form_5gqox/",
                      ico: "\ud83d\udcdd",
                      cor: "#0891b2"
                    },
                    {
                      id: "bx-beneficios",
                      nome: "Solicitacao de Beneficios",
                      desc: "Pedido de beneficios dos colaboradores",
                      url: "https://porticoesquadrias.bitrix24.site/solicitacaodebeneficios/",
                      ico: "\ud83e\udde9",
                      cor: "#059669"
                    },
                    {
                      id: "bx-ruptura",
                      nome: "Ruptura de Processo",
                      desc: "Registro de ruptura ou desvio de processo",
                      url: "https://porticoesquadrias.bitrix24.site/rupturaprocesso/",
                      ico: "\u26a0\ufe0f",
                      cor: "#dc2626"
                    }
                  ];
                
                  var st = {
                    aberto: false,
                    bx: null, by: null,      /* posicao do botao redondo */
                    jx: null, jy: null,      /* posicao da janela */
                    extras: [],
                    fav: {},
                    usos: {},
                    ultimo: {},
                    busca: "",
                    editando: null
                  };
                
                  /* ---------- utilidades ---------- */
                
                  function esc(v){
                    return String(v == null ? "" : v)
                      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
                      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
                  }
                
                  function pad(n){ return (n < 10 ? "0" : "") + n; }
                
                  /* aceita somente http:// e https:// - bloqueia javascript:, data: etc. */
                  function urlSegura(u){
                    var s = String(u == null ? "" : u).trim();
                    if (!s) { return ""; }
                    if (/[\u0000-\u001f\u007f]/.test(s)) { return ""; }
                    if (!/^https?:\/\//i.test(s)) {
                      if (/^[a-z][a-z0-9+.-]*:/i.test(s)) { return ""; }
                      s = "https://" + s;
                    }
                    if (!/^https?:\/\/[^\s\/]+/i.test(s)) { return ""; }
                    return s;
                  }
                
                  function curto(u){
                    var s = String(u || "").replace(/^https?:\/\//i, "");
                    return s.length > 46 ? s.slice(0, 44) + "..." : s;
                  }
                
                  function quando(ts){
                    if (!ts) { return "nunca aberto"; }
                    var d = new Date(ts);
                    if (isNaN(d.getTime())) { return "nunca aberto"; }
                    var hoje = new Date();
                    var mesmoDia = d.getFullYear() === hoje.getFullYear() &&
                                   d.getMonth() === hoje.getMonth() &&
                                   d.getDate() === hoje.getDate();
                    var hora = pad(d.getHours()) + ":" + pad(d.getMinutes());
                    if (mesmoDia) { return "hoje as " + hora; }
                    return pad(d.getDate()) + "/" + pad(d.getMonth()+1) + "/" + d.getFullYear() + " " + hora;
                  }
                
                  function novoId(){
                    return "px" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
                  }
                
                  /* ---------- memoria do navegador ---------- */
                
                  function carregar(){
                    var bruto = null;
                    try { bruto = window.localStorage.getItem(KEY); }
                    catch (e) { bruto = null; }
                    if (!bruto) { return; }
                    var d = null;
                    try { d = JSON.parse(bruto); }
                    catch (e2) { d = null; }
                    if (!d || typeof d !== "object") { return; }
                
                    st.aberto = d.aberto === true;
                    st.bx = typeof d.bx === "number" ? d.bx : null;
                    st.by = typeof d.by === "number" ? d.by : null;
                    st.jx = typeof d.jx === "number" ? d.jx : null;
                    st.jy = typeof d.jy === "number" ? d.jy : null;
                    st.fav = (d.fav && typeof d.fav === "object") ? d.fav : {};
                    st.usos = (d.usos && typeof d.usos === "object") ? d.usos : {};
                    st.ultimo = (d.ultimo && typeof d.ultimo === "object") ? d.ultimo : {};
                
                    st.extras = [];
                    if (Object.prototype.toString.call(d.extras) === "[object Array]") {
                      var i, it, u;
                      for (i = 0; i < d.extras.length; i++) {
                        it = d.extras[i];
                        if (!it || typeof it !== "object") { continue; }
                        u = urlSegura(it.url);
                        if (!u) { continue; }
                        st.extras.push({
                          id: String(it.id || novoId()),
                          nome: String(it.nome || "Link").slice(0, 80),
                          desc: String(it.desc || "").slice(0, 120),
                          url: u,
                          ico: "\ud83d\udd17",
                          cor: "#475569",
                          proprio: true
                        });
                      }
                    }
                  }
                
                  function salvar(){
                    var i, limpos = [];
                    for (i = 0; i < st.extras.length; i++) {
                      limpos.push({
                        id: st.extras[i].id,
                        nome: st.extras[i].nome,
                        desc: st.extras[i].desc,
                        url: st.extras[i].url
                      });
                    }
                    try {
                      window.localStorage.setItem(KEY, JSON.stringify({
                        aberto: st.aberto, bx: st.bx, by: st.by, jx: st.jx, jy: st.jy,
                        extras: limpos, fav: st.fav, usos: st.usos, ultimo: st.ultimo
                      }));
                    } catch (e) { /* espaco cheio ou navegador bloqueado: segue sem salvar */ }
                  }
                
                  /* ---------- lista de links ---------- */
                
                  function todos(){
                    var i, r = [];
                    for (i = 0; i < BASE.length; i++) {
                      r.push({
                        id: BASE[i].id, nome: BASE[i].nome, desc: BASE[i].desc,
                        url: BASE[i].url, ico: BASE[i].ico, cor: BASE[i].cor, proprio: false
                      });
                    }
                    for (i = 0; i < st.extras.length; i++) { r.push(st.extras[i]); }
                    return r;
                  }
                
                  function acharLink(id){
                    var l = todos(), i;
                    for (i = 0; i < l.length; i++) {
                      if (l[i].id === id) { return l[i]; }
                    }
                    return null;
                  }
                
                  function filtrados(){
                    var l = todos(), t = String(st.busca || "").toLowerCase().trim(), r = [], i, it;
                    for (i = 0; i < l.length; i++) {
                      it = l[i];
                      if (t) {
                        var alvo = (it.nome + " " + it.desc + " " + it.url).toLowerCase();
                        if (alvo.indexOf(t) === -1) { continue; }
                      }
                      r.push(it);
                    }
                    r.sort(function(a, b){
                      var fa = st.fav[a.id] ? 1 : 0, fb = st.fav[b.id] ? 1 : 0;
                      if (fa !== fb) { return fb - fa; }
                      var ua = st.usos[a.id] || 0, ub = st.usos[b.id] || 0;
                      if (ua !== ub) { return ub - ua; }
                      return a.nome.localeCompare(b.nome);
                    });
                    return r;
                  }
                
                  /* ---------- montagem da tela ---------- */
                
                  function criar(){
                    if (document.getElementById("pbxBotao")) { return; }
                
                    var botao = document.createElement("button");
                    botao.type = "button";
                    botao.id = "pbxBotao";
                    botao.title = "Links do Bitrix (Alt + B)";
                    botao.setAttribute("aria-label", "Abrir os links do Bitrix");
                    botao.innerHTML = '<span aria-hidden="true">\ud83d\udd17</span>' +
                                      '<span class="pbx-conta" id="pbxConta"></span>';
                    document.body.appendChild(botao);
                
                    var jan = document.createElement("div");
                    jan.id = "pbxJanela";
                    jan.setAttribute("role", "dialog");
                    jan.setAttribute("aria-label", "Links do Bitrix");
                    jan.innerHTML =
                      '<div class="pbx-topo" id="pbxTopo">' +
                        '<span aria-hidden="true">\ud83d\udd17</span>' +
                        '<span class="pbx-tit">Links do Bitrix</span>' +
                        '<button type="button" data-pbx="novo" title="Cadastrar um link">+</button>' +
                        '<button type="button" data-pbx="fechar" title="Fechar">\u2715</button>' +
                      '</div>' +
                      '<div class="pbx-corpo">' +
                        '<input type="text" class="pbx-busca" id="pbxBusca" ' +
                               'placeholder="Buscar link..." aria-label="Buscar link">' +
                        '<div class="pbx-form" id="pbxForm">' +
                          '<label for="pbxNome">Nome do link</label>' +
                          '<input type="text" id="pbxNome" maxlength="80" placeholder="Ex.: Relatorio de compras">' +
                          '<label for="pbxUrl">Endereco (https://...)</label>' +
                          '<input type="text" id="pbxUrl" placeholder="https://...">' +
                          '<div class="pbx-erro" id="pbxErro"></div>' +
                          '<div class="pbx-fbts">' +
                            '<button type="button" class="pbx-ok" data-pbx="salvar">Salvar</button>' +
                            '<button type="button" data-pbx="cancelar">Cancelar</button>' +
                          '</div>' +
                        '</div>' +
                        '<div id="pbxLista"></div>' +
                      '</div>' +
                      '<div class="pbx-aviso">Os links abrem em uma nova aba do navegador.</div>' +
                      '<div class="pbx-rodape">' +
                        '<button type="button" data-pbx="novo">+ Novo link</button>' +
                        '<button type="button" data-pbx="abrir-tudo">Abrir favoritos</button>' +
                      '</div>';
                    document.body.appendChild(jan);
                
                    criarBotaoAba();
                  }
                
                  function criarBotaoAba(){
                    if (document.getElementById("btn-tab-bitrix")) { return; }
                    var menu = document.querySelector("#meu-menu-abas .tabs") ||
                               document.querySelector(".tabs");
                    if (!menu) { return; }
                    var bt = document.createElement("button");
                    bt.type = "button";
                    bt.className = "tab-btn";
                    bt.id = "btn-tab-bitrix";
                    bt.innerHTML = '\ud83d\udd17 Links Bitrix';
                    bt.addEventListener("click", function(ev){
                      ev.preventDefault();
                      var det = document.getElementById("meu-menu-abas");
                      if (det) { det.removeAttribute("open"); }
                      mostrar();
                    });
                    menu.appendChild(bt);
                  }
                
                  /* ---------- desenho da lista ---------- */
                
                  function itemHtml(it){
                    var favOn = st.fav[it.id] ? " pbx-on" : "";
                    var uso = st.usos[it.id] || 0;
                    var meta = quando(st.ultimo[it.id]) + (uso ? " \u00b7 " + uso + (uso === 1 ? " acesso" : " acessos") : "");
                    var h =
                      '<div class="pbx-item">' +
                        '<div class="pbx-ico" style="background:' + esc(it.cor) + '" aria-hidden="true">' +
                          esc(it.ico) + '</div>' +
                        '<div class="pbx-txt">' +
                          '<span class="pbx-nome">' + esc(it.nome) + '</span>' +
                          '<span class="pbx-desc" title="' + esc(it.url) + '">' +
                            esc(it.desc ? it.desc : curto(it.url)) + '</span>' +
                          '<span class="pbx-meta">' + esc(meta) + '</span>' +
                        '</div>' +
                        '<div class="pbx-bts">' +
                          '<button type="button" class="pbx-abrir" data-pbx="abrir" data-id="' +
                            esc(it.id) + '">Abrir</button>' +
                          '<button type="button" data-pbx="copiar" data-id="' + esc(it.id) +
                            '" title="Copiar o endereco">Copiar</button>' +
                          '<button type="button" class="pbx-fav' + favOn + '" data-pbx="fav" data-id="' +
                            esc(it.id) + '" title="Favorito">\u2605</button>';
                    if (it.proprio) {
                      h += '<button type="button" data-pbx="editar" data-id="' + esc(it.id) +
                           '" title="Editar">Editar</button>' +
                           '<button type="button" data-pbx="excluir" data-id="' + esc(it.id) +
                           '" title="Excluir">Excluir</button>';
                    }
                    h += '</div></div>';
                    return h;
                  }
                
                  function desenhar(){
                    var lista = document.getElementById("pbxLista");
                    if (!lista) { return; }
                    var itens = filtrados(), i, h = "";
                
                    if (!itens.length) {
                      h = '<div class="pbx-vazio">Nenhum link encontrado para essa busca.</div>';
                    } else {
                      var temFav = false;
                      for (i = 0; i < itens.length; i++) {
                        if (st.fav[itens[i].id]) { temFav = true; break; }
                      }
                      var secFav = false, secOutros = false;
                      for (i = 0; i < itens.length; i++) {
                        if (temFav && st.fav[itens[i].id] && !secFav) {
                          h += '<div class="pbx-secao">Favoritos</div>'; secFav = true;
                        }
                        if (temFav && !st.fav[itens[i].id] && !secOutros) {
                          h += '<div class="pbx-secao">Outros links</div>'; secOutros = true;
                        }
                        h += itemHtml(itens[i]);
                      }
                    }
                    lista.innerHTML = h;
                
                    var conta = document.getElementById("pbxConta");
                    if (conta) {
                      var n = st.extras.length;
                      conta.textContent = n ? String(BASE.length + n) : "";
                      conta.style.display = n ? "block" : "none";
                    }
                  }
                
                  /* ---------- acoes ---------- */
                
                  function mostrar(){
                    criar();
                    var jan = document.getElementById("pbxJanela");
                    if (!jan) { return; }
                    jan.classList.add("pbx-visivel");
                    st.aberto = true;
                    aplicarPosicoes();
                    desenhar();
                    salvar();
                    var b = document.getElementById("pbxBusca");
                    if (b) { try { b.focus(); } catch (e) {} }
                  }
                
                  function esconder(){
                    var jan = document.getElementById("pbxJanela");
                    if (jan) { jan.classList.remove("pbx-visivel"); }
                    st.aberto = false;
                    fecharForm();
                    salvar();
                  }
                
                  function alternar(){
                    if (st.aberto) { esconder(); } else { mostrar(); }
                  }
                
                  function abrirLink(id){
                    var it = acharLink(id);
                    if (!it) { return; }
                    var u = urlSegura(it.url);
                    if (!u) { return; }
                    st.usos[id] = (st.usos[id] || 0) + 1;
                    st.ultimo[id] = Date.now();
                    salvar();
                    desenhar();
                    var w = null;
                    try { w = window.open(u, "_blank", "noopener,noreferrer"); }
                    catch (e) { w = null; }
                    if (w && typeof w.opener !== "undefined") { try { w.opener = null; } catch (e2) {} }
                  }
                
                  function abrirFavoritos(){
                    var l = todos(), i, n = 0;
                    for (i = 0; i < l.length; i++) {
                      if (st.fav[l[i].id]) { abrirLink(l[i].id); n++; }
                    }
                    if (!n) { aviso("Marque um link com a estrela para usar este botao."); }
                  }
                
                  function copiarLink(id){
                    var it = acharLink(id);
                    if (!it) { return; }
                    var texto = it.url, ok = false;
                    if (window.navigator && window.navigator.clipboard &&
                        typeof window.navigator.clipboard.writeText === "function") {
                      try {
                        window.navigator.clipboard.writeText(texto);
                        ok = true;
                      } catch (e) { ok = false; }
                    }
                    if (!ok) {
                      try {
                        var ta = document.createElement("textarea");
                        ta.value = texto;
                        ta.setAttribute("readonly", "readonly");
                        ta.style.position = "fixed";
                        ta.style.left = "-9999px";
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand("copy");
                        document.body.removeChild(ta);
                        ok = true;
                      } catch (e2) { ok = false; }
                    }
                    aviso(ok ? "Endereco copiado." : "Nao foi possivel copiar automaticamente.");
                  }
                
                  function alternarFav(id){
                    if (st.fav[id]) { delete st.fav[id]; }
                    else { st.fav[id] = true; }
                    salvar();
                    desenhar();
                  }
                
                  function excluirLink(id){
                    var i;
                    for (i = 0; i < st.extras.length; i++) {
                      if (st.extras[i].id === id) {
                        if (!window.confirm('Excluir o link "' + st.extras[i].nome + '"?')) { return; }
                        st.extras.splice(i, 1);
                        delete st.fav[id];
                        delete st.usos[id];
                        delete st.ultimo[id];
                        salvar();
                        desenhar();
                        return;
                      }
                    }
                  }
                
                  /* ---------- formulario de link proprio ---------- */
                
                  function abrirForm(id){
                    criar();
                    var form = document.getElementById("pbxForm");
                    var nome = document.getElementById("pbxNome");
                    var url = document.getElementById("pbxUrl");
                    if (!form || !nome || !url) { return; }
                    st.editando = null;
                    nome.value = "";
                    url.value = "";
                    if (id) {
                      var it = acharLink(id);
                      if (it && it.proprio) {
                        st.editando = id;
                        nome.value = it.nome;
                        url.value = it.url;
                      }
                    }
                    mostrarErro("");
                    form.classList.add("pbx-visivel");
                    try { nome.focus(); } catch (e) {}
                  }
                
                  function fecharForm(){
                    var form = document.getElementById("pbxForm");
                    if (form) { form.classList.remove("pbx-visivel"); }
                    st.editando = null;
                    mostrarErro("");
                  }
                
                  function mostrarErro(msg){
                    var el = document.getElementById("pbxErro");
                    if (!el) { return; }
                    el.textContent = msg || "";
                    if (msg) { el.classList.add("pbx-visivel"); }
                    else { el.classList.remove("pbx-visivel"); }
                  }
                
                  function salvarForm(){
                    var nomeEl = document.getElementById("pbxNome");
                    var urlEl = document.getElementById("pbxUrl");
                    if (!nomeEl || !urlEl) { return; }
                    var nome = String(nomeEl.value || "").trim().slice(0, 80);
                    var u = urlSegura(urlEl.value);
                    if (!nome) { mostrarErro("Escreva um nome para o link."); return; }
                    if (!u) {
                      mostrarErro("Endereco invalido. Use um endereco que comece com https://");
                      return;
                    }
                    if (st.editando) {
                      var i;
                      for (i = 0; i < st.extras.length; i++) {
                        if (st.extras[i].id === st.editando) {
                          st.extras[i].nome = nome;
                          st.extras[i].url = u;
                          st.extras[i].desc = "";
                          break;
                        }
                      }
                    } else {
                      st.extras.push({
                        id: novoId(), nome: nome, desc: "", url: u,
                        ico: "\ud83d\udd17", cor: "#475569", proprio: true
                      });
                    }
                    fecharForm();
                    salvar();
                    desenhar();
                  }
                
                  /* ---------- recado rapido ---------- */
                
                  function aviso(msg){
                    var el = document.getElementById("pbxAviso");
                    if (!el) {
                      el = document.createElement("div");
                      el.id = "pbxAviso";
                      el.style.cssText = "position:fixed;left:18px;bottom:144px;z-index:99999;" +
                        "background:#0b3f6e;color:#fff;padding:8px 12px;border-radius:8px;" +
                        "font-size:.78rem;box-shadow:0 8px 20px rgba(2,6,23,.5);max-width:300px;";
                      document.body.appendChild(el);
                    }
                    el.textContent = msg;
                    el.style.display = "block";
                    if (el.__t) { window.clearTimeout(el.__t); }
                    el.__t = window.setTimeout(function(){ el.style.display = "none"; }, 2600);
                  }
                
                  /* ---------- posicoes e arrastar ---------- */
                
                  function limitar(v, max){
                    if (v < 4) { return 4; }
                    if (v > max - 4) { return Math.max(4, max - 4); }
                    return v;
                  }
                
                  function aplicarPosicoes(){
                    var botao = document.getElementById("pbxBotao");
                    var jan = document.getElementById("pbxJanela");
                    if (botao && st.bx !== null && st.by !== null) {
                      var lb = limitar(st.bx, window.innerWidth - botao.offsetWidth);
                      var tb = limitar(st.by, window.innerHeight - botao.offsetHeight);
                      botao.style.left = lb + "px";
                      botao.style.top = tb + "px";
                      botao.style.right = "auto";
                      botao.style.bottom = "auto";
                    }
                    if (jan && st.jx !== null && st.jy !== null && jan.offsetWidth) {
                      var lj = limitar(st.jx, window.innerWidth - jan.offsetWidth);
                      var tj = limitar(st.jy, window.innerHeight - jan.offsetHeight);
                      jan.style.left = lj + "px";
                      jan.style.top = tj + "px";
                      jan.style.right = "auto";
                      jan.style.bottom = "auto";
                    }
                  }
                
                  function arrastar(alvo, pega, aoSoltar){
                    var ativo = false, moveu = false, dx = 0, dy = 0;
                
                    function inicio(ev){
                      if (ev.button !== undefined && ev.button !== 0) { return; }
                      if (ev.target && ev.target.closest && ev.target.closest("[data-pbx]") &&
                          ev.target !== pega) { return; }
                      var r = alvo.getBoundingClientRect();
                      dx = ev.clientX - r.left;
                      dy = ev.clientY - r.top;
                      ativo = true;
                      moveu = false;
                      pega.classList.add("pbx-arrastando");
                      document.addEventListener("pointermove", mover);
                      document.addEventListener("pointerup", fim);
                    }
                
                    function mover(ev){
                      if (!ativo) { return; }
                      var x = ev.clientX - dx, y = ev.clientY - dy;
                      if (!moveu &&
                          Math.abs(ev.movementX || 0) + Math.abs(ev.movementY || 0) === 0) { /* nada */ }
                      moveu = true;
                      x = limitar(x, window.innerWidth - alvo.offsetWidth);
                      y = limitar(y, window.innerHeight - alvo.offsetHeight);
                      alvo.style.left = x + "px";
                      alvo.style.top = y + "px";
                      alvo.style.right = "auto";
                      alvo.style.bottom = "auto";
                      if (ev.preventDefault) { ev.preventDefault(); }
                    }
                
                    function fim(){
                      if (!ativo) { return; }
                      ativo = false;
                      pega.classList.remove("pbx-arrastando");
                      document.removeEventListener("pointermove", mover);
                      document.removeEventListener("pointerup", fim);
                      var r = alvo.getBoundingClientRect();
                      if (moveu && aoSoltar) { aoSoltar(Math.round(r.left), Math.round(r.top)); }
                      alvo.__movido = moveu;
                    }
                
                    pega.addEventListener("pointerdown", inicio);
                  }
                
                  /* ---------- ligacoes de evento ---------- */
                
                  function ligar(){
                    var botao = document.getElementById("pbxBotao");
                    var jan = document.getElementById("pbxJanela");
                    var topo = document.getElementById("pbxTopo");
                    if (!botao || !jan || !topo) { return; }
                
                    if (!botao.__pbx) {
                      botao.__pbx = true;
                      botao.addEventListener("click", function(){
                        if (botao.__movido) { botao.__movido = false; return; }
                        alternar();
                      });
                      arrastar(botao, botao, function(x, y){
                        st.bx = x; st.by = y; salvar();
                      });
                    }
                
                    if (!jan.__pbx) {
                      jan.__pbx = true;
                      arrastar(jan, topo, function(x, y){ st.jx = x; st.jy = y; salvar(); });
                
                      jan.addEventListener("click", function(ev){
                        var alvo = ev.target.closest ? ev.target.closest("[data-pbx]") : null;
                        if (!alvo) { return; }
                        var acao = alvo.getAttribute("data-pbx");
                        var id = alvo.getAttribute("data-id");
                        if (acao === "fechar") { esconder(); return; }
                        if (acao === "novo") { abrirForm(null); return; }
                        if (acao === "cancelar") { fecharForm(); return; }
                        if (acao === "salvar") { salvarForm(); return; }
                        if (acao === "abrir") { abrirLink(id); return; }
                        if (acao === "copiar") { copiarLink(id); return; }
                        if (acao === "fav") { alternarFav(id); return; }
                        if (acao === "editar") { abrirForm(id); return; }
                        if (acao === "excluir") { excluirLink(id); return; }
                        if (acao === "abrir-tudo") { abrirFavoritos(); return; }
                      });
                
                      var busca = document.getElementById("pbxBusca");
                      if (busca) {
                        busca.addEventListener("input", function(){
                          st.busca = busca.value || "";
                          desenhar();
                        });
                      }
                
                      jan.addEventListener("keydown", function(ev){
                        if (ev.key === "Escape") { esconder(); return; }
                        if (ev.key === "Enter") {
                          var form = document.getElementById("pbxForm");
                          if (form && form.classList.contains("pbx-visivel") &&
                              ev.target && ev.target.tagName === "INPUT" &&
                              ev.target.id !== "pbxBusca") {
                            ev.preventDefault();
                            salvarForm();
                          }
                        }
                      });
                    }
                
                    if (!window.__pbxTeclado) {
                      window.__pbxTeclado = true;
                      document.addEventListener("keydown", function(ev){
                        if (ev.altKey && !ev.ctrlKey && !ev.shiftKey &&
                            String(ev.key || "").toLowerCase() === "b") {
                          ev.preventDefault();
                          alternar();
                        }
                      });
                      window.addEventListener("resize", function(){ aplicarPosicoes(); });
                    }
                  }
                
                  /* ---------- inicio ---------- */
                
                  function iniciar(){
                    carregar();
                    criar();
                    ligar();
                    aplicarPosicoes();
                    desenhar();
                    if (st.aberto) { mostrar(); }
                    /* o menu de abas pode ser montado depois: tenta de novo */
                    window.setTimeout(criarBotaoAba, 1200);
                    window.setTimeout(criarBotaoAba, 3500);
                  }
                
                  window.abrirLinksBitrix = mostrar;
                
                  if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", iniciar);
                  } else {
                    iniciar();
                  }
                })();
            
