/**
 * notificationService.js
 * Servicio de notificaciones toast al usuario.
 */

class NotificationService {
    /**
     * Muestra una notificación toast.
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo: 'success', 'error', 'info'
     */
    static show(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;

        container.appendChild(toast);

        // Auto-remove después de 3.5 segundos
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
}
