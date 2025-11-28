'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Edit3, Eye, RefreshCw, CheckCircle2 } from 'lucide-react';
import { DummyScriptingPhaseData } from '../lib/dummy-data';

interface DemoScriptingPhaseProps {
  data: DummyScriptingPhaseData;
}

export function DemoScriptingPhase({ data }: DemoScriptingPhaseProps) {
  const total = data.planning + data.writing + data.review + data.revision + data.approved;

  const phases = [
    {
      label: 'Planning',
      count: data.planning,
      icon: FileText,
      color: 'bg-slate-100 text-slate-700',
      borderColor: 'border-slate-300',
    },
    {
      label: 'Writing',
      count: data.writing,
      icon: Edit3,
      color: 'bg-blue-100 text-blue-700',
      borderColor: 'border-blue-300',
    },
    {
      label: 'Review',
      count: data.review,
      icon: Eye,
      color: 'bg-orange-100 text-orange-700',
      borderColor: 'border-orange-300',
    },
    {
      label: 'Revision',
      count: data.revision,
      icon: RefreshCw,
      color: 'bg-yellow-100 text-yellow-700',
      borderColor: 'border-yellow-300',
    },
    {
      label: 'Approved',
      count: data.approved,
      icon: CheckCircle2,
      color: 'bg-green-100 text-green-700',
      borderColor: 'border-green-300',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Scripting Phase</CardTitle>
            <CardDescription>Current script development stage distribution</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">Total scripts</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {phases.map((phase) => {
            const Icon = phase.icon;
            return (
              <div
                key={phase.label}
                className={`p-4 border-2 ${phase.borderColor} rounded-lg ${phase.color} transition-transform hover:scale-105`}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <Icon className="h-6 w-6" />
                  <p className="text-sm font-medium">{phase.label}</p>
                  <p className="text-2xl font-bold">{phase.count}</p>
                  <p className="text-xs opacity-75">
                    {total > 0 ? ((phase.count / total) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">In Progress (Writing + Review + Revision):</span>
            <span className="font-semibold">
              {data.writing + data.review + data.revision} scripts
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
