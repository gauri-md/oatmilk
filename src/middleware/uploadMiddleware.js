const multer = require('multer');

// Configure storage to use memory storage
const storage = multer.memoryStorage();

// File filter for audio files
const fileFilter = (req, file, cb) => {
  // Accept only audio files
  const allowedMimeTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 
    'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/aac',
    'audio/m4a', 'audio/x-m4a'
  ];
  
  // Extract base MIME type for comparison
  const baseMimeType = file.mimetype.split(';')[0];
  
  if (allowedMimeTypes.includes(baseMimeType)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

module.exports = upload; 