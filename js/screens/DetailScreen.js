// DetailScreen.js - Single expense detail view
class DetailScreen {
    constructor() {
        this.expense = null;
        this.selectedOption = 0;
        this.options = ['back', 'edit', 'delete'];
    }

    onEnter(params) {
        this.expense = params.expense;
        this.selectedOption = 0;
    }

    render() {
        if (!this.expense) {
            return `
                <div class="detail-screen">
                    <div class="error-message">Expense not found</div>
                    <button onclick="router.back()">Go Back</button>
                </div>
            `;
        }

        return `
            <div class="detail-screen">
                <h2 class="detail-title">← Expense Details</h2>

                <div class="detail-content">
                    <div class="detail-section">
                        <div class="detail-merchant">${this.expense.merchant}</div>
                        <div class="detail-amount">$${parseFloat(this.expense.amount).toFixed(2)}</div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-row">
                            <span class="detail-label">Category:</span>
                            <span class="detail-value">${this.expense.category}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Date:</span>
                            <span class="detail-value">${this.formatDate(this.expense.date)}</span>
                        </div>
                        ${this.expense.description ? `
                            <div class="detail-row">
                                <span class="detail-label">Description:</span>
                                <span class="detail-value">${this.expense.description}</span>
                            </div>
                        ` : ''}
                    </div>

                    ${this.expense.items && this.expense.items.length > 0 ? `
                        <div class="detail-section">
                            <div class="detail-label">Items:</div>
                            <div class="detail-items">
                                ${this.expense.items.map(item => `<div>• ${item}</div>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="detail-options">
                    <div class="detail-option ${this.selectedOption === 0 ? 'selected' : ''}" data-index="0">
                        <span class="option-icon">${this.selectedOption === 0 ? '▶' : '○'}</span>
                        <span class="option-label">Back to list</span>
                    </div>
                    <div class="detail-option ${this.selectedOption === 1 ? 'selected' : ''}" data-index="1">
                        <span class="option-icon">${this.selectedOption === 1 ? '▶' : '○'}</span>
                        <span class="option-label">Edit</span>
                    </div>
                    <div class="detail-option ${this.selectedOption === 2 ? 'selected' : ''}" data-index="2">
                        <span class="option-icon">${this.selectedOption === 2 ? '▶' : '○'}</span>
                        <span class="option-label">Delete</span>
                    </div>
                </div>

                <div class="instructions">
                    <div>PTT: Select</div>
                    <div>Hold: Back</div>
                </div>
            </div>
        `;
    }

    onMount() {
        // Add click handlers for touch devices
        document.querySelectorAll('.detail-option').forEach((el, idx) => {
            el.addEventListener('click', () => {
                this.selectedOption = idx;
                this.handlePTTClick();
            });
        });
    }

    handleScrollUp() {
        this.selectedOption = Math.max(0, this.selectedOption - 1);
        this.updateSelection();
    }

    handleScrollDown() {
        this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
        this.updateSelection();
    }

    async handlePTTClick() {
        const action = this.options[this.selectedOption];
        console.log('Detail: Action', action);

        switch (action) {
            case 'back':
                router.back();
                break;
            case 'edit':
                router.navigate('edit', { expense: this.expense });
                break;
            case 'delete':
                await this.deleteExpense();
                break;
        }
    }

    handlePTTLongPress() {
        console.log('Detail: Long press - going back');
        router.back();
    }

    async deleteExpense() {
        if (!confirm(`Delete $${this.expense.amount} at ${this.expense.merchant}?`)) {
            return;
        }

        await ErrorBoundary.wrap(
            async () => {
                await expenseService.deleteExpense(this.expense.id);
                ErrorBoundary.showSuccessToast('Expense deleted');
                router.back();
            },
            (error) => {
                ErrorBoundary.showErrorToast('Failed to delete expense');
            },
            'delete_expense'
        );
    }

    updateSelection() {
        document.querySelectorAll('.detail-option').forEach((el, idx) => {
            if (idx === this.selectedOption) {
                el.classList.add('selected');
                el.querySelector('.option-icon').textContent = '▶';
            } else {
                el.classList.remove('selected');
                el.querySelector('.option-icon').textContent = '○';
            }
        });
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}
