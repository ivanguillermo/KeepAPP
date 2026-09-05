/**
 * js/kato.js - Módulo KATO: Registro e Historial de Idiomas desde Google Sheets
 */
KeepModule('kato', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const APPS_SCRIPT_URL = https://script.google.com/macros/s/AKfycbyxJCaE7OMlQFdLAh7SUxNUM59mFKFkJ3c2R5EjV2JFW1rqVFSGGKXaH7jcTWFJiIc1/exec';
  const URL_KATO_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=kato`;

  const IDIOMAS = ['Aleman', 'Frances', 'Japones', 'Latin'];
  let idiomaActual = 'Aleman';

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

  // Manejo del Reset a las 12:00 AM (Cuota Diaria)
  function getKatoStorage() {
    const todayStr = new Date().toISOString().slice(0, 10);
    let data = JSON.parse(localStorage.getItem('kato_data') || 'null');

    if (!data) {
      data = { lastDate: todayStr, daily: {}, monthly: {} };
      IDIOMAS.forEach(lang => { data.daily[lang] = 0; data.monthly[lang] = 0; });
    }

    // Reset automático a medianoche
    if (data.lastDate !== todayStr) {
      data.lastDate = todayStr;
      IDIOMAS.forEach(lang => { data.daily[lang] = 0; });
      localStorage.setItem('kato_data', JSON.stringify(data));
    }

    return data;
  }

  function saveKatoStorage(data) {
    localStorage.setItem('kato_data', JSON.stringify(data));
  }

  async function setupKato(container) {
    if (!container) return;

    async function renderView() {
      container.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">Cargando datos de KATO...</p>`;

      let registrosHoja = [];
      try {
        registrosHoja = await fetchCSV(URL_KATO_CSV);
      } catch (e) {
        console.warn("No se pudo leer la pestaña 'kato' en Google Sheets:", e);
      }

      // Obtener el último hito registrado en la hoja para el idioma seleccionado
      const historialIdioma = registrosHoja.filter(r => 
        (r.Idioma || r.idioma || '').toLowerCase() === idiomaActual.toLowerCase()
      );
      
      const ultimoHito = historialIdioma.length > 0 ? historialIdioma[historialIdioma.length - 1] : null;
      const currentXP = ultimoHito ? (ultimoHito.XP || ultimoHito.xp || '0') : '0';
      const currentNivel = ultimoHito ? (ultimoHito.Nivel || ultimoHito.nivel || 'N/A') : 'Sin datos';

      const state = getKatoStorage();
      const dailyCount = state.daily[idiomaActual] || 0;
      const monthlyCount = state.monthly[idiomaActual] || 0;

      const optsIdiomas = IDIOMAS.map(lang => 
        `<option value="${lang}" ${lang === idiomaActual ? 'selected' : ''}>${lang}</option>`
      ).join('');

      // Checkboxes cuota diaria
      let checkboxesHtml = '';
      for (let i = 1; i <= 5; i++) {
        const checked = i <= dailyCount ? 'checked' : '';
        checkboxesHtml += `
          <label class="flex flex-col items-center gap-1 cursor-pointer">
            <input type="checkbox" class="chk-leccion w-6 h-6 accent-indigo-600 rounded-lg cursor-pointer" data-index="${i}" ${checked}>
            <span class="text-[10px] font-bold text-gray-400">${i}</span>
          </label>
        `;
      }

      let html = `
        <div class="space-y-4">
          <!-- Menú Idioma -->
          <div class="bg-white p-3 rounded-2xl border border-indigo-100 shadow-xs flex items-center justify-between">
            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Idioma:</span>
            <select id="select-kato-idioma" class="bg-indigo-50 text-indigo-800 text-xs font-bold py-1.5 px-3 rounded-xl border border-indigo-200 outline-none">
              ${optsIdiomas}
            </select>
          </div>

          <!-- Estado Actual desde Google Sheets -->
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-indigo-50 border border-indigo-200 p-3 rounded-2xl">
              <p class="text-[10px] font-bold text-indigo-600 uppercase">XP Actual (${idiomaActual})</p>
              <p class="text-sm font-black text-indigo-900">${currentXP}</p>
            </div>
            <div class="bg-purple-50 border border-purple-200 p-3 rounded-2xl">
              <p class="text-[10px] font-bold text-purple-600 uppercase">Nivel / Sección</p>
              <p class="text-sm font-black text-purple-900">${currentNivel}</p>
            </div>
          </div>

          <!-- Cuota Diaria (0-5) -->
          <div class="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs space-y-3">
            <div class="flex justify-between items-center">
              <p class="text-xs font-bold text-indigo-900 uppercase">Cuota Diaria (${dailyCount}/5)</p>
              <span class="text-[10px] text-gray-400 font-semibold">Resetea a las 12:00 AM</span>
            </div>
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
              ${checkboxesHtml}
            </div>
            <p class="text-[11px] text-gray-500 text-right">Lecciones este mes: <strong class="text-indigo-600">${monthlyCount}</strong></p>
          </div>

          <!-- Guardar Nuevo Hito -->
          <form id="form-kato-hito" class="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs space-y-3">
            <p class="text-xs font-bold text-indigo-900 uppercase border-b border-gray-100 pb-2">Actualizar Hito en Sheet</p>
            
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nuevo XP</label>
                <input type="number" id="kato-xp" required placeholder="${currentXP}" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nuevo Nivel</label>
                <input type="text" id="kato-lvl" required placeholder="${currentNivel}" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
              </div>
            </div>

            <button type="submit" id="btn-guardar-kato" class="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs hover:bg-indigo-700 transition-colors">
              Guardar en Google Sheets
            </button>
            <p id="kato-status" class="text-[11px] text-center hidden"></p>
          </form>
        </div>
      `;

      container.innerHTML = html;

      // Evento Cambiar Idioma
      const selIdioma = container.querySelector('#select-kato-idioma');
      if (selIdioma) {
        selIdioma.addEventListener('change', (e) => {
          idiomaActual = e.target.value;
          renderView();
        });
      }

      // Evento Checkboxes
      const chks = container.querySelectorAll('.chk-leccion');
      chks.forEach(chk => {
        chk.addEventListener('change', () => {
          const stateNow = getKatoStorage();
          let count = 0;
          chks.forEach(c => { if (c.checked) count++; });
          
          const diff = count - (stateNow.daily[idiomaActual] || 0);
          stateNow.daily[idiomaActual] = count;
          stateNow.monthly[idiomaActual] = Math.max(0, (stateNow.monthly[idiomaActual] || 0) + diff);
          
          saveKatoStorage(stateNow);
          renderView();
        });
      });

      // Evento Formulario Hitos
      const formHito = container.querySelector('#form-kato-hito');
      const statusMsg = container.querySelector('#kato-status');
      const btnGuardar = container.querySelector('#btn-guardar-kato');

      if (formHito) {
        formHito.addEventListener('submit', async (e) => {
          e.preventDefault();
          btnGuardar.disabled = true;
          statusMsg.className = "text-[11px] text-center text-indigo-600 block font-semibold";
          statusMsg.textContent = "Enviando registro a Google Sheets...";

          const payload = {
            idioma: idiomaActual,
            xp: container.querySelector('#kato-xp').value,
            nivel: container.querySelector('#kato-lvl').value,
            fecha: new Date().toLocaleDateString()
          };

          try {
            await fetch(APPS_SCRIPT_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'guardarHitoKato', payload: payload })
            });

            statusMsg.textContent = "¡Guardado exitosamente!";
            setTimeout(() => { renderView(); }, 1200);
          } catch (err) {
            statusMsg.className = "text-[11px] text-center text-red-500 block";
            statusMsg.textContent = "Error: " + err.message;
            btnGuardar.disabled = false;
          }
        });
      }
    }

    renderView();
  }

  const cKato = document.getElementById('sec-kato');
  if (cKato) setupKato(cKato);
});
