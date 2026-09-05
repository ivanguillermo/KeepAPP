/**
 * KeepAPP Router & Manager
 */
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const btnMenu = document.getElementById('btn-menu');
  const btnClose = document.getElementById('btn-close-sidebar');
  const topbarTitle = document.getElementById('topbar-title');

  // Open / Close Sidebar
  function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.remove('opacity-0'), 10);
  }

  function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 300);
  }

  btnMenu.addEventListener('click', openSidebar);
  btnClose.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  // Navegación por secciones
  const navBtns = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.app-section');

  function navigateTo(sectionId) {
    sections.forEach(sec => sec.classList.add('hidden'));

    const targetSection = document.getElementById(`sec-${sectionId}`);
    if (targetSection) {
      targetSection.classList.remove('hidden');
      const navBtn = document.querySelector(`[data-section="${sectionId}"]`);
      if (navBtn) {
        topbarTitle.textContent = navBtn.querySelector('span.flex-1').textContent;
      }
    }
    closeSidebar();
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-section');
      navigateTo(target);
    });
  });

  // Manejo de Tabs internas en subsecciones
  document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.tab-btn');
    if (!tabBtn) return;

    const targetTabId = tabBtn.getAttribute('data-tab');
    const parentSection = tabBtn.closest('.app-section');

    // Desactivar todos los botones de esa sección
    parentSection.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('bg-white', 'shadow-xs', 'text-gray-800');
      b.classList.add('text-gray-500');
    });

    // Ocultar contenidos de esa sección
    parentSection.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

    // Activar botón y contenido seleccionado
    tabBtn.classList.add('bg-white', 'shadow-xs', 'text-gray-800');
    tabBtn.classList.remove('text-gray-500');

    const targetContent = document.getElementById(targetTabId);
    if (targetContent) targetContent.classList.remove('hidden');
  });

  // Sección inicial por defecto
  navigateTo('tareas');
});

/**
 * Helper global resiliente para que los módulos carguen sin tumbar la app
 */
window.KeepModule = function(moduleName, initFn) {
  try {
    initFn();
    console.log(`[KeepAPP] Módulo '${moduleName}' inicializado con éxito.`);
  } catch (err) {
    console.error(`[KeepAPP Error] El módulo '${moduleName}' falló:`, err);
  }
};
