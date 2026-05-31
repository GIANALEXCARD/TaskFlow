/**
 * taskManager.js
 * Gestor de tareas: orquesta operaciones CRUD.
 * Delega la persistencia al StorageService.
 * Depende de: exceptions.js, task.js, storageService.js
 */

class TaskManager {
    constructor(storageService) {
        this.storage = storageService;
        this.tasks = this.storage.load();
    }

    /**
     * Crea y persiste una nueva tarea.
     * @param {Object} taskData - Datos para crear la tarea
     * @returns {Task} La tarea creada
     * @throws {TaskValidationError} Si los datos son inválidos
     */
    addTask(taskData) {
        try {
            const task = new Task(taskData);
            this.tasks.push(task);
            this.persistChanges();
            return task;
        } catch (error) {
            if (error instanceof TaskValidationError) throw error;
            throw new Error(`Error inesperado al crear tarea: ${error.message}`);
        }
    }

    /**
     * Actualiza una tarea existente.
     * @param {string} taskId - ID de la tarea a actualizar
     * @param {Object} updates - Campos a actualizar
     * @returns {Object} La tarea actualizada
     */
    updateTask(taskId, updates) {
        const task = this.findTaskById(taskId);

        if (updates.title !== undefined) {
            if (!updates.title || updates.title.trim().length < 3) {
                throw new TaskValidationError('title', 'El título debe tener al menos 3 caracteres.');
            }
            task.title = updates.title.trim();
        }

        if (updates.description !== undefined) {
            task.description = updates.description.trim();
        }

        if (updates.priority !== undefined) {
            if (!Task.VALID_PRIORITIES.includes(updates.priority)) {
                throw new TaskValidationError('priority', 'Prioridad inválida.');
            }
            task.priority = updates.priority;
        }

        if (updates.dueDate !== undefined) {
            task.dueDate = updates.dueDate || null;
        }

        this.persistChanges();
        return task;
    }

    /**
     * Elimina una tarea por su ID.
     * @param {string} taskId - ID de la tarea a eliminar
     * @throws {TaskNotFoundError} Si la tarea no existe
     */
    deleteTask(taskId) {
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index === -1) throw new TaskNotFoundError(taskId);
        this.tasks.splice(index, 1);
        this.persistChanges();
    }

    /**
     * Actualiza el estado de una tarea.
     * @param {string} taskId - ID de la tarea
     * @param {string} newStatus - Nuevo estado
     * @returns {Object} La tarea actualizada
     */
    updateStatus(taskId, newStatus) {
        if (!Task.VALID_STATUSES.includes(newStatus)) {
            throw new TaskValidationError('status', `Estado inválido: ${newStatus}`);
        }
        const task = this.findTaskById(taskId);
        task.status = newStatus;
        this.persistChanges();
        return task;
    }

    /**
     * Busca una tarea por ID o lanza excepción.
     * @param {string} taskId - ID a buscar
     * @returns {Object} La tarea encontrada
     * @throws {TaskNotFoundError} Si no se encuentra
     */
    findTaskById(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) throw new TaskNotFoundError(taskId);
        return task;
    }

    /**
     * Filtra tareas por múltiples criterios.
     * @param {Object} filters - Criterios de filtrado
     * @returns {Array} Tareas que cumplen los filtros
     */
    filterTasks(filters = {}) {
        return this.tasks.filter(task => {
            const matchesStatus = !filters.status || task.status === filters.status;
            const matchesPriority = !filters.priority || task.priority === filters.priority;
            const matchesSearch = !filters.search ||
                task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                task.description.toLowerCase().includes(filters.search.toLowerCase());
            return matchesStatus && matchesPriority && matchesSearch;
        });
    }

    /**
     * Calcula estadísticas del dashboard.
     * @returns {Object} Estadísticas de las tareas
     */
    getStatistics() {
        const total = this.tasks.length;
        const byStatus = {};

        Task.VALID_STATUSES.forEach(status => {
            byStatus[status] = this.tasks.filter(t => t.status === status).length;
        });

        const overdue = this.tasks.filter(t => {
            if (!t.dueDate || t.status === 'completada') return false;
            return new Date(t.dueDate) < new Date();
        }).length;

        const completionRate = total
            ? ((byStatus.completada / total) * 100).toFixed(1)
            : 0;

        return { total, byStatus, overdue, completionRate };
    }

    /** Centraliza la persistencia — Principio DRY */
    persistChanges() {
        this.storage.save(this.tasks);
    }

    /** Exporta todas las tareas a JSON formateado */
    exportToJSON() {
        return JSON.stringify(this.tasks, null, 2);
    }

    /**
     * Importa tareas desde JSON con validación.
     * @param {string} jsonString - JSON a importar
     * @throws {TaskValidationError} Si el formato es inválido
     */
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            if (!Array.isArray(data)) {
                throw new TaskValidationError('import', 'El JSON debe contener un arreglo de tareas.');
            }

            // Validar estructura mínima de cada tarea
            data.forEach((item, index) => {
                if (!item.title || typeof item.title !== 'string') {
                    throw new TaskValidationError('import',
                        `Tarea en posición ${index} no tiene un título válido.`);
                }
            });

            this.tasks = data;
            this.persistChanges();
        } catch (error) {
            if (error instanceof TaskValidationError) throw error;
            if (error instanceof SyntaxError) {
                throw new TaskValidationError('import', 'El texto no es un JSON válido.');
            }
            throw error;
        }
    }
}
