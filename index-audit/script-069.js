
        /* ====== PATCH99_EDITOR_LIVRE_FPDO - mover, redimensionar e editar tudo nos slides ====== */
        (function () {
          'use strict';
          if (window.__PS99) { return; }
          window.__PS99 = true;
        
          /* ---------------- medidas do slide (iguais ao patch 94) ---------------- */
          var LARG = 1280;
          var ALT = 720;
          var PT = ALT / 540;              /* 1 ponto do PowerPoint em px */
          var POL_L = 13.333;
          var POL_A = 7.5;
        
          var K_ULT = 'p92_fpdo_ultimo_v1';
          var LS_AJ = 'p99_ajustes_v1';
          var DB = 'p99_ajustes_v1';
          var LOJA = 'aj';
        
          var TOL = 1.2;                   /* folga total (%) para reconhecer a peca */
          var MAXLADO = 1400;
          var QUAL = 0.82;
        
          var AJ = {};                     /* { idRelatorio: { p:[pecas], x:[extras] } } */
          var SELO = 1;                    /* muda a cada alteracao, obriga a redesenhar */
          var editando = false;
          var sel = null;
          var pilha = [];
          var arraste = null;
        
          /* ---------------- utilidades ---------------- */
          function esc(s) {
            return String(s == null ? '' : s)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          }
        
          function n1(v) {
            var n = parseFloat(v);
            if (isNaN(n)) { return 0; }
            return Math.round(n * 10) / 10;
          }
        
          function aviso(msg, tipo) {
            if (typeof window.mostrarToastPainel === 'function') {
              try { window.mostrarToastPainel(msg, tipo === 'erro' ? 'erro' : 'ok'); return; } catch (e) {}
            }
            var d = document.getElementById('p99Aviso');
            if (!d) {
              d = document.createElement('div');
              d.id = 'p99Aviso';
              document.body.appendChild(d);
            }
            d.textContent = String(msg || '');
            d.className = tipo === 'erro' ? 'p99-ruim' : 'p99-bom';
            d.style.display = 'block';
            if (d.__t) { clearTimeout(d.__t); }
            d.__t = setTimeout(function () { d.style.display = 'none'; }, 3600);
          }
        
          /* ---------------- onde guardar (banco do navegador + copia simples) ---------------- */
          function idb(ok, falhou) {
            try {
              if (!window.indexedDB) { falhou(); return; }
              var r = window.indexedDB.open(DB, 1);
              r.onupgradeneeded = function () {
                try { r.result.createObjectStore(LOJA, { keyPath: 'id' }); } catch (e) {}
              };
              r.onsuccess = function () { ok(r.result); };
              r.onerror = function () { falhou(); };
            } catch (e2) { falhou(); }
          }
        
          function lsLer() {
            try { return JSON.parse(localStorage.getItem(LS_AJ) || '{}') || {}; } catch (e) { return {}; }
          }
        
          function carregar(depois) {
            var base = lsLer();
            function fim() { AJ = base || {}; if (depois) { depois(); } }
            idb(function (b) {
              try {
                var t = b.transaction(LOJA, 'readonly');
                var r = t.objectStore(LOJA).getAll();
                r.onsuccess = function () {
                  (r.result || []).forEach(function (it) {
                    if (it && it.id) { base[it.id] = { p: it.p || [], x: it.x || [] }; }
                  });
                  fim();
                };
                r.onerror = fim;
              } catch (e) { fim(); }
            }, fim);
          }
        
          function idAtual() {
            try { return localStorage.getItem(K_ULT) || 'sem_id'; } catch (e) { return 'sem_id'; }
          }
        
          function ajAtual() {
            var id = idAtual();
            if (!AJ[id]) { AJ[id] = { p: [], x: [] }; }
            if (!AJ[id].p) { AJ[id].p = []; }
            if (!AJ[id].x) { AJ[id].x = []; }
            return AJ[id];
          }
        
          function gravar() {
            var id = idAtual();
            var a = ajAtual();
            idb(function (b) {
              try {
                var t = b.transaction(LOJA, 'readwrite');
                t.objectStore(LOJA).put({ id: id, p: a.p, x: a.x });
              } catch (e) {}
            }, function () {});
            try {
              var todo = lsLer();
              todo[id] = a;
              localStorage.setItem(LS_AJ, JSON.stringify(todo));
            } catch (e2) {}
          }
        
          function guardaPassado() {
            var a = ajAtual();
            try { pilha.push(JSON.stringify(a)); } catch (e) { return; }
            if (pilha.length > 40) { pilha.shift(); }
          }
        
          function desfazer() {
            if (!pilha.length) { aviso('Nao tem mais nada para desfazer.', 'erro'); return; }
            var s = pilha.pop();
            var id = idAtual();
            try { AJ[id] = JSON.parse(s); } catch (e) { return; }
            gravar();
            mudou();
            aviso('Desfeito.');
          }
        
          function mudou() {
            SELO++;
            aplicarTudo();
            if (sel && !document.body.contains(sel)) { selecionar(null); }
            marcarSel();
          }
        
          /* ---------------- ler / escrever a posicao de uma peca ---------------- */
          function geomDe(el) {
            var s = el.getAttribute('style') || '';
            function v(nome) {
              var m = new RegExp(nome + '\\s*:\\s*(-?[0-9.]+)%').exec(s);
              return m ? n1(m[1]) : 0;
            }
            return { l: v('left'), t: v('top'), w: v('width'), h: v('height') };
          }
        
          function porGeom(el, g) {
            el.style.left = g.l + '%';
            el.style.top = g.t + '%';
            el.style.width = g.w + '%';
            el.style.height = g.h + '%';
          }
        
          function tipoDe(el) {
            if (el.classList.contains('p94-i')) { return 'img'; }
            if (el.classList.contains('p94-q')) { return 'quad'; }
            return 'txt';
          }
        
          function chave(s, g) {
            return s + '|' + n1(g.l) + ',' + n1(g.t) + ',' + n1(g.w) + ',' + n1(g.h);
          }
        
          function achar(s, g, criar) {
            var a = ajAtual();
            var k = chave(s, g);
            var i;
            for (i = 0; i < a.p.length; i++) { if (a.p[i].key === k) { return a.p[i]; } }
            if (!criar) { return null; }
            var novo = { key: k, s: s, ol: n1(g.l), ot: n1(g.t), ow: n1(g.w), oh: n1(g.h) };
            a.p.push(novo);
            return novo;
          }
        
          function acharPerto(s, g) {
            var a = ajAtual();
            var i, o, melhor = null, dif, mdif = TOL;
            for (i = 0; i < a.p.length; i++) {
              o = a.p[i];
              if (o.s !== s) { continue; }
              dif = Math.abs(o.ol - g.l) + Math.abs(o.ot - g.t) + Math.abs(o.ow - g.w) + Math.abs(o.oh - g.h);
              if (dif <= mdif) { mdif = dif; melhor = o; }
            }
            return melhor;
          }
        
          /* ---------------- pecas de um slide na tela ---------------- */
          function pecasDe(folha) {
            var out = [], i, f = folha.children;
            for (i = 0; i < f.length; i++) {
              var c = f[i];
              if (!c.classList) { continue; }
              if (c.hasAttribute('data-p99x')) { continue; }
              if (c.classList.contains('p96-fundo') || c.classList.contains('p96-veu')) { continue; }
              if (c.classList.contains('p94-t') || c.classList.contains('p94-i') || c.classList.contains('p94-q')) { out.push(c); }
            }
            return out;
          }
        
          function textoDe(el) {
            return String(el.textContent || '').replace(/\u00a0/g, ' ');
          }
        
          function porTexto(el, txt) {
            var linhas = String(txt == null ? '' : txt).split(/\r?\n/);
            if (el.querySelector('.p94-li')) {
              var pt = el.querySelector('.p94-li.p94-pt') ? ' p94-pt' : '';
              el.innerHTML = linhas.map(function (l) {
                return '<div class="p94-li' + pt + '">' + esc(l) + '</div>';
              }).join('');
              return;
            }
            el.innerHTML = '<span>' + linhas.map(esc).join('<br>') + '</span>';
          }
        
          /* ---------------- aplicar os ajustes numa folha desenhada ---------------- */
          function aplicarFolha(folha, s) {
            var selo = SELO + ':' + idAtual();
            if (folha.getAttribute('data-p99') === selo) { return; }
            folha.setAttribute('data-p99', selo);
            folha.setAttribute('data-p99s', String(s));
        
            var a = ajAtual();
            var pecas = pecasDe(folha);
        
            pecas.forEach(function (el, i) {
              if (!el.__p99o) {
                el.__p99o = {
                  g: geomDe(el),
                  html: el.innerHTML,
                  fs: el.style.fontSize || '',
                  cor: el.style.color || '',
                  bg: el.style.background || ''
                };
              }
              var o0 = el.__p99o;
              /* volta ao estado original antes de aplicar (deixa tudo previsivel) */
              porGeom(el, o0.g);
              if (el.innerHTML !== o0.html) { el.innerHTML = o0.html; }
              el.style.fontSize = o0.fs;
              if (o0.cor) { el.style.color = o0.cor; }
              if (el.__p99hid) { el.__p99hid = false; el.style.display = ''; }
              el.setAttribute('data-p99i', String(i));
              el.setAttribute('data-p99k', tipoDe(el));
        
              var o = achar(s, o0.g, false) || acharPerto(s, o0.g);
              if (!o) { return; }
              if (o.del) { el.__p99hid = true; el.style.display = 'none'; return; }
              porGeom(el, { l: o.l == null ? o0.g.l : o.l, t: o.t == null ? o0.g.t : o.t,
                            w: o.w == null ? o0.g.w : o.w, h: o.h == null ? o0.g.h : o.h });
              if (o.fs) { el.style.fontSize = o.fs + 'px'; }
              if (o.cor) { el.style.color = o.cor; }
              if (o.v != null && !el.classList.contains('p94-i') && !el.classList.contains('p94-q')) { porTexto(el, o.v); }
              if (o.u != null && el.classList.contains('p94-i')) {
                var im = el.querySelector('img');
                if (im) {
                  im.setAttribute('src', o.u);
                  im.style.objectFit = o.fit || im.style.objectFit || 'contain';
                }
              }
              if (o.fit && el.classList.contains('p94-i')) {
                var im2 = el.querySelector('img');
                if (im2) { im2.style.objectFit = o.fit; }
              }
              if (o.cor && el.classList.contains('p94-q')) { el.style.background = o.cor; }
            });
        
            /* pecas novas criadas pelo usuario */
            var velhos = folha.querySelectorAll('[data-p99x]');
            var j;
            for (j = 0; j < velhos.length; j++) {
              if (velhos[j].parentNode) { velhos[j].parentNode.removeChild(velhos[j]); }
            }
            a.x.forEach(function (o, i) {
              if (o.s !== s || o.del) { return; }
              folha.appendChild(elExtra(o, i));
            });
          }
        
          function elExtra(o, i) {
            var d = document.createElement('div');
            d.setAttribute('data-p99x', String(i));
            d.setAttribute('data-p99k', o.k === 'img' ? 'img' : 'txt');
            d.style.left = o.l + '%';
            d.style.top = o.t + '%';
            d.style.width = o.w + '%';
            d.style.height = o.h + '%';
            if (o.k === 'img') {
              d.className = 'p94-i';
              d.innerHTML = '<img src="' + esc(o.u || '') + '" alt="foto" style="object-fit:' + (o.fit || 'contain') + '">';
            } else {
              d.className = 'p94-t p94-top';
              d.style.color = o.cor || '#FFFFFF';
              d.style.fontSize = (o.fs || 22) + 'px';
              d.style.fontWeight = o.b ? '700' : '400';
              d.style.textAlign = o.al || 'left';
              d.style.zIndex = '4';
              porTexto(d, o.v || 'Escreva aqui');
            }
            return d;
          }
        
          function aplicarTudo() {
            /* cada area (conferencia, PDF, impressao) conta os slides do zero */
            var folhas = document.querySelectorAll('.p94-folha');
            var pais = [], conta = [], i, p, k;
            for (i = 0; i < folhas.length; i++) {
              p = folhas[i].parentNode;
              k = pais.indexOf(p);
              if (k < 0) { pais.push(p); conta.push(0); k = pais.length - 1; }
              try { aplicarFolha(folhas[i], conta[k]); } catch (e) {}
              conta[k] = conta[k] + 1;
            }
            if (editando) { marcarEditaveis(); }
          }
        
          /* ---------------- aparencia do editor ---------------- */
          var ID_ESTILO = 'p99Estilo';
        
          function estilo() {
            if (document.getElementById(ID_ESTILO)) { return; }
            var css = [
              '#p99Aviso{position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:330px;',
              'padding:10px 14px;border-radius:10px;font:600 13px Arial,sans-serif;color:#fff;display:none;',
              'box-shadow:0 10px 26px rgba(0,0,0,.35)}',
              '#p99Aviso.p99-bom{background:#15803d}',
              '#p99Aviso.p99-ruim{background:#b91c1c}',
              '#p94Fundo .p99-bt{border:1px solid #475569;background:#1e293b;color:#e2e8f0;border-radius:8px;',
              'padding:7px 11px;font:600 12px Arial,sans-serif;cursor:pointer}',
              '#p94Fundo .p99-bt:hover{background:#334155}',
              '#p94Fundo .p99-bt.p99-on{background:#15803d;border-color:#22c55e;color:#fff}',
              '#p94Fundo .p99-linha{display:flex;gap:6px;flex-wrap:wrap;align-items:center;width:100%;',
              'padding-top:6px;border-top:1px solid #334155;margin-top:2px}',
              '#p94Fundo .p99-dica{color:#94a3b8;font:400 11px Arial,sans-serif}',
              '.p99-edit .p94-t,.p99-edit .p94-i,.p99-edit .p94-q{outline:1px dashed rgba(148,163,184,.55);',
              'outline-offset:-1px;cursor:move}',
              '.p99-edit .p94-t:hover,.p99-edit .p94-i:hover,.p99-edit .p94-q:hover{outline:1px solid #38bdf8}',
              '.p99-edit .p94-folha{-webkit-user-select:none;user-select:none}',
              '.p99-edit [contenteditable="true"]{-webkit-user-select:text;user-select:text;cursor:text;',
              'outline:2px solid #f59e0b !important;background:rgba(0,0,0,.28)}',
              '.p99-mk{position:absolute;border:1.5px solid #22c55e;pointer-events:none;z-index:60}',
              '.p99-h{position:absolute;width:13px;height:13px;background:#22c55e;border:2px solid #fff;',
              'border-radius:3px;pointer-events:auto;z-index:61}',
              '.p99-h[data-p99h="nw"]{left:-7px;top:-7px;cursor:nwse-resize}',
              '.p99-h[data-p99h="ne"]{right:-7px;top:-7px;cursor:nesw-resize}',
              '.p99-h[data-p99h="sw"]{left:-7px;bottom:-7px;cursor:nesw-resize}',
              '.p99-h[data-p99h="se"]{right:-7px;bottom:-7px;cursor:nwse-resize}',
              '@media print{.p99-mk{display:none !important}}'
            ].join('');
            var t = document.createElement('style');
            t.id = ID_ESTILO;
            t.type = 'text/css';
            t.appendChild(document.createTextNode(css));
            (document.head || document.documentElement).appendChild(t);
          }
        
          /* ---------------- quem esta selecionado ---------------- */
          function folhaDe(el) {
            return el && el.closest ? el.closest('.p94-folha') : null;
          }
        
          function slideDe(el) {
            var f = folhaDe(el);
            if (!f) { return 0; }
            var n = parseInt(f.getAttribute('data-p99s') || '0', 10);
            return isNaN(n) ? 0 : n;
          }
        
          function ehExtra(el) {
            return !!(el && el.hasAttribute && el.hasAttribute('data-p99x'));
          }
        
          function regDe(el, criar) {
            if (!el) { return null; }
            var a = ajAtual();
            if (ehExtra(el)) {
              var i = parseInt(el.getAttribute('data-p99x'), 10);
              return a.x[i] || null;
            }
            var o0 = el.__p99o;
            if (!o0) { return null; }
            var s = slideDe(el);
            var r = achar(s, o0.g, false) || acharPerto(s, o0.g);
            if (r) { return r; }
            if (!criar) { return null; }
            return achar(s, o0.g, true);
          }
        
          function selecionar(el) {
            if (sel === el) { marcarSel(); return; }
            if (sel && sel.classList) { sel.classList.remove('p99-sel'); }
            sel = el || null;
            if (sel && sel.classList) { sel.classList.add('p99-sel'); }
            marcarSel();
            barraSel();
          }
        
          function limparMarcas() {
            var m = document.querySelectorAll('.p99-mk');
            var i;
            for (i = 0; i < m.length; i++) {
              if (m[i].parentNode) { m[i].parentNode.removeChild(m[i]); }
            }
          }
        
          function marcarSel() {
            limparMarcas();
            if (!editando || !sel || !document.body.contains(sel)) { return; }
            var f = folhaDe(sel);
            if (!f) { return; }
            var g = geomDe(sel);
            var d = document.createElement('div');
            d.className = 'p99-mk';
            d.setAttribute('data-html2canvas-ignore', 'true');
            d.style.left = g.l + '%';
            d.style.top = g.t + '%';
            d.style.width = g.w + '%';
            d.style.height = g.h + '%';
            d.innerHTML =
              '<div class="p99-h" data-p99h="nw"></div><div class="p99-h" data-p99h="ne"></div>' +
              '<div class="p99-h" data-p99h="sw"></div><div class="p99-h" data-p99h="se"></div>';
            f.appendChild(d);
          }
        
          function marcarEditaveis() {
            var cx = document.getElementById('p94Lupa');
            if (!cx) { return; }
            if (editando) { cx.classList.add('p99-edit'); } else { cx.classList.remove('p99-edit'); }
          }
        
          /* ---------------- arrastar e redimensionar ---------------- */
          function caixaFolha(f) {
            var r = f.getBoundingClientRect();
            var lg = r.width || LARG;
            var al = r.height || ALT;
            if (lg < 40) { lg = LARG; }
            if (al < 40) { al = ALT; }
            return { lg: lg, al: al };
          }
        
          function limitar(g) {
            if (g.w < 1.2) { g.w = 1.2; }
            if (g.h < 1.2) { g.h = 1.2; }
            if (g.w > 220) { g.w = 220; }
            if (g.h > 220) { g.h = 220; }
            if (g.l < -60) { g.l = -60; }
            if (g.t < -60) { g.t = -60; }
            if (g.l > 160) { g.l = 160; }
            if (g.t > 160) { g.t = 160; }
            g.l = n1(g.l); g.t = n1(g.t); g.w = n1(g.w); g.h = n1(g.h);
            return g;
          }
        
          function comecarArraste(el, ev, canto) {
            var f = folhaDe(el);
            if (!f) { return; }
            var cx = caixaFolha(f);
            guardaPassado();
            arraste = {
              el: el, canto: canto || '', g0: geomDe(el),
              x0: ev.clientX, y0: ev.clientY,
              lg: cx.lg, al: cx.al, moveu: false
            };
            try { el.setPointerCapture && ev.pointerId != null && el.setPointerCapture(ev.pointerId); } catch (e) {}
          }
        
          function andarArraste(ev) {
            if (!arraste) { return; }
            var dx = (ev.clientX - arraste.x0) / arraste.lg * 100;
            var dy = (ev.clientY - arraste.y0) / arraste.al * 100;
            if (!arraste.moveu && Math.abs(ev.clientX - arraste.x0) + Math.abs(ev.clientY - arraste.y0) < 3) { return; }
            arraste.moveu = true;
            var o = arraste.g0;
            var g = { l: o.l, t: o.t, w: o.w, h: o.h };
            var c = arraste.canto;
            if (!c) {
              g.l = o.l + dx; g.t = o.t + dy;
            } else {
              if (c === 'se') { g.w = o.w + dx; g.h = o.h + dy; }
              if (c === 'ne') { g.w = o.w + dx; g.t = o.t + dy; g.h = o.h - dy; }
              if (c === 'sw') { g.l = o.l + dx; g.w = o.w - dx; g.h = o.h + dy; }
              if (c === 'nw') { g.l = o.l + dx; g.w = o.w - dx; g.t = o.t + dy; g.h = o.h - dy; }
            }
            porGeom(arraste.el, limitar(g));
            marcarSel();
          }
        
          function terminarArraste() {
            if (!arraste) { return; }
            var a = arraste;
            arraste = null;
            if (!a.moveu) { pilha.pop(); return; }
            var g = limitar(geomDe(a.el));
            var r = regDe(a.el, true);
            if (r) {
              r.l = g.l; r.t = g.t; r.w = g.w; r.h = g.h;
              if (a.canto && !ehExtra(a.el) && a.el.classList.contains('p94-t')) {
                /* texto esticado: acompanha a altura para nao cortar as letras */
                var base = a.g0.h || 1;
                var fs0 = parseFloat(r.fs || (a.el.__p99o && a.el.__p99o.fs) || 0);
                if (!fs0) { fs0 = parseFloat(window.getComputedStyle(a.el).fontSize) || 0; }
                if (fs0 && Math.abs(g.h - base) > 0.4) {
                  var novo = fs0 * (g.h / base);
                  if (novo < 7) { novo = 7; }
                  if (novo > 120) { novo = 120; }
                  r.fs = Math.round(novo * 10) / 10;
                }
              }
              gravar();
            }
            mudou();
            selecionar(a.el.parentNode ? a.el : null);
            aviso('Posicao guardada.');
          }
        
          /* ---------------- editar o texto no lugar ---------------- */
          function abrirTexto(el) {
            if (!el || el.classList.contains('p94-i') || el.classList.contains('p94-q')) { return; }
            if (el.getAttribute('contenteditable') === 'true') { return; }
            el.setAttribute('contenteditable', 'true');
            el.setAttribute('spellcheck', 'false');
            try { el.focus(); } catch (e) {}
            try {
              var r = document.createRange();
              r.selectNodeContents(el);
              var s = window.getSelection();
              s.removeAllRanges();
              s.addRange(r);
            } catch (e2) {}
            el.__p99txt = textoLimpo(el);
          }
        
          function textoLimpo(el) {
            var lis = el.querySelectorAll('.p94-li');
            var i, out = [];
            if (lis.length) {
              for (i = 0; i < lis.length; i++) { out.push(String(lis[i].textContent || '')); }
              return out.join('\n').replace(/\u00a0/g, ' ');
            }
            return String(el.innerText || el.textContent || '').replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n');
          }
        
          function fecharTexto(el) {
            if (!el || el.getAttribute('contenteditable') !== 'true') { return; }
            el.removeAttribute('contenteditable');
            var novo = textoLimpo(el);
            var velho = el.__p99txt == null ? '' : el.__p99txt;
            if (novo === velho) { mudou(); return; }
            guardaPassado();
            var r = regDe(el, true);
            if (r) { r.v = novo; gravar(); }
            mudou();
            selecionar(el.parentNode ? el : null);
            aviso('Texto guardado.');
          }
        
          function fecharQualquerTexto() {
            var e = document.querySelector('[contenteditable="true"]');
            if (e) { fecharTexto(e); }
          }
        
          /* ---------------- fotos: escolher do computador e encolher ---------------- */
          function pedirFoto(depois) {
            var i = document.getElementById('p99Arq');
            if (!i) {
              i = document.createElement('input');
              i.id = 'p99Arq';
              i.type = 'file';
              i.accept = 'image/*';
              i.style.display = 'none';
              document.body.appendChild(i);
              i.addEventListener('change', function () {
                var f = i.files && i.files[0];
                var fn = i.__ok;
                i.value = '';
                i.__ok = null;
                if (!f || !fn) { return; }
                encolher(f, function (u) {
                  if (!u) { aviso('Nao consegui ler essa foto.', 'erro'); return; }
                  fn(u);
                });
              });
            }
            i.__ok = depois;
            try { i.click(); } catch (e) { aviso('Nao consegui abrir a escolha de foto.', 'erro'); }
          }
        
          function encolher(arq, depois) {
            try {
              var fr = new FileReader();
              fr.onload = function () {
                var im = new Image();
                im.onload = function () {
                  try {
                    var k = Math.min(1, MAXLADO / Math.max(im.width || 1, im.height || 1));
                    var lg = Math.max(1, Math.round((im.width || 1) * k));
                    var al = Math.max(1, Math.round((im.height || 1) * k));
                    var cv = document.createElement('canvas');
                    cv.width = lg; cv.height = al;
                    var cx = cv.getContext('2d');
                    cx.drawImage(im, 0, 0, lg, al);
                    depois(cv.toDataURL('image/jpeg', QUAL));
                  } catch (e) { depois(String(fr.result || '')); }
                };
                im.onerror = function () { depois(''); };
                im.src = String(fr.result || '');
              };
              fr.onerror = function () { depois(''); };
              fr.readAsDataURL(arq);
            } catch (e2) { depois(''); }
          }
        
          function trocarFoto() {
            if (!sel) { aviso('Toque primeiro na foto que quer trocar.', 'erro'); return; }
            if (!sel.classList.contains('p94-i')) { aviso('Isso nao e uma foto. Escolha uma foto.', 'erro'); return; }
            var alvo = sel;
            pedirFoto(function (u) {
              guardaPassado();
              var r = regDe(alvo, true);
              if (r) { r.u = u; r.del = false; gravar(); }
              mudou();
              aviso('Foto trocada.');
            });
          }
        
          function slideVisivel() {
            if (sel) { return slideDe(sel); }
            var cx = document.getElementById('p94Lupa');
            if (!cx) { return 0; }
            var lst = cx.querySelectorAll('.p94-folha');
            var i, melhor = 0, md = 1e9, r, d;
            for (i = 0; i < lst.length; i++) {
              r = lst[i].getBoundingClientRect();
              d = Math.abs(r.top);
              if (d < md) { md = d; melhor = i; }
            }
            return melhor;
          }
        
          function novaFoto() {
            var s = slideVisivel();
            pedirFoto(function (u) {
              guardaPassado();
              var a = ajAtual();
              a.x.push({ k: 'img', s: s, l: 30, t: 30, w: 40, h: 40, u: u, fit: 'contain' });
              gravar();
              mudou();
              aviso('Foto colocada no slide ' + (s + 1) + '. Arraste para o lugar certo.');
            });
          }
        
          function novoTexto() {
            var s = slideVisivel();
            guardaPassado();
            var a = ajAtual();
            a.x.push({ k: 'txt', s: s, l: 20, t: 42, w: 55, h: 12, v: 'Escreva aqui', fs: 26, cor: '#FFFFFF', al: 'left', b: true });
            gravar();
            mudou();
            aviso('Texto novo no slide ' + (s + 1) + '. Toque duas vezes para escrever.');
          }
        
          function excluirSel() {
            if (!sel) { aviso('Toque primeiro no que quer apagar.', 'erro'); return; }
            guardaPassado();
            var r = regDe(sel, true);
            if (r) { r.del = true; gravar(); }
            selecionar(null);
            mudou();
            aviso('Apagado. Use Desfazer se precisar voltar.');
          }
        
          function mudarLetra(passo) {
            if (!sel || sel.classList.contains('p94-i') || sel.classList.contains('p94-q')) {
              aviso('Escolha um texto primeiro.', 'erro'); return;
            }
            guardaPassado();
            var atual = parseFloat(window.getComputedStyle(sel).fontSize) || 20;
            var novo = atual + passo;
            if (novo < 7) { novo = 7; }
            if (novo > 120) { novo = 120; }
            var r = regDe(sel, true);
            if (r) { r.fs = Math.round(novo * 10) / 10; gravar(); }
            mudou();
            selecionar(sel && sel.parentNode ? sel : null);
          }
        
          function encaixeFoto() {
            if (!sel || !sel.classList.contains('p94-i')) { aviso('Escolha uma foto primeiro.', 'erro'); return; }
            var im = sel.querySelector('img');
            var atual = im ? (im.style.objectFit || 'contain') : 'contain';
            guardaPassado();
            var r = regDe(sel, true);
            if (r) { r.fit = atual === 'cover' ? 'contain' : 'cover'; gravar(); }
            mudou();
            selecionar(sel && sel.parentNode ? sel : null);
            aviso(atual === 'cover' ? 'Foto inteira dentro da moldura.' : 'Foto preenchendo a moldura.');
          }
        
          function limparSlide() {
            var s = slideVisivel();
            if (!window.confirm('Voltar o slide ' + (s + 1) + ' para como ele era antes das suas mudancas?')) { return; }
            guardaPassado();
            var a = ajAtual();
            a.p = a.p.filter(function (o) { return o.s !== s; });
            a.x = a.x.filter(function (o) { return o.s !== s; });
            gravar();
            selecionar(null);
            mudou();
            aviso('Slide ' + (s + 1) + ' voltou ao normal.');
          }
        
          function limparTudo() {
            if (!window.confirm('Apagar TODAS as suas mudancas deste relatorio?')) { return; }
            guardaPassado();
            var id = idAtual();
            AJ[id] = { p: [], x: [] };
            gravar();
            selecionar(null);
            mudou();
            aviso('Tudo voltou ao normal.');
          }
        
          /* ---------------- barra de botoes na conferencia ---------------- */
          function bt(acao, rot, tit) {
            return '<button class="p99-bt" type="button" data-p99="' + acao + '" title="' + esc(tit || rot) + '">' + esc(rot) + '</button>';
          }
        
          function colocarBarra() {
            var f = document.getElementById('p94Fundo');
            if (!f || f.style.display !== 'block') { return; }
            var b = f.querySelector('.p94-barra');
            if (!b || b.querySelector('[data-p99]')) { return; }
            var d = document.createElement('div');
            d.className = 'p99-linha';
            d.innerHTML =
              bt('editar', 'Editar slides', 'Liga e desliga a edicao livre') +
              bt('texto', '+ Texto', 'Coloca um texto novo no slide') +
              bt('foto', '+ Foto', 'Coloca uma foto nova no slide') +
              bt('trocar', 'Trocar foto', 'Troca a foto que voce escolheu') +
              bt('encaixe', 'Encaixe da foto', 'Foto inteira ou preenchendo a moldura') +
              bt('maior', 'A+', 'Letra maior') +
              bt('menor', 'A-', 'Letra menor') +
              bt('apagar', 'Apagar', 'Apaga o que voce escolheu') +
              bt('desfazer', 'Desfazer', 'Volta a ultima mudanca') +
              bt('zerarslide', 'Zerar slide', 'Volta este slide ao normal') +
              bt('zerartudo', 'Zerar tudo', 'Volta todos os slides ao normal') +
              '<span class="p99-dica">Ligue a edicao, arraste para mover, use as bolinhas verdes para o tamanho e toque duas vezes para escrever.</span>';
            b.appendChild(d);
            pintarBarra();
          }
        
          function pintarBarra() {
            var b = document.querySelector('#p94Fundo [data-p99="editar"]');
            if (!b) { return; }
            if (editando) { b.classList.add('p99-on'); b.textContent = 'Edicao ligada'; }
            else { b.classList.remove('p99-on'); b.textContent = 'Editar slides'; }
          }
        
          function barraSel() { pintarBarra(); }
        
          function ligarEdicao(v) {
            editando = !!v;
            if (!editando) { fecharQualquerTexto(); selecionar(null); }
            marcarEditaveis();
            marcarSel();
            pintarBarra();
            aviso(editando
              ? 'Edicao ligada: arraste, estique pelas bolinhas verdes e toque duas vezes para escrever.'
              : 'Edicao desligada. Suas mudancas ficam guardadas.');
          }
        
          function acao(a) {
            if (a === 'editar') { ligarEdicao(!editando); return; }
            if (a === 'desfazer') { desfazer(); return; }
            if (a === 'zerarslide') { limparSlide(); return; }
            if (a === 'zerartudo') { limparTudo(); return; }
            if (!editando) { ligarEdicao(true); }
            if (a === 'texto') { novoTexto(); return; }
            if (a === 'foto') { novaFoto(); return; }
            if (a === 'trocar') { trocarFoto(); return; }
            if (a === 'encaixe') { encaixeFoto(); return; }
            if (a === 'maior') { mudarLetra(2); return; }
            if (a === 'menor') { mudarLetra(-2); return; }
            if (a === 'apagar') { excluirSel(); return; }
          }
        
          /* ---------------- cliques e toques ---------------- */
          function ligarEventos() {
            document.addEventListener('click', function (ev) {
              var t = ev.target;
              var b = t && t.closest ? t.closest('[data-p99]') : null;
              if (!b) { return; }
              ev.preventDefault();
              ev.stopPropagation();
              acao(b.getAttribute('data-p99'));
            }, true);
        
            document.addEventListener('pointerdown', function (ev) {
              if (!editando) { return; }
              var t = ev.target;
              if (!t || !t.closest) { return; }
              if (t.closest('[data-p99]')) { return; }
              var lupa = t.closest('#p94Lupa');
              if (!lupa) { return; }
        
              var h = t.closest('.p99-h');
              if (h && sel) {
                ev.preventDefault();
                ev.stopPropagation();
                comecarArraste(sel, ev, h.getAttribute('data-p99h'));
                return;
              }
        
              var p = t.closest('.p94-t,.p94-i,.p94-q');
              if (!p) {
                fecharQualquerTexto();
                selecionar(null);
                return;
              }
              if (p.getAttribute('contenteditable') === 'true') { return; }
              fecharQualquerTexto();
              ev.preventDefault();
              ev.stopPropagation();
              selecionar(p);
              comecarArraste(p, ev, '');
            }, true);
        
            document.addEventListener('pointermove', function (ev) {
              if (!arraste) { return; }
              ev.preventDefault();
              andarArraste(ev);
            }, true);
        
            function soltar() { if (arraste) { terminarArraste(); } }
            document.addEventListener('pointerup', soltar, true);
            document.addEventListener('pointercancel', soltar, true);
            window.addEventListener('blur', soltar);
        
            document.addEventListener('dblclick', function (ev) {
              if (!editando) { return; }
              var t = ev.target;
              if (!t || !t.closest || !t.closest('#p94Lupa')) { return; }
              var p = t.closest('.p94-t');
              if (!p) { return; }
              ev.preventDefault();
              ev.stopPropagation();
              selecionar(p);
              abrirTexto(p);
            }, true);
        
            window.addEventListener('keydown', function (ev) {
              var ed = document.querySelector('[contenteditable="true"]');
              var tecla = ev.key || '';
              if (ed) {
                if (tecla === 'Escape' || ev.keyCode === 27) {
                  ev.preventDefault();
                  ev.stopPropagation();
                  fecharTexto(ed);
                }
                if ((tecla === 'Enter' || ev.keyCode === 13) && (ev.ctrlKey || ev.metaKey)) {
                  ev.preventDefault();
                  ev.stopPropagation();
                  fecharTexto(ed);
                }
                return;
              }
              if (!editando) { return; }
              var lupa = document.getElementById('p94Lupa');
              if (!lupa) { return; }
              if ((ev.ctrlKey || ev.metaKey) && (tecla === 'z' || tecla === 'Z')) {
                ev.preventDefault(); ev.stopPropagation(); desfazer(); return;
              }
              if (!sel) { return; }
              var passo = ev.shiftKey ? 2 : 0.4;
              var g = geomDe(sel);
              var mexeu = false;
              if (tecla === 'ArrowLeft' || ev.keyCode === 37) { g.l -= passo; mexeu = true; }
              if (tecla === 'ArrowRight' || ev.keyCode === 39) { g.l += passo; mexeu = true; }
              if (tecla === 'ArrowUp' || ev.keyCode === 38) { g.t -= passo; mexeu = true; }
              if (tecla === 'ArrowDown' || ev.keyCode === 40) { g.t += passo; mexeu = true; }
              if (mexeu) {
                ev.preventDefault();
                ev.stopPropagation();
                guardaPassado();
                var alvo = sel;
                var r = regDe(alvo, true);
                limitar(g);
                if (r) { r.l = g.l; r.t = g.t; r.w = g.w; r.h = g.h; gravar(); }
                mudou();
                selecionar(alvo && alvo.parentNode ? alvo : null);
                return;
              }
              if (tecla === 'Delete' || tecla === 'Backspace' || ev.keyCode === 46) {
                ev.preventDefault(); ev.stopPropagation(); excluirSel(); return;
              }
              if (tecla === 'Escape' || ev.keyCode === 27) {
                ev.preventDefault(); ev.stopPropagation(); selecionar(null); return;
              }
            }, true);
          }
        
          /* ---------------- PowerPoint: repetir os mesmos ajustes ---------------- */
          function polPara(v, total) { return Math.round((v / 100) * total * 1000) / 1000; }
          function paraPct(v, total) { return n1((v / total) * 100); }
        
          function opGeom(op) {
            var o = op[0] === 'img' ? op[1] : (op[0] === 'shape' ? op[2] : op[2]);
            if (!o) { return null; }
            if (o.x == null || o.y == null) { return null; }
            return {
              o: o,
              l: paraPct(parseFloat(o.x) || 0, POL_L),
              t: paraPct(parseFloat(o.y) || 0, POL_A),
              w: paraPct(parseFloat(o.w) || 0, POL_L),
              h: paraPct(parseFloat(o.h) || 0, POL_A)
            };
          }
        
          function textoPptx(v, base) {
            var linhas = String(v == null ? '' : v).split(/\r?\n/);
            if (linhas.length < 2) { return linhas[0] || ''; }
            return linhas.map(function (l) {
              return { text: String(l), options: { breakLine: true, bullet: base && base.__bullet ? { code: '2022' } : false } };
            });
          }
        
          function ajustarOps(ops, s) {
            var a = ajAtual();
            var fora = [];
            var i, j, g, alvo, dif, mdif, o, novo;
            var saida = [];
            for (i = 0; i < ops.length; i++) {
              g = opGeom(ops[i]);
              if (!g) { saida.push(ops[i]); continue; }
              alvo = null; mdif = TOL;
              for (j = 0; j < a.p.length; j++) {
                o = a.p[j];
                if (o.s !== s) { continue; }
                dif = Math.abs(o.ol - g.l) + Math.abs(o.ot - g.t) + Math.abs(o.ow - g.w) + Math.abs(o.oh - g.h);
                if (dif <= mdif) { mdif = dif; alvo = o; }
              }
              if (!alvo) { saida.push(ops[i]); continue; }
              if (alvo.del) { continue; }
              novo = {};
              for (var k in g.o) { if (Object.prototype.hasOwnProperty.call(g.o, k)) { novo[k] = g.o[k]; } }
              if (alvo.l != null) { novo.x = polPara(alvo.l, POL_L); }
              if (alvo.t != null) { novo.y = polPara(alvo.t, POL_A); }
              if (alvo.w != null) { novo.w = polPara(alvo.w, POL_L); }
              if (alvo.h != null) { novo.h = polPara(alvo.h, POL_A); }
              if (novo.sizing && novo.sizing.type) {
                novo.sizing = { type: alvo.fit ? (alvo.fit === 'cover' ? 'cover' : 'contain') : novo.sizing.type, w: novo.w, h: novo.h };
              }
              if (alvo.fs && ops[i][0] === 'text') { novo.fontSize = Math.round((alvo.fs / PT) * 10) / 10; }
              if (alvo.cor && ops[i][0] === 'text') { novo.color = String(alvo.cor).replace('#', ''); }
              if (alvo.u && ops[i][0] === 'img') { novo.data = alvo.u; try { delete novo.path; } catch (e9) { novo.path = ''; } }
              if (ops[i][0] === 'img') { saida.push(['img', novo]); continue; }
              if (ops[i][0] === 'shape') { saida.push(['shape', ops[i][1], novo]); continue; }
              var conteudo = ops[i][1];
              if (alvo.v != null) {
                var bullet = false;
                if (Object.prototype.toString.call(conteudo) === '[object Array]' && conteudo.length &&
                    conteudo[0] && conteudo[0].options && conteudo[0].options.bullet) { bullet = true; }
                conteudo = textoPptx(alvo.v, { __bullet: bullet });
              }
              saida.push(['text', conteudo, novo]);
            }
            /* pecas novas do usuario */
            a.x.forEach(function (o2) {
              if (o2.s !== s || o2.del) { return; }
              var cx = { x: polPara(o2.l, POL_L), y: polPara(o2.t, POL_A), w: polPara(o2.w, POL_L), h: polPara(o2.h, POL_A) };
              if (o2.k === 'img') {
                if (!o2.u) { return; }
                fora.push(['img', { data: o2.u, x: cx.x, y: cx.y, w: cx.w, h: cx.h,
                  sizing: { type: o2.fit === 'cover' ? 'cover' : 'contain', w: cx.w, h: cx.h } }]);
                return;
              }
              fora.push(['text', textoPptx(o2.v || '', null), {
                x: cx.x, y: cx.y, w: cx.w, h: cx.h,
                fontSize: Math.round(((o2.fs || 22) / PT) * 10) / 10,
                color: String(o2.cor || '#FFFFFF').replace('#', ''),
                bold: !!o2.b, align: o2.al || 'left', valign: 'top', margin: 0,
                fontFace: 'Calibri', isTextBox: true
              }]);
            });
            return saida.concat(fora);
          }
        
          function rascunho99() {
            var b = { fundo: null, ops: [] };
            b.addImage = function (o) { b.ops.push(['img', o]); return b; };
            b.addShape = function (t, o) { b.ops.push(['shape', t, o]); return b; };
            b.addText = function (t, o) { b.ops.push(['text', t, o]); return b; };
            b.addTable = function (t, o) { b.ops.push(['table', t, o]); return b; };
            b.addChart = function (t, d, o) { b.ops.push(['chart', t, d, o]); return b; };
            b.addNotes = function (t) { b.ops.push(['notes', t]); return b; };
            b.addMedia = function (o) { b.ops.push(['media', o]); return b; };
            try {
              Object.defineProperty(b, 'background', {
                configurable: true,
                get: function () { return b.fundo; },
                set: function (v) { b.fundo = v; }
              });
            } catch (e) {}
            return b;
          }
        
          function tocar99(real, op) {
            if (op[0] === 'img') { real.addImage(op[1]); return; }
            if (op[0] === 'shape') { real.addShape(op[1], op[2]); return; }
            if (op[0] === 'text') { real.addText(op[1], op[2]); return; }
            if (op[0] === 'table') { real.addTable(op[1], op[2]); return; }
            if (op[0] === 'chart') { real.addChart(op[1], op[2], op[3]); return; }
            if (op[0] === 'notes') { real.addNotes(op[1]); return; }
            if (op[0] === 'media') { real.addMedia(op[1]); return; }
          }
        
          function montar99(inv) {
            if (inv.__feito) { return; }
            inv.__feito = true;
            var i, j, b, real, ops;
            for (i = 0; i < inv.__folhas.length; i++) {
              b = inv.__folhas[i];
              try { real = inv.__base.addSlide(); } catch (e) { continue; }
              if (b.fundo) { try { real.background = b.fundo; } catch (e1) {} }
              ops = b.ops;
              try { ops = ajustarOps(b.ops, i); } catch (e2) { ops = b.ops; }
              for (j = 0; j < ops.length; j++) {
                try { tocar99(real, ops[j]); } catch (e3) {}
              }
            }
          }
        
          /* ---------------- entrar na frente do gerador de PowerPoint ---------------- */
          function embrulhar99(Base) {
            if (!Base || Base.__p99) { return Base; }
        
            function P99() {
              this.__base = new Base();
              this.__folhas = [];
              this.__feito = false;
            }
        
            P99.__p99 = true;
            P99.__p97 = true;   /* evita que outra camada embrulhe de novo */
            P99.__real = Base;
        
            P99.prototype.addSlide = function (a) {
              var b = rascunho99();
              b.__arg = a;
              this.__folhas.push(b);
              return b;
            };
        
            ['addSection', 'defineLayout', 'defineSlideMaster'].forEach(function (nome) {
              P99.prototype[nome] = function (o) {
                try { return this.__base[nome](o); } catch (e) { return null; }
              };
            });
        
            ['writeFile', 'write', 'stream'].forEach(function (nome) {
              P99.prototype[nome] = function (o) {
                try { montar99(this); } catch (e) {}
                return this.__base[nome](o);
              };
            });
        
            ['layout', 'author', 'title', 'subject', 'company', 'revision', 'rtlMode', 'theme'].forEach(function (nome) {
              try {
                Object.defineProperty(P99.prototype, nome, {
                  configurable: true,
                  get: function () { try { return this.__base[nome]; } catch (e) { return undefined; } },
                  set: function (v) { try { this.__base[nome] = v; } catch (e) {} }
                });
              } catch (e2) {}
            });
        
            try {
              ['ShapeType', 'SchemeColor', 'AlignH', 'AlignV', 'ChartType', 'OutputType', 'version'].forEach(function (k) {
                if (Base[k] !== undefined) { P99[k] = Base[k]; }
              });
            } catch (e3) {}
        
            return P99;
          }
        
          function instalarPptx(nome) {
            var d = null;
            try { d = Object.getOwnPropertyDescriptor(window, nome); } catch (e) { d = null; }
            var guardado = d && !d.get ? d.value : undefined;
            var cache = { de: null, w: null };
        
            function base() {
              if (d && d.get) { try { return d.get.call(window); } catch (e) { return undefined; } }
              return guardado;
            }
        
            function pegar() {
              var b = base();
              if (typeof b !== 'function') { return b; }
              if (b.__p99) { return b; }
              if (cache.de !== b) { cache.de = b; cache.w = embrulhar99(b); }
              return cache.w;
            }
        
            function guardar(v) {
              if (v && v.__p99) { return; }
              cache.de = null; cache.w = null;
              if (d && d.set) { try { d.set.call(window, v); return; } catch (e) {} }
              guardado = v;
            }
        
            try {
              Object.defineProperty(window, nome, { configurable: true, get: pegar, set: guardar });
            } catch (e2) {
              try { if (typeof guardado === 'function') { window[nome] = embrulhar99(guardado); } } catch (e3) {}
            }
          }
        
          /* ---------------- ficar de olho nos slides desenhados ---------------- */
          function vigiar() {
            var pendente = false;
            function correr() {
              pendente = false;
              try { aplicarTudo(); } catch (e) {}
              try { colocarBarra(); } catch (e2) {}
            }
            function pedir() {
              if (pendente) { return; }
              pendente = true;
              setTimeout(correr, 60);
            }
            try {
              var mo = new MutationObserver(function (lst) {
                var i, j, n;
                for (i = 0; i < lst.length; i++) {
                  for (j = 0; j < lst[i].addedNodes.length; j++) {
                    n = lst[i].addedNodes[j];
                    if (!n || n.nodeType !== 1) { continue; }
                    if (n.classList && (n.classList.contains('p94-folha') || n.id === 'p94Fundo')) { pedir(); return; }
                    if (n.querySelector && n.querySelector('.p94-folha')) { pedir(); return; }
                  }
                }
              });
              mo.observe(document.body, { childList: true, subtree: true });
            } catch (e3) {}
            setInterval(correr, 1200);
            pedir();
          }
        
          /* ---------------- comecar ---------------- */
          function iniciar() {
            estilo();
            ligarEventos();
            instalarPptx('PptxGenJS');
            instalarPptx('pptxgen');
            carregar(function () { vigiar(); });
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        
        })();
    
