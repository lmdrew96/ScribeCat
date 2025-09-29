# ScribeCat Local Hosting Setup 🚀

## Overview

ScribeCat now includes a **local backend server** on port 3011 to handle AI API calls, enabling the AskAI chat feature to work without hosting issues.

## Quick Start

### 🚀 **One-Click Launch**
Double-click the `🚀 Start Safe Dev.command` file to launch both:
- **Backend Server** (port 3011) - Handles AI API calls
- **Electron App** - Main ScribeCat interface

### 📋 **Manual Launch**

**Option 1: Full Development Mode**
```bash
npm run dev:full
```
Starts both server and Electron app concurrently.

**Option 2: Separate Windows**
```bash
# Terminal 1: Start backend server
npm run server

# Terminal 2: Start Electron app
npm run dev
```

## 🔧 **Server Configuration**

### Environment Setup
**Option 1: Use .env file (Recommended)**
```bash
# Edit your .env file
nano .env

# Add your Claude API key
CLAUDE_API_KEY=your-claude-api-key-here
```

**Option 2: Export directly**
```bash
export CLAUDE_API_KEY="your-claude-api-key-here"
```

The server automatically loads `.env` files using dotenv.

### Server Features
- **Port**: 3011 (configurable)
- **CORS**: Enabled for cross-origin requests
- **Static Files**: Serves app assets
- **API Endpoints**: Claude AI integration

## 🌐 **API Endpoints**

### Health Check
```
GET /api/health
```
Returns server status and API key configuration.

### AI Chat
```
POST /api/chat
{
  "question": "Your question here",
  "notesContent": "Current notes...",
  "transcriptionContent": "Current transcription..."
}
```

### AI Summary
```
POST /api/summary
{
  "notesContent": "Notes to summarize...",
  "transcriptionContent": "Transcription to summarize..."
}
```

### AI Blurb Generation
```
POST /api/blurb
{
  "notesContent": "Notes content...",
  "transcriptionContent": "Transcription content..."
}
```

### Auto-Polish
```
POST /api/polish
{
  "originalText": "Text to polish...",
  "context": "Previous conversation context..."
}
```

## 🔒 **Security Features**

- **CORS Protection**: Configurable origin restrictions
- **Input Validation**: Request body validation
- **Error Handling**: Graceful error responses with fallbacks
- **Environment Variables**: Secure API key management

## 🚀 **Production Deployment**

### Environment Variables
```bash
CLAUDE_API_KEY=your-production-api-key
PORT=3011
NODE_ENV=production
```

### Docker Deployment (Future)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3011
CMD ["npm", "run", "server"]
```

### Cloud Deployment Options
- **Heroku**: `git push heroku main`
- **Vercel**: `vercel deploy`
- **Railway**: Connect GitHub repository
- **AWS/GCP/Azure**: Container deployment

## 🛠 **Development**

### Local Testing
```bash
# Test server health
curl http://localhost:3011/api/health

# Test AI chat (requires API key)
curl -X POST http://localhost:3011/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Hello","notesContent":"","transcriptionContent":""}'
```

### Integration with Electron
The Electron renderer automatically connects to `http://localhost:3011` for AI features. No additional configuration needed.

## 📋 **Troubleshooting**

### Common Issues

**❌ "Backend server not running"**
- Ensure server is started: `npm run server`
- Check port 3011 is available
- Verify no firewall blocking

**❌ "Claude API error: 401"**
- Add `CLAUDE_API_KEY=your-key-here` to your `.env` file
- OR export `CLAUDE_API_KEY` environment variable
- Verify API key is valid at console.anthropic.com
- Check Anthropic Console for quota limits

**❌ "Failed to fetch"**
- Confirm server URL: http://localhost:3011
- Check CORS settings
- Verify network connectivity

### Debug Mode
```bash
DEBUG=scribecat:* npm run server
```

## ✨ **Benefits**

✅ **No 401 Errors** - Proper API authentication handling  
✅ **Local Development** - Works offline with cached responses  
✅ **Easy Deployment** - Ready for cloud hosting  
✅ **Secure** - API keys never exposed to frontend  
✅ **Scalable** - Supports multiple concurrent users  
✅ **Fallback Ready** - Graceful error handling with simulation mode

Your AskAI chat now works perfectly! 🎉