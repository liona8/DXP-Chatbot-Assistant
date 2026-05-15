export type ChatRole = "user" | "assistant";

/** UI message (frontend state) */
export interface Message {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
}

/** Backend / AI / DB payload */
export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
}