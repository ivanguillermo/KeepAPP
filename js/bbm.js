/* ==========================================
   MÓDULO: BBM (GYM & TRAINING) - KEEPAPP
   Carga con PapaParse desde Google Sheets (CSV)
   ========================================== */

const BBMModule = (() => {
  // ID de tu Google Sheet
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';

  // URLs de exportación CSV por pestaña
  const CSV_URLS = {
    rutinas: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=bbm_rutinas`,
    records: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=bbm_records`,
    medidas: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=bbm_medidas`
  };

  let bbmData = {
    rutinas: {},
    records: [],
    medidas: []
  };

  let activeTab = 'rutinas';
  let selectedDay = 'lunes';
   document.getElementById('bbm-day-select')?.addEventListener('change', (e) => {
  BBMModule.renderRutina(e.target.value);
});
  /* ------------------------------------------
     1. INICIALIZACIÓN Y CARGA DE DATOS
     ------------------------------------------ */
  const init = () => {
    setupEventListeners();
    fetchAllSheets();
  };

  const setupEventListeners = () => {
    // Cambio de pestañas (Rutinas, Récords, Medidas)
    document.querySelectorAll('.bbm-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabTarget = e.currentTarget.dataset.tab;
        if (tabTarget) switchTab(tabTarget);
      });
    });

    // Selector de día
    const daySelect = document.getElementById('bbm-day-select');
    if (daySelect) {
      daySelect.addEventListener('change', (e) => {
        selectedDay = e.target.value.toLowerCase();
        renderRutinaDia();
      });
    }
  };

  const fetchAllSheets = () => {
    if (typeof Papa === 'undefined') {
      console.error('PapaParse no está cargado.');
      return;
    }

    // Peticiones en paralelo con PapaParse
    Promise.all([
      parseCSV(CSV_URLS.rutinas),
      parseCSV(CSV_URLS.records),
      parseCSV(CSV_URLS.medidas)
    ]).then(([rutinasRaw, recordsRaw, medidasRaw]) => {
      bbmData.rutinas = processRutinas(rutinasRaw);
      bbmData.records = recordsRaw;
      bbmData.medidas = medidasRaw;
      render();
    }).catch(err => {
      console.error('Error al parsear los datos con PapaParse:', err);
    });
  };

  const parseCSV = (url) => {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err)
      });
    });
  };

  // Agrupa las rutinas en un objeto según el día de la semana
  const processRutinas = (data) => {
    const agrupado = {};
    data.forEach(item => {
      const dia = (item.dia || item.Dia || '').toLowerCase().trim();
      if (!dia) return;

      if (!agrupado[dia]) agrupado[dia] = [];
      agrupado[dia].push({
        nombre: item.ejercicio || item.nombre || '',
        series: item.series || item.Series || '',
        repeticiones: item.repeticiones || item.reps || '',
        peso: item.peso || item.Peso || '',
        descanso: item.descanso || '',
        notas: item.notas || ''
      });
    });
    return agrupado;
  };

  /* ------------------------------------------
     2. PESTAÑAS Y VISTAS
     ------------------------------------------ */
  const switchTab = (tabName) => {
    activeTab = tabName;

    document.querySelectorAll('.bbm-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.bbm-subview').forEach(subview => {
      subview.classList.toggle('active', subview.id === `bbm-subview-${tabName}`);
    });

    render();
  };

  /* ------------------------------------------
     3. RENDERIZADO DE INTERFAZ
     ------------------------------------------ */
  const render = () => {
    if (activeTab === 'rutinas') renderRutinaDia();
    else if (activeTab === 'records') renderRecords();
    else if (activeTab === 'medidas') renderMedidas();
  };

  const renderRutinaDia = () => {
    const container = document.getElementById('bbm-rutina-list');
    if (!container) return;

    const ejercicios = bbmData.rutinas?.[selectedDay] || [];

    if (ejercicios.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--text-dim);">
          <p style="margin: 0;">No hay ejercicios para el <strong>${capitalize(selectedDay)}</strong>.</p>
        </div>`;
      return;
    }

    container.innerHTML = ejercicios.map(ej => `
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h4 style="margin: 0; font-size: 0.95rem; color: var(--text);">${escapeHTML(ej.nombre)}</h4>
          <span class="badge" style="background: var(--pastel-bbm-bg); color: var(--pastel-bbm-accent); border: 1px solid var(--pastel-bbm-border);">
            ${ej.series} x ${ej.repeticiones}
          </span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-dim); display: flex; gap: 12px;">
          <span><strong>Peso:</strong> ${ej.peso || 'N/A'}</span>
          ${ej.descanso ? `<span><strong>Descanso:</strong> ${ej.descanso}</span>` : ''}
        </div>
        ${ej.notas ? `<p style="font-size: 0.75rem; color: var(--text-dim); margin: 6px 0 0 0; font-style: italic;">${escapeHTML(ej.notas)}</p>` : ''}
      </div>
    `).join('');
  };

  const renderRecords = () => {
    const container = document.getElementById('bbm-records-list');
    if (!container) return;

    const records = bbmData.records || [];

    if (records.length === 0) {
      container.innerHTML = `<p class="error-msg">No hay récords en la hoja bbm_records.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="card">
        ${records.map(rec => `
          <div class="record-row">
            <div>
              <strong style="font-size: 0.9rem; color: var(--text);">${escapeHTML(rec.ejercicio || rec.Ejercicio)}</strong>
              <span style="display: block; font-size: 0.7rem; color: var(--text-dim);">${rec.fecha || rec.Fecha || ''}</span>
            </div>
            <span style="font-size: 1rem; font-weight: 700; color: var(--pastel-bbm-accent);">${rec.record || rec.Record}</span>
          </div>
        `).join('')}
      </div>`;
  };

  const renderMedidas = () => {
    const container = document.getElementById('bbm-medidas-list');
    if (!container) return;

    const medidas = bbmData.medidas || [];

    if (medidas.length === 0) {
      container.innerHTML = `<p class="error-msg">No hay medidas en la hoja bbm_medidas.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="card">
        ${medidas.map(m => `
          <div class="medida-row">
            <div>
              <strong style="font-size: 0.9rem; color: var(--text);">${escapeHTML(m.parametro || m.Parametro)}</strong>
              <span style="display: block; font-size: 0.7rem; color: var(--text-dim);">${m.fecha || m.Fecha || ''}</span>
            </div>
            <span style="font-weight: 600; color: var(--text);">${m.valor || m.Valor}</span>
          </div>
        `).join('')}
      </div>`;
  };

  const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  const escapeHTML = (str) => str ? str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)) : '';

  return { init, switchTab, fetchAllSheets };
})();

window.BBMModule = BBMModule;
