import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { ScriptingPhaseData } from "@/lib/management/scripting-analytics";

interface ScriptingPhaseProps {
  data: ScriptingPhaseData[];
}

export function ScriptingPhase({ data }: ScriptingPhaseProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_schedule':
        return <Badge className="bg-green-500 text-white">On Schedule</Badge>;
      case 'on_hold':
        return <Badge className="bg-yellow-500 text-white">On Hold</Badge>;
      case 'behind_schedule':
        return <Badge className="bg-red-500 text-white">Behind Schedule</Badge>;
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Scripting Phase</CardTitle>
              <CardDescription>Dramas in active scripting phase</CardDescription>
            </div>
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No dramas currently in scripting phase
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Scripting Phase</CardTitle>
            <CardDescription>Dramas in active scripting phase</CardDescription>
          </div>
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data.map((drama) => (
            <div key={drama.id} className="space-y-2">
              {/* Drama Title and Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-slate-900">{drama.workingTitle}</h4>
                  {getStatusBadge(drama.status)}
                </div>
                <span className="text-sm font-bold text-slate-700">{drama.scriptProgress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 ${getProgressBarColor(drama.status)} transition-all duration-500`}
                  style={{ width: `${drama.scriptProgress}%` }}
                ></div>
              </div>

              {/* Script Progress Label */}
              <p className="text-xs text-muted-foreground">Script Progress</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
