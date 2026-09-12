
        /* PATCH 103 - Permissoes por usuario e por aba.
           O administrador escolhe quais abas cada pessoa pode ver.
           Quem nao tem a aba liberada nem enxerga o botao dela.
           Nao reescreve nada do painel: apenas acrescenta. */
        (function () {
          'use strict';
        
          if (window.__p103) { return; }
          window.__p103 = true;
        
          var K_USERS = window.PainelNucleo.K_USERS;   /* PATCH108 */
          var K_SESS  = window.PainelNucleo.K_SESS;    /* PATCH108 */
          var K_PERM  = 'painel_seg_permissoes_v1';
        
          var ABAS = [
            { id: 'itens',      nome: 'Painel Geral de Producao' },
            { id: 'liberacao',  nome: 'Avanco de Liberacao' },
            { id: 'medicoes',   nome: 'Boletim de Medicao (Financeiro)' },
            { id: 'graficos',   nome: 'Graficos e Relatorios' },
            { id: 'recebimento',nome: 'Recebimento de Materiais' },
            { id: 'cronograma', nome: 'Gestao de Obra e Equipe' },
            { id: 'pagamento',  nome: 'Pagamento de Producao' },
            { id: 'ctm',        nome: 'Contramarco (CTM)' },
            { id: 'custo',      nome: 'Centro de Custos' },
            { id: 'fpdo',       nome: 'Relatorio FPDO' }
          ];
        
          /* ================================================================ *
           * utilidades
           * ================================================================ */
          function esc(v) {
            return String(v === undefined || v === null ? '' : v)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
          }
        
          function ler(k, def) {
            try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; }
          }
        
          function gravar(k, v) {
            try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
          }
        
          function aviso(msg, tipo) {
            try {
              var d = document.createElement('div');
              d.className = 'p87-aviso' + (tipo === 'err' ? ' err' : '');
              d.setAttribute('data-ps79', '1');
              d.textContent = msg;
              document.body.appendChild(d);
              setTimeout(function () { if (d.parentNode) { d.parentNode.removeChild(d); } }, 3600);
            } catch (e) { /* ignora */ }
          }
        
          /* PATCH108: leitura da sessao vem do nucleo unico. */
          function sessao() { return window.PainelNucleo.sessao(); }
        
          function chave(usuario) {
            return String(usuario || '').trim().toLowerCase();
          }
        
          function ehAdminPerfil(p) {
            return String(p || '').toLowerCase() === 'admin';
          }
        
          /* PATCH108: nome do tipo de acesso vem do nucleo unico. */
          function nomePerfil(p) { return window.PainelNucleo.nomePerfil(p); }
        
          function rotuloAba(id) {
            var b = document.getElementById('btn-tab-' + id);
            var t = b ? String(b.textContent || '').trim() : '';
            if (t) { return t; }
            var i;
            for (i = 0; i < ABAS.length; i++) { if (ABAS[i].id === id) { return ABAS[i].nome; } }
            return id;
          }
        
          /* ================================================================ *
           * lista de pessoas e mapa de permissoes
           * ================================================================ */
          function pessoas() {
            var l = ler(K_USERS, []);
            if (!l || !l.length) { l = []; }
            var saida = [];
            var vistos = {};
            var i;
            for (i = 0; i < l.length; i++) {
              var u = l[i] || {};
              var k = chave(u.usuario);
              if (!k || vistos[k]) { continue; }
              vistos[k] = true;
              saida.push({ usuario: u.usuario, nome: u.nome || u.usuario, perfil: u.perfil || 'visitante' });
            }
            /* [v9] lista Supabase com fallback email->usuario */
            var rem = window.__p87ListaSupabase;
            if (rem && rem.length) {
              for (i = 0; i < rem.length; i++) {
                var r = rem[i] || {};
                var rUsu = r.usuario || r.email || '';
                var kr = chave(rUsu);
                if (!kr || vistos[kr]) { continue; }
                vistos[kr] = true;
                saida.push({ usuario: rUsu, nome: r.nome || rUsu, perfil: r.perfil || 'visitante' });
              }
            }
            var s = sessao();
            if (s && chave(s.usuario) && !vistos[chave(s.usuario)]) {
              saida.push({ usuario: s.usuario, nome: s.nome || s.usuario, perfil: s.perfil || 'visitante' });
            }
            saida.sort(function (a, b) {
              return String(a.nome || '').toLowerCase() < String(b.nome || '').toLowerCase() ? -1 : 1;
            });
            return saida;
          }
        
          function mapa() {
            var m = ler(K_PERM, null);
            if (!m || typeof m !== 'object') { m = {}; }
            return m;
          }
        
          function todasIds() {
            return ABAS.map(function (a) { return a.id; });
          }
        
          /* lista de abas liberadas para um usuario.
             Se nunca foi configurado, tudo liberado (nada quebra). */
          function liberadasDe(usuario, perfil) {
            if (ehAdminPerfil(perfil)) { return todasIds(); }
            var m = mapa();
            var v = m[chave(usuario)];
            if (!v || !v.length) { return todasIds(); }
            var saida = [];
            var i;
            for (i = 0; i < v.length; i++) {
              if (todasIds().indexOf(v[i]) >= 0) { saida.push(v[i]); }
            }
            return saida.length ? saida : todasIds();
          }
        
          function configurado(usuario) {
            var m = mapa();
            var v = m[chave(usuario)];
            return !!(v && v.length);
          }
        
          function minhasAbas() {
            var s = sessao();
            if (!s) { return todasIds(); }
            return liberadasDe(s.usuario, s.perfil);
          }
        
          function podeVer(aba) {
            return minhasAbas().indexOf(String(aba)) >= 0;
          }
        
          function souAdmin() {
            var s = sessao();
            return !!(s && ehAdminPerfil(s.perfil));
          }
        
          /* ================================================================ *
           * estilo
           * ================================================================ */
          function estilo() {
            if (document.getElementById('p103Estilo')) { return; }
            var s = document.createElement('style');
            s.id = 'p103Estilo';
            s.textContent = [
              '#p103Botao{background:#b45309;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-weight:600;cursor:pointer;margin:4px;font-size:13px}',
              '#p103Botao:hover{filter:brightness(1.1)}',
              '#meu-menu-abas #p103Botao{display:block;width:100%;box-sizing:border-box;margin:3px 0 !important;text-align:left}',
              '#p103Fundo{position:fixed;inset:0;z-index:2147483350;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Segoe UI,Arial,sans-serif}',
              '#p103Caixa{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;border-radius:14px;width:900px;max-width:95vw;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.4)}',
              '#p103Caixa header{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#16304f;color:#fff;padding:10px 14px}',
              '#p103Caixa header h3{margin:0;font-size:15px}',
              '#p103Corpo{padding:14px;overflow:auto}',
              '#p103Pe{display:flex;gap:8px;flex-wrap:wrap;padding:10px 14px;border-top:1px solid #e2e8f0;background:#f8fafc}',
              '#p103Corpo p.sb{margin:0 0 12px;font-size:12.5px;color:#475569;line-height:1.55}',
              '#p103Corpo .p103-lin{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:0 0 12px}',
              '#p103Corpo label.tt{display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.3px;margin:0 0 3px}',
              '#p103Quem{padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;font-size:13px;min-width:240px;background:#fff;color:#1e293b}',
              '.p103-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px;margin:0 0 12px}',
              '.p103-item{display:flex;align-items:center;gap:9px;border:1px solid #e2e8f0;border-radius:10px;padding:9px 11px;background:#f8fafc;font-size:13px;color:#1e293b;cursor:pointer}',
              '.p103-item:hover{border-color:#93c5fd}',
              '.p103-item.on{background:#eff6ff;border-color:#bfdbfe}',
              '.p103-item input{width:17px;height:17px;flex:0 0 auto;cursor:pointer}',
              '.p103-info{margin:12px 0 0;padding:10px 12px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a5f;font-size:12px;line-height:1.55}',
              '.p103-info.al{background:#fef3c7;border-color:#fcd34d;color:#78350f}',
              '.p103-res{margin:0 0 10px;font-size:12px;color:#475569}',
              'body.dark-mode #p103Caixa{background:#0f172a}',
              'body.dark-mode #p103Corpo p.sb{color:#94a3b8}',
              'body.dark-mode #p103Pe{background:#111c33;border-color:#334155}',
              'body.dark-mode .p103-item{background:#111c33;border-color:#334155;color:#e2e8f0}',
              'body.dark-mode .p103-item.on{background:#12233d;border-color:#1d4ed8}'
            ].join('\n');
            (document.head || document.documentElement).appendChild(s);
          }
        
          /* ================================================================ *
           * tela do administrador
           * ================================================================ */
          var escolhido = '';
        
          function fecharTela() {
            var f = document.getElementById('p103Fundo');
            if (f && f.parentNode) { f.parentNode.removeChild(f); }
          }
        
          function abrirPermissoes() {
            if (!souAdmin()) {
              aviso('Somente o administrador pode mexer nas permissoes.', 'err');
              return;
            }
            estilo();
            fecharTela();
        
            var f = document.createElement('div');
            f.id = 'p103Fundo';
            f.setAttribute('data-ps79', '1');
            f.innerHTML =
              '<div id="p103Caixa" role="dialog" aria-modal="true" aria-labelledby="p103Tit">' +
                '<header><h3 id="p103Tit">Permiss\u00f5es de abas por usu\u00e1rio</h3>' +
                '<button class="p87-btn" type="button" data-a="fechar">Fechar</button></header>' +
                '<div id="p103Corpo"></div>' +
                '<div id="p103Pe">' +
                  '<button class="p87-btn pri" type="button" data-a="salvar">Salvar permiss\u00f5es</button>' +
                  '<button class="p87-btn" type="button" data-a="todas">Marcar todas</button>' +
                  '<button class="p87-btn" type="button" data-a="nenhuma">Desmarcar todas</button>' +
                  '<button class="p87-btn" type="button" data-a="liberar">Liberar tudo para todos</button>' +
                '</div>' +
              '</div>';
            document.body.appendChild(f);
        
            f.addEventListener('click', function (ev) { if (ev.target === f) { fecharTela(); } });
            f.addEventListener('click', aoClicar);
            f.addEventListener('change', aoTrocar);
            desenhar();
          }
        
          function desenhar() {
            var c = document.getElementById('p103Corpo');
            if (!c) { return; }
            var lista = pessoas();
        
            if (!lista.length) {
              c.innerHTML = '<div class="p103-info al">Ainda n\u00e3o existe nenhum usu\u00e1rio cadastrado. ' +
                'Cadastre as pessoas na tela "Usu\u00e1rios cadastrados" e volte aqui para escolher as abas de cada uma.</div>';
              return;
            }
        
            if (!escolhido) {
              var i0;
              for (i0 = 0; i0 < lista.length; i0++) {
                if (!ehAdminPerfil(lista[i0].perfil)) { escolhido = chave(lista[i0].usuario); break; }
              }
              if (!escolhido) { escolhido = chave(lista[0].usuario); }
            }
        
            var atual = null;
            var i;
            for (i = 0; i < lista.length; i++) {
              if (chave(lista[i].usuario) === escolhido) { atual = lista[i]; break; }
            }
            if (!atual) { atual = lista[0]; escolhido = chave(atual.usuario); }
        
            var h = '';
            h += '<p class="sb">Escolha a pessoa e marque as abas que ela pode abrir. ' +
                 'O que ficar desmarcado desaparece do menu dela. ' +
                 'O administrador sempre v\u00ea tudo.</p>';
        
            h += '<div class="p103-lin"><div><label class="tt">Pessoa</label><select id="p103Quem">';
            for (i = 0; i < lista.length; i++) {
              var u = lista[i];
              var k = chave(u.usuario);
              h += '<option value="' + esc(k) + '"' + (k === escolhido ? ' selected' : '') + '>' +
                   esc(u.nome || u.usuario) + ' (' + esc(u.usuario) + ') - ' + esc(nomePerfil(u.perfil)) +
                   '</option>';
            }
            h += '</select></div></div>';
        
            if (ehAdminPerfil(atual.perfil)) {
              h += '<div class="p103-info al"><b>' + esc(atual.nome || atual.usuario) + '</b> \u00e9 administrador, ' +
                   'ent\u00e3o v\u00ea todas as abas sempre. Para limitar as abas, primeiro mude o tipo de acesso dessa ' +
                   'pessoa na tela "Usu\u00e1rios cadastrados".</div>';
              c.innerHTML = h;
              return;
            }
        
            var lib = liberadasDe(atual.usuario, atual.perfil);
            h += '<div class="p103-res">' +
                 (configurado(atual.usuario)
                    ? 'Hoje esta pessoa v\u00ea <b>' + lib.length + '</b> de <b>' + ABAS.length + '</b> abas.'
                    : 'Esta pessoa ainda n\u00e3o tem limite: por enquanto ela v\u00ea todas as abas.') +
                 '</div>';
        
            h += '<div class="p103-grade" id="p103Grade">';
            for (i = 0; i < ABAS.length; i++) {
              var a = ABAS[i];
              var on = lib.indexOf(a.id) >= 0;
              h += '<label class="p103-item' + (on ? ' on' : '') + '" data-id="' + esc(a.id) + '">' +
                   '<input type="checkbox" data-a="aba" data-id="' + esc(a.id) + '"' + (on ? ' checked' : '') + '>' +
                   '<span>' + esc(rotuloAba(a.id)) + '</span></label>';
            }
            h += '</div>';
        
            h += '<div class="p103-info">Se voc\u00ea desmarcar todas as abas, a pessoa fica sem nada para ver, ' +
                 'ent\u00e3o o painel volta a liberar tudo para ela por seguran\u00e7a. ' +
                 'Aperte <b>Salvar permiss\u00f5es</b> para valer. ' +
                 'Cada pessoa precisa recarregar a p\u00e1gina dela para ver a mudan\u00e7a.</div>';
            c.innerHTML = h;
          }
        
          function aoTrocar(ev) {
            var el = ev.target;
            if (!el) { return; }
            if (el.id === 'p103Quem') {
              escolhido = String(el.value || '');
              desenhar();
              return;
            }
            if (el.getAttribute && el.getAttribute('data-a') === 'aba') {
              var pai = el.parentNode;
              if (pai && pai.className !== undefined) {
                pai.className = 'p103-item' + (el.checked ? ' on' : '');
              }
            }
          }
        
          function marcarTodas(valor) {
            var g = document.getElementById('p103Grade');
            if (!g) { return; }
            var cx = g.querySelectorAll('input[data-a="aba"]');
            var i;
            for (i = 0; i < cx.length; i++) {
              cx[i].checked = !!valor;
              if (cx[i].parentNode) {
                cx[i].parentNode.className = 'p103-item' + (valor ? ' on' : '');
              }
            }
          }
        
          function salvar() {
            var g = document.getElementById('p103Grade');
            if (!g) { aviso('Escolha uma pessoa que n\u00e3o seja administrador.', 'err'); return; }
            var cx = g.querySelectorAll('input[data-a="aba"]');
            var marcadas = [];
            var i;
            for (i = 0; i < cx.length; i++) {
              if (cx[i].checked) { marcadas.push(String(cx[i].getAttribute('data-id'))); }
            }
            var m = mapa();
            if (!marcadas.length) {
              delete m[escolhido];
            } else {
              m[escolhido] = marcadas;
            }
            if (!gravar(K_PERM, m)) {
              aviso('N\u00e3o consegui salvar neste navegador.', 'err');
              return;
            }
            try {
              if (window.p88Registrar) { window.p88Registrar('Permissoes de abas', escolhido + ': ' + marcadas.join(', ')); }
            } catch (e) { /* ignora */ }
            aviso(marcadas.length
              ? 'Permiss\u00f5es salvas: ' + marcadas.length + ' aba(s) liberada(s).'
              : 'Sem limite para esta pessoa: ela volta a ver todas as abas.');
            aplicar(true);
            desenhar();
          }
        
          function aoClicar(ev) {
            var el = ev.target;
            while (el && el !== document && !(el.getAttribute && el.getAttribute('data-a'))) {
              el = el.parentNode;
            }
            if (!el || el === document) { return; }
            var a = el.getAttribute('data-a');
            if (a === 'aba') { return; }
            ev.preventDefault();
            ev.stopPropagation();
            if (a === 'fechar') { fecharTela(); return; }
            if (a === 'salvar') { salvar(); return; }
            if (a === 'todas') { marcarTodas(true); return; }
            if (a === 'nenhuma') { marcarTodas(false); return; }
            if (a === 'liberar') {
              if (gravar(K_PERM, {})) {
                escolhido = '';
                aviso('Todo mundo voltou a ver todas as abas.');
                aplicar(true);
                desenhar();
              } else {
                aviso('N\u00e3o consegui salvar neste navegador.', 'err');
              }
              return;
            }
          }
        
          /* ================================================================ *
           * aplicar no menu e na troca de abas
           * ================================================================ */
          var assinatura = '';
        
          function assinar() {
            var s = sessao();
            return String(s ? chave(s.usuario) + '|' + String(s.perfil || '') : 'sem-login') +
                   '|' + minhasAbas().join(',');
          }
        
          function primeiraPermitida() {
            var lib = minhasAbas();
            var i;
            for (i = 0; i < ABAS.length; i++) {
              if (ABAS[i].id === 'fpdo') { continue; }
              if (lib.indexOf(ABAS[i].id) >= 0) { return ABAS[i].id; }
            }
            return '';
          }
        
          function abaAberta() {
            var i;
            for (i = 0; i < ABAS.length; i++) {
              var id = ABAS[i].id;
              if (id === 'fpdo') { continue; }
              var el = document.getElementById('tab-' + id);
              if (el && el.style && el.style.display !== 'none') { return id; }
            }
            return '';
          }
        
          function esconderBotoes() {
            var lib = minhasAbas();
            var i;
            for (i = 0; i < ABAS.length; i++) {
              var id = ABAS[i].id;
              var b = document.getElementById('btn-tab-' + id);
              if (!b) { continue; }
              var ok = lib.indexOf(id) >= 0;
              if (ok) {
                if (b.getAttribute('data-p103off') === '1') {
                  b.removeAttribute('data-p103off');
                  b.style.display = '';
                }
              } else {
                b.setAttribute('data-p103off', '1');
                b.style.setProperty('display', 'none', 'important');
                var pn = document.getElementById('tab-' + id);
                if (pn && pn.style && pn.style.display !== 'none') { pn.style.display = 'none'; }
              }
            }
          }
        
          function envolverTroca() {
            var ant = window.trocarAba;
            if (typeof ant !== 'function' || ant.__p103) { return; }
            var nova = function (aba) {
              var id = String(aba || '');
              if (!podeVer(id)) {
                aviso('Voc\u00ea n\u00e3o tem permiss\u00e3o para abrir esta aba.', 'err');
                try {
                  var m = document.getElementById('meu-menu-abas');
                  if (m) { m.removeAttribute('open'); }
                } catch (e2) { /* ignora */ }
                return false;
              }
              return ant.apply(this, arguments);
            };
            nova.__p103 = true;
            try { window.trocarAba = nova; } catch (e) { /* ignora */ }
            if (typeof trocarAba === 'function') {
              try { trocarAba = nova; } catch (e3) { /* ignora */ }
            }
          }
        
          function envolverFpdo() {
            var ant = window.p92AbrirFpdo;
            if (typeof ant !== 'function' || ant.__p103) { return; }
            var nova = function () {
              if (!podeVer('fpdo')) {
                aviso('Voc\u00ea n\u00e3o tem permiss\u00e3o para abrir o Relat\u00f3rio FPDO.', 'err');
                return false;
              }
              return ant.apply(this, arguments);
            };
            nova.__p103 = true;
            try { window.p92AbrirFpdo = nova; } catch (e) { /* ignora */ }
          }
        
          function cairNaPrimeira() {
            var atual = abaAberta();
            if (atual && podeVer(atual)) { return; }
            var alvo = primeiraPermitida();
            if (!alvo) { return; }
            try {
              if (typeof window.trocarAba === 'function') { window.trocarAba(alvo); }
            } catch (e) { /* ignora */ }
          }
        
          function aplicar(forcar) {
            envolverTroca();
            envolverFpdo();
            var ass = assinar();
            if (!forcar && ass === assinatura) {
              esconderBotoes();
              return;
            }
            assinatura = ass;
            esconderBotoes();
            cairNaPrimeira();
          }
        
          /* ================================================================ *
           * botao no menu de abas (somente admin)
           * ================================================================ */
          function caixaMenu() {
            return document.querySelector('#meu-menu-abas .tabs') || null;
          }
        
          function colocarBotao() {
            var existente = document.getElementById('p103Botao');
            if (!souAdmin()) {
              if (existente && existente.parentNode) { existente.parentNode.removeChild(existente); }
              return;
            }
            var cx = caixaMenu();
            var b = existente;
            if (!b) {
              b = document.createElement('button');
              b.id = 'p103Botao';
              b.type = 'button';
              b.textContent = 'Permiss\u00f5es de abas';
              b.setAttribute('title', 'Escolher quais abas cada usuario pode ver');
              b.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                abrirPermissoes();
              });
            }
            if (cx) {
              if (b.parentNode !== cx) { cx.appendChild(b); }
              b.style.position = '';
            } else if (!b.parentNode) {
              b.style.cssText += ';position:fixed;right:14px;bottom:240px;z-index:2147482000;';
              document.body.appendChild(b);
            }
          }
        
          /* ================================================================ *
           * inicio
           * ================================================================ */
          function iniciar() {
            try { estilo(); } catch (e) { /* ignora */ }
            try { colocarBotao(); } catch (e) { /* ignora */ }
            try { aplicar(true); } catch (e) { /* ignora */ }
        
            setInterval(function () {
              try { colocarBotao(); } catch (e) { /* ignora */ }
              try { aplicar(false); } catch (e) { /* ignora */ }
            }, 2000);
        
            document.addEventListener('keydown', function (ev) {
              var k = ev.key || ev.keyCode;
              if (k !== 'Escape' && k !== 'Esc' && k !== 27) { return; }
              if (document.getElementById('p103Fundo')) {
                ev.stopPropagation();
                fecharTela();
              }
            }, true);
        
            window.p103Permissoes = function () { abrirPermissoes(); return true; };
            window.PainelPermissoes = {
              abrir: abrirPermissoes,
              abas: ABAS,
              minhas: minhasAbas,
              podeVer: podeVer
            };
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
          setTimeout(function () { try { aplicar(true); } catch (e) { /* ignora */ } }, 1200);
          setTimeout(function () { try { aplicar(true); } catch (e) { /* ignora */ } }, 3500);
        })();
    
