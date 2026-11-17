/* Reglas del curso en un solo lugar (sección 6.9 del plan).
   Funciones puras: no tocan la pantalla ni guardan nada. */
var Reglas = (function () {
  var CFG = {
    zona: 'America/New_York',
    inicio: [2026, 11, 9],            // lunes de la semana 1 (fecha de ejemplo)
    puntosPorDiaAtraso: 3,
    diasMaxAtraso: 10,
    foro: { minAporte: 400, minRespuesta: 150, respuestas: 2, pesoAporte: 70, pesoRespuesta: 15, creditoAtraso: 0.5 },
    resena: { min: 600, max: 800 },
    pesos: { resena: 2, foro: 2.5, resenaLibro: 10, medioTermino: 10, final: 10, tesis: 40 },
    rubricaResena: [
      { k: 'historia', t: 'La historia', max: 10 },
      { k: 'centro', t: 'El centro', max: 15 },
      { k: 'habitaciones', t: 'Las habitaciones', max: 25 },
      { k: 'vara', t: 'La vara y Cristo', max: 20 },
      { k: 'ensena', t: 'Lo que me enseña', max: 15 },
      { k: 'redaccion', t: 'Redacción y formato', max: 15 }
    ],
    partes: [
      { k: 'historia', t: 'La historia', busca: 'historia' },
      { k: 'centro', t: 'El centro', busca: 'centro' },
      { k: 'habitaciones', t: 'Las habitaciones', busca: 'habitaciones' },
      { k: 'vara', t: 'La vara y Cristo', busca: 'vara' },
      { k: 'ensena', t: 'Lo que me enseña', busca: 'ensena' }
    ],
    letras: [[98, 'A+'], [93, 'A'], [90, 'A-'], [88, 'B+'], [83, 'B'], [80, 'B-'], [78, 'C+'], [73, 'C'], [70, 'C-'], [60, 'D'], [0, 'F']]
  };

  function partesZona(ms, zona) {
    var f = new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    var o = {};
    f.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, s: +o.second };
  }
  /* Convierte una hora de reloj en la zona del curso a un instante universal (UTC). */
  function aUtc(y, m, d, h, mi, zona) {
    var meta = Date.UTC(y, m - 1, d, h, mi), g = meta;
    for (var i = 0; i < 3; i++) {
      var p = partesZona(g, zona);
      g += meta - Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
    }
    return g;
  }
  function diaLocal(ms, zona) {
    var p = partesZona(ms, zona);
    return Math.floor(Date.UTC(p.y, p.m - 1, p.d) / 86400000);
  }
  /* Fechas de la semana n: abre lunes 00:00, aporte del foro jueves 23:59, cierra domingo 23:59. */
  function fechasSemana(n) {
    var i = CFG.inicio, base = new Date(Date.UTC(i[0], i[1] - 1, i[2] + 7 * (n - 1)));
    function dia(mas, h, mi) {
      var x = new Date(base.getTime() + mas * 86400000);
      return aUtc(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate(), h, mi, CFG.zona);
    }
    return { abre: dia(0, 0, 0), aporte: dia(3, 23, 59), cierra: dia(6, 23, 59) };
  }
  function semanaActual(ahora) {
    for (var n = 12; n >= 1; n--) if (ahora >= fechasSemana(n).abre) return n;
    return 0;
  }
  function contarPalabras(t) { return ((t || '').trim().match(/\S+/g) || []).length; }
  function normalizar(t) { return (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  /* Atraso de una tarea: 3 puntos por día de calendario, hasta 10 días; después vale 0. */
  function atraso(entregadaMs, limiteMs, prorroga) {
    if (prorroga || entregadaMs <= limiteMs) return { dias: 0, descuento: 0, cero: false };
    var dias = Math.max(1, diaLocal(entregadaMs, CFG.zona) - diaLocal(limiteMs, CFG.zona));
    if (dias > CFG.diasMaxAtraso) return { dias: dias, descuento: 100, cero: true };
    return { dias: dias, descuento: dias * CFG.puntosPorDiaAtraso, cero: false };
  }
  function notaConAtraso(totalRubrica, a) { return a.cero ? 0 : Math.max(0, totalRubrica - a.descuento); }

  function comprobarResena(e, limiteMs) {
    var n = contarPalabras(e.texto), txt = normalizar(e.texto), a = atraso(e.entregadaMs, limiteMs, e.prorroga), na = e.archivos || 0;
    var solo = n === 0 && na > 0;                                        // la entrega está en los archivos: no se puede contar ni buscar
    var faltan = CFG.partes.filter(function (p) { return txt.indexOf(p.busca) < 0; }).map(function (p) { return p.t; });
    var decl = e.ia && (e.ia.uso === 'no' || (e.ia.uso === 'si' && (e.ia.detalle || '').trim().length > 2));
    var ch = [
      { k: 'extension', t: 'Extensión', ok: solo || (n >= CFG.resena.min && n <= CFG.resena.max), d: solo ? 'En archivos no se puede contar: la revisa el profesor' : n + ' palabras (se piden ' + CFG.resena.min + ' a ' + CFG.resena.max + ')' },
      { k: 'puntualidad', t: 'Puntualidad', ok: a.dias === 0, d: a.dias === 0 ? 'A tiempo' : (a.cero ? 'Más de 10 días de atraso: vale 0' : a.dias + ' día(s) de atraso: −' + a.descuento + ' puntos') },
      { k: 'declaracion', t: 'Declaración de inteligencia artificial', ok: !!decl, d: decl ? 'Completa' : 'Falta completarla', bloquea: !decl },
      { k: 'partes', t: 'Partes obligatorias', ok: solo || faltan.length === 0, d: solo ? 'En archivos no se pueden buscar: las revisa el profesor' : faltan.length ? 'No encuentro: ' + faltan.join(', ') : 'Están las 5 partes' }
    ];
    if (na > 0) ch.push({ k: 'archivos', t: 'Archivos', ok: true, d: na + (na === 1 ? ' archivo adjunto' : ' archivos adjuntos') });
    return ch;
  }

  /* Foro: aporte 70 %, cada respuesta 15 %. Aporte después del jueves: mitad. Nada después del domingo. */
  function evaluarForo(mensajes, estudianteId, f) {
    var F = CFG.foro, aporte = null, resp = [], vistos = {};
    mensajes.filter(function (m) { return m.autor === estudianteId; }).sort(function (a, b) { return a.fecha - b.fecha; }).forEach(function (m) {
      if (!m.responde) { if (!aporte) aporte = m; return; }
      var padre = mensajes.filter(function (x) { return x.id === m.responde; })[0];
      if (!padre || padre.autor === estudianteId || vistos[padre.autor]) return;
      if (m.palabras >= F.minRespuesta && m.fecha <= f.cierra) { vistos[padre.autor] = true; resp.push(m); }
    });
    var estado = 'falta', credito = 0;
    if (aporte && aporte.fecha <= f.cierra) {
      if (aporte.palabras < F.minAporte) estado = 'corto';
      else if (aporte.fecha <= f.aporte) { estado = 'a tiempo'; credito = F.pesoAporte; }
      else { estado = 'atrasado'; credito = F.pesoAporte * F.creditoAtraso; }
    }
    var nResp = Math.min(resp.length, F.respuestas);
    var senales = [];
    if (aporte && aporte.lista) {
      var valor = mensajes.filter(function (m) { return m.responde === aporte.id && m.lista && m.autor !== estudianteId; });
      CFG.partes.forEach(function (p) {
        if (aporte.lista[p.k] && valor.length >= 2 && valor.every(function (v) { return !v.lista[p.k]; })) senales.push(p.t);
      });
    }
    return { aporte: aporte, estado: estado, respuestas: nResp, propuesta: credito + nResp * F.pesoRespuesta, senales: senales };
  }

  function letra(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    var r = Math.round(n);
    for (var i = 0; i < CFG.letras.length; i++) if (r >= CFG.letras[i][0]) return CFG.letras[i][1];
    return 'F';
  }
  /* items: [{peso, nota (número o null), vencida (sí/no)}]
     acumulada: solo lo calificado. hoy: lo calificado más 0 en lo vencido y no entregado. */
  function promedios(items) {
    var sa = 0, wa = 0, sh = 0, wh = 0;
    items.forEach(function (i) {
      if (typeof i.nota === 'number') { sa += i.nota * i.peso; wa += i.peso; sh += i.nota * i.peso; wh += i.peso; }
      else if (i.vencida && !i.entregada) { wh += i.peso; }
    });
    return { acumulada: wa ? sa / wa : null, hoy: wh ? sh / wh : null, pesoCalificado: wa };
  }

  return { CFG: CFG, partesZona: partesZona, aUtc: aUtc, fechasSemana: fechasSemana, semanaActual: semanaActual, contarPalabras: contarPalabras,
    normalizar: normalizar, atraso: atraso, notaConAtraso: notaConAtraso, comprobarResena: comprobarResena, evaluarForo: evaluarForo, letra: letra, promedios: promedios };
})();
if (typeof module !== 'undefined') module.exports = Reglas;
