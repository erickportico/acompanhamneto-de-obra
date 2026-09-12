
                /* === PATCH 51: instalacao em parcelas por data (funcionamento) === */
                (function () {
                  "use strict";
                
                  var MODAL_ID = 'modalParcelasInstalacao';
                  var itemAtualId = null;
                  var rascunho = [];          /* parcelas em edicao: [{data, qtd}] */
                  var meuGrafico = null;
                
                  /* ------------------------------------------------------------------ *
                   * 1) ajudinhas gerais
                   * ------------------------------------------------------------------ */
                
                  function obraAtual() {
                    try {
                      if (typeof getObraAtual === 'function') { return getObraAtual(); }
                    } catch (e) {}
                    return null;
                  }
                
                  function achaItem(id) {
                    var obra = obraAtual();
                    if (!obra || !obra.itens) { return null; }
                    for (var i = 0; i < obra.itens.length; i++) {
                      if (String(obra.itens[i].id) === String(id)) { return obra.itens[i]; }
                    }
                    return null;
                  }
                
                  function parcelasDo(item) {
                    if (!item) { return []; }
                    if (!Array.isArray(item.historicoInstalacao)) { return []; }
                    return item.historicoInstalacao.filter(function (p) {
                      return p && p.data && Number(p.qtd) > 0;
                    });
                  }
                
                  function somaParcelas(lista) {
                    var s = 0;
                    (lista || []).forEach(function (p) { s += Number(p && p.qtd) || 0; });
                    return s;
                  }
                
                  function hoje() {
                    var d = new Date();
                    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) +
                           '-' + ('0' + d.getDate()).slice(-2);
                  }
                
                  function somaDias(dataStr, dias) {
                    var p = String(dataStr || '').split('-');
                    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
                    if (isNaN(d.getTime())) { d = new Date(); }
                    d.setDate(d.getDate() + Number(dias || 0));
                    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) +
                           '-' + ('0' + d.getDate()).slice(-2);
                  }
                
                  function areaUnit(item) {
                    return (Number(item && item.larg) || 0) * (Number(item && item.alt) || 0);
                  }
                
                  function num2(v) {
                    return Number(v || 0).toLocaleString('pt-BR',
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  }
                
                  function el(tag, texto, css) {
                    var n = document.createElement(tag);
                    if (texto !== undefined && texto !== null) { n.textContent = String(texto); }
                    if (css) { n.style.cssText = css; }
                    return n;
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 2) coluna "Parcelas" na tabela da aba Instalacao
                   * ------------------------------------------------------------------ */
                
                  function tabelaInstalacao() {
                    var tb = document.getElementById('tbodyInstalacao');
                    if (!tb) { return null; }
                    var t = tb.parentNode;
                    while (t && t.tagName !== 'TABLE') { t = t.parentNode; }
                    return t;
                  }
                
                  function garantirCabecalho() {
                    var tabela = tabelaInstalacao();
                    if (!tabela) { return; }
                    var linha = tabela.querySelector('thead tr');
                    if (!linha || linha.querySelector('.p51-col-parcelas')) { return; }
                    var th = document.createElement('th');
                    th.className = 'head-inst p51-col-parcelas';
                    var div = el('div', 'Parcelas');
                    div.className = 'th-content';
                    th.appendChild(div);
                    var ths = linha.children;
                    if (ths.length) { linha.insertBefore(th, ths[ths.length - 1]); }
                    else { linha.appendChild(th); }
                  }
                
                  function idDaLinha(tr) {
                    var b = tr.querySelector('button[onclick*="softDeleteFromTab"]');
                    if (!b) { return null; }
                    var m = /softDeleteFromTab\(\s*([0-9]+)/.exec(b.getAttribute('onclick') || '');
                    return m ? m[1] : null;
                  }
                
                  function garantirBotoes() {
                    var tbody = document.getElementById('tbodyInstalacao');
                    if (!tbody) { return; }
                    garantirCabecalho();
                    var linhas = tbody.querySelectorAll('tr');
                    for (var i = 0; i < linhas.length; i++) {
                      var tr = linhas[i];
                      if (tr.querySelector('.p51-col-parcelas')) { continue; }
                      var id = idDaLinha(tr);
                      if (!id) { continue; }
                      var item = achaItem(id);
                      var qtdP = parcelasDo(item).length;
                
                      var td = document.createElement('td');
                      td.className = 'p51-col-parcelas';
                      var caixa = el('div');
                      caixa.className = 'td-content';
                
                      var bt = document.createElement('button');
                      bt.type = 'button';
                      bt.className = 'p51-btn' + (qtdP ? ' p51-tem' : '');
                      bt.textContent = '📅';
                      bt.title = qtdP ? ('Instalacao em parcelas (' + qtdP + ' lancada(s))')
                                      : 'Lancar instalacao em parcelas por data';
                      bt.setAttribute('data-p51-id', id);
                      bt.addEventListener('click', function (ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        abrirModal(this.getAttribute('data-p51-id'));
                      });
                      caixa.appendChild(bt);
                
                      if (qtdP) {
                        var c = el('span', qtdP);
                        c.className = 'p51-cont';
                        caixa.appendChild(c);
                      }
                
                      td.appendChild(caixa);
                      var tds = tr.children;
                      if (tds.length) { tr.insertBefore(td, tds[tds.length - 1]); }
                      else { tr.appendChild(td); }
                    }
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 3) a janelinha (modal) de parcelas
                   * ------------------------------------------------------------------ */
                
                  function criarModal() {
                    var pronto = document.getElementById(MODAL_ID);
                    if (pronto) { return pronto; }
                
                    var bg = el('div');
                    bg.className = 'modal-bg';
                    bg.id = MODAL_ID;
                
                    var modal = el('div');
                    modal.className = 'modal';
                
                    modal.appendChild(el('h3', '📅 Instalação em parcelas por data'));
                
                    var titulo = el('div');
                    titulo.id = 'p51Titulo';
                    titulo.style.cssText = 'font-size:0.85rem;font-weight:600;margin-bottom:4px;';
                    modal.appendChild(titulo);
                
                    var info = el('div');
                    info.className = 'p51-info';
                    info.id = 'p51Info';
                    modal.appendChild(info);
                
                    /* -- divisao automatica -- */
                    var auto = el('div');
                    auto.className = 'p51-caixa';
                    auto.appendChild(el('h4', 'Dividir automaticamente'));
                
                    var grade = el('div');
                    grade.className = 'p51-auto';
                
                    function campo(rotulo, id, tipo, valor, minimo, passo) {
                      var box = el('div');
                      var lb = el('label', rotulo);
                      lb.setAttribute('for', id);
                      var inp = document.createElement('input');
                      inp.type = tipo;
                      inp.id = id;
                      inp.value = valor;
                      if (minimo !== undefined) { inp.min = minimo; }
                      if (passo !== undefined) { inp.step = passo; }
                      box.appendChild(lb);
                      box.appendChild(inp);
                      return box;
                    }
                
                    grade.appendChild(campo('Peças a dividir', 'p51AutoQtd', 'number', '0', '0', '1'));
                    grade.appendChild(campo('Nº de parcelas', 'p51AutoPartes', 'number', '4', '1', '1'));
                
                    var boxInt = el('div');
                    var lbInt = el('label', 'Intervalo');
                    lbInt.setAttribute('for', 'p51AutoInt');
                    var selInt = document.createElement('select');
                    selInt.id = 'p51AutoInt';
                    [['7', 'Semanal (7 dias)'], ['15', 'Quinzenal (15 dias)'],
                     ['30', 'Mensal (30 dias)'], ['1', 'Diário (1 dia)']].forEach(function (o) {
                      var op = document.createElement('option');
                      op.value = o[0];
                      op.textContent = o[1];
                      selInt.appendChild(op);
                    });
                    boxInt.appendChild(lbInt);
                    boxInt.appendChild(selInt);
                    grade.appendChild(boxInt);
                
                    grade.appendChild(campo('1ª data', 'p51AutoData', 'date', hoje()));
                    auto.appendChild(grade);
                
                    var btGerar = document.createElement('button');
                    btGerar.type = 'button';
                    btGerar.className = 'secondary';
                    btGerar.style.cssText = 'margin-top:8px;';
                    btGerar.textContent = '⚙️ Gerar parcelas';
                    btGerar.addEventListener('click', gerarAutomatico);
                    auto.appendChild(btGerar);
                
                    modal.appendChild(auto);
                
                    /* -- lista manual -- */
                    var caixaLista = el('div');
                    caixaLista.className = 'p51-caixa';
                    caixaLista.appendChild(el('h4', 'Parcelas lançadas'));
                
                    var lista = el('div');
                    lista.className = 'p51-lista';
                    lista.id = 'p51Lista';
                    caixaLista.appendChild(lista);
                
                    var btAdd = document.createElement('button');
                    btAdd.type = 'button';
                    btAdd.className = 'secondary';
                    btAdd.style.cssText = 'margin-top:8px;';
                    btAdd.textContent = '➕ Adicionar parcela';
                    btAdd.addEventListener('click', function () {
                      var ult = rascunho.length ? rascunho[rascunho.length - 1].data : hoje();
                      rascunho.push({ data: rascunho.length ? somaDias(ult, 7) : hoje(), qtd: 0 });
                      pintarLista();
                    });
                    caixaLista.appendChild(btAdd);
                
                    modal.appendChild(caixaLista);
                
                    var erro = el('div');
                    erro.className = 'p51-erro';
                    erro.id = 'p51Erro';
                    modal.appendChild(erro);
                
                    /* -- rodape -- */
                    var rodape = el('div');
                    rodape.className = 'p51-rodape';
                
                    var btLimpar = document.createElement('button');
                    btLimpar.type = 'button';
                    btLimpar.className = 'secondary';
                    btLimpar.textContent = '🧹 Limpar tudo';
                    btLimpar.addEventListener('click', function () {
                      rascunho = [];
                      pintarLista();
                    });
                    rodape.appendChild(btLimpar);
                
                    var dir = el('div');
                    dir.className = 'p51-dir';
                
                    var btCancelar = document.createElement('button');
                    btCancelar.type = 'button';
                    btCancelar.className = 'secondary';
                    btCancelar.textContent = 'Cancelar';
                    btCancelar.addEventListener('click', fecharModal);
                    dir.appendChild(btCancelar);
                
                    var btSalvar = document.createElement('button');
                    btSalvar.type = 'button';
                    btSalvar.className = 'success';
                    btSalvar.textContent = 'Salvar parcelas';
                    btSalvar.addEventListener('click', salvarParcelas);
                    dir.appendChild(btSalvar);
                
                    rodape.appendChild(dir);
                    modal.appendChild(rodape);
                
                    bg.appendChild(modal);
                    bg.addEventListener('click', function (ev) {
                      if (ev.target === bg) { fecharModal(); }
                    });
                
                    document.body.appendChild(bg);
                    return bg;
                  }
                
                  function abrirModal(id) {
                    var item = achaItem(id);
                    if (!item) {
                      alert('Item nao encontrado. Atualize a pagina e tente de novo.');
                      return;
                    }
                    itemAtualId = id;
                    rascunho = parcelasDo(item).map(function (p) {
                      return { data: String(p.data), qtd: Number(p.qtd) || 0 };
                    });
                    /* quem nunca usou parcelas comeca com o que ja estava lancado */
                    if (!rascunho.length && Number(item.instalado || 0) > 0) {
                      rascunho.push({
                        data: item.dataInstalacao || hoje(),
                        qtd: Number(item.instalado) || 0
                      });
                    }
                
                    var bg = criarModal();
                
                    var tit = document.getElementById('p51Titulo');
                    if (tit) {
                      var ref = item.ref || 'S/N';
                      var tipo = item.tipo ? (' — ' + item.tipo) : '';
                      tit.textContent = 'Esquadria ' + ref + tipo;
                    }
                
                    var restante = Math.max(0, (Number(item.qtd) || 0) - somaParcelas(rascunho));
                    var campoQtd = document.getElementById('p51AutoQtd');
                    if (campoQtd) { campoQtd.value = String(restante || (Number(item.qtd) || 0)); }
                    var campoData = document.getElementById('p51AutoData');
                    if (campoData && !campoData.value) { campoData.value = hoje(); }
                
                    pintarLista();
                    bg.style.display = 'flex';
                  }
                
                  function fecharModal() {
                    var bg = document.getElementById(MODAL_ID);
                    if (bg) { bg.style.display = 'none'; }
                    itemAtualId = null;
                    rascunho = [];
                  }
                
                  function gerarAutomatico() {
                    var item = achaItem(itemAtualId);
                    if (!item) { return; }
                    var total = Number((document.getElementById('p51AutoQtd') || {}).value) || 0;
                    var partes = Math.floor(Number((document.getElementById('p51AutoPartes') || {}).value) || 0);
                    var passo = Number((document.getElementById('p51AutoInt') || {}).value) || 7;
                    var inicio = (document.getElementById('p51AutoData') || {}).value || hoje();
                
                    if (total <= 0) { return aviso('Informe quantas peças quer dividir.'); }
                    if (partes <= 0) { return aviso('Informe em quantas parcelas quer dividir.'); }
                    if (total > (Number(item.qtd) || 0)) {
                      return aviso('A quantidade a dividir (' + total + ') é maior que o total da esquadria (' +
                                   (Number(item.qtd) || 0) + ').');
                    }
                
                    /* divide em partes inteiras; a sobra vai para as primeiras parcelas */
                    var base = Math.floor(total / partes);
                    var sobra = total - (base * partes);
                    var novas = [];
                    for (var i = 0; i < partes; i++) {
                      var q = base + (i < sobra ? 1 : 0);
                      if (q <= 0) { continue; }
                      novas.push({ data: somaDias(inicio, passo * i), qtd: q });
                    }
                    rascunho = novas;
                    aviso('');
                    pintarLista();
                  }
                
                  function aviso(msg) {
                    var e = document.getElementById('p51Erro');
                    if (e) { e.textContent = msg || ''; }
                  }
                
                  function pintarLista() {
                    var item = achaItem(itemAtualId);
                    var lista = document.getElementById('p51Lista');
                    if (!lista) { return; }
                    while (lista.firstChild) { lista.removeChild(lista.firstChild); }
                
                    if (!rascunho.length) {
                      var vazio = el('div', 'Nenhuma parcela lançada. Use a divisão automática ou o botão "Adicionar parcela".');
                      vazio.className = 'p51-vazio';
                      lista.appendChild(vazio);
                    }
                
                    var au = areaUnit(item);
                
                    rascunho.forEach(function (p, idx) {
                      var linha = el('div');
                      linha.className = 'p51-linha';
                
                      var n = el('div', (idx + 1) + '.');
                      n.className = 'p51-num';
                      linha.appendChild(n);
                
                      var data = document.createElement('input');
                      data.type = 'date';
                      data.value = p.data || '';
                      data.setAttribute('aria-label', 'Data da parcela ' + (idx + 1));
                      data.addEventListener('change', function () {
                        rascunho[idx].data = this.value;
                        pintarInfo();
                      });
                      linha.appendChild(data);
                
                      var qtd = document.createElement('input');
                      qtd.type = 'number';
                      qtd.min = '0';
                      qtd.step = '1';
                      qtd.value = String(Number(p.qtd) || 0);
                      qtd.setAttribute('aria-label', 'Quantidade da parcela ' + (idx + 1));
                      qtd.addEventListener('input', function () {
                        rascunho[idx].qtd = Number(this.value) || 0;
                        pintarInfo();
                        var alvo = linha.querySelector('.p51-m2');
                        if (alvo) { alvo.textContent = num2((Number(this.value) || 0) * au) + ' m²'; }
                      });
                      linha.appendChild(qtd);
                
                      var m2 = el('div', num2((Number(p.qtd) || 0) * au) + ' m²');
                      m2.className = 'p51-m2';
                      linha.appendChild(m2);
                
                      var bt = document.createElement('button');
                      bt.type = 'button';
                      bt.className = 'p51-btn';
                      bt.textContent = '🗑️';
                      bt.title = 'Apagar esta parcela';
                      bt.addEventListener('click', function () {
                        rascunho.splice(idx, 1);
                        pintarLista();
                      });
                      linha.appendChild(bt);
                
                      lista.appendChild(linha);
                    });
                
                    pintarInfo();
                  }
                
                  function pintarInfo() {
                    var item = achaItem(itemAtualId);
                    var info = document.getElementById('p51Info');
                    if (!info || !item) { return; }
                    while (info.firstChild) { info.removeChild(info.firstChild); }
                
                    var total = Number(item.qtd) || 0;
                    var lancado = somaParcelas(rascunho);
                    var restante = total - lancado;
                    var au = areaUnit(item);
                
                    function bloco(rotulo, valor, cor) {
                      var s = el('span');
                      s.appendChild(document.createTextNode(rotulo + ': '));
                      var b = el('b', valor);
                      if (cor) { b.style.color = cor; }
                      s.appendChild(b);
                      info.appendChild(s);
                    }
                
                    bloco('Qtd total', String(total));
                    bloco('Lançado nas parcelas', String(lancado), '#10b981');
                    bloco('Falta lançar', String(restante), restante < 0 ? '#ef4444' : '');
                    bloco('m² das parcelas', num2(lancado * au) + ' m²');
                
                    if (restante < 0) {
                      aviso('A soma das parcelas (' + lancado + ') passou da quantidade total da esquadria (' + total + ').');
                    } else {
                      aviso('');
                    }
                  }
                
                  function salvarParcelas() {
                    var item = achaItem(itemAtualId);
                    if (!item) { return fecharModal(); }
                
                    var limpas = [];
                    for (var i = 0; i < rascunho.length; i++) {
                      var p = rascunho[i];
                      var q = Number(p.qtd) || 0;
                      if (q <= 0 && !p.data) { continue; }
                      if (!p.data) {
                        return aviso('A parcela ' + (i + 1) + ' está sem data.');
                      }
                      if (q <= 0) {
                        return aviso('A parcela ' + (i + 1) + ' está sem quantidade.');
                      }
                      limpas.push({ data: String(p.data), qtd: q });
                    }
                
                    var total = Number(item.qtd) || 0;
                    var soma = somaParcelas(limpas);
                    if (soma > total) {
                      return aviso('A soma das parcelas (' + soma + ') passou da quantidade total da esquadria (' + total + ').');
                    }
                
                    limpas.sort(function (a, b) { return a.data < b.data ? -1 : (a.data > b.data ? 1 : 0); });
                
                    item.historicoInstalacao = limpas;
                
                    /* mantem o painel inteiro batendo: qtd instalada = soma das parcelas */
                    if (limpas.length) {
                      item.instalado = soma;
                      item.dataInstalacao = limpas[limpas.length - 1].data;
                    } else {
                      item.instalado = 0;
                      delete item.dataInstalacao;
                    }
                
                    fecharModal();
                
                    try {
                      if (typeof salvarDB === 'function') { salvarDB(true); }
                    } catch (e) {}
                    setTimeout(function () {
                      garantirBotoes();
                      desenharGrafico(obraAtual());
                    }, 60);
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 4) grafico "INSTALACAO POR PERIODO (m2)" somando as parcelas
                   * ------------------------------------------------------------------ */
                
                  function periodoEscolhido() {
                    var sel = document.getElementById('selPeriodoInstalacao');
                    if (sel && sel.value) { return sel.value; }
                    try {
                      var s = localStorage.getItem('periodo_instalacao');
                      if (s) { return s; }
                    } catch (e) {}
                    return 'mensal';
                  }
                
                  /* junta tudo que foi instalado: parcelas quando existem,
                     senao a Data de Instalacao antiga do item (nada se perde) */
                  function lancamentos(obra) {
                    var saida = [];
                    (((obra || {}).itens) || []).forEach(function (item) {
                      if (!item) { return; }
                      var au = areaUnit(item);
                      var ps = parcelasDo(item);
                      if (ps.length) {
                        ps.forEach(function (p) {
                          var q = Number(p.qtd) || 0;
                          saida.push({ data: p.data, qtd: q, m2: q * au });
                        });
                        return;
                      }
                      var inst = Number(item.instalado || 0);
                      if (item.dataInstalacao && inst > 0) {
                        saida.push({ data: item.dataInstalacao, qtd: inst, m2: inst * au });
                      }
                    });
                    return saida;
                  }
                
                  function limparCanvas(canvas) {
                    try {
                      if (meuGrafico) { meuGrafico.destroy(); }
                    } catch (e) {}
                    meuGrafico = null;
                    try {
                      if (typeof Chart !== 'undefined' && Chart.getChart) {
                        var velho = Chart.getChart(canvas);
                        if (velho) { velho.destroy(); }
                      }
                    } catch (e) {}
                  }
                
                  function desenharGrafico(obra) {
                    var canvas = document.getElementById('chartInstalacaoPeriodo');
                    if (!canvas || typeof Chart === 'undefined') { return; }
                    if (!obra) { obra = obraAtual(); }
                    if (!obra) { return; }
                    if (typeof _chavePeriodoInstalacao !== 'function') { return; }
                
                    var periodo = periodoEscolhido();
                    var sel = document.getElementById('selPeriodoInstalacao');
                    if (sel && sel.value !== periodo) { sel.value = periodo; }
                
                    var isDark = document.body.classList.contains('dark-mode');
                    var textColor = isDark ? '#f8fafc' : '#1e293b';
                    var gridColor = isDark ? '#334155' : '#cbd5e1';
                
                    var mapa = {};
                    lancamentos(obra).forEach(function (lan) {
                      if (!(lan.m2 > 0)) { return; }
                      var k = _chavePeriodoInstalacao(lan.data, periodo);
                      if (!k) { return; }
                      if (!mapa[k.ordem]) { mapa[k.ordem] = { rotulo: k.rotulo, m2: 0, qtd: 0 }; }
                      mapa[k.ordem].m2 += lan.m2;
                      mapa[k.ordem].qtd += lan.qtd;
                    });
                
                    var ordens = Object.keys(mapa).sort(function (a, b) { return Number(a) - Number(b); });
                    var labels = ordens.map(function (o) { return mapa[o].rotulo; });
                    var valores = ordens.map(function (o) { return Number(mapa[o].m2.toFixed(2)); });
                    var acumulado = [];
                    var soma = 0;
                    valores.forEach(function (v) { soma += v; acumulado.push(Number(soma.toFixed(2))); });
                
                    limparCanvas(canvas);
                
                    if (!labels.length) {
                      meuGrafico = new Chart(canvas, {
                        type: 'bar',
                        data: {
                          labels: ['Sem dados de Data de Instalação'],
                          datasets: [{ data: [0], backgroundColor: '#94a3b8' }]
                        },
                        options: {
                          responsive: true, maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: {
                            y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                            x: { ticks: { color: textColor }, grid: { display: false } }
                          }
                        }
                      });
                      return;
                    }
                
                    meuGrafico = new Chart(canvas, {
                      data: {
                        labels: labels,
                        datasets: [
                          {
                            type: 'bar',
                            label: 'm² instalado no período',
                            data: valores,
                            backgroundColor: '#10b981',
                            barPercentage: 0.7,
                            yAxisID: 'y'
                          },
                          {
                            type: 'line',
                            label: 'm² acumulado',
                            data: acumulado,
                            borderColor: '#f59e0b',
                            backgroundColor: '#f59e0b',
                            borderWidth: 2,
                            tension: 0.25,
                            pointRadius: 3,
                            yAxisID: 'y1'
                          }
                        ]
                      },
                      options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom', labels: { color: textColor } },
                          tooltip: {
                            callbacks: {
                              label: function (ctx) {
                                var extra = '';
                                var chave = ordens[ctx.dataIndex];
                                if (ctx.dataset.type === 'bar' && mapa[chave]) {
                                  extra = ' (' + mapa[chave].qtd + ' pç)';
                                }
                                return ctx.dataset.label + ': ' +
                                  Number(ctx.parsed.y).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) +
                                  ' m²' + extra;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true, position: 'left',
                            title: { display: true, text: 'm² no período', color: textColor },
                            ticks: { color: textColor }, grid: { color: gridColor }
                          },
                          y1: {
                            beginAtZero: true, position: 'right',
                            title: { display: true, text: 'm² acumulado', color: textColor },
                            ticks: { color: textColor }, grid: { display: false }
                          },
                          x: {
                            ticks: { color: textColor, maxRotation: 60, minRotation: 0, font: { size: 9 } },
                            grid: { display: false }
                          }
                        }
                      }
                    });
                  }
                
                  /* ------------------------------------------------------------------ *
                   * 5) encaixe no painel (sem mexer no que ja existe)
                   * ------------------------------------------------------------------ */
                
                  /* se a pessoa digitar a Qtd Instalada direto na tabela, as parcelas
                     acompanham (a diferenca entra/sai da ultima parcela) */
                  function ajustarPorEdicaoManual(id, campo, valor) {
                    var item = achaItem(id);
                    if (!item) { return; }
                    var ps = parcelasDo(item);
                    if (!ps.length) { return; }
                
                    if (campo === 'instalado') {
                      var alvo = Number(valor) || 0;
                      if (alvo <= 0) {
                        item.historicoInstalacao = [];
                        delete item.dataInstalacao;
                        return;
                      }
                      var atual = somaParcelas(ps);
                      if (alvo === atual) { return; }
                      var dif = alvo - atual;
                      if (dif > 0) {
                        ps[ps.length - 1].qtd = Number(ps[ps.length - 1].qtd) + dif;
                      } else {
                        var falta = -dif;
                        for (var i = ps.length - 1; i >= 0 && falta > 0; i--) {
                          var tira = Math.min(falta, Number(ps[i].qtd) || 0);
                          ps[i].qtd = (Number(ps[i].qtd) || 0) - tira;
                          falta -= tira;
                        }
                        ps = ps.filter(function (p) { return Number(p.qtd) > 0; });
                      }
                      item.historicoInstalacao = ps;
                      item.dataInstalacao = ps.length ? ps[ps.length - 1].data : item.dataInstalacao;
                    } else if (campo === 'dataInstalacao' && valor) {
                      /* mudar a data na tabela move a data da ultima parcela */
                      ps[ps.length - 1].data = String(valor);
                      ps.sort(function (a, b) { return a.data < b.data ? -1 : (a.data > b.data ? 1 : 0); });
                      item.historicoInstalacao = ps;
                      item.dataInstalacao = ps[ps.length - 1].data;
                    }
                  }
                
                  function ligar() {
                    /* o grafico passa a ser o novo (soma as parcelas) */
                    window.renderGraficoInstalacaoPeriodo = function (obra) {
                      desenharGrafico(obra || obraAtual());
                    };
                
                    /* a tabela de instalacao ganha a coluna Parcelas depois de cada desenho */
                    if (typeof window.renderTabelaInstalacao === 'function' &&
                        !window.renderTabelaInstalacao.__p51) {
                      var original = window.renderTabelaInstalacao;
                      var novo = function (obra) {
                        var r = original.apply(this, arguments);
                        try { garantirBotoes(); } catch (e) {}
                        return r;
                      };
                      novo.__p51 = true;
                      window.renderTabelaInstalacao = novo;
                    }
                
                    /* edicao manual na tabela mantem as parcelas coerentes */
                    if (typeof window.editarItem === 'function' && !window.editarItem.__p51) {
                      var origEditar = window.editarItem;
                      var novoEditar = function (id, campo, valor) {
                        var r = origEditar.apply(this, arguments);
                        try {
                          if (campo === 'instalado' || campo === 'dataInstalacao') {
                            ajustarPorEdicaoManual(id, campo, valor);
                            if (typeof salvarDB === 'function') { salvarDB(false); }
                            garantirBotoes();
                            desenharGrafico(obraAtual());
                          }
                        } catch (e) {}
                        return r;
                      };
                      novoEditar.__p51 = true;
                      window.editarItem = novoEditar;
                    }
                
                    /* trocar o periodo redesenha pelo caminho novo */
                    var sel = document.getElementById('selPeriodoInstalacao');
                    if (sel && !sel.getAttribute('data-p51')) {
                      sel.setAttribute('data-p51', '1');
                      sel.addEventListener('change', function () {
                        setTimeout(function () { desenharGrafico(obraAtual()); }, 30);
                      });
                    }
                
                    /* ESC fecha a janelinha */
                    if (!document.body.getAttribute('data-p51-esc')) {
                      document.body.setAttribute('data-p51-esc', '1');
                      document.addEventListener('keydown', function (ev) {
                        if (ev.key === 'Escape') { fecharModal(); }
                      });
                    }
                
                    garantirBotoes();
                    desenharGrafico(obraAtual());
                  }
                
                  function iniciar() {
                    try { ligar(); } catch (e) {}
                    var n = 0;
                    var t = setInterval(function () {
                      n++;
                      try { garantirBotoes(); } catch (e) {}
                      if (n > 40) { clearInterval(t); }
                    }, 500);
                    setTimeout(function () { try { desenharGrafico(obraAtual()); } catch (e) {} }, 1800);
                  }
                
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', iniciar);
                  } else {
                    iniciar();
                  }
                
                  /* atalho para uso manual, se precisar */
                  window.abrirParcelasInstalacao = abrirModal;
                })();
            
