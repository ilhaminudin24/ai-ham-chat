const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const STATIC_DIR = path.join(__dirname, 'dist');
const SKILLS_DIR = path.join(__dirname, 'skills');
const SKILLS_STATE_FILE = path.join(SKILLS_DIR, 'skills-state.json');
const API_TOKEN = process.env.GATEWAY_TOKEN;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

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

// Helper: Read skills state
const readSkillsState = () => {
    try {
        return JSON.parse(fs.readFileSync(SKILLS_STATE_FILE, 'utf8'));
    } catch (e) {
        return { skills: {}, updatedAt: new Date().toISOString() };
    }
};

// Helper: Write skills state
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

// API Handler
const handleApi = (req, res, urlPath, method) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Parse URL
    const url = new URL(urlPath, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    
    // GET /api/skills - List all skills
    if (method === 'GET' && pathname === '/api/skills') {
        const skills = getAllSkills();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(skills));
        return;
    }
    
    // GET /api/skills/:id - Get single skill
    if (method === 'GET' && pathname.startsWith('/api/skills/')) {
        const id = pathname.split('/')[3];
        const skills = getAllSkills();
        const skill = skills.find(s => s.id === id);
        if (skill) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(skill));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Skill not found' }));
        }
        return;
    }
    
    // POST /api/skills - Create new skill
    if (method === 'POST' && pathname === '/api/skills') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const id = data.id || data.name.toLowerCase().replace(/\s+/g, '-');
                const filename = path.join(SKILLS_DIR, `${id}.md`);
                
                if (fs.existsSync(filename)) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Skill already exists' }));
                    return;
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
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(newSkill));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }
    
    // PUT /api/skills/:id - Update skill
    if (method === 'PUT' && pathname.startsWith('/api/skills/')) {
        const id = pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const filename = path.join(SKILLS_DIR, `${id}.md`);
                
                if (!fs.existsSync(filename)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Skill not found' }));
                    return;
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
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(updated));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }
    
    // PUT /api/skills/:id/toggle - Toggle skill enabled
    if (method === 'PUT' && pathname === `/api/skills/${pathname.split('/')[3]}/toggle`) {
        const id = pathname.split('/')[3];
        const state = readSkillsState();
        
        // Toggle - if not exists, set to true
        state.skills[id] = !state.skills[id];
        state.updatedAt = new Date().toISOString();
        writeSkillsState(state);
        
        const skills = getAllSkills();
        const skill = skills.find(s => s.id === id);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(skill));
        return;
    }
    
    // DELETE /api/skills/:id - Delete skill
    if (method === 'DELETE' && pathname.startsWith('/api/skills/')) {
        const id = pathname.split('/')[3];
        const filename = path.join(SKILLS_DIR, `${id}.md`);
        
        if (!fs.existsSync(filename)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Skill not found' }));
            return;
        }
        
        fs.unlinkSync(filename);
        
        // Update state
        const state = readSkillsState();
        delete state.skills[id];
        state.updatedAt = new Date().toISOString();
        writeSkillsState(state);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }
    
    // Export all skills
    if (method === 'GET' && pathname === '/api/skills/export') {
        const skills = getAllSkills();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(skills, null, 2));
        return;
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
};

const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    
    // API routes
    if (urlPath.startsWith('/api/')) {
        handleApi(req, res, urlPath, req.method);
        return;
    }
    
    // Static files
    let filePath = urlPath === '/' ? '/index.html' : urlPath;
    filePath = filePath.split('?')[0];
    filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(STATIC_DIR, filePath);
    
    fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
        }
        
        const ext = path.extname(fullPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        
        fs.readFile(fullPath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
                return;
            }
            
            let content = data;
            
            if (ext === '.html') {
                content = data.toString().replace(
                    '<!-- INJECT_CONFIG -->',
                    `<script>window.API_TOKEN = '${API_TOKEN}';</script>`
                );
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        });
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`AI-HAM Chat server running on http://127.0.0.1:${PORT}`);
});
