// HomeScreen.js - Main dashboard with menu
class HomeScreen {
    constructor() {
        this.selectedOption = 0;
        this.options = [
            { id: 'camera', label: '📷 Scan Receipt' },
            { id: 'voice', label: '🎤 Voice Entry' },
            { id: 'history', label: '📋 View History' },
            { id: 'insights', label: '📊 Insights' }
        ];
        this.todayTotal = 0;
        this.budget = { daily: 200 };
    }

    async onEnter() {
        this.selectedOption = 0;

        // Load data
        await this.loadData();

        // Subscribe to expense updates
        this.unsubscribeExpense = eventBus.on('expense:created', () => this.loadData());
    }

    onExit() {
        if (this.unsubscribeExpense) {
            this.unsubscribeExpense();
        }
    }

    async loadData() {
        try {
            this.todayTotal = await expenseService.getTodayTotal();
            this.budget = await expenseService.getBudget();

            // Re-render if already mounted
            if (this.isMounted) {
                this.render();
            }
        } catch (error) {
            console.error('Error loading home data:', error);
        }
    }

    render() {
        const budgetStatus = this.todayTotal < this.budget.daily * 0.7 ? 'good' :
                           this.todayTotal < this.budget.daily * 0.9 ? 'warning' : 'over';

        return `
            <div class="home-screen">
                <div class="balance-section">
                    <h2 class="balance-label">TODAY</h2>
                    <div class="balance-amount">$${this.todayTotal.toFixed(2)}</div>
                </div>

                ${ProgressBar.render(this.todayTotal, this.budget.daily)}

                <div class="menu-options">
                    ${this.options.map((opt, idx) => `
                        <div class="menu-option ${idx === this.selectedOption ? 'selected' : ''}" data-index="${idx}">
                            <span class="option-icon">${idx === this.selectedOption ? '▶' : '○'}</span>
                            <span class="option-label">${opt.label}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="instructions">
                    <div>Scroll: Navigate</div>
                    <div>PTT: Select</div>
                </div>
            </div>
        `;
    }

    onMount() {
        this.isMounted = true;

        // Add click handlers for touch devices
        document.querySelectorAll('.menu-option').forEach((el, idx) => {
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

    handlePTTClick() {
        const selected = this.options[this.selectedOption];
        console.log('Home: Navigating to', selected.id);

        // Navigate to selected screen
        router.navigate(selected.id);
    }

    updateSelection() {
        document.querySelectorAll('.menu-option').forEach((el, idx) => {
            if (idx === this.selectedOption) {
                el.classList.add('selected');
                el.querySelector('.option-icon').textContent = '▶';
            } else {
                el.classList.remove('selected');
                el.querySelector('.option-icon').textContent = '○';
            }
        });
    }
}
