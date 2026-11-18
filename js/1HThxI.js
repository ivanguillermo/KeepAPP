/**
 * 1HThxI · Plan de estudio con repetición espaciada
 * Sección: #sec-lisa  (botón del menú: data-section="lisa")
 *
 * Cada tema tiene tres momentos:
 *   e  = estudio del día (1 h, lectura + 5 preguntas)
 *   r1 = repaso de noche (30 min, preguntas: recuerdo libre + Leitner o Kim's game)
 *   r2 = repaso rápido (10 min, recuerdo libre + tarjetas falladas)
 *
 * Datos: hoja "estudio" del Sheet, vía estudio.gs (acciones estudioLeer,
 * estudioMarcar, estudioGuardarPlan). Las fechas viajan como texto AAAA-MM-DD.
 */
window.KeepModule('1HThxI', () => {
  const sec = document.getElementById('sec-lisa');
  if (!sec) throw new Error('No existe #sec-lisa en el index');

  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const PASOS = ['e', 'r1', 'r2'];
  const INFO = {
    e:  { fecha: 'fecha_e',  ok: 'ok_e',  titulo: 'Estudio del día', tiempo: '1 h',
          etiqueta: 'Estudio',
          guia: 'Lee unos 50 min y subraya. Al final escribe 5 preguntas del tema.' },
    r1: { fecha: 'fecha_r1', ok: 'ok_r1', titulo: 'Repaso de noche', tiempo: '30 min',
          etiqueta: '30 min',
          guia: '5 min de recuerdo libre sin mirar, 20 min de tarjetas (Leitner o Kim’s game si hay muchos elementos) y 5 min para corregir lo fallado.' },
    r2: { fecha: 'fecha_r2', ok: 'ok_r2', titulo: 'Repaso rápido', tiempo: '10 min',
          etiqueta: '10 min',
          guia: '5 min de recuerdo libre y 5 min solo con las tarjetas que fallaste.' }
  };

  const TEMAS_INICIALES = [
    'Ciclo de Krebs',
    'Gobierno de Guzmán Blanco',
    'Cómo funciona el DNS',
    'Cómo viaja un dato por internet (TCP/IP y routing)',
    'Teoría del color',
    'Replicación del ADN y síntesis de proteínas',
    'Los 3 actos aristotélicos',
    'Motor de combustión interna',
    'Revolución Francesa',
    'Interés compuesto',
    'Circuitos: ley de Ohm y Kirchhoff',
    'Cómo funciona una batería de litio',
    'El sueño y sus fases',
    'Hormonas y el eje del estrés (cortisol)',
    'El viaje del héroe (Campbell)',
    'Mecánica cuántica básica (dualidad onda-partícula)',
    'Qubits',
    'Civilizaciones prehispánicas (mayas, incas, aztecas)',
    'Probabilidad básica y Bayes',
    'Sesgos cognitivos más comunes',
    'Cómo funciona la memoria',
    'Cómo funciona una vacuna',
    'Revolución Industrial',
    'Cómo funciona un procesador (CPU)',
    'Complejidad de algoritmos (Big O)',
    'Composición y planos en cine',
    'Cómo aprende una red neuronal',
    'Cómo funciona un avión (sustentación)',
    'Teoría musical básica (escalas y acordes)',
    'Teoría de juegos (dilema del prisionero)'
  ];

  /* ---------- Estado ---------- */
  let filas = [];
  let cargando = true;
  let guardando = false;
  let error = '';      // error de carga
  let msg = '';        // error de la última acción
  let formAbierto = false;
  let borrador = null;
  let ultimaCarga = 0;

  /* ---------- Utilidades ---------- */
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const ES_ISO = /^\d{4}-\d{2}-\d{2}$/;
  const aISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const deISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const hoy = () => aISO(new Date());
  const sumar = (s, n) => { const d = deISO(s); d.setDate(d.getDate() + n); return aISO(d); };
  const corta = s => {
    if (!ES_ISO.test(s)) return s;
    const d = deISO(s);
    return d.getDate() + MESES[d.getMonth()];
  };
  const txt = v => (v === null || v === undefined) ? '' : String(v).trim();
  const fechaOk = v => { const s = txt(v).slice(0, 10); return ES_ISO.test(s) ? s : ''; };

  function normalizar(o) {
    return {
      n: Number(o.n),
      tema: txt(o.tema),
      peso: txt(o.peso),
      fecha_e: fechaOk(o.fecha_e),
      fecha_r1: fechaOk(o.fecha_r1),
      fecha_r2: fechaOk(o.fecha_r2),
      ok_e: fechaOk(o.ok_e),
      ok_r1: fechaOk(o.ok_r1),
      ok_r2: fechaOk(o.ok_r2),
      notas: txt(o.notas)
    };
  }

  /* ---------- Backend ---------- */
  async function api(accion, datos) {
    const base = window.KEEP_BACKEND_URL;
    if (!base) throw new Error('No hay conexión con el backend (falta auth.js).');
    let r;
    if (datos) {
      r = await fetch(base, { method: 'POST', body: JSON.stringify(Object.assign({ action: accion }, datos)) });
    } else {
      r = await fetch(base + '?action=' + accion);
    }
    const texto = await r.text();
    let j;
    try { j = JSON.parse(texto); } catch (e) {
      throw new Error('El backend no reconoce "' + accion + '". Revisa que estudio.gs esté pegado y conectado en doGet y doPost.');
    }
    if (j.status && j.status !== 'success' && j.status !== 'ok') throw new Error(j.message || ('Respuesta: ' + j.status));
    return j;
  }

  async function cargar() {
    cargando = true; render();
    try {
      const j = await api('estudioLeer');
      filas = (j.filas || []).map(normalizar).filter(f => f.n > 0).sort((a, b) => a.n - b.n);
      error = '';
    } catch (e) {
      error = e.message;
    }
    cargando = false;
    ultimaCarga = Date.now();
    render();
  }

  async function alternar(n, paso) {
    const f = filas.find(x => x.n === n);
    if (!f || !INFO[paso]) return;
    const k = INFO[paso].ok;
    const antes = f[k];
    const nuevo = antes ? '' : hoy();
    f[k] = nuevo; msg = ''; render();
    try {
      await api('estudioMarcar', { n, paso, valor: nuevo });
    } catch (e) {
      f[k] = antes;
      msg = 'No se pudo guardar el cambio: ' + e.message;
      render();
    }
  }

  async function guardarPlan() {
    if (guardando) return;
    const b = borrador;
    const temas = b.temas.split('\n')
      .map(s => s.replace(/^\s*(\d+[.)]|[-•*])\s+/, '').trim())
      .filter(Boolean);
    const r1 = Number(b.r1), r2 = Number(b.r2);
    if (!temas.length) { msg = 'Escribe al menos un tema.'; render(); return; }
    if (!ES_ISO.test(b.inicio)) { msg = 'Elige la fecha del primer tema.'; render(); return; }
    if (!Number.isInteger(r1) || !Number.isInteger(r2) || r1 < 1 || r2 <= r1) {
      msg = 'Los días de repaso deben ser enteros y el repaso 2 debe ir después del 1.'; render(); return;
    }
    if (b.modo === 'reemplazar' && filas.length &&
        !window.confirm('Esto reemplaza el plan actual y borra lo que ya marcaste. ¿Continuar?')) return;

    const h = hoy();
    const n0 = b.modo === 'agregar' ? Math.max(0, ...filas.map(f => f.n)) + 1 : 1;
    const nuevas = temas.map((tema, i) => {
      const fe = sumar(b.inicio, i), f1 = sumar(fe, r1), f2 = sumar(fe, r2);
      const al = b.alDia;
      return {
        n: n0 + i, tema, peso: '',
        fecha_e: fe, fecha_r1: f1, fecha_r2: f2,
        ok_e: al && fe < h ? fe : '',
        ok_r1: al && f1 < h ? f1 : '',
        ok_r2: al && f2 < h ? f2 : '',
        notas: ''
      };
    });

    guardando = true; msg = ''; render();
    try {
      await api('estudioGuardarPlan', { modo: b.modo, filas: nuevas });
      filas = b.modo === 'agregar' ? filas.concat(nuevas) : nuevas;
      formAbierto = false; borrador = null; error = '';
    } catch (e) {
      msg = 'No se pudo guardar el plan: ' + e.message;
    }
    guardando = false;
    render();
  }

  /* ---------- Cálculos ---------- */
  function racha() {
    const dias = new Set();
    filas.forEach(f => PASOS.forEach(p => { const v = f[INFO[p].ok]; if (v) dias.add(v); }));
    let d = hoy();
    if (!dias.has(d)) d = sumar(d, -1);
    let n = 0;
    while (dias.has(d)) { n++; d = sumar(d, -1); }
    return n;
  }

  function proximaFecha() {
    const h = hoy();
    let min = '';
    filas.forEach(f => PASOS.forEach(p => {
      const pl = f[INFO[p].fecha];
      if (pl && pl > h && !f[INFO[p].ok] && (!min || pl < min)) min = pl;
    }));
    return min;
  }

  function nuevoBorrador(modo) {
    if (modo === 'agregar') {
      const ult = filas.reduce((m, f) => (f.fecha_e > m ? f.fecha_e : m), '');
      return { modo, temas: '', inicio: ult ? sumar(ult, 1) : hoy(), r1: 7, r2: 21, alDia: false };
    }
    return {
      modo: 'reemplazar',
      temas: (filas.length ? filas.map(f => f.tema) : TEMAS_INICIALES).join('\n'),
      inicio: filas.length && filas[0].fecha_e ? filas[0].fecha_e : '2026-11-01',
      r1: 7, r2: 21, alDia: false
    };
  }

  /* ---------- Vistas ---------- */
  function aviso(texto, error) {
    const clase = error ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-pastel-pink/40 border-pink-100 text-gray-600';
    return '<div class="p-4 rounded-2xl border text-sm ' + clase + '">' + esc(texto) + '</div>';
  }
  const banner = () => msg ? '<div class="mb-3">' + aviso(msg, true) + '</div>' : '';

  const BTN_PRIMARIO = 'px-4 py-2 rounded-xl bg-pink-500 text-white text-xs font-semibold shadow-sm hover:bg-pink-600 active:scale-95 transition';
  const BTN_SECUNDARIO = 'px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 active:scale-95 transition';
  const CAMPO = 'mt-1 w-full rounded-xl border border-gray-200 bg-white p-2 text-sm text-gray-800';

  const CHECK = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';

  function tarjeta(t) {
    const { f, p, hecho, plan } = t;
    const atrasado = !hecho && plan < hoy();
    return '<button data-toggle="' + f.n + ':' + p + '" aria-pressed="' + hecho + '" ' +
      'class="w-full flex items-center gap-3 p-3 rounded-2xl border text-left active:scale-[0.99] transition ' +
      (hecho ? 'bg-pink-50 border-pink-200' : 'bg-white border-gray-100') + '">' +
      '<span class="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ' +
      (hecho ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-300') + '">' + (hecho ? CHECK : '') + '</span>' +
      '<span class="flex-1 min-w-0">' +
      '<span class="block text-sm font-medium ' + (hecho ? 'text-gray-400 line-through' : 'text-gray-800') + '">T' + f.n + ' · ' + esc(f.tema || 'Sin nombre') + '</span>' +
      (atrasado ? '<span class="block text-xs text-rose-600">Atrasado desde el ' + corta(plan) + '</span>' : '') +
      '</span></button>';
  }

  function renderHoy() {
    const el = document.getElementById('lisa-hoy');
    if (!el) return;
    if (cargando && !filas.length) { el.innerHTML = aviso('Cargando plan...'); return; }
    if (!filas.length) {
      el.innerHTML = banner() + aviso(error || 'Todavía no hay un plan de estudio.', !!error) +
        '<div class="mt-3"><button data-accion="' + (error ? 'reintentar' : 'ir-plan') + '" class="' + BTN_PRIMARIO + '">' +
        (error ? 'Reintentar' : 'Crear plan') + '</button></div>';
      return;
    }

    const h = hoy();
    const grupos = { e: [], r1: [], r2: [] };
    let hechas = 0, total = 0;
    filas.forEach(f => PASOS.forEach(p => {
      const plan = f[INFO[p].fecha], ok = f[INFO[p].ok];
      if (ok === h) { grupos[p].push({ f, p, hecho: true }); hechas++; total++; }
      else if (!ok && plan && plan <= h) { grupos[p].push({ f, p, hecho: false, plan }); total++; }
    }));

    const rc = racha();
    const prox = proximaFecha();
    const pie = total
      ? (hechas === total ? '<p class="mt-2 text-xs font-medium text-pink-600">Día completo.</p>' : '')
      : '<p class="mt-1 text-xs text-gray-500">' + (prox ? 'Próxima tarea: ' + corta(prox) + '.' : 'El plan está completo.') + '</p>';

    const cabecera =
      '<div class="p-4 rounded-2xl bg-white border border-pink-100">' +
      '<div class="flex items-baseline justify-between gap-2">' +
      '<p class="text-sm font-semibold text-gray-800">' + (total ? 'Hoy: ' + hechas + ' de ' + total : 'Hoy no hay nada programado') + '</p>' +
      '<p class="text-xs text-gray-500">' + (rc ? 'Racha: ' + rc + (rc === 1 ? ' día' : ' días') : 'Sin racha todavía') + '</p></div>' +
      (total ? '<div class="mt-2 h-2 rounded-full bg-pink-100 overflow-hidden"><div class="h-full bg-pink-500 transition-all" style="width:' + Math.round(hechas * 100 / total) + '%"></div></div>' : '') +
      pie + '</div>';

    const bloques = PASOS.map(p => {
      const lista = grupos[p];
      if (!lista.length) return '';
      return '<div class="space-y-2"><div>' +
        '<h3 class="text-sm font-semibold text-gray-800">' + INFO[p].titulo + ' · ' + INFO[p].tiempo + '</h3>' +
        '<p class="text-xs text-gray-500">' + INFO[p].guia + '</p></div>' +
        lista.map(tarjeta).join('') + '</div>';
    }).join('');

    el.innerHTML = banner() + '<div class="space-y-4">' + cabecera + bloques + '</div>';
  }

  function chip(f, p) {
    const plan = f[INFO[p].fecha], ok = f[INFO[p].ok];
    let cls = 'bg-gray-100 text-gray-500';
    let t = plan ? corta(plan) : '—';
    if (ok) { cls = 'bg-emerald-100 text-emerald-700'; t = '✓ ' + corta(ok); }
    else if (plan && plan < hoy()) cls = 'bg-rose-100 text-rose-700';
    else if (plan === hoy()) cls = 'bg-pink-100 text-pink-700';
    return '<span class="text-[11px] px-2 py-0.5 rounded-full ' + cls + '">' + INFO[p].etiqueta + ' ' + t + '</span>';
  }

  function formulario() {
    const b = borrador;
    const hay = filas.length > 0;
    const titulo = !hay ? 'Crear el plan de estudio'
      : (b.modo === 'agregar' ? 'Agregar temas al final' : 'Reemplazar el plan');
    return '<div class="p-4 rounded-2xl bg-pastel-pink/40 border border-pink-100 space-y-3">' +
      '<h3 class="text-sm font-semibold text-gray-800">' + titulo + '</h3>' +
      '<label class="block text-xs text-gray-600">Temas, uno por línea, en el orden en que quieres estudiarlos' +
      '<textarea id="lisa-temas" rows="10" class="' + CAMPO + '">' + esc(b.temas) + '</textarea></label>' +
      '<div class="grid grid-cols-3 gap-2">' +
      '<label class="text-xs text-gray-600">Primer tema<input id="lisa-inicio" type="date" value="' + esc(b.inicio) + '" class="' + CAMPO + '"></label>' +
      '<label class="text-xs text-gray-600">Repaso 1 (días)<input id="lisa-r1" type="number" min="1" value="' + esc(b.r1) + '" class="' + CAMPO + '"></label>' +
      '<label class="text-xs text-gray-600">Repaso 2 (días)<input id="lisa-r2" type="number" min="2" value="' + esc(b.r2) + '" class="' + CAMPO + '"></label>' +
      '</div>' +
      '<label class="flex items-start gap-2 text-xs text-gray-600">' +
      '<input id="lisa-aldia" type="checkbox" class="mt-0.5"' + (b.alDia ? ' checked' : '') + '>' +
      'Ya estudié lo programado antes de hoy: marcarlo como hecho</label>' +
      '<div class="flex gap-2">' +
      '<button data-accion="guardar-plan" class="' + BTN_PRIMARIO + '"' + (guardando ? ' disabled' : '') + '>' + (guardando ? 'Guardando...' : 'Guardar plan') + '</button>' +
      (hay ? '<button data-accion="cerrar-form" class="' + BTN_SECUNDARIO + '">Cancelar</button>' : '') +
      '</div></div>';
  }

  function renderPlan() {
    const el = document.getElementById('lisa-plan');
    if (!el) return;
    if (cargando && !filas.length) { el.innerHTML = aviso('Cargando plan...'); return; }

    if (!filas.length && !borrador) borrador = nuevoBorrador('reemplazar');
    let html = banner();
    if (!filas.length && error) html += '<div class="mb-3">' + aviso(error, true) + '</div>';

    if (filas.length) {
      const lista = filas.map(f =>
        '<div class="p-3 rounded-2xl bg-white border border-gray-100">' +
        '<p class="text-sm font-medium text-gray-800">T' + f.n + ' · ' + esc(f.tema || 'Sin nombre') + '</p>' +
        '<div class="mt-1.5 flex flex-wrap gap-1.5">' + PASOS.map(p => chip(f, p)).join('') + '</div></div>').join('');
      html += '<div class="space-y-2">' + lista + '</div>';
    }

    if (formAbierto || !filas.length) html += '<div class="mt-4">' + formulario() + '</div>';
    else html += '<div class="mt-4 flex gap-2">' +
      '<button data-accion="abrir-form" data-modo="agregar" class="' + BTN_SECUNDARIO + '">Agregar temas</button>' +
      '<button data-accion="abrir-form" data-modo="reemplazar" class="' + BTN_SECUNDARIO + '">Reemplazar plan</button></div>';

    el.innerHTML = html;
  }

  function render() { renderHoy(); renderPlan(); }

  /* ---------- Estructura fija de la sección ---------- */
  sec.innerHTML =
    '<div class="border-l-4 border-pink-400 pl-3">' +
    '<h2 class="text-xl font-bold text-gray-800">1HThxI</h2>' +
    '<p class="text-xs text-gray-500">Plan de estudio · repaso espaciado</p></div>' +
    '<div class="flex bg-gray-100 p-1 rounded-xl text-xs font-medium">' +
    '<button data-tab="lisa-hoy" class="tab-btn flex-1 py-1.5 rounded-lg text-center bg-white shadow-xs text-gray-800">Hoy</button>' +
    '<button data-tab="lisa-plan" class="tab-btn flex-1 py-1.5 rounded-lg text-center text-gray-500">Plan</button></div>' +
    '<div id="lisa-hoy" class="tab-content"></div>' +
    '<div id="lisa-plan" class="tab-content hidden"></div>';

  /* ---------- Eventos (delegados) ---------- */
  sec.addEventListener('click', e => {
    const t = e.target.closest('[data-toggle]');
    if (t) {
      const [n, p] = t.getAttribute('data-toggle').split(':');
      alternar(Number(n), p);
      return;
    }
    const a = e.target.closest('[data-accion]');
    if (!a) return;
    switch (a.getAttribute('data-accion')) {
      case 'reintentar': cargar(); break;
      case 'ir-plan': {
        const tab = sec.querySelector('[data-tab="lisa-plan"]');
        if (tab) tab.click();
        break;
      }
      case 'abrir-form':
        borrador = nuevoBorrador(a.getAttribute('data-modo'));
        formAbierto = true; msg = ''; render();
        break;
      case 'cerrar-form':
        formAbierto = false; borrador = null; msg = ''; render();
        break;
      case 'guardar-plan': guardarPlan(); break;
    }
  });

  // El borrador se actualiza al escribir para que no se pierda al volver a pintar
  const guardarCampo = e => {
    if (!borrador) return;
    switch (e.target.id) {
      case 'lisa-temas': borrador.temas = e.target.value; break;
      case 'lisa-inicio': borrador.inicio = e.target.value; break;
      case 'lisa-r1': borrador.r1 = e.target.value; break;
      case 'lisa-r2': borrador.r2 = e.target.value; break;
      case 'lisa-aldia': borrador.alDia = e.target.checked; break;
    }
  };
  sec.addEventListener('input', guardarCampo);
  sec.addEventListener('change', guardarCampo);

  // Refrescar al abrir la sección si pasó más de un minuto
  const navBtn = document.querySelector('[data-section="lisa"]');
  if (navBtn) navBtn.addEventListener('click', () => {
    if (!cargando && Date.now() - ultimaCarga > 60000) cargar();
  });

  cargar();
});
