// VoiceScreen.js - Voice-based expense entry
class VoiceScreen {
    constructor() {
        this.isRecording = false;
        this.isProcessing = false;
        this.recordingStartTime = null;
    }

    onEnter() {
        this.isRecording = false;
        this.isProcessing = false;
        this.recordingStartTime = null;
    }

    render() {
        if (this.isProcessing) {
            return `
                <div class="voice-screen">
                    ${LoadingSpinner.render('Processing voice input...')}
                </div>
            `;
        }

        return `
            <div class="voice-screen">
                <div class="voice-container">
                    <div class="voice-icon ${this.isRecording ? 'recording' : ''}">
                        ${this.isRecording ? '🔴' : '🎤'}
                    </div>

                    <h2 class="voice-title">
                        ${this.isRecording ? 'Recording...' : 'Voice Entry'}
                    </h2>

                    <div class="voice-instructions">
                        ${this.isRecording ? `
                            <p>Speak your expense details:</p>
                            <p class="voice-hint">"$12.50 at Starbucks for coffee"</p>
                            <p class="voice-hint">"Twenty dollars at grocery store"</p>
                        ` : `
                            <p>Press PTT button to start recording</p>
                            <p class="voice-hint">Say the amount, merchant, and category</p>
                        `}
                    </div>

                    ${this.isRecording ? `
                        <div class="recording-timer" id="recordingTimer">
                            Recording: 0s
                        </div>
                    ` : ''}
                </div>

                <div class="instructions">
                    <div>${this.isRecording ? 'PTT: Stop' : 'PTT: Record'}</div>
                    <div>Hold: Cancel</div>
                </div>
            </div>
        `;
    }

    onMount() {
        if (this.isRecording) {
            this.startTimer();
        }
    }

    onExit() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    handlePTTClick() {
        if (this.isProcessing) return;

        if (this.isRecording) {
            // Stop recording and process
            this.stopRecording();
        } else {
            // Start recording
            this.startRecording();
        }
    }

    handlePTTLongPress() {
        console.log('Voice: Long press - cancelling');

        if (this.isRecording) {
            // Cancel the recording
            this.isRecording = false;
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }

            // Cancel voice service recording
            voiceService.cancelRecording();

            this.rerender();
        } else {
            router.back();
        }
    }

    async startRecording() {
        console.log('Voice: Starting recording');

        try {
            // Start speech recognition using VoiceService
            await voiceService.startContinuousRecognition();

            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.rerender();
        } catch (error) {
            console.error('Voice: Failed to start recording:', error);
            ErrorBoundary.showErrorToast('Microphone access required for voice entry');

            // Offer fallback
            setTimeout(() => {
                if (confirm('Would you like to use manual entry instead?')) {
                    router.navigate('home');
                }
            }, 500);
        }
    }

    async stopRecording() {
        console.log('Voice: Stopping recording');

        this.isRecording = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        await ErrorBoundary.wrap(
            async () => {
                this.isProcessing = true;
                this.rerender();

                // Get transcribed text from VoiceService
                const transcribedText = await voiceService.stopContinuousRecognition();

                console.log('Voice: Transcribed text:', transcribedText);

                if (!transcribedText || transcribedText.trim() === '') {
                    throw new Error('No speech detected. Please try again.');
                }

                // Parse the transcribed text to extract expense data using LLM
                const expense = await llmService.parseVoiceExpense(transcribedText);

                // Navigate to confirmation
                router.navigate('confirm', {
                    expense,
                    source: 'voice',
                    transcription: transcribedText
                });
            },
            (error) => {
                this.isProcessing = false;
                this.rerender();

                const errorMessage = error.message || 'Failed to process voice input';
                console.error('Voice: Error processing voice input:', errorMessage);
                ErrorBoundary.showErrorToast(errorMessage);

                // Offer to retry or go back
                setTimeout(() => {
                    if (confirm('Voice entry failed. Try again?')) {
                        // Reset state for retry
                        this.isProcessing = false;
                        this.isRecording = false;
                        this.rerender();
                    } else {
                        router.back();
                    }
                }, 500);
            },
            'voice_entry'
        );
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            const timerEl = document.getElementById('recordingTimer');
            if (timerEl) {
                timerEl.textContent = `Recording: ${elapsed}s`;
            }
        }, 1000);
    }

    rerender() {
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = this.render();
            this.onMount();
        }
    }
}
