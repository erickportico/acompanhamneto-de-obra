
                /* PATCH 73: IMPRIMIR SO A ABA QUE ESTA NA TELA */
                (function () {
                  if (window.P73 && window.P73.__v73) return;
                  var P73 = window.P73 = window.P73 || {};
                  P73.__v73 = true;
                
                  /* ------------------------------------------------------------------ */
                  /* AJUDANTES                                                          */
                  /* ------------------------------------------------------------------ */
                  function porId(id) { return document.getElementById(id); }
                
                  function depois(fn, ms) {
                    setTimeout(function () { try { fn(); } catch (e) { /* ignora */ } }, ms);
                  }
                
                  /* nomes das abas do painel, na ordem dos botoes de cima */
                  var ABAS = [
                    'itens', 'liberacao', 'medicoes', 'graficos', 'recebimento',
                    'cronograma', 'pagamento', 'ctm', 'custo', 'obraflow'
                  ];
                
                  var LIMITE_CORES = 6000;   /* teto de elementos pintados, para nao travar */
                
                  var pintados = [];   /* [elemento, style que ele tinha antes] */
                  var mexidos = [];    /* [painel, style que ele tinha antes] */
                  var marcas = [];     /* [elemento, classe que a gente pos] */
                
                  P73.__imprimindo = false;
                
                  /* ------------------------------------------------------------------ */
                  /* 1) DESCOBRIR QUAL ABA ESTA NA TELA                                 */
                  /* ------------------------------------------------------------------ */
                  function todosOsPaineis() {
                    var achados = [];
                    var vistos = {};
                    for (var i = 0; i < ABAS.length; i++) {
                      var el = porId('tab-' + ABAS[i]);
                      if (el && !vistos[el.id]) { vistos[el.id] = 1; achados.push(el); }
                    }
                    /* pega tambem alguma aba criada depois, sem repetir */
                    var extras = document.querySelectorAll('[id^="tab-"]');
                    for (var k = 0; k < extras.length; k++) {
                      var e2 = extras[k];
                      if (!e2 || !e2.id || vistos[e2.id]) continue;
                      if (e2.tagName !== 'DIV' && e2.tagName !== 'SECTION') continue;
                      vistos[e2.id] = 1;
                      achados.push(e2);
                    }
                    return achados;
                  }
                
                  /* o painel aparece se ele nao esta escondido e nenhum pai o esconde */
                  function estaAparecendo(el) {
                    if (!el) return false;
                    var passo = el;
                    var voltas = 0;
                    while (passo && passo.nodeType === 1 && voltas < 60) {
                      var cs = null;
                      try { cs = window.getComputedStyle(passo); } catch (e) { cs = null; }
                      if (cs) {
                        if (cs.display === 'none') return false;
                        if (cs.visibility === 'hidden') return false;
                      } else if (passo.style && passo.style.display === 'none') {
                        return false;
                      }
                      if (passo === document.body) break;
                      passo = passo.parentNode;
                      voltas++;
                    }
                    return true;
                  }
                
                  /* primeiro tenta pelo botao marcado como ativo; se nao der, olha quem
                     realmente esta aparecendo na tela */
                  function abaVisivel() {
                    for (var i = 0; i < ABAS.length; i++) {
                      var btn = porId('btn-tab-' + ABAS[i]);
                      var painel = porId('tab-' + ABAS[i]);
                      if (!btn || !painel) continue;
                      if (btn.classList && btn.classList.contains('active') && estaAparecendo(painel)) {
                        return painel;
                      }
                    }
                    var lista = todosOsPaineis();
                    for (var k = 0; k < lista.length; k++) {
                      if (estaAparecendo(lista[k])) return lista[k];
                    }
                    /* ultimo recurso: botao ativo mesmo que a conta de visivel falhe */
                    for (var j = 0; j < ABAS.length; j++) {
                      var b2 = porId('btn-tab-' + ABAS[j]);
                      var p2 = porId('tab-' + ABAS[j]);
                      if (b2 && p2 && b2.classList && b2.classList.contains('active')) return p2;
                    }
                    return null;
                  }
                  P73.abaVisivel = abaVisivel;
                
                  /* ------------------------------------------------------------------ */
                  /* 2) MODOS DE IMPRESSAO QUE JA TEM DONO: O 73 NAO ENTRA              */
                  /* ------------------------------------------------------------------ */
                  var MODOS_COM_DONO = [
                    'p71-imprimindo',      /* Patch 71: imprimir so um quadro */
                    'print-resumo-mode',   /* CTM: resumo em lote */
                    'print-history-mode',  /* CTM: historico */
                    'print-specs-mode',    /* CTM: especificacoes */
                    'print-cad-mode'       /* CTM: fichas de CAD */
                  ];
                
                  function modoComDono() {
                    var b = document.body;
                    if (!b || !b.classList) return false;
                    for (var i = 0; i < MODOS_COM_DONO.length; i++) {
                      if (b.classList.contains(MODOS_COM_DONO[i])) return MODOS_COM_DONO[i];
                    }
                    return false;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 3) COR NO PAPEL (mesma ideia do Patch 63, mas so na aba da tela)   */
                  /* ------------------------------------------------------------------ */
                  function corVale(c) {
                    if (!c) return false;
                    if (c === 'transparent') return false;
                    if (c.indexOf('rgba(0, 0, 0, 0)') >= 0) return false;
                    return true;
                  }
                
                  function fixarCores(painel) {
                    if (!painel) return;
                    var lista = [painel];
                    var dentro = painel.querySelectorAll('*');
                    var total = Math.min(dentro.length, LIMITE_CORES);
                    for (var n = 0; n < total; n++) lista.push(dentro[n]);
                
                    for (var i = 0; i < lista.length; i++) {
                      var el = lista[i];
                      if (!el || !el.style) continue;
                      var nome = el.tagName;
                      if (nome === 'SCRIPT' || nome === 'STYLE' || nome === 'CANVAS') continue;
                      var cs;
                      try { cs = window.getComputedStyle(el); } catch (e) { continue; }
                      if (!cs || cs.display === 'none') continue;
                      var fundo = cs.backgroundColor;
                      var texto = cs.color;
                      var borda = cs.borderTopColor;
                      var temBorda = (corVale(borda) && cs.borderTopWidth !== '0px');
                      if (!corVale(fundo) && !corVale(texto) && !temBorda) continue;
                
                      /* guarda o estilo de linha exatamente como estava, para devolver */
                      pintados.push([el, el.getAttribute('style')]);
                      if (corVale(fundo)) el.style.setProperty('background-color', fundo, 'important');
                      if (corVale(texto)) el.style.setProperty('color', texto, 'important');
                      if (temBorda) el.style.setProperty('border-color', borda, 'important');
                    }
                  }
                
                  function soltarCores() {
                    for (var i = 0; i < pintados.length; i++) {
                      var el = pintados[i][0];
                      var antes = pintados[i][1];
                      if (!el || !el.style) continue;
                      if (antes === null) el.removeAttribute('style');
                      else el.setAttribute('style', antes);
                    }
                    pintados = [];
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 4) PREPARAR E DESFAZER A ARRUMACAO DO PAPEL                        */
                  /* ------------------------------------------------------------------ */
                  function porClasse(el, classe) {
                    if (!el || !el.classList) return;
                    if (el.classList.contains(classe)) return;   /* ja tinha: nao mexe */
                    el.classList.add(classe);
                    marcas.push([el, classe]);
                  }
                
                  function tirarMarcas() {
                    for (var i = marcas.length - 1; i >= 0; i--) {
                      var el = marcas[i][0];
                      var c = marcas[i][1];
                      if (!el || !el.classList) continue;
                      if (c.indexOf('@voltar:') === 0) { el.classList.add(c.replace('@voltar:', '')); continue; }
                      el.classList.remove(c);
                    }
                    marcas = [];
                  }
                
                  /* tira do caminho qualquer sobra do "imprimir tudo" do Patch 63 e
                     garante que os paineis das outras abas fiquem escondidos de verdade */
                  function guardarAsOutras(visivel) {
                    var lista = todosOsPaineis();
                    for (var i = 0; i < lista.length; i++) {
                      var el = lista[i];
                      if (el === visivel) continue;
                
                      /* classes que o 63 usa para abrir todas as abas no papel */
                      if (el.classList) {
                        if (el.classList.contains('p63-pane-print')) {
                          el.classList.remove('p63-pane-print');
                          marcas.push([el, '@voltar:p63-pane-print']);
                        }
                        if (el.classList.contains('p63-quebra')) {
                          el.classList.remove('p63-quebra');
                          marcas.push([el, '@voltar:p63-quebra']);
                        }
                      }
                
                      /* marca de "nao vai para o papel" (o desenho de impressao usa ela) */
                      porClasse(el, 'p73-fora');
                
                      /* se algum resto deixou o painel aberto por estilo de linha,
                         fecha agora e devolve o estilo original depois */
                      var cs = null;
                      try { cs = window.getComputedStyle(el); } catch (e) { cs = null; }
                      if (!cs || cs.display !== 'none') {
                        mexidos.push([el, el.getAttribute('style')]);
                        el.style.setProperty('display', 'none', 'important');
                      }
                    }
                  }
                
                  function devolverAsOutras() {
                    for (var i = mexidos.length - 1; i >= 0; i--) {
                      var el = mexidos[i][0];
                      var antes = mexidos[i][1];
                      if (!el || !el.style) continue;
                      if (antes === null) el.removeAttribute('style');
                      else el.setAttribute('style', antes);
                    }
                    mexidos = [];
                    /* as classes do 63 que a gente tirou voltam em tirarMarcas() */
                  }
                
                  function fecharOQueSujaOPapel() {
                    try {
                      if (window.P63 && typeof window.P63.fecharPreview === 'function') window.P63.fecharPreview();
                    } catch (e) { /* ignora */ }
                    try {
                      if (window.ORMENU && typeof window.ORMENU.fechar === 'function') window.ORMENU.fechar();
                      if (typeof window.p37FecharMenuAbas === 'function') window.p37FecharMenuAbas();
                      var menu = porId('meu-menu-abas');
                      if (menu) menu.removeAttribute('open');
                    } catch (e) { /* ignora */ }
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 5) O JEITO ANTIGO, PARA OS CASOS QUE NAO SAO DO 73                 */
                  /* ------------------------------------------------------------------ */
                  function chamarAnterior() {
                    var f = P73.__anterior;
                    if (typeof f === 'function' && !f.__p73) {
                      try { return f(); } catch (e) { /* ignora */ }
                    }
                    if (window.P63 && typeof window.P63.imprimirTudo === 'function') {
                      try { return window.P63.imprimirTudo(); } catch (e) { /* ignora */ }
                    }
                    if (window.P63 && typeof window.P63.__imprimirOriginal === 'function') {
                      try { return window.P63.__imprimirOriginal(); } catch (e) { /* ignora */ }
                    }
                    try { window.print(); } catch (e) { /* ignora */ }
                    return false;
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 6) IMPRIMIR SO A ABA QUE ESTA NA TELA                              */
                  /* ------------------------------------------------------------------ */
                  function imprimirSoAba() {
                    var dono = modoComDono();
                    if (dono) { P73.__ultimoDesvio = dono; return chamarAnterior(); }
                
                    var painel = abaVisivel();
                    if (!painel) { P73.__ultimoDesvio = 'aba-nao-encontrada'; return chamarAnterior(); }
                
                    P73.__ultimoDesvio = '';
                    P73.ultimaAba = painel.id || '';
                    P73.__imprimindo = true;
                
                    fecharOQueSujaOPapel();
                
                    /* o resumo do mes do Pagamento precisa estar em dia antes do papel */
                    try {
                      if (window.P63 && typeof window.P63.atualizarResumo === 'function') window.P63.atualizarResumo();
                    } catch (e) { /* ignora */ }
                
                    var body = document.body;
                    porClasse(body, 'print-active');
                    porClasse(body, 'p73-so-aba');
                    /* aproveita o acabamento de papel do Patch 63 (sem botao, valor no
                       lugar do campo, cor no papel) sem abrir as outras abas */
                    if (window.P63) porClasse(body, 'p63-print-all');
                
                    var lista = todosOsPaineis();
                    for (var i = 0; i < lista.length; i++) porClasse(lista[i], 'print-active');
                    porClasse(painel, 'p73-aba-visivel');
                
                    /* titulo de aba que o 63 tenha deixado para tras nao entra no papel */
                    var sobras = document.querySelectorAll('.p63-titulo-aba');
                    for (var s = 0; s < sobras.length; s++) {
                      if (!painel.contains(sobras[s])) porClasse(sobras[s], 'p73-fora');
                    }
                
                    guardarAsOutras(painel);
                    fixarCores(painel);
                
                    try {
                      window.print();
                    } finally {
                      soltarCores();
                      devolverAsOutras();
                      tirarMarcas();
                      P73.__imprimindo = false;
                    }
                    return true;
                  }
                  P73.imprimirSoAba = imprimirSoAba;
                
                  /* ------------------------------------------------------------------ */
                  /* 7) ENTRAR NA FRENTE DO BOTAO DE IMPRIMIR                           */
                  /* ------------------------------------------------------------------ */
                  function ligar() {
                    var atual = window.imprimirPagina;
                    if (typeof atual === 'function' && atual.__p73) return false;
                    if (typeof atual === 'function') P73.__anterior = atual;
                
                    var novo = function () { return imprimirSoAba(); };
                    novo.__p73 = true;
                    /* a marca do 63 evita que ele volte a embrulhar por cima da gente */
                    novo.__p63 = true;
                    window.imprimirPagina = novo;
                    try { imprimirPagina = novo; } catch (e) { /* ignora */ }
                    P73.__ligado = true;
                    return true;
                  }
                  P73.ligar = ligar;
                
                  /* Ctrl+P: nao passa pelo botao, entao a gente so marca a aba da tela
                     para o desenho de impressao saber quem aparece */
                  function ligarCtrlP() {
                    if (P73.__ctrlp) return;
                    P73.__ctrlp = true;
                
                    window.addEventListener('beforeprint', function () {
                      if (P73.__imprimindo) return;          /* veio do botao: ja esta tratado */
                      if (modoComDono()) return;             /* tem outro dono: nao mexe */
                      var painel = abaVisivel();
                      if (!painel) return;
                      porClasse(document.body, 'p73-so-aba');
                      porClasse(painel, 'p73-aba-visivel');
                      guardarAsOutras(painel);
                    });
                
                    window.addEventListener('afterprint', function () {
                      if (P73.__imprimindo) return;
                      devolverAsOutras();
                      tirarMarcas();
                    });
                  }
                
                  /* ------------------------------------------------------------------ */
                  /* 8) FERRAMENTAS DE CONFERENCIA (console F12)                        */
                  /* ------------------------------------------------------------------ */
                  P73.situacao = function () {
                    var painel = abaVisivel();
                    var info = {
                      ligado: !!P73.__ligado,
                      abaDaTela: painel ? painel.id : '(nao encontrada)',
                      temPatch63: !!window.P63,
                      temPatch71: !!window.P71,
                      modoComDono: modoComDono() || '(nenhum)',
                      ultimaAbaImpressa: P73.ultimaAba || '(nenhuma)'
                    };
                    try { console.log('[P73]', info); } catch (e) { /* ignora */ }
                    return info;
                  };
                
                  P73.desligar = function () {
                    P73.__desligado = true;
                    var f = P73.__anterior;
                    if (typeof f === 'function' && !f.__p73) {
                      window.imprimirPagina = f;
                      try { imprimirPagina = f; } catch (e) { /* ignora */ }
                    }
                    P73.__ligado = false;
                    try { console.log('[P73] desligado: o botao de imprimir voltou ao que era antes'); } catch (e) { /* ignora */ }
                    return true;
                  };
                
                  /* ------------------------------------------------------------------ */
                  /* PARTIDA                                                            */
                  /* ------------------------------------------------------------------ */
                  function partir() {
                    if (P73.__desligado) return;
                    try { ligar(); } catch (e) { /* ignora */ }
                    try { ligarCtrlP(); } catch (e) { /* ignora */ }
                  }
                
                  partir();
                
                  /* o Patch 63 se reapresenta depois de uns instantes; a gente confere
                     de novo nesses mesmos momentos para ficar sempre na frente */
                  var HORAS = [0, 900, 2600, 5000];
                  for (var h = 0; h < HORAS.length; h++) depois(partir, HORAS[h]);
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function () { depois(partir, 0); });
                  }
                  window.addEventListener('load', function () { depois(partir, 300); });
                })();
            
