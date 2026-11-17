#!/bin/bash
# Prueba las reglas de seguridad en un PostgreSQL local que imita a Supabase.
# Uso: bash probar-seguridad.sh   (necesita PostgreSQL instalado; se ejecuta como root o postgres)
set -u
AQUI="$(cd "$(dirname "$0")" && pwd)"; BD="$AQUI/.."
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1); D=$(mktemp -d /tmp/aula-pg.XXXX); chmod 777 "$D"; PORT=54329
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else sh -c "$*"; fi; }
run "$PGBIN/initdb -D $D/data -A trust -U postgres >/dev/null" && run "$PGBIN/pg_ctl -D $D/data -o '-p $PORT -k $D' -l $D/log -w start >/dev/null" || { echo "No pude iniciar PostgreSQL"; exit 2; }
trap 'run "$PGBIN/pg_ctl -D $D/data -m immediate stop >/dev/null"; rm -rf "$D"' EXIT
P="psql -X -q -h $D -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1"
$P <<'SQL' || exit 2
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema storage to authenticated; grant select, insert, delete on storage.objects to authenticated;
SQL
$P -f "$BD/01-esquema.sql" >/dev/null || { echo "FALLA: el archivo 01 no se pudo aplicar"; exit 1; }
$P -f "$BD/02-contenido.sql" >/dev/null || { echo "FALLA: el archivo 02 no se pudo aplicar"; exit 1; }
$P -f "$BD/05-archivos.sql" >/dev/null || { echo "FALLA: el archivo 05 no se pudo aplicar"; exit 1; }
# Hoy cae en la semana 2 del curso.
$P -c "update configuracion set inicio = (date_trunc('week', now() at time zone zona))::date - 7" >/dev/null
$P <<'SQL'
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','ana@aula.prueba','{"nombre":"Ana Ejemplo"}'),
 ('00000000-0000-0000-0000-00000000000b','bruno@aula.prueba','{"nombre":"Bruno Prueba"}'),
 ('00000000-0000-0000-0000-00000000000c','carla@aula.prueba','{"nombre":"Carla Muestra"}'),
 ('00000000-0000-0000-0000-00000000000d','profesor@aula.prueba','{"nombre":"Profesor de Prueba"}'),
 ('00000000-0000-0000-0000-00000000000e','intruso@aula.prueba','{}');
update perfiles set estado='activo' where id <> '00000000-0000-0000-0000-00000000000e';
update perfiles set rol='profesor' where id = '00000000-0000-0000-0000-00000000000d';
SQL
A=00000000-0000-0000-0000-00000000000a; B=00000000-0000-0000-0000-00000000000b; C=00000000-0000-0000-0000-00000000000c; PR=00000000-0000-0000-0000-00000000000d; X=00000000-0000-0000-0000-00000000000e
como() { echo "begin; set local role authenticated; set local request.jwt.claim.sub = '$1'; $2; commit;" | psql -X -q -t -A -h $D -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 2>&1 | grep -v '^$'; }
anon() { psql -X -q -t -A -h $D -p $PORT -U postgres -d postgres -c "begin; set local role anon; $1; commit;" 2>&1; }
OK=0; MAL=0
es()  { if [ "$2" = "$3" ]; then OK=$((OK+1)); echo "  ok    $1"; else MAL=$((MAL+1)); echo "  FALLA $1  (esperaba «$3», obtuve «$2»)"; fi; }
tiene() { if echo "$2" | grep -q "$3"; then OK=$((OK+1)); echo "  ok    $1"; else MAL=$((MAL+1)); echo "  FALLA $1  (obtuve «$2»)"; fi; }
T600="'$(yes palabra | head -650 | tr '\n' ' ')'"; T400="'$(yes palabra | head -410 | tr '\n' ' ')'"; T160="'$(yes palabra | head -160 | tr '\n' ' ')'"

echo "— Sin iniciar sesión y cuentas no activadas"
tiene "sin sesión no se lee ninguna tabla" "$(anon 'select count(*) from semanas')" "permission denied"
es "cuenta nueva nace pendiente" "$($P -t -A -c "select estado from perfiles where id='$X'")" "pendiente"
es "cuenta pendiente no ve semanas" "$(como $X 'select count(*) from semanas')" "0"
es "cuenta pendiente no ve mensajes ni perfiles ajenos" "$(como $X 'select (select count(*) from mensajes) + (select count(*) from perfiles where id <> auth.uid())')" "0"
tiene "cuenta pendiente no puede entregar" "$(como $X "insert into entregas (tarea, texto, ia_uso) values ('r1', $T600, 'no')")" "row-level security"

echo "— Entregas"
tiene "sin declaración de IA no se puede entregar" "$(como $A "insert into entregas (tarea, texto) values ('r1', $T600)")" "ia_uso"
tiene "«Usé» sin decir qué: no se puede entregar" "$(como $A "insert into entregas (tarea, texto, ia_uso) values ('r1', $T600, 'si')")" "check"
es "Ana entrega su reseña 1" "$(como $A "insert into entregas (tarea, texto, ia_uso) values ('r1', $T600, 'no') returning palabras")" "650"
como $B "insert into entregas (tarea, texto, ia_uso, ia_detalle) values ('r1', $T600, 'si', 'Corrector de ortografía')" >/dev/null
es "la fecha la pone el servidor aunque el estudiante mande otra" "$(como $C "insert into entregas (tarea, texto, ia_uso, entregada_en, prorroga) values ('r1', $T600, 'no', '2020-01-01', true) returning (entregada_en > now() - interval '1 minute') and not prorroga")" "t"
tiene "no puede entregar a nombre de otro" "$(como $A "insert into entregas (tarea, texto, ia_uso, estudiante) values ('r2', $T600, 'no', '$B')  returning estudiante")" "$A"
tiene "no puede entregar una tarea de una semana que no ha abierto" "$(como $A "insert into entregas (tarea, texto, ia_uso) values ('r3', $T600, 'no')")" "todavía no abre"
es "Ana ve solo su entrega de la reseña 1" "$(como $A "select count(*) from entregas where tarea='r1'")" "1"
es "Ana no puede leer la entrega de Bruno" "$(como $A "select count(*) from entregas where estudiante='$B'")" "0"
es "Ana no puede cambiar la entrega de Bruno" "$(como $A "update entregas set texto='cambiado' where estudiante='$B' returning 1" | wc -l | tr -d ' ')" "0"
tiene "nadie puede borrar entregas" "$(como $A "delete from entregas")" "permission denied"
es "el profesor ve las 4 entregas" "$(como $PR 'select count(*) from entregas')" "4"

echo "— Notas"
EA=$($P -t -A -c "select id from entregas where estudiante='$A' and tarea='r1'"); EB=$($P -t -A -c "select id from entregas where estudiante='$B' and tarea='r1'")
tiene "un estudiante no puede ponerse nota" "$(como $A "insert into calificaciones (entrega, puntos, total, nota, publicada) values ('$EA', '{}', 100, 100, true)")" "row-level security"
como $PR "insert into calificaciones (entrega, puntos, total, nota, publicada) values ('$EA', '{\"historia\":9}', 88, 88, false)" >/dev/null
es "nota sin publicar: el estudiante no la ve" "$(como $A 'select count(*) from calificaciones')" "0"
como $PR "update calificaciones set publicada = true where entrega = '$EA'" >/dev/null
es "nota publicada: el estudiante ve la suya" "$(como $A 'select nota::int from calificaciones')" "88"
es "Bruno no ve la nota de Ana" "$(como $B 'select count(*) from calificaciones')" "0"
es "un estudiante no puede cambiar su nota" "$(como $A "update calificaciones set nota = 100 returning 1" | wc -l | tr -d ' ')" "0"
tiene "entrega ya calificada no se puede cambiar" "$(como $A "update entregas set texto = $T600 where id = '$EA'")" "ya está calificada"
es "el profesor concede prórroga sin tocar el texto" "$(como $PR "update entregas set prorroga = true, texto = 'otro' where id = '$EB' returning prorroga and palabras = 650")" "t"
es "un estudiante no puede darse prórroga" "$(como $C "update entregas set prorroga = true, texto = $T600 where tarea = 'r1' returning prorroga")" "f"

echo "— Foros"
MA=$(como $A "insert into mensajes (foro, texto) values ('f1', $T400) returning id")
es "aporte de Ana guardado con sus palabras contadas" "$($P -t -A -c "select palabras from mensajes where id='$MA'")" "410"
es "Bruno no ve aportes ajenos antes de publicar el suyo" "$(como $B "select count(*) from mensajes where foro='f1'")" "0"
MB=$(como $B "insert into mensajes (foro, texto) values ('f1', $T400) returning id")
es "después de publicar, Bruno ve los dos aportes" "$(como $B "select count(*) from mensajes where foro='f1'")" "2"
tiene "no puede publicar dos aportes en el mismo foro" "$(como $B "insert into mensajes (foro, texto) values ('f1', $T400)")" "Ya publicaste"
tiene "no puede responderse a sí mismo" "$(como $B "insert into mensajes (foro, texto, responde) values ('f1', $T160, '$MB')")" "propio aporte"
RB=$(como $B "insert into mensajes (foro, texto, responde) values ('f1', $T160, '$MA') returning id")
tiene "no puede escribir a nombre de otro" "$(como $B "insert into mensajes (foro, texto, responde, autor) values ('pres', 'hola', null, '$A') returning autor")" "$B"
tiene "nadie puede editar ni borrar mensajes" "$(como $B "update mensajes set texto='x'")" "permission denied"
tiene "foro que no ha abierto no acepta mensajes" "$(como $A "insert into mensajes (foro, texto) values ('f2', $T400)")" "cerrado"
$P -c "update configuracion set inicio = inicio - 7" >/dev/null   # ahora estamos en la semana 3: el foro 1 cerró el domingo
tiene "después del domingo el foro no acepta mensajes" "$(como $C "insert into mensajes (foro, texto) values ('f1', $T400)")" "cerrado"
es "foro cerrado: Carla ya puede leerlo aunque no publicó" "$(como $C "select count(*) from mensajes where foro='f1'")" "3"
es "el profesor sí puede escribir en un foro cerrado" "$(como $PR "insert into mensajes (foro, texto) values ('f1', 'Cierre del profesor') returning palabras")" "3"
$P -c "update configuracion set inicio = inicio + 7" >/dev/null
como $A "insert into valoraciones (mensaje, lista) values ('$MA', '{\"vara\":true}')" >/dev/null
como $B "insert into valoraciones (mensaje, lista) values ('$RB', '{\"vara\":false}')" >/dev/null
es "la autoevaluación de Ana no la ven sus compañeros" "$(como $B "select count(*) from valoraciones where mensaje='$MA'")" "0"
es "el profesor ve todas las valoraciones" "$(como $PR 'select count(*) from valoraciones')" "2"
tiene "no puede valorar con un mensaje ajeno" "$(como $C "insert into valoraciones (mensaje, lista) values ('$MB', '{}')")" "row-level security"
tiene "un estudiante no puede ponerse nota de foro" "$(como $A "insert into notas_foro (foro, estudiante, nota, publicada) values ('f1', '$A', 100, true)")" "row-level security"
como $PR "insert into notas_foro (foro, estudiante, nota, publicada) values ('f1', '$A', 85, true), ('f1', '$B', 50, false)" >/dev/null
es "nota de foro: cada uno ve solo la suya y solo si está publicada" "$(como $A 'select count(*) from notas_foro')/$(como $B 'select count(*) from notas_foro')" "1/0"

echo "— Archivos"
EC=$($P -t -A -c "select id from entregas where estudiante='$C' and tarea='r1'")
es "entrega solo con archivos: se acepta sin texto" "$(como $B "insert into entregas (tarea, texto, ia_uso) values ('r2', '', 'no') returning palabras")" "0"
es "Carla adjunta un archivo a su entrega" "$(como $C "insert into archivos (entrega, ruta, nombre) values ('$EC', '$C/r1/a.pdf', 'a.pdf') returning nombre")" "a.pdf"
tiene "no puede adjuntar a la entrega de otro" "$(como $C "insert into archivos (entrega, ruta, nombre) values ('$EB', '$C/r1/b.pdf', 'b.pdf')")" "row-level security"
tiene "no puede registrar un archivo fuera de su carpeta" "$(como $C "insert into archivos (entrega, ruta, nombre) values ('$EC', '$B/r1/c.pdf', 'c.pdf')")" "row-level security"
tiene "entrega calificada: ya no admite archivos" "$(como $A "insert into archivos (entrega, ruta, nombre) values ('$EA', '$A/r1/d.pdf', 'd.pdf')")" "row-level security"
es "Bruno no ve los archivos de Carla" "$(como $B 'select count(*) from archivos')" "0"
es "el profesor ve los archivos" "$(como $PR 'select count(*) from archivos')" "1"
for i in 2 3 4 5 6; do como $C "insert into archivos (entrega, ruta, nombre) values ('$EC', '$C/r1/$i.jpg', '$i.jpg')" >/dev/null; done
tiene "el séptimo archivo se rechaza" "$(como $C "insert into archivos (entrega, ruta, nombre) values ('$EC', '$C/r1/7.jpg', '7.jpg')")" "hasta 6 archivos"
es "almacén: sube a su propia carpeta" "$(como $C "insert into storage.objects (bucket_id, name) values ('entregas', '$C/r1/a.pdf') returning bucket_id")" "entregas"
tiene "almacén: no puede subir a la carpeta de otro" "$(como $C "insert into storage.objects (bucket_id, name) values ('entregas', '$B/r1/x.pdf')")" "row-level security"
es "almacén: Bruno no ve lo de Carla; el profesor sí" "$(como $B 'select count(*) from storage.objects')/$(como $PR 'select count(*) from storage.objects')" "0/1"
es "almacén: Bruno no puede borrar lo de Carla" "$(como $B "delete from storage.objects returning 1" | wc -l | tr -d ' ')" "0"

echo "— Contenido y roles"
tiene "un estudiante no puede editar las semanas" "$(como $A "update semanas set titulo='x' where n=1 returning 1" | wc -l | tr -d ' ')" "0"
es "el profesor sí edita una semana" "$(como $PR "update semanas set instrucciones='Nota de prueba' where n=3 returning n")" "3"
es "videos de una semana que no ha abierto no se ven" "$(como $A 'select count(distinct semana) from videos')" "2"
es "un estudiante no puede hacerse profesor" "$(como $A "update perfiles set rol='profesor' where id=auth.uid() returning 1" | wc -l | tr -d ' ')" "0"
es "el profesor activa una cuenta pendiente" "$(como $PR "update perfiles set estado='activo' where id='$X' returning estado")" "activo"
es "marcas personales: cada uno ve las suyas" "$(como $A "insert into marcas (clave) values ('2:0'); select count(*) from marcas")/$(como $B 'select count(*) from marcas')" "1/0"
es "cuenta dada de baja deja de ver el curso" "$($P -q -c "update perfiles set estado='baja' where id='$C'"; como $C 'select (select count(*) from semanas) + (select count(*) from entregas) + (select count(*) from mensajes)')" "0"
echo; echo "$OK correctas, $MAL fallas"; [ $MAL = 0 ]
