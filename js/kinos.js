/**
 * js/kinos.js - Módulo KINOS
 * "Por ver" tiene varias listas (columnas del Sheet): por_ver (general), aleman, frances, nihon.
 */
KeepModule('kinos', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const APPS_SCRIPT_URL = window.KEEP_BACKEND_URL;
  const URL_KINOS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=kinos`;

  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  // id = nombre de la columna en la hoja "kinos"
  const LISTAS = [
    { id: 'por_ver', etiqueta: 'General' },
    { id: 'aleman', etiqueta: 'Alemán' },
    { id: 'frances', etiqueta: 'Francés' },
    { id: 'nihon', etiqueta: 'Nihon' }
  ];

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Lee una columna sin importar mayúsculas ni tildes en el encabezado
  const col = (r, nombre) => {
    for (const k in r) if (norm(k) === nombre) return String(r[k] ?? '');
    return '';
  };

  function fetchCSV(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: false, // Mantener para alinear filas
        complete: (res) => resolve(res.data),
        error: (err) => reject(err)
      });
    });
  }

  async function renderKinos(container) {
    if (!container) return;

    let rows = [];
    try {
      rows = await fetchCSV(URL_KINOS);
    } catch (e) {
      console.error('Error cargando Kinos:', e);
    }

    const mesActualNombre = MESES[new Date().getMonth()];

    // Por ver: una lista por columna
    const porVer = {};
    LISTAS.forEach(l => {
      porVer[l.id] = [];
      rows.forEach(r => {
        const titulo = col(r, l.id).trim();
        if (titulo === '') return;
        const categoria = l.id === 'por_ver' ? (col(r, 'categoria').trim() || '') : '';
        porVer[l.id].push({ titulo, categoria });
      });
    });
    const totalPorVer = () => LISTAS.reduce((n, l) => n + porVer[l.id].length, 0);

    // Vistas por mes
    const vistasPorMes = {};
    MESES.forEach(m => {
      vistasPorMes[m] = [];
      rows.forEach(r => {
        const v = col(r, m).trim();
        if (v !== '') vistasPorMes[m].push(v);
      });
    });

    let subseccionActiva = 'por_ver';
    let listaActiva = 'por_ver';
    let mesFiltroSeleccionado = mesActualNombre;

    function renderView() {
      let html = `
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-2 bg-emerald-950/40 p-1 rounded-2xl border border-emerald-800/40">
            <button id="tab-por-ver" class="py-2 text-xs font-black rounded-xl transition-all ${subseccionActiva === 'por_ver' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-400 hover:text-white'}">
              Por Ver (${totalPorVer()})
            </button>
            <button id="tab-vistas" class="py-2 text-xs font-black rounded-xl transition-all ${subseccionActiva === 'vistas' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-400 hover:text-white'}">
              Vistas por Mes
            </button>
          </div>
      `;

      if (subseccionActiva === 'por_ver') {
        const lista = porVer[listaActiva];
        const etiqueta = LISTAS.find(l => l.id === listaActiva).etiqueta;

        html += `
          <div class="flex gap-1.5 overflow-x-auto pb-0.5">
            ${LISTAS.map(l => `
              <button data-lista="${l.id}" class="btn-lista shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${l.id === listaActiva ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}">
                ${l.etiqueta} <span class="opacity-70">${porVer[l.id].length}</span>
              </button>`).join('')}
          </div>

          <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 space-y-3">
            <div class="flex justify-between items-center border-b border-gray-100 pb-2">
              <span class="text-xs font-bold text-gray-800 uppercase tracking-wider">Por ver · ${etiqueta}</span>
              <span class="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">${lista.length} pelis</span>
            </div>
            <div class="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
        `;

        if (lista.length === 0) {
          html += `<p class="text-xs text-gray-400 text-center py-6">No hay películas en esta lista.</p>`;
        } else {
          lista.forEach((p, i) => {
            html += `
              <div class="py-2.5 flex items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-bold text-gray-800 truncate">${esc(p.titulo)}</p>
                  ${p.categoria ? `<span class="inline-block mt-0.5 text-[9px] font-extrabold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">${esc(p.categoria)}</span>` : ''}
                </div>
                <button data-i="${i}" class="btn-marcar-visto shrink-0 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-[11px] font-bold py-1.5 px-3 rounded-xl transition-all">
                  ✓ Visto
                </button>
              </div>
            `;
          });
        }

        html += `</div></div>`;
      } else {
        const optsMeses = MESES.map(m => `<option value="${m}" ${m === mesFiltroSeleccionado ? 'selected' : ''}>${m.toUpperCase()}</option>`).join('');
        const pelisDelMes = vistasPorMes[mesFiltroSeleccionado] || [];

        html += `
          <div class="space-y-3">
            <div class="bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
              <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Seleccionar Mes:</label>
              <select id="select-mes-filtro" class="bg-emerald-50 text-emerald-900 text-xs font-black py-1.5 px-3 rounded-xl border border-emerald-200 outline-none uppercase">
                ${optsMeses}
              </select>
            </div>

            <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 space-y-2 max-h-[55vh] overflow-y-auto">
              <div class="flex justify-between items-center border-b border-gray-100 pb-2">
                <span class="text-xs font-bold text-gray-800 uppercase tracking-wider">Vistas en ${mesFiltroSeleccionado}</span>
                <span class="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">${pelisDelMes.length} en total</span>
              </div>
        `;

        if (pelisDelMes.length === 0) {
          html += `<p class="text-xs text-gray-400 text-center py-6">No hay películas registradas en ${mesFiltroSeleccionado}.</p>`;
        } else {
          pelisDelMes.forEach(p => {
            html += `
              <div class="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                <p class="font-bold text-gray-800 truncate">${esc(p)}</p>
                <span class="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Visto</span>
              </div>
            `;
          });
        }

        html += `</div></div>`;
      }

      html += `
        <div id="modal-marcar-mes" class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 hidden">
          <div class="bg-white rounded-2xl p-4 w-full max-w-xs shadow-xl space-y-3">
            <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider text-center">¿En qué mes la viste?</h4>
            <p id="modal-pelicula-titulo" class="text-xs font-black text-emerald-700 text-center truncate"></p>

            <select id="modal-select-mes" class="w-full bg-gray-50 text-xs font-bold p-2.5 rounded-xl border border-gray-200 outline-none text-gray-800 uppercase">
              ${MESES.map(m => `<option value="${m}" ${m === mesActualNombre ? 'selected' : ''}>${m.toUpperCase()}</option>`).join('')}
            </select>

            <div class="flex gap-2 pt-1">
              <button id="btn-modal-cancelar" class="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-xl">Cancelar</button>
              <button id="btn-modal-confirmar" class="flex-1 bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl">Guardar</button>
            </div>
          </div>
        </div>
      </div>`;

      container.innerHTML = html;

      container.querySelector('#tab-por-ver')?.addEventListener('click', () => { subseccionActiva = 'por_ver'; renderView(); });
      container.querySelector('#tab-vistas')?.addEventListener('click', () => { subseccionActiva = 'vistas'; renderView(); });
      container.querySelector('#select-mes-filtro')?.addEventListener('change', (e) => { mesFiltroSeleccionado = e.target.value; renderView(); });
      container.querySelectorAll('.btn-lista').forEach(b => b.addEventListener('click', () => { listaActiva = b.dataset.lista; renderView(); }));

      const modal = container.querySelector('#modal-marcar-mes');
      const modalTitulo = container.querySelector('#modal-pelicula-titulo');
      const modalSelect = container.querySelector('#modal-select-mes');
      let seleccion = null; // { titulo, origen }

      container.querySelectorAll('.btn-marcar-visto').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const p = porVer[listaActiva][Number(e.currentTarget.dataset.i)];
          seleccion = { titulo: p.titulo, origen: listaActiva };
          modalTitulo.textContent = p.titulo;
          modalSelect.value = mesActualNombre;
          modal.classList.remove('hidden');
        });
      });

      container.querySelector('#btn-modal-cancelar')?.addEventListener('click', () => modal.classList.add('hidden'));

      container.querySelector('#btn-modal-confirmar')?.addEventListener('click', async () => {
        const mesElegido = modalSelect.value;
        const { titulo, origen } = seleccion;
        modal.classList.add('hidden');

        // Se mueve al instante en pantalla...
        const idx = porVer[origen].findIndex(p => p.titulo === titulo);
        if (idx !== -1) porVer[origen].splice(idx, 1);
        vistasPorMes[mesElegido].push(titulo);
        renderView();

        // ...y se guarda en el Sheet; si falla, se avisa y se recarga lo real
        try {
          const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'moverPeliculaAMes', payload: { titulo, mes: mesElegido, origen } })
          });
          const j = await res.json();
          if (j.status !== 'success') throw new Error(j.message || 'Error del servidor');
        } catch (err) {
          console.error('Error al guardar en Kinos:', err);
          alert('No se pudo guardar en el Sheet: ' + err.message);
          renderKinos(container);
        }
      });
    }

    renderView();
  }

  const containerKinos = document.getElementById('modulo-kinos');
  if (containerKinos) renderKinos(containerKinos);
});
