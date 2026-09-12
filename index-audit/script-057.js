
        /* ====== PATCH83_BOLETIM_INSPECAO_OK - Boletim de Inspecao editavel com fotos ====== */
        (function () {
          'use strict';
          if (window.__PS83) { return; }
          window.__PS83 = true;
        
          var BASE = 'p83_boletins_v1';
          var LOJA = 'reg';
          var K_LS = 'p83_boletins_ls_v1';
          var atual = null;
          var lista = [];
          var timerSalvar = null;
        
          /* ================================================================ *
           * utilidades
           * ================================================================ */
          function esc(s) {
            return String(s == null ? '' : s)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          }
        
          function novoId(p) {
            return String(p || 'b') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
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
        
          function aviso(msg, tipo) {
            try {
              if (typeof window.mostrarToastPainel === 'function') {
                window.mostrarToastPainel(msg, tipo || 'ok');
                return;
              }
            } catch (e) {}
            var d = document.getElementById('p83Aviso');
            if (!d) {
              d = document.createElement('div');
              d.id = 'p83Aviso';
              document.body.appendChild(d);
            }
            d.textContent = String(msg || '');
            d.className = 'p83-aviso ' + (tipo === 'erro' ? 'p83-erro' : 'p83-ok');
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
           * guarda os boletins (IndexedDB, com reserva no navegador)
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
           * modelo do boletim
           * ================================================================ */
          function blocoNovo() {
            return {
              id: novoId('h'),
              titulo: '',
              linha: '',
              folhas: '',
              pavimento: '',
              servico: '',
              texto: '',
              fotos: []
            };
          }
        
          function boletimNovo() {
            var o = obraAtual() || {};
            return {
              id: novoId('bol'),
              criado: new Date().toISOString(),
              numero: '',
              formulario: 'FORM 07',
              data: hoje(),
              cliente: o.cliente || o.nome || '',
              obra: o.nome || '',
              contrato: o.contrato || '',
              endereco: o.endereco || '',
              responsavel: '',
              inspetor: '',
              acompanhante: '',
              motivo: '',
              blocos: [blocoNovo()],
              orcamento: [{ id: novoId('o'), qtd: '', desc: '' }],
              conclusao: '',
              fotosGerais: []
            };
          }
        
          /* ================================================================ *
           * imagens: escolher arquivo ou fotografar na obra
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
            fundo.className = 'p83-cam';
            fundo.innerHTML =
              '<div class="p83-cam-cx">' +
                '<video id="p83Video" autoplay playsinline muted></video>' +
                '<div class="p83-cam-pe">' +
                  '<button type="button" class="p83-btn p83-btn-ok" data-a="tirar">Fotografar</button>' +
                  '<button type="button" class="p83-btn" data-a="virar">Virar camera</button>' +
                  '<button type="button" class="p83-btn" data-a="arquivo">Usar camera do aparelho</button>' +
                  '<button type="button" class="p83-btn p83-btn-no" data-a="sair">Fechar</button>' +
                '</div>' +
                '<div class="p83-cam-nota">Dica: se a imagem nao aparecer, use o botao "Usar camera do aparelho".</div>' +
              '</div>';
            document.body.appendChild(fundo);
        
            var video = fundo.querySelector('#p83Video');
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
            if (document.getElementById('p83Estilo')) { return; }
            var s = document.createElement('style');
            s.id = 'p83Estilo';
            s.textContent = [
              '#p83Botao{background:#0ea5e9;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-weight:600;cursor:pointer;margin:4px}',
              '#p83Botao:hover{filter:brightness(1.08)}',
              '.p83-aviso{position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:10px 14px;border-radius:10px;color:#fff;font:13px/1.4 system-ui,Segoe UI,Arial;box-shadow:0 8px 24px rgba(0,0,0,.35);display:none}',
              '.p83-ok{background:#0f766e}.p83-erro{background:#b91c1c}',
              '#p83Fundo{position:fixed;inset:0;background:rgba(2,6,23,.72);z-index:2147483000;display:none;align-items:center;justify-content:center;padding:14px;overflow:auto}',
              '#p83Caixa{background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:14px;width:min(1080px,100%);max-height:94vh;display:flex;flex-direction:column;margin:auto;font:14px/1.5 system-ui,Segoe UI,Arial}',
              '#p83Caixa header{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #334155}',
              '#p83Caixa header h3{margin:0;font-size:16px}',
              '#p83Corpo{padding:14px;overflow:auto}',
              '#p83Pe{display:flex;flex-wrap:wrap;gap:8px;padding:12px 14px;border-top:1px solid #334155}',
              '.p83-btn{background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:9px;padding:7px 12px;cursor:pointer;font-size:13px}',
              '.p83-btn:hover{background:#243449}',
              '.p83-btn-ok{background:#16a34a;border-color:#16a34a;color:#fff}',
              '.p83-btn-no{background:#b91c1c;border-color:#b91c1c;color:#fff}',
              '.p83-btn-mini{padding:4px 8px;font-size:12px}',
              '.p83-sec{border:1px solid #334155;border-radius:12px;padding:12px;margin:0 0 12px}',
              '.p83-sec>h4{margin:0 0 10px;font-size:14px;color:#93c5fd;text-transform:uppercase;letter-spacing:.4px}',
              '.p83-g{display:grid;gap:10px}',
              '.p83-g2{grid-template-columns:1fr 1fr}',
              '.p83-g3{grid-template-columns:1fr 1fr 1fr}',
              '@media(max-width:760px){.p83-g2,.p83-g3{grid-template-columns:1fr}}',
              '.p83-c{display:flex;flex-direction:column;gap:4px}',
              '.p83-c>span{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px}',
              '.p83-in,.p83-ta{background:#0b1324;border:1px solid #334155;border-radius:8px;color:#e2e8f0;padding:8px;font:13px/1.5 inherit;width:100%;box-sizing:border-box}',
              '.p83-ta{min-height:80px;resize:vertical}',
              '.p83-bloco{border:1px solid #2b3a52;border-radius:10px;padding:10px;margin:0 0 10px;background:#0b1324}',
              '.p83-bloco-topo{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:8px}',
              '.p83-bloco-topo b{font-size:13px;color:#cbd5e1}',
              '.p83-fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:8px}',
              '.p83-foto{border:1px solid #334155;border-radius:8px;overflow:hidden;background:#0f172a}',
              '.p83-foto img{width:100%;height:110px;object-fit:cover;display:block;cursor:zoom-in}',
              '.p83-foto .p83-leg{width:100%;border:none;border-top:1px solid #334155;background:#0b1324;color:#e2e8f0;padding:5px;font-size:12px;box-sizing:border-box}',
              '.p83-foto .p83-fx{display:flex;gap:4px;padding:4px}',
              '.p83-lin{display:grid;grid-template-columns:90px 1fr 34px;gap:8px;margin-bottom:6px}',
              '@media(max-width:600px){.p83-lin{grid-template-columns:70px 1fr 34px}}',
              '.p83-vazio{padding:10px;border:1px dashed #334155;border-radius:10px;color:#94a3b8}',
              '.p83-tab{width:100%;border-collapse:collapse;font-size:13px}',
              '.p83-tab th,.p83-tab td{border:1px solid #334155;padding:6px;text-align:left}',
              '.p83-tab th{background:#16233b;color:#cbd5e1;font-size:12px}',
              '.p83-cam{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:2147483100;display:flex;align-items:center;justify-content:center;padding:12px}',
              '.p83-cam-cx{background:#0f172a;border:1px solid #334155;border-radius:12px;padding:10px;max-width:min(900px,100%);margin:auto}',
              '.p83-cam-cx video{width:100%;max-height:70vh;background:#000;border-radius:8px;display:block}',
              '.p83-cam-pe{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;justify-content:center}',
              '.p83-cam-nota{color:#94a3b8;font-size:12px;text-align:center;margin-top:6px}',
              '.p83-lupa{position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:14px}',
              '.p83-lupa img{max-width:100%;max-height:100%;border-radius:8px}',
              '#p83Impressao{display:none}',
              '@media print{',
              '  body>*{display:none !important}',
              '  #p83Impressao{display:block !important;background:#fff;color:#000}',
              '  @page{size:A4;margin:12mm}',
              '}',
              '#p83Impressao,#p83Impressao *{color:#000;font-family:Arial,Helvetica,sans-serif}',
              '#p83Impressao .pr-tit{text-align:center;font-size:16px;font-weight:700;margin:0 0 2px}',
              '#p83Impressao .pr-sub{text-align:center;font-size:11px;margin:0 0 10px}',
              '#p83Impressao table{width:100%;border-collapse:collapse;margin:0 0 10px;font-size:11px}',
              '#p83Impressao th,#p83Impressao td{border:1px solid #000;padding:4px 6px;vertical-align:top}',
              '#p83Impressao th{background:#e5e7eb;text-align:left}',
              '#p83Impressao h3{font-size:12px;margin:12px 0 4px;border-bottom:1px solid #000;padding-bottom:2px}',
              '#p83Impressao .pr-tx{font-size:11px;white-space:pre-wrap;margin:0 0 6px}',
              '#p83Impressao .pr-bl{border:1px solid #000;padding:6px;margin:0 0 8px;page-break-inside:avoid}',
              '#p83Impressao .pr-bl b{font-size:11px}',
              '#p83Impressao .pr-fotos{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}',
              '#p83Impressao .pr-fotos figure{margin:0;page-break-inside:avoid}',
              '#p83Impressao .pr-fotos img{width:100%;height:auto;border:1px solid #000}',
              '#p83Impressao .pr-fotos figcaption{font-size:10px;text-align:center;padding:2px}',
              '#p83Impressao .pr-ass{margin-top:26px;text-align:center;font-size:11px}'
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
            var b = document.getElementById('p83Botao');
            if (!b) {
              b = document.createElement('button');
              b.id = 'p83Botao';
              b.type = 'button';
              b.textContent = 'Boletim de Inspeção';
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
              b.style.cssText += ';position:fixed;right:14px;bottom:104px;z-index:2147482000;';
              document.body.appendChild(b);
            }
          }
        
          /* ================================================================ *
           * tela
           * ================================================================ */
          function montarCaixa() {
            var f = document.getElementById('p83Fundo');
            if (f) { return f; }
            f = document.createElement('div');
            f.id = 'p83Fundo';
            f.innerHTML =
              '<div id="p83Caixa" role="dialog" aria-modal="true" aria-labelledby="p83Tit">' +
                '<header>' +
                  '<h3 id="p83Tit">Boletim de Inspeção — FORM 07</h3>' +
                  '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
                    '<button class="p83-btn" type="button" data-a="lista">Boletins salvos</button>' +
                    '<button class="p83-btn" type="button" data-a="fechar">Fechar</button>' +
                  '</div>' +
                '</header>' +
                '<div id="p83Corpo"></div>' +
                '<div id="p83Pe">' +
                  '<button class="p83-btn p83-btn-ok" type="button" data-a="salvar">Salvar</button>' +
                  '<button class="p83-btn" type="button" data-a="novo">Novo boletim</button>' +
                  '<button class="p83-btn" type="button" data-a="copiar">Duplicar</button>' +
                  '<button class="p83-btn" type="button" data-a="imprimir">Imprimir / PDF</button>' +
                  '<button class="p83-btn" type="button" data-a="exportar">Exportar arquivo</button>' +
                  '<button class="p83-btn" type="button" data-a="importar">Importar arquivo</button>' +
                  '<button class="p83-btn p83-btn-no" type="button" data-a="excluir">Excluir</button>' +
                '</div>' +
              '</div>';
            document.body.appendChild(f);
            f.addEventListener('click', function (ev) { if (ev.target === f) { fechar(); } });
            f.addEventListener('click', aoClicar);
            f.addEventListener('input', aoDigitar);
            f.addEventListener('change', aoDigitar);
            return f;
          }
        
          function abrir() {
            estilo();
            montarCaixa();
            document.getElementById('p83Fundo').style.display = 'flex';
            carregarTodos(function (arr) {
              lista = (arr || []).sort(function (a, b) {
                return String(b.data || '').localeCompare(String(a.data || ''));
              });
              if (!atual) { atual = lista.length ? lista[0] : boletimNovo(); }
              desenhar();
            });
          }
        
          function fechar() {
            var f = document.getElementById('p83Fundo');
            if (f) { f.style.display = 'none'; }
          }
        
          function campo(rot, chave, valor, tipo) {
            return '<label class="p83-c"><span>' + esc(rot) + '</span>' +
                   '<input class="p83-in" type="' + (tipo || 'text') + '" data-k="' + chave + '" value="' + esc(valor) + '"></label>';
          }
        
          function area(rot, chave, valor, alt) {
            return '<label class="p83-c"><span>' + esc(rot) + '</span>' +
                   '<textarea class="p83-ta" data-k="' + chave + '"' + (alt ? ' style="min-height:' + alt + 'px"' : '') + '>' + esc(valor) + '</textarea></label>';
          }
        
          function fotosHTML(fotos, dono) {
            var h = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
              '<button class="p83-btn p83-btn-mini" type="button" data-a="foto" data-dono="' + dono + '">Tirar foto agora</button>' +
              '<button class="p83-btn p83-btn-mini" type="button" data-a="img" data-dono="' + dono + '">Escolher imagens</button>' +
              '<span style="font-size:12px;color:#94a3b8;align-self:center">' + fotos.length + ' foto(s)</span>' +
              '</div>';
            if (fotos.length) {
              h += '<div class="p83-fotos">';
              fotos.forEach(function (ft) {
                h += '<div class="p83-foto">' +
                  '<img src="' + esc(ft.url) + '" alt="foto da inspeção" data-a="lupa">' +
                  '<input class="p83-leg" data-leg="' + esc(ft.id) + '" data-dono="' + dono + '" placeholder="Legenda da foto" value="' + esc(ft.leg || '') + '">' +
                  '<div class="p83-fx">' +
                    '<button class="p83-btn p83-btn-mini" type="button" data-a="editarFoto" data-dono="' + dono + '" data-f="' + esc(ft.id) + '">Editar</button>' +
                    '<button class="p83-btn p83-btn-mini" type="button" data-a="fsobe" data-dono="' + dono + '" data-f="' + esc(ft.id) + '">&#8592;</button>' +
                    '<button class="p83-btn p83-btn-mini" type="button" data-a="fdesce" data-dono="' + dono + '" data-f="' + esc(ft.id) + '">&#8594;</button>' +
                    '<button class="p83-btn p83-btn-mini p83-btn-no" type="button" data-a="fsai" data-dono="' + dono + '" data-f="' + esc(ft.id) + '">Remover</button>' +
                  '</div>' +
                '</div>';
              });
              h += '</div>';
            }
            return h;
          }
        
          function desenhar() {
            var c = document.getElementById('p83Corpo');
            if (!c || !atual) { return; }
            var b = atual;
            var h = '';
        
            h += '<div class="p83-sec"><h4>Identificação</h4><div class="p83-g p83-g3">' +
              campo('Nº do boletim', 'numero', b.numero) +
              campo('Formulário', 'formulario', b.formulario) +
              campo('Data da visita', 'data', b.data, 'date') +
              campo('Cliente', 'cliente', b.cliente) +
              campo('Obra', 'obra', b.obra) +
              campo('Contrato', 'contrato', b.contrato) +
              campo('Endereço', 'endereco', b.endereco) +
              campo('Técnico responsável', 'inspetor', b.inspetor) +
              campo('Acompanhado por', 'acompanhante', b.acompanhante) +
              '</div></div>';
        
            h += '<div class="p83-sec"><h4>Motivo da visita</h4>' +
              area('O que o cliente relatou', 'motivo', b.motivo, 90) + '</div>';
        
            h += '<div class="p83-sec"><h4>Histórico por esquadria (' + b.blocos.length + ')</h4>';
            if (!b.blocos.length) {
              h += '<div class="p83-vazio">Nenhuma esquadria lançada ainda.</div>';
            }
            b.blocos.forEach(function (bl, i) {
              h += '<div class="p83-bloco">' +
                '<div class="p83-bloco-topo"><b>Item ' + (i + 1) + '</b>' +
                  '<span style="display:flex;gap:4px">' +
                    '<button class="p83-btn p83-btn-mini" type="button" data-a="bsobe" data-b="' + esc(bl.id) + '">Subir</button>' +
                    '<button class="p83-btn p83-btn-mini" type="button" data-a="bdesce" data-b="' + esc(bl.id) + '">Descer</button>' +
                    '<button class="p83-btn p83-btn-mini p83-btn-no" type="button" data-a="bsai" data-b="' + esc(bl.id) + '">Excluir</button>' +
                  '</span>' +
                '</div>' +
                '<div class="p83-g p83-g2">' +
                  '<label class="p83-c"><span>Esquadria / local</span><input class="p83-in" data-b="' + esc(bl.id) + '" data-bk="titulo" value="' + esc(bl.titulo) + '" placeholder="Ex.: Porta de correr entrada principal"></label>' +
                  '<label class="p83-c"><span>Linha</span><input class="p83-in" data-b="' + esc(bl.id) + '" data-bk="linha" value="' + esc(bl.linha) + '" placeholder="Ex.: Aller"></label>' +
                  '<label class="p83-c"><span>Nº de folhas</span><input class="p83-in" data-b="' + esc(bl.id) + '" data-bk="folhas" value="' + esc(bl.folhas) + '" placeholder="Ex.: 03 folhas"></label>' +
                  '<label class="p83-c"><span>Pavimento / ambiente</span><input class="p83-in" data-b="' + esc(bl.id) + '" data-bk="pavimento" value="' + esc(bl.pavimento) + '" placeholder="Ex.: 1º pavimento, suíte casal"></label>' +
                '</div>' +
                '<div class="p83-g" style="margin-top:10px">' +
                  '<label class="p83-c"><span>Serviço a executar</span><input class="p83-in" data-b="' + esc(bl.id) + '" data-bk="servico" value="' + esc(bl.servico) + '" placeholder="Ex.: Substituição de 01 par de roldana"></label>' +
                  '<label class="p83-c"><span>Descrição / diagnóstico</span><textarea class="p83-ta" data-b="' + esc(bl.id) + '" data-bk="texto" placeholder="Descreva folha por folha o que foi verificado">' + esc(bl.texto) + '</textarea></label>' +
                '</div>' +
                fotosHTML(bl.fotos || [], bl.id) +
              '</div>';
            });
            h += '<button class="p83-btn" type="button" data-a="bnovo">+ Adicionar esquadria</button></div>';
        
            h += '<div class="p83-sec"><h4>Itens para orçamento</h4>';
            (b.orcamento || []).forEach(function (it) {
              h += '<div class="p83-lin">' +
                '<input class="p83-in" data-o="' + esc(it.id) + '" data-ok="qtd" value="' + esc(it.qtd) + '" placeholder="Qtd">' +
                '<input class="p83-in" data-o="' + esc(it.id) + '" data-ok="desc" value="' + esc(it.desc) + '" placeholder="Descrição do material ou serviço">' +
                '<button class="p83-btn p83-btn-mini p83-btn-no" type="button" data-a="osai" data-o="' + esc(it.id) + '">X</button>' +
              '</div>';
            });
            h += '<button class="p83-btn" type="button" data-a="onovo">+ Adicionar item</button></div>';
        
            h += '<div class="p83-sec"><h4>Relatório fotográfico geral</h4>' +
              fotosHTML(b.fotosGerais || [], '__geral__') + '</div>';
        
            h += '<div class="p83-sec"><h4>Conclusão e assinatura</h4>' +
              area('Conclusão / observações finais', 'conclusao', b.conclusao, 80) +
              '<div class="p83-g p83-g2" style="margin-top:10px">' +
              campo('Assinatura do responsável', 'responsavel', b.responsavel) +
              '</div></div>';
        
            c.innerHTML = h;
          }
        
          /* ================================================================ *
           * edicao
           * ================================================================ */
          function acharBloco(id) {
            for (var i = 0; i < atual.blocos.length; i++) { if (atual.blocos[i].id === id) { return atual.blocos[i]; } }
            return null;
          }
        
          function donoFotos(dono) {
            if (dono === '__geral__') {
              if (!atual.fotosGerais) { atual.fotosGerais = []; }
              return atual.fotosGerais;
            }
            var bl = acharBloco(dono);
            if (!bl) { return null; }
            if (!bl.fotos) { bl.fotos = []; }
            return bl.fotos;
          }
        
          function salvarDepois() {
            clearTimeout(timerSalvar);
            timerSalvar = setTimeout(function () {
              guardar(atual, function () {});
            }, 700);
          }
        
          function aoDigitar(ev) {
            var t = ev.target;
            if (!t || !atual) { return; }
            if (t.hasAttribute('data-k')) { atual[t.getAttribute('data-k')] = t.value; salvarDepois(); return; }
            if (t.hasAttribute('data-bk')) {
              var bl = acharBloco(t.getAttribute('data-b'));
              if (bl) { bl[t.getAttribute('data-bk')] = t.value; salvarDepois(); }
              return;
            }
            if (t.hasAttribute('data-ok')) {
              var id = t.getAttribute('data-o');
              (atual.orcamento || []).forEach(function (it) { if (it.id === id) { it[t.getAttribute('data-ok')] = t.value; } });
              salvarDepois();
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
                aviso(ok ? 'Boletim salvo.' : 'Nao consegui salvar. Espaco do navegador cheio?', ok ? 'ok' : 'erro');
              });
              return;
            }
            if (a === 'novo') {
              ev.preventDefault();
              guardar(atual, function () {
                atual = boletimNovo();
                guardar(atual, function () { desenhar(); aviso('Novo boletim criado.'); });
              });
              return;
            }
            if (a === 'copiar') {
              ev.preventDefault();
              var copia = JSON.parse(JSON.stringify(atual));
              copia.id = novoId('bol');
              copia.criado = new Date().toISOString();
              copia.numero = '';
              copia.data = hoje();
              atual = copia;
              guardar(atual, function () { desenhar(); aviso('Boletim duplicado.'); });
              return;
            }
            if (a === 'excluir') {
              ev.preventDefault();
              if (!confirm('Excluir este boletim? Nao tem como desfazer.')) { return; }
              var id = atual.id;
              apagar(id, function () {
                carregarTodos(function (arr) {
                  lista = arr || [];
                  atual = lista.length ? lista[0] : boletimNovo();
                  desenhar();
                  aviso('Boletim excluido.');
                });
              });
              return;
            }
            if (a === 'imprimir') { ev.preventDefault(); imprimir(); return; }
            if (a === 'exportar') { ev.preventDefault(); exportar(); return; }
            if (a === 'importar') { ev.preventDefault(); importar(); return; }
        
            if (a === 'bnovo') { ev.preventDefault(); atual.blocos.push(blocoNovo()); salvarDepois(); desenhar(); return; }
            if (a === 'bsai') {
              ev.preventDefault();
              var bid = b.getAttribute('data-b');
              atual.blocos = atual.blocos.filter(function (x) { return x.id !== bid; });
              salvarDepois(); desenhar();
              return;
            }
            if (a === 'bsobe' || a === 'bdesce') {
              ev.preventDefault();
              mover(atual.blocos, b.getAttribute('data-b'), a === 'bsobe' ? -1 : 1);
              salvarDepois(); desenhar();
              return;
            }
        
            if (a === 'onovo') {
              ev.preventDefault();
              if (!atual.orcamento) { atual.orcamento = []; }
              atual.orcamento.push({ id: novoId('o'), qtd: '', desc: '' });
              salvarDepois(); desenhar();
              return;
            }
            if (a === 'osai') {
              ev.preventDefault();
              var oid = b.getAttribute('data-o');
              atual.orcamento = (atual.orcamento || []).filter(function (x) { return x.id !== oid; });
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
              for (var i = 0; i < arr2.length; i++) { if (arr2[i].id === fid) { arr2.splice(i, 1); break; } }
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
        
            if (a === 'abrirBol') {
              ev.preventDefault();
              var aid = b.getAttribute('data-id');
              for (var k = 0; k < lista.length; k++) { if (lista[k].id === aid) { atual = lista[k]; break; } }
              desenhar();
              aviso('Boletim aberto.');
              return;
            }
            if (a === 'apagarBol') {
              ev.preventDefault();
              if (!confirm('Excluir este boletim?')) { return; }
              apagar(b.getAttribute('data-id'), function () {
                carregarTodos(function (arr) { lista = arr || []; telaLista(); });
              });
              return;
            }
            if (a === 'voltarBol') { ev.preventDefault(); desenhar(); return; }
          }
        
          function lupa(url) {
            var f = document.createElement('div');
            f.className = 'p83-lupa';
            var img = document.createElement('img');
            img.src = url;
            img.alt = 'foto ampliada';
            f.appendChild(img);
            f.addEventListener('click', function () { try { document.body.removeChild(f); } catch (e) {} });
            document.body.appendChild(f);
          }
        
          function telaLista() {
            var c = document.getElementById('p83Corpo');
            if (!c) { return; }
            carregarTodos(function (arr) {
              lista = (arr || []).sort(function (a, b) { return String(b.data || '').localeCompare(String(a.data || '')); });
              var h = '<div class="p83-sec"><h4>Boletins salvos (' + lista.length + ')</h4>';
              if (!lista.length) {
                h += '<div class="p83-vazio">Nenhum boletim salvo ainda.</div>';
              } else {
                h += '<table class="p83-tab"><thead><tr><th>Nº</th><th>Data</th><th>Cliente / Obra</th><th>Fotos</th><th>Ações</th></tr></thead><tbody>';
                lista.forEach(function (r) {
                  var nf = (r.fotosGerais || []).length;
                  (r.blocos || []).forEach(function (bl) { nf += (bl.fotos || []).length; });
                  h += '<tr>' +
                    '<td>' + esc(r.numero || '-') + '</td>' +
                    '<td>' + esc(dataBonita(r.data)) + '</td>' +
                    '<td>' + esc((r.cliente || '-') + ' / ' + (r.obra || '-')) + '</td>' +
                    '<td>' + nf + '</td>' +
                    '<td><button class="p83-btn p83-btn-mini" type="button" data-a="abrirBol" data-id="' + esc(r.id) + '">Abrir</button> ' +
                    '<button class="p83-btn p83-btn-mini p83-btn-no" type="button" data-a="apagarBol" data-id="' + esc(r.id) + '">Excluir</button></td>' +
                  '</tr>';
                });
                h += '</tbody></table>';
              }
              h += '<div style="margin-top:10px"><button class="p83-btn" type="button" data-a="voltarBol">Voltar ao boletim</button></div></div>';
              c.innerHTML = h;
            });
          }
        
          /* ================================================================ *
           * impressao / PDF
           * ================================================================ */
          function blocoImpresso(bl, i) {
            var t = '';
            t += '<div class="pr-bl"><b>' + (i + 1) + '. ' + esc(bl.titulo || 'Esquadria') + '</b>';
            var det = [];
            if (bl.linha) { det.push('Linha: ' + bl.linha); }
            if (bl.folhas) { det.push('Folhas: ' + bl.folhas); }
            if (bl.pavimento) { det.push('Local: ' + bl.pavimento); }
            if (det.length) { t += '<div class="pr-tx">' + esc(det.join('  |  ')) + '</div>'; }
            if (bl.servico) { t += '<div class="pr-tx"><b>Serviço:</b> ' + esc(bl.servico) + '</div>'; }
            if (bl.texto) { t += '<div class="pr-tx">' + esc(bl.texto) + '</div>'; }
            if ((bl.fotos || []).length) {
              t += '<div class="pr-fotos">';
              bl.fotos.forEach(function (ft, k) {
                t += '<figure><img src="' + esc(ft.url) + '" alt="foto"><figcaption>Foto ' + (i + 1) + '.' + (k + 1) + (ft.leg ? ' - ' + esc(ft.leg) : '') + '</figcaption></figure>';
              });
              t += '</div>';
            }
            t += '</div>';
            return t;
          }
        
          function imprimir() {
            var b = atual;
            if (!b) { return; }
            var d = document.getElementById('p83Impressao');
            if (!d) {
              d = document.createElement('div');
              d.id = 'p83Impressao';
              document.body.appendChild(d);
            }
            var h = '';
            h += '<div class="pr-tit">BOLETIM DE INSPEÇÃO</div>';
            h += '<div class="pr-sub">' + esc(b.formulario || 'FORM 07') + (b.numero ? ' — Nº ' + esc(b.numero) : '') + ' — ' + esc(dataBonita(b.data)) + '</div>';
            h += '<table><tr><th style="width:18%">Cliente</th><td style="width:32%">' + esc(b.cliente) + '</td>' +
                 '<th style="width:18%">Obra</th><td>' + esc(b.obra) + '</td></tr>' +
                 '<tr><th>Contrato</th><td>' + esc(b.contrato) + '</td><th>Endereço</th><td>' + esc(b.endereco) + '</td></tr>' +
                 '<tr><th>Técnico</th><td>' + esc(b.inspetor) + '</td><th>Acompanhado por</th><td>' + esc(b.acompanhante) + '</td></tr></table>';
            h += '<h3>Motivo da visita</h3><div class="pr-tx">' + esc(b.motivo || '-') + '</div>';
            h += '<h3>Histórico</h3>';
            (b.blocos || []).forEach(function (bl, i) { h += blocoImpresso(bl, i); });
            if ((b.orcamento || []).filter(function (o) { return o.qtd || o.desc; }).length) {
              h += '<h3>Itens para orçamento</h3><table><tr><th style="width:14%">Qtd</th><th>Descrição</th></tr>';
              b.orcamento.forEach(function (o) {
                if (!o.qtd && !o.desc) { return; }
                h += '<tr><td>' + esc(o.qtd) + '</td><td>' + esc(o.desc) + '</td></tr>';
              });
              h += '</table>';
            }
            if ((b.fotosGerais || []).length) {
              h += '<h3>Relatório fotográfico</h3><div class="pr-fotos">';
              b.fotosGerais.forEach(function (ft, k) {
                h += '<figure><img src="' + esc(ft.url) + '" alt="foto"><figcaption>Foto ' + (k + 1) + (ft.leg ? ' - ' + esc(ft.leg) : '') + '</figcaption></figure>';
              });
              h += '</div>';
            }
            if (b.conclusao) { h += '<h3>Conclusão</h3><div class="pr-tx">' + esc(b.conclusao) + '</div>'; }
            h += '<div class="pr-ass">_______________________________________<br>' + esc(b.responsavel || 'Responsável') + '</div>';
            d.innerHTML = h;
            var janelaImpressao = window.open('', '_blank');
            if (!janelaImpressao) { alert('Permita pop-ups para imprimir o Boletim de Inspeção.'); return; }
            var cssImpressao = '<style>' +
              '@page{size:A4 portrait;margin:10mm}' +
              'html,body{margin:0;padding:0;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif}' +
              'body{font-size:10pt}' +
              'table{width:100%;border-collapse:collapse;margin:0 0 10px;font-size:9pt}' +
              'th,td{border:1px solid #000;padding:4px 6px;vertical-align:top}' +
              'th{background:#e5e7eb;text-align:left}' +
              '.pr-tit{text-align:center;font-size:16pt;font-weight:700;margin:0 0 2px}' +
              '.pr-sub{text-align:center;font-size:9pt;margin:0 0 10px}' +
              'h3{font-size:10pt;margin:10px 0 4px;border-bottom:1px solid #000;padding-bottom:2px}' +
              '.pr-tx{font-size:9pt;white-space:pre-wrap;margin:0 0 6px}' +
              '.pr-bl{border:1px solid #000;padding:6px;margin:0 0 8px;break-inside:avoid;page-break-inside:avoid}' +
              '.pr-fotos{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}' +
              '.pr-fotos figure{margin:0;break-inside:avoid;page-break-inside:avoid}' +
              '.pr-fotos img{width:100%;height:auto;border:1px solid #000}' +
              '.pr-fotos figcaption{font-size:8pt;text-align:center;padding:2px}' +
              '.pr-ass{margin-top:22px;text-align:center;font-size:9pt}' +
              '</style>';
            janelaImpressao.document.open();
            janelaImpressao.document.write('<!doctype html><html><head><meta charset="UTF-8"><title>Boletim de Inspeção</title>' + cssImpressao + '</head><body>' + h + '</body></html>');
            janelaImpressao.document.close();
            var imprimirJanela = function () {
              try { janelaImpressao.focus(); janelaImpressao.print(); } catch (erro) {}
            };
            var imagens = janelaImpressao.document.images;
            var restantes = imagens.length;
            if (!restantes) { setTimeout(imprimirJanela, 150); }
            else {
              var pronto = false;
              var imagemPronta = function () { restantes--; if (restantes <= 0 && !pronto) { pronto = true; setTimeout(imprimirJanela, 150); } };
              for (var ii = 0; ii < imagens.length; ii++) {
                if (imagens[ii].complete) { imagemPronta(); }
                else { imagens[ii].addEventListener('load', imagemPronta, { once: true }); imagens[ii].addEventListener('error', imagemPronta, { once: true }); }
              }
              setTimeout(function () { if (!pronto) { pronto = true; imprimirJanela(); } }, 5000);
            }
          }
        
          /* ================================================================ *
           * exportar / importar
           * ================================================================ */
          function exportar() {
            try {
              var txt = JSON.stringify(atual);
              var a = document.createElement('a');
              a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
              a.download = 'boletim_' + (atual.numero || atual.data || 'inspecao') + '.json';
              document.body.appendChild(a);
              a.click();
              setTimeout(function () {
                try { URL.revokeObjectURL(a.href); document.body.removeChild(a); } catch (e) {}
              }, 400);
              aviso('Arquivo do boletim gerado.');
            } catch (e) { aviso('Nao consegui gerar o arquivo.', 'erro'); }
          }
        
          function importar() {
            var inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = 'application/json,.json';
            inp.style.display = 'none';
            document.body.appendChild(inp);
            inp.addEventListener('change', function () {
              var arq = inp.files && inp.files[0];
              if (!arq) { return; }
              var fr = new FileReader();
              fr.onload = function () {
                try {
                  var r = JSON.parse(String(fr.result));
                  if (!r || !r.blocos) { throw new Error('formato'); }
                  r.id = novoId('bol');
                  atual = r;
                  guardar(atual, function () { desenhar(); aviso('Boletim importado.'); });
                } catch (e) { aviso('Arquivo invalido.', 'erro'); }
                try { document.body.removeChild(inp); } catch (e2) {}
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
            window.__varreduraUnica(colocarBotao);
          }
        
          window.p83AbrirBoletim = function () { abrir(); };
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        })();
    
