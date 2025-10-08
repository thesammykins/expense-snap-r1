// LLMService.js - Request/response queue with correlation IDs
class LLMService {
    constructor() {
        this.pendingRequests = new Map();
        this.requestQueue = [];
        this.isProcessing = false;
        this.maxConcurrent = 1; // R1 LLM likely doesn't support concurrent requests

        // Register global message handler
        if (typeof window !== 'undefined') {
            window.onPluginMessage = (data) => this.handleResponse(data);
        }
    }

    // Extract expense data from receipt image
    async extractExpenseData(imageBase64, voiceContext = null) {
        const prompt = this._buildExtractionPrompt(imageBase64, voiceContext);
        return this.sendRequest('expense_extraction', prompt, { timeout: 15000 });
    }

    // Generate insights from expenses
    async generateInsights(expenses, timeRange = 'week') {
        const prompt = this._buildInsightsPrompt(expenses, timeRange);
        return this.sendRequest('insights', prompt, { timeout: 10000 });
    }

    // Parse voice input to expense
    async parseVoiceExpense(transcribedText) {
        const prompt = this._buildVoiceParsePrompt(transcribedText);
        return this.sendRequest('voice_parse', prompt, { timeout: 10000 });
    }

    // Core request/response correlation
    sendRequest(type, message, options = {}) {
        const correlationId = this._generateId();

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(correlationId);
                reject(new Error(`LLM request timeout: ${type}`));
            }, options.timeout || 10000);

            this.pendingRequests.set(correlationId, {
                type,
                resolve,
                reject,
                timeout,
                timestamp: Date.now()
            });

            this.requestQueue.push({
                correlationId,
                type,
                message,
                options
            });

            this._processQueue();
        });
    }

    async _processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) return;

        this.isProcessing = true;
        const request = this.requestQueue.shift();

        try {
            // Send to R1 plugin with correlation metadata
            const payload = {
                message: request.message,
                useLLM: true,
                metadata: {
                    correlationId: request.correlationId,
                    type: request.type,
                    timestamp: Date.now()
                }
            };

            if (typeof PluginMessageHandler !== 'undefined') {
                PluginMessageHandler.postMessage(JSON.stringify(payload));
            } else {
                throw new Error('PluginMessageHandler not available');
            }
        } catch (error) {
            const pending = this.pendingRequests.get(request.correlationId);
            if (pending) {
                clearTimeout(pending.timeout);
                pending.reject(error);
                this.pendingRequests.delete(request.correlationId);
            }
        } finally {
            this.isProcessing = false;
            // Process next after delay
            setTimeout(() => this._processQueue(), 100);
        }
    }

    handleResponse(data) {
        console.log('LLM response received:', data);

        // Try to extract correlation ID from metadata or fallback to first pending request
        let correlationId = data.metadata?.correlationId;

        // Fallback: if no correlation ID, match to oldest pending request
        if (!correlationId && this.pendingRequests.size > 0) {
            correlationId = Array.from(this.pendingRequests.keys())[0];
            console.warn('No correlation ID in response, using oldest pending request');
        }

        if (!correlationId || !this.pendingRequests.has(correlationId)) {
            console.warn('Received LLM response without matching request:', data);
            return;
        }

        const pending = this.pendingRequests.get(correlationId);
        clearTimeout(pending.timeout);

        try {
            // Parse and validate response based on type
            const parsed = this._parseResponse(pending.type, data);
            pending.resolve(parsed);
        } catch (error) {
            pending.reject(error);
        } finally {
            this.pendingRequests.delete(correlationId);
        }
    }

    _parseResponse(type, data) {
        // Try to parse data.data first, then data.message
        let responseData;

        if (data.data) {
            try {
                responseData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
            } catch (e) {
                responseData = { raw: data.data };
            }
        } else if (data.message) {
            try {
                responseData = JSON.parse(data.message);
            } catch (e) {
                responseData = { raw: data.message };
            }
        } else {
            throw new Error('No data in LLM response');
        }

        // Type-specific validation
        switch (type) {
            case 'expense_extraction':
                return this._validateExpenseData(responseData);
            case 'insights':
                return this._validateInsightsData(responseData);
            case 'voice_parse':
                return this._validateExpenseData(responseData);
            default:
                return responseData;
        }
    }

    _validateExpenseData(data) {
        // Ensure required fields
        if (!data.amount && !data.raw) {
            throw new Error('Missing amount in expense data');
        }

        // Normalize amount
        let amount = data.amount;
        if (typeof amount === 'string') {
            amount = parseFloat(amount.replace(/[^0-9.]/g, ''));
        }

        return {
            amount: amount || 0,
            merchant: data.merchant || data.vendor || 'Unknown',
            date: data.date || new Date().toISOString().split('T')[0],
            category: data.category || 'Uncategorized',
            description: data.description || '',
            items: data.items || [],
            confidence: data.confidence || 0.8,
            raw: data.raw || null
        };
    }

    _validateInsightsData(data) {
        return {
            total: data.total || '$0',
            topCategory: data.topCategory || 'None',
            comparison: data.comparison || 'N/A',
            tip: data.tip || 'Keep tracking your expenses!',
            raw: data
        };
    }

    _buildExtractionPrompt(imageBase64, voiceContext) {
        let prompt = `Analyze this receipt image and extract expense details.`;

        if (voiceContext) {
            prompt += ` User said: "${voiceContext}"`;
        }

        prompt += `

Return ONLY valid JSON in this exact format:
{
  "amount": "12.50",
  "merchant": "Store Name",
  "date": "2025-10-08",
  "category": "Groceries",
  "items": ["item1", "item2", "item3"],
  "confidence": 0.9
}

Categories: Food & Dining, Groceries, Transportation, Shopping, Entertainment, Health, Bills, Other

Image data: ${imageBase64.substring(0, 100)}...`;

        return prompt;
    }

    _buildInsightsPrompt(expenses, timeRange) {
        const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const categories = {};

        expenses.forEach(exp => {
            categories[exp.category] = (categories[exp.category] || 0) + parseFloat(exp.amount);
        });

        const topCategory = Object.keys(categories).reduce((a, b) =>
            categories[a] > categories[b] ? a : b, Object.keys(categories)[0] || 'None'
        );

        return `Analyze these expenses for the past ${timeRange}:

Total spent: $${total.toFixed(2)}
Number of expenses: ${expenses.length}
Top category: ${topCategory} ($${categories[topCategory]?.toFixed(2) || 0})
All categories: ${JSON.stringify(categories)}

Recent expenses:
${expenses.slice(0, 10).map(e => `- $${e.amount} at ${e.merchant} (${e.category})`).join('\n')}

Provide insights and return ONLY valid JSON:
{
  "total": "$${total.toFixed(2)}",
  "topCategory": "${topCategory}",
  "comparison": "comparison to previous period",
  "tip": "actionable money-saving tip"
}`;
    }

    _buildVoiceParsePrompt(text) {
        return `Parse this spoken expense description: "${text}"

Extract the expense details and return ONLY valid JSON:
{
  "amount": "XX.XX",
  "merchant": "Name",
  "category": "Category",
  "date": "${new Date().toISOString().split('T')[0]}",
  "description": "brief description"
}

Categories: Food & Dining, Groceries, Transportation, Shopping, Entertainment, Health, Bills, Other

If amount or merchant is unclear, make best guess.`;
    }

    _generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Utility: get pending request count
    getPendingCount() {
        return this.pendingRequests.size;
    }

    // Clear all pending requests
    clearPending() {
        this.pendingRequests.forEach(pending => {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Request cleared'));
        });
        this.pendingRequests.clear();
        this.requestQueue = [];
    }
}

// Singleton instance
const llmService = new LLMService();
