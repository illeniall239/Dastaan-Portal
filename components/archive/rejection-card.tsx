import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RejectedArchiveItem } from "@/types";
import { FileX, Calendar, User, TrendingDown } from "lucide-react";

interface RejectionCardProps {
  item: RejectedArchiveItem;
  onClick?: () => void;
}

export function RejectionCard({ item, onClick }: RejectionCardProps) {
  const meetingDate = new Date(item.meeting_date);
  const archivedDate = new Date(item.archived_at);

  // Color code based on score
  const getScoreColor = (score: number) => {
    if (score < 3.0) return "text-red-700 bg-red-50 border-red-200";
    if (score < 4.0) return "text-orange-700 bg-orange-50 border-orange-200";
    return "text-yellow-700 bg-yellow-50 border-yellow-200";
  };

  return (
    <Card
      className={`hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-red-500 ${
        onClick ? "" : "cursor-default"
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileX className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold line-clamp-1">
                {item.working_title}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                {item.call_report_id}
              </span>
              <Badge variant="destructive" className="text-xs">
                Rejected
              </Badge>
            </div>
          </div>

          <div className="text-right">
            <div
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg border font-bold text-lg ${getScoreColor(
                item.average_score
              )}`}
            >
              <TrendingDown className="h-4 w-4" />
              {item.average_score.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {item.total_evaluations} evaluation{item.total_evaluations !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Logline */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.logline || "No logline provided"}
          </p>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Writer:</span>
              <span className="font-medium">{item.writer_name}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Meeting:</span>
              <span className="font-medium">
                {meetingDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Rejection Info */}
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 mt-3">
            <div className="flex items-start gap-2">
              <FileX className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-900 mb-1">
                  Rejection Reason
                </p>
                <p className="text-xs text-red-700">
                  {item.rejection_reason || "Average score below 5.0 threshold"}
                </p>
              </div>
            </div>
            <p className="text-xs text-red-600 mt-2">
              Archived on{" "}
              {archivedDate.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          
        </div>
      </CardContent>
    </Card>
  );
}
