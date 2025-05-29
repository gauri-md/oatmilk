const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for audio files
const fileFilter = (req, file, cb) => {
  // Accept only audio files
  const allowedMimeTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 
    'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/aac',
    'audio/m4a', 'audio/x-m4a'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio files are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 25 * 1024 * 1024, // Default to 25MB
  }
});

module.exports = upload; 