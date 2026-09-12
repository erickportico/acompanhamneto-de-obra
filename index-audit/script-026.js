
                /* === PATCH 52: janela de parcelas centralizada + coluna no painel geral (funcionamento) === */
                (function () {
                  "use strict";
                
                  var MODAL_ID = 'modalParcelasInstalacao';
                  var ocupado = false;
                
                  /* ------------------------------------------------------------------ *
                   * ajudinhas
                   * ------------------------------------------------------------------ */
                
                  function janela() {
                    return document.getElementById(MODAL_ID);
                  }
                
                  function travarFundo(sim) {
                    try {
                      if (!document.body) { return; }
                      if (sim) { document.body.classList.add('p52-travado'); }
                      else { document.body.classList.remove('p52-travado'); }
                    } catch (e) {}
                  }
                
                  function obraAtual() {
                    try {
                      if (typeof getObraAtual === 'function') { return getObraAtual(); }
                    } catch (e) {}
                    try {
                      var b = window.db;
                      if (b && b.obras && b.obras.length) {
                        for (var i = 0; i < b.obras.length; i++) {
                          if (b.obras[i] && b.obras[i].id === b.obraAtualId) { return b.obras[i]; }
                        }
                        return b.obras[0];
                      }
                    } catch (e) {}
                    return null;
                  }
                
                  function achaItem(id) {
                    var obra = obraAtual();
                    if (!obra || !obra.itens) { return null; }
                    for (var i = 0; i < obra.itens.length; i++) {
                      if (obra.itens[i] && String(obra.itens[i].id) === String(id)) { return obra.itens[i]; }
                    }
                    return null;
                  }
                
                  function qtdParcelas(item) {
                    if (!item || !Array.isArray(item.historicoInstalacao)) { return 0; }
                    var n = 0;
                    item.historicoInstalacao.forEach(function (p) {
                      if (p && p.data && Number(p.qtd) > 0) { n++; }
                    });
                    return n;
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 1) consertar o abrir / fechar da janelinha
                   * ------------------------------------------------------------------ */
                
                  function estaAberta() {
                    var bg = janela();
                    return !!(bg && bg.classList.contains('p52-on'));
                  }
                
                  function sincronizar() {
                    var bg = janela();
                    if (!bg) { return; }
                    var d = String(bg.style.display || '').toLowerCase();
                    if (d === '' || d === 'none') {
                      bg.classList.remove('p52-on');
                      travarFundo(false);
                    } else {
                      bg.classList.add('p52-on');
                      travarFundo(true);
                      enfeitar(bg);
                    }
                  }
                
                  /* coloca o X de fechar e joga a janela para o topo do conteudo */
                  function enfeitar(bg) {
                    var caixa = bg.querySelector('.modal');
                    if (!caixa) { return; }
                    if (!caixa.querySelector('.p52-x')) {
                      var x = document.createElement('button');
                      x.type = 'button';
                      x.className = 'p52-x';
                      x.title = 'Fechar';
                      x.setAttribute('aria-label', 'Fechar');
                      x.textContent = '✕';
                      x.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        fechar();
                      });
                      caixa.appendChild(x);
                    }
                    try { caixa.scrollTop = 0; } catch (e) {}
                  }
                
                  /* fecha usando o proprio "Cancelar" do painel, para limpar o rascunho */
                  function fechar() {
                    var bg = janela();
                    if (!bg) { return; }
                    var bts = bg.querySelectorAll('button');
                    for (var i = 0; i < bts.length; i++) {
                      if (String(bts[i].textContent || '').trim() === 'Cancelar') {
                        bts[i].click();
                        bg.classList.remove('p52-on');
                        travarFundo(false);
                        return;
                      }
                    }
                    bg.style.display = 'none';
                    bg.classList.remove('p52-on');
                    travarFundo(false);
                  }
                
                  /* fica de olho na janela: se o painel mandar esconder, ela esconde mesmo */
                  function vigiarJanela() {
                    var bg = janela();
                    if (!bg || bg.getAttribute('data-p52-vigiada') === '1') { return; }
                    bg.setAttribute('data-p52-vigiada', '1');
                    try {
                      var mo = new MutationObserver(function () { sincronizar(); });
                      mo.observe(bg, { attributes: true, attributeFilter: ['style'] });
                    } catch (e) {}
                    bg.addEventListener('click', function (ev) {
                      if (ev.target === bg) { fechar(); return; }
                      /* depois de qualquer botao da janela (Salvar, Cancelar...),
                         confere se o painel pediu para esconder e some de verdade */
                      sincronizar();
                    });
                    sincronizar();
                  }
                
                  function ligarJanela() {
                    if (typeof window.abrirParcelasInstalacao !== 'function' ||
                        window.abrirParcelasInstalacao.__p52) { return; }
                    var original = window.abrirParcelasInstalacao;
                    var novo = function () {
                      var r;
                      try { r = original.apply(this, arguments); } catch (e) { r = null; }
                      try { vigiarJanela(); sincronizar(); } catch (e2) {}
                      return r;
                    };
                    novo.__p52 = true;
                    window.abrirParcelasInstalacao = novo;
                  }
                
                  /* ESC fecha */
                  document.addEventListener('keydown', function (ev) {
                    var k = ev.key || ev.keyCode;
                    if ((k === 'Escape' || k === 'Esc' || k === 27) && estaAberta()) {
                      ev.preventDefault();
                      fechar();
                    }
                  }, true);
                
                  /* ------------------------------------------------------------------ *
                   * 2) coluna "Parcelas" no card Controle de Producao e Instalacao
                   * ------------------------------------------------------------------ */
                
                  function garantirCabecalho() {
                    var thead = document.getElementById('theadItens');
                    if (!thead) { return; }
                    if (thead.querySelector('.p52-col-parcelas')) { return; }
                    var linhas = thead.querySelectorAll('tr');
                    if (!linhas.length) { return; }
                
                    var th = document.createElement('th');
                    th.className = 'head-inst p52-col-parcelas';
                    if (linhas.length > 1) { th.rowSpan = 2; }
                    var div = document.createElement('div');
                    div.className = 'th-content';
                    div.textContent = 'Parcelas';
                    th.appendChild(div);
                
                    var primeira = linhas[0];
                    var ths = primeira.children;
                    if (ths.length) { primeira.insertBefore(th, ths[ths.length - 1]); }
                    else { primeira.appendChild(th); }
                  }
                
                  function idDaLinha(tr) {
                    var b = tr.querySelector('button[onclick*="excluirItem"]') ||
                            tr.querySelector('button[onclick*="exportarItemXLSX"]');
                    if (!b) { return null; }
                    var m = /(?:excluirItem|exportarItemXLSX)\(\s*([0-9]+)/.exec(b.getAttribute('onclick') || '');
                    return m ? m[1] : null;
                  }
                
                  function garantirBotoes() {
                    var tbody = document.getElementById('tbodyItens');
                    if (!tbody) { return; }
                    garantirCabecalho();
                
                    var linhas = tbody.querySelectorAll('tr');
                    for (var i = 0; i < linhas.length; i++) {
                      var tr = linhas[i];
                      if (tr.querySelector('.p52-col-parcelas')) { continue; }
                      var id = idDaLinha(tr);
                      if (!id) { continue; }
                
                      var n = qtdParcelas(achaItem(id));
                
                      var td = document.createElement('td');
                      td.className = 'p52-col-parcelas';
                      var caixa = document.createElement('div');
                      caixa.className = 'td-content';
                
                      var bt = document.createElement('button');
                      bt.type = 'button';
                      bt.className = 'p52-btn' + (n ? ' p52-tem' : '');
                      bt.textContent = '📅';
                      bt.title = n ? ('Instalacao em parcelas (' + n + ' lancada(s))')
                                   : 'Lancar instalacao em parcelas por data';
                      bt.setAttribute('data-p52-id', id);
                      bt.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        var alvo = this.getAttribute('data-p52-id');
                        if (typeof window.abrirParcelasInstalacao === 'function') {
                          window.abrirParcelasInstalacao(alvo);
                        } else {
                          alert('A janela de parcelas nao esta disponivel. Atualize a pagina (F5).');
                        }
                      });
                      caixa.appendChild(bt);
                
                      if (n) {
                        var c = document.createElement('span');
                        c.className = 'p52-cont';
                        c.textContent = String(n);
                        caixa.appendChild(c);
                      }
                
                      td.appendChild(caixa);
                      var tds = tr.children;
                      if (tds.length) { tr.insertBefore(td, tds[tds.length - 1]); }
                      else { tr.appendChild(td); }
                    }
                  }
                
                  function ligarTabela() {
                    if (typeof window.renderTabelaPrincipal === 'function' &&
                        !window.renderTabelaPrincipal.__p52) {
                      var original = window.renderTabelaPrincipal;
                      var novo = function () {
                        var r = original.apply(this, arguments);
                        try { garantirBotoes(); } catch (e) {}
                        return r;
                      };
                      novo.__p52 = true;
                      window.renderTabelaPrincipal = novo;
                    }
                
                    var tbody = document.getElementById('tbodyItens');
                    if (tbody && tbody.getAttribute('data-p52-vigiada') !== '1') {
                      tbody.setAttribute('data-p52-vigiada', '1');
                      try {
                        var mo = new MutationObserver(function () {
                          if (ocupado) { return; }
                          ocupado = true;
                          try { garantirBotoes(); } catch (e) {}
                          ocupado = false;
                        });
                        mo.observe(tbody, { childList: true });
                      } catch (e) {}
                    }
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 3) ligar tudo
                   * ------------------------------------------------------------------ */
                
                  function comecar() {
                    ligarJanela();
                    ligarTabela();
                    try { garantirBotoes(); } catch (e) {}
                    try { vigiarJanela(); } catch (e) {}
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', comecar);
                  } else {
                    comecar();
                  }
                  setTimeout(comecar, 300);
                  setTimeout(comecar, 1200);
                  setTimeout(comecar, 3000);
                
                  /* atalhos para uso manual, se precisar */
                  window.p52AtualizarParcelas = garantirBotoes;
                  window.p52FecharParcelas = fechar;
                })();
            
