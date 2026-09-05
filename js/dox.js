/**
 * dox.js - Subida, visualización, descarga e impresión de documentos desde Google Drive
 */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymfxYFUMkh6DXl86dx62TzAheiGlIFBXqFbAfBVfesaPZDc2o28lkreyjM3Tic-FXE/exec';

function initDox() {
  const container = document.getElementById('sec-dox');
  if (!container) return;

  renderDoxLayout(container);
  obtenerDocumentos();
}

function renderDoxLayout(container) {
  container.innerHTML = `
    <div class="border-l-4 border-slate-400 pl-3 mb-4">
      <h2 class="text-xl font-bold text-gray-800">DOX</h2>
      <p class="text-xs text-gray-500 font-medium">Bóveda de Documentos e Identificaciones</p>
    </div>

    <!-- Formulario de carga -->
    <div class="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs mb-6 space-y-3">
      <h3 class="text-xs font-bold text-gray-700 uppercase tracking-wider">Subir nuevo documento</h3>
      
      <div>
        <label class="block text-[11px] font-medium text-gray-500 mb-1">Tipo de Documento</label>
        <select id="dox-tipo" class="w-full text-xs border border-gray-200 rounded-lg p-2 bg-gray-50 focus:outline-none focus:border-indigo-500">
          <option value="Cedula">Cédula de Identidad</option>
          <option value="Pasaporte">Pasaporte</option>
          <option value="Titulo">Título / Certificado</option>
          <option value="Universidad">UNA / UPEL</option>
          <option value="Planillas">Planillas </option>
          <option value="Poder">Poder / Licencia</option>
          <option value="Bancario">Bancario </option>
          <option value="Otros">Otro Documento</option>
        </select>
      </div>

      <div>
        <label class="block text-[11px] font-medium text-gray-500 mb-1">Nombre o Descripción</label>
        <input type="text" id="dox-nombre" placeholder="Ej: Cédula Frontal" class="w-full text-xs border border-gray-200 rounded-lg p-2 bg-gray-50 focus:outline-none focus:border-indigo-500">
      </div>

      <div>
        <label class="block text-[11px] font-medium text-gray-500 mb-1">Seleccionar Foto/Archivo</label>
        <input type="file" id="dox-file" accept="image/*,application/pdf" class="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100">
      </div>

      <button id="btn-subir-dox" onclick="subirDocumento()" class="w-full py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition">
        Guardar en Google Drive
      </button>

      <div id="dox-status" class="text-xs text-center hidden"></div>
    </div>

    <!-- Lista de documentos recuperados -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold text-gray-700 uppercase tracking-wider">Archivos Guardados</h3>
        <button onclick="obtenerDocumentos()" class="text-xs text-indigo-600 hover:underline">🔄 Actualizar</button>
      </div>
      <div id="dox-lista-archivos" class="space-y-2">
        <p class="text-xs text-gray-400 italic">Cargando lista de documentos...</p>
      </div>
    </div>
  `;
}

async function obtenerDocumentos() {
  const listaContainer = document.getElementById('dox-lista-archivos');
  if (!listaContainer) return;

  listaContainer.innerHTML = `<p class="text-xs text-gray-400 italic">Cargando lista de documentos...</p>`;

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=obtenerArchivosDox`);
    const data = await res.json();

    if (data.status === 'success' && data.archivos.length > 0) {
      let html = '';
      data.archivos.forEach(file => {
        html += `
          <div class="p-3 bg-white rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div class="truncate mr-2">
              <p class="text-xs font-semibold text-gray-800 truncate">${file.nombre}</p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <a href="${file.urlVer}" target="_blank" class="p-1.5 bg-gray-50 hover:bg-indigo-50 text-indigo-600 rounded-lg text-xs" title="Abrir / Ver">
                👁️
              </a>
              <a href="${file.urlDescarga}" download class="p-1.5 bg-gray-50 hover:bg-emerald-50 text-emerald-600 rounded-lg text-xs" title="Descargar">
                ⬇️
              </a>
              <button onclick="imprimirDocumento('${file.urlDescarga}')" class="p-1.5 bg-gray-50 hover:bg-purple-50 text-purple-600 rounded-lg text-xs" title="Imprimir">
                🖨️
              </button>
            </div>
          </div>
        `;
      });
      listaContainer.innerHTML = html;
    } else {
      listaContainer.innerHTML = `<p class="text-xs text-gray-400 italic">No hay documentos guardados en la carpeta.</p>`;
    }
  } catch (err) {
    listaContainer.innerHTML = `<p class="text-xs text-red-500">Error al cargar documentos.</p>`;
  }
}

async function subirDocumento() {
  const tipo = document.getElementById('dox-tipo').value;
  const nombre = document.getElementById('dox-nombre').value.trim();
  const fileInput = document.getElementById('dox-file');
  const statusDiv = document.getElementById('dox-status');
  const btn = document.getElementById('btn-subir-dox');

  if (!nombre || fileInput.files.length === 0) {
    alert("Por favor ingresa un nombre y selecciona una imagen o archivo.");
    return;
  }

  const file = fileInput.files[0];
  
  statusDiv.classList.remove('hidden', 'text-red-500', 'text-emerald-600');
  statusDiv.classList.add('text-indigo-600');
  statusDiv.textContent = "Procesando y subiendo archivo...";
  btn.disabled = true;

  const reader = new FileReader();
  reader.readAsDataURL(file);
  
  reader.onload = async function () {
    const payload = {
      tipoDoc: tipo,
      nombreDoc: nombre,
      fileData: reader.result
    };

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'guardarDocumento', payload: payload })
      });

      const res = await response.json();
      btn.disabled = false;

      if (res.status === 'success') {
        statusDiv.className = "text-xs text-center text-emerald-600 font-semibold";
        statusDiv.textContent = "✓ Guardado con éxito en Drive.";
        document.getElementById('dox-nombre').value = '';
        fileInput.value = '';
        obtenerDocumentos(); // Recarga la lista automáticamente
      } else {
        statusDiv.className = "text-xs text-center text-red-500";
        statusDiv.textContent = "Error: " + res.message;
      }
    } catch (err) {
      btn.disabled = false;
      statusDiv.className = "text-xs text-center text-red-500";
      statusDiv.textContent = "Error de conexión: " + err.message;
    }
  };
}

// Impresión limpia en segundo plano mediante un iframe
function imprimirDocumento(urlDescarga) {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = urlDescarga;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };
}

// Registro global del módulo
if (window.KeepModule) {
  KeepModule('dox', initDox);
} else {
  document.addEventListener('DOMContentLoaded', initDox);
}
