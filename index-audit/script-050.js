
                /* PATCH108 - nucleo unico de seguranca do painel.
                   Reune o que antes estava copiado em varios trechos:
                   chaves de armazenamento, calculo da senha, leitura da sessao
                   e nome amigavel do tipo de acesso. */
                (function () {
                  'use strict';
                  /* patch110: nome proprio, para o bloco antigo de login nao apagar isto */
                  if (window.PainelNucleo && window.PainelNucleo.sha256) { return; }
                
                  var K_USERS = 'painel_seg_usuarios_v1';
                  var K_SESS  = 'painel_seg_sessao_v1';
                
                  var _K = [1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];
                
                  function sha256(str) {
                    var bytes = [], i, s = encodeURIComponent(String(str));
                    for (i = 0; i < s.length; i++) {
                      if (s.charAt(i) === '%') { bytes.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
                      else { bytes.push(s.charCodeAt(i)); }
                    }
                    var l = bytes.length;
                    bytes.push(0x80);
                    while (bytes.length % 64 !== 56) { bytes.push(0); }
                    var bits = l * 8;
                    bytes.push(0, 0, 0, 0);
                    bytes.push((bits >>> 24) & 255, (bits >>> 16) & 255, (bits >>> 8) & 255, bits & 255);
                    var H = [1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];
                    var w = new Array(64);
                    function rr(x, n) { return (x >>> n) | (x << (32 - n)); }
                    for (var off = 0; off < bytes.length; off += 64) {
                      for (i = 0; i < 16; i++) {
                        w[i] = (bytes[off+i*4] << 24) | (bytes[off+i*4+1] << 16) | (bytes[off+i*4+2] << 8) | bytes[off+i*4+3];
                      }
                      for (i = 16; i < 64; i++) {
                        var s0 = rr(w[i-15],7) ^ rr(w[i-15],18) ^ (w[i-15] >>> 3);
                        var s1 = rr(w[i-2],17) ^ rr(w[i-2],19) ^ (w[i-2] >>> 10);
                        w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
                      }
                      var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
                      for (i = 0; i < 64; i++) {
                        var S1 = rr(e,6) ^ rr(e,11) ^ rr(e,25);
                        var ch = (e & f) ^ ((~e) & g);
                        var t1 = (h + S1 + ch + _K[i] + w[i]) | 0;
                        var S0 = rr(a,2) ^ rr(a,13) ^ rr(a,22);
                        var mj = (a & b) ^ (a & c) ^ (b & c);
                        var t2 = (S0 + mj) | 0;
                        h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
                      }
                      H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+c)|0; H[3]=(H[3]+d)|0;
                      H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
                    }
                    var out = '';
                    for (i = 0; i < 8; i++) { out += ('00000000' + (H[i] >>> 0).toString(16)).slice(-8); }
                    return out;
                  }
                
                  function hashSenha(usuario, senha) {
                    return sha256('ps79|' + String(usuario).toLowerCase() + '|' + String(senha));
                  }
                
                  function sessao() {
                    var s = null;
                    try { s = JSON.parse(sessionStorage.getItem(K_SESS) || 'null'); } catch (e) { s = null; }
                    /* PATCH_podeMexer: se sessão do sessionStorage expirou, limpa e cai para localStorage */
                    if (s && s.exp && Date.now() > s.exp) {
                      try { sessionStorage.removeItem(K_SESS); } catch (e3) {}
                      s = null;
                    }
                    if (!s) {
                      try { s = JSON.parse(localStorage.getItem(K_SESS) || 'null'); } catch (e) { s = null; }
                    }
                    if (s && s.exp && Date.now() > s.exp) {
                      try { localStorage.removeItem(K_SESS); } catch (e4) {}
                      s = null;
                    }
                    return s;
                  }
                
                  function nomePerfil(p) {
                    var v = String(p || '').toLowerCase();
                    if (v === 'admin') { return 'Administrador'; }
                    if (v === 'editor') { return 'Pode lançar e editar'; }
                    if (v === 'visitante' || v === 'leitor') { return 'Somente consulta'; }
                    return p ? String(p) : 'Sem tipo definido';
                  }
                
                  window.PainelNucleo = {
                    K_USERS: K_USERS,
                    K_SESS: K_SESS,
                    sha256: sha256,
                    hashSenha: hashSenha,
                    sessao: sessao,
                    nomePerfil: nomePerfil
                  };
                })();
            
