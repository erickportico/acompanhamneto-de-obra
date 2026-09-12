
                /* PATCH 64: EDITOR DO DESENHO DA ESQUADRIA */
                /* === PATCH 64: EDITOR DO DESENHO DA ESQUADRIA E FECHAMENTO DO PREVIEW === */
                (function () {
                  if (window.P64 && window.P64.__v64) return;
                  var P64 = window.P64 = window.P64 || {};
                  P64.__v64 = true;
                
                  /* ------------------------------------------------------------------ */
                  /* ajudantes                                                          */
                  /* ------------------------------------------------------------------ */
                  function porId(id) { return document.getElementById(id); }
                
                  function seguro(txt) {
                    return String(txt == null ? '' : txt)
                      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                  }
                
                  function depois(fn, ms) {
                    try { return window.setTimeout(fn, ms || 0); } catch (e) { return 0; }
                  }
                
                  function inteiro(v, min, max, padrao) {
                    var n = parseInt(v, 10);
                    if (!isFinite(n)) n = padrao;
                    if (n < min) n = min;
                    if (n > max) n = max;
                    return n;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 1 - CONFIGURACAO DO DESENHO GUARDADA NO PROPRIO ITEM         */
                  /* ------------------------------------------------------------------ */
                  var TIPOS = [
                    ['giro', 'Janela de Giro'],
                    ['correr', 'Janela de Correr'],
                    ['maximar', 'Maxim-Ar'],
                    ['basculante', 'Basculante'],
                    ['fixo', 'Painel Fixo'],
                    ['porta', 'Porta de Giro'],
                    ['portacorrer', 'Porta de Correr'],
                    ['veneziana', 'Veneziana']
                  ];
                
                  var ABERTURAS = [
                    ['dir', 'Abre a direita'],
                    ['esq', 'Abre a esquerda'],
                    ['duplo', 'Abre nos dois lados']
                  ];
                
                  function tipoAutomatico(item) {
                    var t = String((item && item.tipo) || '') + ' ' + String((item && item.descricao) || '');
                    t = t.toUpperCase();
                    if (/VENEZIAN/.test(t)) return 'veneziana';
                    if (/PORTA/.test(t) && /CORRER|DESLIZ/.test(t)) return 'portacorrer';
                    if (/PORTA/.test(t)) return 'porta';
                    if (/MAXIM/.test(t)) return 'maximar';
                    if (/BASCUL/.test(t)) return 'basculante';
                    if (/CORRER|DESLIZ/.test(t)) return 'correr';
                    if (/PAINEL|FIXO/.test(t)) return 'fixo';
                    if (/JANELA/.test(t)) return 'giro';
                    return 'giro';
                  }
                
                  function folhasAutomaticas(tipo) {
                    if (tipo === 'correr' || tipo === 'portacorrer') return 2;
                    if (tipo === 'fixo' || tipo === 'maximar' || tipo === 'basculante') return 1;
                    if (tipo === 'porta') return 1;
                    return 2;
                  }
                
                  function lerCfg(item) {
                    var tipo = item && item.p64tipo;
                    var achou = false;
                    for (var i = 0; i < TIPOS.length; i++) { if (TIPOS[i][0] === tipo) achou = true; }
                    if (!achou) tipo = tipoAutomatico(item);
                    var folhas = (item && item.p64folhas != null)
                      ? inteiro(item.p64folhas, 1, 6, folhasAutomaticas(tipo))
                      : folhasAutomaticas(tipo);
                    return {
                      tipo: tipo,
                      folhas: folhas,
                      linhas: (item && item.p64linhas != null) ? inteiro(item.p64linhas, 1, 4, 1) : 1,
                      bandeira: !!(item && item.p64bandeira),
                      bandPerc: (item && item.p64bandPerc != null) ? inteiro(item.p64bandPerc, 10, 50, 22) : 22,
                      abertura: (item && (item.p64abertura === 'esq' || item.p64abertura === 'duplo'))
                        ? item.p64abertura : 'dir',
                      personalizado: !!(item && item.p64tipo)
                    };
                  }
                  P64.lerCfg = lerCfg;
                
                  function nomeTipo(tipo) {
                    for (var i = 0; i < TIPOS.length; i++) { if (TIPOS[i][0] === tipo) return TIPOS[i][1]; }
                    return 'Esquadria';
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 2 - DESENHO                                                  */
                  /* ------------------------------------------------------------------ */
                  function moldura(ctx, x, y, w, h, cor, esp) {
                    ctx.strokeStyle = cor;
                    ctx.lineWidth = esp;
                    ctx.strokeRect(x, y, w, h);
                  }
                
                  function painelVidro(ctx, x, y, w, h, corVidro, corPerfil, esp) {
                    if (w <= 0 || h <= 0) return;
                    ctx.fillStyle = corVidro;
                    ctx.fillRect(x, y, w, h);
                    moldura(ctx, x, y, w, h, corPerfil, esp);
                  }
                
                  function linha(ctx, x1, y1, x2, y2, cor, esp) {
                    ctx.strokeStyle = cor;
                    ctx.lineWidth = esp;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                  }
                
                  function seta(ctx, x1, y1, x2, y2, cor, esp) {
                    linha(ctx, x1, y1, x2, y2, cor, esp);
                    var ang = Math.atan2(y2 - y1, x2 - x1);
                    var t = Math.max(3, esp * 2.6);
                    ctx.beginPath();
                    ctx.moveTo(x2, y2);
                    ctx.lineTo(x2 - t * Math.cos(ang - 0.5), y2 - t * Math.sin(ang - 0.5));
                    ctx.moveTo(x2, y2);
                    ctx.lineTo(x2 - t * Math.cos(ang + 0.5), y2 - t * Math.sin(ang + 0.5));
                    ctx.stroke();
                  }
                
                  /* simbolo de abertura dentro de uma folha */
                  function simbolo(ctx, tipo, x, y, w, h, cfg, indice, total, corSinal, esp) {
                    var m = Math.max(2, Math.min(w, h) * 0.10);
                    var ix = x + m, iy = y + m, iw = w - 2 * m, ih = h - 2 * m;
                    if (iw <= 2 || ih <= 2) return;
                
                    var ladoDir;
                    if (cfg.abertura === 'duplo') ladoDir = (indice % 2 === 1);
                    else if (cfg.abertura === 'esq') ladoDir = false;
                    else ladoDir = true;
                
                    if (tipo === 'giro' || tipo === 'porta') {
                      /* simbolo tecnico do giro: dois riscos partindo da dobradica */
                      var dx = ladoDir ? ix : ix + iw;
                      var px = ladoDir ? ix + iw : ix;
                      linha(ctx, dx, iy, px, iy + ih / 2, corSinal, esp);
                      linha(ctx, dx, iy + ih, px, iy + ih / 2, corSinal, esp);
                      if (tipo === 'porta') {
                        ctx.fillStyle = corSinal;
                        var mx = ladoDir ? ix + iw - Math.max(2, iw * 0.06) : ix + Math.max(2, iw * 0.06);
                        ctx.beginPath();
                        ctx.arc(mx, iy + ih / 2, Math.max(1.5, iw * 0.035), 0, Math.PI * 2);
                        ctx.fill();
                      }
                      return;
                    }
                
                    if (tipo === 'correr' || tipo === 'portacorrer') {
                      var meio = iy + ih / 2;
                      if (indice % 2 === 0) seta(ctx, ix + iw * 0.72, meio, ix + iw * 0.18, meio, corSinal, esp);
                      else seta(ctx, ix + iw * 0.28, meio, ix + iw * 0.82, meio, corSinal, esp);
                      if (tipo === 'portacorrer') {
                        ctx.fillStyle = corSinal;
                        ctx.beginPath();
                        ctx.arc(ix + iw / 2, iy + ih * 0.78, Math.max(1.5, iw * 0.035), 0, Math.PI * 2);
                        ctx.fill();
                      }
                      return;
                    }
                
                    if (tipo === 'maximar') {
                      /* projetante: vertice no meio de baixo */
                      linha(ctx, ix, iy + ih, ix + iw / 2, iy, corSinal, esp);
                      linha(ctx, ix + iw, iy + ih, ix + iw / 2, iy, corSinal, esp);
                      return;
                    }
                
                    if (tipo === 'basculante') {
                      var n = Math.max(2, Math.round(ih / Math.max(6, ih / 4)));
                      for (var i = 1; i < n; i++) {
                        var yy = iy + (ih * i) / n;
                        linha(ctx, ix, yy, ix + iw, yy, corSinal, esp);
                      }
                      return;
                    }
                
                    if (tipo === 'veneziana') {
                      var passo = Math.max(3, ih / 9);
                      for (var v = iy + passo; v < iy + ih - 1; v += passo) {
                        linha(ctx, ix, v, ix + iw, v, corSinal, Math.max(0.8, esp * 0.7));
                      }
                      return;
                    }
                
                    /* fixo: cruz leve */
                    linha(ctx, ix, iy, ix + iw, iy + ih, corSinal, Math.max(0.8, esp * 0.6));
                    linha(ctx, ix + iw, iy, ix, iy + ih, corSinal, Math.max(0.8, esp * 0.6));
                  }
                
                  function pintar(canvas, item, opcoes) {
                    var op = opcoes || {};
                    var W = op.larguraCanvas || 60;
                    var H = op.alturaCanvas || 60;
                    var corVidro = op.corVidro || '#d1e8ff';
                    var corFundo = op.corFundo || '#f8fafc';
                    var corPerfil = op.corMoldura || '#555';
                    var corBorda = op.corBorda || '#000';
                    var grande = !!op.escalaTexto;
                    var cfg = lerCfg(item);
                
                    canvas.width = W;
                    canvas.height = H;
                    var ctx = canvas.getContext('2d');
                    if (!ctx) return;
                
                    ctx.fillStyle = corFundo;
                    ctx.fillRect(0, 0, W, H);
                
                    var esp = grande ? 2 : 1.2;
                    var corSinal = grande ? '#e11d48' : '#64748b';
                
                    /* contorno externo */
                    moldura(ctx, 1.5, 1.5, W - 3, H - 3, corBorda, grande ? 3 : 2);
                
                    var margem = Math.max(5, Math.min(W, H) * 0.08);
                    var x = margem, y = margem, w = W - 2 * margem, h = H - 2 * margem;
                    if (w <= 4 || h <= 4) { x = 2; y = 2; w = W - 4; h = H - 4; }
                
                    /* marco */
                    var marco = Math.max(2, Math.min(w, h) * 0.05);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x, y, w, h);
                    moldura(ctx, x, y, w, h, corBorda, grande ? 2.5 : 1.6);
                
                    var ax = x + marco, ay = y + marco, aw = w - 2 * marco, ah = h - 2 * marco;
                
                    /* bandeira (parte fixa em cima) */
                    if (cfg.bandeira && ah > 12) {
                      var hb = (ah * cfg.bandPerc) / 100;
                      painelVidro(ctx, ax, ay, aw, hb, corVidro, corPerfil, esp * 0.9);
                      simbolo(ctx, 'fixo', ax, ay, aw, hb, cfg, 0, 1, corSinal, esp * 0.8);
                      /* travessa */
                      ctx.fillStyle = corBorda;
                      ctx.fillRect(ax, ay + hb, aw, Math.max(1.5, marco * 0.8));
                      ay = ay + hb + Math.max(1.5, marco * 0.8);
                      ah = ah - hb - Math.max(1.5, marco * 0.8);
                    }
                
                    /* folhas: colunas x linhas */
                    var cols = cfg.folhas;
                    var rows = cfg.linhas;
                    var vao = Math.max(1.2, marco * 0.7);
                    var lw = (aw - vao * (cols - 1)) / cols;
                    var lh = (ah - vao * (rows - 1)) / rows;
                    var idx = 0;
                    for (var r = 0; r < rows; r++) {
                      for (var c = 0; c < cols; c++) {
                        var fx = ax + c * (lw + vao);
                        var fy = ay + r * (lh + vao);
                        painelVidro(ctx, fx, fy, lw, lh, corVidro, corPerfil, esp * 0.9);
                        simbolo(ctx, cfg.tipo, fx, fy, lw, lh, cfg, idx, cols * rows, corSinal, esp * 0.9);
                        idx++;
                      }
                    }
                
                    /* travessas / montantes por cima das folhas */
                    ctx.fillStyle = corBorda;
                    for (var cc = 1; cc < cols; cc++) {
                      ctx.fillRect(ax + cc * (lw + vao) - vao, ay, vao, ah);
                    }
                    for (var rr = 1; rr < rows; rr++) {
                      ctx.fillRect(ax, ay + rr * (lh + vao) - vao, aw, vao);
                    }
                
                    /* soleira embaixo quando e porta */
                    if (cfg.tipo === 'porta' || cfg.tipo === 'portacorrer') {
                      ctx.fillStyle = corBorda;
                      ctx.fillRect(x, y + h - Math.max(1.5, marco), w, Math.max(1.5, marco));
                    }
                
                    if (grande && item && item.ref) {
                      ctx.fillStyle = '#0f172a';
                      ctx.font = 'bold 11px sans-serif';
                      ctx.textAlign = 'center';
                      ctx.fillText(String(item.ref), W / 2, H - 4);
                    }
                  }
                  P64.pintar = pintar;
                
                  /* troca o motor do desenho somente para itens com desenho definido aqui */
                  function ligarDesenho() {
                    var original = window.desenharEsquadriaCanvas;
                    if (typeof original !== 'function' || original.__p64) return;
                    var novo = function (canvas, item, opcoes) {
                      if (item && item.p64tipo) {
                        try { return pintar(canvas, item, opcoes || {}); } catch (e) { /* cai no antigo */ }
                      }
                      return original.apply(this, arguments);
                    };
                    novo.__p64 = true;
                    P64.__desenhoOriginal = original;
                    window.desenharEsquadriaCanvas = novo;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 3 - PAINEL DE EDICAO DO DESENHO DENTRO DO PREVIEW            */
                  /* ------------------------------------------------------------------ */
                  function modalPreview() { return porId('modalPreviewEsquadria'); }
                
                  function itemDoPreview(item) {
                    if (item && item.id != null) {
                      try {
                        var obra = (typeof window.getObraAtual === 'function') ? window.getObraAtual() : null;
                        var lista = (obra && obra.itens) || [];
                        for (var i = 0; i < lista.length; i++) {
                          if (String(lista[i].id) === String(item.id)) return lista[i];
                        }
                      } catch (e) { /* ignora */ }
                    }
                    return item;
                  }
                
                  function gravar(item, campo, valor) {
                    var alvo = itemDoPreview(item);
                    try {
                      if (typeof window.editarItem === 'function') window.editarItem(alvo.id, campo, valor);
                      else {
                        alvo[campo] = valor;
                        if (typeof window.salvarDB === 'function') window.salvarDB(false);
                      }
                    } catch (e) { /* ignora */ }
                    if (alvo[campo] !== valor) {
                      alvo[campo] = valor;
                      try { if (typeof window.salvarDB === 'function') window.salvarDB(false); } catch (e2) { /* ignora */ }
                    }
                    return alvo;
                  }
                
                  function aplicar(item, mudancas) {
                    var alvo = itemDoPreview(item);
                    for (var k in mudancas) {
                      if (Object.prototype.hasOwnProperty.call(mudancas, k)) alvo = gravar(alvo, k, mudancas[k]);
                    }
                    depois(function () {
                      try { if (typeof window.render === 'function') window.render(); } catch (e) { /* ignora */ }
                      try {
                        if (typeof window.abrirPreviewEsquadria === 'function') window.abrirPreviewEsquadria(alvo);
                      } catch (e2) { /* ignora */ }
                    }, 20);
                  }
                
                  function miniChip(tipo) {
                    var c = document.createElement('canvas');
                    var falso = {
                      ref: '', tipo: '', larg: 1, alt: 1,
                      p64tipo: tipo,
                      p64folhas: folhasAutomaticas(tipo),
                      p64linhas: 1, p64bandeira: false, p64abertura: 'dir'
                    };
                    try {
                      pintar(c, falso, { larguraCanvas: 52, alturaCanvas: 40, corFundo: '#ffffff', corVidro: '#dbeafe' });
                    } catch (e) { /* ignora */ }
                    return c;
                  }
                
                  function painelDesenho(item) {
                    var cfg = lerCfg(item);
                
                    var caixa = document.createElement('div');
                    caixa.className = 'p64-editor';
                
                    var html = '<div class="p64-titulo">Desenho da esquadria' +
                      '<span class="p64-tag">' + seguro(nomeTipo(cfg.tipo)) +
                      (cfg.personalizado ? '' : ' (automatico)') + '</span></div>';
                    html += '<div class="p64-sub">Escolha a tipologia e as divisoes: o desenho e a miniatura das ' +
                      'tabelas mudam na hora.</div>';
                    html += '<div class="p64-chips" id="p64Chips"></div>';
                
                    html += '<div class="p64-linhas">';
                    html += '<label class="p64-rot">Folhas / divisoes na largura</label>' +
                      '<div class="p64-passos" data-p64grupo="p64folhas">';
                    for (var f = 1; f <= 6; f++) {
                      html += '<button type="button" class="p64-passo' + (cfg.folhas === f ? ' p64-ativo' : '') +
                        '" data-p64val="' + f + '">' + f + '</button>';
                    }
                    html += '</div>';
                
                    html += '<label class="p64-rot">Divisoes na altura</label>' +
                      '<div class="p64-passos" data-p64grupo="p64linhas">';
                    for (var l = 1; l <= 4; l++) {
                      html += '<button type="button" class="p64-passo' + (cfg.linhas === l ? ' p64-ativo' : '') +
                        '" data-p64val="' + l + '">' + l + '</button>';
                    }
                    html += '</div>';
                
                    html += '<label class="p64-rot">Sentido de abertura</label>' +
                      '<div class="p64-passos" data-p64grupo="p64abertura">';
                    for (var a = 0; a < ABERTURAS.length; a++) {
                      html += '<button type="button" class="p64-passo p64-largo' +
                        (cfg.abertura === ABERTURAS[a][0] ? ' p64-ativo' : '') +
                        '" data-p64val="' + ABERTURAS[a][0] + '">' + seguro(ABERTURAS[a][1]) + '</button>';
                    }
                    html += '</div>';
                
                    html += '<label class="p64-rot">Bandeira em cima</label>' +
                      '<div class="p64-passos">' +
                      '<button type="button" class="p64-passo p64-largo' + (cfg.bandeira ? ' p64-ativo' : '') +
                      '" data-p64band="1">' + (cfg.bandeira ? 'Com bandeira' : 'Sem bandeira') + '</button>';
                    if (cfg.bandeira) {
                      html += '<input class="p64-alt" type="number" min="10" max="50" step="1" value="' +
                        cfg.bandPerc + '" data-p64perc="1" title="altura da bandeira em % da esquadria">' +
                        '<span class="p64-uni">% da altura</span>';
                    }
                    html += '</div>';
                    html += '</div>';
                
                    html += '<div class="p64-pe">' +
                      '<button type="button" class="p64-btn" data-p64auto="1">Voltar ao desenho automatico</button>' +
                      '</div>';
                
                    caixa.innerHTML = html;
                
                    /* chips de tipologia */
                    var chips = caixa.querySelector('#p64Chips');
                    for (var i = 0; i < TIPOS.length; i++) {
                      (function (tipo, nome) {
                        var chip = document.createElement('button');
                        chip.type = 'button';
                        chip.className = 'p64-chip' + (cfg.tipo === tipo ? ' p64-chip-on' : '');
                        chip.setAttribute('data-p64tipo', tipo);
                        chip.appendChild(miniChip(tipo));
                        var leg = document.createElement('span');
                        leg.textContent = nome;
                        chip.appendChild(leg);
                        chip.addEventListener('click', function (ev) {
                          ev.preventDefault();
                          ev.stopPropagation();
                          var atual = lerCfg(item);
                          var mud = { p64tipo: tipo };
                          if (!atual.personalizado) {
                            mud.p64folhas = folhasAutomaticas(tipo);
                            mud.p64linhas = atual.linhas;
                            mud.p64abertura = atual.abertura;
                          }
                          aplicar(item, mud);
                        });
                        chips.appendChild(chip);
                      }(TIPOS[i][0], TIPOS[i][1]));
                    }
                
                    /* grupos de botoes */
                    var grupos = caixa.querySelectorAll('[data-p64grupo]');
                    for (var g = 0; g < grupos.length; g++) {
                      (function (grupo) {
                        var campo = grupo.getAttribute('data-p64grupo');
                        var bts = grupo.querySelectorAll('.p64-passo');
                        for (var b = 0; b < bts.length; b++) {
                          bts[b].addEventListener('click', function (ev) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            var v = this.getAttribute('data-p64val');
                            var mud = {};
                            mud[campo] = (campo === 'p64abertura') ? v : inteiro(v, 1, 6, 1);
                            if (!lerCfg(item).personalizado) mud.p64tipo = lerCfg(item).tipo;
                            aplicar(item, mud);
                          });
                        }
                      }(grupos[g]));
                    }
                
                    var bBand = caixa.querySelector('[data-p64band]');
                    if (bBand) {
                      bBand.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        var atual = lerCfg(item);
                        var mud = { p64bandeira: !atual.bandeira, p64bandPerc: atual.bandPerc };
                        if (!atual.personalizado) mud.p64tipo = atual.tipo;
                        aplicar(item, mud);
                      });
                    }
                
                    var cPerc = caixa.querySelector('[data-p64perc]');
                    if (cPerc) {
                      cPerc.addEventListener('change', function () {
                        aplicar(item, { p64bandPerc: inteiro(this.value, 10, 50, 22) });
                      });
                      cPerc.addEventListener('keydown', function (ev) {
                        if (ev.key === 'Enter') { ev.preventDefault(); this.blur(); }
                      });
                      cPerc.addEventListener('click', function (ev) { ev.stopPropagation(); });
                    }
                
                    var bAuto = caixa.querySelector('[data-p64auto]');
                    if (bAuto) {
                      bAuto.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        var alvo = itemDoPreview(item);
                        var campos = ['p64tipo', 'p64folhas', 'p64linhas', 'p64bandeira', 'p64bandPerc', 'p64abertura'];
                        for (var c = 0; c < campos.length; c++) {
                          try { delete alvo[campos[c]]; } catch (e) { alvo[campos[c]] = undefined; }
                        }
                        try { if (typeof window.salvarDB === 'function') window.salvarDB(false); } catch (e2) { /* ignora */ }
                        depois(function () {
                          try { if (typeof window.render === 'function') window.render(); } catch (e3) { /* ignora */ }
                          try { window.abrirPreviewEsquadria(alvo); } catch (e4) { /* ignora */ }
                        }, 20);
                      });
                    }
                
                    return caixa;
                  }
                
                  function decorar(item) {
                    var m = modalPreview();
                    if (!m) return;
                    m.classList.remove('p64-off');
                    m.classList.add('p64-on');
                
                    var conteudo = porId('previewEsquadriaContent');
                    if (!conteudo) return;
                
                    var antigo = conteudo.querySelector('.p64-editor');
                    if (antigo && antigo.parentNode) antigo.parentNode.removeChild(antigo);
                
                    var painel = painelDesenho(item);
                    conteudo.appendChild(painel);
                
                    /* se o item ja tem desenho proprio, garante o canvas grande redesenhado */
                    if (item && item.p64tipo) {
                      var telas = conteudo.querySelectorAll('canvas');
                      for (var i = 0; i < telas.length; i++) {
                        var tela = telas[i];
                        if (painel.contains(tela)) continue;
                        try {
                          pintar(tela, item, {
                            larguraCanvas: tela.width || 300, alturaCanvas: tela.height || 300,
                            corVidro: '#d1e8ff', corFundo: '#fff', escalaTexto: true
                          });
                        } catch (e) { /* ignora */ }
                      }
                    }
                  }
                
                  function ligarPreview() {
                    var abrir = window.abrirPreviewEsquadria;
                    if (typeof abrir !== 'function' || abrir.__p64) return;
                    var novo = function (item) {
                      var r;
                      try { r = abrir.apply(this, arguments); } catch (e) { /* segue */ }
                      try { decorar(item); } catch (e2) { /* ignora */ }
                      return r;
                    };
                    novo.__p64 = true;
                    window.abrirPreviewEsquadria = novo;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 4 - FECHAMENTO A PROVA DE FALHA (X, FORA, ESC)               */
                  /* ------------------------------------------------------------------ */
                  function estaAberto(m) {
                    if (!m) return false;
                    if (m.className.indexOf('p64-off') >= 0) return false;
                    if (m.className.indexOf('p63-on') >= 0 || m.className.indexOf('p64-on') >= 0) return true;
                    var d = '';
                    try { d = window.getComputedStyle(m).display; } catch (e) { d = m.style.display || ''; }
                    return d !== 'none' && d !== '';
                  }
                
                  function fechar() {
                    var m = modalPreview();
                    if (m) {
                      m.classList.remove('p63-on');
                      m.classList.remove('p64-on');
                      m.classList.add('p64-off');
                      m.style.display = 'none';
                      m.setAttribute('aria-hidden', 'true');
                    }
                  }
                  P64.fechar = fechar;
                
                  function ehBotaoFechar(alvo, m) {
                    var no = alvo;
                    while (no && no !== m) {
                      if (no.nodeType === 1) {
                        if (no.getAttribute && no.getAttribute('data-p64fechar')) return true;
                        var oc = (no.getAttribute && no.getAttribute('onclick')) || '';
                        if (/fecharModais|fecharPreview/i.test(oc)) return true;
                        var tag = (no.tagName || '').toLowerCase();
                        if (tag === 'button' || tag === 'a') {
                          var t = (no.textContent || '').trim();
                          if (t === '\u2715' || t === '\u2716' || t === '\u00d7' || t === 'X' || t === 'x' ||
                              /^fechar$/i.test(t)) return true;
                        }
                      }
                      no = no.parentNode;
                    }
                    return false;
                  }
                
                  function ligarFechamento() {
                    if (P64.__fecha) return;
                    P64.__fecha = true;
                
                    document.addEventListener('click', function (ev) {
                      var m = modalPreview();
                      if (!m || !estaAberto(m)) return;
                      var alvo = ev.target;
                      if (alvo === m) { fechar(); return; }
                      if (!m.contains(alvo)) return;
                      if (ehBotaoFechar(alvo, m)) {
                        try {
                          if (typeof P63 !== 'undefined' && P63 && typeof P63.fecharPreview === 'function') {
                            P63.fecharPreview();
                          }
                        } catch (e) { /* ignora */ }
                        fechar();
                      }
                    }, true);
                
                    document.addEventListener('keydown', function (ev) {
                      if (ev.key !== 'Escape' && ev.keyCode !== 27) return;
                      var m = modalPreview();
                      if (m && estaAberto(m)) fechar();
                    }, true);
                
                    /* rede de seguranca: se o preview ficou marcado como fechado mas ainda
                       aparece na tela, some com ele */
                    if (!P64.__ronda) {
                      P64.__ronda = window.setInterval(function () {
                        var m = modalPreview();
                        if (!m) return;
                        if (m.className.indexOf('p64-off') >= 0 && m.style.display !== 'none') {
                          m.style.display = 'none';
                        }
                      }, 700);
                    }
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTIDA                                                            */
                  /* ------------------------------------------------------------------ */
                  function iniciar() {
                    ligarDesenho();
                    ligarPreview();
                    ligarFechamento();
                    P64.__pronto = true;
                  }
                
                  function partir() {
                    try { iniciar(); } catch (e) { /* ignora */ }
                    depois(function () { try { iniciar(); } catch (e) { /* ignora */ } }, 900);
                    depois(function () { try { iniciar(); } catch (e) { /* ignora */ } }, 2500);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', partir);
                  } else {
                    partir();
                  }
                }());
            
