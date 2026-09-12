
        (function () {
          'use strict';
          if (window.__p111) { return; }
          window.__p111 = true;
        
          var ALTURA = 22;
        
          function verde(cor) {
            var m = String(cor || '').match(/rgba?\(([^)]+)\)/);
            if (!m) { return false; }
            var p = m[1].split(',');
            var r = parseFloat(p[0]), g = parseFloat(p[1]), b = parseFloat(p[2]);
            var a = p.length > 3 ? parseFloat(p[3]) : 1;
            if (a < 0.2) { return false; }
            return (g > 90 && g < 210 && r < 120 && b < 170 && g - r > 40 && g - b > 15);
          }
        
          /* acha a barra fixa e larga que fica no rodape (verde ou nao) */
          function candidatos() {
            var achados = [];
            var alvo = document.getElementById('modernizacaoStatusPainel');
            if (alvo) { achados.push(alvo); }
            var todos = document.body ? document.body.querySelectorAll('div,span,section,aside,p') : [];
            var alturaTela = window.innerHeight || 800;
            var larguraTela = window.innerWidth || 1200;
            for (var i = 0; i < todos.length && i < 4000; i++) {
              var el = todos[i];
              if (el.id === 'modernizacaoStatusPainel' || el.className === 'p111-faixa-topo') { continue; }
              var s;
              try { s = window.getComputedStyle(el); } catch (e) { continue; }
              if (!s || s.position !== 'fixed' || s.display === 'none' || s.visibility === 'hidden') { continue; }
              var cx = el.getBoundingClientRect();
              if (cx.width < larguraTela * 0.6) { continue; }
              if (cx.height > 60 || cx.height < 6) { continue; }
              if (cx.top < alturaTela * 0.55) { continue; }
              if (!verde(s.backgroundColor)) { continue; }
              achados.push(el);
            }
            return achados;
          }
        
          function aplicar() {
            var lista = candidatos();
            var visivel = false;
            for (var i = 0; i < lista.length; i++) {
              var el = lista[i];
              if (el.className && String(el.className).indexOf('p111-faixa-topo') === -1) {
                el.className = String(el.className) + ' p111-faixa-topo';
              } else if (!el.className) {
                el.className = 'p111-faixa-topo';
              }
              var s2;
              try { s2 = window.getComputedStyle(el); } catch (e) { s2 = null; }
              if (!s2 || (s2.display !== 'none' && s2.visibility !== 'hidden')) { visivel = true; }
            }
            var alvo = document.getElementById('modernizacaoStatusPainel');
            if (alvo) {
              var s3;
              try { s3 = window.getComputedStyle(alvo); } catch (e) { s3 = null; }
              if (!s3 || (s3.display !== 'none' && s3.visibility !== 'hidden')) { visivel = true; }
            }
            if (document.body) {
              if (visivel) { document.body.classList.add('p111-com-faixa'); }
              else { document.body.classList.remove('p111-com-faixa'); }
            }
            return visivel;
          }
        
          function iniciar() {
            aplicar();
            var esperando = false;
            function agendar() {
              if (esperando) { return; }
              esperando = true;
              setTimeout(function () { esperando = false; aplicar(); }, 250);
            }
            try {
              var obs = new MutationObserver(agendar);
              obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
            } catch (e) {}
            window.addEventListener('resize', agendar);
            window.addEventListener('online', agendar);
            window.addEventListener('offline', agendar);
            setInterval(aplicar, 2000);
            void ALTURA;
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        })();
    
