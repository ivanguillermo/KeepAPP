const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxXbq9KrCe60g4fPOd0lJ_sAuMuOfaY8_BoI95cGmY838nbDZLCA8MF2KU_GpNsf3lO/exec';
const URL_TAREAS_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=tareas`;

let tareasGlobales = [];

async function setupTareas(container) {
  if (!container) return;

  async function cargarYRenderizar() {
    container.innerHTML = `<p class="text-xs text-center text-gray-400 py-6">Cargando tareas...</p>`;
    try {
      const rawData = await fetchCSV(URL_TAREAS_CSV);
      // Filtrar filas vacías o sin ID válido
      tareasGlobales = rawData.filter(t => t.ID && t.Tarea);
      renderView();
    } catch (err) {
      container.innerHTML = `<p class="text-xs text-center text-red-500 py-6">Error al cargar tareas: ${err.message}</p>`;
    }
  }

  function renderView() {
    const filtroUrgencia = document.getElementById('filtro-urgencia')?.value || 'TODOS';
    const filtroEstado = document.getElementById('filtro-estado')?.value || 'TODOS';

    // Filtrar tareas según selecciones
    let tareasFiltradas = tareasGlobales.filter(t => {
      const matchUrgencia = filtroUrgencia === 'TODOS' || t.Urgencia === filtroUrgencia;
      const matchEstado = filtroEstado === 'TODOS' || t.Estado === filtroEstado;
      return matchUrgencia && matchEstado;
    });

    // Ordenar: primero por estado (activas primero, completadas al fondo) y luego por PUNTAJE descendente
    tareasFiltradas.sort((a, b) => {
      const aListo = a.Estado === 'Listo' || a.Estado === 'Completada';
      const bListo = b.Estado === 'Listo' || b.Estado === 'Completada';
      
      if (aListo !== bListo) return aListo ? 1 : -1;
      return (parseInt(b.PUNTAJE) || 0) - (parseInt(a.PUNTAJE) || 0);
    });

    let html = `
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
                  <span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold">${t.Urgencia}</span>
                  <span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold">${t.Importancia}</span>
                  <span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold">${t.Dificultad}</span>
                  <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-semibold">${t.Tiempo}</span>
                  <span class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">${t.Costo}</span>
                </div>
              </div>
            </div>
            
            <div class="flex flex-col items-end gap-2">
              <span class="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">${t.PUNTAJE} pts</span>
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

    // Listeners para filtros
    container.querySelector('#filtro-urgencia').addEventListener('change', renderView);
    container.querySelector('#filtro-estado').addEventListener('change', renderView);

    // Listeners para marcar como listo
    container.querySelectorAll('.chk-completar').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const nuevoEstado = e.target.checked ? 'Listo' : 'Por iniciar';
        
        // Cambio local reactivo
        const t = tareasGlobales.find(item => item.ID === id);
        if (t) t.Estado = nuevoEstado;
        renderView();

        // Petición remota
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'actualizarEstadoTarea', payload: { id, estado: nuevoEstado } })
        });
      });
    });

    // Listeners para eliminar
    container.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (!confirm(`¿Eliminar la tarea ${id} de Google Sheets?`)) return;

        // Eliminar local
        tareasGlobales = tareasGlobales.filter(item => item.ID !== id);
        renderView();

        // Petición remota
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'eliminarTarea', payload: { id } })
        });
      });
    });
  }

  cargarYRenderizar();
}
