
        /* ====== PATCH92_FPDO_OK - Relatorio FPDO (Fique por dentro da obra) ====== */
        (function () {
          'use strict';
          if (window.__PS92) { return; }
          window.__PS92 = true;
        
          var BASE = 'p92_fpdo_v1';
          var LOJA = 'reg';
          var K_LS = 'p92_fpdo_ls_v1';
          var K_ULT = 'p92_fpdo_ultimo_v1';
        
          var atual = null;
          var lista = [];
          var sec = 'dados';
          var timerSalvar = null;
        
          var FACHADAS = ['Leste', 'Sul', 'Oeste', 'Norte'];
          var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
                       'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
          var ELEV_PADRAO = ['ELEVAÇÃO SUL', 'ELEVAÇÃO LESTE', 'ELEVAÇÃO NORTE',
                             'ELEVAÇÃO OESTE', 'COBERTURA'];
          var ITENS_PADRAO = ['PORTAS INSTALADAS', 'GUARDA-CORPOS INSTALADOS', 'MUXARABÊS', 'RIPADOS'];
        
          /* A4 com margem de 12mm (mesmo desenho do gerador de PDF do painel) */
          var LARG_MM = 186;
          var ALT_MM = 273;
          var MARG_MM = 12;
          var LARG_PX = 703;
          var ALT_PX = Math.floor(LARG_PX * (ALT_MM / LARG_MM));
        
          var FONTES_CANVAS = [
            'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
            'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
          ];
          var FONTES_PDF = [
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
            'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
            'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
          ];
        
          /* ================================================================ *
           * utilidades
           * ================================================================ */
          function esc(s) {
            return String(s == null ? '' : s)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          }
        
          function novoId(p) {
            return String(p || 'x') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
          }
        
          function num(v) {
            var n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
            return isNaN(n) ? 0 : n;
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
        
          function mesAtual() {
            var d = new Date();
            return MESES[d.getMonth()] + ' ' + d.getFullYear();
          }
        
          function mesAnterior() {
            var d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - 1);
            return MESES[d.getMonth()] + ' ' + d.getFullYear();
          }
        
          function aviso(msg, tipo) {
            try {
              if (typeof window.mostrarToastPainel === 'function') {
                window.mostrarToastPainel(msg, tipo || 'ok');
                return;
              }
            } catch (e) {}
            var d = document.getElementById('p92Aviso');
            if (!d) {
              d = document.createElement('div');
              d.id = 'p92Aviso';
              document.body.appendChild(d);
            }
            d.textContent = String(msg || '');
            d.className = 'p92-aviso ' + (tipo === 'erro' ? 'p92-erro' : 'p92-ok');
            d.style.display = 'block';
            clearTimeout(d.__t);
            d.__t = setTimeout(function () { d.style.display = 'none'; }, 3800);
          }
        
          function espera(ms, fn) { setTimeout(fn, ms); }
        
          function obraAtual() {
            try {
              if (typeof window.getObraAtual === 'function') { return window.getObraAtual(); }
            } catch (e) {}
            return null;
          }
        
          function limpaNome(s) {
            s = String(s || '').replace(/[^0-9A-Za-z\u00C0-\u017F _.-]+/g, '');
            s = s.replace(/\s+/g, '_').replace(/_+/g, '_');
            return s.substring(0, 70) || 'relatorio_fpdo';
          }
        
          /* ================================================================ *
           * onde os relatorios ficam guardados
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
              var arr = lsLer(), achou = false, i;
              for (i = 0; i < arr.length; i++) { if (arr[i].id === reg.id) { arr[i] = reg; achou = true; break; } }
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
           * modelo do relatorio
           * ================================================================ */
          function elevNova(nome, mesAntes, mesDepois) {
            return {
              id: novoId('el'),
              nome: String(nome || 'ELEVAÇÃO'),
              rotAntes: String(mesAntes || 'MÊnterior'),
              rotDepois: String(mesDepois || 'MÊs atual'),
              fotosAntes: [],
              fotosDepois: [],
              obs: ''
            };
          }
        
          function itemNovo(titulo) {
            var o = { id: novoId('it'), titulo: String(titulo || 'ITEM INSTALADO'), obs: '', fotos: [], porFachada: {} };
            FACHADAS.forEach(function (f) { o.porFachada[f] = { qtd: '', total: '' }; });
            return o;
          }
        
          function pendNova(pav, desc) {
            return {
              id: novoId('pd'),
              pavimento: String(pav || 'ANDAR'),
              desc: String(desc || ''),
              responsavel: '',
              prazo: '',
              resolvido: false,
              fotos: []
            };
          }
        
          function fpdoNovo(base) {
            var o = obraAtual() || {};
            var d = {
              id: novoId('fpdo'),
              criado: new Date().toISOString(),
              titulo: 'FIQUE POR DENTRO DA OBRA',
              obra: o.nome || '',
              mes: mesAtual(),
              cliente: o.cliente || '',
              local: o.local || o.cidade || '',
              responsavel: '',
              gestor: '',
              dataRelatorio: hoje(),
              capaFotos: [],
              elevacoes: ELEV_PADRAO.map(function (n) { return elevNova(n, mesAnterior(), mesAtual()); }),
              itens: ITENS_PADRAO.map(function (t) { return itemNovo(t); }),
              pendencias: [
                pendNova('ANDAR TÉRREO', 'FALTA LIBERAR RIPADO / PORTAS'),
                pendNova('ANDAR COBERTURA', 'LIBERAR PORTAS E GUARDA-CORPOS')
              ],
              mostrarGraficos: true,
              atividadesPortico: '',
              atividadesCliente: '',
              proximasPortico: '',
              proximasCliente: '',
              encerramento: 'PÓRTICO ESQUADRIAS',
              fotosFinal: [],
              codigoObra: '',
              contrato: '',
              periodoInicio: '',
              periodoFim: '',
              cidadeUf: '',
              fiscalCliente: '',
              equipeResponsavel: '',
              statusObra: '',
              percentualPrevisto: '',
              percentualRealizado: '',
              previsaoConclusao: '',
              destaquesMes: '',
              riscos: '',
              decisoes: '',
              proximosMarcos: '',
              observacoesGerais: '',
              slidesCustomizados: []
            };
            if (base) {
              d.titulo = base.titulo;
              d.obra = base.obra;
              d.cliente = base.cliente;
              d.local = base.local;
              d.responsavel = base.responsavel;
              d.gestor = base.gestor;
              d.encerramento = base.encerramento;
              d.mostrarGraficos = base.mostrarGraficos;
              d.mes = mesAtual();
              d.elevacoes = (base.elevacoes || []).map(function (e) {
                return {
                  id: novoId('el'), nome: e.nome,
                  rotAntes: e.rotDepois || mesAnterior(),
                  rotDepois: mesAtual(),
                  fotosAntes: (e.fotosDepois || []).map(function (f) {
                    return { id: novoId('f'), url: f.url, leg: f.leg };
                  }),
                  fotosDepois: [],
                  obs: ''
                };
              });
              if (!d.elevacoes.length) { d.elevacoes = ELEV_PADRAO.map(function (n) { return elevNova(n, mesAnterior(), mesAtual()); }); }
              d.itens = (base.itens || []).map(function (it) {
                var novo = itemNovo(it.titulo);
                FACHADAS.forEach(function (f) {
                  var v = (it.porFachada && it.porFachada[f]) || {};
                  novo.porFachada[f] = { qtd: v.qtd || '', total: v.total || '' };
                });
                return novo;
              });
              if (!d.itens.length) { d.itens = ITENS_PADRAO.map(function (t) { return itemNovo(t); }); }
              d.pendencias = (base.pendencias || []).filter(function (p) { return !p.resolvido; }).map(function (p) {
                return pendNova(p.pavimento, p.desc);
              });
              if (!d.pendencias.length) { d.pendencias = [pendNova('ANDAR TÉRREO', '')]; }
            }
            return d;
          }
        
          function arrumar(d) {
            d.capaFotos = d.capaFotos || [];
            d.fotosFinal = d.fotosFinal || [];
            d.elevacoes = d.elevacoes || [];
            d.itens = d.itens || [];
            d.pendencias = d.pendencias || [];
            d.slidesCustomizados = d.slidesCustomizados || [];
            d.codigoObra = d.codigoObra || '';
            d.contrato = d.contrato || '';
            d.periodoInicio = d.periodoInicio || '';
            d.periodoFim = d.periodoFim || '';
            d.cidadeUf = d.cidadeUf || '';
            d.fiscalCliente = d.fiscalCliente || '';
            d.equipeResponsavel = d.equipeResponsavel || '';
            d.statusObra = d.statusObra || '';
            d.percentualPrevisto = d.percentualPrevisto || '';
            d.percentualRealizado = d.percentualRealizado || '';
            d.previsaoConclusao = d.previsaoConclusao || '';
            d.destaquesMes = d.destaquesMes || '';
            d.riscos = d.riscos || '';
            d.decisoes = d.decisoes || '';
            d.proximosMarcos = d.proximosMarcos || '';
            d.observacoesGerais = d.observacoesGerais || '';
            d.slidesCustomizados.forEach(function (s) {
              s.id = s.id || novoId('slide');
              s.titulo = s.titulo || '';
              s.texto = s.texto || '';
              s.imagemUrl = s.imagemUrl || '';
              s.cor = s.cor || '0F172A';
              s.layout = s.layout || 'imagem-direita';
              s.imageL = isFinite(Number(s.imageL)) ? Number(s.imageL) : 64;
              s.imageT = isFinite(Number(s.imageT)) ? Number(s.imageT) : 24;
              s.imageW = isFinite(Number(s.imageW)) ? Number(s.imageW) : 31;
              s.imageH = isFinite(Number(s.imageH)) ? Number(s.imageH) : 58;
            });
            d.elevacoes.forEach(function (e) {
              e.fotosAntes = e.fotosAntes || [];
              e.fotosDepois = e.fotosDepois || [];
            });
            d.itens.forEach(function (it) {
              it.fotos = it.fotos || [];
              it.porFachada = it.porFachada || {};
              FACHADAS.forEach(function (f) {
                if (!it.porFachada[f]) { it.porFachada[f] = { qtd: '', total: '' }; }
              });
            });
            d.pendencias.forEach(function (p) { p.fotos = p.fotos || []; });
            return d;
          }
        
          /* ================================================================ *
           * fotos: escolher do aparelho ou fotografar na obra
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
        
          function abrirCamera(depois) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
              aviso('Este aparelho nao liberou a camera. Use "Escolher imagens".', 'erro');
              return;
            }
            var cx = document.createElement('div');
            cx.className = 'p92-cam';
            cx.innerHTML =
              '<div class="p92-cam-cx">' +
                '<video autoplay playsinline muted></video>' +
                '<div class="p92-cam-pe">' +
                  '<button class="p92-btn p92-btn-ok" type="button" data-c="tirar">Tirar foto</button>' +
                  '<button class="p92-btn" type="button" data-c="virar">Virar camera</button>' +
                  '<button class="p92-btn p92-btn-no" type="button" data-c="sair">Fechar</button>' +
                '</div>' +
                '<div class="p92-cam-nota">As fotos entram direto no relatorio.</div>' +
              '</div>';
            document.body.appendChild(cx);
        
            var video = cx.querySelector('video');
            var fluxo = null;
            var frente = false;
        
            function parar() {
              try { if (fluxo) { fluxo.getTracks().forEach(function (t) { t.stop(); }); } } catch (e) {}
              fluxo = null;
            }
        
            function ligar() {
              parar();
              navigator.mediaDevices.getUserMedia({
                video: { facingMode: frente ? 'user' : { ideal: 'environment' } },
                audio: false
              }).then(function (f) {
                fluxo = f;
                video.srcObject = f;
              })['catch'](function () {
                aviso('Nao consegui abrir a camera.', 'erro');
                fechar();
              });
            }
        
            function fechar() {
              parar();
              try { document.body.removeChild(cx); } catch (e) {}
            }
        
            cx.addEventListener('click', function (ev) {
              var b = ev.target.closest ? ev.target.closest('button[data-c]') : null;
              if (!b) { if (ev.target === cx) { fechar(); } return; }
              var c = b.getAttribute('data-c');
              if (c === 'sair') { fechar(); return; }
              if (c === 'virar') { frente = !frente; ligar(); return; }
              if (c === 'tirar') {
                try {
                  var l = video.videoWidth || 1280, a = video.videoHeight || 720;
                  var cv = document.createElement('canvas');
                  cv.width = l; cv.height = a;
                  cv.getContext('2d').drawImage(video, 0, 0, l, a);
                  comprimir(cv.toDataURL('image/jpeg', 0.9), function (u) {
                    depois([{ id: novoId('f'), url: u, leg: '' }]);
                    aviso('Foto adicionada.');
                  });
                } catch (e) { aviso('Nao consegui tirar a foto.', 'erro'); }
              }
            });
        
            ligar();
          }
        
          /* ================================================================ *
           * onde cada grupo de fotos vive
           * ================================================================ */
          function achar(arr, id) {
            var i;
            for (i = 0; i < (arr || []).length; i++) { if (arr[i].id === id) { return arr[i]; } }
            return null;
          }
        
          function grupoFotos(alvo) {
            if (!atual) { return null; }
            var p = String(alvo || '').split(':');
            if (p[0] === 'capa') { return atual.capaFotos; }
            if (p[0] === 'fim') { return atual.fotosFinal; }
            if (p[0] === 'elev') {
              var e = achar(atual.elevacoes, p[1]);
              if (!e) { return null; }
              return (p[2] === 'antes') ? e.fotosAntes : e.fotosDepois;
            }
            if (p[0] === 'inst') {
              var it = achar(atual.itens, p[1]);
              return it ? it.fotos : null;
            }
            if (p[0] === 'pend') {
              var pd = achar(atual.pendencias, p[1]);
              return pd ? pd.fotos : null;
            }
            return null;
          }
        
          function htmlFotos(alvo, fotos, rotulo) {
            var h = '<div class="p92-fotos-cx">' +
              '<div class="p92-fotos-top">' +
                '<b>' + esc(rotulo || 'Fotos') + ' (' + (fotos || []).length + ')</b>' +
                '<span>' +
                  '<button class="p92-btn p92-btn-mini" type="button" data-a="camera" data-alvo="' + esc(alvo) + '">Tirar foto agora</button> ' +
                  '<button class="p92-btn p92-btn-mini" type="button" data-a="galeria" data-alvo="' + esc(alvo) + '">Escolher imagens</button>' +
                '</span>' +
              '</div>';
            if (!(fotos || []).length) {
              h += '<div class="p92-vazio">Sem fotos ainda.</div>';
            } else {
              h += '<div class="p92-fotos">';
              fotos.forEach(function (f, i) {
                h += '<figure class="p92-foto">' +
                  '<img src="' + esc(f.url) + '" alt="foto" data-a="lupa" data-alvo="' + esc(alvo) + '" data-i="' + esc(f.id) + '">' +
                  '<input class="p92-leg" data-l="foto" data-alvo="' + esc(alvo) + '" data-i="' + esc(f.id) + '" value="' + esc(f.leg || '') + '" placeholder="Legenda da foto">' +
                  '<div class="p92-fx">' +
                    '<button class="p92-btn p92-btn-mini" type="button" data-a="fmover" data-d="-1" data-alvo="' + esc(alvo) + '" data-i="' + esc(f.id) + '"' + (i === 0 ? ' disabled' : '') + '>&#9664;</button>' +
                    '<button class="p92-btn p92-btn-mini" type="button" data-a="fmover" data-d="1" data-alvo="' + esc(alvo) + '" data-i="' + esc(f.id) + '"' + (i === fotos.length - 1 ? ' disabled' : '') + '>&#9654;</button>' +
                    '<button class="p92-btn p92-btn-mini p92-btn-no" type="button" data-a="fapagar" data-alvo="' + esc(alvo) + '" data-i="' + esc(f.id) + '">Excluir</button>' +
                  '</div>' +
                '</figure>';
              });
              h += '</div>';
            }
            h += '</div>';
            return h;
          }
        
          /* ================================================================ *
           * numeros e graficos
           * ================================================================ */
          function contas(d) {
            var porItem = [], porFachada = {}, instTotal = 0, prevTotal = 0;
            FACHADAS.forEach(function (f) { porFachada[f] = { qtd: 0, total: 0 }; });
            (d.itens || []).forEach(function (it) {
              var q = 0, t = 0;
              FACHADAS.forEach(function (f) {
                var v = it.porFachada[f] || {};
                q += num(v.qtd);
                t += num(v.total);
                porFachada[f].qtd += num(v.qtd);
                porFachada[f].total += num(v.total);
              });
              porItem.push({ titulo: it.titulo, qtd: q, total: t });
              instTotal += q;
              prevTotal += t;
            });
            var pav = {};
            (d.pendencias || []).forEach(function (p) {
              var k = p.pavimento || 'Sem pavimento';
              if (!pav[k]) { pav[k] = { abertas: 0, feitas: 0 }; }
              if (p.resolvido) { pav[k].feitas++; } else { pav[k].abertas++; }
            });
            return {
              porItem: porItem,
              porFachada: porFachada,
              instTotal: instTotal,
              prevTotal: prevTotal,
              pct: prevTotal > 0 ? (instTotal / prevTotal) * 100 : 0,
              pav: pav
            };
          }
        
          function novoCanvas(l, a) {
            var c = document.createElement('canvas');
            c.width = l; c.height = a;
            return c;
          }
        
          function cortar(ctx, txt, larg) {
            var s = String(txt == null ? '' : txt);
            if (ctx.measureText(s).width <= larg) { return s; }
            while (s.length > 1 && ctx.measureText(s + '...').width > larg) { s = s.slice(0, -1); }
            return s + '...';
          }
        
          function desenharBarras(cv, titulo, rotulos, series) {
            var ctx = cv.getContext('2d');
            var L = cv.width, A = cv.height;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, L, A);
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#111827';
            ctx.font = 'bold 17px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(String(titulo || ''), 14, 26);
        
            var esqM = 52, dirM = 18, topM = 52, baseM = 62;
            var lg = Math.max(40, L - esqM - dirM);
            var ag = Math.max(40, A - topM - baseM);
            var max = 1;
            series.forEach(function (s) {
              (s.valores || []).forEach(function (v) { if (num(v) > max) { max = num(v); } });
            });
            max = Math.ceil(max * 1.15) || 1;
        
            var g, y;
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;
            for (g = 0; g <= 4; g++) {
              y = topM + ag - (ag * g / 4);
              ctx.beginPath();
              ctx.moveTo(esqM, y);
              ctx.lineTo(esqM + lg, y);
              ctx.stroke();
              ctx.fillStyle = '#6b7280';
              ctx.font = '11px Arial';
              ctx.textAlign = 'right';
              ctx.fillText(String(Math.round(max * g / 4)), esqM - 7, y + 4);
            }
        
            var n = Math.max(1, rotulos.length);
            var passo = lg / n;
            var gap = Math.min(12, passo * 0.14);
            var lb = Math.max(5, (passo - gap * 2) / Math.max(1, series.length));
        
            rotulos.forEach(function (r, i) {
              series.forEach(function (s, k) {
                var v = num((s.valores || [])[i]);
                var h = ag * Math.min(1, v / max);
                var x = esqM + passo * i + gap + k * lb;
                var yy = topM + ag - h;
                ctx.fillStyle = s.cor;
                ctx.fillRect(x, yy, Math.max(3, lb - 3), h);
                if (v) {
                  ctx.fillStyle = '#111827';
                  ctx.font = 'bold 11px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText(String(Math.round(v * 100) / 100), x + (lb - 3) / 2, yy - 4);
                }
              });
              ctx.fillStyle = '#374151';
              ctx.font = '12px Arial';
              ctx.textAlign = 'center';
              ctx.fillText(cortar(ctx, r, passo - 4), esqM + passo * i + passo / 2, topM + ag + 18);
            });
        
            var lx = esqM;
            series.forEach(function (s) {
              ctx.fillStyle = s.cor;
              ctx.fillRect(lx, A - 26, 12, 12);
              ctx.fillStyle = '#374151';
              ctx.font = '12px Arial';
              ctx.textAlign = 'left';
              ctx.fillText(s.nome, lx + 17, A - 16);
              lx += 34 + ctx.measureText(s.nome).width;
            });
            return cv;
          }
        
          function desenharRosca(cv, titulo, dados, centro) {
            var ctx = cv.getContext('2d');
            var L = cv.width, A = cv.height;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, L, A);
            ctx.fillStyle = '#111827';
            ctx.font = 'bold 17px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(String(titulo || ''), 14, 26);
        
            var soma = 0;
            dados.forEach(function (d) { soma += num(d.v); });
            var cx = A * 0.52, cy = A * 0.55 + 8, raio = Math.min(A * 0.32, L * 0.28);
            var ini = -Math.PI / 2;
        
            if (soma <= 0) {
              ctx.strokeStyle = '#e5e7eb';
              ctx.lineWidth = raio * 0.42;
              ctx.beginPath();
              ctx.arc(cx, cy, raio, 0, Math.PI * 2);
              ctx.stroke();
            } else {
              dados.forEach(function (d) {
                var fr = num(d.v) / soma;
                var fim = ini + fr * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, raio, ini, fim);
                ctx.closePath();
                ctx.fillStyle = d.cor;
                ctx.fill();
                ini = fim;
              });
              ctx.beginPath();
              ctx.arc(cx, cy, raio * 0.58, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.fill();
            }
        
            if (centro) {
              ctx.fillStyle = '#111827';
              ctx.font = 'bold 20px Arial';
              ctx.textAlign = 'center';
              ctx.fillText(String(centro), cx, cy + 7);
            }
        
            var ly = 56;
            ctx.textAlign = 'left';
            dados.forEach(function (d) {
              ctx.fillStyle = d.cor;
              ctx.fillRect(cx + raio + 24, ly - 10, 12, 12);
              ctx.fillStyle = '#374151';
              ctx.font = '12px Arial';
              var pc = soma > 0 ? Math.round((num(d.v) / soma) * 100) : 0;
              var tx = d.rot + '  ' + (Math.round(num(d.v) * 100) / 100) + ' (' + pc + '%)';
              ctx.fillText(cortar(ctx, tx, L - (cx + raio + 46)), cx + raio + 42, ly);
              ly += 22;
            });
            return cv;
          }
        
          function graficos(d, larg, alt) {
            var c = contas(d);
            var saida = [];
            var l = larg || 640, a = alt || 320;
        
            saida.push({
              titulo: 'Itens instalados x previstos',
              cv: desenharBarras(novoCanvas(l, a), 'Itens instalados x previstos',
                c.porItem.map(function (i) { return i.titulo; }),
                [
                  { nome: 'Instalado', cor: '#f97316', valores: c.porItem.map(function (i) { return i.qtd; }) },
                  { nome: 'Previsto', cor: '#334155', valores: c.porItem.map(function (i) { return i.total; }) }
                ])
            });
        
            saida.push({
              titulo: 'Instalado por fachada',
              cv: desenharBarras(novoCanvas(l, a), 'Instalado por fachada',
                FACHADAS,
                [
                  { nome: 'Instalado', cor: '#f97316', valores: FACHADAS.map(function (f) { return c.porFachada[f].qtd; }) },
                  { nome: 'Previsto', cor: '#334155', valores: FACHADAS.map(function (f) { return c.porFachada[f].total; }) }
                ])
            });
        
            saida.push({
              titulo: 'Avanco geral da instalacao',
              cv: desenharRosca(novoCanvas(l, a), 'Avanço geral da instalação', [
                { rot: 'Instalado', v: c.instTotal, cor: '#f97316' },
                { rot: 'A instalar', v: Math.max(0, c.prevTotal - c.instTotal), cor: '#cbd5e1' }
              ], (Math.round(c.pct * 10) / 10) + '%')
            });
        
            var pavs = Object.keys(c.pav);
            saida.push({
              titulo: 'Pendencias por pavimento',
              cv: desenharBarras(novoCanvas(l, a), 'Pendências por pavimento',
                pavs.length ? pavs : ['Sem pendências'],
                [
                  { nome: 'Em aberto', cor: '#b91c1c', valores: (pavs.length ? pavs : ['x']).map(function (p) { return c.pav[p] ? c.pav[p].abertas : 0; }) },
                  { nome: 'Resolvidas', cor: '#16a34a', valores: (pavs.length ? pavs : ['x']).map(function (p) { return c.pav[p] ? c.pav[p].feitas : 0; }) }
                ])
            });
        
            return saida;
          }
        
          /* ================================================================ *
           * estilo
           * ================================================================ */
          function estilo() {
            if (document.getElementById('p92Estilo')) { return; }
            var s = document.createElement('style');
            s.id = 'p92Estilo';
            s.textContent = [
              '#p92Botao{background:#f97316;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-weight:600;cursor:pointer;margin:4px}',
              '#p92Botao:hover{filter:brightness(1.08)}',
              '#meu-menu-abas #p92Botao{display:block;width:100%;box-sizing:border-box;margin:3px 0 !important;text-align:left}',
              '.p92-aviso{position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:10px 14px;border-radius:10px;color:#fff;font:13px/1.4 system-ui,Segoe UI,Arial;box-shadow:0 8px 24px rgba(0,0,0,.35);display:none}',
              '.p92-ok{background:#0f766e}.p92-erro{background:#b91c1c}',
              '#p92Fundo{position:fixed;inset:0;background:rgba(2,6,23,.74);z-index:2147483000;display:none;align-items:center;justify-content:center;padding:14px;overflow:auto}',
              '#p92Caixa{background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:14px;width:min(1180px,100%);max-height:94vh;display:flex;flex-direction:column;margin:auto;font:14px/1.5 system-ui,Segoe UI,Arial}',
              '#p92Caixa header{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #334155;flex-wrap:wrap}',
              '#p92Caixa header h3{margin:0;font-size:16px}',
              '#p92Caixa header h3 span{color:#fb923c}',
              '#p92Nav{display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px;border-bottom:1px solid #334155;background:#0b1324}',
              '.p92-nav{background:#111c2f;color:#cbd5e1;border:1px solid #334155;border-radius:999px;padding:6px 12px;cursor:pointer;font-size:12.5px}',
              '.p92-nav.on{background:#f97316;border-color:#f97316;color:#111827;font-weight:700}',
              '#p92Corpo{padding:14px;overflow:auto}',
              '#p92Pe{display:flex;flex-wrap:wrap;gap:8px;padding:12px 14px;border-top:1px solid #334155}',
              '.p92-btn{background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:9px;padding:7px 12px;cursor:pointer;font-size:13px}',
              '.p92-btn:hover{background:#243449}',
              '.p92-btn[disabled]{opacity:.5;cursor:default}',
              '.p92-btn-ok{background:#f97316;border-color:#f97316;color:#111827;font-weight:700}',
              '.p92-btn-no{background:#b91c1c;border-color:#b91c1c;color:#fff}',
              '.p92-btn-mini{padding:4px 8px;font-size:12px}',
              '.p92-sec{border:1px solid #334155;border-radius:12px;padding:12px;margin:0 0 12px;background:#0b1324}',
              '.p92-sec>h4{margin:0 0 10px;font-size:14px;color:#fdba74;text-transform:uppercase;letter-spacing:.5px}',
              '.p92-g{display:grid;gap:10px}',
              '.p92-g2{grid-template-columns:1fr 1fr}',
              '.p92-g3{grid-template-columns:1fr 1fr 1fr}',
              '.p92-g4{grid-template-columns:repeat(4,1fr)}',
              '@media(max-width:900px){.p92-g2,.p92-g3,.p92-g4{grid-template-columns:1fr}}',
              '.p92-c{display:flex;flex-direction:column;gap:4px}',
              '.p92-c>span{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px}',
              '.p92-in,.p92-ta,.p92-sel{background:#0f172a;border:1px solid #334155;border-radius:8px;color:#e2e8f0;padding:8px;font:13px/1.5 inherit;width:100%;box-sizing:border-box}',
              '.p92-ta{min-height:120px;resize:vertical}',
              '.p92-item{border:1px solid #2b3a52;border-radius:10px;padding:10px;margin:0 0 12px;background:#0f172a}',
              '.p92-item-topo{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap}',
              '.p92-item-topo b{font-size:13px;color:#cbd5e1}',
              '.p92-fotos-cx{margin-top:8px;border-top:1px dashed #334155;padding-top:8px}',
              '.p92-fotos-top{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}',
              '.p92-fotos-top b{font-size:12px;color:#94a3b8;text-transform:uppercase}',
              '.p92-fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:8px}',
              '.p92-foto{margin:0;border:1px solid #334155;border-radius:8px;overflow:hidden;background:#0b1324}',
              '.p92-foto img{width:100%;height:112px;object-fit:cover;display:block;cursor:zoom-in}',
              '.p92-leg{width:100%;border:none;border-top:1px solid #334155;background:#0f172a;color:#e2e8f0;padding:5px;font-size:12px;box-sizing:border-box}',
              '.p92-fx{display:flex;gap:4px;padding:4px;flex-wrap:wrap}',
              '.p92-vazio{padding:10px;border:1px dashed #334155;border-radius:10px;color:#94a3b8;margin-top:8px}',
              '.p92-tab{width:100%;border-collapse:collapse;font-size:13px}',
              '.p92-tab th,.p92-tab td{border:1px solid #334155;padding:6px;text-align:left}',
              '.p92-tab th{background:#16233b;color:#cbd5e1;font-size:12px}',
              '.p92-graf{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
              '@media(max-width:900px){.p92-graf{grid-template-columns:1fr}}',
              '.p92-graf canvas{width:100%;height:auto;background:#fff;border:1px solid #334155;border-radius:8px}',
              '.p92-chk{display:flex;align-items:center;gap:8px;font-size:13px;color:#cbd5e1}',
              '.p92-lin{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}',
              '.p92-cam{position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:2147483100;display:flex;align-items:center;justify-content:center;padding:12px}',
              '.p92-cam-cx{background:#0f172a;border:1px solid #334155;border-radius:12px;padding:10px;max-width:min(900px,100%);margin:auto}',
              '.p92-cam-cx video{width:100%;max-height:70vh;background:#000;border-radius:8px;display:block}',
              '.p92-cam-pe{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;justify-content:center}',
              '.p92-cam-nota{color:#94a3b8;font-size:12px;text-align:center;margin-top:6px}',
              '.p92-lupa{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:14px}',
              '.p92-lupa img{max-width:100%;max-height:100%;border-radius:8px}',
              '#p92Espera{position:fixed;inset:0;background:rgba(2,6,23,.8);z-index:2147483500;display:flex;align-items:center;justify-content:center;padding:16px}',
              '#p92Espera .cx{background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:12px;padding:18px 22px;font:14px/1.5 system-ui,Segoe UI,Arial;text-align:center;min-width:min(320px,86vw)}',
              '#p92Espera .cx b{display:block;margin-bottom:6px;font-size:15px}',
              '#p92Espera .cx small{color:#94a3b8}',
              '#p92Espera .bar{height:6px;border-radius:6px;background:#1e293b;overflow:hidden;margin-top:12px}',
              '#p92Espera .bar i{display:block;height:100%;width:30%;background:#f97316;border-radius:6px;animation:p92run 1.1s linear infinite}',
              '@keyframes p92run{0%{margin-left:-30%}100%{margin-left:100%}}',
              '#p92Palco{position:fixed;left:-20000px;top:0;z-index:-1;background:#fff}',
              '#p92Impressao{display:none}',
              '@media print{',
              '  body>*{display:none !important}',
              '  #p92Impressao{display:block !important;background:#fff;color:#000}',
              '  @page{size:A4;margin:10mm}',
              '}',
              '#p92Impressao,#p92Impressao *{color:#000;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}',
              '.p92-folha{width:' + LARG_PX + 'px;background:#fff}',
              '.p92-folha,.p92-folha *{color:#000;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}',
              '.p92-pag{width:' + LARG_PX + 'px;background:#fff}',
              '#p92Impressao .pr-capa,.p92-folha .pr-capa{border:2px solid #111;padding:14px;margin:0 0 10px;background:#111;color:#fff}',
              '#p92Impressao .pr-capa *,.p92-folha .pr-capa *{color:#fff}',
              '#p92Impressao .pr-capa .t1,.p92-folha .pr-capa .t1{font-size:22px;font-weight:700;letter-spacing:1px;margin:0 0 4px}',
              '#p92Impressao .pr-capa .t2,.p92-folha .pr-capa .t2{font-size:14px;margin:0}',
              '#p92Impressao .pr-capa .t3,.p92-folha .pr-capa .t3{font-size:12px;margin:6px 0 0;color:#fdba74}',
              '#p92Impressao .pr-tit,.p92-folha .pr-tit{font-size:14px;font-weight:700;margin:10px 0 4px;background:#111;color:#fff;padding:5px 8px;letter-spacing:.5px}',
              '#p92Impressao .pr-tit *,.p92-folha .pr-tit *{color:#fff}',
              '#p92Impressao .pr-sub,.p92-folha .pr-sub{font-size:11px;margin:0 0 8px;text-align:center}',
              '#p92Impressao table,.p92-folha table{width:100%;border-collapse:collapse;margin:0 0 8px;font-size:11px}',
              '#p92Impressao th,#p92Impressao td,.p92-folha th,.p92-folha td{border:1px solid #111;padding:4px 6px;vertical-align:top;text-align:left}',
              '#p92Impressao th,.p92-folha th{background:#e5e7eb}',
              '#p92Impressao .pr-tx,.p92-folha .pr-tx{font-size:11px;white-space:pre-wrap;margin:0 0 6px}',
              '#p92Impressao .pr-bl,.p92-folha .pr-bl{border:1px solid #111;padding:6px;margin:0 0 8px}',
              '#p92Impressao .pr-bl>b,.p92-folha .pr-bl>b{font-size:11.5px;display:block;margin-bottom:4px}',
              '#p92Impressao .pr-fotos,.p92-folha .pr-fotos{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px}',
              '#p92Impressao .pr-fotos figure,.p92-folha .pr-fotos figure{margin:0;page-break-inside:avoid}',
              '#p92Impressao .pr-fotos img,.p92-folha .pr-fotos img{width:100%;height:auto;border:1px solid #111;display:block}',
              '#p92Impressao .pr-fotos figcaption,.p92-folha .pr-fotos figcaption{font-size:9.5px;text-align:center;padding:2px}',
              '#p92Impressao .pr-cmp,.p92-folha .pr-cmp{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
              '#p92Impressao .pr-cmp>div,.p92-folha .pr-cmp>div{border:1px solid #111;padding:5px}',
              '#p92Impressao .pr-cmp h5,.p92-folha .pr-cmp h5{margin:0 0 4px;font-size:11px;background:#e5e7eb;padding:3px 5px;text-align:center}',
              '#p92Impressao .pr-graf,.p92-folha .pr-graf{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
              '#p92Impressao .pr-graf img,.p92-folha .pr-graf img{width:100%;height:auto;border:1px solid #111}',
              '#p92Impressao .pr-fim,.p92-folha .pr-fim{margin-top:14px;text-align:center;font-size:13px;font-weight:700;border-top:2px solid #111;padding-top:8px;letter-spacing:1px}',
              '#p92Impressao .pr-2col,.p92-folha .pr-2col{display:grid;grid-template-columns:1fr 1fr;gap:8px}'
            ].join('\n');
            (document.head || document.documentElement).appendChild(s);
          }
        
          /* ================================================================ *
           * tela
           * ================================================================ */
          function montarCaixa() {
            var f = document.getElementById('p92Fundo');
            if (f) { return f; }
            f = document.createElement('div');
            f.id = 'p92Fundo';
            f.innerHTML =
              '<div id="p92Caixa" role="dialog" aria-modal="true" aria-labelledby="p92Tit">' +
                '<header>' +
                  '<h3 id="p92Tit">Relatório <span>FPDO</span> &mdash; Fique por dentro da obra</h3>' +
                  '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
                    '<button class="p92-btn" type="button" data-a="lista">Relatórios salvos</button>' +
                    '<button class="p92-btn" type="button" data-a="fechar">Fechar</button>' +
                  '</div>' +
                '</header>' +
                '<div id="p92Nav"></div>' +
                '<div id="p92Corpo"></div>' +
                '<div id="p92Pe">' +
                  '<button class="p92-btn p92-btn-ok" type="button" data-a="salvar">Salvar</button>' +
                  '<button class="p92-btn" type="button" data-a="novo">Novo relatório</button>' +
                  '<button class="p92-btn" type="button" data-a="copiarMes">Copiar do mês anterior</button>' +
                  '<button class="p92-btn" type="button" data-a="imprimir">Imprimir / PDF</button>' +
                  '<button class="p92-btn" type="button" data-a="pdf">Salvar PDF</button>' +
                  '<button class="p92-btn" type="button" data-a="editorVisual">Editor visual 16:9</button>' +
                  '<button class="p92-btn" type="button" data-a="exportar">Exportar arquivo</button>' +
                  '<button class="p92-btn" type="button" data-a="importar">Importar arquivo</button>' +
                  '<button class="p92-btn p92-btn-no" type="button" data-a="excluir">Excluir</button>' +
                '</div>' +
              '</div>';
            document.body.appendChild(f);
            f.addEventListener('click', function (ev) { if (ev.target === f) { fechar(); } });
            f.addEventListener('click', aoClicar);
            f.addEventListener('input', aoDigitar);
            f.addEventListener('change', aoDigitar);
            return f;
          }
        
          function fechar() {
            var f = document.getElementById('p92Fundo');
            if (f) { f.style.display = 'none'; }
          }
        
          function abrir() {
            estilo();
            var f = montarCaixa();
            f.style.display = 'flex';
            if (atual) { render(); return; }
            carregarTodos(function (arr) {
              lista = (arr || []).sort(function (a, b) {
                return String(b.alterado || b.criado || '').localeCompare(String(a.alterado || a.criado || ''));
              });
              var ult = null;
              try { ult = localStorage.getItem(K_ULT); } catch (e) {}
              var reg = null, i;
              for (i = 0; i < lista.length; i++) { if (lista[i].id === ult) { reg = lista[i]; break; } }
              if (!reg && lista.length) { reg = lista[0]; }
              atual = arrumar(reg || fpdoNovo(null));
              render();
            });
          }
        
          function render() {
            renderNav();
            renderCorpo();
          }
        
          function renderNav() {
            var n = document.getElementById('p92Nav');
            if (!n) { return; }
            var abas = [
              ['dados', 'Capa e dados da obra'],
              ['evolucao', 'Fotos antes e depois'],
              ['itens', 'Itens instalados'],
              ['pendencias', 'Pendências por pavimento'],
              ['graficos', 'Gráficos'],
              ['texto', 'Atividades e próximas etapas']
            ];
            n.innerHTML = abas.map(function (a) {
              return '<button class="p92-nav' + (sec === a[0] ? ' on' : '') + '" type="button" data-a="sec" data-s="' + a[0] + '">' + esc(a[1]) + '</button>';
            }).join('');
          }
        
          function campo(rot, chave, valor, dica) {
            return '<label class="p92-c"><span>' + esc(rot) + '</span>' +
              '<input class="p92-in" data-k="' + esc(chave) + '" value="' + esc(valor || '') + '" placeholder="' + esc(dica || '') + '"></label>';
          }
        
          function area(rot, chave, valor, dica) {
            return '<label class="p92-c"><span>' + esc(rot) + '</span>' +
              '<textarea class="p92-ta" data-k="' + esc(chave) + '" placeholder="' + esc(dica || '') + '">' + esc(valor || '') + '</textarea></label>';
          }
        
          function renderCorpo() {
            var c = document.getElementById('p92Corpo');
            if (!c || !atual) { return; }
            var d = atual;
            var h = '';
        
            if (sec === 'dados') {
              h += '<div class="p92-sec"><h4>Capa</h4>' +
                '<div class="p92-g p92-g2">' +
                  campo('Título da capa', 'titulo', d.titulo, 'FIQUE POR DENTRO DA OBRA') +
                  campo('Mês do relatório', 'mes', d.mes, 'Ex.: Junho 2026') +
                '</div>' +
                htmlFotos('capa', d.capaFotos, 'Foto da capa') +
              '</div>';
        
              h += '<div class="p92-sec"><h4>Dados da obra</h4>' +
                '<div class="p92-g p92-g2">' +
                  campo('Obra', 'obra', d.obra, 'Nome da obra') +
                  campo('Cliente', 'cliente', d.cliente, 'Nome do cliente') +
                  campo('Local', 'local', d.local, 'Cidade / estado') +
                  campo('Data do relatório', 'dataRelatorio', d.dataRelatorio, 'aaaa-mm-dd') +
                  campo('Responsável do cliente', 'responsavel', d.responsavel, 'Ex.: Engª Carol Brander') +
                  campo('Gestor Pórtico', 'gestor', d.gestor, 'Ex.: Erick Santos') +
                '</div>' +
                '<div class="p92-lin" style="margin-top:10px">' +
                  '<button class="p92-btn p92-btn-mini" type="button" data-a="puxarObra">Puxar dados da obra aberta</button>' +
                '</div>' +
              '</div>';
        
              h += '<div class="p92-sec"><h4>Informações complementares da obra</h4>' +
                '<div class="p92-g p92-g3">' +
                  campo('Código da obra', 'codigoObra', d.codigoObra, 'Ex.: P07324') +
                  campo('Contrato', 'contrato', d.contrato, 'Número ou referência do contrato') +
                  campo('Cidade / UF', 'cidadeUf', d.cidadeUf, 'Ex.: João Pessoa / PB') +
                  campo('Período inicial', 'periodoInicio', d.periodoInicio, 'Data inicial') +
                  campo('Período final', 'periodoFim', d.periodoFim, 'Data final') +
                  campo('Fiscal do cliente', 'fiscalCliente', d.fiscalCliente, 'Nome do fiscal') +
                  campo('Equipe responsável', 'equipeResponsavel', d.equipeResponsavel, 'Equipe ou responsável') +
                  campo('Status da obra', 'statusObra', d.statusObra, 'Ex.: Em andamento') +
                  campo('Previsão de conclusão', 'previsaoConclusao', d.previsaoConclusao, 'Ex.: Agosto 2026') +
                  campo('% previsto', 'percentualPrevisto', d.percentualPrevisto, 'Ex.: 80') +
                  campo('% realizado', 'percentualRealizado', d.percentualRealizado, 'Ex.: 74') +
                '</div>' +
                '<div class="p92-g p92-g2">' +
                  area('DESTAQUES DO MÊS', 'destaquesMes', d.destaquesMes, 'Um destaque por linha') +
                  area('RISCOS / PONTOS DE ATENÇÃO', 'riscos', d.riscos, 'Um risco por linha') +
                  area('DECISÕES E OBSERVAÇÕES', 'decisoes', d.decisoes, 'Decisões tomadas no período') +
                  area('PRÓXIMOS MARCOS', 'proximosMarcos', d.proximosMarcos, 'Um marco por linha') +
                '</div>' +
                '<label class="p92-c" style="margin-top:8px"><span>Observações gerais para o relatório</span>' +
                  '<textarea class="p92-ta" data-k="observacoesGerais" placeholder="Informações adicionais da obra">' + esc(d.observacoesGerais || '') + '</textarea></label>' +
              '</div>';
        
              h += '<div class="p92-sec"><h4>Encerramento</h4>' +
                '<div class="p92-g p92-g2">' +
                  campo('Frase de encerramento', 'encerramento', d.encerramento, 'PÓRTICO ESQUADRIAS') +
                '</div>' +
                htmlFotos('fim', d.fotosFinal, 'Fotos do encerramento') +
              '</div>';
            }
        
            if (sec === 'evolucao') {
              h += '<div class="p92-lin">' +
                '<button class="p92-btn p92-btn-mini" type="button" data-a="elevMais">Adicionar elevação</button>' +
                '<span style="color:#94a3b8;font-size:12px">Compare as fotos do mês anterior com as do mês atual.</span>' +
              '</div>';
              if (!d.elevacoes.length) { h += '<div class="p92-vazio">Nenhuma elevação cadastrada.</div>'; }
              d.elevacoes.forEach(function (e, i) {
                h += '<div class="p92-item">' +
                  '<div class="p92-item-topo"><b>' + (i + 1) + '. ' + esc(e.nome || 'Elevação') + '</b>' +
                    '<span>' +
                      '<button class="p92-btn p92-btn-mini" type="button" data-a="elevMover" data-d="-1" data-i="' + esc(e.id) + '"' + (i === 0 ? ' disabled' : '') + '>Subir</button> ' +
                      '<button class="p92-btn p92-btn-mini" type="button" data-a="elevMover" data-d="1" data-i="' + esc(e.id) + '"' + (i === d.elevacoes.length - 1 ? ' disabled' : '') + '>Descer</button> ' +
                      '<button class="p92-btn p92-btn-mini p92-btn-no" type="button" data-a="elevMenos" data-i="' + esc(e.id) + '">Remover</button>' +
                    '</span>' +
                  '</div>' +
                  '<div class="p92-g p92-g3">' +
                    '<label class="p92-c"><span>Elevação / fachada</span><input class="p92-in" data-l="elev" data-i="' + esc(e.id) + '" data-k="nome" value="' + esc(e.nome) + '" placeholder="ELEVAÇÃO SUL"></label>' +
                    '<label class="p92-c"><span>Legenda do antes</span><input class="p92-in" data-l="elev" data-i="' + esc(e.id) + '" data-k="rotAntes" value="' + esc(e.rotAntes) + '" placeholder="MÊS MAIO"></label>' +
                    '<label class="p92-c"><span>Legenda do depois</span><input class="p92-in" data-l="elev" data-i="' + esc(e.id) + '" data-k="rotDepois" value="' + esc(e.rotDepois) + '" placeholder="MÊS JUNHO"></label>' +
                  '</div>' +
                  '<label class="p92-c" style="margin-top:8px"><span>Comentário da elevação</span>' +
                    '<textarea class="p92-ta" style="min-height:60px" data-l="elev" data-i="' + esc(e.id) + '" data-k="obs" placeholder="O que avançou nesta fachada">' + esc(e.obs || '') + '</textarea></label>' +
                  htmlFotos('elev:' + e.id + ':antes', e.fotosAntes, 'Fotos do antes (' + (e.rotAntes || '') + ')') +
                  htmlFotos('elev:' + e.id + ':depois', e.fotosDepois, 'Fotos do depois (' + (e.rotDepois || '') + ')') +
                '</div>';
              });
            }
        
            if (sec === 'itens') {
              h += '<div class="p92-lin">' +
                '<button class="p92-btn p92-btn-mini" type="button" data-a="itemMais">Adicionar item</button>' +
                '<span style="color:#94a3b8;font-size:12px">Informe a quantidade instalada e a prevista em cada fachada.</span>' +
              '</div>';
              if (!d.itens.length) { h += '<div class="p92-vazio">Nenhum item cadastrado.</div>'; }
              d.itens.forEach(function (it, i) {
                h += '<div class="p92-item">' +
                  '<div class="p92-item-topo"><b>' + (i + 1) + '. ' + esc(it.titulo || 'Item') + '</b>' +
                    '<span>' +
                      '<button class="p92-btn p92-btn-mini" type="button" data-a="itemMover" data-d="-1" data-i="' + esc(it.id) + '"' + (i === 0 ? ' disabled' : '') + '>Subir</button> ' +
                      '<button class="p92-btn p92-btn-mini" type="button" data-a="itemMover" data-d="1" data-i="' + esc(it.id) + '"' + (i === d.itens.length - 1 ? ' disabled' : '') + '>Descer</button> ' +
                      '<button class="p92-btn p92-btn-mini p92-btn-no" type="button" data-a="itemMenos" data-i="' + esc(it.id) + '">Remover</button>' +
                    '</span>' +
                  '</div>' +
                  '<label class="p92-c"><span>Nome do item</span><input class="p92-in" data-l="item" data-i="' + esc(it.id) + '" data-k="titulo" value="' + esc(it.titulo) + '" placeholder="PORTAS INSTALADAS"></label>' +
                  '<table class="p92-tab" style="margin-top:8px"><tr><th>Fachada</th>' +
                    FACHADAS.map(function (fa) { return '<th>' + esc(fa) + '</th>'; }).join('') + '</tr>' +
                    '<tr><th>Instalado</th>' +
                      FACHADAS.map(function (fa) {
                        return '<td><input class="p92-in" data-l="item" data-i="' + esc(it.id) + '" data-k="qtd" data-f="' + esc(fa) + '" value="' + esc(it.porFachada[fa].qtd) + '" placeholder="0"></td>';
                      }).join('') + '</tr>' +
                    '<tr><th>Previsto</th>' +
                      FACHADAS.map(function (fa) {
                        return '<td><input class="p92-in" data-l="item" data-i="' + esc(it.id) + '" data-k="total" data-f="' + esc(fa) + '" value="' + esc(it.porFachada[fa].total) + '" placeholder="0"></td>';
                      }).join('') + '</tr>' +
                  '</table>' +
                  '<label class="p92-c"><span>Observações</span>' +
                    '<textarea class="p92-ta" style="min-height:60px" data-l="item" data-i="' + esc(it.id) + '" data-k="obs" placeholder="Detalhes da instalação">' + esc(it.obs || '') + '</textarea></label>' +
                  htmlFotos('inst:' + it.id, it.fotos, 'Fotos do item') +
                '</div>';
              });
            }
        
            if (sec === 'pendencias') {
              h += '<div class="p92-lin">' +
                '<button class="p92-btn p92-btn-mini" type="button" data-a="pendMais">Adicionar pendência</button>' +
                '<span style="color:#94a3b8;font-size:12px">O que o cliente precisa liberar em cada pavimento.</span>' +
              '</div>';
              if (!d.pendencias.length) { h += '<div class="p92-vazio">Nenhuma pendência cadastrada.</div>'; }
              d.pendencias.forEach(function (p, i) {
                h += '<div class="p92-item">' +
                  '<div class="p92-item-topo"><b>' + (i + 1) + '. ' + esc(p.pavimento || 'Pavimento') + (p.resolvido ? ' &mdash; resolvida' : '') + '</b>' +
                    '<span>' +
                      '<button class="p92-btn p92-btn-mini" type="button" data-a="pendMover" data-d="-1" data-i="' + esc(p.id) + '"' + (i === 0 ? ' disabled' : '') + '>Subir</button> ' +
                      '<button class="p92-btn p92-btn-mini" type="button" data-a="pendMover" data-d="1" data-i="' + esc(p.id) + '"' + (i === d.pendencias.length - 1 ? ' disabled' : '') + '>Descer</button> ' +
                      '<button class="p92-btn p92-btn-mini p92-btn-no" type="button" data-a="pendMenos" data-i="' + esc(p.id) + '">Remover</button>' +
                    '</span>' +
                  '</div>' +
                  '<div class="p92-g p92-g3">' +
                    '<label class="p92-c"><span>Pavimento / andar</span><input class="p92-in" data-l="pend" data-i="' + esc(p.id) + '" data-k="pavimento" value="' + esc(p.pavimento) + '" placeholder="ANDAR TÉRREO"></label>' +
                    '<label class="p92-c"><span>Responsável</span><input class="p92-in" data-l="pend" data-i="' + esc(p.id) + '" data-k="responsavel" value="' + esc(p.responsavel || '') + '" placeholder="Quem vai resolver"></label>' +
                    '<label class="p92-c"><span>Prazo</span><input class="p92-in" data-l="pend" data-i="' + esc(p.id) + '" data-k="prazo" value="' + esc(p.prazo || '') + '" placeholder="Ex.: 10/07"></label>' +
                  '</div>' +
                  '<label class="p92-c" style="margin-top:8px"><span>O que está pendente</span>' +
                    '<textarea class="p92-ta" style="min-height:60px" data-l="pend" data-i="' + esc(p.id) + '" data-k="desc" placeholder="FALTA LIBERAR RIPADO / PORTAS">' + esc(p.desc || '') + '</textarea></label>' +
                  '<label class="p92-chk" style="margin-top:8px"><input type="checkbox" data-l="pend" data-i="' + esc(p.id) + '" data-k="resolvido"' + (p.resolvido ? ' checked' : '') + '> Já foi resolvida</label>' +
                  htmlFotos('pend:' + p.id, p.fotos, 'Fotos da pendência') +
                '</div>';
              });
            }
        
            if (sec === 'graficos') {
              var c2 = contas(d);
              h += '<div class="p92-sec"><h4>Resumo</h4>' +
                '<table class="p92-tab"><tr><th>Instalado</th><th>Previsto</th><th>Avanço</th><th>Pendências em aberto</th></tr>' +
                '<tr><td>' + (Math.round(c2.instTotal * 100) / 100) + '</td><td>' + (Math.round(c2.prevTotal * 100) / 100) + '</td>' +
                '<td>' + (Math.round(c2.pct * 10) / 10) + '%</td><td>' +
                (d.pendencias || []).filter(function (p) { return !p.resolvido; }).length + '</td></tr></table>' +
                '<label class="p92-chk" style="margin-top:8px"><input type="checkbox" data-k="mostrarGraficos"' + (d.mostrarGraficos ? ' checked' : '') + '> Mostrar os gráficos no relatório impresso</label>' +
              '</div>';
              h += '<div class="p92-sec"><h4>Gráficos</h4><div class="p92-graf" id="p92Graf"></div></div>';
            }
        
            if (sec === 'texto') {
              h += '<div class="p92-sec"><h4>Atividades realizadas</h4>' +
                '<div class="p92-g p92-g2">' +
                  area('PÓRTICO', 'atividadesPortico', d.atividadesPortico, 'Uma atividade por linha') +
                  area('CLIENTE / OBRA', 'atividadesCliente', d.atividadesCliente, 'Uma atividade por linha') +
                '</div>' +
              '</div>';
              h += '<div class="p92-sec"><h4>Próximas etapas</h4>' +
                '<div class="p92-g p92-g2">' +
                  area('PÓRTICO', 'proximasPortico', d.proximasPortico, 'Uma etapa por linha') +
                  area('CLIENTE / OBRA', 'proximasCliente', d.proximasCliente, 'Uma etapa por linha') +
                '</div>' +
              '</div>';
              h += '<div class="p92-sec"><h4>Slides livres personalizados</h4>' +
                '<div class="p92-lin"><button class="p92-btn p92-btn-mini" type="button" data-a="slideMais">Adicionar slide livre</button>' +
                '<span style="color:#94a3b8;font-size:12px">Inclua uma página extra com texto, cor e imagem. O slide será gerado em 16:9.</span></div>';
              if (!d.slidesCustomizados.length) { h += '<div class="p92-vazio">Nenhum slide livre cadastrado.</div>'; }
              d.slidesCustomizados.forEach(function (s, i) {
                h += '<div class="p92-item"><div class="p92-item-topo"><b>Slide livre ' + (i + 1) + '</b>' +
                  '<button class="p92-btn p92-btn-mini p92-btn-no" type="button" data-a="slideMenos" data-i="' + esc(s.id) + '">Remover</button></div>' +
                  '<div class="p92-g p92-g2">' +
                    '<label class="p92-c"><span>Título do slide</span><input class="p92-in" data-l="custom" data-i="' + esc(s.id) + '" data-k="titulo" value="' + esc(s.titulo) + '" placeholder="Título livre"></label>' +
                    '<label class="p92-c"><span>Imagem do slide (URL)</span><input class="p92-in" data-l="custom" data-i="' + esc(s.id) + '" data-k="imagemUrl" value="' + esc(s.imagemUrl) + '" placeholder="Cole uma URL de imagem"></label>' +
                  '</div>' +
                  '<label class="p92-c"><span>Texto do slide</span><textarea class="p92-ta" data-l="custom" data-i="' + esc(s.id) + '" data-k="texto" placeholder="Um item por linha">' + esc(s.texto) + '</textarea></label>' +
                  '<label class="p92-c"><span>Cor de destaque em hexadecimal</span><input class="p92-in" data-l="custom" data-i="' + esc(s.id) + '" data-k="cor" value="' + esc(s.cor) + '" placeholder="0F172A"></label>' +
                '</div>';
              });
              h += '</div>';
            }
        
            c.innerHTML = h;
        
            if (sec === 'graficos') {
              var cx = document.getElementById('p92Graf');
              if (cx) {
                graficos(d, 640, 320).forEach(function (g) {
                  cx.appendChild(g.cv);
                });
              }
            }
          }
        
          /* ================================================================ *
           * digitacao
           * ================================================================ */
          function valorDe(el) {
            if (el.type === 'checkbox') { return !!el.checked; }
            return el.value;
          }
        
          function aoDigitar(ev) {
            var el = ev.target;
            if (!el || !atual) { return; }
            if (!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) { return; }
        
            var lote = el.getAttribute('data-l');
            var k = el.getAttribute('data-k');
            var id = el.getAttribute('data-i');
        
            if (!lote && k) {
              atual[k] = valorDe(el);
              if (k === 'mostrarGraficos') { salvarDepois(); return; }
              salvarDepois();
              return;
            }
        
            if (lote === 'elev') {
              var e = achar(atual.elevacoes, id);
              if (e && k) { e[k] = valorDe(el); salvarDepois(); }
              return;
            }
            if (lote === 'item') {
              var it = achar(atual.itens, id);
              if (!it || !k) { return; }
              var fa = el.getAttribute('data-f');
              if (fa) {
                if (!it.porFachada[fa]) { it.porFachada[fa] = { qtd: '', total: '' }; }
                it.porFachada[fa][k] = valorDe(el);
              } else {
                it[k] = valorDe(el);
              }
              salvarDepois();
              return;
            }
            if (lote === 'pend') {
              var p = achar(atual.pendencias, id);
              if (p && k) { p[k] = valorDe(el); salvarDepois(); }
              return;
            }
            if (lote === 'custom') {
              var cs = achar(atual.slidesCustomizados, id);
              if (cs && k) { cs[k] = valorDe(el); salvarDepois(); }
              return;
            }
            if (lote === 'foto') {
              var arr = grupoFotos(el.getAttribute('data-alvo'));
              var f = achar(arr, id);
              if (f) { f.leg = el.value; salvarDepois(); }
              return;
            }
          }
        
          function salvarDepois() {
            if (timerSalvar) { clearTimeout(timerSalvar); }
            timerSalvar = setTimeout(function () {
              timerSalvar = null;
              if (!atual) { return; }
              guardar(atual, function () {});
              try { localStorage.setItem(K_ULT, atual.id); } catch (e) {}
            }, 700);
          }
        
          function salvarAgora(msg) {
            if (!atual) { return; }
            if (timerSalvar) { clearTimeout(timerSalvar); timerSalvar = null; }
            guardar(atual, function (ok) {
              aviso(ok ? (msg || 'Relatório salvo.') : 'Não consegui salvar neste navegador.', ok ? 'ok' : 'erro');
            });
            try { localStorage.setItem(K_ULT, atual.id); } catch (e) {}
          }
        
          /* ================================================================ *
           * lista de relatorios salvos
           * ================================================================ */
          function verLista() {
            carregarTodos(function (arr) {
              lista = (arr || []).sort(function (a, b) {
                return String(b.alterado || b.criado || '').localeCompare(String(a.alterado || a.criado || ''));
              });
              var c = document.getElementById('p92Corpo');
              if (!c) { return; }
              var h = '<div class="p92-sec"><h4>Relatórios salvos</h4>';
              if (!lista.length) {
                h += '<div class="p92-vazio">Nenhum relatório salvo ainda.</div>';
              } else {
                h += '<table class="p92-tab"><tr><th>Mês</th><th>Obra</th><th>Cliente</th><th>Alterado</th><th>Ações</th></tr>';
                lista.forEach(function (r) {
                  var qd = String(r.alterado || r.criado || '').slice(0, 10);
                  h += '<tr><td>' + esc(r.mes || '') + '</td><td>' + esc(r.obra || '') + '</td><td>' + esc(r.cliente || '') + '</td>' +
                    '<td>' + esc(dataBonita(qd)) + '</td><td>' +
                    '<button class="p92-btn p92-btn-mini" type="button" data-a="lerReg" data-i="' + esc(r.id) + '">Abrir</button> ' +
                    '<button class="p92-btn p92-btn-mini" type="button" data-a="dupReg" data-i="' + esc(r.id) + '">Duplicar</button> ' +
                    '<button class="p92-btn p92-btn-mini p92-btn-no" type="button" data-a="delReg" data-i="' + esc(r.id) + '">Excluir</button>' +
                    '</td></tr>';
                });
                h += '</table>';
              }
              h += '<div class="p92-lin" style="margin-top:10px">' +
                '<button class="p92-btn p92-btn-mini" type="button" data-a="voltar">Voltar ao relatório</button></div>';
              h += '</div>';
              c.innerHTML = h;
            });
          }
        
          /* ================================================================ *
           * impressao
           * ================================================================ */
          function linhas(txt) {
            return String(txt || '').split(/\r?\n/).filter(function (l) { return l.replace(/\s+/g, '') !== ''; });
          }
        
          function blocoFotos(fotos, titulo) {
            if (!(fotos || []).length) { return ''; }
            var h = titulo ? '<div class="pr-tx"><b>' + esc(titulo) + '</b></div>' : '';
            h += '<div class="pr-fotos">';
            fotos.forEach(function (f) {
              h += '<figure><img src="' + esc(f.url) + '" alt="foto">' +
                (f.leg ? '<figcaption>' + esc(f.leg) + '</figcaption>' : '') + '</figure>';
            });
            h += '</div>';
            return h;
          }
        
          function listaHtml(txt) {
            var ls = linhas(txt);
            if (!ls.length) { return '<div class="pr-tx">-</div>'; }
            return '<ul style="margin:0 0 6px 16px;padding:0;font-size:11px">' +
              ls.map(function (l) { return '<li>' + esc(l.replace(/^[-*\u2022]\s*/, '')) + '</li>'; }).join('') + '</ul>';
          }
        
          function montarHtml(d) {
            var c = contas(d);
            var h = '';
        
            h += '<div class="pr-capa">' +
              '<div class="t1">' + esc(d.titulo || 'FIQUE POR DENTRO DA OBRA') + '</div>' +
              '<div class="t2">' + esc(d.obra || '') + (d.mes ? ' &mdash; ' + esc(d.mes) : '') + '</div>' +
              '<div class="t3">' + esc(d.encerramento || 'PÓRTICO ESQUADRIAS') + '</div>' +
            '</div>';
        
            if ((d.capaFotos || []).length) { h += blocoFotos(d.capaFotos, ''); }
        
            h += '<div class="pr-tit">DADOS DA OBRA</div>';
            h += '<table>' +
              '<tr><th style="width:22%">Obra</th><td style="width:28%">' + esc(d.obra) + '</td>' +
                '<th style="width:22%">Mês</th><td>' + esc(d.mes) + '</td></tr>' +
              '<tr><th>Cliente</th><td>' + esc(d.cliente) + '</td><th>Local</th><td>' + esc(d.local) + '</td></tr>' +
              '<tr><th>Responsável</th><td>' + esc(d.responsavel) + '</td><th>Gestor Pórtico</th><td>' + esc(d.gestor) + '</td></tr>' +
              '<tr><th>Data do relatório</th><td>' + esc(dataBonita(d.dataRelatorio)) + '</td>' +
                '<th>Avanço da instalação</th><td>' + (Math.round(c.pct * 10) / 10) + '%</td></tr>' +
            '</table>';
        
            (d.elevacoes || []).forEach(function (e) {
              h += '<div class="pr-tit">' + esc(e.nome || 'ELEVAÇÃO') + '</div>';
              if (e.obs) { h += '<div class="pr-tx">' + esc(e.obs) + '</div>'; }
              h += '<div class="pr-cmp">' +
                '<div><h5>' + esc(e.rotAntes || 'ANTES') + '</h5>' +
                  ((e.fotosAntes || []).length ? blocoFotos(e.fotosAntes, '') : '<div class="pr-tx">Sem fotos.</div>') + '</div>' +
                '<div><h5>' + esc(e.rotDepois || 'DEPOIS') + '</h5>' +
                  ((e.fotosDepois || []).length ? blocoFotos(e.fotosDepois, '') : '<div class="pr-tx">Sem fotos.</div>') + '</div>' +
              '</div>';
            });
        
            if ((d.itens || []).length) {
              h += '<div class="pr-tit">ITENS INSTALADOS</div>';
              h += '<table><tr><th>Item</th>' +
                FACHADAS.map(function (f) { return '<th>' + esc(f) + '</th>'; }).join('') +
                '<th>Instalado</th><th>Previsto</th></tr>';
              c.porItem.forEach(function (li, idx) {
                var it = d.itens[idx];
                h += '<tr><td>' + esc(li.titulo) + '</td>' +
                  FACHADAS.map(function (f) {
                    var v = it.porFachada[f] || {};
                    return '<td>' + esc(String(num(v.qtd))) + ' / ' + esc(String(num(v.total))) + '</td>';
                  }).join('') +
                  '<td>' + (Math.round(li.qtd * 100) / 100) + '</td><td>' + (Math.round(li.total * 100) / 100) + '</td></tr>';
              });
              h += '</table>';
        
              (d.itens || []).forEach(function (it) {
                if (!(it.fotos || []).length && !it.obs) { return; }
                h += '<div class="pr-bl"><b>' + esc(it.titulo) + '</b>';
                if (it.obs) { h += '<div class="pr-tx">' + esc(it.obs) + '</div>'; }
                h += blocoFotos(it.fotos, '');
                h += '</div>';
              });
            }
        
            if ((d.pendencias || []).length) {
              h += '<div class="pr-tit">PENDÊNCIAS POR PAVIMENTO</div>';
              h += '<table><tr><th style="width:24%">Pavimento</th><th>Pendência</th>' +
                '<th style="width:18%">Responsável</th><th style="width:12%">Prazo</th><th style="width:12%">Situação</th></tr>';
              d.pendencias.forEach(function (p) {
                h += '<tr><td>' + esc(p.pavimento) + '</td><td>' + esc(p.desc) + '</td>' +
                  '<td>' + esc(p.responsavel || '') + '</td><td>' + esc(p.prazo || '') + '</td>' +
                  '<td>' + (p.resolvido ? 'Resolvida' : 'Em aberto') + '</td></tr>';
              });
              h += '</table>';
              d.pendencias.forEach(function (p) {
                if (!(p.fotos || []).length) { return; }
                h += '<div class="pr-bl"><b>' + esc(p.pavimento) + ' &mdash; ' + esc(p.desc) + '</b>' +
                  blocoFotos(p.fotos, '') + '</div>';
              });
            }
        
            if (d.mostrarGraficos) {
              h += '<div class="pr-tit">GRÁFICOS DO MÊS</div>';
              h += '<div class="pr-graf">';
              graficos(d, 640, 320).forEach(function (g) {
                var url = '';
                try { url = g.cv.toDataURL('image/png'); } catch (e) {}
                if (url) { h += '<img src="' + url + '" alt="' + esc(g.titulo) + '">'; }
              });
              h += '</div>';
            }
        
            h += '<div class="pr-tit">ATIVIDADES REALIZADAS</div>';
            h += '<div class="pr-2col">' +
              '<div class="pr-bl"><b>PÓRTICO</b>' + listaHtml(d.atividadesPortico) + '</div>' +
              '<div class="pr-bl"><b>' + esc((d.cliente || 'CLIENTE').toUpperCase()) + '</b>' + listaHtml(d.atividadesCliente) + '</div>' +
            '</div>';
        
            h += '<div class="pr-tit">PRÓXIMAS ETAPAS</div>';
            h += '<div class="pr-2col">' +
              '<div class="pr-bl"><b>PÓRTICO</b>' + listaHtml(d.proximasPortico) + '</div>' +
              '<div class="pr-bl"><b>' + esc((d.cliente || 'CLIENTE').toUpperCase()) + '</b>' + listaHtml(d.proximasCliente) + '</div>' +
            '</div>';
        
            if ((d.fotosFinal || []).length) {
              h += '<div class="pr-tit">REGISTROS FINAIS</div>' + blocoFotos(d.fotosFinal, '');
            }
        
            h += '<div class="pr-fim">' + esc(d.encerramento || 'PÓRTICO ESQUADRIAS') + '</div>';
            return h;
          }
        
          function areaImpressao() {
            var alvo = document.getElementById('p92Impressao');
            if (!alvo) {
              alvo = document.createElement('div');
              alvo.id = 'p92Impressao';
              document.body.appendChild(alvo);
            }
            return alvo;
          }
        
          function imprimir() {
            if (!atual) { return; }
            var alvo = areaImpressao();
            alvo.innerHTML = montarHtml(atual);
            espera(180, function () {
              try { window.print(); } catch (e) { aviso('Não consegui abrir a impressão.', 'erro'); }
            });
          }
        
          /* ================================================================ *
           * salvar em PDF
           * ================================================================ */
          function carregarUm(url, ok, falhou) {
            var s = document.createElement('script');
            s.src = url;
            s.async = true;
            s.onload = function () { ok(); };
            s.onerror = function () {
              try { s.parentNode.removeChild(s); } catch (e) {}
              falhou();
            };
            (document.head || document.documentElement).appendChild(s);
          }
        
          function carregarLista(urls, testar, ok, falhou) {
            if (testar()) { ok(); return; }
            var i = 0;
            function tenta() {
              if (i >= urls.length) { falhou(); return; }
              carregarUm(urls[i++], function () {
                if (testar()) { ok(); } else { tenta(); }
              }, tenta);
            }
            tenta();
          }
        
          function temCanvas() { return typeof window.html2canvas === 'function'; }
          function temPdf() { return !!(window.jspdf && window.jspdf.jsPDF) || typeof window.jsPDF === 'function'; }
          function classePdf() {
            if (window.jspdf && window.jspdf.jsPDF) { return window.jspdf.jsPDF; }
            return window.jsPDF;
          }
        
          function prepararLibs(ok, falhou) {
            carregarLista(FONTES_CANVAS, temCanvas, function () {
              carregarLista(FONTES_PDF, temPdf, ok, falhou);
            }, falhou);
          }
        
          function esperaLiga(txt) {
            var e = document.getElementById('p92Espera');
            if (!e) {
              e = document.createElement('div');
              e.id = 'p92Espera';
              e.innerHTML = '<div class="cx"><b>Gerando PDF...</b><small id="p92EsperaTxt"></small><div class="bar"><i></i></div></div>';
              document.body.appendChild(e);
            }
            e.style.display = 'flex';
            var t = document.getElementById('p92EsperaTxt');
            if (t) { t.textContent = txt || 'preparando as páginas'; }
          }
        
          function esperaTexto(txt) {
            var t = document.getElementById('p92EsperaTxt');
            if (t) { t.textContent = txt; }
          }
        
          function esperaDesliga() {
            var e = document.getElementById('p92Espera');
            if (e) { e.style.display = 'none'; }
          }
        
          function esperarImagens(raiz, depois) {
            var imgs = [].slice.call(raiz.querySelectorAll('img'));
            var faltam = imgs.length;
            if (!faltam) { depois(); return; }
            var pronto = false;
            function passo() {
              faltam--;
              if (faltam <= 0 && !pronto) { pronto = true; depois(); }
            }
            imgs.forEach(function (im) {
              if (im.complete && im.naturalWidth) { passo(); return; }
              im.addEventListener('load', passo);
              im.addEventListener('error', passo);
            });
            espera(9000, function () { if (!pronto) { pronto = true; depois(); } });
          }
        
          function repartir(palco, folha) {
            var filhos = [].slice.call(folha.children);
            var grupos = [], grupo = [], alt = 0;
            filhos.forEach(function (el) {
              var h = el.getBoundingClientRect().height + 6;
              if (grupo.length && (alt + h) > ALT_PX) { grupos.push(grupo); grupo = []; alt = 0; }
              grupo.push(el);
              alt += h;
            });
            if (grupo.length) { grupos.push(grupo); }
            var pags = [];
            grupos.forEach(function (g) {
              var p = document.createElement('div');
              p.className = 'p92-folha p92-pag';
              g.forEach(function (el) { p.appendChild(el); });
              palco.appendChild(p);
              pags.push(p);
            });
            try { palco.removeChild(folha); } catch (e) {}
            return pags;
          }
        
          function fatias(cv, alturaFatia) {
            var saida = [], y = 0;
            while (y < cv.height) {
              var h = Math.min(alturaFatia, cv.height - y);
              var c2 = document.createElement('canvas');
              c2.width = cv.width;
              c2.height = h;
              var ctx = c2.getContext('2d');
              ctx.fillStyle = '#fff';
              ctx.fillRect(0, 0, c2.width, h);
              ctx.drawImage(cv, 0, y, cv.width, h, 0, 0, cv.width, h);
              saida.push({ url: c2.toDataURL('image/jpeg', 0.9), alt: h, larg: cv.width });
              y += h;
            }
            return saida;
          }
        
          function nomeArquivo(d) {
            var base = 'FPDO';
            var obra = d.obra ? '_' + limpaNome(d.obra) : '';
            var mes = d.mes ? '_' + limpaNome(d.mes) : '';
            if (!mes) {
              var n = new Date();
              function z(v) { return (v < 10 ? '0' : '') + v; }
              mes = '_' + n.getFullYear() + '-' + z(n.getMonth() + 1) + '-' + z(n.getDate());
            }
            return limpaNome(base + obra + mes);
          }
        
          function gerarPdf(botao) {
            if (!atual) { return; }
            if (botao.__ocupado) { return; }
            botao.__ocupado = true;
            botao.disabled = true;
            var rotulo = botao.textContent;
            botao.textContent = 'Gerando...';
        
            function fim() {
              botao.__ocupado = false;
              botao.disabled = false;
              botao.textContent = rotulo;
            }
        
            esperaLiga('preparando o gerador de PDF');
        
            prepararLibs(function () {
              var d = atual;
              var palco = document.getElementById('p92Palco');
              if (!palco) {
                palco = document.createElement('div');
                palco.id = 'p92Palco';
                document.body.appendChild(palco);
              }
              palco.innerHTML = '';
        
              var folha = document.createElement('div');
              folha.className = 'p92-folha';
              folha.innerHTML = montarHtml(d);
              palco.appendChild(folha);
        
              esperaTexto('carregando as fotos');
              esperarImagens(folha, function () {
                var pags;
                try {
                  pags = repartir(palco, folha);
                } catch (e) {
                  palco.innerHTML = '';
                  esperaDesliga();
                  aviso('Não consegui montar as páginas do PDF.', 'erro');
                  fim();
                  return;
                }
        
                var PDF = classePdf();
                var doc = new PDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
                var primeira = true;
                var i = 0;
        
                function proxima() {
                  if (i >= pags.length) {
                    try {
                      doc.save(nomeArquivo(d) + '.pdf');
                      aviso('PDF gerado: ' + nomeArquivo(d) + '.pdf');
                    } catch (e) {
                      aviso('Não consegui salvar o arquivo PDF.', 'erro');
                    }
                    palco.innerHTML = '';
                    esperaDesliga();
                    fim();
                    return;
                  }
                  esperaTexto('página ' + (i + 1) + ' de ' + pags.length);
                  var alvo = pags[i++];
                  window.html2canvas(alvo, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    windowWidth: LARG_PX,
                    width: LARG_PX
                  }).then(function (cv) {
                    var altPagPx = Math.floor(cv.width * (ALT_MM / LARG_MM));
                    var pedacos = (cv.height > (altPagPx + 4)) ? fatias(cv, altPagPx)
                                : [{ url: cv.toDataURL('image/jpeg', 0.9), alt: cv.height, larg: cv.width }];
                    pedacos.forEach(function (pc) {
                      if (!primeira) { doc.addPage(); }
                      primeira = false;
                      var hmm = pc.alt * (LARG_MM / pc.larg);
                      if (hmm > ALT_MM) { hmm = ALT_MM; }
                      doc.addImage(pc.url, 'JPEG', MARG_MM, MARG_MM, LARG_MM, hmm, undefined, 'FAST');
                    });
                    espera(20, proxima);
                  })['catch'](function () {
                    palco.innerHTML = '';
                    esperaDesliga();
                    aviso('Não consegui desenhar o PDF. Use Imprimir e escolha Salvar como PDF.', 'erro');
                    fim();
                  });
                }
        
                proxima();
              });
            }, function () {
              esperaDesliga();
              aviso('Sem internet para o gerador de PDF. Use Imprimir / PDF e escolha Salvar como PDF.', 'erro');
              fim();
            });
          }
        
          /* ================================================================ *
           * exportar e importar
           * ================================================================ */
          function exportar() {
            if (!atual) { return; }
            try {
              var txt = JSON.stringify({ tipo: 'p92_fpdo', versao: 1, dados: atual }, null, 2);
              var b = new Blob([txt], { type: 'application/json' });
              var a = document.createElement('a');
              a.href = URL.createObjectURL(b);
              a.download = nomeArquivo(atual) + '.json';
              document.body.appendChild(a);
              a.click();
              espera(600, function () {
                try { URL.revokeObjectURL(a.href); document.body.removeChild(a); } catch (e) {}
              });
              aviso('Arquivo do relatório exportado.');
            } catch (e) { aviso('Não consegui exportar.', 'erro'); }
          }
        
          function importar() {
            var inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = '.json,application/json';
            inp.style.display = 'none';
            document.body.appendChild(inp);
            inp.addEventListener('change', function () {
              var arq = inp.files && inp.files[0];
              if (!arq) { return; }
              var fr = new FileReader();
              fr.onload = function () {
                try {
                  var o = JSON.parse(String(fr.result));
                  var d = o && o.dados ? o.dados : o;
                  if (!d || typeof d !== 'object') { throw new Error('formato'); }
                  d.id = novoId('fpdo');
                  atual = arrumar(d);
                  guardar(atual, function () {});
                  sec = 'dados';
                  render();
                  aviso('Relatório importado.');
                } catch (e) { aviso('Arquivo não reconhecido.', 'erro'); }
                try { document.body.removeChild(inp); } catch (e2) {}
              };
              fr.readAsText(arq);
            });
            inp.click();
          }
        
          /* ================================================================ *
           * cliques
           * ================================================================ */
          function lupa(url) {
            var d = document.createElement('div');
            d.className = 'p92-lupa';
            d.innerHTML = '<img src="' + esc(url) + '" alt="foto">';
            d.addEventListener('click', function () {
              try { document.body.removeChild(d); } catch (e) {}
            });
            document.body.appendChild(d);
          }
        
          function mover(arr, id, passo) {
            var i, k;
            for (i = 0; i < arr.length; i++) { if (arr[i].id === id) { break; } }
            if (i >= arr.length) { return; }
            k = i + passo;
            if (k < 0 || k >= arr.length) { return; }
            var tmp = arr[i];
            arr[i] = arr[k];
            arr[k] = tmp;
          }
        
          function aoClicar(ev) {
            var el = ev.target;
            var b = el && el.closest ? el.closest('[data-a]') : null;
            if (!b) { return; }
            var a = b.getAttribute('data-a');
            var id = b.getAttribute('data-i');
            var alvo = b.getAttribute('data-alvo');
        
            if (a === 'lupa') { ev.preventDefault(); lupa(b.getAttribute('src')); return; }
        
            ev.preventDefault();
        
            if (a === 'fechar') { fechar(); return; }
            if (a === 'sec') { sec = b.getAttribute('data-s') || 'dados'; render(); return; }
            if (a === 'voltar') { render(); return; }
            if (a === 'lista') { verLista(); return; }
            if (a === 'salvar') { salvarAgora(); return; }
            if (a === 'imprimir') { imprimir(); return; }
            if (a === 'pdf') { gerarPdf(b); return; }
            if (a === 'editorVisual') { if (window.p96AbrirEditor) { window.p96AbrirEditor(); } else { aviso('Editor visual ainda carregando.', 'erro'); } return; }
            if (a === 'exportar') { exportar(); return; }
            if (a === 'importar') { importar(); return; }
        
            if (a === 'novo') {
              atual = arrumar(fpdoNovo(null));
              sec = 'dados';
              guardar(atual, function () {});
              try { localStorage.setItem(K_ULT, atual.id); } catch (e) {}
              render();
              aviso('Novo relatório criado.');
              return;
            }
        
            if (a === 'copiarMes') {
              if (!atual) { return; }
              var novo = arrumar(fpdoNovo(atual));
              atual = novo;
              sec = 'dados';
              guardar(atual, function () {});
              try { localStorage.setItem(K_ULT, atual.id); } catch (e) {}
              render();
              aviso('Copiei a estrutura do mês anterior. As fotos do depois viraram o novo antes.');
              return;
            }
        
            if (a === 'excluir') {
              if (!atual) { return; }
              if (!confirm('Excluir este relatório FPDO?')) { return; }
              apagar(atual.id, function () {
                atual = arrumar(fpdoNovo(null));
                sec = 'dados';
                render();
                aviso('Relatório excluído.');
              });
              return;
            }
        
            if (a === 'puxarObra') {
              var o = obraAtual();
              if (!o) { aviso('Não achei a obra aberta no painel.', 'erro'); return; }
              atual.obra = o.nome || atual.obra;
              atual.cliente = o.cliente || atual.cliente;
              atual.local = o.local || o.cidade || atual.local;
              salvarDepois();
              render();
              aviso('Dados da obra atualizados.');
              return;
            }
        
            if (a === 'lerReg') {
              var reg = null, i;
              for (i = 0; i < lista.length; i++) { if (lista[i].id === id) { reg = lista[i]; break; } }
              if (!reg) { return; }
              atual = arrumar(reg);
              sec = 'dados';
              try { localStorage.setItem(K_ULT, atual.id); } catch (e) {}
              render();
              return;
            }
            if (a === 'dupReg') {
              var org = null, k;
              for (k = 0; k < lista.length; k++) { if (lista[k].id === id) { org = lista[k]; break; } }
              if (!org) { return; }
              var cop = arrumar(JSON.parse(JSON.stringify(org)));
              cop.id = novoId('fpdo');
              cop.criado = new Date().toISOString();
              atual = cop;
              sec = 'dados';
              guardar(atual, function () { verLista(); });
              aviso('Relatório duplicado.');
              return;
            }
            if (a === 'delReg') {
              if (!confirm('Excluir este relatório salvo?')) { return; }
              apagar(id, function () {
                if (atual && atual.id === id) { atual = arrumar(fpdoNovo(null)); }
                verLista();
                aviso('Relatório excluído.');
              });
              return;
            }
        
            if (a === 'elevMais') { atual.elevacoes.push(elevNova('NOVA ELEVAÇÃO', mesAnterior(), atual.mes || mesAtual())); salvarDepois(); render(); return; }
            if (a === 'elevMenos') {
              if (!confirm('Remover esta elevação e as fotos dela?')) { return; }
              atual.elevacoes = atual.elevacoes.filter(function (e) { return e.id !== id; });
              salvarDepois(); render(); return;
            }
            if (a === 'elevMover') { mover(atual.elevacoes, id, Number(b.getAttribute('data-d'))); salvarDepois(); render(); return; }
        
            if (a === 'itemMais') { atual.itens.push(itemNovo('NOVO ITEM')); salvarDepois(); render(); return; }
            if (a === 'itemMenos') {
              if (!confirm('Remover este item?')) { return; }
              atual.itens = atual.itens.filter(function (x) { return x.id !== id; });
              salvarDepois(); render(); return;
            }
            if (a === 'itemMover') { mover(atual.itens, id, Number(b.getAttribute('data-d'))); salvarDepois(); render(); return; }
        
            if (a === 'pendMais') { atual.pendencias.push(pendNova('ANDAR', '')); salvarDepois(); render(); return; }
            if (a === 'pendMenos') {
              if (!confirm('Remover esta pendência?')) { return; }
              atual.pendencias = atual.pendencias.filter(function (x) { return x.id !== id; });
              salvarDepois(); render(); return;
            }
                if (a === 'pendMover') { mover(atual.pendencias, id, Number(b.getAttribute('data-d'))); salvarDepois(); render(); return; }
            if (a === 'slideMais') {
              atual.slidesCustomizados.push({ id: novoId('slide'), titulo: 'Novo slide', texto: '', imagemUrl: '', cor: '0F172A' });
              salvarDepois(); render(); return;
            }
            if (a === 'slideMenos') {
              if (!confirm('Remover este slide personalizado?')) { return; }
              atual.slidesCustomizados = atual.slidesCustomizados.filter(function (x) { return x.id !== id; });
              salvarDepois(); render(); return;
            }
            if (a === 'galeria') {
              escolherImagens(function (itens) {
                var arr = grupoFotos(alvo);
                if (!arr) { return; }
                itens.forEach(function (f) { arr.push(f); });
                salvarDepois();
                render();
                if (itens.length) { aviso(itens.length + ' foto(s) adicionada(s).'); }
              });
              return;
            }
            if (a === 'camera') {
              abrirCamera(function (itens) {
                var arr = grupoFotos(alvo);
                if (!arr) { return; }
                itens.forEach(function (f) { arr.push(f); });
                salvarDepois();
                render();
              });
              return;
            }
            if (a === 'fapagar') {
              var g = grupoFotos(alvo);
              if (!g) { return; }
              var pos = -1, z;
              for (z = 0; z < g.length; z++) { if (g[z].id === id) { pos = z; break; } }
              if (pos < 0) { return; }
              g.splice(pos, 1);
              salvarDepois();
              render();
              return;
            }
            if (a === 'fmover') {
              var g2 = grupoFotos(alvo);
              if (!g2) { return; }
              mover(g2, id, Number(b.getAttribute('data-d')));
              salvarDepois();
              render();
              return;
            }
          }
        
          /* ================================================================ *
           * botao no Menu de Abas
           * ================================================================ */
          function caixaMenu() {
            return document.querySelector('#meu-menu-abas .tabs') ||
                   document.querySelector('details#meu-menu-abas .tabs') ||
                   null;
          }
        
          function colocarBotao() {
            var fixo = document.getElementById('btn-tab-fpdo');
            var antigo = document.getElementById('p92Botao');
            if (fixo) {
              if (antigo && antigo.parentNode) { antigo.parentNode.removeChild(antigo); }
              return;
            }
            var cx = caixaMenu();
            var b = antigo || document.getElementById('p92Botao');
            if (!b) {
              b = document.createElement('button');
              b.id = 'p92Botao';
              b.type = 'button';
              b.textContent = 'Relatório FPDO';
              b.title = 'Fique por dentro da obra: relatório mensal com fotos, gráficos e pendências';
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
              b.style.cssText += ';position:fixed;right:14px;bottom:196px;z-index:2147482000;';
              document.body.appendChild(b);
            }
          }
        
          function iniciar() {
            estilo();
            colocarBotao();
            window.__varreduraUnica(colocarBotao);
          }
        
          window.p92AbrirFpdo = function () { abrir(); };
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        })();
    
