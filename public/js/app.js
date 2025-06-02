document.addEventListener('DOMContentLoaded', () => {
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
  const backButton = detailScreen?.querySelector('.back-button');
  const summaryTitle = document.getElementById('summaryTitle');
  const summaryDate = document.getElementById('summaryDate');
  const summaryParticipants = document.getElementById('summary-participants');
  const summaryText = document.getElementById('summary-text');
  const keyPoints = document.getElementById('key-points');
  const actionItems = document.getElementById('action-items');
  const medicalTerms = document.getElementById('medical-terms');
  const summarySearch = document.getElementById('summarySearch');
  const clearSearch = document.getElementById('clearSearch');
  
  // Recording state
  let mediaRecorder;
  let audioChunks = [];
  let recordingStartTime;
  let recordingTimer;
  let isProcessing = false;
  let allSummaries = []; // Store all summaries for filtering
  
  // Initial load
  loadSummaries();
  
  // Initialize tabs
  initializeTabs();
  
  // Event Listeners
  if (recordButton) {
    recordButton.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
      } else {
        startRecording();
      }
    });
  }
  
  if (backButton) {
    backButton.addEventListener('click', () => {
      showHomeScreen();
    });
  }
  
  if (showTranscriptionBtn && transcription) {
    showTranscriptionBtn.addEventListener('click', () => {
      const isExpanded = showTranscriptionBtn.getAttribute('aria-expanded') === 'true';
      showTranscriptionBtn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
      transcription.classList.toggle('hidden');
      showTranscriptionBtn.querySelector('span').textContent = isExpanded ? 'Show Transcription' : 'Hide Transcription';
    });
  }
  
  // Search functionality
  if (summarySearch) {
    summarySearch.addEventListener('input', () => {
      const searchTerm = summarySearch.value.trim();
      filterSummaries(searchTerm);
      
      // Show/hide clear button
      if (clearSearch) {
        if (searchTerm) {
          clearSearch.classList.remove('hidden');
        } else {
          clearSearch.classList.add('hidden');
        }
      }
    });
  }
  
  if (clearSearch) {
    clearSearch.addEventListener('click', () => {
      if (summarySearch) {
        summarySearch.value = '';
        filterSummaries('');
        clearSearch.classList.add('hidden');
        summarySearch.focus();
      }
    });
  }
  
  // Functions
  function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });
  }
  
  function switchTab(targetTab) {
    // Remove active class from all buttons and panels
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    // Add active class to target button and panel
    const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
    const targetPanel = document.getElementById(`${targetTab}Tab`);
    
    if (targetButton) targetButton.classList.add('active');
    if (targetPanel) targetPanel.classList.add('active');
  }
  
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
      
      if (recordButton) {
        recordButton.textContent = 'Stop Recording';
        recordButton.classList.add('recording');
      }
      if (recordingStatus) {
        recordingStatus.classList.remove('hidden');
        recordingStatus.classList.add('recording');
      }
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
  
  async function loadSummaries() {
    // Show loading state
    if (recentSummaries) {
      recentSummaries.innerHTML = '<div class="loading-message">Loading summaries...</div>';
    }
    
    try {
      const response = await fetch('/api/summaries');
      if (response.ok) {
        const summariesData = await response.json();
        
        if (recentSummaries) {
          recentSummaries.innerHTML = '';
          if (summariesData.data && summariesData.data.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No summaries yet. Record your first medical conversation to get started.';
            recentSummaries.appendChild(emptyMessage);
          } else if (summariesData.data) {
            // Sort summaries by creation date (most recent first)
            const sortedSummaries = summariesData.data.sort((a, b) => {
              const dateA = new Date(a.createdAt || a.date).getTime();
              const dateB = new Date(b.createdAt || b.date).getTime();
              return dateB - dateA; // Descending order (newest first)
            });
            
            sortedSummaries.forEach((summaryItem, index) => {
              const summaryCard = document.createElement('div');
              summaryCard.className = 'summary-preview';
              
              const titleToShow = summaryItem.title || 'Untitled Summary';
              
              // Create a preview of the visit content
              let previewText = '';
              if (summaryItem.transcription && summaryItem.transcription.trim()) {
                // Use first 100 characters of transcription as preview
                previewText = summaryItem.transcription.substring(0, 100);
                if (summaryItem.transcription.length > 100) {
                  previewText += '...';
                }
              } else if (summaryItem.summary && summaryItem.summary.trim()) {
                // Extract key points from markdown summary
                const lines = summaryItem.summary.split('\n');
                const keyPointsSection = lines.find(line => line.includes('• ') && !line.includes('None mentioned'));
                if (keyPointsSection) {
                  previewText = keyPointsSection.replace('• ', '').substring(0, 100);
                  if (keyPointsSection.length > 100) {
                    previewText += '...';
                  }
                } else {
                  previewText = 'No content preview available';
                }
              } else {
                previewText = 'No content available';
              }
              
              summaryCard.innerHTML = `
                <div class="preview-header">
                  <h3 class="preview-title">${titleToShow}</h3>
                  <div class="preview-date" style="font-size: 12px; color: #666;">${new Date(summaryItem.createdAt || summaryItem.date).toLocaleDateString()}</div>
                </div>
                <div class="preview-content" style="margin-top: 8px; color: #666; font-size: 14px; line-height: 1.4;">
                  ${previewText}
                </div>
              `;
              
              // Make the entire card clickable
              summaryCard.style.cursor = 'pointer';
              summaryCard.addEventListener('click', async () => {
                try {
                  console.log('Clicking on summary:', summaryItem.id);
                  
                  // Immediately show detail screen with nuclear approach
                  showScreen(detailScreen);
                  
                  if (summary) {
                    summary.innerHTML = '<div class="loading-message">Loading summary details...</div>';
                  }
                  
                  const detailResponse = await fetch(`/api/summaries/${summaryItem.id}`);
                  if (!detailResponse.ok) {
                    throw new Error('Failed to load summary details');
                  }
                  const detailData = await detailResponse.json();
                  if (detailData.data) {
                    showSummaryDetail(detailData.data);
                  } else {
                    throw new Error('No summary data received');
                  }
                } catch (error) {
                  console.error('Error loading summary details:', error);
                  if (summary) {
                    summary.innerHTML = '<div class="error-message">Failed to load summary details</div>';
                  }
                  // Stay on detail screen but show error
                  alert('Failed to load summary details. Please try again.');
                }
              });
              
              recentSummaries.appendChild(summaryCard);
            });
          }
        }
      } else {
        throw new Error('Failed to load summaries');
      }
    } catch (error) {
      console.error('Error loading summaries:', error);
      if (recentSummaries) {
        recentSummaries.innerHTML = '';
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Failed to load summaries. Please try again later.';
        recentSummaries.appendChild(errorMessage);
      }
    }
  }
  
  function hideAllScreens() {
    const allScreens = document.querySelectorAll('.screen');
    allScreens.forEach(screen => {
      screen.classList.remove('active');
      if (screen instanceof HTMLElement) {
        // Nuclear approach - use every possible CSS property to hide
        screen.style.display = 'none';
        screen.style.visibility = 'hidden';
        screen.style.opacity = '0';
        screen.style.position = 'absolute';
        screen.style.left = '-9999px';
        screen.style.top = '-9999px';
        screen.style.width = '0';
        screen.style.height = '0';
        screen.style.overflow = 'hidden';
        screen.style.zIndex = '-1';
      }
    });
  }
  
  function showScreen(targetScreen) {
    if (targetScreen instanceof HTMLElement) {
      // First hide everything
      hideAllScreens();
      
      // Then show only the target screen with aggressive CSS
      targetScreen.classList.add('active');
      targetScreen.style.display = 'block';
      targetScreen.style.visibility = 'visible';
      targetScreen.style.opacity = '1';
      targetScreen.style.position = 'static';
      targetScreen.style.left = 'auto';
      targetScreen.style.top = 'auto';
      targetScreen.style.width = 'auto';
      targetScreen.style.height = 'auto';
      targetScreen.style.overflow = 'visible';
      targetScreen.style.zIndex = 'auto';
    }
  }
  
  function showSummaryDetail(summaryData) {
    // Use nuclear screen management
    showScreen(detailScreen);
    
    if (detailScreen) {
      // Scroll to top to ensure user sees the detail view
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Update detail screen content with error handling
      try {
        if (summaryTitle) {
          summaryTitle.textContent = summaryData.title || 'Untitled Summary';
        }
        
        if (summaryDate) {
          summaryDate.textContent = new Date(summaryData.date).toLocaleString();
        }
        
        // Target the transcription element specifically in the detail screen
        const detailTranscription = detailScreen.querySelector('#transcription');
        if (detailTranscription) {
          detailTranscription.textContent = summaryData.transcription || 'No transcription available';
          detailTranscription.classList.add('hidden'); // Hide transcription by default
        }
        
        // Target the summary element specifically in the detail screen
        const detailSummary = detailScreen.querySelector('#summary');
        if (detailSummary && detailSummary instanceof HTMLElement) {
          let summaryContent = '';
          
          if (summaryData.summary && summaryData.summary.trim()) {
            // New format - use markdown summary
            summaryContent = markdownToHtml(summaryData.summary);
          } else if (summaryData.keyPoints || summaryData.actionItems || summaryData.medicalTerms) {
            // Old format - build summary from separate fields
            summaryContent = buildSummaryFromOldFormat(summaryData);
          } else {
            summaryContent = '<p>No summary available</p>';
          }
          
          detailSummary.innerHTML = summaryContent;
          
          // CSS overrides to ensure visibility and proper dimensions
          detailSummary.style.setProperty('background-color', '#f8f9fa', 'important');
          detailSummary.style.setProperty('border', '1px solid #e0e0e0', 'important');
          detailSummary.style.setProperty('padding', '20px', 'important');
          detailSummary.style.setProperty('margin', '20px 0px', 'important');
          detailSummary.style.setProperty('min-height', '100px', 'important');
          detailSummary.style.setProperty('width', '100%', 'important');
          detailSummary.style.setProperty('display', 'block', 'important');
          detailSummary.style.setProperty('box-sizing', 'border-box', 'important');
          detailSummary.style.setProperty('visibility', 'visible', 'important');
          detailSummary.style.setProperty('opacity', '1', 'important');
          detailSummary.style.setProperty('position', 'static', 'important');
          detailSummary.style.setProperty('float', 'none', 'important');
          detailSummary.style.setProperty('clear', 'both', 'important');
          detailSummary.style.setProperty('overflow', 'visible', 'important');
          detailSummary.style.setProperty('max-width', 'none', 'important');
          detailSummary.style.setProperty('height', 'auto', 'important');
          detailSummary.style.setProperty('line-height', '1.5', 'important');
          detailSummary.style.setProperty('font-size', '16px', 'important');
          detailSummary.style.setProperty('color', '#1a1a1a', 'important');
        }
        
        // Reset transcription button state
        if (showTranscriptionBtn) {
          showTranscriptionBtn.setAttribute('aria-expanded', 'false');
          const span = showTranscriptionBtn.querySelector('span');
          if (span) span.textContent = 'Show Transcription';
        }
      } catch (error) {
        console.error('Error displaying summary detail:', error);
        const detailSummary = detailScreen.querySelector('#summary');
        if (detailSummary && detailSummary instanceof HTMLElement) {
          detailSummary.innerHTML = '<p>Error displaying summary content</p>';
        }
      }
    }
  }
  
  function showHomeScreen() {
    // Use nuclear screen management
    showScreen(homeScreen);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  function buildSummaryFromOldFormat(summaryData) {
    let content = '';
    
    // Key Points
    if (summaryData.keyPoints && summaryData.keyPoints.length > 0) {
      content += '<h3>Key Points</h3><ul>';
      summaryData.keyPoints.forEach(point => {
        content += `<li>${point}</li>`;
      });
      content += '</ul>';
    }
    
    // Medical Terms
    if (summaryData.medicalTerms && summaryData.medicalTerms.length > 0) {
      content += '<h3>Medical Information</h3><ul>';
      summaryData.medicalTerms.forEach(term => {
        content += `<li><strong>${term.term}:</strong> ${term.definition}</li>`;
      });
      content += '</ul>';
    }
    
    // Action Items
    if (summaryData.actionItems && summaryData.actionItems.length > 0) {
      content += '<h3>Action Items</h3><ul>';
      summaryData.actionItems.forEach(item => {
        content += `<li>${item}</li>`;
      });
      content += '</ul>';
    }
    
    return content || '<p>No summary content available</p>';
  }
  
  function markdownToHtml(markdown) {
    if (!markdown) return '';
    
    // Split into lines for processing
    const lines = markdown.split('\n');
    const result = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push('<br>');
        continue;
      }
      
      // Handle headers
      if (line.startsWith('### ')) {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push(`<h3>${line.substring(4)}</h3>`);
      } else if (line.startsWith('## ')) {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push(`<h2>${line.substring(3)}</h2>`);
      } else if (line.startsWith('# ')) {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push(`<h1>${line.substring(2)}</h1>`);
      }
      // Handle bullet points
      else if (line.startsWith('• ') || line.startsWith('- ')) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        const content = line.substring(2).trim();
        const processedContent = content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        result.push(`<li>${processedContent}</li>`);
      }
      // Handle regular text
      else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        const processedLine = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        result.push(`<p>${processedLine}</p>`);
      }
    }
    
    // Close any remaining list
    if (inList) {
      result.push('</ul>');
    }
    
    return result.join('');
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
          console.log('Audio processing completed, received:', data);
          
          // Hide status
          if (status) {
            status.classList.add('hidden');
            status.classList.remove('processing');
          }
          
          // Save the summary
          const savedSummary = await saveSummary(data.transcription, data.summary);
          console.log('Summary saved successfully:', savedSummary);
          
          // Load all summaries to update the list in the background
          await loadSummaries();
          
          // Show the detail view for the new summary directly
          const newSummaryData = {
            id: savedSummary.data.id,
            title: savedSummary.data.title,
            date: savedSummary.data.createdAt,
            transcription: data.transcription,
            summary: data.summary,
            createdAt: savedSummary.data.createdAt
          };
          
          console.log('Showing summary detail with data:', newSummaryData);
          showSummaryDetail(newSummaryData);
          
          // Add visual feedback that summary is ready
          if (status) {
            status.textContent = 'Summary complete! View details below.';
            status.classList.remove('hidden', 'processing', 'error');
            status.style.backgroundColor = 'var(--success)';
            status.style.color = 'white';
            
            // Hide success message after 3 seconds
            setTimeout(() => {
              if (status) {
                status.classList.add('hidden');
                status.style.backgroundColor = '';
                status.style.color = '';
              }
            }, 3000);
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
      
      // Refresh the summaries list
      await loadSummaries();
      
      return data;
    } catch (error) {
      console.error('Error saving summary:', error);
      throw error;
    }
  }
  
  function filterSummaries(searchTerm) {
    if (!recentSummaries) return;
    
    const summaryCards = recentSummaries.querySelectorAll('.summary-preview');
    let visibleCount = 0;
    
    summaryCards.forEach(card => {
      const title = card.querySelector('.preview-title')?.textContent || '';
      const content = card.querySelector('.preview-content')?.textContent || '';
      
      if (searchTerm === '' || 
          title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          content.toLowerCase().includes(searchTerm.toLowerCase())) {
        card.style.display = 'block';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });
    
    // Show "no results" message if needed
    let noResultsMsg = recentSummaries.querySelector('.no-results-message');
    if (visibleCount === 0 && searchTerm !== '' && summaryCards.length > 0) {
      if (!noResultsMsg) {
        noResultsMsg = document.createElement('div');
        noResultsMsg.className = 'no-results-message';
        noResultsMsg.textContent = `No summaries found for "${searchTerm}"`;
        noResultsMsg.style.textAlign = 'center';
        noResultsMsg.style.color = 'var(--text-light)';
        noResultsMsg.style.padding = 'var(--space-lg)';
        recentSummaries.appendChild(noResultsMsg);
      } else {
        noResultsMsg.textContent = `No summaries found for "${searchTerm}"`;
        noResultsMsg.style.display = 'block';
      }
    } else if (noResultsMsg) {
      noResultsMsg.style.display = 'none';
    }
  }
}); 