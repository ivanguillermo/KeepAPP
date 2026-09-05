/**
 * dox.js - Subida de documentos e imágenes a Google Drive
 */

function initDox() {
  const container = document.getElementById('sec-dox');
  if (!container) return;

  renderDoxLayout(container);
}

function renderDoxLayout(container) {
  container.innerHTML = `
    <div class="border-l-4 border-indigo-400 pl-3 mb-4">
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
          <option value="Carnet">Carnet / Licencia</option>
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
  `;
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
  
  // Mostrar feedback de carga
  statusDiv.classList.remove('hidden', 'text-red-500', 'text-emerald-600');
  statusDiv.classList.add('text-indigo-600');
  statusDiv.textContent = "Procesando y subiendo archivo...";
  btn.disabled = true;

  // Convertir archivo a Base64
  const reader = new FileReader();
  reader.readAsDataURL(file);
  
  reader.onload = function () {
    const payload = {
      tipoDoc: tipo,
      nombreDoc: nombre,
      fileData: reader.result
    };

    // Llamada a Apps Script
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler(res => {
          btn.disabled = false;
          if (res.status === 'success') {
            statusDiv.className = "text-xs text-center text-emerald-600 font-semibold";
            statusDiv.innerHTML = `✓ Guardado con éxito. <a href="${res.fileUrl}" target="_blank" class="underline">Ver en Drive</a>`;
            document.getElementById('dox-nombre').value = '';
            fileInput.value = '';
          } else {
            statusDiv.className = "text-xs text-center text-red-500";
            statusDiv.textContent = "Error: " + res.message;
          }
        })
        .withFailureHandler(err => {
          btn.disabled = false;
          statusDiv.className = "text-xs text-center text-red-500";
          statusDiv.textContent = "Error de conexión: " + err.message;
        })
        .guardarDocumentoDrive(payload);
    } else {
      btn.disabled = false;
      statusDiv.textContent = "Entorno Google Apps Script no detectado.";
    }
  };
}
