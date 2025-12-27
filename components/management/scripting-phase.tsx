import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { ScriptingPhaseData } from "@/lib/management/scripting-analytics";

interface ScriptingPhaseProps {
  data: ScriptingPhaseData[];
}

export function ScriptingPhase({ data }: ScriptingPhaseProps) {
  const getStatusBadge = (drama: ScriptingPhaseData) => {
    // If episode counts are available, show them; otherwise show status
    if (drama.totalEpisodes !== undefined && drama.evaluatedEpisodes !== undefined) {
      const status = drama.status;
      const colorClass = status === 'on_schedule'
        ? 'bg-green-500'
        : status === 'on_hold'
        ? 'bg-yellow-500'
        : 'bg-red-500';

      return (
        <Badge className={`${colorClass} text-white text-[10px] sm:text-xs`}>
          {drama.evaluatedEpisodes}/{drama.totalEpisodes} Episodes
        </Badge>
      );
    }

    // Fallback to status labels if no episode data
    switch (drama.status) {
      case 'on_schedule':
        return <Badge className="bg-green-500 text-white text-[10px] sm:text-xs">On Schedule</Badge>;
      case 'on_hold':
        return <Badge className="bg-yellow-500 text-white text-[10px] sm:text-xs">On Hold</Badge>;
      case 'behind_schedule':
        return <Badge className="bg-red-500 text-white text-[10px] sm:text-xs">Behind Schedule</Badge>;
      default:
        return null;
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'on_schedule':
        return 'bg-green-500';
      case 'on_hold':
        return 'bg-yellow-500';
      case 'behind_schedule':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base lg:text-lg">Scripting Phase</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Dramas in active scripting phase</CardDescription>
            </div>
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
            No dramas currently in scripting phase
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm sm:text-base lg:text-lg">Scripting Phase</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Dramas in active scripting phase</CardDescription>
          </div>
          <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="space-y-4 sm:space-y-6">
          {data.map((drama) => (
            <div key={drama.id} className="space-y-2">
              {/* Drama Title and Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <h4 className="font-semibold text-sm sm:text-base text-slate-900 truncate">{drama.workingTitle}</h4>
                  {getStatusBadge(drama)}
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-700 flex-shrink-0">{drama.scriptProgress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 ${getProgressBarColor(drama.status)} transition-all duration-500`}
                  style={{ width: `${drama.scriptProgress}%` }}
                ></div>
              </div>

              {/* Script Progress Label */}
              <p className="text-[10px] sm:text-xs text-muted-foreground">Script Progress</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
