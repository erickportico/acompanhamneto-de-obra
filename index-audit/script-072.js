
        /* ====== PATCH102_LEVEZA_E_ALCAS ======
           1) Tira a lentidao ao mexer nos slides: as vigias que ficavam olhando a tela
              toda hora agora sao seguradas enquanto voce arrasta e trabalham em ritmo
              calmo quando a edicao esta ligada.
           2) Devolve as bolinhas verdes: elas voltam a ficar por cima da folha do slide
              e voltam a aceitar o dedo e o mouse (inclusive no celular).
           Este bloco so acrescenta: nada do que ja existe e apagado.
           ====== */
        (function () {
          'use strict';
          if (window.__PS102) { return; }
          window.__PS102 = true;
        
          var est = { editando: false, arrastando: false, ate: 0 };
          try { window.__PS102EST = est; } catch (e) {}
        
          function agora() { return (new Date()).getTime(); }
        
          function arrastando() {
            if (!est.arrastando) { return false; }
            if (est.ate && agora() > est.ate) { est.arrastando = false; est.ate = 0; return false; }
            return true;
          }
        
          /* ---------------- 1) as bolinhas verdes na frente e no dedo ---------------- */
          var CSS = [
            /* a folha do slide nao cria mais uma caixa que enterra as alcas */
            'html body #p94Fundo .p94-lupa .p94-folha{z-index:auto !important}',
            'html body #p94Lupa .p94-folha{z-index:auto !important}',
        
            /* a moldura verde da selecao fica por cima de tudo que esta na folha */
            'html body #p94Fundo .p94-folha .p99-mk,html body #p94Lupa .p94-folha .p99-mk{',
            '  z-index:2147482000 !important;pointer-events:none !important;',
            '  border:1.5px solid #22c55e !important}',
        
            /* as bolinhas de esticar: maiores, por cima e aceitando toque */
            'html body #p94Fundo .p94-folha .p99-mk .p99-h,html body #p94Lupa .p94-folha .p99-mk .p99-h{',
            '  z-index:2147482001 !important;pointer-events:auto !important;',
            '  width:17px !important;height:17px !important;',
            '  background:#22c55e !important;border:2px solid #ffffff !important;',
            '  border-radius:4px !important;touch-action:none !important;',
            '  box-shadow:0 1px 5px rgba(0,0,0,.55) !important}',
            'html body .p99-mk .p99-h[data-p99h="nw"]{left:-9px !important;top:-9px !important;right:auto !important;bottom:auto !important}',
            'html body .p99-mk .p99-h[data-p99h="ne"]{right:-9px !important;top:-9px !important;left:auto !important;bottom:auto !important}',
            'html body .p99-mk .p99-h[data-p99h="sw"]{left:-9px !important;bottom:-9px !important;right:auto !important;top:auto !important}',
            'html body .p99-mk .p99-h[data-p99h="se"]{right:-9px !important;bottom:-9px !important;left:auto !important;top:auto !important}',
        
            /* com a edicao ligada o dedo arrasta o item em vez de rolar a pagina */
            'html body #p94Lupa.p99-edit .p94-folha,html body #p94Lupa.p99-edit .p94-folha *{',
            '  touch-action:none !important}',
        
            /* na impressao nada disso aparece */
            '@media print{html body .p99-mk{display:none !important}}'
          ].join('\n');
        
          function estilo() {
            var s = document.getElementById('p102Estilo');
            if (!s) {
              s = document.createElement('style');
              s.id = 'p102Estilo';
              s.type = 'text/css';
              s.appendChild(document.createTextNode(CSS));
              (document.head || document.documentElement).appendChild(s);
            }
          }
        
          /* ---------------- 2) saber quando a edicao dos slides esta ligada ---------------- */
          function verEdicao() {
            var b = null;
            try { b = document.querySelector('#p94Fundo [data-p99="editar"]'); } catch (e) { b = null; }
            var lig = !!(b && String(b.className || '').indexOf('p99-on') >= 0);
            if (lig !== est.editando) { est.editando = lig; }
            return lig;
          }
        
          /* ---------------- 3) saber quando o dedo esta arrastando no slide ---------------- */
          function dentroDoSlide(t) {
            if (!t || !t.closest) { return false; }
            try {
              if (t.closest('[data-p99]') || t.closest('[data-p100]') || t.closest('[data-p94]')) { return false; }
              return !!t.closest('.p94-folha');
            } catch (e) { return false; }
          }
        
          document.addEventListener('pointerdown', function (ev) {
            if (!dentroDoSlide(ev.target)) { return; }
            est.arrastando = true;
            est.ate = agora() + 12000;   /* rede de seguranca: nunca segura para sempre */
          }, true);
        
          function soltou() {
            if (!est.arrastando) { return; }
            est.arrastando = false;
            est.ate = 0;
          }
          document.addEventListener('pointerup', soltou, true);
          document.addEventListener('pointercancel', soltou, true);
          document.addEventListener('mouseup', soltou, true);
          document.addEventListener('touchend', soltou, true);
          window.addEventListener('blur', soltou);
        
          /* ---------------- 4) segurar as vigias da tela ---------------- */
          var MO = window.MutationObserver || window.WebKitMutationObserver;
        
          function envolver(cb) {
            var ult = 0;
            var agendado = false;
            var fila = [];
        
            function rodar(obs) {
              agendado = false;
              ult = agora();
              var lote = fila;
              fila = [];
              try { cb(lote, obs); } catch (e) {}
            }
        
            return function (regs, obs) {
              var i;
              if (regs && regs.length) {
                for (i = 0; i < regs.length; i++) {
                  if (fila.length > 400) { break; }
                  fila.push(regs[i]);
                }
              }
              if (agendado) { return; }
              agendado = true;
              var espera = est.editando ? 320 : 90;
              var falta = espera - (agora() - ult);
              if (falta < 0) { falta = 0; }
              var tenta = function () {
                if (arrastando()) { setTimeout(tenta, 220); return; }
                rodar(obs);
              };
              setTimeout(tenta, falta);
            };
          }
        
          if (typeof MO === 'function') {
            var Vigia = function (cb) {
              if (typeof cb !== 'function') { return new MO(cb); }
              var alvo = null;
              var envolvido = envolver(cb);
              alvo = new MO(function (regs) { envolvido(regs, alvo); });
              return alvo;
            };
            try { Vigia.prototype = MO.prototype; } catch (e) {}
            try {
              window.MutationObserver = Vigia;
              window.WebKitMutationObserver = Vigia;
            } catch (e2) {}
          }
        
          /* ---------------- 5) segurar os relogios rapidos durante o arraste ---------------- */
          var intervaloOrig = window.setInterval;
          if (typeof intervaloOrig === 'function') {
            window.setInterval = function (fn, ms) {
              var tempo = parseFloat(ms);
              if (typeof fn !== 'function' || isNaN(tempo) || tempo > 3000) {
                return intervaloOrig.apply(window, arguments);
              }
              var extras = Array.prototype.slice.call(arguments, 2);
              var ult = 0;
              var bater = function () {
                if (arrastando()) { return; }
                if (est.editando && (agora() - ult) < 1000) { return; }
                ult = agora();
                try { fn.apply(window, extras); } catch (e) {}
              };
              return intervaloOrig(bater, tempo);
            };
          }
        
          /* ---------------- comecar ---------------- */
          function iniciar() {
            if (!document.head && !document.documentElement) { setTimeout(iniciar, 40); return; }
            estilo();
            verEdicao();
            intervaloOrig(function () { estilo(); verEdicao(); }, 700);
          }
        
          iniciar();
        })();
    
