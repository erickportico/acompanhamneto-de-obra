#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PATCH 171 - Restaura a opcao \"Outros\" no cadastro de colaborador
================================================================
No modal Novo/Editar Colaborador, os campos FUNCAO e EMPRESA voltam a ter
uma opcao \"Outros (digitar)...\". Ao escolher, aparece um campo de texto
para criar na hora uma funcao ou empresa que ainda nao existe na lista.

Como funciona (sem quebrar nada do que ja existe):
  * Adiciona a opcao \"Outros\" nos dois selects (via JS, sem mexer no HTML).
  * Mostra/esconde o campo de texto conforme a selecao.
  * Ao salvar, o valor digitado e gravado no colaborador.
  * Ao editar, se a funcao/empresa salva nao estiver na lista padrao,
    o campo ja abre em \"Outros\" com o texto preenchido.

Observacao importante sobre FUNCAO:
  O pagamento de producao separa a equipe em Profissional x Ajudante.
  Um colaborador com funcao personalizada (ex.: \"Encarregado\") fica salvo
  com esse nome, mas NAO entra automaticamente nas listas de Profissional
  ou Ajudante do pagamento. Se precisar que ele apareca no pagamento,
  cadastre como Profissional ou Ajudante.

Este patch NAO entrega HTML pronto: apenas insere um <script> pontual antes
do </body>, preservando todo o resto do seu arquivo. Idempotente.

Uso:
    python gerar_patch171_outros_colaborador.py
(ou:  python gerar_patch171_outros_colaborador.py caminho\\index.html)
"""

import sys
import os
import datetime
import subprocess

FILE_PATH = r'C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS\index.html'

SCRIPT_ID = 'patch171OutrosColaborador'

JS_BLOCK = r"""<!-- PATCH171: opcao "Outros" (nova funcao / nova empresa) no cadastro de colaborador -->
<script id="patch171OutrosColaborador">
(function(){
  'use strict';
  if(window.__patch171OutrosColaborador) return;
  window.__patch171OutrosColaborador = true;

  var OUTRO = '__outro__';
  function byId(id){ return document.getElementById(id); }

  function ensureOption(sel){
    if(!sel) return;
    var tem = Array.prototype.some.call(sel.options, function(o){ return o.value === OUTRO; });
    if(!tem){
      var opt = document.createElement('option');
      opt.value = OUTRO;
      opt.textContent = '\u2795 Outros (digitar)\u2026';
      sel.appendChild(opt);
    }
  }

  function ensureInput(sel, id, placeholder){
    if(!sel) return null;
    var inp = byId(id);
    if(!inp){
      inp = document.createElement('input');
      inp.type = 'text';
      inp.id = id;
      inp.placeholder = placeholder;
      inp.style.cssText = 'width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;margin-top:6px;display:none;';
      sel.parentNode.appendChild(inp);
    }
    return inp;
  }

  function wire(selId, inpId, placeholder){
    var sel = byId(selId);
    if(!sel) return;
    ensureOption(sel);
    var inp = ensureInput(sel, inpId, placeholder);
    function toggle(){
      if(sel.value === OUTRO){
        inp.style.display = '';
        setTimeout(function(){ try{ inp.focus(); }catch(e){} }, 40);
      } else {
        inp.style.display = 'none';
      }
    }
    if(!sel.__p171wired){
      sel.addEventListener('change', toggle);
      sel.__p171wired = true;
    }
  }

  function setup(){
    wire('colabInputFuncao', 'colabInputFuncaoOutro', 'Digite a nova fun\u00e7\u00e3o');
    wire('colabInputEmpresa', 'colabInputEmpresaOutro', 'Digite a nova empresa');
  }

  function valOutro(inpId){
    var inp = byId(inpId);
    return inp ? String(inp.value || '').trim() : '';
  }

  // Se o valor salvo nao esta na lista padrao, abre em "Outros" com o texto.
  function preencher(selId, inpId, valor){
    var sel = byId(selId);
    var inp = byId(inpId);
    if(!sel) return;
    valor = (valor == null) ? '' : String(valor);
    var achou = Array.prototype.some.call(sel.options, function(o){
      return o.value !== OUTRO && o.value === valor;
    });
    if(valor && !achou){
      sel.value = OUTRO;
      if(inp){ inp.value = valor; inp.style.display = ''; }
    } else if(inp){
      inp.value = '';
      inp.style.display = 'none';
    }
  }

  function tempOption(sel, valor){
    if(!sel) return null;
    var opt = document.createElement('option');
    opt.value = valor;
    opt.textContent = valor;
    sel.appendChild(opt);
    sel.value = valor;
    return function(){ try{ sel.removeChild(opt); }catch(e){} };
  }

  function findColabById(id){
    var found = null;
    ((window.db && db.obras) || []).forEach(function(o){
      (o.colaboradores || []).forEach(function(c){ if(c.id === id) found = c; });
    });
    return found;
  }

  function localizarSalvo(obraId, editId, antesIds){
    if(editId) return findColabById(editId);
    var obra = ((window.db && db.obras) || []).find(function(o){ return o.id === obraId; });
    if(!obra || !obra.colaboradores) return null;
    var novo = null;
    obra.colaboradores.forEach(function(c){ if(antesIds.indexOf(c.id) < 0) novo = c; });
    return novo;
  }

  // ---- wrap abrirModalColaborador: garante setup e limpa os campos ----
  var _abrir = window.abrirModalColaborador;
  window.abrirModalColaborador = function(){
    var r = _abrir ? _abrir.apply(this, arguments) : undefined;
    setup();
    var fi = byId('colabInputFuncaoOutro'); if(fi){ fi.value=''; fi.style.display='none'; }
    var ei = byId('colabInputEmpresaOutro'); if(ei){ ei.value=''; ei.style.display='none'; }
    return r;
  };

  // ---- wrap editarColaborador: pre-seleciona "Outros" conforme os dados ----
  var _editar = window.editarColaborador;
  window.editarColaborador = function(id, obraId){
    var r = _editar ? _editar.apply(this, arguments) : undefined;
    setup();
    var c = null;
    try{
      var obra = ((window.db && db.obras) || []).find(function(o){ return o.id === obraId; });
      if(obra && obra.colaboradores) c = obra.colaboradores.find(function(x){ return x.id === id; });
    }catch(e){}
    if(c){
      preencher('colabInputFuncao', 'colabInputFuncaoOutro', c.funcao);
      preencher('colabInputEmpresa', 'colabInputEmpresaOutro', c.empresa);
    }
    return r;
  };

  // ---- wrap salvarColaborador: grava o texto digitado em "Outros" ----
  var _salvar = window.salvarColaborador;
  window.salvarColaborador = function(){
    var selF = byId('colabInputFuncao');
    var selE = byId('colabInputEmpresa');
    var customFuncao = null, customEmpresa = null;

    if(selF && selF.value === OUTRO){
      customFuncao = valOutro('colabInputFuncaoOutro');
      if(!customFuncao){ alert('Digite a nova fun\u00e7\u00e3o.'); return; }
    }
    if(selE && selE.value === OUTRO){
      customEmpresa = valOutro('colabInputEmpresaOutro');
      if(!customEmpresa){ alert('Digite a nova empresa.'); return; }
    }

    // troca temporaria: o salvar original le um value valido no select
    var restoreF = (customFuncao != null) ? tempOption(selF, customFuncao) : null;
    var restoreE = (customEmpresa != null) ? tempOption(selE, customEmpresa) : null;

    var obraId = byId('colabInputObra') ? byId('colabInputObra').value : '';
    var editId = byId('colabEditId') ? byId('colabEditId').value : '';
    var antesIds = [];
    var obraAntes = ((window.db && db.obras) || []).find(function(o){ return o.id === obraId; });
    if(obraAntes && obraAntes.colaboradores){
      antesIds = obraAntes.colaboradores.map(function(c){ return c.id; });
    }

    var r = _salvar ? _salvar.apply(this, arguments) : undefined;

    // o salvar original normaliza a funcao (Prof/Ajud); recolocamos o texto real
    if(customFuncao != null || customEmpresa != null){
      try{
        var alvo = localizarSalvo(obraId, editId, antesIds);
        if(alvo){
          if(customFuncao != null) alvo.funcao = customFuncao;
          if(customEmpresa != null) alvo.empresa = customEmpresa;
          if(typeof salvarDB === 'function') salvarDB();
          if(typeof renderListaColaboradores === 'function') renderListaColaboradores();
          if(typeof popularSelectsPgto === 'function') popularSelectsPgto();
        }
      }catch(e){ console.error('[PATCH171] pos-salvar:', e); }
    }

    if(restoreF) restoreF();
    if(restoreE) restoreE();
    return r;
  };

  if(document.readyState !== 'loading') setup();
  else document.addEventListener('DOMContentLoaded', setup);

  console.log('[PATCH171] opcao "Outros" no cadastro de colaborador ativa.');
})();
</script>
"""


def main():
    file_path = sys.argv[1] if len(sys.argv) > 1 else FILE_PATH
    print('Lendo:', file_path)

    with open(file_path, 'r', encoding='utf-8', newline='') as f:
        content = f.read()
    original = content
    print('Tamanho original: {:,} caracteres'.format(len(content)))

    if SCRIPT_ID in content:
        print('\nPATCH171 ja aplicado neste arquivo. Nada a fazer.')
        return

    idx = content.rfind('</body>')
    if idx < 0:
        print('ERRO: nao encontrei </body> para inserir o patch.')
        return

    content = content[:idx] + JS_BLOCK + '\r\n' + content[idx:]

    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    content = content.rstrip() + '\r\n<!-- PATCH171 aplicado em {} -->\r\n'.format(ts)

    delta = len(content) - len(original)
    print('  OK  opcao "Outros" inserida (Funcao e EMPRESA)')
    print('\nDelta: {:+,} caracteres'.format(delta))
    print('Novo tamanho: {:,} caracteres'.format(len(content)))

    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('\nOK Arquivo salvo:', file_path)

    # ------------------------------------------------------------------
    # GIT: add, commit, push
    # ------------------------------------------------------------------
    repo_dir = os.path.dirname(os.path.abspath(file_path))
    git_cmds = [
        ['git', 'add', file_path],
        ['git', 'commit', '-m',
         'Patch 171 - restaura opcao Outros (nova funcao/empresa) no cadastro de colaborador'],
        ['git', 'push'],
    ]
    for cmd in git_cmds:
        label = ' '.join(cmd[:2]) + (' ' + cmd[2] if len(cmd) > 2 else '')
        print('  GIT {} ...'.format(label))
        try:
            r = subprocess.run(cmd, cwd=repo_dir, capture_output=True, text=True)
        except Exception as e:
            print('    ERRO ao executar git:', e)
            break
        if r.returncode != 0:
            print('    (git avisou):', (r.stderr or r.stdout).strip().split(chr(10))[0])
        else:
            msg = (r.stdout.strip() or r.stderr.strip() or 'ok').split(chr(10))[0]
            print('    OK:', msg)

    print('\nPatch 171 concluido.')


if __name__ == '__main__':
    main()
