
        (function () {
          'use strict';
          if (window.__p116) { return; }
          window.__p116 = true;
        
          var ROTULO = 'Consideracoes desta Medicao:';
        
          function campo() { return document.getElementById('medConsideracoes'); }
        
          /* ---------------------------------------------------------------- *
           * monta, uma unica vez, o texto que vai para o papel
           * ---------------------------------------------------------------- */
          function montar() {
            var ta = campo();
            if (!ta || !ta.parentNode) { return null; }
        
            var bloco = ta.parentNode;
            if (bloco.id !== 'p116Bloco') { bloco.id = 'p116Bloco'; }
        
            var rot = document.getElementById('p116Rotulo');
            if (!rot) {
              rot = document.createElement('div');
              rot.id = 'p116Rotulo';
              var velho = bloco.querySelector('label');
              rot.textContent = velho ? (velho.textContent || ROTULO) : ROTULO;
              bloco.insertBefore(rot, ta);
            }
        
            var eco = document.getElementById('p116Papel');
            if (!eco) {
              eco = document.createElement('div');
              eco.id = 'p116Papel';
              bloco.appendChild(eco);
            }
            return eco;
          }
        
          /* ---------------------------------------------------------------- *
           * copia o que esta escrito para o texto de impressao
           * ---------------------------------------------------------------- */
          function sincronizar() {
            var ta = campo();
            var eco = montar();
            if (!ta || !eco) { return; }
        
            var txt = String(ta.value == null ? '' : ta.value);
            eco.textContent = txt;
        
            var bloco = document.getElementById('p116Bloco');
            if (bloco) {
              if (txt.replace(/\s+/g, '') === '') { bloco.classList.add('p116-vazio'); }
              else { bloco.classList.remove('p116-vazio'); }
            }
          }
        
          /* ---------------------------------------------------------------- *
           * a caixa cresce sozinha na tela, sem esconder linhas
           * ---------------------------------------------------------------- */
          function crescer() {
            var ta = campo();
            if (!ta) { return; }
            try {
              ta.style.height = 'auto';
              var h = ta.scrollHeight;
              if (h > 0) { ta.style.height = Math.max(60, Math.min(420, h + 2)) + 'px'; }
            } catch (e) {}
          }
        
          /* ---------------------------------------------------------------- *
           * guardar o texto tambem enquanto voce digita (nao perde nada)
           * ---------------------------------------------------------------- */
          var relogio = null;
        
          function guardar() {
            if (relogio) { clearTimeout(relogio); }
            relogio = setTimeout(function () {
              relogio = null;
              try {
                if (typeof window.salvarHeaderMedicao === 'function') { window.salvarHeaderMedicao(); }
              } catch (e) {}
            }, 700);
          }
        
          function ligar() {
            var ta = campo();
            if (!ta || ta.__p116) { return; }
            ta.__p116 = true;
            ta.addEventListener('input', function () { sincronizar(); crescer(); guardar(); });
            ta.addEventListener('change', function () { sincronizar(); crescer(); });
            ta.addEventListener('blur', function () { sincronizar(); });
            sincronizar();
            crescer();
          }
        
          function antesDeImprimir() {
            /* se o texto ainda nao foi gravado, grava agora e leva para o papel */
            try {
              if (relogio) { clearTimeout(relogio); relogio = null; }
              if (typeof window.salvarHeaderMedicao === 'function') { window.salvarHeaderMedicao(); }
            } catch (e) {}
            sincronizar();
          }
        
          function iniciar() {
            if (!document.body) { setTimeout(iniciar, 60); return; }
        
            ligar();
        
            /* o botao Imprimir / Ctrl+P levam o texto atualizado */
            window.addEventListener('beforeprint', antesDeImprimir);
            if (typeof window.print === 'function' && !window.__p116print) {
              window.__p116print = true;
              var real = window.print;
              window.print = function () {
                antesDeImprimir();
                return real.apply(window, arguments);
              };
            }
        
            /* a tela do boletim e remontada varias vezes: mantem tudo em ordem */
            try {
              var obs = new MutationObserver(function () { ligar(); sincronizar(); });
              obs.observe(document.body, { childList: true, subtree: true });
            } catch (e) {}
        
            setInterval(function () { ligar(); sincronizar(); }, 1200);
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        })();
    
