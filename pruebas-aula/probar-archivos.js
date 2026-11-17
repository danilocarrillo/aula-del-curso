// Prueba la entrega con documentos y fotos contra la base de datos real.
// Uso: AULA_CLAVE_PRUEBA=... AULA_ARCHIVOS=/carpeta/con/pagina-1.jpg,resena-de-ejemplo.pdf,virus.exe node probar-archivos.js
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const CLAVE = process.env.AULA_CLAVE_PRUEBA, DIR = process.env.AULA_ARCHIVOS; if (!CLAVE || !DIR) { console.log('Faltan AULA_CLAVE_PRUEBA o AULA_ARCHIVOS'); process.exit(2); }
const raiz = path.join(__dirname, '..', 'docs'); const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const srv = http.createServer((q, r) => { const f = path.join(raiz, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise(r => srv.listen(0, r)); const URL0 = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 375, height: 780 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let ok = 0, bad = 0; const t = (n, c) => { c ? ok++ : bad++; console.log((c ? '  ok    ' : '  FALLA ') + n); };
  const quieto = async () => { await p.waitForFunction(() => !document.body.classList.contains('ocupado') && !/Cargando el aula/.test(document.getElementById('vista').innerText), null, { timeout: 60000 }); await p.waitForTimeout(200); };
  const av = async () => (await p.innerText('#aviso')); const vista = async () => (await p.innerText('#vista'));
  const menu = async n => { await p.click('nav.menu button:has-text("' + n + '")'); await quieto(); };
  const entra = async c => { if (await p.$('button[data-a=salir]')) { await p.click('button[data-a=salir]'); await quieto(); } await p.fill('#correo', c + '@aula.prueba'); await p.fill('#clave', CLAVE); await p.click('button[data-a=entrar]'); await quieto(); };
  const token = async () => p.evaluate(() => { const k = Object.keys(localStorage).find(x => /auth-token/.test(x)); return JSON.parse(localStorage.getItem(k)).access_token; });
  await p.goto(URL0); await quieto(); await entra('carla');
  await menu('Mis tareas'); await p.click('section.tarea:has-text("Reseña 1") button[data-a=ir]'); await quieto();
  t('la pantalla de entrega ofrece adjuntar archivos', await p.isVisible('label[for=elige-arch]'));
  await p.fill('#texto-resena', ''); await p.dispatchEvent('#texto-resena', 'input'); await p.check('#ia-no');
  // quitar archivos de corridas anteriores
  while (await p.$('button[data-a=quitarArchivo]')) { await p.click('button[data-a=quitarArchivo]'); await quieto(); }
  t('sin texto y sin archivos no se puede entregar', await p.isDisabled('#confirmar'));
  await p.setInputFiles('#elige-arch', path.join(DIR, 'virus.exe')); await p.waitForTimeout(300);
  t('un archivo que no es PDF, Word ni imagen se rechaza', /no es PDF, Word ni imagen/.test(await av()) && await p.isDisabled('#confirmar'));
  await p.setInputFiles('#elige-arch', [path.join(DIR, 'pagina-1.jpg'), path.join(DIR, 'resena-de-ejemplo.pdf')]); await p.waitForTimeout(300);
  let v = await vista(); t('los dos archivos quedan en la lista, por subir', /pagina-1\.jpg[\s\S]*se sube al confirmar[\s\S]*resena-de-ejemplo\.pdf/.test(v));
  t('solo con archivos ya se puede entregar, y avisa que los revisa el profesor', !(await p.isDisabled('#confirmar')) && /En archivos no se puede contar/.test(v));
  await p.screenshot({ path: 's_arch_entregar.png', fullPage: true });
  const o = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); t('la pantalla cabe en el teléfono', o <= 1);
  await p.click('#confirmar'); await quieto(); t('entrega con archivos recibida', /Entrega recibida/.test(await av()));
  v = await vista(); t('en «Mis tareas» aparecen los dos archivos', /Foto · pagina-1\.jpg/.test(v) && /Documento · resena-de-ejemplo\.pdf/.test(v));
  const kb = (v.match(/pagina-1\.jpg\s*([\d,]+) (KB|MB)/) || []); const orig = fs.statSync(path.join(DIR, 'pagina-1.jpg')).size;
  t('la foto se redujo antes de subir (' + Math.round(orig / 1024) + ' KB → ' + kb[1] + ' ' + kb[2] + ')', kb[2] === 'KB' && +kb[1].replace(',', '.') * 1024 < orig);
  // Enlace firmado del propio estudiante
  // Las llamadas directas se hacen desde el navegador de la prueba, igual que lo haría un estudiante curioso.
  const cfg = await p.evaluate(() => window.AULA_CONFIG); const tc = await token();
  const api = (ruta, o) => p.evaluate(async ([u, o]) => { const r = await fetch(u, o); const tx = await r.text(); let j = null; try { j = JSON.parse(tx); } catch (e) {} return { status: r.status, j, n: tx.length }; }, [cfg.url + ruta, o || {}]);
  const cab = tk => Object.assign({ apikey: cfg.llavePublica }, tk ? { Authorization: 'Bearer ' + tk } : {});
  const filas = (await api('/rest/v1/archivos?select=ruta,nombre,tipo', { headers: cab(tc) })).j;
  const ruta = filas.find(f => /pdf/.test(f.nombre)).ruta;
  const firmar = async tk => (await api('/storage/v1/object/sign/entregas/' + ruta, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, cab(tk)), body: JSON.stringify({ expiresIn: 600 }) })).j || {};
  const bajar = async tk => (await api('/storage/v1/object/authenticated/entregas/' + ruta, { headers: cab(tk) })).status;
  const s1 = await firmar(tc); const r1 = s1.signedURL ? await api('/storage/v1' + s1.signedURL) : { status: 0, n: 0 };
  t('Carla abre su propio documento con un enlace que caduca', r1.status === 200 && r1.n > 100);
  t('sin iniciar sesión el archivo no se puede bajar', (await api('/storage/v1/object/public/entregas/' + ruta)).status >= 400 && (await bajar(null)) >= 400);
  // Ana no puede
  await entra('ana'); const ta = await token();
  const fa = (await api('/rest/v1/archivos?select=ruta', { headers: cab(ta) })).j;
  t('Ana no ve la lista de archivos de Carla', Array.isArray(fa) && !fa.some(f => f.ruta === ruta));
  const s2 = await firmar(ta); t('Ana no puede abrir ni bajar el documento de Carla', !s2.signedURL && (await bajar(ta)) >= 400);
  const sub = await api('/storage/v1/object/entregas/' + ruta.split('/')[0] + '/r1/intruso.pdf', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/pdf' }, cab(ta)), body: '%PDF-1.4 intruso' });
  t('Ana no puede subir nada a la carpeta de Carla', sub.status >= 400);
  // Profesor
  await entra('profesor'); await menu('Entregas'); v = await vista(); t('el profesor ve que la entrega de Carla trae 2 archivos', /Carla Muestra[\s\S]{0,120}2 archivo\(s\)/.test(v));
  await p.click('section:has-text("Carla Muestra"):has-text("Reseña 1") button'); await quieto(); await p.waitForSelector('#vistas-arch img', { timeout: 20000 });
  const img = await p.evaluate(() => new Promise(r => { const i = document.querySelector('#vistas-arch img'); if (i.complete && i.naturalWidth) r(i.naturalWidth); else { i.onload = () => r(i.naturalWidth); i.onerror = () => r(0); } }));
  t('al calificar, la foto se ve en la misma pantalla (' + img + ' px de ancho)', img > 0 && img <= 2000);
  v = await vista(); t('y avisa que no hay texto escrito', /Sin texto escrito: la entrega está en los archivos/.test(v) && /En archivos no se puede contar/.test(v));
  await p.screenshot({ path: 's_arch_calificar.png', fullPage: true });
  // Se prueba con la foto: un PDF se descarga en este navegador de prueba en vez de mostrarse.
  const fila = p.locator('ul.archivos li', { hasText: 'pagina-1.jpg' }).first();
  const [nueva] = await Promise.all([ctx.waitForEvent('page'), fila.locator('button[data-a=abrirArchivo]').click()]); await nueva.waitForURL(/supabase\.co\/storage/, { timeout: 20000 }).catch(() => {});
  t('el botón «Abrir» lleva al archivo con un enlace firmado', /storage\/v1\/object\/sign\/entregas/.test(nueva.url())); await nueva.close();
  console.log('errores de página:', errs.length ? errs : 'ninguno'); console.log(`\n${ok} correctas, ${bad} fallas`);
  await b.close(); srv.close(); process.exit(bad || errs.length ? 1 : 0);
})().catch(e => { console.log('ERROR', e); process.exit(1); });
