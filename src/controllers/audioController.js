const fs = require('fs');
const path = require('path');
const openaiService = require('../services/openaiService');
const dataService = require('../services/dataService');

/**
 * Handle audio upload and summarization
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function summarizeAudio(req, res) {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided'
      });
    }

    const audioFilePath = req.file.path;
    const originalFilename = req.file.originalname;
    
    // Extract meeting metadata from request body if available
    const { title, participants, date } = req.body;
    
    // Process audio file
    const transcription = await openaiService.transcribeAudio(audioFilePath);
    
    // Generate summary from transcription
    const summary = await openaiService.summarizeTranscription(transcription);
    
    // Prepare data to save
    const summaryData = {
      title: title || `Meeting Summary ${new Date().toLocaleDateString()}`,
      participants: participants || 'Unknown participants',
      date: date || new Date().toISOString(),
      originalFilename,
      audioFilePath, // Store path for potential future reference
      transcription,
      summary: summary.summary,
      keyPoints: summary.keyPoints,
      actionItems: summary.actionItems,
      medicalTerms: summary.medicalTerms
    };
    
    // Save summary to storage
    const savedSummary = dataService.saveSummary(summaryData);
    
    // Return success response
    res.status(201).json({
      success: true,
      message: 'Audio processed and summarized successfully',
      data: {
        id: savedSummary.id,
        title: savedSummary.title,
        createdAt: savedSummary.createdAt,
        summary: savedSummary.summary,
        keyPoints: savedSummary.keyPoints,
        actionItems: savedSummary.actionItems
      }
    });
  } catch (error) {
    console.error('Error in summarizeAudio:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (unlinkError) => {
        if (unlinkError) console.error('Error deleting file:', unlinkError);
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to process audio',
      error: error.message
    });
  }
}

/**
 * Get all summaries
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function getSummaries(req, res) {
  try {
    const summaries = dataService.getAllSummaries();
    
    // Return only necessary data for listing
    const simplifiedSummaries = summaries.map(summary => ({
      id: summary.id,
      title: summary.title,
      date: summary.date,
      createdAt: summary.createdAt,
      summary: summary.summary.substring(0, 150) + '...' // Preview of summary
    }));
    
    res.status(200).json({
      success: true,
      count: simplifiedSummaries.length,
      data: simplifiedSummaries
    });
  } catch (error) {
    console.error('Error in getSummaries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve summaries',
      error: error.message
    });
  }
}

/**
 * Get a specific summary by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function getSummaryById(req, res) {
  try {
    const summary = dataService.getSummaryById(req.params.id);
    
    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Summary not found'
      });
    }
    
    // Exclude sensitive or unnecessary data
    const { audioFilePath, ...sanitizedSummary } = summary;
    
    res.status(200).json({
      success: true,
      data: sanitizedSummary
    });
  } catch (error) {
    console.error('Error in getSummaryById:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve summary',
      error: error.message
    });
  }
}

module.exports = {
  summarizeAudio,
  getSummaries,
  getSummaryById
}; 