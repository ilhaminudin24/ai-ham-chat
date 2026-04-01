# AI-HAM Chat

Modern web chat interface for AI-HAM — powered by MiniMax and Gemini models.

## Features
- 💬 **Modern Dark UI** — Clean, Claude AI-like interface
- 🌙 **Dark Mode Only** — Optimized for comfortable chatting
- 📱 **Mobile Responsive** — Works flawlessly on desktop and mobile (with Sidebar Drawer)
- 🖼️ **Image Upload** — Attach images for AI to analyze
- 📝 **Markdown Support** — Rich text formatting, syntax-highlighted code blocks, tables, and lists
- 🔄 **Multi-turn Conversations** — Persistent chat history per browser session
- ⚡ **Multiple Models** — Switch between MiniMax and Gemini models
- 💾 **Local Storage** — Chat history saved securely in your browser using Zustand

## Supported Models
| Model | Description |
|-------|-------------|
| `MiniMax M2.7` | Latest MiniMax model, great reasoning |
| `MiniMax M2.5` | Balanced performance and speed |
| `Gemini 3 Flash` | Google's fast reasoning model |
| `Gemini 2.5 Flash` | Google's efficient flash model |
| `Gemini 3.1 Pro` | Google's most capable model |

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Zustand
- **Backend**: Node.js simple HTTP server (for serving static build and token injection)
- **Proxy**: Caddy (Let's Encrypt SSL)
- **AI**: OpenClaw Gateway + MiniMax/Gemini

## Setup & Deployment

### Prerequisites
- Node.js 18+
- OpenClaw Gateway running with OpenAI HTTP API enabled
- Reverse proxy (Caddy/Nginx) for HTTPS

### 1. Clone & Install
```bash
git clone https://github.com/ilhaminudin24/ai-ham-chat.git
cd ai-ham-chat
npm install
```

### 2. Setup Environment Variables
Copy the example env file and add your credentials:
```bash
cp .env.example .env
nano .env  # Edit GATEWAY_TOKEN
```

Or create manually:
```bash
echo 'GATEWAY_TOKEN=your_openclaw_gateway_token' > .env
```

### 3. Build Frontend (Required for production)
```bash
npm run build
```

### 4. Run with Systemd
```bash
sudo systemctl enable aiham-chat
sudo systemctl start aiham-chat
```

### Caddy Configuration
```caddyfile
chat.yourdomain.com {
    reverse_proxy localhost:3000
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GATEWAY_TOKEN` | OpenClaw Gateway Bearer token | ✅ Yes |

See [`.env.example`](.env.example) for reference.

## API
The chat connects to OpenClaw Gateway's OpenAI-compatible endpoint:
- **Endpoint**: `/v1/chat/completions`
- **Auth**: Bearer token (gateway token injected via `server.cjs`)
- **Model Override**: `x-openclaw-model` header

## Project Structure
```
ai-ham-chat/
├── src/
│   ├── components/  # Nav, ChatArea, Input, MessageBubble
│   ├── store/       # Zustand store (chatStore.ts)
│   ├── styles/      # CSS modules
│   ├── utils/       # API layer (fetch stream logic)
│   ├── App.tsx      # Main application layout
│   └── main.tsx     # React entry point
├── dist/            # Production build output (after npm run build)
├── index.html       # Vite entry point
├── server.cjs       # Node.js backend (serves /dist + injects config)
├── .env             # Environment variables (gitignored)
├── .env.example     # Template for environment variables
└── README.md        # This file
```

## Local Development
```bash
npm install
npm run dev
```
*(Note: For full functionality including token injection, use the production build flow above.)*

## License
MIT License — Built for boss Ilham's personal use.
