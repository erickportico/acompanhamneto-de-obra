/**
 * Aba Arquivos da obra — romaneios por tipo (esquadria, acessorio, perfil, consumo)
 */
(function () {
  'use strict';
  if (window.__patchArquivosObra9) return;
  window.__patchArquivosObra9 = true;

  var TIPOS = [
    { id: 'esquadria', nome: 'Esquadrias / contramarcos' },
    { id: 'acessorio', nome: 'Acessórios' },
    { id: 'perfil', nome: 'Perfis' },
    { id: 'consumo', nome: 'Uso e consumo' }
  ];
  var tipoAtual = 'esquadria';
  var ACEITA = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';

  function sb() { return window._supabase || null; }
  function obraId() {
    return String((window.db && window.db.obraAtualId) || (document.getElementById('selectObra') || {}).value || '');
  }
  function obraNome() {
    try {
      var id = obraId();
      var o = (window.db && window.db.obras || []).find(function (x) { return String(x.id) === id; });
      return (o && o.nome) || id || 'Obra';
    } catch (e) { return 'Obra'; }
  }
  function email() {
    try {
      var s = JSON.parse(localStorage.getItem('painel_seg_sessao_v1') || sessionStorage.getItem('painel_seg_sessao_v1') || 'null');
      return (s && (s.email || s.usuario)) || '';
    } catch (e) { return ''; }
  }

  var css = document.getElementById('arqObraCss') || document.createElement('style');
  css.id = 'arqObraCss';
  css.textContent =
    '#tab-arquivos{padding:16px}' +
    '#tab-arquivos .arq-topo{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0 0 14px}' +
    '#tab-arquivos .arq-tipos{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}' +
    '#tab-arquivos .arq-tipo{border:1px solid #dbe3ee;background:#fff;border-radius:10px;padding:8px 12px;cursor:pointer;font-weight:700;font-size:13px}' +
    '#tab-arquivos .arq-tipo.on{background:#0f2744;color:#fff;border-color:#0f2744}' +
    '#tab-arquivos .arq-box{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px}' +
    '#tab-arquivos table{width:100%;border-collapse:collapse;font-size:13px}' +
    '#tab-arquivos th,#tab-arquivos td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}' +
    '#tab-arquivos .arq-btn{border:0;border-radius:8px;padding:8px 12px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}' +
    '#tab-arquivos .arq-btn.lado{background:#e2e8f0;color:#16304f}' +
    '#tab-arquivos .arq-btn.perigo{background:#dc2626}' +
    '#tab-arquivos .arq-msg{font-size:13px;color:#64748b;margin:8px 0}';
  document.head.appendChild(css);
  var hs=document.getElementById('arqSetasHide')||document.createElement('style');
  hs.id='arqSetasHide';
  hs.textContent='body > div:has(> span), .or-item:empty{ } .lixo-setas{display:none!important}';
  document.head.appendChild(hs);

  function garantirAba() {
    if (document.getElementById('tab-arquivos')) return;
    var host = (document.getElementById('tab-pagamento') || document.getElementById('tab-custo') || {}).parentNode || document.body;
    var tab = document.createElement('div');
    tab.id = 'tab-arquivos';
    tab.className = 'card';
    tab.style.display = 'none';
    tab.innerHTML =
      '<div class="arq-topo"><div><button type="button" class="arq-btn lado" id="arqVoltar">← Voltar</button></div><h3 style="margin:0">Arquivos da obra</h3><span id="arqObraNome"></span></div>' +
      '<div class="arq-tipos" id="arqTipos"></div>' +
      '<div class="arq-box">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<input type="file" id="arqFile" accept="' + ACEITA + '">' +
      '<input type="date" id="arqData">' +
      '<input type="text" id="arqCodigo" placeholder="Código lista (ex. 042-A26A)" style="padding:8px;border:1px solid #cbd5e1;border-radius:8px">' +
      '<button type="button" class="arq-btn" id="arqEnviar">Enviar romaneio</button>' +
      '<button type="button" class="arq-btn lado" id="arqAtualizar">Atualizar</button>' +
      '</div>' +
      '<p class="arq-msg" id="arqMsg">PDF, Word ou Excel. Fica nesta obra e neste tipo.</p>' +
      '<table><thead><tr><th>Data</th><th>Arquivo</th><th>Lista</th><th>Tipo</th><th>Quem</th><th></th></tr></thead>' +
      '<tbody id="arqBody"></tbody></table></div>';
    host.appendChild(tab);

    var tipos = document.getElementById('arqTipos');
    TIPOS.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'arq-tipo' + (t.id === tipoAtual ? ' on' : '');
      b.textContent = t.nome;
      b.setAttribute('data-tipo', t.id);
      b.onclick = function () {
        tipoAtual = t.id;
        tipos.querySelectorAll('.arq-tipo').forEach(function (x) {
          x.classList.toggle('on', x.getAttribute('data-tipo') === tipoAtual);
        });
        listar();
      };
      tipos.appendChild(b);
    });
    document.getElementById('arqEnviar').onclick = enviar;
    document.getElementById('arqAtualizar').onclick = listar;
    var bv = document.getElementById('arqVoltar');
    if (bv) bv.onclick = voltar;

    var menu = document.querySelector('#orLista');
    if (menu && !document.getElementById('orArqBtn')) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'or-item';
      item.id = 'orArqBtn';
      item.textContent = 'Arquivos da obra';
      item.onclick = function () { abrir(); };
      var fin = null;
      Array.prototype.forEach.call(menu.querySelectorAll('.or-grupo,.or-item'), function (n) {
        if (/financeiro/i.test(n.textContent || '')) fin = n;
      });
      var alvo = (fin && fin.parentNode) ? fin.parentNode : menu;
      try {
        if (fin && fin.nextSibling && fin.nextSibling.parentNode === alvo) alvo.insertBefore(item, fin.nextSibling);
        else alvo.appendChild(item);
      } catch (e) { menu.appendChild(item); }
    }
  }

  function abrir() {
    garantirAba();
    document.querySelectorAll('[id^="tab-"]').forEach(function (el) {
      el.style.display = el.id === 'tab-arquivos' ? 'block' : 'none';
    });
    var n = document.getElementById('arqObraNome');
    if (n) n.textContent = obraNome();
    listar();
  }

  function msg(t, ok) {
    var el = document.getElementById('arqMsg');
    if (!el) return;
    el.style.color = ok ? '#15803d' : '#b91c1c';
    el.textContent = t || '';
  }

  function caminho(file) {
    var limpo = String(file.name || 'arquivo').replace(/[^\w.\-]+/g, '_');
    return obraId() + '/' + tipoAtual + '/' + Date.now() + '_' + limpo;
  }

  async function enviar() {
    var cliente = sb();
    if (!cliente) { msg('Supabase não carregou.'); return; }
    var oid = obraId();
    if (!oid) { msg('Abra uma obra no menu.'); return; }
    var inp = document.getElementById('arqFile');
    var file = inp && inp.files && inp.files[0];
    if (!file) { msg('Escolha o arquivo.'); return; }
    var path = caminho(file);
    msg('Enviando…');
    var up = await cliente.storage.from('painel-arquivos').upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
    if (up.error) { msg('Storage: ' + (up.error.message || JSON.stringify(up.error))); console.warn(up.error); return; }
    var row = {
      obra_id: oid,
      tipo: tipoAtual,
      nome_arquivo: file.name,
      caminho: path,
      mime: file.type || '',
      tamanho: file.size,
      codigo_lista: (document.getElementById('arqCodigo').value || '').trim() || null,
      data_romaneio: document.getElementById('arqData').value || null,
      criado_por: email()
    };
    var ins = await cliente.from('painel_arquivos').insert(row);
    if (ins.error) { msg(ins.error.message); return; }
    if (inp) inp.value = '';
    msg('Romaneio salvo nesta obra.', true);
    listar();
  }

  async function listar() {
    var tb = document.getElementById('arqBody');
    if (!tb) return;
    var cliente = sb();
    var oid = obraId();
    if (!cliente || !oid) {
      tb.innerHTML = '<tr><td colspan="6">Sem obra ou sem Supabase.</td></tr>';
      return;
    }
    var r = await cliente.from('painel_arquivos').select('*').eq('obra_id', oid).eq('tipo', tipoAtual).order('criado_em', { ascending: false });
    if (r.error) {
      tb.innerHTML = '<tr><td colspan="6">' + r.error.message + '</td></tr>';
      return;
    }
    if (!(r.data || []).length) {
      tb.innerHTML = '<tr><td colspan="6">Nenhum romaneio neste tipo.</td></tr>';
      return;
    }
    tb.innerHTML = '';
    r.data.forEach(function (a) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + (a.data_romaneio || (a.criado_em || '').slice(0, 10)) + '</td>' +
        '<td>' + (a.nome_arquivo || '') + '</td>' +
        '<td>' + (a.codigo_lista || '-') + '</td>' +
        '<td>' + (a.tipo || '') + '</td>' +
        '<td>' + (a.criado_por || '') + '</td>' +
        '<td><button type="button" class="arq-btn lado arq-ver">Abrir</button> ' +
        '<button type="button" class="arq-btn lado arq-imp">Importar recebimento</button> ' +
        '<button type="button" class="arq-btn lado arq-baixar">Baixar</button> ' +
        '<button type="button" class="arq-btn perigo arq-apagar">Excluir</button></td>';
      tr.querySelector('.arq-ver').onclick = function () { abrirArquivo(a); };
      tr.querySelector('.arq-imp').onclick = function () { importarRecebimento(a); };
      tr.querySelector('.arq-baixar').onclick = function () { baixar(a); };
      tr.querySelector('.arq-apagar').onclick = function () { apagar(a); };
      tb.appendChild(tr);
    });
  }

  async function baixar(a) {
    var cliente = sb();
    if (!cliente) return;
    var r = await cliente.storage.from('painel-arquivos').download(a.caminho);
    if (r.error) { msg(r.error.message); return; }
    var url = URL.createObjectURL(r.data);
    var link = document.createElement('a');
    link.href = url;
    link.download = a.nome_arquivo || 'arquivo';
    link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  async function apagar(a) {
    if (!confirm('Excluir este arquivo da obra?')) return;
    var cliente = sb();
    if (!cliente) return;
    await cliente.storage.from('painel-arquivos').remove([a.caminho]);
    var del = await cliente.from('painel_arquivos').delete().eq('id', a.id);
    if (del.error) { msg(del.error.message); return; }
    msg('Removido.', true);
    listar();
  }


  var ultimaAba = 'recebimento';
  function voltar() {
    try {
      if (typeof window.voltarAba === 'function') { window.voltarAba(); return; }
    } catch (e) {}
    if (typeof window.trocarAba === 'function') window.trocarAba(ultimaAba || 'recebimento');
  }
  function verModal(html) {
    var old = document.getElementById('arqVerModal');
    if (old) old.remove();
    var m = document.createElement('div');
    m.id = 'arqVerModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:20px';
    m.innerHTML = '<div style="background:#fff;max-width:96vw;max-height:90vh;overflow:auto;border-radius:12px;padding:14px;min-width:280px">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px">' +
      '<strong>Romaneio</strong><button type="button" class="arq-btn lado" id="arqVerX">Fechar</button></div>' + html + '</div>';
    document.body.appendChild(m);
    document.getElementById('arqVerX').onclick = function () { m.remove(); };
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
  }
  async function blobArquivo(a) {
    var cliente = sb();
    var d = await cliente.storage.from('painel-arquivos').download(a.caminho);
    if (d.error) throw d.error;
    return d.data;
  }
  async function abrirArquivo(a) {
    try {
      var nome = String(a.nome_arquivo || a.caminho || '').toLowerCase();
      if (/\.xlsx?$/.test(nome)) {
        if (typeof XLSX === 'undefined') { msg('Abra o Excel pelo Baixar: o leitor XLSX não está na página.'); return; }
        var blob = await blobArquivo(a);
        var wb = XLSX.read(await blob.arrayBuffer(), { type: 'array' });
        var sh = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' });
        var html = '<div style="overflow:auto;max-height:70vh"><table style="border-collapse:collapse;font-size:12px">';
        rows.slice(0, 80).forEach(function (row, i) {
          html += '<tr>';
          (row || []).slice(0, 16).forEach(function (c) {
            var tag = i === 0 ? 'th' : 'td';
            html += '<' + tag + ' style="border:1px solid #e2e8f0;padding:4px 6px;white-space:nowrap">' + String(c == null ? '' : c).replace(/</g, '') + '</' + tag + '>';
          });
          html += '</tr>';
        });
        html += '</table></div>';
        verModal(html);
        return;
      }
      if (/\.pdf$/.test(nome) || /\.(png|jpe?g|gif|webp)$/.test(nome)) {
        var blob = await blobArquivo(a);
        var url = URL.createObjectURL(blob);
        var tag = /\.pdf$/.test(nome)
          ? '<iframe src="' + url + '" style="width:86vw;height:75vh;border:0"></iframe>'
          : '<img src="' + url + '" style="max-width:86vw;max-height:75vh">';
        verModal(tag);
        return;
      }
      var cliente = sb();
      var s = await cliente.storage.from('painel-arquivos').createSignedUrl(a.caminho, 3600);
      if (s.data && s.data.signedUrl) window.open(s.data.signedUrl, '_blank');
      else baixar(a);
    } catch (e) {
      msg(e.message || String(e));
    }
  }
    function num(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    return Number(String(v).replace(/\./g, '').replace(',', '.')) || Number(v) || 0;
  }
  function cab(h) { return String(h || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
  async function importarRecebimento(a) {
    var cliente = sb();
    if (!cliente) return;
    var nome = String(a.nome_arquivo || '').toLowerCase();
    if (!/\.xlsx?$/.test(nome)) { msg('Importar recebimento só lê Excel (.xls/.xlsx).'); return; }
    var d = await cliente.storage.from('painel-arquivos').download(a.caminho);
    if (d.error) { msg(d.error.message); return; }
    if (typeof XLSX === 'undefined') { msg('Planilha XLSX não carregou no painel.'); return; }
    var buf = await d.data.arrayBuffer();
    var wb = XLSX.read(buf, { type: 'array' });
    var sh = wb.Sheets[wb.SheetNames[0]];
    var rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '', raw: false, blankrows: false });
    if (!rows.length) { msg('Planilha vazia.'); return; }
    function norm(v) { return cab(v).replace(/\s+/g, ' '); }
    var hi = -1, map = {};
    for (var i = 0; i < rows.length; i++) {
      var line = (rows[i] || []).map(norm);
      if (line.some(function (c) { return c.indexOf('REFERENCIA') >= 0 || c.indexOf('CODIGO LISTA') >= 0; })) {
        hi = i;
        line.forEach(function (c, idx) { if (c) map[c] = idx; });
        break;
      }
    }
    function col(aliases) {
      var keys = Object.keys(map);
      for (var k = 0; k < aliases.length; k++) {
        if (map[aliases[k]] != null) return map[aliases[k]];
        for (var k2 = 0; k2 < keys.length; k2++) {
          if (keys[k2].indexOf(aliases[k]) >= 0) return map[keys[k2]];
        }
      }
      return -1;
    }
    var iCod = col(['CODIGO LISTA', 'CODIGO']);
    var iRef = col(['REFERENCIA', 'REF']);
    var iDesc = col(['DESCRICAO']);
    var iQtd = col(['QTD CONTRATO', 'QTD']);
    var iEnt = -1;
    Object.keys(map).forEach(function (k) { if (k.indexOf('ENTREGA') === 0 && iEnt < 0) iEnt = map[k]; });
    if (iRef < 0) {
      for (var r0 = 0; r0 < Math.min(rows.length, 40); r0++) {
        var line = rows[r0] || [];
        for (var c0 = 0; c0 < line.length; c0++) {
          if (/^[JP]\d/i.test(String(line[c0] || '').trim())) { iRef = c0; break; }
        }
        if (iRef >= 0) break;
      }
    }
    var obra = (typeof getObraAtual === 'function') ? getObraAtual() : ((window.db && window.db.obras || []).find(function (o) { return String(o.id) === obraId(); }));
    if (!obra) { msg('Obra atual não encontrada.'); return; }
    if (!obra.recebimentos) obra.recebimentos = [];
    var n = 0;
    var ini = hi >= 0 ? hi + 1 : 0;
    for (var r = ini; r < rows.length; r++) {
      var row = rows[r] || [];
      var ref = iRef >= 0 ? String(row[iRef] || '').trim() : '';
      var desc = iDesc >= 0 ? String(row[iDesc] || '').trim() : '';
      if (!ref && row.length > 1) ref = String(row[1] || '').trim();
      if (!desc && row.length > 3) desc = String(row[3] || '').trim();
      if (!ref && !desc) continue;
      if (/^TOTAL/i.test(ref) || /^TOTAL/i.test(String(row[0] || '')) || /^MARCELO/i.test(ref)) continue;
      if (!/^[A-Z]{0,3}\d/i.test(ref) && !desc) continue;
      var prev = iQtd >= 0 ? num(row[iQtd]) : num(row[4]);
      var recb = iEnt >= 0 ? num(row[iEnt]) : num(row[10]);
      var st = recb <= 0 ? 'Pendente' : (prev > 0 && recb < prev ? 'Parcial' : 'Recebido');
      obra.recebimentos.push({
        id: Date.now() + Math.random() + r,
        data: a.data_romaneio || (a.criado_em || '').slice(0, 10),
        listaCorte: (iCod >= 0 ? String(row[iCod] || a.codigo_lista || '') : (a.codigo_lista || '')),
        nf: '',
        fornecedor: 'Romaneio',
        classe: tipoAtual,
        marca: '',
        codigoCor: '',
        descricao: desc,
        material: desc,
        ref: ref,
        qtdPrevista: prev,
        qtdRecebida: recb,
        unidade: 'UN',
        status: st,
        responsavel: a.criado_por || '',
        local: obra.nome || '',
        obs: 'Importado de ' + (a.nome_arquivo || '')
      });
      n++;
    }
    if (!n) { msg('Nenhuma linha útil no romaneio. Abra o arquivo e confira se a aba tem REFERÊNCIA / J01.'); return; }
    try { if (typeof salvarDB === 'function') salvarDB(); } catch (e) {}
    msg(n + ' itens foram para Recebimento desta obra.', true);
    if (typeof window.trocarAba === 'function') window.trocarAba('recebimento');
  }

  function injetarRecebimento() {
    var rec = document.getElementById('tab-recebimento');
    if (!rec || document.getElementById('arqRecebimentoBox')) return;
    var box = document.createElement('div');
    box.id = 'arqRecebimentoBox';
    box.style.cssText = 'margin:0 0 16px;padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#fff';
    box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<strong>Romaneios desta obra</strong>' +
      '<button type="button" class="arq-btn lado" id="arqRecAbrir">Abrir arquivos da obra</button></div>' +
      '<p style="margin:6px 0 10px;color:#64748b;font-size:13px">O mesmo arquivo da aba Arquivos. Tipo abaixo combina com o recebimento.</p>' +
      '<div id="arqRecTipos" style="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px"></div>' +
      '<div id="arqRecLista" style="font-size:13px;color:#334155">Carregando…</div>';
    rec.insertBefore(box, rec.firstChild);
    var wrap = document.getElementById('arqRecTipos');
    TIPOS.forEach(function (tp) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'arq-tipo' + (tp.id === tipoAtual ? ' on' : '');
      b.textContent = tp.nome;
      b.onclick = function () {
        tipoAtual = tp.id;
        wrap.querySelectorAll('.arq-tipo').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        pintarRecebimento();
      };
      wrap.appendChild(b);
    });
    document.getElementById('arqRecAbrir').onclick = abrir;
    pintarRecebimento();
  }
  async function pintarRecebimento() {
    var el = document.getElementById('arqRecLista');
    if (!el) return;
    var cliente = sb();
    var oid = obraId();
    if (!cliente || !oid) { el.textContent = 'Abra uma obra e entre no Supabase.'; return; }
    var r = await cliente.from('painel_arquivos').select('*').eq('obra_id', oid).eq('tipo', tipoAtual).order('criado_em', { ascending: false }).limit(8);
    if (r.error) { el.textContent = r.error.message; return; }
    if (!(r.data || []).length) { el.textContent = 'Nenhum romaneio de ' + tipoAtual + ' nesta obra.'; return; }
    el.innerHTML = '<table style="width:100%;border-collapse:collapse"><thead><tr><th>Data</th><th>Arquivo</th><th>Lista</th></tr></thead><tbody>' +
      r.data.map(function (a) {
        return '<tr><td>' + (a.data_romaneio || (a.criado_em || '').slice(0,10)) + '</td><td>' + (a.nome_arquivo || '') + '</td><td>' + (a.codigo_lista || '-') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  if (typeof window.trocarAba === 'function' && !window.trocarAba.__arq) {
    var ta = window.trocarAba;
    window.trocarAba = function (aba) {
      var r = ta.apply(this, arguments);
      if (aba === 'recebimento') setTimeout(function () { injetarRecebimento(); pintarRecebimento(); }, 50);
      return r;
    };
    window.trocarAba.__arq = true;
  }

  function limparSetas() {
    var nos = document.querySelectorAll('body *');
    for (var i = 0; i < nos.length; i++) {
      var el = nos[i];
      if (el.children && el.children.length) continue;
      var tx = (el.textContent || '').replace(/\s+/g, '');
      if (/^[→▸▾]+$/.test(tx) && tx.length >= 3) {
        el.style.display = 'none';
        el.classList.add('lixo-setas');
      }
    }
  }
  setTimeout(limparSetas, 800);
  setTimeout(limparSetas, 2500);


  function botaoExcluirRecebimento() {
    var tab = document.getElementById('tab-recebimento');
    if (!tab) return;
    tab.querySelectorAll('.materiais-consolidados .arq-exc-rec, #tabelaMateriaisConsolidados .arq-exc-rec').forEach(function (b) { b.remove(); });
    var tabela = null;
    var titulos = tab.querySelectorAll('h2,h3,.card-title,div');
    for (var i = 0; i < titulos.length; i++) {
      if (/Controle de Recebimento de Materiais/i.test(titulos[i].textContent || '')) {
        var box = titulos[i].parentNode;
        tabela = box && box.querySelector('table');
        if (!tabela && box) tabela = box.parentNode && box.parentNode.querySelector('.recebimento-table, table');
        break;
      }
    }
    if (!tabela) tabela = tab.querySelector('.recebimento-table') || tab.querySelector('table');
    var rows = tabela ? tabela.querySelectorAll('tbody tr') : [];
    rows.forEach(function (tr) {
      if (tr.querySelector('.arq-exc-rec')) return;
      var last = tr.cells[tr.cells.length - 1];
      if (!last) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'arq-exc-rec';
      btn.textContent = 'Excluir';
      btn.style.cssText = 'border:0;background:#dc2626;color:#fff;border-radius:6px;padding:4px 8px;font-size:12px;font-weight:700;cursor:pointer';
      btn.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var obra = (typeof getObraAtual === 'function') ? getObraAtual() : null;
        if (!obra || !obra.recebimentos) return;
        var ref = '';
        var cells = tr.querySelectorAll('input,select,td');
        cells.forEach(function (c) {
          var v = c.value || c.textContent || '';
          if (/^[JP]\d/i.test(v.trim()) && !ref) ref = v.trim();
        });
        if (!confirm('Excluir este recebimento' + (ref ? ' (' + ref + ')' : '') + '?')) return;
        var idx = Array.prototype.indexOf.call(tr.parentNode.children, tr);
        /* tenta pelo texto da descrição + ref */
        var desc = '';
        var inputs = tr.querySelectorAll('input');
        if (inputs[5]) desc = inputs[5].value || '';
        var antes = obra.recebimentos.length;
        obra.recebimentos = obra.recebimentos.filter(function (r, i) {
          if (ref && String(r.ref || r.codigoCor || '') === ref && String(r.descricao || r.material || '') === desc) return false;
          return true;
        });
        if (obra.recebimentos.length === antes && obra.recebimentos[idx]) {
          obra.recebimentos.splice(idx, 1);
        }
        try { if (typeof salvarDB === 'function') salvarDB(); } catch (e) {}
        tr.remove();
      };
      last.appendChild(btn);
    });
    var ths = tab.querySelectorAll('thead th:last-child, tbody td:last-child');
    ths.forEach(function (c) {
      c.style.position = 'sticky';
      c.style.right = '0';
      c.style.background = '#fff';
      c.style.zIndex = '2';
    });
  }
  if (typeof window.trocarAba === 'function') {
    var _ta2 = window.trocarAba;
    if (!_ta2.__excRec) {
      window.trocarAba = function (aba) {
        var r = _ta2.apply(this, arguments);
        if (aba === 'recebimento') setTimeout(botaoExcluirRecebimento, 200);
        return r;
      };
      window.trocarAba.__excRec = true;
    }
  }
  setTimeout(botaoExcluirRecebimento, 1800);
  window.abrirArquivosObra = abrir;
  setTimeout(function () { garantirAba(); injetarRecebimento(); }, 1200);
  console.log('[arquivos-obra] aba pronta');
})();
