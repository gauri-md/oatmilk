document.addEventListener('DOMContentLoaded', () => {
    const recordButton = document.getElementById('recordButton');
    const recordingStatus = document.getElementById('recordingStatus');
    const recordingTime = document.getElementById('recordingTime');
    const status = document.getElementById('status');
    const result = document.getElementById('result');
    const transcription = document.getElementById('transcription');
    const summary = document.getElementById('summary');

    let mediaRecorder;
    let audioChunks = [];
    let recordingStartTime;
    let recordingTimer;
    let isProcessing = false;

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (!isProcessing) {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
                    await processAudio(audioBlob);
                }
            };

            // Request data every second
            mediaRecorder.start(1000);
            recordingStartTime = Date.now();
            updateRecordingTime();
            recordingTimer = setInterval(updateRecordingTime, 1000);

            recordButton.textContent = 'Stop Recording';
            recordButton.classList.add('recording');
            recordingStatus.classList.remove('hidden');
            recordingStatus.classList.add('recording');
            result.classList.add('hidden');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            status.textContent = 'Error accessing microphone. Please ensure you have granted microphone permissions.';
            status.classList.remove('hidden');
            status.classList.add('error');
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            clearInterval(recordingTimer);
            
            recordButton.textContent = 'Start Recording';
            recordButton.classList.remove('recording');
            recordingStatus.classList.add('hidden');
            recordingStatus.classList.remove('recording');
        }
    }

    function updateRecordingTime() {
        const elapsedTime = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
        const seconds = (elapsedTime % 60).toString().padStart(2, '0');
        recordingTime.textContent = `${minutes}:${seconds}`;
    }

    async function processAudio(audioBlob) {
        if (isProcessing) return;
        isProcessing = true;

        try {
            status.textContent = 'Processing audio...';
            status.classList.remove('hidden', 'error');
            status.classList.add('processing');

            // Validate blob size
            const MAX_SIZE = 25 * 1024 * 1024; // 25MB
            if (audioBlob.size > MAX_SIZE) {
                throw new Error('Audio file is too large. Maximum size is 25MB.');
            }

            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            let retryCount = 0;
            const maxRetries = 3;
            const baseDelay = 1000; // 1 second

            while (retryCount < maxRetries) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

                    const response = await fetch('/api/transcribe', {
                        method: 'POST',
                        body: formData,
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.details || errorData.error || `Server error: ${response.status}`);
                    }

                    const data = await response.json();
                    transcription.textContent = data.transcription;
                    summary.textContent = data.summary;
                    result.classList.remove('hidden');
                    status.classList.add('hidden');
                    isProcessing = false;
                    return;
                } catch (error) {
                    console.error(`Attempt ${retryCount + 1} failed:`, error);
                    
                    if (error.name === 'AbortError') {
                        throw new Error('Request timed out. Please try again.');
                    }

                    retryCount++;
                    if (retryCount < maxRetries) {
                        const delay = Math.min(baseDelay * Math.pow(2, retryCount), 5000);
                        status.textContent = `Processing failed, retrying in ${delay/1000} seconds...`;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            throw new Error('Failed to process audio after multiple attempts. Please try again.');
        } catch (error) {
            console.error('Final error:', error);
            status.textContent = error.message || 'Error processing audio. Please try again.';
            status.classList.remove('processing');
            status.classList.add('error');
        } finally {
            isProcessing = false;
        }
    }

    recordButton.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecording();
        } else {
            startRecording();
        }
    });
}); 