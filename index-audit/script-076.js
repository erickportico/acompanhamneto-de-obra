
        /* Patch 107 - deixa o tipo de acesso guardado sempre em letras minusculas,
           sem espacos sobrando. Assim o painel reconhece o administrador mesmo que
           a nuvem tenha devolvido "Admin" ou " ADMIN ". */
        (function () {
          var CHAVE = 'painel_seg_sessao_v1';
        
          function arrumar(texto) {
            if (!texto) { return null; }
            var s = null;
            try { s = JSON.parse(texto); } catch (e) { return null; }
            if (!s || typeof s !== 'object') { return null; }
            var antes = s.perfil;
            var limpo = String(antes == null ? '' : antes).trim().toLowerCase();
            if (limpo === 'administrador' || limpo === 'administrator') { limpo = 'admin'; }
            if (limpo === 'leitor' || limpo === 'consulta') { limpo = 'visitante'; }
            if (limpo === String(antes)) { return null; }
            s.perfil = limpo;
            return JSON.stringify(s);
          }
        
          function limpar(dep) {
            try {
              var novo = arrumar(dep.getItem(CHAVE));
              if (novo) { dep.setItem(CHAVE, novo); }
            } catch (e) { /* ignora */ }
          }
        
          function rodar() {
            try { limpar(window.sessionStorage); } catch (e) { /* ignora */ }
            try { limpar(window.localStorage); } catch (e) { /* ignora */ }
          }
        
          rodar();
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', rodar);
          }
          window.setTimeout(rodar, 1200);
        })();
    
