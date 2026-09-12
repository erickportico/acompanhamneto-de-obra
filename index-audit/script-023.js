
                /* === PATCH 49: barrinha de abas com icones alinhados (funcionamento) === */
                (function () {
                  "use strict";
                
                  /* Deixa qualquer botao de aba no formato: [icone] [nome] (+ aviso),
                     inclusive os que aparecerem depois (ex.: Agenda de Obras).
                     Assim todos os icones ficam na mesma coluna. */
                
                  var observador = null;
                
                  function menu() { return document.getElementById('meu-menu-abas'); }
                
                  function lista() {
                    var m = menu();
                    return m ? m.querySelector('.tabs') : null;
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
                
                  function arrumar(bt) {
                    if (!bt) { return; }
                
                    var ico = bt.querySelector('.pmenu-ico');
                    var txt = bt.querySelector('.pmenu-txt');
                    var aviso = bt.querySelector('.ag-badge');
                
                    /* ja esta no formato certo: so garante a ordem e limpa a sobra */
                    if (ico && txt) {
                      ico.textContent = (ico.textContent || '').replace(/[\s\u00a0]+/g, '');
                      txt.textContent = (txt.textContent || '').replace(/\s+/g, ' ').trim();
                      if (bt.firstChild !== ico) { bt.insertBefore(ico, bt.firstChild); }
                      if (ico.nextSibling !== txt) { bt.insertBefore(txt, ico.nextSibling); }
                      if (aviso && bt.lastChild !== aviso) { bt.appendChild(aviso); }
                      if (!bt.title) { bt.title = txt.textContent; }
                      bt.setAttribute('data-p49', '1');
                      return;
                    }
                
                    /* botao ainda "cru" (texto solto): monta icone + nome */
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
                    bt.setAttribute('data-p49', '1');
                  }
                
                  function arrumarTodos() {
                    var lst = lista();
                    if (!lst) { return false; }
                    var itens = lst.querySelectorAll('.tab-btn');
                    var i;
                    for (i = 0; i < itens.length; i++) { arrumar(itens[i]); }
                    return itens.length > 0;
                  }
                
                  function vigiar() {
                    var lst = lista();
                    if (!lst || observador || !window.MutationObserver) { return; }
                    observador = new MutationObserver(function () { arrumarTodos(); });
                    observador.observe(lst, { childList: true });
                  }
                
                  function iniciar() {
                    var ok = arrumarTodos();
                    vigiar();
                    if (ok) { return; }
                    var n = 0;
                    var t = setInterval(function () {
                      n++;
                      if (arrumarTodos() || n > 60) { vigiar(); clearInterval(t); }
                    }, 250);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', iniciar);
                  } else {
                    iniciar();
                  }
                
                  /* reforcos depois que o painel termina de montar tudo */
                  setTimeout(arrumarTodos, 1800);
                  setTimeout(arrumarTodos, 4000);
                })();
            
