(function () {
  var R = Reglas, C = R.CFG, Z = C.zona, CLAVE = 'aula-prototipo-v2', CLAVE_DEMO = 'prueba2026';
  function ny(y, m, d, h, mi) { return R.aUtc(y, m, d, h, mi, Z); }
  var DEMO_AHORA = ny(2026, 11, 17, 10, 0);

  /* ---------- Datos de arranque (sección 5 y 13 del plan) ---------- */
  var SEMANAS = [
    [1, 'Introducción: la vara y la casa. Prólogo: David Livingstone', 'Introducción y prólogo'],
    [2, 'William y Anne Bagby, Brasil (1881)', 'Cap. 1'],
    [3, 'Lottie Moon. William Sheppard y Alice Seeley Harris', 'Caps. 9-10'],
    [4, 'M. Theron Rankin y los misioneros presos (1941-1942). John y Betty Stam', 'Caps. 2 y 17'],
    [5, 'El Movimiento Radical de Recife. Eric Liddell', 'Caps. 7-8'],
    [6, 'Bill Wallace. Los bautistas colombianos durante La Violencia', 'Caps. 11-12'],
    [7, 'Un caso de abuso (1967-1973), sin nombres', 'Cap. 3'],
    [8, 'Bold Mission Thrust y Baker James Cauthen. Keith Parks. La escuela de Fanda', 'Caps. 4, 13 y 18'],
    [9, 'La firma de 2002-2003. La expulsión de Venezuela (2005)', 'Caps. 5 y 19'],
    [10, 'El caso Aderholt y la voz de Anne Marie Miller', 'Cap. 6'],
    [11, 'El retiro voluntario de 2015. La Convención Nacional Bautista de Venezuela', 'Caps. 14-15'],
    [12, 'Cristo, el Siervo en la misión (Hebreos 3:1-6). Cierre', 'Caps. 20-21']
  ];
  var SEM_RESENA = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11];
  var OTRAS = { 6: 'Evaluación de medio término', 7: 'Avance de la tesis', 11: 'Reseña crítica del libro', 12: 'Evaluación final y tesis' };

  function relleno(n, conPartes) {
    var w = [], partes = conPartes ? ['La historia.', 'El centro.', 'Las habitaciones.', 'La vara y Cristo.', 'Lo que me enseña.'] : [];
    var cab = '[Entrega de ejemplo]'.split(' ');
    var fijo = cab.length + partes.join(' ').split(' ').filter(Boolean).length;
    var porParte = Math.floor((n - fijo) / Math.max(1, partes.length || 1)), base = ['texto', 'de', 'ejemplo'];
    w = w.concat(cab);
    function llena(k) { for (var i = 0; i < k; i++) w.push(base[i % 3]); }
    if (!partes.length) llena(n - cab.length);
    partes.forEach(function (p, i) { w = w.concat(p.split(' ')); llena(i === partes.length - 1 ? n - w.length : porParte); });
    return w.join(' ');
  }
  var TODO = { historia: true, centro: true, habitaciones: true, vara: true, ensena: true };

  function semilla() {
    var s = {
      v: 2, ahora: DEMO_AHORA, usuario: null, vista: { n: 'inicio' },
      usuarios: [
        { id: 'p1', nombre: 'Profesor de Prueba', rol: 'profesor', nota: '', correo: 'profesor@aula.prueba' },
        { id: 'e1', nombre: 'Ana Ejemplo', rol: 'estudiante', nota: 'soltera', correo: 'ana@aula.prueba' },
        { id: 'e2', nombre: 'Bruno Prueba', rol: 'estudiante', nota: 'casado, sin hijos', correo: 'bruno@aula.prueba' },
        { id: 'e3', nombre: 'Carla Muestra', rol: 'estudiante', nota: 'casada, con hijos', correo: 'carla@aula.prueba' }
      ],
      semanas: SEMANAS.map(function (x) {
        return { n: x[0], titulo: x[1], lectura: x[2], instrucciones: '[Contenido pendiente: Danilo]',
          videos: [{ t: 'Exposición del caso', url: '[enlace de ejemplo]' }, { t: 'Metodología de lectura e instrucciones de la tarea', url: '[enlace de ejemplo]' }] };
      }),
      foros: [
        { id: 'pres', semana: 1, titulo: 'Presentación', conNota: false, siempre: true, verDespues: false },
        { id: 'f1', semana: 2, titulo: 'Foro 1', conNota: true, verDespues: true },
        { id: 'f2', semana: 4, titulo: 'Foro 2', conNota: true, verDespues: true },
        { id: 'f3', semana: 8, titulo: 'Foro 3', conNota: true, verDespues: true },
        { id: 'f4', semana: 10, titulo: 'Foro 4', conNota: true, verDespues: true },
        { id: 'preg', semana: 1, titulo: 'Preguntas para el profesor', conNota: false, siempre: true, verDespues: false }
      ],
      entregas: [
        { id: 'en1', tarea: 'r1', est: 'e1', texto: relleno(660, true), entregadaMs: ny(2026, 11, 14, 20, 0), ia: { uso: 'no', detalle: '' } },
        { id: 'en2', tarea: 'r1', est: 'e3', texto: relleno(710, true), entregadaMs: ny(2026, 11, 15, 21, 30), ia: { uso: 'si', detalle: 'Corrector de ortografía, para revisar la redacción' } },
        { id: 'en3', tarea: 'r1', est: 'e2', texto: relleno(640, true), entregadaMs: ny(2026, 11, 17, 8, 30), ia: { uso: 'no', detalle: '' } }
      ],
      notas: [
        { entrega: 'en1', puntos: { historia: 9, centro: 13, habitaciones: 22, vara: 18, ensena: 13, redaccion: 13 }, comentario: '[Comentario de ejemplo del profesor]', publicada: true }
      ],
      mensajes: [
        { id: 'm1', foro: 'pres', autor: 'e1', texto: relleno(40), fecha: ny(2026, 11, 9, 18, 0) },
        { id: 'm2', foro: 'pres', autor: 'e2', texto: relleno(35), fecha: ny(2026, 11, 10, 9, 0) },
        { id: 'm3', foro: 'pres', autor: 'e3', texto: relleno(45), fecha: ny(2026, 11, 10, 21, 0) },
        { id: 'm4', foro: 'f1', autor: 'e1', texto: relleno(420), fecha: ny(2026, 11, 16, 19, 0), lista: TODO },
        { id: 'm5', foro: 'f1', autor: 'e3', texto: relleno(410), fecha: ny(2026, 11, 17, 7, 0), lista: { historia: true, centro: true, habitaciones: true, vara: true, ensena: false } },
        { id: 'm6', foro: 'f1', autor: 'e3', responde: 'm4', texto: relleno(160), fecha: ny(2026, 11, 17, 7, 30), lista: { historia: true, centro: true, habitaciones: true, vara: false, ensena: true } },
        { id: 'm7', foro: 'f1', autor: 'e1', responde: 'm5', texto: relleno(155), fecha: ny(2026, 11, 17, 9, 0), lista: { historia: true, centro: true, habitaciones: true, vara: true, ensena: false } }
      ],
      notasForo: [], vistos: {}, borradores: {}, sig: 100
    };
    return s;
  }

  var S;
  function cargar() { try { var t = localStorage.getItem(CLAVE); if (t) { var o = JSON.parse(t); if (o && o.v === 2) return o; } } catch (e) {} return semilla(); }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) {} }
  S = cargar();

  /* ---------- Utilidades ---------- */
  function esc(t) { return String(t === undefined || t === null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ahora() { return S.ahora; }
  function yo() { return S.usuarios.filter(function (u) { return u.id === S.usuario; })[0]; }
  function usuario(id) { return S.usuarios.filter(function (u) { return u.id === id; })[0]; }
  function estudiantes() { return S.usuarios.filter(function (u) { return u.rol === 'estudiante'; }); }
  function fecha(ms) {
    var f = new Intl.DateTimeFormat('es-US', { timeZone: Z, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
    var loc = '';
    try {
      var mia = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (mia && mia !== Z) loc = '<span class="loc">Tu hora: ' + esc(new Intl.DateTimeFormat('es-US', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(ms))) + '</span>';
    } catch (e) {}
    return '<span class="fecha">' + esc(f) + ' <small>(hora del curso)</small>' + loc + '</span>';
  }
  function fechaCorta(ms) { return new Intl.DateTimeFormat('es-US', { timeZone: Z, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(ms)); }
  function tareas() {
    return SEM_RESENA.map(function (sem, i) { return { id: 'r' + (i + 1), titulo: 'Reseña ' + (i + 1), semana: sem, limite: R.fechasSemana(sem).cierra, peso: C.pesos.resena }; });
  }
  function tarea(id) { return tareas().filter(function (t) { return t.id === id; })[0]; }
  function entregaDe(tId, est) { return S.entregas.filter(function (e) { return e.tarea === tId && e.est === est; })[0]; }
  function notaDe(enId) { return S.notas.filter(function (n) { return n.entrega === enId; })[0]; }
  function totalRubrica(p) { return C.rubricaResena.reduce(function (a, c) { return a + (+p[c.k] || 0); }, 0); }
  function estadoTarea(t, est) {
    var e = entregaDe(t.id, est);
    if (!e) return { k: ahora() > t.limite ? 'vencida' : 'pendiente', e: null };
    var a = R.atraso(e.entregadaMs, t.limite, e.prorroga), n = notaDe(e.id);
    if (n && n.publicada) return { k: 'calificada', e: e, a: a, nota: R.notaConAtraso(totalRubrica(n.puntos), a), n: n };
    return { k: a.dias > 0 ? 'atrasada' : 'entregada', e: e, a: a };
  }
  var ETIQ = { pendiente: 'Pendiente', vencida: 'Vencida sin entregar', entregada: 'Entregada', atrasada: 'Entregada con atraso', calificada: 'Calificada' };
  function pastilla(k) { return '<span class="pill p-' + k + '">' + ETIQ[k] + '</span>'; }
  function fechasForo(f) { var w = R.fechasSemana(f.semana); return { abre: w.abre, aporte: w.aporte, cierra: w.cierra }; }
  function foroAbierto(f) { if (f.siempre) return true; var d = fechasForo(f); return ahora() >= d.abre && ahora() <= d.cierra; }
  function msgForo(fid) { return S.mensajes.filter(function (m) { return m.foro === fid; }).map(function (m) { return { id: m.id, autor: m.autor, responde: m.responde, palabras: R.contarPalabras(m.texto), fecha: m.fecha, lista: m.lista, texto: m.texto }; }); }
  function notaForo(fid, est) { return S.notasForo.filter(function (n) { return n.foro === fid && n.est === est; })[0]; }

  function itemsNotas(est) {
    var it = tareas().map(function (t) {
      var x = estadoTarea(t, est);
      return { id: t.id, titulo: t.titulo, grupo: 'Reseñas semanales', peso: t.peso, nota: x.k === 'calificada' ? x.nota : null, vencida: ahora() > t.limite, entregada: !!x.e, estado: x.k };
    });
    S.foros.filter(function (f) { return f.conNota; }).forEach(function (f) {
      var d = fechasForo(f), nf = notaForo(f.id, est), tiene = S.mensajes.some(function (m) { return m.foro === f.id && m.autor === est && !m.responde; });
      it.push({ id: f.id, titulo: f.titulo, grupo: 'Foros', peso: C.pesos.foro, nota: nf && nf.publicada ? nf.nota : null, vencida: ahora() > d.cierra, entregada: tiene, estado: nf && nf.publicada ? 'calificada' : (tiene ? 'entregada' : (ahora() > d.cierra ? 'vencida' : 'pendiente')) });
    });
    return it;
  }
  function num(n) { return n === null || n === undefined ? '—' : (Math.round(n * 10) / 10).toString().replace('.', ','); }

  /* ---------- Vistas del estudiante ---------- */
  var V = {};
  V.inicio = function () {
    var u = yo(), n = R.semanaActual(ahora()), w = S.semanas[n - 1], d = R.fechasSemana(n);
    var pend = tareas().filter(function (t) { var k = estadoTarea(t, u.id).k; return (k === 'pendiente' || k === 'vencida') && ahora() >= R.fechasSemana(t.semana).abre; });
    var foros = S.foros.filter(function (f) { return f.conNota && foroAbierto(f); });
    var hechas = tareas().filter(function (t) { return entregaDe(t.id, u.id); }).length;
    var h = '<h1>Hola, ' + esc(u.nombre.split(' ')[0]) + '.</h1>';
    h += '<section class="card destacada"><div class="eyebrow">Semana ' + n + ' de 12</div><h2>' + esc(w.titulo) + '</h2><p>Cierra: ' + fecha(d.cierra) + '</p><button class="btn" data-a="ir" data-n="semana" data-s="' + n + '">Entrar a la semana</button></section>';
    h += '<section class="card"><h2>Lo que tienes pendiente</h2>';
    if (!pend.length && !foros.length) h += '<p class="vacio">Nada pendiente por ahora.</p>';
    pend.forEach(function (t) {
      var k = estadoTarea(t, u.id).k;
      h += '<div class="fila"><div><strong>' + t.titulo + '</strong> · semana ' + t.semana + '<br>' + (k === 'vencida' ? '<span class="aviso">Venció: </span>' : 'Vence: ') + fecha(t.limite) + '</div><button class="btn sec" data-a="ir" data-n="entregar" data-t="' + t.id + '">Entregar</button></div>';
    });
    foros.forEach(function (f) {
      var ev = R.evaluarForo(msgForo(f.id), u.id, fechasForo(f)), fd = fechasForo(f);
      h += '<div class="fila"><div><strong>' + f.titulo + '</strong><br>' + (ev.aporte ? 'Aporte publicado. Respuestas: ' + ev.respuestas + ' de 2. Cierra: ' + fecha(fd.cierra) : 'Aporte antes de: ' + fecha(fd.aporte)) + '</div><button class="btn sec" data-a="ir" data-n="foro" data-f="' + f.id + '">Ir al foro</button></div>';
    });
    h += '</section>';
    h += '<section class="card"><h2>Tu avance</h2><div class="barra" role="img" aria-label="' + hechas + ' de 10 reseñas entregadas"><span style="width:' + (hechas * 10) + '%"></span></div><p>' + hechas + ' de 10 reseñas entregadas.</p></section>';
    h += '<section class="card"><h2>Anuncios</h2><p class="vacio">Los anuncios del profesor llegan en la Fase 2.</p></section>';
    return h;
  };
  /* La ruta de la semana: mira, lee, escribe, conversa. Un solo recorrido, siempre en el mismo orden. */
  function rutaSemana(w, est) {
    var d = R.fechasSemana(w.n), i = SEM_RESENA.indexOf(w.n), t = i >= 0 ? tarea('r' + (i + 1)) : null, pasos = [];
    var foro = S.foros.filter(function (f) { return f.conNota && f.semana === w.n; })[0] || (w.n === 1 ? S.foros[0] : null);
    var vistos = w.videos.filter(function (v, j) { return S.vistos[est + ':' + w.n + ':' + j]; }).length;
    pasos.push({ k: 'mira', t: 'Mira el caso', hecho: vistos === w.videos.length, d: vistos + ' de ' + w.videos.length + ' videos' });
    pasos.push({ k: 'lee', t: 'Lee', hecho: !!S.vistos[est + ':' + w.n + ':lee'], d: w.lectura });
    if (t) { var x = estadoTarea(t, est); pasos.push({ k: 'escribe', t: 'Escribe', hecho: !!x.e, d: t.titulo, x: x, tarea: t }); }
    else if (OTRAS[w.n]) pasos.push({ k: 'escribe', t: 'Presenta', hecho: false, fase2: true, d: OTRAS[w.n] });
    if (foro) {
      var ev = R.evaluarForo(msgForo(foro.id), est, fechasForo(foro)), ok = foro.conNota ? (!!ev.aporte && ev.respuestas >= 2) : S.mensajes.some(function (m) { return m.foro === foro.id && m.autor === est; });
      pasos.push({ k: 'conversa', t: 'Conversa', hecho: ok, d: foro.titulo, foro: foro, ev: ev });
    }
    var cuentan = pasos.filter(function (p) { return !p.fase2; });
    return { d: d, pasos: pasos, hechos: cuentan.filter(function (p) { return p.hecho; }).length, total: cuentan.length };
  }
  function rango(d) {
    var f = function (ms, o) { return new Intl.DateTimeFormat('es-US', Object.assign({ timeZone: Z }, o)).format(new Date(ms)); };
    return f(d.abre, { day: 'numeric', month: 'short' }) + ' – ' + f(d.cierra, { day: 'numeric', month: 'short' });
  }
  V.semanas = function (p) {
    var u = yo(), prof = u.rol === 'profesor', act = R.semanaActual(ahora()), abierta = p.s || act;
    var h = '<h1>El curso</h1><p>Cada semana sigue la misma ruta: <strong>mira, lee, escribe, conversa</strong>.</p>';
    h += '<details class="card mat" id="det-mat"><summary><span class="sem-t"><strong>Materiales del curso</strong><small>Sílabo, libro de texto, lámina de la vara, guía de la herencia</small></span></summary><ul class="pasos">' + ['Sílabo del curso', 'Libro de texto: Teología del liderazgo en la misión. El alma del mando', 'Lámina de la vara', 'Guía de la herencia de tres generaciones'].map(function (m) { return '<li class="paso"><span class="marca-paso doc" aria-hidden="true">▤</span><div class="paso-c"><strong>' + m + '</strong><small>[Archivo pendiente: Danilo]</small></div></li>'; }).join('') + '</ul></details>';
    S.semanas.forEach(function (w) {
      var r = rutaSemana(w, u.id), ab = ahora() >= r.d.abre, esAct = act === w.n, pasada = ahora() > r.d.cierra;
      var chip = prof ? '' : !ab ? '<span class="pill p-pendiente">Abre ' + fechaCorta(r.d.abre) + '</span>' : r.hechos === r.total ? '<span class="pill p-calificada">Completa</span>' : '<span class="pill ' + (pasada ? 'p-atrasada' : 'p-entregada') + '">' + r.hechos + ' de ' + r.total + '</span>';
      if (!ab && !prof) { h += '<div class="card sem cerrada"><div class="sem-cab"><span class="numero">' + w.n + '</span><span class="sem-t"><strong>' + esc(w.titulo) + '</strong><small>' + rango(r.d) + '</small></span>' + chip + '</div></div>'; return; }
      h += '<details class="card sem' + (esAct ? ' actual' : '') + '" id="det-' + w.n + '"' + (abierta === w.n ? ' open' : '') + '><summary><span class="numero">' + w.n + '</span><span class="sem-t"><strong>' + esc(w.titulo) + '</strong><small>' + (esAct ? 'Semana actual · ' : '') + rango(r.d) + '</small></span>' + chip + '</summary>';
      h += '<p class="cierre">Cierra: ' + fecha(r.d.cierra) + '</p>';
      if (w.instrucciones && w.instrucciones.indexOf('[Contenido pendiente') < 0) h += '<p class="nota-prof"><strong>Nota del profesor:</strong> ' + esc(w.instrucciones) + '</p>';
      h += '<ol class="pasos">';
      r.pasos.forEach(function (ps, n) {
        h += '<li class="paso' + (ps.hecho ? ' hecho' : '') + '"><span class="marca-paso" aria-hidden="true">' + (ps.hecho ? '✓' : n + 1) + '</span><div class="paso-c"><strong>' + ps.t + '</strong>';
        if (ps.k === 'mira') w.videos.forEach(function (v, j) {
          var key = u.id + ':' + w.n + ':' + j;
          h += '<div class="sub"><span>' + esc(v.t) + '<small>' + esc(v.url) + '</small></span>' + (prof ? '' : '<label class="check corto"><input type="checkbox" id="visto-' + w.n + '-' + j + '" data-a="visto" data-k="' + key + '"' + (S.vistos[key] ? ' checked' : '') + '> Lo vi</label>') + '</div>';
        });
        if (ps.k === 'lee') h += '<div class="sub"><span>' + esc(w.lectura) + '<small>[PDF pendiente: se sube cuando el capítulo esté terminado]</small></span>' + (prof ? '' : '<label class="check corto"><input type="checkbox" id="lei-' + w.n + '" data-a="visto" data-k="' + u.id + ':' + w.n + ':lee"' + (ps.hecho ? ' checked' : '') + '> Lo leí</label>') + '</div>';
        if (ps.k === 'escribe' && ps.fase2) h += '<div class="sub"><span>' + ps.d + '<small>Llega en la Fase 2</small></span></div>';
        if (ps.k === 'escribe' && ps.tarea) {
          h += '<div class="sub"><span>' + ps.tarea.titulo + ' · 600 a 800 palabras<small>Vence: ' + fechaCorta(ps.tarea.limite) + ', 11:59 p. m.</small></span>' + (prof ? '' : pastilla(ps.x.k)) + '</div>';
          if (!prof && ps.x.k !== 'calificada') h += '<button class="btn' + (ps.x.e ? ' sec' : '') + '" data-a="ir" data-n="entregar" data-t="' + ps.tarea.id + '">' + (ps.x.e ? 'Corregir y volver a entregar' : 'Entregar ' + ps.tarea.titulo.toLowerCase()) + '</button>';
          if (!prof && ps.x.k === 'calificada') h += '<p>Nota: <strong>' + num(ps.x.nota) + ' / 100</strong></p>';
        }
        if (ps.k === 'conversa') {
          var fd = fechasForo(ps.foro);
          h += '<div class="sub"><span>' + ps.foro.titulo + (ps.foro.conNota ? '<small>Aporte: ' + fechaCorta(fd.aporte) + ' · Respuestas: ' + fechaCorta(fd.cierra) + '</small>' : '<small>Sin nota</small>') + '</span>' + (prof || !ps.foro.conNota ? '' : '<span class="pill ' + (ps.hecho ? 'p-calificada' : 'p-pendiente') + '">' + (ps.ev.aporte ? 'Aporte ✓ · ' + ps.ev.respuestas + ' de 2' : 'Sin aporte') + '</span>') + '</div><button class="btn sec" data-a="ir" data-n="foro" data-f="' + ps.foro.id + '">Ir al foro</button>';
        }
        h += '</div></li>';
      });
      h += '</ol>' + (prof ? '<button class="enlace" data-a="ir" data-n="contenido" data-s="' + w.n + '">Editar esta semana</button>' : '') + '</details>';
    });
    return h;
  };
  V.semana = function (p) { return V.semanas(p); };
  function htmlComprobaciones(ch) {
    return '<ul class="comp">' + ch.map(function (c) { return '<li class="' + (c.ok ? 'ok' : 'no') + '"><span aria-hidden="true">' + (c.ok ? '✓' : '!') + '</span><div><strong>' + c.t + '</strong><br>' + esc(c.d) + '</div></li>'; }).join('') + '</ul>';
  }
  V.entregar = function (p) {
    var t = tarea(p.t), u = yo(), x = estadoTarea(t, u.id), b = S.borradores[u.id + ':' + t.id] || (x.e ? { texto: x.e.texto, uso: x.e.ia.uso, detalle: x.e.ia.detalle } : { texto: '', uso: null, detalle: '' });
    S.borradores[u.id + ':' + t.id] = b;
    var h = '<button class="volver" data-a="ir" data-n="semanas" data-s="' + t.semana + '">← Semana ' + t.semana + '</button><h1>' + t.titulo + '</h1><p>Fecha límite: ' + fecha(t.limite) + '</p>';
    if (x.k === 'calificada') return h + '<section class="card"><p>' + pastilla('calificada') + '</p><p>Esta reseña ya está calificada: <strong>' + num(x.nota) + ' / 100</strong>. Mira el detalle en «Mis tareas».</p></section>';
    if (x.e) h += '<p class="nota-info">' + pastilla(x.k) + ' Ya entregaste el ' + fecha(x.e.entregadaMs) + '. Puedes corregir y volver a entregar mientras no esté calificada; contará la nueva fecha.</p>';
    h += '<section class="card"><h2>La reseña responde, en este orden</h2><ol class="orden"><li><strong>La historia:</strong> quién era la persona, de qué casa venía y qué hizo.</li><li><strong>El centro:</strong> qué unificaba su ser.</li><li><strong>Las habitaciones:</strong> qué hizo con sus cuentas, su cuerpo, su matrimonio o soltería, sus hijos o quienes cuidaba, y su ministerio.</li><li><strong>La vara y Cristo:</strong> un rasgo de 1 Timoteo 3 o Tito 1 que el caso deja ver, y el modo de mando de Cristo.</li><li><strong>Lo que me enseña:</strong> una conclusión personal y concreta.</li></ol></section>';
    h += '<section class="card"><label for="texto-resena"><h2>Tu reseña</h2></label><textarea id="texto-resena" rows="12" data-i="resena" data-t="' + t.id + '" placeholder="Escribe aquí tu reseña (600 a 800 palabras)">' + esc(b.texto) + '</textarea><div class="contador" id="cont-resena"></div><button class="enlace" data-a="rellenar" data-t="' + t.id + '">Rellenar con texto de ejemplo (solo para probar)</button></section>';
    h += '<section class="card"><h2>Declaración de uso de inteligencia artificial</h2><p>Es obligatoria para entregar.</p><label class="check"><input type="radio" name="ia" id="ia-no" value="no" data-i="ia" data-t="' + t.id + '"' + (b.uso === 'no' ? ' checked' : '') + '> No usé inteligencia artificial</label><label class="check"><input type="radio" name="ia" id="ia-si" value="si" data-i="ia" data-t="' + t.id + '"' + (b.uso === 'si' ? ' checked' : '') + '> Usé inteligencia artificial</label><div id="ia-det-caja"' + (b.uso === 'si' ? '' : ' hidden') + '><label for="ia-detalle">¿Qué herramienta y para qué?</label><input type="text" id="ia-detalle" data-i="iadet" data-t="' + t.id + '" value="' + esc(b.detalle) + '"></div></section>';
    h += '<section class="card"><h2>Comprobaciones</h2><div id="comp-resena"></div><button class="btn" id="confirmar" data-a="confirmar" data-t="' + t.id + '">Confirmar entrega</button><p class="vacio" id="porque"></p></section>';
    return h;
  };
  function refrescaResena(tId) {
    var t = tarea(tId), b = S.borradores[S.usuario + ':' + tId]; if (!b) return;
    var ch = R.comprobarResena({ texto: b.texto, entregadaMs: ahora(), ia: { uso: b.uso, detalle: b.detalle } }, t.limite), n = R.contarPalabras(b.texto);
    var c = document.getElementById('cont-resena'); if (c) { c.textContent = n + ' palabras · se piden de 600 a 800'; c.className = 'contador ' + (n >= 600 && n <= 800 ? 'ok' : 'no'); }
    var k = document.getElementById('comp-resena'); if (k) k.innerHTML = htmlComprobaciones(ch);
    var bloquea = ch.some(function (x) { return x.bloquea; }) || n === 0, bt = document.getElementById('confirmar'), pq = document.getElementById('porque');
    if (bt) bt.disabled = bloquea;
    if (pq) pq.textContent = n === 0 ? 'Escribe tu reseña para poder entregar.' : bloquea ? 'Completa la declaración de inteligencia artificial para poder entregar.' : (ch.some(function (x) { return !x.ok; }) ? 'Puedes entregar así, pero revisa los avisos marcados con «!».' : '');
  }
  V.foros = function () {
    var h = '<h1>Foros</h1><div class="lista">';
    S.foros.forEach(function (f) {
      var d = fechasForo(f), ab = foroAbierto(f), txt = f.siempre ? 'Siempre abierto · sin nota' : ab ? 'Abierto · aporte hasta ' + fechaCorta(d.aporte) + ' · cierra ' + fechaCorta(d.cierra) : ahora() < d.abre ? 'Abre ' + fechaCorta(d.abre) : 'Cerrado';
      h += '<button class="item" data-a="ir" data-n="foro" data-f="' + f.id + '"' + (!f.siempre && ahora() < d.abre && yo().rol !== 'profesor' ? ' disabled' : '') + '><span class="numero">' + (f.conNota ? f.titulo.replace('Foro ', '') : '·') + '</span><span class="cuerpo"><strong>' + f.titulo + '</strong><small>' + txt + (f.conNota ? ' · 2,5 % de la nota' : '') + '</small></span></button>';
    });
    return h + '</div>';
  };
  function listaHtml(pref, valores, sobre) {
    return '<fieldset class="lista-comp"><legend>' + sobre + '</legend>' + C.partes.map(function (p) { return '<label class="check"><input type="checkbox" id="' + pref + '-' + p.k + '"' + (valores && valores[p.k] ? ' checked' : '') + '> ' + p.t + '</label>'; }).join('') + '</fieldset>';
  }
  V.foro = function (p) {
    var f = S.foros.filter(function (x) { return x.id === p.f; })[0], u = yo(), d = fechasForo(f), ms = msgForo(f.id), ab = foroAbierto(f), prof = u.rol === 'profesor';
    var mio = ms.filter(function (m) { return m.autor === u.id && !m.responde; })[0];
    var h = '<button class="volver" data-a="ir" data-n="foros">← Foros</button><h1>' + f.titulo + '</h1>';
    if (f.conNota) h += '<p>Aporte (mínimo 400 palabras) antes de: ' + fecha(d.aporte) + '</p><p>Dos respuestas (mínimo 150 palabras cada una) antes de: ' + fecha(d.cierra) + '</p>';
    h += '<section class="card"><h2>Tema</h2><p>[Tema pendiente: Danilo]</p></section>';
    if (!ab) h += '<p class="nota-info">' + (ahora() < d.abre ? 'Este foro todavía no abre.' : 'Este foro está cerrado y ya no acepta mensajes.') + '</p>';
    if (ab && !prof && !mio) {
      h += '<section class="card"><label for="texto-aporte"><h2>Tu aporte</h2></label><textarea id="texto-aporte" rows="10" data-i="aporte" data-min="' + (f.conNota ? 400 : 0) + '"></textarea><div class="contador" id="cont-aporte"></div><button class="enlace" data-a="rellenarForo" data-id="texto-aporte" data-n="410">Rellenar con texto de ejemplo (solo para probar)</button>';
      if (f.conNota) h += listaHtml('auto', null, 'Antes de publicar, léete: ¿qué lograste en tu aporte? No cambia tu nota.');
      h += '<button class="btn" data-a="publicar" data-f="' + f.id + '">Publicar aporte</button></section>';
    }
    var aportes = ms.filter(function (m) { return !m.responde; }).sort(function (a, b) { return a.fecha - b.fecha; });
    if (f.verDespues && !prof && !mio && aportes.length) h += '<p class="nota-info">Hay ' + aportes.length + ' aporte(s) de tus compañeros. Los verás cuando publiques el tuyo.</p>';
    else aportes.forEach(function (a) {
      var resp = ms.filter(function (m) { return m.responde === a.id; }), yaResp = resp.some(function (r) { return r.autor === u.id; });
      h += '<article class="card msg"><header><strong>' + esc(usuario(a.autor).nombre) + '</strong>' + (a.autor === u.id ? ' <span class="pill p-entregada">Tu aporte</span>' : '') + '<small>' + fechaCorta(a.fecha) + ' · ' + a.palabras + ' palabras' + (f.conNota && a.fecha > d.aporte ? ' · <span class="aviso">después del jueves</span>' : '') + '</small></header><p class="texto">' + esc(a.texto) + '</p>';
      resp.forEach(function (r) { h += '<div class="resp"><strong>' + esc(usuario(r.autor).nombre) + '</strong><small>' + fechaCorta(r.fecha) + ' · ' + r.palabras + ' palabras</small><p class="texto">' + esc(r.texto) + '</p></div>'; });
      if (ab && a.autor !== u.id && !yaResp) {
        var id = 'resp-' + a.id;
        h += '<details class="responder"><summary>Responder a ' + esc(usuario(a.autor).nombre.split(' ')[0]) + '</summary>';
        if (f.conNota && !prof) h += listaHtml('val-' + a.id, null, '¿Qué logró tu compañero en su aporte? Tu lectura le sirve a él y al profesor.');
        h += '<label for="' + id + '">Tu respuesta' + (f.conNota ? ' (mínimo 150 palabras)' : '') + '</label><textarea id="' + id + '" rows="6" data-i="resp" data-c="cont-' + a.id + '" data-min="' + (f.conNota ? 150 : 0) + '"></textarea><div class="contador" id="cont-' + a.id + '"></div><button class="enlace" data-a="rellenarForo" data-id="' + id + '" data-n="160">Rellenar con texto de ejemplo (solo para probar)</button><button class="btn sec" data-a="responder" data-f="' + f.id + '" data-m="' + a.id + '">Publicar respuesta</button></details>';
      }
      h += '</article>';
    });
    if (!aportes.length) h += '<p class="vacio">Todavía no hay aportes.</p>';
    return h;
  };
  V.tareas = function () {
    var u = yo(), h = '<h1>Mis tareas</h1>';
    tareas().forEach(function (t) {
      var x = estadoTarea(t, u.id), ab = ahora() >= R.fechasSemana(t.semana).abre;
      h += '<section class="card tarea"><div class="fila"><div><strong>' + t.titulo + '</strong> · semana ' + t.semana + '<br><small>Límite: ' + fechaCorta(t.limite) + '</small></div>' + pastilla(x.k) + '</div>';
      if (x.k === 'calificada') {
        h += '<p class="grande">' + num(x.nota) + ' <small>/ 100</small></p>' + (x.a.dias ? '<p class="aviso">Rúbrica: ' + totalRubrica(x.n.puntos) + ' · atraso de ' + x.a.dias + ' día(s): −' + x.a.descuento + '</p>' : '') + '<table class="mini">' + C.rubricaResena.map(function (c) { return '<tr><td>' + c.t + '</td><td>' + (x.n.puntos[c.k] || 0) + ' / ' + c.max + '</td></tr>'; }).join('') + '</table><p><strong>Comentario del profesor:</strong> ' + esc(x.n.comentario) + '</p>';
      } else if (x.e) h += '<p>Entregada: ' + fecha(x.e.entregadaMs) + (x.a.dias ? '<br><span class="aviso">' + x.a.dias + ' día(s) de atraso: se restarán ' + x.a.descuento + ' puntos.</span>' : '') + '</p>';
      if (x.k !== 'calificada' && ab) h += '<button class="btn sec" data-a="ir" data-n="entregar" data-t="' + t.id + '">' + (x.e ? 'Corregir y volver a entregar' : 'Entregar') + '</button>';
      h += '</section>';
    });
    return h;
  };
  function tablaComponentes(it) {
    var grupos = {};
    it.forEach(function (i) { (grupos[i.grupo] = grupos[i.grupo] || []).push(i); });
    var h = '<div class="scroll"><table><thead><tr><th>Componente</th><th>Peso</th><th>Calificadas</th><th>Promedio</th></tr></thead><tbody>';
    Object.keys(grupos).forEach(function (g) {
      var l = grupos[g], cal = l.filter(function (i) { return typeof i.nota === 'number'; }), pr = cal.length ? cal.reduce(function (a, i) { return a + i.nota; }, 0) / cal.length : null;
      h += '<tr><td>' + g + '</td><td>' + num(l.reduce(function (a, i) { return a + i.peso; }, 0)) + ' %</td><td>' + cal.length + ' de ' + l.length + '</td><td>' + num(pr) + '</td></tr>';
    });
    [['Reseña crítica del libro', 10], ['Evaluación de medio término', 10], ['Evaluación final', 10], ['Tesis de aplicación ministerial', 40]].forEach(function (x) { h += '<tr class="apagado"><td>' + x[0] + '</td><td>' + x[1] + ' %</td><td colspan="2">Fase 2</td></tr>'; });
    return h + '</tbody></table></div>';
  }
  V.notas = function () {
    var it = itemsNotas(S.usuario), p = R.promedios(it);
    var h = '<h1>Mis notas</h1><div class="dos"><section class="card cifra"><div class="eyebrow">Nota acumulada</div><p class="grande">' + num(p.acumulada) + ' <small>' + R.letra(p.acumulada) + '</small></p><p>Solo con lo que ya está calificado.</p></section><section class="card cifra"><div class="eyebrow">Si el curso terminara hoy</div><p class="grande">' + num(p.hoy) + ' <small>' + R.letra(p.hoy) + '</small></p><p>Cuenta 0 en lo vencido y no entregado.</p></section></div>';
    return h + '<section class="card"><h2>Por componente</h2>' + tablaComponentes(it) + '</section>';
  };

  V.entrada = function (p) {
    var h = '<section class="card entrada"><div class="eyebrow">Aula del curso</div><h1>Entrar</h1><p>Escribe el correo y la contraseña que recibiste al inscribirte.</p>';
    if (p.error) h += '<p class="aviso" role="alert">' + esc(p.error) + '</p>';
    h += '<label for="correo">Correo</label><input type="text" id="correo" inputmode="email" autocomplete="username" value="' + esc(p.correo || '') + '"><label for="clave">Contraseña</label><input type="password" id="clave" autocomplete="current-password"><button class="btn" data-a="entrar" type="button">Entrar</button><button class="enlace" data-a="olvide" type="button">Olvidé mi contraseña</button>' + (p.olvide ? '<p class="nota-info">En el aula real te llegará un correo para crear una contraseña nueva. En esta prueba, usa las cuentas de abajo.</p>' : '') + '</section>';
    h += '<section class="card"><h2>Cuentas de prueba</h2><p>En esta prueba todas usan la contraseña <strong>' + CLAVE_DEMO + '</strong>. Toca una para llenar los datos.</p>' + S.usuarios.map(function (x) { return '<button class="item" data-a="demo" data-c="' + x.correo + '" type="button"><span class="cuerpo"><strong>' + esc(x.nombre) + '</strong><small>' + x.correo + ' · ' + (x.rol === 'profesor' ? 'profesor' : 'estudiante, ' + x.nota) + '</small></span></button>'; }).join('') + '<p class="vacio">Aviso: esta entrada es una demostración de cómo se verá. La contraseña real, guardada cifrada y comprobada en un servidor, llega con la versión definitiva.</p></section>';
    return h;
  };

  /* ---------- Vistas del profesor ---------- */
  function porCalificar() { return S.entregas.filter(function (e) { var n = notaDe(e.id); return !(n && n.publicada); }); }
  function forosPorPublicar() {
    var k = 0;
    S.foros.filter(function (f) { return f.conNota; }).forEach(function (f) { estudiantes().forEach(function (e) { var ev = R.evaluarForo(msgForo(f.id), e.id, fechasForo(f)), nf = notaForo(f.id, e.id); if ((ev.aporte || ahora() > fechasForo(f).cierra) && !(nf && nf.publicada) && ahora() >= fechasForo(f).abre) k++; }); });
    return k;
  }
  V.panel = function () {
    var pc = porCalificar().length, n = R.semanaActual(ahora()), d = R.fechasSemana(n), f = S.foros.filter(function (x) { return x.conNota && foroAbierto(x); })[0];
    var h = '<h1>Panel del profesor</h1><div class="dos"><section class="card cifra"><div class="eyebrow">Entregas por calificar</div><p class="grande">' + pc + '</p><button class="btn" data-a="ir" data-n="entregas">Ver entregas</button></section><section class="card cifra"><div class="eyebrow">Notas de foro por revisar</div><p class="grande">' + forosPorPublicar() + '</p><button class="btn sec" data-a="ir" data-n="registro">Abrir el registro</button></section></div>';
    h += '<section class="card"><h2>Próximas fechas</h2><div class="fila"><div><strong>Semana ' + n + '</strong> cierra</div><div>' + fecha(d.cierra) + '</div></div>' + (f ? '<div class="fila"><div><strong>' + f.titulo + '</strong>: vence el aporte</div><div>' + fecha(fechasForo(f).aporte) + '</div></div>' : '') + '</section>';
    return h;
  };
  V.entregas = function () {
    var h = '<h1>Entregas</h1>', l = S.entregas.slice().sort(function (a, b) { return a.entregadaMs - b.entregadaMs; });
    if (!l.length) h += '<p class="vacio">Todavía no hay entregas.</p>';
    l.forEach(function (e) {
      var t = tarea(e.tarea), x = estadoTarea(t, e.est);
      h += '<section class="card"><div class="fila"><div><strong>' + esc(usuario(e.est).nombre) + '</strong> · ' + t.titulo + '<br><small>Entregada: ' + fechaCorta(e.entregadaMs) + ' · ' + R.contarPalabras(e.texto) + ' palabras</small></div>' + pastilla(x.k) + '</div><button class="btn sec" data-a="ir" data-n="calificar" data-e="' + e.id + '">' + (x.k === 'calificada' ? 'Ver o corregir la nota (' + num(x.nota) + ')' : 'Calificar') + '</button></section>';
    });
    return h;
  };
  V.calificar = function (p) {
    var e = S.entregas.filter(function (x) { return x.id === p.e; })[0], t = tarea(e.tarea), n = notaDe(e.id) || { puntos: {}, comentario: '' }, a = R.atraso(e.entregadaMs, t.limite, e.prorroga);
    var ch = R.comprobarResena(e, t.limite);
    var h = '<button class="volver" data-a="ir" data-n="entregas">← Entregas</button><h1>' + t.titulo + ' · ' + esc(usuario(e.est).nombre) + '</h1><div class="lado">';
    h += '<section class="card"><h2>La entrega</h2><p><small>Entregada: ' + fechaCorta(e.entregadaMs) + ' · Declaración de IA: ' + (e.ia.uso === 'si' ? 'Usó. ' + esc(e.ia.detalle) : 'No usó') + '</small></p><div class="entrega-texto">' + esc(e.texto) + '</div><h2>Comprobaciones automáticas</h2>' + htmlComprobaciones(ch) + '</section>';
    h += '<section class="card"><h2>Rúbrica</h2>' + C.rubricaResena.map(function (c) { return '<div class="crit"><label for="pt-' + c.k + '">' + c.t + ' <small>(máx. ' + c.max + ')</small></label><input type="number" inputmode="numeric" id="pt-' + c.k + '" min="0" max="' + c.max + '" value="' + (n.puntos[c.k] === undefined ? '' : n.puntos[c.k]) + '" data-i="pt"></div>'; }).join('');
    h += '<div class="total" id="total-rub" data-dias="' + a.dias + '" data-desc="' + a.descuento + '" data-cero="' + (a.cero ? 1 : 0) + '"></div>';
    h += '<label class="check"><input type="checkbox" id="prorroga" data-a="prorroga" data-e="' + e.id + '"' + (e.prorroga ? ' checked' : '') + '> Conceder prórroga (anula el descuento por atraso)</label>';
    h += '<label for="comentario">Comentario para el estudiante</label><textarea id="comentario" rows="4">' + esc(n.comentario) + '</textarea><button class="btn" data-a="publicarNota" data-e="' + e.id + '">Publicar nota</button><p class="vacio">La nota solo llega al estudiante cuando la publicas.</p></section></div>';
    return h;
  };
  function refrescaTotal() {
    var el = document.getElementById('total-rub'); if (!el) return;
    var tot = 0, fuera = false;
    C.rubricaResena.forEach(function (c) { var i = document.getElementById('pt-' + c.k), v = +i.value || 0; if (v > c.max || v < 0) fuera = true; tot += v; });
    var dias = +el.dataset.dias, desc = +el.dataset.desc, cero = el.dataset.cero === '1', fin = cero ? 0 : Math.max(0, tot - desc);
    el.innerHTML = 'Rúbrica: <strong>' + tot + ' / 100</strong>' + (dias ? '<br>Atraso de ' + dias + ' día(s): ' + (cero ? 'vale 0' : '−' + desc) : '') + '<br>Nota final: <strong class="grande">' + fin + '</strong>' + (fuera ? '<br><span class="aviso">Hay un criterio fuera de su máximo.</span>' : '');
    el.dataset.fuera = fuera ? '1' : '0';
  }
  V.registro = function (p) {
    var con = S.foros.filter(function (f) { return f.conNota; }), f = con.filter(function (x) { return x.id === (p.f || 'f1'); })[0], d = fechasForo(f), ms = msgForo(f.id);
    var h = '<h1>Registro de foros</h1><label for="sel-foro">Foro</label><select id="sel-foro" data-a="selForo">' + con.map(function (x) { return '<option value="' + x.id + '"' + (x.id === f.id ? ' selected' : '') + '>' + x.titulo + ' · semana ' + x.semana + '</option>'; }).join('') + '</select>';
    h += '<p>Aporte hasta: ' + fecha(d.aporte) + '</p><p>Cierra: ' + fecha(d.cierra) + '</p>';
    if (ahora() < d.abre) return h + '<p class="nota-info">Este foro todavía no abre.</p>';
    estudiantes().forEach(function (e) {
      var ev = R.evaluarForo(ms, e.id, d), nf = notaForo(f.id, e.id);
      var val = ev.aporte ? ms.filter(function (m) { return m.responde === ev.aporte.id && m.lista && m.autor !== e.id; }) : [];
      h += '<section class="card reg"><div class="fila"><strong>' + esc(e.nombre) + '</strong>' + (nf && nf.publicada ? '<span class="pill p-calificada">Publicada: ' + num(nf.nota) + '</span>' : '<span class="pill p-pendiente">Sin publicar</span>') + '</div>';
      h += '<table class="mini"><tr><td>Aporte</td><td>' + (ev.aporte ? ({ 'a tiempo': 'A tiempo', atrasado: 'Después del jueves (mitad)', corto: 'Menos de 400 palabras', falta: 'Fuera de plazo' }[ev.estado]) + ' · ' + ev.aporte.palabras + ' palabras' : 'No ha publicado') + '</td></tr><tr><td>Respuestas válidas</td><td>' + ev.respuestas + ' de 2</td></tr></table>';
      if (ev.aporte && ev.aporte.lista) {
        h += '<div class="scroll"><table class="lectura"><thead><tr><th>Parte del método</th><th>Se marcó</th><th>Compañeros</th></tr></thead><tbody>' + C.partes.map(function (pt) {
          var si = val.filter(function (v) { return v.lista[pt.k]; }).length, alerta = ev.senales.indexOf(pt.t) >= 0;
          return '<tr' + (alerta ? ' class="alerta"' : '') + '><td>' + pt.t + '</td><td>' + (ev.aporte.lista[pt.k] ? 'Sí' : 'No') + '</td><td>' + (val.length ? si + ' de ' + val.length + ' sí' : 'Sin lecturas') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
        if (ev.senales.length) h += '<p class="aviso">Señal de atención: se marcó «' + ev.senales.join('», «') + '» y sus dos compañeros dijeron que no.</p>';
      }
      h += '<div class="crit"><label for="nf-' + e.id + '">Nota del foro <small>(propuesta: ' + num(ev.propuesta) + ')</small></label><input type="number" inputmode="numeric" id="nf-' + e.id + '" min="0" max="100" value="' + (nf ? nf.nota : ev.propuesta) + '"></div><button class="btn sec" data-a="publicarForo" data-f="' + f.id + '" data-est="' + e.id + '">' + (nf && nf.publicada ? 'Actualizar nota' : 'Publicar nota') + '</button></section>';
    });
    return h + '<button class="btn" data-a="publicarForoTodas" data-f="' + f.id + '">Publicar todas con el valor que se ve</button>';
  };
  V.libro = function () {
    var cols = tareas().map(function (t) { return { id: t.id, t: 'R' + t.id.slice(1) }; }).concat(S.foros.filter(function (f) { return f.conNota; }).map(function (f) { return { id: f.id, t: 'F' + f.titulo.replace('Foro ', '') }; }));
    var h = '<h1>Libro de notas</h1><p>R = reseña (2 % cada una). F = foro (2,5 % cada uno). Las demás tareas llegan en la Fase 2.</p><div class="scroll"><table class="libro"><thead><tr><th>Estudiante</th>' + cols.map(function (c) { return '<th>' + c.t + '</th>'; }).join('') + '<th>Acumulada</th><th>Hoy</th><th>Letra</th></tr></thead><tbody>';
    estudiantes().forEach(function (e) {
      var it = itemsNotas(e.id), p = R.promedios(it);
      h += '<tr><th>' + esc(e.nombre) + '</th>' + cols.map(function (c) {
        var i = it.filter(function (x) { return x.id === c.id; })[0];
        return '<td class="e-' + i.estado + '">' + (typeof i.nota === 'number' ? num(i.nota) : i.estado === 'entregada' || i.estado === 'atrasada' ? '●' : i.estado === 'vencida' ? '0' : '') + '</td>';
      }).join('') + '<td><strong>' + num(p.acumulada) + '</strong></td><td>' + num(p.hoy) + '</td><td><strong>' + R.letra(p.acumulada) + '</strong></td></tr>';
    });
    return h + '</tbody></table></div><p class="vacio">● = entregada, falta calificar. 0 = vencida sin entregar (cuenta en «Hoy»). Vacío = todavía no vence.</p><p class="vacio">La exportación a CSV y PDF llega en la Fase 3.</p>';
  };
  V.contenido = function (p) {
    var h = '<h1>Contenido de las semanas</h1>';
    if (!p.s) {
      h += '<div class="lista">' + S.semanas.map(function (w) { return '<button class="item" data-a="ir" data-n="contenido" data-s="' + w.n + '"><span class="numero">' + w.n + '</span><span class="cuerpo"><strong>' + esc(w.titulo) + '</strong><small>' + esc(w.lectura) + ' · abre ' + fechaCorta(R.fechasSemana(w.n).abre) + '</small></span></button>'; }).join('') + '</div>';
      return h;
    }
    var w = S.semanas[p.s - 1];
    h = '<button class="volver" data-a="ir" data-n="contenido">← Todas las semanas</button><h1>Editar la semana ' + w.n + '</h1><section class="card form"><label for="c-titulo">Título del caso</label><input type="text" id="c-titulo" value="' + esc(w.titulo) + '"><label for="c-lectura">Lectura</label><input type="text" id="c-lectura" value="' + esc(w.lectura) + '">';
    w.videos.forEach(function (v, j) { h += '<label for="c-vt-' + j + '">Video ' + (j + 1) + ': título</label><input type="text" id="c-vt-' + j + '" value="' + esc(v.t) + '"><label for="c-vu-' + j + '">Video ' + (j + 1) + ': enlace</label><input type="text" id="c-vu-' + j + '" value="' + esc(v.url) + '">'; });
    h += '<label for="c-instr">Instrucciones</label><textarea id="c-instr" rows="5">' + esc(w.instrucciones) + '</textarea><button class="btn" data-a="guardarSemana" data-s="' + w.n + '">Guardar cambios</button></section>';
    return h;
  };

  /* ---------- Armazón ---------- */
  var MENU = {
    estudiante: [['inicio', 'Inicio'], ['semanas', 'El curso'], ['foros', 'Foros'], ['tareas', 'Mis tareas'], ['notas', 'Mis notas']],
    profesor: [['panel', 'Panel'], ['semanas', 'El curso'], ['entregas', 'Entregas'], ['registro', 'Foros'], ['libro', 'Notas'], ['contenido', 'Contenido']]
  };
  var PADRE = { semana: 'semanas', entregar: 'tareas', foro: 'foros', calificar: 'entregas' };
  function pintar(msg) {
    var u = yo(), v = S.vista, activo = PADRE[v.n] || v.n, ses = document.getElementById('sesion'), nav = document.querySelector('nav.menu');
    document.querySelector('footer.prueba').hidden = !u;
    if (!u) {
      ses.innerHTML = ''; nav.hidden = true;
      if (v.n !== 'entrada') v = S.vista = { n: 'entrada' };
      document.getElementById('vista').innerHTML = (msg ? '<p class="exito" role="status">' + esc(msg) + '</p>' : '') + V.entrada(v);
      guardar(); return;
    }
    nav.hidden = false;
    ses.innerHTML = '<span><strong>' + esc(u.nombre) + '</strong><br>' + (u.rol === 'profesor' ? 'Profesor' : 'Estudiante') + '</span><button class="btn sec chico" data-a="salir" type="button">Salir</button>';
    document.getElementById('menu').innerHTML = MENU[u.rol].map(function (m) { return '<button data-a="ir" data-n="' + m[0] + '"' + (m[0] === activo ? ' aria-current="page"' : '') + '>' + m[1] + '</button>'; }).join('');
    document.getElementById('vista').innerHTML = (msg ? '<p class="exito" role="status">' + esc(msg) + '</p>' : '') + V[v.n](v);
    var p = R.partesZona(S.ahora, Z), z = function (n) { return (n < 10 ? '0' : '') + n; };
    document.getElementById('reloj').value = p.y + '-' + z(p.m) + '-' + z(p.d) + 'T' + z(p.h) + ':' + z(p.mi);
    if (v.n === 'entregar') refrescaResena(v.t);
    if (v.n === 'calificar') refrescaTotal();
    Array.prototype.forEach.call(document.querySelectorAll('textarea[data-i="aporte"],textarea[data-i="resp"]'), cuenta);
    guardar();
  }
  function ir(n, extra, msg) { S.vista = Object.assign({ n: n }, extra || {}); pintar(msg); window.scrollTo(0, 0); }
  function cuenta(el) {
    var c = document.getElementById(el.dataset.c || 'cont-aporte'), min = +el.dataset.min, n = R.contarPalabras(el.value);
    if (c) { c.textContent = n + ' palabras' + (min ? ' · mínimo ' + min : ''); c.className = 'contador ' + (n >= min ? 'ok' : 'no'); }
  }
  function leeLista(pref) { var o = {}; C.partes.forEach(function (p) { var e = document.getElementById(pref + '-' + p.k); o[p.k] = !!(e && e.checked); }); return o; }

  var A = {
    demo: function (d) { document.getElementById('correo').value = d.c; document.getElementById('clave').value = CLAVE_DEMO; document.getElementById('clave').focus(); },
    olvide: function () { S.vista = { n: 'entrada', olvide: true, correo: document.getElementById('correo').value }; pintar(); },
    entrar: function () {
      var c = document.getElementById('correo').value.trim().toLowerCase(), k = document.getElementById('clave').value;
      var u = S.usuarios.filter(function (x) { return x.correo === c; })[0];
      if (!u || k !== CLAVE_DEMO) { S.vista = { n: 'entrada', correo: c, error: 'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.' }; pintar(); return; }
      S.usuario = u.id; ir(u.rol === 'profesor' ? 'panel' : 'inicio');
    },
    salir: function () { S.usuario = null; S.borradores = {}; ir('entrada', {}, 'Saliste del aula.'); },
    ir: function (d) { var x = {}; if (d.s) x.s = +d.s; if (d.t) x.t = d.t; if (d.f) x.f = d.f; if (d.e) x.e = d.e; ir(d.n, x); },
    visto: function (d, el) { S.vistos[d.k] = el.checked; var ab = Array.prototype.map.call(document.querySelectorAll('details[open]'), function (x) { return x.id; }), y = window.scrollY; Array.prototype.forEach.call(document.querySelectorAll('details'), function (x) { x.dataset.era = x.open ? '1' : '0'; }); pintar(); Array.prototype.forEach.call(document.querySelectorAll('#vista details'), function (x) { x.open = ab.indexOf(x.id) >= 0; }); window.scrollTo(0, y); },
    rellenar: function (d) { var b = S.borradores[S.usuario + ':' + d.t]; b.texto = relleno(650, true); document.getElementById('texto-resena').value = b.texto; refrescaResena(d.t); },
    rellenarForo: function (d) { var el = document.getElementById(d.id); el.value = relleno(+d.n); cuenta(el); },
    confirmar: function (d) {
      var b = S.borradores[S.usuario + ':' + d.t], e = entregaDe(d.t, S.usuario);
      if (!e) { e = { id: 'en' + (S.sig++), tarea: d.t, est: S.usuario }; S.entregas.push(e); }
      e.texto = b.texto; e.entregadaMs = ahora(); e.ia = { uso: b.uso, detalle: b.uso === 'si' ? b.detalle : '' };
      delete S.borradores[S.usuario + ':' + d.t];
      var a = R.atraso(e.entregadaMs, tarea(d.t).limite, e.prorroga);
      ir('tareas', {}, 'Entrega recibida.' + (a.dias ? ' Llegó con ' + a.dias + ' día(s) de atraso: se restarán ' + a.descuento + ' puntos.' : ' Llegó a tiempo.'));
    },
    publicar: function (d) {
      var f = S.foros.filter(function (x) { return x.id === d.f; })[0], t = document.getElementById('texto-aporte').value;
      if (!foroAbierto(f)) return pintar('Este foro ya está cerrado.');
      if (!R.contarPalabras(t)) return;
      S.mensajes.push({ id: 'm' + (S.sig++), foro: d.f, autor: S.usuario, texto: t, fecha: ahora(), lista: f.conNota ? leeLista('auto') : undefined });
      var tarde = f.conNota && ahora() > fechasForo(f).aporte, corto = f.conNota && R.contarPalabras(t) < 400;
      pintar('Aporte publicado.' + (corto ? ' Tiene menos de 400 palabras: así no recibe crédito.' : tarde ? ' Llegó después del jueves: recibe la mitad del crédito.' : ' Ahora responde a dos compañeros.'));
    },
    responder: function (d) {
      var f = S.foros.filter(function (x) { return x.id === d.f; })[0], t = document.getElementById('resp-' + d.m).value;
      if (!foroAbierto(f)) return pintar('Este foro ya está cerrado.');
      if (!R.contarPalabras(t)) return;
      S.mensajes.push({ id: 'm' + (S.sig++), foro: d.f, autor: S.usuario, responde: d.m, texto: t, fecha: ahora(), lista: f.conNota && yo().rol === 'estudiante' ? leeLista('val-' + d.m) : undefined });
      pintar('Respuesta publicada.' + (f.conNota && R.contarPalabras(t) < 150 ? ' Tiene menos de 150 palabras: así no cuenta como respuesta válida.' : ''));
    },
    prorroga: function (d, el) { var e = S.entregas.filter(function (x) { return x.id === d.e; })[0]; var pts = {}; C.rubricaResena.forEach(function (c) { pts[c.k] = document.getElementById('pt-' + c.k).value; }); var com = document.getElementById('comentario').value; e.prorroga = el.checked; pintar(); C.rubricaResena.forEach(function (c) { document.getElementById('pt-' + c.k).value = pts[c.k]; }); document.getElementById('comentario').value = com; refrescaTotal(); },
    publicarNota: function (d) {
      refrescaTotal();
      if (document.getElementById('total-rub').dataset.fuera === '1') return;
      var pts = {}, falta = false;
      C.rubricaResena.forEach(function (c) { var v = document.getElementById('pt-' + c.k).value; if (v === '') falta = true; pts[c.k] = +v || 0; });
      if (falta) { document.getElementById('total-rub').insertAdjacentHTML('beforeend', '<br><span class="aviso">Pon puntos en todos los criterios antes de publicar.</span>'); return; }
      var n = notaDe(d.e); if (!n) { n = { entrega: d.e }; S.notas.push(n); }
      n.puntos = pts; n.comentario = document.getElementById('comentario').value; n.publicada = true;
      ir('entregas', {}, 'Nota publicada. Ya está en el libro de notas y el estudiante la puede ver.');
    },
    selForo: function (d, el) { ir('registro', { f: el.value }); },
    publicarForo: function (d) { ponForo(d.f, d.est); pintar('Nota del foro publicada.'); },
    publicarForoTodas: function (d) { estudiantes().forEach(function (e) { ponForo(d.f, e.id); }); pintar('Notas del foro publicadas para todos.'); },
    guardarSemana: function (d) {
      var w = S.semanas[d.s - 1];
      w.titulo = document.getElementById('c-titulo').value; w.lectura = document.getElementById('c-lectura').value; w.instrucciones = document.getElementById('c-instr').value;
      w.videos.forEach(function (v, j) { v.t = document.getElementById('c-vt-' + j).value; v.url = document.getElementById('c-vu-' + j).value; });
      ir('contenido', {}, 'Semana ' + w.n + ' guardada. Los estudiantes ya ven el cambio.');
    },
    reiniciar: function () { var c = document.getElementById('confirma-reinicio'); c.hidden = !c.hidden; },
    reiniciarSi: function () { S = semilla(); document.getElementById('confirma-reinicio').hidden = true; pintar('Datos de prueba reiniciados.'); },
    reiniciarNo: function () { document.getElementById('confirma-reinicio').hidden = true; }
  };
  function ponForo(fid, est) {
    var el = document.getElementById('nf-' + est), v = Math.max(0, Math.min(100, +el.value || 0)), n = notaForo(fid, est);
    if (!n) { n = { foro: fid, est: est }; S.notasForo.push(n); }
    n.nota = v; n.publicada = true;
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-a]'); if (!el || el.tagName === 'SELECT') return;
    if (el.tagName === 'INPUT' && el.type !== 'checkbox') return;
    if (A[el.dataset.a]) A[el.dataset.a](el.dataset, el);
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.id === 'reloj' && el.value) { var m = el.value.match(/(\d+)-(\d+)-(\d+)T(\d+):(\d+)/); if (m) { S.ahora = ny(+m[1], +m[2], +m[3], +m[4], +m[5]); pintar('Fecha de prueba cambiada.'); } return; }
    if (el.tagName === 'SELECT' && el.dataset.a && A[el.dataset.a]) A[el.dataset.a](el.dataset, el);
  });
  document.addEventListener('input', function (ev) {
    var el = ev.target, i = el.dataset.i; if (!i) return;
    var b = el.dataset.t ? S.borradores[S.usuario + ':' + el.dataset.t] : null;
    if (i === 'resena') { b.texto = el.value; refrescaResena(el.dataset.t); }
    else if (i === 'ia') { b.uso = el.value; document.getElementById('ia-det-caja').hidden = el.value !== 'si'; refrescaResena(el.dataset.t); }
    else if (i === 'iadet') { b.detalle = el.value; refrescaResena(el.dataset.t); }
    else if (i === 'aporte' || i === 'resp') cuenta(el);
    else if (i === 'pt') refrescaTotal();
  });

  document.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && (ev.target.id === 'correo' || ev.target.id === 'clave')) A.entrar(); });
  if (!V[S.vista.n]) S.vista = { n: 'inicio' };
  pintar();
})();
