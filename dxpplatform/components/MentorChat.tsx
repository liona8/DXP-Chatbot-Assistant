"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { X, Send, GripHorizontal, Minus } from "lucide-react";
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

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 480;
const MIN_WIDTH = 280;
const MIN_HEIGHT = 320;
const HEADER_HEIGHT = 52;

export default function MentorChat({ isOpen, onClose }: MentorChatProps) {
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "assistant",
    content: "Hi Pei Ying! I'm Aria, your project mentor for the Budget Planning Workflow. Feel free to ask anything.👋",
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isMinimised, setIsMinimised] = useState(false);

  // Position & size state
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT });
  const [initialised, setInitialised] = useState(false);

  const windowRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Drag state
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Resize state
  const resizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Place window bottom-right on first open
  useEffect(() => {
    if (isOpen && !initialised) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(DEFAULT_WIDTH, vw - 32);
      const h = Math.min(DEFAULT_HEIGHT, vh - 80);
      setSize({ w, h });
      setPos({ x: vw - w - 24, y: vh - h - 24 });
      setInitialised(true);
    }
  }, [isOpen, initialised]);

  // Keep window inside viewport on resize
  useEffect(() => {
    const clamp = () => {
      setPos(p => ({
        x: Math.min(p.x, window.innerWidth - size.w - 8),
        y: Math.min(p.y, window.innerHeight - HEADER_HEIGHT - 8),
      }));
    };
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [size.w]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Drag ──────────────────────────────────────────────
  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    dragging.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = {
      x: clientX - pos.x,
      y: clientY - pos.y,
    };

    const move = (ev: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const cx = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
      const cy = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
      const nx = Math.max(0, Math.min(cx - dragOffset.current.x, window.innerWidth - size.w));
      const ny = Math.max(0, Math.min(cy - dragOffset.current.y, window.innerHeight - HEADER_HEIGHT));
      setPos({ x: nx, y: ny });
    };

    const up = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
  }, [pos, size.w]);

  // ── Resize (bottom-right corner) ──────────────────────
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };

    const move = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const nw = Math.max(MIN_WIDTH, resizeStart.current.w + ev.clientX - resizeStart.current.x);
      const nh = Math.max(MIN_HEIGHT, resizeStart.current.h + ev.clientY - resizeStart.current.y);
      setSize({ w: nw, h: nh });
    };

    const up = () => {
      resizing.current = false;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, [size]);

  // ── Send message ──────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setShowSuggestions(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const history = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
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

  if (!isOpen || !initialised) return null;

  const windowHeight = isMinimised ? HEADER_HEIGHT : size.h;

  return (
    <div
      ref={windowRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: windowHeight,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.08)",
        background: "white",
        transition: isMinimised ? "height 0.2s ease" : "none",
        userSelect: dragging.current ? "none" : "auto",
      }}
    >
      {/* ── Header / drag handle ── */}
      <div
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px 5px",
          height: "auto",
          borderBottom: isMinimised ? "none" : "1px solid rgba(0,0,0,0.06)",
          cursor: "grab",
          flexShrink: 0,
          background: "white",
          userSelect: "none",
        }}
      >
        {/* Grip icon */}
        <GripHorizontal size={14} strokeWidth={2} style={{ color: "#9ca3af", flexShrink: 0 }} />

        {/* Avatar */}
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #4338ca)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="white">
            <path d="M8 1C4.1 1 1 3.7 1 7c0 1.8.8 3.4 2.1 4.5L2.5 14l2.8-1.2C6.1 13.6 7 13.7 8 13.7c3.9 0 7-2.7 7-6.1C15 3.7 11.9 1 8 1z" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Thinkra — Project Mentor Assistant</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#059669" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
            Online now
          </div>
        </div>

        {/* Minimise */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setIsMinimised(m => !m)}
          style={{
            width: 24, height: 24, borderRadius: "50%", border: "none",
            background: "#f3f4f6", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Minus size={11} strokeWidth={2.5} style={{ color: "#6b7280" }} />
        </button>

        {/* Close */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          style={{
            width: 24, height: 24, borderRadius: "50%", border: "none",
            background: "#f3f4f6", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={11} strokeWidth={2.5} style={{ color: "#6b7280" }} />
        </button>
      </div>

      {/* ── Body (hidden when minimised) ── */}
      {!isMinimised && (
        <>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: "flex", flexDirection: "column", gap: 3,
                  maxWidth: "88%",
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div style={{
                  padding: "8px 12px",
                  fontSize: 12, lineHeight: 1.6,
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "#4338ca" : "#f3f4f6",
                  color: msg.role === "user" ? "white" : "#1f2937",
                }}>
                  {formatMessage(msg.content)}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ alignSelf: "flex-start" }}>
                <div style={{
                  background: "#f3f4f6", borderRadius: "16px 16px 16px 4px",
                  padding: "10px 14px", display: "flex", gap: 4, alignItems: "center",
                }}>
                  {[0, 150, 300].map(delay => (
                    <div key={delay} style={{
                      width: 6, height: 6, borderRadius: "50%", background: "#9ca3af",
                      animation: `bounce 1.2s ${delay}ms infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <div style={{ padding: "0 10px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s.label}
                  onClick={() => sendMessage(s.prompt)}
                  style={{
                    padding: "4px 10px", borderRadius: 999,
                    border: "1px solid #c7d2fe", background: "#eef2ff",
                    fontSize: 11, color: "#4338ca", cursor: "pointer",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: "10px 12px", borderTop: "1px solid rgba(0,0,0,0.06)",
            display: "flex", alignItems: "flex-end", gap: 8, flexShrink: 0,
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={autoResize}
              onKeyDown={handleKeyDown}
              placeholder="Ask Aria anything about this project..."
              rows={1}
              style={{
                flex: 1, resize: "none", border: "1px solid #e5e7eb",
                borderRadius: 18, padding: "8px 14px", fontSize: 12,
                background: "#f9fafb", color: "#111827", outline: "none",
                minHeight: 36, maxHeight: 80, lineHeight: 1.5,
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              style={{
                width: 32, height: 32, borderRadius: "50%", border: "none",
                background: !input.trim() || isLoading ? "#a5b4fc" : "#4338ca",
                cursor: !input.trim() || isLoading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <Send size={13} strokeWidth={2} style={{ color: "white" }} />
            </button>
          </div>
        </>
      )}

      {/* ── Resize handle (bottom-right corner) ── */}
      {!isMinimised && (
        <div
          onMouseDown={onResizeStart}
          style={{
            position: "absolute", bottom: 0, right: 0,
            width: 16, height: 16, cursor: "nwse-resize",
            display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
            padding: 3,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M9 1L1 9M9 5L5 9M9 9" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}