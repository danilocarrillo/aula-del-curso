/* Aula del curso · pantallas y conexión con la base de datos.
   Las reglas del curso (fechas, atrasos, foros, promedios) viven en reglas.js. */
(function () {
  var R = Reglas, C = R.CFG, Z = C.zona, CONF = window.AULA_CONFIG;
  var sb = window.supabase.createClient(CONF.url, CONF.llavePublica);
  var OTRAS = { 6: 'Evaluación de medio término', 7: 'Avance de la tesis', 11: 'Reseña crítica del libro', 12: 'Evaluación final y tesis' };
  var S = { desfase: 0, usuario: null, perfil: null, vista: { n: 'entrada' }, usuarios: [], semanas: [], tareas: [], foros: [], entregas: [], notas: [], mensajes: [], notasForo: [], vistos: {}, borradores: {}, archivos: [], conArchivos: false };
  var PEND = {};                                   // archivos elegidos y aún no subidos, por tarea
  var MAX_ARCH = 6, MAX_PESO = 10 * 1024 * 1024;

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

  /* ---------- Datos: leer todo lo que esta persona tiene permiso de ver ---------- */
  function pedir(q) { return q.then(function (r) { if (r.error) throw r.error; return r.data; }); }
  function cargar() {
    return sb.auth.getSession().then(function (r) {
      var ses = r.data && r.data.session;
      if (!ses) { S.usuario = null; S.perfil = null; return; }
      var uid = ses.user.id;
      return pedir(sb.from('perfiles').select('*').eq('id', uid).maybeSingle()).then(function (p) {
        S.usuario = uid; S.perfil = p || { id: uid, nombre: '', rol: 'estudiante', estado: 'pendiente' };
        if (S.perfil.estado !== 'activo') return;
        return Promise.all([
          pedir(sb.from('configuracion').select('*').maybeSingle()),
          pedir(sb.from('perfiles').select('*').order('nombre')),
          pedir(sb.from('semanas').select('*').order('n')),
          pedir(sb.from('videos').select('*').order('semana').order('orden')),
          pedir(sb.from('tareas').select('*').order('semana')),
          pedir(sb.from('foros').select('*').order('orden')),
          pedir(sb.from('entregas').select('*')),
          pedir(sb.from('calificaciones').select('*')),
          pedir(sb.from('mensajes').select('*').order('creado')),
          pedir(sb.from('valoraciones').select('*')),
          pedir(sb.from('notas_foro').select('*')),
          pedir(sb.from('marcas').select('*')),
          sb.from('archivos').select('*').order('creado').then(function (r) { S.conArchivos = !r.error; return r.error ? [] : r.data; })
        ]).then(function (d) {
          var cfg = d[0];
          if (cfg) { C.zona = Z = cfg.zona; C.inicio = cfg.inicio.split('-').map(Number); }
          S.usuarios = d[1].map(function (p) { return { id: p.id, nombre: p.nombre || 'Sin nombre', rol: p.rol === 'administrador' ? 'profesor' : p.rol, admin: p.rol === 'administrador', estado: p.estado, nota: '' }; });
          S.semanas = d[2].map(function (w) { return { n: w.n, titulo: w.titulo, lectura: w.lectura, instrucciones: w.instrucciones, videos: d[3].filter(function (v) { return v.semana === w.n; }).map(function (v) { return { id: v.id, t: v.titulo, url: v.url }; }) }; });
          S.tareas = d[4].map(function (t) { return { id: t.id, titulo: t.titulo, semana: t.semana, limite: R.fechasSemana(t.semana).cierra, peso: +t.peso }; });
          S.foros = d[5].map(function (f) { return { id: f.id, semana: f.semana, titulo: f.titulo, tema: f.tema, conNota: f.con_nota, siempre: f.siempre_abierto, verDespues: f.ver_despues }; });
          S.entregas = d[6].map(function (e) { return { id: e.id, tarea: e.tarea, est: e.estudiante, texto: e.texto, entregadaMs: Date.parse(e.entregada_en), ia: { uso: e.ia_uso, detalle: e.ia_detalle }, prorroga: e.prorroga }; });
          S.notas = d[7].map(function (n) { return { entrega: n.entrega, puntos: n.puntos, comentario: n.comentario, publicada: n.publicada }; });
          var listas = {}; d[9].forEach(function (v) { listas[v.mensaje] = v.lista; });
          S.mensajes = d[8].map(function (m) { return { id: m.id, foro: m.foro, autor: m.autor, responde: m.responde, texto: m.texto, fecha: Date.parse(m.creado), lista: listas[m.id] }; });
          S.notasForo = d[10].map(function (n) { return { foro: n.foro, est: n.estudiante, nota: +n.nota, publicada: n.publicada }; });
          S.vistos = {}; d[11].forEach(function (m) { S.vistos[m.estudiante + ':' + m.clave] = true; });
          S.archivos = d[12];
        });
      });
    });
  }
  function rolTexto(u) { return u.admin ? 'Administrador · Profesor sénior' : u.rol === 'profesor' ? 'Profesor' : 'Estudiante'; }
  function traducir(e) {
    var m = (e && e.message) || String(e);
    if (/Invalid login credentials/i.test(m)) return 'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.';
    if (/already registered|already been registered/i.test(m)) return 'Ya existe una cuenta con ese correo. Entra con tu contraseña.';
    if (/Password should be/i.test(m)) return 'La contraseña es muy corta. Usa al menos 8 caracteres.';
    if (/valid email|invalid format|is invalid/i.test(m)) return 'Ese correo no parece válido. Revísalo.';
    if (/row-level security|permission denied/i.test(m)) return 'No tienes permiso para hacer eso.';
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No hay conexión con el aula. Revisa tu internet e inténtalo de nuevo. Lo que escribiste sigue aquí.';
    if (/mime type|not supported/i.test(m)) return 'Ese tipo de archivo no se admite. Usa PDF, Word o una imagen.';
    if (/exceeded the maximum|too large|Payload/i.test(m)) return 'El archivo pesa más de 10 MB. Redúcelo e inténtalo de nuevo.';
    if (/ia_uso|entregas_check/i.test(m)) return 'Completa la declaración de inteligencia artificial para poder entregar.';
    return m;
  }

  /* ---------- Utilidades ---------- */
  function esc(t) { return String(t === undefined || t === null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ahora() { return Date.now() + S.desfase; }
  function yo() { return S.usuarios.filter(function (u) { return u.id === S.usuario; })[0]; }
  function usuario(id) { return S.usuarios.filter(function (u) { return u.id === id; })[0]; }
  function estudiantes() { return S.usuarios.filter(function (u) { return u.rol === 'estudiante' && u.estado === 'activo'; }); }
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
  function tareas() { return S.tareas; }
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

  /* ---------- Archivos de las entregas ---------- */
  function archivosDe(enId) { return S.archivos.filter(function (a) { return a.entrega === enId; }); }
  function peso(n) { return n > 1048576 ? (Math.round(n / 104857.6) / 10 + ' MB').replace('.', ',') : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function esImagen(a) { return /^image\//.test(a.tipo || a.type || ''); }
  function admitido(f) { return /^image\//.test(f.type) || /\.(pdf|docx?)$/i.test(f.name) || /pdf|msword|wordprocessingml/.test(f.type); }
  function nombreLimpio(n) { return n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-80) || 'archivo'; }
  /* Las fotos se reducen antes de subir, para que quepan muchas páginas sin llenar el almacén. */
  function preparar(f) {
    var igual = { blob: f, tipo: f.type || 'application/octet-stream', nombre: f.name };
    if (!/^image\//.test(f.type) || /gif/.test(f.type)) return Promise.resolve(igual);
    return new Promise(function (res) {
      var img = new Image(), url = URL.createObjectURL(f);
      img.onload = function () {
        var s = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) { res(b && (b.size < f.size || !/jpeg|png|webp/.test(f.type)) ? { blob: b, tipo: 'image/jpeg', nombre: f.name.replace(/\.\w+$/, '') + '.jpg' } : igual); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); res(igual); };
      img.src = url;
    });
  }
  function htmlArchivos(lista, quitar) {
    if (!lista.length) return '';
    return '<ul class="archivos">' + lista.map(function (a) {
      return '<li><span class="arch-n">' + (esImagen(a) ? 'Foto' : 'Documento') + ' · ' + esc(a.nombre) + '<small>' + peso(a.tamano) + '</small></span><span class="botones"><button class="btn sec chico" type="button" data-a="abrirArchivo" data-id="' + a.id + '">Abrir</button>' + (quitar ? '<button class="enlace" type="button" data-a="quitarArchivo" data-id="' + a.id + '">Quitar</button>' : '') + '</span></li>';
    }).join('') + '</ul>';
  }
  function refrescaArchivos(tId) {
    var caja = document.getElementById('lista-arch'); if (!caja) return;
    var e = entregaDe(tId, S.usuario), ya = e ? archivosDe(e.id) : [], pend = PEND[tId] || [];
    caja.innerHTML = htmlArchivos(ya, true) + (pend.length ? '<ul class="archivos">' + pend.map(function (f, i) { return '<li><span class="arch-n">' + (esImagen(f) ? 'Foto' : 'Documento') + ' · ' + esc(f.name) + '<small>' + peso(f.size) + ' · se sube al confirmar</small></span><button class="enlace" type="button" data-a="quitarPend" data-t="' + tId + '" data-i="' + i + '">Quitar</button></li>'; }).join('') + '</ul>' : '') + (!ya.length && !pend.length ? '<p class="vacio">Todavía no hay archivos.</p>' : '');
  }
  function cuantosArchivos(tId) { var e = entregaDe(tId, S.usuario); return (e ? archivosDe(e.id).length : 0) + (PEND[tId] || []).length; }

  /* ---------- Vistas del estudiante ---------- */
  var V = {};
  V.inicio = function () {
    var u = yo(), n = Math.max(1, R.semanaActual(ahora())), w = S.semanas[n - 1], d = R.fechasSemana(n);
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
    var d = R.fechasSemana(w.n), t = S.tareas.filter(function (x) { return x.semana === w.n; })[0] || null, pasos = [];
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
    h += '<section class="card"><label for="texto-resena"><h2>Tu reseña</h2></label><textarea id="texto-resena" rows="12" data-i="resena" data-t="' + t.id + '" placeholder="Escribe aquí tu reseña (600 a 800 palabras), o adjunta abajo un documento o fotos">' + esc(b.texto) + '</textarea><div class="contador" id="cont-resena"></div>' + (CONF.modoPrueba ? '<button class="enlace" data-a="rellenar" data-t="' + t.id + '">Rellenar con texto de ejemplo (solo para probar)</button>' : '') + '</section>';
    if (S.conArchivos) h += '<section class="card"><h2>Documentos, escaneos o fotos</h2><p>Puedes escribir arriba, adjuntar archivos, o las dos cosas. Se admiten PDF, Word e imágenes: hasta ' + MAX_ARCH + ' archivos de 10 MB cada uno. Si es una foto, que se lea bien.</p><div id="lista-arch"></div><label class="btn sec" for="elige-arch">Agregar documento o foto</label><input type="file" id="elige-arch" class="oculto" multiple accept=".pdf,.doc,.docx,image/*" data-t="' + t.id + '"></section>';
    h += '<section class="card"><h2>Declaración de uso de inteligencia artificial</h2><p>Es obligatoria para entregar.</p><label class="check"><input type="radio" name="ia" id="ia-no" value="no" data-i="ia" data-t="' + t.id + '"' + (b.uso === 'no' ? ' checked' : '') + '> No usé inteligencia artificial</label><label class="check"><input type="radio" name="ia" id="ia-si" value="si" data-i="ia" data-t="' + t.id + '"' + (b.uso === 'si' ? ' checked' : '') + '> Usé inteligencia artificial</label><div id="ia-det-caja"' + (b.uso === 'si' ? '' : ' hidden') + '><label for="ia-detalle">¿Qué herramienta y para qué?</label><input type="text" id="ia-detalle" data-i="iadet" data-t="' + t.id + '" value="' + esc(b.detalle) + '"></div></section>';
    h += '<section class="card"><h2>Comprobaciones</h2><div id="comp-resena"></div><button class="btn" id="confirmar" data-a="confirmar" data-t="' + t.id + '">Confirmar entrega</button><p class="vacio" id="porque"></p></section>';
    return h;
  };
  function refrescaResena(tId) {
    var t = tarea(tId), b = S.borradores[S.usuario + ':' + tId]; if (!b) return;
    var na = cuantosArchivos(tId), ch = R.comprobarResena({ texto: b.texto, entregadaMs: ahora(), ia: { uso: b.uso, detalle: b.detalle }, archivos: na }, t.limite), n = R.contarPalabras(b.texto);
    refrescaArchivos(tId);
    var c = document.getElementById('cont-resena'); if (c) { c.textContent = n + ' palabras · se piden de 600 a 800'; c.className = 'contador ' + (n >= 600 && n <= 800 ? 'ok' : 'no'); }
    var k = document.getElementById('comp-resena'); if (k) k.innerHTML = htmlComprobaciones(ch);
    var vacia = n === 0 && na === 0, bloquea = ch.some(function (x) { return x.bloquea; }) || vacia, bt = document.getElementById('confirmar'), pq = document.getElementById('porque');
    if (bt) bt.disabled = bloquea;
    if (pq) pq.textContent = vacia ? 'Escribe tu reseña o adjunta un archivo para poder entregar.' : bloquea ? 'Completa la declaración de inteligencia artificial para poder entregar.' : (ch.some(function (x) { return !x.ok; }) ? 'Puedes entregar así, pero revisa los avisos marcados con «!».' : '');
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
    h += '<section class="card"><h2>Tema</h2><p>' + esc(f.tema) + '</p></section>';
    if (!ab) h += '<p class="nota-info">' + (ahora() < d.abre ? 'Este foro todavía no abre.' : 'Este foro está cerrado y ya no acepta mensajes.') + '</p>';
    if (ab && !prof && !mio) {
      h += '<section class="card"><label for="texto-aporte"><h2>Tu aporte</h2></label><textarea id="texto-aporte" rows="10" data-i="aporte" data-min="' + (f.conNota ? 400 : 0) + '"></textarea><div class="contador" id="cont-aporte"></div>' + (CONF.modoPrueba ? '<button class="enlace" data-a="rellenarForo" data-id="texto-aporte" data-n="410">Rellenar con texto de ejemplo (solo para probar)</button>' : '') + '';
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
        h += '<label for="' + id + '">Tu respuesta' + (f.conNota ? ' (mínimo 150 palabras)' : '') + '</label><textarea id="' + id + '" rows="6" data-i="resp" data-c="cont-' + a.id + '" data-min="' + (f.conNota ? 150 : 0) + '"></textarea><div class="contador" id="cont-' + a.id + '"></div>' + (CONF.modoPrueba ? '<button class="enlace" data-a="rellenarForo" data-id="' + id + '" data-n="160">Rellenar con texto de ejemplo (solo para probar)</button>' : '') + '<button class="btn sec" data-a="responder" data-f="' + f.id + '" data-m="' + a.id + '">Publicar respuesta</button></details>';
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
      } else if (x.e) h += htmlArchivos(archivosDe(x.e.id), false) + '<p>Entregada: ' + fecha(x.e.entregadaMs) + (x.a.dias ? '<br><span class="aviso">' + x.a.dias + ' día(s) de atraso: se restarán ' + x.a.descuento + ' puntos.</span>' : '') + '</p>';
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

  /* Portada del aula: el curso presentado como un expediente que se abre (1870-2026). */
  var portadaVista = false;
  function portada() {
    var cinta = '', i;
    for (i = 0; i < 6; i++) cinta += '<span>Mira</span><i>✕</i><span>Lee</span><i>✕</i><span>Escribe</span><i>✕</i><span>Conversa</span><i>✕</i>';
    return '<div class="tapa">' +
      '<header class="tapa-b"><span>Expediente n.º 1870–2026</span><span class="tapa-b2">Aula · Danilo Carrillo</span><a href="#acceso">Entrar ↓</a></header>' +
      '<div class="tapa-g"><section class="tapa-h" aria-label="Presentación del curso">' +
      '<div class="tapa-barras" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<h1 class="tapa-t">Teología del liderazgo <span>en la <mark>misión</mark></span></h1>' +
      '<p class="tapa-s">Estudio de casos. 156 años de mando, 12 semanas para examinarlos.</p>' +
      '<p class="tapa-ano" aria-label="De 1870 a 2026"><span id="ano">' + (portadaVista ? 2026 : 1870) + '</span></p>' +
      '</section>';
  }
  function portadaPie() {
    var cinta = '', i;
    for (i = 0; i < 6; i++) cinta += '<span>Mira</span><i>✕</i><span>Lee</span><i>✕</i><span>Escribe</span><i>✕</i><span>Conversa</span><i>✕</i>';
    var pasos = [
      ['Mira el caso', 'Cada semana abre con su caso en video.'],
      ['Lee', 'La lectura de la semana, que marcas al terminarla.'],
      ['Escribe', 'Una reseña de 600 a 800 palabras: la escribes en el aula o la subes como documento o foto.'],
      ['Conversa', 'En las semanas con foro, publicas tu aporte y respondes a dos compañeros.']
    ].map(function (p, i) { return '<li><span class="tapa-n">0' + (i + 1) + '</span><h3>' + p[0] + '</h3><p>' + p[1] + '</p></li>'; }).join('');
    return '</div>' +
      '<div class="tapa-cinta" aria-hidden="true"><div>' + cinta + '</div></div>' +
      '<section class="tapa-ruta" id="ruta"><p class="tapa-k">La ruta de cada semana</p><h2>Cuatro pasos. Siempre en el mismo orden.</h2><ol>' + pasos + '</ol>' +
      '<p class="tapa-dato"><b>12</b> semanas <b>10</b> reseñas <b>4</b> foros</p></section>' +
      '<footer class="tapa-pie"><span>Aula del curso · Danilo Carrillo, teólogo y autor</span><a href="https://www.danilocarrillo.com/inicio">danilocarrillo.com</a></footer></div>';
  }
  /* El año corre de 1870 a 2026 la primera vez que se ve la portada. */
  function animarPortada() {
    var el = document.getElementById('ano');
    if (!el || portadaVista) return;
    portadaVista = true;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = 2026; return; }
    var t0 = null, dur = 2600;
    function paso(t) {
      if (!el.isConnected) return;
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(1870 + 156 * e);
      if (k < 1) requestAnimationFrame(paso);
    }
    setTimeout(function () { requestAnimationFrame(paso); }, 500);
  }
  V.entrada = function (p) {
    var crear = p.modo === 'crear';
    var h = portada() + '<section class="card entrada" id="acceso"><div class="eyebrow">' + (crear ? 'Primera vez' : 'Acceso al aula') + '</div><h2 class="entrada-t">' + (crear ? 'Crear tu cuenta' : 'Entrar') + '</h2><p>' + (crear ? 'Después de crearla, el profesor la activa y ya podrás entrar al curso.' : 'Escribe tu correo y tu contraseña.') + '</p>';
    if (crear) h += '<label for="nombre">Nombre y apellido</label><input type="text" id="nombre" autocomplete="name" value="' + esc(p.nombre || '') + '">';
    h += '<label for="correo">Correo</label><input type="text" id="correo" inputmode="email" autocomplete="username" value="' + esc(p.correo || '') + '"><label for="clave">Contraseña' + (crear ? ' <small>(al menos 8 caracteres)</small>' : '') + '</label><input type="password" id="clave" autocomplete="' + (crear ? 'new-password' : 'current-password') + '">';
    h += '<button class="btn" data-a="' + (crear ? 'registrar' : 'entrar') + '" type="button">' + (crear ? 'Crear cuenta' : 'Entrar') + '</button>';
    h += '<button class="enlace" data-a="modoEntrada" data-m="' + (crear ? 'entrar' : 'crear') + '" type="button">' + (crear ? 'Ya tengo cuenta: entrar' : 'No tengo cuenta: crear una') + '</button>';
    if (!crear) h += '<button class="enlace" data-a="olvide" type="button">Olvidé mi contraseña</button>' + (p.olvide ? '<p class="nota-info">Escríbele al profesor para que te ayude a recuperarla. La recuperación por correo llega en la Fase 2.</p>' : '');
    return h + '</section>' + portadaPie();
  };
  V.espera = function () {
    var p = S.perfil, baja = p.estado === 'baja';
    return '<section class="card entrada"><div class="eyebrow">Aula del curso</div><h1>' + (baja ? 'Cuenta dada de baja' : 'Tu cuenta está creada') + '</h1><p>' + (baja ? 'Esta cuenta ya no tiene acceso al curso. Si crees que es un error, escríbele al profesor.' : 'Hola, ' + esc(p.nombre) + '. Falta un paso: el profesor debe activar tu cuenta. Cuando lo haga, entrarás al curso con este mismo correo y contraseña.') + '</p>' + (baja ? '' : '<button class="btn" data-a="recargar" type="button">Comprobar de nuevo</button>') + '<button class="enlace" data-a="salir" type="button">Salir</button></section>';
  };
  /* Solo el administrador acepta alumnos, da de baja y nombra profesores. */
  var ACCIONES = {
    activar:  { t: 'Aceptar en el curso',            fila: { estado: 'activo' },                          ok: 'Cuenta aceptada. Ya puede entrar al curso.',          q: function (n) { return '¿Aceptar a ' + n + ' en el curso?'; }, directo: true },
    baja:     { t: 'Dar de baja',                    fila: { estado: 'baja' },                            ok: 'Cuenta dada de baja.',                                q: function (n) { return '¿Dar de baja a ' + n + '? Dejará de ver el curso. Sus entregas se conservan.'; } },
    profesor: { t: 'Nombrar profesor',               fila: { rol: 'profesor', estado: 'activo' },         ok: 'Ahora es profesor: puede calificar y editar el contenido.', q: function (n) { return '¿Nombrar profesor a ' + n + '? Podrá ver todas las entregas, calificar y editar el contenido. No podrá aceptar alumnos ni nombrar profesores.'; } },
    admin:    { t: 'Dar permiso de administrador',   fila: { rol: 'administrador', estado: 'activo' },    ok: 'Ahora es administrador: puede aceptar alumnos y nombrar profesores.', q: function (n) { return '¿Dar permiso de administrador a ' + n + '? Tendrá el mismo control que tú: aceptar alumnos, dar de baja y nombrar profesores.'; } },
    quitarAdmin: { t: 'Quitar permiso de administrador', fila: { rol: 'profesor' },                       ok: 'Ya no es administrador. Sigue siendo profesor.',      q: function (n) { return '¿Quitar el permiso de administrador a ' + n + '? Seguirá siendo profesor.'; } },
    estudiante: { t: 'Volver a estudiante',          fila: { rol: 'estudiante' },                         ok: 'Volvió a ser estudiante.',                            q: function (n) { return '¿Quitar el rol de profesor a ' + n + '? Dejará de ver las entregas de los demás.'; } }
  };
  V.estudiantes = function (p) {
    var soyAdmin = yo().admin, orden = { pendiente: 0, activo: 1, baja: 2 };
    var h = '<h1>Personas del curso</h1><p>' + (soyAdmin ? 'Las cuentas nuevas llegan como «pendiente» y no ven nada hasta que las aceptes. Solo un administrador puede aceptar alumnos y nombrar profesores.' : 'Solo el administrador puede aceptar alumnos, dar de baja y nombrar profesores. Aquí puedes ver quién está en el curso.') + '</p>';
    S.usuarios.slice().sort(function (a, b) { return orden[a.estado] - orden[b.estado] || a.nombre.localeCompare(b.nombre); }).forEach(function (x) {
      var et = { pendiente: ['p-atrasada', 'Pendiente'], activo: ['p-calificada', 'Activa'], baja: ['p-vencida', 'De baja'] }[x.estado], yoMismo = x.id === S.usuario;
      h += '<section class="card"><div class="fila"><div><strong>' + esc(x.nombre) + '</strong>' + (yoMismo ? ' <small>(tú)</small>' : '') + '<br><small>' + rolTexto(x) + '</small></div><span class="pill ' + et[0] + '">' + et[1] + '</span></div>';
      if (soyAdmin && !yoMismo) {
        var acc = x.estado !== 'activo' ? ['activar'] : x.admin ? ['quitarAdmin', 'baja'] : x.rol === 'profesor' ? ['admin', 'estudiante', 'baja'] : ['profesor', 'baja'];
        if (p.conf && p.conf.id === x.id) {
          var a = ACCIONES[p.conf.acc];
          h += '<p>' + esc(a.q(x.nombre)) + '</p><div class="botones"><button class="btn" data-a="aplicarPersona" data-id="' + x.id + '" data-acc="' + p.conf.acc + '">Sí, ' + a.t.toLowerCase() + '</button><button class="btn sec" data-a="ir" data-n="estudiantes">No</button></div>';
        } else h += '<div class="botones">' + acc.map(function (k, n) { return '<button class="btn' + (n ? ' sec' : '') + '" data-a="' + (ACCIONES[k].directo ? 'aplicarPersona' : 'pedirPersona') + '" data-id="' + x.id + '" data-acc="' + k + '">' + ACCIONES[k].t + '</button>'; }).join('') + '</div>';
      }
      h += '</section>';
    });
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
    var pendientes = S.usuarios.filter(function (x) { return x.estado === 'pendiente'; }).length;
    if (yo().admin && pendientes) h += '<section class="card destacada"><h2>' + pendientes + (pendientes === 1 ? ' persona espera' : ' personas esperan') + ' que la aceptes</h2><button class="btn" data-a="ir" data-n="estudiantes">Ver personas</button></section>';
    h += '<section class="card"><h2>Próximas fechas</h2><div class="fila"><div><strong>Semana ' + n + '</strong> cierra</div><div>' + fecha(d.cierra) + '</div></div>' + (f ? '<div class="fila"><div><strong>' + f.titulo + '</strong>: vence el aporte</div><div>' + fecha(fechasForo(f).aporte) + '</div></div>' : '') + '</section>';
    return h;
  };
  V.entregas = function () {
    var h = '<h1>Entregas</h1>', l = S.entregas.slice().sort(function (a, b) { return a.entregadaMs - b.entregadaMs; });
    if (!l.length) h += '<p class="vacio">Todavía no hay entregas.</p>';
    l.forEach(function (e) {
      var t = tarea(e.tarea), x = estadoTarea(t, e.est);
      h += '<section class="card"><div class="fila"><div><strong>' + esc(usuario(e.est).nombre) + '</strong> · ' + t.titulo + '<br><small>Entregada: ' + fechaCorta(e.entregadaMs) + ' · ' + R.contarPalabras(e.texto) + ' palabras' + (archivosDe(e.id).length ? ' · ' + archivosDe(e.id).length + ' archivo(s)' : '') + '</small></div>' + pastilla(x.k) + '</div><button class="btn sec" data-a="ir" data-n="calificar" data-e="' + e.id + '">' + (x.k === 'calificada' ? 'Ver o corregir la nota (' + num(x.nota) + ')' : 'Calificar') + '</button></section>';
    });
    return h;
  };
  V.calificar = function (p) {
    var e = S.entregas.filter(function (x) { return x.id === p.e; })[0], t = tarea(e.tarea), n = notaDe(e.id) || { puntos: {}, comentario: '' }, a = R.atraso(e.entregadaMs, t.limite, e.prorroga);
    var arch = archivosDe(e.id), ch = R.comprobarResena(Object.assign({}, e, { archivos: arch.length }), t.limite);
    var h = '<button class="volver" data-a="ir" data-n="entregas">← Entregas</button><h1>' + t.titulo + ' · ' + esc(usuario(e.est).nombre) + '</h1><div class="lado">';
    h += '<section class="card"><h2>La entrega</h2><p><small>Entregada: ' + fechaCorta(e.entregadaMs) + ' · Declaración de IA: ' + (e.ia.uso === 'si' ? 'Usó. ' + esc(e.ia.detalle) : 'No usó') + '</small></p>' + (e.texto.trim() ? '<div class="entrega-texto">' + esc(e.texto) + '</div>' : '<p class="vacio">Sin texto escrito: la entrega está en los archivos.</p>') + (arch.length ? '<h2>Archivos</h2>' + htmlArchivos(arch, false) + '<div id="vistas-arch" class="vistas-arch"></div>' : '') + '<h2>Comprobaciones automáticas</h2>' + htmlComprobaciones(ch) + '</section>';
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
    profesor: [['panel', 'Panel'], ['semanas', 'El curso'], ['entregas', 'Entregas'], ['registro', 'Foros'], ['libro', 'Notas'], ['contenido', 'Contenido'], ['estudiantes', 'Personas']]
  };
  var PADRE = { semana: 'semanas', entregar: 'tareas', foro: 'foros', calificar: 'entregas' };
  function aviso(texto, mal) {
    var el = document.getElementById('aviso');
    el.innerHTML = texto ? '<p class="' + (mal ? 'error' : 'exito') + '" role="' + (mal ? 'alert' : 'status') + '">' + esc(texto) + '</p>' : '';
    if (texto && mal) el.scrollIntoView({ block: 'nearest' });
  }
  function pintar(msg) {
    var ses = document.getElementById('sesion'), nav = document.querySelector('nav.menu'), v = S.vista;
    aviso(msg || '');
    document.body.classList.toggle('portada', !S.usuario);
    if (!S.usuario) { ses.innerHTML = ''; nav.hidden = true; if (v.n !== 'entrada') v = S.vista = { n: 'entrada' }; document.getElementById('vista').innerHTML = V.entrada(v); animarPortada(); return; }
    if (S.perfil.estado !== 'activo') { ses.innerHTML = ''; nav.hidden = true; S.vista = { n: 'espera' }; document.getElementById('vista').innerHTML = V.espera(); return; }
    var u = yo();
    if (!V[v.n] || v.n === 'entrada' || v.n === 'espera' || MENU[u.rol].every(function (m) { return m[0] !== (PADRE[v.n] || v.n); })) v = S.vista = { n: u.rol === 'profesor' ? 'panel' : 'inicio' };
    var activo = PADRE[v.n] || v.n;
    nav.hidden = false;
    ses.innerHTML = '<span><strong>' + esc(u.nombre) + '</strong><br>' + rolTexto(u) + '</span><button class="btn sec chico" data-a="salir" type="button">Salir</button>';
    document.getElementById('menu').innerHTML = MENU[u.rol].map(function (m) { return '<button data-a="ir" data-n="' + m[0] + '"' + (m[0] === activo ? ' aria-current="page"' : '') + '>' + m[1] + '</button>'; }).join('');
    document.getElementById('vista').innerHTML = V[v.n](v);
    if (v.n === 'entregar') refrescaResena(v.t);
    if (v.n === 'calificar') { refrescaTotal(); vistasPrevias(v.e); }
    Array.prototype.forEach.call(document.querySelectorAll('textarea[data-i="aporte"],textarea[data-i="resp"]'), cuenta);
  }
  function ir(n, extra, msg) { S.vista = Object.assign({ n: n }, extra || {}); pintar(msg); window.scrollTo(0, 0); }
  function cuenta(el) {
    var c = document.getElementById(el.dataset.c || 'cont-aporte'), min = +el.dataset.min, n = R.contarPalabras(el.value);
    if (c) { c.textContent = n + ' palabras' + (min ? ' · mínimo ' + min : ''); c.className = 'contador ' + (n >= min ? 'ok' : 'no'); }
  }
  function leeLista(pref) { var o = {}; C.partes.forEach(function (p) { var e = document.getElementById(pref + '-' + p.k); o[p.k] = !!(e && e.checked); }); return o; }
  function guardaBorradores() { try { localStorage.setItem('aula-borradores', JSON.stringify(S.borradores)); } catch (e) {} }
  try { S.borradores = JSON.parse(localStorage.getItem('aula-borradores') || '{}') || {}; } catch (e) { S.borradores = {}; }

  /* Hace un cambio en la base de datos, vuelve a leer y pinta. Si falla, avisa y no borra lo escrito. */
  var ocupado = false;
  function hacer(trabajo, despues) {
    if (ocupado) return; ocupado = true; document.body.classList.add('ocupado');
    Promise.resolve().then(trabajo).then(function (r) { return cargar().then(function () { return r; }); })
      .then(function (r) { ocupado = false; document.body.classList.remove('ocupado'); despues(r); })
      .catch(function (e) { ocupado = false; document.body.classList.remove('ocupado'); aviso(traducir(e), true); });
  }
  function abiertos() { return Array.prototype.map.call(document.querySelectorAll('#vista details[open]'), function (x) { return x.id; }); }
  function reabrir(ids) { Array.prototype.forEach.call(document.querySelectorAll('#vista details'), function (x) { x.open = ids.indexOf(x.id) >= 0; }); }

  var A = {
    ir: function (d) { var x = {}; if (d.s) x.s = +d.s; if (d.t) x.t = d.t; if (d.f) x.f = d.f; if (d.e) x.e = d.e; ir(d.n, x); },
    modoEntrada: function (d) { S.vista = { n: 'entrada', modo: d.m, correo: document.getElementById('correo').value }; pintar(); },
    olvide: function () { S.vista = { n: 'entrada', olvide: true, correo: document.getElementById('correo').value }; pintar(); },
    entrar: function () {
      var c = document.getElementById('correo').value.trim().toLowerCase(), k = document.getElementById('clave').value;
      if (!c || !k) return aviso('Escribe tu correo y tu contraseña.', true);
      hacer(function () { return pedir(sb.auth.signInWithPassword({ email: c, password: k })); }, function () { ir(S.perfil && S.perfil.estado === 'activo' ? (yo().rol === 'profesor' ? 'panel' : 'inicio') : 'espera'); });
    },
    registrar: function () {
      var n = document.getElementById('nombre').value.trim(), c = document.getElementById('correo').value.trim().toLowerCase(), k = document.getElementById('clave').value;
      if (n.length < 3) return aviso('Escribe tu nombre y apellido.', true);
      if (k.length < 8) return aviso('La contraseña es muy corta. Usa al menos 8 caracteres.', true);
      hacer(function () { return pedir(sb.auth.signUp({ email: c, password: k, options: { data: { nombre: n } } })); }, function () { ir('espera'); });
    },
    salir: function () { hacer(function () { return sb.auth.signOut(); }, function () { S.usuario = null; S.perfil = null; ir('entrada', {}, 'Saliste del aula.'); }); },
    recargar: function () { hacer(function () {}, function () { pintar(S.perfil && S.perfil.estado === 'activo' ? 'Tu cuenta ya está activa. Bienvenido.' : 'Todavía no está activa.'); }); },
    visto: function (d, el) {
      var clave = d.k.split(':').slice(1).join(':'), ab = abiertos(), y = window.scrollY;
      hacer(function () { return el.checked ? pedir(sb.from('marcas').upsert({ clave: clave }, { onConflict: 'estudiante,clave', ignoreDuplicates: true })) : pedir(sb.from('marcas').delete().eq('estudiante', S.usuario).eq('clave', clave)); },
        function () { pintar(); reabrir(ab); window.scrollTo(0, y); });
    },
    rellenar: function (d) { var b = S.borradores[S.usuario + ':' + d.t]; b.texto = relleno(650, true); document.getElementById('texto-resena').value = b.texto; guardaBorradores(); refrescaResena(d.t); },
    rellenarForo: function (d) { var el = document.getElementById(d.id); el.value = relleno(+d.n); cuenta(el); },
    confirmar: function (d) {
      var b = S.borradores[S.usuario + ':' + d.t], e = entregaDe(d.t, S.usuario), fila = { texto: b.texto, ia_uso: b.uso, ia_detalle: b.uso === 'si' ? b.detalle : '' }, pend = PEND[d.t] || [];
      hacer(function () {
        return (e ? pedir(sb.from('entregas').update(fila).eq('id', e.id).select()) : pedir(sb.from('entregas').insert(Object.assign({ tarea: d.t }, fila)).select())).then(function (filas) {
          var id = filas[0].id, cadena = Promise.resolve();
          pend.slice().forEach(function (f, i) {
            cadena = cadena.then(function () { return preparar(f); }).then(function (x) {
              if (x.blob.size > MAX_PESO) throw new Error('«' + f.name + '» pesa más de 10 MB. Redúcelo e inténtalo de nuevo.');
              var ruta = S.usuario + '/' + d.t + '/' + Date.now() + '-' + i + '-' + nombreLimpio(x.nombre);
              return pedir(sb.storage.from('entregas').upload(ruta, x.blob, { contentType: x.tipo, upsert: false })).then(function () {
                return pedir(sb.from('archivos').insert({ entrega: id, ruta: ruta, nombre: x.nombre, tipo: x.tipo, tamano: x.blob.size }));
              }).then(function () { PEND[d.t].splice(PEND[d.t].indexOf(f), 1); });
            });
          });
          return cadena;
        });
      }, function () {
        delete S.borradores[S.usuario + ':' + d.t]; guardaBorradores();
        var x = estadoTarea(tarea(d.t), S.usuario);
        ir('tareas', {}, 'Entrega recibida.' + (x.a && x.a.dias ? ' Llegó con ' + x.a.dias + ' día(s) de atraso: se restarán ' + x.a.descuento + ' puntos.' : ' Llegó a tiempo.'));
      });
    },
    quitarPend: function (d) { PEND[d.t].splice(+d.i, 1); refrescaResena(d.t); },
    quitarArchivo: function (d) {
      var a = S.archivos.filter(function (x) { return x.id === d.id; })[0], t = S.vista.t;
      hacer(function () { return pedir(sb.storage.from('entregas').remove([a.ruta])).then(function () { return pedir(sb.from('archivos').delete().eq('id', a.id)); }); }, function () { aviso('Archivo quitado.'); refrescaResena(t); });
    },
    abrirArchivo: function (d) {
      var a = S.archivos.filter(function (x) { return x.id === d.id; })[0], w = window.open('about:blank');
      sb.storage.from('entregas').createSignedUrl(a.ruta, 3600).then(function (r) {
        if (r.error) { if (w) w.close(); return aviso(traducir(r.error), true); }
        if (w) w.location = r.data.signedUrl; else window.location.href = r.data.signedUrl;
      });
    },
    publicar: function (d) {
      var f = S.foros.filter(function (x) { return x.id === d.f; })[0], t = document.getElementById('texto-aporte').value, lista = f.conNota ? leeLista('auto') : null;
      if (!R.contarPalabras(t)) return aviso('Escribe tu aporte antes de publicar.', true);
      hacer(function () {
        return pedir(sb.from('mensajes').insert({ foro: d.f, texto: t }).select().single()).then(function (m) { return lista ? pedir(sb.from('valoraciones').insert({ mensaje: m.id, lista: lista })) : null; });
      }, function () {
        var tarde = f.conNota && ahora() > fechasForo(f).aporte, corto = f.conNota && R.contarPalabras(t) < 400;
        pintar('Aporte publicado.' + (corto ? ' Tiene menos de 400 palabras: así no recibe crédito.' : tarde ? ' Llegó después del jueves: recibe la mitad del crédito.' : f.conNota ? ' Ahora responde a dos compañeros.' : ''));
      });
    },
    responder: function (d) {
      var f = S.foros.filter(function (x) { return x.id === d.f; })[0], t = document.getElementById('resp-' + d.m).value, lista = f.conNota && yo().rol === 'estudiante' ? leeLista('val-' + d.m) : null;
      if (!R.contarPalabras(t)) return aviso('Escribe tu respuesta antes de publicar.', true);
      hacer(function () {
        return pedir(sb.from('mensajes').insert({ foro: d.f, texto: t, responde: d.m }).select().single()).then(function (m) { return lista ? pedir(sb.from('valoraciones').insert({ mensaje: m.id, lista: lista })) : null; });
      }, function () { pintar('Respuesta publicada.' + (f.conNota && R.contarPalabras(t) < 150 ? ' Tiene menos de 150 palabras: así no cuenta como respuesta válida.' : '')); });
    },
    prorroga: function (d, el) {
      var pts = {}, com = document.getElementById('comentario').value, v = el.checked;
      C.rubricaResena.forEach(function (c) { pts[c.k] = document.getElementById('pt-' + c.k).value; });
      hacer(function () { return pedir(sb.from('entregas').update({ prorroga: v }).eq('id', d.e).select()); }, function () {
        pintar(v ? 'Prórroga concedida: no se descuenta el atraso.' : 'Prórroga retirada.');
        C.rubricaResena.forEach(function (c) { document.getElementById('pt-' + c.k).value = pts[c.k]; }); document.getElementById('comentario').value = com; refrescaTotal();
      });
    },
    publicarNota: function (d) {
      refrescaTotal();
      var tot = document.getElementById('total-rub');
      if (tot.dataset.fuera === '1') return;
      var pts = {}, falta = false, e = S.entregas.filter(function (x) { return x.id === d.e; })[0];
      C.rubricaResena.forEach(function (c) { var v = document.getElementById('pt-' + c.k).value; if (v === '') falta = true; pts[c.k] = +v || 0; });
      if (falta) return aviso('Pon puntos en todos los criterios antes de publicar.', true);
      var a = R.atraso(e.entregadaMs, tarea(e.tarea).limite, e.prorroga), total = totalRubrica(pts);
      hacer(function () { return pedir(sb.from('calificaciones').upsert({ entrega: d.e, puntos: pts, total: total, descuento: a.cero ? total : a.descuento, nota: R.notaConAtraso(total, a), comentario: document.getElementById('comentario').value, publicada: true }).select()); },
        function () { ir('entregas', {}, 'Nota publicada. Ya está en el libro de notas y el estudiante la puede ver.'); });
    },
    selForo: function (d, el) { ir('registro', { f: el.value }); },
    publicarForo: function (d) { hacer(function () { return pedir(sb.from('notas_foro').upsert(filaForo(d.f, d.est)).select()); }, function () { pintar('Nota del foro publicada.'); }); },
    publicarForoTodas: function (d) { var filas = estudiantes().map(function (e) { return filaForo(d.f, e.id); }); hacer(function () { return pedir(sb.from('notas_foro').upsert(filas).select()); }, function () { pintar('Notas del foro publicadas para todos.'); }); },
    guardarSemana: function (d) {
      var w = S.semanas[d.s - 1], fila = { titulo: document.getElementById('c-titulo').value, lectura: document.getElementById('c-lectura').value, instrucciones: document.getElementById('c-instr').value };
      var vids = w.videos.map(function (v, j) { return { id: v.id, titulo: document.getElementById('c-vt-' + j).value, url: document.getElementById('c-vu-' + j).value }; });
      hacer(function () {
        return pedir(sb.from('semanas').update(fila).eq('n', w.n).select()).then(function () { return Promise.all(vids.map(function (v) { return pedir(sb.from('videos').update({ titulo: v.titulo, url: v.url }).eq('id', v.id).select()); })); });
      }, function () { ir('contenido', {}, 'Semana ' + w.n + ' guardada. Los estudiantes ya ven el cambio.'); });
    },
    pedirPersona: function (d) { S.vista = { n: 'estudiantes', conf: { id: d.id, acc: d.acc } }; pintar(); },
    aplicarPersona: function (d) {
      var a = ACCIONES[d.acc];
      hacer(function () { return pedir(sb.from('perfiles').update(a.fila).eq('id', d.id).select()).then(function (f) { if (!f.length) throw new Error('No tienes permiso para hacer eso.'); }); }, function () { ir('estudiantes', {}, a.ok); });
    }
  };
  /* En la pantalla de calificar, las fotos se muestran a la vista, sin tener que abrirlas una por una. */
  function vistasPrevias(enId) {
    var caja = document.getElementById('vistas-arch'), fotos = archivosDe(enId).filter(esImagen); if (!caja || !fotos.length) return;
    sb.storage.from('entregas').createSignedUrls(fotos.map(function (a) { return a.ruta; }), 3600).then(function (r) {
      if (r.error || !document.getElementById('vistas-arch')) return;
      caja.innerHTML = r.data.filter(function (x) { return x.signedUrl; }).map(function (x, i) { return '<img src="' + esc(x.signedUrl) + '" alt="Página ' + (i + 1) + ' de la entrega: ' + esc(fotos[i].nombre) + '" loading="lazy">'; }).join('');
    });
  }
  function filaForo(fid, est) { var el = document.getElementById('nf-' + est); return { foro: fid, estudiante: est, nota: Math.max(0, Math.min(100, +el.value || 0)), publicada: true }; }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-a]'); if (!el || el.tagName === 'SELECT') return;
    if (el.tagName === 'INPUT' && el.type !== 'checkbox') return;
    if (A[el.dataset.a]) A[el.dataset.a](el.dataset, el);
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.id === 'elige-arch') {
      var t = el.dataset.t, lista = PEND[t] = PEND[t] || [], malos = [];
      Array.prototype.forEach.call(el.files, function (f) {
        if (!admitido(f)) malos.push('«' + f.name + '» no es PDF, Word ni imagen');
        else if (!/^image\//.test(f.type) && f.size > MAX_PESO) malos.push('«' + f.name + '» pesa más de 10 MB');
        else if (cuantosArchivos(t) >= MAX_ARCH) malos.push('solo caben ' + MAX_ARCH + ' archivos por entrega');
        else lista.push(f);
      });
      el.value = ''; aviso(malos.length ? 'No se agregó: ' + malos.filter(function (x, i) { return malos.indexOf(x) === i; }).join('; ') + '.' : '', malos.length > 0); refrescaResena(t); return;
    }
    if (el.tagName === 'SELECT' && el.dataset.a && A[el.dataset.a]) A[el.dataset.a](el.dataset, el);
  });
  document.addEventListener('input', function (ev) {
    var el = ev.target, i = el.dataset.i; if (!i) return;
    var b = el.dataset.t ? S.borradores[S.usuario + ':' + el.dataset.t] : null;
    if (i === 'resena') { b.texto = el.value; guardaBorradores(); refrescaResena(el.dataset.t); }
    else if (i === 'ia') { b.uso = el.value; document.getElementById('ia-det-caja').hidden = el.value !== 'si'; guardaBorradores(); refrescaResena(el.dataset.t); }
    else if (i === 'iadet') { b.detalle = el.value; guardaBorradores(); refrescaResena(el.dataset.t); }
    else if (i === 'aporte' || i === 'resp') cuenta(el);
    else if (i === 'pt') refrescaTotal();
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && (ev.target.id === 'correo' || ev.target.id === 'clave')) { var b = document.querySelector('.entrada .btn'); if (b) b.click(); } });

  cargar().then(function () { pintar(); }).catch(function (e) { pintar(); aviso(traducir(e), true); });
})();
