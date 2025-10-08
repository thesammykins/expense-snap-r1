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
        if (this.isProcessing) {
            console.log('Camera: Already processing, ignoring click');
            return;
        }

        console.log('Camera: PTT clicked - capturing receipt');

        await ErrorBoundary.wrap(
            async () => {
                this.isProcessing = true;
                this.rerender();

                // Capture photo
                console.log('Camera: Capturing photo...');
                const imageBase64 = await cameraService.capturePhoto();
                this.capturedImage = imageBase64;

                console.log('Camera: Photo captured, extracting text with OCR...');

                // Extract text using OCR
                let ocrResult;
                try {
                    ocrResult = await ocrService.extractReceiptText(imageBase64);
                    console.log('Camera: OCR complete, confidence:', ocrResult.confidence + '%');
                    console.log('Camera: OCR text preview:', ocrResult.cleanedText.substring(0, 100) + '...');
                } catch (ocrError) {
                    console.warn('Camera: OCR failed, falling back to image-based LLM:', ocrError);
                    // Fallback to direct image if OCR fails
                    ocrResult = null;
                }

                // Parse extracted text with LLM (or use image if OCR failed)
                console.log('Camera: Parsing with LLM...');
                let expense;

                if (ocrResult && ocrResult.cleanedText) {
                    // Use OCR text for parsing (more reliable)
                    expense = await llmService.parseReceiptText(ocrResult.cleanedText);
                } else {
                    // Fallback to image-based extraction
                    console.log('Camera: Using image-based LLM extraction');
                    expense = await llmService.extractExpenseData(imageBase64);
                }

                console.log('Camera: Expense extraction complete:', expense);

                // Navigate to confirmation
                router.navigate('confirm', {
                    expense,
                    source: 'camera',
                    image: imageBase64,
                    ocrText: ocrResult?.cleanedText || null
                });
            },
            (error) => {
                this.isProcessing = false;
                this.rerender();

                console.error('Camera: Error processing receipt:', error);

                const errorMessage = error.message || 'Failed to process receipt';
                ErrorBoundary.showErrorToast(errorMessage);

                // Offer fallback based on error type
                setTimeout(() => {
                    if (error.message && error.message.includes('R1 hardware required')) {
                        // LLM not available
                        if (confirm('LLM service unavailable. Use manual entry?')) {
                            router.navigate('home');
                        }
                    } else if (error.message && error.message.includes('OCR')) {
                        // OCR specific error
                        if (confirm('OCR failed. Try again or use manual entry?')) {
                            // Reset for retry
                            this.isProcessing = false;
                            this.capturedImage = null;
                            this.rerender();
                        } else {
                            router.back();
                        }
                    } else {
                        // General error - offer retry or manual entry
                        const retry = confirm('Receipt processing failed. Try again?');
                        if (!retry) {
                            router.back();
                        } else {
                            // Reset for retry
                            this.isProcessing = false;
                            this.capturedImage = null;
                            this.rerender();
                        }
                    }
                }, 500);
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
