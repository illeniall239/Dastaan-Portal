'use client';

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  Activity,
  Briefcase
} from "lucide-react";
import {
  dummyStories,
  dummyAlerts,
  dummyEvaluators,
  dummyContracts,
  aggregateStats,
  dummyDramasWithEpisodes,
  dummyEpisodesByDrama,
  dummyEvaluatorsByEpisode,
  dummyEventAnalysisDataByCallReport,
  dummyScriptingPhase,
  dummyArchiveByGenre,
  dummyContractTerms,
} from './lib/dummy-data';
import { DemoScriptingPhase } from './components/demo-scripting-phase';
import { DemoEvaluatorPipelineEpisodes } from './components/demo-evaluator-pipeline-episodes';
import { DemoArchiveGenreChart } from './components/charts/demo-archive-genre-chart';
import { DemoPipelineOverviewCards } from './components/demo-pipeline-overview-cards';
import { DemoContractTermsOverview } from './components/demo-contract-terms-overview';
import { DemoWriterFinancialSummary } from './components/demo-writer-financial-summary';

export default function DemoManagementDashboard() {
  // Calculate executive summary stats from dummy data
  const totalActiveProjects = dummyStories.filter(s =>
    ['in_production', 'contracted', 'approved', 'in_evaluation'].includes(s.status)
  ).length;

  const pipelineValue = dummyContracts.reduce((sum, c) => sum + c.total_amount, 0);

  const activeContracts = dummyContracts.filter(c => c.status === 'signed').length;

  const overduePayments = dummyContracts.reduce((sum, c) => {
    const overdueMilestones = c.payment_milestones.filter(m =>
      !m.paid && new Date(m.due_date) < new Date()
    ).length;
    return sum + overdueMilestones;
  }, 0);

  const weeklyActivities = 27; // Dummy count

  const pendingApprovals = dummyStories.filter(s =>
    s.status === 'in_evaluation' && s.overall_rating !== null
  ).length;

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get critical alerts
  const criticalAlerts = dummyAlerts.filter(a => !a.resolved).slice(0, 5);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Management Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of content development and production
          </p>
        </div>
      </div>

      {/* Executive Summary Stats */}
      <div id="executive-summary" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Executive Summary</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:gap-6 lg:grid-cols-3">
          <Link href="/demo-management/active-projects" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">
                  Active Projects
                </CardTitle>
                <FileText className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-blue-900">{totalActiveProjects}</div>
                <p className="text-[10px] sm:text-xs text-blue-700 mt-1">
                  Stories in development pipeline
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/demo-management/pipeline-value" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-900">
                  Pipeline Value
                </CardTitle>
                <DollarSign className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-900">
                  {formatCurrency(pipelineValue)}
                </div>
                <p className="text-[10px] sm:text-xs text-green-700 mt-1">
                  Total contracts + negotiations
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/demo-management/contracts" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-orange-900">
                  Active Contracts
                </CardTitle>
                <Briefcase className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-orange-900">{activeContracts}</div>
                <p className="text-[10px] sm:text-xs text-orange-700 mt-1">
                  Contracts currently in effect
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/demo-management/writer-payments" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-red-900">
                  Overdue Payments
                </CardTitle>
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-red-900">{overduePayments}</div>
                <p className="text-[10px] sm:text-xs text-red-700 mt-1">
                  Payments requiring attention
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/demo-management/weekly-activities" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-purple-900">
                  Weekly Activities
                </CardTitle>
                <Activity className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-purple-900">{weeklyActivities}</div>
                <p className="text-[10px] sm:text-xs text-purple-700 mt-1">
                  Actions taken this week
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/demo-management/approvals" className="transition-transform hover:scale-105">
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-indigo-900">
                  Pending Approvals
                </CardTitle>
                <Clock className="h-5 w-5 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-indigo-900">{pendingApprovals}</div>
                <p className="text-[10px] sm:text-xs text-indigo-700 mt-1">
                  Awaiting committee decision
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Critical Alerts */}
      <div id="critical-alerts-section" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Critical Alerts</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            {criticalAlerts.length > 0 ? (
              <div className="space-y-4">
                {criticalAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="mt-1">
                      {alert.severity === 'critical' && (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                      {alert.severity === 'high' && (
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      )}
                      {alert.severity === 'medium' && (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm sm:text-base flex-1">
                          {alert.title}
                        </h3>
                        <span className={`text-[10px] sm:text-xs font-medium px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          alert.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {alert.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(alert.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No critical alerts at this time
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <div id="teams-section" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Team Performance</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Link
                href="/demo-management/teams"
                className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Team Beta</h3>
                    <p className="text-sm text-muted-foreground">
                      4 active projects • 6 completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">8.1</p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/demo-management/teams"
                className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Team Alpha</h3>
                    <p className="text-sm text-muted-foreground">
                      5 active projects • 8 completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">7.8</p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/demo-management/teams"
                className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Team Gamma</h3>
                    <p className="text-sm text-muted-foreground">
                      4 active projects • 5 completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">7.6</p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scripting Phase & Episode Evaluation Pipeline */}
      <div id="scripting-episode-section" className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Scripting Phase & Episode Evaluation Pipeline
            </h2>
            <p className="text-muted-foreground mt-1">
              Track episodic evaluation progress by drama
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <DemoScriptingPhase data={dummyScriptingPhase} />
          <DemoEvaluatorPipelineEpisodes
            dramas={dummyDramasWithEpisodes}
            episodesByDrama={dummyEpisodesByDrama}
            evaluatorsByEpisode={dummyEvaluatorsByEpisode}
            eventData={dummyEventAnalysisDataByCallReport}
          />
          <DemoArchiveGenreChart data={dummyArchiveByGenre} />
        </div>
      </div>

      {/* Content Pipeline Flow */}
      <div id="pipeline-section" className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Content Pipeline Flow</h2>
            <p className="text-muted-foreground mt-1">
              Story workflow from submission to completion
            </p>
          </div>
        </div>

        <div className="mb-6">
          <DemoPipelineOverviewCards
            totalStories={dummyStories.length}
            activePipeline={dummyStories.filter(s =>
              ['in_evaluation', 'approved', 'contracted', 'in_production'].includes(s.status)
            ).length}
            avgTimeToCompletion={Math.round(
              dummyStories.reduce((sum, s) => sum + s.days_active, 0) / dummyStories.length
            )}
          />
        </div>
      </div>

      {/* Evaluator Activity Tracking */}
      <div id="evaluator-performance" className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Evaluator Activity Tracking</h2>
            <p className="text-muted-foreground mt-1">
              Monitor evaluator workload and activity across all evaluation tasks
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Evaluator Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dummyEvaluators
                .filter(e => e.type === 'internal')
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((evaluator) => (
                  <div
                    key={evaluator.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">
                          {evaluator.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {evaluator.position}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{evaluator.evaluations_completed}</p>
                      <p className="text-xs text-muted-foreground">evaluations</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Terms Overview Section */}
      <div id="contract-terms-section" className="mb-8">
        <DemoContractTermsOverview contractTerms={dummyContractTerms} />
      </div>

      {/* Writer Financial Summary Section */}
      <div id="writer-financial-section" className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Writer Payments & Financial Overview
            </h2>
            <p className="text-muted-foreground mt-1">
              Track negotiated amounts, contracts, and payments to writers and producers
            </p>
          </div>
        </div>
        <DemoWriterFinancialSummary />
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/demo-management/story-bank">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Story Bank</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Browse all {dummyStories.length} stories in the repository
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/demo-management/whats-cooking">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">What&apos;s Cooking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View active drama productions and episodes
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/demo-management/external-evaluations">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">External Evaluations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track external evaluator performance
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
