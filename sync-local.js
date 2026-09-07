/**
 * Cópia local no PC do servidor + nuvem (Supabase) continua no painel.
 * Incluir no index.html, no final do <body>:
 *   <script src="/sync-local.js"></script>
 */
(function () {
  if (window.__syncLocalPainel) return;
  window.__syncLocalPainel = true;

  var API = '/api/local-db';
  var ultimoEnvio = 0;
  var pendente = null;

  function pegarDb() {
    if (window.db && typeof window.db === 'object') return window.db;
    return null;
  }

  function enviar(origem) {
    var dados = pegarDb();
    if (!dados) return Promise.resolve();
    var agora = Date.now();
    if (agora - ultimoEnvio < 1500) {
      pendente = origem || 'painel';
      return Promise.resolve();
    }
    ultimoEnvio = agora;
    pendente = null;
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origem: origem || 'painel', dados: dados }),
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.ok) {
        console.log('[copia-local] gravado em data/banco.json', j.salvo_em);
      } else {
        console.warn('[copia-local] falhou', j);
      }
    }).catch(function (e) {
      console.warn('[copia-local] servidor local off?', e && e.message);
    });
  }

  setInterval(function () {
    if (pendente) enviar(pendente);
  }, 2000);

  var nomes = ['salvarDB', 'salvarLocalComoBackup', 'sincronizarBancoNuvem'];
  nomes.forEach(function (nome) {
    var orig = window[nome];
    if (typeof orig !== 'function') return;
    window[nome] = function () {
      var ret = orig.apply(this, arguments);
      try { enviar(nome); } catch (e) { /* ignora */ }
      return ret;
    };
  });

  window.addEventListener('beforeunload', function () {
    var dados = pegarDb();
    if (!dados || !navigator.sendBeacon) return;
    try {
      navigator.sendBeacon(API, new Blob(
        [JSON.stringify({ origem: 'unload', dados: dados })],
        { type: 'application/json' }
      ));
    } catch (e) { /* ignora */ }
  });

  // primeira cópia depois que o painel carregar
  setTimeout(function () { enviar('inicio'); }, 4000);

  console.log('[copia-local] ativo — nuvem (Supabase) + PC (data/banco.json)');
})();
