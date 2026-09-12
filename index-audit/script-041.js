
                /* PATCH 68: COMPRESSAO AUTOMATICA DAS IMAGENS DA VISTA */
                (function () {
                  if (window.P68 && window.P68.__v68) return;
                  var P68 = window.P68 = window.P68 || {};
                  P68.__v68 = true;
                
                  /* ------------------------------------------------------------------ */
                  /* AJUDANTES BASICOS                                                  */
                  /* ------------------------------------------------------------------ */
                  var LSREG = 'p68_regras_v1';
                
                  var MODOS = {
                    economia: { nome: 'Maxima economia', lado: 380, q: 0.55, tetoKb: 45, minLado: 200, minQ: 0.38 },
                    equilibrado: { nome: 'Equilibrado', lado: 520, q: 0.68, tetoKb: 90, minLado: 260, minQ: 0.45 },
                    nitidez: { nome: 'Mais nitidez', lado: 760, q: 0.82, tetoKb: 190, minLado: 420, minQ: 0.6 }
                  };
                  var MODO_PADRAO = 'equilibrado';
                
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
                
                  function ehImagem(url) {
                    return typeof url === 'string' && /^data:image\//.test(url);
                  }
                
                  /* peso aproximado de uma imagem guardada em texto (base64) */
                  function kb(txt) {
                    var n = String(txt || '').length;
                    if (!n) return 0;
                    return Math.max(1, Math.round(n * 0.75 / 1024));
                  }
                
                  function bonito(n) {
                    n = Number(n) || 0;
                    if (n >= 1024) return (Math.round(n / 102.4) / 10) + ' MB';
                    return n + ' KB';
                  }
                
                  function log(txt) {
                    try { console.log('[P68] ' + txt); } catch (e) { /* ignora */ }
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 1 - REGRAS AJUSTAVEIS                                        */
                  /* ------------------------------------------------------------------ */
                  var regras = {
                    modo: MODO_PADRAO,
                    auto: true,          /* comprimir na hora em que a imagem e anexada */
                    antigas: true        /* cuidar sozinho das imagens antigas pesadas  */
                  };
                
                  function lerRegras() {
                    try {
                      var txt = window.localStorage.getItem(LSREG);
                      if (!txt) return;
                      var o = JSON.parse(txt);
                      if (!o) return;
                      if (o.modo && MODOS[o.modo]) regras.modo = o.modo;
                      if (typeof o.auto === 'boolean') regras.auto = o.auto;
                      if (typeof o.antigas === 'boolean') regras.antigas = o.antigas;
                      if (Number(o.lado) > 0) regras.lado = Math.min(2000, Math.round(Number(o.lado)));
                      if (Number(o.q) > 0) regras.q = Math.min(0.95, Math.max(0.3, Number(o.q)));
                      if (Number(o.tetoKb) > 0) regras.tetoKb = Math.min(4000, Math.round(Number(o.tetoKb)));
                    } catch (e) { /* ignora */ }
                  }
                
                  function gravarRegras() {
                    try { window.localStorage.setItem(LSREG, JSON.stringify(regras)); } catch (e) { /* ignora */ }
                  }
                
                  /* junta o modo escolhido com os ajustes finos, se houver */
                  function alvo() {
                    var base = MODOS[regras.modo] || MODOS[MODO_PADRAO];
                    var a = {
                      nome: base.nome,
                      lado: base.lado,
                      q: base.q,
                      tetoKb: base.tetoKb,
                      minLado: base.minLado,
                      minQ: base.minQ
                    };
                    if (Number(regras.lado) > 0) a.lado = Number(regras.lado);
                    if (Number(regras.q) > 0) a.q = Number(regras.q);
                    if (Number(regras.tetoKb) > 0) a.tetoKb = Number(regras.tetoKb);
                    if (a.minLado > a.lado) a.minLado = Math.max(120, Math.round(a.lado * 0.6));
                    if (a.minQ > a.q) a.minQ = Math.max(0.3, a.q - 0.1);
                    return a;
                  }
                  P68.alvo = alvo;
                
                  P68.definirRegras = function (novo) {
                    if (typeof novo === 'string') novo = { modo: novo };
                    novo = novo || {};
                    if (novo.modo && MODOS[novo.modo]) {
                      regras.modo = novo.modo;
                      delete regras.lado;
                      delete regras.q;
                      delete regras.tetoKb;
                    }
                    if (typeof novo.auto === 'boolean') regras.auto = novo.auto;
                    if (typeof novo.antigas === 'boolean') regras.antigas = novo.antigas;
                    if (Number(novo.lado) > 0) regras.lado = Math.min(2000, Math.round(Number(novo.lado)));
                    if (Number(novo.q) > 0) regras.q = Math.min(0.95, Math.max(0.3, Number(novo.q)));
                    if (Number(novo.tetoKb) > 0) regras.tetoKb = Math.min(4000, Math.round(Number(novo.tetoKb)));
                    gravarRegras();
                    pintarCartao();
                    return alvo();
                  };
                
                  P68.padrao = function () {
                    regras = { modo: MODO_PADRAO, auto: true, antigas: true };
                    gravarRegras();
                    pintarCartao();
                    recado('Voltei para o modo Equilibrado, o padrao de fabrica.');
                    return alvo();
                  };
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 2 - A COMPRESSAO EM SI                                       */
                  /* ------------------------------------------------------------------ */
                  var ultimo = null;      /* ultimo resultado, para mostrar no cartao */
                  var jaVistas = {};      /* imagens que ja passaram pela compressao  */
                
                  function selo(url) {
                    var s = String(url || '');
                    return s.length + ':' + s.slice(30, 70);
                  }
                
                  function marcarVista(url) {
                    if (!url) return;
                    jaVistas[selo(url)] = 1;
                  }
                
                  function foiVista(url) {
                    return !!jaVistas[selo(url)];
                  }
                
                  /* desenha a imagem num canvas do tamanho pedido e devolve o texto */
                  function render(img, lado, q) {
                    try {
                      var iw = img.naturalWidth || img.width || 1;
                      var ih = img.naturalHeight || img.height || 1;
                      var esc = Math.min(1, lado / Math.max(iw, ih));
                      var c = document.createElement('canvas');
                      c.width = Math.max(1, Math.round(iw * esc));
                      c.height = Math.max(1, Math.round(ih * esc));
                      var cx = c.getContext('2d');
                      if (!cx) return '';
                      cx.fillStyle = '#ffffff';
                      cx.fillRect(0, 0, c.width, c.height);
                      try {
                        if (cx.imageSmoothingQuality) cx.imageSmoothingQuality = 'high';
                        cx.imageSmoothingEnabled = true;
                      } catch (e0) { /* ignora */ }
                      cx.drawImage(img, 0, 0, c.width, c.height);
                      var saida = '';
                      try { saida = c.toDataURL('image/jpeg', q); } catch (e1) {
                        try { saida = c.toDataURL(); } catch (e2) { saida = ''; }
                      }
                      return { url: saida || '', largura: c.width, altura: c.height };
                    } catch (e3) { return ''; }
                  }
                
                  /* comprime um texto de imagem obedecendo as regras; devolve um relato */
                  function comprimir(origem, pronto) {
                    var a = alvo();
                    var antesKb = kb(origem);
                    function terminar(saida) {
                      try { pronto(saida); } catch (e) { /* ignora */ }
                    }
                    if (!ehImagem(origem)) { terminar(null); return; }
                    var img = new Image();
                    img.onload = function () {
                      var lado = a.lado, q = a.q, passos = 0, res = render(img, lado, q);
                      while (res && res.url && kb(res.url) > a.tetoKb && passos < 6 &&
                             (lado > a.minLado || q > a.minQ)) {
                        lado = Math.max(a.minLado, Math.round(lado * 0.8));
                        q = Math.max(a.minQ, Math.round((q - 0.07) * 100) / 100);
                        res = render(img, lado, q);
                        passos++;
                      }
                      if (!res || !res.url) { terminar(null); return; }
                      var depoisKb = kb(res.url);
                      terminar({
                        url: res.url,
                        antesKb: antesKb,
                        depoisKb: depoisKb,
                        largura: res.largura,
                        altura: res.altura,
                        passos: passos,
                        lado: lado,
                        q: q,
                        ganhou: res.url.length < String(origem).length
                      });
                    };
                    img.onerror = function () { terminar(null); };
                    try { img.src = origem; } catch (e) { terminar(null); }
                  }
                  P68.comprimir = comprimir;
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 3 - ONDE ESTAO OS ITENS                                      */
                  /* ------------------------------------------------------------------ */
                  function listaObras() {
                    var saida = [], vistos = {};
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
                      if (typeof window.getObraAtual === 'function') {
                        var atual = window.getObraAtual();
                        if (atual) juntar([atual]);
                      }
                    } catch (e2) { /* ignora */ }
                    return saida;
                  }
                
                  function todosItens() {
                    var obras = listaObras(), saida = [];
                    for (var i = 0; i < obras.length; i++) {
                      var itens = obras[i].itens || [];
                      for (var j = 0; j < itens.length; j++) {
                        if (itens[j]) saida.push(itens[j]);
                      }
                    }
                    return saida;
                  }
                
                  function itemPorId(id) {
                    var itens = todosItens();
                    for (var i = 0; i < itens.length; i++) {
                      if (String(itens[i].id) === String(id)) return itens[i];
                    }
                    return null;
                  }
                
                  function comImagem() {
                    var itens = todosItens(), n = 0;
                    for (var i = 0; i < itens.length; i++) {
                      if (ehImagem(itens[i].p66img)) n++;
                    }
                    return n;
                  }
                
                  function pesoTotalKb() {
                    var itens = todosItens(), t = 0;
                    for (var i = 0; i < itens.length; i++) {
                      if (ehImagem(itens[i].p66img)) t += kb(itens[i].p66img);
                    }
                    return t;
                  }
                
                  function pesadas() {
                    var a = alvo(), itens = todosItens(), saida = [];
                    for (var i = 0; i < itens.length; i++) {
                      var it = itens[i];
                      if (!ehImagem(it.p66img)) continue;
                      if (kb(it.p66img) <= a.tetoKb) continue;
                      if (foiVista(it.p66img)) continue;
                      saida.push(it);
                    }
                    return saida;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 4 - GRAVACAO DA IMAGEM JA LEVE                               */
                  /* ------------------------------------------------------------------ */
                  var dentro = false;     /* evita que a nossa propria gravacao volte aqui */
                
                  function guardar(item, url) {
                    if (!item || !url) return false;
                    var antigo = item.p66img;
                    dentro = true;
                    try {
                      if (typeof window.editarItem === 'function' && item.id != null) {
                        window.editarItem(item.id, 'p66img', url);
                      }
                    } catch (e) { /* ignora */ }
                    dentro = false;
                    if (item.p66img !== url) {
                      try { item.p66img = url; } catch (e2) { /* ignora */ }
                    }
                    marcarVista(url);
                    try {
                      if (window.P66 && window.P66.cache) {
                        if (antigo) delete window.P66.cache[antigo];
                        delete window.P66.cache[url];
                      }
                    } catch (e3) { /* ignora */ }
                    return item.p66img === url;
                  }
                
                  function salvarPainel() {
                    try { if (typeof window.salvarDB === 'function') window.salvarDB(false); } catch (e) { /* ignora */ }
                  }
                
                  /* avisa o Patch 67 para regravar a vista no banco e no aparelho */
                  function avisarP67() {
                    var p = window.P67;
                    if (!p) { salvarPainel(); return; }
                    try { if (typeof p.capturar === 'function') p.capturar(); } catch (e) { /* ignora */ }
                    salvarPainel();
                    try { if (typeof p.salvarAgora === 'function') p.salvarAgora(); } catch (e2) { /* ignora */ }
                  }
                
                  function redesenhar(item, url) {
                    try { if (typeof window.render === 'function') window.render(); } catch (e) { /* ignora */ }
                    try {
                      var mini = document.querySelector('.p66-mini img');
                      if (mini && url) mini.src = url;
                    } catch (e2) { /* ignora */ }
                    try {
                      if (window.P66 && typeof window.P66.pintar === 'function') window.P66.pintar();
                    } catch (e3) { /* ignora */ }
                    if (item) { /* nada mais a fazer */ }
                  }
                
                  function anotar(res, origem) {
                    if (!res) return;
                    ultimo = {
                      antesKb: res.antesKb,
                      depoisKb: res.depoisKb,
                      largura: res.largura,
                      altura: res.altura,
                      origem: origem || 'anexo',
                      quando: agora()
                    };
                  }
                
                  function frase(res) {
                    if (!res) return '';
                    var corte = res.antesKb > 0 ? Math.max(0, Math.round((1 - res.depoisKb / res.antesKb) * 100)) : 0;
                    return bonito(res.antesKb) + ' -> ' + bonito(res.depoisKb) +
                      (corte > 0 ? ' (' + corte + '% mais leve)' : ' (ja estava leve)') +
                      (res.largura ? ', ' + res.largura + 'x' + res.altura + ' px' : '');
                  }
                
                  /* aplica o resultado no item e cuida de tudo em volta */
                  function aplicar(item, res, origem, quieto) {
                    if (!item || !res || !res.url) return false;
                    if (!res.ganhou && kb(item.p66img) <= alvo().tetoKb) {
                      marcarVista(item.p66img);
                      return false;
                    }
                    if (String(res.url).length >= String(item.p66img || '').length && item.p66img) {
                      marcarVista(item.p66img);
                      return false;
                    }
                    if (!guardar(item, res.url)) return false;
                    anotar(res, origem);
                    avisarP67();
                    redesenhar(item, res.url);
                    if (!quieto) {
                      recado('Imagem da Vista comprimida: ' + frase(res));
                      avisoP66('Imagem guardada e comprimida: ' + frase(res));
                    }
                    pintarCartao();
                    return true;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 5 - PEGANDO O ARQUIVO ORIGINAL (MELHOR QUALIDADE)            */
                  /* ------------------------------------------------------------------ */
                  var bruto = null;       /* { url, antesKb, ts, ... } vindo do arquivo  */
                  var lendoBruto = 0;     /* quantas leituras estao em andamento         */
                
                  function pegarArquivo(arq) {
                    if (!arq || !/^image\//.test(arq.type || '')) return;
                    if (!regras.auto) return;
                    var pesoOriginal = Math.max(1, Math.round((Number(arq.size) || 0) / 1024));
                    lendoBruto++;
                    var pronto = false;
                    function acabar() {
                      if (pronto) return;
                      pronto = true;
                      lendoBruto = Math.max(0, lendoBruto - 1);
                    }
                    try {
                      var fr = new FileReader();
                      fr.onload = function () {
                        comprimir(String(fr.result || ''), function (res) {
                          if (res && res.url) {
                            if (pesoOriginal > 0) res.antesKb = pesoOriginal;
                            res.ganhou = true;
                            bruto = { res: res, ts: agora() };
                            recado('Reduzindo a imagem: ' + frase(res));
                          }
                          acabar();
                        });
                      };
                      fr.onerror = function () { acabar(); };
                      fr.readAsDataURL(arq);
                    } catch (e) { acabar(); }
                  }
                
                  function pegarDoEvento(ev) {
                    try {
                      var t = ev && ev.target;
                      var arq = null;
                      if (t && t.files && t.files.length) arq = t.files[0];
                      if (!arq && ev && ev.dataTransfer && ev.dataTransfer.files &&
                          ev.dataTransfer.files.length) arq = ev.dataTransfer.files[0];
                      if (!arq && ev && ev.clipboardData && ev.clipboardData.items) {
                        var its = ev.clipboardData.items;
                        for (var i = 0; i < its.length; i++) {
                          if (its[i] && its[i].kind === 'file') {
                            var f = its[i].getAsFile();
                            if (f && /^image\//.test(f.type || '')) { arq = f; break; }
                          }
                        }
                      }
                      if (arq) pegarArquivo(arq);
                    } catch (e) { /* ignora */ }
                  }
                
                  function ligarEscuta() {
                    if (P68.__escuta) return;
                    P68.__escuta = true;
                    try {
                      document.addEventListener('change', pegarDoEvento, true);
                      document.addEventListener('drop', pegarDoEvento, true);
                      document.addEventListener('paste', pegarDoEvento, true);
                    } catch (e) { /* ignora */ }
                  }
                
                  function brutoUtil(valor) {
                    if (!bruto || !bruto.res || !bruto.res.url) return null;
                    if (agora() - bruto.ts > 30000) { bruto = null; return null; }
                    var r = bruto.res;
                    if (valor && String(r.url).length >= String(valor).length) return null;
                    return r;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 6 - ENTRANDO NA HORA EM QUE A IMAGEM E GRAVADA               */
                  /* ------------------------------------------------------------------ */
                  function cuidarDoValor(id, valor) {
                    var espera = 0;
                    function tentar() {
                      var item = itemPorId(id);
                      if (!item || item.p66img !== valor) return;    /* mudou no meio do caminho */
                      var r = brutoUtil(valor);
                      if (r) {
                        bruto = null;
                        aplicar(item, r, 'anexo');
                        return;
                      }
                      if (lendoBruto > 0 && espera < 4000) {
                        espera += 250;
                        depois(tentar, 250);
                        return;
                      }
                      if (kb(valor) <= alvo().tetoKb) { marcarVista(valor); return; }
                      comprimir(valor, function (res) {
                        var vivo = itemPorId(id);
                        if (!vivo || vivo.p66img !== valor) return;
                        if (res) aplicar(vivo, res, 'anexo');
                        else marcarVista(valor);
                      });
                    }
                    depois(tentar, 60);
                  }
                
                  function ligarGravacao() {
                    if (P68.__ligado) return;
                    var original = window.editarItem;
                    if (typeof original !== 'function') return;
                    P68.__ligado = true;
                    P68.__editarOriginal = original;
                    window.editarItem = function (id, campo, valor) {
                      if (dentro || campo !== 'p66img' || !regras.auto || !ehImagem(valor)) {
                        return original.apply(this, arguments);
                      }
                      var r = brutoUtil(valor);
                      if (r) {
                        bruto = null;
                        var saida = original.call(this, id, campo, r.url);
                        marcarVista(r.url);
                        anotar(r, 'anexo');
                        depois(function () {
                          var item = itemPorId(id);
                          avisarP67();
                          redesenhar(item, r.url);
                          recado('Imagem comprimida ao anexar: ' + frase(r));
                          avisoP66('Imagem guardada e comprimida: ' + frase(r));
                          pintarCartao();
                        }, 10);
                        return saida;
                      }
                      var res0 = original.apply(this, arguments);
                      cuidarDoValor(id, valor);
                      return res0;
                    };
                  }
                
                  /* tambem cobre quem chamar P66.definirImagem direto (console, outros) */
                  function ligarDefinir() {
                    if (P68.__ligadoDefinir) return;
                    var p66 = window.P66;
                    if (!p66 || typeof p66.definirImagem !== 'function') return;
                    P68.__ligadoDefinir = true;
                    var original = p66.definirImagem;
                    P68.__definirOriginal = original;
                    p66.definirImagem = function (item, url) {
                      if (dentro || !regras.auto || !ehImagem(url)) {
                        return original.apply(this, arguments);
                      }
                      var r = brutoUtil(url);
                      if (r) {
                        bruto = null;
                        marcarVista(r.url);
                        anotar(r, 'anexo');
                        var saida = original.call(this, item, r.url);
                        depois(function () {
                          avisarP67();
                          recado('Imagem comprimida ao anexar: ' + frase(r));
                          pintarCartao();
                        }, 10);
                        return saida;
                      }
                      if (kb(url) <= alvo().tetoKb) {
                        marcarVista(url);
                        return original.apply(this, arguments);
                      }
                      var esse = this;
                      var args = arguments;
                      comprimir(url, function (res) {
                        if (res && res.url) {
                          marcarVista(res.url);
                          anotar(res, 'anexo');
                          dentro = true;
                          try { original.call(esse, item, res.url); } catch (e) { /* ignora */ }
                          dentro = false;
                          depois(function () {
                            avisarP67();
                            recado('Imagem comprimida ao anexar: ' + frase(res));
                            pintarCartao();
                          }, 10);
                        } else {
                          original.apply(esse, args);
                        }
                      });
                      return true;
                    };
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 7 - CUIDANDO DAS IMAGENS ANTIGAS                             */
                  /* ------------------------------------------------------------------ */
                  var ocupado = false;
                
                  function comprimirTodas(quieto, pronto) {
                    if (ocupado) {
                      if (!quieto) recado('Ja estou comprimindo. Um instante.', true);
                      if (typeof pronto === 'function') pronto(0);
                      return;
                    }
                    var alvos = pesadas();
                    if (!alvos.length) {
                      if (!quieto) recado('Todas as imagens da Vista ja estao dentro do alvo de ' +
                        bonito(alvo().tetoKb) + ' por imagem.');
                      if (typeof pronto === 'function') pronto(0);
                      return;
                    }
                    ocupado = true;
                    var antes = pesoTotalKb(), feitos = 0;
                    if (!quieto) recado('Comprimindo ' + alvos.length + ' imagem(ns) antiga(s)...');
                    function passo(k) {
                      if (k >= alvos.length) {
                        ocupado = false;
                        if (feitos) {
                          avisarP67();
                          redesenhar(null, '');
                        }
                        if (!quieto) {
                          recado('Pronto: ' + feitos + ' imagem(ns) comprimida(s). Peso das vistas de ' +
                            bonito(antes) + ' para ' + bonito(pesoTotalKb()) + '.');
                        } else if (feitos) {
                          log(feitos + ' imagem(ns) antiga(s) comprimida(s) sozinho.');
                        }
                        pintarCartao();
                        if (typeof pronto === 'function') pronto(feitos);
                        return;
                      }
                      var item = alvos[k];
                      if (!ehImagem(item.p66img) || foiVista(item.p66img)) { passo(k + 1); return; }
                      var antigo = item.p66img;
                      comprimir(antigo, function (res) {
                        if (res && res.url && res.url.length < antigo.length && item.p66img === antigo) {
                          if (guardar(item, res.url)) {
                            feitos++;
                            anotar(res, 'antiga');
                          }
                        } else {
                          marcarVista(antigo);
                        }
                        if (!quieto && (k % 3) === 0) {
                          recado('Comprimindo... ' + (k + 1) + ' de ' + alvos.length);
                          pintarCartao();
                        }
                        depois(function () { passo(k + 1); }, 12);
                      });
                    }
                    passo(0);
                  }
                  P68.comprimirTodas = function () { comprimirTodas(false); return true; };
                
                  function ligarVigia() {
                    if (P68.__vigia) return;
                    P68.__vigia = true;
                    try {
                      window.setInterval(function () {
                        if (!regras.antigas || ocupado) return;
                        if (!pesadas().length) return;
                        comprimirTodas(true);
                      }, 20000);
                    } catch (e) { /* ignora */ }
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 8 - CARTAO DENTRO DA PRE-VISUALIZACAO                        */
                  /* ------------------------------------------------------------------ */
                  function recado(txt, ruim) {
                    var alv = porId('p68Recado');
                    if (alv) {
                      alv.textContent = txt || '';
                      alv.className = 'p68-recado' + (ruim ? ' p68-recado-ruim' : (txt ? ' p68-recado-bom' : ''));
                    }
                    if (txt) log(txt);
                  }
                
                  function avisoP66(txt) {
                    try {
                      var a = porId('p66Aviso');
                      if (a) {
                        a.textContent = txt;
                        a.className = 'p66-aviso p66-aviso-bom';
                      }
                    } catch (e) { /* ignora */ }
                  }
                
                  function botaoModo(chave) {
                    var m = MODOS[chave];
                    var ativo = regras.modo === chave ? ' p68-ativo' : '';
                    return '<button type="button" class="p68-passo' + ativo + '" data-p68modo="' + chave + '">' +
                      seguro(m.nome) + '<span>ate ' + m.tetoKb + ' KB / ' + m.lado + ' px</span></button>';
                  }
                
                  function corpoCartao() {
                    var a = alvo();
                    var n = comImagem();
                    var acima = pesadas().length;
                    var html = '<div class="p68-topo">' +
                      '<div class="p68-titulo">Compressao automatica das imagens da Vista</div>' +
                      '<div class="p68-sub">Toda foto anexada e reduzida na hora, antes de ser guardada. ' +
                      'As imagens antigas pesadas tambem sao acertadas sozinhas.</div>' +
                      '</div>';
                
                    html += '<div class="p68-linhas">' +
                      '<div class="p68-item"><b>' + n + '</b><span>vista(s) com imagem</span></div>' +
                      '<div class="p68-item"><b>' + bonito(pesoTotalKb()) + '</b><span>peso somado</span></div>' +
                      '<div class="p68-item"><b>' + acima + '</b><span>acima do alvo</span></div>' +
                      '<div class="p68-item"><b>' + bonito(a.tetoKb) + '</b><span>alvo por imagem</span></div>' +
                      '</div>';
                
                    html += '<div class="p68-rot">Qualidade guardada</div><div class="p68-passos">' +
                      botaoModo('economia') + botaoModo('equilibrado') + botaoModo('nitidez') + '</div>';
                
                    html += '<div class="p68-chaves">' +
                      '<button type="button" class="p68-chave' + (regras.auto ? ' p68-on' : '') +
                      '" data-p68acao="auto">' + (regras.auto ? 'Comprimindo ao anexar' : 'Sem comprimir ao anexar') +
                      '</button>' +
                      '<button type="button" class="p68-chave' + (regras.antigas ? ' p68-on' : '') +
                      '" data-p68acao="antigas">' + (regras.antigas ? 'Cuidando das antigas' : 'Antigas so no botao') +
                      '</button>' +
                      '</div>';
                
                    if (ultimo) {
                      var corte = ultimo.antesKb > 0 ?
                        Math.max(0, Math.round((1 - ultimo.depoisKb / ultimo.antesKb) * 100)) : 0;
                      html += '<div class="p68-antes">' +
                        '<div class="p68-antes-t">Ultima imagem tratada</div>' +
                        '<div class="p68-antes-v"><span class="p68-de">' + bonito(ultimo.antesKb) + '</span>' +
                        '<span class="p68-fl">para</span>' +
                        '<span class="p68-para">' + bonito(ultimo.depoisKb) + '</span>' +
                        '<span class="p68-corte">' + corte + '% mais leve</span></div>' +
                        (ultimo.largura ? '<div class="p68-antes-p">Tamanho final: ' + ultimo.largura + 'x' +
                          ultimo.altura + ' px</div>' : '') +
                        '</div>';
                    }
                
                    html += '<div class="p68-bts">' +
                      '<button type="button" class="p68-btn p68-btn-forte" data-p68acao="todas">' +
                      'Comprimir imagens antigas agora</button>' +
                      '<button type="button" class="p68-btn" data-p68acao="padrao">Voltar ao padrao</button>' +
                      '</div>';
                
                    html += '<div class="p68-recado" id="p68Recado"></div>';
                    return html;
                  }
                
                  function pintarCartao() {
                    var cartao = porId('p68Cartao');
                    if (!cartao) return;
                    var guardado = '';
                    var rec = porId('p68Recado');
                    if (rec) guardado = rec.textContent || '';
                    cartao.innerHTML = corpoCartao();
                    if (guardado) {
                      var novo = porId('p68Recado');
                      if (novo) {
                        novo.textContent = guardado;
                        novo.className = 'p68-recado p68-recado-bom';
                      }
                    }
                  }
                  P68.pintarCartao = pintarCartao;
                
                  function ligarCartao(cartao) {
                    if (cartao.getAttribute('data-p68pronto')) return;
                    cartao.setAttribute('data-p68pronto', '1');
                    cartao.addEventListener('click', function (ev) {
                      var t = ev.target, acao = '', modo = '';
                      while (t && t !== cartao) {
                        if (t.getAttribute) {
                          acao = t.getAttribute('data-p68acao');
                          modo = t.getAttribute('data-p68modo');
                        }
                        if (acao || modo) break;
                        t = t.parentNode;
                      }
                      if (!acao && !modo) return;
                      ev.preventDefault();
                      ev.stopPropagation();
                      if (modo) {
                        P68.definirRegras({ modo: modo });
                        recado('Qualidade agora: ' + (MODOS[modo] ? MODOS[modo].nome : modo) +
                          ' (alvo de ' + bonito(alvo().tetoKb) + ' por imagem).');
                        return;
                      }
                      if (acao === 'auto') {
                        P68.definirRegras({ auto: !regras.auto });
                        recado(regras.auto ? 'Vou comprimir cada imagem no momento em que for anexada.' :
                          'Compressao ao anexar desligada. Nada muda nas imagens ja guardadas.');
                      } else if (acao === 'antigas') {
                        P68.definirRegras({ antigas: !regras.antigas });
                        recado(regras.antigas ? 'Vou acertar sozinho as imagens antigas pesadas.' :
                          'As antigas ficam como estao. Use o botao quando quiser.');
                      } else if (acao === 'todas') {
                        comprimirTodas(false);
                      } else if (acao === 'padrao') {
                        P68.padrao();
                      }
                    });
                  }
                
                  function injetarCartao() {
                    var destino = document.querySelector('.p66-editor');
                    if (!destino) return;
                    var velho = porId('p68Cartao');
                    if (velho && velho.parentNode === destino) { pintarCartao(); return; }
                    if (velho && velho.parentNode) {
                      try { velho.parentNode.removeChild(velho); } catch (e) { /* ignora */ }
                    }
                    var cartao = document.createElement('div');
                    cartao.id = 'p68Cartao';
                    cartao.className = 'p68-cartao';
                    cartao.innerHTML = corpoCartao();
                    try { destino.appendChild(cartao); } catch (e2) { return; }
                    ligarCartao(cartao);
                  }
                  P68.injetarCartao = injetarCartao;
                
                  function ligarPreview() {
                    if (P68.__ligadoPreview) return;
                    P68.__ligadoPreview = true;
                    var original = window.abrirPreviewEsquadria;
                    if (typeof original === 'function') {
                      window.abrirPreviewEsquadria = function () {
                        var saida = original.apply(this, arguments);
                        depois(function () { try { injetarCartao(); } catch (e) { /* ignora */ } }, 120);
                        depois(function () { try { injetarCartao(); } catch (e2) { /* ignora */ } }, 500);
                        return saida;
                      };
                    }
                    try {
                      window.setInterval(function () {
                        try {
                          if (document.querySelector('.p66-editor') && !porId('p68Cartao')) injetarCartao();
                        } catch (e) { /* ignora */ }
                      }, 900);
                    } catch (e3) { /* ignora */ }
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* AJUDA E SITUACAO                                                   */
                  /* ------------------------------------------------------------------ */
                  P68.ajuda = function () {
                    var linhas = [
                      'PATCH 68 - compressao automatica das imagens da Vista',
                      'Cada foto anexada na coluna Vista e reduzida na hora, antes de ser',
                      'guardada, e o painel mostra o antes e o depois. As imagens antigas',
                      'pesadas sao acertadas sozinhas, aos poucos.',
                      'P68.situacao()                mostra os numeros atuais',
                      'P68.comprimirTodas()          trata agora as imagens pesadas',
                      'P68.definirRegras("economia")   guarda o minimo de peso',
                      'P68.definirRegras("equilibrado") padrao de fabrica',
                      'P68.definirRegras("nitidez")     guarda com mais detalhe',
                      'P68.definirRegras({tetoKb:70})  escolhe o alvo de peso na mao',
                      'P68.definirRegras({auto:false}) desliga a compressao ao anexar',
                      'P68.padrao()                  volta tudo ao padrao'
                    ];
                    try { console.log(linhas.join('\n')); } catch (e) { /* ignora */ }
                    return linhas.length;
                  };
                
                  P68.situacao = function () {
                    var a = alvo();
                    var s = {
                      modo: regras.modo,
                      alvoKb: a.tetoKb,
                      ladoMaior: a.lado,
                      qualidade: a.q,
                      comprimeAoAnexar: !!regras.auto,
                      cuidaDasAntigas: !!regras.antigas,
                      vistasComImagem: comImagem(),
                      pesoKb: pesoTotalKb(),
                      acimaDoAlvo: pesadas().length,
                      ultimo: ultimo
                    };
                    try { console.log('[P68] ' + JSON.stringify(s)); } catch (e) { /* ignora */ }
                    return s;
                  };
                
                  /* ------------------------------------------------------------------ */
                  /* PARTIDA                                                            */
                  /* ------------------------------------------------------------------ */
                  function iniciar() {
                    lerRegras();
                    ligarEscuta();
                    ligarGravacao();
                    ligarDefinir();
                    ligarPreview();
                    ligarVigia();
                    P68.__pronto = true;
                    depois(function () {
                      try { if (regras.antigas && pesadas().length) comprimirTodas(true); } catch (e) { /* ignora */ }
                    }, 8000);
                  }
                
                  function partir() {
                    try { iniciar(); } catch (e) { log('nao consegui iniciar: ' + e); }
                    /* o P66 pode entrar depois; tentamos ligar de novo algumas vezes */
                    var voltas = 0;
                    try {
                      var t = window.setInterval(function () {
                        voltas++;
                        try { ligarGravacao(); ligarDefinir(); } catch (e) { /* ignora */ }
                        if (voltas > 40 || (P68.__ligado && P68.__ligadoDefinir)) window.clearInterval(t);
                      }, 700);
                    } catch (e2) { /* ignora */ }
                    log('Patch 68 ativo: as imagens da Vista sao comprimidas ao anexar. Use P68.ajuda().');
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function () { depois(partir, 700); });
                  } else {
                    depois(partir, 700);
                  }
                }());
            
