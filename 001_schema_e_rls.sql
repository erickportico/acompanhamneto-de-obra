-- ============================================================
-- 001_schema_e_rls.sql
-- Schema normalizado + RLS para o Painel de Obras
-- Execute no SQL Editor do Supabase ANTES de rodar migrate.js
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Funções de perfil global
-- ------------------------------------------------------------
create or replace function public.eh_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.painel_perfis
    where id = auth.uid()
      and lower(perfil) = 'admin'
      and coalesce(ativo, true) = true
  );
$$;

create or replace function public.pode_escrever()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.painel_perfis
    where id = auth.uid()
      and lower(perfil) in ('admin', 'editor')
      and coalesce(ativo, true) = true
  );
$$;

create or replace function public.usuario_ativo()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.painel_perfis
    where id = auth.uid() and coalesce(ativo, true) = true
  );
$$;

grant execute on function public.eh_admin() to authenticated;
grant execute on function public.pode_escrever() to authenticated;
grant execute on function public.usuario_ativo() to authenticated;

-- ------------------------------------------------------------
-- painel_perfis (caso ainda não exista)
-- ------------------------------------------------------------
create table if not exists public.painel_perfis (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  nome          text,
  perfil        text not null default 'visitante'
                check (lower(perfil) in ('admin', 'editor', 'visitante', 'leitor')),
  ativo         boolean not null default true,
  trocar_senha  boolean not null default false,
  ultimo_acesso timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_painel_perfis_email on public.painel_perfis (lower(email));

-- ------------------------------------------------------------
-- Tabelas normalizadas
-- ------------------------------------------------------------
create table if not exists public.painel_config (
  id             int primary key default 1 check (id = 1),
  config         jsonb not null default '{}'::jsonb,
  agenda_obras   text default '',
  versao_banco   text,
  atualizado_em  timestamptz default now(),
  atualizado_por uuid references auth.users(id)
);

create table if not exists public.obras (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  num_contrato      text default '',
  valor_contrato    numeric(14,2) default 0,
  pct_servico       numeric(6,2) default 20,
  num_medicao_max   integer default 1,
  consideracoes     jsonb default '{}'::jsonb,
  medicoes_finais   jsonb default '{}'::jsonb,
  cronograma_title  text default '',
  dados_extras      jsonb default '{}'::jsonb,
  criado_por        uuid references auth.users(id),
  criado_em         timestamptz default now(),
  atualizado_em     timestamptz default now()
);

create table if not exists public.obra_membros (
  obra_id   uuid not null references public.obras(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  papel     text not null default 'leitor'
            check (lower(papel) in ('dono', 'editor', 'leitor')),
  criado_em timestamptz default now(),
  primary key (obra_id, user_id)
);

create index if not exists idx_obra_membros_user on public.obra_membros(user_id);

create table if not exists public.painel_user_state (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  obra_atual_id uuid references public.obras(id) on delete set null,
  ui            jsonb default '{}'::jsonb,
  atualizado_em timestamptz default now()
);

create table if not exists public.itens (
  id              uuid primary key default gen_random_uuid(),
  obra_id         uuid not null references public.obras(id) on delete cascade,
  id_legado       text,
  ref             text,
  tipo            text,
  loc             text,
  vidro           text,
  qtd             numeric(12,3) default 1,
  larg            numeric(12,4) default 0,
  alt             numeric(12,4) default 0,
  fem             numeric(12,3) default 0,
  fabricado       numeric(12,3) default 0,
  instalado       numeric(12,3) default 0,
  data_instalacao date,
  has_bottom      boolean default true,
  ctm_profile     text default 'largo',
  dados_extras    jsonb default '{}'::jsonb,
  criado_em       timestamptz default now(),
  atualizado_em   timestamptz default now()
);

create unique index if not exists uq_itens_obra_legado
  on public.itens (obra_id, id_legado) where id_legado is not null;
create index if not exists idx_itens_obra on public.itens(obra_id);

create table if not exists public.item_medicoes (
  item_id     uuid not null references public.itens(id) on delete cascade,
  num_medicao integer not null,
  m2          numeric(14,4) default 0,
  primary key (item_id, num_medicao)
);

create table if not exists public.recebimentos (
  id            uuid primary key default gen_random_uuid(),
  obra_id       uuid not null references public.obras(id) on delete cascade,
  id_legado     text,
  data          date,
  lista_corte   text,
  nf            text,
  classe        text,
  marca         text,
  codigo_cor    text,
  descricao     text,
  fornecedor    text,
  material      text,
  ref           text,
  responsavel   text,
  local         text,
  obs           text,
  qtd_prevista  numeric(14,3) default 0,
  qtd_recebida  numeric(14,3) default 0,
  status        text default 'Pendente',
  dados_extras  jsonb default '{}'::jsonb,
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);

create index if not exists idx_recebimentos_obra on public.recebimentos(obra_id);

create table if not exists public.colaboradores (
  id            uuid primary key default gen_random_uuid(),
  obra_id       uuid not null references public.obras(id) on delete cascade,
  id_legado     text,
  nome          text not null,
  funcao        text,
  empresa       text,
  dados_extras  jsonb default '{}'::jsonb,
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);

create index if not exists idx_colaboradores_obra on public.colaboradores(obra_id);

create table if not exists public.lancamentos_producao (
  id            uuid primary key default gen_random_uuid(),
  obra_id       uuid not null references public.obras(id) on delete cascade,
  id_legado     text,
  dados         jsonb not null default '{}'::jsonb,
  mes_ref       text,
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);

create index if not exists idx_lanc_obra on public.lancamentos_producao(obra_id);

create table if not exists public.centros_custo (
  id        uuid primary key default gen_random_uuid(),
  obra_id   uuid not null references public.obras(id) on delete cascade,
  id_legado text,
  dados     jsonb not null default '{}'::jsonb,
  criado_em timestamptz default now()
);

create table if not exists public.ctm_extra_specs (
  id           uuid primary key default gen_random_uuid(),
  obra_id      uuid not null references public.obras(id) on delete cascade,
  ref          text,
  type         text,
  l_mm         integer,
  h_mm         integer,
  qty          integer default 1,
  has_bottom   boolean default true,
  ctm_profile  text default 'largo',
  dados_extras jsonb default '{}'::jsonb
);

create table if not exists public.ctm_logs (
  id        uuid primary key default gen_random_uuid(),
  obra_id   uuid not null references public.obras(id) on delete cascade,
  dados     jsonb not null default '{}'::jsonb,
  criado_em timestamptz default now()
);

create table if not exists public.cronograma_tarefas (
  id        uuid primary key default gen_random_uuid(),
  obra_id   uuid not null references public.obras(id) on delete cascade,
  id_legado text,
  ordem     integer default 0,
  grupo     text,
  tarefa    text,
  inicio    date,
  fim       date,
  status    text,
  cor       text,
  dados     jsonb default '{}'::jsonb
);

create table if not exists public.obraflow_tarefas (
  id      uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  ordem   integer default 0,
  dados   jsonb not null default '{}'::jsonb
);

create table if not exists public.painel_nuvem (
  chave         text primary key,
  valor         jsonb,
  marca         text,
  atualizado_em timestamptz default now()
);

-- Mapas de ID legado → UUID
create table if not exists public.obra_id_map (
  id_legado text primary key,
  obra_id   uuid not null unique references public.obras(id) on delete cascade
);

create table if not exists public.item_id_map (
  obra_id   uuid not null references public.obras(id) on delete cascade,
  id_legado text not null,
  item_id   uuid not null unique references public.itens(id) on delete cascade,
  primary key (obra_id, id_legado)
);

create table if not exists public.colab_id_map (
  obra_id   uuid not null references public.obras(id) on delete cascade,
  id_legado text not null,
  colab_id  uuid not null unique references public.colaboradores(id) on delete cascade,
  primary key (obra_id, id_legado)
);

-- ------------------------------------------------------------
-- Funções por obra
-- ------------------------------------------------------------
create or replace function public.membro_da_obra(p_obra uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.eh_admin()
      or exists (
           select 1 from public.obra_membros
           where obra_id = p_obra and user_id = auth.uid()
         );
$$;

create or replace function public.pode_escrever_obra(p_obra uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.eh_admin()
      or exists (
           select 1 from public.obra_membros
           where obra_id = p_obra
             and user_id = auth.uid()
             and lower(papel) in ('dono', 'editor')
         );
$$;

create or replace function public.eh_dono_obra(p_obra uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.eh_admin()
      or exists (
           select 1 from public.obra_membros
           where obra_id = p_obra
             and user_id = auth.uid()
             and lower(papel) = 'dono'
         );
$$;

grant execute on function public.membro_da_obra(uuid) to authenticated;
grant execute on function public.pode_escrever_obra(uuid) to authenticated;
grant execute on function public.eh_dono_obra(uuid) to authenticated;

create or replace function public.ao_criar_obra()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.criado_por := coalesce(new.criado_por, auth.uid());
  if auth.uid() is not null then
    insert into public.obra_membros (obra_id, user_id, papel)
    values (new.id, auth.uid(), 'dono')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ao_criar_obra on public.obras;
create trigger trg_ao_criar_obra
before insert on public.obras
for each row execute function public.ao_criar_obra();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.painel_perfis enable row level security;
alter table public.painel_dados enable row level security;
alter table public.painel_nuvem enable row level security;
alter table public.painel_config enable row level security;
alter table public.painel_user_state enable row level security;
alter table public.obras enable row level security;
alter table public.obra_membros enable row level security;
alter table public.itens enable row level security;
alter table public.item_medicoes enable row level security;
alter table public.recebimentos enable row level security;
alter table public.colaboradores enable row level security;
alter table public.lancamentos_producao enable row level security;
alter table public.centros_custo enable row level security;
alter table public.ctm_extra_specs enable row level security;
alter table public.ctm_logs enable row level security;
alter table public.cronograma_tarefas enable row level security;
alter table public.obraflow_tarefas enable row level security;

-- painel_perfis
drop policy if exists perfis_select on public.painel_perfis;
drop policy if exists perfis_insert on public.painel_perfis;
drop policy if exists perfis_update on public.painel_perfis;
drop policy if exists perfis_delete on public.painel_perfis;

create policy perfis_select on public.painel_perfis
for select to authenticated using (true);
create policy perfis_insert on public.painel_perfis
for insert to authenticated with check (public.eh_admin());
create policy perfis_update on public.painel_perfis
for update to authenticated
using (id = auth.uid() or public.eh_admin())
with check (id = auth.uid() or public.eh_admin());
create policy perfis_delete on public.painel_perfis
for delete to authenticated
using (public.eh_admin() and id <> auth.uid());

-- painel_dados (legado)
drop policy if exists dados_select on public.painel_dados;
drop policy if exists dados_insert on public.painel_dados;
drop policy if exists dados_update on public.painel_dados;
drop policy if exists dados_delete on public.painel_dados;

create policy dados_select on public.painel_dados
for select to authenticated using (public.usuario_ativo());
create policy dados_insert on public.painel_dados
for insert to authenticated with check (public.pode_escrever());
create policy dados_update on public.painel_dados
for update to authenticated
using (public.pode_escrever()) with check (public.pode_escrever());
create policy dados_delete on public.painel_dados
for delete to authenticated using (public.eh_admin());

-- painel_nuvem
drop policy if exists nuvem_select on public.painel_nuvem;
drop policy if exists nuvem_insert on public.painel_nuvem;
drop policy if exists nuvem_update on public.painel_nuvem;
drop policy if exists nuvem_delete on public.painel_nuvem;

create policy nuvem_select on public.painel_nuvem
for select to authenticated using (public.usuario_ativo());
create policy nuvem_insert on public.painel_nuvem
for insert to authenticated with check (public.pode_escrever());
create policy nuvem_update on public.painel_nuvem
for update to authenticated
using (public.pode_escrever()) with check (public.pode_escrever());
create policy nuvem_delete on public.painel_nuvem
for delete to authenticated using (public.eh_admin());

-- painel_config
drop policy if exists config_select on public.painel_config;
drop policy if exists config_write on public.painel_config;
create policy config_select on public.painel_config
for select to authenticated using (public.usuario_ativo());
create policy config_write on public.painel_config
for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- painel_user_state
drop policy if exists user_state_select on public.painel_user_state;
drop policy if exists user_state_write on public.painel_user_state;
create policy user_state_select on public.painel_user_state
for select to authenticated using (user_id = auth.uid());
create policy user_state_write on public.painel_user_state
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- obras
drop policy if exists obras_select on public.obras;
drop policy if exists obras_insert on public.obras;
drop policy if exists obras_update on public.obras;
drop policy if exists obras_delete on public.obras;
create policy obras_select on public.obras
for select to authenticated using (public.membro_da_obra(id));
create policy obras_insert on public.obras
for insert to authenticated with check (public.usuario_ativo() and public.pode_escrever());
create policy obras_update on public.obras
for update to authenticated
using (public.pode_escrever_obra(id)) with check (public.pode_escrever_obra(id));
create policy obras_delete on public.obras
for delete to authenticated using (public.eh_dono_obra(id));

-- obra_membros
drop policy if exists membros_select on public.obra_membros;
drop policy if exists membros_insert on public.obra_membros;
drop policy if exists membros_update on public.obra_membros;
drop policy if exists membros_delete on public.obra_membros;
create policy membros_select on public.obra_membros
for select to authenticated using (public.membro_da_obra(obra_id));
create policy membros_insert on public.obra_membros
for insert to authenticated with check (public.eh_dono_obra(obra_id));
create policy membros_update on public.obra_membros
for update to authenticated
using (public.eh_dono_obra(obra_id)) with check (public.eh_dono_obra(obra_id));
create policy membros_delete on public.obra_membros
for delete to authenticated using (public.eh_dono_obra(obra_id));

-- Macro: tabelas com obra_id
do $$
declare
  t text;
  tabs text[] := array[
    'itens','recebimentos','colaboradores','lancamentos_producao',
    'centros_custo','ctm_extra_specs','ctm_logs','cronograma_tarefas','obraflow_tarefas'
  ];
begin
  foreach t in array tabs loop
    execute format('drop policy if exists %I on public.%I', t||'_select', t);
    execute format('drop policy if exists %I on public.%I', t||'_insert', t);
    execute format('drop policy if exists %I on public.%I', t||'_update', t);
    execute format('drop policy if exists %I on public.%I', t||'_delete', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.membro_da_obra(obra_id))',
      t||'_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.pode_escrever_obra(obra_id))',
      t||'_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.pode_escrever_obra(obra_id)) with check (public.pode_escrever_obra(obra_id))',
      t||'_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.pode_escrever_obra(obra_id))',
      t||'_delete', t);
  end loop;
end $$;

-- item_medicoes (via itens)
drop policy if exists item_medicoes_select on public.item_medicoes;
drop policy if exists item_medicoes_insert on public.item_medicoes;
drop policy if exists item_medicoes_update on public.item_medicoes;
drop policy if exists item_medicoes_delete on public.item_medicoes;

create policy item_medicoes_select on public.item_medicoes for select to authenticated
using (exists (select 1 from public.itens i where i.id = item_id and public.membro_da_obra(i.obra_id)));
create policy item_medicoes_insert on public.item_medicoes for insert to authenticated
with check (exists (select 1 from public.itens i where i.id = item_id and public.pode_escrever_obra(i.obra_id)));
create policy item_medicoes_update on public.item_medicoes for update to authenticated
using (exists (select 1 from public.itens i where i.id = item_id and public.pode_escrever_obra(i.obra_id)))
with check (exists (select 1 from public.itens i where i.id = item_id and public.pode_escrever_obra(i.obra_id)));
create policy item_medicoes_delete on public.item_medicoes for delete to authenticated
using (exists (select 1 from public.itens i where i.id = item_id and public.pode_escrever_obra(i.obra_id)));

-- Grants: nada para anon
do $$
declare
  t text;
  tabs text[] := array[
    'painel_perfis','painel_nuvem','painel_config','painel_user_state',
    'obras','obra_membros','itens','item_medicoes','recebimentos',
    'colaboradores','lancamentos_producao','centros_custo',
    'ctm_extra_specs','ctm_logs','cronograma_tarefas','obraflow_tarefas',
    'obra_id_map','item_id_map','colab_id_map'
  ];
begin
  foreach t in array tabs loop
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
  -- mapas só service role na prática; authenticated pode só ler se necessário
end $$;

-- painel_dados (se existir)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'painel_dados'
  ) then
    revoke all on table public.painel_dados from anon;
    grant select, insert, update, delete on table public.painel_dados to authenticated;
  end if;
end $$;
