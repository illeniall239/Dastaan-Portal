'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { dummyContracts } from '../lib/dummy-data';

export function DemoWriterFinancialSummary() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Aggregate by writer
  const writerData = dummyContracts.reduce((acc, contract) => {
    if (!acc[contract.writer]) {
      acc[contract.writer] = {
        writer: contract.writer,
        totalContracted: 0,
        totalPaid: 0,
        outstanding: 0,
        projectCount: 0,
        projects: [],
      };
    }

    acc[contract.writer].totalContracted += contract.total_amount;
    acc[contract.writer].totalPaid += contract.paid_amount;
    acc[contract.writer].outstanding += contract.pending_amount;
    acc[contract.writer].projectCount += 1;
    acc[contract.writer].projects.push({
      title: contract.drama_title,
      amount: contract.total_amount,
      paid: contract.paid_amount,
      pending: contract.pending_amount,
    });

    return acc;
  }, {} as Record<string, any>);

  const writers = Object.values(writerData);

  const totalContracted = writers.reduce((sum: number, w: any) => sum + w.totalContracted, 0);
  const totalPaid = writers.reduce((sum: number, w: any) => sum + w.totalPaid, 0);
  const totalOutstanding = writers.reduce((sum: number, w: any) => sum + w.outstanding, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Writer Financial Summary</CardTitle>
          <DollarSign className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="p-4 border rounded-lg bg-blue-50">
            <p className="text-sm font-medium text-blue-900 mb-1">Total Contracted</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalContracted)}</p>
          </div>
          <div className="p-4 border rounded-lg bg-green-50">
            <p className="text-sm font-medium text-green-900 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="p-4 border rounded-lg bg-orange-50">
            <p className="text-sm font-medium text-orange-900 mb-1">Outstanding Balance</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding)}</p>
          </div>
        </div>

        {/* Writer Breakdown */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">By Writer</h3>
          {writers.map((writer: any) => (
            <div key={writer.writer} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-lg">{writer.writer}</h4>
                  <p className="text-sm text-muted-foreground">
                    {writer.projectCount} {writer.projectCount === 1 ? 'project' : 'projects'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{formatCurrency(writer.totalContracted)}</p>
                  <p className="text-xs text-muted-foreground">Total contracted</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-sm">
                  <p className="text-muted-foreground">Paid</p>
                  <p className="font-semibold text-green-600">{formatCurrency(writer.totalPaid)}</p>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">Outstanding</p>
                  <p className="font-semibold text-orange-600">{formatCurrency(writer.outstanding)}</p>
                </div>
              </div>

              {/* Projects */}
              <div className="space-y-2 pt-3 border-t">
                {writer.projects.map((project: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                    <span className="font-medium">{project.title}</span>
                    <div className="flex gap-4 text-xs">
                      <span className="text-green-600">{formatCurrency(project.paid)} paid</span>
                      <span className="text-orange-600">{formatCurrency(project.pending)} pending</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
