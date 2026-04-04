import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const STATIC_DIR = path.join(__dirname, 'dist');
const SKILLS_DIR = path.join(__dirname, 'skills');
const SKILLS_STATE_FILE = path.join(SKILLS_DIR, 'skills-state.json');
const SHARED_DIR = path.join(__dirname, 'shared');
const API_TOKEN = process.env.GATEWAY_TOKEN || '';

// Ensure shared & skills directory exists
if (!fs.existsSync(SHARED_DIR)) {
    fs.mkdirSync(SHARED_DIR, { recursive: true });
}
if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
}

const app = express();

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disabled to allow our inline <script> window.API_TOKEN injection
}));
app.use(cors());
app.use(express.json());

// Helper: Parse frontmatter from markdown
const parseFrontmatter = (content) => {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return null;
    
    const frontmatter = {};
    match[1].split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
            frontmatter[key.trim()] = valueParts.join(':').trim();
        }
    });
    
    return {
        frontmatter,
        content: match[2]
    };
};

// Helper: Read & Write Skills State
const readSkillsState = () => {
    try {
        return JSON.parse(fs.readFileSync(SKILLS_STATE_FILE, 'utf8'));
    } catch (e) {
        return { skills: {}, updatedAt: new Date().toISOString() };
    }
};

const writeSkillsState = (state) => {
    fs.writeFileSync(SKILLS_STATE_FILE, JSON.stringify(state, null, 2));
};

// Helper: Get all skills
const getAllSkills = () => {
    const state = readSkillsState();
    const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'));
    const skills = [];
    
    files.forEach(file => {
        const content = fs.readFileSync(path.join(SKILLS_DIR, file), 'utf8');
        const parsed = parseFrontmatter(content);
        if (parsed && parsed.frontmatter.id) {
            skills.push({
                id: parsed.frontmatter.id,
                name: parsed.frontmatter.name || parsed.frontmatter.id,
                icon: parsed.frontmatter.icon || '📝',
                description: parsed.frontmatter.description || '',
                content: parsed.content.trim(),
                enabled: state.skills[parsed.frontmatter.id] || false
            });
        }
    });
    
    return skills;
};

// Helper: Generate share ID
const generateShareId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// -------------------------------------------------------------------------------- //
// API ROUTES
// -------------------------------------------------------------------------------- //

// GET /api/skills - List all skills
app.get('/api/skills', (req, res) => {
    res.json(getAllSkills());
});

// GET /api/skills/export - Export all skills
app.get('/api/skills/export', (req, res) => {
    res.json(getAllSkills());
});

// GET /api/skills/:id - Get single skill
app.get('/api/skills/:id', (req, res) => {
    const skills = getAllSkills();
    const skill = skills.find(s => s.id === req.params.id);
    if (skill) {
        res.json(skill);
    } else {
        res.status(404).json({ error: 'Skill not found' });
    }
});

// POST /api/skills - Create new skill
app.post('/api/skills', (req, res) => {
    try {
        const data = req.body;
        const id = data.id || data.name.toLowerCase().replace(/\s+/g, '-');
        const filename = path.join(SKILLS_DIR, `${id}.md`);
        
        if (fs.existsSync(filename)) {
            return res.status(409).json({ error: 'Skill already exists' });
        }
        
        const skillContent = `---
id: ${id}
name: ${data.name}
icon: ${data.icon || '📝'}
---

## Description
${data.description || 'No description provided'}

## Rules
- ${data.rules ? data.rules.join('\n- ') : 'Add your rules here'}

## Trigger Keywords
${data.triggerKeywords ? data.triggerKeywords.join(', ') : 'keyword1, keyword2'}
`;
        
        fs.writeFileSync(filename, skillContent);
        
        // Update state
        const state = readSkillsState();
        state.skills[id] = false;
        state.updatedAt = new Date().toISOString();
        writeSkillsState(state);
        
        const skills = getAllSkills();
        const newSkill = skills.find(s => s.id === id);
        
        res.status(201).json(newSkill);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// PUT /api/skills/:id - Update skill
app.put('/api/skills/:id', (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const filename = path.join(SKILLS_DIR, `${id}.md`);
        
        if (!fs.existsSync(filename)) {
            return res.status(404).json({ error: 'Skill not found' });
        }
        
        const content = fs.readFileSync(filename, 'utf8');
        const parsed = parseFrontmatter(content);
        
        const updatedContent = `---
id: ${id}
name: ${data.name || parsed.frontmatter.name}
icon: ${data.icon || parsed.frontmatter.icon || '📝'}
---

${data.content || parsed.content}
`;
        
        fs.writeFileSync(filename, updatedContent);
        
        const skills = getAllSkills();
        const updated = skills.find(s => s.id === id);
        res.json(updated);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// PUT /api/skills/:id/toggle - Toggle skill enabled
app.put('/api/skills/:id/toggle', (req, res) => {
    const id = req.params.id;
    const state = readSkillsState();
    
    // Toggle - if not exists, set to true
    state.skills[id] = !state.skills[id];
    state.updatedAt = new Date().toISOString();
    writeSkillsState(state);
    
    const skills = getAllSkills();
    const skill = skills.find(s => s.id === id);
    res.json(skill);
});

// DELETE /api/skills/:id - Delete skill
app.delete('/api/skills/:id', (req, res) => {
    const id = req.params.id;
    const filename = path.join(SKILLS_DIR, `${id}.md`);
    
    if (!fs.existsSync(filename)) {
        return res.status(404).json({ error: 'Skill not found' });
    }
    
    fs.unlinkSync(filename);
    
    // Update state
    const state = readSkillsState();
    delete state.skills[id];
    state.updatedAt = new Date().toISOString();
    writeSkillsState(state);
    
    res.json({ success: true });
});

// POST /api/shared - Create shared link
app.post('/api/shared', (req, res) => {
    try {
        const data = req.body;
        const shareId = generateShareId();
        const sharedData = {
            id: shareId,
            title: data.title || 'Shared Chat',
            messages: data.messages || [],
            sharedBy: data.sharedBy || 'Anonymous',
            createdAt: new Date().toISOString()
        };
        
        fs.writeFileSync(
            path.join(SHARED_DIR, shareId + '.json'),
            JSON.stringify(sharedData, null, 2)
        );
        
        res.json({ shareId, url: '/share/' + shareId });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// GET /api/shared/:id - Get shared conversation
app.get('/api/shared/:id', (req, res) => {
    const shareId = req.params.id;
    const filePath = path.join(SHARED_DIR, shareId + '.json');
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Shared conversation not found' });
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read shared conversation' });
    }
});

// DELETE /api/shared/:id - Delete shared conversation
app.delete('/api/shared/:id', (req, res) => {
    const shareId = req.params.id;
    const filePath = path.join(SHARED_DIR, shareId + '.json');
    
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    res.json({ success: true });
});


// -------------------------------------------------------------------------------- //
// STATIC FILES & SPA FALLBACK
// -------------------------------------------------------------------------------- //

// Serve static files from 'dist', ignoring default index.html 404 behavior so we can inject config
app.use(express.static(STATIC_DIR, { index: false }));

// Fallback all other routes to SPA index.html
app.get(/.*/, (req, res) => {
    const indexPath = path.join(STATIC_DIR, 'index.html');
    
    fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
            // Usually happens during dev when 'dist' does not exist yet.
            // When using vite dev server, this backend should just act as an API.
            return res.status(404).send('Not Found / Target production dist is not built yet.');
        }
        
        const content = data.replace(
            '<!-- INJECT_CONFIG -->',
            `<script>window.API_TOKEN = '${API_TOKEN}';</script>`
        );
        res.send(content);
    });
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`AI-HAM Chat API server (Express) running on http://127.0.0.1:${PORT}`);
});
