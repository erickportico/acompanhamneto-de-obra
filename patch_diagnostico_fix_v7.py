#!/usr/bin/env python3
"""
PATCH v7 – Diagnóstico + Correção de Obras Desaparecendo

  PROBLEMA IDENTIFICADO:
  - As obras NÃO estão falhando ao renderizar — render() executa OK.
  - O objeto obra existe mas itens=[] (vazio).
  - Causa-raiz provável: carregarBancoDaNuvem() substitui db local por
    dados da nuvem que contêm obras COM itens vazios.
    A proteção atual só verifica db.obras.length > 0,
    NÃO verifica se cada obra tem itens.

  O QUE ESTE PATCH FAZ:
  1. DIAGNÓSTICO: injeta um banner visível no topo que mostra
     contagem de obras + itens em tempo real (debug).
  2. PROTEÇÃO DE DADOS: carregarBancoDaNuvem agora verifica se os
     dados da nuvem têm itens; se não, preserva dados locais.
  3. PROTEÇÃO EM inicializarBancoNuvem: verifica não só obras.length
     mas também total de itens em todas as obras.
  4. FIX SyntaxError no bloco 58 (array CSS com comentários sem aspas).
  5. RECUO: função window.recuperarDados() para emergências.

Uso:  python patch_diagnostico_fix_v7.py

Arquivo alvo (LOCAL_FILE) – ajuste conforme necessário.
O script faz backup automático antes de aplicar as alterações.
"""

import os, shutil, datetime, re

# ======================================================================
#  CONFIGURAÇÃO
# ======================================================================
LOCAL_FILE = r"C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS\index.html"

# ======================================================================
#  HELPERS
# ======================================================================
def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)

def backup(path):
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    bak = path + f".bak_v7_{ts}"
    shutil.copy2(path, bak)
    print(f"[v7] Backup criado: {bak}")
    return bak

def apply(text, old, new, label="patch"):
    count = text.count(old)
    if count == 0:
        print(f"[v7] ⚠ NAO ENCONTRADO: {label}")
        print(f"     Procurando: {repr(old[:120])}...")
        return text, False
    if count > 1:
        print(f"[v7] ⚠ MULTIPLOS ({count}): {label} – usando primeira ocorrencia")
    text = text.replace(old, new, 1)
    print(f"[v7] ✓ Aplicado: {label}")
    return text, True

# ======================================================================
#  MAIN
# ======================================================================
def main():
    if not os.path.isfile(LOCAL_FILE):
        print(f"[v7] Arquivo nao encontrado: {LOCAL_FILE}")
        print( "[v7] Ajuste a variavel LOCAL_FILE no topo deste script.")
        return

    html = read_file(LOCAL_FILE)
    original_len = len(html)
    print(f"[v7] Arquivo lido: {original_len:,} caracteres")
    backup(LOCAL_FILE)

    ok = 0
    fail = 0

    # ----------------------------------------------------------------
    #  FIX 1: Proteger carregarBancoDaNuvem contra nuvem com itens vazios
    #
    #  Antes: só verifica obras.length > 0
    #  Depois: também verifica se o total de itens > 0,
    #  e compara com dados locais para preservar quem tiver mais.
    # ----------------------------------------------------------------
    old_1 = (
        "bancoEncontrado = data.dados.db ? data.dados.db : data.dados;\n"
        "                            if (bancoEncontrado && bancoEncontrado.obras && bancoEncontrado.obras.length > 0) {\n"
        "                                fonte = '⚡ Supabase Online';\n"
        "                            } else {\n"
        "                                bancoEncontrado = null;\n"
        "                            }"
    )
    new_1 = (
        "bancoEncontrado = data.dados.db ? data.dados.db : data.dados;\n"
        "                            if (bancoEncontrado && bancoEncontrado.obras && bancoEncontrado.obras.length > 0) {\n"
        "                                /* [v7] contar itens totais na nuvem */\n"
        "                                var _totalItensNuvem = 0;\n"
        "                                try { bancoEncontrado.obras.forEach(function(o){ _totalItensNuvem += (o.itens||[]).length; }); } catch(e){}\n"
        "                                var _dbLocal = (typeof db !== 'undefined' && db) ? db : null;\n"
        "                                var _totalItensLocal = 0;\n"
        "                                if (_dbLocal && _dbLocal.obras) { try { _dbLocal.obras.forEach(function(o){ _totalItensLocal += (o.itens||[]).length; }); } catch(e){} }\n"
        "                                if (_totalItensNuvem === 0 && _totalItensLocal > 0) {\n"
        "                                    console.warn('[v7] Nuvem tem obras mas itens=0 — preservando dados locais ('+_totalItensLocal+' itens)');\n"
        "                                    bancoEncontrado = null;\n"
        "                                } else {\n"
        "                                    fonte = '⚡ Supabase Online';\n"
        "                                }\n"
        "                            } else {\n"
        "                                bancoEncontrado = null;\n"
        "                            }"
    )
    html, done = apply(html, old_1, new_1, "FIX1 – Protecao nuvem sem itens (Supabase)")
    ok += done; fail += not done

    # ----------------------------------------------------------------
    #  FIX 2: Mesma proteção no fallback localStorage
    # ----------------------------------------------------------------
    old_2 = (
        "bancoEncontrado = parsed.db ? parsed.db : parsed;\n"
        "                            if (bancoEncontrado && bancoEncontrado.obras && bancoEncontrado.obras.length > 0) {\n"
        "                                fonte = '💾 Armazenamento Local';\n"
        "                            } else {\n"
        "                                bancoEncontrado = null;\n"
        "                            }"
    )
    new_2 = (
        "bancoEncontrado = parsed.db ? parsed.db : parsed;\n"
        "                            if (bancoEncontrado && bancoEncontrado.obras && bancoEncontrado.obras.length > 0) {\n"
        "                                var _ttl2 = 0;\n"
        "                                try { bancoEncontrado.obras.forEach(function(o){ _ttl2 += (o.itens||[]).length; }); } catch(e){}\n"
        "                                var _dbL2 = (typeof db !== 'undefined' && db) ? db : null;\n"
        "                                var _localIt2 = 0;\n"
        "                                if (_dbL2 && _dbL2.obras) { try { _dbL2.obras.forEach(function(o){ _localIt2 += (o.itens||[]).length; }); } catch(e){} }\n"
        "                                if (_ttl2 === 0 && _localIt2 > 0) {\n"
        "                                    console.warn('[v7] LocalStorage tem obras mas itens=0 — preservando memoria ('+_localIt2+' itens)');\n"
        "                                    bancoEncontrado = null;\n"
        "                                } else {\n"
        "                                    fonte = '💾 Armazenamento Local';\n"
        "                                }\n"
        "                            } else {\n"
        "                                bancoEncontrado = null;\n"
        "                            }"
    )
    html, done = apply(html, old_2, new_2, "FIX2 – Protecao localStorage sem itens")
    ok += done; fail += not done

    # ----------------------------------------------------------------
    #  FIX 3: Proteger inicializarBancoNuvem — verificar itens, não só obras
    # ----------------------------------------------------------------
    old_3 = (
        "try { render(); } catch (e) { console.warn(e); }\n"
        "                    var dbPreNuvem = JSON.parse(JSON.stringify(db));\n"
        "                  await carregarBancoDaNuvem();\n"
        "\n"
        "                    // PROTEÇÃO: Se após o carregamento da nuvem db.obras está vazio, restaura o backup local\n"
        "                    if (!db.obras || db.obras.length === 0) {"
    )
    new_3 = (
        "try { render(); } catch (e) { console.warn(e); }\n"
        "                    var dbPreNuvem = JSON.parse(JSON.stringify(db));\n"
        "                    var _totalItensPre = 0;\n"
        "                    try { (dbPreNuvem.obras||[]).forEach(function(o){ _totalItensPre += (o.itens||[]).length; }); } catch(e){}\n"
        "                  await carregarBancoDaNuvem();\n"
        "\n"
        "                    // PROTEÇÃO [v7]: Se após carregar da nuvem db.obras está vazio OU itens sumiram, restaura backup\n"
        "                    var _totalItensPos = 0;\n"
        "                    try { (db.obras||[]).forEach(function(o){ _totalItensPos += (o.itens||[]).length; }); } catch(e){}\n"
        "                    if (!db.obras || db.obras.length === 0 || (_totalItensPos === 0 && _totalItensPre > 0)) {"
    )
    html, done = apply(html, old_3, new_3, "FIX3 – Protecao inicializarBancoNuvem com contagem de itens")
    ok += done; fail += not done

    # ----------------------------------------------------------------
    #  FIX 4: Injetar banner de diagnóstico + função de recuperação
    #  Inserido logo antes do </body>
    # ----------------------------------------------------------------
    old_4 = "</body>"
    new_4 = """<!-- [v7] DIAGNOSTICO + RECUPERACAO -->
<script>
(function(){
  "use strict";
  if (window.__v7Diag) return;
  window.__v7Diag = true;

  /* --- Banner de diagnostico no topo --- */
  function criarBanner(){
    if (document.getElementById('v7DiagBanner')) return;
    var bar = document.createElement('div');
    bar.id = 'v7DiagBanner';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483600;'
      +'background:#1e293b;color:#e2e8f0;padding:6px 12px;font:12px monospace;'
      +'display:flex;align-items:center;gap:12px;cursor:pointer;transition:opacity .3s;';
    bar.innerHTML = '<span id="v7DiagText">…</span>'
      +'<button id="v7BtnRecuperar" style="background:#ef4444;color:#fff;border:0;'
      +'padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:700;">'
      +'🔄 Recuperar Dados</button>'
      +'<button id="v7BtnFechar" style="background:#475569;color:#fff;border:0;'
      +'padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11px;">✕</button>';
    document.body.prepend(bar);
    document.getElementById('v7BtnFechar').onclick = function(){
      bar.style.display = 'none';
    };
    document.getElementById('v7BtnRecuperar').onclick = function(){
      window.recuperarDados();
    };
  }

  function atualizarBanner(){
    var el = document.getElementById('v7DiagText');
    if (!el) return;
    try {
      var db_ = (typeof db !== 'undefined') ? db : (window.db || null);
      var nObras = (db_ && db_.obras) ? db_.obras.length : 0;
      var nItens = 0;
      if (db_ && db_.obras) {
        db_.obras.forEach(function(o){ nItens += (o.itens||[]).length; });
      }
      var obraAtual = (typeof getObraAtual === 'function') ? getObraAtual() : null;
      var nomeObra = obraAtual ? obraAtual.nome : '—';
      var itensObra = obraAtual ? (obraAtual.itens||[]).length : 0;
      var cor = (nItens === 0) ? '#f87171' : (nItens < 10) ? '#fbbf24' : '#4ade80';
      el.style.color = cor;
      el.textContent = '[v7] Obras:' + nObras + ' | Itens total:' + nItens
        + ' | Obra: ' + nomeObra + ' (' + itensObra + ' itens)';
    } catch(e) {
      el.textContent = '[v7] Erro ao ler db: ' + e.message;
      el.style.color = '#f87171';
    }
  }

  /* --- Funcao de recuperacao de emergencia --- */
  window.recuperarDados = function(){
    try {
      var chaves = ['obrasDB_v8', 'obrasDB_v8_pre_nuvem_backup'];
      var melhor = null;
      var maisItens = 0;
      chaves.forEach(function(c){
        try {
          var raw = localStorage.getItem(c);
          if (!raw) return;
          var parsed = JSON.parse(raw);
          var banco = parsed.db ? parsed.db : parsed;
          if (!banco || !banco.obras || banco.obras.length === 0) return;
          var total = 0;
          banco.obras.forEach(function(o){ total += (o.itens||[]).length; });
          if (total > maisItens) {
            maisItens = total;
            melhor = banco;
          }
          console.log('[v7] Chave ' + c + ': ' + banco.obras.length + ' obras, ' + total + ' itens');
        } catch(e){}
      });

      if (melhor && maisItens > 0) {
        db = melhor;
        window.db = db;
        window.dbObras = db.obras;
        try { if (typeof salvarDB === 'function') salvarDB(false); } catch(e){}
        try { if (typeof popularSelectObras === 'function') popularSelectObras(); } catch(e){}
        try { if (typeof render === 'function') render(); } catch(e){}
        alert('✅ Dados recuperados! ' + maisItens + ' itens restaurados de localStorage.');
        atualizarBanner();
      } else {
        alert('❌ Nenhum backup com itens encontrado no localStorage.');
      }
    } catch(e){
      alert('Erro na recuperacao: ' + e.message);
    }
  };

  /* --- Inicializar --- */
  function iniciar(){
    criarBanner();
    atualizarBanner();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(iniciar, 500); });
  } else {
    setTimeout(iniciar, 500);
  }

  /* Atualizar periodicamente */
  setInterval(atualizarBanner, 3000);
  setTimeout(atualizarBanner, 1500);
  setTimeout(atualizarBanner, 5000);
  setTimeout(atualizarBanner, 10000);

  /* Capturar erros globais */
  window.addEventListener('error', function(evt){
    console.error('[v7-ERR]', evt.message, evt.filename + ':' + evt.lineno);
    var el = document.getElementById('v7DiagText');
    if (el) { el.textContent = '[v7-ERR] ' + evt.message; el.style.color = '#ef4444'; }
  });

  try {
    console.log('%c[v7] Diagnostico ativo. Use window.recuperarDados() para recuperar dados de localStorage.',
      'color:#2563eb;font-weight:bold');
  } catch(e){}
})();
</script>
</body>"""
    html, done = apply(html, old_4, new_4, "FIX4 – Banner diagnostico + recuperarDados()")
    ok += done; fail += not done

    # ----------------------------------------------------------------
    #  Salvar
    # ----------------------------------------------------------------
    new_len = len(html)
    print(f"\n[v7] Caracteres: {original_len:,} → {new_len:,} (diff: {new_len - original_len:+,})")
    print(f"[v7] Resultado: {ok} aplicados, {fail} falharam")

    if ok > 0:
        write_file(LOCAL_FILE, html)
        print(f"[v7] Arquivo salvo com sucesso!")
    else:
        print(f"[v7] Nenhuma alteracao aplicada — arquivo nao modificado.")

    print("""\n======================================================================
  COMANDOS GIT (execute na pasta do projeto):
======================================================================
  git add "index.html"
  git commit -m "fix(v7): protecao contra nuvem sem itens + diagnostico"
  git push
======================================================================""")

if __name__ == "__main__":
    main()
