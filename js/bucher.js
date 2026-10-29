/**
 * js/bucher.js - Módulo Bucher: Biblioteca y Lectura de Libros
 * Tarjetas compactas: tocar la portada o el título abre el libro (PDF) o lo reproduce en el modal (audiolibro).
 * Columnas opcionales en la hoja: Tipo (PDF / Audiolibro) y Link_Audio. Si es audiolibro y no hay Link_Audio, se usa Link_Drive_Ver.
 */
KeepModule('bucher', () => {
  const SHEET_ID = '1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw';
  const URL_BUCHER = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=bucher`;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // minúsculas y sin tildes: "garcia" encuentra "García"
  const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const esUrl = s => /^https?:\/\//.test(s || '');

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

      const libros = data.map((d, i) => {
        const tipoTxt = norm(d['Tipo'] || d['Formato'] || '');
        const linkAudio = (d['Link_Audio'] || '').trim();
        const l = {
          i: i,
          esAudio: /audio/.test(tipoTxt) || linkAudio !== '',
          titulo: d['Titulo'] || 'Sin título',
          autor: d['Autor'] || 'Autor desconocido',
          categoria: d['Categoria'] || 'General',
          portada: d['Portada'] || '',
          linkVer: linkAudio || d['Link_Drive_Ver'] || '',
          linkDescarga: d['Link_Drive_Descarga'] || '',
          resumen: d['Resumen'] || ''
        };
        l.busqueda = norm(`${l.titulo} ${l.autor} ${l.categoria} ${l.resumen}`);
        return l;
      }).filter(l => l.titulo.trim() !== '' && l.titulo !== 'Titulo');

      const categorias = ['Todas', ...new Set(libros.map(l => l.categoria).filter(Boolean))];
      let catSeleccionada = 'Todas';
      let tipoSel = 'todos';
      let texto = '';
      const hayAudio = libros.some(l => l.esAudio);

      container.innerHTML = `
        <div class="space-y-3">
          <div class="bg-white p-3 rounded-2xl border border-teal-100 shadow-xs flex flex-col sm:flex-row gap-2 sm:items-center">
            <div class="relative flex-1">
              <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none">🔎</span>
              <input id="buscar-bucher" type="search" placeholder="Buscar título, autor o categoría…" autocomplete="off"
                     class="w-full bg-gray-50 text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-teal-400">
            </div>
            <select id="select-cat-bucher" class="bg-teal-50 text-teal-800 text-xs font-bold py-2 px-3 rounded-xl border border-teal-200 outline-none">
              ${categorias.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
            </select>
          </div>
          ${hayAudio ? `<div class="flex gap-1.5">${[['todos', 'Todos'], ['pdf', '📄 PDF'], ['audio', '🎧 Audio']].map(([v, t]) => `<button data-tipo="${v}" class="btn-tipo px-3 py-1.5 rounded-full text-xs font-bold border ${v === 'todos' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-700 border-teal-200'}">${t}</button>`).join('')}</div>` : ''}
          <p id="bucher-count" class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1"></p>
          <div id="bucher-lista" class="grid gap-2 lg:grid-cols-2 max-h-[70vh] overflow-y-auto pr-1"></div>
        </div>
      `;

      const lista = container.querySelector('#bucher-lista');
      const contador = container.querySelector('#bucher-count');

      function pintarLista() {
        const q = norm(texto).trim().split(/\s+/).filter(Boolean);
        const filtrados = libros.filter(l =>
          (catSeleccionada === 'Todas' || l.categoria === catSeleccionada) &&
          (tipoSel === 'todos' || (tipoSel === 'audio') === l.esAudio) &&
          q.every(p => l.busqueda.includes(p))
        );

        contador.textContent = `${filtrados.length} ${filtrados.length === 1 ? 'libro' : 'libros'}`;

        if (filtrados.length === 0) {
          lista.innerHTML = `<p class="col-span-full text-xs text-gray-400 py-6 text-center">No se encontraron libros.</p>`;
          return;
        }

        lista.innerHTML = filtrados.map(libro => {
          const img = esUrl(libro.portada)
            ? `<img src="${esc(libro.portada)}" alt="" loading="lazy" class="w-12 h-[4.25rem] object-cover rounded-lg shadow-xs border border-gray-100">`
            : `<div class="w-12 h-[4.25rem] bg-teal-100 text-teal-700 rounded-lg flex items-center justify-center text-lg">${libro.esAudio ? '🎧' : '📖'}</div>`;
          const abre = esUrl(libro.linkVer);

          // PDF: enlace a pestaña nueva · Audiolibro: botón que abre el reproductor interno
          const portada = !abre ? `<div class="shrink-0">${img}</div>`
            : libro.esAudio
              ? `<button data-play="${libro.i}" class="shrink-0 relative" title="Escuchar">${img}<span class="absolute inset-0 flex items-center justify-center text-white text-lg bg-black/25 rounded-lg">▶</span></button>`
              : `<a href="${esc(libro.linkVer)}" target="_blank" rel="noopener" class="shrink-0" title="Abrir">${img}</a>`;
          const titulo = !abre ? esc(libro.titulo)
            : libro.esAudio
              ? `<button data-play="${libro.i}" class="text-left hover:text-teal-700">${esc(libro.titulo)}</button>`
              : `<a href="${esc(libro.linkVer)}" target="_blank" rel="noopener" class="hover:text-teal-700">${esc(libro.titulo)}</a>`;
          const descarga = esUrl(libro.linkDescarga)
            ? `<a href="${esc(libro.linkDescarga)}" target="_blank" rel="noopener" class="shrink-0 p-2 rounded-lg bg-gray-50 hover:bg-teal-50 text-gray-500 hover:text-teal-700 text-xs" title="Descargar">⬇️</a>`
            : '';

          return `
            <div class="bg-white p-2 rounded-xl border border-teal-100 flex gap-3 items-center">
              ${portada}
              <div class="min-w-0 flex-1">
                <h3 class="text-xs font-bold text-gray-800 line-clamp-2 leading-snug">${titulo}</h3>
                <p class="text-[11px] text-gray-500 truncate">${esc(libro.autor)}</p>
                <span class="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-100">${libro.esAudio ? '🎧 ' : ''}${esc(libro.categoria)}</span>
              </div>
              ${descarga}
            </div>`;
        }).join('');
      }

      // El buscador y el selector no se vuelven a dibujar, así el teclado no se cierra al escribir
      container.querySelector('#buscar-bucher').addEventListener('input', (e) => { texto = e.target.value; pintarLista(); });
      container.querySelector('#select-cat-bucher').addEventListener('change', (e) => { catSeleccionada = e.target.value; pintarLista(); });

      container.querySelectorAll('.btn-tipo').forEach(btn => btn.addEventListener('click', () => {
        tipoSel = btn.dataset.tipo;
        container.querySelectorAll('.btn-tipo').forEach(x => {
          const on = x === btn;
          x.classList.toggle('bg-teal-600', on); x.classList.toggle('text-white', on); x.classList.toggle('border-teal-600', on);
          x.classList.toggle('bg-white', !on); x.classList.toggle('text-teal-700', !on); x.classList.toggle('border-teal-200', !on);
        });
        pintarLista();
      }));

      // Audiolibros: reproductor interno (modal)
      lista.addEventListener('click', (e) => {
        const p = e.target.closest('[data-play]');
        if (!p) return;
        const libro = libros[Number(p.dataset.play)];
        if (window.KeepPlayer) KeepPlayer.abrir({ titulo: libro.titulo, url: libro.linkVer, modo: 'audio' });
        else window.open(libro.linkVer, '_blank', 'noopener');
      });

      pintarLista();
    } catch (err) {
      console.error('Error al cargar libros:', err);
      container.innerHTML = `<p class="text-xs text-red-500 p-4 text-center">Error al conectar con la biblioteca Bucher.</p>`;
    }
  }

  initBucher();
});
