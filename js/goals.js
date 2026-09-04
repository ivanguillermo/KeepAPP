/**
 * Módulo Independiente: Goals / Metas
 * Archivo: js/goals.js
 */
(function () {
  const SHEET_ID = "1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw";
  const URL_GOALS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=goals`;

  let datosGoals = [];
  let pestanaActual = "Septiembre"; // Pestaña por defecto

  function initGoals() {
    try {
      const container = document.getElementById("goalsContainer");
      if (!container) return;

      const url = `${URL_GOALS}&_nocache=${new Date().getTime()}`;

      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          try {
            datosGoals = results.data || [];
            renderizarGoals(pestanaActual);
          } catch (err) {
            console.error("Error al procesar metas:", err);
            mostrarError("Error al procesar la lista de metas.");
          }
        },
        error: function (err) {
          console.error("Error al descargar CSV de metas:", err);
          mostrarError("No se pudo conectar con la hoja de Goals.");
        }
      });
    } catch (error) {
      console.error("Error crítico en initGoals:", error);
      mostrarError("Ocurrió un error inesperado en el módulo de metas.");
    }
  }

  // Cambiar entre pestañas (300, Julio, Agosto, Septiembre..., Week)
  function switchGoalsTab(tabName) {
    pestanaActual = tabName;

    // Marcar botón activo
    document.querySelectorAll(".goals-tab-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.getAttribute("data-tab").toLowerCase() === tabName.toLowerCase()) {
        btn.classList.add("active");
      }
    });

    renderizarGoals(pestanaActual);
  }

  // Renderizar los elementos de la columna seleccionada
  function renderizarGoals(columnName) {
    const container = document.getElementById("goalsContainer");
    if (!container) return;

    // Extraer únicamente los valores no vacíos de la columna activa
    const metasColumn = datosGoals
      .map((row) => {
        // Busca la llave sin importar mayúsculas/minúsculas
        const key = Object.keys(row).find(
          (k) => k.trim().toLowerCase() === columnName.toLowerCase()
        );
        return key ? (row[key] || "").trim() : "";
      })
      .filter((texto) => texto.length > 0);

    if (!metasColumn || metasColumn.length === 0) {
      container.innerHTML = `<p style='color: var(--text-dim); text-align: center; padding: 20px;'>No hay metas registradas para ${columnName}.</p>`;
      return;
    }

    let html = "";

    metasColumn.forEach((metaText, index) => {
      const itemId = `goal-${columnName.toLowerCase()}-${index}`;

      html += `
        <div class="swipe-item-wrapper">
          <div class="swipe-content card goal-card" id="card-${itemId}">
            <div class="goal-info">
              <span class="goal-text">${metaText}</span>
            </div>
            <span class="badge status-por-agotar">Pendiente</span>
          </div>
          <button class="swipe-action-btn" onclick="toggleGoalStatus('${itemId}')">
            ✓ Listo
          </button>
        </div>
      `;
    });

    container.innerHTML = html;
    setupSwipeEvents();
  }

  // Alternar estado completado / pendiente localmente en UI
  function toggleGoalStatus(itemId) {
    const card = document.getElementById(`card-${itemId}`);
    if (!card) return;

    const isCompleted = card.classList.contains("completed");
    const badge = card.querySelector(".badge");

    if (isCompleted) {
      card.classList.remove("completed");
      if (badge) {
        badge.className = "badge status-por-agotar";
        badge.innerText = "Pendiente";
      }
    } else {
      card.classList.add("completed");
      if (badge) {
        badge.className = "badge status-suficiente";
        badge.innerText = "¡Logrado! 🎉";
      }
    }

    // Regresar la tarjeta a su posición original
    const wrapper = card.parentElement;
    if (wrapper) wrapper.classList.remove("swiped");
  }

  // Interacción táctil de Swipe Left
  function setupSwipeEvents() {
    const wrappers = document.querySelectorAll(".swipe-item-wrapper");

    wrappers.forEach((wrapper) => {
      const content = wrapper.querySelector(".swipe-content");
      let startX = 0;
      let currentX = 0;

      content.addEventListener("touchstart", (e) => {
        startX = e.touches[0].clientX;
      }, { passive: true });

      content.addEventListener("touchmove", (e) => {
        currentX = e.touches[0].clientX;
        const diff = startX - currentX;
        if (diff > 10 && diff < 100) {
          content.style.transform = `translateX(-${diff}px)`;
        }
      }, { passive: true });

      content.addEventListener("touchend", () => {
        const diff = startX - currentX;
        content.style.transform = "";

        if (diff > 50) {
          wrapper.classList.toggle("swiped");
        } else if (diff < -30) {
          wrapper.classList.remove("swiped");
        }
      });
    });
  }

  function mostrarError(mensaje) {
    const container = document.getElementById("goalsContainer");
    if (container) {
      container.innerHTML = `<div class="error-msg">⚠️ ${mensaje}</div>`;
    }
  }

  // Exponer al ámbito global
  window.switchGoalsTab = switchGoalsTab;
  window.toggleGoalStatus = toggleGoalStatus;

  document.addEventListener("DOMContentLoaded", initGoals);
})();
