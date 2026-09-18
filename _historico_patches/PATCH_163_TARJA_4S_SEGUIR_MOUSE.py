from pathlib import Path
from datetime import datetime

ARQ = Path("index.html")
if not ARQ.exists():
    raise SystemExit("ERRO: index.html nao encontrado.")

s = ARQ.read_text(encoding="utf-8")
backup = ARQ.with_name("index_PRE_PATCH163_" + datetime.now().strftime("%Y%m%d_%H%M%S") + ".html")
backup.write_text(s, encoding="utf-8")

# Remove the previous final tooltip script.
start = s.find('<script id="patch162FinalFix">')
if start < 0:
    start = s.find('<script id="patch163TooltipFollowMouse">')
if start < 0:
    raise SystemExit("ERRO: bloco de tooltip anterior nao encontrado.")
end = s.find('</script>', start)
if end < 0:
    raise SystemExit("ERRO: fechamento do bloco de tooltip nao encontrado.")
end += len('</script>')

# Remove previous tooltip final styles, if present.
for sid in ("patch162TooltipStyle", "patch163TooltipStyle"):
    a = s.find(f'<style id="{sid}">')
    if a >= 0:
        b = s.find('</style>', a)
        if b < 0: raise SystemExit("ERRO: fechamento do CSS nao encontrado.")
        b += len('</style>')
        s = s[:a] + s[b:]
        if a < start: start -= (b-a)

NEW_STYLE = '<style id="patch163TooltipStyle">\n#p120Area{position:relative!important;}\n#p120Dica{position:absolute!important;z-index:30!important;pointer-events:none!important;display:none;box-sizing:border-box;min-width:190px;max-width:300px;padding:9px 12px!important;border:1px solid rgba(148,163,184,.35);border-radius:10px!important;background:rgba(15,23,42,.96)!important;color:#fff!important;font-size:.76rem!important;line-height:1.4!important;box-shadow:0 8px 24px rgba(0,0,0,.25)!important;margin:0!important;}\n#p120Dica b{display:block;font-size:.8rem;margin-bottom:3px;}\n</style>'
NEW_SCRIPT = '<script id="patch163TooltipFollowMouse">\n(function(){\n  \'use strict\';\n  if (window.__patch163TooltipFollowMouse) return;\n  window.__patch163TooltipFollowMouse = true;\n  var timer = null;\n  var visible = false;\n  var lastEv = null;\n\n  function esconder(){\n    if (timer) { clearTimeout(timer); timer = null; }\n    visible = false;\n    var d = document.getElementById(\'p120Dica\');\n    if (d) {\n      d.style.setProperty(\'display\',\'none\',\'important\');\n      d.setAttribute(\'aria-hidden\',\'true\');\n    }\n  }\n\n  function garantirCaixa(){\n    var area = document.getElementById(\'p120Area\');\n    if (!area) { esconder(); return null; }\n    var d = document.getElementById(\'p120Dica\');\n    if (!d) d = document.createElement(\'div\');\n    d.id = \'p120Dica\';\n    if (d.parentNode !== area) area.appendChild(d);\n    return d;\n  }\n\n  function posicionar(ev){\n    var area = document.getElementById(\'p120Area\');\n    var d = document.getElementById(\'p120Dica\');\n    if (!area || !d || !visible || !ev) return;\n    var ar = area.getBoundingClientRect();\n    var x = ev.clientX - ar.left + 14;\n    var y = ev.clientY - ar.top + 14;\n    var w = d.offsetWidth || 220;\n    var h = d.offsetHeight || 55;\n    var maxX = Math.max(8, ar.width - w - 8);\n    var maxY = Math.max(8, ar.height - h - 8);\n    if (x > maxX) x = ev.clientX - ar.left - w - 14;\n    if (y > maxY) y = ev.clientY - ar.top - h - 14;\n    x = Math.max(8, Math.min(x, maxX));\n    y = Math.max(8, Math.min(y, maxY));\n    d.style.setProperty(\'left\', Math.round(x) + \'px\',\'important\');\n    d.style.setProperty(\'top\', Math.round(y) + \'px\',\'important\');\n    d.style.setProperty(\'right\',\'auto\',\'important\');\n    d.style.setProperty(\'bottom\',\'auto\',\'important\');\n  }\n\n  function mostrar(texto, ev){\n    var d = garantirCaixa();\n    if (!d || !texto) { esconder(); return; }\n    if (timer) clearTimeout(timer);\n    lastEv = ev || lastEv;\n    d.innerHTML = String(texto);\n    visible = true;\n    d.style.setProperty(\'display\',\'block\',\'important\');\n    d.setAttribute(\'aria-hidden\',\'false\');\n    posicionar(lastEv);\n    timer = setTimeout(esconder, 4000);\n  }\n\n  window.ocultarDicaP120 = esconder;\n  window.dica = function(texto, ev){ mostrar(texto, ev); };\n\n  document.addEventListener(\'mousemove\', function(ev){\n    var area = document.getElementById(\'p120Area\');\n    if (!area) { esconder(); return; }\n    if (!area.contains(ev.target)) { esconder(); return; }\n    lastEv = ev;\n    if (visible) posicionar(ev);\n  }, true);\n\n  document.addEventListener(\'mouseleave\', function(){}, true);\n  document.addEventListener(\'click\', function(ev){\n    var area = document.getElementById(\'p120Area\');\n    if (!area || !area.contains(ev.target)) esconder();\n  }, true);\n  document.addEventListener(\'pointerdown\', function(ev){\n    var area = document.getElementById(\'p120Area\');\n    if (!area || !area.contains(ev.target)) esconder();\n  }, true);\n  window.addEventListener(\'blur\', esconder);\n  document.addEventListener(\'visibilitychange\', esconder);\n  window.addEventListener(\'mouseout\', function(ev){\n    if (!ev.relatedTarget) esconder();\n  }, true);\n\n  try {\n    var obs = new MutationObserver(function(){\n      var area = document.getElementById(\'p120Area\');\n      var d = document.getElementById(\'p120Dica\');\n      if (d && (!area || !area.contains(d))) esconder();\n    });\n    obs.observe(document.body, {childList:true, subtree:true});\n  } catch(e) {}\n\n  setInterval(function(){\n    var area = document.getElementById(\'p120Area\');\n    var d = document.getElementById(\'p120Dica\');\n    if (!area || !d) { if (d) esconder(); return; }\n    if (!area.contains(d)) { esconder(); return; }\n    d.style.setProperty(\'position\',\'absolute\',\'important\');\n    d.style.setProperty(\'z-index\',\'30\',\'important\');\n    d.style.setProperty(\'pointer-events\',\'none\',\'important\');\n  }, 500);\n\n  function garantirDiarioMenu(){\n    var cx = document.querySelector(\'#meu-menu-abas .tabs\') ||\n             document.querySelector(\'details#meu-menu-abas .tabs\');\n    var b = document.getElementById(\'p84Botao\');\n    if (!b || !cx) return;\n    if (b.parentNode !== cx) cx.appendChild(b);\n    b.style.removeProperty(\'position\');\n    b.style.removeProperty(\'right\');\n    b.style.removeProperty(\'bottom\');\n    b.style.removeProperty(\'z-index\');\n    b.style.setProperty(\'display\',\'inline-flex\',\'important\');\n  }\n  function abrirDiarioSeguro(){\n    try {\n      if (typeof window.p84AbrirDiario === \'function\') return window.p84AbrirDiario();\n    } catch(e) {}\n    try {\n      var f = document.getElementById(\'p84Fundo\');\n      if (f) { f.classList.remove(\'p86b-oculto\',\'p87-oculto\',\'p87b-oculto\'); f.style.display=\'flex\'; return true; }\n    } catch(e2) {}\n    return false;\n  }\n  window.patch163AbrirDiario = abrirDiarioSeguro;\n  if (document.readyState === \'loading\') document.addEventListener(\'DOMContentLoaded\',function(){setTimeout(garantirDiarioMenu,250);});\n  else setTimeout(garantirDiarioMenu,250);\n  setInterval(garantirDiarioMenu,1500);\n})();\n</script>'

s = s[:start] + NEW_STYLE + "\n" + NEW_SCRIPT + s[end:]
ARQ.write_text(s, encoding="utf-8")
print("OK: PATCH 163 aplicado.")
print("BACKUP:", backup.name)
print("Tarja: 4 segundos, acompanha o mouse e troca imediatamente ao mudar de grafico.")
