/* =====================================================================
 * patch_gavetaObras_v3.js
 * GAVETA DO TAB OBRAS — gaveta lateral para gerenciar obras
 *
 * O que faz (7 passos):
 *   0. Verifica se v2 ja esta aplicado (idempotencia) — se sim, aborta
 *   1. Remove o CSS antigo "GAVETA OBRAS" (ob-*) dentro do <style>
 *   2. Remove o div.ob-nuvem-row duplicado no header
 *   3. Remove o script tag do patch-estoque-obra.js (API morta)
 *   4. Remove qualquer <script> GAVETA OBRAS v1/v2 ja existente (idempotencia)
 *   5. Insere novo bloco <style> com prefixo "obr-" antes de </head>
 *   6. Insere novo bloco <script> IIFE (GAVETA OBRAS v2) antes de </body>
 *      — launcher AO LADO do botao Menu (#orMenuBtn) via wrapper flex
 *      — remove secao OBRAS do orMenu (injetada por codigo externo)
 *      — NAO toca no PATCH 62 (orMenu / or-*) de forma alguma
 *
 * Prefixo: obr- (obr-launcher, #obrGaveta, obr-painel, etc.)
 * Cor accent: amber/laranja (#f59e0b) — diferencia do orMenu (azul #3b82f6)
 * API publica: window.GAVETA_OBRAS (abrir, fechar, alternar, arrumar)
 *
 * USO:  node patch_gavetaObras_v3.js
 * DEPOIS: git add index.html && git commit -m "Gaveta OBRAS v2" && git push
 * ===================================================================== */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'index.html');

/* Ler arquivos auxiliares com o CSS e JS da gaveta */
const OBR_CSS = fs.readFileSync(path.join(__dirname, 'obr_css.txt'), 'utf8');
const OBR_JS  = fs.readFileSync(path.join(__dirname, 'obr_js.txt'), 'utf8');

function main() {
  let h = fs.readFileSync(FILE, 'utf8');
  const origLen = h.length;
  let steps = 0;

  /* ================================================================ *
   * PASSO 0 — Idempotencia: se v2 ja esta no HTML, abortar
   * ================================================================ */
  if (h.indexOf('/* === GAVETA OBRAS v2') !== -1) {
    console.log('0⚠ GAVETA OBRAS v2 ja aplicado — nada a fazer.');
    console.log('Para reaplicar, remova manualmente os blocos v2 do HTML.');
    return;
  }

  /* ================================================================ *
   * PASSO 1 — Remover CSS antigo GAVETA OBRAS (ob-*) dentro do <style>
   *
   * O marcador antigo e: "/* === GAVETA OBRAS — launcher"
   * (sem "v2"). Nao confundir com o novo CSS que tem "v2".
   * ================================================================ */
  const markerOld = '/* === GAVETA OBRAS \u2014 launcher';
  const iOld = h.indexOf(markerOld);
  if (iOld !== -1) {
    const styleClose = h.indexOf('</style>', iOld);
    if (styleClose !== -1) {
      const beforeStyleClose = h.lastIndexOf('\n', styleClose);
      const cutEnd = (beforeStyleClose > iOld) ? beforeStyleClose : styleClose;
      h = h.substring(0, iOld) + h.substring(cutEnd);
      steps++;
      console.log('1\u2713 CSS GAVETA OBRAS (ob-*) removido');
    }
  } else {
    console.log('1\u26a0 Marcador CSS antigo nao encontrado (ja removido ou ausente)');
  }

  /* ================================================================ *
   * PASSO 2 — Remover ob-nuvem-row duplicado no header
   * ================================================================ */
  const reNuvem = /\n<div class="ob-nuvem-row">[\s\S]*?<\/div>/;
  const antes2 = h.length;
  h = h.replace(reNuvem, '');
  if (h.length !== antes2) {
    steps++;
    console.log('2\u2713 ob-nuvem-row duplicado removido');
  } else {
    console.log('2\u26a0 ob-nuvem-row nao encontrado');
  }

  /* ================================================================ *
   * PASSO 3 — Remover script tag patch-estoque-obra.js (API morta)
   * ================================================================ */
  const reEstoque = /<script[^>]*src=["'][^"']*patch-estoque-obra\.js["'][^>]*><\/script>\s*/gi;
  const antes3 = h.length;
  h = h.replace(reEstoque, '');
  if (h.length !== antes3) {
    steps++;
    console.log('3\u2713 Script tag patch-estoque-obra.js removido');
  } else {
    console.log('3\u26a0 Script tag patch-estoque-obra.js nao encontrado');
  }

  /* ================================================================ *
   * PASSO 4 — Remover qualquer <script> GAVETA OBRAS v1 ja existente
   *            (idempotencia caso v1 tenha sido inserido anteriormente)
   * ================================================================ */
  const reV1Script = /<script>\s*\/\* === GAVETA OBRAS v1[\s\S]*?<\/script>\s*/g;
  const antes4 = h.length;
  h = h.replace(reV1Script, '');
  if (h.length !== antes4) {
    steps++;
    console.log('4\u2713 Script GAVETA OBRAS v1 removido');
  } else {
    console.log('4\u26a0 Script GAVETA OBRAS v1 nao encontrado');
  }

  /* ================================================================ *
   * PASSO 5 — Inserir novo CSS com prefixo obr- antes de </head>
   * ================================================================ */
  const headClose = h.indexOf('</head>');
  if (headClose !== -1) {
    h = h.substring(0, headClose) + OBR_CSS + h.substring(headClose);
    steps++;
    console.log('5\u2713 CSS obr- inserido antes de </head>');
  } else {
    console.log('5\u26a0 </head> nao encontrado!');
  }

  /* ================================================================ *
   * PASSO 6 — Inserir JS da Gaveta OBRAS v2 antes de </body>
   *
   * IMPORTANTE: usar lastIndexOf('</body>') para evitar o </body>
   * dentro de janelaImpressao.document.write('...</body></html>')
   * ================================================================ */
  const bodyClose = h.lastIndexOf('</body>');
  if (bodyClose !== -1) {
    h = h.substring(0, bodyClose) + OBR_JS + h.substring(bodyClose);
    steps++;
    console.log('6\u2713 JS GAVETA OBRAS v2 inserido antes de </body>');
  } else {
    console.log('6\u26a0 </body> nao encontrado!');
  }

  /* ================================================================ *
   * FIM — salvar e verificar
   * ================================================================ */
  fs.writeFileSync(FILE, h, 'utf8');
  const delta = h.length - origLen;

  /* Verificacao pos-patch */
  const check1 = h.indexOf('obrGavetaBtn') !== -1;
  const check2 = h.indexOf('obr-faixa') !== -1;
  const check3 = h.indexOf('obr-launcher') !== -1;
  const check4 = h.indexOf('GAVETA OBRAS v2') !== -1;
  const check5 = h.indexOf('ob-launcher') === -1;  /* antigo removido */
  const check6 = h.indexOf('ob-nuvem-row') === -1;  /* antigo removido */

  console.log('---');
  console.log('patch_gavetaObras_v3.js completo');
  console.log('Passos executados: ' + steps);
  console.log('Tamanho original: ' + origLen + ' bytes');
  console.log('Tamanho final:     ' + h.length + ' bytes');
  console.log('Diferenca:         ' + (delta >= 0 ? '+' : '') + delta + ' bytes');
  console.log('');
  console.log('VERIFICACAO:');
  console.log('  obrGavetaBtn presente:   ' + (check1 ? 'SIM' : 'NAO *** FALHA ***'));
  console.log('  obr-faixa presente:      ' + (check2 ? 'SIM' : 'NAO *** FALHA ***'));
  console.log('  obr-launcher presente:   ' + (check3 ? 'SIM' : 'NAO *** FALHA ***'));
  console.log('  GAVETA OBRAS v2 presente:' + (check4 ? 'SIM' : 'NAO *** FALHA ***'));
  console.log('  ob-launcher removido:    ' + (check5 ? 'SIM' : 'NAO *** FALHA ***'));
  console.log('  ob-nuvem-row removido:   ' + (check6 ? 'SIM' : 'NAO *** FALHA ***'));

  if (check1 && check2 && check3 && check4 && check5 && check6) {
    console.log('\n\u2705 PATCH APLICADO COM SUCESSO!');
  } else {
    console.log('\n\u274c PATCH COM FALHAS — verificar log acima');
  }

  console.log('');
  console.log('COMANDOS GIT:');
  console.log('  git add index.html');
  console.log('  git commit -m "feat: Gaveta OBRAS v2 \u2014 launcher ao lado do Menu, remove OBRAS do orMenu"');
  console.log('  git push');
}

main();