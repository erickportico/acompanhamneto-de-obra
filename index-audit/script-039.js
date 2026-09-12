
                /* PATCH 66: MAIS TIPOLOGIAS NO DESENHO E IMAGEM PROPRIA COMO VISTA */
                (function () {
                  if (window.P66 && window.P66.__v66) return;
                  var P66 = window.P66 = window.P66 || {};
                  P66.__v66 = true;
                
                  /* ------------------------------------------------------------------ */
                  /* AJUDANTES                                                          */
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
                
                  function semAcento(t) {
                    t = String(t == null ? '' : t).toLowerCase();
                    var de = '\u00e1\u00e0\u00e3\u00e2\u00e4\u00e9\u00ea\u00e8\u00ed\u00ee\u00f3\u00f4\u00f5\u00f2\u00fa\u00fc\u00fb\u00e7\u00f1';
                    var pa = 'aaaaaeeeiioooouuucn';
                    var s = '';
                    for (var i = 0; i < t.length; i++) {
                      var p = de.indexOf(t.charAt(i));
                      s += (p >= 0) ? pa.charAt(p) : t.charAt(i);
                    }
                    return s;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 1 - AS NOVAS TIPOLOGIAS                                      */
                  /* ------------------------------------------------------------------ */
                  /* chave, nome que aparece na tela, grupo, palavras para a busca */
                  var TIPOS = [
                    ['tombar', 'Janela de Tombar', 'Janelas', 'tombar tilt basculhante interna'],
                    ['oscilobatente', 'Oscilo-Batente', 'Janelas', 'oscilo batente oscilobatente giro tombar'],
                    ['guilhotina', 'Janela Guilhotina', 'Janelas', 'guilhotina vertical sobe desce'],
                    ['pivotante', 'Janela Pivotante', 'Janelas', 'pivotante eixo pivo'],
                    ['sanfonada', 'Janela Sanfonada', 'Janelas', 'sanfonada acordeon camarao dobravel'],
                    ['arco', 'Janela em Arco', 'Janelas', 'arco redondo curva arqueada meia lua'],
                    ['oculo', '\u00d3culo (Redonda)', 'Janelas', 'oculo redonda circular bolacha'],
                    ['triangular', 'Esquadria Triangular', 'Janelas', 'triangular triangulo oitao empena'],
                    ['trapezio', 'Esquadria Trapezoidal', 'Janelas', 'trapezio trapezoidal inclinada rampa escada'],
                    ['portapivotante', 'Porta Pivotante', 'Portas', 'porta pivotante pivo eixo'],
                    ['portabalcao', 'Porta Balc\u00e3o', 'Portas', 'porta balcao correr sacada varanda'],
                    ['portacamarao', 'Porta Camar\u00e3o', 'Portas', 'porta camarao sanfonada dobravel acordeon'],
                    ['portaacustica', 'Porta Ac\u00fastica / Cega', 'Portas', 'porta acustica cega lisa sem vidro'],
                    ['boxbanheiro', 'Box de Banheiro', 'Vidros e Fachadas', 'box banheiro banho temperado chuveiro'],
                    ['cortinavidro', 'Cortina de Vidro', 'Vidros e Fachadas', 'cortina de vidro sacada envidracamento'],
                    ['peledevidro', 'Pele de Vidro', 'Vidros e Fachadas', 'pele de vidro fachada glazing structural'],
                    ['guardacorpo', 'Guarda-Corpo', 'Vidros e Fachadas', 'guarda corpo guardacorpo corrimao sacada'],
                    ['espelho', 'Espelho', 'Vidros e Fachadas', 'espelho espelhado mirror'],
                    ['gradil', 'Grade / Gradil', 'Grades e Port\u00f5es', 'grade gradil alambrado protecao barra'],
                    ['brise', 'Brise / L\u00e2minas', 'Grades e Port\u00f5es', 'brise laminas persiana quebra sol'],
                    ['portao', 'Port\u00e3o de Correr', 'Grades e Port\u00f5es', 'portao de correr deslizante garagem'],
                    ['portaobasculante', 'Port\u00e3o Basculante', 'Grades e Port\u00f5es', 'portao basculante garagem levanta'],
                    ['tela', 'Tela Mosquiteira', 'Grades e Port\u00f5es', 'tela mosquiteira mosquiteiro rede protecao'],
                    ['persianaint', 'Persiana Integrada', 'Grades e Port\u00f5es', 'persiana integrada rolo enrolar blackout']
                  ];
                
                  var GRUPOS = ['Janelas', 'Portas', 'Vidros e Fachadas', 'Grades e Port\u00f5es'];
                
                  var COM_SOLEIRA = {
                    portapivotante: 1, portabalcao: 1, portacamarao: 1, portaacustica: 1,
                    boxbanheiro: 1, portao: 1, portaobasculante: 1
                  };
                
                  function ehTipo66(chave) {
                    for (var i = 0; i < TIPOS.length; i++) { if (TIPOS[i][0] === chave) return true; }
                    return false;
                  }
                
                  function nomeTipo(chave) {
                    for (var i = 0; i < TIPOS.length; i++) { if (TIPOS[i][0] === chave) return TIPOS[i][1]; }
                    return 'Esquadria';
                  }
                
                  function folhasPadrao(tipo) {
                    if (tipo === 'portabalcao') return 4;
                    if (tipo === 'cortinavidro') return 5;
                    if (tipo === 'peledevidro') return 3;
                    if (tipo === 'sanfonada' || tipo === 'portacamarao') return 4;
                    if (tipo === 'boxbanheiro') return 2;
                    if (tipo === 'guardacorpo' || tipo === 'gradil' || tipo === 'brise') return 3;
                    if (tipo === 'guilhotina') return 1;
                    if (tipo === 'oculo' || tipo === 'triangular' || tipo === 'trapezio') return 1;
                    if (tipo === 'portapivotante' || tipo === 'portaacustica' ||
                        tipo === 'portaobasculante' || tipo === 'tela' ||
                        tipo === 'espelho' || tipo === 'persianaint') return 1;
                    return 2;
                  }
                
                  function linhasPadrao(tipo) {
                    if (tipo === 'guilhotina') return 2;
                    if (tipo === 'peledevidro') return 4;
                    return 1;
                  }
                
                  function lerCfg(item) {
                    var tipo = item && item.p66tipo;
                    if (!ehTipo66(tipo)) tipo = '';
                    var base = null;
                    try {
                      if (window.P64 && typeof window.P64.lerCfg === 'function') base = window.P64.lerCfg(item);
                    } catch (e) { base = null; }
                    var folhas = (item && item.p66folhas != null)
                      ? inteiro(item.p66folhas, 1, 8, folhasPadrao(tipo))
                      : ((item && item.p64folhas != null)
                        ? inteiro(item.p64folhas, 1, 8, folhasPadrao(tipo))
                        : folhasPadrao(tipo));
                    var linhas = (item && item.p66linhas != null)
                      ? inteiro(item.p66linhas, 1, 6, linhasPadrao(tipo))
                      : ((item && item.p64linhas != null)
                        ? inteiro(item.p64linhas, 1, 6, linhasPadrao(tipo))
                        : linhasPadrao(tipo));
                    var temBand = (item && item.p66bandeira != null)
                      ? !!item.p66bandeira
                      : !!(item && item.p64bandeira);
                    var perc = (item && item.p66bandPerc != null)
                      ? inteiro(item.p66bandPerc, 10, 50, 22)
                      : ((item && item.p64bandPerc != null) ? inteiro(item.p64bandPerc, 10, 50, 22) : 22);
                    var ab = (item && item.p66abertura) || (item && item.p64abertura) ||
                      (base && base.abertura) || 'dir';
                    if (ab !== 'esq' && ab !== 'duplo') ab = 'dir';
                    return {
                      tipo: tipo,
                      folhas: folhas,
                      linhas: linhas,
                      bandeira: temBand,
                      bandPerc: perc,
                      abertura: ab
                    };
                  }
                  P66.lerCfg = lerCfg;
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 2 - DESENHO DAS NOVAS TIPOLOGIAS                             */
                  /* ------------------------------------------------------------------ */
                  function moldura(ctx, x, y, w, h, cor, esp) {
                    ctx.strokeStyle = cor;
                    ctx.lineWidth = esp;
                    ctx.strokeRect(x, y, w, h);
                  }
                
                  function vidro(ctx, x, y, w, h, cv, cp, esp) {
                    if (w <= 0 || h <= 0) return;
                    ctx.fillStyle = cv;
                    ctx.fillRect(x, y, w, h);
                    moldura(ctx, x, y, w, h, cp, esp);
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
                    ctx.strokeStyle = cor;
                    ctx.lineWidth = esp;
                    ctx.beginPath();
                    ctx.moveTo(x2, y2);
                    ctx.lineTo(x2 - t * Math.cos(ang - 0.5), y2 - t * Math.sin(ang - 0.5));
                    ctx.moveTo(x2, y2);
                    ctx.lineTo(x2 - t * Math.cos(ang + 0.5), y2 - t * Math.sin(ang + 0.5));
                    ctx.stroke();
                  }
                
                  function puxador(ctx, cx, cy, r, cor) {
                    ctx.fillStyle = cor;
                    ctx.beginPath();
                    ctx.arc(cx, cy, Math.max(1.2, r), 0, Math.PI * 2);
                    ctx.fill();
                  }
                
                  /* marca de abertura de cada folha das novas tipologias */
                  function marca(ctx, tipo, x, y, w, h, cfg, idx, cor, esp) {
                    var m = Math.max(2, Math.min(w, h) * 0.10);
                    var ix = x + m, iy = y + m, iw = w - 2 * m, ih = h - 2 * m;
                    if (iw <= 2 || ih <= 2) return;
                    var dir;
                    if (cfg.abertura === 'duplo') dir = (idx % 2 === 1);
                    else if (cfg.abertura === 'esq') dir = false;
                    else dir = true;
                
                    if (tipo === 'tombar') {
                      linha(ctx, ix, iy, ix + iw / 2, iy + ih, cor, esp);
                      linha(ctx, ix + iw, iy, ix + iw / 2, iy + ih, cor, esp);
                      return;
                    }
                
                    if (tipo === 'oscilobatente') {
                      var dx = dir ? ix : ix + iw;
                      var px = dir ? ix + iw : ix;
                      linha(ctx, dx, iy, px, iy + ih / 2, cor, esp);
                      linha(ctx, dx, iy + ih, px, iy + ih / 2, cor, esp);
                      linha(ctx, ix, iy, ix + iw / 2, iy + ih, cor, Math.max(0.8, esp * 0.6));
                      linha(ctx, ix + iw, iy, ix + iw / 2, iy + ih, cor, Math.max(0.8, esp * 0.6));
                      return;
                    }
                
                    if (tipo === 'guilhotina') {
                      var cx = ix + iw / 2;
                      if (idx % 2 === 0) seta(ctx, cx, iy + ih * 0.25, cx, iy + ih * 0.85, cor, esp);
                      else seta(ctx, cx, iy + ih * 0.75, cx, iy + ih * 0.15, cor, esp);
                      return;
                    }
                
                    if (tipo === 'pivotante' || tipo === 'portapivotante') {
                      var mx = ix + iw / 2;
                      linha(ctx, mx, iy, mx, iy + ih, cor, Math.max(0.8, esp * 0.6));
                      linha(ctx, ix, iy, mx, iy + ih / 2, cor, esp);
                      linha(ctx, ix + iw, iy + ih, mx, iy + ih / 2, cor, esp);
                      puxador(ctx, mx, iy + ih / 2, Math.max(1.2, iw * 0.05), cor);
                      if (tipo === 'portapivotante') {
                        puxador(ctx, ix + iw * 0.86, iy + ih * 0.55, Math.max(1.2, iw * 0.04), cor);
                      }
                      return;
                    }
                
                    if (tipo === 'sanfonada' || tipo === 'portacamarao') {
                      var meio = iy + ih / 2;
                      if (idx % 2 === 0) {
                        linha(ctx, ix, iy, ix + iw, meio, cor, esp);
                        linha(ctx, ix, iy + ih, ix + iw, meio, cor, esp);
                      } else {
                        linha(ctx, ix + iw, iy, ix, meio, cor, esp);
                        linha(ctx, ix + iw, iy + ih, ix, meio, cor, esp);
                      }
                      return;
                    }
                
                    if (tipo === 'portabalcao' || tipo === 'cortinavidro' || tipo === 'boxbanheiro') {
                      var my = iy + ih / 2;
                      if (idx % 2 === 0) seta(ctx, ix + iw * 0.74, my, ix + iw * 0.16, my, cor, esp);
                      else seta(ctx, ix + iw * 0.26, my, ix + iw * 0.84, my, cor, esp);
                      if (tipo !== 'cortinavidro') {
                        puxador(ctx, ix + iw / 2, iy + ih * 0.8, Math.max(1.2, iw * 0.045), cor);
                      }
                      return;
                    }
                
                    if (tipo === 'portaacustica') {
                      ctx.fillStyle = '#e2e8f0';
                      ctx.fillRect(ix, iy, iw, ih);
                      moldura(ctx, ix + iw * 0.12, iy + ih * 0.1, iw * 0.76, ih * 0.8, cor, Math.max(0.8, esp * 0.7));
                      puxador(ctx, dir ? ix + iw * 0.86 : ix + iw * 0.14, iy + ih * 0.55,
                        Math.max(1.4, iw * 0.05), cor);
                      return;
                    }
                
                    if (tipo === 'persianaint') {
                      var passo = Math.max(2.5, ih / 8);
                      for (var v = iy + passo; v < iy + ih - 1; v += passo) {
                        linha(ctx, ix, v, ix + iw, v, cor, Math.max(0.8, esp * 0.6));
                      }
                      ctx.fillStyle = '#94a3b8';
                      ctx.fillRect(ix, iy, iw, Math.max(2, ih * 0.12));
                      return;
                    }
                
                    if (tipo === 'portaobasculante') {
                      var n = 4;
                      for (var b = 1; b < n; b++) {
                        var yy = iy + (ih * b) / n;
                        linha(ctx, ix, yy, ix + iw, yy, cor, Math.max(0.8, esp * 0.6));
                      }
                      seta(ctx, ix + iw * 0.5, iy + ih * 0.85, ix + iw * 0.5, iy + ih * 0.15, cor, esp);
                      return;
                    }
                
                    /* fixo: cruz leve */
                    linha(ctx, ix, iy, ix + iw, iy + ih, cor, Math.max(0.8, esp * 0.55));
                    linha(ctx, ix + iw, iy, ix, iy + ih, cor, Math.max(0.8, esp * 0.55));
                  }
                
                  /* preenchimentos que ocupam todo o vao */
                  function vaoEspecial(ctx, tipo, x, y, w, h, cfg, cv, cp, cb, cor, esp) {
                    if (w <= 2 || h <= 2) return false;
                
                    if (tipo === 'gradil') {
                      ctx.fillStyle = '#f1f5f9';
                      ctx.fillRect(x, y, w, h);
                      var barras = Math.max(4, Math.min(14, Math.round(w / Math.max(6, w / 8))));
                      for (var i = 1; i < barras; i++) {
                        var bx = x + (w * i) / barras;
                        linha(ctx, bx, y, bx, y + h, cb, Math.max(1, esp * 0.8));
                      }
                      linha(ctx, x, y + h * 0.25, x + w, y + h * 0.25, cb, Math.max(1, esp * 0.9));
                      linha(ctx, x, y + h * 0.75, x + w, y + h * 0.75, cb, Math.max(1, esp * 0.9));
                      moldura(ctx, x, y, w, h, cb, esp);
                      return true;
                    }
                
                    if (tipo === 'brise') {
                      ctx.fillStyle = '#eef2f7';
                      ctx.fillRect(x, y, w, h);
                      var passo = Math.max(4, h / 7);
                      for (var v = y + passo * 0.4; v < y + h; v += passo) {
                        var y2 = Math.min(y + h, v + passo * 0.55);
                        ctx.fillStyle = '#cbd5e1';
                        ctx.beginPath();
                        ctx.moveTo(x, v);
                        ctx.lineTo(x + w, Math.max(y, v - passo * 0.35));
                        ctx.lineTo(x + w, Math.max(y, y2 - passo * 0.35));
                        ctx.lineTo(x, y2);
                        ctx.closePath();
                        ctx.fill();
                        ctx.strokeStyle = cp;
                        ctx.lineWidth = Math.max(0.7, esp * 0.5);
                        ctx.stroke();
                      }
                      moldura(ctx, x, y, w, h, cb, esp);
                      return true;
                    }
                
                    if (tipo === 'tela') {
                      vidro(ctx, x, y, w, h, '#eaf1f8', cp, esp * 0.8);
                      var pv = Math.max(3, w / 9);
                      for (var a = x + pv; a < x + w - 1; a += pv) {
                        linha(ctx, a, y, a, y + h, '#b9c6d6', Math.max(0.5, esp * 0.35));
                      }
                      var ph = Math.max(3, h / 9);
                      for (var b2 = y + ph; b2 < y + h - 1; b2 += ph) {
                        linha(ctx, x, b2, x + w, b2, '#b9c6d6', Math.max(0.5, esp * 0.35));
                      }
                      moldura(ctx, x, y, w, h, cb, esp);
                      return true;
                    }
                
                    if (tipo === 'espelho') {
                      var g = null;
                      try {
                        g = ctx.createLinearGradient(x, y, x + w, y + h);
                        g.addColorStop(0, '#e8eef5');
                        g.addColorStop(0.5, '#cfdbe8');
                        g.addColorStop(1, '#eef3f8');
                      } catch (e) { g = null; }
                      ctx.fillStyle = g || '#dde6ef';
                      ctx.fillRect(x, y, w, h);
                      linha(ctx, x + w * 0.15, y + h, x + w * 0.55, y, '#ffffff', Math.max(1.5, esp * 1.6));
                      linha(ctx, x + w * 0.45, y + h, x + w * 0.72, y, '#ffffff', Math.max(1, esp * 0.9));
                      moldura(ctx, x, y, w, h, cb, esp);
                      return true;
                    }
                
                    if (tipo === 'guardacorpo') {
                      var barra = Math.max(2, h * 0.09);
                      ctx.fillStyle = '#94a3b8';
                      ctx.fillRect(x, y, w, barra);
                      var py = y + barra + Math.max(1, h * 0.03);
                      var ph2 = h - (py - y) - Math.max(1, h * 0.05);
                      var n2 = Math.max(2, cfg.folhas);
                      var vao = Math.max(1.5, w * 0.02);
                      var lw = (w - vao * (n2 - 1)) / n2;
                      for (var p = 0; p < n2; p++) {
                        var px = x + p * (lw + vao);
                        vidro(ctx, px, py, lw, ph2, cv, cp, esp * 0.8);
                      }
                      ctx.fillStyle = '#64748b';
                      ctx.fillRect(x, y + h - Math.max(1.5, h * 0.05), w, Math.max(1.5, h * 0.05));
                      for (var q = 0; q <= n2; q++) {
                        var qx = Math.min(x + w - 1.5, x + q * (lw + vao));
                        ctx.fillRect(qx, py, Math.max(1.5, vao), ph2);
                      }
                      return true;
                    }
                
                    if (tipo === 'peledevidro') {
                      var cols = Math.max(2, cfg.folhas);
                      var rows = Math.max(2, cfg.linhas);
                      var gx = Math.max(1.2, Math.min(w, h) * 0.02);
                      var cw = (w - gx * (cols - 1)) / cols;
                      var ch = (h - gx * (rows - 1)) / rows;
                      for (var r = 0; r < rows; r++) {
                        for (var c = 0; c < cols; c++) {
                          var fx = x + c * (cw + gx);
                          var fy = y + r * (ch + gx);
                          vidro(ctx, fx, fy, cw, ch, (r + c) % 2 === 0 ? cv : '#c3ddf7', cp, esp * 0.7);
                        }
                      }
                      ctx.fillStyle = '#475569';
                      for (var cc = 1; cc < cols; cc++) {
                        ctx.fillRect(x + cc * (cw + gx) - gx, y, gx, h);
                      }
                      for (var rr = 1; rr < rows; rr++) {
                        ctx.fillRect(x, y + rr * (ch + gx) - gx, w, gx);
                      }
                      moldura(ctx, x, y, w, h, cb, esp);
                      return true;
                    }
                
                    return false;
                  }
                
                  function arcoTopo(ctx, x, y, w, h, cv, cp, cb, esp) {
                    if (w <= 2 || h <= 2) return;
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, y + h);
                    ctx.lineTo(x, y + h * 0.35);
                    try {
                      ctx.ellipse(x + w / 2, y + h * 0.35, w / 2, h * 0.35, 0, Math.PI, 0, false);
                    } catch (e) {
                      ctx.lineTo(x + w / 2, y);
                      ctx.lineTo(x + w, y + h * 0.35);
                    }
                    ctx.lineTo(x + w, y + h);
                    ctx.closePath();
                    ctx.fillStyle = cv;
                    ctx.fill();
                    ctx.strokeStyle = cb;
                    ctx.lineWidth = esp;
                    ctx.stroke();
                    ctx.restore();
                    var raios = 3;
                    for (var i = 1; i < raios; i++) {
                      var ang = Math.PI + (Math.PI * i) / raios;
                      linha(ctx, x + w / 2, y + h,
                        x + w / 2 + Math.cos(ang) * (w / 2),
                        y + h * 0.35 + Math.sin(ang) * (h * 0.35), cp, Math.max(0.7, esp * 0.6));
                    }
                  }
                
                  function formaRedonda(ctx, x, y, w, h, cfg, cv, cp, cb, cor, esp) {
                    var cx = x + w / 2, cy = y + h / 2;
                    var rx = w / 2, ry = h / 2;
                    ctx.save();
                    ctx.beginPath();
                    try {
                      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                    } catch (e) {
                      ctx.arc(cx, cy, Math.min(rx, ry), 0, Math.PI * 2);
                    }
                    ctx.fillStyle = cv;
                    ctx.fill();
                    ctx.strokeStyle = cb;
                    ctx.lineWidth = Math.max(1.6, esp * 1.4);
                    ctx.stroke();
                    ctx.restore();
                    var n = Math.max(1, cfg.folhas);
                    if (n > 1) {
                      for (var i = 1; i < n; i++) {
                        var px = x + (w * i) / n;
                        linha(ctx, px, cy - Math.sqrt(Math.max(0, 1 - Math.pow((px - cx) / rx, 2))) * ry,
                          px, cy + Math.sqrt(Math.max(0, 1 - Math.pow((px - cx) / rx, 2))) * ry,
                          cp, Math.max(0.8, esp * 0.7));
                      }
                    } else {
                      linha(ctx, cx - rx * 0.5, cy + ry * 0.5, cx + rx * 0.4, cy - ry * 0.6,
                        cor, Math.max(0.8, esp * 0.6));
                    }
                  }
                
                  function formaTriangulo(ctx, x, y, w, h, cfg, cv, cp, cb, cor, esp) {
                    ctx.beginPath();
                    ctx.moveTo(x + w / 2, y);
                    ctx.lineTo(x + w, y + h);
                    ctx.lineTo(x, y + h);
                    ctx.closePath();
                    ctx.fillStyle = cv;
                    ctx.fill();
                    ctx.strokeStyle = cb;
                    ctx.lineWidth = Math.max(1.6, esp * 1.4);
                    ctx.stroke();
                    linha(ctx, x + w / 2, y, x + w / 2, y + h, cp, Math.max(0.7, esp * 0.6));
                  }
                
                  function formaTrapezio(ctx, x, y, w, h, cfg, cv, cp, cb, cor, esp) {
                    var esq = (cfg.abertura === 'esq');
                    ctx.beginPath();
                    if (esq) {
                      ctx.moveTo(x, y);
                      ctx.lineTo(x + w, y + h * 0.42);
                    } else {
                      ctx.moveTo(x, y + h * 0.42);
                      ctx.lineTo(x + w, y);
                    }
                    ctx.lineTo(x + w, y + h);
                    ctx.lineTo(x, y + h);
                    ctx.closePath();
                    ctx.fillStyle = cv;
                    ctx.fill();
                    ctx.strokeStyle = cb;
                    ctx.lineWidth = Math.max(1.6, esp * 1.4);
                    ctx.stroke();
                    var n = Math.max(1, cfg.folhas);
                    for (var i = 1; i < n; i++) {
                      var px = x + (w * i) / n;
                      linha(ctx, px, y + h, px, y + h * (esq ? (0.42 * i) / n : 0.42 * (1 - i / n)),
                        cp, Math.max(0.7, esp * 0.6));
                    }
                  }
                
                  function pintar(canvas, item, opcoes) {
                    var op = opcoes || {};
                    var W = Math.max(14, op.larguraCanvas || 60);
                    var H = Math.max(14, op.alturaCanvas || 60);
                    var cv = op.corVidro || '#d1e8ff';
                    var cf = op.corFundo || '#f8fafc';
                    var cp = op.corMoldura || '#555';
                    var cb = op.corBorda || '#000';
                    var grande = !!op.escalaTexto;
                    var cfg = lerCfg(item);
                    var tipo = cfg.tipo;
                
                    canvas.width = W;
                    canvas.height = H;
                    var ctx = canvas.getContext('2d');
                    if (!ctx) return;
                
                    ctx.fillStyle = cf;
                    ctx.fillRect(0, 0, W, H);
                
                    var esp = grande ? 2 : 1.2;
                    var cor = grande ? '#e11d48' : '#64748b';
                
                    moldura(ctx, 1.5, 1.5, W - 3, H - 3, cb, grande ? 3 : 2);
                
                    var margem = Math.max(4, Math.min(W, H) * 0.08);
                    var x = margem, y = margem, w = W - 2 * margem, h = H - 2 * margem;
                    if (w <= 6 || h <= 6) { x = 2; y = 2; w = W - 4; h = H - 4; }
                
                    function rodape() {
                      if (grande && item && item.ref) {
                        ctx.fillStyle = '#0f172a';
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(String(item.ref), W / 2, H - 4);
                      }
                    }
                
                    if (tipo === 'oculo') { formaRedonda(ctx, x, y, w, h, cfg, cv, cp, cb, cor, esp); rodape(); return; }
                    if (tipo === 'triangular') { formaTriangulo(ctx, x, y, w, h, cfg, cv, cp, cb, cor, esp); rodape(); return; }
                    if (tipo === 'trapezio') { formaTrapezio(ctx, x, y, w, h, cfg, cv, cp, cb, cor, esp); rodape(); return; }
                
                    var marco = Math.max(2, Math.min(w, h) * 0.05);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x, y, w, h);
                    moldura(ctx, x, y, w, h, cb, grande ? 2.5 : 1.6);
                
                    var ax = x + marco, ay = y + marco, aw = w - 2 * marco, ah = h - 2 * marco;
                
                    if (tipo === 'arco' && ah > 14) {
                      var hArco = Math.min(ah * 0.42, aw * 0.55);
                      arcoTopo(ctx, ax, ay, aw, hArco, cv, cp, cb, esp);
                      ctx.fillStyle = cb;
                      ctx.fillRect(ax, ay + hArco, aw, Math.max(1.5, marco * 0.8));
                      ay = ay + hArco + Math.max(1.5, marco * 0.8);
                      ah = ah - hArco - Math.max(1.5, marco * 0.8);
                    } else if (cfg.bandeira && ah > 14) {
                      var hb = (ah * cfg.bandPerc) / 100;
                      vidro(ctx, ax, ay, aw, hb, cv, cp, esp * 0.9);
                      marca(ctx, 'fixo', ax, ay, aw, hb, cfg, 0, cor, esp * 0.8);
                      ctx.fillStyle = cb;
                      ctx.fillRect(ax, ay + hb, aw, Math.max(1.5, marco * 0.8));
                      ay = ay + hb + Math.max(1.5, marco * 0.8);
                      ah = ah - hb - Math.max(1.5, marco * 0.8);
                    }
                
                    if (vaoEspecial(ctx, tipo, ax, ay, aw, ah, cfg, cv, cp, cb, cor, esp)) {
                      if (COM_SOLEIRA[tipo]) {
                        ctx.fillStyle = cb;
                        ctx.fillRect(x, y + h - Math.max(1.5, marco), w, Math.max(1.5, marco));
                      }
                      rodape();
                      return;
                    }
                
                    var cols = Math.max(1, cfg.folhas);
                    var rows = Math.max(1, cfg.linhas);
                    if (tipo === 'guilhotina') { cols = 1; rows = Math.max(2, cfg.linhas); }
                    var vao = Math.max(1.2, marco * 0.7);
                    var lw = (aw - vao * (cols - 1)) / cols;
                    var lh = (ah - vao * (rows - 1)) / rows;
                    var idx = 0;
                    for (var r = 0; r < rows; r++) {
                      for (var c = 0; c < cols; c++) {
                        var fx = ax + c * (lw + vao);
                        var fy = ay + r * (lh + vao);
                        vidro(ctx, fx, fy, lw, lh, cv, cp, esp * 0.9);
                        marca(ctx, tipo, fx, fy, lw, lh, cfg, (tipo === 'guilhotina' ? r : idx), cor, esp * 0.9);
                        idx++;
                      }
                    }
                
                    ctx.fillStyle = cb;
                    for (var c2 = 1; c2 < cols; c2++) {
                      ctx.fillRect(ax + c2 * (lw + vao) - vao, ay, vao, ah);
                    }
                    for (var r2 = 1; r2 < rows; r2++) {
                      ctx.fillRect(ax, ay + r2 * (lh + vao) - vao, aw, vao);
                    }
                
                    if (tipo === 'portao' || tipo === 'portabalcao' || tipo === 'cortinavidro') {
                      ctx.fillStyle = '#64748b';
                      ctx.fillRect(x, y + h - Math.max(1.5, marco * 0.9), w, Math.max(1.5, marco * 0.9));
                    }
                    if (COM_SOLEIRA[tipo]) {
                      ctx.fillStyle = cb;
                      ctx.fillRect(x, y + h - Math.max(1.5, marco), w, Math.max(1.5, marco));
                    }
                
                    rodape();
                  }
                  P66.pintar = pintar;
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 3 - IMAGEM PROPRIA COMO VISTA                                */
                  /* ------------------------------------------------------------------ */
                  var LIMITE = 260000;   /* tamanho maximo guardado, em caracteres */
                  P66.cache = P66.cache || {};
                
                  function imagemDoItem(item) {
                    if (!item) return '';
                    var u = item.p66img || '';
                    if (!u && typeof item.vistaUrl === 'string' && /^data:image\//.test(item.vistaUrl)) {
                      u = item.vistaUrl;
                    }
                    return u;
                  }
                  P66.imagemDoItem = imagemDoItem;
                
                  function pegarImagem(url, aoCarregar) {
                    if (!url) return null;
                    var g = P66.cache[url];
                    if (g && g.completo) return g.el;
                    if (g && g.erro) return null;
                    if (!g) {
                      var el = new Image();
                      g = P66.cache[url] = { el: el, completo: false, erro: false, fila: [] };
                      el.onload = function () {
                        g.completo = true;
                        var f = g.fila;
                        g.fila = [];
                        for (var i = 0; i < f.length; i++) { try { f[i](); } catch (e) { /* ignora */ } }
                      };
                      el.onerror = function () { g.erro = true; g.fila = []; };
                      try { el.src = url; } catch (e) { g.erro = true; }
                      if (el.complete && el.width) g.completo = true;
                    }
                    if (!g.completo && typeof aoCarregar === 'function') g.fila.push(aoCarregar);
                    return g.completo ? g.el : null;
                  }
                
                  function desenharImagem(canvas, item, opcoes) {
                    var op = opcoes || {};
                    var W = Math.max(14, op.larguraCanvas || 60);
                    var H = Math.max(14, op.alturaCanvas || 60);
                    canvas.width = W;
                    canvas.height = H;
                    var ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    var url = imagemDoItem(item);
                    ctx.fillStyle = op.corFundo || '#ffffff';
                    ctx.fillRect(0, 0, W, H);
                    var img = pegarImagem(url, function () {
                      try { desenharImagem(canvas, item, opcoes); } catch (e) { /* ignora */ }
                    });
                    if (!img) {
                      ctx.strokeStyle = '#cbd5e1';
                      ctx.lineWidth = 1.5;
                      ctx.strokeRect(1, 1, W - 2, H - 2);
                      linha(ctx, 2, H - 2, W - 2, 2, '#e2e8f0', 1);
                      return;
                    }
                    var iw = img.naturalWidth || img.width || 1;
                    var ih = img.naturalHeight || img.height || 1;
                    var esc = Math.min(W / iw, H / ih);
                    var dw = Math.max(1, iw * esc), dh = Math.max(1, ih * esc);
                    try { ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh); } catch (e) { /* ignora */ }
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
                  }
                  P66.desenharImagem = desenharImagem;
                
                  function comprimir(origem, pronto) {
                    var img = new Image();
                    img.onload = function () {
                      var lado = 520, q = 0.72, saida = '';
                      function render() {
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
                        try { cx.drawImage(img, 0, 0, c.width, c.height); } catch (e) { return ''; }
                        try { return c.toDataURL('image/jpeg', q); } catch (e2) {
                          try { return c.toDataURL(); } catch (e3) { return ''; }
                        }
                      }
                      saida = render();
                      var tent = 0;
                      while (saida && saida.length > LIMITE && tent < 5) {
                        lado = Math.round(lado * 0.78);
                        q = Math.max(0.4, q - 0.08);
                        saida = render();
                        tent++;
                      }
                      pronto(saida || null);
                    };
                    img.onerror = function () { pronto(null); };
                    try { img.src = origem; } catch (e) { pronto(null); }
                  }
                
                  function lerArquivo(arquivo, pronto) {
                    if (!arquivo) { pronto(null); return; }
                    if (!/^image\//.test(arquivo.type || '')) {
                      aviso('Escolha um arquivo de imagem (JPG, PNG, WEBP...).', true);
                      pronto(null);
                      return;
                    }
                    try {
                      var fr = new FileReader();
                      fr.onload = function () { comprimir(String(fr.result || ''), pronto); };
                      fr.onerror = function () { pronto(null); };
                      fr.readAsDataURL(arquivo);
                    } catch (e) { pronto(null); }
                  }
                
                  function kb(txt) {
                    return Math.max(1, Math.round(String(txt || '').length * 0.75 / 1024));
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 4 - GRAVACAO NO ITEM                                         */
                  /* ------------------------------------------------------------------ */
                  function itemVivo(item) {
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
                
                  function salvar() {
                    try { if (typeof window.salvarDB === 'function') window.salvarDB(false); } catch (e) { /* ignora */ }
                  }
                
                  function gravar(item, campo, valor) {
                    var alvo = itemVivo(item);
                    try {
                      if (typeof window.editarItem === 'function') window.editarItem(alvo.id, campo, valor);
                      else { alvo[campo] = valor; salvar(); }
                    } catch (e) { /* ignora */ }
                    if (alvo[campo] !== valor) { alvo[campo] = valor; salvar(); }
                    return alvo;
                  }
                
                  function limpar(alvo, campos) {
                    for (var i = 0; i < campos.length; i++) {
                      try { delete alvo[campos[i]]; } catch (e) { alvo[campos[i]] = undefined; }
                    }
                  }
                
                  function recarregar(alvo) {
                    depois(function () {
                      try { if (typeof window.render === 'function') window.render(); } catch (e) { /* ignora */ }
                      try {
                        if (typeof window.abrirPreviewEsquadria === 'function') window.abrirPreviewEsquadria(alvo);
                      } catch (e2) { /* ignora */ }
                    }, 20);
                  }
                
                  function aplicar(item, mudancas) {
                    var alvo = itemVivo(item);
                    for (var k in mudancas) {
                      if (Object.prototype.hasOwnProperty.call(mudancas, k)) alvo = gravar(alvo, k, mudancas[k]);
                    }
                    recarregar(alvo);
                  }
                
                  function escolherTipo(item, tipo) {
                    var alvo = itemVivo(item);
                    var mud = { p66tipo: tipo };
                    if (alvo.p66folhas == null && alvo.p64folhas == null) mud.p66folhas = folhasPadrao(tipo);
                    if (alvo.p66linhas == null && alvo.p64linhas == null) mud.p66linhas = linhasPadrao(tipo);
                    aplicar(alvo, mud);
                  }
                
                  function voltarAutomatico(item) {
                    var alvo = itemVivo(item);
                    limpar(alvo, ['p66tipo', 'p66folhas', 'p66linhas', 'p66bandeira', 'p66bandPerc', 'p66abertura']);
                    limpar(alvo, ['p64tipo', 'p64folhas', 'p64linhas', 'p64bandeira', 'p64bandPerc', 'p64abertura']);
                    salvar();
                    recarregar(alvo);
                  }
                  P66.voltarAutomatico = voltarAutomatico;
                
                  function definirImagem(item, url) {
                    var alvo = itemVivo(item);
                    if (!url) { aviso('Nao consegui ler essa imagem. Tente outro arquivo.', true); return; }
                    if (url.length > LIMITE * 2) {
                      aviso('Imagem grande demais mesmo depois de reduzir. Tente uma foto menor.', true);
                      return;
                    }
                    aplicar(alvo, { p66img: url });
                  }
                  P66.definirImagem = definirImagem;
                
                  function tirarImagem(item) {
                    var alvo = itemVivo(item);
                    limpar(alvo, ['p66img']);
                    if (typeof alvo.vistaUrl === 'string' && /^data:image\//.test(alvo.vistaUrl)) {
                      try { alvo.vistaUrl = ''; } catch (e) { /* ignora */ }
                    }
                    salvar();
                    recarregar(alvo);
                  }
                  P66.tirarImagem = tirarImagem;
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 5 - PAINEL DENTRO DA PRE-VISUALIZACAO                        */
                  /* ------------------------------------------------------------------ */
                  var itemAtual = null;
                
                  function aviso(txt, ruim) {
                    var alvo = porId('p66Aviso');
                    if (alvo) {
                      alvo.textContent = txt;
                      alvo.className = 'p66-aviso' + (ruim ? ' p66-aviso-ruim' : ' p66-aviso-bom');
                      return;
                    }
                    try { console.log('[P66] ' + txt); } catch (e) { /* ignora */ }
                  }
                
                  function chip(tipo) {
                    var c = document.createElement('canvas');
                    var falso = {
                      ref: '', tipo: '', larg: 1, alt: 1,
                      p66tipo: tipo,
                      p66folhas: folhasPadrao(tipo),
                      p66linhas: linhasPadrao(tipo),
                      p66abertura: 'dir'
                    };
                    try {
                      pintar(c, falso, { larguraCanvas: 54, alturaCanvas: 42, corFundo: '#ffffff', corVidro: '#dbeafe' });
                    } catch (e) { /* ignora */ }
                    return c;
                  }
                
                  function montarGaleria(caixa, item) {
                    var cfg = lerCfg(item);
                    var area = document.createElement('div');
                    area.className = 'p66-galeria';
                    for (var g = 0; g < GRUPOS.length; g++) {
                      var grupo = GRUPOS[g];
                      var tit = document.createElement('div');
                      tit.className = 'p66-grupo';
                      tit.textContent = grupo;
                      area.appendChild(tit);
                      var faixa = document.createElement('div');
                      faixa.className = 'p66-chips';
                      var achou = false;
                      for (var i = 0; i < TIPOS.length; i++) {
                        if (TIPOS[i][2] !== grupo) continue;
                        achou = true;
                        (function (chave, nome, busca) {
                          var bt = document.createElement('button');
                          bt.type = 'button';
                          bt.className = 'p66-chip' + (cfg.tipo === chave ? ' p66-chip-on' : '');
                          bt.setAttribute('data-p66tipo', chave);
                          bt.setAttribute('data-p66busca', semAcento(nome + ' ' + busca));
                          bt.appendChild(chip(chave));
                          var leg = document.createElement('span');
                          leg.textContent = nome;
                          bt.appendChild(leg);
                          bt.addEventListener('click', function (ev) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            escolherTipo(item, chave);
                          });
                          faixa.appendChild(bt);
                        }(TIPOS[i][0], TIPOS[i][1], TIPOS[i][3]));
                      }
                      if (achou) area.appendChild(faixa);
                      else if (tit.parentNode) tit.parentNode.removeChild(tit);
                    }
                    caixa.appendChild(area);
                  }
                
                  function filtrar(caixa, termo) {
                    var t = semAcento(termo).replace(/^\s+|\s+$/g, '');
                    var faixas = caixa.querySelectorAll('.p66-chips');
                    for (var f = 0; f < faixas.length; f++) {
                      var chips = faixas[f].querySelectorAll('.p66-chip');
                      var visiveis = 0;
                      for (var i = 0; i < chips.length; i++) {
                        var b = chips[i].getAttribute('data-p66busca') || '';
                        var ok = !t || b.indexOf(t) >= 0;
                        chips[i].style.display = ok ? '' : 'none';
                        if (ok) visiveis++;
                      }
                      faixas[f].style.display = visiveis ? '' : 'none';
                      var tit = faixas[f].previousSibling;
                      while (tit && tit.nodeType !== 1) tit = tit.previousSibling;
                      if (tit && String(tit.className || '') === 'p66-grupo') {
                        tit.style.display = visiveis ? '' : 'none';
                      }
                    }
                  }
                
                  function painel(item) {
                    var cfg = lerCfg(item);
                    var url = imagemDoItem(item);
                
                    var caixa = document.createElement('div');
                    caixa.className = 'p66-editor';
                
                    var topo = document.createElement('div');
                    topo.className = 'p66-topo';
                    topo.innerHTML = '<div class="p66-titulo">Mais tipologias e imagem propria' +
                      (cfg.tipo ? '<span class="p66-tag">' + seguro(nomeTipo(cfg.tipo)) + '</span>' : '') +
                      (url ? '<span class="p66-tag p66-tag-img">imagem anexada</span>' : '') +
                      '</div>' +
                      '<div class="p66-sub">Escolha uma das tipologias abaixo ou anexe uma foto/desenho seu. ' +
                      'A miniatura da coluna Vista muda na hora, em todas as abas.</div>';
                    caixa.appendChild(topo);
                
                    /* ---- imagem propria ---- */
                    var zona = document.createElement('div');
                    zona.className = 'p66-zona';
                    zona.innerHTML =
                      '<div class="p66-zona-txt">' +
                      '<b>Imagem propria como Vista</b>' +
                      '<span>Arraste um arquivo aqui, cole com Ctrl+V ou clique em Escolher imagem. ' +
                      'A foto e reduzida antes de ser guardada e passa a substituir o desenho deste item.</span>' +
                      '</div>' +
                      '<div class="p66-zona-bts">' +
                      '<button type="button" class="p66-btn p66-btn-forte" data-p66escolher="1">Escolher imagem</button>' +
                      (url ? '<button type="button" class="p66-btn p66-btn-ruim" data-p66tirar="1">Remover imagem</button>' : '') +
                      '</div>' +
                      '<input type="file" accept="image/*" class="p66-file" data-p66input="1">' +
                      '<div class="p66-aviso" id="p66Aviso">' +
                      (url ? ('Imagem anexada (cerca de ' + kb(url) + ' KB).') : 'Nenhuma imagem anexada neste item.') +
                      '</div>';
                    caixa.appendChild(zona);
                
                    if (url) {
                      var mini = document.createElement('div');
                      mini.className = 'p66-mini';
                      var im = document.createElement('img');
                      im.src = url;
                      im.alt = 'Vista do item';
                      mini.appendChild(im);
                      caixa.appendChild(mini);
                    }
                
                    /* ---- busca ---- */
                    var busca = document.createElement('div');
                    busca.className = 'p66-busca';
                    busca.innerHTML = '<input type="text" placeholder="Buscar tipologia (ex.: pivotante, box, portao)" ' +
                      'data-p66busca-campo="1">';
                    caixa.appendChild(busca);
                
                    montarGaleria(caixa, item);
                
                    /* ---- ajustes finos ---- */
                    var ajus = document.createElement('div');
                    ajus.className = 'p66-ajustes';
                    var html = '<label class="p66-rot">Divisoes na largura</label><div class="p66-passos" data-p66grupo="p66folhas">';
                    for (var f = 1; f <= 8; f++) {
                      html += '<button type="button" class="p66-passo' + (cfg.folhas === f ? ' p66-ativo' : '') +
                        '" data-p66val="' + f + '">' + f + '</button>';
                    }
                    html += '</div><label class="p66-rot">Divisoes na altura</label>' +
                      '<div class="p66-passos" data-p66grupo="p66linhas">';
                    for (var l = 1; l <= 6; l++) {
                      html += '<button type="button" class="p66-passo' + (cfg.linhas === l ? ' p66-ativo' : '') +
                        '" data-p66val="' + l + '">' + l + '</button>';
                    }
                    html += '</div><label class="p66-rot">Sentido de abertura</label>' +
                      '<div class="p66-passos" data-p66grupo="p66abertura">' +
                      '<button type="button" class="p66-passo p66-largo' + (cfg.abertura === 'dir' ? ' p66-ativo' : '') +
                      '" data-p66val="dir">Abre a direita</button>' +
                      '<button type="button" class="p66-passo p66-largo' + (cfg.abertura === 'esq' ? ' p66-ativo' : '') +
                      '" data-p66val="esq">Abre a esquerda</button>' +
                      '<button type="button" class="p66-passo p66-largo' + (cfg.abertura === 'duplo' ? ' p66-ativo' : '') +
                      '" data-p66val="duplo">Abre nos dois lados</button>' +
                      '</div>';
                    html += '<label class="p66-rot">Bandeira em cima</label><div class="p66-passos">' +
                      '<button type="button" class="p66-passo p66-largo' + (cfg.bandeira ? ' p66-ativo' : '') +
                      '" data-p66band="1">' + (cfg.bandeira ? 'Com bandeira' : 'Sem bandeira') + '</button>';
                    if (cfg.bandeira) {
                      html += '<input class="p66-num" type="number" min="10" max="50" step="1" value="' +
                        cfg.bandPerc + '" data-p66perc="1"><span class="p66-uni">% da altura</span>';
                    }
                    html += '</div>';
                    html += '<div class="p66-pe"><button type="button" class="p66-btn" data-p66auto="1">' +
                      'Voltar ao desenho automatico</button></div>';
                    ajus.innerHTML = html;
                    caixa.appendChild(ajus);
                
                    /* ---- ligacoes ---- */
                    var campoBusca = caixa.querySelector('[data-p66busca-campo]');
                    if (campoBusca) {
                      campoBusca.addEventListener('input', function () { filtrar(caixa, this.value); });
                      campoBusca.addEventListener('click', function (ev) { ev.stopPropagation(); });
                      campoBusca.addEventListener('keydown', function (ev) {
                        ev.stopPropagation();
                        if (ev.key === 'Enter') ev.preventDefault();
                      });
                    }
                
                    var entrada = caixa.querySelector('[data-p66input]');
                    var btEscolher = caixa.querySelector('[data-p66escolher]');
                    if (btEscolher && entrada) {
                      btEscolher.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        try { entrada.value = ''; } catch (e) { /* ignora */ }
                        entrada.click();
                      });
                      entrada.addEventListener('change', function () {
                        var arq = (this.files && this.files[0]) || null;
                        if (!arq) return;
                        aviso('Reduzindo a imagem...', false);
                        lerArquivo(arq, function (url2) { definirImagem(item, url2); });
                      });
                      entrada.addEventListener('click', function (ev) { ev.stopPropagation(); });
                    }
                
                    var btTirar = caixa.querySelector('[data-p66tirar]');
                    if (btTirar) {
                      btTirar.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        tirarImagem(item);
                      });
                    }
                
                    zona.addEventListener('dragover', function (ev) {
                      ev.preventDefault();
                      ev.stopPropagation();
                      zona.className = 'p66-zona p66-zona-on';
                    });
                    zona.addEventListener('dragleave', function () { zona.className = 'p66-zona'; });
                    zona.addEventListener('drop', function (ev) {
                      ev.preventDefault();
                      ev.stopPropagation();
                      zona.className = 'p66-zona';
                      var dt = ev.dataTransfer;
                      var arq = (dt && dt.files && dt.files[0]) || null;
                      if (!arq) return;
                      aviso('Reduzindo a imagem...', false);
                      lerArquivo(arq, function (url2) { definirImagem(item, url2); });
                    });
                
                    var grupos = caixa.querySelectorAll('[data-p66grupo]');
                    for (var g2 = 0; g2 < grupos.length; g2++) {
                      (function (grupo) {
                        var campo = grupo.getAttribute('data-p66grupo');
                        var bts = grupo.querySelectorAll('.p66-passo');
                        for (var b = 0; b < bts.length; b++) {
                          bts[b].addEventListener('click', function (ev) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            var v = this.getAttribute('data-p66val');
                            var mud = {};
                            if (campo === 'p66abertura') { mud.p66abertura = v; mud.p64abertura = v; }
                            else if (campo === 'p66folhas') {
                              mud.p66folhas = inteiro(v, 1, 8, 2);
                              mud.p64folhas = inteiro(v, 1, 6, 2);
                            } else {
                              mud.p66linhas = inteiro(v, 1, 6, 1);
                              mud.p64linhas = inteiro(v, 1, 4, 1);
                            }
                            aplicar(item, mud);
                          });
                        }
                      }(grupos[g2]));
                    }
                
                    var bBand = caixa.querySelector('[data-p66band]');
                    if (bBand) {
                      bBand.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        var atual = lerCfg(item);
                        aplicar(item, {
                          p66bandeira: !atual.bandeira, p66bandPerc: atual.bandPerc,
                          p64bandeira: !atual.bandeira, p64bandPerc: atual.bandPerc
                        });
                      });
                    }
                
                    var cPerc = caixa.querySelector('[data-p66perc]');
                    if (cPerc) {
                      cPerc.addEventListener('change', function () {
                        var v = inteiro(this.value, 10, 50, 22);
                        aplicar(item, { p66bandPerc: v, p64bandPerc: v });
                      });
                      cPerc.addEventListener('click', function (ev) { ev.stopPropagation(); });
                      cPerc.addEventListener('keydown', function (ev) {
                        ev.stopPropagation();
                        if (ev.key === 'Enter') { ev.preventDefault(); this.blur(); }
                      });
                    }
                
                    var bAuto = caixa.querySelector('[data-p66auto]');
                    if (bAuto) {
                      bAuto.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        voltarAutomatico(item);
                      });
                    }
                
                    return caixa;
                  }
                
                  function trocarCanvasPelaImagem(conteudo, item, painelP66) {
                    var url = imagemDoItem(item);
                    if (!url) return;
                    var telas = conteudo.querySelectorAll('canvas');
                    var achou = false;
                    for (var i = 0; i < telas.length; i++) {
                      var t = telas[i];
                      if (painelP66 && painelP66.contains(t)) continue;
                      var editor = t.parentNode;
                      var dentroEditor = false;
                      while (editor && editor !== conteudo) {
                        if (editor.className && String(editor.className).indexOf('p64-editor') >= 0) dentroEditor = true;
                        editor = editor.parentNode;
                      }
                      if (dentroEditor) continue;
                      t.style.display = 'none';
                      achou = true;
                      if (!t.parentNode || t.parentNode.querySelector('.p66-vista')) continue;
                      var box = document.createElement('div');
                      box.className = 'p66-vista';
                      var im = document.createElement('img');
                      im.src = url;
                      im.alt = 'Vista do item';
                      box.appendChild(im);
                      var leg = document.createElement('div');
                      leg.className = 'p66-vista-leg';
                      leg.textContent = 'Imagem anexada por voce';
                      box.appendChild(leg);
                      t.parentNode.insertBefore(box, t);
                    }
                    return achou;
                  }
                
                  function decorar(item) {
                    itemAtual = itemVivo(item);
                    var conteudo = porId('previewEsquadriaContent');
                    if (!conteudo) return;
                
                    var antigo = conteudo.querySelector('.p66-editor');
                    if (antigo && antigo.parentNode) antigo.parentNode.removeChild(antigo);
                
                    var novo = painel(itemAtual);
                
                    /* se o item tem tipologia do patch 66, redesenha o canvas grande */
                    var cfg = lerCfg(itemAtual);
                    if (cfg.tipo && !imagemDoItem(itemAtual)) {
                      var telas = conteudo.querySelectorAll('canvas');
                      for (var i = 0; i < telas.length; i++) {
                        var t = telas[i];
                        var dentro = false;
                        var p = t.parentNode;
                        while (p && p !== conteudo) {
                          if (p.className && String(p.className).indexOf('-editor') >= 0) dentro = true;
                          p = p.parentNode;
                        }
                        if (dentro) continue;
                        try {
                          pintar(t, itemAtual, {
                            larguraCanvas: t.width || 300, alturaCanvas: t.height || 300,
                            corVidro: '#d1e8ff', corFundo: '#fff', escalaTexto: true
                          });
                        } catch (e) { /* ignora */ }
                      }
                    }
                
                    conteudo.appendChild(novo);
                    try { trocarCanvasPelaImagem(conteudo, itemAtual, novo); } catch (e2) { /* ignora */ }
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* PARTE 6 - LIGACOES COM O PAINEL                                    */
                  /* ------------------------------------------------------------------ */
                  function ligarDesenho() {
                    var original = window.desenharEsquadriaCanvas;
                    if (typeof original !== 'function' || original.__p66) return;
                    var novo = function (canvas, item, opcoes) {
                      if (item && imagemDoItem(item)) {
                        try { return desenharImagem(canvas, item, opcoes || {}); } catch (e) { /* cai no antigo */ }
                      }
                      if (item && ehTipo66(item.p66tipo)) {
                        try { return pintar(canvas, item, opcoes || {}); } catch (e2) { /* cai no antigo */ }
                      }
                      return original.apply(this, arguments);
                    };
                    novo.__p66 = true;
                    P66.__desenhoAnterior = original;
                    window.desenharEsquadriaCanvas = novo;
                  }
                
                  function ligarMiniatura() {
                    var original = window.gerarMiniaturaEsquadria;
                    if (typeof original !== 'function' || original.__p66) return;
                    var novo = function (item, tamanho) {
                      var url = imagemDoItem(item);
                      if (url) return url;
                      return original.apply(this, arguments);
                    };
                    novo.__p66 = true;
                    window.gerarMiniaturaEsquadria = novo;
                  }
                
                  function ligarPreview() {
                    var abrir = window.abrirPreviewEsquadria;
                    if (typeof abrir !== 'function' || abrir.__p66) return;
                    var novo = function (item) {
                      var r;
                      try { r = abrir.apply(this, arguments); } catch (e) { /* segue */ }
                      try { decorar(item); } catch (e2) { /* ignora */ }
                      return r;
                    };
                    novo.__p66 = true;
                    window.abrirPreviewEsquadria = novo;
                  }
                
                  /* se o usuario escolher uma das tipologias do patch 64, o patch 66 sai da frente */
                  function ligarConvivencia() {
                    if (P66.__conv) return;
                    P66.__conv = true;
                    document.addEventListener('click', function (ev) {
                      var no = ev.target;
                      while (no && no.nodeType === 1) {
                        if (no.getAttribute && no.getAttribute('data-p64tipo')) {
                          if (itemAtual) {
                            limpar(itemAtual, ['p66tipo']);
                            salvar();
                          }
                          return;
                        }
                        if (no.getAttribute && no.getAttribute('data-p64auto')) {
                          if (itemAtual) {
                            limpar(itemAtual, ['p66tipo', 'p66folhas', 'p66linhas',
                              'p66bandeira', 'p66bandPerc', 'p66abertura']);
                            salvar();
                          }
                          return;
                        }
                        no = no.parentNode;
                      }
                    }, true);
                  }
                
                  /* colar imagem com Ctrl+V enquanto a pre-visualizacao esta aberta */
                  function ligarColar() {
                    if (P66.__colar) return;
                    P66.__colar = true;
                    document.addEventListener('paste', function (ev) {
                      var m = porId('modalPreviewEsquadria');
                      if (!m || !itemAtual) return;
                      var vis = false;
                      try { vis = window.getComputedStyle(m).display !== 'none'; } catch (e) { vis = m.style.display !== 'none'; }
                      if (!vis) return;
                      var dados = ev.clipboardData || window.clipboardData;
                      if (!dados) return;
                      var itens = dados.items || [];
                      for (var i = 0; i < itens.length; i++) {
                        var it = itens[i];
                        if (it && it.kind === 'file' && /^image\//.test(it.type || '')) {
                          var arq = null;
                          try { arq = it.getAsFile(); } catch (e2) { arq = null; }
                          if (arq) {
                            ev.preventDefault();
                            aviso('Reduzindo a imagem colada...', false);
                            var alvo = itemAtual;
                            lerArquivo(arq, function (url) { definirImagem(alvo, url); });
                            return;
                          }
                        }
                      }
                    }, true);
                  }
                
                  /* deixa as imagens dos itens prontas para os desenhos e para a impressao */
                  function aquecer() {
                    try {
                      var obra = (typeof window.getObraAtual === 'function') ? window.getObraAtual() : null;
                      var lista = (obra && obra.itens) || [];
                      for (var i = 0; i < lista.length; i++) {
                        var u = imagemDoItem(lista[i]);
                        if (u) pegarImagem(u, null);
                      }
                    } catch (e) { /* ignora */ }
                  }
                  P66.aquecer = aquecer;
                
                  P66.ajuda = function () {
                    var linhas = [
                      'PATCH 66 - mais tipologias e imagem propria',
                      'Abra a pre-visualizacao clicando na miniatura da coluna Vista.',
                      'Tipologias novas: ' + TIPOS.length + ' opcoes, com busca por nome.',
                      'Imagem propria: Escolher imagem, arrastar o arquivo ou Ctrl+V.',
                      'P66.tirarImagem(item)  remove a imagem de um item',
                      'P66.voltarAutomatico(item)  volta ao desenho automatico'
                    ];
                    try { console.log(linhas.join('\n')); } catch (e) { /* ignora */ }
                    return linhas.length;
                  };
                
                  /* ------------------------------------------------------------------ */
                  /* PARTIDA                                                            */
                  /* ------------------------------------------------------------------ */
                  function iniciar() {
                    ligarDesenho();
                    ligarMiniatura();
                    ligarPreview();
                    ligarConvivencia();
                    ligarColar();
                    aquecer();
                    P66.__pronto = true;
                  }
                
                  function partir() {
                    try { iniciar(); } catch (e) { /* ignora */ }
                    depois(function () { try { iniciar(); } catch (e) { /* ignora */ } }, 900);
                    depois(function () { try { iniciar(); } catch (e) { /* ignora */ } }, 2500);
                    try {
                      console.log('PATCH 66 ativo: ' + TIPOS.length +
                        ' tipologias novas no desenho e imagem propria como Vista. Use P66.ajuda().');
                    } catch (e2) { /* ignora */ }
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', partir);
                  } else {
                    partir();
                  }
                }());
            
