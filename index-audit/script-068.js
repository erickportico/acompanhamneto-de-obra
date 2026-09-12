
        /* ===================================================================
           PATCH 98 - duas correcoes de uso do painel
        
           1) A janelinha "Enquadrar foto" (PATCH 96) estava abrindo ATRAS da
              janela do Relatorio FPDO (PATCH 92), porque a camada dela era
              mais baixa. Aqui ela sobe para a frente de tudo.
        
           2) Ao fechar telas de cadastro/dados o painel ficava "travado":
              sobrava uma trava de rolagem no corpo da pagina e/ou uma camada
              invisivel na frente engolindo os cliques. Aqui existe uma faxina
              que solta a pagina de novo assim que nao ha mais janela aberta.
        
           Nada do que ja existe e apagado: so ajusta camada e destrava.
           =================================================================== */
        (function () {
          'use strict';
        
          if (window.__patch98) { return; }
          window.__patch98 = true;
        
          var P98 = {};
          window.P98 = P98;
        
          /* seletores das janelas conhecidas do painel */
          var SEL_JANELAS = [
            '.modal-bg',
            '#p96Fundo',
            '#p92Fundo',
            '#p84Fundo',
            '#p83Fundo',
            '#modalParcelasInstalacao',
            '#modalLancInstalacao',
            'dialog[open]'
          ].join(',');
        
          /* travas de rolagem que varias telas colocam no corpo da pagina */
          var TRAVAS = [
            'p52-travado', 'p53-travado', 'ag-modal-aberto', 'of-dep-aberto',
            'or-aberto', 'modal-open', 'modal-aberto', 'no-scroll', 'sem-scroll',
            'overflow-hidden', 'travado'
          ];
        
          /* ------------------------------------------------------------------
             1) camada da janelinha de enquadrar foto
             ------------------------------------------------------------------ */
          function estilo() {
            if (document.getElementById('p98Estilo')) { return; }
            var s = document.createElement('style');
            s.id = 'p98Estilo';
            s.textContent = [
              /* a janelinha de enquadrar sempre na frente do relatorio FPDO */
              'html body div#p96Fundo{position:fixed !important;inset:0 !important;',
              '  z-index:2147483600 !important;display:flex !important;',
              '  align-items:center !important;justify-content:center !important;',
              '  pointer-events:auto !important;visibility:visible !important;opacity:1 !important}',
              'html body div#p96Fundo>#p96Cx{pointer-events:auto !important;z-index:1 !important}',
              /* camadas escondidas nunca devem engolir clique */
              'html body .p98-solta{pointer-events:none !important}',
              '@media print{html body div#p96Fundo{display:none !important}}'
            ].join('');
            (document.head || document.documentElement).appendChild(s);
          }
        
          /* ------------------------------------------------------------------
             2) faxina anti-travamento
             ------------------------------------------------------------------ */
          function visivel(el) {
            if (!el || !el.getBoundingClientRect) { return false; }
            try {
              var cs = window.getComputedStyle(el);
              if (!cs) { return false; }
              if (cs.display === 'none') { return false; }
              if (cs.visibility === 'hidden' || cs.visibility === 'collapse') { return false; }
              var r = el.getBoundingClientRect();
              if (r.width < 4 || r.height < 4) { return false; }
              return true;
            } catch (e) { return false; }
          }
        
          function janelasAbertas() {
            var abertas = [];
            var lista;
            try { lista = document.querySelectorAll(SEL_JANELAS); } catch (e) { return abertas; }
            for (var i = 0; i < lista.length; i++) {
              if (visivel(lista[i])) { abertas.push(lista[i]); }
            }
            return abertas;
          }
        
          /* escondida de verdade: display:none (nao conta animacao de abertura) */
          function escondidaDeVerdade(el) {
            try {
              var cs = window.getComputedStyle(el);
              if (!cs) { return false; }
              if (cs.display === 'none') { return true; }
              if (cs.visibility === 'hidden' || cs.visibility === 'collapse') { return true; }
              return false;
            } catch (e) { return false; }
          }
        
          /* camada escondida (ou marcada como morta) nao pode barrar o clique */
          function neutralizarCamadas() {
            var lista;
            try {
              lista = document.querySelectorAll(SEL_JANELAS + ',.p65-morto,[id$="Fundo"]');
            } catch (e) { return; }
            for (var i = 0; i < lista.length; i++) {
              var el = lista[i];
              var morto = escondidaDeVerdade(el);
              if (morto) {
                if (!el.classList.contains('p98-solta')) { el.classList.add('p98-solta'); }
              } else if (el.classList.contains('p98-solta')) {
                el.classList.remove('p98-solta');
              }
            }
          }
        
          /* se o relatorio FPDO foi fechado, a janelinha de enquadrar nao pode ficar sozinha na tela */
          function limparEnquadrarOrfao() {
            var f = document.getElementById('p96Fundo');
            if (!f) { return; }
            var pai = document.getElementById('p92Fundo');
            if (pai && visivel(pai)) { return; }
            /* o dono da janelinha e o relatorio FPDO: sem ele, ela vira bloqueio */
            try {
              if (window.P96 && typeof window.P96.fechar === 'function') { window.P96.fechar(); }
            } catch (e) { /* ignora */ }
            f = document.getElementById('p96Fundo');
            if (f && f.parentNode) {
              try { f.parentNode.removeChild(f); } catch (e2) { /* ignora */ }
            }
          }
        
          function soltarPagina() {
            var alvos = [document.body, document.documentElement];
            for (var i = 0; i < alvos.length; i++) {
              var el = alvos[i];
              if (!el) { continue; }
              try {
                for (var t = 0; t < TRAVAS.length; t++) { el.classList.remove(TRAVAS[t]); }
                if (el.style) {
                  if (el.style.overflow) { el.style.overflow = ''; }
                  if (el.style.overflowY) { el.style.overflowY = ''; }
                  if (el.style.position === 'fixed') { el.style.position = ''; }
                  if (el.style.height) { el.style.height = ''; }
                  if (el.style.top) { el.style.top = ''; }
                  if (el.style.pointerEvents) { el.style.pointerEvents = ''; }
                }
                el.removeAttribute('inert');
                if (el.getAttribute('aria-hidden') === 'true') { el.removeAttribute('aria-hidden'); }
              } catch (e) { /* ignora */ }
            }
          }
        
          function precisaSoltar() {
            var b = document.body, h = document.documentElement;
            if (!b) { return false; }
            for (var i = 0; i < TRAVAS.length; i++) {
              if (b.classList.contains(TRAVAS[i])) { return true; }
              if (h && h.classList.contains(TRAVAS[i])) { return true; }
            }
            if (b.style && (b.style.overflow === 'hidden' || b.style.position === 'fixed')) { return true; }
            if (h && h.style && h.style.overflow === 'hidden') { return true; }
            if (b.hasAttribute('inert') || b.getAttribute('aria-hidden') === 'true') { return true; }
            return false;
          }
        
          function faxina() {
            try {
              limparEnquadrarOrfao();
              neutralizarCamadas();
              if (janelasAbertas().length === 0 && precisaSoltar()) { soltarPagina(); }
            } catch (e) { /* ignora */ }
          }
          P98.destravar = function () {
            limparEnquadrarOrfao();
            neutralizarCamadas();
            soltarPagina();
            return true;
          };
          P98.faxina = faxina;
        
          /* faxina agrupada: nunca corre mais de uma vez por vez */
          var pendente = null;
          function agendar(ms) {
            if (pendente) { return; }
            pendente = setTimeout(function () { pendente = null; faxina(); }, ms || 120);
          }
        
          /* ------------------------------------------------------------------
             gatilhos: depois de clicar/teclar e um vigia leve de segurança
             ------------------------------------------------------------------ */
          document.addEventListener('click', function () { agendar(140); }, true);
          document.addEventListener('keyup', function (ev) {
            if (ev && (ev.key === 'Escape' || ev.key === 'Enter')) { agendar(140); }
          }, true);
          window.addEventListener('pageshow', function () { agendar(200); });
        
          /* embrulha os fechadores conhecidos para a faxina rodar junto */
          function embrulhar(nome) {
            try {
              var f = window[nome];
              if (typeof f !== 'function' || f.__p98) { return; }
              var novo = function () {
                var r;
                try { r = f.apply(this, arguments); } finally { agendar(60); }
                return r;
              };
              novo.__p98 = true;
              window[nome] = novo;
            } catch (e) { /* ignora */ }
          }
          function embrulharTodos() {
            var nomes = ['fecharModais', 'fecharModal', 'fecharTodosModais', 'closeModal', 'fecharPopup'];
            for (var i = 0; i < nomes.length; i++) { embrulhar(nomes[i]); }
          }
        
          /* vigia: so age quando ha sinal de trava, entao pesa quase nada */
          var vigia = null;
          function ligarVigia() {
            if (vigia) { return; }
            vigia = setInterval(function () {
              try {
                if (document.getElementById('p96Fundo') || precisaSoltar()) { faxina(); }
              } catch (e) { /* ignora */ }
            }, 1200);
          }
        
          function iniciar() {
            estilo();
            embrulharTodos();
            ligarVigia();
            agendar(300);
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
          setTimeout(embrulharTodos, 2500);
        })();
    
