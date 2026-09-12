
        /* =====================================================================
         * PATCH 132 - devolve o clique das caixas, garante o fechamento e
         *             tira o Centro de Custos do zero
         * ===================================================================== */
        (function () {
          if (window.__p132) { return; }
          window.__p132 = true;
        
          var estado = {
            cliquesDevolvidos: 0,
            caixasFechadas: 0,
            avisoTexto: '',
            avisoDispensado: '',
            mesLimpo: '',
            lancamentos: 0,
            comData: 0,
            consertadas: 0
          };
        
          function porId(x) { return document.getElementById(x); }
          function meu(el) { return !!(el && String(el.id || '').indexOf('p132') === 0); }
        
          function visivel(el) {
            if (!el || el.nodeType !== 1) { return false; }
            var e = null;
            try { e = window.getComputedStyle(el); } catch (x) { return false; }
            if (!e || e.display === 'none' || e.visibility === 'hidden' || e.opacity === '0') { return false; }
            var r = null;
            try { r = el.getBoundingClientRect(); } catch (x2) { return false; }
            return !!(r && r.width > 20 && r.height > 20);
          }
        
          /* ================================================================ *
           * 1) devolver o clique de tudo que ficou desligado
           * ================================================================ */
          function devolverCliques() {
            var lista, i, n = 0;
            try { lista = document.querySelectorAll('[style*="pointer-events"]'); } catch (e) { return 0; }
            for (i = 0; i < lista.length; i++) {
              var el = lista[i];
              if (!el || meu(el)) { continue; }
              if (el.style && el.style.pointerEvents === 'none') {
                el.style.pointerEvents = '';
                n = n + 1;
              }
            }
            if (document.body && document.body.style.pointerEvents === 'none') {
              document.body.style.pointerEvents = '';
              n = n + 1;
            }
            estado.cliquesDevolvidos = estado.cliquesDevolvidos + n;
            return n;
          }
        
          /* ================================================================ *
           * 2) tarja nova: mesma mensagem, botoes que respondem
           * ================================================================ */
          function tarja() {
            var t = porId('p132Aviso');
            if (t) { return t; }
            t = document.createElement('div');
            t.id = 'p132Aviso';
            var s = document.createElement('span');
            s.id = 'p132AvisoTexto';
            s.style.flex = '1 1 180px';
            t.appendChild(s);
            var acoes = document.createElement('span');
            acoes.id = 'p132AvisoAcoes';
            t.appendChild(acoes);
            if (document.body) { document.body.appendChild(t); }
            return t;
          }
        
          function textoDe(el) {
            var s = '';
            if (!el) { return s; }
            var i, no;
            for (i = 0; i < el.childNodes.length; i++) {
              no = el.childNodes[i];
              if (no.nodeType === 3) { s = s + ' ' + no.nodeValue; }
              else if (no.nodeType === 1 && String(no.tagName).toLowerCase() !== 'button') {
                s = s + ' ' + (no.textContent || '');
              }
            }
            return s.replace(/\s+/g, ' ').trim();
          }
        
          function esconderTarja() {
            var t = porId('p132Aviso');
            if (t) { t.className = ''; }
          }
        
          function espelharTarja() {
            var velha = porId('p125Aviso');
            var ligada = !!(velha && velha.className && velha.className.indexOf('p125-on') >= 0);
            if (!ligada) {
              estado.avisoTexto = '';
              esconderTarja();
              return;
            }
            var msg = textoDe(velha) || 'Alguem gravou uma alteracao nesta obra.';
            if (msg !== estado.avisoTexto) {
              estado.avisoTexto = msg;
              if (estado.avisoDispensado !== msg) { estado.avisoDispensado = ''; }
            }
            if (estado.avisoDispensado === msg) { esconderTarja(); return; }
        
            var t = tarja();
            var alvoTexto = porId('p132AvisoTexto');
            if (alvoTexto && alvoTexto.textContent !== msg) { alvoTexto.textContent = msg; }
            var acoes = porId('p132AvisoAcoes');
            if (acoes && acoes.getAttribute('data-msg') !== msg) {
              acoes.setAttribute('data-msg', msg);
              acoes.innerHTML = '';
              var originais = velha.querySelectorAll('button');
              var i, achouFechar = false;
              for (i = 0; i < originais.length; i++) {
                (function (orig) {
                  var rotulo = (orig.textContent || '').trim();
                  if (!rotulo) { return; }
                  if (rotulo.toLowerCase().indexOf('fechar') >= 0) { achouFechar = true; }
                  var bt = document.createElement('button');
                  bt.type = 'button';
                  if (rotulo.toLowerCase().indexOf('fechar') >= 0) { bt.className = 'fraco'; }
                  bt.textContent = rotulo;
                  bt.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    estado.avisoDispensado = msg;
                    esconderTarja();
                    try { orig.click(); } catch (e) { }
                    if (velha.className) { velha.className = velha.className.replace('p125-on', '').trim(); }
                  });
                  acoes.appendChild(bt);
                }(originais[i]));
              }
              if (!originais.length) {
                var bt2 = document.createElement('button');
                bt2.type = 'button';
                bt2.textContent = 'Resolver agora';
                bt2.addEventListener('click', function (ev) {
                  ev.preventDefault();
                  estado.avisoDispensado = msg;
                  esconderTarja();
                  if (typeof window.p125Enviar === 'function') { try { window.p125Enviar(); } catch (e) { } }
                });
                acoes.appendChild(bt2);
              }
              if (!achouFechar) {
                var bt3 = document.createElement('button');
                bt3.type = 'button';
                bt3.className = 'fraco';
                bt3.textContent = 'Fechar';
                bt3.addEventListener('click', function (ev) {
                  ev.preventDefault();
                  estado.avisoDispensado = msg;
                  esconderTarja();
                  if (velha.className) { velha.className = velha.className.replace('p125-on', '').trim(); }
                });
                acoes.appendChild(bt3);
              }
            }
            t.className = 'on';
          }
        
          /* ================================================================ *
           * 3) todas as caixas do projeto: clique garantido e fechamento
           * ================================================================ */
          var CHAVE_FECHA = /^(fechar|cancelar|decidir depois|sair|voltar|nao agora|agora nao|x|\u00d7)$/;
        
          function ehCaixa(el) {
            if (!el || el.nodeType !== 1 || meu(el)) { return false; }
            var e;
            try { e = window.getComputedStyle(el); } catch (x) { return false; }
            if (!e) { return false; }
            if (e.position !== 'fixed' && e.position !== 'absolute') { return false; }
            var c = String(el.className || '').toLowerCase();
            var papel = String(el.getAttribute('role') || '').toLowerCase();
            var marcas = ['p125-fundo', 'modal', 'overlay', 'popup', 'dialog', 'lightbox', 'drawer', 'p12'];
            var bate = papel === 'dialog' || String(el.tagName).toLowerCase() === 'dialog';
            var i;
            for (i = 0; i < marcas.length; i++) {
              if (c.indexOf(marcas[i]) >= 0) { bate = true; }
            }
            if (!bate) { return false; }
            return el.querySelectorAll('button, [type=button], [type=submit], a, input, select').length > 0;
          }
        
          function caixasNaTela() {
            var fora = [], lista, i;
            try { lista = document.querySelectorAll('div, section, dialog, aside'); } catch (e) { return fora; }
            for (i = 0; i < lista.length; i++) {
              if (ehCaixa(lista[i]) && visivel(lista[i])) { fora.push(lista[i]); }
            }
            return fora;
          }
        
          function bloqueada(caixa) {
            var bts = caixa.querySelectorAll('button, [type=button], [type=submit]');
            if (!bts.length) { return false; }
            var bt = bts[bts.length - 1], r, alvo;
            try { r = bt.getBoundingClientRect(); } catch (e) { return false; }
            if (!r || r.width < 2 || r.height < 2) { return false; }
            if (typeof document.elementFromPoint !== 'function') { return false; }
            try { alvo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); } catch (e2) { return false; }
            if (!alvo) { return false; }
            if (alvo === bt || bt.contains(alvo) || caixa.contains(alvo)) { return false; }
            return true;
          }
        
          function cuidarDasCaixas() {
            var abertas = caixasNaTela(), i;
            for (i = 0; i < abertas.length; i++) {
              var caixa = abertas[i];
              var pai = caixa;
              while (pai && pai.nodeType === 1) {
                if (pai.style && pai.style.pointerEvents === 'none' && !meu(pai)) {
                  pai.style.pointerEvents = '';
                  estado.cliquesDevolvidos = estado.cliquesDevolvidos + 1;
                }
                pai = pai.parentNode;
              }
              if (bloqueada(caixa)) {
                caixa.style.zIndex = '2147482000';
                caixa.setAttribute('data-p132', 'erguida');
              }
            }
            return abertas.length;
          }
        
          function fecharCaixa(caixa) {
            if (!caixa) { return false; }
            try {
              if (typeof caixa.close === 'function' && caixa.open) { caixa.close(); }
            } catch (e) { }
            if (caixa.className && caixa.className.indexOf('p125-fundo') >= 0 && caixa.parentNode) {
              caixa.parentNode.removeChild(caixa);
            } else {
              caixa.style.display = 'none';
              caixa.setAttribute('aria-hidden', 'true');
            }
            estado.caixasFechadas = estado.caixasFechadas + 1;
            return true;
          }
        
          function garantirFechamento(caixa) {
            if (!caixa) { return; }
            window.setTimeout(function () {
              if (caixa.parentNode && visivel(caixa)) { fecharCaixa(caixa); }
            }, 450);
          }
        
          function caixaDe(el) {
            var pai = el;
            while (pai && pai.nodeType === 1) {
              if (ehCaixa(pai)) { return pai; }
              pai = pai.parentNode;
            }
            return null;
          }
        
          function ligarFechamento() {
            document.addEventListener('click', function (ev) {
              var alvo = ev.target;
              if (!alvo || alvo.nodeType !== 1 || meu(alvo)) { return; }
              var bt = alvo;
              while (bt && bt.nodeType === 1 && String(bt.tagName).toLowerCase() !== 'button' &&
                     String(bt.tagName).toLowerCase() !== 'a') { bt = bt.parentNode; }
              if (!bt || bt.nodeType !== 1) { return; }
              var rotulo = (bt.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
              if (!CHAVE_FECHA.test(rotulo)) { return; }
              garantirFechamento(caixaDe(bt));
            }, true);
        
            document.addEventListener('keydown', function (ev) {
              if (ev.key !== 'Escape') { return; }
              var abertas = caixasNaTela();
              if (!abertas.length) { return; }
              garantirFechamento(abertas[abertas.length - 1]);
            }, true);
          }
        
          function listarCaixas() {
            var abertas = caixasNaTela();
            var fora = abertas.map(function (c) {
              return {
                marca: c.id || c.className || c.tagName,
                clicavel: !bloqueada(c),
                botoes: c.querySelectorAll('button').length
              };
            });
            console.log('[P132] caixas abertas: ' + fora.length);
            fora.forEach(function (x) {
              console.log('  - ' + x.marca + ' | clicavel: ' + (x.clicavel ? 'sim' : 'nao') +
                          ' | botoes: ' + x.botoes);
            });
            return fora;
          }
        
          /* ================================================================ *
           * 4) Centro de Custos: cartoes nunca em zero sem explicacao
           * ================================================================ */
          var CAMPOS_DATA = ['data', 'dataDespesa', 'dataPagamento', 'dataLancamento',
                             'dataCompra', 'dataNota', 'dt', 'vencimento', 'criadoEm', 'quando'];
        
          function obras() {
            try {
              if (window.db && window.db.obras && window.db.obras.length) { return window.db.obras; }
            } catch (e) { }
            return [];
          }
        
          function todosOsLancamentos() {
            var fora = [], lista = obras(), i, j;
            for (i = 0; i < lista.length; i++) {
              var cc = (lista[i] && lista[i].centrosCusto) ? lista[i].centrosCusto : [];
              for (j = 0; j < cc.length; j++) {
                if (cc[j]) { fora.push(cc[j]); }
              }
            }
            return fora;
          }
        
          function mesDe(item) {
            if (!item) { return ''; }
            var i, bruto;
            for (i = 0; i < CAMPOS_DATA.length; i++) {
              bruto = item[CAMPOS_DATA[i]];
              if (bruto === undefined || bruto === null || bruto === '') { continue; }
              var s = String(bruto);
              var a = s.match(/(\d{4})-(\d{2})/);
              if (a) { return a[1] + '-' + a[2]; }
              var b = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
              if (b) { return b[3] + '-' + b[2]; }
              var c = s.match(/(\d{2})-(\d{2})-(\d{4})/);
              if (c) { return c[3] + '-' + c[2]; }
              if (/^\d{10,13}$/.test(s)) {
                var d = new Date(s.length > 10 ? Number(s) : Number(s) * 1000);
                if (!isNaN(d.getTime())) {
                  var m = d.getMonth() + 1;
                  return d.getFullYear() + '-' + (m < 10 ? '0' + m : String(m));
                }
              }
            }
            return '';
          }
        
          function dataDe(item) {
            if (!item) { return ''; }
            var i, bruto;
            for (i = 0; i < CAMPOS_DATA.length; i++) {
              bruto = item[CAMPOS_DATA[i]];
              if (bruto === undefined || bruto === null || bruto === '') { continue; }
              var s = String(bruto);
              var a = s.match(/(\d{4})-(\d{2})-(\d{2})/);
              if (a) { return a[1] + '-' + a[2] + '-' + a[3]; }
              var b = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
              if (b) { return b[3] + '-' + b[2] + '-' + b[1]; }
              var c = s.match(/(\d{2})-(\d{2})-(\d{4})/);
              if (c) { return c[3] + '-' + c[2] + '-' + c[1]; }
            }
            var m = mesDe(item);
            return m ? (m + '-01') : '';
          }
        
          function contar() {
            var lista = todosOsLancamentos(), i, comData = 0;
            for (i = 0; i < lista.length; i++) {
              if (String(lista[i].data || '').length >= 7) { comData = comData + 1; }
            }
            estado.lancamentos = lista.length;
            estado.comData = comData;
            return { total: lista.length, comData: comData, semData: lista.length - comData };
          }
        
          function noMes(mes) {
            if (!mes) { return estado.lancamentos; }
            var lista = todosOsLancamentos(), i, n = 0;
            for (i = 0; i < lista.length; i++) {
              if (String(lista[i].data || '').substring(0, 7) === mes) { n = n + 1; }
            }
            return n;
          }
        
          function redesenhar() {
            var f = window.renderCustoDashboard;
            if (typeof f !== 'function') { return false; }
            var real = f.__original || f;
            try { real(); return true; } catch (e) { }
            return false;
          }
        
          function abaCustoAberta() {
            var el = porId('tab-custo');
            if (!el) { return false; }
            try { return window.getComputedStyle(el).display !== 'none'; } catch (e) { return false; }
          }
        
          function notaCusto() {
            var n = porId('p132NotaCusto');
            if (n) { return n; }
            var campo = porId('custoFilterMes');
            if (!campo || !campo.parentNode) { return null; }
            n = document.createElement('div');
            n.id = 'p132NotaCusto';
            campo.parentNode.appendChild(n);
            return n;
          }
        
          function nomeMes(m) {
            var p = String(m || '').split('-');
            if (p.length < 2) { return String(m || ''); }
            var nomes = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho',
                         'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            return (nomes[parseInt(p[1], 10) - 1] || p[1]) + ' de ' + p[0];
          }
        
          function limparFiltroDeMes() {
            var campo = porId('custoFilterMes');
            if (!campo) { return; }
            estado.mesLimpo = campo.value || '';
            campo.value = '';
            campo.setAttribute('data-p129', '1');
            campo.setAttribute('data-p132', 'limpo');
            var de = porId('custoFilterPeriodoDe');
            var ate = porId('custoFilterPeriodoAte');
            if (de) { de.value = ''; }
            if (ate) { ate.value = ''; }
            redesenhar();
          }
        
          function gravarBase() {
            var nomes = ['salvarDB', 'salvarLocalComoBackup', 'sincronizarBancoNuvem'], i, ok = false;
            for (i = 0; i < nomes.length; i++) {
              var f = window[nomes[i]];
              if (typeof f === 'function') {
                try { (f.__original || f)(); ok = true; } catch (e) { }
              }
            }
            return ok;
          }
        
          function consertarDatas() {
            var lista = todosOsLancamentos(), i, n = 0;
            for (i = 0; i < lista.length; i++) {
              if (String(lista[i].data || '').length >= 7) { continue; }
              var nova = dataDe(lista[i]);
              if (nova) { lista[i].data = nova; n = n + 1; }
            }
            estado.consertadas = estado.consertadas + n;
            if (n) { gravarBase(); redesenhar(); }
            return n;
          }
        
          function mostrarNota(texto, botoes) {
            var n = notaCusto();
            if (!n) { return; }
            n.innerHTML = '';
            var s = document.createElement('div');
            s.textContent = texto;
            n.appendChild(s);
            (botoes || []).forEach(function (cfg) {
              var bt = document.createElement('button');
              bt.type = 'button';
              bt.textContent = cfg.texto;
              bt.addEventListener('click', function (ev) {
                ev.preventDefault();
                cfg.acao();
              });
              n.appendChild(bt);
            });
            n.className = 'on';
          }
        
          function esconderNota() {
            var n = porId('p132NotaCusto');
            if (n) { n.className = ''; }
          }
        
          function verificarCustos() {
            if (!abaCustoAberta()) { return; }
            var campo = porId('custoFilterMes');
            if (!campo) { return; }
            var c = contar();
            if (!c.total) { esconderNota(); return; }
            var mes = String(campo.value || '');
            var pedidoAntes = String(campo.getAttribute('data-p132') || '');
            if (mes && pedidoAntes === 'pedido:' + mes) { return; }
            if (mes && noMes(mes) === 0) {
              if (!c.comData) {
                var pedido = mes;
                mostrarNota('Ha ' + c.total + ' lancamento(s) no Centro de Custos, mas nenhum tem ' +
                  'data que o filtro consiga ler. Por isso os cartoes ficam em zero.',
                  [{ texto: 'Consertar as datas', acao: function () {
                      if (!window.confirm('Vou preencher a data que falta em ' + c.semData +
                        ' lancamento(s), usando os outros campos de data de cada um. Continuar?')) { return; }
                      var n = consertarDatas();
                      limparFiltroDeMes();
                      mostrarNota(n + ' lancamento(s) ganharam data e os cartoes foram refeitos.',
                        [{ texto: 'Fechar aviso', acao: esconderNota }]);
                    } },
                   { texto: 'Ver todos os meses', acao: function () { limparFiltroDeMes(); esconderNota(); } },
                   { texto: 'Fechar aviso', acao: esconderNota }]);
                estado.mesLimpo = pedido;
                return;
              }
              var pedido2 = mes;
              limparFiltroDeMes();
              mostrarNota('O mes de ' + nomeMes(pedido2) + ' nao tem lancamento com esse filtro. ' +
                'Mostrando todos os meses para os cartoes nao ficarem em zero.',
                [{ texto: 'Voltar para ' + nomeMes(pedido2), acao: function () {
                    campo.value = pedido2;
                    campo.setAttribute('data-p132', 'pedido:' + pedido2);
                    redesenhar();
                    esconderNota();
                  } },
                 { texto: 'Fechar aviso', acao: esconderNota }]);
              return;
            }
            if (pedidoAntes.indexOf('pedido:') !== 0) { esconderNota(); }
          }
        
          function diagnosticoCustos() {
            var c = contar();
            var campo = porId('custoFilterMes');
            var mes = campo ? String(campo.value || '') : '';
            console.log('[P132] lancamentos: ' + c.total + ' | com data valida: ' + c.comData +
                        ' | sem data: ' + c.semData);
            console.log('[P132] filtro de mes: ' + (mes || 'todos os meses') +
                        ' | lancamentos nesse mes: ' + noMes(mes));
            return { total: c.total, comData: c.comData, semData: c.semData, mes: mes, noMes: noMes(mes) };
          }
        
          /* ================================================================ *
           * 5) vigia e atalhos de conferencia
           * ================================================================ */
          function passo() {
            try { devolverCliques(); } catch (e) { }
            try { cuidarDasCaixas(); } catch (e) { }
            try { espelharTarja(); } catch (e) { }
            try { verificarCustos(); } catch (e) { }
          }
        
          function conferir() {
            var c = contar();
            var linhas = [
              'cliques devolvidos: ' + estado.cliquesDevolvidos,
              'caixas fechadas a forca: ' + estado.caixasFechadas,
              'caixas abertas agora: ' + caixasNaTela().length,
              'lancamentos: ' + c.total + ' (sem data: ' + c.semData + ')',
              'datas consertadas nesta sessao: ' + estado.consertadas
            ];
            linhas.forEach(function (l) { console.log('[P132] ' + l); });
            return {
              cliquesDevolvidos: estado.cliquesDevolvidos,
              caixasFechadas: estado.caixasFechadas,
              caixasAbertas: caixasNaTela().length,
              lancamentos: c.total,
              semData: c.semData,
              consertadas: estado.consertadas
            };
          }
        
          window.P132 = {
            conferir: conferir,
            caixas: listarCaixas,
            custos: diagnosticoCustos,
            consertarDatas: consertarDatas,
            todosOsMeses: limparFiltroDeMes,
            devolverCliques: devolverCliques,
            fecharTudo: function () {
              var abertas = caixasNaTela(), i, n = 0;
              for (i = 0; i < abertas.length; i++) { if (fecharCaixa(abertas[i])) { n = n + 1; } }
              esconderTarja();
              return n;
            },
            estado: function () { return estado; }
          };
        
          function comecar() {
            ligarFechamento();
            passo();
            window.setInterval(passo, 700);
            try { console.log('[PATCH132] caixas liberadas e Centro de Custos vigiado. Use P132.conferir()'); }
            catch (e) { }
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { window.setTimeout(comecar, 300); });
          } else {
            window.setTimeout(comecar, 300);
          }
        }());
    
