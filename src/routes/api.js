const express = require('express');
const router = express.Router();
const audioController = require('../controllers/audioController');
const openaiService = require('../services/openaiService');
const upload = require('../middleware/uploadMiddleware');
const path = require('path');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'API is up and running'
  });
});

// Audio transcribe endpoint
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      console.error('No file uploaded');
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    console.log('Processing file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer ? 'Buffer exists' : 'No buffer'
    });

    // Verify file is an audio file
    if (!req.file.mimetype.startsWith('audio/')) {
      console.error('Invalid file type:', req.file.mimetype);
      res.status(400).json({ error: 'File must be an audio file' });
      return;
    }

    try {
      console.log('Sending to OpenAI for transcription...');
      const transcriptionText = await openaiService.transcribeAudio(req.file.buffer);
      console.log('Transcription text:', transcriptionText);

      console.log('Sending to OpenAI for summary...');
      const summaryText = await openaiService.summarizeTranscription(transcriptionText);
      console.log('Summary content:', summaryText);
      
      const response = {
        transcription: transcriptionText,
        summary: summaryText,
        structured: true
      };
      
      console.log('Final response being sent:', response);
      res.json(response);
    } catch (error) {
      console.error('Error processing audio:', error);
      res.status(500).json({ 
        error: 'Failed to process audio',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Error in transcribe endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message
    });
  }
});

// Audio upload and summarize endpoint
router.post('/summarize', upload.single('audio'), audioController.summarizeAudio);

// Get summaries list endpoint
router.get('/summaries', audioController.getSummaries);

// Get specific summary by ID
router.get('/summaries/:id', audioController.getSummaryById);

// Save new summary
router.post('/summaries', audioController.saveSummary);

module.exports = router; 