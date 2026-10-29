-- ============================================================
--  Acciones de Marketing BBPS · tabla para Supabase
--  Pegar en Supabase → SQL Editor → New query → Run
-- ============================================================

create table if not exists public.acciones (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  inicio         date not null,
  cierre         date not null,
  descripcion    text,
  link_graficas  text,
  link_brief     text,
  link_otro      text,
  color          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint fechas_validas check (cierre >= inicio)
);

create index if not exists acciones_inicio_idx on public.acciones (inicio);

-- Uso interno sin contraseña: cualquiera con la web puede leer y cargar.
alter table public.acciones enable row level security;

drop policy if exists "acciones_select" on public.acciones;
drop policy if exists "acciones_insert" on public.acciones;
drop policy if exists "acciones_update" on public.acciones;
drop policy if exists "acciones_delete" on public.acciones;

create policy "acciones_select" on public.acciones for select to anon using (true);
create policy "acciones_insert" on public.acciones for insert to anon with check (true);
create policy "acciones_update" on public.acciones for update to anon using (true) with check (true);
create policy "acciones_delete" on public.acciones for delete to anon using (true);

-- Actualización en vivo (si alguien carga algo, el calendario se refresca solo)
do $$
begin
  alter publication supabase_realtime add table public.acciones;
exception when duplicate_object then null;
end $$;
