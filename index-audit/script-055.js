
                /* ====== PATCH84_DIARIO_OBRA_OK - Diario de Obra com relatorio fotografico ====== */
                (function () {
                  'use strict';
                  if (window.__PS84) { return; }
                  window.__PS84 = true;
                
                  var BASE = 'p84_diarios_v1';
                  var LOJA = 'reg';
                  var K_LS = 'p84_diarios_ls_v1';
                  var atual = null;
                  var lista = [];
                  var timerSalvar = null;
                
                  var DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
                  var NOMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                  var TURNOS = ['MANHÃ', 'TARDE', 'NOITE'];
                  var TEMPOS = ['SOL', 'NUBLADO', 'CHUVA', 'IMPRATICÁVEL'];
                  var TIPOS_OC = ['Atraso', 'Falta de material', 'Chuva', 'Retrabalho', 'Acidente', 'Interferência de terceiros', 'Segurança', 'Outro'];
                
                  /* ================================================================ *
                   * utilidades
                   * ================================================================ */
                  function esc(s) {
                    return String(s == null ? '' : s)
                      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                  }
                
                  function novoId(p) {
                    return String(p || 'd') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
                  }
                
                  function hoje() {
                    var d = new Date();
                    function p(n) { return (n < 10 ? '0' : '') + n; }
                    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
                  }
                
                  function dataBonita(iso) {
                    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
                    return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(iso || '');
                  }
                
                  function diaDaSemana(iso) {
                    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
                    if (!m) { return -1; }
                    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
                    return d.getDay();
                  }
                
                  function aviso(msg, tipo) {
                    try {
                      if (typeof window.mostrarToastPainel === 'function') {
                        window.mostrarToastPainel(msg, tipo || 'ok');
                        return;
                      }
                    } catch (e) {}
                    var d = document.getElementById('p84Aviso');
                    if (!d) {
                      d = document.createElement('div');
                      d.id = 'p84Aviso';
                      document.body.appendChild(d);
                    }
                    d.textContent = String(msg || '');
                    d.className = 'p84-aviso ' + (tipo === 'erro' ? 'p84-erro' : 'p84-ok');
                    d.style.display = 'block';
                    clearTimeout(d.__t);
                    d.__t = setTimeout(function () { d.style.display = 'none'; }, 3600);
                  }
                
                  function obraAtual() {
                    try {
                      if (typeof window.getObraAtual === 'function') { return window.getObraAtual(); }
                    } catch (e) {}
                    return null;
                  }
                
                  /* ================================================================ *
                   * guarda os diarios
                   * ================================================================ */
                  function abrirBase(ok, falhou) {
                    try {
                      if (!window.indexedDB) { falhou(); return; }
                      var req = window.indexedDB.open(BASE, 1);
                      req.onupgradeneeded = function () {
                        var d = req.result;
                        if (!d.objectStoreNames.contains(LOJA)) { d.createObjectStore(LOJA, { keyPath: 'id' }); }
                      };
                      req.onsuccess = function () { ok(req.result); };
                      req.onerror = function () { falhou(); };
                    } catch (e) { falhou(); }
                  }
                
                  function lsLer() {
                    try { return JSON.parse(localStorage.getItem(K_LS) || '[]') || []; } catch (e) { return []; }
                  }
                
                  function lsGravar(arr) {
                    try { localStorage.setItem(K_LS, JSON.stringify(arr)); return true; } catch (e) { return false; }
                  }
                
                  function guardar(reg, depois) {
                    reg.alterado = new Date().toISOString();
                    abrirBase(function (d) {
                      try {
                        var t = d.transaction(LOJA, 'readwrite');
                        t.objectStore(LOJA).put(reg);
                        t.oncomplete = function () { if (depois) { depois(true); } };
                        t.onerror = function () { if (depois) { depois(false); } };
                      } catch (e) { if (depois) { depois(false); } }
                    }, function () {
                      var arr = lsLer(), achou = false;
                      for (var i = 0; i < arr.length; i++) { if (arr[i].id === reg.id) { arr[i] = reg; achou = true; break; } }
                      if (!achou) { arr.push(reg); }
                      if (depois) { depois(lsGravar(arr)); }
                    });
                  }
                
                  function carregarTodos(depois) {
                    abrirBase(function (d) {
                      try {
                        var t = d.transaction(LOJA, 'readonly');
                        var r = t.objectStore(LOJA).getAll();
                        r.onsuccess = function () { depois(r.result || []); };
                        r.onerror = function () { depois(lsLer()); };
                      } catch (e) { depois(lsLer()); }
                    }, function () { depois(lsLer()); });
                  }
                
                  function apagar(id, depois) {
                    abrirBase(function (d) {
                      try {
                        var t = d.transaction(LOJA, 'readwrite');
                        t.objectStore(LOJA).delete(id);
                        t.oncomplete = function () { if (depois) { depois(true); } };
                        t.onerror = function () { if (depois) { depois(false); } };
                      } catch (e) { if (depois) { depois(false); } }
                    }, function () {
                      var arr = lsLer().filter(function (r) { return r.id !== id; });
                      if (depois) { depois(lsGravar(arr)); }
                    });
                  }
                
                  /* ================================================================ *
                   * modelo do diario
                   * ================================================================ */
                  function tarefaNova(n) {
                    return { id: novoId('tr'), item: String(n || ''), empresa: '', quant: '', desc: '', obs: '', fotos: [] };
                  }
                
                  function ocorrenciaNova(n) {
                    return { id: novoId('oi'), item: String(n || ''), empresa: '', desc: '', tipo: '', fotos: [] };
                  }
                
                  function diarioNovo(base) {
                    var o = obraAtual() || {};
                    var d = {
                      id: novoId('dia'),
                      criado: new Date().toISOString(),
                      numero: '',
                      obra: o.nome || '',
                      cliente: o.cliente || '',
                      inicioObra: o.inicio || '',
                      terminoObra: o.termino || o.previsao || '',
                      prazoObra: '',
                      respTecnico: '',
                      data: hoje(),
                      responsavel: '',
                      turnos: {
                        'MANHÃ': { tempo: '', efetivo: '' },
                        'TARDE': { tempo: '', efetivo: '' },
                        'NOITE': { tempo: '', efetivo: '' }
                      },
                      tarefas: [tarefaNova(1)],
                      ocorrencias: [ocorrenciaNova(1)],
                      resumo: '',
                      fotosRF: []
                    };
                    if (base) {
                      d.obra = base.obra;
                      d.cliente = base.cliente;
                      d.inicioObra = base.inicioObra;
                      d.terminoObra = base.terminoObra;
                      d.prazoObra = base.prazoObra;
                      d.respTecnico = base.respTecnico;
                      d.responsavel = base.responsavel;
                      d.tarefas = (base.tarefas || []).map(function (t, i) {
                        return { id: novoId('tr'), item: String(i + 1), empresa: t.empresa, quant: '', desc: t.desc, obs: '', fotos: [] };
                      });
                      if (!d.tarefas.length) { d.tarefas = [tarefaNova(1)]; }
                      d.numero = base.numero ? String(Number(base.numero) + 1 || '') : '';
                    }
                    return d;
                  }
                
                  /* ================================================================ *
                   * imagens: galeria ou camera na obra
                   * ================================================================ */
                  function comprimir(dataURL, depois) {
                    try {
                      var img = new Image();
                      img.onload = function () {
                        try {
                          var max = 1400;
                          var l = img.width, a = img.height;
                          if (l > max || a > max) {
                            var f = Math.min(max / l, max / a);
                            l = Math.round(l * f); a = Math.round(a * f);
                          }
                          var c = document.createElement('canvas');
                          c.width = l; c.height = a;
                          c.getContext('2d').drawImage(img, 0, 0, l, a);
                          depois(c.toDataURL('image/jpeg', 0.72));
                        } catch (e) { depois(null); }
                      };
                      img.onerror = function () { depois(null); };
                      img.src = dataURL;
                    } catch (e) { depois(null); }
                  }
                
                  function lerArquivos(arquivos, depois) {
                    var itens = [], pend = 0, i;
                    if (!arquivos || !arquivos.length) { depois(itens); return; }
                    for (i = 0; i < arquivos.length; i++) {
                      if (!/^image\//.test(arquivos[i].type || '')) { continue; }
                      pend++;
                      (function (arq) {
                        var fr = new FileReader();
                        fr.onload = function () {
                          comprimir(String(fr.result), function (u) {
                            if (u && /^data:image\/(jpeg|png|webp);base64,/i.test(u)) {
                              itens.push({ id: novoId('f'), url: u, leg: '' });
                            }
                            pend--;
                            if (pend === 0) { depois(itens); }
                          });
                        };
                        fr.onerror = function () { pend--; if (pend === 0) { depois(itens); } };
                        fr.readAsDataURL(arq);
                      })(arquivos[i]);
                    }
                    if (pend === 0) { depois(itens); }
                  }
                
                  function escolherImagens(depois) {
                    var inp = document.createElement('input');
                    inp.type = 'file';
                    inp.accept = 'image/jpeg,image/png,image/webp';
                    inp.multiple = true;
                    inp.style.display = 'none';
                    document.body.appendChild(inp);
                    inp.addEventListener('change', function () {
                      lerArquivos(inp.files, function (itens) {
                        try { document.body.removeChild(inp); } catch (e) {}
                        if (!itens.length && inp.files && inp.files.length) {
                          aviso('As imagens escolhidas não puderam ser lidas. No celular, use JPG, PNG ou WEBP; fotos HEIC/HEIF precisam ser convertidas antes.', 'erro');
                        }
                        depois(itens);
                      });
                    });
                    inp.click();
                  }
                
                  function camaraDoAparelho(depois) {
                    var inp = document.createElement('input');
                    inp.type = 'file';
                    inp.accept = 'image/jpeg,image/png,image/webp';
                    inp.setAttribute('capture', 'environment');
                    inp.style.display = 'none';
                    document.body.appendChild(inp);
                    inp.addEventListener('change', function () {
                      lerArquivos(inp.files, function (itens) {
                        try { document.body.removeChild(inp); } catch (e) {}
                        if (!itens.length && inp.files && inp.files.length) {
                          aviso('As imagens escolhidas não puderam ser lidas. No celular, use JPG, PNG ou WEBP; fotos HEIC/HEIF precisam ser convertidas antes.', 'erro');
                        }
                        depois(itens);
                      });
                    });
                    inp.click();
                  }
                
                  function tirarFoto(depois) {
                    var temApi = false;
                    try { temApi = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); } catch (e) {}
                    if (!temApi) { camaraDoAparelho(depois); return; }
                
                    var fundo = document.createElement('div');
                    fundo.className = 'p84-cam';
                    fundo.innerHTML =
                      '<div class="p84-cam-cx">' +
                        '<video id="p84Video" autoplay playsinline muted></video>' +
                        '<div class="p84-cam-pe">' +
                          '<button type="button" class="p84-btn p84-btn-ok" data-a="tirar">Fotografar</button>' +
                          '<button type="button" class="p84-btn" data-a="virar">Virar camera</button>' +
                          '<button type="button" class="p84-btn" data-a="arquivo">Usar camera do aparelho</button>' +
                          '<button type="button" class="p84-btn p84-btn-no" data-a="sair">Fechar</button>' +
                        '</div>' +
                        '<div class="p84-cam-nota">Dica: se a imagem nao aparecer, use o botao "Usar camera do aparelho".</div>' +
                      '</div>';
                    document.body.appendChild(fundo);
                
                    var video = fundo.querySelector('#p84Video');
                    var fluxo = null;
                    var modo = 'environment';
                    var fotos = [];
                
                    function parar() {
                      try { if (fluxo) { fluxo.getTracks().forEach(function (t) { t.stop(); }); } } catch (e) {}
                      fluxo = null;
                    }
                
                    function sair() {
                      parar();
                      try { document.body.removeChild(fundo); } catch (e) {}
                      depois(fotos);
                    }
                
                    function ligar() {
                      parar();
                      navigator.mediaDevices.getUserMedia({ video: { facingMode: modo }, audio: false })
                        .then(function (f) { fluxo = f; video.srcObject = f; })
                        .catch(function () {
                          aviso('Nao consegui abrir a camera pelo navegador. Vou usar a camera do aparelho.', 'erro');
                          parar();
                          try { document.body.removeChild(fundo); } catch (e) {}
                          camaraDoAparelho(depois);
                        });
                    }
                
                    fundo.addEventListener('click', function (ev) {
                      var b = ev.target.closest ? ev.target.closest('[data-a]') : null;
                      if (!b) { if (ev.target === fundo) { sair(); } return; }
                      var a = b.getAttribute('data-a');
                      if (a === 'sair') { sair(); return; }
                      if (a === 'virar') { modo = (modo === 'environment') ? 'user' : 'environment'; ligar(); return; }
                      if (a === 'arquivo') {
                        parar();
                        try { document.body.removeChild(fundo); } catch (e) {}
                        camaraDoAparelho(function (itens) { depois(fotos.concat(itens)); });
                        return;
                      }
                      if (a === 'tirar') {
                        try {
                          var c = document.createElement('canvas');
                          var max = 1400;
                          var l = video.videoWidth || 1280, alt = video.videoHeight || 960;
                          if (l > max || alt > max) {
                            var fa = Math.min(max / l, max / alt);
                            l = Math.round(l * fa); alt = Math.round(alt * fa);
                          }
                          c.width = l; c.height = alt;
                          c.getContext('2d').drawImage(video, 0, 0, l, alt);
                          fotos.push({ id: novoId('f'), url: c.toDataURL('image/jpeg', 0.72), leg: '' });
                          aviso('Foto capturada (' + fotos.length + '). Pode fotografar mais ou fechar.');
                        } catch (e) { aviso('Nao consegui capturar a foto.', 'erro'); }
                      }
                    });
                
                    ligar();
                  }
                
                  /* ================================================================ *
                   * estilo
                   * ================================================================ */
                  function estilo() {
                    if (document.getElementById('p84Estilo')) { return; }
                    var s = document.createElement('style');
                    s.id = 'p84Estilo';
                    s.textContent = [
                      '#p84Botao{background:#16a34a;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-weight:600;cursor:pointer;margin:4px}',
                      '#p84Botao:hover{filter:brightness(1.08)}',
                      '.p84-aviso{position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:10px 14px;border-radius:10px;color:#fff;font:13px/1.4 system-ui,Segoe UI,Arial;box-shadow:0 8px 24px rgba(0,0,0,.35);display:none}',
                      '.p84-ok{background:#0f766e}.p84-erro{background:#b91c1c}',
                      '#p84Fundo{position:fixed;inset:0;background:rgba(2,6,23,.72);z-index:2147483000;display:none;align-items:center;justify-content:center;padding:14px;overflow:auto}',
                      '#p84Caixa{background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:14px;width:min(1100px,100%);max-height:94vh;display:flex;flex-direction:column;margin:auto;font:14px/1.5 system-ui,Segoe UI,Arial}',
                      '#p84Caixa header{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #334155}',
                      '#p84Caixa header h3{margin:0;font-size:16px}',
                      '#p84Corpo{padding:14px;overflow:auto}',
                      '#p84Pe{display:flex;flex-wrap:wrap;gap:8px;padding:12px 14px;border-top:1px solid #334155}',
                      '.p84-btn{background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:9px;padding:7px 12px;cursor:pointer;font-size:13px}',
                      '.p84-btn:hover{background:#243449}',
                      '.p84-btn-ok{background:#16a34a;border-color:#16a34a;color:#fff}',
                      '.p84-btn-no{background:#b91c1c;border-color:#b91c1c;color:#fff}',
                      '.p84-btn-mini{padding:4px 8px;font-size:12px}',
                      '.p84-sec{border:1px solid #334155;border-radius:12px;padding:12px;margin:0 0 12px}',
                      '.p84-sec>h4{margin:0 0 10px;font-size:14px;color:#86efac;text-transform:uppercase;letter-spacing:.4px}',
                      '.p84-g{display:grid;gap:10px}',
                      '.p84-g2{grid-template-columns:1fr 1fr}',
                      '.p84-g3{grid-template-columns:1fr 1fr 1fr}',
                      '.p84-g4{grid-template-columns:1fr 1fr 1fr 1fr}',
                      '@media(max-width:820px){.p84-g2,.p84-g3,.p84-g4{grid-template-columns:1fr}}',
                      '.p84-c{display:flex;flex-direction:column;gap:4px}',
                      '.p84-c>span{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px}',
                      '.p84-in,.p84-ta,.p84-sel{background:#0b1324;border:1px solid #334155;border-radius:8px;color:#e2e8f0;padding:8px;font:13px/1.5 inherit;width:100%;box-sizing:border-box}',
                      '.p84-ta{min-height:70px;resize:vertical}',
                      '.p84-dias{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}',
                      '.p84-dia{width:34px;height:34px;border-radius:8px;border:1px solid #334155;background:#0b1324;color:#e2e8f0;font-weight:700;cursor:pointer}',
                      '.p84-dia.on{background:#16a34a;border-color:#16a34a;color:#fff}',
                      '.p84-turno{border:1px solid #2b3a52;border-radius:10px;padding:10px;background:#0b1324}',
                      '.p84-turno b{display:block;font-size:12px;color:#cbd5e1;margin-bottom:6px}',
                      '.p84-temp{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}',
                      '.p84-tp{border:1px solid #334155;background:#0f172a;color:#e2e8f0;border-radius:7px;padding:4px 7px;font-size:11px;cursor:pointer}',
                      '.p84-tp.on{background:#0284c7;border-color:#0284c7;color:#fff}',
                      '.p84-item{border:1px solid #2b3a52;border-radius:10px;padding:10px;margin:0 0 10px;background:#0b1324}',
                      '.p84-item-topo{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:8px}',
                      '.p84-item-topo b{font-size:13px;color:#cbd5e1}',
                      '.p84-fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:8px}',
                      '.p84-foto{border:1px solid #334155;border-radius:8px;overflow:hidden;background:#0f172a}',
                      '.p84-foto img{width:100%;height:110px;object-fit:cover;display:block;cursor:zoom-in}',
                      '.p84-foto .p84-leg{width:100%;border:none;border-top:1px solid #334155;background:#0b1324;color:#e2e8f0;padding:5px;font-size:12px;box-sizing:border-box}',
                      '.p84-foto .p84-fx{display:flex;gap:4px;padding:4px}',
                      '.p84-vazio{padding:10px;border:1px dashed #334155;border-radius:10px;color:#94a3b8}',
                      '.p84-tab{width:100%;border-collapse:collapse;font-size:13px}',
                      '.p84-tab th,.p84-tab td{border:1px solid #334155;padding:6px;text-align:left}',
                      '.p84-tab th{background:#16233b;color:#cbd5e1;font-size:12px}',
                      '.p84-cam{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:2147483100;display:flex;align-items:center;justify-content:center;padding:12px}',
                      '.p84-cam-cx{background:#0f172a;border:1px solid #334155;border-radius:12px;padding:10px;max-width:min(900px,100%);margin:auto}',
                      '.p84-cam-cx video{width:100%;max-height:70vh;background:#000;border-radius:8px;display:block}',
                      '.p84-cam-pe{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;justify-content:center}',
                      '.p84-cam-nota{color:#94a3b8;font-size:12px;text-align:center;margin-top:6px}',
                      '.p84-lupa{position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:14px}',
                      '.p84-lupa img{max-width:100%;max-height:100%;border-radius:8px}',
                      '#p84Impressao{display:none}',
                      '@media print{',
                      '  body>*{display:none !important}',
                      '  #p84Impressao{display:block !important;background:#fff;color:#000}',
                      '  @page{size:A4;margin:10mm}',
                      '}',
                      '#p84Impressao,#p84Impressao *{color:#000;font-family:Arial,Helvetica,sans-serif}',
                      '#p84Impressao .pr-tit{text-align:center;font-size:15px;font-weight:700;margin:0 0 2px}',
                      '#p84Impressao .pr-sub{text-align:center;font-size:11px;margin:0 0 8px}',
                      '#p84Impressao table{width:100%;border-collapse:collapse;margin:0 0 8px;font-size:10px}',
                      '#p84Impressao th,#p84Impressao td{border:1px solid #000;padding:3px 5px;vertical-align:top}',
                      '#p84Impressao th{background:#e5e7eb;text-align:left}',
                      '#p84Impressao h3{font-size:11px;margin:10px 0 3px;border-bottom:1px solid #000;padding-bottom:2px}',
                      '#p84Impressao .pr-tx{font-size:10px;white-space:pre-wrap;margin:0 0 6px}',
                      '#p84Impressao .pr-fotos{display:grid;grid-template-columns:1fr 1fr;gap:6px}',
                      '#p84Impressao .pr-fotos figure{margin:0;page-break-inside:avoid}',
                      '#p84Impressao .pr-fotos img{width:100%;height:auto;border:1px solid #000}',
                      '#p84Impressao .pr-fotos figcaption{font-size:9px;text-align:center;padding:2px}',
                      '#p84Impressao .pr-ass{margin-top:24px;text-align:center;font-size:10px}',
                      '#p84Impressao .pr-mk{font-weight:700}'
                    ].join('\n');
                    (document.head || document.documentElement).appendChild(s);
                  }
                
                  /* ================================================================ *
                   * botao no menu de abas
                   * ================================================================ */
                  function caixaMenu() {
                    return document.querySelector('#meu-menu-abas .tabs') ||
                           document.querySelector('details#meu-menu-abas .tabs') ||
                           null;
                  }
                
                  function colocarBotao() {
                    var cx = caixaMenu();
                    var b = document.getElementById('p84Botao');
                    if (!b) {
                      b = document.createElement('button');
                      b.id = 'p84Botao';
                      b.type = 'button';
                      b.textContent = 'Diário de Obra';
                      b.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        abrir();
                      });
                    }
                    if (cx) {
                      if (b.parentNode !== cx) { cx.appendChild(b); }
                      b.style.position = '';
                    } else if (!b.parentNode) {
                      b.style.cssText += ';position:fixed;right:14px;bottom:150px;z-index:2147482000;';
                      document.body.appendChild(b);
                    }
                  }
                
                  /* ================================================================ *
                   * tela
                   * ================================================================ */
                  function montarCaixa() {
                    var f = document.getElementById('p84Fundo');
                    if (f) { return f; }
                    f = document.createElement('div');
                    f.id = 'p84Fundo';
                    f.innerHTML =
                      '<div id="p84Caixa" role="dialog" aria-modal="true" aria-labelledby="p84Tit">' +
                        '<header>' +
                          '<h3 id="p84Tit">Diário de Obra</h3>' +
                          '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
                            '<button class="p84-btn" type="button" data-a="lista">Diários salvos</button>' +
                            '<button class="p84-btn" type="button" data-a="fechar">Fechar</button>' +
                          '</div>' +
                        '</header>' +
                        '<div id="p84Corpo"></div>' +
                        '<div id="p84Pe">' +
                          '<button class="p84-btn p84-btn-ok" type="button" data-a="salvar">Salvar</button>' +
                          '<button class="p84-btn" type="button" data-a="novo">Novo dia</button>' +
                          '<button class="p84-btn" type="button" data-a="copiarDia">Copiar do dia anterior</button>' +
                          '<button class="p84-btn" type="button" data-a="imprimir">Imprimir / PDF</button>' +
                          '<button class="p84-btn" type="button" data-a="exportar">Exportar arquivo</button>' +
                          '<button class="p84-btn" type="button" data-a="importar">Importar arquivo</button>' +
                          '<button class="p84-btn p84-btn-no" type="button" data-a="excluir">Excluir</button>' +
                        '</div>' +
                      '</div>';
                    document.body.appendChild(f);
                    window.__p87ListaSupabase = null;
                    window.__p87CarregandoSupabase = false;
                    f.addEventListener('click', function (ev) { if (ev.target === f) { fechar(); } });
                    f.addEventListener('click', aoClicar);
                    f.addEventListener('input', aoDigitar);
                    f.addEventListener('change', aoDigitar);
                    return f;
                  }
                
                  function abrir() {
                    estilo();
                    montarCaixa();
                    document.getElementById('p84Fundo').style.display = 'flex';
                    carregarTodos(function (arr) {
                      lista = (arr || []).sort(function (a, b) { return String(b.data || '').localeCompare(String(a.data || '')); });
                      if (!atual) { atual = lista.length ? lista[0] : diarioNovo(null); }
                      desenhar();
                    });
                  }
                
                  function fechar() {
                    var f = document.getElementById('p84Fundo');
                    if (f) { f.style.display = 'none'; }
                  }
                
                  function campo(rot, chave, valor, tipo) {
                    return '<label class="p84-c"><span>' + esc(rot) + '</span>' +
                           '<input class="p84-in" type="' + (tipo || 'text') + '" data-k="' + chave + '" value="' + esc(valor) + '"></label>';
                  }
                
                  function fotosHTML(fotos, dono) {
                    fotos = fotos || [];
                    var h = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
                      '<button class="p84-btn p84-btn-mini" type="button" data-a="foto" data-dono="' + dono + '">Tirar foto agora</button>' +
                      '<button class="p84-btn p84-btn-mini" type="button" data-a="img" data-dono="' + dono + '">Escolher imagens</button>' +
                      '<span style="font-size:12px;color:#94a3b8;align-self:center">' + fotos.length + ' foto(s)</span>' +
                      '</div>';
                    if (fotos.length) {
                      h += '<div class="p84-fotos">';
                      fotos.forEach(function (ft) {
                        h += '<div class="p84-foto">' +
                          '<img src="' + esc(ft.url) + '" alt="foto da obra" data-a="lupa">' +
                          '<input class="p84-leg" data-leg="' + esc(ft.id) + '" data-dono="' + dono + '" placeholder="Legenda da foto" value="' + esc(ft.leg || '') + '">' +
                          '<div class="p84-fx">' +
                            '<button class="p84-btn p84-btn-mini" type="button" data-a="editarFoto" data-dono="' + dono + '" data-f="' + esc(ft.id) + '">Editar</button>' +
                            '<button class="p84-btn p84-btn-mini" type="button" data-a="fsobe" data-dono="' + dono + '" data-f="' + esc(ft.id) + '">&#8592;</button>' +
                            '<button class="p84-btn p84-btn-mini" type="button" data-a="fdesce" data-dono="' + dono + '" data-f="' + esc(ft.id) + '">&#8594;</button>' +
                            '<button class="p84-btn p84-btn-mini p84-btn-no" type="button" data-a="fsai" data-dono="' + dono + '" data-f="' + esc(ft.id) + '">Remover</button>' +
                          '</div>' +
                        '</div>';
                      });
                      h += '</div>';
                    }
                    return h;
                  }
                
                  function desenhar() {
                    var c = document.getElementById('p84Corpo');
                    if (!c || !atual) { return; }
                    var d = atual;
                    var ds = diaDaSemana(d.data);
                    var h = '';
                
                    h += '<div class="p84-sec"><h4>Dados da obra</h4><div class="p84-g p84-g3">' +
                      campo('Nº do diário', 'numero', d.numero) +
                      campo('Obra', 'obra', d.obra) +
                      campo('Cliente', 'cliente', d.cliente) +
                      campo('Início da obra', 'inicioObra', d.inicioObra, 'date') +
                      campo('Término previsto', 'terminoObra', d.terminoObra, 'date') +
                      campo('Prazo da obra', 'prazoObra', d.prazoObra) +
                      campo('Responsável técnico', 'respTecnico', d.respTecnico) +
                      campo('Responsável no dia', 'responsavel', d.responsavel) +
                      campo('Data', 'data', d.data, 'date') +
                      '</div>' +
                      '<div style="margin-top:10px"><span style="font-size:11px;color:#94a3b8;text-transform:uppercase">Dia da semana' +
                      (ds >= 0 ? ' — ' + esc(NOMES[ds]) : '') + '</span><div class="p84-dias">';
                    DIAS.forEach(function (sig, i) {
                      h += '<button type="button" class="p84-dia' + (i === ds ? ' on' : '') + '" data-a="dia" data-i="' + i + '" title="' + esc(NOMES[i]) + '">' + sig + '</button>';
                    });
                    h += '</div></div></div>';
                
                    h += '<div class="p84-sec"><h4>Turno e tempo</h4><div class="p84-g p84-g3">';
                    TURNOS.forEach(function (tn) {
                      var t = (d.turnos && d.turnos[tn]) || { tempo: '', efetivo: '' };
                      h += '<div class="p84-turno"><b>' + esc(tn) + '</b><div class="p84-temp">';
                      TEMPOS.forEach(function (tp) {
                        h += '<button type="button" class="p84-tp' + (t.tempo === tp ? ' on' : '') + '" data-a="tempo" data-t="' + esc(tn) + '" data-v="' + esc(tp) + '">' + esc(tp) + '</button>';
                      });
                      h += '</div><label class="p84-c"><span>Efetivo no turno</span>' +
                        '<input class="p84-in" data-t="' + esc(tn) + '" data-tk="efetivo" value="' + esc(t.efetivo) + '" placeholder="Ex.: 4 montadores"></label></div>';
                    });
                    h += '</div></div>';
                
                    h += '<div class="p84-sec"><h4>Tarefas realizadas — TR (' + (d.tarefas || []).length + ')</h4>';
                    if (!(d.tarefas || []).length) { h += '<div class="p84-vazio">Nenhuma tarefa lançada ainda.</div>'; }
                    (d.tarefas || []).forEach(function (t, i) {
                      h += '<div class="p84-item">' +
                        '<div class="p84-item-topo"><b>TR ' + (i + 1) + '</b><span style="display:flex;gap:4px">' +
                          '<button class="p84-btn p84-btn-mini" type="button" data-a="trsobe" data-r="' + esc(t.id) + '">Subir</button>' +
                          '<button class="p84-btn p84-btn-mini" type="button" data-a="trdesce" data-r="' + esc(t.id) + '">Descer</button>' +
                          '<button class="p84-btn p84-btn-mini p84-btn-no" type="button" data-a="trsai" data-r="' + esc(t.id) + '">Excluir</button>' +
                        '</span></div>' +
                        '<div class="p84-g p84-g3">' +
                          '<label class="p84-c"><span>Item</span><input class="p84-in" data-r="' + esc(t.id) + '" data-rk="item" value="' + esc(t.item) + '"></label>' +
                          '<label class="p84-c"><span>Empresa / equipe</span><input class="p84-in" data-r="' + esc(t.id) + '" data-rk="empresa" value="' + esc(t.empresa) + '"></label>' +
                          '<label class="p84-c"><span>Quant. produzida</span><input class="p84-in" data-r="' + esc(t.id) + '" data-rk="quant" value="' + esc(t.quant) + '" placeholder="Ex.: 12 m2"></label>' +
                        '</div>' +
                        '<div class="p84-g p84-g2" style="margin-top:10px">' +
                          '<label class="p84-c"><span>Descrição do serviço</span><textarea class="p84-ta" data-r="' + esc(t.id) + '" data-rk="desc">' + esc(t.desc) + '</textarea></label>' +
                          '<label class="p84-c"><span>Observações</span><textarea class="p84-ta" data-r="' + esc(t.id) + '" data-rk="obs">' + esc(t.obs) + '</textarea></label>' +
                        '</div>' +
                        fotosHTML(t.fotos, 'tr:' + t.id) +
                      '</div>';
                    });
                    h += '<button class="p84-btn" type="button" data-a="trnovo">+ Adicionar tarefa</button></div>';
                
                    h += '<div class="p84-sec"><h4>Ocorrências importantes — OI (' + (d.ocorrencias || []).length + ')</h4>';
                    if (!(d.ocorrencias || []).length) { h += '<div class="p84-vazio">Nenhuma ocorrência no dia.</div>'; }
                    (d.ocorrencias || []).forEach(function (o, i) {
                      h += '<div class="p84-item">' +
                        '<div class="p84-item-topo"><b>OI ' + (i + 1) + '</b><span style="display:flex;gap:4px">' +
                          '<button class="p84-btn p84-btn-mini" type="button" data-a="oisobe" data-o="' + esc(o.id) + '">Subir</button>' +
                          '<button class="p84-btn p84-btn-mini" type="button" data-a="oidesce" data-o="' + esc(o.id) + '">Descer</button>' +
                          '<button class="p84-btn p84-btn-mini p84-btn-no" type="button" data-a="oisai" data-o="' + esc(o.id) + '">Excluir</button>' +
                        '</span></div>' +
                        '<div class="p84-g p84-g3">' +
                          '<label class="p84-c"><span>Item</span><input class="p84-in" data-o="' + esc(o.id) + '" data-oik="item" value="' + esc(o.item) + '"></label>' +
                          '<label class="p84-c"><span>Empresa / equipe</span><input class="p84-in" data-o="' + esc(o.id) + '" data-oik="empresa" value="' + esc(o.empresa) + '"></label>' +
                          '<label class="p84-c"><span>Tipo de ocorrência</span><input class="p84-in" list="p84Tipos" data-o="' + esc(o.id) + '" data-oik="tipo" value="' + esc(o.tipo) + '"></label>' +
                        '</div>' +
                        '<label class="p84-c" style="margin-top:10px"><span>Descrição da ocorrência</span>' +
                        '<textarea class="p84-ta" data-o="' + esc(o.id) + '" data-oik="desc">' + esc(o.desc) + '</textarea></label>' +
                        fotosHTML(o.fotos, 'oi:' + o.id) +
                      '</div>';
                    });
                    h += '<button class="p84-btn" type="button" data-a="oinovo">+ Adicionar ocorrência</button>';
                    h += '<datalist id="p84Tipos">';
                    TIPOS_OC.forEach(function (t) { h += '<option value="' + esc(t) + '"></option>'; });
                    h += '</datalist></div>';
                
                    h += '<div class="p84-sec"><h4>Relatório fotográfico do dia — RF</h4>' +
                      fotosHTML(d.fotosRF, 'rf') + '</div>';
                
                    h += '<div class="p84-sec"><h4>Resumo e assinatura</h4>' +
                      '<label class="p84-c"><span>Evolução / resumo do dia</span>' +
                      '<textarea class="p84-ta" data-k="resumo" style="min-height:90px">' + esc(d.resumo) + '</textarea></label>' +
                      '<div style="margin-top:8px;font-size:12px;color:#94a3b8">A assinatura sai na impressão com o nome do responsável do dia.</div>' +
                      '</div>';
                
                    c.innerHTML = h;
                  }
                
                  /* ================================================================ *
                   * edicao
                   * ================================================================ */
                  function acharTR(id) {
                    for (var i = 0; i < (atual.tarefas || []).length; i++) { if (atual.tarefas[i].id === id) { return atual.tarefas[i]; } }
                    return null;
                  }
                
                  function acharOI(id) {
                    for (var i = 0; i < (atual.ocorrencias || []).length; i++) { if (atual.ocorrencias[i].id === id) { return atual.ocorrencias[i]; } }
                    return null;
                  }
                
                  function donoFotos(dono) {
                    if (dono === 'rf') {
                      if (!atual.fotosRF) { atual.fotosRF = []; }
                      return atual.fotosRF;
                    }
                    var p = String(dono || '').split(':');
                    var alvo = (p[0] === 'tr') ? acharTR(p[1]) : (p[0] === 'oi' ? acharOI(p[1]) : null);
                    if (!alvo) { return null; }
                    if (!alvo.fotos) { alvo.fotos = []; }
                    return alvo.fotos;
                  }
                
                  function salvarDepois() {
                    clearTimeout(timerSalvar);
                    timerSalvar = setTimeout(function () { guardar(atual, function () {}); }, 700);
                  }
                
                  function aoDigitar(ev) {
                    var t = ev.target;
                    if (!t || !atual) { return; }
                    if (t.hasAttribute('data-k')) {
                      var k = t.getAttribute('data-k');
                      atual[k] = t.value;
                      salvarDepois();
                      if (k === 'data') { desenhar(); }
                      return;
                    }
                    if (t.hasAttribute('data-tk')) {
                      var tn = t.getAttribute('data-t');
                      if (!atual.turnos) { atual.turnos = {}; }
                      if (!atual.turnos[tn]) { atual.turnos[tn] = { tempo: '', efetivo: '' }; }
                      atual.turnos[tn][t.getAttribute('data-tk')] = t.value;
                      salvarDepois();
                      return;
                    }
                    if (t.hasAttribute('data-rk')) {
                      var tr = acharTR(t.getAttribute('data-r'));
                      if (tr) { tr[t.getAttribute('data-rk')] = t.value; salvarDepois(); }
                      return;
                    }
                    if (t.hasAttribute('data-oik')) {
                      var oi = acharOI(t.getAttribute('data-o'));
                      if (oi) { oi[t.getAttribute('data-oik')] = t.value; salvarDepois(); }
                      return;
                    }
                    if (t.hasAttribute('data-leg')) {
                      var arr = donoFotos(t.getAttribute('data-dono'));
                      if (arr) {
                        var fid = t.getAttribute('data-leg');
                        arr.forEach(function (ft) { if (ft.id === fid) { ft.leg = t.value; } });
                        salvarDepois();
                      }
                    }
                  }
                
                  function mover(arr, id, passo) {
                    for (var i = 0; i < arr.length; i++) {
                      if (arr[i].id === id) {
                        var j = i + passo;
                        if (j < 0 || j >= arr.length) { return; }
                        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
                        return;
                      }
                    }
                  }
                
                  function aoClicar(ev) {
                    var alvo = ev.target;
                    if (alvo && alvo.getAttribute && alvo.getAttribute('data-a') === 'lupa') {
                      lupa(alvo.getAttribute('src'));
                      return;
                    }
                    var b = alvo && alvo.closest ? alvo.closest('[data-a]') : null;
                    if (!b) { return; }
                    var a = b.getAttribute('data-a');
                
                    if (a === 'fechar') { ev.preventDefault(); fechar(); return; }
                    if (a === 'lista') { ev.preventDefault(); telaLista(); return; }
                
                    if (a === 'editarFoto') {
                      ev.preventDefault();
                      var fotosEditar = donoFotos(b.getAttribute('data-dono'));
                      var fotoEditar = null;
                      (fotosEditar || []).some(function (ft) { if (ft.id === b.getAttribute('data-f')) { fotoEditar = ft; return true; } return false; });
                      if (!fotoEditar || typeof window.p95EditarImagem !== 'function') { aviso('Editor de imagem ainda nao esta disponivel.', 'erro'); return; }
                      window.p95EditarImagem({
                        titulo: 'Editar foto do relatorio', url: fotoEditar.url, leg: fotoEditar.leg || '', rotSalvar: 'Salvar nesta foto',
                        aoSalvar: function (u, lg) { fotoEditar.url = u; fotoEditar.leg = String(lg || ''); salvarDepois(); desenhar(); window.p95FecharEditor && window.p95FecharEditor(); aviso('Foto editada e salva.', 'ok'); }
                      });
                      return;
                    }
                
                    if (a === 'salvar') {
                      ev.preventDefault();
                      guardar(atual, function (ok) {
                        aviso(ok ? 'Diário salvo.' : 'Nao consegui salvar. Espaco do navegador cheio?', ok ? 'ok' : 'erro');
                      });
                      return;
                    }
                    if (a === 'novo') {
                      ev.preventDefault();
                      guardar(atual, function () {
                        atual = diarioNovo(null);
                        guardar(atual, function () { desenhar(); aviso('Novo dia criado.'); });
                      });
                      return;
                    }
                    if (a === 'copiarDia') {
                      ev.preventDefault();
                      var base = atual;
                      guardar(atual, function () {
                        atual = diarioNovo(base);
                        guardar(atual, function () { desenhar(); aviso('Dia criado com base no anterior. Ajuste as quantidades.'); });
                      });
                      return;
                    }
                    if (a === 'excluir') {
                      ev.preventDefault();
                      if (!confirm('Excluir este dia do diário? Nao tem como desfazer.')) { return; }
                      apagar(atual.id, function () {
                        carregarTodos(function (arr) {
                          lista = arr || [];
                          atual = lista.length ? lista[0] : diarioNovo(null);
                          desenhar();
                          aviso('Diário excluido.');
                        });
                      });
                      return;
                    }
                    if (a === 'imprimir') { ev.preventDefault(); imprimir(); return; }
                    if (a === 'exportar') { ev.preventDefault(); exportar(); return; }
                    if (a === 'importar') { ev.preventDefault(); importar(); return; }
                
                    if (a === 'dia') {
                      ev.preventDefault();
                      var i = Number(b.getAttribute('data-i'));
                      atual.diaManual = i;
                      var atualDs = diaDaSemana(atual.data);
                      if (atualDs !== i) { aviso('Marcado ' + NOMES[i] + '. Confira a data.'); }
                      salvarDepois();
                      return;
                    }
                    if (a === 'tempo') {
                      ev.preventDefault();
                      var tn = b.getAttribute('data-t');
                      var v = b.getAttribute('data-v');
                      if (!atual.turnos) { atual.turnos = {}; }
                      if (!atual.turnos[tn]) { atual.turnos[tn] = { tempo: '', efetivo: '' }; }
                      atual.turnos[tn].tempo = (atual.turnos[tn].tempo === v) ? '' : v;
                      salvarDepois();
                      desenhar();
                      return;
                    }
                
                    if (a === 'trnovo') {
                      ev.preventDefault();
                      if (!atual.tarefas) { atual.tarefas = []; }
                      atual.tarefas.push(tarefaNova(atual.tarefas.length + 1));
                      salvarDepois(); desenhar();
                      return;
                    }
                    if (a === 'trsai') {
                      ev.preventDefault();
                      var rid = b.getAttribute('data-r');
                      atual.tarefas = (atual.tarefas || []).filter(function (x) { return x.id !== rid; });
                      salvarDepois(); desenhar();
                      return;
                    }
                    if (a === 'trsobe' || a === 'trdesce') {
                      ev.preventDefault();
                      mover(atual.tarefas || [], b.getAttribute('data-r'), a === 'trsobe' ? -1 : 1);
                      salvarDepois(); desenhar();
                      return;
                    }
                
                    if (a === 'oinovo') {
                      ev.preventDefault();
                      if (!atual.ocorrencias) { atual.ocorrencias = []; }
                      atual.ocorrencias.push(ocorrenciaNova(atual.ocorrencias.length + 1));
                      salvarDepois(); desenhar();
                      return;
                    }
                    if (a === 'oisai') {
                      ev.preventDefault();
                      var oid = b.getAttribute('data-o');
                      atual.ocorrencias = (atual.ocorrencias || []).filter(function (x) { return x.id !== oid; });
                      salvarDepois(); desenhar();
                      return;
                    }
                    if (a === 'oisobe' || a === 'oidesce') {
                      ev.preventDefault();
                      mover(atual.ocorrencias || [], b.getAttribute('data-o'), a === 'oisobe' ? -1 : 1);
                      salvarDepois(); desenhar();
                      return;
                    }
                
                    if (a === 'foto' || a === 'img') {
                      ev.preventDefault();
                      var dono = b.getAttribute('data-dono');
                      var fn = (a === 'foto') ? tirarFoto : escolherImagens;
                      fn(function (itens) {
                        if (!itens || !itens.length) { return; }
                        var arr = donoFotos(dono);
                        if (!arr) { return; }
                        itens.forEach(function (it) { arr.push(it); });
                        guardar(atual, function (ok) {
                          desenhar();
                          aviso(ok ? (itens.length + ' foto(s) adicionada(s).') : 'Fotos adicionadas, mas nao consegui salvar. Espaco cheio?', ok ? 'ok' : 'erro');
                        });
                      });
                      return;
                    }
                    if (a === 'fsai') {
                      ev.preventDefault();
                      var arr2 = donoFotos(b.getAttribute('data-dono'));
                      if (!arr2) { return; }
                      var fid = b.getAttribute('data-f');
                      for (var k = 0; k < arr2.length; k++) { if (arr2[k].id === fid) { arr2.splice(k, 1); break; } }
                      guardar(atual, function () { desenhar(); });
                      return;
                    }
                    if (a === 'fsobe' || a === 'fdesce') {
                      ev.preventDefault();
                      var arr3 = donoFotos(b.getAttribute('data-dono'));
                      if (!arr3) { return; }
                      mover(arr3, b.getAttribute('data-f'), a === 'fsobe' ? -1 : 1);
                      guardar(atual, function () { desenhar(); });
                      return;
                    }
                
                    if (a === 'abrirDia') {
                      ev.preventDefault();
                      var aid = b.getAttribute('data-id');
                      for (var z = 0; z < lista.length; z++) { if (lista[z].id === aid) { atual = lista[z]; break; } }
                      desenhar();
                      aviso('Diário aberto.');
                      return;
                    }
                    if (a === 'apagarDia') {
                      ev.preventDefault();
                      if (!confirm('Excluir este dia?')) { return; }
                      apagar(b.getAttribute('data-id'), function () {
                        carregarTodos(function (arr) { lista = arr || []; telaLista(); });
                      });
                      return;
                    }
                    if (a === 'voltarDia') { ev.preventDefault(); desenhar(); return; }
                  }
                
                  function lupa(url) {
                    var f = document.createElement('div');
                    f.className = 'p84-lupa';
                    var img = document.createElement('img');
                    img.src = url;
                    img.alt = 'foto ampliada';
                    f.appendChild(img);
                    f.addEventListener('click', function () { try { document.body.removeChild(f); } catch (e) {} });
                    document.body.appendChild(f);
                  }
                
                  function telaLista() {
                    var c = document.getElementById('p84Corpo');
                    if (!c) { return; }
                    carregarTodos(function (arr) {
                      lista = (arr || []).sort(function (a, b) { return String(b.data || '').localeCompare(String(a.data || '')); });
                      var h = '<div class="p84-sec"><h4>Diários salvos (' + lista.length + ')</h4>';
                      if (!lista.length) {
                        h += '<div class="p84-vazio">Nenhum dia lançado ainda.</div>';
                      } else {
                        h += '<table class="p84-tab"><thead><tr><th>Nº</th><th>Data</th><th>Dia</th><th>Obra</th><th>TR</th><th>OI</th><th>Fotos</th><th>Ações</th></tr></thead><tbody>';
                        lista.forEach(function (r) {
                          var nf = (r.fotosRF || []).length;
                          (r.tarefas || []).forEach(function (t) { nf += (t.fotos || []).length; });
                          (r.ocorrencias || []).forEach(function (o) { nf += (o.fotos || []).length; });
                          var ds = diaDaSemana(r.data);
                          h += '<tr>' +
                            '<td>' + esc(r.numero || '-') + '</td>' +
                            '<td>' + esc(dataBonita(r.data)) + '</td>' +
                            '<td>' + esc(ds >= 0 ? NOMES[ds] : '-') + '</td>' +
                            '<td>' + esc(r.obra || '-') + '</td>' +
                            '<td>' + (r.tarefas || []).length + '</td>' +
                            '<td>' + (r.ocorrencias || []).length + '</td>' +
                            '<td>' + nf + '</td>' +
                            '<td><button class="p84-btn p84-btn-mini" type="button" data-a="abrirDia" data-id="' + esc(r.id) + '">Abrir</button> ' +
                            '<button class="p84-btn p84-btn-mini p84-btn-no" type="button" data-a="apagarDia" data-id="' + esc(r.id) + '">Excluir</button></td>' +
                          '</tr>';
                        });
                        h += '</tbody></table>';
                      }
                      h += '<div style="margin-top:10px"><button class="p84-btn" type="button" data-a="voltarDia">Voltar ao diário</button></div></div>';
                      c.innerHTML = h;
                    });
                  }
                
                  /* ================================================================ *
                   * impressao / PDF
                   * ================================================================ */
                  function imprimir() {
                    var d = atual;
                    if (!d) { return; }
                    var alvo = document.getElementById('p84Impressao');
                    if (!alvo) {
                      alvo = document.createElement('div');
                      alvo.id = 'p84Impressao';
                      document.body.appendChild(alvo);
                    }
                    var ds = (typeof d.diaManual === 'number' && diaDaSemana(d.data) < 0) ? d.diaManual : diaDaSemana(d.data);
                    var h = '';
                    h += '<div class="pr-tit">DIÁRIO DE OBRA</div>';
                    h += '<div class="pr-sub">' + (d.numero ? 'Nº ' + esc(d.numero) + ' — ' : '') + esc(dataBonita(d.data)) +
                         (ds >= 0 ? ' — ' + esc(NOMES[ds]) : '') + '</div>';
                
                    h += '<table><tr><th style="width:16%">Obra</th><td style="width:34%">' + esc(d.obra) + '</td>' +
                         '<th style="width:16%">Cliente</th><td>' + esc(d.cliente) + '</td></tr>' +
                         '<tr><th>Início</th><td>' + esc(dataBonita(d.inicioObra)) + '</td><th>Término</th><td>' + esc(dataBonita(d.terminoObra)) + '</td></tr>' +
                         '<tr><th>Prazo</th><td>' + esc(d.prazoObra) + '</td><th>Resp. técnico</th><td>' + esc(d.respTecnico) + '</td></tr></table>';
                
                    var marca = '';
                    DIAS.forEach(function (sig, i) {
                      marca += (i === ds ? '<span class="pr-mk">[' + sig + ']</span>' : '&nbsp;' + sig + '&nbsp;') + ' ';
                    });
                    h += '<table><tr><th style="width:16%">Dia da semana</th><td colspan="3">' + marca + '</td></tr>';
                    TURNOS.forEach(function (tn) {
                      var t = (d.turnos && d.turnos[tn]) || {};
                      var tempos = TEMPOS.map(function (tp) {
                        return (t.tempo === tp) ? '<span class="pr-mk">[X] ' + tp + '</span>' : '[ ] ' + tp;
                      }).join('  ');
                      h += '<tr><th>' + esc(tn) + '</th><td colspan="2">' + tempos + '</td><td style="width:22%">Efetivo: ' + esc(t.efetivo || '') + '</td></tr>';
                    });
                    h += '</table>';
                
                    h += '<h3>Tarefas realizadas (TR)</h3>';
                    h += '<table><tr><th style="width:7%">Item</th><th style="width:18%">Empresa</th><th style="width:12%">Quant. prod.</th><th>Descrição</th><th style="width:22%">Observações</th></tr>';
                    if (!(d.tarefas || []).length) {
                      h += '<tr><td colspan="5">-</td></tr>';
                    } else {
                      d.tarefas.forEach(function (t, i) {
                        h += '<tr><td>' + esc(t.item || (i + 1)) + '</td><td>' + esc(t.empresa) + '</td><td>' + esc(t.quant) +
                             '</td><td>' + esc(t.desc) + '</td><td>' + esc(t.obs) + '</td></tr>';
                      });
                    }
                    h += '</table>';
                
                    h += '<h3>Ocorrências importantes (OI)</h3>';
                    h += '<table><tr><th style="width:7%">Item</th><th style="width:18%">Empresa</th><th>Descrição</th><th style="width:22%">Tipo</th></tr>';
                    if (!(d.ocorrencias || []).length) {
                      h += '<tr><td colspan="4">-</td></tr>';
                    } else {
                      d.ocorrencias.forEach(function (o, i) {
                        h += '<tr><td>' + esc(o.item || (i + 1)) + '</td><td>' + esc(o.empresa) + '</td><td>' + esc(o.desc) + '</td><td>' + esc(o.tipo) + '</td></tr>';
                      });
                    }
                    h += '</table>';
                
                    if (d.resumo) { h += '<h3>Evolução do dia</h3><div class="pr-tx">' + esc(d.resumo) + '</div>'; }
                
                    var todas = [];
                    (d.tarefas || []).forEach(function (t, i) {
                      (t.fotos || []).forEach(function (ft) { todas.push({ url: ft.url, leg: 'TR ' + (i + 1) + (ft.leg ? ' - ' + ft.leg : '') }); });
                    });
                    (d.ocorrencias || []).forEach(function (o, i) {
                      (o.fotos || []).forEach(function (ft) { todas.push({ url: ft.url, leg: 'OI ' + (i + 1) + (ft.leg ? ' - ' + ft.leg : '') }); });
                    });
                    (d.fotosRF || []).forEach(function (ft) { todas.push({ url: ft.url, leg: ft.leg || '' }); });
                
                    if (todas.length) {
                      h += '<h3>Relatório fotográfico (RF)</h3><div class="pr-fotos">';
                      todas.forEach(function (ft, k) {
                        h += '<figure><img src="' + esc(ft.url) + '" alt="foto"><figcaption>Foto ' + (k + 1) + (ft.leg ? ' - ' + esc(ft.leg) : '') + '</figcaption></figure>';
                      });
                      h += '</div>';
                    }
                
                    h += '<div class="pr-ass">_______________________________________<br>' + esc(d.responsavel || 'Responsável') + '</div>';
                    alvo.innerHTML = h;
                    var janelaImpressao = window.open('', '_blank');
                    if (!janelaImpressao) { alert('Permita pop-ups para imprimir o Diário de Obra.'); return; }
                    var cssImpressao = '<style>' +
                      '@page{size:A4 portrait;margin:10mm}' +
                      'html,body{margin:0;padding:0;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif}' +
                      'body{font-size:10pt}' +
                      'table{width:100%;border-collapse:collapse;margin:0 0 8px;font-size:9pt}' +
                      'th,td{border:1px solid #000;padding:3px 5px;vertical-align:top}' +
                      'th{background:#e5e7eb;text-align:left}' +
                      '.pr-tit{text-align:center;font-size:15pt;font-weight:700;margin:0 0 2px}' +
                      '.pr-sub{text-align:center;font-size:9pt;margin:0 0 8px}' +
                      'h3{font-size:10pt;margin:8px 0 3px;border-bottom:1px solid #000;padding-bottom:2px}' +
                      '.pr-tx{font-size:9pt;white-space:pre-wrap;margin:0 0 6px}' +
                      '.pr-fotos{display:grid;grid-template-columns:1fr 1fr;gap:6px}' +
                      '.pr-fotos figure{margin:0;break-inside:avoid;page-break-inside:avoid}' +
                      '.pr-fotos img{width:100%;height:auto;border:1px solid #000}' +
                      '.pr-fotos figcaption{font-size:8pt;text-align:center;padding:2px}' +
                      '.pr-ass{margin-top:20px;text-align:center;font-size:9pt}' +
                      '</style>';
                    janelaImpressao.document.open();
                    /* SUBSTITUIR a região corrompida a partir da linha 42022 até antes do
 * fechamento original do módulo P84. Este trecho permanece dentro da função
 * imprimir(), portanto usa h, cssImpressao e janelaImpressao já existentes. */

janelaImpressao.document.write(
  '<!doctype html>' +
  '<html lang="pt-BR"><head>' +
  '<meta charset="UTF-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Diário de Obra</title>' +
  cssImpressao +
  '</head><body>' +
  h +
  '</body></html>'
);
janelaImpressao.document.close();

var imprimirJanela = function () {
  try {
    janelaImpressao.focus();
    janelaImpressao.print();
  } catch (erro) {}
};

var imagens = janelaImpressao.document.images;
var restantes = imagens.length;

if (!restantes) {
  setTimeout(imprimirJanela, 150);
} else {
  var pronto = false;
  var imagemPronta = function () {
    restantes--;
    if (restantes <= 0 && !pronto) {
      pronto = true;
      setTimeout(imprimirJanela, 150);
    }
  };

  for (var ii = 0; ii < imagens.length; ii++) {
    if (imagens[ii].complete) {
      imagemPronta();
    } else {
      imagens[ii].addEventListener('load', imagemPronta, { once: true });
      imagens[ii].addEventListener('error', imagemPronta, { once: true });
    }
  }

  setTimeout(function () {
    if (!pronto) {
      pronto = true;
      imprimirJanela();
    }
  }, 5000);
}

}

/* ================================================================ *
 * exportar / importar
 * ================================================================ */
function exportar() {
  try {
    var a = document.createElement('a');
    var url = URL.createObjectURL(new Blob([
      JSON.stringify(atual)
    ], { type: 'application/json' }));

    a.href = url;
    a.download = 'diario_obra_' + (atual.data || 'dia') + '.json';
    document.body.appendChild(a);
    a.click();

    setTimeout(function () {
      try {
        URL.revokeObjectURL(url);
        if (a.parentNode) a.parentNode.removeChild(a);
      } catch (e) {}
    }, 400);

    aviso('Arquivo do diário gerado.');
  } catch (e) {
    aviso('Nao consegui gerar o arquivo.', 'erro');
  }
}

function importar() {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.style.display = 'none';
  document.body.appendChild(inp);

  inp.addEventListener('change', function () {
    var arq = inp.files && inp.files[0];
    if (!arq) return;

    var fr = new FileReader();
    fr.onload = function () {
      try {
        var r = JSON.parse(String(fr.result));
        if (!r || !Array.isArray(r.tarefas)) throw new Error('formato');
        r.id = novoId('dia');
        atual = r;
        guardar(atual, function () {
          desenhar();
          aviso('Diário importado.');
        });
      } catch (e) {
        aviso('Arquivo invalido.', 'erro');
      }

      try {
        if (inp.parentNode) inp.parentNode.removeChild(inp);
      } catch (e2) {}
    };
    fr.readAsText(arq);
  });

  inp.click();
}

/* ================================================================ *
 * inicio
 * ================================================================ */
function iniciar() {
  estilo();
  colocarBotao();
  if (typeof window.__varreduraUnica === 'function') {
    window.__varreduraUnica(colocarBotao);
  }
}

window.p84AbrirDiario = function () {
  abrir();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar, { once: true });
} else {
  iniciar();
}

})();

