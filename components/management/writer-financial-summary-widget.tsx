"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

interface WriterSummary {
  writer_name: string;
  total_negotiated: number;
  total_contracted: number;
  total_paid: number;
  outstanding_balance: number;
  project_count: number;
}

interface FinancialTotals {
  total_committed: number;
  total_paid: number;
  total_outstanding: number;
  writer_count: number;
  project_count: number;
}

export function WriterFinancialSummaryWidget() {
  const [loading, setLoading] = useState(true);
  const [topWriters, setTopWriters] = useState<WriterSummary[]>([]);
  const [totals, setTotals] = useState<FinancialTotals | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFinancialSummary();
  }, []);

  const fetchFinancialSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/management/writer-financial-summary");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch financial summary");
      }

      // Get first 5 writers by committed amount
      const summary = data.summary || [];
      const displayWriters = summary.slice(0, 5);
      setTopWriters(displayWriters);
      setTotals(data.totals || null);
    } catch (err: any) {
      console.error("Error fetching financial summary:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `PKR ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `PKR ${(amount / 1000).toFixed(0)}K`;
    }
    return `PKR ${amount.toFixed(0)}`;
  };

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Writer Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={fetchFinancialSummary} size="sm" variant="outline" className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
      <CardHeader className="border-b border-emerald-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Writer Payments Overview</span>
            <span className="sm:hidden">Writer Payments</span>
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/management/writer-payments" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">View All</span>
              <span className="sm:hidden">All</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : (
          <>
            {/* Financial Summary Stats */}
            {totals && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 pb-4 border-b border-emerald-100">
                <div className="bg-white rounded-lg p-2 sm:p-3 border border-emerald-100">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total Committed</p>
                  <p className="text-xs sm:text-sm md:text-base font-bold text-emerald-700">
                    {formatCompactCurrency(totals.total_committed)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2 sm:p-3 border border-emerald-100">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total Paid</p>
                  <p className="text-xs sm:text-sm md:text-base font-bold text-green-600">
                    {formatCompactCurrency(totals.total_paid)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2 sm:p-3 border border-emerald-100">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Outstanding</p>
                  <p className="text-xs sm:text-sm md:text-base font-bold text-orange-600">
                    {formatCompactCurrency(totals.total_outstanding)}
                  </p>
                </div>
              </div>
            )}

            {/* Writers by Payment */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                Writers by Amount
                <Badge variant="secondary" className="text-xs">
                  {topWriters.length}
                </Badge>
              </h4>
              {topWriters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No writer payment data available
                </p>
              ) : (
                <div className="space-y-2">
                  {topWriters.map((writer, index) => {
                    const committed = Math.max(
                      writer.total_contracted,
                      writer.total_negotiated
                    );
                    const paidPercentage = committed > 0
                      ? (writer.total_paid / committed) * 100
                      : 0;

                    return (
                      <div
                        key={writer.writer_name}
                        className="bg-white border border-emerald-100 rounded-lg p-3 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                #{index + 1}
                              </span>
                              <p className="font-medium text-sm text-slate-900 line-clamp-1">
                                {writer.writer_name}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {writer.project_count} {writer.project_count === 1 ? "project" : "projects"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs sm:text-sm font-bold text-emerald-700">
                              {formatCompactCurrency(committed)}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              {paidPercentage >= 100 ? (
                                <TrendingUp className="h-3 w-3 text-green-600" />
                              ) : paidPercentage > 0 ? (
                                <TrendingUp className="h-3 w-3 text-orange-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-gray-400" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {paidPercentage.toFixed(0)}% paid
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                          <div
                            className="bg-emerald-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(paidPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* View All Link */}
            <div className="mt-4 pt-3 border-t border-emerald-100">
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/management/writer-payments">
                  View Complete Payment Details
                  <ArrowRight className="h-3 w-3 ml-2" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
