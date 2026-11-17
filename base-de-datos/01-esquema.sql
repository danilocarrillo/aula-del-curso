-- =====================================================================
-- Aula del curso · 01 · Estructura y seguridad (Fase 1)
-- Se pega una sola vez en Supabase: SQL Editor → New query → Run.
-- Regla central: cada tabla nace cerrada. Solo se abre lo que aquí se indica.
-- =====================================================================

-- ---------- Configuración del curso ----------
create table public.configuracion (
  id int primary key default 1 check (id = 1),
  zona text not null default 'America/New_York',
  inicio date not null default '2026-11-09'          -- lunes de la semana 1
);
insert into public.configuracion default values;

-- ---------- Personas ----------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '',
  rol text not null default 'estudiante' check (rol in ('estudiante', 'profesor', 'administrador')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'activo', 'baja')),
  creado timestamptz not null default now()
);

-- ¿Quien pregunta es un miembro activo del curso?
create function public.es_miembro() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.estado = 'activo');
$$;
-- ¿Es el profesor o el administrador?
create function public.es_profesor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.estado = 'activo' and p.rol in ('profesor', 'administrador'));
$$;

-- Cada cuenta nueva recibe su perfil. Nace «pendiente»: no ve nada hasta que el profesor la activa.
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger al_crear_cuenta after insert on auth.users for each row execute function public.crear_perfil();

-- ---------- Contenido ----------
create table public.semanas (
  n int primary key check (n between 1 and 12),
  titulo text not null,
  lectura text not null default '',
  instrucciones text not null default '',
  publicada boolean not null default true
);
create table public.videos (
  id bigint generated always as identity primary key,
  semana int not null references public.semanas (n) on delete cascade,
  titulo text not null,
  url text not null default '',
  orden int not null default 1
);
create table public.tareas (
  id text primary key,
  tipo text not null,
  titulo text not null,
  semana int not null references public.semanas (n),
  peso numeric not null,
  min_palabras int,
  max_palabras int,
  rubrica jsonb not null default '[]'
);
create table public.foros (
  id text primary key,
  semana int not null references public.semanas (n),
  titulo text not null,
  tema text not null default '',
  con_nota boolean not null default false,
  siempre_abierto boolean not null default false,
  ver_despues boolean not null default true,
  orden int not null default 1
);

-- ---------- Fechas: un solo lugar ----------
create function public.semana_abre(n int) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select ((c.inicio + (n - 1) * 7)::timestamp) at time zone c.zona from public.configuracion c;
$$;
create function public.semana_aporte(n int) returns timestamptz      -- jueves 11:59 p. m.
language sql stable security definer set search_path = '' as $$
  select ((c.inicio + (n - 1) * 7 + 3)::timestamp + time '23:59') at time zone c.zona from public.configuracion c;
$$;
create function public.semana_cierra(n int) returns timestamptz      -- domingo 11:59 p. m.
language sql stable security definer set search_path = '' as $$
  select ((c.inicio + (n - 1) * 7 + 6)::timestamp + time '23:59') at time zone c.zona from public.configuracion c;
$$;
create function public.contar_palabras(t text) returns int
language sql immutable set search_path = '' as $$
  select count(*)::int from regexp_matches(coalesce(t, ''), '\S+', 'g');
$$;
create function public.foro_abierto(f text) returns boolean
language sql stable security definer set search_path = '' as $$
  select x.siempre_abierto or (now() >= public.semana_abre(x.semana) and now() <= public.semana_cierra(x.semana))
  from public.foros x where x.id = f;
$$;

-- ---------- Entregas y notas ----------
create table public.entregas (
  id uuid primary key default gen_random_uuid(),
  tarea text not null references public.tareas (id),
  estudiante uuid not null default auth.uid() references public.perfiles (id),
  texto text not null check (length(btrim(texto)) > 0),
  palabras int not null default 0,
  ia_uso text not null check (ia_uso in ('no', 'si')),                 -- declaración obligatoria
  ia_detalle text not null default '',
  entregada_en timestamptz not null default now(),
  prorroga boolean not null default false,
  unique (tarea, estudiante),
  check (ia_uso = 'no' or length(btrim(ia_detalle)) > 2)
);
create table public.calificaciones (
  entrega uuid primary key references public.entregas (id) on delete cascade,
  puntos jsonb not null,
  total numeric not null check (total between 0 and 100),
  descuento numeric not null default 0,
  nota numeric not null check (nota between 0 and 100),
  comentario text not null default '',
  publicada boolean not null default false,
  publicada_en timestamptz,
  calificada_por uuid default auth.uid() references public.perfiles (id)
);

-- La fecha de entrega la pone el servidor, nunca el estudiante.
create function public.cuidar_entrega() returns trigger
language plpgsql security definer set search_path = '' as $$
declare sem int;
begin
  new.palabras := public.contar_palabras(new.texto);
  if (select auth.uid()) is null then return new; end if;            -- carga inicial desde el panel
  if public.es_profesor() and tg_op = 'UPDATE' then                   -- el profesor solo concede la prórroga
    new.texto := old.texto; new.palabras := old.palabras; new.ia_uso := old.ia_uso; new.ia_detalle := old.ia_detalle;
    new.entregada_en := old.entregada_en; new.estudiante := old.estudiante; new.tarea := old.tarea; new.id := old.id;
    return new;
  end if;
  select t.semana into sem from public.tareas t where t.id = new.tarea;
  if now() < public.semana_abre(sem) then raise exception 'Esta tarea todavía no abre.'; end if;
  new.estudiante := (select auth.uid());
  new.entregada_en := now();
  if tg_op = 'UPDATE' then
    if exists (select 1 from public.calificaciones c where c.entrega = old.id and c.publicada) then
      raise exception 'Esta entrega ya está calificada y no se puede cambiar.';
    end if;
    new.id := old.id; new.tarea := old.tarea; new.prorroga := old.prorroga;
  else
    new.prorroga := false;
  end if;
  return new;
end $$;
create trigger antes_de_entregar before insert or update on public.entregas for each row execute function public.cuidar_entrega();

create function public.cuidar_calificacion() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.publicada and (tg_op = 'INSERT' or not old.publicada) then new.publicada_en := now(); end if;
  return new;
end $$;
create trigger antes_de_calificar before insert or update on public.calificaciones for each row execute function public.cuidar_calificacion();

-- ---------- Foros ----------
create table public.mensajes (
  id uuid primary key default gen_random_uuid(),
  foro text not null references public.foros (id),
  autor uuid not null default auth.uid() references public.perfiles (id),
  responde uuid references public.mensajes (id),
  texto text not null check (length(btrim(texto)) > 0),
  palabras int not null default 0,
  creado timestamptz not null default now()
);
create index mensajes_por_foro on public.mensajes (foro, creado);
-- Autoevaluación y valoración entre compañeros: solo las ven quien las escribió y el profesor.
create table public.valoraciones (
  mensaje uuid primary key references public.mensajes (id) on delete cascade,
  autor uuid not null default auth.uid() references public.perfiles (id),
  lista jsonb not null
);
create table public.notas_foro (
  foro text not null references public.foros (id),
  estudiante uuid not null references public.perfiles (id),
  nota numeric not null check (nota between 0 and 100),
  publicada boolean not null default false,
  publicada_en timestamptz,
  primary key (foro, estudiante)
);

create function public.cuidar_mensaje() returns trigger
language plpgsql security definer set search_path = '' as $$
declare padre public.mensajes;
begin
  new.palabras := public.contar_palabras(new.texto);
  if (select auth.uid()) is null then return new; end if;
  new.autor := (select auth.uid());
  new.creado := now();
  if new.responde is not null then
    select * into padre from public.mensajes m where m.id = new.responde;
    if padre.id is null or padre.foro <> new.foro or padre.responde is not null then
      raise exception 'Solo se puede responder a un aporte de este mismo foro.';
    end if;
  end if;
  if public.es_profesor() then return new; end if;
  if not public.foro_abierto(new.foro) then raise exception 'Este foro está cerrado y ya no acepta mensajes.'; end if;
  if new.responde is null and exists (select 1 from public.mensajes m where m.foro = new.foro and m.autor = new.autor and m.responde is null) then
    raise exception 'Ya publicaste tu aporte en este foro.';
  end if;
  if new.responde is not null and padre.autor = new.autor then raise exception 'No puedes responder a tu propio aporte.'; end if;
  return new;
end $$;
create trigger antes_de_publicar before insert on public.mensajes for each row execute function public.cuidar_mensaje();

-- ¿Puede este estudiante ver los aportes ajenos de un foro? Sí, cuando ya publicó el suyo o el foro cerró.
create function public.puede_ver_foro(f text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not x.ver_despues
      or (not x.siempre_abierto and now() > public.semana_cierra(x.semana))
      or exists (select 1 from public.mensajes m where m.foro = f and m.autor = (select auth.uid()) and m.responde is null)
  from public.foros x where x.id = f;
$$;
create function public.cuidar_nota_foro() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.publicada and (tg_op = 'INSERT' or not old.publicada) then new.publicada_en := now(); end if;
  return new;
end $$;
create trigger antes_de_nota_foro before insert or update on public.notas_foro for each row execute function public.cuidar_nota_foro();

-- ---------- Marcas personales («lo vi», «lo leí») ----------
create table public.marcas (
  estudiante uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  clave text not null,
  primary key (estudiante, clave)
);

-- =====================================================================
-- SEGURIDAD: quién puede ver y hacer qué
-- =====================================================================
alter table public.configuracion  enable row level security;
alter table public.perfiles       enable row level security;
alter table public.semanas        enable row level security;
alter table public.videos         enable row level security;
alter table public.tareas         enable row level security;
alter table public.foros          enable row level security;
alter table public.entregas       enable row level security;
alter table public.calificaciones enable row level security;
alter table public.mensajes       enable row level security;
alter table public.valoraciones   enable row level security;
alter table public.notas_foro     enable row level security;
alter table public.marcas         enable row level security;

-- Nadie sin iniciar sesión toca nada.
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, update on public.configuracion, public.perfiles to authenticated;
grant select, insert, update, delete on public.semanas, public.videos, public.tareas, public.foros to authenticated;
grant select, insert, update on public.entregas, public.calificaciones, public.notas_foro to authenticated;
grant select, insert on public.mensajes, public.valoraciones to authenticated;
grant select, insert, delete on public.marcas to authenticated;

-- Configuración y contenido: lo leen los miembros; lo cambia el profesor.
create policy leer_config   on public.configuracion for select to authenticated using (public.es_miembro());
create policy editar_config on public.configuracion for update to authenticated using (public.es_profesor()) with check (public.es_profesor());

create policy leer_perfiles   on public.perfiles for select to authenticated using (id = (select auth.uid()) or public.es_miembro());
create policy editar_perfiles on public.perfiles for update to authenticated using (public.es_profesor()) with check (public.es_profesor());

create policy leer_semanas   on public.semanas for select to authenticated using (public.es_profesor() or (public.es_miembro() and publicada));
create policy editar_semanas on public.semanas for all    to authenticated using (public.es_profesor()) with check (public.es_profesor());
create policy leer_videos    on public.videos  for select to authenticated using (public.es_profesor() or (public.es_miembro() and now() >= public.semana_abre(semana)));
create policy editar_videos  on public.videos  for all    to authenticated using (public.es_profesor()) with check (public.es_profesor());
create policy leer_tareas    on public.tareas  for select to authenticated using (public.es_miembro());
create policy editar_tareas  on public.tareas  for all    to authenticated using (public.es_profesor()) with check (public.es_profesor());
create policy leer_foros     on public.foros   for select to authenticated using (public.es_miembro());
create policy editar_foros   on public.foros   for all    to authenticated using (public.es_profesor()) with check (public.es_profesor());

-- Entregas: cada estudiante solo ve y escribe las suyas. El profesor las ve todas.
create policy leer_entregas    on public.entregas for select to authenticated using ((estudiante = (select auth.uid()) and public.es_miembro()) or public.es_profesor());
create policy crear_entregas   on public.entregas for insert to authenticated with check (estudiante = (select auth.uid()) and public.es_miembro());
create policy cambiar_entregas on public.entregas for update to authenticated
  using ((estudiante = (select auth.uid()) and public.es_miembro()) or public.es_profesor())
  with check ((estudiante = (select auth.uid()) and public.es_miembro()) or public.es_profesor());

-- Notas: el estudiante ve solo las suyas y solo cuando están publicadas. Solo el profesor las escribe.
create policy leer_notas    on public.calificaciones for select to authenticated
  using (public.es_profesor() or (publicada and public.es_miembro() and exists (select 1 from public.entregas e where e.id = entrega and e.estudiante = (select auth.uid()))));
create policy poner_notas   on public.calificaciones for insert to authenticated with check (public.es_profesor());
create policy cambiar_notas on public.calificaciones for update to authenticated using (public.es_profesor()) with check (public.es_profesor());

-- Foros: los mensajes son visibles dentro del curso, con la regla de «ver después de publicar».
create policy leer_mensajes     on public.mensajes for select to authenticated
  using (public.es_profesor() or (public.es_miembro() and (autor = (select auth.uid()) or public.puede_ver_foro(foro))));
create policy publicar_mensajes on public.mensajes for insert to authenticated with check (autor = (select auth.uid()) and public.es_miembro());

create policy leer_valoraciones  on public.valoraciones for select to authenticated using ((autor = (select auth.uid()) and public.es_miembro()) or public.es_profesor());
create policy crear_valoraciones on public.valoraciones for insert to authenticated
  with check (autor = (select auth.uid()) and public.es_miembro()
              and exists (select 1 from public.mensajes m where m.id = mensaje and m.autor = (select auth.uid())));

create policy leer_notas_foro    on public.notas_foro for select to authenticated using (public.es_profesor() or (publicada and public.es_miembro() and estudiante = (select auth.uid())));
create policy poner_notas_foro   on public.notas_foro for insert to authenticated with check (public.es_profesor());
create policy cambiar_notas_foro on public.notas_foro for update to authenticated using (public.es_profesor()) with check (public.es_profesor());

create policy mis_marcas on public.marcas for all to authenticated
  using (estudiante = (select auth.uid()) and public.es_miembro()) with check (estudiante = (select auth.uid()) and public.es_miembro());
