-- =====================================================================
-- Aula del curso · 07 · Solo el administrador acepta alumnos y nombra profesores
--
-- Desde este paso:
--  · Solo un administrador puede activar cuentas, darlas de baja y cambiar roles.
--  · Un profesor califica y edita el contenido, pero no administra personas,
--    hasta que un administrador le dé ese permiso.
--  · El aula nunca puede quedarse sin un administrador activo.
-- =====================================================================

-- La primera cuenta real (la del dueño) queda como administrador.
update public.perfiles set rol = 'administrador', estado = 'activo'
 where id = (select id from auth.users
              where email not like '%@aula.prueba'
              order by created_at limit 1);

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.estado = 'activo' and p.rol = 'administrador');
$$;

drop policy if exists editar_perfiles on public.perfiles;
create policy editar_perfiles on public.perfiles for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

create or replace function public.cuidar_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.rol = 'administrador' and old.estado = 'activo' and (new.rol <> 'administrador' or new.estado <> 'activo') then
    if not exists (select 1 from public.perfiles p where p.rol = 'administrador' and p.estado = 'activo' and p.id <> old.id) then
      raise exception 'Debe quedar al menos un administrador activo en el aula.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists antes_de_cambiar_perfil on public.perfiles;
create trigger antes_de_cambiar_perfil before update on public.perfiles for each row execute function public.cuidar_perfil();

select nombre, rol, estado from public.perfiles order by rol, nombre;
