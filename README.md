# AI-HAM Chat

Modern web chat interface for AI-HAM — powered by **MiniMax** and **Gemini** models. Built for boss Ilham's personal use, deployed at [chat.ilhmndn.site](https://chat.ilhmndn.site).

---

## ✨ Features

### 💬 Core Chat
- **Modern Dark UI** — Clean, Claude AI-inspired interface with comfortable dark theme
- **Image Upload** — Attach images for AI to analyze (drag & drop or click to upload)
- **Markdown Support** — Rich text rendering with syntax-highlighted code blocks, tables, GFM checklists
- **Multi-turn Conversations** — Persistent chat history per browser session via Zustand + LocalStorage
- **Message Editing** — Edit any of your previous messages and regenerate the AI response

### 🌿 Branch Threads *(New!)*
Create alternative conversation branches from any point in your chat. Experiment with different prompts without losing your main conversation.

- **Branch from any message** — Right-click or use the branch button to fork
- **Switch between branches** — Easy panel to navigate branches
- **Delete branches** — Clean up unwanted experiment branches
- **Main thread preserved** — Original conversation always safe

### 🔗 Shared Links *(New!)*
Generate shareable read-only links for any conversation. Perfect for sharing interesting AI conversations with others.

- **One-click share** — Generate a link instantly
- **Read-only view** — Recipients can read but not interact
- **Server-side storage** — Shared conversations stored on the server

### 📊 Usage Stats *(New!)*
Monitor your AI usage with built-in statistics.

- **Per-conversation stats** — See token estimate for current chat
- **Daily tracking** — Daily message and token counts
- **All-time totals** — Lifetime usage dashboard
- **Token estimation** — Rough estimation based on message count

### ⌨️ Productivity
- **🌐 Multi-model Support** — Switch between MiniMax and Gemini models on the fly
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

### 📱 Mobile Optimized *(New!)*
Fully responsive design with mobile-specific fixes:
- Sidebar drawer for mobile navigation
- Proper overflow handling for tables and code blocks on small screens
- iOS zoom prevention (16px minimum font on inputs)
- Touch-friendly tap targets

---

## 🤖 Supported Models

| Model | Description |
|-------|-------------|
| `MiniMax M2.7` | Latest MiniMax flagship model |
| `MiniMax M2.5` | Balanced MiniMax performance |
| `Gemini 3 Flash` | Google's fast reasoning model |
| `Gemini 2.5 Flash` | Google's efficient flash model |
| `Gemini 3.1 Pro` | Google's most capable model |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite |
| **State** | Zustand (Cloud synced via Supabase) |
| **Database & Auth**| Supabase (PostgreSQL) |
| **Markdown** | react-markdown + remark-gfm + react-syntax-highlighter |
| **Icons** | lucide-react |
| **Backend** | Node.js + Express.js (static file server + API proxy) |
| **Proxy/SSL** | Caddy (Let's Encrypt) |
| **AI Engine** | OpenClaw Gateway + MiniMax/Gemini |

---

## 🚀 Deployment

### Prerequisites
- Node.js 18+
- OpenClaw Gateway with OpenAI-compatible HTTP API enabled
- Domain with DNS pointing to your server
- Reverse proxy (Caddy/Nginx) for HTTPS

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

Add your gateway token and Supabase credentials:
```bash
GATEWAY_TOKEN=your_openclaw_gateway_token
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Build for Production
```bash
npm run build
```

### 4. Run with Systemd
```bash
sudo systemctl enable aiham-chat
sudo systemctl start aiham-chat
```

### 5. Caddy Configuration
```caddyfile
chat.ilhmndn.site {
    reverse_proxy localhost:3000
}
```

> **Note:** The server runs on port 3000 by default and injects the `GATEWAY_TOKEN` server-side (never exposed to the browser).

---

## 📁 Project Structure

```
ai-ham-chat/
├── src/
│   ├── components/
│   │   ├── Auth.tsx              # 🔒 Supabase Login/Register
│   │   ├── BranchPanel.tsx       # 🌿 Branch thread management
│   │   ├── ChatArea.tsx          # Main chat view
│   │   ├── ChatInput.tsx         # Message input with image upload
│   │   ├── EditMessageModal.tsx  # Message editing
│   │   ├── MessageBubble.tsx     # Chat message with markdown
│   │   ├── QuickSwitcher.tsx     # ⌨️ Cmd+K switcher
│   │   ├── RenameModal.tsx       # Conversation renaming
│   │   ├── Settings.tsx          # ⚙️ Settings panel
│   │   ├── SharedLinkModal.tsx   # 🔗 Shared link generation
│   │   ├── ShortcutsHelp.tsx     # ⌨️ Shortcuts reference
│   │   ├── Sidebar.tsx           # Conversation list + navigation
│   │   ├── SkillsPanel.tsx       # 🔧 OpenClaw skills browser
│   │   ├── TemplatesPanel.tsx    # 📋 Prompt templates
│   │   └── UsageStatsPanel.tsx   # 📊 Usage statistics
│   ├── store/
│   │   └── chatStore.ts          # Zustand store (all state)
│   ├── styles/
│   │   └── variables.css         # CSS custom properties
│   ├── types/
│   │   └── features.ts           # TypeScript interfaces
│   ├── utils/
│   │   ├── supabase.ts           # Supabase client config
│   │   └── syncStore.ts          # Zustand to Supabase cloud sync
│   ├── App.tsx                   # Root component
│   └── main.tsx                  # React entry point
├── server.js                     # Express.js backend (port 3000)
├── index.html                    # Vite entry
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

### Server API Endpoints

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

---

## 🧪 Local Development

```bash
npm install
npm run dev
```

> **Note:** Full functionality (token injection, shared links) requires the production build flow. Development server runs without backend API.

---

## 📜 Recent Changelog

### v2026.04.04 (Major Architecture Upgrade)
- **feat:** Supabase Integration — Conversation history now syncs to the cloud securely
- **feat:** Authentication — Added Login/Signup gateway using Supabase Auth
- **refactor:** Express.js Backend — Upgraded local HTTP server to a production-ready Express framework (with CORS & Helmet)
- **feat:** Background Sync — Zustand state changes automatically upsert into Postgres

### v2026.04.02
- **feat:** Branch Thread — create, switch, and delete conversation branches
- **feat:** Shared Links — generate read-only shareable links for conversations
- **feat:** Usage Stats — track messages, tokens, and conversations
- **fix:** Template click now populates input directly (no auto-send)
- **fix:** Mobile responsiveness improvements (table overflow, iOS zoom prevention, responsive padding)

---

## 📄 License

MIT License — Built with ❤️ for boss Ilham.
