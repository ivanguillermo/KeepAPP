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
