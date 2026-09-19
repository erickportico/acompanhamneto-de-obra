# -*- coding: utf-8 -*-
"""
patch174 - Conserta o "Plano Mestre da Obra" que nao abre.

Causa: o clique no item do menu chama OF.abrir() dentro de um try/catch que
engole o erro em silencio. Se algo falha ao desenhar o Plano Mestre, o painel
nao aparece e nenhum erro chega ao console.

O que este patch faz:
- Intercepta o clique em "Plano Mestre da Obra" (no menu de abas e na gaveta).
- Abre o painel de verdade, forcando a exibicao mesmo que o desenho falhe.
- Desenha por partes (carregar + render) para nao ficar em branco.
- Se ainda restar erro, mostra a mensagem na tela para diagnostico
  (em vez de engolir em silencio).

Como usar (na pasta do projeto, onde esta o index.html):
    python patch174.py
ou apontando o arquivo:
    python patch174.py caminho/para/index.html

E idempotente: rodar de novo nao duplica nada.
"""
import sys
import io

SCRIPT_ID = 'patch174'

JS = r"""<script id="patch174">
(function () {
  if (window.__patch174) { return; }
  window.__patch174 = true;

  var OUTRAS = ['itens', 'liberacao', 'medicoes', 'graficos', 'recebimento',
                'cronograma', 'pagamento', 'ctm', 'custo', 'admin'];

  function forcarPainel() {
    var meu = document.getElementById('tab-obraflow');
    if (!meu) { return null; }
    OUTRAS.forEach(function (a) {
      var e = document.getElementById('tab-' + a);
      if (e) { e.style.display = 'none'; }
      var bt = document.getElementById('btn-tab-' + a);
      if (bt) { bt.classList.remove('active'); }
    });
    meu.style.display = 'block';
    var mbt = document.getElementById('btn-tab-obraflow');
    if (mbt) { mbt.classList.add('active'); }
    return meu;
  }

  function avisar(txt) {
    try {
      var d = document.getElementById('p174msg');
      if (!d) {
        d = document.createElement('div');
        d.id = 'p174msg';
        d.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483647;' +
          'max-width:360px;background:#b91c1c;color:#fff;font:13px/1.4 Arial,sans-serif;' +
          'padding:11px 13px;border-radius:9px;box-shadow:0 6px 20px rgba(0,0,0,.35)';
        document.body.appendChild(d);
      }
      d.textContent = txt;
      clearTimeout(d.__t);
      d.__t = setTimeout(function () { if (d && d.parentNode) { d.parentNode.removeChild(d); } }, 15000);
    } catch (e) {}
  }

  function abrir() {
    var erro = null;
    try {
      if (window.OF && typeof window.OF.abrir === 'function') { window.OF.abrir(); }
    } catch (e) { erro = e; }

    var meu = forcarPainel();

    if (!meu) {
      if (!window.OF || typeof window.OF.abrir !== 'function') {
        avisar('Plano Mestre nao carregou: o modulo (ObraFlow) nao esta disponivel nesta pagina. Tire um print e me mande.');
        return;
      }
    }

    /* se OF.abrir falhou, tenta desenhar por partes para nao ficar em branco */
    if (erro && window.OF) {
      try { if (typeof window.OF.load === 'function') { window.OF.load(); } } catch (e1) {}
      try { if (typeof window.OF.render === 'function') { window.OF.render(); } } catch (e2) { erro = erro || e2; }
    }

    if (erro) {
      try { console.error('[patch174] Plano Mestre:', erro); } catch (e3) {}
      avisar('Plano Mestre abriu, mas houve um erro ao desenhar: ' +
             ((erro && erro.message) ? erro.message : erro) + '  (tire um print e me mande)');
    }
  }

  /* captura o clique ANTES do handler original que engole o erro */
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) { return; }
    var alvo = t.closest('.or-item[data-aba="obraflow"], #btn-tab-obraflow');
    if (!alvo) { return; }
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.stopImmediatePropagation) { ev.stopImmediatePropagation(); }
    try { if (window.ORMENU && typeof window.ORMENU.fechar === 'function') { window.ORMENU.fechar(); } } catch (e) {}
    abrir();
  }, true);
})();
</script>"""


def main():
    caminho = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
    with io.open(caminho, 'r', encoding='utf-8', newline='') as fp:
        html = fp.read()

    if SCRIPT_ID in html:
        print('[patch174] ja aplicado em ' + caminho + ' (nada a fazer).')
        return

    pos = html.rfind('</body>')
    if pos == -1:
        print('[patch174] ERRO: nao achei </body> em ' + caminho + '.')
        sys.exit(1)

    novo = html[:pos] + JS + '\n' + html[pos:]
    with io.open(caminho, 'w', encoding='utf-8', newline='') as fp:
        fp.write(novo)
    print('[patch174] aplicado com sucesso em ' + caminho + '.')


if __name__ == '__main__':
    main()
