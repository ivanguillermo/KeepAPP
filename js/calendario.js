/**
 * Módulo para Notas de Calendario y Eventos Online Clickeables
 */
KeepModule('agenda', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const URL_NOTAS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=notas_calendario`;
  const URL_EVENTOS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=eventos_online`;

  function fetchCSV(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data),
        error: (err) => reject(err)
      });
    });
  }

  async function renderAgenda(container) {
    if (!container) return;

    let notas = [];
    let eventos = [];

    try {
      const [resNotas, resEventos] = await Promise.all([
        fetchCSV(URL_NOTAS).catch(() => []),
        fetchCSV(URL_EVENTOS).catch(() => [])
      ]);
      notas = resNotas;
      eventos = resEventos;
    } catch (e) {
      console.error('Error cargando agenda:', e);
    }

    const hoyStr = new Date().toISOString().slice(0, 10);

    let html = `
      <div class="space-y-4">
        <!-- SECCIÓN 1: EVENTOS ONLINE (Interactive Links) -->
        <div class="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Próximos Eventos Online
            </h3>
            <span class="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">${eventos.length} programados</span>
          </div>

          <div class="space-y-2 max-h-48 overflow-y-auto">
    `;

    if (eventos.length === 0) {
      html += `<p class="text-xs text-gray-400 text-center py-3">No hay eventos online agendados.</p>`;
    } else {
      eventos.forEach(ev => {
        html += `
          <a href="${ev.Link}" target="_blank" rel="noopener noreferrer" 
             class="group flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-emerald-50/60 border border-gray-100 hover:border-emerald-200 transition-all duration-150">
            <div class="min-w-0 flex-1 pr-2">
              <div class="flex items-center gap-2">
                <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">${ev.Plataforma || 'Link'}</span>
                <p class="text-xs font-bold text-gray-800 group-hover:text-emerald-900 truncate">${ev.Título}</p>
              </div>
              <p class="text-[10px] text-gray-400 mt-1">${ev.Fecha} ${ev.Hora ? '• ' + ev.Hora : ''}</p>
            </div>
            <div class="shrink-0 text-emerald-600 group-hover:translate-x-0.5 transition-transform">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
            </div>
          </a>
        `;
      });
    }

    html += `
          </div>
        </div>

        <!-- SECCIÓN 2: CALENDARIO / NOTAS BREVES -->
        <div class="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs space-y-3">
          <p class="text-xs font-bold text-gray-800 uppercase tracking-wider">Notas Clave de Calendario</p>
          <div class="divide-y divide-gray-100 max-h-52 overflow-y-auto">
    `;

    if (notas.length === 0) {
      html += `<p class="text-xs text-gray-400 text-center py-3">Sin notas importantes registradas.</p>`;
    } else {
      notas.forEach(n => {
        const esHoy = n.Fecha === hoyStr;
        html += `
          <div class="py-2 flex items-start justify-between gap-3">
            <div class="flex items-start gap-2 min-w-0">
              <span class="shrink-0 mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${esHoy ? 'bg-amber-100 text-amber-800 font-extrabold' : 'bg-gray-100 text-gray-600'}">
                ${n.Fecha}
              </span>
              <p class="text-xs text-gray-700 leading-snug break-words">${n.Nota}</p>
            </div>
          </div>
        `;
      });
    }

    html += `
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  const containerAgenda = document.getElementById('modulo-agenda');
  if (containerAgenda) renderAgenda(containerAgenda);
});
