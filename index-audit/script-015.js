
                /* === PATCH 41: selects de obra do centro de custos === */
                (function(){
                  "use strict";
                
                  function listaObras(){
                    var d = window.db;
                    if (d && Object.prototype.toString.call(d.obras) === "[object Array]") { return d.obras; }
                    if (Object.prototype.toString.call(window.dbObras) === "[object Array]") { return window.dbObras; }
                    return [];
                  }
                
                  function obraAtualId(){
                    var d = window.db;
                    if (d && d.obraAtualId) { return d.obraAtualId; }
                    var l = listaObras();
                    return l.length ? l[0].id : "";
                  }
                
                  function nomeObra(id){
                    var l = listaObras(), i;
                    for (i = 0; i < l.length; i++) {
                      if (l[i] && l[i].id === id) { return l[i].nome || "Obra sem nome"; }
                    }
                    return "";
                  }
                
                  function esc(v){
                    return String(v == null ? "" : v)
                      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
                  }
                
                  function opcoes(obras){
                    var h = "", i, o;
                    for (i = 0; i < obras.length; i++) {
                      o = obras[i];
                      if (!o || !o.id) { continue; }
                      h += '<option value="' + esc(o.id) + '">' + esc(o.nome || "Obra sem nome") + '</option>';
                    }
                    return h;
                  }
                
                  /* preenche filtro de obra, obra do lancamento e filtro de categoria */
                  function popularSelects(){
                    var obras = listaObras();
                
                    var filtro = document.getElementById("custoFilterObra");
                    if (filtro) {
                      var atual = filtro.value;
                      filtro.innerHTML = '<option value="">Todas as Obras</option>' + opcoes(obras);
                      if (atual) { filtro.value = atual; }
                    }
                
                    var destino = document.getElementById("custoInputObra");
                    if (destino) {
                      var escolhida = destino.value;
                      destino.innerHTML = '<option value="">Selecione a obra...</option>' + opcoes(obras);
                      if (escolhida) { destino.value = escolhida; }
                      if (!destino.value) { destino.value = obraAtualId() || ""; }
                    }
                
                    /* filtro de categoria: aproveita a lista ja montada no campo de nova despesa */
                    var fCat = document.getElementById("custoFilterCategoria");
                    var iCat = document.getElementById("custoInputCategoria");
                    if (fCat && iCat && fCat.options.length <= 1 && iCat.options.length > 0) {
                      var atualCat = fCat.value, h = '<option value="">Todas as Categorias</option>', i, t;
                      for (i = 0; i < iCat.options.length; i++) {
                        t = iCat.options[i].value;
                        if (!t) { continue; }
                        h += '<option value="' + esc(t) + '">' + esc(t) + '</option>';
                      }
                      fCat.innerHTML = h;
                      if (atualCat) { fCat.value = atualCat; }
                    }
                  }
                
                  window.p41PopularObrasCusto = popularSelects;
                
                  /* a rotina original de preenchimento estava substituida por um atalho vazio */
                  window.popularCustoObraSelect = function(){ popularSelects(); };
                
                  function desenhar(){
                    if (typeof window.renderCustoDashboard === "function") {
                      try { window.renderCustoDashboard(); } catch (e) { }
                    }
                  }
                
                  /* abrir a aba do Centro de Custos passa a preencher as listas */
                  var initAnterior = window.initCustoTab;
                  window.initCustoTab = function(){
                    if (typeof initAnterior === "function") {
                      try { initAnterior.apply(this, arguments); } catch (e) { }
                    }
                    popularSelects();
                    desenhar();
                  };
                
                  var trocarAnterior = window.trocarAba;
                  window.trocarAba = function(aba){
                    var r;
                    if (typeof trocarAnterior === "function") { r = trocarAnterior.apply(this, arguments); }
                    if (aba === "custo") { popularSelects(); desenhar(); }
                    return r;
                  };
                
                  /* aviso rapido no canto da tela */
                  function aviso(texto){
                    var cx = document.getElementById("p41Aviso");
                    if (!cx) {
                      cx = document.createElement("div");
                      cx.id = "p41Aviso";
                      cx.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:99999;" +
                        "background:#1d6f42;color:#fff;padding:10px 14px;border-radius:8px;" +
                        "font-size:0.85rem;box-shadow:0 4px 14px rgba(0,0,0,.25);max-width:320px;" +
                        "display:none;";
                      document.body.appendChild(cx);
                    }
                    cx.textContent = texto;
                    cx.style.display = "block";
                    if (cx._t) { clearTimeout(cx._t); }
                    cx._t = setTimeout(function(){ cx.style.display = "none"; }, 3500);
                  }
                
                  /* salvar despesa na obra escolhida, sem mexer na obra aberta no painel */
                  var salvarAnterior = window.salvarCusto;
                  window.salvarCusto = function(){
                    var selDestino = document.getElementById("custoInputObra");
                    var selFiltro = document.getElementById("custoFilterObra");
                    var destino = selDestino ? (selDestino.value || "") : "";
                
                    if (selDestino && !destino) {
                      alert("Escolha a obra do lancamento.");
                      selDestino.focus();
                      return;
                    }
                
                    var filtroAntes = selFiltro ? selFiltro.value : null;
                    var obraAtualAntes = obraAtualId();
                    var qtdAntes = 0;
                    (function(){
                      var l = listaObras(), i, cc;
                      for (i = 0; i < l.length; i++) {
                        cc = l[i] && l[i].centrosCusto;
                        if (cc && cc.length) { qtdAntes += cc.length; }
                      }
                    })();
                
                    var r;
                    try {
                      if (selFiltro && destino) { selFiltro.value = destino; }
                      if (typeof salvarAnterior === "function") { r = salvarAnterior.apply(this, arguments); }
                    } finally {
                      if (selFiltro && filtroAntes !== null) { selFiltro.value = filtroAntes; }
                      /* a obra aberta no painel nao pode ser trocada pelo lancamento */
                      if (window.db && obraAtualAntes && window.db.obraAtualId !== obraAtualAntes) {
                        window.db.obraAtualId = obraAtualAntes;
                      }
                    }
                
                    var qtdDepois = 0;
                    (function(){
                      var l = listaObras(), i, cc;
                      for (i = 0; i < l.length; i++) {
                        cc = l[i] && l[i].centrosCusto;
                        if (cc && cc.length) { qtdDepois += cc.length; }
                      }
                    })();
                
                    popularSelects();
                    desenhar();
                
                    if (qtdDepois > qtdAntes) {
                      var nome = nomeObra(destino) || "obra selecionada";
                      if (destino && destino !== obraAtualAntes) {
                        aviso("Despesa lancada em: " + nome + " (a obra aberta no painel nao mudou).");
                      } else {
                        aviso("Despesa lancada em: " + nome + ".");
                      }
                    }
                    return r;
                  };
                
                  /* primeira carga */
                  function inicializar(){
                    popularSelects();
                    var painel = document.getElementById("tab-custo");
                    if (painel && painel.style.display !== "none") { desenhar(); }
                  }
                
                  if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", function(){ setTimeout(inicializar, 60); });
                  } else {
                    setTimeout(inicializar, 60);
                  }
                
                  /* se as obras carregarem depois (nuvem), tenta novamente */
                  setTimeout(popularSelects, 1200);
                  setTimeout(popularSelects, 3000);
                })();
            
