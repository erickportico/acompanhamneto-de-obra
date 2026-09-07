/**
 * validate.js — compara contagens do JSON legados vs tabelas
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LINHA_ID = Number(process.env.PAINEL_DADOS_ID || 1);

if (!URL || !KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const sb = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function countTable(t) {
  const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
  if (error) return { error: error.message, count: null };
  return { count };
}

async function main() {
  console.log('Validação JSON × tabelas\n');

  const { data, error } = await sb
    .from('painel_dados')
    .select('dados')
    .eq('id', LINHA_ID)
    .maybeSingle();

  if (error || !data?.dados) {
    console.error('Não li painel_dados:', error?.message || 'vazio');
    process.exit(1);
  }

  const obras = data.dados.obras || [];
  let itens = 0, receb = 0, colab = 0, lanc = 0, med = 0, ctmS = 0, crono = 0;
  for (const o of obras) {
    itens += (o.itens || []).length;
    receb += (o.recebimentos || []).length;
    colab += (o.colaboradores || []).length;
    lanc += (o.lancamentosProducao || []).length;
    ctmS += (o.ctmExtraSpecs || []).length;
    if (Array.isArray(o.cronogramaTasks)) crono += o.cronogramaTasks.length;
    for (const it of o.itens || []) {
      if (it.historicoMedicoes) med += Object.keys(it.historicoMedicoes).length;
    }
  }

  const json = {
    obras: obras.length,
    itens,
    recebimentos: receb,
    colaboradores: colab,
    lancamentos: lanc,
    medicoes: med,
    ctm_specs: ctmS,
    cronograma: crono,
  };

  const tables = {
    obras: 'obras',
    itens: 'itens',
    recebimentos: 'recebimentos',
    colaboradores: 'colaboradores',
    lancamentos: 'lancamentos_producao',
    medicoes: 'item_medicoes',
    ctm_specs: 'ctm_extra_specs',
    cronograma: 'cronograma_tarefas',
  };

  console.log('Campo'.padEnd(16), 'JSON'.padStart(8), 'Banco'.padStart(8), 'Status');
  console.log('-'.repeat(44));

  let ok = true;
  for (const [k, table] of Object.entries(tables)) {
    const r = await countTable(table);
    const j = json[k];
    const b = r.count;
    let status = 'OK';
    if (r.error) {
      status = 'ERRO: ' + r.error;
      ok = false;
    } else if (b !== j) {
      // colaboradores pode divergir por merge com colaboradoresPgto
      status = k === 'colaboradores' ? 'VERIFICAR' : 'DIVERGE';
      if (k !== 'colaboradores') ok = false;
    }
    console.log(k.padEnd(16), String(j).padStart(8), String(b).padStart(8), status);
  }

  // amostra de obras
  console.log('\nAmostra de obras (nome + qtd itens no banco):');
  const { data: obrasDb } = await sb.from('obras').select('id, nome').limit(20);
  for (const o of obrasDb || []) {
    const { count } = await sb
      .from('itens')
      .select('*', { count: 'exact', head: true })
      .eq('obra_id', o.id);
    console.log(`  - ${o.nome}: ${count} item(ns)`);
  }

  console.log(ok ? '\n✓ Validação básica OK' : '\n✗ Há divergências — revise o log');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
