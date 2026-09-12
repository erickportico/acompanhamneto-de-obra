
        /* ====== PATCH96_ENQ_OK - Enquadrar fotos por slide (Relatorio FPDO) ====== */
        (function () {
          'use strict';
          if (window.__PS96) { return; }
          window.__PS96 = true;
        
          var BASE = 'p92_fpdo_v1';
          var LOJA = 'reg';
          var K_LS = 'p92_fpdo_ls_v1';
          var K_ULT = 'p92_fpdo_ultimo_v1';
          var K_CHEIO = 'p96_cheio_v1';
        
          var MAXLADO = 1600;
          var QUAL = 0.86;
          var FUNDO = '#101a2b';
        
          /* ---------------- utilidades ---------------- */
          function esc(s) {
            return String(s == null ? '' : s)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          }
        
          function espera(ms, fn) { setTimeout(fn, ms); }
        
          function aviso(msg, tipo) {
            if (typeof window.mostrarToastPainel === 'function') {
              try { window.mostrarToastPainel(msg, tipo === 'erro' ? 'erro' : 'ok'); return; } catch (e) {}
            }
            var d = document.getElementById('p96Aviso');
            if (!d) {
              d = document.createElement('div');
              d.id = 'p96Aviso';
              d.style.cssText = 'position:fixed;z-index:2147483000;left:50%;transform:translateX(-50%);' +
                'bottom:22px;padding:10px 16px;border-radius:10px;font:600 14px system-ui,Arial;color:#fff';
              document.body.appendChild(d);
            }
            d.textContent = String(msg || '');
            d.style.background = tipo === 'erro' ? '#8c1c1c' : '#14532d';
            d.style.display = 'block';
            if (d.__t) { clearTimeout(d.__t); }
            d.__t = setTimeout(function () { d.style.display = 'none'; }, 4200);
          }
        
          /* ---------------- onde o relatorio fica guardado ---------------- */
          function lsLer() {
            try { return JSON.parse(localStorage.getItem(K_LS) || '[]') || []; } catch (e) { return []; }
          }
        
          function lsGravar(arr) {
            try { localStorage.setItem(K_LS, JSON.stringify(arr)); return true; } catch (e) { return false; }
          }
        
          function abrirBase(ok, falhou) {
            try {
              if (!window.indexedDB) { falhou(); return; }
              var req = window.indexedDB.open(BASE, 1);
              req.onupgradeneeded = function () {
                try {
                  var b = req.result;
                  if (!b.objectStoreNames.contains(LOJA)) { b.createObjectStore(LOJA, { keyPath: 'id' }); }
                } catch (e) {}
              };
              req.onsuccess = function () { ok(req.result); };
              req.onerror = function () { falhou(); };
            } catch (e) { falhou(); }
          }
        
          function carregarTodos(depois) {
            abrirBase(function (b) {
              try {
                var t = b.transaction(LOJA, 'readonly');
                var r = t.objectStore(LOJA).getAll();
                r.onsuccess = function () { depois(r.result || []); };
                r.onerror = function () { depois(lsLer()); };
              } catch (e) { depois(lsLer()); }
            }, function () { depois(lsLer()); });
          }
        
          function guardarReg(reg, depois) {
            reg.alterado = new Date().toISOString();
            abrirBase(function (b) {
              try {
                var t = b.transaction(LOJA, 'readwrite');
                t.objectStore(LOJA).put(reg);
                t.oncomplete = function () { depois(true); };
                t.onerror = function () { depois(false); };
              } catch (e) { depois(false); }
            }, function () {
              var arr = lsLer(), achou = false, i;
              for (i = 0; i < arr.length; i++) { if (arr[i].id === reg.id) { arr[i] = reg; achou = true; break; } }
              if (!achou) { arr.push(reg); }
              depois(lsGravar(arr));
            });
          }
        
          function obterDados(depois) {
            var bs = document.querySelector('#p92Pe [data-a="salvar"]');
            if (bs) { try { bs.click(); } catch (e) {} }
            espera(bs ? 520 : 60, function () {
              carregarTodos(function (arr) {
                var lst = (arr || []).slice().sort(function (a, b) {
                  return String(b.alterado || b.criado || '').localeCompare(String(a.alterado || a.criado || ''));
                });
                var ult = null, reg = null, i;
                try { ult = localStorage.getItem(K_ULT); } catch (e2) {}
                for (i = 0; i < lst.length; i++) { if (lst[i].id === ult) { reg = lst[i]; break; } }
                if (!reg && lst.length) { reg = lst[0]; }
                if (!reg) {
                  aviso('Abra o Relatorio FPDO e salve uma vez antes de enquadrar as fotos.', 'erro');
                  return;
                }
                depois(reg);
              });
            });
          }
        
          function recarregarTela(regId, depois) {
            var secAtiva = null;
            var on = document.querySelector('#p92Nav .p92-nav.on');
            if (on) { secAtiva = on.getAttribute('data-s'); }
            var bl = document.querySelector('#p92Fundo [data-a="lista"]');
            if (!bl) {
              aviso('Foto enquadrada. Feche e abra o relatorio para ver.', 'ok');
              if (depois) { depois(); }
              return;
            }
            try { bl.click(); } catch (e) {}
            espera(560, function () {
              var ba = document.querySelector('#p92Corpo [data-a="lerReg"][data-i="' + regId + '"]');
              if (!ba) {
                aviso('Foto enquadrada. Abra o relatorio na lista para ver.', 'ok');
                if (depois) { depois(); }
                return;
              }
              try { ba.click(); } catch (e2) {}
              espera(160, function () {
                if (secAtiva) {
                  var bn = document.querySelector('#p92Nav [data-a="sec"][data-s="' + secAtiva + '"]');
                  if (bn) { try { bn.click(); } catch (e3) {} }
                }
                if (depois) { depois(); }
              });
            });
          }
        
          /* ---------------- achar o grupo de fotos pelo alvo ---------------- */
          function porId(lista, id) {
            var i;
            for (i = 0; i < (lista || []).length; i++) {
              if (String(lista[i].id) === String(id)) { return lista[i]; }
            }
            return null;
          }
        
          function grupoDe(reg, alvo) {
            var p = String(alvo || '').split(':');
            if (p[0] === 'capa') { if (!reg.capaFotos) { reg.capaFotos = []; } return reg.capaFotos; }
            if (p[0] === 'fim') { if (!reg.fotosFinal) { reg.fotosFinal = []; } return reg.fotosFinal; }
            if (p[0] === 'elev') {
              var e = porId(reg.elevacoes, p[1]);
              if (!e) { return null; }
              if (p[2] === 'antes') { if (!e.fotosAntes) { e.fotosAntes = []; } return e.fotosAntes; }
              if (!e.fotosDepois) { e.fotosDepois = []; }
              return e.fotosDepois;
            }
            if (p[0] === 'inst') {
              var it = porId(reg.itens, p[1]);
              if (!it) { return null; }
              if (!it.fotos) { it.fotos = []; }
              return it.fotos;
            }
            if (p[0] === 'pend') {
              var pe = porId(reg.pendencias, p[1]);
              if (!pe) { return null; }
              if (!pe.fotos) { pe.fotos = []; }
              return pe.fotos;
            }
            return null;
          }
        
          /* proporcao do espaco que a foto ocupa no slide, por tipo de grupo */
          function razaoDoEspaco(alvo, indice) {
            var t = String(alvo || '').split(':')[0];
            if (t === 'capa') { return Number(indice) === 1 ? 0.75 : 1.04; }
            if (t === 'elev') { return 1.25; }
            if (t === 'inst') { return 1.14; }
            return 1.22;
          }
        
          /* onde vale a opcao "slide inteiro": capa (1a e 2a foto) e pagina final */
          function chaveCheio(alvo, indice) {
            var t = String(alvo || '').split(':')[0];
            if (t === 'capa') { return Number(indice) === 1 ? 'dados' : (Number(indice) === 0 ? 'capa' : ''); }
            if (t === 'fim') { return 'fim'; }
            return '';
          }
        
          function lerCheio() {
            try { return JSON.parse(localStorage.getItem(K_CHEIO) || '{}') || {}; } catch (e) { return {}; }
          }
        
          function gravarCheio(o) {
            try { localStorage.setItem(K_CHEIO, JSON.stringify(o || {})); } catch (e) {}
          }
        
          /* ---------------- imagem: carregar e recortar ---------------- */
          function carregarImagem(url, ok, falhou) {
            var im = new Image();
            try { im.crossOrigin = 'anonymous'; } catch (e) {}
            im.onload = function () { ok(im); };
            im.onerror = function () { if (falhou) { falhou(); } };
            im.src = String(url || '');
          }
        
          /* escala base: preencher = cobre tudo; ajustar = cabe inteira */
          function escalaBase(modo, iw, ih, pw, ph) {
            if (!iw || !ih) { return 1; }
            var a = pw / iw, b = ph / ih;
            return modo === 'ajustar' ? Math.min(a, b) : Math.max(a, b);
          }
        
          function gerarUrl(im, est) {
            var razao = est.razao || 1;
            var W, H;
            if (razao >= 1) { W = MAXLADO; H = Math.round(MAXLADO / razao); }
            else { H = MAXLADO; W = Math.round(MAXLADO * razao); }
            var cv = document.createElement('canvas');
            cv.width = W; cv.height = H;
            var cx = cv.getContext('2d');
            cx.fillStyle = FUNDO;
            cx.fillRect(0, 0, W, H);
            var iw = im.naturalWidth || im.width;
            var ih = im.naturalHeight || im.height;
            var s = escalaBase(est.modo, iw, ih, W, H) * (est.zoom || 1);
            var dw = iw * s, dh = ih * s;
            var dx = (W - dw) / 2 + (est.dx || 0) * W;
            var dy = (H - dh) / 2 + (est.dy || 0) * H;
            try { cx.imageSmoothingQuality = 'high'; } catch (e) {}
            cx.drawImage(im, dx, dy, dw, dh);
            try { return cv.toDataURL('image/jpeg', QUAL); } catch (e2) { return null; }
          }
        
          /* ---------------- estilo da janelinha ---------------- */
          function estilo() {
            if (document.getElementById('p96Estilo')) { return; }
            var s = document.createElement('style');
            s.id = 'p96Estilo';
            s.textContent = [
              '#p96Fundo{position:fixed;inset:0;background:rgba(4,8,16,.82);z-index:2147482000;',
              '  display:flex;align-items:center;justify-content:center;padding:14px}',
              '#p96Cx{background:#0f172a;color:#e6edf7;border:1px solid #2b3a52;border-radius:14px;',
              '  max-width:660px;width:100%;max-height:94vh;overflow:auto;padding:16px;',
              '  font:14px system-ui,Arial,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.55)}',
              '#p96Cx h3{margin:0 0 10px 0;font-size:17px}',
              '#p96Palco{position:relative;overflow:hidden;background:#101a2b;border:1px solid #2b3a52;',
              '  border-radius:10px;margin:0 auto 12px auto;cursor:move;touch-action:none;user-select:none}',
              '#p96Palco img{position:absolute;left:0;top:0;display:block;pointer-events:none}',
              '#p96Cx .p96-l{display:block;margin:8px 0 4px 0;font-weight:600;font-size:13px;color:#a9b8cd}',
              '#p96Cx input[type=range]{width:100%}',
              '#p96Cx .p96-lin{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0}',
              '#p96Cx button{background:#1b2a43;color:#e6edf7;border:1px solid #33456180;border-radius:9px;',
              '  padding:8px 12px;font:600 13px system-ui,Arial;cursor:pointer}',
              '#p96Cx button.on{background:#2563eb;border-color:#2563eb}',
              '#p96Cx button.ok{background:#15803d;border-color:#15803d}',
              '#p96Cx .p96-dica{color:#93a4bd;font-size:12px;line-height:1.5;margin-top:6px}',
              'figure.p92-foto button[data-p96b]{background:#1d4ed8;color:#fff;border:0;border-radius:8px;',
              '  padding:4px 8px;font:600 12px system-ui,Arial;cursor:pointer;margin-left:4px}',
              '.p94-folha .p96-fundo{position:absolute;left:0;top:0;width:100%;height:100%;z-index:0}',
              '.p94-folha .p96-fundo img{width:100%;height:100%;object-fit:cover;display:block}',
              '.p94-folha .p96-veu{position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;',
              '  background:linear-gradient(90deg,rgba(6,12,24,.86) 0%,rgba(6,12,24,.55) 55%,rgba(6,12,24,.30) 100%)}',
              '.p94-folha .p94-t,.p94-folha .p94-p,.p94-folha .p94-q{position:absolute;z-index:3}'
            ].join('');
            document.head.appendChild(s);
          }
        
          /* ---------------- janelinha de enquadrar ---------------- */
          var atual = null;
        
          function fechar() {
            var f = document.getElementById('p96Fundo');
            if (f && f.parentNode) { f.parentNode.removeChild(f); }
            atual = null;
          }
        
          function desenharPreview() {
            if (!atual) { return; }
            var palco = document.getElementById('p96Palco');
            var im = document.getElementById('p96Img');
            if (!palco || !im) { return; }
            var pw = palco.clientWidth, ph = palco.clientHeight;
            var iw = atual.im.naturalWidth || atual.im.width;
            var ih = atual.im.naturalHeight || atual.im.height;
            var s = escalaBase(atual.modo, iw, ih, pw, ph) * atual.zoom;
            var dw = iw * s, dh = ih * s;
            im.style.width = dw + 'px';
            im.style.height = dh + 'px';
            im.style.left = ((pw - dw) / 2 + atual.dx * pw) + 'px';
            im.style.top = ((ph - dh) / 2 + atual.dy * ph) + 'px';
          }
        
          function ajustarPalco() {
            var palco = document.getElementById('p96Palco');
            if (!palco || !atual) { return; }
            var larg = Math.min(560, Math.max(240, (document.getElementById('p96Cx') || {}).clientWidth - 34 || 520));
            var alt = Math.round(larg / (atual.razao || 1));
            var max = Math.round(window.innerHeight * 0.46);
            if (alt > max) { alt = max; larg = Math.round(alt * (atual.razao || 1)); }
            palco.style.width = larg + 'px';
            palco.style.height = alt + 'px';
            desenharPreview();
          }
        
          function ligarArraste() {
            var palco = document.getElementById('p96Palco');
            if (!palco) { return; }
            var arrastando = false, x0 = 0, y0 = 0, dx0 = 0, dy0 = 0;
        
            function ponto(ev) {
              if (ev.touches && ev.touches.length) { return { x: ev.touches[0].clientX, y: ev.touches[0].clientY }; }
              return { x: ev.clientX, y: ev.clientY };
            }
            function inicio(ev) {
              if (!atual) { return; }
              var p = ponto(ev);
              arrastando = true; x0 = p.x; y0 = p.y; dx0 = atual.dx; dy0 = atual.dy;
            }
            function mover(ev) {
              if (!arrastando || !atual) { return; }
              var p = ponto(ev);
              atual.dx = dx0 + (p.x - x0) / palco.clientWidth;
              atual.dy = dy0 + (p.y - y0) / palco.clientHeight;
              if (atual.dx > 1) { atual.dx = 1; } if (atual.dx < -1) { atual.dx = -1; }
              if (atual.dy > 1) { atual.dy = 1; } if (atual.dy < -1) { atual.dy = -1; }
              desenharPreview();
              if (ev.cancelable) { ev.preventDefault(); }
            }
            function fim() { arrastando = false; }
        
            palco.addEventListener('mousedown', inicio);
            palco.addEventListener('touchstart', inicio, { passive: true });
            document.addEventListener('mousemove', mover);
            palco.addEventListener('touchmove', mover, { passive: false });
            document.addEventListener('mouseup', fim);
            palco.addEventListener('touchend', fim);
          }
        
          function marcarModo() {
            var cx = document.getElementById('p96Cx');
            if (!cx || !atual) { return; }
            var bs = cx.querySelectorAll('[data-p96m]'), i;
            for (i = 0; i < bs.length; i++) {
              if (bs[i].getAttribute('data-p96m') === atual.modo) { bs[i].className = 'on'; }
              else { bs[i].className = ''; }
            }
          }
        
          function abrirCaixa(reg, grupo, indice, alvo) {
            var foto = grupo[indice];
            if (!foto || !foto.url) { aviso('Nao encontrei essa foto.', 'erro'); return; }
            if (!foto.orig) { foto.orig = foto.url; }
        
            var salvo = foto.enq || {};
            var kCheio = chaveCheio(alvo, indice);
            var cheios = lerCheio();
            var cheio = kCheio ? !!cheios[kCheio] : false;
        
            estilo();
            fechar();
        
            var f = document.createElement('div');
            f.id = 'p96Fundo';
            f.innerHTML =
              '<div id="p96Cx">' +
              '<h3>Enquadrar foto</h3>' +
              '<div id="p96Palco"><img id="p96Img" alt="foto"></div>' +
              '<div class="p96-lin">' +
              '<button type="button" data-p96m="preencher">Preencher o espaco</button>' +
              '<button type="button" data-p96m="ajustar">Foto inteira (com borda)</button>' +
              '</div>' +
              '<label class="p96-l">Aproximar / afastar</label>' +
              '<input id="p96Zoom" type="range" min="100" max="320" step="2">' +
              (kCheio
                ? '<div class="p96-lin"><label><input id="p96Cheio" type="checkbox"> ' +
                  'Esta foto ocupa o slide inteiro (fundo da pagina)</label></div>'
                : '') +
              '<div class="p96-lin">' +
              '<button type="button" data-p96a="centro">Centralizar</button>' +
              '<button type="button" data-p96a="orig">Voltar ao original</button>' +
              '<button type="button" class="ok" data-p96a="salvar">Salvar enquadramento</button>' +
              '<button type="button" data-p96a="sair">Cancelar</button>' +
              '</div>' +
              '<div class="p96-dica">Arraste a foto com o dedo ou com o mouse para escolher o pedaco que aparece. ' +
              'O quadro cinza mostra exatamente o espaco que a foto tem no slide.</div>' +
              '</div>';
            document.body.appendChild(f);
        
            var zoom = document.getElementById('p96Zoom');
            var chk = document.getElementById('p96Cheio');
            if (chk) { chk.checked = cheio; }
        
            carregarImagem(foto.orig, function (im) {
              atual = {
                reg: reg, grupo: grupo, indice: indice, alvo: alvo, foto: foto, im: im,
                modo: salvo.modo === 'ajustar' ? 'ajustar' : 'preencher',
                zoom: Number(salvo.zoom) > 0 ? Number(salvo.zoom) : 1,
                dx: Number(salvo.dx) || 0,
                dy: Number(salvo.dy) || 0,
                razao: cheio ? (16 / 9) : razaoDoEspaco(alvo, indice),
                kCheio: kCheio
              };
              var vi = document.getElementById('p96Img');
              if (vi) { vi.src = foto.orig; }
              if (zoom) { zoom.value = String(Math.round(atual.zoom * 100)); }
              marcarModo();
              ajustarPalco();
              ligarArraste();
            }, function () {
              aviso('Nao consegui abrir essa foto.', 'erro');
              fechar();
            });
        
            if (zoom) {
              zoom.addEventListener('input', function () {
                if (!atual) { return; }
                atual.zoom = Math.max(1, Number(zoom.value) / 100);
                desenharPreview();
              });
            }
        
            if (chk) {
              chk.addEventListener('change', function () {
                if (!atual) { return; }
                atual.razao = chk.checked ? (16 / 9) : razaoDoEspaco(alvo, indice);
                ajustarPalco();
              });
            }
        
            f.addEventListener('click', function (ev) {
              var b = ev.target && ev.target.closest ? ev.target.closest('[data-p96m],[data-p96a]') : null;
              if (!b || !atual) { return; }
              var m = b.getAttribute('data-p96m');
              if (m) { atual.modo = m; marcarModo(); desenharPreview(); return; }
              var a = b.getAttribute('data-p96a');
              if (a === 'sair') { fechar(); return; }
              if (a === 'centro') { atual.dx = 0; atual.dy = 0; atual.zoom = 1; if (zoom) { zoom.value = '100'; } desenharPreview(); return; }
              if (a === 'orig') {
                atual.modo = 'preencher'; atual.dx = 0; atual.dy = 0; atual.zoom = 1;
                if (zoom) { zoom.value = '100'; }
                marcarModo(); desenharPreview();
                return;
              }
              if (a === 'salvar') { salvar(chk ? !!chk.checked : false, b); }
            });
          }
        
          function salvar(marcarCheio, botao) {
            if (!atual) { return; }
            var est = atual;
            if (botao) { botao.disabled = true; botao.textContent = 'Salvando...'; }
            var url = gerarUrl(est.im, est);
            if (!url) {
              aviso('Nao consegui gravar a foto enquadrada.', 'erro');
              if (botao) { botao.disabled = false; botao.textContent = 'Salvar enquadramento'; }
              return;
            }
            est.foto.url = url;
            est.foto.enq = {
              modo: est.modo, zoom: est.zoom, dx: est.dx, dy: est.dy,
              razao: est.razao, cheio: !!marcarCheio
            };
            if (est.kCheio) {
              var c = lerCheio();
              c[est.kCheio] = !!marcarCheio;
              gravarCheio(c);
            }
            guardarReg(est.reg, function (ok) {
              fechar();
              if (!ok) { aviso('Nao consegui salvar no relatorio.', 'erro'); return; }
              aviso('Enquadramento salvo.', 'ok');
              recarregarTela(est.reg.id);
            });
          }
        
          /* ---------------- botao "Enquadrar" em cada foto ---------------- */
          function colocarBotoes() {
            var imgs = document.querySelectorAll('#p92Fundo img[data-alvo]');
            var i;
            for (i = 0; i < imgs.length; i++) {
              var im = imgs[i];
              var fig = im.closest ? im.closest('figure') : null;
              var cx = fig ? fig.querySelector('.p92-fx') : null;
              if (!cx) { cx = fig; }
              if (!cx || cx.querySelector('[data-p96b]')) { continue; }
              var b = document.createElement('button');
              b.type = 'button';
              b.setAttribute('data-p96b', '1');
              b.setAttribute('data-alvo', im.getAttribute('data-alvo') || '');
              b.setAttribute('data-i', im.getAttribute('data-i') || '0');
              b.textContent = 'Enquadrar';
              b.title = 'Escolher o pedaco da foto que aparece no slide';
              cx.appendChild(b);
            }
          }
        
          document.addEventListener('click', function (ev) {
            var b = ev.target && ev.target.closest ? ev.target.closest('[data-p96b]') : null;
            if (!b) { return; }
            ev.preventDefault();
            ev.stopPropagation();
            var alvo = b.getAttribute('data-alvo') || '';
            var indice = parseInt(b.getAttribute('data-i') || '0', 10) || 0;
            obterDados(function (reg) {
              var g = grupoDe(reg, alvo);
              if (!g || !g[indice]) { aviso('Nao encontrei essa foto no relatorio salvo.', 'erro'); return; }
              abrirCaixa(reg, g, indice, alvo);
            });
          }, true);
        
          /* ---------------- foto no slide inteiro (folhas na tela / PDF) ---------------- */
          function fundoCheio(folha, img) {
            if (!folha || !img) { return; }
            var d = document.createElement('div');
            d.className = 'p96-fundo';
            var novo = document.createElement('img');
            novo.src = img.getAttribute('src') || img.src || '';
            novo.alt = 'foto';
            d.appendChild(novo);
            var veu = document.createElement('div');
            veu.className = 'p96-veu';
            if (folha.firstChild) {
              folha.insertBefore(d, folha.firstChild);
              folha.insertBefore(veu, d.nextSibling);
            } else {
              folha.appendChild(d);
              folha.appendChild(veu);
            }
          }
        
          function aplicarCheios() {
            var c = lerCheio();
            if (!c || (!c.capa && !c.dados && !c.fim)) { return; }
            var folhas = document.querySelectorAll('.p94-folha');
            if (!folhas.length) { return; }
            var selo = JSON.stringify([!!c.capa, !!c.dados, !!c.fim]);
            var i, ultimaImg = null;
        
            for (i = 0; i < folhas.length; i++) {
              var im = folhas[i].querySelector('.p94-i img');
              if (im) { ultimaImg = im; }
            }
        
            function trata(folha, ligado) {
              if (!folha) { return; }
              if (folha.getAttribute('data-p96') === selo) { return; }
              folha.setAttribute('data-p96', selo);
              var antigo = folha.querySelector('.p96-fundo');
              var veuAntigo = folha.querySelector('.p96-veu');
              if (antigo && antigo.parentNode) { antigo.parentNode.removeChild(antigo); }
              if (veuAntigo && veuAntigo.parentNode) { veuAntigo.parentNode.removeChild(veuAntigo); }
              var caixa = folha.querySelector('.p94-i');
              if (!ligado) {
                if (caixa) { caixa.style.display = ''; }
                return;
              }
              var origem = caixa ? caixa.querySelector('img') : ultimaImg;
              if (!origem) { return; }
              fundoCheio(folha, origem);
              if (caixa) { caixa.style.display = 'none'; }
            }
        
            estilo();
            trata(folhas[0], !!c.capa);
            if (folhas.length > 1) { trata(folhas[1], !!c.dados); }
            if (folhas.length > 2) { trata(folhas[folhas.length - 1], !!c.fim); }
          }
        
          setInterval(function () {
            try { colocarBotoes(); } catch (e) {}
            try { aplicarCheios(); } catch (e2) {}
          }, 1200);
        
          espera(900, function () {
            try { colocarBotoes(); } catch (e) {}
          });
        
          document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape' && document.getElementById('p96Fundo')) { fechar(); }
          });
        
        })();
    
