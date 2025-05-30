const express = require('express');
const router = express.Router();
const audioController = require('../controllers/audioController');
const upload = require('../middleware/uploadMiddleware');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Initialize OpenAI with custom configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 60000, // 60 seconds
  httpAgent: new https.Agent({
    keepAlive: true,
    timeout: 60000,
    rejectUnauthorized: true
  })
});

// Helper function to handle OpenAI API calls with retries
async function callOpenAIWithRetry(apiCall, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message);
      lastError = error;
      
      // Handle different types of errors
      if (error.status === 429) { // Rate limit error
        const waitTime = Math.min(1000 * Math.pow(2, i), 10000); // Exponential backoff with max 10s
        console.log(`Rate limited, waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else if (error.code === 'ECONNRESET' || error.type === 'system' || error.code === 'ETIMEDOUT') {
        const waitTime = Math.min(1000 * Math.pow(2, i), 5000); // Shorter wait for connection issues
        console.log(`Connection error, waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error; // Don't retry other types of errors
      }
    }
  }
  throw lastError;
}

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
      return res.status(400).json({ error: 'No audio file provided' });
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
      return res.status(400).json({ error: 'File must be an audio file' });
    }

    try {
      // Create a temporary file from buffer
      const tempFilePath = path.join(process.cwd(), 'temp_audio_' + Date.now() + '.webm');
      console.log('Creating temporary file at:', tempFilePath);
      
      fs.writeFileSync(tempFilePath, req.file.buffer);
      console.log('Temporary file created successfully');

      console.log('Sending to OpenAI for transcription...');
      const transcription = await callOpenAIWithRetry(() => 
        openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: "whisper-1",
        })
      );

      console.log('Raw transcription response:', transcription);
      console.log('Transcription text:', transcription.text);
      
      // Clean up temp file
      try {
        fs.unlinkSync(tempFilePath);
        console.log('Temporary file cleaned up successfully');
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
        // Continue processing even if cleanup fails
      }

      console.log('Sending to OpenAI for summary...');
      const summary = await callOpenAIWithRetry(() =>
        openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are a medical transcription assistant that summarizes medical conversations. 
              Structure your response in the following format using markdown:
              
              ### Key Points
              • [List the main discussion points as bullet points]
              
              ### Medical Information
              • Medications: [List any medications discussed]
              • Conditions: [List any medical conditions discussed]
              • Vitals/Metrics: [List any vital signs or health metrics discussed]
              
              ### Important Dates
              • [List any upcoming appointments, follow-ups, or significant dates]
              
              ### Action Items
              • [List any tasks, recommendations, or follow-up actions]
              
              Keep bullet points concise and highlight important terms using **bold**. 
              If any section has no relevant information, include "None mentioned" as the value.`
            },
            {
              role: "user",
              content: `Please summarize this medical conversation: ${transcription.text}`
            }
          ]
        })
      );

      console.log('Raw summary response:', summary);
      console.log('Summary content:', summary.choices[0].message.content);
      
      const response = {
        transcription: transcription.text,
        summary: summary.choices[0].message.content,
        structured: true
      };
      
      console.log('Final response being sent:', response);
      return res.json(response);
    } catch (error) {
      console.error('Error processing audio:', error);
      return res.status(500).json({ 
        error: 'Failed to process audio',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Error in transcribe endpoint:', error);
    return res.status(500).json({ 
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