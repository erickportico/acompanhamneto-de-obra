
                /* === PATCH 45: ajustes da calculadora e da agenda (funcionamento) === */
                (function(){
                  "use strict";
                
                  if (window.__patch45Ativo) { return; }
                  window.__patch45Ativo = true;
                
                  var CHAVE_CALC = "painelCalculadoraCientifica";
                  var CHAVE_TAM = "painelCalculadoraTamanho_v45";
                  var ESC_MIN = 0.78;
                  var ESC_MAX = 2.4;
                  var LARG_BASE = 200;
                
                  var escAtual = 1;
                
                  /* ================= calculadora: tamanho ================= */
                
                  function limitar(v){
                    if (!isFinite(v)) { return 1; }
                    if (v < ESC_MIN) { return ESC_MIN; }
                    if (v > ESC_MAX) { return ESC_MAX; }
                    return Math.round(v * 100) / 100;
                  }
                
                  function aplicarEscala(v){
                    escAtual = limitar(v);
                    try {
                      document.documentElement.style.setProperty("--pcalc-esc", String(escAtual));
                    } catch (e) {}
                  }
                
                  function lerEscala(){
                    try {
                      var bruto = localStorage.getItem(CHAVE_TAM);
                      if (!bruto) { return 1; }
                      var o = JSON.parse(bruto);
                      if (o && typeof o.esc === "number") { return limitar(o.esc); }
                    } catch (e) {}
                    return 1;
                  }
                
                  function salvarEscala(){
                    try {
                      localStorage.setItem(CHAVE_TAM, JSON.stringify({ esc: escAtual }));
                    } catch (e) {}
                  }
                
                  aplicarEscala(lerEscala());
                
                  function pontos(ev){
                    if (ev.touches && ev.touches[0]) {
                      return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
                    }
                    return { x: ev.clientX, y: ev.clientY };
                  }
                
                  function manterNaTela(janela){
                    if (!janela) { return; }
                    var r = janela.getBoundingClientRect();
                    if (!janela.style.left && !janela.style.top) { return; }
                    var maxX = Math.max(0, window.innerWidth - r.width);
                    var maxY = Math.max(0, window.innerHeight - Math.min(r.height, window.innerHeight - 10));
                    var x = Math.min(Math.max(0, r.left), maxX);
                    var y = Math.min(Math.max(0, r.top), maxY);
                    janela.style.left = x + "px";
                    janela.style.top = y + "px";
                  }
                
                  /* ================= calculadora: alca de redimensionar ================= */
                
                  function criarAlca(janela){
                    if (!janela || janela.querySelector(".pcalc-alca")) { return; }
                
                    var alca = document.createElement("div");
                    alca.className = "pcalc-alca";
                    alca.setAttribute("role", "separator");
                    alca.setAttribute("aria-label", "Aumentar ou diminuir a calculadora");
                    alca.title = "Arraste para aumentar ou diminuir (dois cliques volta ao tamanho padrao)";
                    janela.appendChild(alca);
                
                    var ativo = false, x0 = 0, y0 = 0, esc0 = 1, idp = null;
                
                    function inicio(ev){
                      if (ev.button !== undefined && ev.button !== 0) { return; }
                      var p = pontos(ev);
                      ativo = true; x0 = p.x; y0 = p.y; esc0 = escAtual;
                      if (ev.pointerId !== undefined && alca.setPointerCapture) {
                        idp = ev.pointerId;
                        try { alca.setPointerCapture(idp); } catch (e) {}
                      }
                      ev.stopPropagation();
                      if (ev.cancelable) { ev.preventDefault(); }
                    }
                
                    function mover(ev){
                      if (!ativo) { return; }
                      var p = pontos(ev);
                      var d = ((p.x - x0) + (p.y - y0)) / 2;
                      aplicarEscala(esc0 + d / LARG_BASE);
                      ev.stopPropagation();
                      if (ev.cancelable) { ev.preventDefault(); }
                    }
                
                    function fim(){
                      if (!ativo) { return; }
                      ativo = false;
                      if (idp !== null && alca.releasePointerCapture) {
                        try { alca.releasePointerCapture(idp); } catch (e) {}
                        idp = null;
                      }
                      salvarEscala();
                      manterNaTela(janela);
                    }
                
                    if (window.PointerEvent) {
                      alca.addEventListener("pointerdown", inicio);
                      document.addEventListener("pointermove", mover);
                      document.addEventListener("pointerup", fim);
                      document.addEventListener("pointercancel", fim);
                    } else {
                      alca.addEventListener("mousedown", inicio);
                      document.addEventListener("mousemove", mover);
                      document.addEventListener("mouseup", fim);
                      alca.addEventListener("touchstart", inicio, { passive: false });
                      document.addEventListener("touchmove", mover, { passive: false });
                      document.addEventListener("touchend", fim);
                    }
                
                    alca.addEventListener("dblclick", function(ev){
                      ev.stopPropagation();
                      aplicarEscala(1);
                      salvarEscala();
                      manterNaTela(janela);
                    });
                  }
                
                  /* ================= calculadora: cliques da barra ================= */
                
                  /* o arraste da janela capturava o clique dos botoes (fechar /
                     minimizar) e eles paravam de funcionar. Aqui o arraste e
                     impedido de comecar quando o clique nasce dentro de um botao. */
                  function protegerBarra(janela){
                    var barra = janela.querySelector(".pcalc-barra");
                    if (!barra || barra.__p45) { return; }
                    barra.__p45 = true;
                
                    function bloquear(ev){
                      var alvo = ev.target;
                      var botao = (alvo && alvo.closest) ? alvo.closest("button") : null;
                      if (botao && barra.contains(botao)) { ev.stopPropagation(); }
                    }
                
                    barra.addEventListener("pointerdown", bloquear, true);
                    barra.addEventListener("mousedown", bloquear, true);
                    barra.addEventListener("touchstart", bloquear, true);
                  }
                
                  function fecharCalculadora(){
                    var janela = document.getElementById("pcalcJanela");
                    if (!janela) { return; }
                    if (janela.className.indexOf("pcalc-oculto") < 0) {
                      janela.className = "pcalc-oculto";
                    }
                    /* garante que continue fechada depois de atualizar a pagina */
                    setTimeout(function(){
                      try {
                        var bruto = localStorage.getItem(CHAVE_CALC);
                        var o = bruto ? JSON.parse(bruto) : {};
                        if (o && typeof o === "object") {
                          o.aberto = false;
                          localStorage.setItem(CHAVE_CALC, JSON.stringify(o));
                        }
                      } catch (e) {}
                    }, 700);
                  }
                
                  /* ================= agenda: obras ================= */
                
                  function arr(v){ return Object.prototype.toString.call(v) === "[object Array]"; }
                
                  function daMemoria(){
                    var chaves = ["obrasDB_v8","obrasDB_v7","obrasDB_v6","obrasDB_v5",
                                  "obrasDB_v4","obrasDB_v3","obrasDB_v2","obrasDB"];
                    var i, bruto, o;
                    for (i = 0; i < chaves.length; i++) {
                      try {
                        bruto = localStorage.getItem(chaves[i]);
                        if (!bruto) { continue; }
                        o = JSON.parse(bruto);
                        if (o && arr(o.obras) && o.obras.length) { return o.obras; }
                        if (arr(o) && o.length && o[0] && o[0].id) { return o; }
                      } catch (e) {}
                    }
                    return [];
                  }
                
                  function listaObras(){
                    var d = window.db;
                    if (d && arr(d.obras) && d.obras.length) { return d.obras; }
                    if (arr(window.dbObras) && window.dbObras.length) { return window.dbObras; }
                    if (arr(window.obrasDB) && window.obrasDB.length) { return window.obrasDB; }
                    var mem = daMemoria();
                    if (mem.length && !arr(window.dbObras)) {
                      /* deixa disponivel para o resto do painel, sem apagar nada */
                      try { window.dbObras = mem; } catch (e) {}
                    }
                    return mem;
                  }
                
                  function esc(v){
                    return String(v == null ? "" : v)
                      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
                      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
                  }
                
                  function encher(select, textoPrimeiro){
                    if (!select) { return false; }
                    var l = listaObras();
                    if (!l.length) { return false; }
                
                    var validas = 0, i, h = "";
                    for (i = 0; i < l.length; i++) {
                      if (!l[i] || !l[i].id) { continue; }
                      validas++;
                      h += '<option value="' + esc(l[i].id) + '">' +
                           esc(l[i].nome || "Obra sem nome") + '</option>';
                    }
                    if (!validas) { return false; }
                    /* nada a fazer se as obras ja estao na lista */
                    if (select.options.length >= validas + 1) { return false; }
                
                    var anterior = select.value;
                    select.innerHTML = '<option value="">' + esc(textoPrimeiro) + '</option>' + h;
                    if (anterior) { select.value = anterior; }
                    return true;
                  }
                
                  function preencherObras(){
                    var mudou = false;
                    if (encher(document.getElementById("agFiltroObra"), "Todas as obras")) { mudou = true; }
                    if (encher(document.getElementById("agfObra"), "(sem obra)")) { mudou = true; }
                    return mudou;
                  }
                
                  /* ================= agenda: campo Tipo explicado ================= */
                
                  function dica(depoisDe, texto){
                    if (!depoisDe || !depoisDe.parentNode) { return; }
                    if (depoisDe.parentNode.querySelector(".ag-dica")) { return; }
                    var s = document.createElement("small");
                    s.className = "ag-dica";
                    s.textContent = texto;
                    depoisDe.parentNode.appendChild(s);
                  }
                
                  function rotular(){
                    var sel = document.getElementById("agfTipo");
                    if (sel && !sel.__p45) {
                      sel.__p45 = true;
                      var cx = sel.parentNode ? sel.parentNode.querySelector("label") : null;
                      if (cx) { cx.textContent = "Tipo de compromisso"; }
                      sel.title = "Escolha o que vai acontecer: visita a obra, entrega de " +
                                  "material, medicao, instalacao, reuniao, prazo ou outro.";
                      dica(sel, "O que vai acontecer na obra (visita, entrega de material, " +
                                "medicao, instalacao, reuniao ou prazo). Cada tipo tem uma " +
                                "cor propria no calendario.");
                    }
                    var f = document.getElementById("agFiltroTipo");
                    if (f && !f.__p45) {
                      f.__p45 = true;
                      var lf = f.parentNode ? f.parentNode.querySelector("label") : null;
                      if (lf) { lf.textContent = "Tipo de compromisso"; }
                      f.title = "Filtra a agenda por tipo de compromisso.";
                    }
                  }
                
                  /* ================= agenda: abrir / fechar ================= */
                
                  function fecharAgenda(){
                    var md = document.getElementById("agModal");
                    if (md) { md.classList.remove("ag-aberto"); }
                    document.body.classList.remove("ag-modal-aberto");
                  }
                
                  function vigiarModal(){
                    var md = document.getElementById("agModal");
                    if (!md || md.__p45) { return; }
                    md.__p45 = true;
                
                    function estado(){
                      if (md.classList.contains("ag-aberto")) {
                        document.body.classList.add("ag-modal-aberto");
                        preencherObras();
                        rotular();
                      } else {
                        document.body.classList.remove("ag-modal-aberto");
                      }
                    }
                
                    if (window.MutationObserver) {
                      new MutationObserver(estado).observe(md, {
                        attributes: true, attributeFilter: ["class"]
                      });
                    }
                    estado();
                
                    /* clique na area escura fecha */
                    md.addEventListener("click", function(ev){
                      if (ev.target === md) { fecharAgenda(); }
                    }, true);
                  }
                
                  /* ================= travessa geral de cliques ================= */
                
                  document.addEventListener("click", function(ev){
                    var alvo = ev.target;
                    if (!alvo || !alvo.closest) { return; }
                
                    if (alvo.closest('[data-pcalc="fechar"]')) { fecharCalculadora(); return; }
                    if (alvo.closest('[data-ag="fechar"]')) { fecharAgenda(); return; }
                  }, true);
                
                  document.addEventListener("keydown", function(ev){
                    if (ev.key !== "Escape" && ev.keyCode !== 27) { return; }
                    var md = document.getElementById("agModal");
                    if (md && md.classList.contains("ag-aberto")) { fecharAgenda(); }
                  }, true);
                
                  /* ================= inicio e manutencao ================= */
                
                  function ligarCalculadora(){
                    var janela = document.getElementById("pcalcJanela");
                    if (!janela) { return false; }
                    protegerBarra(janela);
                    criarAlca(janela);
                    return true;
                  }
                
                  function rodada(){
                    ligarCalculadora();
                    vigiarModal();
                    preencherObras();
                    rotular();
                    /* seguranca: cadastro fechado nunca deve travar a pagina */
                    var md = document.getElementById("agModal");
                    if ((!md || !md.classList.contains("ag-aberto")) &&
                        document.body.classList.contains("ag-modal-aberto")) {
                      document.body.classList.remove("ag-modal-aberto");
                    }
                  }
                
                  function iniciar(){
                    rodada();
                    var n = 0;
                    var t = setInterval(function(){
                      n++;
                      rodada();
                      if (n >= 30) { clearInterval(t); }
                    }, 1200);
                
                    window.addEventListener("resize", function(){
                      manterNaTela(document.getElementById("pcalcJanela"));
                    });
                  }
                
                  if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", function(){ setTimeout(iniciar, 260); });
                  } else {
                    setTimeout(iniciar, 260);
                  }
                })();
            
