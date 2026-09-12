
        /* ====== PATCH101_FERRAMENTAS_NA_FRENTE ======
           Deixa a barra de botoes da conferencia de slides SEMPRE na frente.
           Antes ela ficava escondida atras das folhas dos slides.
           Este bloco so acrescenta: nada do que ja existe e apagado.
           ====== */
        (function () {
          'use strict';
          if (window.__PS101) { return; }
          window.__PS101 = true;
        
          var CSS = [
            /* a barra fica colada no topo e por cima de tudo dentro da janela */
            'html body #p94Fundo .p94-barra{position:sticky !important;top:0 !important;',
            '  z-index:2147483047 !important;background:#0b1220 !important;',
            '  border:1px solid #334155 !important;border-radius:10px !important;',
            '  box-shadow:0 8px 22px rgba(2,6,23,.85) !important;',
            '  max-height:42vh !important;overflow:auto !important;',
            '  margin-bottom:14px !important}',
        
            /* as linhas de botoes acompanham a barra */
            'html body #p94Fundo .p94-barra > *{position:relative !important;z-index:2 !important}',
            'html body #p94Fundo .p99-linha,html body #p94Fundo .p100-linha{',
            '  position:relative !important;z-index:2 !important}',
        
            /* os slides ficam numa camada abaixo da barra */
            'html body #p94Fundo .p94-lupa{position:relative !important;z-index:1 !important}',
            'html body #p94Fundo .p94-folha{position:relative !important;z-index:0 !important}',
        
            /* recados e botao de socorro continuam acima de tudo */
            'html body #p94Aviso,html body #p99Aviso,html body #p100Aviso{z-index:2147483647 !important}',
            'html body #p100Liberar{z-index:2147483646 !important}',
        
            /* na impressao a barra nao aparece */
            '@media print{html body #p94Fundo .p94-barra{display:none !important}}'
          ].join('\n');
        
          function estilo() {
            var s = document.getElementById('p101Estilo');
            if (!s) {
              s = document.createElement('style');
              s.id = 'p101Estilo';
              (document.head || document.documentElement).appendChild(s);
            }
            if (s.textContent !== CSS) { s.textContent = CSS; }
            /* garante que este estilo seja o ultimo da lista */
            var h = document.head;
            if (h && h.lastChild !== s) { h.appendChild(s); }
          }
        
          function por(el, nome, valor) {
            if (!el || !el.style) { return; }
            try { el.style.setProperty(nome, valor, 'important'); } catch (e) {}
          }
        
          function frente() {
            var f = document.getElementById('p94Fundo');
            if (!f) { return; }
            var b = f.querySelector('.p94-barra');
            if (b) {
              por(b, 'position', 'sticky');
              por(b, 'top', '0');
              por(b, 'z-index', '2147483047');
              por(b, 'background', '#0b1220');
            }
            var l = f.querySelector('.p94-lupa');
            if (l) {
              por(l, 'position', 'relative');
              por(l, 'z-index', '1');
            }
          }
        
          function iniciar() {
            if (!document.body) { setTimeout(iniciar, 60); return; }
            estilo();
            frente();
            try {
              var mo = new MutationObserver(function () { estilo(); frente(); });
              mo.observe(document.body, { childList: true, subtree: true });
            } catch (e) {}
            setInterval(function () { estilo(); frente(); }, 1500);
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        })();
    
