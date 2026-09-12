
                /* PATCH 76: IMPORTAR O PAINEL GERAL DE PRODUCAO PARA O RECEBIMENTO DE MATERIAIS */
                (function () {
                  if (window.P76 && window.P76.__v76) return;
                  var P76 = window.P76 = window.P76 || {};
                  P76.__v76 = true;
                
                  var MARCA_OBS = 'P76 item ';
                  var LISTA_PADRAO = 'PAINEL GERAL';
                  var CLASSE_PADRAO = 'Esquadria';
                
                  /* ------------------------------------------------------------------ */
                  /* AJUDANTES                                                          */
                  /* ------------------------------------------------------------------ */
                  function porId(id) { return document.getElementById(id); }
                
                  function num(v) {
                    var n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
                    return isFinite(n) ? n : 0;
                  }
                
                  function texto(v) { return String(v == null ? '' : v).trim(); }
                
                  function numeroBonito(v, casas) {
                    var n = num(v);
                    try {
                      return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
                    } catch (e) {
                      return n.toFixed(casas);
                    }
                  }
                
                  function hoje() {
                    try { return new Date().toISOString().slice(0, 10); } catch (e) { return ''; }
                  }
                
                  function obraAtual() {
                    try {
                      if (typeof window.getObraAtual === 'function') return window.getObraAtual();
                    } catch (e) { /* ignora */ }
                    try {
                      var b = window.db;
                      if (b && b.obras && b.obras.length) {
                        return b.obras.filter(function (o) { return o && o.id === b.obraAtualId; })[0] || b.obras[0];
                      }
                    } catch (e) { /* ignora */ }
                    return null;
                  }
                
                  function novoId() {
                    return Date.now() + Math.random();
                  }
                
                  /* marca propria: assim o patch reconhece o que ele mesmo trouxe e nao
                     repete o item na proxima importacao */
                  function selo(item) { return '[' + MARCA_OBS + texto(item.id) + ']'; }
                
                  function ehDoPatch(r) {
                    return String(r && r.obs || '').indexOf('[' + MARCA_OBS) >= 0;
                  }
                
                  function seloDe(r) {
                    var m = String(r && r.obs || '').match(/\[P76 item ([^\]]+)\]/);
                    return m ? m[1] : '';
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* LEITURA DE UM ITEM DO PAINEL GERAL                                 */
                  /* ------------------------------------------------------------------ */
                  function medidas(item) {
                    var larg = num(item.larg || item.largura);
                    var alt = num(item.alt || item.altura);
                    var qtd = num(item.qtd || item.quantidade) || 1;
                    return { larg: larg, alt: alt, qtd: qtd, area: qtd * larg * alt };
                  }
                
                  function descricaoDoItem(item) {
                    var m = medidas(item);
                    var partes = [];
                    var tipo = texto(item.tipo || item.descricao || item.nome);
                    partes.push(tipo || 'Item do Painel Geral');
                    if (texto(item.vidro)) partes.push('Vidro: ' + texto(item.vidro));
                    if (m.larg > 0 || m.alt > 0) {
                      partes.push(numeroBonito(m.larg, 3) + ' x ' + numeroBonito(m.alt, 3) + ' m');
                    }
                    return partes.join(' - ');
                  }
                
                  /* observacao com TODO o resto que a aba de itens mostra */
                  function observacaoDoItem(item) {
                    var m = medidas(item);
                    var p = [selo(item)];
                    if (texto(item.ref)) p.push('Ref.: ' + texto(item.ref));
                    if (texto(item.loc)) p.push('Local: ' + texto(item.loc));
                    p.push('Qtd: ' + numeroBonito(m.qtd, 0));
                    if (m.larg > 0) p.push('Larg.: ' + numeroBonito(m.larg, 3) + ' m');
                    if (m.alt > 0) p.push('Alt.: ' + numeroBonito(m.alt, 3) + ' m');
                    p.push('Area total: ' + numeroBonito(m.area, 2) + ' m2');
                    p.push('FEM: ' + numeroBonito(item.fem || 0, 0));
                    p.push('Fabricado: ' + numeroBonito(item.fabricado || 0, 0));
                    p.push('Instalado: ' + numeroBonito(item.instalado || 0, 0));
                    if (texto(item.dataInstalacao)) p.push('Data inst.: ' + texto(item.dataInstalacao));
                    return p.join(' | ');
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* IMPORTACAO                                                         */
                  /* ------------------------------------------------------------------ */
                  function importar(obra) {
                    obra = obra || obraAtual();
                    var resumo = { itens: 0, novos: 0, atualizados: 0 };
                    if (!obra) return resumo;
                
                    if (!Array.isArray(obra.recebimentos)) obra.recebimentos = [];
                    var itens = Array.isArray(obra.itens) ? obra.itens : [];
                    resumo.itens = itens.length;
                    if (!itens.length) return resumo;
                
                    /* mapa do que ja veio do Painel Geral antes */
                    var jaTem = {};
                    obra.recebimentos.forEach(function (r) {
                      var s = seloDe(r);
                      if (s) jaTem[s] = r;
                    });
                
                    itens.forEach(function (item) {
                      if (!item) return;
                      var m = medidas(item);
                      var chave = texto(item.id);
                      var desc = descricaoDoItem(item);
                      var obs = observacaoDoItem(item);
                      var data = texto(item.dataInstalacao) || hoje();
                      var codigo = texto(item.ref) || chave;
                      var antigo = chave && jaTem[chave];
                
                      if (antigo) {
                        /* atualiza so o que vem do Painel Geral; o que o usuario digitou
                           na aba de recebimento (NF, fornecedor, qtd recebida, status,
                           responsavel) fica como esta */
                        antigo.listaCorte = texto(antigo.listaCorte) || LISTA_PADRAO;
                        antigo.classe = texto(antigo.classe) || CLASSE_PADRAO;
                        antigo.codigoCor = codigo;
                        antigo.ref = codigo;
                        antigo.descricao = desc;
                        antigo.material = desc;
                        antigo.qtdPrevista = m.qtd;
                        antigo.local = texto(item.loc) || texto(antigo.local);
                        antigo.obs = obs;
                        if (!texto(antigo.data)) antigo.data = data;
                        resumo.atualizados++;
                        return;
                      }
                
                      obra.recebimentos.push({
                        id: novoId(),
                        data: data,
                        listaCorte: LISTA_PADRAO,
                        nf: '',
                        fornecedor: '',
                        classe: CLASSE_PADRAO,
                        marca: '',
                        codigoCor: codigo,
                        descricao: desc,
                        material: desc,
                        ref: codigo,
                        qtdPrevista: m.qtd,
                        qtdRecebida: 0,
                        unidade: 'UN',
                        status: 'Pendente',
                        responsavel: '',
                        local: texto(item.loc),
                        obs: obs
                      });
                      resumo.novos++;
                    });
                
                    return resumo;
                  }
                
                  function gravarEDesenhar(obra) {
                    try {
                      if (typeof window.salvarDB === 'function') window.salvarDB(false);
                    } catch (e) { /* ignora */ }
                    try {
                      if (typeof window.renderRecebimentos === 'function') window.renderRecebimentos(obra);
                    } catch (e) { /* ignora */ }
                    garantirBotoes();
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* ACAO DO BOTAO                                                      */
                  /* ------------------------------------------------------------------ */
                  P76.importarDoPainel = function () {
                    var obra = obraAtual();
                    if (!obra) {
                      alert('Nenhuma obra selecionada.');
                      return false;
                    }
                    var itens = Array.isArray(obra.itens) ? obra.itens : [];
                    if (!itens.length) {
                      alert('O Painel Geral de Producao desta obra ainda nao tem itens cadastrados.');
                      return false;
                    }
                    var r = importar(obra);
                    gravarEDesenhar(obra);
                    var msg = 'Painel Geral de Producao importado para o Recebimento de Materiais.\n\n'
                      + 'Itens lidos no Painel Geral: ' + r.itens + '\n'
                      + 'Registros novos criados: ' + r.novos + '\n'
                      + 'Registros ja existentes atualizados: ' + r.atualizados + '\n\n'
                      + 'Cada linha traz Referencia, Tipologia, Vidro, Localizacao, Qtd,\n'
                      + 'Largura, Altura, Area, FEM, Fabricado, Instalado e Data de\n'
                      + 'instalacao. A Quantidade Recebida, a NF e o Fornecedor ficam para\n'
                      + 'voce preencher, e nao sao apagados numa proxima importacao.';
                    alert(msg);
                    return true;
                  };
                
                  P76.limparImportados = function (semPerguntar) {
                    var obra = obraAtual();
                    if (!obra || !Array.isArray(obra.recebimentos)) return 0;
                    var alvo = obra.recebimentos.filter(ehDoPatch);
                    if (!alvo.length) {
                      if (!semPerguntar) alert('Nao ha registros vindos do Painel Geral para apagar.');
                      return 0;
                    }
                    if (!semPerguntar) {
                      var ok = confirm('Apagar ' + alvo.length + ' registro(s) que vieram do Painel Geral?\n\n'
                        + 'Os recebimentos que voce digitou ou importou de outra forma NAO serao tocados.');
                      if (!ok) return 0;
                    }
                    obra.recebimentos = obra.recebimentos.filter(function (r) { return !ehDoPatch(r); });
                    gravarEDesenhar(obra);
                    return alvo.length;
                  };
                
                  /* ------------------------------------------------------------------ */
                  /* BOTOES NA ABA RECEBIMENTO DE MATERIAIS                             */
                  /* ------------------------------------------------------------------ */
                  function caixaDeBotoes() {
                    var aba = porId('tab-recebimento');
                    if (!aba) return null;
                    return aba.querySelector('.recebimento-actions');
                  }
                
                  function criarBotao(id, classe, rotulo, titulo, acao) {
                    var b = document.createElement('button');
                    b.id = id;
                    b.type = 'button';
                    b.className = classe;
                    b.setAttribute('data-p76', '1');
                    b.textContent = rotulo;
                    b.title = titulo;
                    b.addEventListener('click', acao);
                    return b;
                  }
                
                  function garantirBotoes() {
                    var caixa = caixaDeBotoes();
                    if (!caixa) return false;
                
                    if (!porId('p76BtnImportar')) {
                      var bi = criarBotao(
                        'p76BtnImportar',
                        'secondary p76-btn',
                        '\uD83D\uDCE5 Importar do Painel Geral',
                        'Traz todos os itens do Painel Geral de Producao para esta lista de recebimento',
                        function () { P76.importarDoPainel(); }
                      );
                      var referencia = caixa.querySelector('button.success') || null;
                      if (referencia) caixa.insertBefore(bi, referencia);
                      else caixa.appendChild(bi);
                    }
                
                    if (!porId('p76BtnLimpar')) {
                      var bl = criarBotao(
                        'p76BtnLimpar',
                        'secondary p76-btn p76-btn-limpar',
                        '\uD83E\uDDF9 Limpar Importados',
                        'Apaga apenas os registros que vieram do Painel Geral de Producao',
                        function () { P76.limparImportados(false); }
                      );
                      var bi2 = porId('p76BtnImportar');
                      if (bi2 && bi2.parentNode === caixa) caixa.insertBefore(bl, bi2.nextSibling);
                      else caixa.appendChild(bl);
                    }
                
                    return true;
                  }
                
                  /* deixa os botoes de pe mesmo quando o painel redesenha a aba */
                  function ligar() {
                    garantirBotoes();
                
                    if (!P76.__envolveu && typeof window.renderRecebimentos === 'function') {
                      var original = window.renderRecebimentos;
                      window.renderRecebimentos = function () {
                        var saida = original.apply(this, arguments);
                        try { garantirBotoes(); } catch (e) { /* ignora */ }
                        return saida;
                      };
                      P76.__envolveu = true;
                    }
                
                    if (!P76.__envolveuAba && typeof window.trocarAba === 'function') {
                      var abaOriginal = window.trocarAba;
                      window.trocarAba = function () {
                        var saida = abaOriginal.apply(this, arguments);
                        try { garantirBotoes(); } catch (e) { /* ignora */ }
                        return saida;
                      };
                      P76.__envolveuAba = true;
                    }
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* COMANDOS DE CONSOLE                                                */
                  /* ------------------------------------------------------------------ */
                  P76.aplicar = function () { ligar(); return true; };
                
                  P76.situacao = function () {
                    var obra = obraAtual();
                    var itens = obra && Array.isArray(obra.itens) ? obra.itens.length : 0;
                    var vindos = obra && Array.isArray(obra.recebimentos) ? obra.recebimentos.filter(ehDoPatch).length : 0;
                    var total = obra && Array.isArray(obra.recebimentos) ? obra.recebimentos.length : 0;
                    return true;
                  };
                
                  P76.ajuda = function () {
                    return true;
                  };
                
                  function esperar(vezes) {
                    if (porId('tab-recebimento') || typeof window.renderRecebimentos === 'function') {
                      ligar();
                      return;
                    }
                    if (vezes <= 0) return;
                    setTimeout(function () { esperar(vezes - 1); }, 300);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function () { esperar(60); });
                  } else {
                    esperar(60);
                  }
                
                  /* os patches antigos re-embrulham funcoes do painel depois de alguns
                     segundos; a nossa camada volta por cima nessas horas */
                  var HORAS = [900, 1500, 2600, 3200, 4800, 6500, 9000];
                  for (var h = 0; h < HORAS.length; h++) {
                    (function (t) {
                      setTimeout(function () { try { ligar(); } catch (e) { /* ignora */ } }, t);
                    }(HORAS[h]));
                  }
                
                })();
            
