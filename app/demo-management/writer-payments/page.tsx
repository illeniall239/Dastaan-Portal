'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { dummyContracts } from '../lib/dummy-data';

export default function WriterPaymentsPage() {
  // Aggregate payment data
  const totalContractValue = dummyContracts.reduce((sum, c) => sum + c.total_amount, 0);
  const totalPaid = dummyContracts.reduce((sum, c) => sum + c.paid_amount, 0);
  const totalPending = dummyContracts.reduce((sum, c) => sum + c.pending_amount, 0);

  // Upcoming payments (milestones due within 30 days)
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const upcomingPayments = dummyContracts.flatMap((contract) =>
    contract.payment_milestones
      .filter((m) => !m.paid && new Date(m.due_date) <= thirtyDaysFromNow)
      .map((m) => ({
        ...m,
        contract_id: contract.id,
        drama_title: contract.drama_title,
        writer: contract.writer,
      }))
  ).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  // Overdue payments
  const overduePayments = dummyContracts.flatMap((contract) =>
    contract.payment_milestones
      .filter((m) => !m.paid && new Date(m.due_date) < today)
      .map((m) => ({
        ...m,
        contract_id: contract.id,
        drama_title: contract.drama_title,
        writer: contract.writer,
      }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Writer Payments</h1>
        <p className="text-muted-foreground mt-1">
          Payment tracking and milestone management
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contract Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalContractValue / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">PKR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid to Date</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(totalPaid / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">
              {((totalPaid / totalContractValue) * 100).toFixed(0)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Payments</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {upcomingPayments.length}
            </div>
            <p className="text-xs text-muted-foreground">Due within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overduePayments.length}
            </div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Payments */}
      {overduePayments.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="bg-red-50 dark:bg-red-950/20">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Overdue Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {overduePayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-start justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/10"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">
                        {payment.drama_title}
                      </h3>
                      <Badge variant="destructive">OVERDUE</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Writer: {payment.writer}
                    </p>
                    <p className="text-sm font-medium">
                      {payment.milestone_name}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Due Date:{' '}
                      {new Date(payment.due_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      ({Math.floor((today.getTime() - new Date(payment.due_date).getTime()) / (1000 * 60 * 60 * 24))} days overdue)
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-red-600">
                      {(payment.amount / 1000000).toFixed(2)}M
                    </p>
                    <p className="text-xs text-muted-foreground">PKR</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Payments */}
      {upcomingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Upcoming Payments (Next 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingPayments.map((payment) => {
                const daysUntilDue = Math.floor(
                  (new Date(payment.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <div
                    key={payment.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">
                          {payment.drama_title}
                        </h3>
                        {daysUntilDue <= 7 && (
                          <Badge variant="outline" className="border-orange-600 text-orange-600">
                            DUE SOON
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Writer: {payment.writer}
                      </p>
                      <p className="text-sm font-medium">
                        {payment.milestone_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due Date:{' '}
                        {new Date(payment.due_date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        ({daysUntilDue} days)
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold">
                        {(payment.amount / 1000000).toFixed(2)}M
                      </p>
                      <p className="text-xs text-muted-foreground">PKR</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Contracts Payment Status */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {dummyContracts.map((contract) => {
              const paymentProgress = (contract.paid_amount / contract.total_amount) * 100;
              const completedMilestones = contract.payment_milestones.filter((m) => m.paid).length;

              return (
                <div key={contract.id} className="space-y-3 pb-6 border-b last:border-0">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">
                        {contract.drama_title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {contract.writer}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">
                        {(contract.total_amount / 1000000).toFixed(1)}M PKR
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {completedMilestones}/{contract.payment_milestones.length} milestones
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Payment Progress</span>
                      <span className="font-medium">
                        {(contract.paid_amount / 1000000).toFixed(2)}M / {(contract.total_amount / 1000000).toFixed(1)}M PKR
                      </span>
                    </div>
                    <Progress value={paymentProgress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{paymentProgress.toFixed(0)}% paid</span>
                      <span className="text-orange-600">
                        {(contract.pending_amount / 1000000).toFixed(2)}M pending
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
