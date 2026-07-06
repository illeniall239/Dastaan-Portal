"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, MessageSquare, ChevronDown, ChevronRight, Send, FileText } from "lucide-react";
import { formatDateTime } from "@/lib/utils/format-date";
import type { CallReportDiscussion } from "@/types";

// We use CallReportDiscussion as the shared shape for both call report and episode discussions
type DiscussionMessage = CallReportDiscussion;

interface DiscussionThreadProps {
  entityId: string;       // call report UUID or episode UUID
  apiBasePath: string;    // "/api/call-reports" or "/api/episodes"
  currentUserId: string;
  currentUserRole?: string;
  compact?: boolean;
  defaultExpanded?: boolean;
  title?: string;         // override "Evaluation Feedback"
}

// Backwards-compat alias props
interface CallReportDiscussionProps {
  callReportId: string;
  currentUserId: string;
  currentUserRole?: string;
  compact?: boolean;
  defaultExpanded?: boolean;
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  management: "bg-purple-100 text-purple-800 border-purple-300",
  evaluator: "bg-blue-100 text-blue-800 border-blue-300",
  content_manager: "bg-green-100 text-green-800 border-green-300",
  content_creator: "bg-green-100 text-green-800 border-green-300",
  programmer: "bg-orange-100 text-orange-800 border-orange-300",
  gcm: "bg-teal-100 text-teal-800 border-teal-300",
  admin: "bg-gray-100 text-gray-800 border-gray-300",
};

const ROLE_LABELS: Record<string, string> = {
  management: "Management",
  evaluator: "Evaluator",
  content_manager: "Content",
  content_creator: "Content",
  programmer: "Programmer",
  gcm: "GCM",
  admin: "Admin",
};

function RoleBadge({ role }: { role: string }) {
  const style = ROLE_BADGE_STYLES[role] || "bg-gray-100 text-gray-700 border-gray-300";
  const label = ROLE_LABELS[role] || role;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${style}`}>
      {label}
    </span>
  );
}

function SystemMessageRow({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2">
      <div className="flex-1 border-t border-dashed border-gray-200" />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
        <FileText className="h-3 w-3 flex-shrink-0" />
        <span>{message}</span>
      </div>
      <div className="flex-1 border-t border-dashed border-gray-200" />
    </div>
  );
}

function MessageBubble({
  discussion,
  currentUserId,
}: {
  discussion: DiscussionMessage;
  currentUserId: string;
}) {
  // System messages get their own special rendering
  if (discussion.is_system_message) {
    return <SystemMessageRow message={discussion.message} />;
  }

  const isOwn = discussion.user_id === currentUserId;

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`flex flex-col max-w-[80%] gap-1 ${isOwn ? "items-end" : "items-start"}`}>
        <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
          <span className="font-medium text-foreground">
            {discussion.user?.name || "Unknown"}
          </span>
          {discussion.user?.role && <RoleBadge role={discussion.user.role} />}
          <span>{formatDateTime(discussion.created_at)}</span>
        </div>
        <div
          className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
            isOwn
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted rounded-tl-sm"
          }`}
        >
          {discussion.message}
        </div>
      </div>
    </div>
  );
}

export function DiscussionThread({
  entityId,
  apiBasePath,
  currentUserId,
  currentUserRole,
  compact = false,
  defaultExpanded,
  title = "Evaluation Feedback",
}: DiscussionThreadProps) {
  const [discussions, setDiscussions] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(defaultExpanded ?? !compact);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  const apiUrl = `${apiBasePath}/${entityId}/discussions`;

  const fetchDiscussions = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}?_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setDiscussions(data.discussions || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load discussion";
      console.error("Error fetching discussions:", msg);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchDiscussions();
  }, [fetchDiscussions]);

  // Scroll to bottom when messages load or new one arrives
  useEffect(() => {
    if (expanded && !loading && discussions.length > 0) {
      scrollToBottom();
    }
  }, [discussions, expanded, loading]);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      setMessage("");
      setDiscussions((prev) => [...prev, data.discussion]);
      // Scroll after state update
      setTimeout(scrollToBottom, 50);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send message";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = message.length;
  const charLimit = 2000;

  const messageList = (
    <div className="space-y-3">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading discussion...
        </div>
      ) : discussions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          No feedback yet. Management can leave notes for content heads here, and content heads can respond.
        </p>
      ) : (
        discussions.map((d) => (
          <MessageBubble
            key={d.id}
            discussion={d}
            currentUserId={currentUserId}
          />
        ))
      )}
    </div>
  );

  const sendForm = (
    <div className="space-y-2 border-t pt-3">
      <Textarea
        ref={textareaRef}
        placeholder="Leave feedback or a response... (Ctrl+Enter to send)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={compact ? 2 : 3}
        maxLength={charLimit}
        disabled={sending}
        className="resize-none text-sm"
      />
      <div className="flex items-center justify-between">
        <span className={`text-xs ${charCount > charLimit * 0.9 ? "text-destructive" : "text-muted-foreground"}`}>
          {charCount}/{charLimit}
        </span>
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || !message.trim()}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // Compact (collapsible) mode — for evaluation forms
  if (compact) {
    return (
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="py-3 px-4">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-blue-800 hover:text-blue-900 transition-colors w-full text-left"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            )}
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            <span>{title}</span>
            {!loading && discussions.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {discussions.length}
              </Badge>
            )}
          </button>
          <p className="text-xs text-blue-600 mt-1 ml-8">
            Management notes and evaluator responses for this one-liner
          </p>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0 px-4 pb-4 space-y-3">
            <div ref={containerRef} className="max-h-60 overflow-y-auto pr-1">
              {messageList}
            </div>
            {sendForm}
          </CardContent>
        )}
      </Card>
    );
  }

  // Full mode — for call report detail pages
  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-blue-900">
          <MessageSquare className="h-5 w-5" />
          {title}
          {!loading && discussions.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {discussions.length}
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-blue-600">
          Management notes and evaluator responses for this one-liner
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={containerRef} className="max-h-96 overflow-y-auto pr-1">
          {messageList}
        </div>
        {sendForm}
      </CardContent>
    </Card>
  );
}

// Backwards-compatible alias — all existing usages keep working without changes
export function CallReportDiscussion({
  callReportId,
  currentUserId,
  currentUserRole,
  compact,
  defaultExpanded,
}: CallReportDiscussionProps) {
  return (
    <DiscussionThread
      entityId={callReportId}
      apiBasePath="/api/call-reports"
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
      compact={compact}
      defaultExpanded={defaultExpanded}
    />
  );
}
