/**
 * js/bucher.js - Módulo Bucher: Biblioteca y Lectura de Libros
 */
KeepModule('bucher', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const URL_BUCHER = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=bucher`;

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

  async function initBucher() {
    const container = document.getElementById('bucher-container');
    if (!container) return;

    try {
      const data = await fetchCSV(URL_BUCHER);

      const libros = data.map(d => ({
        titulo: d['Titulo'] || 'Sin título',
        autor: d['Autor'] || 'Autor desconocido',
        categoria: d['Categoria'] || 'General',
        portada: d['Portada'] || '',
        linkVer: d['Link_Drive_Ver'] || '',
        linkDescarga: d['Link_Drive_Descarga'] || '',
        resumen: d['Resumen'] || ''
      })).filter(l => l.titulo.trim() !== '' && l.titulo !== 'Titulo');

      const categorias = ['Todas', ...new Set(libros.map(l => l.categoria).filter(Boolean))];
      let catSeleccionada = 'Todas';

      function renderView() {
        const filtrados = libros.filter(l => catSeleccionada === 'Todas' || l.categoria === catSeleccionada);
        const optsCat = categorias.map(c => `<option value="${c}" ${c === catSeleccionada ? 'selected' : ''}>${c}</option>`).join('');

        let html = `
          <div class="space-y-4">
            <div class="bg-white p-3 rounded-2xl border border-teal-100 shadow-xs flex items-center justify-between">
              <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Categoría:</span>
              <select id="select-cat-bucher" class="bg-teal-50 text-teal-800 text-xs font-bold py-1.5 px-3 rounded-xl border border-teal-200 outline-none">
                ${optsCat}
              </select>
            </div>

            <div class="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        `;

        if (filtrados.length === 0) {
          html += `<p class="text-xs text-gray-400 py-6 text-center">No hay libros registrados en esta categoría.</p>`;
        } else {
          filtrados.forEach(libro => {
            const tienePortada = libro.portada && libro.portada.startsWith('http');
            const imgPortada = tienePortada 
              ? `<img src="${libro.portada}" alt="${libro.titulo}" class="w-16 h-22 object-cover rounded-xl shadow-xs border border-gray-100 shrink-0">`
              : `<div class="w-16 h-22 bg-teal-100 text-teal-700 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 p-1 text-center">${libro.categoria}</div>`;

            html += `
              <div class="bg-white p-3 rounded-2xl border border-teal-100 shadow-xs flex gap-3 items-start">
                ${imgPortada}
                <div class="flex-1 min-w-0 flex flex-col justify-between h-full">
                  <div>
                    <h3 class="text-xs font-bold text-gray-800 line-clamp-1">${libro.titulo}</h3>
                    <p class="text-[11px] font-medium text-gray-500">${libro.autor}</p>
                    <span class="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-100">${libro.categoria}</span>
                    ${libro.resumen ? `<p class="text-[10px] text-gray-400 mt-1 line-clamp-2">${libro.resumen}</p>` : ''}
                  </div>

                  <div class="flex gap-2 mt-2 pt-2 border-t border-gray-50">
                    ${libro.linkVer ? `<a href="${libro.linkVer}" target="_blank" class="flex-1 text-center bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold py-1.5 px-2 rounded-xl transition-colors">Abrir</a>` : ''}
                    ${libro.linkDescarga ? `<a href="${libro.linkDescarga}" target="_blank" class="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold py-1.5 px-2 rounded-xl transition-colors">Descargar</a>` : ''}
                  </div>
                </div>
              </div>
            `;
          });
        }

        html += `</div></div>`;
        container.innerHTML = html;

        const sel = container.querySelector('#select-cat-bucher');
        if (sel) {
          sel.addEventListener('change', (e) => {
            catSeleccionada = e.target.value;
            renderView();
          });
        }
      }

      renderView();
    } catch (err) {
      console.error('Error al cargar libros:', err);
      container.innerHTML = `<p class="text-xs text-red-500 p-4 text-center">Error al conectar con la biblioteca Bucher.</p>`;
    }
  }

  initBucher();
});
