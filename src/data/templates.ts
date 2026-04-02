export interface Template {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  prompt: string;
}

export const templates: Template[] = [
  // Business
  {
    id: 'data-report',
    name: 'Data Report Generator',
    icon: '📊',
    category: 'Business',
    description: 'Generate structured data report with executive summary',
    prompt: `Create a comprehensive data report with the following structure:
1. Executive Summary (2-3 sentences)
2. Key Findings (bullet points)
3. Data Analysis (with supporting metrics)
4. Recommendations (numbered list)
5. Next Steps

Based on the following data/topic: {{topic}}`,
  },
  {
    id: 'email-writer',
    name: 'Professional Email Writer',
    icon: '📧',
    category: 'Business',
    description: 'Write professional business emails',
    prompt: `Write a professional email with the following structure:
- Subject Line
- Greeting
- Introduction (context)
- Main Body (clear and concise)
- Call to Action
- Professional Closing

Email purpose: {{purpose}}
Tone: Professional but friendly`,
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes Template',
    icon: '📝',
    category: 'Business',
    description: 'Structured meeting notes format',
    prompt: `Create meeting notes template with these sections:
- Meeting Title & Date
- Attendees
- Agenda Items
- Discussion Points
- Decisions Made
- Action Items (with owner & deadline)
- Next Meeting Date`,
  },
  {
    id: 'project-status',
    name: 'Project Status Update',
    icon: '📋',
    category: 'Business',
    description: 'Weekly/monthly project status report',
    prompt: `Write a project status update including:
1. Project Name & Reporting Period
2. Overall Status (Green/Yellow/Red)
3. Progress This Period (completed tasks)
4. Current Blockers/Issues
5. Upcoming Tasks Next Period
6. Risk Assessment
7. Resources Needed`,
  },

  // Development
  {
    id: 'bug-report',
    name: 'Bug Report Template',
    icon: '🐛',
    category: 'Development',
    description: 'Format a detailed bug report',
    prompt: `Create a bug report with:
- Bug ID & Title
- Severity (Critical/High/Medium/Low)
- Environment (OS, Browser, App Version)
- Steps to Reproduce (numbered)
- Expected Behavior
- Actual Behavior
- Screenshots/Error Logs
- Suggested Fix`,
  },
  {
    id: 'code-docs',
    name: 'Code Documentation',
    icon: '📚',
    category: 'Development',
    description: 'Generate documentation for code',
    prompt: `Generate comprehensive documentation for the following code:
- Overview/Purpose
- Function signatures with parameters
- Return types
- Usage examples
- Edge cases handled
- Dependencies
- Related functions

Code to document: {{code}}`,
  },
  {
    id: 'pr-description',
    name: 'PR Description Generator',
    icon: '🔀',
    category: 'Development',
    description: 'Create pull request descriptions',
    prompt: `Write a pull request description with:
## Summary
Brief description of changes

## What Changed
List of files modified and why

## How to Test
Steps to verify the changes work

## Screenshots (if applicable)
Before/after images

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes`,
  },

  // Content
  {
    id: 'article-writer',
    name: 'Article Writer',
    icon: '📝',
    category: 'Content',
    description: 'Write comprehensive articles',
    prompt: `Write a comprehensive article with:
- Engaging headline
- Hook/opening paragraph
- Main sections with H2 headers
- Key takeaways/conclusion
- Call to action

Topic: {{topic}}
Target audience: {{audience}}
Word count: ~800 words`,
  },
  {
    id: 'twitter-thread',
    name: 'Twitter Thread Generator',
    icon: '🐦',
    category: 'Content',
    description: 'Create engaging Twitter/X threads',
    prompt: `Create an engaging Twitter thread with:
- Hook tweet (first, most attention-grabbing)
- Thread body (5-10 tweets, each with value)
- CTA tweet (engagement prompt)

Topic: {{topic}}
Tone: {{tone}}
Make each tweet stand alone but flow as a narrative`,
  },
  {
    id: 'linkedin-post',
    name: 'LinkedIn Post Creator',
    icon: '💼',
    category: 'Content',
    description: 'Write professional LinkedIn posts',
    prompt: `Write a LinkedIn post with:
- Attention-grabbing first line (hook)
- Story or insight body
- Key takeaways (bullet points)
- Engagement question
- Relevant hashtags (3-5)

Topic: {{topic}}
Make it professional but authentic and relatable`,
  },

  // Creative
  {
    id: 'brainstorm',
    name: 'Brainstorm Session',
    icon: '💡',
    category: 'Creative',
    description: 'Generate creative ideas with analysis',
    prompt: `Let's brainstorm ideas for: {{topic}}

Give me 10 creative options with:
1. Brief description
2. Pros
3. Cons
4. Wild card factor (unexpected benefit or risk)

After listing, help me evaluate which option is best for:
- Quick implementation
- Maximum impact
- Low risk`,
  },
  {
    id: ' pros-cons',
    name: 'Pros & Cons Analysis',
    icon: '⚖️',
    category: 'Creative',
    description: 'Decision-making framework',
    prompt: `Create a detailed pros and cons analysis for: {{decision}}

Structure:
## Option A: [Name]
Pros:
Cons:

## Option B: [Name]  
Pros:
Cons:

## Comparison Matrix
Criteria | Weight | Option A | Option B
{{criteria}}

## Recommendation
Based on the analysis, I recommend...`,
  },
];

export const categories = [
  { id: 'Business', name: 'Business', icon: '💼' },
  { id: 'Development', name: 'Development', icon: '💻' },
  { id: 'Content', name: 'Content', icon: '✍️' },
  { id: 'Creative', name: 'Creative', icon: '🎨' },
];
