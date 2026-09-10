/**
 * js/kato.js - Módulo KATO: Registro e Historial de Idiomas desde Google Sheets
 */
KeepModule('kato', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzOUx8P3Fc1c89B1QiHBQot1f0NahjUSWQ1HuTIwQVbe9ElHZLB2NOEUge8B5-4hhHv/exec';
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

  // Manejo del Reset a las 12:00 AM usando hora local (Evita desfase UTC)
  function getKatoStorage() {
    // 'sv-SE' garantiza el formato ISO local YYYY-MM-DD sin alterar la zona horaria
    const todayStr = new Date().toLocaleDateString('sv-SE');
    let data = JSON.parse(localStorage.getItem('kato_data') || 'null');

    if (!data) {
      data = { lastDate: todayStr, daily: {}, monthly: {} };
      IDIOMAS.forEach(lang => { data.daily[lang] = 0; data.monthly[lang] = 0; });
    }

    // Reset automático a las 12:00 AM hora local
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

    // Preservar el encabezado de index.html (h2 Kato) mediante un contenedor interno
    let contentWrapper = container.querySelector('#kato-content-wrapper');
    if (!contentWrapper) {
      const initialPlaceholder = container.querySelector('div.p-4');
      contentWrapper = document.createElement('div');
      contentWrapper.id = 'kato-content-wrapper';
      
      if (initialPlaceholder) {
        initialPlaceholder.replaceWith(contentWrapper);
      } else {
        container.appendChild(contentWrapper);
      }
    }

    async function renderView() {
      contentWrapper.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">Cargando datos de KATO...</p>`;

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

      // Checkboxes para la cuota diaria (1 a 5)
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
          <!-- Menú Selector de Idioma -->
          <div class="bg-white p-3 rounded-2xl border border-indigo-100 shadow-xs flex items-center justify-between">
            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Idioma:</span>
            <select id="select-kato-idioma" class="bg-indigo-50 text-indigo-800 text-xs font-bold py-1.5 px-3 rounded-xl border border-indigo-200 outline-none cursor-pointer">
              ${optsIdiomas}
            </select>
          </div>

          <!-- Estado Actual recuperado de Google Sheets -->
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

          <!-- Formulario Actualizar Hito -->
          <form id="form-kato-hito" class="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs space-y-3">
            <p class="text-xs font-bold text-indigo-900 uppercase border-b border-gray-100 pb-2">Actualizar Hito en Sheet</p>
            
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nuevo XP</label>
                <input type="number" id="kato-xp" required placeholder="${currentXP}" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none focus:border-indigo-400">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nuevo Nivel</label>
                <input type="text" id="kato-lvl" required placeholder="${currentNivel}" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none focus:border-indigo-400">
              </div>
            </div>

            <button type="submit" id="btn-guardar-kato" class="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs hover:bg-indigo-700 active:scale-[0.98] transition-all">
              Guardar en Google Sheets
            </button>
            <p id="kato-status" class="text-[11px] text-center hidden"></p>
          </form>
        </div>
      `;

      contentWrapper.innerHTML = html;

      // Evento Cambiar Idioma
      const selIdioma = contentWrapper.querySelector('#select-kato-idioma');
      if (selIdioma) {
        selIdioma.addEventListener('change', (e) => {
          idiomaActual = e.target.value;
          renderView();
        });
      }

      // Evento Checkboxes (Selección directa basada en la casilla pulsada)
      const chks = contentWrapper.querySelectorAll('.chk-leccion');
      chks.forEach(chk => {
        chk.addEventListener('change', (e) => {
          const index = parseInt(e.target.dataset.index, 10);
          const isChecked = e.target.checked;
          const stateNow = getKatoStorage();
          
          // Si marca la casilla N, la cuota sube a N. Si desmarca N, la cuota baja a N - 1.
          const newCount = isChecked ? index : index - 1;
          const oldCount = stateNow.daily[idiomaActual] || 0;
          const diff = newCount - oldCount;

          stateNow.daily[idiomaActual] = newCount;
          stateNow.monthly[idiomaActual] = Math.max(0, (stateNow.monthly[idiomaActual] || 0) + diff);
          
          saveKatoStorage(stateNow);
          renderView();
        });
      });

      // Evento Formulario para Enviar a Google Apps Script
      const formHito = contentWrapper.querySelector('#form-kato-hito');
      const statusMsg = contentWrapper.querySelector('#kato-status');
      const btnGuardar = contentWrapper.querySelector('#btn-guardar-kato');

      if (formHito) {
        formHito.addEventListener('submit', async (e) => {
          e.preventDefault();
          btnGuardar.disabled = true;
          statusMsg.className = "text-[11px] text-center text-indigo-600 block font-semibold";
          statusMsg.textContent = "Enviando registro a Google Sheets...";

          const payloadData = {
            action: 'guardarHitoKato',
            idioma: idiomaActual,
            xp: contentWrapper.querySelector('#kato-xp').value,
            nivel: contentWrapper.querySelector('#kato-lvl').value,
            dailyCount: getKatoStorage().daily[idiomaActual] || 0,
            dateStr: new Date().toLocaleDateString('es-VE')
          };

          try {
            // Envío con CORS habilitado (solicitando y procesando la respuesta JSON)
            const res = await fetch(APPS_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(payloadData)
            });

            const result = await res.json();

            if (result.status === 'success') {
              statusMsg.className = "text-[11px] text-center text-emerald-600 block font-semibold";
              statusMsg.textContent = "¡Guardado exitosamente!";
              setTimeout(() => { renderView(); }, 1200);
            } else {
              throw new Error(result.message || 'Error reportado por Apps Script');
            }
          } catch (err) {
            console.error('Error al guardar en Kato:', err);
            statusMsg.className = "text-[11px] text-center text-red-500 block font-semibold";
            statusMsg.textContent = "Error: " + err.message;
            btnGuardar.disabled = false;
          }
        });
      }
    }

    renderView();
  }

  // Inicialización conectada al contenedor #sec-kato definido en index.html
  const cKato = document.getElementById('sec-kato');
  if (cKato) setupKato(cKato);
});
