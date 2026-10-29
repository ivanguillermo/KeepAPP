
(function () {
  const PLANTILLA_TERABOX = '';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function analizar(url) {
    url = String(url || '').trim();
    if (!/^https?:\/\//i.test(url)) return { tipo: 'invalido' };
    let u;
    try { u = new URL(url); } catch (e) { return { tipo: 'invalido' }; }
    const host = u.hostname.replace(/^www\./, '').toLowerCase();

    // MEGA (archivos). Las carpetas no se pueden incrustar.
    if (/(^|\.)mega\.(nz|io|co\.nz)$/.test(host)) {
      let m = url.match(/\/(?:file|embed)\/([\w-]+)#([\w-]+)/) || url.match(/#!([\w-]+)!([\w-]+)/);
      if (m) return { tipo: 'iframe', src: `https://mega.nz/embed/${m[1]}#${m[2]}`, origen: 'MEGA' };
      return { tipo: 'externo', origen: 'MEGA', aviso: 'Las carpetas de MEGA no se pueden reproducir aquí. Abre el archivo con su propio enlace (/file/...).' };
    }

    // Google Drive
    if (host === 'drive.google.com' || host === 'docs.google.com') {
      const m = url.match(/\/file\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/);
      if (m) return { tipo: 'iframe', src: `https://drive.google.com/file/d/${m[1]}/preview`, origen: 'Drive' };
    }

    // YouTube
    if (host === 'youtu.be' || /(^|\.)youtube\.com$/.test(host)) {
      const id = host === 'youtu.be' ? u.pathname.slice(1) : (u.searchParams.get('v') || (u.pathname.match(/\/(?:embed|shorts)\/([\w-]+)/) || [])[1]);
      if (id) return { tipo: 'iframe', src: `https://www.youtube.com/embed/${id}?autoplay=1`, origen: 'YouTube' };
    }

    // TeraBox (y sus dominios espejo)
    if (/tera?box|terabox|4funbox|mirrobox|nephobox/.test(host)) {
      if (PLANTILLA_TERABOX) return { tipo: 'iframe', src: PLANTILLA_TERABOX.replace('{url}', encodeURIComponent(url)), origen: 'TeraBox' };
      return { tipo: 'externo', origen: 'TeraBox', aviso: 'TeraBox no permite reproducir sus archivos dentro de otras páginas. Se abre en su propia pestaña.' };
    }

    // Enlaces directos a archivos de video / audio
    if (/\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i.test(u.pathname + u.search)) return { tipo: 'video', src: url };
    if (/\.(mp3|m4a|ogg|oga|wav|aac|flac)(\?|#|$)/i.test(u.pathname + u.search)) return { tipo: 'audio', src: url };

    return { tipo: 'externo', origen: host, aviso: 'No sé reproducir este tipo de enlace dentro de la app. Se abre en una pestaña nueva.' };
  }

  function abrir(opciones) {
    const { titulo = '', url = '', modo = 'video' } = opciones || {};
    const info = analizar(url);
    if (info.tipo === 'invalido') { alert('Este elemento no tiene un enlace válido.'); return; }

    cerrar();
    const m = document.createElement('div');
    m.id = 'keep-player';
    m.className = 'fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-2 sm:p-6';

    const altura = modo === 'audio' ? 'h-56' : 'aspect-video';
    let cuerpo;
    if (info.tipo === 'iframe') {
      cuerpo = `<iframe src="${esc(info.src)}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen class="w-full h-full border-0"></iframe>`;
    } else if (info.tipo === 'video') {
      cuerpo = `<video src="${esc(info.src)}" controls autoplay playsinline class="w-full h-full bg-black"></video>`;
    } else if (info.tipo === 'audio') {
      cuerpo = `<div class="w-full h-full flex items-center justify-center p-6"><audio src="${esc(info.src)}" controls autoplay class="w-full"></audio></div>`;
    } else {
      cuerpo = `
        <div class="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
          <p class="text-xs text-gray-300 max-w-sm">${esc(info.aviso)}</p>
          <a href="${esc(url)}" target="_blank" rel="noopener" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl">↗ Abrir en ${esc(info.origen)}</a>
        </div>`;
    }

    m.innerHTML = `
      <div class="w-full max-w-4xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
        <div class="flex items-center gap-2 px-4 py-2.5 text-white">
          <p class="flex-1 min-w-0 text-xs font-bold truncate">${esc(titulo)}</p>
          <a href="${esc(url)}" target="_blank" rel="noopener" class="text-[11px] font-bold text-gray-300 hover:text-white shrink-0">↗ Abrir aparte</a>
          <button type="button" data-cerrar class="shrink-0 w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-sm leading-none" aria-label="Cerrar">✕</button>
        </div>
        <div class="${altura} bg-black">${cuerpo}</div>
        <p class="px-4 py-2 text-[10px] text-gray-500">Si no carga, usa “Abrir aparte”. Al cerrar, la reproducción se detiene.</p>
      </div>`;

    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-cerrar]')) cerrar(); });
    document.addEventListener('keydown', alTeclear);
    document.body.appendChild(m);
  }

  function alTeclear(e) { if (e.key === 'Escape') cerrar(); }

  function cerrar() {
    const m = document.getElementById('keep-player');
    if (m) m.remove();                      // al quitar el iframe/video se detiene el sonido
    document.removeEventListener('keydown', alTeclear);
  }

  window.KeepPlayer = { abrir, cerrar, analizar };
})();
