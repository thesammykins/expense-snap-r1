// AppState.js - Centralized state management with Observable pattern
class AppState {
    constructor() {
        this.state = {
            currentScreen: 'home',
            expenses: [],
            selectedExpense: null,
            syncStatus: 'idle',
            filters: {
                dateRange: null,
                category: null
            },
            pagination: {
                offset: 0,
                limit: 50
            },
            budget: {
                daily: 200,
                weekly: 1400,
                monthly: 6000
            },
            selectedMenuOption: 0
        };
        this.listeners = new Map();
    }

    subscribe(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, []);
        }
        this.listeners.get(path).push(callback);
        return () => this.unsubscribe(path, callback);
    }

    unsubscribe(path, callback) {
        const callbacks = this.listeners.get(path);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    update(path, value) {
        const oldState = JSON.parse(JSON.stringify(this.state));
        this.state = this._setPath(this.state, path, value);
        this._notify(path, value, oldState);
    }

    get(path) {
        return this._getPath(this.state, path);
    }

    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    _notify(path, newValue, oldState) {
        const callbacks = this.listeners.get(path) || [];
        callbacks.forEach(cb => {
            try {
                cb(newValue, oldState);
            } catch (error) {
                console.error(`Error in state listener for ${path}:`, error);
            }
        });
    }

    _getPath(obj, path) {
        if (!path) return obj;

        const keys = path.split('.');
        let result = obj;

        for (const key of keys) {
            if (result === null || result === undefined) {
                return undefined;
            }
            result = result[key];
        }

        return result;
    }

    _setPath(obj, path, value) {
        const keys = path.split('.');
        const newObj = JSON.parse(JSON.stringify(obj));
        let current = newObj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
        return newObj;
    }
}

// Singleton instance
const appState = new AppState();
