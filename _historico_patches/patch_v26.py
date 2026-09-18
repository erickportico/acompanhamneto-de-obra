# -*- coding: utf-8 -*-
'''
PATCH V26 — Aba "Administracao" no menu drawer + ehAdmin() global

O que este patch faz:
  1. Expoe ehAdmin() globalmente (window.ehAdmin) corrigindo o erro de
     console "Uncaught ReferenceError: ehAdmin is not defined"
  2. Adiciona botao "Administracao" no menu drawer (somente visivel p/ admin)
  3. Adiciona div #tab-admin com interface completa:
     - Lista de usuarios cadastrados (local + Supabase)
     - Cadastro de novo usuario (local e nuvem)
     - Exclusao de usuario / troca de senha / troca de perfil
     - Permissoes de abas por usuario (checkboxes)
     - Configuracoes (modo exclusao, sinc Supabase, zona de perigo)
  4. Atualiza trocarAba() para incluir a aba 'admin'
  5. Atualiza a lista ABAS do PATCH103 para incluir 'admin'
  6. Esconde botoes p87Botao e p103Botao quando admin logado
     (funcionalidade migrada para a aba propria)

Uso:
  python patch_v26.py

Depois:
  git add index.html
  git commit -m "PATCH V26: aba Administracao + ehAdmin global"
  git push
'''

import re, os, shutil

CAMINHO = r"C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS\index.html"

def ler():
    with open(CAMINHO, "rb") as f:
        return f.read().decode("utf-8", errors="replace")

def gravar(txt):
    with open(CAMINHO, "wb") as f:
        f.write(txt.encode("utf-8"))

def aplicar():
    h = ler()

    # ========================================================================
    # 1. Corrigir ehAdmin() — boot script global ANTES do Supabase SDK
    # ========================================================================
    boot_ehAdmin = (
        '<script id="v26_ehAdmin_boot">'
        'if(typeof window.ehAdmin===\'undefined\'){'
        'window.ehAdmin=function(){'
        'try{'
        'var s=window.PainelNucleo?window.PainelNucleo.sessao():null;'
        'if(!s&&window.P128&&window.P128.estado&&window.P128.estado.perfil)'
        '{s={usuario:window.P128.estado.email,perfil:window.P128.estado.perfil};}'
        'if(!s)return false;'
        'return String(s.perfil||\'\').toLowerCase()===\'admin\';'
        '}catch(e){return false;}'
        '};}'
        '</script>'
    )

    marcador_supabase = '<!-- 1. Carrega o SDK do Supabase PRIMEIRO -->'
    if marcador_supabase in h and 'v26_ehAdmin_boot' not in h:
        h = h.replace(marcador_supabase, boot_ehAdmin + '\n    ' + marcador_supabase, 1)
        print("[OK] Boot ehAdmin inserido antes do SDK Supabase")
    elif 'v26_ehAdmin_boot' not in h:
        # Fallback: inserir no inicio do <head>
        h = h.replace('<head>', '<head>\n' + boot_ehAdmin, 1)
        print("[OK] Boot ehAdmin inserido no <head> (fallback)")
    else:
        print("[INFO] Boot ehAdmin ja existe")

    # ========================================================================
    # 2. Adicionar botao "Administracao" no menu drawer
    # ========================================================================
    padrao_btn_fpdo = re.compile(
        r'(<button\s+[^>]*id="btn-tab-fpdo"[^>]*>.*?</button>)',
        re.DOTALL
    )

    btn_admin = (
        '<button class="tab-btn" id="btn-tab-admin" '
        'style="display:none" '
        'onclick="trocarAba(\'admin\')">'
        '\U0001f527 Administra\u00e7\u00e3o</button>'
    )

    m = padrao_btn_fpdo.search(h)
    if m and 'btn-tab-admin' not in h:
        h = h[:m.end()] + '\n                        ' + btn_admin + h[m.end():]
        print("[OK] Botao Administracao adicionado no menu drawer")
    elif 'btn-tab-admin' not in h:
        print("[AVISO] Nao encontrei btn-tab-fpdo para posicionar o botao admin")
    else:
        print("[INFO] Botao admin ja existe")

    # ========================================================================
    # 3. Adicionar div #tab-admin com interface completa
    # ========================================================================
    tab_admin_html = r'''
            <!-- PATCH V26: Aba Administração -->
            <div id="tab-admin" class="card" style="display:none;">
                <h3 style="margin-top:0;color:var(--text,#fff);">\U0001f527 Administra\u00e7\u00e3o</h3>

                <!-- Sub-abas -->
                <div style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;">
                    <button class="v26-sbtn v26-sbtn-on" onclick="v26Sub('usuarios')" id="v26-s-usuarios">\U0001f465 Usu\u00e1rios</button>
                    <button class="v26-sbtn" onclick="v26Sub('permissoes')" id="v26-s-permissoes">\U0001f512 Permiss\u00f5es</button>
                    <button class="v26-sbtn" onclick="v26Sub('novo')" id="v26-s-novo">\u2795 Novo Usu\u00e1rio</button>
                    <button class="v26-sbtn" onclick="v26Sub('config')" id="v26-s-config">\u2699\ufe0f Config</button>
                </div>

                <!-- Sub: Usuarios -->
                <div id="v26-p-usuarios">
                    <div style="margin-bottom:10px;">
                        <button class="v26-btn v26-bp" onclick="v26Atualizar()">\U0001f504 Atualizar</button>
                        <button class="v26-btn" onclick="v26CSV()">\U0001f4e5 CSV</button>
                    </div>
                    <div id="v26-tbl" style="overflow-x:auto;"></div>
                    <div id="v26-info" style="margin-top:10px;font-size:12px;color:#64748b;"></div>
                </div>

                <!-- Sub: Permissoes -->
                <div id="v26-p-permissoes" style="display:none;">
                    <p style="font-size:13px;color:#64748b;margin:0 0 12px;">Marque as abas que cada pessoa pode abrir. Admins veem tudo.</p>
                    <div style="margin-bottom:12px;">
                        <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;display:block;margin-bottom:3px;">Pessoa</label>
                        <select id="v26-pqu" onchange="v26PermDraw()" style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;font-size:13px;min-width:260px;"></select>
                    </div>
                    <div id="v26-pgrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px;"></div>
                    <div id="v26-pinfo" style="margin-top:12px;"></div>
                    <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="v26-btn v26-bp" onclick="v26PermSave()">\U0001f4be Salvar</button>
                        <button class="v26-btn" onclick="v26PermAll()">\u2705 Todas</button>
                        <button class="v26-btn" onclick="v26PermNone()">\u274c Nenhuma</button>
                        <button class="v26-btn" onclick="v26PermReset()">\U0001f513 Liberar tudo</button>
                    </div>
                </div>

                <!-- Sub: Novo -->
                <div id="v26-p-novo" style="display:none;">
                    <div style="max-width:480px;">
                        <div style="margin-bottom:12px;">
                            <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;display:block;margin-bottom:3px;">E-mail / Usu\u00e1rio</label>
                            <input type="text" id="v26-ne" placeholder="email@exemplo.com" style="width:100%;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;">
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;display:block;margin-bottom:3px;">Nome completo</label>
                            <input type="text" id="v26-nn" placeholder="Nome da pessoa" style="width:100%;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;">
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;display:block;margin-bottom:3px;">Tipo de acesso</label>
                            <select id="v26-np" style="width:100%;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;">
                                <option value="visitante">Somente consulta</option>
                                <option value="editor">Editor (lan\u00e7a e edita)</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;display:block;margin-bottom:3px;">Senha (m\u00ednimo 6 caracteres para nuvem)</label>
                            <input type="password" id="v26-ns" placeholder="Senha" style="width:100%;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;">
                        </div>
                        <div id="v26-nerro" style="min-height:18px;font-size:12px;color:#b91c1c;"></div>
                        <div style="margin-top:10px;display:flex;gap:8px;">
                            <button class="v26-btn v26-bp" onclick="v26CadLocal()">\u2795 Cadastrar local</button>
                            <button class="v26-btn" onclick="v26CadNuvem()">\u2601\ufe0f Cadastrar na nuvem</button>
                        </div>
                    </div>
                </div>

                <!-- Sub: Config -->
                <div id="v26-p-config" style="display:none;">
                    <div style="max-width:560px;">
                        <h4 style="margin:0 0 6px;font-size:13px;color:#0f172a;">Regra de exclus\u00e3o</h4>
                        <p style="margin:0 0 10px;font-size:12px;color:#64748b;">Quando permitir apagar registros</p>
                        <select id="v26-cmodo" style="width:100%;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:12px;">
                            <option value="fora">No servidor o admin apaga direto; de outro computador exige senha</option>
                            <option value="sempre">Sempre pedir a senha do administrador</option>
                            <option value="bloqueado">Somente no servidor (de fora, n\u00e3o apaga nem com senha)</option>
                        </select>
                        <div id="v26-csrv" style="font-size:12px;color:#64748b;margin-bottom:14px;"></div>
                        <button class="v26-btn v26-bp" onclick="v26CfgSave()">\U0001f4be Salvar</button>

                        <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0 14px;">
                        <h4 style="margin:0 0 6px;font-size:13px;color:#0f172a;">Sincroniza\u00e7\u00e3o Supabase</h4>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                            <button class="v26-btn" onclick="v26Sync()">\U0001f504 Sincronizar</button>
                            <button class="v26-btn" onclick="v26SyncForce()">\U0001f4e5 For\u00e7ar recarga</button>
                        </div>
                        <div id="v26-sync" style="font-size:12px;color:#64748b;"></div>

                        <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0 14px;">
                        <h4 style="margin:0 0 6px;font-size:13px;color:#dc2626;">Zona de perigo</h4>
                        <button class="v26-btn v26-bd" onclick="v26Reset()">\U0001f4a3 Resetar todos os usu\u00e1rios</button>
                        <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">Remove todos os cadastros locais. Emerg\u00eancia somente.</p>
                    </div>
                </div>
            </div>
            <!-- FIM PATCH V26 -->
'''

    marcador_modais = '<!-- MODAIS -->'
    if 'id="tab-admin"' not in h:
        h = h.replace(marcador_modais, tab_admin_html + '\n            ' + marcador_modais, 1)
        print("[OK] Div #tab-admin adicionada")
    else:
        print("[INFO] Div #tab-admin ja existe")

    # ========================================================================
    # 4. Atualizar trocarAba() para incluir 'admin'
    # ========================================================================
    padrao_trocar = re.compile(
        r"const abas = \['itens',\s*'liberacao',\s*'medicoes',\s*'graficos',\s*'recebimento',\s*'cronograma',\s*'pagamento',\s*'ctm',\s*'custo'\];"
    )
    trocar_novo = "const abas = ['itens','liberacao','medicoes','graficos','recebimento','cronograma','pagamento','ctm','custo','admin'];"

    if padrao_trocar.search(h):
        h = padrao_trocar.sub(trocar_novo, h, count=1)
        print("[OK] trocarAba() atualizado com aba 'admin'")
    else:
        # Tentar versao com espacamento diferente
        padrao_trocar2 = re.compile(
            r"const\s+abas\s*=\s*\[\s*'itens'[^\]]*?'custo'\s*\]\s*;"
        )
        m2 = padrao_trocar2.search(h)
        if m2:
            trecho = m2.group(0)
            trecho_novo = trecho.replace(
                "'custo'",  "'custo','admin'"
            )
            h = h[:m2.start()] + trecho_novo + h[m2.end():]
            print("[OK] trocarAba() atualizado (fallback regex)")
        else:
            print("[AVISO] Lista de abas em trocarAba() nao encontrada")

    # ========================================================================
    # 5. Adicionar handler init da aba admin no trocarAba
    # ========================================================================
    padrao_init_custo = re.compile(
        r"if\s*\(\s*aba\s*===\s*'custo'\s*\)\s*\{\s*initCustoTab\(\)\s*\;?\s*\}"
    )

    m = padrao_init_custo.search(h)
    if m and "aba === 'admin'" not in h:
        trecho_original = m.group(0)
        trecho_novo = (
            trecho_original +
            " if(aba==='admin'){"
            "if(typeof window.v26Atualizar==='function')window.v26Atualizar();"
            "if(typeof window.v26PermDraw==='function')window.v26PermDraw();"
            "if(typeof window.v26CfgShow==='function')window.v26CfgShow();}"
        )
        h = h[:m.start()] + trecho_novo + h[m.end():]
        print("[OK] trocarAba() ganhou handler da aba admin")
    else:
        print("[INFO] Handler da aba admin ja existe ou initCustoTab nao encontrado")

    # ========================================================================
    # 6. Atualizar ABAS do PATCH103 para incluir 'admin'
    # ========================================================================
    # Procurar pelo array ABAS que lista {id: 'fpdo', ...} e adicionar admin
    padrao_abas_p103 = re.compile(
        r"(\{\s*id:\s*'fpdo'[^}]*?nome:\s*'Relat\u00f3rio FPDO'[^}]*?\})"
    )

    m = padrao_abas_p103.search(h)
    if m and "id:'admin'" not in h[m.start():m.start()+5000]:
        # Encontrar o fechamento do array apos esse item
        # Buscar o ]; mais proximo apos o match
        pos_fim = h.find('];', m.end())
        if pos_fim > 0:
            trecho_inserir = ",{id:'admin',nome:'Administracao'}"
            h = h[:pos_fim] + trecho_inserir + h[pos_fim:]
            print("[OK] ABAS do PATCH103 atualizado com 'admin'")
    else:
        print("[INFO] ABAS ja contem admin ou padrao nao encontrado")

    # ========================================================================
    # 7. Inserir CSS + JS completo antes de </body>
    # ========================================================================
    css_v26 = '''<style id="v26Css">
.v26-sbtn{border:1px solid #cbd5e1;background:#f1f5f9;color:#16304f;padding:7px 13px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;}
.v26-sbtn:hover{background:#e2e8f0;}
.v26-sbtn.v26-sbtn-on{background:#2563eb;color:#fff;border-color:#2563eb;}
body.dark-mode .v26-sbtn{background:#16203a;color:#e8eefc;border-color:rgba(255,255,255,.16);}
body.dark-mode .v26-sbtn:hover{background:#1e2b4d;}
body.dark-mode .v26-sbtn.v26-sbtn-on{background:#1d4ed8;color:#fff;border-color:#1d4ed8;}
.v26-btn{border:1px solid #cbd5e1;border-radius:8px;background:#f1f5f9;color:#16304f;padding:8px 13px;font-size:13px;font-weight:600;cursor:pointer;}
.v26-btn:hover{background:#e2e8f0;}
.v26-bp{background:#2563eb;border-color:#2563eb;color:#fff;}
.v26-bp:hover{background:#1d4ed8;}
.v26-bd{background:#fee2e2;border-color:#fca5a5;color:#b91c1c;}
.v26-bd:hover{background:#fecaca;}
body.dark-mode .v26-btn{background:#16203a;color:#e8eefc;border-color:rgba(255,255,255,.16);}
body.dark-mode .v26-btn:hover{background:#1e2b4d;}
body.dark-mode .v26-bp{background:#1d4ed8;color:#fff;border-color:#1d4ed8;}
body.dark-mode .v26-bd{background:#2d1515;border-color:#7f1d1d;color:#fca5a5;}
.v26-tbl{width:100%;border-collapse:collapse;font-size:13px;}
.v26-tbl th{background:#1e293b;color:#fff;padding:9px 11px;text-align:left;font-size:12px;font-weight:600;white-space:nowrap;}
.v26-tbl td{padding:8px 11px;border-bottom:1px solid #e2e8f0;vertical-align:middle;}
body.dark-mode .v26-tbl td{border-color:#334155;}
.v26-tbl tr:hover td{background:#f8fafc;}
body.dark-mode .v26-tbl tr:hover td{background:#111c33;}
.v26-tag{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;}
.v26-ta{background:#dcfce7;color:#166534;}
.v26-te{background:#dbeafe;color:#1e40af;}
.v26-tv{background:#fef3c7;color:#92400e;}
.v26-to{background:#fee2e2;color:#991b1b;}
body.dark-mode .v26-ta{background:#064e3b;color:#6ee7b7;}
body.dark-mode .v26-te{background:#1e3a5f;color:#93c5fd;}
body.dark-mode .v26-tv{background:#3b2508;color:#fcd34d;}
body.dark-mode .v26-to{background:#3b1010;color:#fca5a5;}
.v26-m{padding:5px 9px;font-size:11px;border-radius:6px;cursor:pointer;border:1px solid #cbd5e1;background:#f1f5f9;color:#16304f;font-weight:600;}
.v26-m:hover{background:#e2e8f0;}
.v26-md{background:#fee2e2;color:#b91c1c;border-color:#fca5a5;}
.v26-md:hover{background:#fecaca;}
body.dark-mode .v26-m{background:#16203a;color:#e8eefc;border-color:rgba(255,255,255,.16);}
body.dark-mode .v26-md{background:#2d1515;color:#fca5a5;border-color:#7f1d1d;}
.v26-pi{display:flex;align-items:center;gap:9px;border:1px solid #e2e8f0;border-radius:10px;padding:9px 11px;background:#f8fafc;font-size:13px;color:#1e293b;cursor:pointer;}
.v26-pi:hover{border-color:#93c5fd;}
.v26-pi.v26-on{background:#eff6ff;border-color:#bfdbfe;}
.v26-pi input{width:17px;height:17px;flex:0 0 auto;cursor:pointer;}
body.dark-mode .v26-pi{background:#111c33;border-color:#334155;color:#e2e8f0;}
body.dark-mode .v26-pi.v26-on{background:#12233d;border-color:#1d4ed8;}
</style>
'''

    js_v26 = '''<script id="v26Js">
(function(){
'use strict';
if(window.__v26)return;window.__v26=1;

var KU=window.PainelNucleo.K_USERS,KS=window.PainelNucleo.K_SESS;
var KP='painel_seg_perm_v1',KC='painel_seg_config_v1';

var ABAS=[
{id:'itens',nome:'Painel Geral'},
{id:'liberacao',nome:'Avanco de Liberacao'},
{id:'medicoes',nome:'Boletim de Medicao'},
{id:'graficos',nome:'Graficos'},
{id:'recebimento',nome:'Recebimento'},
{id:'cronograma',nome:'Gestao de Obra'},
{id:'pagamento',nome:'Pagamento'},
{id:'ctm',nome:'Contramarco'},
{id:'custo',nome:'Centro de Custos'},
{id:'fpdo',nome:'FPDO'},
{id:'admin',nome:'Administracao'}
];

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function lr(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}}
function sv(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}
function sessao(){return window.PainelNucleo.sessao();}
function hash(u,s){return window.PainelNucleo.hashSenha(u,s);}
function nPerf(p){return window.PainelNucleo.nomePerfil(p);}
function isAdm(p){return String(p||'').toLowerCase()==='admin';}

function usersLocais(){
  var u=lr(KU,[]);
  if(!u||!u.length){u=[{usuario:'admin',nome:'Administrador',perfil:'admin',hash:hash('admin','admin123'),trocar:true}];sv(KU,u);}
  return u;
}

function listaNuvem(){
  try{return window.__p87ListaSupabase||window.__p87ListaSupabase||[];}catch(e){return [];}
}

function todasPessoas(){
  var loc=usersLocais(),rem=listaNuvem(),saida=[],vis={},i;
  for(i=0;i<loc.length;i++){
    var u=loc[i]||{},k=String(u.usuario||'').trim().toLowerCase();
    if(!k||vis[k])continue;vis[k]=1;
    saida.push({usuario:u.usuario,nome:u.nome||u.usuario,perfil:u.perfil||'visitante',origem:'local',id:u.id||null});
  }
  for(i=0;i<rem.length;i++){
    var r=rem[i]||{},rU=r.usuario||r.email||'',kr=String(rU).trim().toLowerCase();
    if(!kr||vis[kr])continue;vis[kr]=1;
    saida.push({usuario:rU,nome:r.nome||rU,perfil:r.perfil||'visitante',origem:'nuvem',id:r.id||null,ativo:r.ativo!==false});
  }
  var s=sessao();
  if(s&&String(s.usuario||'').trim().toLowerCase()&&!vis[String(s.usuario).trim().toLowerCase()]){
    saida.push({usuario:s.usuario,nome:s.nome||s.usuario,perfil:s.perfil||'visitante',origem:'sessao'});
  }
  saida.sort(function(a,b){return String(a.nome||'').toLowerCase()<String(b.nome||'').toLowerCase()?-1:1;});
  return saida;
}

function qtdAdmin(lista){var n=0,i;for(i=0;i<lista.length;i++){if(isAdm(lista[i].perfil))n++;}return n;}

function pMapa(){var m=lr(KP,null);if(!m||typeof m!=='object')m={};return m;}
function pChave(u){return String(u||'').trim().toLowerCase();}

function pLiberadas(usuario,perfil){
  if(isAdm(perfil))return ABAS.map(function(a){return a.id;});
  var m=pMapa(),v=m[pChave(usuario)];
  if(!v||!v.length)return ABAS.map(function(a){return a.id;});
  var saida=[],i;for(i=0;i<v.length;i++){if(ABAS.some(function(a){return a.id===v[i];}))saida.push(v[i]);}
  return saida.length?saida:ABAS.map(function(a){return a.id;});
}

/* ---- sub-abas ---- */
window.v26Sub=function(nome){
  ['usuarios','permissoes','novo','config'].forEach(function(n){
    var p=document.getElementById('v26-p-'+n),b=document.getElementById('v26-s-'+n);
    if(p)p.style.display=(n===nome)?'':'none';
    if(b){if(n===nome)b.classList.add('v26-sbtn-on');else b.classList.remove('v26-sbtn-on');}
  });
  if(nome==='usuarios')v26Atualizar();
  if(nome==='permissoes')v26PermDraw();
  if(nome==='config')v26CfgShow();
};

/* ---- tabela ---- */
window.v26Atualizar=function(){
  var div=document.getElementById('v26-tbl');if(!div)return;
  var lista=todasPessoas();
  var h='<table class="v26-tbl"><thead><tr>'+
    '<th>Usuario</th><th>Nome</th><th>Tipo</th><th>Origem</th><th>Acoes</th>'+
    '</tr></thead><tbody>';
  if(!lista.length){h+='<tr><td colspan="5" style="text-align:center;color:#94a3b8;">Nenhum usuario</td></tr>';}
  else{lista.forEach(function(u){
    var tc='v26-tv';if(isAdm(u.perfil))tc='v26-ta';else if(String(u.perfil||'').toLowerCase()==='editor')tc='v26-te';
    var og=u.origem==='nuvem'?'\u2601 Nuvem':'\U0001f4bb Local';
    var at=u.ativo===false?'<span class="v26-tag v26-to">Inativo</span>':'';
    h+='<tr><td>'+esc(u.usuario)+'</td><td>'+esc(u.nome||u.usuario)+'</td>'+
      '<td><span class="v26-tag '+tc+'">'+esc(nPerf(u.perfil))+'</span>'+at+'</td>'+
      '<td style="font-size:12px;">'+og+'</td>'+
      '<td style="white-space:nowrap;">';
    if(u.origem==='local'){
      h+='<button class="v26-m" onclick="v26Senha(\''+esc(u.usuario)+'\')" title="Trocar senha">\U0001f511</button>';
      h+='<button class="v26-m v26-md" onclick="v26Excluir(\''+esc(u.usuario)+'\')" title="Excluir">\U0001f5d1</button>';
    }else if(u.origem==='nuvem'&&u.id){
      h+='<button class="v26-m" onclick="v26PerfilNuvem(\''+esc(u.id)+'\',\''+esc(u.email||u.usuario)+'\')" title="Mudar tipo">\U0001f511</button>';
    }
    h+='</td></tr>';});}
  h+='</tbody></table>';div.innerHTML=h;
  var info=document.getElementById('v26-info');
  if(info)info.textContent=lista.length+' usuario(s). '+lista.filter(function(u){return u.origem==='nuvem';}).length+' nuvem, '+lista.filter(function(u){return u.origem==='local';}).length+' local.';
};

/* ---- trocar senha ---- */
window.v26Senha=function(usuario){
  var s=window.prompt('Nova senha para '+usuario+' (minimo 4):','');
  if(s==null)return;if(String(s).length<4){alert('Senha muito curta.');return;}
  var lista=usersLocais(),i;
  for(i=0;i<lista.length;i++){
    if(String(lista[i].usuario).toLowerCase()===String(usuario).toLowerCase()){
      lista[i].hash=hash(lista[i].usuario,String(s));lista[i].trocar=true;
      sv(KU,lista);alert('Senha trocada.');v26Atualizar();return;
    }
  }
  alert('Usuario nao encontrado.');
};

/* ---- excluir ---- */
window.v26Excluir=function(usuario){
  var lista=usersLocais(),alvo=null,idx=-1,i;
  for(i=0;i<lista.length;i++){if(String(lista[i].usuario).toLowerCase()===String(usuario).toLowerCase()){alvo=lista[i];idx=i;break;}}
  if(!alvo){alert('Nao encontrado.');return;}
  if(isAdm(alvo.perfil)&&qtdAdmin(lista)<=1){alert('Unico administrador, nao pode excluir.');return;}
  if(!window.confirm('Excluir '+alvo.nome+'?'))return;
  lista.splice(idx,1);sv(KU,lista);v26Atualizar();
};

/* ---- perfil nuvem ---- */
window.v26PerfilNuvem=function(id,email){
  var escolha=window.prompt('Tipo de acesso para '+email+'\nDigite: visitante, editor ou admin','');
  if(!escolha)return;escolha=String(escolha).trim().toLowerCase();
  if(['visitante','editor','admin'].indexOf(escolha)<0){alert('Invalido. Use: visitante, editor ou admin.');return;}
  if(typeof _supabase==='undefined'||!_supabase){alert('Supabase indisponivel.');return;}
  _supabase.from('painel_perfis').update({perfil:escolha}).eq('id',id).then(function(r){
    if(r.error){alert('Erro: '+r.error.message);return;}
    alert('Perfil alterado.');v26SyncForce();v26Atualizar();
  }).catch(function(e){alert('Erro: '+String(e));});
};

/* ---- permissoes ---- */
window.v26PermDraw=function(){
  var sel=document.getElementById('v26-pqu');if(!sel)return;
  var lista=todasPessoas();
  if(!lista.length){sel.innerHTML='<option>Sem usuarios</option>';return;}
  var escolhido=sel.value;sel.innerHTML='';
  lista.forEach(function(u){
    var k=pChave(u.usuario);
    sel.innerHTML+='<option value="'+esc(k)+'">'+esc(u.nome||u.usuario)+' ('+esc(u.usuario)+') - '+esc(nPerf(u.perfil))+'</option>';
  });
  if(escolhido)sel.value=escolhido;
  v26PermChecks();
};

window.v26PermChecks=function(){
  var sel=document.getElementById('v26-pqu'),grade=document.getElementById('v26-pgrid'),info=document.getElementById('v26-pinfo');
  if(!sel||!grade)return;
  var lista=todasPessoas(),u=null,i;
  for(i=0;i<lista.length;i++){if(pChave(lista[i].usuario)===pChave(sel.value)){u=lista[i];break;}}
  if(!u&&lista.length){u=lista[0];sel.value=pChave(u.usuario);}
  if(!u){grade.innerHTML='';if(info)info.innerHTML='';return;}
  if(isAdm(u.perfil)){grade.innerHTML='';if(info)info.innerHTML='<div style="padding:10px 12px;border-radius:8px;background:#fef3c7;border:1px solid #fcd34d;color:#78350f;font-size:12px;"><b>'+esc(u.nome||u.usuario)+'</b> e admin e ve tudo sempre.</div>';return;}
  var lib=pLiberadas(u.usuario,u.perfil),m=pMapa(),cfg=!!(m[pChave(u.usuario)]&&m[pChave(u.usuario)].length);
  if(info)info.innerHTML='<div style="font-size:12px;color:#475569;">'+(cfg?'Ve <b>'+lib.length+'</b> de <b>'+ABAS.length+'</b> abas.':'Sem limite: ve todas as abas.')+'</div>';
  var h='';ABAS.forEach(function(a){var on=lib.indexOf(a.id)>=0;
    h+='<label class="v26-pi'+(on?' v26-on':'')+'" data-a="'+esc(a.id)+'"><input type="checkbox"'+(on?' checked':'')+' onchange="v26Tgl(this,\''+esc(a.id)+'\')">'+esc(a.nome)+'</label>';
  });grade.innerHTML=h;
};

window.v26Tgl=function(el,aba){el.closest('.v26-pi').classList.toggle('v26-on',el.checked);};

window.v26PermSave=function(){
  var sel=document.getElementById('v26-pqu');if(!sel)return;
  var quem=pChave(sel.value);if(!quem){alert('Selecione alguem.');return;}
  var cbs=document.querySelectorAll('#v26-pgrid .v26-pi input[type=checkbox]');
  var vals=[];cbs.forEach(function(c){if(c.checked)vals.push(c.closest('[data-a]').getAttribute('data-a'));});
  var m=pMapa();m[quem]=vals;sv(KP,m);
  try{if(window.PainelPermissoes&&window.PainelPermissoes.aplicar)window.PainelPermissoes.aplicar(true);}catch(e){}
  alert('Permissoes salvas.');
};

window.v26PermAll=function(){document.querySelectorAll('#v26-pgrid input[type=checkbox]').forEach(function(c){c.checked=true;c.closest('.v26-pi').classList.add('v26-on');});};
window.v26PermNone=function(){document.querySelectorAll('#v26-pgrid input[type=checkbox]').forEach(function(c){c.checked=false;c.closest('.v26-pi').classList.remove('v26-on');});};
window.v26PermReset=function(){sv(KP,{});alert('Todas as permissoes liberadas.');v26PermChecks();};

/* ---- cadastro local ---- */
window.v26CadLocal=function(){
  var email=document.getElementById('v26-ne').value.trim(),nome=document.getElementById('v26-nn').value.trim();
  var perfil=document.getElementById('v26-np').value,senha=document.getElementById('v26-ns').value;
  var erro=document.getElementById('v26-nerro');
  if(!email){if(erro)erro.textContent='Informe o e-mail / usuario.';return;}
  if(senha.length<4){if(erro)erro.textContent='Senha minimo 4 caracteres.';return;}
  var lista=usersLocais(),i;for(i=0;i<lista.length;i++){if(String(lista[i].usuario).toLowerCase()===email.toLowerCase()){if(erro)erro.textContent='Ja existe.';return;}}
  lista.push({usuario:email.toLowerCase(),nome:nome||email,perfil:perfil,hash:hash(email.toLowerCase(),senha),trocar:true});
  sv(KU,lista);if(erro)erro.textContent='';
  document.getElementById('v26-ne').value='';document.getElementById('v26-nn').value='';document.getElementById('v26-ns').value='';
  alert('Cadastrado localmente.');v26Sub('usuarios');
};

/* ---- cadastro nuvem ---- */
window.v26CadNuvem=function(){
  var email=document.getElementById('v26-ne').value.trim(),nome=document.getElementById('v26-nn').value.trim();
  var perfil=document.getElementById('v26-np').value,senha=document.getElementById('v26-ns').value;
  var erro=document.getElementById('v26-nerro');
  if(!email||email.indexOf('@')<1){if(erro)erro.textContent='E-mail invalido.';return;}
  if(senha.length<6){if(erro)erro.textContent='Senha minimo 6 para nuvem.';return;}
  if(typeof _supabase==='undefined'||!_supabase){if(erro)erro.textContent='Supabase indisponivel.';return;}
  var s=sessao();
  if(s&&s.email){if(erro)erro.textContent='Logado como '+s.email+'. Peca para a pessoa se cadastrar no login.';return;}
  erro.textContent='Cadastrando...';
  _supabase.auth.signUp({email:email.toLowerCase(),password:senha,options:{data:{nome:nome,usuario:email.toLowerCase()}}}).then(function(r){
    if(r.error){if(erro)erro.textContent='Erro: '+r.error.message;return;}
    alert('Conta criada na nuvem. Perfil comeca como visitante.');
    try{if(r.data&&r.data.session)_supabase.auth.signOut();}catch(e){}
    if(erro)erro.textContent='';v26Sub('usuarios');
  }).catch(function(e){if(erro)erro.textContent='Erro: '+String(e);});
};

/* ---- CSV ---- */
window.v26CSV=function(){
  var lista=todasPessoas(),linhas=['Usuario,Nome,Perfil,Origem'];
  lista.forEach(function(u){linhas.push('"'+u.usuario+'","'+(u.nome||'')+'","'+u.perfil+'","'+u.origem+'"');});
  var b=new Blob([linhas.join('\n')],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='usuarios.csv';a.click();
};

/* ---- config ---- */
window.v26CfgShow=function(){
  var c=lr(KC,{modo:'fora'}),sel=document.getElementById('v26-cmodo');
  if(sel)sel.value=c.modo||'fora';
  var inf=document.getElementById('v26-csrv');
  if(inf){var hn=String(location.hostname||'').toLowerCase();
    var noSrv=(location.protocol==='file:')||(hn===''||hn==='localhost'||hn==='127.0.0.1');
    inf.textContent='Este computador '+(noSrv?'E o servidor.':'esta acessando pela rede.');}
};

window.v26CfgSave=function(){
  var sel=document.getElementById('v26-cmodo');if(!sel)return;
  var c=lr(KC,{modo:'fora'});c.modo=sel.value;sv(KC,c);alert('Configuracoes salvas.');
};

/* ---- sync ---- */
window.v26Sync=function(){
  var d=document.getElementById('v26-sync');if(d)d.textContent='Sincronizando...';
  try{if(window.P87&&typeof window.P87.sincronizar==='function'){window.P87.sincronizar();if(d)d.textContent='Sinc iniciada.';return;}}catch(e){}
  try{if(typeof _supabase!=='undefined'&&_supabase){
    _supabase.from('painel_perfis').select('*').then(function(r){
      if(r.error){if(d)d.textContent='Erro: '+r.error.message;return;}
      window.__p87ListaSupabase=r.data||[];if(d)d.textContent='Nuvem recarregada ('+r.data.length+').';v26Atualizar();
    }).catch(function(e){if(d)d.textContent='Erro: '+String(e);});return;
  }}catch(e2){}
  if(d)d.textContent='Supabase indisponivel.';
};

window.v26SyncForce=function(){window.__p87ListaSupabase=null;v26Sync();};

/* ---- reset ---- */
window.v26Reset=function(){
  if(!window.confirm('ATENCAO: Apaga TODOS os usuarios locais. Reinicia para admin/admin123. Tem certeza?'))return;
  try{localStorage.removeItem(KU);}catch(e){}
  try{localStorage.removeItem(KS);}catch(e){}
  try{sessionStorage.removeItem(KS);}catch(e){}
  try{localStorage.removeItem(KP);}catch(e){}
  alert('Resetado. Recarregue a pagina.');
};

/* ---- visibilidade so p/ admin ---- */
function atualVis(){
  var btn=document.getElementById('btn-tab-admin');if(!btn)return;
  var adm=false;
  try{adm=typeof window.ehAdmin==='function'?window.ehAdmin():false;}catch(e){}
  try{if(!adm&&window.PainelNucleo&&typeof window.PainelNucleo.ehAdmin==='function')adm=window.PainelNucleo.ehAdmin();}catch(e2){}
  try{if(!adm){var s=window.PainelNucleo?window.PainelNucleo.sessao():null;if(s&&String(s.perfil||'').toLowerCase()==='admin')adm=true;}}catch(e3){}
  try{if(!adm&&window.P128&&window.P128.estado&&window.P128.estado.perfil){adm=String(window.P128.estado.perfil||'').toLowerCase()==='admin';}}catch(e4){}
  btn.style.display=adm?'':'none';
  /* esconder botoes p87 e p103 se admin */
  if(adm){var b87=document.getElementById('p87Botao'),b103=document.getElementById('p103Botao');if(b87)b87.style.display='none';if(b103)b103.style.display='none';}
}

function init(){
  atualVis();
  setInterval(atualVis,2000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
setTimeout(init,1500);

/* carregar lista Supabase */
try{if(typeof _supabase!=='undefined'&&_supabase){
  _supabase.from('painel_perfis').select('*').then(function(r){
    if(!r.error&&r.data)window.__p87ListaSupabase=r.data;
  }).catch(function(){});
}}catch(e){}

})();
</script>
'''

    v26_inject = '\n<!-- PATCH V26 INI -->\n' + css_v26 + js_v26 + '\n<!-- PATCH V26 FIM -->\n'

    if 'v26Js' not in h:
        h = h.replace('</body>', v26_inject + '</body>', 1)
        print("[OK] CSS+JS V26 adicionado antes de </body>")
    else:
        print("[INFO] CSS+JS V26 ja existe")

    # ========================================================================
    # Salvar
    # ========================================================================
    gravar(h)
    print()
    print("[PATCH V26] Aplicado com sucesso!")
    print()
    print("Comandos git:")
    print("  git add index.html")
    print('  git commit -m "PATCH V26: aba Administracao + ehAdmin global"')
    print("  git push")

if __name__ == '__main__':
    aplicar()
