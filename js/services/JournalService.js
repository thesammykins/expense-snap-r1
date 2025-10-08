// JournalService.js - Offline-first journal sync with retry logic
class JournalService {
    constructor() {
        this.syncQueue = [];
        this.isSyncing = false;
        this.maxRetries = 5;
        this.syncEnabled = true;

        // Load sync preference
        this._loadSyncPreference();
    }

    async _loadSyncPreference() {
        this.syncEnabled = await storageService.getPreference('journal_sync_enabled') !== false;
    }

    async setSyncEnabled(enabled) {
        this.syncEnabled = enabled;
        await storageService.setPreference('journal_sync_enabled', enabled);

        if (enabled && this.syncQueue.length > 0) {
            this._processSyncQueue();
        }
    }

    isSyncEnabled() {
        return this.syncEnabled;
    }

    // Add expense to sync queue
    async syncExpense(expense) {
        if (!this.syncEnabled) {
            console.log('Journal sync disabled');
            return;
        }

        this.syncQueue.push({
            ...expense,
            retries: 0,
            addedAt: Date.now()
        });

        await this._processSyncQueue();
    }

    // Process sync queue with retry logic
    async _processSyncQueue() {
        if (this.isSyncing || this.syncQueue.length === 0 || !this.syncEnabled) {
            return;
        }

        this.isSyncing = true;
        eventBus.emit('journal:sync_started', { queueLength: this.syncQueue.length });

        while (this.syncQueue.length > 0) {
            const item = this.syncQueue[0];

            try {
                await this._syncToJournal(item);

                // Success - remove from queue
                this.syncQueue.shift();
                eventBus.emit('journal:synced', item);

            } catch (error) {
                console.error('Journal sync failed:', error);

                // Increment retry counter
                item.retries = (item.retries || 0) + 1;

                // Give up after max retries
                if (item.retries > this.maxRetries) {
                    console.warn(`Giving up on syncing expense ${item.id} after ${this.maxRetries} retries`);
                    this.syncQueue.shift();
                    await this._saveToFailedQueue(item);
                    eventBus.emit('journal:sync_failed', item);
                } else {
                    // Exponential backoff
                    const backoffMs = Math.min(1000 * Math.pow(2, item.retries), 30000);
                    console.log(`Retrying in ${backoffMs}ms (attempt ${item.retries}/${this.maxRetries})`);
                    await this._delay(backoffMs);
                }

                // Stop processing on failure (will retry later)
                break;
            }
        }

        this.isSyncing = false;

        // Schedule retry if there are still items
        if (this.syncQueue.length > 0) {
            setTimeout(() => this._processSyncQueue(), 60000); // Retry in 1 minute
        } else {
            eventBus.emit('journal:sync_completed');
        }
    }

    async _syncToJournal(expense) {
        const message = this._formatJournalEntry(expense);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Journal sync timeout'));
            }, 10000);

            try {
                if (typeof PluginMessageHandler !== 'undefined') {
                    const payload = {
                        message,
                        useLLM: true,
                        wantsJournalEntry: true,  // KEY: Syncs to rabbithole
                        wantsR1Response: false     // Silent sync
                    };

                    PluginMessageHandler.postMessage(JSON.stringify(payload));
                    clearTimeout(timeout);
                    resolve();
                } else {
                    clearTimeout(timeout);
                    reject(new Error('PluginMessageHandler not available'));
                }
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    _formatJournalEntry(expense) {
        const parts = [
            `Expense logged: $${expense.amount}`,
            `at ${expense.merchant}`,
            `for ${expense.category}`
        ];

        if (expense.items && expense.items.length > 0) {
            parts.push(`Items: ${expense.items.join(', ')}`);
        }

        if (expense.description) {
            parts.push(expense.description);
        }

        return parts.join(' ');
    }

    async _saveToFailedQueue(expense) {
        try {
            const failed = await storageService._getItem('failed_syncs') || [];
            failed.push({
                ...expense,
                failedAt: Date.now()
            });

            // Keep last 100 failed syncs
            if (failed.length > 100) {
                failed.shift();
            }

            await storageService._setItem('failed_syncs', failed);
        } catch (error) {
            console.error('Failed to save to failed queue:', error);
        }
    }

    async getFailedSyncs() {
        return await storageService._getItem('failed_syncs') || [];
    }

    async retryFailedSyncs() {
        const failed = await this.getFailedSyncs();
        if (failed.length === 0) return;

        // Clear failed queue
        await storageService._setItem('failed_syncs', []);

        // Add back to sync queue
        failed.forEach(expense => {
            this.syncQueue.push({
                ...expense,
                retries: 0
            });
        });

        await this._processSyncQueue();
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get sync status
    getSyncStatus() {
        return {
            enabled: this.syncEnabled,
            syncing: this.isSyncing,
            queueLength: this.syncQueue.length,
            pending: this.syncQueue.length > 0
        };
    }

    // Clear sync queue
    clearQueue() {
        this.syncQueue = [];
        this.isSyncing = false;
    }
}

// Singleton instance
const journalService = new JournalService();
