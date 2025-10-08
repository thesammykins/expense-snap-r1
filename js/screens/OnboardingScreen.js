// OnboardingScreen.js - First-time user onboarding
class OnboardingScreen {
    constructor() {
        this.currentStep = 0;
        this.steps = [
            {
                icon: '🎡',
                title: 'Scroll Wheel',
                description: 'Rotate the scroll wheel to navigate between options',
                hint: 'Try scrolling up and down'
            },
            {
                icon: '🔘',
                title: 'PTT Button',
                description: 'Quick press to select or confirm',
                hint: 'Single click = confirm action'
            },
            {
                icon: '⏸️',
                title: 'Long Press',
                description: 'Hold PTT button to cancel or go back',
                hint: 'Long press = back/cancel'
            },
            {
                icon: '✨',
                title: 'Ready to Go!',
                description: 'Track expenses with camera scanning or voice entry',
                hint: 'Press PTT to start tracking'
            }
        ];
    }

    onEnter() {
        this.currentStep = 0;
    }

    render() {
        const step = this.steps[this.currentStep];
        const progress = ((this.currentStep + 1) / this.steps.length) * 100;

        return `
            <div class="onboarding-screen">
                <div class="onboarding-progress">
                    <div class="onboarding-progress-bar" style="width: ${progress}%"></div>
                </div>

                <div class="onboarding-content">
                    <div class="onboarding-icon">${step.icon}</div>
                    <h2 class="onboarding-title">${step.title}</h2>
                    <p class="onboarding-description">${step.description}</p>
                    <p class="onboarding-hint">${step.hint}</p>

                    <div class="onboarding-dots">
                        ${this.steps.map((_, idx) => `
                            <span class="onboarding-dot ${idx === this.currentStep ? 'active' : ''}"></span>
                        `).join('')}
                    </div>
                </div>

                <div class="onboarding-actions">
                    ${this.currentStep < this.steps.length - 1 ? `
                        <button class="onboarding-btn onboarding-btn-skip" id="skipBtn">
                            Skip Tutorial
                        </button>
                    ` : ''}
                    <button class="onboarding-btn onboarding-btn-next" id="nextBtn">
                        ${this.currentStep < this.steps.length - 1 ? 'Next' : 'Get Started'}
                    </button>
                </div>

                <div class="instructions">
                    <div>PTT: ${this.currentStep < this.steps.length - 1 ? 'Next' : 'Start'}</div>
                    <div>Hold: Skip</div>
                </div>
            </div>
        `;
    }

    onMount() {
        // Add click handler for next button
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }

        // Add click handler for skip button
        const skipBtn = document.getElementById('skipBtn');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.completeOnboarding());
        }
    }

    handleScrollUp() {
        // Go to previous step
        if (this.currentStep > 0) {
            this.currentStep--;
            this.rerender();
        }
    }

    handleScrollDown() {
        // Go to next step
        this.nextStep();
    }

    handlePTTClick() {
        // Advance to next step or complete
        this.nextStep();
    }

    handlePTTLongPress() {
        console.log('Onboarding: Long press - skipping');
        this.completeOnboarding();
    }

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.rerender();
        } else {
            this.completeOnboarding();
        }
    }

    async completeOnboarding() {
        // Mark onboarding as complete
        await storageService.setPreference('onboarding_completed', true);
        console.log('Onboarding completed');

        // Navigate to home
        router.navigate('home');
    }

    rerender() {
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = this.render();
            this.onMount();
        }
    }
}
