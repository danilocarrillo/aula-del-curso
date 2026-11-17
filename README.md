# Aula del curso

Aula en línea del curso «Teología del liderazgo en la misión: estudio de casos (1870-2026)».

## Estado

**Fase 1 · aula real en pruebas.** El aula ya entra con correo y contraseña y guarda todo en la base de datos (Supabase).
Funciona con cuatro cuentas de prueba. Falta publicarla en una dirección de internet y cargar el contenido del profesor.

La carpeta `prototipo/` conserva la primera maqueta, que funciona sin base de datos.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Plataforma | Aplicación propia, sin nada que dependa de Wix. Dirección final: `aula.[dominio del curso]` |
| Costo | Todo gratuito, para el profesor y para los estudiantes |
| Videos | YouTube como «no listado»; el aula guarda solo el enlace |
| Evaluaciones | De selección, calificadas solas contra la clave verificada |
| Entregas escritas | Las califica el profesor con rúbrica. Sin inteligencia artificial |
| Foros | Autoevaluación en tres capas (cumplimiento, autoevaluación, valoración entre compañeros) y un registro que el profesor revisa después |
| Forma del curso | La ruta de la semana: mira, lee, escribe, conversa |

Pendientes de decidir: dirección de correo de los avisos, número de preguntas y tiempo de las evaluaciones, confirmación de las rúbricas, forma de inscripción.

## Carpetas

- `aula/` — el aula real: `index.html`, `app.js` (pantallas y conexión), `reglas.js` (reglas del curso), `config.js` (dirección y llave pública) y `supabase.js` (biblioteca de conexión, copiada tal cual).
- `base-de-datos/` — lo que se pega en Supabase, en orden: `01-esquema.sql` (tablas y seguridad), `02-contenido.sql` (12 semanas, tareas, foros), `03-cuentas-de-prueba.sql`.
- `prototipo/` — la maqueta inicial.

## Seguridad, en pocas palabras

- Sin iniciar sesión no se lee nada. Una cuenta nueva nace «pendiente» y no ve el curso hasta que el profesor la activa.
- Cada estudiante ve y escribe solo lo suyo. Las notas se ven solo cuando el profesor las publica.
- La fecha de entrega la pone el servidor. Los foros se cierran en la base de datos, no solo en la pantalla.
- La llave que está en `config.js` es pública por diseño. Nunca se guarda aquí una llave «secret» ni la contraseña de la base de datos.

## Pruebas

```sh
node prototipo/pruebas/prueba-reglas.js              # reglas del curso
bash base-de-datos/pruebas/probar-seguridad.sh       # seguridad, en un PostgreSQL local
AULA_CLAVE_PRUEBA=... node aula/pruebas/probar-real.js   # el aula real, en un navegador, contra la base de datos
```

Antes de inscribir estudiantes reales: borrar las cuentas `@aula.prueba` y sus datos, y poner `modoPrueba: false` en `aula/config.js`.

## Qué hay en esta carpeta (maqueta)

- `prototipo/reglas.js` — las reglas del curso en un solo lugar: fechas, atrasos, foros, promedios y letras.
- `prototipo/app.js` — las pantallas del estudiante y del profesor.
- `prototipo/cascara.html` — la estructura y el diseño.
- `prototipo/armar.sh` — une las tres piezas en `aula-del-curso.html`.
- `prototipo/pruebas/` — comprobaciones automáticas de las reglas y de las pantallas.

## Cómo comprobar que todo funciona

```sh
sh prototipo/armar.sh
node prototipo/pruebas/prueba-reglas.js
node prototipo/pruebas/probar.js "$PWD/prototipo/aula-del-curso.html"
```

La segunda prueba necesita Playwright con Chromium y toma capturas a 375 px de ancho.

## Reglas de contenido

- No se inventa contenido académico. Lo que falta se marca `[Contenido pendiente: Danilo]`.
- Los datos de prueba usan nombres claramente inventados.
- Se dice «herencia de tres generaciones».
- El curso enseña una sola vida: no se usan palabras que la dividan.
