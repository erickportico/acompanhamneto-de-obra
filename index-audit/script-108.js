
        /* =====================================================================
         * PATCH 144 - importacao de banco (JSON) com conferencia e desfazer
         * ===================================================================== */
        (function () {
          'use strict';
          if (window.P144) { return; }
        
          var GLOBAIS_PRESERVADAS = ['config', 'agendaObras', 'obraAtualId', 'versaoBanco'];
          var conferencia = null;
          var anterior = null;   /* copia do banco de antes, para desfazer na sessao */
        
          /* pega o banco vivo (o mesmo objeto que o painel usa) */
          function bancoVivo() {
            try { if (typeof db === 'object' && db) { return db; } } catch (e) { }
            return (window.db && typeof window.db === 'object') ? window.db : null;
          }
        
          function copia(o) { return JSON.parse(JSON.stringify(o)); }
        
          /* ---------- reconhecer o formato do arquivo ---------- */
          function pareceObra(o) {
            if (!o || typeof o !== 'object' || Array.isArray(o)) { return false; }
            var temCodigo = (o.id !== undefined && o.id !== null && o.id !== '');
            var temCara = (typeof o.nome === 'string') || Array.isArray(o.itens) ||
                          o.valorContrato !== undefined || Array.isArray(o.recebimentos);
            return temCodigo && temCara;
          }
        
          function proporcaoDeObras(lista) {
            if (!lista.length) { return 0; }
            var bons = 0, i;
            for (i = 0; i < lista.length; i++) { if (pareceObra(lista[i])) { bons++; } }
            return bons / lista.length;
          }
        
          function reconhecer(conteudo) {
            if (!conteudo || typeof conteudo !== 'object') {
              return { erro: 'O arquivo nao tem o formato de um banco do painel.' };
            }
            if (conteudo.formato === 'PAINEL_CONTROLE_OBRAS' && conteudo.banco &&
                Array.isArray(conteudo.banco.obras)) {
              return { banco: conteudo.banco, formato: 'pacote exportado pelo painel' };
            }
            if (conteudo.banco && Array.isArray(conteudo.banco.obras)) {
              return { banco: conteudo.banco, formato: 'banco dentro de "banco"' };
            }
            if (conteudo.db && Array.isArray(conteudo.db.obras)) {
              return { banco: conteudo.db, formato: 'banco dentro de "db"' };
            }
            if (Array.isArray(conteudo.obras)) {
              return { banco: conteudo, formato: 'banco direto (com obras)' };
            }
            if (Array.isArray(conteudo) && proporcaoDeObras(conteudo) >= 0.8) {
              return { banco: { obras: conteudo }, formato: 'lista solta de obras' };
            }
            if (Array.isArray(conteudo)) {
              return { erro: 'O arquivo tem uma lista, mas as linhas nao parecem obras ' +
                             '(faltam codigo e nome). Nao vou trocar o banco por seguranca.' };
            }
            return { erro: 'Nao achei a lista de obras neste arquivo. Use um arquivo ' +
                           'exportado pelo proprio painel (botao de exportar banco).' };
          }
        
          /* ---------- conferir o conteudo ---------- */
          function conferir(banco, atual) {
            var obras = banco.obras || [];
            var itens = 0, semCodigo = 0, semNome = 0, i;
            for (i = 0; i < obras.length; i++) {
              if (!obras[i] || obras[i].id === undefined || obras[i].id === null || obras[i].id === '') { semCodigo++; }
              if (!obras[i] || !obras[i].nome) { semNome++; }
              itens += (obras[i] && Array.isArray(obras[i].itens)) ? obras[i].itens.length : 0;
            }
            var obrasAtuais = (atual && Array.isArray(atual.obras)) ? atual.obras.length : 0;
            var itensAtuais = 0;
            if (atual && Array.isArray(atual.obras)) {
              atual.obras.forEach(function (o) { itensAtuais += (o && Array.isArray(o.itens)) ? o.itens.length : 0; });
            }
            var preservadas = [];
            GLOBAIS_PRESERVADAS.forEach(function (k) {
              if (atual && atual[k] !== undefined && banco[k] === undefined) { preservadas.push(k); }
            });
            return {
              obras: obras.length, itens: itens, semCodigo: semCodigo, semNome: semNome,
              obrasAtuais: obrasAtuais, itensAtuais: itensAtuais, preservadas: preservadas
            };
          }
        
          function textoResumo(c, formato, nomeArquivo) {
            var t = 'Arquivo: ' + nomeArquivo + '\n';
            t += 'Formato reconhecido: ' + formato + '\n\n';
            t += 'O arquivo traz: ' + c.obras + ' obra(s) e ' + c.itens + ' item(ns).\n';
            t += 'Voce tem agora:  ' + c.obrasAtuais + ' obra(s) e ' + c.itensAtuais + ' item(ns).\n';
            if (c.semCodigo) { t += '\nAtencao: ' + c.semCodigo + ' obra(s) do arquivo estao sem codigo.\n'; }
            if (c.semNome) { t += 'Atencao: ' + c.semNome + ' obra(s) do arquivo estao sem nome.\n'; }
            if (c.obras < c.obrasAtuais) {
              t += '\nATENCAO: o arquivo tem MENOS obras do que voce tem agora. ' +
                   'A importacao substitui a lista inteira.\n';
            }
            if (c.preservadas.length) {
              t += '\nVou preservar do banco atual: ' + c.preservadas.join(', ') + '.\n';
            }
            t += '\nAntes de trocar, vou baixar uma copia do banco atual para o seu computador.';
            return t;
          }
        
          /* ---------- baixar a copia do banco atual ---------- */
          function baixarCopia(atual) {
            try {
              var pacote = {
                formato: 'PAINEL_CONTROLE_OBRAS',
                versaoBanco: 'copia-antes-da-importacao',
                dataExportacao: new Date().toISOString(),
                banco: copia(atual)
              };
              var nome = 'Banco_antes_da_importacao_' +
                         new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
              var blob = new Blob([JSON.stringify(pacote)], { type: 'application/json;charset=utf-8' });
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url; a.download = nome;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { } }, 4000);
              return nome;
            } catch (e) { return ''; }
          }
        
          /* ---------- trocar o conteudo do banco vivo, sem trocar o objeto ---------- */
          function trocarConteudo(vivo, novo) {
            var k;
            for (k in vivo) {
              if (Object.prototype.hasOwnProperty.call(vivo, k)) { delete vivo[k]; }
            }
            for (k in novo) {
              if (Object.prototype.hasOwnProperty.call(novo, k)) { vivo[k] = novo[k]; }
            }
            window.db = vivo;
            window.dbObras = vivo.obras;
            window.obrasDB = vivo.obras;
          }
        
          function arrumar(banco) {
            banco.obras = Array.isArray(banco.obras) ? banco.obras : [];
            banco.obras.forEach(function (o) {
              if (!o) { return; }
              if (!Array.isArray(o.itens)) { o.itens = []; }
              if (!Array.isArray(o.recebimentos)) { o.recebimentos = []; }
            });
            if (!banco.config) { banco.config = { dimensoes: true, fem: true, fab: true, inst: true }; }
            var ids = banco.obras.map(function (o) { return o && o.id; });
            if (!banco.obraAtualId || ids.indexOf(banco.obraAtualId) < 0) {
              banco.obraAtualId = banco.obras.length ? banco.obras[0].id : null;
            }
            return banco;
          }
        
          /* ---------- a nova importacao ---------- */
          function importar(event) {
            var entrada = event && event.target;
            var file = entrada && entrada.files ? entrada.files[0] : null;
            if (!file) { return; }
            var vivo = bancoVivo();
            if (!vivo) {
              alert('O banco do painel ainda nao terminou de carregar. Espere alguns segundos, ' +
                    'recarregue a pagina e tente de novo.');
              return;
            }
        
            var leitor = new FileReader();
            leitor.onerror = function () { alert('Nao consegui ler o arquivo escolhido.'); };
            leitor.onload = function (e) {
              var conteudo;
              try {
                conteudo = JSON.parse(e.target.result);
              } catch (err) {
                alert('Este arquivo nao e um JSON valido.\n\nDetalhe: ' + (err && err.message ? err.message : err));
                return;
              }
        
              var achado = reconhecer(conteudo);
              if (achado.erro) { alert(achado.erro); return; }
        
              var banco = copia(achado.banco);
              var c = conferir(banco, vivo);
              conferencia = { formato: achado.formato, arquivo: file.name, contas: c };
        
              if (!c.obras) {
                alert('O arquivo foi reconhecido (' + achado.formato + '), mas nao tem nenhuma obra dentro. ' +
                      'Nao vou apagar o seu banco.');
                return;
              }
              if (!confirm(textoResumo(c, achado.formato, file.name) + '\n\nContinuar?')) {
                alert('Importacao cancelada. Nada foi alterado.');
                return;
              }
              if (!confirm('Ultima confirmacao.\n\nA nuvem do painel e compartilhada: isto substitui a lista de ' +
                           'obras para TODOS que usam o painel. Se alguem estiver trabalhando agora, o trabalho ' +
                           'dessa pessoa pode ser perdido.\n\nConfirma a substituicao?')) {
                alert('Importacao cancelada. Nada foi alterado.');
                return;
              }
        
              /* copia de seguranca: arquivo no computador + desfazer na sessao */
              anterior = copia(vivo);
              var nomeCopia = baixarCopia(vivo);
        
              /* preserva o que o arquivo nao traz */
              GLOBAIS_PRESERVADAS.forEach(function (k) {
                if (banco[k] === undefined && vivo[k] !== undefined) { banco[k] = copia(vivo[k]); }
              });
              arrumar(banco);
              trocarConteudo(vivo, banco);
        
              try { if (typeof popularSelectObras === 'function') { popularSelectObras(); } } catch (e1) { }
              try { if (typeof preencherSelectObras === 'function') { preencherSelectObras(); } } catch (e2) { }
              try {
                if (typeof salvarDB === 'function') { salvarDB(); }
                else if (typeof render === 'function') { render(); }
              } catch (e3) { }
        
              alert('Importacao concluida.\n\nObras: ' + c.obras + '\nItens: ' + c.itens +
                    (nomeCopia ? ('\n\nCopia do banco anterior baixada como:\n' + nomeCopia) :
                                 '\n\nNao consegui baixar a copia do banco anterior.') +
                    '\n\nSe algo ficou errado, digite no console (F12):  P144.desfazer()' +
                    '\n\nConfira o aviso da nuvem no alto da tela: se aparecer erro de salvamento, ' +
                    'a troca ficou so neste computador.');
            };
            leitor.readAsText(file);
            try { entrada.value = ''; } catch (e4) { }
          }
        
          window.importarBancoMultiBrowser = importar;
        
          window.P144 = {
            ultimo: function () {
              if (!conferencia) { console.log('[PATCH144] nenhuma importacao nesta sessao.'); return null; }
              return conferencia;
            },
            desfazer: function () {
              var vivo = bancoVivo();
              if (!anterior || !vivo) {
                alert('Nao tenho o banco anterior nesta sessao. Use o arquivo ' +
                      'Banco_antes_da_importacao_... que foi baixado.');
                return false;
              }
              if (!confirm('Voltar ao banco de antes da importacao (' +
                           ((anterior.obras || []).length) + ' obra(s))?')) { return false; }
              trocarConteudo(vivo, copia(anterior));
              try { if (typeof salvarDB === 'function') { salvarDB(); } } catch (e) { }
              alert('Banco anterior restaurado. Confira a tela e o aviso da nuvem.');
              return true;
            },
            reconhecer: reconhecer,
            conferir: conferir
          };
        
          try {
            console.log('[PATCH144] importacao de banco (JSON) agora confere, confirma e baixa copia. Use P144.ultimo().');
          } catch (e5) { }
        }());
    
