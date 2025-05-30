document.addEventListener('DOMContentLoaded', () => {
    const recordButton = document.getElementById('recordButton');
    const recordingStatus = document.getElementById('recordingStatus');
    const recordingTime = document.getElementById('recordingTime');
    const status = document.getElementById('status');
    const result = document.getElementById('result');
    const transcription = document.getElementById('transcription');
    const summary = document.getElementById('summary');
    const recentSummaries = document.getElementById('recentSummaries');
    const summaryTemplate = document.getElementById('summaryTemplate');

    let mediaRecorder;
    let audioChunks = [];
    let recordingStartTime;
    let recordingTimer;
    let isProcessing = false;

    // Screen Management
    const homeScreen = document.getElementById('homeScreen');
    const detailScreen = document.getElementById('detailScreen');
    const backButton = detailScreen.querySelector('.back-button');

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    backButton.addEventListener('click', () => {
        showScreen('homeScreen');
    });

    // Function to format date for separator
    function formatDateForSeparator(date) {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    }

    // Function to create a date separator
    function createDateSeparator(dateStr) {
        const separator = document.createElement('div');
        separator.className = 'date-separator';
        separator.textContent = dateStr;
        return separator;
    }

    // Function to create a summary preview card
    function createSummaryPreview(summaryData) {
        const preview = document.createElement('div');
        preview.className = 'summary-preview';
        preview.setAttribute('data-id', summaryData.id);

        const header = document.createElement('div');
        header.className = 'preview-header';

        const time = document.createElement('time');
        time.className = 'preview-time';
        const date = new Date(summaryData.date);
        time.textContent = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        time.setAttribute('datetime', date.toISOString());

        header.appendChild(time);
        preview.appendChild(header);

        const content = document.createElement('div');
        content.className = 'preview-content';
        
        // Extract the main summary text
        const summaryText = parseSummaryContent(summaryData.summary).summary;
        content.textContent = summaryText || 'No summary available';

        preview.appendChild(content);

        // Add click handler to navigate to detail view
        preview.addEventListener('click', () => {
            showSummaryDetail(summaryData);
        });

        return preview;
    }

    // Function to show summary detail
    function showSummaryDetail(summaryData) {
        const detailCard = detailScreen.querySelector('.summary-card');
        
        // Set timestamp
        const time = detailCard.querySelector('time');
        const date = new Date(summaryData.date);
        time.textContent = date.toLocaleString();
        time.setAttribute('datetime', date.toISOString());

        // Set delete button handler
        const deleteBtn = detailCard.querySelector('.delete');
        deleteBtn.addEventListener('click', () => {
            deleteSummary(summaryData.id);
            showScreen('homeScreen');
        });

        // Parse and populate summary sections
        if (summaryData.summary) {
            const sections = parseSummaryContent(summaryData.summary);
            
            // Populate Key Points
            const keyPointsList = detailCard.querySelector('section:nth-of-type(1) ul');
            keyPointsList.innerHTML = '';
            sections.keyPoints?.forEach(point => {
                const li = document.createElement('li');
                li.textContent = point;
                keyPointsList.appendChild(li);
            });

            // Populate Medical Information
            const medicationList = detailCard.querySelector('.medication-list');
            const conditionList = detailCard.querySelector('.condition-list');
            const vitalsList = detailCard.querySelector('.vitals-list');

            medicationList.innerHTML = '';
            conditionList.innerHTML = '';
            vitalsList.innerHTML = '';

            sections.medications?.forEach(med => {
                const li = document.createElement('li');
                li.innerHTML = `
                    ${med}
                    <button class="set-reminder" aria-label="Set medication reminder">
                        <i class="ph ph-bell" aria-hidden="true"></i>
                        <span>Set Reminder</span>
                    </button>
                `;
                medicationList.appendChild(li);
            });

            sections.conditions?.forEach(condition => {
                const li = document.createElement('li');
                li.textContent = condition;
                conditionList.appendChild(li);
            });

            sections.vitals?.forEach(vital => {
                const li = document.createElement('li');
                li.textContent = vital;
                vitalsList.appendChild(li);
            });

            // Populate Important Dates
            const datesList = detailCard.querySelector('.appointment-info');
            datesList.innerHTML = '';
            sections.dates?.forEach(date => {
                const li = document.createElement('li');
                li.innerHTML = `
                    ${date}
                    <button class="set-reminder" aria-label="Set appointment reminder">
                        <i class="ph ph-bell" aria-hidden="true"></i>
                        <span>Set Reminder</span>
                    </button>
                `;
                datesList.appendChild(li);
            });

            // Populate Action Items
            const actionList = detailCard.querySelector('section:nth-of-type(4) ul');
            actionList.innerHTML = '';
            sections.actionItems?.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                actionList.appendChild(li);
            });

            // Set Summary Text
            const summaryText = detailCard.querySelector('.summary-text p');
            summaryText.textContent = sections.summary || '';
        }

        // Set up transcription
        const transcriptionBtn = detailCard.querySelector('.show-transcription');
        const transcriptionDiv = detailCard.querySelector('.transcription');
        transcriptionDiv.textContent = summaryData.transcription || '';

        transcriptionBtn.addEventListener('click', () => {
            const isHidden = transcriptionDiv.classList.toggle('hidden');
            transcriptionBtn.setAttribute('aria-expanded', !isHidden);
        });

        // Set up reminder buttons
        detailCard.querySelectorAll('.set-reminder').forEach(btn => {
            btn.addEventListener('click', () => {
                showReminderModal(btn.closest('li').textContent);
            });
        });

        showScreen('detailScreen');
    }

    // Function to create a new summary card
    function createSummaryCard(summaryData) {
        const template = summaryTemplate.content.cloneNode(true);
        const card = template.querySelector('.summary-card');
        
        // Set timestamp
        const time = card.querySelector('time');
        const date = new Date(summaryData.date);
        time.textContent = date.toLocaleString();
        time.setAttribute('datetime', date.toISOString());

        // Set delete button handler
        const deleteBtn = card.querySelector('.delete');
        deleteBtn.addEventListener('click', () => {
            deleteSummary(summaryData.id);
            card.remove();
        });

        // Parse and populate summary sections
        if (summaryData.summary) {
            const sections = parseSummaryContent(summaryData.summary);
            
            // Populate Key Points
            if (sections.keyPoints) {
                const keyPointsList = card.querySelector('section:nth-of-type(1) ul');
                sections.keyPoints.forEach(point => {
                    const li = document.createElement('li');
                    li.textContent = point;
                    keyPointsList.appendChild(li);
                });
            }

            // Populate Medical Information
            if (sections.medications || sections.conditions || sections.vitals) {
                const medicationList = card.querySelector('.medication-list');
                const conditionList = card.querySelector('.condition-list');
                const vitalsList = card.querySelector('.vitals-list');

                sections.medications?.forEach(med => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        ${med}
                        <button class="set-reminder" aria-label="Set medication reminder">
                            <i class="ph ph-bell" aria-hidden="true"></i>
                            <span>Set Reminder</span>
                        </button>
                    `;
                    medicationList.appendChild(li);
                });

                sections.conditions?.forEach(condition => {
                    const li = document.createElement('li');
                    li.textContent = condition;
                    conditionList.appendChild(li);
                });

                sections.vitals?.forEach(vital => {
                    const li = document.createElement('li');
                    li.textContent = vital;
                    vitalsList.appendChild(li);
                });
            }

            // Populate Important Dates
            if (sections.dates) {
                const datesList = card.querySelector('.appointment-info');
                sections.dates.forEach(date => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        ${date}
                        <button class="set-reminder" aria-label="Set appointment reminder">
                            <i class="ph ph-bell" aria-hidden="true"></i>
                            <span>Set Reminder</span>
                        </button>
                    `;
                    datesList.appendChild(li);
                });
            }

            // Populate Action Items
            if (sections.actionItems) {
                const actionList = card.querySelector('section:nth-of-type(4) ul');
                sections.actionItems.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    actionList.appendChild(li);
                });
            }

            // Set Summary Text
            if (sections.summary) {
                const summaryText = card.querySelector('.summary-text p');
                summaryText.textContent = sections.summary;
            }
        }

        // Set up transcription toggle
        const transcriptionBtn = card.querySelector('.show-transcription');
        const transcriptionDiv = card.querySelector('.transcription');
        transcriptionDiv.textContent = summaryData.transcription || '';

        transcriptionBtn.addEventListener('click', () => {
            const isHidden = transcriptionDiv.classList.toggle('hidden');
            transcriptionBtn.setAttribute('aria-expanded', !isHidden);
        });

        // Set up reminder buttons
        card.querySelectorAll('.set-reminder').forEach(btn => {
            btn.addEventListener('click', () => {
                showReminderModal(btn.closest('li').textContent);
            });
        });

        return card;
    }

    // Function to parse summary content into sections
    function parseSummaryContent(summary) {
        const sections = {
            keyPoints: [],
            medications: [],
            conditions: [],
            vitals: [],
            dates: [],
            actionItems: [],
            summary: ''
        };

        // Split the summary into sections and parse each one
        const lines = summary.split('\n');
        let currentSection = '';

        lines.forEach(line => {
            line = line.trim();
            if (!line) return;

            if (line.startsWith('### ')) {
                currentSection = line.substring(4).toLowerCase();
            } else if (line.startsWith('• ') || line.startsWith('* ')) {
                const content = line.substring(2);
                switch (currentSection) {
                    case 'key points':
                        sections.keyPoints.push(content);
                        break;
                    case 'medical information':
                        if (content.includes('Medications:')) sections.medications.push(content);
                        else if (content.includes('Conditions:')) sections.conditions.push(content);
                        else if (content.includes('Vitals:')) sections.vitals.push(content);
                        break;
                    case 'important dates':
                        sections.dates.push(content);
                        break;
                    case 'action items':
                        sections.actionItems.push(content);
                        break;
                }
            } else if (line.startsWith('Summary:')) {
                sections.summary = line;
            }
        });

        return sections;
    }

    // Function to display recent summaries
    function displayRecentSummaries() {
        const summaries = JSON.parse(localStorage.getItem('audioSummaries') || '[]');
        recentSummaries.innerHTML = '';
        
        if (summaries.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = 'No visit summaries yet';
            recentSummaries.appendChild(emptyState);
            return;
        }

        let currentDate = null;

        summaries.forEach(summary => {
            const summaryDate = new Date(summary.date);
            const dateStr = formatDateForSeparator(summaryDate);

            if (dateStr !== currentDate) {
                recentSummaries.appendChild(createDateSeparator(dateStr));
                currentDate = dateStr;
            }

            const preview = createSummaryPreview(summary);
            recentSummaries.appendChild(preview);
        });
    }

    // Function to delete a summary
    function deleteSummary(id) {
        const summaries = JSON.parse(localStorage.getItem('audioSummaries') || '[]');
        const updatedSummaries = summaries.filter(s => s.id !== id);
        localStorage.setItem('audioSummaries', JSON.stringify(updatedSummaries));
    }

    // Load existing summaries when the page loads
    displayRecentSummaries();

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
                    summary.innerHTML = markdownToHtml(data.summary);
                    result.classList.remove('hidden');
                    status.classList.add('hidden');
                    
                    // Save the new summary
                    saveSummary(data.transcription, data.summary);
                    
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

    // Global functions for reminder handling
    window.setMedicineReminder = function(medicineInfo) {
        const modal = document.querySelector('.modal');
        const form = modal.querySelector('.modal-form');
        const titleInput = modal.querySelector('#reminder-title');
        const typeSelect = modal.querySelector('#reminder-type');
        const notesInput = modal.querySelector('#reminder-notes');

        titleInput.value = medicineInfo.replace('Medications:', '').trim();
        typeSelect.value = 'medicine';
        notesInput.value = medicineInfo;
        
        modal.classList.add('active');
    };

    window.setAppointmentReminder = function(appointmentInfo) {
        const modal = document.querySelector('.modal');
        const form = modal.querySelector('.modal-form');
        const titleInput = modal.querySelector('#reminder-title');
        const typeSelect = modal.querySelector('#reminder-type');
        const notesInput = modal.querySelector('#reminder-notes');

        titleInput.value = 'Appointment';
        typeSelect.value = 'appointment';
        notesInput.value = appointmentInfo;
        
        modal.classList.add('active');
    };

    // Modal event listeners
    const modal = document.querySelector('.modal');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.modal-btn.cancel');
    const form = modal.querySelector('.modal-form');

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const reminder = {
            title: form.querySelector('#reminder-title').value,
            type: form.querySelector('#reminder-type').value,
            date: form.querySelector('#reminder-date').value,
            notes: form.querySelector('#reminder-notes').value,
            frequency: form.querySelector('#reminder-frequency').value
        };

        reminderManager.addReminder(reminder);
        modal.classList.remove('active');
        form.reset();
    });
}); 