
        /* ====== PATCH95_IMG_OK - Criar e editar imagens no Relatorio FPDO ====== */
        (function () {
          'use strict';
          if (window.__PS95) { return; }
          window.__PS95 = true;
        
          /* ================================================================ *
           * ajustes gerais
           * ================================================================ */
          var BASE = 'p92_fpdo_v1';
          var LOJA = 'reg';
          var K_LS = 'p92_fpdo_ls_v1';
          var K_ULT = 'p92_fpdo_ultimo_v1';
        
          var MAXLADO = 1600;      /* maior lado da imagem gravada, em pontos  */
          var QUAL = 0.86;         /* qualidade do jpeg gravado                */
          var MAXHIST = 12;        /* quantos passos o "Desfazer" guarda       */
        
          /* ================================================================ *
           * PATCH_RECORTE_PROPORCIONAL_OK
           * Formatos de recorte que casam exatamente com o tamanho da caixa
           * de foto usada ao montar o PowerPoint/PDF (ver montarSlides() e
           * faixaFotos() no patch PATCH94_FPDO_PPTX_OK). Os numeros abaixo sao
           * os mesmos % de largura/altura do slide usados la, so que aqui
           * viram uma razao largura/altura para travar o recorte na tela.
           * Assim a foto recortada preenche a caixa do slide sem sobrar
           * espaco vazio (letterbox) nem cortar a foto de forma inesperada
           * na hora de gerar o relatorio. */
          var POL_L95 = 13.333, POL_A95 = 7.5; /* mesmo tamanho de slide do PATCH94 (16:9, 13.333" x 7.5") */
          function proporcao(wPct, hPct) { return (wPct * POL_L95) / (hPct * POL_A95); }
          var FORMATOS_RECORTE = [
            { id: 'livre', rotulo: 'Recorte livre', razao: null },
            { id: 'elev', rotulo: 'Elevacao (mes a mes)', razao: proporcao(42.3, 60.0) },
            { id: 'inst', rotulo: 'Item instalado', razao: proporcao(46.0, 71.5) },
            { id: 'capa', rotulo: 'Capa do relatorio', razao: proporcao(49.0, 84.0) },
            { id: 'faixa1', rotulo: 'Pendencia/final - 1 foto', razao: proporcao(46.0, 63.5) },
            { id: 'faixa2', rotulo: 'Pendencia/final - 2 fotos', razao: proporcao(45.0, 63.5) },
            { id: 'faixa3', rotulo: 'Pendencia/final - 3 fotos', razao: proporcao(30.0, 63.5) }
          ];
          function formatoPorId(id) {
            var i;
            for (i = 0; i < FORMATOS_RECORTE.length; i++) { if (FORMATOS_RECORTE[i].id === id) { return FORMATOS_RECORTE[i]; } }
            return FORMATOS_RECORTE[0];
          }
          /* adivinha o formato certo a partir do mesmo texto de "alvo" que
             grupoFotos() usa no PATCH92 (ex.: "elev:123:antes", "inst:456") */
          function formatoPorAlvo(alvo) {
            var p = String(alvo || '').split(':');
            if (p[0] === 'elev') { return formatoPorId('elev'); }
            if (p[0] === 'inst') { return formatoPorId('inst'); }
            if (p[0] === 'capa') { return formatoPorId('capa'); }
            if (p[0] === 'pend' || p[0] === 'fim') { return formatoPorId('faixa2'); } /* melhor palpite: a maioria tem 2 fotos por linha */
            return formatoPorId('livre');
          }
        
          /* ================================================================ *
           * utilidades simples
           * ================================================================ */
          function esc(s) {
            return String(s == null ? '' : s)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          }
        
          function espera(ms, fn) { setTimeout(fn, ms); }
        
          function novoId(p) {
            return String(p || 'f') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
          }
        
          function aviso(msg, tipo) {
            if (typeof window.mostrarToastPainel === 'function') {
              try { window.mostrarToastPainel(msg, tipo === 'erro' ? 'erro' : 'ok'); return; } catch (e) {}
            }
            var d = document.getElementById('p95Aviso');
            if (!d) {
              d = document.createElement('div');
              d.id = 'p95Aviso';
              document.body.appendChild(d);
            }
            d.textContent = String(msg || '');
            d.className = tipo === 'erro' ? 'p95-ruim' : 'p95-bom';
            d.style.display = 'block';
            if (d.__t) { clearTimeout(d.__t); }
            d.__t = setTimeout(function () { d.style.display = 'none'; }, 4200);
          }
        
          /* ================================================================ *
           * onde o relatorio fica guardado (mesmo lugar do Relatorio FPDO)
           * ================================================================ */
          function lsLer() {
            try { return JSON.parse(localStorage.getItem(K_LS) || '[]') || []; } catch (e) { return []; }
          }
        
          function lsGravar(arr) {
            try { localStorage.setItem(K_LS, JSON.stringify(arr)); return true; } catch (e) { return false; }
          }
        
          function abrirBase(ok, falhou) {
            try {
              if (!window.indexedDB) { falhou(); return; }
              var req = window.indexedDB.open(BASE, 1);
              req.onupgradeneeded = function () {
                try {
                  var b = req.result;
                  if (!b.objectStoreNames.contains(LOJA)) { b.createObjectStore(LOJA, { keyPath: 'id' }); }
                } catch (e) {}
              };
              req.onsuccess = function () { ok(req.result); };
              req.onerror = function () { falhou(); };
            } catch (e) { falhou(); }
          }
        
          function carregarTodos(depois) {
            abrirBase(function (b) {
              try {
                var t = b.transaction(LOJA, 'readonly');
                var r = t.objectStore(LOJA).getAll();
                r.onsuccess = function () { depois(r.result || []); };
                r.onerror = function () { depois(lsLer()); };
              } catch (e) { depois(lsLer()); }
            }, function () { depois(lsLer()); });
          }
        
          function guardarReg(reg, depois) {
            reg.alterado = new Date().toISOString();
            abrirBase(function (b) {
              try {
                var t = b.transaction(LOJA, 'readwrite');
                t.objectStore(LOJA).put(reg);
                t.oncomplete = function () { depois(true); };
                t.onerror = function () { depois(false); };
              } catch (e) { depois(false); }
            }, function () {
              var arr = lsLer(), achou = false, i;
              for (i = 0; i < arr.length; i++) { if (arr[i].id === reg.id) { arr[i] = reg; achou = true; break; } }
              if (!achou) { arr.push(reg); }
              depois(lsGravar(arr));
            });
          }
        
          /* pede ao painel para gravar o que esta na tela e devolve o relatorio */
          function obterDados(depois) {
            var bs = document.querySelector('#p92Pe [data-a="salvar"]');
            if (bs) { try { bs.click(); } catch (e) {} }
            espera(bs ? 520 : 60, function () {
              carregarTodos(function (arr) {
                var lst = (arr || []).slice().sort(function (a, b) {
                  return String(b.alterado || b.criado || '').localeCompare(String(a.alterado || a.criado || ''));
                });
                var ult = null, reg = null, i;
                try { ult = localStorage.getItem(K_ULT); } catch (e2) {}
                for (i = 0; i < lst.length; i++) { if (lst[i].id === ult) { reg = lst[i]; break; } }
                if (!reg && lst.length) { reg = lst[0]; }
                if (!reg) {
                  aviso('Abra o Relatorio FPDO e salve uma vez antes de editar as imagens.', 'erro');
                  return;
                }
                depois(reg);
              });
            });
          }
        
          /* faz a janela do relatorio ler de novo o que acabamos de gravar */
          function recarregarTela(regId, depois) {
            var secAtiva = null;
            var on = document.querySelector('#p92Nav .p92-nav.on');
            if (on) { secAtiva = on.getAttribute('data-s'); }
        
            var bl = document.querySelector('#p92Fundo [data-a="lista"]');
            if (!bl) {
              aviso('Imagem gravada. Feche e abra o relatorio para ver.', 'ok');
              if (depois) { depois(); }
              return;
            }
            try { bl.click(); } catch (e) {}
            espera(560, function () {
              var ba = document.querySelector('#p92Corpo [data-a="lerReg"][data-i="' + regId + '"]');
              if (!ba) {
                aviso('Imagem gravada. Abra o relatorio na lista para ver.', 'ok');
                if (depois) { depois(); }
                return;
              }
              try { ba.click(); } catch (e2) {}
              espera(160, function () {
                if (secAtiva) {
                  var bn = document.querySelector('#p92Nav [data-a="sec"][data-s="' + secAtiva + '"]');
                  if (bn) { try { bn.click(); } catch (e3) {} }
                }
                if (depois) { depois(); }
              });
            });
          }
        
          /* mexe no relatorio guardado e atualiza a tela */
          function atualizarReg(mudar, msg) {
            obterDados(function (reg) {
              var ok = false;
              try { ok = mudar(reg) !== false; } catch (e) { ok = false; }
              if (!ok) { aviso('Nao consegui achar este lugar do relatorio.', 'erro'); return; }
              guardarReg(reg, function (gravou) {
                if (!gravou) { aviso('Nao consegui gravar neste navegador.', 'erro'); return; }
                try { localStorage.setItem(K_ULT, reg.id); } catch (e2) {}
                recarregarTela(reg.id, function () { aviso(msg || 'Imagem atualizada.'); });
              });
            });
          }
        
          function achar(arr, id) {
            var i;
            for (i = 0; i < (arr || []).length; i++) { if (arr[i].id === id) { return arr[i]; } }
            return null;
          }
        
          /* mesmo endereco de grupo de fotos usado pelo Relatorio FPDO */
          function grupoDe(reg, alvo) {
            if (!reg) { return null; }
            var p = String(alvo || '').split(':');
            if (p[0] === 'capa') { reg.capaFotos = reg.capaFotos || []; return reg.capaFotos; }
            if (p[0] === 'fim') { reg.fotosFinal = reg.fotosFinal || []; return reg.fotosFinal; }
            if (p[0] === 'elev') {
              var e = achar(reg.elevacoes, p[1]);
              if (!e) { return null; }
              if (p[2] === 'antes') { e.fotosAntes = e.fotosAntes || []; return e.fotosAntes; }
              e.fotosDepois = e.fotosDepois || [];
              return e.fotosDepois;
            }
            if (p[0] === 'inst') {
              var it = achar(reg.itens, p[1]);
              if (!it) { return null; }
              it.fotos = it.fotos || [];
              return it.fotos;
            }
            if (p[0] === 'pend') {
              var pd = achar(reg.pendencias, p[1]);
              if (!pd) { return null; }
              pd.fotos = pd.fotos || [];
              return pd.fotos;
            }
            return null;
          }
        
          /* lista de todas as fotos do relatorio, com o nome do lugar */
          function todasFotos(reg) {
            var saida = [];
            function junta(alvo, nome, arr) {
              (arr || []).forEach(function (f) {
                saida.push({ alvo: alvo, onde: nome, id: f.id, url: f.url, leg: f.leg || '' });
              });
            }
            junta('capa', 'Capa', reg.capaFotos);
            (reg.elevacoes || []).forEach(function (e) {
              junta('elev:' + e.id + ':antes', (e.nome || 'Elevacao') + ' - antes', e.fotosAntes);
              junta('elev:' + e.id + ':depois', (e.nome || 'Elevacao') + ' - depois', e.fotosDepois);
            });
            (reg.itens || []).forEach(function (it) {
              junta('inst:' + it.id, it.titulo || 'Item instalado', it.fotos);
            });
            (reg.pendencias || []).forEach(function (p) {
              junta('pend:' + p.id, 'Pendencia - ' + (p.pavimento || ''), p.fotos);
            });
            junta('fim', 'Fotos do final', reg.fotosFinal);
            return saida;
          }
        
          /* ================================================================ *
           * imagens: carregar e gravar
           * ================================================================ */
          function carregarImagem(url, ok, falhou) {
            var im = new Image();
            try { im.crossOrigin = 'anonymous'; } catch (e) {}
            im.onload = function () { ok(im); };
            im.onerror = function () { if (falhou) { falhou(); } };
            im.src = String(url || '');
          }
        
          function canvasParaUrl(cv) {
            var l = cv.width, a = cv.height, k = 1;
            if (Math.max(l, a) > MAXLADO) { k = MAXLADO / Math.max(l, a); }
            if (k >= 1) {
              try { return cv.toDataURL('image/jpeg', QUAL); } catch (e) { return cv.toDataURL(); }
            }
            var c2 = document.createElement('canvas');
            c2.width = Math.max(1, Math.round(l * k));
            c2.height = Math.max(1, Math.round(a * k));
            var x = c2.getContext('2d');
            x.fillStyle = '#000';
            x.fillRect(0, 0, c2.width, c2.height);
            x.drawImage(cv, 0, 0, c2.width, c2.height);
            try { return c2.toDataURL('image/jpeg', QUAL); } catch (e2) { return c2.toDataURL(); }
          }
        
          /* desenha a imagem dentro de uma caixa, sem distorcer */
          function dentroDaCaixa(ctx, im, l, t, w, h) {
            var k = Math.min(w / im.width, h / im.height);
            var lg = im.width * k, at = im.height * k;
            ctx.drawImage(im, l + (w - lg) / 2, t + (h - at) / 2, lg, at);
          }
        
          /* ================================================================ *
           * aparencia
           * ================================================================ */
          function estilo() {
            if (document.getElementById('p95Estilo')) { return; }
            var css = [
              '#p95Aviso{position:fixed;left:50%;transform:translateX(-50%);bottom:22px;z-index:2147483400;',
              'padding:11px 16px;border-radius:10px;font:600 14px/1.35 system-ui,Arial;display:none;max-width:88vw}',
              '#p95Aviso.p95-bom{background:#065f46;color:#ecfdf5}',
              '#p95Aviso.p95-ruim{background:#7f1d1d;color:#fef2f2}',
        
              '#p95Fundo{position:fixed;inset:0;z-index:2147483300;background:rgba(2,6,23,.82);display:none;',
              'align-items:center;justify-content:center;padding:14px;overflow:auto;font:14px/1.4 system-ui,Arial}',
              '#p95Cx{width:100%;max-width:1600px;height:94vh;margin:0 auto;background:#ffffff;border:1px solid #cbd5e1;border-radius:14px;',
              'color:#0f172a;overflow:hidden;display:flex;flex-direction:column}',
              '#p95Cx header{display:flex;gap:8px;align-items:center;justify-content:space-between;background:#0f172a;',
              'padding:10px 14px;border-bottom:1px solid #334155;flex-wrap:wrap}',
              '#p95Cx header h4{margin:0;font-size:16px;color:#f8fafc}',
              '.p95-barra{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:8px 12px;border-bottom:1px solid #cbd5e1;background:#f8fafc}',
              '.p95-barra b{font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:.04em;margin-right:2px}',
              '.p95-bt{background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:8px;padding:7px 11px;',
              'font:600 13px system-ui,Arial;cursor:pointer}',
              '.p95-bt:hover{background:#334155}',
              '.p95-bt.on{background:#2563eb;border-color:#60a5fa;color:#fff}',
              '.p95-bt-ok{background:#047857;border-color:#10b981;color:#ecfdf5}',
              '.p95-bt-no{background:#7f1d1d;border-color:#ef4444;color:#fef2f2}',
              '.p95-bt[disabled]{opacity:.5;cursor:default}',
              '.p95-cor{width:44px;height:32px;padding:0;border:1px solid #475569;border-radius:8px;background:#1e293b;cursor:pointer}',
              '.p95-fai{width:120px;vertical-align:middle}',
              '.p95-rot{font-size:12px;color:#475569}',
              '.p95-palco{position:relative;display:block;margin:0 auto;background:#020617;line-height:0;max-width:100%}',
              '.p95-palco canvas{display:block;max-width:100%;height:auto;touch-action:none}',
              '.p95-palco canvas.p95-ov{position:absolute;left:0;top:0;width:100%;height:100%;cursor:crosshair}',
              '.p95-area{padding:10px;flex:1;min-height:0;overflow:auto;background:#f8fafc}',
              '.p95-pe{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 12px;border-top:1px solid #334155}',
              '.p95-in{background:#ffffff;border:1px solid #94a3b8;color:#0f172a;border-radius:8px;padding:7px 9px;',
              'font:14px system-ui,Arial;min-width:200px;flex:1}',
              '.p95-dica{padding:6px 14px;font-size:12px;color:#475569;background:#f1f5f9}',
              '.p95-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;padding:12px}',
              '.p95-ficha{border:2px solid #334155;border-radius:10px;overflow:hidden;background:#0b1220;cursor:pointer;position:relative}',
              '.p95-ficha.sel{border-color:#22c55e}',
              '.p95-ficha img{width:100%;height:96px;object-fit:cover;display:block}',
              '.p95-ficha span{display:block;padding:5px 6px;font-size:11px;color:#cbd5e1}',
              '.p95-num{position:absolute;top:5px;left:5px;background:#22c55e;color:#052e16;font:700 12px system-ui;',
              'border-radius:999px;width:22px;height:22px;display:flex;align-items:center;justify-content:center}',
              '.p95-esp{flex:1}',
              '@media (max-width:640px){.p95-in{min-width:120px}#p95Cx{height:98vh;border-radius:8px}#p95Fundo{padding:4px}}'
            ].join('');
            var s = document.createElement('style');
            s.id = 'p95Estilo';
            s.textContent = css;
            (document.head || document.documentElement).appendChild(s);
          }
        
          /* ================================================================ *
           * caixa geral (serve para o editor e para as escolhas)
           * ================================================================ */
          function caixa() {
            var f = document.getElementById('p95Fundo');
            if (!f) {
              f = document.createElement('div');
              f.id = 'p95Fundo';
              f.innerHTML = '<div id="p95Cx"></div>';
              /* PATCH_TELA_EDICAO_AMPLIADA_OK: antes ficava dentro de #p92Corpo
                 (rolagem interna do relatorio), entao a tela de edicao aparecia
                 "la embaixo" do painel e passava despercebida. Agora e um
                 overlay de tela cheia preso ao body, igual aos outros modais
                 do sistema (p92Fundo, p84Fundo, etc.), sempre visivel na hora. */
              document.body.appendChild(f);
            }
            f.style.display = 'flex';
            return document.getElementById('p95Cx');
          }
        
          function fecharCaixa() {
            var f = document.getElementById('p95Fundo');
            if (!f) { return; }
            f.style.display = 'none';
            f.removeAttribute('aria-busy');
            var cx = document.getElementById('p95Cx');
            if (cx) { cx.innerHTML = ''; }
            editor = null;
            escolha = null;
          }
        
          document.addEventListener('keydown', function (ev) {
            if (ev.key !== 'Escape' && ev.keyCode !== 27) { return; }
            var f = document.getElementById('p95Fundo');
            if (f && f.style.display === 'block') {
              ev.stopPropagation();
              ev.preventDefault();
              if (confirm('Fechar o editor de imagem? O que nao foi salvo sera perdido.')) { fecharCaixa(); }
            }
          }, true);
        
          /* ================================================================ *
           * o editor de imagem
           * ================================================================ */
          var editor = null;
        
          function abrirEditor(cfg) {
            estilo();
            var cx = caixa();
            cx.innerHTML =
              '<header>' +
                '<h4>' + esc(cfg.titulo || 'Editar imagem') + '</h4>' +
                '<button class="p95-bt" type="button" data-p95="sair">Fechar</button>' +
              '</header>' +
              '<div class="p95-barra">' +
                '<b>Marcar</b>' +
                '<button class="p95-bt on" type="button" data-p95="fer" data-f="pincel">Pincel</button>' +
                '<button class="p95-bt" type="button" data-p95="fer" data-f="seta">Seta</button>' +
                '<button class="p95-bt" type="button" data-p95="fer" data-f="retangulo">Retangulo</button>' +
                '<button class="p95-bt" type="button" data-p95="fer" data-f="circulo">Circulo</button>' +
                '<button class="p95-bt" type="button" data-p95="fer" data-f="texto">Texto</button>' +
                '<button class="p95-bt" type="button" data-p95="fer" data-f="tarja">Tarja</button>' +
                '<span class="p95-rot">Cor</span>' +
                '<input class="p95-cor" type="color" id="p95Cor" value="#ff2d2d">' +
                '<span class="p95-rot">Grossura</span>' +
                '<input class="p95-fai" type="range" id="p95Esp" min="2" max="40" value="8">' +
                '<span class="p95-rot">Letra</span>' +
                '<input class="p95-fai" type="range" id="p95Let" min="14" max="140" value="48">' +
              '</div>' +
              '<div class="p95-barra">' +
                '<b>Imagem</b>' +
                '<button class="p95-bt" type="button" data-p95="fer" data-f="recorte">Recortar</button>' +
                '<span class="p95-rot">Formato</span>' +
                '<select class="p95-fai" id="p95Prop">' +
                  FORMATOS_RECORTE.map(function (f) {
                    return '<option value="' + f.id + '">' + esc(f.rotulo) + '</option>';
                  }).join('') +
                '</select>' +
                '<button class="p95-bt" type="button" data-p95="cortar">Aplicar recorte</button>' +
                '<button class="p95-bt" type="button" data-p95="girar" data-d="-1">Girar &#8630;</button>' +
                '<button class="p95-bt" type="button" data-p95="girar" data-d="1">Girar &#8631;</button>' +
                '<button class="p95-bt" type="button" data-p95="luz">Brilho e cor</button>' +
                '<button class="p95-bt" type="button" data-p95="desfazer">Desfazer</button>' +
                '<button class="p95-bt" type="button" data-p95="zerar">Voltar ao original</button>' +
              '</div>' +
              '<div class="p95-barra" id="p95Luz" style="display:none">' +
                '<b>Ajuste</b>' +
                '<span class="p95-rot">Brilho</span><input class="p95-fai" type="range" id="p95Bri" min="40" max="180" value="100">' +
                '<span class="p95-rot">Contraste</span><input class="p95-fai" type="range" id="p95Con" min="40" max="200" value="100">' +
                '<span class="p95-rot">Cores</span><input class="p95-fai" type="range" id="p95Sat" min="0" max="220" value="100">' +
                '<button class="p95-bt p95-bt-ok" type="button" data-p95="luzOk">Aplicar ajuste</button>' +
                '<button class="p95-bt" type="button" data-p95="luzNao">Cancelar ajuste</button>' +
              '</div>' +
              '<div class="p95-dica" id="p95Dica">Arraste em cima da foto para marcar. Cada marca pode ser desfeita.</div>' +
              '<div class="p95-area">' +
                '<div class="p95-palco" id="p95Palco">' +
                  '<canvas id="p95Cv"></canvas>' +
                  '<canvas id="p95Ov" class="p95-ov"></canvas>' +
                '</div>' +
              '</div>' +
              '<div class="p95-pe">' +
                '<input class="p95-in" id="p95Leg" placeholder="Legenda da foto" value="' + esc(cfg.leg || '') + '">' +
                '<button class="p95-bt p95-bt-ok" type="button" data-p95="salvar">' + esc(cfg.rotSalvar || 'Salvar no relatorio') + '</button>' +
                (cfg.aoSalvarNova ? '<button class="p95-bt" type="button" data-p95="salvarNova">Salvar como foto nova</button>' : '') +
                '<button class="p95-bt p95-bt-no" type="button" data-p95="sair">Cancelar</button>' +
              '</div>';
        
            var cv = document.getElementById('p95Cv');
            var ov = document.getElementById('p95Ov');
        
            var formatoInicial = formatoPorAlvo(cfg.alvo);
        
            editor = {
              cfg: cfg,
              cv: cv,
              ov: ov,
              ctx: cv.getContext('2d'),
              octx: ov.getContext('2d'),
              fer: 'pincel',
              hist: [],
              base: null,          /* imagem de partida do ajuste de brilho */
              recorte: null,
              recorteRazao: formatoInicial.razao, /* PATCH_RECORTE_PROPORCIONAL_OK: null = recorte livre, numero = largura/altura travada */
              arrasta: null,
              original: null
            };
        
            var selProp = document.getElementById('p95Prop');
            if (selProp) {
              selProp.value = formatoInicial.id;
              if (formatoInicial.id !== 'livre') {
                dica('Formato "' + formatoInicial.rotulo + '" selecionado automaticamente, do mesmo tamanho usado nesse tipo de foto no relatorio. Arraste para recortar, ou troque o formato acima.');
              }
            }
        
            function medir(im) {
              cv.width = im.width;
              cv.height = im.height;
              ov.width = im.width;
              ov.height = im.height;
              editor.ctx.drawImage(im, 0, 0);
              editor.original = cv.toDataURL('image/png');
              ligarPonteiro();
            }
        
            if (cfg.canvas) {
              cv.width = cfg.canvas.width;
              cv.height = cfg.canvas.height;
              ov.width = cv.width;
              ov.height = cv.height;
              editor.ctx.drawImage(cfg.canvas, 0, 0);
              editor.original = cv.toDataURL('image/png');
              ligarPonteiro();
            } else {
              carregarImagem(cfg.url, medir, function () {
                aviso('Nao consegui abrir esta imagem.', 'erro');
                fecharCaixa();
              });
            }
          }
        
          function pegarCor() {
            var e = document.getElementById('p95Cor');
            return e ? e.value : '#ff2d2d';
          }
        
          function pegarEsp() {
            var e = document.getElementById('p95Esp');
            var v = e ? Number(e.value) : 8;
            var k = Math.max(editor.cv.width, editor.cv.height) / 1200;
            return Math.max(2, v * Math.max(0.6, k));
          }
        
          function pegarLetra() {
            var e = document.getElementById('p95Let');
            var v = e ? Number(e.value) : 48;
            var k = Math.max(editor.cv.width, editor.cv.height) / 1200;
            return Math.max(12, v * Math.max(0.6, k));
          }
        
          function dica(txt) {
            var d = document.getElementById('p95Dica');
            if (d) { d.textContent = txt; }
          }
        
          function guardarPasso() {
            try {
              editor.hist.push(editor.cv.toDataURL('image/png'));
              if (editor.hist.length > MAXHIST) { editor.hist.shift(); }
            } catch (e) {}
          }
        
          function porImagem(url, depois) {
            carregarImagem(url, function (im) {
              editor.cv.width = im.width;
              editor.cv.height = im.height;
              editor.ov.width = im.width;
              editor.ov.height = im.height;
              editor.ctx.clearRect(0, 0, im.width, im.height);
              editor.ctx.drawImage(im, 0, 0);
              limparOverlay();
              if (depois) { depois(); }
            });
          }
        
          function limparOverlay() {
            if (!editor) { return; }
            editor.octx.clearRect(0, 0, editor.ov.width, editor.ov.height);
          }
        
          /* ---------------------------------------------------------------- *
           * desenhos
           * ---------------------------------------------------------------- */
          function seta(ctx, x1, y1, x2, y2, cor, esp) {
            var ang = Math.atan2(y2 - y1, x2 - x1);
            var p = Math.max(esp * 3.2, 12);
            ctx.save();
            ctx.strokeStyle = cor;
            ctx.fillStyle = cor;
            ctx.lineWidth = esp;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2 - Math.cos(ang) * p * 0.6, y2 - Math.sin(ang) * p * 0.6);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - Math.cos(ang - 0.42) * p, y2 - Math.sin(ang - 0.42) * p);
            ctx.lineTo(x2 - Math.cos(ang + 0.42) * p, y2 - Math.sin(ang + 0.42) * p);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        
          function retangulo(ctx, x1, y1, x2, y2, cor, esp) {
            ctx.save();
            ctx.strokeStyle = cor;
            ctx.lineWidth = esp;
            ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
            ctx.restore();
          }
        
          function circulo(ctx, x1, y1, x2, y2, cor, esp) {
            ctx.save();
            ctx.strokeStyle = cor;
            ctx.lineWidth = esp;
            ctx.beginPath();
            ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        
          function tarja(ctx, x1, y1, x2, y2, cor) {
            ctx.save();
            ctx.fillStyle = cor;
            ctx.globalAlpha = 0.55;
            ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
            ctx.restore();
          }
        
          function moldura(ctx, x1, y1, x2, y2) {
            ctx.save();
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = Math.max(2, Math.max(ctx.canvas.width, ctx.canvas.height) / 300);
            ctx.setLineDash([ctx.lineWidth * 3, ctx.lineWidth * 3]);
            ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
            ctx.restore();
          }
        
          function escrever(ctx, txt, x, y, cor, tam) {
            ctx.save();
            ctx.font = '700 ' + Math.round(tam) + 'px system-ui, Arial, sans-serif';
            ctx.textBaseline = 'top';
            ctx.lineJoin = 'round';
            ctx.lineWidth = Math.max(2, tam / 8);
            ctx.strokeStyle = 'rgba(0,0,0,.85)';
            ctx.fillStyle = cor;
            String(txt).split(/\r?\n/).forEach(function (l, i) {
              var yy = y + i * tam * 1.16;
              ctx.strokeText(l, x, yy);
              ctx.fillText(l, x, yy);
            });
            ctx.restore();
          }
        
          /* ---------------------------------------------------------------- *
           * ponteiro (dedo ou mouse) em cima da imagem
           * ---------------------------------------------------------------- */
          function ligarPonteiro() {
            var ov = editor.ov;
        
            function ponto(ev) {
              var r = ov.getBoundingClientRect();
              var x = (ev.clientX - r.left) * (ov.width / (r.width || 1));
              var y = (ev.clientY - r.top) * (ov.height / (r.height || 1));
              return { x: Math.max(0, Math.min(ov.width, x)), y: Math.max(0, Math.min(ov.height, y)) };
            }
        
            ov.addEventListener('pointerdown', function (ev) {
              if (!editor) { return; }
              if (editor.base) { aviso('Termine o ajuste de brilho antes de marcar.', 'erro'); return; }
              ev.preventDefault();
              var p = ponto(ev);
        
              if (editor.fer === 'texto') {
                var t = prompt('Escreva o texto que vai aparecer na foto:', '');
                if (t == null || !String(t).replace(/\s/g, '')) { return; }
                guardarPasso();
                escrever(editor.ctx, t, p.x, p.y, pegarCor(), pegarLetra());
                return;
              }
        
              editor.arrasta = { x: p.x, y: p.y, x2: p.x, y2: p.y };
              try { ov.setPointerCapture(ev.pointerId); } catch (e) {}
        
              if (editor.fer === 'pincel') {
                guardarPasso();
                editor.ctx.save();
                editor.ctx.strokeStyle = pegarCor();
                editor.ctx.lineWidth = pegarEsp();
                editor.ctx.lineCap = 'round';
                editor.ctx.lineJoin = 'round';
                editor.ctx.beginPath();
                editor.ctx.moveTo(p.x, p.y);
              }
            });
        
            ov.addEventListener('pointermove', function (ev) {
              if (!editor || !editor.arrasta) { return; }
              ev.preventDefault();
              var p = ponto(ev);
              var a = editor.arrasta;
        
              /* PATCH_RECORTE_PROPORCIONAL_OK: com formato travado, o retangulo
                 de recorte cresce mantendo a razao largura/altura escolhida,
                 em vez de seguir o ponteiro livremente. */
              if (editor.fer === 'recorte' && editor.recorteRazao) {
                var razao = editor.recorteRazao;
                var sx = (p.x < a.x) ? -1 : 1;
                var sy = (p.y < a.y) ? -1 : 1;
                var w = Math.max(Math.abs(p.x - a.x), Math.abs(p.y - a.y) * razao);
                var h = w / razao;
                /* nao deixa o recorte passar da borda da imagem */
                if (a.x + sx * w > editor.cv.width) { w = (sx > 0 ? editor.cv.width - a.x : a.x); h = w / razao; }
                if (a.x + sx * w < 0) { w = a.x; h = w / razao; }
                if (a.y + sy * h > editor.cv.height) { h = (sy > 0 ? editor.cv.height - a.y : a.y); w = h * razao; }
                if (a.y + sy * h < 0) { h = a.y; w = h * razao; }
                p = { x: a.x + sx * w, y: a.y + sy * h };
              }
        
              a.x2 = p.x;
              a.y2 = p.y;
        
              if (editor.fer === 'pincel') {
                editor.ctx.lineTo(p.x, p.y);
                editor.ctx.stroke();
                return;
              }
              limparOverlay();
              if (editor.fer === 'seta') { seta(editor.octx, a.x, a.y, p.x, p.y, pegarCor(), pegarEsp()); }
              else if (editor.fer === 'retangulo') { retangulo(editor.octx, a.x, a.y, p.x, p.y, pegarCor(), pegarEsp()); }
              else if (editor.fer === 'circulo') { circulo(editor.octx, a.x, a.y, p.x, p.y, pegarCor(), pegarEsp()); }
              else if (editor.fer === 'tarja') { tarja(editor.octx, a.x, a.y, p.x, p.y, pegarCor()); }
              else if (editor.fer === 'recorte') { moldura(editor.octx, a.x, a.y, p.x, p.y); }
            });
        
            function fim(ev) {
              if (!editor || !editor.arrasta) { return; }
              var a = editor.arrasta;
              editor.arrasta = null;
        
              if (editor.fer === 'pincel') {
                try { editor.ctx.restore(); } catch (e) {}
                return;
              }
              if (editor.fer === 'recorte') {
                var l = Math.abs(a.x2 - a.x), h = Math.abs(a.y2 - a.y);
                if (l < 12 || h < 12) { limparOverlay(); editor.recorte = null; return; }
                editor.recorte = { x: Math.min(a.x, a.x2), y: Math.min(a.y, a.y2), l: l, h: h };
                dica('Area escolhida. Agora clique em "Aplicar recorte".');
                return;
              }
              limparOverlay();
              if (Math.abs(a.x2 - a.x) < 3 && Math.abs(a.y2 - a.y) < 3) { return; }
              guardarPasso();
              if (editor.fer === 'seta') { seta(editor.ctx, a.x, a.y, a.x2, a.y2, pegarCor(), pegarEsp()); }
              else if (editor.fer === 'retangulo') { retangulo(editor.ctx, a.x, a.y, a.x2, a.y2, pegarCor(), pegarEsp()); }
              else if (editor.fer === 'circulo') { circulo(editor.ctx, a.x, a.y, a.x2, a.y2, pegarCor(), pegarEsp()); }
              else if (editor.fer === 'tarja') { tarja(editor.ctx, a.x, a.y, a.x2, a.y2, pegarCor()); }
            }
        
            ov.addEventListener('pointerup', fim);
            ov.addEventListener('pointercancel', fim);
            ov.addEventListener('pointerleave', function () { if (editor && editor.arrasta) { fim(); } });
          }
        
          /* ---------------------------------------------------------------- *
           * acoes da imagem
           * ---------------------------------------------------------------- */
          function aplicarRecorte() {
            if (!editor.recorte) { aviso('Primeiro escolha a ferramenta "Recortar" e arraste em cima da foto.', 'erro'); return; }
            var r = editor.recorte;
            var c2 = document.createElement('canvas');
            c2.width = Math.round(r.l);
            c2.height = Math.round(r.h);
            c2.getContext('2d').drawImage(editor.cv, Math.round(r.x), Math.round(r.y), c2.width, c2.height, 0, 0, c2.width, c2.height);
            guardarPasso();
            editor.cv.width = c2.width;
            editor.cv.height = c2.height;
            editor.ov.width = c2.width;
            editor.ov.height = c2.height;
            editor.ctx.drawImage(c2, 0, 0);
            limparOverlay();
            editor.recorte = null;
            dica('Foto recortada. Continue marcando ou salve.');
          }
        
          function girar(lado) {
            var l = editor.cv.width, a = editor.cv.height;
            var c2 = document.createElement('canvas');
            c2.width = a;
            c2.height = l;
            var x = c2.getContext('2d');
            x.translate(a / 2, l / 2);
            x.rotate((lado > 0 ? 90 : -90) * Math.PI / 180);
            x.drawImage(editor.cv, -l / 2, -a / 2);
            guardarPasso();
            editor.cv.width = a;
            editor.cv.height = l;
            editor.ov.width = a;
            editor.ov.height = l;
            editor.ctx.drawImage(c2, 0, 0);
            limparOverlay();
          }
        
          function painelLuz(abrir) {
            var p = document.getElementById('p95Luz');
            if (!p) { return; }
            if (abrir) {
              try { editor.base = editor.cv.toDataURL('image/png'); } catch (e) { editor.base = null; }
              p.style.display = 'flex';
              dica('Mexa nas barras e clique em "Aplicar ajuste" para confirmar.');
            } else {
              p.style.display = 'none';
              editor.base = null;
              dica('Arraste em cima da foto para marcar. Cada marca pode ser desfeita.');
            }
            ['p95Bri', 'p95Con', 'p95Sat'].forEach(function (id) {
              var e = document.getElementById(id);
              if (e) { e.value = 100; }
            });
          }
        
          function verLuz() {
            if (!editor || !editor.base) { return; }
            var b = Number((document.getElementById('p95Bri') || {}).value || 100);
            var c = Number((document.getElementById('p95Con') || {}).value || 100);
            var s = Number((document.getElementById('p95Sat') || {}).value || 100);
            carregarImagem(editor.base, function (im) {
              editor.ctx.save();
              try {
                editor.ctx.filter = 'brightness(' + b + '%) contrast(' + c + '%) saturate(' + s + '%)';
              } catch (e) {}
              editor.ctx.clearRect(0, 0, editor.cv.width, editor.cv.height);
              editor.ctx.drawImage(im, 0, 0, editor.cv.width, editor.cv.height);
              editor.ctx.restore();
            });
          }
        
          function desfazer() {
            if (!editor.hist.length) { aviso('Nao tem mais nada para desfazer.', 'erro'); return; }
            var u = editor.hist.pop();
            porImagem(u);
          }
        
          /* ================================================================ *
           * escolher fotos do relatorio (para juntar antes x depois)
           * ================================================================ */
          var escolha = null;
        
          function pintarEscolha() {
            var cx = document.getElementById('p95Cx');
            if (!cx || !escolha) { return; }
            var lst = cx.querySelectorAll('.p95-ficha'), i, k, n, d;
            for (i = 0; i < lst.length; i++) {
              k = escolha.sel.indexOf(lst[i].getAttribute('data-k'));
              lst[i].className = 'p95-ficha' + (k >= 0 ? ' sel' : '');
              n = lst[i].querySelector('.p95-num');
              if (n) { lst[i].removeChild(n); }
              if (k >= 0) {
                d = document.createElement('div');
                d.className = 'p95-num';
                d.textContent = String(k + 1);
                lst[i].appendChild(d);
              }
            }
          }
        
          function escolherDuas(reg, alvo) {
            estilo();
            var fotos = todasFotos(reg);
            if (fotos.length < 2) { aviso('Coloque pelo menos duas fotos no relatorio antes de montar a comparacao.', 'erro'); return; }
            var cx = caixa();
            escolha = { fotos: fotos, sel: [], alvo: alvo };
        
            cx.innerHTML =
              '<header><h4>Montar comparacao (antes x depois)</h4>' +
                '<button class="p95-bt" type="button" data-p95="sair">Fechar</button></header>' +
              '<div class="p95-barra">' +
                '<span class="p95-rot">Titulo da esquerda</span><input class="p95-in" id="p95RotE" value="ANTES">' +
                '<span class="p95-rot">Titulo da direita</span><input class="p95-in" id="p95RotD" value="DEPOIS">' +
              '</div>' +
              '<div class="p95-dica">Clique em duas fotos: a primeira vai para a esquerda, a segunda para a direita.</div>' +
              '<div class="p95-grade">' +
                fotos.map(function (f, i) {
                  return '<div class="p95-ficha" data-p95="pick" data-k="' + i + '">' +
                    '<img src="' + esc(f.url) + '" alt="foto">' +
                    '<span>' + esc(f.onde) + (f.leg ? ' &middot; ' + esc(f.leg) : '') + '</span></div>';
                }).join('') +
              '</div>' +
              '<div class="p95-pe">' +
                '<span class="p95-esp"></span>' +
                '<button class="p95-bt p95-bt-ok" type="button" data-p95="montar">Montar imagem</button>' +
                '<button class="p95-bt p95-bt-no" type="button" data-p95="sair">Cancelar</button>' +
              '</div>';
          }
        
          function montarComparacao(fE, fD, rotE, rotD, alvo) {
            carregarImagem(fE.url, function (imE) {
              carregarImagem(fD.url, function (imD) {
                var L = 1600, A = 900;
                var cv = document.createElement('canvas');
                cv.width = L;
                cv.height = A;
                var x = cv.getContext('2d');
                x.fillStyle = '#000000';
                x.fillRect(0, 0, L, A);
                var faixa = 96, folga = 10;
                dentroDaCaixa(x, imE, folga, faixa, L / 2 - folga * 1.5, A - faixa - folga);
                dentroDaCaixa(x, imD, L / 2 + folga / 2, faixa, L / 2 - folga * 1.5, A - faixa - folga);
                x.fillStyle = '#ffffff';
                x.fillRect(L / 2 - 2, faixa, 4, A - faixa - folga);
                x.textAlign = 'center';
                x.font = '700 54px system-ui, Arial, sans-serif';
                x.textBaseline = 'middle';
                x.fillStyle = '#ffff00';
                x.fillText(String(rotE || 'ANTES').toUpperCase(), L / 4, faixa / 2);
                x.fillStyle = '#92d050';
                x.fillText(String(rotD || 'DEPOIS').toUpperCase(), (L * 3) / 4, faixa / 2);
                abrirEditor({
                  titulo: 'Comparacao antes x depois',
                  canvas: cv,
                  leg: (rotE || 'ANTES') + ' x ' + (rotD || 'DEPOIS'),
                  alvo: alvo,
                  rotSalvar: 'Adicionar ao relatorio',
                  aoSalvar: function (url, leg) { adicionarFoto(alvo, url, leg, 'Comparacao adicionada ao relatorio.'); }
                });
              }, function () { aviso('Nao consegui abrir a segunda foto.', 'erro'); });
            }, function () { aviso('Nao consegui abrir a primeira foto.', 'erro'); });
          }
        
          /* ================================================================ *
           * criar imagem nova (folha em branco, aviso, placa de obra)
           * ================================================================ */
          var alvoNovo = '';
        
          function telaCriar(alvo) {
            estilo();
            alvoNovo = String(alvo || '');
            var cx = caixa();
            cx.innerHTML =
              '<header><h4>Criar imagem nova</h4>' +
                '<button class="p95-bt" type="button" data-p95="sair">Fechar</button></header>' +
              '<div class="p95-dica">Escolha o tipo de imagem. Depois voce escreve e desenha em cima dela.</div>' +
              '<div class="p95-barra">' +
                '<b>Modelo</b>' +
                '<button class="p95-bt" type="button" data-p95="novo" data-m="preta">Folha preta (padrao dos slides)</button>' +
                '<button class="p95-bt" type="button" data-p95="novo" data-m="branca">Folha branca</button>' +
                '<button class="p95-bt" type="button" data-p95="novo" data-m="aviso">Aviso em destaque</button>' +
                '<button class="p95-bt" type="button" data-p95="novo" data-m="comparar">Comparacao antes x depois</button>' +
                '<button class="p95-bt" type="button" data-p95="novo" data-m="arquivo">A partir de uma imagem do computador</button>' +
              '</div>' +
              '<div class="p95-pe"><span class="p95-esp"></span>' +
                '<button class="p95-bt p95-bt-no" type="button" data-p95="sair">Cancelar</button></div>';
          }
        
          function usarModelo(m) {
            var alvo = alvoNovo;
            if (m === 'comparar') {
              obterDados(function (reg) { escolherDuas(reg, alvo); });
              return;
            }
            if (m === 'arquivo') {
              pegarDoComputador(function (url) {
                abrirEditor({
                  titulo: 'Imagem nova',
                  url: url,
                  alvo: alvo,
                  rotSalvar: 'Adicionar ao relatorio',
                  aoSalvar: function (u, leg) { adicionarFoto(alvo, u, leg, 'Imagem adicionada ao relatorio.'); }
                });
              });
              return;
            }
            folhaNova(m, alvo);
          }
        
          function folhaNova(modelo, alvo) {
            var cv = document.createElement('canvas');
            cv.width = 1600;
            cv.height = 900;
            var x = cv.getContext('2d');
            if (modelo === 'branca') {
              x.fillStyle = '#ffffff';
              x.fillRect(0, 0, 1600, 900);
              x.fillStyle = '#0f172a';
              x.font = '700 40px system-ui, Arial, sans-serif';
              x.textAlign = 'center';
              x.fillText('Clique com a ferramenta Texto para escrever', 800, 460);
            } else if (modelo === 'aviso') {
              x.fillStyle = '#000000';
              x.fillRect(0, 0, 1600, 900);
              x.fillStyle = '#ff0000';
              x.fillRect(0, 300, 1600, 300);
              x.fillStyle = '#ffffff';
              x.textAlign = 'center';
              x.font = '700 96px system-ui, Arial, sans-serif';
              x.fillText('ATENCAO', 800, 480);
              x.font = '700 34px system-ui, Arial, sans-serif';
              x.fillText('troque este texto com a ferramenta Texto', 800, 660);
            } else {
              x.fillStyle = '#000000';
              x.fillRect(0, 0, 1600, 900);
              x.fillStyle = '#ffff00';
              x.textAlign = 'center';
              x.font = '700 64px system-ui, Arial, sans-serif';
              x.fillText('TITULO DA IMAGEM', 800, 420);
              x.fillStyle = '#ffffff';
              x.font = '700 32px system-ui, Arial, sans-serif';
              x.fillText('escreva aqui a explicacao', 800, 520);
            }
            abrirEditor({
              titulo: 'Imagem nova',
              canvas: cv,
              alvo: alvo,
              rotSalvar: 'Adicionar ao relatorio',
              aoSalvar: function (u, leg) { adicionarFoto(alvo, u, leg, 'Imagem adicionada ao relatorio.'); }
            });
          }
        
          function pegarDoComputador(depois) {
            var inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = 'image/*';
            inp.style.display = 'none';
            document.body.appendChild(inp);
            inp.addEventListener('change', function () {
              var arq = inp.files && inp.files[0];
              if (!arq) { try { document.body.removeChild(inp); } catch (e) {} return; }
              var fr = new FileReader();
              fr.onload = function () {
                try { document.body.removeChild(inp); } catch (e) {}
                depois(String(fr.result || ''));
              };
              fr.onerror = function () {
                try { document.body.removeChild(inp); } catch (e) {}
                aviso('Nao consegui ler o arquivo.', 'erro');
              };
              fr.readAsDataURL(arq);
            });
            inp.click();
          }
        
          /* ================================================================ *
           * gravar no relatorio
           * ================================================================ */
          function adicionarFoto(alvo, url, leg, msg) {
            fecharCaixa();
            atualizarReg(function (reg) {
              var g = grupoDe(reg, alvo);
              if (!g) { return false; }
              g.push({ id: novoId('f'), url: url, leg: String(leg || '') });
              return true;
            }, msg || 'Imagem adicionada.');
          }
        
          function trocarFoto(alvo, idFoto, url, leg) {
            fecharCaixa();
            atualizarReg(function (reg) {
              var g = grupoDe(reg, alvo);
              if (!g) { return false; }
              var f = achar(g, idFoto);
              if (!f) { return false; }
              f.url = url;
              f.leg = String(leg || '');
              return true;
            }, 'Foto editada e salva.');
          }
        
          function copiarFoto(alvo, idFoto, url, leg) {
            fecharCaixa();
            atualizarReg(function (reg) {
              var g = grupoDe(reg, alvo);
              if (!g) { return false; }
              var pos = -1, i;
              for (i = 0; i < g.length; i++) { if (g[i].id === idFoto) { pos = i; break; } }
              var nova = { id: novoId('f'), url: url, leg: String(leg || '') };
              if (pos < 0) { g.push(nova); } else { g.splice(pos + 1, 0, nova); }
              return true;
            }, 'Foto nova salva ao lado da original.');
          }
        
          /* ================================================================ *
           * abrir o editor para uma foto que ja esta no relatorio
           * ================================================================ */
          function editarFoto(alvo, idFoto, url, leg) {
            abrirEditor({
              titulo: 'Editar foto do relatorio',
              url: url,
              leg: leg || '',
              alvo: alvo,
              rotSalvar: 'Salvar nesta foto',
              aoSalvar: function (u, lg) { trocarFoto(alvo, idFoto, u, lg); },
              aoSalvarNova: function (u, lg) { copiarFoto(alvo, idFoto, u, lg); }
            });
          }
        
          /* ================================================================ *
           * cliques dentro do editor
           * ================================================================ */
          document.addEventListener('click', function (ev) {
            var t = ev.target;
            var b = t && t.closest ? t.closest('#p95Cx [data-p95]') : null;
            if (!b) { return; }
            var a = b.getAttribute('data-p95');
            ev.preventDefault();
            ev.stopPropagation();
        
            if (a === 'novo') { usarModelo(b.getAttribute('data-m')); return; }
            if (a === 'pick') {
              if (!escolha) { return; }
              var kk = b.getAttribute('data-k');
              var pp = escolha.sel.indexOf(kk);
              if (pp >= 0) { escolha.sel.splice(pp, 1); }
              else { escolha.sel.push(kk); if (escolha.sel.length > 2) { escolha.sel.shift(); } }
              pintarEscolha();
              return;
            }
            if (a === 'montar') {
              if (!escolha || escolha.sel.length !== 2) { aviso('Escolha exatamente duas fotos.', 'erro'); return; }
              var rE = (document.getElementById('p95RotE') || {}).value || '';
              var rD = (document.getElementById('p95RotD') || {}).value || '';
              montarComparacao(escolha.fotos[Number(escolha.sel[0])], escolha.fotos[Number(escolha.sel[1])], rE, rD, escolha.alvo);
              return;
            }
        
            if (a === 'sair') {
              if (editor && !confirm('Fechar sem salvar? As marcas feitas agora serao perdidas.')) { return; }
              fecharCaixa();
              return;
            }
            if (!editor) { return; }
        
            if (a === 'fer') {
              editor.fer = b.getAttribute('data-f') || 'pincel';
              editor.recorte = null;
              limparOverlay();
              var lst = document.querySelectorAll('#p95Cx [data-p95="fer"]'), i;
              for (i = 0; i < lst.length; i++) {
                lst[i].className = 'p95-bt' + (lst[i] === b ? ' on' : '');
              }
              if (editor.fer === 'recorte') { dica('Arraste para marcar o pedaco que fica e clique em "Aplicar recorte".'); }
              else if (editor.fer === 'texto') { dica('Clique na foto no lugar onde o texto deve comecar.'); }
              else if (editor.fer === 'tarja') { dica('Arraste para cobrir algo que nao deve aparecer.'); }
              else { dica('Arraste em cima da foto para marcar. Cada marca pode ser desfeita.'); }
              return;
            }
            if (a === 'cortar') { aplicarRecorte(); return; }
            if (a === 'girar') { girar(Number(b.getAttribute('data-d')) > 0 ? 1 : -1); return; }
            if (a === 'luz') { painelLuz(true); return; }
            if (a === 'luzOk') {
              guardarPasso();
              painelLuz(false);
              aviso('Ajuste aplicado.');
              return;
            }
            if (a === 'luzNao') {
              var vb = editor.base;
              painelLuz(false);
              if (vb) { porImagem(vb); }
              return;
            }
            if (a === 'desfazer') { desfazer(); return; }
            if (a === 'zerar') {
              if (!editor.original) { return; }
              if (!confirm('Voltar a imagem como ela estava no inicio?')) { return; }
              guardarPasso();
              porImagem(editor.original, function () { dica('Imagem voltou ao original.'); });
              return;
            }
            if (a === 'salvar' || a === 'salvarNova') {
              if (editor.base) { aviso('Confirme ou cancele o ajuste de brilho antes de salvar.', 'erro'); return; }
              var leg = (document.getElementById('p95Leg') || {}).value || '';
              var url = canvasParaUrl(editor.cv);
              var cfg = editor.cfg;
              if (a === 'salvarNova' && cfg.aoSalvarNova) { cfg.aoSalvarNova(url, leg); return; }
              if (cfg.aoSalvar) { cfg.aoSalvar(url, leg); }
              return;
            }
          }, true);
        
          /* barras de ajuste ao vivo */
          document.addEventListener('input', function (ev) {
            var id = ev.target && ev.target.id;
            if (id === 'p95Bri' || id === 'p95Con' || id === 'p95Sat') { verLuz(); }
          }, true);
        
          /* PATCH_RECORTE_PROPORCIONAL_OK: troca do formato de recorte */
          document.addEventListener('change', function (ev) {
            if (!ev.target || ev.target.id !== 'p95Prop' || !editor) { return; }
            var f = formatoPorId(ev.target.value);
            editor.recorteRazao = f.razao;
            editor.recorte = null;
            limparOverlay();
            dica(f.razao ? ('Formato "' + f.rotulo + '" travado. Arraste sobre a foto para recortar.')
                         : 'Recorte livre: arraste sobre a foto do jeito que quiser.');
          }, true);
        
          /* ================================================================ *
           * botoes novos dentro da janela do Relatorio FPDO
           * ================================================================ */
          function colocarBotoes() {
            var raiz = document.getElementById('p92Fundo');
            if (!raiz || raiz.style.display === 'none') { return; }
        
            /* um botao "Editar" em cada foto */
            var figs = raiz.querySelectorAll('figure.p92-foto');
            var i;
            for (i = 0; i < figs.length; i++) {
              (function (fig) {
                var fx = fig.querySelector('.p92-fx');
                var img = fig.querySelector('img[data-alvo]');
                if (!fx || !img || fx.querySelector('[data-p95b="editar"]')) { return; }
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'p92-btn p92-btn-mini';
                b.textContent = 'Editar';
                b.title = 'Recortar, girar, clarear e marcar esta foto com seta, texto ou circulo';
                b.setAttribute('data-p95b', 'editar');
                b.setAttribute('data-alvo', img.getAttribute('data-alvo') || '');
                b.setAttribute('data-i', img.getAttribute('data-i') || '');
                fx.insertBefore(b, fx.firstChild);
              })(figs[i]);
            }
        
            /* botoes de criar imagem no topo de cada grupo de fotos */
            var tops = raiz.querySelectorAll('.p92-fotos-top');
            for (i = 0; i < tops.length; i++) {
              (function (top) {
                var caixaBt = top.querySelector('span');
                var ref = top.querySelector('[data-a="galeria"]');
                if (!caixaBt || !ref || caixaBt.querySelector('[data-p95b="criar"]')) { return; }
                var alvo = ref.getAttribute('data-alvo') || '';
                var b1 = document.createElement('button');
                b1.type = 'button';
                b1.className = 'p92-btn p92-btn-mini';
                b1.textContent = 'Criar imagem';
                b1.title = 'Cria uma imagem nova (folha de aviso, comparacao antes x depois, etc.)';
                b1.setAttribute('data-p95b', 'criar');
                b1.setAttribute('data-alvo', alvo);
                caixaBt.appendChild(document.createTextNode(' '));
                caixaBt.appendChild(b1);
                var b2 = document.createElement('button');
                b2.type = 'button';
                b2.className = 'p92-btn p92-btn-mini';
                b2.textContent = 'Antes x depois';
                b2.title = 'Junta duas fotos do relatorio em uma imagem so, lado a lado';
                b2.setAttribute('data-p95b', 'comparar');
                b2.setAttribute('data-alvo', alvo);
                caixaBt.appendChild(document.createTextNode(' '));
                caixaBt.appendChild(b2);
              })(tops[i]);
            }
          }
        
          document.addEventListener('click', function (ev) {
            var t = ev.target;
            var b = t && t.closest ? t.closest('[data-p95b]') : null;
            if (!b) { return; }
            ev.preventDefault();
            ev.stopPropagation();
            var a = b.getAttribute('data-p95b');
            var alvo = b.getAttribute('data-alvo') || '';
            if (a === 'criar') { telaCriar(alvo); return; }
            if (a === 'comparar') { obterDados(function (reg) { escolherDuas(reg, alvo); }); return; }
            if (a === 'editar') {
              var fig = b.closest('figure.p92-foto');
              var img = fig ? fig.querySelector('img[data-alvo]') : null;
              var leg = fig ? fig.querySelector('input.p92-leg') : null;
              if (!img) { aviso('Nao achei a foto.', 'erro'); return; }
              editarFoto(alvo, b.getAttribute('data-i') || '', img.getAttribute('src') || '', leg ? leg.value : '');
              return;
            }
          }, true);
        
          function iniciar() {
            estilo();
            colocarBotoes();
            window.__varreduraUnica(colocarBotoes);
          }
        
          window.p95CriarImagem = function (alvo) { telaCriar(alvo || 'capa'); };
          /* Ponte pública para Diário e Boletim reutilizarem o mesmo editor. */
          window.p95EditarImagem = function (cfg) { abrirEditor(cfg || {}); };
          window.p95FecharEditor = function () { fecharCaixa(); };
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        })();
    
