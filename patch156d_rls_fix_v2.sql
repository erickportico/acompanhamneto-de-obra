-- ============================================================
-- Patch 156d v2 — RLS para 4 tabelas do painel
-- Projeto: eqtxfpjrqlkhqgckbyxb
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1) painel_dados — SELECT + UPSERT para usuarios anonimos
ALTER TABLE painel_dados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_painel_dados" ON painel_dados;
CREATE POLICY "anon_select_painel_dados" ON painel_dados
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_upsert_painel_dados" ON painel_dados;
CREATE POLICY "anon_upsert_painel_dados" ON painel_dados
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_painel_dados" ON painel_dados;
CREATE POLICY "anon_update_painel_dados" ON painel_dados
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 2) painel_nuvem — SELECT + UPSERT
ALTER TABLE painel_nuvem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_painel_nuvem" ON painel_nuvem;
CREATE POLICY "anon_select_painel_nuvem" ON painel_nuvem
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_painel_nuvem" ON painel_nuvem;
CREATE POLICY "anon_insert_painel_nuvem" ON painel_nuvem
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_painel_nuvem" ON painel_nuvem;
CREATE POLICY "anon_update_painel_nuvem" ON painel_nuvem
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 3) painel_perfis — SELECT + INSERT + UPDATE
ALTER TABLE painel_perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_painel_perfis" ON painel_perfis;
CREATE POLICY "anon_select_painel_perfis" ON painel_perfis
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_painel_perfis" ON painel_perfis;
CREATE POLICY "anon_insert_painel_perfis" ON painel_perfis
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_painel_perfis" ON painel_perfis;
CREATE POLICY "anon_update_painel_perfis" ON painel_perfis
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 4) painel_registros — SELECT + INSERT + UPDATE
ALTER TABLE painel_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_painel_registros" ON painel_registros;
CREATE POLICY "anon_select_painel_registros" ON painel_registros
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_painel_registros" ON painel_registros;
CREATE POLICY "anon_insert_painel_registros" ON painel_registros
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_painel_registros" ON painel_registros;
CREATE POLICY "anon_update_painel_registros" ON painel_registros
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- FIM — Execute DEPOIS de ativar Anonymous Auth no Dashboard
-- ============================================================
