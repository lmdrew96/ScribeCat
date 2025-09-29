// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3011;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'src', 'renderer')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Environment variables for Claude API
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.SCRIBECAT_CLAUDE_KEY;

// Helper function to call Claude API
async function callClaudeAPI(messages, maxTokens = 1200, temperature = 0.7) {
  if (!CLAUDE_API_KEY) {
    throw new Error('Claude API key not configured. Set CLAUDE_API_KEY environment variable.');
  }

  const fetch = (await import('node-fetch')).default;
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature: temperature,
      messages: messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || 'No response content';
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    hasClaudeKey: !!CLAUDE_API_KEY 
  });
});

// Claude API proxy endpoint for AI chat
app.post('/api/chat', async (req, res) => {
  try {
    const { question, notesContent, transcriptionContent } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const context = `Notes: ${notesContent || 'No notes available'}\n\nTranscription: ${transcriptionContent || 'No transcription available'}`;
    
    const response = await callClaudeAPI([
      {
        role: 'user',
        content: `You are a helpful assistant that analyzes notes and transcriptions to answer questions. Provide concise, relevant answers based on the provided content.\n\nContext: ${context}\n\nQuestion: ${question}`
      }
    ], 500, 0.7);

    res.json({ response });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ 
      error: error.message,
      fallback: 'Sorry, I encountered an error processing your question. Please try again or check your API configuration.'
    });
  }
});

// AI Summary endpoint
app.post('/api/summary', async (req, res) => {
  try {
    const { notesContent, transcriptionContent } = req.body;
    
    const prompt = `Summarize the following notes and transcript. Highlight key topics, phrases, and any due dates. Format the output in rich markdown.\nNotes:\n${notesContent || 'No notes available'}\nTranscript:\n${transcriptionContent || 'No transcription available'}`;
    
    const summary = await callClaudeAPI([
      { role: 'user', content: `You are a helpful assistant that summarizes notes and transcripts in rich markdown.\n\n${prompt}` }
    ], 512, 0.3);

    res.json({ summary });
  } catch (error) {
    console.error('Error in /api/summary:', error);
    res.status(500).json({ 
      error: error.message,
      fallback: '## Summary Unavailable\nSorry, I couldn\'t generate a summary at this time. Please check your API configuration.'
    });
  }
});

// AI Blurb generation endpoint
app.post('/api/blurb', async (req, res) => {
  try {
    const { notesContent, transcriptionContent } = req.body;
    
    const prompt = `Generate a brief 1-6 word description suitable for a filename based on the following notes and transcript content. The response should be concise, descriptive, and use underscores instead of spaces. Focus on the main topic or subject matter.\nNotes:\n${notesContent || ''}\nTranscript:\n${transcriptionContent || ''}`;
    
    const blurb = await callClaudeAPI([
      { role: 'user', content: `You are a helpful assistant that generates brief, descriptive filenames. Respond with only the filename-friendly phrase using underscores instead of spaces, no quotes or extra text.\n\n${prompt}` }
    ], 64, 0.3);

    // Clean up the blurb for filename use
    const cleanBlurb = blurb
      .replace(/[^a-zA-Z0-9\s_-]/g, '') // Remove special characters except spaces, underscores, hyphens
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 50); // Limit length

    res.json({ blurb: cleanBlurb || 'Session_Notes' });
  } catch (error) {
    console.error('Error in /api/blurb:', error);
    res.status(500).json({ 
      error: error.message,
      fallback: 'Session_Notes'
    });
  }
});

// Auto-polish endpoint
app.post('/api/polish', async (req, res) => {
  try {
    const { originalText, context } = req.body;
    
    if (!originalText) {
      return res.status(400).json({ error: 'Original text is required' });
    }

    const prompt = `Polish this transcript for clarity and grammar, keeping context in mind.\nContext: ${context || ''}\nTranscript: ${originalText}`;
    
    const polished = await callClaudeAPI([
      { role: 'user', content: `You are a helpful assistant that polishes transcripts for clarity.\n\n${prompt}` }
    ], 256, 0.3);

    res.json({ polished });
  } catch (error) {
    console.error('Error in /api/polish:', error);
    res.status(500).json({ 
      error: error.message,
      fallback: originalText // Return original text if polishing fails
    });
  }
});

// Serve main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ScribeCat Backend Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 Claude API configured: ${!!CLAUDE_API_KEY ? '✅ Yes' : '❌ No (set CLAUDE_API_KEY)'}`);
  
  if (!CLAUDE_API_KEY) {
    console.log(`⚠️  To enable AI features, set your Claude API key:`);
    console.log(`   export CLAUDE_API_KEY="your-api-key-here"`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 ScribeCat Backend Server shutting down gracefully...');
  process.exit(0);
});

module.exports = app;