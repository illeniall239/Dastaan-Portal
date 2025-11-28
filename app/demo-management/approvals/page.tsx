'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { dummyStories } from '../lib/dummy-data';

export default function ApprovalsPage() {
  const approvedStories = dummyStories.filter((s) => s.status === 'approved');
  const pendingApproval = dummyStories.filter(
    (s) => s.status === 'in_evaluation' && s.overall_rating !== null
  );
  const rejectedStories = dummyStories.filter((s) => s.status === 'rejected');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground mt-1">
          Story approval status and decisions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {approvedStories.length}
            </div>
            <p className="text-xs text-muted-foreground">Ready for contracting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingApproval.length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting decision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {rejectedStories.length}
            </div>
            <p className="text-xs text-muted-foreground">Not approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                (approvedStories.length /
                  (approvedStories.length + rejectedStories.length)) *
                100
              ).toFixed(0)}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {approvedStories.length + rejectedStories.length} total decisions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approval */}
      {pendingApproval.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {pendingApproval.map((story) => (
                <div
                  key={story.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-lg">
                        {story.title}
                      </h3>
                      <Badge variant="outline">{story.id}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {story.logline}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Writer: <span className="font-medium text-foreground">{story.writer}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Team: <span className="font-medium text-foreground">{story.team}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Budget: <span className="font-medium text-foreground">
                          {(story.budget_estimate / 1000000).toFixed(1)}M PKR
                        </span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {story.genre.map((g) => (
                        <Badge key={g} variant="secondary">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-3xl font-bold text-orange-600">
                      {story.overall_rating?.toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <Badge variant="outline" className="mt-2">
                      {story.evaluations_completed}/{story.evaluations_total} evaluations
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Stories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approved Stories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {approvedStories.map((story) => (
              <div
                key={story.id}
                className="flex items-start justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950/20"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-lg">
                      {story.title}
                    </h3>
                    <Badge variant="outline">{story.id}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {story.logline}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Writer: <span className="font-medium text-foreground">{story.writer}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Team: <span className="font-medium text-foreground">{story.team}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Episodes: <span className="font-medium text-foreground">{story.episode_count}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-3xl font-bold text-green-600">
                    {story.overall_rating?.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rejected Stories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Rejected Stories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {rejectedStories.map((story) => (
              <div
                key={story.id}
                className="flex items-start justify-between p-4 border rounded-lg bg-red-50 dark:bg-red-950/20"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-lg">
                      {story.title}
                    </h3>
                    <Badge variant="outline">{story.id}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {story.logline}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Writer: <span className="font-medium text-foreground">{story.writer}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Team: <span className="font-medium text-foreground">{story.team}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-3xl font-bold text-red-600">
                    {story.overall_rating?.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
