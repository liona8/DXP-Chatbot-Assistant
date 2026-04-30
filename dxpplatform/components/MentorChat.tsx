"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { X, Send } from "lucide-react";
import type { Message } from "@/types/chat";

interface MentorChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  { label: "How to structure my PDF?",  prompt: "How should I structure my proposal PDF?" },
  { label: "Recommended tech stack",    prompt: "What tech stack would you recommend for this project?" },
  { label: "Evaluation criteria",       prompt: "What are the key evaluation criteria for this project?" },
  { label: "3 days left tips",          prompt: "I only have 3 days left — what should I prioritise?" },
];

function formatMessage(text: string) {
  return text.split("\n").map((line, i, arr) => (
    <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
  ));
}

export default function MentorChat({ isOpen, onClose }: MentorChatProps) {
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "assistant",
    content: "Hi Pei Ying! I'm Aria, your project mentor for the Budget Planning Workflow. I'm here to help you craft a strong proposal. What would you like to work on? 👋",
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setShowSuggestions(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const history = [...messages, userMessage].map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
  };

  return (
    <>
      {/* ── Desktop: right-side panel ── */}
      <div className={`
        hidden md:flex flex-col bg-white border-l border-gray-100
        shrink-0 transition-all duration-300 overflow-hidden
        ${isOpen ? "w-[320px] lg:w-85" : "w-0"}
      `}>
        <ChatInner
          messages={messages}
          input={input}
          isLoading={isLoading}
          showSuggestions={showSuggestions}
          messagesEndRef={messagesEndRef}
          textareaRef={textareaRef}
          onClose={onClose}
          onSend={sendMessage}
          onKeyDown={handleKeyDown}
          onResize={autoResize}
        />
      </div>

      {/* ── Mobile: bottom drawer ── */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="relative bg-white rounded-t-2xl flex flex-col h-[75vh] shadow-xl">
            <ChatInner
              messages={messages}
              input={input}
              isLoading={isLoading}
              showSuggestions={showSuggestions}
              messagesEndRef={messagesEndRef}
              textareaRef={textareaRef}
              onClose={onClose}
              onSend={sendMessage}
              onKeyDown={handleKeyDown}
              onResize={autoResize}
            />
          </div>
        </div>
      )}
    </>
  );
}

/* ── Shared inner UI ── */
interface ChatInnerProps {
  messages: Message[];
  input: string;
  isLoading: boolean;
  showSuggestions: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onClose: () => void;
  onSend: (text: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onResize: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

function ChatInner({
  messages, input, isLoading, showSuggestions,
  messagesEndRef, textareaRef,
  onClose, onSend, onKeyDown, onResize,
}: ChatInnerProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-100 shrink-0">
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shrink-0">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="white">
            <path d="M8 1C4.1 1 1 3.7 1 7c0 1.8.8 3.4 2.1 4.5L2.5 14l2.8-1.2C6.1 13.6 7 13.7 8 13.7c3.9 0 7-2.7 7-6.1C15 3.7 11.9 1 8 1z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-gray-900">Aria — Project Mentor</div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Online now
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
        >
          <X size={12} strokeWidth={2} className="text-gray-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 flex flex-col gap-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1 max-w-[88%] ${
              msg.role === "user" ? "self-end items-end" : "self-start items-start"
            }`}
          >
            <div className={`px-3 py-2 text-[12px] leading-relaxed ${
              msg.role === "user"
                ? "bg-indigo-700 text-white rounded-2xl rounded-br-sm"
                : "bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm"
            }`}>
              {formatMessage(msg.content)}
            </div>
            <div className="text-[10px] text-gray-400">
              {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="self-start">
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 loading-dot" />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 loading-dot" />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 loading-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => onSend(s.prompt)}
              className="px-2.5 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-[11px] text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-3 border-t border-gray-100 flex items-end gap-2 shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onResize}
          onKeyDown={onKeyDown}
          placeholder="Ask Aria anything about this project..."
          rows={1}
          className="flex-1 resize-none border border-gray-200 rounded-2xl px-3.5 py-2 text-[12px] bg-gray-50 text-gray-900 outline-none focus:border-indigo-400 focus:bg-white transition-colors min-h-9 max-h-20 leading-relaxed"
        />
        <button
          onClick={() => onSend(input)}
          disabled={!input.trim() || isLoading}
          className="w-8 h-8 rounded-full bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0"
        >
          <Send size={13} strokeWidth={2} className="text-white" />
        </button>
      </div>
    </>
  );
}