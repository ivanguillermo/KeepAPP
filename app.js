/**
 * Orquestador Principal (app.js)
 * Manejo del menú lateral (Drawer) y navegación entre secciones.
 */

// Abrir / Cerrar Menú Lateral
function toggleMenu() {
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("overlay");
  
  if (drawer && overlay) {
    drawer.classList.toggle("active");
    overlay.classList.toggle("active");
  }
}

// Navegar entre secciones principales
function navigate(sectionId, titleText) {
  // Ocultar todas las secciones
  document.querySelectorAll(".section-view").forEach(section => {
    section.classList.remove("active");
  });

  // Desmarcar todos los enlaces del menú
  document.querySelectorAll(".drawer-menu a").forEach(link => {
    link.classList.remove("active");
  });

  // Mostrar la sección seleccionada
  const targetSection = document.getElementById(`view-${sectionId}`);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  // Actualizar el título en el Header
  const headerTitle = document.getElementById("currentSectionTitle");
  if (headerTitle) {
    headerTitle.innerText = titleText;
  }

  // Activar el enlace correspondiente
  const activeLink = document.getElementById(`link-${sectionId}`);
  if (activeLink) {
    activeLink.classList.add("active");
  }

  // Cerrar el menú lateral
  toggleMenu();
}

// Control de Pestañas Internas para BBM (Gym)
function switchBBMTab(tabName) {
  // Desmarcar pestañas de BBM
  document.querySelectorAll(".bbm-tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  // Ocultar subvistas de BBM
  document.querySelectorAll(".bbm-subview").forEach(subview => {
    subview.classList.remove("active");
  });

  // Activar botón y subvista seleccionada
  if (event && event.target) {
    event.target.classList.add("active");
  }
  
  const targetSubview = document.getElementById(`bbm-${tabName}`);
  if (targetSubview) {
    targetSubview.classList.add("active");
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
