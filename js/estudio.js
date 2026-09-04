/* ==========================================
   MÓDULO: ESTUDIO - KEEPAPP
   Carga con PapaParse desde Google Sheets (CSV)
   ========================================== */

const EstudioModule = (() => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=estudio`;

  let estudioData = [];
  let filterText = '';

  /* ------------------------------------------
     1. INICIALIZACIÓN Y CARGA DE DATOS
     ------------------------------------------ */
  const init = () => {
    setupEventListeners();
    fetchEstudio();
  };

  const setupEventListeners = () => {
    const searchInput = document.getElementById('estudio-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterText = e.target.value.toLowerCase();
        render();
      });
    }
  };

  const fetchEstudio = () => {
    if (typeof Papa === 'undefined') {
      console.error('PapaParse no está disponible.');
      return;
    }

    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        estudioData = processEstudio(results.data);
        render();
      },
      error: (err) => {
        console.error('Error al cargar la pestaña estudio:', err);
      }
    });
  };

  const processEstudio = (data) => {
    return data.map(item => ({
      materia: item.materia || item.Materia || item.asignatura || 'General',
      tema: item.tema || item.Tema || item.titulo || '',
      estado: item.estado || item.Estado || 'Pendiente',
      notas: item.notas || item.Notas || item.descripcion || '',
      enlace: item.enlace || item.url || item.Link || ''
    })).filter(e => e.tema.trim() !== '' || e.materia.trim() !== '');
  };

  /* ------------------------------------------
     2. RENDERIZADO DE INTERFAZ
     ------------------------------------------ */
  const render = () => {
    const container = document.getElementById('estudio-list');
    if (!container) return;

    const filtered = estudioData.filter(e => 
      e.materia.toLowerCase().includes(filterText) ||
      e.tema.toLowerCase().includes(filterText) ||
      e.notas.toLowerCase().includes(filterText)
    );

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--text-dim);">
          <p style="margin: 0;">No hay temas o contenidos de estudio registrados.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="grid-list">
        ${filtered.map(item => `
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <span class="badge" style="background: var(--pastel-estudio-bg); color: var(--pastel-estudio-accent); border: 1px solid var(--pastel-estudio-border);">
                ${escapeHTML(item.materia)}
              </span>
              ${item.estado ? `<span style="font-size: 0.75rem; font-weight: 600; color: var(--text-dim);">${escapeHTML(item.estado)}</span>` : ''}
            </div>
            
            <h4 style="margin: 0 0 6px 0; font-size: 0.95rem; color: var(--text);">${escapeHTML(item.tema)}</h4>
            
            ${item.notas ? `<p style="margin: 0 0 8px 0; font-size: 0.8rem; color: var(--text-dim); line-height: 1.4;">${escapeHTML(item.notas)}</p>` : ''}
            
            ${item.enlace ? `
              <a href="${escapeHTML(item.enlace)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.8rem; color: var(--pastel-estudio-accent); text-decoration: none; font-weight: 600; display: inline-block;">
                Ver recurso &rarr;
              </a>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  };

  const escapeHTML = (str) => str ? String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)) : '';

  return { init, fetchEstudio };
})();

window.EstudioModule = EstudioModule;
const EstudioModule = (function () {
  const categorias = ["TODAS", "UNA", "UNEY", "CURSOS"];
  let categoriaActual = "TODAS";

  function renderTabs() {
    const container = document.getElementById("estudio-tabs-container");
    if (!container) return;

    container.innerHTML = categorias.map(cat => `
      <button class="tab-btn ${cat === categoriaActual ? 'active' : ''}" 
              onclick="EstudioModule.setCategoria('${cat}')">
        ${cat}
      </button>
    `).join('');
  }

  function setCategoria(cat) {
    categoriaActual = cat;
    renderTabs();
    renderLista();
  }

  function renderLista() {
    const listEl = document.getElementById("estudio-list");
    if (!listEl) return;
    // Lógica para filtrar y mostrar el contenido según categoriaActual
  }

  function init() {
    renderTabs();
    renderLista();
  }

  return { init, setCategoria };
})();
