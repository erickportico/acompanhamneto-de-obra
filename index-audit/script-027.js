
                /* === PATCH 53: janelas de instalacao centralizadas e que fecham de verdade (funcionamento) === */
                (function () {
                  "use strict";
                
                  if (window.__patch53Janelas) { return; }
                  window.__patch53Janelas = true;
                
                  /* as duas janelas tratadas por este patch */
                  var IDS = ['modalLancInstalacao', 'modalParcelasInstalacao'];
                
                  /* qual funcao global fecha cada uma (quando existir) */
                  var FECHADORES = {
                    modalLancInstalacao: 'fecharLancamentosInstalacao',
                    modalParcelasInstalacao: ''
                  };
                
                  /* qual funcao global abre cada uma */
                  var ABRIDORES = {
                    modalLancInstalacao: 'abrirLancamentosInstalacao',
                    modalParcelasInstalacao: 'abrirParcelasInstalacao'
                  };
                
                  /* ------------------------------------------------------------------ *
                   * ajudinhas
                   * ------------------------------------------------------------------ */
                
                  function travarFundo() {
                    try {
                      if (!document.body) { return; }
                      var algumaAberta = false;
                      IDS.forEach(function (id) {
                        var bg = document.getElementById(id);
                        if (bg && bg.classList.contains('p53-on')) { algumaAberta = true; }
                      });
                      if (algumaAberta) { document.body.classList.add('p53-travado'); }
                      else { document.body.classList.remove('p53-travado'); }
                    } catch (e) {}
                  }
                
                  function marcarAberta(bg, aberta) {
                    if (!bg) { return; }
                    if (aberta) {
                      if (!bg.classList.contains('p53-on')) { bg.classList.add('p53-on'); }
                      enfeitar(bg);
                    } else {
                      if (bg.classList.contains('p53-on')) { bg.classList.remove('p53-on'); }
                      if (bg.classList.contains('p52-on')) { bg.classList.remove('p52-on'); }
                      /* so escreve se precisar, senao o vigia entra em loop */
                      try {
                        if (String(bg.style.display || '').toLowerCase() !== 'none') {
                          bg.style.display = 'none';
                        }
                      } catch (e) {}
                    }
                    travarFundo();
                  }
                
                  /* le o style que o painel colocou e acerta a classe */
                  function sincronizar(bg) {
                    if (!bg || bg.__p53sync) { return; }
                    bg.__p53sync = true;
                    try {
                      var d = String(bg.style.display || '').toLowerCase();
                      if (d === '' || d === 'none') { marcarAberta(bg, false); }
                      else { marcarAberta(bg, true); }
                    } catch (e) {}
                    bg.__p53sync = false;
                  }
                
                  function estaAberta(bg) {
                    return !!(bg && bg.classList.contains('p53-on'));
                  }
                
                  function janelaAberta() {
                    for (var i = 0; i < IDS.length; i++) {
                      var bg = document.getElementById(IDS[i]);
                      if (estaAberta(bg)) { return bg; }
                    }
                    return null;
                  }
                
                  /* ------------------------------------------------------------------ *
                   * fechar de verdade
                   * ------------------------------------------------------------------ */
                
                  function fechar(bg) {
                    if (!bg) { return; }
                
                    /* 1o tenta a funcao de fechar do proprio painel (limpa o rascunho) */
                    var nome = FECHADORES[bg.id];
                    var usou = false;
                    if (nome && typeof window[nome] === 'function') {
                      try { window[nome](); usou = true; } catch (e) {}
                    }
                
                    /* senao, aciona o proprio botao Cancelar da janela */
                    if (!usou) {
                      try {
                        var bts = bg.querySelectorAll('button');
                        for (var i = 0; i < bts.length; i++) {
                          var txt = String(bts[i].textContent || '').trim().toLowerCase();
                          if (txt === 'cancelar') { bts[i].click(); usou = true; break; }
                        }
                      } catch (e2) {}
                    }
                
                    marcarAberta(bg, false);
                  }
                
                  /* ------------------------------------------------------------------ *
                   * X no canto + botao "Fechar" visivel
                   * ------------------------------------------------------------------ */
                
                  function enfeitar(bg) {
                    var caixa = bg.querySelector('.modal');
                    if (!caixa) { return; }
                
                    /* X no canto (nao repete se o patch anterior ja tinha colocado um) */
                    if (!caixa.querySelector('.p53-x') && !caixa.querySelector('.p52-x')) {
                      var x = document.createElement('button');
                      x.type = 'button';
                      x.className = 'p53-x';
                      x.title = 'Fechar';
                      x.setAttribute('aria-label', 'Fechar');
                      x.textContent = '\u2715';
                      x.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        fechar(bg);
                      });
                      caixa.appendChild(x);
                    }
                
                    /* botao Fechar bem visivel no fim da janela */
                    if (!caixa.querySelector('.p53-rodape')) {
                      var rodape = document.createElement('div');
                      rodape.className = 'p53-rodape';
                      var bt = document.createElement('button');
                      bt.type = 'button';
                      bt.className = 'p53-fechar';
                      bt.textContent = '\u2715 Fechar';
                      bt.title = 'Fechar esta janela (ESC tambem fecha)';
                      bt.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        fechar(bg);
                      });
                      rodape.appendChild(bt);
                      caixa.appendChild(rodape);
                    }
                  }
                
                  /* ------------------------------------------------------------------ *
                   * vigiar cada janela
                   * ------------------------------------------------------------------ */
                
                  function vigiar(bg) {
                    if (!bg || bg.getAttribute('data-p53') === '1') { sincronizar(bg); return; }
                    bg.setAttribute('data-p53', '1');
                
                    /* quando o painel mexer no style, a classe acompanha (some de verdade) */
                    try {
                      var mo = new MutationObserver(function () { sincronizar(bg); });
                      mo.observe(bg, { attributes: true, attributeFilter: ['style'] });
                    } catch (e) {}
                
                    /* clique fora fecha; clique nos botoes da janela reconfere o estado */
                    bg.addEventListener('click', function (ev) {
                      if (ev.target === bg) { fechar(bg); return; }
                      setTimeout(function () { sincronizar(bg); }, 0);
                    });
                
                    sincronizar(bg);
                  }
                
                  function vigiarTodas() {
                    IDS.forEach(function (id) {
                      var bg = document.getElementById(id);
                      if (bg) { vigiar(bg); }
                    });
                  }
                
                  /* engancha o abrir de cada janela, para vigiar assim que ela nascer */
                  function ligarAbridores() {
                    IDS.forEach(function (id) {
                      var nome = ABRIDORES[id];
                      if (!nome) { return; }
                      var orig = window[nome];
                      if (typeof orig !== 'function' || orig.__p53) { return; }
                      var novo = function () {
                        var r;
                        try { r = orig.apply(this, arguments); } catch (e) { r = null; }
                        try {
                          var bg = document.getElementById(id);
                          if (bg) { vigiar(bg); marcarAberta(bg, true); }
                        } catch (e2) {}
                        return r;
                      };
                      novo.__p53 = true;
                      window[nome] = novo;
                    });
                  }
                
                  /* engancha o fechar de cada janela, para a classe sair na hora */
                  function ligarFechadores() {
                    IDS.forEach(function (id) {
                      var nome = FECHADORES[id];
                      if (!nome) { return; }
                      var orig = window[nome];
                      if (typeof orig !== 'function' || orig.__p53) { return; }
                      var novo = function () {
                        var r;
                        try { r = orig.apply(this, arguments); } catch (e) { r = null; }
                        try {
                          var bg = document.getElementById(id);
                          if (bg) { marcarAberta(bg, false); }
                        } catch (e2) {}
                        return r;
                      };
                      novo.__p53 = true;
                      window[nome] = novo;
                    });
                  }
                
                  /* se a janela for criada depois, o vigia pega pelo corpo da pagina */
                  function vigiarCorpo() {
                    if (!document.body || document.body.getAttribute('data-p53-body') === '1') { return; }
                    document.body.setAttribute('data-p53-body', '1');
                    try {
                      var mo = new MutationObserver(function () { vigiarTodas(); });
                      mo.observe(document.body, { childList: true });
                    } catch (e) {}
                  }
                
                  /* ESC fecha a janela que estiver aberta */
                  document.addEventListener('keydown', function (ev) {
                    var k = ev.key || ev.keyCode;
                    if (k === 'Escape' || k === 'Esc' || k === 27) {
                      var bg = janelaAberta();
                      if (bg) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        fechar(bg);
                      }
                    }
                  }, true);
                
                  /* ------------------------------------------------------------------ *
                   * ligar tudo
                   * ------------------------------------------------------------------ */
                
                  function comecar() {
                    ligarAbridores();
                    ligarFechadores();
                    vigiarCorpo();
                    vigiarTodas();
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', comecar);
                  } else {
                    comecar();
                  }
                  setTimeout(comecar, 300);
                  setTimeout(comecar, 1200);
                  setTimeout(comecar, 3000);
                
                  /* socorro manual, se algum dia precisar: p53Fechar() no console */
                  window.p53Fechar = function () {
                    IDS.forEach(function (id) {
                      var bg = document.getElementById(id);
                      if (bg) { fechar(bg); }
                    });
                  };
                })();
            
