// CameraScreen.js - Receipt capture flow
class CameraScreen {
    constructor() {
        this.isProcessing = false;
        this.capturedImage = null;
    }

    async onEnter() {
        this.isProcessing = false;
        this.capturedImage = null;

        try {
            await cameraService.startCamera();
        } catch (error) {
            ErrorBoundary.showErrorToast('Camera not available');
            console.error('Camera error:', error);
        }
    }

    async onExit() {
        cameraService.stopCamera();
    }

    render() {
        if (this.isProcessing) {
            return `
                <div class="camera-screen">
                    ${LoadingSpinner.render('Analyzing receipt...')}
                </div>
            `;
        }

        return `
            <div class="camera-screen">
                <video id="cameraPreview" class="camera-preview" autoplay playsinline></video>
                <div class="camera-overlay">
                    <div class="camera-instructions">
                        <p>Align receipt</p>
                        <p class="camera-hint">Clear photo = better results</p>
                    </div>
                    <div class="camera-controls">
                        <button class="camera-capture-btn" id="captureBtn">
                            📷 Capture
                        </button>
                    </div>
                </div>
                <div class="instructions">
                    <div>PTT: Capture</div>
                    <div>Hold: Cancel</div>
                </div>
            </div>
        `;
    }

    onMount() {
        const video = document.getElementById('cameraPreview');
        if (video && cameraService.stream) {
            cameraService.attachToVideo(video);
        }

        // Add click handler for touch devices
        const captureBtn = document.getElementById('captureBtn');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => this.handlePTTClick());
        }
    }

    async handlePTTClick() {
        if (this.isProcessing) return;

        await ErrorBoundary.wrap(
            async () => {
                this.isProcessing = true;
                this.rerender();

                // Capture photo
                const imageBase64 = await cameraService.capturePhoto();
                this.capturedImage = imageBase64;

                // Extract expense data using LLM
                const expense = await llmService.extractExpenseData(imageBase64);

                // Navigate to confirmation
                router.navigate('confirm', {
                    expense,
                    source: 'camera',
                    image: imageBase64
                });
            },
            (error) => {
                this.isProcessing = false;
                this.rerender();
                ErrorBoundary.showErrorToast('Failed to process receipt');
                // Offer fallback
                setTimeout(() => {
                    if (confirm('Try manual entry instead?')) {
                        router.navigate('manual');
                    }
                }, 1000);
            },
            'camera_capture'
        );
    }

    handlePTTLongPress() {
        console.log('Camera: Long press - going back');
        router.back();
    }

    rerender() {
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = this.render();
            this.onMount();
        }
    }
}
