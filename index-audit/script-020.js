
                /* === PATCH 46: calculadora e links do bitrix (funcionamento) === */
                (function(){
                  "use strict";
                
                  if (window.__patch46Ativo) { return; }
                  window.__patch46Ativo = true;
                
                  var CHAVE_CALC = "painelCalculadoraCientifica";
                  var CHAVE_BX = "painelLinksBitrix_v1";
                  var CHAVE_TAM_BX = "painelLinksBitrixTamanho_v46";
                
                  var BX_LARG_MIN = 250;
                  var BX_LARG_MAX = 560;
                  var BX_LARG_PADRAO = 360;
                  var BX_ALT_MIN = 28;
                  var BX_ALT_MAX = 78;
                  var BX_ALT_PADRAO = 58;
                
                  /* ================= utilidades ================= */
                
                  function pontos(ev){
                    if (ev.touches && ev.touches[0]) {
                      return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
                    }
                    return { x: ev.clientX || 0, y: ev.clientY || 0 };
                  }
                
                  function entre(v, min, max){
                    if (!isFinite(v)) { return min; }
                    if (v < min) { return min; }
                    if (v > max) { return max; }
                    return Math.round(v);
                  }
                
                  /* grava so a marca de aberto/fechado, sem mexer no resto */
                  function marcarAberto(chave, aberto){
                    try {
                      var bruto = localStorage.getItem(chave);
                      var o = bruto ? JSON.parse(bruto) : {};
                      if (!o || typeof o !== "object") { o = {}; }
                      o.aberto = !!aberto;
                      localStorage.setItem(chave, JSON.stringify(o));
                    } catch (e) {}
                  }
                
                  function manterNaTela(el){
                    if (!el || !el.style || (!el.style.left && !el.style.top)) { return; }
                    var r = el.getBoundingClientRect();
                    if (!r.width) { return; }
                    var maxX = Math.max(0, window.innerWidth - r.width);
                    var maxY = Math.max(0, window.innerHeight - Math.min(r.height, window.innerHeight - 10));
                    el.style.left = Math.min(Math.max(0, r.left), maxX) + "px";
                    el.style.top = Math.min(Math.max(0, r.top), maxY) + "px";
                  }
                
                  /* ligacao de "liga/desliga" para botao redondo que ja tem
                     comportamento proprio: se o clique nao mudou nada na tela,
                     este trecho faz a troca na mao. */
                  function botaoAlterna(botao, estaVisivel, abrir, fechar){
                    if (!botao || botao.__p46) { return; }
                    botao.__p46 = true;
                
                    var pressionado = false, moveu = false, x0 = 0, y0 = 0, antes = false;
                
                    function baixou(ev){
                      var p = pontos(ev);
                      x0 = p.x; y0 = p.y;
                      pressionado = true; moveu = false;
                      antes = estaVisivel();
                    }
                
                    function movendo(ev){
                      if (!pressionado) { return; }
                      var p = pontos(ev);
                      if (Math.abs(p.x - x0) + Math.abs(p.y - y0) > 6) { moveu = true; }
                    }
                
                    function soltou(){ pressionado = false; }
                
                    botao.addEventListener("pointerdown", baixou, true);
                    botao.addEventListener("mousedown", baixou, true);
                    botao.addEventListener("touchstart", baixou, true);
                    document.addEventListener("pointermove", movendo, true);
                    document.addEventListener("mousemove", movendo, true);
                    document.addEventListener("touchmove", movendo, true);
                    document.addEventListener("pointerup", soltou, true);
                    document.addEventListener("mouseup", soltou, true);
                    document.addEventListener("touchend", soltou, true);
                
                    botao.addEventListener("click", function(){
                      if (moveu) { moveu = false; return; }
                      var estadoAntes = antes;
                      window.setTimeout(function(){
                        if (estaVisivel() === estadoAntes) {
                          if (estadoAntes) { fechar(); } else { abrir(); }
                        }
                      }, 60);
                    });
                  }
                
                  /* ================= calculadora ================= */
                
                  function janCalc(){ return document.getElementById("pcalcJanela"); }
                
                  function calcVisivel(){
                    var j = janCalc();
                    return !!j && String(j.className || "").indexOf("pcalc-oculto") < 0;
                  }
                
                  function calcAbrir(){
                    var j = janCalc();
                    if (!j) { return; }
                    if (typeof window.abrirCalculadora === "function") {
                      try { window.abrirCalculadora(); } catch (e) {}
                    }
                    if (!calcVisivel()) {
                      j.className = String(j.className || "").replace(/pcalc-oculto/g, "").replace(/\s+/g, " ").trim();
                    }
                    marcarAberto(CHAVE_CALC, true);
                    manterNaTela(j);
                  }
                
                  function calcFechar(){
                    var j = janCalc();
                    if (!j) { return; }
                    if (typeof window.fecharCalculadora === "function") {
                      try { window.fecharCalculadora(); } catch (e) {}
                    }
                    if (calcVisivel()) { j.className = "pcalc-oculto"; }
                    marcarAberto(CHAVE_CALC, false);
                  }
                
                  /* ================= links do bitrix ================= */
                
                  function janBx(){ return document.getElementById("pbxJanela"); }
                
                  function bxVisivel(){
                    var j = janBx();
                    return !!j && j.classList.contains("pbx-visivel");
                  }
                
                  function bxFecharForm(){
                    var f = document.getElementById("pbxForm");
                    if (f) { f.classList.remove("pbx-visivel"); }
                  }
                
                  function bxAbrir(){
                    if (typeof window.abrirLinksBitrix === "function") {
                      try { window.abrirLinksBitrix(); } catch (e) {}
                    }
                    var j = janBx();
                    if (j && !j.classList.contains("pbx-visivel")) { j.classList.add("pbx-visivel"); }
                    marcarAberto(CHAVE_BX, true);
                    manterNaTela(j);
                  }
                
                  function bxFechar(){
                    var j = janBx();
                    if (j) { j.classList.remove("pbx-visivel"); }
                    bxFecharForm();
                    marcarAberto(CHAVE_BX, false);
                  }
                
                  /* ---- tamanho da janela dos links ---- */
                
                  var bxLarg = BX_LARG_PADRAO;
                  var bxAlt = BX_ALT_PADRAO;
                
                  function bxAplicarTamanho(){
                    bxLarg = entre(bxLarg, BX_LARG_MIN, BX_LARG_MAX);
                    bxAlt = entre(bxAlt, BX_ALT_MIN, BX_ALT_MAX);
                    try {
                      document.documentElement.style.setProperty("--pbx-larg", bxLarg + "px");
                      document.documentElement.style.setProperty("--pbx-alt", bxAlt + "vh");
                    } catch (e) {}
                  }
                
                  function bxLerTamanho(){
                    try {
                      var bruto = localStorage.getItem(CHAVE_TAM_BX);
                      if (!bruto) { return; }
                      var o = JSON.parse(bruto);
                      if (o && typeof o.larg === "number") { bxLarg = o.larg; }
                      if (o && typeof o.alt === "number") { bxAlt = o.alt; }
                    } catch (e) {}
                  }
                
                  function bxSalvarTamanho(){
                    try {
                      localStorage.setItem(CHAVE_TAM_BX, JSON.stringify({ larg: bxLarg, alt: bxAlt }));
                    } catch (e) {}
                  }
                
                  function bxCriarAlca(){
                    var jan = janBx();
                    if (!jan || jan.querySelector(".pbx-alca")) { return; }
                
                    var alca = document.createElement("div");
                    alca.className = "pbx-alca";
                    alca.setAttribute("role", "separator");
                    alca.setAttribute("aria-label", "Aumentar ou diminuir a janela dos links");
                    alca.title = "Arraste para mudar o tamanho (dois cliques volta ao padrao)";
                    jan.appendChild(alca);
                
                    var ativo = false, x0 = 0, y0 = 0, l0 = 0, a0 = 0, idp = null;
                
                    function inicio(ev){
                      if (ev.button !== undefined && ev.button !== 0) { return; }
                      var p = pontos(ev);
                      ativo = true; x0 = p.x; y0 = p.y; l0 = bxLarg; a0 = bxAlt;
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
                      bxLarg = l0 + (p.x - x0);
                      bxAlt = a0 + ((p.y - y0) / Math.max(1, window.innerHeight)) * 100;
                      bxAplicarTamanho();
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
                      bxSalvarTamanho();
                      manterNaTela(janBx());
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
                      bxLarg = BX_LARG_PADRAO;
                      bxAlt = BX_ALT_PADRAO;
                      bxAplicarTamanho();
                      bxSalvarTamanho();
                      manterNaTela(janBx());
                    });
                  }
                
                  /* ================= cliques de fechar (seguranca) ================= */
                
                  document.addEventListener("click", function(ev){
                    var alvo = ev.target;
                    if (!alvo || !alvo.closest) { return; }
                    if (alvo.closest('[data-pcalc="fechar"]')) { calcFechar(); return; }
                    if (alvo.closest('[data-pbx="fechar"]')) { bxFechar(); return; }
                  }, true);
                
                  /* ================= inicio e manutencao ================= */
                
                  function rodada(){
                    bxAplicarTamanho();
                    bxCriarAlca();
                    botaoAlterna(document.getElementById("pcalcBotao"), calcVisivel, calcAbrir, calcFechar);
                    botaoAlterna(document.getElementById("pbxBotao"), bxVisivel, bxAbrir, bxFechar);
                  }
                
                  function iniciar(){
                    bxLerTamanho();
                    rodada();
                    var n = 0;
                    var t = window.setInterval(function(){
                      n++;
                      rodada();
                      if (n >= 30) { window.clearInterval(t); }
                    }, 1200);
                
                    window.addEventListener("resize", function(){
                      manterNaTela(janCalc());
                      manterNaTela(janBx());
                    });
                  }
                
                  if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", function(){ window.setTimeout(iniciar, 320); });
                  } else {
                    window.setTimeout(iniciar, 320);
                  }
                })();
            
