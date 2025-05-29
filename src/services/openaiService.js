const { OpenAI } = require('openai');
const fs = require('fs');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe audio file using OpenAI's Whisper API
 * @param {string} audioFilePath - Path to the audio file
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(audioFilePath) {
  try {
    const audioStream = fs.createReadStream(audioFilePath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
    });
    
    return transcription.text;
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Summarize medical meeting transcription using OpenAI's GPT model
 * @param {string} transcription - The text to summarize
 * @returns {Promise<object>} - Summary and key points
 */
async function summarizeTranscription(transcription) {
  try {
    const prompt = `
    You are a medical professional assistant tasked with summarizing a medical meeting. 
    Please provide a concise summary of the following medical meeting transcription, 
    highlighting key clinical decisions, action items, and important medical information discussed.
    
    Format your response as JSON with the following structure:
    {
      "summary": "A concise 2-3 paragraph summary",
      "keyPoints": ["Point 1", "Point 2", ...],
      "actionItems": ["Action 1", "Action 2", ...],
      "medicalTerms": [{"term": "Term 1", "definition": "Definition 1"}, ...]
    }
    
    Transcription:
    ${transcription}
    `;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a medical professional assistant that helps summarize medical meetings accurately and concisely.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    // Parse the JSON response
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error in summarizeTranscription:', error);
    throw new Error(`Failed to summarize transcription: ${error.message}`);
  }
}

module.exports = {
  transcribeAudio,
  summarizeTranscription
}; 