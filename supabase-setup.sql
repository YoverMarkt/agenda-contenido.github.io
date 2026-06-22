-- ============================================================
--  AGENDA DE CONTENIDO — Esquema Supabase (acceso compartido)
--  Ejecuta esto en: Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1) Tabla que guarda TODO el estado de la app en una sola fila.
--    Mantenerlo simple: un único documento JSON compartido.
create table if not exists public.agenda (
  id          text primary key default 'main',
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 2) Fila inicial (si no existe).
insert into public.agenda (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;

-- 3) Activar Row Level Security.
alter table public.agenda enable row level security;

-- 4) Políticas: permitir leer y actualizar la fila 'main'
--    a cualquier cliente con la anon key.
--    La protección real para ustedes dos es la "clave de acceso"
--    que pide la app antes de mostrar/guardar nada.
--    (Para 2 personas de confianza esto es suficiente.)

drop policy if exists "leer agenda" on public.agenda;
create policy "leer agenda"
  on public.agenda for select
  using ( id = 'main' );

drop policy if exists "actualizar agenda" on public.agenda;
create policy "actualizar agenda"
  on public.agenda for update
  using ( id = 'main' )
  with check ( id = 'main' );

-- Nota: no permitimos insert ni delete desde el cliente.
-- La fila 'main' ya existe y nunca se borra.

-- ============================================================
--  IMPORTANTE sobre las llaves:
--  - La anon/publishable key es PÚBLICA por diseño (va en el HTML).
--  - NUNCA pongas la service_role key en el HTML ni en GitHub.
-- ============================================================
