/**
 * Módulo Independiente: BBM / Fitness & Gym
 * Archivo: js/bbm.js
 */
(function () {
  const SHEET_ID = "1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw";
  const URL_BASE = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;

  let datosEjercicios = [];
  let datosRecords = [];
  let datosMedidas = [];

  function initBBM() {
    try {
      const timeStamp = new Date().getTime();

      // Carga en paralelo de las 3 pestañas de la hoja de cálculo
      Promise.all([
        fetchCSV(`${URL_BASE}bbm_rutinas&_nocache=${timeStamp}`),
        fetchCSV(`${URL_BASE}bbm_records&_nocache=${timeStamp}`),
        fetchCSV(`${URL_BASE}bbm_medidas&_nocache=${timeStamp}`)
      ])
        .then(([ejercicios, records, medidas]) => {
          datosEjercicios = ejercicios || [];
          datosRecords = records || [];
          datosMedidas = medidas || [];

          renderizarEjercicios(datosEjercicios);
          renderizarRecords(datosRecords);
          renderizarMedidas(datosMedidas);
        })
        .catch((err) => {
          console.error("Error al cargar los módulos de BBM:", err);
          mostrarErrorGlobal("No se pudieron obtener los datos de BBM.");
        });
    } catch (error) {
      console.error("Error crítico en initBBM:", error);
      mostrarErrorGlobal("Ocurrió un error inesperado al iniciar BBM.");
    }
  }

  // Wrapper genérico para parsear CSV mediante PapaParse usando Promises
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

  // -------------------------------------------------------------
  // 1. RENDERIZADO DE EJERCICIOS
  // -------------------------------------------------------------
  function renderizarEjercicios(items) {
    const container = document.getElementById("bbmEjerciciosContainer");
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML =
        "<p style='color: var(--text-dim); text-align: center;'>No hay ejercicios registrados.</p>";
      return;
    }

    let html = "";
    items.forEach((item) => {
      const nombre = item.Ejercicio || "Ejercicio sin nombre";
      const grupo = item.Grupo_Muscular || "General";
      const equipo = item.Equipo || "Corporal";
      const nota = item.Notas ? `<p class="bbm-notes">💡 ${item.Notas}</p>` : "";

      html += `
        <div class="card bbm-card">
          <div class="bbm-info">
            <h4>${nombre}</h4>
            <div class="bbm-tags">
              <span class="badge badge-grupo">💪 ${grupo}</span>
              <span class="badge badge-equipo">🏋️ ${equipo}</span>
            </div>
            ${nota}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // Filtro dinámico por Grupo Muscular
  function filtrarEjercicios(grupo) {
    if (!grupo || grupo === "Todos") {
      renderizarEjercicios(datosEjercicios);
      return;
    }

    const filtrados = datosEjercicios.filter((item) => {
      const g = (item.Grupo_Muscular || "").trim().toLowerCase();
      return g === grupo.toLowerCase();
    });

    renderizarEjercicios(filtrados);
  }

  // -------------------------------------------------------------
  // 2. RENDERIZADO DE RÉCORDS PERSONALES (PRs)
  // -------------------------------------------------------------
  function renderizarRecords(items) {
    const container = document.getElementById("bbmRecordsContainer");
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML =
        "<p style='color: var(--text-dim); text-align: center;'>No hay récords personales guardados.</p>";
      return;
    }

    let html = "";
    items.forEach((item) => {
      const ejercicio = item.Ejercicio || "Ejercicio";
      const peso = item.Peso_KG ? `${item.Peso_KG} kg` : "-";
      const reps = item.Reps ? `${item.Reps} reps` : "-";
      const fecha = item.Fecha || "-";

      html += `
        <div class="card bbm-card record-card">
          <div class="record-header">
            <h4>${ejercicio}</h4>
            <span class="record-date">📅 ${fecha}</span>
          </div>
          <div class="record-metrics">
            <div class="metric-box">
              <span class="metric-value">${peso}</span>
              <span class="metric-label">Carga</span>
            </div>
            <div class="metric-box">
              <span class="metric-value">${reps}</span>
              <span class="metric-label">Repeticiones</span>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // -------------------------------------------------------------
  // 3. RENDERIZADO DE MEDIDAS CORPORALES
  // -------------------------------------------------------------
  function renderizarMedidas(items) {
    const container = document.getElementById("bbmMedidasContainer");
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML =
        "<p style='color: var(--text-dim); text-align: center;'>No hay histórico de medidas registrado.</p>";
      return;
    }

    let html = "";
    items.forEach((item) => {
      const fecha = item.Fecha || "-";
      const peso = item.Peso_KG ? `${item.Peso_KG} kg` : "-";
      const brazo = item.Brazo_CM ? `${item.Brazo_CM} cm` : "-";
      const cintura = item.Cintura_CM ? `${item.Cintura_CM} cm` : "-";
      const pecho = item.Pecho_CM ? `${item.Pecho_CM} cm` : "-";

      html += `
        <div class="card bbm-card">
          <div class="medidas-header">
            <strong>📅 Registro: ${fecha}</strong>
            <span class="badge badge-peso">⚖️ ${peso}</span>
          </div>
          <div class="medidas-grid">
            <div><strong>Brazo:</strong> ${brazo}</div>
            <div><strong>Cintura:</strong> ${cintura}</div>
            <div><strong>Pecho:</strong> ${pecho}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // Mostrar error genérico dentro de la subvista de BBM
  function mostrarErrorGlobal(mensaje) {
    ["bbmEjerciciosContainer", "bbmRecordsContainer", "bbmMedidasContainer"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<div class="error-msg">⚠️ ${mensaje}</div>`;
    });
  }

  // Exponer la función de filtrado al scope global para botones de filtro de la UI
  window.filtrarEjerciciosBBM = filtrarEjercicios;

  // Inicializar al estar listo el DOM
  document.addEventListener("DOMContentLoaded", initBBM);
})();
