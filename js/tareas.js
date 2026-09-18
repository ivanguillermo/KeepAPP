// tareas.js

// Reemplaza esta URL con la URL del despliegue de tu Google Apps Script si no la tienes global
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzOUx8P3Fc1c89B1QiHBQot1f0NahjUSWQ1HuTIwQVbe9ElHZLB2NOEUge8B5-4hhHv/exec'; 

let tareasGlobales = [];

/**
 * Función principal para cargar y renderizar el módulo de Tareas
 * @param {HTMLElement} container - Elemento contenedor del DOM
 */
export async function cargarTareas(container) {
  container.innerHTML = `
    <div class="tareas-container">
      <h2>Gestión de Tareas</h2>
      <div class="cargando">Cargando tareas...</div>
    </div>
  `;

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=obtenerTareas`);
    const data = await response.json();
    
    tareasGlobales = data.tareas || [];
    renderView(container);
  } catch (error) {
    console.error('Error al cargar tareas:', error);
    container.innerHTML = `
      <div class="tareas-container">
        <h2>Gestión de Tareas</h2>
        <p class="error">Ocurrió un error al cargar las tareas. Por favor, reintenta.</p>
      </div>
    `;
  }
}

/**
 * Renderiza la interfaz de usuario con la lista de tareas y los controles
 * @param {HTMLElement} container 
 */
function renderView(container) {
  container.innerHTML = `
    <div class="tareas-container">
      <h2>Gestión de Tareas</h2>
      
      <!-- Formulario para agregar tarea -->
      <form id="form-nueva-tarea" class="tarea-form">
        <input type="text" id="input-tarea-titulo" placeholder="Nueva tarea..." required />
        <button type="submit">Agregar</button>
      </form>

      <!-- Lista de tareas -->
      <ul class="lista-tareas">
        ${tareasGlobales.map(tarea => `
          <li class="tarea-item ${tarea.Estado === 'Listo' ? 'completada' : ''}" data-id="${tarea.ID}">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                class="chk-completar" 
                data-id="${tarea.ID}" 
                ${tarea.Estado === 'Listo' ? 'checked' : ''}
              />
              <span class="titulo-tarea">${escapeHTML(tarea.Tarea || '')}</span>
            </label>
            <button class="btn-eliminar" data-id="${tarea.ID}">&times;</button>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  adjuntarEventos(container);
}

/**
 * Registra los manejadores de eventos para creación, actualización y eliminación
 * @param {HTMLElement} container 
 */
function adjuntarEventos(container) {
  // 1. Evento para crear nueva tarea
  const form = container.querySelector('#form-nueva-tarea');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = container.querySelector('#input-tarea-titulo');
      const titulo = input.value.trim();
      if (!titulo) return;

      const nuevaTareaOptimista = {
        ID: Date.now().toString(),
        Tarea: titulo,
        Estado: 'Por iniciar'
      };

      tareasGlobales.push(nuevaTareaOptimista);
      renderView(container);

      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'crearTarea',
            tarea: titulo
          })
        });
        const result = await response.json();
        console.log('Tarea creada con éxito:', result);
      } catch (err) {
        console.error('Error al guardar la nueva tarea:', err);
      }
    });
  }

  // 2. Evento para actualizar estado (Checkbox)
  container.querySelectorAll('.chk-completar').forEach(chk => {
    chk.addEventListener('change', async (e) => {
      const id = e.target.getAttribute('data-id');
      const nuevoEstado = e.target.checked ? 'Listo' : 'Por iniciar';
      
      const t = tareasGlobales.find(item => String(item.ID) === String(id));
      if (t) t.Estado = nuevoEstado;

      renderView(container);

      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'actualizarEstadoTarea',
            id: id,
            estado: nuevoEstado
          })
        });
        const result = await response.json();
        console.log('Estado actualizado:', result);
      } catch (err) {
        console.error('Error al actualizar estado:', err);
      }
    });
  });

  // 3. Evento para eliminar tarea
  container.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (!confirm('¿Seguro que deseas eliminar esta tarea?')) return;

      tareasGlobales = tareasGlobales.filter(item => String(item.ID) !== String(id));
      renderView(container);

      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'eliminarTarea',
            id: id
          })
        });
        const result = await response.json();
        console.log('Tarea eliminada:', result);
      } catch (err) {
        console.error('Error al eliminar tarea:', err);
      }
    });
  });
}

/**
 * Helper para sanear texto y evitar fallos por HTML
 */
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
