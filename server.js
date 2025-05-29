require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { OpenAI } = require('openai');
const path = require('path');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

// Debug logs
console.log('Current working directory:', process.cwd());
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'exists' : 'missing'
});

const app = express();
const upload = multer({ dest: 'uploads/' });

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);

// Routes
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: req.file,
      model: "whisper-1",
    });

    const summary = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes meeting transcripts. Focus on key points, action items, and decisions made."
        },
        {
          role: "user",
          content: `Please summarize this meeting transcript: ${transcription.text}`
        }
      ]
    });

    res.json({
      transcription: transcription.text,
      summary: summary.choices[0].message.content
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process audio' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 