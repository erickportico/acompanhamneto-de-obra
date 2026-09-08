/**
 * Estoque da obra a partir dos romaneios / recebimentos.
 * API externa: localStorage ESTOQUE_API_URL (opcional).
 */
(function () {
  'use strict';
  if (window.__patchEstoqueObra1) return;
  window.__patchEstoqueObra1 = true;

  function obra() {
    try {
      if (typeof getObraAtual === 'function') return getObraAtual();
    } catch (e) {}
    var id = window.db && window.db.obraAtualId;
    return (window.db && window.db.obras || []).find(function (o) { return String(o.id) === String(id); }) || null;
  }

  function linhas() {
    var o = obra();
    var rec = (o && o.recebimentos) || [];
    var map = {};
    rec.forEach(function (r) {
      var k = String(r.ref || r.listaCorte || r.descricao || '').trim();
      if (!k) return;
      if (!map[k]) {
        map[k] = {
          ref: r.ref || k,
          lista: r.listaCorte || '',
          descricao: r.material || r.descricao || '',
          prevista: 0,
          recebida: 0,
          unidade: r.unidade || 'UN'
        };
      }
      map[k].prevista += Number(r.qtdPrevista || 0);
      map[k].recebida += Number(r.qtdRecebida || 0);
    });
    return Object.keys(map).map(function (k) {
      var x = map[k];
      x.saldo = x.prevista - x.recebida;
      x.status = x.recebida <= 0 ? 'Pendente' : (x.saldo > 0 ? 'Parcial' : 'Em obra');
      return x;
    }).sort(function (a, b) { return String(a.ref).localeCompare(String(b.ref)); });
  }

  window.EstoqueAPI = {
    listar: linhas,
    url: function () { try { return localStorage.getItem('ESTOQUE_API_URL') || ''; } catch (e) { return ''; } },
    enviar: async function () {
      var url = this.url();
      var itens = linhas();
      var o = obra();
      var corpo = {
        obra_id: o && o.id,
        obra: o && o.nome,
        em: new Date().toISOString(),
        itens: itens
      };
      if (!url) {
        console.log('[estoque] sem ESTOQUE_API_URL; payload:', corpo);
        return { ok: false, local: corpo, erro: 'Defina localStorage ESTOQUE_API_URL' };
      }
      var r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
      });
      return { ok: r.ok, status: r.status, local: corpo };
    }
  };

  function pintar() {
    var box = document.getElementById('estoqueObraBox');
    if (!box) return;
    var itens = linhas();
    if (!itens.length) {
      box.innerHTML = '<p style="color:#64748b">Nenhum item de recebimento/romaneio nesta obra.</p>';
      return;
    }
    box.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr>' +
      '<th>Ref</th><th>Lista</th><th>Descrição</th><th>Contrato</th><th>Recebido</th><th>Saldo</th><th>Status</th></tr></thead><tbody>' +
      itens.map(function (x) {
        return '<tr><td>' + x.ref + '</td><td>' + x.lista + '</td><td>' + x.descricao + '</td><td>' + x.prevista + '</td><td>' + x.recebida + '</td><td>' + x.saldo + '</td><td>' + x.status + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function montar() {
    var rec = document.getElementById('tab-recebimento');
    if (!rec || document.getElementById('estoqueObraCard')) return;
    var card = document.createElement('div');
    card.id = 'estoqueObraCard';
    card.style.cssText = 'margin:0 0 16px;padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#fff';
    card.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">' +
      '<strong>Estoque da obra (romaneio × recebimento)</strong>' +
      '<button type="button" id="estoqueEnviar" style="border:0;border-radius:8px;padding:8px 12px;background:#0f2744;color:#fff;font-weight:700;cursor:pointer">Enviar à API de estoque</button>' +
      '</div><div id="estoqueObraBox" style="margin-top:10px"></div>';
    var ancora = document.getElementById('arqRecebimentoBox');
    if (ancora && ancora.nextSibling) rec.insertBefore(card, ancora.nextSibling);
    else rec.insertBefore(card, rec.firstChild);
    document.getElementById('estoqueEnviar').onclick = async function () {
      var r = await window.EstoqueAPI.enviar();
      alert(r.ok ? 'Enviado à API de estoque.' : (r.erro || ('HTTP ' + r.status)));
    };
    pintar();
  }

  if (typeof window.trocarAba === 'function' && !window.trocarAba.__estq) {
    var ta = window.trocarAba;
    window.trocarAba = function (aba) {
      var r = ta.apply(this, arguments);
      if (aba === 'recebimento') setTimeout(function () { montar(); pintar(); }, 80);
      return r;
    };
    window.trocarAba.__estq = true;
  }
  setTimeout(function () { montar(); pintar(); }, 1600);
  console.log('[estoque-obra] EstoqueAPI pronta. Use EstoqueAPI.listar()');
})();
