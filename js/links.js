KeepModule('links', () => {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbziKIHQkkcT7n1XwRYdyOy3fvNq0YKT6KIJ42RZbzMz03lfkRyMlkrvNEDnMgjr4qke/exec'; // Reemplaza por la URL de tu Web App
  const contenedor = document.getElementById('contenedor-links');
  const btnRefresh = document.getElementById('btn-refresh-links');

  async function cargarLinks() {
    if (!contenedor) return;

    contenedor.innerHTML = `
      <div class="col-span-full text-center py-8 text-gray-400 text-sm">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-orange-400 border-t-transparent mb-2"></div>
        <p>Cargando enlaces...</p>
      </div>
    `;

    try {
      const response = await fetch(`${SCRIPT_URL}?action=obtenerLinks`);
      const res = await response.json();

      if (res.status === 'success' && res.links.length > 0) {
        renderizarLinks(res.links);
      } else {
        contenedor.innerHTML = `<p class="col-span-full text-center text-sm text-gray-400 py-6">No hay accesos guardados.</p>`;
      }
    } catch (err) {
      console.error('Error al cargar enlaces:', err);
      contenedor.innerHTML = `<p class="col-span-full text-center text-sm text-red-400 py-6">Error al cargar enlaces.</p>`;
    }
  }

  function renderizarLinks(links) {
    contenedor.innerHTML = '';

    links.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'flex flex-col items-center bg-white p-3 rounded-2xl shadow-xs border border-gray-100 relative transition-all active:scale-95';

      // Favicon por defecto si no hay imagen en el Sheet
      const iconUrl = item.imagen && item.imagen.trim() !== '' 
        ? item.imagen 
        : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.link)}&sz=128`;

      const tieneDescripcion = item.descripcion && item.descripcion.trim() !== '';

      card.innerHTML = `
        <!-- Botón del icono principal -->
        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="flex flex-col items-center w-full group">
          <div class="w-14 h-14 rounded-2xl bg-orange-50 p-2 flex items-center justify-center border border-orange-100 group-hover:scale-105 transition-transform shadow-xs">
            <img src="${iconUrl}" alt="${item.nombre}" class="w-10 h-10 object-contain rounded-xl" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1006/1006771.png'">
          </div>
          <span class="text-xs font-semibold text-gray-700 mt-2 text-center line-clamp-1 w-full">${item.nombre}</span>
        </a>

        <!-- Botón desplegable si tiene descripción -->
        ${tieneDescripcion ? `
          <button class="btn-toggle-desc text-[10px] text-orange-500 font-medium mt-1 flex items-center gap-0.5 hover:underline focus:outline-none" data-target="desc-${index}">
            <span>Info</span>
            <svg class="w-3 h-3 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          
          <!-- Contenido Desplegable -->
          <div id="desc-${index}" class="hidden w-full text-[11px] text-gray-500 bg-orange-50/60 rounded-xl p-2 mt-2 border border-orange-100/50 text-center">
            ${item.descripcion}
          </div>
        ` : ''}
      `;

      contenedor.appendChild(card);
    });

    // Event listeners para los desplegables de descripción
    document.querySelectorAll('.btn-toggle-desc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-target');
        const descElement = document.getElementById(targetId);
        const iconSvg = btn.querySelector('svg');

        if (descElement) {
          descElement.classList.toggle('hidden');
          iconSvg.classList.toggle('rotate-180');
        }
      });
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', cargarLinks);
  }

  // Cargar enlaces al seleccionar la sección de 'links'
  document.querySelectorAll('.nav-btn[data-section="links"]').forEach(btn => {
    btn.addEventListener('click', cargarLinks);
  });
});
