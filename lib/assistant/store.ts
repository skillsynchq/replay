const STORAGE_KEY = "replay-assistant-chat";

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  locality: "client" | "server";
  status: "pending" | "complete";
}

export type MessageSegment =
  | { type: "text"; content: string }
  | { type: "tool"; tool: ToolCall };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  segments?: MessageSegment[];
}

export function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

export function saveMessages(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

export function clearMessages(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
