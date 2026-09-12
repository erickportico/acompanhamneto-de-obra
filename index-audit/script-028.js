
                /* === PATCH 54: Pagamento de Producao aparece no Centro de Custos === */
                (function(){
                  "use strict";
                
                  var PREFIXO = "p54_prod_";
                  var CATEGORIA = "Produ\u00e7\u00e3o";
                  var AVISO = "Esta linha \u00e9 um espelho do Pagamento de Produ\u00e7\u00e3o.\n\n" +
                              "Para mudar ou apagar este valor, use a aba \"Pagamento de " +
                              "Produ\u00e7\u00e3o\" \u2014 o valor \u00e9 calculado por l\u00e1.";
                
                  function ehVirtual(id){
                    return typeof id === "string" && id.indexOf(PREFIXO) === 0;
                  }
                
                  function obras(){
                    try {
                      if (window.db && Array.isArray(window.db.obras) && window.db.obras.length) {
                        return window.db.obras;
                      }
                    } catch(e){}
                    try {
                      if (Array.isArray(window.dbObras) && window.dbObras.length) return window.dbObras;
                    } catch(e){}
                    try {
                      if (Array.isArray(window.obrasDB) && window.obrasDB.length) return window.obrasDB;
                    } catch(e){}
                    try {
                      if (window.db && Array.isArray(window.db.obras)) return window.db.obras;
                    } catch(e){}
                    return [];
                  }
                
                  function valorEl(id){
                    var el = document.getElementById(id);
                    return el ? (el.value || "") : "";
                  }
                
                  /* tira da memoria qualquer linha automatica (e sobras gravadas por engano) */
                  function limpar(){
                    var achou = false;
                    obras().forEach(function(o){
                      if (!o || !Array.isArray(o.centrosCusto)) return;
                      var antes = o.centrosCusto.length;
                      o.centrosCusto = o.centrosCusto.filter(function(c){
                        return !(c && ehVirtual(c.id));
                      });
                      if (o.centrosCusto.length !== antes) achou = true;
                    });
                    return achou;
                  }
                
                  /* meses a considerar: o do filtro; se vazio, todos os meses com lancamento */
                  function mesesAlvo(){
                    var mes = valorEl("custoFilterMes");
                    if (mes) return [mes];
                    var vistos = {}, lista = [];
                    obras().forEach(function(o){
                      if (!o || !Array.isArray(o.lancamentosProducao)) return;
                      o.lancamentosProducao.forEach(function(l){
                        var k = l && l.mesAnoKey ? String(l.mesAnoKey) : "";
                        if (k && !vistos[k]) { vistos[k] = true; lista.push(k); }
                      });
                    });
                    return lista;
                  }
                
                  function nomeColab(obra, id){
                    var nome = "";
                    try {
                      if (typeof window.getColaboradoresAll === "function") {
                        var achado = window.getColaboradoresAll().filter(function(c){
                          return c && String(c.id) === String(id);
                        })[0];
                        if (achado && achado.nome) nome = achado.nome;
                      }
                    } catch(e){}
                    if (!nome && obra && Array.isArray(obra.colaboradores)) {
                      var loc = obra.colaboradores.filter(function(c){
                        return c && String(c.id) === String(id);
                      })[0];
                      if (loc && loc.nome) nome = loc.nome;
                    }
                    if (!nome && obra && Array.isArray(obra.colaboradoresPgto)) {
                      var loc2 = obra.colaboradoresPgto.filter(function(c){
                        return c && String(c.id) === String(id);
                      })[0];
                      if (loc2 && loc2.nome) nome = loc2.nome;
                    }
                    return String(nome || "").trim();
                  }
                
                  function lancamentosDoMes(obra, mes){
                    if (!obra) return [];
                    return (obra.lancamentosProducao || []).filter(function(l){
                      return l && String(l.mesAnoKey) === String(mes);
                    });
                  }
                
                  /* monta as linhas automaticas: obra + mes + colaborador */
                  function montar(){
                    var meses = mesesAlvo();
                    if (!meses.length) return 0;
                    var criadas = 0;
                
                    obras().forEach(function(obra){
                      if (!obra) return;
                
                      meses.forEach(function(mes){
                        var lancs = lancamentosDoMes(obra, mes);
                        if (!lancs.length) return;
                
                        var porColab = {};
                
                        function acumular(colabId, valor, tipo, dataLanc){
                          var v = Number(valor) || 0;
                          if (!colabId || !(v > 0)) return;
                          var chave = String(colabId);
                          if (!porColab[chave]) {
                            porColab[chave] = { valor: 0, data: "", prof: false, ajud: false };
                          }
                          var reg = porColab[chave];
                          reg.valor += v;
                          if (tipo === "prof") reg.prof = true; else reg.ajud = true;
                          var d = String(dataLanc || "");
                          if (d && d.substring(0, 7) === mes && d > reg.data) reg.data = d;
                        }
                
                        lancs.forEach(function(l){
                          if (!l) return;
                          (l.profissionais || []).forEach(function(pid){
                            acumular(pid, l.valorProf, "prof", l.data);
                          });
                          (l.ajudantes || []).forEach(function(aid){
                            acumular(aid, l.valorAjud, "ajud", l.data);
                          });
                        });
                
                        var ids = Object.keys(porColab);
                        if (!ids.length) return;
                        if (!Array.isArray(obra.centrosCusto)) obra.centrosCusto = [];
                
                        ids.forEach(function(cid){
                          var reg = porColab[cid];
                          var valor = Math.round((Number(reg.valor) || 0) * 100) / 100;
                          if (!(valor > 0)) return;
                          var nome = nomeColab(obra, cid);
                          var funcao = (reg.prof && reg.ajud) ? "Profissional/Ajudante"
                                     : (reg.prof ? "Profissional" : "Ajudante");
                          obra.centrosCusto.push({
                            id: PREFIXO + String(obra.id) + "_" + String(mes) + "_" + String(cid),
                            obraId: obra.id,
                            data: reg.data || (mes + "-01"),
                            categoria: CATEGORIA,
                            descricao: "Pagamento de Produ\u00e7\u00e3o \u2014 " +
                                       (nome || "colaborador") + " (" + funcao + ")",
                            valor: valor,
                            regiao: "Geral",
                            colaborador: nome,
                            p54auto: true
                          });
                          criadas++;
                        });
                      });
                    });
                
                    return criadas;
                  }
                
                  /* roda uma funcao com as linhas de Producao presentes, e limpa no fim */
                  function comProducao(fn, ctx, args){
                    limpar();
                    try { montar(); } catch(e){ console.error("PATCH 54 montar:", e); }
                    try {
                      return fn.apply(ctx, args);
                    } finally {
                      limpar();
                    }
                  }
                
                  /* --- 1) o painel do Centro de Custos passa a somar a Producao --------- */
                  if (typeof window.renderCustoDashboard === "function" && !window.renderCustoDashboard.__p54) {
                    window.renderCustoDashboard = (function(orig){
                      var f = function(){
                        return comProducao(orig, this, arguments);
                      };
                      f.__p54 = true;
                      return f;
                    })(window.renderCustoDashboard);
                  }
                
                  /* --- 2) o Excel sai igual ao que aparece na tela ---------------------- */
                  if (typeof window.exportarCustosXLSX === "function" && !window.exportarCustosXLSX.__p54) {
                    window.exportarCustosXLSX = (function(orig){
                      var f = function(){
                        return comProducao(orig, this, arguments);
                      };
                      f.__p54 = true;
                      return f;
                    })(window.exportarCustosXLSX);
                  }
                
                  /* --- 3) avisar em vez de editar/excluir a linha automatica ------------ */
                  if (typeof window.editarCusto === "function" && !window.editarCusto.__p54) {
                    window.editarCusto = (function(orig){
                      var f = function(id){
                        if (ehVirtual(id)) { alert(AVISO); return; }
                        return orig.apply(this, arguments);
                      };
                      f.__p54 = true;
                      return f;
                    })(window.editarCusto);
                  }
                
                  if (typeof window.excluirCusto === "function" && !window.excluirCusto.__p54) {
                    window.excluirCusto = (function(orig){
                      var f = function(id){
                        if (ehVirtual(id)) { alert(AVISO); return; }
                        return orig.apply(this, arguments);
                      };
                      f.__p54 = true;
                      return f;
                    })(window.excluirCusto);
                  }
                
                  if (typeof window.salvarEdicaoCusto === "function" && !window.salvarEdicaoCusto.__p54) {
                    window.salvarEdicaoCusto = (function(orig){
                      var f = function(){
                        if (ehVirtual(valorEl("custoEditId"))) { alert(AVISO); return; }
                        return orig.apply(this, arguments);
                      };
                      f.__p54 = true;
                      return f;
                    })(window.salvarEdicaoCusto);
                  }
                
                  /* --- 4) primeira carga: limpa sobras e redesenha o painel ------------- */
                  function inicio(){
                    try { limpar(); } catch(e){}
                    try {
                      if (typeof window.renderCustoDashboard === "function") window.renderCustoDashboard();
                    } catch(e){}
                  }
                  setTimeout(inicio, 1500);
                
                })();
            
