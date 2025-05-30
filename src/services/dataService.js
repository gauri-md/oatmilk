const fs = require('fs');
const path = require('path');

// Path to the JSON file that will store summaries
const dataFile = path.join(__dirname, '../../data/summaries.json');
const dataDir = path.dirname(dataFile);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  console.log('Creating data directory:', dataDir);
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure data file exists
if (!fs.existsSync(dataFile)) {
  console.log('Creating summaries file:', dataFile);
  fs.writeFileSync(dataFile, JSON.stringify([], null, 2));
}

/**
 * Generate a unique ID for a summary
 * @returns {string} - Unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Save a new summary to storage
 * @param {object} summaryData - Summary data to save
 * @returns {object} - Saved summary with ID
 */
function saveSummary(summaryData) {
  console.log('Saving summary:', summaryData);
  
  try {
    // Read existing summaries
    const summaries = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    
    // Create new summary with ID and timestamp
    const newSummary = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...summaryData
    };
    
    console.log('Created new summary:', newSummary);
    
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
function getSummaries() {
  try {
    const summaries = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    console.log(`Retrieved ${summaries.length} summaries`);
    return summaries;
  } catch (error) {
    console.error('Error in getSummaries:', error);
    throw new Error(`Failed to get summaries: ${error.message}`);
  }
}

/**
 * Get a specific summary by ID
 * @param {string} id - Summary ID
 * @returns {object|null} - Summary object or null if not found
 */
function getSummaryById(id) {
  try {
    const summaries = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const summary = summaries.find(s => s.id === id);
    
    if (summary) {
      console.log('Retrieved summary by ID:', id);
    } else {
      console.log('Summary not found:', id);
    }
    
    return summary || null;
  } catch (error) {
    console.error('Error in getSummaryById:', error);
    throw new Error(`Failed to get summary: ${error.message}`);
  }
}

module.exports = {
  saveSummary,
  getSummaries,
  getSummaryById
}; 