/**
 * js/geld.js - Módulo Geld: Compras, Resumen, Gastos y Gastos Futuros.
 * Lectura de hojas vía auth.js (backend seguro) y escritura vía POST con respuesta verificada.
 */
KeepModule('geld', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const APPS_SCRIPT_URL = window.KEEP_BACKEND_URL;

  const URL_COMPRAS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=compras`;
  const URL_GASTOS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=gastos`;
  const URL_GASTOS_FUTUROS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=gastos_futuros`;

  // Función genérica para leer CSVs de Google Sheets
  async function fetchCSV(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
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

  // POST a Apps Script leyendo la respuesta real. Lanza error si el servidor no responde 'success'.
  async function postJSON(payload) {
    const r = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (j.status !== 'success') throw new Error(j.message || 'Error del servidor');
    return j;
  }

  // Igual que postJSON pero avisa con alert y devuelve true/false (para los botones simples)
  async function postToAppsScript(payload) {
    try { await postJSON(payload); return true; }
    catch (err) { alert('No se pudo guardar: ' + err.message); return false; }
  }

  // Escapar texto que viene del Sheet antes de meterlo en innerHTML
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Normalizar nombres de claves del CSV para evitar fallos por mayúsculas o espacios
  function normalizarObjeto(obj) {
    const res = {};
    Object.keys(obj).forEach(k => {
      res[k.trim().toLowerCase()] = obj[k];
    });
    return res;
  }

  // -------------------------------------------------------------
  // 1. SUBSECCIÓN COMPRAS
  // -------------------------------------------------------------
  let catComprasSel = 'Todas';

  function abrirEditorCompra(p, categorias, alTerminar) {
    const nuevo = !p;
    const m = document.createElement('div');
    m.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
    const campo = 'w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none focus:border-emerald-400';
    const lbl = 'block text-[10px] font-bold text-gray-400 uppercase mb-1';
    m.innerHTML = `
      <form class="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3 text-xs shadow-xl">
        <h3 class="text-sm font-bold text-gray-800">${nuevo ? 'Nuevo artículo' : 'Editar artículo'}</h3>
        <div><label class="${lbl}">Nombre</label>
          <input name="producto" required value="${esc(p ? p.producto : '')}" class="${campo}"></div>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="${lbl}">Categoría</label>
            <input name="categoria" list="dl-cat-compras" value="${esc(p ? p.categoria : '')}" class="${campo}">
            <datalist id="dl-cat-compras">${categorias.filter(c => c !== 'Todas').map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
          <div><label class="${lbl}">Precio USD</label>
            <input name="precio" type="number" step="0.01" min="0" required value="${esc(p ? p.precioUsd : '')}" class="${campo}"></div>
        </div>
        <p class="msg text-[11px] text-center text-red-500 hidden"></p>
        <div class="flex items-center gap-2 pt-1">
          ${nuevo ? '' : '<button type="button" data-borrar class="px-3 py-2 rounded-xl bg-rose-50 text-rose-600 font-bold">🗑 Borrar</button>'}
          <span class="flex-1"></span>
          <button type="button" data-x class="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold">Cancelar</button>
          <button class="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold">Guardar</button>
        </div>
      </form>`;
    document.body.appendChild(m);

    const form = m.querySelector('form');
    const msg = m.querySelector('.msg');
    const error = (t) => { msg.textContent = t; msg.classList.remove('hidden'); };
    const cerrar = () => m.remove();
    m.addEventListener('click', (e) => { if (e.target === m) cerrar(); });
    m.querySelector('[data-x]').onclick = cerrar;

    form.onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const payload = nuevo
        ? { action: 'actualizarPrecioCompra', producto: f.get('producto').trim(), categoria: (f.get('categoria') || '').trim() || 'Otros', precio_usd: parseFloat(f.get('precio')) }
        : { action: 'editarProductoCompra', producto_original: p.producto, producto: f.get('producto').trim(), categoria: (f.get('categoria') || '').trim() || 'Otros', precio_usd: parseFloat(f.get('precio')) };
      try { await postJSON(payload); cerrar(); alTerminar(); }
      catch (err) { error(err.message); }
    };

    const btnBorrar = m.querySelector('[data-borrar]');
    if (btnBorrar) btnBorrar.onclick = async () => {
      if (!confirm(`¿Borrar "${p.producto}" de la lista de compras?`)) return;
      try { await postJSON({ action: 'eliminarProductoCompra', producto: p.producto }); cerrar(); alTerminar(); }
      catch (err) { error(err.message); }
    };
  }

  function setupCompras(data, container) {
    if (!container) return;

    const productos = data
      .map(d => {
        const item = normalizarObjeto(d);
        return {
          producto: item['producto'] || '',
          categoria: item['categoria'] || 'Otros',
          unidad: item['unidad'] || '',
          precioUsd: item['precio_usd'] || '0',
          precioVes: item['precio_ves'] || '0'
        };
      })
      .filter(p => p.producto.trim() !== '');
    productos.forEach((p, i) => { p.i = i; });

    const categorias = ['Todas', ...new Set(productos.map(p => p.categoria).filter(Boolean))];
    if (!categorias.includes(catComprasSel)) catComprasSel = 'Todas';

    async function refrescar() {
      const dataRefresh = await fetchCSV(URL_COMPRAS);
      setupCompras(dataRefresh, container);
    }

    function renderView() {
      const filtrados = productos.filter(p => catComprasSel === 'Todas' || p.categoria === catComprasSel);
      const optsCat = categorias.map(c => `<option value="${esc(c)}" ${c === catComprasSel ? 'selected' : ''}>${esc(c)}</option>`).join('');

      let html = `
        <div class="space-y-4">
          <div class="bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Categoría:</span>
            <select id="select-cat-compras" class="bg-emerald-50 text-emerald-800 text-xs font-bold py-1.5 px-3 rounded-xl border border-emerald-200 outline-none flex-1 min-w-0">
              ${optsCat}
            </select>
            <button id="btn-nuevo-compra" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shrink-0">+ Nuevo</button>
          </div>

          <div class="bg-white rounded-2xl p-4 shadow-xs border border-emerald-100 divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
      `;

      if (filtrados.length === 0) {
        html += `<p class="text-xs text-gray-400 py-4 text-center">No hay productos registrados.</p>`;
      } else {
        filtrados.forEach((item) => {
          html += `
            <div class="py-2.5 flex items-center justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold text-gray-800 truncate">${esc(item.producto)}</p>
                <p class="text-[10px] text-gray-400">${item.unidad ? esc(item.unidad) + ' • ' : ''}${esc(item.categoria)}</p>
              </div>
              <div class="text-right shrink-0 flex items-center gap-2">
                <div>
                  <p class="text-xs font-bold text-emerald-700">$${esc(item.precioUsd)}</p>
                  <p class="text-[10px] text-gray-400">Bs. ${esc(item.precioVes)}</p>
                </div>
                <button class="btn-editar-compra p-1.5 bg-gray-100 hover:bg-emerald-100 text-gray-600 hover:text-emerald-800 rounded-lg text-xs" data-i="${item.i}" title="Editar">✏️</button>
              </div>
            </div>
          `;
        });
      }

      html += `</div></div>`;
      container.innerHTML = html;

      container.querySelector('#select-cat-compras').addEventListener('change', (e) => {
        catComprasSel = e.target.value;
        renderView();
      });
      container.querySelector('#btn-nuevo-compra').addEventListener('click', () => abrirEditorCompra(null, categorias, refrescar));
      container.querySelectorAll('.btn-editar-compra').forEach(btn => {
        btn.addEventListener('click', () => abrirEditorCompra(productos[Number(btn.dataset.i)], categorias, refrescar));
      });
    }

    renderView();
  }

  // -------------------------------------------------------------
  // 2. SUBSECCIÓN RESUMEN DE GASTOS
  // -------------------------------------------------------------
  async function setupResumen(container) {
    if (!container) return;

    container.innerHTML = `<p class="text-xs text-gray-400 p-4 text-center">Calculando resumen de gastos...</p>`;
    
    const rawData = await fetchCSV(URL_GASTOS);
    const gastos = rawData.map(d => {
      const item = normalizarObjeto(d);
      return {
        monto: parseFloat(item['monto']) || 0,
        categoria: item['categoria'] || 'Otro'
      };
    });

    if (gastos.length === 0) {
      container.innerHTML = `<p class="text-xs text-gray-400 p-4 text-center">No hay gastos registrados para generar el resumen.</p>`;
      return;
    }

    const totalGastado = gastos.reduce((sum, g) => sum + g.monto, 0);
    const porCategoria = {};
    gastos.forEach(g => {
      porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
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
  // 3. SUBSECCIÓN GASTOS (Lectura CSV Directa)
  // -------------------------------------------------------------
  function setupGastos(container) {
    if (!container) return;

    async function renderView() {
      container.innerHTML = `<p class="text-xs text-gray-400 p-4 text-center">Cargando gastos registrados...</p>`;
      
      const rawGastos = await fetchCSV(URL_GASTOS);
      const gastos = rawGastos.map(d => {
        const item = normalizarObjeto(d);
        return {
          id: item['id'] || '',
          fecha: item['fecha'] || '',
          descripcion: item['descripcion'] || '',
          categoria: item['categoria'] || 'Otro',
          monto: parseFloat(item['monto']) || 0,
          lugar: item['lugar'] || '',
          metodo: item['metodo'] || ''
        };
      }).filter(g => g.descripcion !== '' || g.id !== '');

      let html = `
        <div class="space-y-4">
          <button id="btn-nuevo-gasto" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-2xl text-xs shadow-xs transition-colors">
            + Nuevo Gasto
          </button>

          <form id="form-gasto" class="hidden bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-3">
            <p class="text-xs font-bold text-emerald-800 uppercase border-b border-gray-100 pb-2">Registrar Factura / Gasto</p>

            <div>
              <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descripción</label>
              <input type="text" id="gasto-desc" required placeholder="Ej. Huevos, Cafe" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Categoría</label>
                <select id="gasto-categoria" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none font-semibold text-gray-700">
                  <option value="Comida">Comida</option>
                  <option value="Medicinas">Medicinas</option>
                  <option value="Ropa">Ropa</option>
                  <option value="Hogar">Hogar</option>
                  <option value="Pasajes">Pasajes</option>
                  <option value="Sr">Sr</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Monto ($/Bs)</label>
                <input type="number" step="0.01" id="gasto-monto" required placeholder="0.00" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Lugar</label>
                <input type="text" id="gasto-lugar" placeholder="Ej. Farmatodo" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Método de Pago</label>
                <select id="gasto-metodo" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none font-semibold text-gray-700">
                  <option value="Banesco Yo">Banesco Yo</option>
                  <option value="Banesco Sr">Banesco Sr</option>
                  <option value="Cashea">Cashea</option>
                  <option value="Efectivo">Efectivo</option>
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
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Gastos Registrados (${gastos.length})</p>
      `;

      if (gastos.length === 0) {
        html += `<p class="text-xs text-gray-400 py-4 text-center">No hay gastos en la hoja.</p>`;
      } else {
        gastos.slice().reverse().forEach(g => {
          html += `
            <div class="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-mono text-gray-400 font-bold">${esc(g.id)}</span>
                  <span class="font-bold text-gray-800 truncate">${esc(g.descripcion)}</span>
                  <span class="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">${esc(g.categoria)}</span>
                </div>
                <p class="text-[10px] text-gray-400 mt-0.5">${esc(g.fecha)} • ${esc(g.lugar)} • ${esc(g.metodo)}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <p class="font-black text-rose-600">$${g.monto.toFixed(2)}</p>
                <button class="btn-borrar-gasto text-red-400 hover:text-red-600 text-xs font-bold p-1" data-id="${esc(g.id)}">✕</button>
              </div>
            </div>
          `;
        });
      }

      html += `</div></div>`;
      container.innerHTML = html;

      // Listeners Formulario
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

      if (formGasto) {
        formGasto.addEventListener('submit', async (e) => {
          e.preventDefault();

          gastoStatus.textContent = "Guardando...";
          gastoStatus.className = "text-[11px] text-center text-amber-600 font-bold block";

          const nuevoGasto = {
            action: 'guardarGasto',
            descripcion: document.getElementById('gasto-desc').value.trim(),
            categoria: document.getElementById('gasto-categoria').value,
            monto: parseFloat(document.getElementById('gasto-monto').value) || 0,
            lugar: document.getElementById('gasto-lugar').value.trim() || 'N/A',
            metodo: document.getElementById('gasto-metodo').value
          };

          const ok = await postToAppsScript(nuevoGasto);
          if (!ok) {
            gastoStatus.textContent = "No se guardó. Intenta de nuevo.";
            gastoStatus.className = "text-[11px] text-center text-red-500 font-bold block";
            return;
          }

          gastoStatus.textContent = "¡Registrado!";
          gastoStatus.className = "text-[11px] text-center text-emerald-600 font-bold block";

          setTimeout(() => { renderView(); }, 900);
        });
      }

      // Eliminar gasto
      container.querySelectorAll('.btn-borrar-gasto').forEach(btn => {
        btn.addEventListener('click', async () => {
          const gastoId = btn.getAttribute('data-id');
          if (confirm(`¿Seguro que deseas eliminar el gasto ${gastoId}?`)) {
            btn.textContent = '...';
            await postToAppsScript({ action: 'eliminarGasto', id: gastoId });
            renderView();
          }
        });
      });
    }

    renderView();
  }

  // -------------------------------------------------------------
  // 4. SUBSECCIÓN GASTOS FUTUROS (Lectura CSV Directa)
  // -------------------------------------------------------------
  function setupGastosFuturos(container) {
    if (!container) return;

    async function renderView() {
      container.innerHTML = `<p class="text-xs text-gray-400 p-4 text-center">Cargando gastos futuros...</p>`;

      const rawFuturos = await fetchCSV(URL_GASTOS_FUTUROS);
      const listaFuturos = rawFuturos.map(d => {
        const item = normalizarObjeto(d);
        return {
          id: item['id'] || '',
          gasto: item['gasto'] || '',
          categoria: item['categoria'] || 'Otro',
          valor: parseFloat(item['valor']) || 0,
          fecha_tope: item['fecha_tope'] || '',
          estado: item['estado'] || 'no pago'
        };
      }).filter(f => f.gasto !== '' || f.id !== '');

      let html = `
        <div class="space-y-4">
          <button id="btn-nuevo-futuro" class="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-2xl text-xs shadow-xs transition-colors">
            + Programar Gasto Futuro
          </button>

          <form id="form-futuro" class="hidden bg-white p-4 rounded-2xl border border-rose-200 shadow-xs space-y-3">
            <p class="text-xs font-bold text-rose-800 uppercase border-b border-gray-100 pb-2">Nuevo Gasto Futuro</p>

            <div>
              <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Gasto / Concepto</label>
              <input type="text" id="futuro-gasto" required placeholder="Ej. Alquiler, Internet" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Categoría</label>
                <input type="text" id="futuro-categoria" placeholder="Servicios, Casa" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor ($/Bs)</label>
                <input type="number" step="0.01" id="futuro-valor" required placeholder="0.00" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha Tope</label>
              <input type="text" id="futuro-fecha" placeholder="Ej. 30/09/26" class="w-full bg-gray-50 text-xs p-2 rounded-xl border border-gray-200 outline-none">
            </div>

            <div class="flex gap-2 pt-2">
              <button type="button" id="btn-cancelar-futuro" class="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-xl">Cancelar</button>
              <button type="submit" class="flex-1 bg-rose-600 text-white text-xs font-bold py-2 rounded-xl">Guardar</button>
            </div>
          </form>

          <div class="bg-white rounded-2xl p-4 shadow-xs border border-rose-100 space-y-2 max-h-[50vh] overflow-y-auto">
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Gastos Futuros del Mes (${listaFuturos.length})</p>
      `;

      if (listaFuturos.length === 0) {
        html += `<p class="text-xs text-gray-400 py-4 text-center">No hay gastos futuros pendientes.</p>`;
      } else {
        listaFuturos.forEach(item => {
          const esPago = item.estado.toLowerCase().trim() === 'pago';
          html += `
            <div class="p-2.5 ${esPago ? 'bg-emerald-50 border-emerald-100 opacity-60' : 'bg-gray-50 border-gray-100'} rounded-xl border flex justify-between items-center text-xs gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-mono text-gray-400 font-bold">${esc(item.id)}</span>
                  <span class="font-bold text-gray-800 truncate ${esPago ? 'line-through' : ''}">${esc(item.gasto)}</span>
                  <span class="text-[9px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">${esc(item.categoria)}</span>
                </div>
                <p class="text-[10px] text-gray-400 mt-0.5">Fecha tope: ${esc(item.fecha_tope || 'N/A')}</p>
              </div>
              <div class="text-right shrink-0 flex items-center gap-2">
                <span class="font-black text-rose-700">$${item.valor.toFixed(2)}</span>
                <button class="btn-toggle-estado-futuro px-2 py-1 rounded-lg text-[10px] font-bold ${esPago ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-100 text-amber-800'}"
                        data-id="${esc(item.id)}" data-estado="${esc(item.estado)}">
                  ${esPago ? 'PAGO' : 'PENDIENTE'}
                </button>
              </div>
            </div>
          `;
        });
      }

      html += `</div></div>`;
      container.innerHTML = html;

      // Eventos UI Formulario
      const btnNuevo = container.querySelector('#btn-nuevo-futuro');
      const formFuturo = container.querySelector('#form-futuro');
      const btnCancelar = container.querySelector('#btn-cancelar-futuro');

      if (btnNuevo && formFuturo) {
        btnNuevo.addEventListener('click', () => {
          formFuturo.classList.remove('hidden');
          btnNuevo.classList.add('hidden');
        });
      }

      if (btnCancelar && formFuturo) {
        btnCancelar.addEventListener('click', () => {
          formFuturo.reset();
          formFuturo.classList.add('hidden');
          btnNuevo.classList.remove('hidden');
        });
      }

      if (formFuturo) {
        formFuturo.addEventListener('submit', async (e) => {
          e.preventDefault();
          const nuevoFuturo = {
            action: 'guardarGastoFuturo',
            gasto: document.getElementById('futuro-gasto').value.trim(),
            categoria: document.getElementById('futuro-categoria').value.trim() || 'Otros',
            valor: parseFloat(document.getElementById('futuro-valor').value) || 0,
            fecha_tope: document.getElementById('futuro-fecha').value.trim(),
            estado: 'no pago'
          };

          await postToAppsScript(nuevoFuturo);
          renderView();
        });
      }

      // Cambiar estado entre "pago" y "no pago"
      container.querySelectorAll('.btn-toggle-estado-futuro').forEach(btn => {
        btn.addEventListener('click', async () => {
          const itemID = btn.getAttribute('data-id');
          const estadoActual = btn.getAttribute('data-estado');
          const nuevoEstado = estadoActual.toLowerCase().trim() === 'pago' ? 'no pago' : 'pago';

          btn.textContent = '...';
          await postToAppsScript({
            action: 'actualizarEstadoGastoFuturo',
            id: itemID,
            estado: nuevoEstado
          });
          renderView();
        });
      });
    }

    renderView();
  }

  // -------------------------------------------------------------
  // Inicialización Módulo Geld
  // -------------------------------------------------------------
  async function initGeld() {
    const elCompras = document.getElementById('geld-compras');
    const elResumen = document.getElementById('geld-resumen');
    const elGastos = document.getElementById('geld-gastos');
    const elFuturos = document.getElementById('geld-futuros');

    if (elCompras) {
      const dataCompras = await fetchCSV(URL_COMPRAS);
      setupCompras(dataCompras, elCompras);
    }

    if (elGastos) setupGastos(elGastos);

    const tabResumenBtn = document.querySelector('[data-tab="geld-resumen"]');
    if (tabResumenBtn) {
      tabResumenBtn.addEventListener('click', () => {
        if (elResumen) setupResumen(elResumen);
      });
    }

    const tabGastosBtn = document.querySelector('[data-tab="geld-gastos"]');
    if (tabGastosBtn) {
      tabGastosBtn.addEventListener('click', () => {
        if (elGastos) setupGastos(elGastos);
      });
    }

    const tabFuturosBtn = document.querySelector('[data-tab="geld-futuros"]');
    if (tabFuturosBtn) {
      tabFuturosBtn.addEventListener('click', () => {
        if (elFuturos) setupGastosFuturos(elFuturos);
      });
    }
  }

  initGeld();
});
