/* ==========================================
   MÓDULO: COMPRAS - KEEPAPP
   Carga con PapaParse desde Google Sheets (CSV)
   ========================================== */

const ComprasModule = (() => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=compras`;

  let comprasData = [];
  let filterText = '';

  /* ------------------------------------------
     1. INICIALIZACIÓN Y CARGA DE DATOS
     ------------------------------------------ */
  const init = () => {
    setupEventListeners();
    fetchCompras();
  };

  const setupEventListeners = () => {
    const searchInput = document.getElementById('compras-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterText = e.target.value.toLowerCase();
        renderList();
      });
    }
  };

  const fetchCompras = () => {
    if (typeof Papa === 'undefined') {
      console.error('PapaParse no está disponible.');
      return;
    }

    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        comprasData = processCompras(results.data);
        renderStats();
        renderList();
      },
      error: (err) => {
        console.error('Error al cargar la pestaña compras:', err);
      }
    });
  };

  const processCompras = (data) => {
    return data.map(item => ({
      producto: item.producto || item.Producto || item.item || item.Item || '',
      categoria: item.categoria || item.Categoria || 'General',
      estado: (item.estado || item.Estado || 'suficiente').toLowerCase().trim(),
      precioUSD: item.precio || item.precio_usd || item.Precio || '0',
      precioVES: item.precio_ves || item.ves || item.PrecioVES || '',
      cantidad: item.cantidad || item.Cantidad || '',
      notas: item.notas || item.Notas || ''
    })).filter(c => c.producto.trim() !== '');
  };

  /* ------------------------------------------
     2. RENDERIZADO DE ESTADÍSTICAS Y LISTA
     ------------------------------------------ */
  const renderStats = () => {
    const totalEl = document.getElementById('compras-stat-total');
    const porAgotarEl = document.getElementById('compras-stat-agotar');
    const agotadosEl = document.getElementById('compras-stat-agotados');

    const total = comprasData.length;
    const porAgotar = comprasData.filter(i => i.estado.includes('por agotar') || i.estado.includes('por_agotar')).length;
    const agotados = comprasData.filter(i => i.estado.includes('agotado')).length;

    if (totalEl) totalEl.textContent = total;
    if (porAgotarEl) porAgotarEl.textContent = porAgotar;
    if (agotadosEl) agotadosEl.textContent = agotados;
  };

  const renderList = () => {
    const container = document.getElementById('compras-list');
    if (!container) return;

    const filtered = comprasData.filter(c => 
      c.producto.toLowerCase().includes(filterText) ||
      c.categoria.toLowerCase().includes(filterText)
    );

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; color: var(--text-dim);">
          <p style="margin: 0;">No se encontraron artículos de compra.</p>
        </div>`;
      return;
    }

    container.innerHTML = filtered.map(item => {
      const statusClass = getStatusClass(item.estado);

      return `
        <div class="card compras-card">
          <div class="compras-info" style="flex: 1; padding-right: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span class="badge ${statusClass}">
                ${capitalize(item.estado.replace('_', ' '))}
              </span>
              <span class="badge" style="background: #f1f5f9; color: var(--text-dim); border: 1px solid var(--border-color);">
                ${escapeHTML(item.categoria)}
              </span>
            </div>
            <h4>${escapeHTML(item.producto)}</h4>
            <div class="compras-details">
              ${item.cantidad ? `<span><strong>Cantidad:</strong> ${escapeHTML(item.cantidad)}</span>` : ''}
              ${item.notas ? `<br><span>${escapeHTML(item.notas)}</span>` : ''}
            </div>
          </div>

          <div class="prices">
            ${item.precioUSD ? `<div class="price-usd">$${escapeHTML(item.precioUSD)}</div>` : ''}
            ${item.precioVES ? `<div class="price-ves">Bs. ${escapeHTML(item.precioVES)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  };

  /* ------------------------------------------
     3. UTILIDADES
     ------------------------------------------ */
  const getStatusClass = (estado) => {
    if (estado.includes('por agotar') || estado.includes('por_agotar')) return 'status-por-agotar';
    if (estado.includes('agotado')) return 'status-agotado';
    return 'status-suficiente';
  };

  const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  const escapeHTML = (str) => str ? String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)) : '';

  return { init, fetchCompras };
})();

window.ComprasModule = ComprasModule;
