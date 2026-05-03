"use client";

import { useState } from "react";
import { Bell, CalendarIcon, FileTextIcon, CheckCircle2, Film, ClipboardList, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/hooks/queries/useNotifications";
import { useMarkAsRead, useMarkAllAsRead } from "@/lib/hooks/mutations/useMarkAsRead";
import { useUnreadCount } from "@/lib/hooks/queries/useUnreadCount";

const PAGE_SIZE = 20;

function getNotificationIcon(entityType: string) {
  switch (entityType) {
    case "meeting_scheduled":
    case "call_report_logged":
      return <CalendarIcon className="h-4 w-4 text-blue-600" />;
    case "story_submitted":
    case "call_report":
      return <FileTextIcon className="h-4 w-4 text-indigo-600" />;
    case "story_approved":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "episode":
      return <Film className="h-4 w-4 text-purple-600" />;
    case "evaluation":
      return <ClipboardList className="h-4 w-4 text-amber-600" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
}

function groupByDate(notifications: any[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: any[] }[] = [];
  const todayItems: any[] = [];
  const yesterdayItems: any[] = [];
  const earlierItems: any[] = [];

  for (const n of notifications) {
    const d = new Date(n.created_at);
    d.setHours(0, 0, 0, 0);
    if (d >= today) todayItems.push(n);
    else if (d >= yesterday) yesterdayItems.push(n);
    else earlierItems.push(n);
  }

  if (todayItems.length)     groups.push({ label: "Today",     items: todayItems });
  if (yesterdayItems.length) groups.push({ label: "Yesterday", items: yesterdayItems });
  if (earlierItems.length)   groups.push({ label: "Earlier",   items: earlierItems });

  return groups;
}

function getTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function NotificationsPageClient() {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: allNotifications = [], isLoading } = useNotifications({ limit: 200, refetchInterval: 30000 });
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const visible = allNotifications.slice(0, visibleCount);
  const groups = groupByDate(visible);
  const hasMore = visibleCount < allNotifications.length;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-[#224794] hover:underline"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="text-center space-y-2">
              <Bell className="h-10 w-10 opacity-30 mx-auto" />
              <p className="text-sm">Loading notifications...</p>
            </div>
          </div>
        ) : allNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Bell className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No notifications yet</p>
          </div>
        ) : (
          <>
            {groups.map(group => (
              <div key={group.label}>
                <div className="px-4 py-2 bg-slate-50 border-y border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{group.label}</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {group.items.map(n => (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-slate-50",
                        !n.is_read && "bg-blue-50/60 hover:bg-blue-50"
                      )}
                      onClick={() => {
                        if (!n.is_read) markAsRead.mutate(n.id);
                      }}
                    >
                      <div className="mt-0.5 p-2 rounded-lg bg-white border border-slate-100 shadow-sm shrink-0">
                        {getNotificationIcon(n.entity_type || "")}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className={cn("text-sm leading-snug", n.is_read ? "text-slate-700" : "text-slate-900 font-semibold")}>
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-xs text-slate-500 leading-relaxed">{n.message}</p>
                        )}
                        <p className="text-xs text-slate-400">{getTimeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <div className="h-2 w-2 rounded-full bg-[#224794] mt-2 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center py-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm text-[#224794]"
                  onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                >
                  Load more
                </Button>
              </div>
            )}
            <p className="text-xs text-center text-muted-foreground py-3 border-t">
              Showing {Math.min(visibleCount, allNotifications.length)} of {allNotifications.length} notifications
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
