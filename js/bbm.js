/**
 * Módulo BBM (Body Building & Metrics) con PapaParse y Filtros Dinámicos
 */
KeepModule('bbm', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  
  // Nombres exactos de las pestañas de tu Google Sheet
  const URLS = {
    rutina: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=bbm_rutina`,
    medidas: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=bbm_medidas`,
    records: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=bbm_records`
  };

  // Carga remota con PapaParse
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

  // -------------------------------------------------------------
  // 1. RUTINA (Selector de día, default el día actual)
  // -------------------------------------------------------------
  function setupRutina(data) {
    const container = document.getElementById('bbm-rutina');
    if (!container) return;

    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hoyIndice = new Date().getDay();
    const diaHoyNombre = diasSemana[hoyIndice];

    // Mapeo de días disponibles en los datos
    const diasDisponibles = [...new Set(data.map(item => item.Dia || item.dia))].filter(Boolean);
    
    // Si hoy es domingo o no hay rutina para el día de hoy, seleccionar el primer día con datos por defecto
    let diaSeleccionado = diasDisponibles.includes(diaHoyNombre) 
      ? diaHoyNombre 
      : (diasDisponibles[0] || 'Lunes');

    function renderView() {
      const ejerciciosDia = data.filter(item => (item.Dia || item.dia) === diaSeleccionado);

      let optionsHTML = diasDisponibles.map(d => 
        `<option value="${d}" ${d === diaSeleccionado ? 'selected' : ''}>${d}</option>`
      ).join('');

      let html = `
        <div class="space-y-4">
          <div class="flex items-center justify-between bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs">
            <label for="select-dia-rutina" class="text-xs font-bold text-gray-500 uppercase tracking-wider">Día:</label>
            <select id="select-dia-rutina" class="bg-emerald-50 text-emerald-800 text-sm font-bold py-1.5 px-3 rounded-xl border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-400">
              ${optionsHTML}
            </select>
          </div>

          <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100">
            <div class="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
              <span class="font-bold text-emerald-800 text-sm tracking-wide uppercase">${diaSeleccionado}</span>
              <span class="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">${ejerciciosDia.length} ejercicios</span>
            </div>
            <div class="divide-y divide-gray-100">
      `;

      if (ejerciciosDia.length === 0) {
        html += `<p class="text-xs text-gray-400 py-4 text-center">No hay ejercicios registrados para este día.</p>`;
      } else {
        ejerciciosDia.forEach(ej => {
          const nombre = ej.Ejercicio || ej.ejercicio || '-';
          const series = ej.Series || ej.series || '-';
          const reps = ej.Repeticiones || ej.reps || ej.Repeticion || '-';
          const notas = ej.Notas || ej.notas || '';

          html += `
            <div class="py-2.5 flex items-center justify-between gap-2">
              <div class="flex-1">
                <p class="font-semibold text-gray-800 text-sm">${nombre}</p>
                ${notas ? `<p class="text-xs text-emerald-600 mt-0.5">💡 ${notas}</p>` : ''}
              </div>
              <div class="text-right whitespace-nowrap">
                <span class="inline-block text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                  ${series} × ${reps}
                </span>
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

      // Listener del select
      document.getElementById('select-dia-rutina').addEventListener('change', (e) => {
        diaSeleccionado = e.target.value;
        renderView();
      });
    }

    renderView();
  }

  // -------------------------------------------------------------
  // 2. MEDIDAS (Filtro por Fecha o Parte del Cuerpo)
  // -------------------------------------------------------------
  function setupMedidas(data) {
    const container = document.getElementById('bbm-medidas');
    if (!container) return;

    let modoFiltro = 'fecha'; // 'fecha' o 'parte'
    const fechas = [...new Set(data.map(d => d.Fecha || d.fecha))].filter(Boolean);
    const partes = [
      { key: 'Peso_Kg', label: 'Peso (Kg)' },
      { key: 'Brazo_Cm', label: 'Brazo (Cm)' },
      { key: 'Pecho_Cm', label: 'Pecho (Cm)' },
      { key: 'Cintura_Cm', label: 'Cintura (Cm)' },
      { key: 'Muslo_Cm', label: 'Muslo (Cm)' },
      { key: '%_Grasa', label: '% Grasa' }
    ];

    let fechaSeleccionada = fechas[fechas.length - 1] || '';
    let parteSeleccionada = partes[0].key;

    function renderView() {
      let selectorHTML = '';

      if (modoFiltro === 'fecha') {
        const opts = fechas.map(f => `<option value="${f}" ${f === fechaSeleccionada ? 'selected' : ''}>${f}</option>`).join('');
        selectorHTML = `<select id="select-filtro-medida" class="bg-emerald-50 text-emerald-800 text-xs font-bold py-1.5 px-3 rounded-xl border border-emerald-200 outline-none">${opts}</select>`;
      } else {
        const opts = partes.map(p => `<option value="${p.key}" ${p.key === parteSeleccionada ? 'selected' : ''}>${p.label}</option>`).join('');
        selectorHTML = `<select id="select-filtro-medida" class="bg-emerald-50 text-emerald-800 text-xs font-bold py-1.5 px-3 rounded-xl border border-emerald-200 outline-none">${opts}</select>`;
      }

      let html = `
        <div class="space-y-4">
          <div class="flex flex-col gap-2 bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2">
              <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Filtrar por:</span>
              <div class="flex gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                <button id="btn-modo-fecha" class="px-2.5 py-1 rounded-lg ${modoFiltro === 'fecha' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-500'}">Fecha</button>
                <button id="btn-modo-parte" class="px-2.5 py-1 rounded-lg ${modoFiltro === 'parte' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-500'}">Parte del cuerpo</button>
              </div>
            </div>
            <div class="flex items-center justify-between pt-1">
              <span class="text-xs font-semibold text-gray-600">Selección:</span>
              ${selectorHTML}
            </div>
          </div>
      `;

      if (modoFiltro === 'fecha') {
        const registro = data.find(d => (d.Fecha || d.fecha) === fechaSeleccionada);
        if (registro) {
          html += `
            <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 space-y-3">
              <div class="flex justify-between items-center border-b border-gray-100 pb-2">
                <span class="text-xs font-bold text-gray-400">${registro.Fecha || registro.fecha}</span>
                <div class="text-emerald-700 font-black text-base">${registro.Peso_Kg || registro.peso || '-'} <span class="text-xs font-medium">kg</span></div>
              </div>
              <div class="grid grid-cols-3 gap-2 text-center text-xs">
                <div class="bg-emerald-50/60 p-2 rounded-xl"><span class="block text-gray-400 text-[10px] uppercase font-bold">Brazo</span><span class="font-bold text-gray-800">${registro.Brazo_Cm || '-'} cm</span></div>
                <div class="bg-emerald-50/60 p-2 rounded-xl"><span class="block text-gray-400 text-[10px] uppercase font-bold">Pecho</span><span class="font-bold text-gray-800">${registro.Pecho_Cm || '-'} cm</span></div>
                <div class="bg-emerald-50/60 p-2 rounded-xl"><span class="block text-gray-400 text-[10px] uppercase font-bold">Cintura</span><span class="font-bold text-gray-800">${registro.Cintura_Cm || '-'} cm</span></div>
                <div class="bg-emerald-50/60 p-2 rounded-xl"><span class="block text-gray-400 text-[10px] uppercase font-bold">Muslo</span><span class="font-bold text-gray-800">${registro.Muslo_Cm || '-'} cm</span></div>
                <div class="bg-emerald-50/60 p-2 rounded-xl col-span-2"><span class="block text-gray-400 text-[10px] uppercase font-bold">% Grasa</span><span class="font-bold text-emerald-800">${registro['%_Grasa'] || '-'}%</span></div>
              </div>
            </div>
          `;
        }
      } else {
        const labelParte = partes.find(p => p.key === parteSeleccionada)?.label || parteSeleccionada;
        html += `
          <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100">
            <h3 class="font-bold text-gray-800 text-sm mb-3 border-b border-gray-100 pb-2">${labelParte} - Histórico</h3>
            <div class="space-y-2">
        `;
        
        data.forEach(d => {
          const val = d[parteSeleccionada] || '-';
          const fecha = d.Fecha || d.fecha || '-';
          html += `
            <div class="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span class="text-xs text-gray-500 font-medium">${fecha}</span>
              <span class="font-black text-sm text-emerald-800">${val}</span>
            </div>
          `;
        });

        html += `</div></div>`;
      }

      html += '</div>';
      container.innerHTML = html;

      // Listeners
      document.getElementById('btn-modo-fecha').addEventListener('click', () => { modoFiltro = 'fecha'; renderView(); });
      document.getElementById('btn-modo-parte').addEventListener('click', () => { modoFiltro = 'parte'; renderView(); });
      
      const sel = document.getElementById('select-filtro-medida');
      if (sel) {
        sel.addEventListener('change', (e) => {
          if (modoFiltro === 'fecha') fechaSeleccionada = e.target.value;
          else parteSeleccionada = e.target.value;
          renderView();
        });
      }
    }

    renderView();
  }

  // -------------------------------------------------------------
  // 3. RECORDS (Selector por Ejercicio -> 1RM, 3RM, 6RM, 10RM)
  // -------------------------------------------------------------
  function setupRecords(data) {
    const container = document.getElementById('bbm-records');
    if (!container) return;

    // Obtener lista única de ejercicios
    const ejercicios = [...new Set(data.map(d => d.Ejercicio || d.ejercicio))].filter(Boolean);
    let ejercicioSeleccionado = ejercicios[0] || '';

    function renderView() {
      const opts = ejercicios.map(e => `<option value="${e}" ${e === ejercicioSeleccionado ? 'selected' : ''}>${e}</option>`).join('');

      // Filtrar registros del ejercicio
      const recsEjercicio = data.filter(d => (d.Ejercicio || d.ejercicio) === ejercicioSeleccionado);

      // Metas de Repeticiones objetivo
      const targets = ['1RM', '3RM', '6RM', '10RM'];

      let html = `
        <div class="space-y-4">
          <div class="flex items-center justify-between bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs">
            <label for="select-ejercicio-record" class="text-xs font-bold text-gray-500 uppercase tracking-wider">Ejercicio:</label>
            <select id="select-ejercicio-record" class="bg-emerald-50 text-emerald-800 text-xs font-bold py-1.5 px-3 rounded-xl border border-emerald-200 outline-none max-w-[200px]">
              ${opts}
            </select>
          </div>

          <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100">
            <h3 class="font-bold text-gray-800 text-sm mb-3 border-b border-gray-100 pb-2">${ejercicioSeleccionado}</h3>
            <div class="grid grid-cols-2 gap-2">
      `;

      targets.forEach(target => {
        const item = recsEjercicio.find(r => (r.Reps || r.reps || r.Repeticiones) === target);
        const peso = item ? (item.Record || item.record || item.Peso || '-') : '-';
        const fecha = item ? (item.Fecha || item.fecha || '') : '';

        html += `
          <div class="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <div>
              <span class="text-[10px] font-black tracking-wider text-emerald-600 block uppercase">${target}</span>
              <span class="text-[9px] text-gray-400">${fecha}</span>
            </div>
            <span class="font-black text-sm text-gray-800">${peso} ${peso !== '-' ? '<span class="text-[10px] font-normal text-gray-500">kg</span>' : ''}</span>
          </div>
        `;
      });

      html += `
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;

      // Listener
      document.getElementById('select-ejercicio-record').addEventListener('change', (e) => {
        ejercicioSeleccionado = e.target.value;
        renderView();
      });
    }

    renderView();
  }

  // Inicialización de la app
  async function initBBM() {
    try {
      const [rutinaData, medidasData, recordsData] = await Promise.all([
        fetchCSV(URLS.rutina),
        fetchCSV(URLS.medidas),
        fetchCSV(URLS.records)
      ]);

      setupRutina(rutinaData);
      setupMedidas(medidasData);
      setupRecords(recordsData);
    } catch (err) {
      console.error('Error al descargar los CSVs:', err);
    }
  }

  initBBM();
});
