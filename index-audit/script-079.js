
        (function () {
          'use strict';
          if (window.__p114) { return; }
          window.__p114 = true;
        
          var K_ULT = 'p92_fpdo_ultimo_v1';
          var LS = 'p100_apagados_v1';
        
          function porId(id) { return document.getElementById(id); }
        
          function visivel(el) {
            if (!el) { return false; }
            try {
              var s = window.getComputedStyle(el);
              if (!s || s.display === 'none' || s.visibility === 'hidden') { return false; }
              return (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);
            } catch (e) { return false; }
          }
        
          /* ================================================================ *
           * 1) caixas da Agenda: fechar de verdade e nunca deixar a tela presa
           * ================================================================ */
          var TRAVAS = ['ag-modal-aberto', 'p52-travado', 'p53-travado', 'modal-open',
                        'modal-aberto', 'no-scroll', 'sem-scroll', 'overflow-hidden', 'travado'];
        
          var JANELAS = ['#p112Caixa.p112-on', '#agModal.ag-aberto', '#p94Fundo', '#p96Fundo',
                         '#p92Fundo', '#p84Fundo', '#p83Fundo', '.modal-bg', 'dialog[open]'].join(',');
        
          function algumaJanelaAberta() {
            var l, i;
            try { l = document.querySelectorAll(JANELAS); } catch (e) { return false; }
            for (i = 0; i < l.length; i++) {
              if (l[i].id === 'p94Fundo' || l[i].id === 'p92Fundo') {
                if (l[i].style.display === 'block') { return true; }
                continue;
              }
              if (visivel(l[i])) { return true; }
            }
            return false;
          }
        
          function soltarTela() {
            var b = document.body, h = document.documentElement, i;
            if (!b) { return; }
            for (i = 0; i < TRAVAS.length; i++) {
              b.classList.remove(TRAVAS[i]);
              if (h) { h.classList.remove(TRAVAS[i]); }
            }
            try {
              if (b.style.overflow === 'hidden') { b.style.overflow = ''; }
              if (b.style.position === 'fixed') { b.style.position = ''; }
              if (h && h.style.overflow === 'hidden') { h.style.overflow = ''; }
              if (b.style.pointerEvents === 'none') { b.style.pointerEvents = ''; }
            } catch (e) {}
          }
        
          function fecharCaixas() {
            var c = porId('p112Caixa');
            if (c) { c.classList.remove('p112-on'); }
            var a = porId('agModal');
            if (a && a.classList.contains('ag-aberto')) { a.classList.remove('ag-aberto'); }
            soltarTela();
          }
        
          function botaoSolta() {
            var b = porId('p114Solta');
            if (!b && document.body) {
              b = document.createElement('button');
              b.id = 'p114Solta';
              b.type = 'button';
              b.textContent = 'Destravar a tela';
              b.setAttribute('data-html2canvas-ignore', 'true');
              b.addEventListener('click', function () {
                fecharCaixas();
                b.classList.remove('p114-on');
              });
              document.body.appendChild(b);
            }
            return b;
          }
        
          function vigiarTrava() {
            var b = botaoSolta();
            if (!b || !document.body) { return; }
            var presa = false, i;
            for (i = 0; i < TRAVAS.length; i++) {
              if (document.body.classList.contains(TRAVAS[i])) { presa = true; }
            }
            try { if (window.getComputedStyle(document.body).overflow === 'hidden') { presa = true; } } catch (e) {}
            if (presa && !algumaJanelaAberta()) {
              soltarTela();
              b.classList.remove('p114-on');
              return;
            }
            if (presa && algumaJanelaAberta()) { b.classList.add('p114-on'); }
            else { b.classList.remove('p114-on'); }
          }
        
          /* ================================================================ *
           * 2) aviso de internet: so aparece quando a conexao cai
           * ================================================================ */
          function faixaNet() {
            var d = porId('p114Net');
            if (!d && document.body) {
              d = document.createElement('div');
              d.id = 'p114Net';
              d.textContent = 'Sem internet - trabalhando neste computador. Os dados sao enviados quando a conexao voltar.';
              d.setAttribute('data-html2canvas-ignore', 'true');
              document.body.appendChild(d);
            }
            return d;
          }
        
          function verNet() {
            var d = faixaNet();
            if (!d || !document.body) { return; }
            var fora = (navigator && navigator.onLine === false);
            if (fora) {
              d.classList.add('p114-on');
              document.body.classList.add('p114-sem-net');
            } else {
              d.classList.remove('p114-on');
              document.body.classList.remove('p114-sem-net');
            }
            document.body.classList.remove('p111-com-faixa');
          }
        
          /* ================================================================ *
           * 3) devolver os itens apagados nas folhas recem-montadas
           *    (mesma conta usada pelo botao "Apagar qualquer coisa")
           * ================================================================ */
          function idAtual() {
            try { return localStorage.getItem(K_ULT) || 'sem_id'; } catch (e) { return 'sem_id'; }
          }
        
          function conjunto() {
            var todo = {}, m = {}, lista, i;
            try { todo = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { todo = {}; }
            lista = todo[idAtual()];
            if (!lista || Object.prototype.toString.call(lista) !== '[object Array]') { return m; }
            for (i = 0; i < lista.length; i++) { m[lista[i]] = true; }
            return m;
          }
        
          function numeroDaFolha(folha) {
            var p = folha && folha.parentNode;
            if (!p) { return 0; }
            var i, n = 0, f = p.children;
            for (i = 0; i < f.length; i++) {
              if (f[i] === folha) { return n; }
              if (f[i].classList && f[i].classList.contains('p94-folha')) { n++; }
            }
            return n;
          }
        
          function caixaPct(el, folha) {
            var r, fr;
            try {
              r = el.getBoundingClientRect();
              fr = folha.getBoundingClientRect();
            } catch (e) { return null; }
            var lg = fr.width, al = fr.height;
            if (!lg || !al || lg < 40 || al < 40) { return null; }
            return {
              l: Math.round(((r.left - fr.left) / lg) * 100),
              t: Math.round(((r.top - fr.top) / al) * 100),
              w: Math.round((r.width / lg) * 100),
              h: Math.round((r.height / al) * 100)
            };
          }
        
          function classesDe(el) {
            var c = String(el.className || '');
            if (!c) { return ''; }
            var lst = c.split(/\s+/).filter(function (x) {
              if (!x) { return false; }
              if (x.indexOf('p99-') === 0 || x.indexOf('p100-') === 0) { return false; }
              return true;
            });
            lst.sort();
            return lst.join('.');
          }
        
          function migalha(el) {
            var t = String(el.textContent || '').replace(/\s+/g, ' ').replace(/^ | $/g, '');
            if (t.length > 34) { t = t.slice(0, 34); }
            var n = 0, i;
            for (i = 0; i < t.length; i++) { n = ((n * 31) + t.charCodeAt(i)) % 99999989; }
            return t.length + '_' + n;
          }
        
          function ignorar(el) {
            if (!el || el.nodeType !== 1) { return true; }
            if (el.classList && (el.classList.contains('p99-mk') || el.classList.contains('p99-h'))) { return true; }
            if (el.hasAttribute && el.hasAttribute('data-html2canvas-ignore')) { return true; }
            var t = String(el.tagName || '').toLowerCase();
            if (t === 'style' || t === 'script' || t === 'br') { return true; }
            return false;
          }
        
          function esconderApagados(raiz) {
            if (!raiz) { return 0; }
            var mapa = conjunto();
            var chaves = 0, k;
            for (k in mapa) { if (Object.prototype.hasOwnProperty.call(mapa, k)) { chaves++; break; } }
            if (!chaves) { return 0; }
            var folhas;
            try { folhas = raiz.querySelectorAll('.p94-folha'); } catch (e) { return 0; }
            var i, j, todos, el, sig, feitos = 0;
            for (i = 0; i < folhas.length; i++) {
              try { todos = folhas[i].querySelectorAll('*'); } catch (e2) { continue; }
              for (j = 0; j < todos.length; j++) {
                el = todos[j];
                if (ignorar(el)) { continue; }
                var g = caixaPct(el, folhas[i]);
                if (!g) { continue; }
                sig = numeroDaFolha(folhas[i]) + '|' + String(el.tagName || '').toLowerCase() + '|' +
                      classesDe(el) + '|' + g.l + ',' + g.t + ',' + g.w + ',' + g.h + '|' + migalha(el);
                if (mapa[sig]) { el.style.display = 'none'; feitos++; }
              }
            }
            return feitos;
          }
        
          function limparFolhas(raiz) {
            var f = raiz;
            while (f && f !== document.body) {
              if (f.id === 'p94Palco' || f.id === 'p94Impr' || f.id === 'p94Lupa') { break; }
              f = f.parentNode;
            }
            esconderApagados(f && f !== document.body ? f : raiz);
          }
        
          /* ================================================================ *
           * 4) PDF e impressao dos slides sem fundo preto
           * ================================================================ */
          var L16 = 338.67;   /* folha 16:9 em milimetros (mesma proporcao do slide) */
          var A16 = 190.5;
        
          function eh16(f) {
            return typeof f === 'string' && f.toLowerCase() === 'a4';
          }
        
          function arrumarDoc(doc) {
            if (!doc || doc.__p114) { return doc; }
            doc.__p114 = true;
            var addPage = doc.addPage;
            var rect = doc.rect;
            var setFill = doc.setFillColor;
            var addImage = doc.addImage;
        
            doc.addPage = function (formato, giro) {
              if (eh16(formato)) { return addPage.call(this, [L16, A16], giro || 'landscape'); }
              return addPage.apply(this, arguments);
            };
            doc.setFillColor = function (a, b, c) {
              if (arguments.length === 3 && Number(a) === 0 && Number(b) === 0 && Number(c) === 0) {
                return setFill.call(this, 255, 255, 255);
              }
              if (arguments.length === 1 && String(a).toLowerCase().replace('#', '') === '000000') {
                return setFill.call(this, 255, 255, 255);
              }
              return setFill.apply(this, arguments);
            };
            doc.rect = function (x, y, w, h, estilo) {
              if (estilo === 'F' && w > L16 * 0.7 && h > A16 * 0.7) {
                return rect.call(this, x, y, L16, A16, 'F');
              }
              return rect.apply(this, arguments);
            };
            doc.addImage = function (dados, tipo, x, y, w, h) {
              if (w > L16 * 0.7) {
                var resto = [].slice.call(arguments, 6);
                return addImage.apply(this, [dados, tipo, 0, 0, L16, A16].concat(resto));
              }
              return addImage.apply(this, arguments);
            };
            return doc;
          }
        
          function trocarClassePdf() {
            var alvos = [];
            if (window.jspdf && typeof window.jspdf.jsPDF === 'function') { alvos.push(['jspdf', window.jspdf]); }
            if (typeof window.jsPDF === 'function') { alvos.push(['janela', null]); }
            var i;
            for (i = 0; i < alvos.length; i++) {
              var pai = alvos[i][1];
              var real = pai ? pai.jsPDF : window.jsPDF;
              if (!real || real.__p114) { continue; }
              var Novo = function (op) {
                var o = op || {};
                if (o && String(o.orientation || '').toLowerCase() === 'landscape' && eh16(o.format)) {
                  var copia = {}, k;
                  for (k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) { copia[k] = o[k]; } }
                  copia.format = [L16, A16];
                  return arrumarDoc(new real(copia));
                }
                return new real(o);
              };
              Novo.prototype = real.prototype;
              Novo.__p114 = true;
              var p;
              for (p in real) { if (Object.prototype.hasOwnProperty.call(real, p)) { try { Novo[p] = real[p]; } catch (e) {} } }
              if (pai) { pai.jsPDF = Novo; } else { window.jsPDF = Novo; }
            }
          }
        
          function trocarCanvas() {
            var real = window.html2canvas;
            if (typeof real !== 'function' || real.__p114) { return; }
            var Novo = function (alvo, op) {
              var o = op || {};
              try {
                if (alvo && alvo.classList && alvo.classList.contains('p94-folha')) {
                  limparFolhas(alvo);
                  if (String(o.backgroundColor || '').toLowerCase() === '#000000') { o.backgroundColor = '#ffffff'; }
                }
              } catch (e) {}
              return real.call(window, alvo, o);
            };
            Novo.__p114 = true;
            var k;
            for (k in real) { if (Object.prototype.hasOwnProperty.call(real, k)) { try { Novo[k] = real[k]; } catch (e2) {} } }
            window.html2canvas = Novo;
          }
        
          function trocarPrint() {
            if (window.__p114print) { return; }
            window.__p114print = true;
            var real = window.print;
            if (typeof real !== 'function') { return; }
            window.print = function () {
              try {
                esconderApagados(porId('p94Impr'));
                esconderApagados(porId('p92Impressao'));
              } catch (e) {}
              return real.apply(window, arguments);
            };
          }
        
          /* ================================================================ *
           * comecar
           * ================================================================ */
          function iniciar() {
            if (!document.body) { setTimeout(iniciar, 60); return; }
            botaoSolta();
            faixaNet();
            verNet();
            vigiarTrava();
            trocarPrint();
        
            document.addEventListener('keydown', function (ev) {
              if (ev.key === 'Escape' || ev.keyCode === 27) {
                var c = porId('p112Caixa');
                var a = porId('agModal');
                if ((c && c.classList.contains('p112-on')) || (a && a.classList.contains('ag-aberto'))) {
                  fecharCaixas();
                }
              }
            }, true);
        
            document.addEventListener('click', function (ev) {
              var c = porId('p112Caixa');
              if (c && c.classList.contains('p112-on') && ev.target === c) { fecharCaixas(); }
            }, true);
        
            window.addEventListener('online', verNet);
            window.addEventListener('offline', verNet);
            window.addEventListener('afterprint', function () { setTimeout(vigiarTrava, 200); });
        
            setInterval(function () {
              verNet();
              vigiarTrava();
              trocarCanvas();
              trocarClassePdf();
            }, 700);
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        })();
    
