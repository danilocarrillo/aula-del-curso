-- =====================================================================
-- Aula del curso · 04 · La cuenta real del profesor
-- Convierte en profesor a la primera cuenta real que se creó
-- (la primera cuyo correo no termina en @aula.prueba).
-- Al final muestra cómo quedaron todas las cuentas.
-- =====================================================================

update public.perfiles set rol = 'profesor', estado = 'activo'
 where id = (select id from auth.users
              where email not like '%@aula.prueba'
              order by created_at limit 1);

select p.nombre, p.rol, p.estado
  from public.perfiles p order by p.rol, p.nombre;
