const { OpenAI } = require('openai');
const fs = require('fs');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe audio file using OpenAI's Whisper API
 * @param {Buffer|string} audioInput - Audio buffer or file path
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(audioInput) {
  try {
    let file;
    if (Buffer.isBuffer(audioInput)) {
      // If input is a buffer, create a File object
      file = new File([audioInput], 'audio.webm', { type: 'audio/webm' });
    } else if (typeof audioInput === 'string') {
      // If input is a file path, create a read stream
      file = fs.createReadStream(audioInput);
    } else {
      throw new Error('Invalid audio input type');
    }
    
    const transcription = await openai.audio.transcriptions.create({
      file: file,
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a medical professional assistant that summarizes medical conversations. 
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
          role: 'user',
          content: `Please summarize this medical conversation: ${transcription}`
        }
      ],
      temperature: 0.3
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error in summarizeTranscription:', error);
    throw new Error(`Failed to summarize transcription: ${error.message}`);
  }
}

module.exports = {
  transcribeAudio,
  summarizeTranscription
}; 