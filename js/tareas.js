KeepModule('tareas', () => {
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyWKtIWZwNizUdny_IM37QoPLaCdwh3OeRtEXXgCid76tTuejEXbUts7k14ms583WCr/exec"; // el mismo backend seguro que usan los demás módulos

  const container = document.getElementById('sec-tareas');
  if (!container) return;

  let listaTareas = [];

  container.innerHTML = `
    <div class="border-l-4 border-amber-300 pl-3 mb-4">
      <h2 class="text-xl font-bold text-gray-800">Tareas</h2>
      <p class="text-xs text-gray-500">Priorizadas por Puntaje</p>
    </div>

    <div id="contenedor-lista-tareas" class="grid gap-2 lg:grid-cols-2">
      <div class="col-span-full p-4 bg-pastel-yellow/40 rounded-2xl border border-amber-100 text-sm text-gray-600 text-center animate-pulse">
        Cargando tareas ordenadas por puntaje...
      </div>
    </div>
  `;

  async function post(payload) {
    const r = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (j.status !== 'success') throw new Error(j.message || 'Error del servidor');
    return j;
  }

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
          <div class="col-span-full p-4 bg-red-50 rounded-2xl border border-red-100 text-sm text-red-600 text-center">
            Error al conectar con Google Sheets.
          </div>
        `;
      }
    }
  }

  const redondear = (n) => (n !== '' && Number.isFinite(Number(n))) ? Math.round(Number(n) * 10) / 10 : n;

  function renderizarLista() {
    const listWrapper = document.getElementById('contenedor-lista-tareas');
    if (!listWrapper) return;

    if (listaTareas.length === 0) {
      listWrapper.innerHTML = `
        <div class="col-span-full p-4 bg-pastel-yellow/30 rounded-2xl border border-amber-100 text-sm text-gray-500 text-center">
          No hay tareas en la hoja.
        </div>
      `;
      return;
    }

    // Ordenar por Puntaje (descendente)
    listaTareas.sort((a, b) => (b.puntaje || 0) - (a.puntaje || 0));

    listWrapper.innerHTML = listaTareas.map((item) => {
      const isDone = String(item.estado).toLowerCase() === 'finalizado';
      const enCurso = item.estado && !isDone && !/por iniciar/i.test(item.estado);

      // Etiquetas: una sola línea de texto pequeño en vez de una "pastilla" por dato
      const meta = [];
      const add = (etq, v) => {
        if (v !== '' && v !== null && v !== undefined) meta.push(`${etq} <b class="text-gray-600 font-semibold">${escapeHTML(v)}</b>`);
      };
      add('Urg', item.urgencia);
      add('Imp', item.importancia);
      add('Dif', item.dificultad);
      add('⏱', item.tiempo);
      add('$', item.costo);

      const lineaMeta = (meta.length || enCurso)
        ? `<p class="mt-0.5 pl-[1.625rem] text-[10px] text-gray-400 truncate">${enCurso ? `<span class="text-amber-600 font-bold">${escapeHTML(item.estado)}</span>${meta.length ? ' · ' : ''}` : ''}${meta.join(' · ')}</p>`
        : '';

      return `
        <div class="px-3 py-2 bg-white rounded-xl border border-gray-100 hover:border-amber-200 transition-all ${isDone ? 'opacity-50' : ''}">
          <div class="flex items-center gap-2.5">
            <input type="checkbox" class="chk-tarea w-4 h-4 shrink-0 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                   data-id="${escapeHTML(item.id)}" data-fila="${escapeHTML(item.fila || '')}" ${isDone ? 'checked' : ''} />
            <span class="flex-1 min-w-0 text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2 ${isDone ? 'line-through text-gray-400' : ''}">${escapeHTML(item.tarea)}</span>
            <span class="shrink-0 px-1.5 py-0.5 bg-amber-50 text-amber-700 font-bold text-[11px] rounded-md">★ ${escapeHTML(redondear(item.puntaje))}</span>
            <button type="button" class="btn-eliminar-tarea shrink-0 p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                    data-id="${escapeHTML(item.id)}" data-fila="${escapeHTML(item.fila || '')}" title="Eliminar tarea">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
          ${lineaMeta}
        </div>
      `;
    }).join('');

    vincularEventos();
  }

  function vincularEventos() {
    document.querySelectorAll('.chk-tarea').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const fila = e.target.getAttribute('data-fila');
        const nuevoEstado = e.target.checked ? 'finalizado' : 'Por iniciar';

        const tarea = listaTareas.find(t => String(t.id) === String(id));
        if (tarea) tarea.estado = nuevoEstado;
        renderizarLista();

        try {
          await post({ action: 'actualizarEstadoTarea', id: id, fila: fila, estado: nuevoEstado });
        } catch (err) {
          console.error('[Error al actualizar estado]:', err);
          alert('No se pudo guardar el cambio: ' + err.message);
          cargarTareas(); // vuelve al estado real del Sheet
        }
      });
    });

    document.querySelectorAll('.btn-eliminar-tarea').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const fila = e.currentTarget.getAttribute('data-fila');

        listaTareas = listaTareas.filter(t => String(t.id) !== String(id));
        renderizarLista();

        try {
          await post({ action: 'eliminarTarea', id: id, fila: fila });
        } catch (err) {
          console.error('[Error al eliminar tarea]:', err);
          alert('No se pudo eliminar: ' + err.message);
          cargarTareas();
        }
      });
    });
  }

  function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }

  cargarTareas();
});
