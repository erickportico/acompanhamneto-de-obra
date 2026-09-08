#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Patch: corrige podeMexer() retornando false para administrador

BUG: Ao clicar "Cadastrar usuário" na tela Administração de Usuários,
aparece "Só o administrador cadastra." mesmo o usuário sendo admin.

CAUSA RAIZ: PainelNucleo.sessao() (linha ~38289) lê sessionStorage
primeiro. Se lá existe uma sessão EXPIRADA (exp < Date.now()),
a função marca s = null mas NÃO cai para localStorage, que pode
conter uma sessão válida salva pelo login P86b.

Resultado: podeMexer() sempre recebe null, retorna false,
e bloqueia o administrador.

Correções aplicadas:
1) PainelNucleo.sessao() — verifica expiração ANTES do fallback
   para localStorage; limpa sessão expirada do sessionStorage
2) podeMexer() (IIFE P87) — adiciona fallback para estado do P128
   e logging de diagnóstico no console
3) sessaoPainel() (IIFE P122) — adiciona verificação de expiração

Uso:  python patch_podeMexer_admin.py  index.html
"""

import re, sys, os

ARQ = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
if not os.path.isfile(ARQ):
    sys.exit(f'Arquivo não encontrado: {ARQ}')

with open(ARQ, 'r', encoding='utf-8') as f:
    txt = f.read()

bak = ARQ + '.bak_podeMexer'
with open(bak, 'w', encoding='utf-8') as f:
    f.write(txt)
print(f'Backup salvo em {bak}')

# ------------------------------------------------------------------
# CORREÇÃO 1: PainelNucleo.sessao() — linha ~38289
# Antes: lê sessionStorage, se expirou seta null, e NUNCA checa
#         localStorage (porque s já não é null no momento do if(!s))
# Depois: verifica expiração logo após ler sessionStorage;
#         se expirou, limpa e cai para localStorage
# ------------------------------------------------------------------
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
    "    /* PATCH_podeMexer: se sessão do sessionStorage expirou, limpa e cai para localStorage */\n"
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
    "    return s;\n"
    "  }"
)

if antigo_nucleo in txt:
    txt = txt.replace(antigo_nucleo, novo_nucleo, 1)
    print('OK  Correção 1: PainelNucleo.sessao() — fallback + limpeza de expirados')
else:
    print('AVISO  Correção 1: bloco de PainelNucleo.sessao() não encontrado exatamente — buscando padrão flexível')
    # Padrão flexível: captura a função sessao() dentro do IIFE do PainelNucleo
    padrao = (
        r'(function sessao\(\) \{\s*'
        r'var s = null;\s*'
        r'try \{ s = JSON\.parse\(sessionStorage\.getItem\(K_SESS\) \|\| \'null\'\); \} catch \(e\) \{ s = null; \}\s*'
        r'if \(!s\) \{\s*'
        r'try \{ s = JSON\.parse\(localStorage\.getItem\(K_SESS\) \|\| \'null\'\); \} catch \(e\) \{ s = null; \}\s*'
        r'\}\s*'
        r'if \(s && s\.exp && Date\.now\(\) > s\.exp\) \{ s = null; \}\s*'
        r'return s;\s*'
        r'\})'
    )
    m = re.search(padrao, txt)
    if m:
        trecho = m.group(1)
        # Substitui mantendo a mesma estrutura mas com a correção
        novo_flex = (
            "function sessao() {\n"
            "    var s = null;\n"
            "    try { s = JSON.parse(sessionStorage.getItem(K_SESS) || 'null'); } catch (e) { s = null; }\n"
            "    /* PATCH_podeMexer: se sessão do sessionStorage expirou, limpa e cai para localStorage */\n"
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
            "    return s;\n"
            "  }"
        )
        txt = txt[:m.start()] + novo_flex + txt[m.end():]
        print('OK  Correção 1 (flexível): PainelNucleo.sessao() corrigido')
    else:
        print('FALHA Correção 1: não consegui localizar PainelNucleo.sessao()')

# ------------------------------------------------------------------
# CORREÇÃO 2: podeMexer() no IIFE P87 (linha ~44548)
# Adiciona fallback para P128.estado e logging de diagnóstico
# ------------------------------------------------------------------
# Primeiro, busca o podeMexer() dentro do IIFE do P87 que tem:
#   var s = (window.PainelNucleo && PainelNucleo.sessao) ? PainelNucleo.sessao() : sessao();
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
    "      /* PATCH_podeMexer: fallback para estado do P128 quando sessão expirou */\n"
    "      if (!s && window.P128 && window.P128.estado) {\n"
    "        var est = window.P128.estado;\n"
    "        if (est.perfil && est.email) {\n"
    "          s = { usuario: est.email, nome: '', perfil: est.perfil };\n"
    "        }\n"
    "      }\n"
    "      if (!s) {\n"
    "        try { console.warn('[podeMexer] sem sessão — verifique login/expiração'); } catch(e0){}\n"
    "        return false;\n"
    "      }\n"
    "      var p = String(s.perfil || '').toLowerCase();\n"
    "      try { console.log('[podeMexer] perfil =', p, '| sessão.usuario =', s.usuario || s.nome || '?'); } catch(e1){}\n"
    "      return p === 'admin' || p === 'editor';\n"
    "    } catch (e) {\n"
    "      try { console.error('[podeMexer] exceção:', e); } catch(e2){}\n"
    "      return false;\n"
    "    }\n"
    "  }"
)

if antigo_podemexer in txt:
    txt = txt.replace(antigo_podemexer, novo_podemexer, 1)
    print('OK  Correção 2: podeMexer() IIFE P87 — fallback P128 + logging')
else:
    # Padrão flexível
    padrao2 = (
        r'function podeMexer\(\) \{\s*'
        r'try \{\s*'
        r'var s = \(window\.PainelNucleo && PainelNucleo\.sessao\) \? PainelNucleo\.sessao\(\) : sessao\(\);\s*'
        r'if \(!s\) return false;\s*'
        r'var p = String\(s\.perfil \|\| \'\'\)\.toLowerCase\(\);\s*'
        r'return p === \'admin\' \|\| p === \'editor\';\s*'
        r'\} catch \(e\) \{\s*'
        r'return false;\s*'
        r'\}\s*'
        r'\}'
    )
    m2 = re.search(padrao2, txt)
    if m2:
        trecho2 = m2.group(0)
        txt = txt[:m2.start()] + novo_podemexer + txt[m2.end():]
        print('OK  Correção 2 (flexível): podeMexer() IIFE P87 corrigido')
    else:
        print('FALHA Correção 2: não consegui localizar podeMexer() no IIFE P87')

# ------------------------------------------------------------------
# CORREÇÃO 3: sessaoPainel() no IIFE P122 (linha ~54246)
# Esta versão NÃO verifica expiração — pode retornar sessão expirada
# ------------------------------------------------------------------
antigo_sessaoPainel = (
    "function sessaoPainel() {\n"
    "    var v = null;\n"
    "    try { v = sessionStorage.getItem('painel_seg_sessao_v1') || localStorage.getItem('painel_seg_sessao_v1'); } catch (e) {}\n"
    "    try { return v ? JSON.parse(v) : null; } catch (e) { return null; }\n"
    "  }"
)

novo_sessaoPainel = (
    "function sessaoPainel() {\n"
    "    var v = null, s = null;\n"
    "    try { v = sessionStorage.getItem('painel_seg_sessao_v1'); } catch (e) {}\n"
    "    /* PATCH_podeMexer: mesma correção — verifica expiração antes de cair para localStorage */\n"
    "    if (v) {\n"
    "      try { s = JSON.parse(v); } catch (e) { s = null; }\n"
    "      if (s && s.exp && Date.now() > s.exp) {\n"
    "        try { sessionStorage.removeItem('painel_seg_sessao_v1'); } catch (e5) {}\n"
    "        s = null; v = null;\n"
    "      }\n"
    "    }\n"
    "    if (!s) {\n"
    "      try { v = localStorage.getItem('painel_seg_sessao_v1'); } catch (e) {}\n"
    "      if (v) {\n"
    "        try { s = JSON.parse(v); } catch (e) { s = null; }\n"
    "        if (s && s.exp && Date.now() > s.exp) {\n"
    "          try { localStorage.removeItem('painel_seg_sessao_v1'); } catch (e6) {}\n"
    "          s = null;\n"
    "        }\n"
    "      }\n"
    "    }\n"
    "    return s;\n"
    "  }"
)

if antigo_sessaoPainel in txt:
    txt = txt.replace(antigo_sessaoPainel, novo_sessaoPainel, 1)
    print('OK  Correção 3: sessaoPainel() IIFE P122 — fallback + verificação de expiração')
else:
    padrao3 = (
        r"function sessaoPainel\(\) \{\s*"
        r"var v = null;\s*"
        r"try \{ v = sessionStorage\.getItem\('painel_seg_sessao_v1'\) \|\| localStorage\.getItem\('painel_seg_sessao_v1'\); \} catch \(e\) \{\}\s*"
        r"try \{ return v \? JSON\.parse\(v\) : null; \} catch \(e\) \{ return null; \}\s*"
        r"\}"
    )
    m3 = re.search(padrao3, txt)
    if m3:
        txt = txt[:m3.start()] + novo_sessaoPainel + txt[m3.end():]
        print('OK  Correção 3 (flexível): sessaoPainel() IIFE P122 corrigido')
    else:
        print('AVISO Correção 3: sessaoPainel() não encontrado — pode já ter sido corrigido')

# ------------------------------------------------------------------
# CORREÇÃO 4: Login P86b — também gravar no sessionStorage para consistência
# (linha ~43756: gravarJson(K_SESS, sessaoSupabase) salva só no localStorage)
# ------------------------------------------------------------------
antigo_login86b = (
    "if (typeof gravarJson === 'function' && typeof K_SESS !== 'undefined') {\n"
    "      gravarJson(K_SESS, sessaoSupabase);\n"
    "    }"
)

novo_login86b = (
    "/* PATCH_podeMexer: gravar no sessionStorage TAMBÉM para que PainelNucleo.sessao() encontre */\n"
    "    try { sessionStorage.setItem(K_SESS, JSON.stringify(sessaoSupabase)); } catch (e7) {}\n"
    "    if (typeof gravarJson === 'function' && typeof K_SESS !== 'undefined') {\n"
    "      gravarJson(K_SESS, sessaoSupabase);\n"
    "    }"
)

if antigo_login86b in txt:
    txt = txt.replace(antigo_login86b, novo_login86b, 1)
    print('OK  Correção 4: Login P86b — gravação no sessionStorage adicionada')
else:
    # Versão alternativa — o bloco pode ter pequenas diferenças de espaçamento
    padrao4 = (
        r"if \(typeof gravarJson === 'function' && typeof K_SESS !== 'undefined'\) \{\s*"
        r"gravarJson\(K_SESS, sessaoSupabase\);\s*"
        r"\}"
    )
    m4 = re.search(padrao4, txt)
    if m4:
        txt = txt[:m4.start()] + novo_login86b + txt[m4.end():]
        print('OK  Correção 4 (flexível): Login P86b — sessionStorage adicionado')
    else:
        print('AVISO Correção 4: bloco do login P86b não encontrado — pode já ter sido corrigido')

# ------------------------------------------------------------------
# Salvar
# ------------------------------------------------------------------
with open(ARQ, 'w', encoding='utf-8') as f:
    f.write(txt)

print(f'\nPatch aplicado em {ARQ}')
print('Para reverter: cp', bak, ARQ)
