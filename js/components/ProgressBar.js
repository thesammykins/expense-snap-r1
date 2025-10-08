// ProgressBar.js - Budget progress visualization
class ProgressBar {
    static render(spent, limit) {
        const percentage = Math.min((spent / limit) * 100, 100);
        const status = percentage < 70 ? 'good' : percentage < 90 ? 'warning' : 'over';

        return `
            <div class="progress-bar-container">
                <div class="progress-bar-label">
                    <span>$${limit.toFixed(0)} budget</span>
                    <span class="budget-percentage ${status}">${percentage.toFixed(0)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill progress-${status}" style="width: ${percentage}%"></div>
                </div>
                <div class="progress-bar-text">
                    <span>Spent: $${spent.toFixed(2)}</span>
                    <span>Remaining: $${Math.max(0, limit - spent).toFixed(2)}</span>
                </div>
            </div>
        `;
    }
}
