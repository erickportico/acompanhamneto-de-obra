/*
 * patch_correcao.js
 *
 * Patch complementar para o painel.
 *
 * Importante: este arquivo NÃO consegue corrigir um erro de sintaxe em outro
 * <script> que já falhou no parser. A correção da linha 42022 deve ser feita
 * no index.html conforme os passos do relatório. Depois disso, este patch pode
 * ser carregado como o último script da página.
 */
(function (window, document) {
  'use strict';

  if (window.__patchCorrecaoV1) return;
  window.__patchCorrecaoV1 = true;

  var BACKUP_KEYS = [
    'obrasDB_v8',
    'obrasDB_v8_pre_nuvem_backup'
  ];

  function safeText(value) {
    return String(value == null ? '' : value);
  }

  function countItems(database) {
    var total = 0;
    var obras = database && Array.isArray(database.obras)
      ? database.obras
      : [];

    obras.forEach(function (obra) {
      total += obra && Array.isArray(obra.itens) ? obra.itens.length : 0;
    });

    return total;
  }

  function readBestBackup() {
    var best = null;
    var bestCount = 0;

    BACKUP_KEYS.forEach(function (key) {
      try {
        var raw = window.localStorage.getItem(key);
        if (!raw) return;

        var parsed = JSON.parse(raw);
        var database = parsed && parsed.db ? parsed.db : parsed;
        var amount = countItems(database);

        if (database && Array.isArray(database.obras) && amount > bestCount) {
          best = database;
          bestCount = amount;
        }
      } catch (error) {
        try {
          console.warn('[patch_correcao] backup inválido:', key, error);
        } catch (ignored) {}
      }
    });

    return best ? { database: best, items: bestCount } : null;
  }

  function recoverData() {
    var result = readBestBackup();

    if (!result) {
      window.alert('Nenhum backup local válido foi encontrado.');
      return false;
    }

    window.db = result.database;
    window.dbObras = result.database.obras;

    try {
      if (typeof window.salvarDB === 'function') {
        window.salvarDB(false);
      }
    } catch (error) {
      console.warn('[patch_correcao] não foi possível salvar o banco recuperado:', error);
    }

    try {
      if (typeof window.popularSelectObras === 'function') {
        window.popularSelectObras();
      }
      if (typeof window.render === 'function') {
        window.render();
      }
    } catch (error2) {
      console.warn('[patch_correcao] banco recuperado, mas a interface não foi redesenhada:', error2);
    }

    window.alert('Dados recuperados: ' + result.items + ' itens.');
    return true;
  }

  function createButton(label, onClick) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.style.cssText = [
      'border:0',
      'border-radius:6px',
      'padding:6px 10px',
      'background:#dc2626',
      'color:#fff',
      'font:600 12px system-ui,sans-serif',
      'cursor:pointer'
    ].join(';');
    button.addEventListener('click', onClick);
    return button;
  }

  function installDiagnostic() {
    if (document.getElementById('patchCorrecaoAviso')) return;

    /* Se o bloco P84 ainda não foi corrigido, não cria uma segunda tela. */
    if (typeof window.p84AbrirDiario === 'function') return;

    var bar = document.createElement('aside');
    bar.id = 'patchCorrecaoAviso';
    bar.setAttribute('role', 'alert');
    bar.style.cssText = [
      'position:fixed',
      'left:12px',
      'right:12px',
      'bottom:12px',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'gap:10px',
      'padding:10px 12px',
      'border:1px solid #f59e0b',
      'border-radius:8px',
      'background:#fffbeb',
      'color:#78350f',
      'box-shadow:0 5px 20px rgba(0,0,0,.2)',
      'font:13px/1.4 system-ui,sans-serif'
    ].join(';');

    var message = document.createElement('span');
    message.textContent = 'O módulo Diário de Obra não foi carregado. Corrija o bloco de impressão do index.html.';
    bar.appendChild(message);

    bar.appendChild(createButton('Recuperar backup', function () {
      recoverData();
    }));

    var close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Fechar';
    close.style.cssText = 'border:0;background:transparent;color:#78350f;cursor:pointer;padding:4px 6px;';
    close.addEventListener('click', function () {
      if (bar.parentNode) bar.parentNode.removeChild(bar);
    });
    bar.appendChild(close);

    (document.body || document.documentElement).appendChild(bar);
  }

  /* API segura para ser usada pelo módulo de impressão corrigido. */
  window.p84ImprimirSeguro = function (html, css, titulo) {
    var popup = window.open('', '_blank');
    if (!popup) {
      window.alert('Permita pop-ups para imprimir o Diário de Obra.');
      return false;
    }

    var doc = popup.document;
    doc.open();

    var root = doc.createElement('html');
    var head = doc.createElement('head');
    var meta = doc.createElement('meta');
    var title = doc.createElement('title');
    var style = doc.createElement('style');
    var body = doc.createElement('body');

    meta.setAttribute('charset', 'UTF-8');
    title.textContent = safeText(titulo || 'Diário de Obra');
    style.textContent = safeText(css || '');

    /* html é produzido pelo módulo de impressão após escape contextual. */
    body.innerHTML = safeText(html || '');

    head.appendChild(meta);
    head.appendChild(title);
    head.appendChild(style);
    root.appendChild(head);
    root.appendChild(body);
    doc.appendChild(root);
    doc.close();

    var print = function () {
      try {
        popup.focus();
        popup.print();
      } catch (error) {
        console.warn('[patch_correcao] falha ao imprimir:', error);
      }
    };

    var images = Array.prototype.slice.call(doc.images || []);
    if (!images.length) {
      window.setTimeout(print, 150);
      return true;
    }

    var remaining = images.length;
    var done = false;
    var finish = function () {
      remaining -= 1;
      if (remaining <= 0 && !done) {
        done = true;
        window.setTimeout(print, 150);
      }
    };

    images.forEach(function (image) {
      if (image.complete) finish();
      else {
        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
      }
    });

    window.setTimeout(function () {
      if (!done) {
        done = true;
        print();
      }
    }, 5000);

    return true;
  };

  function start() {
    installDiagnostic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})(window, document);
