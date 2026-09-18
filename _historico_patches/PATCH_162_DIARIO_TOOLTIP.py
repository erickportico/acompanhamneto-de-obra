from pathlib import Path
from datetime import datetime
import re, shutil

ARQ = Path('index.html')
if not ARQ.exists():
    raise SystemExit('ERRO: index.html nao encontrado.')

s = ARQ.read_text(encoding='utf-8')
backup = ARQ.with_name(f"index_PRE_PATCH162_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html")
shutil.copy2(ARQ, backup)
print('BACKUP criado:', backup.name)

# 1) Corrige o bloco de impressao do Diario de Obra.
# O PATCH 161 acabou sendo inserido dentro do document.write() do P84.
# Isso quebra o modulo P84 antes de expor p84AbrirDiario e o botao do menu.
marcador = "janelaImpressao.document.write(\n  '<!doctype html>' +"
start = s.find(marcador)
if start < 0:
    raise SystemExit('ERRO: bloco document.write do Diario nao encontrado.')

fim = s.find("\njanelaImpressao.document.close();", start)
if fim < 0:
    raise SystemExit('ERRO: fechamento do document.write do Diario nao encontrado.')

bloco = s[start:fim]
if '<script id="patch161TooltipFix">' not in bloco:
    print('AVISO: bloco do Diario ja nao contem o trecho corrompido; nenhuma substituicao feita nesta etapa.')
else:
    novo = """janelaImpressao.document.write(\n  '<!doctype html>' +\n  '<html lang=\"pt-BR\"><head>' +\n  '<meta charset=\"UTF-8\">' +\n  '<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">' +\n  '<title>Diário de Obra</title>' +\n  cssImpressao +\n  '</head><body>' +\n  h +\n  '</body></html>'\n);"""
    s = s[:start] + novo + s[fim:]
    print('OK: bloco de impressao do Diario de Obra recuperado.')

# 2) Injeta uma correcao FINAL do tooltip depois de todos os patches.
# O problema do PATCH 161 era que um CSS antigo do P120 aparece depois dele e
# volta a posicionar #p120Dica como fixed. Aqui a ultima regra vence.
if 'id="patch162FinalFix"' in s:
    raise SystemExit('ERRO: PATCH 162 ja aplicado neste arquivo.')

fix = r'''
<!-- PATCH162: recupera Diario de Obra e elimina tarja fixa do Centro de Custos -->
<style id="patch162FinalStyle">
  /* A dica fica somente como uma pequena caixa dentro do painel do Centro de Custos. */
  #p120Area { position:relative !important; }
  #p120Dica {
    position:absolute !important;
    left:auto !important;
    top:auto !important;
    right:12px !important;
    bottom:12px !important;
    width:auto !important;
    min-width:0 !important;
    max-width:300px !important;
    z-index:30 !important;
    pointer-events:none !important;
    box-sizing:border-box !important;
    display:none;
    margin:0 !important;
    padding:9px 12px !important;
    border:1px solid rgba(148,163,184,.35) !important;
    border-radius:10px !important;
    background:rgba(15,23,42,.96) !important;
    color:#fff !important;
    font:12px/1.4 system-ui,Segoe UI,Arial,sans-serif !important;
    box-shadow:0 8px 24px rgba(0,0,0,.25) !important;
  }
  #p120Dica b { display:block !important; font-size:12px !important; margin-bottom:3px !important; }
</style>
<script id="patch162FinalFix">
(function(){
  'use strict';
  if (window.__patch162FinalFix) return;
  window.__patch162FinalFix = true;

  function esconder(){
    var d = document.getElementById('p120Dica');
    if (d) {
      d.style.setProperty('display','none','important');
      d.setAttribute('aria-hidden','true');
    }
  }

  function garantirCaixa(){
    var area = document.getElementById('p120Area');
    var d = document.getElementById('p120Dica');
    if (!area) { esconder(); return null; }
    if (!d) {
      d = document.createElement('div');
      d.id = 'p120Dica';
    }
    if (d.parentNode !== area) area.appendChild(d);
    return d;
  }

  window.ocultarDicaP120 = esconder;
  window.dica = function(texto){
    var d = garantirCaixa();
    if (!d || !texto) { esconder(); return; }
    d.innerHTML = String(texto);
    d.style.setProperty('display','block','important');
    d.style.removeProperty('left');
    d.style.removeProperty('top');
    d.setAttribute('aria-hidden','false');
  };

  /* Qualquer clique, troca de aba ou saida do painel fecha a caixa. */
  document.addEventListener('click', function(ev){
    var area = document.getElementById('p120Area');
    if (!area || !area.contains(ev.target)) esconder();
  }, true);
  document.addEventListener('pointerdown', function(ev){
    var area = document.getElementById('p120Area');
    if (!area || !area.contains(ev.target)) esconder();
  }, true);
  document.addEventListener('mousemove', function(ev){
    var area = document.getElementById('p120Area');
    if (!area || !area.contains(ev.target)) esconder();
  }, true);
  window.addEventListener('blur', esconder);
  document.addEventListener('visibilitychange', esconder);
  window.addEventListener('mouseout', function(ev){
    if (!ev.relatedTarget) esconder();
  }, true);

  /* Se o Centro de Custos for redesenhado, a tarja antiga nao pode sobreviver. */
  try {
    var obs = new MutationObserver(function(){
      var area = document.getElementById('p120Area');
      var d = document.getElementById('p120Dica');
      if (d && (!area || !area.contains(d))) esconder();
    });
    obs.observe(document.body, {childList:true, subtree:true});
  } catch(e) {}

  /* Reaplica o CSS final caso algum patch antigo injete outra folha depois. */
  setInterval(function(){
    var area = document.getElementById('p120Area');
    var d = document.getElementById('p120Dica');
    if (!area || !d) { if (d) esconder(); return; }
    if (!area.contains(d)) { esconder(); return; }
    d.style.setProperty('position','absolute','important');
    d.style.setProperty('right','12px','important');
    d.style.setProperty('bottom','12px','important');
    d.style.setProperty('left','auto','important');
    d.style.setProperty('top','auto','important');
    d.style.setProperty('z-index','30','important');
  }, 500);

  /* Reforca a presenca do botao Diario no menu, sem criar duplicatas. */
  function garantirDiarioMenu(){
    var cx = document.querySelector('#meu-menu-abas .tabs') ||
             document.querySelector('details#meu-menu-abas .tabs');
    var b = document.getElementById('p84Botao');
    if (!b || !cx) return;
    if (b.parentNode !== cx) cx.appendChild(b);
    b.style.removeProperty('position');
    b.style.removeProperty('right');
    b.style.removeProperty('bottom');
    b.style.removeProperty('z-index');
    b.style.removeProperty('display');
    b.style.setProperty('display','inline-flex','important');
  }

  function abrirDiarioSeguro(){
    try {
      if (typeof window.p84AbrirDiario === 'function') return window.p84AbrirDiario();
    } catch(e) {}
    try {
      var f = document.getElementById('p84Fundo');
      if (f) {
        f.classList.remove('p86b-oculto','p87-oculto','p87b-oculto');
        f.style.display = 'flex';
        return true;
      }
    } catch(e2) {}
    return false;
  }
  window.patch162AbrirDiario = abrirDiarioSeguro;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(garantirDiarioMenu, 250); });
  } else {
    setTimeout(garantirDiarioMenu, 250);
  }
  setInterval(garantirDiarioMenu, 1500);
})();
</script>
'''

pos = s.rfind('</body>')
if pos < 0:
    raise SystemExit('ERRO: </body> nao encontrado.')
s = s[:pos] + fix + s[pos:]

ARQ.write_text(s, encoding='utf-8')
print('OK: PATCH 162 aplicado em index.html')
print('Arquivo final:', ARQ.resolve())
