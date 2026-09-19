#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PATCH 172 - Corrige o arrastar de texto/imagem no editor de slides (toque)
==========================================================================
No editor \"Conferencia dos slides\", com a edicao ligada, ao tentar mover
um texto ou uma foto pelo TOQUE na tela nada acontecia: o navegador
interpretava o gesto como rolagem e cancelava o arraste (pointercancel).

Causa: os itens do slide (.p94-t / .p94-i / .p94-q) e a folha do slide nao
tinham \"touch-action: none\" no modo de edicao. Outros arrastaveis do
sistema ja tinham esse ajuste; so faltou aqui.

Correcao (apenas CSS, aditiva, sem tocar na logica existente):
injeta um <style> que aplica touch-action:none aos itens do slide, a folha
e as alcas (bolinhas verdes) SOMENTE quando a edicao esta ligada (.p99-edit).
Assim o toque passa a mover/redimensionar em vez de rolar a tela.

Este patch NAO entrega HTML pronto: apenas insere um <script> pontual antes
do </body>, preservando todo o resto do seu arquivo. Idempotente.

Uso:
    python gerar_patch172_arrastar_slides_toque.py
(ou:  python gerar_patch172_arrastar_slides_toque.py caminho\\index.html)
"""

import sys
import os
import datetime
import subprocess

FILE_PATH = r'C:\Users\OBRAS 8\Desktop\ACOMPANHAMENTO DE OBRAS\index.html'

SCRIPT_ID = 'patch172ArrastarSlidesToque'

JS_BLOCK = r"""<!-- PATCH172: permitir arrastar texto/imagem por toque no editor de slides -->
<script id="patch172ArrastarSlidesToque">
(function(){
  'use strict';
  if(window.__patch172ArrastarSlidesToque) return;
  window.__patch172ArrastarSlidesToque = true;

  var CSS = [
    /* Modo de edicao ligado: o toque nos itens do slide deve MOVER, nao rolar */
    '.p99-edit .p94-t, .p99-edit .p94-i, .p99-edit .p94-q { touch-action: none !important; }',
    /* a folha inteira do slide tambem, para o gesto nao virar rolagem */
    '.p99-edit .p94-folha { touch-action: none !important; }',
    /* as bolinhas verdes de redimensionar */
    '.p99-mk, .p99-mk .p99-h, .p99-h[data-p99h] { touch-action: none !important; }',
    /* enquanto escreve num texto, volta ao comportamento normal */
    '.p99-edit [contenteditable="true"] { touch-action: auto !important; }'
  ].join('\n');

  function injetar(){
    if(document.getElementById('p172style')) return;
    var st = document.createElement('style');
    st.id = 'p172style';
    st.setAttribute('data-html2canvas-ignore', 'true');
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
    console.log('[PATCH172] touch-action aplicado aos itens do slide (arraste por toque).');
  }

  if(document.readyState !== 'loading') injetar();
  else document.addEventListener('DOMContentLoaded', injetar);
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
        print('\nPATCH172 ja aplicado neste arquivo. Nada a fazer.')
        return

    idx = content.rfind('</body>')
    if idx < 0:
        print('ERRO: nao encontrei </body> para inserir o patch.')
        return

    content = content[:idx] + JS_BLOCK + '\r\n' + content[idx:]

    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    content = content.rstrip() + '\r\n<!-- PATCH172 aplicado em {} -->\r\n'.format(ts)

    delta = len(content) - len(original)
    print('  OK  touch-action aplicado aos itens do slide (arraste por toque)')
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
        ['git', 'add', '-f', file_path],
        ['git', 'commit', '-m',
         'Patch 172 - arrastar texto/imagem por toque no editor de slides'],
        ['git', 'push'],
    ]
    for cmd in git_cmds:
        label = ' '.join(cmd[:3])
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

    print('\nPatch 172 concluido.')


if __name__ == '__main__':
    main()
