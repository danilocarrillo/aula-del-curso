# Aula del curso

Aula en línea del curso «Teología del liderazgo en la misión: estudio de casos (1870-2026)».

## Estado

**Fase 1 · prototipo navegable.** Las pantallas y las reglas funcionan con datos de ejemplo.
Todavía no hay cuentas reales ni base de datos: lo que se hace en el prototipo se guarda solo en el navegador de quien lo usa.

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

## Qué hay en esta carpeta

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
