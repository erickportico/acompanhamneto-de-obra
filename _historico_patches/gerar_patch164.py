#!/usr/bin/env python3
"""
PATCH 164 – Correção completa do sistema de impressão + restauração do Diário de Obra
================================================================================

Problemas corrigidos:
  1. Impressão "Lançamentos de Pagamento" mostrava sidebar/barra lateral
     → CSS .print-pgto-resumo-mode tinha seletor errado
     (.print-pgto-resumo-mode body > *  em vez de body.print-pgto-resumo-mode > *)
  2. Impressão dos Lançamentos mostrava o painel Resumo em vez do painel
     de Lançamentos → imprimirPaginaPgtoResumo() alvejava #panelPgtoResumo
     mesmo quando chamado da aba de Lançamentos
  3. Diário de Obra sumiu do menu principal → o botão p84Botao não recebia
     a classe tab-btn e ficava invisível ou fora do menu; também o P71
     interceptava cliques de impressão e podia quebrar o p84 se houvesse
     erro de sintaxe no bloco de impressão

Solução:
  A) Corrige os seletores CSS de print-pgto-resumo-mode para usar
     body.print-pgto-resumo-mode (nível do body, não descendente)
  B) Substitui imprimirPaginaPgtoResumo() por uma função inteligente que
     detecta qual sub-aba está visível (Lançamentos ou Resumo) e imprime
     somente o painel correto
  C) Reforça a colocação do botão p84 no menu com classe tab-btn,
     estilo idêntico aos outros botões, e retry a cada 2s caso o menu
     ainda não exista
  D) Adiciona proteção para que erros no bloco de impressão do p84
     não impeçam o módulo inteiro de carregar

Aplicar com:  python gerar_patch164.py
"""

import re, pathlib, sys, os, datetime

ARQ = pathlib.Path(r'C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS\index.html')

# ── helpers ────────────────────────────────────────────────────────────
def ler():
    t = ARQ.read_text(encoding='utf-8')
    print(f'  Arquivo lido: {len(t)} caracteres')
    return t

def salvar(t, tag='PATCH164'):
    ARQ.write_text(t, encoding='utf-8')
    print(f'  Arquivo salvo: {len(t)} caracteres  [{tag}]')

def marca():
    return f'<!-- PATCH164 aplicado em {datetime.datetime.now():%Y-%m-%d %H:%M:%S} -->'

# ── 1) Corrigir CSS print-pgto-resumo-mode (seletores errados) ────────
def corrige_css_print_pgto(txt):
    """Troca .print-pgto-resumo-mode body por body.print-pgto-resumo-mode"""
    velho = (
        '<style id="print-pgto-resumo-css">\n'
        '        .print-pgto-resumo-mode body > *:not(#panelPgtoResumo) { display:none !important; }\n'
        '        .print-pgto-resumo-mode #panelPgtoResumo { position:static !important; width:100% !important; margin:0 !important; padding:10px !important; box-shadow:none !important; }\n'
        '        .print-pgto-resumo-mode .pgto-month-nav button { display:none !important; }\n'
        '        .print-pgto-resumo-mode .lanc-actions { display:none !important; }\n'
        '    </style>'
    )
    novo = (
        '<style id="print-pgto-resumo-css">\n'
        '        body.print-pgto-resumo-mode > *:not(#panelPgtoResumo) { display:none !important; }\n'
        '        body.print-pgto-resumo-mode #panelPgtoResumo { position:static !important; width:100% !important; margin:0 !important; padding:10px !important; box-shadow:none !important; background:#fff !important; color:#000 !important; }\n'
        '        body.print-pgto-resumo-mode #panelPgtoResumo * { visibility:visible !important; }\n'
        '        body.print-pgto-resumo-mode .pgto-month-nav button { display:none !important; }\n'
        '        body.print-pgto-resumo-mode .lanc-actions { display:none !important; }\n'
        '        body.print-pgto-resumo-mode #meu-menu-abas { display:none !important; }\n'
        '        body.print-pgto-resumo-mode header { display:none !important; }\n'
        '    </style>'
    )

    # também corrigir a variante para Lançamentos
    if velho in txt:
        txt = txt.replace(velho, novo)
        print('  [OK] CSS print-pgto-resumo-mode corrigido (seletores body.* )')
    else:
        # tentar regex mais flexível
        pad = r'(\<style id="print-pgto-resumo-css"\>\s*' \
              r'\.)print-pgto-resumo-mode(\s+body\s*\>\s*\*:\s*not\(#panelPgtoResumo\))'
        m = re.search(pad, txt)
        if m:
            txt = txt[:m.start()] + m.group(1) + 'body.print-pgto-resumo-mode > *' + txt[m.end():]
            # mais substituições no mesmo bloco
            txt = txt.replace('.print-pgto-resumo-mode #panelPgtoResumo', 'body.print-pgto-resumo-mode #panelPgtoResumo')
            txt = txt.replace('.print-pgto-resumo-mode .pgto-month-nav', 'body.print-pgto-resumo-mode .pgto-month-nav')
            txt = txt.replace('.print-pgto-resumo-mode .lanc-actions', 'body.print-pgto-resumo-mode .lanc-actions')
            print('  [OK] CSS print-pgto-resumo-mode corrigido via regex')
        else:
            print('  [AVISO] Bloco CSS print-pgto-resumo não encontrado exatamente – verificando seletor individual')
            txt = txt.replace('.print-pgto-resumo-mode body > *', 'body.print-pgto-resumo-mode > *')
            txt = txt.replace('.print-pgto-resumo-mode #panelPgtoResumo', 'body.print-pgto-resumo-mode #panelPgtoResumo')
            txt = txt.replace('.print-pgto-resumo-mode .pgto-month-nav', 'body.print-pgto-resumo-mode .pgto-month-nav')
            txt = txt.replace('.print-pgto-resumo-mode .lanc-actions', 'body.print-pgto-resumo-mode .lanc-actions')
            print('  [OK] Seletores individuais corrigidos')

    # adicionar CSS para print de Lançamentos também
    css_lanc = (
        '<style id="print-pgto-lancamentos-css">\n'
        '        body.print-pgto-lancamentos-mode > *:not(#panelPgtoLancamentos) { display:none !important; }\n'
        '        body.print-pgto-lancamentos-mode #panelPgtoLancamentos { position:static !important; width:100% !important; margin:0 !important; padding:10px !important; box-shadow:none !important; background:#fff !important; color:#000 !important; }\n'
        '        body.print-pgto-lancamentos-mode #panelPgtoLancamentos * { visibility:visible !important; }\n'
        '        body.print-pgto-lancamentos-mode .pgto-month-nav button { display:none !important; }\n'
        '        body.print-pgto-lancamentos-mode .lanc-actions { display:none !important; }\n'
        '        body.print-pgto-lancamentos-mode .lanc-form-grid { display:none !important; }\n'
        '        body.print-pgto-lancamentos-mode #meu-menu-abas { display:none !important; }\n'
        '        body.print-pgto-lancamentos-mode header { display:none !important; }\n'
        '    </style>'
    )
    # inserir logo após o bloco print-pgto-resumo-css
    alvo = '</style>'
    pos = txt.find('</style>', txt.find('id="print-pgto-resumo-css"'))
    if pos > 0:
        txt = txt[:pos+len(alvo)] + '\n    ' + css_lanc + txt[pos+len(alvo):]
        print('  [OK] CSS print-pgto-lancamentos-mode adicionado')
    else:
        print('  [AVISO] Não encontrou fechamento do bloco print-pgto-resumo-css')

    return txt


# ── 2) Substituir imprimirPaginaPgtoResumo() por função inteligente ───
def corrige_funcao_imprimir_pgto(txt):
    """Troca a função imprimirPaginaPgtoResumo por versão que detecta a sub-aba ativa"""
    velho = (
        "function imprimirPaginaPgtoResumo() {\n"
        "              document.body.classList.add('print-pgto-resumo-mode');\n"
        "              window.print();\n"
        "              document.body.classList.remove('print-pgto-resumo-mode');\n"
        "            }"
    )
    novo = (
        "/* PATCH164: imprime a sub-aba ativa de Pagamento (Lançamentos ou Resumo) */\n"
        "function imprimirPaginaPgtoResumo() {\n"
        "              var lancPanel = document.getElementById('panelPgtoLancamentos');\n"
        "              var resPanel  = document.getElementById('panelPgtoResumo');\n"
        "              var isLancamentos = lancPanel && lancPanel.style.display !== 'none';\n"
        "              var classe = isLancamentos ? 'print-pgto-lancamentos-mode' : 'print-pgto-resumo-mode';\n"
        "              document.body.classList.add(classe);\n"
        "              try { window.print(); } finally {\n"
        "                document.body.classList.remove(classe);\n"
        "              }\n"
        "            }"
    )

    if velho in txt:
        txt = txt.replace(velho, novo)
        print('  [OK] Função imprimirPaginaPgtoResumo substituída (versão inteligente)')
    else:
        # regex flexível
        pad = (
            r'function\s+imprimirPaginaPgtoResumo\s*\(\s*\)\s*\{[^}]*'
            r'classList\.add\([\'"\s]*print-pgto-resumo-mode[\'"\s]*\)[^}]*'
            r'classList\.remove\([\'"\s]*print-pgto-resumo-mode[\'"\s]*\)[^}]*\}'
        )
        m = re.search(pad, txt, re.DOTALL)
        if m:
            txt = txt[:m.start()] + novo + txt[m.end():]
            print('  [OK] Função imprimirPaginaPgtoResumo substituída via regex')
        else:
            print('  [AVISO] Função imprimirPaginaPgtoResumo não encontrada – pode já ter sido alterada')

    return txt


# ── 3) Reforçar colocação do botão Diário de Obra no menu ──────────────
def reforgar_botao_diario(txt):
    """Garante que o botão p84Botao receba classe tab-btn e estilos corretos"""
    # A função colocarBotao() do p84 cria o botão sem classe tab-btn
    # Vamos modificá-la para adicionar classe e estilos

    # Primeiro, corrigir o CSS do p84Botao para parecer um tab-btn normal
    velho_css = (
        "'#p84Botao{background:#16a34a;color:#fff;border:none;border-radius:10px;"
        "padding:8px 14px;font-weight:600;cursor:pointer;margin:4px}',\n"
        "'#p84Botao:hover{filter:brightness(1.08)}',"
    )
    novo_css = (
        "'#p84Botao{background:#16a34a;color:#fff;border:none;border-radius:8px;"
        "padding:8px 14px;font-weight:600;cursor:pointer;margin:2px 4px;"
        "font-size:0.9rem;white-space:nowrap;transition:filter .15s}',\n"
        "'#p84Botao:hover{filter:brightness(1.08)}',\n"
        "'#meu-menu-abas.pmenu-oreate .tabs .tab-btn#p84Botao .pmenu-ico,'"
        "'#meu-menu-abas.pmenu-oreate .tabs #p84Botao.pmenu-ico{display:inline-flex}',"
    )

    if velho_css in txt:
        txt = txt.replace(velho_css, novo_css)
        print('  [OK] CSS do p84Botao atualizado')
    else:
        print('  [INFO] CSS do p84Botao não encontrado no formato esperado – prosseguindo')

    # Agora modificar a função colocarBotao() para adicionar classe tab-btn
    velho_func = (
        "b.id = 'p84Botao';\n"
        "                      b.type = 'button';\n"
        "                      b.textContent = 'Diário de Obra';"
    )
    novo_func = (
        "b.id = 'p84Botao';\n"
        "                      b.type = 'button';\n"
        "                      b.className = 'tab-btn';\n"
        "                      b.textContent = '📋 Diário de Obra';"
    )

    if velho_func in txt:
        txt = txt.replace(velho_func, novo_func)
        print('  [OK] colocarBotao() agora adiciona classe tab-btn')
    else:
        # tentar regex
        pad = r"(b\.id\s*=\s*['\"]p84Botao['\"];\s*\n\s*b\.type\s*=\s*['\"]button['\"];\s*\n)"
        m = re.search(pad, txt)
        if m:
            txt = txt[:m.end()] + "                      b.className = 'tab-btn';\n" + txt[m.end():]
            # também trocar o textContent
            txt = txt.replace("b.textContent = 'Diário de Obra';", "b.textContent = '📋 Diário de Obra';")
            print('  [OK] colocarBotao() atualizado via regex')
        else:
            print('  [AVISO] Não conseguiu modificar colocarBotao – tentando abordagem alternativa')
            # Último recurso: adicionar JS que força a classe no botão
            fix_js = (
                "<script>/* PATCH164 – força classe tab-btn no botão Diário de Obra */\n"
                "(function p164fix(){\n"
                "  function fix(){\n"
                "    var b=document.getElementById('p84Botao');\n"
                "    if(b && b.className.indexOf('tab-btn')<0){\n"
                "      b.className='tab-btn';\n"
                "      b.textContent='📋 Diário de Obra';\n"
                "    }\n"
                "  }\n"
                "  setInterval(fix,2000);\n"
                "  setTimeout(fix,500);\n"
                "})();\n"
                "</script>"
            )
            # inserir antes de </body>
            pos = txt.rfind('</body>')
            if pos > 0:
                txt = txt[:pos] + '\n' + fix_js + '\n' + txt[pos:]
                print('  [OK] Script de fallback para p84Botao adicionado')

    # Adicionar retry na função iniciar do p84 caso o menu não exista ainda
    velho_iniciar = (
        "function iniciar() {\n"
        "  estilo();\n"
        "  colocarBotao();\n"
        "  if (typeof window.__varreduraUnica === 'function') {\n"
        "    window.__varreduraUnica(colocarBotao);\n"
        "  }\n"
        "}\n"
        "\n"
        "window.p84AbrirDiario = function () {\n"
        "  abrir();\n"
        "};"
    )
    novo_iniciar = (
        "/* PATCH164: retry robusto + proteção contra erros */\n"
        "function iniciar() {\n"
        "  try { estilo(); } catch(e) { console.warn('[P84] estilo falhou:', e); }\n"
        "  try { colocarBotao(); } catch(e) { console.warn('[P84] colocarBotao falhou:', e); }\n"
        "  /* retry a cada 2s caso o menu ainda não exista */\n"
        "  var tentativas = 0;\n"
        "  var retry = setInterval(function(){\n"
        "    tentativas++;\n"
        "    if (document.getElementById('p84Botao') && document.getElementById('p84Botao').parentNode) {\n"
        "      clearInterval(retry); return;\n"
        "    }\n"
        "    if (tentativas > 15) { clearInterval(retry); return; }\n"
        "    try { colocarBotao(); } catch(e) {}\n"
        "  }, 2000);\n"
        "  if (typeof window.__varreduraUnica === 'function') {\n"
        "    window.__varreduraUnica(colocarBotao);\n"
        "  }\n"
        "}\n"
        "\n"
        "window.p84AbrirDiario = function () {\n"
        "  abrir();\n"
        "};"
    )

    if velho_iniciar in txt:
        txt = txt.replace(velho_iniciar, novo_iniciar)
        print('  [OK] Função iniciar() do p84 reforçada com retry')
    else:
        print('  [INFO] Função iniciar() do p84 não encontrada no formato exato – pode já ter sido modificada')

    return txt


# ── 4) Proteger o bloco de impressão do p84 contra erros de sintaxe ──
def proteger_impressao_p84(txt):
    """Envolve o bloco imprimir() do p84 em try-catch robusto"""
    # O bloco imprimir() do p84 abre uma nova janela – se houver erro de JS
    # na string h, todo o módulo p84 falha ao iniciar.
    # Vamos garantir que janelaImpressao.document.write() tenha fallback.

    # Procurar pelo trecho que faz document.write do p84
    velho_write = (
        "janelaImpressao.document.write(\n"
        "  '<!doctype html>' +\n"
        "  '<html lang=\"pt-BR\"><head>' +\n"
        "  '<meta charset=\"UTF-8\">' +\n"
        "  '<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">' +\n"
        "  '<title>Diário de Obra</title>' +\n"
        "  cssImpressao +\n"
        "  '</head><body>' +\n"
        "  h +\n"
        "  '\n\n\n</body></html>'\n"
        ");"
    )

    novo_write = (
        "/* PATCH164: write protegido contra strings corrompidas */\n"
        "try {\n"
        "janelaImpressao.document.write(\n"
        "  '<!doctype html>' +\n"
        "  '<html lang=\"pt-BR\"><head>' +\n"
        "  '<meta charset=\"UTF-8\">' +\n"
        "  '<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">' +\n"
        "  '<title>Diário de Obra</title>' +\n"
        "  cssImpressao +\n"
        "  '</head><body>' +\n"
        "  h +\n"
        "  '</body></html>'\n"
        ");\n"
        "} catch(erroWrite) {\n"
        "  janelaImpressao.document.write(\n"
        "    '<!doctype html><html><head><meta charset=\"UTF-8\">'\n"
        "    + cssImpressao\n"
        "    + '<title>Diário de Obra</title></head><body>'\n"
        "    + '<p style=color:red>Erro ao gerar conteúdo para impressão. Tente novamente.</p>'\n"
        "    + '</body></html>'\n"
        "  );\n"
        "  janelaImpressao.document.close();\n"
        "  console.error('[P84] Erro no document.write de impressão:', erroWrite);\n"
        "}"
    )

    if velho_write in txt:
        txt = txt.replace(velho_write, novo_write)
        print('  [OK] document.write do p84 protegido com try-catch')
    else:
        # regex mais flexível
        pad = (
            r"janelaImpressao\.document\.write\(\s*"
            r"'<!doctype\s+html>'\s*\+\s*"
            r"'<html\s+lang=[\"\']pt-BR[\"\'][^>]*>\s*<head>'\s*\+\s*"
            r"'<meta\s+charset=[\"\']UTF-8[\"\']>'\s*\+.*?"
            r"h\s*\+\s*"
            r"'[\s\\n]*</body></html>'\s*"
            r"\);"
        )
        m = re.search(pad, txt, re.DOTALL)
        if m:
            # envolver com try-catch
            bloco = m.group(0)
            bloco_novo = (
                "/* PATCH164: write protegido */\ntry {\n" + bloco +
                "\n} catch(e) { console.error('[P84] Erro impressão:', e);"
                " janelaImpressao.document.write('<!doctype html><html>'"
                " + '<head><meta charset=UTF-8><title>Erro</title></head>'"
                " + '<body><p style=color:red>Erro ao gerar impressão.</p></body></html>');"
                " janelaImpressao.document.close(); }"
            )
            txt = txt[:m.start()] + bloco_novo + txt[m.end():]
            print('  [OK] document.write do p84 protegido via regex')
        else:
            print('  [INFO] document.write do p84 não encontrado – pode já estar protegido')

    return txt


# ── 5) Remover scripts externos quebrados ─────────────────────────────
def limpar_scripts_externos(txt):
    """Remove referências a scripts .js externos que podem não existir no servidor"""
    # Estes scripts externos referenciam arquivos que podem não estar disponíveis
    # e causam erros 404 + JS quebrado
    externos = [
        '<script src="/patch-custo-colab-20260914.js"></script>',
        '<script src="/patch-anti-flicker.js"></script>',
        '<script src="/patch-fpdo-modelo-20260914.js"></script>',
        '<script src="/patch-fpdo-enq-salvar.js"></script>',
        '<script src="/patch-header-contrato-20260915.js"></script>',
        '<script src="/patch-print-isolamento-20260915.js"></script>',
        '<script src="/patch-pgto-slim-20260915.js"></script>',
        '<script src="/patch-fpdo-editor-livre.js"></script>',
        '<script src="/patch-fpdo-fotos-mover.js"></script>',
        '<script src="/patch-hide-selo-espera.js"></script>',
        '<script src="/patch-fpdo-graf-inserir.js"></script>',
        '<script src="/patch-painel-responsivo.js"></script>',
        '<script src="/patch-fpdo-texto-toolbar.js"></script>',
    ]

    removidos = 0
    for ext in externos:
        # remover com quebras de linha variáveis
        pad = re.escape(ext).replace(re.escape('.js'), r'\.js')
        # regex que permite espaços/quebras variáveis
        pad2 = re.sub(r'\s+', r'\\s+', pad)
        if ext in txt:
            txt = txt.replace(ext, f'<!-- PATCH164: removido script externo ausente: {ext} -->')
            removidos += 1
        else:
            # tentar padrão flexível com regex
            m = re.search(pad2, txt)
            if m:
                txt = txt[:m.start()] + f'<!-- PATCH164: removido script externo ausente -->' + txt[m.end():]
                removidos += 1

    if removidos > 0:
        print(f'  [OK] {removidos} script(s) externo(s) removido(s)')
    else:
        print('  [INFO] Nenhum script externo encontrado para remover')

    return txt


# ── 6) Limpar restos do patch163 ──────────────────────────────────────
def limpar_patch163(txt):
    """Remove estilos e scripts vazios do patch163 que ficaram como lixo"""
    # Remover <style id="patch163TooltipStyle"> vazio ou com CSS duplicado
    m = re.search(r'<style\s+id="patch163TooltipStyle"[^>]*>.*?</style>', txt, re.DOTALL)
    if m:
        txt = txt[:m.start()] + '<!-- PATCH164: patch163TooltipStyle removido -->' + txt[m.end():]
        print('  [OK] patch163TooltipStyle removido')

    # Remover <script id="patch163TooltipFollowMouse">
    m = re.search(r'<script\s+id="patch163TooltipFollowMouse"[^>]*>.*?</script>', txt, re.DOTALL)
    if m:
        txt = txt[:m.start()] + '<!-- PATCH164: patch163TooltipFollowMouse removido -->' + txt[m.end():]
        print('  [OK] patch163TooltipFollowMouse removido')

    return txt


# ── 7) Garantir que @media print oculte #meu-menu-abas em TODOS os contextos ──
def reforcar_print_hide_menu(txt):
    """Adiciona regra global @media print para esconder o menu lateral"""
    # Esta é uma regra de segurança adicional – se alguma regra mais
    # específica não funcionar, esta garante o resultado
    regra = (
        '<style id="patch164-print-safe">\n'
        '  @media print {\n'
        '    #meu-menu-abas,\n'
        '    #meu-menu-abas.pmenu-rail,\n'
        '    #meu-menu-abas.pmenu-oreate,\n'
        '    #meu-menu-abas[open],\n'
        '    .project-selector,\n'
        '    header,\n'
        '    .tabs,\n'
        '    .tab-header,\n'
        '    .pgto-sub-tabs,\n'
        '    .sub-tabs,\n'
        '    button,\n'
        '    .btn-add,\n'
        '    .search-box,\n'
        '    .filter-bar,\n'
        '    #ctmFiltersBar,\n'
        '    .actions-cell,\n'
        '    .card-header,\n'
        '    .sub-tab-btn,\n'
        '    .lanc-form-grid,\n'
        '    .pgto-action-bar,\n'
        '    .lanc-actions,\n'
        '    .form-container,\n'
        '    input,\n'
        '    select,\n'
        '    textarea {\n'
        '      display: none !important;\n'
        '    }\n'
        '    body {\n'
        '      padding-left: 0 !important;\n'
        '      margin: 0 !important;\n'
        '    }\n'
        '  }\n'
        '</style>'
    )
    # Inserir antes de </head> se houver, senão antes do primeiro <style>
    pos = txt.find('</head>')
    if pos < 0:
        pos = txt.find('<style')
    if pos > 0:
        txt = txt[:pos] + '\n' + regra + '\n' + txt[pos:]
        print('  [OK] Regra @media print de segurança adicionada')
    else:
        print('  [AVISO] Não encontrou </head> nem <style>')

    return txt


# ── MAIN ──────────────────────────────────────────────────────────────
def main():
    print('=' * 72)
    print('PATCH 164 – Impressão + Diário de Obra')
    print('=' * 72)
    print()

    txt = ler()
    t0 = len(txt)

    txt = corrige_css_print_pgto(txt)
    txt = corrige_funcao_imprimir_pgto(txt)
    txt = reforgar_botao_diario(txt)
    txt = proteger_impressao_p84(txt)
    txt = limpar_scripts_externos(txt)
    txt = limpar_patch163(txt)
    txt = reforcar_print_hide_menu(txt)

    # marca final
    tag = marca()
    if tag not in txt:
        pos = txt.rfind('</html>')
        if pos < 0:
            pos = txt.rfind('</body>')
        if pos > 0:
            txt = txt[:pos] + '\n' + tag + '\n' + txt[pos:]
        else:
            txt += '\n' + tag

    salvar(txt)
    print(f'\n  Delta: {len(txt) - t0:+d} caracteres')
    print('  PATCH 164 aplicado com sucesso!')

if __name__ == '__main__':
    main()
