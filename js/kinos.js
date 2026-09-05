/**
 * js/kinos.js - Módulo KINOS
 */
KeepModule('kinos', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbweaI2vjh70zDNoCkofDc1r6BUukyZ-UUUH64_Mb3v3eqBbuC3aWRaTTWJoN7qkozy8/exec';
  const URL_KINOS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=kinos`;

  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

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

    const mesActualIdx = new Date().getMonth();
    const mesActualNombre = MESES[mesActualIdx];

    // Extract de películas por ver (Columna A y B)
    const porVer = [];
    rows.forEach(r => {
      const titulo = r['por_ver'] || r['Por_ver'] || r['POR_VER'] || '';
      const cat = r['categoria'] || r['Categoria'] || 'General';
      if (titulo.trim() !== '') {
        porVer.push({ titulo: titulo.trim(), categoria: cat.trim() });
      }
    });

    // Extract de películas vistas mapeadas por columna de mes
    const vistasPorMes = {};
    MESES.forEach(m => {
      vistasPorMes[m] = [];
      rows.forEach(r => {
        const peliVista = r[m] || '';
        if (peliVista.trim() !== '') {
          vistasPorMes[m].push(peliVista.trim());
        }
      });
    });

    let subseccionActiva = 'por_ver';
    let mesFiltroSeleccionado = mesActualNombre;

    function renderView() {
      let html = `
        <div class="space-y-4">
          <!-- Subsecciones Switcher -->
          <div class="grid grid-cols-2 gap-2 bg-emerald-950/40 p-1 rounded-2xl border border-emerald-800/40">
            <button id="tab-por-ver" class="py-2 text-xs font-black rounded-xl transition-all ${subseccionActiva === 'por_ver' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-400 hover:text-white'}">
              Por Ver (${porVer.length})
            </button>
            <button id="tab-vistas" class="py-2 text-xs font-black rounded-xl transition-all ${subseccionActiva === 'vistas' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-400 hover:text-white'}">
              Vistas por Mes
            </button>
          </div>
      `;

      // SUBSECCIÓN 1: POR VER
      if (subseccionActiva === 'por_ver') {
        html += `
          <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 space-y-3">
            <div class="flex justify-between items-center border-b border-gray-100 pb-2">
              <span class="text-xs font-bold text-gray-800 uppercase tracking-wider">Catálogo Pendiente</span>
              <span class="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">${porVer.length} pelis</span>
            </div>
            <div class="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
        `;

        if (porVer.length === 0) {
          html += `<p class="text-xs text-gray-400 text-center py-6">¡No quedan películas en la columna Por Ver!</p>`;
        } else {
          porVer.forEach(p => {
            html += `
              <div class="py-2.5 flex items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-bold text-gray-800 truncate">${p.titulo}</p>
                  <span class="inline-block mt-0.5 text-[9px] font-extrabold bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded uppercase">${p.categoria}</span>
                </div>
                <button data-titulo="${p.titulo}" class="btn-marcar-visto shrink-0 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-[11px] font-bold py-1.5 px-3 rounded-xl transition-all flex items-center gap-1">
                  ✓ Visto
                </button>
              </div>
            `;
          });
        }

        html += `</div></div>`;
      } 
      
      // SUBSECCIÓN 2: VISTAS POR MES
      else {
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
                <p class="font-bold text-gray-800 truncate">${p}</p>
                <span class="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Visto</span>
              </div>
            `;
          });
        }

        html += `</div></div>`;
      }

      // Modal para elegir mes
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

      // Eventos
      container.querySelector('#tab-por-ver')?.addEventListener('click', () => { subseccionActiva = 'por_ver'; renderView(); });
      container.querySelector('#tab-vistas')?.addEventListener('click', () => { subseccionActiva = 'vistas'; renderView(); });
      container.querySelector('#select-mes-filtro')?.addEventListener('change', (e) => { mesFiltroSeleccionado = e.target.value; renderView(); });

      const modal = container.querySelector('#modal-marcar-mes');
      const modalTitulo = container.querySelector('#modal-pelicula-titulo');
      const modalSelect = container.querySelector('#modal-select-mes');
      let peliculaSeleccionada = null;

      container.querySelectorAll('.btn-marcar-visto').forEach(btn => {
        btn.addEventListener('click', (e) => {
          peliculaSeleccionada = e.currentTarget.getAttribute('data-titulo');
          modalTitulo.textContent = peliculaSeleccionada;
          modalSelect.value = mesActualNombre;
          modal.classList.remove('hidden');
        });
      });

      container.querySelector('#btn-modal-cancelar')?.addEventListener('click', () => modal.classList.add('hidden'));

      container.querySelector('#btn-modal-confirmar')?.addEventListener('click', async () => {
        const mesElegido = modalSelect.value;
        modal.classList.add('hidden');

        // Mover localmente
        const idx = porVer.findIndex(p => p.titulo === peliculaSeleccionada);
        if (idx !== -1) porVer.splice(idx, 1);
        if (!vistasPorMes[mesElegido]) vistasPorMes[mesElegido] = [];
        vistasPorMes[mesElegido].push(peliculaSeleccionada);

        renderView();

        // Enviar evento al backend
        fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'moverPeliculaAMes',
            payload: { titulo: peliculaSeleccionada, mes: mesElegido }
          })
        }).catch(err => console.error('Error enviando película:', err));
      });
    }

    renderView();
  }

  const containerKinos = document.getElementById('modulo-kinos');
  if (containerKinos) renderKinos(containerKinos);
});
