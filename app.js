const SHEET_ID = "1jw9T6byYopO1uOX3iDTtD_9DFvl_2LaC-tT-Qgsu7kw";

// URLs de pestañas en Google Sheets
const URL_COMPRAS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=compras`;
const URL_TAREAS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=tareas`;
const URL_RUTINA = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=bbm_rutina`;
const URL_RECORDS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=bbm_records`;
const URL_MEDIDAS = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=bbm_medidas`;

let datosCompras = [];
let datosRutina = [];

// --- NAVEGACIÓN Y MENÚ ---
function toggleMenu() {
  document.getElementById("drawer").classList.toggle("active");
  document.getElementById("overlay").classList.toggle("active");
}

function navigate(sectionId, titleText) {
  document.querySelectorAll(".section-view").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".drawer-menu a").forEach(a => a.classList.remove("active"));

  document.getElementById(`view-${sectionId}`).classList.add("active");
  document.getElementById("currentSectionTitle").innerText = titleText;
  
  const activeLink = document.getElementById(`link-${sectionId}`);
  if (activeLink) activeLink.classList.add("active");

  toggleMenu();
}

function switchBBMTab(tabName) {
  document.querySelectorAll(".bbm-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".bbm-subview").forEach(v => v.classList.remove("active"));

  event.target.classList.add("active");
  document.getElementById(`bbm-${tabName}`).classList.add("active");
}

// --- MÓDULO COMPRAS ---
function cargarCompras() {
  const url = `${URL_COMPRAS}&_nocache=${new Date().getTime()}`;
  Papa.parse(url, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      datosCompras = results.data;
      actualizarResumenCompras(datosCompras);
      renderizarCompras(datosCompras);
    }
  });
}

function actualizarResumenCompras(items) {
  let agotados = 0, porAgotar = 0, suficiente = 0;

  items.forEach(i => {
    const st = (i.Estado || "").trim().toLowerCase();
    if (st === "agotado") agotados++;
    else if (st === "por agotar") porAgotar++;
    else if (st === "suficiente") suficiente++;
  });

  document.getElementById("countAgotado").innerText = agotados;
  document.getElementById("countPorAgotar").innerText = porAgotar;
  document.getElementById("countSuficiente").innerText = suficiente;
}

function renderizarCompras(items) {
  const contenedor = document.getElementById("comprasContainer");
  contenedor.innerHTML = "";

  if (items.length === 0) {
    contenedor.innerHTML = "<p style='color: var(--text-dim); text-align: center;'>No hay registros de compras.</p>";
    return;
  }

  items.forEach(i => {
    const estadoClean = (i.Estado || "").trim();
    let classStatus = "status-suficiente";
    if (estadoClean.toLowerCase() === "agotado") classStatus = "status-agotado";
    if (estadoClean.toLowerCase() === "por agotar") classStatus = "status-por-agotar";

    contenedor.innerHTML += `
      <div class="card compras-card">
        <div class="compras-info">
          <h4>${i.Producto} <span style="font-weight:normal; color:var(--text-dim);">(${i.Unidad})</span></h4>
          <div class="compras-details">
            🏷️ ${i.Categoria} <br>
            📅 Última compra: ${i.Ultima_Compra || '-'} (Dura ~${i.Duracion_Dias} días)
          </div>
          <span class="status-badge ${classStatus}">${estadoClean}</span>
        </div>
        <div class="prices">
          <div class="price-usd">$${i.Precio_USD}</div>
          <div class="price-ves">Bs. ${i.Precio_VES}</div>
        </div>
      </div>
    `;
  });
}

function filtrarCompras() {
  const texto = document.getElementById("searchCompras").value.toLowerCase();
  const filtrados = datosCompras.filter(i => 
    i.Producto.toLowerCase().includes(texto) || 
    i.Categoria.toLowerCase().includes(texto)
  );
  renderizarCompras(filtrados);
}

// --- MÓDULO TAREAS ---
const VALORES_TAREAS = {
  urgencia: { "Hoy": 100, "Pronto": 50, "Eventualmente": 15 },
  importancia: { "Vital": 100, "Muy": 60, "Normal": 20 },
  dificultad: { "Fácil": 100, "Mediano": 50, "Difícil": 20 },
  tiempo: { "Muy rápido": 100, "Poco tiempo": 70, "Más de un día": 40, "Mucho": 10 },
  costo: { "Gratis": 100, "Poco": 80, "Barato": 60, "Caro": 30, "Muy caro": 10 }
};

function calcularPrioridad(t) {
  const u = VALORES_TAREAS.urgencia[t.Urgencia] || 0;
  const i = VALORES_TAREAS.importancia[t.Importancia] || 0;
  const d = VALORES_TAREAS.dificultad[t.Dificultad] || 0;
  const ti = VALORES_TAREAS.tiempo[t.Tiempo] || 0;
  const c = VALORES_TAREAS.costo[t.Costo] || 0;

  return Math.round((u * 0.35) + (i * 0.30) + (d * 0.15) + (ti * 0.10) + (c * 0.10));
}

function cargarTareas() {
  const url = `${URL_TAREAS}&_nocache=${new Date().getTime()}`;
  Papa.parse(url, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      const tareas = results.data
        .filter(t => t.Estado !== "Terminada")
        .map(t => ({ ...t, score: calcularPrioridad(t) }))
        .sort((a, b) => b.score - a.score);

      renderizarTareas(tareas);
    }
  });
}

function renderizarTareas(lista) {
  const contenedor = document.getElementById("taskList");
  contenedor.innerHTML = "";

  lista.forEach(t => {
    contenedor.innerHTML += `
      <div class="card task-card">
        <div>
          <h3>${t.Tarea}</h3>
          <span style="font-size:0.75rem; color:var(--text-dim);">⌛ ${t.Urgencia} | 🔥 ${t.Importancia}</span>
        </div>
        <div class="score-tag">${t.score}<span class="score-label">PRIORIDAD</span></div>
      </div>
    `;
  });
}

// --- MÓDULO BBM (GYM) ---
function setDiaActual() {
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const hoy = dias[new Date().getDay()];
  const select = document.getElementById("daySelector");
  if (select) select.value = hoy;
}

function cargarRutina() {
  const url = `${URL_RUTINA}&_nocache=${new Date().getTime()}`;
  Papa.parse(url, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      datosRutina = results.data;
      renderizarEjerciciosPorDia();
    }
  });
}

function renderizarEjerciciosPorDia() {
  const diaSeleccionado = document.getElementById("daySelector").value;
  const contenedor = document.getElementById("exerciseList");
  contenedor.innerHTML = "";

  const ejercicios = datosRutina.filter(e => e.Dia === diaSeleccionado);

  if (ejercicios.length === 0) {
    contenedor.innerHTML = "<p style='color: var(--text-dim); text-align: center;'>No hay ejercicios para este día.</p>";
    return;
  }

  ejercicios.forEach(e => {
    contenedor.innerHTML += `
      <div class="card">
        <h4 style="margin:0 0 4px 0;">${e.Ejercicio}</h4>
        <div style="font-size:0.85rem; color:var(--accent);">${e.Series} series × ${e.Repeticiones} reps</div>
      </div>
    `;
  });
}

// Inicialización de la aplicación
cargarCompras();
cargarTareas();
setDiaActual();
cargarRutina();
