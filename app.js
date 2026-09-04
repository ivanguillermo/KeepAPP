/**
 * Orquestador Principal (app.js)
 * Manejo del menú lateral (Drawer) y navegación entre secciones/pestañas.
 */

// Abrir / Cerrar Menú Lateral
function toggleMenu() {
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("drawer-overlay");

  if (drawer && overlay) {
    drawer.classList.toggle("active");
    overlay.classList.toggle("active");
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const btnMenu = document.getElementById("btn-menu");
  const overlay = document.getElementById("drawer-overlay");

  if (btnMenu) btnMenu.addEventListener("click", toggleMenu);
  if (overlay) overlay.addEventListener("click", toggleMenu);

  // Inicializar módulos de la app
  if (window.ComprasModule) ComprasModule.init();
  if (window.TareasModule) TareasModule.init();
  if (window.BBMModule) BBMModule.init();
  if (window.EstudioModule) EstudioModule.init();
  if (window.GoalsModule) GoalsModule.init();
});

// Navegar entre secciones principales del Menú Lateral
function navigate(sectionId, titleText) {
  // Ocultar todas las secciones principales
  document.querySelectorAll(".section-content").forEach(section => {
    section.classList.remove("active");
  });

  // Desmarcar todos los enlaces del menú
  document.querySelectorAll(".drawer-item").forEach(link => {
    link.classList.remove("active");
  });

  // Mostrar la sección seleccionada
  const targetSection = document.getElementById(`sec-${sectionId}`);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  // Actualizar el título en la barra superior
  const headerTitle = document.getElementById("page-title");
  if (headerTitle) {
    headerTitle.innerText = titleText;
  }

  // Activar el enlace correspondiente
  const activeLink = document.getElementById(`link-${sectionId}`);
  if (activeLink) {
    activeLink.classList.add("active");
  }

  // Cerrar el menú lateral si está abierto
  const drawer = document.getElementById("drawer");
  if (drawer && drawer.classList.contains("active")) {
    toggleMenu();
  }
}

// Control universal para subpestañas internas (BBM, Estudio, Goals)
function switchSubTab(moduloId, tabId) {
  // Buscar el contenedor padre de la sección
  const parentSection = document.getElementById(`sec-${moduloId}`);
  if (!parentSection) return;

  // Desactivar botones de subpestaña en este módulo
  parentSection.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  // Ocultar contenidos de subpestañas en este módulo
  parentSection.querySelectorAll(".subtab-content").forEach(content => {
    content.classList.remove("active");
  });

  // Activar el botón presionado
  const targetBtn = document.getElementById(`tab-${moduloId}-${tabId}`);
  if (targetBtn) {
    targetBtn.classList.add("active");
  }

  // Activar el contenido seleccionado
  const targetContent = document.getElementById(`${moduloId}-sub-${tabId}`);
  if (targetContent) {
    targetContent.classList.add("active");
  }
}

// Función auxiliar global para formatear fechas a lectura local
function formatearFecha(fechaStr) {
  if (!fechaStr) return "-";
  const partes = fechaStr.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return fechaStr;
}

// Asignar listeners del Drawer al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
  const btnMenu = document.getElementById("btn-menu");
  const overlay = document.getElementById("drawer-overlay");

  if (btnMenu) btnMenu.addEventListener("click", toggleMenu);
  if (overlay) overlay.addEventListener("click", toggleMenu);
});
// Función global para alternar el menú lateral (Drawer)
function toggleMenu() {
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("drawer-overlay");
  if (drawer && overlay) {
    drawer.classList.toggle("open");
    overlay.classList.toggle("active");
  }
}

// Función global para cambiar entre secciones principales
function switchSection(sectionId, title) {
  // 1. Ocultar todas las secciones
  const sections = document.querySelectorAll(".section-content");
  sections.forEach((sec) => sec.classList.remove("active"));

  // 2. Mostrar la sección seleccionada
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  // 3. Actualizar título del header
  const titleEl = document.getElementById("app-title");
  if (titleEl) titleEl.textContent = title;

  // 4. Actualizar estado activo en el menú nav
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((btn) => btn.classList.remove("active"));
  
  const currentBtn = Array.from(navItems).find((btn) =>
    btn.getAttribute("onclick")?.includes(sectionId)
  );
  if (currentBtn) currentBtn.classList.add("active");

  // 5. Cerrar el menú desplegable
  toggleMenu();
}

// Función global para sub-pestañas de BBM
function switchBBMTab(tabName) {
  const tabs = document.querySelectorAll(".bbm-tab-content");
  tabs.forEach((tab) => tab.classList.remove("active"));

  const targetTab = document.getElementById(`bbm-tab-${tabName}`);
  if (targetTab) targetTab.classList.add("active");

  // Estilos de botones de pestaña
  const parent = event?.target?.parentElement;
  if (parent) {
    const btns = parent.querySelectorAll(".tab-btn");
    btns.forEach((b) => b.classList.remove("active"));
    if (event.target) event.target.classList.add("active");
  }
}

// Inicialización general al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
  const btnMenu = document.getElementById("btn-menu");
  const overlay = document.getElementById("drawer-overlay");

  if (btnMenu) btnMenu.addEventListener("click", toggleMenu);
  if (overlay) overlay.addEventListener("click", toggleMenu);

  // Inicializar módulos registrados
  if (window.ComprasModule && typeof ComprasModule.init === "function") ComprasModule.init();
  if (window.TareasModule && typeof TareasModule.init === "function") TareasModule.init();
  if (window.BBMModule && typeof BBMModule.init === "function") BBMModule.init();
  if (window.EstudioModule && typeof EstudioModule.init === "function") EstudioModule.init();
  if (window.GoalsModule && typeof GoalsModule.init === "function") GoalsModule.init();
});
