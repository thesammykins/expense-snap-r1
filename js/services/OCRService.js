// OCRService.js - Tesseract.js OCR for receipt text extraction
class OCRService {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.isInitializing = false;
        this.initializationPromise = null;

        console.log('[OCR] Service created');
    }

    // Initialize Tesseract worker (call once at app startup)
    async initialize() {
        if (this.isInitialized) {
            console.log('[OCR] Already initialized');
            return true;
        }

        if (this.isInitializing) {
            console.log('[OCR] Initialization in progress, waiting...');
            return this.initializationPromise;
        }

        this.isInitializing = true;
        console.log('[OCR] Initializing Tesseract worker...');

        this.initializationPromise = (async () => {
            try {
                // Check if Tesseract is available
                if (typeof Tesseract === 'undefined') {
                    throw new Error('Tesseract.js not loaded. Check CDN script tag in index.html');
                }

                // Create worker with English language
                // For receipts, 'eng' (English) is usually sufficient
                this.worker = await Tesseract.createWorker('eng', 1, {
                    logger: (m) => {
                        // Optional: log progress
                        if (m.status === 'recognizing text') {
                            console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
                        }
                    }
                });

                this.isInitialized = true;
                this.isInitializing = false;
                console.log('[OCR] Worker initialized successfully');
                return true;
            } catch (error) {
                this.isInitializing = false;
                console.error('[OCR] Initialization failed:', error);
                throw error;
            }
        })();

        return this.initializationPromise;
    }

    // Extract text from image using OCR
    async extractText(imageBase64) {
        console.log('[OCR] Starting text extraction...');

        try {
            // Initialize if not already done
            if (!this.isInitialized) {
                console.log('[OCR] Not initialized, initializing now...');
                await this.initialize();
            }

            if (!this.worker) {
                throw new Error('OCR worker not available');
            }

            // Perform OCR
            const startTime = Date.now();
            console.log('[OCR] Running Tesseract recognition...');

            const { data } = await this.worker.recognize(imageBase64);

            const duration = Date.now() - startTime;
            console.log(`[OCR] Recognition complete in ${duration}ms`);
            console.log(`[OCR] Confidence: ${data.confidence}%`);
            console.log('[OCR] Extracted text:', data.text);

            return {
                text: data.text,
                confidence: data.confidence,
                words: data.words,
                lines: data.lines,
                paragraphs: data.paragraphs
            };
        } catch (error) {
            console.error('[OCR] Text extraction failed:', error);
            throw error;
        }
    }

    // Extract text optimized for receipts
    async extractReceiptText(imageBase64) {
        console.log('[OCR] Extracting receipt text...');

        const result = await this.extractText(imageBase64);

        // Clean up OCR text for better parsing
        const cleanedText = this.cleanReceiptText(result.text);

        console.log('[OCR] Cleaned receipt text:', cleanedText);

        return {
            rawText: result.text,
            cleanedText: cleanedText,
            confidence: result.confidence,
            lines: result.lines
        };
    }

    // Clean and normalize OCR text for receipt parsing
    cleanReceiptText(text) {
        if (!text) return '';

        // Remove excessive whitespace
        let cleaned = text.replace(/\s+/g, ' ');

        // Normalize line breaks
        cleaned = cleaned.replace(/\n\s*\n/g, '\n');

        // Remove leading/trailing whitespace
        cleaned = cleaned.trim();

        // Common OCR corrections for receipts
        cleaned = cleaned
            // Fix common OCR mistakes
            .replace(/[O0]/g, (match) => {
                // Context-aware replacement (simplified)
                return match;
            })
            // Normalize currency symbols
            .replace(/\$/g, '$')
            // Normalize dates
            .replace(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/g, '$1/$2/$3');

        return cleaned;
    }

    // Terminate worker (cleanup)
    async terminate() {
        console.log('[OCR] Terminating worker...');

        if (this.worker) {
            try {
                await this.worker.terminate();
                this.worker = null;
                this.isInitialized = false;
                console.log('[OCR] Worker terminated');
            } catch (error) {
                console.error('[OCR] Error terminating worker:', error);
            }
        }
    }

    // Reinitialize worker
    async reinitialize() {
        console.log('[OCR] Reinitializing...');
        await this.terminate();
        return this.initialize();
    }

    // Check if OCR is available
    isAvailable() {
        return typeof Tesseract !== 'undefined';
    }

    // Get service status
    getStatus() {
        return {
            available: this.isAvailable(),
            initialized: this.isInitialized,
            initializing: this.isInitializing,
            hasWorker: this.worker !== null
        };
    }

    // Process receipt image with preprocessing (optional enhancement)
    async preprocessImage(imageBase64) {
        // Optional: Add image preprocessing here
        // - Convert to grayscale
        // - Increase contrast
        // - Apply filters
        // For now, return as-is
        return imageBase64;
    }

    // Extract specific fields from receipt (helper method)
    parseReceiptFields(ocrResult) {
        const text = ocrResult.cleanedText || ocrResult.rawText;
        const lines = text.split('\n');

        // Simple extraction patterns (can be enhanced)
        const patterns = {
            total: /total[:\s]*\$?(\d+\.?\d{0,2})/i,
            subtotal: /subtotal[:\s]*\$?(\d+\.?\d{0,2})/i,
            tax: /tax[:\s]*\$?(\d+\.?\d{0,2})/i,
            date: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
            // Merchant name is usually first few lines
        };

        const extracted = {};

        // Try to extract fields
        for (const [field, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match) {
                extracted[field] = match[1] || match[0];
            }
        }

        // Merchant is often the first non-empty line
        if (lines.length > 0) {
            extracted.merchant = lines[0].trim();
        }

        console.log('[OCR] Extracted fields:', extracted);

        return extracted;
    }
}

// Singleton instance
const ocrService = new OCRService();
