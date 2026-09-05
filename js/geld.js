/**
 * js/geld.js - Módulo Geld: Compras, Resumen de Gastos y Registro Directo a Sheets + LocalStorage
 */
KeepModule('geld', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby8Ozg6Zm_tZRGP0dE8lCVGqYaAoFepoY7hZrmkmgl52-OBcGa7rKbtDrfV6hDK51Zz/exec';

  const URL_COMPRAS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=compras`;
  const URL_GASTOS_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=gastos`;

  // LocalStorage Helpers
  function getGastosLocales() {
    try {
      return JSON.parse(localStorage.getItem('geld_gastos_locales')) || [];
    } catch (e) {
      return [];
    }
  }

  function saveGastoLocal(gasto) {
    const actuales = getGastosLocales();
    actuales.push(gasto);
    localStorage.setItem('geld_gastos_locales', JSON.stringify(actuales));
  }

  async function fetchCSV(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      const csvText = await response.text();

      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (err) => reject(err)
        });
      });
    } catch (err) {
      console.warn('Error al obtener CSV de Sheets:', err);
      return [];
    }
  }

  // -------------------------------------------------------------
  // 1. SUBSECCIÓN COMPRAS
  // -------------------------------------------------------------
  function setupCompras(data, container) {
    if (!container) return;

    const productos = data
      .map(d => ({
        producto: d['Producto'] || '',
        categoria: d['Categoria'] || 'Otros',
        unidad: d['Unidad'] || '',
        precioUsd: d['Precio_USD'] || '0',
        precioVes: d['Precio_VES'] || '0'
      }))
      .filter(p => p.producto.trim() !== '');

    const categorias = ['Todas', ...new Set(productos.map(p => p.categoria).filter(Boolean))];
    let catSeleccionada = 'Todas';

    function renderView() {
      const filtrados = productos.filter(p => catSeleccionada === 'Todas' || p.categoria === catSeleccionada);
      const optsCat = categorias.map(c => `<option value="${c}" ${c === catSeleccionada ? 'selected' : ''}>${c}</option>`).join('');

      let html = `
        <div class="space-y-4">
          <div class="bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Categoría:</span>
            <select id="select-cat-compras" class="bg-emerald-50 text-emerald-800 text-xs font-bold py-1.5 px-3 rounded-xl border border-emerald-200 outline-none">
              ${optsCat}
            </select>
          </div>

          <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
      `;

      if (filtrados.length === 0) {
        html += `<p class="text-xs text-gray-400 py-4 text-center">No hay productos en esta categoría.</p>`;
      } else {
        filtrados.forEach(item => {
          html += `
            <div class="py-2.5 flex items-center justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold text-gray-800 truncate">${item.producto}</p>
                <p class="text-[10px] text-gray-400">${item.unidad ? item.unidad + ' • ' : ''}${item.categoria}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-xs font-bold text-emerald-700">$${item.precioUsd}</p>
                <p class="text-[10px] text-gray-400">Bs. ${item.precioVes}</p>
              </div>
            </div>
          `;
        });
      }

      html += `</div></div>`;
      container.innerHTML = html;

      const sel = container.querySelector('#select-cat-compras');
      if (sel) {
        sel.addEventListener('change', (e) => {
          catSeleccionada = e.target.value;
          renderView();
        });
      }
    }

    renderView();
  }

  // Combinar gastos guardados en Google Sheets con los guardados en LocalStorage
  async function cargarTodosLosGastos() {
    let gastosRemotos = [];
    try {
      const data = await fetchCSV(URL_GASTOS_CSV);
      gastosRemotos = data.map((r, i) => ({
        id: r.ID || r.id || `remoto_${i}`,
        fecha: r.Fecha || r.fecha || '',
        descripcion: r.Descripción || r.descripcion || '',
        categoria: r.Categoría || r.categoria || 'Otro',
        monto: parseFloat(r.Monto || r.monto || 0),
        lugar: r.Lugar || r.lugar || 'N/A',
        metodo: r.Método || r.metodo || 'Otro'
      }));
    } catch (e) {
      console.warn("Error al cargar gastos desde Google Sheets:", e);
    }

    const gastosLocales = getGastosLocales();
    return [...gastosRemotos, ...gastosLocales];
  }

  // -------------------------------------------------------------
  // 2. SUBSECCIÓN RESUMEN DE GASTOS
  // -------------------------------------------------------------
  async function setupResumen(container) {
    if (!container) return;

    container.innerHTML = `<p class="text-xs text-gray-400 p-4 text-center">Calculando resumen de gastos...</p>`;
    const gastos = await cargarTodosLosGastos();

    if (gastos.length === 0) {
      container.innerHTML = `<p class="text-xs text-gray-400 p-4 text-center">No hay gastos registrados para generar el resumen.</p>`;
      return;
    }

    const totalGastado = gastos.reduce((sum, g) => sum + (isNaN(g.monto) ? 0 : g.monto), 0);

    const porCategoria = {};
    gastos.forEach(g => {
      const cat = g.categoria || 'Otros';
      const m = isNaN(g.monto) ? 0 : g.monto;
      porCategoria[cat] = (porCategoria[cat] || 0) + m;
    });

    const categoriasOrdenadas = Object.keys(porCategoria).sort((a, b) => porCategoria[b] - porCategoria[a]);

    let html = `
      <div class="space-y-4">
        <div class="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex justify-between items-center shadow-xs">
          <div>
            <p class="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Total Gastado</p>
            <p class="text-xl font-black text-rose-950">$${totalGastado.toFixed(2)}</p>
          </div>
          <span class="text-xs bg-rose-200 text-rose-800 font-bold px-2.5 py-1 rounded-xl">
            ${gastos.length} Transacciones
          </span>
        </div>

        <div class="bg-white rounded-2xl p-4 shadow-xs border border-rose-100 space-y-3">
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gastos por Categoría</p>
          <div class="space-y-2.5">
    `;

    categoriasOrdenadas.forEach(cat => {
      const montoCat = porCategoria[cat];
      const porcentaje = totalGastado > 0 ? ((montoCat / totalGastado) * 100).toFixed(1) : 0;

      html += `
        <div class="space-y-1">
          <div class="flex justify-between items-center text-xs">
            <span class="font-bold text-gray-700">${cat}</span>
            <div class="text-right">
              <span class="font-black text-gray-900">$${montoCat.toFixed(2)}</span>
              <span class="text-[10px] text-gray-400 ml-1">(${porcentaje}%)</span>
            </div>
          </div>
          <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div class="bg-rose-500 h-full rounded-full" style="width: ${porcentaje}%"></div>
          </div>
        </div>
      `;
    });

    html += `</div></div></div>`;
    container.innerHTML = html;
  }

  // -------------------------------------------------------------
  // 3. SUBSECCIÓN GASTOS (REGISTRO EN LOCALSTORAGE Y SHEETS)
  // -------------------------------------------------------------
  function setupGastos(container) {
    if (!container) return;

    async function renderView() {
      container.innerHTML = `<p class="text-xs text-gray-400 p-4 text-center">Cargando gastos...</p>`;
      const gastosGuardados = await cargarTodosLosGastos();

      let html = `
        <div class="space-y-4">
          <button id="btn-nuevo-gasto" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-2xl text-xs shadow-xs transition-colors">
            + Nuevo Gasto
          </button>

          <form id="form-gasto" class="hidden bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-3">
            <p class="text-xs font-bold text-emerald-800 uppercase border-b border-gray-100 pb-2">Registrar Factura / Gasto</p>

            <div>
              <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descripción</label>
              <input type="text" id="gasto-desc" required placeholder="Ej. Almuerzo, Harina" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Categoría</label>
                <select id="gasto-categoria" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none font-semibold text-gray-700">
                  <option value="Comida">Comida</option>
                  <option value="Servicio">Servicio</option>
                  <option value="Limpieza">Limpieza</option>
                  <option value="Hormiga">Hormiga</option>
                  <option value="Ropa">Ropa</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Monto ($)</label>
                <input type="number" step="0.01" id="gasto-monto" required placeholder="0.00" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Lugar</label>
                <input type="text" id="gasto-lugar" placeholder="Ej. Unicasa, Bodega" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Método de Pago</label>
                <select id="gasto-metodo" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none font-semibold text-gray-700">
                  <option value="Efectivo">Efectivo</option>
                  <option value="miBanesco">miBanesco</option>
                  <option value="BanescoSR">BanescoSR</option>
                  <option value="TarjetaNaranja">TarjetaNaranja</option>
                  <option value="Zulima">Zulima</option>
                  <option value="Cashea">Cashea</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            <div class="flex gap-2 pt-2">
              <button type="button" id="btn-cancelar-gasto" class="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-xl">Cancelar</button>
              <button type="submit" id="btn-guardar-gasto" class="flex-1 bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl">Guardar</button>
            </div>
            <p id="gasto-status" class="text-[11px] text-center hidden"></p>
          </form>

          <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 space-y-2 max-h-[50vh] overflow-y-auto">
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Gastos Registrados</p>
      `;

      if (gastosGuardados.length === 0) {
        html += `<p class="text-xs text-gray-400 py-4 text-center">No hay gastos guardados aún.</p>`;
      } else {
        gastosGuardados.slice().reverse().forEach(g => {
          html += `
            <div class="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-gray-800 truncate">${g.descripcion}</span>
                  <span class="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">${g.categoria}</span>
                </div>
                <p class="text-[10px] text-gray-400 mt-0.5">${g.fecha} • ${g.lugar} • ${g.metodo}</p>
              </div>
              <p class="font-black text-rose-600 shrink-0">$${(isNaN(g.monto) ? 0 : g.monto).toFixed(2)}</p>
            </div>
          `;
        });
      }

      html += `</div></div>`;
      container.innerHTML = html;

      // Eventos UI Formulario
      const btnNuevo = container.querySelector('#btn-nuevo-gasto');
      const formGasto = container.querySelector('#form-gasto');
      const btnCancelar = container.querySelector('#btn-cancelar-gasto');
      const gastoStatus = container.querySelector('#gasto-status');

      if (btnNuevo && formGasto) {
        btnNuevo.addEventListener('click', () => {
          formGasto.classList.remove('hidden');
          btnNuevo.classList.add('hidden');
        });
      }

      if (btnCancelar && formGasto) {
        btnCancelar.addEventListener('click', () => {
          formGasto.reset();
          formGasto.classList.add('hidden');
          btnNuevo.classList.remove('hidden');
        });
      }

      // Manejo de envío del formulario
      if (formGasto) {
        formGasto.addEventListener('submit', async (e) => {
          e.preventDefault();

          const fechaHoy = new Date().toISOString().split('T')[0];
          const nuevoGasto = {
            id: 'loc_' + Date.now(),
            fecha: fechaHoy,
            descripcion: document.getElementById('gasto-desc').value.trim(),
            categoria: document.getElementById('gasto-categoria').value,
            monto: parseFloat(document.getElementById('gasto-monto').value) || 0,
            lugar: document.getElementById('gasto-lugar').value.trim() || 'N/A',
            metodo: document.getElementById('gasto-metodo').value
          };

          // 1. Guardar en LocalStorage de inmediato
          saveGastoLocal(nuevoGasto);

          gastoStatus.textContent = "Guardando en Google Sheets...";
          gastoStatus.className = "text-[11px] text-center text-amber-600 font-bold block";

          // 2. Enviar a Google Apps Script
          try {
            await fetch(APPS_SCRIPT_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sheet: 'gastos',
                action: 'append',
                data: nuevoGasto
              })
            });
          } catch (err) {
            console.warn("Error enviando gasto a Apps Script:", err);
          }

          gastoStatus.textContent = "¡Gasto registrado con éxito!";
          gastoStatus.className = "text-[11px] text-center text-emerald-600 font-bold block";

          setTimeout(() => {
            renderView();
          }, 800);
        });
      }
    }

    renderView();
  }

  // Carga inicial de pestañas en Geld
  async function initGeld() {
    const elCompras = document.getElementById('geld-compras');
    const elResumen = document.getElementById('geld-resumen');
    const elGastos = document.getElementById('geld-gastos');

    if (elCompras) {
      const dataCompras = await fetchCSV(URL_COMPRAS);
      setupCompras(dataCompras, elCompras);
    }

    if (elGastos) setupGastos(elGastos);

    // Cargar o refrescar resumen al hacer clic en su pestaña
    const tabResumenBtn = document.querySelector('[data-tab="geld-resumen"]');
    if (tabResumenBtn) {
      tabResumenBtn.addEventListener('click', () => {
        if (elResumen) setupResumen(elResumen);
      });
    }
  }

  initGeld();
});
