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

    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal';
    modalContainer.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Set Reminder</h3>
                <button class="modal-close">&times;</button>
            </div>
            <form class="modal-form">
                <div class="form-group">
                    <label for="reminder-title">Title</label>
                    <input type="text" id="reminder-title" required>
                </div>
                <div class="form-group">
                    <label for="reminder-type">Type</label>
                    <select id="reminder-type" required>
                        <option value="medicine">Medicine</option>
                        <option value="appointment">Appointment</option>
                    </select>
                </div>
                <div class="form-group" id="medicine-fields">
                    <label for="reminder-frequency">Frequency</label>
                    <select id="reminder-frequency">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="reminder-date">Date & Time</label>
                    <input type="datetime-local" id="reminder-date" required>
                </div>
                <div class="form-group">
                    <label for="reminder-notes">Notes</label>
                    <input type="text" id="reminder-notes">
                </div>
                <div class="modal-actions">
                    <button type="button" class="modal-btn cancel">Cancel</button>
                    <button type="submit" class="modal-btn save">Save Reminder</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modalContainer);

    // Reminder management
    class ReminderManager {
        constructor() {
            this.reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
            this.setupNotifications();
        }

        async setupNotifications() {
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    this.checkReminders();
                    setInterval(() => this.checkReminders(), 60000); // Check every minute
                }
            }
        }

        addReminder(reminder) {
            this.reminders.push({
                id: Date.now(),
                ...reminder,
                notified: false
            });
            this.saveReminders();
            this.scheduleNotification(reminder);
        }

        removeReminder(id) {
            this.reminders = this.reminders.filter(r => r.id !== id);
            this.saveReminders();
        }

        saveReminders() {
            localStorage.setItem('reminders', JSON.stringify(this.reminders));
        }

        scheduleNotification(reminder) {
            const now = new Date();
            const reminderDate = new Date(reminder.date);
            
            if (reminderDate > now) {
                const timeUntilReminder = reminderDate - now;
                setTimeout(() => {
                    this.showNotification(reminder);
                }, timeUntilReminder);
            }
        }

        showNotification(reminder) {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(reminder.title, {
                    body: reminder.notes || 'Time for your reminder!',
                    icon: '/favicon.ico'
                });
            }
        }

        checkReminders() {
            const now = new Date();
            this.reminders.forEach(reminder => {
                const reminderDate = new Date(reminder.date);
                if (!reminder.notified && reminderDate <= now) {
                    this.showNotification(reminder);
                    reminder.notified = true;
                    this.saveReminders();
                }
            });
        }
    }

    const reminderManager = new ReminderManager();

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
        
        summaries.forEach(summary => {
            const card = createSummaryCard(summary);
            recentSummaries.appendChild(card);
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