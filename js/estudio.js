/**
 * Módulo Independiente: Benkyo / Estudio
 * Archivo: js/estudio.js
 */
(function () {
  const SHEET_ID = "1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw";
  const URL_ESTUDIO = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=benkyou`;

  let datosEstudio = [];
  let subseccionActual = "UNA"; // 'UNA' | 'UNEY' | 'Cursos'

  // Inicialización segura del módulo
  function initEstudio() {
    try {
      const container = document.getElementById("estudioContainer");
      if (!container) return;

      const url = `${URL_ESTUDIO}&_nocache=${new Date().getTime()}`;

      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          try {
            datosEstudio = results.data || [];
            renderizarSubseccion(subseccionActual);
          } catch (errRender) {
            console.error("Error al procesar datos de estudio:", errRender);
            mostrarError("Error al procesar los datos académicos.");
          }
        },
        error: function (errParse) {
          console.error("Error al descargar CSV de estudio:", errParse);
          mostrarError("No se pudo conectar con la hoja de Estudio.");
        }
      });
    } catch (error) {
      console.error("Error crítico en initEstudio:", error);
      mostrarError("Ocurrió un error inesperado en el módulo de estudio.");
    }
  }

  // Cambiar entre las subvistas internas: UNA, UNEY, Cursos
  function switchEstudioTab(subseccion) {
    subseccionActual = subseccion;

    // Actualizar estados visuales de los botones
    document.querySelectorAll(".estudio-tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    if (event && event.target) {
      event.target.classList.add("active");
    }

    renderizarSubseccion(subseccionActual);
  }

  // Renderizar la subsección seleccionada
  function renderizarSubseccion(subseccion) {
    const container = document.getElementById("estudioContainer");
    if (!container) return;

    // Filtrar registros correspondientes
    const items = datosEstudio.filter(
      (item) => (item.Universidad || item.Seccion || "").trim().toUpperCase() === subseccion.toUpperCase()
    );

    if (subseccion === "CURSOS" || items.length === 0) {
      if (subseccion === "CURSOS") {
        container.innerHTML =
          "<p style='color: var(--text-dim); text-align: center; padding: 20px;'>🎓 Sin cursos activos por ahora.</p>";
      } else {
        container.innerHTML =
          `<p style='color: var(--text-dim); text-align: center; padding: 20px;'>No hay asignaturas registradas para ${subseccion}.</p>`;
      }
      return;
    }

    if (subseccion === "UNA") {
      renderizarUNA(items, container);
    } else if (subseccion === "UNEY") {
      renderizarUNEY(items, container);
    }
  }

  // Renderizado para la UNA (Agrupa evaluaciones por materia y código)
  function renderizarUNA(items, container) {
    // Agrupar filas por nombre de materia
    const materiasMap = {};

    items.forEach((item) => {
      const nombre = (item.Materia || "Sin Nombre").trim();
      const codigo = item.Codigo ? item.Codigo.trim() : "";

      if (!materiasMap[nombre]) {
        materiasMap[nombre] = {
          codigo: codigo,
          evaluaciones: []
        };
      }

      if (item.Tipo_Eval || item.Fecha_Eval) {
        materiasMap[nombre].evaluaciones.push({
          tipo: item.Tipo_Eval || "Evaluación",
          fecha: item.Fecha_Eval || "-",
          ponderacion: item.Ponderacion || "",
          estado: item.Estado || "Pendiente",
          notas: item.Notas || ""
        });
      }
    });

    let html = "";

    Object.keys(materiasMap).forEach((nombreMateria) => {
      const materia = materiasMap[nombreMateria];
      const codigoTag = materia.codigo ? `<span class="badge" style="background: var(--info-bg); color: var(--info);">Cód: ${materia.codigo}</span>` : "";

      let evalsHtml = "";
      if (materia.evaluaciones.length > 0) {
        evalsHtml += `<div style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 8px;">`;
        materia.evaluaciones.forEach((ev) => {
          const estadoLower = (ev.estado || "").toLowerCase();
          let badgeClass = "status-por-agotar";
          if (estadoLower === "entregado" || estadoLower === "aprobado") badgeClass = "status-suficiente";
          if (estadoLower === "reprobado") badgeClass = "status-agotado";

          const pondText = ev.ponderacion ? ` (${ev.ponderacion})` : "";
          const notasText = ev.notas ? `<br><small style="color: var(--text-dim);">💡 ${ev.notas}</small>` : "";

          evalsHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.85rem;">
              <div>
                <strong>📝 ${ev.tipo}</strong>${pondText}
                <div style="color: var(--text-dim); font-size: 0.75rem;">📅 Fecha: ${ev.fecha} ${notasText}</div>
              </div>
              <span class="badge ${badgeClass}">${ev.estado}</span>
            </div>
          `;
        });
        evalsHtml += `</div>`;
      } else {
        evalsHtml = `<p style="font-size: 0.8rem; color: var(--text-dim); margin: 6px 0 0 0;">Sin evaluaciones programadas.</p>`;
      }

      html += `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="margin: 0; font-size: 1rem; color: var(--accent);">${nombreMateria}</h4>
            ${codigoTag}
          </div>
          ${evalsHtml}
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // Renderizado simplificado para la UNEY
  function renderizarUNEY(items, container) {
    let html = "";

    items.forEach((item) => {
      const materia = item.Materia || "Asignatura";
      const estado = item.Estado || "En Cursado";
      const tipoEval = item.Tipo_Eval ? `📌 ${item.Tipo_Eval}` : "";
      const fechaEval = item.Fecha_Eval ? `📅 ${item.Fecha_Eval}` : "";
      const notas = item.Notas ? `<p style="margin: 4px 0 0 0; font-size: 0.75rem; color: var(--text-dim);">💡 ${item.Notas}</p>` : "";

      html += `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="margin: 0; font-size: 0.95rem;">${materia}</h4>
            <span class="badge status-suficiente">${estado}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 6px;">
            ${tipoEval} ${fechaEval ? " | " + fechaEval : ""}
          </div>
          ${notas}
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function mostrarError(mensaje) {
    const container = document.getElementById("estudioContainer");
    if (container) {
      container.innerHTML = `<div class="error-msg">⚠️ ${mensaje}</div>`;
    }
  }

  // Exponer la función de cambio de pestañas al ámbito global
  window.switchEstudioTab = switchEstudioTab;

  // Cargar datos al estar listo el DOM
  document.addEventListener("DOMContentLoaded", initEstudio);
})();
