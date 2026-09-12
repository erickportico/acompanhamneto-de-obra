
        /* ====== PATCH100_DESTRAVA_E_APAGAR_TUDO ======
           1) Destrava o painel quando voce sai da conferencia dos slides
              (nao precisa mais apertar F5).
           2) Deixa apagar QUALQUER coisa dos slides do Relatorio FPDO:
              textos, fotos, faixas, fundos, veus e blocos inteiros.
           Nada do que ja existe e apagado: este bloco so acrescenta.
           ====== */
        (function () {
          'use strict';
          if (window.__PS100) { return; }
          window.__PS100 = true;
        
          var K_ULT = 'p92_fpdo_ultimo_v1';   /* qual relatorio esta aberto (igual ao patch 92) */
          var LS = 'p100_apagados_v1';        /* onde ficam os itens apagados por este patch */
        
          var MODO = false;                   /* modo apagar ligado/desligado */
          var VERSAO = 1;                     /* muda a cada apagar/voltar: obriga a repassar os slides */
          var pilha = [];                     /* para o Voltar */
          var alvoQuente = null;              /* item destacado embaixo do dedo/mouse */
          var simulando = false;              /* estamos disparando um clique de proposito */
          var imprimindo = false;
          var relogios = {};                  /* marca desde quando uma camada esta na tela */
        
          /* janelas conhecidas do painel (para saber se alguma esta aberta) */
          var SEL_JANELAS = [
            '#p94Fundo', '#p96Fundo', '#p92Fundo', '#p84Fundo', '#p83Fundo',
            '.modal-bg', '#modalParcelasInstalacao', '#modalLancInstalacao', 'dialog[open]'
          ].join(',');
        
          /* travas de rolagem que varias telas colocam no corpo da pagina */
          var TRAVAS = [
            'p52-travado', 'p53-travado', 'ag-modal-aberto', 'of-dep-aberto', 'or-aberto',
            'modal-open', 'modal-aberto', 'no-scroll', 'sem-scroll', 'overflow-hidden', 'travado'
          ];
        
          /* camadas de espera que podem ficar penduradas */
          var ESPERAS = ['p92Espera', 'p94Espera', 'p92Impressao', 'p94Impr'];
        
          /* ---------------- coisas simples ---------------- */
          function n1(v) {
            var n = parseFloat(v);
            if (isNaN(n)) { return 0; }
            return Math.round(n * 10) / 10;
          }
        
          function esc(s) {
            return String(s == null ? '' : s)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          }
        
          function aviso(msg, tipo) {
            if (typeof window.mostrarToastPainel === 'function') {
              try { window.mostrarToastPainel(msg, tipo === 'erro' ? 'erro' : 'ok'); return; } catch (e) {}
            }
            var d = document.getElementById('p100Aviso');
            if (!d) {
              d = document.createElement('div');
              d.id = 'p100Aviso';
              document.body.appendChild(d);
            }
            d.textContent = String(msg || '');
            d.className = tipo === 'erro' ? 'p100-ruim' : 'p100-bom';
            d.style.display = 'block';
            if (d.__t) { clearTimeout(d.__t); }
            d.__t = setTimeout(function () { d.style.display = 'none'; }, 3600);
          }
        
          function visivel(el) {
            if (!el) { return false; }
            try {
              if (el.offsetWidth <= 0 && el.offsetHeight <= 0 && !el.getClientRects().length) { return false; }
              var st = window.getComputedStyle(el);
              if (!st) { return false; }
              return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity || 1) > 0.02;
            } catch (e) { return false; }
          }
        
          function algumaJanelaAberta() {
            var l, i;
            try { l = document.querySelectorAll(SEL_JANELAS); } catch (e) { return false; }
            for (i = 0; i < l.length; i++) { if (visivel(l[i])) { return true; } }
            return false;
          }
        
          function conferenciaAberta() {
            var f = document.getElementById('p94Fundo');
            return !!(f && f.style.display === 'block');
          }
        
          /* ---------------- onde guardar o que foi apagado ---------------- */
          function idAtual() {
            try { return localStorage.getItem(K_ULT) || 'sem_id'; } catch (e) { return 'sem_id'; }
          }
        
          function ler() {
            try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; }
          }
        
          function gravar(todo) {
            try { localStorage.setItem(LS, JSON.stringify(todo || {})); } catch (e) {}
          }
        
          function listaAtual() {
            var todo = ler();
            var id = idAtual();
            if (!todo[id] || Object.prototype.toString.call(todo[id]) !== '[object Array]') { todo[id] = []; }
            return { todo: todo, id: id, lista: todo[id] };
          }
        
          function conjunto() {
            var a = listaAtual();
            var m = {}, i;
            for (i = 0; i < a.lista.length; i++) { m[a.lista[i]] = true; }
            return m;
          }
        
          function guardaPassado(tipo) {
            var a = listaAtual();
            try { pilha.push({ tipo: tipo || 'nosso', dados: JSON.stringify(a.lista) }); } catch (e) { return; }
            if (pilha.length > 40) { pilha.shift(); }
          }
        
          /* ---------------- aparencia deste patch ---------------- */
          var ID_EST = 'p100Estilo';
        
          function estilo() {
            if (document.getElementById(ID_EST)) { return; }
            var css = [
              '#p100Aviso{position:fixed;left:16px;bottom:16px;z-index:2147483647;max-width:330px;',
              'padding:10px 14px;border-radius:10px;font:600 13px Arial,sans-serif;color:#fff;display:none;',
              'box-shadow:0 10px 26px rgba(0,0,0,.35)}',
              '#p100Aviso.p100-bom{background:#0f766e}',
              '#p100Aviso.p100-ruim{background:#b91c1c}',
              '#p100Liberar{position:fixed;left:16px;bottom:16px;z-index:2147483646;display:none;',
              'border:1px solid #f97316;background:#7c2d12;color:#fff;border-radius:10px;padding:9px 13px;',
              'font:700 13px Arial,sans-serif;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.35)}',
              '#p94Fundo .p100-bt{border:1px solid #475569;background:#1e293b;color:#e2e8f0;border-radius:8px;',
              'padding:7px 11px;font:600 12px Arial,sans-serif;cursor:pointer}',
              '#p94Fundo .p100-bt:hover{background:#334155}',
              '#p94Fundo .p100-bt.p100-on{background:#c2410c;border-color:#f97316;color:#fff}',
              '#p94Fundo .p100-linha{display:flex;gap:6px;flex-wrap:wrap;align-items:center;width:100%;',
              'padding-top:6px;border-top:1px solid #334155}',
              '#p94Fundo .p100-dica{color:#94a3b8;font:400 11px Arial,sans-serif}',
              '#p94Lupa.p100-modo .p94-folha,#p94Lupa.p100-modo .p94-folha *{cursor:crosshair !important}',
              '.p100-quente{outline:3px solid #f97316 !important;outline-offset:-2px}'
            ].join('');
            var t = document.createElement('style');
            t.id = ID_EST;
            t.type = 'text/css';
            t.appendChild(document.createTextNode(css));
            (document.head || document.documentElement).appendChild(t);
          }
        
          /* ---------------- desligar a edicao do patch 99 com jeitinho ---------------- */
          function botaoEditar99() {
            try { return document.querySelector('#p94Fundo [data-p99="editar"]'); } catch (e) { return null; }
          }
        
          function edicao99Ligada() {
            var b = botaoEditar99();
            return !!(b && b.classList && b.classList.contains('p99-on'));
          }
        
          function desligarEdicao99() {
            var b = botaoEditar99();
            if (!b || !edicao99Ligada()) { return false; }
            simulando = true;
            try { b.click(); } catch (e) {}
            simulando = false;
            return true;
          }
        
          /* ---------------- limpar sobras da edicao ---------------- */
          function limparSobrasEdicao() {
            var i, l;
            try {
              l = document.querySelectorAll('.p99-mk');
              for (i = 0; i < l.length; i++) { if (l[i].parentNode) { l[i].parentNode.removeChild(l[i]); } }
            } catch (e) {}
            try {
              l = document.querySelectorAll('.p99-sel,.p100-quente');
              for (i = 0; i < l.length; i++) {
                l[i].classList.remove('p99-sel');
                l[i].classList.remove('p100-quente');
              }
            } catch (e2) {}
            try {
              l = document.querySelectorAll('[contenteditable="true"]');
              for (i = 0; i < l.length; i++) {
                if (l[i].closest && (l[i].closest('.p94-folha') || l[i].closest('#p94Fundo'))) {
                  l[i].removeAttribute('contenteditable');
                  try { l[i].blur(); } catch (e3) {}
                }
              }
            } catch (e4) {}
            try {
              l = document.querySelectorAll('.p99-edit');
              for (i = 0; i < l.length; i++) { l[i].classList.remove('p99-edit'); }
            } catch (e5) {}
            try {
              var s = window.getSelection();
              if (s && s.removeAllRanges) { s.removeAllRanges(); }
            } catch (e6) {}
          }
        
          /* ---------------- soltar a rolagem e as camadas penduradas ---------------- */
          function soltarCorpo() {
            var mexeu = false;
            var b = document.body;
            var h = document.documentElement;
            if (!b) { return false; }
            var i;
            for (i = 0; i < TRAVAS.length; i++) {
              if (b.classList.contains(TRAVAS[i])) { b.classList.remove(TRAVAS[i]); mexeu = true; }
              if (h.classList.contains(TRAVAS[i])) { h.classList.remove(TRAVAS[i]); mexeu = true; }
            }
            if (b.classList.contains('p94-imp')) { b.classList.remove('p94-imp'); mexeu = true; }
            try {
              if (window.getComputedStyle(b).overflow === 'hidden') { b.style.overflow = 'visible'; b.style.overflowY = 'auto'; mexeu = true; }
              if (window.getComputedStyle(h).overflow === 'hidden') { h.style.overflow = 'visible'; h.style.overflowY = 'auto'; mexeu = true; }
              if (window.getComputedStyle(b).position === 'fixed') { b.style.position = 'static'; mexeu = true; }
            } catch (e) {}
            if (b.style.pointerEvents === 'none') { b.style.pointerEvents = ''; mexeu = true; }
            return mexeu;
          }
        
          function guardarEsperas() {
            var mexeu = false, i, el;
            for (i = 0; i < ESPERAS.length; i++) {
              el = document.getElementById(ESPERAS[i]);
              if (!el) { continue; }
              if (el.id === 'p94Impr' || el.id === 'p92Impressao') {
                if (el.innerHTML !== '') { el.innerHTML = ''; mexeu = true; }
                continue;
              }
              if (visivel(el)) { el.style.display = 'none'; mexeu = true; }
            }
            return mexeu;
          }
        
          /* ---------------- achar camadas invisiveis que roubam o clique ---------------- */
          function ehJanelaConhecida(el) {
            try { return !!(el.closest && el.closest(SEL_JANELAS)); } catch (e) { return false; }
          }
        
          function camadaGrande(el) {
            var no = el, st, r;
            var guarda = 0;
            while (no && no.nodeType === 1 && guarda < 12) {
              guarda++;
              try {
                st = window.getComputedStyle(no);
                r = no.getBoundingClientRect();
              } catch (e) { return null; }
              if (st && (st.position === 'fixed' || st.position === 'absolute') &&
                  r.width >= window.innerWidth * 0.7 && r.height >= window.innerHeight * 0.7) {
                return no;
              }
              no = no.parentElement;
            }
            return null;
          }
        
          function pareceVazia(el) {
            if (!el) { return false; }
            if (el === document.body || el === document.documentElement) { return false; }
            var txt = String(el.textContent || '').replace(/\s+/g, '');
            if (txt.length > 2) { return false; }
            try {
              if (el.querySelector('button,a,input,select,textarea,img,canvas,svg,table')) { return false; }
            } catch (e) {}
            return true;
          }
        
          function limparBloqueios() {
            var pontos = [[0.5, 0.5], [0.25, 0.3], [0.75, 0.3], [0.25, 0.75], [0.75, 0.75]];
            var mexeu = false, i, x, y, alvo, capa;
            for (i = 0; i < pontos.length; i++) {
              x = Math.round(window.innerWidth * pontos[i][0]);
              y = Math.round(window.innerHeight * pontos[i][1]);
              try { alvo = document.elementFromPoint(x, y); } catch (e) { alvo = null; }
              if (!alvo || alvo === document.body || alvo === document.documentElement) { continue; }
              if (ehJanelaConhecida(alvo)) { continue; }
              capa = camadaGrande(alvo);
              if (!capa || ehJanelaConhecida(capa)) { continue; }
              if (capa.id === 'p100Liberar' || capa.id === 'p100Aviso') { continue; }
              if (!pareceVazia(capa)) { continue; }
              capa.style.display = 'none';
              capa.style.pointerEvents = 'none';
              mexeu = true;
            }
            return mexeu;
          }
        
          /* ---------------- destravar de verdade ---------------- */
          function destravar(forte) {
            limparSobrasEdicao();
            var mexeu = false;
            if (!algumaJanelaAberta()) {
              if (guardarEsperas()) { mexeu = true; }
              if (soltarCorpo()) { mexeu = true; }
              if (forte && limparBloqueios()) { mexeu = true; }
            }
            esconderBotaoLiberar();
            return mexeu;
          }
        
          /* ---------------- botao de emergencia "Liberar painel" ---------------- */
          function botaoLiberar() {
            var b = document.getElementById('p100Liberar');
            if (!b) {
              b = document.createElement('button');
              b.id = 'p100Liberar';
              b.type = 'button';
              b.textContent = 'Liberar painel';
              b.title = 'Solta a tela se ela ficou presa depois de fechar os slides';
              b.setAttribute('data-html2canvas-ignore', 'true');
              b.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                destravar(true);
                aviso('Painel liberado.');
              }, true);
              document.body.appendChild(b);
            }
            return b;
          }
        
          function mostrarBotaoLiberar() {
            var b = botaoLiberar();
            if (b.style.display !== 'block') { b.style.display = 'block'; }
          }
        
          function esconderBotaoLiberar() {
            var b = document.getElementById('p100Liberar');
            if (b && b.style.display !== 'none') { b.style.display = 'none'; }
          }
        
          function pareceTravado() {
            if (conferenciaAberta() || algumaJanelaAberta()) { return false; }
            var b = document.body, h = document.documentElement, i;
            if (!b) { return false; }
            for (i = 0; i < TRAVAS.length; i++) {
              if (b.classList.contains(TRAVAS[i]) || h.classList.contains(TRAVAS[i])) { return true; }
            }
            if (b.classList.contains('p94-imp')) { return true; }
            try {
              if (window.getComputedStyle(b).overflow === 'hidden') { return true; }
              if (window.getComputedStyle(h).overflow === 'hidden') { return true; }
              if (window.getComputedStyle(b).pointerEvents === 'none') { return true; }
            } catch (e) {}
            for (i = 0; i < ESPERAS.length; i++) {
              var el = document.getElementById(ESPERAS[i]);
              if (el && el.id !== 'p94Impr' && el.id !== 'p92Impressao' && visivel(el)) { return true; }
            }
            return false;
          }
        
          /* ---------------- assinatura de cada pedaco do slide ---------------- */
          function folhaDe(el) {
            try { return el && el.closest ? el.closest('.p94-folha') : null; } catch (e) { return null; }
          }
        
          function numeroDaFolha(folha) {
            var p = folha && folha.parentNode;
            if (!p) { return 0; }
            var i, n = 0, f = p.children;
            for (i = 0; i < f.length; i++) {
              if (f[i] === folha) { return n; }
              if (f[i].classList && f[i].classList.contains('p94-folha')) { n++; }
            }
            return n;
          }
        
          function caixaPct(el, folha) {
            var r, fr;
            try {
              r = el.getBoundingClientRect();
              fr = folha.getBoundingClientRect();
            } catch (e) { return null; }
            var lg = fr.width, al = fr.height;
            if (!lg || !al || lg < 40 || al < 40) { return null; }
            return {
              l: Math.round(((r.left - fr.left) / lg) * 100),
              t: Math.round(((r.top - fr.top) / al) * 100),
              w: Math.round((r.width / lg) * 100),
              h: Math.round((r.height / al) * 100)
            };
          }
        
          function classesDe(el) {
            var c = String(el.className || '');
            if (!c) { return ''; }
            var lst = c.split(/\s+/).filter(function (x) {
              if (!x) { return false; }
              if (x.indexOf('p99-') === 0 || x.indexOf('p100-') === 0) { return false; }
              return true;
            });
            lst.sort();
            return lst.join('.');
          }
        
          function migalha(el) {
            var t = String(el.textContent || '').replace(/\s+/g, ' ').replace(/^ | $/g, '');
            if (t.length > 34) { t = t.slice(0, 34); }
            var n = 0, i;
            for (i = 0; i < t.length; i++) { n = ((n * 31) + t.charCodeAt(i)) % 99999989; }
            return t.length + '_' + n;
          }
        
          function assinatura(el, folha) {
            var g = caixaPct(el, folha);
            if (!g) { return null; }
            return numeroDaFolha(folha) + '|' + String(el.tagName || '').toLowerCase() + '|' +
              classesDe(el) + '|' + g.l + ',' + g.t + ',' + g.w + ',' + g.h + '|' + migalha(el);
          }
        
          function ignorar(el) {
            if (!el || el.nodeType !== 1) { return true; }
            if (el.classList && (el.classList.contains('p99-mk') || el.classList.contains('p99-h'))) { return true; }
            if (el.hasAttribute && el.hasAttribute('data-html2canvas-ignore')) { return true; }
            var t = String(el.tagName || '').toLowerCase();
            if (t === 'style' || t === 'script' || t === 'br') { return true; }
            return false;
          }
        
          /* ---------------- esconder / devolver os pedacos apagados ---------------- */
          function selo(folha) {
            var a = listaAtual();
            return String(folha.getAttribute('data-p99') || '') + '#' + VERSAO + '#' + a.id + '#' + a.lista.length;
          }
        
          function devolverFolha(folha) {
            var l, i;
            try { l = folha.querySelectorAll('[data-p100h]'); } catch (e) { return; }
            for (i = 0; i < l.length; i++) {
              l[i].removeAttribute('data-p100h');
              l[i].style.display = l[i].__p100disp || '';
              l[i].__p100disp = null;
            }
          }
        
          function aplicarFolha(folha, mapa) {
            devolverFolha(folha);
            var todos;
            try { todos = folha.querySelectorAll('*'); } catch (e) { return; }
            var i, el, sig, achados = [];
            for (i = 0; i < todos.length; i++) {
              el = todos[i];
              if (ignorar(el)) { continue; }
              sig = assinatura(el, folha);
              if (sig && mapa[sig]) { achados.push(el); }
            }
            for (i = 0; i < achados.length; i++) {
              el = achados[i];
              el.__p100disp = el.style.display || '';
              el.setAttribute('data-p100h', '1');
              el.style.display = 'none';
            }
          }
        
          function aplicar(forcar) {
            var folhas;
            try { folhas = document.querySelectorAll('.p94-folha'); } catch (e) { return; }
            if (!folhas.length) { return; }
            var mapa = conjunto();
            var i, f, s;
            for (i = 0; i < folhas.length; i++) {
              f = folhas[i];
              s = selo(f);
              if (!forcar && f.getAttribute('data-p100v') === s) { continue; }
              try { aplicarFolha(f, mapa); } catch (e2) {}
              f.setAttribute('data-p100v', s);
            }
          }
        
          /* ---------------- escolher o que esta embaixo do dedo ---------------- */
          function parecidos(a, b) {
            try {
              var r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
              return Math.abs(r1.width - r2.width) <= 3 && Math.abs(r1.height - r2.height) <= 3 &&
                     Math.abs(r1.left - r2.left) <= 3 && Math.abs(r1.top - r2.top) <= 3;
            } catch (e) { return false; }
          }
        
          function escolher(alvo) {
            var folha = folhaDe(alvo);
            if (!folha || alvo === folha) { return null; }
            var el = alvo, guarda = 0;
            while (el && el.parentNode && el.parentNode !== folha && guarda < 8) {
              guarda++;
              if (!parecidos(el, el.parentNode)) { break; }
              el = el.parentNode;
            }
            if (el === folha) { return null; }
            if (ignorar(el)) { return null; }
            return el;
          }
        
          function esquentar(el) {
            if (alvoQuente === el) { return; }
            if (alvoQuente && alvoQuente.classList) { alvoQuente.classList.remove('p100-quente'); }
            alvoQuente = el || null;
            if (alvoQuente && alvoQuente.classList) { alvoQuente.classList.add('p100-quente'); }
          }
        
          /* ---------------- apagar, voltar, restaurar ---------------- */
          function apagar(el) {
            var folha = folhaDe(el);
            if (!folha) { aviso('Toque em cima do que voce quer apagar.', 'erro'); return; }
            var sig = assinatura(el, folha);
            if (!sig) { aviso('Nao consegui reconhecer este item. Tente de novo.', 'erro'); return; }
            var a = listaAtual();
            if (a.lista.indexOf(sig) >= 0) { aviso('Este item ja estava apagado.'); return; }
            guardaPassado('apagar');
            a.lista.push(sig);
            a.todo[a.id] = a.lista;
            gravar(a.todo);
            esquentar(null);
            VERSAO++;
            aplicar(true);
            aviso('Apagado. Se errou, clique em "Voltar".');
          }
        
          function voltar() {
            if (!pilha.length) { aviso('Nao tem mais nada para voltar.', 'erro'); return; }
            var p = pilha.pop();
            var a = listaAtual();
            try { a.todo[a.id] = JSON.parse(p.dados); } catch (e) { return; }
            gravar(a.todo);
            esquentar(null);
            VERSAO++;
            aplicar(true);
            aviso('Voltei o ultimo item que voce apagou.');
          }
        
          function restaurar() {
            var a = listaAtual();
            if (!a.lista.length) { aviso('Nao ha nada apagado por aqui.'); return; }
            if (!window.confirm('Trazer de volta TUDO o que voce apagou neste relatorio?')) { return; }
            guardaPassado('restaurar');
            a.todo[a.id] = [];
            gravar(a.todo);
            esquentar(null);
            VERSAO++;
            aplicar(true);
            aviso('Tudo voltou para o lugar.');
          }
        
          function ligarModo(v) {
            MODO = !!v;
            if (MODO) { desligarEdicao99(); }
            var cx = document.getElementById('p94Lupa');
            if (cx) {
              if (MODO) { cx.classList.add('p100-modo'); } else { cx.classList.remove('p100-modo'); }
            }
            if (!MODO) { esquentar(null); }
            pintarBarra();
            aviso(MODO
              ? 'Modo apagar ligado: toque em qualquer coisa do slide para tirar. Toque de novo no que sobrou para tirar o bloco maior.'
              : 'Modo apagar desligado.');
          }
        
          /* ---------------- barra de botoes na conferencia ---------------- */
          function bt(acao, rot, tit) {
            return '<button class="p100-bt" type="button" data-p100="' + acao + '" title="' + esc(tit || rot) + '">' + esc(rot) + '</button>';
          }
        
          function colocarBarra() {
            if (!conferenciaAberta()) { return; }
            var f = document.getElementById('p94Fundo');
            var b = f ? f.querySelector('.p94-barra') : null;
            if (!b || b.querySelector('[data-p100]')) { return; }
            var d = document.createElement('div');
            d.className = 'p100-linha';
            d.setAttribute('data-html2canvas-ignore', 'true');
            d.innerHTML =
              bt('modo', 'Apagar qualquer coisa', 'Liga o modo apagar: toque no que quer tirar do slide') +
              bt('voltar', 'Voltar', 'Traz de volta o ultimo item apagado') +
              bt('restaurar', 'Restaurar tudo', 'Traz de volta tudo o que voce apagou neste relatorio') +
              bt('liberar', 'Liberar painel', 'Solta a tela se ela ficar presa') +
              '<span class="p100-dica">Ligue o modo apagar e toque no item (texto, foto, faixa, fundo ou bloco). Fica guardado neste navegador.</span>';
            b.appendChild(d);
            pintarBarra();
          }
        
          function pintarBarra() {
            var b;
            try { b = document.querySelector('#p94Fundo [data-p100="modo"]'); } catch (e) { return; }
            if (!b) { return; }
            if (MODO) { b.classList.add('p100-on'); b.textContent = 'Modo apagar ligado'; }
            else { b.classList.remove('p100-on'); b.textContent = 'Apagar qualquer coisa'; }
          }
        
          function acao(a) {
            if (a === 'modo') { ligarModo(!MODO); return; }
            if (a === 'voltar') { voltar(); return; }
            if (a === 'restaurar') { restaurar(); return; }
            if (a === 'liberar') { destravar(true); aviso('Painel liberado.'); return; }
          }
        
          /* ---------------- cliques e toques ---------------- */
          function ligarEventos() {
            document.addEventListener('click', function (ev) {
              var t = ev.target;
              if (!t || !t.closest) { return; }
              var b = t.closest('[data-p100]');
              if (b) {
                ev.preventDefault();
                ev.stopPropagation();
                acao(b.getAttribute('data-p100'));
                return;
              }
              if (t.closest('[data-p94]') || t.closest('[data-p99]')) {
                if (MODO && t.closest('[data-p99]')) { ligarModo(false); }
                return;
              }
              if (!MODO || simulando) { return; }
              var folha = folhaDe(t);
              if (!folha) { return; }
              ev.preventDefault();
              ev.stopPropagation();
              var el = escolher(t);
              if (!el) { aviso('Toque em cima do item que quer apagar.', 'erro'); return; }
              apagar(el);
            }, true);
        
            document.addEventListener('pointerdown', function (ev) {
              if (!MODO || simulando) { return; }
              var t = ev.target;
              if (!t || !t.closest) { return; }
              if (t.closest('[data-p100]') || t.closest('[data-p94]') || t.closest('[data-p99]')) { return; }
              if (!folhaDe(t)) { return; }
              ev.preventDefault();
              ev.stopPropagation();
            }, true);
        
            document.addEventListener('pointermove', function (ev) {
              if (!MODO) { return; }
              var t = ev.target;
              if (!t || !t.closest) { return; }
              if (!folhaDe(t)) { esquentar(null); return; }
              esquentar(escolher(t));
            }, true);
        
            document.addEventListener('keydown', function (ev) {
              var tecla = ev.key || '';
              if (!MODO) { return; }
              var ed = document.querySelector('[contenteditable="true"]');
              if (ed) { return; }
              if (tecla === 'Escape' || ev.keyCode === 27) {
                ev.preventDefault();
                ev.stopPropagation();
                ligarModo(false);
                return;
              }
              if ((ev.ctrlKey || ev.metaKey) && (tecla === 'z' || tecla === 'Z')) {
                ev.preventDefault();
                ev.stopPropagation();
                voltar();
                return;
              }
              if ((tecla === 'Delete' || tecla === 'Backspace' || ev.keyCode === 46) && alvoQuente) {
                ev.preventDefault();
                ev.stopPropagation();
                apagar(alvoQuente);
              }
            }, true);
        
            window.addEventListener('beforeprint', function () { imprimindo = true; });
            window.addEventListener('afterprint', function () {
              imprimindo = false;
              setTimeout(function () { destravar(false); }, 400);
            });
          }
        
          /* ---------------- ficar de olho na tela ---------------- */
          function fechouConferencia() {
            if (MODO) { ligarModo(false); }
            limparSobrasEdicao();
            desligarEdicao99();
            destravar(true);
            /* algumas telas soltam a trava um pouco depois: tenta de novo */
            setTimeout(function () { destravar(true); }, 120);
            setTimeout(function () { destravar(true); }, 500);
            setTimeout(function () { destravar(true); }, 1200);
          }
        
          function vigiar() {
            var estavaAberta = conferenciaAberta();
            var pendente = false;
        
            function passar() {
              pendente = false;
              var aberta = conferenciaAberta();
              if (aberta) {
                try { colocarBarra(); } catch (e) {}
                try { aplicar(false); } catch (e1) {}
              } else {
                try { aplicar(false); } catch (e2) {}
              }
              if (estavaAberta && !aberta) {
                estavaAberta = false;
                fechouConferencia();
                return;
              }
              estavaAberta = aberta;
              if (!aberta && !imprimindo && pareceTravado()) {
                destravar(false);
                if (pareceTravado()) { mostrarBotaoLiberar(); } else { esconderBotaoLiberar(); }
              } else {
                esconderBotaoLiberar();
              }
            }
        
            function pedir() {
              if (pendente) { return; }
              pendente = true;
              setTimeout(passar, 70);
            }
        
            try {
              var mo = new MutationObserver(function () { pedir(); });
              mo.observe(document.body, { childList: true, subtree: true, attributes: true,
                attributeFilter: ['style', 'class'] });
            } catch (e3) {}
        
            setInterval(passar, 900);
            pedir();
          }
        
          /* ---------------- comecar ---------------- */
          function iniciar() {
            if (!document.body) { setTimeout(iniciar, 60); return; }
            estilo();
            ligarEventos();
            vigiar();
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        
          /* deixa uma saida manual, caso voce queira liberar pelo console */
          try {
            window.p100Liberar = function () { destravar(true); return true; };
          } catch (e) {}
        
        })();
    
