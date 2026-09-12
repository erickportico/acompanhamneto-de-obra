
        /* ------------------------------------------------------------------ *
         * PATCH 106 - aviso "Nuvem: ..." fora do caminho do botao de anexo
         * ------------------------------------------------------------------ */
        (function () {
          'use strict';
        
          var ID = 'p104Status';
          var CHAVE = 'p104StatusPos';
        
          function lido() {
            try {
              var t = window.localStorage.getItem(CHAVE);
              if (!t) { return null; }
              var o = JSON.parse(t);
              if (o && typeof o.x === 'number' && typeof o.y === 'number') { return o; }
            } catch (e) {}
            return null;
          }
        
          function grava(x, y) {
            try { window.localStorage.setItem(CHAVE, JSON.stringify({ x: x, y: y })); } catch (e) {}
          }
        
          function apaga() {
            try { window.localStorage.removeItem(CHAVE); } catch (e) {}
          }
        
          function limites(x, y, larg, alt) {
            var maxX = Math.max(0, (window.innerWidth || 1000) - larg - 4);
            var maxY = Math.max(0, (window.innerHeight || 700) - alt - 4);
            return { x: Math.min(Math.max(4, x), maxX), y: Math.min(Math.max(4, y), maxY) };
          }
        
          function padrao(d) {
            d.removeAttribute('data-p106-livre');
            d.style.setProperty('left', 'auto', 'important');
            d.style.setProperty('top', 'auto', 'important');
            d.style.setProperty('right', '14px', 'important');
            d.style.setProperty('bottom', '14px', 'important');
          }
        
          function livre(d, x, y) {
            d.setAttribute('data-p106-livre', '1');
            d.style.setProperty('right', 'auto', 'important');
            d.style.setProperty('bottom', 'auto', 'important');
            d.style.setProperty('left', x + 'px', 'important');
            d.style.setProperty('top', y + 'px', 'important');
          }
        
          function colocar(d) {
            var p = lido();
            if (!p) { padrao(d); return; }
            var r = d.getBoundingClientRect();
            var q = limites(p.x, p.y, r.width || 150, r.height || 28);
            livre(d, q.x, q.y);
          }
        
          function preparar(d) {
            if (d.getAttribute('data-p106') === '1') { colocar(d); return; }
            d.setAttribute('data-p106', '1');
            d.setAttribute('title',
              'Situacao da nuvem.\nClique: sincroniza agora\nArraste: muda de lugar\nShift + clique: volta ao canto');
            colocar(d);
        
            var pegando = false, moveu = false, dx = 0, dy = 0, larg = 150, alt = 28;
        
            function pt(ev) { return (ev.touches && ev.touches.length) ? ev.touches[0] : ev; }
        
            function inicio(ev) {
              var p = pt(ev), r = d.getBoundingClientRect();
              pegando = true; moveu = false;
              dx = p.clientX - r.left; dy = p.clientY - r.top;
              larg = r.width || larg; alt = r.height || alt;
              d.style.setProperty('cursor', 'grabbing', 'important');
            }
        
            function movendo(ev) {
              if (!pegando) { return; }
              var p = pt(ev);
              var q = limites(p.clientX - dx, p.clientY - dy, larg, alt);
              moveu = true;
              livre(d, q.x, q.y);
              if (ev.preventDefault && ev.cancelable) { ev.preventDefault(); }
            }
        
            function fim() {
              if (!pegando) { return; }
              pegando = false;
              d.style.setProperty('cursor', 'grab', 'important');
              if (moveu) {
                var r = d.getBoundingClientRect();
                grava(Math.round(r.left), Math.round(r.top));
              }
            }
        
            d.addEventListener('mousedown', inicio, false);
            document.addEventListener('mousemove', movendo, false);
            document.addEventListener('mouseup', fim, false);
            d.addEventListener('touchstart', inicio, false);
            document.addEventListener('touchmove', movendo, false);
            document.addEventListener('touchend', fim, false);
        
            var antigo = d.onclick;
            d.onclick = function (ev) {
              if (moveu) { moveu = false; return; }
              if (ev && ev.shiftKey) { apaga(); padrao(d); return; }
              if (typeof antigo === 'function') { return antigo.call(d, ev); }
            };
          }
        
          function olhar() {
            var d = document.getElementById(ID);
            if (d) { preparar(d); }
          }
        
          function ligar() {
            olhar();
            var n = 0;
            var t = setInterval(function () { olhar(); if (++n > 240) { clearInterval(t); } }, 400);
            try {
              if (window.MutationObserver && document.body) {
                new MutationObserver(olhar).observe(document.body,
                  { childList: true, attributes: true, attributeFilter: ['style'], subtree: false });
              }
            } catch (e) {}
            window.addEventListener('resize', function () {
              var d = document.getElementById(ID);
              if (d) { colocar(d); }
            }, false);
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', ligar, false);
          } else { ligar(); }
        })();
    
