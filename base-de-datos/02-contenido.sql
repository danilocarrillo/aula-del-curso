-- =====================================================================
-- Aula del curso · 02 · Contenido de arranque (las 12 semanas, tareas y foros)
-- Se pega una sola vez, después del archivo 01. El profesor lo edita luego desde su panel.
-- =====================================================================

insert into public.semanas (n, titulo, lectura, instrucciones) values
  (1, 'Introducción: la vara y la casa. Prólogo: David Livingstone', 'Introducción y prólogo', '[Contenido pendiente: Danilo]'),
  (2, 'William y Anne Bagby, Brasil (1881)', 'Cap. 1', '[Contenido pendiente: Danilo]'),
  (3, 'Lottie Moon. William Sheppard y Alice Seeley Harris', 'Caps. 9-10', '[Contenido pendiente: Danilo]'),
  (4, 'M. Theron Rankin y los misioneros presos (1941-1942). John y Betty Stam', 'Caps. 2 y 17', '[Contenido pendiente: Danilo]'),
  (5, 'El Movimiento Radical de Recife. Eric Liddell', 'Caps. 7-8', '[Contenido pendiente: Danilo]'),
  (6, 'Bill Wallace. Los bautistas colombianos durante La Violencia', 'Caps. 11-12', '[Contenido pendiente: Danilo]'),
  (7, 'Un caso de abuso (1967-1973), sin nombres', 'Cap. 3', '[Contenido pendiente: Danilo]'),
  (8, 'Bold Mission Thrust y Baker James Cauthen. Keith Parks. La escuela de Fanda', 'Caps. 4, 13 y 18', '[Contenido pendiente: Danilo]'),
  (9, 'La firma de 2002-2003. La expulsión de Venezuela (2005)', 'Caps. 5 y 19', '[Contenido pendiente: Danilo]'),
  (10, 'El caso Aderholt y la voz de Anne Marie Miller', 'Cap. 6', '[Contenido pendiente: Danilo]'),
  (11, 'El retiro voluntario de 2015. La Convención Nacional Bautista de Venezuela', 'Caps. 14-15', '[Contenido pendiente: Danilo]'),
  (12, 'Cristo, el Siervo en la misión (Hebreos 3:1-6). Cierre', 'Caps. 20-21', '[Contenido pendiente: Danilo]');

insert into public.videos (semana, titulo, url, orden) values
  (1, 'Exposición del caso', '[enlace pendiente]', 1),
  (1, 'Metodología de lectura e instrucciones de la tarea', '[enlace pendiente]', 2),
  (2, 'Exposición del caso', '[enlace pendiente]', 1),
  (2, 'Metodología de lectura e instrucciones de la tarea', '[enlace pendiente]', 2),
  (3, 'Exposición del caso', '[enlace pendiente]', 1),
  (3, 'Metodología de lectura e instrucciones de la tarea', '[enlace pendiente]', 2),
  (4, 'Exposición del caso', '[enlace pendiente]', 1),
  (4, 'Metodología de lectura e instrucciones de la tarea', '[enlace pendiente]', 2),
  (5, 'Exposición del caso', '[enlace pendiente]', 1),
  (5, 'Metodología de lectura e instrucciones de la tarea', '[enlace pendiente]', 2),
  (6, 'Exposición del caso', '[enlace pendiente]', 1),
  (6, 'Metodología de lectura e instrucciones de la tarea', '[enlace pendiente]', 2),
  (7, 'Exposición del caso', '[enlace pendiente]', 1),
  (7, 'Metodología de lectura e instrucciones de la tarea', '[enlace pendiente]', 2),
  (8, 'Exposición del caso', '[enlace pendiente]', 1),
  (8, 'Metodología de lectura e instrucciones de la tarea', '[enlace pendiente]', 2),
  (9, 'Exposición del caso', '[enlace pendiente]', 1),
  (9, 'Metodología de lectura e instrucciones de la tarea', '[enlace pendiente]', 2),
  (10, 'Exposición del caso', '[enlace pendiente]', 1),
  (10, 'Metodología de lectura e instrucciones de la tarea', '[enlace pendiente]', 2),
  (11, 'Exposición del caso', '[enlace pendiente]', 1),
  (11, 'Metodología de lectura e instrucciones de la tarea', '[enlace pendiente]', 2),
  (12, 'Exposición del caso', '[enlace pendiente]', 1),
  (12, 'Metodología de lectura e instrucciones de la tarea', '[enlace pendiente]', 2);

insert into public.tareas (id, tipo, titulo, semana, peso, min_palabras, max_palabras, rubrica) values
  ('r1', 'resena', 'Reseña 1', 1, 2, 600, 800, '[{"k":"historia","t":"La historia","max":10},{"k":"centro","t":"El centro","max":15},{"k":"habitaciones","t":"Las habitaciones","max":25},{"k":"vara","t":"La vara y Cristo","max":20},{"k":"ensena","t":"Lo que me enseña","max":15},{"k":"redaccion","t":"Redacción y formato","max":15}]'::jsonb),
  ('r2', 'resena', 'Reseña 2', 2, 2, 600, 800, '[{"k":"historia","t":"La historia","max":10},{"k":"centro","t":"El centro","max":15},{"k":"habitaciones","t":"Las habitaciones","max":25},{"k":"vara","t":"La vara y Cristo","max":20},{"k":"ensena","t":"Lo que me enseña","max":15},{"k":"redaccion","t":"Redacción y formato","max":15}]'::jsonb),
  ('r3', 'resena', 'Reseña 3', 3, 2, 600, 800, '[{"k":"historia","t":"La historia","max":10},{"k":"centro","t":"El centro","max":15},{"k":"habitaciones","t":"Las habitaciones","max":25},{"k":"vara","t":"La vara y Cristo","max":20},{"k":"ensena","t":"Lo que me enseña","max":15},{"k":"redaccion","t":"Redacción y formato","max":15}]'::jsonb),
  ('r4', 'resena', 'Reseña 4', 4, 2, 600, 800, '[{"k":"historia","t":"La historia","max":10},{"k":"centro","t":"El centro","max":15},{"k":"habitaciones","t":"Las habitaciones","max":25},{"k":"vara","t":"La vara y Cristo","max":20},{"k":"ensena","t":"Lo que me enseña","max":15},{"k":"redaccion","t":"Redacción y formato","max":15}]'::jsonb),
  ('r5', 'resena', 'Reseña 5', 5, 2, 600, 800, '[{"k":"historia","t":"La historia","max":10},{"k":"centro","t":"El centro","max":15},{"k":"habitaciones","t":"Las habitaciones","max":25},{"k":"vara","t":"La vara y Cristo","max":20},{"k":"ensena","t":"Lo que me enseña","max":15},{"k":"redaccion","t":"Redacción y formato","max":15}]'::jsonb),
  ('r6', 'resena', 'Reseña 6', 7, 2, 600, 800, '[{"k":"historia","t":"La historia","max":10},{"k":"centro","t":"El centro","max":15},{"k":"habitaciones","t":"Las habitaciones","max":25},{"k":"vara","t":"La vara y Cristo","max":20},{"k":"ensena","t":"Lo que me enseña","max":15},{"k":"redaccion","t":"Redacción y formato","max":15}]'::jsonb),
  ('r7', 'resena', 'Reseña 7', 8, 2, 600, 800, '[{"k":"historia","t":"La historia","max":10},{"k":"centro","t":"El centro","max":15},{"k":"habitaciones","t":"Las habitaciones","max":25},{"k":"vara","t":"La vara y Cristo","max":20},{"k":"ensena","t":"Lo que me enseña","max":15},{"k":"redaccion","t":"Redacción y formato","max":15}]'::jsonb),
  ('r8', 'resena', 'Reseña 8', 9, 2, 600, 800, '[{"k":"historia","t":"La historia","max":10},{"k":"centro","t":"El centro","max":15},{"k":"habitaciones","t":"Las habitaciones","max":25},{"k":"vara","t":"La vara y Cristo","max":20},{"k":"ensena","t":"Lo que me enseña","max":15},{"k":"redaccion","t":"Redacción y formato","max":15}]'::jsonb),
  ('r9', 'resena', 'Reseña 9', 10, 2, 600, 800, '[{"k":"historia","t":"La historia","max":10},{"k":"centro","t":"El centro","max":15},{"k":"habitaciones","t":"Las habitaciones","max":25},{"k":"vara","t":"La vara y Cristo","max":20},{"k":"ensena","t":"Lo que me enseña","max":15},{"k":"redaccion","t":"Redacción y formato","max":15}]'::jsonb),
  ('r10', 'resena', 'Reseña 10', 11, 2, 600, 800, '[{"k":"historia","t":"La historia","max":10},{"k":"centro","t":"El centro","max":15},{"k":"habitaciones","t":"Las habitaciones","max":25},{"k":"vara","t":"La vara y Cristo","max":20},{"k":"ensena","t":"Lo que me enseña","max":15},{"k":"redaccion","t":"Redacción y formato","max":15}]'::jsonb);

insert into public.foros (id, semana, titulo, tema, con_nota, siempre_abierto, ver_despues, orden) values
  ('pres', 1, 'Presentación', '[Tema pendiente: Danilo]', false, true, false, 1),
  ('f1', 2, 'Foro 1', '[Tema pendiente: Danilo]', true, false, true, 2),
  ('f2', 4, 'Foro 2', '[Tema pendiente: Danilo]', true, false, true, 3),
  ('f3', 8, 'Foro 3', '[Tema pendiente: Danilo]', true, false, true, 4),
  ('f4', 10, 'Foro 4', '[Tema pendiente: Danilo]', true, false, true, 5),
  ('preg', 1, 'Preguntas para el profesor', '[Tema pendiente: Danilo]', false, true, false, 6);
