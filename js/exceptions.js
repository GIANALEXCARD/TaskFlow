/**
 * exceptions.js
 * Excepciones personalizadas del dominio TaskFlow.
 * Proporcionan contexto específico sobre errores de la aplicación.
 */

/**
 * Excepción para errores de validación de datos de tareas.
 * Extiende Error nativo para mantener el stack trace.
 */
class TaskValidationError extends Error {
    constructor(field, message) {
        super(`Validación fallida en "${field}": ${message}`);
        this.name = 'TaskValidationError';
        this.field = field;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Excepción para errores de almacenamiento persistente.
 * Cubre casos como cuota excedida, datos corruptos, etc.
 */
class StorageError extends Error {
    constructor(operation, message) {
        super(`Error de almacenamiento [${operation}]: ${message}`);
        this.name = 'StorageError';
        this.operation = operation;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Excepción cuando una tarea no se encuentra por su ID.
 */
class TaskNotFoundError extends Error {
    constructor(taskId) {
        super(`Tarea con ID "${taskId}" no encontrada.`);
        this.name = 'TaskNotFoundError';
        this.taskId = taskId;
    }
}
