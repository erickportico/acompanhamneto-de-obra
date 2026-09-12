#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r'''
PATCH v14 — Centro de Custos: graficos e cards VAZIOS
===================================================

CAUSA RAIZ
----------
  getCustosFiltered() eh funcao LOCAL dentro de initCustoTab()
  e NUNCA eh exposta em window.getCustosFiltered.

  Cascata de falhas:
  1) PATCH120: typeof getCustosFiltered === 'function' -> FALSE -> lista = []
  2) PATCH137: window.getCustosFiltered -> undefined -> noFiltro() = null
  3) pFixCustoDup: window.getCustosFiltered -> undefined -> wrap() = false
  4) PATCH77: typeof getCustosFiltered === 'function' -> FALSE -> lista = []

CORRECOES
---------
  A) Expoe getCustosFiltered em window (correcao PRINCIPAL)
  B) Wrapper: mes sem lancamentos -> limpa filtro de mes
  C) Script de redesenho automatico dos graficos
  D) Diagnostico no console (mensagens [v14])

COMO RODAR
----------
  cd "C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS"
  python patch_v14_custo_fix.py

  Depois: Ctrl+F5, F12 -> Console, clicar aba Centro de Custos
'''

import os, sys, shutil, datetime, re

CAMINHO = os.path.join(
    os.environ.get("USERPROFILE", os.path.expanduser("~")),
    "Desktop",
    "ACOMPANHAMENTO DE OBRAS",
    "index.html"
)

# ═══════════════════════════════════════════════════════════════
#  1. LEITURA BINARIA
# ═══════════════════════════════════════════════════════════════
if not os.path.isfile(CAMINHO):
    print("[v14] ERRO: arquivo nao encontrado:")
    print(f"       {CAMINHO}")
    print()
    print("Verifique se o caminho esta correto.")
    print("Dica: o index.html deve estar na pasta RAIZ do projeto:")
    print("  C:\\Users\\OBRAS 8\\Desktop\\ACOMPANHAMENTO DE OBRAS\\index.html")
    sys.exit(1)

with open(CAMINHO, "rb") as f:
    raw = f.read()

try:
    html = raw.decode("utf-8")
except UnicodeDecodeError:
    html = raw.decode("utf-8", errors="surrogatepass")

print(f"[v14] Arquivo lido: {len(html):,} caracteres")

# Detectar tipo de quebra de linha do arquivo
_crlf_count = html.count('\r\n')
_lf_only_count = html.count('\n') - _crlf_count
EOL = '\r\n' if _crlf_count > _lf_only_count else '\n'
print(f"[v14] Quebras de linha: {'CRLF (Windows)' if EOL == '\\r\\n' else 'LF (Unix)'}")

del raw

# ═══════════════════════════════════════════════════════════════
#  2. BACKUP AUTOMATICO
# ═══════════════════════════════════════════════════════════════
ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
bkp = CAMINHO + f".v14bak_{ts}"
shutil.copy2(CAMINHO, bkp)
print(f"[v14] Backup: {os.path.basename(bkp)}")

# ═══════════════════════════════════════════════════════════════
#  3A. EXPOR window.getCustosFiltered (CORRECAO PRINCIPAL)
# ═══════════════════════════════════════════════════════════════
ja_exposto = "window.getCustosFiltered = getCustosFiltered" in html
if ja_exposto:
    print("[v14] getCustosFiltered ja exposta. Pulando A.")
else:
    # Usar regex para funcionar com \n OU \r\n
    padrao_A = re.compile(
        r'window\.renderCustoDashboard\s*=\s*function\s*\(\)\s*\{[\r\n]+\s*var custos = getCustosFiltered\(\)'
    )
    m_A = padrao_A.search(html)

    if m_A:
        # Inserir ANTES do match
        pos_A = m_A.start()
        # Voltar ate o inicio da linha (espacos antes de window.)
        while pos_A > 0 and html[pos_A-1] in (' ', '\t'):
            pos_A -= 1

        linha_A = f'{EOL}                window.getCustosFiltered = getCustosFiltered;{EOL}'
        html = html[:pos_A] + linha_A + html[pos_A:]
        print(f"[v14] A) window.getCustosFiltered exposta (pos {pos_A})")
    else:
        # Fallback: buscar so window.renderCustoDashboard = function
        padrao_A2 = re.compile(r'window\.renderCustoDashboard\s*=\s*function\s*\(\)\s*\{')
        m_A2 = padrao_A2.search(html, 780000, 800000)
        if m_A2:
            pos_A2 = m_A2.start()
            while pos_A2 > 0 and html[pos_A2-1] in (' ', '\t'):
                pos_A2 -= 1
            linha_A2 = f'{EOL}                window.getCustosFiltered = getCustosFiltered;{EOL}'
            html = html[:pos_A2] + linha_A2 + html[pos_A2:]
            print(f"[v14] A) window.getCustosFiltered exposta (fallback, pos {pos_A2})")
        else:
            print("[v14] ERRO CRITICO: nao encontrei window.renderCustoDashboard")
            print("[v14] Vou mostrar o que existe na regiao esperada (chars 780k-790k):")
            trecho = html[784000:785000]
            # Mostrar linhas que contem 'renderCusto'
            for linha in trecho.split('\n'):
                if 'renderCusto' in linha or 'getCustos' in linha:
                    print(f"  | {linha.strip()}")
            sys.exit(1)

# ═══════════════════════════════════════════════════════════════
#  3B. WRAPPER: mes sem lancamentos -> limpa filtro
# ═══════════════════════════════════════════════════════════════
ja_tem_wrapper = 'v14: wrapper de seguranca' in html
if ja_tem_wrapper:
    print("[v14] Wrapper ja existe. Pulando B.")
else:
    padrao_B = re.compile(r'function ajustarMesCusto\s*\(\s*forcar\s*\)\s*\{')
    m_B = padrao_B.search(html, 2590000, 2610000)

    if m_B:
        pos_B = m_B.start()
        trecho_B = html[pos_B:pos_B + 2000]
        prof = 0
        i = trecho_B.find('{')
        if i >= 0:
            prof = 1
            j = i + 1
            while j < len(trecho_B) and prof > 0:
                if trecho_B[j] == '{': prof += 1
                elif trecho_B[j] == '}': prof -= 1
                j += 1
            end_B = pos_B + j

            wrapper_B = r'''
  /* v14: wrapper de seguranca - se mes nao tem lancamentos, limpa filtro */
  (function() {
    var _amc = (typeof ajustarMesCusto === 'function') ? ajustarMesCusto : null;
    if (!_amc) return;
    var _wrap = function(forcar) {
      var r = _amc(forcar);
      try {
        var campo = document.getElementById('custoFilterMes');
        if (campo && campo.value) {
          var mes = String(campo.value || '');
          var obras = (window.db && window.db.obras) || [];
          var tem = false;
          for (var i = 0; i < obras.length && !tem; i++) {
            var lista = (obras[i] && obras[i].centrosCusto) || [];
            for (var j = 0; j < lista.length; j++) {
              var d = String(lista[j].data || '');
              if (d.substring(0, 7) === mes) { tem = true; break; }
            }
          }
          if (!tem) {
            console.warn('[v14] Mes "' + mes + '" sem lancamentos - limpando filtro');
            campo.value = '';
            if (campo.hasAttribute('data-p129')) campo.removeAttribute('data-p129');
            try { if (typeof window.renderCustoDashboard === 'function') window.renderCustoDashboard(); } catch(e2) {}
          }
        }
      } catch(e) { try { console.warn('[v14] wrapper:', e); } catch(e2){} }
      return r;
    };
    try { window.ajustarMesCusto = _wrap; } catch(e) {}
    try { ajustarMesCusto = _wrap; } catch(e) {}
  })();
'''
            html = html[:end_B] + wrapper_B + html[end_B:]
            print("[v14] B) Wrapper inserido (mes sem dados -> limpa filtro)")
    else:
        print("[v14] B) ajustarMesCusto nao encontrado. Pulando.")

# ═══════════════════════════════════════════════════════════════
#  3C. SCRIPT DE REDESENHO AUTOMATICO
# ═══════════════════════════════════════════════════════════════
ja_tem_redesenho = 'v14Redesenho' in html
if ja_tem_redesenho:
    print("[v14] Redesenho ja existe. Pulando C.")
else:
    script_C = r'''
<script id="v14Redesenho">
(function() {
  "use strict";
  if (window.__v14Redesenho) return;
  window.__v14Redesenho = true;

  function redesenhar() {
    var aba = document.getElementById('tab-custo');
    if (!aba) return false;
    var visivel = false;
    try { visivel = window.getComputedStyle(aba).display !== 'none'; } catch(e) {}
    if (!visivel) return false;

    try {
      if (typeof window.renderCustoDashboard === 'function') {
        window.renderCustoDashboard();
        console.log('[v14] renderCustoDashboard OK');
      }
    } catch(e) { console.warn('[v14] render erro:', e); }

    try {
      if (typeof window.p120Redesenhar === 'function') {
        window.p120Redesenhar();
        console.log('[v14] p120Redesenhar OK');
      }
    } catch(e) {}

    return true;
  }

  var n = 0, max = 25;
  function tick() {
    n++;
    if (redesenhar() || n >= max) return;
    setTimeout(tick, 200 + n * 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(tick, 600); });
  } else {
    setTimeout(tick, 600);
  }

  document.addEventListener('click', function(ev) {
    var el = ev && ev.target ? ev.target.closest('[data-aba="custo"]') : null;
    if (el) {
      setTimeout(redesenhar, 200);
      setTimeout(redesenhar, 800);
    }
  }, true);
})();
</script>
'''

    pos_body = html.rfind('</body>')
    if pos_body < 0:
        pos_body = html.rfind('</html>')
    if pos_body < 0:
        pos_body = len(html)

    html = html[:pos_body] + script_C + html[pos_body:]
    print("[v14] C) Script de redesenho inserido")

# ═══════════════════════════════════════════════════════════════
#  3D. DIAGNOSTICO NO CONSOLE
# ═══════════════════════════════════════════════════════════════
ja_tem_diag = 'v14Diag' in html
if ja_tem_diag:
    print("[v14] Diag ja existe. Pulando D.")
else:
    script_D = r'''
<script id="v14Diag">
(function() {
  "use strict";
  if (window.__v14Diag) return;
  window.__v14Diag = true;

  function diag() {
    try {
      var campo = document.getElementById('custoFilterMes');
      var mes = campo ? String(campo.value || '(vazio)') : '(campo ausente)';
      var obras = (window.db && window.db.obras) || [];
      var total = 0, meses = {};
      obras.forEach(function(o) {
        var lista = (o && o.centrosCusto) || [];
        lista.forEach(function(c) {
          total++;
          var d = String(c.data || '').substring(0, 7);
          if (d.length === 7) meses[d] = (meses[d] || 0) + 1;
        });
      });
      var fnOk = typeof window.getCustosFiltered === 'function';
      var fnResult = fnOk ? (window.getCustosFiltered() || []).length : 'N/A';
      console.log(
        '[v14] Diag: mes=' + mes +
        ' | total=' + total +
        ' | getCustosFiltered=' + fnOk +
        ' | resultado=' + fnResult +
        ' | meses=' + JSON.stringify(meses)
      );
    } catch(e) { console.warn('[v14] diag:', e); }
  }

  setInterval(diag, 5000);
  setTimeout(diag, 1500);
  setTimeout(diag, 4000);
})();
</script>
'''

    pos_body2 = html.rfind('</body>')
    if pos_body2 < 0:
        pos_body2 = html.rfind('</html>')
    if pos_body2 < 0:
        pos_body2 = len(html)

    html = html[:pos_body2] + script_D + html[pos_body2:]
    print("[v14] D) Diagnostico inserido (mensagens [v14] no console)")

# ═══════════════════════════════════════════════════════════════
#  4. ESCRITA BINARIA
# ═══════════════════════════════════════════════════════════════
with open(CAMINHO, "wb") as f:
    f.write(html.encode("utf-8"))

novo_tam = os.path.getsize(CAMINHO)
print()
print("=" * 60)
print("  PATCH v14 APLICADO COM SUCESSO")
print("=" * 60)
print()
print(f"  Arquivo: {novo_tam:,} bytes ({len(html):,} chars)")
print()
print("Correcoes:")
print("  A) window.getCustosFiltered exposta globalmente")
print("  B) Wrapper: mes sem lancamentos -> limpa filtro")
print("  C) Redesenho automatico ao abrir aba Centro de Custos")
print("  D) Diagnostico no console a cada 5s (procure [v14])")
print()
print("COMO VERIFICAR:")
print("  1) Recarregue a pagina (Ctrl+F5)")
print("  2) Abra o console (F12 -> aba Console)")
print("  3) Clique na aba Centro de Custos")
print("  4) Procure mensagens [v14] no console")
print("  5) Graficos e cards devem mostrar os lancamentos")
print()
print("Se ainda nao funciona, envie o log do console.")
print()
print("GIT (apos confirmar que funciona):")
print('  git add index.html')
print('  git commit -m "fix(v14): expor getCustosFiltered em window - corrige Centro de Custos"')
print('  git push')
