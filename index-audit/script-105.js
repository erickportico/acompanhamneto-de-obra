
        /* =====================================================================
         * PATCH 141 - gerente das caixas de dialogo
         * ===================================================================== */
        (function () {
          'use strict';
          if (window.__p141) { return; }
          window.__p141 = true;
        
          /* alturas reservadas: nada da fila passa daqui */
          var BASE = 2147483100;    /* primeira caixa da fila */
          var PASSO = 2;
          var TETO = 2147483380;    /* abaixo da faixa de aviso e da tela de bloqueio */
        
          /* quem nunca entra na fila: avisos, barras, tela de bloqueio, dicas */
          var FORA = /aviso|toast|barra|status|dica|faixa|p139trava|p131trava|p138faixa|p141saida|tooltip|snack/i;
          var CARA_DE_CAIXA = /modal|overlay|popup|janela|caixa|dialog|drawer|menu|fundo|backdrop/i;
        
          var ordem = [];           /* ids/elementos na ordem de abertura */
          var conhecidas = [];      /* tudo que ja identifiquei como caixa */
          var original = {};        /* altura original, para devolver depois */
          var contaFechamentos = 0;
        
          function pos(el) {
            try { return window.getComputedStyle(el); } catch (e) { return null; }
          }
        
          function visivel(el) {
            if (!el || !el.getBoundingClientRect) { return false; }
            var s = pos(el);
            if (!s) { return false; }
            if (s.display === 'none' || s.visibility === 'hidden') { return false; }
            if (Number(s.opacity || 1) < 0.05) { return false; }
            var r = el.getBoundingClientRect();
            return r.width > 30 && r.height > 20;
          }
        
          function marca(el) {
            return (el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '');
          }
        
          function ehCaixa(el) {
            if (!el || el.nodeType !== 1) { return false; }
            if (el === document.body || el === document.documentElement) { return false; }
            var m = marca(el);
            if (FORA.test(m)) { return false; }
            var s = pos(el);
            if (!s) { return false; }
            if (s.position !== 'fixed' && s.position !== 'absolute') { return false; }
            var z = parseInt(s.zIndex, 10);
            if (isNaN(z) || z < 50) { return false; }
            if (el.getAttribute && el.getAttribute('role') === 'dialog') { return true; }
            if (CARA_DE_CAIXA.test(m)) { return true; }
            /* fundo escuro que cobre a tela tambem conta */
            var r = el.getBoundingClientRect();
            var area = (r.width * r.height) / (window.innerWidth * window.innerHeight || 1);
            return area > 0.5;
          }
        
          function todasAsCaixas() {
            var achadas = [];
            var todos = document.querySelectorAll('div,section,aside,nav,form,dialog');
            var i;
            for (i = 0; i < todos.length; i++) {
              if (ehCaixa(todos[i])) { achadas.push(todos[i]); }
            }
            /* guarda a lista geral para a varredura */
            achadas.forEach(function (el) {
              if (conhecidas.indexOf(el) < 0) { conhecidas.push(el); }
            });
            return achadas;
          }
        
          function abertas() {
            return todasAsCaixas().filter(visivel);
          }
        
          function botaoDeFechar(el) {
            var b = el.querySelectorAll('button,a,[role="button"],span.fechar,.close,.fechar');
            var i, t, achou = null;
            for (i = 0; i < b.length; i++) {
              t = (b[i].textContent || '').trim().toLowerCase();
              if (t === '\u00d7' || t === 'x' || t === 'fechar' || t === 'cancelar' ||
                  t === 'voltar' || t === 'sair' || /^fechar\b/.test(t) || /^cancelar\b/.test(t) ||
                  (b[i].className && /close|fechar/i.test(String(b[i].className)))) {
                if (visivel(b[i]) && !b[i].disabled) { achou = achou || b[i]; }
              }
            }
            return achou;
          }
        
          /* ================================================================ *
           * 1) por em fila: a ultima aberta fica por cima
           * ================================================================ */
          function guardarAltura(el) {
            var id = el.id || '';
            if (!id) {
              id = 'p141_' + Math.random().toString(36).slice(2, 8);
              el.id = id;
            }
            if (!(id in original)) {
              original[id] = (el.style.zIndex || '') + '';
            }
            return id;
          }
        
          function organizar() {
            var lista = abertas();
            /* quem abriu antes continua antes; quem e novo vai para o fim */
            lista.forEach(function (el) {
              if (ordem.indexOf(el) < 0) { ordem.push(el); }
            });
            ordem = ordem.filter(function (el) {
              return el && el.parentNode && lista.indexOf(el) >= 0;
            });
            var i, z;
            for (i = 0; i < ordem.length; i++) {
              guardarAltura(ordem[i]);
              z = BASE + i * PASSO;
              if (z > TETO) { z = TETO; }
              try { ordem[i].style.setProperty('z-index', String(z), 'important'); } catch (e) { }
            }
            botaoSaida(ordem.length > 0);
            return ordem.length;
          }
        
          function topo() {
            organizar();
            return ordem.length ? ordem[ordem.length - 1] : null;
          }
        
          /* ================================================================ *
           * 2) fechar de verdade
           * ================================================================ */
          function esconder(el) {
            var id = el.id || '';
            ['on', 'ativo', 'aberto', 'show', 'shown', 'visible', 'visivel', 'open']
              .forEach(function (c) {
                try { el.classList.remove(c); } catch (e) { }
              });
            try { el.style.setProperty('display', 'none', 'important'); } catch (e2) { }
            try { el.setAttribute('aria-hidden', 'true'); } catch (e3) { }
            if (id in original) {
              try {
                if (original[id]) { el.style.zIndex = original[id]; } else { el.style.zIndex = ''; }
              } catch (e4) { }
            }
          }
        
          function soltarRolagem() {
            try {
              if (!abertas().length) {
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
                document.body.style.paddingRight = document.body.style.paddingRight || '';
              }
            } catch (e) { }
          }
        
          function fechar(el) {
            if (!el) { return false; }
            contaFechamentos = contaFechamentos + 1;
            var b = botaoDeFechar(el);
            if (b) {
              try { b.click(); } catch (e) { }
              /* se a caixa insistir em ficar, esconde na forca */
              setTimeout(function () {
                if (visivel(el)) { esconder(el); }
                var i = ordem.indexOf(el);
                if (i >= 0 && !visivel(el)) { ordem.splice(i, 1); }
                organizar();
                soltarRolagem();
              }, 260);
            } else {
              esconder(el);
              var j = ordem.indexOf(el);
              if (j >= 0) { ordem.splice(j, 1); }
              organizar();
              soltarRolagem();
            }
            return true;
          }
        
          function fecharTopo() {
            var el = topo();
            if (!el) { return false; }
            return fechar(el);
          }
        
          function fecharTudo() {
            var lista = abertas().slice().reverse();
            lista.forEach(function (el) { esconder(el); });
            ordem = [];
            organizar();
            soltarRolagem();
            return lista.length;
          }
        
          /* ================================================================ *
           * 3) fundos abandonados (os que travam o clique)
           * ================================================================ */
          function zumbis(remover) {
            var suspeitos = [];
            abertas().forEach(function (el) {
              var r = el.getBoundingClientRect();
              var area = (r.width * r.height) / (window.innerWidth * window.innerHeight || 1);
              if (area < 0.55) { return; }
              /* tem algum conteudo visivel dentro? */
              var filhos = el.children || [];
              var i, temConteudo = false;
              for (i = 0; i < filhos.length; i++) {
                if (visivel(filhos[i])) { temConteudo = true; break; }
              }
              var texto = (el.textContent || '').trim();
              if (!temConteudo && texto.length < 3) {
                suspeitos.push(el.id || '(sem nome)');
                if (remover) {
                  esconder(el);
                  var j = ordem.indexOf(el);
                  if (j >= 0) { ordem.splice(j, 1); }
                }
              }
            });
            if (remover) {
              organizar();
              soltarRolagem();
            }
            return suspeitos;
          }
        
          /* ================================================================ *
           * 4) botao de emergencia + Esc + clique no fundo
           * ================================================================ */
          function botaoSaida(mostrar) {
            var b = document.getElementById('p141Saida');
            if (!b) {
              b = document.createElement('button');
              b.id = 'p141Saida';
              b.type = 'button';
              b.textContent = 'Fechar caixa (Esc)';
              b.title = 'Fecha a caixa que esta por cima';
              document.body.appendChild(b);
              b.addEventListener('click', function (ev) {
                ev.stopPropagation();
                fecharTopo();
              });
            }
            if (mostrar) { b.classList.add('on'); } else { b.classList.remove('on'); }
          }
        
          function digitando(alvo) {
            if (!alvo) { return false; }
            var t = (alvo.tagName || '').toLowerCase();
            if (t === 'input' || t === 'textarea' || t === 'select') { return true; }
            return !!(alvo.isContentEditable);
          }
        
          function ligarTeclado() {
            document.addEventListener('keydown', function (ev) {
              if (ev.key !== 'Escape' && ev.keyCode !== 27) { return; }
              /* a tela de bloqueio manda: Esc nao mexe com ela */
              var trava = document.getElementById('p139Trava');
              if (trava && trava.className.indexOf('on') >= 0) { return; }
              if (!ordem.length && !abertas().length) { return; }
              if (digitando(ev.target)) {
                /* deixa o campo em paz, mas Esc no campo tambem fecha a caixa:
                   primeiro tira o foco, depois fecha */
                try { ev.target.blur(); } catch (e) { }
              }
              ev.preventDefault();
              ev.stopPropagation();
              fecharTopo();
            }, true);
          }
        
          function ligarCliqueNoFundo() {
            document.addEventListener('mousedown', function (ev) {
              var el = topo();
              if (!el) { return; }
              if (ev.target !== el) { return; }        /* clicou dentro da caixa: nao mexe */
              var r = el.getBoundingClientRect();
              var area = (r.width * r.height) / (window.innerWidth * window.innerHeight || 1);
              if (area < 0.5) { return; }              /* menus pequenos: nao contam como fundo */
              fechar(el);
            }, true);
          }
        
          /* ================================================================ *
           * 5) varredura e ferramentas do console
           * ================================================================ */
          function varredura() {
            var lista = todasAsCaixas();
            var linhas = lista.map(function (el) {
              var s = pos(el) || {};
              var r = el.getBoundingClientRect();
              return {
                caixa: el.id || ('(sem nome) ' + (el.className || '').toString().slice(0, 22)),
                abertaAgora: visivel(el),
                alturaOriginal: (el.id in original) ? (original[el.id] || '(do estilo)') : s.zIndex,
                alturaAgora: s.zIndex,
                temBotaoFechar: !!botaoDeFechar(el),
                cobreATela: Math.round(100 * (r.width * r.height) /
                            (window.innerWidth * window.innerHeight || 1)) + '%',
                fechaComEsc: true
              };
            });
            var zs = {};
            linhas.forEach(function (l) { zs[l.alturaAgora] = true; });
            try {
              console.log('%c[P141] varredura das caixas do painel', 'color:#0f172a;font-weight:700');
              if (console.table) { console.table(linhas); }
              console.log('  caixas encontradas: ' + linhas.length +
                          ' | abertas agora: ' + linhas.filter(function (l) { return l.abertaAgora; }).length +
                          ' | sem botao de fechar proprio: ' +
                          linhas.filter(function (l) { return !l.temBotaoFechar; }).length);
              console.log('  todas fecham com Esc, com clique no fundo e com o botao ' +
                          '"Fechar caixa (Esc)" no alto da tela.');
              var z = zumbis(false);
              console.log('  fundos abandonados agora: ' + (z.length ? z.join(', ') : 'nenhum'));
            } catch (e) { }
            return linhas;
          }
        
          window.P141 = {
            varredura: varredura,
            listar: function () {
              organizar();
              var linhas = ordem.slice().reverse().map(function (el, i) {
                return {
                  posicao: (i === 0 ? 'em cima' : 'abaixo ' + i),
                  caixa: el.id || '(sem nome)',
                  altura: (pos(el) || {}).zIndex,
                  temBotaoFechar: !!botaoDeFechar(el)
                };
              });
              try {
                if (console.table) { console.table(linhas); }
                console.log('[P141] caixas abertas: ' + linhas.length);
              } catch (e) { }
              return linhas;
            },
            fecharTopo: fecharTopo,
            fecharTudo: fecharTudo,
            zumbis: function () {
              var z = zumbis(true);
              try {
                console.log('[P141] fundos abandonados retirados: ' + (z.length ? z.join(', ') : 'nenhum'));
              } catch (e) { }
              return z;
            },
            organizar: organizar,
            quantasFechei: function () { return contaFechamentos; }
          };
        
          function ligar() {
            ligarTeclado();
            ligarCliqueNoFundo();
            organizar();
            try {
              var observador = new MutationObserver(function () {
                clearTimeout(window.__p141t);
                window.__p141t = setTimeout(function () {
                  organizar();
                  zumbis(true);
                }, 120);
              });
              observador.observe(document.body, {
                attributes: true, attributeFilter: ['style', 'class', 'hidden'],
                childList: true, subtree: true
              });
            } catch (e) { }
            try { setInterval(function () { organizar(); }, 3000); } catch (e2) { }
            try {
              console.log('[PATCH141] caixas em ordem. Use P141.varredura() para ver o mapa.');
            } catch (e3) { }
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { setTimeout(ligar, 400); });
          } else {
            setTimeout(ligar, 400);
          }
        }());
    
