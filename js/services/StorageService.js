// StorageService.js - Indexed storage with pagination for scalability
class StorageService {
    constructor() {
        this.STORAGE_PREFIX = 'expense_snap_';
        this.INDEXES = {
            byDate: 'idx_date',
            byCategory: 'idx_category',
            byMerchant: 'idx_merchant',
            allIds: 'all_expense_ids'
        };
        this.cache = new Map();
        this.cacheSize = 100;
    }

    // Save expense with automatic index updates
    async saveExpense(expense) {
        const id = expense.id || this._generateId();
        expense.id = id;
        expense.timestamp = expense.timestamp || new Date().toISOString();

        // Save expense data
        await this._setItem(`expense_${id}`, expense);

        // Update indexes
        await Promise.all([
            this._updateIndex(this.INDEXES.byDate, this._getDateKey(expense.date), id),
            this._updateIndex(this.INDEXES.byCategory, expense.category, id),
            this._updateIndex(this.INDEXES.byMerchant, expense.merchant, id),
            this._addToAllIds(id)
        ]);

        // Add to cache
        this.cache.set(id, expense);
        this._pruneCache();

        // Emit event
        eventBus.emit('expense:created', expense);

        return expense;
    }

    // Update existing expense
    async updateExpense(id, updates) {
        const existing = await this.getExpense(id);
        if (!existing) {
            throw new Error(`Expense not found: ${id}`);
        }

        const updated = { ...existing, ...updates, id };
        await this._setItem(`expense_${id}`, updated);

        // Update cache
        this.cache.set(id, updated);

        // Emit event
        eventBus.emit('expense:updated', updated);

        return updated;
    }

    // Delete expense
    async deleteExpense(id) {
        const expense = await this.getExpense(id);
        if (!expense) return false;

        // Remove from storage
        await this._removeItem(`expense_${id}`);

        // Remove from indexes
        await Promise.all([
            this._removeFromIndex(this.INDEXES.byDate, this._getDateKey(expense.date), id),
            this._removeFromIndex(this.INDEXES.byCategory, expense.category, id),
            this._removeFromIndex(this.INDEXES.byMerchant, expense.merchant, id),
            this._removeFromAllIds(id)
        ]);

        // Remove from cache
        this.cache.delete(id);

        // Emit event
        eventBus.emit('expense:deleted', expense);

        return true;
    }

    // Get single expense
    async getExpense(id) {
        // Check cache first
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }

        const expense = await this._getItem(`expense_${id}`);
        if (expense) {
            this.cache.set(id, expense);
            this._pruneCache();
        }

        return expense;
    }

    // Query expenses with filters and pagination
    async queryExpenses(filters = {}, pagination = { offset: 0, limit: 50 }) {
        let candidateIds = [];

        // Use best index for query
        if (filters.dateRange) {
            candidateIds = await this._queryByDateRange(filters.dateRange.start, filters.dateRange.end);
        } else if (filters.category) {
            candidateIds = await this._getIndexEntries(this.INDEXES.byCategory, filters.category);
        } else if (filters.merchant) {
            candidateIds = await this._getIndexEntries(this.INDEXES.byMerchant, filters.merchant);
        } else {
            candidateIds = await this._getAllExpenseIds();
        }

        // Sort by date (newest first)
        const expenses = await this._batchLoadExpenses(candidateIds);
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Apply pagination
        const total = expenses.length;
        const paginated = expenses.slice(pagination.offset, pagination.offset + pagination.limit);

        return {
            expenses: paginated,
            total,
            hasMore: pagination.offset + pagination.limit < total
        };
    }

    // Search expenses by text
    async searchExpenses(query, limit = 20) {
        query = query.toLowerCase();
        const allIds = await this._getAllExpenseIds();
        const matches = [];

        // Load in batches to avoid memory spike
        const batchSize = 50;
        for (let i = 0; i < allIds.length && matches.length < limit; i += batchSize) {
            const batch = allIds.slice(i, i + batchSize);
            const expenses = await this._batchLoadExpenses(batch);

            expenses.forEach(exp => {
                if (matches.length >= limit) return;

                const searchableText = `${exp.merchant} ${exp.description || ''} ${exp.category}`.toLowerCase();
                if (searchableText.includes(query)) {
                    matches.push(exp);
                }
            });
        }

        return matches;
    }

    // Get expenses for today
    async getTodayExpenses() {
        const today = new Date().toISOString().split('T')[0];
        return this.queryExpenses({
            dateRange: { start: today, end: today }
        });
    }

    // Get total for today
    async getTodayTotal() {
        const result = await this.getTodayExpenses();
        return result.expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    }

    // Budget management
    async getBudget() {
        const budget = await this._getItem('budget');
        return budget || { daily: 200, weekly: 1400, monthly: 6000 };
    }

    async setBudget(budget) {
        await this._setItem('budget', budget);
        eventBus.emit('budget:updated', budget);
    }

    // Preferences
    async getPreference(key) {
        const prefs = await this._getItem('preferences') || {};
        return prefs[key];
    }

    async setPreference(key, value) {
        const prefs = await this._getItem('preferences') || {};
        prefs[key] = value;
        await this._setItem('preferences', prefs);
    }

    // Index management
    async _updateIndex(indexName, key, expenseId) {
        const indexKey = `${indexName}_${key}`;
        let entries = await this._getItem(indexKey) || [];

        if (!entries.includes(expenseId)) {
            entries.push(expenseId);
            await this._setItem(indexKey, entries);
        }
    }

    async _removeFromIndex(indexName, key, expenseId) {
        const indexKey = `${indexName}_${key}`;
        let entries = await this._getItem(indexKey) || [];
        entries = entries.filter(id => id !== expenseId);
        await this._setItem(indexKey, entries);
    }

    async _getIndexEntries(indexName, key) {
        const indexKey = `${indexName}_${key}`;
        return await this._getItem(indexKey) || [];
    }

    async _addToAllIds(id) {
        let allIds = await this._getItem(this.INDEXES.allIds) || [];
        if (!allIds.includes(id)) {
            allIds.push(id);
            await this._setItem(this.INDEXES.allIds, allIds);
        }
    }

    async _removeFromAllIds(id) {
        let allIds = await this._getItem(this.INDEXES.allIds) || [];
        allIds = allIds.filter(existingId => existingId !== id);
        await this._setItem(this.INDEXES.allIds, allIds);
    }

    async _getAllExpenseIds() {
        return await this._getItem(this.INDEXES.allIds) || [];
    }

    async _queryByDateRange(startDate, endDate) {
        const keys = this._generateDateKeys(startDate, endDate);
        const allIds = [];

        for (const key of keys) {
            const ids = await this._getIndexEntries(this.INDEXES.byDate, key);
            allIds.push(...ids);
        }

        return [...new Set(allIds)]; // Deduplicate
    }

    async _batchLoadExpenses(ids) {
        const expenses = [];

        for (const id of ids) {
            if (this.cache.has(id)) {
                expenses.push(this.cache.get(id));
            } else {
                const expense = await this._getItem(`expense_${id}`);
                if (expense) {
                    this.cache.set(id, expense);
                    expenses.push(expense);
                }
            }
        }

        this._pruneCache();
        return expenses;
    }

    // Storage abstraction with Base64 encoding
    async _setItem(key, value) {
        const fullKey = this.STORAGE_PREFIX + key;
        const serialized = JSON.stringify(value);
        const encoded = btoa(serialized);

        try {
            if (typeof window.creationStorage !== 'undefined') {
                // R1 Creation Storage (asynchronous)
                await window.creationStorage.plain.setItem(fullKey, encoded);
                console.log(`[Storage] Saved to R1 storage: ${key}`);

                // Verify write succeeded by reading back
                const verified = await window.creationStorage.plain.getItem(fullKey);
                if (!verified) {
                    console.error(`[Storage] Verification failed for key: ${key}`);
                    throw new Error('Storage write verification failed');
                }
                return true;
            } else if (typeof localStorage !== 'undefined') {
                // Browser localStorage (synchronous)
                localStorage.setItem(fullKey, encoded);
                console.log(`[Storage] Saved to localStorage: ${key}`);
                return true;
            } else {
                throw new Error('No storage mechanism available');
            }
        } catch (error) {
            console.error(`[Storage] Failed to save ${key}:`, error);
            throw error;
        }
    }

    async _getItem(key) {
        const fullKey = this.STORAGE_PREFIX + key;
        let encoded;

        try {
            if (typeof window.creationStorage !== 'undefined') {
                // R1 Creation Storage (asynchronous)
                encoded = await window.creationStorage.plain.getItem(fullKey);
                console.log(`[Storage] Retrieved from R1 storage: ${key} = ${encoded ? 'found' : 'null'}`);
            } else if (typeof localStorage !== 'undefined') {
                // Browser localStorage (synchronous)
                encoded = localStorage.getItem(fullKey);
                console.log(`[Storage] Retrieved from localStorage: ${key} = ${encoded ? 'found' : 'null'}`);
            }

            if (!encoded) return null;

            const decoded = atob(encoded);
            const parsed = JSON.parse(decoded);
            return parsed;
        } catch (error) {
            console.error(`[Storage] Failed to retrieve ${key}:`, error);
            return null;
        }
    }

    async _removeItem(key) {
        const fullKey = this.STORAGE_PREFIX + key;

        if (typeof window.creationStorage !== 'undefined') {
            return await window.creationStorage.plain.removeItem(fullKey);
        } else if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(fullKey);
        }
    }

    _pruneCache() {
        if (this.cache.size > this.cacheSize) {
            const toDelete = this.cache.size - this.cacheSize;
            const keys = Array.from(this.cache.keys());
            for (let i = 0; i < toDelete; i++) {
                this.cache.delete(keys[i]);
            }
        }
    }

    _getDateKey(dateStr) {
        // Normalize to YYYY-MM-DD
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
    }

    _generateDateKeys(startDate, endDate) {
        const keys = [];
        const current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
            keys.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }

        return keys;
    }

    _generateId() {
        return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Singleton instance
const storageService = new StorageService();
