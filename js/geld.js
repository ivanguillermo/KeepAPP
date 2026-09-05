/**
 * js/geld.js - Módulo Geld: Compras, Libro Diario y Registro de Gastos
 */
KeepModule('geld', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznDyGCaRoePoaDBJg-OFBC_Bt0f3DPQy8_TWFH9lJSaq02YYJeLUW9uh-NqbRQFiA/exec';

  const URL_COMPRAS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=compras`;
  const URL_LIBRO = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=libro_diario`;
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

  // -------------------------------------------------------------
  // 2. SUBSECCIÓN LIBRO DIARIO
  // -------------------------------------------------------------
  function setupLibroDiario(data, container) {
    if (!container) return;

    let saldoBanco = '0';
    let deudaCashea = '0';

    data.forEach(row => {
      const desc = String(row['Descripción'] || Object.values(row)[1] || '');
      const monto = String(row['Cuenta'] || Object.values(row)[2] || '0');
      if (desc.includes('Saldo Banco')) saldoBanco = monto;
      if (desc.includes('Deuda Cashea')) deudaCashea = monto;
    });

    const asientos = data
      .map(d => ({
        fecha: d['Fecha'] || '',
        descripcion: d['Descripción'] || '',
        cuenta: d['Cuenta'] || '',
        debe: d['Debe'] || '',
        haber: d['Haber'] || ''
      }))
      .filter(a => a.fecha.trim() !== '' && a.fecha !== 'Fecha');

    let html = `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
            <p class="text-[10px] font-bold text-emerald-600 uppercase">Saldo Banco</p>
            <p class="text-sm font-black text-emerald-900">${saldoBanco}</p>
          </div>
          <div class="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
            <p class="text-[10px] font-bold text-amber-600 uppercase">Deuda Cashea</p>
            <p class="text-sm font-black text-amber-900">${deudaCashea}</p>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-3 shadow-xs border border-emerald-100 max-h-[60vh] overflow-y-auto space-y-2">
    `;

    if (asientos.length === 0) {
      html += `<p class="text-xs text-gray-400 py-4 text-center">No hay asientos contables registrados.</p>`;
    } else {
      asientos.forEach(a => {
        html += `
          <div class="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex justify-between items-start text-xs gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">${a.fecha}</span>
                <span class="font-bold text-gray-800 truncate">${a.descripcion}</span>
              </div>
              <p class="text-[10px] text-gray-500 mt-1">${a.cuenta}</p>
            </div>
            <div class="text-right shrink-0">
              ${a.debe ? `<p class="text-emerald-700 font-bold">D: ${a.debe}</p>` : ''}
              ${a.haber ? `<p class="text-rose-600 font-bold">H: ${a.haber}</p>` : ''}
            </div>
          </div>
        `;
      });
    }

    html += `</div></div>`;
    container.innerHTML = html;
  }

  // -------------------------------------------------------------
  // 3. SUBSECCIÓN GASTOS (REGISTRO INDEPENDIENTE)
  // -------------------------------------------------------------
  function setupGastos(container) {
    if (!container) return;

    async function renderView() {
      let gastosGuardados = [];

      try {
        gastosGuardados = await fetchCSV(URL_GASTOS_CSV);
      } catch (e) {
        console.warn("No se pudo leer la pestaña gastos desde Google Sheets, leyendo localmente:", e);
        gastosGuardados = JSON.parse(localStorage.getItem('geld_gastos_personales') || '[]');
      }

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
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Monto</label>
                <input type="number" step="0.01" id="gasto-monto" required placeholder="0.00" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Lugar</label>
                <input type="text" id="gasto-lugar" placeholder="Ej. Unicasa, Bodega" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
              </div>
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
          const desc = g.Descripción || g.descripcion || '-';
          const monto = g.Monto || g.monto || '0.00';
          const lugar = g.Lugar || g.lugar || 'N/A';
          const metodo = g.Método || g.metodo || '-';

          html += `
            <div class="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
              <div>
                <p class="font-bold text-gray-800">${desc}</p>
                <p class="text-[10px] text-gray-400">${lugar} • <span class="text-emerald-700 font-semibold">${metodo}</span></p>
              </div>
              <span class="font-black text-gray-900">${monto}</span>
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
            descripcion: container.querySelector('#gasto-desc').value,
            monto: container.querySelector('#gasto-monto').value,
            lugar: container.querySelector('#gasto-lugar').value,
            metodo: container.querySelector('#gasto-metodo').value,
            fecha: new Date().toLocaleDateString()
          };

          try {
            await fetch(APPS_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'guardarGasto', payload: nuevoGasto })
            });

            await renderView();
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
    const cLibro = document.getElementById('geld-libro');
    const cGastos = document.getElementById('geld-gastos');

    if (cGastos) setupGastos(cGastos);

    try {
      if (cCompras) {
        const dataCompras = await fetchCSV(URL_COMPRAS);
        setupCompras(dataCompras, cCompras);
      }
    } catch (e) {
      console.error('Error al cargar compras:', e);
    }

    try {
      if (cLibro) {
        const dataLibro = await fetchCSV(URL_LIBRO);
        setupLibroDiario(dataLibro, cLibro);
      }
    } catch (e) {
      console.error('Error al cargar libro diario:', e);
    }
  }

  initGeld();
});
