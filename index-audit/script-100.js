
        /* =====================================================================
         * PATCH 136 - acesso das pessoas + abas novas destravadas
         * ===================================================================== */
        (function () {
          'use strict';
          if (window.__p136) { return; }
          window.__p136 = true;
        
          var CORE = ['itens', 'liberacao', 'medicoes', 'graficos', 'recebimento',
                      'cronograma', 'pagamento', 'ctm', 'custo', 'fpdo'];
        
          function porId(x) { return document.getElementById(x); }
        
          function esc(v) {
            return String(v === undefined || v === null ? '' : v)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
          }
        
          function cliente() {
            try { if (typeof _supabase !== 'undefined' && _supabase) { return _supabase; } } catch (e) { }
            if (window._supabase) { return window._supabase; }
            if (window.supabaseClient) { return window.supabaseClient; }
            if (window.supabase && window.supabase.from) { return window.supabase; }
            return null;
          }
        
          function sessao() {
            try {
              if (window.PainelNucleo && typeof window.PainelNucleo.sessao === 'function') {
                return window.PainelNucleo.sessao();
              }
            } catch (e) { }
            var bruto = null;
            try { bruto = sessionStorage.getItem('painel_seg_sessao_v1'); } catch (e2) { }
            if (!bruto) { try { bruto = localStorage.getItem('painel_seg_sessao_v1'); } catch (e3) { } }
            if (!bruto) { return null; }
            try { return JSON.parse(bruto); } catch (e4) { return null; }
          }
        
          function souAdmin() {
            var s = sessao();
            return !!(s && String(s.perfil || '').toLowerCase() === 'admin');
          }
        
          function nomeTipo(p) {
            var v = String(p || '').toLowerCase();
            if (v === 'admin') { return 'Administrador'; }
            if (v === 'editor') { return 'Pode lancar e editar'; }
            return 'Somente consulta';
          }
        
          /* ================================================================ *
           * 1) salvar tipo de acesso e pedir nova senha
           * ================================================================ */
          function acharUsuario(email) {
            var lista = window.__p136Lista || window.__p87ListaSupabase || [];
            var alvo = String(email || '').trim().toLowerCase();
            var i;
            for (i = 0; i < lista.length; i++) {
              var u = lista[i] || {};
              var e = String(u.email || u.usuario || '').trim().toLowerCase();
              if (e === alvo) { return u; }
            }
            return null;
          }
        
          function salvarTipo(email, tipo) {
            var u = acharUsuario(email);
            if (!souAdmin()) {
              return Promise.reject(new Error('Somente administrador troca tipo de acesso.'));
            }
            var ponte = window.PainelAuthSupabase;
            if (u && u.id && ponte && typeof ponte.salvarPerfil === 'function') {
              return Promise.resolve(ponte.salvarPerfil(u.id, tipo, u.ativo === false ? false : true));
            }
            var sb = cliente();
            if (!sb) { return Promise.reject(new Error('O painel nao esta falando com o servidor agora.')); }
            var q = sb.from('painel_perfis').update({ perfil: tipo });
            q = (u && u.id) ? q.eq('id', u.id) : q.eq('email', String(email || '').toLowerCase());
            return Promise.resolve(q).then(function (r) {
              if (r && r.error) {
                throw new Error(r.error.message || 'O servidor recusou a troca.');
              }
              return true;
            });
          }
        
          function conferirNoServidor(email) {
            var sb = cliente();
            if (!sb) { return Promise.resolve(null); }
            return Promise.resolve(
              sb.from('painel_perfis').select('perfil,ativo').eq('email', String(email || '').toLowerCase()).limit(1)
            ).then(function (r) {
              if (r && r.error) { return null; }
              var d = (r && r.data) ? r.data[0] : null;
              return d || null;
            }).catch(function () { return null; });
          }
        
          function pedirNovaSenha(email) {
            var sb = cliente();
            if (!sb || !sb.auth || typeof sb.auth.resetPasswordForEmail !== 'function') {
              return Promise.reject(new Error('Este painel nao tem a porta de troca de senha do servidor.'));
            }
            var alvo = String(email || '').trim().toLowerCase();
            if (alvo.indexOf('@') < 1) {
              return Promise.reject(new Error('Esta conta nao tem e-mail: sem e-mail o link nao pode ser enviado.'));
            }
            return Promise.resolve(sb.auth.resetPasswordForEmail(alvo)).then(function (r) {
              if (r && r.error) { throw new Error(r.error.message || 'O servidor nao enviou o link.'); }
              return true;
            });
          }
        
          window.P136 = window.P136 || {};
          window.P136.salvarTipo = salvarTipo;
          window.P136.novaSenha = pedirNovaSenha;
        
          /* ================================================================ *
           * 2) devolver os controles na tela de usuarios
           * ================================================================ */
          function recado(cel, txt, ok) {
            var d = cel.querySelector('.p136-rec');
            if (!d) {
              d = document.createElement('div');
              d.className = 'p136-rec';
              cel.appendChild(d);
            }
            d.className = 'p136-rec ' + (ok ? 'ok' : 'er');
            d.textContent = txt;
          }
        
          function emailDaLinha(tr) {
            var cels = tr.getElementsByTagName('td');
            if (cels.length < 3) { return ''; }
            var t = String(cels[1].textContent || '').replace(/admin/gi, '').trim();
            var m = t.match(/[^\s]+@[^\s]+/);
            return m ? m[0] : t;
          }
        
          function montarLinha(tr) {
            if (tr.getAttribute('data-p136') === '1') { return; }
            var cels = tr.getElementsByTagName('td');
            if (cels.length < 5) { return; }
            var email = emailDaLinha(tr);
            if (!email) { return; }
            tr.setAttribute('data-p136', '1');
        
            var celTipo = cels[2];
            var atual = String(celTipo.textContent || '').toLowerCase();
            var valor = atual.indexOf('administrador') >= 0 ? 'admin'
                      : (atual.indexOf('lan') >= 0 ? 'editor' : 'visitante');
            var u = acharUsuario(email);
            if (u && u.perfil) { valor = String(u.perfil).toLowerCase(); }
        
            var sel = document.createElement('select');
            sel.className = 'p136-sel';
            ['visitante', 'editor', 'admin'].forEach(function (v) {
              var o = document.createElement('option');
              o.value = v;
              o.textContent = nomeTipo(v);
              if (v === valor) { o.selected = true; }
              sel.appendChild(o);
            });
            celTipo.innerHTML = '';
            celTipo.appendChild(sel);
        
            var celAc = cels[cels.length - 1];
            celAc.innerHTML = '';
            var bs = document.createElement('button');
            bs.type = 'button';
            bs.className = 'p136-btn pri';
            bs.textContent = 'Salvar acesso';
            var bn = document.createElement('button');
            bn.type = 'button';
            bn.className = 'p136-btn';
            bn.textContent = 'Nova senha';
            celAc.appendChild(bs);
            celAc.appendChild(bn);
        
            bs.addEventListener('click', function () {
              bs.disabled = true;
              recado(celAc, 'salvando...', true);
              salvarTipo(email, sel.value).then(function () {
                return conferirNoServidor(email);
              }).then(function (d) {
                bs.disabled = false;
                if (d && String(d.perfil || '').toLowerCase() !== sel.value) {
                  recado(celAc, 'o servidor manteve ' + nomeTipo(d.perfil) + ': a regra dele nao deixou trocar.', false);
                  return;
                }
                if (u) { u.perfil = sel.value; }
                recado(celAc, 'pronto. A pessoa ve a mudanca ao recarregar o painel.', true);
              }).catch(function (e) {
                bs.disabled = false;
                recado(celAc, (e && e.message) ? e.message : 'nao consegui salvar.', false);
              });
            });
        
            bn.addEventListener('click', function () {
              bn.disabled = true;
              recado(celAc, 'enviando o link...', true);
              pedirNovaSenha(email).then(function () {
                bn.disabled = false;
                recado(celAc, 'link enviado para ' + email + '. A propria pessoa escolhe a senha nova.', true);
              }).catch(function (e) {
                bn.disabled = false;
                recado(celAc, (e && e.message) ? e.message : 'nao consegui enviar o link.', false);
              });
            });
          }
        
          function melhorar() {
            if (!souAdmin()) { return 0; }
            var tabs = document.querySelectorAll('table.p87-tab');
            var quantos = 0;
            Array.prototype.forEach.call(tabs, function (t) {
              var trs = t.querySelectorAll('tbody tr');
              Array.prototype.forEach.call(trs, function (tr) {
                montarLinha(tr);
                quantos = quantos + 1;
              });
            });
            return quantos;
          }
        
          /* ================================================================ *
           * 3) abas novas destravadas (e administrador abre tudo)
           * ================================================================ */
          function abasNaTela() {
            var saida = [];
            var nos = document.querySelectorAll('[id^="tab-"]');
            Array.prototype.forEach.call(nos, function (n) {
              var id = String(n.id || '').replace(/^tab-/, '');
              if (id && saida.indexOf(id) < 0) { saida.push(id); }
            });
            return saida;
          }
        
          function limparAvisoDePermissao() {
            var avisos = document.querySelectorAll('.p87-aviso');
            Array.prototype.forEach.call(avisos, function (a) {
              var t = String(a.textContent || '').toLowerCase();
              if (t.indexOf('permiss') >= 0 && t.indexOf('aba') >= 0) {
                if (a.parentNode) { a.parentNode.removeChild(a); }
              }
            });
          }
        
          function trocaManual(aba) {
            var alvo = porId('tab-' + aba);
            var nos = document.querySelectorAll('[id^="tab-"]');
            Array.prototype.forEach.call(nos, function (n) {
              if (n !== alvo) { n.style.display = 'none'; }
            });
            if (alvo) { alvo.style.display = 'block'; }
            var bts = document.querySelectorAll('.tab-btn');
            Array.prototype.forEach.call(bts, function (b) { b.classList.remove('active'); });
            var meu = porId('btn-tab-' + aba);
            if (meu) { meu.classList.add('active'); }
            var menu = porId('meu-menu-abas');
            if (menu) { try { menu.removeAttribute('open'); } catch (e) { } }
        
            try {
              if (aba === 'obraflow' && window.OF && typeof window.OF.abrir === 'function') {
                window.OF.abrir();
              } else if (aba === 'p118dash' && typeof window.p118AbrirDashboard === 'function') {
                window.p118AbrirDashboard();
              } else if (aba === 'cronograma' && typeof window.initCronograma === 'function') {
                window.initCronograma();
              } else if (aba === 'custo' && typeof window.initCustoTab === 'function') {
                window.initCustoTab();
              }
            } catch (e2) { }
            try { if (typeof window.render === 'function') { window.render(); } } catch (e3) { }
            return true;
          }
        
          function destravar() {
            var antiga = window.trocarAba;
            if (typeof antiga !== 'function' || antiga.__p136) { return false; }
            var nova = function (aba) {
              var id = String(aba || '');
              var euPosso = souAdmin() || CORE.indexOf(id) < 0;
              var r;
              try { r = antiga.apply(this, arguments); } catch (e) { r = false; }
              if (r === false && euPosso) {
                limparAvisoDePermissao();
                setTimeout(limparAvisoDePermissao, 60);
                return trocaManual(id);
              }
              return r;
            };
            nova.__p136 = true;
            var k;
            for (k in antiga) {
              if (Object.prototype.hasOwnProperty.call(antiga, k)) {
                try { nova[k] = antiga[k]; } catch (e4) { }
              }
            }
            try { window.trocarAba = nova; } catch (e5) { }
            try { trocarAba = nova; } catch (e6) { }
            return true;
          }
        
          window.P136.abrir = function (aba) {
            try { return window.trocarAba(aba); } catch (e) { return trocaManual(String(aba || '')); }
          };
        
          window.P136.conferir = function () {
            var s = sessao();
            var d = {
              quemEstaLogado: s ? (s.usuario || s.email || '') : '(ninguem)',
              tipoDeAcesso: nomeTipo(s ? s.perfil : ''),
              souAdministrador: souAdmin(),
              falaComOServidor: !!cliente(),
              portaDeTipoDeAcesso: !!(window.PainelAuthSupabase &&
                typeof window.PainelAuthSupabase.salvarPerfil === 'function'),
              abasQueExistem: abasNaTela(),
              trancaDestravada: !!(window.trocarAba && window.trocarAba.__p136),
              linhasAjustadas: melhorar()
            };
            try { console.log('[P136]', d); } catch (e) { }
            return d;
          };
        
          /* ================================================================ *
           * 4) ligar
           * ================================================================ */
          var pendente = null;
        
          function olhar() {
            if (pendente) { return; }
            pendente = setTimeout(function () {
              pendente = null;
              try { melhorar(); } catch (e) { }
              try { destravar(); } catch (e2) { }
            }, 160);
          }
        
          function ligar() {
            destravar();
            melhorar();
            try {
              if (window.MutationObserver && document.body) {
                var ob = new MutationObserver(function () { olhar(); });
                ob.observe(document.body, { childList: true, subtree: true });
                window.__p136Olho = ob;
              }
            } catch (e) { }
            try {
              console.log('[PATCH136] acesso das pessoas e abas novas liberadas. Use P136.conferir()');
            } catch (e2) { }
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { setTimeout(ligar, 800); });
          } else {
            setTimeout(ligar, 800);
          }
        }());
    
