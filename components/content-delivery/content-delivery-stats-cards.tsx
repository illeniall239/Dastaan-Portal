import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle2, Clock, TrendingUp, DollarSign } from "lucide-react";
import type { ContentDeliveryStats } from "@/types";

interface ContentDeliveryStatsCardsProps {
  stats: ContentDeliveryStats;
}

export function ContentDeliveryStatsCards({ stats }: ContentDeliveryStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Total Active Projects */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-blue-900">
            Active Projects
          </CardTitle>
          <FileText className="h-5 w-5 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-900">{stats.total_projects}</div>
          <p className="text-xs text-blue-700 mt-1">
            Total projects in content delivery
          </p>
        </CardContent>
      </Card>

      {/* Total Episodes Expected */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-purple-900">
            Episodes Expected
          </CardTitle>
          <Clock className="h-5 w-5 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-900">{stats.total_episodes_expected}</div>
          <p className="text-xs text-purple-700 mt-1">
            Total episodes to be delivered
          </p>
        </CardContent>
      </Card>

      {/* Total Episodes Received */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-green-900">
            Episodes Received
          </CardTitle>
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-900">{stats.total_episodes_received}</div>
          <p className="text-xs text-green-700 mt-1">
            Episodes logged so far
          </p>
        </CardContent>
      </Card>

      {/* Average Completion */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-orange-900">
            Avg Completion
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-900">{stats.average_completion}%</div>
          <p className="text-xs text-orange-700 mt-1">
            Overall delivery progress
          </p>
        </CardContent>
      </Card>

      {/* Total Agreed Value */}
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-emerald-900">
            Total Agreed Value
          </CardTitle>
          <DollarSign className="h-5 w-5 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-900">
            PKR {stats.total_agreed_value.toLocaleString('en-US')}
          </div>
          <p className="text-xs text-emerald-700 mt-1">
            Total value of all agreements
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
