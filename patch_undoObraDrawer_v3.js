/**
 * patch_undoObraDrawer_v3.js
 * Remove os 2 ultimos residuos do obraDrawer no index.html:
 *   1) <div class="ob-nuvem-row">...</div> dentro de header-badges-right (botoes duplicados)
 *   2) Bloco CSS "GAVETA OBRAS" dentro do <style> principal
 *
 * USO:  node patch_undoObraDrawer_v3.js [caminho/index.html]
 * DEPOIS: git add index.html && git commit -m "Remove residuos obraDrawer" && git push
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
 * 1. REMOVER <div class="ob-nuvem-row">...</div>
 *    Este div esta dentro de header-badges-right e contem
 *    os botoes Nuvem/Tema duplicados (ob-nuvem-chip).
 *    E uma unica linha — basta remove-la inteira.
 * ========================================================== */
const nuvemRowStart = html.indexOf('<div class="ob-nuvem-row">');
if (nuvemRowStart !== -1) {
  const nuvemRowEnd = html.indexOf('</div>', nuvemRowStart) + '</div>'.length;
  const snippet = html.substring(nuvemRowStart, nuvemRowEnd);
  if (snippet.includes('ob-nuvem-chip')) {
    html = html.substring(0, nuvemRowStart) + html.substring(nuvemRowEnd);
    changes.push('ob-nuvem-row removido de header-badges-right (' + snippet.length + ' chars)');
  }
}

/* ==========================================================
 * 2. REMOVER bloco CSS "GAVETA OBRAS"
 *    Esta dentro do <style> principal, entre:
 *      - Inicio: /* === GAVETA OBRAS — launcher + painel lateral ===
 *      - Fim:    logo antes de </style>
 *    Estrategia: encontrar o marcador, voltar para pegar a
 *    quebra de linha anterior, e remover tudo ATE (mas NAO
 *    incluindo) o </style> — preservando-o intacto.
 * ========================================================== */
const gavetaMarker = '/* === GAVETA OBRAS';
const gavetaIdx = html.indexOf(gavetaMarker);
if (gavetaIdx !== -1) {
  /* Encontrar o </style> apos o marcador */
  const styleClose = html.indexOf('</style>', gavetaIdx);
  if (styleClose !== -1) {
    /* Voltar para pegar quebra de linha antes do marcador */
    let cutStart = gavetaIdx;
    while (cutStart > 0 && (html[cutStart - 1] === '\n' || html[cutStart - 1] === '\r')) {
      cutStart--;
    }
    /* Remover do inicio limpo ATE o </style> (preservando o </style>) */
    const removed = html.substring(cutStart, styleClose);
    html = html.substring(0, cutStart) + '\n' + html.substring(styleClose);
    changes.push('CSS GAVETA OBRAS removido (' + removed.length + ' chars)');
  }
}

/* ==========================================================
 * 3. LIMPAR linhas em branco excessivas (residuo da remocao)
 * ========================================================== */
html = html.replace(/\n{3,}/g, '\n\n');

/* ==========================================================
 * VERIFICACAO FINAL
 * ========================================================== */
const residual = (html.match(/\bob-[a-z]+/gi) || []).filter(m =>
  !/^(obrig|obj|observ|obsole|obter|object|obstru|obtido)/i.test(m)
);
const residualCount = [...new Set(residual)].length;

/* ==========================================================
 * GRAVAR
 * ========================================================== */
fs.writeFileSync(FILE, html, 'utf8');

console.log('patch_undoObraDrawer_v3.js\n');
if (changes.length === 0) {
  console.log('Nenhuma alteracao necessaria — arquivo ja limpo.');
} else {
  console.log('Alteracoes (' + changes.length + '):');
  changes.forEach(c => console.log('  OK ' + c));
  console.log('\nTamanho: ' + origLen + ' -> ' + html.length + ' bytes');
}
if (residualCount > 0) {
  console.log('\n[ATENCAO] Ainda restam ' + residualCount + ' classes ob- no arquivo.');
  console.log('  Classes: ' + [...new Set(residual)].slice(0, 10).join(', '));
} else {
  console.log('\nVerificacao: nenhuma classe ob- residual. Arquivo limpo!');
}
console.log('\nAgora rode:');
console.log('  git add index.html');
console.log('  git commit -m "Remove residuos obraDrawer: ob-nuvem-row + CSS GAVETA OBRAS"');
console.log('  git push');
