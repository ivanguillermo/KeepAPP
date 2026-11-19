/**
 * Hábitos · reto de 99 días
 * Sección: #sec-habitos  (botón del menú: data-section="habitos")
 * Datos: hojas Habitos, Diario_Hab y Marcas_Hab, vía habitos.gs.
 * La app marca cada hábito como hecho o no hecho y calcula las reglas:
 *   1) no fallar dos días seguidos
 *   2) máximo N fallos en cada bloque de 10 días
 *   3) máximo M fallos en total
 * (N, M, el inicio y el mínimo de hábitos vienen de las constantes de habitos.gs)
 */
window.KeepModule('Hábitos', () => {
  const sec = document.getElementById('sec-habitos');
  if (!sec) throw new Error('No existe #sec-habitos en el index');

  // Metas de la hoja Marcas (modifícalas aquí si cambian)
  const LB = 2.20462, META_REAL = 432, META_1000 = 1000 / LB;
  const PESO_OBJ = 82, BANCA_OBJ = 100, BANCA_FECHA = '2026-12-31';
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  let CFG = null, HAB = [], DIAS = [], SEM = [];
  let cargando = true, error = '', msg = '', dia = 1, ultimaCarga = 0;

  /* ---------- Utilidades ---------- */
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const aISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const deISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const hoy = () => aISO(new Date());
  const sumar = (s, n) => { const d = deISO(s); d.setDate(d.getDate() + n); return aISO(d); };
  const diff = (a, b) => Math.round((deISO(a) - deISO(b)) / 86400000);
  const corta = s => { const d = deISO(s); return d.getDate() + MESES[d.getMonth()]; };
  const f1 = v => (v === null || v === undefined || isNaN(v)) ? '—' : String(Math.round(v * 10) / 10).replace('.', ',');
  const fechaDe = n => sumar(CFG.inicio, n - 1);
  const diaDeHoy = () => diff(hoy(), CFG.inicio) + 1;
  const hecho = c => c === '1' || c === 'd';

  /* ---------- Backend ---------- */
  async function api(accion, datos) {
    const base = window.KEEP_BACKEND_URL;
    if (!base) throw new Error('No hay conexión con el backend (falta auth.js).');
    const r = await fetch(base, { method: 'POST', body: JSON.stringify(Object.assign({ action: accion }, datos || {})) });
    const texto = await r.text();
    let j;
    try { j = JSON.parse(texto); } catch (e) {
      throw new Error('El backend no reconoce "' + accion + '". Revisa que habitos.gs esté pegado y conectado en doPost.');
    }
    if (j.status && j.status !== 'success') throw new Error(j.message || ('Respuesta: ' + j.status));
    return j;
  }

  async function cargar() {
    cargando = true; render();
    try {
      const j = await api('habitosLeer');
      CFG = j.config; HAB = j.habitos; DIAS = j.dias; SEM = j.semanas || [];
      if (!HAB.length) throw new Error('La hoja Habitos no tiene hábitos desde la fila 5.');
      const h = diaDeHoy();
      dia = Math.min(99, Math.max(1, h));
      error = '';
    } catch (e) { error = e.message; }
    cargando = false; ultimaCarga = Date.now(); render();
  }

  /* ---------- Reglas ---------- */
  function evaluar() {
    const act = HAB.map((h, i) => h.activo ? i : -1).filter(i => i >= 0);
    const minN = Math.ceil(CFG.minimo * act.length - 1e-9);
    const res = [], bloq = {};
    let tot = 0, prevF = false, racha = 0, mejor = 0;
    DIAS.forEach((d, k) => {
      const n = k + 1, f = fechaDe(n), m = d.marcas;
      const hechos = act.filter(i => hecho(m[i])).length;
      const oblFalta = act.filter(i => HAB[i].obl && !hecho(m[i]));
      const cumple = hechos >= minN && oblFalta.length === 0;
      const estado = cumple ? 'C' : (f < hoy() ? 'F' : (f === hoy() ? 'P' : ''));
      const b = Math.floor(k / 10), reglas = [];
      if (estado === 'F') {
        tot++; bloq[b] = (bloq[b] || 0) + 1;
        if (prevF) reglas.push('2 días seguidos');
        if (bloq[b] > CFG.maxBloque) reglas.push('más de ' + CFG.maxBloque + ' en 10 días');
        if (tot > CFG.maxTotal) reglas.push('más de ' + CFG.maxTotal + ' en total');
      }
      prevF = estado === 'F';
      if (estado === 'C') { racha++; mejor = Math.max(mejor, racha); } else if (estado === 'F') racha = 0;
      res.push({ n, f, hechos, oblFalta, estado, reglas, b, failB: bloq[b] || 0, failT: tot, racha });
    });
    return { res, act, minN };
  }

  /* ---------- Acciones ---------- */
  const setMarca = (k, i, v) => { const s = DIAS[k].marcas; DIAS[k].marcas = s.slice(0, i) + v + s.slice(i + 1); };
  async function alternar(i) {
    const k = dia - 1, antes = DIAS[k].marcas[i];
    const permiteD = /gym/i.test(HAB[i].nombre);
    const sig = antes === '0' ? '1' : (antes === '1' && permiteD ? 'd' : '0');
    setMarca(k, i, sig); msg = ''; render();
    try { await api('habitosMarcar', { dia, hab: i, valor: sig === '1' ? 1 : (sig === 'd' ? 'd' : 0) }); }
    catch (e) { setMarca(k, i, antes); msg = 'No se pudo guardar: ' + e.message; render(); }
  }
  async function guardarDia(campo, valor) {
    const k = dia - 1, antes = DIAS[k][campo];
    DIAS[k][campo] = campo === 'peso' ? (Number(valor) || 0) : valor; msg = '';
    try { await api('habitosDia', { dia, campo, valor }); }
    catch (e) { DIAS[k][campo] = antes; msg = 'No se pudo guardar: ' + e.message; }
    render();
  }
  async function guardarMarca(fila, campo, valor) {
    if (!SEM[fila]) SEM[fila] = {};
    const antes = SEM[fila][campo];
    SEM[fila][campo] = valor === '' ? null : Number(valor); msg = '';
    try { await api('habitosMarca', { fila, campo, valor }); }
    catch (e) { SEM[fila][campo] = antes; msg = 'No se pudo guardar: ' + e.message; }
    render();
  }

  /* ---------- Vistas ---------- */
  const BTN = 'px-4 py-2 rounded-xl bg-teal-500 text-white text-xs font-semibold shadow-sm active:scale-95 transition';
  const CAJA = 'p-4 rounded-2xl bg-white border border-teal-100';
  const CHECK = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
  const aviso = (t, rojo) => '<div class="p-3 rounded-2xl border text-sm ' + (rojo ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-teal-50 border-teal-100 text-gray-600') + '">' + esc(t) + '</div>';
  const banner = () => msg ? '<div class="mb-3">' + aviso(msg, true) + '</div>' : '';

  function sinDatos(el) {
    if (CFG) return false;
    el.innerHTML = cargando ? aviso('Cargando hábitos…')
      : aviso(error || 'Sin datos', true) + '<div class="mt-3"><button data-accion="reintentar" class="' + BTN + '">Reintentar</button></div>';
    return true;
  }

  function renderHoy() {
    const el = $('hab-hoy'); if (!el || sinDatos(el)) return;
    const E = evaluar(), d = E.res[dia - 1], m = DIAS[dia - 1].marcas, hN = diaDeHoy();
    const chip = { C: ['Cumplido', 'bg-emerald-100 text-emerald-700'], F: ['Fallado', 'bg-rose-100 text-rose-700'], P: ['En curso', 'bg-amber-100 text-amber-700'], '': ['Futuro', 'bg-gray-100 text-gray-500'] }[d.estado];
    const alertas = [];
    if (d.estado === 'P') {
      if (dia > 1 && E.res[dia - 2].estado === 'F') alertas.push('Ayer fallaste: hoy no puedes fallar.');
      else if (d.failB >= CFG.maxBloque) alertas.push('Ya usaste ' + d.failB + ' de ' + CFG.maxBloque + ' fallos de este bloque: hoy no puedes fallar.');
      else if (d.failT >= CFG.maxTotal) alertas.push('Ya usaste los ' + CFG.maxTotal + ' fallos del reto: hoy no puedes fallar.');
    }
    if (d.estado === 'F' && d.reglas.length) alertas.push('Regla rota: ' + d.reglas.join(' · ') + '.');
    const faltan = Math.max(0, E.minN - d.hechos);
    const info = d.estado === 'C' ? 'Día completo.' :
      (faltan ? 'Te faltan ' + faltan + ' hábitos para el mínimo.' : '') +
      (d.oblFalta.length ? ' Obligatorios pendientes: ' + d.oblFalta.map(i => HAB[i].nombre).join(', ') + '.' : '');
    const grupos = {};
    E.act.forEach(i => { const g = HAB[i].grupo || 'Otros'; (grupos[g] = grupos[g] || []).push(i); });
    const lista = Object.keys(grupos).map(g =>
      '<div class="space-y-1.5"><h3 class="text-xs font-semibold uppercase tracking-wide text-gray-400">' + esc(g) + '</h3>' +
      grupos[g].map(i => {
        const v = m[i], on = hecho(v);
        return '<button data-h="' + i + '" aria-pressed="' + on + '" class="w-full flex items-center gap-3 p-3 rounded-2xl border text-left active:scale-[0.99] transition ' + (on ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-100') + '">' +
          '<span class="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-[11px] font-bold ' + (on ? 'bg-teal-500 border-teal-500 text-white' : 'border-gray-300') + '">' + (v === 'd' ? 'd' : (on ? CHECK : '')) + '</span>' +
          '<span class="flex-1 text-sm ' + (on ? 'text-gray-400 line-through' : 'text-gray-800') + '">' + esc(HAB[i].nombre) + (HAB[i].obl ? ' <span class="text-amber-500 no-underline">★</span>' : '') + '</span>' +
          (HAB[i].min ? '<span class="text-[11px] text-gray-400">' + HAB[i].min + ' min</span>' : '') + '</button>';
      }).join('') + '</div>').join('');
    const pct = E.minN ? Math.min(100, Math.round(d.hechos * 100 / E.minN)) : 100;
    el.innerHTML = banner() +
      '<div class="space-y-4">' +
      '<div class="flex items-center justify-between"><button data-nav="prev" class="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-sm' + (dia <= 1 ? ' opacity-30' : '') + '">◀</button>' +
      '<div class="text-center"><p class="text-sm font-semibold text-gray-800">Día ' + dia + ' de 99 · ' + corta(d.f) + '</p><span class="text-[11px] px-2 py-0.5 rounded-full ' + chip[1] + '">' + chip[0] + '</span></div>' +
      '<button data-nav="next" class="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-sm' + (dia >= Math.min(99, hN) ? ' opacity-30' : '') + '">▶</button></div>' +
      '<div class="' + CAJA + '"><div class="flex justify-between text-xs text-gray-500"><span>' + d.hechos + ' de ' + E.act.length + ' hábitos (mínimo ' + E.minN + ')</span>' +
      '<span>Bloque: ' + d.failB + '/' + CFG.maxBloque + ' fallos · Total: ' + d.failT + '/' + CFG.maxTotal + '</span></div>' +
      '<div class="mt-2 h-2 rounded-full bg-teal-100 overflow-hidden"><div class="h-full bg-teal-500 transition-all" style="width:' + pct + '%"></div></div>' +
      (info ? '<p class="mt-2 text-xs text-gray-600">' + esc(info) + '</p>' : '') + '</div>' +
      alertas.map(a => aviso('⚠ ' + a, true)).join('') +
      lista +
      '<div class="' + CAJA + ' grid grid-cols-2 gap-3 text-xs text-gray-600">' +
      '<label>Peso en ayunas (kg)<input id="hab-peso" type="number" step="0.1" min="30" max="200" value="' + (DIAS[dia - 1].peso || '') + '" class="mt-1 w-full rounded-xl border border-gray-200 p-2 text-sm text-gray-800"></label>' +
      '<label>Nota del día<input id="hab-nota" type="text" maxlength="300" value="' + esc(DIAS[dia - 1].nota || '') + '" class="mt-1 w-full rounded-xl border border-gray-200 p-2 text-sm text-gray-800"></label></div></div>';
  }

  function renderReto() {
    const el = $('hab-reto'); if (!el || sinDatos(el)) return;
    const E = evaluar(), R = E.res, hN = diaDeHoy();
    const c = R.filter(x => x.estado === 'C').length, f = R.filter(x => x.estado === 'F').length;
    const rotas = R.filter(x => x.reglas.length);
    const idx = Math.min(99, Math.max(1, hN)) - 1;
    const color = x => ({ C: 'bg-emerald-400 text-white', F: 'bg-rose-400 text-white', P: 'bg-amber-300 text-gray-800', '': 'bg-gray-100 text-gray-400' }[x.estado]);
    const filas = [];
    for (let b = 0; b < 10; b++) {
      const bl = R.slice(b * 10, b * 10 + 10), fb = bl.filter(x => x.estado === 'F').length;
      filas.push('<div class="flex items-center gap-1">' + bl.map(x =>
        '<button data-d="' + x.n + '" class="flex-1 aspect-square rounded-lg text-[10px] font-semibold ' + color(x) + (x.reglas.length ? ' ring-2 ring-rose-700' : '') + (x.n === dia ? ' outline outline-2 outline-teal-600' : '') + '">' + x.n + '</button>').join('') +
        '<span class="w-9 text-right text-[11px] ' + (fb > CFG.maxBloque ? 'text-rose-600 font-bold' : 'text-gray-500') + '">' + fb + '/' + CFG.maxBloque + '</span></div>');
    }
    const stat = (t, v) => '<div class="' + CAJA + ' text-center"><p class="text-lg font-bold text-gray-800">' + v + '</p><p class="text-[11px] text-gray-500">' + t + '</p></div>';
    el.innerHTML = banner() + '<div class="space-y-4">' +
      '<div class="grid grid-cols-3 gap-2">' + stat('Cumplidos', c) + stat('Fallados', f) + stat('Fallos que quedan', Math.max(0, CFG.maxTotal - f)) +
      stat('Racha', R[idx].racha) + stat('Reglas rotas', rotas.length) + stat('Días restantes', Math.max(0, 99 - Math.max(0, hN))) + '</div>' +
      '<div class="' + CAJA + ' space-y-1"><p class="text-xs text-gray-500 mb-1">Cada fila es un bloque de 10 días. A la derecha, fallos del bloque.</p>' + filas.join('') + '</div>' +
      (rotas.length ? '<div class="space-y-2"><h3 class="text-sm font-semibold text-rose-700">Días con regla rota</h3>' + rotas.map(x => aviso('Día ' + x.n + ' (' + corta(x.f) + '): ' + x.reglas.join(' · '), true)).join('') + '</div>' : '') +
      '</div>';
  }

  function filasMarcas() {
    const out = [];
    for (let i = 0; i < 16; i++) {
      const m = SEM[i] || {};
      const fecha = i === 0 ? CFG.inicio : (i <= 14 ? sumar(CFG.inicio, 7 * i - 1) : sumar(CFG.inicio, 98));
      let peso = null;
      if (i === 0) peso = m.peso0 || null;
      else if (i <= 14) {
        const p = DIAS.slice(7 * (i - 1), 7 * i).map(d => d.peso).filter(v => v > 0);
        peso = p.length ? p.reduce((a, b) => a + b, 0) / p.length : null;
      }
      const total = (m.banca && m.sentadilla && m.muerto) ? m.banca + m.sentadilla + m.muerto : null;
      out.push({ i, m, fecha, peso, total, dias: diff(fecha, CFG.inicio) });
    }
    return out;
  }

  function renderMarcas() {
    const el = $('hab-marcas'); if (!el || sinDatos(el)) return;
    const F = filasMarcas(), t0 = F[0].total, hN = diaDeHoy();
    const conTotal = F.filter(x => x.total !== null), ult = conTotal.length ? conTotal[conTotal.length - 1] : null;
    const mejorBanca = Math.max(0, ...F.map(x => x.m.banca || 0));
    const pesos = F.filter(x => x.peso !== null), pesoAct = pesos.length ? pesos[pesos.length - 1].peso : null;
    const barra = (v, max) => '<div class="mt-1 h-2 rounded-full bg-teal-100 overflow-hidden"><div class="h-full bg-teal-500" style="width:' + Math.min(100, Math.max(0, Math.round(v * 100 / max))) + '%"></div></div>';
    const resumen = '<div class="' + CAJA + ' space-y-3 text-xs text-gray-600">' +
      '<div><div class="flex justify-between"><span>Club de las 1000 lb</span><span>' + (ult ? f1(ult.total) + ' / ' + f1(META_1000) + ' kg' : '— / ' + f1(META_1000) + ' kg') + '</span></div>' + barra(ult ? ult.total : 0, META_1000) + '</div>' +
      '<div><div class="flex justify-between"><span>Banca (meta ' + BANCA_OBJ + ' kg antes del ' + corta(BANCA_FECHA) + ')</span><span>' + f1(mejorBanca || null) + ' kg · faltan ' + Math.max(0, diff(BANCA_FECHA, hoy())) + ' días</span></div>' + barra(mejorBanca, BANCA_OBJ) + '</div>' +
      '<div><div class="flex justify-between"><span>Peso corporal</span><span>' + f1(pesoAct) + ' / ' + PESO_OBJ + ' kg</span></div>' + barra(pesoAct || 0, PESO_OBJ) + '</div></div>';
    const inp = (i, campo, etiqueta, valor, paso) => '<label class="text-[11px] text-gray-500">' + etiqueta + '<input data-m="' + i + ':' + campo + '" type="number" step="' + paso + '" value="' + (valor === null || valor === undefined ? '' : valor) + '" class="mt-0.5 w-full rounded-lg border border-gray-200 p-1.5 text-sm text-gray-800"></label>';
    const semanaAct = Math.min(14, Math.max(0, Math.ceil(hN / 7)));
    const tarjetas = F.map(x => {
      const mr = t0 ? t0 + (META_REAL - t0) * x.dias / 98 : null, m1 = t0 ? t0 + (META_1000 - t0) * x.dias / 98 : null;
      const lab = x.i === 0 ? 'Inicio' : (x.i === 15 ? 'Día 99' : 'Semana ' + x.i);
      const g = x.m.grasa ? Math.round((x.m.grasa > 1 ? x.m.grasa : x.m.grasa * 100) * 10) / 10 : null;
      return '<details ' + (x.i === semanaAct ? 'open ' : '') + 'class="rounded-2xl bg-white border border-gray-100"><summary class="p-3 flex justify-between text-sm cursor-pointer"><span class="font-medium text-gray-800">' + lab + ' · ' + corta(x.fecha) + '</span><span class="text-gray-500">' + (x.total ? f1(x.total) + ' kg' : '—') + '</span></summary>' +
        '<div class="px-3 pb-3 grid grid-cols-3 gap-2">' + inp(x.i, 'banca', 'Banca', x.m.banca, '0.5') + inp(x.i, 'sentadilla', 'Sentadilla', x.m.sentadilla, '0.5') + inp(x.i, 'muerto', 'P. muerto', x.m.muerto, '0.5') +
        inp(x.i, 'grasa', '% grasa', g, '0.1') + inp(x.i, 'cintura', 'Cintura cm', x.m.cintura, '0.1') + (x.i === 0 ? inp(0, 'peso0', 'Peso inicial', x.m.peso0, '0.1') : '<div class="text-[11px] text-gray-500">Peso prom.<p class="mt-1.5 text-sm text-gray-800">' + f1(x.peso) + ' kg</p></div>') + '</div>' +
        '<p class="px-3 pb-3 text-[11px] text-gray-500">Meta ruta realista: ' + f1(mr) + ' kg · Ruta 1000 lb: ' + f1(m1) + ' kg' + (x.total && mr ? ' · Dif. vs realista: ' + (x.total - mr >= 0 ? '+' : '') + f1(x.total - mr) : '') + '</p></details>';
    }).join('');
    el.innerHTML = banner() + '<div class="space-y-3">' + resumen + tarjetas + '</div>';
  }

  function render() { renderHoy(); renderReto(); renderMarcas(); }

  /* ---------- Estructura y eventos ---------- */
  sec.innerHTML =
    '<div class="border-l-4 border-teal-400 pl-3"><h2 class="text-xl font-bold text-gray-800">Hábitos</h2>' +
    '<p class="text-xs text-gray-500">Reto de 99 días · marcar y no romper las reglas</p></div>' +
    '<div class="flex bg-gray-100 p-1 rounded-xl text-xs font-medium">' +
    '<button data-tab="hab-hoy" class="tab-btn flex-1 py-1.5 rounded-lg text-center bg-white shadow-xs text-gray-800">Hoy</button>' +
    '<button data-tab="hab-reto" class="tab-btn flex-1 py-1.5 rounded-lg text-center text-gray-500">Reto</button>' +
    '<button data-tab="hab-marcas" class="tab-btn flex-1 py-1.5 rounded-lg text-center text-gray-500">Marcas</button></div>' +
    '<div id="hab-hoy" class="tab-content"></div><div id="hab-reto" class="tab-content hidden"></div><div id="hab-marcas" class="tab-content hidden"></div>';

  sec.addEventListener('click', e => {
    const h = e.target.closest('[data-h]');
    if (h) { alternar(Number(h.getAttribute('data-h'))); return; }
    const n = e.target.closest('[data-nav]');
    if (n) {
      const lim = Math.min(99, Math.max(1, diaDeHoy())), t = n.getAttribute('data-nav');
      dia = Math.min(lim, Math.max(1, dia + (t === 'next' ? 1 : -1))); render(); return;
    }
    const g = e.target.closest('[data-d]');
    if (g) {
      const x = Number(g.getAttribute('data-d'));
      if (x > Math.min(99, diaDeHoy())) return;      // no se marcan días futuros
      dia = x; render();
      const tab = sec.querySelector('[data-tab="hab-hoy"]'); if (tab) tab.click();
      return;
    }
    const a = e.target.closest('[data-accion]');
    if (a && a.getAttribute('data-accion') === 'reintentar') cargar();
  });

  sec.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'hab-peso') guardarDia('peso', t.value);
    else if (t.id === 'hab-nota') guardarDia('nota', t.value);
    else if (t.getAttribute && t.getAttribute('data-m')) {
      const [fila, campo] = t.getAttribute('data-m').split(':');
      guardarMarca(Number(fila), campo, t.value);
    }
  });

  const navBtn = document.querySelector('[data-section="habitos"]');
  if (navBtn) navBtn.addEventListener('click', () => { if (!cargando && Date.now() - ultimaCarga > 60000) cargar(); });

  cargar();
});
