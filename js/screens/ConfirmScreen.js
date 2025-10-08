// ConfirmScreen.js - Expense confirmation/edit
class ConfirmScreen {
    constructor() {
        this.expense = null;
        this.selectedOption = 0;
        this.options = ['confirm', 'edit', 'discard'];
        this.isSaving = false;
    }

    onEnter(params) {
        this.expense = params.expense;
        this.source = params.source || 'unknown';
        this.selectedOption = 0;
        this.isSaving = false;
    }

    render() {
        if (this.isSaving) {
            return `
                <div class="confirm-screen">
                    ${LoadingSpinner.render('Saving expense...')}
                </div>
            `;
        }

        if (!this.expense) {
            return `
                <div class="confirm-screen">
                    <div class="error-message">No expense data</div>
                    <button onclick="router.navigate('home')">Go Home</button>
                </div>
            `;
        }

        return `
            <div class="confirm-screen">
                <h2 class="confirm-title">Confirm Expense</h2>

                <div class="expense-preview">
                    <div class="expense-merchant">${this.expense.merchant}</div>
                    <div class="expense-amount">$${parseFloat(this.expense.amount).toFixed(2)}</div>
                    <div class="expense-category">${this.expense.category}</div>
                    <div class="expense-date">${this.formatDate(this.expense.date)}</div>
                    ${this.expense.items && this.expense.items.length > 0 ? `
                        <div class="expense-items">
                            ${this.expense.items.slice(0, 3).map(item => `<div>• ${item}</div>`).join('')}
                        </div>
                    ` : ''}
                </div>

                <div class="confirm-options">
                    <div class="confirm-option ${this.selectedOption === 0 ? 'selected' : ''}" data-index="0">
                        <span class="option-icon">${this.selectedOption === 0 ? '▶' : '○'}</span>
                        <span class="option-label">✓ Looks good</span>
                    </div>
                    <div class="confirm-option ${this.selectedOption === 1 ? 'selected' : ''}" data-index="1">
                        <span class="option-icon">${this.selectedOption === 1 ? '▶' : '○'}</span>
                        <span class="option-label">✎ Edit details</span>
                    </div>
                    <div class="confirm-option ${this.selectedOption === 2 ? 'selected' : ''}" data-index="2">
                        <span class="option-icon">${this.selectedOption === 2 ? '▶' : '○'}</span>
                        <span class="option-label">✗ Discard</span>
                    </div>
                </div>

                <div class="instructions">
                    <div>PTT: Confirm</div>
                    <div>Hold: Cancel</div>
                </div>
            </div>
        `;
    }

    onMount() {
        // Add click handlers for touch devices
        document.querySelectorAll('.confirm-option').forEach((el, idx) => {
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
        console.log('Confirm: Action', action);

        switch (action) {
            case 'confirm':
                await this.saveExpense();
                break;
            case 'edit':
                router.navigate('edit', { expense: this.expense });
                break;
            case 'discard':
                router.navigate('home');
                break;
        }
    }

    handlePTTLongPress() {
        console.log('Confirm: Long press - discarding');
        router.navigate('home');
    }

    async saveExpense() {
        await ErrorBoundary.wrap(
            async () => {
                this.isSaving = true;
                this.rerender();

                // Save expense
                const saved = await expenseService.createExpense(this.expense);
                console.log('Expense saved:', saved);

                // Show success
                ErrorBoundary.showSuccessToast(`Saved $${saved.amount} at ${saved.merchant}`);

                // Navigate home after brief delay
                setTimeout(() => {
                    router.navigate('home');
                }, 1500);
            },
            (error) => {
                this.isSaving = false;
                this.rerender();
                ErrorBoundary.showErrorToast('Failed to save expense');
            },
            'save_expense'
        );
    }

    updateSelection() {
        document.querySelectorAll('.confirm-option').forEach((el, idx) => {
            if (idx === this.selectedOption) {
                el.classList.add('selected');
                el.querySelector('.option-icon').textContent = '▶';
            } else {
                el.classList.remove('selected');
                el.querySelector('.option-icon').textContent = '○';
            }
        });
    }

    rerender() {
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = this.render();
            this.onMount();
        }
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }
}
