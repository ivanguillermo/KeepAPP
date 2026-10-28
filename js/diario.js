/**
 * js/diario.js - Diario: tareas del día con puntaje 1-5 y resumen del mes
 * Lee/escribe la hoja "diario" (un par de columnas por día) a través del backend (diario.gs).
 */
KeepModule('diario', () => {
  const API = window.KEEP_BACKEND_URL;
  const cont = document.getElementById('sec-diario');
  if (!cont) return;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const clave = d => d.mes + '-' + d.dia;
  const ahora = () => { const f = new Date(); return { dia: f.getDate(), mes: f.getMonth() }; };
  const esHoy = d => { const h = ahora(); return d.dia === h.dia && d.mes === h.mes; };
  const fechaLarga = d => new Date(new Date().getFullYear(), d.mes, d.dia)
    .toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });

  let dias = [], vista = 'dia', sel = null, estado = 'cargando', mensaje = '', ultimaCarga = 0;

  async function post(payload) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    const j = await r.json();
    if (j.status !== 'success') throw new Error(j.message || 'Error del servidor');
    return j;
  }

  function elegirDiaInicial() {
    if (sel && dias.some(d => clave(d) === sel)) return;
    const h = ahora();
    const hoyD = dias.find(d => esHoy(d));
    const proximo = dias.find(d => d.mes > h.mes || (d.mes === h.mes && d.dia >= h.dia));
    sel = clave(hoyD || proximo || dias[dias.length - 1]);
  }

  async function cargar() {
    if (!dias.length) { estado = 'cargando'; pintar(); }
    try {
      const r = await fetch(`${API}?action=obtenerDiario`);
      const j = await r.json();
      if (j.status !== 'success') throw new Error(j.message || 'Error');
      dias = (j.dias || []).sort((a, b) => a.mes - b.mes || a.dia - b.dia);
      estado = dias.length ? 'ok' : 'vacio';
      if (dias.length) elegirDiaInicial();
      ultimaCarga = Date.now();
    } catch (e) {
      estado = 'error'; mensaje = e.message;
    }
    pintar();
  }

  const actual = () => dias.find(d => clave(d) === sel);
  const pts = d => d.tareas.reduce((s, t) => s + t.puntaje, 0);

  function vistaDia() {
    const d = actual();
    const i = dias.indexOf(d);
    const total = pts(d), n = d.tareas.length, hechas = d.tareas.filter(t => t.puntaje > 0).length;
    const max = n * 5, pct = max ? Math.round(total / max * 100) : 0;

    const flecha = (ok, destino, txt) => ok
      ? `<button data-acc="mover" data-k="${clave(dias[destino])}" class="w-9 h-9 rounded-xl bg-white border border-gray-200 text-lg text-gray-500 hover:bg-indigo-50">${txt}</button>`
      : `<span class="w-9 h-9"></span>`;

    const tareas = n === 0
      ? '<p class="text-xs text-gray-400 text-center py-6">No hay tareas para este día.</p>'
      : d.tareas.map(t => {
        const lista = t.puntaje > 0;
        const botones = [1, 2, 3, 4, 5].map(k => `
          <button data-acc="pts" data-fila="${t.fila}" data-n="${t.puntaje === k ? 0 : k}"
                  class="w-9 h-9 sm:w-8 sm:h-8 rounded-full text-xs font-black border transition-all ${t.puntaje === k ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600'}">${k}</button>`).join('');
        return `
          <div class="bg-white rounded-xl border ${lista ? 'border-emerald-200' : 'border-gray-100'} px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
            <p class="flex-1 min-w-0 text-[13px] font-semibold leading-snug ${lista ? 'text-gray-400' : 'text-gray-800'}">${lista ? '✓ ' : ''}${esc(t.texto)}</p>
            <div class="flex items-center gap-1.5">${botones}</div>
          </div>`;
      }).join('');

    return `
      <div class="flex items-center justify-between gap-2">
        ${flecha(i > 0, i - 1, '‹')}
        <div class="text-center min-w-0">
          ${esHoy(d) ? '<p class="text-[10px] font-black uppercase tracking-wider text-indigo-600">Hoy</p>' : ''}
          <p class="text-sm font-bold text-gray-800 capitalize truncate">${esc(fechaLarga(d))}</p>
        </div>
        ${flecha(i < dias.length - 1, i + 1, '›')}
      </div>

      <div class="rounded-2xl bg-indigo-600 text-white p-4 space-y-2">
        <div class="flex items-end justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider opacity-80">Puntos del día</p>
            <p class="text-4xl font-black leading-none mt-1">${total}</p>
          </div>
          <p class="text-[11px] opacity-90 text-right">${hechas}/${n} tareas<br>máx. ${max}</p>
        </div>
        <div class="h-1.5 rounded-full bg-white/25 overflow-hidden"><div class="h-full bg-white rounded-full transition-all" style="width:${pct}%"></div></div>
      </div>

      <div class="space-y-2">${tareas}</div>
      <p class="text-[10px] text-gray-400 text-center">Toca un número (1–5) para marcar la tarea como lista; tócalo de nuevo para desmarcarla.</p>`;
  }

  function vistaMes() {
    const d0 = actual();
    const mes = d0.mes, anio = new Date().getFullYear();
    const delMes = dias.filter(d => d.mes === mes);
    const porDia = {}; delMes.forEach(d => { porDia[d.dia] = d; });
    const offset = (new Date(anio, mes, 1).getDay() + 6) % 7;
    const totalDias = new Date(anio, mes + 1, 0).getDate();

    const totalMes = delMes.reduce((s, d) => s + pts(d), 0);
    const conPuntos = delMes.filter(d => pts(d) > 0);
    const mejor = conPuntos.reduce((m, d) => (!m || pts(d) > pts(m) ? d : m), null);
    const prom = conPuntos.length ? Math.round(totalMes / conPuntos.length * 10) / 10 : 0;

    let celdas = '<div></div>'.repeat(offset);
    for (let n = 1; n <= totalDias; n++) {
      const d = porDia[n];
      if (!d) { celdas += `<div class="aspect-square rounded-xl bg-gray-50 text-gray-300 flex items-center justify-center text-[10px] font-bold">${n}</div>`; continue; }
      const p = pts(d), max = d.tareas.length * 5, r = max ? p / max : 0;
      const color = p === 0 ? 'bg-white text-gray-400 border border-gray-200'
        : r >= 0.8 ? 'bg-emerald-500 text-white' : r >= 0.5 ? 'bg-emerald-300 text-emerald-950' : 'bg-emerald-100 text-emerald-900';
      celdas += `
        <button data-acc="ir" data-k="${clave(d)}" class="aspect-square rounded-xl flex flex-col items-center justify-center ${color} ${esHoy(d) ? 'ring-2 ring-indigo-500' : ''} hover:opacity-80 transition-opacity">
          <span class="text-[9px] font-bold opacity-70">${n}</span>
          <span class="text-sm font-black leading-none">${p || '·'}</span>
        </button>`;
    }

    const stat = (rot, v) => `<div class="bg-white rounded-xl border border-gray-100 p-2.5 text-center"><p class="text-[9px] font-bold uppercase tracking-wider text-gray-400">${rot}</p><p class="text-base font-black text-gray-800">${v}</p></div>`;

    return `
      <div class="max-w-xl mx-auto w-full space-y-3">
        <p class="text-sm font-bold text-gray-800 capitalize text-center">${MESES[mes]}</p>
        <div class="grid grid-cols-3 gap-2">
          ${stat('Total del mes', totalMes)}
          ${stat('Promedio / día', prom)}
          ${stat('Mejor día', mejor ? `${mejor.dia} <span class="text-xs text-gray-400">(${pts(mejor)})</span>` : '–')}
        </div>
        <div class="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-gray-400">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<span>${x}</span>`).join('')}</div>
        <div class="grid grid-cols-7 gap-1">${celdas}</div>
        <p class="text-[10px] text-gray-400 text-center">Toca un día para verlo y editarlo.</p>
      </div>`;
  }

  function pintar() {
    const tab = (v, txt) => `<button data-acc="vista" data-v="${v}" class="px-3 py-1 rounded-lg text-xs font-bold ${vista === v ? 'bg-white shadow-xs text-gray-800' : 'text-gray-500'}">${txt}</button>`;

    let cuerpo;
    if (estado === 'cargando') cuerpo = '<p class="text-xs text-gray-400 text-center py-8 animate-pulse">Cargando diario...</p>';
    else if (estado === 'error') cuerpo = `<p class="text-xs text-red-500 text-center py-8">Error: ${esc(mensaje)}</p>`;
    else if (estado === 'vacio') cuerpo = '<p class="text-xs text-gray-400 text-center py-8">No encontré columnas de días (como "1 Nov") en la hoja <b>diario</b>.</p>';
    else cuerpo = vista === 'dia' ? vistaDia() : vistaMes();

    cont.innerHTML = `
      <div class="border-l-4 border-indigo-300 pl-3 mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 class="text-xl font-bold text-gray-800">Diario</h2>
          <p class="text-xs text-gray-500">Tareas del día y puntaje</p>
        </div>
        <button data-acc="recargar" class="text-xs text-indigo-600 hover:underline shrink-0 mt-1">↻ Actualizar</button>
      </div>
      <div class="space-y-3">
        <div class="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">${tab('dia', 'Día')}${tab('mes', 'Mes')}</div>
        ${cuerpo}
      </div>`;
  }

  cont.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const a = b.dataset.acc;

    if (a === 'vista') { vista = b.dataset.v; return pintar(); }
    if (a === 'recargar') return cargar();
    if (a === 'mover') { sel = b.dataset.k; return pintar(); }
    if (a === 'ir') { sel = b.dataset.k; vista = 'dia'; return pintar(); }

    if (a === 'pts') {
      const d = actual();
      const t = d.tareas.find(x => x.fila === Number(b.dataset.fila));
      const nuevo = Number(b.dataset.n);
      if (!t) return;
      const anterior = t.puntaje;
      t.puntaje = nuevo;               // se ve al instante
      pintar();
      try {
        await post({ action: 'guardarPuntajeDiario', col: d.col, fila: t.fila, dia: d.dia, mes: d.mes, puntaje: nuevo });
      } catch (err) {
        t.puntaje = anterior;
        pintar();
        alert('No se pudo guardar: ' + err.message);
        cargar();
      }
    }
  });

  // Al volver a la app (cambio de pestaña, desbloquear el teléfono) se refresca si pasó más de 1 minuto
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && estado !== 'cargando' && Date.now() - ultimaCarga > 60000) cargar();
  });

  cargar();
});
