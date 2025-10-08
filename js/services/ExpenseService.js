// ExpenseService.js - Business logic for expense operations
class ExpenseService {
    constructor() {
        this.categories = [
            'Food & Dining',
            'Groceries',
            'Transportation',
            'Shopping',
            'Entertainment',
            'Health',
            'Bills & Utilities',
            'Other'
        ];
    }

    // Create new expense
    async createExpense(expenseData) {
        // Validate and normalize
        const expense = this._normalizeExpense(expenseData);

        // Save to storage
        const saved = await storageService.saveExpense(expense);

        // Sync to journal
        journalService.syncExpense(saved);

        return saved;
    }

    // Update expense
    async updateExpense(id, updates) {
        const normalized = this._normalizeExpense(updates);
        return await storageService.updateExpense(id, normalized);
    }

    // Delete expense
    async deleteExpense(id) {
        return await storageService.deleteExpense(id);
    }

    // Get single expense
    async getExpense(id) {
        return await storageService.getExpense(id);
    }

    // Get expenses with filters
    async getExpenses(filters = {}, pagination = { offset: 0, limit: 50 }) {
        return await storageService.queryExpenses(filters, pagination);
    }

    // Get today's expenses
    async getTodayExpenses() {
        return await storageService.getTodayExpenses();
    }

    // Get today's total
    async getTodayTotal() {
        return await storageService.getTodayTotal();
    }

    // Get this week's expenses
    async getWeekExpenses() {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Sunday
        weekStart.setHours(0, 0, 0, 0);

        return await storageService.queryExpenses({
            dateRange: {
                start: weekStart.toISOString().split('T')[0],
                end: now.toISOString().split('T')[0]
            }
        });
    }

    // Get this month's expenses
    async getMonthExpenses() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        return await storageService.queryExpenses({
            dateRange: {
                start: monthStart.toISOString().split('T')[0],
                end: now.toISOString().split('T')[0]
            }
        });
    }

    // Search expenses
    async searchExpenses(query, limit = 20) {
        return await storageService.searchExpenses(query, limit);
    }

    // Get budget
    async getBudget() {
        return await storageService.getBudget();
    }

    // Set budget
    async setBudget(budget) {
        return await storageService.setBudget(budget);
    }

    // Get budget status for today
    async getDailyBudgetStatus() {
        const budget = await this.getBudget();
        const total = await this.getTodayTotal();

        return {
            spent: total,
            limit: budget.daily,
            percentage: (total / budget.daily) * 100,
            remaining: budget.daily - total,
            status: this._getBudgetStatus(total, budget.daily)
        };
    }

    // Get budget status for week
    async getWeeklyBudgetStatus() {
        const budget = await this.getBudget();
        const result = await this.getWeekExpenses();
        const total = result.expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

        return {
            spent: total,
            limit: budget.weekly,
            percentage: (total / budget.weekly) * 100,
            remaining: budget.weekly - total,
            status: this._getBudgetStatus(total, budget.weekly)
        };
    }

    // Get spending by category
    async getSpendingByCategory(dateRange = null) {
        let expenses;

        if (dateRange) {
            const result = await storageService.queryExpenses({ dateRange });
            expenses = result.expenses;
        } else {
            const result = await this.getMonthExpenses();
            expenses = result.expenses;
        }

        const byCategory = {};

        expenses.forEach(exp => {
            const category = exp.category || 'Other';
            byCategory[category] = (byCategory[category] || 0) + parseFloat(exp.amount);
        });

        return byCategory;
    }

    // Get available categories
    getCategories() {
        return [...this.categories];
    }

    // Normalize and validate expense data
    _normalizeExpense(data) {
        // Parse amount
        let amount = data.amount;
        if (typeof amount === 'string') {
            amount = parseFloat(amount.replace(/[^0-9.]/g, ''));
        }

        if (isNaN(amount) || amount < 0) {
            throw new Error('Invalid amount');
        }

        // Validate category
        const category = data.category || 'Other';
        if (!this.categories.includes(category)) {
            console.warn(`Unknown category: ${category}, using Other`);
        }

        // Normalize date
        let date = data.date;
        if (!date) {
            date = new Date().toISOString().split('T')[0];
        } else if (date instanceof Date) {
            date = date.toISOString().split('T')[0];
        }

        return {
            ...data,
            amount: amount.toFixed(2),
            merchant: data.merchant || 'Unknown',
            category: this.categories.includes(category) ? category : 'Other',
            date,
            description: data.description || '',
            items: data.items || []
        };
    }

    _getBudgetStatus(spent, limit) {
        const percentage = (spent / limit) * 100;

        if (percentage < 70) return 'good';
        if (percentage < 90) return 'warning';
        return 'over';
    }
}

// Singleton instance
const expenseService = new ExpenseService();
