// Recorre el aula real en un navegador, a tamaño de teléfono, contra la base de datos.
// Uso: AULA_CLAVE_PRUEBA=... node probar-real.js   (sirve la carpeta aula/ en un puerto local)
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const CLAVE = process.env.AULA_CLAVE_PRUEBA; if (!CLAVE) { console.log('Falta AULA_CLAVE_PRUEBA'); process.exit(2); }
const raiz = path.join(__dirname, '..'); const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const srv = http.createServer((q, r) => { const f = path.join(raiz, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise(r => srv.listen(0, r)); const URL0 = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 375, height: 780 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let ok = 0, bad = 0; const t = (n, c) => { c ? ok++ : bad++; console.log((c ? '  ok    ' : '  FALLA ') + n); };
  const ov = async n => { const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (o > 1) { bad++; console.log('  FALLA desborda en ' + n + ' +' + o + 'px'); } };
  const quieto = async () => { await p.waitForFunction(() => !document.body.classList.contains('ocupado') && !/Cargando el aula/.test(document.getElementById('vista').innerText), null, { timeout: 30000 }); await p.waitForTimeout(150); };
  const vista = async () => (await p.innerText('#vista'));
  const av = async () => (await p.innerText('#aviso'));
  const menu = async n => { await p.click('nav.menu button:has-text("' + n + '")'); await quieto(); };
  const entra = async c => { if (await p.$('button[data-a=salir]')) { await p.click('button[data-a=salir]'); await quieto(); } await p.fill('#correo', c + '@aula.prueba'); await p.fill('#clave', CLAVE); await p.click('button[data-a=entrar]'); await quieto(); };
  await p.goto(URL0); await quieto();
  t('sin entrar: solo la pantalla de entrada', /Entrar/.test(await vista()) && !(await p.isVisible('nav.menu'))); await ov('entrada');
  await p.fill('#correo', 'bruno@aula.prueba'); await p.fill('#clave', 'no-es-la-clave'); await p.click('button[data-a=entrar]'); await quieto();
  t('contraseña equivocada: no entra y avisa', /no coinciden/.test(await av()) && !(await p.isVisible('nav.menu')));
  await entra('bruno'); let v = await vista();
  t('Bruno entra con su contraseña real', /Hola, Bruno/.test(v) && /SEMANA \d+ DE 12/i.test(v)); await ov('inicio'); await p.screenshot({ path: 's_real_inicio.png', fullPage: true });
  await p.reload(); await quieto(); t('al recargar la página sigue dentro', /Hola, Bruno/.test(await vista()));
  await menu('El curso'); await ov('curso'); const sem = await p.evaluate(() => document.querySelector('details.sem[open]').id.replace('det-', ''));
  const cb = '#visto-' + sem + '-0'; const antes = await p.isChecked(cb); await p.click(cb); await quieto();
  await p.reload(); await quieto(); await menu('El curso');
  t('la marca «Lo vi» se guarda en la base de datos', (await p.isChecked(cb)) === !antes);
  // Reseña 1
  await menu('Mis tareas'); v = await vista();
  if (/Reseña 1[\s\S]{0,80}Calificada/.test(v)) { t('reseña 1 ya calificada en una corrida anterior', true); }
  else {
    await p.click('section.tarea:has-text("Reseña 1") button'); await quieto(); await ov('entregar');
    if (!(await p.inputValue('#texto-resena'))) await p.click('button:has-text("Rellenar con texto")');
    await p.check('#ia-si'); await p.fill('#ia-detalle', ''); t('sin detalle de IA el botón está bloqueado', await p.isDisabled('#confirmar'));
    await p.fill('#ia-detalle', 'Corrector de ortografía'); await p.click('#confirmar'); await quieto();
    t('entrega guardada, con el atraso calculado', /Entrega recibida\. Llegó con \d+ día\(s\) de atraso: se restarán \d+ puntos/.test(await av()));
  }
  // Foro 1
  await menu('Foros'); await p.click('.item:has-text("Foro 1")'); await quieto(); v = await vista();
  if (/Tu aporte\s/.test(v) && await p.$('#texto-aporte')) {
    await p.click('button:has-text("Rellenar con texto")'); await p.check('#auto-historia'); await p.click('button:has-text("Publicar aporte")'); await quieto();
    t('aporte publicado en el foro', /Aporte publicado/.test(await av()));
  } else t('Bruno ya tenía su aporte en el foro', /Bruno Prueba/.test(v));
  await ov('foro');
  // Ana: aislamiento
  await entra('ana'); await menu('Mis tareas'); v = await vista();
  t('Ana no ve la entrega de Bruno', !/Bruno|Corrector de ortografía/.test(v) && /Reseña 1[\s\S]{0,60}(Vencida|Pendiente|Entregada|Calificada)/.test(v));
  t('el menú de Ana no ofrece pantallas del profesor', !(await p.$('nav.menu button:has-text("Entregas")')));
  await menu('Foros'); await p.click('.item:has-text("Foro 1")'); await quieto(); v = await vista();
  const anaTiene = /Tu aporte\n|Ana Ejemplo/.test(v) && !(await p.$('#texto-aporte'));
  if (!anaTiene) { t('Ana no ve el aporte de Bruno antes de publicar el suyo', !/Bruno Prueba/.test(v)); await p.click('button:has-text("Rellenar con texto")'); await p.check('#auto-vara'); await p.click('button:has-text("Publicar aporte")'); await quieto(); }
  v = await vista(); t('con su aporte publicado, Ana ve el de Bruno', /Bruno Prueba/.test(v));
  if (await p.$('summary:has-text("Responder a Bruno")')) { await p.click('summary:has-text("Responder a Bruno")'); await p.click('details[open] button:has-text("Rellenar")'); await p.click('details[open] button:has-text("Publicar respuesta")'); await quieto(); t('Ana responde a Bruno', /Respuesta publicada/.test(await av())); }
  // Profesor
  await entra('profesor'); v = await vista(); t('el profesor ve su panel', /Panel del profesor/.test(v)); await ov('panel');
  await menu('Entregas'); v = await vista(); t('el profesor ve la entrega de Bruno', /Bruno Prueba/.test(v)); await ov('entregas');
  await p.click('section:has-text("Bruno Prueba"):has-text("Reseña 1") button'); await quieto(); await ov('calificar');
  for (const [k, n] of [['historia', 9], ['centro', 14], ['habitaciones', 23], ['vara', 18], ['ensena', 13], ['redaccion', 13]]) await p.fill('#pt-' + k, String(n));
  const tot = await p.innerText('#total-rub'); const m = tot.match(/Nota final:\s*(\d+)/); const d = (tot.match(/−(\d+)/) || [0, 0])[1];
  t('rúbrica 90 menos el atraso da la nota final', /90 \/ 100/.test(tot) && m && +m[1] === 90 - +d); await p.screenshot({ path: 's_real_calificar.png', fullPage: true });
  await p.fill('#comentario', '[Comentario de prueba]'); await p.click('button:has-text("Publicar nota")'); await quieto(); t('nota publicada', /Nota publicada/.test(await av()));
  await menu('Notas'); v = await vista(); t('el libro de notas muestra la nota de Bruno', new RegExp('Bruno Prueba[\\s\\S]*' + m[1]).test(v)); await ov('libro');
  await menu('Foros'); v = await vista(); t('registro del foro con propuesta de nota', /Bruno Prueba[\s\S]*propuesta: \d+/.test(v)); await ov('registro');
  await menu('Personas'); v = await vista(); t('lista de personas con las 4 cuentas', ['Ana Ejemplo', 'Bruno Prueba', 'Carla Muestra', 'Profesor de Prueba'].every(n => v.includes(n))); await ov('personas');
  await menu('Contenido'); await p.click('.item >> nth=2'); await quieto(); const marca = 'Nota de prueba ' + Date.now(); await p.fill('#c-instr', marca); await p.click('button:has-text("Guardar cambios")'); await quieto(); t('el profesor edita una semana', /guardada/.test(await av()));
  // Bruno ve su nota
  await entra('bruno'); await menu('Mis notas'); v = await vista(); t('Bruno ve su nota en «Mis notas»', new RegExp('NOTA ACUMULADA\\s*' + m[1], 'i').test(v)); await ov('notas'); await p.screenshot({ path: 's_real_notas.png', fullPage: true });
  await menu('Mis tareas'); t('Bruno ve el comentario del profesor', /\[Comentario de prueba\]/.test(await vista()));
  console.log('errores de página:', errs.length ? errs : 'ninguno'); console.log(`\n${ok} correctas, ${bad} fallas`);
  await b.close(); srv.close(); process.exit(bad || errs.length ? 1 : 0);
})().catch(e => { console.log('ERROR', e); process.exit(1); });
