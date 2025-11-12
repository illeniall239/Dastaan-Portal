"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, DollarSign, TrendingUp, Users, Briefcase, Download, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface WriterSummary {
  writer_name: string;
  total_negotiated: number;
  total_contracted: number;
  total_paid: number;
  outstanding_balance: number;
  project_count: number;
  projects: Array<{
    type: string;
    id: string;
    story_id: string;
    title: string;
    amount: number;
  }>;
}

interface FinancialTotals {
  total_committed: number;
  total_paid: number;
  total_outstanding: number;
  writer_count: number;
  project_count: number;
}

export default function WriterPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<WriterSummary[]>([]);
  const [totals, setTotals] = useState<FinancialTotals | null>(null);
  const [expandedWriter, setExpandedWriter] = useState<string | null>(null);
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

      setSummary(data.summary || []);
      setTotals(data.totals || null);
    } catch (err: any) {
      console.error("Error fetching financial summary:", err);
      setError(err.message || "Failed to load financial data");
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

  const handleExport = () => {
    const headers = [
      "Writer Name",
      "Total Negotiated",
      "Total Contracted",
      "Total Paid",
      "Outstanding Balance",
      "Project Count",
    ];

    const rows = summary.map((writer) => [
      writer.writer_name,
      writer.total_negotiated,
      writer.total_contracted,
      writer.total_paid,
      writer.outstanding_balance,
      writer.project_count,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `writer-payments-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const toggleExpandWriter = (writerName: string) => {
    setExpandedWriter(expandedWriter === writerName ? null : writerName);
  };

  if (loading) {
    return (
      <div className="mobile-container mobile-section">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-container mobile-section">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive font-semibold mb-4">{error}</p>
            <Button onClick={fetchFinancialSummary}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/management">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold">Writer Payments</h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Financial summary showing negotiated amounts, contracts, and payments by writer
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Committed</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.total_committed)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {totals.project_count} projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.total_paid)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((totals.total_paid / totals.total_committed) * 100).toFixed(1)}% of committed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Briefcase className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totals.total_outstanding)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pending payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Writers</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totals.writer_count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                With active contracts
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Writer Payment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Writer Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Writer / Producer</TableHead>
                  <TableHead className="text-right">Negotiated</TableHead>
                  <TableHead className="text-right">Contracted</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-center">Projects</TableHead>
                  <TableHead className="text-center">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No financial data available
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.map((writer) => (
                    <>
                      <TableRow key={writer.writer_name} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{writer.writer_name}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(writer.total_negotiated)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(writer.total_contracted)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {formatCurrency(writer.total_paid)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={writer.outstanding_balance > 0 ? "default" : "secondary"}>
                            {formatCurrency(writer.outstanding_balance)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{writer.project_count}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpandWriter(writer.writer_name)}
                          >
                            {expandedWriter === writer.writer_name ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedWriter === writer.writer_name && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-slate-50">
                            <div className="p-4">
                              <h4 className="font-semibold mb-3 text-sm">Projects for {writer.writer_name}</h4>
                              <div className="space-y-2">
                                {writer.projects.map((project, index) => (
                                  <div key={`${project.id}-${index}`} className="flex items-center justify-between border-l-2 border-blue-500 pl-3 py-2 bg-white rounded">
                                    <div>
                                      <p className="font-medium text-sm">{project.title}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {project.story_id} • {project.type}
                                      </p>
                                    </div>
                                    <Badge variant="secondary">{formatCurrency(project.amount)}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
