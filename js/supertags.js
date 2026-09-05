/**
 * js/supertags.js - Módulo superTAGs (Rutinas dinámicas según el día)
 */
KeepModule('supertags', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykjgTTyNTAFGNZ2QcmV5--5FPkzyMpJqw22NeeU4Ou9oXwHzLEunuwrqeIXzZPM5Ya/exec';

  const URL_RUTINAS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=rutinas_tags`;
  const URL_HISTORIAL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=historial_tags`;

  // Mapeo de días a superTAGs
  const MAPA_DIAS = {
    0: { tag: 'BestBoutMachine', nombre: 'BBM Day', color: 'bg-emerald-800', text: 'text-emerald-400' }, // Domingo
    1: { tag: 'Haxor', nombre: 'HAXOR Day', color: 'bg-teal-900', text: 'text-teal-300' },                // Lunes
    2: { tag: 'Babel', nombre: 'BABEL Day', color: 'bg-sky-900', text: 'text-sky-300' },                 // Martes
    3: { tag: 'Benkyou', nombre: 'BENKYOU Day', color: 'bg-indigo-900', text: 'text-indigo-300' },       // Miércoles
    4: { tag: 'Haxor', nombre: 'HAXOR Day', color: 'bg-teal-900', text: 'text-teal-300' },                // Jueves
    5: { tag: 'Babel', nombre: 'BABEL Day', color: 'bg-sky-900', text: 'text-sky-300' },                 // Viernes
    6: { tag: 'Benkyou', nombre: 'BENKYOU Day', color: 'bg-indigo-900', text: 'text-indigo-300' }        // Sábado
  };

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

  async function renderSuperTags(container) {
    if (!container) return;

    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const configHoy = MAPA_DIAS[diaSemana];
    const fechaHoyStr = hoy.toLocaleDateString('es-ES');
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    let todasRutinas = [];
    let historial = [];

    try {
      const [resRutinas, resHistorial] = await Promise.all([
        fetchCSV(URL_RUTINAS).catch(() => []),
        fetchCSV(URL_HISTORIAL).catch(() => [])
      ]);
      todasRutinas = resRutinas;
      historial = resHistorial;
    } catch (e) {
      console.error('Error cargando superTAGs:', e);
    }

    // Filtrar actividades del tag correspondiente a hoy
    const actividadesHoy = todasRutinas
      .filter(r => (r.Tag || r.tag || '').trim().toLowerCase() === configHoy.tag.toLowerCase())
      .map(r => r.Actividad || r.actividad || '');

    // Cargar checks del día almacenados en localStorage
    const keyStorage = `supertags_${fechaHoyStr}_${configHoy.tag}`;
    let marcadosHoy = JSON.parse(localStorage.getItem(keyStorage) || '[]');

    // Calcular estadísticas del mes
    const completadasMes = historial.filter(h => {
      if (!h.Fecha) return false;
      const partes = h.Fecha.split('/');
      if (partes.length < 3) return false;
      const dateH = new Date(partes[2], partes[1] - 1, partes[0]);
      return dateH.getMonth() === mesActual && dateH.getFullYear() === anioActual;
    }).length + marcadosHoy.length;

    let html = `
      <div class="space-y-4">
        <!-- Encabezado del Día -->
        <div class="${configHoy.color} text-white p-4 rounded-2xl shadow-md border border-white/10">
          <div class="flex justify-between items-center">
            <div>
              <span class="text-[10px] uppercase font-black tracking-widest ${configHoy.text}">${fechaHoyStr}</span>
              <h2 class="text-xl font-black uppercase tracking-tight">${configHoy.nombre}</h2>
            </div>
            <div class="text-right">
              <span class="text-2xl font-black">${marcadosHoy.length}/${actividadesHoy.length}</span>
              <p class="text-[10px] text-gray-300">Completadas hoy</p>
            </div>
          </div>
          
          <!-- Barra de progreso -->
          <div class="w-full bg-black/30 h-2 rounded-full mt-3 overflow-hidden">
            <div class="bg-emerald-400 h-full transition-all duration-300" 
                 style="width: ${actividadesHoy.length ? (marcadosHoy.length / actividadesHoy.length) * 100 : 0}%"></div>
          </div>
        </div>

        <!-- Lista de Actividades de Hoy -->
        <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 space-y-3">
          <p class="text-xs font-bold text-gray-800 uppercase tracking-wider">Misiones de Hoy (${configHoy.tag})</p>
          <div class="space-y-2 max-h-60 overflow-y-auto">
    `;

    if (actividadesHoy.length === 0) {
      html += `<p class="text-xs text-gray-400 text-center py-4">No hay actividades configuradas para ${configHoy.tag} en la hoja de cálculo.</p>`;
    } else {
      actividadesHoy.forEach((act, idx) => {
        const check = marcadosHoy.includes(act);
        html += `
          <label class="flex items-center justify-between p-2.5 rounded-xl ${check ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'} border transition-all cursor-pointer">
            <span class="text-xs font-semibold ${check ? 'text-emerald-900 line-through' : 'text-gray-800'}">${act}</span>
            <input type="checkbox" data-act="${act}" ${check ? 'checked' : ''} 
                   class="check-tag w-4 h-4 accent-emerald-600 rounded cursor-pointer">
          </label>
        `;
      });
    }

    html += `
          </div>
        </div>

        <!-- Métrica Mensual -->
        <div class="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <p class="text-[10px] font-bold text-emerald-800 uppercase">Total Acumulado del Mes</p>
            <p class="text-xs text-emerald-600">Actividades completadas este mes</p>
          </div>
          <span class="text-lg font-black text-emerald-900">${completadasMes} pts</span>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Escuchar cambios en los checkboxes
    container.querySelectorAll('.check-tag').forEach(input => {
      input.addEventListener('change', async (e) => {
        const actividad = e.target.getAttribute('data-act');
        const isChecked = e.target.checked;

        if (isChecked) {
          if (!marcadosHoy.includes(actividad)) marcadosHoy.push(actividad);
        } else {
          marcadosHoy = marcadosHoy.filter(a => a !== actividad);
        }

        localStorage.setItem(keyStorage, JSON.stringify(marcadosHoy));

        // Enviar evento a Apps Script en segundo plano
        if (isChecked) {
          fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'guardarHistorialTag',
              payload: {
                fecha: fechaHoyStr,
                tag: configHoy.tag,
                actividad: actividad,
                estado: 'Completado'
              }
            })
          }).catch(err => console.warn('Sync error:', err));
        }

        renderSuperTags(container);
      });
    });
  }

  const containerTags = document.getElementById('modulo-supertags');
  if (containerTags) renderSuperTags(containerTags);
});
