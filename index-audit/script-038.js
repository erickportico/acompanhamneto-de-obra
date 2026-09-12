
                /* PATCH 65: FECHAMENTO FORCADO PELO CONSOLE */
                (function () {
                  if (window.P65 && window.P65.__v65) return;
                  var P65 = window.P65 = window.P65 || {};
                  P65.__v65 = true;
                
                  var CHAVE_BOTAO = 'p65_botao_visivel';
                
                  /* ------------------------------------------------------------------ */
                  /* AJUDANTES                                                          */
                  /* ------------------------------------------------------------------ */
                  function texto(v) { return (v === null || v === undefined) ? '' : String(v); }
                
                  function estilo(el) {
                    try { return window.getComputedStyle(el); } catch (e) { return null; }
                  }
                
                  function escondidoEmSi(el) {
                    var s = estilo(el);
                    if (!s) return el.style.display === 'none';
                    if (s.display === 'none') return true;
                    if (s.visibility === 'hidden' || s.visibility === 'collapse') return true;
                    if (parseFloat(s.opacity || '1') === 0) return true;
                    return false;
                  }
                
                  /* Visivel de verdade: o proprio elemento E todos os pais precisam estar
                     aparecendo. Sem isso, caixas internas de modais fechados seriam
                     confundidas com janelas abertas. */
                  function visivel(el) {
                    var no = el;
                    var voltas = 0;
                    while (no && no.nodeType === 1 && voltas < 200) {
                      if (escondidoEmSi(no)) return false;
                      if (no === document.body || no === document.documentElement) break;
                      no = no.parentNode;
                      voltas++;
                    }
                    if (el.hasAttribute && el.hasAttribute('hidden')) return false;
                    return true;
                  }
                
                  function nomeDe(el) {
                    if (!el) return '?';
                    if (el.id) return '#' + el.id;
                    var c = texto(el.className).split(/\s+/)[0];
                    return (el.tagName || '?').toLowerCase() + (c ? '.' + c : '');
                  }
                
                  function grande(el) {
                    var r;
                    try { r = el.getBoundingClientRect(); } catch (e) { return false; }
                    var lw = window.innerWidth || 1200;
                    var lh = window.innerHeight || 800;
                    return r.width >= lw * 0.5 && r.height >= lh * 0.5;
                  }
                
                  function camada(el) {
                    var s = estilo(el);
                    if (!s) return 0;
                    var z = parseInt(s.zIndex, 10);
                    return isNaN(z) ? 0 : z;
                  }
                
                  function pareceModal(el) {
                    if (!el || el.nodeType !== 1) return false;
                    if (el === document.body || el === document.documentElement) return false;
                    if (el.getAttribute('data-p65manter')) return false;
                    if (texto(el.className).indexOf('p65-') >= 0) return false;
                    if (!visivel(el)) return false;
                    var marca = (texto(el.id) + ' ' + texto(el.className)).toLowerCase();
                    var porNome = /modal|overlay|popup|lightbox|backdrop|dialog|gaveta|drawer|preview|sobreposi/.test(marca);
                    var s = estilo(el);
                    var fixo = s && (s.position === 'fixed' || s.position === 'absolute');
                    if (porNome && fixo) return true;
                    if (porNome && camada(el) >= 100) return true;
                    if (porNome && grande(el)) return true;
                    if (fixo && grande(el) && camada(el) >= 100) return true;
                    return false;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* LOCALIZAR O QUE ESTA ABERTO                                        */
                  /* ------------------------------------------------------------------ */
                  function localizar() {
                    var achados = [];
                    var vistos = [];
                    var todos;
                    try { todos = document.body.getElementsByTagName('*'); } catch (e) { return achados; }
                    for (var i = 0; i < todos.length; i++) {
                      var el = todos[i];
                      if (vistos.indexOf(el) >= 0) continue;
                      if (!pareceModal(el)) continue;
                      /* ignora quem esta dentro de outro modal ja pego */
                      var dentro = false;
                      for (var j = 0; j < achados.length; j++) {
                        if (achados[j].contains && achados[j].contains(el)) { dentro = true; break; }
                      }
                      if (dentro) continue;
                      achados.push(el);
                      vistos.push(el);
                    }
                    return achados;
                  }
                  P65.localizar = localizar;
                
                  /* ------------------------------------------------------------------ */
                  /* FECHAR A FORCA                                                     */
                  /* ------------------------------------------------------------------ */
                  var SUFIXOS = ['-on', '-aberto', '-ativo', '-visivel', '-open', '-show', '-active'];
                
                  function limparClasses(el) {
                    var lista = texto(el.className).split(/\s+/);
                    for (var i = 0; i < lista.length; i++) {
                      var c = lista[i];
                      if (!c) continue;
                      var baixo = c.toLowerCase();
                      if (baixo === 'aberto' || baixo === 'ativo' || baixo === 'visivel' ||
                          baixo === 'show' || baixo === 'shown' || baixo === 'open' ||
                          baixo === 'active' || baixo === 'is-open' || baixo === 'is-active') {
                        el.classList.remove(c);
                        continue;
                      }
                      for (var k = 0; k < SUFIXOS.length; k++) {
                        if (baixo.length > SUFIXOS[k].length &&
                            baixo.slice(-SUFIXOS[k].length) === SUFIXOS[k]) {
                          el.classList.remove(c);
                          break;
                        }
                      }
                    }
                  }
                
                  function matar(el) {
                    try {
                      limparClasses(el);
                      el.classList.add('p65-morto');
                      el.style.setProperty('display', 'none', 'important');
                      el.setAttribute('aria-hidden', 'true');
                      if (el.open === true) { try { el.open = false; } catch (e) { /* ignora */ } }
                      if (typeof el.close === 'function') { try { el.close(); } catch (e2) { /* ignora */ } }
                    } catch (e3) { /* ignora */ }
                  }
                
                  function liberarPagina() {
                    var alvos = [document.body, document.documentElement];
                    for (var i = 0; i < alvos.length; i++) {
                      var el = alvos[i];
                      if (!el) continue;
                      try {
                        el.style.overflow = '';
                        el.style.position = '';
                        el.style.height = '';
                        el.classList.remove('modal-open');
                        el.classList.remove('modal-aberto');
                        el.classList.remove('no-scroll');
                        el.classList.remove('sem-scroll');
                        el.classList.remove('overflow-hidden');
                        el.classList.remove('travado');
                      } catch (e) { /* ignora */ }
                    }
                  }
                
                  function chamarFechadoresConhecidos() {
                    var nomes = ['fecharModais', 'fecharModal', 'fecharTodosModais',
                      'fecharPreviewEsquadria', 'closeModal', 'fecharPopup'];
                    for (var i = 0; i < nomes.length; i++) {
                      try {
                        if (typeof window[nomes[i]] === 'function') window[nomes[i]]();
                      } catch (e) { /* ignora */ }
                    }
                    try { if (window.P64 && typeof window.P64.fechar === 'function') window.P64.fechar(); } catch (e2) { /* ignora */ }
                    try { if (window.P63 && typeof window.P63.fecharPreview === 'function') window.P63.fecharPreview(); } catch (e3) { /* ignora */ }
                  }
                
                  var ultimos = [];
                
                  function forcar(silencioso) {
                    var lista = localizar();
                    chamarFechadoresConhecidos();
                    ultimos = [];
                    var nomes = [];
                    for (var i = 0; i < lista.length; i++) {
                      matar(lista[i]);
                      ultimos.push(lista[i]);
                      nomes.push(nomeDe(lista[i]));
                    }
                    liberarPagina();
                    if (!silencioso) {
                      if (nomes.length) {
                      } else {
                      }
                    }
                    return nomes;
                  }
                  P65.forcar = forcar;
                  P65.fechar = forcar;
                
                  function desfazer() {
                    var n = 0;
                    for (var i = 0; i < ultimos.length; i++) {
                      try {
                        ultimos[i].classList.remove('p65-morto');
                        ultimos[i].style.removeProperty('display');
                        ultimos[i].removeAttribute('aria-hidden');
                        n++;
                      } catch (e) { /* ignora */ }
                    }
                    ultimos = [];
                    return n;
                  }
                  P65.desfazer = desfazer;
                
                  function listar() {
                    var lista = localizar();
                    if (!lista.length) {
                      return [];
                    }
                    var nomes = [];
                    for (var i = 0; i < lista.length; i++) {
                      nomes.push(nomeDe(lista[i]) + '  (camada ' + camada(lista[i]) + ')');
                    }
                    for (var k = 0; k < nomes.length; k++) console.log('   ' + (k + 1) + ') ' + nomes[k]);
                    return lista;
                  }
                  P65.listar = listar;
                
                  /* ------------------------------------------------------------------ */
                  /* BOTAO FLUTUANTE (LIGADO PELO CONSOLE)                              */
                  /* ------------------------------------------------------------------ */
                  function criarBotao() {
                    var b = document.getElementById('p65Botao');
                    if (b) return b;
                    b = document.createElement('button');
                    b.id = 'p65Botao';
                    b.type = 'button';
                    b.className = 'p65-botao';
                    b.setAttribute('data-p65manter', '1');
                    b.setAttribute('title', 'Fecha a forca qualquer janela travada');
                    b.textContent = 'Fechar tudo';
                    b.addEventListener('click', function (ev) {
                      ev.preventDefault();
                      ev.stopPropagation();
                      forcar(false);
                    }, true);
                    try { document.body.appendChild(b); } catch (e) { /* ignora */ }
                    return b;
                  }
                
                  function guardar(chave, valor) {
                    try { window.localStorage.setItem(chave, valor); } catch (e) { /* ignora */ }
                  }
                
                  function lido(chave) {
                    try { return window.localStorage.getItem(chave); } catch (e) { return null; }
                  }
                
                  function botao(mostrar) {
                    var ligar = (mostrar === undefined) ? true : !!mostrar;
                    if (ligar) {
                      var b = criarBotao();
                      b.style.display = 'inline-flex';
                      guardar(CHAVE_BOTAO, '1');
                    } else {
                      var v = document.getElementById('p65Botao');
                      if (v && v.parentNode) v.parentNode.removeChild(v);
                      guardar(CHAVE_BOTAO, '0');
                    }
                    return ligar;
                  }
                  P65.botao = botao;
                
                  /* ------------------------------------------------------------------ */
                  /* ATALHO DE TECLADO E AJUDA                                          */
                  /* ------------------------------------------------------------------ */
                  function ligarAtalho() {
                    if (P65.__atalho) return;
                    P65.__atalho = true;
                    document.addEventListener('keydown', function (ev) {
                      if (!ev.ctrlKey || !ev.shiftKey) return;
                      var t = texto(ev.key).toLowerCase();
                      if (t !== 'x') return;
                      ev.preventDefault();
                      forcar(false);
                    }, true);
                  }
                
                  function ajuda() {
                    return 'ok';
                  }
                  P65.ajuda = ajuda;
                  P65.help = ajuda;
                
                  /* apelidos curtos, so se o nome estiver livre */
                  function apelido(nome, fn) {
                    if (typeof window[nome] === 'undefined') { window[nome] = fn; return true; }
                    return false;
                  }
                  apelido('FECHAR', function () { return forcar(false); });
                  apelido('FECHARTUDO', function () { return forcar(false); });
                  apelido('SOS', function () { return forcar(false); });
                
                  /* ------------------------------------------------------------------ */
                  /* PARTIDA                                                            */
                  /* ------------------------------------------------------------------ */
                  function partir() {
                    ligarAtalho();
                    if (lido(CHAVE_BOTAO) === '1') {
                      try { botao(true); } catch (e) { /* ignora */ }
                    }
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', partir);
                  } else {
                    partir();
                  }
                }());
            
