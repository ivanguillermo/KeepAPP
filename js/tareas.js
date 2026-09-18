KeepModule('tareas', () => {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwLzgESw0kG2zdZbkLBbpFdGNOFoNPIC2JpkUkKGfbi43L29q0MESmVL1vV5htM6YOd/exec';

  const container = document.getElementById('sec-tareas');
  if (!container) return;

  let listaTareas = [];

  container.innerHTML = `
    <div class="border-l-4 border-amber-300 pl-3 mb-4">
      <h2 class="text-xl font-bold text-gray-800">Tareas</h2>
      <p class="text-xs text-gray-500">Priorizadas por Puntaje</p>
    </div>

    <div id="contenedor-lista-tareas" class="space-y-3">
      <div class="p-4 bg-pastel-yellow/40 rounded-2xl border border-amber-100 text-sm text-gray-600 text-center animate-pulse">
        Cargando tareas ordenadas por puntaje...
      </div>
    </div>
  `;

  async function cargarTareas() {
    const listWrapper = document.getElementById('contenedor-lista-tareas');
    try {
      const resp = await fetch(`${APPS_SCRIPT_URL}?action=obtenerTareas`);
      const data = await resp.json();

      if (data.status === 'success') {
        listaTareas = data.tareas || [];
        renderizarLista();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error('[Tareas Error]:', err);
      if (listWrapper) {
        listWrapper.innerHTML = `
          <div class="p-4 bg-red-50 rounded-2xl border border-red-100 text-sm text-red-600 text-center">
            Error al conectar con Google Sheets.
          </div>
        `;
      }
    }
  }

  function renderizarLista() {
    const listWrapper = document.getElementById('contenedor-lista-tareas');
    if (!listWrapper) return;

    if (listaTareas.length === 0) {
      listWrapper.innerHTML = `
        <div class="p-4 bg-pastel-yellow/30 rounded-2xl border border-amber-100 text-sm text-gray-500 text-center">
          No hay tareas en la hoja.
        </div>
      `;
      return;
    }

    // Asegurar ordenamiento por Puntaje (Descendente)
    listaTareas.sort((a, b) => (b.puntaje || 0) - (a.puntaje || 0));

    listWrapper.innerHTML = listaTareas.map((item) => {
      const isDone = String(item.estado).toLowerCase() === 'finalizado';

      return `
        <div class="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs hover:border-amber-200 transition-all ${isDone ? 'opacity-60 bg-gray-50' : ''}">
          <!-- Cabecera de la tarjeta: Checkbox, Título, Puntaje y Eliminar -->
          <div class="flex items-start justify-between gap-2 mb-2.5">
            <label class="flex items-center gap-3 flex-1 cursor-pointer select-none">
              <input 
                type="checkbox" 
                class="chk-tarea w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer mt-0.5" 
                data-id="${item.id}"
                data-fila="${item.fila || ''}"
                ${isDone ? 'checked' : ''}
              />
              <span class="text-sm font-semibold text-gray-800 leading-snug ${isDone ? 'line-through text-gray-400' : ''}">
                ${escapeHTML(item.tarea)}
              </span>
            </label>

            <div class="flex items-center gap-2">
              <!-- Insignia del Puntaje -->
              <span class="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-xs rounded-lg border border-amber-200">
                ★ ${item.puntaje}
              </span>

              <button 
                type="button" 
                class="btn-eliminar-tarea p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                data-id="${item.id}"
                data-fila="${item.fila || ''}"
                title="Eliminar tarea"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Bloque de Etiquetas con tus encabezados -->
          <div class="flex flex-wrap gap-1.5 pt-2 border-t border-gray-50 text-[11px] font-medium text-gray-600">
            ${item.estado ? `<span class="px-2 py-0.5 rounded-md ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}">Estado: <b>${escapeHTML(item.estado)}</b></span>` : ''}
            ${item.urgencia !== '' ? `<span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-100">Urg: <b>${item.urgencia}</b></span>` : ''}
            ${item.importancia !== '' ? `<span class="px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100">Imp: <b>${item.importancia}</b></span>` : ''}
            ${item.dificultad !== '' ? `<span class="px-2 py-0.5 rounded-md bg-sky-50 text-sky-600 border border-sky-100">Dif: <b>${item.dificultad}</b></span>` : ''}
            ${item.tiempo !== '' ? `<span class="px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-100">Tiempo: <b>${item.tiempo}</b></span>` : ''}
            ${item.costo !== '' ? `<span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">Costo: <b>${item.costo}</b></span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    vincularEventos();
  }

  function vincularEventos() {
    // Checkbox Estado
    document.querySelectorAll('.chk-tarea').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const fila = e.target.getAttribute('data-fila');
        const nuevoEstado = e.target.checked ? 'finalizado' : 'Por iniciar';

        const tarea = listaTareas.find(t => String(t.id) === String(id));
        if (tarea) tarea.estado = nuevoEstado;
        renderizarLista();

        try {
          await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'actualizarEstadoTarea',
              id: id,
              fila: fila,
              estado: nuevoEstado
            })
          });
        } catch (err) {
          console.error('[Error al actualizar estado]:', err);
        }
      });
    });

    // Eliminar
    document.querySelectorAll('.btn-eliminar-tarea').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const fila = e.currentTarget.getAttribute('data-fila');

        listaTareas = listaTareas.filter(t => String(t.id) !== String(id));
        renderizarLista();

        try {
          await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'eliminarTarea', id: id, fila: fila })
          });
        } catch (err) {
          console.error('[Error al eliminar tarea]:', err);
        }
      });
    });
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  cargarTareas();
});
