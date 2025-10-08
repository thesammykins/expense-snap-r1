// Router.js - Navigation with lifecycle hooks
class Router {
    constructor(appState, screens) {
        this.appState = appState;
        this.screens = screens;
        this.history = [];
    }

    navigate(screenName, params = {}) {
        console.log(`Navigating to: ${screenName}`, params);

        const currentScreenName = this.appState.get('currentScreen');
        const currentScreen = this.screens.get(currentScreenName);

        // Call onExit hook for current screen
        if (currentScreen && currentScreen.onExit) {
            try {
                currentScreen.onExit();
            } catch (error) {
                console.error(`Error in onExit for ${currentScreenName}:`, error);
            }
        }

        // Update state
        this.appState.update('currentScreen', screenName);
        this.history.push({ screen: screenName, params, timestamp: Date.now() });

        // Get next screen
        const nextScreen = this.screens.get(screenName);
        if (!nextScreen) {
            console.error(`Screen not found: ${screenName}`);
            return;
        }

        // Call onEnter hook
        if (nextScreen.onEnter) {
            try {
                nextScreen.onEnter(params);
            } catch (error) {
                console.error(`Error in onEnter for ${screenName}:`, error);
            }
        }

        // Render screen
        this.render(screenName, nextScreen, params);
    }

    back() {
        if (this.history.length > 1) {
            this.history.pop();
            const prev = this.history[this.history.length - 1];

            // Navigate without adding to history again
            const temp = this.history.slice(0, -1);
            this.navigate(prev.screen, prev.params);
            this.history = temp;
            this.history.push(prev);
        } else {
            // Default back to home
            this.navigate('home');
        }
    }

    render(screenName, screen, params) {
        const content = document.getElementById('content');
        if (!content) {
            console.error('Content element not found');
            return;
        }

        // Clear current content
        content.innerHTML = '';

        // Render new screen
        if (screen.render) {
            try {
                const html = screen.render(params);
                content.innerHTML = html;

                // Call onMount hook after rendering
                if (screen.onMount) {
                    // Use timeout to ensure DOM is ready
                    setTimeout(() => {
                        try {
                            screen.onMount(params);
                        } catch (error) {
                            console.error(`Error in onMount for ${screenName}:`, error);
                        }
                    }, 0);
                }
            } catch (error) {
                console.error(`Error rendering ${screenName}:`, error);
                content.innerHTML = `
                    <div class="error-screen">
                        <h2>Error</h2>
                        <p>${error.message}</p>
                        <button onclick="router.navigate('home')">Go Home</button>
                    </div>
                `;
            }
        }
    }

    getCurrentScreen() {
        return this.appState.get('currentScreen');
    }

    getHistory() {
        return [...this.history];
    }
}
