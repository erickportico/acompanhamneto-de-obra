
        /* PATCH 122 - Excluir em lotes no Painel Geral de Producao.
           Nao altera nenhuma conta: apenas marca linhas e aplica a mesma
           exclusao que o painel ja faz, de uma vez, com um unico salvamento. */
        (function () {
          'use strict';
        
          if (window.__patch122Lote) { return; }
          window.__patch122Lote = true;
        
          var NL = String.fromCharCode(10);
          var SEL = {};          /* ids marcados */
          var ORDEM = [];        /* ids na ordem em que aparecem na tela */
          var ultimo = null;     /* ultima linha clicada (para o SHIFT) */
          var ocupado = false;
        
          /* ---------------------------------------------------------------- *
           * utilidades
           * ---------------------------------------------------------------- */
        
          function idDaLinha(tr) {
            var b = tr.querySelector('button[onclick*="excluirItem"]');
            if (!b) { return null; }
            var texto = b.getAttribute('onclick') || '';
            var ini = texto.indexOf('excluirItem(');
            if (ini < 0) { return null; }
            var resto = texto.substring(ini + 12);
            var fim = resto.indexOf(')');
            if (fim < 0) { return null; }
            var cru = resto.substring(0, fim).replace(/[^0-9.eE+-]/g, '');
            return cru ? cru : null;
          }
        
          function obraAtual() {
            try {
              if (typeof getObraAtual === 'function') { return getObraAtual(); }
            } catch (e) {}
            return null;
          }
        
          function achaItem(id) {
            var o = obraAtual();
            var lista = (o && o.itens) ? o.itens : [];
            for (var i = 0; i < lista.length; i++) {
              if (String(lista[i].id) === String(id)) { return lista[i]; }
            }
            return null;
          }
        
          function numero(v) {
            var n = Number(v);
            return isNaN(n) ? 0 : n;
          }
        
          function resumoDosMarcados() {
            var qtd = 0, area = 0, n = 0, refs = [];
            for (var i = 0; i < ORDEM.length; i++) {
              var id = ORDEM[i];
              if (!SEL[id]) { continue; }
              n++;
              var it = achaItem(id);
              if (!it) { continue; }
              var q = numero(it.qtd || it.quantidade || 1);
              var l = numero(it.larg || it.largura || 0);
              var a = numero(it.alt || it.altura || 0);
              qtd += q;
              area += q * l * a;
              refs.push((it.ref || 'sem referencia') + (it.loc ? ' - ' + it.loc : ''));
            }
            return { itens: n, pecas: qtd, area: area, refs: refs };
          }
        
          /* ---------------------------------------------------------------- *
           * barra de acoes (aparece so quando algo esta marcado)
           * ---------------------------------------------------------------- */
        
          function garantirBarra() {
            var barra = document.getElementById('p122Barra');
            if (barra) { return barra; }
        
            var aba = document.getElementById('tab-itens');
            if (!aba) { return null; }
            var tabela = aba.querySelector('.table-responsive');
            if (!tabela) { return null; }
        
            barra = document.createElement('div');
            barra.id = 'p122Barra';
        
            var texto = document.createElement('span');
            texto.id = 'p122Texto';
            texto.textContent = '0 itens selecionados';
        
            var detalhe = document.createElement('span');
            detalhe.id = 'p122Detalhe';
            detalhe.textContent = '';
        
            var esticar = document.createElement('span');
            esticar.style.flex = '1';
        
            var btExcluir = document.createElement('button');
            btExcluir.id = 'p122Excluir';
            btExcluir.type = 'button';
            btExcluir.textContent = 'Excluir selecionados';
            btExcluir.title = 'Apaga de uma vez todos os itens marcados';
            btExcluir.addEventListener('click', function (ev) {
              ev.preventDefault();
              excluirEmLote();
            });
        
            var btLimpar = document.createElement('button');
            btLimpar.id = 'p122Limpar';
            btLimpar.type = 'button';
            btLimpar.textContent = 'Limpar selecao';
            btLimpar.addEventListener('click', function (ev) {
              ev.preventDefault();
              SEL = {};
              ultimo = null;
              sincronizarCaixas();
              atualizar();
            });
        
            barra.appendChild(texto);
            barra.appendChild(detalhe);
            barra.appendChild(esticar);
            barra.appendChild(btExcluir);
            barra.appendChild(btLimpar);
        
            tabela.parentNode.insertBefore(barra, tabela);
            return barra;
          }
        
          function atualizar() {
            var r = resumoDosMarcados();
            var barra = garantirBarra();
            if (barra) {
              if (r.itens > 0) { barra.className = 'p122-on'; }
              else { barra.className = ''; }
              var t = document.getElementById('p122Texto');
              var d = document.getElementById('p122Detalhe');
              if (t) {
                t.textContent = r.itens === 1 ? '1 item selecionado'
                                              : (r.itens + ' itens selecionados');
              }
              if (d) {
                d.textContent = '(' + r.pecas + ' peca(s) - '
                                + r.area.toFixed(2) + ' m2)';
              }
            }
        
            /* caixinha do cabecalho: marcada, vazia ou parcial */
            var mestre = document.getElementById('p122Todos');
            if (mestre) {
              var visiveis = ORDEM.length;
              if (!visiveis) {
                mestre.checked = false;
                mestre.indeterminate = false;
              } else if (r.itens === 0) {
                mestre.checked = false;
                mestre.indeterminate = false;
              } else if (r.itens >= visiveis) {
                mestre.checked = true;
                mestre.indeterminate = false;
              } else {
                mestre.checked = false;
                mestre.indeterminate = true;
              }
            }
          }
        
          function sincronizarCaixas() {
            var tbody = document.getElementById('tbodyItens');
            if (!tbody) { return; }
            var linhas = tbody.querySelectorAll('tr');
            for (var i = 0; i < linhas.length; i++) {
              var tr = linhas[i];
              var cx = tr.querySelector('input.p122-cx');
              if (!cx) { continue; }
              var marcada = !!SEL[cx.getAttribute('data-p122-id')];
              cx.checked = marcada;
              if (marcada) { tr.className = (tr.className.replace(' p122-marcada', '') + ' p122-marcada'); }
              else { tr.className = tr.className.replace(' p122-marcada', ''); }
            }
          }
        
          /* ---------------------------------------------------------------- *
           * coluna nova no cabecalho e nas linhas
           * ---------------------------------------------------------------- */
        
          function garantirCabecalho() {
            var thead = document.getElementById('theadItens');
            if (!thead) { return; }
            if (thead.querySelector('.p122-cel')) { return; }
            var linhas = thead.querySelectorAll('tr');
            if (!linhas.length) { return; }
        
            var th = document.createElement('th');
            th.className = 'head-base p122-cel';
            if (linhas.length > 1) { th.rowSpan = 2; }
            th.title = 'Marcar / desmarcar todos os itens que estao aparecendo';
        
            var caixa = document.createElement('div');
            caixa.className = 'th-content';
            caixa.style.justifyContent = 'center';
        
            var cx = document.createElement('input');
            cx.type = 'checkbox';
            cx.id = 'p122Todos';
            cx.className = 'p122-cx';
            cx.addEventListener('click', function (ev) { ev.stopPropagation(); });
            cx.addEventListener('change', function () {
              var ligar = this.checked;
              for (var i = 0; i < ORDEM.length; i++) {
                if (ligar) { SEL[ORDEM[i]] = true; }
                else { delete SEL[ORDEM[i]]; }
              }
              ultimo = null;
              sincronizarCaixas();
              atualizar();
            });
        
            caixa.appendChild(cx);
            th.appendChild(caixa);
        
            var primeira = linhas[0];
            if (primeira.children.length) { primeira.insertBefore(th, primeira.children[0]); }
            else { primeira.appendChild(th); }
          }
        
          function marcarIntervalo(idFim, ligar) {
            var a = ORDEM.indexOf(String(ultimo));
            var b = ORDEM.indexOf(String(idFim));
            if (a < 0 || b < 0) { return false; }
            var ini = Math.min(a, b), fim = Math.max(a, b);
            for (var i = ini; i <= fim; i++) {
              if (ligar) { SEL[ORDEM[i]] = true; }
              else { delete SEL[ORDEM[i]]; }
            }
            return true;
          }
        
          function garantirCaixas() {
            var tbody = document.getElementById('tbodyItens');
            if (!tbody) { return; }
            garantirCabecalho();
            garantirBarra();
        
            ORDEM = [];
            var linhas = tbody.querySelectorAll('tr');
            for (var i = 0; i < linhas.length; i++) {
              var tr = linhas[i];
              var id = idDaLinha(tr);
              if (!id) { continue; }   /* linha de aviso (nenhum item) fica de fora */
              ORDEM.push(String(id));
        
              if (tr.querySelector('.p122-cel')) { continue; }
        
              var td = document.createElement('td');
              td.className = 'p122-cel';
        
              var cx = document.createElement('input');
              cx.type = 'checkbox';
              cx.className = 'p122-cx';
              cx.setAttribute('data-p122-id', String(id));
              cx.title = 'Marcar este item para excluir em lote';
              cx.addEventListener('click', function (ev) {
                ev.stopPropagation();
                var meu = this.getAttribute('data-p122-id');
                var ligar = this.checked;
                var fezIntervalo = false;
                if (ev.shiftKey && ultimo !== null && String(ultimo) !== String(meu)) {
                  fezIntervalo = marcarIntervalo(meu, ligar);
                }
                if (!fezIntervalo) {
                  if (ligar) { SEL[meu] = true; }
                  else { delete SEL[meu]; }
                }
                ultimo = meu;
                sincronizarCaixas();
                atualizar();
              });
        
              td.appendChild(cx);
              if (tr.children.length) { tr.insertBefore(td, tr.children[0]); }
              else { tr.appendChild(td); }
            }
        
            /* limpa marcas de itens que sairam da tela (filtro/obra trocada) */
            var novo = {};
            for (var k = 0; k < ORDEM.length; k++) {
              if (SEL[ORDEM[k]]) { novo[ORDEM[k]] = true; }
            }
            SEL = novo;
        
            sincronizarCaixas();
            atualizar();
          }
        
          /* ---------------------------------------------------------------- *
           * exclusao em lote
           * ---------------------------------------------------------------- */
        
          function excluirEmLote() {
            var o = obraAtual();
            if (!o) {
              alert('Nenhuma obra selecionada. Escolha a obra e tente de novo.');
              return;
            }
        
            var alvos = [];
            for (var i = 0; i < ORDEM.length; i++) {
              if (SEL[ORDEM[i]]) { alvos.push(String(ORDEM[i])); }
            }
            if (!alvos.length) {
              alert('Marque pelo menos um item para excluir.');
              return;
            }
        
            var r = resumoDosMarcados();
            var partes = [];
            partes.push('EXCLUIR ' + r.itens + ' ITEM(NS) DE UMA VEZ');
            partes.push('');
            partes.push('Total: ' + r.pecas + ' peca(s) e ' + r.area.toFixed(2) + ' m2.');
            partes.push('A exclusao vale para TODAS as abas (Liberacao, Fabricacao,');
            partes.push('Instalacao e relatorios) e nao tem desfazer.');
            partes.push('');
            if (r.refs.length <= 20) {
              partes.push('Itens que vao sair:');
              for (var j = 0; j < r.refs.length; j++) {
                partes.push('  - ' + r.refs[j]);
              }
            } else {
              partes.push('Primeiros 10 itens que vao sair:');
              for (var k = 0; k < 10; k++) {
                partes.push('  - ' + r.refs[k]);
              }
              partes.push('  ... e mais ' + (r.refs.length - 10) + ' item(ns).');
            }
            partes.push('');
            partes.push('Confirma a exclusao?');
        
            if (!confirm(partes.join(NL))) { return; }
        
            /* mais de 20 itens: pede para digitar a palavra, para nao apagar */
            /* uma obra inteira por engano */
            if (alvos.length > 20) {
              var digitado = prompt('Sao ' + alvos.length + ' itens. Para confirmar,'
                + ' digite a palavra EXCLUIR (em letras maiusculas):', '');
              if (digitado === null) { return; }
              if (String(digitado).trim().toUpperCase() !== 'EXCLUIR') {
                alert('Nada foi excluido: a palavra digitada nao confere.');
                return;
              }
            }
        
            var fora = {};
            for (var m = 0; m < alvos.length; m++) { fora[alvos[m]] = true; }
        
            var antes = (o.itens || []).length;
            o.itens = (o.itens || []).filter(function (it) {
              return !(it && fora[String(it.id)]);
            });
            var saiu = antes - o.itens.length;
        
            try {
              if (window._itemPreviewMap) {
                for (var id in fora) {
                  if (fora.hasOwnProperty(id)) { delete window._itemPreviewMap[id]; }
                }
              }
            } catch (e) {}
        
            SEL = {};
            ultimo = null;
        
            /* um unico salvamento no fim (mais rapido do que apagar um por um) */
            try {
              if (typeof salvarDB === 'function') { salvarDB(); }
            } catch (e2) {}
        
            try {
              if (typeof renderTabelaPrincipal === 'function') { renderTabelaPrincipal(o); }
            } catch (e3) {}
        
            try { garantirCaixas(); } catch (e4) {}
            atualizar();
        
            alert(saiu + ' item(ns) excluido(s) do Painel Geral de Producao.' + NL
              + 'Eles sairam tambem das abas de Liberacao, Fabricacao e Instalacao.');
          }
        
          /* ---------------------------------------------------------------- *
           * ligar na tabela (refaz a coluna a cada redesenho)
           * ---------------------------------------------------------------- */
        
          function ligarTabela() {
            if (typeof window.renderTabelaPrincipal === 'function' &&
                !window.renderTabelaPrincipal.__p122) {
              var original = window.renderTabelaPrincipal;
              var novo = function () {
                var res = original.apply(this, arguments);
                try { garantirCaixas(); } catch (e) {}
                return res;
              };
              novo.__p122 = true;
              window.renderTabelaPrincipal = novo;
            }
        
            var tbody = document.getElementById('tbodyItens');
            if (tbody && tbody.getAttribute('data-p122-vigiada') !== '1') {
              tbody.setAttribute('data-p122-vigiada', '1');
              try {
                var mo = new MutationObserver(function () {
                  if (ocupado) { return; }
                  ocupado = true;
                  try { garantirCaixas(); } catch (e) {}
                  ocupado = false;
                });
                mo.observe(tbody, { childList: true });
              } catch (e) {}
            }
          }
        
          function comecar() {
            ligarTabela();
            try { garantirCaixas(); } catch (e) {}
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', comecar);
          } else {
            comecar();
          }
          setTimeout(comecar, 400);
          setTimeout(comecar, 1500);
          setTimeout(comecar, 3200);
        
          /* atalhos para uso manual, se algum dia precisar */
          window.p122Atualizar = garantirCaixas;
          window.p122ExcluirSelecionados = excluirEmLote;
        })();
    
