
        /* PATCH 87 - conserta a reabertura das janelas (Diario de Obra, Boletim,
           Cabecalho) e cria a tela "Usuarios cadastrados".
           Nao reescreve nada do painel: apenas acrescenta e envolve funcoes. */
        (function () {
          'use strict';
        
          if (window.__p87) { return; }
          window.__p87 = true;
        
          var PREFS = ['p83', 'p84', 'p86'];
          var OCULTAS = ['p86-oculto', 'p86b-oculto', 'p87-oculto'];
        
          var K_USERS = window.PainelNucleo.K_USERS;   /* PATCH108 */
          var K_SESS  = window.PainelNucleo.K_SESS;    /* PATCH108 */
        
          /* ================================================================ *
           * utilidades
           * ================================================================ */
          function esc(v) {
            return String(v === undefined || v === null ? '' : v)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
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
        
          function estilo() {
            if (document.getElementById('p87Estilo')) { return; }
            var s = document.createElement('style');
            s.id = 'p87Estilo';
            s.textContent = [
              '.p87-aviso{position:fixed;left:50%;top:22px;transform:translateX(-50%);z-index:2147483500;background:#15803d;color:#fff;padding:11px 18px;border-radius:10px;font:13px Segoe UI,Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)}',
              '.p87-aviso.err{background:#b91c1c}',
              '#p87Botao{background:#7c3aed;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-weight:600;cursor:pointer;margin:4px;font-size:13px}',
              '#p87Botao:hover{filter:brightness(1.1)}',
              '#meu-menu-abas #p87Botao{display:block;width:100%;box-sizing:border-box;margin:3px 0 !important;text-align:left}',
              '#p87Fundo{position:fixed;inset:0;z-index:2147483200;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Segoe UI,Arial,sans-serif}',
              /* PATCH_cadastroAdmin: centralização já no CSS base para evitar pulo visual */
              '#p87Caixa{position:fixed !important;left:50% !important;top:50% !important;right:auto !important;bottom:auto !important;transform:translate(-50%,-50%) !important;margin:0 !important;width:760px !important;max-width:94vw !important;max-height:86vh !important;height:auto !important}',
              '#p87Caixa{background:#fff;border-radius:14px;width:100%;max-width:860px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.4);animation:p87FadeIn .2s ease-out}',
              /* PATCH_cadastroAdmin: animação suave de entrada */
              '@keyframes p87FadeIn{from{opacity:0;transform:translate(-50%,-50%) scale(.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}',
              '#p87Caixa header{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#16304f;color:#fff;padding:12px 16px}',
              '#p87Caixa header h3{margin:0;font-size:16px}',
              '#p87Corpo{padding:16px;overflow:auto}',
              '#p87Pe{display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px;border-top:1px solid #e2e8f0;background:#f8fafc}',
              '.p87-btn{border:1px solid #cbd5e1;border-radius:8px;background:#f1f5f9;color:#16304f;padding:8px 13px;font-size:13px;font-weight:600;cursor:pointer}',
              '.p87-btn.pri{background:#2563eb;border-color:#2563eb;color:#fff}',
              '.p87-btn.dan{background:#fee2e2;border-color:#fca5a5;color:#b91c1c}',
              '.p87-btn.mini{padding:5px 9px;font-size:11px}',
              '#p87Caixa header .p87-btn{background:#e2e8f0}',
              '#p87Corpo p.sb{margin:0 0 14px;font-size:12.5px;color:#475569;line-height:1.5}',
              'table.p87-tab{width:100%;border-collapse:collapse;font-size:13px}',
              'table.p87-tab th{background:#1e3a5f;color:#fff;text-align:left;padding:8px;font-size:11.5px;text-transform:uppercase;letter-spacing:.3px}',
              'table.p87-tab td{border-bottom:1px solid #e2e8f0;padding:7px 8px;color:#1e293b;vertical-align:middle}',
              'table.p87-tab td.ac{white-space:nowrap;display:flex;gap:5px;flex-wrap:wrap}',
              'table.p87-tab select{padding:5px 7px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;background:#fff;color:#1e293b}',
              '.p87-tagadm{display:inline-block;background:#dbeafe;color:#1d4ed8;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700}',
              '.p87-info{margin:14px 0 0;padding:10px 12px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a5f;font-size:12px;line-height:1.55}',
              '.p87-novo{margin:0 0 16px;padding:12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;display:none}',
              '.p87-novo.on{display:block}',
              '.p87-novo .lin{display:flex;gap:10px;flex-wrap:wrap}',
              '.p87-novo label{display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.3px;margin:0 0 3px}',
              '.p87-novo input,.p87-novo select{padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;font-size:13px;min-width:150px;background:#fff;color:#1e293b}',
              '.p87-novo .er{margin-top:8px;font-size:12px;color:#b91c1c;min-height:15px}',
              'body.dark-mode #p87Caixa{background:#0f172a}',
              'body.dark-mode #p87Corpo p.sb{color:#94a3b8}',
              'body.dark-mode table.p87-tab td{color:#e2e8f0;border-color:#334155}',
              'body.dark-mode #p87Pe{background:#111c33;border-color:#334155}',
              'body.dark-mode .p87-novo{background:#111c33;border-color:#334155}'
            ].join('\n');
            (document.head || document.documentElement).appendChild(s);
          }
        
          /* ================================================================ *
           * BLOCO A - deixar as janelas reabrirem sempre
           * ================================================================ */
          function destravar(f) {
            if (!f) { return; }
            try {
              OCULTAS.forEach(function (c) { f.classList.remove(c); });
            } catch (e) { /* ignora */ }
            try { f.style.setProperty('display', 'flex', 'important'); } catch (e2) { f.style.display = 'flex'; }
          }
        
          function estaEscondido(f) {
            if (!f) { return false; }
            var i;
            for (i = 0; i < OCULTAS.length; i++) {
              try { if (f.classList.contains(OCULTAS[i])) { return true; } } catch (e) { /* ignora */ }
            }
            var d = '';
            try { d = window.getComputedStyle(f).display; } catch (e2) { d = f.style.display; }
            return d === 'none';
          }
        
          /* depois de clicar para abrir, insiste algumas vezes para a janela aparecer */
          function insistir(pref, vezes) {
            var n = vezes || 12;
            var conta = 0;
            var t = setInterval(function () {
              conta++;
              var f = document.getElementById(pref + 'Fundo');
              if (f) {
                var querAbrir = (f.style && f.style.display && f.style.display !== 'none');
                if (querAbrir || estaEscondido(f)) { destravar(f); }
              }
              if (conta >= n) { clearInterval(t); }
            }, 60);
          }
        
          /* olho permanente: quando qualquer uma dessas janelas pedir para aparecer,
             tira as marcas de oculto deixadas pelos patches anteriores */
          function vigiar(f) {
            if (!f || f.getAttribute('data-p87olho') === '1') { return; }
            f.setAttribute('data-p87olho', '1');
            try {
              var olho = new MutationObserver(function () {
                if (f.style && f.style.display && f.style.display !== 'none') {
                  OCULTAS.forEach(function (c) {
                    try { f.classList.remove(c); } catch (e) { /* ignora */ }
                  });
                }
              });
              olho.observe(f, { attributes: true, attributeFilter: ['style', 'class'] });
            } catch (e) { /* ignora */ }
          }
        
          function varrer() {
            PREFS.forEach(function (p) {
              var f = document.getElementById(p + 'Fundo');
              if (f) { vigiar(f); }
            });
          }
        
          function envolverAbrir() {
            var mapa = [
              ['p84AbrirDiario', 'p84'],
              ['p83AbrirBoletim', 'p83'],
              ['p86AjustarCabecalho', 'p86']
            ];
            mapa.forEach(function (par) {
              var nome = par[0];
              var pref = par[1];
              var ant = window[nome];
              if (typeof ant !== 'function' || ant.__p87) { return; }
              var nova = function () {
                var f = document.getElementById(pref + 'Fundo');
                destravar(f);
                var r;
                try { r = ant.apply(this, arguments); } catch (e) { r = null; }
                destravar(document.getElementById(pref + 'Fundo'));
                insistir(pref, 12);
                return r;
              };
              nova.__p87 = true;
              window[nome] = nova;
            });
          }
        
          function ligarBotoes() {
            if (window.__p87Clique) { return; }
            window.__p87Clique = true;
        
            document.addEventListener('click', function (ev) {
              var alvo = ev.target;
              if (!alvo || !alvo.closest) { return; }
              var b = alvo.closest('#p83Botao,#p84Botao,#p86Botao');
              if (!b) { return; }
              var pref = String(b.id).replace('Botao', '');
              destravar(document.getElementById(pref + 'Fundo'));
              insistir(pref, 14);
            }, true);
          }
        
          function ligarReabrir() {
            varrer();
            envolverAbrir();
            ligarBotoes();
        
            /* o olho fica ligado para sempre: as janelas nascem so no primeiro uso */
            try {
              var olho = new MutationObserver(function () { varrer(); envolverAbrir(); });
              olho.observe(document.body, { childList: true });
            } catch (e) { /* ignora */ }
            setInterval(function () {
              try { varrer(); envolverAbrir(); } catch (e2) { /* ignora */ }
            }, 2500);
        
            /* atalho manual, caso precise abrir pelo console */
            window.p87AbrirDiario = function () {
              var f = document.getElementById('p84Fundo');
              destravar(f);
              if (typeof window.p84AbrirDiario === 'function') { window.p84AbrirDiario(); }
              insistir('p84', 14);
              return true;
            };
          }
        
          /* ================================================================ *
           * BLOCO B - tela "Usuarios cadastrados"
           * ================================================================ */
          /* PATCH108: usa o calculo unico de senha do nucleo (window.PainelNucleo). */
          function sha256(str) { return window.PainelNucleo.sha256(str); }
        
          /* PATCH108: codigo da senha vem do nucleo unico. */
          function hashSenha(usuario, senha) { return window.PainelNucleo.hashSenha(usuario, senha); }
        
          function lerJson(k, def) {
            try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; }
          }
        
          function gravarJson(k, v) {
            try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
          }
        
          function usuarios() {
            var u = lerJson(K_USERS, null);
            return (u && u.length) ? u : [];
          }
        
          /* PATCH108: leitura da sessao vem do nucleo unico. */
          function sessao() { return window.PainelNucleo.sessao(); }
        
          function podeMexer() {
            try {
              var s = (window.PainelNucleo && PainelNucleo.sessao) ? PainelNucleo.sessao() : sessao();
              /* PATCH_podeMexer: fallback para estado do P128 quando sessão expirou */
              if (!s && window.P128 && window.P128.estado) {
                var est = window.P128.estado;
                if (est.perfil && est.email) {
                  s = { usuario: est.email, nome: '', perfil: est.perfil };
                }
              }
              if (!s) {
                try { console.warn('[podeMexer] sem sessão — verifique login/expiração'); } catch(e0){}
                return false;
              }
              var p = String(s.perfil || '').toLowerCase();
              try { console.log('[podeMexer] perfil =', p, '| sessão.usuario =', s.usuario || s.nome || '?'); } catch(e1){}
              return p === 'admin' || p === 'editor';
            } catch (e) {
              try { console.error('[podeMexer] exceção:', e); } catch(e2){}
              return false;
            }
          }
        
          /* PATCH108: nome do tipo de acesso vem do nucleo unico. */
          function nomePerfil(p) { return window.PainelNucleo.nomePerfil(p); }
        
          function dataBr(ms) {
            if (!ms) { return '-'; }
            try {
              var d = new Date(Number(ms));
              if (isNaN(d.getTime())) { return '-'; }
              return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR').slice(0, 5);
            } catch (e) { return '-'; }
          }
        
          function quantosAdmins(lista) {
            var n = 0, i;
            for (i = 0; i < lista.length; i++) {
              if (String(lista[i].perfil || '').toLowerCase() === 'admin') { n++; }
            }
            return n;
          }
        
          function fecharTela() {
            var f = document.getElementById('p87Fundo');
            if (f && f.parentNode) { f.parentNode.removeChild(f); }
          }
        
          function abrirUsuarios() {
            estilo();
            fecharTela();
            /* [v10] limpar cache para forcar recarga do Supabase */
            window.__p87ListaSupabase = null;
        
            var f = document.createElement('div');
            f.id = 'p87Fundo';
            f.setAttribute('data-ps79', '1');
            f.innerHTML =
              '<div id="p87Caixa" role="dialog" aria-modal="true" aria-labelledby="p87Tit">' +
                '<header><h3 id="p87Tit">Usu\u00e1rios cadastrados</h3>' +
                '<button class="p87-btn" type="button" data-a="fechar">Fechar</button></header>' +
                '<div id="p87Corpo"></div>' +
                '<div id="p87Pe">' +
                  '<button class="p87-btn pri" type="button" data-a="novo">Cadastrar usu\u00e1rio</button>' +
                  '<button class="p87-btn" type="button" data-a="csv">Baixar lista (CSV)</button>' +
                  '<button class="p87-btn" type="button" data-a="atualizar">Atualizar</button>' +
                '</div>' +
              '</div>';
            document.body.appendChild(f);
        
            f.addEventListener('click', function (ev) {
              if (ev.target === f) { fecharTela(); }
            });
            f.addEventListener('click', aoClicar);
            f.addEventListener('change', aoTrocar);
            desenhar();
          }
        
          function desenhar() {
            var c = document.getElementById('p87Corpo');
            if (!c) { return; }
            /* PATCH108: tres calculos repetidos logo abaixo foram removidos daqui. */
        
            if (window.PainelAuthSupabase && !window.__p87ListaSupabase && !window.__p87CarregandoSupabase) {
              window.__p87CarregandoSupabase = true;
              c.innerHTML = '<p class="p87-info">Carregando usuários centralizados do Supabase...</p>';
              window.PainelAuthSupabase.listarPerfis().then(function (remotos) {
                window.__p87ListaSupabase = (remotos || []).map(function (u) {
                  return { id: u.id, usuario: u.usuario || '', nome: u.nome || u.usuario || '', perfil: u.perfil || 'visitante', ativo: u.ativo === true, criadoEm: u.criado_em || u.atualizado_em || '' };
                });
                window.__p87CarregandoSupabase = false;
                desenhar();
              }).catch(function (erro) {
                window.__p87CarregandoSupabase = false;
                c.innerHTML = '<p class="p87-info">Não foi possível carregar os usuários do Supabase: ' + esc(erro && erro.message ? erro.message : 'erro desconhecido') + '</p>';
              });
              return;
            }
            var remoto = Array.isArray(window.__p87ListaSupabase);
            var lista = remoto ? window.__p87ListaSupabase : usuarios();
            var s = sessao();
            /* PATCH107: ser administrador nao depende de a lista vir da nuvem */
            var souAdmin = podeMexer();
            var manda = remoto ? false : souAdmin;
            var h = '';
            if (remoto) {
              h += '<p class="sb">Lista centralizada no Supabase. Todos os usuários cadastrados aparecem em qualquer navegador. A senha nunca é exibida.</p>';
            } else {
              h += '<p class="sb">A lista local antiga ainda está preservada apenas como backup. O cadastro oficial deve ser feito no Supabase.</p>';
            }
            if (s) {
              /* PATCH107: frase certa para administrador quando a lista vem da nuvem */
              var extra107 = '';
              if (souAdmin && remoto) {
                extra107 = ' Voc\u00ea \u00e9 administrador. Como esta lista vem da nuvem, trocar tipo de acesso ou senha e feito no cadastro da nuvem.';
              } else if (!souAdmin) {
                extra107 = ' Como n\u00e3o \u00e9 administrador, esta tela fica somente para consulta.';
              }
              h += '<p class="sb">Voc\u00ea est\u00e1 conectado como <b>' + esc(s.nome || s.usuario) +
                   '</b> (' + esc(nomePerfil(s.perfil)) + ').' + extra107 + '</p>';
            }
        
            h += '<div class="p87-novo" id="p87Novo">' +
                   '<div class="lin">' +
                     '<div><label>Nome completo</label><input id="p87nNome" type="text"></div>' +
                     '<div><label>Usu\u00e1rio</label><input id="p87nUsu" type="text"></div>' +
                     '<div><label>Senha</label><input id="p87nSe" type="password"></div>' +
                     '<div><label>Tipo de acesso</label><select id="p87nTipo">' +
                       '<option value="visitante">Somente consulta</option>' +
                       '<option value="editor">Pode lan\u00e7ar e editar</option>' +
                       '<option value="admin">Administrador</option>' +
                     '</select></div>' +
                   '</div>' +
                   '<div class="er" id="p87nEr"></div>' +
                   '<div style="display:flex;gap:8px;margin-top:6px">' +
                     '<button class="p87-btn pri" type="button" data-a="salvarNovo">Salvar usu\u00e1rio</button>' +
                     '<button class="p87-btn" type="button" data-a="cancelarNovo">Cancelar</button>' +
                   '</div>' +
                 '</div>';
        
            if (!lista.length) {
              h += '<div class="p87-info">Ainda n\u00e3o existe nenhum usu\u00e1rio salvo neste navegador. ' +
                   'Use o bot\u00e3o "Cadastrar usu\u00e1rio" aqui embaixo, ou o bot\u00e3o "Criar novo usu\u00e1rio" ' +
                   'da tela de entrada do painel.</div>';
              c.innerHTML = h;
              return;
            }
        
            h += '<table class="p87-tab"><thead><tr>' +
                 '<th>Nome</th><th>Usu\u00e1rio</th><th>Tipo de acesso</th><th>Criado em</th><th>Abas [v9]</th><th>A\u00e7\u00f5es</th>' +
                 '</tr></thead><tbody>';
        
            lista.forEach(function (u, i) {
              var ehAdm = String(u.perfil || '').toLowerCase() === 'admin';
              h += '<tr>';
              h += '<td>' + esc(u.nome || u.usuario) + '</td>';
              h += '<td><b>' + esc(u.usuario) + '</b>' + (ehAdm ? ' <span class="p87-tagadm">admin</span>' : '') + '</td>';
              if (manda) {
                h += '<td><select data-a="tipo" data-i="' + i + '">' +
                     ['visitante', 'editor', 'admin'].map(function (v) {
                       var sel = (String(u.perfil || 'visitante').toLowerCase() === v) ? ' selected' : '';
                       return '<option value="' + v + '"' + sel + '>' + esc(nomePerfil(v)) + '</option>';
                     }).join('') + '</select></td>';
              } else {
                h += '<td>' + esc(nomePerfil(u.perfil)) + '</td>';
              }
              h += '<td>' + esc(dataBr(u.criadoEm)) + '</td>';
              /* [v9] coluna Abas */
              var _ABAS = (typeof window.PainelPermissoes !== 'undefined' && window.PainelPermissoes.abas) ? window.PainelPermissoes.abas : [];
              var _ehAdmL = String(u.perfil || '').toLowerCase() === 'admin';
              var _pLib = (typeof window.PainelPermissoes !== 'undefined' && window.PainelPermissoes.liberadasDe) ? window.PainelPermissoes.liberadasDe(u.usuario, u.perfil) : _ABAS.map(function(x){return x.id;});
              var _cfgL = (typeof window.PainelPermissoes !== 'undefined' && window.PainelPermissoes.configurado) ? window.PainelPermissoes.configurado(u.usuario) : false;
              h += '<td style="text-align:center">';
              if (_ehAdmL) {
                h += '<span style="font-size:11px;color:#2563eb;font-weight:700">Todas</span>';
              } else if (manda && _ABAS.length) {
                h += '<button class="p87-btn mini" type="button" data-a="verAbas" data-i="' + i + '" title="Ver/editar abas liberadas" style="background:#7c3aed;color:#fff;border:0;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer">' + (_cfgL ? _pLib.length + '/' + _ABAS.length : 'Tudo') + ' ������</button>';
              } else {
                h += '<span style="font-size:11px;color:#6b7280">' + (_pLib.length || '?') + '</span>';
              }
              h += '</td>';
              h += '<td class="ac">';
              if (manda) {
                h += '<button class="p87-btn mini" type="button" data-a="senha" data-i="' + i + '">Trocar senha</button>';
                h += '<button class="p87-btn mini dan" type="button" data-a="excluir" data-i="' + i + '">Excluir</button>';
              } else {
                h += '<span style="font-size:11px;color:#94a3b8">' +
                     (souAdmin ? 'gerenciar na nuvem' : 'somente consulta') + '</span>'; /* PATCH107 */
              }
              h += '</td></tr>';
            });
        
            h += '</tbody></table>';
            h += '<div class="p87-info">Total de acessos: <b>' + lista.length + '</b>. ' +
                 'Administradores: <b>' + quantosAdmins(lista) + '</b>. ' +
                 'Guarde sempre pelo menos um administrador, sen\u00e3o ningu\u00e9m poder\u00e1 mexer nesta tela.</div>';
            c.innerHTML = h;
          }
        
          function aoTrocar(ev) {
            var el = ev.target;
            if (!el || el.getAttribute('data-a') !== 'tipo') { return; }
            if (!podeMexer()) { return; }
            var i = Number(el.getAttribute('data-i'));
            var lista = usuarios();
            if (!lista[i]) { return; }
            var antes = lista[i].perfil;
            lista[i].perfil = el.value;
            if (antes === 'admin' && el.value !== 'admin' && quantosAdmins(lista) === 0) {
              aviso('Precisa sobrar pelo menos um administrador.', 'err');
              desenhar();
              return;
            }
            if (gravarJson(K_USERS, lista)) {
              aviso('Tipo de acesso de ' + (lista[i].usuario) + ' alterado.');
            } else {
              aviso('N\u00e3o consegui salvar neste navegador.', 'err');
            }
            desenhar();
          }
        
          function baixarCsv() {
            var lista = usuarios();
            var lin = ['Nome;Usuario;Tipo de acesso;Criado em'];
            lista.forEach(function (u) {
              lin.push([
                String(u.nome || u.usuario).replace(/;/g, ','),
                String(u.usuario).replace(/;/g, ','),
                nomePerfil(u.perfil).replace(/;/g, ','),
                dataBr(u.criadoEm)
              ].join(';'));
            });
            try {
              var bl = new Blob(['\ufeff' + lin.join('\r\n')], { type: 'text/csv;charset=utf-8' });
              var a = document.createElement('a');
              a.href = URL.createObjectURL(bl);
              a.download = 'usuarios_do_painel.csv';
              document.body.appendChild(a);
              a.click();
              setTimeout(function () {
                try { URL.revokeObjectURL(a.href); } catch (e) { /* ignora */ }
                if (a.parentNode) { a.parentNode.removeChild(a); }
              }, 1500);
              aviso('Lista baixada em CSV.');
            } catch (e) {
              aviso('N\u00e3o consegui gerar o arquivo.', 'err');
            }
          }
        
          function salvarNovo() {
            var elN = document.getElementById('p87nNome');
            var elU = document.getElementById('p87nUsu');
            var elS = document.getElementById('p87nSe');
            var elT = document.getElementById('p87nTipo');
            var er  = document.getElementById('p87nEr');
            if (!elN || !elU || !elS || !er) { return; }
        
            var nome = String(elN.value || '').trim();
            var usu  = String(elU.value || '').trim().toLowerCase();
            var se   = String(elS.value || '');
        
            if (!nome) { er.textContent = 'Escreva o nome completo.'; return; }
            if (usu.length < 3) { er.textContent = 'O usu\u00e1rio precisa de pelo menos 3 caracteres.'; return; }
            if (!/^[a-z0-9._-]+$/.test(usu)) {
              er.textContent = 'Use apenas letras sem acento, n\u00fameros, ponto, tra\u00e7o ou sublinhado.';
              return;
            }
            if (se.length < 4) { er.textContent = 'A senha precisa de pelo menos 4 caracteres.'; return; }
        
            var lista = usuarios();
            var i;
            for (i = 0; i < lista.length; i++) {
              if (String(lista[i].usuario).toLowerCase() === usu) {
                er.textContent = 'J\u00e1 existe um usu\u00e1rio com esse nome.';
                return;
              }
            }
            lista.push({
              usuario: usu,
              nome: nome,
              perfil: elT ? elT.value : 'visitante',
              hash: hashSenha(usu, se),
              trocar: false,
              criadoEm: Date.now()
            });
            if (!gravarJson(K_USERS, lista)) {
              er.textContent = 'N\u00e3o consegui salvar neste navegador.';
              return;
            }
            aviso('Usu\u00e1rio ' + usu + ' cadastrado.');
            desenhar();
          }
        
          function aoClicar(ev) {
            var b = ev.target && ev.target.closest ? ev.target.closest('[data-a]') : null;
            if (!b) { return; }
            var a = b.getAttribute('data-a');
            if (a === 'tipo') { return; }
            ev.preventDefault();
        
            if (a === 'fechar') { fecharTela(); return; }
            if (a === 'atualizar') { window.__p87ListaSupabase = null; desenhar(); aviso('Lista atualizada.'); return; }
            if (a === 'csv') { baixarCsv(); return; }
        
            if (a === 'novo') {
              if (!ehAdmin()) { aviso('Somente o administrador pode cadastrar.', 'err'); return; }
              var cx = document.getElementById('p87Novo');
              if (cx) {
                cx.classList.add('on');
                var el = document.getElementById('p87nNome');
                if (el) { try { el.focus(); } catch (e) { /* ignora */ } }
              }
              return;
            }
            if (a === 'cancelarNovo') {
              var cx2 = document.getElementById('p87Novo');
              if (cx2) { cx2.classList.remove('on'); }
              return;
            }
            if (a === 'salvarNovo') { salvarNovo(); return; }
        
            /* [v9] verAbas - expandir permissoes inline */
            if (a === 'verAbas') {
              var _lstV = Array.isArray(window.__p87ListaSupabase) ? window.__p87ListaSupabase : usuarios();
              var _iV = Number(b.getAttribute('data-i'));
              if (!_lstV || !_lstV[_iV]) { return; }
              var _uV = _lstV[_iV];
              if (String(_uV.perfil || '').toLowerCase() === 'admin') {
                aviso('Administrador ve todas as abas.', 'err'); return;
              }
              var _lnV = b.closest('tr');
              var _pIdV = 'v9aba_' + _iV;
              var _pElV = document.getElementById(_pIdV);
              if (_pElV) { _pElV.style.display = _pElV.style.display === 'none' ? '' : 'none'; return; }
              _pElV = document.createElement('tr'); _pElV.id = _pIdV;
              var _cV = document.createElement('td'); _cV.colSpan = 6;
              _cV.style.cssText = 'padding:12px;background:#f0f4ff;border:1px solid #bfdbfe;border-radius:8px;';
              var _ABASv = (typeof window.PainelPermissoes !== 'undefined' && window.PainelPermissoes.abas) ? window.PainelPermissoes.abas : [];
              var _libV = (typeof window.PainelPermissoes !== 'undefined' && window.PainelPermissoes.liberadasDe) ? window.PainelPermissoes.liberadasDe(_uV.usuario, _uV.perfil) : _ABASv.map(function(x){return x.id;});
              var _hV = '<div style="margin:6px 0;font-weight:700;color:#1e3a5f;font-size:14px">\ud83d\udd11 Permiss\u00f5es de Abas — ' + esc(_uV.nome || _uV.usuario) + '</div>';
              _hV += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px;margin:8px 0">';
              for (var _aV = 0; _aV < _ABASv.length; _aV++) {
                var _abV = _ABASv[_aV];
                var _onV = _libV.indexOf(_abV.id) >= 0;
                _hV += '<label style="display:flex;align-items:center;gap:7px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;background:' + (_onV ? '#eff6ff' : '#fff') + ';cursor:pointer;font-size:12.5px;color:#1e293b">';
                _hV += '<input type="checkbox" data-a="v9chk" data-uid="' + esc(_uV.usuario) + '" data-aba="' + esc(_abV.id) + '"' + (_onV ? ' checked' : '') + '>';
                _hV += '<span>' + esc(_abV.nome || _abV.id) + '</span></label>';
              }
              _hV += '</div>';
              _hV += '<div style="display:flex;gap:8px;margin-top:8px">';
              _hV += '<button class="p87-btn pri" type="button" data-a="salvarAbasI" data-uid="' + esc(_uV.usuario) + '" data-pid="' + _pIdV + '">Salvar permiss\u00f5es</button>';
              _hV += '<button class="p87-btn" type="button" data-a="fecharAbasI" data-pid="' + _pIdV + '">Fechar</button>';
              _hV += '</div>';
              _cV.innerHTML = _hV;
              _pElV.appendChild(_cV);
              if (_lnV && _lnV.nextSibling) { _lnV.parentNode.insertBefore(_pElV, _lnV.nextSibling); }
              else { _lnV.parentNode.appendChild(_pElV); }
              return;
            }
            /* [v9] salvarAbasI */
            if (a === 'salvarAbasI') {
              var _uidS = b.getAttribute('data-uid');
              var _pidS = b.getAttribute('data-pid');
              var _cksS = document.querySelectorAll('input[data-a="v9chk"][data-uid="' + _uidS + '"]');
              var _marcS = [];
              for (var _cS = 0; _cS < _cksS.length; _cS++) { if (_cksS[_cS].checked) { _marcS.push(String(_cksS[_cS].getAttribute('data-aba'))); } }
              var _mS = (typeof window.PainelPermissoes !== 'undefined' && window.PainelPermissoes.mapa) ? window.PainelPermissoes.mapa() : null;
              if (!_mS || typeof _mS !== 'object') { _mS = {}; }
              var _kPS = 'painel_seg_permissoes_v1';
              if (!_marcS.length) { delete _mS[_uidS]; } else { _mS[_uidS] = _marcS; }
              try { localStorage.setItem(_kPS, JSON.stringify(_mS)); } catch(e) { aviso('Nao consegui salvar.', 'err'); return; }
              try { if (window.p88Registrar) { window.p88Registrar('Permissoes de abas', _uidS + ': ' + _marcS.join(', ')); } } catch(e){}
              aviso(_marcS.length ? 'Permiss\u00f5es salvas: ' + _marcS.length + ' aba(s).' : 'Sem limite: volta a ver todas.');
              try { if (window.PainelPermissoes && window.PainelPermissoes.aplicar) { window.PainelPermissoes.aplicar(true); } } catch(e2){}
              var _pElS = document.getElementById(_pidS);
              if (_pElS) { _pElS.style.display = 'none'; }
              desenhar();
              return;
            }
            /* [v9] fecharAbasI */
            if (a === 'fecharAbasI') {
              var _pidF = b.getAttribute('data-pid');
              var _pElF = document.getElementById(_pidF);
              if (_pElF) { _pElF.style.display = 'none'; }
              return;
            }
            if (!podeMexer()) { return; }
            var lista = Array.isArray(window.__p87ListaSupabase) ? window.__p87ListaSupabase : usuarios();
            var i = Number(b.getAttribute('data-i'));
            if (!lista[i]) { return; }
        
            if (a === 'senha') {
              var nova = window.prompt('Nova senha para ' + lista[i].usuario + ' (m\u00ednimo 4 caracteres):', '');
              if (nova === null) { return; }
              nova = String(nova);
              if (nova.length < 4) { aviso('Senha muito curta. Nada foi mudado.', 'err'); return; }
              lista[i].hash = hashSenha(lista[i].usuario, nova);
              lista[i].trocar = false;
              if (gravarJson(K_USERS, lista)) {
                aviso('Senha de ' + lista[i].usuario + ' trocada.');
              } else {
                aviso('N\u00e3o consegui salvar neste navegador.', 'err');
              }
              return;
            }
        
            if (a === 'excluir') {
              var u = lista[i];
              if (String(u.perfil || '').toLowerCase() === 'admin' && quantosAdmins(lista) <= 1) {
                aviso('Este \u00e9 o \u00fanico administrador. N\u00e3o pode ser exclu\u00eddo.', 'err');
                return;
              }
              if (!window.confirm('Excluir o acesso de ' + (u.nome || u.usuario) + '? Nao tem como desfazer.')) { return; }
              lista.splice(i, 1);
              if (gravarJson(K_USERS, lista)) {
                aviso('Acesso exclu\u00eddo.');
              } else {
                aviso('N\u00e3o consegui salvar neste navegador.', 'err');
              }
              desenhar();
              return;
            }
          }
        
          /* ---- botao no menu de abas ---- */
          function caixaMenu() {
            return document.querySelector('#meu-menu-abas .tabs') ||
                   document.querySelector('details#meu-menu-abas .tabs') ||
                   null;
          }
        
          function colocarBotao() {
            var atual = sessao();
            var eAdmin = !!(atual && String(atual.perfil || '').toLowerCase() === 'admin');
            var existente = document.getElementById('p87Botao');
            if (!eAdmin) {
              if (existente && existente.parentNode) { existente.parentNode.removeChild(existente); }
              return;
            }
            var cx = caixaMenu();
            var b = existente || document.getElementById('p87Botao');
            if (!b) {
              b = document.createElement('button');
              b.id = 'p87Botao';
              b.type = 'button';
              b.textContent = 'Usu\u00e1rios cadastrados';
              b.setAttribute('title', 'Ver quem tem acesso ao painel neste computador');
              b.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                abrirUsuarios();
              });
            }
            if (cx) {
              if (b.parentNode !== cx) { cx.appendChild(b); }
              b.style.position = '';
            } else if (!b.parentNode) {
              b.style.cssText += ';position:fixed;right:14px;bottom:196px;z-index:2147482000;';
              document.body.appendChild(b);
            }
          }
        
          /* ================================================================ *
           * inicio
           * ================================================================ */
          function iniciar() {
            try { estilo(); } catch (e) { /* ignora */ }
            try { ligarReabrir(); } catch (e) { /* ignora */ }
            try { colocarBotao(); } catch (e) { /* ignora */ }
            setInterval(function () {
              try { colocarBotao(); } catch (e) { /* ignora */ }
            }, 2000);
        
            document.addEventListener('keydown', function (ev) {
              var k = ev.key || ev.keyCode;
              if (k !== 'Escape' && k !== 'Esc' && k !== 27) { return; }
              if (document.getElementById('p87Fundo')) {
                ev.stopPropagation();
                fecharTela();
              }
            }, true);
        
            window.p87Usuarios = function () { abrirUsuarios(); return true; };
            window.PainelUsuarios = { abrir: abrirUsuarios, lista: usuarios };
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        })();
    
