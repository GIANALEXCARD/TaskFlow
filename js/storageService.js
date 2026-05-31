/**
 * storageService.js
 * Servicio de almacenamiento persistente (LocalStorage).
 * Abstrae la persistencia con manejo robusto de excepciones.
 * Depende de: exceptions.js
 */

class StorageService {
    constructor(storageKey = 'taskflow_tasks') {
        this.storageKey = storageKey;
    }

    /**
     * Guarda las tareas en LocalStorage.
     * @param {Array} tasks - Lista de tareas a persistir
     * @throws {StorageError} Si falla la operación de guardado
     */
    save(tasks) {
        try {
            const serializedData = JSON.stringify(tasks);
            localStorage.setItem(this.storageKey, serializedData);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                throw new StorageError('save',
                    'Almacenamiento lleno. Elimine tareas antiguas para liberar espacio.');
            }
            throw new StorageError('save', `Error inesperado: ${error.message}`);
        }
    }

    /**
     * Carga las tareas desde LocalStorage.
     * Incluye recuperación ante datos corruptos.
     * @returns {Array} Lista de tareas
     */
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return [];

            const parsed = JSON.parse(data);

            if (!Array.isArray(parsed)) {
                throw new StorageError('load', 'Formato de datos corrupto: se esperaba un arreglo.');
            }

            return parsed;
        } catch (error) {
            if (error instanceof StorageError) throw error;
            // Recuperación: si JSON está corrupto, retorna lista vacía
            console.error('Error al cargar datos, iniciando con lista vacía:', error);
            return [];
        }
    }

    /** Limpia todos los datos almacenados */
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            throw new StorageError('clear', `No se pudo limpiar: ${error.message}`);
        }
    }
}
