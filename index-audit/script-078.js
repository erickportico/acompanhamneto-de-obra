
        (function () {
          'use strict';
          if (window.__p112) { return; }
          window.__p112 = true;
        
          var KEY = 'painelAgendaObras_v1';
          var ESPELHO = 'p112_agenda_espelho_v1';
          var HIST = 'p112_agenda_hist_v1';
          var TUMBAS = 'p112_agenda_apagados_v1';
          var PREF = 'p112_prefs_v1';
          var MAX_HIST = 8;
          var JANELA_CLIQUE = 9000;
        
          var ultimoClique = 0;
          var setDireto = null;
        
          /* ---------------- utilidades ---------------- */
        
          function agora() { return new Date().getTime(); }
        
          function ler(chave) {
            try { return window.localStorage.getItem(chave); } catch (e) { return null; }
          }
        
          function gravar(chave, texto) {
            try {
              if (setDireto) { setDireto.call(window.localStorage, chave, texto); }
              else { window.localStorage.setItem(chave, texto); }
              return true;
            } catch (e) { return false; }
          }
        
          function lerJSON(chave, padrao) {
            try {
              var t = ler(chave);
              if (!t) { return padrao; }
              var o = JSON.parse(t);
              return (o === null || o === undefined) ? padrao : o;
            } catch (e) { return padrao; }
          }
        
          function gravarJSON(chave, valor) {
            try { return gravar(chave, JSON.stringify(valor)); } catch (e) { return false; }
          }
        
          function eLista(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
        
          function eventosDe(texto) {
            try {
              var o = JSON.parse(texto);
              if (!o) { return null; }
              if (eLista(o.eventos)) { return o; }
              if (eLista(o)) { return { eventos: o }; }
              return null;
            } catch (e) { return null; }
          }
        
          function quando(ev) {
            var t = Date.parse(String((ev && (ev.alteradoEm || ev.criadoEm)) || ''));
            return isNaN(t) ? 0 : t;
          }
        
          function texto(v) { return String(v == null ? '' : v); }
        
          function esc(v) {
            return texto(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          }
        
          function aviso(msg, erro) {
            var d = document.getElementById('p112Aviso');
            if (!d) {
              if (!document.body) { return; }
              d = document.createElement('div');
              d.id = 'p112Aviso';
              document.body.appendChild(d);
            }
            d.textContent = texto(msg);
            d.className = 'p112-on' + (erro ? ' p112-erro' : '');
            if (d.__t) { clearTimeout(d.__t); }
            d.__t = setTimeout(function () { d.className = ''; }, 3200);
          }
        
          /* ---------------- 1) rede de seguranca da gravacao ---------------- */
        
          function apagados() { return lerJSON(TUMBAS, {}) || {}; }
        
          function anotarApagados(ids) {
            if (!ids || !ids.length) { return; }
            var m = apagados(), i, t = new Date().toISOString();
            for (i = 0; i < ids.length; i++) { m[ids[i]] = t; }
            var chaves = Object.keys(m);
            if (chaves.length > 400) {
              chaves.sort(function (a, b) { return String(m[a]) < String(m[b]) ? -1 : 1; });
              while (chaves.length > 400) { delete m[chaves.shift()]; }
            }
            gravarJSON(TUMBAS, m);
          }
        
          function guardarEspelho(pacote) {
            if (!pacote || !eLista(pacote.eventos)) { return; }
            gravarJSON(ESPELHO, { eventos: pacote.eventos, em: new Date().toISOString() });
            var h = lerJSON(HIST, []) || [];
            if (!eLista(h)) { h = []; }
            h.push({ em: new Date().toISOString(), eventos: pacote.eventos });
            while (h.length > MAX_HIST) { h.shift(); }
            gravarJSON(HIST, h);
          }
        
          function espelho() {
            var o = lerJSON(ESPELHO, null);
            if (o && eLista(o.eventos)) { return o.eventos; }
            return [];
          }
        
          /* junta duas listas de compromissos: fica o mais recente de cada um,
             e o que o usuario apagou de proposito nao volta */
          function juntar(a, b) {
            var mortos = apagados();
            var mapa = {}, ordem = [], i, ev, id, atual;
            function por(lista) {
              if (!eLista(lista)) { return; }
              for (i = 0; i < lista.length; i++) {
                ev = lista[i];
                if (!ev || typeof ev !== 'object' || !ev.data) { continue; }
                id = texto(ev.id) || ('sem_' + texto(ev.titulo) + '_' + texto(ev.data));
                if (mortos[id]) { continue; }
                atual = mapa[id];
                if (!atual) { mapa[id] = ev; ordem.push(id); }
                else if (quando(ev) >= quando(atual)) { mapa[id] = ev; }
              }
            }
            por(a); por(b);
            var saida = [];
            for (i = 0; i < ordem.length; i++) { saida.push(mapa[ordem[i]]); }
            return saida;
          }
        
          function idsDe(lista) {
            var m = {}, i;
            if (!eLista(lista)) { return m; }
            for (i = 0; i < lista.length; i++) {
              if (lista[i] && lista[i].id) { m[texto(lista[i].id)] = 1; }
            }
            return m;
          }
        
          function sumidos(antes, depois) {
            var d = idsDe(depois), fora = [], i;
            if (!eLista(antes)) { return fora; }
            for (i = 0; i < antes.length; i++) {
              var id = antes[i] && texto(antes[i].id);
              if (id && !d[id]) { fora.push(id); }
            }
            return fora;
          }
        
          /* vigia a gravacao da agenda: nada de perder compromissos por acidente */
          function filtrar(chave, valor, aplicar) {
            var novo = eventosDe(texto(valor));
            if (!novo) { return valor; }
        
            /* o que voce apagou de proposito nao volta, nem pela nuvem */
            var mortos = apagados();
            var limpos = [], k;
            for (k = 0; k < novo.eventos.length; k++) {
              var it = novo.eventos[k];
              if (it && it.id && mortos[texto(it.id)]) { continue; }
              limpos.push(it);
            }
            novo.eventos = limpos;
        
            var guardados = espelho();
            var perdidos = sumidos(guardados, novo.eventos);
        
            if (perdidos.length) {
              var deProposito = (agora() - ultimoClique) < JANELA_CLIQUE;
              if (deProposito) {
                anotarApagados(perdidos);
              } else {
                /* alguem (nuvem, recarga, outra tela) tentou apagar sem o usuario pedir:
                   junta tudo em vez de perder */
                novo.eventos = juntar(guardados, novo.eventos);
                aviso('Recuperei ' + perdidos.length + ' compromisso(s) da agenda.');
              }
            }
        
            var texto2 = valor;
            try { texto2 = JSON.stringify(novo); } catch (e) {}
            if (aplicar) {
              guardarEspelho(novo);
              espelharNoBanco(texto2);
            }
            return texto2;
          }
        
          function envolverGravador(dono, nome) {
            var original = dono[nome];
            if (typeof original !== 'function' || original.__p112) { return null; }
            var envolvido = function (chave, valor) {
              if (texto(chave) !== KEY) { return original.apply(this, arguments); }
              var bom = filtrar(chave, valor, false);
              var r = original.call(this, chave, bom);
              guardarEspelho(eventosDe(bom) || { eventos: [] });
              espelharNoBanco(bom);
              return r;
            };
            envolvido.__p112 = true;
            dono[nome] = envolvido;
            return original;
          }
        
          function protegerGravacao() {
            var P = window.Storage && window.Storage.prototype;
            if (P) {
              var orig = envolverGravador(P, 'setItem');
              if (orig && !setDireto) { setDireto = orig; }
            }
            /* alguns patches trocam a gravacao na propria localStorage:
               protege esse caminho tambem */
            try {
              var L = window.localStorage;
              if (L && Object.prototype.hasOwnProperty.call(L, 'setItem')) {
                var o2 = envolverGravador(L, 'setItem');
                if (o2 && !setDireto) {
                  setDireto = function (c, v) { return o2.call(window.localStorage, c, v); };
                }
              }
            } catch (e) {}
          }
        
          /* patches que rodam depois podem trocar a gravacao de novo: reforca */
          function reforcarProtecao() {
            var voltas = 0;
            var t = setInterval(function () {
              voltas++;
              protegerGravacao();
              if (voltas >= 10) { clearInterval(t); }
            }, 1500);
          }
        
          function espelharNoBanco(txt) {
            try {
              if (window.db && typeof window.db === 'object') { window.db.agendaObras = txt; }
            } catch (e) {}
          }
        
          /* marca que o clique partiu do usuario (excluir de verdade) */
          function vigiarCliques() {
            document.addEventListener('click', function (ev) {
              var alvo = ev.target && ev.target.closest ? ev.target.closest('[data-ag]') : null;
              if (!alvo) { return; }
              var acao = alvo.getAttribute('data-ag');
              if (acao === 'excluir' || acao === 'excluir-lista') { ultimoClique = agora(); }
            }, true);
          }
        
          /* ao abrir o painel: se a agenda estiver vazia mas o espelho tiver dados, devolve */
          function restaurar() {
            var guardados = espelho();
            var atual = eventosDe(ler(KEY) || '');
            var lista = atual && eLista(atual.eventos) ? atual.eventos : [];
            var doBanco = null;
            try {
              if (window.db && typeof window.db.agendaObras === 'string') {
                doBanco = eventosDe(window.db.agendaObras);
              }
            } catch (e) {}
            var extra = doBanco && eLista(doBanco.eventos) ? doBanco.eventos : [];
        
            var completo = juntar(juntar(guardados, extra), lista);
            if (completo.length <= lista.length && lista.length) { guardarEspelho({ eventos: lista }); return false; }
            if (!completo.length) { return false; }
        
            var pacote = atual && typeof atual === 'object' ? atual : { eventos: [] };
            pacote.eventos = completo;
            if (gravar(KEY, JSON.stringify(pacote))) {
              guardarEspelho(pacote);
              espelharNoBanco(JSON.stringify(pacote));
              var faltavam = completo.length - lista.length;
              aviso('Agenda recuperada: ' + faltavam + ' compromisso(s) de volta.');
              redesenhar();
              return true;
            }
            return false;
          }
        
          function redesenhar() {
            try {
              var aba = document.getElementById('tab-agenda');
              if (aba && aba.style.display !== 'none' && typeof window.abrirAgendaObras === 'function') {
                window.abrirAgendaObras();
              }
            } catch (e) {}
          }
        
          function vigiarRestauracao() {
            var voltas = 0;
            var t = setInterval(function () {
              voltas++;
              restaurar();
              if (voltas >= 6) { clearInterval(t); }
            }, 2500);
          }
        
          /* ---------------- 2) avisos: WhatsApp e Agenda Google ---------------- */
        
          function prefs() {
            var o = lerJSON(PREF, null);
            if (!o || typeof o !== 'object') { o = {}; }
            return { wa: !!o.wa, gc: !!o.gc, tel: texto(o.tel) };
          }
        
          function salvarPrefs(p) { gravarJSON(PREF, { wa: !!p.wa, gc: !!p.gc, tel: texto(p.tel) }); }
        
          function so2(n) { return (n < 10 ? '0' : '') + n; }
        
          function dataBR(s) {
            var p = texto(s).split('-');
            if (p.length !== 3) { return texto(s); }
            return p[2] + '/' + p[1] + '/' + p[0];
          }
        
          function telLimpo(v) {
            var d = texto(v).replace(/[^0-9]/g, '');
            if (!d) { return ''; }
            if (d.length >= 10 && d.length <= 11) { d = '55' + d; }
            return d;
          }
        
          function nomeObra(id) {
            try {
              var l = (window.db && window.db.obras) || [];
              for (var i = 0; i < l.length; i++) {
                if (l[i] && l[i].id === id) { return texto(l[i].nome); }
              }
            } catch (e) {}
            return '';
          }
        
          function recado(ev) {
            var l = [];
            l.push('*Agenda de Obras - ' + texto(ev.titulo) + '*');
            l.push('Data: ' + dataBR(ev.data) + (ev.hora ? ('  as ' + texto(ev.hora)) : '') +
                   (ev.horaFim ? (' - ' + texto(ev.horaFim)) : ''));
            var ob = nomeObra(ev.obraId);
            if (ob) { l.push('Obra: ' + ob); }
            if (ev.local) { l.push('Local: ' + texto(ev.local)); }
            if (ev.responsavel) { l.push('Responsavel: ' + texto(ev.responsavel)); }
            if (ev.obs) { l.push('Obs.: ' + texto(ev.obs)); }
            return l.join('\n');
          }
        
          function horaPartes(h, padraoH, padraoM) {
            var p = texto(h).split(':');
            var hh = parseInt(p[0], 10);
            var mm = parseInt(p[1], 10);
            if (isNaN(hh)) { hh = padraoH; }
            if (isNaN(mm)) { mm = padraoM; }
            return [hh, mm];
          }
        
          function seloGoogle(dia, hh, mm) {
            var p = texto(dia).split('-');
            if (p.length !== 3) { return ''; }
            return p[0] + p[1] + p[2] + 'T' + so2(hh) + so2(mm) + '00';
          }
        
          function repeticaoGoogle(ev) {
            var r = texto(ev.repetir);
            var regra = '';
            if (r === 'semanal') { regra = 'FREQ=WEEKLY'; }
            else if (r === 'quinzenal') { regra = 'FREQ=WEEKLY;INTERVAL=2'; }
            else if (r === 'mensal') { regra = 'FREQ=MONTHLY'; }
            if (!regra) { return ''; }
            var ate = texto(ev.repetirAte).split('-');
            if (ate.length === 3) { regra += ';UNTIL=' + ate[0] + ate[1] + ate[2] + 'T235900Z'; }
            return 'RRULE:' + regra;
          }
        
          function linkWhats(ev, tel) {
            var msg = encodeURIComponent(recado(ev));
            var d = telLimpo(tel);
            if (d) { return 'https://wa.me/' + d + '?text=' + msg; }
            return 'https://wa.me/?text=' + msg;
          }
        
          function linkGoogle(ev) {
            var ini = horaPartes(ev.hora, 8, 0);
            var fim = horaPartes(ev.horaFim, ini[0] + 1, ini[1]);
            var d1 = seloGoogle(ev.data, ini[0], ini[1]);
            var d2 = seloGoogle(ev.data, fim[0], fim[1]);
            if (!d1) { return ''; }
            var det = [];
            var ob = nomeObra(ev.obraId);
            if (ob) { det.push('Obra: ' + ob); }
            if (ev.responsavel) { det.push('Responsavel: ' + texto(ev.responsavel)); }
            if (ev.obs) { det.push(texto(ev.obs)); }
            det.push('(criado pelo Painel de Obras)');
            var u = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
              '&text=' + encodeURIComponent(texto(ev.titulo)) +
              '&dates=' + d1 + '/' + (d2 || d1) +
              '&details=' + encodeURIComponent(det.join('\n')) +
              '&location=' + encodeURIComponent(texto(ev.local));
            var rec = repeticaoGoogle(ev);
            if (rec) { u += '&recur=' + encodeURIComponent(rec); }
            return u;
          }
        
          function abrirLink(u) {
            if (!u) { return; }
            try { window.open(u, '_blank', 'noopener'); } catch (e) { window.location.href = u; }
          }
        
          /* ---------------- caixa de escolha (WhatsApp / Google / os dois) ---------------- */
        
          function caixa() {
            var c = document.getElementById('p112Caixa');
            if (c) { return c; }
            if (!document.body) { return null; }
            c = document.createElement('div');
            c.id = 'p112Caixa';
            c.innerHTML =
              '<div class="p112-cx">' +
                '<h4 id="p112Titulo">Compromisso salvo</h4>' +
                '<p id="p112Texto"></p>' +
                '<div class="p112-bts">' +
                  '<button type="button" data-p112="fechar">Nao avisar agora</button>' +
                  '<button type="button" class="p112-wa" data-p112="wa">WhatsApp</button>' +
                  '<button type="button" class="p112-gc" data-p112="gc">Agenda Google</button>' +
                  '<button type="button" data-p112="ambos">Os dois</button>' +
                '</div>' +
              '</div>';
            document.body.appendChild(c);
            c.addEventListener('click', function (e) {
              if (e.target === c) { fecharCaixa(); return; }
              var b = e.target && e.target.closest ? e.target.closest('[data-p112]') : null;
              if (!b) { return; }
              var acao = b.getAttribute('data-p112');
              var ev = c.__ev;
              var tel = c.__tel;
              if (acao === 'fechar') { fecharCaixa(); return; }
              if (acao === 'wa' || acao === 'ambos') { abrirLink(linkWhats(ev, tel)); }
              if (acao === 'gc' || acao === 'ambos') { abrirLink(linkGoogle(ev)); }
              fecharCaixa();
              aviso('Aviso preparado. Confira a janela que abriu.');
            });
            return c;
          }
        
          function fecharCaixa() {
            var c = document.getElementById('p112Caixa');
            if (c) { c.classList.remove('p112-on'); c.__ev = null; }
          }
        
          function abrirCaixa(ev, tel) {
            var c = caixa();
            if (!c) { return; }
            c.__ev = ev;
            c.__tel = tel;
            var t = document.getElementById('p112Texto');
            if (t) {
              t.innerHTML = '<b>' + esc(ev.titulo) + '</b><br>' + esc(dataBR(ev.data)) +
                (ev.hora ? (' as ' + esc(ev.hora)) : '') +
                '<br>Como voce quer avisar? Pode escolher um ou os dois.';
            }
            c.classList.add('p112-on');
          }
        
          /* ---------------- opcoes dentro da janela do compromisso ---------------- */
        
          function montarOpcoes() {
            var form = document.querySelector('#agModal .ag-form');
            if (!form || document.getElementById('p112Bloco')) { return; }
            var p = prefs();
            var d = document.createElement('div');
            d.className = 'p112-linha';
            d.id = 'p112Bloco';
            d.innerHTML =
              '<b>Avisar depois de salvar</b>' +
              '<label class="p112-op"><input type="checkbox" id="p112Wa">' +
                'Enviar mensagem no WhatsApp</label>' +
              '<label class="p112-op"><input type="checkbox" id="p112Gc">' +
                'Lancar na Agenda Google</label>' +
              '<div class="p112-tel"><label>Telefone do WhatsApp (opcional, com DDD)</label>' +
                '<input type="text" id="p112Tel" maxlength="20" placeholder="Ex.: 11988887777"></div>';
            form.appendChild(d);
            var wa = document.getElementById('p112Wa');
            var gc = document.getElementById('p112Gc');
            var tel = document.getElementById('p112Tel');
            if (wa) { wa.checked = p.wa; }
            if (gc) { gc.checked = p.gc; }
            if (tel) { tel.value = p.tel; }
          }
        
          function opcoesAtuais() {
            var wa = document.getElementById('p112Wa');
            var gc = document.getElementById('p112Gc');
            var tel = document.getElementById('p112Tel');
            return {
              wa: !!(wa && wa.checked),
              gc: !!(gc && gc.checked),
              tel: tel ? texto(tel.value) : ''
            };
          }
        
          function eventoSalvo(titulo, data) {
            var pacote = eventosDe(ler(KEY) || '');
            var lista = pacote && eLista(pacote.eventos) ? pacote.eventos : [];
            var achado = null, i;
            for (i = 0; i < lista.length; i++) {
              var ev = lista[i];
              if (!ev) { continue; }
              if (texto(ev.titulo) === titulo && texto(ev.data) === data) {
                if (!achado || quando(ev) >= quando(achado)) { achado = ev; }
              }
            }
            return achado;
          }
        
          function vigiarSalvar() {
            document.addEventListener('click', function (e) {
              var b = e.target && e.target.closest ? e.target.closest('[data-ag="salvar"]') : null;
              if (!b) { return; }
              var t = document.getElementById('agfTitulo');
              var dt = document.getElementById('agfData');
              if (!t || !dt) { return; }
              var titulo = texto(t.value).replace(/^\s+|\s+$/g, '');
              var data = texto(dt.value);
              var op = opcoesAtuais();
              salvarPrefs(op);
              if (!titulo || !data) { return; }
              if (!op.wa && !op.gc) { return; }
        
              setTimeout(function () {
                var ev = eventoSalvo(titulo, data);
                if (!ev) { return; }
                if (op.wa && op.gc) { abrirCaixa(ev, op.tel); return; }
                if (op.wa) { abrirLink(linkWhats(ev, op.tel)); }
                else { abrirLink(linkGoogle(ev)); }
                aviso('Compromisso salvo e aviso preparado.');
              }, 420);
            }, true);
          }
        
          /* as opcoes tem que aparecer sempre que a janela do compromisso abrir */
          function vigiarJanela() {
            montarOpcoes();
            var t = setInterval(function () {
              if (document.querySelector('#agModal .ag-form')) { montarOpcoes(); }
            }, 1500);
            try {
              var obs = new MutationObserver(function () {
                if (document.querySelector('#agModal .ag-form')) { montarOpcoes(); }
              });
              if (document.body) {
                obs.observe(document.body, { childList: true, subtree: true });
              }
            } catch (e) {}
            setTimeout(function () { clearInterval(t); }, 60000);
          }
        
          /* ---------------- ferramenta manual: avisar um compromisso existente ---------------- */
        
          window.PainelAvisarCompromisso = function (idOuTitulo) {
            var pacote = eventosDe(ler(KEY) || '');
            var lista = pacote && eLista(pacote.eventos) ? pacote.eventos : [];
            var alvo = null, i;
            for (i = 0; i < lista.length; i++) {
              if (!lista[i]) { continue; }
              if (texto(lista[i].id) === texto(idOuTitulo) ||
                  texto(lista[i].titulo) === texto(idOuTitulo)) { alvo = lista[i]; break; }
            }
            if (!alvo) { aviso('Nao achei esse compromisso.', true); return false; }
            abrirCaixa(alvo, prefs().tel);
            return true;
          };
        
          window.PainelAgendaSalva = function () {
            var pacote = eventosDe(ler(KEY) || '');
            var lista = pacote && eLista(pacote.eventos) ? pacote.eventos : [];
            return { agora: lista.length, guardados: espelho().length };
          };
        
          /* ---------------- inicio ---------------- */
        
          function iniciar() {
            protegerGravacao();
            reforcarProtecao();
            vigiarCliques();
            vigiarSalvar();
            vigiarJanela();
            setTimeout(restaurar, 1200);
            vigiarRestauracao();
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        })();
    
