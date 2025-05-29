const express = require('express');
const router = express.Router();
const audioController = require('../controllers/audioController');
const upload = require('../middleware/uploadMiddleware');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'API is up and running'
  });
});

// Audio upload and summarize endpoint
router.post('/summarize', upload.single('audio'), audioController.summarizeAudio);

// Get summaries list endpoint
router.get('/summaries', audioController.getSummaries);

// Get specific summary by ID
router.get('/summaries/:id', audioController.getSummaryById);

module.exports = router; 