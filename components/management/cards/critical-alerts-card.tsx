"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, ChevronRight } from "lucide-react";
import { CriticalAlert } from "@/lib/management/critical-alerts";

interface CriticalAlertsCardProps {
  alerts: CriticalAlert[];
}

export function CriticalAlertsCard({ alerts }: CriticalAlertsCardProps) {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="text-xs">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 text-white text-xs">Warning</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Info</Badge>;
    }
  };

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50 hover:bg-red-100';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
      default:
        return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
    }
  };

  if (alerts.length === 0) {
    return (
      <Card className="border-green-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Critical Alerts</CardTitle>
              <CardDescription>Bottlenecks and issues requiring attention</CardDescription>
            </div>
            <AlertTriangle className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">All Systems Running Smoothly</h3>
            <p className="text-sm text-muted-foreground">
              No critical alerts or bottlenecks detected at this time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              Critical Alerts
              {criticalAlerts.length > 0 && (
                <Badge variant="destructive">{criticalAlerts.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>Bottlenecks and issues requiring immediate attention</CardDescription>
          </div>
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
            <p className="text-2xl font-bold text-red-700">{criticalAlerts.length}</p>
            <p className="text-xs text-red-600">Critical</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
            <p className="text-2xl font-bold text-yellow-700">{warningAlerts.length}</p>
            <p className="text-xs text-yellow-600">Warnings</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
            <p className="text-2xl font-bold text-slate-700">{alerts.length}</p>
            <p className="text-xs text-slate-600">Total</p>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {alerts.slice(0, 10).map((alert) => (
            <button
              key={alert.id}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${getSeverityColors(alert.severity)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{alert.title}</h4>
                      {getSeverityBadge(alert.severity)}
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{alert.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Entity: {alert.affectedEntity}</span>
                      {alert.daysDelayed && (
                        <span className="font-semibold text-red-600">
                          {alert.daysDelayed} days delayed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 mt-1" />
              </div>
            </button>
          ))}
        </div>

        {/* Show more indicator */}
        {alerts.length > 10 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Showing 10 of {alerts.length} alerts.{' '}
            <Link href="/management/alerts" className="text-blue-600 hover:underline cursor-pointer">
              View all →
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
