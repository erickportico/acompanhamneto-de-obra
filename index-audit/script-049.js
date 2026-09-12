
                /* PATCH 77: divide a aba Centro de Custos em 6 sub-abas.
                   Nao recria nada: apenas move os blocos existentes para dentro das sub-abas,
                   mantendo todos os ids e todas as funcoes atuais funcionando. */
                (function () {
                  "use strict";
                
                  var CHAVE = "custoSubAbaAtiva";
                  var ID_NAV = "custoSubNav";
                
                  var ABAS = [
                    { k: "geral",  t: "\uD83D\uDCC8 Vis\u00E3o Geral" },
                    { k: "lancar", t: "\u2795 Lan\u00E7ar Despesa" },
                    { k: "obra",   t: "\uD83C\uDFD7\uFE0F Por Obra" },
                    { k: "regiao", t: "\uD83D\uDCCD Por Regi\u00E3o" },
                    { k: "colab",  t: "\uD83D\uDC77 Por Colaborador" },
                    { k: "empresa", t: "\uD83C\uDFE2 Por Empresa" },
                    { k: "lista",  t: "\uD83D\uDCCB Despesas" }
                  ];
                
                  function estilo() {
                    if (document.getElementById("custoSubEstilo")) { return; }
                    var s = document.createElement("style");
                    s.id = "custoSubEstilo";
                    s.textContent =
                      "#" + ID_NAV + "{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 14px;" +
                      "padding-bottom:8px;border-bottom:2px solid var(--border,#e2e8f0);}" +
                      ".custo-sub-btn{cursor:pointer;border:1px solid var(--border,#cbd5e1);" +
                      "background:var(--card-bg,#f8fafc);color:var(--text,#1e293b);" +
                      "padding:7px 13px;border-radius:8px;font-size:0.82rem;font-weight:600;" +
                      "line-height:1.2;transition:all .15s;}" +
                      ".custo-sub-btn:hover{border-color:#1e3a5f;}" +
                      ".custo-sub-btn.ativo{background:#1e3a5f;color:#fff;border-color:#1e3a5f;}" +
                      ".custo-sub-painel{animation:custoSubFade .18s ease-in;}" +
                      "@keyframes custoSubFade{from{opacity:.35}to{opacity:1}}" +
                      "body.dark-mode .custo-sub-btn{background:#1e293b;color:#e2e8f0;border-color:#334155;}" +
                      "body.dark-mode .custo-sub-btn.ativo{background:#2563eb;color:#fff;border-color:#2563eb;}";
                    document.head.appendChild(s);
                  }
                
                  /* devolve o filho direto de #tab-custo que contem o elemento informado */
                  function blocoDe(painel, id) {
                    var el = document.getElementById(id);
                    if (!el) { return null; }
                    var n = el;
                    while (n && n.parentNode && n.parentNode !== painel) { n = n.parentNode; }
                    return (n && n.parentNode === painel) ? n : null;
                  }
                
                  function mover(painel, no) {
                    if (no && painel) { painel.appendChild(no); }
                  }
                
                  function montar() {
                    var painel = document.getElementById("tab-custo");
                    if (!painel) { return false; }
                    if (document.getElementById(ID_NAV)) { return true; }
                
                    /* precisa que os blocos originais ja estejam na pagina */
                    if (!document.getElementById("containerCustoTable")) { return false; }
                
                    estilo();
                
                    var blocoFiltros = blocoDe(painel, "custoFilterObra");
                    var blocoForm    = blocoDe(painel, "custoInputObra");
                    var blocoBotoes  = blocoDe(painel, "custoInputData");
                    var blocoGraf    = blocoDe(painel, "custoBarChart");
                    var cResumoObra  = document.getElementById("containerCustoResumoObra");
                    var cRegiao      = document.getElementById("containerCustoPorRegiao");
                    var cColab       = document.getElementById("containerCustoPorColaborador");
                    var cEmpresa     = document.createElement("div");
                    cEmpresa.id = "containerCustoPorEmpresa";
                    var cTabela      = document.getElementById("containerCustoTable");
                    var cTotal       = document.getElementById("containerCustoTotal");
                
                    /* filtros continuam sempre visiveis, logo abaixo do titulo */
                    if (blocoFiltros) { painel.insertBefore(blocoFiltros, painel.firstChild.nextSibling || null); }
                
                    /* barra das sub-abas */
                    var nav = document.createElement("div");
                    nav.id = ID_NAV;
                    painel.appendChild(nav);
                
                    var caixas = {};
                    ABAS.forEach(function (a) {
                      var b = document.createElement("button");
                      b.type = "button";
                      b.className = "custo-sub-btn";
                      b.id = "custoSubBtn-" + a.k;
                      b.textContent = a.t;
                      b.addEventListener("click", function () { abrir(a.k); });
                      nav.appendChild(b);
                
                      var p = document.createElement("div");
                      p.className = "custo-sub-painel";
                      p.id = "custoSubPainel-" + a.k;
                      p.style.display = "none";
                      painel.appendChild(p);
                      caixas[a.k] = p;
                    });
                
                    /* espelho do total geral, para aparecer tambem na Visao Geral */
                    var espelho = document.createElement("div");
                    espelho.id = "custoTotalEspelho";
                    espelho.style.marginBottom = "14px";
                    caixas.geral.appendChild(espelho);
                
                    /* distribui os blocos que ja existiam */
                    mover(caixas.geral,  blocoGraf);
                    mover(caixas.lancar, blocoForm);
                    mover(caixas.lancar, blocoBotoes);
                    mover(caixas.obra,   cResumoObra);
                    mover(caixas.regiao, cRegiao);
                    mover(caixas.colab,  cColab);
                    caixas.empresa.appendChild(cEmpresa);
                    mover(caixas.lista,  cTabela);
                    mover(caixas.lista,  cTotal);
                
                    /* aviso simpatico quando um resumo estiver vazio */
                    [["obra", cResumoObra], ["regiao", cRegiao], ["colab", cColab]].forEach(function (par) {
                      var vazio = document.createElement("div");
                      vazio.className = "custo-sub-vazio";
                      vazio.style.cssText = "padding:16px;font-size:0.85rem;color:var(--text-light,#64748b);";
                      vazio.textContent = "Nenhum dado para os filtros selecionados.";
                      vazio.style.display = "none";
                      caixas[par[0]].appendChild(vazio);
                    });
                
                    sincronizar();
                    envolverRender();
                
                    var salva = null;
                    try { salva = localStorage.getItem(CHAVE); } catch (e) { salva = null; }
                    abrir(salva && caixas[salva] ? salva : "geral");
                    return true;
                  }
                
                  /* consolida os lançamentos por empresa, usando a empresa do lançamento ou do colaborador vinculado */
                  function renderPorEmpresa(custos) {
                    var container = document.getElementById("containerCustoPorEmpresa");
                    if (!container) { return; }
                    custos = Array.isArray(custos) ? custos : [];
                    var empresasColab = {};
                    try {
                      (db.obras || []).forEach(function(o){
                        (o.colaboradores || []).forEach(function(c){
                          if (c && c.nome) { empresasColab[String(c.nome).trim().toLowerCase()] = c.empresa || ""; }
                        });
                        (o.colaboradoresPgto || []).forEach(function(c){
                          if (c && c.nome) { empresasColab[String(c.nome).trim().toLowerCase()] = c.empresa || empresasColab[String(c.nome).trim().toLowerCase()] || ""; }
                        });
                      });
                    } catch(e) {}
                    var mapa = {};
                    var total = 0;
                    custos.forEach(function(c){
                      var nomeColab = String(c.colaborador || "").trim().toLowerCase();
                      var empresa = String(c.empresa || empresasColab[nomeColab] || "SEM EMPRESA").trim().toUpperCase();
                      if (!empresa) { empresa = "SEM EMPRESA"; }
                      if (!mapa[empresa]) { mapa[empresa] = { qtd: 0, valor: 0 }; }
                      mapa[empresa].qtd += 1;
                      mapa[empresa].valor += Number(c.valor) || 0;
                      total += Number(c.valor) || 0;
                    });
                    var ordem = ["PORTICO", "TRAXX", "POLINORDESTE", "POLIMENTAIS"];
                    Object.keys(mapa).forEach(function(k){ if (ordem.indexOf(k) === -1) { ordem.push(k); } });
                    var keys = ordem.filter(function(k){ return mapa[k]; });
                    if (!keys.length) {
                      container.innerHTML = '<div style="padding:16px;color:var(--text-light,#64748b);">Nenhum lançamento de custo para os filtros selecionados.</div>';
                      return;
                    }
                    var maior = keys.reduce(function(a,b){ return mapa[b].valor > mapa[a].valor ? b : a; }, keys[0]);
                    var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:14px;">';
                    h += '<div style="padding:12px;border:1px solid var(--border,#e2e8f0);border-radius:10px;background:var(--card-bg,#fff);"><small>Total lançado</small><strong style="display:block;font-size:1.15rem;margin-top:4px;">' + _fmtBRL(total) + '</strong></div>';
                    h += '<div style="padding:12px;border:1px solid var(--border,#e2e8f0);border-radius:10px;background:var(--card-bg,#fff);"><small>Empresas com lançamento</small><strong style="display:block;font-size:1.15rem;margin-top:4px;">' + keys.length + '</strong></div>';
                    h += '<div style="padding:12px;border:1px solid var(--border,#e2e8f0);border-radius:10px;background:var(--card-bg,#fff);"><small>Maior custo</small><strong style="display:block;font-size:1.05rem;margin-top:4px;">' + escaparHTML(maior) + '</strong></div></div>';
                    h += '<div style="background:var(--card-bg,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:14px;overflow:auto;">';
                    h += '<h4 style="margin:0 0 10px;color:var(--text,#1e293b);">🏢 Custos por Empresa</h4>';
                    h += '<table class="lanc-table"><thead><tr><th>EMPRESA</th><th>Lançamentos</th><th>Valor</th><th>% do Total</th></tr></thead><tbody>';
                    keys.forEach(function(k){
                      var pct = total > 0 ? (mapa[k].valor / total) * 100 : 0;
                      h += '<tr><td><strong>' + escaparHTML(k) + '</strong></td><td>' + mapa[k].qtd + '</td><td>' + _fmtBRL(mapa[k].valor) + '</td><td>' + pct.toFixed(1) + '%</td></tr>';
                    });
                    h += '</tbody><tfoot><tr class="lanc-totals-row"><td><strong>Total</strong></td><td><strong>' + custos.length + '</strong></td><td><strong>' + _fmtBRL(total) + '</strong></td><td><strong>100%</strong></td></tr></tfoot></table></div>';
                    container.innerHTML = h;
                  }
                  /* copia o total para a Visao Geral e mostra/esconde os avisos de vazio */
                  function sincronizar() {
                    var total = document.getElementById("containerCustoTotal");
                    var espelho = document.getElementById("custoTotalEspelho");
                    if (total && espelho) { espelho.innerHTML = total.innerHTML; }
                
                    [["obra", "containerCustoResumoObra"],
                     ["regiao", "containerCustoPorRegiao"],
                     ["colab", "containerCustoPorColaborador"]].forEach(function (par) {
                      var caixa = document.getElementById("custoSubPainel-" + par[0]);
                      var alvo = document.getElementById(par[1]);
                      if (!caixa || !alvo) { return; }
                      var aviso = caixa.querySelector(".custo-sub-vazio");
                      if (!aviso) { return; }
                      var vazio = alvo.innerHTML.replace(/\s|&nbsp;/g, "") === "";
                      aviso.style.display = vazio ? "block" : "none";
                    });
                  }
                
                  function abrir(chave) {
                    ABAS.forEach(function (a) {
                      var p = document.getElementById("custoSubPainel-" + a.k);
                      var b = document.getElementById("custoSubBtn-" + a.k);
                      var on = (a.k === chave);
                      if (p) { p.style.display = on ? "block" : "none"; }
                      if (b) { b.className = on ? "custo-sub-btn ativo" : "custo-sub-btn"; }
                    });
                    try { localStorage.setItem(CHAVE, chave); } catch (e) { /* ignora */ }
                
                    /* redesenha para os graficos aparecerem certos ao voltar para a aba */
                    if (typeof window.renderCustoDashboard === "function") {
                      try { window.renderCustoDashboard(); } catch (e) { /* ignora */ }
                    } else {
                      sincronizar();
                    }
                  }
                  window.abrirSubAbaCusto = abrir;
                
                  /* mantem o espelho do total e os avisos atualizados a cada render */
                  function envolverRender() {
                    if (typeof window.renderCustoDashboard !== "function") { return; }
                    if (window.renderCustoDashboard.__p77) { return; }
                    var original = window.renderCustoDashboard;
                    var nova = function () {
                      var r = original.apply(this, arguments);
                      try { sincronizar(); } catch (e) { /* ignora */ }
                      try { renderPorEmpresa(typeof window.getCustosFiltered === "function" ? window.getCustosFiltered() : []); } catch (e2) { /* ignora */ }
                      return r;
                    };
                    nova.__p77 = true;
                    window.renderCustoDashboard = nova;
                  }
                
                  /* tenta montar assim que possivel e continua tentando enquanto o painel
                     ainda estiver sendo criado por outros scripts */
                  function tentar(voltas) {
                    if (montar()) { return; }
                    if (voltas <= 0) { return; }
                    setTimeout(function () { tentar(voltas - 1); }, 400);
                  }
                
                  if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", function () { tentar(25); });
                  } else {
                    tentar(25);
                  }
                
                  /* se o usuario abrir a aba de custos antes do script terminar, garante o encaixe */
                  (function () {
                    var anterior = window.trocarAba;
                    if (typeof anterior !== "function" || anterior.__p77) { return; }
                    var nova = function (aba) {
                      var r = anterior.apply(this, arguments);
                      if (aba === "custo") {
                        try { montar(); envolverRender(); sincronizar(); } catch (e) { /* ignora */ }
                      }
                      return r;
                    };
                    nova.__p77 = true;
                    window.trocarAba = nova;
                  })();
                })();
            
