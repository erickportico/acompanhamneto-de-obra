
        /* =====================================================================
         * PATCH 130 - limpeza de tarja, indicadores do Centro de Custos,
         *             botoes que respondem e caixas centralizadas
         * ===================================================================== */
        (function () {
          if (window.__p130) { return; }
          window.__p130 = true;
        
          var estado = {
            falhasSeguidas: 0,
            servidorRespondeu: null,
            mesUsado: '',
            mesDeFato: '',
            desbloqueios: 0
          };
        
          function porId(x) { return document.getElementById(x); }
        
          function limparTarjasAntigas() {
            var i, ids = ['p114Net', 'p111Net'];
            for (i = 0; i < ids.length; i++) {
              var v = porId(ids[i]);
              if (v && v.parentNode) { v.parentNode.removeChild(v); }
            }
            if (document.body) {
              document.body.classList.remove('p114-sem-net');
              document.body.classList.remove('p111-com-faixa');
            }
          }
        
          function mostrarTarja(mostrar) {
            limparTarjasAntigas();
            var d = porId('p117Net');
            if (!d) { return; }
            if (mostrar) {
              d.classList.add('p130-mostrar');
              d.classList.add('p117-on');
              d.style.display = 'block';
            } else {
              d.classList.remove('p130-mostrar');
              d.classList.remove('p117-on');
              d.style.display = 'none';
            }
          }
        
          /* ================================================================ *
           * 1) internet: so avisa quando o servidor realmente nao responde
           * ================================================================ */
          function enderecoDoServidor() {
            try {
              if (window.SUPABASE_URL) { return String(window.SUPABASE_URL); }
              if (window.supabaseUrl) { return String(window.supabaseUrl); }
              var sb = window.supabase || window.sb || null;
              if (sb && sb.supabaseUrl) { return String(sb.supabaseUrl); }
              if (sb && sb.restUrl) { return String(sb.restUrl); }
            } catch (e) {}
            return '';
          }
        
          function pingar() {
            var base = enderecoDoServidor();
            while (base.length > 0 && base.charAt(base.length - 1) === '/') {
              base = base.substring(0, base.length - 1);
            }
            var url = base ? (base + '/auth/v1/health') : (location.href.split('#')[0]);
            return new Promise(function (pronto) {
              var acabou = false;
              var relogio = setTimeout(function () {
                if (!acabou) { acabou = true; pronto(false); }
              }, 6000);
              try {
                fetch(url, { method: 'GET', cache: 'no-store', mode: 'no-cors' }).then(function () {
                  if (acabou) { return; }
                  acabou = true; clearTimeout(relogio); pronto(true);
                }).catch(function () {
                  if (acabou) { return; }
                  acabou = true; clearTimeout(relogio); pronto(false);
                });
              } catch (e) {
                acabou = true; clearTimeout(relogio); pronto(false);
              }
            });
          }
        
          function testarInternet() {
            return pingar().then(function (respondeu) {
              estado.servidorRespondeu = respondeu;
              if (respondeu) {
                estado.falhasSeguidas = 0;
                mostrarTarja(false);
              } else {
                estado.falhasSeguidas = estado.falhasSeguidas + 1;
                /* so avisa depois de duas falhas seguidas: acaba com alarme falso */
                mostrarTarja(estado.falhasSeguidas >= 2);
              }
              return respondeu;
            });
          }
        
          /* ================================================================ *
           * 2) cliques que nao respondem: descobre quem esta cobrindo o botao
           * ================================================================ */
          function quemCobre(el) {
            if (!el || !document.elementFromPoint) { return null; }
            var r;
            try { r = el.getBoundingClientRect(); } catch (e) { return null; }
            if (!r || (!r.width && !r.height)) { return null; }
            var x = r.left + r.width / 2;
            var y = r.top + r.height / 2;
            var alvo = null;
            try { alvo = document.elementFromPoint(x, y); } catch (e2) { return null; }
            if (!alvo) { return null; }
            if (alvo === el || el.contains(alvo) || alvo.contains(el)) { return null; }
            return alvo;
          }
        
          function afastar(coberto) {
            /* sobe pelos pais ate achar quem esta por cima e o tira do caminho */
            var quem = quemCobre(coberto);
            var voltas = 0;
            while (quem && voltas < 6) {
              var alvo = quem;
              var est = null;
              try { est = window.getComputedStyle(alvo); } catch (e) { est = null; }
              while (alvo && alvo !== document.body && est && est.position !== 'fixed' && est.position !== 'absolute') {
                alvo = alvo.parentNode;
                try { est = alvo && alvo.nodeType === 1 ? window.getComputedStyle(alvo) : null; } catch (e2) { est = null; }
              }
              if (!alvo || alvo === document.body || alvo.nodeType !== 1) { return voltas > 0; }
              var vazio = String(alvo.textContent || '').trim().length < 4
                && !alvo.querySelector('input, textarea, select, button, a');
              if (vazio) {
                alvo.style.display = 'none';
              } else {
                alvo.style.pointerEvents = 'none';
              }
              estado.desbloqueios = estado.desbloqueios + 1;
              voltas = voltas + 1;
              quem = quemCobre(coberto);
            }
            return voltas > 0;
          }
        
          function liberarAviso() {
            var caixa = porId('p125Aviso');
            if (!caixa) { return false; }
            caixa.style.pointerEvents = 'auto';
            var botoes = caixa.querySelectorAll('button');
            var mexeu = false;
            var i;
            for (i = 0; i < botoes.length; i++) {
              botoes[i].style.pointerEvents = 'auto';
              if (afastar(botoes[i])) { mexeu = true; }
            }
            return mexeu;
          }
        
          /* ================================================================ *
           * 3) Centro de Custos: nunca mais indicadores zerados sem motivo
           * ================================================================ */
          function baseObras() {
            try {
              if (window.db && window.db.obras && window.db.obras.length) { return window.db.obras; }
            } catch (e) {}
            return [];
          }
        
          function mesesComLancamento() {
            var mapa = {}, obras = baseObras(), i, j;
            for (i = 0; i < obras.length; i++) {
              var lista = (obras[i] && obras[i].centrosCusto) ? obras[i].centrosCusto : [];
              for (j = 0; j < lista.length; j++) {
                var d = lista[j] ? String(lista[j].data || '') : '';
                if (d.length >= 7) { mapa[d.substring(0, 7)] = 1; }
              }
            }
            return Object.keys(mapa).sort();
          }
        
          function nota() {
            var n = porId('p130NotaMes');
            if (n) { return n; }
            var campo = porId('custoFilterMes');
            if (!campo) { return null; }
            var pai = campo.parentNode;
            while (pai && pai.nodeType === 1 && pai.tagName !== 'BODY') {
              if (pai.parentNode && pai.parentNode.children && pai.parentNode.children.length > 1) { break; }
              pai = pai.parentNode;
            }
            n = document.createElement('div');
            n.id = 'p130NotaMes';
            if (pai && pai.parentNode) { pai.parentNode.insertBefore(n, pai.nextSibling); }
            else if (document.body) { document.body.appendChild(n); }
            return n;
          }
        
          function rotulo(m) {
            var p = String(m || '').split('-');
            if (p.length < 2) { return String(m || ''); }
            var nomes = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho',
                         'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            var idx = parseInt(p[1], 10) - 1;
            return (nomes[idx] || p[1]) + ' de ' + p[0];
          }
        
          function avisarMes(usado, pedido) {
            var n = nota();
            if (!n) { return; }
            n.innerHTML = 'O mes de ' + rotulo(pedido) + ' nao tem lancamento. ' +
              'Mostrando ' + rotulo(usado) + ', o ultimo mes com lancamentos.' +
              '<button type="button" id="p130VoltarMes">ver ' + rotulo(pedido) + '</button>';
            n.classList.add('on');
            var b = porId('p130VoltarMes');
            if (b) {
              b.onclick = function () {
                estado.manual = true;
                trocarMes(pedido);
                n.classList.remove('on');
              };
            }
          }
        
          function trocarMes(mes) {
            var campo = porId('custoFilterMes');
            if (!campo) { return; }
            var antes = campo.value;
            campo.value = mes;
            var de = porId('custoFilterPeriodoDe');
            var ate = porId('custoFilterPeriodoAte');
            if (de && ate && mes) {
              var partes = mes.split('-');
              var ano = parseInt(partes[0], 10);
              var num = parseInt(partes[1], 10);
              var fim = new Date(ano, num, 0);
              var dia = fim.getDate();
              if (!de.value || de.value.substring(0, 7) === antes.substring(0, 7)) { de.value = mes + '-01'; }
              if (!ate.value || ate.value.substring(0, 7) === antes.substring(0, 7)) {
                ate.value = mes + '-' + (dia < 10 ? '0' + dia : String(dia));
              }
            }
            estado.mesUsado = mes;
            if (typeof window.renderCustoDashboard === 'function') {
              estado.desenhando = true;
              try { window.renderCustoDashboard(); } catch (e) {}
              estado.desenhando = false;
            }
          }
        
          function ajustarMes() {
            var campo = porId('custoFilterMes');
            if (!campo || estado.manual) { return false; }
            var pedido = String(campo.value || '');
            if (!pedido) { return false; }
            var meses = mesesComLancamento();
            if (!meses.length) { return false; }
            estado.mesDeFato = pedido;
            if (meses.indexOf(pedido) >= 0) {
              var n0 = porId('p130NotaMes');
              if (n0) { n0.classList.remove('on'); }
              estado.mesUsado = pedido;
              return false;
            }
            var escolhido = meses[meses.length - 1], i;
            for (i = meses.length - 1; i >= 0; i--) {
              if (meses[i] <= pedido) { escolhido = meses[i]; break; }
            }
            trocarMes(escolhido);
            avisarMes(escolhido, pedido);
            return true;
          }
        
          /* ================================================================ *
           * 4) toda caixa/janela abre no centro da tela
           * ================================================================ */
          var NAO_MEXER = ['p130notames', 'p125aviso', 'p117net', 'p114net', 'p111net'];
        
          function deixarQuieto(el) {
            var id = String(el.id || '').toLowerCase();
            var cls = String(el.className || '').toLowerCase();
            var i;
            for (i = 0; i < NAO_MEXER.length; i++) {
              if (id.indexOf(NAO_MEXER[i]) >= 0) { return true; }
            }
            if (cls.indexOf('toast') >= 0 || cls.indexOf('tarja') >= 0 || cls.indexOf('tooltip') >= 0) { return true; }
            if (id.indexOf('toast') >= 0 || id.indexOf('tarja') >= 0) { return true; }
            return false;
          }
        
          function candidatos() {
            var lista = [];
            try {
              lista = document.querySelectorAll(
                'dialog, div[id*="odal"], div[class*="odal"], div[id*="verlay"], div[class*="verlay"], div[class*="popup"], div[id*="opup"]'
              );
            } catch (e) { return []; }
            return lista;
          }
        
          function centralizar() {
            var lista = candidatos(), i, mexeu = 0;
            for (i = 0; i < lista.length; i++) {
              var el = lista[i];
              if (!el || el.nodeType !== 1 || deixarQuieto(el)) { continue; }
              var est = null;
              try { est = window.getComputedStyle(el); } catch (e) { est = null; }
              if (!est || est.display === 'none' || est.visibility === 'hidden') { continue; }
              if (est.position !== 'fixed') { continue; }
              var r = el.getBoundingClientRect();
              if (!r || r.width < 40 || r.height < 40) { continue; }
              var largo = r.width >= window.innerWidth * 0.8;
              var alto = r.height >= window.innerHeight * 0.8;
              if (largo && alto) {
                if (!el.classList.contains('p130-centro')) { el.classList.add('p130-centro'); mexeu++; }
              } else if (!el.getAttribute('data-p130-centro')) {
                el.style.left = '50%';
                el.style.top = '50%';
                el.style.right = 'auto';
                el.style.bottom = 'auto';
                el.style.transform = 'translate(-50%, -50%)';
                el.style.maxHeight = '92vh';
                el.style.overflow = 'auto';
                el.setAttribute('data-p130-centro', '1');
                mexeu++;
              }
            }
            estado.centralizadas = (estado.centralizadas || 0) + mexeu;
            return mexeu;
          }
        
          /* ================================================================ *
           * liga tudo
           * ================================================================ */
          function marcarManual() {
            var campo = porId('custoFilterMes');
            if (!campo || campo.getAttribute('data-p130-ouvindo')) { return; }
            campo.setAttribute('data-p130-ouvindo', '1');
            campo.addEventListener('change', function () {
              if (!estado.desenhando) { estado.manual = true; }
            }, false);
          }
        
          function vigiarPintura() {
            if (typeof window.renderCustoDashboard !== 'function' || window.renderCustoDashboard.__p130) { return; }
            var original = window.renderCustoDashboard;
            var novo = function () {
              var r = original.apply(this, arguments);
              if (!estado.desenhando) {
                estado.desenhando = true;
                try { ajustarMes(); } catch (e) {}
                estado.desenhando = false;
              }
              return r;
            };
            novo.__p130 = true;
            window.renderCustoDashboard = novo;
          }
        
          function rodada() {
            limparTarjasAntigas();
            marcarManual();
            vigiarPintura();
            liberarAviso();
            centralizar();
          }
        
          function comecar() {
            mostrarTarja(false);
            rodada();
            try { ajustarMes(); } catch (e) {}
            testarInternet();
            setInterval(rodada, 1200);
            setInterval(testarInternet, 45000);
            window.addEventListener('online', function () { estado.falhasSeguidas = 0; testarInternet(); }, false);
            window.addEventListener('offline', function () { testarInternet(); }, false);
          }
        
          window.P130 = {
            conferir: function () {
              var r = {
                tarjaVisivel: false,
                falhasSeguidas: estado.falhasSeguidas,
                servidorRespondeu: estado.servidorRespondeu,
                mesPedido: estado.mesDeFato,
                mesMostrado: estado.mesUsado,
                mesesComLancamento: mesesComLancamento().length,
                avisoNaTela: !!porId('p125Aviso'),
                desbloqueios: estado.desbloqueios,
                caixasCentralizadas: estado.centralizadas || 0,
                escolhaManualDoMes: !!estado.manual
              };
              var d = porId('p117Net');
              if (d) {
                var e = null;
                try { e = window.getComputedStyle(d); } catch (er) { e = null; }
                r.tarjaVisivel = !!(e && e.display !== 'none');
              }
              try { console.table([r]); } catch (er2) {}
              return r;
            },
            testarInternet: testarInternet,
            ajustarMes: ajustarMes,
            centralizar: centralizar,
            liberarAviso: liberarAviso,
            estado: estado
          };
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { setTimeout(comecar, 400); }, false);
          } else {
            setTimeout(comecar, 400);
          }
        })();
    
