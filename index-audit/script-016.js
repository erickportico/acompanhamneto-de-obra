
                /* === PATCH 42: calculadora cientifica flutuante e arrastavel === */
                (function(){
                  "use strict";
                
                  if (document.getElementById("pcalcJanela")) { return; }
                
                  var CHAVE = "painelCalculadoraCientifica";
                
                  var st = {
                    aberto: false, minimizado: false,
                    x: null, y: null, bx: null, by: null,
                    graus: true, mem: 0, hist: [], ans: 0
                  };
                
                  function carregar(){
                    try {
                      var raw = localStorage.getItem(CHAVE);
                      if (!raw) { return; }
                      var o = JSON.parse(raw);
                      if (o && typeof o === "object") {
                        if (typeof o.aberto === "boolean") { st.aberto = o.aberto; }
                        if (typeof o.minimizado === "boolean") { st.minimizado = o.minimizado; }
                        if (typeof o.x === "number") { st.x = o.x; }
                        if (typeof o.y === "number") { st.y = o.y; }
                        if (typeof o.bx === "number") { st.bx = o.bx; }
                        if (typeof o.by === "number") { st.by = o.by; }
                        if (typeof o.graus === "boolean") { st.graus = o.graus; }
                        if (typeof o.mem === "number" && isFinite(o.mem)) { st.mem = o.mem; }
                        if (typeof o.ans === "number" && isFinite(o.ans)) { st.ans = o.ans; }
                        if (Object.prototype.toString.call(o.hist) === "[object Array]") {
                          st.hist = o.hist.slice(0, 40);
                        }
                      }
                    } catch (e) { /* memoria indisponivel: segue com os padroes */ }
                  }
                
                  var timerSalvar = null;
                  function salvar(){
                    if (timerSalvar) { clearTimeout(timerSalvar); }
                    timerSalvar = setTimeout(function(){
                      try { localStorage.setItem(CHAVE, JSON.stringify(st)); } catch (e) {}
                    }, 180);
                  }
                
                  /* ================= calculo (sem eval) ================= */
                
                  function normalizar(txt){
                    return String(txt)
                      .replace(/\u00d7/g, "*").replace(/\u00b7/g, "*")
                      .replace(/\u00f7/g, "/").replace(/\u2236/g, "/")
                      .replace(/\u2212/g, "-").replace(/\u2013/g, "-")
                      .replace(/\u221a/g, "sqrt")
                      .replace(/\u03c0/g, "pi")
                      .replace(/\u00b2/g, "^2").replace(/\u00b3/g, "^3")
                      .replace(/,/g, ".");
                  }
                
                  var FUNCOES = {
                    sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1,
                    sinh: 1, cosh: 1, tanh: 1, ln: 1, log: 1, log2: 1,
                    sqrt: 1, cbrt: 1, abs: 1, exp: 1, round: 1, floor: 1, ceil: 1
                  };
                
                  function tokenizar(s){
                    var t = [], i = 0, n = s.length;
                    while (i < n) {
                      var c = s.charAt(i);
                      if (c === " " || c === "\t") { i++; continue; }
                      if (c >= "0" && c <= "9" || c === ".") {
                        var num = "";
                        while (i < n && (s.charAt(i) >= "0" && s.charAt(i) <= "9" || s.charAt(i) === ".")) {
                          num += s.charAt(i); i++;
                        }
                        if (i < n && (s.charAt(i) === "e" || s.charAt(i) === "E")) {
                          var salvo = i, exp = s.charAt(i); i++;
                          if (i < n && (s.charAt(i) === "+" || s.charAt(i) === "-")) { exp += s.charAt(i); i++; }
                          var dig = "";
                          while (i < n && s.charAt(i) >= "0" && s.charAt(i) <= "9") { dig += s.charAt(i); i++; }
                          if (dig) { num += exp + dig; } else { i = salvo; }
                        }
                        if (!/^[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?$|^[0-9]+\.?$/.test(num)) {
                          throw new Error("numero");
                        }
                        var v = parseFloat(num);
                        if (isNaN(v)) { throw new Error("numero"); }
                        t.push({ t: "num", v: v });
                        continue;
                      }
                      if (/[a-zA-Z]/.test(c)) {
                        var id = "";
                        while (i < n && /[a-zA-Z0-9]/.test(s.charAt(i))) { id += s.charAt(i); i++; }
                        t.push({ t: "id", v: id.toLowerCase() });
                        continue;
                      }
                      if ("+-*/^()!%".indexOf(c) >= 0) { t.push({ t: c }); i++; continue; }
                      throw new Error("caractere");
                    }
                    return t;
                  }
                
                  function fatorial(x){
                    if (x < 0 || Math.abs(x - Math.round(x)) > 1e-9) { throw new Error("fatorial"); }
                    x = Math.round(x);
                    if (x > 170) { return Infinity; }
                    var r = 1, k;
                    for (k = 2; k <= x; k++) { r *= k; }
                    return r;
                  }
                
                  function calcular(texto){
                    var toks = tokenizar(normalizar(texto));
                    var p = 0;
                    var grau = st.graus;
                
                    function olhar(){ return toks[p]; }
                    function tipo(){ return toks[p] ? toks[p].t : null; }
                
                    function aplicarFuncao(nome, x){
                      var conv = grau ? Math.PI / 180 : 1;
                      var volta = grau ? 180 / Math.PI : 1;
                      switch (nome) {
                        case "sin": return Math.sin(x * conv);
                        case "cos": return Math.cos(x * conv);
                        case "tan": return Math.tan(x * conv);
                        case "asin": return Math.asin(x) * volta;
                        case "acos": return Math.acos(x) * volta;
                        case "atan": return Math.atan(x) * volta;
                        case "sinh": return (Math.exp(x) - Math.exp(-x)) / 2;
                        case "cosh": return (Math.exp(x) + Math.exp(-x)) / 2;
                        case "tanh": return (Math.exp(2 * x) - 1) / (Math.exp(2 * x) + 1);
                        case "ln": return Math.log(x);
                        case "log": return Math.log(x) / Math.LN10;
                        case "log2": return Math.log(x) / Math.LN2;
                        case "sqrt": return Math.sqrt(x);
                        case "cbrt": return (x < 0 ? -1 : 1) * Math.pow(Math.abs(x), 1 / 3);
                        case "abs": return Math.abs(x);
                        case "exp": return Math.exp(x);
                        case "round": return Math.round(x);
                        case "floor": return Math.floor(x);
                        case "ceil": return Math.ceil(x);
                      }
                      throw new Error("funcao");
                    }
                
                    function expressao(){
                      var v = termo();
                      while (tipo() === "+" || tipo() === "-") {
                        var op = tipo(); p++;
                        var d = termo();
                        v = (op === "+") ? v + d : v - d;
                      }
                      return v;
                    }
                
                    function termo(){
                      var v = unario();
                      for (;;) {
                        var tp = tipo();
                        if (tp === "*" || tp === "/") {
                          p++;
                          var d = unario();
                          if (tp === "*") { v = v * d; }
                          else {
                            if (d === 0) { throw new Error("divisao por zero"); }
                            v = v / d;
                          }
                          continue;
                        }
                        if (tp === "id" && olhar().v === "mod") {
                          p++;
                          var m = unario();
                          if (m === 0) { throw new Error("divisao por zero"); }
                          v = v % m;
                          continue;
                        }
                        /* multiplicacao implicita: 2(3+1), 2pi, 3sqrt(4) */
                        if (tp === "(" || tp === "num" ||
                            (tp === "id" && olhar().v !== "mod")) {
                          v = v * unario();
                          continue;
                        }
                        return v;
                      }
                    }
                
                    function unario(){
                      if (tipo() === "-") { p++; return -unario(); }
                      if (tipo() === "+") { p++; return unario(); }
                      return potencia();
                    }
                
                    function potencia(){
                      var base = posfixo();
                      if (tipo() === "^") { p++; return Math.pow(base, unario()); }
                      return base;
                    }
                
                    function posfixo(){
                      var v = primario();
                      for (;;) {
                        if (tipo() === "!") { p++; v = fatorial(v); continue; }
                        if (tipo() === "%") { p++; v = v / 100; continue; }
                        return v;
                      }
                    }
                
                    function primario(){
                      var tk = olhar();
                      if (!tk) { throw new Error("incompleto"); }
                      if (tk.t === "num") { p++; return tk.v; }
                      if (tk.t === "(") {
                        p++;
                        var v = expressao();
                        if (tipo() !== ")") { throw new Error("parentese"); }
                        p++;
                        return v;
                      }
                      if (tk.t === "id") {
                        var nome = tk.v; p++;
                        if (nome === "pi") { return Math.PI; }
                        if (nome === "e") { return Math.E; }
                        if (nome === "ans") { return st.ans; }
                        if (nome === "mem" || nome === "mr") { return st.mem; }
                        if (FUNCOES[nome]) {
                          var arg;
                          if (tipo() === "(") {
                            p++;
                            arg = expressao();
                            if (tipo() !== ")") { throw new Error("parentese"); }
                            p++;
                          } else {
                            arg = potencia();
                          }
                          return aplicarFuncao(nome, arg);
                        }
                        throw new Error("nome");
                      }
                      throw new Error("inesperado");
                    }
                
                    var res = expressao();
                    if (p < toks.length) { throw new Error("sobra"); }
                    if (typeof res !== "number" || isNaN(res)) { throw new Error("invalido"); }
                    return res;
                  }
                
                  function formatar(n){
                    if (n === Infinity) { return "\u221e"; }
                    if (n === -Infinity) { return "-\u221e"; }
                    if (typeof n !== "number" || isNaN(n)) { return "Erro"; }
                    if (n === 0) { return "0"; }
                    var a = Math.abs(n);
                    if (a >= 1e15 || a < 1e-9) {
                      return n.toExponential(8)
                        .replace(/(\.\d*?)0+e/, "$1e").replace(/\.e/, "e").replace(".", ",");
                    }
                    var r = Math.round(n * 1e10) / 1e10;
                    try { return r.toLocaleString("pt-BR", { maximumFractionDigits: 10 }); }
                    catch (e) { return String(r).replace(".", ","); }
                  }
                
                  /* ================= interface ================= */
                
                  var BOTOES = [
                    { t: "DEG", k: "modo", c: "pcalc-mem" },
                    { t: "MC", k: "mc", c: "pcalc-mem" },
                    { t: "MR", k: "mr", c: "pcalc-mem" },
                    { t: "M+", k: "m+", c: "pcalc-mem" },
                    { t: "M\u2212", k: "m-", c: "pcalc-mem" },
                
                    { t: "sin", k: "ins", v: "sin(", c: "pcalc-fn" },
                    { t: "cos", k: "ins", v: "cos(", c: "pcalc-fn" },
                    { t: "tan", k: "ins", v: "tan(", c: "pcalc-fn" },
                    { t: "ln", k: "ins", v: "ln(", c: "pcalc-fn" },
                    { t: "log", k: "ins", v: "log(", c: "pcalc-fn" },
                
                    { t: "asin", k: "ins", v: "asin(", c: "pcalc-fn pcalc-peq" },
                    { t: "acos", k: "ins", v: "acos(", c: "pcalc-fn pcalc-peq" },
                    { t: "atan", k: "ins", v: "atan(", c: "pcalc-fn pcalc-peq" },
                    { t: "e\u02e3", k: "ins", v: "exp(", c: "pcalc-fn" },
                    { t: "|x|", k: "ins", v: "abs(", c: "pcalc-fn" },
                
                    { t: "\u221a", k: "ins", v: "\u221a(", c: "pcalc-fn" },
                    { t: "x\u00b2", k: "ins", v: "\u00b2", c: "pcalc-fn" },
                    { t: "x\u02b8", k: "ins", v: "^", c: "pcalc-fn" },
                    { t: "n!", k: "ins", v: "!", c: "pcalc-fn" },
                    { t: "1/x", k: "inv", c: "pcalc-fn" },
                
                    { t: "\u03c0", k: "ins", v: "\u03c0", c: "pcalc-fn" },
                    { t: "e", k: "ins", v: "e", c: "pcalc-fn" },
                    { t: "(", k: "ins", v: "(", c: "pcalc-fn" },
                    { t: ")", k: "ins", v: ")", c: "pcalc-fn" },
                    { t: "%", k: "ins", v: "%", c: "pcalc-fn" },
                
                    { t: "C", k: "limpar", c: "pcalc-acao" },
                    { t: "\u232b", k: "apagar", c: "pcalc-acao" },
                    { t: "\u00b1", k: "sinal", c: "pcalc-acao" },
                    { t: "ANS", k: "ins", v: "ans", c: "pcalc-acao pcalc-peq" },
                    { t: "\u00f7", k: "ins", v: "\u00f7", c: "pcalc-op" },
                
                    { t: "7", k: "ins", v: "7" },
                    { t: "8", k: "ins", v: "8" },
                    { t: "9", k: "ins", v: "9" },
                    { t: "HIST", k: "hist", c: "pcalc-acao pcalc-peq" },
                    { t: "\u00d7", k: "ins", v: "\u00d7", c: "pcalc-op" },
                
                    { t: "4", k: "ins", v: "4" },
                    { t: "5", k: "ins", v: "5" },
                    { t: "6", k: "ins", v: "6" },
                    { t: "COPIAR", k: "copiar", c: "pcalc-acao pcalc-peq" },
                    { t: "\u2212", k: "ins", v: "-", c: "pcalc-op" },
                
                    { t: "1", k: "ins", v: "1" },
                    { t: "2", k: "ins", v: "2" },
                    { t: "3", k: "ins", v: "3" },
                    { t: "MOD", k: "ins", v: " mod ", c: "pcalc-acao pcalc-peq" },
                    { t: "+", k: "ins", v: "+", c: "pcalc-op" },
                
                    { t: "0", k: "ins", v: "0" },
                    { t: ",", k: "ins", v: "," },
                    { t: "=", k: "igual", c: "pcalc-igual" }
                  ];
                
                  var expr = "";
                  var resultado = "0";
                  var erro = false;
                  var recemCalculado = false;
                
                  var janela, elExpr, elRes, elTags, elHist, btnModo, botao;
                
                  function criar(){
                    botao = document.createElement("button");
                    botao.id = "pcalcBotao";
                    botao.type = "button";
                    botao.title = "Calculadora cientifica (arraste para mover)";
                    botao.setAttribute("aria-label", "Abrir calculadora cientifica");
                    botao.textContent = "\ud83e\uddee";
                    document.body.appendChild(botao);
                
                    janela = document.createElement("div");
                    janela.id = "pcalcJanela";
                    janela.className = "pcalc-oculto";
                    janela.setAttribute("role", "dialog");
                    janela.setAttribute("aria-label", "Calculadora cientifica");
                    janela.tabIndex = 0;
                
                    var barra = document.createElement("div");
                    barra.className = "pcalc-barra";
                    var titulo = document.createElement("span");
                    titulo.className = "pcalc-titulo";
                    titulo.textContent = "Calculadora Cientifica";
                    barra.appendChild(titulo);
                
                    var bMin = document.createElement("button");
                    bMin.type = "button";
                    bMin.title = "Minimizar";
                    bMin.setAttribute("data-pcalc", "minimizar");
                    bMin.textContent = "\u2013";
                    var bFec = document.createElement("button");
                    bFec.type = "button";
                    bFec.title = "Fechar";
                    bFec.setAttribute("data-pcalc", "fechar");
                    bFec.textContent = "\u00d7";
                    barra.appendChild(bMin);
                    barra.appendChild(bFec);
                    janela.appendChild(barra);
                
                    var corpo = document.createElement("div");
                    corpo.className = "pcalc-corpo";
                
                    var visor = document.createElement("div");
                    visor.className = "pcalc-visor";
                    elExpr = document.createElement("div");
                    elExpr.className = "pcalc-expr";
                    elRes = document.createElement("div");
                    elRes.className = "pcalc-res";
                    elTags = document.createElement("div");
                    elTags.className = "pcalc-tags";
                    visor.appendChild(elExpr);
                    visor.appendChild(elRes);
                    visor.appendChild(elTags);
                    corpo.appendChild(visor);
                
                    var grid = document.createElement("div");
                    grid.className = "pcalc-grid";
                    var i;
                    for (i = 0; i < BOTOES.length; i++) {
                      var b = BOTOES[i];
                      var el = document.createElement("button");
                      el.type = "button";
                      el.textContent = b.t;
                      if (b.c) { el.className = b.c; }
                      el.setAttribute("data-k", b.k);
                      if (b.v !== undefined) { el.setAttribute("data-v", b.v); }
                      if (b.k === "modo") { btnModo = el; }
                      grid.appendChild(el);
                    }
                    corpo.appendChild(grid);
                
                    elHist = document.createElement("div");
                    elHist.className = "pcalc-hist pcalc-oculto";
                    corpo.appendChild(elHist);
                
                    janela.appendChild(corpo);
                    document.body.appendChild(janela);
                
                    grid.addEventListener("click", function(ev){
                      var alvo = ev.target;
                      while (alvo && alvo !== grid && alvo.tagName !== "BUTTON") { alvo = alvo.parentNode; }
                      if (!alvo || alvo === grid) { return; }
                      acao(alvo.getAttribute("data-k"), alvo.getAttribute("data-v"));
                      janela.focus();
                    });
                
                    barra.addEventListener("click", function(ev){
                      var alvo = ev.target;
                      if (!alvo || !alvo.getAttribute) { return; }
                      var k = alvo.getAttribute("data-pcalc");
                      if (k === "fechar") { mostrar(false); }
                      else if (k === "minimizar") {
                        st.minimizado = !st.minimizado;
                        janela.className = st.minimizado ? "pcalc-minimizado" : "";
                        salvar();
                      }
                    });
                
                    elHist.addEventListener("click", function(ev){
                      var alvo = ev.target;
                      while (alvo && alvo !== elHist &&
                             !(alvo.getAttribute && alvo.getAttribute("data-hi") !== null)) {
                        alvo = alvo.parentNode;
                      }
                      if (!alvo || alvo === elHist) { return; }
                      if (alvo.getAttribute("data-hi") === "limpar") {
                        st.hist = []; salvar(); desenharHist(); return;
                      }
                      var idx = parseInt(alvo.getAttribute("data-hi"), 10);
                      var it = st.hist[idx];
                      if (it && it.e) {
                        expr = it.e; erro = false; recemCalculado = false; atualizar();
                      }
                    });
                
                    janela.addEventListener("keydown", teclado);
                    arrastar(janela, barra, "x", "y");
                    arrastar(botao, botao, "bx", "by", function(){ mostrar(!st.aberto); });
                  }
                
                  /* --- arrastar (mouse e toque) --- */
                  function arrastar(alvo, pega, chX, chY, aoClicar){
                    var ativo = false, moveu = false, ox = 0, oy = 0, idp = null;
                
                    function pos(ev){
                      if (ev.touches && ev.touches[0]) { return { x: ev.touches[0].clientX, y: ev.touches[0].clientY }; }
                      return { x: ev.clientX, y: ev.clientY };
                    }
                    function inicio(ev){
                      if (ev.button !== undefined && ev.button !== 0) { return; }
                      if (ev.target && ev.target.tagName === "BUTTON" && ev.target !== alvo) { return; }
                      var r = alvo.getBoundingClientRect();
                      var pt = pos(ev);
                      ativo = true; moveu = false;
                      ox = pt.x - r.left; oy = pt.y - r.top;
                      alvo.style.left = r.left + "px";
                      alvo.style.top = r.top + "px";
                      alvo.style.right = "auto";
                      alvo.style.bottom = "auto";
                      if (alvo === botao) { botao.className = "pcalc-arrastando"; }
                      if (ev.pointerId !== undefined && pega.setPointerCapture) {
                        idp = ev.pointerId;
                        try { pega.setPointerCapture(idp); } catch (e) {}
                      }
                    }
                    function mover(ev){
                      if (!ativo) { return; }
                      var pt = pos(ev);
                      var r = alvo.getBoundingClientRect();
                      var nx = pt.x - ox, ny = pt.y - oy;
                      if (Math.abs(nx - r.left) > 3 || Math.abs(ny - r.top) > 3) { moveu = true; }
                      var maxX = Math.max(0, window.innerWidth - r.width);
                      var maxY = Math.max(0, window.innerHeight - r.height);
                      nx = Math.min(Math.max(0, nx), maxX);
                      ny = Math.min(Math.max(0, ny), maxY);
                      alvo.style.left = nx + "px";
                      alvo.style.top = ny + "px";
                      st[chX] = nx; st[chY] = ny;
                      if (ev.cancelable) { ev.preventDefault(); }
                    }
                    function fim(){
                      if (!ativo) { return; }
                      ativo = false;
                      if (alvo === botao) { botao.className = ""; }
                      salvar();
                      if (!moveu && aoClicar) { aoClicar(); }
                    }
                
                    if (window.PointerEvent) {
                      pega.addEventListener("pointerdown", inicio);
                      document.addEventListener("pointermove", mover);
                      document.addEventListener("pointerup", fim);
                      document.addEventListener("pointercancel", fim);
                    } else {
                      pega.addEventListener("mousedown", inicio);
                      document.addEventListener("mousemove", mover);
                      document.addEventListener("mouseup", fim);
                      pega.addEventListener("touchstart", inicio, { passive: true });
                      document.addEventListener("touchmove", mover, { passive: false });
                      document.addEventListener("touchend", fim);
                    }
                  }
                
                  function aplicarPosicao(){
                    if (typeof st.x === "number" && typeof st.y === "number") {
                      var lx = Math.min(st.x, Math.max(0, window.innerWidth - 120));
                      var ly = Math.min(st.y, Math.max(0, window.innerHeight - 60));
                      janela.style.left = lx + "px";
                      janela.style.top = ly + "px";
                      janela.style.right = "auto";
                      janela.style.bottom = "auto";
                    }
                    if (typeof st.bx === "number" && typeof st.by === "number") {
                      var bxx = Math.min(st.bx, Math.max(0, window.innerWidth - 56));
                      var byy = Math.min(st.by, Math.max(0, window.innerHeight - 56));
                      botao.style.left = bxx + "px";
                      botao.style.top = byy + "px";
                      botao.style.right = "auto";
                      botao.style.bottom = "auto";
                    }
                  }
                
                  function mostrar(abrir){
                    st.aberto = !!abrir;
                    janela.className = st.aberto
                      ? (st.minimizado ? "pcalc-minimizado" : "")
                      : "pcalc-oculto";
                    if (st.aberto) { aplicarPosicao(); janela.focus(); }
                    salvar();
                  }
                
                  /* --- acoes dos botoes --- */
                  function acao(k, v){
                    if (k === "ins") {
                      if (recemCalculado && /^[0-9,\u03c0e(]$/.test(v || "")) { expr = ""; }
                      recemCalculado = false;
                      expr += (v === null ? "" : v);
                      erro = false;
                      atualizar();
                      return;
                    }
                    if (k === "limpar") { expr = ""; resultado = "0"; erro = false; recemCalculado = false; atualizar(); return; }
                    if (k === "apagar") {
                      recemCalculado = false;
                      expr = expr.replace(/(\s?mod\s?|[a-z]+\(|.)$/, "");
                      erro = false; atualizar(); return;
                    }
                    if (k === "sinal") {
                      recemCalculado = false;
                      if (!expr) { expr = "-"; }
                      else if (/^-\(.*\)$/.test(expr)) { expr = expr.slice(2, -1); }
                      else if (expr === "-") { expr = ""; }
                      else { expr = "-(" + expr + ")"; }
                      atualizar(); return;
                    }
                    if (k === "inv") {
                      recemCalculado = false;
                      if (expr) { expr = "1/(" + expr + ")"; }
                      else { expr = "1/("; }
                      atualizar(); return;
                    }
                    if (k === "igual") { igual(); return; }
                    if (k === "modo") { st.graus = !st.graus; salvar(); atualizar(); return; }
                    if (k === "hist") {
                      var oculto = elHist.className.indexOf("pcalc-oculto") >= 0;
                      elHist.className = "pcalc-hist" + (oculto ? "" : " pcalc-oculto");
                      if (oculto) { desenharHist(); }
                      return;
                    }
                    if (k === "mc") { st.mem = 0; salvar(); atualizar(); return; }
                    if (k === "mr") { acao("ins", "mem"); return; }
                    if (k === "m+" || k === "m-") {
                      var val = valorAtual();
                      if (val !== null) {
                        st.mem = (k === "m+") ? st.mem + val : st.mem - val;
                        salvar(); atualizar();
                      }
                      return;
                    }
                    if (k === "copiar") { copiar(); return; }
                  }
                
                  function valorAtual(){
                    if (!expr) { return st.ans; }
                    try { return calcular(expr); } catch (e) { return null; }
                  }
                
                  function igual(){
                    if (!expr) { return; }
                    var v;
                    try { v = calcular(expr); }
                    catch (e) {
                      erro = true;
                      resultado = (e && e.message === "divisao por zero")
                        ? "Nao da para dividir por zero"
                        : "Conta incompleta ou invalida";
                      pintar();
                      return;
                    }
                    erro = false;
                    st.ans = v;
                    resultado = formatar(v);
                    st.hist.unshift({ e: expr, r: resultado });
                    if (st.hist.length > 40) { st.hist.length = 40; }
                    recemCalculado = true;
                    salvar();
                    desenharHist();
                    pintar();
                  }
                
                  function copiar(){
                    var txt = String(resultado);
                    try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(txt);
                      } else {
                        var ta = document.createElement("textarea");
                        ta.value = txt;
                        ta.style.position = "fixed";
                        ta.style.left = "-9999px";
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand("copy");
                        document.body.removeChild(ta);
                      }
                      var antes = elTags.textContent;
                      elTags.textContent = "RESULTADO COPIADO";
                      setTimeout(function(){ if (elTags.textContent === "RESULTADO COPIADO") { pintar(); } }, 1200);
                      if (antes) { /* nada */ }
                    } catch (e) {}
                  }
                
                  function atualizar(){
                    if (!erro && expr) {
                      try { resultado = formatar(calcular(expr)); }
                      catch (e) { /* mantem o ultimo resultado enquanto digita */ }
                    }
                    if (!expr && !erro) { resultado = formatar(st.ans); }
                    pintar();
                  }
                
                  function pintar(){
                    elExpr.textContent = expr || "\u00a0";
                    elRes.textContent = resultado;
                    elRes.className = "pcalc-res" + (erro ? " pcalc-erro" : "");
                    var tags = [st.graus ? "GRAUS" : "RADIANOS"];
                    if (st.mem) { tags.push("M = " + formatar(st.mem)); }
                    elTags.textContent = tags.join("  \u2022  ");
                    if (btnModo) {
                      btnModo.textContent = st.graus ? "DEG" : "RAD";
                      btnModo.className = "pcalc-mem" + (st.graus ? "" : " pcalc-ativo");
                    }
                  }
                
                  function desenharHist(){
                    while (elHist.firstChild) { elHist.removeChild(elHist.firstChild); }
                    if (!st.hist.length) {
                      var vazio = document.createElement("div");
                      vazio.className = "pcalc-hist-vazio";
                      vazio.textContent = "Nenhuma conta no historico ainda.";
                      elHist.appendChild(vazio);
                      return;
                    }
                    var i;
                    for (i = 0; i < st.hist.length; i++) {
                      var it = st.hist[i];
                      var linha = document.createElement("div");
                      linha.className = "pcalc-hist-item";
                      linha.setAttribute("data-hi", String(i));
                      linha.title = "Clique para reutilizar esta conta";
                      linha.appendChild(document.createTextNode(String(it.e) + " = "));
                      var forte = document.createElement("b");
                      forte.textContent = String(it.r);
                      linha.appendChild(forte);
                      elHist.appendChild(linha);
                    }
                    var limpar = document.createElement("button");
                    limpar.type = "button";
                    limpar.className = "pcalc-hist-limpar";
                    limpar.setAttribute("data-hi", "limpar");
                    limpar.textContent = "Limpar historico";
                    elHist.appendChild(limpar);
                  }
                
                  /* --- teclado (somente com a calculadora em foco) --- */
                  function teclado(ev){
                    var t = ev.target;
                    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) { return; }
                    var k = ev.key;
                    if (k === undefined) { return; }
                    if (k === "Enter" || k === "=") { acao("igual"); ev.preventDefault(); return; }
                    if (k === "Backspace") { acao("apagar"); ev.preventDefault(); return; }
                    if (k === "Escape") { acao("limpar"); ev.preventDefault(); return; }
                    if (k === "Delete") { acao("limpar"); ev.preventDefault(); return; }
                    if (/^[0-9]$/.test(k)) { acao("ins", k); ev.preventDefault(); return; }
                    if (k === "." || k === ",") { acao("ins", ","); ev.preventDefault(); return; }
                    if (k === "+" || k === "-" || k === "(" || k === ")" ||
                        k === "^" || k === "!" || k === "%") { acao("ins", k); ev.preventDefault(); return; }
                    if (k === "*") { acao("ins", "\u00d7"); ev.preventDefault(); return; }
                    if (k === "/") { acao("ins", "\u00f7"); ev.preventDefault(); return; }
                  }
                
                  /* --- atalho de teclado global: Alt + C --- */
                  document.addEventListener("keydown", function(ev){
                    if (ev.altKey && !ev.ctrlKey && !ev.shiftKey &&
                        (ev.key === "c" || ev.key === "C")) {
                      mostrar(!st.aberto);
                      ev.preventDefault();
                    }
                  });
                
                  function iniciar(){
                    carregar();
                    criar();
                    aplicarPosicao();
                    resultado = formatar(st.ans);
                    pintar();
                    desenharHist();
                    if (st.aberto) { mostrar(true); }
                    window.addEventListener("resize", aplicarPosicao);
                    window.abrirCalculadora = function(){ mostrar(true); };
                    window.fecharCalculadora = function(){ mostrar(false); };
                  }
                
                  if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", iniciar);
                  } else {
                    iniciar();
                  }
                })();
            
