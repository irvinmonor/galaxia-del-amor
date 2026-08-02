-- ============================================================
-- 💖 GALAXIA DEL AMOR — pega TODO esto en Supabase → SQL Editor → Run
-- ============================================================

-- Tabla de configuración (textos, música, etc.)
create table if not exists public.galaxia_config (
  id int primary key,
  data jsonb not null default '{}'::jsonb
);
insert into public.galaxia_config (id, data) values (1, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.galaxia_config enable row level security;

drop policy if exists "lectura publica config" on public.galaxia_config;
create policy "lectura publica config" on public.galaxia_config
  for select using (true);

drop policy if exists "editar config admin" on public.galaxia_config;
create policy "editar config admin" on public.galaxia_config
  for update to authenticated using (true) with check (true);

drop policy if exists "insertar config admin" on public.galaxia_config;
create policy "insertar config admin" on public.galaxia_config
  for insert to authenticated with check (true);

-- Bucket público para las fotos
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists "fotos lectura publica" on storage.objects;
create policy "fotos lectura publica" on storage.objects
  for select using (bucket_id = 'fotos');

drop policy if exists "fotos subir admin" on storage.objects;
create policy "fotos subir admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');

drop policy if exists "fotos borrar admin" on storage.objects;
create policy "fotos borrar admin" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos');
