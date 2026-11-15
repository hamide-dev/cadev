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

// « Toi : … », « Awa : … » dans un groupe, le message seul en direct. Sans message, le sous-titre d'avant.
export function conversationPreview(conversation: Conversation, meId: string): string {
  const last = conversation.lastMessage;
  if (!last) return conversationSubtitle(conversation, meId);
  const text = last.type === 'CODE' ? 'Extrait de code' : last.content.trim() || 'Pièce jointe';
  const who = last.senderId === meId ? 'Toi' : conversation.type === 'GROUP' ? last.senderName.split(' ')[0] : null;
  return who ? `${who} : ${text}` : text;
}
