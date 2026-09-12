
                /* === PATCH 47: menu de abas estilo oreate (funcionamento) === */
                (function () {
                  "use strict";
                
                  var CLASSE = 'pmenu-oreate';
                  var observador = null;
                
                  function det() { return document.getElementById('meu-menu-abas'); }
                
                  function lista() {
                    var d = det();
                    if (!d) { return null; }
                    return d.querySelector('.tabs');
                  }
                
                  function semAcento(t) {
                    try { return t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
                    catch (e) { return t; }
                  }
                
                  /* separa o desenho (emoji) do nome da aba */
                  function partes(txt) {
                    var m = txt.match(/^[^0-9A-Za-z\u00C0-\u024F]+/);
                    var ico = m ? m[0].replace(/[\s\u00a0]+/g, '') : '';
                    var nome = m ? txt.slice(m[0].length) : txt;
                    nome = nome.replace(/\s+/g, ' ').trim();
                    if (!ico) { ico = '\u25CF'; }
                    if (!nome) { nome = txt.replace(/\s+/g, ' ').trim(); }
                    return { ico: ico, nome: nome };
                  }
                
                  /* deixa um botao de aba no formato: icone + nome (+ aviso) */
                  function arrumarBotao(bt) {
                    if (!bt || bt.getAttribute('data-pmenu') === '1') { return; }
                
                    var aviso = bt.querySelector('.ag-badge');
                    var copia = bt.cloneNode(true);
                    var av2 = copia.querySelector('.ag-badge');
                    if (av2 && av2.parentNode) { av2.parentNode.removeChild(av2); }
                
                    var bruto = (copia.textContent || '').replace(/\s+/g, ' ').trim();
                    if (!bruto) { bruto = 'Aba'; }
                    var p = partes(bruto);
                
                    while (bt.firstChild) { bt.removeChild(bt.firstChild); }
                
                    var sIco = document.createElement('span');
                    sIco.className = 'pmenu-ico';
                    sIco.setAttribute('aria-hidden', 'true');
                    sIco.textContent = p.ico;
                
                    var sTxt = document.createElement('span');
                    sTxt.className = 'pmenu-txt';
                    sTxt.textContent = p.nome;
                
                    bt.appendChild(sIco);
                    bt.appendChild(sTxt);
                    if (aviso) { bt.appendChild(aviso); }
                
                    bt.title = p.nome;
                    bt.setAttribute('data-pmenu', '1');
                    bt.setAttribute('data-pmenu-busca', semAcento(p.nome).toLowerCase());
                  }
                
                  function botoes() {
                    var lst = lista();
                    if (!lst) { return []; }
                    return Array.prototype.slice.call(lst.querySelectorAll('.tab-btn'));
                  }
                
                  function atualizarContador() {
                    var lst = lista();
                    if (!lst) { return; }
                    var c = lst.querySelector('.pmenu-cont');
                    if (c) { c.textContent = String(botoes().length); }
                  }
                
                  function filtrar(termo) {
                    var lst = lista();
                    if (!lst) { return; }
                    var q = semAcento(String(termo || '')).toLowerCase().trim();
                    var visiveis = 0;
                    botoes().forEach(function (bt) {
                      var alvo = bt.getAttribute('data-pmenu-busca') || (bt.textContent || '').toLowerCase();
                      var ok = (!q || alvo.indexOf(q) !== -1);
                      if (ok) { bt.classList.remove('pmenu-oculto'); visiveis++; }
                      else { bt.classList.add('pmenu-oculto'); }
                    });
                    var vazio = lst.querySelector('.pmenu-vazio');
                    if (vazio) {
                      vazio.style.display = (visiveis === 0) ? 'block' : 'none';
                      vazio.textContent = 'Nenhuma aba com "' + String(termo || '').trim() + '"';
                    }
                  }
                
                  function limparBusca() {
                    var lst = lista();
                    if (!lst) { return; }
                    var inp = lst.querySelector('.pmenu-busca input');
                    if (inp) { inp.value = ''; }
                    filtrar('');
                  }
                
                  /* topo do cartao: titulo, contador e busca */
                  function montarTopo() {
                    var lst = lista();
                    if (!lst || lst.querySelector('.pmenu-cab')) { return; }
                
                    var primeiro = lst.querySelector('.tab-btn');
                
                    var cab = document.createElement('div');
                    cab.className = 'pmenu-cab';
                    var t1 = document.createElement('span');
                    t1.textContent = 'Navega\u00e7\u00e3o';
                    var t2 = document.createElement('span');
                    t2.className = 'pmenu-cont';
                    t2.textContent = '0';
                    cab.appendChild(t1);
                    cab.appendChild(t2);
                
                    var busca = document.createElement('div');
                    busca.className = 'pmenu-busca';
                    var lupa = document.createElement('span');
                    lupa.setAttribute('aria-hidden', 'true');
                    lupa.textContent = '\ud83d\udd0d';
                    var inp = document.createElement('input');
                    inp.type = 'text';
                    inp.autocomplete = 'off';
                    inp.spellcheck = false;
                    inp.placeholder = 'Buscar aba...';
                    inp.setAttribute('aria-label', 'Buscar aba');
                    busca.appendChild(lupa);
                    busca.appendChild(inp);
                
                    var vazio = document.createElement('div');
                    vazio.className = 'pmenu-vazio';
                    vazio.style.display = 'none';
                    vazio.textContent = 'Nenhuma aba encontrada';
                
                    if (primeiro) {
                      lst.insertBefore(cab, primeiro);
                      lst.insertBefore(busca, primeiro);
                      lst.appendChild(vazio);
                    } else {
                      lst.appendChild(cab);
                      lst.appendChild(busca);
                      lst.appendChild(vazio);
                    }
                
                    inp.addEventListener('input', function () { filtrar(inp.value); });
                    inp.addEventListener('keydown', function (ev) {
                      if (ev.key === 'Escape' || ev.keyCode === 27) {
                        ev.stopPropagation();
                        if (inp.value) { inp.value = ''; filtrar(''); }
                        else { fechar(); }
                      }
                      if (ev.key === 'Enter' || ev.keyCode === 13) {
                        ev.preventDefault();
                        var alvo = botoes().filter(function (b) {
                          return !b.classList.contains('pmenu-oculto');
                        })[0];
                        if (alvo) { alvo.click(); }
                      }
                    });
                  }
                
                  /* tira os estilos escritos direto na etiqueta (fundo escuro antigo) */
                  function limparInline(el, props) {
                    if (!el || !el.style) { return; }
                    for (var i = 0; i < props.length; i++) {
                      try { el.style.removeProperty(props[i]); } catch (e) { /* ignora */ }
                    }
                  }
                
                  var PROPS_SUM = ['background', 'background-color', 'color', 'padding',
                    'border', 'border-radius', 'box-shadow', 'width', 'font-weight',
                    'border-color', 'border-width', 'border-style'];
                
                  var PROPS_LST = ['background', 'background-color', 'padding', 'border',
                    'border-radius', 'box-shadow', 'min-width', 'width', 'gap', 'margin-top',
                    'display', 'flex-direction', 'position', 'top', 'left',
                    'border-color', 'border-width', 'border-style'];
                
                  function fechar() {
                    var d = det();
                    if (d) { d.removeAttribute('open'); }
                  }
                
                  function rolarAteAtiva() {
                    var lst = lista();
                    if (!lst) { return; }
                    var ativa = lst.querySelector('.tab-btn.active');
                    if (!ativa) { return; }
                    try {
                      var topo = ativa.offsetTop - lst.clientHeight / 2 + ativa.offsetHeight / 2;
                      lst.scrollTop = topo > 0 ? topo : 0;
                    } catch (e) { /* sem problema */ }
                  }
                
                  function aplicar() {
                    var d = det();
                    var lst = lista();
                    if (!d || !lst) { return false; }
                
                    d.classList.add(CLASSE);
                    limparInline(lst, PROPS_LST);
                
                    /* botao de abrir: icone + nome + setinha */
                    var sum = d.querySelector('summary');
                    limparInline(sum, PROPS_SUM);
                    if (sum && sum.getAttribute('data-pmenu') !== '1') {
                      var rot = (sum.textContent || '').replace(/[\u2630\u2261]/g, '').replace(/\s+/g, ' ').trim();
                      if (!rot) { rot = 'Menu de Abas'; }
                      while (sum.firstChild) { sum.removeChild(sum.firstChild); }
                      var i1 = document.createElement('span');
                      i1.className = 'pmenu-ico-btn';
                      i1.setAttribute('aria-hidden', 'true');
                      i1.textContent = '\u2630';
                      var l1 = document.createElement('span');
                      l1.className = 'pmenu-lbl';
                      l1.textContent = rot;
                      var s1 = document.createElement('span');
                      s1.className = 'pmenu-seta';
                      s1.setAttribute('aria-hidden', 'true');
                      s1.textContent = '\u276F';
                      sum.appendChild(i1);
                      sum.appendChild(l1);
                      sum.appendChild(s1);
                      sum.setAttribute('data-pmenu', '1');
                    }
                
                    montarTopo();
                    botoes().forEach(arrumarBotao);
                    atualizarContador();
                
                    /* abas criadas depois entram no mesmo estilo */
                    if (!observador && window.MutationObserver) {
                      observador = new MutationObserver(function () {
                        botoes().forEach(arrumarBotao);
                        atualizarContador();
                      });
                      observador.observe(lst, { childList: true });
                    }
                
                    /* clicar em uma aba fecha o menu */
                    if (lst.getAttribute('data-pmenu-clique') !== '1') {
                      lst.addEventListener('click', function (ev) {
                        var alvo = ev.target;
                        while (alvo && alvo !== lst && !alvo.classList.contains('tab-btn')) {
                          alvo = alvo.parentNode;
                        }
                        if (alvo && alvo !== lst) {
                          setTimeout(function () { fechar(); limparBusca(); }, 0);
                        }
                      });
                      lst.setAttribute('data-pmenu-clique', '1');
                    }
                
                    /* ao abrir: limpa a busca e rola ate a aba atual */
                    if (d.getAttribute('data-pmenu-toggle') !== '1') {
                      d.addEventListener('toggle', function () {
                        if (d.hasAttribute('open')) {
                          limparBusca();
                          botoes().forEach(arrumarBotao);
                          atualizarContador();
                          setTimeout(rolarAteAtiva, 0);
                        }
                      });
                      d.setAttribute('data-pmenu-toggle', '1');
                    }
                
                    return true;
                  }
                
                  /* ESC fecha o menu */
                  document.addEventListener('keydown', function (ev) {
                    if (ev.key === 'Escape' || ev.keyCode === 27) {
                      var d = det();
                      if (d && d.hasAttribute('open')) { fechar(); }
                    }
                  });
                
                  function iniciar() {
                    if (aplicar()) { return; }
                    var tentativas = 0;
                    var t = setInterval(function () {
                      tentativas++;
                      if (aplicar() || tentativas > 40) { clearInterval(t); }
                    }, 250);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', iniciar);
                  } else {
                    iniciar();
                  }
                
                  /* reforco depois que o painel termina de desenhar tudo */
                  setTimeout(function () { aplicar(); }, 1200);
                  setTimeout(function () { aplicar(); }, 3000);
                })();
            
