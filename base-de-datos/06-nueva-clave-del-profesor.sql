-- =====================================================================
-- Aula del curso · 06 · Poner una contraseña nueva a tu cuenta
--
-- ANTES DE PULSAR RUN: en la línea que empieza con «nueva text»,
-- cambia SOLO el texto que está entre las comillas simples
-- por la contraseña que quieres usar (al menos 8 caracteres).
-- No borres las comillas.
--
-- Al terminar, abajo aparece el correo exacto con el que quedó tu cuenta.
-- =====================================================================

do $$
declare
  nueva text := 'ESCRIBE-AQUI-TU-NUEVA-CLAVE';
begin
  if nueva like 'ESCRIBE-AQUI%' or length(nueva) < 8 then
    raise exception 'Primero cambia el texto entre comillas por tu nueva contraseña (al menos 8 caracteres).';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(nueva, extensions.gen_salt('bf')), updated_at = now()
   where id = (select id from auth.users where email not like '%@aula.prueba' order by created_at limit 1);
end $$;

select email as "correo de tu cuenta"
  from auth.users where email not like '%@aula.prueba' order by created_at limit 1;
