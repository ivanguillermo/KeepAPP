/* ==========================================
   MÓDULO: TAREAS - KEEPAPP
   Carga con PapaParse desde Google Sheets (CSV)
   ========================================== */

const TareasModule = (() => {
  // ID de Google Sheet
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=tareas`;

  let tareasData = [];
  let filterText = '';

  /* ------------------------------------------
     1. INICIALIZACIÓN Y CARGA DE DATOS
     ------------------------------------------ */
  const init = () => {
    setupEventListeners();
    fetchTareas();
  };

  const setupEventListeners = () => {
    // Buscador/Filtro dinámico de tareas
    const searchInput = document.getElementById('tareas-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterText = e.target.value.toLowerCase();
        render();
      });
    }
  };

  const fetchTareas = () => {
    if (typeof Papa === 'undefined') {
      console.error('PapaParse no está disponible.');
      return;
    }

    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        tareasData = processTareas(results.data);
        render();
      },
      error: (err) => {
        console.error('Error al cargar la pestaña tareas:', err);
      }
    });
  };

  // Procesa y normaliza los registros del CSV
  const processTareas = (data) => {
    return data.map(item => ({
      titulo: item.tarea || item.titulo || item.Tarea || '',
      categoria: item.categoria || item.Categoria || 'General',
      score: item.score || item.puntaje || item.Score || item.puntos || '0',
      estado: item.estado || item.Estado || 'pendiente',
      descripcion: item.descripcion || item.Notas || ''
    })).filter(t => t.titulo.trim() !== '');
  };

  /* ------------------------------------------
     2. RENDERIZADO DE INTERFAZ
     ------------------------------------------ */
  const render = () => {
    const container = document.getElementById('tareas-list');
    if (!container) return;

    // Filtrado local según la búsqueda
    const filteredTasks = tareasData.filter(t => 
      t.titulo.toLowerCase().includes(filterText) ||
      t.categoria.toLowerCase().includes(filterText)
    );

    if (filteredTasks.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--text-dim);">
          <p style="margin: 0;">No hay tareas pendientes que coincidan.</p>
        </div>`;
      return;
    }

    container.innerHTML = filteredTasks.map(t => `
      <div class="task-card">
        <div style="flex: 1; padding-right: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="badge" style="background: var(--pastel-tareas-bg); color: var(--pastel-tareas-accent); border: 1px solid var(--pastel-tareas-border);">
              ${escapeHTML(t.categoria)}
            </span>
          </div>
          <h3>${escapeHTML(t.titulo)}</h3>
          ${t.descripcion ? `<p style="margin: 4px 0 0 0; font-size: 0.78rem; color: var(--text-dim);">${escapeHTML(t.descripcion)}</p>` : ''}
        </div>
        
        <div class="score-tag">
          ${escapeHTML(t.score)}
          <span class="score-label">Puntos</span>
        </div>
      </div>
    `).join('');
  };

  const escapeHTML = (str) => str ? String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)) : '';

  return { init, fetchTareas };
})();

window.TareasModule = TareasModule;
