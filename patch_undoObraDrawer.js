/* =====================================================================
 * patch_undoObraDrawer.js
 * REVERTE COMPLETAMENTE todos os patches obra drawer (v1-v6)
 * Remove CSS injetado, overlays duplicados, navs duplicadas,
 * wrappers ob-menu-row, launcher buttons, JS OBMENU blocks,
 * restaura project-selector original, header-badges-right limpo,
 * details#meu-menu-abas com margin original.
 *
 * USO:  node patch_undoObraDrawer.js
 * DEPOIS: git add index.html && git commit -m "Reverte obra drawer" && git push
 * ===================================================================== */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'index.html');

function main() {
  let h = fs.readFileSync(FILE, 'utf8');
  const origLen = h.length;
  let changes = 0;

  /* ── 1. Remover blocos CSS GAVETA OBRAS (v1-v6) ── */
  const p158 = '#tab-cronograma { display: none !important; }';
  const i158 = h.indexOf(p158);
  if (i158 !== -1) {
    const after = i158 + p158.length;
    const hc = h.indexOf('</head>', after);
    if (hc !== -1) {
      const between = h.substring(after, hc);
      const cleanEnd = '\n</style>\n\n</head>';
      if (between !== cleanEnd) {
        h = h.substring(0, after) + cleanEnd + h.substring(hc + 7);
        changes++; console.log('1 OK CSS GAVETA OBRAS removido');
      }
    }
  }

  /* ── 2. Remover overlays+navs duplicados ── */
  const re2 = /<div\s+id="obOverlay"[^>]*><\/div>\s*<nav\s+id="obMenu"[\s\S]*?<\/nav>\s*/g;
  const b4 = h.length;
  h = h.replace(re2, '');
  if (h.length !== b4) { changes++; console.log('2 OK Overlay+Nav removidos (' + (b4 - h.length) + ' chars)'); }

  /* ── 3. Limpar header-badges-right ── */
  h = h.replace(
    /(<div\s+class="header-badges-right")\s+style="flex-direction:column!important;align-items:flex-end!important;gap:6px!important"/g,
    '$1'
  );
  h = h.replace(/\s*<div\s+class="ob-nuvem-row"[^>]*><\/div>\s*/g, '\n');
  changes++; console.log('3 OK header-badges-right limpo');

  /* ── 4. Restaurar project-selector ── */
  /* a) Remover style="display:none!important" (duplicados) */
  h = h.replace(
    /(<div\s+class="project-selector")(\s+style="display:none!important"){1,}/g,
    '$1'
  );

  /* b) Remover class="ob-hide" do selectObra (multiplos) */
  h = h.replace(
    /(<select\s+id="selectObra")(\s+class="ob-hide"){1,}/g,
    '$1'
  );

  /* c) Encontrar project-selector via indexOf (mais robusto que regex) */
  const psOpen = h.indexOf('<div class="project-selector">');
  if (psOpen === -1) {
    /* Tentar com espacos variaveis */
    const psOpenAlt = h.search(/<div\s+class="project-selector"/);
    if (psOpenAlt !== -1) {
      console.log('4 WARN: project-selector encontrado com atributos extras');
    }
  }

  if (psOpen !== -1) {
    const psStart = psOpen;
    /* Encontrar o </header> apos project-selector */
    const headerClose = h.indexOf('</header>', psStart);
    if (headerClose !== -1) {
      /* O conteudo do project-selector esta entre psStart+len(opening) e o </div> antes de </header> */
      const openTagEnd = h.indexOf('>', psStart) + 1;
      /* Encontrar o </div> que fecha project-selector — e o ultimo </div> antes de </header> */
      const closeDiv = h.lastIndexOf('</div>', headerClose);
      if (closeDiv !== -1 && closeDiv > openTagEnd) {
        let inner = h.substring(openTagEnd, closeDiv);

        /* Remover launcher buttons */
        inner = inner.replace(/<button[^>]*id="obMenuBtn"[^>]*>[\s\S]*?<\/button>\s*/gi, '');

        /* Unwrap ob-hide-btn / display:none spans (ate 5 niveis) */
        for (let i = 0; i < 5; i++) {
          inner = inner.replace(/<span\s+class="ob-hide-btn"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
          inner = inner.replace(/<span\s+style="display:none!important"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
          inner = inner.replace(/<span\s+style="display:\s*none\s*!important"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
        }

        /* Verificar elementos nuvem/settings ausentes */
        const hasNuvem = inner.includes('id="statusNuvem"');
        const hasCarregar = inner.includes('carregarBancoDaNuvem');
        const hasTheme = inner.includes('id="btnThemeToggle"');
        const hasSettings = inner.includes('class="settings-menu"');
        const hasFileRestore = inner.includes('id="fileRestoreInput"');

        let prefix = '';
        if (!hasNuvem) {
          prefix += '\n                <span id="statusNuvem" style="padding:4px 8px; border-radius:6px; font-size:0.75rem; background:#5f6b7a; color:#fff;">\u2601\uFE0F Local</span>';
        }
        if (!hasCarregar) {
          prefix += '\n                <button class="secondary" onclick="carregarBancoDaNuvem()" title="Carregar dados da nuvem (Render.com)" style="margin-left:4px;font-size:0.75rem;">\u2601\uFE0F Carregar Nuvem</button>';
        }
        if (!hasTheme) {
          prefix += '\n                <button class="secondary" onclick="alternarTema()" id="btnThemeToggle">\u2600\uFE0F Modo Claro</button>';
        }
        if (!hasSettings) {
          prefix += '\n                <div class="settings-menu">\n                    <button type="button" class="secondary" onclick="toggleSettingsMenu()">\u2699 Configura\u00E7\u00F5es</button>\n                    <div id="settingsMenu" class="settings-dropdown">\n                        <button class="secondary" onclick="exportarDados()">\uD83D\uDCBE Backup</button>\n                        <button class="secondary" onclick="document.getElementById(\'fileRestoreInput\').click()">\uD83D\uDCE5 Restaurar</button>\n                        <button class="warning" onclick="abrirRecuperacaoDados()">\uD83E\uDDFF Recuperar Dados Antigos</button>\n                        <button class="primary" onclick="abrirBancoCompartilhado()">\uD83C\uDF10 Banco Compartilhado</button>\n                    </div>\n                </div>';
        }
        if (!hasFileRestore) {
          prefix += '\n                <input type="file" id="fileRestoreInput" accept=".json" style="display:none" onchange="restaurarBackupJSON(event)">';
        }

        inner = prefix + '\n' + inner.trim();
        const newBlock = '<div class="project-selector">' + inner + '\n            </div>';
        const afterCloseDiv = closeDiv + '</div>'.length;
        h = h.substring(0, psStart) + newBlock + h.substring(afterCloseDiv);
        changes++; console.log('4 OK project-selector restaurado');
      }
    }
  }

  /* ── 5. Desembrulhar details#meu-menu-abas dos ob-menu-row ── */
  for (let i = 0; i < 5; i++) {
    h = h.replace(/<div\s+class="ob-menu-row"[^>]*>\s*(<details\s+id="meu-menu-abas)/gi, '$1');
  }
  h = h.replace(
    /(<details\s+id="meu-menu-abas")\s+style="position:relative;z-index:9999;"/g,
    '$1 style="margin: 10px 0 20px 0; position: relative; z-index: 9999;"'
  );
  changes++; console.log('5 OK details#meu-menu-abas desembrulhado');

  /* ── 6. Remover ob-settings-block de .tabs ── */
  h = h.replace(/<div\s+class="ob-settings-block"[\s\S]*?<\/div>\s*<input[^>]*id="fileRestoreInput"[^>]*>\s*/gi, '');
  h = h.replace(/<div\s+class="ob-settings-block"[\s\S]*?<\/div>\s*/gi, '');
  /* Remover fileRestoreInput dentro de .tabs se ficou sem o block */
  const tabsIdx = h.indexOf('class="tabs"');
  if (tabsIdx !== -1) {
    const tabsEnd = h.indexOf('</div>', tabsIdx + 200);
    if (tabsEnd !== -1) {
      const tabsContent = h.substring(tabsIdx, tabsEnd);
      if (tabsContent.includes('fileRestoreInput') && !tabsContent.includes('settings-menu')) {
        const cleaned = tabsContent.replace(/<input[^>]*id="fileRestoreInput"[^>]*>\s*/gi, '');
        h = h.substring(0, tabsIdx) + cleaned + h.substring(tabsEnd);
      }
    }
  }
  changes++; console.log('6 OK ob-settings-block removido de .tabs');

  /* ── 7. Remover launcher buttons soltos ── */
  h = h.replace(/<button[^>]*class="ob-launcher"[^>]*>[\s\S]*?<\/button>\s*/gi, '');
  h = h.replace(/<button[^>]*id="obMenuBtn"[^>]*>[\s\S]*?<\/button>\s*/gi, '');
  changes++; console.log('7 OK launcher buttons soltos removidos');

  /* ── 8. Remover </div> orfaos de ob-menu-row apos </details> ── */
  const dEnd = h.lastIndexOf('</details>');
  if (dEnd !== -1) {
    const chunk = h.substring(dEnd, dEnd + 400);
    const cleaned = chunk.replace(
      /(<\/details>)\s*(<\/div>\s*){1,5}(\s*<!--|\s*<div\s|\n\s*<div\s)/g,
      '$1\n$3'
    );
    if (cleaned !== chunk) {
      h = h.substring(0, dEnd) + cleaned + h.substring(dEnd + 400);
      changes++; console.log('8 OK </div> orfaos removidos');
    }
  }

  /* ── 9. Remover blocos JS OBMENU (v1-v6) ── */
  const bodyClose = h.lastIndexOf('</body>');
  if (bodyClose !== -1) {
    let before = h.substring(0, bodyClose);
    const after = h.substring(bodyClose);

    /* Remove scripts com PATCH OBRA DRAWER no cabecalho */
    before = before.replace(
      /<script>\s*\/\*[=]+[^*]*PATCH OBRA DRAWER[\s\S]*?<\/script>\s*/gi, ''
    );
    /* Remove scripts com GAVETA OBRAS no cabecalho */
    before = before.replace(
      /<script>\s*\/\*\s*===\s*GAVETA OBRAS[\s\S]*?<\/script>\s*/gi, ''
    );

    h = before + after;
    changes++; console.log('9 OK blocos JS OBMENU removidos');
  }

  /* ── 10. Cleanup: linhas em branco excessivas ── */
  h = h.replace(/\n{4,}/g, '\n\n\n');
  changes++;

  /* ── Gravar ── */
  fs.writeFileSync(FILE, h, 'utf8');
  console.log('\n========================================');
  console.log('Reversao completa: ' + changes + ' operacoes');
  console.log('Tamanho: ' + origLen + ' -> ' + h.length + ' bytes');
  console.log('========================================');
  console.log('\nAgora rode:');
  console.log('  git add index.html');
  console.log('  git commit -m "Reverte obra drawer v1-v6: restaura UI original"');
  console.log('  git push');
}

main();
