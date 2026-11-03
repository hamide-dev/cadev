import { type Conversation } from '../../lib/socket';

export function conversationTitle(conversation: Conversation, meId: string): string {
  if (conversation.name) return conversation.name;
  const others = conversation.members.filter((m) => m.id !== meId);
  return others.map((m) => m.displayName).join(', ') || 'Conversation';
}

export function conversationSubtitle(conversation: Conversation, meId: string): string {
  if (conversation.type === 'DIRECT') return 'Message direct';
  const others = conversation.members.filter((m) => m.id !== meId);
  return `${others.map((m) => m.displayName.split(' ')[0]).join(', ')} · ${conversation.members.length} membres`;
}
