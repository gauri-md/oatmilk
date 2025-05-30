document.addEventListener('DOMContentLoaded', () => {
    // Simple markdown to HTML converter
    function markdownToHtml(markdown) {
        if (!markdown) return '';
        
        // Process the markdown in steps to avoid conflicts
        let html = markdown
            // Headers
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Bullet points
            .replace(/(?:^|\n)(\s*[•-]\s+[^\n]*)/g, '<li>$1</li>')
            // Line breaks
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, ' ');
        
        return html;
    }

    // DOM Elements
    const recordButton = document.getElementById('recordButton');
    const recordingStatus = document.getElementById('recordingStatus');
    const recordingTime = document.getElementById('recordingTime');
    const status = document.getElementById('status');
    const result = document.getElementById('result');
    const transcription = document.getElementById('transcription');
    const summary = document.getElementById('summary');
    const recentSummaries = document.getElementById('recentSummaries');
    const homeScreen = document.getElementById('homeScreen');
    const detailScreen = document.getElementById('detailScreen');
    const showTranscriptionBtn = document.querySelector('.show-transcription');

    // Screen Management
    const backButton = detailScreen?.querySelector('.back-button');

    // Modal Elements
    const modal = document.getElementById('reminderModal');
    const closeBtn = modal?.querySelector('.modal-close');
    const cancelBtn = modal?.querySelector('.cancel');
    const form = document.getElementById('reminderForm');

    let mediaRecorder;
    let audioChunks = [];
    let recordingStartTime;
    let recordingTimer;
    let isProcessing = false;

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    if (backButton) {
        backButton.addEventListener('click', () => {
            showScreen('homeScreen');
        });
    }

    // Function to show the reminder modal
    function showReminderModal(info) {
        const titleInput = /** @type {HTMLInputElement} */ (document.getElementById('title'));
        const typeSelect = /** @type {HTMLSelectElement} */ (document.getElementById('type'));
        const notesInput = /** @type {HTMLInputElement} */ (document.getElementById('notes'));

        if (!titleInput || !typeSelect || !notesInput || !modal) return;

        if (info.includes('Medications:')) {
            titleInput.value = info.replace('Medications:', '').trim();
            typeSelect.value = 'Medicine';
        } else {
            titleInput.value = 'Appointment';
            typeSelect.value = 'Appointment';
        }
        notesInput.value = info;
        
        if (modal instanceof HTMLDialogElement) {
            modal.showModal();
        }
    }

    // Function to save summary
    async function saveSummary(transcription, summary) {
        try {
            const response = await fetch('/api/summaries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transcription,
                    summary,
                    date: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save summary');
            }

            const data = await response.json();
            if (recentSummaries) {
                // Refresh the summaries list
                recentSummaries.innerHTML = '';
                const summaryItem = document.createElement('div');
                summaryItem.className = 'summary-preview';
                summaryItem.innerHTML = `
                    <div class="preview-header">
                        <time class="preview-time">${new Date().toLocaleTimeString()}</time>
                    </div>
                    <div class="preview-content">${summary}</div>
                `;
                recentSummaries.appendChild(summaryItem);
            }
            return data;
        } catch (error) {
            console.error('Error saving summary:', error);
            throw error;
        }
    }

    // Function to parse markdown summary into sections
    function parseSummary(markdown) {
        const sections = {
            summary: '',
            keyPoints: [],
            actionItems: [],
            medicalTerms: []
        };

        // Split markdown into lines
        const lines = markdown.split('\n');
        let currentSection = '';

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('### ')) {
                currentSection = trimmedLine.substring(4).toLowerCase();
            } else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
                const point = trimmedLine.substring(1).trim();
                
                switch (currentSection) {
                    case 'key points':
                        sections.keyPoints.push(point);
                        break;
                    case 'action items':
                        sections.actionItems.push(point);
                        break;
                    case 'medical information':
                        if (point.startsWith('Medications:') || point.startsWith('Conditions:') || point.startsWith('Vitals/Metrics:')) {
                            const [term, ...definition] = point.split(':');
                            sections.medicalTerms.push({
                                term: term.trim(),
                                definition: definition.join(':').trim()
                            });
                        }
                        break;
                }
            } else if (trimmedLine && !trimmedLine.startsWith('#')) {
                // Add non-header, non-empty lines to summary
                sections.summary += trimmedLine + '\n';
            }
        }

        // Clean up summary
        sections.summary = sections.summary.trim();

        return sections;
    }

    // Event Listeners
    if (closeBtn && modal instanceof HTMLDialogElement) {
        closeBtn.addEventListener('click', () => modal.close());
    }
    if (cancelBtn && modal instanceof HTMLDialogElement) {
        cancelBtn.addEventListener('click', () => modal.close());
    }
    if (modal instanceof HTMLDialogElement) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.close();
        });
    }

    if (form instanceof HTMLFormElement) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const titleInput = /** @type {HTMLInputElement} */ (document.getElementById('title'));
            const typeSelect = /** @type {HTMLSelectElement} */ (document.getElementById('type'));
            const datetimeInput = /** @type {HTMLInputElement} */ (document.getElementById('datetime'));
            const notesInput = /** @type {HTMLInputElement} */ (document.getElementById('notes'));
            const frequencySelect = /** @type {HTMLSelectElement} */ (document.getElementById('frequency'));

            if (!titleInput || !typeSelect || !datetimeInput || !notesInput || !frequencySelect) return;

            const reminder = {
                title: titleInput.value,
                type: typeSelect.value,
                datetime: datetimeInput.value,
                notes: notesInput.value,
                frequency: frequencySelect.value
            };

            // Save reminder (you'll need to implement this)
            console.log('Saving reminder:', reminder);
            if (modal instanceof HTMLDialogElement) {
                modal.close();
            }
            form.reset();
        });
    }

    // Recording functionality
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

            mediaRecorder.start(1000);
            recordingStartTime = Date.now();
            updateRecordingTime();
            recordingTimer = setInterval(updateRecordingTime, 1000);

            if (recordButton) recordButton.textContent = 'Stop Recording';
            if (recordButton) recordButton.classList.add('recording');
            if (recordingStatus) recordingStatus.classList.remove('hidden');
            if (recordingStatus) recordingStatus.classList.add('recording');
            if (result) result.classList.add('hidden');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            if (status) {
                status.textContent = 'Error accessing microphone. Please ensure you have granted microphone permissions.';
                status.classList.remove('hidden');
                status.classList.add('error');
            }
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            clearInterval(recordingTimer);
            
            if (recordButton) {
                recordButton.textContent = 'Start Recording';
                recordButton.classList.remove('recording');
            }
            if (recordingStatus) {
                recordingStatus.classList.add('hidden');
                recordingStatus.classList.remove('recording');
            }
        }
    }

    function updateRecordingTime() {
        if (!recordingTime) return;
        const elapsedTime = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
        const seconds = (elapsedTime % 60).toString().padStart(2, '0');
        recordingTime.textContent = `${minutes}:${seconds}`;
    }

    async function processAudio(audioBlob) {
        if (isProcessing) return;
        isProcessing = true;

        try {
            if (status) {
                status.textContent = 'Processing audio...';
                status.classList.remove('hidden', 'error');
                status.classList.add('processing');
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
                    console.log('Received data from server:', data);
                    
                    // Hide status
                    if (status) {
                        status.classList.add('hidden');
                        status.classList.remove('processing');
                    }

                    // Save the summary
                    console.log('Saving summary with data:', data);
                    const savedSummary = await saveSummary(data.transcription, data.summary);
                    console.log('Summary saved:', savedSummary);
                    
                    // Load all summaries to update the list in the background
                    await loadSummaries();
                    
                    // Show the detail view for the new summary
                    console.log('Loading summary details for ID:', savedSummary.data.id);
                    const summaryResponse = await fetch(`/api/summaries/${savedSummary.data.id}`);
                    if (summaryResponse.ok) {
                        const summaryData = await summaryResponse.json();
                        console.log('Summary detail data:', summaryData);
                        showSummaryDetail(summaryData.data);
                    }
                    
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
                        if (status) {
                            status.textContent = `Processing failed, retrying in ${delay/1000} seconds...`;
                        }
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            throw new Error('Failed to process audio after multiple attempts. Please try again.');
        } catch (error) {
            console.error('Final error:', error);
            if (status) {
                status.textContent = error.message || 'Error processing audio. Please try again.';
                status.classList.remove('processing');
                status.classList.add('error');
            }
        } finally {
            isProcessing = false;
        }
    }

    if (recordButton) {
        recordButton.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                stopRecording();
            } else {
                startRecording();
            }
        });
    }

    // Load summaries when page loads
    loadSummaries();

    // Function to load summaries
    async function loadSummaries() {
        try {
            const response = await fetch('/api/summaries');
            if (response.ok) {
                const summariesData = await response.json();
                if (recentSummaries) {
                    recentSummaries.innerHTML = '';
                    if (summariesData.data.length === 0) {
                        const emptyMessage = document.createElement('div');
                        emptyMessage.className = 'empty-message';
                        emptyMessage.textContent = 'No summaries yet. Record your first medical conversation to get started.';
                        recentSummaries.appendChild(emptyMessage);
                    } else {
                        summariesData.data.forEach(summary => {
                            const summaryItem = document.createElement('div');
                            summaryItem.className = 'summary-preview';
                            summaryItem.innerHTML = `
                                <div class="preview-header">
                                    <h3 class="preview-title">${summary.title || 'Untitled Summary'}</h3>
                                    <time class="preview-time">${new Date(summary.date).toLocaleTimeString()}</time>
                                </div>
                                <div class="preview-content">${summary.summary.substring(0, 200)}...</div>
                            `;

                            // Make the entire card clickable
                            summaryItem.style.cursor = 'pointer';
                            summaryItem.addEventListener('click', async () => {
                                try {
                                    const detailResponse = await fetch(`/api/summaries/${summary.id}`);
                                    if (!detailResponse.ok) {
                                        throw new Error('Failed to load summary details');
                                    }
                                    const detailData = await detailResponse.json();
                                    showSummaryDetail(detailData.data);
                                } catch (error) {
                                    console.error('Error loading summary details:', error);
                                    alert('Failed to load summary details. Please try again.');
                                }
                            });

                            recentSummaries.appendChild(summaryItem);
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error loading summaries:', error);
            if (recentSummaries) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.textContent = 'Failed to load summaries. Please try again later.';
                recentSummaries.appendChild(errorMessage);
            }
        }
    }

    // Function to show summary detail
    function showSummaryDetail(summaryData) {
        console.log('Showing summary detail:', summaryData);
        
        // Hide home screen and show detail screen
        if (homeScreen) homeScreen.classList.remove('active');
        if (detailScreen) {
            detailScreen.classList.add('active');
            
            // Update detail screen content
            const detailTitle = detailScreen.querySelector('#summaryTitle');
            const detailDate = detailScreen.querySelector('#summaryDate');
            const detailTranscription = detailScreen.querySelector('#transcription');
            const detailSummary = detailScreen.querySelector('#summary');
            
            if (detailTitle) detailTitle.textContent = summaryData.title || 'Untitled Summary';
            if (detailDate) detailDate.textContent = new Date(summaryData.date).toLocaleString();
            if (detailTranscription) detailTranscription.textContent = summaryData.transcription || 'No transcription available';
            if (detailSummary) {
                console.log('Setting summary HTML:', summaryData.summary);
                detailSummary.innerHTML = markdownToHtml(summaryData.summary || 'No summary available');
            }
        }
    }

    // Handle back button in detail view
    if (backButton) {
        backButton.addEventListener('click', () => {
            if (homeScreen) homeScreen.classList.add('active');
            if (detailScreen) detailScreen.classList.remove('active');
        });
    }

    // Add transcription toggle functionality
    if (showTranscriptionBtn && transcription) {
        showTranscriptionBtn.addEventListener('click', () => {
            const isExpanded = showTranscriptionBtn.getAttribute('aria-expanded') === 'true';
            showTranscriptionBtn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
            transcription.classList.toggle('hidden');
            showTranscriptionBtn.querySelector('span').textContent = isExpanded ? 'Show Transcription' : 'Hide Transcription';
        });
    }
}); 