/**
 * Módulo Independiente: Compras / Mercado
 * Archivo: js/compras.js
 */
(function () {
  const SHEET_ID = "1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw";
  const URL_COMPRAS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=compras`;

  let datosCompras = [];

  // Inicialización segura del módulo
  function initCompras() {
    try {
      const container = document.getElementById("comprasContainer");
      if (!container) return;

      const url = `${URL_COMPRAS}&_nocache=${new Date().getTime()}`;

      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          try {
            datosCompras = results.data || [];
            actualizarResumen(datosCompras);
            renderizarLista(datosCompras);
          } catch (errRender) {
            console.error("Error al procesar datos de compras:", errRender);
            mostrarError("Error al procesar los datos de la hoja de compras.");
          }
        },
        error: function (errParse) {
          console.error("Error al descargar CSV de compras:", errParse);
          mostrarError("No se pudo conectar con la hoja de Google Sheets.");
        }
      });
    } catch (error) {
      console.error("Error crítico en initCompras:", error);
      mostrarError("Ocurrió un error inesperado al cargar el módulo de compras.");
    }
  }

  // Actualizar contadores superiores (Agotados, Por agotar, Suficiente)
  function actualizarResumen(items) {
    let agotados = 0;
    let porAgotar = 0;
    let suficiente = 0;

    items.forEach((item) => {
      const estado = (item.Estado || "").trim().toLowerCase();
      if (estado === "agotado") agotados++;
      else if (estado === "por agotar") porAgotar++;
      else if (estado === "suficiente") suficiente++;
    });

    const elAgotado = document.getElementById("countAgotado");
    const elPorAgotar = document.getElementById("countPorAgotar");
    const elSuficiente = document.getElementById("countSuficiente");

    if (elAgotado) elAgotado.innerText = agotados;
    if (elPorAgotar) elPorAgotar.innerText = porAgotar;
    if (elSuficiente) elSuficiente.innerText = suficiente;
  }

  // Renderizar tarjetas de productos
  function renderizarLista(items) {
    const container = document.getElementById("comprasContainer");
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML =
        "<p style='color: var(--text-dim); text-align: center;'>No hay registros de productos en el mercado.</p>";
      return;
    }

    let html = "";

    items.forEach((item) => {
      const producto = item.Producto || "Sin nombre";
      const unidad = item.Unidad ? `(${item.Unidad})` : "";
      const categoria = item.Categoria || "General";
      const precioUSD = item.Precio_USD ? `$${item.Precio_USD}` : "-";
      const precioVES = item.Precio_VES ? `Bs. ${item.Precio_VES}` : "-";
      const ultimaCompra = item.Ultima_Compra || "-";
      const duracion = item.Duracion_Dias ? `~${item.Duracion_Dias} días` : "-";
      const estadoRaw = (item.Estado || "Suficiente").trim();

      // Mapeo de estilos según estado
      let classStatus = "status-suficiente";
      const estadoLower = estadoRaw.toLowerCase();
      if (estadoLower === "agotado") classStatus = "status-agotado";
      else if (estadoLower === "por agotar") classStatus = "status-por-agotar";

      html += `
        <div class="card compras-card">
          <div class="compras-info">
            <h4>${producto} <span style="font-weight:normal; color:var(--text-dim);">${unidad}</span></h4>
            <div class="compras-details">
              🏷️ ${categoria} <br>
              📅 Última compra: ${ultimaCompra} (Dura ${duracion})
            </div>
            <span class="badge ${classStatus}">${estadoRaw}</span>
          </div>
          <div class="prices">
            <div class="price-usd">${precioUSD}</div>
            <div class="price-ves">${precioVES}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // Búsqueda / Filtro en tiempo real
  function filtrarCompras() {
    const input = document.getElementById("searchCompras");
    if (!input) return;

    const texto = input.value.toLowerCase().trim();
    const filtrados = datosCompras.filter((item) => {
      const prod = (item.Producto || "").toLowerCase();
      const cat = (item.Categoria || "").toLowerCase();
      return prod.includes(texto) || cat.includes(texto);
    });

    renderizarLista(filtrados);
  }

  // Mostrar mensaje de error aislado en el contenedor del módulo
  function mostrarError(mensaje) {
    const container = document.getElementById("comprasContainer");
    if (container) {
      container.innerHTML = `<div class="error-msg">⚠️ ${mensaje}</div>`;
    }
  }

  // Exponer únicamente la función de filtro al ámbito global para el evento onkeyup
  window.filtrarCompras = filtrarCompras;

  // Cargar datos al estar listo el DOM
  document.addEventListener("DOMContentLoaded", initCompras);
})();
