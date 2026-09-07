/**
 * migrate.js — painel_dados (JSON) → tabelas normalizadas
 *
 * Uso:
 *   npm run dry        # simula (não grava)
 *   npm run migrate    # grava de verdade
 *
 * Requer:
 *   1. 001_schema_e_rls.sql já executado no Supabase
 *   2. arquivo .env preenchido (veja .env.example)
 *   3. pelo menos 1 admin em painel_perfis (recomendado)
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LINHA_ID = Number(process.env.PAINEL_DADOS_ID || 1);
const DRY = String(process.env.DRY_RUN || 'true').toLowerCase() !== 'false';

if (!URL || !KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
  process.exit(1);
}

const sb = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stats = {
  obras: 0,
  itens: 0,
  medicoes: 0,
  recebimentos: 0,
  colaboradores: 0,
  lancamentos: 0,
  centros: 0,
  ctmSpecs: 0,
  ctmLogs: 0,
  cronograma: 0,
  obraflow: 0,
  membros: 0,
  erros: [],
};

function uuidFromLegado(prefix, legado) {
  const hash = crypto.createHash('sha1').update(String(prefix) + '::' + String(legado)).digest();
  const bytes = Buffer.from(hash.slice(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = bytes.toString('hex');
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join('-');
}

function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ''));
}

function str(v, def = '') {
  if (v === null || v === undefined) return def;
  return String(v);
}

function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function bool(v, def = true) {
  if (v === undefined || v === null || v === '') return def;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  if (['false', '0', 'nao', 'não', 'no'].includes(s)) return false;
  if (['true', '1', 'sim', 'yes'].includes(s)) return true;
  return def;
}

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function omit(obj, keys) {
  const out = { ...(obj || {}) };
  for (const k of keys) delete out[k];
  return out;
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return { data: [], error: null };
  if (DRY) {
    console.log(`  [DRY] ${table}: ${rows.length} linha(s)`);
    return { data: rows, error: null };
  }
  const lote = 150;
  for (let i = 0; i < rows.length; i += lote) {
    const fatia = rows.slice(i, i + lote);
    const { error } = await sb.from(table).upsert(fatia, { onConflict });
    if (error) {
      console.error(`  ERRO ${table}:`, error.message);
      return { data: null, error };
    }
  }
  return { data: rows, error: null };
}

async function carregarBlob() {
  console.log(`\nLendo painel_dados id=${LINHA_ID}...`);
  const { data, error } = await sb
    .from('painel_dados')
    .select('id, dados, updated_at')
    .eq('id', LINHA_ID)
    .maybeSingle();

  if (error) throw new Error('Falha ao ler painel_dados: ' + error.message);
  if (!data || !data.dados) throw new Error('painel_dados vazio ou inexistente');

  const obras = Array.isArray(data.dados.obras) ? data.dados.obras : [];
  console.log(`  updated_at: ${data.updated_at}`);
  console.log(`  obras no JSON: ${obras.length}`);

  const nome = path.join(
    __dirname,
    `backup_painel_dados_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(nome, JSON.stringify(data, null, 2), 'utf8');
  console.log(`  backup local: ${path.basename(nome)}`);
  return data.dados;
}

function contarJson(blob) {
  const obras = blob.obras || [];
  let itens = 0, receb = 0, colab = 0, lanc = 0, med = 0;
  for (const o of obras) {
    itens += (o.itens || []).length;
    receb += (o.recebimentos || []).length;
    colab += (o.colaboradores || []).length;
    lanc += (o.lancamentosProducao || []).length;
    for (const it of o.itens || []) {
      if (it.historicoMedicoes) med += Object.keys(it.historicoMedicoes).length;
    }
  }
  return { obras: obras.length, itens, receb, colab, lanc, med };
}

async function listarAdmins() {
  const { data, error } = await sb
    .from('painel_perfis')
    .select('id, email, perfil, ativo')
    .eq('ativo', true);
  if (error) {
    console.warn('  Não li painel_perfis:', error.message);
    return [];
  }
  const admins = (data || []).filter((p) => String(p.perfil || '').toLowerCase() === 'admin');
  console.log(`  admins ativos: ${admins.length}`);
  return admins;
}

async function migrarConfig(blob) {
  console.log('\n→ painel_config');
  await upsert('painel_config', [{
    id: 1,
    config: blob.config || {},
    agenda_obras: str(blob.agendaObras, ''),
    versao_banco: str(blob.versaoBanco, 'migrado-json'),
    atualizado_em: new Date().toISOString(),
  }], 'id');
}

function resolverObraId(idLegado) {
  const leg = str(idLegado);
  if (isUuid(leg)) return leg;
  return uuidFromLegado('obra', leg || crypto.randomBytes(8).toString('hex'));
}

async function migrarItens(obra, obraId) {
  const itens = Array.isArray(obra.itens) ? obra.itens : [];
  const rows = [];
  const maps = [];
  const medicoes = [];

  for (const it of itens) {
    const idLegado = str(it.id || `${it.ref}-${Math.random()}`);
    const itemId = isUuid(idLegado) ? idLegado : uuidFromLegado('item:' + obraId, idLegado);

    rows.push({
      id: itemId,
      obra_id: obraId,
      id_legado: idLegado,
      ref: str(it.ref),
      tipo: str(it.tipo),
      loc: str(it.loc),
      vidro: str(it.vidro),
      qtd: num(it.qtd, 1),
      larg: num(it.larg),
      alt: num(it.alt),
      fem: num(it.fem),
      fabricado: num(it.fabricado),
      instalado: num(it.instalado),
      data_instalacao: toDate(it.dataInstalacao),
      has_bottom: bool(it.hasBottom, true),
      ctm_profile: str(it.ctmProfile, 'largo'),
      dados_extras: omit(it, [
        'id', 'ref', 'tipo', 'loc', 'vidro', 'qtd', 'larg', 'alt',
        'fem', 'fabricado', 'instalado', 'dataInstalacao',
        'hasBottom', 'ctmProfile', 'historicoMedicoes',
        'm2MedicaoAnterior', 'm2MedicaoAtual',
      ]),
      atualizado_em: new Date().toISOString(),
    });
    maps.push({ obra_id: obraId, id_legado: idLegado, item_id: itemId });

    let hist = it.historicoMedicoes && typeof it.historicoMedicoes === 'object'
      ? { ...it.historicoMedicoes } : {};
    if (it.m2MedicaoAnterior != null && hist[1] == null) hist[1] = it.m2MedicaoAnterior;
    if (it.m2MedicaoAtual != null) {
      const k = obra.numMedicaoMax || 1;
      if (hist[k] == null) hist[k] = it.m2MedicaoAtual;
    }
    for (const [k, v] of Object.entries(hist)) {
      const n = parseInt(k, 10);
      if (!Number.isFinite(n)) continue;
      medicoes.push({ item_id: itemId, num_medicao: n, m2: num(v) });
    }
  }

  await upsert('itens', rows, 'id');
  stats.itens += rows.length;
  await upsert('item_id_map', maps, 'obra_id,id_legado');
  await upsert('item_medicoes', medicoes, 'item_id,num_medicao');
  stats.medicoes += medicoes.length;
}

async function migrarRecebimentos(obra, obraId) {
  const lista = Array.isArray(obra.recebimentos) ? obra.recebimentos : [];
  const rows = lista.map((r, i) => {
    const idLegado = str(r.id || `rec-${i}`);
    return {
      id: isUuid(idLegado) ? idLegado : uuidFromLegado('rec:' + obraId, idLegado),
      obra_id: obraId,
      id_legado: idLegado,
      data: toDate(r.data),
      lista_corte: str(r.listaCorte),
      nf: str(r.nf),
      classe: str(r.classe),
      marca: str(r.marca),
      codigo_cor: str(r.codigoCor),
      descricao: str(r.descricao),
      fornecedor: str(r.fornecedor),
      material: str(r.material),
      ref: str(r.ref),
      responsavel: str(r.responsavel),
      local: str(r.local),
      obs: str(r.obs),
      qtd_prevista: num(r.qtdPrevista),
      qtd_recebida: num(r.qtdRecebida),
      status: str(r.status, 'Pendente'),
      dados_extras: r,
      atualizado_em: new Date().toISOString(),
    };
  });
  await upsert('recebimentos', rows, 'id');
  stats.recebimentos += rows.length;
}

async function migrarColaboradores(obra, obraId) {
  const mapa = new Map();
  function add(c, origem) {
    if (!c) return;
    const idLegado = str(c.id || c.nome);
    if (!idLegado) return;
    const colabId = isUuid(idLegado) ? idLegado : uuidFromLegado('colab:' + obraId, idLegado);
    const prev = mapa.get(idLegado) || {
      id: colabId,
      obra_id: obraId,
      id_legado: idLegado,
      nome: str(c.nome, 'Sem nome'),
      funcao: str(c.funcao),
      empresa: str(c.empresa),
      dados_extras: {},
      atualizado_em: new Date().toISOString(),
    };
    prev.nome = str(c.nome, prev.nome);
    prev.funcao = str(c.funcao, prev.funcao);
    prev.empresa = str(c.empresa, prev.empresa);
    prev.dados_extras = {
      ...prev.dados_extras,
      ...c,
      origem: [...new Set([...(prev.dados_extras.origem || []), origem])],
    };
    if (c.valorPagoManual) {
      prev.dados_extras.valorPagoManual = {
        ...(prev.dados_extras.valorPagoManual || {}),
        ...c.valorPagoManual,
      };
    }
    mapa.set(idLegado, prev);
  }
  for (const c of obra.colaboradores || []) add(c, 'colaboradores');
  for (const c of obra.colaboradoresPgto || []) add(c, 'colaboradoresPgto');

  const rows = [...mapa.values()];
  const maps = rows.map((r) => ({
    obra_id: obraId,
    id_legado: r.id_legado,
    colab_id: r.id,
  }));
  await upsert('colaboradores', rows, 'id');
  await upsert('colab_id_map', maps, 'obra_id,id_legado');
  stats.colaboradores += rows.length;
}

async function migrarLancamentos(obra, obraId) {
  const lista = Array.isArray(obra.lancamentosProducao) ? obra.lancamentosProducao : [];
  const rows = lista.map((l, i) => {
    const idLegado = str(l.id || `lanc-${i}`);
    return {
      id: isUuid(idLegado) ? idLegado : uuidFromLegado('lanc:' + obraId, idLegado),
      obra_id: obraId,
      id_legado: idLegado,
      dados: l,
      mes_ref: str(l.mesAnoKey || l.mes || ''),
      atualizado_em: new Date().toISOString(),
    };
  });
  await upsert('lancamentos_producao', rows, 'id');
  stats.lancamentos += rows.length;
}

async function migrarCentros(obra, obraId) {
  const lista = Array.isArray(obra.centrosCusto) ? obra.centrosCusto : [];
  const rows = lista.map((c, i) => {
    const idLegado = str(c.id || `cc-${i}`);
    return {
      id: isUuid(idLegado) ? idLegado : uuidFromLegado('cc:' + obraId, idLegado),
      obra_id: obraId,
      id_legado: idLegado,
      dados: c,
    };
  });
  await upsert('centros_custo', rows, 'id');
  stats.centros += rows.length;
}

async function migrarCtm(obra, obraId) {
  const specs = Array.isArray(obra.ctmExtraSpecs) ? obra.ctmExtraSpecs : [];
  const rowsSpecs = specs.map((s, i) => ({
    id: uuidFromLegado('ctms:' + obraId, str(s.ref || i)),
    obra_id: obraId,
    ref: str(s.ref),
    type: str(s.type),
    l_mm: parseInt(s.L ?? s.l_mm ?? 0, 10) || 0,
    h_mm: parseInt(s.H ?? s.h_mm ?? 0, 10) || 0,
    qty: parseInt(s.qty ?? 1, 10) || 1,
    has_bottom: bool(s.hasBottom, true),
    ctm_profile: str(s.ctmProfile, 'largo'),
    dados_extras: s,
  }));
  await upsert('ctm_extra_specs', rowsSpecs, 'id');
  stats.ctmSpecs += rowsSpecs.length;

  const logs = Array.isArray(obra.ctmLogs) ? obra.ctmLogs : [];
  const rowsLogs = logs.map((l, i) => ({
    id: uuidFromLegado('ctml:' + obraId, str(l.id || i)),
    obra_id: obraId,
    dados: l,
  }));
  await upsert('ctm_logs', rowsLogs, 'id');
  stats.ctmLogs += rowsLogs.length;
}

async function migrarCronograma(obra, obraId) {
  if (!Array.isArray(obra.cronogramaTasks)) return;
  const rows = obra.cronogramaTasks.map((t, i) => {
    const idLegado = str(t.id || `task-${i}`);
    return {
      id: isUuid(idLegado) ? idLegado : uuidFromLegado('crono:' + obraId, idLegado),
      obra_id: obraId,
      id_legado: idLegado,
      ordem: i,
      grupo: str(t.group || t.grupo),
      tarefa: str(t.name || t.tarefa || t.task),
      inicio: toDate(t.start || t.inicio),
      fim: toDate(t.end || t.fim),
      status: str(t.status),
      cor: str(t.color || t.cor),
      dados: t,
    };
  });
  await upsert('cronograma_tarefas', rows, 'id');
  stats.cronograma += rows.length;
}

async function migrarObraflow(obra, obraId) {
  if (!obra.obraflow || typeof obra.obraflow !== 'object') return;
  await upsert('obraflow_tarefas', [{
    id: uuidFromLegado('oflow', obraId),
    obra_id: obraId,
    ordem: 0,
    dados: obra.obraflow,
  }], 'id');
  stats.obraflow++;
}

async function migrarObra(obra, admins) {
  const idLegado = str(obra.id || obra.nome || crypto.randomUUID());
  const obraId = resolverObraId(idLegado);
  const CAMPOS = [
    'id', 'nome', 'numContrato', 'valorContrato', 'pctServico', 'numMedicaoMax',
    'consideracoesPorMedicao', 'medicoesFinais', 'itens', 'recebimentos',
    'colaboradores', 'colaboradoresPgto', 'lancamentosProducao', 'centrosCusto',
    'ctmExtraSpecs', 'ctmLogs', 'cronogramaTasks', 'cronogramaTitle',
    'obraflow', 'lancExcluidos',
  ];

  const r1 = await upsert('obras', [{
    id: obraId,
    nome: str(obra.nome, 'Sem nome'),
    num_contrato: str(obra.numContrato),
    valor_contrato: num(obra.valorContrato),
    pct_servico: num(obra.pctServico, 20),
    num_medicao_max: Math.max(1, parseInt(obra.numMedicaoMax, 10) || 1),
    consideracoes: obra.consideracoesPorMedicao || {},
    medicoes_finais: obra.medicoesFinais || {},
    cronograma_title: str(obra.cronogramaTitle),
    dados_extras: {
      ...omit(obra, CAMPOS),
      id_legado: idLegado,
      lancExcluidos: obra.lancExcluidos || [],
    },
    criado_por: admins[0]?.id || null,
    atualizado_em: new Date().toISOString(),
  }], 'id');

  if (r1.error) {
    stats.erros.push({ obra: idLegado, erro: r1.error.message });
    return null;
  }
  stats.obras++;

  await upsert('obra_id_map', [{ id_legado: idLegado, obra_id: obraId }], 'id_legado');

  const membros = admins.map((a) => ({
    obra_id: obraId,
    user_id: a.id,
    papel: 'dono',
  }));
  if (membros.length) {
    await upsert('obra_membros', membros, 'obra_id,user_id');
    stats.membros += membros.length;
  }

  await migrarItens(obra, obraId);
  await migrarRecebimentos(obra, obraId);
  await migrarColaboradores(obra, obraId);
  await migrarLancamentos(obra, obraId);
  await migrarCentros(obra, obraId);
  await migrarCtm(obra, obraId);
  await migrarCronograma(obra, obraId);
  await migrarObraflow(obra, obraId);
  return obraId;
}

async function contarBanco() {
  if (DRY) return null;
  const q = async (t) => {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    return error ? -1 : count;
  };
  return {
    obras: await q('obras'),
    itens: await q('itens'),
    recebimentos: await q('recebimentos'),
    colaboradores: await q('colaboradores'),
    lancamentos: await q('lancamentos_producao'),
    medicoes: await q('item_medicoes'),
  };
}

async function main() {
  console.log('========================================');
  console.log(' Migração painel_dados → tabelas');
  console.log(' DRY_RUN =', DRY);
  console.log('========================================');

  const blob = await carregarBlob();
  const jsonCount = contarJson(blob);
  console.log('\nContagem JSON:', jsonCount);

  const admins = await listarAdmins();
  if (!admins.length) {
    console.warn(
      '\n⚠️  Nenhum admin em painel_perfis. Obras podem ficar sem membros.\n' +
      '    Com RLS ativo, usuários comuns não verão as obras.'
    );
  }

  await migrarConfig(blob);

  console.log('\n→ obras e filhos');
  for (const obra of blob.obras || []) {
    if (!obra || !obra.nome) {
      console.warn('  pulando obra sem nome', obra && obra.id);
      continue;
    }
    process.stdout.write(`  • ${obra.nome} (${obra.id}) ... `);
    const id = await migrarObra(obra, admins);
    console.log(id ? 'ok' : 'FALHOU');
  }

  console.log('\n========== RESUMO ==========');
  console.log(JSON.stringify(stats, null, 2));

  const dbCount = await contarBanco();
  if (dbCount) {
    console.log('\nContagem no banco:', dbCount);
    console.log('Compare com JSON:', jsonCount);
  }

  if (stats.erros.length) {
    console.log('\nErros:');
    for (const e of stats.erros) console.log(' ', e);
  }

  if (DRY) {
    console.log('\nNada foi gravado (DRY_RUN=true).');
    console.log('Para gravar: npm run migrate   ou   DRY_RUN=false node migrate.js');
  } else {
    console.log('\nMigração concluída. Rode: npm run validate');
  }
}

main().catch((e) => {
  console.error('\nFalha fatal:', e);
  process.exit(1);
});
