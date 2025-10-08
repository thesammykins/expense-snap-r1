// app.js - Application bootstrap and hardware event routing

// Global router instance
let router;

// Hardware event state
let longPressTimer = null;
const LONG_PRESS_DURATION = 500; // ms

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Expense Snap - Initializing...');

    // Check if running as R1 plugin
    const isR1Plugin = typeof PluginMessageHandler !== 'undefined';
    console.log('Running as R1 Creation:', isR1Plugin);

    // Initialize screens
    const screens = new Map();
    screens.set('home', new HomeScreen());
    screens.set('camera', new CameraScreen());
    screens.set('voice', new VoiceScreen());
    screens.set('confirm', new ConfirmScreen());
    screens.set('history', new HistoryScreen());
    screens.set('detail', new DetailScreen());
    screens.set('insights', new InsightsScreen());
    screens.set('budget', new BudgetScreen());
    screens.set('onboarding', new OnboardingScreen());

    // Initialize router
    router = new Router(appState, screens);

    // Setup hardware event listeners
    initializeHardwareListeners();

    // Load initial budget if needed
    await initializeBudget();

    // Check if onboarding is complete
    const onboardingComplete = await storageService.getPreference('onboarding_completed');

    // Navigate to appropriate screen
    if (onboardingComplete) {
        router.navigate('home');
    } else {
        router.navigate('onboarding');
    }

    console.log('Expense Snap - Ready!');
});

// Initialize hardware event listeners
function initializeHardwareListeners() {
    console.log('Setting up hardware listeners...');

    // PTT Button Events
    window.addEventListener('sideClick', handlePTTClick);
    window.addEventListener('longPressStart', handleLongPressStart);
    window.addEventListener('longPressEnd', handleLongPressEnd);

    // Scroll Wheel Events
    window.addEventListener('scrollUp', handleScrollUp);
    window.addEventListener('scrollDown', handleScrollDown);

    console.log('Hardware listeners ready');
}

// PTT Click Handler
function handlePTTClick() {
    console.log('Hardware: PTT Click');

    const currentScreenName = router.getCurrentScreen();
    const screen = router.screens.get(currentScreenName);

    if (screen && screen.handlePTTClick) {
        screen.handlePTTClick();
    }
}

// PTT Long Press Handlers
function handleLongPressStart() {
    console.log('Hardware: Long Press Start');

    longPressTimer = setTimeout(() => {
        handleLongPress();
    }, LONG_PRESS_DURATION);
}

function handleLongPressEnd() {
    console.log('Hardware: Long Press End');

    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

function handleLongPress() {
    console.log('Hardware: Long Press Detected');

    const currentScreenName = router.getCurrentScreen();
    const screen = router.screens.get(currentScreenName);

    if (screen && screen.handlePTTLongPress) {
        screen.handlePTTLongPress();
    } else {
        // Default behavior: go back
        if (currentScreenName !== 'home') {
            router.back();
        }
    }
}

// Scroll Up Handler
function handleScrollUp() {
    console.log('Hardware: Scroll Up');

    const currentScreenName = router.getCurrentScreen();
    const screen = router.screens.get(currentScreenName);

    if (screen && screen.handleScrollUp) {
        screen.handleScrollUp();
    }
}

// Scroll Down Handler
function handleScrollDown() {
    console.log('Hardware: Scroll Down');

    const currentScreenName = router.getCurrentScreen();
    const screen = router.screens.get(currentScreenName);

    if (screen && screen.handleScrollDown) {
        screen.handleScrollDown();
    }
}

// Initialize budget on first run
async function initializeBudget() {
    try {
        const existingBudget = await storageService.getBudget();

        // If no budget exists, prompt user to set one
        if (!existingBudget || existingBudget.daily === 0) {
            console.log('No budget found, setting defaults');

            const budget = {
                daily: 200,
                weekly: 1400,
                monthly: 6000
            };

            await storageService.setBudget(budget);
            appState.update('budget', budget);
        } else {
            appState.update('budget', existingBudget);
        }
    } catch (error) {
        console.error('Error initializing budget:', error);
    }
}

// Update app border color based on budget status
function updateAppBorderColor(status) {
    const app = document.getElementById('app');
    if (!app) return;

    const colors = {
        good: '#00ff00',
        warning: '#ffaa00',
        over: '#ff0000'
    };

    app.style.borderColor = colors[status] || '#00ff00';
}

// Subscribe to budget status changes
eventBus.on('expense:created', async () => {
    const budgetStatus = await expenseService.getDailyBudgetStatus();
    updateAppBorderColor(budgetStatus.status);
});

// Global error handler for debugging
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Expose app instance globally for debugging
window.expenseApp = {
    router,
    appState,
    eventBus,
    services: {
        storage: storageService,
        llm: llmService,
        journal: journalService,
        camera: cameraService,
        expense: expenseService
    },
    version: '1.0.0'
};

console.log('Expense Snap app object available at window.expenseApp');
