# -*- coding: utf-8 -*-
"""
patch173 - Conserta o ARRASTAR (mover com o mouse) no editor dos slides.

O que faz:
- Adiciona um sistema de arraste proprio, que funciona mesmo quando o
  arraste interno nao dispara.
- No modo "Apagar qualquer coisa": um CLIQUE parado continua apagando,
  mas ARRASTAR passa a MOVER (o clique que apagaria depois do arraste e
  engolido, entao o item nao some mais quando voce so queria mover).
- Guarda a posicao no proprio navegador e reaplica depois que os slides
  sao redesenhados.

Como usar (na pasta do projeto, onde esta o index.html):
    python patch173.py
ou apontando o arquivo:
    python patch173.py caminho/para/index.html

E idempotente: rodar de novo nao duplica nada.
"""
import sys
import io

SCRIPT_ID = 'patch173'

JS = r"""<script id="patch173">
(function () {
  if (window.__patch173) { return; }
  window.__patch173 = true;

  var LS = 'p173-pos';
  var LIMIAR = 3;            /* px minimos para virar arraste (deixa o clique/duplo-clique passar) */
  var arr = null;           /* estado do arraste em andamento */
  var arrastouAte = 0;      /* carimbo de tempo do ultimo arraste concluido */

  function editando() {
    try {
      var lupa = document.getElementById('p94Lupa');
      if (lupa && lupa.classList.contains('p99-edit')) { return true; }
      var b = document.querySelector('#p94Fundo [data-p99="editar"]');
      if (b && b.classList.contains('p99-on')) { return true; }
    } catch (e) {}
    return false;
  }

  function folhaDe(t) { return t && t.closest ? t.closest('.p94-folha') : null; }
  function itemDe(t) { return t && t.closest ? t.closest('.p94-t,.p94-i,.p94-q') : null; }

  function todasFolhas() {
    var l = document.querySelectorAll('#p94Lupa .p94-folha');
    if (!l.length) { l = document.querySelectorAll('.p94-folha'); }
    return [].slice.call(l);
  }
  function itensDaFolha(f) {
    return [].slice.call(f.querySelectorAll('.p94-t,.p94-i,.p94-q'));
  }
  function chaveDe(el) {
    var f = folhaDe(el);
    if (!f) { return null; }
    var fi = todasFolhas().indexOf(f);
    var ii = itensDaFolha(f).indexOf(el);
    if (fi < 0 || ii < 0) { return null; }
    return fi + '|' + ii;
  }
  function elDaChave(k) {
    var p = k.split('|');
    var fs = todasFolhas();
    var f = fs[+p[0]];
    if (!f) { return null; }
    return itensDaFolha(f)[+p[1]] || null;
  }

  function ler() {
    try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; }
  }
  function gravar(m) {
    try { localStorage.setItem(LS, JSON.stringify(m)); } catch (e) {}
  }

  function pctInicial(el, f) {
    var s = el.getAttribute('style') || '';
    function v(nome) {
      var m = new RegExp(nome + '\\s*:\\s*(-?[0-9.]+)%').exec(s);
      return m ? parseFloat(m[1]) : null;
    }
    var l = v('left'), t = v('top');
    if (l === null || t === null) {
      try {
        var re = el.getBoundingClientRect(), rf = f.getBoundingClientRect();
        if (l === null) { l = (re.left - rf.left) / rf.width * 100; }
        if (t === null) { t = (re.top - rf.top) / rf.height * 100; }
      } catch (e) { if (l === null) { l = 0; } if (t === null) { t = 0; } }
    }
    return { l: l, t: t };
  }

  function aplicarGuardadas() {
    var m = ler(), k;
    for (k in m) {
      if (!m.hasOwnProperty(k)) { continue; }
      var el = elDaChave(k);
      if (!el) { continue; }
      var g = m[k];
      if (typeof g.l === 'number') { el.style.left = g.l + '%'; }
      if (typeof g.t === 'number') { el.style.top = g.t + '%'; }
    }
  }

  /* ---- inicio do arraste ---- */
  window.addEventListener('pointerdown', function (ev) {
    if (ev.button != null && ev.button !== 0) { return; }
    if (!editando()) { return; }
    var t = ev.target;
    if (!t || !t.closest) { return; }
    if (t.closest('[data-p99],[data-p100],[data-p94],.p99-h,.p99-mk')) { return; }
    var el = itemDe(t);
    if (!el) { return; }
    if (el.getAttribute('contenteditable') === 'true') { return; }
    var f = folhaDe(el);
    if (!f) { return; }
    var rf;
    try { rf = f.getBoundingClientRect(); } catch (e) { return; }
    if (!rf.width || !rf.height) { return; }
    var p0 = pctInicial(el, f);
    arr = {
      el: el, folha: f, w: rf.width, h: rf.height,
      x0: ev.clientX, y0: ev.clientY, l0: p0.l, t0: p0.t,
      moveu: false, pid: ev.pointerId
    };
  }, true);

  window.addEventListener('pointermove', function (ev) {
    if (!arr) { return; }
    var dx = ev.clientX - arr.x0, dy = ev.clientY - arr.y0;
    if (!arr.moveu) {
      if (Math.abs(dx) + Math.abs(dy) < LIMIAR) { return; }
      arr.moveu = true;
      try { arr.el.setPointerCapture && arr.pid != null && arr.el.setPointerCapture(arr.pid); } catch (e) {}
    }
    ev.preventDefault();
    var nl = arr.l0 + dx / arr.w * 100;
    var nt = arr.t0 + dy / arr.h * 100;
    arr.el.style.left = nl + '%';
    arr.el.style.top = nt + '%';
    arr.nl = nl; arr.nt = nt;
  }, true);

  function soltar(ev) {
    if (!arr) { return; }
    var a = arr; arr = null;
    if (!a.moveu) { return; }
    arrastouAte = Date.now();
    var k = chaveDe(a.el);
    if (k) {
      var m = ler();
      m[k] = { l: a.nl, t: a.nt };
      gravar(m);
    }
    try { a.el.releasePointerCapture && a.pid != null && a.el.releasePointerCapture(a.pid); } catch (e) {}
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  }
  window.addEventListener('pointerup', soltar, true);
  window.addEventListener('pointercancel', function () { arr = null; }, true);
  window.addEventListener('blur', function () { arr = null; });

  /* engole o clique que vem logo depois de um arraste (senao o modo apagar
     apagaria o item que voce acabou de mover) */
  window.addEventListener('click', function (ev) {
    if (Date.now() - arrastouAte < 400) {
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.stopImmediatePropagation) { ev.stopImmediatePropagation(); }
    }
  }, true);

  /* reaplica as posicoes guardadas depois que os slides sao redesenhados */
  try {
    var mo = new MutationObserver(function () { setTimeout(aplicarGuardadas, 30); });
    mo.observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
  setInterval(aplicarGuardadas, 800);
  setTimeout(aplicarGuardadas, 300);
})();
</script>"""


def main():
    caminho = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
    with io.open(caminho, 'r', encoding='utf-8', newline='') as fp:
        html = fp.read()

    if SCRIPT_ID in html:
        print('[patch173] ja aplicado em ' + caminho + ' (nada a fazer).')
        return

    pos = html.rfind('</body>')
    if pos == -1:
        print('[patch173] ERRO: nao achei </body> em ' + caminho + '.')
        sys.exit(1)

    novo = html[:pos] + JS + '\n' + html[pos:]
    with io.open(caminho, 'w', encoding='utf-8', newline='') as fp:
        fp.write(novo)
    print('[patch173] aplicado com sucesso em ' + caminho + '.')


if __name__ == '__main__':
    main()
