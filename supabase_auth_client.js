/**
 * supabase_auth_client.js
 * Coloque na MESMA pasta do index.html
 * O painel carrega: <script src="supabase_auth_client.js"></script>
 */
(function () {
  'use strict';
  if (window.PainelAuthSupabase && window.PainelAuthSupabase.entrarComEmail) {
    console.log('[auth-client] PainelAuthSupabase ja existia');
    return;
  }

  function cliente() {
    try {
      if (typeof _supabase !== 'undefined' && _supabase) return _supabase;
    } catch (e) {}
    return window._supabase || window.supabaseClient || null;
  }

  function esperarCliente(ms) {
    ms = ms || 8000;
    return new Promise(function (resolve, reject) {
      var t0 = Date.now();
      (function tick() {
        var c = cliente();
        if (c && c.auth) return resolve(c);
        if (Date.now() - t0 > ms) return reject(new Error('Cliente Supabase nao carregou'));
        setTimeout(tick, 50);
      })();
    });
  }

  function perfilPadrao(user, linha) {
    linha = linha || {};
    return {
      usuario: linha.email || (user && user.email) || '',
      nome: linha.nome || '',
      perfil: linha.perfil || 'visitante',
      ativo: linha.ativo !== false,
      trocar: !!linha.trocar_senha,
      id: linha.id || (user && user.id) || null
    };
  }

  async function buscarPerfil(sb, userId) {
    var r = await sb.from('painel_perfis').select('*').eq('id', userId).limit(1);
    if (r.error) throw r.error;
    return (r.data && r.data[0]) || null;
  }

  async function entrarComEmail(email, senha) {
    var sb = await esperarCliente();
    var auth = await sb.auth.signInWithPassword({
      email: String(email || '').trim().toLowerCase(),
      password: String(senha || '')
    });
    if (auth.error) throw auth.error;
    var user = auth.data && auth.data.user;
    if (!user) throw new Error('Login sem usuario');

    var linha = null;
    try { linha = await buscarPerfil(sb, user.id); } catch (e) { console.warn('[auth-client] perfil', e); }
    if (linha && linha.ativo === false) {
      try { await sb.auth.signOut(); } catch (e2) {}
      throw new Error('Esta conta esta bloqueada. Fale com o administrador.');
    }
    if (!linha) {
      linha = {
        id: user.id,
        email: user.email,
        nome: (user.email || '').split('@')[0],
        perfil: 'visitante',
        ativo: true,
        trocar_senha: false
      };
    }
    return { user: user, perfil: perfilPadrao(user, linha) };
  }

  async function cadastrarComEmail(email, senha, nome, usuario, perfil) {
    var sb = await esperarCliente();
    var sign = await sb.auth.signUp({
      email: String(email || '').trim().toLowerCase(),
      password: String(senha || ''),
      options: { data: { nome: nome || '', perfil: perfil || 'visitante' } }
    });
    if (sign.error) throw sign.error;
    return sign.data;
  }

  async function listarPerfis() {
    var sb = await esperarCliente();
    var r = await sb.from('painel_perfis').select('*').order('email');
    if (r.error) throw r.error;
    return r.data || [];
  }

  async function salvarPerfil(id, mudanca) {
    var sb = await esperarCliente();
    var r = await sb.from('painel_perfis').update(mudanca).eq('id', id);
    if (r.error) throw r.error;
    return r.data;
  }

  window.PainelAuthSupabase = {
    entrarComEmail: entrarComEmail,
    cadastrarComEmail: cadastrarComEmail,
    listarPerfis: listarPerfis,
    salvarPerfil: salvarPerfil
  };

  console.log('[auth-client] PainelAuthSupabase pronto');
})();
