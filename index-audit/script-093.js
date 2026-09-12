
        /* PATCH154: P131 desabilitado – stubs */
        window.P131 = {
          travar: function() { try { console.log("[P154] P131 stub: travar desabilitado"); } catch(e){} },
          destravar: function() { try { console.log("[P154] P131 stub: destravar desabilitado"); } catch(e){} },
          desligarBotoes: function() {},
          ligarBotoes: function() {},
          podeMexer: function() { return true; }
        };
        window.__p131 = true;
        try { console.log("[PATCH154] P131 stub carregado – bloqueio desabilitado"); } catch(e){}
    
