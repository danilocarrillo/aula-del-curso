-- =====================================================================
-- Aula del curso · 05 · Archivos en las entregas
-- Permite entregar documentos (PDF, Word), escaneos y fotos.
-- Los archivos van a un almacén privado: solo los ven su autor y el profesor.
-- =====================================================================

-- Una entrega puede ser solo archivos, sin texto escrito.
alter table public.entregas drop constraint if exists entregas_texto_check;

-- Almacén privado, con tope de 10 MB por archivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('entregas', 'entregas', false, 10485760,
        array['application/pdf', 'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create table public.archivos (
  id uuid primary key default gen_random_uuid(),
  entrega uuid not null references public.entregas (id) on delete cascade,
  ruta text not null unique,
  nombre text not null,
  tipo text not null default '',
  tamano int not null default 0,
  creado timestamptz not null default now()
);
create index archivos_por_entrega on public.archivos (entrega);

-- Máximo 6 archivos por entrega.
create function public.cuidar_archivo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.archivos a where a.entrega = new.entrega) >= 6 then
    raise exception 'Una entrega admite hasta 6 archivos.';
  end if;
  return new;
end $$;
create trigger antes_de_archivo before insert on public.archivos for each row execute function public.cuidar_archivo();

-- ¿Esta entrega es mía y todavía se puede cambiar?
create function public.entrega_abierta(e uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.entregas x where x.id = e and x.estudiante = (select auth.uid()))
     and not exists (select 1 from public.calificaciones c where c.entrega = e and c.publicada);
$$;

alter table public.archivos enable row level security;
revoke all on public.archivos from anon;
grant select, insert, delete on public.archivos to authenticated;

create policy leer_archivos on public.archivos for select to authenticated
  using (public.es_profesor() or (public.es_miembro() and exists (select 1 from public.entregas e where e.id = entrega and e.estudiante = (select auth.uid()))));
create policy subir_archivos on public.archivos for insert to authenticated
  with check (public.es_miembro() and public.entrega_abierta(entrega) and ruta like (select auth.uid())::text || '/%');
create policy quitar_archivos on public.archivos for delete to authenticated
  using (public.es_miembro() and public.entrega_abierta(entrega));

-- El almacén: cada estudiante escribe y lee solo dentro de su propia carpeta. El profesor lee todo.
create policy aula_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'entregas' and (storage.foldername(name))[1] = (select auth.uid())::text and public.es_miembro());
create policy aula_leer on storage.objects for select to authenticated
  using (bucket_id = 'entregas' and (public.es_profesor() or ((storage.foldername(name))[1] = (select auth.uid())::text and public.es_miembro())));
create policy aula_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'entregas' and (storage.foldername(name))[1] = (select auth.uid())::text and public.es_miembro());
