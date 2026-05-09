"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AssistantChatProps {
  portalKey: "programmer" | "content_department" | "evaluator" | "management";
}

const PORTAL_GREETING: Record<string, string> = {
  programmer: "Hi! I'm your Dastaan Portal Assistant. I can help you find any feature in the Programmer Portal — just ask me anything like \"Where do I log a meeting?\" or \"How do I check episode delivery?\"",
  content_department: "Hi! I'm your Dastaan Portal Assistant. I can help you navigate the Content Department Portal. Ask me anything like \"How do I create an engagement report?\" or \"Where do I track episodes?\"",
  evaluator: "Hi! I'm your Dastaan Portal Assistant. I can help you navigate the Evaluator Portal. Try asking \"How do I submit a one-liner evaluation?\" or \"Where do I find cross-team requests?\"",
  management: "Hi! I'm your Dastaan Portal Assistant. I can help you navigate the Management Portal — ask me anything like \"Where do I track content aging?\" or \"How do I review pending approvals?\"",
};

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 shrink-0">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export function AssistantChat({ portalKey }: AssistantChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show greeting when opened for the first time
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: PORTAL_GREETING[portalKey] ?? PORTAL_GREETING.programmer }]);
    }
  }, [open, messages.length, portalKey]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const history = messages.filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          portalKey,
          history: history.slice(-6),
        }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "Sorry, something went wrong." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Couldn't reach the assistant. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[250] flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="w-80 bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-primary/5">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none">Dastaan Assistant</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ask me anything</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 max-h-80 min-h-[200px]">
            {messages.map((msg, i) =>
              msg.role === "assistant" ? (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm leading-relaxed max-w-[85%]">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2 text-sm leading-relaxed max-w-[85%]">
                    {msg.content}
                  </div>
                </div>
              )
            )}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-border">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              disabled={loading}
              className="flex-1 text-sm bg-muted rounded-full px-4 py-2 outline-none placeholder:text-muted-foreground disabled:opacity-50 min-w-0"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all active:scale-95"
      >
        {open ? (
          <X className="w-4 h-4" />
        ) : (
          <MessageCircle className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">{open ? "Close" : "Ask anything"}</span>
      </button>
    </div>
  );
}
