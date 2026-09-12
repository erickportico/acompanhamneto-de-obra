#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r'''
PATCH v15 — Centro de Custos: graficos e cards VAZIOS (versao SEGURA)
====================================================================

CAUSA RAIZ
----------
  getCustosFiltered() eh funcao LOCAL dentro de initCustoTab()
  e NUNCA eh exposta em window.getCustosFiltered.

  Todos os patches que tentam usar getCustosFiltered falham:
  - PATCH120: typeof getCustosFiltered === 'function' -> FALSE
  - PATCH137: window.getCustosFiltered -> undefined
  - pFixCustoDup: window.getCustosFiltered -> undefined
  - PATCH77: typeof getCustosFiltered === 'function' -> FALSE

  Resultado: listas vazias -> graficos e cards mostram
  "Nada lancado ainda" / "R$ 0,00"

CORRECAO (MINIMALISTA)
----------------------
  Apenas UMA insercao:
    window.getCustosFiltered = getCustosFiltered;

  Inserida imediatamente antes da linha:
    window.renderCustoDashboard = function(){

  Nada mais eh modificado. Nenhum wrapper, nenhum script extra.
  Quanto menos codigo inserido, menor o risco.

COMO RODAR
----------
  cd "C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS"
  python patch_v15_custo_fix.py

  Depois: Ctrl+F5, F12 -> Console, clicar aba Centro de Custos

SEGURANCA
---------
  - Leitura e escrita em modo BINARIO (rb/wb)
  - Backup automatico com timestamp
  - Verificacao de integridade ANTES e DEPOIS do patch
  - Auto-revert se a verificacao pos-patch falhar
  - Suporta LF e CRLF (Windows)
  - Usa os.path.join() para caminhos (sem \U escape)
'''

import os, sys, shutil, datetime, re

CAMINHO = os.path.join(
    os.environ.get("USERPROFILE", os.path.expanduser("~")),
    "Desktop",
    "ACOMPANHAMENTO DE OBRAS",
    "index.html"
)

# ═══════════════════════════════════════════════════════════════
#  1. VERIFICACOES PRE-PATCH
# ═══════════════════════════════════════════════════════════════
if not os.path.isfile(CAMINHO):
    print("[v15] ERRO: arquivo nao encontrado:")
    print(f"       {CAMINHO}")
    print()
    print("Verifique se o caminho esta correto.")
    print("O index.html deve estar na pasta RAIZ do projeto.")
    sys.exit(1)

tam_original = os.path.getsize(CAMINHO)
if tam_original < 10000:
    print("[v15] ERRO: arquivo muito pequeno ({tam_original} bytes).")
    print("       Provavelmente o arquivo esta corrompido ou vazio.")
    print()
    print("       Tente restaurar o backup de um patch anterior.")
    sys.exit(1)

print(f"[v15] Arquivo encontrado: {tam_original:,} bytes")

# ═══════════════════════════════════════════════════════════════
#  2. LEITURA BINARIA
# ═══════════════════════════════════════════════════════════════
with open(CAMINHO, "rb") as f:
    raw = f.read()

try:
    html = raw.decode("utf-8")
except UnicodeDecodeError:
    try:
        html = raw.decode("windows-1252")
        print("[v15] AVISO: arquivo usava windows-1252, convertendo para UTF-8")
    except UnicodeDecodeError:
        html = raw.decode("utf-8", errors="replace")
        print("[v15] AVISO: caracteres invalidos substituidos")

print(f"[v15] Decodificado: {len(html):,} caracteres")

# Verificar integridade basica do HTML
_check_tags = [
    ('<!DOCTYPE' in html or '<!doctype' in html, 'DOCTYPE'),
    ('<html' in html, 'html tag'),
    ('<head' in html, 'head tag'),
    ('<body' in html, 'body tag'),
    ('</body>' in html, '/body tag'),
    ('</html>' in html, '/html tag'),
]
all_ok = True
for ok, name in _check_tags:
    if not ok:
        print(f"[v15] AVISO: {name} nao encontrado")
        all_ok = False

if not all_ok:
    print("[v15] ERRO: HTML parece corrompido. Abortando.")
    print("         Tente restaurar backup de patch anterior.")
    sys.exit(1)

print("[v15] HTML parece integro")

# Detectar tipo de quebra de linha
_crlf = html.count('\r\n')
_lf_only = html.count('\n') - _crlf
EOL = '\r\n' if _crlf > _lf_only else '\n'
print(f"[v15] Quebras de linha: {'CRLF (Windows)' if EOL == '\\r\\n' else 'LF (Unix)'}")

# ═══════════════════════════════════════════════════════════════
#  3. BACKUP AUTOMATICO
# ═══════════════════════════════════════════════════════════════
ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
bkp = CAMINHO + f".v15bak_{ts}"
shutil.copy2(CAMINHO, bkp)
print(f"[v15] Backup: {os.path.basename(bkp)}")

# ═══════════════════════════════════════════════════════════════
#  4. PATCH: EXPOR window.getCustosFiltered
# ═══════════════════════════════════════════════════════════════
ja_exposto = "window.getCustosFiltered = getCustosFiltered" in html
if ja_exposto:
    print("[v15] getCustosFiltered ja esta exposta em window. Nada a fazer.")
    print("[v15] Se os graficos ainda estao vazios, o problema eh outro.")
    sys.exit(0)

# Buscar o marcador com regex (funciona com LF e CRLF)
padrao = re.compile(
    r'window\.renderCustoDashboard\s*=\s*function\s*\(\)\s*\{[\r\n]+\s*var custos = getCustosFiltered\(\)'
)
m = padrao.search(html)

if not m:
    # Fallback: buscar apenas window.renderCustoDashboard = function(){
    padrao2 = re.compile(
        r'window\.renderCustoDashboard\s*=\s*function\s*\(\)\s*\{'
    )
    m = padrao2.search(html)
    if m:
        print("[v15] Marcador preciso nao encontrado, usando fallback")
    else:
        print("[v15] ERRO CRITICO: nao encontrei window.renderCustoDashboard")
        print("[v15] Nao eh seguro aplicar o patch. Abortando.")
        sys.exit(1)

# Encontrar o inicio da linha (voltar espacos/tab antes de window.)
pos = m.start()
while pos > 0 and html[pos - 1] in (' ', '\t'):
    pos -= 1

# Montar a linha de insercao com a mesma indentacao
# A linha de window.renderCustoDashboard esta indentada com 16 espacos
# Vamos usar a mesma indentacao
insercao = f'{EOL}                window.getCustosFiltered = getCustosFiltered;{EOL}'

html_patched = html[:pos] + insercao + html[pos:]

print(f"[v15] Insercao em pos {pos:,}")
print(f"[v15] Linha inserida: window.getCustosFiltered = getCustosFiltered;")

# ═══════════════════════════════════════════════════════════════
#  5. VERIFICACAO POS-PATCH
# ═══════════════════════════════════════════════════════════════
_verify = [
    ('<!DOCTYPE' in html_patched or '<!doctype' in html_patched, 'DOCTYPE'),
    ('<html' in html_patched, 'html tag'),
    ('<head' in html_patched, 'head tag'),
    ('<body' in html_patched, 'body tag'),
    ('</body>' in html_patched, '/body tag'),
    ('</html>' in html_patched, '/html tag'),
    ('window.getCustosFiltered = getCustosFiltered' in html_patched, 'getCustosFiltered exposta'),
    ('window.renderCustoDashboard' in html_patched, 'renderCustoDashboard preservado'),
]

ok_all = True
for ok, name in _verify:
    status = 'OK' if ok else 'FALHOU'
    print(f"[v15] Verificacao {name}: {status}")
    if not ok:
        ok_all = False

# Verificar que o arquivo nao encolheu drasticamente
if len(html_patched) < len(html) * 0.99:
    print(f"[v15] ERRO: arquivo encolheu de {len(html):,} para {len(html_patched):,} chars")
    ok_all = False

if not ok_all:
    print()
    print("[v15] ERRO: verificacao pos-patch falhou!")
    print("[v15] Revertendo para backup...")
    shutil.copy2(bkp, CAMINHO)
    print(f"[v15] Revertido. Arquivo: {os.path.getsize(CAMINHO):,} bytes")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════
#  6. ESCRITA BINARIA
# ═══════════════════════════════════════════════════════════════
with open(CAMINHO, "wb") as f:
    f.write(html_patched.encode("utf-8"))

novo_tam = os.path.getsize(CAMINHO)
print()
print("=" * 60)
print("  PATCH v15 APLICADO COM SUCESSO")
print("=" * 60)
print()
print(f"  Tamanho: {novo_tam:,} bytes (era {tam_original:,})")
print(f"  Diferenca: +{novo_tam - tam_original:,} bytes")
print()
print("Correcao aplicada:")
print("  window.getCustosFiltered = getCustosFiltered;")
print("  (exposta globalmente para que os patches enxerguem)")
print()
print("COMO VERIFICAR:")
print("  1) Recarregue a pagina (Ctrl+F5)")
print("  2) Abra o console (F12 -> aba Console)")
print("  3) Clique na aba Centro de Custos")
print("  4) Digite no console: window.getCustosFiltered")
print("     Deve mostrar: function getCustosFiltered()")
print("  5) Digite: window.getCustosFiltered().length")
print("     Deve mostrar o numero de lancamentos")
print()
print("Se a pagina ainda esta em branco, rode o REVERT:")
print("  python patch_v14_revert.py")
print()
print("GIT (apos confirmar que funciona):")
print('  git add index.html')
print('  git commit -m "fix(v15): expor getCustosFiltered em window - corrige Centro de Custos"')
print('  git push')
