const R=require('../reglas.js'); const Z=R.CFG.zona; let ok=0,bad=0;
function t(n,c){ if(c){ok++;console.log('  ok  ',n)}else{bad++;console.log('  FALLA',n)} }
const s1=R.fechasSemana(1), s2=R.fechasSemana(2);
const p=ms=>{const x=R.partesZona(ms,Z);return `${x.y}-${x.m}-${x.d} ${x.h}:${x.mi}`};
console.log('semana 1:',p(s1.abre),'|',p(s1.aporte),'|',p(s1.cierra));
t('semana 1 abre lunes 9 nov 00:00', p(s1.abre)==='2026-11-9 0:0');
t('semana 1 cierra domingo 15 nov 23:59', p(s1.cierra)==='2026-11-15 23:59');
t('aporte del foro semana 2: jueves 19 nov 23:59', p(s2.aporte)==='2026-11-19 23:59');
// atraso
const mar=R.aUtc(2026,11,17,10,0,Z), marNoche=R.aUtc(2026,11,17,23,59,Z);
t('reseña entregada el martes siguiente pierde 6', R.atraso(mar,s1.cierra).descuento===6);
t('martes 23:59 sigue siendo 6', R.atraso(marNoche,s1.cierra).descuento===6);
t('lunes 00:05 pierde 3', R.atraso(R.aUtc(2026,11,16,0,5,Z),s1.cierra).descuento===3);
t('a tiempo no pierde', R.atraso(R.aUtc(2026,11,15,23,58,Z),s1.cierra).descuento===0);
t('día 10 pierde 30', R.atraso(R.aUtc(2026,11,25,9,0,Z),s1.cierra).descuento===30);
t('día 11 vale 0', R.notaConAtraso(95,R.atraso(R.aUtc(2026,11,26,9,0,Z),s1.cierra))===0);
t('prórroga anula descuento', R.atraso(mar,s1.cierra,true).descuento===0);
t('nota 90 con 2 días = 84', R.notaConAtraso(90,R.atraso(mar,s1.cierra))===84);
// cambio de hora: semana que cruza a marzo
R.CFG.inicio=[2027,3,8]; const sm=R.fechasSemana(1); t('cambio de hora (marzo): cierra domingo 23:59', p(sm.cierra)==='2027-3-14 23:59'); R.CFG.inicio=[2026,11,9];
// foro
const f={aporte:s2.aporte,cierra:s2.cierra}; const L={historia:true,centro:true,habitaciones:true,vara:true,ensena:true}; const N={historia:true,centro:true,habitaciones:true,vara:false,ensena:true};
const mi=R.aUtc(2026,11,18,12,0,Z), vi=R.aUtc(2026,11,20,12,0,Z), sa=R.aUtc(2026,11,21,12,0,Z), lu=R.aUtc(2026,11,23,0,5,Z);
let M=[{id:1,autor:'a',palabras:420,fecha:mi,lista:L},{id:2,autor:'b',palabras:410,fecha:vi,lista:L},{id:3,autor:'c',palabras:405,fecha:mi,lista:L},
 {id:4,autor:'a',responde:2,palabras:160,fecha:sa,lista:L},{id:5,autor:'a',responde:3,palabras:160,fecha:sa,lista:L},
 {id:6,autor:'b',responde:1,palabras:155,fecha:sa,lista:N},{id:7,autor:'c',responde:1,palabras:150,fecha:sa,lista:N},{id:8,autor:'c',responde:2,palabras:149,fecha:sa,lista:L},
 {id:9,autor:'b',responde:3,palabras:200,fecha:lu,lista:L},{id:10,autor:'a',responde:2,palabras:300,fecha:sa,lista:L}];
const A=R.evaluarForo(M,'a',f),B=R.evaluarForo(M,'b',f),C=R.evaluarForo(M,'c',f);
t('A: aporte a tiempo + 2 respuestas = 100', A.propuesta===100);
t('A: dos respuestas al mismo compañero cuentan una', A.respuestas===2);
t('B: aporte del viernes recibe la mitad (35) + 1 respuesta = 50', B.propuesta===50 && B.estado==='atrasado');
t('B: respuesta después del domingo no cuenta', B.respuestas===1);
t('C: respuesta de 149 palabras no cuenta = 85', C.propuesta===85);
t('señal: A se marcó "vara" y sus 2 compañeros dijeron que no', A.senales.length===1 && A.senales[0]==='La vara y Cristo');
t('aporte corto (399) no recibe crédito', R.evaluarForo([{id:1,autor:'a',palabras:399,fecha:mi,lista:L}],'a',f).propuesta===0);
// notas
t('letras', R.letra(98)==='A+'&&R.letra(97.4)==='A'&&R.letra(92.5)==='A'&&R.letra(89.4)==='B+'&&R.letra(59.6)==='D'&&R.letra(59.4)==='F');
const pr=R.promedios([{peso:2,nota:88},{peso:2,nota:null,vencida:true,entregada:false},{peso:2.5,nota:100},{peso:2,nota:null,vencida:false}]);
t('acumulada a mano: (88*2+100*2.5)/4.5 = 94.67', Math.abs(pr.acumulada-(88*2+250)/4.5)<1e-9);
t('si terminara hoy a mano: (176+250)/6.5 = 65.54', Math.abs(pr.hoy-426/6.5)<1e-9);
// comprobaciones
const txt='La historia '+'x '.repeat(640)+' el centro las habitaciones la vara y Cristo lo que me enseña';
const ch=R.comprobarResena({texto:txt,entregadaMs:mar,ia:{uso:null}},s1.cierra);
t('sin declaración de IA no se puede confirmar', ch.find(c=>c.k==='declaracion').bloquea===true);
t('con "Usé" sin detalle sigue bloqueada', R.comprobarResena({texto:txt,entregadaMs:mar,ia:{uso:'si',detalle:''}},s1.cierra)[2].bloquea===true);
t('con "No usé" pasa', !R.comprobarResena({texto:txt,entregadaMs:mar,ia:{uso:'no'}},s1.cierra)[2].bloquea);
t('detecta las 5 partes y la extensión', ch.find(c=>c.k==='partes').ok && ch.find(c=>c.k==='extension').ok);
console.log(`\n${ok} correctas, ${bad} fallas`); process.exit(bad?1:0);
