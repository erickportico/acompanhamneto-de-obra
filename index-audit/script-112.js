
        (function () {
          "use strict";
          if (window.__pFixCustoDup) return;
          window.__pFixCustoDup = true;
          function chave(c) {
            var cat = String(c.categoria || "").toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (/produc/.test(cat) || /pagamento produc/.test(cat)) cat = "producao";
            return [
              String(c.obraId || ""),
              String(c.data || "").slice(0, 10),
              String(c.colaborador || "").trim().toLowerCase(),
              String(Math.round((Number(c.valor) || 0) * 100)),
              cat
            ].join("|");
          }
          function dedup(lista) {
            var seen = {};
            var out = [];
            for (var i = 0; i < lista.length; i++) {
              var c = lista[i] || {};
              var id = String(c.id || "");
              if (id.indexOf("pgto-") === 0) continue;
              var k = chave(c);
              if (seen[k]) continue;
              seen[k] = 1;
              out.push(c);
            }
            return out;
          }
          function wrap() {
            var fn = window.getCustosFiltered;
            if (typeof fn !== "function" || fn.__dedup) return false;
            var orig = fn;
            var w = function () { return dedup(orig.apply(this, arguments) || []); };
            w.__dedup = true;
            window.getCustosFiltered = w;
            try { getCustosFiltered = w; } catch (e) {}
            return true;
          }
          var n = 0;
          function tick() {
            wrap();
            n += 1;
            if (n < 20) setTimeout(tick, 400);
          }
          if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
          else tick();
        })();
    
