/* PATCH: Integração Lançamentos <-> Centro de Custos
 * Data: 2026-09-26
 *
 * OBJETIVO:
 * - Mostrar no módulo "Pagamento de Produção > Lançamentos" as despesas
 *   que já existem em obra.centrosCusto.
 * - NÃO altera, move, duplica ou converte dados de centrosCusto.
 * - Usa o mesmo mês selecionado em Lançamentos.
 * - Respeita os filtros existentes de Colaborador, Material e Obra.
 * - Despesas do Centro de Custos aparecem em uma seção separada.
 *
 * Aplicação: inserir este arquivo no index.html antes de </body>.
 */

(function () {
  'use strict';

  if (window.__patchIntegracaoLancamentosCentroCustos20260926) return;
  window.__patchIntegracaoLancamentosCentroCustos20260926 = true;

  var NS = 'pCCLanc20260926';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function mesAtualLanc() {
    try {
      if (typeof window.getChaveMesPgto === 'function') {
        return String(window.getChaveMesPgto() || '');
      }
    } catch (e) {}
    return '';
  }

  function obras() {
    return window.db && Array.isArray(window.db.obras) ? window.db.obras : [];
  }

  function nomeColaboradorPorId(id) {
    if (!id) return '';
    try {
      if (typeof window.getColaboradoresAll === 'function') {
        var lista = window.getColaboradoresAll() || [];
        var c = lista.find(function (x) {
          return String(x.id) === String(id);
        });
        return c ? String(c.nome || '') : '';
      }
    } catch (e) {}
    return '';
  }

  function filtroAtual() {
    var estado = window.__p201PgtoFiltrosEstado;
    if (estado) {
      return {
        colaborador: String(estado.colaborador || ''),
        material: String(estado.material || ''),
        obra: String(estado.obra || '')
      };
    }

    function valor(id) {
      var el = document.getElementById(id);
      return el ? String(el.value || '') : '';
    }

    return {
      colaborador: valor('p201FiltroColaboradorLanc'),
      material: valor('p201FiltroMaterialLanc'),
      obra: valor('p201FiltroObraLanc')
    };
  }

  function custoTemColaborador(c, filtroId) {
    if (!filtroId) return true;

    var nomeSelecionado = nomeColaboradorPorId(filtroId).trim().toLowerCase();
    var nomeCusto = String(c.colaborador || '').trim().toLowerCase();

    /* Centro de Custos normalmente guarda o nome do colaborador.
       Também aceita id caso algum registro antigo tenha sido salvo assim. */
    if (nomeCusto && nomeSelecionado && nomeCusto === nomeSelecionado) return true;
    if (String(c.colaborador || '') === String(filtroId)) return true;

    return false;
  }

  function custoTemMaterial(c, filtro) {
    if (!filtro) return true;
    var alvo = String(filtro).trim().toLowerCase();
    var descricao = String(c.descricao || '').trim().toLowerCase();
    var categoria = String(c.categoria || '').trim().toLowerCase();

    return descricao === alvo ||
           categoria === alvo ||
           descricao.indexOf(alvo) !== -1 ||
           categoria.indexOf(alvo) !== -1;
  }

  function custosDoMes() {
    var mes = mesAtualLanc();
    var out = [];

    obras().forEach(function (obra) {
      (obra.centrosCusto || []).forEach(function (c) {
        if (!c) return;

        var data = String(c.data || '').trim();
        if (mes && data.substring(0, 7) !== mes) return;

        out.push({
          _obraId: obra.id,
          _obraNome: obra.nome || 'Obra sem nome',
          id: c.id,
          data: data,
          categoria: c.categoria || '',
          descricao: c.descricao || '',
          valor: num(c.valor),
          regiao: c.regiao || '',
          colaborador: c.colaborador || '',
          empresa: c.empresa || ''
        });
      });
    });

    return out;
  }

  function custosFiltrados() {
    var f = filtroAtual();

    return custosDoMes().filter(function (c) {
      if (f.obra && String(c._obraId) !== String(f.obra)) return false;
      if (f.colaborador && !custoTemColaborador(c, f.colaborador)) return false;
      if (f.material && !custoTemMaterial(c, f.material)) return false;
      return true;
    });
  }

  function garantirOpcao(selectId, value, label) {
    var sel = document.getElementById(selectId);
    if (!sel || !value) return;

    var existe = Array.from(sel.options).some(function (o) {
      return String(o.value) === String(value);
    });

    if (!existe) {
      var op = document.createElement('option');
      op.value = value;
      op.textContent = label || value;
      sel.appendChild(op);
    }
  }

  function ampliarFiltrosComCentroDeCustos() {
    var custos = custosDoMes();

    var obrasMap = {};
    var materiaisMap = {};
    var colaboradoresMap = {};

    custos.forEach(function (c) {
      if (c._obraId != null) {
        obrasMap[String(c._obraId)] = c._obraNome;
      }

      [c.descricao, c.categoria].forEach(function (v) {
        var s = String(v || '').trim();
        if (s) materiaisMap[s] = true;
      });

      if (c.colaborador) {
        colaboradoresMap[String(c.colaborador)] = true;
      }
    });

    Object.keys(obrasMap).forEach(function (id) {
      garantirOpcao('p201FiltroObraLanc', id, obrasMap[id]);
      garantirOpcao('p201FiltroObraResumo', id, obrasMap[id]);
    });

    Object.keys(materiaisMap).forEach(function (m) {
      garantirOpcao('p201FiltroMaterialLanc', m, m);
      garantirOpcao('p201FiltroMaterialResumo', m, m);
    });

    Object.keys(colaboradoresMap).forEach(function (nome) {
      var lista = [];
      try {
        lista = typeof window.getColaboradoresAll === 'function'
          ? (window.getColaboradoresAll() || [])
          : [];
      } catch (e) {}

      var encontrado = lista.find(function (c) {
        return String(c.nome || '').trim().toLowerCase() === nome.trim().toLowerCase();
      });

      if (encontrado) {
        garantirOpcao(
          'p201FiltroColaboradorLanc',
          String(encontrado.id),
          String(encontrado.nome || nome)
        );
        garantirOpcao(
          'p201FiltroColaboradorResumo',
          String(encontrado.id),
          String(encontrado.nome || nome)
        );
      }
    });
  }

  function formatarData(data) {
    if (!data) return '-';
    var m = String(data).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return esc(data);
    return m[3] + '/' + m[2] + '/' + m[1];
  }

  function formatarMoeda(v) {
    return num(v).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function removerSecaoAnterior() {
    var antigo = document.getElementById(NS + '-secao');
    if (antigo && antigo.parentNode) antigo.parentNode.removeChild(antigo);
  }

  function renderSecaoCentroDeCustos() {
    var container = document.getElementById('containerLancamentosPgto');
    if (!container) return;

    removerSecaoAnterior();

    var custos = custosFiltrados();

    var box = document.createElement('div');
    box.id = NS + '-secao';
    box.style.cssText =
      'margin-top:18px;' +
      'border:1px solid #334155;' +
      'border-radius:12px;' +
      'overflow:hidden;' +
      'background:var(--card-bg,#0f172a);';

    var total = custos.reduce(function (s, c) {
      return s + num(c.valor);
    }, 0);

    var html = '';
    html += '<div style="padding:12px 16px;background:linear-gradient(90deg,#7c3aed,#4f46e5);color:#fff;font-weight:800;">';
    html += '💰 Despesas do Centro de Custos';
    html += '<span style="float:right;">' + custos.length + ' lançamento(s) · ' + esc(formatarMoeda(total)) + '</span>';
    html += '</div>';

    if (!custos.length) {
      html += '<div style="padding:22px;text-align:center;color:#94a3b8;font-size:.9rem;">';
      html += 'Nenhuma despesa do Centro de Custos encontrada para este mês/filtro.';
      html += '</div>';
      box.innerHTML = html;
      container.appendChild(box);
      return;
    }

    var grupos = {};
    custos.forEach(function (c) {
      var key = String(c._obraId);
      if (!grupos[key]) {
        grupos[key] = { nome: c._obraNome, itens: [] };
      }
      grupos[key].itens.push(c);
    });

    Object.keys(grupos).forEach(function (key) {
      var g = grupos[key];
      var subtotal = g.itens.reduce(function (s, c) {
        return s + num(c.valor);
      }, 0);

      html += '<div style="padding:10px 14px;border-top:1px solid #334155;background:rgba(37,99,235,.12);color:#e2e8f0;font-weight:800;">';
      html += esc(g.nome);
      html += '<span style="float:right;">Subtotal: ' + esc(formatarMoeda(subtotal)) + '</span>';
      html += '</div>';

      html += '<div style="overflow:auto;">';
      html += '<table style="width:100%;border-collapse:collapse;font-size:.82rem;">';
      html += '<thead><tr>';
      html += '<th style="padding:8px;text-align:left;">Data</th>';
      html += '<th style="padding:8px;text-align:left;">Categoria</th>';
      html += '<th style="padding:8px;text-align:left;">Descrição</th>';
      html += '<th style="padding:8px;text-align:left;">Região</th>';
      html += '<th style="padding:8px;text-align:left;">Colaborador</th>';
      html += '<th style="padding:8px;text-align:right;">Valor</th>';
      html += '</tr></thead><tbody>';

      g.itens.forEach(function (c) {
        html += '<tr style="border-top:1px solid rgba(148,163,184,.18);">';
        html += '<td style="padding:8px;">' + formatarData(c.data) + '</td>';
        html += '<td style="padding:8px;">' + esc(c.categoria || '-') + '</td>';
        html += '<td style="padding:8px;">' + esc(c.descricao || '-') + '</td>';
        html += '<td style="padding:8px;">' + esc(c.regiao || '-') + '</td>';
        html += '<td style="padding:8px;">' + esc(c.colaborador || '-') + '</td>';
        html += '<td style="padding:8px;text-align:right;font-weight:800;">' + esc(formatarMoeda(c.valor)) + '</td>';
        html += '</tr>';
      });

      html += '</tbody></table></div>';
    });

    html += '<div style="padding:10px 14px;border-top:2px solid #475569;text-align:right;font-weight:900;color:#f8fafc;">';
    html += 'TOTAL DESPESAS DO CENTRO DE CUSTOS: ' + esc(formatarMoeda(total));
    html += '</div>';

    box.innerHTML = html;
    container.appendChild(box);
  }

  function atualizarStatusComCC() {
    var custos = custosFiltrados();
    var status = document.getElementById('p201StatusLanc');
    if (!status) return;

    var texto = status.textContent || '';
    if (texto.indexOf('Despesas CC:') !== -1) {
      texto = texto.replace(/\s*·\s*Despesas CC:.*$/, '');
    }

    status.textContent = texto + ' · Despesas CC: ' + custos.length;
  }

  function instalar() {
    if (typeof window.renderLancamentosPgto !== 'function') return false;
    if (window.renderLancamentosPgto.__patchCC20260926) return true;

    var original = window.renderLancamentosPgto;

    var wrapped = function () {
      var retorno = original.apply(this, arguments);

      try {
        ampliarFiltrosComCentroDeCustos();
        renderSecaoCentroDeCustos();
        atualizarStatusComCC();
      } catch (e) {
        console.warn('[PATCH CC] Falha ao renderizar despesas do Centro de Custos:', e);
      }

      return retorno;
    };

    wrapped.__patchCC20260926 = true;
    wrapped.__original = original;
    window.renderLancamentosPgto = wrapped;

    return true;
  }

  function inicializar() {
    if (instalar()) return;

    var tentativas = 0;
    var timer = setInterval(function () {
      tentativas++;
      if (instalar() || tentativas >= 40) {
        clearInterval(timer);
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
  } else {
    inicializar();
  }

  window.PatchCentroCustosLancamentos20260926 = {
    render: renderSecaoCentroDeCustos,
    custosDoMes: custosDoMes,
    custosFiltrados: custosFiltrados
  };
})();
