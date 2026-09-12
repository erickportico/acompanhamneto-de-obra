/*
 * PATCH CENTRO DE CUSTO DINÂMICO
 *
 * Reutiliza os agrupamentos já existentes no PATCH120 e os expõe também
 * na faixa de contexto do Centro de Custos (PATCH137).
 *
 * Modos:
 *   - Por categoria
 *   - Por obra
 *   - Por região
 *   - Por colaborador
 *   - Por empresa
 *
 * O patch não recalcula valores por conta própria. Cada botão aciona o botão
 * oficial do PATCH120, mantendo gráficos, rosca, ranking, legenda e totais
 * usando exatamente a mesma lista filtrada.
 */
(function (window, document) {
  'use strict';

  if (window.__patchCentroCustoDinamico) return;
  window.__patchCentroCustoDinamico = true;

  var MODOS = [
    { id: 'categoria', texto: 'Categoria', icone: '▦' },
    { id: 'obra', texto: 'Por Obra', icone: '🏗️' },
    { id: 'regiao', texto: 'Por Região', icone: '📍' },
    { id: 'colab', texto: 'Por Colaborador', icone: '👷' },
    { id: 'empresa', texto: 'Por Empresa', icone: '🏢' }
  ];

  var agendado = false;
  var observador = null;

  function id(x) {
    return document.getElementById(x);
  }

  function estilo() {
    if (id('patchCentroCustoDinamicoCss')) return;

    var style = document.createElement('style');
    style.id = 'patchCentroCustoDinamicoCss';
    style.textContent = [
      '#p137Faixa .p137-grupos{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:9px;padding-top:8px;border-top:1px solid rgba(100,116,139,.22)}',
      '#p137Faixa .p137-grupos-titulo{font-weight:700;margin-right:3px;color:inherit}',
      '#p137Faixa .p137-grupo{border:1px solid rgba(100,116,139,.35);border-radius:999px;padding:5px 9px;background:rgba(255,255,255,.72);color:inherit;cursor:pointer;font:600 11px/1.1 Segoe UI,Arial,sans-serif;transition:background .15s,border-color .15s,transform .15s}',
      '#p137Faixa .p137-grupo:hover{transform:translateY(-1px);border-color:#6366f1}',
      '#p137Faixa .p137-grupo.ativo{background:#6366f1;border-color:#6366f1;color:#fff}',
      'body.dark-mode #p137Faixa .p137-grupo{background:rgba(15,23,42,.72);border-color:rgba(148,163,184,.35)}',
      'body.dark-mode #p137Faixa .p137-grupo.ativo{background:#6366f1;border-color:#6366f1;color:#fff}',
      '@media(max-width:640px){#p137Faixa .p137-grupos{align-items:flex-start}#p137Faixa .p137-grupos-titulo{width:100%}}'
    ].join('');
    document.head.appendChild(style);
  }

  function grupoOficial(modo) {
    var botoes = document.querySelectorAll('#p120Btns [data-g]');
    for (var i = 0; i < botoes.length; i++) {
      if (botoes[i].getAttribute('data-g') === modo) return botoes[i];
    }
    return null;
  }

  function modoAtual() {
    var botoes = document.querySelectorAll('#p120Btns [data-g]');
    for (var i = 0; i < botoes.length; i++) {
      if (String(botoes[i].className).split(/\s+/).indexOf('on') >= 0) {
        return botoes[i].getAttribute('data-g') || 'categoria';
      }
    }
    try {
      return window.localStorage.getItem('p120Grupo') || 'categoria';
    } catch (e) {
      return 'categoria';
    }
  }

  function ativar(modo) {
    var oficial = grupoOficial(modo);
    if (!oficial) {
      /* O PATCH120 ainda não montou a área. Tenta novamente após a montagem. */
      window.setTimeout(function () { ativar(modo); }, 250);
      return;
    }

    oficial.click();
    sincronizar();
  }

  function sincronizar() {
    var faixa = id('p137Faixa');
    if (!faixa) return;

    var atual = modoAtual();
    var botoes = faixa.querySelectorAll('.p137-grupo');
    for (var i = 0; i < botoes.length; i++) {
      var ligado = botoes[i].getAttribute('data-grupo') === atual;
      botoes[i].classList.toggle('ativo', ligado);
      botoes[i].setAttribute('aria-pressed', ligado ? 'true' : 'false');
    }
  }

  function montar() {
    var faixa = id('p137Faixa');
    if (!faixa) return false;

    estilo();

    var antigo = faixa.querySelector('.p137-grupos');
    if (antigo) {
      sincronizar();
      return true;
    }

    var barra = document.createElement('div');
    barra.className = 'p137-grupos';
    barra.setAttribute('role', 'group');
    barra.setAttribute('aria-label', 'Agrupar Centro de Custos');

    var titulo = document.createElement('span');
    titulo.className = 'p137-grupos-titulo';
    titulo.textContent = 'Distribuir:';
    barra.appendChild(titulo);

    MODOS.forEach(function (modo) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'p137-grupo';
      button.setAttribute('data-grupo', modo.id);
      button.setAttribute('aria-pressed', 'false');
      button.textContent = modo.icone + ' ' + modo.texto;
      button.addEventListener('click', function () {
        ativar(modo.id);
      });
      barra.appendChild(button);
    });

    faixa.appendChild(barra);
    sincronizar();
    return true;
  }

  function agendar() {
    if (agendado) return;
    agendado = true;
    window.setTimeout(function () {
      agendado = false;
      montar();
      sincronizar();
    }, 80);
  }

  function corrigirRenderInicial() {
    var original = window.initCustoTab;
    if (typeof original !== 'function' || original.__patchMesCorrigido) return;

    var novo = function () {
      var resultado = original.apply(this, arguments);
      /* initCustoTab sincroniza o mês depois da primeira renderização. */
      window.setTimeout(function () {
        try {
          if (typeof window.renderCustoDashboard === 'function') {
            window.renderCustoDashboard();
          }
          montar();
          sincronizar();
        } catch (e) {}
      }, 0);
      return resultado;
    };

    novo.__patchMesCorrigido = true;
    novo.__original = original;
    window.initCustoTab = novo;
  }

  function iniciar() {
    estilo();
    corrigirRenderInicial();
    montar();

    if (!observador && window.MutationObserver && document.body) {
      observador = new MutationObserver(function () {
        agendar();
      });
      observador.observe(document.body, { childList: true, subtree: true });
    }

    window.setInterval(function () {
      corrigirRenderInicial();
      montar();
      sincronizar();
    }, 900);
  }

  window.PatchCentroCustoDinamico = {
    atualizar: function () { montar(); sincronizar(); },
    selecionar: ativar,
    modo: modoAtual
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  } else {
    iniciar();
  }
})(window, document);
