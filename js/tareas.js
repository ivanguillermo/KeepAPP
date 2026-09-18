KeepModule('tareas', () => {
  // CONFIGURA TU URL DE GOOGLE APPS SCRIPT AQUÍ
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxR3qcDAililGcgBZhIy9JGn2E5bdbKXZSdf6HvsFkfNhDuz-JDfqbDUXggl8VtuUy5/exec';

  const container = document.getElementById('sec-tareas');
  if (!container) return;

  let listaTareas = [];

  // 1. Render inicial de la estructura en la sección #sec-tareas
  container.innerHTML = `
    <div class="border-l-4 border-amber-300 pl-3 mb-4">
      <h2 class="text-xl font-bold text-gray-800">Tareas</h2>
      <p class="text-xs text-gray-500">Gestión sincronizada con Google Sheets</p>
    </div>

    <!-- Formulario para agregar tarea -->
    <form id="form-nueva-tarea" class="flex gap-2 mb-4">
      <input 
        type="text" 
        id="input-nueva-tarea" 
        placeholder="Escribe una nueva tarea..." 
        required 
        class="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
      <button 
        type="submit" 
        class="px-4 py-2 bg-amber-400 text-gray-900 font-semibold text-sm rounded-xl hover:bg-amber-500 active:scale-95 transition-all shadow-xs"
      >
        +
      </button>
    </form>

    <!-- Contenedor para la lista / feedback -->
    <div id="contenedor-lista-tareas" class="space-y-2">
      <div class="p-4 bg-pastel-yellow/40 rounded-2xl border border-amber-100 text-sm text-gray-600 text-center animate-pulse">
        Cargando tareas desde Google Sheets...
      </div>
    </div>
  `;

  // 2. Función para obtener las tareas de la pestaña 'tareas'
  async function cargarTareas() {
    const listWrapper = document.getElementById('contenedor-lista-tareas');
    
    try {
      const resp = await fetch(`${APPS_SCRIPT_URL}?action=obtenerTareas`);
      const data = await resp.json();

      if (data.status === 'success') {
        listaTareas = data.tareas || [];
        renderizarLista();
      } else {
        throw new Error(data.message || 'Error al obtener datos');
      }
    } catch (err) {
      console.error('[Tareas Error]:', err);
      if (listWrapper) {
        listWrapper.innerHTML = `
          <div class="p-4 bg-red-50 rounded-2xl border border-red-100 text-sm text-red-600 text-center">
            Error al conectar con la hoja de calculo.
          </div>
        `;
      }
    }
  }

  // 3. Renderizar la lista de tareas en el DOM
  function renderizarLista() {
    const listWrapper = document.getElementById('contenedor-lista-tareas');
    if (!listWrapper) return;

    if (listaTareas.length === 0) {
      listWrapper.innerHTML = `
        <div class="p-4 bg-pastel-yellow/30 rounded-2xl border border-amber-100 text-sm text-gray-500 text-center">
          No hay tareas pendientes en la hoja.
        </div>
      `;
      return;
    }

    listWrapper.innerHTML = listaTareas.map((item) => {
      const isDone = String(item.estado).toLowerCase() === 'finalizado';

      return `
        <div class="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-100 shadow-xs hover:border-amber-200 transition-all ${isDone ? 'opacity-60 bg-gray-50' : ''}">
          <label class="flex items-center gap-3 flex-1 cursor-pointer select-none pr-2">
            <input 
              type="checkbox" 
              class="chk-tarea w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer" 
              data-id="${item.id}"
              data-fila="${item.fila || ''}"
              ${isDone ? 'checked' : ''}
            />
            <span class="text-sm text-gray-800 ${isDone ? 'line-through text-gray-400' : 'font-medium'}">
              ${escapeHTML(item.tarea)}
            </span>
          </label>
          <button 
            type="button" 
            class="btn-eliminar-tarea p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all"
            data-id="${item.id}"
            data-fila="${item.fila || ''}"
            title="Eliminar tarea"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      `;
    }).join('');

    vincularEventosItems();
  }

  // 4. Vincular los eventos de los Checkbox y Botones de Eliminar
  function vincularEventosItems() {
    // Evento Checkbox (Cambiar estado a 'finalizado' o 'pendiente')
    document.querySelectorAll('.chk-tarea').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const fila = e.target.getAttribute('data-fila');
        const nuevoEstado = e.target.checked ? 'finalizado' : 'pendiente';

        // Actualización optimista en local
        const tarea = listaTareas.find(t => String(t.id) === String(id));
        if (tarea) tarea.estado = nuevoEstado;
        renderizarLista();

        // Petición POST a Google Apps Script
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

    // Evento Eliminar Tarea
    document.querySelectorAll('.btn-eliminar-tarea').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const button = e.currentTarget;
        const id = button.getAttribute('data-id');
        const fila = button.getAttribute('data-fila');

        // Eliminar optimistamente de la lista local
        listaTareas = listaTareas.filter(t => String(t.id) !== String(id));
        renderizarLista();

        // Petición POST a Google Apps Script
        try {
          await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'eliminarTarea',
              id: id,
              fila: fila
            })
          });
        } catch (err) {
          console.error('[Error al eliminar tarea]:', err);
        }
      });
    });
  }

  // 5. Evento para Guardar Nueva Tarea
  const form = document.getElementById('form-nueva-tarea');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('input-nueva-tarea');
      const texto = input.value.trim();
      if (!texto) return;

      const tempId = 'task_' + Date.now();
      const nuevaTarea = { id: tempId, tarea: texto, estado: 'pendiente' };

      // Agregar visualmente
      listaTareas.push(nuevaTarea);
      input.value = '';
      renderizarLista();

      // Enviar a Google Apps Script
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'crearTarea',
            id: tempId,
            tarea: texto,
            estado: 'pendiente'
          })
        });
      } catch (err) {
        console.error('[Error al crear tarea]:', err);
      }
    });
  }

  // Helper para escapar código HTML y evitar inyecciones
  function escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // Iniciar la carga de tareas al cargar el módulo
  cargarTareas();
});
