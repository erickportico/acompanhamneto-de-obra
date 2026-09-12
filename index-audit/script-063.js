
        /* ================================================================== *
         * PATCH 93 - Correcoes do Relatorio FPDO
         *
         * 1) Impressao: sai so o relatorio, sem o painel por cima.
         * 2) Botao "Fechar" da janela FPDO passa a fechar de verdade.
         *
         * Nao mexe em nada do que ja existe: so acrescenta regras mais
         * fortes de tela/impressao e um fechamento reforcado.
         * ================================================================== */
        (function () {
          'use strict';
        
          if (window.__p93Ligado) { return; }
          window.__p93Ligado = true;
        
          var ID_ESTILO = 'p93Estilo';
          var CLASSE_IMP = 'p93-imprimindo';
          var CLASSE_OCULTO = 'p93-oculto';
        
          /* guarda a impressao original do navegador, antes de qualquer troca */
          var printOriginal = null;
          try { printOriginal = window.print; } catch (e) { printOriginal = null; }
        
          var marcadoFpdo = false;   /* o usuario pediu impressao do FPDO */
          var mexeuP73 = false;      /* tiramos as marcas do patch 73 */
          var guardaP73 = [];
          var relogioLimpar = null;
        
          /* ---------------------------------------------------------------- *
           * regras de estilo (tela e impressao)
           * ---------------------------------------------------------------- */
          function estilo() {
            if (document.getElementById(ID_ESTILO)) { return; }
            var s = document.createElement('style');
            s.id = ID_ESTILO;
            s.type = 'text/css';
            s.textContent = [
              /* --- TELA ------------------------------------------------- */
              /* a pagina tem uma regra antiga que manda todo div filho do body
                 aparecer; por isso a janela FPDO nao sumia ao fechar.
                 Aqui a janela so aparece quando ela mesma pede (flex). */
              'html body div#p92Fundo{display:none !important;align-items:center !important;justify-content:center !important}',
              'html body div#p92Fundo.' + CLASSE_OCULTO + '{display:none !important}',
              'html body div#p92Fundo[style*="flex"]{display:flex !important}',
              /* aviso de "gerando PDF" segue a mesma regra */
              'html body div#p92Espera{display:none !important}',
              'html body div#p92Espera[style*="flex"]{display:flex !important}',
              /* a folha de impressao nunca deve aparecer na tela */
              'html body div#p92Impressao{display:none !important}',
              'html body div#p92Palco{display:block !important;position:fixed !important;left:-20000px !important;top:0 !important;width:auto !important;max-width:none !important}',
        
              /* --- IMPRESSAO -------------------------------------------- */
              '@media print{',
              '  html body.' + CLASSE_IMP + '>*:not(#p92Impressao){display:none !important}',
              '  html body.' + CLASSE_IMP + '{background:#fff !important;margin:0 !important;padding:0 !important;overflow:visible !important}',
              '  html body.' + CLASSE_IMP + ' div#p92Impressao{display:block !important;position:static !important;width:100% !important;max-width:none !important;margin:0 !important;padding:0 !important;background:#fff !important;color:#000 !important}',
              '  html body.' + CLASSE_IMP + ' div#p92Fundo,',
              '  html body.' + CLASSE_IMP + ' div#p92Espera,',
              '  html body.' + CLASSE_IMP + ' div#p92Palco,',
              '  html body.' + CLASSE_IMP + ' div#p92Botao,',
              '  html body.' + CLASSE_IMP + ' .p92-cam,',
              '  html body.' + CLASSE_IMP + ' .p92-lupa,',
              '  html body.' + CLASSE_IMP + ' #meu-menu-abas{display:none !important}',
              '  @page{size:A4;margin:10mm}',
              '}'
            ].join('\n');
            (document.head || document.documentElement).appendChild(s);
          }
        
          /* ---------------------------------------------------------------- *
           * fechar a janela FPDO de verdade
           * ---------------------------------------------------------------- */
          function janela() {
            return document.getElementById('p92Fundo');
          }
        
          function janelaAberta() {
            var f = janela();
            if (!f) { return false; }
            if (f.classList && f.classList.contains(CLASSE_OCULTO)) { return false; }
            var d = '';
            try { d = f.style ? (f.style.display || '') : ''; } catch (e) { d = ''; }
            if (d === 'none') { return false; }
            if (d === 'flex' || d === 'block') { return true; }
            /* sem estilo direto: confere o que o navegador esta mostrando */
            var v = '';
            try { v = window.getComputedStyle(f).display; } catch (e2) { v = ''; }
            return v !== 'none' && v !== '';
          }
        
          function limparSobras() {
            var e = document.getElementById('p92Espera');
            if (e) { e.style.display = 'none'; }
            var i, lst = document.querySelectorAll('.p92-cam,.p92-lupa');
            for (i = 0; i < lst.length; i++) {
              try { lst[i].parentNode.removeChild(lst[i]); } catch (x) {}
            }
          }
        
          function fecharJanela() {
            var f = janela();
            /* PATCH_TELA_EDICAO_AMPLIADA_OK: o editor de fotos agora e um
               overlay proprio (nao mais filho do relatorio), entao precisa
               ser fechado explicitamente junto com o relatorio. */
            try { window.p95FecharEditor && window.p95FecharEditor(); } catch (e0) {}
            try { window.p96FecharEditor && window.p96FecharEditor(); } catch (e0b) {}
            if (!f) { limparSobras(); return; }
            try { f.style.display = 'none'; } catch (e) {}
            if (f.classList) { f.classList.add(CLASSE_OCULTO); }
            f.setAttribute('aria-hidden', 'true');
            limparSobras();
            try {
              if (document.activeElement && f.contains(document.activeElement)) {
                document.activeElement.blur();
              }
            } catch (e2) {}
            /* tira do desenho da pagina; se abrir de novo, ela e remontada */
            window.setTimeout(function () {
              var g = document.getElementById('p92Fundo');
              if (!g) { return; }
              if (g.classList && !g.classList.contains(CLASSE_OCULTO)) { return; }
              try { g.parentNode.removeChild(g); } catch (e3) {}
            }, 150);
          }
        
          /* clique no "Fechar" - pegamos antes de todo mundo */
          document.addEventListener('click', function (ev) {
            var t = ev.target;
            if (!t || !t.closest) { return; }
            var b = t.closest('[data-a="fechar"]');
            if (!b) { return; }
            if (!b.closest('#p92Fundo')) { return; }
            fecharJanela();
          }, true);
        
          /* Esc fecha a janela FPDO */
          document.addEventListener('keydown', function (ev) {
            if (ev.key !== 'Escape' && ev.keyCode !== 27) { return; }
            if (!janelaAberta()) { return; }
            if (document.querySelector('.p92-cam,.p92-lupa')) { limparSobras(); return; }
            fecharJanela();
          }, true);
        
          /* ---------------------------------------------------------------- *
           * impressao: so o relatorio na folha
           * ---------------------------------------------------------------- */
          function temRelatorioPronto() {
            var d = document.getElementById('p92Impressao');
            return !!(d && String(d.innerHTML || '').replace(/\s/g, '').length > 30);
          }
        
          function ehImpressaoFpdo() {
            if (marcadoFpdo) { return true; }
            return janelaAberta() && temRelatorioPronto();
          }
        
          /* o patch 73 marca a aba da tela para imprimir; nesse caso ele
             atrapalha o relatorio, entao guardamos e devolvemos depois */
          function tirarMarcasP73() {
            var i, lst = document.querySelectorAll('.p73-so-aba,.p73-aba-visivel,.p73-fora');
            for (i = 0; i < lst.length; i++) {
              var el = lst[i];
              var tira = [];
              if (el.classList.contains('p73-so-aba')) { tira.push('p73-so-aba'); }
              if (el.classList.contains('p73-aba-visivel')) { tira.push('p73-aba-visivel'); }
              if (el.classList.contains('p73-fora')) { tira.push('p73-fora'); }
              var k;
              for (k = 0; k < tira.length; k++) { el.classList.remove(tira[k]); }
              if (tira.length) { guardaP73.push({ el: el, cls: tira }); }
            }
            mexeuP73 = true;
          }
        
          function devolverMarcasP73() {
            if (!mexeuP73) { return; }
            var i, k;
            for (i = 0; i < guardaP73.length; i++) {
              var g = guardaP73[i];
              if (!g || !g.el || !g.cls) { continue; }
              for (k = 0; k < g.cls.length; k++) {
                try { g.el.classList.add(g.cls[k]); } catch (e) {}
              }
            }
            guardaP73 = [];
            mexeuP73 = false;
          }
        
          function ligarModoFolha() {
            estilo();
            tirarMarcasP73();
            document.body.classList.add(CLASSE_IMP);
            if (relogioLimpar) { window.clearTimeout(relogioLimpar); }
            relogioLimpar = window.setTimeout(desligarModoFolha, 60000);
          }
        
          function desligarModoFolha() {
            if (relogioLimpar) { window.clearTimeout(relogioLimpar); relogioLimpar = null; }
            document.body.classList.remove(CLASSE_IMP);
            devolverMarcasP73();
            marcadoFpdo = false;
          }
        
          /* clique no "Imprimir / PDF" da janela FPDO */
          document.addEventListener('click', function (ev) {
            var t = ev.target;
            if (!t || !t.closest) { return; }
            var b = t.closest('[data-a="imprimir"]');
            if (!b) { return; }
            if (!b.closest('#p92Fundo')) { return; }
            if (ev.isTrusted === false) { return; }   /* clique automatico do PDF */
            marcadoFpdo = true;
            ligarModoFolha();
            /* se outra parte da pagina tinha travado a impressao, destrava */
            try {
              if (printOriginal && window.print !== printOriginal &&
                  String(window.print).indexOf('[native code]') < 0) {
                window.print = printOriginal;
              }
            } catch (e) {}
          }, true);
        
          window.addEventListener('beforeprint', function () {
            if (!ehImpressaoFpdo()) { return; }
            ligarModoFolha();
          });
        
          window.addEventListener('afterprint', function () {
            desligarModoFolha();
          });
        
          /* alguns navegadores nao avisam quando a impressao termina */
          window.addEventListener('focus', function () {
            if (!document.body.classList.contains(CLASSE_IMP)) { return; }
            window.setTimeout(desligarModoFolha, 400);
          });
        
          /* ---------------------------------------------------------------- *
           * inicio
           * ---------------------------------------------------------------- */
          /* se a janela for aberta de novo, tira as marcas de "fechada" */
          function vigiar() {
            estilo();
            var f = janela();
            if (!f) { return; }
            var d = '';
            try { d = f.style ? (f.style.display || '') : ''; } catch (e) { d = ''; }
            if (d === 'flex' || d === 'block') {
              if (f.classList) { f.classList.remove(CLASSE_OCULTO); }
              f.removeAttribute('aria-hidden');
            }
          }
        
          function iniciar() {
            estilo();
            window.__varreduraUnica(vigiar);
          }
        
          window.p93FecharFpdo = function () { fecharJanela(); };
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        })();
    
