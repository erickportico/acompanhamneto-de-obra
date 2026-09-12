
        // Funções auxiliares para evitar erros de renderização/abas
if (typeof window.initCustoTab !== 'function') window.initCustoTab = function() {};
if (typeof window.popularCustoObraSelect !== 'function') window.popularCustoObraSelect = function() {};
if (typeof window.renderCTMDashboard !== 'function') window.renderCTMDashboard = function() {};
        // 2. Inicializa a variável global _supabase imediatamente
        const SUPABASE_URL = 'https://eqtxfpjrqlkhqgckbyxb.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdHhmcGpycWxraHFnY2tieXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDYxMTgsImV4cCI6MjEwNDMyMjExOH0.9foJNAUKPqeygHjPL6P-7jP94zn-jEOaEh_kgF3VU5I';

            var _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            window._supabase = _supabase;

        /* ──── PATCH156_AUTH_ANONIMO v2c ──── */
        /* Autenticacao anonima + proxy em _supabase.from()
         * para resolver 401 Unauthorized de forma global.
         *
         * Como funciona:
         *   1. Cria a Promise __p156AuthPronto que resolve
         *      somente apos signInAnonymously() (ou fallback).
         *   2. Embrulha _supabase.from() para que TODA chamada
         *      .select()/.upsert()/.insert()/.update()/.delete()
         *      aguarde __p156AuthPronto ANTES de disparar o REST.
         *   3. Isso cobre TODAS as funcoes que chamam _supabase:
         *      carregarBancoDaNuvem, horaDaNuvem, lerDaNuvem,
         *      gravarNaNuvem, olharNuvem, importarBanco, etc.
         */

        /* ── 1) Auth: criar sessao anonima ── */
        window.__p156AuthPronto = new Promise(function (resolve) {
            (async function () {
                var ok = false;
                /* Usa sessao ja existente (login com e-mail). Sem Anonymous Auth. */
                try {
                    var atual = await _supabase.auth.getSession();
                    if (atual && atual.data && atual.data.session) {
                        console.log('[P156] Sessao Auth existente:', atual.data.session.user && atual.data.session.user.email);
                        ok = true;
                    }
                } catch (e0) {
                    console.warn('[P156] getSession falhou:', e0.message || e0);
                }
                if (!ok) {
                    console.warn('[P156] Sem sessao Supabase ainda. Entre com e-mail e senha na tela de login.');
                }
                resolve({ authOk: ok });
            })();
        });

        /* ── 2) Proxy: embrulhar _supabase.from() ── */
        /* Cada chamada .from('tabela') retorna um query builder.
         * O query builder e um thenable (tem .then()).
         * Embrulhamos .then() para aguardar __p156AuthPronto
         * ANTES de executar a chamada REST real.
         * Isso funciona tanto com `await qb.select()` quanto
         * com `qb.select().then(cb)`.
         */
        (function p156Proxy() {
            var origFrom = _supabase.from.bind(_supabase);
            _supabase.from = function (table) {
                var qb = origFrom(table);
                /* Salvar o .then original do query builder */
                var origThen = qb.then;
                /* Substituir .then por versao que aguarda auth */
                qb.then = function (onResolve, onReject) {
                    return window.__p156AuthPronto.then(function () {
                        return origThen.call(qb, onResolve, onReject);
                    });
                };
                return qb;
            };
            console.log('[P156] Proxy _supabase.from() instalado. Toda chamada REST aguardara JWT.');
        })();
        /* ──── FIM PATCH156_AUTH_ANONIMO v2c ──── */




        // Funções auxiliares preventivas
        if (typeof window.popularCustoObraSelect !== 'function') window.popularCustoObraSelect = function() {};
        if (typeof window.renderCTMDashboard !== 'function') window.renderCTMDashboard = function() {};
    
