import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, FileText, CheckSquare, FileCheck, DollarSign, User, Film, Clock } from "lucide-react";
import type { RecentActivity } from "@/lib/management/activity-analytics";

// Helper function moved from analytics (to avoid server imports in client)
function groupActivitiesByTime(activities: RecentActivity[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  return {
    today: activities.filter(a => new Date(a.timestamp) >= today),
    yesterday: activities.filter(a => {
      const date = new Date(a.timestamp);
      return date >= yesterday && date < today;
    }),
    thisWeek: activities.filter(a => {
      const date = new Date(a.timestamp);
      return date >= thisWeek && date < yesterday;
    }),
    older: activities.filter(a => new Date(a.timestamp) < thisWeek),
  };
}

interface RecentActivityCardProps {
  activities: RecentActivity[];
}

export function RecentActivityCard({ activities }: RecentActivityCardProps) {
  const grouped = groupActivitiesByTime(activities);

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'story':
        return <FileText className="h-4 w-4" />;
      case 'evaluation':
        return <CheckSquare className="h-4 w-4" />;
      case 'approval':
        return <FileCheck className="h-4 w-4" />;
      case 'contract':
        return <FileCheck className="h-4 w-4" />;
      case 'payment':
        return <DollarSign className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      case 'episode':
        return <Film className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getIconColor = (iconType: string) => {
    switch (iconType) {
      case 'story':
        return 'bg-blue-100 text-blue-600';
      case 'evaluation':
        return 'bg-purple-100 text-purple-600';
      case 'approval':
        return 'bg-green-100 text-green-600';
      case 'contract':
        return 'bg-indigo-100 text-indigo-600';
      case 'payment':
        return 'bg-emerald-100 text-emerald-600';
      case 'user':
        return 'bg-orange-100 text-orange-600';
      case 'episode':
        return 'bg-pink-100 text-pink-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const renderActivityGroup = (groupActivities: RecentActivity[], title: string) => {
    if (groupActivities.length === 0) return null;

    return (
      <div className="mb-6 last:mb-0">
        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 px-1">{title}</h4>
        <div className="space-y-2">
          {groupActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            >
              {/* Icon */}
              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(activity.icon)}`}>
                {getIcon(activity.icon)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {activity.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {activity.performedBy}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              </div>

              {/* Entity Type Badge */}
              <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                {activity.entityType}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Activity</CardTitle>
              <CardDescription>Latest actions and updates across the platform</CardDescription>
            </div>
            <Activity className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No recent activity to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
            <CardDescription>Latest actions and updates across the platform</CardDescription>
          </div>
          <Activity className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[600px] overflow-y-auto pr-2">
          {renderActivityGroup(grouped.today, 'Today')}
          {renderActivityGroup(grouped.yesterday, 'Yesterday')}
          {renderActivityGroup(grouped.thisWeek, 'This Week')}
          {renderActivityGroup(grouped.older, 'Earlier')}
        </div>

        {/* View all link */}
        {activities.length >= 15 && (
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-sm text-blue-600 hover:underline cursor-pointer">
              View all activity →
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
