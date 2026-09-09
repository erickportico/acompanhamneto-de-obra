/**
 * patch_removeApiEstoque.js
 * Remove a API de estoque do index.html:
 *   - Remove a tag <script src="/patch-estoque-obra.js"></script>
 *
 * Isso elimina o botao "Enviar à API de estoque", a tabela
 * "Estoque da obra (romaneio x recebimento)" e toda a logica
 * de envio para a API externa — tudo injetado dinamicamente
 * por esse script.
 *
 * Nao afeta: coluna "Local/Estoque", nenhuma outra funcionalidade.
 *
 * USO:  node patch_removeApiEstoque.js [caminho/index.html]
 * DEPOIS: git add index.html && git commit -m "Remove API de estoque" && git push
 *
 * OPCIONAL: tambem pode remover o arquivo patch-estoque-obra.js do servidor:
 *   git rm patch-estoque-obra.js
 *   git commit -m "Remove arquivo patch-estoque-obra.js"
 *   git push
 */

const fs   = require('fs');
const path = require('path');
const FILE = process.argv[2] || path.join(process.cwd(), 'index.html');

if (!fs.existsSync(FILE)) {
  console.error('[ERRO] Arquivo nao encontrado:', FILE);
  process.exit(1);
}

let html = fs.readFileSync(FILE, 'utf8');
const origLen = html.length;
const changes = [];

/* ==========================================================
 * 1. REMOVER <script src="/patch-estoque-obra.js"></script>
 *    Substituir a linha inteira (incluindo quebra de linha)
 *    por nada, preservando a formatacao.
 * ========================================================== */
const patterns = [
  '<script src="/patch-estoque-obra.js"></script>\n',
  '<script src="/patch-estoque-obra.js"></script>\r\n',
  '\n<script src="/patch-estoque-obra.js"></script>',
  '\r\n<script src="/patch-estoque-obra.js"></script>'
];

for (const pat of patterns) {
  if (html.includes(pat)) {
    html = html.replace(pat, '');
    changes.push('Tag <script patch-estoque-obra.js> removida');
    break;
  }
}

/* Fallback: se nenhum pattern com quebra de linha funcionou */
if (changes.length === 0) {
  const scriptTag = '<script src="/patch-estoque-obra.js"></script>';
  if (html.includes(scriptTag)) {
    html = html.replace(scriptTag, '');
    changes.push('Tag <script patch-estoque-obra.js> removida (sem quebra de linha)');
  }
}

/* ==========================================================
 * VERIFICACAO FINAL
 * ========================================================== */
const stillThere = html.includes('patch-estoque-obra.js');

/* ==========================================================
 * GRAVAR
 * ========================================================== */
fs.writeFileSync(FILE, html, 'utf8');

console.log('patch_removeApiEstoque.js\n');
if (changes.length === 0) {
  console.log('Nenhuma alteracao necessaria — API de estoque ja removida.');
} else {
  console.log('Alteracoes (' + changes.length + '):');
  changes.forEach(c => console.log('  OK ' + c));
  console.log('\nTamanho: ' + origLen + ' -> ' + html.length + ' bytes');
}

if (stillThere) {
  console.log('\n[ATENCAO] Ainda ha referencias a patch-estoque-obra.js no arquivo!');
} else {
  console.log('\nVerificacao: nenhuma referencia a patch-estoque-obra.js. API de estoque removida!');
}

console.log('\nAgora rode:');
console.log('  git add index.html');
console.log('  git commit -m "Remove API de estoque (patch-estoque-obra.js)"');
console.log('  git push');
console.log('\nOpcional — remover o arquivo JS do servidor tambem:');
console.log('  git rm patch-estoque-obra.js');
console.log('  git commit -m "Remove arquivo patch-estoque-obra.js do servidor"');
console.log('  git push');
