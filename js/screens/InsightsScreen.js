// InsightsScreen.js - Weekly insights with LLM summaries
class InsightsScreen {
    constructor() {
        this.insights = null;
        this.isLoading = true;
        this.weekExpenses = [];
        this.selectedOption = 0;
        this.options = ['hear_summary', 'view_details', 'back'];
    }

    async onEnter() {
        this.selectedOption = 0;
        this.isLoading = true;
        await this.loadInsights();
    }

    async loadInsights() {
        try {
            // Get week's expenses
            const result = await expenseService.getWeekExpenses();
            this.weekExpenses = result.expenses;

            const total = this.weekExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

            // Get spending by category
            const byCategory = {};
            this.weekExpenses.forEach(exp => {
                byCategory[exp.category] = (byCategory[exp.category] || 0) + parseFloat(exp.amount);
            });

            const topCategory = Object.keys(byCategory).length > 0
                ? Object.keys(byCategory).reduce((a, b) => byCategory[a] > byCategory[b] ? a : b)
                : 'None';

            // Generate insights using LLM
            try {
                this.insights = await llmService.generateInsights(this.weekExpenses, 'week');
            } catch (error) {
                console.error('LLM insights error:', error);
                // Fallback to basic insights
                this.insights = {
                    total: `$${total.toFixed(2)}`,
                    topCategory: `${topCategory} ($${byCategory[topCategory]?.toFixed(2) || 0})`,
                    comparison: 'N/A',
                    tip: 'Keep tracking your expenses regularly!'
                };
            }

            this.isLoading = false;
            this.rerender();
        } catch (error) {
            console.error('Error loading insights:', error);
            this.isLoading = false;
            this.insights = null;
            this.rerender();
        }
    }

    render() {
        if (this.isLoading) {
            return `
                <div class="insights-screen">
                    ${LoadingSpinner.render('Analyzing expenses...')}
                </div>
            `;
        }

        if (!this.insights) {
            return `
                <div class="insights-screen">
                    <h2 class="insights-title">← Insights</h2>
                    <div class="empty-state">
                        <p>Not enough data yet</p>
                        <p class="empty-hint">Log more expenses to see insights</p>
                    </div>
                    <div class="instructions">
                        <div>Hold: Back</div>
                    </div>
                </div>
            `;
        }

        const budget = appState.get('budget') || { weekly: 1400 };
        const weekTotal = parseFloat(this.insights.total.replace('$', ''));

        return `
            <div class="insights-screen">
                <h2 class="insights-title">← Weekly Insights</h2>

                <div class="insights-content">
                    <div class="insights-section">
                        <h3>This Week</h3>
                        <div class="insights-total">${this.insights.total}</div>
                        ${ProgressBar.render(weekTotal, budget.weekly)}
                    </div>

                    <div class="insights-section">
                        <div class="insights-row">
                            <span class="insights-label">Top Category:</span>
                            <span class="insights-value">${this.insights.topCategory}</span>
                        </div>
                        <div class="insights-row">
                            <span class="insights-label">vs Last Week:</span>
                            <span class="insights-value">${this.insights.comparison}</span>
                        </div>
                    </div>

                    <div class="insights-section">
                        <h4>💡 Tip</h4>
                        <p class="insights-tip">${this.insights.tip}</p>
                    </div>
                </div>

                <div class="insights-options">
                    <div class="insights-option ${this.selectedOption === 0 ? 'selected' : ''}" data-index="0">
                        <span class="option-icon">${this.selectedOption === 0 ? '▶' : '○'}</span>
                        <span class="option-label">🔊 Hear summary</span>
                    </div>
                    <div class="insights-option ${this.selectedOption === 1 ? 'selected' : ''}" data-index="1">
                        <span class="option-icon">${this.selectedOption === 1 ? '▶' : '○'}</span>
                        <span class="option-label">View expenses</span>
                    </div>
                    <div class="insights-option ${this.selectedOption === 2 ? 'selected' : ''}" data-index="2">
                        <span class="option-icon">${this.selectedOption === 2 ? '▶' : '○'}</span>
                        <span class="option-label">Back</span>
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
        document.querySelectorAll('.insights-option').forEach((el, idx) => {
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
        console.log('Insights: Action', action);

        switch (action) {
            case 'hear_summary':
                await this.speakSummary();
                break;
            case 'view_details':
                router.navigate('history');
                break;
            case 'back':
                router.back();
                break;
        }
    }

    handlePTTLongPress() {
        console.log('Insights: Long press - going back');
        router.back();
    }

    async speakSummary() {
        const summary = `This week you spent ${this.insights.total}. Your top category was ${this.insights.topCategory}. ${this.insights.tip}`;

        // Use R1 TTS
        if (typeof PluginMessageHandler !== 'undefined') {
            try {
                PluginMessageHandler.postMessage(JSON.stringify({
                    message: summary,
                    useLLM: true,
                    wantsR1Response: true,
                    wantsJournalEntry: false
                }));
                ErrorBoundary.showSuccessToast('Speaking...');
            } catch (error) {
                console.error('TTS error:', error);
                ErrorBoundary.showErrorToast('Could not speak summary');
            }
        } else {
            alert(summary);
        }
    }

    updateSelection() {
        document.querySelectorAll('.insights-option').forEach((el, idx) => {
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
}
