'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { DummyContractTerm } from '../lib/dummy-data';

interface DemoContractTermsOverviewProps {
  contractTerms: DummyContractTerm[];
}

export function DemoContractTermsOverview({ contractTerms }: DemoContractTermsOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalNegotiated = contractTerms.reduce((sum, ct) => sum + ct.negotiated_amount, 0);
  const activeNegotiations = contractTerms.filter((ct) => ct.status === 'in_negotiation').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Contract Terms Overview</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Active negotiations and finalized terms
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Negotiated Value</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalNegotiated)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div className="p-4 border rounded-lg bg-orange-50">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">In Negotiation</span>
            </div>
            <p className="text-3xl font-bold text-orange-600">{activeNegotiations}</p>
          </div>
          <div className="p-4 border rounded-lg bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Finalized</span>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {contractTerms.filter((ct) => ct.status === 'finalized').length}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {contractTerms.map((term) => (
            <div
              key={term.id}
              className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold">{term.story_title}</h3>
                  <Badge
                    variant={
                      term.status === 'finalized'
                        ? 'default'
                        : term.status === 'in_negotiation'
                        ? 'secondary'
                        : 'destructive'
                    }
                    className={
                      term.status === 'finalized'
                        ? 'bg-green-100 text-green-700'
                        : term.status === 'in_negotiation'
                        ? 'bg-orange-100 text-orange-700'
                        : ''
                    }
                  >
                    {term.status === 'finalized'
                      ? 'Finalized'
                      : term.status === 'in_negotiation'
                      ? 'In Negotiation'
                      : 'Rejected'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Writer: {term.writer_name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Created: {new Date(term.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right ml-4">
                <p className="text-2xl font-bold">{formatCurrency(term.negotiated_amount)}</p>
                <p className="text-xs text-muted-foreground">{term.id}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
