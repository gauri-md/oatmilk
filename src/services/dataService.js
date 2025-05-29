const fs = require('fs');
const path = require('path');

// Path to the JSON file that will store summaries
const dataFile = path.join(__dirname, '../../data/summaries.json');
const dataDir = path.dirname(dataFile);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure data file exists
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify([], null, 2));
}

/**
 * Save a new summary to storage
 * @param {object} summaryData - Summary data to save
 * @returns {object} - Saved summary with ID
 */
function saveSummary(summaryData) {
  try {
    // Read existing summaries
    const summaries = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    
    // Create new summary with ID and timestamp
    const newSummary = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...summaryData
    };
    
    // Add to summaries and save
    summaries.push(newSummary);
    fs.writeFileSync(dataFile, JSON.stringify(summaries, null, 2));
    
    return newSummary;
  } catch (error) {
    console.error('Error in saveSummary:', error);
    throw new Error(`Failed to save summary: ${error.message}`);
  }
}

/**
 * Get all summaries
 * @returns {Array} - Array of summaries
 */
function getAllSummaries() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (error) {
    console.error('Error in getAllSummaries:', error);
    throw new Error(`Failed to retrieve summaries: ${error.message}`);
  }
}

/**
 * Get a summary by ID
 * @param {string} id - Summary ID
 * @returns {object|null} - Summary or null if not found
 */
function getSummaryById(id) {
  try {
    const summaries = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    return summaries.find(summary => summary.id === id) || null;
  } catch (error) {
    console.error('Error in getSummaryById:', error);
    throw new Error(`Failed to retrieve summary: ${error.message}`);
  }
}

/**
 * Generate a unique ID
 * @returns {string} - Unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

module.exports = {
  saveSummary,
  getAllSummaries,
  getSummaryById
}; 