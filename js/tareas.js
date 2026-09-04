/**
 * Módulo Independiente: Tareas / Matriz de Prioridad
 * Archivo: js/tareas.js
 */
(function () {
  const SHEET_ID = "1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw";
  const URL_TAREAS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=tareas`;

  // Matriz de pesos para el cálculo de prioridad ponderada
  const VALORES = {
    urgencia: { "Hoy": 100, "Pronto": 50, "Eventualmente": 15 },
    importancia: { "Vital": 100, "Muy": 60, "Normal": 20 },
    dificultad: { "Fácil": 100, "Mediano": 50, "Difícil": 20 },
    tiempo: { "Muy rápido": 100, "Poco tiempo": 70, "Más de un día": 40, "Mucho": 10 },
    costo: { "Gratis": 100, "Poco": 80, "Barato": 60, "Caro": 30, "Muy caro": 10 }
  };

  function initTareas() {
    try {
      const container = document.getElementById("taskList");
      if (!container) return;

      const url = `${URL_TAREAS}&_nocache=${new Date().getTime()}`;

      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          try {
            const rawData = results.data || [];
            
            // Filtrar pendientes, calcular score y ordenar descendentemente
            const tareasProcesadas = rawData
              .filter(t => (t.Estado || "").trim().toLowerCase() !== "terminada" && t.Tarea)
              .map(t => ({
                ...t,
                score: calcularScore(t)
              }))
              .sort((a, b) => b.score - a.score);

            renderizarTareas(tareasProcesadas);
          } catch (errRender) {
            console.error("Error al procesar tareas:", errRender);
            mostrarError("Error al calcular la matriz de tareas.");
          }
        },
        error: function (errParse) {
          console.error("Error al descargar CSV de tareas:", errParse);
          mostrarError("No se pudo conectar con la hoja de Tareas.");
        }
      });
    } catch (error) {
      console.error("Error crítico en initTareas:", error);
      mostrarError("Ocurrió un error inesperado al cargar el módulo de tareas.");
    }
  }

  // Fórmula de prioridad ponderada
  function calcularScore(t) {
    const u = VALORES.urgencia[t.Urgencia] || 0;
    const i = VALORES.importancia[t.Importancia] || 0;
    const d = VALORES.dificultad[t.Dificultad] || 0;
    const ti = VALORES.tiempo[t.Tiempo] || 0;
    const c = VALORES.costo[t.Costo] || 0;

    return Math.round((u * 0.35) + (i * 0.30) + (d * 0.15) + (ti * 0.10) + (c * 0.10));
  }

  function renderizarTareas(lista) {
    const container = document.getElementById("taskList");
    if (!container) return;

    if (!lista || lista.length === 0) {
      container.innerHTML =
        "<p style='color: var(--text-dim); text-align: center;'>No hay tareas pendientes en este momento. ¡Todo al día! 🎉</p>";
      return;
    }

    let html = "";

    lista.forEach((t) => {
      const tarea = t.Tarea || "Sin descripción";
      const urgencia = t.Urgencia || "Normal";
      const importancia = t.Importancia || "Normal";
      const score = t.score || 0;

      html += `
        <div class="card task-card">
          <div>
            <h3>${tarea}</h3>
            <span style="font-size:0.75rem; color:var(--text-dim);">⌛ ${urgencia} | 🔥 ${importancia}</span>
          </div>
          <div class="score-tag">
            ${score}
            <span class="score-label">PRIORIDAD</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function mostrarError(mensaje) {
    const container = document.getElementById("taskList");
    if (container) {
      container.innerHTML = `<div class="error-msg">⚠️ ${mensaje}</div>`;
    }
  }

  // Inicializar al cargar el DOM
  document.addEventListener("DOMContentLoaded", initTareas);
})();
