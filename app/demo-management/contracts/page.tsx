'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { dummyContracts } from '../lib/dummy-data';

export default function ContractsPage() {
  const totalContractValue = dummyContracts.reduce((sum, c) => sum + c.total_amount, 0);
  const totalPaid = dummyContracts.reduce((sum, c) => sum + c.paid_amount, 0);
  const totalPending = dummyContracts.reduce((sum, c) => sum + c.pending_amount, 0);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
        <p className="text-muted-foreground mt-1">
          Writer contracts and payment status
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dummyContracts.length}</div>
            <p className="text-xs text-muted-foreground">
              {dummyContracts.filter((c) => c.status === 'signed').length} signed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
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
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
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
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {(totalPending / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">
              {((totalPending / totalContractValue) * 100).toFixed(0)}% remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contract Details */}
      <div className="grid gap-6">
        {dummyContracts.map((contract) => {
          const paymentProgress = (contract.paid_amount / contract.total_amount) * 100;

          return (
            <Card key={contract.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">
                      {contract.drama_title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {contract.id}
                    </p>
                  </div>
                  <Badge
                    variant={
                      contract.status === 'signed'
                        ? 'default'
                        : contract.status === 'pending_signature'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {contract.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contract Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Writer</p>
                    <p className="font-medium">
                      {contract.writer}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="font-medium">
                      {(contract.total_amount / 1000000).toFixed(1)}M PKR
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="font-medium text-green-600">
                      {(contract.paid_amount / 1000000).toFixed(1)}M PKR
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="font-medium text-orange-600">
                      {(contract.pending_amount / 1000000).toFixed(1)}M PKR
                    </p>
                  </div>
                </div>

                {/* Payment Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payment Progress</span>
                    <span className="font-medium">{paymentProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={paymentProgress} className="h-2" />
                </div>

                {/* Payment Milestones */}
                <div>
                  <h3 className="font-semibold mb-3">Payment Milestones</h3>
                  <div className="space-y-3">
                    {contract.payment_milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className={`flex items-center justify-between p-3 border rounded-lg ${
                          milestone.paid
                            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                            : 'bg-background'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {milestone.paid ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-orange-600" />
                          )}
                          <div>
                            <p className="font-medium">
                              {milestone.milestone_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Due:{' '}
                              {new Date(milestone.due_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                              {milestone.paid_date && (
                                <span className="ml-2">
                                  • Paid:{' '}
                                  {new Date(milestone.paid_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {(milestone.amount / 1000000).toFixed(2)}M
                          </p>
                          <p className="text-xs text-muted-foreground">PKR</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contract Date */}
                {contract.signed_date && (
                  <p className="text-sm text-muted-foreground pt-2 border-t">
                    Contract Signed:{' '}
                    {new Date(contract.signed_date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
