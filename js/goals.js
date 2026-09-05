/**
 * Módulo Goals (300, Tsuki, Weekly)
 */
KeepModule('goals', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  
  const URLS = {
    g300: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=goals_300`,
    tsuki: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=goals_tsuki`,
    weekly: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=goals_weekly`
  };

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

  // -------------------------------------------------------------
  // A) 300 GOALS (Etiquetas, Checkbox con Táchado y Filtros)
  // -------------------------------------------------------------
  function setupGoals300(data) {
    const container = document.getElementById('goals-300');
    if (!container) return;

    // Estado local para conservar metas tachadas en sesión
    let items = data.map((d, index) => ({
      id: index,
      nombre: d['300'] || d.Meta || d.meta || '',
      tipo: d.Tipo || d.tipo || 'General',
      dificultad: d.Dificultad || d.dificultad || 'Media',
      completada: false
    })).filter(i => i.nombre);

    const tipos = ['Todos', ...new Set(items.map(i => i.tipo))];
    const dificultades = ['Todas', ...new Set(items.map(i => i.dificultad))];

    let filtroTipo = 'Todos';
    let filtroDificultad = 'Todas';

    function renderView() {
      // Filtrar items
      let filtrados = items.filter(item => {
        const matchTipo = filtroTipo === 'Todos' || item.tipo === filtroTipo;
        const matchDif = filtroDificultad === 'Todas' || item.dificultad === filtroDificultad;
        return matchTipo && matchDif;
      });

      // Ordenar: No completadas primero, completadas al fondo
      filtrados.sort((a, b) => a.completada - b.completada);

      const optsTipo = tipos.map(t => `<option value="${t}" ${t === filtroTipo ? 'selected' : ''}>${t}</option>`).join('');
      const optsDif = dificultades.map(d => `<option value="${d}" ${d === filtroDificultad ? 'selected' : ''}>${d}</option>`).join('');

      let html = `
        <div class="space-y-4">
          <!-- Filtros -->
          <div class="grid grid-cols-2 gap-2 bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs">
            <div>
              <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tipo</label>
              <select id="select-filtro-tipo" class="w-full bg-emerald-50 text-emerald-800 text-xs font-bold py-1.5 px-2 rounded-xl border border-emerald-200 outline-none">
                ${optsTipo}
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Dificultad</label>
              <select id="select-filtro-dif" class="w-full bg-emerald-50 text-emerald-800 text-xs font-bold py-1.5 px-2 rounded-xl border border-emerald-200 outline-none">
                ${optsDif}
              </select>
            </div>
          </div>

          <!-- Lista de Metas -->
          <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 divide-y divide-gray-100">
      `;

      if (filtrados.length === 0) {
        html += `<p class="text-xs text-gray-400 py-4 text-center">No hay metas que coincidan con el filtro.</p>`;
      } else {
        filtrados.forEach(item => {
          html += `
            <div class="py-3 flex items-center justify-between gap-3 ${item.completada ? 'opacity-50' : ''}">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <input type="checkbox" data-id="${item.id}" class="chk-300 w-4 h-4 accent-emerald-600 rounded cursor-pointer" ${item.completada ? 'checked' : ''}>
                <span class="text-xs font-semibold text-gray-800 truncate ${item.completada ? 'line-through text-gray-400' : ''}">
                  ${item.nombre}
                </span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">${item.tipo}</span>
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">${item.dificultad}</span>
              </div>
            </div>
          `;
        });
      }

      html += `</div></div>`;
      container.innerHTML = html;

      // Eventos de Filtro
      document.getElementById('select-filtro-tipo').addEventListener('change', (e) => {
        filtroTipo = e.target.value;
        renderView();
      });
      document.getElementById('select-filtro-dif').addEventListener('change', (e) => {
        filtroDificultad = e.target.value;
        renderView();
      });

      // Eventos de Checkbox
      container.querySelectorAll('.chk-300').forEach(chk => {
        chk.addEventListener('change', (e) => {
          const id = parseInt(e.target.dataset.id);
          const targetItem = items.find(i => i.id === id);
          if (targetItem) targetItem.completada = e.target.checked;
          renderView();
        });
      });
    }

    renderView();
  }

  // -------------------------------------------------------------
  // B) TSUKI (Filtro por Mes actual, Metas Swipeable para Ocultar)
  // -------------------------------------------------------------
  function setupGoalsTsuki(data) {
    const container = document.getElementById('goals-tsuki');
    if (!container) return;

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mesActualNombre = meses[new Date().getMonth()];

    const mesesDisponibles = [...new Set(data.map(d => d.Mes || d.mes))].filter(Boolean);
    let mesSeleccionado = mesesDisponibles.includes(mesActualNombre) ? mesActualNombre : (mesesDisponibles[0] || 'Enero');

    let metasOcultas = new Set();

    function renderView() {
      const opts = mesesDisponibles.map(m => `<option value="${m}" ${m === mesSeleccionado ? 'selected' : ''}>${m}</option>`).join('');
      const metasMes = data.filter(d => (d.Mes || d.mes) === mesSeleccionado);

      let html = `
        <div class="space-y-4">
          <div class="flex items-center justify-between bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs">
            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Mes:</span>
            <select id="select-mes-tsuki" class="bg-emerald-50 text-emerald-800 text-xs font-bold py-1.5 px-3 rounded-xl border border-emerald-200 outline-none">
              ${opts}
            </select>
          </div>

          <div id="tsuki-cards-container" class="space-y-2">
      `;

      let metasVisibles = 0;
      metasMes.forEach((m, idx) => {
        const idMeta = `${mesSeleccionado}-${idx}`;
        if (metasOcultas.has(idMeta)) return;

        metasVisibles++;
        const texto = m.Meta || m.meta || m.Goal || '-';

        html += `
          <div data-id="${idMeta}" class="tsuki-card relative bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs flex justify-between items-center transition-transform duration-200 select-none cursor-pointer">
            <span class="text-xs font-semibold text-gray-800">${texto}</span>
            <span class="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-2 py-1 rounded-lg">Desliza o Toca →</span>
          </div>
        `;
      });

      if (metasVisibles === 0) {
        html += `<p class="text-xs text-gray-400 py-6 text-center">¡Todas las metas de este mes completadas!</p>`;
      }

      html += `</div></div>`;
      container.innerHTML = html;

      document.getElementById('select-mes-tsuki').addEventListener('change', (e) => {
        mesSeleccionado = e.target.value;
        renderView();
      });

      // Lógica de Descarte / Swipe
      container.querySelectorAll('.tsuki-card').forEach(card => {
        let startX = 0;

        card.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; });
        card.addEventListener('touchend', (e) => {
          let endX = e.changedTouches[0].clientX;
          if (startX - endX > 40 || endX - startX > 40) { // Swipe izquierda o derecha
            completarCard(card);
          }
        });

        // Click alternativo para desktop
        card.addEventListener('click', () => completarCard(card));
      });

      function completarCard(card) {
        const id = card.dataset.id;
        card.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
          metasOcultas.add(id);
          renderView();
        }, 200);
      }
    }

    renderView();
  }

  // -------------------------------------------------------------
  // C) WEEKLY GOALS (Marcar como terminada y tachar)
  // -------------------------------------------------------------
  function setupGoalsWeekly(data) {
    const container = document.getElementById('goals-weekly');
    if (!container) return;

    let items = data.map((d, index) => ({
      id: index,
      meta: d.Meta || d.meta || d.Goal || '',
      completada: false
    })).filter(i => i.meta);

    function renderView() {
      let html = `
        <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 space-y-3">
          <div class="flex justify-between items-center border-b border-gray-100 pb-2">
            <span class="text-xs font-bold text-emerald-800 uppercase tracking-wider">Metas de la Semana</span>
            <span class="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              ${items.filter(i => i.completada).length}/${items.length} Listas
            </span>
          </div>
          <div class="divide-y divide-gray-100">
      `;

      items.forEach(item => {
        html += `
          <div class="py-3 flex items-center justify-between gap-3 cursor-pointer item-weekly" data-id="${item.id}">
            <span class="text-xs font-semibold text-gray-800 ${item.completada ? 'line-through text-gray-400' : ''}">
              ${item.meta}
            </span>
            <div class="w-6 h-6 rounded-full flex items-center justify-center border ${item.completada ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 text-transparent'} transition-colors">
              ✓
            </div>
          </div>
        `;
      });

      html += `</div></div>`;
      container.innerHTML = html;

      container.querySelectorAll('.item-weekly').forEach(el => {
        el.addEventListener('click', () => {
          const id = parseInt(el.dataset.id);
          const target = items.find(i => i.id === id);
          if (target) {
            target.completada = !target.completada;
            renderView();
          }
        });
      });
    }

    renderView();
  }

  // Inicialización
  async function initGoals() {
    try {
      const [g300Data, tsukiData, weeklyData] = await Promise.all([
        fetchCSV(URLS.g300),
        fetchCSV(URLS.tsuki),
        fetchCSV(URLS.weekly)
      ]);

      setupGoals300(g300Data);
      setupGoalsTsuki(tsukiData);
      setupGoalsWeekly(weeklyData);
    } catch (err) {
      console.error('Error al cargar datos de Goals:', err);
    }
  }

  initGoals();
});
