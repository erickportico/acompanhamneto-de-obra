
        /* PATCH V17-G: diagnostico - verifica codigo JS visivel na pagina */
          (function(){
            setTimeout(function(){
              var suspeitos = [];
              document.querySelectorAll("body > *").forEach(function(el){
                if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "LINK") return;
                var txt = (el.textContent || "").trim();
                if (txt.indexOf("function ") >= 0 && txt.indexOf("{") >= 0 && txt.length > 200
                    && el.tagName !== "TEXTAREA" && !el.querySelector("script")) {
                  suspeitos.push({tag: el.tagName, id: el.id, cls: el.className, len: txt.length,
                    preview: txt.substring(0, 80)});
                  el.style.display = "none";
                }
              });
              if (suspeitos.length > 0) {
                console.warn("[V17-DIAG] Codigo JS visivel encontrado em:", suspeitos);
              } else {
                console.log("[V17-DIAG] Nenhum codigo JS visivel detectado.");
              }
            }, 3000);
          })();
    
