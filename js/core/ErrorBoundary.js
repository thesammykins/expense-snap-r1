// ErrorBoundary.js - Global error handling
class ErrorBoundary {
    static async wrap(fn, fallback, context = '') {
        try {
            return await fn();
        } catch (error) {
            console.error(`Error in ${context}:`, error);

            // Log to analytics/monitoring
            this.reportError(error, context);

            // Execute fallback if provided
            if (typeof fallback === 'function') {
                try {
                    return await fallback(error);
                } catch (fallbackError) {
                    console.error('Fallback function also failed:', fallbackError);
                }
            }

            // Default: show error toast
            this.showErrorToast(error.message || 'An error occurred');
            return null;
        }
    }

    static reportError(error, context) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            context,
            message: error.message,
            stack: error.stack,
            userAgent: navigator.userAgent
        };

        // Store locally for diagnostics
        this.saveErrorLog(errorLog);

        // Emit event for monitoring
        eventBus.emit('error:reported', errorLog);
    }

    static showErrorToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff0000;
            color: #fff;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10000;
            animation: slideUp 0.3s ease-out;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static showSuccessToast(message, duration = 2000) {
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #00ff00;
            color: #000;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10000;
            animation: slideUp 0.3s ease-out;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static async saveErrorLog(errorLog) {
        try {
            // Only save in environments with storage
            if (typeof window !== 'undefined' && window.localStorage) {
                const logs = JSON.parse(localStorage.getItem('expense_snap_error_logs') || '[]');
                logs.push(errorLog);

                // Keep last 50 errors only
                if (logs.length > 50) {
                    logs.shift();
                }

                localStorage.setItem('expense_snap_error_logs', JSON.stringify(logs));
            }
        } catch (e) {
            console.error('Failed to save error log:', e);
        }
    }

    static async getErrorLogs() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return JSON.parse(localStorage.getItem('expense_snap_error_logs') || '[]');
            }
        } catch (e) {
            console.error('Failed to retrieve error logs:', e);
        }
        return [];
    }

    static clearErrorLogs() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.removeItem('expense_snap_error_logs');
            }
        } catch (e) {
            console.error('Failed to clear error logs:', e);
        }
    }
}

// Global error handler
if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        ErrorBoundary.reportError(event.error || new Error(event.message), 'global_error_handler');
    });

    window.addEventListener('unhandledrejection', (event) => {
        ErrorBoundary.reportError(event.reason || new Error('Unhandled promise rejection'), 'unhandled_rejection');
    });
}
