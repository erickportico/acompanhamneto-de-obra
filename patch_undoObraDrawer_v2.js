/**
 * patch_undoObraDrawer_v2.js
 * REVERTE COMPLETAMENTE os patches obraDrawer (v2→v6)
 *
 * USO:  node patch_undoObraDrawer_v2.js [caminho/index.html]
 * DEPOIS: git add index.html && git commit -m "Reverte obraDrawer v2-v6" && git push
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
let log = [];

console.log('patch_undoObraDrawer_v2.js — revertendo obraDrawer v2-v6\n');

/* ==========================================================
 * HELPER: remove trecho entre dois indices com log
 * ========================================================== */
function cut(start, end, label) {
  if (start < 0 || end < 0 || end <= start) return false;
  const removed = html.substring(start, end);
  html = html.substring(0, start) + html.substring(end);
  log.push(label + ' (' + (end - start) + ' chars)');
  return true;
}

/* ==========================================================
 * 1. REMOVER <style> BLOCOS COM "GAVETA OBRAS"
 *    Seguro: encontra <style>...</style> inteiro e verifica
 *    conteudo antes de remover. Nunca cruza fronteiras.
 * ========================================================== */
(function removeObCssBlocks() {
  let safety = 0;
  while (safety++ < 50) {
    const marker = html.indexOf('GAVETA OBRAS');
    if (marker === -1) break;
    /* Voltar ate o <style mais proximo antes do marcador */
    let sOpen = html.lastIndexOf('<style', marker);
    if (sOpen === -1 || sOpen < marker - 2000) break; /* improvavel */
    let sClose = html.indexOf('</style>', sOpen);
    if (sClose === -1) break;
    sClose += '</style>'.length;
    cut(sOpen, sClose, '1. CSS <style> GAVETA OBRAS removido');
  }
  /* Se sobrou CSS ob- avulso dentro do <style> principal apos PATCH158,
     limpar linhas que comecam com .ob- ou contem ob-nuvem-chip etc */
  const p158idx = html.indexOf('#tab-cronograma { display: none !important; }');
  if (p158idx !== -1) {
    const headIdx = html.indexOf('</head>', p158idx);
    if (headIdx !== -1) {
      const region = html.substring(p158idx, headIdx);
      /* Verificar se ha ob- CSS residual */
      if (/\b\.ob-|ob-nuvem|ob-hide\b|ob-escondido|ob-launcher|ob-menu|ob-overlay/.test(region)) {
        /* Limpar: remover <style>...</style> adicionais */
        let pos = p158idx;
        let safety2 = 0;
        while (safety2++ < 20 && pos < headIdx) {
          const nextStyle = html.indexOf('<style', pos);
          if (nextStyle === -1 || nextStyle >= headIdx) break;
          const nextClose = html.indexOf('</style>', nextStyle);
          if (nextClose === -1) break;
          const block = html.substring(nextStyle, nextClose);
          if (/\b\.ob-|ob-nuvem|ob-hide\b|ob-escondido|ob-launcher|ob-menu\b|ob-overlay/.test(block)) {
            cut(nextStyle, nextClose + '</style>'.length, '1b. CSS ob- residual removido');
            /* recalcular headIdx apos corte */
            break;
          }
          pos = nextClose + 1;
        }
      }
    }
  }
})();

/* ==========================================================
 * 2. REMOVER <div id="obOverlay"> e <nav id="obMenu">
 *    Seguro: buscar tag de abertura e seu fechamento
 * ========================================================== */
(function removeObOverlay() {
  let safety = 0;
  while (safety++ < 10) {
    const idx = html.indexOf('id="obOverlay"');
    if (idx === -1) break;
    const tagStart = html.lastIndexOf('<', idx);
    const tagEnd = html.indexOf('>', idx);
    if (tagStart === -1 || tagEnd === -1) break;
    const tag = html.substring(tagStart, tagEnd + 1);
    if (tag.startsWith('<div')) {
      const closeIdx = html.indexOf('</div>', tagEnd);
      if (closeIdx !== -1) {
        cut(tagStart, closeIdx + '</div>'.length, '2a. obOverlay removido');
      } else break;
    } else break;
  }
})();

(function removeObMenuNav() {
  let safety = 0;
  while (safety++ < 10) {
    const idx = html.indexOf('id="obMenu"');
    if (idx === -1) break;
    const tagStart = html.lastIndexOf('<', idx);
    if (tagStart === -1) break;
    const tagType = html.substring(tagStart, tagStart + 4);
    if (tagType === '<nav') {
      const closeIdx = html.indexOf('</nav>', tagStart);
      if (closeIdx !== -1) {
        cut(tagStart, closeIdx + '</nav>'.length, '2b. nav obMenu removido');
      } else break;
    } else if (tagType === '<div') {
      /* v2 usava div com role=dialog */
      const closeIdx = html.indexOf('</div>', tagStart);
      if (closeIdx !== -1) {
        cut(tagStart, closeIdx + '</div>'.length, '2c. div obMenu removido');
      } else break;
    } else break;
  }
})();

/* ==========================================================
 * 3. LIMPAR header-badges-right:
 *    - Remove inline style="flex-direction:column..."
 *    - Remove div ob-nuvem-row (e seu conteudo)
 *    ========================================================== */
(function cleanHeaderBadges() {
  const hbIdx = html.indexOf('class="header-badges-right"');
  if (hbIdx === -1) return;
  const tagStart = html.lastIndexOf('<div', hbIdx);
  if (tagStart === -1) return;
  const tagEnd = html.indexOf('>', hbIdx);
  if (tagEnd === -1) return;

  /* Remove inline style flex-direction */
  let tagLine = html.substring(tagStart, tagEnd + 1);
  const cleaned = tagLine.replace(/\s+style="[^"]*flex-direction[^"]*"/i, '');
  if (cleaned !== tagLine) {
    html = html.substring(0, tagStart) + cleaned + html.substring(tagEnd + 1);
    log.push('3a. header-badges-right inline flex-direction removido');
  }

  /* Remove ob-nuvem-row e conteudo dentro de header-badges-right */
  const afterTag = html.indexOf('>', html.indexOf('class="header-badges-right"')) + 1;
  const hbCloseDiv = html.indexOf('</div>', afterTag);
  if (hbCloseDiv !== -1) {
    let inner = html.substring(afterTag, hbCloseDiv);
    if (inner.includes('ob-nuvem-row')) {
      /* Remover divs ob-nuvem-row — buscar <div class="ob-nuvem-row"... ate </div> */
      let newInner = inner;
      let safety = 0;
      while (safety++ < 10) {
        const rowIdx = newInner.indexOf('class="ob-nuvem-row"');
        if (rowIdx === -1) break;
        const rowStart = newInner.lastIndexOf('<div', rowIdx);
        if (rowStart === -1) break;
        /* Contar divs para achar fechamento correto */
        let depth = 1, pos = newInner.indexOf('>', rowStart) + 1;
        let rowEnd = -1;
        while (pos < newInner.length && depth > 0) {
          const nOpen = newInner.indexOf('<div', pos);
          const nClose = newInner.indexOf('</div>', pos);
          if (nClose === -1) break;
          if (nOpen !== -1 && nOpen < nClose) { depth++; pos = nOpen + 4; }
          else { depth--; if (depth === 0) rowEnd = nClose; pos = nClose + 6; }
        }
        if (rowEnd !== -1) {
          newInner = newInner.substring(0, rowStart) + newInner.substring(rowEnd + 6);
          log.push('3b. ob-nuvem-row removido de header-badges-right');
        } else break;
      }
      if (newInner !== inner) {
        html = html.substring(0, afterTag) + newInner + html.substring(hbCloseDiv);
      }
    }
  }
})();

/* ==========================================================
 * 4. REMOVER launcher buttons (ob-launcher / obMenuBtn)
 *    Seguro: busco tag <button inteira ate </button>
 * ========================================================== */
(function removeLaunchers() {
  let safety = 0;
  while (safety++ < 20) {
    let found = false;
    /* Buscar ob-launcher */
    let idx = html.indexOf('class="ob-launcher"');
    if (idx !== -1) {
      const btnStart = html.lastIndexOf('<button', idx);
      const btnEnd = html.indexOf('</button>', idx);
      if (btnStart !== -1 && btnEnd !== -1) {
        cut(btnStart, btnEnd + '</button>'.length, '4a. ob-launcher button removido');
        found = true;
      }
    }
    if (!found) {
      /* Buscar id="obMenuBtn" */
      idx = html.indexOf('id="obMenuBtn"');
      if (idx !== -1) {
        const btnStart = html.lastIndexOf('<button', idx);
        const btnEnd = html.indexOf('</button>', idx);
        if (btnStart !== -1 && btnEnd !== -1) {
          cut(btnStart, btnEnd + '</button>'.length, '4b. obMenuBtn button removido');
          found = true;
        }
      }
    }
    if (!found) break;
  }
})();

/* ==========================================================
 * 5. RESTAURAR details#meu-menu-abas:
 *    - Desembrulhar de <div class="ob-menu-row">
 *    - Restaurar margin original
 * ========================================================== */
(function restoreDetails() {
  /* Desembrulhar ob-menu-row: <div class="ob-menu-row">\n<details -> <details */
  let safety = 0;
  while (safety++ < 5) {
    const idx = html.indexOf('class="ob-menu-row"');
    if (idx === -1) break;
    const divStart = html.lastIndexOf('<div', idx);
    if (divStart === -1) break;
    /* Remover apenas a tag de abertura <div class="ob-menu-row"...> */
    const divOpenEnd = html.indexOf('>', idx);
    if (divOpenEnd === -1) break;
    /* Verificar se logo depois vem <details */
    const afterDiv = html.substring(divOpenEnd + 1, divOpenEnd + 200);
    if (afterDiv.trim().startsWith('<details')) {
      html = html.substring(0, divStart) + html.substring(divOpenEnd + 1);
      log.push('5a. ob-menu-row tag de abertura removida');
      /* Remover </div> de fechamento — esta apos </details> */
      const detailsClose = html.indexOf('</details>', html.indexOf('id="meu-menu-abas"'));
      if (detailsClose !== -1) {
        const after = detailsClose + '</details>'.length;
        /* Pular whitespace e procurar </div> */
        let pos = after;
        while (pos < html.length && /\s/.test(html[pos])) pos++;
        if (html.substring(pos, pos + 6) === '</div>') {
          html = html.substring(0, after) + html.substring(pos + 6);
          log.push('5b. ob-menu-row </div> de fechamento removido');
        }
      }
    } else {
      /* ob-menu-row nao envolve details — remover div inteiro */
      const closeDiv = html.indexOf('</div>', divOpenEnd);
      if (closeDiv !== -1) {
        cut(divStart, closeDiv + '</div>'.length, '5c. ob-menu-row div inteiro removido');
      } else break;
    }
  }

  /* Restaurar margin original */
  const dIdx = html.indexOf('id="meu-menu-abas"');
  if (dIdx !== -1) {
    const tagStart = html.lastIndexOf('<details', dIdx);
    const tagEnd = html.indexOf('>', dIdx);
    if (tagStart !== -1 && tagEnd !== -1) {
      let tag = html.substring(tagStart, tagEnd + 1);
      if (!tag.includes('margin: 10px 0 20px 0')) {
        /* Adicionar margin */
        tag = tag.replace(
          /style="([^"]*)"/,
          function(_, inner) {
            /* Adicionar margin se nao existe */
            if (inner.includes('margin')) return 'style="' + inner + '"';
            return 'style="margin: 10px 0 20px 0; ' + inner + '"';
          }
        );
        /* Se nao tem style de jeito nenhum */
        if (!tag.includes('style=')) {
          tag = tag.replace('>', ' style="margin: 10px 0 20px 0; position: relative; z-index: 9999;">');
        }
        html = html.substring(0, tagStart) + tag + html.substring(tagEnd + 1);
        log.push('5d. Margin original restaurada em details');
      }
    }
  }
})();

/* ==========================================================
 * 6. RESTAURAR project-selector:
 *    - Remover style="display:none!important"
 *    - Remover class="ob-hide"/"ob-escondido" do selectObra
 *    - Desembrulhar botoes de ob-hide-btn spans
 *    - Restaurar botoes Nuvem se estao em project-selector
 *    - Restaurar botoes Nuvem se estao em header-badges-right
 * ========================================================== */
(function restoreProjectSelector() {
  /* 6a. Remover display:none!important do project-selector */
  const psIdx = html.indexOf('class="project-selector"');
  if (psIdx === -1) return;
  const tagStart = html.lastIndexOf('<div', psIdx);
  const tagEnd = html.indexOf('>', psIdx);
  if (tagStart === -1 || tagEnd === -1) return;
  let tag = html.substring(tagStart, tagEnd + 1);
  const cleaned = tag
    .replace(/\s+style="display\s*:\s*none\s*!?\s*important?"/i, '')
    .replace(/\s+data-ob-empty="[^"]*"/, '');
  if (cleaned !== tag) {
    html = html.substring(0, tagStart) + cleaned + html.substring(tagEnd + 1);
    log.push('6a. project-selector display:none removido');
  }

  /* 6b. Remover ob-hide/ob-escondido do selectObra */
  const selIdx = html.indexOf('id="selectObra"');
  if (selIdx !== -1) {
    const selStart = html.lastIndexOf('<select', selIdx);
    const selEnd = html.indexOf('>', selIdx);
    if (selStart !== -1 && selEnd !== -1) {
      let selTag = html.substring(selStart, selEnd + 1);
      const cleaned2 = selTag
        .replace(/\s+class="ob-hide"/g, '')
        .replace(/\s+class="ob-escondido"/g, '')
        .replace(/\s+class="ob-hide ob-escondido"/g, '');
      if (cleaned2 !== selTag) {
        html = html.substring(0, selStart) + cleaned2 + html.substring(selEnd + 1);
        log.push('6b. selectObra classes ob- removidas');
      }
    }
  }

  /* 6c. Desembrulhar spans ob-hide-btn */
  let safety = 0;
  while (safety++ < 20) {
    const spanIdx = html.indexOf('class="ob-hide-btn"');
    if (spanIdx === -1) break;
    const spanStart = html.lastIndexOf('<span', spanIdx);
    const spanEnd = html.indexOf('</span>', spanIdx);
    if (spanStart === -1 || spanEnd === -1) break;
    const inner = html.substring(html.indexOf('>', spanIdx) + 1, spanEnd);
    html = html.substring(0, spanStart) + inner + html.substring(spanEnd + '</span>'.length);
    log.push('6c. span ob-hide-btn desembrulhado');
  }

  /* 6d. Desembrulhar spans style="display:none" que envolvem botoes obra */
  safety = 0;
  while (safety++ < 20) {
    /* Buscar spans com display:none que contenham botoes obra */
    const pat = /<span\s+style="display\s*:\s*none[^"]*"[^>]*>[\s\S]*?<\/span>/g;
    const m = pat.exec(html);
    if (!m) break;
    /* Verificar se contem botoes obra */
    if (m[0].includes('abrirModalObra') || m[0].includes('abrirModalNovaObra') ||
        m[0].includes('excluirObraAtual') || m[0].includes('ob-hide')) {
      const inner = m[0].replace(/^<span[^>]*>/, '').replace(/<\/span>$/, '');
      html = html.substring(0, m.index) + inner + html.substring(m.index + m[0].length);
      log.push('6d. span display:none (obra buttons) desembrulhado');
      pat.lastIndex = 0;
    }
  }

  /* 6e. Se Nuvem buttons estao em header-badges-right, mover de volta
     para project-selector */
  const hbIdx2 = html.indexOf('class="header-badges-right"');
  if (hbIdx2 !== -1) {
    const hbOpen = html.indexOf('>', hbIdx2) + 1;
    const hbClose = html.indexOf('</div>', hbOpen);
    if (hbClose !== -1) {
      let hbInner = html.substring(hbOpen, hbClose);
      /* Verificar se tem botoes Nuvem aqui */
      const hasNuvem = hbInner.includes('statusNuvem') || hbInner.includes('carregarBancoDaNuvem') || hbInner.includes('btnThemeToggle');
      if (hasNuvem) {
        /* Extrair botoes Nuvem */
        let nuvemBtns = '';
        /* statusNuvem */
        const snMatch = hbInner.match(/<span[^>]*id="statusNuvem"[^>]*>[\s\S]*?<\/span>/i);
        if (snMatch) nuvemBtns += snMatch[0] + '\n';
        /* Carregar Nuvem */
        const cnMatch = hbInner.match(/<button[^>]*onclick="carregarBancoDaNuvem\(\)"[^>]*>[\s\S]*?<\/button>/i);
        if (cnMatch) nuvemBtns += cnMatch[0] + '\n';
        /* btnThemeToggle */
        const ttMatch = hbInner.match(/<button[^>]*id="btnThemeToggle"[^>]*>[\s\S]*?<\/button>/i);
        if (ttMatch) nuvemBtns += ttMatch[0] + '\n';

        /* Remover de header-badges-right */
        let newHbInner = hbInner;
        if (snMatch) newHbInner = newHbInner.replace(snMatch[0], '');
        if (cnMatch) newHbInner = newHbInner.replace(cnMatch[0], '');
        if (ttMatch) newHbInner = newHbInner.replace(ttMatch[0], '');
        /* Limpar divs ob-nuvem-row restantes */
        const nrMatch = newHbInner.match(/<div[^>]*class="ob-nuvem-row"[^>]*>[\s\S]*?<\/div>/i);
        if (nrMatch) newHbInner = newHbInner.replace(nrMatch[0], '');

        html = html.substring(0, hbOpen) + newHbInner + html.substring(hbClose);

        /* Limpar classes ob- dos botoes Nuvem antes de inserir */
        nuvemBtns = nuvemBtns.replace(/\s+class="ob-nuvem-chip[^"]*"/gi, '');
        nuvemBtns = nuvemBtns.replace(/\s+class="ob-nuvem-btn"/gi, '');
        nuvemBtns = nuvemBtns.replace(/\s+class="ob-status"/gi, '');
        /* Restaurar classes originais */
        nuvemBtns = nuvemBtns.replace(
          /(<button[^>]*onclick="carregarBancoDaNuvem\(\)")\s*(?=>)/gi,
          '$1 class="secondary"'
        );
        nuvemBtns = nuvemBtns.replace(
          /(<button[^>]*id="btnThemeToggle")\s*(?=>)/gi,
          '$1 class="secondary"'
        );
        /* Garantir style original no statusNuvem */
        if (!nuvemBtns.includes('padding:4px 8px')) {
          nuvemBtns = nuvemBtns.replace(
            /(<span\s+id="statusNuvem")[^>]*>/gi,
            '$1 style="padding:4px 8px; border-radius:6px; font-size:0.75rem; background:#5f6b7a; color:#fff;">'
          );
        }

        /* Inserir botoes Nuvem no inicio do project-selector */
        const psOpen = html.indexOf('>', html.indexOf('class="project-selector"')) + 1;
        html = html.substring(0, psOpen) + '\n                ' + nuvemBtns + html.substring(psOpen);
        log.push('6e. Botoes Nuvem movidos de header-badges-right para project-selector');
      }
    }
  }

  /* 6f. Limpar classes ob- residuais nos botoes Nuvem DENTRO de project-selector */
  const ps2 = html.indexOf('class="project-selector"');
  if (ps2 !== -1) {
    const psOpen2 = html.indexOf('>', ps2) + 1;
    const psClose2 = html.indexOf('</div>', psOpen2);
    if (psClose2 !== -1) {
      let psInner = html.substring(psOpen2, psClose2);
      let changed = false;
      psInner = psInner.replace(/\s+class="ob-nuvem-chip[^"]*"/gi, function() { changed = true; return ''; });
      psInner = psInner.replace(/\s+class="ob-nuvem-btn"/gi, function() { changed = true; return ''; });
      psInner = psInner.replace(/\s+class="ob-status"/gi, function() { changed = true; return ''; });
      /* Restaurar class="secondary" nos botoes Nuvem */
      psInner = psInner.replace(
        /(<button[^>]*onclick="carregarBancoDaNuvem\(\)")(\s+class="[^"]*")?/gi,
        '$1 class="secondary"'
      );
      psInner = psInner.replace(
        /(<button[^>]*id="btnThemeToggle")(\s+class="[^"]*")?/gi,
        '$1 class="secondary"'
      );
      /* Garantir style do statusNuvem */
      if (psInner.includes('id="statusNuvem"') && !psInner.includes('padding:4px 8px')) {
        psInner = psInner.replace(
          /(<span\s+id="statusNuvem")\s+style="[^"]*"/gi,
          '$1 style="padding:4px 8px; border-radius:6px; font-size:0.75rem; background:#5f6b7a; color:#fff;"'
        );
      }
      if (changed) {
        html = html.substring(0, psOpen2) + psInner + html.substring(psClose2);
        log.push('6f. Classes ob- removidas dos botoes Nuvem em project-selector');
      }
    }
  }

  /* 6g. Garantir que fileRestoreInput e settings-menu estao em project-selector
     e NAO em .tabs */
  const hasFileInPS = html.indexOf('id="fileRestoreInput"') > psIdx &&
                      html.indexOf('id="fileRestoreInput"') < html.indexOf('</header>', psIdx);
  if (!hasFileInPS && psIdx !== -1) {
    /* fileRestoreInput nao esta em project-selector — procura-lo no arquivo */
    const frIdx = html.indexOf('id="fileRestoreInput"');
    if (frIdx !== -1) {
      const frTagStart = html.lastIndexOf('<input', frIdx);
      const frTagEnd = html.indexOf('>', frIdx);
      if (frTagStart !== -1 && frTagEnd !== -1) {
        const frTag = html.substring(frTagStart, frTagEnd + 1);
        /* Remover do local atual */
        html = html.substring(0, frTagStart) + html.substring(frTagEnd + 1);
        /* Inserir no final de project-selector, antes de </div> */
        const psClose3 = html.indexOf('</div>', html.indexOf('class="project-selector"'));
        if (psClose3 !== -1) {
          html = html.substring(0, psClose3) + '\n\n                ' + frTag + html.substring(psClose3);
          log.push('6g. fileRestoreInput restaurado para project-selector');
        }
      }
    }
  }
})();

/* ==========================================================
 * 7. REMOVER <script> BLOCOS OBMENU / GAVETA OBRAS
 *    SEGURO: so remove blocos cujo CONTEUDO INICIAL
 *    contem o marcador. Nunca cruza fronteiras de script.
 * ========================================================== */
(function removeObScripts() {
  let safety = 0;
  while (safety++ < 20) {
    let found = false;
    const markers = ['GAVETA OBRAS', 'PATCH OBRA DRAWER', 'window.OBMENU'];
    for (const marker of markers) {
      const mIdx = html.indexOf(marker);
      if (mIdx === -1) continue;
      /* Encontrar o <script> que contem este marcador */
      let sOpen = html.lastIndexOf('<script', mIdx);
      /* Verificar se esta dentro de um script (nao num texto qualquer) */
      if (sOpen === -1) continue;
      let sClose = html.indexOf('</script>', sOpen);
      if (sClose === -1 || sClose < mIdx) continue; /* marker apos fechamento = nao esta dentro */
      /* Verificar se o marcador esta realmente dentro do conteudo do script */
      const sContentStart = html.indexOf('>', sOpen) + 1;
      if (mIdx >= sContentStart && mIdx < sClose) {
        cut(sOpen, sClose + '</script>'.length, '7. Script ' + marker.substring(0, 20) + ' removido');
        found = true;
        break;
      }
    }
    if (!found) break;
  }
})();

/* ==========================================================
 * 8. REMOVER ob-settings-block de .tabs
 *    (se o patch v4-v6 moveu settings-menu para la)
 * ========================================================== */
(function removeObSettingsBlock() {
  let safety = 0;
  while (safety++ < 5) {
    const idx = html.indexOf('class="ob-settings-block"');
    if (idx === -1) break;
    const divStart = html.lastIndexOf('<div', idx);
    /* Preciso encontrar o fechamento correto — contar divs aninhados */
    const divOpenEnd = html.indexOf('>', idx);
    if (divStart === -1 || divOpenEnd === -1) break;
    let depth = 1, pos = divOpenEnd + 1, endPos = -1;
    while (pos < html.length && depth > 0) {
      const nOpen = html.indexOf('<div', pos);
      const nClose = html.indexOf('</div>', pos);
      if (nClose === -1) break;
      if (nOpen !== -1 && nOpen < nClose) { depth++; pos = nOpen + 4; }
      else { depth--; if (depth === 0) endPos = nClose; pos = nClose + 6; }
    }
    if (endPos !== -1) {
      cut(divStart, endPos + '</div>'.length, '8. ob-settings-block removido de .tabs');
    } else break;
  }
})();

/* ==========================================================
 * 9. LIMPAR linhas em branco excessivas
 * ========================================================== */
html = html.replace(/\n{4,}/g, '\n\n\n');

/* ==========================================================
 * 10. VERIFICACAO FINAL
 * ========================================================== */
const obResiduals = (html.match(/\bob-[a-z]+/gi) || []).filter(m =>
  !/^(obrig|obj|observ|obsole|obter|object|obstru|obtido)/i.test(m)
);
if (obResiduals.length > 0) {
  console.warn('[ATENCAO] Classes ob- residuais:', obResiduals.slice(0, 15).join(', '));
}

/* ==========================================================
 * GRAVAR
 * ========================================================== */
fs.writeFileSync(FILE, html, 'utf8');

console.log('\n══════════════════════════════════════════');
console.log('Reversao completa: ' + log.length + ' operacoes');
log.forEach(function(l) { console.log('  OK ' + l); });
console.log('Tamanho: ' + origLen + ' -> ' + html.length + ' bytes');
console.log('══════════════════════════════════════════\n');
console.log('Agora rode:');
console.log('  git add index.html');
console.log('  git commit -m "Reverte obraDrawer v2-v6: restaura header original"');
console.log('  git push');
