# AI-HAM Chat

Modern web chat interface for AI-HAM — powered by **MiniMax**, **Google Gemini**, and **GitHub Copilot** models. Built for boss Ilham's personal use, deployed at [chat.ilhmndn.site](https://chat.ilhmndn.site).

---

## ✨ Features

### 💬 Core Chat
- **Modern Dark UI** — Clean, Claude AI-inspired interface with comfortable dark theme
- **Image Upload** — Attach images for AI to analyze (drag & drop or click to upload)
- **PDF Upload** — Upload PDF files with automatic text extraction using pdfjs-dist
- **Markdown Support** — Rich text rendering with syntax-highlighted code blocks, tables, GFM checklists
- **Multi-turn Conversations** — Persistent chat history with Supabase cloud sync
- **Message Editing** — Edit any of your previous messages and regenerate the AI response

### 🤖 AI Models (13 Models Available)

| Provider | Model | Description |
|----------|-------|-------------|
| **MiniMax** | M2.7 | Latest MiniMax flagship model |
| | M2.5 | Balanced MiniMax performance |
| **Google Gemini** | 3 Flash | Google's fast reasoning model |
| | 2.5 Flash | Google's efficient flash model |
| | 3.1 Pro | Google's most capable model |
| **GitHub Copilot** | GPT-5 Mini | OpenAI's latest mini model |
| | GPT-4.1 | OpenAI's GPT-4 model |
| | Claude Haiku 4.5 | Anthropic's fast model |
| | Claude Opus 4.6 | Anthropic's most capable model |
| | Claude Sonnet 4.6 | Anthropic's balanced model |
| | GPT-5.4 | OpenAI's GPT-5 model |
| | GPT-5.3 Codex | OpenAI's coding-focused model |
| | Grok Code Fast | xAI's fast coding model |

### 🌿 Branch Threads
Create alternative conversation branches from any point in your chat. Experiment with different prompts without losing your main conversation.

- **Branch from any message** — Right-click or use the branch button to fork
- **Switch between branches** — Easy panel to navigate branches
- **Delete branches** — Clean up unwanted experiment branches
- **Main thread preserved** — Original conversation always safe

### 🔗 Shared Links
Generate shareable read-only links for any conversation. Perfect for sharing interesting AI conversations with others.

- **One-click share** — Generate a link instantly
- **Read-only view** — Recipients can read but not interact
- **Server-side storage** — Shared conversations stored on the server

### 📊 Usage Stats
Monitor your AI usage with built-in statistics.

- **Per-conversation stats** — See token estimate for current chat
- **Daily tracking** — Daily message and token counts
- **All-time totals** — Lifetime usage dashboard

### 💡 Smart Follow-up Suggestions
After each AI response, generate 2-3 follow-up question suggestions automatically.

- **AI-generated suggestions** — Based on conversation context
- **Quick actions** — "Jelaskan Lebih", "Buat Lebih Simple", "Translate"
- **Toggle translate** — Switch between 🇺🇸 EN ↔ 🇮🇩 ID

### 📝 Auto-Title Generation
Automatically generate smart conversation titles after the first AI response.

- **Smart title generation** — Uses AI to summarize conversation topic
- **Language detection** — Automatically detects Indonesian/English
- **Manual override** — Users can accept or dismiss suggested titles

### 🔐 Authentication
Login and register with Supabase for cloud-based conversation sync.

- **Email/Password auth** — Supabase authentication
- **Session persistence** — Auto-login on return visits
- **Logout button** — Clear session when needed

### ☁️ Supabase Cloud Sync
All conversations are synced to Supabase cloud database.

- **Real-time sync** — Conversations sync automatically
- **Cross-device** — Access conversations from any device
- **Offline support** — LocalStorage fallback when offline

### ⌨️ Productivity
- **⚡ Model Quick Switcher** — `Cmd/Ctrl + K` to instantly switch models or conversations
- **🔧 Skills Panel** — Browse and manage OpenClaw skills
- **📋 Templates** — Pre-built prompt templates (click to populate input, then edit before sending)
- **⚙️ Settings Panel** — Customize your experience
- **⌨️ Keyboard Shortcuts** — Full keyboard navigation support

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open Quick Switcher |
| `Cmd/Ctrl + N` | New Conversation |
| `Cmd/Ctrl + Shift + C` | Copy last AI response |
| `Cmd/Ctrl + /` | Show shortcuts help |
| `Escape` | Close modals |

### 📱 Mobile Optimized
Fully responsive design with mobile-specific fixes:
- Sidebar drawer for mobile navigation
- Proper overflow handling for tables and code blocks on small screens
- iOS zoom prevention (16px minimum font on inputs)
- Touch-friendly tap targets

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite |
| **State** | Zustand (LocalStorage + Supabase persistence) |
| **Markdown** | react-markdown + remark-gfm + react-syntax-highlighter |
| **Icons** | lucide-react |
| **Backend** | Express.js (server.js) |
| **Database** | Supabase (cloud sync) |
| **PDF** | pdfjs-dist |
| **Proxy/SSL** | Caddy (Let's Encrypt) |
| **AI Engine** | OpenClaw Gateway + MiniMax/Gemini/GitHub Copilot |

---

## 🚀 Deployment

### Prerequisites
- Node.js 18+
- OpenClaw Gateway with OpenAI-compatible HTTP API enabled
- Domain with DNS pointing to your server
- Reverse proxy (Caddy/Nginx) for HTTPS
- Supabase project (optional for cloud sync)

### 1. Clone & Install
```bash
git clone https://github.com/ilhaminudin24/ai-ham-chat.git
cd ai-ham-chat
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
nano .env
```

Add your configuration:
```bash
# OpenClaw Gateway Token
GATEWAY_TOKEN=your_openclaw_gateway_token

# Supabase Credentials (optional for cloud sync)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Build for Production
```bash
npm run build
```

### 4. Run with Systemd
```bash
sudo cp aiham-chat.service /etc/systemd/system/
sudo systemctl enable aiham-chat
sudo systemctl start aiham-chat
```

### 5. Caddy Configuration
```caddyfile
chat.ilhmndn.site {
    reverse_proxy localhost:3000
}
```

---

## 📁 Project Structure

```
ai-ham-chat/
├── src/
│   ├── components/
│   │   ├── Auth.tsx              # Login/Register with Supabase
│   │   ├── BranchPanel.tsx      # Branch thread management
│   │   ├── ChatArea.tsx         # Main chat view
│   │   ├── ChatInput.tsx        # Message input with image/pdf upload
│   │   ├── ChainsPanel.tsx      # Prompt chain management
│   │   ├── EditMessageModal.tsx # Message editing
│   │   ├── MessageBubble.tsx     # Chat message with markdown
│   │   ├── QuickSwitcher.tsx    # Cmd+K switcher
│   │   ├── RenameModal.tsx      # Conversation renaming
│   │   ├── Settings.tsx         # Settings panel
│   │   ├── SharedChatView.tsx   # Read-only shared view
│   │   ├── SharedLinkModal.tsx  # Shared link generation
│   │   ├── ShortcutsHelp.tsx    # Keyboard shortcuts reference
│   │   ├── Sidebar.tsx          # Conversation list + navigation
│   │   ├── SkillsPanel.tsx      # OpenClaw skills browser
│   │   ├── SuggestionChips.tsx # Follow-up suggestions
│   │   ├── TemplatesPanel.tsx  # Prompt templates
│   │   └── UsageStatsPanel.tsx # Usage statistics
│   ├── store/
│   │   └── chatStore.ts         # Zustand store with Supabase sync
│   ├── utils/
│   │   ├── api.ts               # Chat API + title/suggestions generation
│   │   ├── pdf.ts               # PDF text extraction
│   │   ├── suggestions.ts       # Follow-up suggestions
│   │   ├── supabase.ts          # Supabase client
│   │   ├── title.ts             # Auto-title generation
│   │   └── clipboard.ts        # Copy utilities
│   ├── styles/
│   │   └── variables.css       # CSS custom properties
│   ├── types/
│   │   └── features.ts          # TypeScript interfaces
│   ├── App.tsx                  # Root component with auth routing
│   └── main.tsx                 # React entry point
├── server.js                    # Express.js backend (port 3000)
├── index.html                   # Vite entry
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🔌 API Reference

The chat connects to the OpenClaw Gateway's OpenAI-compatible endpoint:

```
POST /v1/chat/completions
Headers:
  Authorization: Bearer <GATEWAY_TOKEN>
  Content-Type: application/json
  x-openclaw-model: <model-name>  (optional override)
```

### Server API Endpoints (Express.js)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/skills` | List all OpenClaw skills |
| `GET` | `/api/skills/:id` | Get skill details |
| `POST` | `/api/skills` | Create new skill |
| `PUT` | `/api/skills/:id` | Update skill |
| `PUT` | `/api/skills/:id/toggle` | Toggle skill enabled |
| `DELETE` | `/api/skills/:id` | Delete skill |
| `GET` | `/api/skills/export` | Export all skills |
| `POST` | `/api/shared` | Create shared link |
| `GET` | `/api/shared/:id` | Get shared conversation |
| `DELETE` | `/api/shared/:id` | Delete shared conversation |
| `GET` | `/` | Serve static files (SPA fallback) |
| `GET` | `/share/:id` | SPA fallback for shared links |

---

## 🧪 Local Development

```bash
npm install
npm run dev
```

> **Note:** Full functionality (token injection, shared links, Supabase sync) requires the production build flow. Development server runs without backend API.

---

## 📜 Changelog (2026)

### v2026.04.04
- **feat:** Add GitHub Copilot models (GPT-5 Mini, GPT-4.1, Claude Haiku/Opus/Sonnet, GPT-5.4/5.3, Grok)
- **feat:** Implement Supabase cloud sync for conversation persistence
- **feat:** Add authentication (Login/Register) with Supabase
- **feat:** Implement Express.js backend (server.js)
- **feat:** Add Prompt Chain management system
- **feat:** Responsive sidebar with folder management
- **feat:** Auto-title generation after first AI response
- **feat:** Follow-up suggestions (AI-generated + quick actions)

### v2026.04.02
- **feat:** Branch Thread — create, switch, and delete conversation branches
- **feat:** Shared Links — generate read-only shareable links for conversations
- **feat:** Usage Stats — track messages, tokens, and conversations
- **fix:** PDF upload with text extraction using pdfjs-dist
- **fix:** Mobile responsiveness improvements

### Earlier
- Modern dark UI with Claude AI-inspired design
- Image upload with drag & drop
- Markdown support with code highlighting
- Keyboard shortcuts (Cmd+K, Cmd+N, etc.)
- Skills panel and templates
- Multiple AI models (MiniMax, Gemini)

---

## 📄 License

MIT License — Built with ❤️ for boss Ilham.