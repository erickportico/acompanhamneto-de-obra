/* PATCH 20260926 - SEPARAR CENTRO DE CUSTOS DOS LANÇAMENTOS DE PRODUÇÃO
 *
 * OBJETIVO
 * - NÃO exibir despesas de obra.centrosCusto dentro de:
 *   Pagamento de Produção > Lançamentos.
 * - NÃO alterar, mover, duplicar ou excluir dados do Centro de Custos.
 * - Criar uma área independente "Lançamentos (CC)" para consultar as despesas.
 * - Se o patch anterior estiver instalado, ele será neutralizado apenas
 *   visualmente dentro de Lançamentos de Produção.
 *
 * APLICAÇÃO
 * Inserir este arquivo no index.html antes do ÚLTIMO </body>.
 */

(function () {
  'use strict';

  if (window.__patchLancamentosCCSeparado20260926) return;
  window.__patchLancamentosCCSeparado20260926 = true;

  var BTN_ID = 'btn-tab-lancamentos-cc-20260926';
  var PANEL_ID = 'tab-lancamentos-cc-20260926';
  var STYLE_ID = 'style-lancamentos-cc-20260926';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function moeda(v) {
    return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2
    });
  }

  function mesSelecionado() {
    try {
      if (typeof getChaveMesPgto === 'function') {
        var m = getChaveMesPgto();
        if (m) return m;
      }
    } catch (e) {}

    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0');
  }

  function mesCusto(c) {
    var s = String(
      c.data ||
      c.dataDespesa ||
      c.dataLancamento ||
      ''
    );

    var m = s.match(/^(\d{4})-(\d{2})/);
    if (m) return m[1] + '-' + m[2];

    var b = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (b) return b[3] + '-' + b[2];

    return '';
  }

  function todosCustos() {
    var lista = [];

    var obras = (
      window.db &&
      Array.isArray(window.db.obras)
    ) ? window.db.obras : [];

    obras.forEach(function (obra) {
      (obra.centrosCusto || []).forEach(function (c) {
        if (!c) return;

        var item = Object.assign({}, c);
        item._obraId = obra.id;
        item._obraNome = obra.nome || 'Obra sem nome';

        lista.push(item);
      });
    });

    return lista;
  }

  /*
   * Remove SOMENTE a seção criada pelo patch anterior dentro
   * de #containerLancamentosPgto.
   *
   * Nenhum registro de db.obras[].centrosCusto é alterado.
   */
  function limparCCDosLancamentosProducao() {
    var container = document.getElementById('containerLancamentosPgto');
    if (!container) return;

    Array.prototype.slice.call(container.children).forEach(function (child) {
      var texto = String(child.textContent || '');

      if (
        texto.indexOf('Despesas do Centro de Custos') !== -1 &&
        texto.indexOf('Subtotal:') !== -1
      ) {
        child.remove();
      }
    });
  }

  function instalarBloqueioVisual() {
    limparCCDosLancamentosProducao();

    if (
      typeof window.renderLancamentosPgto === 'function' &&
      !window.renderLancamentosPgto.__patchSeparacaoCC20260926
    ) {
      var original = window.renderLancamentosPgto;

      var wrapped = function () {
        var resultado = original.apply(this, arguments);

        setTimeout(limparCCDosLancamentosProducao, 0);
        setTimeout(limparCCDosLancamentosProducao, 150);

        return resultado;
      };

      wrapped.__patchSeparacaoCC20260926 = true;
      wrapped.__original = original;

      window.renderLancamentosPgto = wrapped;
    }
  }

  function instalarEstilo() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = STYLE_ID;

    style.textContent =
      '#' + PANEL_ID + ' { margin-top: 12px; }' +
      '#' + PANEL_ID + ' .pcc-table {' +
        'width:100%;border-collapse:collapse;background:#fff;color:#0f172a;' +
      '}' +
      '#' + PANEL_ID + ' .pcc-table th {' +
        'background:#e2e8f0;padding:9px;text-align:left;font-size:.78rem;' +
      '}' +
      '#' + PANEL_ID + ' .pcc-table td {' +
        'padding:9px;border-bottom:1px solid #cbd5e1;font-size:.82rem;' +
      '}' +
      '#' + PANEL_ID + ' .pcc-total {' +
        'font-weight:800;background:#fef08a;' +
      '}';

    document.head.appendChild(style);
  }

  function instalarAba() {
    var menu = document.getElementById('meu-menu-abas');
    if (!menu) return false;

    if (!document.getElementById(BTN_ID)) {
      var botao = document.createElement('button');

      botao.id = BTN_ID;
      botao.type = 'button';
      botao.className = 'tab-btn';
      botao.textContent = '💸 Lançamentos (CC)';
      botao.onclick = function () {
        abrirLancamentosCC();
      };

      var botaoCusto = document.getElementById('btn-tab-custo');

      if (botaoCusto && botaoCusto.parentNode) {
        botaoCusto.parentNode.insertBefore(
          botao,
          botaoCusto.nextSibling
        );
      } else {
        menu.appendChild(botao);
      }
    }

    if (!document.getElementById(PANEL_ID)) {
      var painel = document.createElement('div');

      painel.id = PANEL_ID;
      painel.className = 'card';
      painel.style.display = 'none';

      painel.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">' +
          '<h2 style="margin:0;">💸 Lançamentos do Centro de Custos</h2>' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
            '<select id="pccMes" style="padding:8px;border-radius:8px;border:1px solid #94a3b8;"></select>' +
            '<select id="pccObra" style="padding:8px;border-radius:8px;border:1px solid #94a3b8;"></select>' +
            '<select id="pccColab" style="padding:8px;border-radius:8px;border:1px solid #94a3b8;"></select>' +
            '<button type="button" class="btn-action" onclick="window.PatchLancamentosCC20260926.render()">🔄 Atualizar</button>' +
          '</div>' +
        '</div>' +
        '<div id="pccResumo" style="margin:14px 0;font-weight:700;"></div>' +
        '<div id="pccTabela"></div>';

      var painelCusto = document.getElementById('tab-custo');

      if (painelCusto && painelCusto.parentNode) {
        painelCusto.parentNode.insertBefore(
          painel,
          painelCusto.nextSibling
        );
      }
    }

    instalarEstilo();
    popularFiltros();

    return true;
  }

  function popularFiltros() {
    var mes = document.getElementById('pccMes');
    var obra = document.getElementById('pccObra');
    var colab = document.getElementById('pccColab');

    if (!mes || !obra || !colab) return;

    var lista = todosCustos();
    var atual = mesSelecionado();
    var meses = {};

    lista.forEach(function (c) {
      var m = mesCusto(c);
      if (m) meses[m] = true;
    });

    meses[atual] = true;

    var listaMeses = Object.keys(meses).sort().reverse();

    mes.innerHTML = listaMeses.map(function (m) {
      return '<option value="' + esc(m) + '">' + esc(m) + '</option>';
    }).join('');

    mes.value = atual;

    var obras = {};
    var colaboradores = {};

    lista.forEach(function (c) {
      obras[String(c._obraId)] = c._obraNome;

      if (c.colaborador) {
        colaboradores[String(c.colaborador)] = String(c.colaborador);
      }
    });

    obra.innerHTML =
      '<option value="">Todas as obras</option>' +
      Object.keys(obras)
        .sort(function (a, b) {
          return obras[a].localeCompare(obras[b], 'pt-BR');
        })
        .map(function (id) {
          return '<option value="' + esc(id) + '">' +
            esc(obras[id]) +
            '</option>';
        })
        .join('');

    colab.innerHTML =
      '<option value="">Todos os colaboradores</option>' +
      Object.keys(colaboradores)
        .sort(function (a, b) {
          return colaboradores[a].localeCompare(
            colaboradores[b],
            'pt-BR'
          );
        })
        .map(function (nome) {
          return '<option value="' + esc(nome) + '">' +
            esc(nome) +
            '</option>';
        })
        .join('');
  }

  function render() {
    if (!instalarAba()) return;

    popularFiltros();

    var mes = document.getElementById('pccMes').value;
    var obra = document.getElementById('pccObra').value;
    var colab = document.getElementById('pccColab').value;

    var lista = todosCustos().filter(function (c) {
      if (mes && mesCusto(c) !== mes) return false;

      if (
        obra &&
        String(c._obraId) !== String(obra)
      ) {
        return false;
      }

      if (
        colab &&
        String(c.colaborador || '') !== String(colab)
      ) {
        return false;
      }

      return true;
    });

    var total = lista.reduce(function (s, c) {
      return s + (Number(c.valor) || 0);
    }, 0);

    var resumo = document.getElementById('pccResumo');

    if (resumo) {
      resumo.textContent =
        lista.length +
        ' lançamento(s) • ' +
        moeda(total);
    }

    var tabela = document.getElementById('pccTabela');

    if (!tabela) return;

    if (!lista.length) {
      tabela.innerHTML =
        '<div style="padding:28px;text-align:center;color:#64748b;">' +
        'Nenhuma despesa do Centro de Custos encontrada para os filtros atuais.' +
        '</div>';

      return;
    }

    lista.sort(function (a, b) {
      return String(a.data || '').localeCompare(
        String(b.data || '')
      );
    });

    var html =
      '<div style="overflow:auto;">' +
      '<table class="pcc-table">' +
      '<thead><tr>' +
      '<th>Data</th>' +
      '<th>Obra</th>' +
      '<th>Categoria</th>' +
      '<th>Descrição</th>' +
      '<th>Região</th>' +
      '<th>Colaborador</th>' +
      '<th>Valor</th>' +
      '</tr></thead><tbody>';

    lista.forEach(function (c) {
      html +=
        '<tr>' +
        '<td>' + esc(c.data || '-') + '</td>' +
        '<td>' + esc(c._obraNome) + '</td>' +
        '<td>' + esc(c.categoria || '-') + '</td>' +
        '<td>' + esc(c.descricao || '-') + '</td>' +
        '<td>' + esc(c.regiao || '-') + '</td>' +
        '<td>' + esc(c.colaborador || '-') + '</td>' +
        '<td><strong>' + moeda(c.valor) + '</strong></td>' +
        '</tr>';
    });

    html +=
      '</tbody>' +
      '<tfoot>' +
      '<tr class="pcc-total">' +
      '<td colspan="6">TOTAL</td>' +
      '<td>' + moeda(total) + '</td>' +
      '</tr>' +
      '</tfoot>' +
      '</table></div>';

    tabela.innerHTML = html;
  }

  function abrirLancamentosCC() {
    var painel = document.getElementById(PANEL_ID);

    if (!painel) {
      instalarAba();
      painel = document.getElementById(PANEL_ID);
    }

    if (!painel) return;

    /*
     * Esconde as demais áreas sem tocar nos dados.
     */
    document.querySelectorAll('.card').forEach(function (el) {
      if (el.id !== PANEL_ID) {
        el.style.display = 'none';
      }
    });

    painel.style.display = '';

    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.classList.remove('active');
    });

    var botao = document.getElementById(BTN_ID);

    if (botao) {
      botao.classList.add('active');
    }

    render();
  }

  window.PatchLancamentosCC20260926 = {
    render: render,
    limpar: limparCCDosLancamentosProducao,
    abrir: abrirLancamentosCC
  };

  function iniciar() {
    instalarAba();
    instalarBloqueioVisual();

    setTimeout(instalarBloqueioVisual, 300);
    setTimeout(instalarBloqueioVisual, 1000);
    setTimeout(instalarBloqueioVisual, 2000);

    /*
     * Garante que, se outro patch voltar a envolver
     * renderLancamentosPgto, a seção CC continue fora.
     */
    var tentativas = 0;

    var timer = setInterval(function () {
      tentativas++;

      instalarBloqueioVisual();

      if (tentativas >= 20) {
        clearInterval(timer);
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      iniciar,
      { once: true }
    );
  } else {
    iniciar();
  }
})();
