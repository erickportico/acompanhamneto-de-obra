
                /* === PATCH 40: padronizacao de texto digitado === */
                (function(){
                  "use strict";
                
                  /* palavras que ficam minusculas quando nao sao a primeira */
                  var MINUSCULAS = {
                    "e":1, "\u00e9":1, "o":1, "a":1, "as":1, "os":1,
                    "da":1, "do":1, "das":1, "dos":1, "de":1,
                    "na":1, "no":1, "nas":1, "nos":1,
                    "em":1, "com":1, "sem":1, "para":1, "por":1,
                    "ao":1, "aos":1, "\u00e0":1, "\u00e0s":1,
                    "um":1, "uma":1, "ou":1
                  };
                
                  /* siglas que ficam sempre em maiusculas */
                  var SIGLAS = {
                    "EV":1, "EVS":1, "EV'S":1,
                    "PV":1, "PVS":1, "PV'S":1,
                    "CTM":1, "PVC":1, "ACM":1, "MDF":1, "EPI":1,
                    "CNPJ":1, "CPF":1, "RG":1, "NF":1, "ID":1, "PIX":1,
                    "LED":1, "ART":1, "OS":1
                  };
                
                  function ehSigla(p){
                    return !!SIGLAS[p.toUpperCase()];
                  }
                
                  function ajustarPalavra(p, primeira){
                    if (!p) { return p; }
                    if (ehSigla(p)) { return p.toUpperCase(); }
                    /* palavras com numero ficam como foram digitadas (P2, 12x30, 3M) */
                    if (/[0-9]/.test(p)) { return p; }
                    var low = p.toLowerCase();
                    if (!primeira && MINUSCULAS[low]) { return low; }
                    return low.charAt(0).toUpperCase() + low.slice(1);
                  }
                
                  function ajustarLinha(linha){
                    var s = linha.replace(/[ \t]+/g, " ").trim();
                    if (!s) { return ""; }
                    var tokens = s.split(" ");
                    for (var i = 0; i < tokens.length; i++) {
                      var partes = tokens[i].split(/([\-\/])/);
                      for (var j = 0; j < partes.length; j++) {
                        if (partes[j] === "-" || partes[j] === "/") { continue; }
                        partes[j] = ajustarPalavra(partes[j], (i === 0 && j === 0));
                      }
                      tokens[i] = partes.join("");
                    }
                    return tokens.join(" ");
                  }
                
                  /* formata preservando quebras de linha (observacoes, descricoes longas) */
                  function formatarTextoPainel(txt){
                    if (txt === null || txt === undefined) { return txt; }
                    var s = String(txt);
                    if (!s.trim()) { return ""; }
                    return s.split("\n").map(ajustarLinha).join("\n");
                  }
                
                  window.formatarTextoPainel = formatarTextoPainel;
                
                  /* campos que NAO devem ser formatados */
                  var IGNORAR = /valor|preco|pre\u00e7o|qtd|quant|m2|metro|medida|larg|altu|comp|data|hora|dia|email|mail|senha|pass|user|cnpj|cpf|rg|cep|tel|fone|whats|url|link|site|codigo|c\u00f3digo|cod-|percent|perc|taxa|total|peso|numero|n\u00famero|num|busca|search|filtro|pesquis/i;
                
                  function deveFormatar(el){
                    if (!el || !el.tagName) { return false; }
                    var tag = el.tagName.toLowerCase();
                    if (tag !== "input" && tag !== "textarea") { return false; }
                    if (tag === "input") {
                      var t = (el.getAttribute("type") || "text").toLowerCase();
                      if (t !== "text") { return false; }
                    }
                    if (el.readOnly || el.disabled) { return false; }
                    /* FPDO, Diario de Obra e Boletim de Inspecao preservam o texto digitado. */
                    if (el.closest && el.closest('#p92Fundo, #p84Fundo, #p83Fundo')) { return false; }
                    if (el.hasAttribute("data-sem-maiuscula")) { return false; }
                    var chave = (el.id || "") + " " + (el.name || "") + " " +
                                (el.className || "") + " " + (el.placeholder || "");
                    if (IGNORAR.test(chave)) { return false; }
                    return true;
                  }
                
                  /* fase de captura: corrige o campo ANTES de o painel salvar o valor */
                  document.addEventListener("change", function(ev){
                    var el = ev.target;
                    if (!deveFormatar(el)) { return; }
                    var novo = formatarTextoPainel(el.value);
                    if (novo !== el.value) { el.value = novo; }
                  }, true);
                
                  /* seguranca extra: corrige tambem ao sair do campo sem disparar change */
                  document.addEventListener("blur", function(ev){
                    var el = ev.target;
                    if (!deveFormatar(el)) { return; }
                    var novo = formatarTextoPainel(el.value);
                    if (novo !== el.value) { el.value = novo; }
                  }, true);
                })();
            
