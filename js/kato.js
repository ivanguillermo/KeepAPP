/**
 * js/kato.js - Módulo KATO: Registro de Idiomas (Duolingo, XP, Lecciones Diarias)
 */
KeepModule('kato', () => {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxJCaE7OMlQFdLAh7SUxNUM59mFKFkJ3c2R5EjV2JFW1rqVFSGGKXaH7jcTWFJiIc1/exec';
  const IDIOMAS = ['Aleman', 'Frances', 'Japones', 'Latin'];

  let idiomaActual = 'Aleman';

  // 1. Manejo del Reset Automático a las 12:00 AM
  function getKatoStorage() {
    const todayStr = new Date().toISOString().slice(0, 10);
    let data = JSON.parse(localStorage.getItem('kato_data') || 'null');

    if (!data) {
      data = { lastDate: todayStr, daily: {}, monthly: {} };
      IDIOMAS.forEach(lang => { data.daily[lang] = 0; data.monthly[lang] = 0; });
    }

    // Si cambió el día (pasó de las 12:00 AM), reseteamos las cuotas diarias
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

  // 2. Renderizado de la Interfaz KATO
  function setupKato(container) {
    if (!container) return;

    function renderView() {
      const state = getKatoStorage();
      const dailyCount = state.daily[idiomaActual] || 0;
      const monthlyCount = state.monthly[idiomaActual] || 0;

      // Select de Idiomas
      const optsIdiomas = IDIOMAS.map(lang => 
        `<option value="${lang}" ${lang === idiomaActual ? 'selected' : ''}>${lang}</option>`
      ).join('');

      // Renderizado de las 5 casillas/cuota diaria
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
          <!-- Selección de Idioma -->
          <div class="bg-white p-3 rounded-2xl border border-indigo-100 shadow-xs flex items-center justify-between">
            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Idioma:</span>
            <select id="select-kato-idioma" class="bg-indigo-50 text-indigo-800 text-xs font-bold py-1.5 px-3 rounded-xl border border-indigo-200 outline-none">
              ${optsIdiomas}
            </select>
          </div>

          <!-- Cuota Diaria (Reset 12:00 AM) -->
          <div class="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs space-y-3">
            <div class="flex justify-between items-center">
              <p class="text-xs font-bold text-indigo-900 uppercase">Cuota Diaria (${dailyCount}/5)</p>
              <span class="text-[10px] text-gray-400 font-semibold">Resetea a medianoche</span>
            </div>
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
              ${checkboxesHtml}
            </div>
            <p class="text-[11px] text-gray-500 text-right">Lecciones este mes: <strong class="text-indigo-600">${monthlyCount}</strong></p>
          </div>

          <!-- Formulario de Hito (XP / Nivel a Google Sheets) -->
          <form id="form-kato-hito" class="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs space-y-3">
            <p class="text-xs font-bold text-indigo-900 uppercase border-b border-gray-100 pb-2">Registrar Hito / Avance</p>
            
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">XP Total</label>
                <input type="number" id="kato-xp" required placeholder="Ej. 12500" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nivel / Sección</label>
                <input type="text" id="kato-lvl" required placeholder="Ej. Secc 3 / Niv 12" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
              </div>
            </div>

            <button type="submit" id="btn-guardar-kato" class="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs hover:bg-indigo-700 transition-colors">
              Guardar Hito en Sheet
            </button>
            <p id="kato-status" class="text-[11px] text-center hidden"></p>
          </form>
        </div>
      `;

      container.innerHTML = html;

      // Eventos
      const selIdioma = container.querySelector('#select-kato-idioma');
      if (selIdioma) {
        selIdioma.addEventListener('change', (e) => {
          idiomaActual = e.target.value;
          renderView();
        });
      }

      // Checkboxes de lecciones
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

      // Envío de Hito a Google Sheets
      const formHito = container.querySelector('#form-kato-hito');
      const statusMsg = container.querySelector('#kato-status');
      const btnGuardar = container.querySelector('#btn-guardar-kato');

      if (formHito) {
        formHito.addEventListener('submit', async (e) => {
          e.preventDefault();
          btnGuardar.disabled = true;
          statusMsg.className = "text-[11px] text-center text-indigo-600 block font-semibold";
          statusMsg.textContent = "Guardando hito...";

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

            statusMsg.textContent = "¡Hito registrado exitosamente!";
            btnGuardar.disabled = false;
            formHito.reset();
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

  // Inicialización
  const cKato = document.getElementById('sec-kato');
  if (cKato) setupKato(cKato);
});
