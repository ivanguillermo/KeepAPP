/**
 * js/geld.js - Módulo Geld: Compras, Resumen de Gastos y Registro Directo a Sheets
 */
KeepModule('geld', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby09O4ij5fm4r89btL2j8g6VYNqFgFzSEb0ugBrouOh1HeQ_PIFfnJmG54upApSNxv_/exec';

  const URL_COMPRAS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=compras`;
  const URL_GASTOS_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=gastos`;

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

  // Helper para obtener datos remotos de gastos desde Sheets
  async function cargarGastosRemotos() {
    try {
      const data = await fetchCSV(URL_GASTOS_CSV);
      return data.map((r, i) => ({
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
      return [];
    }
  }

  // -------------------------------------------------------------
  // 2. SUBSECCIÓN RESUMEN DE GASTOS
  // -------------------------------------------------------------
  async function setupResumen(container) {
    if (!container) return;

    container.innerHTML = `<p class="text-xs text-gray-400 p-4 text-center">Calculando resumen de gastos...</p>`;
    const gastos = await cargarGastosRemotos();

    if (gastos.length === 0) {
      container.innerHTML = `<p class="text-xs text-gray-400 p-4 text-center">No hay gastos registrados en la hoja para generar el resumen.</p>`;
      return;
    }

    const totalGastado = gastos.reduce((sum, g) => sum + g.monto, 0);

    // Agrupar por categoría
    const porCategoria = {};
    gastos.forEach(g => {
      porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
    });

    const categoriasOrdenadas = Object.keys(porCategoria).sort((a, b) => porCategoria[b] - porCategoria[a]);

    let html = `
      <div class="space-y-4">
        <!-- Card Total -->
        <div class="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex justify-between items-center shadow-xs">
          <div>
            <p class="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Total Gastado</p>
            <p class="text-xl font-black text-rose-950">$${totalGastado.toFixed(2)}</p>
          </div>
          <span class="text-xs bg-rose-200 text-rose-800 font-bold px-2.5 py-1 rounded-xl">
            ${gastos.length} Transacciones
          </span>
        </div>

        <!-- Desglose por Categoría -->
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
  // 3. SUBSECCIÓN GASTOS (REGISTRO DIRECTO A GOOGLE SHEETS)
  // -------------------------------------------------------------
  function setupGastos(container) {
    if (!container) return;

    async function renderView() {
      container.innerHTML = `<p class="text-xs text-gray-400 p-4 text-center">Cargando gastos desde la hoja...</p>`;
      const gastosGuardados = await cargarGastosRemotos();

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
                <p class="text-[10px] text-gray-400 mt-0.5">${g.lugar} • <span class="text-emerald-700 font-semibold">${g.metodo}</span> • <span class="text-gray-400">${g.fecha}</span></p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="font-black text-gray-900">$${g.monto.toFixed(2)}</span>
              </div>
            </div>
          `;
        });
      }

      html += `</div></div>`;
      container.innerHTML = html;

      const btnNuevo = container.querySelector('#btn-nuevo-gasto');
      const form = container.querySelector('#form-gasto');
      const btnCancelar = container.querySelector('#btn-cancelar-gasto');
      const btnGuardar = container.querySelector('#btn-guardar-gasto');
      const statusMsg = container.querySelector('#gasto-status');

      if (btnNuevo && form) {
        btnNuevo.addEventListener('click', () => {
          form.classList.remove('hidden');
          btnNuevo.classList.add('hidden');
        });
      }

      if (btnCancelar && form) {
        btnCancelar.addEventListener('click', () => {
          form.classList.add('hidden');
          btnNuevo.classList.remove('hidden');
        });
      }

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          btnGuardar.disabled = true;
          statusMsg.className = "text-[11px] text-center text-emerald-600 block font-semibold";
          statusMsg.textContent = "Guardando gasto en Google Sheets...";

          const nuevoGasto = {
            id: 'gasto_' + Date.now(),
            fecha: new Date().toLocaleDateString('es-ES'),
            descripcion: container.querySelector('#gasto-desc').value,
            categoria: container.querySelector('#gasto-categoria').value,
            monto: container.querySelector('#gasto-monto').value,
            lugar: container.querySelector('#gasto-lugar').value || 'N/A',
            metodo: container.querySelector('#gasto-metodo').value
          };

          try {
            // Guardar directamente en Apps Script sin usar localStorage
            await fetch(APPS_SCRIPT_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'guardarGasto', payload: nuevoGasto })
            });

            // Refrescar vistas de gastos y el resumen
            await renderView();
            const cResumen = document.getElementById('geld-resumen');
            if (cResumen) setupResumen(cResumen);
          } catch (err) {
            statusMsg.className = "text-[11px] text-center text-red-500 block";
            statusMsg.textContent = "Error al guardar: " + err.message;
            btnGuardar.disabled = false;
          }
        });
      }
    }

    renderView();
  }

  // -------------------------------------------------------------
  // INICIALIZACIÓN
  // -------------------------------------------------------------
  async function initGeld() {
    const cCompras = document.getElementById('geld-compras');
    const cResumen = document.getElementById('geld-resumen');
    const cGastos = document.getElementById('geld-gastos');

    if (cGastos) setupGastos(cGastos);
    if (cResumen) setupResumen(cResumen);

    try {
      if (cCompras) {
        const dataCompras = await fetchCSV(URL_COMPRAS);
        setupCompras(dataCompras, cCompras);
      }
    } catch (e) {
      console.error('Error al cargar compras:', e);
    }
  }

  initGeld();
});
