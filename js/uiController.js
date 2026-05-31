/**
 * uiController.js
 * Controlador de interfaz de usuario.
 * Conecta la UI con la lógica de negocio.
 * Depende de: exceptions.js, task.js, storageService.js, taskManager.js, notificationService.js
 */

// --- Inicialización global ---
const storageService = new StorageService('taskflow_tasks');
const taskManager = new TaskManager(storageService);
let pendingDeleteId = null;

// --- Manejador global de excepciones ---
window.addEventListener('error', (event) => {
    console.error('Error global capturado:', event.error);
    NotificationService.show('Ha ocurrido un error inesperado. Por favor recarga la página.', 'error');
    event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesa rechazada sin manejar:', event.reason);
    NotificationService.show('Error en operación asíncrona.', 'error');
});

// --- Renderizar al cargar ---
document.addEventListener('DOMContentLoaded', () => {
    renderAll();
});


/** Renderiza estadísticas, progreso y lista de tareas */
function renderAll() {
    renderStatistics();
    renderTaskList();
}

/** Actualiza las estadísticas del dashboard */
function renderStatistics() {
    const stats = taskManager.getStatistics();

    document.getElementById('stat-total-value').textContent = stats.total;
    document.getElementById('stat-pending-value').textContent = stats.byStatus.pendiente || 0;
    document.getElementById('stat-progress-value').textContent = stats.byStatus.en_progreso || 0;
    document.getElementById('stat-completed-value').textContent = stats.byStatus.completada || 0;

    // Barra de progreso
    const rate = parseFloat(stats.completionRate) || 0;
    document.getElementById('progress-bar-fill').style.width = `${rate}%`;
    document.getElementById('progress-percentage').textContent = `${rate}%`;
}

/** Renderiza la lista de tareas según los filtros activos */
function renderTaskList() {
    const container = document.getElementById('task-list');
    const filters = getCurrentFilters();
    const filteredTasks = taskManager.filterTasks(filters);

    container.innerHTML = '';

    if (filteredTasks.length === 0) {
        container.innerHTML = renderEmptyState(filters);
        return;
    }

    // Ordenar: pendientes primero, luego en progreso, luego completadas
    const statusOrder = { pendiente: 0, en_progreso: 1, completada: 2 };
    filteredTasks.sort((a, b) => {
        const statusDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
        if (statusDiff !== 0) return statusDiff;
        // Dentro del mismo estado, prioridad alta primero
        const priorityOrder = { alta: 0, media: 1, baja: 2 };
        return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });

    filteredTasks.forEach(task => {
        container.innerHTML += createTaskCardHTML(task);
    });
}

/** Obtiene los filtros actuales de la barra de herramientas */
function getCurrentFilters() {
    return {
        search: document.getElementById('search-input').value,
        status: document.getElementById('filter-status').value,
        priority: document.getElementById('filter-priority').value
    };
}

/** Genera el HTML de una tarjeta de tarea */
function createTaskCardHTML(task) {
    const isOverdue = task.dueDate && task.status !== 'completada' &&
                      new Date(task.dueDate) < new Date();
    const completedClass = task.status === 'completada' ? 'completed' : '';

    const dueDateDisplay = task.dueDate
        ? formatDate(task.dueDate)
        : 'Sin fecha';

    const overdueTag = isOverdue
        ? '<span class="overdue">⚠️ Vencida</span>'
        : '';

    const nextStatuses = getNextStatuses(task.status);
    const statusButtons = nextStatuses.map(s =>
        `<button class="btn btn-icon btn-secondary" onclick="handleStatusChange('${task.id}', '${s.value}')" title="${s.label}">${s.icon}</button>`
    ).join('');

    return `
        <div class="task-card ${completedClass}" data-priority="${task.priority}" data-id="${task.id}">
            <div class="task-card-header">
                <span class="task-title">${escapeHTML(task.title)}</span>
                <div class="task-badges">
                    <span class="badge badge-priority-${task.priority}">${Task.PRIORITY_LABELS[task.priority]}</span>
                    <span class="badge badge-status badge-status-${task.status}">${Task.STATUS_LABELS[task.status]}</span>
                </div>
            </div>
            ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ''}
            <div class="task-meta">
                <div class="task-meta-info">
                    <span>📅 ${dueDateDisplay}</span>
                    <span>🕐 ${formatDate(task.createdAt)}</span>
                    ${overdueTag}
                </div>
                <div class="task-actions">
                    ${statusButtons}
                    <button class="btn btn-icon btn-secondary" onclick="openEditModal('${task.id}')" title="Editar">✏️</button>
                    <button class="btn btn-icon btn-danger" onclick="openDeleteConfirm('${task.id}')" title="Eliminar">🗑️</button>
                </div>
            </div>
        </div>
    `;
}

/** Retorna las transiciones de estado posibles */
function getNextStatuses(currentStatus) {
    const transitions = {
        pendiente: [
            { value: 'en_progreso', label: 'Iniciar', icon: '▶️' }
        ],
        en_progreso: [
            { value: 'completada', label: 'Completar', icon: '✅' },
            { value: 'pendiente', label: 'Pausar', icon: '⏸️' }
        ],
        completada: [
            { value: 'pendiente', label: 'Reabrir', icon: '🔄' }
        ]
    };
    return transitions[currentStatus] || [];
}

/** Genera el HTML del estado vacío */
function renderEmptyState(filters) {
    const hasFilters = filters.search || filters.status || filters.priority;
    if (hasFilters) {
        return `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>Sin resultados</h3>
                <p>No se encontraron tareas con los filtros aplicados. Intenta cambiar los criterios de búsqueda.</p>
            </div>`;
    }
    return `
        <div class="empty-state">
            <div class="empty-icon">📝</div>
            <h3>¡Comienza a organizar tu día!</h3>
            <p>Aún no tienes tareas. Haz clic en "Nueva Tarea" para crear tu primera tarea y empezar a ser más productivo.</p>
        </div>`;
}


/* ============================================================
   HANDLERS DE EVENTOS
   ============================================================ */

/** Abre el modal para crear una nueva tarea */
function openAddModal() {
    document.getElementById('modal-task-title').textContent = '✨ Nueva Tarea';
    document.getElementById('btn-submit-task').textContent = '💾 Guardar Tarea';
    document.getElementById('task-edit-id').value = '';
    document.getElementById('task-form').reset();
    clearFormErrors();
    openModal('modal-task');
}

/** Abre el modal para editar una tarea existente */
function openEditModal(taskId) {
    try {
        const task = taskManager.findTaskById(taskId);
        document.getElementById('modal-task-title').textContent = '✏️ Editar Tarea';
        document.getElementById('btn-submit-task').textContent = '💾 Actualizar Tarea';
        document.getElementById('task-edit-id').value = taskId;
        document.getElementById('task-title-input').value = task.title;
        document.getElementById('task-desc-input').value = task.description;
        document.getElementById('task-priority-input').value = task.priority;
        document.getElementById('task-date-input').value = task.dueDate || '';
        clearFormErrors();
        openModal('modal-task');
    } catch (error) {
        if (error instanceof TaskNotFoundError) {
            NotificationService.show('La tarea no fue encontrada.', 'error');
        } else {
            NotificationService.show('Error al abrir la tarea.', 'error');
        }
    }
}

/** Maneja el envío del formulario de tarea */
function handleTaskSubmit(event) {
    if (event) event.preventDefault();
    clearFormErrors();

    const editId = document.getElementById('task-edit-id').value;
    const taskData = {
        title: document.getElementById('task-title-input').value,
        description: document.getElementById('task-desc-input').value,
        priority: document.getElementById('task-priority-input').value,
        dueDate: document.getElementById('task-date-input').value || null
    };

    try {
        if (editId) {
            taskManager.updateTask(editId, taskData);
            NotificationService.show('Tarea actualizada correctamente.', 'success');
        } else {
            taskManager.addTask(taskData);
            NotificationService.show('Tarea creada exitosamente.', 'success');
        }
        closeModal('modal-task');
        renderAll();
    } catch (error) {
        if (error instanceof TaskValidationError) {
            showFormError(error.field, error.message);
        } else {
            NotificationService.show(`Error: ${error.message}`, 'error');
        }
    }
}

/** Maneja el cambio de estado de una tarea */
function handleStatusChange(taskId, newStatus) {
    try {
        taskManager.updateStatus(taskId, newStatus);
        const label = Task.STATUS_LABELS[newStatus] || newStatus;
        NotificationService.show(`Estado cambiado a ${label}`, 'success');
        renderAll();
    } catch (error) {
        NotificationService.show(`Error: ${error.message}`, 'error');
    }
}

/** Abre el modal de confirmación de eliminación */
function openDeleteConfirm(taskId) {
    pendingDeleteId = taskId;
    openModal('modal-confirm');
}

/** Confirma y ejecuta la eliminación */
function confirmDelete() {
    if (!pendingDeleteId) return;
    try {
        taskManager.deleteTask(pendingDeleteId);
        NotificationService.show('Tarea eliminada.', 'info');
        pendingDeleteId = null;
        closeModal('modal-confirm');
        renderAll();
    } catch (error) {
        NotificationService.show(`Error al eliminar: ${error.message}`, 'error');
    }
}

/** Maneja cambios en los filtros */
function handleFilterChange() {
    renderTaskList();
}

/** Exporta las tareas a un archivo JSON */
function handleExport() {
    try {
        const json = taskManager.exportToJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `taskflow_backup_${new Date().toISOString().slice(0,10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        NotificationService.show('Tareas exportadas correctamente.', 'success');
    } catch (error) {
        NotificationService.show(`Error al exportar: ${error.message}`, 'error');
    }
}

/** Abre el modal de importación */
function openImportModal() {
    document.getElementById('import-json-input').value = '';
    clearImportError();
    openModal('modal-import');
}

/** Maneja la importación de tareas */
function handleImport() {
    clearImportError();
    const jsonString = document.getElementById('import-json-input').value.trim();

    if (!jsonString) {
        showImportError('Por favor pega el contenido JSON.');
        return;
    }

    try {
        taskManager.importFromJSON(jsonString);
        NotificationService.show(`Tareas importadas correctamente (${taskManager.tasks.length} tareas).`, 'success');
        closeModal('modal-import');
        renderAll();
    } catch (error) {
        if (error instanceof TaskValidationError) {
            showImportError(error.message);
        } else {
            showImportError('Error al procesar el JSON. Verifica el formato.');
        }
    }
}


/* ============================================================
   UTILIDADES
   ============================================================ */

/** Abre un modal por su ID */
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

/** Cierra un modal por su ID */
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

/** Cierra modal al hacer clic fuera */
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

/** Cierra modal con tecla Escape */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

/** Muestra un error en un campo del formulario */
function showFormError(field, message) {
    const errorEl = document.getElementById(`error-${field}`);
    if (errorEl) {
        errorEl.querySelector('span').textContent = message;
        errorEl.classList.add('visible');
    } else {
        NotificationService.show(message, 'error');
    }
}

/** Limpia todos los errores del formulario */
function clearFormErrors() {
    document.querySelectorAll('.form-error').forEach(el => {
        el.classList.remove('visible');
    });
}

/** Muestra error en el campo de importación */
function showImportError(message) {
    const errorEl = document.getElementById('error-import');
    errorEl.querySelector('span').textContent = message;
    errorEl.classList.add('visible');
}

/** Limpia el error de importación */
function clearImportError() {
    document.getElementById('error-import').classList.remove('visible');
}

/** Formatea una fecha ISO a formato legible */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Fecha inválida';
        return date.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return 'Fecha inválida';
    }
}

/** Escapa HTML para prevenir XSS */
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
