# AI-HAM Chat

Modern web chat interface for AI-HAM — powered by MiniMax and Gemini models.

![AI-HAM Chat Preview](https://img.shields.io/badge/AI-HAM-Chat-10a37f?style=for-the-badge)

## Features

- 💬 **Modern Dark UI** — Clean, ChatGPT-like interface
- 🌙 **Dark Mode Only** — Optimized for comfortable chatting
- 📱 **Mobile Responsive** — Works on desktop and mobile
- 🖼️ **Image Upload** — Attach images for AI to analyze
- 📝 **Markdown Support** — Rich text formatting, code blocks, lists
- 🔄 **Multi-turn Conversations** — Persistent chat history per browser
- ⚡ **Multiple Models** — Switch between MiniMax and Gemini models
- 💾 **Local Storage** — Chat history saved in browser

## Supported Models

| Model | Description |
|-------|-------------|
| **MiniMax M2.7** | Latest MiniMax model, great reasoning |
| **MiniMax M2.5** | Balanced performance and speed |
| **Gemini 3 Flash** | Google's fast reasoning model |
| **Gemini 2.5 Flash** | Google's efficient flash model |
| **Gemini 3.1 Pro** | Google's most capable model |

## Setup

### Prerequisites

- Node.js 18+ (for local development)
- OpenClaw Gateway running with OpenAI HTTP API enabled
- Reverse proxy (Caddy/Nginx) for HTTPS

### Local Development

```bash
cd /var/www/chat.ilhmndn.site
npm install
node server.js
```

### Production Deployment

1. Configure your reverse proxy to point to port 3000
2. Set `GATEWAY_TOKEN` environment variable:
   ```bash
   export GATEWAY_TOKEN="your-openclaw-gateway-token"
   ```

3. Run with systemd:
   ```bash
   sudo systemctl enable aiham-chat
   sudo systemctl start aiham-chat
   ```

### Caddy Configuration

```caddy
chat.yourdomain.com {
    reverse_proxy localhost:3000
}
```

## API

The chat connects to OpenClaw Gateway's OpenAI-compatible endpoint:

- **Endpoint**: `/v1/chat/completions`
- **Auth**: Bearer token (gateway token)
- **Model Override**: `x-openclaw-model` header

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no frameworks)
- **Backend**: Node.js simple HTTP server
- **Proxy**: Caddy (Let's Encrypt SSL)
- **AI**: OpenClaw Gateway + MiniMax/Gemini

## Project Structure

```
├── index.html    # Main chat UI
├── server.js     # Simple Node.js server
└── README.md     # This file
```

## License

MIT License — Built for boss Ilham's personal use.
