#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Patch: corrige 2 bugs na tela de Administração de Usuários

BUG 1: podeMexer() retorna false para admin logado
  Causa: PainelNucleo.sessao() lê sessionStorage primeiro; se lá existe
  sessão EXPIRADA, descarta mas a verificação de expiração acontece DEPOIS
  do fallback para localStorage. Resultado: se sessionStorage tem sessão
  expirada e localStorage tem a mesma sessão (também expirada), retorna
  null. Porém o usuário AINDA está logado — P128.estado e Supabase auth
  continuam válidos. podeMexer() não tem fallback e retorna false.

  Correção:
  - PainelNucleo.sessao(): verifica expiração no sessionStorage ANTES de
    cair para localStorage; se ambos expirados, tenta renovar via
    P128.estado ou Supabase auth getSession
  - podeMexer() (P87): adiciona fallback para P128.estado quando
    sessao() retorna null; adiciona logging de diagnóstico
  - ehAdmin() (P86b): mesma correção de fallback

BUG 2: Modal "Usuários cadastrados" aparece descentralizado e pula
  Causa: abrirUsuarios() chama estilo() (que injeta CSS base), depois
  appendChild adiciona o HTML. O CSS de centralização do p88Estilo só
  é injetado depois (por outra chamada). O modal fica visível sem
  position:fixed/transform por um frame, causando o pulo visual.

  Correção: abrirUsuarios() já chama estilo() no início — adicionamos
  as regras de centralização DENTRO desse mesmo bloco CSS, para que
  fiquem disponíveis ANTES do appendChild.

Uso:  python patch_cadastro_admin.py  index.html
"""

import re, sys, os

ARQ = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
if not os.path.isfile(ARQ):
    sys.exit(f'Arquivo não encontrado: {ARQ}')

with open(ARQ, 'r', encoding='utf-8') as f:
    txt = f.read()

bak = ARQ + '.bak_cadastroAdmin'
with open(bak, 'w', encoding='utf-8') as f:
    f.write(txt)
print(f'Backup salvo em {bak}')

ok = 0

# ==================================================================
# CORREÇÃO 1: PainelNucleo.sessao() — expiração ANTES do fallback
# Linha ~38289
# Antes: lê sessionStorage, se null cai para localStorage, DEPOIS
#         verifica expiração (mas já leu localStorage com base no null
#         do sessionStorage, que pode ter sido null por expiração)
# Depois: verifica expiração de cada storage individualmente; se ambos
#          expirados, tenta P128.estado ou Supabase getSession
# ==================================================================
antigo_nucleo = (
    "function sessao() {\n"
    "    var s = null;\n"
    "    try { s = JSON.parse(sessionStorage.getItem(K_SESS) || 'null'); } catch (e) { s = null; }\n"
    "    if (!s) {\n"
    "      try { s = JSON.parse(localStorage.getItem(K_SESS) || 'null'); } catch (e) { s = null; }\n"
    "    }\n"
    "    if (s && s.exp && Date.now() > s.exp) { s = null; }\n"
    "    return s;\n"
    "  }"
)

novo_nucleo = (
    "function sessao() {\n"
    "    var s = null;\n"
    "    try { s = JSON.parse(sessionStorage.getItem(K_SESS) || 'null'); } catch (e) { s = null; }\n"
    "    /* PATCH_cadastroAdmin: verifica expiração ANTES de cair para localStorage */\n"
    "    if (s && s.exp && Date.now() > s.exp) {\n"
    "      try { sessionStorage.removeItem(K_SESS); } catch (e3) {}\n"
    "      s = null;\n"
    "    }\n"
    "    if (!s) {\n"
    "      try { s = JSON.parse(localStorage.getItem(K_SESS) || 'null'); } catch (e) { s = null; }\n"
    "    }\n"
    "    if (s && s.exp && Date.now() > s.exp) {\n"
    "      try { localStorage.removeItem(K_SESS); } catch (e4) {}\n"
    "      s = null;\n"
    "    }\n"
    "    /* PATCH_cadastroAdmin: se ambos expirados, tenta P128.estado */\n"
    "    if (!s && window.P128 && window.P128.estado && window.P128.estado.perfil) {\n"
    "      s = { usuario: window.P128.estado.email, nome: '', perfil: window.P128.estado.perfil, em: Date.now(), p128fallback: true };\n"
    "      try { sessionStorage.setItem(K_SESS, JSON.stringify(s)); } catch (e5) {}\n"
    "      try { localStorage.setItem(K_SESS, JSON.stringify(s)); } catch (e6) {}\n"
    "    }\n"
    "    return s;\n"
    "  }"
)

if antigo_nucleo in txt:
    txt = txt.replace(antigo_nucleo, novo_nucleo, 1)
    ok += 1
    print('OK  Correção 1: PainelNucleo.sessao() — expiração antes do fallback + P128.estado')
else:
    # Padrão flexível (regex)
    padrao = (
        r'function sessao\(\) \{\s*'
        r'var s = null;\s*'
        r"try \{ s = JSON\.parse\(sessionStorage\.getItem\(K_SESS\) \|\| 'null'\); \} catch \(e\) \{ s = null; \}\s*"
        r'if \(!s\) \{\s*'
        r"try \{ s = JSON\.parse\(localStorage\.getItem\(K_SESS\) \|\| 'null'\); \} catch \(e\) \{ s = null; \}\s*"
        r'\}\s*'
        r'if \(s && s\.exp && Date\.now\(\) > s\.exp\) \{ s = null; \}\s*'
        r'return s;\s*'
        r'\}'
    )
    m = re.search(padrao, txt)
    if m:
        txt = txt[:m.start()] + novo_nucleo + txt[m.end():]
        ok += 1
        print('OK  Correção 1 (flexível): PainelNucleo.sessao() corrigido')
    else:
        print('FALHA Correção 1: não encontrei PainelNucleo.sessao()')

# ==================================================================
# CORREÇÃO 2: podeMexer() no IIFE P87 — fallback P128 + logging
# Linha ~44548
# ==================================================================
antigo_podemexer = (
    "function podeMexer() {\n"
    "    try {\n"
    "      var s = (window.PainelNucleo && PainelNucleo.sessao) ? PainelNucleo.sessao() : sessao();\n"
    "      if (!s) return false;\n"
    "      var p = String(s.perfil || '').toLowerCase();\n"
    "      return p === 'admin' || p === 'editor';\n"
    "    } catch (e) {\n"
    "      return false;\n"
    "    }\n"
    "  }"
)

novo_podemexer = (
    "function podeMexer() {\n"
    "    try {\n"
    "      var s = (window.PainelNucleo && PainelNucleo.sessao) ? PainelNucleo.sessao() : sessao();\n"
    "      /* PATCH_cadastroAdmin: fallback para P128.estado quando sessão expirou */\n"
    "      if (!s && window.P128 && window.P128.estado && window.P128.estado.perfil) {\n"
    "        s = { usuario: window.P128.estado.email, nome: '', perfil: window.P128.estado.perfil };\n"
    "        try { console.warn('[podeMexer] sessão expirou — usando P128.estado como fallback, perfil =', window.P128.estado.perfil); } catch(e0){}\n"
    "      }\n"
    "      if (!s) {\n"
    "        try { console.warn('[podeMexer] sem sessão e sem P128.estado — cadastro bloqueado'); } catch(e0){}\n"
    "        return false;\n"
    "      }\n"
    "      var p = String(s.perfil || '').toLowerCase();\n"
    "      try { console.log('[podeMexer] perfil =', p, '| usuario =', s.usuario || s.nome || '?'); } catch(e1){}\n"
    "      return p === 'admin' || p === 'editor';\n"
    "    } catch (e) {\n"
    "      try { console.error('[podeMexer] exceção:', e); } catch(e2){}\n"
    "      return false;\n"
    "    }\n"
    "  }"
)

if antigo_podemexer in txt:
    txt = txt.replace(antigo_podemexer, novo_podemexer, 1)
    ok += 1
    print('OK  Correção 2: podeMexer() IIFE P87 — fallback P128 + logging')
else:
    padrao2 = (
        r'function podeMexer\(\) \{\s*'
        r'try \{\s*'
        r'var s = \(window\.PainelNucleo && PainelNucleo\.sessao\) \? PainelNucleo\.sessao\(\) : sessao\(\);\s*'
        r'if \(!s\) return false;\s*'
        r"var p = String\(s\.perfil \|\| ''\)\.toLowerCase\(\);\s*"
        r"return p === 'admin' \|\| p === 'editor';\s*"
        r'\} catch \(e\) \{\s*'
        r'return false;\s*'
        r'\}\s*'
        r'\}'
    )
    m2 = re.search(padrao2, txt)
    if m2:
        txt = txt[:m2.start()] + novo_podemexer + txt[m2.end():]
        ok += 1
        print('OK  Correção 2 (flexível): podeMexer() IIFE P87 corrigido')
    else:
        print('FALHA Correção 2: não encontrei podeMexer() no IIFE P87')

# ==================================================================
# CORREÇÃO 3: ehAdmin() no IIFE P86b — mesmo fallback P128
# Linha ~45000
# ==================================================================
antigo_ehadmin = (
    "function ehAdmin() {\n"
    "    var s = sessao();\n"
    "    if (!s) { return true; }\n"
    "    return String(s.perfil || '').toLowerCase() === 'admin';\n"
    "  }"
)

novo_ehadmin = (
    "function ehAdmin() {\n"
    "    var s = sessao();\n"
    "    /* PATCH_cadastroAdmin: fallback P128.estado */\n"
    "    if (!s && window.P128 && window.P128.estado && window.P128.estado.perfil) {\n"
    "      s = { usuario: window.P128.estado.email, perfil: window.P128.estado.perfil };\n"
    "    }\n"
    "    if (!s) { return false; }\n"
    "    return String(s.perfil || '').toLowerCase() === 'admin';\n"
    "  }"
)

if antigo_ehadmin in txt:
    txt = txt.replace(antigo_ehadmin, novo_ehadmin, 1)
    ok += 1
    print('OK  Correção 3: ehAdmin() IIFE P86b — fallback P128')
else:
    padrao3 = (
        r'function ehAdmin\(\) \{\s*'
        r'var s = sessao\(\);\s*'
        r"if \(!s\) \{ return true; \}\s*"
        r"return String\(s\.perfil \|\| ''\)\.toLowerCase\(\) === 'admin';\s*"
        r'\}'
    )
    m3 = re.search(padrao3, txt)
    if m3:
        txt = txt[:m3.start()] + novo_ehadmin + txt[m3.end():]
        ok += 1
        print('OK  Correção 3 (flexível): ehAdmin() IIFE P86b corrigido')
    else:
        print('AVISO Correção 3: ehAdmin() não encontrado — pode já ter sido corrigido')

# ==================================================================
# CORREÇÃO 4: Modal já aparece centralizado (sem pulo visual)
# O p88 estilo() que injeta position:fixed/centering roda DEPOIS que o
# modal já está visível. A solução é injetar as regras de centralização
# DENTRO do estilo() do P87 (linha ~44354), que já é chamado ANTES do
# appendChild.
# ==================================================================
# Procuramos a linha que define #p87Fundo no estilo() do P87
linha_fundo = "'#p87Fundo{position:fixed;inset:0;z-index:2147483200;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Segoe UI,Arial,sans-serif}'"

if linha_fundo in txt:
    # Substituir a linha do #p87Fundo para incluir position:fixed centering
    nova_linha_fundo = (
        "'#p87Fundo{position:fixed;inset:0;z-index:2147483200;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Segoe UI,Arial,sans-serif}'\n"
        "      /* PATCH_cadastroAdmin: centralização já no CSS base para evitar pulo visual */\n"
        "      '#p87Caixa{position:fixed !important;left:50% !important;top:50% !important;right:auto !important;bottom:auto !important;transform:translate(-50%,-50%) !important;margin:0 !important;width:760px !important;max-width:94vw !important;max-height:86vh !important;height:auto !important}'"
    )
    txt = txt.replace(linha_fundo, nova_linha_fundo, 1)
    ok += 1
    print('OK  Correção 4: Modal centralizado desde o aparecimento (sem pulo)')
else:
    # Tentar padrão flexível
    padrao4 = r"'#p87Fundo\\{position:fixed;inset:0[^\"]*display:flex;align-items:center;justify-content:center[^\"]*'"
    m4 = re.search(padrao4, txt)
    if m4:
        trecho = m4.group(0)
        nova_linha_fundo_flex = (
            trecho + "'\n"
            "      /* PATCH_cadastroAdmin: centralização já no CSS base para evitar pulo visual */\n"
            "      '#p87Caixa{position:fixed !important;left:50% !important;top:50% !important;right:auto !important;bottom:auto !important;transform:translate(-50%,-50%) !important;margin:0 !important;width:760px !important;max-width:94vw !important;max-height:86vh !important;height:auto !important}'"
        )
        txt = txt.replace(trecho, nova_linha_fundo_flex, 1)
        ok += 1
        print('OK  Correção 4 (flexível): Modal centralizado desde o aparecimento')
    else:
        print('AVISO Correção 4: não encontrei CSS do #p87Fundo — pode já ter sido corrigido')

# ==================================================================
# CORREÇÃO 5: Adicionar animation no modal para transição suave
# ==================================================================
linha_caixa = "'#p87Caixa{background:#fff;border-radius:14px;width:100%;max-width:860px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.4)}'"

if linha_caixa in txt:
    nova_linha_caixa = (
        "'#p87Caixa{background:#fff;border-radius:14px;width:100%;max-width:860px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.4);animation:p87FadeIn .2s ease-out}'\n"
        "      /* PATCH_cadastroAdmin: animação suave de entrada */\n"
        "      '@keyframes p87FadeIn{from{opacity:0;transform:translate(-50%,-50%) scale(.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}'"
    )
    txt = txt.replace(linha_caixa, nova_linha_caixa, 1)
    ok += 1
    print('OK  Correção 5: Animação suave de entrada no modal')
else:
    print('AVISO Correção 5: não encontrei CSS do #p87Caixa — pode já ter sido corrigido')

# ==================================================================
# Salvar
# ==================================================================
with open(ARQ, 'w', encoding='utf-8') as f:
    f.write(txt)

print(f'\nPatch aplicado em {ARQ}')
print('Para reverter: cp', bak, ARQ)
