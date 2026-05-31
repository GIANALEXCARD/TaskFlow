/**
 * task.js
 * Modelo de datos: clase Task.
 * Representa una tarea con validación estricta (fail-fast).
 * Depende de: exceptions.js
 */

class Task {
    /** Prioridades válidas para una tarea */
    static VALID_PRIORITIES = ['alta', 'media', 'baja'];

    /** Estados válidos del ciclo de vida de una tarea */
    static VALID_STATUSES = ['pendiente', 'en_progreso', 'completada'];

    /** Etiquetas legibles para prioridades */
    static PRIORITY_LABELS = {
        alta: '🔴 Alta',
        media: '🟡 Media',
        baja: '🟢 Baja'
    };

    /** Etiquetas legibles para estados */
    static STATUS_LABELS = {
        pendiente: '📋 Pendiente',
        en_progreso: '🔄 En Progreso',
        completada: '✅ Completada'
    };

    /**
     * Crea una nueva tarea con validación estricta.
     * @param {Object} params - Datos de la tarea
     * @throws {TaskValidationError} Si los datos son inválidos
     */
    constructor({ title, description = '', priority = 'media', dueDate = null }) {
        this.validateTitle(title);
        this.validatePriority(priority);
        if (dueDate) this.validateDueDate(dueDate);

        this.id          = crypto.randomUUID();
        this.title       = title.trim();
        this.description = description.trim();
        this.priority    = priority;
        this.status      = 'pendiente';
        this.createdAt   = new Date().toISOString();
        this.dueDate     = dueDate || null;
    }

    /** Valida que el título cumpla con los requisitos */
    validateTitle(title) {
        if (!title || typeof title !== 'string') {
            throw new TaskValidationError('title', 'El título es obligatorio y debe ser texto.');
        }
        if (title.trim().length < 3) {
            throw new TaskValidationError('title', 'El título debe tener al menos 3 caracteres.');
        }
        if (title.trim().length > 100) {
            throw new TaskValidationError('title', 'El título no puede exceder 100 caracteres.');
        }
    }

    /** Valida que la prioridad sea una de las permitidas */
    validatePriority(priority) {
        if (!Task.VALID_PRIORITIES.includes(priority)) {
            throw new TaskValidationError(
                'priority',
                `Prioridad inválida. Use: ${Task.VALID_PRIORITIES.join(', ')}`
            );
        }
    }

    /** Valida que la fecha sea válida */
    validateDueDate(dueDate) {
        const date = new Date(dueDate);
        if (isNaN(date.getTime())) {
            throw new TaskValidationError('dueDate', 'La fecha proporcionada no es válida.');
        }
    }

    /** Verifica si la tarea está vencida */
    get isOverdue() {
        if (!this.dueDate || this.status === 'completada') return false;
        return new Date(this.dueDate) < new Date();
    }

    /** Etiqueta legible de la prioridad */
    get priorityLabel() {
        return Task.PRIORITY_LABELS[this.priority];
    }

    /** Etiqueta legible del estado */
    get statusLabel() {
        return Task.STATUS_LABELS[this.status];
    }
}
