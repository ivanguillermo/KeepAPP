/* ==========================================
   MÓDULO: GOALS / METAS - KEEPAPP
   Carga con PapaParse desde Google Sheets (CSV)
   ========================================== */

const GoalsModule = (() => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=goals`;

  let goalsData = [];
  let currentCategory = 'todas';

  /* ------------------------------------------
     1. INICIALIZACIÓN Y EVENTOS
     ------------------------------------------ */
  const init = () => {
    fetchGoals();
  };

  const fetchGoals = () => {
    if (typeof Papa === 'undefined') {
      console.error('PapaParse no está disponible.');
      return;
    }

    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        goalsData = processGoals(results.data);
        renderCategories();
        renderGoals();
      },
      error: (err) => {
        console.error('Error al cargar la pestaña goals:', err);
      }
    });
  };

  const processGoals = (data) => {
    return data.map((item, index) => ({
      id: item.id || `goal-${index}`,
      texto: item.meta || item.goal || item.texto || item.Meta || '',
      categoria: (item.categoria || item.Categoria || 'General').trim(),
      completada: (item.completada || item.estado || '').toLowerCase() === 'true' || item.completada === '1'
    })).filter(g => g.texto.trim() !== '');
  };

  /* ------------------------------------------
     2. RENDERIZADO DE CATEGORÍAS Y METAS
     ------------------------------------------ */
  const renderCategories = () => {
    const container = document.getElementById('goals-tabs-container');
    if (!container) return;

    // Obtener categorías únicas
    const categories = ['todas', ...new Set(goalsData.map(g => g.categoria))];

    container.innerHTML = categories.map(cat => `
      <button class="goals-tab-btn ${cat === currentCategory ? 'active' : ''}" data-cat="${escapeHTML(cat)}">
        ${capitalize(cat)}
      </button>
    `).join('');

    container.querySelectorAll('.goals-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentCategory = e.currentTarget.dataset.cat;
        renderCategories();
        renderGoals();
      });
    });
  };

  const renderGoals = () => {
    const container = document.getElementById('goals-list');
    if (!container) return;

    const filtered = currentCategory === 'todas' 
      ? goalsData 
      : goalsData.filter(g => g.categoria === currentCategory);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--text-dim);">
          <p style="margin: 0;">No hay metas en esta categoría.</p>
        </div>`;
      return;
    }

    container.innerHTML = filtered.map(g => `
      <div class="swipe-item-wrapper" data-id="${g.id}">
        <div class="swipe-content goal-card ${g.completada ? 'completed' : ''}">
          <div class="goal-info">
            <span class="badge" style="background: var(--pastel-goals-bg); color: var(--pastel-goals-accent); border: 1px solid var(--pastel-goals-border); align-self: flex-start;">
              ${escapeHTML(g.categoria)}
            </span>
            <span class="goal-text">${escapeHTML(g.texto)}</span>
          </div>
        </div>
        <button class="swipe-action-btn" onclick="GoalsModule.toggleGoal('${g.id}')">
          ${g.completada ? 'Desmarcar' : 'Listo'}
        </button>
      </div>
    `).join('');

    setupSwipeGestures();
  };

  /* ------------------------------------------
     3. GESTOS SWIPE Y ACCIONES
     ------------------------------------------ */
  const setupSwipeGestures = () => {
    const wrappers = document.querySelectorAll('.swipe-item-wrapper');

    wrappers.forEach(wrapper => {
      let startX = 0;
      let currentX = 0;

      wrapper.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      }, { passive: true });

      wrapper.addEventListener('touchmove', (e) => {
        currentX = e.touches[0].clientX;
        const diff = startX - currentX;

        if (diff > 30) {
          wrapper.classList.add('swiped');
        } else if (diff < -30) {
          wrapper.classList.remove('swiped');
        }
      }, { passive: true });
    });
  };

  const toggleGoal = (id) => {
    const goal = goalsData.find(g => g.id === id);
    if (goal) {
      goal.completada = !goal.completada;
      renderGoals();
    }
  };

  const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  const escapeHTML = (str) => str ? String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)) : '';

  return { init, fetchGoals, toggleGoal };
})();

window.GoalsModule = GoalsModule;
