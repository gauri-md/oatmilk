require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { OpenAI } = require('openai');
const path = require('path');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const fs = require('fs');
const https = require('https');

// Debug logs
console.log('Current working directory:', process.cwd());
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'exists' : 'missing'
});

// Verify API key
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

const app = express();

// Configure server timeouts and limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

server.timeout = 300000; // 5 minutes timeout

// Configure multer with memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Security middleware with custom CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://api.openai.com"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);

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

// Routes
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
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
      const tempFilePath = path.join(__dirname, 'temp_audio_' + Date.now() + '.webm');
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

      console.log('Transcription received successfully');
      
      // Clean up temp file
      try {
        fs.unlinkSync(tempFilePath);
        console.log('Temporary file cleaned up successfully');
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
        // Continue processing even if cleanup fails
      }

      console.log('Generating summary...');
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

      console.log('Summary generated successfully');
      return res.json({
        transcription: transcription.text,
        summary: summary.choices[0].message.content,
        structured: true
      });
    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError);
      
      // Clean up temp file if it exists
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          console.log('Temporary file cleaned up after error');
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file after error:', cleanupError);
      }

      if (openaiError.status === 413) {
        return res.status(413).json({ error: 'File too large for processing' });
      } else if (openaiError.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later' });
      } else {
        return res.status(500).json({ 
          error: 'Error processing audio with OpenAI',
          details: openaiError.message
        });
      }
    }
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process audio',
      details: error.message
    });
  }
}); 