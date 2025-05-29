document.addEventListener('DOMContentLoaded', () => {
    const audioFileInput = document.getElementById('audioFile');
    const statusDiv = document.getElementById('status');
    const resultDiv = document.getElementById('result');
    const transcriptionText = document.getElementById('transcriptionText');
    const summaryText = document.getElementById('summaryText');

    audioFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show processing status
        statusDiv.textContent = 'Processing audio file...';
        statusDiv.className = 'status processing';
        resultDiv.className = 'result';

        const formData = new FormData();
        formData.append('audio', file);

        try {
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to process audio');
            }

            const data = await response.json();
            
            // Display results
            transcriptionText.textContent = data.transcription;
            summaryText.textContent = data.summary;
            resultDiv.className = 'result show';
            statusDiv.className = 'status';
        } catch (error) {
            console.error('Error:', error);
            statusDiv.textContent = 'Error processing audio file. Please try again.';
            statusDiv.className = 'status error';
        }
    });
}); 