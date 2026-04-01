# AI-HAM Chat

Modern web chat interface for AI-HAM — powered by MiniMax and Gemini models.

![AI-HAM Chat Preview](https://via.placeholder.com/800x400?text=AI-HAM+Chat+Preview)

## Features
💬 **Modern Dark UI** — Clean, Claude AI-like interface
🌙 **Dark Mode Only** — Optimized for comfortable chatting
📱 **Mobile Responsive** — Works flawlessly on desktop and mobile (with Sidebar Drawer)
🖼️ **Image Upload** — Attach images for AI to analyze
📝 **Markdown Support** — Rich text formatting, syntax-highlighted code blocks, tables, and lists
🔄 **Multi-turn Conversations** — Persistent chat history per browser session
⚡ **Multiple Models** — Switch between MiniMax and Gemini models
💾 **Local Storage** — Chat history saved securely in your browser using Zustand

## Supported Models
| Model                | Description                                       |
| -------------------- | ------------------------------------------------- |
| `MiniMax M2.7`       | Latest MiniMax model, great reasoning             |
| `MiniMax M2.5`       | Balanced performance and speed                    |
| `Gemini 3 Flash`     | Google's fast reasoning model                     |
| `Gemini 2.5 Flash`   | Google's efficient flash model                    |
| `Gemini 3.1 Pro`     | Google's most capable model                       |

## Tech Stack
- **Frontend** : React 18, TypeScript, Vite, Zustand (State Management), Vanilla CSS Modules
- **Backend** : Node.js simple HTTP server (for serving static build and token injection)
- **Proxy**: Caddy (Let's Encrypt SSL)
- **AI**: OpenClaw Gateway + MiniMax/Gemini

## Setup & Deployment

### Prerequisites
- Node.js 18+
- OpenClaw Gateway running with OpenAI HTTP API enabled
- Reverse proxy (Caddy/Nginx) for HTTPS

### Local Development
For development, use the Vite dev server for Hot Module Replacement (HMR):
```bash
git clone <repository-url>
cd ai-ham-chat
npm install
npm run dev
```
*(Note: API token injection relies on `server.js`. In Vite dev mode, set your `VITE_API_TOKEN` environment variable manually to test without the backend injector).*

### Production Deployment (Server Instructions)
When deploying to your production server (e.g., `/var/www/chat.ilhmndn.site`), you **must** build the frontend first before starting the Node.js server.

1. **Pull and Install Dependencies**
   ```bash
   cd /var/www/chat.ilhmndn.site
   npm install
   ```

2. **Build the Frontend (CRITICAL)**
   ```bash
   npm run build
   ```
   *This compiles the React app into the `/dist` folder so `server.js` can serve it.*

3. **Set Environment Variables**
   ```bash
   export GATEWAY_TOKEN="your-openclaw-gateway-token"
   ```

4. **Run with Systemd**
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

## API
The chat connects to OpenClaw Gateway's OpenAI-compatible endpoint:
- **Endpoint:** `/v1/chat/completions`
- **Auth:** Bearer token (gateway token injected via HTML comment by `server.js`)
- **Model Override:** `x-openclaw-model` header

## Project Structure
```text
ai-ham-chat/
├── src/
│   ├── components/  # Nav, ChatArea, Input, MessageBubble
│   ├── store/       # Zustand store (chatStore.ts)
│   ├── styles/      # CSS variables and modules
│   ├── utils/       # API layer (fetch stream logic)
│   ├── App.tsx      # Main application layout
│   └── main.tsx     # React entry point
├── dist/            # Production build output (created after npm run build)
├── index.html       # Vite entry point (contains INJECT_CONFIG placeholder)
├── server.js        # Node.js backend to serve /dist and inject config
└── README.md        # This file
```

## License
MIT License — Built for boss Ilham's personal use.
