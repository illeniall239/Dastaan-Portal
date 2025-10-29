import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';
import { getPendingEvaluationsForEvaluator } from '@/lib/evaluations/assignments';
import { format, differenceInDays } from 'date-fns';

interface PendingEvaluationsNotificationProps {
  userId: string;
  userName: string;
}

export async function PendingEvaluationsNotification({ userId, userName }: PendingEvaluationsNotificationProps) {
  try {
    // Get pending evaluations for the user
    const pendingEvaluations = await getPendingEvaluationsForEvaluator(userId);
    
    if (!pendingEvaluations || pendingEvaluations.length === 0) {
      return null; // Don't render anything if no pending evaluations
    }

    const pendingCount = pendingEvaluations.length;
    
    // Count how many are overdue (assigned more than 3 days ago)
    const now = new Date();
    const overdueCount = pendingEvaluations.filter(assignment => {
      if (!assignment.assigned_at) return false;
      const assignedDate = new Date(assignment.assigned_at);
      const daysSinceAssignment = differenceInDays(now, assignedDate);
      return daysSinceAssignment >= 3; // Consider overdue after 3 days
    }).length;
    
    const isUrgent = pendingCount >= 5 || overdueCount > 0; // Consider urgent if >=5 pending or any are overdue

    return (
      <Card className={`${isUrgent ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'} mb-6`}>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 p-2 rounded-full ${isUrgent ? 'bg-red-500' : 'bg-yellow-500'}`}>
              {isUrgent ? (
                <AlertTriangle className="h-4 w-4 text-white" />
              ) : (
                <Clock className="h-4 w-4 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${isUrgent ? 'text-red-800' : 'text-yellow-800'}`}>
                {pendingCount} Pending Evaluation{pendingCount !== 1 ? 's' : ''} Need{pendingCount === 1 ? 's' : ''} Your Attention
              </h3>
              <p className={`mt-1 text-sm ${isUrgent ? 'text-red-700' : 'text-yellow-700'}`}>
                {userName}, you have {pendingCount} evaluation{pendingCount !== 1 ? 's' : ''} waiting for your review. 
                {overdueCount > 0 && ` ${overdueCount} of them are overdue.`}
                {isUrgent && overdueCount > 0 && ' Please complete these as soon as possible.'}
              </p>
              
              <div className="mt-3 space-y-2">
                {pendingEvaluations.slice(0, 3).map((assignment) => {
                  const assignedDate = assignment.assigned_at ? new Date(assignment.assigned_at) : null;
                  const daysSinceAssignment = assignedDate ? differenceInDays(now, assignedDate) : null;
                  const isAssignmentUrgent = daysSinceAssignment !== null && daysSinceAssignment >= 3;
                  
                  return (
                    <div key={assignment.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className={isUrgent ? 'text-red-700' : 'text-yellow-700'}>
                          &quot;{assignment.call_report?.working_title}&quot; for {assignment.call_report?.writer_name}
                        </span>
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <Calendar className={`h-3 w-3 ${isAssignmentUrgent ? 'text-red-600' : 'text-yellow-600'}`} />
                          <span className={isAssignmentUrgent ? 'text-red-600' : 'text-yellow-600'}>
                            Assigned {assignedDate ? format(assignedDate, 'MMM d, yyyy') : 'Unknown'}
                            {daysSinceAssignment !== null && daysSinceAssignment > 0 && ` (${daysSinceAssignment} day${daysSinceAssignment !== 1 ? 's' : ''} ago)`}
                          </span>
                        </div>
                      </div>
                      <Link 
                        href={`/evaluator/evaluate/${assignment.call_report_id}`}
                        className={`text-sm font-medium ${isAssignmentUrgent ? 'text-red-600 hover:text-red-800' : 'text-yellow-600 hover:text-yellow-800'}`}
                      >
                        Evaluate Now →
                      </Link>
                    </div>
                  );
                })}
                {pendingEvaluations.length > 3 && (
                  <p className={`text-sm ${isUrgent ? 'text-red-600' : 'text-yellow-600'}`}>
                    +{pendingEvaluations.length - 3} more evaluations...
                  </p>
                )}
              </div>
              
              <div className="mt-4 flex justify-start">
                <Link
                  href="/evaluator/evaluations-list?view=pending"
                  className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${isUrgent ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-white'}`}
                >
                  View All Pending Evaluations
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error('Error fetching pending evaluations:', error);
    return null; // Don't render anything if there's an error
  }
}