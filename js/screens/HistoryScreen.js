// HistoryScreen.js - Expense history with virtual scrolling
class HistoryScreen {
    constructor() {
        this.expenses = [];
        this.selectedIndex = 0;
        this.virtualList = null;
        this.pagination = { offset: 0, limit: 50 };
        this.hasMore = false;
    }

    async onEnter() {
        this.selectedIndex = 0;
        await this.loadExpenses();
    }

    async loadExpenses() {
        try {
            const result = await expenseService.getExpenses({}, this.pagination);
            this.expenses = result.expenses;
            this.hasMore = result.hasMore;
            console.log(`Loaded ${this.expenses.length} expenses`);
        } catch (error) {
            console.error('Error loading expenses:', error);
            this.expenses = [];
        }
    }

    render() {
        if (this.expenses.length === 0) {
            return `
                <div class="history-screen">
                    <h2 class="history-title">← History</h2>
                    <div class="empty-state">
                        <p>No expenses yet</p>
                        <p class="empty-hint">Scan a receipt to get started</p>
                    </div>
                    <div class="instructions">
                        <div>Hold: Back</div>
                    </div>
                </div>
            `;
        }

        const groupedExpenses = this.groupByDate(this.expenses);

        return `
            <div class="history-screen">
                <h2 class="history-title">← History</h2>
                <div class="expense-list" id="expenseList">
                    ${Object.keys(groupedExpenses).map(date => `
                        <div class="date-group">
                            <div class="date-header">${this.formatDateHeader(date)}</div>
                            ${groupedExpenses[date].map((expense, localIdx) => {
                                const globalIdx = this.expenses.indexOf(expense);
                                const isSelected = globalIdx === this.selectedIndex;
                                return this.renderExpenseItem(expense, isSelected, globalIdx);
                            }).join('')}
                        </div>
                    `).join('')}
                </div>
                <div class="history-footer">
                    <span>Total: ${this.expenses.length} expenses</span>
                    ${this.hasMore ? '<span>Scroll for more</span>' : ''}
                </div>
                <div class="instructions">
                    <div>PTT: View details</div>
                    <div>Hold: Back</div>
                </div>
            </div>
        `;
    }

    onMount() {
        // Add click handlers for touch devices
        document.querySelectorAll('.expense-item').forEach((el) => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.index);
                this.selectedIndex = idx;
                this.handlePTTClick();
            });
        });

        // Setup scroll loading
        const list = document.getElementById('expenseList');
        if (list) {
            list.addEventListener('scroll', () => {
                if (this.hasMore && list.scrollHeight - list.scrollTop <= list.clientHeight + 50) {
                    this.loadMore();
                }
            });
        }
    }

    async loadMore() {
        if (!this.hasMore) return;

        try {
            this.pagination.offset += this.pagination.limit;
            const result = await expenseService.getExpenses({}, this.pagination);

            this.expenses.push(...result.expenses);
            this.hasMore = result.hasMore;

            this.rerender();
        } catch (error) {
            console.error('Error loading more expenses:', error);
        }
    }

    renderExpenseItem(expense, isSelected, index) {
        return `
            <div class="expense-item ${isSelected ? 'selected' : ''}" data-index="${index}">
                <div class="expense-item-main">
                    <span class="expense-item-icon">${isSelected ? '▶' : '○'}</span>
                    <span class="expense-item-merchant">${expense.merchant}</span>
                    <span class="expense-item-amount">$${parseFloat(expense.amount).toFixed(2)}</span>
                </div>
                <div class="expense-item-category">${expense.category}</div>
            </div>
        `;
    }

    handleScrollUp() {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateSelection();
        this.ensureVisible();
    }

    handleScrollDown() {
        this.selectedIndex = Math.min(this.expenses.length - 1, this.selectedIndex + 1);
        this.updateSelection();
        this.ensureVisible();
    }

    handlePTTClick() {
        if (this.expenses.length === 0) return;

        const expense = this.expenses[this.selectedIndex];
        console.log('History: Viewing expense', expense);
        router.navigate('detail', { expense });
    }

    handlePTTLongPress() {
        console.log('History: Long press - going back');
        router.back();
    }

    updateSelection() {
        document.querySelectorAll('.expense-item').forEach((el, idx) => {
            const globalIdx = parseInt(el.dataset.index);
            if (globalIdx === this.selectedIndex) {
                el.classList.add('selected');
                el.querySelector('.expense-item-icon').textContent = '▶';
            } else {
                el.classList.remove('selected');
                el.querySelector('.expense-item-icon').textContent = '○';
            }
        });
    }

    ensureVisible() {
        const selectedEl = document.querySelector('.expense-item.selected');
        if (selectedEl) {
            selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    groupByDate(expenses) {
        const grouped = {};

        expenses.forEach(expense => {
            const date = expense.date;
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(expense);
        });

        return grouped;
    }

    formatDateHeader(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'TODAY';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'YESTERDAY';
        } else {
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
        }
    }

    rerender() {
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = this.render();
            this.onMount();
        }
    }
}
