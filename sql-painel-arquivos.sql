-- Arquivos da obra (romaneios)
-- Rode no SQL Editor do projeto eqtxfpjrqlkhqgckbyxb

create table if not exists public.painel_arquivos (
  id uuid primary key default gen_random_uuid(),
  obra_id text not null,
  tipo text not null check (tipo in ('esquadria','acessorio','perfil','consumo')),
  nome_arquivo text not null,
  caminho text not null,
  mime text,
  tamanho bigint,
  codigo_lista text,
  data_romaneio date,
  criado_por text,
  criado_em timestamptz not null default now()
);

create index if not exists painel_arquivos_obra_tipo on public.painel_arquivos (obra_id, tipo, criado_em desc);

alter table public.painel_arquivos enable row level security;

drop policy if exists arquivos_select on public.painel_arquivos;
create policy arquivos_select on public.painel_arquivos
  for select to authenticated using (true);

drop policy if exists arquivos_insert on public.painel_arquivos;
create policy arquivos_insert on public.painel_arquivos
  for insert to authenticated with check (true);

drop policy if exists arquivos_delete on public.painel_arquivos;
create policy arquivos_delete on public.painel_arquivos
  for delete to authenticated using (true);

insert into storage.buckets (id, name, public)
values ('painel-arquivos', 'painel-arquivos', false)
on conflict (id) do nothing;

drop policy if exists arq_storage_sel on storage.objects;
create policy arq_storage_sel on storage.objects
  for select to authenticated
  using (bucket_id = 'painel-arquivos');

drop policy if exists arq_storage_ins on storage.objects;
create policy arq_storage_ins on storage.objects
  for insert to authenticated
  with check (bucket_id = 'painel-arquivos');

drop policy if exists arq_storage_del on storage.objects;
create policy arq_storage_del on storage.objects
  for delete to authenticated
  using (bucket_id = 'painel-arquivos');
