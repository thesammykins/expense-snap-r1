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
            this.isRecording = false;
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            this.rerender();
        } else {
            router.back();
        }
    }

    startRecording() {
        console.log('Voice: Starting recording');
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        this.rerender();
    }

    async stopRecording() {
        console.log('Voice: Stopping recording');

        this.isRecording = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        // In a real R1 environment, the voice transcription would be handled
        // by the R1 system. For now, we'll simulate with a prompt to the LLM.

        await ErrorBoundary.wrap(
            async () => {
                this.isProcessing = true;
                this.rerender();

                // Note: In the actual R1 environment, you would get transcribed text
                // from the device's voice recognition system. This is a placeholder
                // that uses LLM to parse a simulated voice input.

                // For testing without R1 hardware, we'll show an error
                if (typeof PluginMessageHandler === 'undefined') {
                    throw new Error('Voice recording requires R1 hardware');
                }

                // Send request for voice transcription + parsing
                // The R1 system should provide transcribed text
                const transcribedText = await this.getVoiceTranscription();

                if (!transcribedText || transcribedText.trim() === '') {
                    throw new Error('No voice input detected');
                }

                // Parse the transcribed text to extract expense data
                const expense = await llmService.parseVoiceExpense(transcribedText);

                // Navigate to confirmation
                router.navigate('confirm', {
                    expense,
                    source: 'voice'
                });
            },
            (error) => {
                this.isProcessing = false;
                this.rerender();
                ErrorBoundary.showErrorToast(error.message || 'Failed to process voice input');
            },
            'voice_entry'
        );
    }

    async getVoiceTranscription() {
        // In the real R1 environment, this would interface with the device's
        // voice recognition system. For now, this is a placeholder.

        // The R1 device should automatically transcribe PTT voice input
        // and make it available through a callback or event.

        // For testing purposes, return a simulated transcription
        return new Promise((resolve, reject) => {
            // This would be replaced with actual R1 voice API
            setTimeout(() => {
                reject(new Error('Voice transcription not yet implemented for browser testing'));
            }, 1000);
        });
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
