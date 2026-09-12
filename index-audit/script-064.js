
        /* ====== PATCH94_FPDO_PPTX_OK - Relatorio FPDO em slides 16:9 + Salvar PPTX ====== */
        (function () {
          'use strict';
          if (window.__PS94) { return; }
          window.__PS94 = true;
        
          /* ================================================================ *
           * medidas do slide (igual a apresentacao: 16:9, fundo preto)
           * ================================================================ */
          var LARG = 1280;                 /* largura da folha na tela, em px  */
          var ALT = 720;                   /* altura  da folha na tela, em px  */
          var PT = ALT / 540;              /* 1 ponto do PowerPoint em px      */
          var POL_L = 13.333;              /* largura do slide em polegadas    */
          var POL_A = 7.5;                 /* altura  do slide em polegadas    */
          var MAX_SLIDES = 90;
        
          var FUNDO = '000000';
          var BRANCO = '000000';
          var AMARELO = 'FFFF00';
          var AZUL = '00B0F0';
          var VERDE = '92D050';
          var VERMELHO = 'FF0000';
          var CINZA = '9AA3AF';
          var CORES_ITEM = [AMARELO, AZUL, VERDE, 'FF7A00', 'C00000', 'FFC000'];
        
          var FACHADAS = ['Leste', 'Sul', 'Oeste', 'Norte'];
        
          var BASE = 'p92_fpdo_v1';
          var LOJA = 'reg';
          var K_LS = 'p92_fpdo_ls_v1';
          var K_ULT = 'p92_fpdo_ultimo_v1';
        
          var FONTES_PPTX = [
            'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
            'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js',
            'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
          ];
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
        
          function num(v) {
            var n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
            return isNaN(n) ? 0 : n;
          }
        
          function espera(ms, fn) { setTimeout(fn, ms); }
        
          function limpaNome(s) {
            return String(s || '').normalize ?
              String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') :
              String(s || '').replace(/[^A-Za-z0-9_\-]+/g, '_');
          }
        
          function aviso(msg, tipo) {
            if (typeof window.mostrarToastPainel === 'function') {
              try { window.mostrarToastPainel(msg, tipo === 'erro' ? 'erro' : 'ok'); return; } catch (e) {}
            }
            var d = document.getElementById('p94Aviso');
            if (!d) {
              d = document.createElement('div');
              d.id = 'p94Aviso';
              document.body.appendChild(d);
            }
            d.textContent = String(msg || '');
            d.className = tipo === 'erro' ? 'p94-ruim' : 'p94-bom';
            d.style.display = 'block';
            if (d.__t) { clearTimeout(d.__t); }
            d.__t = setTimeout(function () { d.style.display = 'none'; }, 4200);
          }
        
          function linhas(txt) {
            return String(txt || '').split(/\r?\n/)
              .map(function (l) { return l.replace(/^[-*\u2022]\s*/, '').replace(/\s+$/, ''); })
              .filter(function (l) { return l.replace(/\s+/g, '') !== ''; });
          }
        
          function pedacos(arr, n) {
            var saida = [], i;
            for (i = 0; i < arr.length; i += n) { saida.push(arr.slice(i, i + n)); }
            return saida;
          }
        
          function dataBonita(iso) {
            var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
            if (!m) { return String(iso || ''); }
            return m[3] + '/' + m[2] + '/' + m[1];
          }
        
          /* ================================================================ *
           * ler o relatorio que esta aberto (o painel salva sozinho)
           * ================================================================ */
          function lsLer() {
            try { return JSON.parse(localStorage.getItem(K_LS) || '[]') || []; } catch (e) { return []; }
          }
        
          function abrirBase(ok, falhou) {
            try {
              if (!window.indexedDB) { falhou(); return; }
              var req = window.indexedDB.open(BASE, 1);
              req.onupgradeneeded = function () {
                try { req.result.createObjectStore(LOJA, { keyPath: 'id' }); } catch (e) {}
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
        
          /* pede ao painel para gravar o que esta na tela e devolve o registro */
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
                  aviso('Abra o Relatorio FPDO, preencha e salve antes de exportar.', 'erro');
                  return;
                }
                depois(reg);
              });
            });
          }
        
          function contas(d) {
            var qtd = 0, total = 0;
            (d.itens || []).forEach(function (it) {
              FACHADAS.forEach(function (f) {
                var v = (it.porFachada || {})[f] || {};
                qtd += num(v.qtd);
                total += num(v.total);
              });
            });
            return { qtd: qtd, total: total, pct: total > 0 ? (qtd / total) * 100 : 0 };
          }
        
          /* ================================================================ *
           * pecas do slide (o mesmo desenho serve para a tela, o PDF e o PPTX)
           *   k = txt | par | img | quad     l/t/w/h em % do slide
           * ================================================================ */
          function T(l, t, w, h, v, o) {
            o = o || {};
            return { k: 'txt', l: l, t: t, w: w, h: h, v: v, s: o.s || 14, b: !!o.b,
                     c: o.c || BRANCO, al: o.al || 'left', va: o.va || 'middle', f: o.f || '' };
          }
        
          function P(l, t, w, h, v, o) {
            o = o || {};
            return { k: 'par', l: l, t: t, w: w, h: h, v: v, s: o.s || 13, b: !!o.b,
                     c: o.c || BRANCO, al: o.al || 'left', va: 'top', pt: !!o.pt, f: o.f || '' };
          }
        
          function I(l, t, w, h, url, fit) {
            return { k: 'img', l: l, t: t, w: w, h: h, u: String(url || ''), fit: fit || 'contain' };
          }
        
          function Q(l, t, w, h, cor) {
            return { k: 'quad', l: l, t: t, w: w, h: h, c: cor || BRANCO };
          }
        
          function rodape(el, obra) {
            el.push(T(69.0, 91.5, 28.0, 5.2, String(obra || '').toUpperCase(),
                      { s: 16, b: true, al: 'right', c: BRANCO }));
          }
        
          function selo(el, l) {
            el.push(T(typeof l === 'number' ? l : 3.0, 88.0, 30.0, 5.6, 'porticoesquadrias',
                      { s: 19, b: true, c: BRANCO }));
          }
        
          /* ---------------------------------------------------------------- *
           * fotos: mesma disposicao da apresentacao (1, 2 ou 3 por slide)
           * ---------------------------------------------------------------- */
          function faixaFotos(el, fotos, topo, altura) {
            var n = fotos.length;
            var caixas;
            if (n <= 1) { caixas = [[27.0, 46.0]]; }
            else if (n === 2) { caixas = [[4.0, 45.0], [51.0, 45.0]]; }
            else { caixas = [[3.0, 30.0], [35.0, 30.0], [67.0, 30.0]]; }
            fotos.slice(0, caixas.length).forEach(function (f, i) {
              el.push(I(caixas[i][0], topo, caixas[i][1], altura, f.url));
              if (f.leg) {
                el.push(T(caixas[i][0], topo + altura + 0.4, caixas[i][1], 4.0, f.leg,
                          { s: 11, al: 'center', c: CINZA }));
              }
            });
          }
        
          /* ================================================================ *
           * monta a lista de slides a partir do relatorio
           * ================================================================ */
          function montarSlides(d) {
            var S = [];
            var obra = d.obra || '';
            var mes = d.mes || '';
            var cliente = d.cliente || 'CLIENTE';
            var capa = d.capaFotos || [];
            var c = contas(d);
        
            function nova() { var s = { el: [] }; S.push(s); return s.el; }
        
            /* --- 1) capa ------------------------------------------------- */
            var el = nova();
            if (capa.length) { el.push(I(48.0, 8.0, 49.0, 84.0, capa[0].url)); }
            el.push(T(3.0, 26.0, 43.0, 16.0, d.titulo || 'FIQUE POR DENTRO DA OBRA',
                      { s: 32, b: true, al: 'center' }));
            el.push(T(3.0, 43.0, 43.0, 7.0, obra.toUpperCase(), { s: 22, b: true, al: 'center', c: AMARELO }));
            if (mes) { el.push(T(3.0, 50.5, 43.0, 6.0, mes, { s: 18, al: 'center', c: BRANCO })); }
            selo(el);
        
            /* --- 2) dados da obra ---------------------------------------- */
            el = nova();
            var fotoLado = capa.length > 1 ? capa[1] : (capa.length ? capa[0] : null);
            if (fotoLado) { el.push(I(0.0, 0.0, 42.0, 100.0, fotoLado.url, 'cover')); }
            var dados = [
              ['Obra: ', obra],
              ['Mes: ', mes],
              ['Cliente: ', cliente],
              ['Local: ', d.local || ''],
              ['Responsavel: ', d.responsavel || ''],
              ['Gestor Portico: ', d.gestor || ''],
              ['Codigo da obra: ', d.codigoObra || ''],
              ['Contrato: ', d.contrato || ''],
              ['Cidade / UF: ', d.cidadeUf || ''],
              ['Fiscal do cliente: ', d.fiscalCliente || ''],
              ['Equipe responsavel: ', d.equipeResponsavel || ''],
              ['Status da obra: ', d.statusObra || ''],
              ['Previsao de conclusao: ', d.previsaoConclusao || ''],
              ['Data do relatorio: ', dataBonita(d.dataRelatorio)],
              ['Avanco da instalacao: ', (Math.round(c.pct * 10) / 10) + '%']
            ];
            var y = 22.0;
            dados.forEach(function (par) {
              if (!String(par[1] || '').replace(/\s/g, '')) { return; }
              el.push(T(46.0, y, 51.0, 7.0, [{ x: par[0], b: true }, { x: String(par[1]) }], { s: 20 }));
              y += 7.4;
            });
            selo(el, fotoLado ? 46.0 : 3.0);
        
            /* --- 3) elevacoes: mes anterior x mes atual ------------------ */
            (d.elevacoes || []).forEach(function (e) {
              var a = e.fotosAntes || [];
              var p = e.fotosDepois || [];
              var n = Math.max(a.length, p.length);
              if (!n) { return; }
              var i;
              for (i = 0; i < n; i++) {
                var q = nova();
                q.push(T(28.0, 10.6, 44.0, 6.0, (e.nome || 'ELEVACAO').toUpperCase(),
                         { s: 20, b: true, al: 'center' }));
                q.push(T(14.3, 18.6, 24.0, 5.4, (e.rotAntes || 'MES ANTERIOR').toUpperCase(),
                         { s: 16, b: true, al: 'center' }));
                q.push(T(62.0, 18.6, 24.0, 5.4, (e.rotDepois || 'MES ATUAL').toUpperCase(),
                         { s: 16, b: true, al: 'center' }));
                if (a[i]) { q.push(I(5.6, 26.5, 42.3, 60.0, a[i].url)); }
                if (p[i]) { q.push(I(54.4, 26.5, 42.1, 60.0, p[i].url)); }
                if (a[i] && a[i].leg) { q.push(T(5.6, 86.8, 42.3, 4.0, a[i].leg, { s: 11, al: 'center', c: CINZA })); }
                if (p[i] && p[i].leg) { q.push(T(54.4, 86.8, 42.1, 4.0, p[i].leg, { s: 11, al: 'center', c: CINZA })); }
                if (e.obs && i === 0) { q.push(T(3.0, 91.4, 40.0, 5.0, e.obs, { s: 12, c: CINZA })); }
                rodape(q, obra);
              }
            });
        
            /* --- 4) itens instalados: fotos com legenda de cor ----------- */
            (d.itens || []).forEach(function (it, idx) {
              var cor = CORES_ITEM[idx % CORES_ITEM.length];
              var fotos = it.fotos || [];
              if (!fotos.length) { return; }
              pedacos(fotos, 2).forEach(function (g) {
                var q = nova();
                q.push(T(25.0, 10.6, 50.0, 6.0, (it.titulo || 'ITEM').toUpperCase(),
                         { s: 20, b: true, al: 'center' }));
                if (g[0]) { q.push(I(3.0, 18.0, 46.0, 71.5, g[0].url)); }
                if (g[1]) { q.push(I(51.0, 18.0, 46.0, 71.5, g[1].url)); }
                q.push(Q(3.3, 92.8, 1.6, 2.8, cor));
                q.push(T(5.4, 91.4, 40.0, 5.0, (it.titulo || '').toUpperCase(), { s: 16, b: true }));
                rodape(q, obra);
              });
            });
        
            /* --- 5) quadro de quantidades -------------------------------- */
            var temNumero = false;
            (d.itens || []).forEach(function (it) {
              FACHADAS.forEach(function (f) {
                var v = (it.porFachada || {})[f] || {};
                if (num(v.qtd) || num(v.total)) { temNumero = true; }
              });
            });
            if (temNumero) {
              var colL = [4.0, 30.0, 41.0, 52.0, 63.0, 74.0, 85.0];
              var colW = [26.0, 11.0, 11.0, 11.0, 11.0, 11.0, 11.0];
              var cab = ['ITEM', 'LESTE', 'SUL', 'OESTE', 'NORTE', 'INSTALADO', 'PREVISTO'];
              var blocos = pedacos(d.itens || [], 9);
              blocos.forEach(function (bloco, bi) {
                el = nova();
                el.push(T(25.0, 8.5, 50.0, 6.0,
                          'ITENS INSTALADOS' + (blocos.length > 1 ? ' (' + (bi + 1) + '/' + blocos.length + ')' : ''),
                          { s: 20, b: true, al: 'center' }));
                var ly = 18.0, lh = 6.6;
                el.push(Q(4.0, ly, 92.0, lh, '10365F'));
                cab.forEach(function (tx, i) {
                  el.push(T(colL[i] + 0.6, ly, colW[i] - 1.2, lh, tx,
                            { s: 13, b: true, al: i === 0 ? 'left' : 'center', c: AMARELO }));
                });
                ly += lh;
                bloco.forEach(function (it, k) {
                  var somaQ = 0, somaT = 0;
                  if (k % 2 === 1) { el.push(Q(4.0, ly, 92.0, lh, '15202E')); }
                  el.push(T(colL[0] + 0.6, ly, colW[0] - 1.2, lh, (it.titulo || '').toUpperCase(), { s: 12, b: true }));
                  FACHADAS.forEach(function (f, i) {
                    var v = (it.porFachada || {})[f] || {};
                    somaQ += num(v.qtd);
                    somaT += num(v.total);
                    el.push(T(colL[i + 1], ly, colW[i + 1], lh, num(v.qtd) + ' / ' + num(v.total),
                              { s: 12, al: 'center' }));
                  });
                  el.push(T(colL[5], ly, colW[5], lh, String(Math.round(somaQ * 100) / 100), { s: 12, al: 'center', c: VERDE }));
                  el.push(T(colL[6], ly, colW[6], lh, String(Math.round(somaT * 100) / 100), { s: 12, al: 'center' }));
                  ly += lh;
                });
                if (bi === blocos.length - 1) {
                  el.push(Q(4.0, ly + 0.6, 92.0, 0.25, '3A4756'));
                  el.push(T(4.0, ly + 1.6, 92.0, 6.0,
                            'Avanco geral da instalacao: ' + (Math.round(c.pct * 10) / 10) + '%  (' +
                            (Math.round(c.qtd * 100) / 100) + ' de ' + (Math.round(c.total * 100) / 100) + ')',
                            { s: 15, b: true, c: AMARELO }));
                }
                rodape(el, obra);
              });
            }
        
            /* --- 6) pendencias por pavimento ----------------------------- */
            (d.pendencias || []).forEach(function (p) {
              var fotos = p.fotos || [];
              var titulo = (p.pavimento || 'PAVIMENTO').toUpperCase() +
                           (p.desc ? ' \u2013 ' + String(p.desc).toUpperCase() : '');
              var grupos = fotos.length ? pedacos(fotos, 3) : [[]];
              grupos.forEach(function (g) {
                var q = nova();
                q.push(T(12.0, 10.0, 76.0, 7.0, titulo, { s: 18, b: true, al: 'center' }));
                if (g.length) {
                  faixaFotos(q, g, 22.0, 63.5);
                } else {
                  q.push(T(12.0, 45.0, 76.0, 8.0, 'Sem fotos registradas.', { s: 15, al: 'center', c: CINZA }));
                }
                var pe = [];
                if (p.responsavel) { pe.push('Responsavel: ' + p.responsavel); }
                if (p.prazo) { pe.push('Prazo: ' + dataBonita(p.prazo)); }
                pe.push(p.resolvido ? 'Resolvida' : 'Em aberto');
                q.push(T(3.0, 91.4, 55.0, 5.0, pe.join('   \u00b7   '),
                         { s: 13, b: true, c: p.resolvido ? VERDE : AMARELO }));
                rodape(q, obra);
              });
            });
        
            /* --- 7) atividades realizadas e proximas etapas -------------- */
            function slideTexto(titulo, listaPortico, listaCliente) {
              var a = linhas(listaPortico);
              var b = linhas(listaCliente);
              if (!a.length && !b.length) { return; }
              var q = nova();
              q.push(T(1.5, 10.6, 45.0, 6.5, titulo, { s: 20, b: true, c: VERMELHO, f: 'Calibri Light' }));
              q.push(Q(50.2, 19.5, 0.18, 71.0, '5A6472'));
              q.push(T(4.4, 18.0, 43.0, 5.4, 'PORTICO:', { s: 15, b: true }));
              q.push(P(4.4, 24.0, 43.4, 64.0, a, { s: 14, pt: true }));
              q.push(T(52.2, 18.0, 44.0, 5.4, cliente.toUpperCase() + ':', { s: 15, b: true }));
              q.push(P(52.2, 24.0, 44.0, 64.0, b, { s: 14, pt: true }));
              rodape(q, obra);
            }
            slideTexto('Atividades Realizadas', d.atividadesPortico, d.atividadesCliente);
            slideTexto('Proximas Etapas', d.proximasPortico, d.proximasCliente);
            slideTexto('Destaques do Mes', d.destaquesMes, d.riscos);
            slideTexto('Decisoes e Proximos Marcos', d.decisoes, d.proximosMarcos);
            (d.slidesCustomizados || []).forEach(function (s) {
              var linhasSlide = linhas(s.texto || '');
              if (!s.titulo && !linhasSlide.length && !s.imagemUrl) { return; }
              var qLivre = nova();
              var corLivre = /^[0-9A-Fa-f]{6}$/.test(String(s.cor || '')) ? String(s.cor) : '0F172A';
              var layLivre = s.layout || 'imagem-direita';
              var gLivre = { il: s.imageL, it: s.imageT, iw: s.imageW, ih: s.imageH, tl: 4, tt: 28, tw: 55 };
              if (layLivre === 'imagem-esquerda') { gLivre.il = 4; gLivre.it = 24; gLivre.iw = 31; gLivre.ih = 58; gLivre.tl = 40; gLivre.tw = 55; }
              if (layLivre === 'imagem-inteira') { gLivre.il = 4; gLivre.it = 22; gLivre.iw = 92; gLivre.ih = 66; gLivre.tl = 7; gLivre.tt = 12; gLivre.tw = 86; }
              if (layLivre === 'imagem-superior') { gLivre.il = 4; gLivre.it = 31; gLivre.iw = 92; gLivre.ih = 55; gLivre.tl = 4; gLivre.tt = 14; gLivre.tw = 92; }
              if (layLivre === 'texto-duplo') { gLivre.il = 52; gLivre.it = 24; gLivre.iw = 43; gLivre.ih = 58; gLivre.tl = 4; gLivre.tw = 44; }
              qLivre.push(Q(3.0, 8.0, 94.0, 0.8, corLivre));
              qLivre.push(T(gLivre.tl, 12.0, gLivre.tw, 8.0, s.titulo || 'Slide personalizado', { s: 24, b: true, c: '0F172A' }));
              if (s.imagemUrl && layLivre !== 'texto-apenas') { qLivre.push(I(gLivre.il, gLivre.it, gLivre.iw, gLivre.ih, s.imagemUrl, 'cover')); }
              if (linhasSlide.length) { qLivre.push(P(gLivre.tl, gLivre.tt, gLivre.tw, 58.0, linhasSlide, { s: 16, pt: true, c: '374151' })); }
              qLivre.push(T(4.0, 91.0, 60.0, 4.0, (d.obra || '').toUpperCase(), { s: 11, b: true, c: '6B7280' }));
            });
        
            /* --- 8) registros finais ------------------------------------- */
            if ((d.fotosFinal || []).length) {
              pedacos(d.fotosFinal, 3).forEach(function (g, i) {
                var q = nova();
                q.push(T(25.0, 10.0, 50.0, 6.5, i === 0 ? 'REGISTROS FINAIS' : 'REGISTROS FINAIS',
                         { s: 20, b: true, al: 'center' }));
                faixaFotos(q, g, 21.0, 65.0);
                rodape(q, obra);
              });
            }
        
            /* --- acabamento PPTX: cabeçalho recorrente nas páginas internas --- */
            S.forEach(function (slide, si) {
              if (si === 0 || si === S.length - 1) { return; }
              slide.el.push(Q(1.5, 2.4, 97.0, 0.22, 'AAB0B6'));
              slide.el.push(T(3.0, 1.0, 32.0, 3.5, 'ANDAMENTO DA OBRA', { s: 10, b: true, c: '000000', f: 'Calibri' }));
              slide.el.push(T(86.0, 0.8, 10.0, 4.0, 'PÓRTICO', { s: 10, b: true, al: 'right', c: '6B7280', f: 'Calibri Light' }));
            });
        
            /* --- 9) encerramento ----------------------------------------- */
            el = nova();
            selo(el);
            el.push(T(20.0, 40.0, 60.0, 10.0, 'OBRIGADO', { s: 34, b: true, al: 'center' }));
            el.push(T(20.0, 52.0, 60.0, 8.0, (d.encerramento || 'PORTICO ESQUADRIAS').toUpperCase(),
                      { s: 20, b: true, al: 'center', c: AMARELO }));
            if (obra) { el.push(T(20.0, 60.0, 60.0, 6.0, obra.toUpperCase() + (mes ? '  \u00b7  ' + mes : ''), { s: 16, al: 'center', c: CINZA })); }
        
            return S.slice(0, MAX_SLIDES);
          }
        
          /* ================================================================ *
           * desenho na tela / folha (HTML)
           * ================================================================ */
          function runsHtml(v) {
            if (Object.prototype.toString.call(v) !== '[object Array]') { return esc(v); }
            return v.map(function (r) {
              var tx = esc(r.x == null ? r : r.x);
              return r.b ? '<b>' + tx + '</b>' : tx;
            }).join('');
          }
        
          function pecaHtml(e) {
            var pos = 'left:' + e.l + '%;top:' + e.t + '%;width:' + e.w + '%;height:' + e.h + '%;';
            if (e.k === 'quad') {
              return '<div class="p94-q" style="' + pos + 'background:#' + e.c + '"></div>';
            }
            if (e.k === 'img') {
              return '<div class="p94-i" style="' + pos + '">' +
                     '<img src="' + esc(e.u) + '" alt="foto" style="object-fit:' + e.fit + '"></div>';
            }
            var base = pos + 'color:#' + e.c + ';font-size:' + (e.s * PT).toFixed(1) + 'px;' +
                       'text-align:' + (e.al === 'justify' ? 'justify' : e.al) + ';' +
                       (e.b ? 'font-weight:700;' : 'font-weight:400;') +
                       (e.f ? 'font-family:\'' + e.f + '\',Calibri,Arial,sans-serif;' : '');
            if (e.k === 'par') {
              var itens = (e.v || []).map(function (l) {
                return '<div class="p94-li' + (e.pt ? ' p94-pt' : '') + '">' + esc(l) + '</div>';
              }).join('');
              return '<div class="p94-t p94-top" style="' + base + '">' + itens + '</div>';
            }
            return '<div class="p94-t' + (e.va === 'top' ? ' p94-top' : '') + '" style="' + base + '">' +
                   '<span>' + runsHtml(e.v) + '</span></div>';
          }
        
          function folhaHtml(s, n, total) {
            var h = '<div class="p94-folha">';
            (s.el || []).forEach(function (e) { h += pecaHtml(e); });
            h += '<div class="p94-num">' + n + ' / ' + total + '</div>';
            h += '</div>';
            return h;
          }
        
          function todasFolhasHtml(slides) {
            return slides.map(function (s, i) { return folhaHtml(s, i + 1, slides.length); }).join('');
          }
        
          /* ================================================================ *
           * estilo do patch
           * ================================================================ */
          var ID_ESTILO = 'p94Estilo';
        
          function estilo() {
            if (document.getElementById(ID_ESTILO)) { return; }
            var s = document.createElement('style');
            s.id = ID_ESTILO;
            s.type = 'text/css';
            s.textContent = [
              '.p94-folha{position:relative;width:' + LARG + 'px;height:' + ALT + 'px;background:#fff;',
              '  color:#000;overflow:hidden;font-family:Calibri,Arial,Helvetica,sans-serif;',
              '  box-sizing:border-box;margin:0 auto 14px auto}',
              '.p94-folha *{box-sizing:border-box}',
              '.p94-folha .p94-q{position:absolute}',
              '.p94-folha .p94-i{position:absolute;display:flex;align-items:center;justify-content:center;border:1px solid #D1D5DB;background:#F8FAFC;overflow:hidden}',
              '.p94-folha .p94-i img{max-width:100%;max-height:100%;width:100%;height:100%;display:block;object-fit:contain;object-position:center;background:#fff}',
              '.p94-folha .p94-t{position:absolute;display:flex;align-items:center;line-height:1.22;',
              '  white-space:pre-wrap;overflow:hidden}',
              '.p94-folha .p94-t.p94-top{display:block}',
              '.p94-folha .p94-t>span{display:block;width:100%}',
              '.p94-folha .p94-li{margin:0 0 6px 0}',
              '.p94-folha .p94-li.p94-pt{padding-left:14px;position:relative}',
              '.p94-folha .p94-li.p94-pt:before{content:"\\2022";position:absolute;left:0;top:0;color:#ffd400}',
              '.p94-folha .p94-num{position:absolute;right:10px;bottom:6px;font-size:11px;color:#6b7280}',
        
              /* palco fora da tela, usado para gerar o PDF */
              'html body div#p94Palco{display:block !important;position:fixed !important;left:-30000px !important;',
              '  top:0 !important;width:auto !important;max-width:none !important;background:#000 !important;z-index:-1 !important}',
        
              /* janela de conferencia dos slides */
              'html body div#p94Fundo{display:none !important;position:fixed !important;inset:0 !important;',
              '  background:rgba(2,6,23,.92) !important;z-index:2147483000 !important;overflow:auto !important;padding:16px !important}',
              'html body div#p94Fundo[style*="block"]{display:block !important}',
              '#p94Fundo .p94-barra{position:sticky;top:0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;',
              '  padding:8px 10px;background:#0b1220;border:1px solid #334155;border-radius:10px;margin-bottom:12px}',
              '#p94Fundo .p94-barra b{color:#e2e8f0;font:600 14px Arial,sans-serif;margin-right:auto}',
              '#p94Fundo .p94-lupa{width:1280px;max-width:100%;margin:0 auto}',
              '#p94Fundo .p94-mini{transform-origin:top left}',
              '.p94-bt{cursor:pointer;border:1px solid #475569;background:#1e293b;color:#e2e8f0;',
              '  border-radius:8px;padding:7px 12px;font:600 13px Arial,sans-serif}',
              '.p94-bt:hover{background:#334155}',
              '.p94-bt.p94-bt-ok{background:#ea580c;border-color:#ea580c;color:#fff}',
        
              /* aviso de progresso */
              'html body div#p94Espera{display:none !important;position:fixed !important;inset:0 !important;',
              '  background:rgba(2,6,23,.72) !important;z-index:2147483600 !important;align-items:center !important;',
              '  justify-content:center !important}',
              'html body div#p94Espera[style*="flex"]{display:flex !important}',
              '#p94Espera .cx{background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px 20px;',
              '  min-width:280px;color:#e2e8f0;font:14px Arial,sans-serif;text-align:center}',
              '#p94Espera .cx small{display:block;margin-top:6px;color:#94a3b8}',
        
              'html body div#p94Aviso{display:none;position:fixed;left:50%;transform:translateX(-50%);bottom:24px;',
              '  z-index:2147483647;padding:10px 16px;border-radius:10px;font:600 13px Arial,sans-serif;color:#fff}',
              '#p94Aviso.p94-bom{background:#15803d}',
              '#p94Aviso.p94-ruim{background:#b91c1c}',
        
              /* impressao: uma folha 16:9 por pagina, deitada */
              '@media print{',
              '  #p94Impr{display:block !important}',
              '  #p94Impr .p94-folha{page-break-after:always;break-after:page;zoom:1;margin:0 auto}',
              '  #p94Impr .p94-folha:last-child{page-break-after:auto;break-after:auto}',
              '  #p94Impr .p94-num{display:none}',
              '  html body.p94-imp>*:not(#p92Impressao):not(#p94Impr){display:none !important}',
              '  html body.p94-imp{background:#fff !important;margin:0 !important;padding:0 !important}',
              '  @page{size:338.67mm 190.5mm;margin:0}',
              '}',
              '#p94Impr{display:none}'
            ].join('\n');
            (document.head || document.documentElement).appendChild(s);
          }
        
          /* ================================================================ *
           * carregar bibliotecas (tres enderecos, cai para o proximo)
           * ================================================================ */
          function carregarUm(url, ok, falhou) {
            var s = document.createElement('script');
            s.src = url;
            s.async = true;
            s.onload = function () { ok(); };
            s.onerror = function () { try { s.parentNode.removeChild(s); } catch (e) {} falhou(); };
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
        
          function temPptx() { return typeof window.PptxGenJS === 'function' || typeof window.pptxgen === 'function'; }
          function classePptx() { return window.PptxGenJS || window.pptxgen; }
          function temCanvas() { return typeof window.html2canvas === 'function'; }
          function temPdf() { return !!(window.jspdf && window.jspdf.jsPDF) || typeof window.jsPDF === 'function'; }
          function classePdf() { return (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF; }
        
          /* ================================================================ *
           * aviso de progresso
           * ================================================================ */
          function esperaLiga(titulo, txt) {
            var e = document.getElementById('p94Espera');
            if (!e) {
              e = document.createElement('div');
              e.id = 'p94Espera';
              e.innerHTML = '<div class="cx"><b id="p94EspTit"></b><small id="p94EspTxt"></small></div>';
              document.body.appendChild(e);
            }
            e.style.display = 'flex';
            var a = document.getElementById('p94EspTit');
            if (a) { a.textContent = titulo || 'Trabalhando...'; }
            esperaTexto(txt || '');
          }
        
          function esperaTexto(txt) {
            var t = document.getElementById('p94EspTxt');
            if (t) { t.textContent = txt || ''; }
          }
        
          function esperaDesliga() {
            var e = document.getElementById('p94Espera');
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
            espera(12000, function () { if (!pronto) { pronto = true; depois(); } });
          }
        
          function nomeArquivo(d) {
            var n = new Date();
            function z(v) { return (v < 10 ? '0' : '') + v; }
            var base = 'FPDO' + (d.obra ? '_' + limpaNome(d.obra) : '');
            var mes = d.mes ? '_' + limpaNome(d.mes) : '_' + n.getFullYear() + '-' + z(n.getMonth() + 1) + '-' + z(n.getDate());
            return limpaNome(base + mes);
          }
        
          /* ================================================================ *
           * exportar .pptx (PowerPoint de verdade, 16:9, fundo preto)
           * ================================================================ */
          function pol(v, total) { return Math.round((v / 100) * total * 1000) / 1000; }
        
          function pptxRuns(v) {
            if (Object.prototype.toString.call(v) !== '[object Array]') {
              return String(v == null ? '' : v);
            }
            return v.map(function (r) {
              return { text: String(r.x == null ? r : r.x), options: { bold: !!r.b } };
            });
          }
        
          function porSlide(sl, e) {
            var x = pol(e.l, POL_L), y = pol(e.t, POL_A);
            var w = pol(e.w, POL_L), h = pol(e.h, POL_A);
        
            if (e.k === 'quad') {
              sl.addShape('rect', { x: x, y: y, w: w, h: h, fill: { color: e.c }, line: { color: e.c, width: 0 } });
              return;
            }
            if (e.k === 'img') {
              if (!e.u) { return; }
              sl.addImage({ data: e.u, x: x, y: y, w: w, h: h, sizing: { type: e.fit === 'cover' ? 'cover' : 'contain', w: w, h: h } });
              return;
            }
            var comum = {
              x: x, y: y, w: w, h: h,
              fontSize: e.s,
              color: e.c,
              bold: !!e.b,
              align: e.al === 'justify' ? 'left' : e.al,
              valign: e.va === 'top' ? 'top' : 'middle',
              margin: 0,
              fontFace: e.f || 'Calibri',
              isTextBox: true
            };
            if (e.k === 'par') {
              var arr = (e.v || []).map(function (l, i) {
                return { text: String(l), options: { breakLine: true, bullet: e.pt ? { code: '2022' } : false,
                                                    paraSpaceAfter: 4, indentLevel: 0, bold: false } };
              });
              if (!arr.length) { return; }
              sl.addText(arr, comum);
              return;
            }
            sl.addText(pptxRuns(e.v), comum);
          }
        
          function gerarPptx(botao) {
            trava(botao, true);
            esperaLiga('Montando o PowerPoint...', 'lendo o relatorio');
            obterDados(function (d) {
              var slides = montarSlides(d);
              if (!slides.length) {
                esperaDesliga(); trava(botao, false);
                aviso('O relatorio esta vazio. Preencha antes de exportar.', 'erro');
                return;
              }
              esperaTexto('preparando o gerador de PowerPoint');
              carregarLista(FONTES_PPTX, temPptx, function () {
                var Klass = classePptx();
                var p;
                try {
                  p = new Klass();
                  p.defineLayout({ name: 'P94_16x9', width: POL_L, height: POL_A });
                  p.layout = 'P94_16x9';
                  p.author = 'Portico Esquadrias';
                  p.title = (d.titulo || 'FIQUE POR DENTRO DA OBRA') + ' - ' + (d.obra || '');
                } catch (e) {
                  esperaDesliga(); trava(botao, false);
                  aviso('Nao consegui iniciar o gerador de PowerPoint.', 'erro');
                  return;
                }
        
                var i = 0;
                function passo() {
                  if (i >= slides.length) {
                    esperaTexto('gravando o arquivo');
                    var nome = nomeArquivo(d) + '.pptx';
                    try {
                      p.writeFile({ fileName: nome }).then(function () {
                        esperaDesliga(); trava(botao, false);
                        aviso('PowerPoint gerado: ' + nome);
                      })['catch'](function () {
                        esperaDesliga(); trava(botao, false);
                        aviso('Nao consegui gravar o arquivo .pptx.', 'erro');
                      });
                    } catch (e2) {
                      esperaDesliga(); trava(botao, false);
                      aviso('Nao consegui gravar o arquivo .pptx.', 'erro');
                    }
                    return;
                  }
                  esperaTexto('slide ' + (i + 1) + ' de ' + slides.length);
                  var s = slides[i++];
                  try {
                    var sl = p.addSlide();
                    sl.background = { color: FUNDO };
                    (s.el || []).forEach(function (e) {
                      try { porSlide(sl, e); } catch (e3) {}
                    });
                  } catch (e4) {}
                  espera(8, passo);
                }
                passo();
              }, function () {
                esperaDesliga(); trava(botao, false);
                aviso('Sem internet para o gerador de PowerPoint. Tente de novo conectado.', 'erro');
              });
            });
          }
        
          /* ================================================================ *
           * PDF deitado, uma folha 16:9 por pagina
           * ================================================================ */
          function palco() {
            var p = document.getElementById('p94Palco');
            if (!p) {
              p = document.createElement('div');
              p.id = 'p94Palco';
              document.body.appendChild(p);
            }
            return p;
          }
        
          function gerarPdf(botao) {
            trava(botao, true);
            esperaLiga('Montando o PDF...', 'lendo o relatorio');
            obterDados(function (d) {
              var slides = montarSlides(d);
              if (!slides.length) {
                esperaDesliga(); trava(botao, false);
                aviso('O relatorio esta vazio. Preencha antes de gerar o PDF.', 'erro');
                return;
              }
              esperaTexto('preparando o gerador de PDF');
              carregarLista(FONTES_CANVAS, temCanvas, function () {
                carregarLista(FONTES_PDF, temPdf, function () {
                  var pl = palco();
                  pl.innerHTML = todasFolhasHtml(slides);
                  esperaTexto('carregando as fotos');
                  esperarImagens(pl, function () {
                    var folhas = [].slice.call(pl.querySelectorAll('.p94-folha'));
                    var PDF = classePdf();
                    var doc = new PDF({ unit: 'mm', format: [338.67, 190.5], orientation: 'landscape', compress: true });
                    var LM = 338.67, AM = 190.5;
                    var largura = LM, altura = LM * (ALT / LARG);
                    var topo = (AM - altura) / 2;
                    var i = 0, primeira = true;
        
                    function fim(ok) {
                      pl.innerHTML = '';
                      esperaDesliga();
                      trava(botao, false);
                      if (ok) { aviso('PDF gerado: ' + nomeArquivo(d) + '.pdf'); }
                    }
        
                    function passo() {
                      if (i >= folhas.length) {
                        try {
                          doc.save(nomeArquivo(d) + '.pdf');
                          fim(true);
                        } catch (e) { fim(false); aviso('Nao consegui salvar o PDF.', 'erro'); }
                        return;
                      }
                      esperaTexto('slide ' + (i + 1) + ' de ' + folhas.length);
                      var alvo = folhas[i++];
                      window.html2canvas(alvo, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        useCORS: true,
                        allowTaint: true,
                        logging: false,
                        width: LARG,
                        height: ALT,
                        windowWidth: LARG
                      }).then(function (cv) {
                        if (!primeira) { doc.addPage([LM, AM], 'landscape'); }
                        primeira = false;
                        doc.setFillColor(255, 255, 255);
                        doc.rect(0, 0, LM, AM, 'F');
                        doc.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, topo, largura, altura, undefined, 'FAST');
                        espera(15, passo);
                      })['catch'](function () {
                        fim(false);
                        aviso('Nao consegui desenhar o PDF. Use Imprimir e escolha Salvar como PDF.', 'erro');
                      });
                    }
                    passo();
                  });
                }, semRede);
              }, semRede);
        
              function semRede() {
                esperaDesliga(); trava(botao, false);
                aviso('Sem internet para o gerador de PDF. Use Imprimir e escolha Salvar como PDF.', 'erro');
              }
            });
          }
        
          /* ================================================================ *
           * imprimir os slides (folha deitada)
           * ================================================================ */
          function areaImpressao() {
            var a = document.getElementById('p94Impr');
            if (!a) {
              a = document.createElement('div');
              a.id = 'p94Impr';
              document.body.appendChild(a);
            }
            return a;
          }
        
          function imprimir(botao) {
            trava(botao, true);
            esperaLiga('Preparando a impressao...', 'lendo o relatorio');
            obterDados(function (d) {
              var slides = montarSlides(d);
              var a = areaImpressao();
              a.innerHTML = todasFolhasHtml(slides);
              /* a area do relatorio antigo fica vazia para nao sair na folha */
              var velho = document.getElementById('p92Impressao');
              if (velho) { velho.innerHTML = ''; }
              esperaTexto('carregando as fotos');
              esperarImagens(a, function () {
                esperaDesliga();
                trava(botao, false);
                document.body.classList.add('p94-imp');
                espera(220, function () {
                  try { window.print(); } catch (e) { aviso('Nao consegui abrir a impressao.', 'erro'); }
                  espera(1500, function () { document.body.classList.remove('p94-imp'); });
                });
              });
            });
          }
        
          window.addEventListener('afterprint', function () {
            document.body.classList.remove('p94-imp');
          });
        
          /* ================================================================ *
           * conferir os slides na tela
           * ================================================================ */
          function verSlides(botao) {
            trava(botao, true);
            esperaLiga('Montando os slides...', 'lendo o relatorio');
            obterDados(function (d) {
              var slides = montarSlides(d);
              esperaDesliga();
              trava(botao, false);
              if (!slides.length) { aviso('O relatorio esta vazio.', 'erro'); return; }
              var f = document.getElementById('p94Fundo');
              if (!f) {
                f = document.createElement('div');
                f.id = 'p94Fundo';
                document.body.appendChild(f);
                f.addEventListener('click', function (ev) {
                  var b = ev.target && ev.target.closest ? ev.target.closest('[data-p94]') : null;
                  if (b) {
                    ev.preventDefault();
                    var a = b.getAttribute('data-p94');
                    if (a === 'fechar') { fecharVer(); return; }
                    if (a === 'pptx') { fecharVer(); gerarPptx(b); return; }
                    if (a === 'pdf') { fecharVer(); gerarPdf(b); return; }
                    if (a === 'imprimir') { fecharVer(); imprimir(b); return; }
                    return;
                  }
                  if (ev.target === f) { fecharVer(); }
                });
              }
              f.innerHTML =
                '<div class="p94-barra">' +
                  '<b>Conferencia dos slides &mdash; ' + esc(d.obra || '') + ' (' + slides.length + ' slides, 16:9)</b>' +
                  '<button class="p94-bt p94-bt-ok" type="button" data-p94="pptx">Salvar PPTX</button>' +
                  '<button class="p94-bt" type="button" data-p94="pdf">Salvar PDF</button>' +
                  '<button class="p94-bt" type="button" data-p94="imprimir">Imprimir</button>' +
                  '<button class="p94-bt" type="button" data-p94="fechar">Fechar</button>' +
                '</div>' +
                '<div class="p94-lupa" id="p94Lupa">' + todasFolhasHtml(slides) + '</div>';
              f.style.display = 'block';
              ajustarLupa();
            });
          }
        
          function ajustarLupa() {
            var cx = document.getElementById('p94Lupa');
            if (!cx) { return; }
            var larg = cx.clientWidth || LARG;
            var k = Math.min(1, larg / LARG);
            var i, lst = cx.querySelectorAll('.p94-folha');
            for (i = 0; i < lst.length; i++) {
              lst[i].style.transform = 'scale(' + k + ')';
              lst[i].style.transformOrigin = 'top left';
              lst[i].style.marginBottom = (14 - (1 - k) * ALT) + 'px';
            }
          }
        
          window.addEventListener('resize', function () {
            var f = document.getElementById('p94Fundo');
            if (f && f.style.display === 'block') { ajustarLupa(); }
          });
        
          function fecharVer() {
            var f = document.getElementById('p94Fundo');
            if (!f) { return; }
            f.style.display = 'none';
            f.innerHTML = '';
          }
        
          document.addEventListener('keydown', function (ev) {
            if (ev.key !== 'Escape' && ev.keyCode !== 27) { return; }
            var f = document.getElementById('p94Fundo');
            if (f && f.style.display === 'block') { ev.stopPropagation(); fecharVer(); }
          }, true);
        
          /* ================================================================ *
           * botoes dentro da janela do Relatorio FPDO
           * ================================================================ */
          function trava(botao, ligado) {
            if (!botao || !botao.tagName) { return; }
            if (ligado) {
              if (botao.__p94rot == null) { botao.__p94rot = botao.textContent; }
              botao.disabled = true;
              botao.textContent = 'Aguarde...';
            } else {
              botao.disabled = false;
              if (botao.__p94rot != null) { botao.textContent = botao.__p94rot; botao.__p94rot = null; }
            }
          }
        
          function colocarBotoes() {
            var pe = document.getElementById('p92Pe');
            if (!pe) { return; }
            if (!document.getElementById('p94BtPptx')) {
              var b1 = document.createElement('button');
              b1.id = 'p94BtPptx';
              b1.type = 'button';
              b1.className = 'p92-btn p92-btn-ok';
              b1.textContent = 'Salvar PPTX';
              b1.title = 'Gera a apresentacao em PowerPoint (16:9, fundo preto), no mesmo padrao da empresa';
              b1.setAttribute('data-p94b', 'pptx');
              pe.appendChild(b1);
            }
            if (!document.getElementById('p94BtVer')) {
              var b2 = document.createElement('button');
              b2.id = 'p94BtVer';
              b2.type = 'button';
              b2.className = 'p92-btn';
              b2.textContent = 'Ver slides';
              b2.title = 'Mostra na tela como vao ficar os slides antes de salvar';
              b2.setAttribute('data-p94b', 'ver');
              pe.appendChild(b2);
            }
          }
        
          /* nossos botoes */
          document.addEventListener('click', function (ev) {
            var t = ev.target;
            var b = t && t.closest ? t.closest('[data-p94b]') : null;
            if (!b) { return; }
            ev.preventDefault();
            ev.stopPropagation();
            var a = b.getAttribute('data-p94b');
            if (a === 'pptx') { gerarPptx(b); return; }
            if (a === 'ver') { verSlides(b); return; }
          }, true);
        
          /* PDF e Imprimir do relatorio passam a sair no formato de slides */
          document.addEventListener('click', function (ev) {
            var t = ev.target;
            var b = t && t.closest ? t.closest('[data-a]') : null;
            if (!b) { return; }
            if (!b.closest('#p92Pe')) { return; }
            var a = b.getAttribute('data-a');
            if (a !== 'pdf' && a !== 'imprimir') { return; }
            ev.preventDefault();
            ev.stopPropagation();
            if (a === 'pdf') { gerarPdf(b); } else { imprimir(b); }
          }, true);
        
          function iniciar() {
            estilo();
            colocarBotoes();
            window.__varreduraUnica(colocarBotoes);
          }
        
          window.p94SalvarPptx = function () { gerarPptx(null); };
          window.p94VerSlides = function () { verSlides(null); };
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            iniciar();
          }
        })();
    
