/**
 * KeepAPP - Módulo de Medicinas y Alertas
 */
window.KeepModule('medicinas', () => {
  const contenedorMedicinas = document.getElementById('contenedor-medicinas');
  const contenedorNotificaciones = document.getElementById('contenedor-notificaciones');
  const btnNuevaMedicina = document.getElementById('btn-nueva-medicina');

  // URL del Web App de Google Apps Script (Asegúrate de enlazar la tuya o usar la variable global si la tienes)
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzilp12MWKnyqHZQ-WDdaqXps2Frsm5ebnaUeTxnZ5T5I29xKf0baavoXzRErZy_Fsz/exec"; 

  async function cargarMedicinas() {
    try {
      contenedorMedicinas.innerHTML = `<div class="p-4 bg-pastel-rose/40 rounded-2xl border border-rose-100 text-sm text-gray-600">Cargando medicinas...</div>`;
      
      const response = await fetch(`${SCRIPT_URL}?action=obtenerMedicinas`);
      const data = await response.json();

      if (data.status === 'success' && data.medicinas) {
        renderizarMedicinas(data.medicinas);
        procesarAlertas(data.medicinas);
      } else {
        contenedorMedicinas.innerHTML = `<div class="p-4 bg-red-50 rounded-2xl text-sm text-red-500">Error al cargar datos.</div>`;
      }
    } catch (err) {
      console.error(err);
      contenedorMedicinas.innerHTML = `<div class="p-4 bg-red-50 rounded-2xl text-sm text-red-500">Error de conexión.</div>`;
    }
  }

  function renderizarMedicinas(lista) {
    if (lista.length === 0) {
      contenedorMedicinas.innerHTML = `<div class="p-4 text-center text-sm text-gray-400">No hay medicinas registradas.</div>`;
      return;
    }

    let html = `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-50 text-gray-500 border-b border-gray-100">
              <tr>
                <th class="p-3 font-semibold">Medicina</th>
                <th class="p-3 font-semibold">Precio</th>
                <th class="p-3 font-semibold">Cant.</th>
                <th class="p-3 font-semibold">Agota</th>
                <th class="p-3 font-semibold text-center">Días Rest. (HOY)</th>
                <th class="p-3 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
    `;

    lista.forEach((med, index) => {
      // Alerta visual si quedan pocos días (ej. menos de 5 días)
      const esUrgente = med.hoy <= 5;
      const badgeClase = esUrgente ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-gray-100 text-gray-700';

      html += `
        <tr class="hover:bg-gray-50/50 transition-colors">
          <td class="p-3 font-medium text-gray-800">${med.medicina}</td>
          <td class="p-3 text-gray-600">$${med.precio.toFixed(2)}</td>
          <td class="p-3 text-gray-600">${med.cantidad}</td>
          <td class="p-3 text-gray-600">${med.agota}</td>
          <td class="p-3 text-center">
            <span class="px-2 py-1 rounded-full text-[10px] ${badgeClase}">${med.hoy} días</span>
          </td>
          <td class="p-3 text-right">
            <button onclick="window.editarMedicina(${index})" class="text-indigo-600 hover:text-indigo-900 font-medium px-2 py-1 bg-indigo-50 rounded-lg">Editar</button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div></div>`;
    contenedorMedicinas.innerHTML = html;
    window._listaMedicinasCache = lista;
  }

  function procesarAlertas(lista) {
    let alertasHTML = '';
    let contadorAlertas = 0;

    lista.forEach(med => {
      // Si faltan 5 días o menos para agotarse, generamos la fila de alerta
      if (med.hoy <= 5) {
        contadorAlertas++;
        alertasHTML += `
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span class="font-bold text-gray-800">${med.medicina}</span>
              <span class="text-gray-500">(Quedan ${med.hoy} días - Agota: ${med.agota})</span>
            </div>
            <span class="bg-amber-200 text-amber-800 px-2 py-0.5 rounded-md font-semibold text-[10px]">Comprar pronto</span>
          </div>
        `;
      }
    });

    if (contadorAlertas === 0) {
      contenedorNotificaciones.innerHTML = `<div class="p-4 bg-pastel-amber/40 rounded-2xl border border-amber-100 text-sm text-gray-600 text-center">No hay alertas de medicinas pendientes. Todo en orden.</div>`;
    } else {
      contenedorNotificaciones.innerHTML = alertasHTML;
    }
  }

  // Modal para Editar / Agregar
  window.editarMedicina = function(index) {
    const med = window._listaMedicinasCache[index];
    abrirModalMedicina(med);
  };

  if (btnNuevaMedicina) {
    btnNuevaMedicina.addEventListener('click', () => {
      abrirModalMedicina(null);
    });
  }

  function abrirModalMedicina(med) {
    const modalId = 'modal-medicina';
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    const esEdicion = !!med;
    const titulo = esEdicion ? `Editar: ${med.medicina}` : 'Agregar Nueva Medicina';

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl animate-in fade-in zoom-in duration-200">
        <h3 class="text-lg font-bold text-gray-800">${titulo}</h3>
        <form id="form-medicina" class="space-y-3 text-xs">
          <div>
            <label class="block font-medium text-gray-600 mb-1">Nombre Medicina</label>
            <input type="text" name="medicina" value="${esEdicion ? med.medicina : ''}" required class="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-rose-400">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-medium text-gray-600 mb-1">Precio ($)</label>
              <input type="number" step="0.01" name="precio" value="${esEdicion ? med.precio : ''}" required class="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-rose-400">
            </div>
            <div>
              <label class="block font-medium text-gray-600 mb-1">Cantidad</label>
              <input type="number" name="cantidad" value="${esEdicion ? med.cantidad : ''}" required class="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-rose-400">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-medium text-gray-600 mb-1">Duración (Días)</label>
              <input type="number" name="duracion" value="${esEdicion ? med.duracion : ''}" required class="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-rose-400">
            </div>
            <div>
              <label class="block font-medium text-gray-600 mb-1">Última Compra</label>
              <input type="text" name="ultima_compra" placeholder="DD/MM/YY" value="${esEdicion ? med.ultima_Compra : ''}" class="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-rose-400">
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="btn-cerrar-modal" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-medium">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-rose-500 text-white rounded-xl font-medium shadow-sm hover:bg-rose-600">Guardar</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-cerrar-modal').addEventListener('click', () => modal.remove());
    
    modal.querySelector('#form-medicina').addEventListener('submit', (e) => {
      e.preventDefault();
      // Aquí puedes conectar el guardado con tu backend de Apps Script más adelante
      alert('Cambios simulados guardados localmente. (Conecta con doPost en Apps Script según requieras)');
      modal.remove();
      cargarMedicinas();
    });
  }

  // Cargar datos al iniciar el módulo
  cargarMedicinas();
});
