
        /* ====== PATCH97_PPTX_CHEIO_OK - PPTX respeita a foto no slide inteiro (PATCH 96) ====== */
        (function () {
          'use strict';
          if (window.__PS97) { return; }
          window.__PS97 = true;
        
          var K_CHEIO = 'p96_cheio_v1';
          var POL_L = 13.333;
          var POL_A = 7.5;
        
          /* ---------------- qual foto vai ocupar o slide inteiro ---------------- */
          function lerCheio() {
            try {
              var o = JSON.parse(localStorage.getItem(K_CHEIO) || '{}');
              return o && typeof o === 'object' ? o : {};
            } catch (e) { return {}; }
          }
        
          /* ---------------- veu escuro (mesmo degrade da tela) ---------------- */
          var veuCache = null;
        
          function veuUrl() {
            if (veuCache !== null) { return veuCache; }
            veuCache = '';
            try {
              var cv = document.createElement('canvas');
              cv.width = 1280;
              cv.height = 720;
              var cx = cv.getContext('2d');
              if (!cx) { return veuCache; }
              var g = cx.createLinearGradient(0, 0, cv.width, 0);
              g.addColorStop(0, 'rgba(6,12,24,0.86)');
              g.addColorStop(0.55, 'rgba(6,12,24,0.55)');
              g.addColorStop(1, 'rgba(6,12,24,0.30)');
              cx.fillStyle = g;
              cx.fillRect(0, 0, cv.width, cv.height);
              veuCache = cv.toDataURL('image/png');
            } catch (e2) { veuCache = ''; }
            return veuCache;
          }
        
          /* ---------------- folha de rascunho: guarda as pecas do slide ---------------- */
          function rascunho() {
            var b = { fundo: null, ops: [] };
            b.addImage = function (o) { b.ops.push(['img', o]); return b; };
            b.addShape = function (t, o) { b.ops.push(['shape', t, o]); return b; };
            b.addText = function (t, o) { b.ops.push(['text', t, o]); return b; };
            b.addTable = function (t, o) { b.ops.push(['table', t, o]); return b; };
            b.addChart = function (t, d, o) { b.ops.push(['chart', t, d, o]); return b; };
            b.addNotes = function (t) { b.ops.push(['notes', t]); return b; };
            b.addMedia = function (o) { b.ops.push(['media', o]); return b; };
            try {
              Object.defineProperty(b, 'background', {
                configurable: true,
                get: function () { return b.fundo; },
                set: function (v) { b.fundo = v; }
              });
            } catch (e) {}
            return b;
          }
        
          function fonteDaImagem(o) {
            if (!o) { return ''; }
            return String(o.data || o.path || '');
          }
        
          function tocar(real, op) {
            if (op[0] === 'img') { real.addImage(op[1]); return; }
            if (op[0] === 'shape') { real.addShape(op[1], op[2]); return; }
            if (op[0] === 'text') { real.addText(op[1], op[2]); return; }
            if (op[0] === 'table') { real.addTable(op[1], op[2]); return; }
            if (op[0] === 'chart') { real.addChart(op[1], op[2], op[3]); return; }
            if (op[0] === 'notes') { real.addNotes(op[1]); return; }
            if (op[0] === 'media') { real.addMedia(op[1]); return; }
          }
        
          /* ---------------- monta de verdade, na ordem certa ---------------- */
          function montar(inv) {
            if (inv.__pronto) { return; }
            inv.__pronto = true;
        
            var folhas = inv.__folhas;
            var n = folhas.length;
            var c = lerCheio();
        
            var marca = [];
            var i, j;
            for (i = 0; i < n; i++) { marca.push(false); }
            if (n > 0) { marca[0] = !!c.capa; }
            if (n > 1) { marca[1] = !!c.dados; }
            if (n > 2) { marca[n - 1] = !!c.fim; }
        
            /* ultima foto do relatorio: serve para a pagina de encerramento */
            var ultima = '';
            for (i = 0; i < n; i++) {
              for (j = 0; j < folhas[i].ops.length; j++) {
                if (folhas[i].ops[j][0] === 'img') {
                  var f = fonteDaImagem(folhas[i].ops[j][1]);
                  if (f) { ultima = f; }
                }
              }
            }
        
            for (i = 0; i < n; i++) {
              var b = folhas[i];
              var real;
              try { real = inv.__r.addSlide(); } catch (e) { continue; }
              if (b.fundo) { try { real.background = b.fundo; } catch (e1) {} }
        
              var cheio = marca[i];
              var propria = '';
              for (j = 0; j < b.ops.length; j++) {
                if (b.ops[j][0] === 'img') {
                  propria = fonteDaImagem(b.ops[j][1]);
                  if (propria) { break; }
                }
              }
              var url = propria || ultima;
              var esconder = false;
        
              if (cheio && url) {
                try {
                  real.addImage({
                    data: url, x: 0, y: 0, w: POL_L, h: POL_A,
                    sizing: { type: 'cover', w: POL_L, h: POL_A }
                  });
                  var v = veuUrl();
                  if (v) { real.addImage({ data: v, x: 0, y: 0, w: POL_L, h: POL_A }); }
                  esconder = !!propria;
                } catch (e2) { esconder = false; }
              }
        
              for (j = 0; j < b.ops.length; j++) {
                if (esconder && b.ops[j][0] === 'img') { continue; }
                try { tocar(real, b.ops[j]); } catch (e3) {}
              }
            }
          }
        
          /* ---------------- capa por cima do gerador de PowerPoint ---------------- */
          function embrulhar(Base) {
            if (!Base || Base.__p97) { return Base; }
        
            function P97() {
              this.__r = new Base();
              this.__folhas = [];
              this.__pronto = false;
            }
        
            P97.__p97 = true;
            P97.__base = Base;
        
            P97.prototype.addSlide = function (a) {
              try { if (a) { this.__r.__p97arg = a; } } catch (e) {}
              var b = rascunho();
              this.__folhas.push(b);
              return b;
            };
        
            P97.prototype.addSection = function (o) {
              try { return this.__r.addSection(o); } catch (e) { return null; }
            };
        
            P97.prototype.defineLayout = function (o) {
              try { return this.__r.defineLayout(o); } catch (e) { return null; }
            };
        
            P97.prototype.defineSlideMaster = function (o) {
              try { return this.__r.defineSlideMaster(o); } catch (e) { return null; }
            };
        
            P97.prototype.writeFile = function (o) {
              var eu = this;
              try { montar(eu); } catch (e) {}
              return eu.__r.writeFile(o);
            };
        
            P97.prototype.write = function (o) {
              var eu = this;
              try { montar(eu); } catch (e) {}
              return eu.__r.write(o);
            };
        
            P97.prototype.stream = function (o) {
              var eu = this;
              try { montar(eu); } catch (e) {}
              return eu.__r.stream(o);
            };
        
            ['layout', 'author', 'title', 'subject', 'company', 'revision', 'rtlMode', 'theme'].forEach(function (nome) {
              try {
                Object.defineProperty(P97.prototype, nome, {
                  configurable: true,
                  get: function () { try { return this.__r[nome]; } catch (e) { return undefined; } },
                  set: function (v) { try { this.__r[nome] = v; } catch (e) {} }
                });
              } catch (e2) {}
            });
        
            /* atalhos que a biblioteca expoe na classe */
            try {
              ['ShapeType', 'SchemeColor', 'AlignH', 'AlignV', 'ChartType', 'OutputType', 'version'].forEach(function (k) {
                if (Base[k] !== undefined) { P97[k] = Base[k]; }
              });
            } catch (e3) {}
        
            return P97;
          }
        
          /* ---------------- entrar no lugar da biblioteca, na hora que ela chegar ---------------- */
          var guardado = {};
        
          function instalarNome(nome) {
            var atual;
            try { atual = window[nome]; } catch (e) { atual = undefined; }
        
            function pegar() {
              var b = guardado[nome];
              if (!b) { return undefined; }
              if (!b.__w) { b.__w = embrulhar(b.real); }
              return b.__w;
            }
        
            try {
              Object.defineProperty(window, nome, {
                configurable: true,
                get: pegar,
                set: function (v) {
                  if (v && v.__p97) { return; }
                  guardado[nome] = { real: v, __w: null };
                }
              });
            } catch (e2) {
              if (typeof atual === 'function' && !atual.__p97) {
                try { window[nome] = embrulhar(atual); } catch (e3) {}
              }
              return;
            }
        
            if (typeof atual === 'function' && !atual.__p97) {
              guardado[nome] = { real: atual, __w: null };
            }
          }
        
          instalarNome('PptxGenJS');
          instalarNome('pptxgen');
        
          /* rede de seguranca: se por algum motivo a troca acima nao valer, tenta de novo */
          setInterval(function () {
            ['PptxGenJS', 'pptxgen'].forEach(function (nome) {
              try {
                var v = window[nome];
                if (typeof v === 'function' && !v.__p97) { window[nome] = embrulhar(v); }
              } catch (e) {}
            });
          }, 1500);
        
        })();
    
