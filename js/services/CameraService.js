// CameraService.js - Camera capture and image processing
class CameraService {
    constructor() {
        this.stream = null;
        this.videoElement = null;
    }

    // Start camera stream
    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera
                    width: { ideal: 240 },
                    height: { ideal: 282 }
                }
            });

            return this.stream;
        } catch (error) {
            console.error('Camera access error:', error);
            throw new Error('Could not access camera');
        }
    }

    // Stop camera stream
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.videoElement && this.videoElement.srcObject) {
            this.videoElement.srcObject = null;
        }
    }

    // Attach stream to video element
    attachToVideo(videoElement) {
        if (!this.stream) {
            throw new Error('Camera not started');
        }

        this.videoElement = videoElement;
        videoElement.srcObject = this.stream;
        videoElement.play();
    }

    // Capture photo from video stream
    async capturePhoto() {
        if (!this.videoElement) {
            throw new Error('Video element not attached');
        }

        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 282;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.videoElement, 0, 0, 240, 282);

        // Convert to base64 JPEG (70% quality for size)
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.7);

        return imageBase64;
    }

    // Capture without video element (direct from stream)
    async capturePhotoDirectly() {
        if (!this.stream) {
            await this.startCamera();
        }

        const video = document.createElement('video');
        video.srcObject = this.stream;
        video.play();

        // Wait for video to be ready
        await new Promise(resolve => {
            video.onloadedmetadata = resolve;
        });

        // Give it a moment to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 282;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 240, 282);

        const imageBase64 = canvas.toDataURL('image/jpeg', 0.7);

        // Clean up
        video.pause();
        video.srcObject = null;

        return imageBase64;
    }

    // Check if camera is available
    async isCameraAvailable() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'videoinput');
        } catch (error) {
            return false;
        }
    }

    // Get camera status
    getStatus() {
        return {
            active: this.stream !== null,
            attached: this.videoElement !== null
        };
    }
}

// Singleton instance
const cameraService = new CameraService();
