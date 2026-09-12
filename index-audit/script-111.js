
        /* =====================================================================
         * PATCH 150 - camada de abstracao: namespace Painel
         * ===================================================================== */
        (function () {
          'use strict';
          if (window.Painel) { return; }
        
          /* ------------------------------------------------------------------
           * helpers internos
           * ------------------------------------------------------------------ */
          function bd() {
            try { if (typeof db === 'object' && db) return db; } catch (e) {}
            try { if (typeof window.db === 'object' && window.db) return window.db; } catch (e) {}
            return null;
          }
        
          /* ------------------------------------------------------------------
           * cache id -> obra (busca O(1) em vez de O(n) com find)
           * ------------------------------------------------------------------ */
          var _indice = null; /* { 'uuid-obra': referencia_obra, ... } */
        
          function reconstruirIndice() {
            var d = bd();
            _indice = {};
            if (!d || !d.obras) return;
            for (var i = 0; i < d.obras.length; i++) {
              var o = d.obras[i];
              if (o && o.id) _indice[o.id] = o;
            }
          }
        
          function invalidarIndice() {
            _indice = null;
          }
        
          function indiceOk() {
            if (!_indice) reconstruirIndice();
            return _indice;
          }
        
          /* ------------------------------------------------------------------
           * rastreamento de mudancas
           * ------------------------------------------------------------------ */
          var _mudancas = {};   /* { obraId: true, '_config': true } */
          var _batch = false;   /* modo batch: salvarDB() e ignorado */
        
          function marcar(id) {
            _mudancas[id] = true;
          }
        
          function desmarcar(id) {
            delete _mudancas[id];
          }
        
          function mudancasPendentes() {
            return Object.keys(_mudancas);
          }
        
          function limparMudancas() {
            _mudancas = {};
          }
        
          /* ------------------------------------------------------------------
           * LEITURA
           * ------------------------------------------------------------------ */
        
          /** Retorna a lista de obras (mesmo array de db.obras). */
          function obterObras() {
            var d = bd();
            if (!d || !d.obras) return [];
            return d.obras;
          }
        
          /** Retorna uma obra pelo id, ou null. Busca O(1) via cache. */
          function obterObra(id) {
            if (!id) return null;
            var idx = indiceOk();
            return idx[id] || null;
          }
        
          /** Retorna a obra corrente (a que esta aberta no painel). */
          function obterObraAtual() {
            /* reaproveita a funcao central, se existir */
            try { if (typeof getObraAtual === 'function') return getObraAtual(); } catch (e) {}
            try { if (typeof window.getObraAtual === 'function') return window.getObraAtual(); } catch (e) {}
            /* fallback direto */
            var d = bd();
            if (!d || !d.obras || !d.obras.length) return null;
            var idx = indiceOk();
            var o = idx[d.obraAtualId] || null;
            if (!o) { o = d.obras[0]; if (o) { d.obraAtualId = o.id; } }
            return o;
          }
        
          /** Retorna o id da obra corrente. */
          function obterIdObraAtual() {
            var d = bd();
            return d ? d.obraAtualId : null;
          }
        
          /** Retorna o config global. */
          function obterConfig() {
            var d = bd();
            return d ? (d.config || {}) : {};
          }
        
          /** Retorna a agenda (string). */
          function obterAgenda() {
            var d = bd();
            return d ? (d.agendaObras || '') : '';
          }
        
          /** Retorna a lixeira (array). */
          function obterLixeira() {
            var d = bd();
            return d ? (d.lixeiraItens || []) : [];
          }
        
          /** Verifica se uma obra existe pelo id. */
          function existeObra(id) {
            return obterObra(id) !== null;
          }
        
          /* ------------------------------------------------------------------
           * ESCRITA
           * ------------------------------------------------------------------ */
        
          /** Troca a obra corrente. */
          function definirObraAtual(id) {
            var d = bd();
            if (!d) return;
            var obra = obterObra(id);
            if (!obra && d.obras && d.obras.length) {
              obra = d.obras[0];
              id = obra.id;
            }
            d.obraAtualId = id;
            marcar('_config');
          }
        
          /** Adiciona uma obra nova e a torna corrente. */
          function adicionarObra(obra) {
            var d = bd();
            if (!d || !d.obras || !obra || !obra.id) return;
            d.obras.push(obra);
            invalidarIndice();
            d.obraAtualId = obra.id;
            marcar(obra.id);
            marcar('_config');
          }
        
          /** Remove uma obra pelo id. Se era a corrente, troca pra primeira. */
          function removerObra(id) {
            var d = bd();
            if (!d || !d.obras) return;
            d.obras = d.obras.filter(function (o) { return o.id !== id; });
            invalidarIndice();
            if (d.obras.length) {
              var corrente = obterObra(d.obraAtualId);
              if (!corrente) d.obraAtualId = d.obras[0].id;
            }
            marcar('_config');
          }
        
          /** Substitui toda a lista de obras (usado ao carregar da nuvem). */
          function definirObras(lista) {
            var d = bd();
            if (!d) return;
            d.obras = Array.isArray(lista) ? lista : [];
            invalidarIndice();
          }
        
          /** Atualiza uma propriedade de uma obra e marca a mudanca. */
          function atualizarPropObra(id, prop, valor) {
            var obra = obterObra(id);
            if (!obra) return;
            obra[prop] = valor;
            marcar(id);
          }
        
          /* ------------------------------------------------------------------
           * PERSISTENCIA (wrappers em torno de salvarDB / sincronizarBancoNuvem)
           *
           * Na Fase 2 (agora): salvarObra() e salvarTudo() chamam salvarDB().
           * Na Fase 3: salvarObra() grava so a obra indicada no Supabase.
           * ------------------------------------------------------------------ */
        
          /** Salva a obra indicada (na Fase 2, salva tudo; na Fase 3, so ela). */
          function salvarObra(idOuObj) {
            var id = (typeof idOuObj === 'object' && idOuObj) ? idOuObj.id : idOuObj;
            if (!id) return;
            marcar(id);
            if (_batch) return;
            try { if (typeof salvarDB === 'function') salvarDB(false); } catch (e) {}
            desmarcar(id);
          }
        
          /** Salva tudo (obras + config + lixeira). */
          function salvarTudo() {
            if (_batch) return;
            limparMudancas();
            try { if (typeof salvarDB === 'function') salvarDB(true); } catch (e) {}
          }
        
          /* ------------------------------------------------------------------
           * MODO BATCH
           * ------------------------------------------------------------------ */
        
          /** Inicia modo batch: salvarDB() e ignorado ate finalizarBatch(). */
          function iniciarBatch() {
            _batch = true;
          }
        
          /** Encerra modo batch e salva tudo de uma vez. */
          function finalizarBatch() {
            _batch = false;
            try { if (typeof salvarDB === 'function') salvarDB(true); } catch (e) {}
            limparMudancas();
          }
        
          /* ------------------------------------------------------------------
           * NORMALIZACAO
           *
           * Garante que todas as propriedades padrao existem numa obra.
           * Substitui as 23 linhas de "if (!obra.xxx) obra.xxx = ..." espalhadas
           * pelo codigo. Opcional: pode ser chamado em obterObra() e
           * adicionarObra() para centralizar.
           * ------------------------------------------------------------------ */
        
          function normalizarObra(obra) {
            if (!obra) return obra;
            if (!obra.itens) obra.itens = [];
            if (!obra.recebimentos) obra.recebimentos = [];
            if (!obra.ctmLogs) obra.ctmLogs = [];
            if (!obra.ctmExtraSpecs) obra.ctmExtraSpecs = [];
            if (!obra.lancamentosProducao) obra.lancamentosProducao = [];
            if (!obra.colaboradores) obra.colaboradores = [];
            if (!obra.colaboradoresPgto) obra.colaboradoresPgto = [];
            if (!Array.isArray(obra.centrosCusto)) obra.centrosCusto = [];
            if (!Array.isArray(obra.lancExcluidos)) obra.lancExcluidos = [];
            if (!obra.consideracoesPorMedicao) obra.consideracoesPorMedicao = {};
            if (!obra.medicoesFinais) obra.medicoesFinais = {};
            if (!obra.obraflow) obra.obraflow = { versao: 1, titulo: '', tarefas: [] };
            if (obra.cronogramaTasks === undefined) obra.cronogramaTasks = null;
            if (obra.cronogramaTitle === undefined) obra.cronogramaTitle = '';
            return obra;
          }
        
          /* ------------------------------------------------------------------
           * EXPORTAR O NAMESPACE
           * ------------------------------------------------------------------ */
        
          window.Painel = {
            /* leitura */
            obterObras: obterObras,
            obterObra: obterObra,
            obterObraAtual: obterObraAtual,
            obterIdObraAtual: obterIdObraAtual,
            obterConfig: obterConfig,
            obterAgenda: obterAgenda,
            obterLixeira: obterLixeira,
            existeObra: existeObra,
        
            /* escrita */
            definirObraAtual: definirObraAtual,
            adicionarObra: adicionarObra,
            removerObra: removerObra,
            definirObras: definirObras,
            atualizarPropObra: atualizarPropObra,
        
            /* persistencia */
            salvarObra: salvarObra,
            salvarTudo: salvarTudo,
            marcarMudanca: marcar,
            mudancasPendentes: mudancasPendentes,
        
            /* normalizacao */
            normalizarObra: normalizarObra,
        
            /* batch */
            iniciarBatch: iniciarBatch,
            finalizarBatch: finalizarBatch,
        
            /* interno (exposto para depuracao) */
            _indice: function () { return indiceOk(); },
            _batch: function () { return _batch; },
            _invalidarIndice: invalidarIndice
          };
        
        })();
    
