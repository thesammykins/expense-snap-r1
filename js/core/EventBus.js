// EventBus.js - Pub/sub for cross-module communication
class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        console.log(`EventBus: ${event}`, data);
        const callbacks = this.listeners.get(event) || [];

        callbacks.forEach(cb => {
            try {
                cb(data);
            } catch (error) {
                console.error(`EventBus error in ${event}:`, error);
            }
        });
    }

    once(event, callback) {
        const wrappedCallback = (data) => {
            callback(data);
            this.off(event, wrappedCallback);
        };
        this.on(event, wrappedCallback);
    }

    clear() {
        this.listeners.clear();
    }
}

// Singleton instance
const eventBus = new EventBus();
