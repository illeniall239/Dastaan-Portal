"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback, type ComponentPropsWithoutRef } from "react";
import { Bot, Send, Trash2, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export type PortalKey = "management" | "content_department" | "evaluator" | "programmer" | "gcm";

interface AIAssistantPageProps {
  portalKey: PortalKey;
  suggestions?: string[];
  description?: string;
  placeholder?: string;
}

const mdComponents = {
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm" {...props} />
    </div>
  ),
  thead: (props: ComponentPropsWithoutRef<"thead">) => (
    <thead className="bg-muted/70 border-b border-border" {...props} />
  ),
  tbody: (props: ComponentPropsWithoutRef<"tbody">) => (
    <tbody className="divide-y divide-border" {...props} />
  ),
  tr: (props: ComponentPropsWithoutRef<"tr">) => (
    <tr className="hover:bg-muted/40 transition-colors" {...props} />
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap" {...props} />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td className="px-4 py-2.5 whitespace-nowrap" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="text-sm font-semibold mt-4 mb-1.5" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="my-1.5 leading-relaxed" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="my-1.5 ml-4 list-disc space-y-0.5" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="my-1.5 ml-4 list-decimal space-y-0.5" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li className="leading-relaxed" {...props} />
  ),
};

const MAX_MEMORY_ITEMS = 50;

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function stripDigest(text: string): string {
  return text.replace(/\n*<!--\s*data-digest[\s\S]*?-->/g, "").trimEnd();
}

const DEFAULT_SUGGESTIONS = [
  "Give me a summary of my team's activity",
  "What are the highest rated projects?",
  "How many evaluations were done this month?",
  "Which projects are behind on episode delivery?",
  "Show me pending evaluations",
  "What ideas were logged last month?",
];

export function AIAssistantPage({
  portalKey,
  suggestions = DEFAULT_SUGGESTIONS,
  description = "I can look up evaluations, track deliveries, and answer questions about your team's data.",
  placeholder = "Ask about your team's evaluations, projects, episodes...",
}: AIAssistantPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [memory, setMemory] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/assistant/thread")
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length) setMessages(data.messages);
        if (data.memory?.length) setMemory(data.memory);
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  const saveToDb = useCallback((msgs: Message[], mem: string[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/assistant/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, memory: mem }),
      }).catch(() => {});
    }, 1000);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!initialLoading && window.innerWidth >= 640) inputRef.current?.focus();
  }, [initialLoading]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const setHeight = () => {
      const top = el.getBoundingClientRect().top;
      el.style.height = `${window.innerHeight - top}px`;
    };
    setHeight();
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", setHeight);
      return () => vv.removeEventListener("resize", setHeight);
    }
    window.addEventListener("resize", setHeight);
    return () => window.removeEventListener("resize", setHeight);
  }, [initialLoading]);


  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMessage: Message = { role: "user", content: msg, timestamp: new Date().toISOString() };
    const history = messages.slice(-20);

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          portalKey,
          history,
          memory,
        }),
      });

      const data = await res.json();
      const reply = data.reply ?? "Sorry, something went wrong.";
      const finalMessages = [...newMessages, { role: "assistant" as const, content: reply, timestamp: new Date().toISOString() }];

      let finalMemory = memory;
      if (data.memoryExtract?.length) {
        finalMemory = [...memory, ...data.memoryExtract].slice(-MAX_MEMORY_ITEMS);
        setMemory(finalMemory);
      }

      setMessages(finalMessages);
      saveToDb(finalMessages, finalMemory);
    } catch {
      const errorMessages = [...newMessages, { role: "assistant" as const, content: "Couldn't reach the assistant. Please try again.", timestamp: new Date().toISOString() }];
      setMessages(errorMessages);
      saveToDb(errorMessages, memory);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, memory, saveToDb, portalKey]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function clearChat() {
    setMessages([]);
    fetch("/api/assistant/thread", { method: "DELETE" }).catch(() => {});
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEmpty = messages.length === 0;

  return (
    <div ref={containerRef} className="flex flex-col overflow-hidden">
      {messages.length > 0 && (
        <div className="flex justify-end px-4 sm:px-6 py-2 shrink-0">
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear chat
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center px-4 sm:px-6 pt-6 sm:pt-0 sm:justify-center sm:min-h-full">
            <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold mb-0.5 sm:mb-1">How can I help?</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-8 text-center max-w-md">
              {description}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2 max-w-3xl w-full">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className={`text-left text-sm px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-border hover:bg-muted hover:border-primary/20 transition-colors${i >= 4 ? " hidden sm:block" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
            {messages.map((msg, i) =>
              msg.role === "assistant" ? (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 max-w-full overflow-hidden">
                    <div className="text-sm leading-relaxed pt-1.5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                        {stripDigest(msg.content)}
                      </ReactMarkdown>
                    </div>
                    {msg.timestamp && (
                      <p className="text-[10px] text-muted-foreground mt-1">{formatTime(msg.timestamp)}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col items-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed max-w-[80%]">
                    {msg.content}
                  </div>
                  {msg.timestamp && (
                    <p className="text-[10px] text-muted-foreground mt-1">{formatTime(msg.timestamp)}</p>
                  )}
                </div>
              )
            )}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="flex gap-1.5 items-center pt-3">
                  <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-background px-4 sm:px-6 py-2.5 sm:py-4" style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom, 0px))" }}>
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={loading}
              rows={1}
              className="w-full text-sm bg-muted rounded-xl px-4 py-2.5 sm:py-3 outline-none placeholder:text-muted-foreground disabled:opacity-50 resize-none min-h-[40px] sm:min-h-[44px] max-h-[120px]"
              style={{ height: "40px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "40px";
                target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
