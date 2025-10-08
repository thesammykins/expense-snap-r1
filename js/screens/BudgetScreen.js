// BudgetScreen.js - Budget settings management
class BudgetScreen {
    constructor() {
        this.selectedField = 0;
        this.fields = ['daily', 'weekly', 'monthly'];
        this.budget = {
            daily: 200,
            weekly: 1400,
            monthly: 6000
        };
        this.isSaving = false;
    }

    async onEnter() {
        this.selectedField = 0;
        this.isSaving = false;

        // Load current budget
        try {
            this.budget = await storageService.getBudget();
        } catch (error) {
            console.error('Error loading budget:', error);
        }
    }

    render() {
        if (this.isSaving) {
            return `
                <div class="budget-screen">
                    ${LoadingSpinner.render('Saving budget...')}
                </div>
            `;
        }

        return `
            <div class="budget-screen">
                <h2 class="budget-title">Budget Settings</h2>

                <div class="budget-fields">
                    <div class="budget-field ${this.selectedField === 0 ? 'selected' : ''}" data-index="0">
                        <div class="budget-field-header">
                            <span class="field-icon">${this.selectedField === 0 ? '▶' : '○'}</span>
                            <span class="field-label">Daily Budget</span>
                        </div>
                        <div class="budget-field-value">
                            <button class="budget-btn budget-btn-dec" data-field="daily" data-action="dec">-</button>
                            <span class="budget-amount">$${this.budget.daily.toFixed(2)}</span>
                            <button class="budget-btn budget-btn-inc" data-field="daily" data-action="inc">+</button>
                        </div>
                        <div class="budget-field-hint">$${(this.budget.daily / 3).toFixed(2)} per meal</div>
                    </div>

                    <div class="budget-field ${this.selectedField === 1 ? 'selected' : ''}" data-index="1">
                        <div class="budget-field-header">
                            <span class="field-icon">${this.selectedField === 1 ? '▶' : '○'}</span>
                            <span class="field-label">Weekly Budget</span>
                        </div>
                        <div class="budget-field-value">
                            <button class="budget-btn budget-btn-dec" data-field="weekly" data-action="dec">-</button>
                            <span class="budget-amount">$${this.budget.weekly.toFixed(2)}</span>
                            <button class="budget-btn budget-btn-inc" data-field="weekly" data-action="inc">+</button>
                        </div>
                        <div class="budget-field-hint">${(this.budget.daily * 7 === this.budget.weekly) ? 'Auto-synced with daily' : 'Custom amount'}</div>
                    </div>

                    <div class="budget-field ${this.selectedField === 2 ? 'selected' : ''}" data-index="2">
                        <div class="budget-field-header">
                            <span class="field-icon">${this.selectedField === 2 ? '▶' : '○'}</span>
                            <span class="field-label">Monthly Budget</span>
                        </div>
                        <div class="budget-field-value">
                            <button class="budget-btn budget-btn-dec" data-field="monthly" data-action="dec">-</button>
                            <span class="budget-amount">$${this.budget.monthly.toFixed(2)}</span>
                            <button class="budget-btn budget-btn-inc" data-field="monthly" data-action="inc">+</button>
                        </div>
                        <div class="budget-field-hint">${(this.budget.daily * 30 === this.budget.monthly) ? 'Auto-synced with daily' : 'Custom amount'}</div>
                    </div>
                </div>

                <div class="budget-actions">
                    <button class="budget-save-btn" id="saveBudgetBtn">
                        💾 Save Changes
                    </button>
                </div>

                <div class="instructions">
                    <div>Scroll: Select</div>
                    <div>PTT: Adjust</div>
                </div>
            </div>
        `;
    }

    onMount() {
        // Add click handlers for touch devices
        document.querySelectorAll('.budget-field').forEach((el, idx) => {
            el.addEventListener('click', () => {
                this.selectedField = idx;
                this.rerender();
            });
        });

        // Add button click handlers
        document.querySelectorAll('.budget-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const field = btn.dataset.field;
                const action = btn.dataset.action;
                this.adjustBudget(field, action === 'inc' ? 1 : -1);
            });
        });

        // Save button
        const saveBtn = document.getElementById('saveBudgetBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveBudget());
        }
    }

    handleScrollUp() {
        this.selectedField = Math.max(0, this.selectedField - 1);
        this.updateSelection();
    }

    handleScrollDown() {
        this.selectedField = Math.min(this.fields.length - 1, this.selectedField + 1);
        this.updateSelection();
    }

    handlePTTClick() {
        // PTT adjusts the selected field by $10
        const field = this.fields[this.selectedField];
        this.adjustBudget(field, 1);
    }

    handlePTTLongPress() {
        console.log('Budget: Long press - going back');
        router.back();
    }

    adjustBudget(field, direction) {
        // Determine increment based on field type
        let increment = 0;
        if (field === 'daily') {
            increment = 10; // $10 increments
        } else if (field === 'weekly') {
            increment = 50; // $50 increments
        } else if (field === 'monthly') {
            increment = 100; // $100 increments
        }

        const change = increment * direction;
        this.budget[field] = Math.max(0, this.budget[field] + change);

        this.rerender();
    }

    async saveBudget() {
        await ErrorBoundary.wrap(
            async () => {
                this.isSaving = true;
                this.rerender();

                // Save budget
                await storageService.setBudget(this.budget);
                appState.update('budget', this.budget);

                console.log('Budget saved:', this.budget);

                // Show success
                ErrorBoundary.showSuccessToast('Budget updated successfully');

                // Go back to home after brief delay
                setTimeout(() => {
                    router.back();
                }, 1500);
            },
            (error) => {
                this.isSaving = false;
                this.rerender();
                ErrorBoundary.showErrorToast('Failed to save budget');
            },
            'save_budget'
        );
    }

    updateSelection() {
        document.querySelectorAll('.budget-field').forEach((el, idx) => {
            if (idx === this.selectedField) {
                el.classList.add('selected');
                el.querySelector('.field-icon').textContent = '▶';
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                el.classList.remove('selected');
                el.querySelector('.field-icon').textContent = '○';
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
}
