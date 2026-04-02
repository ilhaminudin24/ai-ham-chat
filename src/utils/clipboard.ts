import type { Message } from '../store/chatStore';

export const formatConversationAsMarkdown = (
  title: string,
  messages: Message[]
): string => {
  const header = `# ${title}\n\n`;
  const body = messages
    .filter(msg => msg.content && msg.content !== '')
    .map(msg => {
      const sender = msg.role === 'user' ? '**You:**' : '**AI-HAM:**';
      const content = msg.content || '[Image]';
      return `${sender}\n${content}`;
    })
    .join('\n\n---\n\n');

  return header + body;
};

export const formatConversationAsPlainText = (
  title: string,
  messages: Message[]
): string => {
  const header = `${title}\n${'='.repeat(title.length)}\n\n`;
  const body = messages
    .filter(msg => msg.content && msg.content !== '')
    .map(msg => {
      const sender = msg.role === 'user' ? 'You:' : 'AI-HAM:';
      const content = msg.content || '[Image]';
      return `${sender}\n${content}`;
    })
    .join('\n\n' + '-'.repeat(40) + '\n\n');

  return header + body;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
