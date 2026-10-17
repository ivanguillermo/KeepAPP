/**
 * js/agenda.js — Agenda unificada (reemplaza a calendario.js)
 */
KeepModule('agenda', () => {
  const API = window.KEEP_BACKEND_URL;
  const cont = document.getElementById('modulo-agenda');
  if (!cont) return;

  const TIPOS = {
    evento: ['Evento', 'bg-emerald-500'], recordatorio: ['Recordatorio', 'bg-amber-500'], pago: ['Pago', 'bg-rose-500'],
    examen: ['Examen', 'bg-indigo-500'], medicina: ['Medicina', 'bg-teal-500'], online: ['Online', 'bg-sky-500'], nota: ['Nota', 'bg-gray-400']
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = d => d.toLocaleDateString('sv-SE');
  const hoyIso = iso(new Date());

  let vista = 'lista', items = [], diaSel = hoyIso;
  let mes = new Date(); mes.setDate(1);

  async function post(payload) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    const j = await r.json();
    if (j.status !== 'success') throw new Error(j.message || 'Error');
    return j;
  }

  function etiquetaDia(f) {
    const dif = Math.round((new Date(f + 'T00:00') - new Date(hoyIso + 'T00:00')) / 86400000);
    const txt = new Date(f + 'T00:00').toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' });
    return (dif === 0 ? 'HOY · ' : dif === 1 ? 'MAÑANA · ' : '') + txt;
  }

  function itemHTML(i) {
    const [nombre, color] = TIPOS[i.tipo] || TIPOS.evento;
    const acciones = i.propio ? `
      <button data-acc="hecho" data-id="${esc(i.id)}" data-fecha="${i.fecha}" data-hecho="${i.hecho ? 0 : 1}" class="text-sm px-2">${i.hecho ? '↩' : '✓'}</button>
      <button data-acc="borrar" data-id="${esc(i.id)}" class="text-sm px-1 text-red-400">🗑</button>` : '';
    return `
      <div class="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-gray-100 ${i.hecho ? 'opacity-50' : ''}">
        <span class="w-2 h-8 rounded-full ${color} shrink-0"></span>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold text-gray-800 ${i.hecho ? 'line-through' : ''} truncate">${i.hora ? esc(i.hora) + ' · ' : ''}${esc(i.titulo)}</p>
          <p class="text-[10px] text-gray-400">${nombre}${i.repetir && i.repetir !== 'no' ? ' · ↻ ' + esc(i.repetir) : ''}${i.notas ? ' · ' + esc(i.notas) : ''}</p>
        </div>
        ${/^https?:\/\//.test(i.link || '') ? `<a href="${esc(i.link)}" target="_blank" rel="noopener" class="text-emerald-600 text-sm">↗</a>` : ''}
        ${acciones}
      </div>`;
  }

  function pintar() {
    const cuerpo = cont.querySelector('#ag-cuerpo');
    if (vista === 'lista') {
      const dias = [...new Set(items.map(i => i.fecha))];
      cuerpo.innerHTML = dias.length
        ? dias.map(f => `<div class="space-y-1.5"><p class="text-[10px] font-black uppercase tracking-wider text-gray-500">${etiquetaDia(f)}</p>${items.filter(i => i.fecha === f).map(itemHTML).join('')}</div>`).join('')
        : '<p class="text-xs text-gray-400 text-center py-6">Nada agendado en los próximos 14 días.</p>';
      return;
    }
    const y = mes.getFullYear(), m = mes.getMonth();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7, total = new Date(y, m + 1, 0).getDate();
    let celdas = '<div></div>'.repeat(offset);
    for (let d = 1; d <= total; d++) {
      const f = iso(new Date(y, m, d));
      const tipos = [...new Set(items.filter(i => i.fecha === f).map(i => i.tipo))].slice(0, 3);
      celdas += `<button data-acc="dia" data-fecha="${f}" class="aspect-square rounded-xl text-xs font-bold flex flex-col items-center justify-center ${f === diaSel ? 'bg-emerald-600 text-white' : f === hoyIso ? 'ring-2 ring-emerald-400 bg-white' : 'bg-white'}">
        ${d}<span class="flex gap-0.5 h-1.5">${tipos.map(t => `<i class="w-1.5 h-1.5 rounded-full ${(TIPOS[t] || TIPOS.evento)[1]}"></i>`).join('')}</span></button>`;
    }
    const titulo = mes.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
    cuerpo.innerHTML = `
      <div class="flex items-center justify-between"><button data-acc="mes" data-d="-1" class="px-3 py-1 text-lg">‹</button>
        <span class="text-xs font-black uppercase">${titulo}</span><button data-acc="mes" data-d="1" class="px-3 py-1 text-lg">›</button></div>
      <div class="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-gray-400">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<span>${x}</span>`).join('')}</div>
      <div class="grid grid-cols-7 gap-1">${celdas}</div>
      <p class="text-[10px] font-black uppercase tracking-wider text-gray-500 pt-2">${etiquetaDia(diaSel)}</p>
      <div class="space-y-1.5">${items.filter(i => i.fecha === diaSel).map(itemHTML).join('') || '<p class="text-xs text-gray-400 text-center py-3">Sin eventos este día.</p>'}</div>`;
  }

  async function cargar() {
    const cuerpo = cont.querySelector('#ag-cuerpo');
    let d0, d1;
    if (vista === 'lista') { d0 = new Date(); d1 = new Date(); d1.setDate(d1.getDate() + 13); }
    else { d0 = new Date(mes.getFullYear(), mes.getMonth(), 1); d1 = new Date(mes.getFullYear(), mes.getMonth() + 1, 0); }
    cuerpo.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">Cargando...</p>';
    try {
      const r = await fetch(`${API}?action=obtenerAgenda&desde=${iso(d0)}&hasta=${iso(d1)}`);
      const j = await r.json();
      if (j.status !== 'success') throw new Error(j.message);
      items = j.items;
      pintar();
    } catch (e) {
      cuerpo.innerHTML = `<p class="text-xs text-red-500 text-center py-6">Error: ${esc(e.message)}</p>`;
    }
  }

  function formulario() {
    const m = document.createElement('div');
    m.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
    const campo = 'w-full p-2 border border-gray-200 rounded-xl text-xs';
    m.innerHTML = `
      <form class="bg-white rounded-2xl w-full max-w-sm p-5 space-y-2.5 text-xs">
        <h3 class="text-sm font-bold">Nuevo evento</h3>
        <input name="titulo" required placeholder="Título" class="${campo}">
        <div class="grid grid-cols-2 gap-2"><input type="date" name="fecha" required value="${diaSel}" class="${campo}"><input type="time" name="hora" class="${campo}"></div>
        <div class="grid grid-cols-2 gap-2">
          <select name="tipo" class="${campo}">${Object.keys(TIPOS).filter(t => ['evento', 'recordatorio', 'pago', 'examen'].includes(t)).map(t => `<option value="${t}">${TIPOS[t][0]}</option>`).join('')}</select>
          <select name="repetir" class="${campo}"><option value="no">No se repite</option><option value="diario">Cada día</option><option value="semanal">Cada semana</option><option value="mensual">Cada mes</option><option value="anual">Cada año</option></select></div>
        <select name="avisar_min" class="${campo}"><option value="">Sin aviso por Telegram</option><option value="0">Avisar a la hora</option><option value="10">10 min antes</option><option value="30">30 min antes</option><option value="60">1 hora antes</option><option value="1440">1 día antes</option></select>
        <input name="link" placeholder="Enlace (opcional)" class="${campo}"><input name="notas" placeholder="Notas (opcional)" class="${campo}">
        <p class="text-[10px] text-gray-400">El aviso solo funciona si pones hora.</p>
        <div class="flex justify-end gap-2 pt-1"><button type="button" data-x class="px-3 py-2 bg-gray-100 rounded-xl">Cancelar</button><button class="px-3 py-2 bg-emerald-600 text-white rounded-xl font-semibold">Guardar</button></div>
      </form>`;
    document.body.appendChild(m);
    m.querySelector('[data-x]').onclick = () => m.remove();
    m.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const datos = Object.fromEntries(new FormData(e.target));
      try { await post({ action: 'guardarEvento', ...datos }); m.remove(); cargar(); }
      catch (err) { alert('No se pudo guardar: ' + err.message); }
    };
  }

  cont.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
          <button data-acc="vista" data-v="lista" class="px-3 py-1 rounded-lg">Próximos</button>
          <button data-acc="vista" data-v="mes" class="px-3 py-1 rounded-lg">Mes</button></div>
        <button data-acc="nuevo" class="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl">+ Evento</button>
      </div>
      <div id="ag-cuerpo" class="space-y-3"></div>
    </div>`;

  cont.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const a = b.dataset.acc;
    try {
      if (a === 'nuevo') return formulario();
      if (a === 'vista') { vista = b.dataset.v; return cargar(); }
      if (a === 'dia') { diaSel = b.dataset.fecha; return pintar(); }
      if (a === 'mes') { mes.setMonth(mes.getMonth() + Number(b.dataset.d)); return cargar(); }
      if (a === 'hecho') { await post({ action: 'actualizarEstadoEvento', id: b.dataset.id, fecha: b.dataset.fecha, hecho: b.dataset.hecho === '1' }); return cargar(); }
      if (a === 'borrar' && confirm('¿Eliminar este evento (y todas sus repeticiones)?')) { await post({ action: 'eliminarEvento', id: b.dataset.id }); return cargar(); }
    } catch (err) { alert('Error: ' + err.message); }
  });

  cargar();
});
