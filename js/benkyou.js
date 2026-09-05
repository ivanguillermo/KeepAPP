/**
 * Módulo Benkyou (Estudios) - Pestaña 'BKY'
 */
KeepModule('benkyou', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const URL_BKY = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=BKY`;

  function fetchCSV(url) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err)
      });
    });
  }

  // Convierte "5/9/26" a objeto Date valido
  function parseFecha(str) {
    if (!str) return null;
    const partes = str.trim().split('/');
    if (partes.length !== 3) return null;
    
    let dia = parseInt(partes[0], 10);
    let mes = parseInt(partes[1], 10) - 1;
    let anio = parseInt(partes[2], 10);
    if (anio < 100) anio += 2000;

    return new Date(anio, mes, dia);
  }

  // -------------------------------------------------------------
  // 1. EVALUACIONES PRÓXIMAS (Ordenadas por cercanía)
  // -------------------------------------------------------------
  function setupEvaluaciones(data, container) {
    if (!container) return;

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    const evals = data
      .map(d => {
        const fechaObj = parseFecha(d['Evaluacion']);
        return {
          universidad: d['Universidad'] || '',
          materia: d['Materia'] || '',
          objetivo: d['Objetivo'] || '',
          temas: d['Temas'] || '',
          fechaStr: d['Evaluacion'] || '',
          fechaObj: fechaObj
        };
      })
      .filter(e => e.materia && e.fechaObj)
      .sort((a, b) => a.fechaObj - b.fechaObj);

    let html = `
      <div class="space-y-3">
        <div class="flex items-center justify-between border-b border-gray-100 pb-2">
          <span class="text-xs font-bold text-emerald-800 uppercase tracking-wider">Próximas Evaluaciones</span>
          <span class="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">${evals.length} Programadas</span>
        </div>
        <div class="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
    `;

    if (evals.length === 0) {
      html += `<p class="text-xs text-gray-400 py-6 text-center">No hay evaluaciones programadas en el registro.</p>`;
    } else {
      evals.forEach(e => {
        const diffTiempo = e.fechaObj - hoy;
        const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

        let badgeColor = 'bg-emerald-50 border-emerald-200 text-emerald-700';
        let diasTexto = `En ${diffDias} días`;

        if (diffDias === 0) {
          badgeColor = 'bg-rose-50 border-rose-200 text-rose-700 font-black';
          diasTexto = '¡HOY!';
        } else if (diffDias < 0) {
          badgeColor = 'bg-gray-100 border-gray-200 text-gray-400';
          diasTexto = 'Finalizada';
        } else if (diffDias <= 3) {
          badgeColor = 'bg-amber-50 border-amber-200 text-amber-700';
        }

        html += `
          <div class="p-3 bg-white rounded-2xl border border-emerald-100 shadow-xs flex justify-between items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">${e.universidad}</span>
                <span class="text-xs font-bold text-gray-800 truncate">${e.materia}</span>
              </div>
              <p class="text-[11px] text-gray-600 line-clamp-1">${e.objetivo !== 'unico' ? e.objetivo : e.temas}</p>
            </div>
            <div class="text-right shrink-0">
              <span class="inline-block text-[10px] font-bold px-2 py-1 rounded-xl border ${badgeColor}">
                ${diasTexto}
              </span>
              <p class="text-[10px] text-gray-400 mt-1 font-semibold">${e.fechaStr}</p>
            </div>
          </div>
        `;
      });
    }

    html += `</div></div>`;
    container.innerHTML = html;
  }

  // -------------------------------------------------------------
  // 2. EXPLORADOR POR UNIVERSIDAD / MATERIA / OBJETIVOS
  // -------------------------------------------------------------
  function setupExploradorMaterias(data, container) {
    if (!container) return;

    const universidades = ['Todas', ...new Set(data.map(d => d['Universidad']).filter(Boolean))];
    let uniSeleccionada = universidades.includes('UNA') ? 'UNA' : universidades[0];
    let materiaSeleccionada = '';

    function renderView() {
      const materiasFiltradas = [...new Set(
        data
          .filter(d => uniSeleccionada === 'Todas' || d['Universidad'] === uniSeleccionada)
          .map(d => d['Materia'])
          .filter(Boolean)
      )];

      if (!materiasFiltradas.includes(materiaSeleccionada)) {
        materiaSeleccionada = materiasFiltradas[0] || '';
      }

      const optsUni = universidades.map(u => `<option value="${u}" ${u === uniSeleccionada ? 'selected' : ''}>${u}</option>`).join('');
      const optsMat = materiasFiltradas.map(m => `<option value="${m}" ${m === materiaSeleccionada ? 'selected' : ''}>${m}</option>`).join('');

      const objetivosMateria = data.filter(d => 
        (uniSeleccionada === 'Todas' || d['Universidad'] === uniSeleccionada) && 
        d['Materia'] === materiaSeleccionada
      );

      let html = `
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-2 bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs">
            <div>
              <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Universidad</label>
              <select id="select-bky-uni" class="w-full bg-emerald-50 text-emerald-800 text-xs font-bold py-1.5 px-2 rounded-xl border border-emerald-200 outline-none">
                ${optsUni}
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Materia</label>
              <select id="select-bky-mat" class="w-full bg-emerald-50 text-emerald-800 text-xs font-bold py-1.5 px-2 rounded-xl border border-emerald-200 outline-none">
                ${optsMat}
              </select>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 space-y-3 max-h-[60vh] overflow-y-auto">
      `;

      if (objetivosMateria.length === 0) {
        html += `<p class="text-xs text-gray-400 py-6 text-center">No hay datos registrados para esta materia.</p>`;
      } else {
        objetivosMateria.forEach((obj, idx) => {
          const tituloObj = obj['Objetivo'] || `Objetivo ${idx + 1}`;
          const temas = obj['Temas'] || 'Sin detalle de temas';
          const texto = obj['Texto'] || '';
          const link = obj['Link'] || '';

          html += `
            <div class="border border-emerald-100 rounded-2xl p-3 space-y-2 bg-emerald-50/30">
              <div class="flex justify-between items-start gap-2">
                <span class="text-xs font-bold text-emerald-900">${tituloObj}</span>
                ${obj['Evaluacion'] ? `<span class="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">Examen: ${obj['Evaluacion']}</span>` : ''}
              </div>

              <p class="text-xs text-gray-700 leading-relaxed font-medium">${temas}</p>

              ${texto ? `<p class="text-[10px] text-gray-500 italic bg-white p-2 rounded-xl border border-gray-100">📖 ${texto}</p>` : ''}

              ${link ? `
                <div class="pt-1">
                  <a href="${link}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition-colors">
                    <span>Ver Recurso / PDF</span>
                    <span>↗</span>
                  </a>
                </div>
              ` : ''}
            </div>
          `;
        });
      }

      html += `</div></div>`;
      container.innerHTML = html;

      const selUni = container.querySelector('#select-bky-uni');
      const selMat = container.querySelector('#select-bky-mat');

      if (selUni) {
        selUni.addEventListener('change', (e) => {
          uniSeleccionada = e.target.value;
          renderView();
        });
      }

      if (selMat) {
        selMat.addEventListener('change', (e) => {
          materiaSeleccionada = e.target.value;
          renderView();
        });
      }
    }

    renderView();
  }

  // -------------------------------------------------------------
  // INICIALIZACIÓN GENERAL BENKYOU
  // -------------------------------------------------------------
  async function initBenkyou() {
    const cEvals = document.getElementById('bky-evaluaciones') || document.querySelector('[data-tab="evaluaciones"]');
    const cExplorador = document.getElementById('bky-explorador') || document.querySelector('[data-tab="materias"]') || document.querySelector('#bky-materias');

    try {
      const dataBKY = await fetchCSV(URL_BKY);
      if (cEvals) setupEvaluaciones(dataBKY, cEvals);
      if (cExplorador) setupExploradorMaterias(dataBKY, cExplorador);
    } catch (e) {
      console.error('Error al cargar datos de Benkyou:', e);
    }
  }

  initBenkyou();
});
