/**
 * js/tareas.js - Módulo de Gestión de Tareas por Prioridad
 */
KeepModule('tareas', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyJtZLRWn2hXiQFkEiyA6ioU0iOmUUs8Ab3afduHH6pwQEjGSpru6Aol-L6MGQTLPpn/exec';
  const URL_TAREAS_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=tareas`;

  let tareasGlobales = [];

  async function fetchCSV(url) {
    const res = await fetch(url);
    const csvText = await res.text();
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data)
      });
    });
  }

  async function setupTareas() {
    const container = document.getElementById('sec-tareas');
    if (!container) return;

    await cargarYRenderizar(container);
  }

  async function cargarYRenderizar(container) {
    container.innerHTML = `<p class="text-xs text-center text-gray-400 py-6">Cargando tareas...</p>`;
    try {
      const rawData = await fetchCSV(URL_TAREAS_CSV);
      tareasGlobales = rawData.filter(t => t.ID && t.Tarea);
      renderView(container);
    } catch (err) {
      container.innerHTML = `<p class="text-xs text-center text-red-500 py-6">Error al cargar tareas: ${err.message}</p>`;
    }
  }

  function renderView(container) {
    const filtroUrgencia = document.getElementById('filtro-urgencia')?.value || 'TODOS';
    const filtroEstado = document.getElementById('filtro-estado')?.value || 'TODOS';

    let tareasFiltradas = tareasGlobales.filter(t => {
      const matchUrgencia = filtroUrgencia === 'TODOS' || t.Urgencia === filtroUrgencia;
      const matchEstado = filtroEstado === 'TODOS' || t.Estado === filtroEstado;
      return matchUrgencia && matchEstado;
    });

    tareasFiltradas.sort((a, b) => {
      const aListo = a.Estado === 'Listo' || a.Estado === 'Completada';
      const bListo = b.Estado === 'Listo' || b.Estado === 'Completada';
      
      if (aListo !== bListo) return aListo ? 1 : -1;
      return (parseInt(b.PUNTAJE) || 0) - (parseInt(a.PUNTAJE) || 0);
    });

    let html = `
      <div class="border-l-4 border-amber-300 pl-3 mb-4">
        <h2 class="text-xl font-bold text-gray-800">Tareas</h2>
        <p class="text-xs text-gray-500">Prioridad por puntaje</p>
      </div>

      <div class="space-y-4">
        <!-- Filtros -->
        <div class="flex gap-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
          <div class="flex-1">
            <label class="block text-[9px] font-bold text-gray-400 uppercase mb-1">Urgencia</label>
            <select id="filtro-urgencia" class="w-full bg-gray-50 text-xs p-1.5 rounded-xl border border-gray-200 outline-none">
              <option value="TODOS">Todas</option>
              <option value="Hoy" ${filtroUrgencia === 'Hoy' ? 'selected' : ''}>Hoy</option>
              <option value="Pronto" ${filtroUrgencia === 'Pronto' ? 'selected' : ''}>Pronto</option>
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-[9px] font-bold text-gray-400 uppercase mb-1">Estado</label>
            <select id="filtro-estado" class="w-full bg-gray-50 text-xs p-1.5 rounded-xl border border-gray-200 outline-none">
              <option value="TODOS">Todos</option>
              <option value="Por iniciar" ${filtroEstado === 'Por iniciar' ? 'selected' : ''}>Por iniciar</option>
              <option value="En proceso" ${filtroEstado === 'En proceso' ? 'selected' : ''}>En proceso</option>
              <option value="Listo" ${filtroEstado === 'Listo' ? 'selected' : ''}>Listo</option>
            </select>
          </div>
        </div>

        <!-- Lista de Tareas -->
        <div class="space-y-2">
    `;

    if (tareasFiltradas.length === 0) {
      html += `<p class="text-xs text-center text-gray-400 py-6">No se encontraron tareas.</p>`;
    } else {
      tareasFiltradas.forEach(t => {
        const esCompletada = t.Estado === 'Listo' || t.Estado === 'Completada';
        
        html += `
          <div class="p-3 bg-white rounded-2xl border border-gray-100 shadow-xs flex justify-between items-start gap-3 ${esCompletada ? 'opacity-50' : ''}">
            <div class="flex items-start gap-2.5 flex-1">
              <input type="checkbox" data-id="${t.ID}" class="chk-completar mt-1 rounded text-emerald-600 focus:ring-0 cursor-pointer" ${esCompletada ? 'checked' : ''}>
              <div class="space-y-1">
                <p class="text-xs font-bold text-gray-800 ${esCompletada ? 'line-through text-gray-400' : ''}">${t.Tarea}</p>
                <div class="flex flex-wrap gap-1 text-[9px]">
                  ${t.Urgencia ? `<span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold">${t.Urgencia}</span>` : ''}
                  ${t.Importancia ? `<span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold">${t.Importancia}</span>` : ''}
                  ${t.Dificultad ? `<span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold">${t.Dificultad}</span>` : ''}
                  ${t.Tiempo ? `<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-semibold">${t.Tiempo}</span>` : ''}
                  ${t.Costo ? `<span class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">${t.Costo}</span>` : ''}
                </div>
              </div>
            </div>
            
            <div class="flex flex-col items-end gap-2">
              <span class="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">${t.PUNTAJE || 0} pts</span>
              <button data-id="${t.ID}" class="btn-eliminar text-[10px] text-red-400 hover:text-red-600 font-semibold transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        `;
      });
    }

    html += `</div></div>`;
    container.innerHTML = html;

    // Listeners
    container.querySelector('#filtro-urgencia').addEventListener('change', () => renderView(container));
    container.querySelector('#filtro-estado').addEventListener('change', () => renderView(container));

    container.querySelectorAll('.chk-completar').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const nuevoEstado = e.target.checked ? 'Listo' : 'Por iniciar';
        
        const t = tareasGlobales.find(item => item.ID === id);
        if (t) t.Estado = nuevoEstado;
        renderView(container);

        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'actualizarEstadoTarea', payload: { id, estado: nuevoEstado } })
        });
      });
    });

    container.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (!confirm(`¿Eliminar la tarea de Google Sheets?`)) return;

        tareasGlobales = tareasGlobales.filter(item => item.ID !== id);
        renderView(container);

        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'eliminarTarea', payload: { id } })
        });
      });
    });
  }

  setupTareas();
});
