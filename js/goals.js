/**
 * Módulo BBM (Body Building & Metrics) con carga remota vía PapaParse
 */
KeepModule('bbm', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  
  const URLS = {
    rutina: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Rutina`,
    medidas: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Medidas`,
    records: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Records`
  };

  // Función helper para cargar CSV con PapaParse retornando una Promesa
  function fetchCSV(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error)
      });
    });
  }

  // 1. Renderizar Rutina
  function renderRutina(data) {
    const container = document.getElementById('bbm-rutina');
    if (!container) return;

    const dias = {};
    data.forEach(item => {
      const dia = item.dia || item.Dia || 'General';
      if (!dias[dia]) dias[dia] = [];
      dias[dia].push(item);
    });

    let html = '<div class="space-y-4">';
    for (const [dia, ejercicios] of Object.entries(dias)) {
      html += `
        <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100">
          <div class="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
            <span class="font-bold text-emerald-800 text-sm tracking-wide uppercase">${dia}</span>
            <span class="text-xs bg-pastel-green text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">${ejercicios.length} ejercicios</span>
          </div>
          <div class="divide-y divide-gray-50">
      `;

      ejercicios.forEach(ej => {
        html += `
          <div class="py-2.5 flex items-center justify-between gap-2">
            <div class="flex-1">
              <p class="font-semibold text-gray-800 text-sm">${ej.ejercicio || ej.Ejercicio}</p>
              ${ej.notas || ej.Notas ? `<p class="text-xs text-emerald-600 mt-0.5">💡 ${ej.notas || ej.Notas}</p>` : ''}
            </div>
            <div class="text-right whitespace-nowrap">
              <span class="inline-block text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                ${ej.series || ej.Series} × ${ej.reps || ej.Reps}
              </span>
            </div>
          </div>
        `;
      });

      html += `</div></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
  }

  // 2. Renderizar Medidas
  function renderMedidas(data) {
    const container = document.getElementById('bbm-medidas');
    if (!container) return;

    let html = '<div class="space-y-3">';
    const medidasOrdenadas = [...data].reverse();

    medidasOrdenadas.forEach(med => {
      html += `
        <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 space-y-3">
          <div class="flex justify-between items-center border-b border-gray-100 pb-2">
            <span class="text-xs font-bold text-gray-400">${med.fecha || med.Fecha}</span>
            <div class="text-emerald-700 font-black text-base">${med.peso || med.Peso} <span class="text-xs font-medium">kg</span></div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="bg-pastel-green/30 p-2 rounded-xl">
              <span class="block text-gray-400 text-[10px] uppercase font-bold">Brazo</span>
              <span class="font-bold text-gray-800">${med.brazo || med.Brazo} cm</span>
            </div>
            <div class="bg-pastel-green/30 p-2 rounded-xl">
              <span class="block text-gray-400 text-[10px] uppercase font-bold">Pecho</span>
              <span class="font-bold text-gray-800">${med.pecho || med.Pecho} cm</span>
            </div>
            <div class="bg-pastel-green/30 p-2 rounded-xl">
              <span class="block text-gray-400 text-[10px] uppercase font-bold">Cintura</span>
              <span class="font-bold text-gray-800">${med.cintura || med.Cintura} cm</span>
            </div>
            <div class="bg-pastel-green/30 p-2 rounded-xl">
              <span class="block text-gray-400 text-[10px] uppercase font-bold">Muslo</span>
              <span class="font-bold text-gray-800">${med.muslo || med.Muslo} cm</span>
            </div>
            <div class="bg-pastel-green/30 p-2 rounded-xl col-span-2">
              <span class="block text-gray-400 text-[10px] uppercase font-bold">% Grasa</span>
              <span class="font-bold text-emerald-800">${med.grasa || med.Grasa}%</span>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  // 3. Renderizar Records
  function renderRecords(data) {
    const container = document.getElementById('bbm-records');
    if (!container) return;

    const porEjercicio = {};
    data.forEach(rec => {
      const ej = rec.ejercicio || rec.Ejercicio;
      if (!porEjercicio[ej]) porEjercicio[ej] = [];
      porEjercicio[ej].push(rec);
    });

    let html = '<div class="space-y-4">';
    for (const [ejercicio, records] of Object.entries(porEjercicio)) {
      html += `
        <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100">
          <h3 class="font-bold text-gray-800 text-sm mb-3 border-b border-gray-100 pb-2">${ejercicio}</h3>
          <div class="grid grid-cols-2 gap-2">
      `;

      records.forEach(r => {
        html += `
          <div class="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <div>
              <span class="text-[10px] font-black tracking-wider text-emerald-600 block uppercase">${r.reps || r.Reps}</span>
              <span class="text-[10px] text-gray-400">${r.fecha || r.Fecha}</span>
            </div>
            <span class="font-black text-sm text-gray-800">${r.peso || r.Peso} <span class="text-[10px] font-normal text-gray-500">kg</span></span>
          </div>
        `;
      });

      html += `</div></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
  }

  // Carga asíncrona de los 3 endpoints CSV
  async function initBBM() {
    try {
      const [rutinaData, medidasData, recordsData] = await Promise.all([
        fetchCSV(URLS.rutina),
        fetchCSV(URLS.medidas),
        fetchCSV(URLS.records)
      ]);

      renderRutina(rutinaData);
      renderMedidas(medidasData);
      renderRecords(recordsData);
    } catch (err) {
      console.error('Error cargando datos de Google Sheets mediante PapaParse:', err);
    }
  }

  initBBM();
});
