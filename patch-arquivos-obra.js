/**
 * Aba Arquivos da obra — romaneios por tipo (esquadria, acessorio, perfil, consumo)
 */
(function () {
  'use strict';
  if (window.__patchArquivosObra2) return;
  window.__patchArquivosObra2 = true;

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

  function garantirAba() {
    if (document.getElementById('tab-arquivos')) return;
    var host = (document.getElementById('tab-pagamento') || document.getElementById('tab-custo') || {}).parentNode || document.body;
    var tab = document.createElement('div');
    tab.id = 'tab-arquivos';
    tab.className = 'card';
    tab.style.display = 'none';
    tab.innerHTML =
      '<div class="arq-topo"><h3 style="margin:0">Arquivos da obra</h3><span id="arqObraNome"></span></div>' +
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
      if (fin && fin.nextSibling) menu.insertBefore(item, fin.nextSibling);
      else menu.appendChild(item);
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
    var up = await cliente.storage.from('painel-arquivos').upload(path, file, { upsert: false });
    if (up.error) { msg(up.error.message); return; }
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
        '<td><button type="button" class="arq-btn lado arq-baixar">Baixar</button> ' +
        '<button type="button" class="arq-btn perigo arq-apagar">Excluir</button></td>';
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
  window.abrirArquivosObra = abrir;
  setTimeout(function () { garantirAba(); injetarRecebimento(); }, 1200);
  console.log('[arquivos-obra] aba pronta');
})();
