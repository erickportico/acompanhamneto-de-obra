
        /* PATCH 117 - tarja fina fora do caminho + ajuste de fotos nos slides */
        (function () {
          'use strict';
          if (window.__PS117) { return; }
          window.__PS117 = true;
        
          var K_AJ = 'p117_fotos_v1';
          var K_ULT = 'p92_fpdo_ultimo_v1';
        
          function porId(x) { return document.getElementById(x); }
        
          function aviso(msg, ruim) {
            if (typeof window.mostrarToastPainel === 'function') {
              try { window.mostrarToastPainel(msg, ruim ? 'erro' : 'ok'); return; } catch (e) {}
            }
            try { console.log(msg); } catch (e2) {}
          }
        
          /* ================================================================ *
           * 1) aviso de internet: bolinha pequena no canto, sem faixa
           * ================================================================ */
          function selo() {
            var d = porId('p117Net');
            if (!d && document.body) {
              d = document.createElement('div');
              d.id = 'p117Net';
              d.textContent = 'Sem internet - trabalhando neste computador.';
              d.setAttribute('data-html2canvas-ignore', 'true');
              document.body.appendChild(d);
            }
            return d;
          }
        
          function verNet() {
            var d = selo();
            if (!d || !document.body) { return; }
            var fora = false;
            try { fora = (navigator && navigator.onLine === false); } catch (e) { fora = false; }
            if (fora) { d.classList.add('p117-on'); } else { d.classList.remove('p117-on'); }
            document.body.classList.remove('p114-sem-net');
            document.body.classList.remove('p111-com-faixa');
            var velha = porId('p114Net');
            if (velha && velha.parentNode) { velha.parentNode.removeChild(velha); }
          }
        
          /* ================================================================ *
           * 2) ajustes gravados de cada foto
           * ================================================================ */
          function relId() {
            try { return localStorage.getItem(K_ULT) || 'sem_id'; } catch (e) { return 'sem_id'; }
          }
        
          function ler() {
            try {
              var t = JSON.parse(localStorage.getItem(K_AJ) || '{}');
              return (t && typeof t === 'object') ? t : {};
            } catch (e) { return {}; }
          }
        
          function gravar(t) {
            try { localStorage.setItem(K_AJ, JSON.stringify(t)); return true; } catch (e) { return false; }
          }
        
          function padrao() { return { fit: 'contain', z: 1, px: 50, py: 50 }; }
        
          function chaveDe(img) {
            return relId() + '|' + String(img.getAttribute('data-p117k') || '');
          }
        
          function ajusteDe(img) {
            var t = ler();
            var o = t[chaveDe(img)];
            if (!o) { return null; }
            return {
              fit: (o.fit === 'cover' || o.fit === 'fill') ? o.fit : 'contain',
              z: Number(o.z) > 0 ? Number(o.z) : 1,
              px: isNaN(Number(o.px)) ? 50 : Number(o.px),
              py: isNaN(Number(o.py)) ? 50 : Number(o.py)
            };
          }
        
          function guardar(img, o) {
            var t = ler();
            t[chaveDe(img)] = { fit: o.fit, z: o.z, px: o.px, py: o.py };
            gravar(t);
          }
        
          function apagar(img) {
            var t = ler();
            delete t[chaveDe(img)];
            gravar(t);
          }
        
          /* ---------------- numerar as fotos de cada slide ---------------- */
          function numerar() {
            var folhas, i, j;
            try { folhas = document.querySelectorAll('.p94-folha'); } catch (e) { return; }
            var pais = [], conta = [];
            for (i = 0; i < folhas.length; i++) {
              var p = folhas[i].parentNode;
              var k = pais.indexOf(p);
              if (k < 0) { pais.push(p); conta.push(0); k = pais.length - 1; }
              var n = conta[k];
              conta[k] = n + 1;
              var ims = folhas[i].querySelectorAll('.p94-i img');
              for (j = 0; j < ims.length; j++) {
                ims[j].setAttribute('data-p117k', 's' + n + 'i' + j);
              }
            }
          }
        
          function pintar(img, o) {
            if (!img) { return; }
            if (!o) {
              img.classList.remove('p117-aj');
              try {
                img.style.removeProperty('object-fit');
                img.style.removeProperty('object-position');
                img.style.removeProperty('transform');
                img.style.removeProperty('transform-origin');
              } catch (e) {}
              return;
            }
            img.classList.add('p117-aj');
            var pos = o.px + '% ' + o.py + '%';
            try {
              img.style.setProperty('object-fit', o.fit, 'important');
              img.style.setProperty('object-position', pos, 'important');
              img.style.setProperty('transform', 'scale(' + o.z + ')', 'important');
              img.style.setProperty('transform-origin', pos, 'important');
            } catch (e2) {}
          }
        
          function aplicarTudo() {
            numerar();
            var ims, i;
            try { ims = document.querySelectorAll('.p94-folha .p94-i img'); } catch (e) { return; }
            for (i = 0; i < ims.length; i++) { pintar(ims[i], ajusteDe(ims[i])); }
          }
        
          /* ================================================================ *
           * 3) caixinha de ajuste (esticar, cortar, mover)
           * ================================================================ */
          var alvo = null;
          var atual = null;
        
          function fecharCaixa() {
            var c = porId('p117Cx');
            if (c && c.parentNode) { c.parentNode.removeChild(c); }
            var m = document.querySelectorAll('.p117-alvo');
            var i;
            for (i = 0; i < m.length; i++) { m[i].classList.remove('p117-alvo'); }
            alvo = null;
            atual = null;
          }
        
          function marcarModo() {
            var c = porId('p117Cx');
            if (!c || !atual) { return; }
            var bs = c.querySelectorAll('[data-p117f]'), i;
            for (i = 0; i < bs.length; i++) {
              if (bs[i].getAttribute('data-p117f') === atual.fit) { bs[i].className = 'on'; }
              else { bs[i].className = ''; }
            }
          }
        
          function desenhar() {
            if (!alvo || !atual) { return; }
            pintar(alvo, atual);
            marcarModo();
          }
        
          function sincronizarBarras() {
            var z = porId('p117Z'), x = porId('p117X'), y = porId('p117Y');
            if (!atual) { return; }
            if (z) { z.value = String(Math.round(atual.z * 100)); }
            if (x) { x.value = String(Math.round(atual.px)); }
            if (y) { y.value = String(Math.round(atual.py)); }
          }
        
          function abrirCaixa(img) {
            fecharCaixa();
            alvo = img;
            atual = ajusteDe(img) || padrao();
            var mold = img.closest ? img.closest('.p94-i') : null;
            if (mold) { mold.classList.add('p117-alvo'); }
        
            var c = document.createElement('div');
            c.id = 'p117Cx';
            c.setAttribute('data-html2canvas-ignore', 'true');
            c.innerHTML =
              '<h4>Ajustar esta foto</h4>' +
              '<div class="p117-lin">' +
                '<button type="button" data-p117f="contain">Foto inteira</button>' +
                '<button type="button" data-p117f="cover">Preencher / cortar</button>' +
                '<button type="button" data-p117f="fill">Esticar</button>' +
              '</div>' +
              '<label class="p117-l">Aproximar / afastar</label>' +
              '<input id="p117Z" type="range" min="100" max="400" step="5">' +
              '<label class="p117-l">Mover para os lados</label>' +
              '<input id="p117X" type="range" min="0" max="100" step="1">' +
              '<label class="p117-l">Mover para cima / baixo</label>' +
              '<input id="p117Y" type="range" min="0" max="100" step="1">' +
              '<div class="p117-lin">' +
                '<button type="button" class="ok" data-p117a="salvar">Salvar</button>' +
                '<button type="button" data-p117a="todas">Usar em todas</button>' +
                '<button type="button" data-p117a="zerar">Voltar ao normal</button>' +
                '<button type="button" data-p117a="sair">Fechar</button>' +
              '</div>' +
              '<div class="p117-dica">Arraste a foto com o dedo ou com o mouse para escolher o pedaco ' +
              'que aparece. "Preencher / cortar" corta as sobras, "Esticar" puxa a foto ate encher o ' +
              'espaco e "Foto inteira" mostra tudo com borda. As mudancas ficam guardadas e valem na ' +
              'tela, no PDF e na impressao.</div>';
            document.body.appendChild(c);
        
            sincronizarBarras();
            desenhar();
        
            var z = porId('p117Z'), x = porId('p117X'), y = porId('p117Y');
            if (z) {
              z.addEventListener('input', function () {
                if (!atual) { return; }
                atual.z = Math.max(1, Number(z.value) / 100);
                desenhar();
              });
            }
            if (x) {
              x.addEventListener('input', function () {
                if (!atual) { return; }
                atual.px = Math.min(100, Math.max(0, Number(x.value)));
                desenhar();
              });
            }
            if (y) {
              y.addEventListener('input', function () {
                if (!atual) { return; }
                atual.py = Math.min(100, Math.max(0, Number(y.value)));
                desenhar();
              });
            }
        
            c.addEventListener('click', function (ev) {
              var b = ev.target && ev.target.closest ? ev.target.closest('[data-p117f],[data-p117a]') : null;
              if (!b || !atual) { return; }
              ev.preventDefault();
              ev.stopPropagation();
              var f = b.getAttribute('data-p117f');
              if (f) { atual.fit = f; desenhar(); return; }
              var a = b.getAttribute('data-p117a');
              if (a === 'sair') { aplicarTudo(); fecharCaixa(); return; }
              if (a === 'salvar') {
                guardar(alvo, atual);
                aviso('Foto ajustada e guardada.');
                fecharCaixa();
                aplicarTudo();
                return;
              }
              if (a === 'zerar') {
                apagar(alvo);
                atual = padrao();
                pintar(alvo, null);
                sincronizarBarras();
                marcarModo();
                aviso('Foto voltou ao normal.');
                return;
              }
              if (a === 'todas') {
                var t = ler(), ims, i;
                try { ims = document.querySelectorAll('#p94Lupa .p94-folha .p94-i img'); } catch (e) { ims = []; }
                for (i = 0; i < ims.length; i++) {
                  t[relId() + '|' + String(ims[i].getAttribute('data-p117k') || '')] =
                    { fit: atual.fit, z: atual.z, px: atual.px, py: atual.py };
                }
                gravar(t);
                aplicarTudo();
                aviso('Ajuste usado em todas as fotos dos slides.');
                return;
              }
            }, true);
          }
        
          /* ---------------- arrastar a foto dentro da moldura ---------------- */
          var puxa = null;
        
          function editandoLivre() {
            /* a edicao livre dos slides (patch 99) marca a area com a classe p99-edit;
               quando ela esta ligada, deixamos o arraste dela funcionar em paz */
            try { return !!document.querySelector('.p99-edit'); } catch (e) { return false; }
          }
        
          function fotoDoEvento(ev) {
            var t = ev.target;
            if (!t || !t.closest) { return null; }
            if (!t.closest('#p94Lupa')) { return null; }
            var mold = t.closest('.p94-i');
            if (!mold) { return null; }
            return mold.querySelector('img');
          }
        
          window.addEventListener('pointerdown', function (ev) {
            if (editandoLivre()) { return; }
            var img = fotoDoEvento(ev);
            if (!img || img !== alvo || !atual) { return; }
            var mold = img.closest('.p94-i');
            var r;
            try { r = mold.getBoundingClientRect(); } catch (e) { return; }
            if (!r || !r.width || !r.height) { return; }
            ev.preventDefault();
            ev.stopPropagation();
            puxa = { x: ev.clientX, y: ev.clientY, px: atual.px, py: atual.py, w: r.width, h: r.height };
            document.body.classList.add('p117-pegando');
          }, true);
        
          window.addEventListener('pointermove', function (ev) {
            if (!puxa || !atual) { return; }
            ev.preventDefault();
            ev.stopPropagation();
            var dx = ((ev.clientX - puxa.x) / puxa.w) * 100;
            var dy = ((ev.clientY - puxa.y) / puxa.h) * 100;
            atual.px = Math.min(100, Math.max(0, puxa.px - dx));
            atual.py = Math.min(100, Math.max(0, puxa.py - dy));
            sincronizarBarras();
            desenhar();
          }, true);
        
          function soltar() {
            if (!puxa) { return; }
            puxa = null;
            document.body.classList.remove('p117-pegando');
          }
        
          window.addEventListener('pointerup', soltar, true);
          window.addEventListener('pointercancel', soltar, true);
          window.addEventListener('blur', soltar);
        
          /* ---------------- clique para escolher a foto ---------------- */
          window.addEventListener('click', function (ev) {
            if (editandoLivre()) { return; }
            var img = fotoDoEvento(ev);
            if (!img) { return; }
            ev.preventDefault();
            ev.stopPropagation();
            if (typeof ev.stopImmediatePropagation === 'function') { ev.stopImmediatePropagation(); }
            if (img === alvo) { return; }
            abrirCaixa(img);
          }, true);
        
          /* ================================================================ *
           * 4) "Editor visual 16:9" abre a conferencia dos slides
           * ================================================================ */
          function abrirSlides() {
            if (typeof window.p94VerSlides === 'function') {
              try { window.p94VerSlides(); } catch (e) {}
              setTimeout(function () {
                aplicarTudo();
                aviso('Clique em qualquer foto do slide para esticar, cortar ou mover.');
              }, 700);
              return true;
            }
            return false;
          }
        
          window.p96AbrirEditor = function () { abrirSlides(); };
        
          window.addEventListener('click', function (ev) {
            var t = ev.target;
            if (!t || !t.closest) { return; }
            var b = t.closest('button,a');
            if (!b) { return; }
            var marca = String(b.getAttribute('data-a') || '');
            var rot = String(b.textContent || '');
            var ehEditor = (marca === 'editorVisual') || (rot.indexOf('Editor visual') >= 0);
            if (!ehEditor) { return; }
            ev.preventDefault();
            ev.stopPropagation();
            if (typeof ev.stopImmediatePropagation === 'function') { ev.stopImmediatePropagation(); }
            if (!abrirSlides()) { aviso('Abra o Relatorio FPDO e clique em "Ver slides".', true); }
          }, true);
        
          /* ---------------- recado dentro da barra dos slides ---------------- */
          function recado() {
            var f = porId('p94Fundo');
            if (!f || f.style.display !== 'block') { return; }
            var b = f.querySelector('.p94-barra');
            if (!b || b.querySelector('.p117-hint')) { return; }
            var s = document.createElement('span');
            s.className = 'p117-hint';
            s.textContent = 'Clique numa foto para esticar, cortar ou mover.';
            b.appendChild(s);
          }
        
          /* ================================================================ *
           * 5) vigia geral
           * ================================================================ */
          function rodada() {
            verNet();
            recado();
            /* enquanto a caixinha esta aberta, nao mexemos no que o usuario esta ajustando */
            if (!alvo) { aplicarTudo(); }
          }
        
          function vigiarNovasFolhas() {
            if (!window.MutationObserver || !document.body) { return; }
            var pendente = null;
            var ob = new MutationObserver(function (lista) {
              var achou = false, i, j, n;
              for (i = 0; i < lista.length && !achou; i++) {
                for (j = 0; j < lista[i].addedNodes.length; j++) {
                  n = lista[i].addedNodes[j];
                  if (!n || n.nodeType !== 1) { continue; }
                  if (n.classList && n.classList.contains('p94-folha')) { achou = true; break; }
                  if (n.querySelector && n.querySelector('.p94-folha')) { achou = true; break; }
                }
              }
              if (!achou || alvo) { return; }
              if (pendente) { clearTimeout(pendente); }
              pendente = setTimeout(function () { pendente = null; aplicarTudo(); }, 40);
            });
            try { ob.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
          }
        
          function iniciar() {
            rodada();
            setInterval(rodada, 1500);
            vigiarNovasFolhas();
            window.addEventListener('online', verNet);
            window.addEventListener('offline', verNet);
            window.addEventListener('beforeprint', aplicarTudo);
            document.addEventListener('keydown', function (ev) {
              if (ev.key !== 'Escape' && ev.keyCode !== 27) { return; }
              if (porId('p117Cx')) { ev.stopPropagation(); fecharCaixa(); }
            }, true);
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        })();
    
