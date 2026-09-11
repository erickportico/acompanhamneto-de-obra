# -*- coding: utf-8 -*-
"""
patch_relocate_header_buttons.py

Reorganiza o header do index.html:
  1) Move os 3 botões de utilidade (statusNuvem / Carregar Nuvem / Modo Claro)
     da .project-selector para dentro de .header-badges-right (abaixo dos badges)
  2) Remove o dropdown Configurações da .project-selector e o move para
     um container oculto (preserva IDs), e injeta botões de config
     no fundo da Gaveta Menu (#orMenu .or-painel innerHTML)
  3) Os launchers (Menu + Obras) permanecem intactos em #pToolbarAbas

USO: python patch_relocate_header_buttons.py
  (modifica index.html no mesmo diretório)
"""

import os
import shutil

ARQUIVO = 'index.html'
PATCH_MARKER = '/* === RELOCATE PATCH:'

def main():
    base = os.path.dirname(os.path.abspath(__file__))
    caminho = os.path.join(base, ARQUIVO)
    if not os.path.isfile(caminho):
        print(f'❌ {ARQUIVO} não encontrado em {base}')
        return

    # Backup
    bk = caminho + '.bak_relocate_v2'
    if not os.path.isfile(bk):
        shutil.copy2(caminho, bk)
        print(f'📋 Backup: {os.path.basename(bk)}')

    with open(caminho, 'r', encoding='utf-8', newline=None) as f:
        html = f.read()

    # Guarda contra execução dupla
    if PATCH_MARKER in html:
        print(f'⚠️ Patch já aplicado em {ARQUIVO} — pulando.')
        return

    # =================================================================
    # MARCADORES EXATOS (strings literais encontradas no HTML)
    # =================================================================

    # Bloco original dos 3 botões de utilidade na project-selector
    BOTOES_UTIL_ORIG = (
        '<span id="statusNuvem" style="padding:4px 8px; border-radius:6px; font-size:0.75rem; background:#5f6b7a; color:#fff;">☁️ Local</span>\n'
        '                <button class="secondary" onclick="carregarBancoDaNuvem()" title="Carregar dados da nuvem (Render.com)" style="margin-left:4px;font-size:0.75rem;">☁️ Carregar Nuvem</button>\n'
        '                <button class="secondary" onclick="alternarTema()" id="btnThemeToggle">☀️ Modo Claro</button>'
    )

    # Bloco original do settings-menu na project-selector
    SETTINGS_MENU_ORIG = (
        '<div class="settings-menu">\n'
        '                    <button type="button" class="secondary" onclick="toggleSettingsMenu()">⚙ Configurações</button>\n'
        '                    <div id="settingsMenu" class="settings-dropdown">\n'
        '                        <button class="secondary" onclick="exportarDados()">💾 Backup</button>\n'
        '                        <button class="secondary" onclick="document.getElementById(\'fileRestoreInput\').click()">📥 Restaurar</button>\n'
        '                        <button class="warning" onclick="abrirRecuperacaoDados()">🧿 Recuperar Dados Antigos</button>\n'
        '                        <button class="primary" onclick="abrirBancoCompartilhado()">🌐 Banco Compartilhado</button>\n'
        '                    </div>\n'
        '                </div>'
    )

    # Fechamento do header-badges-right (onde injetar utilities)
    HDR_BADGES_CLOSE = '\n</div>\n            </div>\n            <div class="project-selector">'

    # Linha or-lista no innerHTML do ORMENU (onde injetar config)
    ORLISTA_LINE = "'<div class=\"or-lista\" id=\"orLista\"></div>' +"

    # =================================================================
    # 1) CSS: Inserir estilos para .header-right-utilities e .or-config
    # =================================================================

    css_block = '''
/* === RELOCATE PATCH: utilities no header direito + config no ORMENU === */
.header-right-utilities {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 8px;
}
.header-right-utilities .secondary,
.header-right-utilities #statusNuvem {
    font-size: 0.72rem !important;
    padding: 4px 10px !important;
    border-radius: 8px !important;
}
.or-config {
    padding: 14px 14px 18px 14px !important;
    border-top: 1px solid rgba(255,255,255,.1);
    margin-top: auto;
}
.or-config-titulo {
    font: 700 10.5px/1 inherit;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #5d708f;
    padding: 0 2px 8px 2px;
}
.or-config-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}
.or-config-btn {
    display: flex !important;
    align-items: center;
    gap: 8px;
    width: 100% !important;
    padding: 9px 10px !important;
    font: 500 12.5px/1.25 inherit !important;
    text-align: left !important;
    color: #c3d1ea !important;
    background: transparent !important;
    border: 1px solid transparent !important;
    border-radius: 9px !important;
    cursor: pointer;
    transition: background .12s ease, color .12s ease;
}
.or-config-btn:hover {
    color: #fff !important;
    background: rgba(96,165,250,.12) !important;
}
.or-config-btn .or-cfg-ico {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    flex: 0 0 24px;
    font-size: 13px;
    background: rgba(255,255,255,.05);
    border-radius: 7px;
}
body:not(.dark-mode) .or-config { border-top-color: rgba(0,0,0,.08); }
body:not(.dark-mode) .or-config-titulo { color: #6b7280; }
body:not(.dark-mode) .or-config-btn { color: #374151 !important; }
body:not(.dark-mode) .or-config-btn:hover { color: #1e293b !important; background: rgba(37,99,235,.08) !important; }
@media(max-width:860px){
    .header-right-utilities { justify-content: flex-start; }
}
/* === FIM RELOCATE PATCH === */
'''

    # Inserir CSS antes do </style> logo após .project-selector {
    idx = html.find('.project-selector {')
    if idx < 0:
        print('❌ .project-selector { não encontrado no CSS')
        return
    idx_close = html.find('</style>', idx)
    if idx_close < 0:
        print('❌ </style> não encontrado após .project-selector')
        return
    html = html[:idx_close] + css_block + html[idx_close:]
    print('✅ CSS injetado')

    # =================================================================
    # 2) HTML: Inserir os 3 botões de utilidade dentro de
    #    .header-badges-right, antes do fechamento do div
    # =================================================================

    # Encontrar o fechamento de header-badges-right
    # O padrão é: </div>\n</div>\n            <div class="project-selector">
    # O primeiro </div> fecha header-badges-right
    idx_hbc = html.find(HDR_BADGES_CLOSE)
    if idx_hbc < 0:
        print('❌ Fechamento de header-badges-right não encontrado')
        return

    # Criar o div de utilities com os 3 botões dentro
    utilities_div = (
        '\n                    <div class="header-right-utilities">\n'
        '                        <span id="statusNuvem" style="padding:4px 8px; border-radius:6px; font-size:0.75rem; background:#5f6b7a; color:#fff;">☁️ Local</span>\n'
        '                        <button class="secondary" onclick="carregarBancoDaNuvem()" title="Carregar dados da nuvem (Render.com)" style="margin-left:4px;font-size:0.75rem;">☁️ Carregar Nuvem</button>\n'
        '                        <button class="secondary" onclick="alternarTema()" id="btnThemeToggle">☀️ Modo Claro</button>\n'
        '                    </div>'
    )

    # Inserir antes do </div> que fecha header-badges-right
    # O HDR_BADGES_CLOSE começa com \n</div> — o \n é whitespace, </div> é o fechamento
    # Vamos inserir ANTES desse \n</div>
    html = html[:idx_hbc] + utilities_div + html[idx_hbc:]
    print('✅ 3 botões de utilidade inseridos em .header-right-utilities')

    # =================================================================
    # 3) HTML: Remover os 3 botões originais da project-selector
    # =================================================================

    if BOTOES_UTIL_ORIG in html:
        html = html.replace(BOTOES_UTIL_ORIG, '')
        print('✅ 3 botões de utilidade removidos da .project-selector')
    else:
        print('⚠️ Bloco dos 3 botões não encontrado exatamente — tentando busca flexível')
        # Busca flexível linha a linha
        lines = html.split('\n')
        remove_indices = []
        for i, line in enumerate(lines):
            s = line.strip()
            if s.startswith('<span id="statusNuvem"'):
                remove_indices.append(i)
            elif 'carregarBancoDaNuvem()' in s and s.startswith('<button'):
                remove_indices.append(i)
            elif 'id="btnThemeToggle"' in s and 'alternarTema' in s:
                remove_indices.append(i)
        for i in sorted(remove_indices, reverse=True):
            lines.pop(i)
        html = '\n'.join(lines)
        if remove_indices:
            print(f'✅ {len(remove_indices)} linhas de botões removidas (busca flexível)')

    # =================================================================
    # 4) HTML: Mover settings-menu para container oculto + remover
    # =================================================================

    if SETTINGS_MENU_ORIG in html:
        # Inserir o settings-menu num container oculto antes de </body>
        hide_container = (
            '\n<!-- settings-menu original (IDs preservados) -->\n'
            '<div style="position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;">\n'
            + SETTINGS_MENU_ORIG + '\n'
            '</div>'
        )
        idx_body = html.rfind('</body>')
        if idx_body > 0:
            html = html[:idx_body] + hide_container + html[idx_body:]

        # Remover do project-selector
        html = html.replace(SETTINGS_MENU_ORIG, '')
        print('✅ Settings-menu movido para container oculto')
    else:
        print('⚠️ Bloco settings-menu não encontrado exatamente')

    # =================================================================
    # 5) JS: Inserir seção or-config no innerHTML do ORMENU
    #    (após a linha or-lista, antes do fechamento do or-painel)
    # =================================================================

    config_lines = (
        "        '<div class=\"or-config\">' +\n"
        "          '<div class=\"or-config-titulo\">Configurações</div>' +\n"
        "          '<div class=\"or-config-grid\">' +\n"
        "            '<button type=\"button\" class=\"or-config-btn\" id=\"orCfgBackup\"><span class=\"or-cfg-ico\">💾</span><span>Backup</span></button>' +\n"
        "            '<button type=\"button\" class=\"or-config-btn\" id=\"orCfgRestaurar\"><span class=\"or-cfg-ico\">📥</span><span>Restaurar</span></button>' +\n"
        "            '<button type=\"button\" class=\"or-config-btn\" id=\"orCfgRecuperar\"><span class=\"or-cfg-ico\">🧿</span><span>Recuperar Dados Antigos</span></button>' +\n"
        "            '<button type=\"button\" class=\"or-config-btn\" id=\"orCfgCompartilhado\"><span class=\"or-cfg-ico\">🌐</span><span>Banco Compartilhado</span></button>' +\n"
        "          '</div>' +\n"
        "        '</div>' +\n"
    )

    if ORLISTA_LINE in html:
        idx_orlista = html.find(ORLISTA_LINE)
        idx_eol = html.find('\n', idx_orlista)
        html = html[:idx_eol + 1] + config_lines + html[idx_eol + 1:]
        print('✅ Seção or-config injetada no innerHTML do ORMENU')
    else:
        print('⚠️ Linha or-lista não encontrada no innerHTML')

    # =================================================================
    # 6) JS: Inserir script de handlers + garantia antes de </body>
    # =================================================================

    guarantee_script = '''
<script>
/* === PATCH RELOCATE: handlers do or-config + garantia === */
(function(){
  'use strict';
  if(window.__patchRelocateV2)return;window.__patchRelocateV2=true;

  function ligarConfig(){
    var p=document.querySelector('#orMenu .or-painel');
    if(!p||!p.querySelector('.or-config'))return;
    var bk=document.getElementById('orCfgBackup');
    if(bk&&!bk._rl){bk._rl=1;bk.addEventListener('click',function(){
      if(typeof window.exportarDados==='function')window.exportarDados();
    });}
    var rs=document.getElementById('orCfgRestaurar');
    if(rs&&!rs._rl){rs._rl=1;rs.addEventListener('click',function(){
      var f=document.getElementById('fileRestoreInput');if(f)f.click();
    });}
    var rc=document.getElementById('orCfgRecuperar');
    if(rc&&!rc._rl){rc._rl=1;rc.addEventListener('click',function(){
      if(typeof window.abrirRecuperacaoDados==='function')window.abrirRecuperacaoDados();
    });}
    var cp=document.getElementById('orCfgCompartilhado');
    if(cp&&!cp._rl){cp._rl=1;cp.addEventListener('click',function(){
      if(typeof window.abrirBancoCompartilhado==='function')window.abrirBancoCompartilhado();
    });}
  }

  function garantirUtilities(){
    var ps=document.querySelector('.project-selector');
    var hr=document.querySelector('.header-right-utilities');
    if(!ps||!hr)return;
    var sn=document.getElementById('statusNuvem');
    var cn=hr.querySelector('button[onclick="carregarBancoDaNuvem()"]');
    var bt=document.getElementById('btnThemeToggle');
    if(sn&&sn.parentNode===ps)hr.appendChild(sn);
    if(bt&&bt.parentNode===ps)hr.appendChild(bt);
  }

  function garantirConfig(){
    var p=document.querySelector('#orMenu .or-painel');
    if(!p)return;
    if(p.querySelector('.or-config')){ligarConfig();return;}
    var sec=document.createElement('div');sec.className='or-config';
    sec.innerHTML='<div class="or-config-titulo">Configurações</div>'+
      '<div class="or-config-grid">'+
      '<button type="button" class="or-config-btn" id="orCfgBackup"><span class="or-cfg-ico">💾</span><span>Backup</span></button>'+
      '<button type="button" class="or-config-btn" id="orCfgRestaurar"><span class="or-cfg-ico">📥</span><span>Restaurar</span></button>'+
      '<button type="button" class="or-config-btn" id="orCfgRecuperar"><span class="or-cfg-ico">🧿</span><span>Recuperar Dados Antigos</span></button>'+
      '<button type="button" class="or-config-btn" id="orCfgCompartilhado"><span class="or-cfg-ico">🌐</span><span>Banco Compartilhado</span></button>'+
      '</div>';
    p.appendChild(sec);ligarConfig();
  }

  function vigiar(){
    if(typeof MutationObserver!=='function')return;
    var ps=document.querySelector('.project-selector');
    if(ps){new MutationObserver(function(){garantirUtilities();}).observe(ps,{childList:true});}
    var om=document.getElementById('orMenu');
    if(om){new MutationObserver(function(){garantirConfig();}).observe(om,{childList:true,subtree:true});}
  }

  function comecar(){ligarConfig();garantirUtilities();garantirConfig();setTimeout(vigiar,500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',comecar);
  else comecar();
  setTimeout(comecar,400);setTimeout(comecar,1200);
  setInterval(function(){garantirUtilities();garantirConfig();},5000);
})();
</script>
'''

    idx_body = html.rfind('</body>')
    if idx_body > 0:
        html = html[:idx_body] + guarantee_script + html[idx_body:]
        print('✅ Script de handlers + garantia injetado')

    # =================================================================
    # Salvar
    # =================================================================
    with open(caminho, 'w', encoding='utf-8', newline='') as f:
        f.write(html)

    print(f'\n✅ Patch aplicado com sucesso em {ARQUIVO}')
    print(f'📋 Backup em {os.path.basename(bk)}')
    print(f'\nPróximo passo: git add . && git commit -m "reorganiza header" && git push render main')


if __name__ == '__main__':
    main()
