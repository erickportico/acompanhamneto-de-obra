
        /* ===== PATCH129 - a tela nao atualiza no meio do cadastro ===== */
        (function () {
          'use strict';
          if (window.__P129) { return; }
          window.__P129 = true;
        
          var ESPERA_DIGITANDO = 8000;    /* considera que voce esta no cadastro por 8s depois da ultima tecla */
          var FOLGA_DEPOIS     = 2500;    /* espera 2,5s de silencio antes de atualizar */
          var emEvento = 0;
          var ultimaTecla = 0;
          var pendentes = {};
          var timerPend = null;
          var estado = { servidorRespondeu: null, testadoEm: 0 };
        
          function agora() { return Date.now(); }
        
          /* ---------------- estou no meio de um cadastro? ---------------- */
          function digitando() {
            var el = document.activeElement;
            if (el) {
              var tag = String(el.tagName || '').toLowerCase();
              if (tag === 'input' || tag === 'textarea' || tag === 'select') {
                var tipo = String(el.type || '').toLowerCase();
                if (tipo !== 'button' && tipo !== 'submit' && tipo !== 'reset') { return true; }
              }
              if (el.isContentEditable) { return true; }
            }
            if (ultimaTecla && (agora() - ultimaTecla) < ESPERA_DIGITANDO) { return true; }
            return false;
          }
        
          function medida(valor) {
            var n = parseFloat(String(valor || '0'));
            return isNaN(n) ? 0 : n;
          }
        
          function largura(el, est) {
            var r = 0;
            try { r = el.getBoundingClientRect().width; } catch (e) { r = 0; }
            return Math.max(el.offsetWidth || 0, r || 0, medida(est ? est.width : 0));
          }
        
          function altura(el, est) {
            var r = 0;
            try { r = el.getBoundingClientRect().height; } catch (e) { r = 0; }
            return Math.max(el.offsetHeight || 0, r || 0, medida(est ? est.height : 0));
          }
        
          function janelaAberta() {
            var lista = document.querySelectorAll('[id]');
            var i, el, est;
            for (i = 0; i < lista.length; i++) {
              el = lista[i];
              var id = String(el.id || '');
              if (!/(modal|janela|overlay|fundo|popup|dialog)/i.test(id)) { continue; }
              try { est = window.getComputedStyle(el); } catch (e) { est = null; }
              if (!est) { continue; }
              if (est.display === 'none' || est.visibility === 'hidden' || est.opacity === '0') { continue; }
              if (largura(el, est) < 80 || altura(el, est) < 60) { continue; }
              if (el.querySelector('input, textarea, select, button')) { return true; }
            }
            return false;
          }
        
          function ocupado() { return digitando() || janelaAberta(); }
        
          /* ---------------- selo discreto de espera ---------------- */
          function estilo() {
            if (document.getElementById('p129Estilo')) { return; }
            var st = document.createElement('style');
            st.id = 'p129Estilo';
            st.textContent = [
              '#p129Selo{position:fixed;left:14px;bottom:14px;z-index:2147481000;display:none;background:#1e293b;color:#fff;border-radius:999px;padding:6px 12px;font:12px Segoe UI,Arial,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.25)}',
              '#p129Selo.on{display:block}',
              '#p129Solta{position:fixed;right:14px;top:14px;z-index:2147483400;display:none;background:#b91c1c;color:#fff;border:0;border-radius:999px;padding:8px 14px;font:600 12px Segoe UI,Arial,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.3)}',
              '#p129Solta.on{display:block}',
              '#p129Mes{display:inline-flex;align-items:center;gap:6px;margin:6px 0 0;font:12px Segoe UI,Arial,sans-serif;color:#475569}',
              '#p129Mes button{border:0;border-radius:999px;padding:4px 10px;font:600 11px Segoe UI,Arial,sans-serif;background:#e2e8f0;color:#16304f;cursor:pointer}',
              '@media print{#p129Selo,#p129Solta{display:none!important}}'
            ].join(' ');
            (document.head || document.documentElement).appendChild(st);
          }
        
          function selo(ligado, texto) {
            estilo();
            var d = document.getElementById('p129Selo');
            if (!d) {
              if (!document.body) { return; }
              d = document.createElement('div');
              d.id = 'p129Selo';
              d.setAttribute('data-html2canvas-ignore', 'true');
              document.body.appendChild(d);
            }
            if (ligado) { d.textContent = texto || 'Atualizacao em espera - voce esta preenchendo'; d.classList.add('on'); }
            else { d.classList.remove('on'); }
          }
        
          /* ---------------- marca quando a acao veio de voce ----------------
             se VOCE clicou ou trocou um filtro, a tela atualiza na hora.
             so a atualizacao automatica (relogio, nuvem) e que espera. */
          function marcarEvento() {
            emEvento++;
            setTimeout(function () { if (emEvento > 0) { emEvento--; } }, 0);
          }
          ['click', 'change', 'submit', 'keydown', 'input', 'touchend'].forEach(function (nome) {
            document.addEventListener(nome, marcarEvento, true);
          });
          document.addEventListener('keydown', function () { ultimaTecla = agora(); }, true);
          document.addEventListener('input', function () { ultimaTecla = agora(); }, true);
        
          /* ---------------- fila de atualizacoes em espera ---------------- */
          function correrFila() {
            var nomes = Object.keys(pendentes);
            if (!nomes.length) { selo(false); return; }
            if (ocupado()) { agendar(); return; }
            var i;
            for (i = 0; i < nomes.length; i++) {
              var f = pendentes[nomes[i]];
              delete pendentes[nomes[i]];
              try { f(); } catch (e) { try { console.warn('[129] ' + nomes[i], e); } catch (e2) {} }
            }
            selo(false);
          }
        
          function agendar() {
            if (timerPend) { clearTimeout(timerPend); }
            timerPend = setTimeout(function () { timerPend = null; correrFila(); }, FOLGA_DEPOIS);
          }
        
          function guardarParaDepois(nome, fn) {
            pendentes[nome] = fn;
            selo(true);
            agendar();
          }
        
          /* ---------------- coloca a trava nas funcoes que redesenham ---------------- */
          var REDESENHAM = ['render', 'renderTudo', 'atualizarTudo', 'atualizarTela',
                            'renderPagamento', 'renderCustoDashboard', 'renderCronoReport',
                            'renderCrono', 'renderObras', 'renderItens', 'renderTabela',
                            'p125Vigiar', 'p125Redesenhar'];
        
          function proteger(nome) {
            var original = window[nome];
            if (typeof original !== 'function' || original.__p129) { return false; }
            var novo = function () {
              var args = arguments;
              var eu = this;
              if (emEvento > 0 || !ocupado()) {
                return original.apply(eu, args);
              }
              guardarParaDepois(nome, function () { original.apply(eu, args); });
              return undefined;
            };
            novo.__p129 = true;
            novo.__original = original;
            try { window[nome] = novo; } catch (e) { return false; }
            return true;
          }
        
          function protegerTudo() {
            var n = 0, i;
            for (i = 0; i < REDESENHAM.length; i++) { if (proteger(REDESENHAM[i])) { n++; } }
            return n;
          }
        
          /* alguns blocos do painel sao criados depois; tentamos algumas vezes */
          protegerTudo();
          var tentativas = 0;
          var relogioProteger = setInterval(function () {
            protegerTudo();
            tentativas++;
            if (tentativas > 20) { clearInterval(relogioProteger); }
          }, 1500);
        
          /* se algo pedir para recarregar a pagina no meio do cadastro, o
             navegador pergunta antes de jogar o texto fora */
          window.addEventListener('beforeunload', function (ev) {
            if (!digitando()) { return; }
            ev.preventDefault();
            ev.returnValue = 'Voce esta preenchendo um cadastro. Sair agora perde o que nao foi salvo.';
            return ev.returnValue;
          });
        
          /* ================================================================ *
           * aviso de internet testado de verdade contra o servidor
           * ================================================================ */
          function cliente() {
            try { if (typeof _supabase !== 'undefined' && _supabase) { return _supabase; } } catch (e) {}
            if (window._supabase) { return window._supabase; }
            if (window.supabaseClient) { return window.supabaseClient; }
            return null;
          }
        
          function mostrarAvisoNet(fora) {
            var ids = ['p117Net', 'p114Net', 'p111Net'];
            var classes = ['p117-on', 'p114-on', 'p111-on'];
            var i;
            for (i = 0; i < ids.length; i++) {
              var d = document.getElementById(ids[i]);
              if (!d) { continue; }
              if (fora) { d.classList.add(classes[i]); }
              else { d.classList.remove(classes[i]); }
            }
            if (document.body) {
              if (fora) { document.body.classList.add('p129-sem-net'); }
              else {
                document.body.classList.remove('p129-sem-net');
                document.body.classList.remove('p114-sem-net');
                document.body.classList.remove('p111-com-faixa');
              }
            }
          }
        
          function testarServidor() {
            var sb = cliente();
            estado.testadoEm = agora();
            if (!sb || !sb.from) {
              var fora = false;
              try { fora = (navigator && navigator.onLine === false); } catch (e) { fora = false; }
              estado.servidorRespondeu = !fora;
              mostrarAvisoNet(fora);
              return Promise.resolve(!fora);
            }
            return Promise.resolve(sb.from('painel_nuvem').select('chave').limit(1)).then(function (r) {
              /* o servidor pode responder recusando o acesso - isso tambem prova
                 que a internet esta funcionando */
              var msg = (r && r.error && r.error.message) ? String(r.error.message) : '';
              var semRede = /fetch|network|networkerror|offline|conex/i.test(msg);
              estado.servidorRespondeu = !semRede;
              mostrarAvisoNet(semRede);
              return !semRede;
            }).catch(function () {
              estado.servidorRespondeu = false;
              mostrarAvisoNet(true);
              return false;
            });
          }
        
          window.addEventListener('online', function () { testarServidor(); });
          window.addEventListener('offline', function () { mostrarAvisoNet(true); estado.servidorRespondeu = false; });
        
          /* ================================================================ *
           * destravar a tela ao trocar de menu
           * ================================================================ */
          function overlayPreso() {
            var lista = document.querySelectorAll('div, section');
            var i, el, est;
            var telaL = window.innerWidth || 1024;
            var telaA = window.innerHeight || 768;
            for (i = 0; i < lista.length; i++) {
              el = lista[i];
              try { est = window.getComputedStyle(el); } catch (e) { continue; }
              if (est.position !== 'fixed' || est.display === 'none' || est.visibility === 'hidden') { continue; }
              if (est.pointerEvents === 'none' || est.opacity === '0') { continue; }
              if (largura(el, est) < telaL * 0.8 || altura(el, est) < telaA * 0.8) { continue; }
              if (el.querySelector('input, textarea, select, button, a')) { continue; }
              if (String(el.textContent || '').trim().length > 3) { continue; }
              return el;
            }
            return null;
          }
        
          function soltar() {
            if (!document.body) { return false; }
            var mexeu = false;
            var sobra = overlayPreso();
            while (sobra) {
              sobra.style.display = 'none';
              mexeu = true;
              sobra = overlayPreso();
            }
            var classes = ['modal-open', 'no-scroll', 'sem-rolagem', 'travado', 'p114-sem-net', 'p111-com-faixa'];
            classes.forEach(function (c) {
              if (document.body.classList.contains(c)) { document.body.classList.remove(c); mexeu = true; }
            });
            if (!janelaAberta()) {
              try {
                var est = window.getComputedStyle(document.body);
                if (est.overflow === 'hidden') { document.body.style.overflow = ''; mexeu = true; }
                if (est.pointerEvents === 'none') { document.body.style.pointerEvents = ''; mexeu = true; }
              } catch (e) {}
              if (document.documentElement && document.documentElement.style.overflow === 'hidden') {
                document.documentElement.style.overflow = '';
                mexeu = true;
              }
            }
            botaoSoltar(false);
            return mexeu;
          }
        
          function botaoSoltar(ligado) {
            estilo();
            var b = document.getElementById('p129Solta');
            if (!b) {
              if (!document.body) { return; }
              b = document.createElement('button');
              b.id = 'p129Solta';
              b.type = 'button';
              b.textContent = 'Destravar tela';
              b.setAttribute('data-html2canvas-ignore', 'true');
              b.addEventListener('click', function () { soltar(); });
              document.body.appendChild(b);
            }
            if (ligado) { b.classList.add('on'); } else { b.classList.remove('on'); }
          }
        
          document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') { setTimeout(soltar, 30); }
          }, true);
        
          /* ================================================================ *
           * Centro de Custos sempre no mes vigente
           * ================================================================ */
          function mesVigente() {
            var d = new Date();
            var m = d.getMonth() + 1;
            return d.getFullYear() + '-' + (m < 10 ? '0' + m : String(m));
          }
        
          function chamarDireto(nome) {
            var f = window[nome];
            if (typeof f !== 'function') { return false; }
            var real = f.__original || f;
            try { real(); return true; } catch (e) { try { console.warn('[129] ' + nome, e); } catch (e2) {} }
            return false;
          }
        
          function botaoTodosOsMeses(campo) {
            if (document.getElementById('p129Mes')) { return; }
            estilo();
            var cx = document.createElement('div');
            cx.id = 'p129Mes';
            var txt = document.createElement('span');
            txt.textContent = 'Mostrando o mes atual.';
            var bt = document.createElement('button');
            bt.type = 'button';
            bt.textContent = 'Ver todos os meses';
            var soMesAtual = true;
            bt.addEventListener('click', function () {
              if (soMesAtual) {
                campo.value = '';
                txt.textContent = 'Mostrando todos os meses.';
                bt.textContent = 'Voltar ao mes atual';
              } else {
                campo.value = mesVigente();
                txt.textContent = 'Mostrando o mes atual.';
                bt.textContent = 'Ver todos os meses';
              }
              soMesAtual = !soMesAtual;
              chamarDireto('renderCustoDashboard');
            });
            cx.appendChild(txt);
            cx.appendChild(bt);
            if (campo.parentNode) { campo.parentNode.appendChild(cx); }
          }
        
          function ajustarMesCusto(forcar) {
            var campo = document.getElementById('custoFilterMes');
            if (!campo) { return false; }
            botaoTodosOsMeses(campo);
            if (!forcar && campo.value) { return false; }
            if (campo.getAttribute('data-p129') === '1' && !forcar) { return false; }
            campo.value = "";
            campo.setAttribute('data-p129', '1');
            chamarDireto('renderCustoDashboard');
            return true;
          }
        
          function abaCustoAberta() {
            var el = document.getElementById('tab-custo');
            if (!el) { return false; }
            try { return window.getComputedStyle(el).display !== 'none'; } catch (e) { return false; }
          }
        
          /* ================================================================ *
           * trocar de menu: destrava e cuida do Centro de Custos
           * ================================================================ */
          function protegerTrocaAba() {
            var original = window.trocarAba;
            if (typeof original !== 'function' || original.__p129) { return; }
            var novo = function (aba) {
              var r;
              try { r = original.apply(this, arguments); }
              catch (e) { try { console.warn('[129] trocarAba', e); } catch (e2) {} }
              setTimeout(function () {
                soltar();
                if (String(aba) === 'custo' || abaCustoAberta()) { ajustarMesCusto(false); }
              }, 60);
              return r;
            };
            novo.__p129 = true;
            novo.__original = original;
            try { window.trocarAba = novo; } catch (e) {}
          }
        
          protegerTrocaAba();
          setTimeout(protegerTrocaAba, 1200);
          setTimeout(protegerTrocaAba, 4000);
        
          /* ================================================================ *
           * relogios de vigilancia (leves)
           * ================================================================ */
          setInterval(function () {
            if (!document.body) { return; }
            var preso = !!overlayPreso();
            if (!preso) {
              try { preso = (window.getComputedStyle(document.body).overflow === 'hidden' && !janelaAberta()); } catch (e) {}
            }
            botaoSoltar(preso);
            if (preso && !janelaAberta()) { soltar(); }
          }, 3000);
        
          setInterval(function () { testarServidor(); }, 30000);
        
          /* ================================================================ *
           * porta de servico para conferir no console
           * ================================================================ */
          window.P129 = {
            ocupado: ocupado,
            soltar: soltar,
            testarServidor: testarServidor,
            mesVigente: ajustarMesCusto,
            conferir: function () {
              var r = {
                noMeioDeUmCadastro: ocupado(),
                emEspera: Object.keys(pendentes),
                servidorRespondeu: estado.servidorRespondeu,
                telaTravada: !!overlayPreso(),
                mesDoCentroDeCustos: (document.getElementById('custoFilterMes') || {}).value || '(sem campo)'
              };
              try { console.log('P129', r); } catch (e) {}
              return r;
            }
          };
        
          function comecar() {
            estilo();
            protegerTudo();
            protegerTrocaAba();
            testarServidor();
            setTimeout(function () { if (abaCustoAberta()) { ajustarMesCusto(false); } }, 900);
            setTimeout(function () { if (abaCustoAberta()) { ajustarMesCusto(false); } }, 3000);
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', comecar);
          } else {
            comecar();
          }
        })();
    
