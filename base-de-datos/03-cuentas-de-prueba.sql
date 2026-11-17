-- =====================================================================
-- Aula del curso · 03 · Activar las cuentas de prueba
-- Activa las cuatro cuentas de ejemplo (correos @aula.prueba) y
-- convierte a una de ellas en profesor. Al final muestra cómo quedaron.
-- =====================================================================

update public.perfiles set estado = 'activo'
 where id in (select id from auth.users where email like '%@aula.prueba');

update public.perfiles set rol = 'profesor'
 where id = (select id from auth.users where email = 'profesor@aula.prueba');

select nombre, rol, estado from public.perfiles order by rol, nombre;
