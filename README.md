# Meeting Audio Summarizer

A mobile-first web application that converts recorded meeting audio to summaries using OpenAI's API. The application is designed to be HIPAA-compliant and secure.

## Features

- Audio file upload and processing
- Automatic transcription using OpenAI's Whisper model
- Meeting summary generation using GPT-4
- Mobile-first responsive design
- Secure API key handling

## Prerequisites

- Node.js (v14 or higher)
- OpenAI API key

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd meeting-summarizer
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
PORT=3000
```

4. Start the server:
```bash
node server.js
```

5. Open your browser and navigate to `http://localhost:3000`

## Security Considerations

- API keys are stored in environment variables and never exposed in the code
- The application uses HTTPS in production
- File uploads are validated and sanitized
- Rate limiting is implemented to prevent abuse

## Development

To run the application in development mode with auto-reload:

```bash
npm install nodemon --save-dev
nodemon server.js
```

## License

MIT
