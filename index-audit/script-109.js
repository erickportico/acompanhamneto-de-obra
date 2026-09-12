
        /* =====================================================================
         * PATCH 145 - salvamento seguro na nuvem (conflito, aviso e nova tentativa)
         * ===================================================================== */
        (function () {
          'use strict';
          if (window.P145) { return; }
        
          var TABELA = 'painel_dados';
          var LINHA = 1;
          var ESPERA = 1200;                 /* junta pedidos de salvamento */
          var TENTATIVAS = [5000, 15000, 60000];
          var VIGIA = 30000;
        
          var conhecido = null;   /* hora do ultimo salvamento que este computador conhece */
          var pendente = false;   /* tem mudanca esperando ir para a nuvem */
          var salvando = false;
          var conflito = false;
          var erro = '';
          var tentativa = 0;
          var timerJuntar = null;
          var timerTentar = null;
          var enviados = 0;
          var original = window.sincronizarBancoNuvem;
        
          function bancoVivo() {
            try { if (typeof db === 'object' && db) { return db; } } catch (e) { }
            return (window.db && typeof window.db === 'object') ? window.db : null;
          }
          function cliente() { return window._supabase || null; }
          function status(txt, tipo) {
            try { if (typeof atualizarStatusNuvem === 'function') { atualizarStatusNuvem(txt, tipo); } } catch (e) { }
          }
          function hora(iso) {
            try { return new Date(iso).toLocaleTimeString('pt-BR'); } catch (e) { return String(iso || ''); }
          }
        
          /* ---------------- barra de aviso no alto da tela ---------------- */
          function barra() {
            var b = document.getElementById('p145Barra');
            if (b) { return b; }
            b = document.createElement('div');
            b.id = 'p145Barra';
            b.setAttribute('role', 'status');
            b.innerHTML = '<span class="p145txt"></span><span class="p145bt"></span>';
            (document.body || document.documentElement).appendChild(b);
            return b;
          }
          function mostrar(tipo, texto, botoes) {
            var b = barra();
            b.className = tipo;
            b.querySelector('.p145txt').textContent = texto;
            var area = b.querySelector('.p145bt');
            area.innerHTML = '';
            (botoes || []).forEach(function (bt) {
              var el = document.createElement('button');
              el.type = 'button';
              el.textContent = bt.texto;
              if (bt.leve) { el.className = 'p145fechar'; }
              el.addEventListener('click', bt.acao);
              area.appendChild(el);
            });
            b.style.display = 'block';
          }
          function esconder() {
            var b = document.getElementById('p145Barra');
            if (b) { b.style.display = 'none'; }
          }
        
          /* ---------------- ler a hora do ultimo salvamento na nuvem ---------------- */
          function horaDaNuvem() {
            var b = cliente();
            if (!b) { return Promise.resolve(null); }
            return Promise.resolve(b.from(TABELA).select('updated_at').eq('id', LINHA).limit(1))
              .then(function (r) {
                if (r && r.error) { throw r.error; }
                var linhas = (r && r.data) || [];
                return linhas.length ? (linhas[0].updated_at || null) : null;
              });
          }
        
          /* ---------------- baixar copia do meu banco (antes de sobrescrever) ---------------- */
          function baixarMeuBanco() {
            try {
              var vivo = bancoVivo();
              if (!vivo) { return ''; }
              var pacote = {
                formato: 'PAINEL_CONTROLE_OBRAS',
                versaoBanco: 'copia-antes-de-sobrescrever',
                dataExportacao: new Date().toISOString(),
                banco: JSON.parse(JSON.stringify(vivo))
              };
              var nome = 'Banco_deste_computador_' +
                new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
              var blob = new Blob([JSON.stringify(pacote)], { type: 'application/json;charset=utf-8' });
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url; a.download = nome;
              document.body.appendChild(a); a.click(); a.remove();
              setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { } }, 4000);
              return nome;
            } catch (e) { return ''; }
          }
        
          /* ---------------- avisos ---------------- */
          function avisarConflito(remoto) {
            conflito = true;
            mostrar('conflito',
              'Outra pessoa salvou na nuvem as ' + hora(remoto) + '. Suas mudancas ainda NAO foram enviadas. ' +
              'Escolha o que fazer para nao apagar o trabalho de ninguem.',
              [
                { texto: 'Enviar o meu por cima (baixa uma copia antes)', acao: function () {
                    var nome = baixarMeuBanco();
                    if (nome) { status('copia baixada: ' + nome, 'normal'); }
                    conflito = false;
                    esconder();
                    enviar(true);
                  } },
                { texto: 'Descartar o meu e recarregar', acao: function () {
                    if (window.confirm('Isto joga fora as mudancas deste computador que ainda nao foram enviadas. Continuar?')) {
                      location.reload();
                    }
                  } },
                { texto: 'Decido depois', leve: true, acao: esconder }
              ]);
            status('conflito com outro computador', 'erro');
          }
        
          function avisarErro(motivo) {
            erro = motivo;
            mostrar('erro',
              'NAO consegui salvar na nuvem: ' + motivo + '. Suas mudancas estao apenas neste computador. ' +
              'Vou tentar de novo sozinho.',
              [
                { texto: 'Tentar agora', acao: function () { tentativa = 0; enviar(false); } },
                { texto: 'Baixar copia do meu banco', acao: function () { baixarMeuBanco(); } },
                { texto: 'Esconder', leve: true, acao: esconder }
              ]);
            status('erro de salvamento', 'erro');
          }
        
          function avisarMudancaDeFora(remoto) {
            mostrar('aviso',
              'Outra pessoa salvou na nuvem as ' + hora(remoto) + '. Sua tela esta desatualizada ' +
              '(o painel nao acompanha mudancas em tempo real).',
              [
                { texto: 'Recarregar agora', acao: function () { location.reload(); } },
                { texto: 'Depois', leve: true, acao: esconder }
              ]);
          }
        
          function marcarSucesso(novaHora) {
            conhecido = novaHora;
            pendente = false;
            erro = '';
            tentativa = 0;
            conflito = false;
            enviados++;
            esconder();
            status('salvo na nuvem as ' + hora(novaHora), 'ok');
          }
        
          function agendarTentativa() {
            if (timerTentar) { return; }
            var espera = TENTATIVAS[Math.min(tentativa, TENTATIVAS.length - 1)];
            tentativa++;
            timerTentar = setTimeout(function () {
              timerTentar = null;
              enviar(false);
            }, espera);
          }
        
          /* ---------------- enviar de verdade ---------------- */
          function enviar(forcar) {
            if (salvando) { pendente = true; return Promise.resolve(false); }
            var b = cliente();
            var vivo = bancoVivo();
            if (!vivo) { return Promise.resolve(false); }
            if (!b) {
              pendente = true;
              avisarErro('a conexao com a nuvem nao esta configurada nesta pagina');
              return Promise.resolve(false);
            }
            salvando = true;
            pendente = true;
            status('salvando...', 'normal');
            var marca = new Date().toISOString();
        
            return horaDaNuvem()
              .then(function (remoto) {
                if (!forcar && conhecido && remoto && remoto !== conhecido) {
                  avisarConflito(remoto);
                  return false;
                }
                var linha = { id: LINHA, dados: vivo, updated_at: marca };
                return Promise.resolve(b.from(TABELA).upsert(linha)).then(function (r) {
                  if (r && r.error) { throw r.error; }
                  marcarSucesso(marca);
                  return true;
                });
              })
              .catch(function (e) {
                var motivo = (e && (e.message || e.details || e.hint)) || 'motivo nao informado';
                avisarErro(String(motivo));
                agendarTentativa();
                return false;
              })
              .then(function (ok) {
                salvando = false;
                return ok;
              });
          }
        
          /* ---------------- junta pedidos seguidos ---------------- */
          function pedirSalvamento() {
            pendente = true;
            if (timerJuntar) { clearTimeout(timerJuntar); }
            timerJuntar = setTimeout(function () {
              timerJuntar = null;
              enviar(false);
            }, ESPERA);
            return true;
          }
        
          /* troca a funcao antiga de sincronizar pela versao segura */
          window.sincronizarBancoNuvem = function () { return pedirSalvamento(); };
          window.P145_sincronizarAntigo = original;
        
          /* ---------------- vigia da nuvem ---------------- */
          function olharNuvem() {
            if (!cliente() || salvando || conflito) { return; }
            horaDaNuvem().then(function (remoto) {
              if (!remoto) { return; }
              if (conhecido === null) { conhecido = remoto; return; }
              if (remoto !== conhecido) {
                if (pendente) { avisarConflito(remoto); }
                else { avisarMudancaDeFora(remoto); }
              }
            }).catch(function () { });
          }
        
          /* ---------------- ligar tudo ---------------- */
          function ligar() {
            horaDaNuvem().then(function (remoto) {
              if (conhecido === null) { conhecido = remoto; }
            }).catch(function () { });
        
            setInterval(olharNuvem, VIGIA);
            window.addEventListener('focus', olharNuvem);
            document.addEventListener('visibilitychange', function () {
              if (!document.hidden) { olharNuvem(); }
            });
        
            window.addEventListener('online', function () {
              if (pendente) { tentativa = 0; enviar(false); }
            });
        
            window.addEventListener('beforeunload', function (ev) {
              if (pendente || conflito) {
                ev.preventDefault();
                ev.returnValue = 'Ainda ha mudancas que nao foram salvas na nuvem.';
                return ev.returnValue;
              }
            });
          }
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', ligar);
          } else {
            ligar();
          }
        
          window.P145 = {
            salvarAgora: function () { return enviar(false); },
            forcar: function () { return enviar(true); },
            olhar: olharNuvem,
            baixarCopia: baixarMeuBanco,
            estado: function () {
              return {
                pendente: pendente,
                salvando: salvando,
                conflito: conflito,
                erro: erro,
                tentativa: tentativa,
                horaConhecidaDaNuvem: conhecido,
                salvamentosFeitos: enviados
              };
            }
          };
        })();
    
