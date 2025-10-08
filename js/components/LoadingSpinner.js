// LoadingSpinner.js - Loading state component
class LoadingSpinner {
    static render(message = 'Loading...') {
        return `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;
    }

    static renderInline(message = 'Processing...') {
        return `
            <div class="loading-inline">
                <span class="spinner-small"></span>
                <span>${message}</span>
            </div>
        `;
    }
}
