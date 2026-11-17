const { chromium } = require('playwright'); const path=process.argv[2];
(async()=>{const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:375,height:780}}); const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.setContent('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">'+require('fs').readFileSync(path,'utf8')+'</body></html>'); await p.waitForTimeout(800);
const ov=async(n)=>{const o=await p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth); console.log((o>1?'  DESBORDA ':'  ok ')+n+(o>1?' +'+o+'px':''));};
const shot=n=>p.screenshot({path:'s_'+n+'.png',fullPage:true});
const txt=async()=> (await p.innerText('#vista')).replace(/\n+/g,' | ').slice(0,260);
let ok=0,bad=0; const t=(n,c)=>{c?ok++:bad++; console.log((c?'  ok   ':'  FALLA ')+n)};
const entra=async(c)=>{ if(await p.$('button[data-a=salir]')) await p.click('button[data-a=salir]'); await p.fill('#correo',c); await p.fill('#clave','prueba2026'); await p.click('button[data-a=entrar]'); };
let v0=await p.innerText('#vista'); t('sin entrar no se ve el aula ni el menú', /Entrar/.test(v0) && !(await p.isVisible('nav.menu')));
await p.fill('#correo','bruno@aula.prueba'); await p.fill('#clave','otra'); await p.click('button[data-a=entrar]'); t('contraseña equivocada: no entra', /no coinciden/.test(await p.innerText('#vista')) && !(await p.isVisible('nav.menu')));
await ov('entrada'); await shot('entrada');
await entra('bruno@aula.prueba');
// Bruno, inicio
await ov('inicio'); await shot('inicio'); console.log(await txt());
// tareas: Bruno R1 atrasada -6
await p.click('nav.menu button:has-text("Mis tareas")'); let v=await p.innerText('#vista'); t('Bruno: reseña 1 con atraso de 2 días, −6', /2 día\(s\) de atraso: se restarán 6/.test(v)); await ov('tareas');
// entregar reseña 2
await p.click('nav.menu button:has-text("El curso")'); await ov('curso'); v=await p.innerText('#vista');
t('curso: semana 2 abierta con la ruta mira, lee, escribe, conversa', await p.isVisible('#det-2 .pasos') && /Mira el caso[\s\S]*Lee[\s\S]*Escribe[\s\S]*Conversa/.test(await p.innerText('#det-2')));
t('curso: semana 3 todavía cerrada para el estudiante', !(await p.$('#det-3')) && /Abre lun/.test(v));
await p.check('#visto-2-0'); await p.check('#visto-2-1'); await p.check('#lei-2'); t('marcar videos y lectura sube el avance a 2 de 4 y deja la semana abierta', /2 de 4/.test(await p.innerText('#det-2 summary')) && await p.isVisible('#det-2 .pasos')); await shot('curso');
await p.click('button:has-text("Entregar reseña 2")'); await ov('entregar');
t('sin texto: botón bloqueado', await p.isDisabled('#confirmar'));
await p.click('button:has-text("Rellenar con texto")'); t('con texto pero sin declaración: bloqueado', await p.isDisabled('#confirmar'));
await p.check('#ia-si'); t('"Usé" sin detalle: bloqueado', await p.isDisabled('#confirmar'));
await p.fill('#ia-detalle','Corrector de ortografía'); t('con detalle: se puede entregar', !(await p.isDisabled('#confirmar'))); await shot('entregar');
await p.click('#confirmar'); v=await p.innerText('#vista'); t('entrega recibida a tiempo', /Entrega recibida\. Llegó a tiempo/.test(v));
// foro 1 como Bruno: no ve aportes antes de publicar
await p.click('nav.menu button:has-text("Foros")'); await ov('foros'); await p.click('.item:has-text("Foro 1")'); v=await p.innerText('#vista');
t('no ve aportes ajenos antes de publicar', /Los verás cuando publiques el tuyo/.test(v) && !/Ana Ejemplo/.test(v));
await p.click('button:has-text("Rellenar con texto")'); await p.check('#auto-historia'); await p.check('#auto-vara'); await p.click('button:has-text("Publicar aporte")');
v=await p.innerText('#vista'); t('aporte publicado y ahora ve a sus compañeros', /Aporte publicado/.test(v) && /Ana Ejemplo/.test(v)); await ov('foro'); await shot('foro');
// responder a Ana marcando vara=no
await p.click('summary:has-text("Responder a Ana")'); await p.check('#val-m4-historia'); await p.click('details[open] button:has-text("Rellenar")'); await p.click('details[open] button:has-text("Publicar respuesta")');
v=await p.innerText('#vista'); t('respuesta publicada', /Respuesta publicada/.test(v));
// foro cerrado tras el domingo
await p.fill('#reloj','2026-11-23T00:05'); await p.dispatchEvent('#reloj','change'); v=await p.innerText('#vista'); t('lunes 00:05: foro cerrado, sin formularios', /ya no acepta mensajes/.test(v) && !(await p.$('summary')));
await p.fill('#reloj','2026-11-17T10:00'); await p.dispatchEvent('#reloj','change');
// aislamiento: Ana no ve nada de Bruno en tareas/notas
await entra('ana@aula.prueba'); await p.click('nav.menu button:has-text("Mis tareas")'); v=await p.innerText('#vista'); t('Ana ve su 88 y no datos de otros', /88/.test(v) && !/Bruno|Carla/.test(v));
await p.click('nav.menu button:has-text("Mis notas")'); v=await p.innerText('#vista'); t('Ana: acumulada 88, letra B+', /88\s*B\+/.test(v)); await ov('notas'); await shot('notas');
t('menú del estudiante no ofrece vistas del profesor', !(await p.$('nav.menu button:has-text("Entregas")')));
// profesor
await entra('profesor@aula.prueba'); v=await p.innerText('#vista'); t('panel: 3 entregas por calificar', /Entregas por calificar\s*3/i.test(v)); await ov('panel'); await shot('panel');
await p.click('nav.menu button:has-text("Entregas")'); await ov('entregas');
await p.click('section:has-text("Bruno Prueba"):has-text("Reseña 1") button'); await ov('calificar');
for (const [k,val] of [['historia',9],['centro',14],['habitaciones',23],['vara',18],['ensena',13],['redaccion',13]]) await p.fill('#pt-'+k,String(val));
v=await p.innerText('#total-rub'); t('calificar: rúbrica 90, atraso −6, final 84', /90 \/ 100/.test(v)&&/−6/.test(v)&&/84/.test(v)); await shot('calificar');
await p.fill('#comentario','[Comentario de prueba]'); await p.click('button:has-text("Publicar nota")'); v=await p.innerText('#vista'); t('nota publicada', /Nota publicada/.test(v));
await p.click('nav.menu button:has-text("Notas")'); v=await p.innerText('#vista'); t('libro: Bruno 84 sin escribirla a mano', /Bruno Prueba[\s\S]*84/.test(v)); await ov('libro'); await shot('libro');
await p.click('nav.menu button:has-text("Foros")'); v=await p.innerText('#vista'); t('registro: señal de atención en Ana (vara)', /Señal de atención: se marcó «La vara y Cristo»/.test(v)); t('registro: propuesta de Bruno 85 (aporte 70 + 1 respuesta)', /propuesta: 85/.test(v)); await ov('registro'); await shot('registro');
await p.click('button:has-text("Publicar todas")'); v=await p.innerText('#vista'); t('notas de foro publicadas', /publicadas para todos/.test(v));
await p.click('nav.menu button:has-text("Contenido")'); await p.click('.item:has-text("Lottie")'); await p.fill('#c-instr','Instrucciones de prueba'); await p.click('button:has-text("Guardar cambios")'); await ov('contenido');
await entra('bruno@aula.prueba'); await p.click('nav.menu button:has-text("Mis notas")'); v=await p.innerText('#vista'); console.log('Bruno notas:',(await txt())); t('Bruno: (84*2+85*2.5)/4.5 = 84,6', /84,6/.test(v));
console.log('errores de página:',errs.length?errs:'ninguno'); console.log(`\n${ok} correctas, ${bad} fallas`); await b.close(); process.exit(bad||errs.length?1:0)})();
