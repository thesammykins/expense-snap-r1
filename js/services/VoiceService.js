// VoiceService.js - Audio capture and transcription for voice expense entry
class VoiceService {
    constructor() {
        this.stream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recognition = null;

        // Check for browser Speech Recognition API support
        this.hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

        console.log('[Voice] Service initialized, SpeechRecognition available:', this.hasSpeechRecognition);
    }

    // Start recording audio
    async startRecording() {
        console.log('[Voice] Starting audio recording...');

        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000  // Optimal for speech
                }
            });

            console.log('[Voice] Microphone access granted');

            // Initialize MediaRecorder
            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(this.stream);

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    console.log('[Voice] Audio chunk recorded, size:', event.data.size);
                }
            };

            this.mediaRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;

            console.log('[Voice] Recording started');
            return true;
        } catch (error) {
            console.error('[Voice] Failed to start recording:', error);
            throw new Error('Microphone access denied or unavailable');
        }
    }

    // Stop recording and return transcribed text
    async stopRecording() {
        console.log('[Voice] Stopping audio recording...');

        if (!this.isRecording || !this.mediaRecorder) {
            throw new Error('Recording not started');
        }

        return new Promise((resolve, reject) => {
            this.mediaRecorder.onstop = async () => {
                console.log('[Voice] Recording stopped, processing audio...');

                // Stop audio stream
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }

                this.isRecording = false;

                try {
                    // Create audio blob
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    console.log('[Voice] Audio blob created, size:', audioBlob.size);

                    // Try to transcribe
                    const transcription = await this.transcribeAudio(audioBlob);
                    console.log('[Voice] Transcription result:', transcription);

                    resolve(transcription);
                } catch (error) {
                    console.error('[Voice] Transcription error:', error);
                    reject(error);
                }
            };

            this.mediaRecorder.stop();
        });
    }

    // Transcribe audio using available methods
    async transcribeAudio(audioBlob) {
        console.log('[Voice] Starting transcription...');

        // Method 1: Try browser SpeechRecognition API (if available)
        if (this.hasSpeechRecognition) {
            try {
                console.log('[Voice] Attempting browser SpeechRecognition...');
                const text = await this.transcribeWithSpeechRecognition();
                if (text && text.trim()) {
                    return text;
                }
            } catch (error) {
                console.warn('[Voice] SpeechRecognition failed, trying fallback:', error);
            }
        }

        // Method 2: Fallback - Use R1 LLM to transcribe
        // Note: The R1 LLM may not directly support audio transcription,
        // but we can try sending a description and asking for help
        console.log('[Voice] Falling back to manual entry or LLM assistance');

        // In a production app, you would:
        // - Send audio to a transcription service (Google Speech-to-Text, Whisper API, etc.)
        // - Or provide a manual fallback input method

        // For now, provide a helpful error message
        throw new Error('Voice transcription requires browser SpeechRecognition API or external transcription service. Please enable microphone permissions or use manual entry.');
    }

    // Transcribe using Web Speech API (continuous recognition during recording)
    async transcribeWithSpeechRecognition() {
        return new Promise((resolve, reject) => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (!SpeechRecognition) {
                reject(new Error('SpeechRecognition not supported'));
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.continuous = false;  // Single utterance
            recognition.interimResults = false;

            let finalTranscript = '';

            recognition.onresult = (event) => {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                        console.log('[Voice] SpeechRecognition result:', transcript);
                    }
                }
            };

            recognition.onend = () => {
                console.log('[Voice] SpeechRecognition ended, transcript:', finalTranscript);
                if (finalTranscript.trim()) {
                    resolve(finalTranscript.trim());
                } else {
                    reject(new Error('No speech detected'));
                }
            };

            recognition.onerror = (event) => {
                console.error('[Voice] SpeechRecognition error:', event.error);
                reject(new Error(`Speech recognition error: ${event.error}`));
            };

            // Start recognition
            recognition.start();
            console.log('[Voice] SpeechRecognition started');
        });
    }

    // Alternative: Start continuous speech recognition (better for R1 PTT button)
    async startContinuousRecognition() {
        console.log('[Voice] Starting continuous speech recognition...');

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            throw new Error('SpeechRecognition not supported in this browser');
        }

        return new Promise((resolve, reject) => {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'en-US';
            this.recognition.continuous = true;  // Continuous recognition
            this.recognition.interimResults = true;  // Get interim results

            let finalTranscript = '';
            let interimTranscript = '';

            this.recognition.onresult = (event) => {
                interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                        console.log('[Voice] Final:', transcript);
                    } else {
                        interimTranscript += transcript;
                        console.log('[Voice] Interim:', transcript);
                    }
                }

                // Store current transcription state
                this.currentTranscript = {
                    final: finalTranscript,
                    interim: interimTranscript
                };
            };

            this.recognition.onstart = () => {
                console.log('[Voice] Continuous recognition started');
                this.isRecording = true;
            };

            this.recognition.onerror = (event) => {
                console.error('[Voice] Recognition error:', event.error);
                if (event.error === 'no-speech') {
                    console.warn('[Voice] No speech detected');
                } else {
                    reject(new Error(`Speech recognition error: ${event.error}`));
                }
            };

            // Start recognition
            this.recognition.start();
            this.currentTranscript = { final: '', interim: '' };

            // Return immediately - transcription happens continuously
            resolve(true);
        });
    }

    // Stop continuous recognition and return transcript
    async stopContinuousRecognition() {
        console.log('[Voice] Stopping continuous recognition...');

        return new Promise((resolve, reject) => {
            if (!this.recognition) {
                reject(new Error('Recognition not started'));
                return;
            }

            this.recognition.onend = () => {
                console.log('[Voice] Recognition stopped');
                const transcript = this.currentTranscript?.final?.trim() || '';

                if (transcript) {
                    console.log('[Voice] Final transcript:', transcript);
                    resolve(transcript);
                } else {
                    reject(new Error('No speech detected'));
                }

                this.recognition = null;
                this.isRecording = false;
            };

            this.recognition.stop();
        });
    }

    // Cancel recording
    cancelRecording() {
        console.log('[Voice] Cancelling recording...');

        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }

        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.audioChunks = [];
        this.isRecording = false;
    }

    // Check if microphone is available
    async isMicrophoneAvailable() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'audioinput');
        } catch (error) {
            console.error('[Voice] Failed to enumerate devices:', error);
            return false;
        }
    }

    // Get service status
    getStatus() {
        return {
            recording: this.isRecording,
            hasSpeechRecognition: this.hasSpeechRecognition,
            hasStream: this.stream !== null
        };
    }
}

// Singleton instance
const voiceService = new VoiceService();
