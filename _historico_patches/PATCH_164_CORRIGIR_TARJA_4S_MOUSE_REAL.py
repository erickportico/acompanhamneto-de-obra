from pathlib import Path
from datetime import datetime

ARQ = Path('index.html')
if not ARQ.exists():
    raise SystemExit('ERRO: index.html nao encontrado.')

s = ARQ.read_text(encoding='utf-8')
backup = ARQ.with_name('index_PRE_PATCH164_' + datetime.now().strftime('%Y%m%d_%H%M%S') + '.html')
backup.write_text(s, encoding='utf-8')

anchor = "/* caixinha de aviso que segue o mouse */"
pos = s.find(anchor)
if pos < 0:
    raise SystemExit('ERRO: bloco da tarja do Centro de Custos nao encontrado.')
start = s.find('function dica(texto, ev) {', pos)
if start < 0:
    raise SystemExit('ERRO: funcao dica(texto, ev) nao encontrada no Centro de Custos.')
end = s.find('\n          }', start)
if end < 0:
    raise SystemExit('ERRO: fechamento da funcao dica nao encontrado.')
end += len('\n          }')

NEW = r'''function dica(texto, ev) {
            var area = document.getElementById('p120Area');
            var d = document.getElementById('p120Dica');
            if (!area) return;
            if (!d) {
              d = document.createElement('div');
              d.id = 'p120Dica';
            }
            if (d.parentNode !== area) area.appendChild(d);
            if (!texto) {
              /* Ao sair de um grafico, nao some enquanto o mouse continuar dentro
                 da area do Centro de Custos. O proximo grafico atualiza a tarja. */
              if (ev && area.contains(ev.target)) return;
              d.style.display = 'none';
              return;
            }
            d.innerHTML = texto;
            d.style.setProperty('display', 'block', 'important');
            d.style.setProperty('position', 'absolute', 'important');
            d.style.setProperty('z-index', '30', 'important');
            d.style.setProperty('pointer-events', 'none', 'important');
            d.style.setProperty('right', 'auto', 'important');
            d.style.setProperty('bottom', 'auto', 'important');

            var e = ev;
            if (!e || typeof e.clientX !== 'number' || typeof e.clientY !== 'number') {
              var r0 = area.getBoundingClientRect();
              e = {clientX:r0.left + 16, clientY:r0.top + 16};
            }
            var r = area.getBoundingClientRect();
            var x = e.clientX - r.left + 14;
            var y = e.clientY - r.top + 14;
            var w = d.offsetWidth || 220;
            var h = d.offsetHeight || 55;
            var maxX = Math.max(8, r.width - w - 8);
            var maxY = Math.max(8, r.height - h - 8);
            if (x > maxX) x = e.clientX - r.left - w - 14;
            if (y > maxY) y = e.clientY - r.top - h - 14;
            x = Math.max(8, Math.min(x, maxX));
            y = Math.max(8, Math.min(y, maxY));
            d.style.setProperty('left', Math.round(x) + 'px', 'important');
            d.style.setProperty('top', Math.round(y) + 'px', 'important');

            if (d.__p120Timer) clearTimeout(d.__p120Timer);
            d.__p120Timer = setTimeout(function () {
              d.style.setProperty('display', 'none', 'important');
            }, 4000);
          }'''

s = s[:start] + NEW + s[end:]

# Remove the old periodic guard that could interfere with the new behavior and
# replace it with a lightweight guard that only hides when the entire area is gone.
old = """          setInterval(function () {\n            var d = document.getElementById('p120Dica');\n            if (!d || d.style.display === 'none') { return; }\n            var area = document.getElementById('p120Area');\n            if (!area || area.offsetParent === null) { d.style.display = 'none'; }\n          }, 400);"""
new = """          setInterval(function () {\n            var d = document.getElementById('p120Dica');\n            var area = document.getElementById('p120Area');\n            if (!d || !area || !area.contains(d) || area.offsetParent === null) {\n              if (d) d.style.display = 'none';\n            }\n          }, 500);"""
if old in s:
    s = s.replace(old, new, 1)

# The PATCH163 global override is not used by the local Centro de Custos function;
# neutralize it so it cannot compete with the real function.
a = s.find('<script id="patch163TooltipFollowMouse">')
if a >= 0:
    b = s.find('</script>', a)
    if b < 0:
        raise SystemExit('ERRO: fechamento do PATCH163 nao encontrado.')
    b += len('</script>')
    s = s[:a] + '<script id="patch163TooltipFollowMouse"><!-- mantido para compatibilidade; a funcao real do Centro de Custos e corrigida acima. --></script>' + s[b:]

ARQ.write_text(s, encoding='utf-8')
print('OK: PATCH 164 aplicado no index.html')
print('BACKUP:', backup.name)
print('Tarja real do Centro de Custos: 4s, acompanha mouse, troca ao entrar em outro grafico e nao some ao sair de um grafico dentro da area.')
