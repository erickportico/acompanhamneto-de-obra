
        /* PATCH 120 - Centro de Custos com cara nova:
           indicadores grandes, grafico de ROSCA no lugar da pizza (com total no meio),
           ranking em barras deitadas e evolucao mes a mes.
           Nao mexe em contas, filtros nem tabelas: apenas mostra melhor. */
        (function () {
          'use strict';
        
          var PAL = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
                     '#8b5cf6', '#14b8a6', '#f472b6', '#0ea5e9', '#84cc16',
                     '#fb923c', '#a855f7'];
        
          var E = { lista: [], grupo: 'categoria', destaque: -1 };
        
          function escuro() {
            try { return document.body.classList.contains('dark-mode'); }
            catch (e) { return false; }
          }
          function cTexto() { return escuro() ? '#e2e8f0' : '#0f172a'; }
          function cFraca() { return escuro() ? '#94a3b8' : '#64748b'; }
          function cLinha() { return escuro() ? '#334155' : '#e8edf5'; }
          function cFundo() { return escuro() ? '#0f172a' : '#ffffff'; }
          function cor(i) { return PAL[i % PAL.length]; }
        
          function esc(s) {
            return String(s == null ? '' : s).replace(/&/g, '&amp;')
              .replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          }
        
          function brl(v) {
            v = Number(v) || 0;
            return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2,
                                                      maximumFractionDigits: 2 });
          }
        
          function curto(v) {
            v = Number(v) || 0;
            var s = v < 0 ? '-' : '';
            v = Math.abs(v);
            if (v >= 1000000) {
              return s + (v / 1000000).toFixed(v >= 10000000 ? 0 : 1).replace('.', ',') + ' mi';
            }
            if (v >= 1000) {
              return s + (v / 1000).toFixed(v >= 100000 ? 0 : 1).replace('.', ',') + ' mil';
            }
            return s + v.toFixed(0);
          }
        
          function mesNome(k) {
            var M = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                     'jul', 'ago', 'set', 'out', 'nov', 'dez'];
            var p = String(k || '').split('-');
            if (p.length < 2) { return String(k || ''); }
            var i = parseInt(p[1], 10) - 1;
            return (M[i] || p[1]) + '/' + p[0].substring(2);
          }
        
          /* nome da obra a partir do id, sem quebrar se a obra nao existir mais */
          function nomeObra(id) {
            try {
              var o = (db.obras || []).filter(function (x) { return x.id === id; })[0];
              return o ? (o.nome || 'Obra sem nome') : 'Obra nao encontrada';
            } catch (e) { return 'Obra'; }
          }
        
          /* empresa do lancamento, ou a empresa do colaborador vinculado */
          var cacheEmp = null;
          function empresaDe(c) {
            if (c && c.empresa) { return String(c.empresa).toUpperCase(); }
            if (!cacheEmp) {
              cacheEmp = {};
              try {
                (db.obras || []).forEach(function (o) {
                  ['colaboradores', 'colaboradoresPgto'].forEach(function (k) {
                    (o[k] || []).forEach(function (p) {
                      if (p && p.nome && p.empresa) {
                        cacheEmp[String(p.nome).trim().toLowerCase()] = String(p.empresa).toUpperCase();
                      }
                    });
                  });
                });
              } catch (e) { cacheEmp = {}; }
            }
            var n = String((c && c.colaborador) || '').trim().toLowerCase();
            return cacheEmp[n] || 'SEM EMPRESA';
          }
        
          function chaveDe(c, grupo) {
            if (grupo === 'obra') { return nomeObra(c.obraId); }
            if (grupo === 'regiao') { return String(c.regiao || '').trim() || 'Sem regiao'; }
            if (grupo === 'colab') { return String(c.colaborador || '').trim() || 'Sem colaborador'; }
            if (grupo === 'empresa') { return empresaDe(c); }
            return String(c.categoria || '').trim() || 'Sem categoria';
          }
        
          /* soma os lancamentos pelo agrupamento escolhido, do maior para o menor */
          function agrupar(lista, grupo) {
            var mapa = {};
            lista.forEach(function (c) {
              var k = chaveDe(c, grupo);
              if (!mapa[k]) { mapa[k] = { nome: k, valor: 0, qtd: 0 }; }
              mapa[k].valor += Number(c.valor) || 0;
              mapa[k].qtd += 1;
            });
            var arr = Object.keys(mapa).map(function (k) { return mapa[k]; });
            arr.sort(function (a, b) { return b.valor - a.valor; });
            var total = 0;
            arr.forEach(function (x) { total += x.valor; });
            arr.forEach(function (x, i) {
              x.cor = cor(i);
              x.pct = total > 0 ? (x.valor / total) * 100 : 0;
            });
            return { itens: arr, total: total };
          }
        
          /* soma por mes, em ordem de calendario */
          function porMes(lista) {
            var mapa = {};
            lista.forEach(function (c) {
              var k = String(c.data || '').substring(0, 7);
              if (k.length !== 7) { k = 'sem data'; }
              if (!mapa[k]) { mapa[k] = 0; }
              mapa[k] += Number(c.valor) || 0;
            });
            var ks = Object.keys(mapa).filter(function (k) { return k !== 'sem data'; }).sort();
            return ks.map(function (k) { return { chave: k, nome: mesNome(k), valor: mapa[k] }; });
          }
        
          function estilo() {
            if (document.getElementById('p120Estilo')) { return; }
            var s = document.createElement('style');
            s.id = 'p120Estilo';
            s.textContent = [
              '#p120Area .p120-kpis{display:grid;gap:10px;margin:0 0 12px;',
              'grid-template-columns:repeat(auto-fit,minmax(160px,1fr));}',
              '#p120Area .p120-kpi{position:relative;overflow:hidden;padding:12px 14px 12px 17px;',
              'border:1px solid var(--border,#e2e8f0);border-radius:14px;background:var(--card-bg,#fff);',
              'box-shadow:0 1px 3px rgba(15,23,42,.06);}',
              '#p120Area .p120-kpi::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;',
              'background:#6366f1;}',
              '#p120Area .p120-kpi.k2::before{background:#06b6d4;}',
              '#p120Area .p120-kpi.k3::before{background:#10b981;}',
              '#p120Area .p120-kpi.k4::before{background:#f59e0b;}',
              '#p120Area .p120-kpi.k5::before{background:#8b5cf6;}',
              '#p120Area .p120-kpi.k6::before{background:#ef4444;}',
              '#p120Area .p120-kpi.largo{grid-column:span 2;}',
              '@media(max-width:640px){#p120Area .p120-kpi.largo{grid-column:span 1;}}',
              '#p120Area .p120-spark{display:block;width:100%;height:30px;margin-top:6px;opacity:.85;}',
              '#p120Area .p120-t{font-style:normal;font-weight:700;padding:1px 6px;border-radius:20px;',
              'font-size:.7rem;}',
              '#p120Area .p120-t.sobe{background:rgba(239,68,68,.14);color:#dc2626;}',
              '#p120Area .p120-t.cai{background:rgba(16,185,129,.16);color:#059669;}',
              '#p120Area .p120-t.neutro{background:rgba(100,116,139,.16);color:#64748b;}',
              '#p120Area .p120-t-obs{margin-left:5px;}',
              '#p120Area .p120-kpi span{font-size:.7rem;font-weight:700;letter-spacing:.5px;',
              'text-transform:uppercase;color:var(--text-light,#64748b);}',
              '#p120Area .p120-kpi b{display:block;margin-top:4px;font-size:1.22rem;line-height:1.2;',
              'letter-spacing:-.4px;color:var(--text,#0f172a);}',
              '#p120Area .p120-kpi i{display:block;margin-top:3px;font-style:normal;font-size:.72rem;',
              'color:var(--text-light,#64748b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
              '#p120Area .p120-grid{display:grid;gap:12px;grid-template-columns:minmax(280px,1fr) minmax(300px,1.2fr);}',
              '@media(max-width:900px){#p120Area .p120-grid{grid-template-columns:1fr;}}',
              '#p120Area .p120-cx{border:1px solid var(--border,#e2e8f0);border-radius:16px;',
              'background:var(--card-bg,#fff);padding:13px 15px 15px;margin-bottom:12px;',
              'box-shadow:0 1px 3px rgba(15,23,42,.06);}',
              '#p120Area .p120-grid .p120-cx{margin-bottom:0;}',
              '#p120Area .p120-cab{display:flex;align-items:flex-start;justify-content:space-between;',
              'gap:10px;flex-wrap:wrap;margin-bottom:10px;}',
              '#p120Area .p120-cab h4{margin:0;font-size:.9rem;font-weight:700;color:var(--text,#0f172a);}',
              '#p120Area .p120-cab small{display:block;margin-top:2px;font-size:.72rem;font-weight:500;',
              'color:var(--text-light,#64748b);}',
              '#p120Area .p120-btns{display:flex;gap:4px;flex-wrap:wrap;}',
              '#p120Area .p120-b{cursor:pointer;border:1px solid var(--border,#cbd5e1);background:transparent;',
              'color:var(--text-light,#64748b);font-size:.71rem;font-weight:700;padding:5px 9px;',
              'border-radius:8px;transition:all .15s;}',
              '#p120Area .p120-b:hover{border-color:#6366f1;color:#6366f1;}',
              '#p120Area .p120-b.on{background:#6366f1;border-color:#6366f1;color:#fff;}',
              '#p120Area .p120-rosca{position:relative;}',
              '#p120Area .p120-meio{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);',
              'text-align:center;pointer-events:none;padding:0 14%;}',
              '#p120Area .p120-meio span{display:block;font-size:.68rem;font-weight:700;letter-spacing:.5px;',
              'text-transform:uppercase;color:var(--text-light,#64748b);}',
              '#p120Area .p120-meio b{display:block;margin-top:2px;font-size:1.1rem;letter-spacing:-.4px;',
              'color:var(--text,#0f172a);}',
              '#p120Area .p120-meio i{display:block;margin-top:2px;font-style:normal;font-size:.71rem;',
              'color:var(--text-light,#64748b);}',
              '#p120Area .p120-leg{margin-top:8px;display:flex;flex-direction:column;gap:1px;',
              'max-height:184px;overflow:auto;}',
              '#p120Area .p120-li{display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:8px;',
              'font-size:.78rem;transition:background .15s;}',
              '#p120Area .p120-li:hover,#p120Area .p120-li.on{background:rgba(99,102,241,.10);}',
              '#p120Area .p120-pt{width:10px;height:10px;border-radius:3px;flex:none;}',
              '#p120Area .p120-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;',
              'white-space:nowrap;color:var(--text,#0f172a);}',
              '#p120Area .p120-vl{font-weight:700;color:var(--text,#0f172a);}',
              '#p120Area .p120-pc{width:46px;text-align:right;color:var(--text-light,#64748b);}',
              '#p120Area canvas{display:block;width:100%;}',
              '#p120Area .p120-vazio{padding:24px 14px;text-align:center;font-size:.85rem;',
              'color:var(--text-light,#64748b);}',
              '#p120Dica{position:fixed;z-index:99999;pointer-events:none;display:none;',
              'background:rgba(15,23,42,.94);color:#fff;font-size:.75rem;line-height:1.35;',
              'padding:7px 10px;border-radius:9px;box-shadow:0 6px 18px rgba(0,0,0,.28);max-width:250px;}',
              '#p120Dica b{display:block;font-size:.79rem;margin-bottom:2px;}',
              'body.dark-mode #p120Area .p120-kpi,body.dark-mode #p120Area .p120-cx{background:#0f172a;',
              'border-color:#334155;}',
              'body.dark-mode #p120Area .p120-b{border-color:#334155;}'
            ].join('');
            document.head.appendChild(s);
          }
        
          /* caixinha de aviso que segue o mouse */
          function dica(texto, ev) {
            var d = document.getElementById('p120Dica');
            if (!d) {
              d = document.createElement('div');
              d.id = 'p120Dica';
              document.body.appendChild(d);
            }
            if (!texto) { d.style.display = 'none'; return; }
            d.innerHTML = texto;
            d.style.display = 'block';
            var x = ev.clientX + 14;
            var y = ev.clientY + 14;
            if (x + d.offsetWidth > window.innerWidth - 8) { x = ev.clientX - d.offsetWidth - 12; }
            if (y + d.offsetHeight > window.innerHeight - 8) { y = ev.clientY - d.offsetHeight - 12; }
            d.style.left = Math.max(4, x) + 'px';
            d.style.top = Math.max(4, y) + 'px';
          }
        
          /* deixa o restante da aba com a mesma cara: campos, botoes, sub-abas e
             tabelas. So aparencia, nenhum comportamento muda. */
          function estiloAba() {
            if (document.getElementById('p120EstiloAba')) { return; }
            var s = document.createElement('style');
            s.id = 'p120EstiloAba';
            s.textContent = [
              '#tab-custo h3{display:flex;align-items:center;gap:8px;font-size:1.12rem;',
              'letter-spacing:-.3px;margin:0 0 14px;}',
              '#tab-custo label{font-size:.72rem!important;font-weight:700!important;',
              'letter-spacing:.4px;text-transform:uppercase;color:var(--text-light,#64748b);',
              'display:block;margin-bottom:4px;}',
              '#tab-custo input[type=text],#tab-custo input[type=number],#tab-custo input[type=date],',
              '#tab-custo input[type=month],#tab-custo select{border-radius:10px!important;',
              'padding:8px 11px!important;border:1px solid var(--border,#dbe2ec)!important;',
              'background:var(--card-bg,#fff);color:var(--text,#0f172a);font-size:.85rem;',
              'transition:border-color .15s,box-shadow .15s;}',
              '#tab-custo input:focus,#tab-custo select:focus{outline:none;',
              'border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,.16);}',
              '#tab-custo .btn-add,#tab-custo button.secondary{border-radius:10px;',
              'font-weight:700;font-size:.83rem;padding:8px 14px;transition:transform .12s,filter .15s;}',
              '#tab-custo .btn-add:hover,#tab-custo button.secondary:hover{transform:translateY(-1px);',
              'filter:brightness(1.06);}',
              '#custoSubNav{gap:6px;border-bottom:none!important;padding-bottom:0!important;',
              'background:var(--card-bg,#f1f5f9);border:1px solid var(--border,#e2e8f0);',
              'border-radius:14px;padding:6px!important;margin-bottom:14px!important;}',
              '#tab-custo .custo-sub-btn{border:none!important;background:transparent!important;',
              'border-radius:10px!important;padding:8px 14px!important;font-size:.81rem!important;}',
              '#tab-custo .custo-sub-btn:hover{background:rgba(99,102,241,.10)!important;color:#6366f1!important;}',
              '#tab-custo .custo-sub-btn.ativo{background:#6366f1!important;color:#fff!important;',
              'box-shadow:0 2px 8px rgba(99,102,241,.34);}',
              '#tab-custo table{border-collapse:separate;border-spacing:0;width:100%;font-size:.83rem;}',
              '#tab-custo table th{text-transform:uppercase;font-size:.7rem;letter-spacing:.5px;',
              'position:sticky;top:0;}',
              '#tab-custo table tbody tr:hover{background:rgba(99,102,241,.07);}',
              '#tab-custo .lanc-obra-group{border:1px solid var(--border,#e2e8f0);border-radius:14px;',
              'overflow:visible;margin-bottom:12px;background:var(--card-bg,#fff);}',
              '#tab-custo .lanc-obra-header{background:linear-gradient(90deg,#4f46e5,#6366f1);',
              'color:#fff;font-weight:700;padding:10px 14px;font-size:.86rem;}',
              '#tab-custo .btn-icon-sm{border-radius:8px;transition:transform .12s;}',
              '#tab-custo .lanc-actions{display:flex;gap:6px;flex-wrap:nowrap;overflow:visible;}',
              '#tab-custo .lanc-actions .btn-icon-sm{flex-shrink:0;}',
              '#tab-custo .btn-icon-sm:hover{transform:scale(1.14);}',
              '#containerCustoTotal>div{border-radius:12px!important;',
              'background:linear-gradient(90deg,#4f46e5,#6366f1)!important;',
              'box-shadow:0 3px 12px rgba(79,70,229,.28);padding:11px 16px!important;}',
              'body.dark-mode #custoSubNav{background:#111c33;border-color:#334155;}',
              'body.dark-mode #tab-custo input,body.dark-mode #tab-custo select{background:#0f172a;',
              'border-color:#334155!important;color:#e2e8f0;}',
              'body.dark-mode #tab-custo .lanc-obra-group{background:#0f172a;border-color:#334155;}'
            ].join('');
            document.head.appendChild(s);
          }
        
          /* deixa o desenho nitido em qualquer tela e devolve o pincel */
          function preparar(cv, altura) {
            var larg = cv.clientWidth || cv.parentNode.clientWidth || 320;
            if (larg < 120) { larg = 120; }
            var dpr = window.devicePixelRatio || 1;
            if (dpr > 2) { dpr = 2; }
            cv.width = Math.round(larg * dpr);
            cv.height = Math.round(altura * dpr);
            cv.style.height = altura + 'px';
            var ctx = cv.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, larg, altura);
            cv.__w = larg;
            cv.__h = altura;
            return ctx;
          }
        
          function tomMaisClaro(hex, quanto) {
            var n = parseInt(String(hex).replace('#', ''), 16);
            var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
            r = Math.round(r + (255 - r) * quanto);
            g = Math.round(g + (255 - g) * quanto);
            b = Math.round(b + (255 - b) * quanto);
            return 'rgb(' + r + ',' + g + ',' + b + ')';
          }
        
          /* ---------------- GRAFICO DE ROSCA (no lugar da pizza) --------------- */
          function desenharRosca(cv, dados, total) {
            var ctx = preparar(cv, 250);
            var w = cv.__w, h = cv.__h;
            var cx = w / 2, cy = h / 2;
            var raio = Math.min(w, h) / 2 - 8;
            var grosso = Math.max(16, raio * 0.34);
            cv.__fatias = [];
        
            if (!dados.length || total <= 0) {
              ctx.fillStyle = cFraca();
              ctx.font = '600 13px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('Sem despesas para os filtros de agora.', cx, cy);
              return;
            }
        
            /* trilha de fundo */
            ctx.strokeStyle = cLinha();
            ctx.lineWidth = grosso;
            ctx.beginPath();
            ctx.arc(cx, cy, raio - grosso / 2, 0, Math.PI * 2);
            ctx.stroke();
        
            var ang = -Math.PI / 2;
            var vao = dados.length > 1 ? 0.018 : 0;
            dados.forEach(function (d, i) {
              var arco = (d.valor / total) * Math.PI * 2;
              if (arco <= 0) { return; }
              var destaque = (E.destaque === i);
              var r = raio - grosso / 2 + (destaque ? 3 : 0);
              ctx.strokeStyle = destaque ? tomMaisClaro(d.cor, 0.18) : d.cor;
              ctx.lineWidth = grosso + (destaque ? 6 : 0);
              ctx.lineCap = 'butt';
              ctx.beginPath();
              ctx.arc(cx, cy, r, ang + vao / 2, ang + Math.max(arco - vao, 0.004) + vao / 2);
              ctx.stroke();
              cv.__fatias.push({ i: i, de: ang, ate: ang + arco, d: d });
              ang += arco;
            });
        
            cv.__rosca = { cx: cx, cy: cy, fora: raio, dentro: raio - grosso };
          }
        
          /* descobre em qual pedaco da rosca o mouse esta */
          function fatiaNoPonto(cv, ev) {
            if (!cv.__rosca || !cv.__fatias) { return -1; }
            var cx = cv.getBoundingClientRect();
            var x = ev.clientX - cx.left - cv.__rosca.cx;
            var y = ev.clientY - cx.top - cv.__rosca.cy;
            var dist = Math.sqrt(x * x + y * y);
            if (dist > cv.__rosca.fora + 4 || dist < cv.__rosca.dentro - 4) { return -1; }
            var a = Math.atan2(y, x);
            if (a < -Math.PI / 2) { a += Math.PI * 2; }
            for (var k = 0; k < cv.__fatias.length; k++) {
              var f = cv.__fatias[k];
              if (a >= f.de && a <= f.ate) { return f.i; }
            }
            return -1;
          }
        
          /* ------------- RANKING EM BARRAS DEITADAS (top 8) -------------------- */
          function desenharRanking(cv, dados, total) {
            var itens = dados.slice(0, 8);
            var alt = Math.max(150, itens.length * 34 + 22);
            var ctx = preparar(cv, alt);
            var w = cv.__w;
            cv.__barras = [];
        
            if (!itens.length) {
              ctx.fillStyle = cFraca();
              ctx.font = '600 13px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('Nada lancado ainda.', w / 2, alt / 2);
              return;
            }
        
            var maior = itens[0].valor || 1;
            var rotulo = Math.min(150, Math.max(96, w * 0.30));
            var direita = 92;
            var faixa = Math.max(40, w - rotulo - direita);
        
            itens.forEach(function (d, i) {
              var y = 10 + i * 34;
              var alturaB = 18;
              var larg = Math.max(3, (d.valor / maior) * faixa);
        
              ctx.font = '600 11.5px sans-serif';
              ctx.fillStyle = cTexto();
              ctx.textAlign = 'right';
              ctx.textBaseline = 'middle';
              var nome = d.nome;
              while (ctx.measureText(nome).width > rotulo - 12 && nome.length > 4) {
                nome = nome.substring(0, nome.length - 2);
              }
              if (nome !== d.nome) { nome += '.'; }
              ctx.fillText(nome, rotulo - 8, y + alturaB / 2);
        
              ctx.fillStyle = cLinha();
              cantos(ctx, rotulo, y, faixa, alturaB, alturaB / 2);
              ctx.fill();
        
              ctx.fillStyle = (E.destaque === i) ? tomMaisClaro(d.cor, 0.18) : d.cor;
              cantos(ctx, rotulo, y, larg, alturaB, alturaB / 2);
              ctx.fill();
        
              ctx.font = '700 11.5px sans-serif';
              ctx.fillStyle = cTexto();
              ctx.textAlign = 'left';
              ctx.fillText(curto(d.valor), rotulo + faixa + 8, y + alturaB / 2);
              ctx.font = '600 10.5px sans-serif';
              ctx.fillStyle = cFraca();
              ctx.fillText(d.pct.toFixed(1).replace('.', ',') + '%',
                           rotulo + faixa + 8 + 54, y + alturaB / 2);
        
              cv.__barras.push({ i: i, x: rotulo, y: y, w: faixa, h: alturaB, d: d });
            });
          }
        
          /* retangulo de cantos arredondados, sem depender de recurso novo */
          function cantos(ctx, x, y, w, h, r) {
            if (w < 2 * r) { r = w / 2; }
            if (h < 2 * r) { r = h / 2; }
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.arcTo(x + w, y, x + w, y + r, r);
            ctx.lineTo(x + w, y + h - r);
            ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
            ctx.lineTo(x + r, y + h);
            ctx.arcTo(x, y + h, x, y + h - r, r);
            ctx.lineTo(x, y + r);
            ctx.arcTo(x, y, x + r, y, r);
            ctx.closePath();
          }
        
          /* ------------- EVOLUCAO MES A MES (area + pontos) -------------------- */
          function desenharEvolucao(cv, meses) {
            var ctx = preparar(cv, 210);
            var w = cv.__w, h = cv.__h;
            cv.__pontos = [];
        
            if (meses.length < 1) {
              ctx.fillStyle = cFraca();
              ctx.font = '600 13px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('Sem datas suficientes para montar a evolucao.', w / 2, h / 2);
              return;
            }
        
            var esq = 58, dir = 14, topo = 14, base = h - 30;
            var maior = 0;
            meses.forEach(function (m) { if (m.valor > maior) { maior = m.valor; } });
            if (maior <= 0) { maior = 1; }
            var teto = maior * 1.15;
        
            /* linhas de apoio e valores da esquerda */
            ctx.strokeStyle = cLinha();
            ctx.lineWidth = 1;
            ctx.font = '600 10px sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (var g = 0; g <= 4; g++) {
              var y = topo + (base - topo) * (g / 4);
              ctx.beginPath();
              ctx.moveTo(esq, y);
              ctx.lineTo(w - dir, y);
              ctx.stroke();
              ctx.fillStyle = cFraca();
              ctx.fillText(curto(teto * (1 - g / 4)), esq - 7, y);
            }
        
            var passo = meses.length > 1 ? (w - esq - dir) / (meses.length - 1) : 0;
            function px(i) { return meses.length > 1 ? esq + passo * i : (esq + w - dir) / 2; }
            function py(v) { return base - (v / teto) * (base - topo); }
        
            /* area pintada por baixo da linha */
            var grad = ctx.createLinearGradient(0, topo, 0, base);
            grad.addColorStop(0, 'rgba(99,102,241,0.34)');
            grad.addColorStop(1, 'rgba(99,102,241,0.02)');
            ctx.beginPath();
            ctx.moveTo(px(0), base);
            meses.forEach(function (m, i) { ctx.lineTo(px(i), py(m.valor)); });
            ctx.lineTo(px(meses.length - 1), base);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
        
            /* linha */
            ctx.beginPath();
            meses.forEach(function (m, i) {
              if (i === 0) { ctx.moveTo(px(i), py(m.valor)); }
              else { ctx.lineTo(px(i), py(m.valor)); }
            });
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2.4;
            ctx.lineJoin = 'round';
            ctx.stroke();
        
            /* pontos e nomes dos meses */
            var salto = Math.ceil(meses.length / Math.max(1, Math.floor((w - esq - dir) / 46)));
            meses.forEach(function (m, i) {
              var x = px(i), y = py(m.valor);
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, Math.PI * 2);
              ctx.fillStyle = cFundo();
              ctx.fill();
              ctx.strokeStyle = '#6366f1';
              ctx.lineWidth = 2;
              ctx.stroke();
              cv.__pontos.push({ x: x, y: y, m: m });
              if (i % salto === 0 || i === meses.length - 1) {
                ctx.fillStyle = cFraca();
                ctx.font = '600 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(m.nome, x, base + 8);
              }
            });
          }
        
          /* ---------------------- MONTAGEM DA AREA NOVA ------------------------ */
          var GRUPOS = [
            { k: 'categoria', t: 'Categoria' },
            { k: 'obra', t: 'Obra' },
            { k: 'empresa', t: 'Empresa' },
            { k: 'regiao', t: 'Regiao' },
            { k: 'colab', t: 'Colaborador' }
          ];
        
          function html() {
            var b = GRUPOS.map(function (g) {
              return '<button type="button" class="p120-b" data-g="' + g.k + '">' + g.t + '</button>';
            }).join('');
            return '' +
              '<div class="p120-kpis" id="p120Kpis"></div>' +
              '<div class="p120-grid">' +
                '<div class="p120-cx">' +
                  '<div class="p120-cab"><div><h4>Distribuicao</h4>' +
                    '<small id="p120RoscaSub">por categoria</small></div></div>' +
                  '<div class="p120-rosca">' +
                    '<canvas id="p120Rosca" height="250"></canvas>' +
                    '<div class="p120-meio" id="p120Meio"></div>' +
                  '</div>' +
                  '<div class="p120-leg" id="p120Leg"></div>' +
                '</div>' +
                '<div class="p120-cx">' +
                  '<div class="p120-cab"><div><h4>Onde o dinheiro esta indo</h4>' +
                    '<small>os maiores primeiro &middot; toque para ver o valor exato</small></div>' +
                    '<div class="p120-btns" id="p120Btns">' + b + '</div></div>' +
                  '<canvas id="p120Rank" height="200"></canvas>' +
                '</div>' +
              '</div>' +
              '<div class="p120-cx" style="margin-top:12px;">' +
                '<div class="p120-cab"><div><h4>Evolucao mes a mes</h4>' +
                  '<small id="p120EvolSub">total lancado em cada mes</small></div></div>' +
                '<canvas id="p120Evol" height="210"></canvas>' +
              '</div>';
          }
        
          /* ---------- INDICADORES DE DESEMPENHO (KPIs) NO TOPO ---------------- */
        
          /* dias entre a primeira e a ultima despesa do filtro (minimo 1) */
          function diasDoFiltro(lista) {
            var min = null, max = null;
            lista.forEach(function (c) {
              var d = String(c.data || '');
              if (d.length !== 10) { return; }
              if (min === null || d < min) { min = d; }
              if (max === null || d > max) { max = d; }
            });
            if (!min || !max) { return 0; }
            var a = new Date(min + 'T00:00:00');
            var b = new Date(max + 'T00:00:00');
            var n = Math.round((b - a) / 86400000) + 1;
            return n > 0 ? n : 1;
          }
        
          /* projecao do mes que esta correndo: ritmo dos dias ja passados x mes todo */
          function projecao(meses) {
            if (!meses.length) { return null; }
            var hoje = new Date();
            var atual = hoje.getFullYear() + '-' +
                        ('0' + (hoje.getMonth() + 1)).slice(-2);
            var ultimo = meses[meses.length - 1];
            if (ultimo.chave !== atual) { return null; }
            var diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
            var passados = hoje.getDate();
            if (passados < 1) { passados = 1; }
            return { valor: (ultimo.valor / passados) * diasNoMes,
                     passados: passados, total: diasNoMes };
          }
        
          /* etiqueta colorida de variacao. em custo, subir e alerta e cair e bom */
          function variacao(agora, antes, textoBase) {
            if (!(antes > 0)) { return '<em class="p120-t neutro">sem base anterior</em>'; }
            var p = ((agora - antes) / antes) * 100;
            var classe = p > 1 ? 'sobe' : (p < -1 ? 'cai' : 'neutro');
            var seta = p > 1 ? '\u25B2' : (p < -1 ? '\u25BC' : '\u25AC');
            return '<em class="p120-t ' + classe + '">' + seta + ' ' +
                   Math.abs(p).toFixed(1).replace('.', ',') + '%</em> ' +
                   '<span class="p120-t-obs">' + textoBase + '</span>';
          }
        
          function cartao(cls, rot, valor, pe) {
            return '<div class="p120-kpi ' + cls + '"><span>' + rot + '</span><b>' +
                   valor + '</b><i>' + (pe || '&nbsp;') + '</i></div>';
          }
        
          function kpis(res, meses, lista) {
            var cx = document.getElementById('p120Kpis');
            if (!cx) { return; }
        
            var total = res.total;
            var qtd = lista.length;
            var media = qtd ? total / qtd : 0;
            var topo = res.itens[0];
            var ultimo = meses.length ? meses[meses.length - 1] : null;
            var antes = meses.length > 1 ? meses[meses.length - 2] : null;
            var dias = diasDoFiltro(lista);
            var porDia = dias ? total / dias : 0;
            var proj = projecao(meses);
        
            var nomeG = 'categoria';
            GRUPOS.forEach(function (g) { if (g.k === E.grupo) { nomeG = g.t.toLowerCase(); } });
        
            var html5 = '';
        
            /* 1) total do filtro, com a variacao do mes mais recente e mini tendencia */
            html5 += '<div class="p120-kpi k1 largo"><span>Total no filtro</span><b>' +
              brl(total) + '</b><i>' +
              ((ultimo && antes)
                ? variacao(ultimo.valor, antes.valor, ultimo.nome + ' vs ' + antes.nome)
                : qtd + (qtd === 1 ? ' lancamento' : ' lancamentos')) +
              '</i><canvas id="p120Spark" class="p120-spark" height="30"></canvas></div>';
        
            /* 2) mes mais recente */
            html5 += cartao('k2', ultimo ? 'Mes de ' + ultimo.nome : 'Ultimo mes',
              ultimo ? brl(ultimo.valor) : '&mdash;',
              meses.length ? variacao(ultimo.valor, total / meses.length, 'vs media mensal')
                           : 'sem datas lancadas');
        
            /* 3) projecao do mes que esta correndo, ou media por mes */
            if (proj) {
              html5 += cartao('k3', 'Projecao deste mes', brl(proj.valor),
                'no ritmo de ' + proj.passados + ' de ' + proj.total + ' dias');
            } else {
              html5 += cartao('k3', 'Media por mes',
                meses.length ? brl(total / meses.length) : '&mdash;',
                meses.length + (meses.length === 1 ? ' mes com lancamento'
                                                   : ' meses com lancamento'));
            }
        
            /* 4) ritmo por dia */
            html5 += cartao('k4', 'Custo por dia', dias ? brl(porDia) : '&mdash;',
              dias ? 'em ' + dias + (dias === 1 ? ' dia corrido' : ' dias corridos')
                   : 'sem datas lancadas');
        
            /* 5) concentracao: o maior item pesa quanto? */
            html5 += cartao('k5', 'Maior ' + nomeG, topo ? esc(topo.nome) : '&mdash;',
              topo ? brl(topo.valor) + ' &middot; ' +
                     topo.pct.toFixed(1).replace('.', ',') + '% do total' : '');
        
            /* 6) ticket medio */
            html5 += cartao('k6', 'Media por lancamento', brl(media),
              qtd + (qtd === 1 ? ' lancamento em ' : ' lancamentos em ') +
              res.itens.length + ' ' + nomeG + (res.itens.length === 1 ? '' : 's'));
        
            cx.innerHTML = html5;
        
            /* mini linha de tendencia dentro do primeiro cartao */
            var spark = document.getElementById('p120Spark');
            if (spark && meses.length > 1) { desenharSpark(spark, meses); }
          }
        
          /* linha bem pequena com os ultimos meses, so para dar a sensacao de ritmo */
          function desenharSpark(cv, meses) {
            var m = meses.slice(-8);
            var ctx = preparar(cv, 30);
            var w = cv.__w, h = cv.__h;
            var maior = 0;
            m.forEach(function (x) { if (x.valor > maior) { maior = x.valor; } });
            if (maior <= 0) { return; }
            ctx.beginPath();
            m.forEach(function (x, i) {
              var px = m.length > 1 ? (w - 4) * (i / (m.length - 1)) + 2 : w / 2;
              var py = h - 3 - (x.valor / maior) * (h - 8);
              if (i === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
            });
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1.8;
            ctx.lineJoin = 'round';
            ctx.stroke();
          }
        
          function legenda(res) {
            var cx = document.getElementById('p120Leg');
            if (!cx) { return; }
            if (!res.itens.length) { cx.innerHTML = ''; return; }
            cx.innerHTML = res.itens.map(function (d, i) {
              return '<div class="p120-li" data-i="' + i + '">' +
                '<span class="p120-pt" style="background:' + d.cor + '"></span>' +
                '<span class="p120-nm" title="' + esc(d.nome) + '">' + esc(d.nome) + '</span>' +
                '<span class="p120-vl">' + curto(d.valor) + '</span>' +
                '<span class="p120-pc">' + d.pct.toFixed(1).replace('.', ',') + '%</span>' +
                '</div>';
            }).join('');
          }
        
          function meioDaRosca(res) {
            var m = document.getElementById('p120Meio');
            if (!m) { return; }
            if (E.destaque >= 0 && res.itens[E.destaque]) {
              var d = res.itens[E.destaque];
              m.innerHTML = '<span>' + esc(d.nome) + '</span><b>' + curto(d.valor) + '</b><i>' +
                d.pct.toFixed(1).replace('.', ',') + '% do total</i>';
            } else {
              m.innerHTML = '<span>Total</span><b>' + curto(res.total) + '</b><i>' +
                res.itens.length + ' ' + (res.itens.length === 1 ? 'item' : 'itens') + '</i>';
            }
          }
        
          function pintar() {
            var area = document.getElementById('p120Area');
            if (!area || !area.offsetParent) { return; }
            var res = agrupar(E.lista, E.grupo);
            var meses = porMes(E.lista);
            E.res = res;
            E.meses = meses;
        
            var sub = document.getElementById('p120RoscaSub');
            if (sub) {
              var nomeG = 'categoria';
              GRUPOS.forEach(function (g) { if (g.k === E.grupo) { nomeG = g.t.toLowerCase(); } });
              sub.textContent = 'por ' + nomeG + ' \u00b7 ' + res.itens.length +
                (res.itens.length === 1 ? ' item' : ' itens');
            }
        
            var btns = document.getElementById('p120Btns');
            if (btns) {
              var lista = btns.getElementsByTagName('button');
              for (var i = 0; i < lista.length; i++) {
                if (lista[i].getAttribute('data-g') === E.grupo) { lista[i].className = 'p120-b on'; }
                else { lista[i].className = 'p120-b'; }
              }
            }
        
            kpis(res, meses, E.lista);
            legenda(res);
            meioDaRosca(res);
        
            var cvR = document.getElementById('p120Rosca');
            var cvB = document.getElementById('p120Rank');
            var cvE = document.getElementById('p120Evol');
            if (cvR) { desenharRosca(cvR, res.itens, res.total); }
            if (cvB) { desenharRanking(cvB, res.itens, res.total); }
            if (cvE) { desenharEvolucao(cvE, meses); }
          }
        
          function marcarDestaque(i) {
            if (E.destaque === i) { return; }
            E.destaque = i;
            if (!E.res) { return; }
            meioDaRosca(E.res);
            var cx = document.getElementById('p120Leg');
            if (cx) {
              var l = cx.getElementsByClassName('p120-li');
              for (var k = 0; k < l.length; k++) {
                l[k].className = (parseInt(l[k].getAttribute('data-i'), 10) === i) ? 'p120-li on' : 'p120-li';
              }
            }
            var cvR = document.getElementById('p120Rosca');
            var cvB = document.getElementById('p120Rank');
            if (cvR) { desenharRosca(cvR, E.res.itens, E.res.total); }
            if (cvB) { desenharRanking(cvB, E.res.itens, E.res.total); }
          }
        
          function ligarEventos(area) {
            if (area.__p120ok) { return; }
            area.__p120ok = true;
        
            var btns = document.getElementById('p120Btns');
            if (btns) {
              btns.addEventListener('click', function (ev) {
                var b = ev.target;
                while (b && b !== btns && !b.getAttribute('data-g')) { b = b.parentNode; }
                if (!b || b === btns) { return; }
                E.grupo = b.getAttribute('data-g');
                E.destaque = -1;
                try { localStorage.setItem('p120Grupo', E.grupo); } catch (e) {}
                pintar();
              });
            }
        
            var leg = document.getElementById('p120Leg');
            if (leg) {
              leg.addEventListener('mousemove', function (ev) {
                var n = ev.target;
                while (n && n !== leg && !n.getAttribute('data-i')) { n = n.parentNode; }
                if (!n || n === leg) { return; }
                marcarDestaque(parseInt(n.getAttribute('data-i'), 10));
                if (E.res) {
                  var d = E.res.itens[E.destaque];
                  if (d) {
                    dica('<b>' + esc(d.nome) + '</b>' + brl(d.valor) + '<br>' +
                         d.qtd + (d.qtd === 1 ? ' lancamento' : ' lancamentos') + ' \u00b7 ' +
                         d.pct.toFixed(1).replace('.', ',') + '%', ev);
                  }
                }
              });
              leg.addEventListener('mouseleave', function () { marcarDestaque(-1); dica(''); });
            }
        
            var cvR = document.getElementById('p120Rosca');
            if (cvR) {
              cvR.addEventListener('mousemove', function (ev) {
                var i = fatiaNoPonto(cvR, ev);
                marcarDestaque(i);
                if (i >= 0 && E.res) {
                  var d = E.res.itens[i];
                  dica('<b>' + esc(d.nome) + '</b>' + brl(d.valor) + '<br>' +
                       d.qtd + (d.qtd === 1 ? ' lancamento' : ' lancamentos') + ' \u00b7 ' +
                       d.pct.toFixed(1).replace('.', ',') + '%', ev);
                } else { dica(''); }
              });
              cvR.addEventListener('mouseleave', function () { marcarDestaque(-1); dica(''); });
            }
        
            var cvB = document.getElementById('p120Rank');
            if (cvB) {
              cvB.addEventListener('mousemove', function (ev) {
                if (!cvB.__barras) { return; }
                var r = cvB.getBoundingClientRect();
                var y = ev.clientY - r.top;
                var achou = -1;
                cvB.__barras.forEach(function (b) {
                  if (y >= b.y - 7 && y <= b.y + b.h + 7) { achou = b.i; }
                });
                marcarDestaque(achou);
                if (achou >= 0 && E.res) {
                  var d = E.res.itens[achou];
                  dica('<b>' + esc(d.nome) + '</b>' + brl(d.valor) + '<br>' +
                       d.qtd + (d.qtd === 1 ? ' lancamento' : ' lancamentos') + ' \u00b7 ' +
                       d.pct.toFixed(1).replace('.', ',') + '%', ev);
                } else { dica(''); }
              });
              cvB.addEventListener('mouseleave', function () { marcarDestaque(-1); dica(''); });
            }
        
            var cvE = document.getElementById('p120Evol');
            if (cvE) {
              cvE.addEventListener('mousemove', function (ev) {
                if (!cvE.__pontos || !cvE.__pontos.length) { return; }
                var r = cvE.getBoundingClientRect();
                var x = ev.clientX - r.left;
                var perto = null, melhor = 1e9;
                cvE.__pontos.forEach(function (p) {
                  var d = Math.abs(p.x - x);
                  if (d < melhor) { melhor = d; perto = p; }
                });
                if (perto && melhor < 34) {
                  dica('<b>' + esc(perto.m.nome) + '</b>' + brl(perto.m.valor), ev);
                } else { dica(''); }
              });
              cvE.addEventListener('mouseleave', function () { dica(''); });
            }
        
            /* redesenha ao mudar o tamanho da janela, sem exagero de chamadas */
            var t = null;
            window.addEventListener('resize', function () {
              if (t) { clearTimeout(t); }
              t = setTimeout(function () { t = null; pintar(); }, 220);
            });
        
            /* acompanha a troca entre tema claro e escuro */
            try {
              if (window.MutationObserver) {
                var mo = new MutationObserver(function () { pintar(); });
                mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
              }
            } catch (e) {}
          }
        
          /* acha o cartao antigo dos graficos (barras + pizza) */
          function cartaoAntigo() {
            var cv = document.getElementById('custoBarChart');
            if (!cv) { return null; }
            var n = cv;
            while (n && n !== document.body) {
              if (n.className && String(n.className).indexOf('custo-dashboard-card') !== -1) { return n; }
              n = n.parentNode;
            }
            n = cv.parentNode;
            while (n && n.parentNode && n.parentNode.id !== 'tab-custo') { n = n.parentNode; }
            return n || null;
          }
        
          function montar() {
            if (document.getElementById('p120Area')) { return true; }
            var cartao = cartaoAntigo();
            if (!cartao) { return false; }
            estilo();
            estiloAba();
        
            /* esconde a dupla antiga (barras em pe + pizza), mas deixa no lugar
               para as funcoes antigas continuarem funcionando sem erro */
            for (var i = 0; i < cartao.children.length; i++) {
              var f = cartao.children[i];
              if (f.id !== 'p120Area') { f.style.display = 'none'; }
            }
        
            /* o cartao antigo passa a ser so um espaco: quem desenha a moldura
               agora sao os quadros novos */
            cartao.style.border = 'none';
            cartao.style.background = 'transparent';
            cartao.style.padding = '0';
            cartao.style.boxShadow = 'none';
        
            var area = document.createElement('div');
            area.id = 'p120Area';
            area.innerHTML = html();
            cartao.appendChild(area);
        
            try {
              var g = localStorage.getItem('p120Grupo');
              if (g) {
                GRUPOS.forEach(function (x) { if (x.k === g) { E.grupo = g; } });
              }
            } catch (e) {}
        
            ligarEventos(area);
            return true;
          }
        
          /* passa a receber os mesmos lancamentos que a tela antiga usava */
          function envolver() {
            if (window.__p120Envolvido) { return; }
            var antigo = window.renderCustoDashboard;
            if (typeof antigo !== 'function') { return; }
            window.__p120Envolvido = true;
            window.renderCustoDashboard = function () {
              var r = antigo.apply(this, arguments);
              try {
                cacheEmp = null;
                E.lista = (typeof window.getCustosFiltered === 'function') ? window.getCustosFiltered() : [];
                E.destaque = -1;
                if (montar()) { pintar(); }
              } catch (e) { if (window.console) { console.error('p120:', e); } }
              return r;
            };
          }
        
          function iniciar() {
            envolver();
            var painel = document.getElementById('tab-custo');
            if (painel && painel.style.display !== 'none' && document.getElementById('custoBarChart')) {
              try {
                E.lista = (typeof window.getCustosFiltered === 'function') ? window.getCustosFiltered() : [];
                if (montar()) { pintar(); }
              } catch (e) {}
            }
          }
        
          /* espera a pagina e as funcoes antigas ficarem prontas */
          var tentativas = 0;
          var relogio = setInterval(function () {
            tentativas++;
            if (typeof window.renderCustoDashboard === 'function' && document.body) {
              iniciar();
              if (window.__p120Envolvido) { clearInterval(relogio); }
            }
            if (tentativas > 200) { clearInterval(relogio); }
          }, 300);
        
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
          } else {
            setTimeout(iniciar, 400);
          }
        
          /* se o usuario abrir a aba depois, redesenha com o tamanho certo */
          document.addEventListener('click', function () {
            setTimeout(function () {
              var a = document.getElementById('p120Area');
              if (a && a.offsetParent && E.lista) { pintar(); }
            }, 260);
          }, true);
        
          window.p120Redesenhar = function () { try { pintar(); } catch (e) {} };
        })();
    
