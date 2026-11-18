// Comprueba la pantalla «Personas» con roles simulados dentro del navegador. No cambia la base de datos.
// Uso: K=<contraseña de prueba> node probar-personas.js
const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const raiz=path.join(__dirname,'..','docs'); const srv=http.createServer((q,r)=>{const f=path.join(raiz,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'});r.end(d)}})});
(async()=>{await new Promise(r=>srv.listen(0,r));const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:375,height:780}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
// Simulación solo de pantalla: se hace pasar a Bruno por administrador y se agregan personas ficticias. La base de datos no cambia.
await p.addInitScript(()=>{ window.__papel=sessionStorage.getItem('papel')||'administrador'; const f0=window.fetch.bind(window);
  window.fetch=async(u,o)=>{ const url=String(u&&u.url||u), m=(o&&o.method)||(u&&u.method)||'GET'; if(!/rest\/v1\/perfiles/.test(url)) return f0(u,o);
    if(m!=='GET') return new Response('[{"ok":true}]',{status:200,headers:{'Content-Type':'application/json'}});
    const r=await f0(u,o); let d=await r.json(); const uno=!Array.isArray(d); if(uno) d=[d];
    d=d.map(x=>x.nombre==='Bruno Prueba'?{...x,rol:window.__papel}:x);
    if(!uno && !/id=eq\./.test(url)) d.push({id:'11111111-1111-1111-1111-111111111111',nombre:'Persona Nueva',rol:'estudiante',estado:'pendiente',creado:'2026-11-18'},{id:'22222222-2222-2222-2222-222222222222',nombre:'Profe Invitado',rol:'profesor',estado:'activo',creado:'2026-11-18'},{id:'33333333-3333-3333-3333-333333333333',nombre:'Otra Admin',rol:'administrador',estado:'activo',creado:'2026-11-18'});
    return new Response(JSON.stringify(uno?d[0]:d),{status:200,headers:{'Content-Type':'application/json'}}); }; });
const q=async()=>{await p.waitForFunction(()=>!document.body.classList.contains('ocupado')&&!/Cargando el aula/.test(document.getElementById('vista').innerText),null,{timeout:30000});await p.waitForTimeout(200)};
let ok=0,bad=0;const t=(n,c)=>{c?ok++:bad++;console.log((c?'  ok    ':'  FALLA ')+n)};
await p.goto('http://localhost:'+srv.address().port+'/');await q();await p.fill('#correo','bruno@aula.prueba');await p.fill('#clave',process.env.K);await p.click('button[data-a=entrar]');await q();
t('rótulo del administrador',/Administrador · Profesor sénior/.test(await p.innerText('#sesion')));
let v=await p.innerText('#vista'); t('el panel avisa de la persona que espera',/1 persona espera que la aceptes/.test(v));
await p.click('nav.menu button:has-text("Personas")');await q(); v=await p.innerText('#vista');
const fila=async n=>(await p.locator('section.card',{hasText:n}).first().innerText()).replace(/\n+/g,' | ');
console.log('   ',await fila('Persona Nueva'));console.log('   ',await fila('Ana Ejemplo'));console.log('   ',await fila('Profe Invitado'));console.log('   ',await fila('Otra Admin'));console.log('   ',await fila('Bruno Prueba'));
t('pendiente: solo «Aceptar en el curso»',/Aceptar en el curso/.test(await fila('Persona Nueva'))&&!/Nombrar profesor/.test(await fila('Persona Nueva')));
t('estudiante activo: nombrar profesor o dar de baja',/Nombrar profesor \| Dar de baja/.test(await fila('Ana Ejemplo')));
t('profesor: dar permiso de administrador, volver a estudiante o baja',/Dar permiso de administrador \| Volver a estudiante \| Dar de baja/.test(await fila('Profe Invitado')));
t('otro administrador: quitar permiso',/Quitar permiso de administrador/.test(await fila('Otra Admin')));
t('sobre sí mismo no hay botones',!/Dar de baja|Quitar/.test(await fila('Bruno Prueba'))&&/\(tú\)/.test(await fila('Bruno Prueba')));
await p.locator('section.card',{hasText:'Ana Ejemplo'}).locator('button:has-text("Nombrar profesor")').click();await q();
t('nombrar profesor pide confirmación y explica el alcance',/¿Nombrar profesor a Ana Ejemplo\?.*No podrá aceptar alumnos/.test(await fila('Ana Ejemplo')));
const o=await p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);t('cabe en el teléfono',o<=1);
// Ahora como profesor común
await p.evaluate(()=>sessionStorage.setItem('papel','profesor')); await p.reload();await q();await p.click('nav.menu button:has-text("Personas")');await q(); v=await p.innerText('#vista');
t('profesor común: ve la lista sin ningún botón',/Solo el administrador puede aceptar alumnos/.test(v)&&!(await p.$('#vista button[data-a=aplicarPersona], #vista button[data-a=pedirPersona]')));
t('y su rótulo es «Profesor»',/\/ Profesor \//.test((await p.innerText('#sesion')).replace(/\n/g,' / ')));
console.log('errores:',errs.length,`\n${ok} correctas, ${bad} fallas`);await b.close();srv.close();process.exit(bad||errs.length?1:0)})();
