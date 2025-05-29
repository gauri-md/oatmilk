document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const uploadForm = document.getElementById('upload-form');
  const audioFileInput = document.getElementById('audio-file');
  const fileNameDisplay = document.getElementById('file-name');
  const uploadProgress = document.getElementById('upload-progress');
  const summariesSection = document.getElementById('summaries-section');
  const summariesList = document.getElementById('summaries-list');
  const summaryDetailSection = document.getElementById('summary-detail-section');
  const backBtn = document.getElementById('back-btn');
  const summaryTitle = document.getElementById('summary-title');
  const summaryDate = document.getElementById('summary-date');
  const summaryParticipants = document.getElementById('summary-participants');
  const summaryText = document.getElementById('summary-text');
  const keyPoints = document.getElementById('key-points');
  const actionItems = document.getElementById('action-items');
  const medicalTerms = document.getElementById('medical-terms');
  
  // Templates
  const summaryItemTemplate = document.getElementById('summary-item-template');
  
  // Initial load
  loadSummaries();
  
  // Event Listeners
  if (audioFileInput) {
    audioFileInput.addEventListener('change', updateFileName);
  }
  
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleSubmit);
  }
  
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      summaryDetailSection.classList.add('hidden');
      summariesSection.classList.remove('hidden');
    });
  }
  
  // Functions
  function updateFileName() {
    if (audioFileInput.files.length > 0) {
      const fileName = audioFileInput.files[0].name;
      fileNameDisplay.textContent = fileName;
    } else {
      fileNameDisplay.textContent = '';
    }
  }
  
  async function handleSubmit(event) {
    event.preventDefault();
    
    // Validate form
    if (!audioFileInput.files.length) {
      alert('Please select an audio file to upload');
      return;
    }
    
    // Prepare form data
    const formData = new FormData(uploadForm);
    
    // Show progress indicator
    uploadForm.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    
    try {
      // Upload file and get response
      const response = await fetch('/api/summarize', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process audio');
      }
      
      const result = await response.json();
      
      // Reset form
      uploadForm.reset();
      fileNameDisplay.textContent = '';
      
      // Hide progress and show form again
      uploadProgress.classList.add('hidden');
      uploadForm.classList.remove('hidden');
      
      // Reload summaries to include the new one
      await loadSummaries();
      
      // Show the newly created summary
      showSummaryDetails(result.data.id);
      
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'An error occurred while processing the audio');
      
      // Hide progress and show form again
      uploadProgress.classList.add('hidden');
      uploadForm.classList.remove('hidden');
    }
  }
  
  async function loadSummaries() {
    try {
      const response = await fetch('/api/summaries');
      
      if (!response.ok) {
        throw new Error('Failed to load summaries');
      }
      
      const result = await response.json();
      
      // Clear existing list
      summariesList.innerHTML = '';
      
      if (result.data.length === 0) {
        // Show empty message
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No summaries yet. Upload a recording to get started.';
        summariesList.appendChild(emptyMessage);
      } else {
        // Render summaries
        result.data.forEach(summary => {
          renderSummaryItem(summary);
        });
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = document.createElement('p');
      errorMessage.className = 'empty-message';
      errorMessage.textContent = 'Failed to load summaries. Please try again later.';
      summariesList.innerHTML = '';
      summariesList.appendChild(errorMessage);
    }
  }
  
  function renderSummaryItem(summary) {
    // Clone template
    const template = summaryItemTemplate.content.cloneNode(true);
    const summaryItem = template.querySelector('.summary-item');
    
    // Set data attribute for ID
    summaryItem.dataset.id = summary.id;
    
    // Populate content
    template.querySelector('.summary-item-title').textContent = summary.title;
    template.querySelector('.summary-item-date').textContent = formatDate(summary.date);
    template.querySelector('.summary-item-preview').textContent = summary.summary;
    
    // Add click event
    const viewButton = template.querySelector('.view-summary-btn');
    viewButton.addEventListener('click', () => {
      showSummaryDetails(summary.id);
    });
    
    // Add to list
    summariesList.appendChild(template);
  }
  
  async function showSummaryDetails(id) {
    try {
      const response = await fetch(`/api/summaries/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to load summary details');
      }
      
      const { data: summary } = await response.json();
      
      // Populate summary details
      summaryTitle.textContent = summary.title;
      summaryDate.textContent = `Date: ${formatDate(summary.date)}`;
      summaryParticipants.textContent = `Participants: ${summary.participants}`;
      summaryText.textContent = summary.summary;
      
      // Populate key points
      keyPoints.innerHTML = '';
      if (summary.keyPoints && summary.keyPoints.length) {
        summary.keyPoints.forEach(point => {
          const li = document.createElement('li');
          li.textContent = point;
          keyPoints.appendChild(li);
        });
      } else {
        keyPoints.innerHTML = '<li>No key points found</li>';
      }
      
      // Populate action items
      actionItems.innerHTML = '';
      if (summary.actionItems && summary.actionItems.length) {
        summary.actionItems.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          actionItems.appendChild(li);
        });
      } else {
        actionItems.innerHTML = '<li>No action items found</li>';
      }
      
      // Populate medical terms
      medicalTerms.innerHTML = '';
      if (summary.medicalTerms && summary.medicalTerms.length) {
        summary.medicalTerms.forEach(term => {
          const termItem = document.createElement('div');
          termItem.className = 'term-item';
          
          const termName = document.createElement('div');
          termName.className = 'term-name';
          termName.textContent = term.term;
          
          const termDefinition = document.createElement('div');
          termDefinition.className = 'term-definition';
          termDefinition.textContent = term.definition;
          
          termItem.appendChild(termName);
          termItem.appendChild(termDefinition);
          
          // Toggle definition on click
          termItem.addEventListener('click', () => {
            termItem.classList.toggle('expanded');
          });
          
          medicalTerms.appendChild(termItem);
        });
      } else {
        const noTerms = document.createElement('p');
        noTerms.textContent = 'No medical terms found';
        medicalTerms.appendChild(noTerms);
      }
      
      // Show summary detail section and hide summaries list
      summariesSection.classList.add('hidden');
      summaryDetailSection.classList.remove('hidden');
      
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to load summary details. Please try again later.');
    }
  }
  
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }
}); 