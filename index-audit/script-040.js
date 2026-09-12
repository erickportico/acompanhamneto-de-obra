
                /* PATCH 67: SALVAMENTO GARANTIDO DAS CONFIGURACOES E IMAGENS DA VISTA */
                (function () {
                  if (window.P67 && window.P67.__v67) return;
                  var P67 = window.P67 = window.P67 || {};
                  P67.__v67 = true;
                
                  /* ------------------------------------------------------------------ */
                  /* AJUDANTES BASICOS                                                  */
                  /* ------------------------------------------------------------------ */
                  var LSCHAVE = 'p67_vistas_v1';
                  var LSIMG = 'p67img_v1_';
                  var LINHA_BANCO = 67;          /* linha propria na tabela painel_dados */
                  var ESPERA = 1500;             /* espera antes de subir, em ms */
                  var TENTATIVAS = [4000, 12000, 40000];
                  var CAMPOS = [
                    'p66tipo', 'p66folhas', 'p66linhas', 'p66bandeira', 'p66bandPerc',
                    'p66abertura', 'p66img',
                    'p64tipo', 'p64folhas', 'p64linhas', 'p64bandeira', 'p64bandPerc',
                    'p64abertura'
                  ];
                
                  function porId(id) { return document.getElementById(id); }
                
                  function seguro(txt) {
                    return String(txt == null ? '' : txt)
                      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                  }
                
                  function depois(fn, ms) {
                    try { return window.setTimeout(fn, ms || 0); } catch (e) { return 0; }
                  }
                
                  function agora() { return Date.now(); }
                
                  function tamanhoKb(txt) {
                    return Math.max(0, Math.round(String(txt || '').length * 0.75 / 1024));
                  }
                
                  function copia(v) {
                    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
                  }
                
                  function log(txt) {
                    try { console.log('[P67] ' + txt); } catch (e) { /* ignora */ }
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 1 - ONDE ESTAO AS OBRAS E OS ITENS                           */
                  /* ------------------------------------------------------------------ */
                  function listaObras() {
                    var saida = [];
                    var vistos = {};
                    function juntar(lista) {
                      if (!lista || !lista.length) return;
                      for (var i = 0; i < lista.length; i++) {
                        var o = lista[i];
                        if (!o || o.id == null) continue;
                        var k = String(o.id);
                        if (vistos[k]) continue;
                        vistos[k] = 1;
                        saida.push(o);
                      }
                    }
                    try { if (window.db && window.db.obras) juntar(window.db.obras); } catch (e) { /* ignora */ }
                    try {
                      /* eslint-disable no-undef */
                      if (typeof db !== 'undefined' && db && db.obras) juntar(db.obras);
                    } catch (e1) { /* ignora */ }
                    try { if (window.dbObras) juntar(window.dbObras); } catch (e2) { /* ignora */ }
                    try {
                      if (typeof window.getObraAtual === 'function') {
                        var atual = window.getObraAtual();
                        if (atual) juntar([atual]);
                      }
                    } catch (e3) { /* ignora */ }
                    return saida;
                  }
                
                  function chaveDe(obra, item) {
                    return String(obra && obra.id) + '|' + String(item && item.id);
                  }
                
                  function camposDoItem(item) {
                    var saida = {};
                    for (var i = 0; i < CAMPOS.length; i++) {
                      var c = CAMPOS[i];
                      if (item[c] != null && item[c] !== '') saida[c] = item[c];
                    }
                    return saida;
                  }
                
                  function temAlgo(campos) {
                    for (var k in campos) {
                      if (Object.prototype.hasOwnProperty.call(campos, k)) return true;
                    }
                    return false;
                  }
                
                  function assinatura(campos) {
                    var partes = [];
                    for (var i = 0; i < CAMPOS.length; i++) {
                      var c = CAMPOS[i];
                      if (campos[c] != null) partes.push(c + '=' + String(campos[c]).length + ':' + String(campos[c]).slice(0, 40));
                    }
                    return partes.join('|');
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 2 - O REGISTRO NA MEMORIA                                    */
                  /* ------------------------------------------------------------------ */
                  P67.reg = P67.reg || {};       /* chave -> { ts, campos } */
                  var pendentes = {};            /* chaves que ainda nao subiram */
                  var estado = 'parado';         /* parado | salvando | salvo | pendente | semBanco */
                  var ultimoErro = '';
                  var bloqueado = false;         /* evita laco durante a hidratacao */
                
                  function contarItens() {
                    var n = 0;
                    for (var k in P67.reg) {
                      if (Object.prototype.hasOwnProperty.call(P67.reg, k)) n++;
                    }
                    return n;
                  }
                
                  function contarPendentes() {
                    var n = 0;
                    for (var k in pendentes) {
                      if (Object.prototype.hasOwnProperty.call(pendentes, k)) n++;
                    }
                    return n;
                  }
                
                  function pesoTotalKb() {
                    var t = 0;
                    for (var k in P67.reg) {
                      if (!Object.prototype.hasOwnProperty.call(P67.reg, k)) continue;
                      var img = P67.reg[k] && P67.reg[k].campos && P67.reg[k].campos.p66img;
                      if (img) t += tamanhoKb(img);
                    }
                    return t;
                  }
                
                  function comImagem() {
                    var n = 0;
                    for (var k in P67.reg) {
                      if (!Object.prototype.hasOwnProperty.call(P67.reg, k)) continue;
                      if (P67.reg[k] && P67.reg[k].campos && P67.reg[k].campos.p66img) n++;
                    }
                    return n;
                  }
                
                  function maiorImagemKb() {
                    var m = 0;
                    for (var k in P67.reg) {
                      if (!Object.prototype.hasOwnProperty.call(P67.reg, k)) continue;
                      var img = P67.reg[k] && P67.reg[k].campos && P67.reg[k].campos.p66img;
                      if (img) { var t = tamanhoKb(img); if (t > m) m = t; }
                    }
                    return m;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 3 - GUARDA NO APARELHO (localStorage + IndexedDB)            */
                  /* ------------------------------------------------------------------ */
                  function temLS() {
                    try { return !!window.localStorage; } catch (e) { return false; }
                  }
                
                  function temIDB() {
                    try { return !!window.indexedDB; } catch (e) { return false; }
                  }
                
                  function idbAbrir(pronto) {
                    if (!temIDB()) { pronto(null); return; }
                    try {
                      var req = window.indexedDB.open('p67_vistas', 1);
                      req.onupgradeneeded = function () {
                        try {
                          var d = req.result;
                          if (!d.objectStoreNames.contains('img')) d.createObjectStore('img');
                        } catch (e) { /* ignora */ }
                      };
                      req.onsuccess = function () { pronto(req.result); };
                      req.onerror = function () { pronto(null); };
                      req.onblocked = function () { pronto(null); };
                    } catch (e2) { pronto(null); }
                  }
                
                  function idbGravar(chave, valor) {
                    idbAbrir(function (d) {
                      if (!d) return;
                      try {
                        var tx = d.transaction('img', 'readwrite');
                        var st = tx.objectStore('img');
                        if (valor == null) st.delete(chave); else st.put(valor, chave);
                      } catch (e) { /* ignora */ }
                    });
                  }
                
                  function idbLerTudo(pronto) {
                    idbAbrir(function (d) {
                      if (!d) { pronto({}); return; }
                      try {
                        var tx = d.transaction('img', 'readonly');
                        var st = tx.objectStore('img');
                        var saida = {};
                        var cur = st.openCursor();
                        cur.onsuccess = function () {
                          var c = cur.result;
                          if (c) {
                            saida[String(c.key)] = c.value;
                            try { c.continue(); } catch (e) { pronto(saida); }
                          } else { pronto(saida); }
                        };
                        cur.onerror = function () { pronto(saida); };
                      } catch (e2) { pronto({}); }
                    });
                  }
                
                  function gravarLocal() {
                    if (!temLS()) return false;
                    var leve = { rev: agora(), itens: {} };
                    var imagens = {};
                    for (var k in P67.reg) {
                      if (!Object.prototype.hasOwnProperty.call(P67.reg, k)) continue;
                      var r = P67.reg[k];
                      var campos = {};
                      for (var i = 0; i < CAMPOS.length; i++) {
                        var c = CAMPOS[i];
                        if (c === 'p66img') continue;
                        if (r.campos[c] != null) campos[c] = r.campos[c];
                      }
                      leve.itens[k] = { ts: r.ts, campos: campos, img: r.campos.p66img ? 1 : 0 };
                      if (r.campos.p66img) imagens[k] = r.campos.p66img;
                    }
                    var ok = false;
                    try {
                      window.localStorage.setItem(LSCHAVE, JSON.stringify(leve));
                      ok = true;
                    } catch (e) { ultimoErro = 'aparelho sem espaco para a lista de vistas'; }
                
                    /* as imagens vao para o IndexedDB (espaco muito maior). Sem ele,
                       tentamos o localStorage uma chave por item, sem derrubar nada. */
                    if (temIDB()) {
                      for (var k2 in imagens) {
                        if (Object.prototype.hasOwnProperty.call(imagens, k2)) idbGravar(k2, imagens[k2]);
                      }
                    } else {
                      for (var k3 in imagens) {
                        if (!Object.prototype.hasOwnProperty.call(imagens, k3)) continue;
                        try { window.localStorage.setItem(LSIMG + k3, imagens[k3]); } catch (e2) { /* ignora */ }
                      }
                    }
                    return ok;
                  }
                
                  function lerLocal(pronto) {
                    var base = { itens: {} };
                    if (temLS()) {
                      try {
                        var bruto = window.localStorage.getItem(LSCHAVE);
                        if (bruto) {
                          var p = JSON.parse(bruto);
                          if (p && p.itens) base = p;
                        }
                      } catch (e) { /* ignora */ }
                    }
                    function juntarImagens(imagens) {
                      var saida = {};
                      for (var k in base.itens) {
                        if (!Object.prototype.hasOwnProperty.call(base.itens, k)) continue;
                        var r = base.itens[k] || {};
                        var campos = r.campos ? copia(r.campos) : {};
                        var img = imagens[k];
                        if (!img && temLS()) {
                          try { img = window.localStorage.getItem(LSIMG + k) || ''; } catch (e) { img = ''; }
                        }
                        if (img) campos.p66img = img;
                        saida[k] = { ts: Number(r.ts) || 0, campos: campos };
                      }
                      pronto(saida);
                    }
                    if (temIDB()) idbLerTudo(juntarImagens); else juntarImagens({});
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 4 - GUARDA NO BANCO (linha propria em painel_dados)          */
                  /* ------------------------------------------------------------------ */
                  function banco() {
                    try {
                      if (window._supabase && typeof window._supabase.from === 'function') return window._supabase;
                    } catch (e) { /* ignora */ }
                    try {
                      /* eslint-disable no-undef */
                      if (typeof _supabase !== 'undefined' && _supabase && typeof _supabase.from === 'function') return _supabase;
                    } catch (e2) { /* ignora */ }
                    return null;
                  }
                
                  function pacoteBanco() {
                    var itens = {};
                    for (var k in P67.reg) {
                      if (!Object.prototype.hasOwnProperty.call(P67.reg, k)) continue;
                      itens[k] = { ts: P67.reg[k].ts, campos: P67.reg[k].campos };
                    }
                    return { p67: 1, rev: agora(), total: contarItens(), itens: itens };
                  }
                
                  var timerEnvio = 0;
                  var rodadaErro = 0;
                
                  function agendarNuvem(imediato) {
                    if (bloqueado) return;
                    if (!contarPendentes()) return;
                    try { window.clearTimeout(timerEnvio); } catch (e) { /* ignora */ }
                    if (imediato) { enviarNuvem(); return; }
                    estado = 'pendente';
                    pintarCartao();
                    timerEnvio = depois(enviarNuvem, ESPERA);
                  }
                
                  var esperasBanco = 0;
                
                  function enviarNuvem() {
                    var bd = banco();
                    if (!bd) {
                      /* o painel cria a conexao com o banco depois de carregar o CDN;
                         entao esperamos e tentamos de novo, sem perder nada. */
                      estado = 'semBanco';
                      ultimoErro = 'banco online ainda nao respondeu nesta pagina';
                      pintarCartao();
                      if (esperasBanco < 20) {
                        esperasBanco++;
                        try { window.clearTimeout(timerEnvio); } catch (e) { /* ignora */ }
                        timerEnvio = depois(enviarNuvem, esperasBanco < 6 ? 2000 : 15000);
                      }
                      return;
                    }
                    esperasBanco = 0;
                    if (!contarPendentes()) { estado = 'salvo'; pintarCartao(); return; }
                    estado = 'salvando';
                    pintarCartao();
                    var pacote = pacoteBanco();
                    var enviados = {};
                    for (var k in pendentes) {
                      if (Object.prototype.hasOwnProperty.call(pendentes, k)) enviados[k] = 1;
                    }
                    var promessa;
                    try {
                      promessa = bd.from('painel_dados').upsert({
                        id: LINHA_BANCO,
                        dados: pacote,
                        updated_at: new Date()
                      });
                    } catch (e) {
                      falhou(e);
                      return;
                    }
                    try {
                      Promise.resolve(promessa).then(function (resp) {
                        if (resp && resp.error) { falhou(resp.error); return; }
                        for (var k2 in enviados) {
                          if (Object.prototype.hasOwnProperty.call(enviados, k2)) delete pendentes[k2];
                        }
                        rodadaErro = 0;
                        ultimoErro = '';
                        estado = contarPendentes() ? 'pendente' : 'salvo';
                        pintarCartao();
                        log('vistas gravadas no banco: ' + pacote.total + ' item(ns)');
                        if (contarPendentes()) agendarNuvem();
                      }, falhou);
                    } catch (e2) { falhou(e2); }
                  }
                
                  function falhou(erro) {
                    ultimoErro = (erro && (erro.message || erro.details || erro.hint)) || 'falha ao falar com o banco';
                    estado = 'pendente';
                    pintarCartao();
                    log('nao subiu agora (' + ultimoErro + '). Fica guardado no aparelho.');
                    var espera = TENTATIVAS[Math.min(rodadaErro, TENTATIVAS.length - 1)];
                    rodadaErro++;
                    if (rodadaErro <= TENTATIVAS.length) {
                      try { window.clearTimeout(timerEnvio); } catch (e) { /* ignora */ }
                      timerEnvio = depois(enviarNuvem, espera);
                    }
                  }
                
                  function lerNuvem(pronto) {
                    var bd = banco();
                    if (!bd) { pronto(null); return; }
                    var p;
                    try {
                      p = bd.from('painel_dados').select('dados').eq('id', LINHA_BANCO).single();
                    } catch (e) { pronto(null); return; }
                    try {
                      Promise.resolve(p).then(function (resp) {
                        if (!resp || resp.error || !resp.data || !resp.data.dados) { pronto(null); return; }
                        var d = resp.data.dados;
                        pronto(d && d.itens ? d.itens : null);
                      }, function () { pronto(null); });
                    } catch (e2) { pronto(null); }
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 5 - CAPTURA: O QUE MUDOU NOS ITENS                           */
                  /* ------------------------------------------------------------------ */
                  function capturar() {
                    if (bloqueado) return 0;
                    var obras = listaObras();
                    var mudou = 0;
                    for (var i = 0; i < obras.length; i++) {
                      var obra = obras[i];
                      var itens = (obra && obra.itens) || [];
                      for (var j = 0; j < itens.length; j++) {
                        var item = itens[j];
                        if (!item || item.id == null) continue;
                        var chave = chaveDe(obra, item);
                        var campos = camposDoItem(item);
                        var reg = P67.reg[chave];
                        var vazio = !temAlgo(campos);
                        if (!reg) {
                          if (vazio) continue;
                          var ts = Number(item.p67ts) || agora();
                          P67.reg[chave] = { ts: ts, campos: campos };
                          item.p67ts = ts;
                          pendentes[chave] = 1;
                          mudou++;
                          continue;
                        }
                        if (assinatura(reg.campos) === assinatura(campos)) {
                          if (item.p67ts == null) item.p67ts = reg.ts;
                          continue;
                        }
                        var novoTs = agora();
                        if (novoTs <= reg.ts) novoTs = reg.ts + 1;
                        reg.ts = novoTs;
                        reg.campos = campos;
                        item.p67ts = novoTs;
                        pendentes[chave] = 1;
                        mudou++;
                      }
                    }
                    if (mudou) {
                      gravarLocal();
                      log(mudou + ' vista(s) anotada(s) para gravar no banco.');
                    }
                    return mudou;
                  }
                  P67.capturar = capturar;
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 6 - HIDRATACAO: DEVOLVE O QUE O BANCO TEM                    */
                  /* ------------------------------------------------------------------ */
                  function aplicarRegistro(item, reg) {
                    var mudou = false;
                    for (var i = 0; i < CAMPOS.length; i++) {
                      var c = CAMPOS[i];
                      var novo = reg.campos[c];
                      if (novo == null) {
                        if (item[c] != null) {
                          try { delete item[c]; } catch (e) { item[c] = undefined; }
                          mudou = true;
                        }
                      } else if (item[c] !== novo) {
                        item[c] = novo;
                        mudou = true;
                      }
                    }
                    item.p67ts = reg.ts;
                    return mudou;
                  }
                
                  function melhores(a, b) {
                    /* junta dois conjuntos de registros escolhendo o mais recente */
                    var saida = {};
                    var k;
                    for (k in a) {
                      if (Object.prototype.hasOwnProperty.call(a, k)) saida[k] = a[k];
                    }
                    for (k in b) {
                      if (!Object.prototype.hasOwnProperty.call(b, k)) continue;
                      var atual = saida[k];
                      var novo = b[k];
                      if (!atual || (Number(novo.ts) || 0) > (Number(atual.ts) || 0)) saida[k] = novo;
                    }
                    return saida;
                  }
                
                  function normalizar(bruto) {
                    var saida = {};
                    for (var k in bruto) {
                      if (!Object.prototype.hasOwnProperty.call(bruto, k)) continue;
                      var r = bruto[k] || {};
                      var campos = {};
                      var origem = r.campos || {};
                      for (var i = 0; i < CAMPOS.length; i++) {
                        var c = CAMPOS[i];
                        if (origem[c] != null && origem[c] !== '') campos[c] = origem[c];
                      }
                      saida[k] = { ts: Number(r.ts) || 0, campos: campos };
                    }
                    return saida;
                  }
                
                  var jaHidratou = false;
                  var tentosHidratar = 0;
                
                  function hidratar(pronto) {
                    lerLocal(function (local) {
                      lerNuvem(function (nuvem) {
                        var vindos = melhores(normalizar(local), normalizar(nuvem || {}));
                        var reg = melhores(vindos, P67.reg);
                        var obras = listaObras();
                        var aplicados = 0;
                        bloqueado = true;
                        try {
                          for (var i = 0; i < obras.length; i++) {
                            var obra = obras[i];
                            var itens = (obra && obra.itens) || [];
                            for (var j = 0; j < itens.length; j++) {
                              var item = itens[j];
                              if (!item || item.id == null) continue;
                              var chave = chaveDe(obra, item);
                              var r = reg[chave];
                              var doItem = camposDoItem(item);
                              if (!r) {
                                if (temAlgo(doItem)) {
                                  var ts0 = Number(item.p67ts) || agora();
                                  reg[chave] = { ts: ts0, campos: doItem };
                                  item.p67ts = ts0;
                                  pendentes[chave] = 1;
                                }
                                continue;
                              }
                              var tsItem = Number(item.p67ts) || 0;
                              if (r.ts > tsItem) {
                                if (aplicarRegistro(item, r)) aplicados++;
                              } else if (tsItem > r.ts && temAlgo(doItem)) {
                                reg[chave] = { ts: tsItem, campos: doItem };
                                pendentes[chave] = 1;
                              }
                            }
                          }
                          P67.reg = reg;
                        } catch (e) { /* ignora */ } finally { bloqueado = false; }
                
                        gravarLocal();
                        if (aplicados) {
                          log(aplicados + ' vista(s) recuperada(s) do banco/aparelho.');
                          try { if (typeof window.render === 'function') window.render(); } catch (e2) { /* ignora */ }
                          try {
                            if (typeof window.salvarDB === 'function') window.salvarDB(false);
                          } catch (e3) { /* ignora */ }
                        }
                        if (contarPendentes()) agendarNuvem();
                        else { estado = contarItens() ? 'salvo' : 'parado'; pintarCartao(); }
                        /* se o banco online ainda nao existia, tentamos de novo mais tarde */
                        jaHidratou = !!banco();
                        if (!jaHidratou && tentosHidratar < 12) {
                          tentosHidratar++;
                          depois(function () {
                            try { if (!jaHidratou) hidratar(); } catch (e4) { /* ignora */ }
                          }, tentosHidratar < 5 ? 2500 : 20000);
                        }
                        if (typeof pronto === 'function') pronto(aplicados);
                      });
                    });
                  }
                  P67.hidratar = hidratar;
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 7 - REDE DE SEGURANCA DO BACKUP LOCAL                        */
                  /* ------------------------------------------------------------------ */
                  function backupLocalDeuCerto() {
                    if (!temLS()) return false;
                    try {
                      var bruto = window.localStorage.getItem('obrasDB_v8');
                      if (!bruto) return false;
                      var p = JSON.parse(bruto);
                      var lista = (p && p.obras) || (p && p.db && p.db.obras) || [];
                      var obras = listaObras();
                      return lista.length >= obras.length && lista.length > 0;
                    } catch (e) { return false; }
                  }
                
                  function bancoLocalDoPainel() {
                    try { if (window.db && window.db.obras) return window.db; } catch (e) { /* ignora */ }
                    try {
                      /* eslint-disable no-undef */
                      if (typeof db !== 'undefined' && db && db.obras) return db;
                    } catch (e2) { /* ignora */ }
                    return null;
                  }
                
                  function backupEnxuto() {
                    /* Ultimo recurso: guarda o banco local SEM as imagens (que ja estao
                       no IndexedDB e na linha 67 do banco online). Assim o backup local
                       nunca fica em branco por falta de espaco. */
                    if (!temLS()) return false;
                    try {
                      var base = bancoLocalDoPainel();
                      if (!base) {
                        var obras = listaObras();
                        if (!obras.length) return false;
                        base = { obras: obras };
                      }
                      var leve = copia(base);
                      var lista = (leve && leve.obras) || [];
                      var tirados = 0;
                      for (var i = 0; i < lista.length; i++) {
                        var itens = lista[i].itens || [];
                        for (var j = 0; j < itens.length; j++) {
                          var it = itens[j];
                          if (it && typeof it.p66img === 'string' && it.p66img) { delete it.p66img; tirados++; }
                          if (it && typeof it.vistaUrl === 'string' && /^data:image\//.test(it.vistaUrl)) {
                            delete it.vistaUrl;
                            tirados++;
                          }
                        }
                      }
                      leve.p67semImagens = 1;
                      window.localStorage.setItem('obrasDB_v8', JSON.stringify(leve));
                      log('backup local salvo em modo enxuto (' + tirados + ' imagem(ns) fora, guardadas separadamente).');
                      return true;
                    } catch (e) {
                      ultimoErro = 'nao consegui gravar o backup no aparelho';
                      return false;
                    }
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 8 - LIGACAO COM O PAINEL (sem trocar nada do que existe)     */
                  /* ------------------------------------------------------------------ */
                  function ligarSalvamento() {
                    if (P67.__ligado) return;
                    var original = window.salvarDB;
                    if (typeof original !== 'function') return;
                    P67.__ligado = true;
                    P67.__salvarOriginal = original;
                    window.salvarDB = function () {
                      var mudou = 0;
                      try { mudou = capturar(); } catch (e) { /* ignora */ }
                      var saida;
                      try { saida = original.apply(this, arguments); } catch (e2) {
                        log('o salvamento do painel reclamou: ' + (e2 && e2.message));
                        throw e2;
                      }
                      try {
                        if (!backupLocalDeuCerto()) backupEnxuto();
                      } catch (e3) { /* ignora */ }
                      try { if (mudou || contarPendentes()) agendarNuvem(); } catch (e4) { /* ignora */ }
                      return saida;
                    };
                    log('salvamento do painel monitorado.');
                  }
                
                  function ligarCarregamento() {
                    if (P67.__ligadoCarga) return;
                    var original = window.carregarBancoDaNuvem;
                    if (typeof original !== 'function') return;
                    P67.__ligadoCarga = true;
                    window.carregarBancoDaNuvem = function () {
                      var saida = original.apply(this, arguments);
                      try {
                        Promise.resolve(saida).then(function () {
                          depois(function () { try { hidratar(); } catch (e) { /* ignora */ } }, 400);
                        }, function () { /* ignora */ });
                      } catch (e2) { /* ignora */ }
                      return saida;
                    };
                  }
                
                  function ligarSaida() {
                    if (P67.__ligadoSaida) return;
                    P67.__ligadoSaida = true;
                    function correr() {
                      try { capturar(); } catch (e) { /* ignora */ }
                      try { if (contarPendentes()) agendarNuvem(true); } catch (e2) { /* ignora */ }
                    }
                    try {
                      window.addEventListener('online', correr);
                      window.addEventListener('beforeunload', correr);
                      document.addEventListener('visibilitychange', function () {
                        if (document.visibilityState === 'hidden') correr();
                      });
                    } catch (e3) { /* ignora */ }
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 9 - CARTAO DE SITUACAO DENTRO DA PRE-VISUALIZACAO            */
                  /* ------------------------------------------------------------------ */
                  function textoEstado() {
                    if (estado === 'salvando') return ['Salvando no banco...', 'p67-meio'];
                    if (estado === 'salvo') return ['Salvo no banco', 'p67-bom'];
                    if (estado === 'pendente') {
                      return ['Guardado no aparelho, sobe sozinho quando der', 'p67-meio'];
                    }
                    if (estado === 'semBanco') return ['Banco online nao configurado', 'p67-ruim'];
                    return ['Nada novo para salvar', 'p67-neutro'];
                  }
                
                  function corpoCartao() {
                    var st = textoEstado();
                    var pend = contarPendentes();
                    var html = '<div class="p67-topo">' +
                      '<span class="p67-titulo">Salvamento da Vista no banco</span>' +
                      '<span class="p67-selo ' + st[1] + '" id="p67Selo">' + seguro(st[0]) + '</span>' +
                      '</div>' +
                      '<div class="p67-linha">' +
                      '<span>' + contarItens() + ' item(ns) com vista guardada</span>' +
                      '<span>' + comImagem() + ' com imagem propria</span>' +
                      '<span>' + pesoTotalKb() + ' KB de imagens</span>' +
                      (pend ? '<span class="p67-alerta">' + pend + ' esperando o banco</span>' : '') +
                      '</div>';
                    if (maiorImagemKb() > 200) {
                      html += '<div class="p67-nota">Uma das imagens esta pesada (' +
                        maiorImagemKb() + ' KB). Use "Reduzir peso das imagens" para o ' +
                        'salvamento ficar mais rapido.</div>';
                    }
                    if (ultimoErro) {
                      html += '<div class="p67-nota p67-nota-ruim">Ultimo aviso: ' + seguro(ultimoErro) + '</div>';
                    }
                    html += '<div class="p67-bts">' +
                      '<button type="button" class="p67-bt p67-bt-forte" data-p67acao="salvar">Salvar agora</button>' +
                      '<button type="button" class="p67-bt" data-p67acao="conferir">Conferir no banco</button>' +
                      '<button type="button" class="p67-bt" data-p67acao="reduzir">Reduzir peso das imagens</button>' +
                      '<button type="button" class="p67-bt" data-p67acao="copia">Baixar copia de seguranca</button>' +
                      '</div>' +
                      '<div class="p67-recado" id="p67Recado"></div>';
                    return html;
                  }
                
                  function recado(txt, ruim) {
                    var alvo = porId('p67Recado');
                    if (alvo) {
                      alvo.textContent = txt || '';
                      alvo.className = 'p67-recado' + (ruim ? ' p67-recado-ruim' : (txt ? ' p67-recado-bom' : ''));
                    }
                    try {
                      if (txt && typeof window.mostrarToastPainel === 'function') {
                        window.mostrarToastPainel(txt, ruim ? 'erro' : 'ok');
                      }
                    } catch (e) { /* ignora */ }
                  }
                
                  function pintarCartao() {
                    var cartao = porId('p67Cartao');
                    if (!cartao) return;
                    var guardado = '';
                    var rec = porId('p67Recado');
                    if (rec) guardado = rec.textContent || '';
                    cartao.innerHTML = corpoCartao();
                    if (guardado) {
                      var novo = porId('p67Recado');
                      if (novo) novo.textContent = guardado;
                    }
                  }
                  P67.pintarCartao = pintarCartao;
                
                  function conferir() {
                    recado('Perguntando ao banco...');
                    lerNuvem(function (itens) {
                      if (!itens) {
                        recado('O banco nao respondeu agora. Suas vistas seguem guardadas no aparelho e sobem sozinhas.', true);
                        return;
                      }
                      var n = 0, comImg = 0;
                      for (var k in itens) {
                        if (!Object.prototype.hasOwnProperty.call(itens, k)) continue;
                        n++;
                        if (itens[k] && itens[k].campos && itens[k].campos.p66img) comImg++;
                      }
                      var faltando = 0;
                      for (var k2 in P67.reg) {
                        if (!Object.prototype.hasOwnProperty.call(P67.reg, k2)) continue;
                        var lado = itens[k2];
                        if (!lado || (Number(lado.ts) || 0) < P67.reg[k2].ts) faltando++;
                      }
                      if (faltando) {
                        recado('No banco ha ' + n + ' vista(s) (' + comImg + ' com imagem). Faltam ' +
                          faltando + ' subir - vou tentar agora.', true);
                        agendarNuvem(true);
                      } else {
                        recado('Tudo confirmado no banco: ' + n + ' vista(s), ' + comImg + ' com imagem propria.');
                      }
                    });
                  }
                  P67.conferir = conferir;
                
                  function recomprimir(url, pronto) {
                    try {
                      var img = new Image();
                      img.onload = function () {
                        try {
                          var lado = 420;
                          var iw = img.naturalWidth || img.width || 1;
                          var ih = img.naturalHeight || img.height || 1;
                          var esc = Math.min(1, lado / Math.max(iw, ih));
                          var c = document.createElement('canvas');
                          c.width = Math.max(1, Math.round(iw * esc));
                          c.height = Math.max(1, Math.round(ih * esc));
                          var ctx = c.getContext('2d');
                          if (!ctx) { pronto(''); return; }
                          ctx.fillStyle = '#ffffff';
                          ctx.fillRect(0, 0, c.width, c.height);
                          ctx.drawImage(img, 0, 0, c.width, c.height);
                          pronto(c.toDataURL('image/jpeg', 0.62) || '');
                        } catch (e) { pronto(''); }
                      };
                      img.onerror = function () { pronto(''); };
                      img.src = url;
                    } catch (e2) { pronto(''); }
                  }
                
                  function reduzirPeso() {
                    var obras = listaObras();
                    var alvos = [];
                    for (var i = 0; i < obras.length; i++) {
                      var itens = obras[i].itens || [];
                      for (var j = 0; j < itens.length; j++) {
                        var it = itens[j];
                        if (it && typeof it.p66img === 'string' && it.p66img && tamanhoKb(it.p66img) > 90) {
                          alvos.push(it);
                        }
                      }
                    }
                    if (!alvos.length) {
                      recado('As imagens ja estao leves. Nada a reduzir.');
                      return;
                    }
                    var antes = pesoTotalKb();
                    var feitos = 0;
                    recado('Reduzindo ' + alvos.length + ' imagem(ns)...');
                    function passo(k) {
                      if (k >= alvos.length) {
                        try { capturar(); } catch (e) { /* ignora */ }
                        try { if (typeof window.salvarDB === 'function') window.salvarDB(false); } catch (e2) { /* ignora */ }
                        agendarNuvem(true);
                        recado('Pronto: ' + feitos + ' imagem(ns) reduzida(s). De ' + antes +
                          ' KB para ' + pesoTotalKb() + ' KB.');
                        pintarCartao();
                        return;
                      }
                      var item = alvos[k];
                      recomprimir(item.p66img, function (novo) {
                        if (novo && novo.length < String(item.p66img).length) {
                          item.p66img = novo;
                          feitos++;
                        }
                        depois(function () { passo(k + 1); }, 10);
                      });
                    }
                    passo(0);
                  }
                  P67.reduzirPeso = reduzirPeso;
                
                  function baixarCopia() {
                    try {
                      var texto = JSON.stringify(pacoteBanco());
                      var blob = new Blob([texto], { type: 'application/json' });
                      var url = URL.createObjectURL(blob);
                      var a = document.createElement('a');
                      var selo = new Date().toISOString().slice(0, 10);
                      a.href = url;
                      a.download = 'copia_vistas_' + selo + '.json';
                      document.body.appendChild(a);
                      a.click();
                      depois(function () {
                        try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) { /* ignora */ }
                      }, 200);
                      recado('Copia de seguranca das vistas baixada.');
                    } catch (e2) {
                      recado('Nao consegui gerar o arquivo de copia neste navegador.', true);
                    }
                  }
                  P67.baixarCopia = baixarCopia;
                
                  function salvarAgora() {
                    try { capturar(); } catch (e) { /* ignora */ }
                    if (!contarPendentes()) {
                      recado('Tudo que existe aqui ja esta gravado no banco.');
                      return;
                    }
                    recado('Enviando ao banco...');
                    agendarNuvem(true);
                  }
                  P67.salvarAgora = salvarAgora;
                
                  function ligarCartao(cartao) {
                    if (cartao.getAttribute('data-p67pronto')) return;
                    cartao.setAttribute('data-p67pronto', '1');
                    cartao.addEventListener('click', function (ev) {
                      var t = ev.target;
                      var acao = '';
                      while (t && t !== cartao) {
                        acao = t.getAttribute && t.getAttribute('data-p67acao');
                        if (acao) break;
                        t = t.parentNode;
                      }
                      if (!acao) return;
                      ev.preventDefault();
                      ev.stopPropagation();
                      if (acao === 'salvar') salvarAgora();
                      else if (acao === 'conferir') conferir();
                      else if (acao === 'reduzir') reduzirPeso();
                      else if (acao === 'copia') baixarCopia();
                    });
                  }
                
                  function injetarCartao() {
                    var editor = document.querySelector('.p66-editor');
                    var destino = editor;
                    if (!destino) {
                      var modal = porId('modalPreviewEsquadria') || porId('previewEsquadriaModal');
                      if (!modal) return;
                      if (modal.style && modal.style.display === 'none') return;
                      destino = modal.querySelector('.preview-conteudo') || modal;
                    }
                    var velho = porId('p67Cartao');
                    if (velho && velho.parentNode === destino) { pintarCartao(); return; }
                    if (velho && velho.parentNode) {
                      try { velho.parentNode.removeChild(velho); } catch (e) { /* ignora */ }
                    }
                    var cartao = document.createElement('div');
                    cartao.id = 'p67Cartao';
                    cartao.className = 'p67-cartao';
                    cartao.innerHTML = corpoCartao();
                    try { destino.appendChild(cartao); } catch (e2) { return; }
                    ligarCartao(cartao);
                  }
                  P67.injetarCartao = injetarCartao;
                
                  function ligarPreview() {
                    if (P67.__ligadoPreview) return;
                    P67.__ligadoPreview = true;
                    var original = window.abrirPreviewEsquadria;
                    if (typeof original === 'function') {
                      window.abrirPreviewEsquadria = function () {
                        var saida = original.apply(this, arguments);
                        depois(function () { try { injetarCartao(); } catch (e) { /* ignora */ } }, 80);
                        depois(function () { try { injetarCartao(); } catch (e2) { /* ignora */ } }, 400);
                        return saida;
                      };
                    }
                    try {
                      window.setInterval(function () {
                        try {
                          if (document.querySelector('.p66-editor') && !porId('p67Cartao')) injetarCartao();
                        } catch (e) { /* ignora */ }
                      }, 900);
                    } catch (e3) { /* ignora */ }
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* AJUDA                                                              */
                  /* ------------------------------------------------------------------ */
                  P67.ajuda = function () {
                    var linhas = [
                      'PATCH 67 - salvamento garantido das vistas',
                      'As configuracoes e as imagens da coluna Vista passam a ter tres',
                      'guardas: o banco do painel, uma linha propria no banco online e',
                      'uma copia no proprio aparelho (com as imagens no IndexedDB).',
                      'P67.salvarAgora()   forca o envio ao banco',
                      'P67.conferir()      pergunta ao banco o que ja esta gravado',
                      'P67.hidratar()      recupera as vistas do banco para os itens',
                      'P67.reduzirPeso()   recomprime as imagens pesadas',
                      'P67.baixarCopia()   baixa um arquivo de copia das vistas',
                      'P67.situacao()      mostra os numeros atuais'
                    ];
                    try { console.log(linhas.join('\n')); } catch (e) { /* ignora */ }
                    return linhas.length;
                  };
                
                  P67.situacao = function () {
                    var s = {
                      itens: contarItens(),
                      comImagem: comImagem(),
                      pesoKb: pesoTotalKb(),
                      esperandoBanco: contarPendentes(),
                      estado: estado,
                      bancoLigado: !!banco(),
                      ultimoErro: ultimoErro
                    };
                    try { console.log('[P67] ' + JSON.stringify(s)); } catch (e) { /* ignora */ }
                    return s;
                  };
                
                  /* ------------------------------------------------------------------ */
                  /* PARTIDA                                                            */
                  /* ------------------------------------------------------------------ */
                  function iniciar() {
                    ligarSalvamento();
                    ligarCarregamento();
                    ligarSaida();
                    ligarPreview();
                    P67.__pronto = true;
                  }
                
                  function partir() {
                    try { iniciar(); } catch (e) { /* ignora */ }
                    depois(function () { try { iniciar(); } catch (e) { /* ignora */ } }, 1200);
                    depois(function () { try { iniciar(); } catch (e) { /* ignora */ } }, 3000);
                    depois(function () {
                      try { if (!jaHidratou) hidratar(); } catch (e) { /* ignora */ }
                    }, 1800);
                    depois(function () {
                      try { if (!jaHidratou) hidratar(); } catch (e) { /* ignora */ }
                    }, 6000);
                    try {
                      console.log('PATCH 67 ativo: as configuracoes e imagens da Vista agora ' +
                        'sao gravadas no banco com copia de seguranca. Use P67.ajuda().');
                    } catch (e2) { /* ignora */ }
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', partir);
                  } else {
                    partir();
                  }
                }());
            
